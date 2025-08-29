import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { motion } from "framer-motion";
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
import {
  getPoolInfo,
  getTokenList,
  findTokenByProcess,
  formatTokenAmount,
  type PoolInfo,
  type Token,
} from "@/lib/api";
import { useAuth } from "@/hooks/use-global-state";
import { ValueSkeleton } from "./shared";

interface LiquidityTabsProps {
  processId: string;
}

export function LiquidityRemoveComponent({ LiquidityTabs }: { LiquidityTabs: React.ComponentType<LiquidityTabsProps> }) {
  const { processId = "" } = useParams();
  const { wallet } = useAuth();
  
  // Pool and token data
  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null);
  const [availableTokens, setAvailableTokens] = useState<Token[]>([]);
  const [tokenA, setTokenA] = useState<Token | null>(null);
  const [tokenB, setTokenB] = useState<Token | null>(null);
  
  // Form state
  const [percent, setPercent] = useState<number[]>([20]);
  const [openConfirm, setOpenConfirm] = useState(false);
  
  // Loading states
  const [loading, setLoading] = useState(true);
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

        // Find tokens based on pool info
        const foundTokenA = findTokenByProcess(tokens, pool.tokenA);
        const foundTokenB = findTokenByProcess(tokens, pool.tokenB);

        if (foundTokenA && foundTokenB) {
          setTokenA(foundTokenA);
          setTokenB(foundTokenB);
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

  // Mock pooled amounts - in real implementation, fetch user's LP position
  const pooled = poolInfo
    ? {
        tokenA: parseFloat(formatTokenAmount(poolInfo.px, poolInfo.decimalsX)),
        tokenB: parseFloat(formatTokenAmount(poolInfo.py, poolInfo.decimalsY)),
      }
    : { tokenA: 0, tokenB: 0 };

  const out = {
    tokenA: pooled.tokenA * (percent[0] / 100),
    tokenB: pooled.tokenB * (percent[0] / 100),
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
      <LiquidityTabs processId={processId} />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="mt-6 grid gap-6 md:grid-cols-2"
      >
        <div className="space-y-4">
          <div className="rounded-[16px] border bg-green-50 p-5 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
            <div className="mb-2 text-3xl font-bold text-green-700">
              {percent[0]}%
            </div>
            <Slider
              value={percent}
              onValueChange={setPercent}
              step={1}
              min={0}
              max={100}
            />
            <div className="mt-3 flex justify-between text-xs">
              {[0, 25, 50, 75, 100].map((t) => (
                <button
                  key={t}
                  className="rounded-full bg-white/70 px-2 py-0.5 text-green-700 shadow-xs transition-colors hover:bg-white"
                  onClick={() => setPercent([t])}
                >
                  {t}%
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-[16px] border bg-white p-4 text-sm shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
              <div className="text-muted-foreground">
                {tokenA ? `${tokenA.symbol} amount` : "Token A amount"}
              </div>
              <div className="mt-1 text-right text-lg font-semibold">
                {tokenA ? out.tokenA.toFixed(Math.min(tokenA.decimals, 10)) : <ValueSkeleton className="h-6 w-16" />}
              </div>
            </div>
            <div className="rounded-[16px] border bg-white p-4 text-sm shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
              <div className="text-muted-foreground">
                {tokenB ? `${tokenB.symbol} amount` : "Token B amount"}
              </div>
              <div className="mt-1 text-right text-lg font-semibold">
                {tokenB ? out.tokenB.toFixed(Math.min(tokenB.decimals, 10)) : <ValueSkeleton className="h-6 w-16" />}
              </div>
            </div>
          </div>

          <Dialog open={openConfirm} onOpenChange={setOpenConfirm}>
            <DialogTrigger asChild>
              <Button variant="filled" disabled={percent[0] === 0 || loading || !tokenA || !tokenB}>
                Remove Liquidity
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[16px]">
              <DialogHeader>
                <DialogTitle>Confirm Remove</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Percent</span>
                  <span className="font-medium">{percent[0]}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{tokenA?.symbol || "Token A"}</span>
                  <span className="font-medium">
                    {tokenA ? out.tokenA.toFixed(Math.min(tokenA.decimals, 10)) : <ValueSkeleton />}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{tokenB?.symbol || "Token B"}</span>
                  <span className="font-medium">
                    {tokenB ? out.tokenB.toFixed(Math.min(tokenB.decimals, 10)) : <ValueSkeleton />}
                  </span>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    setOpenConfirm(false);
                    toast.success("Liquidity removed");
                  }}
                >
                  Confirm
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-4">
          <div className="rounded-[16px] border bg-white p-4 text-sm shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
            <div className="font-medium">Fee & Rates</div>
            <div className="mt-2 grid gap-2 text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Fee tier</span>
                <span className="text-foreground">1.00% fee tier</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Current rates</span>
                <span className="text-foreground">
                  1 {tokenA?.symbol || "..."} ={" "}
                  {poolInfo ? (pooled.tokenB / pooled.tokenA || 0).toFixed(6) : <ValueSkeleton className="h-4 w-12" />}{" "}
                  {tokenB?.symbol || "..."}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Range</span>
                <span className="text-foreground">Full Range</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
