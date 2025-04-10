"use client"
import { Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="border-t bg-white dark:bg-black">
            <div className="mx-auto max-w-7xl px-4 py-8">
                <div className="flex flex-col items-center justify-center">
                    <Link href="/" className="flex items-center gap-2 mb-4">
                        <Sparkles className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold">AudioChat</span>
                    </Link>
                    <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                        &copy; {new Date().getFullYear()} AudioChat. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}
