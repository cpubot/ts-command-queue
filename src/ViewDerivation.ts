abstract class ViewDerivation<I, O> {
  private currentState: O;
  private resolve: () => void;
  private reject: (reason?: any) => void;
  private subscriptions: Set<(result: O) => void> = new Set();
  private derivations: Set<ViewDerivation<O, any>> = new Set();
  private isInitialized: Promise<void> = new Promise((resolve, reject) => {
    this.resolve = resolve;
    this.reject = reject;
  });

  protected abstract getInitialState(): Promise<O> | O;
  protected abstract getNextState(
    parentState: I,
    currentState: O
  ): Promise<O> | O;

  async parentDidChange(nextParentState: I) {
    // Wait for initialization to be completed before processing next parentState
    await this.isInitialized;

    const nextResult = this.getNextState(nextParentState, this.currentState);
    const ourNextState =
      nextResult instanceof Promise ? await nextResult : nextResult;

    if (this.currentState !== ourNextState) {
      this.currentState = ourNextState;
      this.fireCallbacks(ourNextState);
      this.updateDerivations(ourNextState);
    }
  }

  async initialize(parentState: I) {
    try {
      const initialResult = this.getInitialState();
      const nextResult = this.getNextState(
        parentState,
        initialResult instanceof Promise ? await initialResult : initialResult
      );

      this.currentState =
        nextResult instanceof Promise ? await nextResult : nextResult;

      this.resolve();
    } catch (e) {
      this.reject(e);
    }
  }

  /**
   * Subscribe to changes to the view data. Return a function
   * which unregisters the given callback.
   *
   * @param callback
   */
  subscribe(callback: (result: O) => void): () => void {
    this.subscriptions.add(callback);

    this.isInitialized.then(() => {
      callback(this.currentState);
    });

    return this.unsubscribe.bind(this, callback);
  }

  /**
   * Unregister callback from view updates
   *
   * @param callback
   */
  unsubscribe(callback: (result: O) => void): void {
    this.subscriptions.delete(callback);
  }

  /**
   * Call all registered callbacks with given state.
   *
   * @param currentState most up to date version of data structure
   */
  private fireCallbacks(currentState: O) {
    this.subscriptions.forEach(callback => callback(currentState));
  }

  registerDerivation(derivation: ViewDerivation<O, any>): () => void {
    this.derivations.add(derivation);

    this.isInitialized.then(() => {
      derivation.initialize(this.currentState);
    });

    return this.deregisterDerivation.bind(this, derivation);
  }

  deregisterDerivation(view: ViewDerivation<O, any>) {
    this.derivations.delete(view);
  }

  updateDerivations(nextState: O) {
    this.derivations.forEach(derivation =>
      derivation.parentDidChange(nextState)
    );
  }
}

export default ViewDerivation;
