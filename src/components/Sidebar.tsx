import React from 'react';
import {
  MapPin,
  BarChart3,
  Sliders,
  Cpu,
  Layers,
  Zap,
  RotateCcw,
  Globe
} from 'lucide-react';
import type { SimulationResult } from '../simulation/types';

export type NavTab = 'map' | '3d-map' | 'analytics' | 'scenario' | 'flexgrid' | 'comparison';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  result: SimulationResult;
  onResetScenario: () => void;
  isScenarioModified: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  result,
  onResetScenario,
  isScenarioModified
}) => {
  const navItems = [
    {
      id: 'map' as NavTab,
      label: 'GridTwin Map',
      icon: MapPin,
      badge: 'Interactive'
    },
    {
      id: '3d-map' as NavTab,
      label: '3D Energy Network',
      icon: Globe,
      badge: '3D',
      badgeColor: 'var(--accent-cyan)'
    },
    {
      id: 'analytics' as NavTab,
      label: 'Energy Dashboard',
      icon: BarChart3,
      badge: '24h'
    },
    {
      id: 'scenario' as NavTab,
      label: 'Scenario Editor',
      icon: Sliders,
      badge: isScenarioModified ? 'Active' : undefined,
      badgeColor: isScenarioModified ? 'var(--accent-amber)' : undefined
    },
    {
      id: 'flexgrid' as NavTab,
      label: 'FlexGrid Optimizer',
      icon: Cpu,
      badge: result.isOptimized ? 'ON' : 'OFF',
      badgeColor: result.isOptimized ? 'var(--accent-green)' : 'var(--text-muted)'
    },
    {
      id: 'comparison' as NavTab,
      label: 'Results & Comparison',
      icon: Layers,
      badge: `${result.summary.resilienceScore}%`
    }
  ];

  return (
    <aside
      style={{
        width: '310px',
        minWidth: '310px',
        backgroundColor: 'var(--bg-primary)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 40
      }}
    >
      <div>
        {/* Brand Header */}
        <div
          style={{
            padding: '24px 22px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '11px',
              background: 'linear-gradient(135deg, #0284c7, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(6, 182, 212, 0.4)',
              flexShrink: 0
            }}
          >
            <Zap size={24} color="#04101e" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: 'var(--fs-sidebar-brand)',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  color: '#fff'
                }}
              >
                GridWise
              </span>
              <span
                style={{
                  fontSize: 'var(--fs-badge)',
                  fontWeight: 700,
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  color: 'var(--accent-cyan)',
                  padding: '2px 7px',
                  borderRadius: '5px',
                  border: '1px solid rgba(56, 189, 248, 0.3)'
                }}
              >
                v2.4
              </span>
            </div>
            <p style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Energy Resilience Twin
            </p>
          </div>
        </div>

        {/* Live Simulation Engine Status */}
        <div
          style={{
            margin: '16px 16px 8px 16px',
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              className="live-dot"
              style={{
                color: result.summary.totalUnmetKwh > 0 ? 'var(--accent-coral)' : 'var(--accent-green)'
              }}
            />
            <span style={{ fontSize: 'var(--fs-body)', fontWeight: 500, color: 'var(--text-secondary)' }}>
              {result.summary.totalUnmetKwh > 0 ? 'Grid Deficit Event' : 'Microgrid Balanced'}
            </span>
          </div>
          <span
            className="font-mono"
            style={{
              fontSize: 'var(--fs-body)',
              color: result.summary.resilienceScore >= 90 ? 'var(--accent-green)' : 'var(--accent-amber)',
              fontWeight: 700
            }}
          >
            {result.summary.resilienceScore}%
          </span>
        </div>

        {/* Navigation Tabs (Target: 16-18px) */}
        <nav style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: isActive ? '1px solid var(--border-medium)' : '1px solid transparent',
                  backgroundColor: isActive ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: 'var(--fs-sidebar-nav)',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  textAlign: 'left',
                  width: '100%'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Icon
                    size={20}
                    color={isActive ? 'var(--accent-cyan)' : 'var(--text-muted)'}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    style={{
                      fontSize: 'var(--fs-badge)',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: '999px',
                      backgroundColor: item.badgeColor
                        ? `rgba(${item.badgeColor === 'var(--accent-green)' ? '16, 185, 129' : item.badgeColor === 'var(--accent-amber)' ? '245, 158, 11' : '100, 116, 139'}, 0.2)`
                        : 'rgba(56, 189, 248, 0.12)',
                      color: item.badgeColor || 'var(--accent-cyan)'
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer System Status & Reset */}
      <div
        style={{
          padding: '18px 16px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(10, 15, 29, 0.9)'
        }}
      >
        <div
          style={{
            padding: '14px',
            borderRadius: '8px',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '12px'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '6px'
            }}
          >
            <span style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Scenario
            </span>
            {isScenarioModified && (
              <span style={{ fontSize: 'var(--fs-badge)', color: 'var(--accent-amber)', fontWeight: 700 }}>
                STRESSED
              </span>
            )}
          </div>
          <p
            style={{
              fontSize: '16px',
              color: 'var(--text-primary)',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {result.scenario.name}
          </p>
        </div>

        {isScenarioModified && (
          <button
            onClick={onResetScenario}
            className="btn btn-secondary"
            style={{ width: '100%', fontSize: 'var(--fs-body-sm)', padding: '9px 14px', gap: '8px' }}
          >
            <RotateCcw size={15} />
            <span>Reset to Baseline</span>
          </button>
        )}
      </div>
    </aside>
  );
};
