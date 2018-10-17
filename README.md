# Typescript Command Queue

## A Typescript CQRS + Event Sourcing implementation

This library exposes two classes which facilitate the [Command Query Responsibility Segregation (CQRS) pattern](https://martinfowler.com/bliki/CQRS.html) with an [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html) persistence model as a means to optimize the relationship between the generation of actionable UI interaction data and its consumption.

# Philosophy

In modern UI development, it is generally considered a good practice to implement a UI and its interactions as a representation of some underlying data model. In other words, it is generally encouraged that UI be a _pure function_ of data, meaning, all manipulations of UI should be captured in some model, and given the model with the same data, the same UI should always be produced. Made widely popular by the React and Redux UI libraries, this idea is a core tenet of the [unidirectional data flow](https://redux.js.org/basics/dataflow). UI changes should be modeled as state changes and the UI should reconcile and manifest these differences in state through changes to the UI.

As part of this paradigm, it is generally preferred to store the least amount of data as possible in application state. Derivations of state, for example, should be lazily computed and _never_ themselves stored as state. Difficulties arise, in this paradigm, when the state being used to represent UI functions needs to be shared across multiple functions, and multiple complex (and perhaps computationally expensive) derivations of that state need to be shared across a subset of those functions. Further, often user interaction intents are not optimally modeled as a consumable piece of application state, but rather are optimally modeled as a _description_ of what transpired. When modeling user interface interaction intents as abstract descriptions rather than application state, the program becomes decoupled from having to reason about the shape of end application state, and can simply describe the action that took place in a way that is not influenced by some underlying data model. This ends up greatly simplifying the amount of logic that needs to be programmed into the user interface components, especially when dealing with complex state models.

# The components / terminology

## `Command`

A command is an object which describes the user action. This library does not ship with a `Command` class or object, but rather, the _term_ is used to describe the `type` of intents stored by a specific `CommandQueue` instance.

## `CommandQueue`

`CommandQueue` is a durable (in-memory) storage facility containing the entire list of commands ever dispatched.

In Typescript, a `CommandQueue` instance accepts a generic parameter which should define the shape of the commands it may contain. All commands added to the queue should match this type. As most `CommandQueue`s will contain multiple types of commands, it is recommended that the shape of the commands be described as a [union type](http://www.typescriptlang.org/docs/handbook/advanced-types.html).

For example:

```typescript
type Command =
  | {
      type: 'remove';
      id: string;
    }
  | {
      type: 'add';
      id: string;
    };
```

And to associate the command type with a `CommandQueue` instance:

```typescript
type Command =
  | {
      type: 'remove';
      id: string;
    }
  | {
      type: 'add';
      id: string;
    };

const commandQueue = new CommandQueue<Command>();
```

### Methods

**`.push`**: Push a command onto the queue. The command will subsequently be pushed to any registered `View`s.

```typescript
push(command: T | T[]): void;
```

Single command:

```javascript
commandQueue.push({
  type: 'add',
  id: '1',
});
```

Array of commands:

```javascript
commandQueue.push([
  {
    type: 'add',
    id: '1',
  },
  {
    type: 'add',
    id: '2',
  },
]);
```

**`registerView`**: Attach a `View` instance to the `CommandQueue` (`View` covered later). Returns a function which, when called, unregisters the given `View` from the `CommandQueue`.

```typescript
registerView<O>(view: View<T, O>): () => void;
```

```javascript
const myView = new MyView();
const unregister = commandQueue.registerView(myView);

// ... later on, when finished with view
unregister();
```

## `View`

Views exist to reduce an entire log of commands into an optimized or specialized data structure for a specific use-case. Views can be thought of as a manifestation of a command log. See [materialized view](https://en.wikipedia.org/wiki/Materialized_view).

`View`s are attached to a `CommandQueue`, and upon initialization, process the entire log of commands housed by the `CommandQueue`, bringing the view up to its most recent manifestation of the command log.

In Typescript, `View`s accept two generic parameters. The first, `T`, is the command shape as described by the associated `CommandQueue`. The second, `O`, should describe the data structure output by the View.

```typescript
abstract class View<T, O> {}
```

The `View` class exposed by this library is an abstract class, and should be extended to define the logic for your particular use-case.

### Abstract methods (you must implement these)

**`getInitialState`**: A function which should return the initial version of the data structure returned by a particular `View` instance. Can be async / return a `Promise`.

```typescript
protected abstract getInitialState(): Promise<O> | O;
```

**`getNextState`**: A function which describes how the data structure (`O`) changes over time. This function will be called every time a command is pushed onto the `CommandQueue`. It receives the current state and the incoming command as parameters.

This function should **UNDER NO CIRCUMSTANCE** mutate the data structure (`currentState`—`O`). This class _relies_ on `getNextState` (this function) treating the `currentState` parameter as immutable. If the data _has_ indeed changed, a clone of the original state should be returned (nevermind for primitive data-types, of course).

Can be async / return a `Promise`.

```typescript
protected abstract getNextState(currentState: O, command: T): Promise<O> | O;
```

Given the previously described `Command` example type, here is an example of a `View` implementation which maintains a set of selected `id`s. Note that the data structure is treated immutably when updating values within `getNextState`. This is key to ensuring the `View` calls registered listeners when data has changed.

```typescript
type Command =
  | {
      type: 'remove';
      id: string;
    }
  | {
      type: 'add';
      id: string;
    };

type ViewResult = Set<string>;

class SetView extends View<Command, ViewResult> {
  getInitialState() {
    return new Set();
  }

  getNextState(set: ViewResult, command: Command) {
    switch (command.type) {
      case 'add':
        if (!set.has(command.id)) {
          set.add(command.id);
          set = new Set(set);
        }
        break;
      case 'remove':
        if (set.has(command.id)) {
          set.delete(command.id);
          set = new Set(set);
        }
        break;
    }

    return set;
  }
}
```

### Methods

**`subscribe`**: Subscribe to changes to the `View` data. Returns a function which unregisters the given callback.

```typescript
subscribe(callback: (result: O) => void): () => void {
```

**`unsubscribe`**: Unregister the given callback from receiving `View` updates

```typescript
unsubscribe(callback: (result: O) => void): void {
```

# Putting it all together

The following example composes all the components outlined here.

Given the following definitions:

```typescript
type Command =
  | {
      type: 'remove';
      id: string;
    }
  | {
      type: 'add';
      id: string;
    };

type ViewResult = Set<string>;

class SetView extends View<Command, ViewResult> {
  getInitialState() {
    return new Set();
  }

  getNextState(set: ViewResult, command: Command) {
    switch (command.type) {
      case 'add':
        if (!set.has(command.id)) {
          set.add(command.id);
          set = new Set(set);
        }
        break;
      case 'remove':
        if (set.has(command.id)) {
          set.delete(command.id);
          set = new Set(set);
        }
        break;
    }

    return set;
  }
}
```

Example usage:

```typescript
// Track the value over time for sake of example
let valueTracker;

// Instantiate our View
const view = new SetView();
view.subscribe(set => {
  valueTracker = set;
});

// Instantiate our CommandQueue
const commandQueue = new CommandQueue<Command>();
// Bind the View to the CommandQueue
commandQueue.registerView(view);

// Push some commands onto the queue
commandQueue.push({
  id: '1',
  type: 'add',
});
commandQueue.push({
  id: '2',
  type: 'add',
});
commandQueue.push({
  id: '1',
  type: 'remove',
});
```

After all the commands have been executed, the value of `valueTracker` (and the current state of our `View`) should be the following:

```javascript
Set([2]);
```

# In summary

This pattern / library can be very useful for describing complicated and sophisticated UI interactions, but should be used very thoughtfully, as it does introduce additional moving parts and complexity and is definitely not necessary for every problem domain.

You should use this library if:

- A UI requires / would benefit from complicated state derivation
  - Bespoke / optimized data-structures for individual UI components become very easy to spin up
    - This can be a really easy way to remove complexity from your rendering / display logic and drastically improve performance
- A UI would benefit from decoupling its state mutation logic from the actual shape of the state
  - Completely remove the need for UI components to have to reason about application state
  - Allow UI components and their data-structures to be developed in isolation while still staying in sync with other components
