import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Classificacao, SolarStatus } from "@/components/SolarGrid";
import { cn } from "@/lib/utils";

const HOURS = ["6h", "8h", "10h", "12h", "14h", "16h", "18h"];
const SEASONS = ["Verao", "Outono", "Inverno", "Primavera"] as const;
type Season = (typeof SEASONS)[number];

interface Props {
  classificacao: Classificacao;
  andar: number;
  fachada: string;
}

// Fixed mock neighbours (same as reference prototype)
const NEIGHBOURS = [
  { w: 16, h: 26, d: 16, x: -28, z: -10 },
  { w: 12, h: 42, d: 12, x: 24, z: -18 },
  { w: 18, h: 18, d: 14, x: -10, z: 30 },
  { w: 10, h: 30, d: 10, x: 26, z: 22 },
  { w: 14, h: 14, d: 16, x: -32, z: 22 },
];

const FLOOR_H = 3; // metros por pavimento (igual ao protótipo: 12 andares × 3 = 36m)

function statusHex(s?: SolarStatus) {
  if (s === "Pleno Sol") return 0xffe9a8;
  if (s === "Meia Sombra") return 0xc9d86a;
  return 0x4b5953;
}
function statusTextClass(s?: SolarStatus) {
  if (s === "Pleno Sol") return "text-[#1FE08A]";
  if (s === "Meia Sombra") return "text-[#C9D86A]";
  return "text-[#8A968F]";
}
function statusBgClass(s?: SolarStatus) {
  if (s === "Pleno Sol") return "bg-[#1FE08A]/15 border-[#1FE08A]/40";
  if (s === "Meia Sombra") return "bg-[#C9D86A]/12 border-[#C9D86A]/40";
  return "bg-[#4B5953]/20 border-[#4B5953]/40";
}

