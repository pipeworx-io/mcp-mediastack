# mcp-mediastack

Mediastack MCP — wraps Mediastack API (api.mediastack.com/v1)

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `search_news` | Search news articles by keywords. Optionally filter by category (business, technology, science, health, sports, entertainment, general), country (ISO2 codes), or language. Returns headlines, descriptions, sources, and published dates. |
| `latest_news` | Get the latest news headlines. Optionally filter by category, country, or language. Returns the most recent articles with titles, descriptions, sources, and URLs. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "mediastack": {
      "url": "https://gateway.pipeworx.io/mediastack/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Mediastack data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
