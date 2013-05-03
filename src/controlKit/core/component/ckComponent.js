ControlKit.CKComponent = function(parent)
{
    ControlKit.CKEventDispatcher.apply(this,arguments);

    this._parent   = parent;
    this._enabled  = true;

    var rootNode    = this._rootNode = new ControlKit.CKNode(ControlKit.CKNodeType.LIST_ITEM),
        lablNode    = this._lablNode = new ControlKit.CKNode(ControlKit.CKNodeType.SPAN),
        wrapNode    = this._wrapNode = new ControlKit.CKNode(ControlKit.CKNodeType.DIV),
        targetGroup = this._parent.getActiveSubGroup();

    targetGroup.addComponentRoot(rootNode);
    if(targetGroup.hasLabel() && targetGroup.getList().getNumChildren() == 1)
    rootNode.setStyleProperty('border-top','1px solid #303639');

    rootNode.addChild(lablNode);
    rootNode.addChild(wrapNode);

    lablNode.setStyleClass(ControlKit.CKCSS.Label);
    wrapNode.setStyleClass(ControlKit.CKCSS.Wrap);
}

ControlKit.CKComponent.prototype = Object.create(ControlKit.CKEventDispatcher.prototype);

ControlKit.CKComponent.prototype.enable     = function(){this._enabled = true;  };
ControlKit.CKComponent.prototype.disable    = function(){this._enabled = false; };
ControlKit.CKComponent.prototype.isEnabled  = function(){return this._enabled;};
