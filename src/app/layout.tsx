import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { Suspense } from "react";
import { GlobalGardenChatLauncher } from "@/components/chat/GlobalGardenChatLauncher";
import AuthSessionBridge from "@/components/shared/AuthSessionBridge";
import UiThemeRuntimeProvider from "@/components/shared/UiThemeRuntimeProvider";
import {
  PRODUCT_DESCRIPTION,
  PRODUCT_NAME,
  PRODUCT_TITLE_TEMPLATE,
} from "@/lib/productIdentity";
import { UI_THEME_TOKEN_DEFAULTS } from "@/lib/uiThemeTokens";
import "./globals.css";

const latoSans = localFont({
  src: [
    {
      path: "../../public/fonts/Lato-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/Lato-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-lato-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: {
    default: PRODUCT_NAME,
    template: PRODUCT_TITLE_TEMPLATE,
  },
  description: PRODUCT_DESCRIPTION,
  applicationName: PRODUCT_NAME,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: PRODUCT_NAME,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: UI_THEME_TOKEN_DEFAULTS.lv_bg,
};

const HYDRATION_NOISE_ATTRS = [
  "bis_skin_checked",
  "data-new-gr-c-s-check-loaded",
  "data-gr-ext-installed",
  "cz-shortcut-listen",
];

const hydrationNoiseCleanupScript = `
  (function () {
    var attrs = ${JSON.stringify(HYDRATION_NOISE_ATTRS)};
    function strip() {
      for (var i = 0; i < attrs.length; i += 1) {
        var attr = attrs[i];
        var nodes = document.querySelectorAll("[" + attr + "]");
        for (var j = 0; j < nodes.length; j += 1) {
          nodes[j].removeAttribute(attr);
        }
      }
    }
    strip();
    var observer = new MutationObserver(function () {
      strip();
    });
    observer.observe(document.documentElement, {
      subtree: true,
      attributes: true,
      attributeFilter: attrs,
    });
    window.addEventListener("load", function () {
      window.setTimeout(function () {
        observer.disconnect();
      }, 5000);
    });
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${latoSans.variable} antialiased`}>
        <Script id="strip-hydration-noise" strategy="beforeInteractive">
          {hydrationNoiseCleanupScript}
        </Script>
        <AuthSessionBridge />
        <UiThemeRuntimeProvider />
        {children}
        <Suspense fallback={null}>
          <GlobalGardenChatLauncher />
        </Suspense>
      </body>
    </html>
  );
}
