import { Router, type IRouter } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { sql, desc } from "drizzle-orm";
import { db, documentsTable, reviewsTable } from "@workspace/db";
import type { Request, Response, NextFunction } from "express";

const router: IRouter = Router();

const ADMIN_EMAIL = "mianather783@gmail.com";

async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const user = await clerkClient.users.getUser(auth.userId);
    const email = user.emailAddresses.find(
      (e) => e.id === user.primaryEmailAddressId
    )?.emailAddress;
    if (email !== ADMIN_EMAIL) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  } catch {
    res.status(403).json({ error: "Forbidden" });
  }
}

router.get("/admin/stats", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const [totalUsersRow] = await db
    .select({ count: sql<number>`count(distinct user_id)::int` })
    .from(documentsTable);

  const [totalDocsRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(documentsTable);

  const [totalReviewsRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reviewsTable);

  const [popularTypeRow] = await db
    .select({
      documentType: documentsTable.documentType,
      count: sql<number>`count(*)::int`,
    })
    .from(documentsTable)
    .groupBy(documentsTable.documentType)
    .orderBy(desc(sql`count(*)`))
    .limit(1);

  const docsPerDay = await db
    .select({
      day: sql<string>`date_trunc('day', created_at)::date::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(documentsTable)
    .where(sql`created_at >= now() - interval '30 days'`)
    .groupBy(sql`date_trunc('day', created_at)::date`)
    .orderBy(sql`date_trunc('day', created_at)::date`);

  const docsByUser = await db
    .select({
      userId: documentsTable.userId,
      docCount: sql<number>`count(*)::int`,
      firstDoc: sql<string>`min(created_at)::text`,
      lastDoc: sql<string>`max(created_at)::text`,
    })
    .from(documentsTable)
    .groupBy(documentsTable.userId);

  const reviewsByUser = await db
    .select({
      userId: reviewsTable.userId,
      reviewCount: sql<number>`count(*)::int`,
      firstReview: sql<string>`min(created_at)::text`,
      lastReview: sql<string>`max(created_at)::text`,
    })
    .from(reviewsTable)
    .groupBy(reviewsTable.userId);

  const reviewMap = new Map(reviewsByUser.map((r) => [r.userId, r]));

  const userActivity = docsByUser
    .map((d) => {
      const r = reviewMap.get(d.userId);
      const dates = [d.firstDoc, r?.firstReview].filter(Boolean) as string[];
      const lastDates = [d.lastDoc, r?.lastReview].filter(Boolean) as string[];
      return {
        userId: d.userId,
        docCount: d.docCount,
        reviewCount: r?.reviewCount ?? 0,
        firstActivity: dates.sort()[0] ?? d.firstDoc,
        lastActivity: lastDates.sort().reverse()[0] ?? d.lastDoc,
      };
    })
    .sort((a, b) => b.docCount - a.docCount);

  const recentDocuments = await db
    .select({
      id: documentsTable.id,
      title: documentsTable.title,
      documentType: documentsTable.documentType,
      userId: documentsTable.userId,
      createdAt: sql<string>`created_at::text`,
    })
    .from(documentsTable)
    .orderBy(desc(documentsTable.createdAt))
    .limit(10);

  const recentReviews = await db
    .select({
      id: reviewsTable.id,
      title: reviewsTable.title,
      riskScore: reviewsTable.riskScore,
      userId: reviewsTable.userId,
      createdAt: sql<string>`created_at::text`,
    })
    .from(reviewsTable)
    .orderBy(desc(reviewsTable.createdAt))
    .limit(10);

  res.json({
    totalUsers: totalUsersRow?.count ?? 0,
    totalDocuments: totalDocsRow?.count ?? 0,
    totalReviews: totalReviewsRow?.count ?? 0,
    mostPopularDocType: popularTypeRow?.documentType ?? null,
    docsPerDay,
    userActivity,
    recentDocuments,
    recentReviews,
  });
});

export default router;
