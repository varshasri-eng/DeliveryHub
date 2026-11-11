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

// ── FedEx hand-off (label upload -> tracking number) ───────────
export const setShipmentTracking = (id, { file, trackingNumber } = {}) => {
  const formData = new FormData();
  if (file) formData.append("label", file);
  if (trackingNumber && trackingNumber.trim()) formData.append("tracking_number", trackingNumber.trim());
  return api.post(`/admin/shipments/${id}/tracking`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const clearShipmentTracking = (id) =>
  api.delete(`/admin/shipments/${id}/tracking`);

// ── Invoice / billing ─────────────────────────────────────────
export const raiseShipmentInvoice = (shipmentId, data) =>
  api.post(`/admin/shipments/${shipmentId}/invoice`, data);

export const updateShipmentInvoice = (invoiceId, data) =>
  api.put(`/admin/shipments/invoices/${invoiceId}`, data);

export const listOfferCodes = () =>
  api.get("/admin/offer-codes");

export const createOfferCode = (data) =>
  api.post("/admin/offer-codes", data);

export const updateOfferCode = (id, data) =>
  api.put(`/admin/offer-codes/${id}`, data);

export const deleteOfferCode = (id) =>
  api.delete(`/admin/offer-codes/${id}`);

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

export const addPricingSubservice = (tierId, data) =>
  api.post(`/admin/services/pricing-tiers/${tierId}/sub-services`, data);
export const updatePricingSubservice = (subserviceId, data) =>
  api.put(`/admin/services/sub-services/${subserviceId}`, data);
export const deletePricingSubservice = (subserviceId) =>
  api.delete(`/admin/services/sub-services/${subserviceId}`);

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

export const uploadPaymentQr = (file, route) => {
  const formData = new FormData();
  formData.append("qr", file);
  formData.append("route", route);
  return api.post("/payment-settings/qr", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const deletePaymentQr = (route) =>
  api.delete("/payment-settings/qr", { params: { route } });

// TEMP stub so CustomerDetail.jsx can load; remove once that page is fixed

// ── Leads (every unique sender / receiver) ─────────────────────
export const getAdminLeads = (params = {}) => api.get("/admin/leads", { params });
export const getAdminLead = (id) => api.get(`/admin/leads/${id}`);
// ── Staff (add / edit details) ─────────────────────────────────
export const createStaff = (data) => api.post("/staff", data);
export const updateStaff = (id, data) => api.put(`/staff/${id}`, data);

export const createAdminLead = (data) => api.post("/admin/leads", data);
export const updateAdminLead = (id, data) => api.put(`/admin/leads/${id}`, data);

// ── Revenue (verified payments, by month) ──────────────────────
export const getRevenue = (month) => api.get("/admin/revenue", { params: month ? { month } : {} });