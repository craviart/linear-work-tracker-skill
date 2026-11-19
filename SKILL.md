---
name: linear-work-tracker
description: Use for substantive work tracked in Linear, direct Linear issue requests or references, and meeting follow-ups such as turning Outlook meetings, meeting notes, or action items into draft issues. Recognize natural-language requests to pull follow-ups from a meeting or calendar. Do not use for ordinary questions or casual conversation.
---

# Linear Work Tracker

Keep the user's substantive work and effort traceable in Linear. Prefer scoped issues and sub-issues over progress comments when work can be tracked as a distinct outcome.

## Local Linear access

For local Codex agents, use the `linear-operations` MCP tools first. They run through the host-side local plugin runtime, where the authenticated Linear CLI and DNS are available. Start a new session with `linear_health` when access matters, then use typed tools such as `linear_issue_view`, `linear_issue_search`, `linear_team_labels`, and `linear_team_cycles`.

Do not treat an unavailable sandbox `linear` command or a sandbox DNS failure as proof that Linear is unavailable. Direct CLI commands are a diagnostic fallback only. If `linear_health` reports `AUTH_REQUIRED`, ask Camille to run `linear auth login` locally, then rerun the health check. If it reports `NETWORK_UNAVAILABLE`, report the host-network or VPN blocker precisely.

The write tools, `linear_issue_create`, `linear_issue_update`, and `linear_issue_comment_create`, are typed operations. Call one only after Camille explicitly authorizes that specific Linear change. Never use a generic command runner.

## Bare skill invocation

When Camille invokes `$linear-work-tracker` without specifying a task, show this concise menu and wait for her choice:

**What would you like to do?**

1. Check recent meetings and notes for follow-ups
2. Find or review a Linear issue
3. Check whether a piece of work is already tracked
4. Draft Linear issues from notes or action items
5. Review an issue’s comments for work to split into sub-issues

Invite her to reply with a number or describe what she needs. This menu is guidance only: do not begin a workflow until she chooses. Keep the existing approval requirements for all Linear writes. If the invocation includes a specific request, skip the menu and handle that request directly.

## When to use

Use this skill before material work begins when the task is a substantive project activity: implementation, debugging, design, research, a deliverable, or a production change. Also use it for direct Linear requests, including finding, creating, updating, or splitting issues. This includes non-code work such as prototypes, presentations, and product documentation. Do not use it for a simple answer, a minor rewrite, a casual question, or when the user says not to track the work.

Follow the user's external-write rules for the current conversation. Inspecting issues is read-only. Creating or changing issues, fields, labels, status, assignments, or comments requires explicit user authorization for that action. A request to track work means find and identify the relevant issue; it does not by itself authorize posting comments or changing fields. Draft comments only when Camille requests a comment or the criteria below make one useful.

### Continue after a Linear tracking check

Use this workflow when Camille asks whether a topic or piece of work is already tracked in Linear, including after she chooses that action from the bare-skill menu. Do not end with only a match/no-match result.

Classify what the search found as one of the following, based on purpose, scope, and current state:

- **Clearly covered:** an active issue already tracks the same action. Identify it and do not propose a duplicate.
- **Related but distinct:** an issue is relevant but does not cover the requested action. Name the difference and consider it as a parent only if it is open and directly related.
- **No match:** no relevant issue was found in the searched scope.
- **Ambiguous or stale:** multiple issues could fit, or a possible match is completed, cancelled, stale, or otherwise unsuitable as a parent. Explain the ambiguity.

After reporting the result, offer a short, tailored next-step menu. Depending on the result, offer relevant choices to search recent Codex chats, search meetings and notes, search both, draft an issue from evidence already available, inspect a relevant issue further, or stop. Include a draft option only when there is enough evidence for a concrete proposal; do not offer a duplicate when the same action is already covered. Frame context searches as a way to find decisions or distinct follow-up work that could support a standalone issue or a child issue. Wait for Camille to choose before searching additional sources.

When Camille selects context checks:

