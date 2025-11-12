import { Link } from "@tanstack/react-router";
import { MessageCircle, MoreHorizontal, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PostCardProps {
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
}

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

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
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
    <Card className="transition-colors hover:bg-accent/50">
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Avatar */}
          <Link params={{ address: author }} to="/profile/$address">
            <Avatar className="size-10 cursor-pointer transition-opacity hover:opacity-80">
              <AvatarFallback>{getInitials(authorName, author)}</AvatarFallback>
            </Avatar>
          </Link>

          {/* Content */}
          <div className="min-w-0 flex-1">
            {/* Header */}
            <div className="mb-1 flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  className="font-semibold hover:underline"
                  params={{ address: author }}
                  to="/profile/$address"
                >
                  {displayName}
                </Link>
                <span className="text-muted-foreground text-sm">
                  {formatDate(createdAt)}
                  {isEdited && " · Edited"}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {isOwner && onDelete && (
                  <Button
                    className="text-destructive hover:text-destructive"
                    onClick={onDelete}
                    size="icon-sm"
                    variant="ghost"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
                {actions}
                <Button size="icon-sm" variant="ghost">
                  <MoreHorizontal className="size-4" />
                </Button>
              </div>
            </div>

            {/* Title */}
            <Link params={{ id: postId }} to="/post/$id">
              <h3 className="mb-2 font-semibold text-base hover:underline">
                {title}
              </h3>
            </Link>

            {/* Content */}
            <Link params={{ id: postId }} to="/post/$id">
              <p className="mb-3 line-clamp-3 whitespace-pre-wrap break-words text-muted-foreground text-sm transition-colors hover:text-foreground">
                {content}
              </p>
            </Link>

            {/* Footer */}
            <div className="flex items-center gap-6 text-muted-foreground">
              <Button
                asChild
                className="gap-2 hover:text-primary"
                size="sm"
                variant="ghost"
              >
                <Link params={{ id: postId }} to="/post/$id">
                  <MessageCircle className="size-4" />
                  <span className="text-sm">Comment</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
