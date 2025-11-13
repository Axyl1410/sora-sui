import { Link } from "@tanstack/react-router";
import { Calendar } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

type ProfileCardProps = {
  address: string;
  name?: string;
  bio?: string;
  createdAt?: number;
};

export function ProfileCard({
  address,
  name,
  bio,
  createdAt,
}: ProfileCardProps) {
  const getInitials = (profileName?: string, profileAddress?: string) => {
    if (profileName) {
      return profileName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (profileAddress) {
      return profileAddress.slice(2, 4).toUpperCase();
    }
    return "??";
  };

  const displayName = name || `${address.slice(0, 6)}...${address.slice(-4)}`;
  const displayAddress = `${address.slice(0, 8)}...${address.slice(-6)}`;

  return (
    <Link params={{ address }} to="/profile/$address">
      <Card className="cursor-pointer transition-colors hover:bg-accent/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="size-12 shrink-0">
              <AvatarFallback>{getInitials(name, address)}</AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <h3 className="mb-1 truncate font-semibold text-base">
                {displayName}
              </h3>
              <p className="mb-2 truncate font-mono text-muted-foreground text-xs">
                {displayAddress}
              </p>

              {bio && <p className="mb-2 line-clamp-2 text-sm">{bio}</p>}

              {createdAt && (
                <div className="flex items-center gap-1 text-muted-foreground text-xs">
                  <Calendar className="size-3" />
                  <span>
                    Joined{" "}
                    {new Date(createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
