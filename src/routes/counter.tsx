import { useCurrentAccount } from "@mysten/dapp-kit";
import { isValidSuiObjectId } from "@mysten/sui/utils";
import { Heading } from "@radix-ui/themes";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Counter } from "@/Counter";
import { CreateCounter } from "@/CreateCounter";

export const Route = createFileRoute("/counter")({
  component: CounterPage,
});

function CounterPage() {
  const currentAccount = useCurrentAccount();
  const [counterId, setCounter] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    return id && isValidSuiObjectId(id) ? id : null;
  });

  useEffect(() => {
    const handleLocationChange = () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id");
      setCounter(id && isValidSuiObjectId(id) ? id : null);
    };

    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  return (
    <>
      {currentAccount ? (
        counterId ? (
          <Counter id={counterId} />
        ) : (
          <CreateCounter
            onCreated={(id) => {
              window.history.pushState({}, "", `/counter?id=${id}`);
              setCounter(id);
            }}
          />
        )
      ) : (
        <Heading>Please connect your wallet</Heading>
      )}
    </>
  );
}
