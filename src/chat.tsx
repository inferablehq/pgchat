import { Box, Text, useFocus, useInput } from "ink";
import TextInput from "ink-text-input";
import { useEffect, useState } from "react";
import { Collapsible } from "./components/Collapsible.js";

import { useInferable, useMessages, useRun } from "@inferable/react";
import Spinner from "ink-spinner";

type ChatProps = {
  apiSecret: string;
  clusterId: string;
  runId?: string;
  agentId?: string;
};

export const ChatInterface = ({
  apiSecret,
  clusterId,
  runId,
  agentId,
}: ChatProps) => {
  const [input, setInput] = useState("");
  const [error, setError] = useState<Error | null>(null);
  const [collapseResults, setCollapseResults] = useState(true);

  const inferable = useInferable({
    clusterId,
    apiSecret,
    authType: "cluster",
  });

  const {
    createMessage,
    messages: rawMessages,
    setRunId,
    jobs,
    submitApproval,
    run,
    error: runError,
  } = useRun(inferable);

  useEffect(() => {
    setError(runError);
  }, [runError]);

  const approvalRequired = jobs.filter(
    (job) => job.approvalRequested && job.approved === null
  );

  const buildMsgBody = (msg: (typeof rawMessages)[number]) => {
    switch (msg.type) {
      case "human": {
        return <Text>{msg.data.message}</Text>;
      }
      case "agent": {
        if (msg.data.invocations) {
          return (
            <Box flexDirection="column">
              <Text>{msg.data.message}</Text>

              {msg.data.invocations.map((invocation, index) => (
                <Collapsible
                  key={index}
                  title={`Calling ${invocation.toolName}()`}
                  collapsed={false}
                >
                  {jobs.find(
                    (job) => job.id === invocation.id && job.approved === true
                  ) && <Text color="green">Approved</Text>}
                  {jobs.find(
                    (job) => job.id === invocation.id && job.approved === false
                  ) && <Text color="red">Rejected</Text>}
                  {jobs.find(
                    (job) =>
                      job.id === invocation.id &&
                      job.approved === null &&
                      job.approvalRequested
                  ) && <Text color="yellow">Waiting for approval...</Text>}

                  {invocation.reasoning && (
                    <Text>Reason: {invocation.reasoning}</Text>
                  )}
                  {Object.keys(invocation.input).map((key) => (
                    <Box flexDirection="column" key={key}>
                      <Text bold>{key}:</Text>
                      <Text>
                        {JSON.stringify(invocation.input[key], null, 2)}
                      </Text>
                    </Box>
                  ))}
                </Collapsible>
              ))}
            </Box>
          );
        }
        return (
          <Text>
            {msg.data.message ?? JSON.stringify(msg.data.result, null, 2)}
          </Text>
        );
      }
      case "invocation-result": {
        const prop = Object.keys(msg.data.result)[0];
        const nestedResult = (msg.data.result[prop] as any).result;

        return (
          <Box flexDirection="column">
            <Collapsible
              key={msg.id}
              title={"Result"}
              collapsed={collapseResults}
            >
              <Text>{JSON.stringify(nestedResult, null, 2)}</Text>
            </Collapsible>
          </Box>
        );
      }
      case "template":
      case "supervisor":
      default: {
        return <div />;
      }
    }
  };

  const buildMsgHeader = (msg: (typeof rawMessages)[number]) => {
    switch (msg.type) {
      case "human": {
        return <Text color="blue">You:</Text>;
      }
      case "agent": {
        return <Text color="green">Agent:</Text>;
      }
    }
  };

  useEffect(() => {
    if (runId) {
      setRunId(runId);
    }
  }, [runId]);

  // Get utility functions for working with messages
  const messages = useMessages(rawMessages);

  const handleSubmit = async () => {
    const trimmedInput = input.trim();

    // Handle slash commands
    if (trimmedInput.startsWith('/')) {
      switch (trimmedInput.toLowerCase()) {
        case '/expand':
          setCollapseResults(false);
          break;
        case '/collapse':
          setCollapseResults(true);
          break;
        default:
          // Unknown command
          setError(new Error(`Unknown command: ${trimmedInput}`));
      }
      setInput('');
      return;
    }

    // Handle regular messages
    if (trimmedInput) {
      if (!run?.id) {
        const { id } = await inferable.createRun({
          initialPrompt: input.trim(),
          systemPrompt: "You are an assistant with access to a Postgres database. Help answer the user's questions by writing SQL queries. You can get the database schema by calling 'getPostgresContext'. Only respond to questions which can be answered with the available database.",
          interactive: true,
          agentId,
        });
        setRunId(id);
      } else {
        await createMessage(input.trim());
      }
    }

    setInput("");
  };

  // Only allow chat input focus when no approvals are pending
  const { isFocused: inputFocused } = useFocus({
    id: "chat-input",
    autoFocus: approvalRequired.length === 0,
    isActive: approvalRequired.length === 0
  });

  const [selectedButton, setSelectedButton] = useState<"approve" | "deny">(
    "approve"
  );

  useInput((input, key) => {
    if (approvalRequired.length > 0) {
      if (key.leftArrow || key.rightArrow) {
        setSelectedButton((prev) => (prev === "approve" ? "deny" : "approve"));
      } else if (key.return) {
        const currentJob = approvalRequired[0];
        submitApproval(currentJob.id, selectedButton === "approve");
      }
    }
  }, { isActive: true });

  return (
    <Box flexDirection="column" width="90%">
      <Box flexDirection="column" marginBottom={1}>
        {messages?.all("asc")?.map((msg, index) => (
          <Box key={msg.id} flexDirection="column" paddingBottom={1}>
            <Box flexDirection="row">{buildMsgHeader(msg)}</Box>
            {buildMsgBody(msg)}
          </Box>
        ))}
      </Box>

      {approvalRequired.length > 0 ? (
        <Box flexDirection="column">
          <Text color="yellow">
            Approval required for: {approvalRequired[0].targetFn}
          </Text>
          <Box flexDirection="row" gap={2}>
            <Text
              color={selectedButton === "approve" ? "green" : "gray"}
              backgroundColor={
                selectedButton === "approve" ? "black" : undefined
              }
            >
              {selectedButton === "approve" ? ">" : " "} Approve
            </Text>
            <Text
              color={selectedButton === "deny" ? "red" : "gray"}
              backgroundColor={selectedButton === "deny" ? "black" : undefined}
            >
              {selectedButton === "deny" ? ">" : " "} Deny
            </Text>
          </Box>
          <Text dimColor>Use arrow keys to select and Enter to confirm</Text>
        </Box>
      ) : run?.status === "paused" || run?.status === "running" ? (
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" Loading"}
        </Text>
      ) : (
        <Box flexDirection="row" alignItems="center">
          <Text
            dimColor={!inputFocused}
            color={inputFocused ? "yellow" : "gray"}
          >
            Input:{" "}
          </Text>
          <TextInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            showCursor
            focus={inputFocused}
          />
        </Box>
      )}

      {error && (
        <Box marginTop={1}>
          <Text color="red">Error: {error.message}</Text>
        </Box>
      )}

      <Box marginTop={1}>
      <Text dimColor>
            Ctrl+C to exit |{" "}
            {inputFocused ? "Enter to send message | /expand to show results | /collapse to hide results" : "Enter to submit approval"}{" "}
          </Text>
      </Box>
    </Box>
  );
};
