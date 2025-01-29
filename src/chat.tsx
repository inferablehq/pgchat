import { Box, Text, useFocus, useInput } from "ink";
import TextInput from "ink-text-input";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Collapsible } from "./components/Collapsible.js";
import { useInferable, useMessages, useRun } from "@inferable/react";
import Spinner from "ink-spinner";

type ChatProps = {
  apiSecret: string;
  clusterId: string;
  runId?: string;
  agentId?: string;
  endpoint?: string;
};

type TimelineItem =
| { type: "message"; data: ReturnType<typeof useRun>["messages"][number]; createdAt: Date }
| { type: "blob"; data: ReturnType<typeof useRun>["blobs"][number]; createdAt: Date };


const shouldAutoCollapse = (content: any): boolean => {
  return JSON.stringify(content, null, 2).length > 500;
};

const buildMsgHeader = (msg: ReturnType<typeof useRun>["messages"][number]) => {
  switch (msg.type) {
    case "human": {
      return <Text color="blue">You:</Text>;
    }
    case "agent": {
      return <Text color="green">Agent:</Text>;
    }
  }
};

export const ChatInterface = ({
  apiSecret,
  clusterId,
  runId,
  agentId,
  endpoint
}: ChatProps) => {
  const [input, setInput] = useState("");
  const [error, setError] = useState<Error | null>(null);
  const [selectedCollapsibleIndex, setSelectedCollapsibleIndex] = useState<number | null>(null);
  const [collapsibles, setCollapsibles] = useState<Array<{ id: string; content: any }>>([]);
  const [modalContent, setModalContent] = useState<string | null>(null);

  const inferable = useInferable({
    clusterId,
    apiSecret,
    authType: "cluster",
    baseUrl: endpoint,
  });

  const {
    createMessage,
    messages: rawMessages,
    setRunId,
    jobs,
    submitApproval,
    getBlobData,
    blobs,
    run,
    error: runError,
  } = useRun(inferable);

  useEffect(() => {
    setError(runError);
  }, [runError]);

  const approvalRequired = useMemo(() => jobs.filter(job => job.approvalRequested && job.approved === null), [jobs]);

  useEffect(() => {
    if (approvalRequired.length > 0) {
      setModalContent(null);
      setSelectedCollapsibleIndex(null);
    }
  }, [approvalRequired]);

  const buildMsgBody = useCallback(
    (msg: (typeof rawMessages)[number]) => {
    switch (msg.type) {
      case "human": {
        return <Text>{msg.data.message}</Text>;
      }
      case "agent": {
        if (msg.data.invocations) {
          return (
            <Box flexDirection="column">
              <Text>{msg.data.message}</Text>

              {msg.data.invocations.map((invocation, index) => {
                const collapsibleId = `invocation-${msg.id}-${index}`;
                return (
                  <Collapsible
                    key={index}
                    title={`Calling ${invocation.toolName}()`}
                    collapsed={shouldAutoCollapse(invocation)}
                    isSelected={
                      selectedCollapsibleIndex ===
                      collapsibles.findIndex(c => c.id === collapsibleId)
                    }
                    onSelect={() => {
                      setModalContent(JSON.stringify(invocation, null, 2));
                    }}
                  >
                    {jobs.find(job => job.id === invocation.id && job.approved === true) && (
                      <Text color="green">Approved</Text>
                    )}
                    {jobs.find(job => job.id === invocation.id && job.approved === false) && (
                      <Text color="red">Rejected</Text>
                    )}
                    {jobs.find(
                      job =>
                        job.id === invocation.id && job.approved === null && job.approvalRequested
                    ) && <Text color="yellow">Waiting for approval...</Text>}

                    {invocation.reasoning && <Text>Reason: {invocation.reasoning}</Text>}
                    {Object.keys(invocation.input).map(key => (
                      <Box flexDirection="column" key={key}>
                        <Text bold>{key}:</Text>
                        <Text>{JSON.stringify(invocation.input[key], null, 2)}</Text>
                      </Box>
                    ))}
                  </Collapsible>
                );
              })}
            </Box>
          );
        }
        return <Text>{msg.data.message ?? JSON.stringify(msg.data.result, null, 2)}</Text>;
      }
      case "invocation-result": {
        const prop = Object.keys(msg.data.result)[0];
        const nestedResult = (msg.data.result[prop] as any).result;
        const collapsibleId = `result-${msg.id}`;

        return (
          <Box flexDirection="column">
            <Collapsible
              key={msg.id}
              title={`Result${shouldAutoCollapse(nestedResult) ? " (> 500 characters)" : ""}`}
              collapsed={shouldAutoCollapse(nestedResult)}
              isSelected={
                selectedCollapsibleIndex === collapsibles.findIndex(c => c.id === collapsibleId)
              }
              onSelect={() => {
                setModalContent(JSON.stringify(nestedResult, null, 2));
              }}
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
  }, [selectedCollapsibleIndex, collapsibles, jobs, rawMessages]);

  useEffect(() => {
    if (runId) {
      setRunId(runId);
    }
  }, [runId]);

  // Combine and sort messages and blobs
  const sortedItems = useMemo(() => {
    const items: TimelineItem[] = [
      ...rawMessages.map(msg => ({
        type: "message" as const,
        data: msg,
        createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date(),
      })),
      ...blobs.map(blob => ({
        type: "blob" as const,
        data: blob,
        createdAt: blob.createdAt ? new Date(blob.createdAt) : new Date(),
      })),
    ];
    return items.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }, [rawMessages, blobs]);

  const handleSubmit = useCallback(
    async () => {
      const trimmedInput = input.trim();
      if (trimmedInput) {
        if (!run?.id) {
          const { id } = await inferable.createRun({
            initialPrompt: input.trim(),
            systemPrompt:
            "You are an assistant with access to a Postgres database. Help answer the user's questions by writing SQL queries. You can get the database schema by calling 'getPostgresContext'. Only respond to questions which can be answered with the available database. User might ask you to UPDATE, INSERT or DELETE data. You must failthufully do what the user asks, and call the appropriate tools to do so.",
            interactive: true,
            agentId,
          });
          setRunId(id);
        } else {
          await createMessage(input.trim());
        }
      }

      setInput("");
    }, [agentId, createMessage, input, run?.id, setRunId, inferable])

  // Only allow chat input focus when no approvals are pending
  const { isFocused: inputFocused } = useFocus({
    id: "chat-input",
    autoFocus: approvalRequired.length === 0,
    isActive: approvalRequired.length === 0,
  });

  const [selectedButton, setSelectedButton] = useState<"approve" | "deny">("approve");

  useInput(
    (_, key) => {
      if (modalContent && key.return) {
        console.clear();
        setModalContent(null);
        setSelectedCollapsibleIndex(null);
        return;
      }

      if (approvalRequired.length > 0) {
        if (key.leftArrow || key.rightArrow) {
          setSelectedButton(prev => (prev === "approve" ? "deny" : "approve"));
        } else if (key.return) {
          const currentJob = approvalRequired[0];
          submitApproval(currentJob.id, selectedButton === "approve");
        }
        return;
      }

      if (approvalRequired.length === 0) {
        if (key.upArrow && selectedCollapsibleIndex !== null) {
          setSelectedCollapsibleIndex(Math.max(0, selectedCollapsibleIndex - 1));
        } else if (key.downArrow && selectedCollapsibleIndex !== null) {
          setSelectedCollapsibleIndex(
            Math.min(collapsibles.length - 1, selectedCollapsibleIndex + 1)
          );
        } else if (key.tab) {
          setSelectedCollapsibleIndex(
            selectedCollapsibleIndex === null ? collapsibles.length - 1 : null
          );
        }
        return;
      }
    },
    { isActive: true }
  );

  // Update collapsibles when messages change
  useEffect(() => {
    const newCollapsibles: Array<{ id: string; content: any }> = [];
    rawMessages.forEach(msg => {
      if (msg.type === "agent" && msg.data.invocations) {
        msg.data.invocations.forEach((invocation, index) => {
          newCollapsibles.push({
            id: `invocation-${msg.id}-${index}`,
            content: invocation,
          });
        });
      } else if (msg.type === "invocation-result") {
        const prop = Object.keys(msg.data.result)[0];
        const nestedResult = (msg.data.result[prop] as any).result;
        newCollapsibles.push({
          id: `result-${msg.id}`,
          content: nestedResult,
        });
      }
    });
    newCollapsibles.push(...blobs.map(b => ({ id: b.id, content: b })));
    setCollapsibles(newCollapsibles);
  }, [rawMessages]);

  if (modalContent) {
    return (
      <Box flexDirection="column" width="90%" height="90%">
        <Box flexGrow={1} flexDirection="column">
          <Text>{modalContent}</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Press Enter to exit modal view</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width="90%">
      <Box flexDirection="column" marginBottom={1}>
        {sortedItems.map(item => (
          <Box key={item.data.id} flexDirection="column" paddingBottom={1}>
            {item.type === "message" && (
              <>
                <Box flexDirection="row">{buildMsgHeader(item.data)}</Box>
                {buildMsgBody(item.data)}
              </>
            )}
            {item.type === "blob" && (
              <Collapsible
                key={item.data.id}
                title={`Blob: ${item.data.name}`}
                collapsed={true}
                isSelected={
                  selectedCollapsibleIndex === collapsibles.findIndex(c => c.id === item.data.id)
                }
                onSelect={async () => {
                  if (item.data.type !== "application/json") {
                    setError(new Error("Only application/json blobs are supported"));
                    return;
                  }
                  const result = await getBlobData(item.data.id);
                  const decoded = Buffer.from(result as any, "base64").toString("utf-8");
                  setModalContent(JSON.stringify(JSON.parse(decoded), null, 2));
                }}
              >
                <></>
              </Collapsible>
            )}
          </Box>
        ))}
      </Box>

      {approvalRequired.length > 0 ? (
        <Box flexDirection="column">
          <Text color="yellow">Approval required for: {approvalRequired[0].targetFn}</Text>
          <Box flexDirection="row" gap={2}>
            <Text
              color={selectedButton === "approve" ? "green" : "gray"}
              backgroundColor={selectedButton === "approve" ? "black" : undefined}
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
          <Text dimColor={!inputFocused} color={inputFocused ? "yellow" : "gray"}>
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
          {selectedCollapsibleIndex !== null
            ? "Tab to exit selection mode | ↑↓ to navigate | "
            : ""}
          {inputFocused
            ? "Enter to send message | Tab to enter selection mode |"
            : "Enter to submit approval"}{" "}
        </Text>
      </Box>
    </Box>
  );
};
