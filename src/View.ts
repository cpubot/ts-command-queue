/**
 * Views exist to reduce an entire log of commands into an
 * optimized or specialized data structure for a specific use-case.
 * Views can be thought of as a manifestation of a command log.
 *
 * Views are attached to a `CommandQueue`, and upon initialization,
 * process the entire log of commands housed by the `CommandQueue`,
 * bringing the view up to its most recent manifestation of the
 * command log.
 *
 * Views accept two generic parameters. The first, `T`, is the
 * command shape as described by the associated `CommandQueue`.
 * The second, `O`, should describe the data structure output by
 * the View.
 */
abstract class View<T, O> {
  /**
   * A function which should return the initial version of the data
   * structure returned by this View.
   * Can be async.
   */
  protected abstract getInitialState(): Promise<O> | O;
  /**
   * A function which describes how the data structure (`O`)
   * changes over time. This function will be called every time a
   * command is pushed onto the `CommandQueue`. It receives the
   * current state and the incoming command as parameters.
   *
   * This function should **UNDER NO CIRCUMSTANCE** mutate the
   * data structure (`currentState`—`O`). This class _relies_ on
   * `getNextState` (this function) treating the `currentState`
   * parameter as immutable. If the data _has_ indeed changed, a
   * clone of the original state should be returned.
   *
   * Can be async.
   *
   * @param currentState most up to date version of the data structure
   * @param command the next command in the log
   */
  protected abstract getNextState(currentState: O, command: T): Promise<O> | O;

  private currentState: O;
  private subscriptions: Set<(result: O) => void> = new Set();
  // Promise used to indicate completion of the `initialize` method
  private isInitialized: Promise<boolean>;

  /**
   * Call all registered callbacks with given state.
   *
   * @param currentState most up to date version of data structure
   */
  private fireCallbacks(currentState: O) {
    this.subscriptions.forEach(callback => callback(currentState));
  }

  /**
   * Given a log of all commands ever dispatched, bring this view
   * up to its more current state.
   *
   * @param queue log of all commands ever dispatched
   */
  async initialize(queue: T[]): Promise<void> {
    this.isInitialized = new Promise(async resolve => {
      // Retrieve initial version of the data structure
      let state = await this.getInitialState();

      // call `getNextState`, in order, on every command to
      // ascertain the most up to date version of the data
      // structure
      queue.forEach(async command => {
        // `getNextState` may be async -- ensure calls
        // are executed in order
        state = await this.getNextState(state, command);
      });

      this.currentState = state;

      resolve();
    });
  }

  /**
   * Public method for pushing a command onto the View.
   *
   * @param command command to be pushed onto the View
   */
  async push(command: T): Promise<void> {
    // Wait for initialization to be completed before processing
    // command
    await this.isInitialized;

    // Given command, return next version of this data structure
    const nextState = await this.getNextState(this.currentState, command);

    // Fire callbacks **ONLY** if the state has changed. Note the
    // strict equality check. If this View manages a non-primitive
    // data-type (e.g. object, array, etc), its `getNextState` method
    // should ensure that it mutates its state immutably.
    if (nextState !== this.currentState) {
      this.currentState = nextState;
      this.fireCallbacks(nextState);
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
    callback(this.currentState);

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
}

export default View;
