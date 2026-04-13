import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, reviewsTable } from "@workspace/db";
import { CreateReviewBody, GetReviewParams, DeleteReviewParams, ListReviewsResponse, GetReviewResponse } from "@workspace/api-zod";
import { requireAuth } from "../../middlewares/requireAuth";
import { openai } from "../../lib/openai";

const router: IRouter = Router();

interface RiskyClause {
  clause: string;
  risk: string;
  suggestion: string;
}

interface ReviewResult {
  riskScore: number;
  riskyClauses: RiskyClause[];
  summary: string;
}

async function analyzeContract(contractText: string): Promise<ReviewResult> {
  const prompt = `You are an expert legal contract analyst. Analyze the following contract and provide a detailed risk assessment.

CONTRACT TEXT:
${contractText}

Provide your analysis in the following JSON format (return ONLY valid JSON, no markdown, no explanation):
{
  "riskScore": <integer 1-10, where 1=very safe, 10=extremely risky>,
  "riskyClauses": [
    {
      "clause": "<exact quote of the risky clause or section>",
      "risk": "<explanation of why this clause is risky>",
      "suggestion": "<suggested replacement or modification language>"
    }
  ],
  "summary": "<overall summary of the contract's risk profile, main concerns, and recommendations in 2-3 sentences>"
}

Be thorough — identify all clauses that are unusual, one-sided, potentially unenforceable, or that could harm the reviewing party. If there are no risky clauses, return an empty array but still provide a risk score and summary.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 3000,
    response_format: { type: "json_object" },
  });

  const rawContent = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(rawContent);

  return {
    riskScore: Math.min(10, Math.max(1, parseInt(parsed.riskScore) || 5)),
    riskyClauses: Array.isArray(parsed.riskyClauses) ? parsed.riskyClauses : [],
    summary: parsed.summary || "",
  };
}

router.get("/reviews", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const reviews = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.userId, userId))
    .orderBy(reviewsTable.createdAt);
  res.json(ListReviewsResponse.parse(reviews));
});

router.post("/reviews", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateReviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { contractText, title } = parsed.data;
  const userId = (req as any).userId as string;

  const result = await analyzeContract(contractText);

  const [review] = await db
    .insert(reviewsTable)
    .values({
      userId,
      title,
      contractText,
      riskScore: result.riskScore,
      riskyClausesJson: JSON.stringify(result.riskyClauses),
      summaryJson: JSON.stringify({ summary: result.summary }),
    })
    .returning();

  res.status(201).json(GetReviewResponse.parse(review));
});

router.get("/reviews/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetReviewParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = (req as any).userId as string;
  const [review] = await db
    .select()
    .from(reviewsTable)
    .where(and(eq(reviewsTable.id, params.data.id), eq(reviewsTable.userId, userId)));

  if (!review) {
    res.status(404).json({ error: "Review not found" });
    return;
  }

  res.json(GetReviewResponse.parse(review));
});

router.delete("/reviews/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteReviewParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = (req as any).userId as string;
  const [review] = await db
    .delete(reviewsTable)
    .where(and(eq(reviewsTable.id, params.data.id), eq(reviewsTable.userId, userId)))
    .returning();

  if (!review) {
    res.status(404).json({ error: "Review not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
