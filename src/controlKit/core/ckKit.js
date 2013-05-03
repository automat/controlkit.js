ControlKit.Kit = function(parentDomElementId)
{
    ControlKit.CKEventDispatcher.apply(this,arguments);

    var node = null;

    if(!parentDomElementId)
    {
        node = new ControlKit.CKNode(ControlKit.CKNodeType.DIV);
        document.body.addChild(node.getElement());
    }
    else
    {
        node = ControlKit.CKNode.getNodeById(parentDomElementId);
    }

    this._rootNode   = node;
    this._panels = [];

    /*---------------------------------------------------------------------------------*/

    ControlKit.CKMouse.init();
    ControlKit.CKPicker.init();
    ControlKit.CKOptions.init();

    //node.addChild(CKPicker.getInstance().getNode());
    node.addChild(ControlKit.CKOptions.getInstance().getNode());

    /*---------------------------------------------------------------------------------*/

    this._window = {width :window.innerWidth,height:window.innerHeight};
    window.addEventListener("resize", this.onWindowResize.bind(this), false);


    ControlKit._kitInstance = this;

};

ControlKit.Kit.prototype = Object.create(ControlKit.CKEventDispatcher.prototype);

ControlKit.Kit.prototype.onWindowResize = function()
{
    this._window.width = window.innerWidth;
    this._window.height = window.innerHeight;
};

/*---------------------------------------------------------------------------------*/


ControlKit.Kit.prototype.onValueUpdated = function(e)
{
    this.dispatchEvent(new ControlKit.CKEvent(this,ControlKit.CKEventType.UPDATE_VALUE,{origin: e.sender}));
};

ControlKit.Kit.prototype.onSelectTriggered = function(e)
{
    this.dispatchEvent(new ControlKit.CKEvent(this,ControlKit.CKEventType.TRIGGER_SELECT,{origin: e.sender}));
};

/*---------------------------------------------------------------------------------*/

ControlKit.Kit.prototype.addPanel = function(params)
{
    var panel = new ControlKit.CKPanel(this, params);
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
                if (component instanceof ControlKit.CKValuePlotter ||
                    component instanceof ControlKit.CKStringOutput ||
                    component instanceof ControlKit.CKNumberOutput) {
                    component.update();
                }

            }
        }
    }
};

/*---------------------------------------------------------------------------------*/

ControlKit.Kit.prototype.getRootNode = function(){return this._rootNode;};

ControlKit.getKitInstance = function(){return ControlKit._kitInstance;};