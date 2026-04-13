/*
 * A JSON-backed KV database
 */

type JSONPrimitive = string | number | boolean | null;
type JSONValue = JSONPrimitive | JSONArray | JSONObject;
type JSONArray = JSONValue[];
type JSONObject = { [key: string]: JSONValue };

type Entry = { key: string, value: JSONValue };

class MissingKeyError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}
class JSONError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}
/**
 * Hashes an arbitrary string into a 64-bit Hex string using the FNV-1a algorithm
 * @param input — The string to be hashed
 * @returns a 64-bit (16 character) hex string
 */
function FNV1a_64(input: string): string {
  const prime = 0x00000100000001b3n;
  let hash = 0xcbf29ce484222325n;

  const bytes = new TextEncoder().encode(input);

  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash *= prime;
    hash &= 0xFFFFFFFFFFFFFFFFn;
  }

  return hash.toString(16).toUpperCase().padStart(16, '0');
}

const DB_DIRECTORY = "bb-db";

export class DatabaseClient {
  #keylist: string[] = [];
  #ns: NS;
  constructor(ns: NS) {
    this.#ns = ns;
  }
  #safeStringify(data: Entry | Entry[]) {
    try {
      return JSON.stringify(data);
    } catch (e) {
      const error = e as Error;
      throw new JSONError(`Error while stringifying: ${error.message}`, { cause: error });
    }
  }
  #atomicWrite(tempfile: string, file: string, data: string) {
    this.#ns.write(tempfile, data, 'w');
    if (!this.#ns.fileExists(tempfile)) {
      throw new Error(`Failed to write: ${tempfile}`);
    }
    this.#ns.mv(this.#ns.self().hostname, tempfile, file);
  }
  #write(key: string, data: Entry) {
    const hash = FNV1a_64(key);
    const subdir = hash.slice(0, 2);
    const file = `${DB_DIRECTORY}/${subdir}/${hash}.json`
    const tempfile = `${DB_DIRECTORY}/tmp/${hash}-${Math.random().toString(16).slice(2)}.tmp.json`
    let json: string;
    if (this.#ns.fileExists(file)) {
      const filedata = this.#read(hash);
      if (!Array.isArray(filedata)) {
        if (filedata.key === key) {
          json = this.#safeStringify(data);
          this.#atomicWrite(tempfile, file, json);
          return;
        } else {
          json = this.#safeStringify([filedata, data]);
          this.#atomicWrite(tempfile, file, json);
          return;
        }
      }
      const idx = filedata.findIndex(e => e.key === key);
      if (idx !== -1) {
        filedata[idx] = data;
      } else {
        filedata.push(data);
      }
      json = this.#safeStringify(filedata);
      this.#atomicWrite(tempfile, file, json);
      return;
    }
    json = this.#safeStringify(data);
    this.#atomicWrite(tempfile, file, json);
  }
  #read(hash: string): Entry | Entry[] {
    const subdir = hash.slice(0,2);
    const file = `${DB_DIRECTORY}/${subdir}/${hash}.json`
    if (!this.#ns.fileExists(file)) {
      throw new MissingKeyError(`File not found`);
    }
    // ! May throw
    try {
      const data = JSON.parse(this.#ns.read(file)) as Entry | Entry[];
      return data;
    } catch (e) {
      const error = e as Error;
      throw new JSONError(`Error while parsing: ${error.message}`, { cause: error });
    }
  }
  set(key: string, value: JSONValue): boolean {
    try {
      this.#write(key, { key, value })
    } catch (e) {
      const log = e instanceof Error ? e.message : `${e}`;
      this.#ns.print(log);
      return false;
    }
    return true;
  }
  get(key: string): { state: 'missing' } | { state: 'error', reason: string } | { state: 'found', data: JSONValue} {
    try {
      const data = this.#read(FNV1a_64(key));
      if (Array.isArray(data)) {
        for (const entry of data) {
          if (entry.key !== key) continue;
          return { state: 'found', data: entry.value };
        }
        throw new MissingKeyError('Key not found');
      }
      if (data.key !== key) {
        throw new MissingKeyError('Key not found');
      }
      return { state: 'found', data: data.value };
    } catch (e) {
      if (e instanceof MissingKeyError) {
        this.#ns.print(`Key "${key}" missing in database`);
        return { state: 'missing' }
      }
      if (e instanceof JSONError) {
        this.#ns.print(e.message);
        return { state: 'error', reason: e.message }
      }
      const log = e instanceof Error ? e.message : `${e}`;
      const reason = `An unknown Error occurred: ${log}`
      this.#ns.print(reason);
      return { state: 'error', reason };
    }
  }
  // TODO: Implement delete & keylist
}