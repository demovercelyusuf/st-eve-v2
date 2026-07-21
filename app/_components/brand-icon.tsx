import { siHashicorp, siLinear, siNotion, siPostgresql, siVercel } from "simple-icons";

// Brand marks for the integration surfaces.
//
// Inline SVG rather than next/image on purpose. These are vector logos: rendering them through the
// image pipeline would mean either raster files that soften on a retina display, or enabling
// dangerouslyAllowSVG to serve them unoptimised through a loader that cannot optimise them anyway.
// Inline costs zero network requests, stays sharp at any size, and lets the mark inherit currentColor
// so a monochrome treatment works across all four skins. next/image stays where it earns its place,
// which is photographic content like the mascot.
//
// Most marks come from simple-icons, which ships the official paths. Slack and Salesforce are not in
// that set, because both companies restrict redistribution of their marks, so those two are drawn
// here from their published brand geometry.

export type BrandId =
  | "slack"
  | "salesforce"
  | "linear"
  | "notion"
  | "postgres"
  | "vault"
  | "vercel";

type Mark = { title: string; path: string; hex: string };

const SIMPLE: Partial<Record<BrandId, Mark>> = {
  linear: { title: siLinear.title, path: siLinear.path, hex: `#${siLinear.hex}` },
  notion: { title: siNotion.title, path: siNotion.path, hex: `#${siNotion.hex}` },
  postgres: { title: siPostgresql.title, path: siPostgresql.path, hex: `#${siPostgresql.hex}` },
  vault: { title: "HashiCorp Vault", path: siHashicorp.path, hex: "#FFEC6E" },
  vercel: { title: siVercel.title, path: siVercel.path, hex: `#${siVercel.hex}` },
};

// Slack's mark is four rounded bars and four squares in the four brand colours, rotationally
// symmetric. Multi-colour, so it cannot come from the single-path set above.
function SlackMark({ className, monochrome }: { className?: string; monochrome?: boolean }) {
  const fill = (brand: string) => (monochrome ? "currentColor" : brand);
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Slack</title>
      <path
        d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"
        fill={fill("#E01E5A")}
      />
      <path
        d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"
        fill={fill("#36C5F0")}
      />
      <path
        d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"
        fill={fill("#2EB67D")}
      />
      <path
        d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"
        fill={fill("#ECB22E")}
      />
    </svg>
  );
}

// Salesforce's cloud, drawn from the published mark rather than approximated, in brand blue.
function SalesforceMark({ className, monochrome }: { className?: string; monochrome?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      role="img"
      viewBox="0 0 24 17"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Salesforce</title>
      <path
        d="M9.98 1.85A4.2 4.2 0 0 1 13 .57a4.19 4.19 0 0 1 3.65 2.16 5.09 5.09 0 0 1 2.08-.44 5.19 5.19 0 0 1 0 10.38 5.1 5.1 0 0 1-1.01-.1 3.76 3.76 0 0 1-4.93 1.55 4.29 4.29 0 0 1-7.97-.2 3.94 3.94 0 0 1-.82.09A4.05 4.05 0 0 1 0 9.96a4.06 4.06 0 0 1 2.01-3.5A4.66 4.66 0 0 1 9.98 1.85Z"
        fill={monochrome ? "currentColor" : "#00A1E0"}
      />
    </svg>
  );
}

export function BrandIcon({
  brand,
  className = "size-5",
  monochrome = false,
}: {
  brand: BrandId;
  className?: string;
  /** Render in currentColor instead of the brand colour, for dense or tinted contexts. */
  monochrome?: boolean;
}) {
  if (brand === "slack") return <SlackMark className={className} monochrome={monochrome} />;
  if (brand === "salesforce") return <SalesforceMark className={className} monochrome={monochrome} />;

  const mark = SIMPLE[brand];
  if (!mark) return null;

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill={monochrome ? "currentColor" : mark.hex}
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{mark.title}</title>
      <path d={mark.path} />
    </svg>
  );
}
