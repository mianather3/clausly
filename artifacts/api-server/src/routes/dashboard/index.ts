import { Router, type IRouter } from "express";
import { eq, sql, gte, and } from "drizzle-orm";
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

  // High risk count (score >= 7)
  const [highRiskResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reviewsTable)
    .where(and(eq(reviewsTable.userId, userId), gte(reviewsTable.riskScore, 7)));

  const highRiskCount = highRiskResult?.count ?? 0;

  // Most common risk — scan riskyClausesJson for keyword patterns
  const allReviews = await db
    .select({ riskyClausesJson: reviewsTable.riskyClausesJson })
    .from(reviewsTable)
    .where(eq(reviewsTable.userId, userId));

  const riskKeywords: Record<string, number> = {
    "Indemnification": 0,
    "Non-Compete": 0,
    "IP Assignment": 0,
    "Termination": 0,
    "Liability": 0,
    "Arbitration": 0,
    "Confidentiality": 0,
    "Auto-Renewal": 0,
  };

  for (const review of allReviews) {
    if (!review.riskyClausesJson) continue;
    try {
      const clauses = JSON.parse(review.riskyClausesJson) as Array<{ risk?: string; clause?: string }>;
      for (const clause of clauses) {
        const text = `${clause.risk ?? ""} ${clause.clause ?? ""}`.toLowerCase();
        if (text.includes("indemnif")) riskKeywords["Indemnification"]++;
        if (text.includes("non-compete") || text.includes("noncompete") || text.includes("competitor")) riskKeywords["Non-Compete"]++;
        if (text.includes("intellectual property") || text.includes("ip assignment") || text.includes("ownership")) riskKeywords["IP Assignment"]++;
        if (text.includes("terminat")) riskKeywords["Termination"]++;
        if (text.includes("liabilit")) riskKeywords["Liability"]++;
        if (text.includes("arbitrat")) riskKeywords["Arbitration"]++;
        if (text.includes("confidential")) riskKeywords["Confidentiality"]++;
        if (text.includes("auto-renew") || text.includes("automatic renewal")) riskKeywords["Auto-Renewal"]++;
      }
    } catch {}
  }

  const mostCommonRisk = Object.entries(riskKeywords)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

  const stats = {
    totalDocuments: docCountResult?.count ?? 0,
    totalReviews: reviewCountResult?.count ?? 0,
    templateCount: templateCountResult?.count ?? 0,
    documentsByType,
    avgRiskScore,
    highRiskCount,
    mostCommonRisk,
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
