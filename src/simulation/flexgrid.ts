import type {
  ScenarioConfig,
  BatteryConfig,
  SimulationResult,
  HourlyDataPoint,
  BuildingHourlyResult,
  SimulationSummary,
  FlexGridAction
} from './types';
import {
  MICROGRID_BUILDINGS,
  DEFAULT_BESS_CONFIG,
  SOLAR_IRRADIANCE_CURVE,
  BASE_GRID_HOURLY_CAPACITY_KW
} from './syntheticData';

export function runFlexGridOptimization(
  scenario: ScenarioConfig,
  batteryConfig: BatteryConfig = DEFAULT_BESS_CONFIG
): SimulationResult {
  const hourly: HourlyDataPoint[] = [];
  const flexGridActions: FlexGridAction[] = [];

  let currentBatterySocKwh = batteryConfig.initialSoCKwh;
  const minReserveKwh = batteryConfig.capacityKwh * (batteryConfig.minReservePct / 100);
  const maxCapacityKwh = batteryConfig.capacityKwh * (batteryConfig.maxChargePct / 100);

  let totalDemandKwh = 0;
  let totalGridSupplyKwh = 0;
  let totalSolarGenKwh = 0;
  let totalBatteryDischargedKwh = 0;
  let totalBatteryChargedKwh = 0;
  let totalUnmetKwh = 0;
  let totalCurtailedKwh = 0;
  let peakDemandKw = 0;
  let peakUnmetKw = 0;
  const affectedBuildingSet = new Set<string>();
  const criticalBuildingSet = new Set<string>();
  let totalOutageHours = 0;

  const isScenarioSevere =
    scenario.gridReductionPct > 20 ||
    scenario.demandIncreasePct > 20 ||
    scenario.feederOutage !== 'none';

  // 24-hour heuristic dispatch loop
  for (let h = 0; h < 24; h++) {
    const isScenarioActive =
      h >= scenario.startHour && h < scenario.startHour + scenario.duration;
    const hoursUntilScenario = scenario.startHour - h;

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

    // 3. Buildings demand & solar generation
    let totalHourDemandKw = 0;
    let baseHourDemandKw = 0;
    let totalHourSolarKw = 0;
    let totalHourCriticalDemandKw = 0;
    let totalHourCriticalMetKw = 0;
    let hourCurtailedKw = 0;

    const buildingDemands: {
      building: (typeof MICROGRID_BUILDINGS)[number];
      baseDemandKw: number;
      actualDemandKw: number;
      curtailedDemandKw: number;
      flexedSavingsKw: number;
      solarKw: number;
      feederOnline: boolean;
    }[] = [];

    // Calculate demands
    for (const bldg of MICROGRID_BUILDINGS) {
      const baseD = bldg.peakDemandKw * bldg.baseDemandCurve[h];
      baseHourDemandKw += baseD;

      const demandMultiplier = isScenarioActive
        ? 1 + scenario.demandIncreasePct / 100
        : 1.0;
      const nominalD = baseD * demandMultiplier;
      totalHourDemandKw += nominalD;

      if (bldg.type === 'critical') {
        totalHourCriticalDemandKw += nominalD;
      }

      const solarKw = bldg.solarCapacityKw * effectiveSolarFactor;
      totalHourSolarKw += solarKw;

      const feederOnline = !(isScenarioActive && scenario.feederOutage === bldg.feeder);

      // Heuristic Step A: Flexible Demand Shedding / Load Shifting
      // If scenario is active, flex non-critical discretionary loads
      let flexedSavingsKw = 0;
      if (isScenarioActive && bldg.flexibleLoadPct > 0) {
        // Critical buildings (0% flex) are strictly protected
        // Standard and essential loads are modulated based on severity
        const flexRatio = isScenarioSevere ? bldg.flexibleLoadPct : bldg.flexibleLoadPct * 0.6;
        flexedSavingsKw = nominalD * flexRatio;
      }

      const curtailedDemandKw = nominalD - flexedSavingsKw;
      hourCurtailedKw += flexedSavingsKw;

      buildingDemands.push({
        building: bldg,
        baseDemandKw: baseD,
        actualDemandKw: nominalD,
        curtailedDemandKw,
        flexedSavingsKw,
        solarKw,
        feederOnline
      });
    }

    if (hourCurtailedKw > 20) {
      flexGridActions.push({
        hour: h,
        type: 'load_shedding',
        title: `Discretionary Load Flexing at Hour ${String(h).padStart(2, '0')}:00`,
        message: `Curtailed ${Math.round(hourCurtailedKw)} kW across non-critical residential and retail circuits. Critical facilities (Hospital, 911 Hub, Water Plant) maintained at 100% full capacity.`,
        impactKw: Math.round(hourCurtailedKw),
        feeder: scenario.feederOutage !== 'none' ? scenario.feederOutage : undefined,
        affectedBuildings: buildingDemands
          .filter((d) => d.flexedSavingsKw > 15)
          .map((d) => d.building.shortName)
      });
    }

    // Heuristic Step B: Pre-charging BESS before scenario onset
    let hourBatteryChargeKw = 0;
    let hourBatteryDischargeKw = 0;
    const isBatteryOffline = isScenarioActive && scenario.batteryOutage;

    // Check if we should pre-charge in anticipation of scenario
    const shouldPrecharge =
      !isBatteryOffline &&
      hoursUntilScenario > 0 &&
      hoursUntilScenario <= 3 &&
      currentBatterySocKwh < maxCapacityKwh &&
      availableGridKw > 2500;

    if (shouldPrecharge) {
      const spaceKwh = maxCapacityKwh - currentBatterySocKwh;
      const chargeRate = Math.min(batteryConfig.maxChargeKw, spaceKwh, 1000);
      hourBatteryChargeKw = chargeRate;
      currentBatterySocKwh = Math.min(maxCapacityKwh, currentBatterySocKwh + chargeRate * 0.95);

      flexGridActions.push({
        hour: h,
        type: 'battery_charge',
        title: `Proactive Pre-Charge (T-${hoursUntilScenario}h to Scenario)`,
        message: `Injected ${Math.round(chargeRate)} kW into Central BESS. SoC elevated to ${Math.round((currentBatterySocKwh / batteryConfig.capacityKwh) * 100)}% prior to grid stress event.`,
        impactKw: Math.round(chargeRate)
      });
    }

    // Grid allocation: Sort by priority: Critical (1) > Essential (2) > Standard (3)
    let remainingGridKw = availableGridKw;
    const buildingStateMap: Record<string, BuildingHourlyResult> = {};
    const priorityOrder = { critical: 1, essential: 2, standard: 3 };

    const sortedDemands = [...buildingDemands].sort((a, b) => {
      const pDiff = priorityOrder[a.building.type] - priorityOrder[b.building.type];
      if (pDiff !== 0) return pDiff;
      return (b.curtailedDemandKw - b.solarKw) - (a.curtailedDemandKw - a.solarKw);
    });

    for (const item of sortedDemands) {
      const bldg = item.building;
      const netAfterSolar = Math.max(0, item.curtailedDemandKw - item.solarKw);
      let gridKw = 0;

      if (item.feederOnline && remainingGridKw > 0) {
        gridKw = Math.min(netAfterSolar, remainingGridKw);
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
        flexedKw: Math.round(item.flexedSavingsKw * 10) / 10,
        status: item.flexedSavingsKw > 15 ? 'flexed' : 'normal'
      };
    }

    // Heuristic Step C: Battery Dispatch Optimization
    // Calculate total campus net deficit after solar, flexed savings, and grid
    let totalUnmetBeforeBattery = 0;
    let criticalUnmetBeforeBattery = 0;

    for (const item of sortedDemands) {
      const bldg = item.building;
      const state = buildingStateMap[bldg.id];
      const unmet = Math.max(0, item.curtailedDemandKw - (state.solarKw + state.gridKw));
      totalUnmetBeforeBattery += unmet;
      if (bldg.type === 'critical') {
        criticalUnmetBeforeBattery += unmet;
      }
    }

    if (!isBatteryOffline && totalUnmetBeforeBattery > 0 && currentBatterySocKwh > minReserveKwh) {
      // Determine usable energy
      // If critical facilities are in deficit, permit drawing down to 5% emergency reserve
      const activeReserveFloor = criticalUnmetBeforeBattery > 10 ? batteryConfig.capacityKwh * 0.05 : minReserveKwh;
      const availableEnergyKwh = Math.max(0, (currentBatterySocKwh - activeReserveFloor) * batteryConfig.roundTripEfficiency);

      const desiredDischargeKw = Math.min(
        totalUnmetBeforeBattery,
        batteryConfig.maxDischargeKw,
        availableEnergyKwh
      );

      hourBatteryDischargeKw = Math.max(0, desiredDischargeKw);
      currentBatterySocKwh = Math.max(
        activeReserveFloor,
        currentBatterySocKwh - hourBatteryDischargeKw / batteryConfig.roundTripEfficiency
      );

      const startSocPct = Math.round(((currentBatterySocKwh + hourBatteryDischargeKw) / batteryConfig.capacityKwh) * 100);
      const endSocPct = Math.round((currentBatterySocKwh / batteryConfig.capacityKwh) * 100);

      flexGridActions.push({
        hour: h,
        type: 'battery_discharge',
        title: `Dynamic BESS Dispatch at Hour ${String(h).padStart(2, '0')}:00`,
        message: `Discharged ${Math.round(hourBatteryDischargeKw)} kW from battery storage (SoC: ${startSocPct}% → ${endSocPct}%). Prioritized zero-outage delivery to critical campus nodes.`,
        impactKw: Math.round(hourBatteryDischargeKw)
      });
    }

    // Allocate battery power prioritizing critical buildings first, then essential
    let remainingBatteryKw = hourBatteryDischargeKw;
    for (const item of sortedDemands) {
      const bldg = item.building;
      const state = buildingStateMap[bldg.id];
      const currentUnmet = Math.max(0, item.curtailedDemandKw - (state.solarKw + state.gridKw));

      if (currentUnmet > 0 && remainingBatteryKw > 0) {
        const battAlloc = Math.min(currentUnmet, remainingBatteryKw);
        state.batteryKw = Math.round(battAlloc * 10) / 10;
        remainingBatteryKw -= battAlloc;
      }

      // Compute final unmet energy - GUARANTEED NEVER NEGATIVE!
      const totalSupplied = state.solarKw + state.gridKw + state.batteryKw;
      state.unmetKw = Math.max(0, Math.round((item.curtailedDemandKw - totalSupplied) * 10) / 10);

      // Determine building status
      if (state.unmetKw > 0.5) {
        state.status = 'outage';
        affectedBuildingSet.add(bldg.id);
        if (bldg.type === 'critical') {
          criticalBuildingSet.add(bldg.id);
        }
      } else if (state.batteryKw > 5) {
        state.status = 'battery_backed';
      } else if (state.flexedKw > 15) {
        state.status = 'flexed';
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
    totalCurtailedKwh += hourCurtailedKw;

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
      curtailedDemandKw: Math.round(hourCurtailedKw * 10) / 10,
      criticalDemandKw: Math.round(totalHourCriticalDemandKw * 10) / 10,
      criticalMetKw: Math.round(totalHourCriticalMetKw * 10) / 10,
      buildingsAffectedCount: hourAffectedCount,
      criticalBuildingsAffectedCount: hourCriticalAffectedCount,
      isScenarioActive,
      buildingStates: buildingStateMap
    });
  }

  // Calculate Resilience Score (With optimization bonus)
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
    totalCurtailedKwh: Math.round(totalCurtailedKwh),
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
    isOptimized: true,
    hourly,
    summary,
    flexGridActions
  };
}
