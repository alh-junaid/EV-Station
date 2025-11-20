import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Zap, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface StationCardProps {
  id: number;
  name: string;
  location: string;
  image: string;
  chargerTypes: string[];
  pricePerKwh: number;
  availability: "available" | "limited" | "full";
  distance?: string;
  onBook: () => void;
}

export function StationCard({
  name,
  location,
  image,
  chargerTypes,
  pricePerKwh,
  availability,
  distance,
  onBook,
}: StationCardProps) {
  const getAvailabilityBadge = () => {
    switch (availability) {
      case "available":
        return (
          <Badge variant="default" className="bg-primary" data-testid="badge-availability">
            <div className="w-2 h-2 rounded-full bg-primary-foreground mr-1.5" />
            Available
          </Badge>
        );
      case "limited":
        return (
          <Badge variant="secondary" className="bg-yellow-500 text-white" data-testid="badge-availability">
            <div className="w-2 h-2 rounded-full bg-white mr-1.5" />
            Limited
          </Badge>
        );
      case "full":
        return (
          <Badge variant="secondary" className="bg-destructive text-destructive-foreground" data-testid="badge-availability">
            <div className="w-2 h-2 rounded-full bg-destructive-foreground mr-1.5" />
            Full
          </Badge>
        );
    }
  };

  return (
    <Card className="overflow-hidden hover-elevate" data-testid="card-station">
      <div className="aspect-[4/3] overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover"
          data-testid="img-station"
        />
      </div>
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h3 className="font-semibold text-lg mb-1" data-testid="text-station-name">
              {name}
            </h3>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span data-testid="text-location">{location}</span>
            </div>
          </div>
          {getAvailabilityBadge()}
        </div>

        {distance && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
            <Clock className="h-4 w-4" />
            <span data-testid="text-distance">{distance}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          {chargerTypes.map((type) => (
            <Badge key={type} variant="outline" data-testid={`badge-charger-${type}`}>
              <Zap className="h-3 w-3 mr-1" />
              {type}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold tabular-nums" data-testid="text-price">
                {formatCurrency(pricePerKwh)}
            </div>
            <div className="text-sm text-muted-foreground">per kWh</div>
          </div>
          <Button
            onClick={onBook}
            disabled={availability === "full"}
            data-testid="button-book-station"
          >
            Book Now
          </Button>
        </div>
      </div>
    </Card>
  );
}
