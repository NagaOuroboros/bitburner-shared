# OPTION
This module allows for the safe handling of nulls and nullish values without propagating `null` or `undefined`, which can cause unexpected errors.  It accomplishes this by wrapping values in an instance of a `Some<T>` object, or returning a `None` object.  The main type, `Option<T>`, is a union of these two possible types.  The underlying objects are instantiated from implementations of a shared interface which provides methods to chain operations and safely resolve the possible nullish value.  For those familiar with Rust or Functional Programming, it should feel familiar.


## IMPORTING
This module exports a namespace called `Option` and can be imported into any script with the following:
```ts
import { Option } from "./path/to/option.ts";
```
This is the recommended way to bring the functionality in, and will be assumed to be the case in all examples to follow.  However, optionally, the `Option<T>` type and the `some()`, `none()`, and `fromNullable()` functions can be separately imported if you require only specific parts of the functionality:
```ts
import { type Option, some, none, fromNullable } from "./path/to/option.ts";
```

## USAGE - `fromNullable()`
The easiest way to start using this system is to wrap a value that could be `undefined`, such as accessing an array index; an operation that always has some risk of returning `undefined`.  To do this, simply access the index inside the `Result.fromNullable` method:
```ts
const array: number[] = [2, 4, 6, 8];
const index: 1;
const maybeNumber = Result.fromNullable(array[index]);
```
In this example, `maybeNumber` is of type `Option<number>`, which <u>may be</u> a number (`Some<number>`), or it could be nothing (`None`).  To resolve this possibility, we must **consume** the `Option`, using one of a few methods provided by the underlying objects.

### Type Guards - `isSome()` and `isNone()`
The first method of consuming an `Option` is with its in-built type guard methods, `Option.isSome()` and `Option.isNone()`.  These allow TypeScript to use its type narrowing logic to identify when the `Option` is guaranteed to be either `Some<T>` or `None`.
```ts
const array: number[] = [2, 4, 6, 8, 10];
const index = 1;

function checkIndex<T>(index: number, array: T[]): string {
  const maybeNumber: Option<T> = Result.fromNullable(array[index]);
  if (maybeNumber.isNone()) {
    return `Index ${index} is undefined`;
  }
  return `Index ${index} is ${maybeNumber.value}`;
}

const output = checkIndex(index, array);
ns.tprint(output);
```
In the above example, by checking if the `Option<number>` is an instance of `None`, TypeScript can infer that, since the function returns early if the value is `None`, `maybeNumber` must be `Some<number>` after the `if` block, which exposes the `value` field to be read (`Some.value` is only accessible when TypeScript knows for certain that the `Option` is definitively an instance of `Some<T>`).  If we were to run this script, the terminal would print `Index 1 is 4`.  However, if we were to check index 5, which would be accessing an index that does not yet have a value, the terminal would print `Index 5 is undefined`.

### Unwrapping - `unwrap()` and `unwrapOr()`
The second method is to directly unwrap (or access) the underlying value using `Option.unwrap()` or `Option.unwrapOr()`. These both will return the underlying `value` in the case that it is an instance of `Some<T>`.  How they differ is in what happens if the underlying type is `None`.  `Option.unwrap()` will throw an Error in this case, making it **_unsafe_** unless you can guarantee it's only called on a `Some<T>` instance.  For this reason `Option.unwrapOr()` is the preferred way to directly unwrap an `Option<T>`. The way it works is that you can provide a fallback value to return, in the case the underlying object is an instance of `None`.
```ts
const array: number[] = [2, 4, 6, 8, 10];
const index = 1;

function checkIndex<T>(index: number, array: T[]): string {
  const maybeNumber: Option<T> = Result.fromNullable(array[index]);
  const value = maybeNumber.unwrapOr("undefined");
  return `Index ${index} is ${value}`;
}

const output = checkIndex(index, array);
ns.tprint(output);
```
This will have the same results as in the type guard example, but we've simplified the logic by handling both the `Some<number>` and `None` possibilities at the same time.  If we were to have simply used `Option.unwrap()`, accessing index 5 would have thrown an Error, because we tried to call `unwrap` on an instance of `None`, which has no underlying value to unwrap.

