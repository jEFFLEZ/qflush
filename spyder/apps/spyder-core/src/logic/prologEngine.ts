// Minimal Prolog-like in-memory engine for simple facts and queries

export class PrologEngine {
  facts: string[] = [];

  assert(fact: string) {
    // store fact as raw string
    this.facts.push(fact.trim());
  }

  query(q: string): boolean {
    // naive: check if exact fact exists
    const norm = q.trim();
    return this.facts.includes(norm);
  }
}
