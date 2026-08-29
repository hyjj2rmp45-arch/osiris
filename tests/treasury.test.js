const { FEE_BPS, calculateTierFee, distributeFee, getTreasuryBalance, requestWithdrawal, signWithdrawal, executeWithdrawal, resetTreasury, TIMELOCK_MS } = require('../lib/treasury');

// Manual test runner
(async () => {
  console.log('Running Revenue Model / Treasury (P2.7) tests...\n');
  let allPass = true;
  const check = (name, cond) => {
    console.log(`${cond ? '✅' : '❌'} ${name}`);
    if (!cond) allPass = false;
  };

  resetTreasury();

  // 1️⃣ Fee percentages enforced per tier
  const amount = 1_000_000; // lamports
  check('Free fee = 0', calculateTierFee('free', amount) === 0);
  check('Basic fee = 1%', calculateTierFee('basic', amount) === 10_000);
  check('Pro fee = 0.75%', calculateTierFee('pro', amount) === 7_500);
  check('Whale fee = 0.5%', calculateTierFee('whale', amount) === 5_000);

  // 2️⃣ Treasury receives correct percentage of fees
  const fee = calculateTierFee('basic', amount); // 10_000
  const dist = distributeFee(fee, 3000); // 30% referrer
  const expectedTreasury = Math.floor((fee - Math.floor(fee * 0.30)) * 0.40);
  check('Treasury receives 40% of non-referrer share', dist.treasury >= expectedTreasury);
  check('Treasury balance updated', getTreasuryBalance() >= expectedTreasury);

  // 3️⃣ Referral commission bounds (20-35%)
  let threw = false;
  try { distributeFee(fee, 1000); } catch (e) { threw = true; } // 10% invalid
  check('Referrer <20% rejected', threw === true);

  // 4️⃣ Treasury withdrawal requires 2-of-3
  const wd = requestWithdrawal(1000, 'owner-1');
  check('Withdrawal requested', wd.id.startsWith('WD-'));
  check('Not approved with 1 signature', wd.approved === false);

  // 5️⃣ 2-of-3 signature but timelock not elapsed → not approved
  const wd2 = signWithdrawal(wd.id, 'owner-2');
  check('2 signatures present', wd2.signatures.length === 2);
  check('Timelock blocks execution', wd2.approved === false);

  // 6️⃣ Execute blocked without approval
  threw = false;
  try { executeWithdrawal(wd.id); } catch (e) { threw = true; }
  check('Execute blocked before approval', threw === true);

  // 7️⃣ After timelock elapses, approved and executed
  // Simulate timelock by directly manipulating requestedAt (test helper via mock)
  const wdRef = require('../lib/treasury');
  const internal = wdRef.__pendingWithdrawals || [];
  // For this test, patch Date.now to simulate elapsed time
  const originalNow = Date.now;
  Date.now = () => originalNow() + TIMELOCK_MS + 1000;
  const wd3 = signWithdrawal(wd.id, 'owner-3');
  check('Approved after timelock', wd3.approved === true);
  const exec = executeWithdrawal(wd.id);
  check('Withdrawal executed', exec.executed === true);
  Date.now = originalNow;

  console.log(`\n${allPass ? '✅ All Revenue/Treasury tests passed' : '❌ Some tests failed'}`);
  process.exit(allPass ? 0 : 1);
})();