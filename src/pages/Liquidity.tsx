import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Copy, PlusCircle, RefreshCw } from "lucide-react";
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
} from "@/lib/api";
import { useAuth } from "@/hooks/use-global-state";
import { LiquidityTokenInput } from "@/components/liquidity/LiquidityTokenInput";
import { clampDecimals, ValueSkeleton } from "@/components/liquidity/shared";
import { DEX, OrderStatus } from "@/types/pool.types";
import { useAo } from "@/hooks/use-ao";
import { ConnectButton } from "@arweave-wallet-kit/react";
import { poolTokensExchangeRates } from "@/lib/constants/index.constants";

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
          getUserTokenBalance(tokenA.process, wallet.address),
          getUserTokenBalance(tokenB.process, wallet.address),
        ]);
        setTokenABalance(balanceA.balance);
        setTokenBBalance(balanceB.balance);
      }

      // Refresh LP token balance if wallet is connected
      if (wallet?.address) {
        const lpBalance = await getUserTokenBalance(processId, wallet.address);
        setLpTokenBalance(lpBalance.balance);
      }
    } catch (err) {
      console.error("Error refreshing data:", err);
      // Don't show toast for background updates to avoid spamming user
    } finally {
      setIsBackgroundUpdating(false);
    }
  };

  // Background cron to refresh data every 20 seconds
  // useEffect(() => {
  //   if (!processId) return;

  //   const intervalId = setInterval(() => {
  //     refreshData();
  //   }, 12000); // 20 seconds

  //   // Cleanup interval on unmount or processId change
  //   return () => clearInterval(intervalId);
  // }, [processId, wallet?.address, tokenA, tokenB, isBackgroundUpdating]);

  // Load token balances and LP balance when wallet becomes available
  useEffect(() => {
    const loadBalancesWhenWalletReady = async () => {
      if (wallet?.address && processId && !loadingBalances) {
        await loadLPTokenBalance(wallet.address);
      }
      if (wallet?.address && tokenA && tokenB && !loadingBalances) {
        await loadTokenBalances(tokenA, tokenB, wallet.address);
      }
    };

    loadBalancesWhenWalletReady();
  }, [wallet?.address, tokenA, tokenB, processId]);

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

  // Load LP token balance
  const loadLPTokenBalance = async (walletAddress: string) => {
    try {
      setLoadingBalances(true);
      const lpBalance = await getUserTokenBalance(processId, walletAddress);
      setLpTokenBalance(lpBalance.balance);
    } catch (err) {
      console.error("Error loading LP token balance:", err);
      setLpTokenBalance("0");
    } finally {
      setLoadingBalances(false);
    }
  };

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

  const removeOut = {
    tokenA: pooled.tokenA * (percent[0] / 100),
    tokenB: pooled.tokenB * (percent[0] / 100),
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
      console.error("Error checking pool existence:", err);
      toast.error("Failed to check pool availability");
    }
  };

  const [firstTxSigned, setFirstTxSigned] = useState(false);
  let firstTxAccepted = false;

  const handleAddLiquidity = async () => {
    console.log(poolInfo);
    setOpenConfirmAdd(false);
    toast.success("Liquidity added");
    setAmountA("");
    setAmountB("");

    try {
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
          pool: processId,
          slippageTolerance: 0.5,
        },
        () => {
          setFirstTxSigned(true);
          firstTxAccepted = true;
        },
      );
      console.log("onOrderId", [firstTransfer, secondTransfer]);
      setOrderStatus("pending");

      await new Promise((resolve) => setTimeout(resolve, 16500)); // add delay before fetching result to let smart contracts to process the transaction

      const finalResult = await addLiquidityHandlerFn(ao, {
        pool: processId,
        tokenA: {
          token: tokenA.process as string,
          quantity: BigInt(Math.floor(vA * Math.pow(10, tokenA.decimals))).toString(),
          reservePool: poolInfo.px,
        },
        tokenB: {
          token: tokenB.process as string,
          quantity: BigInt(Math.floor(vB * Math.pow(10, tokenB.decimals))).toString(),
          reservePool: poolInfo.py,
        },
        activeWalletAddress: wallet.address,
        totalLPSupplyOfTargetPool: poolInfo?.totalSupply,
      });
      console.log(finalResult);
    } catch (error) {
      console.error("Error adding liquidity:", error);
      toast.error("Error adding liquidity, Try Again!!");
    }

    console.log("handleAddLiquidity");
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
    <div className="min-hscreen flex flex-col">
      <div className="flex-1 flex items-center justify-center pb-4">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-2">
            <ArrowLeft
              onClick={() => {
                window.location.href = "/";
              }}
            />
            <h1 className="text-2xl font-semibold">Liquidity</h1>
          </div>

          <div className="rounded-[16px] border bg-card p-4 shadow-[0_4px_16px_rgba(0,0,0,0.05)] mb-4">
            <div className="flex items-center justify-between gap-4 text-sm">
              <div>
                <div className="font-semibold flex items-center gap-2">
                  {poolInfo ? (
                    `${poolInfo.symbolX} / ${poolInfo.symbolY}`
                  ) : (
                    <ValueSkeleton className="h-5 w-32" />
                  )}
                  {isBackgroundUpdating && (
                    <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                  )}
                  <Copy
                    className="cursor-pointer h-3 w-3 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      window.navigator.clipboard.writeText(processId);
                      toast.success("Copied to clipboard");
                    }}
                  />
                </div>
                <div className="text-muted-foreground">
                  My Liquidity:{" "}
                  {poolInfo ? (
                    wallet?.address ? (
                      parseFloat(lpTokenBalance) > 0 ? (
                        `${formatLPTokenAmount(lpTokenBalance)} LP`
                      ) : (
                        "0 LP"
                      )
                    ) : (
                      "NA"
                    )
                  ) : (
                    <ValueSkeleton className="h-5 w-10" />
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2">
                {/* <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                  APR{" "}
                  {poolInfo ? "TBD" : <ValueSkeleton className="h-5 w-32" />}%
                </span> */}
                <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
                  {poolInfo ? (
                    `${(parseFloat(poolInfo.fee) / 100).toFixed(2)}% fee`
                  ) : (
                    <ValueSkeleton className="h-4 w-12" />
                  )}
                </span>
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
                    onOpenChange={setOpenConfirmAdd}
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
                          <span className="text-muted-foreground">
                            Fee tier
                          </span>
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
                          onClick={handleAddLiquidity}
                          className="min-w-28"
                        >
                          Confirm
                        </Button>
                      </DialogFooter>
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
                <div className="space-y-1">
                  <LiquidityTokenInput
                    token={tokenA}
                    value={
                      tokenA
                        ? removeOut.tokenA.toFixed(Math.min(tokenA.decimals, 6))
                        : "0"
                    }
                    onValueChange={() => {}} // Read-only
                    availableTokens={availableTokens}
                    onTokenChange={() => {}} // Read-only
                    balance="0"
                    balanceFormatted={0}
                    loadingBalances={false}
                    decimals={tokenA?.decimals || 18}
                    insufficientBalance={false}
                    showMaxButton={false}
                    readOnly={true}
                  />
                  <LiquidityTokenInput
                    token={tokenB}
                    value={
                      tokenB
                        ? removeOut.tokenB.toFixed(Math.min(tokenB.decimals, 6))
                        : "0"
                    }
                    onValueChange={() => {}} // Read-only
                    availableTokens={availableTokens}
                    onTokenChange={() => {}} // Read-only
                    balance="0"
                    balanceFormatted={0}
                    loadingBalances={false}
                    decimals={tokenB?.decimals || 18}
                    insufficientBalance={false}
                    showMaxButton={false}
                    readOnly={true}
                  />
                </div>

                {/* Remove Liquidity Button */}
                <Dialog
                  open={openConfirmRemove}
                  onOpenChange={setOpenConfirmRemove}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="filled"
                      disabled={
                        percent[0] === 0 || loading || !tokenA || !tokenB
                      }
                    >
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
                        <span className="text-muted-foreground">
                          {tokenA?.symbol || "Token A"}
                        </span>
                        <span className="font-medium">
                          {tokenA ? (
                            removeOut.tokenA.toFixed(
                              Math.min(tokenA.decimals, 6),
                            )
                          ) : (
                            <ValueSkeleton />
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          {tokenB?.symbol || "Token B"}
                        </span>
                        <span className="font-medium">
                          {tokenB ? (
                            removeOut.tokenB.toFixed(
                              Math.min(tokenB.decimals, 6),
                            )
                          ) : (
                            <ValueSkeleton />
                          )}
                        </span>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={() => {
                          setOpenConfirmRemove(false);
                          toast.success("Liquidity removed");
                        }}
                      >
                        Confirm
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </motion.div>
            </TabsContent>
          </Tabs>

          {/* Fee & Rates */}
          <div className="rounded-[16px] border bg-card p-4 text-sm shadow-[0_4px_16px_rgba(0,0,0,0.05)] mt-4">
            <div className="grid gap-2 text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Fee tier</span>
                <span className="text-foreground">1.00% fee tier</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Current rates</span>
                <span className="inline-flex items-center gap-2 text-foreground">
                  1 {tokenA?.symbol || "..."} ={" "}
                  {poolInfo ? (
                    priceAtoB.toFixed(6)
                  ) : (
                    <ValueSkeleton className="h-4 w-12" />
                  )}{" "}
                  {tokenB?.symbol || "..."}{" "}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Range</span>
                <span className="text-foreground">Full Range</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
