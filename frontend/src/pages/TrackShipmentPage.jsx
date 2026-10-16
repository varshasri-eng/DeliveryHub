import { useState } from "react";
import { FiArrowRight, FiCheck, FiPackage, FiSearch, FiShield } from "react-icons/fi";
import { trackShipment } from "../api/shipments";
import Reveal from "../components/Reveal";

const STATUS_LABELS = {
  requested: "Requested",
  picked_up: "Picked up",
  in_transit: "In transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function TrackShipmentPage() {
  const [shipmentNumber, setShipmentNumber] = useState("");
  const [shipment, setShipment] = useState(null);
  const [error, setError] = useState("");
  const [searching, setSearching] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const number = shipmentNumber.trim();
    if (!number) {
      setError("Enter your shipment number.");
      setShipment(null);
      return;
    }

    setSearching(true);
    setError("");
    setShipment(null);
    try {
      const response = await trackShipment(number);
      setShipment(response.data.shipment);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Could not look up this shipment.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="min-h-[70vh] overflow-hidden bg-[#f5f8f6]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <Reveal className="relative">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-brand-800 shadow-sm">
            <FiShield size={14} /> Shipment visibility
          </span>
          <h1 className="max-w-xl text-4xl font-extrabold leading-tight tracking-tight text-gray-950 sm:text-5xl">
            Follow your shipment’s journey.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-7 text-gray-600">
            Enter the reference from your booking confirmation to see the latest available status.
          </p>
          <div className="mt-8 space-y-3">
            {["Find your shipment with its reference", "View the current fulfillment status", "Keep your booking details nearby"].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm font-medium text-gray-700">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-brand-700"><FiCheck size={14} /></span>
                {item}
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="relative overflow-hidden rounded-[2rem] bg-gray-950 p-6 text-white shadow-2xl shadow-gray-900/15 sm:p-9">
            <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full border-[34px] border-white/[0.04]" />
            <div className="absolute -bottom-24 -left-14 h-64 w-64 rounded-full bg-brand-700/30 blur-3xl" />
            <div className="relative">
              <div className="mb-7 flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-emerald-200">
                  <FiPackage size={23} />
                </span>
                <div>
                  <p className="font-bold">Track a delivery</p>
                  <p className="text-sm text-white/55">Your latest shipment update</p>
                </div>
              </div>
              <form onSubmit={submit}>
                <label htmlFor="shipment-number" className="mb-2 block text-sm font-semibold text-white/80">
                  Shipment reference
                </label>
                <div className="flex flex-col gap-2 rounded-2xl bg-white p-2 sm:flex-row">
                  <input
                    id="shipment-number"
                    className="min-w-0 flex-1 rounded-xl border-0 px-3 py-3 text-sm text-gray-900 outline-none ring-0 placeholder:text-gray-400 focus:ring-2 focus:ring-brand-200"
                    placeholder="e.g. DH-XXXXXXXX"
                    autoComplete="off"
                    value={shipmentNumber}
                    onChange={(event) => setShipmentNumber(event.target.value)}
                  />
                  <button type="submit" disabled={searching}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-brand-800 disabled:opacity-60">
                    <FiSearch size={16} /> {searching ? "Searching…" : "Track shipment"} <FiArrowRight size={15} />
                  </button>
                </div>
                {error && <p role="alert" className="mt-3 rounded-xl border border-red-300/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
              </form>
            </div>
          </div>
        </Reveal>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
        {shipment && (
          <Reveal>
            <section aria-live="polite" className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xl shadow-gray-900/[0.04] sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">Shipment found</p>
                  <h2 className="mt-2 text-2xl font-extrabold text-gray-950">{shipment.shipment_number}</h2>
                  <p className="mt-1 text-sm text-gray-500">{shipment.service_name} · {shipment.tier_name}</p>
                </div>
                <span className="rounded-full bg-brand-50 px-4 py-2 text-sm font-bold capitalize text-brand-800">
                  {STATUS_LABELS[shipment.status] || shipment.status}
                </span>
              </div>
              <div className="mt-7 grid gap-3 border-t border-gray-100 pt-6 sm:grid-cols-3">
                {["requested", "picked_up", "in_transit", "delivered"].map((status, index) => {
                  const statuses = ["requested", "picked_up", "in_transit", "delivered"];
                  const activeIndex = statuses.indexOf(shipment.status);
                  const isComplete = activeIndex >= index && shipment.status !== "cancelled";
                  return (
                    <div key={status} className={`rounded-2xl border p-4 transition-colors ${
                      isComplete ? "border-brand-200 bg-brand-50" : "border-gray-100 bg-gray-50"
                    }`}>
                      <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-full ${
                        isComplete ? "bg-brand-700 text-white" : "bg-white text-gray-400"
                      }`}>{isComplete ? <FiCheck size={15} /> : <span className="text-xs font-bold">{index + 1}</span>}</div>
                      <p className={`text-sm font-bold capitalize ${isComplete ? "text-brand-900" : "text-gray-400"}`}>
                        {STATUS_LABELS[status]}
                      </p>
                    </div>
                  );
                })}
              </div>
              {shipment.created_at && (
                <p className="mt-4 text-xs text-gray-400">
                  Booked {new Date(shipment.created_at).toLocaleDateString()}
                  {shipment.sub_service_name ? ` · ${shipment.sub_service_name}` : ""}
                </p>
              )}
            </section>
          </Reveal>
        )}
      </div>
    </div>
  );
}