### Matching - `match()`
The third method of consuming an Option is the `Option.match()` method.  This is the most fine-grained solution, as it allows you to define _exactly_ what happens in the case of a `Some<T>` or `None` using two custom functions as parameters.  The first function defines what happens if the underlying object is a `Some<T>`, and the second defines the same for a `None` instance.
```ts
const array: number[] = [2, 4, 6, 8, 10];
const index = 1;

function checkIndex<T>(index: number, array: T[]): string {
  const maybeNumber: Option<T> = Result.fromNullable(array[index]);
  const value = maybeNumber.match(
    (num) => {
      const string = JSON.stringify(num);
      return string;
    },
    () => {
      return "undefined";
    }
  );
  return value;
}

const output = checkIndex(index, array);
ns.tprint(`Index ${index} is ${output}`);
```
While a bit contrived, here we can demonstrate how `Option.match()` works, and how it can run more complex logic when needed.  Of crucial note, both functions passed to `Option.match()` must return a value of the same type, so in this case, both need to return strings.

## - USAGE - `some()` and `none()`
`Option` is at its most powerful when used in a function or method of your own creation, allowing you to explicitly return 'nothing' from a function without using `null` or `undefined`.  Let's build a simple example: a function that takes a value and, if that value is a string, calls `toUpperCase()` on it.  If it's not a string, it returns `null`.
```ts
function upperCase(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  return value.toUpperCase();
}
```
This is a perfectly usable fuction, however that `string | null` return type could come back to bite us if that `null` gets passed around in places where it's not expected.  `Option` lets us make certain that the only usable value we can get back is a `string` by forcing us to explicity handle the posibility of `None`.
```ts
function upperCase(value: unknown): Option<string> {
  if (typeof value !== "string") {
    return Option.none();
  }
  return Option.some(value.toUpperCase());
}
```
This version of our function returns the `Option<string>` type, which ensures we can't try to use the new upper case string until we account for the possible `None` type, either by using the type guards, unwrapping, or matching methods.  It should be noted that we should always specify the return type as `Option<string>` (replace "string" with the expected type) in order for TypeScript to ensure we handle the return cases properly, and to not end up with the more confusing inferred type `Some<string> | None`; which is technically correct, but less readable and clear.  Additionally, while it is possible to only return one or the other, generally `Option.none()` and `Option.some()` should be used together in functions which have multiple return statements, at least one of which represents returning "no data".

## - CHAINING - `map()`, `andThen()`, `orElse()`
The second primary advantage of `Option` is that you don't need to immediately consume the `Option` to manipulate the underlying value.  `Option.map()`, `Option.andThen()`, and `Option.orElse()` can be used without consuming the `Option`, and will do their job at runtime depending on which underlying instance (`Some<T>` or `None`) they're called on.  This works because these methods only do work if they are called on the correct underlying object, and otherwise simply return the existing object, all while preserving the `Option` type.

### MAPPING - `map()`
Much like the array method, `Option.map()` allows you to apply a function to the underlying value, and returns a new `Option` with the transformed value, or, if the original `Option` was an instance of `None`, `Option.map()` does nothing, and keeps the underlying `None`.  Let's use our simple `upperCase()` function from the previous section in a simple example:
```ts
// Let us assume this function returns a generated non-empty string or a generated number at random, so we cannot know which type "value" might be
declare function getRandomValue(): string | number;

const value = getRandomValue();
const arrayOfCapitalLetters: string[] = upperCase(value)
  .map(string => string.split(""))
  .unwrapOr([]);
```
In this example, we want to get an array of capital letters, but the value we're given could be a string or a number.  When this unknown value is passed into our `upperCase` function, two things could happen: it could be turned into an all-caps string wrapped in a `Some<string>` type, or it could return the `None` type.  The `map()` method then acts like an implicit `if` statement: **if** the underlying value is `Some<string>`, it will transform it into a `Some<string[]>` by splitting the string into an array of its letters and wrapping it in a new `Some` instance, and otherwise it will simply 'pass along' the underlying `None` and do nothing.  This means we now have a type of `Option<string[]>`.  We choose unwrap it by using `Option.unwrapOr()` and use an empty array as the fallback, ensuring we get an array as out final value; either one full of capital letters, or an empty one in the case the value was a number.

