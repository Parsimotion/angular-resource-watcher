'use strict'

rw.factory 'ResourceWatcher', ->
  class ResourceWatcher
    constructor: (@scope, @watchedResource, { autoWatch } = {}) ->
      autoWatch ?= true
      @watch() if autoWatch

    watch: =>
      unsubscribe = @scope.$watch (=> @watchedResource), (newValue, oldValue) =>
        if newValue != oldValue
          @watchedResource.setAsDirty oldValue
          unsubscribe()
      , true

    cancel: =>
      @watchedResource.rollback()
      @watch()

    save: (options) =>
      @watchedResource.save(options).then @watch

    isDirty:  =>
      @watchedResource.isDirty()

    isNew: =>
       @watchedResource.isNew()
