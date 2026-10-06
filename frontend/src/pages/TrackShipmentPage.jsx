import { useState } from "react";
import { FiPackage, FiSearch } from "react-icons/fi";
import { trackShipment } from "../api/shipments";

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
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <FiPackage size={26} />
        </span>
        <h1 className="text-3xl font-extrabold text-gray-900">Track your shipment</h1>
        <p className="mt-2 text-gray-500">Enter the shipment number from your booking confirmation.</p>
      </div>

      <form onSubmit={submit} className="card">
        <label htmlFor="shipment-number" className="label">Shipment number</label>
        <div className="flex gap-2">
          <input
            id="shipment-number"
            className="input flex-1"
            placeholder="DH-XXXXXXXX"
            value={shipmentNumber}
            onChange={(event) => setShipmentNumber(event.target.value)}
          />
          <button type="submit" disabled={searching}
            className="btn-primary flex items-center gap-2 disabled:opacity-60">
            <FiSearch size={16} /> {searching ? "Searching…" : "Track"}
          </button>
        </div>
        {error && <p role="alert" className="mt-3 text-sm font-medium text-red-600">{error}</p>}
      </form>

      {shipment && (
        <section aria-live="polite" className="card mt-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Shipment</p>
              <h2 className="mt-1 text-lg font-bold text-gray-900">{shipment.shipment_number}</h2>
            </div>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold capitalize text-brand-700">
              {STATUS_LABELS[shipment.status] || shipment.status}
            </span>
          </div>
          <div className="mt-4 border-t border-gray-100 pt-4 text-sm">
            <p className="font-semibold text-gray-800">{shipment.service_name}</p>
            <p className="mt-1 text-gray-500">{shipment.tier_name}</p>
            {shipment.sub_service_name && (
              <p className="mt-1 text-gray-500">{shipment.sub_service_name}</p>
            )}
            {shipment.created_at && (
              <p className="mt-3 text-xs text-gray-400">
                Booked {new Date(shipment.created_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
