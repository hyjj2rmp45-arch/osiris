// test-admin-alerts.ts
import { sendSms } from './src/lib/smsProvider';
import { AdminAlerts } from './src/lib/admin-alerts';

async function main() {
  console.log('=== SMS Provider Test ===\n');

  // Directly test the provider with a dummy payload
  const phone = '+14145187407';
  const testMsg = 'TEST SMS FROM OSIRIS';
  const ok = await sendSms(phone, testMsg);
  console.log(`SMS sent? ${ok}`);

  // Also test one of the built-in alert helpers to make sure wiring is correct
  console.log('\nTesting AdminAlerts.high...');
  await AdminAlerts.high('Test High', 'This is a high-severity test', 'admin-alerts-test');
  console.log('✓ Alert helper called without error');

  console.log('\n=== Test completed ===');
}

main().catch((e) => {
  console.error('❌ Test failed:', e);
  process.exit(1);
});