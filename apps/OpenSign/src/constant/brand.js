// White-label (ENK): brand values come from runtime config so one image serves every client.
// In containers they are injected into window.RUNTIME_ENV by entrypoint.sh;
// in local dev they come from REACT_APP_* entries in apps/OpenSign/.env.
// Every value falls back to the stock OpenSign brand.
const runtimeEnv = (typeof window !== "undefined" && window.RUNTIME_ENV) || {};

const read = (key) => runtimeEnv[key] || process.env[key] || "";

export const DEFAULT_BRAND_NAME = "OpenSign™";

export const brand = {
  name: read("REACT_APP_BRAND_NAME") || DEFAULT_BRAND_NAME,
  logoUrl: read("REACT_APP_BRAND_LOGO_URL"),
  faviconUrl: read("REACT_APP_BRAND_FAVICON_URL"),
  // Must be an absolute URL: it is embedded in outgoing emails.
  emailLogoUrl:
    read("REACT_APP_EMAIL_LOGO_URL") ||
    "https://qikinnovation.ams3.digitaloceanspaces.com/logo.png",
  supportEmail: read("REACT_APP_SUPPORT_EMAIL"),
  hideSocial: read("REACT_APP_HIDE_SOCIAL") === "true",
  // Repository serving this build's source (AGPL-3.0 section 13); used for the footer version link.
  sourceUrl:
    read("REACT_APP_SOURCE_URL") || "https://github.com/OpenSignLabs/OpenSign"
};

export const BRAND_NAME = brand.name;
export const isCustomBrand = BRAND_NAME !== DEFAULT_BRAND_NAME;

// Load the client's theme overrides last so they win over the bundled CSS.
// /brand/theme.css ships empty and is replaced from /config/brand at container start.
if (
  typeof document !== "undefined" &&
  !document.getElementById("brand-theme")
) {
  const link = document.createElement("link");
  link.id = "brand-theme";
  link.rel = "stylesheet";
  link.href = "/brand/theme.css";
  document.head.appendChild(link);
}
