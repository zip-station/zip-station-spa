import { describe, it, expect } from 'vitest'
import { backlogMidpoint, buildBacklogQuery } from './backlog'

describe('backlogMidpoint', () => {
  it('returns the step when both neighbours are missing (empty list)', () => {
    expect(backlogMidpoint(undefined, undefined)).toBe(1000)
  })

  it('places above the first row when there is no "before"', () => {
    expect(backlogMidpoint(undefined, 1000)).toBe(0)
  })

  it('appends below the last row when there is no "after"', () => {
    expect(backlogMidpoint(2000, undefined)).toBe(3000)
  })

  it('returns the midpoint between two neighbours', () => {
    expect(backlogMidpoint(1000, 2000)).toBe(1500)
    expect(backlogMidpoint(1000, 1001)).toBe(1000.5)
  })
})

describe('buildBacklogQuery', () => {
  it('returns an empty string for no filters', () => {
    expect(buildBacklogQuery({})).toBe('')
  })

  it('defaults sort/dir and repeats multi-value params', () => {
    const qs = buildBacklogQuery({
      status: ['Backlog', 'Committed'],
      projectIds: ['p1', 'p2'],
      sort: 'priority',
      dir: 'desc',
    })
    expect(qs).toContain('status=Backlog')
    expect(qs).toContain('status=Committed')
    expect(qs).toContain('projectIds=p1')
    expect(qs).toContain('projectIds=p2')
    expect(qs).toContain('sort=priority')
    expect(qs).toContain('dir=desc')
    expect(qs.startsWith('?')).toBe(true)
  })

  it('url-encodes values', () => {
    expect(buildBacklogQuery({ query: 'a b&c' })).toBe('?query=a%20b%26c')
  })

  it('includes numeric pagination when provided (even 0)', () => {
    const qs = buildBacklogQuery({ skip: 0, limit: 50 })
    expect(qs).toContain('skip=0')
    expect(qs).toContain('limit=50')
  })
})
