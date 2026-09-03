import { siteUrl } from "@/lib/site";

export { siteUrl };

export function lemonConfigured() {
  return Boolean(
    process.env.LEMON_SQUEEZY_API_KEY?.trim() &&
      process.env.LEMON_SQUEEZY_STORE_ID?.trim() &&
      process.env.LEMON_SQUEEZY_VARIANT_ID?.trim(),
  );
}

/** True when checkouts should use Lemon test mode. */
export function isLemonTestMode() {
  return (
    process.env.LEMON_SQUEEZY_TEST_MODE === "1" ||
    process.env.LEMON_SQUEEZY_TEST_MODE === "true" ||
    !process.env.LEMON_SQUEEZY_LIVE
  );
}

type LemonCheckoutResponse = {
  data?: {
    id?: string;
    attributes?: {
      url?: string;
      test_mode?: boolean;
    };
  };
  errors?: Array<{ detail?: string; title?: string }>;
};

async function lemonFetch(path: string, init?: RequestInit) {
  const apiKey = process.env.LEMON_SQUEEZY_API_KEY!.trim();
  const res = await fetch(`https://api.lemonsqueezy.com/v1${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${apiKey}`,
      ...(init?.headers ?? {}),
    },
  });
  const json = (await res.json()) as {
    data?: unknown;
    errors?: Array<{ detail?: string; title?: string }>;
  };
  return { ok: res.ok, status: res.status, json };
}

/** Register order_created webhook if it isn't already pointed at this site. */
export async function ensureLemonWebhook() {
  const storeId = process.env.LEMON_SQUEEZY_STORE_ID?.trim();
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET?.trim();
  if (!lemonConfigured() || !storeId || !secret) return { ok: false as const };

  const urls = Array.from(
    new Set([
      `${siteUrl()}/api/lemon/webhook`,
      "https://postpulse.com/api/lemon/webhook",
      "https://postinpulse.com/api/lemon/webhook",
    ]),
  );
  const listed = await lemonFetch("/webhooks");
  const hooks = Array.isArray(listed.json.data) ? listed.json.data : [];
  const existing = new Set(
    hooks.map((h) => (h as { attributes?: { url?: string } }).attributes?.url ?? ""),
  );

  let created = 0;
  for (const url of urls) {
    if (existing.has(url)) continue;
    const res = await lemonFetch("/webhooks", {
      method: "POST",
      body: JSON.stringify({
        data: {
          type: "webhooks",
          attributes: {
            url,
            events: ["order_created"],
            secret,
            test_mode: isLemonTestMode(),
          },
          relationships: {
            store: { data: { type: "stores", id: storeId } },
          },
        },
      }),
    });
    if (!res.ok) {
      console.error("lemon webhook register failed", url, res.status, res.json.errors);
    } else {
      created += 1;
    }
  }
  return { ok: true as const, created };
}

export async function createLemonCheckout(input: {
  /** Price in store minor units (agorot for ILS). */
  customPrice: number;
  email: string;
  name: string;
  redirectUrl: string;
  custom: Record<string, string>;
}) {
  const apiKey = process.env.LEMON_SQUEEZY_API_KEY!.trim();
  const storeId = process.env.LEMON_SQUEEZY_STORE_ID!.trim();
  const variantId = process.env.LEMON_SQUEEZY_VARIANT_ID!.trim();

  const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          custom_price: input.customPrice,
          product_options: {
            name: "Pulse Sparks",
            description: "Sparks for your Pulse wallet",
            redirect_url: input.redirectUrl,
            receipt_button_text: "Back to Pulse",
            receipt_link_url: input.redirectUrl,
          },
          checkout_options: {
            embed: false,
            media: false,
            logo: true,
            desc: true,
            discount: false,
          },
          checkout_data: {
            email: input.email,
            name: input.name,
            custom: input.custom,
          },
          test_mode: isLemonTestMode(),
        },
        relationships: {
          store: {
            data: { type: "stores", id: storeId },
          },
          variant: {
            data: { type: "variants", id: variantId },
          },
        },
      },
    }),
  });

  const json = (await res.json()) as LemonCheckoutResponse;
  if (!res.ok || !json.data?.attributes?.url) {
    const detail =
      json.errors?.[0]?.detail ||
      json.errors?.[0]?.title ||
      `Lemon checkout failed (${res.status})`;
    throw new Error(detail);
  }

  return {
    checkoutId: String(json.data.id),
    url: String(json.data.attributes.url),
    testMode: Boolean(json.data.attributes.test_mode),
  };
}

/** Partial refund in the order currency (agorot if ILS). Goes back to the original card. */
export async function refundLemonOrder(input: {
  lemonOrderId: string;
  amountAgorot: number;
}) {
  const apiKey = process.env.LEMON_SQUEEZY_API_KEY?.trim();
  if (!apiKey) throw new Error("Lemon API key missing");

  const res = await fetch(
    `https://api.lemonsqueezy.com/v1/orders/${input.lemonOrderId}/refund`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        data: {
          type: "orders",
          id: input.lemonOrderId,
          attributes: { amount: input.amountAgorot },
        },
      }),
    },
  );

  const json = (await res.json()) as LemonCheckoutResponse & {
    errors?: Array<{ detail?: string; title?: string }>;
  };
  if (!res.ok) {
    const detail =
      json.errors?.[0]?.detail ||
      json.errors?.[0]?.title ||
      `Lemon refund failed (${res.status})`;
    throw new Error(detail);
  }
}
