'use strict'

rw = angular.module('resource.watcher', ['ngResource'])

.factory 'resource', ($q, $resource) ->
  omitPrivate = (obj) -> _.omitBy obj, (_, key) -> key.indexOf('_') is 0

  class DirtyState
    constructor: (@previousState) ->

    save: (state, resource, options) ->
      state.executeSave resource, options

    isDirty: ->
      true

    rollback: (resource) =>
      @_deleteAddedProperties(resource)
      resource.updateValuesWith @previousState
      resource.setAsPristine()

    _deleteAddedProperties: (resource) =>
      omitPrivateAndFunctions = (obj) -> _.omitBy omitPrivate(resource), _.isFunction
      addedProperties = _.difference _.keys(omitPrivateAndFunctions resource), _.keys(@previousState)
      addedProperties.forEach (key) -> delete resource[key]

  class PristineState
    save: ->
      $q.when()

    isDirty: ->
      false

    rollback: ->

  class ExistingResourceState
    constructor: ->
      @_state = new PristineState()

    save: (resource, options) =>
      @_state.save this, resource, options

    delete: (resource, options) ->
      resource.sendDelete options

    isNew: ->
      false

    isDirty: =>
      @_state.isDirty()

    rollback: (resource) =>
      @_state.rollback resource

    setAsPristine: =>
      @_state = new PristineState()

    setAsDirty: (previousState) =>
      @_state = new DirtyState previousState

    executeSave: (resource, options) =>
      resource.sendPut(options)
      .then (response) =>
        @setAsPristine()
        response

  class NewResourceState extends ExistingResourceState
    constructor: ->
      @_state = new DirtyState()

    delete: ->
      $q.when()

    isNew: ->
      true

    isDirty: ->
      true

    rollback: -> throw new Error "can_not_rollback_a_new_resource"

    executeSave: (resource, options) ->
      resource.sendPost(options)
      .then (response) ->
        resource.setAsExisting(response.id)
        response


  (url, parameters = {}, actions = {}) ->

    toDto = (obj) -> JSON.stringify(omitPrivate obj)
    defaultActions =
      update:
        method: 'PUT'
        transformRequest: toDto
      save:
        method: 'POST'
        transformRequest: toDto

    _.assign defaultActions, actions

    defaultParams = _.assign {id: '@id'}, parameters
    api = $resource url, defaultParams, defaultActions

    class Resource
      
      constructor: (object) ->
        @_state = if @_isExisting(object) then new ExistingResourceState() else new NewResourceState()
        @setValuesWith new api object

      _isExisting: (properties) -> properties?.id

      save: (options) =>
        @_state.save(this, options).then -> this

      delete: (options) =>
        @_state.delete this, options

      setAsExisting: (id) =>
        @id = id
        @_state = new ExistingResourceState()

      isNew: =>
        @_state.isNew()

      setAsDirty: (previousState = {}) =>
        @_state.setAsDirty(previousState)

      setAsPristine: =>
        @_state.setAsPristine()

      isDirty: =>
        @_state.isDirty()

      rollback: =>
        @_state.rollback this

      setValuesWith: (object) =>
        _.assign(_.assign(this, object), Object.getPrototypeOf(object))

      updateValuesWith: (object) =>
        @setValuesWith object
        
      sendPost: (options) =>
        api.save(options, @toDto()).$promise

      sendPut: (options) =>
        api.update(options, @toDto()).$promise

      sendDelete: (options) =>
        api.delete(options, this).$promise

      toDto: => this

    _.assign Resource, api

    Resource._build = (object) -> new this object

    Resource.get = (parameters) ->
      api.get(parameters).$promise.then (object) =>
        this._build object

    Resource.query = (parameters) ->
      api.query(parameters).$promise.then (arr) => arr.map (it) => this._build it

    Resource