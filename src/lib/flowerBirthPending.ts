import { supabase } from "@/lib/supabase";

export type FlowerBirthPendingBroadcastEnvelope = {
  actorUserId: string;
  clientId: string;
  gardenId: string;
  pageId: string;
  seedId: string | null;
  sentAt: string;
};

export function flowerBirthPendingSyncChannelName(gardenId: string | null | undefined) {
  const normalizedGardenId = String(gardenId ?? "").trim();
  if (!normalizedGardenId) return null;
  return `flower-birth-pending:${normalizedGardenId}`;
}

async function waitForChannelSubscription(channelName: string) {
  const channel = supabase.channel(channelName, {
    config: {
      broadcast: { self: false },
    },
  });

  await new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("Timed out subscribing flower_birth_pending channel."));
    }, 5000);

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timeoutId);
        resolve();
        return;
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(timeoutId);
        reject(new Error(`Could not subscribe flower_birth_pending channel (${status}).`));
      }
    });
  });

  return channel;
}

export async function broadcastFlowerBirthPending(input: {
  actorUserId: string;
  clientId: string;
  gardenId: string;
  pageId: string;
  seedId?: string | null;
}) {
  const channelName = flowerBirthPendingSyncChannelName(input.gardenId);
  if (!channelName) return;

  let channel:
    | Awaited<ReturnType<typeof waitForChannelSubscription>>
    | null = null;

  try {
    channel = await waitForChannelSubscription(channelName);
    await channel.send({
      type: "broadcast",
      event: "pending",
      payload: {
        actorUserId: input.actorUserId,
        clientId: input.clientId,
        gardenId: input.gardenId,
        pageId: input.pageId,
        seedId: input.seedId ?? null,
        sentAt: new Date().toISOString(),
      } satisfies FlowerBirthPendingBroadcastEnvelope,
    });
  } finally {
    if (channel) {
      void supabase.removeChannel(channel);
    }
  }
}
