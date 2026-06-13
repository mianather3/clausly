import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, comparisonsTable } from "@workspace/db";
import { CreateComparisonBody } from "@workspace/api-zod/schemas";
import { requireAuth } from "../../middlewares/requireAuth";
import { openai } from "../../lib/openai";

const router: IRouter = Router();

interface ComparisonResult {
  differences: Array<{ topic: string; contractA: string; contractB: string }>;
  missingClauses: Array<{ clause: string; presentIn: "A" | "B" }>;
  assessment: { summary: string; favoredParty: string; recommendation: string };
}

async function compareContracts(contractAText: string, contractBText: string): Promise<ComparisonResult> {
  const prompt = `You are a senior corporate attorney. Compare the following two contracts and provide a detailed analysis.

CONTRACT A:
${contractAText}

CONTRACT B:
${contractBText}

Return a JSON object with this exact structure:
{
  "differences": [
    { "topic": "string (e.g. 'Termination Clause')", "contractA": "string (what Contract A says)", "contractB": "string (what Contract B says)" }
  ],
  "missingClauses": [
    { "clause": "string (clause name/description)", "presentIn": "A" or "B" }
  ],
  "assessment": {
    "summary": "string (2-3 sentence overall summary of the key differences)",
    "favoredParty": "string (which contract is more favorable to which party, and why)",
    "recommendation": "string (practical recommendation for someone reviewing both)"
  }
}

Identify at least 3-8 key differences. Only include clauses in missingClauses if they are genuinely absent from one contract but present in the other. Return only valid JSON, no markdown.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as ComparisonResult;
  return parsed;
}

router.get("/comparisons", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const comparisons = await db
    .select()
    .from(comparisonsTable)
    .where(eq(comparisonsTable.userId, userId))
    .orderBy(comparisonsTable.createdAt);
  res.json(comparisons);
});

router.post("/comparisons", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateComparisonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { title, contractAText, contractBText } = parsed.data;
  const userId = (req as any).userId as string;

  const result = await compareContracts(contractAText, contractBText);

  const [comparison] = await db
    .insert(comparisonsTable)
    .values({
      userId,
      title,
      contractAText,
      contractBText,
      differencesJson: JSON.stringify(result.differences),
      missingClausesJson: JSON.stringify(result.missingClauses),
      assessmentJson: JSON.stringify(result.assessment),
    })
    .returning();

  res.status(201).json(comparison);
});

router.get("/comparisons/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const userId = (req as any).userId as string;

  const [comparison] = await db
    .select()
    .from(comparisonsTable)
    .where(and(eq(comparisonsTable.id, id), eq(comparisonsTable.userId, userId)));

  if (!comparison) { res.status(404).json({ error: "Not found" }); return; }
  res.json(comparison);
});

router.delete("/comparisons/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const userId = (req as any).userId as string;

  const [deleted] = await db
    .delete(comparisonsTable)
    .where(and(eq(comparisonsTable.id, id), eq(comparisonsTable.userId, userId)))
    .returning();

  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.status(204).send();
});

export default router;
