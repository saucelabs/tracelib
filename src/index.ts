import { Range, StatsObject } from './types'
import TimelineLoader from './loader'
import { calcFPS } from './utils'
import TimelineDetailsView from './timelineModel/timelineDetailsView'
import Warning from '../custom/warning'

export default class Tracelib {
    public tracelog: object
    private _timelineLoader: TimelineLoader
    private _timelineDetailsView: TimelineDetailsView

    public constructor (tracelog: object, range?: Range) {
        this.tracelog = tracelog
        this._timelineLoader = new TimelineLoader(this.tracelog)
        this._timelineLoader.init()
    }

    public getFPS(): number[] {
        return this._timelineLoader.performanceModel.frames()
            .map(( { duration } ): number => calcFPS(duration))
    }

    public getSummary(from?: number, to?: number): StatsObject {
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

    public getWarning(): StatsObject {
        const performanceModel = this._timelineLoader.performanceModel
        const warning = new Warning(performanceModel)
        return warning.getCounts()
    }

    public getMainThreadEventsLength(): number {
        const performanceModel = this._timelineLoader.performanceModel
        if (!performanceModel.findMainTrack()) {
            throw new Error('MainTrack is missing in traceLog')
        }
        return performanceModel.findMainTrack().events.length
    }
}
