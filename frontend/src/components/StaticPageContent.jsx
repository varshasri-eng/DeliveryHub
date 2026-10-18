import { useId, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import {
  FiArrowRight, FiBookOpen, FiCheck, FiHelpCircle, FiInfo, FiMinus, FiPlus,
} from "react-icons/fi";

const PAGE_TYPES = {
  standard: { label: "Information", icon: FiInfo },
  about: { label: "About DeliveryHub", icon: FiBookOpen },
  faq: { label: "Help center", icon: FiHelpCircle },
};

const linkClass =
  "font-medium text-brand-700 underline underline-offset-2 hover:text-brand-900";

function markdownComponents() {
  return {
    a: ({ href, children }) => (
      <a href={href} className={linkClass}>
        {children}
      </a>
    ),
    h2: ({ children }) => (
      <h2 className="mt-9 border-b border-gray-100 pb-2 text-xl font-bold text-gray-900 first:mt-0">
        {children}
      </h2>
    ),
    h3: ({ children }) => <h3 className="mt-6 text-lg font-semibold text-gray-900">{children}</h3>,
    p: ({ children }) => <p className="my-4 leading-7 text-gray-600">{children}</p>,
    ul: ({ children }) => <ul className="my-4 list-disc space-y-2 pl-6 text-gray-600">{children}</ul>,
    ol: ({ children }) => <ol className="my-4 list-decimal space-y-2 pl-6 text-gray-600">{children}</ol>,
    blockquote: ({ children }) => (
      <blockquote className="my-5 border-l-4 border-brand-300 pl-4 italic text-gray-600">
        {children}
      </blockquote>
    ),
  };
}

// Larger intro paragraph at the top of an About page.
function introComponents() {
  return {
    ...markdownComponents(),
    p: ({ children }) => <p className="my-3 text-lg leading-8 text-gray-600">{children}</p>,
  };
}

// Text inside one "why choose us" card.
function cardComponents() {
  return {
    ...markdownComponents(),
    p: ({ children }) => <p className="my-0 text-sm leading-6 text-gray-600">{children}</p>,
  };
}

// Text inside the dark commitment band: paragraphs plus a tick list.
function bandComponents() {
  return {
    a: ({ href, children }) => (
      <a href={href} className="font-semibold text-emerald-200 underline underline-offset-2 hover:text-white">
        {children}
      </a>
    ),
    p: ({ children }) => <p className="my-3 leading-7 text-white/75">{children}</p>,
    ul: ({ children }) => <ul className="my-5 space-y-3">{children}</ul>,
    li: ({ children }) => (
      <li className="relative pl-8 font-semibold text-white">
        <span
          aria-hidden="true"
          className="absolute left-0 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-300/20 text-emerald-200"
        >
          <FiCheck size={12} />
        </span>
        {children}
      </li>
    ),
  };
}

// Admins add a picture with a Markdown image on its own line, e.g.
//   ![Courier with a parcel](/images/about.jpg)     (file in frontend/public/images)
//   ![Courier with a parcel](https://example.com/photo.jpg)
// The first image in a block is lifted out of the text and shown beside it.
const IMAGE_LINE = /^[ \t]*!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)[ \t]*$/m;

export function takeImage(text) {
  const source = String(text || "");
  const match = source.match(IMAGE_LINE);
  if (!match) return { text: source.trim(), image: null };
  const src = match[2];
  const safe = /^(https?:\/\/|\/(?!\/))/i.test(src);
  return {
    text: source.replace(match[0], "").replace(/\n{3,}/g, "\n\n").trim(),
    image: safe ? { alt: match[1], src } : null,
  };
}

