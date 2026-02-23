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
