import { Capacitor } from "@capacitor/core";

const API_BASE_URL = (() => {
  const configuredUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (!configuredUrl) return "";

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(configuredUrl);
  } catch {
    throw new Error("VITE_API_BASE_URL must be an absolute HTTP(S) origin.");
  }

  if (
    !["http:", "https:"].includes(parsedUrl.protocol) ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.pathname !== "/" ||
    parsedUrl.search ||
    parsedUrl.hash
  ) {
    throw new Error("VITE_API_BASE_URL must be an HTTP(S) origin without credentials, path, query, or fragment.");
  }

  if (import.meta.env.PROD && Capacitor.isNativePlatform() && parsedUrl.protocol !== "https:") {
    throw new Error("VITE_API_BASE_URL must use HTTPS in production Android builds.");
  }

  return parsedUrl.origin;
})();

export function getApiUrl(path: `/api/${string}`): string {
  if (Capacitor.isNativePlatform() && !API_BASE_URL) {
    throw new Error("Set VITE_API_BASE_URL to the hosted FacheeBook server before building the Android app.");
  }

  return `${API_BASE_URL}${path}`;
}
