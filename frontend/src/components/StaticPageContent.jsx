import ReactMarkdown from "react-markdown";
import { FiBookOpen, FiHelpCircle, FiInfo } from "react-icons/fi";

const PAGE_TYPES = {
  standard: { label: "Information", icon: FiInfo },
  about: { label: "About DeliveryHub", icon: FiBookOpen },
  faq: { label: "Help center", icon: FiHelpCircle },
};

function markdownComponents() {
  return {
    a: ({ href, children }) => (
      <a href={href} className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-900">
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

export default function StaticPageContent({ page, embedded = false }) {
  const pageType = PAGE_TYPES[page.page_type] ? page.page_type : "standard";
  const { label, icon: PageIcon } = PAGE_TYPES[pageType];
  const components = markdownComponents();

  if (embedded) {
    return (
      <section
        id={pageType === "about" ? "about-us" : pageType === "faq" ? "faqs" : undefined}
        className="scroll-mt-24 py-14 sm:py-16"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <header className="mb-7 max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">
              <PageIcon size={14} /> {label}
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              {page.title}
            </h2>
          </header>
          {pageType === "faq" ? (
            <FaqContent content={page.content} components={components} />
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white px-6 py-7 shadow-sm sm:px-10 sm:py-9">
              <div className="static-page-prose max-w-3xl">
                <ReactMarkdown components={components}>{page.content || ""}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <article className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 px-6 py-10 text-white shadow-lg sm:px-10 sm:py-14">
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full border-[32px] border-white/5" />
        <div className="relative max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-white/90">
            <PageIcon size={14} /> {label}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{page.title}</h1>
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
      ) : (
        <div className="mt-8 rounded-2xl border border-gray-100 bg-white px-6 py-7 shadow-sm sm:px-10 sm:py-9">
          <div className="static-page-prose max-w-3xl">
            <ReactMarkdown components={components}>{page.content || ""}</ReactMarkdown>
          </div>
        </div>
      )}
    </article>
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
            className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm open:border-brand-200">
            <summary className="cursor-pointer list-none pr-8 font-semibold text-gray-900 marker:hidden">
              <span className="relative block">
                {question}
                <span aria-hidden="true"
                  className="absolute right-0 top-0 text-xl leading-none text-brand-600 transition-transform group-open:rotate-45">
                  +
                </span>
              </span>
            </summary>
            {answer && (
              <div className="mt-3 border-t border-gray-100 pt-1">
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
