import { Bitter, IBM_Plex_Mono } from "next/font/google";

/*
 * Both faces load the cyrillic subset, not just latin. The UI is bilingual (en/mk) and the
 * receipt data itself is Macedonian — store names, ПРОМЕТ labels, ВО ГОТОВО. Without the
 * cyrillic subset every one of those characters falls back to an unstyled system face.
 */

/** Display: slab serif, for the page title, section numbers and the grand total. */
export const bitter = Bitter({
  variable: "--font-display",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600", "700"],
  display: "swap",
});

/** Everything else: labels, values, numeric readouts, metadata. */
export const plexMono = IBM_Plex_Mono({
  variable: "--font-mono-ui",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  display: "swap",
});

/** Applied to <body> by both the (auth) and [locale] layouts. */
export const fontVariables = `${bitter.variable} ${plexMono.variable}`;
