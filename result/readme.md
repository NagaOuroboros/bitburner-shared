# RESULT
This module allows for the safe handling of errors without propagating throwing exceptions, which can needlessly halt the script.  It accomplishes this by wrapping success values in an instance of a `Ok<T>` object, or returning error values in a `Err<E>` object.  The main type, `Result<T, E>`, is a union of these two possible types.  The underlying objects are instantiated from implementations of a shared interface which provides methods to chain operations and safely handle error states.  For those familiar with Rust or Functional Programming, it should feel familiar.


## IMPORTING
This module exports a namespace called `Result` and can be imported into any script with the following:
```ts
import { Result } from "./path/to/result.ts";
```
This is the recommended way to bring the functionality in, and will be assumed to be the case in all examples to follow.  However, optionally, the `Result<T>` type and the `ok()`, `err()`, `fromThrowable()`, and `fromThrowableAsync()` functions can be separately imported if you require only specific parts of the functionality:
```ts
import { type Result, ok, err, fromThrowable, fromThrowableAsync } from "./path/to/result.ts";
```

## USAGE - `fromThrowable()` and `fromThrowableAsync()`
The easiest way to start using this system is to wrap a function that could throw an error, such as `ns.nuke()` (as of version 2.8.1); an operation that always has some risk of throwing an error when done blindly.  To do this, simply make the call inside the `Result.fromThrowable` method:
```ts
const didNuke = Result.fromThrowable(() => ns.nuke("silver-helix"));
```
In this example, `didNuke` is of type `Result<boolean, Error>`, which could be a boolean (`Ok<boolean>`), or it could be an Error object (`Err<Error>`).  To handle these possibilities, we must **consume** the `Result`, using one of a few methods provided by the underlying objects.  The only difference between `Result.fromThrowable()` and `Result.fromThrowableAsync()` is that the latter must be awaited and is only meant for use with async functions that throw errors when they reject. In most cases, you will only need `Result.fromThrowable()` in Bitburner.

### Type Guards - `isOk()` and `isErr()`
The first method of consuming a `Result` is with its in-built type guard methods, `Result.isOk()` and `Result.isErr()`.  These allow TypeScript to use its type narrowing logic to identify when the `Result` is guaranteed to be either `Ok<T>` or `Err<E>`.
```ts
const target = "silver-helix";
const didNuke: Result<boolean, Error> = Result.fromThrowable(() => ns.nuke(target));
if (didNuke.isErr()) {
  ns.tprint(`Could not nuke ${target}.  Reason: ${didNuke.error.message}`);
  return;
}
if (didNuke.value) {
  ns.tprint("Nuke Succeeded");
} else {
  ns.tprint("Nuke Failed");
}
```
In the above example, by checking if the `Result<boolean, Error>` is an instance of `Err<Error>`, TypeScript can infer that, since we return early in that block, `didNuke` must be `Ok<boolean>` after the first `if` block, which exposes the `value` field to be read. `Ok.value` is only accessible when TypeScript knows for certain that the `Result` is definitively an instance of `Ok<T>`, and likewise `Err.error` is only available when TypeScript knows it's an `Err<E>`, like inside the first `if` block.  

### Unwrapping - `unwrap()` and `unwrapOr()`
The second method is to directly unwrap (or access) the underlying value using `Result.unwrap()` or `Result.unwrapOr()`. These both will return the underlying `value` in the case that it is an instance of `Ok<T>`.  How they differ is in what happens if the underlying type is `Err<E>`.  `Result.unwrap()` will throw an Error in this case, making it **_unsafe_** unless you can guarantee it's only called on an `Ok<T>` instance.  For this reason `Result.unwrapOr()` is the preferred way to directly unwrap an `Result<T, E>`. The way it works is that you must provide a fallback value to return, in the case the underlying object is an instance of `Err<E>`.
```ts
const target = "silver-helix";
const didNuke: boolean = Result.fromThrowable(() => ns.nuke(target)).unwrapOr(false);
if (didNuke) {
  ns.tprint("Nuke Succeeded");
} else {
  ns.tprint("Nuke Failed");
}
```
This will have the same results as in the type guard example, but we've simplified the logic by handling both the `Ok<boolean>` and `Err<Error>` possibilities at the same time; handy since we really only need to know if the NUKE succeeded or failed, not why.  If we were to have simply used `Result.unwrap()`, if `ns.nuke()` threw an Error, `Result.unwrap()` would have thrown its own error, instead of handling the one from `ns.nuke()`.  The only drawback to `Restult.unwrapOr()` is that we lose the special handling we had in our type guard example, but the next method gives us back the ability to define more complex logic.

