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
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useAction } from "convex/react";
import { Coins } from "lucide-react";
import { useRouter } from "next/navigation";

interface Price {
  id: string;
  priceAmount: number;
  priceCurrency: string;
  recurringInterval?: 'month' | 'year' | 'one-time' | null;
  productId?: string;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  prices: Price[];
}

interface TokenPurchaseProps {
  product: Product;
}

export default function TokenPurchase({ product }: TokenPurchaseProps) {
  const { user } = useUser();
  const router = useRouter();
  const getProCheckoutUrl = useAction(api.subscriptions.getProOnboardingCheckoutUrl);

  const handlePurchase = async () => {
    if (!user) {
      router.push("/sign-in");
      return;
    }

    try {
      // Get the first price (should be the one-time token price)
      const priceId = product.prices[0]?.id;

      if (!priceId) {
        console.error("No price found for the product");
        return;
      }

      // Get the base URL for redirecting back to homepage after purchase
      const baseUrl = window.location.origin;

      const checkoutUrl = await getProCheckoutUrl({
        priceId,
        successUrl: baseUrl, // Redirect directly to homepage after successful payment
      });

      window.location.href = checkoutUrl;
    } catch (error) {
      console.error("Failed to get checkout URL:", error);
    }
  };

  if (!product || !product.prices || product.prices.length === 0) {
    return null;
  }

  const price = product.prices[0];
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: price.priceCurrency,
    minimumFractionDigits: 2,
  }).format(price.priceAmount / 100);

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{product.name}</CardTitle>
        <CardDescription>{product.description}</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <div className="flex justify-center items-end mb-4">
          <span className="text-4xl font-bold">{formattedPrice}</span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          One-time purchase for one token
        </p>
        <ul className="space-y-2 mb-6">
          <li className="flex items-center justify-center">
            <Coins className="h-5 w-5 text-green-500 mr-2" />
            <span>Post audio content</span>
          </li>
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700"
          onClick={handlePurchase}
        >
          Buy Token
        </Button>
      </CardFooter>
    </Card>
  );
}
