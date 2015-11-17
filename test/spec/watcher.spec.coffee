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

  describe "when watcher is loaded with an existing resource", ->
    beforeEach ->
      html = """
        <form name="default" watcher-submit='{post: postId}'>
          <input ng-model="comment.message" required="required">
          <watcher resource='comment' />
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

      it "should have cancel link visible", ->
        expect(form.find('.cancel-link').hasClass('ng-hide')).toBeFalsy()

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

  describe "when watcher is loaded with a new resource", ->
    beforeEach ->
      scope.comment = new Comment
        message: "this is a comment"
        author: "John"

      scope.postId = 222

    describe "and onCancelWhenNew is not defined", ->
      beforeEach ->
        html = """
          <form name="default" watcher-submit='{post: postId}'>
            <input ng-model="comment.message" required="required">
            <watcher resource='comment' />
          </form>
        """
        compile(html)

      it "should have cancel-link hidden", ->
        expect(form.find('.cancel-link').hasClass('ng-hide')).toBeTruthy()

    describe "and onCancelWhenNew is defined", ->
      beforeEach ->
        scope.doSomething = ->
        spyOn(scope, 'doSomething')

        html = """
          <form name="default" watcher-submit='{post: postId}'>
            <input ng-model="comment.message" required="required">
            <watcher resource='comment' on-cancel-when-new='doSomething()'/>
          </form>
        """
        compile(html)

      it "should have cancel-link visible", ->
        expect(form.find('.cancel-link').hasClass('ng-hide')).toBeFalsy()

      it "should call the passed function when cancel is clicked", ->
        form.find(".cancel-link").click()
        expect(scope.doSomething).toHaveBeenCalled()
