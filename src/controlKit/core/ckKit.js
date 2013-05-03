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

    this._rootNode   = node;
    this._panels = [];

    /*---------------------------------------------------------------------------------*/

    ControlKit.Mouse.init();
    ControlKit.Picker.init();
    ControlKit.Options.init();

    //node.addChild(Picker.getInstance().getNode());
    node.addChild(ControlKit.Options.getInstance().getNode());

    /*---------------------------------------------------------------------------------*/

    this._window = {width :window.innerWidth,height:window.innerHeight};
    window.addEventListener("resize", this.onWindowResize.bind(this), false);


    ControlKit._kitInstance = this;

};

ControlKit.Kit.prototype = Object.create(ControlKit.EventDispatcher.prototype);

ControlKit.Kit.prototype.onWindowResize = function()
{
    this._window.width = window.innerWidth;
    this._window.height = window.innerHeight;
};

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

ControlKit.Kit.prototype.onPanelMoveBegin = function(e)
{

};

/*---------------------------------------------------------------------------------*/

ControlKit.Kit.prototype.update = function()
{
    var i = -1, j, k;

    var panels = this._panels,
        groupList,
        components,
        component;

    while (++i < panels.length) {
        groupList = panels[i].getGroups();
        j = -1;
        while (++j < groupList.length) {
            components = groupList[j].getComponents();
            k = -1;
            while (++k < components.length) {
                component = components[k];
                if (component instanceof ControlKit.ValuePlotter ||
                    component instanceof ControlKit.StringOutput ||
                    component instanceof ControlKit.NumberOutput) {
                    component.update();
                }

            }
        }
    }
};

/*---------------------------------------------------------------------------------*/

ControlKit.Kit.prototype.getRootNode = function(){return this._rootNode;};

ControlKit.getKitInstance = function(){return ControlKit._kitInstance;};