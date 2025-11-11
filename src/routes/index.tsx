import { useCurrentAccount } from "@mysten/dapp-kit";
import { isValidSuiObjectId } from "@mysten/sui/utils";
import { Heading } from "@radix-ui/themes";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Counter } from "@/Counter";
import { CreateCounter } from "@/CreateCounter";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const currentAccount = useCurrentAccount();
  const [counterId, setCounter] = useState(() => {
    const hash = window.location.hash.slice(1);
    return isValidSuiObjectId(hash) ? hash : null;
  });

  return (
    <>
      {currentAccount ? (
        counterId ? (
          <Counter id={counterId} />
        ) : (
          <CreateCounter
            onCreated={(id) => {
              window.location.hash = id;
              setCounter(id);
            }}
          />
        )
      ) : (
        <>
          <Heading>Please connect your wallet</Heading>
          <Button onClick={() => toast("test")} variant={"destructive"}>
            test
          </Button>
        </>
      )}
    </>
  );
}
