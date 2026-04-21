interface Props {
  size?: number;
  className?: string;
}

export function EcomondsLogo({ size = 36, className = "" }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="EcomondsX logo"
    >
      {/* Left side: circuit traces forming the / of the X */}
      <g stroke="var(--color-foreground)" strokeWidth="2" strokeLinecap="square">
        <path d="M4 44 L24 24" />
        <path d="M8 40 H4" />
        <path d="M12 36 V42" />
        <path d="M16 32 H10" />
      </g>
      {/* Circuit nodes */}
      <g fill="var(--color-foreground)">
        <circle cx="4" cy="40" r="1.5" />
        <circle cx="12" cy="42" r="1.5" />
        <circle cx="10" cy="32" r="1.5" />
      </g>
      {/* Animated current along main diagonal */}
      <path
        d="M5 43 L23 25"
        stroke="var(--color-primary)"
        strokeWidth="2"
        strokeLinecap="round"
        className="animate-circuit"
      />

      {/* Right side: \ of the X as a stem with leaves */}
      <path
        d="M24 24 L42 6"
        stroke="var(--color-primary)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Leaves */}
      <g className="animate-leaf-sway" style={{ transformOrigin: "32px 16px" }}>
        <path
          d="M32 16 C 28 14, 26 18, 30 20 C 33 21, 34 18, 32 16 Z"
          fill="var(--color-primary)"
        />
        <path
          d="M38 10 C 42 8, 44 12, 40 14 C 37 15, 36 12, 38 10 Z"
          fill="var(--color-primary-glow)"
        />
      </g>

      {/* Bottom-right diagonal completing X (subtle) */}
      <path
        d="M24 24 L44 44"
        stroke="var(--color-foreground)"
        strokeOpacity="0.35"
        strokeWidth="1.2"
        strokeLinecap="square"
      />
      <path
        d="M4 4 L24 24"
        stroke="var(--color-foreground)"
        strokeOpacity="0.2"
        strokeWidth="1"
        strokeLinecap="square"
        strokeDasharray="2 3"
      />
    </svg>
  );
}
