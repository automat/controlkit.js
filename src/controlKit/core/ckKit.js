ControlKit.Kit = function(parentDomElementId)
{
    ControlKit.EventDispatcher.apply(this,arguments);

    var node = null;

    if(!parentDomElementId)
    {
        node = new ControlKit.Node(ControlKit.NodeType.DIV);
        document.body.addChild(node.getElement());
    }
    else
    {
        node = ControlKit.Node.getNodeById(parentDomElementId);
    }

    node.setStyleClass(ControlKit.CSS.ControlKit);

    /*---------------------------------------------------------------------------------*/

    this._rootNode   = node;
    this._panels = [];

    /*---------------------------------------------------------------------------------*/

    var history = ControlKit.History.init();
        history.addEventListener(ControlKit.EventType.HISTORY_STATE_PUSH,this,'onHistoryStatePush');
        history.addEventListener(ControlKit.EventType.HISTORY_STATE_POP ,this,'onHistoryStatePop');

    var mouse   = ControlKit.Mouse.init(),
        picker  = ControlKit.Picker.init(),
        options = ControlKit.Options.init();

    //node.addChild(ControlKit.Picker.getInstance().getNode());
    node.addChild(options.getNode());

    /*---------------------------------------------------------------------------------*/

    ControlKit.Kit._instance = this;

};

ControlKit.Kit.prototype = Object.create(ControlKit.EventDispatcher.prototype);

/*---------------------------------------------------------------------------------*/


ControlKit.Kit.prototype.onValueUpdated = function(e)
{
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.UPDATE_VALUE,{origin: e.sender}));
};

ControlKit.Kit.prototype.onSelectTriggered = function(e)
{
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.TRIGGER_SELECT,{origin: e.sender}));
};

/*---------------------------------------------------------------------------------*/

ControlKit.Kit.prototype.addPanel = function(params)
{
    var panel = new ControlKit.Panel(this, params);
    this._panels.push(panel);
    return panel;
};

/*---------------------------------------------------------------------------------*/

ControlKit.Kit.prototype.update = function()
{
    var i = -1, j, k;

    var panels = this._panels,
        panel,
        groups,
        components,
        component;

    while (++i < panels.length)
    {
        panel = panels[i];

        if(panel.isDisabled())continue;

        groups = panel.getGroups();

        j = -1;
        while (++j < groups.length)
        {
            components = groups[j].getComponents();

            k = -1;
            while (++k < components.length)
            {
                component = components[k];

                if(component.isDisabled())continue;

                if (component instanceof ControlKit.ValuePlotter ||
                    component instanceof ControlKit.StringOutput ||
                    component instanceof ControlKit.NumberOutput)
                {
                    component.update();
                }
            }
        }
    }
};

/*---------------------------------------------------------------------------------*/

ControlKit.Kit.prototype.onHistoryStatePush = function()
{
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.UPDATE_MENU,null));
};

ControlKit.Kit.prototype.onHistoryStatePop  = function()
{
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.UPDATE_VALUE,{origin: null}));
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.UPDATE_MENU, null));
};

/*---------------------------------------------------------------------------------*/

ControlKit.Kit.prototype.getRootNode = function(){return this._rootNode;};

ControlKit.getKitInstance = function(){return ControlKit.Kit._instance;};