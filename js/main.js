(function () {
  "use strict";

  const PARALLAX_MIN_WIDTH = 768;
  let ticking = false;

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function shouldUseParallax() {
    return (
      !prefersReducedMotion() &&
      window.innerWidth >= PARALLAX_MIN_WIDTH
    );
  }

  function setParallaxMode() {
    const on = shouldUseParallax();
    document.body.classList.toggle("no-parallax", !on);
    if (!on) {
      document.querySelectorAll("[data-parallax]").forEach((el) => {
        el.style.transform = "";
      });
    } else {
      updateParallax();
    }
  }

  function updateParallax() {
    if (!shouldUseParallax()) return;

    const scrollY = window.scrollY;
    document.querySelectorAll("[data-parallax]").forEach((el) => {
      const speed = parseFloat(el.getAttribute("data-parallax")) || 0.1;
      const offset = scrollY * speed;
      el.style.transform = `translate3d(0, ${offset}px, 0)`;
    });
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateParallax();
        updateHeader();
        ticking = false;
      });
      ticking = true;
    }
  }

  function updateHeader() {
    const header = document.getElementById("siteHeader");
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 40);
  }

  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", (e) => {
        const id = anchor.getAttribute("href");
        if (!id || id === "#") return;

        const target = document.querySelector(id);
        if (!target) return;

        e.preventDefault();
        const headerOffset = 80;
        const top =
          target.getBoundingClientRect().top + window.scrollY - headerOffset;

        window.scrollTo({
          top,
          behavior: prefersReducedMotion() ? "auto" : "smooth",
        });
      });
    });
  }

  function initReveal() {
    const els = document.querySelectorAll(".reveal");
    if (!els.length) return;

    if (prefersReducedMotion()) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    els.forEach((el) => observer.observe(el));
  }

  function initRevealForElements(els) {
    if (!els.length) return;

    if (prefersReducedMotion()) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    els.forEach((el) => observer.observe(el));
  }

  window.initRevealForElements = initRevealForElements;

  function initServiceCards() {
    const cards = document.querySelectorAll("[data-service]");
    if (!cards.length) return;

    function activate(card) {
      const service = card.getAttribute("data-service");
      if (!service) return;

      if (window.PortfolioWorks) {
        window.PortfolioWorks.setActiveService(service);
      } else {
        cards.forEach((c) => {
          const isActive = c === card;
          c.classList.toggle("active", isActive);
          c.setAttribute("aria-pressed", isActive ? "true" : "false");
        });
      }

      const works = document.getElementById("works");
      if (works) {
        const headerOffset = 80;
        const top =
          works.getBoundingClientRect().top + window.scrollY - headerOffset;
        window.scrollTo({
          top,
          behavior: prefersReducedMotion() ? "auto" : "smooth",
        });
      }
    }

    cards.forEach((card) => {
      card.addEventListener("click", () => activate(card));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate(card);
        }
      });
    });
  }

  function initCounters() {
    const stats = document.querySelectorAll(".stat-number[data-count]");
    if (!stats.length || prefersReducedMotion()) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const target = parseInt(el.getAttribute("data-count"), 10);
          if (Number.isNaN(target)) return;

          const suffix = el.textContent.includes("+") ? "+" : "";
          const duration = 1400;
          const start = performance.now();

          function tick(now) {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.floor(target * eased) + suffix;
            if (progress < 1) requestAnimationFrame(tick);
            else observer.unobserve(el);
          }

          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.5 }
    );

    stats.forEach((el) => observer.observe(el));
  }

  function initForm() {
    const form = document.getElementById("estimateForm");
    const toastEl = document.getElementById("formToast");
    if (!form || !toastEl) return;

    const toast = bootstrap.Toast.getOrCreateInstance(toastEl, {
      delay: 5000,
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.classList.add("was-validated");
        return;
      }

      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const message = form.message.value.trim();
      const subject = encodeURIComponent("Project estimate — Special Cutz");
      const body = encodeURIComponent(
        `Name: ${name}\nEmail: ${email}\n\n${message}`
      );

      window.location.href = `mailto:achumgrace82@gmail.com?subject=${subject}&body=${body}`;
      toast.show();
      form.reset();
      form.classList.remove("was-validated");
    });
  }

  function initBackToTop() {
    const btn = document.getElementById("backToTop");
    if (!btn) return;

    btn.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
    });
  }

  function initYear() {
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  }

  function initImageFallbacks() {
    document.querySelectorAll("img[data-fallback]").forEach((img) => {
      img.addEventListener("error", () => {
        const fallback = img.getAttribute("data-fallback");
        if (!fallback || img.dataset.fallbackUsed === "1") return;
        img.dataset.fallbackUsed = "1";
        img.src = fallback;
      });
    });
  }

  function initHeroReveal() {
    document.querySelectorAll(".hero .reveal").forEach((el) => {
      el.classList.add("is-visible");
    });
  }

  function initResize() {
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(setParallaxMode, 150);
    });
  }

  function init() {
    setParallaxMode();
    updateHeader();
    window.addEventListener("scroll", onScroll, { passive: true });
    initResize();
    initSmoothScroll();
    initReveal();
    initHeroReveal();
    initServiceCards();
    initCounters();
    initForm();
    initBackToTop();
    initYear();
    initImageFallbacks();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
