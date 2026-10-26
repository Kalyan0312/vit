/**
 * 3D Building Models - Procedural geometry for each building type.
 * Uses lightweight Three.js primitives (box, cylinder, cone) to create
 * distinct silhouettes for each facility in the smart-city scene.
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import type { Building3D, EnergyStatus } from './types';
import { STATUS_COLORS, FEEDER_COLORS } from './types';

interface BuildingMeshProps {
  building: Building3D;
  energyStatus: EnergyStatus;
  isSelected: boolean;
  isHighlightedFeeder: boolean;
  isConnectedToGrid: boolean;
  showSolar: boolean;
  onClick: () => void;
}

const STATUS_EMISSIVE_INTENSITY: Record<EnergyStatus, number> = {
  normal: 0.15,
  battery_backed: 0.35,
  flexed: 0.3,
  outage: 0.5,
};

export const BuildingMesh: React.FC<BuildingMeshProps> = React.memo(({
  building,
  energyStatus,
  isSelected,
  isHighlightedFeeder,
  isConnectedToGrid,
  showSolar,
  onClick,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const statusColor = STATUS_COLORS[energyStatus];
  const feederColor = FEEDER_COLORS[building.feeder];
  const emissiveIntensity = STATUS_EMISSIVE_INTENSITY[energyStatus];
  const { width: w, depth: d, height: h } = building;

  // Subtle hover/selection pulse
  useFrame((state) => {
    if (glowRef.current) {
      const t = state.clock.elapsedTime;
      if (isSelected) {
        glowRef.current.scale.setScalar(1.0 + Math.sin(t * 3) * 0.04);
      } else {
        glowRef.current.scale.setScalar(1.0);
      }
    }
  });

  const opacity = isHighlightedFeeder || isSelected ? 1.0 : 0.6;

  // Windows pattern
  const windowRows = Math.max(1, Math.floor(h / 1.5));
  const windowCols = Math.max(1, Math.floor(w / 1.2));

  const windowGeometries = useMemo(() => {
    const windows: { pos: [number, number, number]; size: [number, number] }[] = [];
    const wSpacing = (w * 0.8) / windowCols;
    const hSpacing = (h * 0.75) / windowRows;

    for (let r = 0; r < windowRows; r++) {
      for (let c = 0; c < windowCols; c++) {
        const wx = -w * 0.4 + wSpacing * 0.5 + c * wSpacing;
        const wy = h * 0.1 + hSpacing * 0.5 + r * hSpacing;
        windows.push({
          pos: [wx, wy, d / 2 + 0.01] as [number, number, number],
          size: [wSpacing * 0.5, hSpacing * 0.4],
        });
      }
    }
    return windows;
  }, [w, d, h, windowRows, windowCols]);

  const statusLabel =
    energyStatus === 'normal' ? 'POWERED' :
    energyStatus === 'battery_backed' ? 'BATTERY BACKED' :
    energyStatus === 'flexed' ? 'FLEXED' : 'OUTAGE';

  const isCriticalOutage = energyStatus === 'outage' && building.type === 'critical';
  const outagePulseRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (glowRef.current) {
      if (isSelected) {
        glowRef.current.scale.setScalar(1.0 + Math.sin(t * 3) * 0.04);
      } else {
        glowRef.current.scale.setScalar(1.0);
      }
    }
    if (outagePulseRef.current) {
      const s = 1.0 + (Math.sin(t * 4) + 1) * 0.15;
      outagePulseRef.current.scale.setScalar(s);
    }
  });

  return (
    <group
      ref={groupRef}
      position={[building.position.x, 0, building.position.z]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {/* Critical Facility Outage Pulse Ring */}
      {isCriticalOutage && (
        <mesh ref={outagePulseRef} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(w, d) * 0.85, Math.max(w, d) * 1.1, 32]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.65} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Selection glow ring */}
      {isSelected && (
        <mesh ref={glowRef} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(w, d) * 0.8, Math.max(w, d) * 0.95, 32]} />
          <meshBasicMaterial color={statusColor} transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Feeder color base plate */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w + 0.4, d + 0.4]} />
        <meshStandardMaterial
          color={feederColor}
          transparent
          opacity={isHighlightedFeeder ? 0.35 : 0.15}
          emissive={feederColor}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Main building body */}
      {renderBuildingShape(building, statusColor, emissiveIntensity, opacity, isConnectedToGrid)}

      {/* Front-face windows */}
      {windowGeometries.slice(0, 20).map((win, i) => (
        <mesh key={`win-${i}`} position={win.pos}>
          <planeGeometry args={win.size} />
          <meshStandardMaterial
            color={energyStatus === 'outage' ? '#1e293b' : '#38bdf8'}
            emissive={energyStatus === 'outage' ? '#000000' : '#38bdf8'}
            emissiveIntensity={energyStatus === 'outage' ? 0 : 0.4}
            transparent
            opacity={energyStatus === 'outage' ? 0.3 : 0.7}
          />
        </mesh>
      ))}

      {/* Solar panels on roof */}
      {showSolar && building.solarCapacityKw > 0 && (
        <group position={[0, h + 0.15, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[w * 0.7, d * 0.6]} />
            <meshStandardMaterial
              color="#0369a1"
              emissive="#0284c7"
              emissiveIntensity={0.5}
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
          {/* Panel grid lines */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <planeGeometry args={[w * 0.72, d * 0.62]} />
            <meshBasicMaterial color="#075985" wireframe transparent opacity={0.6} />
          </mesh>
        </group>
      )}

      {/* Building ShortName Label */}
      <Text
        position={[0, h + (showSolar && building.solarCapacityKw > 0 ? 0.95 : 0.65), 0]}
        fontSize={0.75}
        color="#f8fafc"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.05}
        outlineColor="#0a0f1d"
      >
        {building.shortName}
      </Text>

      {/* Live Status Label */}
      <Text
        position={[0, h + (showSolar && building.solarCapacityKw > 0 ? 1.85 : 1.55), 0]}
        fontSize={0.46}
        color={statusColor}
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.035}
        outlineColor="#0a0f1d"
      >
        {statusLabel}
      </Text>

      {/* Grid disconnect indicator */}
      {!isConnectedToGrid && (
        <Text
          position={[0, h + (showSolar && building.solarCapacityKw > 0 ? 2.6 : 2.3), 0]}
          fontSize={0.48}
          color="#ef4444"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.04}
          outlineColor="#0a0f1d"
        >
          ⚡ OFFLINE
        </Text>
      )}
    </group>
  );
});

