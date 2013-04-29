function CKComponent(parent)
{
    CKEventDispatcher.apply(this,arguments);

    this._parent   = parent;
    this._enabled  = true;

    this._rootNode     = new CKNode(CKNodeType.LIST_ITEM);
    this._lablNode = new CKNode(CKNodeType.SPAN);
    this._wrapNode = new CKNode(CKNodeType.DIV);

    this._parent.getList().addChild(this._rootNode);

    this._rootNode.addChild(this._lablNode);
    this._rootNode.addChild(this._wrapNode);

    this._lablNode.setStyleClass(CKCSS.Label);
    this._wrapNode.setStyleClass(CKCSS.Wrap);
}

CKComponent.prototype = Object.create(CKEventDispatcher.prototype);

CKComponent.prototype.enable     = function(){this._enabled = true;  };
CKComponent.prototype.disable    = function(){this._enabled = false; };
CKComponent.prototype.isEnabled  = function(){return this._enabled;};
