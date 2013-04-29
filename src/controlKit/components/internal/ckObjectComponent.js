
//Object bound component
function CKObjectComponent(parent,object,value,label)
{
    CKComponent.apply(this,arguments);

    this._object   = object;
    this._key      = value;

    this._onChange = function(){};
    this._onFinish = function(){};

    this._lablNode.setProperty('innerHTML',label || '');

    var cntrlKit = ControlKit.getInstance();

    cntrlKit.addEventListener(CKEventType.UPDATE_VALUE,this,'onValueUpdate');
    this.addEventListener(CKEventType.VALUE_UPDATED,cntrlKit,'onValueUpdated');
}

CKObjectComponent.prototype = Object.create(CKComponent.prototype);

//Override in Subclass
CKObjectComponent.prototype.applyValue    = function(){};
CKObjectComponent.prototype.onValueUpdate = function(e){};
CKObjectComponent.prototype.setValue      = function(value){this._object[this._key] = value;};


