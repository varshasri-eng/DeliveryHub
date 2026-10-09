import { useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { FiCheckCircle, FiCheck, FiMessageCircle, FiDownload } from "react-icons/fi";
import { getService } from "../api/services";
import { createShipment, createGuestShipment } from "../api/shipments";
import { useAuth } from "../context/AuthContext";
import { formatMoney } from "../utils/money";
import { downloadShipmentSummary } from "../utils/shipmentSummary";

const money = (n, currencyCode) => formatMoney(n, currencyCode);
const WHATSAPP_NUMBER = "15107146946";

const DIRECTIONS = {
  US_TO_IN: {
    label: "United States → India",
    currencyCode: "USD",
    from: { name: "United States", shortName: "USA", phoneCode: "1", postalLabel: "ZIP Code", postalPlaceholder: "94105", postalPattern: /^\d{5}(?:-\d{4})?$/, phonePattern: /^[2-9]\d{2}[2-9]\d{6}$/ },
    to: { name: "India", shortName: "India", phoneCode: "91", postalLabel: "Postal Code", postalPlaceholder: "500072", postalPattern: /^\d{6}$/, phonePattern: /^[6-9]\d{9}$/ },
  },
  IN_TO_US: {
    label: "India → United States",
    currencyCode: "INR",
    from: { name: "India", shortName: "India", phoneCode: "91", postalLabel: "Postal Code", postalPlaceholder: "500072", postalPattern: /^\d{6}$/, phonePattern: /^[6-9]\d{9}$/ },
    to: { name: "United States", shortName: "USA", phoneCode: "1", postalLabel: "ZIP Code", postalPlaceholder: "94105", postalPattern: /^\d{5}(?:-\d{4})?$/, phonePattern: /^[2-9]\d{2}[2-9]\d{6}$/ },
  },
};
const US_TOLL_FREE_CODES = new Set(["800", "833", "844", "855", "866", "877", "888"]);

const emptyParty = () => ({
  name: "", phone: "", postalCode: "", street: "", city: "", province: "",
});

function formatAddress(p, country) {
  return [p.street, p.city, [p.province, p.postalCode].filter(Boolean).join(" "), country.name]
    .filter(Boolean).join(", ");
}

// "Envelope — up to 20 sheets" -> { title, sub }
function splitOption(o) {
  const [title, ...rest] = String(o).split(/\s+[—–-]\s+/);
  const sub = rest.join(" — "); return { title, sub: sub.charAt(0).toUpperCase() + sub.slice(1) };
}

function validateParty(p, who, country) {
  const e = {};
  if (!p.name.trim()) e.name = `Enter the ${who}'s name.`;
  const phoneDigits = p.phone.replace(/\D/g, "");
  if (/[^\d\s()+.-]/.test(p.phone) || !country.phonePattern.test(phoneDigits)) {
    e.phone = country.name === "India"
      ? "Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9."
      : "Enter a valid 10-digit U.S. phone number.";
  } else if (country.name === "United States" && US_TOLL_FREE_CODES.has(phoneDigits.slice(0, 3))) {
    e.phone = "Toll-free numbers cannot be used as shipment contacts.";
  }
  if (!p.postalCode.trim()) {
    e.postalCode = `${country.postalLabel} is required.`;
  } else if (!country.postalPattern.test(p.postalCode.trim())) {
    e.postalCode = country.name === "India"
      ? "Enter a valid 6-digit postal code."
      : "Enter a valid ZIP code (5 digits or ZIP+4).";
  }
  if (!p.street.trim()) e.street = who === "sender" ? "Enter the pickup address." : "Enter the delivery address.";
  if (!p.city.trim()) e.city = "Enter the city.";
  if (!p.province.trim()) e.province = "Enter the province or state.";
  return e;
}

function Err({ show, msg }) {
  if (!show || !msg) return null;
  return <p className="text-xs font-medium text-red-600 mt-1">{msg}</p>;
}

function PartyCard({
  letter, title, subtitle, who, value, onChange, errors, showErrors, country, compact = false,
}) {
  const [touched, setTouched] = useState({});
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }));
  const show = (k) => (showErrors || touched[k]) && errors[k];
  const cls = (k) => `input ${show(k) ? "border-red-400" : ""}`;

  return (
    <div className={`card ${compact ? "p-3" : ""}`}>
      <div className={`flex items-center gap-2 ${compact ? "mb-2" : "mb-4"}`}>
        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold
                          ${letter === "A" ? "bg-gray-900" : "bg-brand-600"}`}>
          {letter}
        </span>
        <div>
          <p className="font-semibold text-gray-900 text-sm leading-tight">{title}</p>
          <p className="text-xs text-gray-400 leading-tight">{subtitle}</p>
        </div>
        <span className="ml-auto rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
          {country.shortName}
        </span>
      </div>

      <div className={compact ? "space-y-2" : "space-y-3"}>
        <div className={compact ? "grid grid-cols-2 gap-2" : ""}>
          <div>
          <label className="label">Full name *</label>
          <input className={cls("name")} placeholder={who === "sender" ? "Sender name" : "Recipient name"}
            value={value.name} onChange={set("name")} onBlur={blur("name")} />
          <Err show={show("name")} msg={errors.name} />
          </div>

          <div>
          <label className="label">Phone *</label>
          <div className="grid grid-cols-[72px_1fr] gap-2">
            <span className="input flex items-center justify-center text-gray-500">+{country.phoneCode}</span>
            <input className={cls("phone")}
              placeholder={country.name === "India" ? "10-digit mobile number" : "10-digit U.S. number"}
              inputMode="tel"
              value={value.phone} onChange={set("phone")} onBlur={blur("phone")} />
          </div>
          <Err show={show("phone")} msg={errors.phone} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Country</label>
            <div className="input bg-gray-50 text-gray-600">{country.name}</div>
          </div>
          <div>
            <label className="label">{country.postalLabel} *</label>
            <input className={cls("postalCode")} placeholder={country.postalPlaceholder}
              inputMode={country.name === "India" ? "numeric" : "text"}
              value={value.postalCode} onChange={set("postalCode")} onBlur={blur("postalCode")} />
            <Err show={show("postalCode")} msg={errors.postalCode} />
          </div>
        </div>

        <div>
          <label className="label">Street address *</label>
          <input className={cls("street")} placeholder="Building, street, unit"
            value={value.street} onChange={set("street")} onBlur={blur("street")} />
          <Err show={show("street")} msg={errors.street} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">City *</label>
            <input className={cls("city")} placeholder="City"
              value={value.city} onChange={set("city")} onBlur={blur("city")} />
            <Err show={show("city")} msg={errors.city} />
          </div>
          <div>
            <label className="label">Province / state *</label>
            <input className={cls("province")} placeholder="Province or state"
              value={value.province} onChange={set("province")} onBlur={blur("province")} />
            <Err show={show("province")} msg={errors.province} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DynamicField({ field, value, onChange, error, showError }) {
  const id = `field_${field.field_key}`;
  const opts = field.options || [];

  if (field.field_type === "checkbox") {
    return (
      <label htmlFor={id} className="flex items-center gap-2 text-sm text-gray-800">
        <input id={id} type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        {field.label}
      </label>
    );
  }

  // Radio cards: title + subtitle, split from "Title — subtitle" options
  if (field.field_type === "select" && opts.length > 0 && opts.length <= 4) {
    return (
      <div>
        <label className="label">{field.label}</label>
        <div className={`grid gap-2 ${opts.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {opts.map((o) => {
            const { title, sub } = splitOption(o);
            const active = value === o;
            return (
              <button key={o} type="button" onClick={() => onChange(o)}
                className={`flex items-start gap-2 text-left rounded-xl border-2 p-2.5 text-[13px] transition-colors min-w-0
                           ${active ? "border-brand-500 bg-brand-50" : "border-gray-200 hover:border-gray-300"}`}>
                <span className={`mt-0.5 w-4 h-4 shrink-0 rounded-full border-2 flex items-center justify-center
                                  ${active ? "border-brand-500" : "border-gray-300"}`}>
                  {active && <span className="w-2 h-2 rounded-full bg-brand-500" />}
                </span>
                <span className="min-w-0">
                  <span className="font-semibold text-gray-900 block leading-tight">{title}</span>
                  {sub && <span className="text-xs text-gray-500 block leading-tight mt-0.5">{sub}</span>}
                </span>
              </button>
            );
          })}
        </div>
        <Err show={showError} msg={error} />
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={id} className="label">{field.label} *</label>
      {field.field_type === "textarea" ? (
        <textarea id={id} className={`input ${showError && error ? "border-red-400" : ""}`} rows={3} value={value ?? ""}
          onChange={(e) => onChange(e.target.value)} />
      ) : field.field_type === "select" ? (
        <select id={id} className={`input ${showError && error ? "border-red-400" : ""}`}
          value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {opts.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : field.field_type === "file" ? (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
          File attachments aren't supported yet.
        </p>
      ) : (
        <input id={id} className={`input ${showError && error ? "border-red-400" : ""}`}
          type={field.field_type === "number" ? "number" : field.field_type === "date" ? "date" : "text"}
          value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      )}
      <Err show={showError} msg={error} />
      {field.field_type === "date" && (
        <p className="text-xs text-gray-400 mt-1">Final availability is confirmed next.</p>
      )}
    </div>
  );
}

export default function BookShipmentPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const { customer } = useAuth();

  const [service, setService] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [direction, setDirection] = useState("US_TO_IN");
  const [sender, setSender] = useState(emptyParty());
  const [receiver, setReceiver] = useState(emptyParty());
  const [fieldValues, setFieldValues] = useState({});
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState(null);

  const requestedTierId = Number(searchParams.get("tier"));
  const [selectedTierId, setSelectedTierId] = useState(null);
  const [selectedSubserviceId, setSelectedSubserviceId] = useState(null);
  const quantity = Math.max(1, parseInt(searchParams.get("qty"), 10) || 1);
  const route = DIRECTIONS[direction];

  useEffect(() => {
    setService(null);
    setNotFound(false);
    setLoadError("");
    getService(slug)
      .then((res) => {
        const svc = res.data.service;
        setService(svc);
        const tiers = svc.pricing_tiers || [];
        setSelectedTierId((current) => (
          tiers.some((t) => t.id === current)
            ? current
            : tiers.some((t) => t.id === requestedTierId)
              ? requestedTierId
              : tiers[0]?.id ?? null
        ));
        const initial = {};
        (svc.fields || []).forEach((f) => {
          if (f.field_type === "checkbox") initial[f.field_key] = false;
          // preselect first option for radio-card selects
          if (f.field_type === "select" && (f.options || []).length > 0 && f.options.length <= 4) {
            initial[f.field_key] = f.options[0];
          }
        });
        setFieldValues(initial);
      })
      .catch((error) => {
        if (error.response?.status === 404) {
          setNotFound(true);
          return;
        }
        setLoadError(
          error.response?.data?.error ||
          "Could not load this service. Please try again shortly."
        );
      });
  }, [slug, requestedTierId]);

  useEffect(() => {
    const subservices = service?.pricing_tiers
      ?.find((pricingTier) => pricingTier.id === selectedTierId)?.sub_services || [];
    setSelectedSubserviceId((current) => (
      subservices.some((subservice) => subservice.id === current)
        ? current
        : subservices[0]?.id ?? null
    ));
  }, [service, selectedTierId]);

  useEffect(() => {
    if (!customer) return;
    const phone = customer.phone && !customer.phone.startsWith("guest-")
      ? customer.phone.replace(/\D/g, "").replace(/^(?:1|91)(?=\d{10}$)/, "")
      : "";
    setSender((prev) => ({ ...prev, name: prev.name || customer.name || "", phone: prev.phone || phone }));
  }, [customer]);

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Service not found</h1>
        <Link to="/services" className="text-brand-600 hover:underline">Back to services</Link>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        {loadError ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Service temporarily unavailable</h1>
            <p role="alert" className="text-sm text-red-600">{loadError}</p>
            <Link to="/services" className="inline-block mt-4 text-brand-600 hover:underline">
              Back to services
            </Link>
          </>
        ) : (
          <p className="text-gray-400">Loading…</p>
        )}
      </div>
    );
  }

  const tiers = service.pricing_tiers || [];
  const tier = tiers.find((t) => t.id === selectedTierId);
  const subservices = tier?.sub_services || [];
  const subservice = subservices.find((item) => item.id === selectedSubserviceId);

  if (tiers.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">This service is not ready for booking</h1>
        <Link to={`/services/${service.slug}`} className="text-brand-600 hover:underline">
          Back to {service.name}
        </Link>
      </div>
    );
  }

  const effectiveQty = service.enable_quantity ? quantity : 1;
  const currencyCode = route.currencyCode;
  const priceKey = currencyCode === "INR" ? "price_inr" : "price";
  const selectedPrice = subservices.length > 0
    ? subservice?.[priceKey]
    : tier?.[priceKey];
  const unitPrice = selectedPrice == null ? 0 : Number(selectedPrice);
  const total = unitPrice * effectiveQty;
  const isDocumentService = ["document-services", "document-shipping"].includes(service.slug);
  const fields = isDocumentService ? [] : service.fields || [];
  const shortName = service.name.replace(/\s+services?$/i, "");

  const setField = (key, value) => setFieldValues((prev) => ({ ...prev, [key]: value }));

  const senderErrors = validateParty(sender, "sender", route.from);
  const receiverErrors = validateParty(receiver, "receiver", route.to);
  const fieldErrors = {};
  fields.forEach((f) => {
    if (f.field_type === "checkbox" || f.field_type === "file") return;
    const v = fieldValues[f.field_key];
    if (v === undefined || v === null || String(v).trim() === "") {
      fieldErrors[f.field_key] = `${f.label} is required.`;
    }
  });
  const hasErrors = !tier || (subservices.length > 0 && !subservice) || selectedPrice == null ||
    Object.keys(senderErrors).length || Object.keys(receiverErrors).length ||
    Object.keys(fieldErrors).length;

  // Sidebar summary adapts to this service's own fields
  const summarySelectField = fields.find((f) => f.field_type === "select");
  const summaryDateField = fields.find((f) => f.field_type === "date");
  const selectedOpt = summarySelectField ? fieldValues[summarySelectField.field_key] : null;

  const submit = async (e) => {
    e.preventDefault();
    if (hasErrors) {
      setShowErrors(true);
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setSubmitting(true);

    const payload = {
      route_direction: direction,
      service_type_id: service.id,
      pricing_tier_id: tier?.id,
      sub_service_id: subservice?.id ?? null,
      quantity: effectiveQty,
      sender_name: sender.name.trim(),
      sender_country: route.from.name,
      sender_postal_code: sender.postalCode.trim(),
      sender_city: sender.city.trim(),
      sender_province: sender.province.trim(),
      sender_phone: `+${route.from.phoneCode} ${sender.phone}`.trim(),
      sender_address: formatAddress(sender, route.from),
      receiver_name: receiver.name.trim(),
      receiver_country: route.to.name,
      receiver_postal_code: receiver.postalCode.trim(),
      receiver_city: receiver.city.trim(),
      receiver_province: receiver.province.trim(),
      receiver_phone: `+${route.to.phoneCode} ${receiver.phone}`.trim(),
      receiver_address: formatAddress(receiver, route.to),
      field_values: fieldValues,
      notes: "",
    };

    try {
      const res = customer
        ? await createShipment(payload)
        : await createGuestShipment({
            ...payload,
            guest_name: sender.name.trim(),
            guest_phone: payload.sender_phone,
          });
      const shipment = res.data.shipment;
      setBooked(shipment);
      downloadShipmentSummary(shipment);
      window.scrollTo({ top: 0 });
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not book your shipment.");
    } finally {
      setSubmitting(false);
    }
  };

  if (booked) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="card">
        <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-50 text-green-600 mb-4">
          <FiCheckCircle size={28} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Shipment requested</h1>
        <p className="text-gray-600">Your booking details have been downloaded. Keep the file to recall your tracking number.</p>
        <p className="mt-3 text-xs font-bold uppercase tracking-wide text-gray-400">Tracking number</p>
        <p className="mt-1 text-2xl font-extrabold text-brand-700">{booked.shipment_number}</p>
        </div>
        <div className="mt-6 grid sm:grid-cols-2 gap-4 border-t border-gray-100 pt-5 text-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">Order summary</p>
            <p className="font-semibold text-gray-900">{booked.service_name} — {booked.tier_name}</p>
            {booked.sub_service_name && <p className="text-gray-600">{booked.sub_service_name}</p>}
            <p className="mt-1 text-gray-600">{money(booked.total_price, booked.currency_code)}</p>
            <p className="mt-1 text-gray-500">Booked {new Date(booked.created_at).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">Shipment route</p>
            <p className="font-semibold text-gray-900">From: {booked.sender_name}</p>
            <p className="text-gray-600">{booked.sender_address}</p>
            <p className="mt-2 font-semibold text-gray-900">To: {booked.receiver_name}</p>
            <p className="text-gray-600">{booked.receiver_address}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <button type="button" onClick={() => downloadShipmentSummary(booked)}
            className="btn-primary flex items-center justify-center gap-2">
            <FiDownload size={16} /> Download booking details
          </button>
          {customer && <Link to="/account/shipments" className="btn-primary text-center">View My Shipments</Link>}
          <Link to="/track" className="btn-secondary text-center">Track this shipment</Link>
          <Link to="/services" className="btn-secondary text-center">Book another shipment</Link>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <form onSubmit={submit} noValidate
        className="grid gap-3 items-start lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_290px]">
          <fieldset className="card p-3 lg:col-span-3">
            <legend className="px-1 text-sm font-bold text-gray-900">Choose shipping direction</legend>
            <div className="grid sm:grid-cols-2 gap-2 mt-1">
              {Object.entries(DIRECTIONS).map(([key, option]) => (
                <label key={key}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 p-2 transition-colors
                    ${direction === key ? "border-brand-500 bg-brand-50" : "border-gray-200 hover:border-gray-300"}`}>
                <input type="radio" name="route_direction" value={key}
                  checked={direction === key} onChange={() => setDirection(key)} />
                <span className="font-semibold text-gray-900">{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <PartyCard letter="A" title="From" subtitle="Pickup contact and address" who="sender"
          value={sender} onChange={setSender} errors={senderErrors} showErrors={showErrors} country={route.from}
          compact />
        <PartyCard letter="B" title="To" subtitle="Recipient and delivery address" who="receiver"
          value={receiver} onChange={setReceiver} errors={receiverErrors} showErrors={showErrors} country={route.to}
          compact />

        {/* Sticky summary sidebar */}
        <div className="card p-3 space-y-2">
          {subservices.length > 0 && (
            <div>
              <p className="font-semibold text-gray-900 text-sm mb-2">
                {tier.tier_name} sub-services
              </p>
              <div className="space-y-1.5">
                {subservices.map((option) => (
                  <button key={option.id} type="button"
                    onClick={() => setSelectedSubserviceId(option.id)}
                    aria-pressed={subservice?.id === option.id}
                    className={`w-full flex items-center gap-2 rounded-lg border-2 px-2 py-1.5 text-left transition-colors
                      ${subservice?.id === option.id
                        ? "border-brand-500 bg-brand-50"
                        : "border-gray-200 hover:border-gray-300"}`}>
                    <span>{option.icon || "📦"}</span>
                    <span className="flex-1 text-xs font-semibold text-gray-900">{option.name}</span>
                    <span className="text-xs font-bold text-gray-900">
                      {money(option[priceKey], currencyCode)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="font-bold text-gray-900 text-sm">Your route</p>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="mt-1 w-3.5 h-3.5 rounded-full border-2 border-gray-900 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-900" />
              </span>
              <div>
                <p className="text-[10px] font-bold tracking-wide text-gray-400">FROM</p>
                <p className="text-gray-900 font-semibold">{sender.postalCode || `Enter ${route.from.postalLabel}`}</p>
                <p className="text-xs text-gray-400">{route.from.shortName}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-1 w-3.5 h-3.5 rounded-full border-2 border-brand-600 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-600" />
              </span>
              <div>
                <p className="text-[10px] font-bold tracking-wide text-gray-400">TO</p>
                <p className="text-gray-900 font-semibold">{receiver.postalCode || `Enter ${route.to.postalLabel}`}</p>
                <p className="text-xs text-gray-400">{route.to.shortName}</p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-3 text-sm space-y-1.5">
            {summarySelectField && (
              <div className="flex justify-between">
                <span className="text-gray-400">{summarySelectField.label.replace(/\s+size$/i, "")}</span>
                <span className="text-gray-900 font-semibold">{selectedOpt ? splitOption(selectedOpt).title : "—"}</span>
              </div>
            )}
            {subservice && (
              <div className="flex justify-between gap-3">
                <span className="text-gray-400">Delivery sub-service</span>
                <span className="text-gray-900 font-semibold text-right">{subservice.name}</span>
              </div>
            )}
            {summaryDateField && (
              <div className="flex justify-between">
                <span className="text-gray-400">{summaryDateField.label.replace(/\s+date$/i, "")}</span>
                <span className="text-gray-900 font-semibold">
                  {fieldValues[summaryDateField.field_key] || "Choose a date"}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-400">Total</span>
              <span className="text-gray-900 font-extrabold">
                {selectedPrice == null ? `${currencyCode} price not set` : money(total, currencyCode)}
              </span>
            </div>
          </div>
          <button type="submit" disabled={submitting || Boolean(hasErrors)} className="btn-primary w-full">
            {submitting ? "Submitting…" : "Review shipment"}
          </button>
          <p className="text-xs text-gray-400 text-center">No payment at this step</p>
        </div>

        {fields.length > 0 && (
          <div className="card lg:col-span-3">
            <h2 className="font-bold text-gray-900 text-lg mb-4">{shortName} details</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
              {fields.map((f) => (
                <DynamicField key={f.id}
                  field={f}
                  value={fieldValues[f.field_key]}
                  onChange={(v) => setField(f.field_key, v)}
                  error={fieldErrors[f.field_key]} showError={showErrors} />
              ))}
            </div>
          </div>
        )}
      </form>

      <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer"
        className="fixed bottom-6 right-6 flex items-center gap-2 bg-green-500 hover:bg-green-600
                   text-white font-semibold px-4 py-3 rounded-full shadow-lg transition-colors">
        <FiMessageCircle size={18} /> Chat with us
      </a>
    </div>
  );
}
