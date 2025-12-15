import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Clock, Zap } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";

interface BookingCardProps {
  id: string;
  stationName: string;
  location: string;
  date: Date;
  startTime: string;
  duration: number;
  chargerType: string;
  status: "upcoming" | "completed" | "cancelled";
  totalCost: number;
  personName?: string;
  carModel?: string;
  carNumber?: string;
  onCancel?: () => void;
  onReschedule?: () => void;
  onViewReceipt?: () => void;
}

export function BookingCard({
  stationName,
  location,
  date,
  startTime,
  duration,
  chargerType,
  status,
  totalCost,
  personName,
  carModel,
  carNumber,
  onCancel,
  onReschedule,
  onViewReceipt,
}: BookingCardProps) {
  const getStatusBadge = () => {
    switch (status) {
      case "upcoming":
        return <Badge variant="default" data-testid="badge-status">Upcoming</Badge>;
      case "completed":
        return <Badge variant="secondary" data-testid="badge-status">Completed</Badge>;
      case "cancelled":
        return <Badge variant="outline" data-testid="badge-status">Cancelled</Badge>;
    }
  };

  return (
    <Card className="p-6" data-testid="card-booking">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
        <div>
          <h3 className="font-semibold text-lg mb-2" data-testid="text-booking-station">
            {stationName}
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span data-testid="text-booking-location">{location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span data-testid="text-booking-date">{format(date, "MMM dd, yyyy")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span data-testid="text-booking-time">
                {startTime} ({duration}h)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span data-testid="text-booking-charger">{chargerType}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-2">
          {getStatusBadge()}
          <div className="text-sm text-muted-foreground mb-2">
            {personName && <div>{personName}</div>}
            {carModel && <div>{carModel}</div>}
            {carNumber && <div>{carNumber}</div>}
          </div>
          <div className="text-2xl font-bold tabular-nums" data-testid="text-booking-cost">
            {formatCurrency(totalCost)}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {status === "upcoming" && onCancel && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onReschedule}
              className="mr-2"
              data-testid="button-reschedule-booking"
            >
              Reschedule
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              data-testid="button-cancel-booking"
            >
              Cancel Booking
            </Button>
          </>
        )}
        {status === "completed" && onViewReceipt && (
          <Button
            variant="outline"
            size="sm"
            onClick={onViewReceipt}
            data-testid="button-view-receipt"
          >
            View Receipt
          </Button>
        )}
      </div>
    </Card>
  );
}
