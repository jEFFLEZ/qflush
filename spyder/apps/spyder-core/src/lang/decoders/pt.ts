export default async function decodePt(input: Uint8Array): Promise<string> {
  return new TextDecoder().decode(input);
}
