import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/favicon.svg"],
      manifest: {
        name: "Registre CABA",
        short_name: "Registre CABA",
        description: "Dettes, paiements, billets et marchandise",
        start_url: "/",
        display: "standalone",
        background_color: "#F6F7FB",
        theme_color: "#4C5FD5",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
        // Le nouveau service worker prend le contrôle immédiatement à
        // chaque déploiement (n'attend pas la fermeture des onglets
        // ouverts) — combiné à registerType: "autoUpdate" ci-dessus, la
        // page se recharge automatiquement dès qu'une nouvelle version
        // est détectée, sans manipulation de l'utilisateur.
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
});
