import { type User, type InsertUser, type PutCallRatio, type InsertPutCallRatio, putCallRatios, users } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { desc, gte, and, lte, eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getPutCallRatio(date: string): Promise<PutCallRatio | undefined>;
  getPutCallRatiosByDateRange(startDate: string, endDate: string): Promise<PutCallRatio[]>;
  upsertPutCallRatio(data: InsertPutCallRatio): Promise<PutCallRatio>;
  getLatestPutCallRatios(limit: number): Promise<PutCallRatio[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async getPutCallRatio(date: string): Promise<PutCallRatio | undefined> {
    const result = await db.select().from(putCallRatios).where(eq(putCallRatios.date, date)).limit(1);
    return result[0];
  }

  async getPutCallRatiosByDateRange(startDate: string, endDate: string): Promise<PutCallRatio[]> {
    const result = await db.select()
      .from(putCallRatios)
      .where(and(gte(putCallRatios.date, startDate), lte(putCallRatios.date, endDate)))
      .orderBy(desc(putCallRatios.date));
    return result;
  }

  async upsertPutCallRatio(data: InsertPutCallRatio): Promise<PutCallRatio> {
    const result = await db.insert(putCallRatios)
      .values(data)
      .onConflictDoUpdate({
        target: putCallRatios.date,
        set: {
          ratio: data.ratio,
          callVolume: data.callVolume,
          putVolume: data.putVolume,
          totalVolume: data.totalVolume,
        }
      })
      .returning();
    return result[0];
  }

  async getLatestPutCallRatios(limit: number): Promise<PutCallRatio[]> {
    const result = await db.select()
      .from(putCallRatios)
      .orderBy(desc(putCallRatios.date))
      .limit(limit);
    return result;
  }
}

export const storage = new DatabaseStorage();