### Matching - `match()`
The third method of consuming a `Result` is the `Result.match()` method.  This is the most fine-grained solution, as it allows you to define _exactly_ what happens in the case of an `Ok<T>` or `Err<E>` using two custom functions as parameters.  The first function defines what happens if the underlying object is an `Ok<T>`, and the second defines the same for an `Err<E>` instance.
```ts
const target = "silver-helix";
const didNuke: string = Result.fromThrowable(() => ns.nuke(target)).match(
  (ok) => { return ok ? "Success" : "Failure" },
  (err) => { return `Failed with reason: ${err.message}` }
)
ns.tprint(`NUKE status: ${didNuke}`);
```
While a bit contrived, here we can demonstrate how `Result.match()` works, and how it can run more complex logic when needed.  Of crucial note, both functions passed to `Result.match()` must return a value of the same type, so in this case, both need to return strings.

## USAGE - `ok()` and `err()`
`Result` is at its most powerful when used in a function or method of your own creation, allowing you to explicitly return your own Error types from a function without throwing them.  Let's build a simple example: a function that takes a value and, if that value is a string, calls `toUpperCase()` on it.  If it's not a string, it throws a TypeError.
```ts
function upperCase(value: unknown): string {
  if (typeof value !== "string") {
    throw new TypeError(`Expected value to be of type string, was ${typeof value}`);
  }
  return value.toUpperCase();
}
```
This is a perfectly usable fuction, however we don't want a simple validation check to throw an exception and halt the script unnecessarily.  `Result` lets us handle possible Errors without stopping the script.  Note that the underlying error value in the `Err<E>` type does not need to be an `Error` class or subclass and can be anything, from descriptive strings to numeric codes, if you so wish.  We're just using a `TypeError` as an example.
```ts
function upperCase(value: unknown): Result<string, TypeError> {
  if (typeof value !== "string") {
    return Result.err(new TypeError(`Expected value to be of type string, was ${typeof value}`));
  }
  return Result.ok(value.toUpperCase());
}
```
This version of our function returns the `Result<string, TypeError>` type, which ensures we can't try to use the new upper case string until we account for the possible `Err<TypeError>` type, either by using the type guards, unwrapping, or matching methods.  It should be noted that we should always specify the return type as `Result<string, TypeError>` (replace "string" and "TypeError" with the expected types) in order for TypeScript to ensure we handle the return cases properly, and to not end up with the more confusing inferred type `Ok<string> | Err<TypeError>`; which is technically correct, but less readable and clear.  Additionally, while it is possible to only return one or the other, generally `Result.ok()` and `Result.err()` should be used together in functions which have multiple return statements, at least one of which represents an error case.

## CHAINING - `map()`, `mapErr()`, `andThen()`, and `orElse()`
The second primary advantage of `Result` is that you don't need to immediately consume the `Result` to manipulate the underlying value.  `Result.map()`, `Result.mapErr()`, `Result.andThen()`, and `Result.orElse()` can be used without consuming the `Result`, and will do their job at runtime depending on which underlying instance (`Ok<T>` or `Err<E>`) they're called on.  This works because these methods only do work if they are called on the correct underlying object, and otherwise simply return the existing object, all while preserving the `Result` type.

