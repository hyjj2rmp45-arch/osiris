const crypto = require('crypto');
const { writeFileSync } = require('fs');
const { join } = require('path');

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const privateKeyDer = privateKey.export({ type: 'pkcs8', format: 'der' });
const publicKeyDer = publicKey.export({ type: 'spki', format: 'der' });

const dir = join(__dirname, '..', 'packages', 'keys');
writeFileSync(join(dir, 'trade-signer.private.key'), privateKeyDer);
writeFileSync(join(dir, 'trade-signer.public.key'), publicKeyDer);
console.log('Ed25519 keypair generated and stored in packages/keys/');