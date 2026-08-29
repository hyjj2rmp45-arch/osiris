/**
 * Quick functional test for NotificationBatcher
 * Tests: batching, rate limiting, priority bypass
 */
import { NotificationBatcher } from './src/lib/notification-batcher';

// Mock publish function to capture calls
const published: Array<{ type: string; payload: unknown }> = [];
const mockPublish = (type: string, payload: unknown) => {
  published.push({ type, payload });
  console.log(`[PUBLISH] ${type}`, JSON.stringify(payload, null, 2));
};

async function runTests() {
  const batcher = new NotificationBatcher({ publish: mockPublish, windowMs: 1000, maxPerSecond: 5 });

  console.log('=== Test 1: Basic batching (same type, non-priority) ===');
  batcher.add('test:event', { id: 1 });
  batcher.add('test:event', { id: 2 });
  batcher.add('test:event', { id: 3 });

  // Wait for batch window to flush
  await new Promise(r => setTimeout(r, 1200));
  console.log('Published count after batch flush:', published.length);
  console.log('Expected: 1 batch publish (test:event:batch) with 3 payloads');

  console.log('\n=== Test 2: Priority bypass ===');
  published.length = 0;
  batcher.add('test:priority', { critical: true }, { priority: true });
  console.log('Published count after priority:', published.length);
  console.log('Expected: 1 immediate publish (test:priority)');

  console.log('\n=== Test 3: Rate limiting (max 5 per second) ===');
  published.length = 0;
  // Fire 7 rapid events (limit is 5/s)
  for (let i = 0; i < 7; i++) {
    batcher.add('test:rate', { seq: i });
  }
  // Wait a bit for delayed ones to potentially fire
  await new Promise(r => setTimeout(r, 1500));
  console.log('Published count after rate limit test:', published.length);
  console.log('Expected: 5 immediate + 2 delayed = 7 total (batched)');

  console.log('\n=== Test 4: Different types batch separately ===');
  published.length = 0;
  batcher.add('type:a', { v: 1 });
  batcher.add('type:b', { v: 2 });
  await new Promise(r => setTimeout(r, 1200));
  console.log('Published count for different types:', published.length);
  console.log('Expected: 2 batch publishes (type:a:batch and type:b:batch)');

  console.log('\n=== All tests completed ===');
  batcher.destroy();
}

runTests().catch(console.error);