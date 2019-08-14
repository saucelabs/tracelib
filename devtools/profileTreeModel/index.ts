import ProfileNode from './profileNode'

export default class ProfileTreeModel {
    public root: ProfileNode
    public maxDepth: number
    public total: number

    /**
     * @param {!SDK.ProfileNode} root
     * @protected
     */
    public initialize(root: ProfileNode): void {
        this.root = root
        this._assignDepthsAndParents()
        this.total = this._calculateTotals(this.root)
    }

    private _assignDepthsAndParents (): void {
        const root = this.root
        root.depth = -1
        root.parent = null
        this.maxDepth = 0

        const nodesToTraverse: ProfileNode[] = [root]
        while (nodesToTraverse.length) {
            const parent = nodesToTraverse.pop()
            const depth = parent.depth + 1
            if (depth > this.maxDepth) {
                this.maxDepth = depth
            }

            const children = parent.children
            const length = children.length
            for (let i = 0; i < length; ++i) {
                const child = children[i]
                child.depth = depth
                child.parent = parent
                if (child.children.length) {
                    nodesToTraverse.push(child)
                }
            }
        }
    }

    /**
     * @param {!SDK.ProfileNode} root
     * @return {number}
     */
    private _calculateTotals (root: ProfileNode): number {
        const nodesToTraverse: ProfileNode[] = [root]
        const dfsList: ProfileNode[] = []

        while (nodesToTraverse.length) {
            const node = nodesToTraverse.pop()
            node.total = node.self
            dfsList.push(node)
            nodesToTraverse.push(...node.children)
        }

        while (dfsList.length > 1) {
            const node = dfsList.pop()
            node.parent.total += node.total
        }

        return root.total
    }
}
