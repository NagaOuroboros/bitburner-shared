/*
 * A JSON-backed KV database
 */

type JSONValue = JSONPrimitive | JSONArray | JSONObject;
type JSONPrimitive = string | number | boolean | null;
type JSONArray = JSONValue[];
type JSONObject = { [key: string]: JSONValue };

type Entry = { key: string, value: JSONValue };

class MissingKeyError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'MissingKeyError';
  }
}
class JSONError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'JSONError';
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
  #safeStringify(data: Entry[]) {
    try {
      return JSON.stringify(data);
    } catch (e) {
      const error = e as Error;
      throw new JSONError(`Error while stringifying: ${error.message}`, { cause: error });
    }
  }
  #formatError(e: unknown): string {
    return e instanceof Error ? e.message : `${e}`;
  }
  #toFilePath(hash: string) {
    const subdir = hash.slice(0, 2);
    return `${DB_DIRECTORY}/${subdir}/${hash}.json`;
  }
  #toTempPath(hash: string) {
    return `${DB_DIRECTORY}/tmp/${hash}-${Math.random().toString(16).slice(2)}.tmp.json`;
  }
  #isValidData(data: unknown): data is Entry[] {
    return Array.isArray(data)
      && data.every(e => 
        e != null
        && typeof e === 'object'
        && typeof (e as any).key === 'string'
        && 'value' in e
      );
  }
  #atomicWrite(tempfile: string, file: string, data: string) {
    this.#ns.write(tempfile, data, 'w');
    if (!this.#ns.fileExists(tempfile)) {
      throw new Error(`Failed to write: ${tempfile}`);
    }
    this.#ns.mv(this.#ns.self().server, tempfile, file);
  }
  #atomicDelete(tempfile: string, file: string) {
    const self = this.#ns.self().server;
    this.#ns.mv(self, file, tempfile);
    if (!this.#ns.fileExists(tempfile)) {
      throw new Error(`Failed to move: ${file}`);
    }
    this.#ns.rm(tempfile, self);
  }
  #write(key: string, data: Entry) {
    const hash = FNV1a_64(key);
    const file = this.#toFilePath(hash);
    const tempfile = this.#toTempPath(hash);

    if (!this.#ns.fileExists(file)) {
      const json = this.#safeStringify([data]);
      this.#atomicWrite(tempfile, file, json);
      return;
    }

    const filedata = this.#read(hash);
    const idx = filedata.findIndex(e => e.key === key);
    if (idx !== -1) {
      filedata[idx] = data;
    } else {
      filedata.push(data);
    }
    this.#atomicWrite(tempfile, file, this.#safeStringify(filedata));
  }
  #read(hash: string): Entry[] {
    const file = this.#toFilePath(hash);
    if (!this.#ns.fileExists(file)) {
      throw new MissingKeyError();
    }
    // ! May throw
    try {
      const data = JSON.parse(this.#ns.read(file));
      if (!this.#isValidData(data)) {
        throw new JSONError('Invalid data format - File likely corrupted');
      }
      return data;
    } catch (e) {
      if (e instanceof JSONError) throw e;
      const error = e as Error;
      throw new JSONError(`Error while parsing: ${error.message}`, { cause: error });
    }
  }
  #delete(key: string): boolean {
    const hash = FNV1a_64(key);
    const file = this.#toFilePath(hash);
    const tempfile = this.#toTempPath(hash);
    try {
      const data = this.#read(hash);
      const idx = data.findIndex(e => e.key === key);
      if (idx !== -1) {
        data.splice(idx, 1);
      } else {
        throw new MissingKeyError();
      }
      if (data.length === 0) {
        this.#atomicDelete(tempfile, file);
        return true;
      }
      const json = this.#safeStringify(data);
      this.#atomicWrite(tempfile, file, json);
      return true;
    } catch(e) { 
      if (e instanceof MissingKeyError) return false;
      throw e instanceof Error ? e : new Error(`${e}`);
    }
  }
  set(key: string, value: JSONValue): boolean {
    try {
      this.#write(key, { key, value })
    } catch (e) {
      if (e instanceof JSONError || e instanceof MissingKeyError) {
        this.#ns.print(e.message);
      } else {
        const reason = `An unknown error occurred: ${this.#formatError(e)}`
        this.#ns.print(reason);
      }
      return false;
    }
    return true;
  }
  get(key: string): { state: 'missing' } | { state: 'error', reason: string } | { state: 'found', data: JSONValue} {
    try {
      const data = this.#read(FNV1a_64(key));
      for (const entry of data) {
        if (entry.key !== key) continue;
        return { state: 'found', data: entry.value };
      }
      throw new MissingKeyError();
    } catch (e) {
      if (e instanceof MissingKeyError) {
        this.#ns.print(`Key "${key}" missing in database`);
        return { state: 'missing' }
      }
      if (e instanceof JSONError) {
        this.#ns.print(e.message);
        return { state: 'error', reason: e.message }
      }
      const reason = `An unknown Error occurred: ${this.#formatError(e)}`
      this.#ns.print(reason);
      return { state: 'error', reason };
    }
  }
  delete(key: string): boolean {
    try {
      return this.#delete(key);
    } catch (e) {
      if (e instanceof JSONError) {
        this.#ns.print(e.message);
      } else {
        this.#ns.print(`An unknown Error occurred: ${this.#formatError(e)}`);
      }
    }
    return false;
  }
  // TODO: Implement keylist
}