export default async function decodeJa(input: Uint8Array): Promise<string> {
  return new TextDecoder('utf-8').decode(input);
}
