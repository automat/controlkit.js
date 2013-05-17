ControlKit.Group = function(parent,params)
{
    ControlKit.AbstractGroup.apply(this,arguments);

    /*-------------------------------------------------------------------------------------*/

    params = params || {};

    /*-------------------------------------------------------------------------------------*/

    var rootNode = this._rootNode.setStyleClass(ControlKit.CSS.Group),
        wrapNode = this._wrapNode.setStyleClass(ControlKit.CSS.Wrap),
        listNode = this._listNode.setStyleClass(ControlKit.CSS.SubGroupList);

    //TODO: FIX ORDER!!!
    wrapNode.addChild(listNode);
    this.set(params);
    rootNode.addChild(wrapNode);
    this._setBuffer(params);

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
        if(!params.maxHeight)this._wrapNode.getStyle().borderTop = "1px solid #3b4447";
    }

    /*-------------------------------------------------------------------------------------*/

    if(params.maxHeight)
    {
        var maxHeight = this._maxHeight = params.maxHeight,
            wrapNode  = this._wrapNode;

        if(!this._hidden)wrapNode.setHeight(maxHeight);
        this._scrollbar  = new ControlKit.ScrollBar(wrapNode,this._listNode,maxHeight);
    }
};

//TODO: Rethink
ControlKit.Group.prototype._setBuffer = function(params)
{
    if(!params.maxHeight)return;

    var rootNode = this._rootNode;

    if(!params.label)
    {
        var bufferTop = this._scrollBufferTop = new ControlKit.Node(ControlKit.NodeType.DIV);
            bufferTop.setStyleClass(ControlKit.CSS.ScrollBuffer);
            rootNode.addChildAt(bufferTop,0);
    }

    var bufferBottom = this._scrollBufferBottom = new ControlKit.Node(ControlKit.NodeType.DIV);
        bufferBottom.setStyleClass(ControlKit.CSS.ScrollBuffer);
        rootNode.addChild(bufferBottom);
};

/*-------------------------------------------------------------------------------------*/

ControlKit.Group.prototype.onPanelMoveBegin = function(){this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.PANEL_MOVE_BEGIN,null));};
ControlKit.Group.prototype.onPanelMove      = function(){this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.PANEL_MOVE,      null))};
ControlKit.Group.prototype.onPanelMoveEnd   = function(){this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.PANEL_MOVE_END,  null))};

/*-------------------------------------------------------------------------------------*/


ControlKit.Group.prototype.onSubGroupTrigger = function(){if(!this._maxHeight)return;this._updateScrollBar();};

ControlKit.Group.prototype._updateScrollBar = function()
{
    var scrollbar = this._scrollbar,
        wrapNode  = this._wrapNode;

    var bufferTop    = this._scrollBufferTop,
        bufferBottom = this._scrollBufferBottom;

    scrollbar.update();

    if(!scrollbar.isValid())
    {
        scrollbar.hide();
        wrapNode.setHeight(wrapNode.getChildAt(1).getHeight());

        if(bufferTop   )bufferTop.setStyleProperty(   'display','none');
        if(bufferBottom)bufferBottom.setStyleProperty('display','none');
    }
    else
    {
        scrollbar.show();
        wrapNode.setHeight(this._maxHeight);

        if(bufferTop   )bufferTop.setStyleProperty(   'display','block');
        if(bufferBottom)bufferBottom.setStyleProperty('display','block');
    }
};

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

    if(this._maxHeight)this._scrollbar.update();
};

/*----------------------------------------------------------collapsed---------------------*/

ControlKit.Group.prototype._updateVisibility = function()
{
    var wrapNode = this._wrapNode,
        inidNode = this._indiNode;

    var bufferTop    = this._scrollBufferTop,
        bufferBottom = this._scrollBufferBottom;

    var scrollbar    = this._scrollbar;

    if(this._hidden)
    {
        wrapNode.setHeight(0);
        if(inidNode)inidNode.setStyleClass(ControlKit.CSS.ArrowBMin);

        if(scrollbar)
        {
            if(bufferTop   )bufferTop.setStyleProperty(   'display','none');
            if(bufferBottom)bufferBottom.setStyleProperty('display','none');
        }
    }
    else
    {
        wrapNode.setHeight(this._maxHeight ? wrapNode.getChildAt(1).getHeight() :
                                             wrapNode.getFirstChild().getHeight());

        if(inidNode)inidNode.setStyleClass(ControlKit.CSS.ArrowBMax);

        if(scrollbar)
        {
            if(scrollbar.isValid())
            {
                if(bufferTop   )bufferTop.setStyleProperty(   'display','block');
                if(bufferBottom)bufferBottom.setStyleProperty('display','block');
            }
        }
    }
};

/*-------------------------------------------------------------------------------------*/

//TODO: FIX
ControlKit.Group.prototype.addSubGroup  = function(params)
{

    if(!this._subGroupsInit)
    {
        this.getSubGroup().set(params);
        this._subGroupsInit = true;
    }
    else this._subGroups.push(new ControlKit.SubGroup(this,params));

    this._updateHeight();
    return this;
};

ControlKit.Group.prototype.getSubGroup = function(){return this._subGroups[this._subGroups.length-1];};

/*-------------------------------------------------------------------------------------*/

ControlKit.Group.prototype.getComponents = function(){return this._components;};





