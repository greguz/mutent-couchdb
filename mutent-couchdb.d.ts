import type { Adapter, Context, Entity, Generics, Store } from "mutent";
import type nano from "nano";

export interface CouchDocument {
  _id?: string;
  _rev?: string;
  _deleted?: boolean;
  _attachments?: Record<string, CouchDocumentAttachment>;
}

export interface CouchDocumentAttachment {
  /**
   * Base64 string (attachment creation only).
   */
  data?: string;
  content_type?: string;
  revpos?: number;
  digest?: string;
  length?: number;
  stub?: true;
}

/**
 * Any possible type for a CouchDB's query.
 * Pass a string to query by document's identifier.
 */
export type CouchQuery = string | string[] | MangoQuery | ViewQuery;

export interface MangoQuery extends QueryOptions {
  /**
   * JSON object describing criteria used to select documents.
   */
  selector: Record<string, any>
  /**
   * JSON array following sort syntax.
   */
  sort?: MangoSort[];
  /**
   * JSON array specifying which fields of each object should be returned.
   * If it is omitted, the entire object is returned.
   */
  fields?: string[];
  /**
   * Instruct a query to use a specific index.
   * Specified either as "<design_document>" or ["<design_document>", "<index_name>"].
   */
  use_index?: string | [string, string];
  /**
   * Read quorum needed for the result.
   *
   * @default 1
   */
  r?: number;
  /**
   * Whether or not the view in question should be updated prior to responding to the user.
   *
   * @default true
   */
  update?: boolean;
}

/**
 * Sorting syntax for Mango queries.
 */
export type MangoSort = string | string[] | { [key: string]: 'asc' | 'desc' };

export interface ViewQuery extends QueryOptions {
  /**
   * Design document's name.
   * Omit to use the default `_all_documents` view.
   */
  design?: string
  /**
   * View's name.
   * Omit to use the default `_all_documents` view.
   */
  view?: string
  /**
   * Return the documents in descending by key order.
   *
   * @default false
   */
  descending?: boolean;
  /**
   * Stop returning records when the specified key is reached.
   */
  endkey?: any;
  /**
   * Stop returning records when the specified document ID is reached.
   * Requires endkey to be specified for this to have any effect.
   */
  endkey_docid?: string;
  /**
   * Include the Base64-encoded content of `attachments` in the documents that are included if `include_docs` is `true`.
   * Ignored if `include_docs` isn’t `true`.
   *
   * @default false
   */
  attachments?: boolean;
  /**
   * Include encoding information in attachment stubs.
   * Only if the particular attachment is compressed.
   *
   * @default false
   */
  att_encoding_info?: boolean;
  /**
   * Specifies whether the specified end key should be included in the result.
   *
   * @default true
   */
  inclusive_end?: boolean;
  /**
   * Return only documents that match the specified key.
   */
  key?: any;
  /**
   * Return only documents where the key matches one of the keys specified in the array.
   */
  keys?: any[];
  /**
   * Sort returned rows.
   * Setting this to `false` offers a performance boost.
   * The `total_rows` and `offset` fields are not available when this is set to `false`.
   *
   * @default true
   */
  sorted?: boolean;
  /**
   * Return records starting with the specified key.
   */
  startkey?: any;
  /**
   * Return records starting with the specified document ID.
   * Requires `startkey` to be specified for this to have any effect.
   */
  startkey_docid?: string;
  /**
   * Response includes an update_seq value indicating which sequence id of the database the view reflects.
   *
   * @default false
   */
  update_seq?: boolean;
  /**
   * Whether or not the view in question should be updated prior to responding to the user.
   *
   * @default true
   */
  update?: boolean | "lazy";
}

/**
 * Common query options.
 */
export interface QueryOptions {
  /**
   * Include conflicts information in response.
   *
   * @default false
   */
  conflicts?: boolean;
  /**
   * Limit the number of the returned documents to the specified number.
   */
  limit?: number;
  /**
   * Skip this number of records before starting to return the results.
   *
   * @default 0
   */
  skip?: number;
  /**
   * Whether or not the view results should be returned from a stable set of shards.
   *
   * @default false
   */
  stable?: boolean;
}

export interface CouchOptions {
  /**
   * Perform a purge op instead an update.
   */
  purge?: boolean;
}

export interface CouchGenerics<T extends CouchDocument> extends Generics {
  adapter: nano.DocumentScope<T>;
  entity: T;
  query: CouchQuery;
  options: CouchOptions;
}

/**
 * Alias for a configured CouchDB store.
 */
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

declare class CouchAdapter<T extends CouchDocument> implements Adapter<CouchGenerics<T>> {
  /**
   * Name of the CouchDB database.
   */
  readonly databaseName: string;
  /**
   * Raw (internal) CouchDB official HTTP client.
   */
  readonly raw: nano.DocumentScope<T>;
  /**
   * @constructor
   */
  constructor(options: CouchAdapterOptions);
  /**
   * Mutent Adapter's method.
   */
  findEntity(query: CouchQuery | undefined, ctx: Context<CouchGenerics<T>>): Promise<T | null>;
  /**
   * Mutent Adapter's method.
   */
  filterEntities(query: CouchQuery | undefined, ctx: Context<CouchGenerics<T>>): AsyncIterable<T>;
  /**
   * Mutent Adapter's method.
   */
  createEntity(entity: Entity<T>, ctx: Context<CouchGenerics<T>>): Promise<T>;
  /**
   * Mutent Adapter's method.
   */
  updateEntity(entity: Entity<T>, ctx: Context<CouchGenerics<T>>): Promise<T>;
  /**
   * Mutent Adapter's method.
   */
  deleteEntity(entity: Entity<T>, ctx: Context<CouchGenerics<T>>): Promise<T>;
  /**
   * Retrieve a doc.
   * Not found error resolves into `null`.
   */
  readDoc(id: string, options?: CouchOptions): Promise<T | null>;
  /**
   * Create or update a document.
   * Set `_deleted: true` to delete a document.
   */
  writeDoc(document: T, options?: CouchOptions): Promise<T>;
  /**
   *
   */
  filterView(query: ViewQuery, options?: CouchOptions): AsyncIterable<T>;
  /**
   *
   */
  filterMango(query: MangoQuery, options?: CouchOptions): AsyncIterable<T>;
}

export default CouchAdapter;
