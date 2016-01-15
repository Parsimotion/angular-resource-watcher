describe "ResourceWatcher", ->
	resourceWatcher = null
	watchedResource = null
	scope = null
	ConcreteResource = null

	beforeEach ->
		inject ($rootScope, resource, ResourceWatcher) ->
			scope = $rootScope.$new()

			class ConcreteResource extends resource '/api-mock/'

			watchedResource = new ConcreteResource
				id: 8
				name: "Yerba mate Union"
				weight: "500g"
				iHaveACollection: 
					collection: [1, 2, 3, 4]

			resourceWatcher = new ResourceWatcher scope, watchedResource
			scope.$apply()

	it "should leave the resource as not dirty on the initialization", ->
		expect(watchedResource.isDirty()).toBeFalsy()

	describe "when the resource is modified", ->
		beforeEach ->
			watchedResource.name = "Yerba mate La Tranquera"
			scope.$apply()
			watchedResource.weight = "1000g"
			scope.$apply()
			watchedResource.iHaveACollection.collection.pop()
			scope.$apply()

		it "should set the resource as dirty", ->
			expect(watchedResource.isDirty()).toBeTruthy()

		describe "and then rolled back", ->

			beforeEach ->
				resourceWatcher.cancel()
				scope.$apply()

			it "should return the resource to it's previous state on properties that apply to the pick function", ->
				expect(watchedResource.name).toBe "Yerba mate Union"

			it "should return the inner collection to its previous state", ->
				expect(watchedResource.iHaveACollection.collection.length).toBe 4

			it "should set the resource as not dirty", ->
				expect(watchedResource.isDirty()).toBeFalsy()

			it "should start watching the resource again for changes", ->
				watchedResource.name = "Yerba mate Nobleza Gaucha"
				scope.$apply()
				expect(watchedResource.isDirty()).toBeTruthy()
