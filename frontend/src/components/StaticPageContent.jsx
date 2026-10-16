import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import { FiArrowRight, FiBookOpen, FiCheck, FiHelpCircle, FiInfo } from "react-icons/fi";

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
  const intro = parts.shift()?.trim() || "";
  const sections = [];
  for (let index = 0; index < parts.length; index += 2) {
    const title = parts[index]?.trim() || "";
    const body = parts[index + 1] || "";
    const cardParts = body.split(/^###\s+(.+)$/m);
    const lead = cardParts.shift()?.trim() || "";
    const cards = [];
    for (let cardIndex = 0; cardIndex < cardParts.length; cardIndex += 2) {
      cards.push({
        title: cardParts[cardIndex]?.trim() || "",
        body: cardParts[cardIndex + 1]?.trim() || "",
      });
    }
    sections.push({ title, lead, cards });
  }
  return { intro, sections };
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
        <FaqContent content={page.content} components={components} />
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
  const { intro, sections } = parsed;
  const prose = markdownComponents();
  const introMd = introComponents();
  const card = cardComponents();
  const band = bandComponents();

  return (
    <div className="space-y-12">
      {intro && (
        <div className="max-w-3xl">
          <ReactMarkdown components={introMd}>{intro}</ReactMarkdown>
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
                    className="group rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition duration-200 ease-out hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg motion-reduce:transform-none motion-reduce:transition-none"
                  >
                    <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-sm font-extrabold text-brand-700 transition-colors group-hover:bg-brand-700 group-hover:text-white">
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
              <div aria-hidden="true" className="absolute -bottom-24 right-24 h-56 w-56 rounded-full bg-brand-700/30 blur-3xl" />
              <div className="relative grid gap-8 md:grid-cols-[1.15fr_0.85fr] md:items-center">
                <div>
                  <h3 className="max-w-xl text-2xl font-extrabold tracking-tight sm:text-3xl">
                    {section.title}
                  </h3>
                  <ReactMarkdown components={band}>{section.lead}</ReactMarkdown>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row md:flex-col md:items-stretch">
                  <Link
                    to="/services"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-gray-950 transition hover:-translate-y-0.5 hover:bg-brand-50 motion-reduce:transform-none"
                  >
                    Book a shipment <FiArrowRight size={16} />
                  </Link>
                  <Link
                    to="/track"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                  >
                    Track a shipment
                  </Link>
                </div>
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

function FaqContent({ content, components }) {
  const { introduction, questions } = parseFaqSections(content);
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
      {introduction && (
        <div className="h-fit rounded-2xl border border-brand-100 bg-brand-50/70 p-6">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-700">Before you book</p>
          <div className="mt-3">
            <ReactMarkdown components={components}>{introduction}</ReactMarkdown>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {questions.length ? questions.map(({ question, answer }, index) => (
          <details key={`${question}-${index}`}
            className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg open:border-brand-200 open:shadow-md">
            <summary className="cursor-pointer list-none pr-8 font-bold text-gray-900 marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="relative block">
                {question}
                <span aria-hidden="true"
                  className="absolute right-0 top-0 text-xl leading-none text-brand-600 transition-transform group-open:rotate-45">
                  +
                </span>
              </span>
            </summary>
            {answer && (
              <div className="faq-answer-enter mt-3 border-t border-gray-100 pt-1">
                <ReactMarkdown components={components}>{answer}</ReactMarkdown>
              </div>
            )}
          </details>
        )) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500">
            Add each question as a level-three heading using <code>### Question</code> in the page editor.
          </div>
        )}
      </div>
    </div>
  );
}