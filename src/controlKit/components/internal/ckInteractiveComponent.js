function CKInteractiveComponent(parent,object,value,label)
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
CKInteractiveComponent.prototype._applyValue  = function(){};
CKInteractiveComponent.prototype.forceUpdate  = function(){};

CKInteractiveComponent.prototype.enable     = function(){this._enabled = true;  };
CKInteractiveComponent.prototype.disable    = function(){this._enabled = false; };
CKInteractiveComponent.prototype.isEnabled  = function(){return this._enabled;};

CKInteractiveComponent.prototype.setValue    = function(value){this._object[this._key] = value;this.forceUpdate();};


