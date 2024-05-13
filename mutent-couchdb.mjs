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
    this.scope = serverScope.db.use(databaseName)
  }

  // TODO: bulk
  // TODO: what about conflicts?

  /**
   * Read document by identifier.
   */
  async read (id) {
    let doc = null
    try {
      doc = await this.scope.get(id)
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
  async write (doc) {
    const response = await this.scope.insert(doc, {
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
  async find (query, options) {
    const docs = this.filter(query, {
      ...options,
      limit: 1
    })

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
  async * filter (query = {}, options) {
    if (typeof query === 'string') {
      const doc = await this.read(query, options)
      if (doc) {
        yield doc
      }
    } else if (
      typeof query === 'object' &&
      query !== null &&
      typeof query._design === 'string' &&
      typeof query._view === 'string'
    ) {
      yield * this.filterView(query, options)
    } else {
      yield * this.filterMango(query, options)
    }
  }

  async * filterView (query, options) {
    // TODO: support multiple queries (see _view POST couchdb docs)
    let skip = options.skip || 0
    const limit = (options.limit || Number.POSITIVE_INFINITY) + skip
    const size = 50

    while (skip < limit) {
      const page = Math.min(size, limit - skip)

      const response = await this.scope.view(query._design, query._view, {
        ...options,
        group: false,
        include_docs: true,
        key: query.key,
        keys: query.keys,
        limit: page,
        reduce: false,
        skip,
        startkey: query.startkey,
        endkey: query.endkey
      })

      for (const row of response.rows) {
        // TODO: this seems to be a couchdb bug (doc shouldn't be null)
        if (row.doc) {
          yield row.doc
        }
        skip++
      }

      if (response.rows.length < page) {
        skip = limit
      }
    }
  }

  async * filterMango (query, options) {
    if (query._design || query._view) {
      throw new Error('This seems a view query')
    }

    const limit = options.limit || Number.POSITIVE_INFINITY
    const size = 50

    let bookmark
    let count = 0

    while (count < limit) {
      const page = Math.min(size, limit - count)

      const response = await this.scope.find({
        ...options,
        selector: query,
        bookmark,
        limit: page
      })
      if (response.warning) {
        console.error(`[${this.databaseName}] ${response.warning}`)
      }

      for (const doc of response.docs) {
        count++
        yield doc
      }

      if (response.docs.length < page) {
        count = limit
      } else {
        bookmark = response.bookmark
      }
    }
  }

  /**
   * Mutent method.
   */
  async create (data, options) {
    return this.write(data, options)
  }

  /**
   * Mutent method.
   */
  async update (oldData, newData, options) {
    return this.write(newData, options)
  }

  /**
   * Mutent method.
   */
  async delete (data, options) {
    if (options.purge) {
      // TODO: purge conflicts also
      await this.scope.server.request({
        db: this.databaseName,
        path: '_purge',
        method: 'POST',
        body: {
          [data._id]: [data._rev]
        }
      })
    } else {
      await this.write({
        ...data,
        _deleted: true
      })
    }
  }
}
