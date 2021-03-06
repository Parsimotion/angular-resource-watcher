/* angular-resource-watcher - v1.0.0 - 2017-12-28 */
'use strict';
var rw,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

rw = angular.module('resource.watcher', ['ngResource']).factory('resource', function($q, $resource) {
  var DirtyState, ExistingResourceState, NewResourceState, PristineState, omitPrivate;
  omitPrivate = function(obj) {
    return _.omitBy(obj, function(_, key) {
      return key.indexOf('_') === 0;
    });
  };
  DirtyState = (function() {
    function DirtyState(previousState1) {
      this.previousState = previousState1;
      this._deleteAddedProperties = bind(this._deleteAddedProperties, this);
      this.rollback = bind(this.rollback, this);
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
        return _.omitBy(omitPrivate(resource), _.isFunction);
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
      this.executeSave = bind(this.executeSave, this);
      this.setAsDirty = bind(this.setAsDirty, this);
      this.setAsPristine = bind(this.setAsPristine, this);
      this.rollback = bind(this.rollback, this);
      this.isDirty = bind(this.isDirty, this);
      this.save = bind(this.save, this);
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
  NewResourceState = (function(superClass) {
    extend(NewResourceState, superClass);

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
      function Resource(object) {
        this.toDto = bind(this.toDto, this);
        this.sendDelete = bind(this.sendDelete, this);
        this.sendPut = bind(this.sendPut, this);
        this.sendPost = bind(this.sendPost, this);
        this.updateValuesWith = bind(this.updateValuesWith, this);
        this.setValuesWith = bind(this.setValuesWith, this);
        this.rollback = bind(this.rollback, this);
        this.isDirty = bind(this.isDirty, this);
        this.setAsPristine = bind(this.setAsPristine, this);
        this.setAsDirty = bind(this.setAsDirty, this);
        this.isNew = bind(this.isNew, this);
        this.setAsExisting = bind(this.setAsExisting, this);
        this["delete"] = bind(this["delete"], this);
        this.save = bind(this.save, this);
        this._state = this._isExisting(object) ? new ExistingResourceState() : new NewResourceState();
        this.setValuesWith(new api(object));
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

      Resource.prototype.setValuesWith = function(object) {
        return _.assign(_.assign(this, object), Object.getPrototypeOf(object));
      };

      Resource.prototype.updateValuesWith = function(object) {
        return this.setValuesWith(object);
      };

      Resource.prototype.sendPost = function(options) {
        return api.save(options, this.toDto()).$promise;
      };

      Resource.prototype.sendPut = function(options) {
        return api.update(options, this.toDto()).$promise;
      };

      Resource.prototype.sendDelete = function(options) {
        return api["delete"](options, this).$promise;
      };

      Resource.prototype.toDto = function() {
        return this;
      };

      return Resource;

    })();
    _.assign(Resource, api);
    Resource._build = function(object) {
      return new this(object);
    };
    Resource.get = function(parameters) {
      return api.get(parameters).$promise.then((function(_this) {
        return function(object) {
          return _this._build(object);
        };
      })(this));
    };
    Resource.query = function(parameters) {
      return api.query(parameters).$promise.then((function(_this) {
        return function(arr) {
          return arr.map(function(it) {
            return _this._build(it);
          });
        };
      })(this));
    };
    return Resource;
  };
});

'use strict';
var bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

rw.factory('CollectionWatcher', function(ResourceWatcher, $q) {
  var CollectionWatcher;
  return CollectionWatcher = (function() {
    function CollectionWatcher(scope, collection1, options) {
      this.scope = scope;
      this.collection = collection1;
      this._getOrCreateResourceWatcher = bind(this._getOrCreateResourceWatcher, this);
      this._watchResource = bind(this._watchResource, this);
      this._saveResource = bind(this._saveResource, this);
      this._rollbackCollection = bind(this._rollbackCollection, this);
      this._rollbackResources = bind(this._rollbackResources, this);
      this._createResourceWatcher = bind(this._createResourceWatcher, this);
      this.createAndAddResourceWatcher = bind(this.createAndAddResourceWatcher, this);
      this.setAsDirty = bind(this.setAsDirty, this);
      this.watchCollection = bind(this.watchCollection, this);
      this.watch = bind(this.watch, this);
      this.isNew = bind(this.isNew, this);
      this.isDirty = bind(this.isDirty, this);
      this._deleteIfNecessary = bind(this._deleteIfNecessary, this);
      this.save = bind(this.save, this);
      this._removeNewElements = bind(this._removeNewElements, this);
      this.cancel = bind(this.cancel, this);
      this.resourceWatchers = this.collection.map((function(_this) {
        return function(it) {
          return _this._createResourceWatcher(it, options);
        };
      })(this));
      this.hasChanges = false;
      this.watchCollection();
    }

    CollectionWatcher.prototype.cancel = function() {
      this._removeNewElements(this.collection);
      this._rollbackCollection();
      return this._rollbackResources();
    };

    CollectionWatcher.prototype._removeNewElements = function(collection) {
      return _.remove(collection, (function(_this) {
        return function(it) {
          return it.isNew();
        };
      })(this));
    };

    CollectionWatcher.prototype.save = function(options, arg) {
      var ref, savePromises, strict;
      strict = (ref = (arg != null ? arg : {}).strict) != null ? ref : true;
      this.watchCollection();
      this._deleteIfNecessary();
      savePromises = this.collection.map((function(_this) {
        return function(it) {
          var $save;
          $save = _this._saveResource(options, it);
          if (strict) {
            return $save;
          }
          return $save.then(function(result) {
            return {
              success: true,
              result: result
            };
          })["catch"](function(error) {
            return {
              success: false,
              error: error,
              resource: it
            };
          });
        };
      })(this));
      this.hasChanges = false;
      return $q.all(savePromises);
    };

    CollectionWatcher.prototype._deleteIfNecessary = function() {
      var toDeleteElements;
      toDeleteElements = _.reject(this.previousState, (function(_this) {
        return function(it) {
          return _.includes(_this.collection, it);
        };
      })(this));
      return toDeleteElements.forEach((function(_this) {
        return function(it) {
          return it["delete"]();
        };
      })(this));
    };

    CollectionWatcher.prototype.isDirty = function() {
      return this.hasChanges || _.some(this.collection, (function(_this) {
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

    CollectionWatcher.prototype.watch = function() {
      this.watchCollection();
      return this.resourceWatchers.forEach((function(_this) {
        return function(it) {
          return it.watch();
        };
      })(this));
    };

    CollectionWatcher.prototype.watchCollection = function() {
      var unsubscribe;
      return unsubscribe = this.scope.$watchCollection(((function(_this) {
        return function() {
          return _this.collection;
        };
      })(this)), (function(_this) {
        return function(newValue, oldValue) {
          if (newValue.length !== oldValue.length) {
            _this.setAsDirty(oldValue);
            return unsubscribe();
          }
        };
      })(this), true);
    };

    CollectionWatcher.prototype.setAsDirty = function(oldValue) {
      this.previousState = oldValue;
      return this.hasChanges = true;
    };

    CollectionWatcher.prototype.createAndAddResourceWatcher = function(resource) {
      var resourceWatcher;
      resourceWatcher = this._createResourceWatcher(resource);
      this.resourceWatchers.push(resourceWatcher);
      return resourceWatcher;
    };

    CollectionWatcher.prototype._createResourceWatcher = function(resource, options) {
      return new ResourceWatcher(this.scope, resource, options);
    };

    CollectionWatcher.prototype._rollbackResources = function() {
      this.collection.forEach((function(_this) {
        return function(it) {
          return it.rollback();
        };
      })(this));
      return this.watch();
    };

    CollectionWatcher.prototype._rollbackCollection = function() {
      _.assign(this.collection, this.previousState);
      return this.hasChanges = false;
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
        resourceWatcher = this.createAndAddResourceWatcher(resource);
      }
      return resourceWatcher;
    };

    return CollectionWatcher;

  })();
});

'use strict';
var bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

rw.factory('ResourceWatcher', function() {
  var ResourceWatcher;
  return ResourceWatcher = (function() {
    function ResourceWatcher(scope, watchedResource, arg) {
      var autoWatch;
      this.scope = scope;
      this.watchedResource = watchedResource;
      autoWatch = (arg != null ? arg : {}).autoWatch;
      this.isNew = bind(this.isNew, this);
      this.isDirty = bind(this.isDirty, this);
      this.save = bind(this.save, this);
      this.cancel = bind(this.cancel, this);
      this.watch = bind(this.watch, this);
      if (autoWatch == null) {
        autoWatch = true;
      }
      if (autoWatch) {
        this.watch();
      }
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
  template = "<aside class=\"button-container\">\n  <div ng-show=\"isDirty()\">\n    <input type=\"submit\" ng-value=\"saveLabel\" class=\"btn btn-success\"/><a href=\"\" ng-click=\"cancel()\" class=\"cancel-link\">{{ cancelLabel }}</a>\n  </div>\n</aside>";
  return {
    template: template,
    restrict: 'E',
    replace: true,
    scope: true,
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
      $scope.$on('save', function(e, options) {
        return $scope.watcher.save(options);
      });
      return this;
    }
  };
}).directive("watchResource", function(ResourceWatcher, $parse) {
  return {
    restrict: 'A',
    require: '^watcher',
    scope: false,
    link: function(scope, formElement, attrs, controller) {
      var resource;
      resource = $parse(attrs.watchResource)(scope);
      return controller.addWatcher(new ResourceWatcher(scope, resource));
    }
  };
}).directive("watchResourceCollection", function(CollectionWatcher, $parse) {
  return {
    restrict: 'A',
    scope: false,
    require: '^watcher',
    link: function(scope, formElement, attrs, controller) {
      var resources;
      resources = $parse(attrs.watchResourceCollection)(scope);
      return controller.addWatcher(new CollectionWatcher(scope, resources));
    }
  };
}).directive("customWatch", function($parse) {
  return {
    restrict: 'A',
    scope: false,
    require: '^watcher',
    link: function(scope, formElement, attrs, controller) {
      return controller.addWatcher($parse(attrs.customWatch)(scope));
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
