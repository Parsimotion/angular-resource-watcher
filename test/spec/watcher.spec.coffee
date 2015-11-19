describe "watcher", ->
  form = null
  scope = null
  httpBackend = null
  compile = null
  Comment = null

  beforeEach ->
    inject ($compile, $rootScope, $httpBackend, resource) ->
      httpBackend = $httpBackend
      scope = $rootScope.$new()
      class Comment extends resource '/posts/:post/comments/:id'
      compile = (html) ->
        form = $compile(angular.element html)(scope)
        scope.$digest()

  describe "when loaded with an existing resource", ->
    beforeEach ->
      html = """
        <form name="default" watcher-submit='{post: postId}'>
          <input ng-model="comment.message" required="required">
          <watcher watch-resource='comment' />
        </form>
      """
      scope.comment = new Comment
        id: 1234
        message: "this is a comment"
        author: "John"

      scope.postId = 222

      compile(html)

    it "should not be visible", ->
      expect(form.find('div[ng-show]').hasClass('ng-hide')).toBeTruthy()

    describe "and a property is changed", ->
      beforeEach ->
        scope.$apply ->
          scope.comment.message = 'another comment'

      it "should be visible", ->
        expect(form.find('div[ng-show]').hasClass('ng-hide')).toBeFalsy()

      it "should display the provided label for save and cancel buttons", ->
        expect(form.find(':submit').val()).toBe 'Guardar'
        expect(form.find('.cancel-link').html()).toBe 'Cancelar'

      it "should rollback when cancel is clicked", ->
        form.find(".cancel-link").click()
        expect(scope.comment.message).toBe "this is a comment"

      describe "and save is clicked", ->
        beforeEach ->
          form.find(':submit').click()

        it "should save the resource", ->
          expected =
            id: 1234
            message:"another comment"
            author:"John"

          httpBackend.expectPUT('/posts/222/comments/1234', expected).respond 200
          httpBackend.flush()

        describe "after sending the request", ->
          beforeEach ->
            httpBackend.whenPUT('/posts/222/comments/1234').respond 200
            httpBackend.flush()

          it "should not be visible", ->
            expect(form.find('div[ng-show]').hasClass('ng-hide')).toBeTruthy()

          it "should start watching for changes again", ->
            scope.$apply ->
              scope.comment.message = 'Otra cosa'
            expect(form.find('div[ng-show]').hasClass('ng-hide')).toBeFalsy()
  
    it "should not send a request if the form is not valid", ->
      scope.$apply ->
        scope.comment.message = ''
      form.find(':submit').click()
      httpBackend.verifyNoOutstandingRequest()

  describe "when loaded with existing resources", ->
    beforeEach ->
      html = """
        <form name="default" watcher-submit='{post: postId}'>
          <input ng-model="comments" required="required">
          <watcher watch-resource-collection='comments' />
        </form>
      """
      comment1 = new Comment
        id: 1235
        message: "this is a comment"
        author: "John"

      comment2 = new Comment
        id: 1236
        message: "this is another comment"
        author: "Ringo"

      scope.comments = [comment1, comment2]

      scope.postId = 222

      compile(html)

    it "should not be visible", ->
      expect(form.find('div[ng-show]').hasClass('ng-hide')).toBeTruthy()

    describe "and an element from the collection changes", ->
      beforeEach ->
        scope.$apply ->
          scope.comments[0].message = 'the walrus was Paul'

      it "should be visible", ->
        expect(form.find('div[ng-show]').hasClass('ng-hide')).toBeFalsy()

      it "should display the provided label for save and cancel buttons", ->
        expect(form.find(':submit').val()).toBe 'Guardar'
        expect(form.find('.cancel-link').html()).toBe 'Cancelar'

      it "should rollback when cancel is clicked", ->
        form.find(".cancel-link").click()
        expect(scope.comments[0].message).toBe "this is a comment"

      describe "and save is clicked", ->
        beforeEach ->
          form.find(':submit').click()

        it "should save the resource", ->
          expected =
            id: 1235
            message:"the walrus was Paul"
            author:"John"

          httpBackend.expectPUT('/posts/222/comments/1235', expected).respond 200
          httpBackend.flush()

        describe "after sending the request", ->
          beforeEach ->
            httpBackend.whenPUT('/posts/222/comments/1235').respond 200
            httpBackend.flush()

          it "should not be visible", ->
            expect(form.find('div[ng-show]').hasClass('ng-hide')).toBeTruthy()

          it "should start watching for changes again", ->
            scope.$apply ->
              scope.comments[1].message = 'Id like to be, under the sea'
            expect(form.find('div[ng-show]').hasClass('ng-hide')).toBeFalsy()