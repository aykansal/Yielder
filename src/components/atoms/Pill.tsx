import { cn } from "@/lib/utils";

export function Pill({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "primary" | "success";
  className?: string;
}) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium";
  const styles =
    tone === "primary"
      ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-700))]"
      : tone === "success"
        ? "bg-green-50 text-green-700 border border-green-200"
        : "bg-secondary text-foreground";
  return <span className={cn(base, styles, className)}>{children}</span>;
}
