import { DEX, PoolAPIResponse, Pool } from "./types.js";
import { JWKInterface } from "arweave/node/lib/wallet.js";
import { createSigner, dryrun, message, result } from "@permaweb/aoconnect";

// remains constant always
const luaProcessId = "SpJdYt1_CdMG0W5JjDVYfu-tJNGB2bXC6usBSyrQAys";

const extractSymbolFromName = (name: string, index: 0 | 1): string => {
  const match = name.match(/LP\s+(\w+)\/(\w+)/);
  if (match) {
    return index === 0 ? match[1] : match[2];
  }
  return "Unknown";
};

const transformPoolData = (apiData: PoolAPIResponse): Pool[] => {
  const pools: Pool[] = [];

  if (apiData?.PERMASWAP) {
    Object.entries(apiData.PERMASWAP).forEach(([processId, poolData]) => {
      pools.push({
        processId,
        dex: DEX.PERMASWAP,
        tokenA: {
          symbol: poolData.symbolX || "Unknown",
          address: poolData.tokenA,
          decimals: parseInt(poolData.denomination) || 12,
        },
        tokenB: {
          symbol: poolData.symbolY || "Unknown",
          address: poolData.tokenB,
          decimals: parseInt(poolData.denomination) || 12,
        },
        swapFeePct: parseFloat(poolData.fee) / 10000, // Convert from basis points
        tvlUsd: poolData.tvl,
        aprPct: poolData.apr,
        contract: poolData.poolAddress,
        name: poolData.name,
        ticker: poolData.ticker,
      });
    });
  }

  if (apiData?.BOTEGA) {
    Object.entries(apiData.BOTEGA).forEach(([processId, poolData]) => {
      pools.push({
        processId,
        dex: DEX.BOTEGA,
        tokenA: {
          symbol: extractSymbolFromName(poolData.name, 0),
          address: poolData.tokenA,
          decimals: parseInt(poolData.denomination) || 12,
        },
        tokenB: {
          symbol: extractSymbolFromName(poolData.name, 1),
          address: poolData.tokenB,
          decimals: parseInt(poolData.denomination) || 12,
        },
        swapFeePct: parseFloat(poolData.fee) / 10000, // Convert from basis points
        tvlUsd: poolData.tvl,
        aprPct: poolData.apr,
        contract: poolData.poolAddress,
        name: poolData.name,
        ticker: poolData.ticker,
      });
    });
  }
  return pools;
};

