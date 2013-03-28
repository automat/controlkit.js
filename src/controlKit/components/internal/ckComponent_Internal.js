function CKComponent_Internal(parent,object,value)
{
    this._parent = parent;
    this._object = object;
    this._key    = value;

    this._onChange = function(){};
    this._onFinish = function(){};

    var rootNode = this._node     = new CKNode(CKNodeType.LIST_ITEM),
        lablNode = this._lablNode = new CKNode(CKNodeType.SPAN),
        wrapNode = this._wrapNode = new CKNode(CKNodeType.DIV);

    lablNode.setStyleClass(CKCSS.Label);
    wrapNode.setStyleClass(CKCSS.Wrap);

    rootNode.addChild(lablNode);
    rootNode.addChild(wrapNode);
}

CKComponent_Internal.prototype._applyValue  = function(){};

CKComponent_Internal.prototype.forceUpdate = function(){};
CKComponent_Internal.prototype.getNode     = function(){ return this._node; };

