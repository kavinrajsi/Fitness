@AGENTS.md

Project overview, data model, env vars, and deploy notes live in [README.md](README.md).

The read-only AI surface is the MCP server at `src/app/api/mcp/[transport]/route.js`
(`/api/mcp/mcp`), with tokens managed on `/ai`. Run the test suite with `npm test`
(vitest). See [AGENTS.md](AGENTS.md) for conventions.
