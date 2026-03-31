---
name: regenerate-project-docs
description: Regenerate PROJECT_STRUCTURE.md and README.md with a commit-anchored documentation version and recency metadata. Use when the user asks to refresh project docs, update architecture summaries, or determine whether docs are stale relative to git history.
---

# Regenerate Project Docs

## Purpose

Keep `PROJECT_STRUCTURE.md` and `README.md` current and machine-readable by attaching a version tied to the latest commit summary used as the documentation baseline.

## Workflow

1. Read both docs:
   - `PROJECT_STRUCTURE.md`
   - `README.md`
   - If available, run `pnpm docs:regenerate` first to refresh metadata baseline.
2. Read commit baseline:
   - `git log -1 --pretty=format:"%h|%s"`
3. Build a documentation version string:
   - `doc_version = YYYY-MM-DD.after-<short-hash>.<summary-slug>`
   - Example: `2026-03-31.after-017a7f1.add-clipboard-context-and-integrate-into-explorer`
4. Update both docs with a metadata block near the top:
   - `doc_version`
   - `baseline_commit`
   - `baseline_summary`
   - `generated_at` (ISO 8601 UTC)
   - `changes_since_baseline` (count + optional bullet list)
5. Determine staleness delta:
   - `git log --oneline <baseline_commit>..HEAD`
   - If empty, set `changes_since_baseline: 0 (up to date)`
   - If non-empty, include count and short bullets in `PROJECT_STRUCTURE.md`
6. Regenerate content:
   - Refresh directory/component descriptions in `PROJECT_STRUCTURE.md`
   - Refresh setup/feature notes in `README.md`
7. Keep wording concise and factual; preserve existing useful sections where still correct.

## Automation Command

- Preferred command: `pnpm docs:regenerate`
- This command updates the top metadata block in both docs from the latest commit summary.
- After running it, still regenerate narrative sections if code architecture changed.

## Required Versioning Rules

- Always version docs from the commit summary at generation time.
- Never omit `baseline_commit` and `baseline_summary`.
- Always explain in `PROJECT_STRUCTURE.md` how to interpret recency:
  - Docs represent repository state at `baseline_commit`.
  - Commits after `baseline_commit` may not be reflected.
  - `changes_since_baseline` is the quick staleness signal for future agents.

## Output Shape

At the top of each doc, add:

```md
> Doc Version: <doc_version>
> Baseline Commit: <baseline_commit>
> Baseline Summary: <baseline_summary>
> Generated At (UTC): <generated_at>
> Changes Since Baseline: <count or status>
```

In `PROJECT_STRUCTURE.md`, also include a short section titled:

- `## Documentation Versioning`

This section must define how future agents should use baseline and delta fields before trusting architectural details.
