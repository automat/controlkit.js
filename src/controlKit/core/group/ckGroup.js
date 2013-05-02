

function CKGroup(parent,params)
{
    CKAbstractGroup.apply(this,arguments);

    /*-------------------------------------------------------------------------------------*/

    params           = params           || {};
    params.label     = params.label     || null;
    params.useLabels = params.useLabels || true;
    params.show      = params.show === undefined ? true : params.show;

    /*-------------------------------------------------------------------------------------*/

    this._rootNode.setStyleClass(CKCSS.Group);
    this._wrapNode.setStyleClass(CKCSS.Wrap);
    this._listNode.setStyleClass(CKCSS.SubGroupList);

    /*-------------------------------------------------------------------------------------*/

    //Head

    if(params.label)
    {
        var headNode  = new CKNode(CKNodeType.DIV),
            lablNode  = new CKNode(CKNodeType.SPAN),
            indiNode  = this._indiNode = new CKNode(CKNodeType.DIV);

        headNode.setStyleClass(CKCSS.Head);
        lablNode.setStyleClass(CKCSS.Label);
        indiNode.setStyleClass(CKCSS.ArrowBMax);
        lablNode.setProperty('innerHTML',params.label);

        headNode.addChild(lablNode);
        headNode.addChild(indiNode);

        headNode.setEventListener(CKNodeEventType.MOUSE_DOWN,this._onHeadMouseDown.bind(this));

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

    this._parent.addEventListener(CKEventType.PANEL_MOVE_BEGIN,this,'onPanelMoveBegin');
    this._parent.addEventListener(CKEventType.PANEL_MOVE,      this,'onPanelMove');
    this._parent.addEventListener(CKEventType.PANEL_MOVE_END,  this,'onPanelMoveEnd');

    /*-------------------------------------------------------------------------------------*/
    //add first subgroup
    //TODO: FIX

    this._subGroupsInit = false;
    this._subGroups.push(new CKSubGroup(this,'',null));

    /*-------------------------------------------------------------------------------------*/
}

CKGroup.prototype = Object.create(CKAbstractGroup.prototype);

/*-------------------------------------------------------------------------------------*/

CKGroup.prototype.onPanelMoveBegin = function(){var eventType = CKEventType.PANEL_MOVE_BEGIN;if(!this.hasEventListener(eventType))return;this.dispatchEvent(new CKEvent(this,eventType));};
CKGroup.prototype.onPanelMove      = function(){var eventType = CKEventType.PANEL_MOVE;      if(!this.hasEventListener(eventType))return;this.dispatchEvent(new CKEvent(this,eventType))};
CKGroup.prototype.onPanelMoveEnd   = function(){var eventType = CKEventType.PANEL_MOVE_END;  if(!this.hasEventListener(eventType))return;this.dispatchEvent(new CKEvent(this,eventType))};

/*-------------------------------------------------------------------------------------*/

CKGroup.prototype.onSubGroupShown  = function(){this._updateVisibility();};
CKGroup.prototype.onSubGroupHidden = function(){this._updateVisibility();};

/*-------------------------------------------------------------------------------------*/


CKGroup.prototype._onHeadMouseDown   = function(){this._hidden = !this._hidden;this._updateVisibility();};

/*-------------------------------------------------------------------------------------*/


CKGroup.prototype.addStringInput     = function(object,value,label,params)       {return this._addComponent(new CKStringInput(     this,object,value,label,params));};
CKGroup.prototype.addNumberInput     = function(object,value,label,params)       {return this._addComponent(new CKNumberInput(     this,object,value,label,params));};
CKGroup.prototype.addRange           = function(object,value,label,params)       {return this._addComponent(new CKRange(           this,object,value,label,params));};
CKGroup.prototype.addCheckbox        = function(object,value,label,params)       {return this._addComponent(new CKCheckbox(        this,object,value,label,params));};
CKGroup.prototype.addButton          = function(label,onPress)                   {return this._addComponent(new CKButton(          this,label,onPress));};
CKGroup.prototype.addSelect          = function(object,value,target,label,params){return this._addComponent(new CKSelect(          this,object,value,target,label,params));};
CKGroup.prototype.addSlider          = function(object,value,target,label,params){return this._addComponent(new CKSlider(          this,object,value,target,label,params));};


CKGroup.prototype.addFunctionPlotter = function(object,value,label,params)       {return this._addComponent(new CKFunctionPlotter( this,object,value,label,params));};
CKGroup.prototype.addPad             = function(object,value,label,params)       {return this._addComponent(new CKPad(             this,object,value,label,params));};
CKGroup.prototype.addValuePlotter    = function(object,value,label,params)       {return this._addComponent(new CKValuePlotter(    this,object,value,label,params));};
CKGroup.prototype.addNumberOutput    = function(object,value,label,params)       {return this._addComponent(new CKNumberOutput(    this,object,value,label,params));};
CKGroup.prototype.addStringOutput    = function(object,value,label,params)       {return this._addComponent(new CKStringOutput(    this,object,value,label,params));};

/*-------------------------------------------------------------------------------------*/

// Generate component from Object
CKGroup.prototype.addObject = function(obj){};

/*-------------------------------------------------------------------------------------*/

CKGroup.prototype._addComponent = function(component)
{
    this._components.push(component);
    this._updateHeight();
    return this;
};

/*-------------------------------------------------------------------------------------*/

CKGroup.prototype._updateHeight = function()
{
    var wrapNode = this._wrapNode;
    wrapNode.setHeight(wrapNode.getFirstChild().getHeight());
};

/*----------------------------------------------------------collapsed---------------------*/

CKGroup.prototype._updateVisibility = function()
{
    var wrapNode = this._wrapNode,
        inidNode = this._indiNode;

    if(this._hidden)
    {
        wrapNode.setHeight(0);
        if(inidNode)inidNode.setStyleClass(CKCSS.ArrowBMin);
    }
    else
    {
        wrapNode.setHeight(wrapNode.getFirstChild().getHeight());
        if(inidNode)inidNode.setStyleClass(CKCSS.ArrowBMax);
    }
};

/*-------------------------------------------------------------------------------------*/

//TODO: FIX
CKGroup.prototype.addSubGroup  = function(label,params)
{

    if(!this._subGroupsInit)
    {
        this.getActiveSubGroup().set(label,params);
        this._subGroupsInit = true;
    }
    else this._subGroups.push(new CKSubGroup(this,label,params));

    this._updateHeight();
    return this;
};

/*-------------------------------------------------------------------------------------*/

CKGroup.prototype.getComponents = function(){return this._components;};

CKGroup.prototype.getActiveSubGroup = function(){return this._subGroups[this._subGroups.length-1];};



