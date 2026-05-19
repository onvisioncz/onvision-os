import { getUserFromRequest, EDGE_UNAUTHORIZED } from "@/lib/supabase/edge";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const META_API = "https://graph.facebook.com/v20.0";

async function getLongLivedToken(): Promise<{ token: string; isNew: boolean; expiresAt?: string }> {
  const appId     = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const userToken = process.env.META_USER_TOKEN;

  // If we already have a long-lived token stored — use it directly, no exchange needed
  const longLived = process.env.META_LONG_LIVED_TOKEN;
  if (longLived) return { token: longLived, isNew: false };

  if (!appId || !appSecret) {
    throw new Error("META_APP_ID nebo META_APP_SECRET není nastaveno v Vercel Environment Variables");
  }
  if (!userToken) {
    throw new Error("META_USER_TOKEN není nastaveno — vygeneruj nový token na developers.facebook.com/tools/explorer a vlož do Vercel");
  }

  // Try to exchange short-lived → long-lived (60 days)
  const url = `${META_API}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${userToken}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.access_token) {
    const expiresIn = data.expires_in ?? 5183944;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    return { token: data.access_token, isNew: true, expiresAt };
  }

  // Exchange failed — token might already be long-lived or is a Page Access Token.
  // Try using it directly (Page Access Tokens never expire and work for insights).
  const errMsg = data?.error?.message ?? "";
  console.warn("[meta/insights] Token exchange failed, using token directly:", errMsg);
  return { token: userToken, isNew: false };
}

export async function GET(req: NextRequest) {
  // ── Auth check ──────────────────────────────────────────────────────────────
  const user = await getUserFromRequest(req);
  if (!user) return EDGE_UNAUTHORIZED;

  const { searchParams } = new URL(req.url);
  const pageId = searchParams.get("pageId") ?? process.env.ONVISION_PAGE_ID;
  const igId   = searchParams.get("igId")   ?? process.env.ONVISION_IG_ID;
  const period = searchParams.get("period") ?? "month";

  if (!pageId || !igId) {
    return NextResponse.json({ error: "pageId a igId jsou povinné" }, { status: 400 });
  }

  try {
    const { token: userToken, isNew, expiresAt } = await getLongLivedToken();

    // Date range: last 30 days (period=day + since/until is most compatible)
    const since = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
    const until = Math.floor(Date.now() / 1000);
    const dateRange = `since=${since}&until=${until}`;

    // ── Instagram: reach via day period + date range ──────────────────────────
    const igReachUrl = `${META_API}/${igId}/insights?metric=reach&period=day&${dateRange}&access_token=${userToken}`;

    // ── Instagram: follower growth via day period ─────────────────────────────
    const igFollowerUrl = `${META_API}/${igId}/insights?metric=follower_count&period=day&${dateRange}&access_token=${userToken}`;

    // ── Instagram: engagement total_value metrics ─────────────────────────────
    const igTotalUrl = `${META_API}/${igId}/insights?metric=accounts_engaged,total_interactions,profile_views&period=day&metric_type=total_value&${dateRange}&access_token=${userToken}`;

    // ── Instagram profile (current followers + post count) ────────────────────
    const igProfileUrl = `${META_API}/${igId}?fields=followers_count,media_count,username&access_token=${userToken}`;

    // ── Facebook Page insights (v20 compatible metrics) ───────────────────────
    const fbUrl = `${META_API}/${pageId}/insights?metric=page_impressions,page_engaged_users,page_post_engagements&period=month&access_token=${userToken}`;

    // Fetch all in parallel
    const [igReachRes, igFollowerRes, igTotalRes, igProfileRes, fbRes] = await Promise.allSettled([
      fetch(igReachUrl),
      fetch(igFollowerUrl),
      fetch(igTotalUrl),
      fetch(igProfileUrl),
      fetch(fbUrl),
    ]);

    async function safeJson(res: PromiseSettledResult<Response>) {
      if (res.status === "rejected") return null;
      try { return await res.value.json(); } catch { return null; }
    }

    const [igReach, igFollower, igTotal, igProfile, fb] = await Promise.all([
      safeJson(igReachRes),
      safeJson(igFollowerRes),
      safeJson(igTotalRes),
      safeJson(igProfileRes),
      safeJson(fbRes),
    ]);

    // ── Extract values ────────────────────────────────────────────────────────
    function sumTimeSeries(data: null | { data?: { name: string; values?: { value: number }[] }[] }, name: string): number {
      const metric = data?.data?.find((m) => m.name === name);
      return metric?.values?.reduce((s, v) => s + (v.value || 0), 0) ?? 0;
    }
    function totalValue(data: null | { data?: { name: string; total_value?: { value: number } }[] }, name: string): number {
      return data?.data?.find((m) => m.name === name)?.total_value?.value ?? 0;
    }
    function fbLatest(data: null | { data?: { name: string; values?: { value: number }[] }[] }, name: string): number {
      const metric = data?.data?.find((m) => m.name === name);
      if (!metric?.values?.length) return 0;
      return metric.values[metric.values.length - 1]?.value ?? 0;
    }

    // Sum daily values for the 30-day period
    const reach          = sumTimeSeries(igReach,    "reach");
    const followerGrowth = sumTimeSeries(igFollower, "follower_count");
    const interactions   = totalValue(igTotal, "total_interactions");
    const accountsEngaged = totalValue(igTotal, "accounts_engaged");
    const profileViews   = totalValue(igTotal, "profile_views");

    const response = {
      instagram: {
        username:     igProfile?.username        ?? "onvisioncz",
        followers:    igProfile?.followers_count ?? 0,
        mediaCount:   igProfile?.media_count     ?? 0,
        reach,
        impressions:  interactions, // total_interactions as impressions proxy
        followerGrowth,
        interactions,
        accountsEngaged,
        profileViews,
      },
      facebook: {
        impressions:  fbLatest(fb, "page_impressions"),
        reach:        fbLatest(fb, "page_reach"),
        engagements:  fbLatest(fb, "page_post_engagements"),
        newFollowers: fbLatest(fb, "page_fan_adds_unique"),
      },
      period,
      fetchedAt: new Date().toISOString(),
      // If token was freshly exchanged, include it so admin can save it as META_LONG_LIVED_TOKEN
      ...(isNew && expiresAt ? { newLongLivedToken: userToken, tokenExpiresAt: expiresAt } : {}),
      errors: {
        igReach:    igReach?.error    ?? null,
        igFollower: igFollower?.error ?? null,
        igTotal:    igTotal?.error    ?? null,
        igProfile:  igProfile?.error  ?? null,
        fb:         fb?.error         ?? null,
      },
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("[meta/insights]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Neznámá chyba" },
      { status: 500 }
    );
  }
}
