import { useCurrentAccount } from "@mysten/dapp-kit";
import { ArrowUp, Image, Smile } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { useCreatePost, useProfile } from "@/hooks/useBlog";

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
  const currentAccount = useCurrentAccount();
  const { data: currentProfile } = useProfile(currentAccount?.address);
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

  const titleLength = title.length;
  const contentLength = content.length;
  const canPost = title.trim() && content.trim() && !isLoading;

  return (
    <form className="space-y-2" onSubmit={handleSubmit}>
      <div className="flex gap-2">
        {/* Avatar */}
        <Avatar className="size-9 shrink-0">
          <AvatarFallback className="text-xs">
            {getInitials(currentProfile?.name, currentAccount?.address)}
          </AvatarFallback>
        </Avatar>

        {/* Form Content */}
        <div className="min-w-0 flex-1 space-y-2">
          {/* Title Input */}
          <InputGroup>
            <InputGroupInput
              disabled={isLoading}
              maxLength={MAX_TITLE_LENGTH}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title..."
              value={title}
            />
          </InputGroup>

          {/* Content Textarea */}
          <InputGroup>
            <InputGroupTextarea
              disabled={isLoading}
              maxLength={MAX_CONTENT_LENGTH}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's happening?"
              value={content}
            />
            <InputGroupAddon align="block-end" className="border-t">
              <InputGroupButton
                className="rounded-full"
                size="icon-xs"
                type="button"
                variant="ghost"
              >
                <Image className="size-4" />
              </InputGroupButton>
              <InputGroupButton
                className="rounded-full"
                size="icon-xs"
                type="button"
                variant="ghost"
              >
                <Smile className="size-4" />
              </InputGroupButton>
              {(titleLength > 0 || contentLength > 0) && (
                <>
                  <InputGroupText className="ml-auto">
                    {contentLength}/{MAX_CONTENT_LENGTH}
                  </InputGroupText>
                  <Separator className="h-4!" orientation="vertical" />
                </>
              )}
              <InputGroupButton
                className="rounded-full"
                disabled={!canPost}
                size="icon-xs"
                type="submit"
                variant="default"
              >
                <ArrowUp className="size-4" />
                <span className="sr-only">{submitLabel}</span>
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>

          {/* Error Message */}
          {(error || createError) && (
            <p className="text-destructive text-sm">{error || createError}</p>
          )}
        </div>
      </div>
    </form>
  );
}
