ControlKit.Component = function(parent,label)
{
    ControlKit.EventDispatcher.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    this._parent   = parent;
    this._disabled = false;

    /*---------------------------------------------------------------------------------*/

    var rootNode = this._rootNode = new ControlKit.Node(ControlKit.NodeType.LIST_ITEM),
        wrapNode = this._wrapNode = new ControlKit.Node(ControlKit.NodeType.DIV);

        wrapNode.setStyleClass(ControlKit.CSS.Wrap);
        rootNode.addChild(wrapNode);

    if(label)
    {
        if(label.length != 0 && label != 'none')
        {
            var lablNode = this._lablNode = new ControlKit.Node(ControlKit.NodeType.SPAN);
                lablNode.setStyleClass(ControlKit.CSS.Label);
                lablNode.setProperty('innerHTML',label);
                rootNode.addChild(lablNode);
        }

        if(label == 'none')
        {
            wrapNode.setStyleProperty('marginLeft','0');
            wrapNode.setStyleProperty('width','100%');
        }
    }

    /*---------------------------------------------------------------------------------*/

    this._parent.addEventListener(ControlKit.EventType.COMPONENTS_ENABLE, this,'onEnable');
    this._parent.addEventListener(ControlKit.EventType.COMPONENTS_DISABLE,this,'onDisable');
    this._parent.addComponentNode(rootNode);

};

ControlKit.Component.prototype = Object.create(ControlKit.EventDispatcher.prototype);

/*---------------------------------------------------------------------------------*/

ControlKit.Component.prototype.enable     = function(){this._disabled = false;};
ControlKit.Component.prototype.disable    = function(){this._disabled = true; };

ControlKit.Component.prototype.isEnabled  = function(){return !this._disabled;};
ControlKit.Component.prototype.isDisabled = function(){return this._disabled};

ControlKit.Component.prototype.onEnable  = function(){this.enable();};
ControlKit.Component.prototype.onDisable = function(){this.disable();};

