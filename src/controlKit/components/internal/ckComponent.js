function CKComponent(parent,object,value,label)
{
    this._parent   = parent;
    this._object   = object;
    this._key      = value;
    this._enabled  = true;

    this._onChange = function(){};
    this._onFinish = function(){};

    var rootNode = this._node     = new CKNode(CKNodeType.LIST_ITEM),
        lablNode = this._lablNode = new CKNode(CKNodeType.SPAN),
        wrapNode = this._wrapNode = new CKNode(CKNodeType.DIV);

    this._parent.getList().addChild(rootNode);

    rootNode.addChild(lablNode);
    rootNode.addChild(wrapNode);

    lablNode.setStyleClass(CKCSS.Label);
    wrapNode.setStyleClass(CKCSS.Wrap);

    this._lablNode.setProperty('innerHTML',label || '');
}

//Override in Subclass
CKComponent.prototype._applyValue  = function(){};
CKComponent.prototype.forceUpdate  = function(){};

CKComponent.prototype.enable     = function(){this._enabled = true;  };
CKComponent.prototype.disable    = function(){this._enabled = false; };
CKComponent.prototype.isEnabled  = function(){return this._enabled;};

CKComponent.prototype.setValue    = function(value){this._object[this._key] = value;this.forceUpdate();};


