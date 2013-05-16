ControlKit.Group = function(parent,params)
{
    ControlKit.AbstractGroup.apply(this,arguments);

    /*-------------------------------------------------------------------------------------*/

    this._rootNode.setStyleClass(ControlKit.CSS.Group);
    this._wrapNode.setStyleClass(ControlKit.CSS.Wrap);
    this._listNode.setStyleClass(ControlKit.CSS.SubGroupList);

    this.set(params);

    this._wrapNode.addChild(this._listNode);
    this._rootNode.addChild(this._wrapNode);

    /*-------------------------------------_collapsed-----------------------------------------*/

    this._components = [];
    this._subGroups  = [];

    /*-------------------------------------------------------------------------------------*/
    //add first subgroup
    //TODO: FIX

    this._subGroupsInit = false;
    this._subGroups.push(new ControlKit.SubGroup(this,'',null));

    /*-------------------------------------------------------------------------------------*/

    this._parent.addEventListener(ControlKit.EventType.PANEL_MOVE_BEGIN,this,'onPanelMoveBegin');
    this._parent.addEventListener(ControlKit.EventType.PANEL_MOVE,      this,'onPanelMove');
    this._parent.addEventListener(ControlKit.EventType.PANEL_MOVE_END,  this,'onPanelMoveEnd');

};

ControlKit.Group.prototype = Object.create(ControlKit.AbstractGroup.prototype);

/*-------------------------------------------------------------------------------------*/

ControlKit.Group.prototype.set = function(params)
{
    /*-------------------------------------------------------------------------------------*/

    params           = params           || {};
    params.label     = params.label     || null;
    params.useLabels = params.useLabels || true;
    params.show      = params.show === undefined ? true : params.show;

    /*-------------------------------------------------------------------------------------*/

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

    //TODO: Add maxheight
};

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


ControlKit.Group.prototype.addStringInput     = function(object,value,label,params)       {return this._addComponent(new ControlKit.StringInput(     this.getSubGroup(),object,value,label,params));};
ControlKit.Group.prototype.addNumberInput     = function(object,value,label,params)       {return this._addComponent(new ControlKit.NumberInput(     this.getSubGroup(),object,value,label,params));};
ControlKit.Group.prototype.addRange           = function(object,value,label,params)       {return this._addComponent(new ControlKit.Range(           this.getSubGroup(),object,value,label,params));};
ControlKit.Group.prototype.addCheckbox        = function(object,value,label,params)       {return this._addComponent(new ControlKit.Checkbox(        this.getSubGroup(),object,value,label,params));};
ControlKit.Group.prototype.addButton          = function(label,onPress)                   {return this._addComponent(new ControlKit.Button(          this.getSubGroup(),label,onPress));};
ControlKit.Group.prototype.addSelect          = function(object,value,target,label,params){return this._addComponent(new ControlKit.Select(          this.getSubGroup(),object,value,target,label,params));};
ControlKit.Group.prototype.addSlider          = function(object,value,target,label,params){return this._addComponent(new ControlKit.Slider(          this.getSubGroup(),object,value,target,label,params));};


ControlKit.Group.prototype.addFunctionPlotter = function(object,value,label,params)       {return this._addComponent(new ControlKit.FunctionPlotter( this.getSubGroup(),object,value,label,params));};
ControlKit.Group.prototype.addPad             = function(object,value,label,params)       {return this._addComponent(new ControlKit.Pad(             this.getSubGroup(),object,value,label,params));};
ControlKit.Group.prototype.addValuePlotter    = function(object,value,label,params)       {return this._addComponent(new ControlKit.ValuePlotter(    this.getSubGroup(),object,value,label,params));};
ControlKit.Group.prototype.addNumberOutput    = function(object,value,label,params)       {return this._addComponent(new ControlKit.NumberOutput(    this.getSubGroup(),object,value,label,params));};
ControlKit.Group.prototype.addStringOutput    = function(object,value,label,params)       {return this._addComponent(new ControlKit.StringOutput(    this.getSubGroup(),object,value,label,params));};

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
    this.getSubGroup().update();
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
        this.getSubGroup().set(label,params);
        this._subGroupsInit = true;
    }
    else this._subGroups.push(new ControlKit.SubGroup(this,label,params));

    this._updateHeight();
    return this;
};

ControlKit.Group.prototype.getSubGroup = function(){return this._subGroups[this._subGroups.length-1];};

/*-------------------------------------------------------------------------------------*/

ControlKit.Group.prototype.getComponents = function(){return this._components;};





