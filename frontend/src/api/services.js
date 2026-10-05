import api from "./client";

// ── Public service browsing ──────────────────────────────────
export const getServices = () => api.get("/services");

export const getService = (slug) => api.get(`/services/${slug}`);
