export default async function decodeRu(input: Uint8Array): Promise<string> {
  const t = new TextDecoder('utf-8').decode(input);
  return t.trim();
}
