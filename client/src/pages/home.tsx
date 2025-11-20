import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Zap, Calendar, CreditCard, MapPin, Shield, Clock } from "lucide-react";
import { Link } from "wouter";
import heroImage from '@assets/generated_images/Hero_EV_charging_station_08667777.png';
import station1 from '@assets/generated_images/Downtown_charging_station_0f050c4d.png';
import station2 from '@assets/generated_images/Suburban_charging_hub_e5daf664.png';
import station3 from '@assets/generated_images/Shopping_district_station_dd12b352.png';

export default function Home() {
  return (
    <div className="min-h-screen">
      <section
        className="relative h-[80vh] flex items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6" data-testid="text-hero-title">
            Charge Your EV,<br />Anytime, Anywhere
          </h1>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto" data-testid="text-hero-subtitle">
            Find and book electric vehicle charging stations near you with real-time availability and instant booking.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/stations">
              <Button
                size="lg"
                className="bg-primary/90 backdrop-blur-sm border border-primary-border"
                data-testid="button-find-stations"
              >
                <MapPin className="mr-2 h-5 w-5" />
                Find Stations
              </Button>
            </Link>
            <Link href="/how-it-works">
              <Button
                size="lg"
                variant="outline"
                className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
                data-testid="button-how-it-works"
              >
                How It Works
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-background">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4" data-testid="text-features-title">
              Why Choose ChargeSpot?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Fast, reliable, and convenient EV charging at your fingertips
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6">
              <div className="rounded-md bg-primary/10 p-3 w-fit mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Fast Booking</h3>
              <p className="text-muted-foreground">
                Book your charging slot in seconds with our intuitive interface and real-time availability.
              </p>
            </Card>

            <Card className="p-6">
              <div className="rounded-md bg-primary/10 p-3 w-fit mb-4">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Real-Time Availability</h3>
              <p className="text-muted-foreground">
                See up-to-date availability across all charging stations in your area.
              </p>
            </Card>

            <Card className="p-6">
              <div className="rounded-md bg-primary/10 p-3 w-fit mb-4">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Secure Payments</h3>
              <p className="text-muted-foreground">
                Pay with confidence using our encrypted payment system with multiple payment options.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-muted/30">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Get charged in four simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="rounded-full bg-primary/10 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="font-semibold mb-2">Find a Station</h3>
              <p className="text-sm text-muted-foreground">
                Browse available charging stations near you
              </p>
            </div>

            <div className="text-center">
              <div className="rounded-full bg-primary/10 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <h3 className="font-semibold mb-2">Select Time</h3>
              <p className="text-sm text-muted-foreground">
                Choose your preferred date and time slot
              </p>
            </div>

            <div className="text-center">
              <div className="rounded-full bg-primary/10 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <h3 className="font-semibold mb-2">Pay Securely</h3>
              <p className="text-sm text-muted-foreground">
                Complete payment with your preferred method
              </p>
            </div>

            <div className="text-center">
              <div className="rounded-full bg-primary/10 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">4</span>
              </div>
              <h3 className="font-semibold mb-2">Start Charging</h3>
              <p className="text-sm text-muted-foreground">
                Arrive and plug in your vehicle to charge
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-background">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Popular Stations</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Most booked charging stations in your area
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="overflow-hidden hover-elevate">
              <div className="aspect-[4/3]">
                <img src={station1} alt="Downtown Power Hub" className="w-full h-full object-cover" />
              </div>
              <div className="p-6">
                <h3 className="font-semibold text-lg mb-2">Downtown Power Hub</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <MapPin className="h-4 w-4" />
                  <span>San Francisco, CA</span>
                </div>
                <Link href="/stations">
                  <Button variant="outline" className="w-full">View Details</Button>
                </Link>
              </div>
            </Card>

            <Card className="overflow-hidden hover-elevate">
              <div className="aspect-[4/3]">
                <img src={station2} alt="Green Valley Charging" className="w-full h-full object-cover" />
              </div>
              <div className="p-6">
                <h3 className="font-semibold text-lg mb-2">Green Valley Charging</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <MapPin className="h-4 w-4" />
                  <span>Palo Alto, CA</span>
                </div>
                <Link href="/stations">
                  <Button variant="outline" className="w-full">View Details</Button>
                </Link>
              </div>
            </Card>

            <Card className="overflow-hidden hover-elevate">
              <div className="aspect-[4/3]">
                <img src={station3} alt="Metro Charge Center" className="w-full h-full object-cover" />
              </div>
              <div className="p-6">
                <h3 className="font-semibold text-lg mb-2">Metro Charge Center</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <MapPin className="h-4 w-4" />
                  <span>Oakland, CA</span>
                </div>
                <Link href="/stations">
                  <Button variant="outline" className="w-full">View Details</Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold mb-4">
            Start Charging Smarter Today
          </h2>
          <p className="text-lg mb-8 text-primary-foreground/90">
            Join thousands of EV drivers who trust ChargeSpot for their charging needs
          </p>
          <Link href="/stations">
            <Button
              size="lg"
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              data-testid="button-get-started"
            >
              Get Started Now
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
