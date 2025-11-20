import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MapPin, Calendar, Clock, Zap, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { MapComponent } from "@/components/map-component";
import { type Station } from "@shared/schema";

interface BookingSummaryProps {
  stationName: string;
  location: string;
  date: Date;
  timeSlot: string;
  duration: number;
  chargerType: string;
  pricePerKwh: number;
  estimatedKwh: number;
  personName?: string;
  carModel?: string;
  carNumber?: string;
  // We need station details for the map
  station?: Station;
}

export function BookingSummary({
  stationName,
  location,
  date,
  timeSlot,
  duration,
  chargerType,
  pricePerKwh,
  estimatedKwh,
  personName,
  carModel,
  carNumber,
  station
}: BookingSummaryProps) {
  const subtotal = pricePerKwh * estimatedKwh;
  const serviceFee = subtotal * 0.1;
  const total = subtotal + serviceFee;

  const openDirections = () => {
    if (station) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(station.location)}`, '_blank');
    }
  };

  return (
    <Card className="p-6" data-testid="card-booking-summary">
      <h3 className="font-semibold text-lg mb-4">Booking Summary</h3>

      <div className="space-y-3 mb-4">
        <div>
          <div className="font-medium mb-1" data-testid="text-summary-station">
            {stationName}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span data-testid="text-summary-location">{location}</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span data-testid="text-summary-date">{format(date, "MMMM dd, yyyy")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span data-testid="text-summary-time">
              {timeSlot} ({duration} hour{duration !== 1 ? 's' : ''})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <span data-testid="text-summary-charger">{chargerType}</span>
          </div>
        </div>

        <Separator />

        {personName && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span data-testid="text-summary-person">{personName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Car model</span>
              <span data-testid="text-summary-car-model">{carModel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Car number</span>
              <span data-testid="text-summary-car-number">{carNumber}</span>
            </div>
          </div>
        )}

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Estimated usage</span>
            <span data-testid="text-summary-kwh">{estimatedKwh} kWh</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Price per kWh</span>
            <span data-testid="text-summary-rate">{formatCurrency(pricePerKwh)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span data-testid="text-summary-subtotal">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Service fee</span>
            <span data-testid="text-summary-fee">{formatCurrency(serviceFee)}</span>
          </div>
        </div>

        <Separator />

        <div className="flex justify-between items-center">
          <span className="font-semibold text-lg">Total</span>
          <span className="font-bold text-2xl tabular-nums" data-testid="text-summary-total">
            {formatCurrency(total)}
          </span>
        </div>

        {station && (
          <>
            <Separator />
            <div className="pt-2">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium text-sm">Location</h4>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={openDirections}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Get Directions
                </Button>
              </div>
              <div className="rounded-md overflow-hidden border h-[200px] relative z-0">
                <MapComponent
                  singleStation={station}
                  height="200px"
                  zoom={14}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