// Built-in illustration, shown whenever a page has no picture (or it fails to load).
function PageArt() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-gray-950 via-brand-800 to-brand-600">
      <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full border border-white/10" />
      <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl" />
      <svg viewBox="0 0 400 320" role="img" aria-label="Illustration of a parcel travelling between the United States and India"
        className="absolute inset-0 h-full w-full">
        <path d="M70 215 C130 90 270 70 336 160" fill="none" stroke="#bbf7d0" strokeWidth="3" strokeLinecap="round" strokeDasharray="8 12" />
        <circle cx="70" cy="215" r="9" fill="#bbf7d0" />
        <circle cx="336" cy="160" r="9" fill="#fde68a" />
        <g transform="translate(146 118) scale(0.95)">
          <path d="M54 4 101 28 54 52 7 28 54 4Z" fill="#f8d98b" />
          <path d="M7 28v54l47 26V52L7 28Z" fill="#e5a64f" />
          <path d="M101 28v54L54 108V52l47-24Z" fill="#f2bf69" />
          <path d="m34 18 47 25M54 52v56" fill="none" stroke="#9a672d" strokeOpacity=".56" strokeWidth="3" />
        </g>
        <g fill="white" fontFamily="Inter, sans-serif" fontSize="12" fontWeight="700">
          <text x="40" y="250">UNITED STATES</text>
          <text x="300" y="196">INDIA</text>
        </g>
      </svg>
    </div>
  );
}

function PageImage({ image, badge, className = "" }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`relative ${className}`}>
      <div className="relative aspect-[5/4] overflow-hidden rounded-3xl bg-gray-100 shadow-xl shadow-gray-900/10">
        {image && !failed ? (
          <img
            src={image.src}
            alt={image.alt || ""}
            loading="lazy"
            onError={() => setFailed(true)}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out hover:scale-105 motion-reduce:transform-none"
          />
        ) : (
          <PageArt />
        )}
      </div>
      {badge && (
        <div className="absolute -bottom-4 left-5 flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-gray-900 shadow-lg">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <FiCheck size={12} />
          </span>
          {badge}
        </div>
      )}
    </div>
  );
}

