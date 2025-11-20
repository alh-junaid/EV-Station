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
  getStationBookings(stationId: number, date: Date): Promise<Booking[]>;

  // Users
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  createUser(email: string, hashedPassword: string, name?: string, carModel?: string, carNumber?: string): Promise<User>;
  updateUser(id: string, data: { name?: string | null; carModel?: string | null; carNumber?: string | null }): Promise<User | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private stations: Map<number, Station>;
  private bookings: Map<string, Booking>;
  private stationIdCounter: number;

  constructor() {
    this.stations = new Map();
    this.bookings = new Map();
    this.stationIdCounter = 1;
    this.users = new Map();
    this.seedData();
  }

  private seedData() {
    // Seed some initial stations
    const initialStations: Omit<Station, 'id'>[] = [
      {
        name: "Downtown Power Hub",
        location: "123 Main St, San Francisco, CA",
        image: "/api/placeholder-station-1.jpg",
        chargerTypes: ["Level 2", "DC Fast"],
        pricePerKwh: "0.35",
        latitude: "37.7749",
        longitude: "-122.4194",
      },
      {
        name: "Green Valley Charging",
        location: "456 Oak Ave, Palo Alto, CA",
        image: "/api/placeholder-station-2.jpg",
        chargerTypes: ["DC Fast", "Tesla"],
        pricePerKwh: "0.42",
        latitude: "37.4419",
        longitude: "-122.1430",
      },
      {
        name: "Metro Charge Center",
        location: "789 Broadway, Oakland, CA",
        image: "/api/placeholder-station-3.jpg",
        chargerTypes: ["Level 2"],
        pricePerKwh: "0.28",
        latitude: "37.8044",
        longitude: "-122.2712",
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
      ...insertStation,
      id,
      latitude: insertStation.latitude ?? null,
      longitude: insertStation.longitude ?? null,
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

  async getStationBookings(stationId: number, date: Date): Promise<Booking[]> {
    const dateStr = date.toISOString().split('T')[0];
    return Array.from(this.bookings.values()).filter(
      b => b.stationId === stationId && 
      b.date.toISOString().split('T')[0] === dateStr
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
