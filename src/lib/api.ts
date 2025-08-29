// API functions for pool data, token balances, and token list

import { connect, createSigner, dryrun, results } from "@permaweb/aoconnect";
import { luaProcessId } from "./constants/index.constants";
import { messageAR, messageResults, readHandler } from "./arkit";
import {
  CU_URL,
  GATEWAY_URL,
  GRAPHQL_URL,
  MODE,
} from "@/lib/constants/arkit.constants";

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
  disableSwap: boolean;
  disableLiquidity: boolean;
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
export async function getPoolInfo(poolProcessId: string): Promise<PoolInfo> {
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

    const result = {
      name: tagMap.Name || '',
      ticker: tagMap.Ticker || '',
      symbolX: tagMap.SymbolX || '',
      symbolY: tagMap.SymbolY || '',
      tokenA: tagMap.X || '',
      tokenB: tagMap.Y || '',
      decimalsX: parseInt(tagMap.DecimalX || '12'),
      decimalsY: parseInt(tagMap.DecimalY || '12'),
      fullNameX: tagMap.FullNameX || '',
      fullNameY: tagMap.FullNameY || '',
      fee: tagMap.Fee || '0',
      totalSupply: tagMap.TotalSupply || '0',
      px: tagMap.PX || '0',
      py: tagMap.PY || '0',
      denomination: tagMap.Denomination || '12',
      disableSwap: tagMap.DisableSwap === 'true',
      disableLiquidity: tagMap.DisableLiquidity === 'true',
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
    const response = await fetch(`https://cu.ardrive.io/dry-run?process-id=${tokenProcessId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Id: "0000000000000000000000000000000000000000001",
        Target: tokenProcessId,
        Owner: walletAddress,
        Anchor: "0",
        Data: "1234",
        Tags: [
          {
            name: "Action",
            value: "Balance"
          },
          {
            name: "Recipient",
            value: walletAddress
          },
          {
            name: "Data-Protocol",
            value: "ao"
          },
          {
            name: "Type",
            value: "Message"
          },
          {
            name: "Variant",
            value: "ao.TN.1"
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

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

export async function getAllPools() {
  const ao = connect({
    GATEWAY_URL,
    GRAPHQL_URL,
    MODE,
    // CU_URL,
  });
  if (window.arweaveWallet) {
    try {
      await ao
        .message({
          process: luaProcessId,
          signer: createSigner(window.arweaveWallet),
          tags: [{ name: "Action", value: "cron" }],
        })
        .then(async (messageId) => {
          console.log("[pools.tsx] poolsRefresh_messageId:", messageId);
          await ao.result({
            process: luaProcessId,
            message: messageId,
          });
        });

    } catch (error) {
      console.warn("Failed to send Pool-Details message (wallet may not be connected):", error);
    }
  }

  // Read pool data - this should work without wallet connection
  const res = await readHandler({
    action: "cronpooldata",
    process: luaProcessId,
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log("[api.ts] results:", res);

  return res;
}

// Helper function to check if a pool exists for token pair
export async function checkPoolExists(tokenAProcess: string, tokenBProcess: string): Promise<boolean> {
  try {

    // const res = await getAllPools()

    return true;
  } catch (error) {
    console.error('Error checking pool existence:', error);
    return false;
  }
}

// Helper function to format token amount with decimals
export function formatTokenAmount(amount: string, decimals: number): string {
  const numAmount = parseInt(amount);
  const divisor = Math.pow(10, decimals);
  return (numAmount / divisor).toFixed(6);
}

// 4. Best Stake - Find best pool for token pair
export async function getBestStake(tokenXProcess: string, tokenYProcess: string): Promise<any> {
  try {
    const ao = connect({
      GATEWAY_URL,
      GRAPHQL_URL,
      MODE,
      CU_URL,
    });
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

    const data = await messageAR({
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
