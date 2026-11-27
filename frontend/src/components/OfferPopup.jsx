import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiX } from "react-icons/fi";
import { getOfferPopup } from "../api/offerLinks";
import { resolveMediaUrl } from "../utils/media";

// Pages where the pop-up may appear (landing, services, signed-in home).
const SHOW_ON = ["/", "/services", "/account/home"];

function endsText(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `Offer valid until ${date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`;
}

export default function OfferPopup() {
  const { pathname } = useLocation();
  const [popup, setPopup] = useState(null);
  const [open, setOpen] = useState(false);
  const allowed = SHOW_ON.includes(pathname.replace(/\/+$/, "") || "/");

  useEffect(() => {
    if (!allowed || popup) return;
    let cancelled = false;
    getOfferPopup()
      .then((res) => {
        const next = res.data.popup;
        if (cancelled || !next) return;
        let seen = false;
        try { seen = sessionStorage.getItem(`offer-popup-${next.id}`) === "1"; } catch { /* ignore */ }
        if (seen) return;
        setPopup(next);
        setOpen(true);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [allowed, popup]);

  const close = () => {
    setOpen(false);
    try { sessionStorage.setItem(`offer-popup-${popup.id}`, "1"); } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!allowed || !popup || !open) return null;
  const until = endsText(popup.ends_at);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" onClick={close}>
      <div role="dialog" aria-modal="true" aria-label={popup.headline || "Special offer"}
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={close} aria-label="Close offer"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80">
          <FiX size={18} />
        </button>
        <Link to={popup.link} onClick={close} className="block">
          <img src={resolveMediaUrl(popup.image_url)} alt={popup.headline || `${popup.discount_percent}% off`}
            className="block max-h-[70vh] w-full object-cover" />
        </Link>
        <div className="p-5 text-center">
          {popup.headline && <p className="text-lg font-extrabold text-gray-950">{popup.headline}</p>}
          <p className="mt-1 text-sm text-gray-600">
            Use code <span className="font-bold text-gray-900">{popup.code}</span> for {popup.discount_percent}% off
          </p>
          {until && <p className="mt-1 text-xs font-semibold text-amber-700">{until}</p>}
          <Link to={popup.link} onClick={close}
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-brand-700 px-5 py-3 text-sm font-bold text-white hover:bg-brand-800">
            Claim this offer
          </Link>
        </div>
      </div>
    </div>
  );
}