- **Codex chats:** use `mcp__codex_app__list_threads` with a limit of 50 recent summaries. Compare titles and summaries with the topic, then read likely matches using `mcp__codex_app__read_thread`. If the requested limit is rejected, retry with a smaller supported limit rather than abandoning the search. The available tools do not provide full-text search or pagination across all chat history.
- If the recent summaries contain no relevant match, search `/Users/camilleraviart/.codex/memories_v2/rollout_summaries` for the topic and obvious synonyms. Also run this fallback when Camille says substantial earlier Codex work exists, even if recent summaries contain partial matches. Read matching rollout summaries to identify their `thread_id`, then read the actual Codex thread with `mcp__codex_app__read_thread` before relying on its contents. Treat summaries as retrieval pointers, not proof; reconcile historical work with current Linear state and do not propose completed work again.
- If neither the recent summaries nor rollout summaries identify relevant work, state that these bounded searches found no evidence. Do not imply that all Codex history was searched. If Camille identifies a specific older chat, inspect it by its supplied link or ID when possible.
- **Meetings and notes:** search relevant completed Outlook meetings and Granola notes from the last 30 days in Europe/London time by default. Use a meeting or date range Camille specifies instead. If the request explicitly asks for recent or last-week meeting follow-ups, keep the rolling seven-day window defined in the meeting workflow below. Use both connected sources when available, read matched event details and notes before attributing decisions or actions, and disclose unavailable notes or transcript access. Treat calendar agendas as intent, not evidence of decisions.
- Search only the source or sources Camille selected. If a source is unavailable, state the limitation and continue with the selected sources that are available.

After selected-source checks, reconcile each supported action with Linear. Draft clear, actionable, non-duplicate issues as standalone work when no suitable open parent exists, or as child issues under a directly relevant open issue when the work is distinct. Do not attach work to a stale or weakly related parent. If no clear action is supported, say so and offer a useful next choice, such as resolving the parent ambiguity or stopping. Present proposed titles, descriptions, source evidence, and parent-child grouping for review. Do not create or change any Linear issue until Camille explicitly approves the specific proposed set.

For a tracking-only request, do not interrupt the initial Linear search with these source choices; offer them after presenting the search result. For a separate implementation or deliverable request, continue that requested work after identifying its existing issue, and offer optional context checks only when they could materially clarify a distinct follow-up or decision.

### Create draft issues from meetings

Use this workflow when Camille asks in natural language to find meeting follow-ups, pull action items from the calendar, create or draft issues from meetings, or asks what follow-ups came from recent meetings. Also use it when she explicitly invokes `$linear-work-tracker` for meeting follow-up work. Examples include:

- “Create issue drafts from last week’s meetings.”
- “Pull action items from my calendar and turn them into Linear tasks.”
- “What follow-ups came out of the product review?”
- “Split these meeting notes into issues.”

This is on demand only. Never scan the calendar in the background or on a schedule. Choose the source and date window from the request:

1. If Camille names a meeting, find it by its title, participants, or date and verify the returned event details.
2. If she gives a date or range, use that exact window. If she asks generally about recent or last week’s meetings, scan completed Outlook meetings in the rolling seven days before the current time, using Europe/London time.
3. Granola is an optional additional source for meeting follow-ups. When Granola MCP tools are available, search its notes for the requested meeting or date window. For a general recent or last-week request, scan the same rolling seven-day window in Europe/London time. If Granola MCP is unavailable or unauthenticated, continue with Outlook or supplied notes; do not require installation or treat its absence as a blocker.
4. If she supplies meeting notes or action items in the prompt, use those directly without requiring a calendar lookup.
5. Read the event title, time, attendees, and available description or notes. Do not invent missing decisions or treat an agenda as evidence that a decision was made. If event details are insufficient, state what is missing and draft only what is supported.

Extract only clear, actionable work, then check each action against Linear before proposing any issue. Compare purpose, scope, and current state, not just titles. For each action:

