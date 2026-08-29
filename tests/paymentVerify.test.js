const { verifyPayment, registerSimulatedTransaction, isProcessed, resetLedger, KNOWN_RECIPIENT, KNOWN_AMOUNT_LAMPORTS } = require('../lib/paymentVerify');

// Manual test runner
(async () => {
  console.log('Running SOL Payment Verification (P2.2) tests...\n');
  let allPass = true;
  const check = (name, cond) => {
    console.log(`${cond ? '✅' : '❌'} ${name}`);
    if (!cond) allPass = false;
  };

  resetLedger();

  // 1️⃣ Valid payment is verified
  registerSimulatedTransaction('sig-valid', {
    recipient: KNOWN_RECIPIENT,
    amount: KNOWN_AMOUNT_LAMPORTS,
    confirmed: true
  });
  const valid = await verifyPayment('sig-valid');
  check('Valid payment verified', valid.valid === true);

  // 2️⃣ Wrong recipient rejected
  registerSimulatedTransaction('sig-wrong-recipient', {
    recipient: 'SOMEONE_ELSE',
    amount: KNOWN_AMOUNT_LAMPORTS,
    confirmed: true
  });
  const wrongRecipient = await verifyPayment('sig-wrong-recipient');
  check('Wrong recipient rejected', wrongRecipient.valid === false && wrongRecipient.reason === 'WRONG_RECIPIENT');

  // 3️⃣ Insufficient amount rejected
  registerSimulatedTransaction('sig-low-amount', {
    recipient: KNOWN_RECIPIENT,
    amount: KNOWN_AMOUNT_LAMPORTS - 1,
    confirmed: true
  });
  const lowAmount = await verifyPayment('sig-low-amount');
  check('Insufficient amount rejected', lowAmount.valid === false && lowAmount.reason === 'INSUFFICIENT_AMOUNT');

  // 4️⃣ Unconfirmed rejected
  registerSimulatedTransaction('sig-unconfirmed', {
    recipient: KNOWN_RECIPIENT,
    amount: KNOWN_AMOUNT_LAMPORTS,
    confirmed: false
  });
  const unconfirmed = await verifyPayment('sig-unconfirmed');
  check('Unconfirmed rejected', unconfirmed.valid === false && unconfirmed.reason === 'UNCONFIRMED');

  // 5️⃣ Duplicate signature rejected (idempotency)
  const dup = await verifyPayment('sig-valid');
  check('Duplicate signature rejected', dup.valid === false && dup.reason === 'DUPLICATE_SIGNATURE');

  // 6️⃣ isProcessed reflects processed signature
  check('isProcessed true for processed', isProcessed('sig-valid') === true);
  check('isProcessed false for new', isProcessed('sig-never-seen') === false);

  // 7️⃣ Missing transaction rejected
  const missing = await verifyPayment('sig-does-not-exist');
  check('Missing transaction rejected', missing.valid === false && missing.reason === 'TX_NOT_FOUND');

  console.log(`\n${allPass ? '✅ All Payment Verification tests passed' : '❌ Some tests failed'}`);
  process.exit(allPass ? 0 : 1);
})();