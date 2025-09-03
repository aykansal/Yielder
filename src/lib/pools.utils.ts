import { DEX, Pool, PoolAPIResponse } from "@/types/pool.types";

// Helper function to extract symbols from Botega pool names like "Botega LP YT1/YT3"
const extractSymbolFromName = (name: string, index: 0 | 1): string => {
    const match = name.match(/LP\s+(\w+)\/(\w+)/);
    if (match) {
        return index === 0 ? match[1] : match[2];
    }
    return "Unknown";
};

// Transform best stake data to Pool type
export const transformBestStakeData = (bestStakeData: any): Pool => {
    // Extract symbols from the pool name (e.g., "YT2-YT1-30" -> "YT2", "YT1")
    const nameParts = bestStakeData.name.split('-');
    const symbolX = nameParts[0] || "Unknown";
    const symbolY = nameParts[1] || "Unknown";

    return {
        processId: bestStakeData.poolAddress,
        dex: bestStakeData.dexName,
        tokenA: {
            symbol: symbolX,
            address: bestStakeData.tokenA,
            decimals: 12, // Default to 12 for most tokens
        },
        tokenB: {
            symbol: symbolY,
            address: bestStakeData.tokenB,
            decimals: 12, // Default to 12 for most tokens
        },
        swapFeePct: parseFloat(bestStakeData.fee) / 10000, // Convert from basis points
        tvlUsd: bestStakeData.tvl,
        aprPct: bestStakeData.apr,
        contract: bestStakeData.poolAddress,
        name: bestStakeData.name,
        ticker: `${symbolX}-${symbolY}`,
    };
};

// Transform API response to Pool array
const transformPoolData = (apiData: PoolAPIResponse): Pool[] => {
    const pools: Pool[] = [];

    // Process PERMASWAP pools
    if (apiData?.PERMASWAP) {
        Object.entries(apiData.PERMASWAP).forEach(([processId, poolData]) => {
            pools.push({
                processId,
                dex: DEX.PERMASWAP,
                tokenA: {
                    symbol: poolData.symbolX || "",
                    address: poolData.tokenA,
                    decimals: parseInt(poolData.denomination) || 12,
                },
                tokenB: {
                    symbol: poolData.symbolY || "",
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

    // Process BOTEGA pools
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

export { transformPoolData };