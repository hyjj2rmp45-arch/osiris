import { generateEd25519KeyPair } from '../packages/keys/keymanager';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function main() {
  const { privateKey, publicKey } = generateEd25519KeyPair();
  const dir = join(__dirname, '..', 'packages', 'keys');
  writeFileSync(join(dir, 'trade-signer.private.key'), privateKey);
  writeFileSync(join(dir, 'trade-signer.public.key'), publicKey);
  console.log('Ed25519 keypair generated and stored in packages/keys/');
}

main().catch(err => {
  console.error('Error generating keys:', err);
  process.exit(1);
});