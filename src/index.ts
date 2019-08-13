import { Range, StatsObject } from './types'
import TimelineLoader from './loader'
import { calcFPS } from './utils'
import Track, { TrackType } from './timelineModel/track'
import TimelineUIUtils from './timelineModel/timelineUIUtils'

export default class Tracelib {
    public tracelog: object
    private _timelineLoader: TimelineLoader

    public constructor (tracelog: object, range?: Range) {
        this.tracelog = tracelog
        this._timelineLoader = new TimelineLoader(this.tracelog)
        this._timelineLoader.init()
    }

    public getFPS(): number[] {
        this._timelineLoader.init()
        return this._timelineLoader.performanceModel.frames()
            .map(( { duration } ): number => calcFPS(duration))
    }

    public getSummary(from?: number, to?: number): StatsObject {
        const performanceModel = this._timelineLoader.performanceModel
        const mainTrack = performanceModel
            .timelineModel()
            .tracks()
            .find((track: Track): boolean => Boolean(
                track.type === TrackType.MainThread && track.forMainFrame && track.events.length
            ))

        const timelineUtils = new TimelineUIUtils()
        const startTime = from || performanceModel.startTime
        const endTime = to || performanceModel.endTime
        return {
            ...timelineUtils.statsForTimeRange(mainTrack.syncEvents(), startTime, endTime),
            startTime,
            endTime,
        }
    }
}
