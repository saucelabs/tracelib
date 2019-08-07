import TimelineUIUtils from './timelineUIUtils';
import Track from './track';

export default class TimelineDetailsView {
    private _track: Track
    private _timelineUtils: TimelineUIUtils

    public constructor(track: Track) {
        this._track = track
        this._timelineUtils = new TimelineUIUtils()
    }

    /**
     * @param {number} startTime
     * @param {number} endTime
     */
    public getSummary(startTime: number, endTime: number): any {
        if (!this._track) {
            return
        }
        return this._timelineUtils.statsForTimeRange(this._track.syncEvents(), startTime, endTime)
    }
}
