
//Object bound component
function CKObjectComponent(parent,object,value,label)
{
    CKComponent.apply(this,arguments);

    this._object   = object;
    this._key      = value;

    this._onChange = function(){};
    this._onFinish = function(){};

    this._lablNode.setProperty('innerHTML',label || '');
}

CKObjectComponent.prototype = Object.create(CKComponent.prototype);

//Override in Subclass
CKObjectComponent.prototype.applyValue  = function(){};
CKObjectComponent.prototype.forceUpdate  = function(){};

CKObjectComponent.prototype.setValue    = function(value){this._object[this._key] = value;this.forceUpdate();};


