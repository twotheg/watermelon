import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { configureWebPush } from "@/lib/push";
import { z } from "zod";

export const dynamic = "force-dynamic";

const sendSchema = z.object({
  title: z.string().max(100).optional(),
  message: z.string().max(200).optional(),
  url: z.string().max(200).optional(),
  secret: z.string(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = sendSchema.parse(body);

  const pushSecret = process.env.PUSH_SECRET;
  if (pushSecret && parsed.secret !== pushSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!pushSecret) {
    return Response.json(
      { error: "PUSH_SECRET is not configured on the server" },
      { status: 403 }
    );
  }

  const webPush = configureWebPush();
  const subscriptions = await db.select().from(pushSubscriptions);

  const payload = JSON.stringify({
    title: parsed.title || "과일 합치기",
    body: parsed.message || "새로운 기록에 도전해 보세요! 🍉",
    url: parsed.url || "/",
  });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        payload
      )
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return Response.json({ sent, failed, total: subscriptions.length });
}
