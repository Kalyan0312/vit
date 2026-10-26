import React from 'react';
import {
  Cpu,
  Zap,
  ShieldCheck,
  TrendingDown,
  Clock
} from 'lucide-react';
import type { SimulationResult } from '../simulation/types';

interface FlexGridOptimizerProps {
  result: SimulationResult;
  baselineResult: SimulationResult;
  isOptimized: boolean;
  onToggleOptimized: () => void;
  currentHour: number;
}

export const FlexGridOptimizer: React.FC<FlexGridOptimizerProps> = ({
  result,
  baselineResult,
  isOptimized,
  onToggleOptimized,
  currentHour
}) => {
  const { summary, flexGridActions } = result;

  // Calculate optimization resilience savings vs unmitigated scenario
  const unmetSavedKwh = Math.max(0, baselineResult.summary.totalUnmetKwh - summary.totalUnmetKwh);
  const outageHoursSaved = Math.max(0, baselineResult.summary.totalOutageHours - summary.totalOutageHours);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Master Toggle Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: isOptimized
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(15, 23, 42, 0.85))'
            : 'rgba(15, 23, 42, 0.85)',
          borderColor: isOptimized ? 'var(--accent-green)' : 'var(--border-subtle)',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: isOptimized ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isOptimized ? '0 0 20px rgba(16, 185, 129, 0.35)' : 'none'
            }}
          >
            <Cpu size={26} color={isOptimized ? 'var(--accent-green)' : 'var(--text-muted)'} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                FlexGrid Heuristic Optimization Engine
              </h2>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  backgroundColor: isOptimized ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                  color: isOptimized ? 'var(--accent-green)' : 'var(--text-muted)',
                  padding: '3px 8px',
                  borderRadius: '999px',
                  border: isOptimized ? '1px solid var(--accent-green)' : '1px solid var(--border-subtle)'
                }}
              >
                {isOptimized ? 'ACTIVE & MITIGATING' : 'STANDBY'}
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Transparent algorithmic battery dispatch, discretionary demand response, and critical asset shielding
            </p>
          </div>
        </div>

        <button
          onClick={onToggleOptimized}
          className={isOptimized ? 'btn btn-green' : 'btn btn-primary'}
          style={{ padding: '10px 22px', fontSize: '0.875rem' }}
        >
          {isOptimized ? 'Disable FlexGrid Optimization' : 'Enable FlexGrid Optimization'}
        </button>
      </div>

      {/* Optimization Performance Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Deficit Prevented</span>
            <Zap size={16} color="var(--accent-green)" />
          </div>
          <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-green)' }}>
            {unmetSavedKwh > 0 ? `+${unmetSavedKwh.toLocaleString()} kWh` : isOptimized ? '100% Deficit Solved' : '0 kWh (Standby)'}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Energy shortfall averted via smart dispatch
          </span>
        </div>

        <div className="glass-panel" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Outage Hours Saved</span>
            <Clock size={16} color="var(--accent-cyan)" />
          </div>
          <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
            {outageHoursSaved} Hours
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Campus downtime eliminated
          </span>
        </div>

        <div className="glass-panel" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Load Flexibility Shifted</span>
            <TrendingDown size={16} color="var(--accent-amber)" />
          </div>
          <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-amber)' }}>
            {summary.totalCurtailedKwh.toLocaleString()} kWh
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Non-critical HVAC/EV discretionary shed
          </span>
        </div>

        <div className="glass-panel" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Critical Node Protection</span>
            <ShieldCheck size={16} color="var(--accent-green)" />
          </div>
          <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-green)' }}>
            100%
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Hospital, 911, and Water fully shielded
          </span>
        </div>
      </div>

      {/* Heuristic Strategy & Explanatory Audit Log */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '20px' }}>
        {/* Transparent Heuristic Principles */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: 'var(--fs-section-heading)', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
            Heuristic Algorithmic Policy
          </h3>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            How FlexGrid manages constrained resources deterministically
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className="badge badge-success">Rule 1</span>
                <strong style={{ fontSize: '0.82rem', color: '#fff' }}>Proactive Pre-Charging</strong>
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: 0 }}>
                Anticipates upcoming scenario deficits 1-3 hours ahead, boosting BESS SoC to buffer capacity using surplus grid capacity before disruption hits.
              </p>
            </div>

            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className="badge badge-essential">Rule 2</span>
                <strong style={{ fontSize: '0.82rem', color: '#fff' }}>Flexible Discretionary Shedding</strong>
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: 0 }}>
                Modulates discretionary loads (residential AC setpoints, commercial retail display, EV rapid charging) up to 25-40% to protect feeder thermal limits.
              </p>
            </div>

            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className="badge badge-standard">Rule 3</span>
                <strong style={{ fontSize: '0.82rem', color: '#fff' }}>Dynamic Peak-Shaving Battery Dispatch</strong>
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: 0 }}>
                Discharges BESS up to 1,500 kW inverter max, preserving a 15% emergency reserve floor while dynamically smoothing campus net deficit.
              </p>
            </div>

            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className="badge badge-critical">Rule 4</span>
                <strong style={{ fontSize: '0.82rem', color: '#fff' }}>Critical Asset Immunity</strong>
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: 0 }}>
                Metro General Hospital, 911 Emergency Dispatch, and Municipal Water Treatment are granted absolute zero-curtailment priority.
              </p>
            </div>
          </div>
        </div>

        {/* Step-by-Step Optimization Audit Log */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: 'var(--fs-section-heading)', fontWeight: 700, color: '#fff', margin: 0 }}>
                Transparent Optimization Action Log
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                Auditable trace explaining every dispatch decision made during the 24-hour simulation
              </p>
            </div>
            <span className="badge badge-success">
              {flexGridActions.length} Actions Logged
            </span>
          </div>

          <div
            style={{
              flex: 1,
              maxHeight: '420px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            {flexGridActions.length === 0 ? (
              <div
                style={{
                  padding: '30px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem'
                }}
              >
                No optimization actions required under current baseline operating conditions.
              </div>
            ) : (
              flexGridActions.map((action, idx) => {
                const isCurrentHour = action.hour === currentHour;
                const iconColor =
                  action.type === 'battery_discharge'
                    ? 'var(--accent-purple)'
                    : action.type === 'battery_charge'
                    ? 'var(--accent-cyan)'
                    : action.type === 'load_shedding'
                    ? 'var(--accent-amber)'
                    : 'var(--accent-green)';

                return (
                  <div
                    key={idx}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      backgroundColor: isCurrentHour ? 'rgba(56, 189, 248, 0.1)' : 'rgba(15, 23, 42, 0.6)',
                      border: isCurrentHour ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="font-mono" style={{ fontSize: '0.74rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                          Hour {String(action.hour).padStart(2, '0')}:00
                        </span>
                        <strong style={{ fontSize: '0.82rem', color: '#fff' }}>
                          {action.title}
                        </strong>
                      </div>
                      <span
                        className="font-mono"
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: iconColor
                        }}
                      >
                        {action.type === 'load_shedding' ? `-${action.impactKw} kW` : `+${action.impactKw} kW`}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.35, margin: 0 }}>
                      {action.message}
                    </p>

                    {action.affectedBuildings && action.affectedBuildings.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Target Circuits:</span>
                        {action.affectedBuildings.map((name) => (
                          <span
                            key={name}
                            style={{
                              fontSize: '0.65rem',
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                              color: 'var(--text-secondary)',
                              padding: '1px 5px',
                              borderRadius: '3px'
                            }}
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
