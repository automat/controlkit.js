var ErrorUtil = require('../error/ckErrorUtil');
var Component = require('./Component');
//var Base = require('../ckKit');
var Error = require('../error/ckError');
var EventType = require('../event/EventType');
var History = require('../History');

var BaseShared = require('../BaseShared');


function ObjectComponent(parent,object,key,params) {
    if(object[key] === undefined){
        throw new ReferenceError('Object of type ' + object.constructor.name + ' has no member ' + key + '.');
    }

    /*
    if(ErrorUtil.ReferenceError(object,value))
    {
        throw new ReferenceError(Error.COMPONENT_OBJECT +
                                 object.constructor.name +
                                 Error.COMPONENT_OBJECT_MEMBER_REFERENCE +
                                 value +
                                 Error.END);
    }
    */
    /*-------------------------------------------------------------------------------------*/

    params       = params || {};
    params.label = params.label || key;

    /*-------------------------------------------------------------------------------------*/

    Component.apply(this,[parent,params.label]);

    this._object   = object;
    this._key      = key;

    this._onChange = function(){};
    this._onFinish = function(){};


    /*
    var kit_ = Base.getKitInstance();
        kit_.addEventListener( EventType.UPDATE_VALUE, this,'onValueUpdate');

    this.addEventListener(EventType.VALUE_UPDATED,kit_, 'onValueUpdated');
    */

    var base = BaseShared.get();
    base.addEventListener(EventType.UPDATE_VALUE, this,'onValueUpdate');
    this.addEventListener(EventType.VALUE_UPDATED, base, 'onValueUpdated');
}

ObjectComponent.prototype = Object.create(Component.prototype);

/*-------------------------------------------------------------------------------------*/

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



//ControlKit.ObjectComponent = function(parent,object,value,params)
//{
//    if(ControlKit.ErrorUtil.ReferenceError(object,value))
//    {
//        throw new ReferenceError(ControlKit.Error.COMPONENT_OBJECT +
//                                 object.constructor.name +
//                                 ControlKit.Error.COMPONENT_OBJECT_MEMBER_REFERENCE +
//                                 value +
//                                 ControlKit.Error.END);
//    }
//
//    /*-------------------------------------------------------------------------------------*/
//
//    params       = params || {};
//    params.label = params.label || value;
//
//    /*-------------------------------------------------------------------------------------*/
//
//    ControlKit.Component.apply(this,[parent,params.label]);
//
//    this._object   = object;
//    this._key      = value;
//
//    this._onChange = function(){};
//    this._onFinish = function(){};
//
//    var kit = ControlKit.getKitInstance();
//        kit.addEventListener( ControlKit.EventType.UPDATE_VALUE, this,'onValueUpdate');
//
//    this.addEventListener(ControlKit.EventType.VALUE_UPDATED,kit, 'onValueUpdated');
//};
//
//ControlKit.ObjectComponent.prototype = Object.create(ControlKit.Component.prototype);
//
///*-------------------------------------------------------------------------------------*/
//
////Override in Subclass
//ControlKit.ObjectComponent.prototype.applyValue       = function(){};
//ControlKit.ObjectComponent.prototype.pushHistoryState = function(){var obj = this._object,key = this._key;ControlKit.History.getInstance().pushState(obj,key,obj[key]);};
//ControlKit.ObjectComponent.prototype.onValueUpdate    = function(e){};
//ControlKit.ObjectComponent.prototype.setValue         = function(value){this._object[this._key] = value;};
