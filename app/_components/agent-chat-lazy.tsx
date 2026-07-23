"use client";

import dynamic from "next/dynamic";

// The full-page chat, loaded in the browser rather than prerendered.
//
// The conversation only exists once there is a browser to hold it: the session cursor and the event
// log live in localStorage, and neither is knowable while the shell is being generated. Rendering the
// transcript server-side and then correcting it on the client is the version that fails, and it fails
// quietly. Deferring the read to an effect instead left the restored conversation invisible until the
// reader happened to interact with the page, which is worse than not restoring at all: the empty state
// says there is no conversation, and then one appears.
//
// So this page takes the same shape the dock already had. ssr: false means the component is only ever
// built where its inputs exist, which removes the mismatch rather than papering over it.
//
// The cost, stated plainly: /chat no longer prerenders its composer and openers, so it gives up the
// static shell that the read routes keep. That is the right trade only here, because /chat is the one
// route whose entire content is client-owned. The wrapper file exists because next/dynamic with
// ssr: false is a build error when called from a Server Component, and the page is one.
export const AgentChatLazy = dynamic(() => import("./agent-chat").then((m) => m.AgentChat), {
  ssr: false,
  // Holds the exact height of the real thing so the composer does not jump when it lands.
  loading: () => <div aria-hidden className="h-[calc(100dvh-3.5rem)]" />,
});
