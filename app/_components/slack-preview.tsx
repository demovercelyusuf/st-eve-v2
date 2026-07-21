import { BrandIcon } from "./brand-icon";

// A brief as it lands in the account channel.
//
// Static markup, not a render of a real brief, and it does not read anything: the landing page is
// prerendered whole and ships no client bundle, and putting a data read behind this would trade that
// for a screenshot. The content is copied from a real Northwind run rather than invented, so the
// citation ids are ones that actually resolve, and the grounding footer is the real one.
//
// It exists because "every claim carries the record that backs it" is a sentence, and this is the
// thing the sentence describes. A reviewer who reads the headline and then sees chips under a claim
// has already understood the product before clicking anything.
export function SlackPreview() {
  return (
    <div
      aria-label="Example brief, as it appears in Slack"
      className="w-full max-w-md rounded-xl border border-border bg-card p-4 text-left shadow-sm"
      // Decorative in the accessibility tree: the real product is one click away, and a screen
      // reader gains nothing from a facsimile of it.
      role="img"
    >
      <div className="flex items-center gap-2">
        <span className="grid size-6 shrink-0 place-items-center rounded bg-foreground/5">
          <BrandIcon brand="slack" className="size-3.5" />
        </span>
        <span className="font-semibold text-sm">Steve</span>
        <span className="rounded bg-secondary px-1 py-px font-medium text-[9px] text-secondary-foreground uppercase tracking-wide">
          App
        </span>
        <span className="text-[11px] text-muted-foreground">9:14</span>
        <span className="ml-auto text-[11px] text-muted-foreground">#acct-northwind</span>
      </div>

      <p className="mt-2.5 font-medium text-sm">Northwind Trading Co.</p>

      <p className="mt-1.5 text-muted-foreground text-sm leading-relaxed">
        Two of six phase 2 exit criteria are still failing, and the champion has gone quiet for a
        month.
      </p>

      <div className="mt-2 flex flex-wrap gap-1">
        {["GONG-902", "LIN-DEM-8", "LIN-DEM-10"].map((id) => (
          <span
            className="rounded border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
            key={id}
          >
            {id}
          </span>
        ))}
      </div>

      <p className="mt-3 border-border border-t pt-2.5 text-[11px] text-muted-foreground">
        18 claims, every one cited to 12 records, nothing withheld.
      </p>
    </div>
  );
}

// The sources, as marks rather than a sentence. Monochrome on purpose: five brand palettes competing
// under a headline is noise, and the point here is the breadth of the set rather than which logo is
// which.
export function SourceMarks() {
  return (
    <div className="flex items-center gap-4 opacity-45">
      {(["postgres", "salesforce", "linear", "slack", "notion"] as const).map((brand) => (
        <BrandIcon brand={brand} className="size-5" key={brand} monochrome />
      ))}
    </div>
  );
}
