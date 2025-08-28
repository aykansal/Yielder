import { AppShell } from "@/components/layout/AppShell";
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
    pair: "wAR / ARIO",
    address: "0xabc12345def67890abcd",
    pooledA: 0.00000162,
    pooledB: 0.01738629,
    myUsd: 1234.56,
    aprPct: 0.089,
  },
];

export default function Dashboard() {
  const nav = useNavigate();
  return (
    <ProtectedRoute>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">User Dashboard</h1>
      </div>
      <div className="rounded-[16px] border bg-white p-4 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
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
                    <div className="text-sm">{p.pooledA.toFixed(8)} wAR</div>
                    <div className="text-sm">{p.pooledB.toFixed(8)} ARIO</div>
                  </TableCell>
                  <TableCell>${p.myUsd.toLocaleString()}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700">
                      Full Range
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                      {(p.aprPct * 100).toFixed(2)}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700">
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
