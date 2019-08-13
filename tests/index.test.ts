import Tracelib from '../src/index'
import JANK_TRACE_LOG from './__fixtures__/jankTraceLog.json'
import MEMORY_COUNTERS from './__fixtures__/memoryCounters.json'

test('should contain traceLog', () => {
    const sampleTrace = new Tracelib({ foo: 'bar' })
    expect(sampleTrace.tracelog).toEqual({ foo: 'bar' })
})

test('should get FPS', () => {
    const trace = new Tracelib(JANK_TRACE_LOG)
    const result = trace.getFPS()
    expect(result).toMatchSnapshot()
})

test('should get summary data', () => {
    const trace = new Tracelib(JANK_TRACE_LOG)
    const result = trace.getSummary()
    expect(result).toMatchSnapshot()
})

test('should get summary data between passed range', () => {
    const trace = new Tracelib(JANK_TRACE_LOG)
    const result = trace.getSummary(289960055.634, 289960729.717)
    expect(result).toMatchSnapshot()
})

test('should get warning counts', () => {
    const trace = new Tracelib(JANK_TRACE_LOG)
    const result = trace.getWarningCounts()
    expect(result).toMatchSnapshot()
})

test('should get memory counters', () => {
    const trace = new Tracelib(JANK_TRACE_LOG)
    const result = trace.getMemoryCounters()
    expect(result).toEqual(MEMORY_COUNTERS)
})
