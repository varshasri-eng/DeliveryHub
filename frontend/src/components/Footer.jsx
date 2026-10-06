import { Link } from "react-router-dom";
import { FaFacebook, FaInstagram, FaTwitter, FaWhatsapp } from "react-icons/fa";
import { FiMail, FiPhone, FiMapPin } from "react-icons/fi";
import { useBranding } from "../context/BrandingContext";
import BrandLogo from "./BrandLogo";

export default function Footer() {
  const { settings } = useBranding();

  const socialLinks = [
    { url: settings.facebook_url, icon: <FaFacebook size={15} />, label: "Facebook" },
    { url: settings.instagram_url, icon: <FaInstagram size={15} />, label: "Instagram" },
    { url: settings.twitter_url, icon: <FaTwitter size={15} />, label: "Twitter / X" },
  ].filter((s) => s.url);

  return (
    <footer className="bg-white border-t border-gray-100 mt-12">
      {/* WhatsApp community callout — only shown once an admin sets
          an invite link in Branding settings */}
      {settings.whatsapp_community_url && (
        <div className="bg-brand-50 border-b border-brand-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-medium text-brand-800">
              <FaWhatsapp size={18} className="text-green-600 flex-shrink-0" />
              Join our WhatsApp community for shipment updates and support.
            </p>
            <a
              href={settings.whatsapp_community_url}
              target="_blank"
              rel="noreferrer"
              className="flex-shrink-0 flex items-center gap-2 bg-green-600 hover:bg-green-700
                         text-white font-semibold text-sm px-4 py-2 rounded-full transition-colors">
              <FaWhatsapp size={15} />
              Join WhatsApp community
            </a>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid sm:grid-cols-3 gap-8">
        {/* Identity */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BrandLogo size="sm" />
            <span className="font-bold text-gray-900">{settings.site_name}</span>
          </div>
          <p className="text-sm text-gray-500">{settings.tagline}</p>
        </div>

        {/* Contact */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Contact
          </p>
          <div className="space-y-2 text-sm text-gray-600">
            {settings.contact_email && (
              <a href={`mailto:${settings.contact_email}`}
                 className="flex items-center gap-2 hover:text-brand-600 transition-colors">
                <FiMail size={14} /> {settings.contact_email}
              </a>
            )}
            {settings.contact_phone && (
              <a href={`tel:${settings.contact_phone}`}
                 className="flex items-center gap-2 hover:text-brand-600 transition-colors">
                <FiPhone size={14} /> {settings.contact_phone}
              </a>
            )}
            {settings.address && (
              <p className="flex items-start gap-2">
                <FiMapPin size={14} className="mt-0.5 flex-shrink-0" /> {settings.address}
              </p>
            )}
            {!settings.contact_email && !settings.contact_phone && !settings.address && (
              <p className="text-gray-400">No contact info configured yet.</p>
            )}
          </div>
        </div>

        {/* Links + social */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Links
          </p>
          <div className="space-y-2 text-sm">
            <Link to="/services" className="block text-gray-600 hover:text-brand-600 transition-colors">
              Shipping services
            </Link>
            <Link to="/login" className="block text-gray-600 hover:text-brand-600 transition-colors">
              Sign in
            </Link>
          </div>

          {socialLinks.length > 0 && (
            <div className="flex gap-3 mt-4">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center
                             text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition-colors">
                  {s.icon}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-gray-100 py-4 text-center text-xs text-gray-400">
        {settings.footer_text}
      </div>
    </footer>
  );
}