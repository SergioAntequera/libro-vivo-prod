import type { AnnualTreeFrame } from "@/lib/annualTreeEngine";

type Props = {
  frame: AnnualTreeFrame;
  className?: string;
};

export default function AnnualTreeSprite({ frame, className }: Props) {
  const seedMode = frame.stage <= 0;

  return (
    <svg
      viewBox="0 0 260 230"
      className={className}
      aria-label={`Árbol anual ${frame.stage} de 100`}
      role="img"
    >
      <defs>
        <linearGradient id={`treeTrunk-${frame.year}-${frame.stage}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={frame.palette.trunkLight} />
          <stop offset="100%" stopColor={frame.palette.trunkDark} />
        </linearGradient>
      </defs>

      <ellipse cx="130" cy="194" rx="64" ry="16" fill="rgba(0,0,0,0.08)" />

      {seedMode ? (
        <>
          <ellipse cx="130" cy="182" rx="10" ry="7" fill="#a06b3c" />
          <path d="M130 176 C130 170, 132 166, 136 164" stroke="#5e9f5a" strokeWidth="2" fill="none" />
          <ellipse cx="138" cy="163" rx="4.2" ry="2.8" fill="#8acb83" />
        </>
      ) : (
        <>
          {frame.roots.map((root, idx) => (
            <line
              key={`root-${idx}`}
              x1={root.x1}
              y1={root.y1}
              x2={root.x2}
              y2={root.y2}
              stroke={frame.palette.trunkDark}
              strokeWidth={root.width}
              strokeLinecap="round"
              opacity="0.72"
            />
          ))}

          <rect
            x={130 - frame.trunkWidth / 2}
            y={182 - frame.trunkHeight}
            width={frame.trunkWidth}
            height={frame.trunkHeight}
            rx={frame.trunkRadius}
            fill={`url(#treeTrunk-${frame.year}-${frame.stage})`}
          />

          {frame.branches.map((branch, idx) => (
            <line
              key={`branch-${idx}`}
              x1={branch.x1}
              y1={branch.y1}
              x2={branch.x2}
              y2={branch.y2}
              stroke={frame.palette.branch}
              strokeWidth={branch.width}
              strokeLinecap="round"
              opacity="0.86"
            />
          ))}

          {frame.crownLayers.map((layer, idx) => (
            <ellipse
              key={`crown-${idx}`}
              cx={layer.cx}
              cy={layer.cy}
              rx={layer.rx}
              ry={layer.ry}
              fill={layer.fill}
              opacity={layer.opacity}
            />
          ))}

          {frame.leaves.map((leaf, idx) => (
            <circle
              key={`leaf-${idx}`}
              cx={leaf.x}
              cy={leaf.y}
              r={leaf.r}
              fill={leaf.fill}
              opacity={leaf.opacity}
            />
          ))}

          {frame.flowers.map((flower, idx) => (
            <g key={`flower-${idx}`} opacity={flower.opacity}>
              <circle cx={flower.x - flower.r} cy={flower.y} r={flower.r} fill={flower.petal} />
              <circle cx={flower.x + flower.r} cy={flower.y} r={flower.r} fill={flower.petal} />
              <circle cx={flower.x} cy={flower.y - flower.r} r={flower.r} fill={flower.petal} />
              <circle cx={flower.x} cy={flower.y + flower.r} r={flower.r} fill={flower.petal} />
              <circle cx={flower.x} cy={flower.y} r={Math.max(1, flower.r * 0.62)} fill={flower.center} />
            </g>
          ))}

          {frame.fruits.map((fruit, idx) => (
            <circle
              key={`fruit-${idx}`}
              cx={fruit.x}
              cy={fruit.y}
              r={fruit.r}
              fill={fruit.fill}
              opacity={fruit.opacity}
            />
          ))}
        </>
      )}
    </svg>
  );
}

