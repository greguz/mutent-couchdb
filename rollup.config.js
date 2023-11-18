export default {
  input: './mutent-couchdb.mjs',
  output: {
    file: './mutent-couchdb.cjs',
    format: 'cjs'
  },
  external: ['nano']
}
