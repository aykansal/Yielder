export type PoolAPIResponse = {
    PERMASWAP: Record<
      string,
      {
        tvl: number;
        tokenA: string;
        tokenB: string;
        symbolX: string;
        symbolY: string;
        fee: string;
        apr: number;
        dexName: "PERMASWAP";
        poolAddress: string;
        ticker: string;
        name: string;
        denomination: string;
      }
    >;
    BOTEGA: Record<
      string,
      {
        tvl: number;
        tokenA: string;
        tokenB: string;
        fee: string;
        apr: number;
        dexName: "BOTEGA";
        poolAddress: string;
        ticker: string;
        name: string;
        denomination: string;
      }
    >;
  };
  