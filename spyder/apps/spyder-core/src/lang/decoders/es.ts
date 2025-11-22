export default async function decodeEs(input: Uint8Array): Promise<string> {
  // basic Spanish pass-through
  return new TextDecoder().decode(input);
}
