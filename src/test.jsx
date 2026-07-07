import { Canvas } from "@react-three/fiber";
import { useState } from "react";

function Scene() {
  const [boxes, setBoxes] = useState([]);

  const addBox = () => {
    setBoxes((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        position: [
          Math.random() * 4 - 2,
          Math.random() * 4 - 2,
          Math.random() * 4 - 2,
        ],
      },
    ]);
  };

  return (
    <>
      <button
        onClick={addBox}
        style={{ position: "absolute", zIndex: 1 }}
      >
        Add Box
      </button>

      <Canvas>
        <ambientLight />

        {boxes.map((box) => (
          <mesh key={box.id} position={box.position}>
            <boxGeometry />
            <meshStandardMaterial color="orange" />
          </mesh>
        ))}
      </Canvas>
    </>
  );
}

export default Scene;