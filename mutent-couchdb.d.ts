import { Adapter, Generics, Store } from "mutent";
import nano from "nano";

export interface CouchDocument {
  _id?: string;
  _rev?: string;
  _deleted?: boolean;
  _attachments?: Record<string, CouchDocumentAttachment>;
}

export interface CouchDocumentAttachment {
  data?: string;
  content_type?: string;
  revpos?: number;
  digest?: string;
  length?: number;
  stub?: true;
}

/**
 * A string means a single document identifier.
 */
export type CouchQuery = string | CouchMangoQuery | CouchViewQuery;

export interface CouchViewQuery {
  _design: string;
  _view: string;
  startkey?: any;
  endkey?: any;
  key?: any;
  keys?: any[];
}

export interface CouchMangoQuery {
  [key: string]: any;
}

export interface CouchOptions {
  fields?: string[];
  sort?: string[] | Array<Record<string, "asc" | "desc">>;
  limit?: number;
  skip?: number;
  /**
   * Perform a purge op instead an update.
   */
  purge?: boolean;
  /**
   * Descending order while using views.
   */
  descending?: boolean;
  /**
   * Toggle view results sorting.
   * @default true
   */
  sorted?: boolean;
  /**
   *
   */
  inclusiveEnd?: boolean;
}

export interface CouchGenerics<T extends CouchDocument> extends Generics {
  adapter: CouchAdapter<T>;
  entity: T;
  query: CouchQuery;
  options: CouchOptions;
}

export type CouchStore<T extends CouchDocument> = Store<CouchGenerics<T>>;

export interface CouchAdapterOptions {
  /**
   * Database name.
   */
  databaseName: string;
  /**
   * Custom nano instance options.
   *
   * @default "http://127.0.0.1:5984/"
   */
  nanoOptions?: nano.Configuration | string;
  /**
   * Initialized server scope.
   * Has precendence over `nanoOptions`.
   */
  serverScope?: nano.ServerScope;
}

declare class CouchAdapter<T extends CouchDocument>
  implements Adapter<{ entity: T; options: CouchOptions; query: CouchQuery }>
{
  /**
   *
   */
  readonly databaseName: string;
  /**
   *
   */
  readonly scope: nano.DocumentScope<T>;
  /**
   *
   */
  constructor(options: CouchAdapterOptions);
  /**
   * Read document by identifier.
   */
  read(id: string, options?: CouchOptions): Promise<T | null>;
  /**
   * Create or update a document.
   * Set `_deleted: true` to delete a document.
   */
  write(document: T, options?: CouchOptions): Promise<T>;
  /**
   * Mutent method.
   */
  find(query: CouchQuery | undefined, options: CouchOptions): Promise<T | null>;
  /**
   * Mutent method.
   */
  filter(
    query: CouchQuery | undefined,
    options: CouchOptions
  ): AsyncIterable<T>;
  /**
   *
   */
  filterView(query: CouchViewQuery, options: CouchOptions): AsyncIterable<T>;
  /**
   *
   */
  filterMango(query: CouchMangoQuery, options: CouchOptions): AsyncIterable<T>;
  /**
   * Mutent method.
   */
  create(data: T, options: CouchOptions): Promise<T>;
  /**
   * Mutent method.
   */
  update(oldData: T, newData: T, options: CouchOptions): Promise<T>;
  /**
   * Mutent method.
   */
  delete(data: T, options: CouchOptions): Promise<T>;
}

export default CouchAdapter;
