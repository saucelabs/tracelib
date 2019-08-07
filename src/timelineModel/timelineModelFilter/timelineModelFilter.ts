import Event from '../../tracingModel/event'

export default class TimelineModelFilter {
    /**
     * @param {!SDK.TracingModel.Event} event
     * @return {boolean}
     */
    accept(event: Event): boolean {
        return true
    }
}
