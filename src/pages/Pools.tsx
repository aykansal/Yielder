import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { DEXBadge } from "@/components/atoms/DEXBadge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatPercent, formatUSD } from "@/lib/format";
import { MoreHorizontal, RefreshCw, Search } from "lucide-react";
import { useNavigate } from "react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { readHandler } from "@/lib/arkit";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type Pool = {
  processId: string;
  dex: "Permaswap" | "Botega";
  tokenA: { symbol: string; icon: string; decimals: number };
  tokenB: { symbol: string; icon: string; decimals: number };
  swapFeePct: number; // e.g. 0.003
  tvlUsd: number;
  aprPct: number; // 0.089 -> 8.9%
  contract: string;
};

const samplePools: Pool[] = [
  {
    processId: "gjnaCsEd749Z11",
    dex: "Permaswap",
    tokenA: { symbol: "wAR", icon: "/placeholder.svg", decimals: 6 },
    tokenB: { symbol: "ARIO", icon: "/placeholder.svg", decimals: 6 },
    swapFeePct: 0.003,
    tvlUsd: 1200000,
    aprPct: 0.089,
    contract: "0xabcdef1234567890abcdef01",
  },
  {
    processId: "gjnaCsEd749Z12",
    dex: "Botega",
    tokenA: { symbol: "USDC", icon: "/placeholder.svg", decimals: 6 },
    tokenB: { symbol: "wAR", icon: "/placeholder.svg", decimals: 6 },
    swapFeePct: 0.001,
    tvlUsd: 3400000,
    aprPct: 0.064,
    contract: "0xabcdef1234567890abcdef02",
  },
  {
    processId: "gjnaCsEd749Z13",
    dex: "Permaswap",
    tokenA: { symbol: "BTC", icon: "/placeholder.svg", decimals: 8 },
    tokenB: { symbol: "wAR", icon: "/placeholder.svg", decimals: 6 },
    swapFeePct: 0.003,
    tvlUsd: 980000,
    aprPct: 0.102,
    contract: "0xabcdef1234567890abcdef03",
  },
];

const handlePoolsRefresh = async () => {
  const res = await readHandler({
    action: "Pool-Yield-Details",
    process: "gXMkW8bXLoVJXwu8sGjTkcJ4sTIUh9ag9C66AgaYjOk",
  });
  console.log(res);
};

export default function Pools() {
  const [q, setQ] = useState("");
  const [dex, setDex] = useState<"All" | "Permaswap" | "Botega">("All");
  const [sort, setSort] = useState<"APR" | "TVL" | "Fees">("APR");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const filtered = useMemo(() => {
    let list = [...samplePools];
    if (dex !== "All") list = list.filter((p) => p.dex === dex);
    if (q) {
      const k = q.toLowerCase();
      list = list.filter(
        (p) =>
          p.tokenA.symbol.toLowerCase().includes(k) ||
          p.tokenB.symbol.toLowerCase().includes(k) ||
          p.dex.toLowerCase().includes(k),
      );
    }
    list.sort((a, b) => {
      if (sort === "APR") return b.aprPct - a.aprPct;
      if (sort === "TVL") return b.tvlUsd - a.tvlUsd;
      return b.swapFeePct - a.swapFeePct;
    });
    return list;
  }, [q, dex, sort]);

  return (
    <AppShell>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Pools</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tokens or DEX"
              className="h-10 w-64 rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground outline-none transition-shadow focus:ring-2 focus:ring-ring focus:ring-offset-2"
            />
          </div>

          <Select
            value={sort}
            onValueChange={(value: "APR" | "TVL" | "Fees") => setSort(value)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="APR">APR</SelectItem>
              <SelectItem value="TVL">TVL</SelectItem>
              <SelectItem value="Fees">Fees</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={dex}
            onValueChange={(value: "All" | "Permaswap" | "Botega") =>
              setDex(value)
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select DEX" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All DEXes</SelectItem>
              <SelectItem value="Permaswap">Permaswap</SelectItem>
              <SelectItem value="Botega">Botega</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handlePoolsRefresh} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[16px] bg-card border p-4 shadow-sm"
            >
              <Skeleton className="h-6 w-40" />
              <div className="mt-4 grid grid-cols-4 gap-4">
                <Skeleton className="h-4" />
                <Skeleton className="h-4" />
                <Skeleton className="h-4" />
                <Skeleton className="h-10" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="rounded-[16px] border bg-secondary p-8 text-center text-muted-foreground">
            No pools found. Adjust filters.
          </div>
        ) : (
          filtered.map((p) => (
            <div
              key={p.processId}
              className="group flex items-center justify-between rounded-[16px] border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-accent"
            >
              <div className="flex items-center gap-4">
                <DEXBadge name={p.dex} />
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => nav(`/liquidity/add/${p.processId}`)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && nav(`/liquidity/add/${p.processId}`)
                  }
                  className="flex cursor-pointer items-center gap-3"
                >
                  <div className="text-sm font-semibold text-foreground">
                    {p.tokenA.symbol} / {p.tokenB.symbol}
                  </div>
                </div>
              </div>

              <div className="grid flex-1 grid-cols-4 items-center text-center text-sm text-foreground/80">
                <div>
                  <div className="font-medium">Swap Fees</div>
                  <div className="text-muted-foreground">
                    {(p.swapFeePct * 100).toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="font-medium">TVL</div>
                  <div className="text-muted-foreground">
                    {formatUSD(p.tvlUsd)}
                  </div>
                </div>
                <div>
                  <div className="font-medium">APR</div>
                  <div className="text-muted-foreground">
                    {formatPercent(p.aprPct)}
                  </div>
                </div>
                <div>
                  <div className="font-medium">Pool Balance</div>
                  <div className="text-muted-foreground">—</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => nav(`/liquidity/add/${p.processId}`)}
                  aria-label="Open Add"
                >
                  Add
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="More"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => nav(`/liquidity/add/${p.processId}`)}
                    >
                      Open Add
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => nav(`/liquidity/remove/${p.processId}`)}
                    >
                      Open Remove
                    </DropdownMenuItem>
                    {/* <DropdownMenuItem
                      onClick={() => nav(`/liquidity/claim/${p.processId}`)}
                    >
                      Open Claim
                    </DropdownMenuItem> */}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
