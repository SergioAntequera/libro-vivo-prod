"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { gardenChatDbChannelName, type GardenChatReadStateRow, type GardenChatRoomRow } from "@/lib/gardenChat";

type UseGardenChatUnreadCountParams = {
  gardenId: string | null;
  myProfileId: string | null;
  enabled?: boolean;
};

async function loadMainRoom(gardenId: string) {
  const res = await supabase
    .from("garden_chat_rooms")
    .select("id,garden_id,slug,title,room_kind,sort_order,archived_at,created_by,created_at,updated_at")
    .eq("garden_id", gardenId)
    .eq("slug", "main")
    .is("archived_at", null)
    .maybeSingle();

  if (res.error) throw res.error;
  return (res.data as GardenChatRoomRow | null) ?? null;
}

async function loadUnreadCount(input: { roomId: string; myProfileId: string }) {
  const readRes = await supabase
    .from("garden_chat_read_states")
    .select("room_id,garden_id,user_id,last_read_message_id,last_read_at,updated_at")
    .eq("room_id", input.roomId)
    .eq("user_id", input.myProfileId)
    .maybeSingle();

  if (readRes.error) throw readRes.error;

  const lastReadAt = ((readRes.data as GardenChatReadStateRow | null) ?? null)?.last_read_at ?? null;
  let unreadQuery = supabase
    .from("garden_chat_messages")
    .select("*", { count: "exact", head: true })
    .eq("room_id", input.roomId)
    .is("deleted_at", null)
    .neq("author_user_id", input.myProfileId);

  if (lastReadAt) {
    unreadQuery = unreadQuery.gt("created_at", lastReadAt);
  }

  const unreadRes = await unreadQuery;
  if (unreadRes.error) throw unreadRes.error;

  return Number(unreadRes.count ?? 0);
}

export function useGardenChatUnreadCount({
  gardenId,
  myProfileId,
  enabled = true,
}: UseGardenChatUnreadCountParams) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const targetGardenId = String(gardenId ?? "").trim();
    const currentProfileId = String(myProfileId ?? "").trim();

    let active = true;
    let channelToRemove: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      if (!enabled || !targetGardenId || !currentProfileId) {
        if (active) {
          setUnreadCount(0);
        }
        return;
      }

      try {
        const room = await loadMainRoom(targetGardenId);
        if (!active) return;
        if (!room) {
          setUnreadCount(0);
          return;
        }
        const roomId = room.id;
        const channelName = gardenChatDbChannelName({ roomId }) ?? "";

        const refreshUnreadForRoom = async () => {
          const nextUnreadCount = await loadUnreadCount({
            roomId,
            myProfileId: currentProfileId,
          });
          if (!active) return;
          setUnreadCount(nextUnreadCount);
        };

        await refreshUnreadForRoom();
        if (!active) return;
        if (!channelName) return;

        const channel = supabase.channel(channelName);
        channelToRemove = channel;
        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "garden_chat_messages",
            filter: `room_id=eq.${roomId}`,
          },
          () => {
            void refreshUnreadForRoom();
          },
        );
        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "garden_chat_read_states",
            filter: `room_id=eq.${roomId}`,
          },
          () => {
            void refreshUnreadForRoom();
          },
        );
        channel.subscribe();
      } catch {
        setUnreadCount(0);
      }
    })();

    return () => {
      active = false;
      if (channelToRemove) {
        void supabase.removeChannel(channelToRemove);
      }
    };
  }, [enabled, gardenId, myProfileId]);

  return enabled && gardenId && myProfileId ? unreadCount : 0;
}
