import Tracelib from '../src/index'
import JANK_TRACE_LOG from './__fixtures__/jankTraceLog.json'

test('should contain traceLog', () => {
    const sampleTrace = new Tracelib({ foo: 'bar' })
    expect(sampleTrace.tracelog).toEqual({ foo: 'bar' })
})

test('should get FPS', () => {
    const trace = new Tracelib(JANK_TRACE_LOG)
    const result = trace.getFPS()
    expect(result).toMatchSnapshot()
})

test('getSummary: should get summary data', () => {
    const trace = new Tracelib(JANK_TRACE_LOG)
    const result = trace.getSummary()
    expect(result).toMatchSnapshot()
})

test('getSummary: should throw error if main track is missing', () => {
    const trace = new Tracelib([])
    expect(() => trace.getSummary())
        .toThrow(new Error('MainTrack is missing in traceLog'))
})

test('should get summary data between passed range', () => {
    const trace = new Tracelib(JANK_TRACE_LOG)
    const result = trace.getSummary(289960055.634, 289960729.717)
    expect(result).toMatchSnapshot()
})

test('getWarningCounts: should get warning counts', () => {
    const trace = new Tracelib(JANK_TRACE_LOG)
    const result = trace.getWarningCounts()
    expect(result).toMatchSnapshot()
})

test('getWarningCounts: should throw error if main track is missing', () => {
    const trace = new Tracelib([])
    expect(() => trace.getWarningCounts())
        .toThrow(new Error('MainTrack is missing in traceLog'))
})

test('should get memory counters', () => {
    const trace = new Tracelib(JANK_TRACE_LOG)
    const result = trace.getMemoryCounters()
    expect(result).toMatchSnapshot()
})

test('mainTrackEvents: should get events', () => {
    const trace = new Tracelib(JANK_TRACE_LOG)
    const result = trace.getMainTrackEvents()
    expect(result.length).toEqual(56244)
})

test('mainTrackEvents: should throws error if main track is missing', () => {
    const trace = new Tracelib([])
    expect(() => trace.getMainTrackEvents())
        .toThrow(new Error('MainTrack is missing in traceLog'))
})