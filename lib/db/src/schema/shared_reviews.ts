import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { reviewsTable } from "./reviews";

export const sharedReviewsTable = pgTable("shared_reviews", {
  id: serial("id").primaryKey(),
  reviewId: integer("review_id").notNull().references(() => reviewsTable.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SharedReview = typeof sharedReviewsTable.$inferSelect;
