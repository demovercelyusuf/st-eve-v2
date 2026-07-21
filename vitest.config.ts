import { defineConfig } from "vitest/config";

// Without a config, vitest scans the whole working tree, and `eve dev` writes a full copy of the
// source into .eve/dev-runtime/snapshots/<run>/source on every start. Two real test files across nine
// snapshots reported as eighteen files and 144 tests, all of them stale copies passing on old code.
//
// CI never saw this because .eve is gitignored, which is the worst version of the problem: local and
// CI were green for different reasons. Pinning the include to the real source makes the two runs the
// same run.

export default defineConfig({
  test: {
    include: ["{agent,lib,app,scripts}/**/*.test.ts"],
    exclude: ["**/node_modules/**", ".eve/**", ".next/**", "e2e/**"],
  },
});
