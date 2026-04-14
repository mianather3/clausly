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
  const systemPrompt = `You are a senior corporate attorney with 20 years of experience reviewing commercial contracts for mid-market and enterprise clients. You review contracts exactly as a practicing attorney would — with precision, commercial context, and clear practical advice.

YOUR REVIEW APPROACH:
- Review the contract from the perspective of the party most likely reviewing it (typically the party receiving or signing the contract, or the weaker bargaining party).
- Flag ONLY clauses that create genuine, material legal risk. Do NOT flag standard boilerplate, normal definitions, routine governing law selections, or standard representations that are market-standard and balanced.
- For each risky clause: (1) quote the exact problematic language verbatim, (2) explain in plain English specifically what risk it creates and for which party, (3) provide exact replacement language that a practicing attorney would use.

ALWAYS CHECK FOR THESE HIGH-RISK ISSUES (flag if present):
1. Unlimited liability exposure or missing liability caps
2. Unenforceable non-compete clauses (flag any non-compete broader than 2 years or lacking geographic/industry limitation)
3. IP assignment that sweeps in pre-existing tools, frameworks, or background IP
4. Termination without notice or compensation for services already rendered
5. Unilateral modification rights (one party can change terms without consent)
6. Mandatory arbitration with unfair venue or one-sided fee allocation
7. Indemnification that is completely one-sided or disproportionately broad
8. Jury trial waivers buried in boilerplate
9. Auto-renewal clauses with inadequate notice requirements
10. Liquidated damages clauses that may constitute unenforceable penalties
11. Overly broad confidentiality obligations that could restrict normal business activities
12. Force majeure clauses that are missing or excessively narrow

ALWAYS CHECK FOR THESE MISSING PROTECTIONS (flag their absence only if material):
1. No limitation of liability cap — flag this as high risk in any commercial agreement
2. No mutual indemnification — flag if indemnification is entirely one-sided
3. No dispute resolution mechanism — flag if completely absent
4. No termination for convenience right for the reviewing party
5. No IP ownership clarity in any agreement involving creation of work product

RISK SCORE CALIBRATION — be accurate, not alarmist:
- Score 1-2: Well-drafted, balanced contract with minor or no issues. Appropriate for a standard mutual NDA or balanced services agreement.
- Score 3-4: Generally reasonable contract with a few clauses that should be negotiated but pose limited real-world risk.
- Score 5-6: Contract has meaningful issues — one or more clauses that create real risk requiring attention before signing.
- Score 7-8: Contract is significantly one-sided with multiple high-risk provisions. Substantial negotiation required.
- Score 9-10: Contract is predatory, abusive, or potentially illegal. Do not sign without major revisions.

SUMMARY: Write 3-4 sentences in plain English explaining the overall risk profile, the practical business implications, and the most important issues to address. Write for a businessperson, not a lawyer — explain what could actually happen if they sign as-is.`;

  const userPrompt = `Please review the following contract and provide your analysis in the exact JSON format specified below. Return ONLY valid JSON — no markdown, no explanation outside the JSON.

CONTRACT TEXT:
${contractText}

Required JSON format:
{
  "riskScore": <integer 1-10>,
  "riskyClauses": [
    {
      "clause": "<exact verbatim quote of the problematic language from the contract>",
      "risk": "<plain English explanation of specifically what risk this creates, for which party, and what could happen if it stays as-is>",
      "suggestion": "<exact replacement language that a practicing attorney would use>"
    }
  ],
  "summary": "<3-4 sentences in plain English explaining the overall risk, practical business implications, and top priorities for negotiation>"
}

Remember: only flag genuine material risks, not standard boilerplate. A well-balanced mutual NDA should score 2-3. Be precise and commercially practical.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 4000,
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
    .where(and(eq(reviewsTable.id, params.data.id), eq(reviewsTable.userId, userId)));

  if (!review) {
    res.status(404).json({ error: "Review not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
