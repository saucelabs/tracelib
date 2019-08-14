import Event from './event'

export default class ProfileEventsGroup {
    public children: Event[]

    /**
     * @param {!TracingModel.Event} event
     */
    public constructor (event: Event) {
        /** @type {!Array<!TracingModel.Event>} */
        this.children = [event]
    }

    /**
     * @param {!TracingModel.Event} event
     */
    public addChild (event: Event): void {
        this.children.push(event)
    }
}
