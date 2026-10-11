import api from "./client";

// ── Public service browsing ──────────────────────────────────
export const getServices = (direction) => api.get("/services", {
  params: direction ? { direction } : {},
});

export const getService = (slug) => api.get(`/services/${slug}`);
