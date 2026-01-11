import { sql } from "drizzle-orm";
import { pgTable, text, varchar, date, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

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

export const allowedEmails = pgTable("allowed_emails", {
  email: varchar("email", { length: 255 }).primaryKey(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export type AllowedEmail = typeof allowedEmails.$inferSelect;
