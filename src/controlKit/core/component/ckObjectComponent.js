
//Object bound component
ControlKit.ObjectComponent = function(parent,object,value,label)
{
    ControlKit.Component.apply(this,arguments);

    this._object   = object;
    this._key      = value;

    this._onChange = function(){};
    this._onFinish = function(){};

    this._lablNode.setProperty('innerHTML',label || '');

    var cntrlKit = ControlKit.getKitInstance();
    cntrlKit.addEventListener(ControlKit.EventType.UPDATE_VALUE,this,'onValueUpdate');
    this.addEventListener(ControlKit.EventType.VALUE_UPDATED,cntrlKit,'onValueUpdated');
};

ControlKit.ObjectComponent.prototype = Object.create(ControlKit.Component.prototype);

//Override in Subclass
ControlKit.ObjectComponent.prototype.applyValue    = function(){};
ControlKit.ObjectComponent.prototype.onValueUpdate = function(e){};
ControlKit.ObjectComponent.prototype.setValue      = function(value){this._object[this._key] = value;};