export async function getAllPools(): Promise<Pool[]> {
  try {
    const result = await dryrun({
      process: luaProcessId,
      tags: [
        {
          name: "Action",
          value: "cronpooldata"
        }
      ]
    });

    const apiData: PoolAPIResponse = JSON.parse(result.Messages[0].Data);
    const allPools = transformPoolData(apiData);
    return allPools;
  } catch (error) {
    console.error("Error fetching pools data:", error);
    throw new Error(`Failed to fetch pools data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getPoolInfo(poolId: string): Promise<{ name: string, value: string }[]> {
  try {
    const result = await dryrun({
      process: poolId,
      tags: [
        {
          name: "Action",
          value: "Info"
        }
      ]
    });

    const apiData: { name: string, value: string }[] = result.Messages[0].Tags;
    return apiData;
  } catch (error) {
    console.error("Error fetching pool info:", error);
    throw new Error(`Failed to fetch pool info for ${poolId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getBestStake(tokenXProcess: string, tokenYProcess: string): Promise<any> {
  try {
    // Get JWK from environment variable
    // const jwkString = process.env.WALLET_JWK!;
    // console.log(jwkString)
    // if (!jwkString) {
    //   throw new Error('JWK environment variable is required');
    // }

    const jwk: JWKInterface = {
      "kty": "RSA",
      "n": "wg3OnyMUSzHb37srbkX0fRgQ5PLv4x1hsIfAiEoIRb7r3cGOmfaAKU36OMeReKTwxPvdJMZYD3jQ4HOXf_x9QoLSf-cglMKHtZWJL227TGav8k71eEhdtnJJ3_L9XVJxvnaU63MRExZI6G0dFB_StIrLg9lQih7NHdaWMi4L6Dq7jp739JIuFNsGdHUuGJvrlrtQMhIL9NDyNCbB_9JMI1g1n0YAoUrHit3hVCsFVfB97273x9mB76L6gqx2jbxnev3STB5KL4d92SjJCWCpaKW3Yjb1uBd2ea-eHhaHKuGkEB-hZeSpAIKayTYk9cBDC9lG_Cm7CGan4kbbz1gDKcbTeaFUBEoDwfZilEM4OPc9Bg2tTWKw3hIJk0caVhhWPfPIAtQuGCn9uGktoytdsCOhzmaasyeTFxhh9oDKzwyA4HjZwzm7wtbN_NmZxxxA2e5nNMkYc8TCoXW3loKQN_gGZgaeRMpNjCTm-TyUYp3cliYPgTO01vmLNSEIcqoFI5Du2-D8PC3iKMMmPMhDMQblZSpA9o5RXxAMm7Txxw_62UClcJ5fkiJ1ye8duWCFzhuk-5Ks49iwmKxy-0aI7XRknJmwWAT4zijhFoHxTG_6rpwQasJe7g8NuXwV2oc45j0PLa5odVBlgWtT_i2nQDXJdVleEZ9wleUCu2VgQl8",
      "e": "AQAB",
      "d": "Gef6NSZqrUTcnS7nJO-5aL2gktH6B1fz3-iZ-Kb4kd6f2q-xHa-dqLjPVIj1pn_mHTjsAbGIEBA-LMfYU8VSXQc4IflAq4xb3QAoqrPOXHPRgeIXtgYvbYZM7RFWSUxO8h5qHX0wBpiJm6sTkRSuhPNN3cS73bSZUzVDjJyZGHa-z4e0v7WXB-Zx2As2K0AO90y_HMLxqIEPXCM54RpfS_5NhKqXiQ76K0SC3311ZhLEJqtPeARVY3tejMgfC5_QEqpmpQ4a2UyXraJLywPCMJ-yvZcRNr6f1jWMuSxIwSV8lG47LNelP8aKLsr8nKUdPzt3Po0megey2nNuEhMIOrkyeTTEFxPeLI3t5eFf24-lRyAJNOXgsL8u22XBcefZUBHezgPg0BW0MbCT0wARgSWQeDUgHPD8h1e0hWxrprJ7L0COYwppyQ1JLq8kUh8EEYJnZeNqmpGQ",
      "p": "9GgCgZRp5aL3tRvXsvPvi71LzlqTQ0C1pnTfi7BTBFPGls7MjtMLp_j0j0v_5qq2P-vmyuO4LTb4ekLbOPW-JywaUfdb9Q2cys135Bwk5c4O3xB8n0s-ptN0EPT6uZKBqPBHgiIwDcTOVgY2z48__xO7e3Eh1CzfJXOFK018d2EdTAdjvyOl23dwc2_Ik95adwtuo5QvG6yxjMbXMMYQGd8I4Xl-VkGImrCIyw35K9bBdbgeJa4445aUxKQBdVhQKZt3e-2relMsJXQKEPrs7DEqbLzsokt4v9nFeksumrn16ab1MeyEgtvs5cPBq3xfhZFPwsZCUWm8z8kd3kDmzQ",
      "q": "y0JVs1Mx0KT2unISIUTijXtFPZjIoYf1z35_rh_zE_4iPyHHmNgv6EiS4UxXdQx3yudmjOHe6DgIoBH8rG6byJZnHJluJS8hvQyZTW2lceecDJCUL_uivyEF5PCcyscO50vum6OX5sYEjLSTkIcGqPlBU45u_37pImeEuq0tTKb-Qbaw5USOU_csBMpoXa0mp7BiRNbSejh1TPCD44Kp3lAV6w1MO-_bKaZaemfJQRLi5x2seXHm7fdcwV4qUBJFWoqe4jcNg2ozgQ5hlsNLcjnX9wOuPztUYzFVdEQ1Xq6_Jnx9KRG-kpBrxKaNvxz-C41BQypLvwUjyKQHfJwV2w",
      "dp": "3bPPui2f1g_7tUzZYFqJDHCdaEWfWh1D6ggQlE1RMRaxiTF0O4bUBv39ElO1gU-P3PInvBnPgyxfP8CPzd6VLEGEaqAAyY0ckpbJz6F8Ev3VXaE9-t2tqnUbzxn6qgVtGotDwpcykfrZ1Qz0AVoHimIi6noYXriJfxaIUVyLsFrm0YXOhJ9Yn3l8Byr6fq_vzhcPuND93pPLx1DD-VlhV6aLDsU_xgzSVsgWfmNhiNPZT-jBaBrfPgvlTW8cZ47BwMxnGYLhzyfNXvgg_YAxFJwQyOyjlyDxGs73pNS4JODVYqrxtuS-21mWTmJBt0Yt_CJxgNSJagKJpM7iCi9DbQ",
      "dq": "JQGi0M9o1m_ya-ew3VXJWbED3j8e6Cn02x5Q6MbwXsd6PLxNtspFjqkH9PUNR0ZJ2StgRG4rQ2RQTbR4qHxK6K5Zf59_qk12exD8KFi6Mo7UnoUENeg-rUW56QDVyyWK1RnCC5wxX9bVpTiLVVkAIWugNTJNiz7z-0uVotc81CPjTtuQQW3F7AuofAbOEaAg1Y8LlTT3hUEaOjPgD2AOxWcXVoBJTPBSmraq6nZS8gIaRbHlYQcX4GOVA6-9TG7HKcDrRIx5bV-8mNahde2Aov9dDqAg7WpD5vtob46rmN1_9-Xac8vDQrQAqwEX9Z-1sSy6oRvmRpUM-s7CfjF82Q",
      "qi": "I4btFwzMRiYl3szM6FS8lXh_wmjuC9h6kmNrpmsQLt4uIjLtvVatO1fv81HH6MuQ170MA5ISjbU0XzU6-AvMhpLobniKapsaquRk14DqDd8QehYe98fsdhjxF2M9aN8tRCB2jRtSw_0Ocj-ImNeulpkZ5z1Wkh3M5rW6rJgFa4Fvw_4unn6XXbVrNG_eg9Iy3ddY7_TB4IYUhWrKqMDsFw7kUGFZOa3stoGjEWsZL7WaZHdVeTaMGf9OUZLYTnjuY7g8ZTaai1e7UMuNENzRpz1FThapt0yDX-L62pxDmkARJbdotJhQI4vxNrV5O3PNAeEdG0Emr7vVrHEmrEwOXw"
  }
    // console.error(jwk)
    await message({
      process: luaProcessId,
      signer: createSigner(jwk),
      tags: [
        { name: "Action", value: "Best-Stake" },
        { name: "TokenX", value: tokenXProcess },
        { name: "TokenY", value: tokenYProcess },
      ],
    }).then(async (messageId) => {
      // console.log(messageId)
      await result({
        process: luaProcessId,
        message: messageId,
      })
    });

    await new Promise((resolve) => setTimeout(resolve, 10000));

    const data = await message({
      process: luaProcessId,
      tags: [{ name: "Action", value: "best-stake-user-response" }],
      signer: createSigner(jwk)
    }).then(async (messageId) => {
      // console.log(messageId)
      return await result({
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

getBestStake("0", "0")