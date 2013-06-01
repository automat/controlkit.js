ControlKit.ObjectComponent = function(parent,object,value,params)
{
    /*-------------------------------------------------------------------------------------*/

    params       = params || {};
    params.label = params.label || value;

    /*-------------------------------------------------------------------------------------*/

    ControlKit.Component.apply(this,[parent,params.label]);

    this._object   = object;
    this._key      = value;

    this._onChange = function(){};
    this._onFinish = function(){};

    var kit = ControlKit.getKitInstance();
        kit.addEventListener( ControlKit.EventType.UPDATE_VALUE, this,'onValueUpdate');

    this.addEventListener(ControlKit.EventType.VALUE_UPDATED,kit, 'onValueUpdated');
};

ControlKit.ObjectComponent.prototype = Object.create(ControlKit.Component.prototype);

//Override in Subclass
ControlKit.ObjectComponent.prototype.applyValue       = function(){};
ControlKit.ObjectComponent.prototype.pushHistoryState = function(){var obj = this._object,key = this._key;ControlKit.History.getInstance().pushState(obj,key,obj[key]);};
ControlKit.ObjectComponent.prototype.onValueUpdate    = function(e){};
ControlKit.ObjectComponent.prototype.setValue         = function(value){this._object[this._key] = value;};
