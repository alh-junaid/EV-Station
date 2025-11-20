import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { Zap, User, Edit, LogOut, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";

import { useAuth } from "@/hooks/use-auth";

export function Header() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" data-testid="link-home">
            <div className="flex items-center gap-2 hover-elevate active-elevate-2 rounded-md px-3 py-2 -ml-3">
              <Zap className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">ChargeSpot</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/stations" data-testid="link-stations">
              <span className="text-sm font-medium hover-elevate active-elevate-2 px-3 py-2 rounded-md">
                Stations
              </span>
            </Link>
            <Link href="/bookings" data-testid="link-bookings">
              <span className="text-sm font-medium hover-elevate active-elevate-2 px-3 py-2 rounded-md">
                My Bookings
              </span>
            </Link>
            <Link href="/how-it-works" data-testid="link-how-it-works">
              <span className="text-sm font-medium hover-elevate active-elevate-2 px-3 py-2 rounded-md">
                How It Works
              </span>
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {user ? (
                  <>
                    <DropdownMenuLabel>{user.name ?? user.email}</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => setLocation('/profile')}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setLocation('/bookings')}>
                      <FileText className="mr-2 h-4 w-4" />
                      My Bookings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={async () => {
                        await logout.mutateAsync();
                        setLocation('/');
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onSelect={() => setLocation('/login')}>
                      <User className="mr-2 h-4 w-4" />
                      Login / Register
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
