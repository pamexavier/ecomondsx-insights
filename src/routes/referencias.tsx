import { createFileRoute } from "@tanstack/react-router";
import { SobrePage } from "./sobre";

export const Route = createFileRoute("/referencias")({
  component: () => <SobrePage section="referencias" />,
});