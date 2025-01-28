import { ChatInterface } from './chat.js';

type AppProps = {
  clusterId?: string;
  apiSecret?: string;
  agentId?: string;
  runId?: string;
};

export const App = ({
  clusterId: initialClusterId,
  apiSecret: initialApiSecret,
}: AppProps = {}) => {
  const apiSecret = initialApiSecret!
  const clusterId = initialClusterId!

  return <ChatInterface
    apiSecret={apiSecret}
    clusterId={clusterId}
  />
};
