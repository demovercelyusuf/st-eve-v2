import { cn } from "@/lib/utils";

// The name, set once.
//
// It appeared in five places with five slightly different treatments, which is how a wordmark stops
// being a wordmark. Caps, tight tracking, and the display face reserved for exactly this.
//
// The status dot is part of it rather than a sibling, because every one of those five places had
// been pairing the two by hand and getting the gap subtly different each time.
export function Wordmark({
  className,
  showDot = true,
  size = "md",
}: {
  className?: string;
  showDot?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const text = {
    sm: "text-sm tracking-[0.14em]",
    md: "text-base tracking-[0.16em]",
    lg: "text-xl tracking-[0.18em]",
    xl: "text-5xl tracking-[0.12em] sm:text-6xl",
  }[size];

  const dot = size === "xl" ? "size-2.5" : size === "lg" ? "size-2" : "size-1.5";

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {showDot ? (
        <span aria-hidden className={cn("inline-block shrink-0 rounded-full bg-emerald-500", dot)} />
      ) : null}
      <span className={cn("font-display font-bold uppercase leading-none", text)}>Steve</span>
    </span>
  );
}
