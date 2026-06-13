import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const comparisonsTable = pgTable("comparisons", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  contractAText: text("contract_a_text").notNull(),
  contractBText: text("contract_b_text").notNull(),
  differencesJson: text("differences_json"),
  missingClausesJson: text("missing_clauses_json"),
  assessmentJson: text("assessment_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Comparison = typeof comparisonsTable.$inferSelect;
