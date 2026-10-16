import { FaWhatsapp } from "react-icons/fa";

export default function WhatsAppPlaceholder() {
  return (
    <button
      type="button"
      disabled
      aria-label="WhatsApp chat link coming soon"
      title="WhatsApp chat link coming soon"
      className="fixed bottom-5 right-5 z-[60] inline-flex h-12 w-12 cursor-not-allowed items-center
                 justify-center gap-2 rounded-full bg-green-600 p-3 font-semibold text-white opacity-90 shadow-lg
                 sm:h-auto sm:w-auto sm:justify-start sm:px-4 sm:py-3
                 ring-1 ring-white/70"
    >
      <FaWhatsapp size={20} aria-hidden="true" />
      <span className="hidden text-sm sm:inline">Chat link coming soon</span>
    </button>
  );
}
