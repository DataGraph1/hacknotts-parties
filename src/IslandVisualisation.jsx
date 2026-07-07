import { createRoot } from 'react-dom/client'
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrthographicCamera } from "@react-three/drei";
import './IslandVisualisation.css'
import * as THREE from 'three';
import { positionGeometry } from 'three/tsl';
import { LinearRec2020ColorSpace } from 'three/examples/jsm/math/ColorSpaces.js';
import { compressNormals } from 'three/examples/jsm/utils/GeometryCompressionUtils.js';


// stolen from https://stackoverflow.com/a/47593316
function cyrb128(str) {
  let h1 = 1779033703, h2 = 3144134277,
      h3 = 1013904242, h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
      k = str.charCodeAt(i);
      h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
      h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
      h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
      h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= (h2 ^ h3 ^ h4), h2 ^= h1, h3 ^= h1, h4 ^= h1;

  const value = [h1>>>0, h2>>>0, h3>>>0, h4>>>0];
  return value;
}
function splitmix32(a) {
 return function() {
   a |= 0;
   a = a + 0x9e3779b9 | 0;
   let t = a ^ a >>> 16;
   t = Math.imul(t, 0x21f0aaad);
   t = t ^ t >>> 15;
   t = Math.imul(t, 0x735a2d97);
   return ((t = t ^ t >>> 15) >>> 0) / 4294967296;
  }
}
function seedFromIslands(islands) {

}


function isInView(camera, object) {
  const frustum = new THREE.Frustum();
  const projScreenMatrix = new THREE.Matrix4();

  camera.updateMatrixWorld();
  object.updateMatrixWorld(true);

  projScreenMatrix.multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse
  );

  frustum.setFromProjectionMatrix(projScreenMatrix);

  return frustum.intersectsObject(object);
}


const _box = new THREE.Box3();
const _vec = new THREE.Vector3();

function isFullyVisible(camera, object, renderer, margin = 20) {
  object.updateWorldMatrix(true, false);

  _box.setFromObject(object);

  if (_box.isEmpty()) return false;

  const { width, height } = renderer.getSize(new THREE.Vector2());

  const corners = [
    new THREE.Vector3(_box.min.x, _box.min.y, _box.min.z),
    new THREE.Vector3(_box.min.x, _box.min.y, _box.max.z),
    new THREE.Vector3(_box.min.x, _box.max.y, _box.min.z),
    new THREE.Vector3(_box.min.x, _box.max.y, _box.max.z),
    new THREE.Vector3(_box.max.x, _box.min.y, _box.min.z),
    new THREE.Vector3(_box.max.x, _box.min.y, _box.max.z),
    new THREE.Vector3(_box.max.x, _box.max.y, _box.min.z),
    new THREE.Vector3(_box.max.x, _box.max.y, _box.max.z),
  ];

  for (const corner of corners) {
    _vec.copy(corner).project(camera);

    // Behind camera
    if (_vec.z < -1 || _vec.z > 1) return false;

    const x = (_vec.x * 0.5 + 0.5) * width;
    const y = (-_vec.y * 0.5 + 0.5) * height;

    if (
      x < margin ||
      x > width - margin ||
      y < margin ||
      y > height - margin
    ) {
      return false;
    }
  }

  return true;
}

function CameraController() {
  useThree(({ camera }) => {
    camera.position.set(-10, 12, 10);
  });
}

function Island({pos, teamNum, zoomOut, resetZoom, ...props}) {
  const meshRef = useRef();
  const { camera, gl } = useThree();

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  useFrame(
    (state, delta) => {
      if (meshRef.current.position.y > 0.01) {
        (meshRef.current.position.y -= (meshRef.current.position.y)*delta*5)
      }
      else {
        meshRef.current.position.y = 0
      }

      if (isFullyVisible(camera, meshRef.current, gl, 25) == false) {
        zoomOut();
      }
    }
  );

  useLayoutEffect(() => {
    window.addEventListener('resize', resetZoom);
  })


  return (
    <mesh
      {...props}
      position={(pos)}
      ref={meshRef}
      scale={1}
    >
      <boxGeometry args={[1, .3, 1]} />
      <meshStandardMaterial color={(teamNum === 0) ? "#2860a9" : "#28a94f"} />
    </mesh>
  )
}


function GetIslandPos(teamNum, islands) {
  const seed = "really_cool_seed_value";
  var rand = splitmix32(cyrb128(seed));

  let possiblePos = [];
  const connectingOffsets = [
    [-1, 0], [0, -1], [1, 0], [0, 1]
  ]

  while (possiblePos.length == 0) {
    islands.forEach((island) => {
      if (teamNum != island.teamNum) {
        return;
      }
      
      connectingOffsets.forEach((offset) => {
        possiblePos.push([
          island.position[0] + offset[0],
          island.position[2] + offset[1]
        ])
      })
    });

    possiblePos = possiblePos.filter(([x, y]) =>
      !islands.some(island =>
        island.position[0] === x &&
        island.position[2] === y
      )
    );

    //stole from https://stackoverflow.com/questions/4550505
    return possiblePos[Math.floor(rand() * possiblePos.length)];
  }
}


export default function Visualiser() {
  const [islands, updateIslands] = useState([]);

  const addIsland = (teamNum, tilemapPos) => {
    console.log("Added island: " + teamNum);

    updateIslands((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        teamNum: teamNum,
        position: [
          tilemapPos[0],
          1,
          tilemapPos[1]
        ],
      },
    ]);
  };

  useEffect(() => {
    updateIslands(() => []); // fix for strict mode where it triggers all renders twice
    addIsland(0, [ 1,  1]);
    addIsland(1, [-1, -1]);
  }, []);

  const cameraRef = useRef();

  const zoomOut = () => {
    if (!cameraRef.current) return;

    cameraRef.current.zoom *= 0.99;
    cameraRef.current.updateProjectionMatrix();

    console.log("Zoom: ", cameraRef.current.zoom);
  };

  const resetZoom = () => {
    if (!cameraRef.current) return;

    cameraRef.current.zoom = 50;
    cameraRef.current.updateProjectionMatrix();

    console.log("Zoom reset: ", cameraRef.current.zoom);
  };


  return (
    <div style={{
      width: "100%",
      height: "100%",
      display: "flex",
    }}>
      <Canvas 
        style={{
          flex: 1,
        }}>

        <OrthographicCamera
          ref={cameraRef}
          makeDefault
          zoom={50}
          rotation={[-0.8726646, -0.5235988, -0.5235988, 'XYZ']}
          position={[-1, 2, 1]}
        />

        <CameraController/>

        <ambientLight intensity={Math.PI / 2} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />
        <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
        
        {islands.map((island) => (
          <Island key={island.id} pos={island.position} teamNum={island.teamNum} zoomOut={zoomOut} resetZoom={resetZoom} />
        ))}
      </Canvas>

      
    </div>
  )
}
