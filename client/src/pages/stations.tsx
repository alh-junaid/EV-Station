import { useState } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { StationCard } from "@/components/station-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Search, SlidersHorizontal } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { type Station } from "@shared/schema";
import station1 from '@assets/generated_images/Downtown_charging_station_0f050c4d.png';
import station2 from '@assets/generated_images/Shopping_district_station_dd12b352.png';
import station3 from '@assets/generated_images/Suburban_charging_hub_e5daf664.png';
import heroImage from '@assets/generated_images/Hero_EV_charging_station_08667777.png';

export default function Stations() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data: allStations = [], isLoading } = useQuery<Station[]>({
    queryKey: ["/api/stations"],
  });

  const stations = allStations.filter((station) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      station.name.toLowerCase().includes(query) ||
      station.location.toLowerCase().includes(query)
    );
  });

  //todo: remove mock functionality - image mapping
  const imageMap: Record<number, string> = {
    1: station1,
    2: station2,
    3: station3,
  };

  const handleBookStation = (stationId: number) => {
    setLocation(`/book/${stationId}`);
  };

  const { slotStatus } = useWebSocket();

  const getAvailability = (stationId: number) => {
    // Check slots 1, 2, 3 for this station
    // If any is false (not occupied) or undefined (assumed free), it's available
    // If all 3 are true (occupied), it's full
    // This is a simple logic for demo.
    const s1 = slotStatus[`${stationId}-1`];
    const s2 = slotStatus[`${stationId}-2`];
    const s3 = slotStatus[`${stationId}-3`];

    if (s1 && s2 && s3) return "full";
    return "available";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4" data-testid="text-page-title">
            Find Charging Stations
          </h1>
          <p className="text-muted-foreground">
            Browse available EV charging stations near you
          </p>
        </div>

        <div className="mb-6">
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by location, station name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                data-testid="button-filters"
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>

            {showFilters && (
              <div className="mt-4 pt-4 border-t grid sm:grid-cols-3 gap-4">
                <div>
                  <Label>Charger Type</Label>
                  <div className="mt-2 space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded" />
                      <span>Level 2</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded" />
                      <span>DC Fast</span>
                    </label>
                  </div>
                </div>
                <div>
                  <Label>Availability</Label>
                  <div className="mt-2 space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded" defaultChecked />
                      <span>Available</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded" />
                      <span>Limited</span>
                    </label>
                  </div>
                </div>
                <div>
                  <Label>Price Range</Label>
                  <div className="mt-2 space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded" />
                      <span>Under ₹0.30/kWh</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded" />
                      <span>₹0.30 - ₹0.40/kWh</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading stations...
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stations.map((station) => (
              <StationCard
                key={station.id}
                id={station.id}
                name={station.name}
                location={station.location}
                image={imageMap[station.id] || heroImage}
                chargerTypes={station.chargerTypes}
                pricePerKwh={parseFloat(station.pricePerKwh)}
                availability={getAvailability(station.id)}
                onBook={() => handleBookStation(station.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
