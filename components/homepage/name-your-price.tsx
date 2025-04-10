"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useAction } from "convex/react";
import { Coins } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  prices: any[];
}

interface NameYourPriceProps {
  product: Product;
}

export default function NameYourPrice({ product }: NameYourPriceProps) {
  const { user } = useUser();
  const router = useRouter();
  const getProCheckoutUrl = useAction(api.subscriptions.getProOnboardingCheckoutUrl);
  const [tokenAmount, setTokenAmount] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);

  // Find the "name your price" price ID
  const nameYourPriceId = product.prices[0]?.id;

  const handleTokenAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setTokenAmount(value);
    } else {
      setTokenAmount(1); // Default to 1 if invalid input
    }
  };

  const handlePurchase = async () => {
    if (!user) {
      router.push("/sign-in");
      return;
    }

    if (!nameYourPriceId) {
      console.error("No price found for the product");
      return;
    }

    try {
      setIsLoading(true);

      // Get the base URL for redirecting back to homepage after purchase
      const baseUrl = window.location.origin;

      // For Polar's name-your-price, we need to pass the amount in cents
      // The amount should be exactly what the user wants to pay
      const amountInCents = tokenAmount * 100; // $1 per token

      console.log(`Creating checkout for ${tokenAmount} tokens at $${tokenAmount.toFixed(2)} (${amountInCents} cents)`);

      const checkoutUrl = await getProCheckoutUrl({
        priceId: nameYourPriceId,
        successUrl: baseUrl,
        // Pass the custom amount and token quantity
        customAmount: amountInCents,
        tokenQuantity: tokenAmount
      });

      window.location.href = checkoutUrl;
    } catch (error) {
      console.error("Failed to get checkout URL:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!product || !nameYourPriceId) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{product.name}</CardTitle>
        <CardDescription>{product.description}</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-blue-600" />
            <span className="font-medium">$1 = 1 Token</span>
          </div>

          <div className="flex items-center gap-2 w-full max-w-xs">
            <div className="relative w-full">
              <Input
                type="number"
                min="1"
                value={tokenAmount}
                onChange={handleTokenAmountChange}
                className="pl-8 text-center text-lg font-bold"
              />
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                <Coins className="h-4 w-4" />
              </span>
            </div>
          </div>

          <div className="text-lg font-bold">
            = ${tokenAmount.toFixed(2)}
          </div>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Buy exactly the number of tokens you need
        </p>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700"
          onClick={handlePurchase}
          disabled={isLoading}
        >
          {isLoading ? "Processing..." : `Buy ${tokenAmount} Token${tokenAmount !== 1 ? 's' : ''}`}
        </Button>
      </CardFooter>
    </Card>
  );
}
