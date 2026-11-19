// Sets the browser tab title and the description search engines show for the current page.
// Call it at the top of a page component: usePageMeta("Title | DeliveryHub", "One or two sentences.")
import { useEffect } from "react";

const SITE = "https://deliveryhubca.com";

function setMeta(attr, key, value) {
  if (!value) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

export default function usePageMeta(title, description) {
  useEffect(() => {
    if (title) document.title = title;
    setMeta("name", "description", description);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);

    // canonical address = this page on the main domain, without query strings
    const href = SITE + window.location.pathname;
    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", href);
    setMeta("property", "og:url", href);
  }, [title, description]);
}
