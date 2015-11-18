/* angular-resource-watcher - v0.1 - 2015-11-18 */
'use strict';
var rw,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

rw = angular.module('resource.watcher', ['ngResource']).factory('resource', function($q, $resource) {
  var DirtyState, ExistingResourceState, NewResourceState, PristineState, omitPrivate;
  omitPrivate = function(obj) {
    return _.omit(obj, function(_, key) {
      return key.indexOf('_') === 0;
    });
  };
  DirtyState = (function() {
    function DirtyState(previousState) {
      this.previousState = previousState;
      this._deleteAddedProperties = __bind(this._deleteAddedProperties, this);
      this.rollback = __bind(this.rollback, this);
    }

    DirtyState.prototype.save = function(state, resource, options) {
      return state.executeSave(resource, options);
    };

    DirtyState.prototype.isDirty = function() {
      return true;
    };

    DirtyState.prototype.rollback = function(resource) {
      this._deleteAddedProperties(resource);
      resource.updateValuesWith(this.previousState);
      return resource.setAsPristine();
    };

    DirtyState.prototype._deleteAddedProperties = function(resource) {
      var addedProperties, omitPrivateAndFunctions;
      omitPrivateAndFunctions = function(obj) {
        return _.omit(omitPrivate(resource), _.isFunction);
      };
      addedProperties = _.difference(_.keys(omitPrivateAndFunctions(resource)), _.keys(this.previousState));
      return addedProperties.forEach(function(key) {
        return delete resource[key];
      });
    };

    return DirtyState;

  })();
  PristineState = (function() {
    function PristineState() {}

    PristineState.prototype.save = function() {
      return $q.when();
    };

    PristineState.prototype.isDirty = function() {
      return false;
    };

    PristineState.prototype.rollback = function() {};

    return PristineState;

  })();
  ExistingResourceState = (function() {
    function ExistingResourceState() {
      this.executeSave = __bind(this.executeSave, this);
      this.setAsDirty = __bind(this.setAsDirty, this);
      this.setAsPristine = __bind(this.setAsPristine, this);
      this.rollback = __bind(this.rollback, this);
      this.isDirty = __bind(this.isDirty, this);
      this.save = __bind(this.save, this);
      this._state = new PristineState();
    }

    ExistingResourceState.prototype.save = function(resource, options) {
      return this._state.save(this, resource, options);
    };

    ExistingResourceState.prototype["delete"] = function(resource, options) {
      return resource.sendDelete(options);
    };

    ExistingResourceState.prototype.isNew = function() {
      return false;
    };

    ExistingResourceState.prototype.isDirty = function() {
      return this._state.isDirty();
    };

    ExistingResourceState.prototype.rollback = function(resource) {
      return this._state.rollback(resource);
    };

    ExistingResourceState.prototype.setAsPristine = function() {
      return this._state = new PristineState();
    };

    ExistingResourceState.prototype.setAsDirty = function(previousState) {
      return this._state = new DirtyState(previousState);
    };

    ExistingResourceState.prototype.executeSave = function(resource, options) {
      return resource.sendPut(options).then((function(_this) {
        return function(response) {
          _this.setAsPristine();
          return response;
        };
      })(this));
    };

    return ExistingResourceState;

  })();
  NewResourceState = (function(_super) {
    __extends(NewResourceState, _super);

    function NewResourceState() {
      this._state = new DirtyState();
    }

    NewResourceState.prototype["delete"] = function() {
      return $q.when();
    };

    NewResourceState.prototype.isNew = function() {
      return true;
    };

    NewResourceState.prototype.isDirty = function() {
      return true;
    };

    NewResourceState.prototype.rollback = function() {
      throw new Error("can_not_rollback_a_new_resource");
    };

    NewResourceState.prototype.executeSave = function(resource, options) {
      return resource.sendPost(options).then(function(response) {
        resource.setAsExisting(response.id);
        return response;
      });
    };

    return NewResourceState;

  })(ExistingResourceState);
  return function(url, parameters, actions) {
    var Resource, api, defaultActions, defaultParams, toDto;
    if (parameters == null) {
      parameters = {};
    }
    if (actions == null) {
      actions = {};
    }
    toDto = function(obj) {
      return JSON.stringify(omitPrivate(obj));
    };
    defaultActions = {
      update: {
        method: 'PUT',
        transformRequest: toDto
      },
      save: {
        method: 'POST',
        transformRequest: toDto
      }
    };
    _.assign(defaultActions, actions);
    defaultParams = _.assign({
      id: '@id'
    }, parameters);
    api = $resource(url, defaultParams, defaultActions);
    Resource = (function() {
      var build;

      build = function(object) {
        return new Resource(object);
      };

      function Resource(object) {
        this.sendDelete = __bind(this.sendDelete, this);
        this.sendPut = __bind(this.sendPut, this);
        this.sendPost = __bind(this.sendPost, this);
        this.updateValuesWith = __bind(this.updateValuesWith, this);
        this.rollback = __bind(this.rollback, this);
        this.isDirty = __bind(this.isDirty, this);
        this.setAsPristine = __bind(this.setAsPristine, this);
        this.setAsDirty = __bind(this.setAsDirty, this);
        this.isNew = __bind(this.isNew, this);
        this.setAsExisting = __bind(this.setAsExisting, this);
        this["delete"] = __bind(this["delete"], this);
        this.save = __bind(this.save, this);
        this._state = this._isExisting(object) ? new ExistingResourceState() : new NewResourceState();
        this.updateValuesWith(new api(object));
      }

      Resource.prototype._isExisting = function(properties) {
        return properties != null ? properties.id : void 0;
      };

      Resource.prototype.save = function(options) {
        return this._state.save(this, options).then(function() {
          return this;
        });
      };

      Resource.prototype["delete"] = function(options) {
        return this._state["delete"](this, options);
      };

      Resource.prototype.setAsExisting = function(id) {
        this.id = id;
        return this._state = new ExistingResourceState();
      };

      Resource.prototype.isNew = function() {
        return this._state.isNew();
      };

      Resource.prototype.setAsDirty = function(previousState) {
        if (previousState == null) {
          previousState = {};
        }
        return this._state.setAsDirty(previousState);
      };

      Resource.prototype.setAsPristine = function() {
        return this._state.setAsPristine();
      };

      Resource.prototype.isDirty = function() {
        return this._state.isDirty();
      };

      Resource.prototype.rollback = function() {
        return this._state.rollback(this);
      };

      Resource.prototype.updateValuesWith = function(object) {
        return _.assign(_.assign(this, object), Object.getPrototypeOf(object));
      };

      Resource.prototype.sendPost = function(options) {
        return api.save(options, this).$promise;
      };

      Resource.prototype.sendPut = function(options) {
        return api.update(options, this).$promise;
      };

      Resource.prototype.sendDelete = function(options) {
        return api["delete"](options, this).$promise;
      };

      return Resource;

    })();
    _.assign(Resource, api);
    Resource.get = function(parameters) {
      return api.get(parameters).$promise.then(build);
    };
    Resource.query = function(parameters) {
      return api.query(parameters).$promise.then(function(arr) {
        return arr.map(build);
      });
    };
    return Resource;
  };
});

