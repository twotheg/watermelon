import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { z } from "zod";

export const dynamic = "force-dynamic";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = subscriptionSchema.parse(body);

  await db
    .insert(pushSubscriptions)
    .values({
      endpoint: parsed.endpoint,
      p256dh: parsed.keys.p256dh,
      auth: parsed.keys.auth,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        p256dh: parsed.keys.p256dh,
        auth: parsed.keys.auth,
      },
    });

  return Response.json({ ok: true });
}
