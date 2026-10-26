/**
 * 3D Network Map - Type Definitions
 * Defines all interfaces for the 3D virtual energy network map.
 */

import type { FeederId, BuildingType, BuildingStatus } from '../simulation/types';

/** 3D position in the scene */
export interface Position3D {
  x: number;
  y: number;
  z: number;
}

/** Shape type for procedural building geometry */
export type BuildingShape =
  | 'substation'
  | 'datacenter'
  | 'university'
  | 'hospital'
  | 'emergency'
  | 'residential'
  | 'commercial'
  | 'tower'
  | 'water'
  | 'coldStorage'
  | 'evStation'
  | 'bess'
  | 'civic';

/** Energy status for visual color coding */
export type EnergyStatus = 'normal' | 'battery_backed' | 'flexed' | 'outage';

/** Status color mapping */
export const STATUS_COLORS: Record<EnergyStatus, string> = {
  normal: '#10b981',       // Green
  battery_backed: '#38bdf8', // Blue/Cyan
  flexed: '#f59e0b',       // Orange
  outage: '#ef4444',        // Red
};

/** Feeder group color mapping */
export const FEEDER_COLORS: Record<FeederId | 'bess-intertie', string> = {
  'feeder-a': '#38bdf8',    // Cyan
  'feeder-b': '#10b981',    // Green
  'feeder-c': '#a855f7',    // Purple
  'bess-intertie': '#e879f9', // Pink/magenta for BESS trunk
};

/** Building definition for the 3D scene */
export interface Building3D {
  id: string;
  name: string;
  shortName: string;
  type: BuildingType;
  feeder: FeederId;
  shape: BuildingShape;
  position: Position3D;
  width: number;
  depth: number;
  height: number;
  peakDemandKw: number;
  solarCapacityKw: number;
  localBatteryKwh: number;
}

/** Runtime state for a building in the 3D scene */
export interface BuildingState3D {
  buildingId: string;
  demandKw: number;
  solarKw: number;
  gridKw: number;
  batteryKw: number;
  unmetKw: number;
  flexedKw: number;
  status: BuildingStatus;
  energyStatus: EnergyStatus;
  isConnectedToGrid: boolean;
}

/** Network connection (power line) between nodes */
export interface NetworkConnection {
  id: string;
  feederId: FeederId | 'bess-intertie';
  fromId: string;
  toId: string;
  from: Position3D;
  to: Position3D;
  waypoints: Position3D[];
  color: string;
  isActive: boolean;
  isVerified: boolean;
}

/** BESS (Battery Energy Storage System) state */
export interface BESSState {
  socKwh: number;
  socPct: number;
  capacityKwh: number;
  maxChargeKw: number;
  maxDischargeKw: number;
  isCharging: boolean;
  isDischarging: boolean;
  currentPowerKw: number;
  isOnline: boolean;
}

/** UI filter/toggle state */
export interface MapControls {
  showFeederA: boolean;
  showFeederB: boolean;
  showFeederC: boolean;
  showPowerFlow: boolean;
  showSolarAssets: boolean;
  showBESS: boolean;
  showOutageHighlights: boolean;
  filterCritical: boolean;
  filterInOutage: boolean;
  filterBatteryBacked: boolean;
  feederOutage: 'none' | FeederId;
}

/** Selected building info for the inspector panel */
export interface SelectedBuilding {
  building: Building3D;
  state: BuildingState3D;
}
