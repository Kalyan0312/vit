import React from 'react';
import {
  X,
  Zap,
  Sun,
  Battery,
  Activity,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import type { BuildingDefinition, BuildingHourlyResult, SimulationResult } from '../simulation/types';

interface BuildingDrawerProps {
  building: BuildingDefinition | null;
  buildingState?: BuildingHourlyResult;
  result: SimulationResult;
  currentHour: number;
  onClose: () => void;
}

export const BuildingDrawer: React.FC<BuildingDrawerProps> = ({
  building,
  buildingState,
  result,
  currentHour,
  onClose
}) => {
  if (!building || !buildingState) return null;

  // Extract 24-hour history for this building
  const hourlyHistory = result.hourly.map((h) => ({
    hour: h.hour,
    label: h.label,
    state: h.buildingStates[building.id]
  }));

  const isOutage = buildingState.status === 'outage';
  const isFlexed = buildingState.status === 'flexed';
  const isBattery = buildingState.status === 'battery_backed';

  const statusLabel = isOutage
    ? 'Grid Deficit / Outage'
    : isBattery
    ? 'Microgrid Battery Backed'
    : isFlexed
    ? 'Load Flexed (Demand Response)'
    : 'Normal Operating Power';

  const statusColor = isOutage
    ? 'var(--accent-coral)'
    : isBattery
    ? 'var(--accent-cyan)'
    : isFlexed
    ? 'var(--accent-amber)'
    : 'var(--accent-green)';

  const typeBadgeClass =
    building.type === 'critical'
      ? 'badge badge-critical'
      : building.type === 'essential'
      ? 'badge badge-essential'
      : 'badge badge-standard';

  const percentMet =
    buildingState.demandKw > 0
      ? Math.round(
          (Math.min(buildingState.demandKw, buildingState.demandKw - buildingState.unmetKw) /
            buildingState.demandKw) *
            100
        )
      : 100;

  return (
    <div
      style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        width: '420px',
        maxHeight: 'calc(100% - 32px)',
        backgroundColor: 'rgba(11, 17, 32, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--border-medium)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.65)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Drawer Header */}
      <div
        style={{
          padding: '20px 22px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.6)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className={typeBadgeClass}>{building.type} facility</span>
            <span
              style={{
                fontSize: 'var(--fs-meta)',
                color: 'var(--text-muted)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                padding: '3px 8px',
                borderRadius: '4px',
                fontWeight: 600
              }}
            >
              {building.feeder.toUpperCase()}
            </span>
          </div>
          <h3
            key={building.id}
            className="heading-enter"
            style={{ fontSize: 'var(--fs-inspector-heading)', fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.3 }}
          >
            {building.name}
          </h3>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: 'none',
            borderRadius: '6px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-secondary)'
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Drawer Body */}
      <div style={{ padding: '20px 22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Status Banner */}
        <div
          key={`${buildingState.status}-${currentHour}`}
          className="status-animate"
          style={{
            padding: '14px 16px',
            borderRadius: '8px',
            backgroundColor: `rgba(${statusColor === 'var(--accent-coral)' ? '239, 68, 68' : statusColor === 'var(--accent-amber)' ? '245, 158, 11' : statusColor === 'var(--accent-cyan)' ? '56, 189, 248' : '16, 185, 129'}, 0.12)`,
            border: `1px solid ${statusColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isOutage ? (
              <AlertTriangle size={20} color={statusColor} />
            ) : (
              <CheckCircle2 size={20} color={statusColor} />
            )}
            <div>
              <div style={{ fontSize: 'var(--fs-card-heading)', fontWeight: 700, color: statusColor }}>
                {statusLabel}
              </div>
              <div style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Hour {currentHour}:00 Telemetry Snapshot
              </div>
            </div>
          </div>
          <div
            key={percentMet}
            className="font-mono kpi-value-animate"
            style={{ fontSize: '1.4rem', fontWeight: 700, color: statusColor }}
          >
            {percentMet}%
          </div>
        </div>

        {/* Current Hour Power Telemetry */}
        <div>
          <span style={{ fontSize: 'var(--fs-legend)', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Power Balance Breakdown (kW)
          </span>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginTop: '10px'
            }}
          >
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--fs-meta)', color: 'var(--text-muted)' }}>
                <Zap size={14} color="var(--accent-cyan)" />
                <span>Demand</span>
              </div>
              <div
                key={buildingState.demandKw}
                className="font-mono kpi-value-animate"
                style={{ fontSize: 'var(--fs-inspector-metric)', fontWeight: 700, color: '#fff', marginTop: '4px' }}
              >
                {buildingState.demandKw} kW
              </div>
            </div>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--fs-meta)', color: 'var(--text-muted)' }}>
                <Activity size={14} color="var(--accent-green)" />
                <span>Grid Delivered</span>
              </div>
              <div
                key={buildingState.gridKw}
                className="font-mono kpi-value-animate"
                style={{ fontSize: 'var(--fs-inspector-metric)', fontWeight: 700, color: '#fff', marginTop: '4px' }}
              >
                {buildingState.gridKw} kW
              </div>
            </div>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--fs-meta)', color: 'var(--text-muted)' }}>
                <Sun size={14} color="var(--accent-amber)" />
                <span>Onsite Solar</span>
              </div>
              <div
                key={buildingState.solarKw}
                className="font-mono kpi-value-animate"
                style={{ fontSize: 'var(--fs-inspector-metric)', fontWeight: 700, color: '#fff', marginTop: '4px' }}
              >
                {buildingState.solarKw} kW
              </div>
            </div>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--fs-meta)', color: 'var(--text-muted)' }}>
                <Battery size={14} color="var(--accent-purple)" />
                <span>BESS Battery</span>
              </div>
              <div
                key={buildingState.batteryKw}
                className="font-mono kpi-value-animate"
                style={{ fontSize: 'var(--fs-inspector-metric)', fontWeight: 700, color: '#fff', marginTop: '4px' }}
              >
                {buildingState.batteryKw} kW
              </div>
            </div>
          </div>
        </div>

        {/* Deficit or Flexed Notice */}
        {buildingState.unmetKw > 0 && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span style={{ fontSize: 'var(--fs-body)', color: '#f87171', fontWeight: 600 }}>Active Power Deficit</span>
            <span className="font-mono" style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f87171' }}>
              {buildingState.unmetKw} kW Unmet
            </span>
          </div>
        )}

        {buildingState.flexedKw > 0 && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span style={{ fontSize: 'var(--fs-body)', color: '#fbbf24', fontWeight: 600 }}>FlexGrid Load Shifted</span>
            <span className="font-mono" style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fbbf24' }}>
              -{buildingState.flexedKw} kW Curtailed
            </span>
          </div>
        )}

        {/* Facility Specifications (Target: 15-16px) */}
        <div>
          <span style={{ fontSize: 'var(--fs-legend)', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Facility Asset Specs
          </span>
          <div
            style={{
              marginTop: '10px',
              padding: '14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(15, 23, 42, 0.5)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              fontSize: 'var(--fs-body)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Peak Demand Rating</span>
              <span className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {building.peakDemandKw} kW
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Rooftop Solar Array</span>
              <span className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {building.solarCapacityKw} kW PV
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Local Emergency Storage</span>
              <span className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {building.localBatteryKwh} kWh
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Flexibility Threshold</span>
              <span className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {Math.round(building.flexibleLoadPct * 100)}% Max Shed
              </span>
            </div>
          </div>
        </div>

        {/* 24-Hour Sparkline Mini-Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: 'var(--fs-legend)', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              24-Hour Status Timeline
            </span>
            <span style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-muted)' }}>00:00 - 23:00</span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(24, 1fr)',
              gap: '2px',
              height: '32px',
              backgroundColor: 'rgba(15, 23, 42, 0.8)',
              padding: '4px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)'
            }}
          >
            {hourlyHistory.map((h) => {
              const bState = h.state;
              const barColor =
                bState?.unmetKw > 0
                  ? 'var(--accent-coral)'
                  : bState?.status === 'battery_backed'
                  ? 'var(--accent-cyan)'
                  : bState?.status === 'flexed'
                  ? 'var(--accent-amber)'
                  : 'var(--accent-green)';
              const isCurrent = h.hour === currentHour;

              return (
                <div
                  key={h.hour}
                  title={`Hour ${h.label}: ${bState?.demandKw || 0} kW (${bState?.status || 'normal'})`}
                  style={{
                    backgroundColor: barColor,
                    height: '100%',
                    borderRadius: '2px',
                    opacity: isCurrent ? 1 : 0.65,
                    border: isCurrent ? '1px solid #fff' : 'none',
                    transform: isCurrent ? 'scaleY(1.15)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
