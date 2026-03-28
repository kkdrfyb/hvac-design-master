# Agent Rules For This Repo

## Round Logging (Required)

1. Record every completed dialogue round into a markdown file in project root.
2. Default target file is `round-qa-YYYY-MM-DD.md` for today's date.
3. If the user requests a specific round file, use that file.
4. Append only; do not rewrite earlier rounds.
5. Use the `round-qa-recorder` skill workflow and its append script when available.

## MCP For Logs

1. Use `.mcp.json` server `round_log_fs` for file operations when MCP is available.
2. Fallback to direct file edit if MCP server is unavailable.

## Git Commit & Remote Push (Required)
1. After every successful round log append, automatically create a Git commit for the log file change.
2. Use standardized commit message format:
    docs: log round [round number] - [brief description]
3. Only commit the modified log file(s); do not commit unrelated files.
4. Push the commit to the default remote repository immediately after committing.
5. If push fails (network/auth error), retry once; do not overwrite local changes.
6. Do not amend, rebase, or modify previous Git history — preserve all log commits.
7. Use Git workflow/tooling provided by the agent system; fallback to native Git commands if unavailable.
