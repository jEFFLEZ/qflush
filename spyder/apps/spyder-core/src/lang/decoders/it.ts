export default async function decodeIt(input: Uint8Array): Promise<string> {
  return new TextDecoder().decode(input);
}
