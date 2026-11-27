import api from "./client";

// Public: the one offer pop-up to show right now, or { popup: null }.
export const getOfferPopup = () => api.get("/offer-popup");

// Admin (multipart: image + fields)
export const listOfferLinks = () => api.get("/admin/offer-links");
export const createOfferLink = (formData) =>
  api.post("/admin/offer-links", formData, { headers: { "Content-Type": "multipart/form-data" } });
export const updateOfferLink = (id, formData) =>
  api.put(`/admin/offer-links/${id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
export const deleteOfferLink = (id) => api.delete(`/admin/offer-links/${id}`);
