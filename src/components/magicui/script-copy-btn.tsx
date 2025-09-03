"use client";

import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { HTMLAttributes, useEffect, useState } from "react";

interface ScriptCopyBtnProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  command: string;
}

export function ScriptCopyBtn({ command }: ScriptCopyBtnProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="link"
      size="icon"
      className="relative"
      onClick={copyToClipboard}
      aria-label={copied ? "Copied" : "Copy to clipboard"}
    >
      {/* <span className="sr-only">{copied ? "Copied" : "Copy"}</span> */}
      <Copy
        className={`h-2 w-2 transition-all duration-300 ${
          copied ? "scale-0" : "scale-100"
        }`}
      />
      <Check
        className={`absolute inset-0 m-auto h-2 w-2 transition-all duration-300 ${
          copied ? "scale-100" : "scale-0"
        }`}
      />
    </Button>
  );
}
