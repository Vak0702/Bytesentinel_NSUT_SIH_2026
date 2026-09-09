/** @type {import('next').NextConfig} */

// Where the Flask API lives during development.
const API_ORIGIN = process.env.API_ORIGIN || "http://localhost:5000";

// Set NEXT_OUTPUT=export (scripts/build.sh does) to emit a folder of plain
// HTML/CSS/JS that Flask can serve directly. In that mode the site and the API
// share an origin, so /api works without any proxying and the rewrite below is
// unnecessary — Next ignores rewrites during a static export.
const isExport = process.env.NEXT_OUTPUT === "export";

const nextConfig = {
  reactStrictMode: true,

  ...(isExport
    ? { output: "export", images: { unoptimized: true } }
    : {
        /**
         * Development only: proxy /api/* through to Flask.
         *
         * Without this the browser would be making a cross-origin request from
         * localhost:3000 to localhost:5000 — a CORS preflight plus a
         * third-party cookie, which is exactly the setup browsers are busy
         * restricting. A rewrite makes it look same-origin to the browser: the
         * request goes to localhost:3000/api/auth/login and Next forwards it
         * server-side, so the session cookie comes back first-party.
         */
        async rewrites() {
          return [{ source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` }];
        },
      }),
};

export default nextConfig;