### MAPPING - `map()` and `mapErr()`
Much like the array method, `Result.map()` and `Result.mapErr()` allow you to apply a function to the underlying value, and returns a new `Result` with the transformed value.  `Result.map()` operates on the `value` field of `Ok<T>`, and `Result.mapErr()` does the same for the `error` field of `Err<E>`.
```ts
// Let us assume this function returns a generated non-empty string or a generated number at random,
// so we cannot know which type "value" might be
declare function getRandomValue(): string | number;

const value = getRandomValue();
const arrayOfCapitalLetters: string[] = upperCase(value)
  .map(string => string.split(""))
  .unwrapOr([]);
```
In this example, we want to get an array of capital letters, but the value we're given could be a string or a number.  When this unknown value is passed into our `upperCase` function, two things could happen: it could be turned into an all-caps string wrapped in a `Ok<string>` type, or it could return a `TypeError` object wrapped in the `Err<TypeError>` type.  The `map()` method then acts like an implicit `if` statement: **if** the underlying value is `Ok<string>`, it will transform it into a `Ok<string[]>` by splitting the string into an array of its letters and wrapping it in a new `Ok` instance, and otherwise it will simply 'pass along' the underlying `Err<TypeError>` and do nothing.  This means we now have a type of `Result<string[], TypeError>`.  We choose unwrap it by using `Result.unwrapOr()` and use an empty array as the fallback, ensuring we get an array as out final value; either one full of capital letters, or an empty one in the case the value was a number.

### FLATMAPPING - `andThen()` and `orElse()`
The `Result.andThen()` method is analogous to the `Array.flatmap()` method. It allows the underlying value of a `Ok<T>` to be passed into a function that itself returns some type of `Result`.  Like `Result.map()`, if the underlying type is `Err<E>`, it simply passes that along, because there's nothing to do in that case.  Let's expand on our above example to demonstrate:
```ts
// Let's assume we have a function called "returnVowels", which takes a string and returns an array of only
// the individual vowels it contains. It returns that array as a "Ok<string[]>", and returns a "Err<null>" instance 
// if there were no vowels
declare function returnVowels(string: string): Result<string[], null>

const value: string | number = getRandomValue();
const arrayOfCapitalVowels: string[] = upperCase(value)
  .andThen(string => returnVowels(string))
  .unwrapOr([]);
```
The main difference between `Result.map()` and `Result.andThen()` is that the function passed to `Result.andThen()` must return a new `Result<T, E>`, while the function passed to `Result.map()` only changes the value within an existing `Ok<T>`.  In this example, `returnVowels()` is chained into the sequence with `Result.andThen()`, and just like with `Result.map()` only executes its logic if the underlying instance it gets from `upperCase()` is `Ok<string>`, otherwise, it propagates `Err<TypeError>` forward.  The difference is that if `returnVowels()` returns `Err<null>`, then that `Err<null>` gets propagated forward instead of the `Ok<string>` that came from `upperCase()`.

`Result.orElse()` is also a flatmap method, however it operates on the condition that if it is called on an `Ok<T>`, it will simply propagate that forward, **or else**, if the value is `Err<E>`, it will perform its logic on the underlying `Err.error` value and return a new `Result<T, E>` into the chain.
```ts
// Let's have a function that takes a number and converts it into its string representation
// It returns a string as an "Ok<string>", and returns a "Err<TypeError>" instance if the value was not a number
declare function stringifyNumber(value: unknown): Result<string, TypeError>;

const value: string | number = getRandomValue();
const arrayOfCharacters: string[] = upperCase(value)
  .orElse((_) => stringifyNumber(value))
  .map(string => string.split(""))
  .unwrapOr([]);
```
In this example, if `getRandomValue()` returns a number, and the `Result<string, TypeError>` from `upperCase()` is therefore a `Err<TypeError>`, `Result.orElse()` will inject the `Result<string, TypeError>` returned from `stringifyNumber()` into the chain.  Note that we are not actually operating on the value of `Err<TypeError>` here, but inserting a wholly new `Result`.  This is allowed because all `Result.orElse()` expects is a function that returns a `Result`.  While it will pass the value of `Err.error` into the function, the function is not required to use it.  Also note that in this case, the `Result.orElse()` must be called before the `Result.map()` step so that regardless of whether the original value was a string or number, it is a string by the time it is turned into an array of characters.

**Side Note**: In the above example, it would actually be completely safe to use the bare `Result.unwrap()` call at the end of the chain, since we have actually handled both the `string` and `number` cases, and guaranteed that a `string[]` will always be the end result.  It is always safer to use `Result.unwrapOr()` anyways to avoid accidentally missing an edge case where the `Result` could still be `Err<E>`, but sometimes you may decide that such an edge case _should_ throw an Error, and that is where `Result.unwrap()` may be used.