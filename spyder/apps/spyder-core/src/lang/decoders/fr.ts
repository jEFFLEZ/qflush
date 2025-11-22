export default async function decodeFr(input: Uint8Array): Promise<string> {
  // basic French normalizer - lower case and trim
  const t = new TextDecoder().decode(input);
  return t.trim().toLowerCase();
}
