import { annualTreePhaseFromStage, type AnnualTreePhase } from "@/lib/annualTreeEngine";

type Props = {
  stage: number;
  seed: number;
  size?: number | string;
};

const PHASE_RANGES: Record<AnnualTreePhase, { min: number; max: number }> = {
  seed: { min: 0, max: 0 },
  germination: { min: 1, max: 8 },
  sprout: { min: 9, max: 22 },
  sapling: { min: 23, max: 38 },
  young: { min: 39, max: 56 },
  mature: { min: 57, max: 74 },
  blooming: { min: 75, max: 90 },
  legacy: { min: 91, max: 100 },
};

function clamp(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function smoothstep(t: number) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function norm(value: number, min: number, max: number) {
  if (value <= min) return 0;
  if (value >= max) return 1;
  return (value - min) / (max - min);
}

function seededUnit(seed: number) {
  const raw = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return raw - Math.floor(raw);
}

function phaseProgress(phase: AnnualTreePhase, stage: number) {
  const range = PHASE_RANGES[phase];
  if (range.max <= range.min) return 0;
  return smoothstep(norm(stage, range.min, range.max));
}

export default function TopdownTreeSprite({ stage, seed, size = 88 }: Props) {
  const safeStage = clamp(Math.round(stage), 0, 100);
  const growth = safeStage / 100;
  const phase = annualTreePhaseFromStage(safeStage);
  const phaseT = phaseProgress(phase, safeStage);

  const hueOffset = Math.round((seededUnit(seed * 17 + safeStage * 3) - 0.5) * 7);
  const canopyHue =
    128 + hueOffset + (phase === "blooming" ? 3 : phase === "legacy" ? 6 : 0);
  const trunk = `hsl(${31 + hueOffset} 38% ${phase === "legacy" ? 24 : 28}%)`;
  const trunkLight = `hsl(${34 + hueOffset} 32% 42%)`;
  const stemTone = `hsl(${116 + hueOffset} 26% 47%)`;
  const earlyCanopy = phase === "sapling" || phase === "young";
  const canopyBase =
    phase === "legacy"
      ? `hsl(${canopyHue} 38% 36%)`
      : phase === "blooming"
        ? `hsl(${canopyHue} 41% 43%)`
        : earlyCanopy
          ? `hsl(${canopyHue} 42% 43%)`
          : `hsl(${canopyHue} 38% 40%)`;
  const canopyShade = earlyCanopy
    ? `hsl(${canopyHue - 6} 36% 29%)`
    : `hsl(${canopyHue - 5} 35% 31%)`;
  const canopyLight =
    phase === "blooming" || phase === "legacy"
      ? `hsl(${canopyHue + 5} 40% 63%)`
      : earlyCanopy
        ? `hsl(${canopyHue + 4} 37% 59%)`
        : `hsl(${canopyHue + 3} 34% 55%)`;
  const leafTone = earlyCanopy
    ? `hsl(${canopyHue + 3} 38% 61%)`
    : `hsl(${canopyHue + 2} 35% 58%)`;
  const soil = "hsl(34 35% 58%)";
  const soilDark = "hsl(29 28% 42%)";
  const blossomPetalA = phase === "legacy" ? "#f7ecd6" : "#f8e4ef";
  const blossomPetalB = phase === "legacy" ? "#ffd78d" : "#ffe7c7";
  const fruitTone = phase === "legacy" ? "#e38b37" : "#d56c53";

  let globalScale = 1;
  let trunkH = 0;
  let trunkW = 0;
  let canopyR = 0;
  let canopyVisible = false;
  let stemH = 0;
  let stemW = 0;
  let stemLeafRx = 0;
  let stemLeafRy = 0;
  let stemLeafLift = 0;
  let stemBudR = 0;
  let lobeCount = 0;
  let detailDots = 0;
  let decorLeafCount = 0;
  let blossomCount = 0;
  let fruitCount = 0;
  let haloOpacity = 0;
  let haloRx = 0;
  let haloRy = 0;

  if (phase === "seed") {
    globalScale = 0.92;
  } else if (phase === "germination") {
    globalScale = lerp(0.98, 1.08, phaseT);
    stemH = lerp(12, 16, phaseT);
    stemW = lerp(2.2, 2.8, phaseT);
    stemLeafRx = lerp(4.4, 5.6, phaseT);
    stemLeafRy = lerp(2.4, 3, phaseT);
    stemLeafLift = lerp(0.8, 1.6, phaseT);
    stemBudR = lerp(1.5, 2.2, phaseT);
  } else if (phase === "sprout") {
    globalScale = lerp(1.06, 1.15, phaseT);
    stemH = lerp(17, 22, phaseT);
    stemW = lerp(3, 3.8, phaseT);
    stemLeafRx = lerp(6.6, 8.2, phaseT);
    stemLeafRy = lerp(3.3, 4.2, phaseT);
    stemLeafLift = lerp(1.6, 2.6, phaseT);
    stemBudR = lerp(2.6, 4, phaseT);
  } else if (phase === "sapling") {
    globalScale = lerp(1.12, 1.18, phaseT);
    trunkH = lerp(20, 26, phaseT);
    trunkW = lerp(6.8, 8.2, phaseT);
    canopyR = lerp(18, 24, phaseT);
    canopyVisible = true;
    lobeCount = 4;
    detailDots = 5;
    decorLeafCount = 4;
  } else if (phase === "young") {
    globalScale = lerp(1.2, 1.27, phaseT);
    trunkH = lerp(30, 36, phaseT);
    trunkW = lerp(8.4, 10, phaseT);
    canopyR = lerp(29, 36, phaseT);
    canopyVisible = true;
    lobeCount = 6;
    detailDots = 9;
    decorLeafCount = 6;
  } else if (phase === "mature") {
    globalScale = lerp(1.24, 1.3, phaseT);
    trunkH = lerp(37, 44, phaseT);
    trunkW = lerp(10.2, 11.9, phaseT);
    canopyR = lerp(35, 41, phaseT);
    canopyVisible = true;
    lobeCount = 7;
    detailDots = 12;
    decorLeafCount = 8;
  } else if (phase === "blooming") {
    globalScale = lerp(1.31, 1.37, phaseT);
    trunkH = lerp(40, 47, phaseT);
    trunkW = lerp(11.2, 12.8, phaseT);
    canopyR = lerp(41, 47, phaseT);
    canopyVisible = true;
    lobeCount = 8;
    detailDots = 16;
    decorLeafCount = 9;
    blossomCount = 8 + Math.round(phaseT * 5);
    haloOpacity = lerp(0.08, 0.14, phaseT);
    haloRx = canopyR * 1.02;
    haloRy = canopyR * 0.82;
  } else {
    globalScale = lerp(1.36, 1.42, phaseT);
    trunkH = lerp(45, 53, phaseT);
    trunkW = lerp(12.4, 14.2, phaseT);
    canopyR = lerp(45, 52, phaseT);
    canopyVisible = true;
    lobeCount = 9;
    detailDots = 20;
    decorLeafCount = 12;
    blossomCount = 6 + Math.round(phaseT * 3);
    fruitCount = 5 + Math.round(phaseT * 4);
    haloOpacity = lerp(0.12, 0.18, phaseT);
    haloRx = canopyR * 1.08;
    haloRy = canopyR * 0.86;
  }

  const trunkX = 50 - trunkW / 2;
  const groundY = 78;
  const trunkY = groundY - trunkH;
  const seedAngle = -12 + (seededUnit(seed * 13 + safeStage * 5) - 0.5) * 16;
  const stemBaseY = phase === "germination" ? 73.8 : 73.1;
  const stemCurveMidX = 50 + (seededUnit(seed * 29 + safeStage) - 0.5) * 1.6;
  const stemCurveTopX = 50 + (seededUnit(seed * 37 + safeStage) - 0.5) * 2.2;
  const stemTopY = groundY - stemH - stemLeafLift;
  const canopyLift =
    phase === "legacy"
      ? 2.6
      : phase === "blooming"
        ? 2.2
        : phase === "mature"
          ? 1.6
          : 0;
  const canopyCx = 50 + (seededUnit(seed * 11 + 3) - 0.5) * 1.2;
  const canopyCy = trunkY + Math.max(5, trunkH * 0.16) - canopyLift;

  const canopyLobes = [
    { x: -0.54, y: -0.12, r: 0.6, front: false },
    { x: 0.54, y: -0.08, r: 0.58, front: false },
    { x: -0.06, y: -0.56, r: 0.56, front: false },
    { x: -0.44, y: 0.16, r: 0.42, front: true },
    { x: 0.42, y: 0.18, r: 0.44, front: true },
    { x: 0.02, y: 0.32, r: 0.28, front: true },
    { x: 0.04, y: -0.16, r: 0.62, front: false },
    { x: -0.21, y: 0.02, r: 0.43, front: true },
    { x: 0.21, y: 0.04, r: 0.41, front: true },
  ];

  const visibleLobes = canopyLobes.slice(0, lobeCount);
  const backLobes = visibleLobes.filter((lobe) => !lobe.front);
  const frontLobes = visibleLobes.filter((lobe) => lobe.front);
  const innerTrunkVisible =
    phase === "young" || phase === "mature" || phase === "blooming" || phase === "legacy";
  const innerTrunkCx = canopyCx + (seededUnit(seed * 101 + safeStage) - 0.5) * 1.2;
  const innerTrunkCy =
    canopyCy +
    (phase === "legacy" ? canopyR * 0.12 : phase === "blooming" ? canopyR * 0.12 : canopyR * 0.13);
  const innerTrunkRx =
    phase === "legacy"
      ? canopyR * 0.17
      : phase === "blooming"
        ? canopyR * 0.16
        : phase === "mature"
          ? canopyR * 0.145
          : canopyR * 0.13;
  const innerTrunkRy =
    phase === "legacy"
      ? canopyR * 0.21
      : phase === "blooming"
        ? canopyR * 0.19
        : phase === "mature"
          ? canopyR * 0.17
          : canopyR * 0.16;

  const leafDots = Array.from({ length: detailDots }, (_, idx) => {
    const a = seededUnit(seed * 47 + idx * 23) * Math.PI * 2;
    const d = canopyR * (0.2 + seededUnit(seed * 31 + idx * 37) * 0.66);
    const r = 1 + seededUnit(seed * 11 + idx * 41) * 1.7;
    return {
      x: canopyCx + Math.cos(a) * d,
      y: canopyCy + Math.sin(a) * d,
      r,
    };
  });

  const decorLeaves = Array.from({ length: decorLeafCount }, (_, idx) => {
    const a = seededUnit(seed * 61 + idx * 19) * Math.PI * 2;
    const d = canopyR * (0.38 + seededUnit(seed * 71 + idx * 29) * 0.48);
    const r = 1.1 + seededUnit(seed * 13 + idx * 59) * 1.4;
    return {
      x: canopyCx + Math.cos(a) * d,
      y: canopyCy + Math.sin(a) * d,
      r,
      fill: idx % 2 === 0 ? canopyLight : leafTone,
    };
  });

  const visibleLeafDots = innerTrunkVisible
    ? leafDots.filter((leaf) => {
        return Math.hypot(leaf.x - innerTrunkCx, (leaf.y - innerTrunkCy) * 1.08) > innerTrunkRy * 1.22;
      })
    : leafDots;

  const blossoms = Array.from({ length: blossomCount }, (_, idx) => {
    const a = seededUnit(seed * 79 + idx * 17) * Math.PI * 2;
    const d = canopyR * (0.22 + seededUnit(seed * 83 + idx * 31) * 0.56);
    const r = 0.95 + (idx % 3) * 0.35;
    return {
      x: canopyCx + Math.cos(a) * d,
      y: canopyCy + Math.sin(a) * d,
      r,
      petal: idx % 2 === 0 ? blossomPetalA : blossomPetalB,
      center: "#f0bc4f",
    };
  });

  const fruits = Array.from({ length: fruitCount }, (_, idx) => {
    const a = seededUnit(seed * 97 + idx * 29) * Math.PI * 2;
    const d = canopyR * (0.26 + seededUnit(seed * 107 + idx * 41) * 0.52);
    const r = 1.35 + seededUnit(seed * 109 + idx * 13) * 0.55;
    return {
      x: canopyCx + Math.cos(a) * d,
      y: canopyCy + Math.sin(a) * d,
      r,
      fill: idx % 2 === 0 ? fruitTone : "#f1b857",
    };
  });

  const shadowFilterId = `tree-shadow-${Math.abs(seed)}-${safeStage}`;
  const canopyFilterId = `tree-canopy-soft-${Math.abs(seed)}-${safeStage}`;
  const shadowWidth = 9.2 + canopyR * 0.55 + growth * 4.2 + (phase === "legacy" ? 4 : 0);
  const shadowHeight = 4.2 + canopyR * 0.22 + (phase === "legacy" ? 0.8 : 0);
  const trunkFootVisible =
    phase === "young" || phase === "mature" || phase === "blooming" || phase === "legacy";
  const trunkFootW =
    trunkW * (phase === "legacy" ? 1.18 : phase === "blooming" ? 1.14 : phase === "mature" ? 1.08 : 1.02);
  const trunkFootH = Math.max(
    7,
    trunkH * (phase === "legacy" ? 0.38 : phase === "blooming" ? 0.36 : phase === "mature" ? 0.33 : 0.28),
  );
  const trunkFootX = 50 - trunkFootW / 2 + (innerTrunkCx - 50) * 0.18;
  const trunkFootY = groundY - trunkFootH - 0.8;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden
      preserveAspectRatio="xMidYMid meet"
      style={{ overflow: "visible" }}
    >
      <defs>
        <filter id={shadowFilterId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <filter id={canopyFilterId} x="-24%" y="-24%" width="148%" height="148%">
          <feGaussianBlur stdDeviation="0.46" />
        </filter>
      </defs>

      <g transform={`translate(50 78) scale(${globalScale}) translate(-50 -78)`}>
        <ellipse
          cx="50"
          cy={groundY + 1.5}
          rx={shadowWidth}
          ry={shadowHeight}
          fill="rgba(0,0,0,0.14)"
          filter={`url(#${shadowFilterId})`}
        />

        {haloOpacity > 0 && (
          <ellipse
            cx={canopyCx}
            cy={canopyCy - canopyR * 0.03}
            rx={haloRx}
            ry={haloRy}
            fill={phase === "legacy" ? "rgba(255,236,194,0.5)" : "rgba(255,255,255,0.38)"}
            opacity={haloOpacity}
          />
        )}

        {phase === "seed" || phase === "germination" || phase === "sprout" ? (
          <>
            <ellipse
              cx="50"
              cy={phase === "sprout" ? 75.9 : 75.5}
              rx={phase === "sprout" ? 10.1 : 11.4}
              ry={phase === "sprout" ? 5.2 : 6.1}
              fill={soil}
            />
            <ellipse
              cx="50"
              cy={phase === "sprout" ? 76.1 : 75.9}
              rx={phase === "sprout" ? 5.8 : 6.8}
              ry={phase === "sprout" ? 2.6 : 3.3}
              fill={soilDark}
              opacity="0.34"
            />
            <ellipse
              cx="50"
              cy={phase === "sprout" ? 74.9 : 74.6}
              rx={phase === "sprout" ? 2.4 : 3.4}
              ry={phase === "sprout" ? 1.4 : 2.1}
              fill="#9f724c"
              opacity={phase === "sprout" ? 0.5 : 1}
              transform={`rotate(${seedAngle} 50 ${phase === "sprout" ? 74.9 : 74.6})`}
            />

            {phase !== "seed" && (
              <>
                <path
                  d={`M50 ${stemBaseY} C49.6 ${71.5 - stemH * 0.18}, ${stemCurveMidX} ${
                    68.5 - stemH * 0.52
                  }, ${stemCurveTopX} ${stemTopY}`}
                  stroke={stemTone}
                  strokeWidth={stemW}
                  fill="none"
                  strokeLinecap="round"
                />
                <ellipse
                  cx={49.2 - stemLeafRx * 0.34}
                  cy={stemTopY + stemLeafRy * 0.78}
                  rx={stemLeafRx}
                  ry={stemLeafRy}
                  fill="#96cb93"
                  transform={`rotate(-30 ${49.2 - stemLeafRx * 0.34} ${stemTopY + stemLeafRy * 0.78})`}
                />
                <ellipse
                  cx={50.8 + stemLeafRx * 0.34}
                  cy={stemTopY + stemLeafRy * 0.72}
                  rx={stemLeafRx}
                  ry={stemLeafRy}
                  fill="#a9d8a0"
                  transform={`rotate(28 ${50.8 + stemLeafRx * 0.34} ${stemTopY + stemLeafRy * 0.72})`}
                />
                {phase === "sprout" && (
                  <ellipse
                    cx="50"
                    cy={stemTopY - stemBudR * 0.3}
                    rx={stemBudR}
                    ry={stemBudR * 0.72}
                    fill="#b9dea3"
                  />
                )}
              </>
            )}
          </>
        ) : (
          <>
            <rect x={trunkX} y={trunkY} width={trunkW} height={trunkH} rx={trunkW * 0.52} fill={trunk} />
            <rect
              x={trunkX + trunkW * 0.18}
              y={trunkY + trunkH * 0.12}
              width={trunkW * 0.24}
              height={trunkH * 0.72}
              rx={trunkW * 0.18}
              fill={trunkLight}
              opacity="0.72"
            />

            {canopyVisible && (
              <>
                <g filter={`url(#${canopyFilterId})`}>
                  <circle cx={canopyCx} cy={canopyCy} r={canopyR * 0.78} fill={canopyBase} />
                  <ellipse
                    cx={canopyCx - canopyR * 0.12}
                    cy={canopyCy - canopyR * 0.22}
                    rx={canopyR * 0.42}
                    ry={canopyR * 0.27}
                    fill="rgba(255,255,255,0.16)"
                    opacity="0.72"
                  />

                  {backLobes.map((lobe, idx) => {
                    const jx = (seededUnit(seed * 53 + idx * 17) - 0.5) * canopyR * 0.08;
                    const jy = (seededUnit(seed * 61 + idx * 31) - 0.5) * canopyR * 0.08;
                    const rr =
                      canopyR * lobe.r * (0.95 + seededUnit(seed * 71 + idx * 11) * 0.1);
                    return (
                      <circle
                        key={`lobe-${idx}`}
                        cx={canopyCx + lobe.x * canopyR + jx}
                        cy={canopyCy + lobe.y * canopyR + jy}
                        r={rr}
                        fill={idx % 2 === 0 ? canopyShade : canopyLight}
                        opacity="0.86"
                      />
                    );
                  })}
                </g>

                {innerTrunkVisible && (
                  <g>
                    <ellipse
                      cx={innerTrunkCx}
                      cy={innerTrunkCy + innerTrunkRy * 0.14}
                      rx={innerTrunkRx * 1.18}
                      ry={innerTrunkRy * 0.96}
                      fill="rgba(34,23,14,0.22)"
                    />
                    <ellipse
                      cx={innerTrunkCx}
                      cy={innerTrunkCy}
                      rx={innerTrunkRx}
                      ry={innerTrunkRy}
                      fill={trunk}
                      opacity="0.98"
                    />
                    <ellipse
                      cx={innerTrunkCx - innerTrunkRx * 0.18}
                      cy={innerTrunkCy - innerTrunkRy * 0.2}
                      rx={innerTrunkRx * 0.24}
                      ry={innerTrunkRy * 0.42}
                      fill={trunkLight}
                      opacity="0.74"
                    />
                  </g>
                )}

                <g filter={`url(#${canopyFilterId})`}>
                  {frontLobes.map((lobe, idx) => {
                    const jx = (seededUnit(seed * 53 + (idx + 9) * 17) - 0.5) * canopyR * 0.08;
                    const jy = (seededUnit(seed * 61 + (idx + 9) * 31) - 0.5) * canopyR * 0.08;
                    const rr =
                      canopyR * lobe.r * (0.95 + seededUnit(seed * 71 + (idx + 9) * 11) * 0.1);
                    return (
                      <circle
                        key={`front-lobe-${idx}`}
                        cx={canopyCx + lobe.x * canopyR + jx}
                        cy={canopyCy + lobe.y * canopyR + jy}
                        r={rr}
                        fill={idx % 2 === 0 ? canopyShade : canopyLight}
                        opacity="0.88"
                      />
                    );
                  })}

                  {visibleLeafDots.map((leaf, idx) => (
                    <circle
                      key={`dot-${idx}`}
                      cx={leaf.x}
                      cy={leaf.y}
                      r={leaf.r}
                      fill={canopyShade}
                      opacity="0.26"
                    />
                  ))}

                  {decorLeaves.map((leaf, idx) => (
                    <circle
                      key={`leaf-${idx}`}
                      cx={leaf.x}
                      cy={leaf.y}
                      r={leaf.r}
                      fill={leaf.fill}
                      opacity="0.72"
                    />
                  ))}

                  {blossoms.map((flower, idx) => (
                    <g key={`flower-${idx}`}>
                      <circle cx={flower.x - flower.r} cy={flower.y} r={flower.r} fill={flower.petal} />
                      <circle cx={flower.x + flower.r} cy={flower.y} r={flower.r} fill={flower.petal} />
                      <circle cx={flower.x} cy={flower.y - flower.r} r={flower.r} fill={flower.petal} />
                      <circle cx={flower.x} cy={flower.y + flower.r} r={flower.r} fill={flower.petal} />
                      <circle
                        cx={flower.x}
                        cy={flower.y}
                        r={Math.max(0.6, flower.r * 0.55)}
                        fill={flower.center}
                      />
                    </g>
                  ))}

                  {fruits.map((fruit, idx) => (
                    <circle
                      key={`fruit-${idx}`}
                      cx={fruit.x}
                      cy={fruit.y}
                      r={fruit.r}
                      fill={fruit.fill}
                      opacity="0.92"
                    />
                  ))}
                </g>
                {trunkFootVisible && (
                  <g>
                    <ellipse
                      cx={trunkFootX + trunkFootW * 0.02}
                      cy={trunkFootY + trunkFootH * 0.96}
                      rx={trunkFootW * 0.7}
                      ry={trunkFootH * 0.36}
                      fill="rgba(35,24,15,0.16)"
                    />
                    <rect
                      x={trunkFootX}
                      y={trunkFootY}
                      width={trunkFootW}
                      height={trunkFootH}
                      rx={trunkFootW * 0.34}
                      fill={trunk}
                      opacity="0.94"
                    />
                    <rect
                      x={trunkFootX + trunkFootW * 0.14}
                      y={trunkFootY + trunkFootH * 0.1}
                      width={trunkFootW * 0.18}
                      height={trunkFootH * 0.68}
                      rx={trunkFootW * 0.1}
                      fill={trunkLight}
                      opacity="0.62"
                    />
                  </g>
                )}
              </>
            )}

          </>
        )}
      </g>
    </svg>
  );
}
