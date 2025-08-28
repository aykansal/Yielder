import { AppShell } from "@/components/layout/AppShell";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, NavLink } from "react-router";
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
import { formatPercent, formatTokenAmount } from "@/lib/format";

function Tabs({ processId }: { processId: string }) {
  const base = `/liquidity`;
  const tabs = [
    { to: `${base}/add/${processId}`, label: "Add" },
    { to: `${base}/remove/${processId}`, label: "Remove" },
    { to: `${base}/claim/${processId}`, label: "Claim" },
  ];
  return (
    <div className="mt-4 flex gap-4">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          className={({ isActive }) =>
            `pb-1 text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`
          }
        >
          {({ isActive }) => (
            <span className="inline-flex flex-col items-center">
              <span>{t.label}</span>
              <span
                className={`mt-1 h-0.5 w-8 rounded-full transition-all ${isActive ? "bg-[hsl(var(--primary-700))]" : "bg-transparent"}`}
              />
            </span>
          )}
        </NavLink>
      ))}
    </div>
  );
}

// sample data
const TOKENS = [
  { symbol: "wAR", decimals: 6, balance: 120.456789, icon: "/placeholder.svg" },
  { symbol: "ARIO", decimals: 6, balance: 3421.12, icon: "/placeholder.svg" },
  { symbol: "USDC", decimals: 6, balance: 501.02, icon: "/placeholder.svg" },
];

function clampDecimals(value: string, decimals: number) {
  if (!value) return value;
  const [i, f] = value.split(".");
  if (!f) return i;
  return `${i}.${f.slice(0, Math.min(decimals, 18))}`;
}

function sanitizeNumericInput(v: string) {
  return v.replace(/[^0-9.]/g, "").replace(/(\.)(?=.*\1)/g, "");
}

