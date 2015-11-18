describe 'resource', ->

  httpBackend = null
  Comment = null
  comment = null

  beforeEach ->
    inject (resource, $httpBackend) ->
      httpBackend = $httpBackend
      class Comment extends resource '/posts/:post/comments/:id', {},
        ban:
          url: '/posts/:post/comments/:id/ban'
          method: 'POST'

  it "can have custom actions as class methods", ->
    Comment.ban { post: 111, id: 1234 }, {}
    httpBackend.expectPOST('/posts/111/comments/1234/ban').respond 200
    httpBackend.flush()

  it "can have custom actions as instance methods", ->
    comment = new Comment
      id: 1234
      message: "this is a comment"
      author: "John"
    comment.$ban {post: 111 }
    httpBackend.expectPOST('/posts/111/comments/1234/ban').respond 200
    httpBackend.flush()

  it "should be new when it is instantiated with a json without id", ->
    comment = new Comment
      message: "this is a comment"
      author: "John"
    expect(comment.isNew()).toBeTruthy()

  it "should not be new when it is instantiated with a json with id", ->
    comment = new Comment
      id: 1234
      message: "this is a comment"
      author: "John"
    expect(comment.isNew()).toBeFalsy()

  describe "when is new", ->
    beforeEach ->
      comment = new Comment
        message: "this is a comment"
        author: "John"

    it "should be dirty", ->
      expect(comment.isDirty()).toBeTruthy()

    describe "and it is saved", ->
      beforeEach ->
        comment.save post: 123

      it "should send a POST to the api", ->
        expected =
          message:"this is a comment"
          author:"John"

        httpBackend.expectPOST('/posts/123/comments',expected).respond 200
        httpBackend.flush()

      describe "after saving", ->
        beforeEach ->
          httpBackend.whenPOST().respond id: 222
          httpBackend.flush()

        it "it should be existing", ->
          expect(comment.isNew()).toBeFalsy()

        it "it should be pristine", ->
          expect(comment.isDirty()).toBeFalsy()

        it "it should store the id", ->
          expect(comment.id).toBe 222

  describe "when is existing", ->
    beforeEach ->
      comment = new Comment
        id: 9012
        message: "existing comment"
        author: "John"

    it "should be pristine", ->
      expect(comment.isDirty()).toBeFalsy()

    describe "and is set to dirty with a previous state", ->
      beforeEach ->
        comment.setAsDirty
          id: 9012
          message: "existing comment"
          author: "John"

        comment.message = "modified comment"
        comment.tags = ["I'm a tag"] 

      it "should be dirty", ->
        expect(comment.isDirty()).toBeTruthy()

      describe "and it is rolledback", ->
        beforeEach ->
          comment.rollback()

        it "should have the previous properties back removing those that have been added", ->
          expect(comment.message).toBe "existing comment"
          expect(comment.tags).toBeUndefined()

        it "should be pristine", ->
          expect(comment.isDirty()).toBeFalsy()

    describe "and dirty and it is saved", ->
      beforeEach ->
        comment.setAsDirty()
        comment.save post: 123

      it "it should send a PUT to the api", ->
        expected =
          id: 9012
          message:"existing comment"
          author:"John"
        httpBackend.expectPUT('/posts/123/comments/9012',expected).respond 200
        httpBackend.flush()

      it "it should set the resource as pristine", ->
        httpBackend.whenPUT().respond()
        httpBackend.flush()
        expect(comment.isDirty()).toBeFalsy()

    describe "and it is deleted", ->
      it "it should send a DELETE to the api", ->
        comment.delete post: 123
        httpBackend.expectDELETE('/posts/123/comments/9012').respond 200
        httpBackend.flush()

