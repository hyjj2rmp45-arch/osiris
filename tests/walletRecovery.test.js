const { splitSeed, verifyFragment, socialRecovery, verifyManualBackup, getAuditLog, resetRecovery } = require('../lib/walletRecovery');

// Manual test runner
(async () => {
  console.log('Running Wallet Recovery (P2.6) tests...\n');
  let allPass = true;
  const check = (name, cond) => {
    console.log(`${cond ? '✅' : '❌'} ${name}`);
    if (!cond) allPass = false;
  };

  resetRecovery();

  // 1️⃣ Seed split into 3 shards
  const shards = splitSeed('user-1', 'word1 word2 word3 word4 word5 word6', 3);
  check('Seed split into 3 shards', shards.length === 3);

  // 2️⃣ No single party can reconstruct (each shard distinct)
  check('Shards are distinct', new Set(shards).size === 3);

  // 3️⃣ Email recovery: verify fragment
  const fragOk = verifyFragment('user-1', shards[0]);
  check('Valid fragment verified', fragOk === true);
  const fragBad = verifyFragment('user-1', 'WRONG');
  check('Invalid fragment rejected', fragBad === false);

  // 4️⃣ Social recovery requires 2-of-3
  const socialOk = socialRecovery('user-1', [shards[0], shards[1]], 2);
  check('2-of-3 recovery succeeds', socialOk === true);
  const socialBad = socialRecovery('user-1', [shards[0]], 2);
  check('1-of-3 recovery fails', socialBad === false);

  // 5️⃣ Manual backup verified
  check('Manual backup verified', verifyManualBackup('user-1', true) === true);
  check('Manual backup not verified', verifyManualBackup('user-1', false) === false);

  // 6️⃣ Recovery audit log recorded
  const log = getAuditLog('user-1');
  check('Audit log has entries', log.length >= 5);
  check('Audit log records method', log.some(e => e.method === 'social-recovery'));

  // 7️⃣ Recovery does not expose plaintext seed (no seed field in log)
  check('No plaintext seed in audit log', !log.some(e => 'seed' in e && e.seed));

  console.log(`\n${allPass ? '✅ All Wallet Recovery tests passed' : '❌ Some tests failed'}`);
  process.exit(allPass ? 0 : 1);
})();