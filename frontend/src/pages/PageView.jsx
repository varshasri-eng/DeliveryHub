import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import api from "../api/client";

export default function PageView() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setPage(null);
    setNotFound(false);
    api
      .get(`/pages/${slug}`)
      .then((res) => setPage(res.data.page))
      .catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Page not found</h1>
        <Link to="/" className="text-brand-600 hover:underline">Back home</Link>
      </div>
    );
  }

  if (!page) {
    return <div className="max-w-3xl mx-auto px-4 py-16 text-gray-400">Loading…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{page.title}</h1>
      <div className="prose max-w-none">
        <ReactMarkdown>{page.content || ""}</ReactMarkdown>
      </div>
    </div>
  );
}
