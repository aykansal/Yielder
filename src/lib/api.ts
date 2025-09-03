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
export async function getPoolInfo(poolProcessId: string, dex: DEX, ao: any): Promise<PoolInfo> {
  try {
    const data = await ao.dryrun({
      process: poolProcessId,
      tags: [{ name: "Action", value: "Info" }, { name: "Tx-Source", value: "Yielder" }]
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
export async function getUserTokenBalance(ao: any, tokenProcessId: string, walletAddress: string): Promise<TokenBalance> {
  try {
    console.log("[getUserTokenBalance starts]")
    const data = await ao.dryrun({
      process: tokenProcessId,
      tags: [{ name: "Action", value: "Balance" }, { name: "Recipient", value: walletAddress }, { name: "Tx-Source", value: "Yielder" }]
    })

    if (!data.Messages || data.Messages.length === 0) {
      throw new Error('No balance data found');
    }

    const tags = data.Messages[0].Tags;
    const tagMap: Record<string, string> = {};

    tags.forEach((tag: { name: string; value: string }) => {
      tagMap[tag.name] = tag.value;
    });

    console.log("[getUserTokenBalance ends]")
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

    // Filter to only include specific YT tokens
    const allowedProcessIds = [
      '_IxG5qxfgSBBj1wH7BL0j1vkihOcfx2ntXS19NZjDFU',
      'Zg8ihIkD2Tpm2E0vRbJSD0J3Jb3dqK8XUZ4OlOZ9kcc',
      'CgD7STeX0_VDlNwNnB4_qQLg4nb4okqXQgTki0sFXSM'
    ];

    const filteredTokens = tokens.filter(token =>
      allowedProcessIds.includes(token.process)
    );

    return filteredTokens;
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
      { name: "Tx-Source", value: "Yielder" }
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
      tags: [{ name: "Action", value: "best-stake-user-response" }, { name: "Tx-Source", value: "Yielder" }],
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
export const addLiquidity = async (dex: DEX, ao: any, data: ProvideParams, onFirstTxSigned?: () => void, onSecondTxSigned?: () => void) => {
  const signer = createSigner(window.arweaveWallet)

  const firstTransfer = await transfer(
    {
      ...data.tokenA,
      recipient: data.pool,
    },
    signer,
    ao,
  )

  console.log("onFirstTransfer", firstTransfer)

  onFirstTxSigned?.()
  await new Promise((resolve) => setTimeout(resolve, 40000));

  const secondTransfer = await transfer(
    {
      ...data.tokenB,
      recipient: data.pool,
    },
    signer,
    ao,
  )
  console.log("onSecondTransfer", secondTransfer)

  onSecondTxSigned?.()

  return [firstTransfer, secondTransfer]
}

interface StakeUserToken {
  tokenA: {
    token: string
    quantity: string
    reservePool: string
  }
  tokenB: {
    token: string
    quantity: string
    reservePool: string
  }
  pool: string
  totalLPSupplyOfTargetPool: string
  activeWalletAddress: string
}

export const addLiquidityHandlerFn = async (
  ao: any,
  data: StakeUserToken,
  dex: DEX,
  onStakeMessageSent?: () => void,
  onLiquidityMessageSent?: () => void
) => {

  const signer = createSigner(window.arweaveWallet)

  const result = await ao.message({
    process: luaProcessId,
    signer,
    tags: [
      { name: "Action", value: "Stake-User-Token" },
      { name: "Pool", value: data.pool },
      { name: "User", value: data.activeWalletAddress },
      { name: "TokenXAdrress", value: data.tokenA.token },
      { name: "TokenXQuantity", value: data.tokenA.quantity },
      { name: "TokenYAdrress", value: data.tokenB.token },
      { name: "TokenYQuantity", value: data.tokenB.quantity },
      { name: "Tx-Source", value: "Yielder" }
    ],
  }).then(async (msgId: string) => {
    return await ao.result({
      process: luaProcessId,
      message: msgId,
    })
  })

  onStakeMessageSent?.()

  if (dex === DEX.PERMASWAP) {
    // delay before fetching result to let smart contracts to process the transaction
    await new Promise((resolve) => setTimeout(resolve, 90000));

    await ao.message({
      process: luaProcessId,
      signer,
      tags: [
        {
          name: "Action",
          value: "calling-tokenx-permaswap"
        },
        {
          name: "Pool",
          value: data.pool
        },
        {
          name: "TokenXAddress",
          value: data.tokenA.token
        },
        {
          name: "Token_x_Quantity",
          value: data.tokenA.quantity
        },
        { name: "Tx-Source", value: "Yielder" }
      ],
    }).then(async (msgId: string) => {
      return await ao.result({
        process: luaProcessId,
        message: msgId,
      })
    })

    await new Promise((resolve) => setTimeout(resolve, 40000));

    const finalResult = await ao.message({
      process: luaProcessId,
      signer,
      tags: [
        {
          name: "Action",
          value: "adding-permaswap-liquidity"
        },
        {
          name: "Pool",
          value: data.pool
        },
        {
          name: "Tx-Source",
          value: "Yielder"
        }
      ],
    }).then(async (msgId: string) => {
      return await ao.result({
        process: luaProcessId,
        message: msgId,
      })
    })

    return finalResult;
  }
  onLiquidityMessageSent?.()

  return result;
}

export async function getUserLpPositions(ao: any, processId: string, walletAddress: string) {

  const res = await ao.message({
    process: processId,
    signer: createSigner(window.arweaveWallet),
    tags: [{ name: "Action", value: "Track-User-Stake" }, { name: "User", value: walletAddress }, { name: "Tx-Source", value: "Yielder" }]
  }).then(async (msgId: string) => {
    const res = await ao.result({
      process: processId,
      message: msgId,
    })
    return res.Messages[0].Data
  })
  console.log(res)
  // Handle the response - it comes as a JSON string, parse it
  try {
    if (res == null) {
      const data = {
        processId: "",
        dex: "",
        address: "",
        user_token_x: 0,
        user_token_y: 0,
        yielder_lp_token: 0,
        pool_lp_token: 0,
        token_x_address: "",
        token_y_address: "",
        timestamp: "",
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


export interface burnLiquidityParams {
  pool: string
  userWalletAddress: string
  tokenA: {
    token: string
  }
  tokenB: {
    token: string
  }
  yielderLpTokenQuantity: string
}

export async function removeLiquidity(ao: any, data: burnLiquidityParams, dex: DEX) {
  const signer = createSigner(window.arweaveWallet)
  const tags = [
    { name: "Action", value: "Burn" },
    { name: "Pool", value: data.pool },
    { name: "User", value: data.userWalletAddress },
    { name: "TokenXAddress", value: data.tokenA.token },
    { name: "TokenXQuantity", value: '1' },
    { name: "TokenYAddress", value: data.tokenB.token },
    { name: "TokenYQuantity", value: '1' },
    { name: 'Quantity', value: data.yielderLpTokenQuantity },
    { name: 'Dex-Name', value: dex },
    { name: "Tx-Source", value: "Yielder" }
  ]


  const txnId = await ao.message({
    process: luaProcessId,
    signer,
    tags
  }).then(async (msgId: string) => {
    await ao.result({
      process: luaProcessId,
      message: msgId
    })
    return msgId
  })

  return txnId;
}