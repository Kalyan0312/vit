export type BuildingType = 'critical' | 'essential' | 'standard';
export type FeederId = 'feeder-a' | 'feeder-b' | 'feeder-c';
export type BuildingStatus = 'normal' | 'flexed' | 'battery_backed' | 'outage';

export interface BuildingCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  shape: 'hospital' | 'tower' | 'residential' | 'datacenter' | 'water' | 'university' | 'commercial';
  lng?: number;
  lat?: number;
  heightMeters?: number;
  minHeightMeters?: number;
  footprintPolygon?: [number, number][];
}

export interface BuildingDefinition {
  id: string;
  name: string;
  shortName: string;
  type: BuildingType;
  feeder: FeederId;
  peakDemandKw: number;
  baseDemandCurve: number[]; // 24 values normalized 0..1 factor
  solarCapacityKw: number;
  localBatteryKwh: number;
  flexibleLoadPct: number; // max percentage of load that can be shed/flexed
  coordinates: BuildingCoordinates;
}

export interface FeederDefinition {
  id: FeederId;
  name: string;
  capacityKw: number;
  color: string;
  buildingIds: string[];
}

export interface ScenarioConfig {
  name: string;
  gridReductionPct: number;       // 0 to 100%
  solarReductionPct: number;      // 0 to 100%
  demandIncreasePct: number;      // 0 to 100%
  batteryOutage: boolean;         // Central BESS down
  feederOutage: 'none' | FeederId;// Feeder completely severed
  startHour: number;              // 0 to 23
  duration: number;               // 1 to 24
}

export interface BatteryConfig {
  capacityKwh: number;            // e.g. 4000
  initialSoCKwh: number;          // e.g. 2400 (60%)
  maxChargeKw: number;            // e.g. 1200
  maxDischargeKw: number;         // e.g. 1500
  minReservePct: number;          // e.g. 10%
  maxChargePct: number;           // e.g. 95%
  roundTripEfficiency: number;    // e.g. 0.92
}

export interface BuildingHourlyResult {
  buildingId: string;
  name: string;
  type: BuildingType;
  feeder: FeederId;
  demandKw: number;
  solarKw: number;
  gridKw: number;
  batteryKw: number;
  unmetKw: number;
  flexedKw: number;
  status: BuildingStatus;
}

export interface HourlyDataPoint {
  hour: number;
  label: string;
  demandKw: number;
  baseDemandKw: number;
  gridSupplyKw: number;
  solarGenKw: number;
  batteryDischargeKw: number;
  batteryChargeKw: number;
  batterySocKwh: number;
  batterySocPct: number;
  unmetDemandKw: number;
  curtailedDemandKw: number;
  criticalDemandKw: number;
  criticalMetKw: number;
  buildingsAffectedCount: number;
  criticalBuildingsAffectedCount: number;
  isScenarioActive: boolean;
  buildingStates: Record<string, BuildingHourlyResult>;
}

export interface FlexGridAction {
  hour: number;
  type: 'battery_discharge' | 'battery_charge' | 'load_shedding' | 'critical_reserve' | 'solar_priority';
  title: string;
  message: string;
  impactKw: number;
  feeder?: FeederId;
  affectedBuildings?: string[];
}

export interface SimulationSummary {
  totalDemandKwh: number;
  totalGridSupplyKwh: number;
  totalSolarGenKwh: number;
  totalBatteryDischargedKwh: number;
  totalBatteryChargedKwh: number;
  totalUnmetKwh: number;
  totalCurtailedKwh: number;
  peakDemandKw: number;
  peakUnmetKw: number;
  resilienceScore: number;       // 0 to 100%
  affectedBuildingsTotal: number;
  criticalBuildingsAffectedTotal: number;
  totalOutageHours: number;
  endBatterySocPct: number;
}

export interface SimulationResult {
  scenario: ScenarioConfig;
  isOptimized: boolean;
  hourly: HourlyDataPoint[];
  summary: SimulationSummary;
  flexGridActions: FlexGridAction[];
}