export function LiquidityAdd() {
  const { processId = "" } = useParams();

  const [tokenA, setTokenA] = useState(TOKENS[0]);
  const [tokenB, setTokenB] = useState(TOKENS[1]);
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [linked, setLinked] = useState(true);
  const [ratio, setRatio] = useState<number[]>([50]); // percent for A
  const [openConfirm, setOpenConfirm] = useState(false);

  // price: 1 ARIO = 0.000033 wAR
  const priceAtoB = useMemo(() => {
    if (tokenA.symbol === "ARIO" && tokenB.symbol === "wAR") return 0.000033;
    if (tokenA.symbol === "wAR" && tokenB.symbol === "ARIO")
      return 1 / 0.000033;
    return 1;
  }, [tokenA.symbol, tokenB.symbol]);

  const vA = parseFloat(amountA) || 0;
  const vB = parseFloat(amountB) || 0;
  const pctA = ratio[0] / 100;

  const insufficientA = vA > tokenA.balance;
  const insufficientB = vB > tokenB.balance;
  const valid = vA > 0 && vB > 0 && !insufficientA && !insufficientB;

  const recomputeFromA = (newA: number, pct: number) => {
    if (!linked) return;
    if (pct <= 0) return setAmountB("0");
    const A_in_B = newA * priceAtoB;
    const total_B_units = A_in_B / pct;
    const newB = total_B_units * (1 - pct);
    setAmountB(clampDecimals(String(newB), tokenB.decimals));
  };

  const recomputeFromB = (newB: number, pct: number) => {
    if (!linked) return;
    const B_in_A = newB / priceAtoB;
    const total_A_units = B_in_A / (1 - pct || 1);
    const newA = total_A_units * pct;
    setAmountA(clampDecimals(String(newA), tokenA.decimals));
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Liquidity</h1>
      <div className="mt-4 rounded-[16px] border bg-white p-4 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm">
            <div className="font-semibold">
              {tokenA.symbol} / {tokenB.symbol}
            </div>
            <div className="text-muted-foreground">My Liquidity: 0.000 LP</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
              APR {formatPercent(0.089)}
            </span>
            <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
              1% fee
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <span>0xabcdef…1234</span>
            </span>
          </div>
        </div>
      </div>
      <Tabs processId={processId} />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="mt-6 grid gap-6 md:grid-cols-2"
      >
        <div className="space-y-4">
          {/* Token A input */}
          <div className="rounded-[16px] border bg-white p-4 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
            <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
              <span>Token A</span>
              <button
                className="rounded-full border px-2 py-0.5 text-xs text-[hsl(var(--primary-700))] transition-colors hover:bg-[hsl(var(--primary))]"
                onClick={() => {
                  const max = tokenA.balance;
                  setAmountA(clampDecimals(String(max), tokenA.decimals));
                  recomputeFromA(max, pctA);
                }}
              >
                MAX {formatTokenAmount(tokenA.balance)}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={tokenA.symbol}
                onValueChange={(sym) => {
                  const t = TOKENS.find((x) => x.symbol === sym)!;
                  setTokenA(t);
                }}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {TOKENS.map((t) => (
                    <SelectItem key={t.symbol} value={t.symbol}>
                      {t.symbol}
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
          <div className="rounded-[16px] border bg-white p-4 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
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
          <div className="rounded-[16px] border bg-white p-4 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
            <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
              <span>Token B</span>
              <button
                className="rounded-full border px-2 py-0.5 text-xs text-[hsl(var(--primary-700))] transition-colors hover:bg-[hsl(var(--primary))]"
                onClick={() => {
                  const max = tokenB.balance;
                  setAmountB(clampDecimals(String(max), tokenB.decimals));
                  recomputeFromB(max, pctA);
                }}
              >
                MAX {formatTokenAmount(tokenB.balance)}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={tokenB.symbol}
                onValueChange={(sym) => {
                  const t = TOKENS.find((x) => x.symbol === sym)!;
                  setTokenB(t);
                }}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {TOKENS.map((t) => (
                    <SelectItem key={t.symbol} value={t.symbol}>
                      {t.symbol}
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
                <Button disabled={!valid}>Add Liquidity</Button>
              </DialogTrigger>
              <DialogContent className="rounded-[16px]">
                <DialogHeader>
                  <DialogTitle>Confirm Add Liquidity</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Token A</span>
                    <span className="font-medium">
                      {formatTokenAmount(vA)} {tokenA.symbol}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Token B</span>
                    <span className="font-medium">
                      {formatTokenAmount(vB)} {tokenB.symbol}
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
                      {formatTokenAmount(Math.sqrt(vA * vB))} LP
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
          <div className="rounded-[16px] border bg-white p-4 text-sm shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
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
                  1 ARIO = 0.000033 wAR{" "}
                  <button
                    className="rounded p-1 transition-colors hover:bg-secondary"
                    aria-label="Refresh rates"
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
          <div className="rounded-[16px] border bg-white p-4 text-sm text-muted-foreground shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <span>Share of pool</span>
                <span className="text-foreground">&lt;0.01%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Pooled</span>
                <span className="text-foreground">
                  0.01738629 ARIO & • & 0.000001620 wAR
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AppShell>
  );
}

export function LiquidityRemove() {
  const { processId = "" } = useParams();
  const [percent, setPercent] = useState<number[]>([20]);
  const pooled = { wAR: 0.00000162, ARIO: 0.01738629 };
  const out = {
    wAR: pooled.wAR * (percent[0] / 100),
    ARIO: pooled.ARIO * (percent[0] / 100),
  };
  const [openConfirm, setOpenConfirm] = useState(false);

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Liquidity</h1>
      <Tabs processId={processId} />

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
              <div className="text-muted-foreground">wAR amount</div>
              <div className="mt-1 text-right text-lg font-semibold">
                {out.wAR.toFixed(10)}
              </div>
            </div>
            <div className="rounded-[16px] border bg-white p-4 text-sm shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
              <div className="text-muted-foreground">ARIO amount</div>
              <div className="mt-1 text-right text-lg font-semibold">
                {out.ARIO.toFixed(8)}
              </div>
            </div>
          </div>

          <Dialog open={openConfirm} onOpenChange={setOpenConfirm}>
            <DialogTrigger asChild>
              <Button variant="filled" disabled={percent[0] === 0}>
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
                  <span className="text-muted-foreground">wAR</span>
                  <span className="font-medium">{out.wAR.toFixed(10)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">ARIO</span>
                  <span className="font-medium">{out.ARIO.toFixed(8)}</span>
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
                <span className="text-foreground">1 ARIO = 0.000033 wAR</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Range</span>
                <span className="text-foreground">Full Range</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AppShell>
  );
}

export function LiquidityClaim() {
  const { processId = "" } = useParams();
  const rewards = [
    { symbol: "ARIO", amount: 12.3456, usd: 8.91 },
    { symbol: "wAR", amount: 0.000045, usd: 0.01 },
  ];
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Liquidity</h1>
      <Tabs processId={processId} />
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="mt-6 space-y-4"
      >
        <div className="rounded-[16px] border bg-white p-4 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
          {rewards.length === 0 ? (
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
            <Button onClick={() => toast.success("Claimed rewards")}>
              Claim All
            </Button>
          </div>
        </div>
      </motion.div>
    </AppShell>
  );
}

export function LiquidityRedirect() {
  const nav = useNavigate();
  const loc = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(loc.search);
    const processId = params.get("processId");
    const to = params.get("to");
    if (processId && to) {
      const safeTo =
        to === "add" || to === "remove" || to === "claim" ? to : "add";
      nav(`/liquidity/${safeTo}/${processId}`, { replace: true });
    }
  }, [loc.search, nav]);
  return (
    <AppShell>
      <div className="rounded-[16px] border bg-secondary p-8 text-center text-muted-foreground">
        Redirecting…
      </div>
    </AppShell>
  );
}
