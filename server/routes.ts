import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupWebSocket, getWebSocketHandler } from "./websocket";
import { insertBookingSchema } from "@shared/schema";
import Stripe from "stripe";
import bcrypt from "bcryptjs";

// Initialize Stripe only if the secret key is available. Do not throw at import
// time — throwing here causes the server to crash and Vite to return an HTML
// overlay which API clients then try to parse as JSON (leading to "Unexpected
// token '<'" errors). Instead, keep `stripe` null and return JSON errors
// from endpoints that require Stripe.
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  try {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-10-29.clover" });
  } catch (err) {
    console.error('Failed to initialize Stripe:', err);
    stripe = null;
  }
} else {
  console.warn('STRIPE_SECRET_KEY not set — Stripe features disabled. Use demo payments.');
}

export async function registerRoutes(app: Express): Promise<Server> {
  console.log('registerRoutes: registering API routes');

  // simple ping endpoint to verify API server is responding with JSON
  app.get('/api/ping', (_req, res) => res.json({ ok: true }));

  // Auth endpoints
  app.post("/api/register", async (req, res) => {
    try {
      const { email, password, name, carModel, carNumber } = req.body;
      if (!email || !password) return res.status(400).json({ error: "Missing fields" });

      const existing = await storage.getUserByEmail(email);
      if (existing) return res.status(409).json({ error: "User already exists" });

      const hashed = await bcrypt.hash(password, 10);
      const user = await storage.createUser(email, hashed, name, carModel, carNumber);
      // Create session
      // @ts-ignore - set session userId
      req.session.userId = user.id;

      res.json({ id: user.id, email: user.email, name: user.name, carModel: user.carModel, carNumber: user.carNumber });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to register" });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: "Missing fields" });

      const user = await storage.getUserByEmail(email);
      if (!user) return res.status(404).json({ error: "User not found" });

      const ok = await bcrypt.compare(password, user.hashedPassword);
      if (!ok) return res.status(401).json({ error: "Invalid credentials" });

      // @ts-ignore
      req.session.userId = user.id;
      res.json({ id: user.id, email: user.email, name: user.name, carModel: user.carModel, carNumber: user.carNumber });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.get("/api/me", async (req, res) => {
    try {
      // @ts-ignore
      const userId = req.session?.userId;
      if (!userId) return res.json({ user: null });
      const user = await storage.getUserById(userId);
      if (!user) return res.json({ user: null });
      res.json({ user: { id: user.id, email: user.email, name: user.name, carModel: user.carModel, carNumber: user.carNumber } });
    } catch (error) {
      console.error("/api/me error:", error);
      res.status(500).json({ error: "Failed" });
    }
  });

  // Update profile (name, carModel, carNumber)
  app.patch("/api/me", async (req, res) => {
    try {
      // @ts-ignore
      const userId = req.session?.userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const { name, carModel, carNumber } = req.body || {};
      console.log(`/api/me PATCH called for userId=${userId} body=`, { name, carModel, carNumber });

      const updated = await storage.updateUser(userId, { name: name ?? null, carModel: carModel ?? null, carNumber: carNumber ?? null });
      if (!updated) return res.status(404).json({ error: "User not found" });

      return res.json({ id: updated.id, email: updated.email, name: updated.name, carModel: updated.carModel, carNumber: updated.carNumber });
    } catch (error) {
      console.error("/api/me patch error:", error);
      return res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.post("/api/logout", async (req, res) => {
    // @ts-ignore
    req.session?.destroy(() => { });
    res.json({ ok: true });
  });

  // Station routes
  app.get("/api/stations", async (req, res) => {
    try {
      const stations = await storage.getStations();
      res.json(stations);
    } catch (error) {
      console.error("Error fetching stations:", error);
      res.status(500).json({ error: "Failed to fetch stations" });
    }
  });

  // Hardware/Camera endpoints
  app.post("/api/hardware/identify", async (req, res) => {
    try {
      const { stationId, plateNumber } = req.body;
      console.log(`Identify request: Station ${stationId}, Plate ${plateNumber}`);

      if (!stationId || !plateNumber) {
        return res.status(400).json({ error: "Missing fields" });
      }

      // Map Station 1 to Indiranagar (ID 1) explicitly for clarity/logging
      if (stationId == 1) {
        console.log("Station 1 maps to Indiranagar Power Hub");
      }

      // Send SCANNING status to LCD
      const ws = getWebSocketHandler();
      if (ws) {
        ws.sendCommandToESP32(stationId, "SCANNING", { plateNumber });
      }

      // Check if there is a valid booking
      // Logic: Find booking for this car, at this station, where current time is within start/end
      // For simplicity in this demo, we'll just check if there's *any* upcoming/active booking for today

      const bookings = await storage.getBookingsByPlate(plateNumber);

      // Filter for bookings at this station and for today (or future)
      // In a real app, you'd check the specific time slot
      const validBooking = bookings.find(b =>
        b.stationId === stationId &&
        b.status !== "cancelled"
      );

      if (validBooking) {
        console.log(`Authorized! Found booking ${validBooking.id}. Sending OPEN command.`);
        const ws = getWebSocketHandler();
        if (ws) {
          // Send name if available
          ws.sendCommandToESP32(stationId, "GATE_OPEN", { name: validBooking.personName || "User" });
        }
        return res.json({ authorized: true, bookingId: validBooking.id });
      } else {
        console.log("Not Authorized. No valid booking found. Sending DENIED command.");
        const ws = getWebSocketHandler();
        if (ws) {
          ws.sendCommandToESP32(stationId, "GATE_DENIED");
        }
        return res.json({ authorized: false });
      }
    } catch (error) {
      console.error("Identify error:", error);
      res.status(500).json({ error: "Internal error" });
    }
  });

  app.get("/api/stations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid station ID" });
      }

      const station = await storage.getStation(id);
      if (!station) {
        return res.status(404).json({ error: "Station not found" });
      }

      res.json(station);
    } catch (error) {
      console.error("Error fetching station:", error);
      res.status(500).json({ error: "Failed to fetch station" });
    }
  });

  app.get("/api/stations/:id/availability", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const dateStr = req.query.date as string;

      if (isNaN(id) || !dateStr) {
        return res.status(400).json({ error: "Invalid parameters" });
      }

      const date = new Date(dateStr);
      const bookings = await storage.getStationBookings(id, date);

      // Return booked time slots
      const bookedSlots = bookings.map(b => b.startTime);
      res.json({ bookedSlots });
    } catch (error) {
      console.error("Error checking availability:", error);
      res.status(500).json({ error: "Failed to check availability" });
    }
  });

  // Booking routes
  app.get("/api/bookings", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const bookings = await storage.getBookings(status);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  app.get("/api/bookings/:id", async (req, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      console.error("Error fetching booking:", error);
      res.status(500).json({ error: "Failed to fetch booking" });
    }
  });

  // Create payment intent (but don't create booking yet)
  app.post("/api/payment-intent", async (req, res) => {
    try {
      const { stationId, totalCost } = req.body;

      if (!stationId || !totalCost) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Get station to validate price
      const station = await storage.getStation(parseInt(stationId));
      if (!station) {
        return res.status(404).json({ error: "Station not found" });
      }

      const amount = Math.round(parseFloat(totalCost) * 100); // Convert to cents

      if (!stripe) {
        return res.status(500).json({ error: 'Stripe not configured on server' });
      }

      let paymentIntent;
      try {
        paymentIntent = await stripe.paymentIntents.create({
          amount,
          currency: "inr",
          automatic_payment_methods: {
            enabled: true,
          },
          metadata: {
            stationId: stationId.toString(),
          },
        });
      } catch (stripeErr: any) {
        console.error('Stripe create paymentIntent error:', stripeErr);
        const msg = stripeErr?.raw?.message || stripeErr?.message || 'Stripe error';
        return res.status(502).json({ error: `Stripe error: ${msg}` });
      }

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ error: "Failed to create payment intent" });
    }
  });

  // Create booking after payment is confirmed
  app.post("/api/bookings", async (req, res) => {
    try {
      // Validate request body
      const validatedData = insertBookingSchema.parse({
        ...req.body,
        date: new Date(req.body.date),
      });

      // Verify the payment was successful
      if (validatedData.stripePaymentId) {
        // If this is a demo/test payment id (used by the demo PaymentForm), skip Stripe verification
        if (typeof validatedData.stripePaymentId === 'string' && validatedData.stripePaymentId.startsWith('demo_')) {
          // treat as succeeded in demo mode
        } else {
          if (!stripe) {
            return res.status(500).json({ error: 'Stripe not configured on server' });
          }
          try {
            const paymentIntent = await stripe.paymentIntents.retrieve(validatedData.stripePaymentId);
            if (paymentIntent.status !== "succeeded") {
              return res.status(400).json({ error: "Payment not completed" });
            }
          } catch (stripeErr: any) {
            console.error('Stripe retrieve paymentIntent error:', stripeErr);
            const msg = stripeErr?.raw?.message || stripeErr?.message || 'Stripe error';
            return res.status(502).json({ error: `Stripe error: ${msg}` });
          }
        }
      }

      // Check availability before creating booking
      const existingBookings = await storage.getStationBookings(
        validatedData.stationId,
        validatedData.date
      );

      const isSlotTaken = existingBookings.some(
        b => b.startTime === validatedData.startTime && b.status !== "cancelled"
      );

      if (isSlotTaken) {
        return res.status(409).json({ error: "Time slot no longer available" });
      }

      // Require login
      // @ts-ignore
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Create booking
      const booking = await storage.createBooking(validatedData);

      res.json(booking);
    } catch (error: any) {
      console.error("Error creating booking:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid booking data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create booking" });
    }
  });

  app.patch("/api/bookings/:id/cancel", async (req, res) => {
    try {
      const booking = await storage.updateBookingStatus(req.params.id, "cancelled");
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      // Refund the payment if it exists
      if (booking.stripePaymentId) {
        try {
          if (!stripe) {
            console.warn('Stripe not configured; skipping refund');
          } else {
            await stripe.refunds.create({
              payment_intent: booking.stripePaymentId,
            });
          }
        } catch (stripeError) {
          console.error("Stripe refund error:", stripeError);
          // Continue even if refund fails
        }
      }

      res.json(booking);
    } catch (error) {
      console.error("Error cancelling booking:", error);
      res.status(500).json({ error: "Failed to cancel booking" });
    }
  });

  // Dev-only debug endpoint to inspect current session + user (helps debug why profile updates fail)
  if (process.env.NODE_ENV === 'development') {
    app.get('/api/debug/me', async (req, res) => {
      try {
        // @ts-ignore
        const userId = req.session?.userId;
        const session = { userId };
        const user = userId ? await storage.getUserById(userId) : null;
        return res.json({ session, user });
      } catch (err) {
        console.error('/api/debug/me error', err);
        return res.status(500).json({ error: 'debug failed' });
      }
    });
    app.get('/api/debug/headers', async (req, res) => {
      try {
        // Return headers and a safe session snapshot so the client can verify cookies are sent
        // @ts-ignore
        const userId = req.session?.userId;
        return res.json({ headers: req.headers, session: { userId } });
      } catch (err) {
        console.error('/api/debug/headers error', err);
        return res.status(500).json({ error: 'debug headers failed' });
      }
    });
  }

  const httpServer = createServer(app);
  setupWebSocket(httpServer);
  return httpServer;
}
