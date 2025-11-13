"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { createFileRoute } from "@tanstack/react-router";
import ClipLoader from "react-spinners/ClipLoader";
import { PostList } from "@/components/PostList";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useBookmarks } from "@/hooks/useBlog";

export const Route = createFileRoute("/bookmarks")({
  component: BookmarksPage,
});

function BookmarksPage() {
  const currentAccount = useCurrentAccount();
  const { data: bookmarks, isLoading } = useBookmarks(currentAccount?.address);

  if (!currentAccount) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">
          Please connect your wallet to view bookmarks
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <ClipLoader size={32} />
      </div>
    );
  }

  const postsWithNames =
    bookmarks?.map((post) => ({
      ...post,
      authorName: undefined, // Will be fetched by PostCard
    })) ?? [];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 border-border border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="flex h-14 items-center gap-4 px-4">
          <SidebarTrigger className="md:hidden" />
          <h1 className="font-bold text-xl">Bookmarks</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <PostList
          emptyMessage="You haven't bookmarked any posts yet."
          isOwner={(author) => currentAccount?.address === author}
          posts={postsWithNames}
        />
      </div>
    </div>
  );
}
