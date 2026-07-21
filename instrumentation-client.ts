import { initAnalytics } from "@/lib/analytics";

// Next's client instrumentation hook, which runs before hydration. That timing is exactly why the
// analytics SDK is not imported here directly: anything this module pulls in statically lands in the
// initial payload of every route, ahead of the page it is measuring.
//
// So this schedules rather than loads. requestIdleCallback yields until the browser has nothing
// better to do, with a timeout so a permanently busy page still reports; the setTimeout is the
// fallback for Safari, which only shipped requestIdleCallback recently.
const start = () => {
  void initAnalytics();
};

if (typeof window !== "undefined") {
  const idle = window.requestIdleCallback;
  if (typeof idle === "function") idle.call(window, start, { timeout: 3000 });
  else window.setTimeout(start, 1500);
}
