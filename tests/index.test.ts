import Tracelib from '../src/index'
import JANK_TRACE_LOG from './__fixtures__/jankTraceLog.json'

let trace: Tracelib
beforeAll(() => {
    // Ensure debug is off for main tests
    Tracelib.setDebugMode(false)
    trace = new Tracelib(JANK_TRACE_LOG)
})

test('should contain traceLog', () => {
    const sampleTrace = new Tracelib({ foo: 'bar' })
    expect(sampleTrace.tracelog).toEqual({ foo: 'bar' })
})

describe('debug mode', () => {
    it('should be disabled by default', () => {
        expect(Tracelib.isDebugEnabled()).toBe(false)
    })

    it('should enable debug mode via static method', () => {
        Tracelib.setDebugMode(true)
        expect(Tracelib.isDebugEnabled()).toBe(true)
        Tracelib.setDebugMode(false)
        expect(Tracelib.isDebugEnabled()).toBe(false)
    })

    it('should enable debug mode via constructor option', () => {
        const debugTrace = new Tracelib(JANK_TRACE_LOG, { debug: true })
        expect(Tracelib.isDebugEnabled()).toBe(true)
        expect(debugTrace.tracelog).toBeDefined()
        Tracelib.setDebugMode(false)
    })

    it('should work with debug mode enabled', () => {
        const debugTrace = new Tracelib(JANK_TRACE_LOG, { debug: true })
        const result = debugTrace.getFPS()
        expect(result.times.length).toBeGreaterThan(0)
        expect(result.values.length).toBeGreaterThan(0)
        Tracelib.setDebugMode(false)
    })
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
        /**
         * use tracelog with CrRenderer thread name metadata missing
         */
        const borkedTrace = JANK_TRACE_LOG.slice(0, -1)

        const tracelib = new Tracelib(borkedTrace)
        const result = tracelib.getMainTrackEvents()
        expect(result.length).toEqual(56244)
    })
})

describe('getDetailStats', () => {
    it('should get detail stats', () => {
        const result = trace.getDetailStats()
        expect(Object.keys(result)).toMatchSnapshot()
    })

    it('should not throw error on second call of getDetailStats', () => {
        const result = trace.getDetailStats()
        expect(Object.keys(result)).toMatchSnapshot()
    })

    it('should get summary data between passed range', () => {
        const result = trace.getDetailStats(289960055.634, 289960729.717)
        expect(Object.keys(result)).toMatchSnapshot()
    })
})
