import Tracelib from '../src/index'
import JANK_TRACE_LOG from './__fixtures__/jankTraceLog.json'

test('should contain traceLog', () => {
    const sampleTrace = new Tracelib({ foo: 'bar' })
    expect(sampleTrace.tracelog).toEqual({ foo: 'bar' })
})

test('should get FPS', () => {
    const trace = new Tracelib(JANK_TRACE_LOG)
    const result = trace.getFPS()
    const expected = [
        182.2821727559685,
        10.307790628308753,
        11.092131244032895,
        11.014792866762287,
        11.00897231503525,
        10.794939328106791,
        10.929081197725838,
        10.815838712204958,
        10.556652274643293,
        10.47987340271033,
        10.926095888726774,
        10.486577179634944,
        10.897876006628481,
        10.839990888916617
    ]
    expect(result).toEqual(expected)
})

test('should get summary data', () => {
    const trace = new Tracelib(JANK_TRACE_LOG)
    const result = trace.getSummary()
    const expected = {
        rendering: 847.373997092247,
        painting: 69.94999980926514,
        other: 9.896000564098358,
        scripting: 394.4800021648407,
        idle: 52.38300037384033,
        startTime: 289959855.634,
        endTime: 289961229.717
    }
    expect(result).toEqual(expected)
})

test('should get summary data between passed range', () => {
    const trace = new Tracelib(JANK_TRACE_LOG)
    const result = trace.getSummary(289960055.634, 289960729.717)
    const expected = {
        rendering: 425.89399832487106,
        painting: 34.8999999165535,
        other: 4.653000295162201,
        scripting: 208.0020015835762,
        idle: 0.6339998841285706,
        startTime: 289960055.634,
        endTime: 289960729.717
    }
    expect(result).toEqual(expected)
})

test('should get warning counts', () => {
    const trace = new Tracelib(JANK_TRACE_LOG)
    const result = trace.getWarningCounts()
    const expected = {
        LongRecurringHandler: 13,
        ForcedStyle: 4684,
        ForcedLayout: 4683
    }
    expect(result).toEqual(expected)
})

test('getWarningCounts throws error if mainTrack is missing', () => {
    const trace = new Tracelib([])
    expect(() => trace.getMainThreadEventsLength())
        .toThrow(new Error('MainTrack is missing in traceLog'))
})

test('should get number of events in mainThread', () => {
    const trace = new Tracelib(JANK_TRACE_LOG)
    const result = trace.getMainThreadEventsLength()
    expect(result).toEqual(56244)
})

test('getMainThreadEventsLength throws error if mainTrack is missing', () => {
    const trace = new Tracelib([])
    expect(() => trace.getMainThreadEventsLength())
        .toThrow(new Error('MainTrack is missing in traceLog'))
})
