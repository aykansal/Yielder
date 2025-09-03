import { useEffect, useMemo, useState } from "react";
import * as React from "react";
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
import { MoreHorizontal, RefreshCw, Search } from "lucide-react";
import { useNavigate } from "react-router";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-global-state";
import { useAo } from "@/hooks/use-ao";
import {
  airdropTokenOptions,
  luaProcessId,
} from "@/lib/constants/index.constants";
import { getTokenList, getBestStake, type Token, getAllPools } from "@/lib/api";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Gift } from "lucide-react";
import { messageAR } from "@/lib/arkit";
import { DEX, Pool } from "@/types/pool.types";
import { transformBestStakeData } from "@/lib/pools.utils";

export default function Pools() {
  const [q, setQ] = useState("");
  const [dex, setDex] = useState<"All" | DEX>("All");
  const [sort, setSort] = useState<"APR" | "TVL" | "Fees">();
  const [loading, setLoading] = useState(true); // Start with loading true
  const [updating, setUpdating] = useState(false); // For background updates
  const [pools, setPools] = useState<Pool[]>([]);
  const [error, setError] = useState<string | null>(null);
  const nav = useNavigate();
  const { isAuthenticated, wallet } = useAuth();
  const ao = useAo();

  // Best Stake state
  const [availableTokens, setAvailableTokens] = useState<Token[]>([]);
  const [selectedTokenX, setSelectedTokenX] = useState<string>("");
  const [selectedTokenY, setSelectedTokenY] = useState<string>("");
  const [bestStakePool, setBestStakePool] = useState<Pool | null>(null);
  const [bestStakeLoading, setBestStakeLoading] = useState(false);
  const [bestStakeError, setBestStakeError] = useState<string | null>(null);

  // Token Airdrop Form State
  const [airdropModalOpen, setAirdropModalOpen] = useState(false);
  const [airdropForm, setAirdropForm] = useState({
    token: "",
    quantity: "",
    loading: false,
  });
  useEffect(() => {
    document.title = "Liquidity Pools · Yielder";
  }, []);
  // Load pools from localStorage on mount
  React.useEffect(() => {
    const cachedPools = localStorage.getItem("pools-cache");
    if (cachedPools) {
      try {
        const parsedPools = JSON.parse(cachedPools);
        setPools(parsedPools);
        console.log("[pools.tsx] Loaded cached pools:", parsedPools.length);
      } catch (err) {
        console.error("Failed to parse cached pools:", err);
        localStorage.removeItem("pools-cache");
      }
    }
  }, []);

  // Save pools to localStorage
  const savePoolsToCache = React.useCallback((poolsToCache: Pool[]) => {
    try {
      localStorage.setItem("pools-cache", JSON.stringify(poolsToCache));
    } catch (err) {
      console.error("Failed to save pools to cache:", err);
    }
  }, []);

  // Merge new pools with existing pools
  const mergePools = React.useCallback(
    (existingPools: Pool[], newPools: Pool[]): Pool[] => {
      const poolsMap = new Map<string, Pool>();

      // Add existing pools to map
      existingPools.forEach((pool) => {
        poolsMap.set(pool.processId, pool);
      });

      // Update/add new pools
      newPools.forEach((pool) => {
        poolsMap.set(pool.processId, pool);
      });

      // Convert back to array
      const mergedPools = Array.from(poolsMap.values());

      console.log(
        `[pools.tsx] Merged pools: ${existingPools.length} existing + ${newPools.length} new = ${mergedPools.length} total`,
      );

      return mergedPools;
    },
    [],
  );

  // Enhanced refresh function with error handling and merge logic
  const refreshPools = React.useCallback(
    async (isBackgroundUpdate = false) => {
      setError(null);
      try {
        if (!isBackgroundUpdate) {
          setLoading(true);
        } else {
          setUpdating(true);
        }

        const allPools = await getAllPools(ao);

        setPools((currentPools) => {
          const mergedPools = mergePools(currentPools, allPools);
          // Save merged pools to cache
          savePoolsToCache(mergedPools);
          return mergedPools;
        });

        console.log("[pools.tsx] Refreshed pools:", allPools.length, "pools");
      } catch (err) {
        setError("Failed to load pools. Please try again.");
        console.error("Pool refresh error:", err);
      } finally {
        if (!isBackgroundUpdate) {
          setLoading(false);
        } else {
          setUpdating(false);
        }
      }
    },
    [mergePools, savePoolsToCache],
  );

  // Load available tokens for Best Stake
  const loadTokens = React.useCallback(async () => {
    try {
      const tokens = await getTokenList();
      setAvailableTokens(tokens);
    } catch (err) {
      console.error("Failed to load tokens:", err);
    }
  }, []);

  // Load pools on component mount
  React.useEffect(() => {
    refreshPools();
    loadTokens();
  }, [refreshPools, loadTokens]);

  // Cron job for continuous data fetching
  React.useEffect(() => {
    const cronInterval = setInterval(() => {
      if (pools.length > 0) {
        // Only run background updates if we have initial data
        refreshPools(true); // true = background update
      }
    }, 30000); // Fetch every 30 seconds

    return () => {
      clearInterval(cronInterval);
    };
  }, [pools.length, refreshPools]);

  // Handle Best Stake search
  const handleBestStake = async () => {
    if (!selectedTokenX || !selectedTokenY) {
      setBestStakeError("Please select both tokens");
      return;
    }

    if (selectedTokenX === selectedTokenY) {
      setBestStakeError("Please select different tokens");
      return;
    }

    try {
      setBestStakeLoading(true);
      setBestStakeError(null);
      setBestStakePool(null);
      console.log(selectedTokenX, selectedTokenY);
      const bestStakeData = await getBestStake(
        ao,
        selectedTokenX,
        selectedTokenY,
      );
      console.log("[pools.tsx] bestStakeData:", bestStakeData);
      if (bestStakeData) {
        const transformedBestStakePool = transformBestStakeData(bestStakeData);
        console.log(
          "[pools.tsx] transformedBestStakePool:",
          transformedBestStakePool,
        );

        setBestStakePool(transformedBestStakePool);
      } else {
        setBestStakeError("No optimal pool found for this token pair");
      }
    } catch (err) {
      console.error("Best stake error:", err);
      setBestStakeError("Failed to find best stake. Please try again.");
    } finally {
      setBestStakeLoading(false);
    }
  };

  // Token Airdrop Form Handlers
  const updateAirdropForm = (
    field: keyof typeof airdropForm,
    value: string,
  ) => {
    setAirdropForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetAirdropForm = () => {
    setAirdropForm({
      token: "",
      quantity: "",
      loading: false,
    });
  };

  const handleTokenAirdrop = async () => {
    if (!airdropForm.token || !airdropForm.quantity || !wallet?.address) {
      return;
    }

    setAirdropForm((prev) => ({ ...prev, loading: true }));

    try {
      const quantity = parseInt(airdropForm.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        throw new Error("Please enter a valid quantity");
      }

      const result = await messageAR(ao, {
        process: luaProcessId,
        tags: [
          {
            name: "Action",
            value: airdropTokenOptions.find(
              (t) => t.value === airdropForm.token,
            )?.action,
          },
          { name: "Quantity", value: quantity.toString() },
          { name: "Recipient", value: wallet?.address || "" },
          { name: "Token", value: airdropForm.token },
        ],
      }).then(async (messageId) => {
        const messageResult = await ao.result({
          process: luaProcessId,
          message: messageId,
        });
        return messageResult;
      });

      console.log("Airdrop result:", result);

      // Reset form and close modal
      resetAirdropForm();
      setAirdropModalOpen(false);

      // Show success message (you can add toast here)
      alert(
        `Successfully requested airdrop of ${quantity} ${airdropForm.token} tokens!`,
      );
    } catch (err) {
      console.error("Airdrop error:", err);
      alert("Failed to request airdrop. Please try again.");
    } finally {
      setAirdropForm((prev) => ({ ...prev, loading: false }));
    }
  };

  const filtered = useMemo(() => {
    let list = [...pools];
    if (dex !== "All") list = list.filter((p) => p.dex === dex);
    if (q) {
      const k = q.toLowerCase();
      list = list.filter(
        (p) =>
          p.tokenA.symbol.toLowerCase().includes(k) ||
          p.tokenB.symbol.toLowerCase().includes(k) ||
          p.dex.toLowerCase().includes(k) ||
          p.name.toLowerCase().includes(k),
      );
    }
    list.sort((a, b) => {
      if (sort === "APR") return b.aprPct - a.aprPct;
      if (sort === "TVL") return b.tvlUsd - a.tvlUsd;
      return b.swapFeePct - a.swapFeePct;
    });
    return list;
  }, [q, dex, sort, pools]);

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Pools</h1>
        </div>
        {/* Token Airdrop Button - Only show when wallet is connected */}
        {isAuthenticated && (
          <Dialog
            open={airdropModalOpen}
            onOpenChange={(open) => {
              setAirdropModalOpen(open);
              if (!open) {
                resetAirdropForm();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="filled" className="gap-2">
                <Gift className="h-4 w-4" />
                Token Airdrop
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>🎁 Token Airdrop</DialogTitle>
                <DialogDescription>
                  Select a token and enter the quantity you want to receive.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Select Token</label>
                  <Select
                    value={airdropForm.token}
                    onValueChange={(value) => updateAirdropForm("token", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose token to airdrop" />
                    </SelectTrigger>
                    <SelectContent>
                      {airdropTokenOptions.map((token) => (
                        <SelectItem key={token.value} value={token.value}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{token.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {token.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Quantity</label>
                  <Input
                    type="number"
                    placeholder="Enter quantity"
                    value={airdropForm.quantity}
                    onChange={(e) =>
                      updateAirdropForm("quantity", e.target.value)
                    }
                    min="1"
                    step="1"
                  />
                </div>
                {wallet?.address && (
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Wallet:</span>{" "}
                      {wallet.address}
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setAirdropModalOpen(false)}
                  disabled={airdropForm.loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleTokenAirdrop}
                  disabled={
                    airdropForm.loading ||
                    !airdropForm.token ||
                    !airdropForm.quantity
                  }
                >
                  {airdropForm.loading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Request Airdrop"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Best Stake Section */}
      <div className="mb-8 rounded-[16px] border bg-background p-6 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Find Best Stake
          </h2>
          <p className="text-sm text-muted-foreground">
            Select tokens to find the liquidity pool with max Yield.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Token X
            </label>
            <Select value={selectedTokenX} onValueChange={setSelectedTokenX}>
              <SelectTrigger>
                <SelectValue placeholder="Select Token X" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                {availableTokens.map((token) => (
                  <SelectItem key={token.process} value={token.process}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{token.symbol}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-24">
                        {token.fullName}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Token Y
            </label>
            <Select value={selectedTokenY} onValueChange={setSelectedTokenY}>
              <SelectTrigger>
                <SelectValue placeholder="Select Token Y" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                {availableTokens.map((token) => (
                  <SelectItem key={token.process} value={token.process}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{token.symbol}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-24">
                        {token.fullName}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={handleBestStake}
              disabled={bestStakeLoading || !selectedTokenX || !selectedTokenY}
              className="w-full"
            >
              {bestStakeLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Finding...
                </>
              ) : (
                "Find Best Stake"
              )}
            </Button>
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedTokenX("");
                setSelectedTokenY("");
                setBestStakePool(null);
                setBestStakeError(null);
              }}
              disabled={bestStakeLoading}
              className="w-full"
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Best Stake Error */}
        {bestStakeError && (
          <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {bestStakeError}
          </div>
        )}

        {/* Best Stake Result */}
        {bestStakePool && (
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              🏆 Recommended Pool
            </h3>
            <div className="rounded-lg border bg-card shadow-sm">
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
                  <TableRow className="hover:bg-secondary/60">
                    <TableCell>
                      <DEXBadge name={bestStakePool.dex} />
                    </TableCell>
                    <TableCell>
                      <button
                        className={`text-left font-semibold ${isAuthenticated ? "hover:underline cursor-pointer" : "cursor-default"}`}
                        onClick={() =>
                          isAuthenticated &&
                          nav(
                            `/liquidity?processId=${bestStakePool.processId}&type=add&dex=${bestStakePool.dex}`,
                          )
                        }
                      >
                        {bestStakePool.tokenA.symbol} /{" "}
                        {bestStakePool.tokenB.symbol}
                      </button>
                      <div className="text-xs text-muted-foreground">
                        Best match for your tokens
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                        {(bestStakePool.swapFeePct * 100).toFixed(2)}%
                      </span>
                    </TableCell>
                    <TableCell>
                      $
                      {bestStakePool.tvlUsd > 0
                        ? bestStakePool.tvlUsd.toFixed(3)
                        : "0.00"}
                    </TableCell>
                    <TableCell>
                      {bestStakePool.aprPct > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-green-500 px-2 py-1 text-xs font-medium text-green-600 dark:text-green-400">
                          {bestStakePool.aprPct.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                          0.00%
                        </span>
                      )}
                    </TableCell>
                    <TableCell>—</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {isAuthenticated && (
                          <Button
                            size="sm"
                            onClick={() =>
                              nav(
                                `/liquidity?processId=${bestStakePool.processId}&type=add&dex=${bestStakePool.dex}`,
                              )
                            }
                          >
                            Add
                          </Button>
                        )}

                        {isAuthenticated && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  nav(
                                    `/liquidity?processId=${bestStakePool.processId}&type=add&dex=${bestStakePool.dex}`,
                                  )
                                }
                              >
                                Add Liquidity
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  nav(
                                    `/liquidity?processId=${bestStakePool.processId}&type=remove&dex=${bestStakePool.dex}`,
                                  )
                                }
                              >
                                Remove Liquidity
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* All Pools Section */}
      <div className="mb-6 flex items-end justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">All Pools</h2>
          {updating && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Updating...
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tokens or DEX"
              className="w-64 pl-9"
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
            onValueChange={(value: "All" | DEX) => setDex(value)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select DEX" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All DEXs</SelectItem>
              <SelectItem value={DEX.PERMASWAP}>Permaswap</SelectItem>
              <SelectItem value={DEX.BOTEGA}>Botega</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => refreshPools(false)}
            variant="outline"
            size="icon"
            disabled={loading || updating}
          >
            <RefreshCw
              className={`h-4 w-4 ${loading || updating ? "animate-spin animate-pulse" : ""}`}
            />
          </Button>
        </div>
      </div>

      <div className="rounded-[16px] border bg-card p-4 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
        {error ? (
          <div className="p-12 text-center">
            <div className="text-destructive mb-4">{error}</div>
            <Button onClick={() => refreshPools(false)} variant="outline">
              Try Again
            </Button>
          </div>
        ) : loading && pools.length === 0 ? (
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
              {Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-6 w-20" />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-8" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            {pools.length === 0
              ? "No pools available."
              : "No pools match your search criteria."}
            {pools.length === 0 && (
              <div className="mt-4">
                <Button onClick={() => refreshPools(false)} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Pools
                </Button>
              </div>
            )}
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
                      className={`text-left font-semibold ${isAuthenticated ? "hover:underline cursor-pointer" : "cursor-default"}`}
                      onClick={() =>
                        isAuthenticated &&
                        nav(
                          `/liquidity?processId=${p.processId}&type=add&dex=${p.dex}`,
                        )
                      }
                    >
                      {p.tokenA.symbol} / {p.tokenB.symbol}
                    </button>
                    <div className="text-xs text-muted-foreground">
                      {p.contract.slice(0, 6)}…{p.contract.slice(-4)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                      {(p.swapFeePct * 100).toFixed(2)}%
                    </span>
                  </TableCell>
                  <TableCell>
                    ${p.tvlUsd > 0 ? p.tvlUsd.toFixed(3) : "0.00"}
                  </TableCell>
                  <TableCell>
                    {p.aprPct > 0 ? (
                      <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-1 text-xs font-medium text-green-600 dark:text-green-400">
                        {p.aprPct.toFixed(2)}%
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                        0.00%
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">—</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {isAuthenticated && (
                        <>
                          <Button
                            size="sm"
                            onClick={() =>
                              nav(
                                `/liquidity?processId=${p.processId}&type=add&dex=${p.dex}`,
                              )
                            }
                          >
                            Add
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              nav(
                                `/liquidity?processId=${p.processId}&type=remove&dex=${p.dex}`,
                              )
                            }
                          >
                            Out
                          </Button>
                        </>
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