- If no relevant existing issue covers the topic, propose a standalone issue, or group it with related actions under a parent when they contribute to one outcome.
- If a suitable existing issue covers the topic but not this distinct action, propose the action as a child issue under that existing issue. Use only a relevant open parent; do not attach work to a completed, cancelled, stale, or loosely related issue.
- If an existing issue already tracks the same action, do not propose a duplicate. Identify the existing issue and omit a new issue for that action.
- If several existing issues could be the right parent, or the only match is no longer active, surface the ambiguity instead of silently creating or attaching work.

Include the source meeting title and date, or identify the supplied notes, in each draft description. Keep uncertain ownership, scope, or other missing details explicit rather than guessing.

Present the proposed titles, descriptions, and parent-child grouping for review. Do not create any issue until Camille approves the specific proposed set. After approval, follow the existing issue-creation rules below, including verifying the team’s active cycle and assignee and using only supported labels. Do not add a progress comment unless Camille separately asks for one.

If the user sends only a Linear issue identifier or URL, treat it as a request to inspect that issue and guide them through possible next steps:

1. Resolve the identifier from the URL if needed. If `linear_issue_action_panel` is available, call it with the issue identifier. It renders an inline action card with real controls and provides the current issue data. Do not render `:codex-followup` directives because this desktop renderer displays them as static text.
2. If the action-panel tool is unavailable, read the issue and return a concise summary of its title, status, team, assignee, cycle, and relevant description followed by a plain-text menu of actions. Examples include reviewing or refining the issue, changing a requested field, or splitting supported work into child issues. Offer a comment option only when Camille asks for one or the issue has a clear coordination need. Omit actions that do not fit the issue's current state or content.
3. Keep inspection, summaries, and planning read-only. Do not infer authorization to update the issue, change its assignee or cycle, add labels, post a comment, or create child issues from the bare reference. Obtain explicit authorization before each external write.

If the reference is incomplete, ambiguous, or inaccessible, say what could not be resolved and ask for the missing detail. This guided flow is conversational and does not switch the whole chat into Plan mode unless the user asks for that.

## Find the work item first

## DST-only issue research

When checking Linear for existing work, search and inspect issues in the DST team only. Do not use all-teams searches or inspect issues from other teams for duplicate checks, even when the supplied work appears to belong to another team. If no DST match exists, report that result and continue with the requested DST tracking workflow; do not infer that no related work exists elsewhere.

### Linear CLI network access

In local Codex environments where the workspace sandbox cannot resolve `api.linear.app`, use the host-network execution path for Linear CLI reads. Do not stop after a sandbox DNS failure or ask the user to retry later if host-network execution is available. Retry the same read-only command outside the sandbox with a concise justification, then report a network blocker only if that attempt also fails. This changes only the network path for reads; all Linear writes still require the user's explicit authorization.

Before material work begins, establish whether a related Linear issue already exists.

1. If the user names an issue or the current branch identifies one, inspect that issue first with `linear issue view <issue-id> --no-pager`.
2. Otherwise derive a short, specific search phrase from the requested outcome, product area, and repository. Search the configured team with `linear issue query --search "<phrase>" --limit 10 --no-pager`. Use `--all-teams` only when the work genuinely spans teams or the configured-team search is inconclusive.
3. Inspect plausible matches before deciding. A title match alone is not enough. Prefer an open issue whose purpose, scope, and current state fit the request.

If one issue clearly matches, tell the user which issue will be tracked and continue with the requested work. If several are plausible, ask the user to choose. Do not silently attach work to a stale, completed, cancelled, or only loosely related issue.

When the request is specifically to check whether work is already tracked, follow **Continue after a Linear tracking check** after inspecting plausible matches. Do not stop at the search result or ask only whether to create an issue. If the user requests new work and no issue matches, propose a concise title, intended team, and one-paragraph scope, then get explicit approval before creating it.

## Create only with confirmation

After explicit confirmation, create the issue with a factual title and description using `linear issue create`. Use the repository's configured team when present. Before creation, identify and verify that team's current active cycle, then place the new issue in it. Always assign a newly created issue: use the current user (`--assignee self`) by default, or the person the user names. If the current cycle cannot be identified, or the chosen assignee cannot be resolved, explain the blocker and ask how to proceed rather than creating an issue without a cycle or assignee. Do not invent priority, projects, estimates, due dates, or workflow state. Report the created issue identifier, assignee, cycle, and URL.

