#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { getAllPools, getPoolInfo, getBestStake } from "./pools.js";

class DexPoolsServer {
  private server: Server;

  constructor() {

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
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "get_all_pools":
          try {
            const pools = await getAllPools();

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
            const poolInfo = await getPoolInfo(poolId);

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
            const bestStakeData = await getBestStake(tokenXProcess, tokenYProcess);

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
