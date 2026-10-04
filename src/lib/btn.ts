import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost" | "onNavy" | "lav";
type Size = "sm" | "md" | "lg";

/** Hap biçimli buton sınıfları (Link ve button için ortak). */
export function btn(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
    {
      primary: "bg-primary text-primary-foreground hover:bg-primary/90",
      outline: "border bg-card text-foreground hover:bg-muted",
      ghost: "text-foreground hover:bg-muted",
      onNavy: "border border-navy-line text-on-navy hover:bg-navy-2",
      lav: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    }[variant],
    { sm: "h-8 px-3.5 text-xs", md: "h-10 px-5 text-sm", lg: "h-12 px-6 text-[15px]" }[size],
    className,
  );
}

export const inputClass =
  "h-11 w-full rounded-2xl border border-input bg-card px-4 text-sm outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/20";
