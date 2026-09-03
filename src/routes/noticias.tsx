import { createFileRoute } from "@tanstack/react-router";
import Noticias from "./-noticias";

export const Route = createFileRoute("/noticias")({
  component: Noticias,
});