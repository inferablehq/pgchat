import { render } from 'ink';
import { App } from './app.js';

export const runCLI = (props: { clusterId?: string; apiSecret?: string; endpoint: string }) => {
  render(<App {...props} />);
};
