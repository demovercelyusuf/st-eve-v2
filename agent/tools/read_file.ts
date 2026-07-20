import { disableTool } from "eve/tools";

// The copilot reads the warehouse and Salesforce through its own tools, never the sandbox filesystem.
export default disableTool();
