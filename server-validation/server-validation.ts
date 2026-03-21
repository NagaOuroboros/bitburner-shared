// By using a unique symbol as the brand, we ensure the brand only exists at the type level and can't be autocompleted by accident
declare const __brand: unique symbol;
/** Type for marking primitives as particular sub-types */
export type Brand<T, B extends string> = T & { [__brand]: B };

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
export class ValidationError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ValidationError';
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
  if (isIPAddress(ns, value)) return false;
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
  return ns.serverExists(ns, value);
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

type ServerValidator = (ns: NS) => {
  /** Checks if `value` is an existing IP address */
  isIPAddress: (value: unknown) => value is IPAddress;
  /** Checks if `value` is an existing Hostname */
  isHostname: (value: unknown) => value is Hostname;
  /** Checks if `value` is an existing server identifier (IP or Hostname) */
  isServerID: (value: unknown) => value is ServerID;
  /** @throws Throws a `ValidationError` if `value` does not resolve to an existing IP address */
  assertIPAddress: (value: unknown) => asserts value is IPAddress;
  /** @throws Throws a `ValidationError` if `value` does not resolve to an existing Hostname */
  assertHostname: (value: unknown) => asserts value is Hostname;
  /** @throws Throws a `ValidationError if `value` does not resolve to an existing server */
  assertServerID: (value: unknown) => asserts value is ServerID;
  /**
   * @throws Throws a `ValidationError` if `value` does not resolve to an existing IP address
   * @returns `value` as an `IPAddress`
   */
  parseIPAddress: (value: unknown) => IPAddress;
  /**
   * @throws Throws a `ValidationError` if `value` does not resolve to an existing Hostname
   * @returns `value` as `Hostname`
   */
  parseHostname: (value: unknown) => Hostname;
  /**
   * @throws Throws a `ValidationError` if `value` does not resolve to an existing server
   * @returns `value` as `ServerID`
   */
  parseServerID: (value: unknown) => ServerID;
}

/**
 * A factory function which returns an object containing all server validation functions as methods
 * @remarks RAM cost: 0.1 GB\
 * [`ns.serverExists`]
 * @param ns The current script's Netscript instance
 */
export const createServerValidator: ServerValidator = (ns: NS) => ({
    isIPAddress: (value: unknown): value is IPAddress => isIPAddress(ns, value),
    isHostname: (value: unknown): value is Hostname => isHostname(ns, value),
    isServerID: (value: unknown): value is ServerID => isServerID(ns, value),
    assertIPAddress: (value: unknown): asserts value is IPAddress => assertIPAddress(ns, value),
    assertHostname: (value: unknown): asserts value is Hostname => assertHostname(ns, value),
    assertServerID: (value: unknown): asserts value is ServerID => assertServerID(ns, value),
    parseIPAddress: (value: unknown): IPAddress => parseIPAddress(ns, value),
    parseHostname: (value: unknown): Hostname => parseHostname(ns, value),
    parseServerID: (value: unknown): ServerID => parseServerID(ns, value),
});