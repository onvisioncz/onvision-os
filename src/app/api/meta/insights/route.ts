import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const META_API = "https://graph.facebook.com/v20.0";

async function getLongLivedToken(): Promise<string> {
  const appId     = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const userToken = process.env.META_USER_TOKEN;

  // If we have a pre-stored long-lived token, use it directly
  const longLived = process.env.META_LONG_LIVED_TOKEN;
  if (longLived) return longLived;

  if (!appId || !appSecret || !userToken) {
    throw new Error("META_APP_ID, META_APP_SECRET nebo META_USER_TOKEN není nastaveno");
  }

  // Exchange short-lived token for long-lived (60 days)
  const url = `${META_API}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${userToken}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data.access_token) {
    throw new Error(`Token exchange failed: ${JSON.stringify(data)}`);
  }

  return data.access_token;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pageId = searchParams.get("pageId") ?? process.env.ONVISION_PAGE_ID;
  const igId   = searchParams.get("igId")   ?? process.env.ONVISION_IG_ID;
  const period = searchParams.get("period") ?? "month";

  if (!pageId || !igId) {
    return NextResponse.json({ error: "pageId a igId jsou povinné" }, { status: 400 });
  }

  try {
    const userToken = await getLongLivedToken();

    // ── Instagram: time_series (reach, follower_count) ────────────────────────
    const igTimeUrl = `${META_API}/${igId}/insights?metric=reach,follower_count&period=${period}&metric_type=time_series&access_token=${userToken}`;

    // ── Instagram: total_value (interactions, engaged, profile_views) ─────────
    const igTotalUrl = `${META_API}/${igId}/insights?metric=accounts_engaged,total_interactions,profile_views&period=${period}&metric_type=total_value&access_token=${userToken}`;

    // ── Instagram profile (followers count + media) ───────────────────────────
    const igProfileUrl = `${META_API}/${igId}?fields=followers_count,media_count,username&access_token=${userToken}`;

    // ── Facebook Page insights ────────────────────────────────────────────────
    const fbUrl = `${META_API}/${pageId}/insights?metric=page_impressions,page_reach,page_post_engagements,page_fan_adds_unique&period=month&access_token=${userToken}`;

    // Fetch all in parallel
    const [igTimeRes, igTotalRes, igProfileRes, fbRes] = await Promise.allSettled([
      fetch(igTimeUrl),
      fetch(igTotalUrl),
      fetch(igProfileUrl),
      fetch(fbUrl),
    ]);

    async function safeJson(res: PromiseSettledResult<Response>) {
      if (res.status === "rejected") return null;
      try { return await res.value.json(); } catch { return null; }
    }

    const [igTime, igTotal, igProfile, fb] = await Promise.all([
      safeJson(igTimeRes),
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

    // ── Token info (how long until expiry) ────────────────────────────────────
    let tokenExpiresIn: number | null = null;
    try {
      const debugUrl = `${META_API}/debug_token?input_token=${userToken}&access_token=${userToken}`;
      const debugRes = await fetch(debugUrl);
      const debugData = await debugRes.json();
      tokenExpiresIn = debugData?.data?.expires_at ?? null;
    } catch { /* not critical */ }

    return NextResponse.json({
      instagram: {
        username:        igProfile?.username        ?? "onvisioncz",
        followers:       igProfile?.followers_count ?? 0,
        mediaCount:      igProfile?.media_count     ?? 0,
        reach:           sumTimeSeries(igTime, "reach"),
        followerGrowth:  sumTimeSeries(igTime, "follower_count"),
        interactions:    totalValue(igTotal, "total_interactions"),
        accountsEngaged: totalValue(igTotal, "accounts_engaged"),
        profileViews:    totalValue(igTotal, "profile_views"),
      },
      facebook: {
        impressions:  fbLatest(fb, "page_impressions"),
        reach:        fbLatest(fb, "page_reach"),
        engagements:  fbLatest(fb, "page_post_engagements"),
        newFollowers: fbLatest(fb, "page_fan_adds_unique"),
      },
      period,
      fetchedAt: new Date().toISOString(),
      tokenExpiresAt: tokenExpiresIn ? new Date(tokenExpiresIn * 1000).toISOString() : null,
      errors: {
        igTime:    igTime?.error    ?? null,
        igTotal:   igTotal?.error   ?? null,
        igProfile: igProfile?.error ?? null,
        fb:        fb?.error        ?? null,
      },
    });
  } catch (err) {
    console.error("[meta/insights]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Neznámá chyba" },
      { status: 500 }
    );
  }
}
