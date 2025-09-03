// arlocal-dev
// export const HOST_NAME = 'localhost';
// export const PORT_NUM = 1984;
// export const PROTOCOL_TYPE = 'http';
// export const CU_URL = `${'http'}://${'localhost'}:6363`;

import axios from "axios";
import Arweave from "arweave";
import type { JWKInterface } from "arweave/node/lib/wallet";
import {
  PROTOCOL_TYPE,
  HOST_NAME,
  PORT_NUM,
  CU_URL,
  MODE,
  GATEWAY_URL,
  GRAPHQL_URL,
  AOModule,
  AOScheduler,
  CommonTags,
} from "@/lib/constants/arkit.constants";
import { createSigner, message, results } from "@permaweb/aoconnect";
import { getTagValue } from "./helpers.utils";

export interface DispatchResult {
  id: string;
  type?: "BASE" | "BUNDLED";
}

export interface Tag {
  name: string;
  value: string;
}

export interface WalletDetails {
  walletAddress: string;
  balance?: number;
}

interface GraphQLEdge {
  cursor: string;
  node: {
    id: string;
    recipient: string;
    block?: {
      timestamp: number;
      height: number;
    };
    tags: { name: string; value: string }[];
    data: { size: string; type?: string };
    owner: { address: string };
  };
}

interface MessageResponse {
  id: string;
  recipient: string;
  tags: { name: string; value: string }[];
  data
  owner: string;
}

// GraphQL base query
const baseData = {
  query:
    "query ($entityId: String!, $limit: Int!, $sortOrder: SortOrder!, $cursor: String) { transactions(sort: $sortOrder first: $limit after: $cursor recipients: [$entityId] ingested_at: {min: 1696107600}) { count edges { cursor node { id recipient block { timestamp height } tags { name value } data { size } owner { address } } } } }",
  variables: {
    cursor: "",
    entityId: "",
    limit: 25,
    sortOrder: "HEIGHT_DESC",
  },
};

// GraphQL operations
export const fetchGraphQL = async ({
  query,
  variables,
}: {
  query: string;
  variables: {
    cursor: string;
    entityId: string;
    limit: number;
    sortOrder: string;
  };
}) => {
  try {
    console.log("Fetching GraphQL data...");
    const response = await axios.post(GRAPHQL_URL, { query, variables });
    return response.data;
  } catch (error) {
    console.error("GraphQL fetch error:", error);
    throw error;
  }
};

// Message operations
export const fetchMessagesAR = async ({
  process,
}: {
  process: string;
}): Promise<MessageResponse[]> => {
  try {
    console.log("Fetching messages for process:", process);
    baseData.variables.entityId = process;

    const res = await fetchGraphQL({
      query: baseData.query,
      variables: baseData.variables,
    });

    const messages = res.data.transactions.edges.map((m: GraphQLEdge) => ({
      id: m.node.id,
      recipient: m.node.recipient,
      tags: m.node.tags,
      data: m.node.data,
      owner: m.node.owner.address,
    }));

    const detailed = await Promise.all(
      messages.map(async (m: MessageResponse) => {
        try {
          const res = await axios.get(`${GATEWAY_URL}/${m.id}`);
          return { ...m, data: res.data };
        } catch (error) {
          console.error(`Failed to fetch message ${m.id}:`, error);
          return null;
        }
      }),
    );

    return detailed.filter((item): item is MessageResponse => item !== null);
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    throw error;
  }
};

