import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Generate an absolute canonical URL at runtime. Deployments can override the
// origin with VITE_SITE_URL; local previews safely use their current origin.
const siteOrigin = import.meta.env.VITE_SITE_URL?.trim() || window.location.origin;
const canonicalUrl = new URL(window.location.pathname, siteOrigin).href;
const canonical = document.createElement("link");
canonical.rel = "canonical";
canonical.href = canonicalUrl;
document.head.append(canonical);

const openGraphUrl = document.createElement("meta");
openGraphUrl.setAttribute("property", "og:url");
openGraphUrl.content = canonicalUrl;
document.head.append(openGraphUrl);

createRoot(document.getElementById("root")!).render(<App />);
