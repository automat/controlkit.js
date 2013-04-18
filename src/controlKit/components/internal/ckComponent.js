function CKComponent(parent)
{
    this._parent   = parent;
    this._enabled  = true;

    var rootNode = this._node     = new CKNode(CKNodeType.LIST_ITEM),
        lablNode = this._lablNode = new CKNode(CKNodeType.SPAN),
        wrapNode = this._wrapNode = new CKNode(CKNodeType.DIV);

    this._parent.getList().addChild(rootNode);

    rootNode.addChild(lablNode);
    rootNode.addChild(wrapNode);

    lablNode.setStyleClass(CKCSS.Label);
    wrapNode.setStyleClass(CKCSS.Wrap);
}

CKComponent.prototype.enable     = function(){this._enabled = true;  };
CKComponent.prototype.disable    = function(){this._enabled = false; };
CKComponent.prototype.isEnabled  = function(){return this._enabled;};
