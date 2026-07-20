"use client";

import { useEffect, useState } from "react";
import { sourceFor } from "@/lib/citations/registry";

// The landing half of a citation.
//
// The highlight itself is CSS: every row is `target:` styled, so an SE arriving on
// /accounts/ACC-2041#GONG-902 sees the row marked with no JavaScript at all, and it stays marked on
// back and forward navigation because the hash is the state. This component exists for the two things
// CSS cannot do.
//
// First, scrolling. The timeline streams in behind Suspense, so when the browser processes the
// fragment the row does not exist yet, and browsers do not retry a fragment scroll when the element
// arrives later. The row would be highlighted somewhere below the fold with nothing to indicate it.
//
// Second, the miss. A citation can point at a record this page cannot show: a Linear id when Linear
// was unreachable, an id from another account pasted into the url, or one the model composed. Landing
// on a page that looks completely normal is the worst version of that, because the SE assumes the row
// is there and scrolls looking for it. Saying so is the whole point of an evidence surface.

export function EvidenceFocus({ linearConnected }: { readonly linearConnected: boolean }) {
  const [missing, setMissing] = useState<string | null>(null);

  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;

    // Ids are used verbatim as DOM ids, so getElementById is the lookup. querySelector would need
    // escaping for the slashes and dots that appear in some Salesforce ids.
    const row = document.getElementById(id);
    if (!row) {
      setMissing(id);
      return;
    }

    // Instant rather than smooth: the SE clicked a citation to read one specific record, and animating
    // a scroll past the whole timeline to reach it is delay dressed as polish.
    row.scrollIntoView({ behavior: "instant", block: "center" });
  }, []);

  if (!missing) return null;

  const source = sourceFor(missing);
  const reason =
    source?.kind === "linear" && !linearConnected
      ? "Linear could not be read on this request, so its issues are not on this page. Reload once the connection is back."
      : source
        ? `No ${source.kind} record with that id belongs to this account.`
        : "That is not an id Steve can cite.";

  return (
    <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
      <p className="text-amber-700 text-sm dark:text-amber-400">
        <span className="font-mono">{missing}</span> is not on this page.
      </p>
      <p className="mt-0.5 text-muted-foreground text-xs">{reason}</p>
    </div>
  );
}
