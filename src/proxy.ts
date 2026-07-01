import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Veřejné cesty — bez cookie autentizace.
  // /api/cron se chrání vlastním CRON_SECRET; /d a /l jsou veřejné sdílené
  // stránky pro klienty (delivery odkazy, showcase lokací) — chráněné jen
  // neuhodnutelným tokenem v URL.
  const publicPaths = ["/login", "/auth/callback", "/api/cron", "/d/", "/l/"];
  const isPublic = publicPaths.some(p => pathname.startsWith(p));

  // Pokud chybí env vars, pusť dál bez auth kontroly
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const { data: { user } } = await supabase.auth.getUser();

    // Nepřihlášen → redirect na login
    if (!user && !isPublic) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Přihlášen a jde na login → redirect na dashboard
    if (user && pathname === "/login") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return supabaseResponse;
  } catch {
    // Při jakékoliv chybě pustíme request dál — lepší než crash
    if (!isPublic) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
