# mutent-couchdb

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

CouchDB adapter for [Mutent](https://github.com/greguz/mutent).

## Features

- Single standardized API for all search types (view, `_all_docs`, and Mango).
- Automatic pagination for views and Mango queries.
- Automatic exclusion of design documents.
- Expose raw `nano` instance used internally.
- Both ESM and CommonJS support.

## Example

```javascript
import { Store } from 'mutent'
import CouchAdapter from 'mutent-couchdb'

const supes = new Store({
  adapter: new CouchAdapter({
    databaseName: 'supes',
    nanoOptions: {
      url: 'http://127.0.0.1:5984/'
    }
  })
})

const ashley = await supes
  .create({ name: 'Ashley Barrett' }) // spoiler!
  .unwrap()

const homelander = await supes
  .find({
    selector: { // Mango query selector
      name: 'Homelander'
    }
  })
  .unwrap()

const moreThanSeven = await supes
  .filter({
    design: 'ddoc_name', // View query
    view: 'by_group',
    key: 'The Seven'
  })
  .unwrap()
```

## API

### Exports

This module only default exports the `CouchAdapter` class constuctor.

```javascript
import CouchAdapter from 'mutent-couchdb'

const adapter = new CouchAdapter({
  databaseName: 'supes',
  nanoOptions: {
    // see nano docs
  },
  serverScope // already-created instance of nano server scope
})
```

### Query format

**String or Array of Strings**: The adapter uses the default `_add_docs` view to retrieve documents by their identifiers.

```javascript
// direct GET /db/doc_id
const doc = await store
  .find('64fb11c4-7c33-430c-8f17-fa63fa41933c')
  .unwrap()

// use _all_docs view
const docs = await store
  .filter([
    'a3ee2134-5714-44d1-b0c5-d3ee212b7551',
    '9326f6ad-386f-4765-aaa4-35c003349584',
    '6c64b25c-26ee-439c-a535-5da8efc0cc95'
  ])
  .unwrap()
```

**Object with `selector` field**: If the object contains a `selector` property, the adapter performs a Mango query using that selector.

```javascript
const docs = await store
  .filter({
    selector: { // Mango selector
      name: 'Homelander'
    },
    limit: 7,
    conflicts: true,
    stable: true
  })
  .unwrap()
```

**Object with both `view` and `design` fields**: If both `view` and `design` properties are provided, the adapter queries the specified view.

```javascript
const docs = await store
  .filter({
    design: 'ddoc_name',
    view: 'view_name',
    startkey: null,
    endkey: {},
    conflicts: true,
    stable: true
  })
  .unwrap()
```

**Default Case**: If none of the above conditions are met, the adapter uses the default `_all_docs` view to perform the search.

```javascript
const docs = await store
  .filter({ // _all_docs view is implicit
    keys: [
      'a3ee2134-5714-44d1-b0c5-d3ee212b7551',
      '9326f6ad-386f-4765-aaa4-35c003349584',
      '6c64b25c-26ee-439c-a535-5da8efc0cc95'
    ],
    conflicts: true,
    stable: true
  })
  .unwrap()
```

All cases are automatically paginated (and fully optimized) by `readSize` value. See `readSize` option for more info.

All other View (or Mango) options can also be specified (see CouchDB docs for more info).

### Unwrap options

#### `[readSize]: <Number>`

Number of documents downloaded per-request.

Default `50`.

#### `[purge]: <Boolean>`

Purge instead of "classic delete" (setting `_deleted: true`).

Default `false`.
