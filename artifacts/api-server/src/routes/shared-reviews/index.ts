import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, reviewsTable, sharedReviewsTable } from "@workspace/db";
import { requireAuth } from "../../middlewares/requireAuth";
import type { Request, Response } from "express";

const router: IRouter = Router();

// POST /api/reviews/:id/share — authenticated, create or return existing share token
router.post("/reviews/:id/share", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const reviewId = parseInt(req.params.id as string, 10);
  if (isNaN(reviewId)) { res.status(400).json({ error: "Invalid review id" }); return; }
  const userId = (req as any).userId as string;

  const [review] = await db.select({ id: reviewsTable.id, userId: reviewsTable.userId })
    .from(reviewsTable).where(eq(reviewsTable.id, reviewId));
  if (!review || review.userId !== userId) { res.status(404).json({ error: "Review not found" }); return; }

  // Return existing token if already shared
  const [existing] = await db.select().from(sharedReviewsTable)
    .where(eq(sharedReviewsTable.reviewId, reviewId));
  if (existing) { res.json({ token: existing.token }); return; }

  const token = crypto.randomUUID();
  await db.insert(sharedReviewsTable).values({ reviewId, token });
  res.status(201).json({ token });
});

// GET /api/shared-reviews/:token — public, no contractText exposed
router.get("/shared-reviews/:token", async (req: Request, res: Response): Promise<void> => {
  const token = req.params.token as string;
  const [shared] = await db.select().from(sharedReviewsTable)
    .where(eq(sharedReviewsTable.token, token));
  if (!shared) { res.status(404).json({ error: "Shared review not found" }); return; }

  const [review] = await db.select({
    id: reviewsTable.id,
    title: reviewsTable.title,
    riskScore: reviewsTable.riskScore,
    riskyClausesJson: reviewsTable.riskyClausesJson,
    summaryJson: reviewsTable.summaryJson,
    createdAt: reviewsTable.createdAt,
  }).from(reviewsTable).where(eq(reviewsTable.id, shared.reviewId));

  if (!review) { res.status(404).json({ error: "Review not found" }); return; }
  res.json(review);
});

export default router;
