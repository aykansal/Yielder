import { Skeleton } from "@/components/ui/skeleton";

// Simple skeleton for loading values only
export function ValueSkeleton({ className = "h-4 w-16" }: { className?: string }) {
  return <Skeleton className={className} />;
}

// Helper function to clamp decimals for numeric inputs
export function clampDecimals(value: string, decimals: number) {
  if (!value) return value;
  const [i, f] = value.split(".");
  if (!f) return i;
  return `${i}.${f.slice(0, Math.min(decimals, 18))}`;
}

// Helper function to sanitize numeric input
export function sanitizeNumericInput(v: string) {
  return v.replace(/[^0-9.]/g, "").replace(/(\.)(?=.*\1)/g, "");
}
