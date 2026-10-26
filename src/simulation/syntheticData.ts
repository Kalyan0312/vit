import type { BuildingDefinition, FeederDefinition, BatteryConfig, ScenarioConfig } from './types';

// Normalized 24-hour load shapes (0 to 23 hours)
const RESIDENTIAL_CURVE = [
  0.35, 0.30, 0.28, 0.26, 0.28, 0.38, 0.65, 0.88, 0.82, 0.60,
  0.52, 0.48, 0.47, 0.46, 0.48, 0.55, 0.70, 0.92, 1.00, 0.95,
  0.85, 0.70, 0.52, 0.40
];

const COMMERCIAL_CURVE = [
  0.20, 0.18, 0.18, 0.18, 0.22, 0.32, 0.55, 0.78, 0.92, 0.98,
  1.00, 0.99, 0.95, 0.97, 0.96, 0.90, 0.82, 0.65, 0.45, 0.35,
  0.28, 0.25, 0.22, 0.20
];

const HOSPITAL_CURVE = [
  0.72, 0.70, 0.68, 0.68, 0.70, 0.75, 0.82, 0.89, 0.95, 0.98,
  1.00, 0.99, 0.97, 0.98, 0.99, 0.96, 0.92, 0.88, 0.85, 0.82,
  0.80, 0.78, 0.75, 0.73
];

const DATACENTER_CURVE = [
  0.88, 0.87, 0.86, 0.86, 0.87, 0.88, 0.90, 0.92, 0.95, 0.97,
  0.98, 0.99, 1.00, 1.00, 0.99, 0.98, 0.96, 0.94, 0.92, 0.91,
  0.90, 0.90, 0.89, 0.88
];

const WATER_PUMPING_CURVE = [
  0.90, 0.95, 0.95, 0.90, 0.75, 0.50, 0.40, 0.45, 0.50, 0.60,
  0.65, 0.60, 0.55, 0.50, 0.55, 0.60, 0.70, 0.75, 0.80, 0.85,
  0.90, 0.95, 0.92, 0.90
];

const UNIVERSITY_CURVE = [
  0.25, 0.22, 0.20, 0.20, 0.22, 0.30, 0.50, 0.75, 0.90, 0.96,
  1.00, 0.98, 0.92, 0.94, 0.96, 0.92, 0.80, 0.60, 0.45, 0.38,
  0.32, 0.28, 0.26, 0.25
];

// Solar irradiance factor (0..1) across 24 hours
export const SOLAR_IRRADIANCE_CURVE = [
  0.0, 0.0, 0.0, 0.0, 0.0, 0.02, 0.12, 0.32, 0.58, 0.80,
  0.94, 1.00, 0.98, 0.92, 0.78, 0.58, 0.34, 0.14, 0.03, 0.0,
  0.0, 0.0, 0.0, 0.0
];

// Available base grid capacity from the regional substation feeder in normal conditions (kW)
export const BASE_GRID_HOURLY_CAPACITY_KW = [
  3800, 3800, 3800, 3800, 3800, 3900, 4200, 4400, 4600, 4700,
  4800, 4800, 4800, 4700, 4700, 4600, 4600, 4500, 4400, 4300,
  4200, 4000, 3900, 3800
];

