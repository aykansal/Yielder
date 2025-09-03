import type { Tag } from "../arkit";

// config constants
export const PROTOCOL_TYPE = "https";
export const HOST_NAME = "arweave.net";
export const PORT_NUM = 443;
export const CU_URL = "https://cu.ardrive.io";
export const MODE = "legacy";

export const GOLD_SKY_GQL = "https://arweave-search.goldsky.com/graphql";

export const GATEWAY_URL = `${PROTOCOL_TYPE}://${HOST_NAME}:${PORT_NUM}`;
export const GRAPHQL_URL = `${"https"}://${"arweave.net"}:${443}/graphql`;

// export const AOModule = 'Do_Uc2Sju_ffp6Ev0AnLVdPtot15rvMjP-a9VVaA5fM'; //regular-module on arweave
export const AOModule = "33d-3X8mpv6xYBlVB-eXMrPfH5Kzf6Hiwhcv0UA10sw"; // sqlite-module on arweave
export const AOScheduler = "_GQ33BkPtZrqxA84vM8Zk-N2aO0toNNu_C-l-rawrBA";

export const APM_ID = "DKF8oXtPvh3q8s0fJFIeHFyHNM6oKrwMCUrPxEMroak";
export const APM_INSTALLER =
  "https://raw.githubusercontent.com/betteridea-dev/ao-package-manager/refs/heads/main/installer.lua";

// Common tags used across the application
export const CommonTags: Tag[] = [
  {
    name: "Name",
    value: "Yielder"
  },
  { name: "Version", value: "2.0.0" },
  { name: "Authority", value: "fcoN_xJeisVsPXA-trzVAuIiqO3ydLQxM-L4XbrQKzY" },
  { name: "Scheduler", value: "_GQ33BkPtZrqxA84vM8Zk-N2aO0toNNu_C-l-rawrBA" },
];

export const CommonActions = {
  Info: "Info",
  "Credit-Notice": "Credit-Notice",
  "Debit-Notice": "Debit-Notice",
  Balance: "Balance",
};
