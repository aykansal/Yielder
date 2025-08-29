// API functions for pool data, token balances, and token list

import { connect, createSigner } from "@permaweb/aoconnect";
import { luaProcessId } from "./constants/index.constants";
import { messageAR, readHandler } from "./arkit";
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
    const response = await fetch(`https://cu.ardrive.io/dry-run?process-id=${poolProcessId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Id: "1234",
        Target: poolProcessId,
        Owner: "1234",
        Anchor: "0",
        Data: "1234",
        Tags: [
          {
            name: "Action",
            value: "Info"
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
      throw new Error('No pool data found');
    }

    const tags = data.Messages[0].Tags;
    const tagMap: Record<string, string> = {};

    tags.forEach((tag: { name: string; value: string }) => {
      tagMap[tag.name] = tag.value;
    });

    return {
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
  } catch (error) {
    console.error('Error fetching pool info:', error);
    throw error;
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
    CU_URL,
  });
  await ao
    .message({
      process: luaProcessId,
      signer: createSigner(window.arweaveWallet),
      tags: [{ name: "Action", value: "Pool-Details" }],
    })
    .then(async (messageId) => {
      console.log("[pools.tsx] poolsRefresh_messageId:", messageId);
      await ao.result({
        process: luaProcessId,
        message: messageId,
      });
    });
  const res = await readHandler({
    action: "cronpooldata",
    process: luaProcessId,
  });
  return res
}

// Helper function to check if a pool exists for token pair
export async function checkPoolExists(tokenAProcess: string, tokenBProcess: string): Promise<boolean> {
  try {

    const res = await getAllPools()

    

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
    const response = await messageAR({
      process: luaProcessId,
      tags: [{ name: "Action", value: "Best-Stake" },
      { name: "TokenX", value: tokenXProcess },
      { name: "TokenY", value: tokenYProcess },
      ],
    }).then(async (messageId) => {
      const messageResult = await ao
        .result({
          process: luaProcessId,
          message: messageId,
        })
        .then((res) => {
          console.log("[api.ts] message-result:", res);
          return res.Messages[0].Data;
        });
      return JSON.parse(messageResult);
    });
    console.log("[api.ts] response:", response);

    // Return the response data to be processed by the calling component
    return response;
  } catch (error) {
    console.error('Error fetching best stake:', error);
    throw error;
  }
}
