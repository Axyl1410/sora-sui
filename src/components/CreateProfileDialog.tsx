import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateProfile } from "@/hooks/useBlog";

type CreateProfileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

const MAX_NAME_LENGTH = 50;
const MAX_BIO_LENGTH = 200;
const MIN_NAME_LENGTH = 3;

export function CreateProfileDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateProfileDialogProps) {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { createProfile, isPending } = useCreateProfile();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const nameTrimmed = name.trim();
    const bioTrimmed = bio.trim();

    if (nameTrimmed.length < MIN_NAME_LENGTH) {
      setError(`Name must be at least ${MIN_NAME_LENGTH} characters`);
      return;
    }

    if (nameTrimmed.length > MAX_NAME_LENGTH) {
      setError(`Name must be less than ${MAX_NAME_LENGTH} characters`);
      return;
    }

    if (bioTrimmed.length > MAX_BIO_LENGTH) {
      setError(`Bio must be less than ${MAX_BIO_LENGTH} characters`);
      return;
    }

    try {
      await createProfile(nameTrimmed, bioTrimmed);
      toast.success("Profile created successfully!");
      setName("");
      setBio("");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create profile";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Your Profile</DialogTitle>
          <DialogDescription>
            Create a profile to start posting on Sui Blog
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="font-medium text-sm" htmlFor="name">
                Name
              </label>
              <Input
                disabled={isPending}
                id="name"
                maxLength={MAX_NAME_LENGTH}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                value={name}
              />
              <div className="flex justify-end text-muted-foreground text-xs">
                {name.length}/{MAX_NAME_LENGTH}
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-medium text-sm" htmlFor="bio">
                Bio (optional)
              </label>
              <Textarea
                className="min-h-24 resize-none"
                disabled={isPending}
                id="bio"
                maxLength={MAX_BIO_LENGTH}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself"
                value={bio}
              />
              <div className="flex justify-end text-muted-foreground text-xs">
                {bio.length}/{MAX_BIO_LENGTH}
              </div>
            </div>

            {error && <div className="text-destructive text-sm">{error}</div>}

            <DialogFooter>
              <Button
                disabled={isPending}
                onClick={() => onOpenChange(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={isPending || !name.trim()} type="submit">
                {isPending ? "Creating..." : "Create Profile"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
