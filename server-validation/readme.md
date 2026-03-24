# SERVER VALIDATION
Ever encountered an error message like this?
```
host expected to be a string. Is undefined.
```
Or how about this one?
```
Invalid host: "" (empty string)
```
By making purpose-built types and validators available, this mini library exists to comprehensively cover most use cases and provide a way to guarantee that a value resolves to a valid server when passed to NS functions expecting string-type server identifiers, i.e. Hostnames or IP addresses.

## IMPORTING
All the functions exported by this library cost only `0.1GB` of in-game RAM, no matter how many of them you import.  So it is recommended you simply import the entire module:
```ts
import * as serverValidator from "./path/to/server-validation.ts";
```
For the types, if you want to use them yourself in your own custom functions, they must be imported separately:
```ts
import type { IPAddress, Hostname, ServerID } from "./path/to/server-validation.ts";
```
Optionally, each function can be separately imported, but for the purposes of this readme, we will be assuming you imported the whole library module.

## TYPES
The types that are exported from the module and/or returned by the various functions are `IPAddress`, `Hostname`, and `ServerID`.  These are 'branded types'.  They behave identically to strings, and can be used anywhere that strings are expected.  What makes them different is that they act as proof on the type level that you've validated the string.  Additionally, TypeScript will not let you pass normal strings in places that explicitly require these types.  While no `NS` methods require these, you could write functions or code that expect these narrower string types, and this library provides the means to narrow strings to one of these three types.
- `IPAddress` marks strings that fit the `[byte].[byte].[byte].[byte]` format and which point to an existing server on the main network. As of Bitburner v3.0dev, it can be used anywhere the game expects an `ip` or `host` string argument.
- `Hostname` marks strings that match the name of one of the in-game servers on the main network, including your custom-named cloud servers, and, in Bitburner v2.8.1 and higher, can be used anywhere the game expects a `hostname` or `host` string argument.
- `ServerID` marks any string that fits the criteria of either `IPAddress` or `Hostname`, and can be used anywhere the game expects a `host` string argument.

If your game version is 2.8.1, you should stick to using `Hostname`-based validation, as that version of the game does not fully allow the use of IP addresses as string identifiers for servers.
Going forward, we will assume you are in version 2.8.1 or higher, as hostname identifiers will continue working in 3.0+.  However, everything that applies to using the `Hostname` type functions apply to the other types as well.

## FUNCTIONS
The exported functions fall into four types: guards, assertions, parsers, and validators.  Each type has a function for each, for a total of twelve individual functions.

### Guard Functions
Guard functions start with `is` (e.g. `isHostname()`) and return a simple `true` or `false`.  They are designed for use with `if` statements.
```ts
// Let's assume we have a script that expects the first argument to be a hostname
import * as serverValidator from "./path/to/server-validation.ts";

export async function main(ns: NS) {
  const hostname: ScriptArg = ns.args[0];
  if (!serverValidator.isHostname(ns, hostname)) {
    ns.tprint(`${hostname} is not a valid hostname`);
    return;
  }
  // Due to the early return, TypeScript now knows that `hostname` must be valid here
  // and marks it as being a `Hostname` type instead of a `ScriptArg` type
  const cash = ns.getServerMoneyAvailable(hostname);
  // . . .
}
```
Checking for the `false` case first, and then returning, exiting, or throwing an Error, is called an 'early return branch'.  This pattern ensures that TypeScript knows that once we get past this initial `if` check, the `hostname` variable is guaranteed to be a valid server name, and marks it with the custom `Hostname` type.  You could also use this check in `if-else` blocks as well, depending on how you need your logic to work; just keep in mind that the type will only be narrowed within the matching block if neither branch returns or exits.

