/**
 * 3D Network Map - UI Overlay Components
 * Floating panels, controls, legends, and inspector that overlay the 3D scene.
 */

import React from 'react';
import type { MapControls, SelectedBuilding, BESSState } from './types';
import type { FeederId } from '../simulation/types';
import { STATUS_COLORS, FEEDER_COLORS } from './types';
import { FEEDERS } from '../simulation/syntheticData';

// ─── Styles ──────────────────────────────────────────────
const panelStyle: React.CSSProperties = {
  background: 'rgba(10, 15, 29, 0.94)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(56, 189, 248, 0.18)',
  borderRadius: '12px',
  padding: '16px',
  color: '#f8fafc',
  fontFamily: "'Outfit', sans-serif",
  fontSize: 'var(--fs-body-sm)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};

const toggleBtn = (active: boolean, color?: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '7px 12px',
  borderRadius: '6px',
  border: active
    ? `1px solid ${color || 'rgba(56, 189, 248, 0.5)'}`
    : '1px solid rgba(100, 116, 139, 0.3)',
  background: active
    ? `${color || 'rgba(56, 189, 248, 0.15)'}25`
    : 'rgba(30, 41, 59, 0.5)',
  color: active ? '#f8fafc' : '#94a3b8',
  cursor: 'pointer',
  fontSize: 'var(--fs-legend)',
  fontWeight: 500,
  fontFamily: "'Outfit', sans-serif",
  transition: 'all 0.2s ease',
});

const dotStyle = (color: string, size = 10): React.CSSProperties => ({
  width: `${size}px`,
  height: `${size}px`,
  borderRadius: '50%',
  backgroundColor: color,
  boxShadow: `0 0 6px ${color}`,
  flexShrink: 0,
});

