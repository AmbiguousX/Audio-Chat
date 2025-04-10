"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Coins } from "lucide-react";

export default function TokenBalance() {
  const userTokens = useQuery(api.tokens.getUserTokens);
  
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-full border border-blue-200 dark:border-blue-900">
      <Coins className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
        {userTokens === undefined ? (
          "Loading..."
        ) : userTokens === null ? (
          "Sign in to view tokens"
        ) : (
          `${userTokens.tokens} Token${userTokens.tokens !== 1 ? "s" : ""}`
        )}
      </span>
    </div>
  );
}