// 12 Microgrid Buildings on 3 Feeder lines
export const MICROGRID_BUILDINGS: BuildingDefinition[] = [
  {
    id: 'bldg-hospital',
    name: 'Metro General Hospital & Trauma Center',
    shortName: 'Metro Hospital',
    type: 'critical',
    feeder: 'feeder-c',
    peakDemandKw: 450,
    baseDemandCurve: HOSPITAL_CURVE,
    solarCapacityKw: 160,
    localBatteryKwh: 400,
    flexibleLoadPct: 0.0, // Critical: 0% curtailment permitted
    coordinates: { x: 580, y: 120, width: 140, height: 95, label: 'Hospital', shape: 'hospital' }
  },
  {
    id: 'bldg-911',
    name: 'Regional Emergency Dispatch 911 Hub',
    shortName: '911 Emergency',
    type: 'critical',
    feeder: 'feeder-c',
    peakDemandKw: 210,
    baseDemandCurve: DATACENTER_CURVE,
    solarCapacityKw: 90,
    localBatteryKwh: 250,
    flexibleLoadPct: 0.0, // Critical: 0% curtailment
    coordinates: { x: 740, y: 140, width: 110, height: 80, label: '911 Dispatch', shape: 'datacenter' }
  },
  {
    id: 'bldg-water',
    name: 'Municipal Water Treatment & Pumping Plant',
    shortName: 'Water Plant',
    type: 'critical',
    feeder: 'feeder-b',
    peakDemandKw: 320,
    baseDemandCurve: WATER_PUMPING_CURVE,
    solarCapacityKw: 75,
    localBatteryKwh: 150,
    flexibleLoadPct: 0.05, // Only tiny shiftable buffer
    coordinates: { x: 120, y: 380, width: 130, height: 90, label: 'Water Facility', shape: 'water' }
  },
  {
    id: 'bldg-datacenter',
    name: 'Apex Tier-IV Cloud Data Center',
    type: 'critical',
    shortName: 'Apex Data Center',
    feeder: 'feeder-a',
    peakDemandKw: 680,
    baseDemandCurve: DATACENTER_CURVE,
    solarCapacityKw: 220,
    localBatteryKwh: 500,
    flexibleLoadPct: 0.08, // Server load can shift slightly
    coordinates: { x: 260, y: 80, width: 135, height: 90, label: 'Data Center', shape: 'datacenter' }
  },
  {
    id: 'bldg-science',
    name: 'City University Science & Genomics Hub',
    shortName: 'Science Hub',
    type: 'essential',
    feeder: 'feeder-a',
    peakDemandKw: 420,
    baseDemandCurve: UNIVERSITY_CURVE,
    solarCapacityKw: 310, // Large rooftop solar array
    localBatteryKwh: 200,
    flexibleLoadPct: 0.25,
    coordinates: { x: 415, y: 95, width: 125, height: 85, label: 'University Hub', shape: 'university' }
  },
  {
    id: 'bldg-civic',
    name: 'Civic Center & Community Refuge Shelter',
    shortName: 'Civic Shelter',
    type: 'essential',
    feeder: 'feeder-c',
    peakDemandKw: 260,
    baseDemandCurve: COMMERCIAL_CURVE,
    solarCapacityKw: 110,
    localBatteryKwh: 180,
    flexibleLoadPct: 0.20,
    coordinates: { x: 670, y: 260, width: 120, height: 85, label: 'Civic Center', shape: 'commercial' }
  },
  {
    id: 'bldg-cold-storage',
    name: 'Harbor Logistics & Cold Food Storage',
    shortName: 'Cold Storage',
    type: 'essential',
    feeder: 'feeder-b',
    peakDemandKw: 360,
    baseDemandCurve: COMMERCIAL_CURVE,
    solarCapacityKw: 190,
    localBatteryKwh: 120,
    flexibleLoadPct: 0.22,
    coordinates: { x: 280, y: 400, width: 125, height: 80, label: 'Cold Storage', shape: 'commercial' }
  },
  {
    id: 'bldg-techpark',
    name: 'Silicon Quay Innovation Tech Park',
    shortName: 'Tech Park',
    type: 'essential',
    feeder: 'feeder-c',
    peakDemandKw: 520,
    baseDemandCurve: COMMERCIAL_CURVE,
    solarCapacityKw: 260,
    localBatteryKwh: 180,
    flexibleLoadPct: 0.28,
    coordinates: { x: 530, y: 270, width: 120, height: 85, label: 'Tech Park', shape: 'tower' }
  },
  {
    id: 'bldg-res-alpha',
    name: 'Pinecrest Residential Complex Alpha (350 Units)',
    shortName: 'Res. Alpha',
    type: 'standard',
    feeder: 'feeder-b',
    peakDemandKw: 340,
    baseDemandCurve: RESIDENTIAL_CURVE,
    solarCapacityKw: 120,
    localBatteryKwh: 80,
    flexibleLoadPct: 0.35, // Residential AC / appliances flex
    coordinates: { x: 120, y: 240, width: 115, height: 80, label: 'Res. Alpha', shape: 'residential' }
  },
  {
    id: 'bldg-res-beta',
    name: 'Lakeside Heights Residential Beta (420 Units)',
    shortName: 'Res. Beta',
    type: 'standard',
    feeder: 'feeder-b',
    peakDemandKw: 390,
    baseDemandCurve: RESIDENTIAL_CURVE,
    solarCapacityKw: 110,
    localBatteryKwh: 60,
    flexibleLoadPct: 0.35,
    coordinates: { x: 265, y: 250, width: 120, height: 80, label: 'Res. Beta', shape: 'residential' }
  },
  {
    id: 'bldg-commercial',
    name: 'Grand Horizon Commercial Mall & Retail',
    shortName: 'Retail Plaza',
    type: 'standard',
    feeder: 'feeder-a',
    peakDemandKw: 480,
    baseDemandCurve: COMMERCIAL_CURVE,
    solarCapacityKw: 140,
    localBatteryKwh: 0,
    flexibleLoadPct: 0.40, // Non-essential lighting & AC curtailment
    coordinates: { x: 420, y: 220, width: 120, height: 85, label: 'Retail Plaza', shape: 'commercial' }
  },
  {
    id: 'bldg-ev-hub',
    name: 'Central Transit Depot & Rapid EV Charging Station',
    shortName: 'EV Depot',
    type: 'standard',
    feeder: 'feeder-a',
    peakDemandKw: 350,
    baseDemandCurve: COMMERCIAL_CURVE,
    solarCapacityKw: 130,
    localBatteryKwh: 100,
    flexibleLoadPct: 0.45, // EV charging easily delayed
    coordinates: { x: 430, y: 350, width: 125, height: 80, label: 'EV Station', shape: 'commercial' }
  }
];

