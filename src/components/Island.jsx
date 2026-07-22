import React, { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three';


function isFullyVisible(camera, object, renderer, margin = 20) {
  const _box = new THREE.Box3();
  const _vec = new THREE.Vector3();

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


export default function Island({pos, teamNum, zoomOut, resetZoom, ...props}) {
  const meshRef = useRef();
  const { camera, gl } = useThree();


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