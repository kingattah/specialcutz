(function () {
  "use strict";

  const ROTATE_MS = 8000;

  let testimonials = [];
  let activeIndex = 0;
  let rotateTimer = null;

  function getClient() {
    return window.supabaseClient;
  }

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : str;
    return div.innerHTML;
  }

  function getInitials(name) {
    return String(name || "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }

  async function fetchTestimonials() {
    const client = getClient();
    if (!client) return [];

    const { data, error } = await client
      .from("testimonials")
      .select("*")
      .order("sort_order", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load testimonials:", error.message);
      return [];
    }

    return data || [];
  }

  function renderCard(item) {
    const avatar = item.avatar_url
      ? `<img class="testimonial-avatar" src="${escapeHtml(item.avatar_url)}" alt="" width="56" height="56" loading="lazy">`
      : `<span class="testimonial-avatar testimonial-avatar-fallback" aria-hidden="true">${escapeHtml(getInitials(item.author_name))}</span>`;

    const role = item.author_role
      ? `<span class="testimonial-role text-muted small">${escapeHtml(item.author_role)}</span>`
      : "";

    return `
      <figure class="testimonial glass-card mt-3 mb-0">
        <blockquote class="mb-4">
          <p>&ldquo;${escapeHtml(item.quote)}&rdquo;</p>
        </blockquote>
        <figcaption class="d-flex align-items-center gap-3">
          ${avatar}
          <div>
            <cite class="testimonial-name fw-semibold d-block fst-normal">${escapeHtml(item.author_name)}</cite>
            ${role}
          </div>
        </figcaption>
      </figure>
    `;
  }

  function renderDots() {
    const dots = document.getElementById("testimonialDots");
    if (!dots) return;

    if (testimonials.length < 2) {
      dots.innerHTML = "";
      dots.classList.add("d-none");
      return;
    }

    dots.classList.remove("d-none");
    dots.innerHTML = testimonials
      .map(
        (item, i) => `
          <button
            type="button"
            class="testimonial-dot${i === activeIndex ? " is-active" : ""}"
            data-index="${i}"
            role="tab"
            aria-selected="${i === activeIndex ? "true" : "false"}"
            aria-label="Testimonial ${i + 1} of ${testimonials.length}"
          ></button>
        `
      )
      .join("");

    dots.querySelectorAll("[data-index]").forEach((btn) => {
      btn.addEventListener("click", () => {
        show(Number(btn.dataset.index));
        startRotation();
      });
    });
  }

  function show(index) {
    const wrap = document.getElementById("testimonialsWrap");
    if (!wrap || !testimonials.length) return;

    activeIndex = (index + testimonials.length) % testimonials.length;
    wrap.innerHTML = renderCard(testimonials[activeIndex]);
    renderDots();
  }

  function stopRotation() {
    if (rotateTimer) {
      clearInterval(rotateTimer);
      rotateTimer = null;
    }
  }

  function startRotation() {
    stopRotation();
    if (testimonials.length < 2 || prefersReducedMotion()) return;
    rotateTimer = setInterval(() => show(activeIndex + 1), ROTATE_MS);
  }

  async function load() {
    const col = document.getElementById("testimonialsCol");
    const wrap = document.getElementById("testimonialsWrap");
    if (!col || !wrap) return;

    testimonials = await fetchTestimonials();

    if (!testimonials.length) {
      col.classList.add("d-none");
      return;
    }

    col.classList.remove("d-none");
    activeIndex = 0;
    show(0);
    startRotation();

    col.addEventListener("mouseenter", stopRotation);
    col.addEventListener("mouseleave", startRotation);
  }

  window.PortfolioTestimonials = { load, refresh: load };

  document.addEventListener("DOMContentLoaded", load);
})();
