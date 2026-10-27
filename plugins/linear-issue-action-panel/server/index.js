#!/usr/bin/env node

const readline = require("node:readline");
const { spawnSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const TEMPLATE_URI = "ui://linear-issue-action-panel/issue-actions.html";
const root = join(__dirname, "..");
const widgetHtml = readFileSync(join(root, "web", "issue-actions.html"), "utf8");

function respond(id, result) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);
}

function fail(id, code, message) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } })}\n`);
}

function asText(value) {
  return String(value ?? "").replace(/\r/g, "").trim();
}

function runLinear(issueId) {
  const command = spawnSync("linear", ["issue", "view", issueId, "--no-pager"], {
    encoding: "utf8",
    timeout: 20_000,
  });

  if (command.error) {
    throw new Error(`Could not start the Linear CLI: ${command.error.message}`);
  }
  if (command.status !== 0) {
    throw new Error(asText(command.stderr) || asText(command.stdout) || "Linear could not retrieve this issue.");
  }

  return asText(command.stdout);
}

function parseIssue(issueId, raw) {
  const title = raw.match(new RegExp(`^#\\s*${issueId}:\\s*(.+)$`, "m"))?.[1] || issueId;
  const metadata = raw.match(/\*\*State:\*\*\s*([^|\n]+)\|\s*\*\*Priority:\*\*\s*([^|\n]+)\|\s*\*\*Assignee:\*\*\s*([^|\n]+)\|\s*\*\*Cycle:\*\*\s*([^\n]+)/);
  const need = raw.match(/## Need\s*\n+([\s\S]*?)(?=\n##|\n\*\*|$)/)?.[1]?.trim();
  const figmaUrl = raw.match(/https:\/\/www\.figma\.com\/[^\s\])]+/)?.[0];
  const priority = metadata?.[2]?.replace(/[▄▁▂▃▅▆▇█]/g, "").trim();

  return {
    issueId,
    title,
    status: metadata?.[1]?.trim() || "Not available",
    assignee: metadata?.[3]?.trim() || "Unassigned",
    cycle: metadata?.[4]?.trim() || "Not set",
    priority: priority || "Not set",
    scope: need || "No scope was returned.",
    figmaUrl,
    raw,
  };
}

function issuePanel(issueId) {
  if (!/^[A-Z][A-Z0-9]+-\d+$/.test(issueId)) {
    throw new Error("Enter a valid Linear issue ID such as DST-380.");
  }
  return parseIssue(issueId, runLinear(issueId));
}

function toolResult(panel) {
  return {
    structuredContent: panel,
    content: [{ type: "text", text: `${panel.issueId}: ${panel.title}` }],
    _meta: {
      ui: { resourceUri: TEMPLATE_URI },
      "openai/outputTemplate": TEMPLATE_URI,
    },
  };
}

const toolDefinition = {
  name: "linear_issue_action_panel",
  title: "Show Linear issue action panel",
  description: "Fetch a Linear issue and render its summary with interactive next actions. Use when the user provides a Linear issue ID or URL by itself.",
  inputSchema: {
    type: "object",
    properties: {
      issueId: {
        type: "string",
        description: "The Linear issue ID, for example DST-380.",
      },
    },
    required: ["issueId"],
    additionalProperties: false,
  },
  _meta: {
    ui: { resourceUri: TEMPLATE_URI },
    "openai/toolInvocation/invoking": "Loading Linear issue…",
    "openai/toolInvocation/invoked": "Linear issue loaded.",
  },
};

function handle(message) {
  const { id, method, params = {} } = message;

  if (method === "initialize") {
    respond(id, {
      protocolVersion: params.protocolVersion || "2025-03-26",
      capabilities: { tools: {}, resources: {} },
      serverInfo: { name: "linear-issue-action-panel", version: "0.1.0" },
    });
    return;
  }
  if (method === "notifications/initialized") return;
  if (method === "tools/list") {
    respond(id, { tools: [toolDefinition] });
    return;
  }
  if (method === "resources/list") {
    respond(id, {
      resources: [{ uri: TEMPLATE_URI, name: "Linear issue action panel", mimeType: "text/html;profile=mcp-app" }],
    });
    return;
  }
  if (method === "resources/read") {
    if (params.uri !== TEMPLATE_URI) return fail(id, -32602, "Unknown resource URI.");
    respond(id, {
      contents: [{
        uri: TEMPLATE_URI,
        mimeType: "text/html;profile=mcp-app",
        text: widgetHtml,
        _meta: { ui: { prefersBorder: true } },
      }],
    });
    return;
  }
  if (method === "tools/call") {
    if (params.name !== toolDefinition.name) return fail(id, -32601, "Unknown tool.");
    try {
      respond(id, toolResult(issuePanel(asText(params.arguments?.issueId).toUpperCase())));
    } catch (error) {
      respond(id, {
        content: [{ type: "text", text: `Unable to load the issue: ${error.message}` }],
        isError: true,
      });
    }
    return;
  }
  fail(id, -32601, `Unsupported method: ${method}`);
}

const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
input.on("line", (line) => {
  try {
    handle(JSON.parse(line));
  } catch (error) {
    process.stderr.write(`Invalid MCP message: ${error.message}\n`);
  }
});
