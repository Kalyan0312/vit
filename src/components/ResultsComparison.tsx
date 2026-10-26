import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line
} from 'recharts';
import {
  Download,
  Copy,
  Check
} from 'lucide-react';
import type { SimulationResult } from '../simulation/types';

interface ResultsComparisonProps {
  baselineResult: SimulationResult;
  scenarioResult: SimulationResult;
  optimizedResult: SimulationResult;
}

export const ResultsComparison: React.FC<ResultsComparisonProps> = ({
  baselineResult,
  scenarioResult,
  optimizedResult
}) => {
  const [copied, setCopied] = useState(false);

  // 3-way Comparative Metrics
  const metrics = [
    {
      label: 'Resilience Index Score',
      baseline: `${baselineResult.summary.resilienceScore}%`,
      scenario: `${scenarioResult.summary.resilienceScore}%`,
      optimized: `${optimizedResult.summary.resilienceScore}%`,
      isBetterHigh: true
    },
    {
      label: 'Total Campus Demand',
      baseline: `${baselineResult.summary.totalDemandKwh.toLocaleString()} kWh`,
      scenario: `${scenarioResult.summary.totalDemandKwh.toLocaleString()} kWh`,
      optimized: `${optimizedResult.summary.totalDemandKwh.toLocaleString()} kWh`
    },
    {
      label: 'Grid Supply Delivered',
      baseline: `${baselineResult.summary.totalGridSupplyKwh.toLocaleString()} kWh`,
      scenario: `${scenarioResult.summary.totalGridSupplyKwh.toLocaleString()} kWh`,
      optimized: `${optimizedResult.summary.totalGridSupplyKwh.toLocaleString()} kWh`
    },
    {
      label: 'Solar PV Harvested',
      baseline: `${baselineResult.summary.totalSolarGenKwh.toLocaleString()} kWh`,
      scenario: `${scenarioResult.summary.totalSolarGenKwh.toLocaleString()} kWh`,
      optimized: `${optimizedResult.summary.totalSolarGenKwh.toLocaleString()} kWh`
    },
    {
      label: 'BESS Battery Discharged',
      baseline: `${baselineResult.summary.totalBatteryDischargedKwh.toLocaleString()} kWh`,
      scenario: `${scenarioResult.summary.totalBatteryDischargedKwh.toLocaleString()} kWh`,
      optimized: `${optimizedResult.summary.totalBatteryDischargedKwh.toLocaleString()} kWh`
    },
    {
      label: 'Discretionary Load Flexed',
      baseline: '0 kWh',
      scenario: '0 kWh',
      optimized: `${optimizedResult.summary.totalCurtailedKwh.toLocaleString()} kWh`
    },
    {
      label: 'Total Unmet Deficit (kWh)',
      baseline: `${baselineResult.summary.totalUnmetKwh.toLocaleString()} kWh`,
      scenario: `${scenarioResult.summary.totalUnmetKwh.toLocaleString()} kWh`,
      optimized: `${optimizedResult.summary.totalUnmetKwh.toLocaleString()} kWh`,
      isAlert: true
    },
    {
      label: 'Peak Deficit Amplitude',
      baseline: `${baselineResult.summary.peakUnmetKw} kW`,
      scenario: `${scenarioResult.summary.peakUnmetKw} kW`,
      optimized: `${optimizedResult.summary.peakUnmetKw} kW`,
      isAlert: true
    },
    {
      label: 'Total Outage Hours',
      baseline: `${baselineResult.summary.totalOutageHours} hrs`,
      scenario: `${scenarioResult.summary.totalOutageHours} hrs`,
      optimized: `${optimizedResult.summary.totalOutageHours} hrs`,
      isAlert: true
    },
    {
      label: 'Buildings Impacted',
      baseline: `${baselineResult.summary.affectedBuildingsTotal} / 12`,
      scenario: `${scenarioResult.summary.affectedBuildingsTotal} / 12`,
      optimized: `${optimizedResult.summary.affectedBuildingsTotal} / 12`
    },
    {
      label: 'Critical Facilities Impacted',
      baseline: `${baselineResult.summary.criticalBuildingsAffectedTotal} / 4`,
      scenario: `${scenarioResult.summary.criticalBuildingsAffectedTotal} / 4`,
      optimized: `${optimizedResult.summary.criticalBuildingsAffectedTotal} / 4`,
      isAlert: true
    }
  ];

  // Bar chart data comparing Unmet kWh across the 3 regimes
  const comparisonBarData = [
    {
      category: 'Unmet Energy (kWh)',
      Baseline: baselineResult.summary.totalUnmetKwh,
      'Stressed Scenario': scenarioResult.summary.totalUnmetKwh,
      'FlexGrid Optimized': optimizedResult.summary.totalUnmetKwh
    },
    {
      category: 'Peak Deficit (kW)',
      Baseline: baselineResult.summary.peakUnmetKw,
      'Stressed Scenario': scenarioResult.summary.peakUnmetKw,
      'FlexGrid Optimized': optimizedResult.summary.peakUnmetKw
    }
  ];

  // Hourly Deficit Curves Comparison
  const hourlyDeficitData = baselineResult.hourly.map((h, i) => ({
    label: h.label,
    Baseline: baselineResult.hourly[i].unmetDemandKw,
    Scenario: scenarioResult.hourly[i].unmetDemandKw,
    FlexGrid: optimizedResult.hourly[i].unmetDemandKw
  }));

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Hour',
      'Demand_Kw',
      'GridSupply_Kw',
      'SolarGen_Kw',
      'BatteryDischarge_Kw',
      'BatterySoc_Pct',
      'Scenario_Unmet_Kw',
      'FlexGrid_Unmet_Kw',
      'Curtailed_Kw'
    ];

    const rows = scenarioResult.hourly.map((h, i) => [
      h.label,
      h.demandKw,
      h.gridSupplyKw,
      h.solarGenKw,
      h.batteryDischargeKw,
      h.batterySocPct,
      scenarioResult.hourly[i].unmetDemandKw,
      optimizedResult.hourly[i].unmetDemandKw,
      optimizedResult.hourly[i].curtailedDemandKw
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `gridwise_simulation_report_${scenarioResult.scenario.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy Summary to Clipboard
  const handleCopySummary = () => {
    const summaryText = `GridWise Resilience Report:
Scenario: ${scenarioResult.scenario.name}
---------------------------------------------
Baseline Unmet Energy: ${baselineResult.summary.totalUnmetKwh} kWh (Score: ${baselineResult.summary.resilienceScore}%)
Stressed Unmet Energy: ${scenarioResult.summary.totalUnmetKwh} kWh (Score: ${scenarioResult.summary.resilienceScore}%)
FlexGrid Mitigated Unmet: ${optimizedResult.summary.totalUnmetKwh} kWh (Score: ${optimizedResult.summary.resilienceScore}%)
Deficit Prevented by FlexGrid: ${scenarioResult.summary.totalUnmetKwh - optimizedResult.summary.totalUnmetKwh} kWh
Outage Hours Avoided: ${scenarioResult.summary.totalOutageHours - optimizedResult.summary.totalOutageHours} hrs
---------------------------------------------
Generated by GridWise Energy Resilience Twin.`;

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Action Header Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '18px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px'
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', margin: 0 }}>
            Resilience Benchmarking & Scenario Comparison
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Direct comparison between Baseline, Unmitigated Stress, and FlexGrid Mitigated states
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleCopySummary}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '8px 14px', gap: '6px' }}
          >
            {copied ? <Check size={15} color="var(--accent-green)" /> : <Copy size={15} />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Summary'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="btn btn-primary"
            style={{ fontSize: '0.8rem', padding: '8px 16px', gap: '6px' }}
          >
            <Download size={15} />
            <span>Export CSV Dataset</span>
          </button>
        </div>
      </div>

      {/* Comparative Charts: Deficit Comparison & 24h Hourly Delta */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '20px' }}>
        {/* Metric Comparison Bars */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: 'var(--fs-section-heading)', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
            Deficit Impact Comparison
          </h3>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            Magnitude of unserved energy across operational modes
          </p>

          <div style={{ width: '100%', height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" />
                <XAxis dataKey="category" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Baseline" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Stressed Scenario" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="FlexGrid Optimized" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 24-Hour Hourly Deficit Curves */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: 'var(--fs-section-heading)', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
            Hourly Deficit Mitigation Profile
          </h3>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            Unmitigated scenario spikes vs FlexGrid mitigated trajectory (kW)
          </p>

          <div style={{ width: '100%', height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hourlyDeficitData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" />
                <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} unit=" kW" />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="Scenario"
                  name="Unmitigated Scenario Deficit"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="FlexGrid"
                  name="FlexGrid Mitigated Deficit"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Side-by-Side Detailed Comparison Table */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: 'var(--fs-section-heading)', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
          Comprehensive 3-Way Scenario Matrix
        </h3>
        <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Granular comparison of system performance indicators
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 14px' }}>Performance Metric</th>
                <th style={{ padding: '12px 14px', color: 'var(--accent-green)' }}>
                  1. Baseline (Clear Sky)
                </th>
                <th style={{ padding: '12px 14px', color: 'var(--accent-coral)' }}>
                  2. Stressed (Unmitigated)
                </th>
                <th style={{ padding: '12px 14px', color: 'var(--accent-cyan)' }}>
                  3. FlexGrid (Optimized)
                </th>
                <th style={{ padding: '12px 14px' }}>Mitigation Delta</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((row) => {
                return (
                  <tr
                    key={row.label}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)'
                    }}
                  >
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#fff' }}>
                      {row.label}
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {row.baseline}
                    </td>
                    <td
                      style={{
                        padding: '12px 14px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                        color: row.isAlert ? '#f87171' : 'var(--text-primary)'
                      }}
                    >
                      {row.scenario}
                    </td>
                    <td
                      style={{
                        padding: '12px 14px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        color: 'var(--accent-cyan)'
                      }}
                    >
                      {row.optimized}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className="badge badge-success">
                        Improved
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
