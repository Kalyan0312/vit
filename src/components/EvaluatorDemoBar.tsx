import React from 'react';
import {
  AlertTriangle,
  Flame,
  Cpu,
  RotateCcw,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import type { ScenarioConfig } from '../simulation/types';
import { BASELINE_SCENARIO, PRESET_SCENARIOS } from '../simulation/syntheticData';

export type DemoStage = 1 | 2 | 3 | 4 | 5;

interface EvaluatorDemoBarProps {
  currentStage: DemoStage;
  onSelectStage: (stage: DemoStage) => void;
  onResetToBaseline: () => void;
}

export const DEMO_STAGES_INFO: Record<
  DemoStage,
  {
    title: string;
    badge: string;
    icon: React.ElementType;
    badgeColor: string;
    hour: number;
    description: string;
    scenario: ScenarioConfig;
    isOptimized: boolean;
  }
> = {
  1: {
    title: 'Baseline Operations',
    badge: 'STAGE 1: NORMAL',
    icon: CheckCircle2,
    badgeColor: '#10b981',
    hour: 13,
    description: 'All 3 feeder circuits energized from 115kV substation. Full solar generation (1,020 kW). 100% demand satisfied; 0 kWh unmet.',
    scenario: { ...BASELINE_SCENARIO },
    isOptimized: false
  },
  2: {
    title: 'Feeder B Severed / Outage',
    badge: 'STAGE 2: FEEDER OUTAGE',
    icon: AlertTriangle,
    badgeColor: '#ef4444',
    hour: 13,
    description: 'Physical tree strike trips Feeder B circuit breaker. 4 facilities disconnected: Water Plant, Res Alpha, Res Beta, Cold Storage.',
    scenario: {
      name: 'Feeder B Trip',
      gridReductionPct: 15,
      solarReductionPct: 0,
      demandIncreasePct: 0,
      batteryOutage: false,
      feederOutage: 'feeder-b',
      startHour: 8,
      duration: 12
    },
    isOptimized: false
  },
  3: {
    title: 'Heatwave Spike + Feeder Trip',
    badge: 'STAGE 3: SEVERE SHORTAGE',
    icon: Flame,
    badgeColor: '#f97316',
    hour: 14,
    description: '35% HVAC surge coupled with Feeder B outage at 2:00 PM peak. Deficit exceeds 800 kW; critical water utility in shortage!',
    scenario: {
      ...PRESET_SCENARIOS[1].scenario,
      feederOutage: 'feeder-b',
      startHour: 10,
      duration: 8
    },
    isOptimized: false
  },
  4: {
    title: 'FlexGrid Heuristic Optimization',
    badge: 'STAGE 4: MITIGATION ACTIVE',
    icon: Cpu,
    badgeColor: '#38bdf8',
    hour: 14,
    description: 'FlexGrid algorithmic dispatch engages: 1,500 kW BESS battery discharge + 40% commercial load flexing shields critical facilities!',
    scenario: {
      ...PRESET_SCENARIOS[1].scenario,
      feederOutage: 'feeder-b',
      startHour: 10,
      duration: 8
    },
    isOptimized: true
  },
  5: {
    title: 'Feeder Reclose & Full Recovery',
    badge: 'STAGE 5: RECOVERED',
    icon: RotateCcw,
    badgeColor: '#10b981',
    hour: 13,
    description: 'Feeder B reclosed. Substation capacity restored. Central BESS returns to solar recharge. 100% microgrid resilience restored.',
    scenario: { ...BASELINE_SCENARIO },
    isOptimized: false
  }
};

export const EvaluatorDemoBar: React.FC<EvaluatorDemoBarProps> = ({
  currentStage,
  onSelectStage,
  onResetToBaseline
}) => {
  const activeInfo = DEMO_STAGES_INFO[currentStage];
  const IconComponent = activeInfo.icon;

  return (
    <div
      className="glass-panel"
      style={{
        padding: '12px 18px',
        marginBottom: '16px',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(10, 15, 29, 0.98))',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}
    >
      {/* Top Header Row with Steps */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: 'var(--accent-cyan)',
              fontSize: 'var(--fs-badge)',
              fontWeight: 700,
              letterSpacing: '0.05em'
            }}
          >
            EVALUATOR DEMO SEQUENCE
          </div>
          <span style={{ fontSize: 'var(--fs-body)', color: '#94a3b8' }}>
            5-Stage Live Microgrid Resilience Demonstration:
          </span>
        </div>

        <button
          onClick={onResetToBaseline}
          style={{
            background: 'transparent',
            border: '1px solid rgba(100, 116, 139, 0.4)',
            color: '#94a3b8',
            borderRadius: '6px',
            padding: '5px 12px',
            fontSize: 'var(--fs-legend)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          title="Reset back to Baseline"
        >
          <RotateCcw size={14} />
          <span>Reset to Baseline</span>
        </button>
      </div>

      {/* Stepper Buttons Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))',
          gap: '10px'
        }}
      >
        {([1, 2, 3, 4, 5] as DemoStage[]).map((stage) => {
          const info = DEMO_STAGES_INFO[stage];
          const isCurrent = currentStage === stage;
          const StageIcon = info.icon;

          return (
            <button
              key={stage}
              onClick={() => onSelectStage(stage)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '8px',
                border: isCurrent
                  ? `1px solid ${info.badgeColor}`
                  : '1px solid rgba(100, 116, 139, 0.25)',
                background: isCurrent
                  ? `${info.badgeColor}22`
                  : 'rgba(30, 41, 59, 0.4)',
                color: isCurrent ? '#f8fafc' : '#94a3b8',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                boxShadow: isCurrent ? `0 0 14px ${info.badgeColor}33` : 'none'
              }}
            >
              <StageIcon size={18} color={info.badgeColor} style={{ flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 'var(--fs-meta)', fontWeight: 700, color: info.badgeColor }}>
                  {info.badge}
                </div>
                <div
                  style={{
                    fontSize: 'var(--fs-body-sm)',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {info.title}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Stage Description Card */}
      <div
        key={currentStage}
        className="stage-desc-animate"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          padding: '10px 16px',
          borderRadius: '8px',
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          borderLeft: `4px solid ${activeInfo.badgeColor}`
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <IconComponent size={20} color={activeInfo.badgeColor} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 'var(--fs-body)', fontWeight: 700, color: '#f8fafc' }}>
              {activeInfo.title} — Hour {String(activeInfo.hour).padStart(2, '0')}:00
            </div>
            <div style={{ fontSize: 'var(--fs-body-sm)', color: '#cbd5e1', marginTop: '2px', lineHeight: 1.4 }}>
              {activeInfo.description}
            </div>
          </div>
        </div>

        {currentStage < 5 && (
          <button
            onClick={() => onSelectStage((currentStage + 1) as DemoStage)}
            className="btn btn-primary"
            style={{
              padding: '6px 14px',
              fontSize: 'var(--fs-body-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            <span>Next Stage</span>
            <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
};
