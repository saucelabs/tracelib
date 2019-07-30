import Tracelib from '../src/index'

test('do a unit test', () => {
    const trace = new Tracelib({ foo: 'bar' })
    expect(trace.tracelog).toEqual({ foo: 'bar' })
})
