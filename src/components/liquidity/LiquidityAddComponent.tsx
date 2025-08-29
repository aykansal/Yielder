import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Link2, RefreshCw } from "lucide-react";
import { formatTokenAmount as formatAmount } from "@/lib/helpers.utils";
import {
  getPoolInfo,
  getUserTokenBalance,
  getTokenList,
  findTokenByProcess,
  formatTokenAmount,
  type PoolInfo,
  type Token,
} from "@/lib/api";
import { useAuth } from "@/hooks/use-global-state";
import { ValueSkeleton, clampDecimals, sanitizeNumericInput } from "./shared";

interface LiquidityTabsProps {
  processId: string;
}

export function LiquidityAddComponent({ LiquidityTabs }: { LiquidityTabs: React.ComponentType<LiquidityTabsProps> }) {
  const { processId = "" } = useParams();
  const { wallet } = useAuth();

  // Pool and token data
  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null);
  const [availableTokens, setAvailableTokens] = useState<Token[]>([]);
  const [tokenA, setTokenA] = useState<Token | null>(null);
  const [tokenB, setTokenB] = useState<Token | null>(null);
  const [tokenABalance, setTokenABalance] = useState<string>("0");
  const [tokenBBalance, setTokenBBalance] = useState<string>("0");

  // Form state
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [linked, setLinked] = useState(true);
  const [ratio, setRatio] = useState<number[]>([50]); // percent for A
  const [openConfirm, setOpenConfirm] = useState(false);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      if (!processId) {
        setError("No pool process ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Load token list and pool info in parallel
        const [tokens, pool] = await Promise.all([
          getTokenList(),
          getPoolInfo(processId),
        ]);

        setAvailableTokens(tokens);
        setPoolInfo(pool);

        // Check if pool info was loaded successfully
        if (!pool) {
          throw new Error("Failed to load pool information");
        }

        // Find tokens based on pool info
        const foundTokenA = findTokenByProcess(tokens, pool.tokenA);
        const foundTokenB = findTokenByProcess(tokens, pool.tokenB);

        if (foundTokenA && foundTokenB) {
          setTokenA(foundTokenA);
          setTokenB(foundTokenB);

          // Load user balances if wallet connected
          if (wallet?.address) {
            await loadTokenBalances(foundTokenA, foundTokenB, wallet.address);
          }
        } else {
          setError("Pool tokens not found in token list");
        }
      } catch (err) {
        console.error("Error loading liquidity data:", err);
        setError("Failed to load pool data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [processId, wallet?.address]);

  // Load token balances
  const loadTokenBalances = async (
    tokenA: Token,
    tokenB: Token,
    walletAddress: string,
  ) => {
    try {
      setLoadingBalances(true);
      const [balanceA, balanceB] = await Promise.all([
        getUserTokenBalance(tokenA.process, walletAddress),
        getUserTokenBalance(tokenB.process, walletAddress),
      ]);

      setTokenABalance(balanceA.balance);
      setTokenBBalance(balanceB.balance);
    } catch (err) {
      console.error("Error loading token balances:", err);
      toast.error("Failed to load token balances");
    } finally {
      setLoadingBalances(false);
    }
  };

  // Calculate price ratio from pool reserves
  const priceAtoB = useMemo(() => {
    if (!poolInfo || !poolInfo.px || !poolInfo.py) return 1;

    const reserveA = parseFloat(poolInfo.px);
    const reserveB = parseFloat(poolInfo.py);

    if (reserveA === 0 || reserveB === 0) return 1;

    // Price of A in terms of B
    return reserveB / reserveA;
  }, [poolInfo]);

  const vA = parseFloat(amountA) || 0;
  const vB = parseFloat(amountB) || 0;
  const pctA = ratio[0] / 100;

  // Calculate balances with proper decimals
  const tokenABalanceFormatted = tokenA
    ? parseFloat(formatTokenAmount(tokenABalance, tokenA.decimals))
    : 0;
  const tokenBBalanceFormatted = tokenB
    ? parseFloat(formatTokenAmount(tokenBBalance, tokenB.decimals))
    : 0;

  const insufficientA = vA > tokenABalanceFormatted;
  const insufficientB = vB > tokenBBalanceFormatted;
  const valid =
    vA > 0 && vB > 0 && !insufficientA && !insufficientB && tokenA && tokenB;

  const recomputeFromA = (newA: number, pct: number) => {
    if (!linked || !tokenB) return;
    if (pct <= 0) return setAmountB("0");
    const A_in_B = newA * priceAtoB;
    const total_B_units = A_in_B / pct;
    const newB = total_B_units * (1 - pct);
    setAmountB(clampDecimals(String(newB), tokenB.decimals));
  };

  const recomputeFromB = (newB: number, pct: number) => {
    if (!linked || !tokenA) return;
    const B_in_A = newB / priceAtoB;
    const total_A_units = B_in_A / (1 - pct || 1);
    const newA = total_A_units * pct;
    setAmountA(clampDecimals(String(newA), tokenA.decimals));
  };

  // Handle token change with pool validation
  const handleTokenChange = async (newToken: Token, isTokenA: boolean) => {
    const otherToken = isTokenA ? tokenB : tokenA;

    if (!otherToken) {
      if (isTokenA) {
        setTokenA(newToken);
      } else {
        setTokenB(newToken);
      }
      return;
    }

    // Check if pool exists for this pair
    try {
      // For now, we'll allow any combination
      // In a real implementation, you'd check against available pools
      if (isTokenA) {
        setTokenA(newToken);
      } else {
        setTokenB(newToken);
      }

      // Load balance for new token if wallet connected
      if (wallet?.address) {
        try {
          const balance = await getUserTokenBalance(
            newToken.process,
            wallet.address,
          );
          if (isTokenA) {
            setTokenABalance(balance.balance);
          } else {
            setTokenBBalance(balance.balance);
          }
        } catch (err) {
          console.error("Error loading token balance:", err);
        }
      }
    } catch (err) {
      toast.error("No pool available for this token pair");
    }
  };

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <Button onClick={() => window.location.reload()} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Liquidity</h1>
      <div className="mt-4 rounded-[16px] border bg-card p-4 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm">
            <div className="font-semibold">
              {poolInfo ? `${poolInfo.symbolX} / ${poolInfo.symbolY}` : <ValueSkeleton className="h-5 w-32" />}
            </div>
            <div className="text-muted-foreground">My Liquidity: 0.000 LP</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
              APR 0.00%
            </span>
            <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
              {poolInfo ? `${(parseFloat(poolInfo.fee) / 100).toFixed(2)}% fee` : <ValueSkeleton className="h-4 w-12" />}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <span>
                {processId.slice(0, 6)}…{processId.slice(-4)}
              </span>
            </span>
          </div>
        </div>
      </div>
      <LiquidityTabs processId={processId} />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="mt-6 grid gap-6 md:grid-cols-2"
      >
        <div className="space-y-4">
          {/* Token A input */}
          <div className="rounded-[16px] border bg-card p-4 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
            <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
              <span>Token A {tokenA ? `(${tokenA.symbol})` : ""}</span>
              <button
                className="rounded-full border px-2 py-0.5 text-xs text-[hsl(var(--primary-700))] transition-colors hover:bg-[hsl(var(--primary))] disabled:opacity-50"
                disabled={loadingBalances || !tokenA}
                onClick={() => {
                  const max = tokenABalanceFormatted;
                  setAmountA(clampDecimals(String(max), tokenA!.decimals));
                  recomputeFromA(max, pctA);
                }}
              >
                MAX {loadingBalances ? <ValueSkeleton className="h-3 w-8" /> : formatAmount(tokenABalanceFormatted)}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={tokenA?.symbol || ""}
                onValueChange={(sym) => {
                  const t = availableTokens.find((x) => x.symbol === sym);
                  if (t) handleTokenChange(t, true);
                }}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {availableTokens.map((t) => (
                    <SelectItem key={t.process} value={t.symbol}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{t.symbol}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-24">
                          {t.fullName}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                inputMode="decimal"
                value={amountA}
                onChange={(e) => {
                  const v = clampDecimals(
                    sanitizeNumericInput(e.target.value),
                    tokenA.decimals,
                  );
                  setAmountA(v);
                  const n = parseFloat(v) || 0;
                  recomputeFromA(n, pctA);
                }}
                className="text-right"
                placeholder="0.0"
              />
            </div>
            {insufficientA && (
              <div className="mt-1 text-xs text-red-500">
                Insufficient balance
              </div>
            )}
          </div>

          {/* Ratio slider */}
          <div className="rounded-[16px] border bg-card p-4 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Ratio A/B</span>
              <button
                className={`inline-flex items-center gap-1 text-sm ${linked ? "text-[hsl(var(--primary-700))]" : "text-muted-foreground"}`}
                onClick={() => setLinked((s) => !s)}
              >
                <Link2 className="h-4 w-4" /> {linked ? "Linked" : "Unlinked"}
              </button>
            </div>
            <div className="relative px-2">
              <Slider
                value={ratio}
                onValueChange={(v) => {
                  setRatio(v);
                  if (amountA)
                    recomputeFromA(parseFloat(amountA) || 0, v[0] / 100);
                  else if (amountB)
                    recomputeFromB(parseFloat(amountB) || 0, v[0] / 100);
                }}
                step={1}
                min={0}
                max={100}
              />
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                {[0, 25, 50, 75, 100].map((t) => (
                  <button
                    key={t}
                    className="rounded-full px-2 py-0.5 transition-colors hover:bg-secondary"
                    onClick={() => setRatio([t])}
                  >
                    {t}%
                  </button>
                ))}
              </div>
              <div className="pointer-events-none absolute -top-2 left-0 h-6 w-full">
                <div className="relative h-full">
                  <span
                    className="absolute -translate-x-1/2 rounded-full bg-[hsl(var(--primary))] px-2 py-0.5 text-xs font-medium text-[hsl(var(--primary-700))]"
                    style={{ left: `${ratio[0]}%` }}
                  >
                    {ratio[0]}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Token B input */}
          <div className="rounded-[16px] border bg-card p-4 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
            <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
              <span>Token B {tokenB ? `(${tokenB.symbol})` : ""}</span>
              <button
                className="rounded-full border px-2 py-0.5 text-xs text-[hsl(var(--primary-700))] transition-colors hover:bg-[hsl(var(--primary))] disabled:opacity-50"
                disabled={loadingBalances || !tokenB}
                onClick={() => {
                  const max = tokenBBalanceFormatted;
                  setAmountB(clampDecimals(String(max), tokenB!.decimals));
                  recomputeFromB(max, pctA);
                }}
              >
                MAX {loadingBalances ? <ValueSkeleton className="h-3 w-8" /> : formatAmount(tokenBBalanceFormatted)}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={tokenB?.symbol || ""}
                onValueChange={(sym) => {
                  const t = availableTokens.find((x) => x.symbol === sym);
                  if (t) handleTokenChange(t, false);
                }}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {availableTokens.map((t) => (
                    <SelectItem key={t.process} value={t.symbol}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{t.symbol}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-24">
                          {t.fullName}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                inputMode="decimal"
                value={amountB}
                onChange={(e) => {
                  const v = clampDecimals(
                    sanitizeNumericInput(e.target.value),
                    tokenB.decimals,
                  );
                  setAmountB(v);
                  const n = parseFloat(v) || 0;
                  recomputeFromB(n, pctA);
                }}
                className="text-right"
                placeholder="0.0"
              />
            </div>
            {insufficientB && (
              <div className="mt-1 text-xs text-red-500">
                Insufficient balance
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              You will receive LP tokens representing your position.
            </div>
            <Dialog open={openConfirm} onOpenChange={setOpenConfirm}>
              <DialogTrigger asChild>
                <Button disabled={!valid || loading}>Add Liquidity</Button>
              </DialogTrigger>
              <DialogContent className="rounded-[16px]">
                <DialogHeader>
                  <DialogTitle>Confirm Add Liquidity</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Token A</span>
                    <span className="font-medium">
                      {formatAmount(vA)} {tokenA?.symbol || ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Token B</span>
                    <span className="font-medium">
                      {formatAmount(vB)} {tokenB?.symbol || ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Fee tier</span>
                    <span className="font-medium">1.00%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Est. LP tokens
                    </span>
                    <span className="font-medium">
                      {Math.sqrt(vA * vB).toFixed(6)} LP
                    </span>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => {
                      setOpenConfirm(false);
                      toast.success("Liquidity added");
                      setAmountA("");
                      setAmountB("");
                    }}
                    className="min-w-28"
                  >
                    Confirm
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="space-y-4">
          {/* Fee & Rates */}
          <div className="rounded-[16px] border bg-card p-4 text-sm shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-medium">Fee & Rates</div>
              <button className="rounded-md border px-2 py-1 text-xs">
                Edit
              </button>
            </div>
            <div className="grid gap-2 text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Fee tier</span>
                <span className="text-foreground">1.00% fee tier</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Current rates</span>
                <span className="inline-flex items-center gap-2 text-foreground">
                  1 {tokenA?.symbol || "..."} = {poolInfo ? priceAtoB.toFixed(6) : <ValueSkeleton className="h-4 w-12" />} {tokenB?.symbol || "..."}{" "}
                  <button
                    className="rounded p-1 transition-colors hover:bg-secondary"
                    aria-label="Refresh rates"
                    onClick={() => {
                      if (processId && wallet?.address) {
                        loadTokenBalances(tokenA, tokenB, wallet.address);
                      }
                    }}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Range</span>
                <span className="text-foreground">Full Range</span>
              </div>
            </div>
          </div>

          {/* Pool Stats */}
          <div className="rounded-[16px] border bg-card p-4 text-sm text-muted-foreground shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <span>Share of pool</span>
                <span className="text-foreground">&lt;0.01%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Pooled</span>
                <span className="text-foreground">
                  {poolInfo ? (
                    `${formatTokenAmount(poolInfo.py, poolInfo.decimalsY)} ${poolInfo.symbolY} & • & ${formatTokenAmount(poolInfo.px, poolInfo.decimalsX)} ${poolInfo.symbolX}`
                  ) : (
                    <ValueSkeleton className="h-4 w-32" />
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
