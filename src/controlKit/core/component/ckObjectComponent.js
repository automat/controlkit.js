
//Object bound component
ControlKit.CKObjectComponent = function(parent,object,value,label)
{
    ControlKit.CKComponent.apply(this,arguments);

    this._object   = object;
    this._key      = value;

    this._onChange = function(){};
    this._onFinish = function(){};

    this._lablNode.setProperty('innerHTML',label || '');

    var cntrlKit = ControlKit.getKitInstance();
    cntrlKit.addEventListener(ControlKit.CKEventType.UPDATE_VALUE,this,'onValueUpdate');
    this.addEventListener(ControlKit.CKEventType.VALUE_UPDATED,cntrlKit,'onValueUpdated');
}

ControlKit.CKObjectComponent.prototype = Object.create(ControlKit.CKComponent.prototype);

//Override in Subclass
ControlKit.CKObjectComponent.prototype.applyValue    = function(){};
ControlKit.CKObjectComponent.prototype.onValueUpdate = function(e){};
ControlKit.CKObjectComponent.prototype.setValue      = function(value){this._object[this._key] = value;};


