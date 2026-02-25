interface Note {
  name: string;
  freq: number;
}

interface GridVisualizerProps {
  grid: (Note | null)[][];
  currentStep: number;
}

function GridVisualizer({ grid, currentStep }: GridVisualizerProps) {
  // Clockwise mapping: step index -> grid position
  // Starting from top-left, moving clockwise around the perimeter
  // Grid positions: [0,1,2,3,4,5,6,7,8] where 4 is center (empty)
  // Clockwise path: 0 -> 1 -> 2 -> 5 -> 8 -> 7 -> 6 -> 3
  const clockwiseMapping = [0, 1, 2, 5, 8, 7, 6, 3];

  // Get the grid position for the current step
  const currentGridPosition =
    clockwiseMapping[currentStep % clockwiseMapping.length];

  // Flatten the grid
  const flatGrid = grid.flat();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 100px)",
        gridTemplateRows: "repeat(3, 100px)",
        gap: "5px",
        width: "fit-content",
        marginBottom: "20px",
      }}
    >
      {flatGrid.map((note, gridIndex) =>
        note ? (
          <div
            key={note.name}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              backgroundColor:
                gridIndex === currentGridPosition ? "#4CAF50" : "#fff",
              border: "2px solid #000",
              borderRadius: "4px",
              fontWeight: "bold",
              transition: "background-color 0.1s ease",
            }}
          />
        ) : (
          <div key={`empty-${gridIndex}`} />
        ),
      )}
    </div>
  );
}

export default GridVisualizer;
