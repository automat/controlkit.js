

ControlKit.Group = function(parent,params)
{
    ControlKit.AbstractGroup.apply(this,arguments);

    /*-------------------------------------------------------------------------------------*/

    params           = params           || {};
    params.label     = params.label     || null;
    params.useLabels = params.useLabels || true;
    params.show      = params.show === undefined ? true : params.show;

    /*-------------------------------------------------------------------------------------*/

    this._rootNode.setStyleClass(ControlKit.CSS.Group);
    this._wrapNode.setStyleClass(ControlKit.CSS.Wrap);
    this._listNode.setStyleClass(ControlKit.CSS.SubGroupList);

    /*-------------------------------------------------------------------------------------*/

    //Head

    if(params.label)
    {
        var headNode  = new ControlKit.Node(ControlKit.NodeType.DIV),
            lablNode  = new ControlKit.Node(ControlKit.NodeType.SPAN),
            indiNode  = this._indiNode = new ControlKit.Node(ControlKit.NodeType.DIV);

        headNode.setStyleClass(ControlKit.CSS.Head);
        lablNode.setStyleClass(ControlKit.CSS.Label);
        indiNode.setStyleClass(ControlKit.CSS.ArrowBMax);
        lablNode.setProperty('innerHTML',params.label);

        headNode.addChild(lablNode);
        headNode.addChild(indiNode);

        headNode.setEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onHeadMouseDown.bind(this));

        this._rootNode.addChild(headNode);

        if(!params.show)this.hide();
    }
    else
    {
        //TODO: Add CSS Class
        this._wrapNode.getStyle().borderTop = "1px solid #3b4447";
    }

    /*-------------------------------------------------------------------------------------*/

    this._wrapNode.addChild(this._listNode);
    this._rootNode.addChild(this._wrapNode);

    /*-------------------------------------_collapsed-----------------------------------------*/

    this._components = [];
    this._subGroups  = [];

    /*-------------------------------------------------------------------------------------*/

    this._parent.addEventListener(ControlKit.EventType.PANEL_MOVE_BEGIN,this,'onPanelMoveBegin');
    this._parent.addEventListener(ControlKit.EventType.PANEL_MOVE,      this,'onPanelMove');
    this._parent.addEventListener(ControlKit.EventType.PANEL_MOVE_END,  this,'onPanelMoveEnd');

    /*-------------------------------------------------------------------------------------*/
    //add first subgroup
    //TODO: FIX

    this._subGroupsInit = false;
    this._subGroups.push(new ControlKit.SubGroup(this,'',null));

    /*-------------------------------------------------------------------------------------*/
}

ControlKit.Group.prototype = Object.create(ControlKit.AbstractGroup.prototype);

/*-------------------------------------------------------------------------------------*/

ControlKit.Group.prototype.onPanelMoveBegin = function(){var eventType = ControlKit.EventType.PANEL_MOVE_BEGIN;if(!this.hasEventListener(eventType))return;this.dispatchEvent(new ControlKit.Event(this,eventType));};
ControlKit.Group.prototype.onPanelMove      = function(){var eventType = ControlKit.EventType.PANEL_MOVE;      if(!this.hasEventListener(eventType))return;this.dispatchEvent(new ControlKit.Event(this,eventType))};
ControlKit.Group.prototype.onPanelMoveEnd   = function(){var eventType = ControlKit.EventType.PANEL_MOVE_END;  if(!this.hasEventListener(eventType))return;this.dispatchEvent(new ControlKit.Event(this,eventType))};

/*-------------------------------------------------------------------------------------*/

ControlKit.Group.prototype.onSubGroupShown  = function(){this._updateVisibility();};
ControlKit.Group.prototype.onSubGroupHidden = function(){this._updateVisibility();};

/*-------------------------------------------------------------------------------------*/


ControlKit.Group.prototype._onHeadMouseDown   = function(){this._hidden = !this._hidden;this._updateVisibility();};

/*-------------------------------------------------------------------------------------*/


ControlKit.Group.prototype.addStringInput     = function(object,value,label,params)       {return this._addComponent(new ControlKit.StringInput(     this,object,value,label,params));};
ControlKit.Group.prototype.addNumberInput     = function(object,value,label,params)       {return this._addComponent(new ControlKit.NumberInput(     this,object,value,label,params));};
ControlKit.Group.prototype.addRange           = function(object,value,label,params)       {return this._addComponent(new ControlKit.Range(           this,object,value,label,params));};
ControlKit.Group.prototype.addCheckbox        = function(object,value,label,params)       {return this._addComponent(new ControlKit.Checkbox(        this,object,value,label,params));};
ControlKit.Group.prototype.addButton          = function(label,onPress)                   {return this._addComponent(new ControlKit.Button(          this,label,onPress));};
ControlKit.Group.prototype.addSelect          = function(object,value,target,label,params){return this._addComponent(new ControlKit.Select(          this,object,value,target,label,params));};
ControlKit.Group.prototype.addSlider          = function(object,value,target,label,params){return this._addComponent(new ControlKit.Slider(          this,object,value,target,label,params));};


ControlKit.Group.prototype.addFunctionPlotter = function(object,value,label,params)       {return this._addComponent(new ControlKit.FunctionPlotter( this,object,value,label,params));};
ControlKit.Group.prototype.addPad             = function(object,value,label,params)       {return this._addComponent(new ControlKit.Pad(             this,object,value,label,params));};
ControlKit.Group.prototype.addValuePlotter    = function(object,value,label,params)       {return this._addComponent(new ControlKit.ValuePlotter(    this,object,value,label,params));};
ControlKit.Group.prototype.addNumberOutput    = function(object,value,label,params)       {return this._addComponent(new ControlKit.NumberOutput(    this,object,value,label,params));};
ControlKit.Group.prototype.addStringOutput    = function(object,value,label,params)       {return this._addComponent(new ControlKit.StringOutput(    this,object,value,label,params));};

/*-------------------------------------------------------------------------------------*/

// Generate component from Object
ControlKit.Group.prototype.addObject = function(obj){};

/*-------------------------------------------------------------------------------------*/

ControlKit.Group.prototype._addComponent = function(component)
{
    this._components.push(component);
    this._updateHeight();
    return this;
};

/*-------------------------------------------------------------------------------------*/

ControlKit.Group.prototype._updateHeight = function()
{
    var wrapNode = this._wrapNode;
    wrapNode.setHeight(wrapNode.getFirstChild().getHeight());
};

/*----------------------------------------------------------collapsed---------------------*/

ControlKit.Group.prototype._updateVisibility = function()
{
    var wrapNode = this._wrapNode,
        inidNode = this._indiNode;

    if(this._hidden)
    {
        wrapNode.setHeight(0);
        if(inidNode)inidNode.setStyleClass(ControlKit.CSS.ArrowBMin);
    }
    else
    {
        wrapNode.setHeight(wrapNode.getFirstChild().getHeight());
        if(inidNode)inidNode.setStyleClass(ControlKit.CSS.ArrowBMax);
    }
};

/*-------------------------------------------------------------------------------------*/

//TODO: FIX
ControlKit.Group.prototype.addSubGroup  = function(label,params)
{

    if(!this._subGroupsInit)
    {
        this.getActiveSubGroup().set(label,params);
        this._subGroupsInit = true;
    }
    else this._subGroups.push(new ControlKit.SubGroup(this,label,params));

    this._updateHeight();
    return this;
};

/*-------------------------------------------------------------------------------------*/

ControlKit.Group.prototype.getComponents = function(){return this._components;};

ControlKit.Group.prototype.getActiveSubGroup = function(){return this._subGroups[this._subGroups.length-1];};



