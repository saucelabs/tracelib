import { Range, StatsObject, CountersData, CountersValuesTimestamp } from '../devtools/types'
import TimelineLoader from '../devtools/loader'
import { calcFPS } from '../devtools/utils'
import Track, { TrackType } from '../devtools/timelineModel/track'
import TimelineUIUtils from '../devtools/timelineModel/timelineUIUtils'
import PerformanceModel from '../devtools/timelineModel/performanceModel'
import TimelineData from '../devtools/timelineModel/timelineData'
import Event from '../devtools/tracingModel/event'
import CountersGraph from '../devtools/timelineModel/counterGraph'
import CustomUtils from './utils'

export default class Tracelib {
    public tracelog: object
    private _timelineLoader: TimelineLoader
    private _performanceModel: PerformanceModel

    public constructor (tracelog: object, range?: Range) {
        this.tracelog = tracelog
        this._timelineLoader = new TimelineLoader(this.tracelog)
        this._timelineLoader.init()
        this._performanceModel = this._timelineLoader.performanceModel
    }

    private _findMainTrack(): Track {
        const threads: Track[] = this._performanceModel
            .timelineModel()
            .tracks()

        const mainTrack = threads.find((track: Track): boolean => Boolean(
            track.type === TrackType.MainThread && track.forMainFrame && track.events.length
        ))

        /**
         * If no main thread could be found, pick the thread with most events
         * captured in it and assume this is the main track.
         */
        if (!mainTrack) {
            return threads.slice(1).reduce(
                (curr: Track, com: Track): Track => curr.events.length > com.events.length ? curr : com,
                threads[0])
        }

        return mainTrack
    }

    public getMainTrackEvents(): Event[] {
        const mainTrack = this._findMainTrack()
        return mainTrack.events
    }

    public getFPS(): CountersValuesTimestamp {
        const fpsData: CountersValuesTimestamp = {
            times: [],
            values: []
        }
        this._timelineLoader.performanceModel.frames().forEach(({ duration, startTime }): void => {
            fpsData.values.push(calcFPS(duration))
            fpsData.times.push(startTime)
        })
        return fpsData
    }

    public getSummary(from?: number, to?: number): StatsObject {
        const timelineUtils = new TimelineUIUtils()
        const startTime = from || this._performanceModel.timelineModel().minimumRecordTime()
        const endTime = to || this._performanceModel.timelineModel().maximumRecordTime()
        const mainTrack = this._findMainTrack()

        // We are facing data mutaion issue in devtools, to avoid it cloning syncEvents
        const syncEvents = mainTrack.syncEvents().slice()

        return {
            ...timelineUtils.statsForTimeRange(
                syncEvents, startTime, endTime
            ),
            startTime,
            endTime,
        }
    }

    public getWarningCounts(): StatsObject {
        const mainTrack = this._findMainTrack()
        return mainTrack.events.reduce((counter: StatsObject, event: Event): StatsObject => {
            const timelineData = TimelineData.forEvent(event)
            const warning = timelineData.warning
            if (warning) {
                counter[warning] = counter[warning] ? counter[warning] + 1 : 1
            }
            return counter
        }, {})
    }

    public getMemoryCounters(): CountersData {
        const counterGraph = new CountersGraph()
        const counters = counterGraph.setModel(this._performanceModel, this._findMainTrack())
        return Object.keys(counters).reduce((acc, counter): CountersData => ({
            ...acc,
            [counter]: {
                times: counters[counter].times,
                values: counters[counter].values,
            }
        }), {})
    }

    public getDetailStats(from?: number, to?: number): CountersData {
        const timelineUtils = new CustomUtils()
        const startTime = from || this._performanceModel.timelineModel().minimumRecordTime()
        const endTime = to || this._performanceModel.timelineModel().maximumRecordTime()
        const mainTrack = this._findMainTrack()

        // We are facing data mutaion issue in devtools, to avoid it cloning syncEvents
        const syncEvents = mainTrack.syncEvents().slice()

        return {
            ...timelineUtils.detailStatsForTimeRange(
                syncEvents, startTime, endTime
            ),
            range: {
                times: [startTime, endTime],
                values: [startTime, endTime]
            }
        }
    }
}
