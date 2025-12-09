import { type Station, type InsertStation, type Booking, type InsertBooking } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Stations
  getStations(): Promise<Station[]>;
  getStation(id: number): Promise<Station | undefined>;
  createStation(station: InsertStation): Promise<Station>;

  // Bookings
  getBookings(status?: string): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBookingStatus(id: string, status: string): Promise<Booking | undefined>;
  assignSlotToBooking(id: string, slotId: number): Promise<Booking | undefined>;
  getStationBookings(stationId: number, date: Date): Promise<Booking[]>;
  getBookingsByPlate(plateNumber: string): Promise<Booking[]>;

  // Users
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  createUser(email: string, hashedPassword: string, name?: string, carModel?: string, carNumber?: string): Promise<User>;
  updateUser(id: string, data: { name?: string | null; carModel?: string | null; carNumber?: string | null }): Promise<User | undefined>;

  // Slot Management
  updateSlotStatus(stationId: number, slotId: number, isOccupied: boolean): void;
  getAvailableSlot(stationId: number): number | null;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private stations: Map<number, Station>;
  private bookings: Map<string, Booking>;
  private stationIdCounter: number;
  private slotStates: Map<number, Map<number, boolean>>; // stationId -> slotId -> isOccupied

  constructor() {
    this.stations = new Map();
    this.bookings = new Map();
    this.stationIdCounter = 1;
    this.users = new Map();
    this.slotStates = new Map();
    this.seedData();
  }

  private seedData() {
    // Seed some initial stations
    const initialStations: Omit<Station, 'id'>[] = [
      {
        name: "Indiranagar Power Hub",
        location: "100 Feet Rd, Indiranagar, Bengaluru",
        image: "/assets/generated_images/indiranagar.png", // Frontend maps this via ID usually, but good to have path
        chargerTypes: ["Level 2", "DC Fast"],
        pricePerKwh: "15.00", // INR
        latitude: "12.9716",
        longitude: "77.6412",
      },
      {
        name: "Koramangala Charging Point",
        location: "Forum Mall, Koramangala, Bengaluru",
        image: "/assets/generated_images/koramangala.png",
        chargerTypes: ["DC Fast", "Tesla"],
        pricePerKwh: "18.50",
        latitude: "12.9352",
        longitude: "77.6245",
      },
      {
        name: "Whitefield Tech Charge",
        location: "ITPL Main Rd, Whitefield, Bengaluru",
        image: "/assets/generated_images/whitefield.png",
        chargerTypes: ["Level 2"],
        pricePerKwh: "12.00",
        latitude: "12.9698",
        longitude: "77.7500",
      },
    ];

    initialStations.forEach(station => {
      const id = this.stationIdCounter++;
      this.stations.set(id, { ...station, id });
    });
  }

  async getStations(): Promise<Station[]> {
    return Array.from(this.stations.values());
  }

  async getStation(id: number): Promise<Station | undefined> {
    return this.stations.get(id);
  }

  async createStation(insertStation: InsertStation): Promise<Station> {
    const id = this.stationIdCounter++;
    const station: Station = {
      ...(insertStation as any),
      id,
      latitude: (insertStation as any).latitude ?? null,
      longitude: (insertStation as any).longitude ?? null,
    };
    this.stations.set(id, station);
    return station;
  }

  async getBookings(status?: string): Promise<Booking[]> {
    const allBookings = Array.from(this.bookings.values());
    if (status) {
      return allBookings.filter(b => b.status === status);
    }
    return allBookings;
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const id = randomUUID();
    const booking: Booking = {
      id,
      ...insertBooking,
      status: insertBooking.status ?? "upcoming",
      stripePaymentId: insertBooking.stripePaymentId ?? null,
      createdAt: new Date(),
      slotId: null, // Default to null, assigned on entry
    };
    this.bookings.set(id, booking);
    return booking;
  }

  async updateBookingStatus(id: string, status: string): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (booking) {
      booking.status = status;
      this.bookings.set(id, booking);
      return booking;
    }
    return undefined;
  }

  async assignSlotToBooking(id: string, slotId: number): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (booking) {
      booking.slotId = slotId;
      this.bookings.set(id, booking);
      return booking;
    }
    return undefined;
  }

  async getStationBookings(stationId: number, date: Date): Promise<Booking[]> {
    const dateStr = date.toISOString().split('T')[0];
    return Array.from(this.bookings.values()).filter(
      b => b.stationId === stationId &&
        b.date.toISOString().split('T')[0] === dateStr
    );
  }

  async getBookingsByPlate(plateNumber: string): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      b => b.carNumber === plateNumber
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async createUser(email: string, hashedPassword: string, name?: string, carModel?: string, carNumber?: string): Promise<User> {
    const id = randomUUID();
    const user: User = { id, email, hashedPassword, name: name ?? null, carModel: carModel ?? null, carNumber: carNumber ?? null, createdAt: new Date() };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, data: { name?: string | null; carModel?: string | null; carNumber?: string | null }): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated: User = {
      ...user,
      name: data.name === undefined ? user.name : data.name,
      carModel: data.carModel === undefined ? user.carModel : data.carModel,
      carNumber: data.carNumber === undefined ? user.carNumber : data.carNumber,
    };
    this.users.set(id, updated);
    return updated;
  }

  updateSlotStatus(stationId: number, slotId: number, isOccupied: boolean): void {
    if (!this.slotStates.has(stationId)) {
      this.slotStates.set(stationId, new Map());
    }
    this.slotStates.get(stationId)!.set(slotId, isOccupied);
    console.log(`[Storage] Updated Station ${stationId} Slot ${slotId} -> ${isOccupied ? 'Occupied' : 'Free'}`);
  }

  getAvailableSlot(stationId: number): number | null {
    // Assuming 3 slots for now (1, 2, 3)
    // If we had dynamic slots per station, we'd need to store that config.
    // For now, hardcode 1-3 check.
    const stationSlots = this.slotStates.get(stationId);
    if (!stationSlots) {
      // If no data, assume all free? Or wait for update?
      // Let's assume 1 is free if no data.
      return 1;
    }

    for (let i = 1; i <= 3; i++) {
      if (!stationSlots.get(i)) { // If false or undefined (free)
        return i;
      }
    }
    return null; // All occupied
  }
}

export interface User {
  id: string;
  email: string;
  hashedPassword: string;
  name: string | null;
  carModel: string | null;
  carNumber: string | null;
  createdAt: Date;
}

export const storage = new MemStorage();
