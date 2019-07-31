import CallFrame from '../debuggerModel/callFrame'

export default class ProfileNode {
    public callFrame: CallFrame
    public callUID: string
    public self: number
    public total: number
    public id: number
    public parent?: ProfileNode
    public children: ProfileNode[]

    /**
     * @param {!Protocol.Runtime.CallFrame} callFrame
     */
    public constructor (callFrame: CallFrame) {
        this.callFrame = callFrame
        this.callUID = `${callFrame.functionName}@${callFrame.scriptId}:${callFrame.lineNumber}:${callFrame.columnNumber}`
        this.self = 0
        this.total = 0
        this.id = 0
        this.parent = null
        this.children = []
    }

    /**
     * @return {string}
     */
    public get functionName (): string {
        return this.callFrame.functionName
    }

    /**
     * @return {string}
     */
    public get scriptId (): string {
        return this.callFrame.scriptId
    }

    /**
     * @return {string}
     */
    public get url (): string {
        return this.callFrame.url
    }

    /**
     * @return {number}
     */
    public get lineNumber (): number {
        return this.callFrame.lineNumber
    }

    /**
     * @return {number}
     */
    public get columnNumber (): number {
        return this.callFrame.columnNumber
    }
}
