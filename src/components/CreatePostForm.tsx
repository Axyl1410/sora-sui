import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreatePost } from "@/hooks/useBlog";

type CreatePostFormProps = {
  onSubmit?: (data: { title: string; content: string }) => void | Promise<void>;
  isLoading?: boolean;
  initialTitle?: string;
  initialContent?: string;
  submitLabel?: string;
  onSuccess?: () => void;
};

const MAX_TITLE_LENGTH = 100;
const MAX_CONTENT_LENGTH = 10_000;
const MIN_LENGTH = 1;

function validateTitle(title: string): string | null {
  const trimmed = title.trim();
  if (!trimmed) {
    return "Title is required";
  }
  if (trimmed.length < MIN_LENGTH) {
    return "Title must be at least 1 character";
  }
  if (trimmed.length > MAX_TITLE_LENGTH) {
    return "Title must be less than 100 characters";
  }
  return null;
}

function validateContent(content: string): string | null {
  const trimmed = content.trim();
  if (!trimmed) {
    return "Content is required";
  }
  if (trimmed.length < MIN_LENGTH) {
    return "Content must be at least 1 character";
  }
  if (trimmed.length > MAX_CONTENT_LENGTH) {
    return "Content must be less than 10000 characters";
  }
  return null;
}

export function CreatePostForm({
  onSubmit,
  isLoading: externalLoading = false,
  initialTitle = "",
  initialContent = "",
  submitLabel = "Post",
  onSuccess,
}: CreatePostFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [error, setError] = useState<string | null>(null);
  const {
    createPost,
    isPending: isCreatingPost,
    error: createError,
  } = useCreatePost();

  const isLoading = externalLoading || isCreatingPost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const titleError = validateTitle(title);
    if (titleError) {
      setError(titleError);
      return;
    }

    const contentError = validateContent(content);
    if (contentError) {
      setError(contentError);
      return;
    }

    try {
      if (onSubmit) {
        await onSubmit({ title: title.trim(), content: content.trim() });
      } else {
        // Use hook to create post on-chain
        await createPost(title.trim(), content.trim());
        toast.success("Post created successfully!");
      }
      setTitle("");
      setContent("");
      onSuccess?.();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create post";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const titleLength = title.length;
  const contentLength = content.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Post</CardTitle>
        <CardDescription>
          Share your thoughts with the community
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Input
              className="text-base"
              disabled={isLoading}
              maxLength={MAX_TITLE_LENGTH}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title..."
              value={title}
            />
            <div className="flex justify-between text-muted-foreground text-xs">
              <span>
                {(error || createError) && (
                  <span className="text-destructive">
                    {error || createError}
                  </span>
                )}
              </span>
              <span>
                {titleLength}/{MAX_TITLE_LENGTH}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Textarea
              className="min-h-32 resize-none text-base"
              disabled={isLoading}
              maxLength={MAX_CONTENT_LENGTH}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              value={content}
            />
            <div className="flex justify-end text-muted-foreground text-xs">
              <span>
                {contentLength}/{MAX_CONTENT_LENGTH}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              className="min-w-24"
              disabled={isLoading || !title.trim() || !content.trim()}
              type="submit"
            >
              {isLoading ? "Posting..." : submitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
