import { MICROGRID_BUILDINGS, FEEDERS } from './syntheticData';
import type { BuildingHourlyResult, FeederId } from './types';

export interface GeoNode {
  id: string;
  name: string;
  shortName: string;
  lng: number;
  lat: number;
  heightMeters: number;
  type: string;
}

export const DISTRICT_CENTER: [number, number] = [-122.3970, 37.7650];

export const SUBSTATION_NODE: GeoNode = {
  id: 'node-substation',
  name: 'Regional Transmission Substation (115kV/12kV)',
  shortName: 'Substation',
  lng: -122.3965,
  lat: 37.7718,
  heightMeters: 25,
  type: 'substation'
};

export const BESS_NODE: GeoNode = {
  id: 'node-bess',
  name: 'Central BESS Hub (4,500 kWh / 1,500 kW Inverter)',
  shortName: 'Central BESS',
  lng: -122.3965,
  lat: 37.7588,
  heightMeters: 14,
  type: 'battery_storage'
};

// Spatial mapping for the 12 microgrid facilities in the district
export const BUILDING_GEO_MAP: Record<
  string,
  {
    lng: number;
    lat: number;
    heightMeters: number;
    widthM: number;
    depthM: number;
    shape: string;
  }
> = {
  'bldg-hospital': {
    lng: -122.3920,
    lat: 37.7680,
    heightMeters: 52,
    widthM: 110,
    depthM: 85,
    shape: 'hospital'
  },
  'bldg-911': {
    lng: -122.3892,
    lat: 37.7675,
    heightMeters: 30,
    widthM: 70,
    depthM: 60,
    shape: 'datacenter'
  },
  'bldg-water': {
    lng: -122.4045,
    lat: 37.7615,
    heightMeters: 20,
    widthM: 100,
    depthM: 75,
    shape: 'water'
  },
  'bldg-datacenter': {
    lng: -122.4020,
    lat: 37.7690,
    heightMeters: 36,
    widthM: 95,
    depthM: 80,
    shape: 'datacenter'
  },
  'bldg-science': {
    lng: -122.3970,
    lat: 37.7685,
    heightMeters: 45,
    widthM: 90,
    depthM: 70,
    shape: 'university'
  },
  'bldg-civic': {
    lng: -122.3915,
    lat: 37.7645,
    heightMeters: 32,
    widthM: 85,
    depthM: 65,
    shape: 'commercial'
  },
  'bldg-cold-storage': {
    lng: -122.4010,
    lat: 37.7610,
    heightMeters: 24,
    widthM: 90,
    depthM: 65,
    shape: 'commercial'
  },
  'bldg-techpark': {
    lng: -122.3945,
    lat: 37.7640,
    heightMeters: 74,
    widthM: 85,
    depthM: 75,
    shape: 'tower'
  },
  'bldg-res-alpha': {
    lng: -122.4050,
    lat: 37.7650,
    heightMeters: 40,
    widthM: 80,
    depthM: 70,
    shape: 'residential'
  },
  'bldg-res-beta': {
    lng: -122.4015,
    lat: 37.7652,
    heightMeters: 42,
    widthM: 85,
    depthM: 70,
    shape: 'residential'
  },
  'bldg-commercial': {
    lng: -122.3975,
    lat: 37.7655,
    heightMeters: 26,
    widthM: 105,
    depthM: 80,
    shape: 'commercial'
  },
  'bldg-ev-hub': {
    lng: -122.3970,
    lat: 37.7620,
    heightMeters: 16,
    widthM: 90,
    depthM: 65,
    shape: 'commercial'
  }
};

// Generates an enclosed polygon footprint around [lng, lat]
function makePolygonFootprint(lng: number, lat: number, widthM: number, depthM: number): number[][][] {
  const dLng = widthM / (2 * 88000);
  const dLat = depthM / (2 * 111000);
  return [
    [
      [lng - dLng, lat - dLat],
      [lng + dLng, lat - dLat],
      [lng + dLng, lat + dLat],
      [lng - dLng, lat + dLat],
      [lng - dLng, lat - dLat]
    ]
  ];
}

