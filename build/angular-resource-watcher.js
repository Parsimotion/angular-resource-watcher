/* angular-resource-watcher - v0.0.2 - 2015-11-18 */
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
    var Resource, api, build, defaultActions, defaultParams, toDto;
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
    build = function(object) {
      return new Resource(object);
    };
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
var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

rw.factory('CollectionWatcher', function(ResourceWatcher, $q) {
  var CollectionWatcher;
  return CollectionWatcher = (function() {
    function CollectionWatcher(scope, collection) {
      this.scope = scope;
      this.collection = collection;
      this._getOrCreateResourceWatcher = __bind(this._getOrCreateResourceWatcher, this);
      this._watchResource = __bind(this._watchResource, this);
      this._saveResource = __bind(this._saveResource, this);
      this._rollbackDirtyResources = __bind(this._rollbackDirtyResources, this);
      this._removeNewResources = __bind(this._removeNewResources, this);
      this._createResourceWatcher = __bind(this._createResourceWatcher, this);
      this.isNew = __bind(this.isNew, this);
      this.isDirty = __bind(this.isDirty, this);
      this.save = __bind(this.save, this);
      this.cancel = __bind(this.cancel, this);
      this.resourceWatchers = this.collection.map((function(_this) {
        return function(it) {
          return _this._createResourceWatcher(it);
        };
      })(this));
    }

    CollectionWatcher.prototype.cancel = function() {
      this._removeNewResources();
      return this._rollbackDirtyResources();
    };

    CollectionWatcher.prototype.save = function(options) {
      var savePromises;
      savePromises = this.collection.map(_.partial(this._saveResource, options));
      return $q.all(savePromises);
    };

    CollectionWatcher.prototype.isDirty = function() {
      return _.some(this.collection, (function(_this) {
        return function(it) {
          return it.isDirty();
        };
      })(this));
    };

    CollectionWatcher.prototype.isNew = function() {
      return _.some(this.collection, (function(_this) {
        return function(it) {
          return it.isNew();
        };
      })(this));
    };

    CollectionWatcher.prototype._createResourceWatcher = function(resource) {
      return new ResourceWatcher(this.scope, resource);
    };

    CollectionWatcher.prototype._removeNewResources = function() {
      var newResources;
      newResources = this.collection.filter(function(it) {
        return it.isNew();
      });
      return newResources.forEach(_.partial(_.remove, this.collection));
    };

    CollectionWatcher.prototype._rollbackDirtyResources = function() {
      var dirtyWatchers;
      dirtyWatchers = _.filter(this.resourceWatchers, function(it) {
        return it.isDirty();
      });
      return this._getDirtyWatchers().forEach(function(it) {
        return it.cancel();
      });
    };

    CollectionWatcher.prototype._saveResource = function(options, resource) {
      return resource.save(options).then((function(_this) {
        return function() {
          return _this._watchResource(resource);
        };
      })(this));
    };

    CollectionWatcher.prototype._watchResource = function(resource) {
      return this._getOrCreateResourceWatcher(resource).watch();
    };

    CollectionWatcher.prototype._getOrCreateResourceWatcher = function(resource) {
      var resourceWatcher;
      resourceWatcher = _.find(this.resourceWatchers, function(it) {
        return it.resource === resource;
      });
      if (!resourceWatcher) {
        resourceWatcher = this._createResourceWatcher(resource);
        this.resourceWatchers.push(resourceWatcher);
      }
      return resourceWatcher;
    };

    return CollectionWatcher;

  })();
});

'use strict';
var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

rw.factory('ResourceWatcher', function() {
  var ResourceWatcher;
  return ResourceWatcher = (function() {
    function ResourceWatcher(scope, watchedResource) {
      this.scope = scope;
      this.watchedResource = watchedResource;
      this.isNew = __bind(this.isNew, this);
      this.isDirty = __bind(this.isDirty, this);
      this.save = __bind(this.save, this);
      this.cancel = __bind(this.cancel, this);
      this.watch = __bind(this.watch, this);
      this.watch();
    }

    ResourceWatcher.prototype.watch = function() {
      var unsubscribe;
      return unsubscribe = this.scope.$watch(((function(_this) {
        return function() {
          return _this.watchedResource;
        };
      })(this)), (function(_this) {
        return function(newValue, oldValue) {
          if (newValue !== oldValue) {
            _this.watchedResource.setAsDirty(oldValue);
            return unsubscribe();
          }
        };
      })(this), true);
    };

    ResourceWatcher.prototype.cancel = function() {
      this.watchedResource.rollback();
      return this.watch();
    };

    ResourceWatcher.prototype.save = function(options) {
      return this.watchedResource.save(options).then(this.watch);
    };

    ResourceWatcher.prototype.isDirty = function() {
      return this.watchedResource.isDirty();
    };

    ResourceWatcher.prototype.isNew = function() {
      return this.watchedResource.isNew();
    };

    return ResourceWatcher;

  })();
});

'use strict';
rw.constant("watcherConfig", {
  save: 'Guardar',
  cancel: 'Cancelar'
});

rw.directive("watcher", function(watcherConfig, ResourceWatcher, CollectionWatcher, $parse) {
  var template;
  template = "<div ng-show=\"isDirty()\">\n  <input type=\"submit\" ng-value=\"saveLabel\" class=\"btn btn-primary\"/><a href=\"\" ng-click=\"cancel()\" class=\"cancel-link\">{{ cancelLabel }}</a>\n</div>";
  return {
    template: template,
    restrict: 'E',
    replace: true,
    scope: false,
    controller: function($scope, $attrs) {
      this.addWatcher = function(watcher) {
        return $scope.watcher = watcher;
      };
      $scope.saveLabel = watcherConfig.save;
      $scope.cancelLabel = watcherConfig.cancel;
      $scope.cancel = function() {
        return $scope.watcher.cancel();
      };
      $scope.isDirty = function() {
        return $scope.watcher.isDirty();
      };
      $scope.isNew = function() {
        return $scope.watcher.isNew();
      };
      return $scope.$on('save', function(e, options) {
        return $scope.watcher.save(options);
      });
    }
  };
}).directive("watchResource", function(ResourceWatcher, $parse) {
  return {
    restrict: 'A',
    require: '^watcher',
    scope: {
      watchResource: '='
    },
    link: function(scope, formElement, attrs, controller) {
      var resource;
      resource = $parse(scope.watchResource)(scope);
      return controller.addWatcher(new ResourceWatcher(scope, resource));
    }
  };
}).directive("watchResourceCollection", function(CollectionWatcher, $parse) {
  return {
    restrict: 'A',
    require: '^watcher',
    scope: {
      watchResourceCollection: '='
    },
    link: function(scope, formElement, attrs, controller) {
      var resources;
      resources = $parse(scope.watchResourceCollection)(scope);
      return controller.addWatcher(new CollectionWatcher(scope, resources));
    }
  };
}).directive("customWatch", function($parse) {
  return {
    restrict: 'A',
    require: '^watcher',
    scope: {
      customWatch: '='
    },
    link: function(scope, formElement, attrs, controller) {
      return controller.addWatcher($parse(scope.customWatch)(scope));
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
