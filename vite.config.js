import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",

      includeAssets: ["icons/*.png", "favicon.ico"],

      manifest: {
        name: "SAO Transport",
        short_name: "SAO Transport",
        description:
          "Transport Management System for tractor and fleet business",

        theme_color: "#1b4b73",
        background_color: "#f3efe6",

        display: "standalone",
        orientation: "portrait",

        scope: "/",
        start_url: "/",

        categories: ["business", "productivity", "transport"],

        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },

      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],

        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",

            options: {
              cacheName: "google-fonts-cache",

              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },

          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",

            options: {
              cacheName: "google-fonts-files",

              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },

          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/i,
            handler: "NetworkFirst",

            options: {
              cacheName: "weather-cache",

              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60,
              },
            },
          },
        ],
      },

      // Enable PWA during development
      devOptions: {
        enabled: true,
      },
    }),
  ],

  build: {
    target: "baseline-widely-available",
    sourcemap: false,
    chunkSizeWarningLimit: 1000,

    rolldownOptions: {
      checks: {
        pluginTimings: false,
      },

      output: {
        codeSplitting: {
          groups: [
            {
              name: "react-vendor",
              test: /node_modules\/(react|react-dom|scheduler)/,
            },
            {
              name: "lucide-vendor",
              test: /node_modules\/lucide-react/,
            },
          ],
        },
      },
    },
  },

  server: {
    port: 5173,
    open: true,
    host: true,

    https: {
      cert: fs.readFileSync("./certs/localhost.pem"),
      key: fs.readFileSync("./certs/localhost-key.pem"),
    },
  },

  preview: {
    port: 4173,
    open: true,
  },
});