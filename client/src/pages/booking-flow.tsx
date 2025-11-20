import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { TimeSlotPicker } from "@/components/time-slot-picker";
import { BookingSummary } from "@/components/booking-summary";
import { PaymentForm } from "@/components/payment-form";
import { ArrowLeft, Check } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type Station } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import station1 from '@assets/generated_images/Downtown_charging_station_0f050c4d.png';
import station2 from '@assets/generated_images/Suburban_charging_hub_e5daf664.png';
import station3 from '@assets/generated_images/Shopping_district_station_dd12b352.png';

export default function BookingFlow() {
  const [, params] = useRoute("/book/:id");
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const { toast } = useToast();
  const [personName, setPersonName] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carNumber, setCarNumber] = useState("");
  const { user } = useAuth();

  // Prefill form from user profile when available
  useEffect(() => {
    if (user) {
      setPersonName(user.name ?? "");
      setCarModel((user as any).carModel ?? "");
      setCarNumber((user as any).carNumber ?? "");
    }
  }, [user]);

  const stationId = parseInt(params?.id || "1");

  const { data: station, isLoading: stationLoading } = useQuery<Station>({
    queryKey: ["/api/stations", stationId],
    queryFn: async () => {
      const res = await fetch(`/api/stations/${stationId}`);
      if (!res.ok) throw new Error("Failed to fetch station");
      return res.json();
    },
  });

  const { data: availabilityData } = useQuery({
    queryKey: ["/api/stations", stationId, "availability", selectedDate?.toISOString()],
    queryFn: async () => {
      if (!selectedDate) return { bookedSlots: [] };
      const dateStr = selectedDate.toISOString().split('T')[0];
      const res = await fetch(`/api/stations/${stationId}/availability?date=${dateStr}`);
      if (!res.ok) throw new Error("Failed to fetch availability");
      return res.json();
    },
    enabled: !!selectedDate,
  });

  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      // use apiRequest which sets credentials: 'include' so session cookie is sent
      const res = await apiRequest('POST', '/api/bookings', bookingData);
      // apiRequest throws for non-OK responses, so if we reach here it's OK
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setStep(4);
    },
    onError: (err: any) => {
      const message = err?.message || 'Failed to create booking. Please try again.';
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  //todo: remove mock functionality - image mapping
  const imageMap: Record<number, string> = {
    1: station1,
    2: station2,
    3: station3,
  };

  const allTimeSlots = [
    { time: "08:00", available: true },
    { time: "10:00", available: true },
    { time: "12:00", available: true },
    { time: "14:00", available: true },
    { time: "16:00", available: true },
    { time: "18:00", available: true },
    { time: "20:00", available: true },
  ];

  const bookedSlots = availabilityData?.bookedSlots || [];
  const timeSlots = allTimeSlots.map(slot => ({
    ...slot,
    available: !bookedSlots.includes(slot.time),
  }));

  const handlePaymentComplete = async (paymentIntentId: string) => {
    if (!user) {
      // redirect to login if user is not authenticated
      setLocation('/login');
      return;
    }
    if (!station || !selectedDate || !selectedSlot) return;

    const duration = 2;
    const estimatedKwh = 80;
    const pricePerKwh = parseFloat(station.pricePerKwh);
    const subtotal = pricePerKwh * estimatedKwh;
    const serviceFee = subtotal * 0.1;
    const totalCost = subtotal + serviceFee;

    const bookingData = {
      stationId: station.id,
      stationName: station.name,
      location: station.location,
      date: selectedDate.toISOString(),
      startTime: selectedSlot,
      duration,
      chargerType: station.chargerTypes[0],
      totalCost: totalCost.toFixed(2),
      status: "upcoming",
      stripePaymentId: paymentIntentId,
      personName,
      carModel,
      carNumber,
    };

    createBookingMutation.mutate(bookingData);
  };

  const canProceed = () => {
    if (step === 1) return selectedDate !== undefined;
    if (step === 2) return selectedSlot !== null;
    return true;
  };

  if (stationLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading station details...</div>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Station Not Found</h2>
          <p className="text-muted-foreground mb-4">The station you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation("/stations")}>Back to Stations</Button>
        </Card>
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="rounded-full bg-primary/10 w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2" data-testid="text-confirmation-title">
            Booking Confirmed!
          </h2>
          <p className="text-muted-foreground mb-6">
            Your charging station has been reserved. Check your email for confirmation details.
          </p>
          <div className="space-y-3">
            <Button
              className="w-full"
              onClick={() => setLocation("/bookings")}
              data-testid="button-view-bookings"
            >
              View My Bookings
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setLocation("/stations")}
              data-testid="button-back-stations"
            >
              Back to Stations
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const duration = 2;
  const estimatedKwh = 80;
  const pricePerKwh = parseFloat(station.pricePerKwh);
  const subtotal = pricePerKwh * estimatedKwh;
  const serviceFee = subtotal * 0.1;
  const totalCost = subtotal + serviceFee;

  console.log("BookingFlow Render:", { step, selectedDate, selectedSlot, station });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl px-6 py-8">
        <Button
          variant="ghost"
          onClick={() => step === 1 ? setLocation("/stations") : setStep(step - 1)}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${s <= step
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground"
                  }`}
                data-testid={`step-${s}`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`w-12 h-0.5 ${s < step ? "bg-primary" : "bg-border"
                    }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {step === 1 && (
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4" data-testid="text-step-title">
                  Select Date
                </h2>
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border"
                    disabled={(date) => date < new Date()}
                  />
                </div>
              </Card>
            )}

            {step === 2 && (
              <TimeSlotPicker
                slots={timeSlots}
                selectedSlot={selectedSlot}
                onSelectSlot={setSelectedSlot}
              />
            )}

            {step === 3 && selectedDate && selectedSlot && (
              <>
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Your Details</h3>
                  <div className="grid gap-2">
                    <input
                      className="input"
                      placeholder="Full name"
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                      data-testid="input-person-name"
                    />
                    <input
                      className="input"
                      placeholder="Car model (e.g., Tesla Model 3)"
                      value={carModel}
                      onChange={(e) => setCarModel(e.target.value)}
                      data-testid="input-car-model"
                    />
                    <input
                      className="input"
                      placeholder="Car number (e.g., MH12AB1234)"
                      value={carNumber}
                      onChange={(e) => setCarNumber(e.target.value)}
                      data-testid="input-car-number"
                    />
                  </div>
                </div>

                <PaymentForm
                  amount={totalCost}
                  onSubmit={handlePaymentComplete}
                />
              </>
            )}

            {step < 3 && (
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed()}
                  data-testid="button-continue"
                >
                  Continue
                </Button>
              </div>
            )}
          </div>

          <div>
            {selectedDate && selectedSlot && (
              <BookingSummary
                stationName={station.name}
                location={station.location}
                date={selectedDate}
                timeSlot={selectedSlot}
                duration={duration}
                chargerType={station.chargerTypes[0]}
                pricePerKwh={pricePerKwh}
                estimatedKwh={estimatedKwh}
                personName={personName}
                carModel={carModel}
                carNumber={carNumber}
                station={station}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
