import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, documentsTable } from "@workspace/db";
import { CreateDocumentBody, GetDocumentParams, DeleteDocumentParams, ListDocumentsResponse, GetDocumentResponse } from "@workspace/api-zod";
import { requireAuth } from "../../middlewares/requireAuth";
import { openai } from "../../lib/openai";

const router: IRouter = Router();

const DOC_TYPE_LABELS: Record<string, string> = {
  nda: "Non-Disclosure Agreement (NDA)",
  privacy_policy: "Privacy Policy",
  contractor_agreement: "Independent Contractor Agreement",
  terms_of_service: "Terms of Service",
};

async function generateDocument(
  documentType: string,
  partyA: string,
  partyB: string | undefined,
  keyTerms: string,
  jurisdiction: string | undefined,
  additionalContext: string | undefined
): Promise<string> {
  const docLabel = DOC_TYPE_LABELS[documentType] || documentType;
  const prompt = `You are an experienced legal document drafter. Generate a professional, legally comprehensive ${docLabel} document based on the following information:

Party A (First Party): ${partyA}
${partyB ? `Party B (Second Party): ${partyB}` : ""}
Key Terms: ${keyTerms}
${jurisdiction ? `Jurisdiction: ${jurisdiction}` : "Jurisdiction: United States (general)"}
${additionalContext ? `Additional Context: ${additionalContext}` : ""}

Generate a complete, professional legal document with:
1. Proper legal header and party identification
2. All standard clauses for this document type
3. Clear definitions section
4. Numbered sections and subsections
5. Signature blocks at the end

Return ONLY the document text, formatted professionally with clear section headings. Do not include any preamble or explanation outside the document itself.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 4000,
  });

  return response.choices[0]?.message?.content ?? "";
}

router.get("/documents", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const docs = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.userId, userId))
    .orderBy(documentsTable.createdAt);
  res.json(ListDocumentsResponse.parse(docs));
});

router.post("/documents", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { documentType, partyA, partyB, keyTerms, jurisdiction, additionalContext } = parsed.data;
  const userId = (req as any).userId as string;

  const content = await generateDocument(
    documentType,
    partyA,
    partyB ?? undefined,
    keyTerms,
    jurisdiction ?? undefined,
    additionalContext ?? undefined
  );

  const docLabel = DOC_TYPE_LABELS[documentType] || documentType;
  const title = `${docLabel} - ${partyA}${partyB ? ` & ${partyB}` : ""}`;

  const [doc] = await db
    .insert(documentsTable)
    .values({
      userId,
      documentType,
      title,
      partyA,
      partyB: partyB ?? null,
      content,
      metadata: null,
    })
    .returning();

  res.status(201).json(GetDocumentResponse.parse(doc));
});

router.get("/documents/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = (req as any).userId as string;
  const [doc] = await db
    .select()
    .from(documentsTable)
    .where(and(eq(documentsTable.id, params.data.id), eq(documentsTable.userId, userId)));

  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  res.json(GetDocumentResponse.parse(doc));
});

router.delete("/documents/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = (req as any).userId as string;
  const [doc] = await db
    .delete(documentsTable)
    .where(and(eq(documentsTable.id, params.data.id), eq(documentsTable.userId, userId)))
    .returning();

  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
