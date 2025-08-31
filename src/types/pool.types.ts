export interface Common {
  name: string;
  ticker: string;
  denomination: string;
  totalSupply: string;
}
export interface Botega extends Common {
  tokenA: string;
  tokenB: string;
  fee: string; // Converted from FeeBps
  logo?: string;
}
export interface Permaswap extends Common {
  symbolX: string;
  symbolY: string;
  tokenA: string; // Mapped from X
  tokenB: string; // Mapped from Y
  decimalsX: number;
  decimalsY: number;
  fullNameX: string;
  fullNameY: string;
  fee: string;
  px: string;
  py: string;
}

export interface PoolInfo {
  name: string;
  ticker: string;
  symbolX: string;
  symbolY: string;
  tokenA: string;
  tokenB: string;
  decimalsX: number;
  decimalsY: number;
  fullNameX: string;
  fullNameY: string;
  fee: string;
  totalSupply: string;
  px: string;
  py: string;
  denomination: string;
}

export type PoolAPIResponse = {
  PERMASWAP: Record<
    string,
    {
      tvl: number;
      tokenA: string;
      tokenB: string;
      symbolX: string;
      symbolY: string;
      fee: string;
      apr: number;
      dexName: DEX.PERMASWAP;
      poolAddress: string;
      ticker: string;
      name: string;
      denomination: string;
    }
  >;
  BOTEGA: Record<
    string,
    {
      tvl: number;
      tokenA: string;
      tokenB: string;
      fee: string;
      apr: number;
      dexName: DEX.BOTEGA;
      poolAddress: string;
      ticker: string;
      name: string;
      denomination: string;
    }
  >;
};

export type Pool = {
  processId: string;
  dex: DEX;
  tokenA: { symbol: string; address: string; decimals: number };
  tokenB: { symbol: string; address: string; decimals: number };
  swapFeePct: number; // e.g. 0.003
  tvlUsd: number;
  aprPct: number; // 0.089 -> 8.9%
  contract: string;
  name: string;
  ticker: string;
};

export enum DEX{
  PERMASWAP = "Permaswap",
  BOTEGA = "Botega",
}