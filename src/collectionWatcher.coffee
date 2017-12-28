'use strict'

rw.factory 'CollectionWatcher', (ResourceWatcher, $q) ->
	class CollectionWatcher
		constructor: (@scope, @collection, options) ->
			@resourceWatchers = @collection.map (it) =>
				@_createResourceWatcher it, options
			@hasChanges = false
			@watchCollection()

		cancel: =>
			@_removeNewElements @collection
			@_rollbackCollection()
			@_rollbackResources()

		_removeNewElements: (collection) =>
			_.remove collection, (it) => it.isNew()

		save: (options, { strict = true } = { }) =>
			@watchCollection()
			@_deleteIfNecessary()
			savePromises = @collection.map (it) =>
				$save = @_saveResource(options, it)
				return $save if strict
				$save
				.then (result) -> { success: true, result }
				.catch (error) -> { success: false, error }

			@hasChanges = false      
			$q.all savePromises

		_deleteIfNecessary: =>
			toDeleteElements = _.reject @previousState, (it) => _.includes @collection, it
			toDeleteElements.forEach (it) => it.delete()

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

		_createResourceWatcher: (resource, options) =>
			new ResourceWatcher @scope, resource, options
			
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
