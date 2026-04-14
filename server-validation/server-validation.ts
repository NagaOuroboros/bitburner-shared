// By using a unique symbol as the brand, we ensure the brand only exists at the type level and can't be autocompleted by accident
declare const __brand: unique symbol;
/** Type for marking primitives as particular sub-types */
type Brand<T, B extends string> = T & { [__brand]: B };

/** Marks a string as being a valid server hostname */
export type Hostname = Brand<string, "hostname">;
/** Marks a string as being a valid server IP address */
export type IPAddress = Brand<string, "ip_address">;
/**
 * A type which accepts either `Hostname` or `IPAddress` types\
 * For use when either identifier is acceptable
 */
export type ServerID = Hostname | IPAddress;

/**
 * A sub-class of Error for failed validations
 */
class ValidationError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ValidationError';
  }
}
/** A simple tuple result type */
type SimpleResult<E, T> = [E, null] | [null, T]
/** A helper function that takes a parsing function and wraps the retrun in a `SimpleResult` */
function toSimpleResult<T>(parseFn: () => T): SimpleResult<ValidationError, T> {
  try {
    return [null, parseFn()];
  } catch (e: unknown) {
    return e instanceof ValidationError ? [e, null] : [new ValidationError(`${e}`), null];
  }
}

/*
 * IP Address Validation
 */

/**
 * Checks if `value` is a valid IP address
 * @remarks RAM cost: 0.1 GB\
 * [`ns.serverExists`]
 * @returns A boolean indicating if the IP address exists
 */
export function isIPAddress(ns: NS, value: unknown): value is IPAddress {
  if (typeof value !== 'string') return false;
  const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (!ipRegex.test(value)) return false;
  return ns.serverExists(value);
}
/**
 * Asserts `value` is a valid IP address
 * @remarks RAM cost: 0.1 GB\
 * [`ns.serverExists`]
 * @throws Throws a `ValidationError` if the value is not an existing IP address
 */
export function assertIPAddress(ns: NS, value: unknown): asserts value is IPAddress {
  if (!isIPAddress(ns, value)) { throw new ValidationError(`${value} does not resolve to an existing IP Address`); }
}
/**
 * Parses `value` and returns it as an IP address
 * @remarks RAM cost: 0.1 GB\
 * [`ns.serverExists`]
 * @throws Throws a `ValidationError` if the value is not an existing IP address
 */
export function parseIPAddress(ns: NS, value: unknown): IPAddress {
  assertIPAddress(ns, value);
  return value;
}
/**
 * Validates a value and returns a tuple in which the first element is possibly a `ValidationError` object or null, and the second is an IP address or null\
 * If one element is null, the other is guaranteed to be defined
 * @remarks RAM cost: 0.1 GB\
 * [`ns.serverExists`]
 */
export function validateIPAddress(ns: NS, value: unknown): SimpleResult<ValidationError, IPAddress> {
  return toSimpleResult(() => parseIPAddress(ns, value));
}

/*
 * Hostname Validation
 */

/**
 * Checks if `value` is a valid Hostname
 * @remarks RAM cost: 0.1 GB\
 * [`ns.serverExists`]
 * @returns A boolean indicating if the Hostname exists
 */
export function isHostname(ns: NS, value:unknown): value is Hostname {
  if (typeof value !== 'string') return false;
  const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (ipRegex.test(value)) return false;
  return ns.serverExists(value);
}
/**
 * Asserts `value` is a valid Hostname
 * @remarks RAM cost: 0.1 GB\
 * [`ns.serverExists`]
 * @throws Throws a `ValidationError` if the value is not an existing Hostname
 */
export function assertHostname(ns: NS, value: unknown): asserts value is Hostname {
  if (!isHostname(ns, value)) { throw new ValidationError(`${value} does not resolve to an existing Hostname`); }
}
/**
 * Parses `value` and returns it as a Hostname
 * @remarks RAM cost: 0.1 GB\
 * [`ns.serverExists`]
 * @throws Throws a `ValidationError` if the value is not an existing Hostname
 */
export function parseHostname(ns: NS, value: unknown): Hostname {
  assertHostname(ns, value);
  return value;
}
/**
 * Validates a value and returns a tuple in which the first element is possibly a `ValidationError` object or null, and the second is a Hostname or null\
 * If one element is null, the other is guaranteed to be defined
 * @remarks RAM cost: 0.1 GB\
 * [`ns.serverExists`]
 */
export function validateHostname(ns: NS, value: unknown): SimpleResult<ValidationError, Hostname> {
  return toSimpleResult(() => parseHostname(ns, value));
}

/*
 * ServerID Validation
 */

/**
 * Checks if `value` is a valid server identifier (IP or Hostname)
 * @remarks RAM cost: 0.1 GB\
 * [`ns.serverExists`]
 * @returns A boolean indicating if the server exists
 */
export function isServerID(ns: NS, value: unknown): value is ServerID {
  if (typeof value !== 'string') return false;
  return ns.serverExists(value);
}
/**
 * Asserts `value` is a valid server identifier (IP or Hostname)
 * @remarks RAM cost: 0.1 GB\
 * [`ns.serverExists`]
 * @throws Throws a `ValidationError` if the value is not an existing server
 */
export function assertServerID(ns: NS, value: unknown): asserts value is ServerID {
  if (!isServerID(ns, value)) { throw new ValidationError(`${value} does not resolve to an existing server`); }
}
/**
 * Parses `value` and returns it as a ServerID
 * @remarks RAM cost: 0.1 GB\
 * [`ns.serverExists`]
 * @throws Throws a `ValidationError` if the value is not an existing server
 */
export function parseServerID(ns: NS, value: unknown): ServerID {
  assertServerID(ns, value);
  return value;
}
/**
 * Validates a value and returns a tuple in which the first element is possibly a `ValidationError` object or null, and the second is a server identifier (IP or Hostname) or null\
 * If one element is null, the other is guaranteed to be defined
 * @remarks RAM cost: 0.1 GB\
 * [`ns.serverExists`]
 */
export function validateServerID(ns: NS, value: unknown): SimpleResult<ValidationError, ServerID> {
  return toSimpleResult(() => parseServerID(ns, value));
}
