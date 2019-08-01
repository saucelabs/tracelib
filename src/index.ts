import { Range, Summary } from './types'

export default class Tracelib {
    public tracelog: object

    public constructor (tracelog: object, range?: Range) {
        this.tracelog = tracelog
    }

    public getSummary (): Summary {
    }
}
