// The one place that knows what skins exist. The token values themselves live in globals.css under
// [data-theme="..."]; this file carries only what the picker needs to draw itself.
//
// Theme is stored in localStorage and applied by a blocking inline script before first paint, not
// read from a cookie on the server. That is a deliberate difference: this app runs with Cache
// Components, and reading cookies() in the shell would opt every page out of prerendering to pick a
// colour. The static shell is worth more than the server round trip saves.

export const THEME_STORAGE_KEY = "steve-theme";

export type ThemeId = "mono" | "dark" | "warm" | "expressive";

export type Theme = {
  id: ThemeId;
  label: string;
  blurb: string;
  /** The dot in the switcher: each skin's signature colour. */
  swatch: string;
};

export const THEMES: readonly Theme[] = [
  { id: "mono", label: "Vercel mono", blurb: "black and white, Geist", swatch: "#0a0a0a" },
  { id: "dark", label: "Dark ops", blurb: "near-black, electric violet", swatch: "#b7a6ff" },
  { id: "warm", label: "Warm and human", blurb: "cream, terracotta", swatch: "#c05c36" },
  { id: "expressive", label: "Expressive", blurb: "electric violet, high contrast", swatch: "#5b2cff" },
] as const;

// mono first. Leading with the Vercel-native look is the right first impression for this audience.
export const DEFAULT_THEME: ThemeId = "mono";

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return Boolean(value) && THEMES.some((t) => t.id === value);
}

// Runs before first paint, inlined into the document head. Kept deliberately tiny and dependency
// free: it is render-blocking by design, because the alternative is a flash of the wrong skin.
// Wrapped in try/catch because localStorage throws in some privacy modes and a theme is never worth
// a blank page.
export const THEME_INIT_SCRIPT = `
try {
  var t = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
  var ok = ${JSON.stringify(THEMES.map((t) => t.id))};
  document.documentElement.dataset.theme = ok.indexOf(t) > -1 ? t : ${JSON.stringify(DEFAULT_THEME)};
} catch (e) {
  document.documentElement.dataset.theme = ${JSON.stringify(DEFAULT_THEME)};
}
`.trim();
