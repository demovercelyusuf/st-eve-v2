import { disableTool } from "eve/tools";

// The copilot only reads the customer's systems. It never runs shell commands, so the built-in
// bash tool is removed entirely.
export default disableTool();
