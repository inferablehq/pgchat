<div align="center">
  <img src="./assets/logo.png" alt="Inferable Logo" width="200">

  A chat agent for your Postgres database, powered by [Inferable](https://github.com/inferablehq/inferable).
</div>

## Features

- Chat with your postgres database without exposing connection strings
- Agent dynamically learns your database schema as you chat
- Supports complex queries and data-modifying operations
- Approval mode enables you to review and approve queries before they are executed
- Privacy mode allows you to return data to your terminal directly, without sending it to the model
- Works locally, or deployed in a private subnet

## Quickstart

This will connect a local postgres database to the `pgchat` agent.

```bash
npx pgchat postgresql://user:pass@localhost:5432/db
```

## Usage

```bash
npx pgchat <POSTGRES_CONNECTION_STRING> [options]

Options:
      --approval-mode  Approval mode: "always" (all queries), "mutate" (only
                      data-modifying queries), or "off"
               [string] [choices: "always", "mutate", "off"] [default: "always"]
      --privacy-mode   Enable privacy mode. All data will be returned as blobs
                      (not sent to the model)         [boolean] [default: false]
      --schema        Database schema to use        [string] [default: "public"]
      --secret        Inferable API cluster secret                      [string]
      --cluster-id    Inferable API cluster ID                          [string]
      --endpoint      Inferable API endpoint                            [string]
  -h, --help          Show help                                        [boolean]
```

### Rate Limits

`pgchat` is powered using Powered by [Inferable](https://github.com/inferablehq/inferable). API usage limits apply, these can be be increased by providing an [Inferable API secret](https://docs.inferable.ai/pages/auth) `--secret` / Cluster ID `--cluster-id`.

Inferable is also self-hostable for complete control over your data and privacy.

## FAQ

### How does it work without exposing connection strings?

All `pgchat` queries are proxied via a function that runs on your local machine. As a result, the execution environment is completely isolated.

### How does it work without connection tunneling?

`pgchat` uses Inferable's Node.js SDK to ferry commands from your local machine to the Inferable Control Plane. The SDK works with long polling the agent.

### What's Inferable?

Inferable is an open-source platform for building AI agents that interact with your internal systems that don't have public APIs (like a small service that wraps a Postgres database). For more, see [Inferable](https://github.com/inferablehq/inferable). `pgchat` uses Inferable's free tier, chat state management, durable execution engine and the Re-Act agent to bring this to life.
