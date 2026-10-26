import React from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Cpu,
  RefreshCw
} from 'lucide-react';
import type { NavTab } from './Sidebar';

interface TopNavbarProps {
  activeTab: NavTab;
  currentHour: number;
  onHourChange: (hour: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  isOptimized: boolean;
  onToggleOptimized: () => void;
  onRunSimulation: () => void;
  isSimulating: boolean;
  simStatus?: 'IDLE' | 'RUNNING' | 'COMPLETED' | 'ERROR';
}

const TAB_TITLES: Record<NavTab, { title: string; subtitle: string }> = {
  map: {
    title: 'GridTwin Microgrid Digital Twin',
    subtitle: 'Interactive architectural footprint map with dynamic power flows and feeder telemetry'
  },
  '3d-map': {
    title: '3D Virtual Energy Network',
    subtitle: 'Interactive isometric smart microgrid scene with 3D power flows, feeder telemetry, and BESS digital twin'
  },
  analytics: {
    title: 'Energy Resilience Analytics',
    subtitle: '24-hour hourly demand, renewable generation, BESS state-of-charge, and deficit curves'
  },
  scenario: {
    title: 'Stress Scenario Editor',
    subtitle: 'Inject grid supply loss, solar irradiance curtailment, demand surges, and feeder trips'
  },
  flexgrid: {
    title: 'FlexGrid Heuristic Optimizer',
    subtitle: 'Automated peak shaving, transparent battery dispatch, and critical load shielding'
  },
  comparison: {
    title: 'Resilience Benchmark & Comparison',
    subtitle: 'Side-by-side evaluation of Baseline vs Stressed vs FlexGrid mitigation results'
  }
};

export const TopNavbar: React.FC<TopNavbarProps> = ({
  activeTab,
  currentHour,
  onHourChange,
  isPlaying,
  onTogglePlay,
  isOptimized,
  onToggleOptimized,
  onRunSimulation,
  isSimulating,
  simStatus = 'IDLE'
}) => {
  const meta = TAB_TITLES[activeTab];

  const formatHour = (h: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${String(h).padStart(2, '0')}:00 (${displayHour} ${period})`;
  };

  return (
    <header
      style={{
        height: '86px',
        backgroundColor: 'rgba(10, 15, 29, 0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 30
      }}
    >
      {/* Title & View Info */}
      <div>
        <h1
          key={activeTab}
          className="heading-enter"
          style={{
            fontSize: 'var(--fs-page-title)',
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '-0.02em',
            margin: 0,
            lineHeight: 1.15
          }}
        >
          {meta.title}
        </h1>
        <p
          key={`${activeTab}-sub`}
          className="heading-enter"
          style={{
            fontSize: 'var(--fs-body)',
            color: 'var(--text-secondary)',
            margin: 0,
            marginTop: '3px',
            animationDelay: '0.05s'
          }}
        >
          {meta.subtitle}
        </p>
      </div>

      {/* Controls Bar: Time Scrubber, Playback & Optimization Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* 24-Hour Time Scrubber */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 16px',
            borderRadius: '10px',
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          {/* Play/Pause Button */}
          <button
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause 24h playback' : 'Play 24h simulation'}
            style={{
              background: isPlaying ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: isPlaying ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
              borderRadius: '7px',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: isPlaying ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              transition: 'all 0.15s ease'
            }}
          >
            {isPlaying ? <Pause size={17} /> : <Play size={17} style={{ marginLeft: '2px' }} />}
          </button>

          {/* Step Back */}
          <button
            onClick={() => onHourChange((currentHour + 23) % 24)}
            title="Previous hour"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              padding: '4px'
            }}
          >
            <ChevronLeft size={18} />
          </button>

          {/* Time Display & Slider */}
          <div style={{ display: 'flex', flexDirection: 'column', width: '155px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '16px',
                marginBottom: '4px'
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>Hour</span>
              <span
                key={currentHour}
                className="font-mono kpi-value-animate"
                style={{
                  color: 'var(--accent-cyan)',
                  fontWeight: 700,
                  fontSize: '16px',
                  backgroundColor: 'rgba(56, 189, 248, 0.12)',
                  padding: '2px 8px',
                  borderRadius: '5px',
                  border: '1px solid rgba(56, 189, 248, 0.3)'
                }}
              >
                {formatHour(currentHour)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={23}
              step={1}
              value={currentHour}
              onChange={(e) => onHourChange(Number(e.target.value))}
              style={{ cursor: 'pointer', height: '6px' }}
            />
          </div>

          {/* Step Next */}
          <button
            onClick={() => onHourChange((currentHour + 1) % 24)}
            title="Next hour"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              padding: '4px'
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* FlexGrid Quick Toggle */}
        <button
          onClick={onToggleOptimized}
          className="btn"
          style={{
            backgroundColor: isOptimized ? 'rgba(16, 185, 129, 0.15)' : 'rgba(30, 41, 59, 0.6)',
            borderColor: isOptimized ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-subtle)',
            color: isOptimized ? '#34d399' : 'var(--text-secondary)',
            fontSize: 'var(--fs-btn)',
            padding: '9px 16px',
            gap: '8px'
          }}
          title={isOptimized ? 'FlexGrid Optimization is Active' : 'Click to activate FlexGrid Optimization'}
        >
          <Cpu size={18} color={isOptimized ? 'var(--accent-green)' : 'var(--text-muted)'} />
          <span>FlexGrid: {isOptimized ? 'Enabled' : 'Disabled'}</span>
        </button>

        {/* Run Simulation Button */}
        <button
          onClick={onRunSimulation}
          className="btn btn-primary"
          style={{ fontSize: 'var(--fs-btn-run)', padding: '10px 20px', gap: '8px' }}
          disabled={isSimulating}
          title={isSimulating ? 'Simulation is executing' : 'Trigger full 24h deterministic microgrid dispatch'}
        >
          <RefreshCw
            size={17}
            style={{
              animation: isSimulating ? 'spin 1s linear infinite' : 'none'
            }}
          />
          <span key={simStatus} className="status-animate">
            {isSimulating ? 'RUNNING...' : simStatus === 'COMPLETED' ? 'COMPLETED ✓' : 'Run Simulation'}
          </span>
        </button>
      </div>
    </header>
  );
};
