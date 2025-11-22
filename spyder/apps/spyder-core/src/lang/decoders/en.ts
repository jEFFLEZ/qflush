export default async function decodeEn(input: Uint8Array): Promise<string> {
  // simple pass-through decoder for english
  return new TextDecoder().decode(input);
}
