import { JWKInterface } from "arweave/node/lib/wallet.js";
import { createSigner, dryrun, message, result } from "@permaweb/aoconnect";
import { EnvConfig } from "./index.js";
import { luaProcessId, luaProcessId2 } from "./lib/config.js";
import { jwkToPubKey, transformPoolData } from "./lib/utils.js";

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

export interface TokenBalance {
  balance: string;
  ticker: string;
  account: string;
}

export async function getAllPools(config: EnvConfig): Promise<Pool[]> {
  try {
    if (config.DEBUG) {
      console.error(`Fetching pools data from ${config.RPC_URL}`);
    }

    const result = await dryrun({
      process: luaProcessId,
      tags: [
        {
          name: "Action",
          value: "cronpooldata"
        }
      ]
    });

    const apiData: PoolAPIResponse = JSON.parse(result.Messages[0].Data);
    const allPools = transformPoolData(apiData);
    return allPools;
  } catch (error) {
    console.error("Error fetching pools data:", error);
    throw new Error(`Failed to fetch pools data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getPoolInfo(poolId: string, config?: EnvConfig): Promise<{ name: string, value: string }[]> {
  try {
    const result = await dryrun({
      process: poolId,
      tags: [
        {
          name: "Action",
          value: "Info"
        }
      ]
    });

    const apiData: { name: string, value: string }[] = result.Messages[0].Tags;
    return apiData;
  } catch (error) {
    console.error("Error fetching pool info:", error);
    throw new Error(`Failed to fetch pool info for ${poolId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getBestStake(tokenXProcess: string, tokenYProcess: string, config: EnvConfig): Promise<any> {
  try {
    if (config.DEBUG) {
      console.error(`Finding best stake for tokens ${tokenXProcess}/${tokenYProcess} using ${config.RPC_URL}`);
    }

    await message({
      process: luaProcessId,
      signer: createSigner(config.JWK),
      tags: [
        { name: "Action", value: "Best-Stake" },
        { name: "TokenX", value: tokenXProcess },
        { name: "TokenY", value: tokenYProcess },
      ],
    }).then(async (messageId) => {
      // console.log(messageId)
      await result({
        process: luaProcessId,
        message: messageId,
      })
    });

    await new Promise((resolve) => setTimeout(resolve, 10000));

    const data = await message({
      process: luaProcessId,
      tags: [{ name: "Action", value: "best-stake-user-response" }],
      signer: createSigner(config.JWK)
    }).then(async (messageId) => {
      // console.log(messageId)
      return await result({
        process: luaProcessId,
        message: messageId,
      }).then(res => res.Messages[0].Data)
    })

    return JSON.parse(data);
  } catch (error) {
    console.error('Error fetching best stake:', error);
    throw error;
  }
}

export async function getUserLpPositions(ao: any, walletAddress: string, config: EnvConfig) {

  if (!walletAddress) {
    walletAddress = await jwkToPubKey(config.JWK)
  }

  const res = await ao.message({
    process: luaProcessId,
    signer: createSigner(config.JWK),
    tags: [
      { name: "Action", value: "Track-User-Stake" },
      { name: "Tx-Source", value: "Yielder" },
      { name: "X-Analytics", value: "Yielder-MCP" },
      { name: "User", value: walletAddress },
      { name: "App-Name", value: "Yielder" }
    ]
  }).then(async (msgId: string) => {
    const res = await ao.result({
      process: luaProcessId,
      message: msgId,
    })
    console.log("res:", res)
    return res.Messages[0].Data
  })
  try {
    if (res == null) {
      const data = {
        processId: "NA",
        dex: "NA",
        address: "NA",
        user_token_x: 0,
        user_token_y: 0,
        yielder_lp_token: 0,
        pool_lp_token: 0,
        token_x_address: "NA",
        token_y_address: "NA",
        timestamp: "NA",
      }

      return data
    }

    const positionsData = JSON.parse(res);
    const transformedPositions = Object.entries(positionsData || {}).map(
      ([poolAddress, position]: [string, any]) => ({
        processId: poolAddress,
        dex: position.dex_name || "Unknown",
        address: poolAddress,
        user_token_x:
          parseFloat(position.user_token_x || "0") / 1000000000000,
        user_token_y:
          parseFloat(position.user_token_y || "0") / 1000000000000,
        yielder_lp_token:
          parseFloat(position.yielder_lp_token || "0") / 1000000000000,
        pool_lp_token:
          parseFloat(position.pool_lp_token || "0") / 1000000000000,
        token_x_address: position.token_x_address,
        token_y_address: position.token_y_address,
        timestamp: position.timestamp,
      }),
    );

    return transformedPositions;
  } catch (error) {
    console.warn('Error parsing user LP positions response:', error);
    return {};
  }
}

export async function getUserTokenBalance(ao: any, tokenProcessId: string, walletAddress: string): Promise<TokenBalance> {
  try {
    const data = await ao.dryrun({
      process: tokenProcessId,
      tags: [{ name: "Action", value: "Balance" }, { name: "Recipient", value: walletAddress }, { name: "Tx-Source", value: "Yielder" }, { name: "App-Name", value: "Yielder" }]
    })

    if (!data.Messages || data.Messages.length === 0) {
      throw new Error('No balance data found');
    }

    const tags = data.Messages[0].Tags;
    const tagMap: Record<string, string> = {};

    tags.forEach((tag: { name: string; value: string }) => {
      tagMap[tag.name] = tag.value;
    });

    return {
      balance: tagMap.Balance || '0',
      ticker: tagMap.Ticker || '',
      account: tagMap.Account || '',
    };
  } catch (error) {
    console.error('Error fetching token balance:', error);
    throw error;
  }
}

export async function removeLiquidity(ao: any, data: {
  pool: string
  yielderLpTokenQuantity: string
  userWalletAddress?: string
}, config: EnvConfig, dex?: DEX) {

  const poolInfo = await getPoolInfo(data.pool);

  if (poolInfo.length === 0) {
    throw new Error("Invalid pool ID or unable to fetch pool info");
  }
console.log(poolInfo)
  // helper to extract value by tag name
  const findTag = (name: string) =>
    poolInfo.find((t) => t.name === name)?.value;

  // extract token X and Y from pool info
  const tokenX = findTag("X") || findTag("TokenA");
  const tokenY = findTag("Y") || findTag("TokenB");

  if (!tokenX || !tokenY) {
    throw new Error(`Pool info missing token addresses (X/Y) for ${data.pool}`);
  }

  console.log("tokenX:", tokenX, "tokenY:", tokenY);


  if (!data.userWalletAddress) {
    data.userWalletAddress = await jwkToPubKey(config.JWK)
  }

  const signer = createSigner(config.JWK)
  const tags = [
    { name: "App-Name", value: "Yielder" },
    { name: "X-Analytics", value: "Yielder-MCP" },
    { name: "Tx-Source", value: "Yielder" },
    { name: "Action", value: "Burn" },

    { name: "Pool", value: data.pool },
    { name: "User", value: data.userWalletAddress },
    { name: 'Quantity', value: data.yielderLpTokenQuantity },

    { name: "TokenXAddress", value: tokenX.toString() },
    { name: "TokenXQuantity", value: '1' },
    { name: "TokenYAddress", value: tokenY.toString() },
    { name: "TokenYQuantity", value: '1' },
  ]

  const txnId = await ao.message({
    process: luaProcessId2,
    signer,
    tags
  }).then(async (msgId: string) => {
    await ao.result({
      process: luaProcessId2,
      message: msgId
    })
    return msgId
  })

  return txnId;
}