import { Badge } from "@/components/ui/badge";

export function DEXBadge({
  name,
  logo,
}: {
  name: "Permaswap" | "Botega";
  logo?: string;
}) {
  return (
    <Badge
      variant="outline"
      className="gap-1.5 border-[hsl(var(--primary-700))]/50"
    >
      {/* {logo ? (
        <img src={logo} alt={name} className="h-4 w-4 rounded-sm" />
      ) : (
        <span className="h-4 w-4 rounded-sm bg-[hsl(var(--primary))]" />
      )} */}
      {name}
    </Badge>
  );
}
