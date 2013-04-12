function CKComponent_Internal(parent,object,value)
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


}

CKComponent_Internal.prototype._applyValue  = function(){};

CKComponent_Internal.prototype.forceUpdate = function(){};

CKComponent_Internal.prototype.enable     = function(){this._enabled = true;  };
CKComponent_Internal.prototype.disable    = function(){this._enabled = false; };
CKComponent_Internal.prototype.isEnabled  = function(){return this._enabled;};


CKComponent_Internal.prototype.getNode     = function(){ return this._node; };

