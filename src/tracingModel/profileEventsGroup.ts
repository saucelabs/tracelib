import Event from './event'

export default class ProfileEventsGroup {
    /**
     * @param {!TracingModel.Event} event
     */
    public constructor (event: Event): void {
        /** @type {!Array<!TracingModel.Event>} */
        this.children = [event]
    }

    /**
     * @param {!TracingModel.Event} event
     */
    private _addChild (event: Event): void {
        this.children.push(event)
    }
}
