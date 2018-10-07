import View from './View';

/**
 * CommandQueue is a durable storage facility containing the entire
 * list of commands ever dispatched.
 *
 * CommandQueue accepts a generic parameter which should define the
 * shape of the commands it may contain.
 */
class CommandQueue<T> {
  // Command queue
  private queue: T[] = [];
  // Set of registered views
  private views: Set<View<T, unknown>> = new Set();

  /**
   * Push a command onto the queue
   *
   * @param command command to push onto queue
   */
  push(command: T) {
    this.queue.push(command);
    this.pushToViews(command);
  }

  /**
   * Attach a view to the dataset.
   *
   * @param view view to be attached
   */
  registerView<O>(view: View<T, O>): () => void {
    this.views.add(view);

    // Initialize view with a shallow copy of the queue.
    // If a reference to the queue passed, it's possible additional
    // items may be pushed onto the view while it is initializing
    // (in the event of an asynchronous initialization, for example)
    // which causes wonky / undesirable behavior (like subsequent
    // push events being ignored)
    view.initialize([...this.queue]);

    // Return a function which will unregister the given view
    return this.unregisterView.bind(this, view);
  }

  /**
   * Detach a view from the dataset
   *
   * @param view view to be detached
   */
  unregisterView<O>(view: View<T, O>) {
    this.views.delete(view);
  }

  /**
   * Propagate command to all registered views
   *
   * @param command command to be pushed onto views
   */
  private pushToViews(command: T) {
    this.views.forEach(view => {
      view.push(command);
    });
  }
}

export default CommandQueue;
