#!/usr/bin/env node
/**
 * L402 Service Discovery MCP Server
 * Exposes the satring.com L402/x402 service directory as MCP tools.
 * Agents can discover, search, and query paywalled API services.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const SATRING_BASE = "https://satring.com/api/v1";

async function satringFetch(path) {
  const res = await fetch(`${SATRING_BASE}${path}`, {
    headers: { "User-Agent": "mcp-l402-directory/1.0" },
  });
  if (!res.ok) throw new Error(`satring API error: ${res.status}`);
  return res.json();
}

const server = new Server(
  { name: "l402-directory", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "search_l402_services",
      description:
        "Search the L402/x402 service directory for paywalled APIs. Returns services matching a query string — use this to find Lightning-gated or stablecoin-gated APIs for data, AI/ML, finance, identity, search, and more.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query, e.g. 'bitcoin price', 'sentiment analysis', 'image generation'",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "list_l402_services_by_category",
      description:
        "List all available L402/x402 paywalled API services in a category. Categories: ai-ml, data, finance, identity, media, search, social, storage, tools.",
      inputSchema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["ai-ml", "data", "finance", "identity", "media", "search", "social", "storage", "tools"],
            description: "Service category slug",
          },
          protocol: {
            type: "string",
            enum: ["L402", "x402", "L402+x402"],
            description: "Filter by payment protocol (optional)",
          },
          limit: {
            type: "number",
            description: "Max results to return (default 10, max 50)",
          },
        },
        required: ["category"],
      },
    },
    {
      name: "get_l402_service",
      description:
        "Get full details for a specific L402/x402 service by its slug identifier, including endpoint URL, pricing, protocol, payment address, and verification status.",
      inputSchema: {
        type: "object",
        properties: {
          slug: {
            type: "string",
            description: "Service slug (e.g. 'satoshi-dispatches', 'satring-service-health-analytics')",
          },
        },
        required: ["slug"],
      },
    },
    {
      name: "get_recently_added_services",
      description:
        "Get the most recently added L402/x402 services in the directory — useful for discovering new paywalled APIs as they launch.",
      inputSchema: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Max results (default 10)",
          },
          protocol: {
            type: "string",
            enum: ["L402", "x402", "L402+x402"],
            description: "Filter by protocol (optional)",
          },
        },
      },
    },
    {
      name: "get_verified_services",
      description:
        "Get only domain-verified L402/x402 services — these have proven ownership of their domain and are more trustworthy for agent payments.",
      inputSchema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Optional category filter",
          },
          limit: {
            type: "number",
            description: "Max results (default 20)",
          },
        },
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "search_l402_services") {
      const data = await satringFetch(
        `/search?q=${encodeURIComponent(args.query)}&limit=${args.limit || 10}`
      );
      const services = data.services || [];
      if (services.length === 0) {
        return { content: [{ type: "text", text: `No services found for "${args.query}".` }] };
      }
      const formatted = services.map((s) => formatService(s)).join("\n\n---\n\n");
      return {
        content: [
          {
            type: "text",
            text: `Found ${services.length} services for "${args.query}":\n\n${formatted}`,
          },
        ],
      };
    }

    if (name === "list_l402_services_by_category") {
      let url = `/services?category=${args.category}&limit=${args.limit || 10}`;
      if (args.protocol) url += `&protocol=${encodeURIComponent(args.protocol)}`;
      const data = await satringFetch(url);
      const services = data.services || [];
      if (services.length === 0) {
        return { content: [{ type: "text", text: `No services in category "${args.category}".` }] };
      }
      const formatted = services.map((s) => formatService(s)).join("\n\n---\n\n");
      return {
        content: [
          {
            type: "text",
            text: `${services.length} services in category "${args.category}":\n\n${formatted}`,
          },
        ],
      };
    }

    if (name === "get_l402_service") {
      const data = await satringFetch(`/services/${args.slug}`);
      return {
        content: [{ type: "text", text: formatService(data, true) }],
      };
    }

    if (name === "get_recently_added_services") {
      let url = `/services?sort=newest&limit=${args.limit || 10}`;
      if (args.protocol) url += `&protocol=${encodeURIComponent(args.protocol)}`;
      const data = await satringFetch(url);
      const services = data.services || [];
      const formatted = services.map((s) => formatService(s)).join("\n\n---\n\n");
      return {
        content: [
          {
            type: "text",
            text: `${services.length} recently added services:\n\n${formatted}`,
          },
        ],
      };
    }

    if (name === "get_verified_services") {
      let url = `/services?domain_verified=true&limit=${args.limit || 20}`;
      if (args.category) url += `&category=${args.category}`;
      const data = await satringFetch(url);
      const services = data.services || [];
      const formatted = services.map((s) => formatService(s)).join("\n\n---\n\n");
      return {
        content: [
          {
            type: "text",
            text: `${services.length} domain-verified services:\n\n${formatted}`,
          },
        ],
      };
    }

    return { content: [{ type: "text", text: `Unknown tool: ${name}` }] };
  } catch (err) {
    return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
  }
});

function formatService(s, detailed = false) {
  const price =
    s.pricing_sats > 0
      ? `${s.pricing_sats} sats`
      : s.pricing_usd
      ? `$${s.pricing_usd}`
      : "price unlisted";
  const verified = s.domain_verified ? "✅ verified" : "⚠️ unverified";
  const protocol = s.protocol || "unknown";
  const categories = (s.categories || []).map((c) => `#${c.slug}`).join(" ");

  let out = `**${s.name}**
URL: ${s.url}
Protocol: ${protocol} | Price: ${price}/${s.pricing_model || "request"} | ${verified}
${s.description || "No description."}
${categories}`;

  if (detailed && s.x402_pay_to) {
    out += `\nPayment address: ${s.x402_pay_to}`;
    out += `\nNetwork: ${s.x402_network || "Lightning"}`;
  }
  if (detailed) {
    out += `\nSlug: ${s.slug}`;
    out += `\nAdded: ${s.created_at?.slice(0, 10) || "unknown"}`;
  }
  return out;
}

const transport = new StdioServerTransport();
await server.connect(transport);
