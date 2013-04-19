function CKComponent(parent)
{
    this._parent   = parent;
    this._enabled  = true;

    this._node     = new CKNode(CKNodeType.LIST_ITEM);
    this._lablNode = new CKNode(CKNodeType.SPAN);
    this._wrapNode = new CKNode(CKNodeType.DIV);

    this._parent.getList().addChild(this._node);

    this._node.addChild(this._lablNode);
    this._node.addChild(this._wrapNode);

    this._lablNode.setStyleClass(CKCSS.Label);
    this._wrapNode.setStyleClass(CKCSS.Wrap);
}

CKComponent.prototype.enable     = function(){this._enabled = true;  };
CKComponent.prototype.disable    = function(){this._enabled = false; };
CKComponent.prototype.isEnabled  = function(){return this._enabled;};
