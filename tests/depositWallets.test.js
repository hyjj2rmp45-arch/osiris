const { generateDepositAddress, getOrCreateWallet, detectPayment, getDepositHistory, resetDeposits } = require('../lib/depositWallets');

// Manual test runner
(async () => {
  console.log('Running Deposit Wallets (P2.3) tests...\n');
  let allPass = true;
  const check = (name, cond) => {
    console.log(`${cond ? '✅' : '❌'} ${name}`);
    if (!cond) allPass = false;
  };

  resetDeposits();

  // 1️⃣ Deposit wallet generated per user
  const addr = generateDepositAddress('user-1');
  const addr2 = generateDepositAddress('user-2');
  check('Deposit address generated', typeof addr === 'string' && addr.length > 0);
  check('Different users get different addresses', addr !== addr2);

  // 2️⃣ getOrCreateWallet creates wallet with zero balance
  const wallet = getOrCreateWallet('user-1');
  check('Wallet created', wallet.userId === 'user-1');
  check('Initial balance zero', wallet.balanceLamports === 0);

  // 3️⃣ Verified payment credits balance
  const accepted = await detectPayment('user-1', { signature: 'sig-a', amountLamports: 100_000_000 });
  check('Payment accepted', accepted.accepted === true);
  check('Balance credited', accepted.balance === 100_000_000);

  // 4️⃣ Duplicate payment rejected
  const dup = await detectPayment('user-1', { signature: 'sig-a', amountLamports: 100_000_000 });
  check('Duplicate payment rejected', dup.accepted === false && dup.reason === 'DUPLICATE_PAYMENT');
  check('Balance unchanged after duplicate', dup.balance === 100_000_000);

  // 5️⃣ Deposit history tracked
  const history = getDepositHistory('user-1');
  check('History has 1 entry', history.length === 1);
  check('History records signature', history[0].signature === 'sig-a');

  // 6️⃣ Second distinct payment credited
  const second = await detectPayment('user-1', { signature: 'sig-b', amountLamports: 50_000_000 });
  check('Second payment accepted', second.accepted === true);
  check('Balance accumulates', second.balance === 150_000_000);

  console.log(`\n${allPass ? '✅ All Deposit Wallet tests passed' : '❌ Some tests failed'}`);
  process.exit(allPass ? 0 : 1);
})();