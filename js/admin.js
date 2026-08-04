(function () {
  "use strict";

  const BUCKET = "portfolio-media";
  // Supabase's free plan rejects anything above 50 MB
  const MAX_FILE_SIZE = 50 * 1024 * 1024;
  const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

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

  function formatMb(bytes) {
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  }

  function describeUploadError(error, limit) {
    const message = error?.message || "Upload failed.";
    if (/exceeded the maximum allowed size|payload too large|entity too large/i.test(message)) {
      return `That file is too large for your Supabase plan. Compress it below ${formatMb(limit)} and try again.`;
    }
    return message;
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

  function getFileExtension(file) {
    return (file?.name || "").split(".").pop()?.toLowerCase() || "";
  }

  const IMAGE_EXTENSIONS = new Set([
    "jpg",
    "jpeg",
    "png",
    "webp",
    "gif",
    "svg",
    "bmp",
    "tif",
    "tiff",
    "avif",
    "heic",
    "heif",
    "ico",
    "jfif",
  ]);

  const VIDEO_EXTENSIONS = new Set([
    "mp4",
    "webm",
    "mov",
    "m4v",
    "avi",
    "mkv",
    "ogv",
  ]);

  const MIME_BY_EXTENSION = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
    bmp: "image/bmp",
    tif: "image/tiff",
    tiff: "image/tiff",
    avif: "image/avif",
    heic: "image/heic",
    heif: "image/heif",
    ico: "image/x-icon",
    jfif: "image/jpeg",
    pdf: "application/pdf",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    m4v: "video/x-m4v",
    avi: "video/x-msvideo",
    mkv: "video/x-matroska",
    ogv: "video/ogg",
  };

  function detectMediaType(file) {
    const mime = (file.type || "").toLowerCase();
    const ext = getFileExtension(file);

    if (mime === "application/pdf" || ext === "pdf") return "pdf";
    if (mime.startsWith("video/") || VIDEO_EXTENSIONS.has(ext)) return "video";
    if (mime.startsWith("image/") || IMAGE_EXTENSIONS.has(ext)) return "image";
    return null;
  }

  function resolveContentType(file, mediaType) {
    if (file.type) return file.type;
    const ext = getFileExtension(file);
    if (MIME_BY_EXTENSION[ext]) return MIME_BY_EXTENSION[ext];
    if (mediaType === "pdf") return "application/pdf";
    if (mediaType === "video") return "video/mp4";
    return "application/octet-stream";
  }

  function extractYoutubeId(url) {
    if (!url) return null;
    const trimmed = url.trim();
    const patterns = [
      /(?:youtube\.com\/watch\?(?:[^#]*&)?v=|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtu\.be\/)([A-Za-z0-9_-]{11})/,
      /youtube\.com\/live\/([A-Za-z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match?.[1]) return match[1];
    }
    return null;
  }

  function youtubeWatchUrl(videoId) {
    return `https://www.youtube.com/watch?v=${videoId}`;
  }

  function youtubeThumbnailUrl(videoId) {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }

  function getMediaSource(form) {
    const checked = form.querySelector('input[name="mediaSource"]:checked');
    return checked?.value || "file";
  }

  function syncMediaSourceFields() {
    const form = document.getElementById("uploadForm");
    if (!form) return;

    const source = getMediaSource(form);
    const fileField = document.getElementById("uploadFileField");
    const youtubeField = document.getElementById("uploadYoutubeField");
    const fileInput = document.getElementById("uploadMedia");
    const youtubeInput = document.getElementById("uploadYoutubeUrl");
    const isYoutube = source === "youtube";

    fileField?.classList.toggle("d-none", isYoutube);
    youtubeField?.classList.toggle("d-none", !isYoutube);

    if (fileInput) fileInput.required = !isYoutube;
    if (youtubeInput) youtubeInput.required = isYoutube;
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
    const title = form.title.value.trim();
    const category = form.category.value;
    const source = getMediaSource(form);

    if (!title) {
      showToast("Enter a project title.", "warning");
      return;
    }

    if (source === "youtube") {
      await handleYoutubeUpload(form, btn, title, category);
      return;
    }

    await handleFileUpload(form, btn, title, category);
  }

  async function handleYoutubeUpload(form, btn, title, category) {
    const client = getClient();
    const youtubeUrl = form.youtubeUrl.value.trim();
    const videoId = extractYoutubeId(youtubeUrl);

    if (!videoId) {
      showToast("Enter a valid YouTube link.", "warning");
      return;
    }

    setLoading(btn, true);

    const { error: insertError } = await client.from("works").insert({
      title,
      category,
      media_type: "youtube",
      media_url: youtubeWatchUrl(videoId),
      storage_path: null,
      thumbnail_url: youtubeThumbnailUrl(videoId),
    });

    setLoading(btn, false);

    if (insertError) {
      showToast(insertError.message, "error");
      return;
    }

    form.reset();
    document.getElementById("sourceFile").checked = true;
    syncMediaSourceFields();
    showToast("YouTube video added to your portfolio.");
    await loadAdminWorks();
  }

  async function handleFileUpload(form, btn, title, category) {
    const client = getClient();
    const fileInput = form.media;
    const file = fileInput.files[0];

    if (!file) {
      showToast("Choose an image, PDF, or video file.", "warning");
      return;
    }

    const mediaType = detectMediaType(file);
    if (!mediaType) {
      showToast(
        "Unsupported format. Use an image (JPG, PNG, WebP, GIF, SVG, TIFF…), PDF flyer, or video file.",
        "error"
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      showToast(
        `That file is ${formatMb(file.size)}. Supabase's free plan only accepts uploads under ${formatMb(MAX_FILE_SIZE)} — compress it and try again.`,
        "error"
      );
      return;
    }

    setLoading(btn, true);

    const storagePath = buildStoragePath(file);
    const contentType = resolveContentType(file, mediaType);

    const { error: uploadError } = await client.storage
      .from(BUCKET)
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType,
      });

    if (uploadError) {
      setLoading(btn, false);
      showToast(describeUploadError(uploadError, MAX_FILE_SIZE), "error");
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
    document.getElementById("sourceFile").checked = true;
    syncMediaSourceFields();
    showToast("Work uploaded successfully.");
    await loadAdminWorks();
  }

  function mediaTypeLabel(mediaType) {
    if (mediaType === "youtube") return "YouTube";
    if (mediaType === "video") return "Video";
    if (mediaType === "pdf") return "PDF";
    return "Image";
  }

  function renderAdminWorkItem(work) {
    const label = PortfolioCategories.getLabel(work.category);
    const isVideo = work.media_type === "video";
    const isYoutube = work.media_type === "youtube";
    const isPdf = work.media_type === "pdf";
    const thumb = work.thumbnail_url || (isVideo || isYoutube || isPdf ? null : work.media_url);

    let preview;
    if (isYoutube) {
      preview = thumb
        ? `<img src="${escapeHtml(thumb)}" alt="" class="admin-work-thumb">`
        : `<div class="admin-work-thumb admin-work-thumb-video"><i class="bi bi-youtube"></i></div>`;
    } else if (isVideo) {
      preview = thumb
        ? `<img src="${escapeHtml(thumb)}" alt="" class="admin-work-thumb">`
        : `<div class="admin-work-thumb admin-work-thumb-video"><i class="bi bi-play-circle"></i></div>`;
    } else if (isPdf) {
      preview = `<div class="admin-work-thumb admin-work-thumb-video"><i class="bi bi-file-earmark-pdf"></i></div>`;
    } else {
      preview = `<img src="${escapeHtml(work.media_url)}" alt="" class="admin-work-thumb">`;
    }

    return `
      <div class="admin-work-item glass-card" data-id="${work.id}">
        ${preview}
        <div class="admin-work-info flex-grow-1">
          <h3 class="h6 mb-1">${escapeHtml(work.title)}</h3>
          <p class="text-muted small mb-0">${escapeHtml(label)} · ${mediaTypeLabel(work.media_type)}</p>
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
        showToast(`Client photo must be under ${formatMb(MAX_AVATAR_SIZE)}.`, "error");
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
        showToast(describeUploadError(uploadError, MAX_AVATAR_SIZE), "error");
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
    syncMediaSourceFields();

    document.getElementById("loginForm")?.addEventListener("submit", handleLogin);
    document.getElementById("logoutBtn")?.addEventListener("click", handleLogout);
    document.getElementById("uploadForm")?.addEventListener("submit", handleUpload);
    document
      .getElementById("testimonialForm")
      ?.addEventListener("submit", handleTestimonialSubmit);

    document.querySelectorAll('input[name="mediaSource"]').forEach((input) => {
      input.addEventListener("change", syncMediaSourceFields);
    });

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