function parseFaqSections(content) {
  const parts = String(content || "").split(/^###\s+(.+)$/m);
  const introduction = parts.shift()?.trim() || "";
  const questions = [];
  for (let index = 0; index < parts.length; index += 2) {
    questions.push({
      question: parts[index]?.trim() || "",
      answer: parts[index + 1]?.trim() || "",
    });
  }
  return { introduction, questions };
}

// About pages are plain Markdown so admins can keep editing them:
//   intro text
//   ## Section title            -> followed by "### Card title" blocks = card grid
//   ## Section title            -> followed by a "- " list            = commitment band
// A "## " section with neither is shown as an ordinary text block.
export function parseAboutContent(content) {
  const text = String(content || "").replace(/\r\n/g, "\n");
  const parts = text.split(/^##\s+(.+)$/m);
  const introPart = takeImage(parts.shift() || "");
  const intro = introPart.text;
  const sections = [];
  for (let index = 0; index < parts.length; index += 2) {
    const title = parts[index]?.trim() || "";
    const sectionPart = takeImage(parts[index + 1] || "");
    const body = sectionPart.text;
    const cardParts = body.split(/^###\s+(.+)$/m);
    const lead = cardParts.shift()?.trim() || "";
    const cards = [];
    for (let cardIndex = 0; cardIndex < cardParts.length; cardIndex += 2) {
      cards.push({
        title: cardParts[cardIndex]?.trim() || "",
        body: cardParts[cardIndex + 1]?.trim() || "",
      });
    }
    sections.push({ title, lead, cards, image: sectionPart.image });
  }
  return { intro, introImage: introPart.image, sections };
}

export default function StaticPageContent({ page, embedded = false }) {
  const pageType = PAGE_TYPES[page.page_type] ? page.page_type : "standard";
  const { label, icon: PageIcon } = PAGE_TYPES[pageType];
  const components = markdownComponents();
  const aboutLayout = pageType === "about" ? parseAboutContent(page.content) : null;
  const useAboutLayout = Boolean(aboutLayout && aboutLayout.sections.length > 0);

  if (embedded) {
    return (
      <section
        id={pageType === "about" ? "about-us" : pageType === "faq" ? "faqs" : undefined}
        className={`scroll-mt-24 py-16 sm:py-20 ${pageType === "faq" ? "bg-[#f6f8f7]" : ""}`}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <header className="mb-7 max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-brand-700 shadow-sm">
              <PageIcon size={14} /> {label}
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-950 sm:text-4xl">
              {page.title}
            </h2>
          </header>
          {pageType === "faq" ? (
            <FaqContent content={page.content} components={components} />
          ) : useAboutLayout ? (
            <AboutContent parsed={aboutLayout} />
          ) : (
            <ProseCard content={page.content} components={components} />
          )}
        </div>
      </section>
    );
  }

  return (
    <article className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-gray-950 via-brand-900 to-brand-700 px-6 py-10 text-white shadow-2xl shadow-brand-900/15 sm:px-10 sm:py-14">
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full border-[32px] border-white/[0.06]" />
        <div className="absolute -bottom-28 right-32 h-56 w-56 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="relative max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white/90">
            <PageIcon size={14} /> {label}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">{page.title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
            {pageType === "faq"
              ? "Helpful answers about booking and managing your international shipment."
              : pageType === "about"
                ? "Learn about DeliveryHub and how our U.S.–India shipping services work."
                : "Information from DeliveryHub to help you plan your shipment."}
          </p>
        </div>
      </header>

      {pageType === "faq" ? (
        <div className="mt-8">
          <FaqContent content={page.content} components={components} />
        </div>
      ) : useAboutLayout ? (
        <div className="mt-8">
          <AboutContent parsed={aboutLayout} />
        </div>
      ) : (
        <ProseCard content={page.content} components={components} className="mt-8" />
      )}
    </article>
  );
}

function ProseCard({ content, components, className = "" }) {
  return (
    <div className={`rounded-2xl border border-gray-100 bg-white px-6 py-7 shadow-sm sm:px-10 sm:py-9 ${className}`}>
      <div className="static-page-prose max-w-3xl">
        <ReactMarkdown components={components}>{content || ""}</ReactMarkdown>
      </div>
    </div>
  );
}

function AboutContent({ parsed }) {
  const { intro, introImage, sections } = parsed;
  const prose = markdownComponents();
  const introMd = introComponents();
  const card = cardComponents();
  const band = bandComponents();

  return (
    <div className="space-y-16">
      {intro && (
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="max-w-2xl">
            <ReactMarkdown components={introMd}>{intro}</ReactMarkdown>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/services"
                className="inline-flex items-center gap-2 rounded-full bg-gray-950 px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-brand-800 motion-reduce:transform-none"
              >
                Explore services <FiArrowRight size={16} />
              </Link>
              <Link
                to="/track"
                className="inline-flex items-center rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-bold text-gray-800 transition hover:bg-gray-100"
              >
                Track a shipment
              </Link>
            </div>
          </div>
          <PageImage image={introImage} badge="United States ↔ India" />
        </div>
      )}

      {sections.map((section, index) => {
        const key = `${section.title}-${index}`;
        const hasCards = section.cards.length > 0;
        const hasList = /^\s*[-*+]\s+/m.test(section.lead);

        if (hasCards) {
          return (
            <div key={key}>
              <div className="max-w-2xl">
                <h3 className="text-2xl font-extrabold tracking-tight text-gray-950 sm:text-3xl">
                  {section.title}
                </h3>
                {section.lead && (
                  <div className="mt-3">
                    <ReactMarkdown components={introMd}>{section.lead}</ReactMarkdown>
                  </div>
                )}
              </div>
              <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {section.cards.map((item, cardIndex) => (
                  <article
                    key={`${item.title}-${cardIndex}`}
                    className="group rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition duration-300 ease-out hover:-translate-y-1 hover:border-gray-200 hover:bg-gray-100 hover:shadow-lg motion-reduce:transform-none motion-reduce:transition-none"
                  >
                    <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-sm font-extrabold text-brand-700 transition-colors group-hover:bg-white">
                      {String(cardIndex + 1).padStart(2, "0")}
                    </span>
                    <h4 className="text-lg font-bold text-gray-950">{item.title}</h4>
                    <div className="mt-2">
                      <ReactMarkdown components={card}>{item.body}</ReactMarkdown>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          );
        }

        if (hasList) {
          return (
            <div
              key={key}
              className="relative overflow-hidden rounded-[2rem] bg-gray-950 px-6 py-9 text-white shadow-xl shadow-gray-900/10 sm:px-10 sm:py-12"
            >
              <div aria-hidden="true" className="absolute -right-16 -top-24 h-64 w-64 rounded-full border-[32px] border-white/[0.05]" />
              <div aria-hidden="true" className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-brand-700/30 blur-3xl" />
              <div className="relative grid gap-10 md:grid-cols-2 md:items-center">
                <div>
                  <h3 className="max-w-xl text-2xl font-extrabold tracking-tight sm:text-3xl">
                    {section.title}
                  </h3>
                  <ReactMarkdown components={band}>{section.lead}</ReactMarkdown>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      to="/services"
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-gray-950 transition hover:-translate-y-0.5 hover:bg-gray-200 motion-reduce:transform-none"
                    >
                      Book a shipment <FiArrowRight size={16} />
                    </Link>
                    <Link
                      to="/track"
                      className="inline-flex items-center justify-center rounded-full border border-white/25 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                    >
                      Track a shipment
                    </Link>
                  </div>
                </div>
                <PageImage image={section.image} badge="Reference number on every booking" className="mb-4 md:mb-0" />
              </div>
            </div>
          );
        }

        return (
          <div key={key} className="rounded-2xl border border-gray-100 bg-white px-6 py-7 shadow-sm sm:px-10 sm:py-9">
            <div className="static-page-prose max-w-3xl">
              <h3 className="text-2xl font-bold text-gray-950">{section.title}</h3>
              <ReactMarkdown components={prose}>{section.lead}</ReactMarkdown>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FaqItem({ question, answer, open, onToggle, components }) {
  const id = useId();
  const buttonId = `${id}-button`;
  const panelId = `${id}-panel`;
  return (
    <div
      className={`rounded-2xl border transition-colors duration-200 ${
        open ? "border-gray-200 bg-gray-100" : "border-gray-100 bg-white hover:bg-gray-100"
      }`}
    >
      <h3>
        <button
          type="button"
          id={buttonId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full items-start justify-between gap-4 rounded-2xl px-5 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <span className={`font-bold leading-6 transition-colors ${open ? "text-brand-700" : "text-gray-900"}`}>
            {question}
          </span>
          <span aria-hidden="true" className="mt-0.5 flex-shrink-0 text-brand-700">
            {open ? <FiMinus size={20} /> : <FiPlus size={20} />}
          </span>
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className={`grid transition-[grid-template-rows,visibility] duration-300 ease-out motion-reduce:transition-none ${
          open ? "visible grid-rows-[1fr]" : "invisible grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5">
            {answer ? (
              <ReactMarkdown components={components}>{answer}</ReactMarkdown>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function FaqContent({ content, components }) {
  const parsed = parseFaqSections(content);
  const { text: introduction, image } = takeImage(parsed.introduction);
  const { questions } = parsed;
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr]">
      <div>
        {introduction && (
          <div className="mb-5 max-w-2xl">
            <ReactMarkdown components={components}>{introduction}</ReactMarkdown>
          </div>
        )}
        <div className="space-y-3">
          {questions.length ? questions.map(({ question, answer }, index) => (
            <FaqItem
              key={`${question}-${index}`}
              question={question}
              answer={answer}
              components={components}
              open={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? -1 : index)}
            />
          )) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500">
              Add each question as a level-three heading using <code>### Question</code> in the page editor.
            </div>
          )}
        </div>
      </div>
      <PageImage image={image} className="lg:sticky lg:top-28" />
    </div>
  );
}