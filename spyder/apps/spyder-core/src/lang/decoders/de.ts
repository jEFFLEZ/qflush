export default async function decodeDe(input: Uint8Array): Promise<string> {
  return new TextDecoder().decode(input).toLowerCase();
}
