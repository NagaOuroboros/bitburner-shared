# BB-DB
BB-DB is a Bitburner-native, JSON-backed Key-Value Database.  It stores key-value data as files under a database directory on the server of the script it's initialized in, by default named `local-database`.  The files are named with a hash of the key, and stored in sub-directories according to the first two characters of the hash.  During initialization, the client will eagerly delete any JSON files in the database directory that do not match the expected database format.  On initialization, it creates a cache of current keys for fast validation (`database.has(key)` returns true if `key` is in the key cache). However, it uses the actual file system as the internal source of truth (`database.get(key)` searches for the expected hashed filename in the directory, not the key cache). It uses a temp-file system for writes and deletes to ensure untimely quits or crashes do not render database files invalid, and handles the rare hash collision by making each JSON file an array of key-value pairs, which it traverses to find the correct value for the specified key.

Of note, due to the way Bitburner's filesystem works, the database directory will only exist while it contains files.  If all files are deleted, the directory will 'disappear' from the filesystem, with one exception: orphaned temp files may still persist due to an untimely crash (in which case `{database-root}/tmp/*` will still contain files).

## IMPORTING AND INITIALIZATION
To begin using the database, first import the client class:
```ts
import { DatabaseClient } from "path/to/bb-db.ts";
```
Then you should initialize an instance inside the `main` function of your script:
```ts
export async function main(ns: NS) {
  const database = new DatabaseClient(ns);
}
```
This will create a client class that will store values inside the default `local-database` directory.  If you want to use a different root directory, or create more than one database on the same server, you must pass the desired directory name as the second argument to the constructor:
```ts
export async function main(ns: NS) {
  const database = new DatabaseClient(ns, "my-database");
}
```
Creating a database instance that points to an existing directory will automatically fill its key cache with valid keys from JSON files stored there.  **DO NOT** point the database at a directory that stores non-database JSON files; the client will eagerly destroy JSON files that do not match the expected shape, treating them as invalid database entries.  It is best practice to point the client at existing database root directories or empty directories.

## USE: `set()`, `get()` & `delete()`
These three methods are the primary API for the database.  `set()` and `delete()` return simple booleans to indicate success or failure, and log failure reasons to the script's tail logs.  `get()` returns one of three possible objects, differentiated by their `state` field.

### SET
`DatabaseClient.set(key: string, value: JSONValue): boolean`

`set()` takes two arguments, a string `key` and JSON-serializable `value`.  It will try to stringify the `value`, then try to store the `value` in the JSON file associated with the `key`, or create a new file if the `key` does not yet exist in the database; essentially acting as an `upsert` method.  If it fails at any point, it will return `false` and log the reason, or return `true` on success.

### DELETE
`DatabaseClient.delete(key: string): boolean`

`delete()` takes a single argument, a string `key`.  It will look in the database for the file associated with the `key` and delete the associated entry from the database.  If the key does not exist, or the delete operation fails, it will return `false` and log the reason, or return `true` on success.

### GET
`DatabaseClient.get(key: string): GetResult`

`get()` takes a single argument, a string `key`.  It will search the database for the file associated with the key and return one of three different results:
- If it finds the key, it will return `{ state: "found", data: JSONValue }`, where `data` is the value associated with the key
- If it cannot find the `key` in the database, it will simply return `{ state: "missing" }` and log that the key is missing to the script's tail logs
- If it encounters an error, it will return `{ state: "error", reason: string }` and log the reason to the script's tail logs

`get()` **always** logs missing keys and errors.  If you want a silent check, see `has()`.

Because it uses a discriminated union as its return type, you will need to branch your code on the `state` property to properly narrow which result the function returned.  In the example below we will demonstrate this with a switch statement:
```ts
export async function main(ns: NS) {
  const database = new DatabaseClient(ns);
  const result = database.get("myKey");
  let data;
  switch (result.state) {
    case "found":
      data = result.data;
      break;
    case "missing":
      // handle missing key case
      break;
    case "error":
      //handle error case
      break;
  }
}
```
There are numerous ways to collapse or branch on the union, but, for convenience, three variants of `get()` are included with the client: `getOrNull()`, `getOrThrow()`, and `getOrDefault()`.
- `getOrNull(key: string)` - This simply returns either the stored value for that key, or `null` if the value could not be retrieved
- `getOrThrow(key: string)` - This will always return the stored value for that key, but will throw an exception if the value could not be retrieved
- `getOrDefault(key: string, fallback: JSONValue)` - This will return the stored value for that key, or the provided fallback value if it could not be retrieved

These cover the most common conventions for 'unwrapping' the discriminated union, however all three swallow the difference between a 'missing key' and an 'error', so use with caution.

## KEY CACHE - `has()` & `keys()`
The client instance maintains a cache of known-valid keys.  So long as only a single instance is using the database directory, the cache will be accurate.  However, if multiple clients are adding/deleting entries in the database, the cache may be incomplete or return false positives.  While there is self-correcting logic built in, the key cache should not be considered a guaranteed source of valid keys.  In short, any one client only stores the keys it has seen, and only removes the keys it knows no longer exist.

`DatabaseClient.has(key: string): boolean`\
`has()` takes a string key as an argument and simply returns a boolean.  If the key hits in the cache, it immediately returns `true`.  If the key is not in the cache, `has()` will look to see if the key exists in the actual database and return `true` or `false` depending on what it finds.

`DatabaseClient.keys(): string[]`\
`keys()` simply returns all the keys that are currently cached as an array.