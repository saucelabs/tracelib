class ExperimentsSupport {
  public isEnabled(experimentName: string): boolean {
    return !!experimentName;
  }
}

export default class Runtime {
  public static experiments: ExperimentsSupport = new ExperimentsSupport()

  constructor() {}
}
