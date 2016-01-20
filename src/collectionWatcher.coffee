'use strict'

rw.factory 'CollectionWatcher', (ResourceWatcher, $q) ->
	class CollectionWatcher
		constructor: (@scope, @collection) ->
			@resourceWatchers = @collection.map (it) =>
				@_createResourceWatcher it
			@hasChanges = false
			@watchCollection()

		cancel: =>
			@_removeNewElements @collection
			@_rollbackCollection()
			@_rollbackResources()

		_removeNewElements: (collection) =>
			_.remove collection, (it) => it.isNew()

		save: (options) =>
			@watchCollection()
			@_deleteIfNecessary()
			savePromises = @collection.map _.partial @_saveResource, options
			$q.all savePromises
			@hasChanges = false

		_deleteIfNecessary: =>
			objectsIds = _.map @collection, (it) => it.id
			toDeleteElements = _.filter @previousState, (it) => !_.includes @collection, it
			toDeleteElements.map (it) => it.delete()

		isDirty: =>
			@hasChanges or _.some @collection, (it) => it.isDirty()

		isNew: =>
			_.some @collection, (it) => it.isNew()

		watch: =>
			@watchCollection()
			@resourceWatchers.forEach (it) => it.watch()

		watchCollection: =>
			unsubscribe = @scope.$watchCollection (=> @collection), (newValue, oldValue) =>
				if newValue.length != oldValue.length
					@setAsDirty(oldValue)
					unsubscribe()
			, true

		setAsDirty: (oldValue) =>
			@previousState = oldValue
			@hasChanges = true

		createAndAddResourceWatcher: (resource) =>
			resourceWatcher = @_createResourceWatcher resource
			@resourceWatchers.push resourceWatcher
			resourceWatcher

		_createResourceWatcher: (resource) =>
			new ResourceWatcher @scope, resource
			
		_rollbackResources: =>
			@collection.forEach (it) => it.rollback()
			@watch()

		_rollbackCollection: =>
			_.assign @collection, @previousState
			@hasChanges = false

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
