import { createSigner, dryrun } from "@permaweb/aoconnect";
import { luaProcessId } from "./constants/index.constants";
import { messageAR, readHandler } from "./arkit";
import { DEX, PoolAPIResponse } from "@/types/pool.types";
import { transfer } from "./token.pool";
import { transformPoolData } from "./pools.utils";

export interface PoolInfo {
  name: string;
  ticker: string;
  symbolX: string;
  symbolY: string;
  tokenA: string;
  tokenB: string;
  decimalsX?: number;
  decimalsY?: number;
  fullNameX?: string;
  fullNameY?: string;
  fee: string;
  totalSupply: string;
  px?: string;
  py?: string;
  denomination: string;
  disableSwap?: boolean;
  disableLiquidity?: boolean;
}

export interface TokenBalance {
  balance: string;
  ticker: string;
  account: string;
}

export interface Token {
  process: string;
  decimals: number;
  symbol: string;
  fullName: string;
  logo: string;
  totalSupply: string;
  price: string;
  status: string;
  cuUrl: string;
  tokenAccessible: boolean;
}

// 1. Get individual pool data
export async function getPoolInfo(poolProcessId: string, dex: DEX): Promise<PoolInfo> {
  try {
    const data = await dryrun({
      process: poolProcessId,
      tags: [{ name: "Action", value: "Info" }]
    })
    console.log("[api.ts] response:", data);

    if (!data.Messages || data.Messages.length === 0) {
      throw new Error('No pool data found');
    }

    const tags = data.Messages[0].Tags;
    const tagMap: Record<string, string> = {};

    // Debug: Log the actual tag names and values
    console.log("[api.ts] Tags received:", tags);

    tags.forEach((tag: { name: string; value: string }) => {
      tagMap[tag.name] = tag.value;
    });

    // Debug: Log the mapped tag values
    console.log("[api.ts] Tag map:", tagMap);

    if (dex === DEX.BOTEGA) {
      const extractSymbolFromName = (name: string, index: 0 | 1): string => {
        const match = name.match(/LP\s+(\w+)\/(\w+)/);
        if (match) {
          return index === 0 ? match[1] : match[2];
        }
        return "Unknown";
      };
      tagMap.SymbolX = extractSymbolFromName(tagMap.Name, 0);
      tagMap.SymbolY = extractSymbolFromName(tagMap.Name, 1);
    }

    const result = {
      name: tagMap.Name || 'NA',
      ticker: tagMap.Ticker || 'NA',
      symbolX: tagMap.SymbolX || 'NA',
      symbolY: tagMap.SymbolY || 'NA',
      tokenA: tagMap.X || tagMap.TokenA || 'NA',
      tokenB: tagMap.Y || tagMap.TokenB || 'NA',
      fee: tagMap.Fee || tagMap.FeeBps || 'NA',
      totalSupply: tagMap.TotalSupply || 'NA',
      denomination: tagMap.Denomination || '12',
      decimalsX: tagMap.DecimalX ? parseInt(tagMap.DecimalX) : undefined,
      decimalsY: tagMap.DecimalY ? parseInt(tagMap.DecimalY) : undefined,
      fullNameX: tagMap.FullNameX || undefined,
      fullNameY: tagMap.FullNameY || undefined,
      px: tagMap.PX || tagMap.px || undefined,
      py: tagMap.PY || tagMap.py || undefined,
      disableSwap: tagMap.DisableSwap ? tagMap.DisableSwap === 'true' : undefined,
      disableLiquidity: tagMap.DisableLiquidity ? tagMap.DisableLiquidity === 'true' : undefined,
    };

    // Debug: Log the final result object
    console.log("[api.ts] Final result:", result);

    return result;
  } catch (error) {
    console.warn('Error fetching pool info:', error);
    throw error; // Re-throw the error so the calling code can handle it
  }
}

