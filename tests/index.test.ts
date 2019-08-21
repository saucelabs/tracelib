import Tracelib from '../src/index'
import JANK_TRACE_LOG from './__fixtures__/jankTraceLog.json'

let trace: Tracelib
beforeAll(() => {
    trace = new Tracelib(JANK_TRACE_LOG)
})

test('should contain traceLog', () => {
    const sampleTrace = new Tracelib({ foo: 'bar' })
    expect(sampleTrace.tracelog).toEqual({ foo: 'bar' })
})

test('should get FPS', () => {
    const result = trace.getFPS()
    expect(result).toMatchSnapshot()
})

describe('getSummary', () => {
    it('should get summary data', () => {
        const result = trace.getSummary()
        expect(result).toMatchSnapshot()
    })

    it('should not throw error on second call of getSummary', () => {
        const result = trace.getSummary()
        expect(result).toMatchSnapshot()
    })

    it('should get summary data between passed range', () => {
        const result = trace.getSummary(289960055.634, 289960729.717)
        expect(result).toMatchSnapshot()
    })
})

describe('getWarningCounts', () => {
    it('should get warning counts', () => {
        const result = trace.getWarningCounts()
        expect(result).toMatchSnapshot()
    })
})

test('should get memory counters', () => {
    const result = trace.getMemoryCounters()
    expect(result).toMatchSnapshot()
})

describe('mainTrackEvents', () => {
    it('should get events', () => {
        const result = trace.getMainTrackEvents()
        expect(result.length).toEqual(56244)
    })

    it('should throws error if main track is missing', () => {
        const borkedTrace = JANK_TRACE_LOG.slice(0, -1)
        const tracelib = new Tracelib(borkedTrace)
        const result = tracelib.getMainTrackEvents()
        expect(result.length).toEqual(56244)
    })
})
