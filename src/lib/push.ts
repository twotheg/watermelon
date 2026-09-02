import webPush from "web-push";

let vapidKeys: { publicKey: string; privateKey: string } | null = null;

export function getVapidKeys() {
  if (vapidKeys) return vapidKeys;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (publicKey && privateKey) {
    vapidKeys = { publicKey, privateKey };
  } else {
    const generated = webPush.generateVAPIDKeys();
    vapidKeys = generated;
    console.warn(
      "[push] VAPID keys not provided. Generated ephemeral keys for this session.\n" +
        "Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables for production."
    );
    console.warn(`[push] Ephemeral public key: ${generated.publicKey}`);
  }

  return vapidKeys;
}

export function configureWebPush() {
  const keys = getVapidKeys();
  const subject = process.env.VAPID_SUBJECT || "mailto:suika@example.com";
  webPush.setVapidDetails(subject, keys.publicKey, keys.privateKey);
  return webPush;
}

export { webPush };
