

ControlKit.CKGroup = function(parent,params)
{
    ControlKit.CKAbstractGroup.apply(this,arguments);

    /*-------------------------------------------------------------------------------------*/

    params           = params           || {};
    params.label     = params.label     || null;
    params.useLabels = params.useLabels || true;
    params.show      = params.show === undefined ? true : params.show;

    /*-------------------------------------------------------------------------------------*/

    this._rootNode.setStyleClass(ControlKit.CKCSS.Group);
    this._wrapNode.setStyleClass(ControlKit.CKCSS.Wrap);
    this._listNode.setStyleClass(ControlKit.CKCSS.SubGroupList);

    /*-------------------------------------------------------------------------------------*/

    //Head

    if(params.label)
    {
        var headNode  = new ControlKit.CKNode(ControlKit.CKNodeType.DIV),
            lablNode  = new ControlKit.CKNode(ControlKit.CKNodeType.SPAN),
            indiNode  = this._indiNode = new ControlKit.CKNode(ControlKit.CKNodeType.DIV);

        headNode.setStyleClass(ControlKit.CKCSS.Head);
        lablNode.setStyleClass(ControlKit.CKCSS.Label);
        indiNode.setStyleClass(ControlKit.CKCSS.ArrowBMax);
        lablNode.setProperty('innerHTML',params.label);

        headNode.addChild(lablNode);
        headNode.addChild(indiNode);

        headNode.setEventListener(ControlKit.CKNodeEventType.MOUSE_DOWN,this._onHeadMouseDown.bind(this));

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

    this._parent.addEventListener(ControlKit.CKEventType.PANEL_MOVE_BEGIN,this,'onPanelMoveBegin');
    this._parent.addEventListener(ControlKit.CKEventType.PANEL_MOVE,      this,'onPanelMove');
    this._parent.addEventListener(ControlKit.CKEventType.PANEL_MOVE_END,  this,'onPanelMoveEnd');

    /*-------------------------------------------------------------------------------------*/
    //add first subgroup
    //TODO: FIX

    this._subGroupsInit = false;
    this._subGroups.push(new ControlKit.CKSubGroup(this,'',null));

    /*-------------------------------------------------------------------------------------*/
}

ControlKit.CKGroup.prototype = Object.create(ControlKit.CKAbstractGroup.prototype);

/*-------------------------------------------------------------------------------------*/

ControlKit.CKGroup.prototype.onPanelMoveBegin = function(){var eventType = ControlKit.CKEventType.PANEL_MOVE_BEGIN;if(!this.hasEventListener(eventType))return;this.dispatchEvent(new ControlKit.CKEvent(this,eventType));};
ControlKit.CKGroup.prototype.onPanelMove      = function(){var eventType = ControlKit.CKEventType.PANEL_MOVE;      if(!this.hasEventListener(eventType))return;this.dispatchEvent(new ControlKit.CKEvent(this,eventType))};
ControlKit.CKGroup.prototype.onPanelMoveEnd   = function(){var eventType = ControlKit.CKEventType.PANEL_MOVE_END;  if(!this.hasEventListener(eventType))return;this.dispatchEvent(new ControlKit.CKEvent(this,eventType))};

/*-------------------------------------------------------------------------------------*/

ControlKit.CKGroup.prototype.onSubGroupShown  = function(){this._updateVisibility();};
ControlKit.CKGroup.prototype.onSubGroupHidden = function(){this._updateVisibility();};

/*-------------------------------------------------------------------------------------*/


ControlKit.CKGroup.prototype._onHeadMouseDown   = function(){this._hidden = !this._hidden;this._updateVisibility();};

/*-------------------------------------------------------------------------------------*/


ControlKit.CKGroup.prototype.addStringInput     = function(object,value,label,params)       {return this._addComponent(new ControlKit.CKStringInput(     this,object,value,label,params));};
ControlKit.CKGroup.prototype.addNumberInput     = function(object,value,label,params)       {return this._addComponent(new ControlKit.CKNumberInput(     this,object,value,label,params));};
ControlKit.CKGroup.prototype.addRange           = function(object,value,label,params)       {return this._addComponent(new ControlKit.CKRange(           this,object,value,label,params));};
ControlKit.CKGroup.prototype.addCheckbox        = function(object,value,label,params)       {return this._addComponent(new ControlKit.CKCheckbox(        this,object,value,label,params));};
ControlKit.CKGroup.prototype.addButton          = function(label,onPress)                   {return this._addComponent(new ControlKit.CKButton(          this,label,onPress));};
ControlKit.CKGroup.prototype.addSelect          = function(object,value,target,label,params){return this._addComponent(new ControlKit.CKSelect(          this,object,value,target,label,params));};
ControlKit.CKGroup.prototype.addSlider          = function(object,value,target,label,params){return this._addComponent(new ControlKit.CKSlider(          this,object,value,target,label,params));};


ControlKit.CKGroup.prototype.addFunctionPlotter = function(object,value,label,params)       {return this._addComponent(new ControlKit.CKFunctionPlotter( this,object,value,label,params));};
ControlKit.CKGroup.prototype.addPad             = function(object,value,label,params)       {return this._addComponent(new ControlKit.CKPad(             this,object,value,label,params));};
ControlKit.CKGroup.prototype.addValuePlotter    = function(object,value,label,params)       {return this._addComponent(new ControlKit.CKValuePlotter(    this,object,value,label,params));};
ControlKit.CKGroup.prototype.addNumberOutput    = function(object,value,label,params)       {return this._addComponent(new ControlKit.CKNumberOutput(    this,object,value,label,params));};
ControlKit.CKGroup.prototype.addStringOutput    = function(object,value,label,params)       {return this._addComponent(new ControlKit.CKStringOutput(    this,object,value,label,params));};

/*-------------------------------------------------------------------------------------*/

// Generate component from Object
ControlKit.CKGroup.prototype.addObject = function(obj){};

/*-------------------------------------------------------------------------------------*/

ControlKit.CKGroup.prototype._addComponent = function(component)
{
    this._components.push(component);
    this._updateHeight();
    return this;
};

/*-------------------------------------------------------------------------------------*/

ControlKit.CKGroup.prototype._updateHeight = function()
{
    var wrapNode = this._wrapNode;
    wrapNode.setHeight(wrapNode.getFirstChild().getHeight());
};

/*----------------------------------------------------------collapsed---------------------*/

ControlKit.CKGroup.prototype._updateVisibility = function()
{
    var wrapNode = this._wrapNode,
        inidNode = this._indiNode;

    if(this._hidden)
    {
        wrapNode.setHeight(0);
        if(inidNode)inidNode.setStyleClass(ControlKit.CKCSS.ArrowBMin);
    }
    else
    {
        wrapNode.setHeight(wrapNode.getFirstChild().getHeight());
        if(inidNode)inidNode.setStyleClass(ControlKit.CKCSS.ArrowBMax);
    }
};

/*-------------------------------------------------------------------------------------*/

//TODO: FIX
ControlKit.CKGroup.prototype.addSubGroup  = function(label,params)
{

    if(!this._subGroupsInit)
    {
        this.getActiveSubGroup().set(label,params);
        this._subGroupsInit = true;
    }
    else this._subGroups.push(new ControlKit.CKSubGroup(this,label,params));

    this._updateHeight();
    return this;
};

/*-------------------------------------------------------------------------------------*/

ControlKit.CKGroup.prototype.getComponents = function(){return this._components;};

ControlKit.CKGroup.prototype.getActiveSubGroup = function(){return this._subGroups[this._subGroups.length-1];};



