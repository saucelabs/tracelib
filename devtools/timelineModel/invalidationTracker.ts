import Event from '../tracingModel/event'
import InvalidationTrackingEvent from './invalidationTrackingEvent'
import { InvalidationMap, RecordType } from '../types'

export default class InvalidationTracker {
    public static readonly invalidationTrackingEventsSymbol: unique symbol = Symbol('invalidationTrackingEvents')
    private _lastRecalcStyle: Event
    private _lastPaintWithLayer: Event
    private _didPaint: boolean
    private _invalidations: Record<number, InvalidationTrackingEvent[]>
    private _invalidationsByNodeId: Record<number, InvalidationMap[]>

    public constructor () {
        this._lastRecalcStyle = null
        this._lastPaintWithLayer = null
        this._didPaint = false
        this._initializePerFrameState()
    }

    /**
     * @param {!SDK.TracingModel.Event} event
     * @return {?Array<!TimelineModel.InvalidationTrackingEvent>}
     */
    public static invalidationEventsFor (
        event: Event
    ): InvalidationTrackingEvent[] | null {
        return event[InvalidationTracker.invalidationTrackingEventsSymbol] || null
    }

    /**
     * @param {!TimelineModel.InvalidationTrackingEvent} invalidation
     */
    public addInvalidation (invalidation: InvalidationTrackingEvent): void {
        this._startNewFrameIfNeeded()

        if (!invalidation.nodeId) {
            console.error('Invalidation lacks node information.')
            console.error(invalidation)
            return
        }

        // Suppress StyleInvalidator StyleRecalcInvalidationTracking invalidations because they
        // will be handled by StyleInvalidatorInvalidationTracking.
        // FIXME: Investigate if we can remove StyleInvalidator invalidations entirely.
        if (
            invalidation.type === RecordType.StyleRecalcInvalidationTracking &&
            invalidation.cause.reason === 'StyleInvalidator'
        ) {
            return
        }

        // Style invalidation events can occur before and during recalc style. didRecalcStyle
        // handles style invalidations that occur before the recalc style event but we need to
        // handle style recalc invalidations during recalc style here.
        const styleRecalcInvalidation = (
            invalidation.type === RecordType.ScheduleStyleInvalidationTracking ||
            invalidation.type === RecordType.StyleInvalidatorInvalidationTracking ||
            invalidation.type === RecordType.StyleRecalcInvalidationTracking
        )

        if (styleRecalcInvalidation) {
            const duringRecalcStyle = (
                invalidation.startTime &&
                this._lastRecalcStyle &&
                invalidation.startTime >= this._lastRecalcStyle.startTime &&
                invalidation.startTime <= this._lastRecalcStyle.endTime
            )

            if (duringRecalcStyle) {
                this._associateWithLastRecalcStyleEvent(invalidation)
            }
        }

        /**
         * Record the invalidation so later events can look it up.
         */
        // TODO(Christian) fix typings
        if (this._invalidations[invalidation.type as any]) {
            // TODO(Christian) fix typings
            this._invalidations[invalidation.type as any].push(invalidation)
        } else {
            // TODO(Christian) fix typings
            this._invalidations[invalidation.type as any] = [invalidation]
        }

        if (invalidation.nodeId) {
            if (this._invalidationsByNodeId[invalidation.nodeId]) {
                // TODO(Christian) fix typings
                this._invalidationsByNodeId[invalidation.nodeId].push(invalidation as any)
            } else {
                // TODO(Christian) fix typings
                this._invalidationsByNodeId[invalidation.nodeId] = [invalidation as any]
            }
        }
    }

    /**
    * @param {!SDK.TracingModel.Event} recalcStyleEvent
    */
    public didRecalcStyle (recalcStyleEvent: Event): void {
        this._lastRecalcStyle = recalcStyleEvent
        const types = [
            RecordType.ScheduleStyleInvalidationTracking,
            RecordType.StyleInvalidatorInvalidationTracking,
            RecordType.StyleRecalcInvalidationTracking
        ]
        for (const invalidation of this._invalidationsOfTypes(types)) {
            this._associateWithLastRecalcStyleEvent(invalidation)
        }
    }

    /**
    * @param {!TimelineModel.InvalidationTrackingEvent} invalidation
    */
    private _associateWithLastRecalcStyleEvent (invalidation: InvalidationTrackingEvent): void {
        if (invalidation.linkedRecalcStyleEvent) {
            return
        }

        const recalcStyleFrameId = this._lastRecalcStyle.args.beginData.frame

        if (invalidation.type === RecordType.StyleInvalidatorInvalidationTracking) {
            /**
             * Instead of calling _addInvalidationToEvent directly, we create synthetic
             * StyleRecalcInvalidationTracking events which will be added in _addInvalidationToEvent.
             */
            this._addSyntheticStyleRecalcInvalidations(this._lastRecalcStyle, recalcStyleFrameId, invalidation)
        } else if (invalidation.type === RecordType.ScheduleStyleInvalidationTracking) {
            /**
             * ScheduleStyleInvalidationTracking events are only used for adding information to
             * StyleInvalidatorInvalidationTracking events. See: _addSyntheticStyleRecalcInvalidations.
             */
        } else {
            this._addInvalidationToEvent(this._lastRecalcStyle, recalcStyleFrameId, invalidation)
        }

        invalidation.linkedRecalcStyleEvent = true
    }

