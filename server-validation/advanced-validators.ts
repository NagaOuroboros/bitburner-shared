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
    return e instanceof ValidationError ? Result.err(e) : Result.err(new ValidationError(`${e}`));
  }
}

export function validateIPAddressWithResult(ns: NS, value: unknown): ValidationResult<IPAddress> {
  return toValidationResult(() => parseIPAddress(ns, value));
}

export function validateHostnameWithResult(ns: NS, value: unknown): ValidationResult<Hostname> {
  return toValidationResult(() => parseHostname(ns, value));
}

export function validateServerIDWithResult(ns: NS, value: unknown): ValidationResult<ServerID> {
  return toValidationResult(() => parseServerID(ns, value));
}