// ─── Controls Panel (Top-Left) ───────────────────────────
interface ControlsPanelProps {
  controls: MapControls;
  onToggle: (key: keyof MapControls) => void;
  onFeederOutage: (feeder: 'none' | FeederId) => void;
  onResetView: () => void;
  style?: React.CSSProperties;
}

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  controls,
  onToggle,
  onFeederOutage,
  onResetView,
  style,
}) => {
  return (
    <div
      style={{
        ...panelStyle,
        width: '100%',
        maxHeight: '100%',
        overflowY: 'auto',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: 'var(--fs-legend)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>
          Layer Controls
        </span>
        <button
          onClick={onResetView}
          style={{
            ...toggleBtn(false),
            padding: '4px 10px',
            fontSize: 'var(--fs-legend)',
          }}
        >
          ↺ Reset View
        </button>
      </div>

      {/* Feeder Toggles */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: 'var(--fs-meta)', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
          Feeders
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {(['feeder-a', 'feeder-b', 'feeder-c'] as FeederId[]).map((fid) => {
            const feeder = FEEDERS.find((f) => f.id === fid)!;
            const toggleKey = fid === 'feeder-a' ? 'showFeederA' : fid === 'feeder-b' ? 'showFeederB' : 'showFeederC';
            return (
              <button
                key={fid}
                onClick={() => onToggle(toggleKey as keyof MapControls)}
                style={toggleBtn(controls[toggleKey as keyof MapControls] as boolean, FEEDER_COLORS[fid])}
              >
                <span style={dotStyle(FEEDER_COLORS[fid], 10)} />
                {feeder.name.split('(')[0].trim()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Layer Toggles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '12px' }}>
        <div style={{ fontSize: 'var(--fs-meta)', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
          Layers
        </div>
        <button onClick={() => onToggle('showPowerFlow')} style={toggleBtn(controls.showPowerFlow, '#38bdf8')}>
          ⚡ Power Flow Animation
        </button>
        <button onClick={() => onToggle('showSolarAssets')} style={toggleBtn(controls.showSolarAssets, '#0284c7')}>
          ☀ Solar Assets
        </button>
        <button onClick={() => onToggle('showBESS')} style={toggleBtn(controls.showBESS, '#a855f7')}>
          🔋 Central BESS
        </button>
        <button onClick={() => onToggle('showOutageHighlights')} style={toggleBtn(controls.showOutageHighlights, '#ef4444')}>
          ⚠ Outage Highlights
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '12px' }}>
        <div style={{ fontSize: 'var(--fs-meta)', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
          Filters
        </div>
        <button onClick={() => onToggle('filterCritical')} style={toggleBtn(controls.filterCritical, '#ef4444')}>
          🏥 Critical Facilities
        </button>
        <button onClick={() => onToggle('filterInOutage')} style={toggleBtn(controls.filterInOutage, '#f59e0b')}>
          🔴 In Outage
        </button>
        <button onClick={() => onToggle('filterBatteryBacked')} style={toggleBtn(controls.filterBatteryBacked, '#38bdf8')}>
          🔋 Battery-Backed
        </button>
      </div>

      {/* Outage Simulation */}
      <div>
        <div style={{ fontSize: 'var(--fs-meta)', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
          Outage Simulation
        </div>
        <select
          value={controls.feederOutage}
          onChange={(e) => onFeederOutage(e.target.value as 'none' | FeederId)}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            background: 'rgba(15, 23, 42, 0.9)',
            color: '#f8fafc',
            fontSize: 'var(--fs-input)',
            fontFamily: "'Outfit', sans-serif",
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="none">All Feeders Active</option>
          {FEEDERS.map((f) => (
            <option key={f.id} value={f.id}>
              ⚡ Trip: {f.name.split('(')[0].trim()}
            </option>
          ))}
        </select>
        {controls.feederOutage !== 'none' && (
          <button
            onClick={() => onFeederOutage('none')}
            style={{
              ...toggleBtn(true, '#ef4444'),
              width: '100%',
              marginTop: '6px',
              justifyContent: 'center',
              fontSize: 'var(--fs-legend)',
              color: '#f87171',
            }}
          >
            ✕ Reset Outage
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Status Legend (Bottom-Left) ─────────────────────────
interface StatusLegendProps {
  style?: React.CSSProperties;
}

export const StatusLegend: React.FC<StatusLegendProps> = ({ style }) => {
  const statuses = [
    { label: 'Normal / Powered', color: STATUS_COLORS.normal, status: 'normal' },
    { label: 'Battery Backed', color: STATUS_COLORS.battery_backed, status: 'battery_backed' },
    { label: 'Flexible Load Shifted', color: STATUS_COLORS.flexed, status: 'flexed' },
    { label: 'Deficit / Outage', color: STATUS_COLORS.outage, status: 'outage' },
  ];

  return (
    <div
      style={{
        ...panelStyle,
        width: '100%',
        ...style,
      }}
    >
      <div style={{ fontSize: 'var(--fs-legend)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', marginBottom: '10px' }}>
        Energy Status
      </div>
      {statuses.map((s) => (
        <div key={s.status} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 0' }}>
          <span style={dotStyle(s.color, 11)} />
          <span style={{ fontSize: 'var(--fs-legend)', color: '#e2e8f0', fontWeight: 500 }}>{s.label}</span>
        </div>
      ))}

      <div style={{ borderTop: '1px solid rgba(100,116,139,0.2)', margin: '10px 0', paddingTop: '10px' }}>
        <div style={{ fontSize: 'var(--fs-legend)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', marginBottom: '8px' }}>
          Feeder Groups
        </div>
        {FEEDERS.map((f) => (
          <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 0' }}>
            <span style={{ ...dotStyle(FEEDER_COLORS[f.id], 11), borderRadius: '3px' }} />
            <span style={{ fontSize: 'var(--fs-legend)', color: '#e2e8f0', fontWeight: 500 }}>{f.name.split('(')[0].trim()}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 0', marginTop: '2px' }}>
          <span style={{ ...dotStyle('#f59e0b', 7), borderRadius: '50%' }} />
          <span style={{ fontSize: 'var(--fs-meta)', color: '#94a3b8', fontStyle: 'italic' }}>Modeled (unverified)</span>
        </div>
      </div>
    </div>
  );
};

// ─── BESS Info Panel (Bottom-Right) ──────────────────────
interface BESSInfoProps {
  state: BESSState;
  visible: boolean;
}

export const BESSInfoPanel: React.FC<BESSInfoProps> = ({ state, visible }) => {
  if (!visible) return null;

  const batteryColor = state.socPct > 60 ? '#10b981' :
    state.socPct > 30 ? '#f59e0b' : '#ef4444';

  const statusText = !state.isOnline ? 'OFFLINE' :
    state.isDischarging ? 'DISCHARGING' :
      state.isCharging ? 'CHARGING' : 'STANDBY';

  const statusClr = !state.isOnline ? '#ef4444' :
    state.isDischarging ? '#f59e0b' :
      state.isCharging ? '#10b981' : '#38bdf8';

  return (
    <div style={{ ...panelStyle, position: 'absolute', bottom: 16, right: 16, width: '270px', zIndex: 10 }}>
      <div style={{ fontSize: 'var(--fs-battery-heading)', fontWeight: 700, color: '#c084fc', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>🔋</span> Central BESS Hub
      </div>

      {/* SoC bar */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ fontSize: 'var(--fs-legend)', color: '#94a3b8' }}>State of Charge</span>
          <span style={{ fontSize: 'var(--fs-inspector-metric)', fontWeight: 700, color: batteryColor, fontFamily: "'JetBrains Mono', monospace" }}>
            {state.socPct}%
          </span>
        </div>
        <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(30,41,59,0.8)', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${state.socPct}%`,
            background: `linear-gradient(90deg, ${batteryColor}, ${batteryColor}aa)`,
            borderRadius: '4px',
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {[
          { label: 'Capacity', value: `${state.capacityKwh} kWh` },
          { label: 'Stored', value: `${Math.round(state.socKwh)} kWh` },
          { label: 'Max Charge', value: `${state.maxChargeKw} kW` },
          { label: 'Max Discharge', value: `${state.maxDischargeKw} kW` },
        ].map((item) => (
          <div key={item.label}>
            <div style={{ fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>{item.label}</div>
            <div style={{ fontSize: 'var(--fs-inspector-metric)', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#e2e8f0', marginTop: '2px' }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Status */}
      <div style={{
        marginTop: '12px',
        padding: '8px 12px',
        borderRadius: '6px',
        border: `1px solid ${statusClr}44`,
        background: `${statusClr}18`,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span style={dotStyle(statusClr, 10)} />
        <span style={{ fontSize: 'var(--fs-legend)', fontWeight: 600, color: statusClr }}>{statusText}</span>
        {state.currentPowerKw !== 0 && (
          <span style={{ fontSize: 'var(--fs-legend)', color: '#cbd5e1', marginLeft: 'auto', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
            {Math.abs(Math.round(state.currentPowerKw))} kW
          </span>
        )}
      </div>
    </div>
  );
};

// ─── Building Inspector (Top-Right) ──────────────────────
interface BuildingInspectorProps {
  selected: SelectedBuilding | null;
  onClose: () => void;
}

export const BuildingInspector: React.FC<BuildingInspectorProps> = ({ selected, onClose }) => {
  if (!selected) return null;

  const { building, state } = selected;
  const statusColor = STATUS_COLORS[state.energyStatus];
  const feederColor = FEEDER_COLORS[building.feeder];

  const statusLabels: Record<string, string> = {
    normal: 'Normal / Powered',
    battery_backed: 'Battery Backed',
    flexed: 'Flexible Load Shifted',
    outage: 'Deficit / Outage',
  };

  const typeLabels: Record<string, string> = {
    critical: 'Critical',
    essential: 'Essential',
    standard: 'Standard',
  };

  return (
    <div style={{ ...panelStyle, position: 'absolute', top: 16, right: 16, width: '320px', zIndex: 10, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ flex: 1, paddingRight: '8px' }}>
          <div style={{ fontSize: 'var(--fs-inspector-heading)', fontWeight: 700, color: '#f8fafc', lineHeight: 1.3, marginBottom: '6px' }}>
            {building.name}
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 'var(--fs-badge)',
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: '4px',
              border: `1px solid ${building.type === 'critical' ? '#ef4444' : building.type === 'essential' ? '#f59e0b' : '#38bdf8'}44`,
              background: `${building.type === 'critical' ? '#ef4444' : building.type === 'essential' ? '#f59e0b' : '#38bdf8'}18`,
              color: building.type === 'critical' ? '#f87171' : building.type === 'essential' ? '#fbbf24' : '#38bdf8',
              textTransform: 'uppercase',
            }}>
              {typeLabels[building.type]}
            </span>
            <span style={{
              fontSize: 'var(--fs-badge)',
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: '4px',
              border: `1px solid ${feederColor}44`,
              background: `${feederColor}18`,
              color: feederColor,
              textTransform: 'uppercase',
            }}>
              {building.feeder.replace('-', ' ').toUpperCase()}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(30, 41, 59, 0.6)',
            border: '1px solid rgba(100,116,139,0.3)',
            borderRadius: '6px',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '4px 10px',
            fontSize: 'var(--fs-body)',
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>

      {/* Energy Status */}
      <div style={{
        padding: '10px 12px',
        borderRadius: '8px',
        border: `1px solid ${statusColor}33`,
        background: `${statusColor}14`,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '12px',
      }}>
        <span style={dotStyle(statusColor, 12)} />
        <span style={{ fontSize: 'var(--fs-body)', fontWeight: 600, color: statusColor }}>
          {statusLabels[state.energyStatus]}
        </span>
      </div>

      {/* Grid connection */}
      <div style={{
        padding: '8px 12px',
        borderRadius: '6px',
        border: `1px solid ${state.isConnectedToGrid ? '#10b981' : '#ef4444'}33`,
        background: `${state.isConnectedToGrid ? '#10b981' : '#ef4444'}14`,
        marginBottom: '12px',
        fontSize: 'var(--fs-body-sm)',
        color: state.isConnectedToGrid ? '#34d399' : '#f87171',
        fontWeight: 600,
      }}>
        {state.isConnectedToGrid ? '✓ Connected to Grid' : '✕ Disconnected from Grid'}
      </div>

      {/* Energy Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
        {[
          { label: 'Demand', value: `${Math.round(state.demandKw)} kW`, color: '#e2e8f0' },
          { label: 'Grid Supply', value: `${Math.round(state.gridKw)} kW`, color: '#38bdf8' },
          { label: 'Solar', value: `${Math.round(state.solarKw)} kW`, color: '#f59e0b' },
          { label: 'Battery', value: `${Math.round(state.batteryKw)} kW`, color: '#a855f7' },
          { label: 'Unmet Energy', value: `${Math.round(state.unmetKw)} kW`, color: state.unmetKw > 0.5 ? '#ef4444' : '#10b981' },
          { label: 'Flexed Load', value: `${Math.round(state.flexedKw)} kW`, color: '#f59e0b' },
        ].map((item) => (
          <div key={item.label}>
            <div style={{ fontSize: 'var(--fs-meta)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              {item.label}
            </div>
            <div style={{ fontSize: 'var(--fs-inspector-metric)', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: item.color, marginTop: '2px' }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Assets */}
      <div style={{ borderTop: '1px solid rgba(100,116,139,0.2)', paddingTop: '10px' }}>
        <div style={{ fontSize: 'var(--fs-meta)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', fontWeight: 600 }}>
          Assigned Assets
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {building.solarCapacityKw > 0 && (
            <div style={{ fontSize: 'var(--fs-body-sm)', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#f59e0b' }}>☀</span>
              Solar: {building.solarCapacityKw} kW capacity
            </div>
          )}
          {building.localBatteryKwh > 0 && (
            <div style={{ fontSize: 'var(--fs-body-sm)', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#a855f7' }}>🔋</span>
              Battery: {building.localBatteryKwh} kWh
            </div>
          )}
          {building.solarCapacityKw === 0 && building.localBatteryKwh === 0 && (
            <div style={{ fontSize: 'var(--fs-body-sm)', color: '#64748b', fontStyle: 'italic' }}>
              No local generation assets
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
