/**
 * Google Maps styling and configuration for GridWise digital twin.
 * Custom dark cyberpunk style tailored to the dark space glassmorphism UI.
 */

export const GOOGLE_MAPS_DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#070b16' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#070b16' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#74829c' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#94a3b8' }]
  },
  {
    featureType: 'administrative.neighborhood',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64748b' }]
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64748b' }]
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#0b1324' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#131d33' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#0c1322' }]
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#475569' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#1a2744' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#10172a' }]
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#0c1424' }]
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#030712' }]
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#38bdf8' }]
  }
];

/**
 * Creates custom HTML Overlay for Google Maps using standard OverlayView instantiation.
 */
export function createHTMLOverlay(
  position: { lat: number; lng: number },
  element: HTMLElement,
  map: google.maps.Map
): google.maps.OverlayView {
  const overlay = new google.maps.OverlayView();
  let container: HTMLDivElement | null = null;

  overlay.onAdd = function (this: google.maps.OverlayView) {
    container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.cursor = 'pointer';
    container.style.zIndex = '15';
    container.appendChild(element);

    const panes = this.getPanes();
    panes?.overlayMouseTarget.appendChild(container);
  };

  overlay.draw = function (this: google.maps.OverlayView) {
    if (!container) return;
    const projection = this.getProjection();
    if (!projection) return;

    const latLng = new google.maps.LatLng(position.lat, position.lng);
    const point = projection.fromLatLngToDivPixel(latLng);
    if (point) {
      container.style.left = `${point.x}px`;
      container.style.top = `${point.y}px`;
    }
  };

  overlay.onRemove = function () {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
      container = null;
    }
  };

  overlay.setMap(map);
  return overlay;
}