export function get3DBuildingsGeoJSON(buildingStates: Record<string, BuildingHourlyResult>) {
  const features = MICROGRID_BUILDINGS.map((bldg) => {
    const geo = BUILDING_GEO_MAP[bldg.id] || {
      lng: -122.3970,
      lat: 37.7650,
      heightMeters: 30,
      widthM: 80,
      depthM: 60,
      shape: 'commercial'
    };
    const state = buildingStates[bldg.id];

    // Status colors: Normal = Green, Battery = Cyan, Flexed = Amber, Outage = Red
    const isOutage = (state?.unmetKw || 0) > 0.5;
    const isBattery = state?.status === 'battery_backed';
    const isFlexed = state?.status === 'flexed';

    let color = '#10b981'; // Green (Normal/Powered)
    if (isOutage) {
      color = '#ef4444'; // Red (Deficit/Outage)
    } else if (isBattery) {
      color = '#38bdf8'; // Cyan (Battery Backed)
    } else if (isFlexed) {
      color = '#f59e0b'; // Amber (Flexed/Load Shifted)
    }

    return {
      type: 'Feature' as const,
      id: bldg.id,
      properties: {
        id: bldg.id,
        name: bldg.name,
        shortName: bldg.shortName,
        type: bldg.type,
        feeder: bldg.feeder,
        height: geo.heightMeters,
        base_height: 0,
        color,
        isOutage,
        isBattery,
        isFlexed,
        demandKw: state?.demandKw || 0,
        unmetKw: state?.unmetKw || 0,
        solarKw: state?.solarKw || 0,
        batteryKw: state?.batteryKw || 0,
        gridKw: state?.gridKw || 0,
        solarCapacityKw: bldg.solarCapacityKw,
        peakDemandKw: bldg.peakDemandKw,
        flexibleLoadPct: bldg.flexibleLoadPct
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: makePolygonFootprint(geo.lng, geo.lat, geo.widthM, geo.depthM)
      }
    };
  });

  return {
    type: 'FeatureCollection' as const,
    features
  };
}

export function getRooftopSolarGeoJSON() {
  const features = MICROGRID_BUILDINGS.filter((b) => b.solarCapacityKw > 0).map((bldg) => {
    const geo = BUILDING_GEO_MAP[bldg.id];
    // Slightly smaller elevated polygon sitting on the building roof
    const roofFootprint = makePolygonFootprint(
      geo.lng + 0.0001,
      geo.lat + 0.0001,
      geo.widthM * 0.7,
      geo.depthM * 0.6
    );

    return {
      type: 'Feature' as const,
      id: `solar-${bldg.id}`,
      properties: {
        id: `solar-${bldg.id}`,
        buildingId: bldg.id,
        solarCapacityKw: bldg.solarCapacityKw,
        height: geo.heightMeters + 1.5,
        base_height: geo.heightMeters,
        color: '#0284c7'
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: roofFootprint
      }
    };
  });

  return {
    type: 'FeatureCollection' as const,
    features
  };
}

export function getFeederLinesGeoJSON(
  isScenarioActive: boolean,
  feederOutage: 'none' | FeederId
) {
  const features: any[] = [];

  // Feeder distribution lines connecting Substation to each building
  FEEDERS.forEach((feeder) => {
    const isSevered = isScenarioActive && feederOutage === feeder.id;

    feeder.buildingIds.forEach((bldgId) => {
      const geo = BUILDING_GEO_MAP[bldgId];
      if (!geo) return;

      // Waypoint corridor routing to create realistic street-aligned distribution lines
      const midLat = (SUBSTATION_NODE.lat + geo.lat) / 2;

      features.push({
        type: 'Feature' as const,
        properties: {
          feederId: feeder.id,
          feederName: feeder.name,
          buildingId: bldgId,
          color: isSevered ? '#ef4444' : feeder.color,
          isSevered,
          dasharray: isSevered ? [2, 3] : [1, 0]
        },
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [SUBSTATION_NODE.lng, SUBSTATION_NODE.lat],
            [SUBSTATION_NODE.lng, midLat],
            [geo.lng, midLat],
            [geo.lng, geo.lat]
          ]
        }
      });
    });
  });

  // Central BESS to Substation Intertie Trunk Line
  features.push({
    type: 'Feature' as const,
    properties: {
      feederId: 'bess-intertie',
      feederName: 'Central BESS High-Capacity Trunk',
      buildingId: 'bess',
      color: '#a855f7',
      isSevered: false
    },
    geometry: {
      type: 'LineString' as const,
      coordinates: [
        [SUBSTATION_NODE.lng, SUBSTATION_NODE.lat],
        [-122.3965, 37.7650],
        [BESS_NODE.lng, BESS_NODE.lat]
      ]
    }
  });

  return {
    type: 'FeatureCollection' as const,
    features
  };
}

export function getDistrictGridRoadsGeoJSON() {
  // Schematic street grid overlay connecting the district blocks
  const roads = [
    // North-South Avenues
    [[-122.4060, 37.7730], [-122.4060, 37.7570]],
    [[-122.4010, 37.7730], [-122.4010, 37.7570]],
    [[-122.3965, 37.7730], [-122.3965, 37.7570]],
    [[-122.3920, 37.7730], [-122.3920, 37.7570]],
    [[-122.3870, 37.7730], [-122.3870, 37.7570]],
    // East-West Streets
    [[-122.4070, 37.7718], [-122.3860, 37.7718]],
    [[-122.4070, 37.7680], [-122.3860, 37.7680]],
    [[-122.4070, 37.7645], [-122.3860, 37.7645]],
    [[-122.4070, 37.7610], [-122.3860, 37.7610]],
    [[-122.4070, 37.7588], [-122.3860, 37.7588]]
  ];

  return {
    type: 'FeatureCollection' as const,
    features: roads.map((coords, i) => ({
      type: 'Feature' as const,
      properties: { id: `road-${i}` },
      geometry: {
        type: 'LineString' as const,
        coordinates: coords
      }
    }))
  };
}
