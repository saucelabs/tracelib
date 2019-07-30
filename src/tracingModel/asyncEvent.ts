import { Phase } from './'
import Event from './event'

export default class AsyncEvent extends Event {
    public steps: Event[]

    /**
     * @param {!TracingModel.Event} startEvent
     */
    public constructor(startEvent: Event) {
        super(startEvent.categoriesString, startEvent.name, startEvent.phase, startEvent.startTime, startEvent.thread)
        this.addArgs(startEvent.args)
        this.steps = [startEvent]
    }

    /**
     * @param {!TracingModel.Event} event
     */
    private _addStep (event: Event): void {
        this.steps.push(event)

        if (event.phase === Phase.AsyncEnd || event.phase === Phase.NestableAsyncEnd) {
            this.setEndTime(event.startTime)
            // FIXME: ideally, we shouldn't do this, but this makes the logic of converting
            // async console events to sync ones much simpler.
            this.steps[0].setEndTime(event.startTime)
        }
    }
}
