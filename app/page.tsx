import { Button } from "@/components/ui/button";
import NameYourPrice from "@/components/homepage/name-your-price";
import PageWrapper from "@/components/wrapper/page-wrapper";
import { polar } from "@/lib/polar";
import { Headphones, Mic, Coins } from "lucide-react";
import Link from "next/link";

export default async function Home() {
  const data = await polar.products.list({
    organizationId: process.env.POLAR_ORGANIZATION_ID,
  });

  return (
    <PageWrapper>
      {/* Hero Section */}
      <div className="flex flex-col justify-center items-center w-full mt-[4rem] p-6 max-w-6xl mx-auto text-center">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          Share Your Voice with <span className="text-blue-600">AudioChat</span>
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mb-10">
          Create and share audio snippets with the world. Buy tokens to post your content and engage with others.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Link href="/sign-up">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              Get Started
            </Button>
          </Link>
        </div>

        {/* Token Purchase - Front and Center */}
        <div className="w-full max-w-md mx-auto mb-16">
          {data?.result?.items?.length > 0 && (
            <NameYourPrice product={data.result.items[0]} />
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="w-full bg-gray-50 dark:bg-gray-900 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full w-fit mb-4">
                <Coins className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Buy Tokens</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Purchase tokens to unlock the ability to post audio content on the platform.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full w-fit mb-4">
                <Mic className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Record Audio</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Create short audio snippets directly in your browser. No special equipment needed.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full w-fit mb-4">
                <Headphones className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Share & Listen</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Share your audio with the community and listen to what others have created.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="w-full py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Share Your Voice?</h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Join AudioChat today and start sharing your audio snippets with the world.
          </p>
          <Link href="/sign-up">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              Get Started Now
            </Button>
          </Link>
        </div>
      </div>
    </PageWrapper>
  );
}
