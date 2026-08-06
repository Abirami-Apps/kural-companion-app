import { Capacitor } from "@capacitor/core";

export const NATIVE_APP_ID = "com.abiramiaudio.kuralcompanion";
export const NATIVE_URL_SCHEME = "kuralcompanion";
export const isNativeApp = Capacitor.isNativePlatform();

const simpleRoutes = new Set([
  "/",
  "/chapters",
  "/contact",
  "/favourites",
  "/hourly",
  "/login",
  "/privacy",
  "/refunds",
  "/reset-password",
  "/subscribe",
  "/terms",
]);

const supportedPath = (pathname: string) => {
  if (simpleRoutes.has(pathname)) return true;
  const kuralMatch = pathname.match(/^\/kural\/(\d{1,4})$/);
  if (!kuralMatch) return false;
  const kuralNumber = Number(kuralMatch[1]);
  return Number.isInteger(kuralNumber) && kuralNumber >= 1 && kuralNumber <= 1330;
};

/** Convert trusted HTTPS or app-scheme links into safe in-app routes. */
export function nativeRouteFromUrl(value: string): string | null {
  try {
    const url = new URL(value);
    let pathname: string;

    if (url.protocol === "https:" && url.hostname === "kural.abirami.app") {
      pathname = url.pathname;
    } else if (url.protocol === `${NATIVE_URL_SCHEME}:`) {
      pathname = `/${url.hostname}${url.pathname}`;
    } else {
      return null;
    }

    pathname = pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
    if (!supportedPath(pathname)) return null;
    return `${pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}
