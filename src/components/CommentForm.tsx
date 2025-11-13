"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreateComment, useUpdateComment } from "@/hooks/useBlog";

type CommentFormProps = {
  postId: string;
  parentCommentId?: string | null;
  initialContent?: string;
  commentId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function CommentForm({
  postId,
  parentCommentId,
  initialContent = "",
  commentId,
  onSuccess,
  onCancel,
}: CommentFormProps) {
  const currentAccount = useCurrentAccount();
  const [content, setContent] = useState(initialContent);
  const { createComment, isPending: isCreating } = useCreateComment();
  const { updateComment, isPending: isUpdating } = useUpdateComment();
  const isEditing = !!commentId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(content.trim() && currentAccount)) return;

    try {
      if (isEditing && commentId) {
        await updateComment(commentId, content);
      } else {
        await createComment(postId, content, parentCommentId);
      }
      setContent("");
      onSuccess?.();
    } catch (error) {
      console.error("Error submitting comment:", error);
    }
  };

  if (!currentAccount) {
    return (
      <div className="border-border border-t px-4 py-4">
        <p className="text-muted-foreground text-sm">
          Please connect your wallet to comment
        </p>
      </div>
    );
  }

  return (
    <form className="border-border border-t px-4 py-4" onSubmit={handleSubmit}>
      <Textarea
        className="mb-3 min-h-20 resize-none"
        disabled={isCreating || isUpdating}
        onChange={(e) => setContent(e.target.value)}
        placeholder={isEditing ? "Edit your comment..." : "Write a comment..."}
        value={content}
      />
      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button
            disabled={isCreating || isUpdating}
            onClick={onCancel}
            size="sm"
            type="button"
            variant="ghost"
          >
            Cancel
          </Button>
        )}
        <Button
          disabled={!content.trim() || isCreating || isUpdating}
          size="sm"
          type="submit"
        >
          {isCreating || isUpdating
            ? isEditing
              ? "Updating..."
              : "Posting..."
            : isEditing
              ? "Update"
              : "Comment"}
        </Button>
      </div>
    </form>
  );
}
