#!/usr/bin/env node
const readline = require("node:readline");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const linear = require("./linear");

const TEMPLATE_URI = "ui://linear-operations/issue-actions.html";
const widgetHtml = readFileSync(join(__dirname, "..", "web", "issue-actions.html"), "utf8");

function respond(id, result) { process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`); }
function failure(id, error) {
  respond(id, { content: [{ type: "text", text: `${error.code || "LINEAR_ERROR"}: ${error.message}` }], isError: true,
    structuredContent: { status: "error", code: error.code || "LINEAR_ERROR", message: error.message, details: error.details } });
}
function textResult(data) { return { structuredContent: data, content: [{ type: "text", text: data.output || data.identity || data.status }] }; }
function writeDescription(action) { return `This performs a Linear ${action}. Call it only after Camille explicitly authorizes this specific change.`; }

const tools = [
  { name: "linear_health", description: "Check that the local host-side Linear CLI, authentication, and network are healthy. Read-only.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, handler: () => linear.health() },
  { name: "linear_issue_view", description: "Retrieve one Linear issue through the local host-side bridge. Read-only.", inputSchema: { type: "object", properties: { issueId: { type: "string" } }, required: ["issueId"], additionalProperties: false }, handler: linear.issueView },
  { name: "linear_issue_search", description: "Search Linear issues through the local host-side bridge. Read-only. Scope to a team unless allTeams is explicitly true.", inputSchema: { type: "object", properties: { search: { type: "string" }, team: { type: "string" }, allTeams: { type: "boolean" }, states: { type: "array", items: { type: "string" } }, assignee: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 100 } }, required: ["search"], additionalProperties: false }, handler: linear.issueSearch },
  { name: "linear_team_labels", description: "List current labels for a Linear team. Read-only.", inputSchema: { type: "object", properties: { team: { type: "string" } }, required: ["team"], additionalProperties: false }, handler: linear.labels },
  { name: "linear_team_cycles", description: "List cycles for a Linear team. Read-only.", inputSchema: { type: "object", properties: { team: { type: "string" } }, required: ["team"], additionalProperties: false }, handler: linear.cycles },
  { name: "linear_whoami", description: "Show the authenticated Linear identity. Read-only.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, handler: () => ({ output: linear.health().identity }) },
  { name: "linear_issue_create", description: writeDescription("issue creation"), inputSchema: { type: "object", properties: { title: { type: "string" }, team: { type: "string" }, assignee: { type: "string" }, cycle: { type: "string" }, description: { type: "string" }, state: { type: "string" }, parent: { type: "string" }, project: { type: "string" }, labels: { type: "array", items: { type: "string" } } }, required: ["title", "team", "assignee", "cycle"], additionalProperties: false }, handler: linear.issueCreate },
  { name: "linear_issue_update", description: writeDescription("issue update"), inputSchema: { type: "object", properties: { issueId: { type: "string" }, title: { type: "string" }, description: { type: "string" }, state: { type: "string" }, assignee: { type: "string" }, cycle: { type: "string" }, priority: { type: "string" }, addLabels: { type: "array", items: { type: "string" } }, removeLabels: { type: "array", items: { type: "string" } } }, required: ["issueId"], additionalProperties: false }, handler: linear.issueUpdate },
  { name: "linear_issue_comment_create", description: writeDescription("progress-comment creation"), inputSchema: { type: "object", properties: { issueId: { type: "string" }, body: { type: "string" } }, required: ["issueId", "body"], additionalProperties: false }, handler: linear.commentCreate },
];

const legacyPanel = { name: "linear_issue_action_panel", title: "Show Linear issue action panel", description: "Fetch a Linear issue through the reliable local bridge and render its summary with next actions.", inputSchema: { type: "object", properties: { issueId: { type: "string" } }, required: ["issueId"], additionalProperties: false } };

function parseIssue(issueId, raw) {
  const metadata = raw.match(/\*\*State:\*\*\s*([^|\n]+)\|\s*\*\*Priority:\*\*\s*([^|\n]+)\|\s*\*\*Assignee:\*\*\s*([^|\n]+)\|\s*\*\*Cycle:\*\*\s*([^\n]+)/);
  return { issueId, title: raw.match(new RegExp(`^#\\s*${issueId}:\\s*(.+)$`, "m"))?.[1] || issueId, status: metadata?.[1]?.trim() || "Not available", assignee: metadata?.[3]?.trim() || "Unassigned", cycle: metadata?.[4]?.trim() || "Not set", priority: metadata?.[2]?.replace(/[▄▁▂▃▅▆▇█]/g, "").trim() || "Not set", scope: raw.match(/## Need\s*\n+([\s\S]*?)(?=\n##|\n\*\*|$)/)?.[1]?.trim() || "No scope was returned.", figmaUrl: raw.match(/https:\/\/www\.figma\.com\/[^\s\])]+/)?.[0], raw };
}

function handle(message) {
  const { id, method, params = {} } = message;
  if (method === "initialize") return respond(id, { protocolVersion: params.protocolVersion || "2025-03-26", capabilities: { tools: {}, resources: {} }, serverInfo: { name: "linear-operations", version: "1.0.0" } });
  if (method === "notifications/initialized") return;
  if (method === "tools/list") return respond(id, { tools: [...tools.map(({ handler, ...tool }) => tool), legacyPanel] });
  if (method === "resources/list") return respond(id, { resources: [{ uri: TEMPLATE_URI, name: "Linear issue action panel", mimeType: "text/html;profile=mcp-app" }] });
  if (method === "resources/read") { if (params.uri === TEMPLATE_URI) return respond(id, { contents: [{ uri: TEMPLATE_URI, mimeType: "text/html;profile=mcp-app", text: widgetHtml, _meta: { ui: { prefersBorder: true } } }] }); return failure(id, new Error("Unknown resource URI.")); }
  if (method !== "tools/call") return failure(id, new Error("Unsupported MCP method."));
  try {
    if (params.name === legacyPanel.name) {
      const panel = parseIssue(params.arguments?.issueId, linear.issueView(params.arguments || {}).output);
      return respond(id, { structuredContent: panel, content: [{ type: "text", text: `${panel.issueId}: ${panel.title}` }], _meta: { ui: { resourceUri: TEMPLATE_URI }, "openai/outputTemplate": TEMPLATE_URI } });
    }
    const tool = tools.find((item) => item.name === params.name);
    if (!tool) throw new Error("Unknown Linear tool.");
    return respond(id, textResult(tool.handler(params.arguments || {})));
  } catch (error) { return failure(id, error); }
}

const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
input.on("line", (line) => { try { handle(JSON.parse(line)); } catch (error) { process.stderr.write(`Invalid MCP message: ${error.message}\n`); } });

module.exports = { handle, parseIssue };
