import { createFileRoute } from "@tanstack/react-router";
import WellnessDashboard from "./-wellness-dashboard";

export const Route = createFileRoute("/wellness")({
  component: WellnessDashboard,
});
