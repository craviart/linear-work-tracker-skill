const { accessSync, constants, existsSync } = require("node:fs");
const { delimiter, join } = require("node:path");
const { spawnSync } = require("node:child_process");

const DEFAULT_CLI_PATH = "/opt/homebrew/bin/linear";
const ISSUE_ID = /^[A-Z][A-Z0-9]+-\d+$/;
const TEAM_KEY = /^[A-Z][A-Z0-9]{1,15}$/;
const MAX_TEXT_LENGTH = 20_000;

function isExecutable(path) {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function findOnPath() {
  for (const directory of (process.env.PATH || "").split(delimiter)) {
    if (!directory) continue;
    const candidate = join(directory, "linear");
    if (isExecutable(candidate)) return candidate;
  }
  return null;
}

function resolveCli() {
  const configured = process.env.LINEAR_CLI_PATH;
  const candidates = [configured, DEFAULT_CLI_PATH, findOnPath()].filter(Boolean);
  for (const candidate of candidates) {
    if (isExecutable(candidate)) return candidate;
  }
  throw codedError("CLI_NOT_FOUND", "Linear CLI was not found. Install it or set LINEAR_CLI_PATH for the local Codex plugin runtime.");
}

function codedError(code, message, details) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

function classifyFailure(output) {
  const value = String(output || "").trim();
  if (/dns error|failed to lookup|ENOTFOUND|nodename nor servname/i.test(value)) {
    return codedError("NETWORK_UNAVAILABLE", "Linear could not reach api.linear.app from the local plugin runtime. Check the host network or VPN, then rerun linear_health.", value);
  }
  if (/not authenticated|login|credential|unauthorized|authentication/i.test(value)) {
    return codedError("AUTH_REQUIRED", "Linear authentication is unavailable. Run `linear auth login` locally, then rerun linear_health.", value);
  }
  return codedError("LINEAR_API_ERROR", value || "Linear did not return a usable response.", value);
}

function runLinear(args, { timeout = 30_000 } = {}) {
  const cli = resolveCli();
  const result = spawnSync(cli, args, { encoding: "utf8", timeout, shell: false });
  if (result.error) {
    if (result.error.code === "ETIMEDOUT") {
      throw codedError("LINEAR_TIMEOUT", "Linear did not respond before the timeout. Check the host network and rerun linear_health.");
    }
    if (result.error.code === "ENOENT") {
      throw codedError("CLI_NOT_FOUND", "The configured Linear CLI could not be started. Reinstall it or set LINEAR_CLI_PATH.");
    }
    throw codedError("CLI_EXECUTION_FAILED", `Could not start Linear CLI: ${result.error.message}`);
  }
  if (result.status !== 0) throw classifyFailure(result.stderr || result.stdout);
  return { cli, output: String(result.stdout || "").trim() };
}

function requireText(value, name, { pattern, optional = false, max = MAX_TEXT_LENGTH } = {}) {
  if (value === undefined || value === null || value === "") {
    if (optional) return undefined;
    throw codedError("INVALID_ARGUMENT", `${name} is required.`);
  }
  if (typeof value !== "string" || value.length > max || value.includes("\0")) {
    throw codedError("INVALID_ARGUMENT", `${name} must be a non-empty text value up to ${max} characters.`);
  }
  if (pattern && !pattern.test(value)) throw codedError("INVALID_ARGUMENT", `${name} has an invalid format.`);
  return value;
}

function requireIssueId(value) { return requireText(value, "issueId", { pattern: ISSUE_ID, max: 32 }); }
function requireTeam(value) { return requireText(value, "team", { pattern: TEAM_KEY, max: 16 }); }

function appendOption(args, flag, value) {
  if (value !== undefined && value !== null && value !== "") args.push(flag, String(value));
}

function appendMany(args, flag, values, name) {
  if (values === undefined) return;
  if (!Array.isArray(values) || values.length === 0 || values.some((value) => typeof value !== "string" || !value || value.includes("\0"))) {
    throw codedError("INVALID_ARGUMENT", `${name} must be a non-empty list of text values.`);
  }
  for (const value of values) args.push(flag, value);
}

function health() {
  const whoami = runLinear(["auth", "whoami"]);
  return { status: "healthy", cli: whoami.cli, identity: whoami.output };
}

function issueView({ issueId }) {
  const id = requireIssueId(issueId);
  return runLinear(["issue", "view", id, "--no-pager"]);
}

function issueSearch({ search, team, allTeams = false, states, assignee, limit = 10 }) {
  const term = requireText(search, "search", { max: 500 });
  if (typeof allTeams !== "boolean") throw codedError("INVALID_ARGUMENT", "allTeams must be true or false.");
  if (!allTeams && !team) throw codedError("INVALID_ARGUMENT", "team is required unless allTeams is true.");
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw codedError("INVALID_ARGUMENT", "limit must be an integer from 1 to 100.");
  const args = ["issue", "query", "--search", term, "--limit", String(limit), "--no-pager"];
  if (allTeams) args.push("--all-teams"); else args.push("--team", requireTeam(team));
  appendMany(args, "--state", states, "states");
  appendOption(args, "--assignee", assignee === undefined ? undefined : requireText(assignee, "assignee", { max: 120 }));
  return runLinear(args);
}

function labels({ team }) { return runLinear(["label", "list", "--team", requireTeam(team), "--json"]); }
function cycles({ team }) { return runLinear(["cycle", "list", "--team", requireTeam(team)]); }

function issueCreate(input) {
  const title = requireText(input.title, "title", { max: 500 });
  const team = requireTeam(input.team);
  const assignee = requireText(input.assignee, "assignee", { max: 120 });
  const cycle = requireText(input.cycle, "cycle", { max: 120 });
  const args = ["issue", "create", "--no-interactive", "--title", title, "--team", team, "--assignee", assignee, "--cycle", cycle];
  appendOption(args, "--description", input.description === undefined ? undefined : requireText(input.description, "description", { max: MAX_TEXT_LENGTH }));
  appendOption(args, "--state", input.state === undefined ? undefined : requireText(input.state, "state", { max: 120 }));
  appendOption(args, "--parent", input.parent === undefined ? undefined : requireIssueId(input.parent));
  appendOption(args, "--project", input.project === undefined ? undefined : requireText(input.project, "project", { max: 240 }));
  appendMany(args, "--label", input.labels, "labels");
  return runLinear(args);
}

function issueUpdate(input) {
  const id = requireIssueId(input.issueId);
  const args = ["issue", "update", id];
  const fieldValues = [
    ["--title", input.title, "title", 500], ["--description", input.description, "description", MAX_TEXT_LENGTH],
    ["--state", input.state, "state", 120], ["--assignee", input.assignee, "assignee", 120],
    ["--cycle", input.cycle, "cycle", 120], ["--priority", input.priority, "priority", 1],
  ];
  let changes = 0;
  for (const [flag, value, name, max] of fieldValues) {
    if (value !== undefined) { args.push(flag, requireText(value, name, { max })); changes += 1; }
  }
  if (input.addLabels !== undefined) { appendMany(args, "--add-label", input.addLabels, "addLabels"); changes += 1; }
  if (input.removeLabels !== undefined) { appendMany(args, "--remove-label", input.removeLabels, "removeLabels"); changes += 1; }
  if (!changes) throw codedError("INVALID_ARGUMENT", "Provide at least one field to update.");
  return runLinear(args);
}

function commentCreate({ issueId, body }) {
  const id = requireIssueId(issueId);
  const comment = requireText(body, "body", { max: MAX_TEXT_LENGTH });
  return runLinear(["issue", "comment", "add", id, "--body", comment]);
}

module.exports = {
  DEFAULT_CLI_PATH, ISSUE_ID, TEAM_KEY, classifyFailure, resolveCli, runLinear,
  health, issueView, issueSearch, labels, cycles, issueCreate, issueUpdate, commentCreate,
};
