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

export const spxPutCallHistory = pgTable("spx_put_call_history", {
  date: date("date").primaryKey(),
  ratio: real("ratio").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSpxPutCallSchema = createInsertSchema(spxPutCallHistory).omit({
  createdAt: true,
});

export type InsertSpxPutCall = z.infer<typeof insertSpxPutCallSchema>;
export type SpxPutCall = typeof spxPutCallHistory.$inferSelect;
