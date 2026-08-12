import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { componentTagger } from "lovable-tagger";
import { fileURLToPath } from "node:url";
import { VitePWA } from "vite-plugin-pwa";

const nativeBuild = process.env.VITE_NATIVE_BUILD === "true";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    !nativeBuild && VitePWA({
      registerType: "autoUpdate",
      injectRegister: "script-defer",
      includeAssets: [
        "favicon.svg",
        "logo.png",
        "apple-touch-icon.png",
        "fonts/*.woff2",
      ],
      manifest: {
        id: "/",
        name: "Kural Companion – திருக்குறள்",
        short_name: "Kural Companion",
        description:
          "Read and listen to all 1,330 Tirukkural verses, browse chapters, save favourites and schedule Hourly Kural.",
        lang: "ta",
        dir: "ltr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "any",
        background_color: "#efe6d8",
        theme_color: "#1e2340",
        categories: ["education", "books", "music"],
        icons: [
          {
            src: "/pwa-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          {
            name: "Open Kural player",
            short_name: "Player",
            url: "/",
            icons: [{ src: "/pwa-192.png", sizes: "192x192" }],
          },
          {
            name: "Browse chapters",
            short_name: "Chapters",
            url: "/chapters",
            icons: [{ src: "/pwa-192.png", sizes: "192x192" }],
          },
          {
            name: "Hourly Kural",
            short_name: "Hourly",
            url: "/hourly",
            icons: [{ src: "/pwa-192.png", sizes: "192x192" }],
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2,json}"],
        // Social previews are not needed for the installed offline reader.
        globIgnores: ["og.png"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: "index.html",
        // Never turn a same-origin backend path into the offline SPA shell.
        navigateFallbackDenylist: [/^\/(?:api|auth|functions|rest)\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "kural-font-styles",
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: "CacheFirst",
            options: {
              cacheName: "kural-font-files",
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  build: {
    // The validated 1,330-entry Tamil dataset is intentionally shipped as a
    // lazy route chunk (about 132 kB gzip) so the application stays usable
    // without a separate content API.
    chunkSizeWarningLimit: 1_000,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
}));
