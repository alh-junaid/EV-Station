import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "@/components/header";
import Home from "@/pages/home";
import Stations from "@/pages/stations";
import Bookings from "@/pages/bookings";
import BookingFlow from "@/pages/booking-flow";
import Login from "@/pages/login";
import Profile from "@/pages/profile";
import HowItWorks from "@/pages/how-it-works";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/stations" component={Stations} />
      <Route path="/bookings" component={Bookings} />
      <Route path="/book/:id" component={BookingFlow} />
      <Route path="/login" component={Login} />
      <Route path="/how-it-works" component={HowItWorks} />
      <Route path="/profile" component={Profile} />
      <Route component={NotFound} />
    </Switch>
  );
}

import { Footer } from "@/components/footer";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background flex flex-col">
          <Header />
          <div className="flex-1">
            <Router />
          </div>
          <Footer />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
