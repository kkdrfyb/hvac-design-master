# Chrome DevTools MCP Test Report

- Date: `2026-02-23`
- Project: `d:\python\hvac-design-master-main`
- MCP server config source: `.mcp.json`
- Target server: `chrome_devtools`

## 1. Service Reachability

Command:

```powershell
Invoke-WebRequest http://127.0.0.1:3000
Invoke-WebRequest http://127.0.0.1:3001/docs
```

Result:

- Frontend (`3000`): `200`
- Backend docs (`3001/docs`): `200`

## 2. Chrome DevTools MCP Real Calls

### 2.1 Open Frontend Page

Command:

```powershell
npx -y @modelcontextprotocol/inspector --cli --config .mcp.json --server chrome_devtools --method tools/call --tool-name new_page --tool-arg url=http://127.0.0.1:3000 --tool-arg timeout=20000
```

Result:

```json
{
  "content": [
    {
      "type": "text",
      "text": "# new_page response\n## Pages\n1: about:blank\n2: http://127.0.0.1:3000/ [selected]"
    }
  ]
}
```

### 2.2 Navigate Current Page To Frontend

Command:

```powershell
npx -y @modelcontextprotocol/inspector --cli --config .mcp.json --server chrome_devtools --method tools/call --tool-name navigate_page --tool-arg type=url --tool-arg url=http://127.0.0.1:3000 --tool-arg timeout=20000
```

Result:

```json
{
  "content": [
    {
      "type": "text",
      "text": "# navigate_page response\nSuccessfully navigated to http://127.0.0.1:3000.\n## Pages\n1: http://127.0.0.1:3000/ [selected]"
    }
  ]
}
```

### 2.3 Open Backend Docs Page

Command:

```powershell
npx -y @modelcontextprotocol/inspector --cli --config .mcp.json --server chrome_devtools --method tools/call --tool-name new_page --tool-arg url=http://127.0.0.1:3001/docs --tool-arg timeout=20000
```

Result:

```json
{
  "content": [
    {
      "type": "text",
      "text": "# new_page response\n## Pages\n1: about:blank\n2: http://127.0.0.1:3001/docs [selected]"
    }
  ]
}
```

### 2.4 Network Request List Call

Command:

```powershell
npx -y @modelcontextprotocol/inspector --cli --config .mcp.json --server chrome_devtools --method tools/call --tool-name list_network_requests --tool-arg pageSize=20
```

Result:

```json
{
  "content": [
    {
      "type": "text",
      "text": "# list_network_requests response"
    }
  ]
}
```

## 3. Conclusion

1. `chrome_devtools` server in `.mcp.json` works and can be invoked successfully.
2. Chrome DevTools MCP has been used to open and navigate both frontend (`3000`) and backend docs (`3001/docs`) in this project.
3. For richer multi-step flows (e.g., click-login then inspect the exact request detail in one persistent browser session), prefer using the Inspector UI mode or a persistent MCP client session.
