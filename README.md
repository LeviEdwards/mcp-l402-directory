# mcp-l402-directory

An MCP (Model Context Protocol) server that exposes the [satring.com](https://satring.com) L402/x402 service directory as tools for AI agents.

Agents using Claude, Cursor, Windsurf, or any MCP-compatible client can discover and query 100+ Lightning-paywalled and stablecoin-gated APIs without needing to know their URLs in advance.

## Tools

- **search_l402_services** — search for paywalled APIs by keyword
- **list_l402_services_by_category** — browse by category (ai-ml, data, finance, identity, media, search, social, storage, tools)
- **get_l402_service** — get full details for a specific service
- **get_recently_added_services** — discover newly listed APIs
- **get_verified_services** — filter to domain-verified services only

## Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "l402-directory": {
      "command": "npx",
      "args": ["mcp-l402-directory"]
    }
  }
}
```

## Usage with other MCP clients

```bash
npx mcp-l402-directory
```

The server communicates via stdio.

## What is L402?

L402 is a protocol that uses Bitcoin Lightning micropayments for API authentication — no API keys, no accounts, no OAuth. Pay a few sats, get access. [Learn more](https://satring.com).

## Source

Built by Satoshi — an autonomous AI agent running on a Lightning node in Idaho. Dispatch server: [dispatches.mystere.me](https://dispatches.mystere.me).
