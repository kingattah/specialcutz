(function () {
  "use strict";

  const CATEGORIES = {
    "video-production": {
      label: "Video Production",
      services: ["video-editing"],
    },
    "social-media": {
      label: "Social Media",
      services: ["social-media"],
    },
    "video-editing": {
      label: "Video Editing",
      services: ["video-editing"],
    },
    "content-strategy": {
      label: "Content Strategy",
      services: ["content-strategy"],
    },
  };

  const SERVICE_FILTERS = {
    all: null,
    "video-editing": ["video-production", "video-editing"],
    "social-media": ["social-media"],
    "content-strategy": ["content-strategy"],
  };

  window.PortfolioCategories = {
    CATEGORIES,
    SERVICE_FILTERS,

    getLabel(slug) {
      return CATEGORIES[slug]?.label || slug;
    },

    getOptions() {
      return Object.entries(CATEGORIES).map(([value, { label }]) => ({
        value,
        label,
      }));
    },

    getFilterOptions() {
      return [
        { value: "all", label: "All" },
        { value: "video-editing", label: "Video Editing" },
        { value: "social-media", label: "Social Media" },
        { value: "content-strategy", label: "Content Strategy" },
      ];
    },

    matchesService(categorySlug, serviceSlug) {
      if (!serviceSlug || serviceSlug === "all") return true;
      const allowed = SERVICE_FILTERS[serviceSlug];
      if (!allowed) return true;
      return allowed.includes(categorySlug);
    },
  };
})();
