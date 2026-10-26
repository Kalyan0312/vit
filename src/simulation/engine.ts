import type {
  ScenarioConfig,
  BatteryConfig,
  SimulationResult,
  HourlyDataPoint,
  BuildingHourlyResult,
  SimulationSummary
} from './types';
import {
  MICROGRID_BUILDINGS,
  DEFAULT_BESS_CONFIG,
  SOLAR_IRRADIANCE_CURVE,
  BASE_GRID_HOURLY_CAPACITY_KW
} from './syntheticData';
import { runFlexGridOptimization } from './flexgrid';

export function runSimulation(
  scenario: ScenarioConfig,
  batteryConfig: BatteryConfig = DEFAULT_BESS_CONFIG,
  isOptimized: boolean = false
): SimulationResult {
  if (isOptimized) {
    return runFlexGridOptimization(scenario, batteryConfig);
  }

  // --- Standard / Unmitigated Simulation Dispatch ---
  const hourly: HourlyDataPoint[] = [];
  let currentBatterySocKwh = batteryConfig.initialSoCKwh;
  const minReserveKwh = batteryConfig.capacityKwh * (batteryConfig.minReservePct / 100);
  const maxCapacityKwh = batteryConfig.capacityKwh * (batteryConfig.maxChargePct / 100);

  let totalDemandKwh = 0;
  let totalGridSupplyKwh = 0;
  let totalSolarGenKwh = 0;
  let totalBatteryDischargedKwh = 0;
  let totalBatteryChargedKwh = 0;
  let totalUnmetKwh = 0;
  let peakDemandKw = 0;
  let peakUnmetKw = 0;
  const affectedBuildingSet = new Set<string>();
  const criticalBuildingSet = new Set<string>();
  let totalOutageHours = 0;

  for (let h = 0; h < 24; h++) {
    const isScenarioActive =
      h >= scenario.startHour && h < scenario.startHour + scenario.duration;

    // 1. Solar irradiance factor
    const solarFactor = SOLAR_IRRADIANCE_CURVE[h];
    const effectiveSolarFactor = isScenarioActive
      ? solarFactor * Math.max(0, 1 - scenario.solarReductionPct / 100)
      : solarFactor;

    // 2. Base Grid Capacity available
    const baseGridCap = BASE_GRID_HOURLY_CAPACITY_KW[h];
    const availableGridKw = isScenarioActive
      ? baseGridCap * Math.max(0, 1 - scenario.gridReductionPct / 100)
      : baseGridCap;

    // 3. Buildings demand & solar generation for this hour
    let totalHourDemandKw = 0;
    let baseHourDemandKw = 0;
    let totalHourSolarKw = 0;
    let totalHourCriticalDemandKw = 0;
    let totalHourCriticalMetKw = 0;

    const buildingDemands: {
      building: (typeof MICROGRID_BUILDINGS)[number];
      baseDemandKw: number;
      actualDemandKw: number;
      solarKw: number;
      netDemandKw: number;
      feederOnline: boolean;
    }[] = [];

    for (const bldg of MICROGRID_BUILDINGS) {
      const baseD = bldg.peakDemandKw * bldg.baseDemandCurve[h];
      baseHourDemandKw += baseD;

      const demandMultiplier = isScenarioActive
        ? 1 + scenario.demandIncreasePct / 100
        : 1.0;
      const actualD = baseD * demandMultiplier;
      totalHourDemandKw += actualD;

      if (bldg.type === 'critical') {
        totalHourCriticalDemandKw += actualD;
      }

      const solarKw = bldg.solarCapacityKw * effectiveSolarFactor;
      totalHourSolarKw += solarKw;

      const feederOnline = !(isScenarioActive && scenario.feederOutage === bldg.feeder);
      const netD = Math.max(0, actualD - solarKw);

      buildingDemands.push({
        building: bldg,
        baseDemandKw: baseD,
        actualDemandKw: actualD,
        solarKw,
        netDemandKw: netD,
        feederOnline
      });
    }

    // 4. Feeder Line Capacity check & allocation
    // Separate by feeder
    let remainingGridKw = availableGridKw;
    const buildingStateMap: Record<string, BuildingHourlyResult> = {};

    // Sort by priority for grid allocation: critical first, essential second, standard third
    const priorityOrder = { critical: 1, essential: 2, standard: 3 };
    const sortedDemands = [...buildingDemands].sort((a, b) => {
      const pDiff = priorityOrder[a.building.type] - priorityOrder[b.building.type];
      if (pDiff !== 0) return pDiff;
      return b.netDemandKw - a.netDemandKw;
    });

    // 5. Grid Allocation to buildings
    for (const item of sortedDemands) {
      const bldg = item.building;
      let gridKw = 0;

      if (item.feederOnline && remainingGridKw > 0) {
        gridKw = Math.min(item.netDemandKw, remainingGridKw);
        remainingGridKw -= gridKw;
      }

      buildingStateMap[bldg.id] = {
        buildingId: bldg.id,
        name: bldg.name,
        type: bldg.type,
        feeder: bldg.feeder,
        demandKw: Math.round(item.actualDemandKw * 10) / 10,
        solarKw: Math.round(item.solarKw * 10) / 10,
        gridKw: Math.round(gridKw * 10) / 10,
        batteryKw: 0,
        unmetKw: 0,
        flexedKw: 0,
        status: 'normal'
      };
    }

    // 6. Central Battery Dispatch (Standard behavior: discharges if deficit, charges if surplus)
    let hourBatteryDischargeKw = 0;
    let hourBatteryChargeKw = 0;
    const isBatteryOffline = isScenarioActive && scenario.batteryOutage;

    // Calculate campus net deficit before battery
    let totalUnmetBeforeBattery = 0;
    for (const bldg of MICROGRID_BUILDINGS) {
      const state = buildingStateMap[bldg.id];
      const unmet = Math.max(0, state.demandKw - (state.solarKw + state.gridKw));
      totalUnmetBeforeBattery += unmet;
    }

    if (!isBatteryOffline && currentBatterySocKwh > minReserveKwh && totalUnmetBeforeBattery > 0) {
      const availableEnergyKwh = (currentBatterySocKwh - minReserveKwh) * batteryConfig.roundTripEfficiency;
      const desiredDischargeKw = Math.min(
        totalUnmetBeforeBattery,
        batteryConfig.maxDischargeKw,
        availableEnergyKwh
      );
      hourBatteryDischargeKw = Math.max(0, desiredDischargeKw);
      currentBatterySocKwh = Math.max(
        minReserveKwh,
        currentBatterySocKwh - hourBatteryDischargeKw / batteryConfig.roundTripEfficiency
      );
    } else if (!isBatteryOffline && remainingGridKw > 200 && currentBatterySocKwh < maxCapacityKwh) {
      // Off-peak charging from remaining grid
      const spaceKwh = maxCapacityKwh - currentBatterySocKwh;
      const chargeRate = Math.min(batteryConfig.maxChargeKw, remainingGridKw * 0.5, spaceKwh);
      hourBatteryChargeKw = Math.max(0, chargeRate);
      currentBatterySocKwh = Math.min(maxCapacityKwh, currentBatterySocKwh + hourBatteryChargeKw * 0.95);
    }

    // Allocate battery discharge to buildings with deficit, prioritizing critical buildings
    let remainingBatteryKw = hourBatteryDischargeKw;
    for (const item of sortedDemands) {
      const bldg = item.building;
      const state = buildingStateMap[bldg.id];
      const currentUnmet = Math.max(0, state.demandKw - (state.solarKw + state.gridKw));

      if (currentUnmet > 0 && remainingBatteryKw > 0) {
        const battAlloc = Math.min(currentUnmet, remainingBatteryKw);
        state.batteryKw = Math.round(battAlloc * 10) / 10;
        remainingBatteryKw -= battAlloc;
      }

      // Compute final unmet energy - NEVER negative!
      const totalSupplied = state.solarKw + state.gridKw + state.batteryKw;
      state.unmetKw = Math.max(0, Math.round((state.demandKw - totalSupplied) * 10) / 10);

      // Determine building status
      if (state.unmetKw > 0.5) {
        state.status = 'outage';
        affectedBuildingSet.add(bldg.id);
        if (bldg.type === 'critical') {
          criticalBuildingSet.add(bldg.id);
        }
      } else if (state.batteryKw > 5) {
        state.status = 'battery_backed';
      } else {
        state.status = 'normal';
      }

      if (bldg.type === 'critical') {
        totalHourCriticalMetKw += state.demandKw - state.unmetKw;
      }
    }

    // Summaries for this hour
    let hourUnmetKw = 0;
    let hourSuppliedGridKw = 0;
    let hourAffectedCount = 0;
    let hourCriticalAffectedCount = 0;

    for (const bldg of MICROGRID_BUILDINGS) {
      const state = buildingStateMap[bldg.id];
      hourUnmetKw += state.unmetKw;
      hourSuppliedGridKw += state.gridKw;
      if (state.status === 'outage') {
        hourAffectedCount++;
        if (state.type === 'critical') {
          hourCriticalAffectedCount++;
        }
      }
    }

    hourUnmetKw = Math.max(0, Math.round(hourUnmetKw * 10) / 10);
    if (hourUnmetKw > 0.5) {
      totalOutageHours++;
    }

    peakDemandKw = Math.max(peakDemandKw, totalHourDemandKw);
    peakUnmetKw = Math.max(peakUnmetKw, hourUnmetKw);

    totalDemandKwh += totalHourDemandKw;
    totalGridSupplyKwh += hourSuppliedGridKw;
    totalSolarGenKwh += totalHourSolarKw;
    totalBatteryDischargedKwh += hourBatteryDischargeKw;
    totalBatteryChargedKwh += hourBatteryChargeKw;
    totalUnmetKwh += hourUnmetKw;

    hourly.push({
      hour: h,
      label: `${String(h).padStart(2, '0')}:00`,
      demandKw: Math.round(totalHourDemandKw * 10) / 10,
      baseDemandKw: Math.round(baseHourDemandKw * 10) / 10,
      gridSupplyKw: Math.round(hourSuppliedGridKw * 10) / 10,
      solarGenKw: Math.round(totalHourSolarKw * 10) / 10,
      batteryDischargeKw: Math.round(hourBatteryDischargeKw * 10) / 10,
      batteryChargeKw: Math.round(hourBatteryChargeKw * 10) / 10,
      batterySocKwh: Math.round(currentBatterySocKwh * 10) / 10,
      batterySocPct: Math.round((currentBatterySocKwh / batteryConfig.capacityKwh) * 100),
      unmetDemandKw: hourUnmetKw,
      curtailedDemandKw: 0,
      criticalDemandKw: Math.round(totalHourCriticalDemandKw * 10) / 10,
      criticalMetKw: Math.round(totalHourCriticalMetKw * 10) / 10,
      buildingsAffectedCount: hourAffectedCount,
      criticalBuildingsAffectedCount: hourCriticalAffectedCount,
      isScenarioActive,
      buildingStates: buildingStateMap
    });
  }

  // Calculate Resilience Score (100% minus penalty for unmet demand and critical impacts)
  const demandFractionMet = totalDemandKwh > 0
    ? Math.max(0, (totalDemandKwh - totalUnmetKwh) / totalDemandKwh)
    : 1.0;
  const criticalPenalty = criticalBuildingSet.size * 5;
  const rawScore = demandFractionMet * 100 - criticalPenalty;
  const resilienceScore = Math.max(0, Math.min(100, Math.round(rawScore * 10) / 10));

  const summary: SimulationSummary = {
    totalDemandKwh: Math.round(totalDemandKwh),
    totalGridSupplyKwh: Math.round(totalGridSupplyKwh),
    totalSolarGenKwh: Math.round(totalSolarGenKwh),
    totalBatteryDischargedKwh: Math.round(totalBatteryDischargedKwh),
    totalBatteryChargedKwh: Math.round(totalBatteryChargedKwh),
    totalUnmetKwh: Math.max(0, Math.round(totalUnmetKwh)),
    totalCurtailedKwh: 0,
    peakDemandKw: Math.round(peakDemandKw),
    peakUnmetKw: Math.round(peakUnmetKw),
    resilienceScore,
    affectedBuildingsTotal: affectedBuildingSet.size,
    criticalBuildingsAffectedTotal: criticalBuildingSet.size,
    totalOutageHours,
    endBatterySocPct: Math.round((currentBatterySocKwh / batteryConfig.capacityKwh) * 100)
  };

  return {
    scenario,
    isOptimized: false,
    hourly,
    summary,
    flexGridActions: []
  };
}
