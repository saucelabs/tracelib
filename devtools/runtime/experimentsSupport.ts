export default class ExperimentsSupport {
    public isEnabled(experimentName: string): boolean {
        return !!experimentName
    }
}

