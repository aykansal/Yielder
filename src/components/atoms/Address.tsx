import { ExternalLink } from "lucide-react";
import { shortenAddress } from "@/lib/format";

export function Address({
  addr,
  explorerBase,
}: {
  addr: string;
  explorerBase?: string;
}) {
  const url = explorerBase
    ? `${explorerBase.replace(/\/$/, "")}/${addr}`
    : undefined;
  return (
    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
      <span className="font-medium text-foreground">
        {shortenAddress(addr)}
      </span>
      {url && (
        <a
          className="inline-flex items-center text-[hsl(var(--primary-700))] hover:underline"
          href={url}
          target="_blank"
          rel="noreferrer"
          aria-label="Open in explorer"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </span>
  );
}
