"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

import { BrandService, SecurityType } from "@/src/lib/brands/BrandService";

interface InstrumentLogoProps {
  ticker: string | null;
  name: string;
  isin?: string | null;
  assetType?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function InstrumentLogo({
  ticker,
  name,
  isin,
  assetType,
  className,
  size = "md"
}: InstrumentLogoProps) {
  const [error, setError] = useState(false);

  const cleanTicker = ticker?.split(".")[0]?.toUpperCase() || "";
  
  // Decide which API to use based on asset type or ticker patterns
  const isCrypto = assetType === "OTHER" || ["BTC", "ETH", "SOL", "USDT", "BETH", "ADA", "ALGO", "AVAX", "DOT"].includes(cleanTicker);
  const isFund = assetType === "MUTUAL_FUND" || assetType === "FUND";
  const isEtf = assetType === "ETF";
  
  const securityType: SecurityType = isCrypto ? 'crypto' : isEtf ? 'etf' : isFund ? 'fund' : 'stock';
  
  const primaryUrl = BrandService.getLogoUrl(cleanTicker, securityType, name, isin);
  const fallbackUrl = BrandService.getFallbackUrl(cleanTicker, securityType, name);
  
  // Track fallback state
  const [useFallback, setUseFallback] = useState(false);
  const logoUrl = error ? null : (useFallback && fallbackUrl ? fallbackUrl : primaryUrl);

  const sizeClasses = {
    sm: "h-6 w-6 text-[10px]",
    md: "h-9 w-9 text-xs",
    lg: "h-12 w-12 text-sm"
  };

  // Modern fallback colors based on ticker hash
  const getFallbackColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      "bg-blue-100 text-blue-700 border-blue-200",
      "bg-orange-100 text-orange-700 border-orange-200",
      "bg-green-100 text-green-700 border-green-200",
      "bg-purple-100 text-purple-700 border-purple-200",
      "bg-rose-100 text-rose-700 border-rose-200",
      "bg-amber-100 text-amber-700 border-amber-200",
      "bg-cyan-100 text-cyan-700 border-cyan-200",
      "bg-teal-100 text-teal-700 border-teal-200",
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  const initials = (ticker || name).substring(0, 2).toUpperCase();
  const fallbackStyles = getFallbackColor(ticker || name);

  return (
    <div className={cn(
      "relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border font-bold tracking-tighter transition-all duration-300",
      sizeClasses[size],
      !error && "bg-white",
      error && fallbackStyles,
      className
    )}>
      {!error && logoUrl ? (
        <img
          src={logoUrl}
          alt={name}
          className="h-full w-full object-contain p-1.5"
          onError={() => {
            if (!useFallback && fallbackUrl) {
              setUseFallback(true);
            } else {
              setError(true);
            }
          }}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
