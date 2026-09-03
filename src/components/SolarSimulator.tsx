import React, { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThermometerSun, Shield } from "lucide-react";

interface SolarSimulatorProps {
  radiaçãoHistorica: number;
  temperaturaExterna: number;
  elevacaoSolar: number;
}

type MaterialType = "nenhum" | "blackout" | "brise_externo" | "vidro_low_e";

export function SolarSimulator({ radiaçãoHistorica, temperaturaExterna, elevacaoSolar }: SolarSimulatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [hour, setHour] = useState<number>(16); 
  const [material, setMaterial] = useState<MaterialType>("nenhum");

  const getSunAngle = (h: number) => {
    if (h === 16 && elevacaoSolar) return Math.max(elevacaoSolar, 5);
    
    if (h <= 13) return 75;
    if (h === 14) return 60;
    if (h === 15) return 45;
    if (h === 16) return 30;
    if (h === 17) return 15;
    if (h === 18) return 5;
    return 0; // 19h
  };

  const getTemperaturaInterna = () => {
    let baseTemp = temperaturaExterna; 
    let solarImpact = (radiaçãoHistorica / 1000) * 4; 

    if (getSunAngle(hour) < 40) solarImpact *= 1.5; 

    if (material === "nenhum") baseTemp += solarImpact;
    // O blackout não resolve! O calor entra e fica preso entre o vidro e o tecido.
    if (material === "blackout") baseTemp += solarImpact * 0.8; 
    if (material === "vidro_low_e") baseTemp += solarImpact * 0.3; 
    if (material === "brise_externo") baseTemp += solarImpact * 0.1; 

    if (hour >= 18) baseTemp -= 2;

    return Math.min(Math.max(baseTemp, 15), 45).toFixed(1);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    
    // 1. FUNDO DARK MODE (Ainda mais escuro/profundo)
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#020617"; // Slate-950 (quase preto)
    ctx.fillRect(0, 0, width, height);

    // Efeito de estrelas/poeira no céu noturno à medida que a hora avança
    if (hour >= 17) {
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        for (let i = 0; i < 30; i++) {
             ctx.fillRect(Math.random() * width, Math.random() * (height/2), 1, 1);
        }
    }

    // 2. DESENHO DO QUARTO
    const roomX = 250; 
    const roomY = height - 250;
    const roomW = 330;
    const roomH = 200;
    
    // Grid sutil no fundo
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 1;
    for(let i = roomX; i < roomX + roomW; i += 20) {
      ctx.beginPath(); ctx.moveTo(i, roomY); ctx.lineTo(i, roomY + roomH); ctx.stroke();
    }
    for(let i = roomY; i < roomY + roomH; i += 20) {
      ctx.beginPath(); ctx.moveTo(roomX, i); ctx.lineTo(roomX + roomW, i); ctx.stroke();
    }

    // Paredes e Chão
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 2;
    ctx.strokeRect(roomX, roomY, roomW, roomH);
    
    // Linha Neon no piso
    ctx.strokeStyle = "rgba(31, 224, 138, 0.5)"; 
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(roomX, roomY + roomH);
    ctx.lineTo(roomX + roomW, roomY + roomH);
    ctx.stroke();

    // Cama minimalista
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1;
    ctx.fillRect(roomX + 150, roomY + roomH - 40, 160, 40);
    ctx.strokeRect(roomX + 150, roomY + roomH - 40, 160, 40);

    // 3. A JANELA 
    const windowY = roomY + 40;
    const windowH = 100;
    
    if (material === "brise_externo") {
      ctx.fillStyle = "#1FE08A"; 
      for(let i=0; i<6; i++) {
        ctx.fillRect(roomX - 15, windowY + (i * 18), 15, 3);
      }
    }

    ctx.fillStyle = material === "vidro_low_e" ? "rgba(56, 189, 248, 0.4)" : "rgba(255, 255, 255, 0.2)";
    ctx.fillRect(roomX - 4, windowY, 8, windowH);

    if (material === "blackout") {
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(roomX + 4, windowY, 6, windowH + 10);
    }

    // 4. O ASTRO REI MAJESTOSO (Com as longas linhas definidas)
    const angleDeg = getSunAngle(hour);
    const angleRad = (angleDeg * Math.PI) / 180;
    
    const sunDist = 170; 
    const sunX = roomX - Math.cos(angleRad) * sunDist;
    const sunY = (windowY + windowH/2) - Math.sin(angleRad) * sunDist;

    if (angleDeg > 0) {
      ctx.save(); 
      
      // Brilho do sol
      ctx.shadowBlur = 40;
      ctx.shadowColor = "#f59e0b"; 
      
      // Criar o gradiente radial
      const sunGrad = ctx.createRadialGradient(sunX, sunY, 5, sunX, sunY, 35);
      sunGrad.addColorStop(0, "#ffffff"); 
      sunGrad.addColorStop(0.3, "#fde047"); 
      sunGrad.addColorStop(0.7, "#f59e0b"); 
      sunGrad.addColorStop(1, "rgba(245, 158, 11, 0)"); 

      ctx.beginPath();
      ctx.arc(sunX, sunY, 35, 0, 2 * Math.PI);
      ctx.fillStyle = sunGrad;
      ctx.fill();

      // Raios retos e longos (como na sua edição!)
      ctx.lineWidth = 1.5; // Linhas mais finas e elegantes
      ctx.strokeStyle = "rgba(253, 224, 71, 0.8)"; // Amarelo vibrante
      
      for (let i = 0; i < 16; i++) { // Mais raios para dar destaque
        const rayAngle = (i * Math.PI) / 8 + (hour * 0.1); 
        ctx.beginPath();
        ctx.moveTo(sunX + Math.cos(rayAngle) * 45, sunY + Math.sin(rayAngle) * 45); // Começa mais longe do centro
        ctx.lineTo(sunX + Math.cos(rayAngle) * 80, sunY + Math.sin(rayAngle) * 80); // Vai bem longe
        ctx.stroke();
      }
      ctx.restore(); 

      // 5. O FEIXE DE LUZ ENTRANDO NO QUARTO
      let penetrationBlock = 0;
      if (material === "blackout") penetrationBlock = 15; 
      if (material === "brise_externo") penetrationBlock = -10; 
      
      const startRayY1 = windowY;
      const startRayY2 = windowY + windowH;
      let endRayX, endRayY1, endRayY2;

      if (material === "brise_externo") {
          endRayX = roomX - 10;
          endRayY1 = startRayY1;
          endRayY2 = startRayY2;
      } else if (material === "blackout") {
          endRayX = roomX + penetrationBlock;
          endRayY1 = startRayY1 + Math.tan(angleRad) * penetrationBlock;
          endRayY2 = startRayY2 + Math.tan(angleRad) * penetrationBlock;
      } else {
          const distToFloor = roomH - 40; 
          const projectedXFloor = distToFloor / Math.tan(angleRad);
          
          endRayX = roomX + projectedXFloor;
          if (endRayX > roomX + roomW) {
              endRayX = roomX + roomW;
              endRayY1 = startRayY1 + Math.tan(angleRad) * roomW;
              endRayY2 = startRayY2 + Math.tan(angleRad) * roomW;
          } else {
              endRayY1 = startRayY1 + distToFloor;
              endRayY2 = startRayY2 + distToFloor;
          }
      }

      ctx.globalCompositeOperation = "screen"; 
      ctx.beginPath();
      ctx.moveTo(roomX, startRayY1);
      ctx.lineTo(roomX, startRayY2);
      ctx.lineTo(endRayX, endRayY2);
      ctx.lineTo(endRayX, endRayY1);
      ctx.closePath();

      const lightGradient = ctx.createLinearGradient(roomX, startRayY1, endRayX, endRayY2);
      const lightAlpha = material === "vidro_low_e" ? "0.15" : "0.4"; // Luz mais forte se não houver película
      const lightColor = material === "vidro_low_e" ? `rgba(56, 189, 248, ${lightAlpha})` : `rgba(250, 204, 21, ${lightAlpha})`;
      
      lightGradient.addColorStop(0, lightColor);
      lightGradient.addColorStop(1, "rgba(250, 204, 21, 0)");
      
      ctx.fillStyle = lightGradient;
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      // 6. EFEITO DE CALOR ACUMULADO NO CHÃO
      if (material === "nenhum" || material === "vidro_low_e") {
         const heatIntensity = material === "nenhum" ? 0.35 : 0.1;
         const heatGradient = ctx.createLinearGradient(roomX, roomY, endRayX, roomY + roomH);
         heatGradient.addColorStop(0, "transparent");
         heatGradient.addColorStop(1, `rgba(239, 68, 68, ${heatIntensity})`); 
         
         ctx.fillStyle = heatGradient;
         ctx.fillRect(roomX, roomY, roomW, roomH);
      }
      
      // O EFEITO ESTUFA DA CORTINA!
      if (material === "blackout") {
          ctx.fillStyle = "rgba(239, 68, 68, 0.5)"; // Vermelho forte preso na janela
          ctx.shadowBlur = 20;
          ctx.shadowColor = "rgba(239, 68, 68, 0.8)";
          ctx.fillRect(roomX, windowY, 20, windowH + 10);
          ctx.shadowBlur = 0;
      }
    }
  }, [hour, material, elevacaoSolar]);

  const currentTemp = getTemperaturaInterna();
  const isHot = parseFloat(currentTemp) > 28;

  return (
    <div className="flex flex-col md:flex-row gap-6 bg-card/80 backdrop-blur-md border border-border/60 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
      
      <div className="w-full md:w-1/3 flex flex-col gap-5 z-10">
        <div>
          <h3 className="font-bold text-lg mb-1 flex items-center gap-2 text-primary">
            <Shield className="size-5" /> Dinâmica Térmica
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Simule o comportamento real da radiação solar interagindo com as tecnologias de esquadria do imóvel.
          </p>
        </div>

        <div className="space-y-3">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex justify-between">
            <span>Progressão Solar (Tarde)</span>
            <span className="text-primary">{getSunAngle(hour)}°</span>
          </Label>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono w-6 text-muted-foreground">{hour}h</span>
            <Slider 
              min={13} max={19} step={1} 
              value={[hour]} 
              onValueChange={(val) => setHour(val[0])} 
              className="flex-1"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Barreira Tecnológica</Label>
          <Select value={material} onValueChange={(v) => setMaterial(v as MaterialType)}>
            <SelectTrigger className="bg-secondary/60 border-border/50 h-10">
              <SelectValue placeholder="Selecione a proteção" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nenhum">Vidro Comum (Sem proteção)</SelectItem>
              <SelectItem value="blackout">Cortina Blackout Interna</SelectItem>
              <SelectItem value="vidro_low_e">Vidro Low-E (Baixa Emissividade)</SelectItem>
              <SelectItem value="brise_externo">Brise Soleil Externo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className={`mt-auto rounded-xl border p-4 flex items-center justify-between transition-colors duration-500 ${isHot ? 'bg-red-500/5 border-red-500/20' : 'bg-primary/5 border-primary/20'}`}>
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block mb-1">Temperatura Simulada</span>
            <span className={`text-3xl font-bold font-display tabular-nums ${isHot ? 'text-red-400 text-glow-red' : 'text-primary text-glow'}`}>
              {currentTemp}°
            </span>
          </div>
          <ThermometerSun className={`size-8 ${isHot ? 'text-red-400' : 'text-primary'}`} />
        </div>
      </div>

      <div className="w-full md:w-2/3 bg-[#020617] rounded-xl overflow-hidden border border-border/40 flex items-center justify-center min-h-[300px] shadow-inner relative">
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="bg-background/80 backdrop-blur text-[9px] uppercase tracking-wider text-muted-foreground px-2 py-1 rounded border border-border/50">
            Vista de Corte
          </span>
          <span className="bg-background/80 backdrop-blur text-[9px] uppercase tracking-wider text-muted-foreground px-2 py-1 rounded border border-border/50">
            Fachada Oeste
          </span>
        </div>
        <canvas 
          ref={canvasRef} 
          width={600} 
          height={400} 
          className="w-full h-auto max-w-[600px] object-contain"
        />
      </div>
    </div>
  );
}