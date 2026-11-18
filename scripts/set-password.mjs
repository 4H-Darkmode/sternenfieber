// Usage: npm run set-password -- "<password>"   (empty → disables the gate)
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
const pw = (process.argv[2] ?? '').trim();
const hash = pw ? createHash('sha256').update(pw).digest('hex') : '';
writeFileSync(
  new URL('../src/access/config.ts', import.meta.url),
  `/**\n * SHA-256 hash of the class password. Empty string = gate disabled.\n * Change it with:  npm run set-password -- "<neues Passwort>"\n */\nexport const ACCESS_HASH = '${hash}';\n`,
);
console.log(hash ? 'Passwort gesetzt.' : 'Passwort-Abfrage deaktiviert.');
