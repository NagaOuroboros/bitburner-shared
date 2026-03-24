// ! Change paths to match your file structure !
import { Result } from "../result/result.ts";
import { parseIPAddress, parseHostname, parseServerID, type IPAddress, type Hostname, type ServerID } from "./server-validation.ts"

class ValidationError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ValidationError";
  }
}

type ValidationResult<T> = Result<T, ValidationError>;

function toValidationResult<T>(parseFn: () => T): ValidationResult<T> {
  try {
    return Result.ok(parseFn());
  } catch (e) {
    return Result.err(e as ValidationError);
  }
}
/**
 * Validates `value` and returns a `Result` of either the validated IPAddress string, or a `ValidationError`
 * @remarks RAM cost: 0.1 GB\
 * [`ns.serverExists`]
 */
export function validateIPAddressWithResult(ns: NS, value: unknown): ValidationResult<IPAddress> {
  return toValidationResult(() => parseIPAddress(ns, value));
}
/**
 * Validates `value` and returns a `Result` of either the validated Hostname string, or a `ValidationError`
 * @remarks RAM cost: 0.1 GB\
 * [`ns.serverExists`]
 */
export function validateHostnameWithResult(ns: NS, value: unknown): ValidationResult<Hostname> {
  return toValidationResult(() => parseHostname(ns, value));
}
/**
 * Validates `value` and returns a `Result` of either the validated ServerID string, or a `ValidationError`
 * @remarks RAM cost: 0.1 GB\
 * [`ns.serverExists`]
 */
export function validateServerIDWithResult(ns: NS, value: unknown): ValidationResult<ServerID> {
  return toValidationResult(() => parseServerID(ns, value));
}
