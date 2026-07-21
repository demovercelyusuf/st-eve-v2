"use client";

import dynamic from "next/dynamic";

// The dock, loaded after the page rather than with it.
//
// The dock's own code is small — the chunk holding it, the model router and the tour is about 8.6 KB
// gzipped, roughly 1% of what the workspace was shipping. The weight is what it pulls behind it:
// AgentMessage imports the markdown renderer, which imports streamdown, which imports shiki and
// katex for syntax highlighting and maths. That stack is real and worth having in a chat. It is not
// worth having on the dashboard, the account page and the integrations page, which is where it was,
// because a floating launcher nobody has clicked yet was a static import.
//
// Measured over the prerendered HTML, summing gzip -9 of every script tag: /dashboard went from
// 799 KB to 327 KB, /integrations 796 to 323, /accounts/[id] 797 to 330. /chat does not move,
// because it imports the same renderer directly and legitimately.
//
// ssr: false is deliberate. The dock is a launcher for a session that cannot exist until there is a
// browser, so server-rendering it buys nothing, and it is what lets the chunk stay out of the
// initial payload entirely. The wrapper file exists because next/dynamic with ssr: false is a build
// error when called from a Server Component, and the workspace layout is one.
export const CopilotDockLazy = dynamic(
  () => import("./copilot-dock").then((m) => m.CopilotDock),
  { ssr: false },
);
