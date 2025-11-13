import { useCurrentAccount } from "@mysten/dapp-kit";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Edit,
  Heart,
  MessageCircle,
  Pin,
  Share2,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import ClipLoader from "react-spinners/ClipLoader";
import { toast } from "sonner";
import { CommentForm } from "@/components/CommentForm";
import { CommentList } from "@/components/CommentList";
import { CreatePostForm } from "@/components/CreatePostForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { Comment } from "@/hooks/useBlog";
import {
  useComments,
  useDeleteComment,
  useDeletePost,
  usePinnedPost,
  usePinPost,
  usePost,
  useProfile,
  useUnpinPost,
  useUpdatePost,
} from "@/hooks/useBlog";

export const Route = createFileRoute("/post/$id")({
  component: PostDetailPage,
});

function PostDetailPage() {
  const currentAccount = useCurrentAccount();
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: post, isLoading: postLoading, error: postError } = usePost(id);
  const { data: authorProfile } = useProfile(post?.author);
  const { data: comments } = useComments(id);
  const { updatePost, isPending: isUpdating } = useUpdatePost();
  const { deletePost, isPending: isDeleting } = useDeletePost();
  // const { updateComment } = useUpdateComment();
  const { deleteComment } = useDeleteComment();
  const { pinPost, isPending: isPinning } = usePinPost();
  const { unpinPost, isPending: isUnpinning } = useUnpinPost();
  const { data: authorProfileData } = useProfile(post?.author);
  const { data: pinnedPost } = usePinnedPost(authorProfileData?.id);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);

  const isOwner = currentAccount?.address === post?.author;
  const isEdited = post ? post.updatedAt > post.createdAt : false;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ago`;
    }
    if (hours > 0) {
      return `${hours}h ago`;
    }
    if (minutes > 0) {
      return `${minutes}m ago`;
    }
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

  const handleUpdate = async (data: { title: string; content: string }) => {
    if (!post) {
      return;
    }

    try {
      await updatePost(post.id, data.title, data.content);
      toast.success("Post updated successfully!");
      // Invalidate and refetch all related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["posts"] }),
        queryClient.invalidateQueries({ queryKey: ["post", id] }),
        queryClient.invalidateQueries({ queryKey: ["author-posts"] }),
      ]);
      // Refetch the current post to get updated data
      await queryClient.refetchQueries({ queryKey: ["post", id] });
      setIsEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update post");
    }
  };

  const handleDelete = async () => {
    if (!post) {
      return;
    }

    try {
      await deletePost(post.id);
      toast.success("Post deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["author-posts"] });
      setShowDeleteDialog(false);
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete post");
    }
  };

  if (postLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <ClipLoader size={32} />
      </div>
    );
  }

  if (postError || !post) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-destructive">
          {postError?.message || "Post not found"}
        </p>
      </div>
    );
  }

  const displayName =
    authorProfile?.name ||
    `${post.author.slice(0, 6)}...${post.author.slice(-4)}`;

  if (isEditing) {
    return (
      <div className="flex h-full flex-col">
        <div className="sticky top-0 z-10 border-border border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
          <div className="flex h-14 items-center gap-4 px-4">
            <SidebarTrigger className="md:hidden" />
            <Button
              onClick={() => setIsEditing(false)}
              size="sm"
              variant="ghost"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <h1 className="font-bold text-xl">Edit Post</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <CreatePostForm
            initialContent={post.content}
            initialTitle={post.title}
            isLoading={isUpdating}
            onSubmit={handleUpdate}
            submitLabel="Update Post"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 border-border border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="flex h-14 items-center gap-4 px-4">
          <SidebarTrigger className="md:hidden" />
          <Button asChild size="sm" variant="ghost">
            <Link to="/">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="font-bold text-xl">Post</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <article className="border-border border-b px-4 py-4">
          <div className="flex gap-3">
            {/* Avatar */}
            <Link params={{ address: post.author }} to="/profile/$address">
              <Avatar className="size-12 shrink-0 cursor-pointer transition-opacity hover:opacity-80">
                <AvatarFallback>
                  {getInitials(authorProfile?.name, post.author)}
                </AvatarFallback>
              </Avatar>
            </Link>

            {/* Content */}
            <div className="min-w-0 flex-1">
              {/* Header */}
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1">
                  <Link
                    className="font-semibold hover:underline"
                    params={{ address: post.author }}
                    to="/profile/$address"
                  >
                    {displayName}
                  </Link>
                  <span className="text-muted-foreground text-sm">
                    @{post.author.slice(0, 8)}...
                  </span>
                  <span className="text-muted-foreground text-sm">·</span>
                  <span className="text-muted-foreground text-sm">
                    {formatDate(post.createdAt)}
                    {isEdited && " · Edited"}
                  </span>
                </div>

                {/* Actions */}
                {isOwner && (
                  <div className="flex items-center gap-1">
                    {pinnedPost?.id === post.id ? (
                      <Button
                        disabled={isUnpinning}
                        onClick={async () => {
                          try {
                            await unpinPost(authorProfileData!.id);
                            toast.success("Post unpinned!");
                            queryClient.invalidateQueries({
                              queryKey: ["pinned-post"],
                            });
                            queryClient.invalidateQueries({
                              queryKey: ["profile"],
                            });
                          } catch (err) {
                            toast.error(
                              err instanceof Error
                                ? err.message
                                : "Failed to unpin post"
                            );
                          }
                        }}
                        size="icon-sm"
                        title="Unpin post"
                        variant="ghost"
                      >
                        <Pin className="size-4 fill-current" />
                      </Button>
                    ) : (
                      <Button
                        disabled={isPinning}
                        onClick={async () => {
                          try {
                            await pinPost(authorProfileData!.id, post.id);
                            toast.success("Post pinned!");
                            queryClient.invalidateQueries({
                              queryKey: ["pinned-post"],
                            });
                            queryClient.invalidateQueries({
                              queryKey: ["profile"],
                            });
                          } catch (err) {
                            toast.error(
                              err instanceof Error
                                ? err.message
                                : "Failed to pin post"
                            );
                          }
                        }}
                        size="icon-sm"
                        title="Pin post"
                        variant="ghost"
                      >
                        <Pin className="size-4" />
                      </Button>
                    )}
                    <Button
                      onClick={() => setIsEditing(true)}
                      size="icon-sm"
                      variant="ghost"
                    >
                      <Edit className="size-4" />
                    </Button>
                    <AlertDialog
                      onOpenChange={setShowDeleteDialog}
                      open={showDeleteDialog}
                    >
                      <AlertDialogTrigger asChild>
                        <Button
                          className="text-destructive hover:text-destructive"
                          disabled={isDeleting}
                          size="icon-sm"
                          variant="ghost"
                        >
                          {isDeleting ? (
                            <ClipLoader size={16} />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Post</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this post? This
                            action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isDeleting}>
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isDeleting}
                            onClick={handleDelete}
                          >
                            {isDeleting ? "Deleting..." : "Delete"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>

              {/* Title */}
              <h1 className="mb-3 font-bold text-2xl">{post.title}</h1>

              {/* Content */}
              <p className="wrap-break-word mb-4 whitespace-pre-wrap text-base">
                {post.content}
              </p>

              {/* Engagement Buttons */}
              <div className="flex items-center gap-8 border-border border-t pt-3 text-muted-foreground">
                <Button
                  className="group gap-2 hover:text-primary"
                  size="sm"
                  variant="ghost"
                >
                  <MessageCircle className="size-5 group-hover:fill-primary group-hover:text-primary" />
                  <span className="text-sm">{post.commentCount || 0}</span>
                </Button>

                <Button
                  className="group gap-2 hover:text-green-500"
                  size="sm"
                  variant="ghost"
                >
                  <Share2 className="size-5 group-hover:fill-green-500 group-hover:text-green-500" />
                </Button>

                <Button
                  className="group gap-2 hover:text-red-500"
                  size="sm"
                  variant="ghost"
                >
                  <Heart className="size-5 group-hover:fill-red-500 group-hover:text-red-500" />
                  <span className="text-sm">{post.likeCount || 0}</span>
                </Button>
              </div>
            </div>
          </div>
        </article>

        {/* Comments section */}
        <div className="border-border border-b">
          <div className="border-border border-b px-4 py-3">
            <h2 className="font-semibold text-lg">
              Comments ({comments?.length || 0})
            </h2>
          </div>

          {/* Comment Form */}
          {!editingComment && (
            <CommentForm
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ["comments", id] });
                queryClient.invalidateQueries({ queryKey: ["post", id] });
              }}
              postId={id}
            />
          )}

          {/* Edit Comment Form */}
          {editingComment && (
            <div className="border-border border-b">
              <CommentForm
                commentId={editingComment.id}
                initialContent={editingComment.content}
                onCancel={() => setEditingComment(null)}
                onSuccess={() => {
                  setEditingComment(null);
                  queryClient.invalidateQueries({ queryKey: ["comments", id] });
                }}
                postId={id}
              />
            </div>
          )}

          {/* Comments List */}
          <CommentList
            comments={comments || []}
            onDeleteComment={async (commentId) => {
              try {
                await deleteComment(id, commentId);
                toast.success("Comment deleted successfully!");
                queryClient.invalidateQueries({ queryKey: ["comments", id] });
                queryClient.invalidateQueries({ queryKey: ["post", id] });
              } catch (err) {
                toast.error(
                  err instanceof Error
                    ? err.message
                    : "Failed to delete comment"
                );
              }
            }}
            onEditComment={(comment) => setEditingComment(comment)}
          />
        </div>
      </div>
    </div>
  );
}
