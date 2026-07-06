import { describe, expect, it } from 'vitest'
import { isWaiverLabelActorVerified, PRINCIPAL_ALLOWLIST, WAIVER_LABEL } from './waiver-label'

describe('isWaiverLabelActorVerified (D-097 actor-verified waiver label)', () => {
  it('label absent → false, regardless of actor', () => {
    expect(
      isWaiverLabelActorVerified({
        labels: ['tier:1'],
        labelActor: 'daniboomerang',
        principalAllowlist: PRINCIPAL_ALLOWLIST
      })
    ).toBe(false)
  })

  it('label present, actor null → false', () => {
    expect(
      isWaiverLabelActorVerified({
        labels: [WAIVER_LABEL],
        labelActor: null,
        principalAllowlist: PRINCIPAL_ALLOWLIST
      })
    ).toBe(false)
  })

  it('label present, actor not in allowlist → false', () => {
    expect(
      isWaiverLabelActorVerified({
        labels: [WAIVER_LABEL],
        labelActor: 'some-agent-bot',
        principalAllowlist: PRINCIPAL_ALLOWLIST
      })
    ).toBe(false)
  })

  it('label present, actor in allowlist → true', () => {
    expect(
      isWaiverLabelActorVerified({
        labels: [WAIVER_LABEL],
        labelActor: 'daniboomerang',
        principalAllowlist: PRINCIPAL_ALLOWLIST
      })
    ).toBe(true)
  })
})
