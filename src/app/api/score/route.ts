import { db } from "@/db";
import { scores } from "@/db/schema";
import { desc } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "10")));

  const topScores = await db
    .select()
    .from(scores)
    .orderBy(desc(scores.score))
    .limit(limit);

  return Response.json({ scores: topScores });
}

const postSchema = z.object({
  name: z.string().max(20).optional(),
  score: z.number().int().min(0),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = postSchema.parse(body);

  const [record] = await db
    .insert(scores)
    .values({
      name: parsed.name?.trim() || "익명",
      score: parsed.score,
    })
    .returning();

  return Response.json({ score: record });
}
