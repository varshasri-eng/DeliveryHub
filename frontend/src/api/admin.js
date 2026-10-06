import api from "./client";

// ── Customer list ────────────────────────────────────────────
export const listCustomers = (params = {}) =>
  api.get("/admin/customers", { params });

export const getCustomer = (id) =>
  api.get(`/admin/customers/${id}`);

export const editCustomer = (id, data) =>
  api.put(`/admin/customers/${id}`, data);

export const deactivateCustomer = (id) =>
  api.put(`/admin/customers/${id}/deactivate`);

export const activateCustomer = (id) =>
  api.put(`/admin/customers/${id}/activate`);

export const changeRole = (id, role) =>
  api.put(`/admin/customers/${id}/role`, { role });

export const getCustomerAddresses = (id) =>
  api.get(`/admin/customers/${id}/addresses`);

export const getCustomerShipments = (id) =>
  api.get(`/admin/customers/${id}/shipments`);

export const deleteCustomer = (id) =>
  api.delete(`/admin/customers/${id}`);

export const getCustomerStats = () =>
  api.get("/admin/stats/customers");

// ── Shipment management ──────────────────────────────────────
export const getAdminShipments = (params = {}) =>
  api.get("/admin/shipments", { params });

export const getAdminShipment = (id) =>
  api.get(`/admin/shipments/${id}`);

export const updateShipmentStatus = (id, status) =>
  api.put(`/admin/shipments/${id}/status`, { status });

// ── Invoice / billing ─────────────────────────────────────────
export const raiseShipmentInvoice = (shipmentId) =>
  api.post(`/admin/shipments/${shipmentId}/invoice`);

export const verifyShipmentPayment = (invoiceId) =>
  api.put(`/admin/shipments/invoices/${invoiceId}/verify`);

export const rejectShipmentPayment = (invoiceId, reason) =>
  api.put(`/admin/shipments/invoices/${invoiceId}/reject`, { reason });

// ── Service management ────────────────────────────────────────
export const listAdminServices = () =>
  api.get("/admin/services");

export const getAdminService = (id) =>
  api.get(`/admin/services/${id}`);

export const createService = (data) =>
  api.post("/admin/services", data);

export const updateService = (id, data) =>
  api.put(`/admin/services/${id}`, data);

export const deleteService = (id) =>
  api.delete(`/admin/services/${id}`);

export const addCoverageItem = (serviceId, data) =>
  api.post(`/admin/services/${serviceId}/coverage`, data);
export const updateCoverageItem = (itemId, data) =>
  api.put(`/admin/services/coverage/${itemId}`, data);
export const deleteCoverageItem = (itemId) =>
  api.delete(`/admin/services/coverage/${itemId}`);

export const addRestriction = (serviceId, data) =>
  api.post(`/admin/services/${serviceId}/restrictions`, data);
export const updateRestriction = (itemId, data) =>
  api.put(`/admin/services/restrictions/${itemId}`, data);
export const deleteRestriction = (itemId) =>
  api.delete(`/admin/services/restrictions/${itemId}`);

export const addPricingTier = (serviceId, data) =>
  api.post(`/admin/services/${serviceId}/pricing-tiers`, data);
export const updatePricingTier = (tierId, data) =>
  api.put(`/admin/services/pricing-tiers/${tierId}`, data);
export const deletePricingTier = (tierId) =>
  api.delete(`/admin/services/pricing-tiers/${tierId}`);

export const addField = (serviceId, data) =>
  api.post(`/admin/services/${serviceId}/fields`, data);
export const updateField = (fieldId, data) =>
  api.put(`/admin/services/fields/${fieldId}`, data);
export const deleteField = (fieldId) =>
  api.delete(`/admin/services/fields/${fieldId}`);

// ── Payment settings ───────────────────────────────────────────
// The QR code + instructions shown on every invoice. Separate from
// site branding — admin-managed payment info, not a branding asset.
export const updatePaymentSettings = (data) =>
  api.put("/payment-settings", data);

export const uploadPaymentQr = (file) => {
  const formData = new FormData();
  formData.append("qr", file);
  return api.post("/payment-settings/qr", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const deletePaymentQr = () =>
  api.delete("/payment-settings/qr");

// TEMP stub so CustomerDetail.jsx can load; remove once that page is fixed
