import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const stations = pgTable("stations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  image: text("image").notNull(),
  chargerTypes: text("charger_types").array().notNull(),
  pricePerKwh: decimal("price_per_kwh", { precision: 10, scale: 2 }).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
});

export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stationId: integer("station_id").notNull().references(() => stations.id),
  stationName: text("station_name").notNull(),
  location: text("location").notNull(),
  date: timestamp("date", { mode: "date" }).notNull(),
  startTime: text("start_time").notNull(),
  duration: integer("duration").notNull(),
  chargerType: text("charger_type").notNull(),
  status: text("status").notNull().default("upcoming"),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).notNull(),
  stripePaymentId: text("stripe_payment_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  personName: text("person_name"),
  carModel: text("car_model"),
  carNumber: text("car_number"),
  slotId: integer("slot_id"),
});

export const insertStationSchema = createInsertSchema(stations).extend({
  chargerTypes: z.array(z.string()),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
}).extend({
  date: z.date(),
  personName: z.string().nullable(),
  carModel: z.string().nullable(),
  carNumber: z.string().nullable(),
});

export type Station = typeof stations.$inferSelect;
export type InsertStation = z.infer<typeof insertStationSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