### FLATMAPPING - `andThen()` and `orElse()`
The `Option.andThen()` method is analogous to the `Array.flatmap()` method. It allows the underlying value of a `Some<T>` to be passed into a function that itself returns some type of `Option`.  Like `Option.map()`, if the underlying type is `None`, it simply passes that along, because there's nothing to do in that case.  Let's expand on our above example to demonstrate:
```ts
// Let's assume we have a function called "returnVowels", which takes a string and returns an array of only the individual vowels it contains
// It returns that array as a "Some<string[]>", and returns a "None" instance if there were no vowels
declare function returnVowels(string: string): Option<string[]>

const value: string | number = getRandomValue();
const arrayOfCapitalVowels: string[] = upperCase(value)
  .andThen(string => returnVowels(string))
  .unwrapOr([]);
```
The main difference between `Option.map()` and `Option.andThen()` is that the function passed to `Option.andThen()` may return a new `None` or `Some<T>`, while the function passed to `Option.map()` only changes the value within an existing `Some<T>`.  In this example, `returnVowels()` is chained into the sequence with `Option.andThen()`, and just like with `Option.map()` only executes its logic if the underlying instance it gets from `upperCase()` is `Some<string>`, otherwise, it propagates `None` forward.  The difference is that if `returnVowels()` returns `None`, then that `None` gets propagated forward instead of the `Some<string>` that came from `upperCase()`.

`Option.orElse()` is also a flatmap method, however it operates on the condition that if it operates on a `Some<T>`, it will simply propagate that forward, **or else**, if the value is `None`, it will inject a new `Some<T>` into the chain, usually in the form of a function that returns an `Option<T>`.  It is important to note that the underlying value of the new `Option` must be of the same type as the one it's replacing.  This is to avoid a situation where the underlying value type becomes ambiguous.
```ts
// Let's have a function that takes a number and converts it into its string representation
// It returns a string as a "Some<string>", and returns a "None" instance if the value was not a number
declare function stringifyNumber(value: unknown): Option<string>;

const value: string | number = getRandomValue();
const arrayOfCharacters: string[] = upperCase(value)
  .orElse(stringifyNumber(value));
  .map(string => string.split(""))
  .unwrapOr([]);
```
In this example, if `getRandomValue()` returns a number, and the `Option<string>` from `upperCase()` is therefore a `None`, `Option.orElse()` will inject the `Option<string>` returned from `stringifyNumber()` into the chain.  Note that this must happen before `Option.map()`, since that call changes the underlying value from `string` to `string[]`, and therefore `Option<string>` would not be allowed.  Only an `Option<string[]>` would be permitted at that point.  A second note is that `Option.orElse()` only expects the `Option<T>` value itself as a parameter, unlike `Option.andThen()` which needs to call a function on an underlying value.  Since the value provided by `Option.orElse()` is only used when the underlying instance is `None`, there is no value to operate on, so directly passing in the result of `stringifyNumber()` is all that's needed.

<u>Side Note</u>: In the above example, it would actually be completely safe to use the bare `Option.unwrap()` call at the end of the chain, since we have actually handled both the `string` and `number` cases, and guaranteed that a `string[]` will always be the end result.  It is always safer to use `Option.unwrapOr()` anyways to avoid accidentally missing an edge case where the `Option` could still be `None`, but sometimes you may decide that such an edge case <u>should</u> throw an Error, and that is where `Option.unwrap()` can be used.