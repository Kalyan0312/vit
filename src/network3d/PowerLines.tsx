/**
 * 3D Power Lines - Animated glowing connections between substation and buildings.
 * Each feeder group has a distinct color (cyan, green, purple).
 * Power flow is animated with pulsing spheres along the lines.
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { NetworkConnection } from './types';

interface PowerLinesProps {
  connections: NetworkConnection[];
  showPowerFlow: boolean;
  highlightedFeederId: string | null;
}

export const PowerLines: React.FC<PowerLinesProps> = React.memo(({
  connections,
  showPowerFlow,
  highlightedFeederId,
}) => {
  return (
    <group>
      {connections.map((conn) => (
        <PowerLine
          key={conn.id}
          connection={conn}
          showPowerFlow={showPowerFlow}
          isHighlighted={highlightedFeederId === conn.feederId || highlightedFeederId === null}
          isDimmed={highlightedFeederId !== null && highlightedFeederId !== conn.feederId}
        />
      ))}
    </group>
  );
});

PowerLines.displayName = 'PowerLines';

interface PowerLineProps {
  connection: NetworkConnection;
  showPowerFlow: boolean;
  isHighlighted: boolean;
  isDimmed: boolean;
}

const PowerLine: React.FC<PowerLineProps> = React.memo(({
  connection,
  showPowerFlow,
  isHighlighted,
  isDimmed,
}) => {
  const tubeRef = useRef<THREE.Mesh>(null);
  const pulseRef1 = useRef<THREE.Mesh>(null);
  const pulseRef2 = useRef<THREE.Mesh>(null);

  // Build a curve from waypoints
  const curve = useMemo(() => {
    const pts = connection.waypoints.map(
      (wp) => new THREE.Vector3(wp.x, wp.y, wp.z)
    );
    return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.2);
  }, [connection.waypoints]);

  // Create tube geometry
  const tubeGeometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 32, 0.06, 8, false);
  }, [curve]);

  // Animate power flow pulses
  useFrame((state) => {
    if (!showPowerFlow || !connection.isActive) return;

    const t = state.clock.elapsedTime;
    const speed = 0.4;

    if (pulseRef1.current) {
      const pos1 = (t * speed) % 1;
      const p1 = curve.getPoint(pos1);
      pulseRef1.current.position.copy(p1);
    }

    if (pulseRef2.current) {
      const pos2 = ((t * speed) + 0.5) % 1;
      const p2 = curve.getPoint(pos2);
      pulseRef2.current.position.copy(p2);
    }
  });

  const lineColor = connection.isActive ? connection.color : '#ef4444';
  const lineOpacity = isDimmed ? 0.15 : connection.isActive ? 0.7 : 0.4;

  return (
    <group>
      {/* Main power line tube */}
      <mesh ref={tubeRef} geometry={tubeGeometry}>
        <meshStandardMaterial
          color={lineColor}
          emissive={lineColor}
          emissiveIntensity={isHighlighted && connection.isActive ? 0.8 : 0.3}
          transparent
          opacity={lineOpacity}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Outer glow tube */}
      {connection.isActive && isHighlighted && (
        <mesh geometry={new THREE.TubeGeometry(curve, 32, 0.12, 8, false)}>
          <meshBasicMaterial
            color={lineColor}
            transparent
            opacity={0.08}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Severed line indicator - dashed */}
      {!connection.isActive && (
        <group>
          {/* X mark at midpoint */}
          {(() => {
            const midPoint = curve.getPoint(0.5);
            return (
              <group position={[midPoint.x, midPoint.y + 0.3, midPoint.z]}>
                <mesh rotation={[0, 0, Math.PI / 4]}>
                  <boxGeometry args={[0.4, 0.06, 0.06]} />
                  <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.0} />
                </mesh>
                <mesh rotation={[0, 0, -Math.PI / 4]}>
                  <boxGeometry args={[0.4, 0.06, 0.06]} />
                  <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.0} />
                </mesh>
              </group>
            );
          })()}
        </group>
      )}

      {/* Animated flow pulses */}
      {showPowerFlow && connection.isActive && (
        <>
          <mesh ref={pulseRef1}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshStandardMaterial
              color={lineColor}
              emissive={lineColor}
              emissiveIntensity={1.5}
              transparent
              opacity={0.9}
            />
          </mesh>
          <mesh ref={pulseRef2}>
            <sphereGeometry args={[0.12, 8, 8]} />
            <meshStandardMaterial
              color={lineColor}
              emissive={lineColor}
              emissiveIntensity={1.2}
              transparent
              opacity={0.7}
            />
          </mesh>
        </>
      )}

      {/* Verified/modeled indicator */}
      {!connection.isVerified && connection.isActive && (
        (() => {
          const qPoint = curve.getPoint(0.25);
          return (
            <mesh position={[qPoint.x, qPoint.y + 0.25, qPoint.z]}>
              <sphereGeometry args={[0.08, 6, 6]} />
              <meshStandardMaterial
                color="#f59e0b"
                emissive="#f59e0b"
                emissiveIntensity={0.8}
              />
            </mesh>
          );
        })()
      )}
    </group>
  );
});

PowerLine.displayName = 'PowerLine';