### Assertion Functions
Assertion functions start with `assert` (e.g. `assertHostname()`) and are a more severe check.  They are used on their own and throw an exception if the value they're given fails to pass the check.
```ts
import * as serverValidator from "./path/to/server-validation.ts";

export async function main(ns: NS) {
  const hostname: ScriptArg = ns.args[0];
  serverValidator.assertHostname(ns, hostname);
  // If we get here without an error being thrown, TypeScript knows `hostname` will always be valid,
  // and marks it as a `Hostname` type from here on
  const cash = ns.getServerMoneyAvailable(hostname);
  // . . .
}
```
Note that while this is more concise, there is no way to gracefully handle the error case.  Your script will stop and throw an error if the asserion fails.  This can be a good thing when subsequent steps could fail if the value is incorrect, especially deep in your logic.  However, since the game will typically throw an error anyways on an invalid server string, this is more useful as a way to control *when* in your code the error happens in a "fail fast" sense.

### Parsing Functions
Parsing functions start with `parse` (e.g `parseHostname()`) and are a sibling to assertion functions.  They will also throw an exception if the value they're given fails to pass the check, but will also return the value as the new type if it passes, doing all the work in one step.
```ts
import * as serverValidator from "./path/to/server-validation.ts";

export async function main(ns: NS) {
  const hostname = serverValidator.parseHostname(ns, ns.args[0]);
  // If we get here without an error being thrown, `hostname` was assigned a string of the type `Hostname`
  const cash = ns.getServerMoneyAvailable(hostname);
  // . . .
}
```
This is even more concise, and does all the work for you.  It takes the initial value, checks it, and returns it as the new type.  This is also a "fail fast" means of type narrowing, but allows you to make the check in the same line that you initialize a validated variable.  This is generally done right before you use the unchecked value to make sure it is validated before it gets passed to some other function or used in type-sensitive logic.

### Validation Functions
Validation functions start with `validate` (e.g. validateHostname()) and are a much more graceful way of checking a verifying a value.  They return one of two mutually exclusive tuples: either `[ValidationError, null]` or `[null, Hostname]`.  If the first value, the error, is null, the second value is guaranteed to be a validated string, and vice versa.
```ts
import * as serverValidator from "./path/to/server-validation.ts";

export async function main(ns: NS) {
  const [error, hostname] = serverValidator.validateHostname(ns, ns.args[0]);
  if (error) {
    ns.tprint(error.message);
    return;
  }
  // Due to the early return, TypeScript knows that `hostname` is non-null and must be a valid `Hostname`
  const cash = ns.getServerMoneyAvailable(hostname);
  // . . .
}
```
This is a more elegant version of the Guard Function.  By returning a tuple with the error first, we are forced to check the error and decide what to do with that case before using the hostname.  Since `null` cannot be passed to functions expecting a `string`, blindly passing `hostname` to such a function will raise an error in TypeScript.  It should be noted that the error is an Error sub-class called `ValidationError`, and has the expected fields such as `Error.message`.

## Using the Types
If you wish to use the exported types in your own functions, be aware that you must then use one of the associated functions to narrow a string to the correct type.  This is generally a good thing, as you then guarantee your function cannot fail due to invalid strings, or nullish values causing unexpected behavior.
```ts
import * as serverValidator from "./path/to/server-validation.ts";
import type { Hostname } from "./path/to/server-validation.ts";

export async function main(ns: NS) {
  
  // Let's create a simple wrapper around the `getServerMoneyAvailable` method
  function getMoneyWithHostname(hostname: Hostname) {
    return ns.getServerMoneyAvailable(hostname);
  }

  const server = String(ns.args[0]);
  // If we were to just pass `server` to `getMoneyWithHostname`, TypeScript would raise an error,
  // since a plain string is not necessarily a `Hostname`. So we must first narrow the type
  const [error, hostname] = serverValidator.validateHostname(ns, server);
  if (error) {
    ns.tprint(`${error.name}: ${errror.message}.  Please check spelling and try again.`);
    return;
  }
  // Now hostname is known to be non-null, and is therefore a `Hostname` type string
  const cash = getMoneyWithHostname(hostname);
  // . . .
}
```