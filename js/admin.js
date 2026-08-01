(function () {
  "use strict";

  const BUCKET = "portfolio-media";
  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
  const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB

  let currentUser = null;

  function getClient() {
    return window.supabaseClient;
  }

  function showToast(message, type) {
    const toastEl = document.getElementById("adminToast");
    if (!toastEl) return;

    toastEl.classList.remove("text-bg-success", "text-bg-danger", "text-bg-warning");
    toastEl.classList.add(
      type === "error" ? "text-bg-danger" : type === "warning" ? "text-bg-warning" : "text-bg-success"
    );
    toastEl.querySelector(".toast-body").textContent = message;

    bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 5000 }).show();
  }

  function setLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
    const label = btn.querySelector(".btn-label");
    const spinner = btn.querySelector(".spinner-border");
    if (label) label.classList.toggle("d-none", loading);
    if (spinner) spinner.classList.toggle("d-none", !loading);
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function populateCategorySelect() {
    const select = document.getElementById("uploadCategory");
    if (!select) return;

    select.innerHTML = PortfolioCategories.getOptions()
      .map(
        (opt) =>
          `<option value="${opt.value}">${escapeHtml(opt.label)}</option>`
      )
      .join("");
  }

  function togglePanels(signedIn) {
    document.getElementById("loginPanel")?.classList.toggle("d-none", signedIn);
    document.getElementById("dashboardPanel")?.classList.toggle("d-none", !signedIn);
    document.getElementById("adminUserEmail")?.replaceChildren(
      document.createTextNode(currentUser?.email || "")
    );
  }

  async function checkSession() {
    const client = getClient();
    if (!client) {
      showToast("Configure Supabase in js/supabase-config.js first.", "error");
      return;
    }

    const { data } = await client.auth.getSession();
    currentUser = data.session?.user || null;
    togglePanels(!!currentUser);

    if (currentUser) {
      await loadAdminContent();
    }
  }

  async function loadAdminContent() {
    await Promise.all([loadAdminWorks(), loadAdminTestimonials()]);
  }

  async function handleLogin(e) {
    e.preventDefault();
    const client = getClient();
    if (!client) return;

    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    setLoading(btn, true);

    const email = form.email.value.trim();
    const password = form.password.value;

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(btn, false);

    if (error) {
      showToast(error.message, "error");
      return;
    }

    currentUser = data.user;
    togglePanels(true);
    form.reset();
    showToast("Signed in successfully.");
    await loadAdminContent();
  }

  async function handleLogout() {
    const client = getClient();
    if (!client) return;

    await client.auth.signOut();
    currentUser = null;
    togglePanels(false);
    document.getElementById("adminWorksList").innerHTML = "";
    document.getElementById("adminTestimonialsList").innerHTML = "";
    showToast("Signed out.");
  }

  function detectMediaType(file) {
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("image/")) return "image";
    return null;
  }

  function buildStoragePath(file, prefix) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const safeName = file.name
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-z0-9-_]+/gi, "-")
      .slice(0, 40);
    return `${prefix || ""}${Date.now()}-${safeName}.${ext}`;
  }

  async function handleUpload(e) {
    e.preventDefault();
    const client = getClient();
    if (!client || !currentUser) return;

    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    const fileInput = form.media;
    const file = fileInput.files[0];

    if (!file) {
      showToast("Choose an image or video file.", "warning");
      return;
    }

    const mediaType = detectMediaType(file);
    if (!mediaType) {
      showToast("Only image and video files are allowed.", "error");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      showToast("File must be under 100 MB.", "error");
      return;
    }

    const title = form.title.value.trim();
    const category = form.category.value;

    if (!title) {
      showToast("Enter a project title.", "warning");
      return;
    }

    setLoading(btn, true);

    const storagePath = buildStoragePath(file);

    const { error: uploadError } = await client.storage
      .from(BUCKET)
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      setLoading(btn, false);
      showToast(uploadError.message, "error");
      return;
    }

    const { data: urlData } = client.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);

    const { error: insertError } = await client.from("works").insert({
      title,
      category,
      media_type: mediaType,
      media_url: urlData.publicUrl,
      storage_path: storagePath,
      thumbnail_url: mediaType === "image" ? urlData.publicUrl : null,
    });

    setLoading(btn, false);

    if (insertError) {
      await client.storage.from(BUCKET).remove([storagePath]);
      showToast(insertError.message, "error");
      return;
    }

    form.reset();
    showToast("Work uploaded successfully.");
    await loadAdminWorks();
  }

  function renderAdminWorkItem(work) {
    const label = PortfolioCategories.getLabel(work.category);
    const isVideo = work.media_type === "video";
    const thumb = work.thumbnail_url || (isVideo ? null : work.media_url);

    const preview = isVideo
      ? thumb
        ? `<img src="${escapeHtml(thumb)}" alt="" class="admin-work-thumb">`
        : `<div class="admin-work-thumb admin-work-thumb-video"><i class="bi bi-play-circle"></i></div>`
      : `<img src="${escapeHtml(work.media_url)}" alt="" class="admin-work-thumb">`;

    return `
      <div class="admin-work-item glass-card" data-id="${work.id}">
        ${preview}
        <div class="admin-work-info flex-grow-1">
          <h3 class="h6 mb-1">${escapeHtml(work.title)}</h3>
          <p class="text-muted small mb-0">${escapeHtml(label)} · ${isVideo ? "Video" : "Image"}</p>
        </div>
        <button type="button" class="btn btn-outline-danger btn-sm admin-delete-btn" data-id="${work.id}" aria-label="Delete ${escapeHtml(work.title)}">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    `;
  }

  async function loadAdminWorks() {
    const client = getClient();
    const list = document.getElementById("adminWorksList");
    if (!client || !list) return;

    list.innerHTML = `<p class="text-muted small mb-0">Loading…</p>`;

    const { data, error } = await client
      .from("works")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      list.innerHTML = `<p class="text-danger small mb-0">${escapeHtml(error.message)}</p>`;
      return;
    }

    if (!data?.length) {
      list.innerHTML = `<p class="text-muted small mb-0">No works yet. Upload your first project above.</p>`;
      return;
    }

    list.innerHTML = data.map(renderAdminWorkItem).join("");

    list.querySelectorAll(".admin-delete-btn").forEach((btn) => {
      btn.addEventListener("click", () => deleteWork(btn.dataset.id));
    });
  }

  async function deleteWork(id) {
    const client = getClient();
    if (!client || !currentUser) return;

    if (!confirm("Delete this work? This cannot be undone.")) return;

    const { data: work, error: fetchError } = await client
      .from("works")
      .select("storage_path")
      .eq("id", id)
      .single();

    if (fetchError) {
      showToast(fetchError.message, "error");
      return;
    }

    const { error: deleteError } = await client.from("works").delete().eq("id", id);

    if (deleteError) {
      showToast(deleteError.message, "error");
      return;
    }

    if (work?.storage_path) {
      await client.storage.from(BUCKET).remove([work.storage_path]);
    }

    showToast("Work deleted.");
    await loadAdminWorks();
  }

  function getInitials(name) {
    return String(name || "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }

  async function handleTestimonialSubmit(e) {
    e.preventDefault();
    const client = getClient();
    if (!client || !currentUser) return;

    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');

    const quote = form.quote.value.trim();
    const authorName = form.authorName.value.trim();
    const authorRole = form.authorRole.value.trim();
    const avatarFile = form.avatar.files[0];

    if (!quote || !authorName) {
      showToast("Add both a testimonial and a client name.", "warning");
      return;
    }

    if (avatarFile) {
      if (!avatarFile.type.startsWith("image/")) {
        showToast("Client photo must be an image.", "error");
        return;
      }
      if (avatarFile.size > MAX_AVATAR_SIZE) {
        showToast("Client photo must be under 5 MB.", "error");
        return;
      }
    }

    setLoading(btn, true);

    let avatarUrl = null;
    let storagePath = null;

    if (avatarFile) {
      storagePath = buildStoragePath(avatarFile, "testimonials/");

      const { error: uploadError } = await client.storage
        .from(BUCKET)
        .upload(storagePath, avatarFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: avatarFile.type,
        });

      if (uploadError) {
        setLoading(btn, false);
        showToast(uploadError.message, "error");
        return;
      }

      avatarUrl = client.storage.from(BUCKET).getPublicUrl(storagePath).data
        .publicUrl;
    }

    const { error: insertError } = await client.from("testimonials").insert({
      quote,
      author_name: authorName,
      author_role: authorRole || null,
      avatar_url: avatarUrl,
      storage_path: storagePath,
    });

    setLoading(btn, false);

    if (insertError) {
      if (storagePath) {
        await client.storage.from(BUCKET).remove([storagePath]);
      }
      showToast(insertError.message, "error");
      return;
    }

    form.reset();
    showToast("Testimonial added.");
    await loadAdminTestimonials();
  }

  function renderAdminTestimonialItem(item) {
    const avatar = item.avatar_url
      ? `<img src="${escapeHtml(item.avatar_url)}" alt="" class="admin-work-thumb admin-avatar-thumb">`
      : `<div class="admin-work-thumb admin-avatar-thumb admin-avatar-initials">${escapeHtml(getInitials(item.author_name))}</div>`;

    const role = item.author_role
      ? ` · ${escapeHtml(item.author_role)}`
      : "";

    return `
      <div class="admin-work-item glass-card" data-id="${item.id}">
        ${avatar}
        <div class="admin-work-info flex-grow-1">
          <p class="admin-quote mb-1">&ldquo;${escapeHtml(item.quote)}&rdquo;</p>
          <p class="text-muted small mb-0">${escapeHtml(item.author_name)}${role}</p>
        </div>
        <button type="button" class="btn btn-outline-danger btn-sm admin-testimonial-delete" data-id="${item.id}" aria-label="Delete testimonial from ${escapeHtml(item.author_name)}">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    `;
  }

  async function loadAdminTestimonials() {
    const client = getClient();
    const list = document.getElementById("adminTestimonialsList");
    if (!client || !list) return;

    list.innerHTML = `<p class="text-muted small mb-0">Loading…</p>`;

    const { data, error } = await client
      .from("testimonials")
      .select("*")
      .order("sort_order", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      list.innerHTML = `<p class="text-danger small mb-0">${escapeHtml(error.message)}</p>`;
      return;
    }

    if (!data?.length) {
      list.innerHTML = `<p class="text-muted small mb-0">No testimonials yet. Add your first one above.</p>`;
      return;
    }

    list.innerHTML = data.map(renderAdminTestimonialItem).join("");

    list.querySelectorAll(".admin-testimonial-delete").forEach((btn) => {
      btn.addEventListener("click", () => deleteTestimonial(btn.dataset.id));
    });
  }

  async function deleteTestimonial(id) {
    const client = getClient();
    if (!client || !currentUser) return;

    if (!confirm("Delete this testimonial? This cannot be undone.")) return;

    const { data: item, error: fetchError } = await client
      .from("testimonials")
      .select("storage_path")
      .eq("id", id)
      .single();

    if (fetchError) {
      showToast(fetchError.message, "error");
      return;
    }

    const { error: deleteError } = await client
      .from("testimonials")
      .delete()
      .eq("id", id);

    if (deleteError) {
      showToast(deleteError.message, "error");
      return;
    }

    if (item?.storage_path) {
      await client.storage.from(BUCKET).remove([item.storage_path]);
    }

    showToast("Testimonial deleted.");
    await loadAdminTestimonials();
  }

  function init() {
    populateCategorySelect();

    document.getElementById("loginForm")?.addEventListener("submit", handleLogin);
    document.getElementById("logoutBtn")?.addEventListener("click", handleLogout);
    document.getElementById("uploadForm")?.addEventListener("submit", handleUpload);
    document
      .getElementById("testimonialForm")
      ?.addEventListener("submit", handleTestimonialSubmit);

    checkSession();

    getClient()?.auth.onAuthStateChange((_event, session) => {
      currentUser = session?.user || null;
      togglePanels(!!currentUser);
      if (currentUser) loadAdminContent();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
