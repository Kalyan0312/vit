import React, { useEffect, useRef, useState, useCallback } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import {
  Compass,
  Plus,
  Minus,
  X,
  AlertTriangle,
  Layers,
  Map as MapIcon,
  Globe,
  Radio,
  RefreshCw,
  Info
} from 'lucide-react';
import type { SimulationResult } from '../simulation/types';
import { MICROGRID_BUILDINGS, FEEDERS } from '../simulation/syntheticData';
import {
  DISTRICT_CENTER,
  SUBSTATION_NODE,
  BESS_NODE,
  BUILDING_GEO_MAP
} from '../simulation/geoData';
import { BuildingDrawer } from './BuildingDrawer';
import { GOOGLE_MAPS_DARK_STYLE, createHTMLOverlay } from './googleMapStyles';

interface GridTwinMapProps {
  result: SimulationResult;
  currentHour: number;
}

type MapTheme = 'dark' | 'satellite' | 'hybrid' | 'roadmap';

// Helper to compute rectangular polygon coordinates from center + width/depth in meters
function computeBuildingBounds(lng: number, lat: number, widthM: number, depthM: number): google.maps.LatLngLiteral[] {
  const dLng = widthM / (2 * 88000);
  const dLat = depthM / (2 * 111000);
  return [
    { lat: lat - dLat, lng: lng - dLng },
    { lat: lat - dLat, lng: lng + dLng },
    { lat: lat + dLat, lng: lng + dLng },
    { lat: lat + dLat, lng: lng - dLng }
  ];
}