// 2. Get user token balance
export async function getUserTokenBalance(tokenProcessId: string, walletAddress: string): Promise<TokenBalance> {
  try {

    const data = await dryrun({
      process: tokenProcessId,
      tags: [{ name: "Action", value: "Balance" }, { name: "Recipient", value: walletAddress }]
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

// 3. Get token list
export async function getTokenList(): Promise<Token[]> {
  try {
    const response = await fetch('https://api-ffpscan.permaswap.network/tokenList');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const tokens: Token[] = await response.json();
    return tokens;
  } catch (error) {
    console.error('Error fetching token list:', error);
    throw error;
  }
}

// Helper function to find token by process ID
export function findTokenByProcess(tokens: Token[], processId: string): Token | undefined {
  return tokens.find(token => token.process === processId);
}

// Helper function to find token by symbol
export function findTokenBySymbol(tokens: Token[], symbol: string): Token | undefined {
  return tokens.find(token => token.symbol.toLowerCase() === symbol.toLowerCase());
}

export async function getAllPools(ao: any) {
  // const ao = connect({
  //   GATEWAY_URL,
  //   GRAPHQL_URL,
  //   MODE,
  // });
  // if (window.arweaveWallet) {
  //   try {
  //     await ao
  //       .message({
  //         process: luaProcessId,
  //         signer: createSigner(window.arweaveWallet),
  //         tags: [{ name: "Action", value: "cron" }],
  //       })
  //       .then(async (messageId) => {
  //         console.log("[pools.tsx] poolsRefresh_messageId:", messageId);
  //         await ao.result({
  //           process: luaProcessId,
  //           message: messageId,
  //         });
  //       });
  //   } catch (error) {
  //     console.warn("Failed to send Pool-Details message (wallet may not be connected):", error);
  //   }
  // }

  const res = await readHandler(ao, {
    action: "cronpooldata",
    process: luaProcessId,
  }) as PoolAPIResponse;
  const transformedPools = transformPoolData(res);

  console.log("[api.ts] transformedPools:", transformedPools);

  return transformedPools;
}

// Helper function to check if a pool exists for token pair
export async function checkPoolExists(
  ao: any,
  tokenAProcess: string,
  tokenBProcess: string
): Promise<string | null> {
  try {
    const res = await getAllPools(ao)
    console.log(res)
    if (!res || typeof res !== "object") {
      console.warn("getAllPools did not return an object:", res)
      return null
    }

    // Flatten: extract all pool objects into an array
    const pools = Object.values(res).flatMap((dexPools: any) =>
      Object.values(dexPools)
    )

    const pool = pools.find(
      (pool: any) =>
        (pool.tokenA === tokenAProcess && pool.tokenB === tokenBProcess) ||
        (pool.tokenA === tokenBProcess && pool.tokenB === tokenAProcess)
    )
    console.log(pool)
    // @ts-expect-error ignore
    return pool ? pool.processId || pool.poolAddress : null
  } catch (error) {
    console.error("Error checking pool existence:", error)
    return null
  }
}


// Helper function to format token amount with decimals
export function formatTokenAmount(amount: string, decimals: number): string {
  const numAmount = parseInt(amount);
  const divisor = Math.pow(10, decimals);
  return (numAmount / divisor).toFixed(6);
}

// 4. Best Stake - Find best pool for token pair
export async function getBestStake(ao: any, tokenXProcess: string, tokenYProcess: string): Promise<any> {
  try {
    await ao.message({
      process: luaProcessId,
      signer: createSigner(window.arweaveWallet),
      tags: [{ name: "Action", value: "Best-Stake" },
      { name: "TokenX", value: tokenXProcess },
      { name: "TokenY", value: tokenYProcess },
      ],
    }).then(async (messageId) => {
      await ao.result({
        process: luaProcessId,
        message: messageId,
      })
    });

    await new Promise((resolve) => setTimeout(resolve, 10000));

    const data = await messageAR(ao, {
      process: luaProcessId,
      tags: [{ name: "Action", value: "best-stake-user-response" }],
    }).then(async (messageId) => {
      return await ao.result({
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

interface TokenParam {
  token: string
  quantity: bigint
}

export interface ProvideParams {
  /** TokenA details */
  tokenA: TokenParam
  /** TokenB details */
  tokenB: TokenParam
  /** Pool process */
  pool: string
  /** Slippage tolerance percentage */
  slippageTolerance: number
}
// TODO: Complete this function - missing imports and parameters
export const addLiquidity = async (dex: DEX, ao: any, data: ProvideParams, onFirstTxSigned?: () => void) => {
  const signer = createSigner(window.arweaveWallet)

  // let poolTags = [
    // { name: "X-Origin", value: "Yielder-DeX" },
  // ]
  // if (dex === DEX.BOTEGA) {
  //   poolTags = [
  //     { name: "X-Action", value: "Provide" },
  //     { name: "X-Slippage-Tolerance", value: data.slippageTolerance.toString() },
  //   ]

  // }

  const firstTransfer = await transfer(
    {
      ...data.tokenA,
      recipient: "Pqho57bR_l8HHlf-2fAMYzvb1o73EP8RAPapGsv3aKA",
      // tags: poolTags,
    },
    signer,
    ao,
  )

  console.log("onFirstTransfer", firstTransfer)

  onFirstTxSigned?.()

  const secondTransfer = await transfer(
    {
      ...data.tokenB,
      recipient: "Pqho57bR_l8HHlf-2fAMYzvb1o73EP8RAPapGsv3aKA",
      // tags: poolTags,
    },
    signer,
    ao,
  )
  console.log("onSecondTransfer", secondTransfer)

  return [firstTransfer, secondTransfer]


}


interface StakeUserToken {
  tokenA: {
    token: string
    quantity: any
    reservePool: string
  }
  tokenB: {
    token: string
    quantity: any
    reservePool: string
  }
  pool: string
  totalLPSupplyOfTargetPool: string
  activeWalletAddress: string
}

export const addLiquidityHandlerFn = (ao: any, data: StakeUserToken) => {

  const signer = createSigner(window.arweaveWallet)

  const msgTags = [
    { name: "Action", value: "Stake-User-Token" },
    { name: "Pool", value: data.pool },
    { name: "User", value: data.activeWalletAddress },
    { name: "TokenXAdrress", value: data.tokenA.token }, // wrong spelling of address
    { name: "TokenXQuantity", value: data.tokenA.quantity },
    { name: "TokenXReservePool", value: data.tokenA.reservePool },
    { name: "TokenYAdrress", value: data.tokenB.token }, // wrong spelling of address
    { name: "TokenYQuantity", value: data.tokenB.quantity },
    { name: "TokenYReservePool", value: data.tokenB.reservePool },
    { name: "TotalLPSupplyOfTargetPool", value: data.totalLPSupplyOfTargetPool },
  ]

  const result = ao.message({
    process: luaProcessId,
    signer,
    tags: msgTags,
  }).then(async (res) => {
    return await ao.result({
      process: luaProcessId,
      message: res,
    })
  })

  return result;
}