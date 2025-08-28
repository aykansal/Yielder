export const shortenAddress = (addr: string) => {
  if (!addr) return "";
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
};

export const formatPercent = (value: number) => {
  if (!isFinite(value)) return "—";
  const pct = value * 100;
  if (pct > 0 && pct < 0.01) return "<0.01%";
  return `${pct.toFixed(2)}%`;
};

export const formatUSD = (n: number) => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
  } catch {
    return `$${n}`;
  }
};

export const formatTokenAmount = (n: number, sigFigs = 6) => {
  if (!isFinite(n)) return "—";
  if (n === 0) return "0";
  const str = n.toPrecision(sigFigs);
  return str.replace(/\.0+$/, "").replace(/(\.[1-9]*?)0+$/, "$1");
};
