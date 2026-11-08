import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { ReportPayload, Scores } from "@/lib/types";

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceKey: text("workspace_key").notNull(),
    url: text("url").notNull(),
    normalizedUrl: text("normalized_url").notNull(),
    host: text("host").notNull(),
    overallScore: integer("overall_score").notNull(),
    scores: jsonb("scores").$type<Scores>().notNull(),
    payload: jsonb("payload").$type<ReportPayload>().notNull(),
    source: text("source").notNull().default("live"),
    durationMs: integer("duration_ms").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("reports_workspace_created_idx").on(
      table.workspaceKey,
      table.createdAt,
    ),
    index("reports_normalized_created_idx").on(
      table.normalizedUrl,
      table.createdAt,
    ),
  ],
);

export type ReportInsert = typeof reports.$inferInsert;
export type ReportSelect = typeof reports.$inferSelect;
