import { ChatInterface } from './chat.js';

type AppProps = {
  clusterId?: string;
  apiSecret?: string;
  agentId?: string;
  runId?: string;
  endpoint?: string;
};

export const App = ({
  clusterId: initialClusterId,
  apiSecret: initialApiSecret,
  endpoint
}: AppProps = {}) => {
  const apiSecret = initialApiSecret!
  const clusterId = initialClusterId!

  return <ChatInterface
    apiSecret={apiSecret}
    clusterId={clusterId}
    endpoint={endpoint}
  />
};
