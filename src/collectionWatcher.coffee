'use strict'

rw.factory 'CollectionWatcher', (ResourceWatcher, $q) ->
	class CollectionWatcher
		constructor: (@scope, @collection) ->
			@resourceWatchers = @collection.map (it) =>
				@_createResourceWatcher it

		cancel: =>
			@_removeNewResources()
			@_rollbackDirtyResources()

		save: (options) =>
			savePromises = @collection.map _.partial @_saveResource, options
			$q.all savePromises

		isDirty: =>
			_.some @collection, (it) => it.isDirty()

		isNew: =>
			_.some @collection, (it) => it.isNew()

		createAndAddResourceWatcher: (resource) =>
			resourceWatcher = @_createResourceWatcher resource
			@resourceWatchers.push resourceWatcher
			resourceWatcher

		_createResourceWatcher: (resource) =>
			new ResourceWatcher @scope, resource

		_removeNewResources: =>
			newResources = @collection.filter (it) -> it.isNew()
			newResources.forEach _.partial _.remove, @collection			

		_rollbackDirtyResources: =>
			dirtyWatchers = _.filter @resourceWatchers, (it) -> it.isDirty()
			dirtyWatchers.forEach (it) -> it.cancel()

		_saveResource: (options, resource) =>
			resource.save(options)
			.then =>
				@_watchResource resource

		_watchResource: (resource) =>
			@_getOrCreateResourceWatcher(resource).watch()

		_getOrCreateResourceWatcher: (resource) =>
			resourceWatcher = _.find @resourceWatchers, (it) -> it.resource == resource
			if !resourceWatcher
				resourceWatcher = @createAndAddResourceWatcher resource
			resourceWatcher			
