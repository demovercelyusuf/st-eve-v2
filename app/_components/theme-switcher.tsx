"use client";

import { useEffect, useState } from "react";
import { DEFAULT_THEME, isThemeId, THEME_STORAGE_KEY, THEMES, type ThemeId } from "@/lib/themes";

// Four swatches in a row rather than a dropdown. A menu would need a focus trap, a roving tabindex
// and an escape handler to be genuinely accessible, and all of that to hide four options behind a
// click. Laid out flat they are one tab stop each, obvious, and there is nothing to get wrong.
//
// Rendered with aria-pressed rather than as a radiogroup because switching a skin acts immediately;
// it is a toggle you can see the result of, not a form value awaiting submission.
export function ThemeSwitcher() {
  // Starts undefined so the first client render matches the server HTML, which knows no theme. The
  // inline script in the head has already painted the right skin by now, so this is only catching up
  // with what the document already says, and there is nothing to flash.
  const [theme, setTheme] = useState<ThemeId | undefined>(undefined);

  useEffect(() => {
    const stored = document.documentElement.dataset.theme;
    setTheme(isThemeId(stored) ? stored : DEFAULT_THEME);
  }, []);

  function choose(id: ThemeId) {
    document.documentElement.dataset.theme = id;
    setTheme(id);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {
      // Private modes can refuse storage. The skin still applies for this session, which is the part
      // that matters; only the memory of it is lost.
    }
  }

  return (
    <div aria-label="Theme" className="flex items-center gap-1" role="group">
      {THEMES.map((t) => {
        const active = theme === t.id;
        return (
          <button
            aria-label={`${t.label}: ${t.blurb}`}
            aria-pressed={active}
            className={[
              "grid size-7 place-items-center rounded-full transition-transform",
              "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
              active ? "scale-100" : "scale-90 opacity-60 hover:scale-100 hover:opacity-100",
            ].join(" ")}
            key={t.id}
            onClick={() => choose(t.id)}
            title={t.label}
            type="button"
          >
            <span
              className={[
                "block size-4 rounded-full ring-1 ring-border ring-inset",
                active ? "ring-2 ring-foreground" : "",
              ].join(" ")}
              style={{ background: t.swatch }}
            />
          </button>
        );
      })}
    </div>
  );
}
