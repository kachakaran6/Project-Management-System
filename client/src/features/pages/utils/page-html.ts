const ALLOWED_LINK_PROTOCOLS = ["http:", "https:", "mailto:", "tel:"];
const ALLOWED_TAGS = new Set([
  "P",
  "BR",
  "STRONG",
  "EM",
  "U",
  "A",
  "H1",
  "H2",
  "H3",
  "UL",
  "OL",
  "LI",
  "BLOCKQUOTE",
  "CODE",
  "PRE",
  "HR",
  "S",
  "MARK",
  "DIV",
  "SPAN",
  "LABEL",
  "INPUT",
]);

function sanitizeUrl(url: string): string {
  const normalizedUrl = url.trim();
  if (!normalizedUrl) return "";

  try {
    const parsed = new URL(normalizedUrl, "https://example.com");
    if (!ALLOWED_LINK_PROTOCOLS.includes(parsed.protocol)) return "";
    return parsed.protocol === "https:" && parsed.hostname === "example.com"
      ? normalizedUrl.startsWith("/")
        ? normalizedUrl
        : ""
      : normalizedUrl;
  } catch {
    return "";
  }
}

export function sanitizePageHtml(rawHtml: string): string {
  if (typeof window === "undefined") return rawHtml;
  if (!rawHtml.trim()) return "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, "text/html");

  const sanitizeNode = (node: Node): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent || "");
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const element = node as HTMLElement;
    const tag = element.tagName.toUpperCase();
    const fragment = document.createDocumentFragment();

    for (const child of Array.from(element.childNodes)) {
      const sanitizedChild = sanitizeNode(child);
      if (sanitizedChild) {
        fragment.appendChild(sanitizedChild);
      }
    }

    if (!ALLOWED_TAGS.has(tag)) {
      return fragment;
    }

    const cleanElement = document.createElement(tag.toLowerCase());

    if (tag === "A") {
      const href = sanitizeUrl(element.getAttribute("href") || "");
      if (!href) {
        return fragment;
      }

      cleanElement.setAttribute("href", href);
      cleanElement.setAttribute("target", "_blank");
      cleanElement.setAttribute("rel", "noopener noreferrer nofollow");
    }

    if ((tag === "UL" || tag === "LI" || tag === "DIV") && element.dataset.type) {
      cleanElement.setAttribute("data-type", element.dataset.type);
    }

    if (tag === "INPUT") {
      if ((element.getAttribute("type") || "").toLowerCase() !== "checkbox") {
        return null;
      }

      cleanElement.setAttribute("type", "checkbox");
      cleanElement.setAttribute("disabled", "true");

      if ((element as HTMLInputElement).checked || element.hasAttribute("checked")) {
        cleanElement.setAttribute("checked", "true");
      }

      return cleanElement;
    }

    cleanElement.appendChild(fragment);
    return cleanElement;
  };

  const output = document.createElement("div");
  for (const child of Array.from(doc.body.childNodes)) {
    const sanitizedChild = sanitizeNode(child);
    if (sanitizedChild) {
      output.appendChild(sanitizedChild);
    }
  }

  return output.innerHTML;
}

export function sanitizePageHtmlForDisplay(value: string): string {
  if (!value.trim()) return "";
  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(value);
  const html = hasHtml ? value : `<p>${value.replace(/\n/g, "<br />")}</p>`;
  return sanitizePageHtml(html);
}
