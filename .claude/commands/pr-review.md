Create a pull request for the current branch. Follow these steps:

1. Run `git diff main...HEAD` to see all changes on this branch.
2. Run `git log main..HEAD --oneline` to see all commits.
3. Analyze the full set of changes (not just the latest commit).
4. Push the branch if it hasn't been pushed yet.
5. Create the PR using `gh pr create` with the format below.

## PR Format

```
## Summary
<1-3 concise bullet points describing what changed and why>

## Test plan
- [ ] <Checklist of verification steps>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Rules
- Keep the PR title under 70 characters. Use imperative mood (e.g., "Fix", "Add", "Update").
- The Summary should focus on **why**, not just **what**.
- The Test plan should include concrete, actionable items — not generic statements.
- Do not include raw diffs or commit hashes in the PR body.
