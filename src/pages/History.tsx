import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@/hooks/use-global-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Link } from "react-router";

type TxTag = { name: string; value: string };

type TransactionNode = {
  id: string;
  tags: TxTag[];
  block?: {
    timestamp?: number;
  };
};

type TransactionEdge = {
  node: TransactionNode;
  cursor: string;
};

type TransactionsResponse = {
  data: {
    transactions: {
      edges: TransactionEdge[];
      pageInfo: {
        hasNextPage: boolean;
      };
    };
  };
};

const GRAPHQL_URL = "https://ao-search-gateway.goldsky.com/graphql";

const History2 = () => {
  const { wallet } = useAuth();
  const [edges, setEdges] = useState<TransactionEdge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [lastCursor, setLastCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const buildQuery = (ownerAddress: string, afterCursor?: string) => {
    // include 'after' only when provided
    const afterPart = afterCursor ? `, after: "${afterCursor}"` : "";
    return {
      query: `
        query {
          transactions(
            first: 100,
            owners: ["${ownerAddress}"]
            ${afterPart}
            tags: [{ name: "Tx-Source", values: ["Yielder"] }]
          ) {
            edges {
              node {
                id
                tags {
                  name
                  value
                }
                block {
                  timestamp
                }
              }
              cursor
            }
            pageInfo {
              hasNextPage
            }
          }
        }
      `,
    };
  };

  const fetchTransactions = async (afterCursor?: string, append = false) => {
    if (!wallet?.address) return;
    // avoid overlapping fetches (optional)
    if (isLoading) return;
  
    setIsLoading(true);
    setError(null);
  
    try {
      let cursor: string | undefined = afterCursor ?? undefined;
      const maxAttempts = 20; // tweak if you expect to page a lot
      let attempts = 0;
      let foundDisplayable: TransactionEdge[] = [];
      let finalHasNextPage = false;
  
      // keep fetching pages until we find displayable edges or run out of pages / attempts
      while (attempts < maxAttempts) {
        const payload = buildQuery(wallet.address, cursor);
        const res = await axios.post<TransactionsResponse>(GRAPHQL_URL, payload, {
          headers: { "Content-Type": "application/json", Accept: "application/json" },
        });
  
        const fetchedEdges = res.data.data.transactions.edges || [];
        const pageHasNext = res.data.data.transactions.pageInfo?.hasNextPage ?? false;
        finalHasNextPage = pageHasNext;
  
        // update lastCursor with the raw oldest edge cursor (even if filtered)
        const oldestCursor = fetchedEdges.length > 0 ? fetchedEdges[fetchedEdges.length - 1].cursor : null;
        if (oldestCursor) setLastCursor(oldestCursor);
  
        // filter out Track-User-Stake
        const filtered = fetchedEdges.filter((edge) => {
          const actionTag = edge.node.tags?.find((t) => t.name === "Action")?.value;
          return actionTag !== "Track-User-Stake";
        });
  
        if (filtered.length > 0) {
          // we found displayable transactions on this page
          foundDisplayable.push(...filtered);
          break;
        }
  
        // no displayable items on this page
        if (!pageHasNext || !oldestCursor) {
          // no more pages to fetch
          break;
        }
  
        // continue to next (older) page
        cursor = oldestCursor;
        attempts += 1;
      }
  
      // update state:
      if (append) {
        // append but avoid duplicates
        setEdges((prev) => {
          const existingIds = new Set(prev.map((e) => e.node.id));
          const uniqueNew = foundDisplayable.filter((e) => !existingIds.has(e.node.id));
          return [...prev, ...uniqueNew];
        });
      } else {
        setEdges(foundDisplayable);
      }
  
      setHasNextPage(finalHasNextPage);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setError("Failed to fetch transactions. See console for details.");
    } finally {
      setIsLoading(false);
    }
  };
  

  // initial load or when wallet changes
  useEffect(() => {
    if (!wallet?.address) {
      setEdges([]);
      setHasNextPage(false);
      setLastCursor(null);
      return;
    }
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet?.address]);

  const loadOlder = () => {
    if (!lastCursor) return;
    fetchTransactions(lastCursor, true);
  };

  const refresh = () => {
    fetchTransactions(undefined, false);
  };

  return (
    <ProtectedRoute>
      <div className="rounded-[16px] border bg-card p-4 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Transaction History</h1>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => refresh()}
              disabled={!wallet?.address || isLoading}
            >
              Refresh
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => loadOlder()}
              disabled={!hasNextPage || !lastCursor || isLoading}
            >
              Load older
            </Button>
          </div>
        </div>

        {isLoading && edges.length === 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tx ID</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-20" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : edges.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            {wallet?.address
              ? "No transactions found."
              : "Connect your wallet to view history."}
          </div>
        ) : (
          <>
            {error && <div className="mb-4 text-sm text-red-500">{error}</div>}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tx ID</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {edges.map((edge) => {
                  const tx = edge.node;
                  const actionTag = tx.tags?.find((t) => t.name === "Action");
                  const formattedTs =
                    tx.block?.timestamp != null
                      ? new Date(tx.block.timestamp * 1000).toLocaleString()
                      : "-";

                  return (
                    <TableRow key={tx.id} className="hover:bg-secondary/60">
                      <TableCell className="font-mono">
                        {tx.id.slice(0, 8)}…{tx.id.slice(-8)}
                      </TableCell>
                      <TableCell>{actionTag?.value ?? "-"}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {formattedTs}
                      </TableCell>
                      <TableCell>
                        <Link
                          to={`https://ao.link/#/entity/${tx.id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {hasNextPage
                  ? "More older transactions available."
                  : "End of history."}
              </div>
              <div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => loadOlder()}
                  disabled={!hasNextPage || isLoading}
                >
                  {isLoading ? "Loading..." : "Load older"}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
};

export default History2;
