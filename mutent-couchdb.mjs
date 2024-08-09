import nano from 'nano'

export default class CouchAdapter {
  /**
   * @constructor
   */
  constructor ({ databaseName, nanoOptions, serverScope }) {
    if (typeof databaseName !== 'string') {
      throw new TypeError('Database name must be a string')
    }
    if (!serverScope) {
      serverScope = nano(nanoOptions || 'http://127.0.0.1:5984/')
    }
    this.databaseName = databaseName
    this.raw = serverScope.db.use(databaseName)
  }

  /**
   * Read document by identifier.
   */
  async readDoc (id) {
    let doc = null
    try {
      doc = await this.raw.get(id)
    } catch (err) {
      if (Object(err).statusCode !== 404) {
        return Promise.reject(err)
      }
    }
    return doc
  }

  /**
   * Create or update a document.
   * Set `_deleted: true` to delete a document.
   */
  async writeDoc (doc) {
    const response = await this.raw.insert(doc, {
      docName: doc._id,
      rev: doc._rev
    })

    return {
      ...doc,
      _id: response.id,
      _rev: response.rev
    }
  }

  /**
   * Mutent method.
   */
  async findEntity (query, ctx) {
    if (typeof query === 'string') {
      return this.readDoc(query, ctx.options)
    }

    const docs = this.filterEntities({ ...query, limit: 1 }, ctx)

    let first = null
    for await (const doc of docs) {
      if (first) {
        throw new Error('Expected one iteration at most')
      } else {
        first = doc
      }
    }

    return first
  }

  /**
   * Mutent method.
   */
  async * filterEntities (query = {}, ctx) {
    if (typeof query === 'string') {
      // Query by identifier
      const doc = await this.readDoc(query, ctx.options)
      if (doc) {
        yield doc
      }
    } else if (Array.isArray(query)) {
      // Query a list of identifiers
      yield * this.filterView({ keys: query }, ctx.options)
    } else if (query.selector) {
      // Mango query
      yield * this.filterMango(query, ctx.options)
    } else {
      // View query
      yield * this.filterView(query, ctx.options)
    }
  }

  async * filterView (query, options = {}) {
    const keys = query.keys === undefined
      ? null
      : pushKeys(query.keys)

    const path = query.view
      ? `_design/${query.design}/_view/${query.view}`
      : '_all_docs'

    const readSize = parseReadSize(options.readSize)

    let limit = parseQueryLimit(query.limit)

    const body = {
      att_encoding_info: query.att_encoding_info,
      attachments: query.attachments,
      conflicts: query.conflicts,
      descending: query.descending,
      endkey_docid: undefined,
      endkey: undefined,
      group: false,
      include_docs: true,
      inclusive_end: query.inclusive_end,
      key: undefined,
      keys: undefined,
      limit: Math.min(readSize, limit),
      reduce: false,
      skip: query.skip,
      sorted: query.sorted,
      stable: query.stable,
      startkey_docid: undefined,
      startkey: undefined,
      update_seq: query.update_seq,
      update: query.update
    }
    if (keys) {
      body.keys = pullKeys(keys, body.limit)
    } else {
      body.endkey = query.endkey
      body.endkey_docid = query.endkey_docid
      body.inclusive_end = query.inclusive_end
      body.key = query.key
      body.startkey = query.startkey
      body.startkey_docid = query.startkey_docid
    }

    while (limit > 0) {
      const response = await this.raw.server.relax({
        db: this.databaseName,
        path,
        method: 'POST',
        body
      })

      for (const row of response.rows) {
        if (!/^_design/.test(row.id) && row.doc) {
          yield row.doc
          limit--
        }

        if (!keys) {
          body.startkey = row.key
          body.startkey_docid = row.id
        }
      }

      if (response.rows.length < body.limit) {
        break
      }

      body.limit = Math.min(readSize, limit)
      if (keys) {
        body.keys = pullKeys(keys, body.limit)
        body.skip = undefined
      } else {
        body.skip = 1
      }
    }
  }

  async * filterMango (query, options = {}) {
    const readSize = parseReadSize(options.readSize)

    let limit = parseQueryLimit(query.limit)

    const body = {
      bookmark: undefined,
      conflicts: query.conflicts,
      fields: query.fields,
      limit: Math.min(readSize, limit),
      r: query.r,
      selector: query.selector,
      skip: query.skip,
      sort: query.sort,
      stable: query.stable,
      update: query.update,
      use_index: query.use_index
    }

    while (limit > 0) {
      const response = await this.raw.find(body)
      if (response.warning) {
        console.error(`[${this.databaseName}] ${response.warning}`)
      }

      for (const doc of response.docs) {
        // TODO: is this check useful?
        if (doc) {
          yield doc
          limit--
        }
      }

      if (response.docs.length < body.limit) {
        break
      }

      body.bookmark = response.bookmark
      body.limit = Math.min(readSize, limit)
      body.skip = 0
    }
  }

  /**
   * Mutent method.
   */
  async createEntity (entity, ctx) {
    const result = await this.writeDoc(entity.target, ctx.options)
    entity.set(result)
  }

  /**
   * Mutent method.
   */
  async updateEntity (entity, ctx) {
    const result = await this.writeDoc(entity.target, ctx.options)
    entity.set(result)
  }

  /**
   * Mutent method.
   */
  async deleteEntity (entity, ctx) {
    if (ctx.options.purge) {
      throw new Error('Not implemented yet')
    }
    await this.writeDoc(
      { ...entity.target, _deleted: true },
      ctx.options
    )
  }
}

function isPositiveInteger (value) {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function parseQueryLimit (value = Number.POSITIVE_INFINITY) {
  if (!isPositiveInteger(value) && value !== Number.POSITIVE_INFINITY) {
    throw new TypeError(`Invalid query limit: ${value}`)
  }
  return value
}

function parseReadSize (value = 50) {
  if (!isPositiveInteger(value)) {
    throw new TypeError(`Invalid read size: ${value}`)
  }
  return value
}

function pushKeys (keys) {
  if (!Array.isArray(keys)) {
    throw new TypeError('View keys must be an array')
  }
  if (!keys.length) {
    throw new Error('Expected at least one key')
  }

  const map = new Map()
  for (const key of keys) {
    map.set(key, null)
  }
  return map
}

function pullKeys (map, count) {
  const arr = []

  for (const key of map.keys()) {
    if (arr.length < count) {
      arr.push(key)
      map.delete(key)
    } else {
      return arr
    }
  }
}
