var History = require('./History');
var Component = require('./Component'),
    ComponentEvent = require('./ComponentEvent'),
    ObjectComponentNotifier = require('./ObjectComponentNotifier'),
    ComponentObjectError = require('./ComponentObjectError');

function ObjectComponent(parent, object, key, params) {
    if (object[key] === undefined) {
        throw new ComponentObjectError(object, key);
    }
    params = params || {};
    params.label = params.label || key;

    Component.apply(this, [parent, params.label]);

    this._object = object;
    this._key = key;
    this._onChange = function(){};

    ObjectComponentNotifier.get().addEventListener(ComponentEvent.UPDATE_VALUE, this, 'onValueUpdate');
    this.addEventListener(ComponentEvent.VALUE_UPDATED, ObjectComponentNotifier.get(), 'onValueUpdated');
}
ObjectComponent.prototype = Object.create(Component.prototype);
ObjectComponent.prototype.constructor = ObjectComponent;

//Override in Subclass
ObjectComponent.prototype.applyValue = function() {};
ObjectComponent.prototype.onValueUpdate = function (e) {};

ObjectComponent.prototype.pushHistoryState = function () {
    var obj = this._object, key = this._key;
    History.get().pushState(obj, key, obj[key]);
};

ObjectComponent.prototype.setValue = function (value) {
    this._object[this._key] = value;
};


module.exports = ObjectComponent;
