import { FaWhatsapp } from "react-icons/fa";

const WHATSAPP_CHAT_URL = "https://wa.me/15107146946";

export default function WhatsAppPlaceholder() {
  return (
    <a
      href={WHATSAPP_CHAT_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      title="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-[60] inline-flex h-12 w-12 items-center justify-center
                 gap-2 rounded-full bg-green-600 p-3 font-semibold text-white shadow-lg ring-1 ring-white/70
                 transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-xl
                 focus:outline-none focus-visible:ring-4 focus-visible:ring-green-300
                 motion-reduce:transform-none motion-reduce:transition-none
                 sm:h-auto sm:w-auto sm:justify-start sm:px-4 sm:py-3"
    >
      <FaWhatsapp size={20} aria-hidden="true" />
      <span className="hidden text-sm sm:inline">Chat with us</span>
    </a>
  );
}