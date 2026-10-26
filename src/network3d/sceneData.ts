/**
 * 3D Network Map - Deterministic Scene Data
 * Provides building positions, network connections, and BESS config
 * for the 3D virtual energy network map.
 */

import type { Building3D, NetworkConnection, Position3D, BESSState, BuildingState3D, EnergyStatus } from './types';
import type { BuildingHourlyResult, FeederId, HourlyDataPoint } from '../simulation/types';
import { FEEDER_COLORS } from './types';
import { MICROGRID_BUILDINGS, FEEDERS, DEFAULT_BESS_CONFIG } from '../simulation/syntheticData';

// --- Substation & BESS Positions ---
export const SUBSTATION_POS: Position3D = { x: 0, y: 0, z: -18 };
export const BESS_POS: Position3D = { x: 0, y: 0, z: 18 };

// --- Building 3D Layout ---
// Arranged in a city-like grid around the central substation
const BUILDING_POSITIONS: Record<string, { pos: Position3D; w: number; d: number; h: number; shape: string }> = {
  'bldg-datacenter':   { pos: { x: -14, y: 0, z: -10 }, w: 3.8, d: 3.2, h: 5.0, shape: 'datacenter' },
  'bldg-science':      { pos: { x: -5,  y: 0, z: -10 }, w: 3.6, d: 2.8, h: 6.5, shape: 'university' },
  'bldg-commercial':   { pos: { x: 5,   y: 0, z: -10 }, w: 4.2, d: 3.2, h: 3.5, shape: 'commercial' },
  'bldg-ev-hub':       { pos: { x: 14,  y: 0, z: -10 }, w: 3.6, d: 2.6, h: 2.2, shape: 'evStation' },
  'bldg-res-alpha':    { pos: { x: -14, y: 0, z: 0 },   w: 3.2, d: 2.8, h: 5.5, shape: 'residential' },
  'bldg-res-beta':     { pos: { x: -14, y: 0, z: 8 },   w: 3.4, d: 2.8, h: 6.0, shape: 'residential' },
  'bldg-water':        { pos: { x: -7,  y: 0, z: 8 },   w: 4.0, d: 3.0, h: 2.8, shape: 'water' },
  'bldg-cold-storage': { pos: { x: 7,   y: 0, z: 8 },   w: 3.6, d: 2.6, h: 3.2, shape: 'coldStorage' },
  'bldg-hospital':     { pos: { x: 14,  y: 0, z: -2 },  w: 4.4, d: 3.4, h: 7.0, shape: 'hospital' },
  'bldg-911':          { pos: { x: 14,  y: 0, z: 6 },   w: 2.8, d: 2.4, h: 4.0, shape: 'emergency' },
  'bldg-civic':        { pos: { x: 7,   y: 0, z: 0 },   w: 3.4, d: 2.6, h: 4.2, shape: 'civic' },
  'bldg-techpark':     { pos: { x: -5,  y: 0, z: 0 },   w: 3.4, d: 3.0, h: 9.5, shape: 'tower' },
};

/**
 * Convert simulation building data to 3D building definitions.
 */
export function getBuildings3D(): Building3D[] {
  return MICROGRID_BUILDINGS.map((bldg) => {
    const layout = BUILDING_POSITIONS[bldg.id];
    if (!layout) {
      return {
        id: bldg.id,
        name: bldg.name,
        shortName: bldg.shortName,
        type: bldg.type,
        feeder: bldg.feeder,
        shape: 'commercial' as const,
        position: { x: 0, y: 0, z: 0 },
        width: 3,
        depth: 3,
        height: 4,
        peakDemandKw: bldg.peakDemandKw,
        solarCapacityKw: bldg.solarCapacityKw,
        localBatteryKwh: bldg.localBatteryKwh,
      };
    }
    return {
      id: bldg.id,
      name: bldg.name,
      shortName: bldg.shortName,
      type: bldg.type,
      feeder: bldg.feeder,
      shape: layout.shape as Building3D['shape'],
      position: layout.pos,
      width: layout.w,
      depth: layout.d,
      height: layout.h,
      peakDemandKw: bldg.peakDemandKw,
      solarCapacityKw: bldg.solarCapacityKw,
      localBatteryKwh: bldg.localBatteryKwh,
    };
  });
}

/**
 * Compute building states from simulation hourly data for the 3D scene.
 */
