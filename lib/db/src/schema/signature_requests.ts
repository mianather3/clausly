import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { documentsTable } from "./documents";

export const signatureRequestsTable = pgTable("signature_requests", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => documentsTable.id, { onDelete: "cascade" }),
  senderUserId: text("sender_user_id").notNull(),
  recipientEmail: text("recipient_email").notNull(),
  recipientName: text("recipient_name"),
  status: text("status").notNull().default("pending"),
  senderSignedAt: timestamp("sender_signed_at", { withTimezone: true }),
  recipientSignedAt: timestamp("recipient_signed_at", { withTimezone: true }),
  uniqueToken: text("unique_token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SignatureRequest = typeof signatureRequestsTable.$inferSelect;