export function SunShadow3D({ classificacao, andar, fachada }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const refs = useRef<{
    sunLight?: THREE.DirectionalLight;
    sunMesh?: THREE.Mesh;
    marker?: THREE.Mesh;
    ambient?: THREE.AmbientLight;
  }>({});

  const availableSeasons = useMemo(
    () => SEASONS.filter((s) => classificacao[s]),
    [classificacao],
  );
  const [season, setSeason] = useState<Season>(availableSeasons[0] ?? "Verao");
  const [hourIdx, setHourIdx] = useState(3);

  useEffect(() => {
    if (!availableSeasons.includes(season)) {
      setSeason(availableSeasons[0] ?? "Verao");
    }
  }, [availableSeasons, season]);

  const hour = HOURS[hourIdx];
  const entry = classificacao[season]?.[hour];

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e0c);
    scene.fog = new THREE.Fog(0x0a0e0c, 60, 220);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(70, 55, 90);
    camera.lookAt(0, 10, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    // Chão
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshStandardMaterial({ color: 0x121814, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(400, 40, 0x1f2924, 0x1a221d);
    grid.position.y = 0.01;
    scene.add(grid);

    // Ambient
    const ambient = new THREE.AmbientLight(0x3a4a42, 0.55);
    scene.add(ambient);
    refs.current.ambient = ambient;

    // Sol (luz direcional)
    const sunLight = new THREE.DirectionalLight(0xfff2d6, 1.6);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.left = -100;
    sunLight.shadow.camera.right = 100;
    sunLight.shadow.camera.top = 100;
    sunLight.shadow.camera.bottom = -100;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 300;
    sunLight.shadow.bias = -0.0015;
    scene.add(sunLight);
    scene.add(sunLight.target);
    refs.current.sunLight = sunLight;

    const sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.5, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffe9a8 }),
    );
    scene.add(sunMesh);
    refs.current.sunMesh = sunMesh;

    // Prédio alvo: altura = max(andar, 12) andares × 3m
    const totalFloors = Math.max(andar, 12);
    const bh = totalFloors * FLOOR_H;
    const target = new THREE.Mesh(
      new THREE.BoxGeometry(14, bh, 14),
      new THREE.MeshStandardMaterial({
        color: 0x1fe08a,
        emissive: 0x0a4a30,
        emissiveIntensity: 0.4,
        roughness: 0.6,
      }),
    );
    target.position.set(0, bh / 2, 0);
    target.castShadow = true;
    target.receiveShadow = true;
    scene.add(target);

    // Marker no andar exato (centro do pavimento)
    const markerY = Math.max(andar, 1) * FLOOR_H - FLOOR_H / 2;
    const marker = new THREE.Mesh(
      new THREE.BoxGeometry(14.4, 1.2, 14.4),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }),
    );
    marker.position.set(0, markerY, 0);
    scene.add(marker);
    refs.current.marker = marker;

    // Vizinhos
    const nMat = new THREE.MeshStandardMaterial({ color: 0x3a4750, roughness: 0.8 });
    NEIGHBOURS.forEach((n) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(n.w, n.h, n.d), nMat);
      m.position.set(n.x, n.h / 2, n.z);
      m.castShadow = true;
      m.receiveShadow = true;
      scene.add(m);
    });

    // Drag to orbit (opcional, sem auto-rotate pra ficar igual ao protótipo)
    let theta = Math.atan2(90, 70);
    let phiY = 55;
    const radius = Math.hypot(70, 90);
    let dragging = false;
    let lastX = 0;
    const onDown = (e: PointerEvent) => { dragging = true; lastX = e.clientX; };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      theta -= (e.clientX - lastX) * 0.005;
      lastX = e.clientX;
      camera.position.x = Math.cos(theta) * radius;
      camera.position.z = Math.sin(theta) * radius;
      camera.position.y = phiY;
      camera.lookAt(0, 10, 0);
    };
    const onUp = () => { dragging = false; };
    renderer.domElement.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    void phiY;

    let raf = 0;
    const tick = () => {
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
    };
  }, [andar]);

  // Atualiza posição do sol conforme dados do JSON
  useEffect(() => {
    const { sunLight, sunMesh, marker, ambient } = refs.current;
    if (!sunLight || !sunMesh || !marker) return;
    if (!entry) return;

    const elevClamped = Math.max(entry.elevacao, 0.5);
    const distancia = 140;
    const azRad = THREE.MathUtils.degToRad(entry.azimute);
    const elevRad = THREE.MathUtils.degToRad(elevClamped);

    const x = distancia * Math.cos(elevRad) * Math.sin(azRad);
    const z = -distancia * Math.cos(elevRad) * Math.cos(azRad);
    const y = distancia * Math.sin(elevRad);

    sunLight.position.set(x, y, z);
    sunLight.target.position.set(0, 10, 0);
    sunLight.target.updateMatrixWorld();
    sunMesh.position.set(x * 0.6, Math.max(y * 0.6, 3), z * 0.6);

    const iluminado = entry.elevacao > 5;
    sunLight.intensity = iluminado ? 1.6 : 0.15;
    (sunMesh.material as THREE.MeshBasicMaterial).color.setHex(
      iluminado ? 0xffe9a8 : 0x555555,
    );
    if (ambient) ambient.intensity = iluminado ? 0.55 : 0.25;

    (marker.material as THREE.MeshBasicMaterial).color.setHex(statusHex(entry.status));
  }, [entry]);

  return (
    <div className="rounded-2xl border bg-card/80 backdrop-blur-sm p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="label-tag">Visualizador 3D · Sol e Sombra</div>
          <h3 className="mt-1 text-base font-semibold">Simulação sobre o empreendimento</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {andar}º andar · fachada {fachada} · arraste a cena para girar
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {availableSeasons.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSeason(s)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider border transition-colors",
                season === s
                  ? "bg-[#1FE08A] text-[#0A0E0C] border-[#1FE08A] glow-primary"
                  : "bg-[#111612] text-[#B6C4BD] border-[#1F2924] hover:text-foreground",
              )}
            >
              {s === "Verao" ? "Verão" : s}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={mountRef}
        className="w-full rounded-xl overflow-hidden border border-[#1F2924]"
        style={{ height: 420, background: "#0A0E0C" }}
      />

      <div className="mt-4">
        <div className="label-tag mb-2">Horário</div>
        <div className="grid grid-cols-7 gap-1.5">
          {HOURS.map((h, i) => (
            <button
              key={h}
              type="button"
              onClick={() => setHourIdx(i)}
              className={cn(
                "py-2 rounded-md text-xs font-bold border transition-colors",
                hourIdx === i
                  ? "bg-[#1FE08A] text-[#0A0E0C] border-[#1FE08A]"
                  : "bg-[#111612] text-[#B6C4BD] border-[#1F2924] hover:text-foreground",
              )}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Tile label="Elevação Solar" value={entry ? `${entry.elevacao}°` : "—"} />
        <Tile label="Azimute Solar" value={entry ? `${entry.azimute}°` : "—"} />
        <div className={cn("rounded-xl border p-4", statusBgClass(entry?.status))}>
          <div className="label-tag">Unidade ({andar}º · fachada {fachada})</div>
          <div className={cn("mt-2 font-display text-xl font-bold", statusTextClass(entry?.status))}>
            {entry?.status ?? "—"}
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground leading-relaxed border-l-2 border-[#1FE08A] pl-3">
        O prédio verde é a unidade analisada — o marcador branco/amarelo mostra o andar exato.
        Blocos cinza são vizinhos ilustrativos. A posição do sol vem direto dos dados de
        elevação e azimute calculados no n8n para cada estação e horário.
      </p>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#1F2924] bg-[#111612] p-4">
      <div className="label-tag">{label}</div>
      <div className="mt-2 font-display text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
