/**
 * NetworkScene3D - The core Three.js / React Three Fiber scene.
 * Contains the 3D environment, buildings, power lines, substation, and BESS.
 */

import React, { useRef, useCallback, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Stars } from '@react-three/drei';
import type * as THREE from 'three';
import type { Building3D, MapControls, BESSState, BuildingState3D, NetworkConnection, Position3D } from './types';
import { BuildingMesh } from './BuildingModels';
import { PowerLines } from './PowerLines';
import { SubstationModel, BESSModel } from './InfrastructureModels';

interface NetworkScene3DProps {
  buildings: Building3D[];
  buildingStates: Record<string, BuildingState3D>;
  connections: NetworkConnection[];
  bessState: BESSState;
  substationPos: Position3D;
  bessPos: Position3D;
  controls: MapControls;
  selectedBuildingId: string | null;
  onSelectBuilding: (building: Building3D | null) => void;
  orbitControlsRef: React.RefObject<React.ComponentRef<typeof OrbitControls> | null>;
}

class SceneErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '24px',
          color: '#f87171',
          background: 'rgba(15, 23, 42, 0.95)',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: '12px'
        }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>3D Scene Error</div>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8', maxWidth: '400px' }}>
            {this.state.error || 'Failed to render 3D WebGL scene.'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              background: '#0284c7',
              color: '#fff',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Retry Render
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const NetworkScene3D: React.FC<NetworkScene3DProps> = ({
  buildings,
  buildingStates,
  connections,
  bessState,
  substationPos,
  bessPos,
  controls,
  selectedBuildingId,
  onSelectBuilding,
  orbitControlsRef,
}) => {
  // Filter connections based on controls
  const visibleConnections = connections.filter((conn) => {
    if (conn.feederId === 'bess-intertie') return controls.showBESS;
    if (conn.feederId === 'feeder-a' && !controls.showFeederA) return false;
    if (conn.feederId === 'feeder-b' && !controls.showFeederB) return false;
    if (conn.feederId === 'feeder-c' && !controls.showFeederC) return false;
    return true;
  });

  // Filter buildings based on controls
  const visibleBuildings = buildings.filter((b) => {
    const state = buildingStates[b.id];
    if (controls.filterCritical && b.type !== 'critical') return false;
    if (controls.filterInOutage && state?.energyStatus !== 'outage') return false;
    if (controls.filterBatteryBacked && state?.energyStatus !== 'battery_backed') return false;
    return true;
  });

  // Determine highlighted feeder
  const highlightedFeederId = selectedBuildingId
    ? buildings.find((b) => b.id === selectedBuildingId)?.feeder ?? null
    : null;

  const handleCanvasClick = useCallback(() => {
    onSelectBuilding(null);
  }, [onSelectBuilding]);

  return (
    <SceneErrorBoundary>
      <Canvas
        camera={{
          position: [25, 25, 25],
          fov: 45,
          near: 0.1,
          far: 200,
        }}
        shadows
        dpr={[1, 1.5]}
        style={{ width: '100%', height: '100%', background: '#050811' }}
        onPointerMissed={handleCanvasClick}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <SceneContent
            buildings={visibleBuildings}
            buildingStates={buildingStates}
            connections={visibleConnections}
            bessState={bessState}
            substationPos={substationPos}
            bessPos={bessPos}
            controls={controls}
            selectedBuildingId={selectedBuildingId}
            highlightedFeederId={highlightedFeederId}
            onSelectBuilding={onSelectBuilding}
            orbitControlsRef={orbitControlsRef}
          />
        </Suspense>
      </Canvas>
    </SceneErrorBoundary>
  );
};

interface SceneContentProps {
  buildings: Building3D[];
  buildingStates: Record<string, BuildingState3D>;
  connections: NetworkConnection[];
  bessState: BESSState;
  substationPos: Position3D;
  bessPos: Position3D;
  controls: MapControls;
  selectedBuildingId: string | null;
  highlightedFeederId: string | null;
  onSelectBuilding: (building: Building3D | null) => void;
  orbitControlsRef: React.RefObject<React.ComponentRef<typeof OrbitControls> | null>;
}

const SceneContent: React.FC<SceneContentProps> = ({
  buildings,
  buildingStates,
  connections,
  bessState,
  substationPos,
  bessPos,
  controls,
  selectedBuildingId,
  highlightedFeederId,
  onSelectBuilding,
  orbitControlsRef,
}) => {
  return (
    <>
      {/* Camera Controls */}
      <OrbitControls
        ref={orbitControlsRef}
        enableDamping
        dampingFactor={0.08}
        minDistance={8}
        maxDistance={60}
        maxPolarAngle={Math.PI / 2.15}
        minPolarAngle={0.2}
        target={[0, 0, 0]}
      />

      {/* Environment & Lighting */}
      <color attach="background" args={['#050811']} />
      <fog attach="fog" args={['#050811', 50, 100]} />

      {/* Ambient light - boosted for Three.js r155+ color management */}
      <ambientLight intensity={0.9} color="#cbd5e1" />

      {/* Main directional light (sun) */}
      <directionalLight
        position={[20, 30, 10]}
        intensity={1.8}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={80}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />

      {/* Fill lights */}
      <directionalLight position={[-15, 20, -10]} intensity={0.8} color="#38bdf8" />
      <pointLight position={[0, 15, 0]} intensity={0.8} color="#38bdf8" distance={40} />

      {/* Subtle accent lights */}
      <pointLight position={[-15, 5, -10]} intensity={0.5} color="#38bdf8" distance={25} />
      <pointLight position={[15, 5, -2]} intensity={0.5} color="#a855f7" distance={25} />
      <pointLight position={[0, 5, 15]} intensity={0.5} color="#10b981" distance={25} />

      {/* Stars in background */}
      <Stars radius={80} depth={60} count={1500} factor={3} fade speed={0.5} />

      {/* Ground grid */}
      <Grid
        position={[0, -0.01, 0]}
        args={[80, 80]}
        cellSize={1}
        cellThickness={0.3}
        cellColor="#1e3a5f"
        sectionSize={5}
        sectionThickness={0.6}
        sectionColor="#0c4a6e"
        fadeDistance={50}
        fadeStrength={1.5}
        infiniteGrid
      />

      {/* Ground plane (shadow receiver) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial
          color="#050a15"
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Substation */}
      <SubstationModel position={substationPos} />

      {/* BESS Hub */}
      <BESSModel
        position={bessPos}
        state={bessState}
        visible={controls.showBESS}
      />

      {/* Power Lines */}
      <PowerLines
        connections={connections}
        showPowerFlow={controls.showPowerFlow}
        highlightedFeederId={highlightedFeederId}
      />

      {/* Buildings */}
      {buildings.map((building) => {
        const state = buildingStates[building.id];
        return (
          <BuildingMesh
            key={building.id}
            building={building}
            energyStatus={state?.energyStatus ?? 'normal'}
            isSelected={selectedBuildingId === building.id}
            isHighlightedFeeder={
              highlightedFeederId === null || highlightedFeederId === building.feeder
            }
            isConnectedToGrid={state?.isConnectedToGrid ?? true}
            showSolar={controls.showSolarAssets}
            onClick={() => onSelectBuilding(building)}
          />
        );
      })}

      {/* Outage highlight overlays */}
      {controls.showOutageHighlights &&
        buildings
          .filter((b) => buildingStates[b.id]?.energyStatus === 'outage')
          .map((b) => (
            <OutagePulse key={`outage-${b.id}`} position={b.position} size={Math.max(b.width, b.depth)} />
          ))}
    </>
  );
};

// ─── Outage Pulse Effect ─────────────────────────────────
const OutagePulse: React.FC<{ position: Position3D; size: number }> = ({ position, size }) => {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ringRef.current) {
      const t = state.clock.elapsedTime;
      const scale = 1 + Math.sin(t * 2) * 0.2;
      ringRef.current.scale.setScalar(scale);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(t * 3) * 0.15;
    }
  });

  return (
    <mesh
      ref={ringRef}
      position={[position.x, 0.08, position.z]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <ringGeometry args={[size * 0.6, size * 0.8, 24]} />
      <meshBasicMaterial color="#ef4444" transparent opacity={0.3} side={2} />
    </mesh>
  );
};
