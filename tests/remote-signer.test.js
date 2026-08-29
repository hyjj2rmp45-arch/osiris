const { sign } = require('../lib/remote-signer');

describe('Remote Signer – basic sanity checks', () => {
  test('signature length must be exactly 64 bytes', () => {
    const payload = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x04]);
    const sig = sign(payload);
    expect(sig.length).toBe(64);
  });

  test('signing the same payload yields identical signatures', () => {
    const payload = new Uint8Array([0xaa, 0xbb, 0xcc]);
    const sig1 = sign(payload);
    const sig2 = sign(payload);
    expect(sig1.every((b, i) => b === sig2[i])).toBe(true);
  });
});