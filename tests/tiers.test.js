const { TIERS, getLimits, canTrade, tierRank, upgradeTier, downgradeTier, generateReferralCode } = require('../lib/tiers');

// Manual test runner
(async () => {
  console.log('Running Tier System (P2.1) tests...\n');
  let allPass = true;
  const check = (name, cond) => {
    console.log(`${cond ? '✅' : '❌'} ${name}`);
    if (!cond) allPass = false;
  };

  // 1️⃣ Free tier cannot trade
  check('Free tier cannot trade', canTrade(TIERS.FREE) === false);

  // 2️⃣ Basic / Pro / Whale can trade
  check('Basic tier can trade', canTrade(TIERS.BASIC) === true);
  check('Pro tier can trade', canTrade(TIERS.PRO) === true);
  check('Whale tier can trade', canTrade(TIERS.WHALE) === true);

  // 3️⃣ Limits escalate
  const basic = getLimits(TIERS.BASIC).maxTradeLamports;
  const pro = getLimits(TIERS.PRO).maxTradeLamports;
  const whale = getLimits(TIERS.WHALE).maxTradeLamports;
  check('Pro limits > Basic limits', pro > basic);
  check('Whale limits > Pro limits', whale > pro);

  // 4️⃣ Tier rank ordering
  check('Free rank = 0', tierRank(TIERS.FREE) === 0);
  check('Whale rank = 3', tierRank(TIERS.WHALE) === 3);

  // 5️⃣ Upgrade works, downgrade via upgrade rejected
  let up = upgradeTier(TIERS.BASIC, TIERS.PRO);
  check('Upgrade basic->pro works', up === TIERS.PRO);
  let downgradeRejected = false;
  try { upgradeTier(TIERS.PRO, TIERS.BASIC); } catch (e) { downgradeRejected = true; }
  check('Upgrade rejects downgrade', downgradeRejected === true);

  // 6️⃣ Downgrade works, upgrade via downgrade rejected
  let down = downgradeTier(TIERS.PRO, TIERS.BASIC);
  check('Downgrade pro->basic works', down === TIERS.BASIC);
  let upgradeRejected = false;
  try { downgradeTier(TIERS.BASIC, TIERS.PRO); } catch (e) { upgradeRejected = true; }
  check('Downgrade rejects upgrade', upgradeRejected === true);

  // 7️⃣ Referral code generated
  const code = generateReferralCode('user-42');
  check('Referral code generated', typeof code === 'string' && code.startsWith('REF-'));

  console.log(`\n${allPass ? '✅ All Tier System tests passed' : '❌ Some tests failed'}`);
  process.exit(allPass ? 0 : 1);
})();