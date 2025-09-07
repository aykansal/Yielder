# DEX Pools MCP Server

A Model Context Protocol (MCP) server that provides access to DEX pool data from Permaswap and Botega protocols on the AO network.

## Features

- **get_all_pools**: Retrieve all available DEX pools with detailed information
- Supports both Permaswap and Botega DEX protocols
- Provides TVL, APR, fees, token details, and contract addresses
- Real-time data from AO processes

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

## Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

## MCP Client Integration

### Claude Desktop

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dex-pools": {
      "command": "node",
      "args": ["/path/to/your/mcp-server/dist/index.js"]
    }
  }
}
```

### Cursor

Add to your Cursor MCP configuration:

```json
{
  "mcpServers": {
    "dex-pools": {
      "command": "node",
      "args": ["/path/to/your/mcp-server/dist/index.js"]
    }
  }
}
```

## Available Tools

### get_all_pools

Retrieves all DEX pools from Permaswap and Botega with comprehensive information.

**Input**: No parameters required

**Output**: Detailed list of all pools including:
- Pool name and ticker
- DEX protocol (Permaswap/Botega)
- Token pair information
- TVL (Total Value Locked)
- APR (Annual Percentage Rate)
- Swap fees
- Contract addresses
- Process IDs

## Example Usage

Once integrated with an MCP client, you can ask questions like:

- "Show me all available DEX pools"
- "What are the pools with the highest TVL?"
- "Find pools with APR above 10%"
- "List all Permaswap pools"

## Data Source

This server fetches data from the AO process `Pqho57bR_l8HHlf-2fAMYzvb1o73EP8RAPapGsv3aKA` using the `@permaweb/aoconnect` library.

## Development

### Project Structure

```
src/
├── index.ts      # Main MCP server implementation
├── pools.ts      # Pool data fetching and transformation logic
└── types.ts      # TypeScript type definitions
```

### Building

```bash
npm run build
```

### Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the compiled server
- `npm run dev` - Run in development mode with tsx
- `npm run inspect` - Test tools in MCP Inspect GUI

## Dependencies

- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `@permaweb/aoconnect` - AO network connectivity
- `typescript` - TypeScript compiler
- `tsx` - TypeScript execution in development