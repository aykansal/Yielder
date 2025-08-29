import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getPoolInfo,
  getTokenList,
  findTokenByProcess,
  type PoolInfo,
  type Token,
} from "@/lib/api";
import { useAuth } from "@/hooks/use-global-state";
import { ValueSkeleton } from "./shared";

interface LiquidityTabsProps {
  processId: string;
}

export function LiquidityClaimComponent({ LiquidityTabs }: { LiquidityTabs: React.ComponentType<LiquidityTabsProps> }) {
  const { processId = "" } = useParams();
  const { wallet } = useAuth();

  // Pool and token data
  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null);
  const [availableTokens, setAvailableTokens] = useState<Token[]>([]);
  const [tokenA, setTokenA] = useState<Token | null>(null);
  const [tokenB, setTokenB] = useState<Token | null>(null);

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
  }, [processId]);

  // Mock rewards - in real implementation, fetch user's earned rewards
  const rewards =
    poolInfo && tokenA && tokenB
      ? [
          { symbol: tokenA.symbol, amount: 0.0, usd: 0.0 },
          { symbol: tokenB.symbol, amount: 0.0, usd: 0.0 },
        ]
      : [];
  
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
        className="mt-6 space-y-4"
      >
        <div className="rounded-[16px] border bg-card p-4 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
          {!poolInfo || !tokenA || !tokenB ? (
            <div className="py-10 text-center text-muted-foreground">
              <ValueSkeleton className="h-5 w-32 mx-auto mb-2" />
              <div>Loading rewards...</div>
            </div>
          ) : rewards.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              No rewards to claim.
            </div>
          ) : (
            <div className="space-y-3">
              {rewards.map((r) => (
                <div
                  key={r.symbol}
                  className="flex items-center justify-between rounded-md bg-secondary p-3"
                >
                  <div className="text-sm font-medium">{r.symbol}</div>
                  <div className="text-right text-sm">
                    <div className="font-semibold">{r.amount}</div>
                    <div className="text-muted-foreground">
                      ${r.usd.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <Button 
              disabled={loading || !poolInfo || !tokenA || !tokenB || rewards.length === 0}
              onClick={() => toast.success("Claimed rewards")}
            >
              Claim All
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