export const messageAR = async (
  ao: any,
  {
    tags = [],
    data = "",
    process,
  }: {
    tags?: Tag[];
    data?: string;
    process: string;
  }
): Promise<string> => {
  if (typeof window === "undefined") {
    throw new Error("Cannot send message in non-browser environment");
  }
  try {
    console.log("Sending message to process:", process);
    if (!process) throw new Error("Process ID is required.");

    const allTags = [...CommonTags, ...tags];
    const messageId = await ao.message({
      data,
      process,
      tags: allTags,
      signer: createSigner(window.arweaveWallet),
    });

    console.log("Message sent successfully:", messageId);
    return messageId;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

// Process operations
export const spawnProcess = async (
  ao: any,
  name: string,
  tags: Tag[] = [],
  data?: string,
): Promise<string> => {
  if (typeof window === "undefined") {
    throw new Error("Cannot spawn process in non-browser environment");
  }
  console.log("Spawning new process...");
  const allTags = [...CommonTags, ...tags];
  if (name) allTags.push({ name: "Name", value: name });

  try {
    const processId = await ao.spawn({
      module: AOModule,
      scheduler: AOScheduler,
      signer: createSigner(window.arweaveWallet),
      tags: allTags,
      data: data,
    });
    console.log("processId", processId);

    console.log("Process spawned successfully:", processId);
    return processId;
  } catch (error) {
    console.error("Spawn process error:", error);
    throw error;
  }
};

// Transaction operations
export const transactionAR = async ({
  data,
}: {
  data: string;
}): Promise<DispatchResult> => {
  if (typeof window === "undefined" || !window.arweaveWallet) {
    throw new Error("Wallet connection required in browser environment");
  }
  const arweave = Arweave.init({
    host: HOST_NAME,
    port: PORT_NUM,
    protocol: PROTOCOL_TYPE,
  });

  try {
    console.log("Creating transaction...");
    // connectWallet should ideally be called beforehand via useAuth().login()

    const transaction = await arweave.createTransaction({ data });
    // Assuming dispatch is available after connection
    const signed: DispatchResult =
      await window.arweaveWallet.dispatch(transaction);
    console.log("Transaction signed and dispatched:", signed);
    return signed;
  } catch (error) {
    console.error("Transaction error:", error);
    throw error;
  }
};

// Lua operations
export async function runLua(
  ao: any,
  {
    code,
    process,
    tags = [],
  }: {
    code: string;
    process: string;
    tags?: Tag[];
  }
): Promise<Record<string, unknown> & { id: string }> {
  if (typeof window === "undefined") {
    throw new Error("Cannot run Lua in non-browser environment");
  }
  try {
    console.log("Running Lua code...");
    const finalTags = [
      ...CommonTags,
      ...tags,
      { name: "Action", value: "Eval" },
    ];

    const messageId: string = await ao.message({
      process,
      data: code,
      signer: createSigner(window.arweaveWallet),
      tags: finalTags,
    });

    // const messageResult: {
    //   // @ts-expect-error ignore
    //   Output
    //   // @ts-expect-error ignore
    //   Messages
    //   // @ts-expect-error ignore
    //   Spawns
    //   // @ts-expect-error ignore
    //   Error
    // } = await ao.result({
    //   process,
    //   message: messageId,
    // });

    const finalResult = { id: messageId };
    // console.log('messageResult', messageResult);
    console.log("Lua execution completed:", finalResult);
    return finalResult;
  } catch (error) {
    console.error("Lua execution error:", error);
    throw error;
  }
}

// Handler operations
export async function readHandler(
  ao: any,
  {
    process,
    action,
    tags = [],
    data,
  }: {
    process: string;
    action: string;
    tags?: Tag[];
    data?: Record<string, unknown>;
  }
): Promise<Record<string, unknown> | null> {
  try {
    console.log("Reading handler using legacy dryrun...");
    const allTags = [{ name: "Action", value: action }, ...tags];
    const newData = JSON.stringify(data || {});

    const response = await ao.dryrun({
      process,
      data: newData,
      tags: allTags,
    });

    const message = response.Messages?.[0];
    if (message?.Data) {
      try {
        return JSON.parse(message.Data);
      } catch (parseError) {
        console.error("Error parsing message data:", parseError);
        return { rawData: message.Data };
      }
    }
    if (message?.Tags) {
      return message.Tags.reduce(
        (acc: Record<string, string>, { name, value }: Tag) => {
          acc[name] = value;
          return acc;
        },
        {},
      );
    }
    console.warn("Read handler dryrun returned no data or tags:", response);
    return null;
  } catch (error) {
    console.error("Read handler error:", error);
    throw error;
  }
}

// Wallet operations
export const useQuickWallet = async (): Promise<{
  key: JWKInterface;
  address: string;
}> => {
  // This function seems okay as Arweave.init might be safe server-side
  const arweave = Arweave.init({
    host: HOST_NAME,
    port: PORT_NUM,
    protocol: PROTOCOL_TYPE,
  });
  try {
    console.log("Generating quick wallet...");
    const key: JWKInterface = await arweave.wallets.generate();
    const address = await arweave.wallets.jwkToAddress(key);
    console.log("Quick wallet generated:", address);
    return { key, address };
  } catch (error) {
    console.error("Quick wallet error:", error);
    throw error;
  }
};


export const WalletConnectionResult = {
  ERROR: "error",
  CONNECTED: "connected",
  USER_CANCELLED: "cancelled",
  WALLET_NOT_FOUND: "wallet not found",
} as const;

export type WalletConnectionResult =
  (typeof WalletConnectionResult)[keyof typeof WalletConnectionResult];

export interface WalletConnectionResponse {
  status: WalletConnectionResult;
  message: string;
  error?: Error;
}

export async function connectWallet(): Promise<WalletConnectionResponse> {
  if (typeof window === "undefined") {
    return {
      status: WalletConnectionResult.ERROR,
      message: "Cannot connect wallet in non-browser environment",
    };
  }
  if (!window.arweaveWallet) {
    return {
      status: WalletConnectionResult.WALLET_NOT_FOUND,
      message: "Arweave Wallet not found",
    };
  }

  try {
    console.log("Connecting wallet...");

    await window.arweaveWallet.connect(
      [
        "ENCRYPT",
        "DECRYPT",
        "DISPATCH",
        "SIGNATURE",
        // @ts-expect-error
        "ACCESS_TOKENS",
        "ACCESS_ADDRESS",
        "SIGN_TRANSACTION",
        "ACCESS_PUBLIC_KEY",
        "ACCESS_ALL_ADDRESSES",
        "ACCESS_ARWEAVE_CONFIG",
      ],
      {
        name: "Yielder",
        logo: "https://arweave.net/pYIMnXpJRFUwTzogx_z5HCOPRRjCbSPYIlUqOjJ9Srs",
      },
      {
        host: HOST_NAME,
        port: PORT_NUM,
        protocol: PROTOCOL_TYPE,
      },
    );

    console.log("Wallet connected successfully");
    return {
      status: WalletConnectionResult.CONNECTED,
      message: "Connected wallet successfully",
    };
  } catch (error) {
    // More robust check for user cancellation
    console.log("[arkit.ts] errorMessage", error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (
      errorMessage.toLowerCase().includes("cancel") ||
      errorMessage.toLowerCase().includes("rejected") ||
      errorMessage.toLowerCase().includes("denied")
    ) {
      console.log("User cancelled the wallet connection request");
      return {
        status: WalletConnectionResult.USER_CANCELLED,
        message: "User cancelled the connection request",
      };
    }

    console.error("Connect wallet error:", error);
    return {
      status: WalletConnectionResult.ERROR,
      message: "Failed to connect wallet",
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

export async function disconnectWallet(): Promise<void> {
  if (typeof window === "undefined" || !window.arweaveWallet) {
    console.error(
      "Cannot disconnect wallet in non-browser environment or wallet not found",
    );
    return;
  }
  try {
    console.log("Disconnecting wallet...");
    await window.arweaveWallet.disconnect();
    console.log("Wallet disconnected successfully");
  } catch (error) {
    console.error("Disconnect wallet error:", error);
    throw error;
  }
}

export async function getWalletDetails(): Promise<WalletDetails> {
  if (typeof window === "undefined" || !window.arweaveWallet) {
    throw new Error(
      "Cannot get wallet details in non-browser environment or wallet not found",
    );
  }
  try {
    // const arweave = Arweave.init({
    //   host: HOST_NAME,
    //   port: PORT_NUM,
    //   protocol: PROTOCOL_TYPE,
    // });
    const walletAddress = await window.arweaveWallet.getActiveAddress();
    // const balance = await arweave.wallets
    //   .getBalance(walletAddress)
    //   .then((balanceRaw) => {
    //     const balance = arweave.ar.winstonToAr(balanceRaw);
    //     return Number(balance);
    //   });
    return { walletAddress };
  } catch (error) {
    console.error("Get wallet details error:", error);
    throw error;
  }
}

export interface UserToken {
  Name: string;
  Ticker: string;
  Denomination: number;
  Logo: string;
  processId: string;
}

export async function getTokens(): Promise<UserToken[]> {
  if (typeof window === "undefined" || !window.arweaveWallet) {
    throw new Error(
      "Cannot get tokens in non-browser environment or wallet not found",
    );
  }

  try {
    // First ensure we have the necessary permissions
    try {
      await window.arweaveWallet.connect(
        [
          // @ts-expect-error ACCESS_TOKENS may not be in type definitions yet
          "ACCESS_TOKENS",
          "ACCESS_ADDRESS",
        ],
        {
          name: "socials-test",
          logo: "https://arweave.net/pYIMnXpJRFUwTzogx_z5HCOPRRjCbSPYIlUqOjJ9Srs",
        },
      );
    } catch (connectError) {
      // Connection might fail if already connected, which is fine
      console.log("Connection attempt for tokens:", connectError);
    }

    // Get user tokens
    // @ts-expect-error userTokens may not be in type definitions yet
    const tokens = await window.arweaveWallet.userTokens();
    console.log("User tokens retrieved:", tokens);

    // Transform the response to match our expected interface
    return tokens.map((token: UserToken) => ({
      Name: token.Name,
      Ticker: token.Ticker,
      Denomination: token.Denomination,
      Logo: token.Logo,
      processId: token.processId,
    }));
  } catch (error) {
    console.error("Get tokens error:", error);
    throw error;
  }
}
export async function messageResults(args: {
  processId: string;
  wallet: any;
  action: string;
  tags: Tag[] | null;
  data: any;
  responses?: string[];
  handler?: string;
}): Promise<any> {
  try {
    const tags = [{ name: 'Action', value: args.action }];
    if (args.tags) tags.push(...args.tags);

    await message({
      process: args.processId,
      signer: createSigner(args.wallet),
      tags: tags,
      data: JSON.stringify(args.data),
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const messageResults = await results({
      process: args.processId,
      sort: 'DESC',
      limit: 100,
    });

    if (messageResults && messageResults.edges && messageResults.edges.length) {
      const response = {};

      for (const result of messageResults.edges) {
        if (result.node && result.node.Messages && result.node.Messages.length) {
          const resultSet = [args.action];
          if (args.responses) resultSet.push(...args.responses);

          for (const message of result.node.Messages) {
            const action = getTagValue(message.Tags, 'Action');

            if (action) {
              let responseData = null;
              const messageData = message.Data;

              if (messageData) {
                try {
                  responseData = JSON.parse(messageData);
                } catch {
                  responseData = messageData;
                }
              }

              const responseStatus = getTagValue(message.Tags, 'Status');
              const responseMessage = getTagValue(message.Tags, 'Message');

              if (action === 'Action-Response') {
                const responseHandler = getTagValue(message.Tags, 'Handler');
                if (args.handler && args.handler === responseHandler) {
                  response[action] = {
                    status: responseStatus,
                    message: responseMessage,
                    data: responseData,
                  };
                }
              } else {
                if (resultSet.includes(action)) {
                  response[action] = {
                    status: responseStatus,
                    message: responseMessage,
                    data: responseData,
                  };
                }
              }

              if (Object.keys(response).length === resultSet.length) break;
            }
          }
        }
      }

      return response;
    }

    return null;
  } catch (e) {
    console.error(e);
  }
}
