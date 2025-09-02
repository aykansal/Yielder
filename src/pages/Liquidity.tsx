import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Copy,
  ExternalLink,
  Loader2,
  PlusCircle,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { formatTokenAmount as formatAmount } from "@/lib/helpers.utils";
import {
  getPoolInfo,
  getUserTokenBalance,
  getTokenList,
  findTokenByProcess,
  formatTokenAmount,
  type PoolInfo,
  type Token,
  addLiquidity,
  checkPoolExists,
  addLiquidityHandlerFn,
  removeLiquidity,
  burnLiquidityParams,
  getUserLpPositions,
} from "@/lib/api";
import { useAuth } from "@/hooks/use-global-state";
import { LiquidityTokenInput } from "@/components/liquidity/LiquidityTokenInput";
import { clampDecimals } from "@/components/liquidity/shared";
import { DEX, OrderStatus } from "@/types/pool.types";
import { useAo } from "@/hooks/use-ao";
import { ConnectButton } from "@arweave-wallet-kit/react";
import {
  luaProcessId,
  poolTokensExchangeRates,
} from "@/lib/constants/index.constants";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { PositionData } from "./Dashboard";

export const LiquidityPage = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const processId = searchParams.get("processId") || "";
  const dex = searchParams.get("dex") as DEX;
  const type = searchParams.get("type");

  return <LiquidityComponent processId={processId} dex={dex} type={type} />;
};

