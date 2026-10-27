---
name: linear-issue-action-panel
description: Render an interactive Linear issue summary and safe next-action panel when the user sends a Linear issue identifier or URL by itself.
---

# Linear Issue Action Panel

When the user sends only a Linear issue identifier or URL, call `linear_issue_action_panel` with its identifier before writing a prose response. The tool returns the current issue data and an inline action card with buttons for safe follow-up work.

Use the structured result as the source of truth. The action card is for read-only review and drafting work. It must never make a Linear write automatically. If the user selects an action that would alter Linear, ask for the specific field and value, then obtain explicit authorization before calling any write tool.

If the card cannot render in the current host, give a concise issue summary and list the same actions in plain text.
