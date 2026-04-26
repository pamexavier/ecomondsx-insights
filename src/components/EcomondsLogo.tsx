import logoSrc from "@/assets/ecomondsx-logo.png";

interface Props {
  size?: number;
  className?: string;
}

export function EcomondsLogo({ size = 36, className = "" }: Props) {
  return (
    <img
      src={logoSrc}
      width={size}
      height={size}
      alt="EcomondsX logo"
      className={className}
      style={{ objectFit: "contain" }}
    />
  );
}