    /**
    * @param {!SDK.TracingModel.Event} event
    * @param {number} frameId
    * @param {!TimelineModel.InvalidationTrackingEvent} styleInvalidatorInvalidation
    */
    // TODO(Christian) fix typings
    private _addSyntheticStyleRecalcInvalidations (event: Event, frameId: string, styleInvalidatorInvalidation: InvalidationTrackingEvent): void {
        if (!styleInvalidatorInvalidation.invalidationList) {
            this._addSyntheticStyleRecalcInvalidation(
                styleInvalidatorInvalidation.tracingEvent,
                styleInvalidatorInvalidation
            )
            return
        }

        if (!styleInvalidatorInvalidation.nodeId) {
            console.error('Invalidation lacks node information.')
            console.error(styleInvalidatorInvalidation)
            return
        }

        for (let i = 0; i < styleInvalidatorInvalidation.invalidationList.length; i++) {
            const setId = styleInvalidatorInvalidation.invalidationList[i]['id']
            let lastScheduleStyleRecalculation
            const emptyList: InvalidationMap[] = []
            const nodeInvalidations = this._invalidationsByNodeId[styleInvalidatorInvalidation.nodeId] || emptyList
            for (let j = 0; j < nodeInvalidations.length; j++) {
                const invalidation = nodeInvalidations[j]
                if (
                    invalidation.frame !== frameId || invalidation.invalidationSet !== setId ||
                    invalidation.type !== RecordType.ScheduleStyleInvalidationTracking
                ) {
                    continue
                }
                lastScheduleStyleRecalculation = invalidation
            }

            if (!lastScheduleStyleRecalculation) {
                console.error('Failed to lookup the event that scheduled a style invalidator invalidation.')
                continue
            }

            this._addSyntheticStyleRecalcInvalidation(
                lastScheduleStyleRecalculation.tracingEvent as any,
                styleInvalidatorInvalidation
            )
        }
    }

    /**
    * @param {!SDK.TracingModel.Event} baseEvent
    * @param {!TimelineModel.InvalidationTrackingEvent} styleInvalidatorInvalidation
    */
    private _addSyntheticStyleRecalcInvalidation (baseEvent: Event, styleInvalidatorInvalidation: InvalidationTrackingEvent): void {
        const invalidation = new InvalidationTrackingEvent(baseEvent)
        invalidation.type = RecordType.StyleRecalcInvalidationTracking
        if (styleInvalidatorInvalidation.cause.reason) {
            invalidation.cause.reason = styleInvalidatorInvalidation.cause.reason
        }

        if (styleInvalidatorInvalidation.selectorPart) {
            invalidation.selectorPart = styleInvalidatorInvalidation.selectorPart
        }

        this.addInvalidation(invalidation)
        if (!invalidation.linkedRecalcStyleEvent) {
            this._associateWithLastRecalcStyleEvent(invalidation)
        }
    }

    /**
    * @param {!SDK.TracingModel.Event} layoutEvent
    */
    public didLayout (layoutEvent: Event): void {
        if (!layoutEvent.args.beginData) {
            return
        }
        const layoutFrameId = layoutEvent.args.beginData.frame
        for (const invalidation of this._invalidationsOfTypes([RecordType.LayoutInvalidationTracking])) {
            if (invalidation.linkedLayoutEvent) {
                continue
            }
            this._addInvalidationToEvent(layoutEvent, layoutFrameId, invalidation)
            invalidation.linkedLayoutEvent = true
        }
    }

    /**
     * @param {!SDK.TracingModel.Event} paintEvent
     */
    public didPaint (): void {
        this._didPaint = true
    }

    /**
     * @param {!SDK.TracingModel.Event} event
     * @param {number} eventFrameId
     * @param {!TimelineModel.InvalidationTrackingEvent} invalidation
     */
    private _addInvalidationToEvent (event: Event, eventFrameId: number | string, invalidation: InvalidationTrackingEvent): void {
        if (eventFrameId !== invalidation.frame) {
            return
        }

        if (!event[InvalidationTracker.invalidationTrackingEventsSymbol]) {
            event[InvalidationTracker.invalidationTrackingEventsSymbol] = [invalidation]
            return
        }

        event[InvalidationTracker.invalidationTrackingEventsSymbol].push(invalidation)
    }

    /**
     * @param {!Array.<string>=} types
     * @return {!Iterator.<!TimelineModel.InvalidationTrackingEvent>}
     */
    private _invalidationsOfTypes (types: string[]): IterableIterator<InvalidationTrackingEvent> {
        const invalidations = this._invalidations
        if (!types) {
            types = Object.keys(invalidations)
        }

        // eslint-disable-next-line
        function* generator () {
            for (let i = 0; i < types.length; ++i) {
                // TODO(Christian) fix typings
                const invalidationList = invalidations[(types as any)[i]] || []
                for (let j = 0; j < invalidationList.length; ++j) {
                    yield invalidationList[j]
                }
            }
        }

        return generator()
    }

    private _startNewFrameIfNeeded (): void {
        if (!this._didPaint) {
            return
        }

        this._initializePerFrameState()
    }

    private _initializePerFrameState (): void {
        /** @type {!Object.<string, !Array.<!TimelineModel.InvalidationTrackingEvent>>} */
        this._invalidations = {}
        /** @type {!Object.<number, !Array.<!TimelineModel.InvalidationTrackingEvent>>} */
        this._invalidationsByNodeId = {}

        this._lastRecalcStyle = null
        this._lastPaintWithLayer = null
        this._didPaint = false
    }
}
