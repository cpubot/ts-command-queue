abstract class ViewDerivation<I, O> {
  private currentState: O;
  private resolve: () => void;
  private reject: (reason?: any) => void;
  private subscriptions: Set<(result: O) => void> = new Set();
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
    const ourNextState = await this.getNextState(
      nextParentState,
      this.currentState
    );
    if (this.currentState !== ourNextState) {
      this.currentState = ourNextState;
      this.fireCallbacks(ourNextState);
    }
  }

  async initialize(parentState: I) {
    try {
      this.currentState = await this.getNextState(
        parentState,
        await this.getInitialState()
      );

      this.resolve();
    } catch {
      this.reject();
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
}

export default ViewDerivation;
