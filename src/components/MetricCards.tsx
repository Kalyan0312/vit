import React from 'react';
import {
  Zap,
  Power,
  AlertTriangle,
  Building2,
  ShieldAlert,
  Info
} from 'lucide-react';
import type { SimulationResult } from '../simulation/types';

interface MetricCardsProps {
  result: SimulationResult;
  currentHour: number;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ result, currentHour }) => {
  const currentHourData = result.hourly[currentHour] || result.hourly[0];
  const { summary } = result;

  const cards = [
    {
      id: 'demand',
      title: 'Total Energy Demand',
      value24h: `${summary.totalDemandKwh.toLocaleString()} kWh`,
      valueHour: `${currentHourData.demandKw.toLocaleString()} kW`,
      icon: Zap,
      accentColor: 'var(--accent-cyan)',
      glowColor: 'var(--accent-cyan-glow)',
      subtext: `Peak: ${summary.peakDemandKw.toLocaleString()} kW`
    },
    {
      id: 'grid',
      title: 'Grid Supply Delivered',
      value24h: `${summary.totalGridSupplyKwh.toLocaleString()} kWh`,
      valueHour: `${currentHourData.gridSupplyKw.toLocaleString()} kW`,
      icon: Power,
      accentColor: 'var(--accent-green)',
      glowColor: 'var(--accent-green-glow)',
      subtext: `Solar: ${summary.totalSolarGenKwh.toLocaleString()} kWh`
    },
    {
      id: 'unmet',
      title: 'Unmet Energy Deficit',
      value24h: `${summary.totalUnmetKwh.toLocaleString()} kWh`,
      valueHour: `${currentHourData.unmetDemandKw.toLocaleString()} kW`,
      icon: AlertTriangle,
      accentColor: summary.totalUnmetKwh > 0 ? 'var(--accent-coral)' : 'var(--accent-green)',
      glowColor: summary.totalUnmetKwh > 0 ? 'var(--accent-coral-glow)' : 'var(--accent-green-glow)',
      subtext: summary.totalUnmetKwh > 0 ? `Peak Unmet: ${summary.peakUnmetKw} kW` : '100% Demand Satisfied',
      isAlert: summary.totalUnmetKwh > 0
    },
    {
      id: 'affected',
      title: 'Buildings Affected',
      value24h: `${summary.affectedBuildingsTotal} / 12`,
      valueHour: `${currentHourData.buildingsAffectedCount} / 12 Now`,
      icon: Building2,
      accentColor: summary.affectedBuildingsTotal > 0 ? 'var(--accent-amber)' : 'var(--accent-green)',
      glowColor: summary.affectedBuildingsTotal > 0 ? 'var(--accent-amber-glow)' : 'var(--accent-green-glow)',
      subtext: `${summary.totalOutageHours} Total Outage Hours`
    },
    {
      id: 'critical',
      title: 'Critical Buildings Impacted',
      value24h: `${summary.criticalBuildingsAffectedTotal} / 4`,
      valueHour: `${currentHourData.criticalBuildingsAffectedCount} Now`,
      icon: ShieldAlert,
      accentColor: summary.criticalBuildingsAffectedTotal > 0 ? 'var(--accent-coral)' : 'var(--accent-green)',
      glowColor: summary.criticalBuildingsAffectedTotal > 0 ? 'var(--accent-coral-glow)' : 'var(--accent-green-glow)',
      subtext: summary.criticalBuildingsAffectedTotal === 0 ? 'Hospital & 911 Protected' : 'Critical Outages Active!',
      isAlert: summary.criticalBuildingsAffectedTotal > 0
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '22px' }}>
      {/* Synthetic Calibration Notice */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 18px',
          borderRadius: '8px',
          backgroundColor: 'rgba(30, 41, 59, 0.4)',
          border: '1px solid rgba(56, 189, 248, 0.1)',
          fontSize: 'var(--fs-legend)',
          color: 'var(--text-muted)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={16} color="var(--accent-cyan)" />
          <span>
            Deterministic synthetic simulation model based on calibrated microgrid diurnal profiles (not real-time sensor measurements).
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: 'var(--fs-body)' }}>
            BESS SoC: <strong className="font-mono" style={{ color: 'var(--accent-cyan)' }}>{currentHourData.batterySocPct}%</strong>
          </span>
          <span style={{ fontSize: 'var(--fs-body)' }}>
            Resilience Score: <strong className="font-mono" style={{ color: summary.resilienceScore >= 90 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>{summary.resilienceScore}%</strong>
          </span>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="metrics-grid">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
          <div
              key={card.id}
              className="glass-panel"
              style={{
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
                borderColor: card.isAlert ? 'rgba(239, 68, 68, 0.35)' : undefined
              }}
            >
              {/* Subtle top indicator bar */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  backgroundColor: card.accentColor,
                  boxShadow: `0 0 10px ${card.accentColor}`
                }}
              />

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '14px'
                }}
              >
                <span
                  style={{
                    fontSize: 'var(--fs-kpi-label)',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    letterSpacing: '0.01em'
                  }}
                >
                  {card.title}
                </span>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: `rgba(${card.accentColor === 'var(--accent-coral)' ? '239, 68, 68' : card.accentColor === 'var(--accent-amber)' ? '245, 158, 11' : card.accentColor === 'var(--accent-green)' ? '16, 185, 129' : '56, 189, 248'}, 0.12)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Icon size={20} color={card.accentColor} />
                </div>
              </div>

              <div>
                {/* KPI primary value — re-keyed to trigger animation on change */}
                <div
                  key={card.value24h}
                  className="font-mono kpi-value-animate"
                  style={{
                    fontSize: 'var(--fs-kpi-value)',
                    fontWeight: 700,
                    color: card.isAlert ? '#f87171' : '#fff',
                    lineHeight: 1.1,
                    marginBottom: '8px'
                  }}
                >
                  {card.value24h}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 'var(--fs-body-sm)'
                  }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>
                    Hr {currentHour}: <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>{card.valueHour}</strong>
                  </span>
                  <span
                    key={card.subtext}
                    className="status-animate"
                    style={{
                      color: card.accentColor,
                      fontWeight: 600
                    }}
                  >
                    {card.subtext}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