export function LiquidityComponent({
  processId,
  dex,
  type,
}: {
  processId: string;
  dex: DEX;
  type: string;
}) {
  const navigate = useNavigate();
  const { wallet } = useAuth();
  const ao = useAo();

  // Determine active tab based on query parameter
  const activeTab = useMemo(() => {
    return type === "remove" ? "remove" : "add";
  }, [type]);

  const handleTabChange = (value: string) => {
    const newSearchParams = new URLSearchParams();
    if (processId) newSearchParams.set("processId", processId);
    if (dex) newSearchParams.set("dex", dex);
    newSearchParams.set("type", value);
    navigate(`/liquidity?${newSearchParams.toString()}`);
  };

  // Pool and token data
  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null);
  const [availableTokens, setAvailableTokens] = useState<Token[]>([]);
  const [tokenA, setTokenA] = useState<Token | null>(null);
  const [tokenB, setTokenB] = useState<Token | null>(null);
  const [tokenABalance, setTokenABalance] = useState<string>("0");
  const [tokenBBalance, setTokenBBalance] = useState<string>("0");
  const [lpTokenBalance, setLpTokenBalance] = useState<string>("0");

  // User LP position for current pool
  const [currentPoolPosition, setCurrentPoolPosition] =
    useState<PositionData | null>(null);

  // Form state - Add liquidity
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [openConfirmAdd, setOpenConfirmAdd] = useState(false);

  // Track which input was last changed to prevent infinite loops
  const [lastChanged, setLastChanged] = useState<"A" | "B" | null>(null);

  // Form state - Remove liquidity
  const [percent, setPercent] = useState<number[]>([20]);
  const [openConfirmRemove, setOpenConfirmRemove] = useState(false);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [orderStatus, setOrderStatus] = useState<OrderStatus>();
  const [isBackgroundUpdating, setIsBackgroundUpdating] = useState(false);

  // Transfer process state
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferStep, setTransferStep] = useState<
    | "idle"
    | "first_transfer"
    | "second_transfer"
    | "stake_message"
    | "liquidity_message"
    | "complete"
    | "error"
  >("idle");

  // Remove liquidity process state
  const [isRemovingLiquidity, setIsRemovingLiquidity] = useState(false);
  const [removeTransactionId, setRemoveTransactionId] = useState<string | null>(
    null,
  );

  // Processing timeline configuration (in milliseconds)
  // BOTEGA: 3 steps - first_transfer → second_transfer → liquidity_message
  // PERMASWAP: 4 steps - first_transfer → second_transfer → stake_message → liquidity_message
  const PROCESSING_TIMELINE = {
    PERMASWAP: {
      stake_message: 90000, // 1.5 minutes - Smart contract processing time
      liquidity_message: 30000, // 30 seconds - Final confirmation
    },
    BOTEGA: {
      liquidity_message: 30000, // 30 seconds - Direct to final step
    },
  };
  const [transferError, setTransferError] = useState<string | null>(null);

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
          getPoolInfo(processId, dex),
        ]);

        setAvailableTokens(tokens);
        setPoolInfo(pool);
        console.log(pool);
        // Check if pool  info was loaded successfully
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
          toast.error("Pool tokens not found. Please reload the page.");
        }
      } catch (err) {
        console.error("Error loading liquidity data:", err);
        setError("Failed to load pool data");
        toast.error("Error loading pool data. Please reload the page.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [processId]);

  // Function to refresh data in background
  const refreshData = async () => {
    if (!processId || isBackgroundUpdating) return;

    try {
      setIsBackgroundUpdating(true);

      // Refresh pool info
      const pool = await getPoolInfo(processId, dex);
      if (pool) {
        setPoolInfo(pool);
      }

      // Refresh token balances if wallet is connected
      if (wallet?.address && tokenA && tokenB) {
        const [balanceA, balanceB] = await Promise.all([
          getUserTokenBalance(ao, tokenA.process, wallet.address),
          getUserTokenBalance(ao, tokenB.process, wallet.address),
        ]);
        setTokenABalance(balanceA.balance);
        setTokenBBalance(balanceB.balance);
      }

      // Refresh LP token balance if wallet is connected
      if (wallet?.address) {
        const lpBalance = await getUserTokenBalance(
          ao,
          processId,
          wallet.address,
        );
        setLpTokenBalance(lpBalance.balance);
      }
    } catch (err) {
      console.error("Error refreshing data:", err);
      // Don't show toast for background updates to avoid spamming user
    } finally {
      setIsBackgroundUpdating(false);
    }
  };

  const loadAllBalances = async () => {
    if (!wallet?.address || loadingBalances) return;

    try {
      setLoadingBalances(true);

      // Load token balances if tokens are available
      if (tokenA && tokenB) {
        const [balanceA, balanceB] = await Promise.all([
          getUserTokenBalance(ao, tokenA.process, wallet.address),
          getUserTokenBalance(ao, tokenB.process, wallet.address),
        ]);
        setTokenABalance(balanceA.balance);
        setTokenBBalance(balanceB.balance);
      }

      // Load LP token balance
      if (processId) {
        const lpBalance = await getUserTokenBalance(
          ao,
          processId,
          wallet.address,
        );
        setLpTokenBalance(lpBalance.balance);
      }
    } catch (err) {
      console.error("Error loadin g balances:", err);
      toast.error("Failed to load token balances");
    } finally {
      setLoadingBalances(false);
    }
  };

  // Fetch user LP positions and find current pool position
  const loadUserLpPositions = async () => {
    if (!wallet?.address || !processId) return;

    try {
      const positions = await getUserLpPositions(
        ao,
        luaProcessId,
        wallet.address,
      );

      // Find the current pool position
      const currentPosition = Object.values(positions).find(
        (pos: any) => pos.processId === processId || pos.address === processId,
      );

      setCurrentPoolPosition(currentPosition as PositionData);
    } catch (err) {
      console.error("Error loading user LP positions:", err);
      setCurrentPoolPosition(null as PositionData);
    }
  };

  // Load token balances and LP balance when wallet becomes available
  useEffect(() => {
    const loadBalancesWhenWalletReady = async () => {
      if (wallet?.address && !loadingBalances) {
        await loadAllBalances();
      }
    };

    loadBalancesWhenWalletReady();
  }, [wallet?.address, tokenA, tokenB, processId]);

  // Load user LP positions when remove tab is active
  useEffect(() => {
    if (activeTab === "remove" && wallet?.address && processId) {
      loadUserLpPositions();
    }
  }, [activeTab, wallet?.address, processId]);

  // Calculate price ratio using hardcoded exchange rates
  const priceAtoB = useMemo(() => {
    if (!processId) return 1;

    const exchangeRate = poolTokensExchangeRates[processId];
    if (exchangeRate === undefined) return 1;

    return exchangeRate;
  }, [processId]);

  // Handle amount changes with automatic rate calculation
  const handleAmountAChange = (value: string) => {
    setAmountA(value);
    setLastChanged("A");

    // Auto-calculate the other amount if we have a valid price ratio
    if (priceAtoB > 0 && value) {
      const amountAValue = parseFloat(value) || 0;
      const calculatedAmountB = amountAValue * priceAtoB;
      const clampedAmountB = clampDecimals(
        String(calculatedAmountB),
        tokenB?.decimals || 18,
      );
      setAmountB(clampedAmountB);
    }
  };

  const handleAmountBChange = (value: string) => {
    setAmountB(value);
    setLastChanged("B");

    // Auto-calculate the other amount if we have a valid price ratio
    if (priceAtoB > 0 && value) {
      const amountBValue = parseFloat(value) || 0;
      const calculatedAmountA = amountBValue / priceAtoB;
      const clampedAmountA = clampDecimals(
        String(calculatedAmountA),
        tokenA?.decimals || 18,
      );
      setAmountA(clampedAmountA);
    }
  };

  const vA = parseFloat(amountA) || 0;
  const vB = parseFloat(amountB) || 0;

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

  // Helper function to format LP token amounts with denomination of 12
  const formatLPTokenAmount = (amount: string): string => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return "0";
    // LP tokens have denomination of 12, so divide by 10^12
    const divisor = Math.pow(10, 12);
    return (numAmount / divisor).toFixed(2);
  };

  // Calculate user's pooled amounts based on their LP token balance
  const pooled = useMemo(() => {
    if (!poolInfo || !lpTokenBalance || parseFloat(lpTokenBalance) === 0) {
      return { tokenA: 0, tokenB: 0 };
    }

    const totalSupply = parseFloat(poolInfo.totalSupply);
    const userLPBalance = parseFloat(lpTokenBalance);
    const userShare = userLPBalance / totalSupply;

    // Calculate user's token amounts based on their share of the pool
    let tokenAAmount = 0;
    let tokenBAmount = 0;

    if (
      poolInfo.px &&
      poolInfo.py &&
      poolInfo.decimalsX &&
      poolInfo.decimalsY
    ) {
      // Use pool reserves if available
      const totalTokenA = parseFloat(
        formatTokenAmount(poolInfo.px, poolInfo.decimalsX),
      );
      const totalTokenB = parseFloat(
        formatTokenAmount(poolInfo.py, poolInfo.decimalsY),
      );

      tokenAAmount = totalTokenA * userShare;
      tokenBAmount = totalTokenB * userShare;
    } else if (priceAtoB > 0) {
      // Fallback: estimate based on exchange rate and one token amount
      // This is less accurate but works when pool reserves aren't available
      const estimatedTokenA = userLPBalance / Math.sqrt(priceAtoB);
      tokenAAmount = estimatedTokenA;
      tokenBAmount = estimatedTokenA * priceAtoB;
    }

    return {
      tokenA: tokenAAmount,
      tokenB: tokenBAmount,
    };
  }, [poolInfo, lpTokenBalance, priceAtoB]);

  // Calculate remove amounts based on user's actual position
  const removeOut = useMemo(() => {
    if (!currentPoolPosition) {
      return { tokenA: 0, tokenB: 0, lpTokens: 0 };
    }

    const percentage = percent[0] / 100;
    const lpTokensToRemove = currentPoolPosition.yielder_lp_token * percentage;

    return {
      tokenA: currentPoolPosition.user_token_x * percentage,
      tokenB: currentPoolPosition.user_token_y * percentage,
      lpTokens: lpTokensToRemove,
    };
  }, [currentPoolPosition, percent]);

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

    // Check if pool exists for this new token pair
    const newTokenA = isTokenA ? newToken.process : otherToken.process;
    const newTokenB = isTokenA ? otherToken.process : newToken.process;

    try {
      const newPoolProcessId = await checkPoolExists(ao, newTokenA, newTokenB);

      if (!newPoolProcessId) {
        toast.error("No pool available for this token pair");
        return;
      }

      // Pool exists, update states
      if (isTokenA) {
        setTokenA(newToken);
      } else {
        setTokenB(newToken);
      }

      // Reset form states for new pool
      setAmountA("");
      setAmountB("");
      setLpTokenBalance("0");

      // Update search params with new pool processId
      const newSearchParams = new URLSearchParams();
      newSearchParams.set("processId", newPoolProcessId);
      if (dex) newSearchParams.set("dex", dex);
      if (activeTab === "remove") newSearchParams.set("type", "remove");

      // Navigate to new pool
      navigate(`/liquidity?${newSearchParams.toString()}`);

      // Load balances for new pool if wallet connected
      if (wallet?.address) {
        try {
          // Load balance for the new token specifically
          const balance = await getUserTokenBalance(
            ao,
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
      console.error("Error checking pool existence:", err);
      toast.error("Failed to check pool availability");
    }
  };

  // Helper function for BOTEGA liquidity addition (3 steps)
  const addLiquidityBotega = async () => {
    console.log("[BOTEGA] Starting 3-step liquidity addition process");

    setTransferStep("first_transfer");
    const [firstTransfer, secondTransfer] = await addLiquidity(
      dex,
      ao,
      {
        tokenA: {
          token: tokenA.process as string,
          quantity: BigInt(Math.floor(vA * Math.pow(10, tokenA.decimals))),
        },
        tokenB: {
          token: tokenB.process as string,
          quantity: BigInt(Math.floor(vB * Math.pow(10, tokenB.decimals))),
        },
        pool: luaProcessId,
        slippageTolerance: 0.5,
      },
      () => {
        setTransferStep("second_transfer");
      },
      () => {
        setTransferStep("liquidity_message");
      },
    );

    console.log(
      "[BOTEGA] Both transfers completed, proceeding to liquidity message",
    );

    await new Promise((resolve) =>
      setTimeout(resolve, PROCESSING_TIMELINE.BOTEGA.liquidity_message),
    );

    const finalResult = await addLiquidityHandlerFn(
      ao,
      {
        pool: processId,
        tokenA: {
          token: tokenA.process as string,
          quantity: Math.floor(vA * Math.pow(10, tokenA.decimals)).toString(),
          reservePool: poolInfo.px,
        },
        tokenB: {
          token: tokenB.process as string,
          quantity: Math.floor(vB * Math.pow(10, tokenB.decimals)).toString(),
          reservePool: poolInfo.py,
        },
        activeWalletAddress: wallet.address,
        totalLPSupplyOfTargetPool: poolInfo?.totalSupply,
      },
      dex,
      () => {
        setTransferStep("liquidity_message");
      },
      () => {
        setTransferStep("complete");
      },
    );

    console.log("[BOTEGA] Liquidity addition completed");
    return finalResult;
  };

  // Helper function for PERMASWAP liquidity addition (4 steps)
  const addLiquidityPermaswap = async () => {
    console.log("[PERMASWAP] Starting 4-step liquidity addition process");

    setTransferStep("first_transfer");
    const [firstTransfer, secondTransfer] = await addLiquidity(
      dex,
      ao,
      {
        tokenA: {
          token: tokenA.process as string,
          quantity: BigInt(Math.floor(vA * Math.pow(10, tokenA.decimals))),
        },
        tokenB: {
          token: tokenB.process as string,
          quantity: BigInt(Math.floor(vB * Math.pow(10, tokenB.decimals))),
        },
        pool: luaProcessId,
        slippageTolerance: 0.5,
      },
      () => {
        setTransferStep("second_transfer");
      },
      () => {
        setTransferStep("stake_message");
      },
    );

    console.log(
      "[PERMASWAP] Both transfers completed, proceeding to stake message",
    );

    await new Promise((resolve) =>
      setTimeout(resolve, PROCESSING_TIMELINE.PERMASWAP.stake_message),
    );
    let finalResult;
    try {
      finalResult = await addLiquidityHandlerFn(
        ao,
        {
          pool: processId,
          tokenA: {
            token: tokenA.process as string,
            quantity: Math.floor(vA * Math.pow(10, tokenA.decimals)).toString(),
            reservePool: poolInfo.px,
          },
          tokenB: {
            token: tokenB.process as string,
            quantity: Math.floor(vB * Math.pow(10, tokenB.decimals)).toString(),
            reservePool: poolInfo.py,
          },
          activeWalletAddress: wallet.address,
          totalLPSupplyOfTargetPool: poolInfo?.totalSupply,
        },
        dex,
        () => {
          setTransferStep("liquidity_message");
        },
        () => {
          setTransferStep("complete");
        },
      );
      console.log("[PERMASWAP] Liquidity addition completed");
      return finalResult;
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddLiquidity = async () => {
    console.log(poolInfo);

    // Reset transfer state
    setIsTransferring(true);
    setTransferStep("first_transfer");
    setTransferError(null);

    try {
      let finalResult: any;

      if (dex === DEX.BOTEGA) {
        finalResult = await addLiquidityBotega();
      } else {
        finalResult = await addLiquidityPermaswap();
      }

      console.log("Final result:", finalResult);
      setOrderStatus("success");

      setTimeout(() => {
        setOpenConfirmAdd(false);
        setIsTransferring(false);
        setTransferStep("idle");
        toast.success("Liquidity added successfully!");
        setAmountA("");
        setAmountB("");
        refreshData();
      }, 2000);
    } catch (error) {
      console.error("Error adding liquidity:", error);
      setTransferStep("error");
      setTransferError(
        error instanceof Error ? error.message : "Unknown error occurred",
      );
      setOrderStatus("error");

      toast.error("Error adding liquidity. Please try again.");
    }
  };

  const handleRemoveLiquidity = async () => {
    if (!currentPoolPosition) {
      toast.error("No position found for this pool");
      return;
    }

    // Reset states
    setIsRemovingLiquidity(true);
    setRemoveTransactionId(null);

    try {
      const transactionId = await removeLiquidity(
        ao,
        {
          pool: processId,
          userWalletAddress: wallet?.address,
          tokenA: {
            token: tokenA.process,
          },
          tokenB: {
            token: tokenB.process,
          },
          yielderLpTokenQuantity: Math.floor(
            removeOut.lpTokens * Math.pow(10, 12),
          ).toString(),
        },
        dex,
      );
      setRemoveTransactionId(transactionId);

      toast.success(`Liquidity removed successfully!`, {
        id: "remove-liquidity",
        description: (
          <div className="flex items-center gap-2">
            <span>Transaction ID: {transactionId.substring(0, 5)}...</span>
            <a
              href={`https://ao.link/#/entity/${transactionId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700 underline"
            >
              <ExternalLink className="size-3.5 hover:text-blue-700" />
            </a>
          </div>
        ),
        duration: 10000,
      });

      setOpenConfirmRemove(false);

      await refreshData();
    } catch (error) {
      console.error("Error removing liquidity:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      toast.error("Failed to remove liquidity", {
        id: "remove-liquidity",
        description: errorMessage,
      });
    } finally {
      setIsRemovingLiquidity(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center pb-4 px-4">
        <div className="w-full max-w-md">
          <div className="mb-4 sm:mb-6 flex items-center gap-2">
            <ArrowLeft
              onClick={() => {
                window.history.back();
              }}
              className="h-5 w-5 sm:h-6 sm:w-6"
            />
            <h1 className="text-xl sm:text-2xl font-semibold">Liquidity</h1>
          </div>

          <div className="rounded-[16px] border bg-card p-3 sm:p-4 shadow-[0_4px_16px_rgba(0,0,0,0.05)] mb-4">
            <div className="grid grid-cols-[1fr_auto] items-start gap-3 sm:gap-4 text-sm">
              <div className="space-y-1 min-w-0">
                <div className="font-semibold flex items-center gap-2">
                  {poolInfo ? (
                    <span className="truncate text-sm sm:text-base">
                      {poolInfo.symbolX} / {poolInfo.symbolY}
                    </span>
                  ) : (
                    <Skeleton className="h-5 w-24 sm:w-32" />
                  )}
                  {isBackgroundUpdating && (
                    <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground flex-shrink-0" />
                  )}
                  <Copy
                    className="cursor-pointer h-3 w-3 text-muted-foreground hover:text-foreground flex-shrink-0"
                    onClick={() => {
                      window.navigator.clipboard.writeText(processId);
                      toast.success("Copied to clipboard");
                    }}
                  />
                </div>
                <div className="text-muted-foreground flex items-baseline gap-2">
                  <span className="text-xs sm:text-sm whitespace-nowrap">
                    My Liquidity:
                  </span>
                  {activeTab === "remove" ? (
                    <span className="text-xs sm:text-sm">
                      {currentPoolPosition ? (
                        currentPoolPosition.yielder_lp_token
                      ) : (
                        <Skeleton className="h-4 w-8 sm:w-12" />
                      )}
                    </span>
                  ) : poolInfo && wallet?.address ? (
                    parseFloat(lpTokenBalance) > 0 ? (
                      <span className="text-xs sm:text-sm">
                        {formatLPTokenAmount(lpTokenBalance)} LP
                      </span>
                    ) : (
                      <span className="text-xs sm:text-sm">0 LP</span>
                    )
                  ) : (
                    <Skeleton className="h-4 w-8 sm:w-12" />
                  )}
                </div>
              </div>

              {/* Right section */}
              <div className="rounded-full border px-2 py-1 text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
                {poolInfo ? (
                  `${poolInfo ? (parseFloat(poolInfo.fee) / 100).toFixed(2) : "NA"}%`
                ) : (
                  <Skeleton className="h-3.5 w-6 sm:w-8" />
                )}
                {" fee"}
              </div>
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="add" className="flex items-center gap-2">
                Add
              </TabsTrigger>
              <TabsTrigger value="remove" className="flex items-center gap-2">
                Remove
              </TabsTrigger>
            </TabsList>

            <TabsContent value="add" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="space-y-4"
              >
                <div className="relative space-y-1">
                  {/* Token A Input */}
                  <LiquidityTokenInput
                    token={tokenA}
                    value={amountA}
                    onValueChange={handleAmountAChange}
                    availableTokens={availableTokens}
                    onTokenChange={(token) => handleTokenChange(token, true)}
                    balance={tokenABalance}
                    balanceFormatted={tokenABalanceFormatted}
                    loadingBalances={loadingBalances}
                    decimals={tokenA?.decimals || 18}
                    insufficientBalance={insufficientA}
                    onMaxClick={() => {
                      const max = tokenABalanceFormatted;
                      setAmountA(clampDecimals(String(max), tokenA!.decimals));
                      setLastChanged("A");
                      // Auto-calculate the other amount
                      const calculatedAmountB = max * priceAtoB;
                      setAmountB(
                        clampDecimals(
                          String(calculatedAmountB),
                          tokenB!.decimals,
                        ),
                      );
                    }}
                  />

                  {/* Plus Icon - Small and overlapping */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                    <div className="flex items-center justify-center w-6 h-6 bg-background border border-primary/30 rounded-full shadow-sm">
                      <PlusCircle className="h-full w-full text-primary" />
                    </div>
                  </div>

                  {/* Token B Input */}
                  <LiquidityTokenInput
                    token={tokenB}
                    value={amountB}
                    onValueChange={handleAmountBChange}
                    availableTokens={availableTokens}
                    onTokenChange={(token) => handleTokenChange(token, false)}
                    balance={tokenBBalance}
                    balanceFormatted={tokenBBalanceFormatted}
                    loadingBalances={loadingBalances}
                    decimals={tokenB?.decimals || 18}
                    insufficientBalance={insufficientB}
                    onMaxClick={() => {
                      const max = tokenBBalanceFormatted;
                      setAmountB(clampDecimals(String(max), tokenB!.decimals));
                      setLastChanged("B");
                      // Auto-calculate the other amount
                      const calculatedAmountA = max / priceAtoB;
                      setAmountA(
                        clampDecimals(
                          String(calculatedAmountA),
                          tokenA!.decimals,
                        ),
                      );
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    You will receive LP tokens representing your position.
                  </div>
                  <Dialog
                    open={openConfirmAdd}
                    onOpenChange={(open) => {
                      // Prevent closing modal during transfer process
                      if (
                        isTransferring &&
                        (transferStep === "first_transfer" ||
                          transferStep === "second_transfer" ||
                          transferStep === "stake_message" ||
                          transferStep === "liquidity_message")
                      ) {
                        return; // Don't allow closing during active transfer
                      }
                      setOpenConfirmAdd(open);
                    }}
                  >
                    <ProtectedRoute
                      fallback={<ConnectButton className="text-black" />}
                    >
                      <DialogTrigger asChild>
                        <Button disabled={!valid || loading}>
                          Add Liquidity
                        </Button>
                      </DialogTrigger>
                    </ProtectedRoute>
                    <DialogContent className="rounded-2xl p-0 overflow-hidden border bg-white max-w-md sm:max-w-lg md:max-w-2xl mx-auto">
                      {/* Header */}
                      <div className="border-b bg-white">
                        <DialogHeader className="px-4 py-3 sm:px-6">
                          <DialogTitle className="text-balance text-lg sm:text-xl font-semibold text-neutral-900">
                            {isTransferring
                              ? "Processing Liquidity Addition"
                              : "Confirm Add Liquidity"}
                          </DialogTitle>
                        </DialogHeader>
                      </div>

                      {/* Helpers: steps + progress */}
                      {(() => {
                        const hasStakeStep = dex !== DEX.BOTEGA;
                        const steps = [
                          {
                            id: "first_transfer" as const,
                            label: `Transfer ${tokenA?.symbol || "Token A"}`,
                            sub: `${formatAmount(vA)} ${tokenA?.symbol || ""}`,
                          },
                          {
                            id: "second_transfer" as const,
                            label: `Transfer ${tokenB?.symbol || "Token B"}`,
                            sub: `${formatAmount(vB)} ${tokenB?.symbol || ""}`,
                          },
                          ...(hasStakeStep
                            ? [
                                {
                                  id: "stake_message" as const,
                                  label: "Staking",
                                  sub: `Processing stake (~${
                                    PROCESSING_TIMELINE.PERMASWAP
                                      .stake_message / 1000
                                  }s)`,
                                },
                              ]
                            : []),
                          {
                            id: "liquidity_message" as const,
                            label: "Adding Liquidity",
                            sub: `Finalizing (~${
                              PROCESSING_TIMELINE[
                                dex === DEX.BOTEGA ? "BOTEGA" : "PERMASWAP"
                              ].liquidity_message / 1000
                            }s)`,
                          },
                        ];

                        type StepId = (typeof steps)[number]["id"];
                        const order: Record<
                          StepId | "complete" | "error" | "idle",
                          number
                        > = {
                          first_transfer: 0,
                          second_transfer: 1,
                          stake_message: hasStakeStep ? 2 : 999,
                          liquidity_message: hasStakeStep ? 3 : 2,
                          complete: 9999,
                          error: 9998,
                          idle: -1,
                        };

                        const currentIdx =
                          transferStep === "complete"
                            ? steps.length - 1
                            : transferStep === "error"
                              ? steps.findIndex(
                                  (s) => s.id === "liquidity_message",
                                )
                              : steps.findIndex(
                                  (s) => s.id === (transferStep as StepId),
                                );

                        const completedCount =
                          transferStep === "complete"
                            ? steps.length
                            : Math.max(0, currentIdx); // steps strictly before current are "completed"
                        const total = steps.length;
                        const progress =
                          transferStep === "complete"
                            ? 100
                            : Math.round((completedCount / total) * 100);

                        const statusFor = (id: StepId) => {
                          if (
                            transferStep === "error" &&
                            id === "liquidity_message"
                          )
                            return "failed";
                          if (transferStep === "complete") return "complete";
                          if (id === transferStep) return "processing";
                          return order[id] < currentIdx
                            ? "complete"
                            : "waiting";
                        };

                        const StatusBadge = ({
                          s,
                        }: {
                          s: "processing" | "complete" | "waiting" | "failed";
                        }) => {
                          const map = {
                            processing:
                              "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
                            complete:
                              "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
                            waiting:
                              "bg-neutral-50 text-neutral-600 ring-1 ring-inset ring-neutral-200",
                            failed:
                              "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
                          };
                          const label =
                            s === "processing"
                              ? "Processing"
                              : s === "complete"
                                ? "Complete"
                                : s === "failed"
                                  ? "Failed"
                                  : "Waiting";
                          return (
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${map[s]}`}
                            >
                              {label}
                            </span>
                          );
                        };

                        const StepIcon = ({
                          s,
                        }: {
                          s: "processing" | "complete" | "waiting" | "failed";
                        }) => {
                          if (s === "processing")
                            return (
                              <Loader2
                                className="h-5 w-5 text-blue-600 animate-spin"
                                aria-hidden="true"
                              />
                            );
                          if (s === "complete")
                            return (
                              <CheckCircle2
                                className="h-5 w-5 text-emerald-600"
                                aria-hidden="true"
                              />
                            );
                          if (s === "failed")
                            return (
                              <XCircle
                                className="h-5 w-5 text-red-600"
                                aria-hidden="true"
                              />
                            );
                          return (
                            <Circle
                              className="h-5 w-5 text-neutral-300"
                              aria-hidden="true"
                            />
                          );
                        };

                        return (
                          <>
                            <div className="px-4 pt-3 sm:px-6">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-xs text-neutral-500">
                                  {isTransferring
                                    ? `Step ${Math.min(completedCount + 1, total)} of ${total}`
                                    : `0 of ${total} steps`}
                                </div>
                                <div className="text-xs font-medium text-neutral-700">
                                  {progress}%
                                </div>
                              </div>
                              <Progress
                                value={isTransferring ? progress : 0}
                                className="h-2"
                              />
                            </div>

                            {/* Content */}
                            <div className="px-4 pb-2 pt-2 sm:px-6">
                              {!isTransferring ? (
                                <p className="text-sm text-neutral-600">
                                  Review the details above and confirm to start
                                  the transfer sequence.
                                </p>
                              ) : (
                                // Processing timeline
                                <div className="mt-2">
                                  <ul className="space-y-3">
                                    <AnimatePresence initial={false}>
                                      {steps.map((step, idx) => {
                                        const s = statusFor(step.id);
                                        return (
                                          <motion.li
                                            key={step.id}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -8 }}
                                            transition={{
                                              duration: 0.2,
                                              ease: "easeOut",
                                            }}
                                          >
                                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between rounded-xl border bg-white px-3 py-3 shadow-sm gap-2">
                                              <div className="flex items-center gap-3">
                                                <StepIcon s={s as any} />
                                                <div className="flex min-w-0 flex-col">
                                                  <div className=" text-sm font-medium text-neutral-900">
                                                    {step.label}
                                                  </div>
                                                  <div className="text-xs text-neutral-500">
                                                    {step.sub}
                                                  </div>
                                                </div>
                                              </div>
                                              <StatusBadge s={s as any} />
                                            </div>

                                            {/* {idx < steps.length - 1 && (
                                              <div
                                                className={`absolute left-[10px] top-6 h-[24px] w-px ${
                                                  s === "complete" ||
                                                  s === "processing"
                                                    ? "bg-blue-400"
                                                    : "bg-transparent"
                                                }`}
                                                aria-hidden="true"
                                              />
                                            )} */}
                                          </motion.li>
                                        );
                                      })}
                                    </AnimatePresence>
                                  </ul>

                                  <AnimatePresence>
                                    {transferStep === "error" &&
                                      transferError && (
                                        <motion.div
                                          initial={{ opacity: 0, y: 8 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          exit={{ opacity: 0, y: -8 }}
                                          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                                          role="alert"
                                        >
                                          <div className="font-medium">
                                            Transaction Failed
                                          </div>
                                          <div className="mt-1 text-xs">
                                            {transferError}
                                          </div>
                                        </motion.div>
                                      )}
                                  </AnimatePresence>

                                  <AnimatePresence>
                                    {transferStep === "complete" && (
                                      <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
                                        role="status"
                                      >
                                        <div className="font-medium">
                                          Liquidity Added Successfully
                                        </div>
                                        <div className="mt-1 text-xs">
                                          Your tokens have been added to the
                                          liquidity pool.
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              )}
                            </div>

                            {/* Footer actions */}
                            <div className="border-t bg-white px-4 py-3 sm:px-6">
                              <DialogFooter className="gap-2 sm:justify-end">
                                {!isTransferring &&
                                transferStep !== "error" &&
                                transferStep !== "complete" ? (
                                  <Button
                                    onClick={handleAddLiquidity}
                                    className="min-w-28 w-full sm:w-auto"
                                  >
                                    Confirm
                                  </Button>
                                ) : transferStep === "error" ? (
                                  <div className="flex w-full gap-2 sm:w-auto flex-col sm:flex-row">
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        setOpenConfirmAdd(false);
                                        setIsTransferring(false);
                                        setTransferStep("idle");
                                        setTransferError(null);
                                      }}
                                      className="flex-1 sm:flex-none"
                                    >
                                      Close
                                    </Button>
                                    <Button
                                      onClick={() => handleAddLiquidity()}
                                      className="flex-1 sm:flex-none"
                                    >
                                      Retry
                                    </Button>
                                  </div>
                                ) : transferStep === "complete" ? (
                                  <Button
                                    onClick={() => {
                                      setOpenConfirmAdd(false);
                                      setIsTransferring(false);
                                      setTransferStep("idle");
                                    }}
                                    className="min-w-28 w-full sm:w-auto"
                                  >
                                    Done
                                  </Button>
                                ) : (
                                  <Button
                                    disabled
                                    className="min-w-36 w-full sm:w-auto"
                                  >
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                  </Button>
                                )}
                              </DialogFooter>
                            </div>
                          </>
                        );
                      })()}
                    </DialogContent>
                  </Dialog>
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="remove" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="space-y-4"
              >
                {/* Percentage slider */}
                <div className="rounded-[16px] border bg-green-50 p-5 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
                  <div className="mb-2 text-3xl font-bold text-green-600 dark:text-green-400">
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
                        className="rounded-full bg-card/70 px-2 py-0.5 text-green-600 dark:text-green-400 shadow-xs transition-colors hover:bg-card"
                        onClick={() => setPercent([t])}
                      >
                        {t}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Token amounts display */}
                <div className="space-y-3">
                  <div className="rounded-[16px] border bg-card p-4 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        LP tokens to burn
                      </span>
                      <span className="text-sm font-medium">
                        {currentPoolPosition ? (
                          removeOut.lpTokens
                        ) : (
                          <Skeleton className="h-4 w-8 sm:w-20" />
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-[16px] border bg-muted/50 p-3 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
                    <div className="text-xs text-muted-foreground flex gap-2">
                      Your position:{" "}
                      {currentPoolPosition ? (
                        `${currentPoolPosition.yielder_lp_token} LP tokens`
                      ) : (
                        <Skeleton className="h-4 w-8 sm:w-20" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Remove Liquidity Button */}
                <Dialog
                  open={openConfirmRemove}
                  onOpenChange={(open) => {
                    // Prevent closing modal during remove liquidity process
                    if (isRemovingLiquidity) {
                      return; // Don't allow closing during active transaction
                    }
                    setOpenConfirmRemove(open);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="filled"
                      disabled={
                        percent[0] === 0 ||
                        loading ||
                        !tokenA ||
                        !tokenB ||
                        !currentPoolPosition
                      }
                    >
                      Remove Liquidity
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-[16px] max-w-md sm:max-w-lg mx-auto">
                    <DialogHeader className="px-4 py-3 sm:px-6">
                      <DialogTitle className="text-lg sm:text-xl">
                        {isRemovingLiquidity
                          ? "Processing Liquidity Removal"
                          : "Confirm Remove"}
                      </DialogTitle>
                    </DialogHeader>

                    {!isRemovingLiquidity ? (
                      <>
                        <div className="px-4 sm:px-6 space-y-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">
                              Percent
                            </span>
                            <span className="font-medium">{percent[0]}%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">
                              LP tokens to burn
                            </span>
                            <span className="font-medium">
                              {removeOut.lpTokens.toFixed(6)}
                            </span>
                          </div>
                        </div>
                        <DialogFooter className="px-4 py-3 sm:px-6 gap-2">
                          <Button
                            onClick={handleRemoveLiquidity}
                            className="w-full sm:w-auto min-w-28"
                          >
                            Confirm
                          </Button>
                        </DialogFooter>
                      </>
                    ) : (
                      <>
                        <div className="px-4 sm:px-6 space-y-4">
                          <div className="flex items-center justify-center py-8">
                            <div className="flex flex-col items-center gap-4">
                              <Loader2 className="h-8 w-8 animate-spin text-primary" />
                              <div className="text-center">
                                <p className="text-sm font-medium">
                                  Removing Liquidity
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Processing your transaction...
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between font-mono text-xs">
                            {removeTransactionId ? (
                              <span className="truncate max-w-32 block">
                                {removeTransactionId}
                              </span>
                            ) : (
                              "Pending..."
                            )}
                          </div>
                        </div>
                        <DialogFooter className="px-4 py-3 sm:px-6 gap-2">
                          <Button
                            disabled
                            className="w-full sm:w-auto min-w-36"
                          >
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </Button>
                        </DialogFooter>
                      </>
                    )}
                  </DialogContent>
                </Dialog>
              </motion.div>
            </TabsContent>
          </Tabs>

          {/* Fee & Rates */}
          {activeTab === "add" && (
            <div className="rounded-[16px] border bg-card p-3 sm:p-4 text-sm shadow-[0_4px_16px_rgba(0,0,0,0.05)] mt-4">
              <div className="grid gap-3 sm:gap-2 text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm">Fee tier</span>
                  <span className="text-foreground flex gap-1 text-xs sm:text-sm">
                    {poolInfo ? (
                      (parseFloat(poolInfo.fee) / 100).toFixed(2)
                    ) : (
                      <Skeleton className="h-4 w-6 sm:w-8" />
                    )}
                    % fee tier
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <span className="text-xs sm:text-sm">Current rates</span>
                  <span className="inline-flex items-center gap-2 text-foreground text-xs sm:text-sm">
                    <span className="whitespace-nowrap">
                      1 {tokenA?.symbol || "..."} ={" "}
                      {poolInfo ? (
                        <span className="font-mono">
                          {priceAtoB.toFixed(6)}
                        </span>
                      ) : (
                        <Skeleton className="h-4 w-12" />
                      )}{" "}
                      {tokenB?.symbol || "..."}
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm">Range</span>
                  <span className="text-foreground text-xs sm:text-sm">
                    Full Range
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
