import { hello } from '../src/index'

test('do a unit test', () => {
    expect(hello('barfoo')).toBe('Hello foobar + barfoo!')
})
