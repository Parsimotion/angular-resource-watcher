describe "CollectionWatcher", ->

	collectionWatcher = null
	scope = null
	httpBackend = null
	resource1 = null
	resource2 = null
	collection = null
	ConcreteClass = null

	beforeEach ->
		inject ($rootScope, resource, $httpBackend, CollectionWatcher) ->
			scope = $rootScope.$new()
			httpBackend = $httpBackend

			ConcreteClass = class ConcreteResource extends resource '/api-mock/'

			resource1 = new ConcreteClass id: 21, name: "Yerba mate Union"
			resource2 = new ConcreteClass
				id: 22
				name: "Harina Blancaflor"
				iHaveACollection:
					collection: [1, 2, 3, 4]

			collection = [resource1, resource2]
			collectionWatcher = new CollectionWatcher scope, collection
			scope.$apply()

	it "should watch for changes on the resources in the collection when initialized", ->
		scope.$apply ->
			resource1.name = "Yerba mate La Tranquera"
		expect(resource1.isDirty()).toBeTruthy()

	it "should return false when isDirty is called and there are no dirty resources", ->
		expect(collectionWatcher.isDirty()).toBeFalsy()

	it "should return true when isDirty is called and there is at least one dirty resource", ->
		scope.$apply ->
			resource1.name = "Yerba mate La Tranquera"
		expect(collectionWatcher.isDirty()).toBeTruthy()

	it "should watch again an existing resource when watchResource is called", ->
		scope.$apply ->
			resource1.name = "Yerba mate La Tranquera"
		resource1.setAsPristine()
		scope.$apply ->
			collectionWatcher._watchResource resource1
		scope.$apply ->
			resource1.name = "Yerba mate Nobleza Gaucha"
		expect(resource1.isDirty()).toBeTruthy()

	describe "when rolledback", ->
		beforeEach ->
			scope.$apply ->
				resource1.name = "Yerba mate La Tranquera"
				collection.push new ConcreteClass name: "Pan rallado Preferido"
			scope.$apply ->
				collectionWatcher.cancel()

		it "should revert modified resources to the previous state", ->
			expect(resource1.name).toBe "Yerba mate Union"

		it "should remove new resources from collection", ->
			expect(collection.length).toBe 2

		it "should not be dirty", ->
			expect(collectionWatcher.isDirty()).toBeFalsy()

		it "should watch resources for future changes", ->
			scope.$apply ->
				resource1.name = "Yerba mate Nobleza Gaucha"
			expect(collectionWatcher.isDirty()).toBeTruthy()

	describe "when an element is removed from the collection", ->
		beforeEach ->
			scope.$apply ->
				_.pull collection, resource1

		it "should be dirty", ->
			expect(collectionWatcher.isDirty()).toBeTruthy()

		it "when saved should delete the corresponding elements", ->
			collectionWatcher.save()
			httpBackend.expectDELETE("/api-mock?id=21").respond 200
			httpBackend.flush()

		it "when canceled should add the deleted elements again", ->
			collectionWatcher.cancel()
			expect(collectionWatcher.collection).toEqual [resource1, resource2]