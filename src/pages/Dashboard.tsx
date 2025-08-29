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

const positions = [
  {
    processId: "gjnaCsEd749Z11",
    dex: "Permaswap" as const,
    pair: "YT3 / YT1",
    address: "bmR1GHhqKJa9MrQe9g8gC8OrNcitWyFRuVKADIKNXc8",
    pooledA: 0.00000162,
    pooledB: 0.01738629,
    myUsd: 124.56,
    aprPct: 0.000,
  },
];

export default function Dashboard() {
  const nav = useNavigate();
  return (
    <ProtectedRoute>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">User Dashboard</h1>
      </div>
      <div className="rounded-[16px] border bg-card p-4 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
        {positions.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            You have no positions yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>DEX</TableHead>
                <TableHead>Pool</TableHead>
                <TableHead>Pool Balance</TableHead>
                <TableHead>My Position</TableHead>
                <TableHead>Range</TableHead>
                <TableHead>APR</TableHead>
                <TableHead>Fees</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((p) => (
                <TableRow key={p.processId} className="hover:bg-secondary/60">
                  <TableCell>
                    <DEXBadge name={p.dex} />
                  </TableCell>
                  <TableCell>
                    <button
                      className="text-left font-semibold hover:underline"
                      onClick={() => nav(`/liquidity/add/${p.processId}`)}
                    >
                      {p.pair}
                    </button>
                    <div className="text-xs text-muted-foreground">
                      {p.address.slice(0, 6)}…{p.address.slice(-4)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{p.pooledA.toFixed(6)}</span>
                        <span className="text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">wAR</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{p.pooledB.toFixed(6)}</span>
                        <span className="text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">ARIO</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>${p.myUsd.toLocaleString()}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                      Full Range
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                      {(p.aprPct * 100).toFixed(2)}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                      Unavailable
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => nav(`/liquidity/claim/${p.processId}`)}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        Claim
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => nav(`/liquidity/add/${p.processId}`)}
                      >
                        Add
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </ProtectedRoute>
  );
}
