import { useEffect, useRef } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { Keyboard, KeyboardResize } from "@capacitor/keyboard";
import { LocalNotifications } from "@capacitor/local-notifications";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { useLocation, useNavigate } from "react-router-dom";
import { isNativeApp, nativeRouteFromUrl } from "@/lib/native";

export function NativeAppBridge() {
  const location = useLocation();
  const navigate = useNavigate();
  const locationRef = useRef(location);

  locationRef.current = location;

  useEffect(() => {
    if (!isNativeApp) return;

    document.documentElement.classList.add("native-app");
    let disposed = false;
    const handles: PluginListenerHandle[] = [];

    const openRoute = (url: string, replace = false) => {
      const route = nativeRouteFromUrl(url);
      if (route) navigate(route, { replace });
    };

    const initialize = async () => {
      await Promise.allSettled([
        SplashScreen.hide(),
        Keyboard.setResizeMode({ mode: KeyboardResize.Native }),
        StatusBar.setStyle({ style: Style.Light }),
        StatusBar.setOverlaysWebView({ overlay: false }),
        ...(Capacitor.getPlatform() === "android"
          ? [StatusBar.setBackgroundColor({ color: "#0b1020" })]
          : []),
      ]);

      const launch = await CapacitorApp.getLaunchUrl();
      if (launch?.url) openRoute(launch.url, true);

      const created = await Promise.all([
        CapacitorApp.addListener("appUrlOpen", ({ url }) => openRoute(url)),
        CapacitorApp.addListener("appStateChange", ({ isActive }) => {
          if (isActive) window.dispatchEvent(new Event("focus"));
        }),
        CapacitorApp.addListener("backButton", async ({ canGoBack }) => {
          const current = locationRef.current;
          const atHome = current.pathname === "/" && current.search === "";

          if (!atHome && canGoBack) {
            navigate(-1);
          } else if (!atHome) {
            navigate("/", { replace: true });
          } else {
            await CapacitorApp.minimizeApp();
          }
        }),
        LocalNotifications.addListener("localNotificationActionPerformed", ({ notification }) => {
          const url = notification.extra?.url;
          if (typeof url === "string") openRoute(url);
        }),
      ]);

      if (disposed) {
        await Promise.all(created.map((handle) => handle.remove()));
      } else {
        handles.push(...created);
      }
    };

    void initialize();
    return () => {
      disposed = true;
      document.documentElement.classList.remove("native-app");
      void Promise.all(handles.map((handle) => handle.remove()));
    };
  }, [navigate]);

  return null;
}
