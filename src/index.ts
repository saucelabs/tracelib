import { Range, StatsObject } from './types'
import TimelineLoader from './loader'
import { calcFPS } from './utils'
import TimelineDetailsView from './timelineModel/timelineDetailsView'

export default class Tracelib {
    public tracelog: object
    private _timelineLoader: TimelineLoader
    private _timelineDetailsView: TimelineDetailsView

    public constructor (tracelog: object, range?: Range) {
        this.tracelog = tracelog
        this._timelineLoader = new TimelineLoader(this.tracelog)
    }

    public getFPS(): number[] {
        this._timelineLoader.init()
        return this._timelineLoader.performanceModel.frames()
            .map(( { duration } ): number => calcFPS(duration))
    }

    public getSummary(from?: number, to?: number): StatsObject {
        this._timelineLoader.init()
        const performanceModel = this._timelineLoader.performanceModel
        this._timelineDetailsView = new TimelineDetailsView(performanceModel.findMainTrack())
        const startTime = from || performanceModel.startTime
        const endTime = to || performanceModel.endTime
        return {
            ...this._timelineDetailsView.getSummary(startTime, endTime),
            startTime,
            endTime,
        }
    }
}