## Split existing work into child issues

When the user asks to create sub-issues from an existing issue's comments or progress notes, use the parent issue as the source of truth:

1. Read the parent issue and its comments. Group the notes into distinct, independently understandable work packages. Combine closely related updates when they are stages of the same outcome; do not make one child per comment by default.
2. Search for existing child or related issues before creating anything, and avoid duplicates.
3. Create only work supported by the comments. Summarize the scope and evidence in each child description, and link each child to the parent with `--parent`.
4. Set a child to Done only when the comments indicate that work was completed, published, deployed, or verified. Otherwise use a suitable open state only when the evidence supports it; do not infer dates, estimates, priority, project, or other fields.
5. Follow the normal issue-creation confirmation, assignee, label, and external-write rules above. Do not add a progress comment unless the user explicitly asks for one.

## Classify new Design Team issues

When creating a Design Team issue, inspect the current team labels with `linear label list --team DST --json` before applying labels. Use only labels that exist at that time. The labels shown as group headings, such as `Work type` and `Complexity`, are categories, not values to attach.

Try to assign at most one well-supported value from each group:

- **Work type:** `Design`, `Design System`, `Internal`, `R&D`, or `UX Research`.
- **Complexity:** `XS`, `S`, `M`, or `L`, using the label descriptions and the scope of the requested work.
- **OKR:** a named objective only when the work clearly supports it. Otherwise use `No OKR`.
- **Scope:** `App`, `Machine`, `Print`, `Website`, or `Global`, when the primary surface is clear.
- **Team served:** choose the named recipient team when clear, such as `Product Team`, `Tech Team`, `Commercial Team`, `Product and Tech teams`, or `Product and Commercial`.

Do not guess a label merely to fill a group. Leave a group unlabeled when the request does not provide reliable evidence. Preserve the user's explicit label choices over this inference.

For an existing issue, do not change its assignee, cycle, or labels automatically. The user may be collaborating on work owned by someone else. Ask before changing any of these fields unless the user explicitly requested the change. The default-to-current-user and current-cycle rules apply to newly created issues only.

If Linear authentication, network access, or team configuration is unavailable, state the blocker and continue the requested work without fabricating issue state.

## Track work as issues before comments

When substantive work begins or reaches a meaningful checkpoint, inspect the relevant parent and existing children. Prefer a child issue when the effort has a distinct deliverable or investigation, can have its own scope and completion state, or should count separately in workload reporting. This includes completed work discovered in a parent's comments when its scope and outcome are supported by evidence. Group related steps into one useful child instead of creating a child for every edit, meeting, or comment. Search for an existing child before proposing a new one.

If an existing issue or child already covers the exact work, use it and do not create a duplicate. Use a standalone issue when the work is substantial but no directly relevant open parent exists. Keep a parent for the broader outcome; propose children for distinct pieces of effort within it. For each proposed child, give Camille a concrete title, scope, evidence or result, proposed parent, and completion state when supported. Follow the creation, assignee, cycle, label, and authorization rules above. Do not infer permission to create a child from permission to work on its parent.

Use a comment only when the information belongs on an existing issue and does not merit a separately trackable work item, such as a brief coordination note, a decision affecting the issue, a blocker needing attention, or a status update Camille specifically requests. Do not routinely draft a comment after a checkpoint or ask whether Camille wants one. If a child issue captures the work, put the substantive scope and result there; avoid repeating it as a parent comment. Post comments only when explicitly requested or authorized for that specific change.

Keep any requested comment concise and factual: what changed or was learned, relevant evidence, and a next step only when useful. Never include credentials, private tokens, unnecessary personal data, or speculative claims. Do not draft or post a comment for planning chatter, tool setup, each small edit, repeated checks, unchanged status, declined tracking, or work unrelated to the issue.

## Respect user control

Linear reads are used only to find and inspect related work. Creating issues, updating issue fields, and posting comments are external writes. Creation always requires the confirmation above. A user request to stop tracking, avoid comments, or use a different issue takes precedence immediately.
