import { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import type { NavTab } from './components/Sidebar';
import { TopNavbar } from './components/TopNavbar';
import { MetricCards } from './components/MetricCards';
import { GridTwinMap } from './components/GridTwinMap';
import { EnergyAnalytics } from './components/EnergyAnalytics';
import { ScenarioEditor } from './components/ScenarioEditor';
import { FlexGridOptimizer } from './components/FlexGridOptimizer';
import { ResultsComparison } from './components/ResultsComparison';
import { VirtualEnergyMap } from './network3d';
import { runSimulation } from './simulation/engine';
import { BASELINE_SCENARIO, DEFAULT_BESS_CONFIG, PRESET_SCENARIOS } from './simulation/syntheticData';
import type { ScenarioConfig } from './simulation/types';

import { EvaluatorDemoBar, type DemoStage, DEMO_STAGES_INFO } from './components/EvaluatorDemoBar';

export type SimulationStatus = 'IDLE' | 'RUNNING' | 'COMPLETED' | 'ERROR';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('map');
  const [currentHour, setCurrentHour] = useState<number>(13); // Default 1:00 PM (peak solar & active campus)
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isOptimized, setIsOptimized] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simStatus, setSimStatus] = useState<SimulationStatus>('IDLE');
  const [demoStage, setDemoStage] = useState<DemoStage>(1);
  const [simulationNotice, setSimulationNotice] = useState<string | null>(null);

  // Active scenario configuration (starts with Heatwave or Baseline)
  const [scenario, setScenario] = useState<ScenarioConfig>({
    ...PRESET_SCENARIOS[1].scenario // Start with Summer Heatwave Spike for exciting immediate resilience insights!
  });

  // Calculate Simulations
  const baselineResult = useMemo(() => {
    return runSimulation(BASELINE_SCENARIO, DEFAULT_BESS_CONFIG, false);
  }, []);

  const scenarioResult = useMemo(() => {
    return runSimulation(scenario, DEFAULT_BESS_CONFIG, false);
  }, [scenario]);

  const optimizedResult = useMemo(() => {
    return runSimulation(scenario, DEFAULT_BESS_CONFIG, true);
  }, [scenario]);

  // The active result currently viewed
  const activeResult = isOptimized ? optimizedResult : scenarioResult;

  // Check if scenario is modified from pure baseline
  const isScenarioModified =
    scenario.gridReductionPct > 0 ||
    scenario.solarReductionPct > 0 ||
    scenario.demandIncreasePct > 0 ||
    scenario.batteryOutage ||
    scenario.feederOutage !== 'none';

  // Playback timer effect (advances hour every 1.4s)
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentHour((prev) => (prev + 1) % 24);
    }, 1400);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Manual Trigger Simulation
  const handleRunSimulation = (customNotice?: string) => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSimStatus('RUNNING');
    setSimulationNotice(customNotice || 'Executing 24-hour deterministic dispatch simulation...');

    setTimeout(() => {
      try {
        setIsSimulating(false);
        setSimStatus('COMPLETED');
        setSimulationNotice('24h dispatch recalculated (12 buildings, 3 feeders, BESS dispatch)');
        setTimeout(() => {
          setSimulationNotice(null);
          setSimStatus('IDLE');
        }, 3500);
      } catch {
        setIsSimulating(false);
        setSimStatus('ERROR');
        setSimulationNotice('Simulation calculation error encountered');
      }
    }, 600);
  };

  const handleSelectDemoStage = (stage: DemoStage) => {
    setDemoStage(stage);
    const info = DEMO_STAGES_INFO[stage];
    setScenario({ ...info.scenario });
    setCurrentHour(info.hour);
    setIsOptimized(info.isOptimized);
    handleRunSimulation(`Activating ${info.title}...`);
  };

  const handleResetScenario = () => {
    setDemoStage(1);
    setScenario({ ...BASELINE_SCENARIO });
    setCurrentHour(13);
    setIsOptimized(false);
    handleRunSimulation('Restoring Baseline Operations...');
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-space)',
        color: 'var(--text-primary)'
      }}
    >
      {/* Sticky Left Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        result={activeResult}
        onResetScenario={handleResetScenario}
        isScenarioModified={isScenarioModified}
      />

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: '100vh'
        }}
      >
        {/* Top Header Controls Bar */}
        <TopNavbar
          activeTab={activeTab}
          currentHour={currentHour}
          onHourChange={setCurrentHour}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying((p) => !p)}
          isOptimized={isOptimized}
          onToggleOptimized={() => setIsOptimized((opt) => !opt)}
          onRunSimulation={() => handleRunSimulation()}
          isSimulating={isSimulating}
          simStatus={simStatus}
        />

        {/* View Content Body */}
        <main
          style={{
            flex: 1,
            padding: '24px',
            maxWidth: '1440px',
            width: '100%',
            margin: '0 auto',
            boxSizing: 'border-box'
          }}
        >
          {/* Evaluator Live Resilience Demonstration Stepper */}
          <EvaluatorDemoBar
            currentStage={demoStage}
            onSelectStage={handleSelectDemoStage}
            onResetToBaseline={handleResetScenario}
          />

          {/* Running Simulation Progress / Completion Banner */}
          {simulationNotice && (
            <div
              className={isSimulating ? 'sim-banner-running status-animate' : 'status-animate'}
              style={{
                padding: '10px 18px',
                marginBottom: '18px',
                borderRadius: '8px',
                backgroundColor:
                  simStatus === 'ERROR'
                    ? 'rgba(239, 68, 68, 0.12)'
                    : isSimulating
                    ? 'rgba(56, 189, 248, 0.12)'
                    : 'rgba(16, 185, 129, 0.12)',
                border:
                  simStatus === 'ERROR'
                    ? '1px solid rgba(239, 68, 68, 0.4)'
                    : isSimulating
                    ? '1px solid rgba(56, 189, 248, 0.4)'
                    : '1px solid rgba(16, 185, 129, 0.4)',
                color:
                  simStatus === 'ERROR'
                    ? 'var(--accent-coral)'
                    : isSimulating
                    ? 'var(--accent-cyan)'
                    : 'var(--accent-green)',
                fontSize: 'var(--fs-body-sm)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.3s ease',
              }}
            >
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor:
                    simStatus === 'ERROR'
                      ? 'rgba(239, 68, 68, 0.25)'
                      : isSimulating
                      ? 'rgba(56, 189, 248, 0.25)'
                      : 'rgba(16, 185, 129, 0.25)',
                  border: '1px solid currentColor',
                  textTransform: 'uppercase'
                }}
              >
                {simStatus}
              </span>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor:
                    simStatus === 'ERROR'
                      ? 'var(--accent-coral)'
                      : isSimulating
                      ? 'var(--accent-cyan)'
                      : 'var(--accent-green)',
                  boxShadow: '0 0 10px currentColor',
                  animation: isSimulating ? 'pulse-glow 1s infinite ease-in-out' : 'none',
                  flexShrink: 0
                }}
              />
              <span>{simulationNotice}</span>
            </div>
          )}

          {/* Top High-Level Energy Overview KPI Cards */}
          <MetricCards result={activeResult} currentHour={currentHour} />

          {/* Active Navigation Tab View */}
          <div style={{ marginTop: '4px' }}>
            {activeTab === 'map' && (
              <GridTwinMap result={activeResult} currentHour={currentHour} />
            )}

            {activeTab === '3d-map' && (
              <VirtualEnergyMap result={activeResult} currentHour={currentHour} />
            )}

            {activeTab === 'analytics' && (
              <EnergyAnalytics result={activeResult} currentHour={currentHour} />
            )}

            {activeTab === 'scenario' && (
              <ScenarioEditor
                scenario={scenario}
                onUpdateScenario={setScenario}
                onRunSimulation={handleRunSimulation}
                onResetScenario={handleResetScenario}
                isSimulating={isSimulating}
              />
            )}

            {activeTab === 'flexgrid' && (
              <FlexGridOptimizer
                result={activeResult}
                baselineResult={scenarioResult}
                isOptimized={isOptimized}
                onToggleOptimized={() => setIsOptimized((opt) => !opt)}
                currentHour={currentHour}
              />
            )}

            {activeTab === 'comparison' && (
              <ResultsComparison
                baselineResult={baselineResult}
                scenarioResult={scenarioResult}
                optimizedResult={optimizedResult}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
