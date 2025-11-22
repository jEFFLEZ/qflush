export default async function decodeZh(input: Uint8Array): Promise<string> {
  // basic Chinese decoder - returns UTF-8 text
  return new TextDecoder('utf-8').decode(input);
}
