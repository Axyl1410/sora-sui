import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNetworkVariable } from "@/networkConfig";
import { parseMoveError } from "../error-handling";
import { parsePost } from "../parsers";

// Hook to pin post
export function usePinPost() {
  const blogPackageId = useNetworkVariable("blogPackageId");
  const suiClient = useSuiClient();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const pinPost = (profileId: string, postId: string) => {
    setError(null);

    const tx = new Transaction();

    tx.moveCall({
      arguments: [tx.object(profileId), tx.object(postId)],
      target: `${blogPackageId}::blog::pin_post`,
    });

    return new Promise<void>((resolve, reject) => {
      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: async ({ digest }) => {
            try {
              await suiClient.waitForTransaction({ digest });
              queryClient.invalidateQueries({ queryKey: ["profile"] });
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          onError: (err) => {
            const errorMessage = parseMoveError(err);
            setError(errorMessage);
            reject(new Error(errorMessage));
          },
        }
      );
    });
  };

  return { pinPost, isPending, error };
}

// Hook to unpin post
export function useUnpinPost() {
  const blogPackageId = useNetworkVariable("blogPackageId");
  const suiClient = useSuiClient();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const unpinPost = (profileId: string) => {
    setError(null);

    const tx = new Transaction();

    tx.moveCall({
      arguments: [tx.object(profileId)],
      target: `${blogPackageId}::blog::unpin_post`,
    });

    return new Promise<void>((resolve, reject) => {
      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: async ({ digest }) => {
            try {
              await suiClient.waitForTransaction({ digest });
              queryClient.invalidateQueries({ queryKey: ["profile"] });
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          onError: (err) => {
            const errorMessage = parseMoveError(err);
            setError(errorMessage);
            reject(new Error(errorMessage));
          },
        }
      );
    });
  };

  return { unpinPost, isPending, error };
}

// Hook to get pinned post for a profile
export function usePinnedPost(profileId: string | undefined) {
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ["pinned-post", profileId],
    queryFn: async () => {
      if (!profileId) {
        return null;
      }

      try {
        const profileData = await suiClient.getObject({
          id: profileId,
          options: { showContent: true },
        });

        if (profileData.data?.content?.dataType !== "moveObject") {
          return null;
        }

        const fields = (
          profileData.data.content as { dataType: string; fields: unknown }
        ).fields as {
          pinned_post_id?: { vec: string[] } | null;
        };

        const pinnedPostId = fields.pinned_post_id?.vec?.[0];
        if (!pinnedPostId) {
          return null;
        }

        // Fetch pinned post
        const postData = await suiClient.getObject({
          id: pinnedPostId,
          options: { showContent: true, showOwner: true },
        });

        if (!postData.data) {
          return null;
        }

        return parsePost(postData.data);
      } catch {
        return null;
      }
    },
    enabled: !!profileId,
  });
}
