"use client";

import { useEffect } from "react";
import { getCatalogItems } from "@/lib/appConfig";
import {
  UI_THEME_TOKEN_CATALOG_KEY,
  resolveUiThemeCssVars,
} from "@/lib/uiThemeTokens";

export default function UiThemeRuntimeProvider() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const items = await getCatalogItems(UI_THEME_TOKEN_CATALOG_KEY);
      if (cancelled || !items.length) return;

      const vars = resolveUiThemeCssVars(items);
      const root = document.documentElement;

      Object.entries(vars).forEach(([cssVar, value]) => {
        root.style.setProperty(cssVar, value);
      });

      const themeColor = vars["--lv-bg"]?.trim();
      if (themeColor) {
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta instanceof HTMLMetaElement) {
          meta.content = themeColor;
        }
      }
    })().catch(() => {
      // no-op: fallback stays in globals.css defaults
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
