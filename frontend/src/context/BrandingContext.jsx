import { createContext, useContext, useState, useEffect } from "react";
import { getSettings } from "../api/settings";

const BrandingContext = createContext(null);

const DEFAULTS = {
  site_name: "DeliveryHub",
  tagline: "International shipping between the U.S. and India",
  logo_url: null,
  favicon_url: null,
  primary_color: "#4fa372",
  secondary_color: "#2e3b33",
  accent_color: "#7dd8a6",
  hero_title: "Send your shipment with confidence.",
  hero_subtitle: "Choose a shipping service and delivery option for shipments between the U.S. and India.",
  hero_cta: "Explore shipping services",
  hero_banner_url: null,
  contact_email: null,
  contact_phone: null,
  address: null,
  footer_text: "© DeliveryHub. International shipping made straightforward.",
  facebook_url: null,
  instagram_url: null,
  twitter_url: null,
  whatsapp_community_url: null,
};

const HEX_RE = /^#?[0-9A-Fa-f]{6}$/;

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const n = parseInt(clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// Anchored at 500 = the exact color the admin picked. Every other
// step is derived from it by adjusting lightness/saturation while
// keeping the same hue — mirrors the scale computed for the CSS
// defaults in index.css, so an admin's custom color and the
// build-time fallback both look/behave consistently.
const SCALE_FACTORS = {
  50:  { l: 0.97, sMul: 0.72 },
  100: { l: 0.92, sMul: 0.80 },
  200: { l: 0.84, sMul: 0.86 },
  300: { l: 0.74, sMul: 0.92 },
  400: { l: 0.61, sMul: 0.96 },
  600: { lMul: 0.84, sMul: 1.05 },
  700: { lMul: 0.67, sMul: 1.08 },
  800: { lMul: 0.52, sMul: 1.10 },
  900: { lMul: 0.38, sMul: 1.12 },
};

function generateBrandScale(hex) {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const scale = { 500: [r, g, b] };
  Object.entries(SCALE_FACTORS).forEach(([step, factor]) => {
    const targetL = factor.l !== undefined ? factor.l : l * factor.lMul;
    const targetS = Math.min(s * factor.sMul, 1);
    scale[step] = hslToRgb(h, targetS, targetL);
  });
  return scale;
}

export function BrandingProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getSettings()
      .then((r) => { setSettings({ ...DEFAULTS, ...r.data }); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  // Push the admin's colors into CSS. primary_color drives the full
  // brand-50..900 Tailwind scale (see tailwind.config.js) that nearly
  // every branded element in the app reads from — not just the couple
  // of spots using var(--color-primary) directly.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--color-primary", settings.primary_color);
    root.style.setProperty("--color-secondary", settings.secondary_color);
    root.style.setProperty("--color-accent", settings.accent_color);

    if (HEX_RE.test(settings.primary_color || "")) {
      try {
        const scale = generateBrandScale(settings.primary_color);
        Object.entries(scale).forEach(([step, [r, g, b]]) => {
          root.style.setProperty(`--brand-${step}`, `${r} ${g} ${b}`);
        });
      } catch {
        // Malformed color somehow slipped past the regex — leave the
        // CSS defaults from index.css in place rather than breaking
        // styling site-wide over one bad value.
      }
    }
    // If primary_color isn't a valid 6-digit hex (e.g. admin cleared
    // the field, or typed something invalid), the --brand-* variables
    // are simply left as whatever they already were — falls back to
    // index.css's pastel green defaults on first load.
  }, [settings.primary_color, settings.secondary_color, settings.accent_color]);

  // update favicon
  useEffect(() => {
    if (settings.favicon_url) {
      let link = document.querySelector("link[rel='icon']");
      if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
      link.href = settings.favicon_url;
    }
  }, [settings.favicon_url]);

  return (
    <BrandingContext.Provider value={{ settings, loaded, setSettings }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext) || { settings: DEFAULTS, loaded: true, setSettings: () => {} };
}