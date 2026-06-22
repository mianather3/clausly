import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";

export const playingWithNeon = pgTable("playing_with_neon", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  value: integer("value"),
});
