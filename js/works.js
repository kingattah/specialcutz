(function () {
  "use strict";

  const BUCKET = "portfolio-media";
  let allWorks = [];
  let activeService = "all";
  let lightboxModal = null;

  function getClient() {
    return window.supabaseClient;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function getPublicUrl(path) {
    const client = getClient();
    if (!client) return "";
    const { data } = client.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  async function fetchWorks() {
    const client = getClient();
    if (!client) return [];

    const { data, error } = await client
      .from("works")
      .select("*")
      .order("sort_order", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load works:", error.message);
      return [];
    }

    return data || [];
  }

  function renderWorkCard(work, index) {
    const label = PortfolioCategories.getLabel(work.category);
    const isVideo = work.media_type === "video";
    const thumbSrc =
      work.thumbnail_url ||
      (isVideo ? null : work.media_url);
    const delayClass =
      index % 3 === 1
        ? " reveal-delay-1"
        : index % 3 === 2
          ? " reveal-delay-2"
          : "";

    const thumbContent = isVideo
      ? thumbSrc
        ? `<img src="${escapeHtml(thumbSrc)}" alt="${escapeHtml(work.title)}" loading="lazy">`
        : `<video src="${escapeHtml(work.media_url)}" muted playsinline preload="metadata"></video>`
      : `<img src="${escapeHtml(work.media_url)}" alt="${escapeHtml(work.title)}" loading="lazy">`;

    const overlayIcon = isVideo ? "bi-play-circle" : "bi-zoom-in";
    const overlayText = isVideo ? "Play video" : "View image";

    return `
      <div class="col-6 col-lg-4 reveal${delayClass}" data-work-id="${work.id}" data-category="${work.category}">
        <button type="button" class="work-card work-card-btn" data-work-id="${work.id}" aria-label="Open ${escapeHtml(work.title)}">
          <div class="work-thumb${isVideo ? " work-thumb-video" : ""}">
            ${thumbContent}
            <span class="work-overlay"><i class="bi ${overlayIcon}"></i> ${overlayText}</span>
          </div>
          <div class="work-meta">
            <h3 class="work-title">${escapeHtml(work.title)}</h3>
            <span class="work-cat">${escapeHtml(label)}</span>
          </div>
        </button>
      </div>
    `;
  }

  function renderEmptyState(filtered) {
    const grid = document.getElementById("workGrid");
    if (!grid) return;

    if (!getClient()) {
      grid.innerHTML = `
        <div class="col-12">
          <div class="works-empty glass-card text-center p-5">
            <i class="bi bi-cloud-slash fs-1 text-muted mb-3 d-block"></i>
            <p class="mb-0 text-muted">Connect Supabase in <code>js/supabase-config.js</code> to load your portfolio.</p>
          </div>
        </div>
      `;
      return;
    }

    if (allWorks.length === 0) {
      grid.innerHTML = `
        <div class="col-12">
          <div class="works-empty glass-card text-center p-5">
            <i class="bi bi-collection-play fs-1 text-muted mb-3 d-block"></i>
            <p class="mb-0 text-muted">No works uploaded yet. Sign in to the admin panel to add your first project.</p>
          </div>
        </div>
      `;
      return;
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="col-12">
          <div class="works-empty glass-card text-center p-5">
            <i class="bi bi-funnel fs-1 text-muted mb-3 d-block"></i>
            <p class="mb-0 text-muted">No projects in this category yet.</p>
          </div>
        </div>
      `;
    }
  }

  function filterWorks(serviceSlug) {
    activeService = serviceSlug || activeService;
    return allWorks.filter((work) =>
      PortfolioCategories.matchesService(work.category, activeService)
    );
  }

  function renderFilters() {
    const wrap = document.getElementById("worksFilters");
    if (!wrap || !window.PortfolioCategories) return;

    wrap.innerHTML = PortfolioCategories.getFilterOptions()
      .map((opt) => {
        const isActive = opt.value === activeService;
        return `
          <button
            type="button"
            class="works-filter-btn${isActive ? " is-active" : ""}"
            data-filter="${opt.value}"
            role="tab"
            aria-selected="${isActive ? "true" : "false"}"
          >${escapeHtml(opt.label)}</button>
        `;
      })
      .join("");

    wrap.querySelectorAll("[data-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        setActiveService(btn.dataset.filter, { syncServices: true });
      });
    });
  }

  function syncServiceCards(serviceSlug) {
    document.querySelectorAll("[data-service]").forEach((card) => {
      const isActive = serviceSlug !== "all" && card.dataset.service === serviceSlug;
      card.classList.toggle("active", isActive);
      card.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function syncFilterButtons() {
    document.querySelectorAll("#worksFilters [data-filter]").forEach((btn) => {
      const isActive = btn.dataset.filter === activeService;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  }

  function renderGrid(works) {
    const grid = document.getElementById("workGrid");
    if (!grid) return;

    if (!works.length) {
      renderEmptyState(works);
      return;
    }

    grid.innerHTML = works.map((work, i) => renderWorkCard(work, i)).join("");

    grid.querySelectorAll(".work-card-btn").forEach((btn) => {
      btn.addEventListener("click", () => openLightbox(btn.dataset.workId));
    });

    if (window.initRevealForElements) {
      window.initRevealForElements(grid.querySelectorAll(".reveal"));
    }
  }

  function openLightbox(workId) {
    const work = allWorks.find((w) => w.id === workId);
    if (!work) return;

    const modalEl = document.getElementById("workLightbox");
    const titleEl = document.getElementById("lightboxTitle");
    const catEl = document.getElementById("lightboxCategory");
    const mediaEl = document.getElementById("lightboxMedia");

    if (!modalEl || !titleEl || !catEl || !mediaEl) return;

    titleEl.textContent = work.title;
    catEl.textContent = PortfolioCategories.getLabel(work.category);

    if (work.media_type === "video") {
      mediaEl.innerHTML = `<video src="${escapeHtml(work.media_url)}" controls autoplay playsinline class="lightbox-video"></video>`;
    } else {
      mediaEl.innerHTML = `<img src="${escapeHtml(work.media_url)}" alt="${escapeHtml(work.title)}" class="lightbox-image">`;
    }

    if (!lightboxModal) {
      lightboxModal = new bootstrap.Modal(modalEl);
      modalEl.addEventListener("hidden.bs.modal", () => {
        const video = mediaEl.querySelector("video");
        if (video) {
          video.pause();
          video.removeAttribute("src");
          video.load();
        }
        mediaEl.innerHTML = "";
      });
    }

    lightboxModal.show();
  }

  function updateServiceCounts() {
    document.querySelectorAll("[data-service]").forEach((card) => {
      const service = card.dataset.service;
      const countEl = card.querySelector(".service-count");
      if (!countEl) return;

      const count = allWorks.filter((w) =>
        PortfolioCategories.matchesService(w.category, service)
      ).length;

      if (service === "content-strategy") {
        countEl.textContent = count
          ? `${count} Campaign${count !== 1 ? "s" : ""}`
          : "Campaigns";
      } else {
        countEl.textContent = count
          ? `${count} Project${count !== 1 ? "s" : ""}`
          : "Projects";
      }
    });
  }

  async function loadAndRender(serviceSlug) {
    allWorks = await fetchWorks();
    activeService = serviceSlug || "all";
    renderFilters();
    updateServiceCounts();
    syncServiceCards(activeService);
    renderGrid(filterWorks(activeService));
  }

  function setActiveService(serviceSlug, options) {
    activeService = serviceSlug || "all";
    syncFilterButtons();
    if (options?.syncServices !== false) {
      syncServiceCards(activeService);
    }
    renderGrid(filterWorks(activeService));
  }

  window.PortfolioWorks = {
    loadAndRender,
    setActiveService,
    getPublicUrl,
    refresh: () => loadAndRender(activeService),
  };

  document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("workGrid")) {
      loadAndRender("all");
    }
  });
})();
