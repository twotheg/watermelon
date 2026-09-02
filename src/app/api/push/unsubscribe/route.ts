import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  endpoint: z.string().url(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const { endpoint } = schema.parse(body);

  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));

  return Response.json({ ok: true });
}
