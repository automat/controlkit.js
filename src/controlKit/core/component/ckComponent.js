ControlKit.Component = function(parent)
{
    ControlKit.EventDispatcher.apply(this,arguments);

    this._parent   = parent;
    this._enabled  = true;

    var rootNode    = this._rootNode = new ControlKit.Node(ControlKit.NodeType.LIST_ITEM),
        lablNode    = this._lablNode = new ControlKit.Node(ControlKit.NodeType.SPAN),
        wrapNode    = this._wrapNode = new ControlKit.Node(ControlKit.NodeType.DIV),
        targetGroup = this._parent.getActiveSubGroup();

    targetGroup.addComponentRoot(rootNode);
    if(targetGroup.hasLabel() && targetGroup.getList().getNumChildren() == 1)
    rootNode.setStyleProperty('border-top','1px solid #303639');

    rootNode.addChild(lablNode);
    rootNode.addChild(wrapNode);

    lablNode.setStyleClass(ControlKit.CSS.Label);
    wrapNode.setStyleClass(ControlKit.CSS.Wrap);
}

ControlKit.Component.prototype = Object.create(ControlKit.EventDispatcher.prototype);

ControlKit.Component.prototype.enable     = function(){this._enabled = true;  };
ControlKit.Component.prototype.disable    = function(){this._enabled = false; };
ControlKit.Component.prototype.isEnabled  = function(){return this._enabled;};
