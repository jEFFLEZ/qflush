#!/usr/bin/env node
import { nlToProlog } from './parser/semantic.js';
import { PrologEngine } from './logic/prologEngine.js';

const engine = new PrologEngine();

const input = process.argv.slice(2).join(' ');
if (!input) {
  console.log('Usage: spyder-cli "some sentence"');
  process.exit(1);
}

const fact = nlToProlog(input);
console.log('Prolog fact:', fact);
engine.assert(fact);
console.log('Query back exists?', engine.query(fact));
