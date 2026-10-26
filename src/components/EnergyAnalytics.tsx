import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import type { SimulationResult } from '../simulation/types';
import { MICROGRID_BUILDINGS, FEEDERS } from '../simulation/syntheticData';

interface EnergyAnalyticsProps {
  result: SimulationResult;
  currentHour: number;
}

export const EnergyAnalytics: React.FC<EnergyAnalyticsProps> = ({ result, currentHour }) => {
  const [tableSearch, setTableSearch] = useState('');
  const [tableFeederFilter, setTableFeederFilter] = useState<string>('all');
  const [tableTypeFilter, setTableTypeFilter] = useState<string>('all');

  const { hourly, summary } = result;
  const currentHourData = hourly[currentHour] || hourly[0];

  // Energy Mix Distribution Data for Donut Chart
  const energyMixData = [
    { name: 'Grid Import', value: summary.totalGridSupplyKwh, color: '#10b981' },
    { name: 'Rooftop Solar PV', value: summary.totalSolarGenKwh, color: '#f59e0b' },
    { name: 'BESS Battery', value: summary.totalBatteryDischargedKwh, color: '#a855f7' },
    ...(summary.totalCurtailedKwh > 0
      ? [{ name: 'FlexGrid Curtailed', value: summary.totalCurtailedKwh, color: '#38bdf8' }]
      : []),
    ...(summary.totalUnmetKwh > 0
      ? [{ name: 'Unmet Deficit', value: summary.totalUnmetKwh, color: '#ef4444' }]
      : [])
  ];

  // Feeder Loading Data for Current Hour
  const feederLoads = FEEDERS.map((feeder) => {
    let currentLoad = 0;
    feeder.buildingIds.forEach((bId) => {
      currentLoad += currentHourData.buildingStates[bId]?.demandKw || 0;
    });
    const pct = Math.round((currentLoad / feeder.capacityKw) * 100);
    return {
      id: feeder.id,
      name: feeder.name,
      loadKw: Math.round(currentLoad),
      capacityKw: feeder.capacityKw,
      pct,
      color: feeder.color
    };
  });

  // Buildings for telemetry table
  const filteredBuildings = MICROGRID_BUILDINGS.filter((bldg) => {
    const matchesSearch =
      bldg.name.toLowerCase().includes(tableSearch.toLowerCase()) ||
      bldg.shortName.toLowerCase().includes(tableSearch.toLowerCase());
    const matchesFeeder = tableFeederFilter === 'all' || bldg.feeder === tableFeederFilter;
    const matchesType = tableTypeFilter === 'all' || bldg.type === tableTypeFilter;
    return matchesSearch && matchesFeeder && matchesType;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 24-Hour Demand vs Supply & Unmet Analytics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '20px' }}>
        {/* Demand vs Supply 24h Area Chart */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}
          >
            <div>
              <h3 style={{ fontSize: 'var(--fs-section-heading)', fontWeight: 700, color: '#fff', margin: 0 }}>
                24-Hour Microgrid Demand vs Dispatch
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                Comparison of aggregate campus demand against grid supply, solar, and BESS discharge
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.72rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>
                Marker: <strong className="font-mono" style={{ color: 'var(--accent-cyan)' }}>Hour {currentHour}:00</strong>
              </span>
            </div>
          </div>

          <div style={{ width: '100%', height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gridGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="solarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="batteryGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" />
                <XAxis
                  dataKey="label"
                  stroke="var(--text-muted)"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={11}
                  tickLine={false}
                  unit=" kW"
                />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area
                  type="monotone"
                  dataKey="gridSupplyKw"
                  name="Grid Supply"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#gridGrad)"
                  stackId="1"
                />
                <Area
                  type="monotone"
                  dataKey="solarGenKw"
                  name="Solar PV"
                  stroke="#f59e0b"
                  fillOpacity={1}
                  fill="url(#solarGrad)"
                  stackId="1"
                />
                <Area
                  type="monotone"
                  dataKey="batteryDischargeKw"
                  name="BESS Dispatch"
                  stroke="#a855f7"
                  fillOpacity={1}
                  fill="url(#batteryGrad)"
                  stackId="1"
                />
                <Line
                  type="monotone"
                  dataKey="demandKw"
                  name="Total Demand"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 24-Hour Unmet Demand Deficit Chart */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}
          >
            <div>
              <h3 style={{ fontSize: 'var(--fs-section-heading)', fontWeight: 700, color: '#fff', margin: 0 }}>
                24-Hour Unmet Demand Deficit
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                Hourly unserved energy (kW) across microgrid
              </p>
            </div>
            <span
              className="badge"
              style={{
                backgroundColor: summary.totalUnmetKwh > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                color: summary.totalUnmetKwh > 0 ? 'var(--accent-coral)' : 'var(--accent-green)',
                border: `1px solid ${summary.totalUnmetKwh > 0 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`
              }}
            >
              {summary.totalUnmetKwh > 0 ? `${summary.totalUnmetKwh} kWh Deficit` : 'Zero Deficit'}
            </span>
          </div>

          <div style={{ width: '100%', height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" />
                <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} unit=" kW" />
                <Tooltip />
                <Bar
                  dataKey="unmetDemandKw"
                  name="Unmet Demand"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                >
                  {hourly.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.unmetDemandKw > 0 ? '#ef4444' : '#334155'}
                      opacity={entry.unmetDemandKw > 0 ? 0.9 : 0.2}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Battery State of Charge & Energy Mix */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px' }}>
        {/* Battery State of Charge & Power Flow */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}
          >
            <div>
              <h3 style={{ fontSize: 'var(--fs-section-heading)', fontWeight: 700, color: '#fff', margin: 0 }}>
                Central BESS State of Charge (SoC) & Cycling
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                4,500 kWh Capacity with 15% emergency reserve and active charging/discharging
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="font-mono" style={{ fontSize: '0.82rem', color: 'var(--accent-purple)' }}>
                Hour {currentHour}: {currentHourData.batterySocPct}% SoC
              </span>
            </div>
          </div>

          <div style={{ width: '100%', height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="socGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" />
                <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={11}
                  tickLine={false}
                  domain={[0, 100]}
                  unit="%"
                />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="batterySocPct"
                  name="Battery SoC"
                  stroke="#c084fc"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#socGrad)"
                />
                <Line
                  type="monotone"
                  dataKey="batteryDischargeKw"
                  name="Discharge Rate (kW)"
                  stroke="#f43f5e"
                  strokeWidth={1.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="batteryChargeKw"
                  name="Charge Rate (kW)"
                  stroke="#38bdf8"
                  strokeWidth={1.5}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Energy Mix 24h Distribution */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ fontSize: 'var(--fs-section-heading)', fontWeight: 700, color: '#fff', margin: 0 }}>
              24-Hour Energy Mix Breakdown
            </h3>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
              Proportion of energy sources delivered to campus
            </p>
          </div>

          <div style={{ flex: 1, minHeight: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={energyMixData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {energyMixData.map((entry, index) => (
                    <Cell key={`mix-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Mix Legend List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
            {energyMixData.map((item) => {
              const totalSum = summary.totalDemandKwh;
              const pct = totalSum > 0 ? Math.round((item.value / totalSum) * 100) : 0;
              return (
                <div
                  key={item.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.74rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                  </div>
                  <span className="font-mono" style={{ color: '#fff', fontWeight: 600 }}>
                    {item.value.toLocaleString()} kWh ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Feeder Distribution Status Bars */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: 'var(--fs-section-heading)', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
          Feeder Line Capacity & Dynamic Utilization (Hour {currentHour}:00)
        </h3>
        <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Real-time loading on distribution feeder circuits against thermal rating
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {feederLoads.map((feeder) => {
            const isOverloaded = feeder.pct > 100;
            return (
              <div
                key={feeder.id}
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff' }}>
                    {feeder.name}
                  </span>
                  <span
                    className="font-mono"
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: isOverloaded ? 'var(--accent-coral)' : feeder.color
                    }}
                  >
                    {feeder.pct}%
                  </span>
                </div>

                <div
                  style={{
                    width: '100%',
                    height: '8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(30, 41, 59, 0.8)',
                    overflow: 'hidden',
                    marginBottom: '8px'
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, feeder.pct)}%`,
                      height: '100%',
                      backgroundColor: isOverloaded ? 'var(--accent-coral)' : feeder.color,
                      borderRadius: '4px',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <span>Load: <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>{feeder.loadKw} kW</strong></span>
                  <span>Rated Limit: <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>{feeder.capacityKw} kW</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Buildings Live Telemetry Overview Table */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div>
            <h3 style={{ fontSize: 'var(--fs-section-heading)', fontWeight: 700, color: '#fff', margin: 0 }}>
              All 12 Campus Facilities Telemetry Table
            </h3>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
              Detailed live metrics for Hour {currentHour}:00
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="text"
              placeholder="Search facility..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.78rem',
                color: '#fff',
                outline: 'none'
              }}
            />
            <select
              value={tableTypeFilter}
              onChange={(e) => setTableTypeFilter(e.target.value)}
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '0.78rem',
                color: '#fff',
                outline: 'none'
              }}
            >
              <option value="all">All Types</option>
              <option value="critical">Critical Only</option>
              <option value="essential">Essential Only</option>
              <option value="standard">Standard Only</option>
            </select>
            <select
              value={tableFeederFilter}
              onChange={(e) => setTableFeederFilter(e.target.value)}
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '0.78rem',
                color: '#fff',
                outline: 'none'
              }}
            >
              <option value="all">All Feeders</option>
              <option value="feeder-a">Feeder A</option>
              <option value="feeder-b">Feeder B</option>
              <option value="feeder-c">Feeder C</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 12px' }}>Facility Name</th>
                <th style={{ padding: '10px 12px' }}>Priority</th>
                <th style={{ padding: '10px 12px' }}>Feeder</th>
                <th style={{ padding: '10px 12px' }}>Demand</th>
                <th style={{ padding: '10px 12px' }}>Grid</th>
                <th style={{ padding: '10px 12px' }}>Solar</th>
                <th style={{ padding: '10px 12px' }}>BESS Battery</th>
                <th style={{ padding: '10px 12px' }}>Unmet</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredBuildings.map((bldg) => {
                const state = currentHourData.buildingStates[bldg.id];
                const isOutage = (state?.unmetKw || 0) > 0.5;
                const isFlexed = state?.status === 'flexed';
                const isBattery = state?.status === 'battery_backed';

                return (
                  <tr
                    key={bldg.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      backgroundColor: isOutage ? 'rgba(239, 68, 68, 0.04)' : undefined
                    }}
                  >
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#fff' }}>
                      {bldg.name}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        className={
                          bldg.type === 'critical'
                            ? 'badge badge-critical'
                            : bldg.type === 'essential'
                            ? 'badge badge-essential'
                            : 'badge badge-standard'
                        }
                      >
                        {bldg.type}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                      {bldg.feeder.toUpperCase()}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: '#fff' }}>
                      {state?.demandKw || 0} kW
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>
                      {state?.gridKw || 0} kW
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)' }}>
                      {state?.solarKw || 0} kW
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: 'var(--accent-purple)' }}>
                      {state?.batteryKw || 0} kW
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: isOutage ? 700 : 400,
                        color: isOutage ? 'var(--accent-coral)' : 'var(--text-muted)'
                      }}
                    >
                      {state?.unmetKw || 0} kW
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          color: isOutage
                            ? 'var(--accent-coral)'
                            : isBattery
                            ? 'var(--accent-cyan)'
                            : isFlexed
                            ? 'var(--accent-amber)'
                            : 'var(--accent-green)'
                        }}
                      >
                        {isOutage
                          ? 'Outage / Deficit'
                          : isBattery
                          ? 'Battery Backed'
                          : isFlexed
                          ? 'Load Shifted'
                          : 'Normal Powered'}
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
