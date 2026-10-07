import { describe, expect, it } from 'vitest'
import { fingerprint } from './fingerprint'
import { encodeText } from './folder'

describe('the fingerprint of a model file (spec §6.1)', () => {
  it('is SHA-256 of the bytes, as lower-case hex', async () => {
    // FIPS 180-2's test vector for "abc".
    expect(await fingerprint(encodeText('abc'))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })

  it('changes with a single byte', async () => {
    expect(await fingerprint(encodeText('{"v":1}'))).not.toBe(
      await fingerprint(encodeText('{"v":2}')),
    )
  })
})
