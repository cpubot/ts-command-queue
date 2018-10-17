#### Allow pushing an array of commands

- This is useful / an optimization for situations in which a large number of commands is known up front.
  - If an array of commands _is_ passed, the processor can group the `getNextState` calls together and ensure at most one change event will be emitted.
