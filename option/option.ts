/** A type the represents the possible absence of a value */
export type Option<T> = Some<T> | None;

namespace Option {
  /**
   * Wraps the provided `value` in an instance of `Some`
   * @param value The value to be wrapped
   */
  export function some<T>(value: T): Some<T> {
    return new Some<T>(value);
  }
  /**
   * Returns a `None` instance
   */
  export function none(): None {
    return None.getInstance();
  }
  /**
   * Takes a value that could potentially be `null` and wraps it in an `Option`
   * @param value The value to be wrapped
   */
  export function fromNullable<T>(value: T | null | undefined): Option<T> {
    return value == null ? none() : some(value);
  }
}

Object.freeze(Option);
export { Option };
export const some = Option.some;
export const none = Option.none;
export const fromNullable = Option.fromNullable;

interface IOption<T> {
  /** A Type Narrowing function that returns `true` if the underlying value is an instance of `Some` */
  isSome(): this is Some<T>;
  /** A Type Narrowing function that returns `true` if the underlying value is an instance of `None` */
  isNone(): this is None;
  /** 
   * Returns the underlying `Some` value if it exists. Prefer `match` or `unwrapOr` for safer handling
   * @throws Throws an `Error` if this is called on an instance of `None`
   */
  unwrap(): T;
  /**
   * Returns the underlying `Some` value if it exists, or the `fallback` value if it doesn't
   * @param fallback The fallback to use if there is no underlying value
   */
  unwrapOr<F>(fallback: F): T | F;
  /**
   * Applies the provided function to the underlying `Some` value if it exists,
   * and does nothing if the underlying value is an instance of `None`
   * @param fn The function to apply to the underlying value
   */
  map<U>(fn: (value: T) => U): Option<U>;
  /**
   * Allows for chaining another function that returns an `Option` to the underlying `Some` value,
   * and does nothing if the underlying value is an instance of `None`
   * @param fn The function to apply to the underlying value. Must return an `Option`
   */
  andThen<U>(fn: (value: T) => Option<U>): Option<U>;
  /**
   * Returns the underlying `Option` if it is an instance of `Some`,
   * or returns the `fallback` if it is an instance of `None`
   * @param fallback An `Option` to use if the underlying value is not an instance of `Some`
   */
  orElse(fallback: Option<T>): Option<T>;
  /**
   * Conditionally applies a function that will resolve the `Option` to a final value
   * @param onSome The function to apply if the underlying value is an instance of `Some`
   * @param onNone The function to apply if the underlying value is an instance of `None`
   */
  match<A>(onSome: (value: T) => A, onNone: () => A): A;
}

class Some<T> implements IOption<T> {
  readonly value: T;
  constructor(value: T) {
    this.value = value;
    Object.freeze(this);
  }
  isSome(): this is Some<T> {
    return true;
  }
  isNone(): this is None {
    return false;
  }
  unwrap(): T {
    return this.value;
  }
  unwrapOr<F>(_fallback: F): T {
    return this.value;
  }
  map<U>(fn: (value: T) => U): Option<U> {
    return new Some(fn(this.value));
  }
  andThen<U>(fn: (value: T) => Option<U>): Option<U> {
    return fn(this.value);
  }
  orElse(_fallback: Option<T>): Option<T> {
    return this;
  }
  match<A>(onSome: (value: T) => A, _onNone: () => A): A {
    return onSome(this.value);
  }
}

class None implements IOption<never> {
  private static _instance = new None();
  private constructor(){
    Object.freeze(this);
  }
  public static getInstance(): None {
    return this._instance;
  }
  isSome(): this is Some<never> {
    return false;
  }
  isNone(): this is None {
    return true;
  }
  unwrap(): never {
    throw new Error('Attempted to call unwrap on an instance of None.');
  }
  unwrapOr<F>(fallback: F): F {
    return fallback;
  }
  map<U>(_fn: (value: never) => U): Option<U> {
    return None.getInstance();
  }
  andThen<U>(_fn: (value: never) => Option<U>): Option<U> {
    return None.getInstance();
  }
  orElse<T>(fallback: Option<T>): Option<T> {
    return fallback;
  }
  match<A>(_onSome: (value: never) => A, onNone: () => A): A {
    return onNone();
  }
}