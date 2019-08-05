import { Range, Summary } from './types'
import TimelineLoader from './loader'
import { calcFPS } from './utils'

export default class Tracelib {
    public tracelog: object
    private _timelineLoader: TimelineLoader

    public constructor (tracelog: object, range?: Range) {
        this.tracelog = tracelog
        this._timelineLoader = new TimelineLoader(this.tracelog)
    }

    public getFPS(): number[] {
        this._timelineLoader.init()
        return this._timelineLoader.performanceModel.frames()
            .map(( { duration } ): number => calcFPS(duration))
    }
}
