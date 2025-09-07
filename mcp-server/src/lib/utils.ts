import { JWKInterface } from "arweave/node/lib/wallet";
import type { PoolAPIResponse, Pool } from "../pools.js";
import { DEX } from "../pools.js";
import Arweave from "arweave";

export const extractSymbolFromName = (name: string, index: 0 | 1): string => {
  const match = name.match(/LP\s+(\w+)\/(\w+)/);
  if (match) {
    return index === 0 ? match[1] : match[2];
  }
  return "Unknown";
};

export const transformPoolData = (apiData: PoolAPIResponse): Pool[] => {
  const pools: Pool[] = [];

  if (apiData?.PERMASWAP) {
    Object.entries(apiData.PERMASWAP).forEach(([processId, poolData]) => {
      pools.push({
        processId,
        dex: DEX.PERMASWAP,
        tokenA: {
          symbol: poolData.symbolX || "Unknown",
          address: poolData.tokenA,
          decimals: parseInt(poolData.denomination) || 12,
        },
        tokenB: {
          symbol: poolData.symbolY || "Unknown",
          address: poolData.tokenB,
          decimals: parseInt(poolData.denomination) || 12,
        },
        swapFeePct: parseFloat(poolData.fee) / 10000, // Convert from basis points
        tvlUsd: poolData.tvl,
        aprPct: poolData.apr,
        contract: poolData.poolAddress,
        name: poolData.name,
        ticker: poolData.ticker,
      });
    });
  }

  if (apiData?.BOTEGA) {
    Object.entries(apiData.BOTEGA).forEach(([processId, poolData]) => {
      pools.push({
        processId,
        dex: DEX.BOTEGA,
        tokenA: {
          symbol: extractSymbolFromName(poolData.name, 0),
          address: poolData.tokenA,
          decimals: parseInt(poolData.denomination) || 12,
        },
        tokenB: {
          symbol: extractSymbolFromName(poolData.name, 1),
          address: poolData.tokenB,
          decimals: parseInt(poolData.denomination) || 12,
        },
        swapFeePct: parseFloat(poolData.fee) / 10000, // Convert from basis points
        tvlUsd: poolData.tvl,
        aprPct: poolData.apr,
        contract: poolData.poolAddress,
        name: poolData.name,
        ticker: poolData.ticker,
      });
    });
  }
  return pools;
};

export const jwkToPubKey = async (jwk: JWKInterface): Promise<string> => {
  const arweave = Arweave.init({})
  return await arweave.wallets.jwkToAddress(jwk)
}