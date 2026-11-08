import { scoreColor } from "@/lib/types";

export function ScoreRing({
  score,
  size = 84,
  stroke = 7,
  label = "/100",
  invert = false,
}: {
  score: number;
  size?: number;
  stroke?: number;
  label?: string;
  invert?: boolean;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const color = invert ? "#C9EB67" : scoreColor(clamped);
  return (
    <div className="score-ring" style={{ width: size, height: size }} aria-label={`Score ${clamped} out of 100`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={invert ? "rgba(255,255,255,.16)" : "#E6EAE0"}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
        />
      </svg>
      <div className="score-ring-value">
        <strong style={{ color: invert ? "#fff" : "var(--ink)", fontSize: size > 100 ? 34 : size < 70 ? 19 : 26 }}>
          {clamped}
        </strong>
        {label && (
          <small style={{ color: invert ? "#9fbfae" : undefined }}>{label}</small>
        )}
      </div>
    </div>
  );
}
