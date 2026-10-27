---
name: linear-work-tracker
description: Track substantive agent work in Linear by finding an existing related issue, asking before creating a new one, and posting concise progress comments. Use for project implementation, fixes, research, design, or delivery work, not ordinary conversation.
---

# Linear Work Tracker

Keep the user's substantive work traceable in Linear without turning routine conversation into ticket noise.

## When to use

Use this skill when beginning or continuing substantive work such as implementation, debugging, design, research, a deliverable, or a production change. Do not use it for a simple answer, a minor rewrite, a casual question, or when the user says not to track the work.

If the user sends only a Linear issue identifier or URL, treat it as a request to inspect that issue. Return a concise summary, then render three or four contextual next actions using the literal, unescaped format `- :codex-followup[Visible action]{prompt="Complete action prompt"}`. Emit each directive directly in the final response, outside code fences. Do not render ordinary Markdown bullets or end with a plain-language question instead. Offer only actions that fit the issue, such as reviewing its design context, refining scope, drafting an update, or preparing a supported field change. Keep all external writes subject to explicit user authorization.

## Find the work item first

### Linear CLI network access

In local Codex environments where the workspace sandbox cannot resolve `api.linear.app`, use the host-network execution path for Linear CLI reads. Do not stop after a sandbox DNS failure or ask the user to retry later if host-network execution is available. Retry the same read-only command outside the sandbox with a concise justification, then report a network blocker only if that attempt also fails. This changes only the network path for reads; all Linear writes still require the user's explicit authorization.

Before material work begins, establish whether a related Linear issue already exists.

1. If the user names an issue or the current branch identifies one, inspect that issue first with `linear issue view <issue-id> --no-pager`.
2. Otherwise derive a short, specific search phrase from the requested outcome, product area, and repository. Search the configured team with `linear issue query --search "<phrase>" --limit 10 --no-pager`. Use `--all-teams` only when the work genuinely spans teams or the configured-team search is inconclusive.
3. Inspect plausible matches before deciding. A title match alone is not enough. Prefer an open issue whose purpose, scope, and current state fit the request.

If one issue clearly matches, tell the user which issue will be tracked and continue. If several are plausible, ask the user to choose. Do not silently attach work to a stale, completed, cancelled, or only loosely related issue.

If no issue matches, ask whether the user wants one created. Propose a concise title, the intended team, and a one-paragraph scope. Do not create an issue until the user says yes.

## Create only with confirmation

After explicit confirmation, create the issue with a factual title and description using `linear issue create`. Use the repository's configured team when present and assign the issue to the user with `--assignee self`, unless the user requests a different assignee. Do not invent priority, projects, estimates, due dates, or workflow state. Report the created issue identifier and URL.

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

For an existing issue, do not change its assignee or labels automatically. The user may be collaborating on work owned by someone else. Ask before changing either field unless the user explicitly requested the change.

If Linear authentication, network access, or team configuration is unavailable, state the blocker and continue the requested work without fabricating issue state.

## Post meaningful progress

For a tracked issue, add one concise comment after each meaningful checkpoint, using `linear issue comment add <issue-id> --body-file <path>` for multi-line Markdown.

A meaningful checkpoint is a completed implementation or deliverable, an important decision, a verified result, a production change, or a blocker requiring the user's input. Do not comment for planning chatter, tool setup, each small edit, repeated checks, or unchanged status.

Each comment should contain only relevant facts:

- What changed or was learned.
- Evidence such as key files, validation, a result link, or the concrete blocker.
- The next step only when it is useful.

Never include credentials, private tokens, unnecessary personal data, or speculative claims. Do not add a comment if no meaningful work was completed, the user declines tracking, or the work is unrelated to the issue.

## Respect user control

Linear reads are used only to find and inspect related work. Creating issues, updating issue fields, and posting comments are external writes. Creation always requires the confirmation above. A user request to stop tracking, avoid comments, or use a different issue takes precedence immediately.
