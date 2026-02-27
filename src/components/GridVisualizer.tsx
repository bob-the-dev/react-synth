interface GridVisualizerProps {
  currentStep: number;
  isPlaying: boolean;
}

function GridVisualizer({ currentStep, isPlaying }: GridVisualizerProps) {
  // 3x3 grid positions (clockwise pattern starting top-left)
  const gridPositions = [
    [0, 0], // Top-left (step 0)
    [1, 0], // Top-center (step 1)
    [2, 0], // Top-right (step 2)
    [2, 1], // Right-center (step 3)
    [2, 2], // Bottom-right (step 4)
    [1, 2], // Bottom-center (step 5)
    [0, 2], // Bottom-left (step 6)
    [0, 1], // Left-center (step 7)
  ];

  const cellSize = 20; // Small cells
  const gap = 2;
  const gridSize = cellSize * 3 + gap * 2;

  return (
    <div
      style={{
        marginBottom: "15px",
      }}
    >
      <svg
        width={gridSize}
        height={gridSize}
        style={{
          border: "1px solid #ccc",
          borderRadius: "4px",
          backgroundColor: "#fafafa",
        }}
      >
        {/* Draw 3x3 grid */}
        {Array.from({ length: 9 }).map((_, i) => {
          const row = Math.floor(i / 3);
          const col = i % 3;
          const x = col * (cellSize + gap);
          const y = row * (cellSize + gap);

          // Check if this position matches current step
          const stepIndex = gridPositions.findIndex(
            (pos) => pos[0] === col && pos[1] === row,
          );
          const isActive = isPlaying && stepIndex === currentStep;
          const hasStep = stepIndex !== -1;

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={cellSize}
                height={cellSize}
                fill={isActive ? "#ffeb3b" : hasStep ? "#e0e0e0" : "#f5f5f5"}
                stroke={isActive ? "#fbc02d" : "#ccc"}
                strokeWidth={isActive ? 2 : 1}
                rx={2}
              />
              {hasStep && (
                <text
                  x={x + cellSize / 2}
                  y={y + cellSize / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="10"
                  fill={isActive ? "#333" : "#666"}
                  fontWeight={isActive ? "bold" : "normal"}
                >
                  {stepIndex + 1}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div style={{ fontSize: "10px", color: "#666", marginTop: "4px" }}>
        Step Pattern
      </div>
    </div>
  );
}

export default GridVisualizer;
