

### vNEXT
Allow registering derivations of derivations

### vNEXT
Export ViewDerivation

### vNEXT
Add ViewDerivation

### vNEXT
- Use `for..of` for iterating over async calls
  - Using async `forEach` doesn't allow you to return yieled values within the loop body
- Use ES2017 target for compilation. We should allow bundlers to perform their own transpilation

### vNEXT
#### Allow pushing an array of commands

- This is useful / an optimization for situations in which a large number of commands is known up front.
  - If an array of commands _is_ passed, the processor can group the `getNextState` calls together and ensure at most one change event will be emitted.

### vNEXT
Fix a race condition in which view `subscribe` callbacks were called with `undefined` instead of the default state

Fix build path

