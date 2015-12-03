# angular-resource-watcher
##### Extension to angular $resource that provides the logic for showing and hidding save/cancel buttons.
Angular version 1.3+ is required.

# Installation

    $ bower install angular-resource-watcher --save

To use, include "resource.watcher" as a dependency in your Angular module:
```
angular.module('myModule', ['resource.watcher']);
```

# Features
  * When a Resource is new (doesn't have the property id) and save is called, it sends a POST. When it is an existing Resource (it has the property id) and save is called, it sends a PUT.
  * When a Resource has not been change and save is called it doesn't send any request.
  * A Resource can rollback to a previous state (cancel logic)
  * The Watcher directive watches for changes on a resource. When the resource is changed, the watcher displays the saver or cancel buttons
  * Form validation

# Usage

### Resource
Same as $resource but without the $

For example:
`class Comment extends resource '/posts/:post/comments/:id'`

### Watcher
```html
<form name="default" watcher-submit='{post: postId}'>
  <input ng-model="comment.message" required="required">
  <watcher resource='comment' on-cancel-when-new='doSomething()'/>
</form>
```
