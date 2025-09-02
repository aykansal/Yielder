import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { clampDecimals, sanitizeNumericInput } from "./shared";
import { formatTokenAmount as formatAmount } from "@/lib/helpers.utils";
import { type Token } from "@/lib/api";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";

interface LiquidityTokenInputProps {
  token: Token | null;
  value: string;
  onValueChange: (value: string) => void;
  availableTokens: Token[];
  onTokenChange: (token: Token) => void;
  balance: string;
  balanceFormatted: number;
  loadingBalances: boolean;
  decimals: number;
  insufficientBalance: boolean;
  showMaxButton?: boolean;
  onMaxClick?: () => void;
  disabled?: boolean;
  readOnly?: boolean;
}

export function LiquidityTokenInput({
  token,
  value,
  onValueChange,
  availableTokens,
  onTokenChange,
  balance,
  balanceFormatted,
  loadingBalances,
  decimals,
  insufficientBalance,
  showMaxButton = true,
  onMaxClick,
  disabled = false,
  readOnly = false,
}: LiquidityTokenInputProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let sanitizedValue = sanitizeNumericInput(e.target.value);

    // Allow typing decimal points without immediate clamping
    if (sanitizedValue.endsWith(".") || sanitizedValue === ".") {
      onValueChange(sanitizedValue);
      return;
    }

    // For complete numbers, apply clamping
    const clampedValue = clampDecimals(sanitizedValue, decimals);
    onValueChange(clampedValue);
  };

  const handleTokenSelect = (symbol: string) => {
    const selectedToken = availableTokens.find((t) => t.symbol === symbol);
    if (selectedToken) {
      onTokenChange(selectedToken);
    }
  };

  return (
    <div className="rounded-[16px] border bg-card p-4 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
      <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
        <span>{token ? token.symbol : <Skeleton className="h-4 w-9" />}</span>
        {showMaxButton && (
          <Button
            variant="outline"
            className="rounded-full border text-xs text-[hsl(var(--primary-700))] transition-colors hover:bg-[hsl(var(--primary))] disabled:opacity-50 px-2 py-0.5 h-fit"
            disabled={loadingBalances || !token || disabled}
            onClick={onMaxClick}
          >
            MAX{" "}
            {loadingBalances ? (
              <Skeleton className="h-3.5 w-5.5" />
            ) : (
              formatAmount(balanceFormatted)
            )}
          </Button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Select
          value={token?.symbol || ""}
          onValueChange={handleTokenSelect}
          disabled={disabled}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent className="max-h-60 overflow-y-auto">
            {availableTokens.map((t) => (
              <SelectItem key={t.process} value={t.symbol}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t.symbol}</span>
                  <span className="text-xs text-muted-foreground truncate max-w-24">
                    {t.fullName}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          inputMode="decimal"
          value={value}
          onChange={handleInputChange}
          className="text-right"
          placeholder="0.0"
          disabled={disabled}
          readOnly={readOnly}
        />
      </div>
      {insufficientBalance && (
        <div className="mt-1 text-xs text-red-500">Insufficient balance</div>
      )}
    </div>
  );
}
