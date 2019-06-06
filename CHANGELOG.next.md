Don't await values that aren't Promises

For whatever reason, this causes weird out-of-sync iteration for
getNextState functions that don't return Promises. I'm guessing
it's some kind of transpilation issue on babel's side within the
client bundling process because this shouldn't be a problem in 
theory. Even wrapping non-promise values in Promises causes
trouble. This is ugly, but it works, and should provide some
nominal performance boost at least.
