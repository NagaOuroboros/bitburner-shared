/** A type that represents the possibility of a success or an error */
export type Result<T,E> = Ok<T, E> | Err<T, E>;

namespace Result {
  /** 
   * Wraps a value in an `Ok` instance
   * @param value The value to be wrapped
   */
  export function ok<T>(value: T): Ok<T, never> {
    return new Ok<T, never>(value);
  }
  /** 
   * Wraps an error value in an `Err` instance
   * @param error The error value to be wrapped
   */
  export function err<E>(error: E): Err<never, E> {
    return new Err<never, E>(error);
  }
  /**
   * Takes a synchronous function that could throw an Error and wraps the output in a `Result` type
   * @param fn The function whose output is to be wrapped
   * @param ctx Optional - A description of the context of the operation
   */
  export function fromThrowable<T>(fn: () => T, ctx?: string): Result<T, Error> {
    try {
      const res = fn();
      return ok(res);
    } catch (e) {
      const error = e instanceof Error ? e : new Error(`${e}`);
      if (ctx) {
        error.message = `${ctx}: ${error.message}`;
      }
      return err(error);
    }
  }
  /**
   * Takes a `Promise` or async function that could throw an Error and wraps the output in a `Result` type
   * @param fn The `Promise` or function whose output is to be wrapped
   * @param ctx Optional - A description of the context of the operation
   */
  export async function fromThrowableAsync<T>(fn: () => Promise<T>, ctx?: string): Promise<Result<T, Error>> {
    try {
      const res = await fn();
      return ok(res);
    } catch (e) {
      const error = e instanceof Error ? e : new Error(`${e}`);
      if (ctx) {
        error.message = `${ctx}: ${error.message}`;
      }
      return err(error);
    }
  }
}

Object.freeze(Result);
export { Result };
export const ok = Result.ok;
export const err = Result.err;
export const fromThrowable = Result.fromThrowable;
export const fromThrowableAsync = Result.fromThrowableAsync;

interface IResult<T,E> {
  /** A Type Narrowing function that returns `true` if the underlying value is an instance of `Ok` */
  isOk(): this is Ok<T, E>;
  /** A Type Narrowing function that returns `true` if the underlying value is an instance of `Err` */
  isErr(): this is Err<T, E>;
  /**
   * Returns the underlying value if it is an instance of `Ok`. Prefer `match` or `unwrapOr` for safer handling
   * @throws Throws an `Error` if called on an instance of `Err`
   */
  unwrap(): T;
  /**
   * Returns the underlying value if it is an instance of `Ok`,
   * and returns the `fallback` value otherwise.
   * @param fallback The value to use if the underlying value is not an instance of `Ok`
   */
  unwrapOr<F>(fallback: F): T | F;
  /**
   * Applies a function to the underlying `Ok` value and returns a new `Result`.
   * Simply returns the existing `Result` in the case the underlying value is an instance of `Err`
   * @param fn The function to apply the the underlying `Ok` value
   */
  map<U>(fn: (value: T) => U): Result<U, E>;
  /**
   * Applies a function to the underlying `Err` value and returns a new `Result`.
   * Simply returns the existing `Result` in the case the underlying value is an instance of `Ok`
   * @param fn The function to apply the the underlying `Err` value
   */
  mapErr<F>(fn: (error: E) => F): Result<T, F>;
  /**
   * Allows to chain another function that returns a `Result` on the underlying `Ok` value.
   * Simply returns the existing `Result` in the case the underlying value is an instance of `Err`
   * @param fn The function to apply the the underlying `Ok` value.  Must return a `Result`
   */
  andThen<U, F>(fn: (value: T) => Result<U, F>): Result<U, E | F>;
  /**
   * Allows to chain another function that returns a `Result` on the underlying `Err` value.
   * Simply returns the existing `Result` in the case the underlying value is an instance of `Ok`
   * @param fn The function to apply the the underlying `Err` value.  Must return a `Result`
   */
  orElse<U, F>(fn: (error: E) => Result<U, F>): Result<T | U, F>;
  /**
   * Conditionally resolves a `Result` by applying one of two functions to produce a final value
   * @param onOk The function to apply if the underlying value is an `Ok` instance
   * @param onErr The function to apply if the underlying value is an `Err` instance
   */
  match<A>(onOk: (value: T) => A, onErr: (error: E) => A): A;
}

class Ok<T, E> implements IResult<T, E> {
  readonly value: T;
  constructor(value: T) {
    this.value = value;
    Object.freeze(this);
  }
  isOk(): this is Ok<T, E> {
    return true;
  }
  isErr(): this is Err<T,E> {
    return false;
  }
  unwrap(): T {
    return this.value;
  }
  unwrapOr<F>(_fallback: F): T {
    return this.value;
  }
  map<U>(fn: (value: T) => U): Result<U, E> {
    return new Ok(fn(this.value));
  }
  mapErr<F>(_fn: (error: E) => F): Result<T, F> {
    return this as unknown as Result<T, F>;
  }
  andThen<U, F>(fn: (value: T) => Result<U, F>): Result<U, F> {
    return fn(this.value);
  }
  orElse<U, F>(_fn: (value: E) => Result<U, F>): Result<T, F> {
    return this as unknown as Result<T, F>
  }
  match<A>(onOk: (value: T) => A, _onErr: (error: E) => A): A {
    return onOk(this.value);
  }
}

class Err<T, E> implements IResult<T, E> {
  readonly error: E;
  constructor(error: E) {
    this.error = error;
    Object.freeze(this);
  }
  isOk(): this is Ok<T, E> {
    return false;
  }
  isErr(): this is Err<T,E> {
    return true;
  }
  unwrap(): T {
    throw new Error('Attempted to call unwrap on an instance of Err.');
  }
  unwrapOr<F>(fallback: F): F {
    return fallback;
  }
  map<U>(_fn: (value: T) => U): Result<U, E> {
    return this as unknown as Result<U, E>;
  }
  mapErr<F>(fn: (error: E) => F): Result<T, F> {
    return new Err(fn(this.error));
  }
  andThen<U, F>(_fn: (value: T) => Result<U, F>): Result<U, E> {
    return this as unknown as Result<U, E>;
  }
  orElse<U, F>(fn: (error: E) => Result<U, F>): Result<U, F> {
    return fn(this.error);
  }
  match<A>(_onOk: (value: T) => A, onErr: (error: E) => A): A {
    return onErr(this.error);
  }
}
