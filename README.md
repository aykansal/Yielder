# Yielder Protocol: An Autonomous Cross-DEX Yield Aggregator on ao

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Platform: ao Computer](https://img.shields.io/badge/Platform-ao%20Computer-green.svg)
![Language: Lua](https://img.shields.io/badge/Language-Lua-purple.svg)

**Yielder** is an autonomous yield aggregator on the `ao` computer that automatically finds and stakes your assets in the most profitable liquidity pools across multiple DEXs, ensuring you always get the best returns with minimal effort.

**Website:** [`https://yielder_aykansal.ar.io/`](https://yielder_aykansal.ar.io/)

---

## Table of Contents

- [The Problem: Yield Farming is Hard](#the-problem-yield-farming-is-hard)
- [The Solution: Yielder Makes it Easy](#the-solution-yielder-makes-it-easy)
- [How It Works: The Yielder Lifecycle](#how-it-works-the-yielder-lifecycle)
  - [1. On-Chain Analysis & Pool Discovery](#1-on-chain-analysis--pool-discovery)
  - [2. Automated Liquidity Provision](#2-automated-liquidity-provision)
  - [3. YLP Token Abstraction](#3-ylp-token-abstraction)
  - [4. Continuous Optimization & Rebalancing](#4-continuous-optimization--rebalancing)
  - [5. Seamless Redemption](#5-seamless-redemption)
- [Protocol Architecture](#protocol-architecture)
  - [Key Processes](#key-processes)
  - [Core Assets (Yielder Token Suite)](#core-assets-yielder-token-suite)
  - [Integrated Liquidity Pools](#integrated-liquidity-pools)
- [Getting Started: A User's Guide](#getting-started-a-users-guide)
  - [Step 1: Acquire Test Tokens](#step-1-acquire-test-tokens)
  - [Step 2: Find the Best Pool to Stake In](#step-2-find-the-best-pool-to-stake-in)
  - [Step 3: Stake Your Tokens](#step-3-stake-your-tokens)
  - [Step 4: Withdraw Your Assets](#step-4-withdraw-your-assets)
- [DEX Pools MCP Server](#dex-pools-mcp-server)
  - [Features](#features)
  - [Installation & Usage](#installation--usage)
  - [MCP Client Integration](#mcp-client-integration)
  - [Available Tools](#available-tools)
- [Development & Setup](#development--setup)
- [License](#license)

---

## The Problem: Yield Farming is Hard

Providing liquidity to earn yield can be a complicated and expensive process. Yielder is designed to fix these common challenges:

* **Constant Monitoring:** You have to constantly watch the markets to find the best returns.
* **Time-Consuming:** Frequently moving your funds between pools to chase better yields is tedious.
* **High Complexity:** Managing investments across many different platforms (e.g., Permaswap, Botega) is confusing and difficult.

## The Solution: Yielder Makes it Easy

Yielder is an automated system that handles the entire yield farming process for you:

* **Smart Analysis:** Yielder constantly analyzes performance metrics like APR, TVL, and Swap Fees to find the most profitable liquidity pools across supported DEXs.
* **Automatic Staking:** Once the best pool is found, the protocol automatically deploys your assets into it.
* **Dynamic Rebalancing:** Yielder continuously monitors the market. If a more profitable opportunity appears, it automatically moves your funds to the better pool.
* **Simple Portfolio Management:** Your entire position is represented by a single token: the **Yielder LP Token (YLP)**. This simplifies portfolio management down to tracking a single asset.
* **Shared Costs:** By managing assets collectively, the protocol socializes transaction costs, leading to greater capital efficiency for everyone involved.

---

## How It Works: The Yielder Lifecycle

The Yielder protocol automates the entire yield farming lifecycle through a sophisticated, multi-stage process designed to be completely hands-off for the user after the initial deposit.

![Yielder Workflow](./processes/yirlder.png)

### 1. On-Chain Analysis & Pool Discovery 📈

Yielder continuously monitors all supported liquidity pools to identify the most profitable opportunities.

* **On-Demand Analysis:** A user can call the `Best-Stake` handler with a token pair to get an immediate recommendation for the best pool.
* **Continuous Background Monitoring:** An automated cron job runs every two minutes, calling the `cronnn` handler to fetch the latest data for all supported pools, ensuring the system's information is always up-to-date.
* **Metric Calculation:** It calculates critical performance indicators for each pool in real-time, including Total Value Locked (TVL), 24-Hour Volume, and Annual Percentage Rate (APR).

### 2. Automated Liquidity Provision 🔗

Once a user decides to stake, Yielder acts as a proxy to execute the transaction on their behalf.

* The protocol takes the user's deposited tokens and programmatically calls the `AddLiquidity` function on the optimal DEX pool (either on Permaswap or Botega).
* The DEX pool then mints its native LP token and sends it directly to the Yielder process, which holds it in custody within its treasury.

### 3. YLP Token Abstraction 🎟️

In exchange for the deposited assets, Yielder mints and distributes its own derivative token, the **`YLP` (Yielder LP Token)**, to the user.

* The `YLP` token serves as a liquid receipt for the user's stake.
* This powerfully abstracts the investment—the user's entire, potentially complex position is represented by this single `YLP` token, drastically simplifying portfolio management.

### 4. Continuous Optimization & Rebalancing 🤖

The true power of Yielder lies in its autonomous optimization engine.

* The `Auto-Yield-Optimizer` handler periodically analyzes the fresh market data.
* It compares the APR of the pool currently holding a user's funds against all other available pools for the same token pair.
* If the optimizer finds a new pool with a significantly higher APR, it automatically triggers a rebalance—withdrawing liquidity from the underperforming pool and redeploying it into the new, higher-yielding one.

### 5. Seamless Redemption 📤

When a user wants to exit their position, the process is as simple as the deposit.

* The user calls the `burn` handler, sending their `YLP` tokens back to the Yielder process.
* Yielder calculates the user's proportional share of the underlying assets, withdraws them from the appropriate DEX pool(s), and transfers the base tokens directly back to the user's wallet.

---

## Protocol Architecture

### Key Processes

* **Main Yielder Process:** The central smart contract that contains all protocol logic and also serves as the `YLP` token contract.
    * **Process ID:** `SpJdYt1_CdMG0W5JjDVYfu-tJNGB2bXC6usBSyrQAys`
* **Cron Job Process:** A utility process that calls the main process's handlers every two minutes to refresh data.
    * **Process ID:** `pim8QULY_SxUwx8yMarH4O4NwiWtP4awcgyGhgsE-FA`

### Core Assets (Yielder Token Suite)

These are custom test tokens used within the Yielder ecosystem for providing liquidity.

* **YT1:** `_IxG5qxfgSBBj1wH7BL0j1vkihOcfx2ntXS19NZjDFU`
* **YT2:** `Zg8ihIkD2Tpm2E0vRbJSD0J3Jb3dqK8XUZ4OlOZ9kcc`
* **YT3:** `CgD7STeX0_VDlNwNnB4_qQLg4nb4okqXQgTki0sFXSM`

### Integrated Liquidity Pools

Yielder actively monitors and manages liquidity across the following live pools on Permaswap and Botega.

| Token Pair  | DEX       | Pool Address & Link                                                                                                 |
| :---------- | :-------- | :------------------------------------------------------------------------------------------------------------------ |
| **YT1 / YT2** | Permaswap | [`3TFMtVjYssqCuNPIqcIKn-tM4bWq5KtQ9NKweWxvV1w`](https://www.permaswap.network/#/liquidity?processId=3TFMtVjYssqCuNPIqcIKn-tM4bWq5KtQ9NKweWxvV1w&to=add) |
| **YT2 / YT3** | Permaswap | [`7YDBq2EZYQk8o_5Lbm6HcxIYqjWcr65ShmKBHH4XqRU`](https://www.permaswap.network/#/liquidity?processId=7YDBq2EZYQk8o_5Lbm6HcxIYqjWcr65ShmKBHH4XqRU&to=add)   |
| **YT1 / YT3** | Permaswap | [`bmR1GHhqKJa9MrQe9g8gC8OrNcitWyFRuVKADIKNXc8`](https://www.permaswap.network/#/liquidity?processId=bmR1GHhqKJa9MrQe9g8gC8OrNcitWyFRuVKADIKNXc8&to=add)   |
| **YT1 / YT2** | Botega    | [`Q9uyLNaNvuFHvNrQQZ_XuOrRZ6OEE0KqSEPJJj8Z4Ys`](https://dexi.arweave.net/#/pool/Q9uyLNaNvuFHvNrQQZ_XuOrRZ6OEE0KqSEPJJj8Z4Ys)                         |
| **YT2 / YT3** | Botega    | [`76IKbymu5DvaYaZcbMvEJg_WI9LNzZgzv3vcFmgES2M`](https://dexi.arweave.net/#/pool/76IKbymu5DvaYaZcbMvEJg_WI9LNzZgzv3vcFmgES2M)                         |
| **YT1 / YT3** | Botega    | [`w5UW-qIme4BWojTRQBqFRsweuzWzA-Hy9KExmJM5DMg`](https://dexi.arweave.net/#/pool/w5UW-qIme4BWojTRQBqFRsweuzWzA-Hy9KExmJM5DMg)                         |

---

## Getting Started: A User's Guide

### Step 1: Acquire Test Tokens

Use the built-in airdrop handlers to get test tokens sent directly to your wallet.
* **Get 10 YT1:**
    ```lua
    Send({Target="SpJdYt1_CdMG0W5JjDVYfu-tJNGB2bXC6usBSyrQAys", Action = "YT1Airdrop", Quantity="10"})
    ```
* **Get 20 YT2:**
    ```lua
    Send({Target="SpJdYt1_CdMG0W5JjDVYfu-tJNGB2bXC6usBSyrQAys", Action = "YT2Airdrop", Quantity="20"})
    ```
* **Get 30 YT3:**
    ```lua
    Send({Target="SpJdYt1_CdMG0W5JjDVYfu-tJNGB2bXC6usBSyrQAys", Action = "YT3Airdrop", Quantity="30"})
    ```

### Step 2: Find the Best Pool to Stake In 🔍
Use the `Best-Stake` handler to perform a live analysis and find the most profitable pool for a given pair.

```bash
Send({ 
    Target = "SpJdYt1_CdMG0W5JjDVYfu-tJNGB2bXC6usBSyrQAys",
    Action = "Best-Stake",
    TokenX = "_IxG5qxfgSBBj1wH7BL0j1vkihOcfx2ntXS19NZjDFU", -- YT1
    TokenY = "Zg8ihIkD2Tpm2E0vRbJSD0J3Jb3dqK8XUZ4OlOZ9kcc"  -- YT2
})
```

### Step 3: Stake Your Tokens 🔗
First, transfer your tokens to the Yielder Process. Then, call the `Stake-User-Token` handler. The protocol will automatically stake them in the optimal pool and mint `YLP` tokens back to you.

```bash
Send({ 
    Target = "SpJdYt1_CdMG0W5JjDVYfu-tJNGB2bXC6usBSyrQAys",
    Action = "Stake-User-Token", 
    Pool = "Q9uyLNaNvuFHvNrQQZ_XuOrRZ6OEE0KqSEPJJj8Z4Ys", -- Example Pool ID from Step 2
    User = "YOUR_WALLET_ADDRESS",
    TokenXAddress ="_IxG5qxfgSBBj1wH7BL0j1vkihOcfx2ntXS19NZjDFU", 
    TokenXQuantity = "2000000000000",  
    TokenYAddress ="Zg8ihIkD2Tpm2E0vRbJSD0J3Jb3dqK8XUZ4OlOZ9kcc", 
    TokenYQuantity = "2727272727272"
})
```
### Step 4: Withdraw Your Assets 📤
To exit your position, simply call the `burn` handler with your `YLP` tokens. The protocol will automatically withdraw the underlying assets from the DEX and return them to your wallet.

---

## DEX Pools MCP Server 🖥️
A companion Model Context Protocol (MCP) server that provides real-time, structured access to DEX pool data from the Yielder protocol.

### Features
* **`get_all_pools`**: Retrieve all monitored DEX pools with detailed information.
* Supports both Permaswap and Botega DEX protocols.
* Provides TVL, APR, fees, token details, and contract addresses.
* Fetches real-time data directly from the main Yielder `ao` process.

### Installation & Usage
1.  **Clone the repository**
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Build the project:**
    ```bash
    npm run build
    ```
4.  **Run the server:**
    * Development: `npm run dev`
    * Production: `npm start`

### MCP Client Integration
Add the server to your Claude Desktop or Cursor configuration.

* **`claude_desktop_config.json` Example:**
    ```json
    {
      "mcpServers": {
        "dex-pools": {
          "command": "node",
          "args": ["dex-mcp"]
        }
      }
    }
    ```

### Available Tools
#### get_all_pools
Retrieves all DEX pools from Permaswap and Botega with comprehensive information.

* **Input**: No parameters required.
* **Output**: A detailed list of all pools.
* **Example Query**: "Show me all available DEX pools" or "Find pools with APR above 10%".

---

## Development & Setup 🛠️
*(This section can include details on how to set up the development environment, run tests, and deploy the protocol).*

---

## License 📄
This project is licensed under the MIT License. See the `LICENSE` file for details.
