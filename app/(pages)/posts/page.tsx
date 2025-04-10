"use client";

import PageWrapper from "@/components/wrapper/page-wrapper";
import { Button } from "@/components/ui/button";
import { Headphones, Plus, RefreshCw } from "lucide-react";
import { useState } from "react";
import RecordAudioModal from "@/components/audio/record-audio-modal";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import AudioPostCard from "@/components/posts/audio-post-card";

export default function PostsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const posts = useQuery(api.posts.getAllPosts);

  return (
    <PageWrapper>
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Audio Posts</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.location.reload()}
              title="Refresh posts"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Post
            </Button>
          </div>
        </div>

        {/* Display posts if available */}
        {posts?.length > 0 && (
          <div className="space-y-6">
            {posts.map((post) => (
              <AudioPostCard key={post._id} postId={post._id} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {posts?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full mb-4">
              <Headphones className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No audio posts yet</h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mb-6">
              Create your first audio post by clicking the &quot;New Post&quot; button above.
            </p>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Your First Post
            </Button>
          </div>
        )}

        {/* Loading state */}
        {!posts && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-full h-40 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {/* Audio recording modal */}
        <RecordAudioModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </div>
    </PageWrapper>
  );
}
