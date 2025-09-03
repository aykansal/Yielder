import { dryrun } from "@permaweb/aoconnect";

export enum DEX {
  PERMASWAP = "Permaswap",
  BOTEGA = "Botega",
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
