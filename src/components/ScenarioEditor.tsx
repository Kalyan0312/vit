import React, { useState } from 'react';
import {
  Power,
  Sun,
  Zap,
  Battery,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Clock,
  CheckCircle2
} from 'lucide-react';
import type { ScenarioConfig } from '../simulation/types';
import { PRESET_SCENARIOS, BASELINE_SCENARIO } from '../simulation/syntheticData';

interface ScenarioEditorProps {
  scenario: ScenarioConfig;
  onUpdateScenario: (updated: ScenarioConfig) => void;
  onRunSimulation: () => void;
  onResetScenario: () => void;
  isSimulating: boolean;
}

export const ScenarioEditor: React.FC<ScenarioEditorProps> = ({
  scenario,
  onUpdateScenario,
  onRunSimulation,
  onResetScenario,
  isSimulating
}) => {
  const [localScenario, setLocalScenario] = useState<ScenarioConfig>({ ...scenario });

  const handleChange = <K extends keyof ScenarioConfig>(key: K, value: ScenarioConfig[K]) => {
    const updated = { ...localScenario, [key]: value };
    setLocalScenario(updated);
    onUpdateScenario(updated);
  };

  const loadPreset = (preset: ScenarioConfig) => {
    setLocalScenario({ ...preset });
    onUpdateScenario({ ...preset });
  };

  const handleApply = () => {
    onRunSimulation();
  };

  const endHour = Math.min(24, localScenario.startHour + localScenario.duration);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Preset Scenario Quick Selectors */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Sparkles size={18} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: 'var(--fs-section-heading)', fontWeight: 700, color: '#fff', margin: 0 }}>
            Curated Stress Test Presets
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {PRESET_SCENARIOS.map((preset) => {
            const isCurrent =
              localScenario.name === preset.scenario.name ||
              (preset.label.includes('Baseline') && localScenario.name === 'Baseline Operations');

            return (
              <button
                key={preset.label}
                onClick={() => loadPreset(preset.scenario)}
                style={{
                  textAlign: 'left',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  backgroundColor: isCurrent ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.7)',
                  border: isCurrent ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: isCurrent ? 'var(--accent-cyan)' : '#fff' }}>
                    {preset.label}
                  </span>
                  {isCurrent && <CheckCircle2 size={14} color="var(--accent-cyan)" />}
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Parameters Customizer */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px' }}>
        {/* Left Column: Sliders & Disruption Toggles */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ fontSize: 'var(--fs-section-heading)', fontWeight: 700, color: '#fff', margin: 0 }}>
              Custom Scenario Disturbance Parameters
            </h3>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
              Tune perturbation amplitudes and equipment outage triggers
            </p>
          </div>

          {/* Slider 1: Grid Supply Reduction */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Power size={15} color="var(--accent-green)" />
                <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#fff' }}>
                  Grid Supply Reduction
                </span>
              </div>
              <span className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 700, color: localScenario.gridReductionPct > 0 ? 'var(--accent-amber)' : '#fff' }}>
                -{localScenario.gridReductionPct}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={localScenario.gridReductionPct}
              onChange={(e) => handleChange('gridReductionPct', Number(e.target.value))}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '3px' }}>
              <span>0% (Full Regional Grid)</span>
              <span>50% (Transmission Throttled)</span>
              <span>100% (Substation Blackout)</span>
            </div>
          </div>

          {/* Slider 2: Solar Generation Reduction */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sun size={15} color="var(--accent-amber)" />
                <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#fff' }}>
                  Solar Generation Reduction
                </span>
              </div>
              <span className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 700, color: localScenario.solarReductionPct > 0 ? 'var(--accent-amber)' : '#fff' }}>
                -{localScenario.solarReductionPct}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={localScenario.solarReductionPct}
              onChange={(e) => handleChange('solarReductionPct', Number(e.target.value))}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '3px' }}>
              <span>0% (Clear Blue Skies)</span>
              <span>50% (Partial Cloud Overcast)</span>
              <span>100% (Severe Dust / Eclipse)</span>
            </div>
          </div>

          {/* Slider 3: Increased Demand Surge */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={15} color="var(--accent-cyan)" />
                <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#fff' }}>
                  Campus Demand Surge
                </span>
              </div>
              <span className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 700, color: localScenario.demandIncreasePct > 0 ? 'var(--accent-cyan)' : '#fff' }}>
                +{localScenario.demandIncreasePct}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={localScenario.demandIncreasePct}
              onChange={(e) => handleChange('demandIncreasePct', Number(e.target.value))}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '3px' }}>
              <span>0% (Baseline Consumption)</span>
              <span>35% (Heatwave Cooling Load)</span>
              <span>100% (Emergency Evacuation Surge)</span>
            </div>
          </div>

          {/* Outage Toggles: Battery Outage & Feeder Outage */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
            {/* Battery Outage Toggle */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: localScenario.batteryOutage ? 'rgba(239, 68, 68, 0.12)' : 'rgba(15, 23, 42, 0.6)',
                border: localScenario.batteryOutage ? '1px solid var(--accent-coral)' : '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Battery size={16} color={localScenario.batteryOutage ? 'var(--accent-coral)' : 'var(--accent-purple)'} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>
                    Central BESS Failure
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={localScenario.batteryOutage}
                  onChange={(e) => handleChange('batteryOutage', e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent-coral)', cursor: 'pointer' }}
                />
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
                {localScenario.batteryOutage ? 'BESS offline (Inverter tripped)' : 'BESS available for dispatch'}
              </p>
            </div>

            {/* Feeder Outage Selector */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: localScenario.feederOutage !== 'none' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(15, 23, 42, 0.6)',
                border: localScenario.feederOutage !== 'none' ? '1px solid var(--accent-coral)' : '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={16} color={localScenario.feederOutage !== 'none' ? 'var(--accent-coral)' : 'var(--text-muted)'} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>
                  Distribution Feeder Trip
                </span>
              </div>
              <select
                value={localScenario.feederOutage}
                onChange={(e) => handleChange('feederOutage', e.target.value as any)}
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '6px',
                  padding: '5px 8px',
                  fontSize: '0.75rem',
                  color: '#fff',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="none">None (All 3 Feeders Active)</option>
                <option value="feeder-a">Feeder A (Tech & Commercial)</option>
                <option value="feeder-b">Feeder B (Residential & Water)</option>
                <option value="feeder-c">Feeder C (Hospital & Emergency)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Column: Time Window & Run Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Time Window Config */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Clock size={16} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: 'var(--fs-section-heading)', fontWeight: 700, color: '#fff', margin: 0 }}>
                Disturbance Time Window
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Event Start Hour</span>
                  <span className="font-mono" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {String(localScenario.startHour).padStart(2, '0')}:00
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={23}
                  step={1}
                  value={localScenario.startHour}
                  onChange={(e) => handleChange('startHour', Number(e.target.value))}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Duration (Hours)</span>
                  <span className="font-mono" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {localScenario.duration} Hours
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={24}
                  step={1}
                  value={localScenario.duration}
                  onChange={(e) => handleChange('duration', Number(e.target.value))}
                />
              </div>

              {/* 24-Hour Visual Schedule Timeline */}
              <div style={{ marginTop: '6px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                  Active Period: {String(localScenario.startHour).padStart(2, '0')}:00 — {String(endHour).padStart(2, '0')}:00
                </span>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(24, 1fr)',
                    gap: '2px',
                    height: '24px',
                    backgroundColor: 'rgba(15, 23, 42, 0.7)',
                    padding: '3px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  {Array.from({ length: 24 }).map((_, h) => {
                    const isActive = h >= localScenario.startHour && h < endHour;
                    return (
                      <div
                        key={h}
                        title={`Hour ${String(h).padStart(2, '0')}:00 ${isActive ? '(Scenario Disturbance Active)' : '(Normal)'}`}
                        style={{
                          backgroundColor: isActive ? 'var(--accent-coral)' : '#1e293b',
                          borderRadius: '2px',
                          opacity: isActive ? 0.9 : 0.4
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Action Trigger Card */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Simulation Control
              </span>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Trigger deterministic recalculation across all 12 facilities and central BESS
              </p>
            </div>

            <button
              onClick={handleApply}
              className="btn btn-primary"
              style={{ width: '100%', padding: '11px', fontSize: '0.9rem', gap: '8px' }}
              disabled={isSimulating}
            >
              <Play size={16} fill="currentColor" />
              <span>{isSimulating ? 'Recalculating...' : 'Run Simulation Scenario'}</span>
            </button>

            <button
              onClick={() => {
                loadPreset(BASELINE_SCENARIO);
                onResetScenario();
              }}
              className="btn btn-secondary"
              style={{ width: '100%', padding: '9px', fontSize: '0.8rem', gap: '6px' }}
            >
              <RotateCcw size={14} />
              <span>Reset to Baseline Conditions</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
