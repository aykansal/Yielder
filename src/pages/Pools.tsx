import { useMemo, useState } from "react";
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
import {
  airdropTokenOptions,
  luaProcessId,
} from "@/lib/constants/index.constants";
import {
  getTokenList,
  getBestStake,
  findTokenByProcess,
  type Token,
  getAllPools,
} from "@/lib/api";
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
import { Pool, PoolAPIResponse } from "@/types/pool.types";
import { transformPoolData, transformBestStakeData } from "@/lib/pools.utils";
import { connect } from "@permaweb/aoconnect";

export default function Pools() {
  const [q, setQ] = useState("");
  const [dex, setDex] = useState<"All" | "PERMASWAP" | "BOTEGA">("All");
  const [sort, setSort] = useState<"APR" | "TVL" | "Fees">("APR");
  const [loading, setLoading] = useState(true); // Start with loading true
  const [pools, setPools] = useState<Pool[]>([]);
  const [error, setError] = useState<string | null>(null);
  const nav = useNavigate();
  const { isAuthenticated, wallet } = useAuth();

  // Best Stake state
  const [availableTokens, setAvailableTokens] = useState<Token[]>([]);
  const [selectedTokenX, setSelectedTokenX] = useState<string>("");
  const [selectedTokenY, setSelectedTokenY] = useState<string>("");
  const [bestStakePool, setBestStakePool] = useState<Pool | null>(null);
  const [bestStakeLoading, setBestStakeLoading] = useState(false);
  const [bestStakeError, setBestStakeError] = useState<string | null>(null);

  // Token Airdrop States
  const [airdropModalOpen, setAirdropModalOpen] = useState(false);
  const [selectedAirdropToken, setSelectedAirdropToken] = useState<string>("");
  const [airdropQuantity, setAirdropQuantity] = useState<string>("");
  const [airdropLoading, setAirdropLoading] = useState(false);

  // Enhanced refresh function with error handling
  const refreshPools = React.useCallback(async () => {
    setError(null);
    try {
      setLoading(true);
      const res = (await getAllPools()) as PoolAPIResponse;

      const transformedPools = await transformPoolData(res);
      console.log("transformedPools", transformedPools);
      setPools(transformedPools);
      console.log(
        "[pools.tsx] Loaded pools:",
        transformedPools.length,
        "pools",
      );
    } catch (err) {
      setError("Failed to load pools. Please try again.");
      console.error("Pool refresh error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

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
      const bestStakeData = await getBestStake(selectedTokenX, selectedTokenY);

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

  // Token Airdrop Handler
  const handleTokenAirdrop = async () => {
    if (!selectedAirdropToken || !airdropQuantity || !wallet?.address) {
      return;
    }

    setAirdropLoading(true);
    try {
      const quantity = parseInt(airdropQuantity);
      if (isNaN(quantity) || quantity <= 0) {
        throw new Error("Please enter a valid quantity");
      }

      const result = await messageAR({
        process: luaProcessId,
        tags: [
          {
            name: "Action",
            value: airdropTokenOptions.find(
              (t) => t.value === selectedAirdropToken,
            )?.action,
          },
          { name: "Quantity", value: quantity.toString() },
          { name: "Recipient", value: wallet?.address || "" },
          { name: "Token", value: selectedAirdropToken },
        ],
      }).then(async (messageId) => {
        const ao = connect({ MODE: "legacy" });
        const messageResult = await ao.result({
          process: luaProcessId,
          message: messageId,
        });
        return messageResult;
      });

      console.log("Airdrop result:", result);

      // Reset form and close modal
      setSelectedAirdropToken("");
      setAirdropQuantity("");
      setAirdropModalOpen(false);

      // Show success message (you can add toast here)
      alert(
        `Successfully requested airdrop of ${quantity} ${selectedAirdropToken} tokens!`,
      );
    } catch (err) {
      console.error("Airdrop error:", err);
      alert("Failed to request airdrop. Please try again.");
    } finally {
      setAirdropLoading(false);
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
          <Dialog open={airdropModalOpen} onOpenChange={setAirdropModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
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
                    value={selectedAirdropToken}
                    onValueChange={setSelectedAirdropToken}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose token to airdrop" />
                    </SelectTrigger>
                    <SelectContent>
                      {airdropTokenOptions.map((token) => (
                        <SelectItem key={token.value} value={token.value}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{token.label}</span>
                            <span className="text-xs text-gray-500">
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
                    value={airdropQuantity}
                    onChange={(e) => setAirdropQuantity(e.target.value)}
                    min="1"
                    step="1"
                  />
                </div>
                {wallet?.address && (
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-600">
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
                  disabled={airdropLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleTokenAirdrop}
                  disabled={
                    airdropLoading || !selectedAirdropToken || !airdropQuantity
                  }
                >
                  {airdropLoading ? (
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
          <h2 className="text-lg font-semibold text-gray-900">
            Find Best Stake
          </h2>
          <p className="text-sm text-gray-600">
            Select tokens to find the liquidity pool with max Yield.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
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
                      <span className="text-xs text-gray-500 truncate max-w-24">
                        {token.fullName}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
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
                      <span className="text-xs text-gray-500 truncate max-w-24">
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
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {bestStakeError}
          </div>
        )}

        {/* Best Stake Result */}
        {bestStakePool && (
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              🏆 Recommended Pool
            </h3>
            <div className="rounded-lg border bg-white shadow-sm">
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
                      <DEXBadge
                        name={
                          bestStakePool.dex === "PERMASWAP"
                            ? "Permaswap"
                            : "Botega"
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        className={`text-left font-semibold ${isAuthenticated ? "hover:underline cursor-pointer" : "cursor-default"}`}
                        onClick={() =>
                          isAuthenticated &&
                          nav(`/liquidity/add/${bestStakePool.processId}`)
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
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                        {(bestStakePool.swapFeePct * 100).toFixed(2)}%
                      </span>
                    </TableCell>
                    <TableCell>
                      ${bestStakePool.tvlUsd > 0
                        ? (bestStakePool.tvlUsd).toFixed(3)
                        : "0.00"}
                    </TableCell>
                    <TableCell>
                      {bestStakePool.aprPct > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                          {bestStakePool.aprPct.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-500">
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
                              nav(`/liquidity/add/${bestStakePool.processId}`)
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
                                    `/liquidity/add/${bestStakePool.processId}`,
                                  )
                                }
                              >
                                Add Liquidity
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  nav(
                                    `/liquidity/remove/${bestStakePool.processId}`,
                                  )
                                }
                              >
                                Remove Liquidity
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  nav(
                                    `/liquidity/claim/${bestStakePool.processId}`,
                                  )
                                }
                              >
                                Claim Rewards
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
        <div>
          <h2 className="text-lg font-semibold text-gray-900">All Pools</h2>
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
            onValueChange={(value: "All" | "PERMASWAP" | "BOTEGA") =>
              setDex(value)
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select DEX" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All DEXes</SelectItem>
              <SelectItem value="PERMASWAP">Permaswap</SelectItem>
              <SelectItem value="BOTEGA">Botega</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={refreshPools}
            variant="outline"
            size="icon"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="rounded-[16px] border bg-white p-4 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
        {error ? (
          <div className="p-12 text-center">
            <div className="text-red-600 mb-4">{error}</div>
            <Button onClick={refreshPools} variant="outline">
              Try Again
            </Button>
          </div>
        ) : loading ? (
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
                    <Skeleton className="h-6 w-20 bg-gray-200" />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32 bg-gray-200" />
                      <Skeleton className="h-3 w-24 bg-gray-100" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-16 bg-gray-200 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20 bg-gray-200" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-16 bg-gray-200 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-8 bg-gray-200" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Skeleton className="h-8 w-16 bg-gray-200" />
                      <Skeleton className="h-8 w-8 bg-gray-200" />
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
                <Button onClick={refreshPools} variant="outline">
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
                    <DEXBadge
                      name={p.dex === "PERMASWAP" ? "Permaswap" : "Botega"}
                    />
                  </TableCell>
                  <TableCell>
                    <button
                      className={`text-left font-semibold ${isAuthenticated ? "hover:underline cursor-pointer" : "cursor-default"}`}
                      onClick={() =>
                        isAuthenticated && nav(`/liquidity/add/${p.processId}`)
                      }
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
                  <TableCell>
                    ${p.tvlUsd > 0 ? (p.tvlUsd).toFixed(3) : "0.00"}
                  </TableCell>
                  <TableCell>
                    {p.aprPct > 0 ? (
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                        {p.aprPct.toFixed(2)}%
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700">
                        0.00%
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">—</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {isAuthenticated && (
                        <Button
                          size="sm"
                          onClick={() => nav(`/liquidity/add/${p.processId}`)}
                        >
                          Add
                        </Button>
                      )}

                      {isAuthenticated && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                nav(`/liquidity/add/${p.processId}`)
                              }
                            >
                              Add Liquidity
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                nav(`/liquidity/remove/${p.processId}`)
                              }
                            >
                              Remove Liquidity
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                nav(`/liquidity/claim/${p.processId}`)
                              }
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
