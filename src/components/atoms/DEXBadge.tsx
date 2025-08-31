import { Badge } from "@/components/ui/badge";
import { DEX } from "@/types/pool.types";

export function DEXBadge({ name }: { name: DEX }) {
  return (
    <Badge
      variant="outline"
      className="gap-1.5 border-[hsl(var(--primary-700))]/50 justify-center min-w-[80px] text-xs font-medium"
    >
      {name}
    </Badge>
  );
}
