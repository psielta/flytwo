interface LogoProps {
  size?: number;
  color?: string;
}

export function Logo({ size = 32, color = "currentColor" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Retângulo de fundo */}
      <rect x="4" y="4" width="92" height="92" rx="8" stroke={color} strokeWidth="4" fill="none" />

      {/* Letra F estilizada */}
      <path
        d="M20 25 L50 25 L50 33 L30 33 L30 45 L45 45 L45 53 L30 53 L30 75 L20 75 Z"
        fill={color}
      />

      {/* Letra T estilizada - conectada ao F pela barra superior, lado direito mais comprido */}
      <path
        d="M50 25 L80 25 L80 33 L65 33 L65 75 L55 75 L55 33 L50 33 Z"
        fill={color}
      />
    </svg>
  );
}
