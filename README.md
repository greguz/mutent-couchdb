# mutent-couchdb

CouchDB adapter for [Mutent](https://github.com/greguz/mutent).

```javascript
import { Store } from 'mutent'
import CouchAdapter from 'mutent-couchdb'

const store = new Store({
  adapter: new CouchAdapter({
    databaseName: 'my-docs',
    nanoOptions: {
      url: 'http://127.0.0.1:5984/'
    }
  })
})

// Mango query by default
const mangoDoc = await store.find({ with: 'mango' }).unwrap()
if (mangoDoc) {
  console.log(`doc ${mangoDoc._id} found using mango`)
}

// Use _design and _view props to specify view queries
const viewDoc = store.find({
  _design: 'default',
  _view: 'by_hello',
  key: 'view'
}).unwrap()
if (viewDoc) {
  console.log(`doc ${viewDoc._id} found using view`)
}
```
