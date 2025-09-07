#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import "mcps-logger/console";

import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

import { getAllPools, getPoolInfo, getBestStake, getUserLpPositions, removeLiquidity, getUserTokenBalance } from "./pools.js";
import { connect } from "@permaweb/aoconnect";
import { JWKInterface } from "arweave/node/lib/wallet.js";

// Environment configuration with defaults
export interface EnvConfig {
  NODE_ENV: string;
  RPC_URL: string;
  CACHE_DURATION: number;
  DEBUG: boolean;
  JWK: JWKInterface;
}

function getEnvConfig(): EnvConfig {
  return {
    NODE_ENV: process.env.NODE_ENV || 'development',
    RPC_URL: process.env.RPC_URL || 'https://arweave.net',
    CACHE_DURATION: parseInt(process.env.CACHE_DURATION || '300000'), // 5 minutes default
    DEBUG: process.env.DEBUG === 'true',
    JWK: JSON.parse(process.env.JWK || '{}') as JWKInterface,
  };
}

function useAO() {
  return connect({
    MODE: "legacy",
    CU_URL: process.env.CU_URL || 'https://cu.ardrive.io',
    GATEWAY_URL: process.env.GATEWAY_URL || 'https://arweave.net'
  })
}

class DexPoolsServer {
  private server: Server;
  private config: EnvConfig;
  private ao: any;
  constructor() {
    // Load environment configuration
    this.config = getEnvConfig();

    this.ao = useAO()

    if (this.config.DEBUG) {
      console.log('Starting server with config:', this.config);
    }

    this.server = new Server(
      {
        name: "dex-pools-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "get_all_pools",
            description: "Get all available DEX pools from Permaswap and Botega with detailed information including TVL, APR, fees, and token details",
            inputSchema: {
              type: "object",
              properties: {},
              required: [],
            },
          },
          {
            name: "get_pool_info",
            description: "Get detailed information for a specific pool by its process ID",
            inputSchema: {
              type: "object",
              properties: {
                poolId: {
                  type: "string",
                  description: "The process ID of the pool to get information for",
                },
              },
              required: ["poolId"],
            },
          },
          {
            name: "get_best_stake",
            description: "Find the best stake for a pair of tokens using their process IDs. Requires JWK environment variable to be set.",
            inputSchema: {
              type: "object",
              properties: {
                tokenXProcess: {
                  type: "string",
                  description: "The process ID of the first token (Token X)",
                },
                tokenYProcess: {
                  type: "string",
                  description: "The process ID of the second token (Token Y)",
                },
              },
              required: ["tokenXProcess", "tokenYProcess"],
            },
          },
          {
            name: "get_user_lp_positions",
            description: "Get all liquidity pool (LP) positions for a user by their wallet address",
            inputSchema: {
              type: "object",
              properties: {
                walletAddress: {
                  type: "string",
                  description: "The wallet address of the user to get LP positions for",
                },
              },
              required: [],
            },
          },
          {
            name: "get_user_token_balance",
            description: "Fetch the token balance, ticker, and account details for a given wallet address",
            inputSchema: {
              type: "object",
              properties: {
                tokenProcessId: {
                  type: "string",
                  description: "The process ID of the token contract",
                },
                walletAddress: {
                  type: "string",
                  description: "The wallet address of the user to fetch balance for",
                },
              },
              required: ["tokenProcessId", "walletAddress"],
            },
          },
          {
            name: "remove_liquidity",
            description: "Remove liquidity from a pool by burning Yielder LP tokens for the given user",
            inputSchema: {
              type: "object",
              properties: {
                pool: {
                  type: "string",
                  description: "The pool ID from which to remove liquidity",
                },
                yielderLpTokenQuantity: {
                  type: "string",
                  description: "The quantity of Yielder LP tokens to burn",
                },
                userWalletAddress: {
                  type: "string",
                  description: "The wallet address of the user removing liquidity (optional, will be derived from config if not provided)",
                },
              },
              required: ["pool", "yielderLpTokenQuantity"],
            },
          }
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "get_all_pools":
          try {
            const pools = await getAllPools(this.config);

            return {
              content: [
                {
                  type: "text",
                  text: `Found ${pools.length} DEX pools across Permaswap and Botega:\n\n${pools
                    .map((pool, index) => {
                      const tokenAInfo = `${pool.tokenA.symbol} (${pool.tokenA.address.slice(0, 8)}...)`;
                      const tokenBInfo = `${pool.tokenB.symbol} (${pool.tokenB.address.slice(0, 8)}...)`;

                      return `${index + 1}. **${pool.name}** (${pool.ticker})
  - DEX: ${pool.dex}
  - Tokens: ${tokenAInfo} / ${tokenBInfo}
  - TVL: $${pool.tvlUsd.toLocaleString()}
  - APR: ${(pool.aprPct * 100).toFixed(2)}%
  - Swap Fee: ${(pool.swapFeePct * 100).toFixed(3)}%
  - Contract: ${pool.contract}
  - Process ID: ${pool.processId}`;
                    })
                    .join("\n\n")}`,
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  type: "text",
                  text: `Error fetching pools data: ${error instanceof Error ? error.message : 'Unknown error'}`,
                },
              ],
              isError: true,
            };
          }

        case "get_pool_info":
          try {
            const { poolId } = args as { poolId: string };
            const poolInfo = await getPoolInfo(poolId, this.config);

            return {
              content: [
                {
                  type: "text",
                  text: `Pool Info for ${poolId}:\n\n${poolInfo
                    .map((tag, index) => `${index + 1}. **${tag.name}**: ${tag.value}`)
                    .join("\n")}`,
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  type: "text",
                  text: `Error fetching pool info: ${error instanceof Error ? error.message : 'Unknown error'}`,
                },
              ],
              isError: true,
            };
          }

        case "get_best_stake":
          try {
            const { tokenXProcess, tokenYProcess } = args as { tokenXProcess: string; tokenYProcess: string };
            const bestStakeData = await getBestStake(tokenXProcess, tokenYProcess, this.config);

            return {
              content: [
                {
                  type: "text",
                  text: `## Best Stake Results for ${tokenXProcess} / ${tokenYProcess}\n\n\`\`\`json\n${JSON.stringify(bestStakeData, null, 2)}\n\`\`\``,
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  type: "text",
                  text: `Error fetching best stake: ${error instanceof Error ? error.message : 'Unknown error'}`,
                },
              ],
              isError: true,
            };
          }

        case "get_user_lp_positions":
          try {
            const { walletAddress } = args as { walletAddress: string };
            const lpPositions = await getUserLpPositions(this.ao, walletAddress, this.config);
            return lpPositions;
          } catch (error) {
            return {
              content: [
                {
                  type: "text",
                  text: `Error fetching user LP positions: ${error instanceof Error ? error.message : 'Unknown error'}`,
                },
              ],
              isError: true,
            };
          }
        case "get_user_token_balance":
          try {
            const { tokenProcessId, walletAddress } = args as {
              tokenProcessId: string;
              walletAddress: string;
            };
            
            const balance = await getUserTokenBalance(
              this.ao,
              tokenProcessId,
              walletAddress
            );

            return balance;
          } catch (error) {
            return {
              content: [
                {
                  type: "text",
                  text: `Error fetching user token balance: ${error instanceof Error ? error.message : "Unknown error"
                    }`,
                },
              ],
              isError: true,
            };
          }

        case "remove_liquidity":
          try {
            const { pool, yielderLpTokenQuantity, userWalletAddress } = args as {
              pool: string;
              yielderLpTokenQuantity: string;
              userWalletAddress?: string;
            };

            const txnId = await removeLiquidity(
              this.ao,
              { pool, yielderLpTokenQuantity, userWalletAddress },
              this.config,
              // this.dex
            );

            return {
              content: [
                {
                  type: "text",
                  text: `Liquidity removed successfully. Transaction ID: ${txnId}`,
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  type: "text",
                  text: `Error removing liquidity: ${error instanceof Error ? error.message : "Unknown error"
                    }`,
                },
              ],
              isError: true,
            };
          }

        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${name}`
          );
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("DEX Pools MCP Server running on stdio");
  }
}

// Start the server
const server = new DexPoolsServer();
server.run().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
