import { Heading, Text } from "@radix-ui/themes";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  component: About,
});

function About() {
  return (
    <div className="p-2">
      <Heading mb="4" size="8">
        About This dApp
      </Heading>
      <Text size="4">
        This is a Sui blockchain dApp starter template built with TanStack
        Router, React, and TypeScript.
      </Text>
      <Button>Learn More</Button>
    </div>
  );
}
