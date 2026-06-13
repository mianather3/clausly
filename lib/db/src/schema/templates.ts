import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const templatesTable = pgTable("templates", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  documentType: text("document_type").notNull(),
  partyA: text("party_a").notNull(),
  jurisdiction: text("jurisdiction"),
  keyTerms: text("key_terms").notNull(),
  additionalContext: text("additional_context"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Template = typeof templatesTable.$inferSelect;
