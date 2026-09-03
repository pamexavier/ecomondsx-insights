import { createFileRoute } from "@tanstack/react-router";
import Noticias from "./-noticias";

function RadarPage() {
  return <Noticias abaInicial="Radar" />;
}

export const Route = createFileRoute("/radar")({
  component: RadarPage,
});