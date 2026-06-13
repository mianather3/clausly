import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, documentsTable, reviewsTable, templatesTable } from "@workspace/db";
import { GetDashboardStatsResponse, GetRecentActivityResponse } from "@workspace/api-zod/schemas";
import { requireAuth } from "../../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;

  const [docCountResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(documentsTable)
    .where(eq(documentsTable.userId, userId));

  const [reviewCountResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reviewsTable)
    .where(eq(reviewsTable.userId, userId));

  const [avgRiskResult] = await db
    .select({ avg: sql<number | null>`avg(risk_score)` })
    .from(reviewsTable)
    .where(eq(reviewsTable.userId, userId));

  const docsByType = await db
    .select({
      documentType: documentsTable.documentType,
      count: sql<number>`count(*)::int`,
    })
    .from(documentsTable)
    .where(eq(documentsTable.userId, userId))
    .groupBy(documentsTable.documentType);

  const documentsByType: Record<string, number> = {};
  for (const row of docsByType) {
    documentsByType[row.documentType] = row.count;
  }

  const avgRaw = avgRiskResult?.avg;
  const avgRiskScore = avgRaw != null ? Math.round(Number(avgRaw) * 10) / 10 : null;

  const [templateCountResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(templatesTable)
    .where(eq(templatesTable.userId, userId));

  const stats = {
    totalDocuments: docCountResult?.count ?? 0,
    totalReviews: reviewCountResult?.count ?? 0,
    templateCount: templateCountResult?.count ?? 0,
    documentsByType,
    avgRiskScore,
  };

  res.json(GetDashboardStatsResponse.parse(stats));
});

router.get("/dashboard/recent", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;

  const documents = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.userId, userId))
    .orderBy(documentsTable.createdAt)
    .limit(5);

  const reviews = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.userId, userId))
    .orderBy(reviewsTable.createdAt)
    .limit(5);

  res.json(GetRecentActivityResponse.parse({ documents, reviews }));
});

export default router;
