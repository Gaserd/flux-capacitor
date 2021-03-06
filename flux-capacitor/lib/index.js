'use strict'

const { applyMiddleware, compose } = require('redux')
const aggregateReducers = require('./aggregateReducers')
const createStore = require('./createStore')
const eventLogReducer = require('./eventLogReducer')
const reduxify = require('./reduxify')

module.exports = {
  aggregateReducers,
  applyMiddleware,
  compose,
  createStore,
  eventLogReducer,
  reduxify
}
