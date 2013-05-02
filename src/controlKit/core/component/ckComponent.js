function CKComponent(parent)
{
    CKEventDispatcher.apply(this,arguments);

    this._parent   = parent;
    this._enabled  = true;

    var rootNode    = this._rootNode = new CKNode(CKNodeType.LIST_ITEM),
        lablNode    = this._lablNode = new CKNode(CKNodeType.SPAN),
        wrapNode    = this._wrapNode = new CKNode(CKNodeType.DIV),
        targetGroup = this._parent.getActiveSubGroup();

    targetGroup.addComponentRoot(rootNode);
    if(targetGroup.hasLabel() && targetGroup.getList().getNumChildren() == 1)
    rootNode.setStyleProperty('border-top','1px solid #303639');

    rootNode.addChild(lablNode);
    rootNode.addChild(wrapNode);

    lablNode.setStyleClass(CKCSS.Label);
    wrapNode.setStyleClass(CKCSS.Wrap);
}

CKComponent.prototype = Object.create(CKEventDispatcher.prototype);

CKComponent.prototype.enable     = function(){this._enabled = true;  };
CKComponent.prototype.disable    = function(){this._enabled = false; };
CKComponent.prototype.isEnabled  = function(){return this._enabled;};
