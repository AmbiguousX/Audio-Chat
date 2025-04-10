import Provider from "@/app/provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/react";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://audiochat.app/"),
  title: {
    default: 'AudioChat',
    template: `%s | AudioChat`
  },
  description:
    "AudioChat - Share audio snippets with tokens",
  openGraph: {
    description:
      "AudioChat - Share audio snippets with tokens",
    images: [
      "/og-image.png",
    ],
    url: "https://audiochat.app/",
  },
  twitter: {
    card: "summary_large_image",
    title: "AudioChat",
    description:
      "AudioChat - Share audio snippets with tokens",
    siteId: "",
    creator: "@audiochat",
    creatorId: "",
    images: [
      "/og-image.png",
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider dynamic>
      <html lang="en" suppressHydrationWarning>
        <body className={GeistSans.className}>
          <Provider>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <Toaster />
            </ThemeProvider>
          </Provider>
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
