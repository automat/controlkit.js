ControlKit.Component = function(parent)
{
    ControlKit.EventDispatcher.apply(this,arguments);

    this._parent   = parent;
    this._disabled = false;

    var rootNode    = this._rootNode = new ControlKit.Node(ControlKit.NodeType.LIST_ITEM),
        lablNode    = this._lablNode = new ControlKit.Node(ControlKit.NodeType.SPAN),
        wrapNode    = this._wrapNode = new ControlKit.Node(ControlKit.NodeType.DIV);

    parent.addComponentRoot(rootNode);

    rootNode.addChild(lablNode);
    rootNode.addChild(wrapNode);

    lablNode.setStyleClass(ControlKit.CSS.Label);
    wrapNode.setStyleClass(ControlKit.CSS.Wrap);

    parent.addEventListener(ControlKit.EventType.COMPONENTS_ENABLE, this,'onEnable');
    parent.addEventListener(ControlKit.EventType.COMPONENTS_DISABLE,this,'onDisable');
};

ControlKit.Component.prototype = Object.create(ControlKit.EventDispatcher.prototype);

ControlKit.Component.prototype.enable     = function(){this._disabled = false;};
ControlKit.Component.prototype.disable    = function(){this._disabled = true; };

ControlKit.Component.prototype.isEnabled  = function(){return !this._disabled;};
ControlKit.Component.prototype.isDisabled = function(){return this._disabled};

ControlKit.Component.prototype.onEnable  = function(){this.enable();};
ControlKit.Component.prototype.onDisable = function(){this.disable();};

