import { Link } from "@tanstack/react-router";
import { Heart, MessageCircle, MoreHorizontal, Share2 } from "lucide-react";
import type { ReactNode } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

type PostCardProps = {
  postId: string;
  author: string;
  authorName?: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  isOwner?: boolean;
  onDelete?: () => void;
  actions?: ReactNode;
};

export function PostCard({
  postId,
  author,
  authorName,
  title,
  content,
  createdAt,
  updatedAt,
  isOwner = false,
  onDelete,
  actions,
}: PostCardProps) {
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
    <article className="border-border border-b px-4 py-3 transition-colors hover:bg-accent/50">
      <div className="flex gap-3">
        {/* Avatar */}
        <Link params={{ address: author }} to="/profile/$address">
          <Avatar className="size-10 flex-shrink-0 cursor-pointer transition-opacity hover:opacity-80">
            <AvatarFallback>{getInitials(authorName, author)}</AvatarFallback>
          </Avatar>
        </Link>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="mb-1 flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1">
              <Link
                className="font-semibold hover:underline"
                params={{ address: author }}
                to="/profile/$address"
              >
                {displayName}
              </Link>
              <span className="text-muted-foreground text-sm">
                @{author.slice(0, 8)}...
              </span>
              <span className="text-muted-foreground text-sm">·</span>
              <span className="text-muted-foreground text-sm">
                {formatDate(createdAt)}
                {isEdited && " · Edited"}
              </span>
            </div>

            {/* More Actions */}
            <Button className="rounded-full" size="icon-sm" variant="ghost">
              <MoreHorizontal className="size-4" />
            </Button>
          </div>

          {/* Title & Content */}
          <Link params={{ id: postId }} to="/post/$id">
            <div className="mb-3 space-y-2">
              {title && (
                <h3 className="font-semibold text-base hover:underline">
                  {title}
                </h3>
              )}
              <p className="whitespace-pre-wrap break-words text-base">
                {content}
              </p>
            </div>
          </Link>

          {/* Engagement Buttons */}
          <div className="flex items-center gap-8 text-muted-foreground">
            <Button
              asChild
              className="group gap-2 hover:text-primary"
              size="sm"
              variant="ghost"
            >
              <Link params={{ id: postId }} to="/post/$id">
                <MessageCircle className="size-5 group-hover:fill-primary group-hover:text-primary" />
                <span className="text-sm">0</span>
              </Link>
            </Button>

            <Button
              className="group gap-2 hover:text-green-500"
              size="sm"
              variant="ghost"
            >
              <Share2 className="size-5 group-hover:fill-green-500 group-hover:text-green-500" />
              <span className="text-sm">0</span>
            </Button>

            <Button
              className="group gap-2 hover:text-red-500"
              size="sm"
              variant="ghost"
            >
              <Heart className="size-5 group-hover:fill-red-500 group-hover:text-red-500" />
              <span className="text-sm">0</span>
            </Button>

            {isOwner && onDelete && (
              <Button
                className="text-destructive hover:text-destructive"
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
