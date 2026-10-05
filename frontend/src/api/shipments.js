import api from "./client";

// ── Shipments ─────────────────────────────────────────────────
export const getMyShipments = () =>
  api.get("/shipments");

export const getShipment = (id) =>
  api.get(`/shipments/${id}`);

export const createShipment = (data) =>
  api.post("/shipments", data);

export const createGuestShipment = (data) =>
  api.post("/shipments/guest", data);

// ── Payment proof ─────────────────────────────────────────────
// Submits a screenshot and/or a note for a shipment's invoice. At
// least one of the two is required — pass whichever the customer
// filled in; `file` may be omitted (null/undefined) if they only
// left a note.
export const submitPaymentProof = (shipmentId, { file, note } = {}) => {
  const formData = new FormData();
  if (file) formData.append("screenshot", file);
  if (note) formData.append("note", note);

  return api.post(`/shipments/${shipmentId}/invoice/payment`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
