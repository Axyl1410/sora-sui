import { useCurrentAccount } from "@mysten/dapp-kit";
import { Link } from "@tanstack/react-router";
import { Bookmark, Heart, MessageCircle, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  useBookmarkPost,
  useHasLiked,
  useIsBookmarked,
  useLikePost,
  useUnbookmarkPost,
  useUnlikePost,
} from "@/hooks/useBlog";

type PostCardProps = {
  postId: string;
  author: string;
  authorName?: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  likeCount?: number;
  commentCount?: number;
  isOwner?: boolean;
  onDelete?: () => void;
};

export function PostCard({
  postId,
  author,
  authorName,
  title,
  content,
  createdAt,
  updatedAt,
  likeCount = 0,
  commentCount = 0,
  isOwner = false,
  onDelete,
}: PostCardProps) {
  const currentAccount = useCurrentAccount();
  const userAddress = currentAccount?.address;
  const { data: hasLiked } = useHasLiked(postId, userAddress);
  const { data: isBookmarked } = useIsBookmarked(postId, userAddress);
  const { likePost, isPending: isLiking } = useLikePost();
  const { unlikePost, isPending: isUnliking } = useUnlikePost();
  const { bookmarkPost, isPending: isBookmarking } = useBookmarkPost();
  const { unbookmarkPost, isPending: isUnbookmarking } = useUnbookmarkPost();

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!userAddress) return;

    try {
      if (hasLiked) {
        await unlikePost(postId);
      } else {
        await likePost(postId);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!userAddress) return;

    try {
      if (isBookmarked) {
        await unbookmarkPost(postId);
      } else {
        await bookmarkPost(postId);
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
    }
  };
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d`;
    }
    if (hours > 0) {
      return `${hours}h`;
    }
    if (minutes > 0) {
      return `${minutes}m`;
    }
    return "now";
  };

  const getInitials = (name?: string, address?: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (address) {
      return address.slice(2, 4).toUpperCase();
    }
    return "??";
  };

  const displayName =
    authorName || `${author.slice(0, 6)}...${author.slice(-4)}`;
  const isEdited = updatedAt > createdAt;

  return (
    <article className="border-border border-b px-4 py-2 transition-colors hover:bg-accent/50">
      <div className="flex gap-2">
        {/* Avatar */}
        <Link params={{ address: author }} to="/profile/$address">
          <Avatar className="size-9 shrink-0 cursor-pointer transition-opacity hover:opacity-80">
            <AvatarFallback className="text-xs">
              {getInitials(authorName, author)}
            </AvatarFallback>
          </Avatar>
        </Link>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="mb-0.5 flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-0.5">
              <Link
                className="font-semibold text-sm hover:underline"
                params={{ address: author }}
                to="/profile/$address"
              >
                {displayName}
              </Link>
              <span className="text-muted-foreground text-xs">
                @{author.slice(0, 6)}...
              </span>
              <span className="text-muted-foreground text-xs">·</span>
              <span className="text-muted-foreground text-xs">
                {formatDate(createdAt)}
                {isEdited && " · Edited"}
              </span>
            </div>

            {/* More Actions */}
            <Button
              className="h-6 rounded-full px-1"
              size="icon-sm"
              variant="ghost"
            >
              <MoreHorizontal className="size-3.5" />
            </Button>
          </div>

          {/* Title & Content */}
          <Link params={{ id: postId }} to="/post/$id">
            <div className="mb-1.5 space-y-1">
              {title && (
                <h3 className="font-semibold text-sm hover:underline">
                  {title}
                </h3>
              )}
              <p className="wrap-break-word whitespace-pre-wrap text-sm leading-relaxed">
                {content}
              </p>
            </div>
          </Link>

          {/* Engagement Buttons */}
          <div className="flex items-center gap-6 text-muted-foreground">
            <Button
              asChild
              className="group h-7 gap-1.5 px-1 hover:text-primary"
              disabled={!userAddress}
              size="sm"
              variant="ghost"
            >
              <Link params={{ id: postId }} to="/post/$id">
                <MessageCircle className="size-4 group-hover:fill-primary group-hover:text-primary" />
                <span className="text-xs">{commentCount}</span>
              </Link>
            </Button>

            <Button
              className={`group h-7 gap-1.5 px-1 hover:text-green-500 ${isBookmarked ? "text-green-500" : ""}`}
              disabled={!userAddress || isBookmarking || isUnbookmarking}
              onClick={handleBookmark}
              size="sm"
              variant="ghost"
            >
              <Bookmark
                className={`size-4 ${isBookmarked ? "fill-green-500 text-green-500" : ""} group-hover:fill-green-500 group-hover:text-green-500`}
              />
            </Button>

            <Button
              className={`group h-7 gap-1.5 px-1 hover:text-red-500 ${hasLiked ? "text-red-500" : ""}`}
              disabled={!userAddress || isLiking || isUnliking}
              onClick={handleLike}
              size="sm"
              variant="ghost"
            >
              <Heart
                className={`size-4 ${hasLiked ? "fill-red-500 text-red-500" : ""} group-hover:fill-red-500 group-hover:text-red-500`}
              />
              <span className="text-xs">{likeCount}</span>
            </Button>

            {isOwner && onDelete && (
              <Button
                className="h-7 px-1 text-destructive text-xs hover:text-destructive"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete();
                }}
                size="sm"
                variant="ghost"
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