export const GridTwinMap: React.FC<GridTwinMapProps> = ({ result, currentHour }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  // References to active Google Maps overlays
  const buildingPolygonsRef = useRef<Record<string, google.maps.Polygon>>({});
  const solarPolygonsRef = useRef<Record<string, google.maps.Polygon>>({});
  const feederLinesRef = useRef<google.maps.Polyline[]>([]);
  const activeFlowLinesRef = useRef<google.maps.Polyline[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const htmlOverlaysRef = useRef<google.maps.OverlayView[]>([]);

  // UI state
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>('bldg-hospital');
  const [showSubstationModal, setShowSubstationModal] = useState<boolean>(false);
  const [showBessModal, setShowBessModal] = useState<boolean>(false);
  const [mapTheme, setMapTheme] = useState<MapTheme>('dark');
  const [filterType, setFilterType] = useState<'all' | 'critical' | 'outage' | 'battery'>('all');
  const [isApiLoading, setIsApiLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<boolean>(false);

  // Layer Toggles
  const [showBuildings, setShowBuildings] = useState<boolean>(true);
  const [showFeeders, setShowFeeders] = useState<boolean>(true);
  const [showPowerFlow, setShowPowerFlow] = useState<boolean>(true);
  const [showSolar, setShowSolar] = useState<boolean>(true);
  const [showBess, setShowBess] = useState<boolean>(true);
  const [showOutageGlow, setShowOutageGlow] = useState<boolean>(true);

  // Hover Tooltip state
  const [hoveredBuilding, setHoveredBuilding] = useState<{
    x: number;
    y: number;
    building: (typeof MICROGRID_BUILDINGS)[number];
    demandKw: number;
    status: string;
    unmetKw: number;
  } | null>(null);

  const currentHourData = result.hourly[currentHour] || result.hourly[0];
  const { buildingStates } = currentHourData;

  const selectedBuilding = MICROGRID_BUILDINGS.find((b) => b.id === selectedBuildingId) || null;
  const selectedState = selectedBuildingId ? buildingStates[selectedBuildingId] : undefined;

  // Retrieve API Key safely without logging or exposing
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // 1. Initialize Google Maps
  useEffect(() => {
    // Detect missing API Key
    if (!apiKey || apiKey.trim() === '') {
      setIsApiLoading(false);
      setApiError('MISSING_KEY');
      return;
    }

    let isMounted = true;

    // Listen for Google Maps Authentication / Billing failure
    (window as any).gm_authFailure = () => {
      if (isMounted) {
        setAuthError(true);
        setApiError('AUTH_FAILURE');
      }
    };

    setOptions({
      key: apiKey,
      v: 'weekly'
    });

    Promise.all([
      importLibrary('maps'),
      importLibrary('geometry')
    ])
      .then(([mapsLib]) => {
        if (!isMounted || !mapContainerRef.current) return;

        const { Map } = mapsLib as google.maps.MapsLibrary;

        const mapInstance = new Map(mapContainerRef.current, {
          center: { lat: DISTRICT_CENTER[1], lng: DISTRICT_CENTER[0] },
          zoom: 16,
          heading: 0,
          tilt: 0,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          styles: GOOGLE_MAPS_DARK_STYLE,
          disableDefaultUI: true,
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          backgroundColor: '#070b16'
        });

        mapRef.current = mapInstance;
        setIsApiLoading(false);
        setApiError(null);
      })
      .catch((err: Error) => {
        if (!isMounted) return;
        setIsApiLoading(false);
        setApiError(err?.message || 'Failed to initialize Google Maps JavaScript API.');
      });

    return () => {
      isMounted = false;
    };
  }, [apiKey]);

  // 2. Change Map Theme (Dark, Satellite, Hybrid, Roadmap)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (mapTheme === 'dark') {
      map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
      map.setOptions({ styles: GOOGLE_MAPS_DARK_STYLE });
    } else if (mapTheme === 'satellite') {
      map.setMapTypeId(google.maps.MapTypeId.SATELLITE);
      map.setOptions({ styles: [] });
    } else if (mapTheme === 'hybrid') {
      map.setMapTypeId(google.maps.MapTypeId.HYBRID);
      map.setOptions({ styles: [] });
    } else {
      map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
      map.setOptions({ styles: [] });
    }
  }, [mapTheme]);

  // 3. Render HTML Custom Markers (Substation, BESS, Critical Facilities)
  const updateHtmlMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove existing overlays
    htmlOverlaysRef.current.forEach((overlay) => overlay.setMap(null));
    htmlOverlaysRef.current = [];

    // 1. Substation Node Marker
    const subEl = document.createElement('div');
    subEl.style.transform = 'translate(-50%, -100%)';
    subEl.innerHTML = `
      <div style="
        background: rgba(15, 23, 42, 0.95);
        border: 2px solid ${currentHourData.gridSupplyKw > 500 ? '#38bdf8' : '#ef4444'};
        box-shadow: 0 0 16px ${currentHourData.gridSupplyKw > 500 ? 'rgba(56, 189, 248, 0.4)' : 'rgba(239, 68, 68, 0.5)'};
        padding: 8px 12px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-family: system-ui, sans-serif;
        white-space: nowrap;
        user-select: none;
      ">
        <div style="width: 12px; height: 12px; border-radius: 50%; background: ${currentHourData.gridSupplyKw > 500 ? '#38bdf8' : '#ef4444'}; box-shadow: 0 0 8px currentColor;"></div>
        <div>
          <div style="font-size: 14px; font-weight: 700; color: #fff;">115kV SUBSTATION</div>
          <div style="font-size: 13px; font-family: monospace; color: #38bdf8; font-weight: 600;">${currentHourData.gridSupplyKw.toLocaleString()} kW Grid</div>
        </div>
      </div>
    `;
    subEl.onclick = (e) => {
      e.stopPropagation();
      setShowSubstationModal(true);
    };

    const subOverlay = createHTMLOverlay(
      { lat: SUBSTATION_NODE.lat, lng: SUBSTATION_NODE.lng },
      subEl,
      map
    );
    htmlOverlaysRef.current.push(subOverlay);

    // 2. Central BESS Marker with Live Charge/Discharge State
    if (showBess) {
      const isBessOffline = currentHourData.isScenarioActive && result.scenario.batteryOutage;
      const isDischarging = currentHourData.batteryDischargeKw > 0;
      const isCharging = currentHourData.batteryChargeKw > 0;
      const bessColor = isBessOffline ? '#ef4444' : isDischarging ? '#f59e0b' : isCharging ? '#10b981' : '#a855f7';
      const bessText = isBessOffline
        ? 'OFFLINE / TRIPPED'
        : isDischarging
        ? `DISCHARGING (${Math.round(currentHourData.batteryDischargeKw)} kW)`
        : isCharging
        ? `CHARGING (${Math.round(currentHourData.batteryChargeKw)} kW)`
        : 'STANDBY (0 kW)';

      const bessEl = document.createElement('div');
      bessEl.style.transform = 'translate(-50%, -100%)';
      bessEl.innerHTML = `
        <div style="
          background: rgba(15, 23, 42, 0.95);
          border: 2px solid ${bessColor};
          box-shadow: 0 0 16px ${bessColor}55;
          padding: 8px 12px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: system-ui, sans-serif;
          white-space: nowrap;
          user-select: none;
          cursor: pointer;
        " class="${isDischarging || isCharging ? 'bess-charging-pulse' : ''}">
          <div style="width: 12px; height: 12px; border-radius: 50%; background: ${bessColor}; box-shadow: 0 0 8px currentColor;"></div>
          <div>
            <div style="font-size: 14px; font-weight: 700; color: #fff;">CENTRAL BESS HUB</div>
            <div style="font-size: 13px; font-family: monospace; color: ${bessColor}; font-weight: 600;">
              ${currentHourData.batterySocPct}% SoC · ${bessText}
            </div>
          </div>
        </div>
      `;
      bessEl.onclick = (e) => {
        e.stopPropagation();
        setShowBessModal(true);
      };

      const bessOverlay = createHTMLOverlay(
        { lat: BESS_NODE.lat, lng: BESS_NODE.lng },
        bessEl,
        map
      );
      htmlOverlaysRef.current.push(bessOverlay);
    }

    // 3. Floating Building Status Badges for All 12 Microgrid Facilities
    MICROGRID_BUILDINGS.forEach((bldg) => {
      const geo = BUILDING_GEO_MAP[bldg.id];
      if (!geo) return;
      const state = buildingStates[bldg.id];
      const isOutage = (state?.unmetKw || 0) > 0.5;
      const isBattery = state?.status === 'battery_backed';
      const isFlexed = state?.status === 'flexed';
      const isCritical = bldg.type === 'critical';

      let statusBadge = 'POWERED';
      let badgeColor = '#10b981'; // Green
      if (isOutage) {
        statusBadge = isCritical ? 'SHORTAGE ⚠' : 'OUTAGE';
        badgeColor = '#ef4444'; // Red
      } else if (isBattery) {
        statusBadge = 'BATTERY';
        badgeColor = '#38bdf8'; // Cyan
      } else if (isFlexed) {
        statusBadge = 'FLEXED';
        badgeColor = '#f59e0b'; // Amber
      }

      const critSymbol =
        bldg.id === 'bldg-hospital' ? '✚ ' :
        bldg.id === 'bldg-911' ? '🛡️ ' :
        bldg.id === 'bldg-water' ? '💧 ' :
        bldg.id === 'bldg-datacenter' ? '⚡ ' : '';

      const bldgEl = document.createElement('div');
      bldgEl.style.transform = 'translate(-50%, -150%)';
      bldgEl.innerHTML = `
        <div style="
          background: rgba(10, 15, 29, 0.94);
          border: 1px solid ${isOutage ? '#ef4444' : selectedBuildingId === bldg.id ? '#38bdf8' : 'rgba(255, 255, 255, 0.25)'};
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.75);
          padding: 6px 12px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 15px;
          font-weight: 600;
          color: #f8fafc;
          user-select: none;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        " class="${isOutage && isCritical ? 'critical-outage-pulse' : ''}">
          <span style="font-weight: 700; letter-spacing: -0.01em;">${critSymbol}${bldg.shortName}</span>
          <span style="
            font-size: 13px;
            font-weight: 700;
            padding: 3px 8px;
            border-radius: 4px;
            background: ${badgeColor}25;
            border: 1px solid ${badgeColor}60;
            color: ${badgeColor};
            letter-spacing: 0.03em;
            transition: all 0.2s ease;
          ">${statusBadge}</span>
        </div>
      `;
      bldgEl.onclick = (e) => {
        e.stopPropagation();
        setSelectedBuildingId(bldg.id);
      };

      const bldgOverlay = createHTMLOverlay(
        { lat: geo.lat, lng: geo.lng },
        bldgEl,
        map
      );
      htmlOverlaysRef.current.push(bldgOverlay);
    });
  }, [currentHourData, result.scenario, buildingStates, showBess, selectedBuildingId]);

  // 4. Render Building and Solar Polygons
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Filter buildings
    const filteredIds = new Set(
      MICROGRID_BUILDINGS.filter((b) => {
        if (filterType === 'critical') return b.type === 'critical';
        if (filterType === 'outage') return (buildingStates[b.id]?.unmetKw || 0) > 0.5;
        if (filterType === 'battery') return (buildingStates[b.id]?.batteryKw || 0) > 5;
        return true;
      }).map((b) => b.id)
    );

    // Update Building Footprint Polygons
    MICROGRID_BUILDINGS.forEach((bldg) => {
      const geo = BUILDING_GEO_MAP[bldg.id];
      if (!geo) return;

      const state = buildingStates[bldg.id];
      const isOutage = (state?.unmetKw || 0) > 0.5;
      const isBattery = state?.status === 'battery_backed';
      const isFlexed = state?.status === 'flexed';
      const isSelected = selectedBuildingId === bldg.id;
      const isVisible = showBuildings && filteredIds.has(bldg.id);

      // Determine building status color
      let fillColor = '#10b981'; // Green (Normal)
      if (isOutage) {
        fillColor = '#ef4444'; // Red (Outage)
      } else if (isBattery) {
        fillColor = '#38bdf8'; // Cyan (Battery)
      } else if (isFlexed) {
        fillColor = '#f59e0b'; // Amber (Flexed)
      }

      let poly = buildingPolygonsRef.current[bldg.id];

      if (!poly) {
        const bounds = computeBuildingBounds(geo.lng, geo.lat, geo.widthM, geo.depthM);
        poly = new google.maps.Polygon({
          paths: bounds,
          strokeColor: isSelected ? '#ffffff' : fillColor,
          strokeOpacity: isSelected ? 1 : 0.85,
          strokeWeight: isSelected ? 3 : 1.5,
          fillColor,
          fillOpacity: 0.65,
          clickable: true,
          map: isVisible ? map : null
        });

        // Click handler
        poly.addListener('click', () => {
          setSelectedBuildingId(bldg.id);
        });

        // Hover handlers
        poly.addListener('mousemove', (e: google.maps.MapMouseEvent) => {
          if (!mapContainerRef.current || !e.latLng) return;
          const rect = mapContainerRef.current.getBoundingClientRect();
          const currentState = buildingStates[bldg.id];
          setHoveredBuilding({
            x: rect.width / 2,
            y: rect.height / 2,
            building: bldg,
            demandKw: currentState?.demandKw || 0,
            status: currentState?.status || 'normal',
            unmetKw: currentState?.unmetKw || 0
          });
        });

        poly.addListener('mouseout', () => {
          setHoveredBuilding(null);
        });

        buildingPolygonsRef.current[bldg.id] = poly;
      } else {
        // Update polygon appearance
        poly.setMap(isVisible ? map : null);
        poly.setOptions({
          fillColor,
          fillOpacity: isOutage && showOutageGlow ? 0.85 : 0.65,
          strokeColor: isSelected ? '#ffffff' : isOutage ? '#ef4444' : fillColor,
          strokeWeight: isSelected ? 3 : isOutage ? 2.5 : 1.5
        });
      }

      // Rooftop Solar Polygon
      if (bldg.solarCapacityKw > 0) {
        let solarPoly = solarPolygonsRef.current[bldg.id];
        const isSolarVisible = showSolar && isVisible;

        if (!solarPoly) {
          const solarBounds = computeBuildingBounds(
            geo.lng + 0.0001,
            geo.lat + 0.0001,
            geo.widthM * 0.7,
            geo.depthM * 0.6
          );

          solarPoly = new google.maps.Polygon({
            paths: solarBounds,
            strokeColor: '#38bdf8',
            strokeOpacity: 0.9,
            strokeWeight: 1,
            fillColor: '#0284c7',
            fillOpacity: 0.75,
            clickable: false,
            map: isSolarVisible ? map : null
          });

          solarPolygonsRef.current[bldg.id] = solarPoly;
        } else {
          solarPoly.setMap(isSolarVisible ? map : null);
        }
      }
    });

    updateHtmlMarkers();
  }, [buildingStates, filterType, selectedBuildingId, showBuildings, showSolar, showOutageGlow, updateHtmlMarkers]);

  // 5. Render Feeder Lines & Dynamic Power Flow Animation
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous animation loop
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    // Clear existing feeder lines
    feederLinesRef.current.forEach((line) => line.setMap(null));
    feederLinesRef.current = [];
    activeFlowLinesRef.current = [];

    if (!showFeeders) return;

    // Draw feeder lines from Substation to buildings
    FEEDERS.forEach((feeder) => {
      const isSevered = currentHourData.isScenarioActive && result.scenario.feederOutage === feeder.id;

      feeder.buildingIds.forEach((bldgId) => {
        const geo = BUILDING_GEO_MAP[bldgId];
        if (!geo) return;

        const midLat = (SUBSTATION_NODE.lat + geo.lat) / 2;
        const path: google.maps.LatLngLiteral[] = [
          { lat: SUBSTATION_NODE.lat, lng: SUBSTATION_NODE.lng },
          { lat: midLat, lng: SUBSTATION_NODE.lng },
          { lat: midLat, lng: geo.lng },
          { lat: geo.lat, lng: geo.lng }
        ];

        // Background glow line
        const glowLine = new google.maps.Polyline({
          path,
          strokeColor: isSevered ? '#ef4444' : feeder.color,
          strokeOpacity: isSevered ? 0.15 : 0.25,
          strokeWeight: 6,
          clickable: false,
          map
        });
        feederLinesRef.current.push(glowLine);

        if (isSevered) {
          // Severed/Tripped Feeder: Dashed Red Line, No Particles
          const severedLine = new google.maps.Polyline({
            path,
            strokeColor: '#ef4444',
            strokeOpacity: 0,
            icons: [
              {
                icon: {
                  path: 'M -2,0 2,0',
                  strokeColor: '#ef4444',
                  strokeOpacity: 0.9,
                  strokeWeight: 2.5,
                  scale: 3
                },
                offset: '0',
                repeat: '14px'
              }
            ],
            clickable: false,
            map
          });
          feederLinesRef.current.push(severedLine);
        } else {
          // Active Energized Feeder: Traveling Glowing Power Particles
          const coreLine = new google.maps.Polyline({
            path,
            strokeColor: feeder.color,
            strokeOpacity: 0.85,
            strokeWeight: 2.5,
            icons: showPowerFlow
              ? [
                  {
                    icon: {
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: 3.5,
                      fillColor: '#ffffff',
                      fillOpacity: 1,
                      strokeColor: feeder.color,
                      strokeWeight: 1.5
                    },
                    offset: '0%'
                  },
                  {
                    icon: {
                      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                      scale: 2.5,
                      fillColor: feeder.color,
                      fillOpacity: 0.95,
                      strokeColor: '#ffffff',
                      strokeWeight: 1
                    },
                    offset: '50%'
                  }
                ]
              : undefined,
            clickable: false,
            map
          });
          feederLinesRef.current.push(coreLine);
          if (showPowerFlow) {
            activeFlowLinesRef.current.push(coreLine);
          }
        }
      });
    });

    // Central BESS to Substation Trunk Line with Power Flow
    if (showBess) {
      const isBessSevered = currentHourData.isScenarioActive && result.scenario.batteryOutage;
      const isDischarging = currentHourData.batteryDischargeKw > 0;
      const isCharging = currentHourData.batteryChargeKw > 0;

      // When discharging: power flows BESS -> Substation. When charging: Substation -> BESS
      const bessBaseCoords: google.maps.LatLngLiteral[] = [
        { lat: SUBSTATION_NODE.lat, lng: SUBSTATION_NODE.lng },
        { lat: (SUBSTATION_NODE.lat + BESS_NODE.lat) / 2, lng: SUBSTATION_NODE.lng },
        { lat: (SUBSTATION_NODE.lat + BESS_NODE.lat) / 2, lng: BESS_NODE.lng },
        { lat: BESS_NODE.lat, lng: BESS_NODE.lng }
      ];

      const bessPath = isDischarging ? [...bessBaseCoords].reverse() : bessBaseCoords;
      const bessColor = isBessSevered ? '#ef4444' : isDischarging ? '#f59e0b' : isCharging ? '#10b981' : '#a855f7';

      const bessLine = new google.maps.Polyline({
        path: bessPath,
        strokeColor: bessColor,
        strokeOpacity: 0.9,
        strokeWeight: 3.5,
        icons: showPowerFlow && (isDischarging || isCharging)
          ? [
              {
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 4,
                  fillColor: '#ffffff',
                  fillOpacity: 1,
                  strokeColor: bessColor,
                  strokeWeight: 1.5
                },
                offset: '0%'
              },
              {
                icon: {
                  path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                  scale: 3,
                  fillColor: bessColor,
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 1
                },
                offset: '50%'
              }
            ]
          : undefined,
        clickable: false,
        map
      });
      feederLinesRef.current.push(bessLine);
      if (showPowerFlow && (isDischarging || isCharging)) {
        activeFlowLinesRef.current.push(bessLine);
      }
    }

    // High-performance requestAnimationFrame icon offset animation
    if (showPowerFlow && activeFlowLinesRef.current.length > 0) {
      let count = 0;
      // Speed scales with grid supply power
      const speed = Math.max(0.4, Math.min(1.2, currentHourData.gridSupplyKw / 3500));

      const animateFlow = () => {
        count = (count + speed) % 100;
        activeFlowLinesRef.current.forEach((line) => {
          const icons = line.get('icons');
          if (icons && icons.length >= 2) {
            icons[0].offset = `${count}%`;
            icons[1].offset = `${(count + 50) % 100}%`;
            line.set('icons', icons);
          }
        });
        animFrameRef.current = requestAnimationFrame(animateFlow);
      };

      animFrameRef.current = requestAnimationFrame(animateFlow);
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [showFeeders, showBess, showPowerFlow, currentHourData, result.scenario]);

  // Camera Actions
  const handleZoomIn = () => {
    const map = mapRef.current;
    if (map) map.setZoom((map.getZoom() || 16) + 1);
  };

  const handleZoomOut = () => {
    const map = mapRef.current;
    if (map) map.setZoom((map.getZoom() || 16) - 1);
  };

  const handleResetCamera = () => {
    const map = mapRef.current;
    if (map) {
      map.panTo({ lat: DISTRICT_CENTER[1], lng: DISTRICT_CENTER[0] });
      map.setZoom(16);
      map.setHeading(0);
      map.setTilt(0);
    }
  };

  const handleToggle45Tilt = () => {
    const map = mapRef.current;
    if (!map) return;
    const currentTilt = map.getTilt() || 0;
    map.setTilt(currentTilt === 45 ? 0 : 45);
  };

  return (
    <div
      className="glass-panel"
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        height: 'calc(100vh - 220px)',
        minHeight: '620px'
      }}
    >
      {/* Top Map Control Toolbar */}
      <div
        style={{
          padding: '10px 18px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'rgba(10, 15, 29, 0.88)',
          backdropFilter: 'blur(10px)',
          flexWrap: 'wrap',
          gap: '12px',
          zIndex: 20
        }}
      >
        {/* Left: Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'var(--fs-legend)', fontWeight: 600, color: 'var(--text-muted)', marginRight: '4px' }}>
            Filter:
          </span>
          {[
            { id: 'all', label: 'All 12 Facilities' },
            { id: 'critical', label: 'Critical Assets (4)' },
            { id: 'outage', label: `In Outage (${currentHourData.buildingsAffectedCount})` },
            { id: 'battery', label: 'Battery Backed' }
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setFilterType(pill.id as any)}
              style={{
                fontSize: 'var(--fs-btn)',
                fontWeight: 600,
                padding: '6px 14px',
                borderRadius: '6px',
                border: filterType === pill.id ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                backgroundColor: filterType === pill.id ? 'rgba(56, 189, 248, 0.18)' : 'rgba(15, 23, 42, 0.7)',
                color: filterType === pill.id ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Center: Map Theme Selectors */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            padding: '3px'
          }}
        >
          {[
            { id: 'dark' as MapTheme, label: 'Dark Cyber', icon: Radio },
            { id: 'satellite' as MapTheme, label: 'Satellite', icon: Globe },
            { id: 'hybrid' as MapTheme, label: 'Hybrid', icon: Layers },
            { id: 'roadmap' as MapTheme, label: 'Roadmap', icon: MapIcon }
          ].map((theme) => {
            const Icon = theme.icon;
            const active = mapTheme === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => setMapTheme(theme.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: 'var(--fs-btn)',
                  fontWeight: active ? 700 : 500,
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: active ? 'var(--accent-cyan)' : 'transparent',
                  color: active ? '#050b14' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={14} />
                <span>{theme.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Layer Checkbox Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: 'var(--fs-body-sm)', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showBuildings}
              onChange={(e) => setShowBuildings(e.target.checked)}
              style={{ accentColor: 'var(--accent-green)', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: 500 }}>Buildings</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showFeeders}
              onChange={(e) => setShowFeeders(e.target.checked)}
              style={{ accentColor: 'var(--accent-cyan)', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: 500 }}>Feeders</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showPowerFlow}
              onChange={(e) => setShowPowerFlow(e.target.checked)}
              style={{ accentColor: 'var(--accent-cyan)', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: 500 }}>⚡ Flow</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showSolar}
              onChange={(e) => setShowSolar(e.target.checked)}
              style={{ accentColor: 'var(--accent-amber)', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: 500 }}>Solar PV</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showBess}
              onChange={(e) => setShowBess(e.target.checked)}
              style={{ accentColor: 'var(--accent-purple)', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: 500 }}>BESS Storage</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showOutageGlow}
              onChange={(e) => setShowOutageGlow(e.target.checked)}
              style={{ accentColor: 'var(--accent-coral)', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: 500 }}>Outages</span>
          </label>
        </div>
      </div>

      {/* Main Map Container */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Real Google Map Element */}
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

        {/* Notice & Disclaimer Banner */}
        <div
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            backgroundColor: 'rgba(11, 17, 32, 0.92)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: 'var(--fs-legend)',
            color: 'var(--text-secondary)',
            zIndex: 10,
            backdropFilter: 'blur(8px)',
            maxWidth: '560px'
          }}
        >
          <Info size={16} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
          <span>
            <strong style={{ color: '#fff' }}>Simulation Model:</strong> Digital Twin research testbed. Feeder paths & energy telemetry are simulated models, not verified utility infrastructure.
          </span>
        </div>

        {/* Floating Map Navigation Controls */}
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 10
          }}
        >
          {/* Reset Camera / Fit Study Area */}
          <button
            onClick={handleResetCamera}
            className="btn btn-secondary"
            style={{
              padding: '8px 14px',
              fontSize: 'var(--fs-btn)',
              gap: '8px',
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              backdropFilter: 'blur(8px)'
            }}
            title="Reset camera to study district center"
          >
            <Compass size={16} />
            <span>Fit Study Area</span>
          </button>

          {/* 45 Degree Oblique Aerial Toggle */}
          <button
            onClick={handleToggle45Tilt}
            className="btn btn-secondary"
            style={{
              padding: '8px 14px',
              fontSize: 'var(--fs-btn)',
              gap: '8px',
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              backdropFilter: 'blur(8px)'
            }}
            title="Toggle 45 degree oblique camera tilt in supported views"
          >
            <Radio size={16} />
            <span>45° Oblique Tilt</span>
          </button>

          {/* Zoom Controls */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              overflow: 'hidden',
              backdropFilter: 'blur(8px)'
            }}
          >
            <button
              onClick={handleZoomIn}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--border-subtle)',
                color: '#fff',
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Zoom in"
            >
              <Plus size={15} />
            </button>
            <button
              onClick={handleZoomOut}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Zoom out"
            >
              <Minus size={15} />
            </button>
          </div>
        </div>

        {/* Missing API Key Error Panel */}
        {apiError === 'MISSING_KEY' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(7, 11, 22, 0.94)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              zIndex: 30,
              backdropFilter: 'blur(12px)'
            }}
          >
            <div
              style={{
                maxWidth: '520px',
                width: '100%',
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid var(--border-medium)',
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center',
                boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid var(--accent-amber)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}
              >
                <AlertTriangle size={24} style={{ color: 'var(--accent-amber)' }} />
              </div>

              <h3 style={{ fontSize: 'var(--fs-major-heading)', fontWeight: 700, color: '#fff', margin: '0 0 10px' }}>
                Google Maps API Key Missing
              </h3>

              <p style={{ fontSize: 'var(--fs-body)', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 20px' }}>
                The GridTwin map requires a Google Maps JavaScript API key to display the live geospatial view.
              </p>

              <div
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '14px 18px',
                  textAlign: 'left',
                  fontFamily: 'monospace',
                  fontSize: 'var(--fs-body-sm)',
                  color: 'var(--accent-cyan)',
                  marginBottom: '20px'
                }}
              >
                <div style={{ color: 'var(--text-muted)', marginBottom: '6px' }}># In .env.local:</div>
                <div>VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here</div>
              </div>

              <div style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                <strong style={{ color: '#fff' }}>Setup Steps:</strong>
                <ol style={{ paddingLeft: '20px', margin: '8px 0 0', lineHeight: 1.6 }}>
                  <li>Obtain a key from the Google Cloud Console with Maps JavaScript API enabled.</li>
                  <li>Add it to <code style={{ color: 'var(--accent-cyan)' }}>.env.local</code> in the project root.</li>
                  <li>Restart the Vite development server.</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* API Load / Auth / Billing Error Panel */}
        {(authError || (apiError && apiError !== 'MISSING_KEY')) && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(7, 11, 22, 0.94)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              zIndex: 30,
              backdropFilter: 'blur(12px)'
            }}
          >
            <div
              style={{
                maxWidth: '560px',
                width: '100%',
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '12px',
                padding: '28px',
                textAlign: 'center',
                boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid var(--accent-coral)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}
              >
                <AlertTriangle size={28} style={{ color: 'var(--accent-coral)' }} />
              </div>

              <h3 style={{ fontSize: 'var(--fs-major-heading)', fontWeight: 700, color: '#fff', margin: '0 0 10px' }}>
                Google Maps Authorization or Billing Issue
              </h3>

              <p style={{ fontSize: 'var(--fs-body)', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 20px' }}>
                Google Maps reported an authentication or billing error (<code style={{ color: 'var(--accent-coral)' }}>gm_authFailure</code>).
              </p>

              <div
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '14px 18px',
                  textAlign: 'left',
                  fontSize: 'var(--fs-body-sm)',
                  color: 'var(--text-secondary)',
                  marginBottom: '24px',
                  lineHeight: 1.6
                }}
              >
                <strong style={{ color: '#fff' }}>Common solutions:</strong>
                <ul style={{ paddingLeft: '20px', margin: '6px 0 0' }}>
                  <li><strong>Enable Billing:</strong> Ensure an active Billing Account is linked to the project in Google Cloud Console.</li>
                  <li><strong>Enable Maps API:</strong> Verify that &quot;Maps JavaScript API&quot; is enabled in APIs &amp; Services.</li>
                  <li><strong>Key Restrictions:</strong> If HTTP Referrer restrictions are enabled, add <code style={{ color: 'var(--accent-cyan)' }}>http://localhost:*/*</code>.</li>
                </ul>
              </div>

              <button
                onClick={() => window.location.reload()}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: 'var(--fs-btn)' }}
              >
                <RefreshCw size={16} />
                <span>Reload Application</span>
              </button>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {isApiLoading && !apiError && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(7, 11, 22, 0.85)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 25,
              backdropFilter: 'blur(6px)'
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                border: '3px solid rgba(56, 189, 248, 0.2)',
                borderTopColor: 'var(--accent-cyan)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }}
            />
            <div style={{ marginTop: '12px', fontSize: '0.84rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Connecting to Google Maps API...
            </div>
          </div>
        )}

        {/* Hover Tooltip */}
        {hoveredBuilding && (
          <div
            style={{
              position: 'absolute',
              left: `${hoveredBuilding.x + 15}px`,
              top: `${hoveredBuilding.y - 15}px`,
              backgroundColor: 'rgba(10, 15, 29, 0.95)',
              border: '1px solid var(--border-medium)',
              borderRadius: '8px',
              padding: '10px 14px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
              pointerEvents: 'none',
              zIndex: 30,
              fontSize: 'var(--fs-legend)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            <strong style={{ color: '#fff', fontSize: 'var(--fs-body)' }}>
              {hoveredBuilding.building.name}
            </strong>
            <div style={{ color: 'var(--text-secondary)' }}>
              Demand: <span className="font-mono" style={{ color: '#38bdf8', fontWeight: 600 }}>{hoveredBuilding.demandKw} kW</span>
            </div>
            {hoveredBuilding.unmetKw > 0 && (
              <div style={{ color: '#f87171', fontWeight: 600 }}>
                Unmet Deficit: {hoveredBuilding.unmetKw} kW
              </div>
            )}
            <div style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-muted)' }}>
              Click to open detailed telemetry inspector
            </div>
          </div>
        )}

        {/* Substation Detail Modal */}
        {showSubstationModal && (
          <div
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '400px',
              backgroundColor: 'rgba(11, 17, 32, 0.96)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.65)',
              padding: '20px 24px',
              zIndex: 50,
              backdropFilter: 'blur(12px)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <span className="badge badge-standard">Grid Transmission Node</span>
                <h3 style={{ fontSize: 'var(--fs-card-heading)', fontWeight: 700, color: '#fff', margin: '6px 0 0 0' }}>
                  {SUBSTATION_NODE.name}
                </h3>
              </div>
              <button
                onClick={() => setShowSubstationModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: 'var(--fs-body-sm)' }}>
              <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: 'rgba(15, 23, 42, 0.8)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-meta)' }}>Delivered Grid Power (Hour {currentHour}:00):</span>
                <div className="font-mono" style={{ fontSize: 'var(--fs-kpi-value)', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '2px' }}>
                  {currentHourData.gridSupplyKw.toLocaleString()} kW
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Substation Rated Capacity:</span>
                <span className="font-mono" style={{ color: '#fff', fontWeight: 600 }}>4,800 kW</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Intertie Status:</span>
                <span style={{ color: currentHourData.gridSupplyKw > 0 ? 'var(--accent-green)' : 'var(--accent-coral)', fontWeight: 600 }}>
                  {currentHourData.gridSupplyKw > 0 ? 'Energized & Synchronized' : 'Transmission Interrupted'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Connected Feeders:</span>
                <span style={{ color: '#fff', fontWeight: 500 }}>Feeder 1, Feeder 2, Feeder 3</span>
              </div>
            </div>
          </div>
        )}

        {/* Central BESS Detail Modal */}
        {showBessModal && (
          <div
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '400px',
              backgroundColor: 'rgba(11, 17, 32, 0.96)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.65)',
              padding: '20px 24px',
              zIndex: 50,
              backdropFilter: 'blur(12px)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <span className="badge badge-essential">Microgrid Energy Storage</span>
                <h3 style={{ fontSize: 'var(--fs-card-heading)', fontWeight: 700, color: '#fff', margin: '6px 0 0 0' }}>
                  {BESS_NODE.name}
                </h3>
              </div>
              <button
                onClick={() => setShowBessModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: 'var(--fs-body-sm)' }}>
              <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: 'rgba(15, 23, 42, 0.8)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-meta)' }}>State of Charge (Hour {currentHour}:00):</span>
                <div className="font-mono" style={{ fontSize: 'var(--fs-kpi-value)', fontWeight: 700, color: 'var(--accent-purple)', marginTop: '2px' }}>
                  {currentHourData.batterySocPct}% ({currentHourData.batterySocKwh.toLocaleString()} kWh)
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Nameplate Capacity:</span>
                <span className="font-mono" style={{ color: '#fff', fontWeight: 600 }}>4,500 kWh</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Active Discharge Rate:</span>
                <span className="font-mono" style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>
                  {currentHourData.batteryDischargeKw.toLocaleString()} kW
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Active Charge Rate:</span>
                <span className="font-mono" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                  {currentHourData.batteryChargeKw.toLocaleString()} kW
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Emergency Reserve Floor:</span>
                <span className="font-mono" style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>15% (675 kWh)</span>
              </div>
            </div>
          </div>
        )}

        {/* Selected Building Detail Drawer */}
        <BuildingDrawer
          building={selectedBuilding}
          buildingState={selectedState}
          result={result}
          currentHour={currentHour}
          onClose={() => setSelectedBuildingId(null)}
        />
      </div>

      {/* Map Legend Footer */}
      <div
        style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(10, 15, 29, 0.92)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          zIndex: 20
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', fontSize: 'var(--fs-legend)' }}>
          <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Energy Status:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span style={{ width: '11px', height: '11px', borderRadius: '3px', backgroundColor: '#10b981' }} />
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Normal / Powered (Green)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span style={{ width: '11px', height: '11px', borderRadius: '3px', backgroundColor: '#38bdf8' }} />
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>BESS Battery Backed (Cyan)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span style={{ width: '11px', height: '11px', borderRadius: '3px', backgroundColor: '#f59e0b' }} />
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>FlexGrid Load Shifted (Amber)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span style={{ width: '11px', height: '11px', borderRadius: '3px', backgroundColor: '#ef4444' }} />
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Deficit / Outage (Red)</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: 'var(--fs-legend)' }}>
          <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>Simulated Feeders:</span>
          {FEEDERS.map((f) => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{ width: '14px', height: '4px', backgroundColor: f.color, borderRadius: '2px' }} />
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{f.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
