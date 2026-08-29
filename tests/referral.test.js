const { generateReferralCode, getReferralCode, registerReferral, calculateCommission, getAccruedCommission, resetReferrals } = require('../lib/referral');

// Manual test runner
(async () => {
  console.log('Running Referral System (P2.4) tests...\n');
  let allPass = true;
  const check = (name, cond) => {
    console.log(`${cond ? '✅' : '❌'} ${name}`);
    if (!cond) allPass = false;
  };

  resetReferrals();

  // 1️⃣ Referral code unique per user
  const codeA = generateReferralCode('user-A');
  const codeB = generateReferralCode('user-B');
  check('Referral codes differ', codeA !== codeB);
  check('Code format starts with REF-', codeA.startsWith('REF-'));

  // 2️⃣ Same user gets same code
  const codeA2 = getReferralCode('user-A');
  check('Same user returns same code', codeA2 === codeA);

  // 3️⃣ Referral registered correctly
  const registered = registerReferral('user-C', codeA);
  check('Referral registered', registered === true);

  // 4️⃣ Self-referral rejected
  const selfRef = registerReferral('user-A', codeA);
  check('Self-referral rejected', selfRef === false);

  // 5️⃣ Invalid code rejected
  const invalid = registerReferral('user-D', 'REF-NONEXISTENT');
  check('Invalid referral code rejected', invalid === false);

  // 6️⃣ Commission calculated and accrued to referrer (2000 bps = 20%)
  const fee = 1_000_000; // lamports
  const result = calculateCommission('user-C', fee, 2000); // 20%
  check('Referrer is user-A', result.referrerId === 'user-A');
  check('Commission = 20% of fee', result.commissionLamports === 200_000);
  check('Commission accrued', getAccruedCommission('user-A') === 200_000);

  // 7️⃣ Trader without referrer gets no commission
  const noRef = calculateCommission('user-B', fee, 200);
  check('No referrer → no commission', noRef.referrerId === null && noRef.commissionLamports === 0);

  console.log(`\n${allPass ? '✅ All Referral System tests passed' : '❌ Some tests failed'}`);
  process.exit(allPass ? 0 : 1);
})();