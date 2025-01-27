# PGChat

AI Agent for interacting with Postgres databases. Powered by [Inferable](https://github.com/inferablehq/inferable).

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
