/**
 * 3D Substation & BESS Models
 * Grid substation and Central Battery Energy Storage System hub.
 */

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { BESSState, Position3D } from './types';

// ─── Grid Substation ─────────────────────────────────────
interface SubstationProps {
  position: Position3D;
}

export const SubstationModel: React.FC<SubstationProps> = React.memo(({ position }) => {
  return (
    <group position={[position.x, 0, position.z]}>
      {/* Ground pad */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6, 4]} />
        <meshStandardMaterial
          color="#1e293b"
          emissive="#38bdf8"
          emissiveIntensity={0.15}
        />
      </mesh>

      {/* Main transformer block */}
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[3, 2.4, 2.2]} />
        <meshStandardMaterial
          color="#1e293b"
          emissive="#38bdf8"
          emissiveIntensity={0.12}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>

      {/* Transformer coil cylinders */}
      {[-0.8, 0.8].map((xOff) => (
        <mesh key={xOff} position={[xOff, 1.2, 0]}>
          <cylinderGeometry args={[0.45, 0.45, 1.8, 16]} />
          <meshStandardMaterial
            color="#0f172a"
            emissive="#06b6d4"
            emissiveIntensity={0.3}
            metalness={0.7}
            roughness={0.2}
          />
        </mesh>
      ))}

      {/* High-voltage bushings on top */}
      {[-1.0, 0, 1.0].map((xOff) => (
        <group key={xOff}>
          <mesh position={[xOff, 2.9, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 1.4, 8]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Insulator discs */}
          {[2.5, 2.7, 2.9, 3.1, 3.3].map((y) => (
            <mesh key={y} position={[xOff, y, 0]}>
              <cylinderGeometry args={[0.12, 0.12, 0.06, 8]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.3} roughness={0.7} />
            </mesh>
          ))}
          {/* Spark gap */}
          <mesh position={[xOff, 3.7, 0]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={1.2} />
          </mesh>
        </group>
      ))}

      {/* Fence around substation */}
      {[
        { px: 0, pz: -2.2, sx: 6.4, sz: 0.05 },
        { px: 0, pz: 2.2, sx: 6.4, sz: 0.05 },
        { px: -3.2, pz: 0, sx: 0.05, sz: 4.4 },
        { px: 3.2, pz: 0, sx: 0.05, sz: 4.4 },
      ].map((fence, i) => (
        <mesh key={i} position={[fence.px, 0.8, fence.pz]}>
          <boxGeometry args={[fence.sx, 1.6, fence.sz]} />
          <meshStandardMaterial
            color="#475569"
            wireframe
            transparent
            opacity={0.5}
          />
        </mesh>
      ))}

      {/* Label */}
      <Text
        position={[0, 4.7, 0]}
        fontSize={0.78}
        color="#38bdf8"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.05}
        outlineColor="#0a0f1d"
      >
        GRID SUBSTATION
      </Text>
      <Text
        position={[0, 4.1, 0]}
        fontSize={0.46}
        color="#94a3b8"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.03}
        outlineColor="#0a0f1d"
      >
        115kV / 12kV
      </Text>
    </group>
  );
});

SubstationModel.displayName = 'SubstationModel';

// ─── Central BESS Hub ────────────────────────────────────
interface BESSModelProps {
  position: Position3D;
  state: BESSState;
  visible: boolean;
}

export const BESSModel: React.FC<BESSModelProps> = React.memo(({ position, state, visible }) => {
  const chargeBarRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);

  useFrame((clock) => {
    if (!visible) return;
    const t = clock.clock.elapsedTime;

    // Animate charge bar
    if (chargeBarRef.current) {
      const scale = state.socPct / 100;
      chargeBarRef.current.scale.y = Math.max(0.01, scale);
      chargeBarRef.current.position.y = scale * 1.0;
    }

    // Animate charging/discharging pulse
    if (pulseRef.current) {
      if (state.isCharging || state.isDischarging) {
        const pulse = 0.5 + Math.sin(t * 4) * 0.5;
        (pulseRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse * 1.5;
      }
    }
  });

  if (!visible) return null;

  const batteryColor = state.socPct > 60 ? '#10b981' :
    state.socPct > 30 ? '#f59e0b' : '#ef4444';

  const statusColor = !state.isOnline ? '#ef4444' :
    state.isDischarging ? '#f59e0b' :
      state.isCharging ? '#10b981' : '#38bdf8';

  return (
    <group position={[position.x, 0, position.z]}>
      {/* Ground pad */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5, 3.5]} />
        <meshStandardMaterial
          color="#1e293b"
          emissive="#a855f7"
          emissiveIntensity={0.12}
        />
      </mesh>

      {/* Main battery container */}
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[4, 2.0, 2.5]} />
        <meshStandardMaterial
          color="#1e293b"
          emissive={statusColor}
          emissiveIntensity={0.15}
          metalness={0.5}
          roughness={0.4}
        />
      </mesh>

      {/* Battery cell modules */}
      {[-1.2, -0.4, 0.4, 1.2].map((xOff) => (
        <mesh key={xOff} position={[xOff, 1.2, 1.26]}>
          <boxGeometry args={[0.6, 1.5, 0.03]} />
          <meshStandardMaterial
            color={batteryColor}
            emissive={batteryColor}
            emissiveIntensity={0.4}
          />
        </mesh>
      ))}

      {/* SoC indicator bar (vertical) */}
      <mesh ref={chargeBarRef} position={[2.05, 1.0, 0]}>
        <boxGeometry args={[0.15, 2.0, 0.6]} />
        <meshStandardMaterial
          color={batteryColor}
          emissive={batteryColor}
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* SoC bar background */}
      <mesh position={[2.05, 1.0, 0]}>
        <boxGeometry args={[0.12, 2.0, 0.55]} />
        <meshStandardMaterial color="#0f172a" transparent opacity={0.5} />
      </mesh>

      {/* Charging/Discharging indicator */}
      {(state.isCharging || state.isDischarging) && (
        <mesh ref={pulseRef} position={[0, 2.5, 0]}>
          <sphereGeometry args={[0.2, 12, 12]} />
          <meshStandardMaterial
            color={statusColor}
            emissive={statusColor}
            emissiveIntensity={1.0}
          />
        </mesh>
      )}

      {/* Offline X indicator */}
      {!state.isOnline && (
        <group position={[0, 2.5, 1.26]}>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[1.0, 0.1, 0.05]} />
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.0} />
          </mesh>
          <mesh rotation={[0, 0, -Math.PI / 4]}>
            <boxGeometry args={[1.0, 0.1, 0.05]} />
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.0} />
          </mesh>
        </group>
      )}

      {/* Labels */}
      <Text
        position={[0, 3.2, 0]}
        fontSize={0.7}
        color="#c084fc"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.045}
        outlineColor="#0a0f1d"
      >
        CENTRAL BESS HUB
      </Text>
      <Text
        position={[0, 2.6, 0]}
        fontSize={0.44}
        color={state.isOnline ? '#cbd5e1' : '#ef4444'}
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.03}
        outlineColor="#0a0f1d"
      >
        {state.isOnline
          ? `${state.socPct}% SoC · ${state.capacityKwh} kWh`
          : 'OFFLINE'}
      </Text>
    </group>
  );
});

BESSModel.displayName = 'BESSModel';
