'use strict'

rw.constant "watcherConfig",
  save: 'Guardar'
  cancel: 'Cancelar'

rw.directive "watcher", (watcherConfig, ResourceWatcher, CollectionWatcher, $parse) ->
  template = """
<aside>
  <div class="button-container" ng-show="isDirty()">
    <input type="submit" ng-value="saveLabel" class="btn btn-success"/><a href="" ng-click="cancel()" class="cancel-link">{{ cancelLabel }}</a>
  </div>
</aside>
  """

  template: template
  restrict: 'E'
  replace: true
  scope: true

  controller: ($scope, $attrs) ->
    @addWatcher = (watcher) ->
      $scope.watcher = watcher

    $scope.saveLabel = watcherConfig.save
    $scope.cancelLabel = watcherConfig.cancel

    $scope.cancel = ->
      $scope.watcher.cancel()

    $scope.isDirty = ->
      $scope.watcher.isDirty()

    $scope.isNew = ->
      $scope.watcher.isNew()

    $scope.$on 'save', (e, options) ->
     $scope.watcher.save(options)


.directive "watchResource", (ResourceWatcher, $parse) ->
  restrict: 'A'
  require: '^watcher'
  scope: false

  link: (scope, formElement, attrs, controller) ->
    resource = $parse(attrs.watchResource)(scope)
    controller.addWatcher new ResourceWatcher(scope, resource)


.directive "watchResourceCollection", (CollectionWatcher, $parse) ->
  restrict: 'A'
  scope: false
  require: '^watcher'

  link: (scope, formElement, attrs, controller) ->
    resources = $parse(attrs.watchResourceCollection)(scope)
    controller.addWatcher new CollectionWatcher(scope, resources)


.directive "customWatch", ($parse) ->
  restrict: 'A'
  scope: false
  require: '^watcher'

  link: (scope, formElement, attrs, controller) ->
    controller.addWatcher $parse(attrs.customWatch)(scope)


.directive "watcherSubmit", ($parse) ->

  restrict: "A"
  require: "form"
  scope: false

  link: (scope, formElement, attributes, form) ->
    form.attempt = false
    formElement.bind "submit", ->
      form.attempt = true
      scope.$apply() unless scope.$$phase
      if !form.$valid then return
      scope.$broadcast 'save', $parse(attributes.watcherSubmit)(scope)