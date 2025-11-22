// Very small NL -> Prolog-like translator for demo purposes

export function nlToProlog(input: string): string {
  // naive: "X loves Y" -> loves(x,y).
  const s = input.trim().toLowerCase();
  const words = s.split(/\s+/);
  if (words.length === 3 && words[1] === 'loves') {
    return `${words[1]}(${words[0]},${words[2]}).`;
  }
  // fallback: turn sentence into predicate with tokens
  const pred = 'sent';
  const args = words.map(w => w.replace(/[^a-z0-9]/g, '')).join(',');
  return `${pred}(${args}).`;
}
