import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getOfferPopup } from "../api/offerLinks";
import { resolveMediaUrl } from "../utils/media";

function endsText(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `Valid until ${date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`;
}

// The current offer, shown right under the hero. The whole image is the link.
export default function OfferBanner({ compact = false }) {
  const [offer, setOffer] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getOfferPopup()
      .then((res) => { if (!cancelled) setOffer(res.data.popup || null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!offer) return null;
  const until = endsText(offer.ends_at);

  return (
    <div className={compact ? "mt-6" : "mx-auto max-w-7xl px-4 pb-2 pt-8 sm:px-6"}>
      <Link to={offer.link} aria-label={offer.headline || `${offer.discount_percent}% off with code ${offer.code}`}
        className="group block overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-lg shadow-gray-900/10 transition hover:-translate-y-0.5 hover:shadow-xl">
        <img src={resolveMediaUrl(offer.image_url)} alt={offer.headline || `${offer.discount_percent}% off`}
          className="block h-auto w-full" />
      </Link>
      {(offer.headline || until) && (
        <p className="mt-2 text-center text-xs font-semibold text-gray-500">
          {[offer.headline, `Code ${offer.code}`, until].filter(Boolean).join(" · ")}
        </p>
      )}
    </div>
  );
}
