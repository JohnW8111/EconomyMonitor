import { type User, type InsertUser, type SpxPutCall, type InsertSpxPutCall, spxPutCallHistory, users } from "@shared/schema";
import { db } from "./db";
import { desc, gte, and, lte, eq, asc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getSpxPutCallByDate(date: string): Promise<SpxPutCall | undefined>;
  getSpxPutCallHistory(): Promise<SpxPutCall[]>;
  upsertSpxPutCall(data: InsertSpxPutCall): Promise<SpxPutCall>;
  bulkUpsertSpxPutCall(data: InsertSpxPutCall[]): Promise<void>;
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
}

export const storage = new DatabaseStorage();
