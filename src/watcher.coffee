'use strict'

rw.constant "watcherConfig",
  save: 'Guardar'
  cancel: 'Cancelar'

rw.directive "watcher", (watcherConfig) ->
  template = """
<div ng-show="isDirty()">
  <input type="submit" ng-value="saveLabel" class="btn btn-primary"/><a href="" ng-click="cancel()" ng-show="cancelVisible()" class="cancel-link">{{ cancelLabel }}</a>
</div>
  """

  template: template
  restrict: 'E'
  replace: true
  scope:
    resource: "="
    onCancelWhenNew: "&"

  link: (scope, formElement, attributes) ->

    watch = ->
      unsubscribe = scope.$watch (-> scope.resource), (newValue, oldValue) ->
        return if newValue == oldValue
        if newValue != oldValue
          scope.resource.setAsDirty(oldValue)
          unsubscribe()
      , true

    scope.saveLabel = watcherConfig.save
    scope.cancelLabel = watcherConfig.cancel

    scope.cancel = ->
      if scope.resource.isNew()
        scope.onCancelWhenNew()
      else
        scope.resource.rollback()
        watch()

    scope.isDirty = ->
      scope.resource.isDirty()

    scope.isNew = ->
      scope.resource.isNew()

    scope.cancelVisible = ->
      not scope.isNew() or attributes.onCancelWhenNew?

    scope.$on 'save', (e, options) ->
      scope.resource.save(options).then watch

    watch()

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