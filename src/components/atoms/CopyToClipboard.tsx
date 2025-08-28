import { Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function CopyToClipboard({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <button
      aria-label="Copy to clipboard"
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md border border-[hsl(var(--primary-700))] text-[hsl(var(--primary-700))] transition-colors hover:bg-[hsl(var(--primary))]",
        className,
      )}
      onClick={() => {
        navigator.clipboard
          .writeText(value)
          .then(() => toast.success("Copied"));
      }}
    >
      <Copy className="h-4 w-4" />
    </button>
  );
}
