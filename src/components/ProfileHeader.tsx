import { useCurrentAccount } from "@mysten/dapp-kit";
import { Edit, User } from "lucide-react";
import { useState } from "react";
import { EditProfileDialog } from "@/components/EditProfileDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ProfileHeaderProps = {
  address: string;
  name?: string;
  bio?: string;
  postCount?: number;
  createdAt?: number;
  isOwnProfile?: boolean;
  profileId?: string;
};

export function ProfileHeader({
  address,
  name,
  bio,
  postCount = 0,
  createdAt,
  isOwnProfile = false,
  profileId,
}: ProfileHeaderProps) {
  const currentAccount = useCurrentAccount();
  const isCurrentUser = currentAccount?.address === address;
  const [showEditDialog, setShowEditDialog] = useState(false);

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

  const displayName = name || `${address.slice(0, 6)}...${address.slice(-4)}`;
  const displayAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row">
          {/* Avatar */}
          <div className="shrink-0">
            <Avatar className="size-20 sm:size-24">
              <AvatarFallback className="text-2xl">
                {getInitials(name, address)}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="mb-1 truncate font-bold text-2xl">
                  {displayName}
                </h1>
                <p className="font-mono text-muted-foreground text-sm">
                  {displayAddress}
                </p>
              </div>

              {isCurrentUser && profileId && (
                <Button
                  onClick={() => setShowEditDialog(true)}
                  size="sm"
                  variant="outline"
                >
                  <Edit className="mr-2 size-4" />
                  Edit Profile
                </Button>
              )}
            </div>

            {bio && (
              <p className="mb-4 whitespace-pre-wrap break-words text-muted-foreground text-sm">
                {bio}
              </p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <User className="size-4 text-muted-foreground" />
                <span className="font-semibold">{postCount}</span>
                <span className="text-muted-foreground">
                  {postCount === 1 ? "Post" : "Posts"}
                </span>
              </div>

              {createdAt && (
                <div className="text-muted-foreground">
                  Joined {new Date(createdAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
      {profileId && (
        <EditProfileDialog
          initialBio={bio ?? ""}
          initialName={name ?? ""}
          onOpenChange={setShowEditDialog}
          onSuccess={() => {
            // Profile will be refetched automatically via query invalidation
          }}
          open={showEditDialog}
          profileId={profileId}
        />
      )}
    </Card>
  );
}
