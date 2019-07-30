import TracingModel from './index'

export default class NamedObject {
    /**
     * @param {!TracingModel} model
     * @param {number} id
     */
    public constructor (model: TracingModel, id: number): void {
        this._model = model
        this._id = id
        this._name = ''
        this._sortIndex = 0
    }

    /**
     * @param {!Array.<!TracingModel.NamedObject>} array
     */
    private static _sort (array: NamedObject[]): NamedObject[] {
        /**
         * @param {!TracingModel.NamedObject} a
         * @param {!TracingModel.NamedObject} b
         */
        function comparator (a: NamedObject, b: NamedObject): boolean {
            return a._sortIndex !== b._sortIndex ? a._sortIndex - b._sortIndex : a.name().localeCompare(b.name())
        }
        return array.sort(comparator)
    }

    /**
     * @param {string} name
     */
    private _setName (name: string): void {
        this._name = name
    }

    /**
     * @return {string}
     */
    public name (): string {
        return this._name
    }

    /**
     * @param {number} sortIndex
     */
    private _setSortIndex (sortIndex: number): void {
        this._sortIndex = sortIndex
    }
}
