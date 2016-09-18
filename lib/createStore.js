const combineChangesets = require('./database/combineChangesets')

/**
 * Creates a store that manages the event log as well as the reduced tables.
 * Never mutate the database's tables manually. Always call `.dispatch()` on
 * this store.
 *
 * @param {Function} reducer
 * @param {Database} database
 * @param {Function} [enhancer]
 * @return {Store}
 */
function createStore (reducer, database, enhancer) {
  if (typeof database === 'function' && typeof enhancer === 'undefined') {
    enhancer = database
    database = undefined
  }

  if (enhancer) {
    if (typeof enhancer !== 'function') {
      throw new Error(`Expected enhancer to be a function, but got: ${typeof enhancer}`)
    }

    return enhancer(createStore)(reducer, database)
  }

  if (typeof reducer !== 'function') {
    throw new Error(`Expected reducer to be a function, but got: ${typeof reducer}`)
  }

  if (!database) {
    throw new Error(`Expected a database to be used by the store.`)
  }

  return _createStore(reducer, database)
}

module.exports = createStore

/**
 * @param {Function} reducer
 * @param {Database} database
 * @return {Store}
*/
function _createStore (reducer, database) {
  let currentReducer = reducer
  let currentListeners = []

  function dispatch (event) {
    if (typeof event !== 'object') {
      throw new Error(`Expected event to be an object, but got: ${typeof event}`)
    }
    if (!event.type || typeof event.type !== 'string') {
      throw new Error(`Expected event to have a type.`)
    }

    const events = Array.isArray(event) ? event : [ event ]
    return _dispatch(reducer, database, events)
  }

  function getDatabase () {
    return database
  }

  function subscribe (listener) {
    if (typeof listener !== 'function') {
      throw new Error(`Expected listener to be a function, but got: ${typeof listener}`)
    }

    let isSubscribed = true
    currentListeners.push(listener)

    return function unsubscribe () {
      if (isSubscribed) {
        isSubscribed = false
        const index = currentListeners.indexOf(listener)
        currentListeners = currentListeners.splice(listener, 1)
      }
    }
  }

  return {
    dispatch, getDatabase, subscribe
  }
}

/**
 * @param {Function} reducer
 * @param {Database} database
 * @param {Array<Event>} rawEvents
 * @return {Promise<Array<Event>>}
 */
function _dispatch (reducer, database, rawEvents) {
  const events = rawEvents.map((rawEvent) => prepareEventForLog(database, rawEvent))

  const reducerDbChangesets = events.map((event) => reducer(database, event))
  const aggregatedChangeset = combineChangesets(reducerDbChangesets)

  return database.transaction((transaction) =>
    transaction.perform(aggregatedChangeset)
  ).then(() => events)
}

function prepareEventForLog (database, event) {
  return Object.assign({}, event, {
    id: database.createEventId()
  })
}