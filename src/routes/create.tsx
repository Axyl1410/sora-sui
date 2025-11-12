import { useCurrentAccount } from "@mysten/dapp-kit";
import { Heading } from "@radix-ui/themes";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { CreatePostForm } from "@/components/CreatePostForm";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/create")({
  component: CreatePostPage,
});

function CreatePostPage() {
  const currentAccount = useCurrentAccount();
  const navigate = useNavigate();

  if (!currentAccount) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-6">
        <Heading>Please connect your wallet to create a post</Heading>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost">
          <Link to="/">
            <ArrowLeft className="mr-2 size-4" />
            Back
          </Link>
        </Button>
        <Heading size="8">Create New Post</Heading>
      </div>

      <CreatePostForm
        onSubmit={async (data) => {
          // TODO: Implement create post logic
          console.log("Creating post:", data);
          // Navigate to home after successful creation
          navigate({ to: "/" });
        }}
      />
    </div>
  );
}
