import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function HowItWorks() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <Card className="max-w-3xl w-full p-8">
        <h1 className="text-2xl font-bold mb-4">How ChargeSpot Works</h1>
        <p className="mb-4 text-muted-foreground">
          ChargeSpot lets you find nearby EV charging stations, select a time slot, and reserve it.
          Use the booking flow to choose a date and time, enter your vehicle details, and complete
          a quick payment to confirm your reservation.
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>Browse stations on the Stations page.</li>
          <li>Select a date and available time slot.</li>
          <li>Enter your name and vehicle details (these are saved to your profile).</li>
          <li>Pay and confirm your booking.</li>
        </ul>
        <div className="flex gap-2">
          <Button onClick={() => setLocation('/stations')}>Browse Stations</Button>
          <Button variant="ghost" onClick={() => setLocation('/')}>Home</Button>
        </div>
      </Card>
    </div>
  );
}
