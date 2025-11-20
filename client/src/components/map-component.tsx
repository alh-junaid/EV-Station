import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { type Station } from "@shared/schema";

// Fix for default marker icon in React Leaflet
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface MapComponentProps {
    stations?: Station[];
    center?: [number, number];
    zoom?: number;
    height?: string;
    singleStation?: Station;
}

export function MapComponent({
    stations = [],
    center = [12.9716, 77.5946], // Default to Bangalore
    zoom = 12,
    height = "400px",
    singleStation
}: MapComponentProps) {

    const displayStations = singleStation ? [singleStation] : stations;
    const mapCenter: [number, number] = singleStation
        ? [parseFloat(singleStation.latitude || "12.9716"), parseFloat(singleStation.longitude || "77.5946")]
        : center;

    const openDirections = (lat: string, lng: string) => {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    };

    return (
        <div style={{ height, width: "100%", zIndex: 0 }}>
            <MapContainer
                center={mapCenter}
                zoom={zoom}
                style={{ height: "100%", width: "100%", borderRadius: "0.5rem" }}
                scrollWheelZoom={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {displayStations.map((station) => (
                    <Marker
                        key={station.id}
                        position={[parseFloat(station.latitude || "12.9716"), parseFloat(station.longitude || "77.5946")]}
                    >
                        <Popup>
                            <div className="p-2 min-w-[200px]">
                                <h3 className="font-bold text-sm mb-1">{station.name}</h3>
                                <p className="text-xs text-muted-foreground mb-2">{station.location}</p>
                                <Button
                                    size="sm"
                                    className="w-full h-8 text-xs"
                                    onClick={() => openDirections(station.latitude || "12.9716", station.longitude || "77.5946")}
                                >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Get Directions
                                </Button>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
