import L from "leaflet";

/**
 * Creates a Leaflet DivIcon with a colored SVG marker based on issue status
 */
export function getStatusIcon(status: string): L.DivIcon {
    const colors: Record<string, string> = {
        PENDING: "#ef4444", // Red
        IN_PROGRESS: "#f59e0b", // Yellow/Amber
        RESOLVED: "#22c55e", // Green
    };

    const color = colors[status] || colors.PENDING;

    return createMarkerIcon(color);
}

/**
 * Creates a Leaflet DivIcon with a color interpolated from Green (0) -> Yellow (50) -> Red (100)
 * based on urgency score
 */
export function getUrgencyIcon(urgencyScore: number): L.DivIcon {
    const color = interpolateColor(urgencyScore);
    return createMarkerIcon(color);
}

/**
 * Interpolates color from green (low) to yellow (mid) to red (high)
 */
function interpolateColor(score: number): string {
    // Clamp score between 0 and 100
    const clamped = Math.max(0, Math.min(100, score));

    let r: number, g: number, b: number;

    if (clamped <= 50) {
        // Green to Yellow (0-50)
        const ratio = clamped / 50;
        r = Math.round(34 + (245 - 34) * ratio); // 34 -> 245
        g = Math.round(197 + (158 - 197) * ratio); // 197 -> 158
        b = Math.round(94 + (11 - 94) * ratio); // 94 -> 11
    } else {
        // Yellow to Red (50-100)
        const ratio = (clamped - 50) / 50;
        r = Math.round(245 + (239 - 245) * ratio); // 245 -> 239
        g = Math.round(158 + (68 - 158) * ratio); // 158 -> 68
        b = Math.round(11 + (68 - 11) * ratio); // 11 -> 68
    }

    return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Creates a colored marker icon as SVG
 */
function createMarkerIcon(color: string): L.DivIcon {
    const svg = `
    <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
        </filter>
      </defs>
      <path 
        d="M16 0C7.163 0 0 7.163 0 16c0 8.837 16 26 16 26s16-17.163 16-26C32 7.163 24.837 0 16 0z" 
        fill="${color}" 
        filter="url(#shadow)"
      />
      <circle cx="16" cy="14" r="6" fill="white" opacity="0.9"/>
    </svg>
  `;

    return L.divIcon({
        html: svg,
        className: "custom-marker-icon",
        iconSize: [32, 42],
        iconAnchor: [16, 42],
        popupAnchor: [0, -42],
    });
}

/**
 * Creates a cluster icon with the count displayed
 */
export function createClusterIcon(cluster: { getChildCount: () => number }): L.DivIcon {
    const count = cluster.getChildCount();
    let size = "small";
    let dimension = 40;

    if (count >= 100) {
        size = "large";
        dimension = 56;
    } else if (count >= 10) {
        size = "medium";
        dimension = 48;
    }

    return L.divIcon({
        html: `<div class="cluster-icon cluster-${size}"><span>${count}</span></div>`,
        className: "custom-cluster-container",
        iconSize: L.point(dimension, dimension),
    });
}
