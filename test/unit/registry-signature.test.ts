import { randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';
import { ed25519 } from '@noble/curves/ed25519';
import { RegistryError } from '../../src/utils/registry-schema';
import {
  MAX_REGISTRY_SIGNATURES,
  RegistrySignatureError,
  parseSignedRegistry,
  verifyRegistrySignature,
} from '../../src/utils/registry-signature';

// The bundled key list, emptied before each test. Every key in these tests is a throwaway made here.
jest.mock('../../src/registry-signing-keys', () => ({ REGISTRY_SIGNING_KEYS: [] }));
const bundledKeys: string[] = jest.requireMock('../../src/registry-signing-keys').REGISTRY_SIGNING_KEYS;

const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString('hex');
function keyPair() {
  const secretKey = new Uint8Array(randomBytes(32));
  return { secretKey, publicKey: hex(ed25519.getPublicKey(secretKey)) };
}
const sign = (message: string | Uint8Array, secretKey: Uint8Array) =>
  hex(ed25519.sign(typeof message === 'string' ? Buffer.from(message, 'utf8') : message, secretKey));

// The registry apps download, byte for byte
const REGISTRY_TEXT = fs.readFileSync(path.join(__dirname, '../../src/extension-registry.json'), 'utf8');

/** Expects `fn` to throw a RegistrySignatureError with `code`. */
function expectSignatureError(fn: () => unknown, code: string) {
  let thrown: unknown;
  try {
    fn();
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(RegistrySignatureError);
  expect((thrown as RegistrySignatureError).code).toBe(code);
}

const current = keyPair();
const next = keyPair();

beforeEach(() => {
  bundledKeys.length = 0;
});

describe('verifyRegistrySignature', () => {
  it('accepts a registry signed with a trusted key and returns that key', () => {
    const signature = sign(REGISTRY_TEXT, current.secretKey);

    expect(verifyRegistrySignature(REGISTRY_TEXT, signature, [current.publicKey])).toBe(current.publicKey);
    expect(verifyRegistrySignature(REGISTRY_TEXT, `${signature}\n`, [current.publicKey])).toBe(current.publicKey);
  });

  it('uses the bundled keys by default', () => {
    bundledKeys.push(current.publicKey);

    expect(verifyRegistrySignature(REGISTRY_TEXT, sign(REGISTRY_TEXT, current.secretKey))).toBe(current.publicKey);
  });

  it('accepts the raw bytes of the registry', () => {
    const bytes = new Uint8Array(Buffer.from(REGISTRY_TEXT, 'utf8'));

    expect(verifyRegistrySignature(bytes, sign(bytes, current.secretKey), [current.publicKey])).toBe(current.publicKey);
  });

  it('rejects a registry with one byte changed', () => {
    const signature = sign(REGISTRY_TEXT, current.secretKey);
    const middle = Math.floor(REGISTRY_TEXT.length / 2);
    const changed = REGISTRY_TEXT.charCodeAt(middle) === 0x61 ? 'b' : 'a';
    const tampered = REGISTRY_TEXT.slice(0, middle) + changed + REGISTRY_TEXT.slice(middle + 1);
    const tamperedBytes = new Uint8Array(Buffer.from(REGISTRY_TEXT, 'utf8'));
    tamperedBytes[tamperedBytes.length - 1]! ^= 1;

    expect(tampered).toHaveLength(REGISTRY_TEXT.length);
    expectSignatureError(() => verifyRegistrySignature(tampered, signature, [current.publicKey]), 'SIGNATURE_MISMATCH');
    expectSignatureError(
      () => verifyRegistrySignature(tamperedBytes, signature, [current.publicKey]),
      'SIGNATURE_MISMATCH'
    );
  });

  it('rejects the same registry re-serialized, since the bytes differ', () => {
    const signature = sign(REGISTRY_TEXT, current.secretKey);
    const reserialized = JSON.stringify(JSON.parse(REGISTRY_TEXT));

    expectSignatureError(
      () => verifyRegistrySignature(reserialized, signature, [current.publicKey]),
      'SIGNATURE_MISMATCH'
    );
  });

  it('rejects a registry signed with a key it does not trust', () => {
    const signature = sign(REGISTRY_TEXT, keyPair().secretKey);

    expectSignatureError(
      () => verifyRegistrySignature(REGISTRY_TEXT, signature, [current.publicKey]),
      'SIGNATURE_MISMATCH'
    );
    bundledKeys.push(current.publicKey);
    expectSignatureError(() => verifyRegistrySignature(REGISTRY_TEXT, signature), 'SIGNATURE_MISMATCH');
  });

  it('accepts a signature from any trusted key, so keys can be rotated', () => {
    const trusted = [current.publicKey, next.publicKey];

    expect(verifyRegistrySignature(REGISTRY_TEXT, sign(REGISTRY_TEXT, current.secretKey), trusted)).toBe(
      current.publicKey
    );
    expect(verifyRegistrySignature(REGISTRY_TEXT, sign(REGISTRY_TEXT, next.secretKey), trusted)).toBe(next.publicKey);
  });

  it('accepts a file signed with the old and the new key under either key alone', () => {
    const signature = [sign(REGISTRY_TEXT, current.secretKey), sign(REGISTRY_TEXT, next.secretKey)].join('\r\n');

    expect(verifyRegistrySignature(REGISTRY_TEXT, signature, [current.publicKey])).toBe(current.publicKey);
    expect(verifyRegistrySignature(REGISTRY_TEXT, signature, [next.publicKey])).toBe(next.publicKey);
    expectSignatureError(
      () => verifyRegistrySignature(REGISTRY_TEXT, signature, [keyPair().publicKey]),
      'SIGNATURE_MISMATCH'
    );
  });

  it('fails closed when no key is configured', () => {
    const signature = sign(REGISTRY_TEXT, current.secretKey);

    expectSignatureError(() => verifyRegistrySignature(REGISTRY_TEXT, signature), 'NO_SIGNING_KEYS');
    expectSignatureError(() => verifyRegistrySignature(REGISTRY_TEXT, signature, []), 'NO_SIGNING_KEYS');
    expect(() => verifyRegistrySignature(REGISTRY_TEXT, signature)).toThrow(/No registry signing key configured/);
  });

  it.each([
    ['not hex', 'z'.repeat(64)],
    ['too short', 'ab'.repeat(31)],
    ['not a point on the curve', 'ff'.repeat(32)],
  ])('rejects a trusted key that is %s', (_label, key) => {
    const signature = sign(REGISTRY_TEXT, current.secretKey);

    expectSignatureError(
      () => verifyRegistrySignature(REGISTRY_TEXT, signature, [current.publicKey, key]),
      'INVALID_SIGNING_KEY'
    );
  });

  it.each([
    ['empty', () => ''],
    ['only blank lines', () => '\n \n'],
    ['not hex', () => 'g'.repeat(128)],
    ['truncated', () => sign(REGISTRY_TEXT, current.secretKey).slice(0, 126)],
    ['too long', () => `${sign(REGISTRY_TEXT, current.secretKey)}00`],
    [
      `more than ${MAX_REGISTRY_SIGNATURES} lines`,
      () =>
        Array(MAX_REGISTRY_SIGNATURES + 1)
          .fill(sign(REGISTRY_TEXT, current.secretKey))
          .join('\n'),
    ],
    ['a valid line next to a malformed one', () => `${sign(REGISTRY_TEXT, current.secretKey)}\nnot-a-signature`],
  ])('rejects a signature file that is %s', (_label, signature) => {
    expectSignatureError(
      () => verifyRegistrySignature(REGISTRY_TEXT, signature(), [current.publicKey]),
      'MALFORMED_SIGNATURE'
    );
  });

  it('rejects a signature over other bytes', () => {
    const signature = sign('{"extensions":[],"extractors":[]}', current.secretKey);

    expectSignatureError(
      () => verifyRegistrySignature(REGISTRY_TEXT, signature, [current.publicKey]),
      'SIGNATURE_MISMATCH'
    );
  });

  it('checks the UTF-8 bytes Node writes for text with non-ASCII characters', () => {
    // Every UTF-8 length boundary, and lone surrogates, including one at the very end
    const text =
      '{"name":"Café ✓ 日本 🎬","edges":"\u007f\u0080\u07ff\u0800\uffff\u{10000}\u{10ffff}","odd":"\ud800 \udfff"}\ud83c';
    // Buffer encodes lone surrogates as U+FFFD, like the file a signer reads back
    const signature = sign(Buffer.from(text, 'utf8'), current.secretKey);

    expect(verifyRegistrySignature(text, signature, [current.publicKey])).toBe(current.publicKey);
    expectSignatureError(
      () => verifyRegistrySignature(text.replace('é', 'e'), signature, [current.publicKey]),
      'SIGNATURE_MISMATCH'
    );
  });
});

describe('parseSignedRegistry', () => {
  it('returns the validated registry when the signature verifies', () => {
    const registry = parseSignedRegistry(REGISTRY_TEXT, sign(REGISTRY_TEXT, current.secretKey), {
      publicKeys: [current.publicKey],
    });

    const expected = JSON.parse(REGISTRY_TEXT);
    expect(registry.schemaVersion).toBe(expected.schemaVersion ?? 1);
    expect(registry.extensions).toEqual(expected.extensions);
    expect(registry.extractors).toEqual(expected.extractors);
  });

  it('uses the bundled keys by default and fails closed without them', () => {
    const signature = sign(REGISTRY_TEXT, current.secretKey);

    expectSignatureError(() => parseSignedRegistry(REGISTRY_TEXT, signature), 'NO_SIGNING_KEYS');
    bundledKeys.push(current.publicKey);
    expect(parseSignedRegistry(REGISTRY_TEXT, signature).extensions.length).toBeGreaterThan(0);
  });

  it('verifies before parsing, so a tampered registry is rejected for its signature', () => {
    const signature = sign(REGISTRY_TEXT, current.secretKey);

    expectSignatureError(
      () => parseSignedRegistry(`${REGISTRY_TEXT.slice(0, -2)}`, signature, { publicKeys: [current.publicKey] }),
      'SIGNATURE_MISMATCH'
    );
  });

  it('runs schema validation on a signed registry', () => {
    const text = JSON.stringify({ extensions: [{ id: 'bad id', name: 'Bad' }], extractors: [] });

    const parse = () => parseSignedRegistry(text, sign(text, current.secretKey), { publicKeys: [current.publicKey] });

    expect(parse).toThrow(RegistryError);
    expect(parse).toThrow(/extensions\[0\] \(bad id\): id must be/);
  });

  it('passes on schema errors such as a newer schemaVersion', () => {
    const text = JSON.stringify({ schemaVersion: 99, extensions: [], extractors: [] });

    expect(() => parseSignedRegistry(text, sign(text, current.secretKey), { publicKeys: [current.publicKey] })).toThrow(
      expect.objectContaining({ name: 'RegistryError', code: 'UNSUPPORTED_SCHEMA', updateRequired: true })
    );
  });

  it('reports a signed file that is not JSON as an invalid registry', () => {
    const text = 'not json';

    expect(() => parseSignedRegistry(text, sign(text, current.secretKey), { publicKeys: [current.publicKey] })).toThrow(
      expect.objectContaining({ name: 'RegistryError', code: 'INVALID_REGISTRY' })
    );
  });
});

describe('bundled registry signing keys', () => {
  const { REGISTRY_SIGNING_KEYS } = jest.requireActual('../../src/registry-signing-keys');

  it('are lowercase hex ed25519 public keys, without duplicates', () => {
    for (const key of REGISTRY_SIGNING_KEYS) {
      expect(key).toMatch(/^[0-9a-f]{64}$/);
      expect(ed25519.utils.isValidPublicKey(Buffer.from(key, 'hex'), false)).toBe(true);
    }
    expect(new Set(REGISTRY_SIGNING_KEYS).size).toBe(REGISTRY_SIGNING_KEYS.length);
  });
});
