var Component = require('./Component');
var History = require('../core/History');
var ControlKitShared = require('../ControlKitShared');
var ComponentEvent = require('./ComponentEvent');


function ObjectComponent(parent,object,key,params) {
    if(object[key] === undefined){
        throw new ReferenceError('Object of type ' + object.constructor.name + ' has no member ' + key + '.');
    }

    params       = params || {};
    params.label = params.label || key;

    Component.apply(this,[parent,params.label]);

    this._object   = object;
    this._key      = key;

    this._onChange = function(){};
    this._onFinish = function(){};

    var base = ControlKitShared.get();
    base.addEventListener(ComponentEvent.UPDATE_VALUE, this,'onValueUpdate');
    this.addEventListener(ComponentEvent.VALUE_UPDATED, base, 'onValueUpdated');
}

ObjectComponent.prototype = Object.create(Component.prototype);

//Override in Subclass
ObjectComponent.prototype.applyValue = function() {};
ObjectComponent.prototype.onValueUpdate = function(e) {};

ObjectComponent.prototype.pushHistoryState = function() {
    var obj = this._object, key = this._key;
    History.getInstance().pushState(obj, key, obj[key]);
};

ObjectComponent.prototype.setValue = function(value) {
    this._object[this._key] = value;
};

module.exports = ObjectComponent;
