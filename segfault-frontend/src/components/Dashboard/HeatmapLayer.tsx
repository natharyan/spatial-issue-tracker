import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

interface HeatmapPoint {
    lat: number;
    lng: number;
    weight: number;
}

interface HeatmapLayerProps {
    points: HeatmapPoint[];
    visible: boolean;
}

declare module "leaflet" {
    function heatLayer(
        latlngs: Array<[number, number, number]>,
        options?: {
            radius?: number;
            blur?: number;
            maxZoom?: number;
            max?: number;
            gradient?: Record<number, string>;
        }
    ): L.Layer;
}

const HeatmapLayer = ({ points, visible }: HeatmapLayerProps) => {
    const map = useMap();
    const heatLayerRef = useRef<L.Layer | null>(null);

    useEffect(() => {
        if (!visible) {
            if (heatLayerRef.current) {
                map.removeLayer(heatLayerRef.current);
                heatLayerRef.current = null;
            }
            return;
        }

        if (heatLayerRef.current) {
            map.removeLayer(heatLayerRef.current);
        }

        if (points.length === 0) return;

        const heatData: Array<[number, number, number]> = points.map((p) => [
            p.lat,
            p.lng,
            p.weight,
        ]);

        heatLayerRef.current = L.heatLayer(heatData, {
            radius: 25,
            blur: 15,
            maxZoom: 17,
            max: 1.0,
            gradient: {
                0.0: "#3b82f6",
                0.25: "#22c55e",
                0.5: "#f59e0b",
                0.75: "#f97316",
                1.0: "#ef4444",
            },
        });

        heatLayerRef.current.addTo(map);

        return () => {
            if (heatLayerRef.current) {
                map.removeLayer(heatLayerRef.current);
            }
        };
    }, [map, points, visible]);

    return null;
};

export default HeatmapLayer;
