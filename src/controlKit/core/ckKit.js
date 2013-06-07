ControlKit.Kit = function(parentDomElementId,params)
{
    ControlKit.EventDispatcher.apply(this,arguments);

    var node = null;

    if(!parentDomElementId)
    {
        node = new ControlKit.Node(ControlKit.NodeType.DIV);
        document.body.appendChild(node.getElement());
    }
    else
    {
        node = ControlKit.Node.getNodeById(parentDomElementId);
    }

    node.setProperty('id',ControlKit.CSS.ControlKit);

    /*---------------------------------------------------------------------------------*/

    params         = params         || {};
    params.trigger = params.trigger || false;
    params.history = params.history || false;
    params.opacity = params.opacity || ControlKit.Default.OPACITY;

    /*---------------------------------------------------------------------------------*/

    this._node     = node;
    this._panels   = [];
    this._disabled = false;

    /*---------------------------------------------------------------------------------*/

    var history = ControlKit.History.init();
        history.addEventListener(ControlKit.EventType.HISTORY_STATE_PUSH,this,'onHistoryStatePush');
        history.addEventListener(ControlKit.EventType.HISTORY_STATE_POP ,this,'onHistoryStatePop');

    if(!params.history)history.disable();

    var mouse   = ControlKit.Mouse.init(),
        picker  = ControlKit.Picker.init( this.getNode()),
        options = ControlKit.Options.init(this.getNode());

    if(params.trigger)
    {
        var trigger = new ControlKit.Node(ControlKit.NodeType.DIV);
        trigger.setProperty('id',ControlKit.CSS.Trigger);
        trigger.setEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onTriggerDown.bind(this));

        document.body.appendChild(trigger.getElement());
    }

    picker.open();


    if(params.opacity != 1.0 && params.opacity != 0.0)
    {
        node.setStyleProperty('opacity',params.opacity);
    }

    /*---------------------------------------------------------------------------------*/

    ControlKit.Kit._instance = this;
};

ControlKit.Kit.prototype = Object.create(ControlKit.EventDispatcher.prototype);

/*---------------------------------------------------------------------------------*/

ControlKit.Kit.prototype._onTriggerDown = function()
{
    var disabled = this._disabled = !this._disabled;
    this._node.setStyleProperty('visibility',disabled ? 'hidden' : 'visible');
};

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
    if(this._disabled)return;

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

ControlKit.Kit.prototype.enable  = function(){this._disabled = false;};
ControlKit.Kit.prototype.disable = function(){this._disabled = true;};

ControlKit.Kit.prototype.disableAllPanels = function(){var i=-1,p=this._panels;while(++i<p.length)p[i].enable();};
ControlKit.Kit.prototype.enableAllPanels  = function(){var i=-1,p=this._panels;while(++i<p.length)p[i].disable();};

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

ControlKit.Kit.prototype.getNode = function(){return this._node;};

/*---------------------------------------------------------------------------------*/

//TODO: fix
ControlKit.Kit.prototype.addConsole = function(params)
{
    params            = params           || {};
    params.valign     = params.valign    || ControlKit.Default.VALIGN;
    params.align      = params.align     || ControlKit.Default.ALIGN;
    params.position   = params.position  || ControlKit.Default.POSITION;
    params.width      = params.width     || ControlKit.Default.WIDTH;
    params.height     = params.height    || ControlKit.Default.WIDTH;
    params.ratio      = params.ratio     || ControlKit.Default.RATIO;
    params.label      = params.label     || ControlKit.Default.LABEL;
    params.opacity    = params.opacity   || ControlKit.Default.OPACITY;

    params.fixed      = params.fixed === undefined ?
                        ControlKit.Default.FIXED :
                        params.fixed;

    this.addPanel({valign:   params.valign,
                   align:    params.align,
                   position: params.position,
                   width:    params.width,
                   ratio:    params.ratio,
                   label:    params.label,
                   opacity:  params.opacity,
                   fixed:    params.fixed})
                   .addGroup()
                   .addSubGroup()
                   .addConsole({height:params.height});


    /*
    return this._panels[this._panels.length-1].getGroups()[0]
                                              .getSubGroup()
                                              .getComponents()[0];

                                              */
};

/*---------------------------------------------------------------------------------*/


ControlKit.getKitInstance = function(){return ControlKit.Kit._instance;};