export function computeBuildingStates(
  hourlyData: HourlyDataPoint,
  feederOutage: 'none' | FeederId
): Record<string, BuildingState3D> {
  const states: Record<string, BuildingState3D> = {};

  for (const bldg of MICROGRID_BUILDINGS) {
    const simState: BuildingHourlyResult | undefined = hourlyData.buildingStates[bldg.id];
    const isFeederOff = feederOutage === bldg.feeder;

    let energyStatus: EnergyStatus = 'normal';
    let isConnectedToGrid = true;

    if (simState) {
      if (isFeederOff) {
        isConnectedToGrid = false;
        // With feeder off, only local solar + battery remain
        const localSupply = simState.solarKw + simState.batteryKw;
        const unmet = Math.max(0, simState.demandKw - localSupply);
        if (unmet > 0.5) {
          energyStatus = 'outage';
        } else if (simState.batteryKw > 5) {
          energyStatus = 'battery_backed';
        }
      } else {
        if (simState.unmetKw > 0.5) {
          energyStatus = 'outage';
        } else if (simState.status === 'battery_backed') {
          energyStatus = 'battery_backed';
        } else if (simState.status === 'flexed') {
          energyStatus = 'flexed';
        }
      }

      states[bldg.id] = {
        buildingId: bldg.id,
        demandKw: simState.demandKw,
        solarKw: simState.solarKw,
        gridKw: isFeederOff ? 0 : simState.gridKw,
        batteryKw: simState.batteryKw,
        unmetKw: isFeederOff
          ? Math.max(0, simState.demandKw - simState.solarKw - simState.batteryKw)
          : simState.unmetKw,
        flexedKw: simState.flexedKw,
        status: simState.status,
        energyStatus,
        isConnectedToGrid,
      };
    } else {
      states[bldg.id] = {
        buildingId: bldg.id,
        demandKw: 0,
        solarKw: 0,
        gridKw: 0,
        batteryKw: 0,
        unmetKw: 0,
        flexedKw: 0,
        status: 'normal',
        energyStatus: 'normal',
        isConnectedToGrid: !isFeederOff,
      };
    }
  }

  return states;
}

/**
 * Generate network connection lines between substation and buildings.
 */
export function getNetworkConnections(feederOutage: 'none' | FeederId): NetworkConnection[] {
  const connections: NetworkConnection[] = [];

  for (const feeder of FEEDERS) {
    const isSevered = feederOutage === feeder.id;
    const color = isSevered ? '#ef4444' : FEEDER_COLORS[feeder.id];

    for (const bldgId of feeder.buildingIds) {
      const layout = BUILDING_POSITIONS[bldgId];
      if (!layout) continue;

      const bldgPos = layout.pos;
      // Create waypoints: substation -> vertical segment -> horizontal segment -> building
      const midZ = (SUBSTATION_POS.z + bldgPos.z) / 2;

      connections.push({
        id: `conn-${feeder.id}-${bldgId}`,
        feederId: feeder.id,
        fromId: 'substation',
        toId: bldgId,
        from: { ...SUBSTATION_POS, y: 0.15 },
        to: { ...bldgPos, y: 0.15 },
        waypoints: [
          { ...SUBSTATION_POS, y: 0.15 },
          { x: SUBSTATION_POS.x, y: 0.15, z: midZ },
          { x: bldgPos.x, y: 0.15, z: midZ },
          { ...bldgPos, y: 0.15 },
        ],
        color,
        isActive: !isSevered,
        isVerified: feeder.id !== 'feeder-c', // feeder-c is "modeled", not verified
      });
    }
  }

  // BESS trunk line
  connections.push({
    id: 'conn-bess-trunk',
    feederId: 'bess-intertie',
    fromId: 'substation',
    toId: 'bess',
    from: { ...SUBSTATION_POS, y: 0.15 },
    to: { ...BESS_POS, y: 0.15 },
    waypoints: [
      { ...SUBSTATION_POS, y: 0.15 },
      { x: 0, y: 0.15, z: 0 },
      { ...BESS_POS, y: 0.15 },
    ],
    color: FEEDER_COLORS['bess-intertie'],
    isActive: true,
    isVerified: true,
  });

  return connections;
}

/**
 * Compute BESS state from simulation data.
 */
export function computeBESSState(hourlyData: HourlyDataPoint, batteryOutage: boolean): BESSState {
  const isOnline = !batteryOutage;

  return {
    socKwh: hourlyData.batterySocKwh,
    socPct: hourlyData.batterySocPct,
    capacityKwh: DEFAULT_BESS_CONFIG.capacityKwh,
    maxChargeKw: DEFAULT_BESS_CONFIG.maxChargeKw,
    maxDischargeKw: DEFAULT_BESS_CONFIG.maxDischargeKw,
    isCharging: hourlyData.batteryChargeKw > 5,
    isDischarging: hourlyData.batteryDischargeKw > 5,
    currentPowerKw: hourlyData.batteryDischargeKw > 5
      ? hourlyData.batteryDischargeKw
      : hourlyData.batteryChargeKw > 5
        ? -hourlyData.batteryChargeKw
        : 0,
    isOnline,
  };
}
