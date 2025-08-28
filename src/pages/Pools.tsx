import { useMemo, useState } from "react";
import { DEXBadge } from "@/components/atoms/DEXBadge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/hooks/use-global-state";

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
    action: "cron",
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
  const { isAuthenticated } = useAuth();

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
    <div>
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

      <div className="rounded-[16px] border bg-white p-4 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            No pools found. Adjust filters.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>DEX</TableHead>
                <TableHead>Pool</TableHead>
                <TableHead>Swap Fees</TableHead>
                <TableHead>TVL</TableHead>
                <TableHead>APR</TableHead>
                <TableHead>Pool Balance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.processId} className="hover:bg-secondary/60">
                  <TableCell>
                    <DEXBadge name={p.dex} />
                  </TableCell>
                  <TableCell>
                    <button
                      className={`text-left font-semibold ${isAuthenticated ? 'hover:underline cursor-pointer' : 'cursor-default'}`}
                      onClick={() => isAuthenticated && nav(`/liquidity/add/${p.processId}`)}
                    >
                      {p.tokenA.symbol} / {p.tokenB.symbol}
                    </button>
                    <div className="text-xs text-muted-foreground">
                      {p.contract.slice(0, 6)}…{p.contract.slice(-4)}
                    </div>
                    {!isAuthenticated && (
                      <div className="text-xs text-muted-foreground">
                        (Connect wallet to interact)
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                      {(p.swapFeePct * 100).toFixed(2)}%
                    </span>
                  </TableCell>
                  <TableCell>{formatUSD(p.tvlUsd)}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                      {formatPercent(p.aprPct)}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">—</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <ProtectedRoute 
                        showCard={false}
                        fallback={
                          <Button variant="outline" size="sm" disabled>
                            Connect Wallet
                          </Button>
                        }
                      >
                        <Button
                          size="sm"
                          onClick={() => nav(`/liquidity/add/${p.processId}`)}
                        >
                          Add
                        </Button>
                      </ProtectedRoute>
                      
                      {isAuthenticated && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => nav(`/liquidity/add/${p.processId}`)}
                            >
                              Add Liquidity
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => nav(`/liquidity/remove/${p.processId}`)}
                            >
                              Remove Liquidity
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => nav(`/liquidity/claim/${p.processId}`)}
                            >
                              Claim Rewards
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
