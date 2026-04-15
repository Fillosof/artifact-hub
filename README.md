This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env.local
```

Required variables (see `.env.example` for descriptions and where to obtain each):

| Variable | Purpose |
|---|---|
| `TURSO_DATABASE_URL` | Turso edge SQLite connection URL |
| `TURSO_AUTH_TOKEN` | Turso auth token |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob read/write token |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI enrichment |
| `ENRICH_SECRET` | Random secret protecting the internal `/api/enrich` route |
| `NEXT_PUBLIC_APP_URL` | Full public URL of the app (e.g. `http://localhost:3000`) |

### 3. Push the database schema

```bash
npx drizzle-kit push
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## MCP Server Setup

Artifact Hub ships with a Model Context Protocol (MCP) server that lets Claude Desktop publish, search, and retrieve artifacts directly from a conversation.

### Available Tools

| Tool | Description |
|---|---|
| `publish_artifact` | Publish AI-generated content to your team's catalog |
| `search_artifacts` | Search across one or all of your teams' artifacts |
| `get_artifact` | Retrieve full artifact metadata and comments |

### Claude Desktop Configuration

Add the following block to your Claude Desktop config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "artifact-hub": {
      "command": "node",
      "args": ["/absolute/path/to/repo-root/mcp-server/dist/index.js"],
      "env": {
        "ARTIFACT_HUB_API_URL": "https://your-deployment.vercel.app",
        "ARTIFACT_HUB_API_KEY": "your-api-key-from-settings-page"
      }
    }
  }
}
```

Replace `/absolute/path/to/repo-root` with the absolute file system path to this repository, and substitute your actual deployment URL and API key.

### One-Time Setup Steps

1. Clone the repo and run `npm install` from the root
2. Run `npm run build:mcp` to compile the MCP server
3. Log into Artifact Hub and generate an API key from the Settings page
4. Locate or create the Claude Desktop config file at the path above
5. Add the `mcpServers.artifact-hub` block, substituting the absolute path to `mcp-server/dist/index.js` and your API key
6. Restart Claude Desktop — the `artifact-hub` server appears in the tools list

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/optimizing) for more details.
