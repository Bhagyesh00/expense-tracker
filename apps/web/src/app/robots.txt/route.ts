import { NextResponse } from "next/server";

/**
 * Serves /robots.txt dynamically so we can read APP_URL at runtime.
 * Disallows auth and API routes from crawlers; allows everything else.
 */
export const dynamic = "force-static";

export function GET(): NextResponse {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://expenseflow.vercel.app";

  const body = [
    "User-agent: *",
    "Allow: /",
    "",
    "# Auth pages — no value in indexing login/register flows",
    "Disallow: /login",
    "Disallow: /register",
    "Disallow: /forgot-password",
    "Disallow: /verify-otp",
    "",
    "# Internal API routes",
    "Disallow: /api/",
    "",
    "# Next.js internals",
    "Disallow: /_next/",
    "",
    `Sitemap: ${appUrl}/sitemap.xml`,
    "",
  ].join("\n");

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
