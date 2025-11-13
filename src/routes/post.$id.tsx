import { useCurrentAccount } from "@mysten/dapp-kit";
import { Text } from "@radix-ui/themes";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Edit, MessageCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import ClipLoader from "react-spinners/ClipLoader";
import { toast } from "sonner";
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
import { Card, CardContent } from "@/components/ui/card";
import {
  useDeletePost,
  usePost,
  useProfile,
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
  const { updatePost, isPending: isUpdating } = useUpdatePost();
  const { deletePost, isPending: isDeleting } = useDeletePost();

  const isOwner = currentAccount?.address === post?.author;
  const isEdited = post ? post.updatedAt > post.createdAt : false;

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleString();

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
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post", id] });
      queryClient.invalidateQueries({ queryKey: ["author-posts"] });
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
      <div className="mx-auto max-w-2xl space-y-6 py-6">
        <div className="flex items-center justify-center py-12">
          <ClipLoader size={32} />
        </div>
      </div>
    );
  }

  if (postError || !post) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-6">
        <Text color="red">{postError?.message || "Post not found"}</Text>
      </div>
    );
  }

  const displayName =
    authorProfile?.name ||
    `${post.author.slice(0, 6)}...${post.author.slice(-4)}`;

  if (isEditing) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-6">
        <Button onClick={() => setIsEditing(false)} variant="ghost">
          <ArrowLeft className="mr-2 size-4" />
          Back
        </Button>

        <CreatePostForm
          initialContent={post.content}
          initialTitle={post.title}
          isLoading={isUpdating}
          onSubmit={handleUpdate}
          submitLabel="Update Post"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <Button asChild variant="ghost">
        <Link to="/">
          <ArrowLeft className="mr-2 size-4" />
          Back
        </Link>
      </Button>

      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4">
            {/* Avatar */}
            <Link params={{ address: post.author }} to="/profile/$address">
              <Avatar className="size-12 cursor-pointer transition-opacity hover:opacity-80">
                <AvatarFallback>
                  {getInitials(authorProfile?.name, post.author)}
                </AvatarFallback>
              </Avatar>
            </Link>

            {/* Content */}
            <div className="min-w-0 flex-1">
              {/* Header */}
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    className="font-semibold hover:underline"
                    params={{ address: post.author }}
                    to="/profile/$address"
                  >
                    {displayName}
                  </Link>
                  <span className="text-muted-foreground text-sm">
                    {formatDate(post.createdAt)}
                    {isEdited && " · Edited"}
                  </span>
                </div>

                {/* Actions */}
                {isOwner && (
                  <div className="flex items-center gap-1">
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
              <h1 className="mb-4 font-bold text-2xl">{post.title}</h1>

              {/* Content */}
              <p className="wrap-break-word mb-6 whitespace-pre-wrap text-base">
                {post.content}
              </p>

              {/* Footer */}
              <div className="flex items-center gap-6 border-t pt-4">
                <Button className="gap-2" size="sm" variant="ghost">
                  <MessageCircle className="size-4" />
                  <span>Comment</span>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comments section - placeholder */}
      <Card>
        <CardContent className="p-6">
          <h2 className="mb-4 font-semibold text-lg">Comments</h2>
          <p className="text-muted-foreground text-sm">
            Comments feature coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
