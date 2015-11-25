'use strict'

rw.factory 'CollectionWatcher', (ResourceWatcher, $q) ->
	class CollectionWatcher
		constructor: (@scope, @collection) ->
			@resourceWatchers = @collection.map (it) =>
				@_createResourceWatcher it

		cancel: =>
			@_removeNewElements @collection
			@_rollbackResources()

		_removeNewElements: (collection) =>
			_.remove collection, (it) => it.isNew()

		save: (options) =>
			savePromises = @collection.map _.partial @_saveResource, options
			$q.all savePromises

		isDirty: =>
			_.some @collection, (it) => it.isDirty()

		isNew: =>
			_.some @collection, (it) => it.isNew()

		watch: =>
			@resourceWatchers.forEach (it) => it.watch()

		createAndAddResourceWatcher: (resource) =>
			resourceWatcher = @_createResourceWatcher resource
			@resourceWatchers.push resourceWatcher
			resourceWatcher

		_createResourceWatcher: (resource) =>
			new ResourceWatcher @scope, resource
			
		_rollbackResources: =>
			@collection.forEach (it) => it.rollback()
			@watch()

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