'use strict';
rw.constant("watcherConfig", {
  save: 'Guardar',
  cancel: 'Cancelar'
});

rw.directive("watcher", function(watcherConfig) {
  var template;
  template = "<div ng-show=\"isDirty()\">\n  <input type=\"submit\" ng-value=\"saveLabel\" class=\"btn btn-primary\"/><a href=\"\" ng-click=\"cancel()\" ng-show=\"cancelVisible()\" class=\"cancel-link\">{{ cancelLabel }}</a>\n</div>";
  return {
    template: template,
    restrict: 'E',
    replace: true,
    scope: {
      resource: "=",
      onCancelWhenNew: "&"
    },
    link: function(scope, formElement, attributes) {
      var watch;
      watch = function() {
        var unsubscribe;
        return unsubscribe = scope.$watch((function() {
          return scope.resource;
        }), function(newValue, oldValue) {
          if (newValue === oldValue) {
            return;
          }
          if (newValue !== oldValue) {
            scope.resource.setAsDirty(oldValue);
            return unsubscribe();
          }
        }, true);
      };
      scope.saveLabel = watcherConfig.save;
      scope.cancelLabel = watcherConfig.cancel;
      scope.cancel = function() {
        if (scope.resource.isNew()) {
          return scope.onCancelWhenNew();
        } else {
          scope.resource.rollback();
          return watch();
        }
      };
      scope.isDirty = function() {
        return scope.resource.isDirty();
      };
      scope.isNew = function() {
        return scope.resource.isNew();
      };
      scope.cancelVisible = function() {
        return !scope.isNew() || (attributes.onCancelWhenNew != null);
      };
      scope.$on('save', function(e, options) {
        return scope.resource.save(options).then(watch);
      });
      return watch();
    }
  };
}).directive("watcherSubmit", function($parse) {
  return {
    restrict: "A",
    require: "form",
    scope: false,
    link: function(scope, formElement, attributes, form) {
      form.attempt = false;
      return formElement.bind("submit", function() {
        form.attempt = true;
        if (!scope.$$phase) {
          scope.$apply();
        }
        if (!form.$valid) {
          return;
        }
        return scope.$broadcast('save', $parse(attributes.watcherSubmit)(scope));
      });
    }
  };
});
