import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, templatesTable } from "@workspace/db";
import { CreateTemplateBody } from "@workspace/api-zod/schemas";
import { requireAuth } from "../../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/templates", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const templates = await db
    .select()
    .from(templatesTable)
    .where(eq(templatesTable.userId, userId))
    .orderBy(templatesTable.createdAt);
  res.json(templates);
});

router.post("/templates", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { name, documentType, partyA, jurisdiction, keyTerms, additionalContext } = parsed.data;
  const userId = (req as any).userId as string;

  const [template] = await db
    .insert(templatesTable)
    .values({
      userId,
      name,
      documentType,
      partyA,
      jurisdiction: jurisdiction ?? null,
      keyTerms,
      additionalContext: additionalContext ?? null,
    })
    .returning();

  res.status(201).json(template);
});

router.delete("/templates/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const userId = (req as any).userId as string;

  const [deleted] = await db
    .delete(templatesTable)
    .where(and(eq(templatesTable.id, id), eq(templatesTable.userId, userId)))
    .returning();

  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.status(204).send();
});

export default router;
