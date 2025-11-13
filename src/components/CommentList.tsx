"use client";

import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import type { Comment } from "@/hooks/useBlog";
import { CommentCard } from "./CommentCard";

type CommentListProps = {
  comments: Comment[];
  onEditComment?: (comment: Comment) => void;
  onDeleteComment?: (commentId: string) => void;
  emptyMessage?: string;
};

export function CommentList({
  comments,
  onEditComment,
  onDeleteComment,
  emptyMessage = "No comments yet. Be the first to comment!",
}: CommentListProps) {
  if (comments.length === 0) {
    return (
      <div className="border-border border-t px-4 py-8">
        <Empty>
          <EmptyTitle>No comments</EmptyTitle>
          <EmptyDescription>{emptyMessage}</EmptyDescription>
        </Empty>
      </div>
    );
  }

  // Separate top-level comments and replies
  const topLevelComments = comments.filter((c) => !c.parentCommentId);
  const repliesMap = new Map<string, Comment[]>();

  comments.forEach((comment) => {
    if (comment.parentCommentId) {
      if (!repliesMap.has(comment.parentCommentId)) {
        repliesMap.set(comment.parentCommentId, []);
      }
      repliesMap.get(comment.parentCommentId)!.push(comment);
    }
  });

  return (
    <div className="border-border border-t">
      {topLevelComments.map((comment) => (
        <div key={comment.id}>
          <CommentCard
            comment={comment}
            onDelete={onDeleteComment}
            onEdit={onEditComment}
          />
          {/* Replies */}
          {repliesMap.get(comment.id)?.map((reply) => (
            <div className="border-border border-l-2 pl-4" key={reply.id}>
              <CommentCard
                comment={reply}
                onDelete={onDeleteComment}
                onEdit={onEditComment}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
