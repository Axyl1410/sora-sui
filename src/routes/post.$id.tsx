import { useCurrentAccount } from "@mysten/dapp-kit";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Edit, MessageCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { CreatePostForm } from "@/components/CreatePostForm";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/post/$id")({
  component: PostDetailPage,
});

function PostDetailPage() {
  const currentAccount = useCurrentAccount();
  const { id } = Route.useParams();
  const [isEditing, setIsEditing] = useState(false);

  // Mock data - sẽ được thay thế bằng data thật từ contract
  const mockPost = {
    id,
    author: "0x1234567890abcdef1234567890abcdef12345678",
    authorName: "Alice",
    title: "Welcome to Sui Blog!",
    content:
      "This is my first post on the Sui blockchain. Excited to share my thoughts with everyone!\n\nSui is an amazing platform that makes building dApps so much easier. The object model is intuitive and the performance is incredible.",
    createdAt: Date.now() - 3_600_000,
    updatedAt: Date.now() - 3_600_000,
  };

  const isOwner = currentAccount?.address === mockPost.author;
  const isEdited = mockPost.updatedAt > mockPost.createdAt;

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

  const displayName =
    mockPost.authorName ||
    `${mockPost.author.slice(0, 6)}...${mockPost.author.slice(-4)}`;

  if (isEditing) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-6">
        <Button onClick={() => setIsEditing(false)} variant="ghost">
          <ArrowLeft className="mr-2 size-4" />
          Back
        </Button>

        <CreatePostForm
          initialContent={mockPost.content}
          initialTitle={mockPost.title}
          onSubmit={async (data) => {
            // TODO: Implement update post logic
            console.log("Updating post:", data);
            setIsEditing(false);
          }}
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
            <Link params={{ address: mockPost.author }} to="/profile/$address">
              <Avatar className="size-12 cursor-pointer transition-opacity hover:opacity-80">
                <AvatarFallback>
                  {getInitials(mockPost.authorName, mockPost.author)}
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
                    params={{ address: mockPost.author }}
                    to="/profile/$address"
                  >
                    {displayName}
                  </Link>
                  <span className="text-muted-foreground text-sm">
                    {formatDate(mockPost.createdAt)}
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
                    <Button
                      className="text-destructive hover:text-destructive"
                      size="icon-sm"
                      variant="ghost"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Title */}
              <h1 className="mb-4 font-bold text-2xl">{mockPost.title}</h1>

              {/* Content */}
              <p className="mb-6 whitespace-pre-wrap break-words text-base">
                {mockPost.content}
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
