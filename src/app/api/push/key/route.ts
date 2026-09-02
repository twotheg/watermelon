import { getVapidKeys } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function GET() {
  const keys = getVapidKeys();
  return Response.json({ publicKey: keys.publicKey });
}
