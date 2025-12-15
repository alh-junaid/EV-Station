import { BookingCard } from "@/components/booking-card";
import { StatsCard } from "@/components/stats-card";
import { RescheduleDialog } from "@/components/reschedule-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, DollarSign, Calendar } from "lucide-react";
import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type Booking } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

export default function Bookings() {
  const { toast } = useToast();
  const [rescheduleId, setRescheduleId] = React.useState<string | null>(null);

  const { data: allBookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/bookings/${id}/cancel`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Failed to cancel booking");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Booking cancelled",
        description: "Your booking has been cancelled and refunded.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to cancel booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  const upcomingBookings = allBookings.filter(b => b.status === "upcoming");
  const completedBookings = allBookings.filter(b => b.status === "completed");

  const handleCancelBooking = (id: string) => {
    if (confirm("Are you sure you want to cancel this booking? You will receive a full refund.")) {
      cancelMutation.mutate(id);
    }
  };

  const handleViewReceipt = (id: string) => {
    console.log('View receipt:', id);
  };

  // Calculate stats
  const totalSessions = allBookings.filter(b => b.status === "completed").length;
  const totalKwh = totalSessions * 80; // Estimated
  const totalSpent = allBookings
    .filter(b => b.status === "completed")
    .reduce((sum, b) => sum + parseFloat(b.totalCost), 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4" data-testid="text-page-title">
            My Bookings
          </h1>
          <p className="text-muted-foreground">
            Manage your charging station reservations
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Total Sessions"
            value={totalSessions}
            icon={Calendar}
            description="All time"
          />
          <StatsCard
            title="kWh Charged"
            value={totalKwh.toLocaleString()}
            icon={Zap}
            description="Estimated"
          />
          <StatsCard
            title="Amount Spent"
            value={formatCurrency(totalSpent)}
            icon={DollarSign}
            description="All time"
          />
        </div>

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="upcoming" data-testid="tab-upcoming">
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="past" data-testid="tab-past">
              Past
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading bookings...
              </div>
            ) : upcomingBookings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No upcoming bookings
              </div>
            ) : (
              upcomingBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  id={booking.id}
                  stationName={booking.stationName}
                  location={booking.location}
                  date={new Date(booking.date)}
                  startTime={booking.startTime}
                  duration={booking.duration}
                  chargerType={booking.chargerType}
                  status="upcoming"
                  totalCost={parseFloat(booking.totalCost)}
                  personName={(booking as any).personName}
                  carModel={(booking as any).carModel}
                  carNumber={(booking as any).carNumber}
                  onCancel={() => handleCancelBooking(booking.id)}
                  onReschedule={() => setRescheduleId(booking.id)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading bookings...
              </div>
            ) : completedBookings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No past bookings
              </div>
            ) : (
              completedBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  id={booking.id}
                  stationName={booking.stationName}
                  location={booking.location}
                  date={new Date(booking.date)}
                  startTime={booking.startTime}
                  duration={booking.duration}
                  chargerType={booking.chargerType}
                  status="completed"
                  totalCost={parseFloat(booking.totalCost)}
                  personName={(booking as any).personName}
                  carModel={(booking as any).carModel}
                  carNumber={(booking as any).carNumber}
                  onViewReceipt={() => handleViewReceipt(booking.id)}
                />
              ))
            )}
          </TabsContent>
        </Tabs>

        {(() => {
          const bookingToReschedule = allBookings.find(b => b.id === rescheduleId);
          return (
            <RescheduleDialog
              open={!!rescheduleId && !!bookingToReschedule}
              onOpenChange={(open) => !open && setRescheduleId(null)}
              bookingId={rescheduleId}
              stationId={bookingToReschedule?.stationId ?? 0}
              currentDate={bookingToReschedule ? new Date(bookingToReschedule.date) : new Date()}
              currentTime={bookingToReschedule?.startTime ?? ""}
            />
          );
        })()}
      </div>
    </div>
  );
}