export const FEEDERS: FeederDefinition[] = [
  {
    id: 'feeder-a',
    name: 'Feeder A (Tech & Commercial District)',
    capacityKw: 2200,
    color: '#38bdf8', // Cyan
    buildingIds: ['bldg-datacenter', 'bldg-science', 'bldg-commercial', 'bldg-ev-hub']
  },
  {
    id: 'feeder-b',
    name: 'Feeder B (Residential & Water Utilities)',
    capacityKw: 1800,
    color: '#10b981', // Emerald
    buildingIds: ['bldg-water', 'bldg-res-alpha', 'bldg-res-beta', 'bldg-cold-storage']
  },
  {
    id: 'feeder-c',
    name: 'Feeder C (Medical, Emergency & Civic Campus)',
    capacityKw: 2000,
    color: '#818cf8', // Indigo / Iris
    buildingIds: ['bldg-hospital', 'bldg-911', 'bldg-civic', 'bldg-techpark']
  }
];

// Central Battery Energy Storage System (BESS)
export const DEFAULT_BESS_CONFIG: BatteryConfig = {
  capacityKwh: 4500,
  initialSoCKwh: 2700,        // 60% initial SoC
  maxChargeKw: 1200,
  maxDischargeKw: 1500,
  minReservePct: 15,          // 15% emergency reserve for critical services
  maxChargePct: 95,
  roundTripEfficiency: 0.92
};

// Default Baseline Scenario (No disruptions)
export const BASELINE_SCENARIO: ScenarioConfig = {
  name: 'Baseline Operations',
  gridReductionPct: 0,
  solarReductionPct: 0,
  demandIncreasePct: 0,
  batteryOutage: false,
  feederOutage: 'none',
  startHour: 11,
  duration: 6
};

// Preset stress scenarios
export const PRESET_SCENARIOS: { label: string; description: string; scenario: ScenarioConfig }[] = [
  {
    label: 'Baseline (Clear Sky Normal)',
    description: 'Optimal grid operation with normal 24-hour demand and full renewable generation.',
    scenario: { ...BASELINE_SCENARIO }
  },
  {
    label: 'Summer Heatwave Demand Spike',
    description: '35% HVAC demand surge with 25% regional grid curtailment during peak hours (12:00 - 18:00).',
    scenario: {
      name: 'Summer Heatwave Spike',
      gridReductionPct: 25,
      solarReductionPct: 0,
      demandIncreasePct: 35,
      batteryOutage: false,
      feederOutage: 'none',
      startHour: 12,
      duration: 6
    }
  },
  {
    label: 'Feeder B Severed / Residential Trip',
    description: 'Physical tree strike cuts Feeder B for 8 hours (10:00 - 18:00), testing microgrid isolation on water & residential loads.',
    scenario: {
      name: 'Feeder B Trip',
      gridReductionPct: 15,
      solarReductionPct: 10,
      demandIncreasePct: 10,
      batteryOutage: false,
      feederOutage: 'feeder-b',
      startHour: 10,
      duration: 8
    }
  },
  {
    label: 'Severe Substation Outage & Storm',
    description: '70% grid blackout combined with dense cloud cover (-85% solar) from 14:00 to 22:00.',
    scenario: {
      name: 'Substation Collapse & Storm',
      gridReductionPct: 70,
      solarReductionPct: 85,
      demandIncreasePct: 15,
      batteryOutage: false,
      feederOutage: 'none',
      startHour: 14,
      duration: 8
    }
  },
  {
    label: 'BESS Central Battery Failure',
    description: 'Central battery storage inverter trips offline during evening peak (16:00 - 22:00) with 30% grid supply loss.',
    scenario: {
      name: 'BESS Hardware Trip',
      gridReductionPct: 30,
      solarReductionPct: 20,
      demandIncreasePct: 20,
      batteryOutage: true,
      feederOutage: 'none',
      startHour: 16,
      duration: 6
    }
  }
];
