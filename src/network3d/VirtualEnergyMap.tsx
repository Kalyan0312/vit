/**
 * VirtualEnergyMap - Main page component integrating the 3D scene
 * with all UI overlays and simulation data.
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import type { SimulationResult } from '../simulation/types';
import type { FeederId } from '../simulation/types';
import type { MapControls, SelectedBuilding, Building3D } from './types';
import { NetworkScene3D } from './NetworkScene3D';
import { ControlsPanel, StatusLegend, BESSInfoPanel, BuildingInspector } from './MapOverlays';
import { getBuildings3D, computeBuildingStates, getNetworkConnections, computeBESSState, SUBSTATION_POS, BESS_POS } from './sceneData';

interface VirtualEnergyMapProps {
  result: SimulationResult;
  currentHour: number;
}

export const VirtualEnergyMap: React.FC<VirtualEnergyMapProps> = ({
  result,
  currentHour,
}) => {
  // UI controls state
  const [controls, setControls] = useState<MapControls>({
    showFeederA: true,
    showFeederB: true,
    showFeederC: true,
    showPowerFlow: true,
    showSolarAssets: true,
    showBESS: true,
    showOutageHighlights: true,
    filterCritical: false,
    filterInOutage: false,
    filterBatteryBacked: false,
    feederOutage: 'none',
  });

  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);

  const orbitControlsRef = useRef<React.ComponentRef<typeof OrbitControls> | null>(null);

  // Get static building definitions
  const buildings = useMemo(() => getBuildings3D(), []);

  // Determine effective feeder outage (local override or from scenario)
  const effectiveFeederOutage = controls.feederOutage !== 'none'
    ? controls.feederOutage
    : result.scenario.feederOutage;

  // Compute building states from simulation data
  const hourlyData = result.hourly[currentHour];
  const buildingStates = useMemo(
    () => computeBuildingStates(hourlyData, effectiveFeederOutage),
    [hourlyData, effectiveFeederOutage]
  );

  // Compute network connections
  const connections = useMemo(
    () => getNetworkConnections(effectiveFeederOutage),
    [effectiveFeederOutage]
  );

  // Compute BESS state
  const bessState = useMemo(
    () => computeBESSState(hourlyData, result.scenario.batteryOutage),
    [hourlyData, result.scenario.batteryOutage]
  );

  // Selected building info
  const selectedBuilding: SelectedBuilding | null = useMemo(() => {
    if (!selectedBuildingId) return null;
    const building = buildings.find((b) => b.id === selectedBuildingId);
    const state = buildingStates[selectedBuildingId];
    if (!building || !state) return null;
    return { building, state };
  }, [selectedBuildingId, buildings, buildingStates]);

  // Handlers
  const handleToggle = useCallback((key: keyof MapControls) => {
    setControls((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const handleFeederOutage = useCallback((feeder: 'none' | FeederId) => {
    setControls((prev) => ({
      ...prev,
      feederOutage: feeder,
    }));
  }, []);

  const handleSelectBuilding = useCallback((building: Building3D | null) => {
    setSelectedBuildingId(building?.id ?? null);
  }, []);

  const handleResetView = useCallback(() => {
    if (orbitControlsRef.current) {
      const ctrl = orbitControlsRef.current as any;
      if (ctrl.reset) {
        ctrl.reset();
      }
    }
    setSelectedBuildingId(null);
    setControls((prev) => ({
      ...prev,
      filterCritical: false,
      filterInOutage: false,
      filterBatteryBacked: false,
    }));
  }, []);

  // Calculate outage summary stats
  const outageStats = useMemo(() => {
    let totalDemand = 0;
    let affectedDemand = 0;
    let affectedCount = 0;
    let unmetTotal = 0;

    for (const state of Object.values(buildingStates)) {
      totalDemand += state.demandKw;
      if (state.energyStatus === 'outage') {
        affectedCount++;
        affectedDemand += state.demandKw;
      }
      unmetTotal += state.unmetKw;
    }

    return { totalDemand, affectedDemand, affectedCount, unmetTotal };
  }, [buildingStates]);

  return (
    <div
      className="glass-panel"
      style={{
        position: 'relative',
        width: '100%',
        height: '680px',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}
    >
      {/* Title bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 11,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'linear-gradient(180deg, rgba(10, 15, 29, 0.9) 0%, transparent 100%)',
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: 'var(--fs-card-heading)', fontWeight: 700, color: '#f8fafc' }}>
            3D Virtual Energy Network
          </span>
          <span style={{
            fontSize: 'var(--fs-badge)',
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: '4px',
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            color: '#38bdf8',
          }}>
            INTERACTIVE
          </span>
          {effectiveFeederOutage !== 'none' && (
            <span style={{
              fontSize: 'var(--fs-badge)',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '4px',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#f87171',
              animation: 'pulse-glow 2s ease-in-out infinite',
            }}>
              ⚠ OUTAGE ACTIVE
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{
            fontSize: '15px',
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 600,
            color: '#cbd5e1',
          }}>
            {String(currentHour).padStart(2, '0')}:00
          </span>
          {outageStats.affectedCount > 0 && (
            <span style={{
              fontSize: '14px',
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600,
              color: '#f87171',
            }}>
              {outageStats.affectedCount} bldg affected · {Math.round(outageStats.unmetTotal)} kW unmet
            </span>
          )}
        </div>
      </div>

      {/* 3D Scene */}
      <NetworkScene3D
        buildings={buildings}
        buildingStates={buildingStates}
        connections={connections}
        bessState={bessState}
        substationPos={SUBSTATION_POS}
        bessPos={BESS_POS}
        controls={controls}
        selectedBuildingId={selectedBuildingId}
        onSelectBuilding={handleSelectBuilding}
        orbitControlsRef={orbitControlsRef}
      />

      {/* Left-side Controls & Legend Stack (Non-overlapping) */}
      <div
        style={{
          position: 'absolute',
          top: 48,
          left: 16,
          bottom: 16,
          width: '230px',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'none',
          maxHeight: 'calc(100% - 64px)',
        }}
      >
        <div style={{ pointerEvents: 'auto', flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <ControlsPanel
            controls={controls}
            onToggle={handleToggle}
            onFeederOutage={handleFeederOutage}
            onResetView={handleResetView}
          />
        </div>

        <div style={{ pointerEvents: 'auto', flex: '0 0 auto' }}>
          <StatusLegend />
        </div>
      </div>

      <BESSInfoPanel state={bessState} visible={controls.showBESS} />

      <BuildingInspector
        selected={selectedBuilding}
        onClose={() => setSelectedBuildingId(null)}
      />
    </div>
  );
};
