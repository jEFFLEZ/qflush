import axios from 'axios';
import config from '../config/default.json';

interface A11Response {
  text: string;
}

export async function askA11(
  endpoint: string,
  messageText: string
): Promise<A11Response> {
  if (!(config as any).allowInternet) {
    throw new Error('Internet access disabled by configuration');
  }

  const body = {
    model: 'a11-phi3',
    messages: [{ role: 'user', content: messageText }],
    stream: false,
  };

  const axiosOpts: any = {
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000,
  };
  if ((config as any).httpProxy) {
    axiosOpts.proxy = (config as any).httpProxy;
  }

  const res = await axios.post(endpoint, body, axiosOpts);

  const text =
    res.data?.choices?.[0]?.message?.content ?? JSON.stringify(res.data);

  return { text };
}
