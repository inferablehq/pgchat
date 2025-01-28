#!/usr/bin/env node

import "dotenv/config";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import { InferablePGSQLAdapter } from "@inferable/pgsql-adapter";
import { Inferable } from "inferable";
import { initClient, tsRestFetchApi } from "@ts-rest/core";
import { contract } from "./client/contract.js";

const argv = await yargs(hideBin(process.argv))
  .positional("connection-string", {
    type: "string",
    description: "Postgres connection string",
    demandOption: true,
  })
  .option("schema", {
    type: "string",
    default: "public",
    description: "Postgres schema",
  })
  .option("cluster-id", {
    type: "string",
    description: "Inferable cluster ID",
  })
  .option("secret", {
    type: "string",
    description: "Inferable API secret",
  })
  .option("approval-mode", {
    type: "string",
    describe:
      'Approval mode: "always" (all queries), "mutate" (only data-modifying queries), or "off"',
    choices: ["always", "mutate", "off"],
    default: "always",
  })
  .option("privacy-mode", {
    type: "boolean",
    describe:
      "Enable privacy mode. All data will be returned as blobs (not sent to the model)",
    default: false,
  })
  .option('endpoint', {
    type: 'string',
    describe: 'Inferable API endpoint',
    default: 'https://api.inferable.ai'
  })
  .parse();

const connectionString = argv._[0] as string;

let apiSecret = argv["secret"];
let clusterId = argv["cluster-id"];
let endpoint = argv['endpoint'];

if (!connectionString) {
  throw new Error("No postgres connection string provided");
}

if (!apiSecret || !clusterId) {
  console.log(
    "No Inferable API secret or cluster ID provided. A rate-limited demo cluster will be created."
  );
  console.log("You can create a free cluster at https://www.inferable.ai");
  const client = initClient(contract, {
    baseUrl: endpoint,
    api: (args) => {
      return tsRestFetchApi(args);
    },
  });

  const response = await client.createEphemeralSetup();
  if (response.status === 200) {
    apiSecret = response.body.apiKey;
    clusterId = response.body.clusterId;
  } else {
    throw new Error("Failed to create ephemeral setup");
  }
}

const client = new Inferable({
  apiSecret,
  endpoint,
});

const adapter = new InferablePGSQLAdapter({
  connectionString,
  schema: argv.schema,
  approvalMode: argv["approval-mode"] as "always" | "mutate" | "off",
  privacyMode: argv["privacy-mode"],
});

adapter.initialize();

const service = adapter.createService(client);

await service.start();

console.clear();
await import("./cli.js").then(({ runCLI }) =>
  runCLI({
    apiSecret,
    clusterId,
    endpoint,
  })
);
