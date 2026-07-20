import { disableTool } from "eve/tools";

// The copilot must ground every claim in the customer's own systems, not arbitrary web content, so
// web fetching is removed.
export default disableTool();
