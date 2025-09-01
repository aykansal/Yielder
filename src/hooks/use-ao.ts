import { connect } from "@permaweb/aoconnect";
import { useMemo } from "react";
import {
  CU_URL,
  GATEWAY_URL,
  GRAPHQL_URL,
  // MODE,
} from "@/lib/constants/arkit.constants";

export interface AoConfig {
  // mode?: "legacy" | "mainnet";
  gatewayUrl?: string;
  graphqlUrl?: string;
  cuUrl?: string;
}

export const useAo = (config?: AoConfig) => {
  const ao = useMemo(() => {
    // const mode = config?.mode || MODE;
    const baseConfig = {
      GATEWAY_URL: config?.gatewayUrl || GATEWAY_URL,
      GRAPHQL_URL: config?.graphqlUrl || GRAPHQL_URL,
      CU_URL: config?.cuUrl || CU_URL,
    };

    return connect({
      ...baseConfig,
      MODE: 'legacy',
    });
  }, [config]);

  return ao;
};