# OPTION
This module allows for the safe handling of nulls and nullish values without propagating `null` or `undefined`, which can cause unexpected errors.  It accomplishes this by wrapping values in an instance of a `Some<T>` object, or returning a `None` object.  The main type, `Option<T>`, is a union of these two possible types.  The underlying objects are instantiated from implementations of a shared interface which provides methods to chain operations and safely resolve the possible nullish value.  For those familiar with Rust or Functional Programming, it should feel familiar.


## IMPORTING
This module exports a namespace called "Option" and can be imported into any script with the following:
```ts
import { Option } from "./path/to/option.ts";
```
This is the recommended way to bring the functionality in.  However, optionally, the `Option<T>` type and the `some()`, `none()`, and `fromNullable()` functions can be separately imported if you require only specific parts of the functionality:
```ts
import { type Option, some, none, fromNullable } from "./path/to/option.ts";
```

## USAGE - `fromNullable()`
The easiest way to start using this system is to wrap a value that could be `undefined`, such as accessing an array index; an operation that always has some risk of returning `undefined`.  To do this, simply access the index inside the `Result.fromNullable` method:
```ts
const array: number[] = [2, 4, 6, 8];
const maybeNumber = Result.fromNullable(array[1]);
```
In this example, `maybeNumber` is of type `Option<number>`, which <u>may be</u> a number (`Some<number>`), or it could be nothing (`None`).  To resolve this possibility, we must **consume** the `Option`, using one of a few methods provided by the underlying objects.

### Type Guards - `isSome()` and `isNone()`
The first method of consuming an `Option` is with its in-built type guard methods, `Option.isSome()` and `Option.isNone()`.  These allow TypeScript to use it type narrowing logic to define how to handle the two possible cases.
```ts
const array: number[] = [2, 4, 6, 8, 10];

function checkIndex<T>(index: number, array: T[]): string {
  const maybeNumber: Option<T> = Result.fromNullable(array[index]);
  if (maybeNumber.isNone()) {
    return `Index ${index} is undefined`;
  }
  return `Index ${index} is ${maybeNumber.value}`;
}

const output = checkIndex(1, array);
ns.tprint(output);
```
In the above example, by checking if the `Option<number>` is an instance of `None`, TypeScript can infer that, since the function returns early if the value is `None`, `maybeNumber` must be `Some<number>` after the `if` block, which exposes the `value` field to be read.  If we were to run this script, the terminal would print `Index 1 is 4`.  However, if we were to check index 5, which would be accessing an index that does not yet have a value, the terminal would print `Index 5 is undefined`.

### Unwrapping - `unwrap()` and `unwrapOr()`
The second method is to directly unwrap (or access) the underlying value using `Option.unwrap()` or `Option.unwrapOr()`. These both will return the underlying `value` in the case that it is an instance of `Some<T>`.  How they differ is in what happens if the underlying type is `None`.  `Option.unwrap()` will throw an Error in this case, making it **_unsafe_** unless you can guarantee it's only called on a `Some<T>` instance.  For this reason `Option.unwrapOr()` is the preferred way to direclty unwrap an `Option<T>`. The way it works is that you can provide a fallback value to return, in the case the underlying object is an instance of `None`.
```ts
const array: number[] = [2, 4, 6, 8, 10];

function checkIndex<T>(index: number, array: T[]): string {
  const maybeNumber: Option<T> = Result.fromNullable(array[index]);
  const value = maybeNumber.unwrapOr("undefined");
  return `Index ${index} is ${value}`;
}

const output = checkIndex(1, array);
ns.tprint(output);
```
This will have the same results as in the type guard example, but we've simplified the logic by handling both the `Some<number>` and `None` possibilities at the same time.  If we were to have simply used `Option.unwrap()`, accessing index 5 would have thrown an Error, because we tried to call `unwrap` on an instance of `None`, which has no underlying value to unwrap.

### Matching - `match()`
The third method of consuming an Option is the `Option.match()` method.  This is the most fine-grained solution, as it allows you to define _exactly_ what happens in the case of a `Some<T>` or `None` using two custom functions as parameters.  The first function defines what happens if the underlying object is a `Some<T>`, and the second defines the same for a `None` instance.
```ts
const array: number[] = [2, 4, 6, 8, 10];

function checkIndex<T>(index: number, array: T[]): string {
  const maybeNumber: Option<T> = Result.fromNullable(array[index]);
  const value = maybeNumber.match(
    (some) => {
      const string = JSON.stringify(some);
      return string;
    },
    () => {
      return "undefined";
    }
  );
  return value;
}

const output = checkIndex(1, array);
ns.tprint(output);
```
While a bit contrived, here we can demonstrate how `Option.match()` works, and how it can run more complex logic when needed.  Of crucial note, both functions passed to `Option.match()` must return a value of the same type, so in this case, both need to return strings.