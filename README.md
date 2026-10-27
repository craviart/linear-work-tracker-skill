# Linear Work Tracker skill

Private Codex skill and optional local Codex plugin for finding the right Linear issue, tracking substantive work, and creating child issues from completed work notes.

## Install

Clone this repository into your personal Codex skills directory:

```sh
git clone git@github.com:craviart/linear-work-tracker-skill.git "$HOME/.agents/skills/linear-work-tracker"
```

If you already cloned it, update the skill with:

```sh
git -C "$HOME/.agents/skills/linear-work-tracker" pull --ff-only
```

Codex detects skill-file changes automatically. Restart Codex if the updated skill does not appear.

## Interactive issue actions

The `Linear Issue Action Panel` local plugin renders a compact issue card with buttons for reviewing the brief, drafting a progress comment, and preparing a field change. It uses the locally authenticated Linear CLI and never writes to Linear from a button click.

From this repository, add the local marketplace and install the plugin:

```sh
codex plugin marketplace add .
codex plugin add linear-issue-action-panel@linear-work-tracker
```

Restart Codex after installation, then open a new local chat and send a bare issue ID such as `DST-380`.

## Source of truth

Keep the canonical skill in this repository. Review changes before merging them so teammates can see what changed and recover prior versions. A teammate still needs to pull updates unless the skill folder is provided through a shared, synced location.
