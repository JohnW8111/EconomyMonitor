import { sql } from "drizzle-orm";
import { pgTable, text, varchar, date, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const putCallRatios = pgTable("put_call_ratios", {
  date: date("date").primaryKey(),
  ratio: real("ratio").notNull(),
  callVolume: integer("call_volume").notNull(),
  putVolume: integer("put_volume").notNull(),
  totalVolume: integer("total_volume").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPutCallRatioSchema = createInsertSchema(putCallRatios).omit({
  createdAt: true,
});

export type InsertPutCallRatio = z.infer<typeof insertPutCallRatioSchema>;
export type PutCallRatio = typeof putCallRatios.$inferSelect;
