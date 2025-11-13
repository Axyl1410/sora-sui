"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { Link } from "@tanstack/react-router";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Comment } from "@/hooks/useBlog";
import { useProfile } from "@/hooks/useBlog";

type CommentCardProps = {
  comment: Comment;
  onEdit?: (comment: Comment) => void;
  onDelete?: (commentId: string) => void;
};

export function CommentCard({ comment, onEdit, onDelete }: CommentCardProps) {
  const currentAccount = useCurrentAccount();
  const { data: authorProfile } = useProfile(comment.author);
  const isOwner = currentAccount?.address === comment.author;

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
    authorProfile?.name ||
    `${comment.author.slice(0, 6)}...${comment.author.slice(-4)}`;
  const isEdited = comment.updatedAt > comment.createdAt;

  return (
    <div className="border-border border-b px-4 py-2 transition-colors last:border-b-0 hover:bg-accent/50">
      <div className="flex gap-2">
        {/* Avatar */}
        <Link params={{ address: comment.author }} to="/profile/$address">
          <Avatar className="size-9 shrink-0 cursor-pointer transition-opacity hover:opacity-80">
            <AvatarFallback className="text-xs">
              {getInitials(authorProfile?.name, comment.author)}
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
                params={{ address: comment.author }}
                to="/profile/$address"
              >
                {displayName}
              </Link>
              <span className="text-muted-foreground text-xs">
                @{comment.author.slice(0, 6)}...
              </span>
              <span className="text-muted-foreground text-xs">·</span>
              <span className="text-muted-foreground text-xs">
                {formatDate(comment.createdAt)}
                {isEdited && " · Edited"}
              </span>
            </div>

            {/* More Actions */}
            {isOwner && (onEdit || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="h-6 rounded-full px-1"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    size="icon-sm"
                    variant="ghost"
                  >
                    <MoreVertical className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onCloseAutoFocus={(e) => {
                    e.preventDefault();
                  }}
                >
                  {onEdit && (
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        onEdit(comment);
                      }}
                    >
                      <Pencil className="mr-2 size-4" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem
                      className="text-destructive"
                      onSelect={(e) => {
                        e.preventDefault();
                        onDelete(comment.id);
                      }}
                    >
                      <Trash2 className="mr-2 size-4" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Comment Content */}
          <p className="wrap-break-word whitespace-pre-wrap text-sm leading-relaxed">
            {comment.content}
          </p>
        </div>
      </div>
    </div>
  );
}
