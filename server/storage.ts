import { type SpxPutCall, type InsertSpxPutCall, spxPutCallHistory, allowedEmails, type AllowedEmail } from "@shared/schema";
import { db } from "./db";
import { eq, asc } from "drizzle-orm";

export interface IStorage {
  getSpxPutCallByDate(date: string): Promise<SpxPutCall | undefined>;
  getSpxPutCallHistory(): Promise<SpxPutCall[]>;
  upsertSpxPutCall(data: InsertSpxPutCall): Promise<SpxPutCall>;
  bulkUpsertSpxPutCall(data: InsertSpxPutCall[]): Promise<void>;
  isEmailAllowed(email: string): Promise<boolean>;
  getAllowedEmails(): Promise<AllowedEmail[]>;
  addAllowedEmail(email: string): Promise<AllowedEmail>;
  removeAllowedEmail(email: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getSpxPutCallByDate(date: string): Promise<SpxPutCall | undefined> {
    const result = await db.select().from(spxPutCallHistory).where(eq(spxPutCallHistory.date, date)).limit(1);
    return result[0];
  }

  async getSpxPutCallHistory(): Promise<SpxPutCall[]> {
    const result = await db.select()
      .from(spxPutCallHistory)
      .orderBy(asc(spxPutCallHistory.date));
    return result;
  }

  async upsertSpxPutCall(data: InsertSpxPutCall): Promise<SpxPutCall> {
    const result = await db.insert(spxPutCallHistory)
      .values(data)
      .onConflictDoUpdate({
        target: spxPutCallHistory.date,
        set: { ratio: data.ratio }
      })
      .returning();
    return result[0];
  }

  async bulkUpsertSpxPutCall(data: InsertSpxPutCall[]): Promise<void> {
    if (data.length === 0) return;
    
    for (const item of data) {
      await db.insert(spxPutCallHistory)
        .values(item)
        .onConflictDoUpdate({
          target: spxPutCallHistory.date,
          set: { ratio: item.ratio }
        });
    }
  }

  async isEmailAllowed(email: string): Promise<boolean> {
    const normalized = email.toLowerCase().trim();
    const result = await db.select().from(allowedEmails).where(eq(allowedEmails.email, normalized)).limit(1);
    return result.length > 0;
  }

  async getAllowedEmails(): Promise<AllowedEmail[]> {
    return await db.select().from(allowedEmails).orderBy(asc(allowedEmails.email));
  }

  async addAllowedEmail(email: string): Promise<AllowedEmail> {
    const normalized = email.toLowerCase().trim();
    const result = await db.insert(allowedEmails)
      .values({ email: normalized })
      .onConflictDoNothing()
      .returning();
    return result[0] || { email: normalized, addedAt: new Date() };
  }

  async removeAllowedEmail(email: string): Promise<void> {
    const normalized = email.toLowerCase().trim();
    await db.delete(allowedEmails).where(eq(allowedEmails.email, normalized));
  }
}

export const storage = new DatabaseStorage();
