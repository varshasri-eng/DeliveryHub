import { FaWhatsapp } from "react-icons/fa";

export default function WhatsAppPlaceholder() {
  return (
    <button
      type="button"
      disabled
      aria-label="WhatsApp chat link coming soon"
      title="WhatsApp chat link coming soon"
      className="fixed bottom-5 right-5 z-[60] inline-flex cursor-not-allowed items-center gap-2
                 rounded-full bg-green-600 px-4 py-3 font-semibold text-white opacity-90 shadow-lg
                 ring-1 ring-white/70"
    >
      <FaWhatsapp size={20} aria-hidden="true" />
      <span className="text-sm">Chat link coming soon</span>
    </button>
  );
}
