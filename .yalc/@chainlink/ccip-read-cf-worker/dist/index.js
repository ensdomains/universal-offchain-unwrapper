
'use strict'

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./ccip-read-cf-worker.cjs.production.min.js')
} else {
  module.exports = require('./ccip-read-cf-worker.cjs.development.js')
}
