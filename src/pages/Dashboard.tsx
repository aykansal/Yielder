import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DEXBadge } from "@/components/atoms/DEXBadge";
import { getUserLpPositions } from "@/lib/api";
import { useAo } from "@/hooks/use-ao";
import { luaProcessId } from "@/lib/constants/index.constants";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-global-state";
import { DEX } from "@/types/pool.types";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const nav = useNavigate();
  const ao = useAo();
  const { wallet } = useAuth();

  const [positions, setPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const handleFetchUserLpPositions = async () => {
    try {
      setIsLoading(true);
      const positionsData = await getUserLpPositions(
        ao,
        luaProcessId,
        wallet?.address,
      );

      const transformedPositions = Object.entries(positionsData || {}).map(
        ([poolAddress, position]: [string, any]) => ({
          processId: poolAddress,
          dex: position.dex_name || "Unknown",
          address: poolAddress,
          user_token_x:
            parseFloat(position.user_token_x || "0") / 1000000000000,
          user_token_y:
            parseFloat(position.user_token_y || "0") / 1000000000000,
          yielder_lp_token:
            parseFloat(position.yielder_lp_token || "0") / 1000000000000,
          pool_lp_token:
            parseFloat(position.pool_lp_token || "0") / 1000000000000,
          token_x_address: position.token_x_address,
          token_y_address: position.token_y_address,
          timestamp: position.timestamp,
        }),
      );

      setPositions(transformedPositions);
      console.log(
        "[dashboard.tsx] Loaded positions:",
        transformedPositions.length,
        "positions",
      );
    } catch (error) {
      console.error("Error fetching user LP positions:", error);
      setPositions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (wallet?.address) {
      handleFetchUserLpPositions();
    }
  }, [wallet?.address]);

  return (
    <ProtectedRoute>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">User Dashboard</h1>
      </div>
      <div className="rounded-[16px] border bg-card p-4 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
        {isLoading ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>DEX Name</TableHead>
                <TableHead>Pool Address</TableHead>
                <TableHead>Token X Amount</TableHead>
                <TableHead>Token Y Amount</TableHead>
                <TableHead>LP Tokens</TableHead>
                <TableHead>Pool LP Total</TableHead>
                <TableHead>Token X Address</TableHead>
                <TableHead>Token Y Address</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-6 w-20" />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : positions.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            You have no positions yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>DEX Name</TableHead>
                <TableHead>Pool Address</TableHead>
                <TableHead>Token X Amount</TableHead>
                <TableHead>Token Y Amount</TableHead>
                <TableHead>LP Tokens</TableHead>
                <TableHead>Pool LP Total</TableHead>
                <TableHead>Token X Address</TableHead>
                <TableHead>Token Y Address</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((p) => {
                const cellValues = [
                  {
                    text: `${p.address.slice(0, 8)}…${p.address.slice(-8)}`,
                    size: "xs",
                  },
                  {
                    text: p.user_token_x?.toLocaleString() || "0",
                    size: "sm",
                  },
                  {
                    text: p.user_token_y?.toLocaleString() || "0",
                    size: "sm",
                  },
                  {
                    text: p.yielder_lp_token?.toLocaleString() || "0",
                    size: "sm",
                  },
                  {
                    text: p.pool_lp_token?.toLocaleString() || "0",
                    size: "sm",
                  },
                  {
                    text: `${p.token_x_address?.slice(0, 8)}…${p.token_x_address?.slice(-8)}`,
                    size: "xs",
                  },
                  {
                    text: `${p.token_y_address?.slice(0, 8)}…${p.token_y_address?.slice(-8)}`,
                    size: "xs",
                  },
                ];
                return (
                  <TableRow key={p.processId} className="hover:bg-secondary/60">
                    <TableCell>
                      {isLoading ? (
                        <Skeleton className="h-6 w-20" />
                      ) : (
                        <DEXBadge name={p.dex} />
                      )}
                    </TableCell>
                    {cellValues.map((cell, i) => (
                      <TableCell key={i}>
                        {isLoading ? (
                          <Skeleton className="h-4 w-24" />
                        ) : (
                          <div className={`font-mono text-${cell.size}`}>
                            {cell.text}
                          </div>
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {isLoading ? (
                          <Skeleton className="h-8 w-16" />
                        ) : (
                          <Button
                            size="sm"
                            onClick={() =>
                              nav(
                                `/liquidity?processId=${p.processId}&type=add&dex=${p.dex.toLowerCase() == DEX.BOTEGA.toLowerCase() ? DEX.BOTEGA : DEX.PERMASWAP}`,
                              )
                            }
                          >
                            Add
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </ProtectedRoute>
  );
}
