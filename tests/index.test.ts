import Tracelib from '../src/index'
import JANK_TRACE_LOG from './__fixtures__/jankTraceLog.json'

test('do a unit test', () => {
    const trace = new Tracelib({ foo: 'bar' })
    expect(trace.tracelog).toEqual({ foo: 'bar' })
})

test('should get FPS', () => {
    const trace = new Tracelib(JANK_TRACE_LOG)
    const fps = trace.getFPS()
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
    expect(fps.length).toEqual(14)
    expect(fps).toEqual(expected)
})