BuildingMesh.displayName = 'BuildingMesh';

/**
 * Render the appropriate building shape based on type.
 */
function renderBuildingShape(
  building: Building3D,
  statusColor: string,
  emissiveIntensity: number,
  opacity: number,
  isConnectedToGrid: boolean,
) {
  const { width: w, depth: d, height: h, shape } = building;
  const baseColor = isConnectedToGrid ? '#1e293b' : '#0f172a';

  const commonProps = {
    color: baseColor,
    emissive: statusColor,
    emissiveIntensity,
    metalness: 0.3,
    roughness: 0.7,
    transparent: true,
    opacity,
  };

  switch (shape) {
    case 'hospital':
      return (
        <group>
          {/* Main block */}
          <mesh position={[0, h / 2, 0]}>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial {...commonProps} />
          </mesh>
          {/* Cross emblem on front */}
          <mesh position={[0, h * 0.75, d / 2 + 0.02]}>
            <boxGeometry args={[0.3, 1.0, 0.05]} />
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.8} />
          </mesh>
          <mesh position={[0, h * 0.75, d / 2 + 0.02]}>
            <boxGeometry args={[1.0, 0.3, 0.05]} />
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.8} />
          </mesh>
          {/* Helipad on roof */}
          <mesh position={[0, h + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.5, 0.7, 16]} />
            <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.5} side={THREE.DoubleSide} />
          </mesh>
        </group>
      );

    case 'datacenter':
      return (
        <group>
          <mesh position={[0, h / 2, 0]}>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial {...commonProps} metalness={0.6} roughness={0.3} />
          </mesh>
          {/* Server rack indicator strips */}
          {[0.2, 0.4, 0.6, 0.8].map((frac) => (
            <mesh key={frac} position={[0, h * frac, d / 2 + 0.02]}>
              <boxGeometry args={[w * 0.85, 0.08, 0.02]} />
              <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.8} />
            </mesh>
          ))}
        </group>
      );

    case 'university':
      return (
        <group>
          {/* Main hall */}
          <mesh position={[0, h * 0.4, 0]}>
            <boxGeometry args={[w, h * 0.8, d]} />
            <meshStandardMaterial {...commonProps} />
          </mesh>
          {/* Tower/spire */}
          <mesh position={[0, h * 0.8 + h * 0.2 / 2, 0]}>
            <boxGeometry args={[w * 0.3, h * 0.4, d * 0.3]} />
            <meshStandardMaterial {...commonProps} />
          </mesh>
          {/* Dome on top */}
          <mesh position={[0, h, 0]}>
            <sphereGeometry args={[w * 0.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial {...commonProps} emissive="#38bdf8" emissiveIntensity={0.3} />
          </mesh>
        </group>
      );

    case 'emergency':
      return (
        <group>
          <mesh position={[0, h / 2, 0]}>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial {...commonProps} />
          </mesh>
          {/* Antenna/radio tower */}
          <mesh position={[w * 0.3, h + 1, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 2, 8]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Warning beacon */}
          <mesh position={[w * 0.3, h + 2.1, 0]}>
            <sphereGeometry args={[0.12, 8, 8]} />
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.5} />
          </mesh>
        </group>
      );

    case 'residential':
      return (
        <group>
          {/* Main block */}
          <mesh position={[0, h / 2, 0]}>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial {...commonProps} />
          </mesh>
          {/* Balcony accents */}
          {[0.3, 0.5, 0.7, 0.9].map((frac) => (
            <mesh key={frac} position={[0, h * frac, d / 2 + 0.12]}>
              <boxGeometry args={[w * 0.9, 0.06, 0.2]} />
              <meshStandardMaterial color="#334155" metalness={0.4} roughness={0.6} />
            </mesh>
          ))}
        </group>
      );

    case 'tower':
      return (
        <group>
          {/* Tall main tower */}
          <mesh position={[0, h / 2, 0]}>
            <boxGeometry args={[w * 0.85, h, d * 0.85]} />
            <meshStandardMaterial {...commonProps} metalness={0.5} roughness={0.4} />
          </mesh>
          {/* Glass curtain wall accent */}
          <mesh position={[0, h / 2, d * 0.85 / 2 + 0.02]}>
            <planeGeometry args={[w * 0.8, h * 0.9]} />
            <meshStandardMaterial
              color="#0c4a6e"
              emissive="#0ea5e9"
              emissiveIntensity={0.2}
              transparent
              opacity={0.4}
              metalness={0.9}
              roughness={0.1}
            />
          </mesh>
          {/* Antenna spire */}
          <mesh position={[0, h + 0.6, 0]}>
            <coneGeometry args={[0.1, 1.2, 6]} />
            <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      );

    case 'water':
      return (
        <group>
          {/* Processing building */}
          <mesh position={[0, h * 0.4, d * 0.15]}>
            <boxGeometry args={[w * 0.6, h * 0.8, d * 0.6]} />
            <meshStandardMaterial {...commonProps} />
          </mesh>
          {/* Water tank (cylinder) */}
          <mesh position={[-w * 0.25, h * 0.6, -d * 0.25]}>
            <cylinderGeometry args={[w * 0.25, w * 0.25, h * 0.8, 16]} />
            <meshStandardMaterial {...commonProps} color="#0c4a6e" emissive="#0ea5e9" emissiveIntensity={0.25} />
          </mesh>
          {/* Smaller tank */}
          <mesh position={[w * 0.25, h * 0.4, -d * 0.2]}>
            <cylinderGeometry args={[w * 0.15, w * 0.15, h * 0.5, 12]} />
            <meshStandardMaterial {...commonProps} color="#0c4a6e" emissive="#0ea5e9" emissiveIntensity={0.2} />
          </mesh>
        </group>
      );

    case 'coldStorage':
      return (
        <group>
          {/* Main warehouse block */}
          <mesh position={[0, h / 2, 0]}>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial {...commonProps} color="#1e3a5f" />
          </mesh>
          {/* Cooling units on roof */}
          {[-0.5, 0.5].map((xOff) => (
            <mesh key={xOff} position={[w * 0.2 * xOff, h + 0.25, 0]}>
              <boxGeometry args={[w * 0.25, 0.5, d * 0.3]} />
              <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.3} />
            </mesh>
          ))}
          {/* Frost stripe */}
          <mesh position={[0, h * 0.5, d / 2 + 0.02]}>
            <boxGeometry args={[w * 0.9, 0.1, 0.02]} />
            <meshStandardMaterial color="#7dd3fc" emissive="#38bdf8" emissiveIntensity={0.6} />
          </mesh>
        </group>
      );

    case 'evStation':
      return (
        <group>
          {/* Low canopy structure */}
          <mesh position={[0, h * 0.8, 0]}>
            <boxGeometry args={[w, 0.15, d]} />
            <meshStandardMaterial {...commonProps} />
          </mesh>
          {/* Support pillars */}
          {[
            [-w * 0.35, -d * 0.35],
            [w * 0.35, -d * 0.35],
            [-w * 0.35, d * 0.35],
            [w * 0.35, d * 0.35],
          ].map(([px, pz], i) => (
            <mesh key={i} position={[px, h * 0.4, pz]}>
              <cylinderGeometry args={[0.08, 0.08, h * 0.8, 8]} />
              <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.3} />
            </mesh>
          ))}
          {/* Charging posts */}
          {[-0.8, 0, 0.8].map((xOff) => (
            <mesh key={xOff} position={[xOff, h * 0.35, 0]}>
              <boxGeometry args={[0.2, h * 0.7, 0.15]} />
              <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.5} />
            </mesh>
          ))}
          {/* EV lightning bolt symbol */}
          <mesh position={[0, h + 0.3, d / 2 + 0.1]}>
            <boxGeometry args={[0.3, 0.5, 0.05]} />
            <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.8} />
          </mesh>
        </group>
      );

    case 'civic':
      return (
        <group>
          {/* Wide civic building */}
          <mesh position={[0, h / 2, 0]}>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial {...commonProps} />
          </mesh>
          {/* Front columns */}
          {[-0.8, -0.4, 0, 0.4, 0.8].map((xOff) => (
            <mesh key={xOff} position={[w * 0.3 * xOff, h * 0.4, d / 2 + 0.15]}>
              <cylinderGeometry args={[0.06, 0.06, h * 0.7, 8]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.5} roughness={0.4} />
            </mesh>
          ))}
          {/* Pediment triangle on top */}
          <mesh position={[0, h + 0.25, d / 2 + 0.1]}>
            <coneGeometry args={[w * 0.5, 0.5, 3]} />
            <meshStandardMaterial {...commonProps} />
          </mesh>
        </group>
      );

    case 'commercial':
    default:
      return (
        <group>
          <RoundedBox args={[w, h, d]} radius={0.1} position={[0, h / 2, 0]}>
            <meshStandardMaterial {...commonProps} />
          </RoundedBox>
          {/* Signage strip */}
          <mesh position={[0, h * 0.85, d / 2 + 0.02]}>
            <boxGeometry args={[w * 0.8, 0.15, 0.02]} />
            <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={0.6} />
          </mesh>
        </group>
      );
  }
}
