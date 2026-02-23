import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface NotificationPayload {
  type: "INSERT";
  table: string;
  record: {
    id: string;
    user_id: string;
    type: string;
    actor_username?: string;
    lyric_snippet?: string;
    collection_name?: string;
    artist_name?: string;
  };
}

function buildMessage(record: NotificationPayload["record"]): {
  title: string;
  body: string;
} {
  const actor = record.actor_username ? `@${record.actor_username}` : "Someone";

  switch (record.type) {
    case "reaction":
      return {
        title: "New Resonation",
        body: record.lyric_snippet
          ? `${actor} resonated with "${record.lyric_snippet}"`
          : `${actor} resonated with your lyric`,
      };
    case "comment":
      return {
        title: "New Comment",
        body: record.lyric_snippet
          ? `${actor} commented on "${record.lyric_snippet}"`
          : `${actor} commented on your lyric`,
      };
    case "reply":
      return {
        title: "New Reply",
        body: `${actor} replied to your comment`,
      };
    case "follow":
      return {
        title: "New Follower",
        body: `${actor} followed you`,
      };
    case "share":
      return {
        title: "Lyric Shared",
        body: `${actor} shared your lyric`,
      };
    case "new_lyric":
      return {
        title: "New Lyric",
        body: record.artist_name
          ? `New lyric from ${record.artist_name}`
          : "New lyric from someone you follow",
      };
    case "collection_add":
      return {
        title: "Collection Updated",
        body: record.collection_name
          ? `${actor} added to ${record.collection_name}`
          : `${actor} added to a collection`,
      };
    default:
      return {
        title: "Earwyrm",
        body: "You have new activity",
      };
  }
}

serve(async (req) => {
  try {
    const payload: NotificationPayload = await req.json();

    if (payload.type !== "INSERT" || payload.table !== "notifications") {
      return new Response(JSON.stringify({ skipped: true }), { status: 200 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apnsKeyId = Deno.env.get("APNS_KEY_ID");
    const apnsTeamId = Deno.env.get("APNS_TEAM_ID");
    const apnsKeyBase64 = Deno.env.get("APNS_KEY_BASE64");
    const apnsTopic = Deno.env.get("APNS_TOPIC"); // bundle ID

    if (!apnsKeyId || !apnsTeamId || !apnsKeyBase64 || !apnsTopic) {
      console.log("APNs not configured, skipping push");
      return new Response(JSON.stringify({ skipped: true, reason: "apns_not_configured" }), {
        status: 200,
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch device tokens for the target user
    const { data: tokens, error } = await supabase
      .from("device_tokens")
      .select("token")
      .eq("user_id", payload.record.user_id)
      .eq("platform", "ios");

    if (error || !tokens?.length) {
      return new Response(
        JSON.stringify({ sent: 0, reason: error?.message || "no_tokens" }),
        { status: 200 }
      );
    }

    const { title, body } = buildMessage(payload.record);

    // Build JWT for APNs authentication
    const header = btoa(JSON.stringify({ alg: "ES256", kid: apnsKeyId }));
    const claims = btoa(
      JSON.stringify({
        iss: apnsTeamId,
        iat: Math.floor(Date.now() / 1000),
      })
    );

    // Import the p8 key
    const keyData = Uint8Array.from(atob(apnsKeyBase64), (c) => c.charCodeAt(0));
    const key = await crypto.subtle.importKey(
      "pkcs8",
      keyData,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"]
    );

    const signatureInput = new TextEncoder().encode(`${header}.${claims}`);
    const signature = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      signatureInput
    );
    const jwt = `${header}.${claims}.${btoa(
      String.fromCharCode(...new Uint8Array(signature))
    )}`;

    // Send to each device token
    let sent = 0;
    for (const { token } of tokens) {
      try {
        const apnsUrl = `https://api.push.apple.com/3/device/${token}`;
        const res = await fetch(apnsUrl, {
          method: "POST",
          headers: {
            authorization: `bearer ${jwt}`,
            "apns-topic": apnsTopic,
            "apns-push-type": "alert",
            "apns-priority": "10",
          },
          body: JSON.stringify({
            aps: {
              alert: { title, body },
              sound: "default",
              badge: 1,
            },
            notificationId: payload.record.id,
            type: payload.record.type,
          }),
        });

        if (res.ok) {
          sent++;
        } else {
          const errorBody = await res.text();
          console.error(`APNs error for token ${token}: ${res.status} ${errorBody}`);

          // Remove invalid tokens
          if (res.status === 410 || res.status === 400) {
            await supabase
              .from("device_tokens")
              .delete()
              .eq("token", token);
          }
        }
      } catch (e) {
        console.error(`Failed to send to ${token}:`, e);
      }
    }

    return new Response(JSON.stringify({ sent }), { status: 200 });
  } catch (e) {
    console.error("Push notification error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
    });
  }
});
