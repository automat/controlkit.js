/**
 *
 * controlKit.js - A lightweight controller library
 *
 * controlKit.js is available under the terms of the MIT license.  The full text of the
 * MIT license is included below.
 *
 * MIT License
 * ===========
 *
 * Copyright (c) 2013 Henryk Wollik. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */

var ControlKit = ControlKit || {};



ControlKit.Metric =
{
    COMPONENT_MIN_HEIGHT : 25,
    STROKE_SIZE          : 1,
    PADDING_WRAPPER      : 12,
    PADDING_OPTIONS      : 2,
    PADDING_PRESET       : 20,

    SCROLLBAR_TRACK_PADDING          : 2,
    FUNCTION_PLOTTER_LABEL_TICK_SIZE : 6
};
ControlKit.Preset =
{
    /*---------------------------------------------------------------------------------*/

    HISTORY_MAX_STATES : 30,
    NUMBER_INPUT_SHIFT_MULTIPLIER : 10,

    /*---------------------------------------------------------------------------------*/

    FUNCTION_PLOTTER_UNIT_X    :  1,
    FUNCTION_PLOTTER_UNIT_Y    :  1,
    FUNCTION_PLOTTER_UNIT_MIN  : 0.15,
    FUNCTION_PLOTTER_UNIT_MAX  : 4,
    FUNCTION_PLOTTER_SCALE     : 10.0,
    FUNCTION_PLOTTER_SCALE_MIN : 0.02,
    FUNCTION_PLOTTER_SCALE_MAX : 25

    /*---------------------------------------------------------------------------------*/

};
ControlKit.Default =
{
    KIT_OPACITY : 1.0,

    /*---------------------------------------------------------------------------------*/

    PANEL_POSITION  : [0,0],
    PANEL_WIDTH     : 300,
    PANEL_WIDTH_MIN : 150,
    PANEL_WIDTH_MAX : 600,
    PANEL_RATIO     : 40,
    PANEL_LABEL     : 'Control Panel',

    PANEL_VALIGN : ControlKit.Layout.ALIGN_TOP,
    PANEL_ALIGN  : ControlKit.Layout.ALIGN_RIGHT,

    PANEL_OPACITY : 1.0,

    PANEL_FIXED : true,

    /*---------------------------------------------------------------------------------*/

    COLOR_PICKER_VALUE_HUE : 200.0,
    COLOR_PICKER_VALUE_SAT : 50.0,
    COLOR_PICKER_VALUE_VAL : 50.0

    /*---------------------------------------------------------------------------------*/

};
ControlKit.Event = function(sender,type,data)
{
    this.sender = sender;
    this.type   = type;
    this.data   = data;
};

ControlKit.Event.prototype.clone = function()
{
    return new ControlKit.Event(this.sender,this.type,this.data);
};
ControlKit.EventDispatcher = function()
{
    this._listeners = [];
};

ControlKit.EventDispatcher.prototype =
{
    addEventListener : function(eventType,listener,callbackMethod)
    {
        this._listeners[eventType] = this._listeners[eventType] || [];
        this._listeners[eventType].push({obj:listener,method:callbackMethod});
    },

    dispatchEvent : function(event)
    {
        var type = event.type;

        if(!this.hasEventListener(type))return;

        var listeners = this._listeners[type];
        var i = -1, l = listeners.length;

        var obj,method;

        while(++i < l)
        {
            obj    = listeners[i].obj;
            method = listeners[i].method;

            if(!obj[method])throw obj + ' has no method ' + method;

            obj[method](event);
        }
    },

    removeEventListener : function(type,obj,method)
    {
        if(!this.hasEventListener(type))return;

        var listeners = this._listeners[type];

        var i = listeners.length;
        while(--i > -1)
        {
            if(listeners[i].obj == obj && listeners[i].method == method)
            {
                listeners.splice(i,1);
                if(listeners.length == 0)delete this._listeners[type];
                break;
            }
        }
    },

    removeAllEventListeners : function()
    {
        this._listeners = [];
    },


    hasEventListener : function(type)
    {
        return this._listeners[type] != undefined && this._listeners[type] != null;
    }
};
ControlKit.EventType =
{
    VALUE_UPDATED             : 'valueUpdated',
    UPDATE_VALUE              : 'updateValue',

    SELECT_TRIGGERED          : 'selectTrigger',
    TRIGGER_SELECT            : 'triggerSelect',

    PANEL_MOVE_BEGIN          : 'panelMoveBegin',
    PANEL_MOVE                : 'panelMove',
    PANEL_MOVE_END            : 'panelMoveEnd',

    PANEL_SHOW                : 'panelShow',
    PANEL_HIDE                : 'panelHide',

    PANEL_SCROLL_WRAP_ADDED   : 'panelScrollWrapAdded',
    PANEL_SCROLL_WRAP_REMOVED : 'panelScrollWrapRemoved',

    SUBGROUP_TRIGGER          : 'subGroupTrigger',

    COMPONENTS_ENABLE         : 'enableCompo',
    COMPONENTS_DISABLE        : 'disableComps',

    SUBGROUP_ENABLE          : 'enableSubGroup',
    SUBGROUP_DISABLE         : 'disableSubGroup',

    INDEX_ORDER_CHANGED      : 'indexOrderChanged',
    CHANGE_INDEX_ORDER       : 'changeIndexOrder',

    SCROLL_BEGIN             : 'scrollBegin',
    SCROLL                   : 'scroll',
    SCROLL_END               : 'scrollEnd',

    INPUT_SELECTDRAG_START   : 'inputSelectDragStart',
    INPUT_SELECTDRAG         : 'inputSelectDrag',
    INPUT_SELECTDRAG_END     : 'inputSelectDragEnd',

    INPUT_SELECT_DRAG        : 'inputSelectDrag',

    HISTORY_STATE_PUSH       : 'historyStatePush',
    HISTORY_STATE_POP        : 'historyStatePop',

    GROUP_SIZE_CHANGE        : 'groupSizeChange',
    GROUP_LIST_SIZE_CHANGE   : 'groupListSizeChange',
    GROUP_SIZE_UPDATE        : 'groupSizeUpdate',

    UPDATE_MENU            : 'updateMenu'
};
ControlKit.History = function()
{
    ControlKit.EventDispatcher.apply(this,arguments);
    this._states   = [];
    this._isDisabled = false;
};

ControlKit.History.prototype = Object.create(ControlKit.EventDispatcher.prototype);

/*---------------------------------------------------------------------------------*/

ControlKit.History.prototype.pushState = function(object,key,value)
{
    if(this._isDisabled)return;

    var states    = this._states,
        statesMax = ControlKit.Preset.HISTORY_MAX_STATES;

    if(states.length >= statesMax)states.shift();
    states.push({object:object,key:key,value:value});

    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.HISTORY_STATE_PUSH,null));
};

ControlKit.History.prototype.getState = function(object,key)
{
    var states    = this._states,
        statesLen = states.length;

    if(statesLen == 0)return null;

    var state,value;

    var i = -1;
    while(++i < statesLen)
    {
        state = states[i];

        if(state.object === object)
        {
            if(state.key === key)
            {
               value = state.value;
               break;
            }
        }
    }

    return value;
};

ControlKit.History.prototype.popState  = function()
{
    if(this._isDisabled)return;

    var states = this._states;
    if(states.length < 1)return;

    var lastState = states.pop();
    lastState.object[lastState.key] = lastState.value;

    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.HISTORY_STATE_POP,null));
};

ControlKit.History.prototype.getNumStates = function(){return this._states.length;};

/*---------------------------------------------------------------------------------*/

ControlKit.History._instance   = null;
ControlKit.History.init        = function(){return ControlKit.History._instance = new ControlKit.History();};
ControlKit.History.getInstance = function(){return ControlKit.History._instance;};

ControlKit.History.prototype.enable     = function(){this._isDisabled=false;};
ControlKit.History.prototype.disable    = function(){this._isDisabled=true;};
ControlKit.History.prototype.isDisabled = function(){return this._isDisabled;};
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

    if(ControlKit.CSS.Style)
    {
        var style = document.createElement('style');
            style.setAttribute('type','text/css');

        if(style.styleSheet){style.stylesheet.cssText = ControlKit.CSS.Style;}
        else style.appendChild(document.createTextNode(ControlKit.CSS.Style));

        document.getElementsByName('head')[0].appendChild(style);
    }

    node.setProperty('id',ControlKit.CSS.ControlKit);

    /*---------------------------------------------------------------------------------*/

    params         = params         || {};
    params.trigger = params.trigger || false;
    params.history = params.history || false;
    params.opacity = params.opacity || ControlKit.Default.KIT_OPACITY;

    /*---------------------------------------------------------------------------------*/

    this._node     = node;
    this._panels   = [];
    this._isDisabled = false;

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
            trigger.addEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onTriggerDown.bind(this));

        document.body.appendChild(trigger.getElement());
    }

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
    var disabled = this._isDisabled = !this._isDisabled;
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

ControlKit.Kit.prototype.onInputSelectDrag = function()
{
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.INPUT_SELECT_DRAG,null));
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
    if(this._isDisabled)return;

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

ControlKit.Kit.prototype.enable  = function(){this._isDisabled = false;};
ControlKit.Kit.prototype.disable = function(){this._isDisabled = true;};

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


ControlKit.getKitInstance = function(){return ControlKit.Kit._instance;};
ControlKit.CSS =
{
    ControlKit   : 'controlKit',

    Panel        : 'panel',
    Head         : 'head',
    Label        : 'label',
    Menu         : 'menu',
    Wrap         : 'wrap',

    MenuBtnClose : 'btnClose',
    MenuBtnHide  : 'btnHide',
    MenuBtnShow  : 'btnShow',
    MenuBtnUndo  : 'btnUndo',

    WrapInputWPreset : 'inputWPresetWrap',
    WrapColorWPreset : 'colorWPresetWrap',

    /*-------------------------------------------------------------------------------------*/

    HeadInactive : 'headInactive',
    PanelHeadInactive : 'panelHeadInactive',

    /*-------------------------------------------------------------------------------------*/

    GroupList : 'groupList',
    Group     : 'group',
    SubGroupList  : 'subGroupList',
    SubGroup      : 'subGroup',


    TextAreaWrap : 'textAreaWrap',

    IconArrowUpBig : 'iconArrowUpBig',


    /*-------------------------------------------------------------------------------------*/

    Button       : 'button',

    WrapSlider   : 'wrapSlider',

    SliderWrap   : 'sliderWrap',
    SliderSlot   : 'sliderSlot',
    SliderHandle : 'sliderHandle',

    ArrowBMin    : 'arrowBMin',
    ArrowBMax    : 'arrowBMax',
    ArrowBSubMin : 'arrowBSubMin',
    ArrowBSubMax : 'arrowBSubMax',
    ArrowSMin    : 'arrowSMin',
    ArrowSMax    : 'arrowSMax',

    /*-------------------------------------------------------------------------------------*/

    Select       : 'select',
    SelectActive : 'selectActive',

    Options         : 'options',
    OptionsSelected : 'liSelected',


    SelectColor : 'selectColor',

    /*-------------------------------------------------------------------------------------*/

    PresetBtn        : 'presetBtn',
    PresetBtnActive  : 'presetBtnActive',

    /*-------------------------------------------------------------------------------------*/

    CanvasListItem  : 'canvasListItem',
    CanvasWrap      : 'canvasWrap',

    SVGListItem     : 'svgListItem',
    SVGWrap         : 'svgWrap',

    GraphSliderXWrap   : 'graphSliderXWrap',
    GraphSliderYWrap   : 'graphSliderYWrap',
    GraphSliderX       : 'graphSliderX',
    GraphSliderY       : 'graphSliderY',
    GraphSliderXHandle : 'graphSliderXHandle',
    GraphSliderYHandle : 'graphSliderYHandle',

    /*-------------------------------------------------------------------------------------*/

    Picker              : 'picker',
    PickerPalleteWrap   : 'palleteWrap',
    PickerFieldWrap     : 'fieldWrap',
    PickerInputWrap     : 'inputWrap',
    PickerInputField    : 'inputField',
    PickerControlsWrap  : 'controlsWrap',
    PickerColorContrast : 'colorContrast',

    PickerHandleField  : 'indicator',
    PickerHandleSlider : 'indicator',

    Color : 'color',

    /*-------------------------------------------------------------------------------------*/

    ScrollBar        : 'scrollBar',
    ScrollWrap       : 'scrollWrap',
    ScrollbarBtnUp   : 'btnUp',
    ScrollbarBtnDown : 'btnDown',
    ScrollbarTrack   : 'track',
    ScrollbarThumb   : 'thumb',
    ScrollBuffer     : 'scrollBuffer',

    /*-------------------------------------------------------------------------------------*/

    Trigger : 'controlKitTrigger'
};

ControlKit.DocumentEventType =
{
    MOUSE_MOVE : 'mousemove',
    MOUSE_UP   : 'mouseup',
    MOUSE_DOWN : 'mousedown',

    WINDOW_RESIZE : 'resize'
};
ControlKit.Mouse = function()
{
    this._pos = [0,0];
    document.addEventListener(ControlKit.DocumentEventType.MOUSE_MOVE,this._onDocumentMouseMove.bind(this));
};

ControlKit.Mouse.prototype._onDocumentMouseMove = function(e)
{
    var dx = 0,
        dy = 0;

    if(!e)e = window.event;
    if(e.pageX)
    {
        dx = e.pageX;
        dy = e.pageY;
    }
    else if(e.clientX)
    {
        dx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
        dy = e.clientY + document.body.scrollTop  + document.documentElement.scrollTop;
    }
    this._pos[0] = dx;
    this._pos[1] = dy;
};

ControlKit.Mouse.prototype.getPosition = function(){return this._pos;};
ControlKit.Mouse.prototype.getX        = function(){return this._pos[0];};
ControlKit.Mouse.prototype.getY        = function(){return this._pos[1];};

ControlKit.Mouse.init        = function(){if(!ControlKit.Mouse._instance)ControlKit.Mouse._instance = new ControlKit.Mouse();};
ControlKit.Mouse.getInstance = function(){return ControlKit.Mouse._instance;};
ControlKit.NodeEventType =
{
    MOUSE_DOWN   : 'onmousedown',
    MOUSE_UP     : 'onmouseup',
    MOUSE_OVER   : 'onmouseover',
    MOUSE_MOVE   : 'onmousemove',
    MOUSE_OUT    : 'onmouseout',
    KEY_DOWN     : 'onkeydown',
    KEY_UP       : 'onkeyup',
    CHANGE       : 'onchange',
    FINISH       : 'onfinish',
    DBL_CLICK    : 'ondblclick',
    ON_CLICK     : 'onclick',
    SELECT_START : 'onselectstart',
    DRAG_START   : 'ondragstart',
    DRAG         : 'ondrag',
    DRAG_END     : 'ondragend',

    DRAG_ENTER   : 'ondragenter',
    DRAG_OVER    : 'ondragover',
    DRAG_LEAVE   : 'ondragleave'
};
ControlKit.NodeType =
{
    DIV            : 'div',
    INPUT_TEXT     : 'text',
    INPUT_BUTTON   : 'button',
    INPUT_SELECT   : 'select',
    INPUT_CHECKBOX : 'checkbox',
    OPTION         : 'option',
    LIST           : 'ul',
    LIST_ITEM      : 'li',
    SPAN           : 'span',
    TEXTAREA       : 'textarea'
};
ControlKit.Node = function()
{
    this._element = null;

    if(arguments.length == 1)
    {
        var arg  = arguments[0];

        if(arg != ControlKit.NodeType.INPUT_TEXT   &&
           arg != ControlKit.NodeType.INPUT_BUTTON &&
           arg != ControlKit.NodeType.INPUT_SELECT &&
           arg != ControlKit.NodeType.INPUT_CHECKBOX)
        {
            this._element = document.createElement(arg);
        }
        else
        {
            this._element = document.createElement('input');
            this._element.type = arg;
        }
    }
};

ControlKit.Node.prototype =
{
    addChild   : function(node)
    {
        this._element.appendChild(node.getElement());
        return node;
    },

    addChildren : function()
    {
        var i = -1,l = arguments.length,e = this._element;
        while(++i < l){e.appendChild(arguments[i].getElement());}
        return this;
    },

    addChildAt : function(node,index)
    {
        this._element.insertBefore(node.getElement(),this._element.children[index]);
        return node;
    },

    removeChild : function(node)
    {
        if(!this.contains(node))return null;
        this._element.removeChild(node.getElement());
        return node;
    },

    removeChildren : function()
    {
        var i = -1, l = arguments.length, e = this._element;
        while(++i<l){e.removeChild(arguments[i].getElement());}
        return this;
    },

    removeChildAt : function(node,index)
    {
        if(!this.contains(node))return null;
        this._element.removeChild(node.getElement());
        return node;
    },

    removeAllChildren : function()
    {
        var element = this._element;
        while(element.hasChildNodes())element.removeChild(element.lastChild);
        return this;
    },

    setWidth  : function(value){this._element.style.width = value + 'px'; return this;},
    getWidth  : function()     {return this._element.offsetWidth;},

    setHeight : function(value){this._element.style.height = value + 'px'; return this;},
    getHeight : function()     {return this._element.offsetHeight;},

    setPosition  : function(x,y){ return this.setPosition(x).setPosition(y);},
    setPositionX : function(x)  {this._element.style.marginLeft = x + 'px';return this;},
    setPositionY : function(y)  {this._element.style.marginTop  = y + 'px';return this;},

    setPositionGlobal  : function(x,y){return this.setPositionGlobalX(x).setPositionGlobalY(y);},
    setPositionGlobalX : function(x)  {this._element.style.left = x + 'px';return this;},
    setPositionGlobalY : function(y)  {this._element.style.top  = y + 'px';return this;},

    getPosition  : function(){return [this.getPositionX(),this.getPositionY()];},
    getPositionX : function(){return this._element.offsetLeft;},
    getPositionY : function(){return this._element.offsetTop;},

    getPositionGlobal : function()
    {
        var offset  = [0,0],
            element = this._element;

        while(element)
        {
            offset[0] += element.offsetLeft;
            offset[1] += element.offsetTop;
            element    = element.offsetParent;
        }

        return offset;
    },

    getPositionGlobalX : function()
    {
        var offset  = 0,
            element = this._element;

        while(element)
        {
            offset += element.offsetLeft;
            element = element.offsetParent;
        }

        return offset;
    },

    getPositionGlobalY : function()
    {
        var offset  = 0,
            element = this._element;

        while(element)
        {
            offset += element.offsetTop;
            element = element.offsetParent;
        }

        return offset;
    },

    addEventListener    : function(event,func){this._element[event] = func; return this;},
    removeEventListener : function(event)     {this._element[event] = '';return this;},

    setStyleClass      : function(style)         {this._element.className = style; return this;},
    setStyleProperty   : function(property,value){this._element.style[property] = value; return this;},
    getStyleProperty   : function(property)      {return this._element.style[property];},
    setStyleProperties : function(properties)    {for(var p in properties)this._element.style[p] = properties[p];return this;},

    deleteStyleClass      : function()           {this._element.className = '';return this},
    deleteStyleProperty   : function(property)   {this._element.style[property] = '';return this;},
    deleteStyleProperties : function(properties) {for(var p in properties)this._element.style[p] = '';return this;},

    getChildAt     : function(index) {return new ControlKit.Node().setElement(this._element.children[index]);},
    getChildIndex  : function(node)  {return this._indexOf(this._element,node.getElement());},
    getNumChildren : function()      {return this._element.children.length;},
    getFirstChild  : function()      {return new ControlKit.Node().setElement(this._element.firstChild);},
    getLastChild   : function()      {return new ControlKit.Node().setElement(this._element.lastChild);},
    hasChildren    : function()      {return this._element.children.length != 0;},
    contains       : function(node)  {return this._indexOf(this._element,node.getElement()) != -1;},

    _indexOf       : function(parentElement,element){return Array.prototype.indexOf.call(parentElement.children,element);},

    setProperty   : function(property, value){this._element[property] = value;return this;},
    setProperties : function(properties)     {for(var p in properties)this._element[p] = properties[p];return this;},
    getProperty   : function(property)       {return this._element[property];},


    setElement : function(element){this._element = element;return this;},
    getElement : function()       { return this._element;},

    getStyle   : function()       {return this._element.style;},

    getParent  : function(){ return new ControlKit.Node().setElement(this._element.parentNode); }
};

ControlKit.Node.getNodeByElement = function(element){return new ControlKit.Node().setElement(element);};
ControlKit.Node.getNodeById      = function(id)     {return new ControlKit.Node().setElement(document.getElementById(id));};


ControlKit.Layout =
{
    ALIGN_LEFT   : 'left',
    ALIGN_RIGHT  : 'right',
    ALIGN_TOP    : 'top',
    ALIGN_BOTTOM : 'bottom'
};
ControlKit.Component = function(parent,label)
{
    ControlKit.EventDispatcher.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    this._parent   = parent;
    this._isDisabled = false;

    /*---------------------------------------------------------------------------------*/

    var rootNode = this._node = new ControlKit.Node(ControlKit.NodeType.LIST_ITEM),
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

ControlKit.Component.prototype.enable     = function(){this._isDisabled = false;};
ControlKit.Component.prototype.disable    = function(){this._isDisabled = true; };

ControlKit.Component.prototype.isEnabled  = function(){return !this._isDisabled;};
ControlKit.Component.prototype.isDisabled = function(){return this._isDisabled};

ControlKit.Component.prototype.onEnable  = function(){this.enable();};
ControlKit.Component.prototype.onDisable = function(){this.disable();};


ControlKit.ObjectComponent = function(parent,object,value,params)
{
    /*-------------------------------------------------------------------------------------*/

    params       = params || {};
    params.label = params.label || value;

    /*-------------------------------------------------------------------------------------*/

    ControlKit.Component.apply(this,[parent,params.label]);

    this._object   = object;
    this._key      = value;

    this._onChange = function(){};
    this._onFinish = function(){};

    var kit = ControlKit.getKitInstance();
        kit.addEventListener( ControlKit.EventType.UPDATE_VALUE, this,'onValueUpdate');

    this.addEventListener(ControlKit.EventType.VALUE_UPDATED,kit, 'onValueUpdated');
};

ControlKit.ObjectComponent.prototype = Object.create(ControlKit.Component.prototype);

/*-------------------------------------------------------------------------------------*/

//Override in Subclass
ControlKit.ObjectComponent.prototype.applyValue       = function(){};
ControlKit.ObjectComponent.prototype.pushHistoryState = function(){var obj = this._object,key = this._key;ControlKit.History.getInstance().pushState(obj,key,obj[key]);};
ControlKit.ObjectComponent.prototype.onValueUpdate    = function(e){};
ControlKit.ObjectComponent.prototype.setValue         = function(value){this._object[this._key] = value;};

ControlKit.SVGComponent = function(parent,object,value,params)
{
    ControlKit.ObjectComponent.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    var wrapNode = this._wrapNode;
        wrapNode.setStyleClass(ControlKit.CSS.SVGWrap);
    var wrapSize = wrapNode.getWidth();

    var svg = this._svg = this._createSVGObject('svg');
        svg.setAttribute('version', '1.2');
        svg.setAttribute('baseProfile', 'tiny');
        svg.setAttribute('preserveAspectRatio','true');

        wrapNode.getElement().appendChild(svg);

    var svgRoot = this._svgRoot = svg.appendChild(this._createSVGObject('g'));
        svgRoot.setAttribute('transform','translate(0.5 0.5)');

    this._svgSetSize(wrapSize,wrapSize);
    this._updateHeight();

    /*---------------------------------------------------------------------------------*/

    this._node.setStyleClass(ControlKit.CSS.SVGListItem);

    this._parent.addEventListener(ControlKit.EventType.GROUP_SIZE_CHANGE, this, 'onGroupSizeChange');
    this.addEventListener(ControlKit.EventType.GROUP_SIZE_UPDATE, this._parent, 'onGroupSizeUpdate');
};

ControlKit.SVGComponent.prototype = Object.create(ControlKit.ObjectComponent.prototype);

/*---------------------------------------------------------------------------------*/

ControlKit.SVGComponent.prototype._updateHeight = function()
{
    var svgHeight = Number(this._svg.getAttribute('height'));

    this._wrapNode.setHeight(svgHeight);
    this._node.setHeight(svgHeight + ControlKit.Metric.PADDING_WRAPPER);
};

ControlKit.SVGComponent.prototype._redraw = function(){};

ControlKit.SVGComponent.prototype.onGroupSizeChange = function()
{
    var width = this._wrapNode.getWidth();

    this._svgSetSize(width,width);
    this._updateHeight();
    this._redraw();
};

/*---------------------------------------------------------------------------------*/

ControlKit.SVGComponent.prototype._createSVGObject = function(type)
{
    return document.createElementNS("http://www.w3.org/2000/svg",type);
};

ControlKit.SVGComponent.prototype._svgSetSize = function(width,height)
{
    var svg = this._svg;
        svg.setAttribute('width',  width);
        svg.setAttribute('height', height);
        svg.setAttribute('viewbox', '0 0 ' + width + ' ' + height);
};

/*---------------------------------------------------------------------------------*/

ControlKit.SVGComponent.prototype._pathCmdMoveTo          = function(x,y){return 'M ' + x + ' ' + y + ' ';};
ControlKit.SVGComponent.prototype._pathCmdLineTo          = function(x,y){return 'L ' + x + ' ' + y + ' ';};
ControlKit.SVGComponent.prototype._pathCmdClose           = function()   {return 'Z';};
ControlKit.SVGComponent.prototype._pathCmdLine            = function(x0,y0,x1,y1){return 'M ' + x0 + ' ' + y0 + ' L ' + x1 + ' ' + y1; };
ControlKit.SVGComponent.prototype._pathCmdBezierCubic     = function(cmd,x0,y0,cx0,cy0,cx1,cy1,x1,y1){return 'M ' + x0 + ' ' + y0 + ' C ' + cx0 + ' ' + cy0 + ', ' + cx1 + ' ' + cy1 + ', ' + x1 + ' ' + y1;};
ControlKit.SVGComponent.prototype._pathCmdBezierQuadratic = function(cmd,x0,y0,cx,cy,x1,y1)          {return 'M ' + x0 + ' '+ y0 + ' Q ' + cx + ' ' + cy + ', ' + x1 + ' ' + y1;};

//TODO: Add mouseoffset & reset..
ControlKit.ScrollBar = function(parentNode,targetNode,wrapHeight)
{
    this._parentNode = parentNode;
    this._targetNode = targetNode;
    this._wrapHeight = wrapHeight;

    /*---------------------------------------------------------------------------------*/

    var wrap   = this._wrapNode   = new ControlKit.Node(ControlKit.NodeType.DIV),
        node   = this._node   = new ControlKit.Node(ControlKit.NodeType.DIV),
        track  = this._trackNode  = new ControlKit.Node(ControlKit.NodeType.DIV),
        thumb  = this._thumbNode  = new ControlKit.Node(ControlKit.NodeType.DIV);

    /*---------------------------------------------------------------------------------*/

    parentNode.removeChild(targetNode);
    parentNode.addChild(wrap);
    parentNode.addChildAt(node,0);

    wrap.addChild(targetNode);
    node.addChild(track);
    track.addChild(thumb);

    /*---------------------------------------------------------------------------------*/

    wrap.setStyleClass(ControlKit.CSS.ScrollWrap);
    node.setStyleClass(ControlKit.CSS.ScrollBar);
    track.setStyleClass(ControlKit.CSS.ScrollbarTrack);
    thumb.setStyleClass(ControlKit.CSS.ScrollbarThumb);

    /*---------------------------------------------------------------------------------*/

    this._scrollHeight = 0;
    this._scrollUnit   = 0;

    this._scrollMin    = 0;
    this._scrollMax    = 1;
    this._scrollPos    = 0;


    thumb.setPositionY(ControlKit.Metric.SCROLLBAR_TRACK_PADDING);
    thumb.addEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onThumbDragStart.bind(this));

    this._isValid  = false;
    this._isDisabled = false;
};

ControlKit.ScrollBar.prototype =
{
    update : function()
    {
        var target  = this._targetNode,
            thumb   = this._thumbNode;

        var padding = ControlKit.Metric.SCROLLBAR_TRACK_PADDING;

        var targetWrapHeight = this._wrapHeight,
            targetHeight     = target.getHeight(),
            trackHeight      = targetWrapHeight - padding * 2;

        thumb.setHeight(trackHeight);

        var ratio = targetWrapHeight / targetHeight;

        this._isValid = false;

        if(ratio > 1.0)return;

        var thumbHeight = trackHeight * ratio;

        this._scrollHeight = trackHeight  - thumbHeight;
        this._scrollUnit   = targetHeight - trackHeight - padding * 2;

        thumb.setHeight(thumbHeight);

        this._isValid = true;


        /*
        var scrollMin = this._scrollMin,
            scrollMax = this._scrollMax,
            scrollPos = this._scrollPos;

        var scrollPosNorm = (scrollPos - scrollMin) / (scrollMax - scrollPos);
        */


    },

    _scrollThumb : function(y)
    {
        var thumb          = this._thumbNode,
            thumbHeight    = thumb.getHeight();

        var track        = this._trackNode,
            trackHeight  = this._wrapHeight,
            trackTop     = track.getPositionGlobalY(),
            trackCenter  = trackHeight * 0.5;

        var target       = this._targetNode;

        var scrollHeight = this._scrollHeight,
            scrollUnit   = this._scrollUnit;

        var min = this._scrollMin = trackCenter - scrollHeight * 0.5,
            max = this._scrollMax = trackCenter + scrollHeight * 0.5;

        var pos       = Math.max(min,Math.min(y - trackTop,max));

        var thumbPos  = this._scrollPos =  pos - thumbHeight * 0.5,
            targetPos = -(pos - min) / (max - min) * scrollUnit;

        thumb.setPositionY(thumbPos);
        target.setPositionY(targetPos);
    },

    _onThumbDragStart : function()
    {
        if(!this._isValid || this._isDisabled)return;

        var eventMouseMove = ControlKit.DocumentEventType.MOUSE_MOVE,
            eventMouseUp   = ControlKit.DocumentEventType.MOUSE_UP;

        var self = this;

        var mouse = ControlKit.Mouse.getInstance();

        //TODO:add
        this._scrollOffset = mouse.getY() - this._thumbNode.getPositionGlobalY();

        var onDrag    = function()
            {
                self._scrollThumb(mouse.getY());
            },

            onDragEnd = function()
            {
                document.removeEventListener(eventMouseMove, onDrag,    false);
                document.removeEventListener(eventMouseUp,   onDragEnd, false);
            };

        this._scrollThumb(mouse.getY());
        document.addEventListener(eventMouseMove, onDrag,    false);
        document.addEventListener(eventMouseUp,   onDragEnd, false);
    },

    enable  : function(){this._isDisabled = false;this._updateAppearance();},
    disable : function(){this._isDisabled = true; this._updateAppearance();},

    _updateAppearance : function()
    {
        if(this._isDisabled)
        {
            this._node.setStyleProperty('display','none');
            this._targetNode.setPositionY(0);
            this._thumbNode.setPositionY(ControlKit.Metric.SCROLLBAR_TRACK_PADDING);
        }
        else
        {
            this._node.setStyleProperty('display','block');
        }
    },

    isValid : function(){return this._isValid;},

    setWrapHeight : function(height)
    {
        this._wrapHeight = height;
        this.update();
    },

    removeTargetNode : function(){return this._wrapNode.removeChild(this._targetNode);},

    removeFromParent : function()
    {
        var parentNode = this._parentNode,
            rootNode   = this._node,
            targetNode = this._targetNode;

        rootNode.removeChild(targetNode);
        parentNode.removeChild(this._wrapNode);
        parentNode.removeChild(rootNode);

        return targetNode;
    },

    getWrapNode    : function(){return this._wrapNode;},
    getNode        : function(){return this._node;},
    getTargetNode  : function(){return this._targetNode;}
};

ControlKit.AbstractGroup = function(parent,params)
{
    ControlKit.EventDispatcher.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params        = params        || {};
    params.height = params.height || null;

    /*---------------------------------------------------------------------------------*/

    this._parent    = parent;
    this._height    = params.height;
    this._isDisabled  = false;
    this._scrollBar = null;

    this._node = new ControlKit.Node(ControlKit.NodeType.LIST_ITEM);
    this._wrapNode = new ControlKit.Node(ControlKit.NodeType.DIV);
    this._listNode = new ControlKit.Node(ControlKit.NodeType.LIST);

    this._parent.getList().addChild(this._node);

    ControlKit.getKitInstance().addEventListener(ControlKit.EventType.INPUT_SELECT_DRAG,
                                                 this,'onInputSelectDrag');
};

ControlKit.AbstractGroup.prototype = Object.create(ControlKit.EventDispatcher.prototype);

/*---------------------------------------------------------------------------------*/

ControlKit.AbstractGroup.prototype.addScrollWrap = function()
{
    var wrapNode  = this._wrapNode,
        maxHeight = this.getMaxHeight();

    this._scrollBar = new ControlKit.ScrollBar(wrapNode,this._listNode,maxHeight);
    if(this.isEnabled())wrapNode.setHeight(maxHeight);
};

//Prevent chrome select drag
ControlKit.AbstractGroup.prototype.onInputSelectDrag = function()
{
    if(!this.hasScrollWrap())return;
    this._wrapNode.getElement().scrollTop = 0;
};

ControlKit.AbstractGroup.prototype.hasMaxHeight  = function(){return this._height != null;};
ControlKit.AbstractGroup.prototype.getMaxHeight  = function(){return this._height;};
ControlKit.AbstractGroup.prototype.hasScrollWrap = function(){return this._scrollBar != null;};
ControlKit.AbstractGroup.prototype.hasLabel      = function(){return this._lablNode;};

ControlKit.AbstractGroup.prototype.disable      = function() {this._isDisabled = false; this._updateAppearance();};
ControlKit.AbstractGroup.prototype.enable       = function() {this._isDisabled = true;  this._updateAppearance();};
ControlKit.AbstractGroup.prototype.isDisabled   = function() {return this._isDisabled;};
ControlKit.AbstractGroup.prototype.isEnabled    = function() {return !this._isDisabled;};

ControlKit.AbstractGroup.prototype.getList      = function(){return this._listNode;};


ControlKit.Group = function(parent,params)
{
    ControlKit.AbstractGroup.apply(this,arguments);

    /*-------------------------------------------------------------------------------------*/

    params           = params || {};
    params.label     = params.label     || null;
    params.useLabels = params.useLabels || true;
    params.enable    = params.enable === undefined ? true : params.enable;

    /*-------------------------------------------------------------------------------------*/

    this._components = [];
    this._subGroups  = [];

    /*-------------------------------------------------------------------------------------*/

    var rootNode = this._node,
        wrapNode = this._wrapNode,
        listNode = this._listNode;

        rootNode.setStyleClass(ControlKit.CSS.Group);
        wrapNode.setStyleClass(ControlKit.CSS.Wrap);
        listNode.setStyleClass(ControlKit.CSS.SubGroupList);

        wrapNode.addChild(listNode);

    /*-------------------------------------------------------------------------------------*/

    var label = params.label;

    if(label)
    {
        var headNode  = new ControlKit.Node(ControlKit.NodeType.DIV),
            lablWrap  = new ControlKit.Node(ControlKit.NodeType.DIV),
            lablNode  = new ControlKit.Node(ControlKit.NodeType.SPAN),
            indiNode  = this._indiNode = new ControlKit.Node(ControlKit.NodeType.DIV);

            headNode.setStyleClass(ControlKit.CSS.Head);
            lablWrap.setStyleClass(ControlKit.CSS.Wrap);
            lablNode.setStyleClass(ControlKit.CSS.Label);
            indiNode.setStyleClass(ControlKit.CSS.ArrowBMax);
            lablNode.setProperty('innerHTML',label);

            headNode.addChild(indiNode);
            lablWrap.addChild(lablNode);
            headNode.addChild(lablWrap);

        headNode.addEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onHeadTrigger.bind(this));
        this.addEventListener(ControlKit.EventType.GROUP_LIST_SIZE_CHANGE,this._parent,'onGroupListSizeChange');

        rootNode.addChild(headNode);

        if(!params.enable)this.disable();
    }

    if(this.hasMaxHeight())this.addScrollWrap();

    rootNode.addChild(wrapNode);

    if(this.hasMaxHeight())
    {
        if(!label)
        {
            var bufferTop = this._scrollBufferTop = new ControlKit.Node(ControlKit.NodeType.DIV);
                bufferTop.setStyleClass(ControlKit.CSS.ScrollBuffer);

            rootNode.addChildAt(bufferTop,0);
        }

        var bufferBottom = this._scrollBufferBottom = new ControlKit.Node(ControlKit.NodeType.DIV);
            bufferBottom.setStyleClass(ControlKit.CSS.ScrollBuffer);

        rootNode.addChild(bufferBottom);
    }

    /*-------------------------------------------------------------------------------------*/

    this._parent.addEventListener(ControlKit.EventType.PANEL_MOVE_BEGIN,          this, 'onPanelMoveBegin');
    this._parent.addEventListener(ControlKit.EventType.PANEL_MOVE,                this, 'onPanelMove');
    this._parent.addEventListener(ControlKit.EventType.PANEL_MOVE_END,            this, 'onPanelMoveEnd');
    this._parent.addEventListener(ControlKit.EventType.PANEL_HIDE,                this, 'onPanelHide');
    this._parent.addEventListener(ControlKit.EventType.PANEL_SHOW,                this, 'onPanelShow');
    this._parent.addEventListener(ControlKit.EventType.PANEL_SCROLL_WRAP_ADDED,   this, 'onPanelScrollWrapAdded');
    this._parent.addEventListener(ControlKit.EventType.PANEL_SCROLL_WRAP_REMOVED, this, 'onPanelScrollWrapRemoved');

    /*-------------------------------------------------------------------------------------*/

    this.addEventListener(ControlKit.EventType.GROUP_SIZE_CHANGE,this._parent,'onGroupListSizeChange');
};

ControlKit.Group.prototype = Object.create(ControlKit.AbstractGroup.prototype);

/*-------------------------------------------------------------------------------------*/

ControlKit.Group.prototype.onPanelMoveBegin         = function(){this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.PANEL_MOVE_BEGIN,  null));};
ControlKit.Group.prototype.onPanelMove              = function(){this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.PANEL_MOVE,        null));};
ControlKit.Group.prototype.onPanelMoveEnd           = function(){this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.PANEL_MOVE_END,    null));};
ControlKit.Group.prototype.onPanelScrollWrapAdded   = function(){this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.GROUP_SIZE_CHANGE, null));};
ControlKit.Group.prototype.onPanelScrollWrapRemoved = function(){this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.GROUP_SIZE_CHANGE, null));};
ControlKit.Group.prototype.onPanelHide              = function(){this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.SUBGROUP_DISABLE,  null));};
ControlKit.Group.prototype.onPanelShow              = function(){this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.SUBGROUP_ENABLE,   null));};

/*-------------------------------------------------------------------------------------*/

ControlKit.Group.prototype.onSubGroupTrigger = function()
{
    this._updateHeight();

    if(!this.hasMaxHeight())return;

    var scrollBar = this._scrollBar,
        wrapNode  = this._wrapNode;

    var bufferTop    = this._scrollBufferTop,
        bufferBottom = this._scrollBufferBottom;

    scrollBar.update();

    if(!scrollBar.isValid())
    {
        scrollBar.disable();
        wrapNode.setHeight(wrapNode.getChildAt(1).getHeight());

        if(bufferTop   )bufferTop.setStyleProperty(   'display','none');
        if(bufferBottom)bufferBottom.setStyleProperty('display','none');
    }
    else
    {
        scrollBar.enable();
        wrapNode.setHeight(this.getMaxHeight());

        if(bufferTop   )bufferTop.setStyleProperty(   'display','block');
        if(bufferBottom)bufferBottom.setStyleProperty('display','block');
    }

    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.GROUP_SIZE_CHANGE,null));
};

/*-------------------------------------------------------------------------------------*/

ControlKit.Group.prototype._onHeadTrigger = function()
{
    this._isDisabled = !this._isDisabled;
    this._updateAppearance();
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.GROUP_LIST_SIZE_CHANGE,null));
};

/*-------------------------------------------------------------------------------------*/

ControlKit.Group.prototype.addStringInput     = function(object,value,params)       {return this._addComponent(new ControlKit.StringInput(     this.getSubGroup(),object,value,params));};
ControlKit.Group.prototype.addNumberInput     = function(object,value,params)       {return this._addComponent(new ControlKit.NumberInput(     this.getSubGroup(),object,value,params));};
ControlKit.Group.prototype.addRange           = function(object,value,params)       {return this._addComponent(new ControlKit.Range(           this.getSubGroup(),object,value,params));};
ControlKit.Group.prototype.addCheckbox        = function(object,value,params)       {return this._addComponent(new ControlKit.Checkbox(        this.getSubGroup(),object,value,params));};
ControlKit.Group.prototype.addColor           = function(object,value,params)       {return this._addComponent(new ControlKit.Color(           this.getSubGroup(),object,value,params));};
ControlKit.Group.prototype.addButton          = function(label,onPress)             {return this._addComponent(new ControlKit.Button(          this.getSubGroup(),label,onPress));};
ControlKit.Group.prototype.addSelect          = function(object,value,target,params){return this._addComponent(new ControlKit.Select(          this.getSubGroup(),object,value,target,params));};
ControlKit.Group.prototype.addSlider          = function(object,value,target,params){return this._addComponent(new ControlKit.Slider(          this.getSubGroup(),object,value,target,params));};

ControlKit.Group.prototype.addFunctionPlotter = function(object,value,params)       {return this._addComponent(new ControlKit.FunctionPlotter( this.getSubGroup(),object,value,params));};
ControlKit.Group.prototype.addPad             = function(object,value,params)       {return this._addComponent(new ControlKit.Pad(             this.getSubGroup(),object,value,params));};
ControlKit.Group.prototype.addValuePlotter    = function(object,value,params)       {return this._addComponent(new ControlKit.ValuePlotter(    this.getSubGroup(),object,value,params));};
ControlKit.Group.prototype.addNumberOutput    = function(object,value,params)       {return this._addComponent(new ControlKit.NumberOutput(    this.getSubGroup(),object,value,params));};
ControlKit.Group.prototype.addStringOutput    = function(object,value,params)       {return this._addComponent(new ControlKit.StringOutput(    this.getSubGroup(),object,value,params));};

ControlKit.Group.prototype.addCanvas          = function(params)                    {return this._addComponent(new ControlKit.Canvas(          this.getSubGroup(),params));};
ControlKit.Group.prototype.addSVG             = function(params)                    {return this._addComponent(new ControlKit.SVG(             this.getSubGroup(),params));};

/*-------------------------------------------------------------------------------------*/

//TODO: Move to subroup
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

    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.GROUP_SIZE_CHANGE,null));

    if(this.hasMaxHeight())this._scrollBar.update();
};

/*----------------------------------------------------------collapsed---------------------*/

ControlKit.Group.prototype._updateAppearance = function()
{
    var wrapNode = this._wrapNode,
        inidNode = this._indiNode;

    var scrollBar = this._scrollBar;

    var bufferTop    = this._scrollBufferTop,
        bufferBottom = this._scrollBufferBottom;

    if(this.isDisabled())
    {
        wrapNode.setHeight(0);
        if(inidNode)inidNode.setStyleClass(ControlKit.CSS.ArrowBMin);

        if(scrollBar)
        {
            if(bufferTop   )bufferTop.setStyleProperty(   'display','none');
            if(bufferBottom)bufferBottom.setStyleProperty('display','none');
        }

        return;
    }

    var maxHeight = this.getMaxHeight(),
        listHeight;

    if (maxHeight)
    {
        listHeight = wrapNode.getChildAt(1).getHeight();
        wrapNode.setHeight(listHeight < maxHeight ? listHeight : maxHeight);

        if (scrollBar.isValid())
        {
            if (bufferTop)bufferTop.setStyleProperty('display', 'block');
            if (bufferBottom)bufferBottom.setStyleProperty('display', 'block');
        }
    }
    else
    {
        listHeight = wrapNode.getFirstChild().getHeight();
        wrapNode.setHeight(listHeight);
    }

    if (inidNode)inidNode.setStyleClass(ControlKit.CSS.ArrowBMax);
};

ControlKit.Group.prototype.onGroupSizeUpdate = function()
{
    this._updateAppearance();
    if(this.hasMaxHeight())this._scrollBar.update();
};

/*-------------------------------------------------------------------------------------*/

ControlKit.Group.prototype.addSubGroup  = function(params)
{
    this._subGroups.push(new ControlKit.SubGroup(this,params));
    this._updateHeight();
    return this;
};

/*-------------------------------------------------------------------------------------*/

ControlKit.Group.prototype.getSubGroup   = function()
{
    var subGroups    = this._subGroups,
        subGroupsLen = subGroups.length;

    if(subGroupsLen==0)this.addSubGroup(null);
    return subGroups[subGroupsLen-1];
};
ControlKit.Group.prototype.getComponents = function(){return this._components;};

ControlKit.SubGroup = function(parent,params)
{
    ControlKit.AbstractGroup.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params           = params        || {};
    params.label     = params.label  || null;
    params.enable    = params.enable === undefined ? true : params.enable;

    /*---------------------------------------------------------------------------------*/

    var rootNode = this._node,
        wrapNode = this._wrapNode,
        listNode = this._listNode;

        rootNode.setStyleClass(ControlKit.CSS.SubGroup);
        wrapNode.setStyleClass(ControlKit.CSS.Wrap);

        wrapNode.addChild(listNode);
        rootNode.addChild(wrapNode);

    /*-------------------------------------------------------------------------------------*/

    var label = params.label;

    if(label)
    {
        if(label.length != 0 && label != 'none')
        {
            var headNode = this._headNode = new ControlKit.Node(ControlKit.NodeType.DIV),
                lablWrap =                  new ControlKit.Node(ControlKit.NodeType.DIV),
                lablNode =                  new ControlKit.Node(ControlKit.NodeType.SPAN),
                indiNode = this._indiNode = new ControlKit.Node(ControlKit.NodeType.DIV);

                headNode.setStyleClass(ControlKit.CSS.Head);
                lablWrap.setStyleClass(ControlKit.CSS.Wrap);
                lablNode.setStyleClass(ControlKit.CSS.Label);
                indiNode.setStyleClass(ControlKit.CSS.ArrowBSubMax);
                //indiNode.setStyleClass(ControlKit.CSS.IconArrowUpBig);

                lablNode.setProperty('innerHTML',label);

                headNode.addChild(indiNode);
                lablWrap.addChild(lablNode);
                headNode.addChild(lablWrap);

            headNode.addEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onHeadMouseDown.bind(this));
            rootNode.addChildAt(headNode,0);

            if(!params.enable)this.disable();

            this.addEventListener(ControlKit.EventType.SUBGROUP_TRIGGER,this._parent,'onSubGroupTrigger');
        }
    }

    if(this.hasMaxHeight())this.addScrollWrap();

    /*-------------------------------------------------------------------------------------*/

    this._parent.addEventListener(ControlKit.EventType.SUBGROUP_ENABLE,  this, 'onEnable');
    this._parent.addEventListener(ControlKit.EventType.SUBGROUP_DISABLE, this, 'onDisable');
    this._parent.addEventListener(ControlKit.EventType.PANEL_MOVE_END,   this, 'onPanelMoveEnd');
    this._parent.addEventListener(ControlKit.EventType.GROUP_SIZE_CHANGE,this, 'onGroupSizeChange');

    this.addEventListener(ControlKit.EventType.GROUP_SIZE_UPDATE,this._parent,'onGroupSizeUpdate');
};

ControlKit.SubGroup.prototype = Object.create(ControlKit.AbstractGroup.prototype);

/*-------------------------------------------------------------------------------------*/

//FIXME

ControlKit.SubGroup.prototype._onHeadMouseDown = function()
{
    this._isDisabled = !this._isDisabled;this._onTrigger();

    var event = ControlKit.DocumentEventType.MOUSE_UP,
        self  = this;
    var onDocumenttMouseUp = function(){self._onTrigger();
        document.removeEventListener(event,onDocumenttMouseUp);};

    document.addEventListener(event,onDocumenttMouseUp);
};

ControlKit.SubGroup.prototype._onTrigger = function()
{
    this._updateAppearance();
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.SUBGROUP_TRIGGER,null));
};


/*-------------------------------------------------------------------------------------*/

ControlKit.SubGroup.prototype._updateAppearance = function()
{
    if(this.isDisabled())
    {
        this._headNode.setStyleClass(ControlKit.CSS.HeadInactive);
        this._indiNode.setStyleClass(ControlKit.CSS.ArrowBSubMin);
        this._wrapNode.setHeight(0);
    }
    else
    {
        var wrapNode = this._wrapNode;

        var height   = this.hasMaxHeight() ?
                       this.getMaxHeight() :
                       wrapNode.getFirstChild().getHeight();

        this._headNode.setStyleClass(ControlKit.CSS.Head);
        this._indiNode.setStyleClass(ControlKit.CSS.ArrowBSubMax);

        wrapNode.setHeight(height);
    }
};

ControlKit.SubGroup.prototype.update = function(){if(this.hasMaxHeight())this._scrollBar.update();};

/*-------------------------------------------------------------------------------------*/

ControlKit.SubGroup.prototype.onEnable          = function(){if(this.isDisabled())return;this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.COMPONENTS_ENABLE, null));};
ControlKit.SubGroup.prototype.onDisable         = function(){if(this.isDisabled())return;this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.COMPONENTS_DISABLE,null));};
//bubble
ControlKit.SubGroup.prototype.onGroupSizeChange = function(){this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.GROUP_SIZE_CHANGE,null));};
ControlKit.SubGroup.prototype.onGroupSizeUpdate = function(){this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.GROUP_SIZE_UPDATE,null));};
ControlKit.SubGroup.prototype.onPanelMoveEnd    = function(){this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.PANEL_MOVE_END,   null));};

/*-------------------------------------------------------------------------------------*/

ControlKit.SubGroup.prototype.hasLabel         = function()    {return this._headNode != null;};
ControlKit.SubGroup.prototype.addComponentNode = function(node){this._listNode.addChild(node);};








ControlKit.Panel = function(controlKit,params)
{
    ControlKit.EventDispatcher.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    var parent = this._parent = controlKit;

    /*---------------------------------------------------------------------------------*/

    params                 = params           || {};

    params.valign     = params.valign    || ControlKit.Default.PANEL_VALIGN;
    params.align      = params.align     || ControlKit.Default.PANEL_ALIGN;
    params.position   = params.position  || ControlKit.Default.PANEL_POSITION;
    params.width      = params.width     || ControlKit.Default.PANEL_WIDTH;
    params.height     = params.height    || null;
    params.ratio      = params.ratio     || ControlKit.Default.PANEL_RATIO;
    params.label      = params.label     || ControlKit.Default.PANEL_LABEL;
    params.opacity    = params.opacity   || ControlKit.Default.PANEL_OPACITY;

    params.fixed      = params.fixed === undefined ?
                        ControlKit.Default.PANEL_FIXED :
                        params.fixed;

    params.vconstrain = params.vconstrain || true;

    /*---------------------------------------------------------------------------------*/

    var align      = this._align      = params.align,
        height     = this._height     = params.height ?  Math.max(0,Math.min(params.height,window.innerHeight)) : null,
        width      = this._width      = Math.max(ControlKit.Default.PANEL_WIDTH_MIN,
                                        Math.min(params.width,ControlKit.Default.PANEL_WIDTH_MAX)),
        fixed      = this._fixed      = params.fixed,
        label      = this._label      = params.label,
        position   = this._position   = params.position,
        opacity    =                    params.opacity;

    this._vConstrain = params.vconstrain;

    /*---------------------------------------------------------------------------------*/

    this._isDisabled = false;

    this._groups = [];

    /*---------------------------------------------------------------------------------*/

    var rootNode  = this._node = new ControlKit.Node(ControlKit.NodeType.DIV),
        headNode  = this._headNode = new ControlKit.Node(ControlKit.NodeType.DIV),
        lablWrap  =                  new ControlKit.Node(ControlKit.NodeType.DIV),
        lablNode  =                  new ControlKit.Node(ControlKit.NodeType.SPAN),
        menuNode  =                  new ControlKit.Node(ControlKit.NodeType.DIV),
        wrapNode  = this._wrapNode = new ControlKit.Node(ControlKit.NodeType.DIV),
        listNode  = this._listNode = new ControlKit.Node(ControlKit.NodeType.LIST);

    var menuClose =                  new ControlKit.Node(ControlKit.NodeType.INPUT_BUTTON),
        menuHide  = this._menuHide = new ControlKit.Node(ControlKit.NodeType.INPUT_BUTTON);

    /*---------------------------------------------------------------------------------*/

        rootNode.setStyleClass(ControlKit.CSS.Panel);
        headNode.setStyleClass(ControlKit.CSS.Head);
        lablWrap.setStyleClass(ControlKit.CSS.Wrap);
        lablNode.setStyleClass(ControlKit.CSS.Label);
        menuNode.setStyleClass(ControlKit.CSS.Menu);
        wrapNode.setStyleClass(ControlKit.CSS.Wrap);
        listNode.setStyleClass(ControlKit.CSS.GroupList);

    /*---------------------------------------------------------------------------------*/

        menuClose.setStyleClass(ControlKit.CSS.MenuBtnClose);
        menuHide.setStyleClass( ControlKit.CSS.MenuBtnHide);

        rootNode.setWidth(width);
        lablNode.setProperty('innerHTML',label);

    /*---------------------------------------------------------------------------------*/

    controlKit.getNode().addChild(rootNode);

    /*---------------------------------------------------------------------------------*/

    if(!fixed)
    {
        this._mouseOffset  = [0,0];
        headNode.addEventListener(ControlKit.NodeEventType.MOUSE_DOWN,    this._onHeadDragStart.bind(this));
    }

    if(opacity != 1.0 && opacity != 0.0){rootNode.setStyleProperty('opacity',opacity);}

    /*---------------------------------------------------------------------------------*/

    if(!ControlKit.History.getInstance().isDisabled())
    {
        var menuUndo = this._menuUndo = new ControlKit.Node(ControlKit.NodeType.INPUT_BUTTON);
            menuUndo.setStyleClass( ControlKit.CSS.MenuBtnUndo);
            menuUndo.setProperty('value',ControlKit.History.getInstance().getNumStates());
            menuNode.addChild(menuUndo);
            menuUndo.setStyleProperty('display','none');
            menuUndo.addEventListener(ControlKit.NodeEventType.MOUSE_DOWN, this._onMenuUndoTrigger.bind(this));

            headNode.addEventListener(ControlKit.NodeEventType.MOUSE_OVER, this._onHeadMouseOver.bind(this));
            headNode.addEventListener(ControlKit.NodeEventType.MOUSE_OUT,  this._onHeadMouseOut.bind(this));
    }

    menuNode.addChild(menuHide);
    menuNode.addChild(menuClose);

    /*---------------------------------------------------------------------------------*/

    headNode.addChild(menuNode);
    lablWrap.addChild(lablNode);
    headNode.addChild(lablWrap);
    wrapNode.addChild(listNode);
    rootNode.addChild(headNode);
    rootNode.addChild(wrapNode);

    /*---------------------------------------------------------------------------------*/


    if(align == 'left')this._setPosition(position[0],position[1]);
    else               this._setPosition(window.innerWidth - (position[0] - width),position[1]);

    if(this.hasMaxHeight()){this._addScrollWrap();}

    /*---------------------------------------------------------------------------------*/

    menuHide.addEventListener( ControlKit.NodeEventType.MOUSE_DOWN, this._onMenuHideMouseDown.bind(this));
    menuClose.addEventListener(ControlKit.NodeEventType.MOUSE_DOWN, this.disable.bind(this));

    this._parent.addEventListener(ControlKit.EventType.UPDATE_MENU,      this, 'onUpdateMenu');
    this._parent.addEventListener(ControlKit.EventType.INPUT_SELECT_DRAG,this, 'onInputSelectDrag');

    window.addEventListener('resize',this._onWindowResize.bind(this));


};

ControlKit.Panel.prototype = Object.create(ControlKit.EventDispatcher.prototype);

/*---------------------------------------------------------------------------------*/

ControlKit.Panel.prototype.addGroup  = function(params)
{
    var group = new ControlKit.Group(this,params);
    this._groups.push(group);
    return group;
};

/*---------------------------------------------------------------------------------*/

ControlKit.Panel.prototype.onGroupListSizeChange = function()
{
    if(this._hasScrollWrap())this._updateScrollWrap();
    this._constrainHeight();
};

ControlKit.Panel.prototype._updateScrollWrap = function()
{
    var wrapNode   = this._wrapNode,
        scrollBar  = this._scrollBar,
        height     = this.hasMaxHeight() ? this.getMaxHeight() : 100,
        listHeight = this._listNode.getHeight();

    wrapNode.setHeight(listHeight < height ? listHeight : height);

    scrollBar.update();

    if (!scrollBar.isValid())
    {
        scrollBar.disable();
        wrapNode.setHeight(wrapNode.getChildAt(1).getHeight());
    }
    else
    {
        scrollBar.enable();
        wrapNode.setHeight(height);
    }
};


ControlKit.Panel.prototype._addScrollWrap = function()
{
    var wrapNode = this._wrapNode,
        listNode = this._listNode,
        height   = arguments.length == 0 ?
                   this.getMaxHeight() :
                   arguments[0];

    this._scrollBar = new ControlKit.ScrollBar(wrapNode,listNode,height);
    if(this.isEnabled())wrapNode.setHeight(height);
};

ControlKit.Panel.prototype._hasScrollWrap = function(){return this._scrollBar != null;};

/*---------------------------------------------------------------------------------*/

ControlKit.Panel.prototype._onMenuHideMouseDown = function()
{
    this._isDisabled = !this._isDisabled;
    this._updateAppearance();
};

ControlKit.Panel.prototype._updateAppearance = function()
{
    var rootNode = this._node,
        headNode = this._headNode,
        menuHide = this._menuHide;

    if(this._isDisabled)
    {
        headNode.getStyle().borderBottom = 'none';

        rootNode.setHeight(headNode.getHeight());
        menuHide.setStyleClass(ControlKit.CSS.MenuBtnShow);

        this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.PANEL_HIDE,null));
    }
    else
    {
        rootNode.setHeight(headNode.getHeight() +  this._wrapNode.getHeight());
        rootNode.deleteStyleProperty('height');
        menuHide.setStyleClass(ControlKit.CSS.MenuBtnHide);
        headNode.setStyleClass(ControlKit.CSS.Head);

        this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.PANEL_SHOW,null));
    }
};

ControlKit.Panel.prototype._onHeadMouseOver   = function(){this._menuUndo.setStyleProperty('display','inline')};
ControlKit.Panel.prototype._onHeadMouseOut    = function(){this._menuUndo.setStyleProperty('display','none')};
ControlKit.Panel.prototype.onUpdateMenu       = function(){this._menuUndo.setProperty('value',ControlKit.History.getInstance().getNumStates());};

ControlKit.Panel.prototype._onMenuUndoTrigger = function(){ControlKit.History.getInstance().popState();};

/*---------------------------------------------------------------------------------*
* Panel dragging
*----------------------------------------------------------------------------------*/

ControlKit.Panel.prototype._onHeadDragStart = function()
{
    var parentNode = this._parent.getNode(),
        node       = this._node;

    var nodePos   = node.getPositionGlobal(),
        mousePos  = ControlKit.Mouse.getInstance().getPosition(),
        offsetPos = this._mouseOffset;

    offsetPos[0] = mousePos[0] - nodePos[0];
    offsetPos[1] = mousePos[1] - nodePos[1];

    var eventMouseMove = ControlKit.DocumentEventType.MOUSE_MOVE,
        eventMouseUp   = ControlKit.DocumentEventType.MOUSE_UP;

    var self = this;

    var onDrag    = function()
                    {
                        self._updatePosition();
                    },

        onDragEnd = function()
                    {
                        document.removeEventListener(eventMouseMove, onDrag,    false);
                        document.removeEventListener(eventMouseUp,   onDragEnd, false);
                        self.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.PANEL_MOVE_END,null));
                    };

    parentNode.removeChild(node);
    parentNode.addChild(   node);

    document.addEventListener(eventMouseMove, onDrag,    false);
    document.addEventListener(eventMouseUp,   onDragEnd, false);

    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.PANEL_MOVE_BEGIN,null));
};

ControlKit.Panel.prototype._updatePosition = function()
{
    var mousePos  = ControlKit.Mouse.getInstance().getPosition(),
        offsetPos = this._mouseOffset;

    var currPositionX = mousePos[0] - offsetPos[0],
        currPositionY = mousePos[1] - offsetPos[1];

    this._setPosition(currPositionX,currPositionY);

    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.PANEL_MOVE,null));
};

ControlKit.Panel.prototype._onWindowResize = function()
{
    var position = this._position;
    this._setPosition(position[0],position[1]);
};

ControlKit.Panel.prototype.onInputSelectDrag = function()
{
    if(!this._hasScrollWrap())return;
    this._wrapNode.getElement().scrollTop = 0;
};

/*---------------------------------------------------------------------------------*/

ControlKit.Panel.prototype._setPosition = function(x,y)
{
    var node     = this._node,
        head     = this._headNode,
        position = this._position;

    var maxX = window.innerWidth  - node.getWidth(),
        maxY = window.innerHeight - head.getHeight();

    if(!this._fixed)
    {
        position[0] = Math.max(0,Math.min(x,maxX));
        position[1] = Math.max(0,Math.min(y,maxY));
    }
    else
    {
        //TODO FIX
        position[0] = maxX;
    }

    node.setPositionGlobal(position[0],position[1]);
    if(this._vConstrain)this._constrainHeight();
};

ControlKit.Panel.prototype._constrainHeight = function()
{
    var hasMaxHeight  = this.hasMaxHeight(),
        hasScrollWrap = this._hasScrollWrap();

    var headNode      = this._headNode,
        wrapNode      = this._wrapNode;

    var scrollBar     = this._scrollBar;

    var panelTop      = this._position[1],
        panelHeight   = hasMaxHeight  ? this.getMaxHeight() :
                        hasScrollWrap ? scrollBar.getTargetNode().getHeight() :
                        wrapNode.getHeight(),
        panelBottom   = panelTop + panelHeight,
        headHeight    = headNode.getHeight();

    var windowHeight  = window.innerHeight,
        heightDiff    = windowHeight - panelBottom - headHeight,
        heightSum;

    if(heightDiff < 0.0)
    {
        heightSum = panelHeight + heightDiff;

        if(!hasScrollWrap)
        {
            this._addScrollWrap(heightSum);
            this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.PANEL_SCROLL_WRAP_ADDED, null));
            return;
        }

        scrollBar.setWrapHeight(heightSum);
        wrapNode.setHeight(heightSum);
    }
    else
    {
        if(!hasMaxHeight && hasScrollWrap)
        {
            scrollBar.removeFromParent();
            wrapNode.addChild(this._listNode);
            wrapNode.deleteStyleProperty('height');

            this._scrollBar = null;

            this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.PANEL_SCROLL_WRAP_REMOVED, null));
        }
    }
};

/*---------------------------------------------------------------------------------*/

ControlKit.Panel.prototype.enable  = function()
{
    this._node.setStyleProperty('display','block');
    this._isDisabled = false;
    this._updateAppearance();
};

ControlKit.Panel.prototype.disable = function()
{
    this._node.setStyleProperty('display','none');
    this._isDisabled = true;
    this._updateAppearance();
};

ControlKit.Panel.prototype.isEnabled  = function(){return !this._isDisabled;};
ControlKit.Panel.prototype.isDisabled = function(){return this._isDisabled;};

/*---------------------------------------------------------------------------------*/

ControlKit.Panel.prototype.hasMaxHeight  = function(){return this._height != null;};
ControlKit.Panel.prototype.getMaxHeight  = function(){return this._height;};

/*---------------------------------------------------------------------------------*/

ControlKit.Panel.prototype.getGroups     = function(){return this._groups;};
ControlKit.Panel.prototype.getNode       = function(){return this._node;};
ControlKit.Panel.prototype.getList       = function(){return this._listNode;};

/*---------------------------------------------------------------------------------*/

ControlKit.Panel.prototype.getLabel      = function(){return this._label;};
ControlKit.Panel.prototype.getWidth      = function(){return this._width;};
ControlKit.Panel.prototype.getPosition   = function(){return this._position;};





ControlKit.Options = function(parentNode)
{
    this._parenNode = parentNode;

    var node     = this._node = new ControlKit.Node(ControlKit.NodeType.DIV);
    var listNode = this._listNode = new ControlKit.Node(ControlKit.NodeType.LIST);

    node.setStyleClass(ControlKit.CSS.Options);
    node.addChild(listNode);

    this._selectedIndex = null;
    this._callbackOut = function(){};

    this._unfocusable = false;

    document.addEventListener(ControlKit.DocumentEventType.MOUSE_DOWN,this._onDocumentMouseDown.bind(this));
    document.addEventListener(ControlKit.DocumentEventType.MOUSE_UP,  this._onDocumentMouseUp.bind(this));

    this.clear();
};

ControlKit.Options.prototype =
{

    _onDocumentMouseDown : function()
    {
        if(!this._unfocusable)return;
        this._callbackOut();
    },

    _onDocumentMouseUp : function()
    {
        this._unfocusable = true;
    },

    build : function(entries,selected,element,callbackSelect,callbackOut,paddingRight,entriesAreColors)
    {
        this._clearList();

        this._parenNode.addChild(this.getNode());

        var rootNode = this._node,
            listNode = this._listNode;

        paddingRight = paddingRight || 0;

        var self = this;

        // build list
        var itemNode,entry;
        var i = -1;

        if(entriesAreColors)
        {
            listNode.setStyleClass(ControlKit.CSS.Color);

            var color;

            while(++i < entries.length)
            {
                entry = entries[i];

                itemNode = listNode.addChild(new ControlKit.Node(ControlKit.NodeType.LIST_ITEM));

                color    = itemNode.addChild(new ControlKit.Node(ControlKit.NodeType.DIV));
                color.getStyle().backgroundColor = entry;
                color.getStyle().backgroundImage = 'linear-gradient( rgba(0,0,0,0) 0%, rgba(0,0,0,0.1) 100%)';
                color.setProperty('innerHTML',entry);

                if(entry == selected)itemNode.setStyleClass(ControlKit.CSS.OptionsSelected);

                itemNode.addEventListener(ControlKit.NodeEventType.MOUSE_DOWN,
                    function()
                    {
                        self._selectedIndex = Array.prototype.indexOf.call(this.parentNode.children,this);
                        callbackSelect();
                    });
            }

        }
        else
        {
            listNode.deleteStyleClass();

            while(++i < entries.length)
            {
                entry = entries[i];

                itemNode = listNode.addChild(new ControlKit.Node(ControlKit.NodeType.LIST_ITEM));
                itemNode.setProperty('innerHTML',entry);
                if(entry == selected)itemNode.setStyleClass(ControlKit.CSS.OptionsSelected);

                itemNode.addEventListener(ControlKit.NodeEventType.MOUSE_DOWN,
                    function()
                    {
                        self._selectedIndex = Array.prototype.indexOf.call(this.parentNode.children,this);
                        callbackSelect();
                    });
            }
        }

        //position, set width and enable

        var elementPos    = element.getPositionGlobal(),
            elementWidth  = element.getWidth() - paddingRight,
            elementHeight = element.getHeight();

        var listWidth  = listNode.getWidth();

        //hm FIXME
        var strokeSize = ControlKit.Metric.STROKE_SIZE;

        listNode.setWidth( (listWidth < elementWidth ? elementWidth : listWidth) - strokeSize * 2);
        rootNode.setPositionGlobal(elementPos[0],elementPos[1]+elementHeight-ControlKit.Metric.PADDING_OPTIONS);

        this._callbackOut = callbackOut;
        this._unfocusable = false;
    },

    _entriesAreColors : function(entries)
    {
        var regex = /^#[0-9A-F]{6}$/i;

        var i = -1;
        while(++i < entries.length){if(!regex.test(entries[i]))return false;}

        return true;
    },

    _clearList : function()
    {
        this._listNode.removeAllChildren();
        this._listNode.deleteStyleProperty('width');
        this._selectedIndex  = null;
        this._build          = false;
    },

    clear : function()
    {
        this._clearList();
        this._callbackOut = function(){};
        this._parenNode.removeChild(this.getNode());

    },

    isBuild     : function(){return this._build;},
    getNode     : function(){return this._node; },
    getSelectedIndex : function(){return this._selectedIndex;}
};

ControlKit.Options.init        = function(parentNode){return ControlKit.Options._instance = new ControlKit.Options(parentNode);};
ControlKit.Options.getInstance = function(){return ControlKit.Options._instance;};
ControlKit.NumberInput_Internal = function(stepValue,decimalPlaces,onBegin,onChange,onFinish)
{
    ControlKit.EventDispatcher.apply(this,null);

    /*---------------------------------------------------------------------------------*/

    this._value        = 0;
    this._valueStep    = stepValue || 1.0;
    this._valueDPlace  = decimalPlaces + 1;

    /*---------------------------------------------------------------------------------*/

    this._onBegin      = onBegin  || function(){};
    this._onChange     = onChange || function(){};
    this._onFinish     = onFinish || function(){};

    /*---------------------------------------------------------------------------------*/

    var input = this._input = new ControlKit.Node(ControlKit.NodeType.INPUT_TEXT);
    input.setProperty('value',this._value);

    /*---------------------------------------------------------------------------------*/

    input.addEventListener(ControlKit.NodeEventType.KEY_DOWN, this._onInputKeyDown.bind(this));
    input.addEventListener(ControlKit.NodeEventType.KEY_UP,   this._onInputKeyUp.bind(this));
    input.addEventListener(ControlKit.NodeEventType.CHANGE,   this._onInputChange.bind(this));
};

ControlKit.NumberInput_Internal.prototype = Object.create(ControlKit.EventDispatcher.prototype);

ControlKit.NumberInput_Internal.prototype._onInputKeyDown = function(e)
{
    var step       = (e.shiftKey ? ControlKit.Preset.NUMBER_INPUT_SHIFT_MULTIPLIER : 1) * this._valueStep,
        keyCode    =  e.keyCode;

    if( keyCode == 38 ||
        keyCode == 40 )
    {
        e.preventDefault();

        var multiplier = keyCode == 38 ? 1.0 : -1.0;
        this._value   += (step * multiplier);

        this._onBegin();
        this._onChange();
        this._format();
    }
};

ControlKit.NumberInput_Internal.prototype._onInputKeyUp = function(e)
{
    var keyCode = e.keyCode;

    if( e.shiftKey    || keyCode == 38  ||
        keyCode == 40 || keyCode == 190 ||
        keyCode == 8  || keyCode == 39  ||
        keyCode == 37)   return;

    this._validate();
    this._format();
};

ControlKit.NumberInput_Internal.prototype._onInputChange = function(e)
{
    this._validate();
    this._format();
    this._onFinish();
};

ControlKit.NumberInput_Internal.prototype._validate = function()
{
    if(this.inputIsNumber())
    {
        var input = this._getInput();
        if(input != '-')this._value = Number(input);
        this._onChange();
        return;
    }

    this._setOutput(this._value);
};

ControlKit.NumberInput_Internal.prototype.inputIsNumber = function()
{
    var value = this._getInput();

    //TODO:FIX
    if(value == '-' || value == '0')return true;
    return /^\s*-?[0-9]\d*(\.\d{1,1000000})?\s*$/.test(value);
};

ControlKit.NumberInput_Internal.prototype._format = function()
{
    var string = this._value.toString(),
        index  = string.indexOf('.');

    if(index>0)string = string.slice(0,index+this._valueDPlace);

    this._setOutput(string);
};

ControlKit.NumberInput_Internal.prototype._setOutput = function(n){this._input.setProperty('value',n);};
ControlKit.NumberInput_Internal.prototype._getInput  = function() {return this._input.getProperty('value')};
ControlKit.NumberInput_Internal.prototype.getValue   = function() {return this._value;};
ControlKit.NumberInput_Internal.prototype.setValue   = function(n){this._value = n;this._format();};
ControlKit.NumberInput_Internal.prototype.getNode    = function() {return this._input;};
ControlKit.Slider_Internal = function(parentNode,onBegin,onChange,onFinish)
{
    this._bounds   = [0,1];
    this._value    = 0;
    this._interpl  = 0;
    this._focus    = false;

    /*---------------------------------------------------------------------------------*/

    this._onBegin    = onBegin  || function(){};
    this._onChange   = onChange || function(){};
    this._onFinish   = onFinish || function(){};

    /*---------------------------------------------------------------------------------*/

    var wrapNode = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.SliderWrap);
    parentNode.addChild(wrapNode);

    var slot   = this._slot   = {node:    new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.SliderSlot),
                                 offsetX: 0,
                                 width:   0,
                                 padding: 3};

    var handle = this._handle = {node    : new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.SliderHandle),
                                 width   : 0,
                                 dragging: false};

    wrapNode.addChild(slot.node);
    slot.node.addChild(handle.node);

    slot.offsetX = slot.node.getPositionGlobalX();
    slot.width   = Math.floor(slot.node.getWidth() - slot.padding * 2) ;

    handle.node.setWidth(handle.width);

    slot.node.addEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onSlotMouseDown.bind(this));
    slot.node.addEventListener(ControlKit.NodeEventType.MOUSE_UP,  this._onSlotMouseUp.bind(this));

    document.addEventListener(ControlKit.DocumentEventType.MOUSE_MOVE,this._onDocumentMouseMove.bind(this));
    document.addEventListener(ControlKit.DocumentEventType.MOUSE_UP,  this._onDocumentMouseUp.bind(this));
};

ControlKit.Slider_Internal.prototype =
{
    _onDocumentMouseMove : function(e)
    {
        if(!this._handle.dragging)return;

        this._update();
        this._onChange();
    },

    _onDocumentMouseUp : function(e)
    {
        if(this._handle.dragging)this._onFinish();
        this._handle.dragging = false;
    },

    _onSlotMouseDown : function()
    {
        this._onBegin();
        this._focus = true;
        this._handle.dragging = true;
        this._handle.node.getElement().focus();
        this._update();
    },

    _onSlotMouseUp : function()
    {
        if(this._focus)
        {
            var handle = this._handle;
            if(handle.dragging)this._onFinish();
            handle.dragging = false;
        }

        this._focus = false;
    },

    _update : function()
    {
        var mx = ControlKit.Mouse.getInstance().getX(),
            sx = this._slot.offsetX,
            sw = this._slot.width,
            px = (mx < sx) ? 0 : (mx > (sx + sw)) ? sw : (mx - sx);

        this._handle.node.setWidth(Math.round(px));
        this._intrpl = px / sw;
        this._interpolateValue();
    },

    _updateHandle : function()
    {
        this._handle.node.setWidth(Math.round(this._intrpl*this._slot.width));
    },

    _interpolateValue : function()
    {
        var intrpl = this._intrpl;
        this._value = this._bounds[0]*(1.0-intrpl)+this._bounds[1]*intrpl;
    },

    resetOffset : function(){var slot = this._slot;
                                 slot.offsetX = slot.node.getPositionGlobalX();
                                 slot.width   = Math.floor(slot.node.getWidth() - slot.padding * 2)},

    setBoundMin : function(value)
    {
        var bounds = this._bounds;
        if(value >= bounds[1])return;

        bounds[0] = value;
        this._interpolateValueRelative();
        this._updateHandle();
    },

    setBoundMax : function(value)
    {
        var bounds = this._bounds;
        if(value <= bounds[0])return;

        bounds[1] = value;
        this._interpolateValueRelative();
        this._updateHandle();
    },

    _interpolateValueRelative : function()
    {
        var boundsMin  = this._bounds[0],
            boundsMax  = this._bounds[1],
            prevIntrpl = Math.abs((this._value - boundsMin) / (boundsMin - boundsMax));

        this._value  = boundsMin*(1.0-prevIntrpl) + boundsMax*prevIntrpl;
        this._intrpl = Math.abs((this._value - boundsMin) / (boundsMin - boundsMax));
    },

    setValue    : function(value)
    {
        var boundsMin = this._bounds[0],
            boundsMax = this._bounds[1];

        if(value < boundsMin || value > boundsMax)return;
        this._intrpl = Math.abs((value-boundsMin) / (boundsMin - boundsMax));
        this._updateHandle();
        this._value  = value;
    },


    getValue : function(){return this._value;}
};
ControlKit.Plotter = function(parent,object,value,params)
{
    ControlKit.SVGComponent.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params            = params            || {};
    params.lineWidth  = params.lineWidth  || 2;
    params.lineColor  = params.lineColor  || [255,255,255];

    /*---------------------------------------------------------------------------------*/

    var lineWidth = this._lineWidth = params.lineWidth;
    var lineColor = params.lineColor;

    /*---------------------------------------------------------------------------------*/

    var grid = this._grid = this._svgRoot.appendChild(this._createSVGObject('path'));
        grid.style.stroke = 'rgb(26,29,31)';


    var path = this._path = this._svgRoot.appendChild(this._createSVGObject('path'));
        path.style.stroke      = 'rgb('+lineColor[0]+','+lineColor[1]+','+lineColor[2]+')';
        path.style.strokeWidth = lineWidth ;
        path.style.fill        = 'none';



};

ControlKit.Plotter.prototype = Object.create(ControlKit.SVGComponent.prototype);


ControlKit.PresetBtn = function(parentNode)
{
    var btnNode  = this._btnNode  = new ControlKit.Node(ControlKit.NodeType.INPUT_BUTTON);
    var indiNode = this._indiNode = new ControlKit.Node(ControlKit.NodeType.DIV);

    this._callbackA = function(){};
    this._callbackI = function(){};
    this._active   = false;

    btnNode.setStyleClass(ControlKit.CSS.PresetBtn);
    btnNode.addEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onMouseDown.bind(this));

    btnNode.addChild(indiNode);
    parentNode.addChild(btnNode);

};

ControlKit.PresetBtn.prototype =
{
    _onMouseDown : function()
    {
        var active = this._active = !this._active;

        if(active)
        {
            this._btnNode.setStyleClass(ControlKit.CSS.PresetBtnActive);
            this._callbackA();
        }
        else
        {
            this._btnNode.setStyleClass(ControlKit.CSS.PresetBtn);
            this._callbackI();
        }
    },

    setCallbackActive   : function(func){this._callbackA = func;},
    setCallbackInactive : function(func){this._callbackI = func;},

    deactivate : function(){this._active = false;this._btnNode.setStyleClass(ControlKit.CSS.PresetBtn);}
};



ControlKit.Output = function(parent,object,value,params)
{
    ControlKit.ObjectComponent.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params            = params        || {};
    params.height     = params.height || null;
    params.wrap       = params.wrap   || false;

    /*---------------------------------------------------------------------------------*/

    this._wrap = params.wrap;

    var textArea = this._textArea = new ControlKit.Node(ControlKit.NodeType.TEXTAREA),
        wrapNode = this._wrapNode,
        rootNode = this._node;

        textArea.setProperty('readOnly',true);
        wrapNode.addChild(textArea);

        textArea.addEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onInputDragStart.bind(this));
        this.addEventListener(ControlKit.EventType.INPUT_SELECT_DRAG,ControlKit.getKitInstance(),'onInputSelectDrag');
    /*---------------------------------------------------------------------------------*/


    //TODO: fix
    if(params.height)
    {
        if(params.height != 'auto')
        {
            var textAreaWrap = new ControlKit.Node(ControlKit.NodeType.DIV);
                textAreaWrap.setStyleClass(ControlKit.CSS.TextAreaWrap);
                wrapNode.addChild(textAreaWrap);
                textAreaWrap.addChild(textArea);

            var height  = this._height = params.height,
                padding = 6;

            textArea.setHeight(Math.max(height  ,ControlKit.Metric.COMPONENT_MIN_HEIGHT));
            wrapNode.setHeight(textArea.getHeight() +6 );
            rootNode.setHeight(wrapNode.getHeight() +4);

            this._scrollbar = new ControlKit.ScrollBar(textAreaWrap,textArea,height);
        }

        //TODO: Add auto height
    }

    if(params.wrap)textArea.setStyleProperty('white-space','pre-wrap');

    /*---------------------------------------------------------------------------------*/

    this._setValue();
};

ControlKit.Output.prototype = Object.create(ControlKit.ObjectComponent.prototype);

/*---------------------------------------------------------------------------------*/

//Override in subclass
ControlKit.Output.prototype._setValue     = function(){};
ControlKit.Output.prototype.onValueUpdate = function(){this._setValue();};
ControlKit.Output.prototype.update        = function(){this._setValue();};

/*---------------------------------------------------------------------------------*/

//Prevent chrome select drag
ControlKit.Output.prototype._onInputDragStart = function()
{
    var eventMove = ControlKit.DocumentEventType.MOUSE_MOVE,
        eventUp   = ControlKit.DocumentEventType.MOUSE_UP;

    var event = ControlKit.EventType.INPUT_SELECT_DRAG;

    var self  = this;

    var onDrag = function()
        {
            self.dispatchEvent(new ControlKit.Event(this,event,null));
        },

        onDragFinish = function()
        {
            self.dispatchEvent(new ControlKit.Event(this,event,null));

            document.removeEventListener(eventMove, onDrag,       false);
            document.removeEventListener(eventMove, onDragFinish, false);
        };

    this.dispatchEvent(new ControlKit.Event(this,event,null));

    document.addEventListener(eventMove, onDrag,       false);
    document.addEventListener(eventUp,   onDragFinish, false);
};

ControlKit.StringInput = function(parent,object,value,params)
{
    ControlKit.ObjectComponent.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params          = params || {};
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || this._onFinish;
    params.presets  = params.presets  || null;

    /*---------------------------------------------------------------------------------*/

    this._onChange   = params.onChange;
    this._onFinish   = params.onFinish;

    this._presetsKey = params.presets;

    /*---------------------------------------------------------------------------------*/

    var input = this._input = new ControlKit.Node(ControlKit.NodeType.INPUT_TEXT);

    var wrapNode = this._wrapNode;

    if(!this._presetsKey)
    {
        wrapNode.addChild(input);
    }
    else
    {
        var inputWrap = new ControlKit.Node(ControlKit.NodeType.DIV);
        inputWrap.setStyleClass(ControlKit.CSS.WrapInputWPreset);

        wrapNode.addChild(inputWrap);
        inputWrap.addChild(input);

        var presets   = this._object[this._presetsKey],
            options   = ControlKit.Options.getInstance(),
            presetBtn = new ControlKit.PresetBtn(this._wrapNode);

        var onPresetDeactivate = function(){options.clear();presetBtn.deactivate();};

        var self = this;
        var onPresetActivate = function()
        {
            options.build(presets,
                          input.getProperty('value'),
                          input,
                          function()
                          {
                              input.setProperty('value',presets[options.getSelectedIndex()]);
                              self.pushHistoryState();
                              self.applyValue();
                          },
                          onPresetDeactivate,
                          ControlKit.Metric.PADDING_PRESET,
                          false);
        };

        presetBtn.setCallbackActive(onPresetActivate);
        presetBtn.setCallbackInactive(onPresetDeactivate)
    }

    input.setProperty('value',this._object[this._key]);

    input.addEventListener(ControlKit.NodeEventType.KEY_UP, this._onInputKeyUp.bind(this));
    input.addEventListener(ControlKit.NodeEventType.CHANGE, this._onInputChange.bind(this));

    input.addEventListener(ControlKit.EventType.MOUSE_DOWN, this._onInputDragStart.bind(this));
    this.addEventListener(ControlKit.EventType.INPUT_SELECT_DRAG,ControlKit.getKitInstance(),'onInputSelectDrag');

    /*---------------------------------------------------------------------------------*/
};

ControlKit.StringInput.prototype = Object.create(ControlKit.ObjectComponent.prototype);

ControlKit.StringInput.prototype._onInputKeyUp  = function(e)
{
    if(this._keyIsChar(e.keyCode))this.pushHistoryState();
    this.applyValue();
    this._onChange();
};

ControlKit.StringInput.prototype._onInputChange = function(e)
{
    if(this._keyIsChar(e.keyCode))this.pushHistoryState();
    this.applyValue();
    this._onFinish();
};

//TODO: Finish check
ControlKit.StringInput.prototype._keyIsChar = function(keyCode)
{
    return keyCode != 17 &&
           keyCode != 18 &&
           keyCode != 20 &&
           keyCode != 37 &&
           keyCode != 38 &&
           keyCode != 39 &&
           keyCode != 40 &&
           keyCode != 16;
};


ControlKit.StringInput.prototype.applyValue = function()
{
    this._object[this._key] = this._input.getProperty('value');
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.VALUE_UPDATED,null));
};

ControlKit.StringInput.prototype.onValueUpdate = function(e)
{
    if(e.data.origin == this)return;
    this._input.setProperty('value',this._object[this._key]);
};

/*---------------------------------------------------------------------------------*/

//Prevent chrome select drag
ControlKit.StringInput.prototype._onInputDragStart = function()
{
    var eventMove = ControlKit.DocumentEventType.MOUSE_MOVE,
        eventUp   = ControlKit.DocumentEventType.MOUSE_UP;

    var event = ControlKit.EventType.INPUT_SELECT_DRAG;

    var self  = this;

    var onDrag = function()
        {
            self.dispatchEvent(new ControlKit.Event(this,event,null));
        },

        onDragFinish = function()
        {
            self.dispatchEvent(new ControlKit.Event(this,event,null));

            document.removeEventListener(eventMove, onDrag,       false);
            document.removeEventListener(eventMove, onDragFinish, false);
        };

    this.dispatchEvent(new ControlKit.Event(this,event,null));

    document.addEventListener(eventMove, onDrag,       false);
    document.addEventListener(eventUp,   onDragFinish, false);
};



ControlKit.NumberInput = function(parent,object,value,params)
{
    ControlKit.ObjectComponent.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params          = params || {};
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || this._onFinish;
    params.dp       = params.dp       || 2;
    params.step     = params.step     || 1;
    params.presets  = params.presets  || null;

    /*---------------------------------------------------------------------------------*/

    this._onChange    = params.onChange;
    this._onFinish    = params.onFinish;

    this._presetsKey  = params.presets;

    /*---------------------------------------------------------------------------------*/

    var input = this._input = new ControlKit.NumberInput_Internal(params.step,
                                                                  params.dp,
                                                                  null,
                                                                  this._onInputChange.bind(this),
                                                                  this._onInputFinish.bind(this));

    var wrapNode = this._wrapNode;

    if(!this._presetsKey)
    {
        wrapNode.addChild(input.getNode());
    }
    else
    {
        var inputWrap = new ControlKit.Node(ControlKit.NodeType.DIV);
            inputWrap.setStyleClass(ControlKit.CSS.WrapInputWPreset);

        wrapNode.addChild(inputWrap);
        inputWrap.addChild(input.getNode());

        var presets = this._object[this._presetsKey];

        var options   = ControlKit.Options.getInstance();
        var presetBtn = this._presetBtn = new ControlKit.PresetBtn(this._wrapNode);

        var onPresetDeactivate = function(){options.clear();presetBtn.deactivate();};

        var self = this;
        var onPresetActivate = function()
        {
            options.build(presets,input.getValue(),input.getNode(),
                          function(){input.setValue(presets[options.getSelectedIndex()]);
                                     self.applyValue();},
                          onPresetDeactivate,ControlKit.Metric.PADDING_PRESET,
                          false);
        };

        presetBtn.setCallbackActive(onPresetActivate);
        presetBtn.setCallbackInactive(onPresetDeactivate)
    }

    input.getNode().addEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onInputDragStart.bind(this));
    this.addEventListener(ControlKit.EventType.INPUT_SELECT_DRAG,ControlKit.getKitInstance(),'onInputSelectDrag');

    input.setValue(this._object[this._key]);
};

ControlKit.NumberInput.prototype = Object.create(ControlKit.ObjectComponent.prototype);

ControlKit.NumberInput.prototype._onInputChange = function(){this.applyValue();this._onChange();};
ControlKit.NumberInput.prototype._onInputFinish = function(){this.applyValue();this._onFinish();};

ControlKit.NumberInput.prototype.applyValue = function()
{
    this.pushHistoryState();
    this._object[this._key] = this._input.getValue();
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.VALUE_UPDATED,null));
};


ControlKit.NumberInput.prototype.onValueUpdate = function(e)
{
    if(e.data.origin == this)return;
    this._input.setValue(this._object[this._key]);
};

//Prevent chrome select drag
ControlKit.NumberInput.prototype._onInputDragStart = function()
{
    var eventMove = ControlKit.DocumentEventType.MOUSE_MOVE,
        eventUp   = ControlKit.DocumentEventType.MOUSE_UP;

    var event = ControlKit.EventType.INPUT_SELECT_DRAG;

    var self  = this;

    var onDrag       = function()
        {
            self.dispatchEvent(new ControlKit.Event(this,event,null));
        },

        onDragFinish = function()
        {
            self.dispatchEvent(new ControlKit.Event(this,event,null));

            document.removeEventListener(eventMove, onDrag,       false);
            document.removeEventListener(eventMove, onDragFinish, false);
        };

    this.dispatchEvent(new ControlKit.Event(this,event,null));

    document.addEventListener(eventMove, onDrag,       false);
    document.addEventListener(eventUp,   onDragFinish, false);
};
ControlKit.Button = function(parent,label,onPress)
{
    ControlKit.Component.apply(this,[parent,label]);

    var input = this._textArea = new ControlKit.Node(ControlKit.NodeType.INPUT_BUTTON);

    onPress = onPress  || function(){};

    input.setStyleClass(ControlKit.CSS.Button);
    input.setProperty('value',label);
    input.addEventListener(ControlKit.NodeEventType.ON_CLICK,
                           function()
                           {
                               onPress();
                               this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.VALUE_UPDATED));
                           }.bind(this));

    this._wrapNode.addChild(input);
};

ControlKit.Button.prototype = Object.create(ControlKit.Component.prototype);

ControlKit.Range = function(parent,object,value,params)
{
    ControlKit.ObjectComponent.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params          = params          || {};
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || this._onFinish;

    params.step     = params.step || 1.0;
    params.dp       = params.dp   || 2;

    /*---------------------------------------------------------------------------------*/

    this._onChange  = params.onChange;
    this._onFinish  = params.onFinish;

    var step = this._step = params.step,
        dp   = this._dp   = params.dp;

    /*---------------------------------------------------------------------------------*/

    //FIXME: history push pop

    var lablMinNode = new ControlKit.Node(ControlKit.NodeType.DIV);
    var inputMin    = this._inputMin = new ControlKit.NumberInput_Internal(step,dp,
                                                                           this.pushHistoryState.bind(this),
                                                                           this._onInputMinChange.bind(this),
                                                                           this._onInputMinFinish.bind(this));

    var lablMaxNode = new ControlKit.Node(ControlKit.NodeType.DIV);
    var inputMax    = this._inputMax = new ControlKit.NumberInput_Internal(step,dp,
                                                                           this.pushHistoryState.bind(this),
                                                                           this._onInputMaxChange.bind(this),
                                                                           this._onInputMaxFinish.bind(this));

    /*---------------------------------------------------------------------------------*/

    var wrapLablMin  = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.Wrap),
        wrapInputMin = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.Wrap),
        wrapLablMax  = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.Wrap),
        wrapInputMax = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.Wrap);


        lablMinNode.setStyleClass(ControlKit.CSS.Label).setProperty('innerHTML','MIN');
        lablMaxNode.setStyleClass(ControlKit.CSS.Label).setProperty('innerHTML','MAX');

    /*---------------------------------------------------------------------------------*/

    var values = this._object[this._key];

    inputMin.setValue(values[0]);
    inputMax.setValue(values[1]);

    /*---------------------------------------------------------------------------------*/

    var wrapNode = this._wrapNode;

    wrapLablMin.addChild(lablMinNode);
    wrapInputMin.addChild(inputMin.getNode());
    wrapLablMax.addChild(lablMaxNode);
    wrapInputMax.addChild(inputMax.getNode());

    wrapNode.addChild(wrapLablMin);
    wrapNode.addChild(wrapInputMin);
    wrapNode.addChild(wrapLablMax);
    wrapNode.addChild(wrapInputMax);
};

ControlKit.Range.prototype = Object.create(ControlKit.ObjectComponent.prototype);

/*---------------------------------------------------------------------------------*/

ControlKit.Range.prototype._onInputChange = function()
{
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.VALUE_UPDATED,null));
    this._onChange();
};

ControlKit.Range.prototype._onInputFinish = function()
{
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.VALUE_UPDATED,null));
    this._onFinish();
};

/*---------------------------------------------------------------------------------*/

ControlKit.Range.prototype._updateValueMin = function()
{
    var values     = this._object[this._key];

    var inputMin   = this._inputMin,
        inputValue = inputMin.getValue();

    if(inputValue >= this._inputMax.getValue()){inputMin.setValue(values[0]);return;}
    values[0] = inputValue;

};

ControlKit.Range.prototype._updateValueMax = function()
{
    var values     = this._object[this._key];

    var inputMax   = this._inputMax,
        inputValue = inputMax.getValue();

    if(inputValue <= this._inputMin.getValue()){inputMax.setValue(values[1]);return;}
    values[1] = inputValue;
};

/*---------------------------------------------------------------------------------*/

ControlKit.Range.prototype.onValueUpdate = function(e)
{
    if(e.data.origin == this)return;

    if(e.data.origin == null)
    {
        //console.log('undo: ' + ControlKit.History.getInstance().getState(this._object,this._key));
    }

    //console.log(ControlKit.History.getInstance().getState(this._object,this._key));

    var values = this._object[this._key];

    this._inputMin.setValue(this._object[this._key][0]);
    this._inputMax.setValue(this._object[this._key][1]);
};


ControlKit.Range.prototype._onInputMinChange = function(){this._updateValueMin();this._onInputChange();};
ControlKit.Range.prototype._onInputMinFinish = function(){this._updateValueMin();this._onInputFinish();};
ControlKit.Range.prototype._onInputMaxChange = function(){this._updateValueMax();this._onInputChange();};
ControlKit.Range.prototype._onInputMaxFinish = function(){this._updateValueMax();this._onInputFinish();};

ControlKit.Checkbox = function(parent,object,value,params)
{
    ControlKit.ObjectComponent.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params = params || {};
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || this._onFinish;

    /*---------------------------------------------------------------------------------*/

    this._onChange = params.onChange;
    this._onFinish = params.onFinish;

    var input = this._textArea = new ControlKit.Node(ControlKit.NodeType.INPUT_CHECKBOX);

    input.setProperty('checked',this._object[this._key]);
    input.addEventListener(ControlKit.NodeEventType.CHANGE,this._onInputChange.bind(this));

    this._wrapNode.addChild(this._textArea);
};

ControlKit.Checkbox.prototype = Object.create(ControlKit.ObjectComponent.prototype);

ControlKit.Checkbox.prototype.applyValue = function()
{
    this.pushHistoryState();

    var obj = this._object,key = this._key;
    obj[key] = !obj[key];

    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.VALUE_UPDATED,null));
};

ControlKit.Checkbox.prototype._onInputChange = function()
{
    this.applyValue();
    this._onChange();
};

ControlKit.Checkbox.prototype.onValueUpdate = function(e)
{
    if(e.data.origin == this)return;
    this._textArea.setProperty('checked',this._object[this._key]);
};
ControlKit.Slider = function(parent,object,value,target,params)
{
    /*---------------------------------------------------------------------------------*/

    params          = params          || {};
    params.label    = params.label    || target;

    /*---------------------------------------------------------------------------------*/

    ControlKit.ObjectComponent.apply(this,[parent,object,value,params]);

    this._values  = this._object[this._key];
    this._targetKey = target;

    /*---------------------------------------------------------------------------------*/

    params.step     = params.step     || 1;
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || this._onFinish;
    params.dp       = params.dp       || 2;

    /*---------------------------------------------------------------------------------*/

    this._step     = params.step;
    this._onChange = params.onChange;
    this._onFinish = params.onFinish;
    this._dp       = params.dp;

    /*---------------------------------------------------------------------------------*/

    var values    = this._values,
        obj       = this._object,
        targetKey = this._targetKey;

    var wrapNode  = this._wrapNode;
        wrapNode.setStyleClass(ControlKit.CSS.WrapSlider);

    var slider = this._slider = new ControlKit.Slider_Internal(wrapNode,
                                                               this._onSliderBegin.bind(this),
                                                               this._onSliderMove.bind(this),
                                                               this._onSliderEnd.bind(this));

    slider.setBoundMin(values[0]);
    slider.setBoundMax(values[1]);
    slider.setValue(obj[targetKey]);

    /*---------------------------------------------------------------------------------*/

    var input  = this._input = new ControlKit.NumberInput_Internal(this._step,
                                                                   this._dp,
                                                                   null,
                                                                   this._onInputChange.bind(this),
                                                                   this._onInputChange.bind(this));

    input.setValue(obj[targetKey]);

    wrapNode.addChild(input.getNode());

    /*---------------------------------------------------------------------------------*/

    this._parent.addEventListener(ControlKit.EventType.PANEL_MOVE_END,    this, 'onPanelMoveEnd');
    this._parent.addEventListener(ControlKit.EventType.GROUP_SIZE_CHANGE, this, 'onGroupWidthChange');
};

ControlKit.Slider.prototype = Object.create(ControlKit.ObjectComponent.prototype);

/*---------------------------------------------------------------------------------*/


ControlKit.Slider.prototype.pushHistoryState = function()
{
    var obj = this._object,
        key = this._targetKey;
    ControlKit.History.getInstance().pushState(obj,key,obj[key]);
};

/*---------------------------------------------------------------------------------*/


ControlKit.Slider.prototype._onSliderBegin  = function(){this.pushHistoryState();};

ControlKit.Slider.prototype._onSliderMove = function()
{
    this.applyValue();
    this._updateValueField();
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.VALUE_UPDATED,null));
    this._onChange();
};

ControlKit.Slider.prototype._onSliderEnd = function()
{
    this.applyValue();
    this._updateValueField();
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.VALUE_UPDATED,null));
    this._onFinish();
};

ControlKit.Slider.prototype._onInputChange = function()
{
    var input = this._input,
        valueMin = this._values[0],
        valueMax = this._values[1];

    if(input.getValue() >= valueMax)input.setValue(valueMax);
    if(input.getValue() <= valueMin)input.setValue(valueMin);

    var value = input.getValue();

    this._slider.setValue(value);
    this._object[this._targetKey] = value;
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.VALUE_UPDATED,null));
    this._onFinish();
};

ControlKit.Slider.prototype.applyValue = function()
{
    var value = this._slider.getValue();
    this._object[this._targetKey] = value;
    this._input.setValue(value);
};

//TODO:FIX ME
ControlKit.Slider.prototype.onValueUpdate = function(e)
{
    var origin = e.data.origin;

    if(origin == this)return;

    var slider = this._slider;

    if(!(origin instanceof ControlKit.Slider))
    {
        var values = this._values;

        //TODO: FIX ME!
        if(origin instanceof ControlKit.Range)
        {
            slider.setBoundMin(values[0]);
            slider.setBoundMax(values[1]);


            //slider.setValue(this._object[this._targetKey]);
            //this._slider.updateInterpolatedValue();
            this.applyValue();
        }
        else
        {
            slider.setBoundMin(values[0]);
            slider.setBoundMax(values[1]);
            slider.setValue(this._object[this._targetKey]);
            this.applyValue();
        }
    }
    else
    {
        slider.setValue(this._object[this._targetKey]);
        this.applyValue();
    }
};


ControlKit.Slider.prototype._updateValueField  = function(){this._input.setValue(this._slider.getValue());};

ControlKit.Slider.prototype.onPanelMoveEnd     =
ControlKit.Slider.prototype.onGroupWidthChange = function(){this._slider.resetOffset();};

ControlKit.Select = function(parent,object,value,target,params)
{
    ControlKit.ObjectComponent.apply(this,[parent,object,value,params]);

    /*---------------------------------------------------------------------------------*/

    params = params || {};
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || this._onFinish;

    /*---------------------------------------------------------------------------------*/

    this._onChange    = params.onChange;
    this._onFinish    = params.onFinish;

    var obj    = this._object,
        key    = this._key;

    var targetKey = this._targetKey = target,
        values    = this._values = obj[key],
        targetObj = obj[targetKey] || '';

    var wrapNode = this._wrapNode;

    /*---------------------------------------------------------------------------------*/

    this._selected  = null;

    var select  = this._select = new ControlKit.Node(ControlKit.NodeType.INPUT_BUTTON);
    select.setStyleClass(ControlKit.CSS.Select);
    select.addEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onSelectTrigger.bind(this));

    i = -1;
    while(++i < values.length){if(targetObj == values[i])this._selected = values[i];}
    select.setProperty('value',targetObj.toString().length > 0 ? targetObj : values[0]);

    wrapNode.addChild(select);

    /*---------------------------------------------------------------------------------*/

    var kit = ControlKit.getKitInstance();
    kit.addEventListener(ControlKit.EventType.TRIGGER_SELECT,   this,'onSelectTrigger');
    this.addEventListener(ControlKit.EventType.SELECT_TRIGGERED,kit, 'onSelectTriggered');

};

ControlKit.Select.prototype = Object.create(ControlKit.ObjectComponent.prototype);



ControlKit.Select.prototype.onSelectTrigger = function (e)
{
    if (e.data.origin == this) {

        this._active = !this._active;
        this._updateAppearance();

        if (this._active){this._buildOptions();}
        else{ControlKit.Options.getInstance().clear();}

        return;
    }

    this._active = false;
    this._updateAppearance();
};

ControlKit.Select.prototype._buildOptions = function()
{
    var options = ControlKit.Options.getInstance();

    var onSelect    = function()
                      {
                          this.applyValue();
                          this._active = false;
                          this._updateAppearance();
                          options.clear();

                      }.bind(this);

    var onSelectOut = function()
                      {
                          this._active = false;
                          this._updateAppearance();
                          options.clear();

                      }.bind(this);


    options.build(this._values,this._selected,this._select,onSelect,onSelectOut,false);

};


ControlKit.Select.prototype.applyValue = function()
{
    this.pushHistoryState();

    var selectedIndex = ControlKit.Options.getInstance().getSelectedIndex(),
        selected = this._selected = this._object[this._targetKey] = this._values[selectedIndex];

    this._select.setProperty('value',selected);

    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.VALUE_UPDATED,null));
};

ControlKit.Select.prototype.pushHistoryState = function(){var obj = this._object,key = this._targetKey;ControlKit.History.getInstance().pushState(obj,key,obj[key]);};

ControlKit.Select.prototype._onSelectTrigger = function()
{
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.SELECT_TRIGGERED,null));
};

ControlKit.Select.prototype._updateAppearance = function()
{
    this._select.setStyleClass(this._active ? ControlKit.CSS.SelectActive : ControlKit.CSS.Select);
};

ControlKit.Select.prototype.onValueUpdate = function(e)
{
    this._selected = this._object[this._targetKey];
    this._select.setProperty('value',this._selected.toString());
};
ControlKit.Color = function(parent,object,value,params)
{
    ControlKit.ObjectComponent.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params          = params || {};
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || this._onFinish;
    params.presets  = params.presets  || null;

    /*---------------------------------------------------------------------------------*/

    this._onChange = this._onFinish = params._onChange;

    this._presetsKey = params.presets;

    /*---------------------------------------------------------------------------------*/

    var wrapNode = this._wrapNode;

    var color = this._color = new ControlKit.Node(ControlKit.NodeType.DIV);


    this._value     = this._object[this._key];

    if(!this._presetsKey)
    {
        color.setStyleClass(ControlKit.CSS.Color);
        wrapNode.addChild(color);
    }
    else
    {
        color.setStyleClass(ControlKit.CSS.Color);

        var colorWrap = new ControlKit.Node(ControlKit.NodeType.DIV);
            colorWrap.setStyleClass(ControlKit.CSS.WrapColorWPreset);

            wrapNode.addChild(colorWrap);
            colorWrap.addChild(color);

        var presets   = this._object[this._presetsKey],
            options   = ControlKit.Options.getInstance(),
            presetBtn = new ControlKit.PresetBtn(wrapNode);

        var onPresetDeactivate = function(){options.clear();presetBtn.deactivate();};

        var self = this;
        var onPresetActivate    = function()
                                  {
                                      options.build(presets,
                                      self._value,
                                      color,
                                      function()
                                      {
                                          self.pushHistoryState();
                                          self._value = presets[options.getSelectedIndex()];
                                          self.applyValue();
                                      },
                                      onPresetDeactivate,
                                      ControlKit.Metric.PADDING_PRESET,
                                      true);
                                  };

            presetBtn.setCallbackActive(onPresetActivate);
            presetBtn.setCallbackInactive(onPresetDeactivate);
    }

    color.addEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onColorTrigger.bind(this));

    /*---------------------------------------------------------------------------------*/

    this._updateColor();

};

ControlKit.Color.prototype = Object.create(ControlKit.ObjectComponent.prototype);

/*---------------------------------------------------------------------------------*/

ControlKit.Color.prototype._onColorTrigger = function()
{
    var onPickerPick = function()
                       {
                           this.pushHistoryState();
                           this._value = ControlKit.Picker.getInstance().getHEX();
                           this.applyValue();

                       }.bind(this);

    var picker = ControlKit.Picker.getInstance();
        picker.setColorHEX(this._value);
        picker.setCallbackPick(onPickerPick);
        picker.open();

};

/*---------------------------------------------------------------------------------*/

ControlKit.Color.prototype.applyValue = function()
{
    this._object[this._key] = this._value;
    this._updateColor();
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.VALUE_UPDATED,null));

};

ControlKit.Color.prototype.onValueUpdate = function(e)
{
    if(e.data.origin == this)return;
    this._value = this._object[this._key];
    this._updateColor();
};

/*---------------------------------------------------------------------------------*/


ControlKit.Color.prototype._updateColor = function()
{
    var colorHEX  = this._value;

    var colorNode = this._color;
    colorNode.setProperty('innerHTML',colorHEX);
    colorNode.getStyle().backgroundColor = colorHEX;
    //colorNode.getStyle().boxShadow       = '0 1px 0 0 rgba(0,0,0,0.25) inset';
};
ControlKit.FunctionPlotter = function(parent,object,value,params)
{
    ControlKit.Plotter.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params = params || {};

    /*---------------------------------------------------------------------------------*/

    var svgRoot = this._svgRoot,
        path    = this._path;

    var axes = this._axes = svgRoot.insertBefore(this._createSVGObject('path'),path);
        axes.style.stroke = 'rgb(54,60,64)';
        axes.style.lineWidth = 1;

    var axesLabels = this._axesLabels = svgRoot.insertBefore(this._createSVGObject('path'),path);
        axesLabels.style.stroke = 'rgb(43,48,51)';
        axesLabels.style.lineWidth = 1;

    this._grid.style.stroke = 'rgb(25,25,25)';

    var svg    = this._svg,
        width  = Number(svg.getAttribute('width')),
        height = Number(svg.getAttribute('height'));

    var sliderXWrap = new ControlKit.Node(ControlKit.NodeType.DIV);
        sliderXWrap.setStyleClass(ControlKit.CSS.GraphSliderXWrap);

    var sliderYWrap = new ControlKit.Node(ControlKit.NodeType.DIV);
        sliderYWrap.setStyleClass(ControlKit.CSS.GraphSliderYWrap);

    var sliderXTrack = this._sliderXTrack = new ControlKit.Node(ControlKit.NodeType.DIV);
        sliderXTrack.setStyleClass(ControlKit.CSS.GraphSliderX);

    var sliderYTrack = this._sliderYTrack = new ControlKit.Node(ControlKit.NodeType.DIV);
        sliderYTrack.setStyleClass(ControlKit.CSS.GraphSliderY);

    var sliderXHandle = this._sliderXHandle  = new ControlKit.Node(ControlKit.NodeType.DIV);
        sliderXHandle.setStyleClass(ControlKit.CSS.GraphSliderXHandle);

    var sliderYHandle = this._sliderYHandle = new ControlKit.Node(ControlKit.NodeType.DIV);
        sliderYHandle.setStyleClass(ControlKit.CSS.GraphSliderYHandle);

        sliderXTrack.addChild(sliderXHandle);
        sliderYTrack.addChild(sliderYHandle);
        sliderXWrap.addChild(sliderXTrack);
        sliderYWrap.addChild(sliderYTrack);

    var wrapNode = this._wrapNode;
        wrapNode.addChild(sliderXWrap);
        wrapNode.addChild(sliderYWrap);

        sliderXHandle.addEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onSliderXHandleDown.bind(this));
        sliderYHandle.addEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onSliderYHandleDown.bind(this));

    /*---------------------------------------------------------------------------------*/

    this._units       = [ControlKit.Preset.FUNCTION_PLOTTER_UNIT_X,
                         ControlKit.Preset.FUNCTION_PLOTTER_UNIT_Y];
    this._unitsMinMax = [ControlKit.Preset.FUNCTION_PLOTTER_UNIT_MIN,
                         ControlKit.Preset.FUNCTION_PLOTTER_UNIT_MAX]; //1/8->4

    this._scale       =  ControlKit.Preset.FUNCTION_PLOTTER_SCALE;
    this._scaleMinMax = [ControlKit.Preset.FUNCTION_PLOTTER_SCALE_MIN,
                         ControlKit.Preset.FUNCTION_PLOTTER_SCALE_MAX]; //1/50 -> 25

    /*---------------------------------------------------------------------------------*/

    this._center = [Math.round(width * 0.5),
                    Math.round(width * 0.5)];
    this._svgPos = [0,0];

    this._func = null;
    this.setFunction(this._object[this._key]);

    this._setSliderInitial();

    /*---------------------------------------------------------------------------------*/

    svg.addEventListener(ControlKit.DocumentEventType.MOUSE_DOWN,this._onDragStart.bind(this),false);
    this._wrapNode.getElement().addEventListener("mousewheel",   this._onScale.bind(this, false));

    ControlKit.getKitInstance().addEventListener(ControlKit.EventType.UPDATE_VALUE,this,'onValueUpdate');
};

ControlKit.FunctionPlotter.prototype = Object.create(ControlKit.Plotter.prototype);

/*---------------------------------------------------------------------------------*/

ControlKit.FunctionPlotter.prototype._updateCenter = function()
{
    var svg    = this._svg,
        width  = Number(svg.getAttribute('width')),
        height = Number(svg.getAttribute('height'));

    var mousePos = ControlKit.Mouse.getInstance().getPosition(),
        svgPos   = this._svgPos,
        center   = this._center;

    center[0] = Math.max(0,Math.min(mousePos[0]-svgPos[0],width));
    center[1] = Math.max(0,Math.min(mousePos[1]-svgPos[1],height));

    this._plotGraph();
};

ControlKit.FunctionPlotter.prototype._onDragStart = function(e)
{
    var svg = this._svg;

    var element = svg;

    var svgPos = this._svgPos;
    svgPos[0] = 0;
    svgPos[1] = 0;

    while(element)
    {
        svgPos[0] += element.offsetLeft;
        svgPos[1] += element.offsetTop;
        element    = element.offsetParent;
    }

    var eventMove = ControlKit.DocumentEventType.MOUSE_MOVE,
        eventUp   = ControlKit.DocumentEventType.MOUSE_UP;

    var onDrag    = this._updateCenter.bind(this),
        onDragEnd = function()
        {
            this._updateCenter.bind(this);
            document.removeEventListener(eventMove,onDrag,   false);
            document.removeEventListener(eventUp,  onDragEnd,false);
        }.bind(this);

    document.addEventListener(eventMove, onDrag,    false);
    document.addEventListener(eventUp,   onDragEnd, false);

    this._updateCenter();
};

ControlKit.FunctionPlotter.prototype._onScale = function(e)
{
    e = window.event || e;
    this._scale += Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail))) * -1;

    var scaleMinMax = this._scaleMinMax;
    this._scale = Math.max(scaleMinMax[0],Math.min(this._scale,scaleMinMax[1]));

    this._plotGraph();
};

/*---------------------------------------------------------------------------------*/

ControlKit.FunctionPlotter.prototype.onValueUpdate = function(){this.setFunction(this._object[this._key]);};
ControlKit.FunctionPlotter.prototype._redraw       = function(){this.setFunction(this._object[this._key]);};

ControlKit.FunctionPlotter.prototype.setFunction = function(func)
{
    this._func = func;
    this._plotGraph();
};

ControlKit.FunctionPlotter.prototype._plotGraph = function()
{
    this._drawGrid();
    this._drawAxes();
    this._drawPlot();
};

ControlKit.FunctionPlotter.prototype._drawAxes = function()
{
    var svg           = this._svg,
        svgWidth      = Number(svg.getAttribute('width')),
        svgHeight     = Number(svg.getAttribute('height'));

    var center  = this._center,
        centerX = center[0],
        centerY = center[1];

    var pathCmd = '';
        pathCmd += this._pathCmdLine(0,centerY,svgWidth,centerY);
        pathCmd += this._pathCmdLine(centerX,0,centerX,svgHeight);

    this._axes.setAttribute('d',pathCmd);
};

ControlKit.FunctionPlotter.prototype._drawPlot = function()
{
    var svg    = this._svg,
        width  = Number(svg.getAttribute('width')),
        height = Number(svg.getAttribute('height'));

    var center  = this._center,
        centerX = center[0],
        centerY = center[1];

    var scale = this._scale,
        units = this._units,
        unitX = units[0]  * scale,
        unitY = height / (units[1] * scale);

    var len    = Math.floor(width),
        points = new Array(len * 2);

    var i = -1;

    var normval, value, index;
    var offsetX = centerX / width;

    while(++i < len)
    {
        normval = (-offsetX + i / len) * unitX;
        value   = centerY - this._func(normval) * unitY;
        index   = i * 2;

        points[index]     = i;
        points[index + 1] = value;
    }

    var pathCmd = '';
        pathCmd += this._pathCmdMoveTo(points[0],points[1]);

    i = 2;
    while(i < points.length)
    {
        pathCmd += this._pathCmdLineTo(points[i],points[i+1]);
        i+=2;
    }

    this._path.setAttribute('d',pathCmd);
};

ControlKit.Plotter.prototype._drawGrid = function()
{
    var svg    = this._svg,
        width  = Number(svg.getAttribute('width')),
        height = Number(svg.getAttribute('height'));

    var scale = this._scale;

    var gridRes      = this._units,
        gridSpacingX = width  / (gridRes[0] * scale),
        gridSpacingY = height / (gridRes[1] * scale);

    var center  = this._center,
        centerX = center[0],
        centerY = center[1];

    var gridNumTop    = Math.round(centerY / gridSpacingY) + 1,
        gridNumBottom = Math.round((height - centerY) / gridSpacingY) + 1,
        gridNumLeft   = Math.round(centerX / gridSpacingX) + 1,
        gridNumRight  = Math.round((width - centerX) / gridSpacingX) + 1;

    var pathCmdGrid       = '',
        pathCmdAxesLabels = '';

    var i,temp;

    var strokeSize = ControlKit.Metric.STROKE_SIZE;

    var labelTickSize                = ControlKit.Metric.FUNCTION_PLOTTER_LABEL_TICK_SIZE,
        labelTickPaddingRight        = width  - labelTickSize - strokeSize,
        labelTickPaddingBottom       = height - labelTickSize - strokeSize,
        labelTickPaddingRightOffset  = labelTickPaddingRight  - labelTickSize,
        labelTickPaddingBottomOffset = labelTickPaddingBottom - labelTickSize,
        labelTickOffsetRight         = labelTickPaddingRight  - (labelTickSize + strokeSize) * 2,
        labelTickOffsetBottom        = labelTickPaddingBottom - (labelTickSize + strokeSize) * 2;

    i = -1;
    while(++i < gridNumTop)
    {
        temp = Math.round(centerY - gridSpacingY * i);
        pathCmdGrid += this._pathCmdLine(0,temp,width,temp);

        if(temp > labelTickSize)
        pathCmdAxesLabels += this._pathCmdLine(labelTickPaddingRight,      temp,
                                               labelTickPaddingRightOffset,temp);
    }

    i = -1;
    while(++i < gridNumBottom)
    {
        temp = Math.round(centerY + gridSpacingY * i);
        pathCmdGrid += this._pathCmdLine(0,temp,width,temp);

        if(temp < labelTickOffsetBottom)
        pathCmdAxesLabels += this._pathCmdLine(labelTickPaddingRight,      temp,
                                               labelTickPaddingRightOffset,temp);
    }

    i = -1;
    while(++i < gridNumLeft)
    {
        temp = Math.round(centerX - gridSpacingX * i);
        pathCmdGrid += this._pathCmdLine(temp,0,temp,height);

        if(temp > labelTickSize)
        pathCmdAxesLabels += this._pathCmdLine(temp, labelTickPaddingBottom,
                                               temp, labelTickPaddingBottomOffset);
    }

    i = -1;
    while(++i < gridNumRight)
    {
        temp = Math.round(centerX + gridSpacingX * i);
        pathCmdGrid += this._pathCmdLine(temp,0,temp,height);

        if(temp < labelTickOffsetRight)
        pathCmdAxesLabels += this._pathCmdLine(temp, labelTickPaddingBottom,
                                               temp, labelTickPaddingBottomOffset);
    }


    this._grid.setAttribute('d',pathCmdGrid);
    this._axesLabels.setAttribute('d',pathCmdAxesLabels);
};

/*---------------------------------------------------------------------------------*/

ControlKit.FunctionPlotter.prototype._sliderXStep = function(mousePos)
{
    var mouseX = mousePos[0];

    var handle          = this._sliderXHandle,
        handleWidth     = handle.getWidth(),
        handleWidthHalf = handleWidth * 0.5;

    var track       = this._sliderXTrack,
        trackWidth  = track.getWidth(),
        trackLeft   = track.getPositionGlobalX();

    var strokeSize = ControlKit.Metric.STROKE_SIZE;

    var max = trackWidth - handleWidthHalf - strokeSize * 2;

    var pos       = Math.max(handleWidthHalf,Math.min(mouseX - trackLeft,max)),
        handlePos = pos - handleWidthHalf;

    handle.setPositionX(handlePos);

    var unitsMin = this._unitsMinMax[0],
        unitsMax = this._unitsMinMax[1];

    var normVal   = (pos - handleWidthHalf) / (max - handleWidthHalf),
        mappedVal = unitsMin + (unitsMax  - unitsMin) * normVal;

    this._units[0] = mappedVal;

    this._plotGraph();
};

ControlKit.FunctionPlotter.prototype._setSliderInitial = function()
{
    var unitMin = this._unitsMinMax[0],
        unitMax = this._unitsMinMax[1];

    var unitX = this._units[0],
        unitY = this._units[1];

    var handleX           = this._sliderXHandle,
        handleXWidth      = handleX.getWidth(),
        handleXWidthHalf  = handleXWidth * 0.5,
        trackXWidth       = this._sliderXTrack.getWidth();

    var handleY           = this._sliderYHandle,
        handleYHeight     = handleY.getHeight(),
        handleYHeightHalf = handleYHeight * 0.5,
        trackYHeight      = this._sliderYTrack.getHeight();

    var strokeSize = ControlKit.Preset.STROKE_SIZE;

    var handleXMin = handleXWidthHalf,
        handleXMax = trackXWidth  - handleXWidthHalf  - strokeSize * 2,
        handleYMin = trackYHeight - handleYHeightHalf - strokeSize * 2,
        handleYMax = handleYHeightHalf;

    handleX.setPositionX((handleXMin + (handleXMax - handleXMin) * ((unitX - unitMin) / (unitMax - unitMin))) - handleXWidthHalf);
    handleY.setPositionY((handleYMin + (handleYMax - handleYMin) * ((unitY - unitMin) / (unitMax - unitMin))) - handleYHeightHalf);

};

ControlKit.FunctionPlotter.prototype._sliderYStep = function(mousePos)
{
    var mouseY = mousePos[1];

    var handle = this._sliderYHandle,
        handleHeight = handle.getHeight(),
        handleHeightHalf = handleHeight * 0.5;

    var track = this._sliderYTrack,
        trackHeight = track.getHeight(),
        trackTop    = track.getPositionGlobalY();

    var max = trackHeight -  handleHeightHalf - 2;

    var pos       = Math.max(handleHeightHalf,Math.min(mouseY - trackTop,max)),
        handlePos = pos - handleHeightHalf;

    handle.setPositionY(handlePos);

    var unitsMax = this._unitsMinMax[0],
        unitsMin = this._unitsMinMax[1];

    var normVal = (pos - handleHeightHalf) / (max - handleHeightHalf),
        mappedVal = unitsMin + (unitsMax - unitsMin) * normVal;

    this._units[1] = mappedVal;

    this._plotGraph();
};

ControlKit.FunctionPlotter.prototype._onSliderXHandleDown = function()
{
    this._onSliderHandleDown(this._sliderXStep.bind(this));
};

ControlKit.FunctionPlotter.prototype._onSliderYHandleDown = function()
{
    this._onSliderHandleDown(this._sliderYStep.bind(this));
};

ControlKit.FunctionPlotter.prototype._onSliderHandleDown = function(sliderStepFunc)
{
    var eventMouseMove = ControlKit.DocumentEventType.MOUSE_MOVE,
        eventMouseUp   = ControlKit.DocumentEventType.MOUSE_UP;

    var mouse = ControlKit.Mouse.getInstance();

    var onDrag    = function(){sliderStepFunc(mouse.getPosition())},
        onDragEnd = function()
        {
            document.removeEventListener(eventMouseMove,onDrag,    false);
            document.removeEventListener(eventMouseUp,  onDragEnd, false);
        };

    sliderStepFunc(mouse.getPosition());
    document.addEventListener(eventMouseMove, onDrag,    false);
    document.addEventListener(eventMouseUp,   onDragEnd, false);
};

ControlKit.Pad = function(parent,object,value,params)
{
    ControlKit.Plotter.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params            = params            || {};
    params.onChange   = params.onChange   || null;
    params.onFinish   = params.onFinish   || null;
    params.bounds     = params.bounds     || [-1,1,-1,1];
    params.axisLabels = params.axisLabels || [null,null];
    params.showCross  = params.showCross  || true;

    /*---------------------------------------------------------------------------------*/

    this._onChange     = params.onChange || this._onChange;
    this._onFinish     = params.onFinish || this._onFinish;

    this._bounds       = params.bounds;
    this._axisLabels   = params.axisLabels;
    this._showCross    = params.showCross;

    this._dragging     = false;

    /*---------------------------------------------------------------------------------*/

    /*
    var canvas = this._canvas;
        canvas.setFontFamily('Arial');
        canvas.setFontSize(10);

        */

    /*---------------------------------------------------------------------------------*/

    /*
    canvas = this._canvas.getElement();

    canvas.onmousedown = function()
    {
        this._dragging = true;
        this.pushHistoryState();
        this._drawValue(this._getMouseNormalized());
        this.applyValue()

    }.bind(this);

    canvas.onmouseup   = function()
    {
        this._dragging = false;

    }.bind(this);

    var doconmousemove = document.onmousemove || function(){},
        doconmouseup   = document.onmouseup   || function(){};

    document.onmousemove = function(e)
    {
        doconmousemove(e);
        if(this._dragging)
        {
            this._drawValue(this._getMouseNormalized());
            this.applyValue();
            this._onChange();
        }
    }.bind(this);

    document.onmouseup = function(e)
    {
        doconmouseup(e);
        if(this._dragging)
        {
            this.pushHistoryState();
            this._dragging = false;
            this.applyValue();
            this._onFinish();
        }

    }.bind(this);

    */

    /*---------------------------------------------------------------------------------*/

    this._drawValue(this._object[this._key]);
};

ControlKit.Pad.prototype = Object.create(ControlKit.Plotter.prototype);

/*---------------------------------------------------------------------------------*/

ControlKit.Pad.prototype._redraw = function(){this._drawValue(this._object[this._key]);};

ControlKit.Pad.prototype._drawValue = function(value)
{
    this._object[this._key] = value;

    /*
    var canvas = this._canvas;

    canvas.clear();
    canvas.background(0,0);
    canvas.push();
    canvas.translateHalfFloat();
    this._drawGrid();
    this._drawPoint();
    canvas.pop();
    */
};


ControlKit.Pad.prototype._drawPoint = function()
{
    /*

    var canvas       = this._canvas,
        canvasWidth  = canvas.width  - 1,
        canvasHeight = canvas.height - 1,
        canvasMidX   = canvas.width  * 0.5,
        canvasMidY   = canvas.height * 0.5;

    var axisLabels   = this._axisLabels;

    var value = this._object[this._key];

    var localX = ( 0.5 +  value[0] * 0.5 ) * canvasWidth,
        localY = ( 0.5 + -value[1] * 0.5 ) * canvasHeight;

    canvas.stroke(39,44,46);
    canvas.line(0,canvasMidY,canvasWidth,canvasMidY);
    canvas.line(canvasMidX,0,canvasMidX,canvasHeight);
    canvas.line(0,canvasMidY,canvasWidth,canvasMidY);
    canvas.line(canvasMidX,0,canvasMidX,canvasHeight);
    canvas.noStroke();

    if(!(!axisLabels[0] && !axisLabels[1]))
    {
        canvas.fill(64,72,77);

        if(axisLabels[0])
        {
            var stringX = axisLabels[0].toUpperCase();
            canvas.text(stringX,Math.floor(canvasMidX*0.5-canvas.getTextWidth(stringX)*0.5),
                                Math.floor(canvasMidY)+12);
        }

        if(axisLabels[1])
        {
            var stringY = axisLabels[1].toUpperCase();
            canvas.push();
            {
                canvas.translate(Math.floor(canvasMidX)+5,
                                 Math.floor(canvasMidY*0.5-canvas.getTextWidth(stringY)*0.5));
                canvas.rotate(Math.PI*0.5);
                canvas.text(stringY,0,0);
            }
            canvas.pop();
        }

        canvas.noFill();
    }

    if(this._showCross)
    {
        canvas.stroke(75,84,89);
        canvas.line(0,localY,canvasWidth,localY);
        canvas.line(localX,0,localX,canvasHeight);
    }

    canvas.noStroke();
    canvas.fill(0,0.05);
    canvas.circle(localX,localY,11);

    canvas.fill(83,93,98);
    canvas.circle(localX,localY,10);

    canvas.fill(57,69,76);
    canvas.circle(localX,localY+1,9);

    canvas.stroke(17,19,20);
    canvas.noFill();
    canvas.circle(localX,localY,10);

    canvas.fill(30,34,36);
    canvas.circle(localX,localY,6);

    canvas.fill(255);
    canvas.circle(localX,localY,3);

    */



};

ControlKit.Pad.prototype._getMouseNormalized = function()
{
    /*

    var offset       = this._canvas.getNode().getPositionGlobal(),
        mouse        = ControlKit.Mouse.getInstance().getPosition();

    var canvas       = this._canvas,
        canvasWidth  = canvas.width  - 1,
        canvasHeight = canvas.height - 1;

    return [ -1 + Math.max(0,Math.min(mouse[0]-offset[0],canvasWidth )) / canvasWidth  * 2,
            ( 1 - Math.max(0,Math.min(mouse[1]-offset[1],canvasHeight)) / canvasHeight * 2)];
            */
};

ControlKit.Pad.prototype.applyValue = function()
{
   this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.VALUE_UPDATED,null));
};

ControlKit.Pad.prototype.onValueUpdate = function(e)
{
    if(e.data.origin == this)return;
    this._drawValue(this._object[this._key]);
};

/*
    TODO: FIX draw error, last point glitch
 */

ControlKit.ValuePlotter = function(parent,object,value,params)
{
    ControlKit.Plotter.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    var svg       = this._svg,
        svgWidth  = Number(svg.getAttribute('width')),
        svgHeight = Number(svg.getAttribute('height'));

    params            = params            || {};
    params.height     = params.height     || svgHeight;
    params.resolution = params.resolution || 1;

    /*---------------------------------------------------------------------------------*/

    var resolution = params.resolution,
        length     = Math.floor(svgWidth / resolution);

    var points     = this._points  = new Array(length * 2),
        buffer0    = this._buffer0 = new Array(length),
        buffer1    = this._buffer1 = new Array(length);

    var min = this._lineWidth * 0.5;

    var i = -1; while(++i < length){buffer0[i] =  buffer1[i] = points[i*2] = points[i*2+1] = min;}

    this._height = params.height = params.height  < ControlKit.Metric.COMPONENT_MIN_HEIGHT ?
                   ControlKit.Metric.COMPONENT_MIN_HEIGHT : params.height;

    /*---------------------------------------------------------------------------------*/

    this._svgSetSize(svgHeight,Math.floor(params.height));
    this._grid.style.stroke = 'rgb(39,44,46)';

    /*---------------------------------------------------------------------------------*/

    this._updateHeight();
    this._drawValue();
};

ControlKit.ValuePlotter.prototype = Object.create(ControlKit.Plotter.prototype);

ControlKit.ValuePlotter.prototype._redraw = function()
{
    var points    = this._points,
        bufferLen = this._buffer0.length;

    var width = Number(this._svg.getAttribute('width')),
        ratio = width / (bufferLen-1);

    var i = -1;while(++i < bufferLen){points[i*2] = width - i * ratio;}

    this._drawValue();
};

ControlKit.ValuePlotter.prototype.onGroupSizeChange = function()
{
    var width  = this._wrapNode.getWidth(),
        height = this._height;

    this._svgSetSize(width,height);
    this._updateHeight();
    this._drawGrid();
    this._redraw();
};

ControlKit.ValuePlotter.prototype._drawValue = function()
{
    this._drawCurve();
};

ControlKit.ValuePlotter.prototype._drawGrid = function()
{
    var svg = this._svg;

    var svgWidth      = Number(svg.getAttribute('width')),
        svgHeightHalf = Math.floor(Number(svg.getAttribute('height')) * 0.5);

    var pathCmd = '';
        pathCmd += this._pathCmdMoveTo(0,svgHeightHalf);
        pathCmd += this._pathCmdLineTo(svgWidth,svgHeightHalf);

    this._grid.setAttribute('d',pathCmd);
};

//TODO: merge update + pathcmd
ControlKit.ValuePlotter.prototype._drawCurve = function()
{
    var svg = this._svg;

    var value = this._object[this._key];

    var buffer0 = this._buffer0,
        buffer1 = this._buffer1,
        points  = this._points;

    var bufferLength = buffer0.length;

    var pathCmd = '';

    var heightHalf = Number(svg.getAttribute('height')) * 0.5,
        unit       = heightHalf - this._lineWidth * 0.5;

        points[1] = buffer0[0];
        buffer0[bufferLength - 1] =  (value * unit) * -1 + Math.floor(heightHalf);

    pathCmd += this._pathCmdMoveTo(points[0],points[1]);

    var i = 0,index;

    while(++i < bufferLength)
    {
        index = i * 2;

        buffer1[i-1]    = buffer0[i];
        points[index+1] = buffer0[i-1] = buffer1[i-1];

        pathCmd += this._pathCmdLineTo(points[index],points[index+1]);
    }

    this._path.setAttribute('d',pathCmd);
};

ControlKit.ValuePlotter.prototype.update = function()
{
    if(this._parent.isDisabled())return;
    this._drawValue();
};



ControlKit.StringOutput = function(parent,object,value,params)
{
    ControlKit.Output.apply(this,arguments);
};

ControlKit.StringOutput.prototype = Object.create(ControlKit.Output.prototype);

ControlKit.StringOutput.prototype._setValue = function()
{
    if(this._parent.isDisabled())return;

    var textArea = this._textArea;

    //TODO: Add object / function check

    if(!this._wrap)
    {
        textArea.setProperty('value',this._object[this._key]);
    }
    else
    {
        var value = this._object[this._key];

        if(typeof(value)        === 'object'   &&
           typeof(value.length) === 'number'   &&
           typeof(value.splice) === 'function' &&
           !(value.propertyIsEnumerable('length')))
        {
            textArea.setStyleProperty('white-space','nowrap');
        }

        textArea.setProperty('value',value.join("\n"));
    }
};


ControlKit.NumberOutput = function(parent,object,value,params)
{
    ControlKit.Output.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params            = params        || {};
    params.dp         = params.dp     || 2;

    /*---------------------------------------------------------------------------------*/

    this._valueDPlace = params.dp + 1;
};

ControlKit.NumberOutput.prototype = Object.create(ControlKit.Output.prototype);

ControlKit.NumberOutput.prototype._setValue = function()
{
    if(this._parent.isDisabled())return;

    var value    = this._object[this._key],
        textArea = this._textArea,
        dp       = this._valueDPlace;

    var index,
        out;

    if(typeof(value)        === 'object'   &&
       typeof(value.length) === 'number'   &&
       typeof(value.splice) === 'function' &&
       !(value.propertyIsEnumerable('length')))
    {
        out = value.slice();

        var i = -1;
        var temp;

        var wrap = this._wrap;

        while(++i<out.length)
        {
            temp   = out[i] = out[i].toString();
            index  = temp.indexOf('.');
            if(index>0)out[i] = temp.slice(0,index + dp);
        }

        if(wrap)
        {
            textArea.setStyleProperty('white-space','nowrap');
            out = out.join('\n');
        }

        textArea.setProperty('value',out);
    }
    else
    {
        out   = value.toString();
        index = out.indexOf('.');
        textArea.setProperty('value',index > 0 ? out.slice(0,index + dp) : out);
    }

};

ControlKit.Picker = function(parentNode)
{
    var rootNode = this._node     = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.Picker),
        headNode = this._headNode = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.Head),
        lablWrap = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.Wrap),
        lablNode = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.Label),
        menuNode = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.Menu),
        wrapNode = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.Wrap);

    var menuClose = new ControlKit.Node(ControlKit.NodeType.INPUT_BUTTON);
        menuClose.setStyleClass(ControlKit.CSS.MenuBtnClose);

    /*---------------------------------------------------------------------------------*/

    var fieldWrap  = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass( ControlKit.CSS.PickerFieldWrap),
        sliderWrap = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.SliderWrap),
        inputWrap  = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass( ControlKit.CSS.PickerInputWrap);

    /*---------------------------------------------------------------------------------*/

    var canvasField  = this._canvasField  = document.createElement('canvas'),
        canvasSlider = this._canvasSlider = document.createElement('Canvas');

        fieldWrap.getElement().appendChild(canvasField);
        sliderWrap.getElement().appendChild(canvasSlider);

        this._setSizeCanvasField(154,154);
        this._setSizeCanvasSlider(14,154);

    var contextCanvasField  = this._contextCanvasField  = canvasField.getContext('2d'),
        contextCanvasSlider = this._contextCanvasSlider = canvasSlider.getContext('2d');

    var handleField  = this._handleField  = new ControlKit.Node(ControlKit.NodeType.DIV);
        handleField.setStyleClass(ControlKit.CSS.PickerHandleField);

    var handleSlider = this._handleSlider = new ControlKit.Node(ControlKit.NodeType.DIV);
        handleSlider.setStyleClass(ControlKit.CSS.PickerHandleSlider);

    /*---------------------------------------------------------------------------------*/

    var step = 1.0,
        dp   = 0;

    var callbackHue = this._onInputHueChange.bind(this),
        callbackSat = this._onInputSatChange.bind(this),
        callbackVal = this._onInputValChange.bind(this),
        callbackR   = this._onInputRChange.bind(this),
        callbackG   = this._onInputGChange.bind(this),
        callbackB   = this._onInputBChange.bind(this);


    var inputHue = this._inputHue = new ControlKit.NumberInput_Internal(step,dp,null,callbackHue,callbackHue),
        inputSat = this._inputSat = new ControlKit.NumberInput_Internal(step,dp,null,callbackSat,callbackSat),
        inputVal = this._inputVal = new ControlKit.NumberInput_Internal(step,dp,null,callbackVal,callbackVal),
        inputR   = this._inputR   = new ControlKit.NumberInput_Internal(step,dp,null,callbackR,callbackR),
        inputG   = this._inputG   = new ControlKit.NumberInput_Internal(step,dp,null,callbackG,callbackG),
        inputB   = this._inputB   = new ControlKit.NumberInput_Internal(step,dp,null,callbackB,callbackB);

    /*---------------------------------------------------------------------------------*/

    var controlsWrap = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.PickerControlsWrap);

    var buttonPick   = new ControlKit.Node(ControlKit.NodeType.INPUT_BUTTON).setStyleClass(ControlKit.CSS.Button).setProperty('value','pick'),
        buttonCancel = new ControlKit.Node(ControlKit.NodeType.INPUT_BUTTON).setStyleClass(ControlKit.CSS.Button).setProperty('value','cancel');


    var colorContrast = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.PickerColorContrast);

    var color0 = this._colorCurrNode = new ControlKit.Node(ControlKit.NodeType.DIV),
        color1 = this._colorPrevNode = new ControlKit.Node(ControlKit.NodeType.DIV);

    colorContrast.addChild(color0);
    colorContrast.addChild(color1);

    controlsWrap.addChild(buttonCancel);
    controlsWrap.addChild(buttonPick);
    controlsWrap.addChild(colorContrast);

    this._setContrasPrevColor(0,0,0);

    /*---------------------------------------------------------------------------------*/

    //CLEAN UP, TABle

    var inputFieldWrapHue = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.PickerInputField),
        inputFieldWrapSat = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.PickerInputField),
        inputFieldWrapVal = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.PickerInputField);

    var inputFieldWrapHueLabel = new ControlKit.Node(ControlKit.NodeType.SPAN).setStyleClass(ControlKit.CSS.Label).setProperty('innerHTML','H'),
        inputFieldWrapSatLabel = new ControlKit.Node(ControlKit.NodeType.SPAN).setStyleClass(ControlKit.CSS.Label).setProperty('innerHTML','S'),
        inputFieldWrapValLabel = new ControlKit.Node(ControlKit.NodeType.SPAN).setStyleClass(ControlKit.CSS.Label).setProperty('innerHTML','V');

        inputFieldWrapHue.addChildren(inputFieldWrapHueLabel,inputHue.getNode());
        inputFieldWrapSat.addChildren(inputFieldWrapSatLabel,inputSat.getNode());
        inputFieldWrapVal.addChildren(inputFieldWrapValLabel,inputVal.getNode());

    var inputFieldWrapR = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.PickerInputField),
        inputFieldWrapG = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.PickerInputField),
        inputFieldWrapB = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.PickerInputField);

    var inputFieldWrapRLabel = new ControlKit.Node(ControlKit.NodeType.SPAN).setStyleClass(ControlKit.CSS.Label).setProperty('innerHTML','R'),
        inputFieldWrapGLabel = new ControlKit.Node(ControlKit.NodeType.SPAN).setStyleClass(ControlKit.CSS.Label).setProperty('innerHTML','G'),
        inputFieldWrapBLabel = new ControlKit.Node(ControlKit.NodeType.SPAN).setStyleClass(ControlKit.CSS.Label).setProperty('innerHTML','B');

        inputFieldWrapR.addChildren(inputFieldWrapRLabel,inputR.getNode());
        inputFieldWrapG.addChildren(inputFieldWrapGLabel,inputG.getNode());
        inputFieldWrapB.addChildren(inputFieldWrapBLabel,inputB.getNode());


        inputWrap.addChildren(inputFieldWrapR,inputFieldWrapHue,
                              inputFieldWrapG,inputFieldWrapSat,
                              inputFieldWrapB,inputFieldWrapVal,colorContrast);

    /*---------------------------------------------------------------------------------*/

    var hexInputWrap = new ControlKit.Node(ControlKit.NodeType.DIV);
        hexInputWrap.setStyleClass(ControlKit.CSS.PickerInputWrap);

    var inputHEX = this._inputHEX = new ControlKit.Node(ControlKit.NodeType.INPUT_TEXT),
        inputFieldWrapHEX         = new ControlKit.Node(ControlKit.NodeType.DIV ).setStyleClass(ControlKit.CSS.PickerInputField),
        inputFieldWrapHEXLabel    = new ControlKit.Node(ControlKit.NodeType.SPAN).setStyleClass(ControlKit.CSS.Label);

        inputFieldWrapHEXLabel.setProperty('innerHTML','#');
        inputFieldWrapHEX.addChildren(inputFieldWrapHEXLabel,inputHEX);

        hexInputWrap.addChild(inputFieldWrapHEX);

        inputHEX.addEventListener(ControlKit.NodeEventType.CHANGE,this._onInputHEXFinish.bind(this));

    /*---------------------------------------------------------------------------------*/

        lablNode.setProperty('innerHTML','Color Picker');

        menuNode.addChild(menuClose);
        headNode.addChild(menuNode);
        lablWrap.addChild(lablNode);
        headNode.addChild(lablWrap);
        rootNode.addChild(headNode);
        rootNode.addChild(wrapNode);

        //wrapNode.addChild(paletteWrap);

        wrapNode.addChild(fieldWrap);
        wrapNode.addChild(sliderWrap);
        wrapNode.addChild(inputWrap);
        wrapNode.addChild(hexInputWrap);
        wrapNode.addChild(controlsWrap);

        fieldWrap.addChild( handleField);
        sliderWrap.addChild(handleSlider);

    /*---------------------------------------------------------------------------------*/

    var eventMouseDown = ControlKit.NodeEventType.MOUSE_DOWN,
        callback       = this._onCanvasFieldMouseDown.bind(this);

        fieldWrap.addEventListener(  eventMouseDown, callback);
        handleField.addEventListener(eventMouseDown, callback);

        callback = this._onCanvasSliderMouseDown.bind(this);

        sliderWrap.addEventListener(  eventMouseDown, callback);
        handleSlider.addEventListener(eventMouseDown, callback);

        menuClose.addEventListener(   eventMouseDown, this._onClose.bind(this));
        buttonPick.addEventListener(  eventMouseDown, this._onPick.bind(this));
        buttonCancel.addEventListener(eventMouseDown, this._onClose.bind(this));

        headNode.addEventListener(ControlKit.NodeEventType.MOUSE_DOWN, this._onHeadDragStart.bind(this));

    /*---------------------------------------------------------------------------------*/

    this._parentNode = parentNode;

    this._mouseOffset = [0,0];
    this._position    = [0,0];

    this._canvasSliderPos = [0,0];
    this._canvasFieldPos  = [0,0];
    this._handleFieldSize    = 12;
    this._handleSliderHeight = 7;

    this._imageDataSlider = contextCanvasSlider.createImageData(canvasSlider.width,canvasSlider.height);
    this._imageDataField  = contextCanvasField.createImageData( canvasField.width, canvasField.height);

    this._valueHueMinMax = [0,360];
    this._valueSatMinMax = this._valueValMinMax = [0,100];
    this._valueRGBMinMax = [0,255];

    this._valueHue = ControlKit.Default.COLOR_PICKER_VALUE_HUE;
    this._valueSat = ControlKit.Default.COLOR_PICKER_VALUE_SAT;
    this._valueVal = ControlKit.Default.COLOR_PICKER_VALUE_VAL;
    this._valueR   = 0;
    this._valueG   = 0;
    this._valueB   = 0;

    this._valueHEX = '#000000';
    this._valueHEXValid = this._valueHEX;

    this._callbackPick = function(){};

    //this._canvasFieldImageDataFunc = function(i,j){return this._HSV2RGB(this._valueHue,j)}

    /*---------------------------------------------------------------------------------*/

    this._drawCanvasField();
    this._drawCanvasSlider();

    this._setColorHSV(this._valueHue,this._valueSat,this._valueVal);

    this._updateColorRGBFromHSV();
    this._updateColorHEXFromRGB();

    this._updateHandles();
};

/*---------------------------------------------------------------------------------*/

ControlKit.Picker.prototype =
{
    _drawHandleField : function()
    {
        var canvas   = this._canvasField,
            nodePos  = this._canvasFieldPos,
            mousePos = ControlKit.Mouse.getInstance().getPosition();

        var posX     = Math.max(0,Math.min(mousePos[0] - nodePos[0],canvas.width)),
            posY     = Math.max(0,Math.min(mousePos[1] - nodePos[1],canvas.height)),
            posXNorm = posX / canvas.width,
            posYNorm = posY / canvas.height;

        var sat = Math.round(       posXNorm   * this._valueSatMinMax[1]),
            val = Math.round((1.0 - posYNorm) * this._valueValMinMax[1]);

        this._setColorHSV(this._valueHue,sat,val);

        this._updateColorRGBFromHSV();
        this._updateColorHEXFromRGB();

        this._updateHandleField();
    },

    _updateHandleField : function()
    {
        var width        = this._canvasField.width,
            height       = this._canvasField.height,
            offsetHandle = this._handleFieldSize * 0.25;

        var satNorm      = this._valueSat / this._valueSatMinMax[1],
            valNorm      = this._valueVal / this._valueValMinMax[1];

       this._handleField.setPositionGlobal(satNorm * width          - offsetHandle,
                                           (1.0 - valNorm) * height - offsetHandle);

    },

    _drawHandleSlider : function()
    {
        var canvas     = this._canvasSlider,
            canvasPosY = this._canvasSliderPos[1],
            mousePosY  = ControlKit.Mouse.getInstance().getY();

        var posY     = Math.max(0,Math.min(mousePosY - canvasPosY,canvas.height)),
            posYNorm = posY / canvas.height;

        var hue  = Math.floor((1.0 - posYNorm) * this._valueHueMinMax[1]);

        this._setColorHSV(hue,this._valueSat,this._valueVal);

        this._updateColorRGBFromHSV();
        this._updateColorHEXFromRGB();

        this._updateHandleSlider();
    },

    _updateHandleSlider : function()
    {
        var height       = this._canvasSlider.height,
            offsetHandle = this._handleSliderHeight * 0.25;

        var hueNorm = this._valueHue / this._valueHueMinMax[1];

        this._handleSlider.setPositionGlobalY((height - offsetHandle) * (1.0 - hueNorm));
    },

    _updateHandles : function()
    {
        this._updateHandleField();
        this._updateHandleSlider();
    },

    /*---------------------------------------------------------------------------------*/

    _setHue : function(value)
    {
        var minMax = this._valueHueMinMax;

        this._valueHue = value == minMax[1] ? minMax[0] : value;
        this._updateColorHSV();
        this._drawCanvasField();
    },

    _setSat : function(value)
    {
        this._valueSat = Math.round(value);
        this._updateColorHSV();
    },

    _setVal : function(value)
    {
        this._valueVal = Math.round(value);
        this._updateColorHSV();
    },

    _setR : function(value)
    {
        this._valueR = Math.round(value);
        this._updateColorRGB();
    },

    _setG : function(value)
    {
        this._valueG = Math.round(value);
        this._updateColorRGB();
    },

    _setB : function(value)
    {
        this._valueB = Math.round(value);
        this._updateColorRGB();
    },

    /*---------------------------------------------------------------------------------*/

    _onInputHueChange : function()
    {
        var input    = this._inputHue,
            inputVal = this._getValueContrained(input,this._valueHueMinMax);

        var minMax = this._valueHueMinMax;

        if(inputVal == minMax[1]){inputVal = minMax[0]; input.setValue(inputVal);}

        this._setHue(inputVal);
        this._updateColorRGBFromHSV();
        this._updateColorHEXFromRGB();
        this._updateHandleSlider();

        this._drawCanvasField();
    },

    _onInputSatChange : function()
    {
        this._setSat(this._getValueContrained(this._inputSat,this._valueSatMinMax));
        this._onInputSVChange();
    },

    _onInputValChange : function()
    {
        this._setVal(this._getValueContrained(this._inputVal,this._valueValMinMax));
        this._onInputSVChange();
    },

    _onInputRChange   : function()
    {
        this._setR(this._getValueContrained(this._inputR,this._valueRGBMinMax));
        this._onInputRGBChange();
    },

    _onInputGChange   : function()
    {
        this._setG(this._getValueContrained(this._inputG,this._valueRGBMinMax));
        this._onInputRGBChange();
    },

    _onInputBChange   : function()
    {
        this._setB(this._getValueContrained(this._inputB,this._valueRGBMinMax));
        this._onInputRGBChange();
    },

    _onInputHEXFinish : function()
    {
        var input = this._inputHEX,
            value = input.getProperty('value');

        if(!this._isValidHEX(value))
        {
            input.setProperty('value',this._valueHEXValid);
            return;
        }

        this._valueHEX = this._valueHEXValid = value;
        this._updateColorFromHEX();
    },

    _onInputSVChange : function()
    {
        this._updateColorRGBFromHSV();
        this._updateColorHEXFromRGB();
        this._updateHandleField();
    },

    _onInputRGBChange : function()
    {
        this._updateColorHSVFromRGB();
        this._updateColorHEXFromRGB();
        this._updateHandles();
    },

    _getValueContrained : function(input,minMax)
    {
        var inputVal = Math.round(input.getValue()),
            min      = minMax[0],
            max      = minMax[1];

        if(inputVal <= min){inputVal = min;input.setValue(inputVal);}
        if(inputVal >= max){inputVal = max;input.setValue(inputVal);}

        return inputVal;
    },



    /*---------------------------------------------------------------------------------*/

    _updateInputHue : function(){this._inputHue.setValue(this._valueHue);},
    _updateInputSat : function(){this._inputSat.setValue(this._valueSat);},
    _updateInputVal : function(){this._inputVal.setValue(this._valueVal);},
    _updateInputR   : function(){this._inputR.setValue(this._valueR);},
    _updateInputG   : function(){this._inputG.setValue(this._valueG);},
    _updateInputB   : function(){this._inputB.setValue(this._valueB);},
    _updateInputHEX : function(){this._inputHEX.setProperty('value',this._valueHEX);},

    /*---------------------------------------------------------------------------------*/

    _setColorHSV  : function(hue,sat,val)
    {
        this._valueHue = hue;
        this._valueSat = sat;
        this._valueVal = val;

        this._updateInputHue();
        this._updateInputSat();
        this._updateInputVal();

        this._updateContrastCurrColor();
    },

    _setColorRGB  : function(r,g,b)
    {
        this._valueR = r;
        this._valueG = g;
        this._valueB = b;

        this._updateInputR();
        this._updateInputG();
        this._updateInputB();

        this._updateContrastCurrColor();
    },

    _setColorHEX : function(hex)
    {
        this._valueHEX = hex;
        this._updateInputHEX();
    },

    _updateColorHSV : function()
    {
        this._setColorHSV(this._valueHue,this._valueSat,this._valueVal);
        this._updateContrastCurrColor();
    },

    _updateColorRGB : function()
    {
        this._setColorRGB(this._valueR,this._valueG,this._valueB);
        this._updateContrastCurrColor();
    },

    _updateColorHSVFromRGB : function()
    {
        var hsv = this._RGB2HSV(this._valueR,this._valueG,this._valueB);
        this._setColorHSV(hsv[0],hsv[1],hsv[2]);
    },

    _updateColorRGBFromHSV : function()
    {
        var rgb = this._HSV2RGB(this._valueHue,this._valueSat,this._valueVal);
        this._setColorRGB(rgb[0],rgb[1],rgb[2]);
    },

    _updateColorHEXFromRGB : function()
    {
        var hex = this._RGB2HEX(this._valueR, this._valueG, this._valueB);
        this._setColorHEX(hex);
    },

    _updateColorFromHEX : function()
    {
        var rgb = this._HEX2RGB(this._valueHEX);

        this._setColorRGB(rgb[0],rgb[1],rgb[2]);
        this._updateColorHSVFromRGB();
        this._updateHandles();
    },



    /*---------------------------------------------------------------------------------*/

    _updateContrastCurrColor : function(){this._setContrastCurrColor(this._valueR, this._valueG, this._valueB);},
    _updateContrastPrevColor : function(){this._setContrasPrevColor( this._valueR, this._valueG, this._valueB)},

    _setContrastCurrColor  : function(r,g,b){this._colorCurrNode.setStyleProperty('background','rgb('+r+','+g+','+b+')')},
    _setContrasPrevColor   : function(r,g,b){this._colorPrevNode.setStyleProperty('background','rgb('+r+','+g+','+b+')')},

    /*---------------------------------------------------------------------------------*/

    _HSV2RGB : function(hue,sat,val)
    {
        var hueMinMax = this._valueHueMinMax,
            satMinMax = this._valueSatMinMax,
            valMinMax = this._valueValMinMax;

        var max_hue = hueMinMax[1],
            max_sat = satMinMax[1],
            max_val = valMinMax[1];

        var min_hue = hueMinMax[0],
            min_sat = satMinMax[0],
            min_val = valMinMax[0];

        hue = hue % max_hue;
        val = Math.max(min_val,Math.min(val,max_val))/max_val * 255.0;

        if(sat <= min_sat)
        {
            val = Math.round(val);
            return[val,val,val];
        }
        else if(sat > max_sat)sat = max_sat;

        sat = sat/max_sat;

        //http://d.hatena.ne.jp/ja9/20100903/128350434

        var hi = Math.floor(hue/60.0)% 6,
            f  = (hue/60.0) - hi,
            p  = val * (1 - sat),
            q  = val * (1 - f * sat),
            t  = val * (1 - (1 - f) * sat);

        var r = 0,
            g = 0,
            b = 0;

        switch(hi)
        {
            case 0: r = val; g = t; b = p;break;
            case 1: r = q; g = val; b = p;break;
            case 2: r = p; g = val; b = t;break;
            case 3: r = p; g = q; b = val;break;
            case 4: r = t; g = p; b = val;break;
            case 5: r = val; g = p; b = q;break;
            default: break;
        }

        r = Math.round(r);
        g = Math.round(g);
        b = Math.round(b);

        return [r,g,b];

    },

    _RGB2HSV: function (r, g, b)
    {
        var h = 0,
            s = 0,
            v = 0;

        r = r / 255.0;
        g = g / 255.0;
        b = b / 255.0;

        var minRGB = Math.min(r, Math.min(g, b)),
            maxRGB = Math.max(r, Math.max(g, b));

        if (minRGB == maxRGB) { v = minRGB;return [0, 0, Math.round(v)];}

        var dd = (r == minRGB) ? g - b : ((b == minRGB) ? r - g : b - r),
            hh = (r == minRGB) ? 3 : ((b == minRGB) ? 1 : 5);

        h = Math.round(60 * (hh - dd / (maxRGB - minRGB)));
        s = Math.round((maxRGB - minRGB) / maxRGB * 100.0);
        v = Math.round( maxRGB * 100.0);

        return [h, s, v];
    },

    _isValidHEX : function(hex)
    {
        return /^#[0-9A-F]{6}$/i.test(hex);
    },

    //http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb

    _RGB2HEX : function(r,g,b)
    {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    },

    _HEX2RGB : function(hex)
    {
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function(m, r, g, b) {
            return r + r + g + g + b + b;
        });

        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [parseInt(result[1], 16),parseInt(result[2], 16),parseInt(result[3], 16)] : null;
    },

    /*---------------------------------------------------------------------------------*/

    _onHeadDragStart : function()
    {
        var node       = this._node,
            parentNode = this._parentNode;

        var nodePos    = node.getPositionGlobal(),
            mousePos   = ControlKit.Mouse.getInstance().getPosition(),
            offsetPos  = this._mouseOffset;

        offsetPos[0] = mousePos[0] - nodePos[0];
        offsetPos[1] = mousePos[1] - nodePos[1];

        var eventMouseMove = ControlKit.DocumentEventType.MOUSE_MOVE,
            eventMouseUp   = ControlKit.DocumentEventType.MOUSE_UP;

        var self = this;

        var onDrag = function()
            {
                self._updatePosition();
                self._updateCanvasNodePositions();
            },

            onDragEnd = function()
            {
                self._updateCanvasNodePositions();
                document.removeEventListener(eventMouseMove, onDrag,    false);
                document.removeEventListener(eventMouseUp,   onDragEnd, false);
            };

        parentNode.removeChild(node);
        parentNode.addChild(   node);

        document.addEventListener(eventMouseMove, onDrag,    false);
        document.addEventListener(eventMouseUp,   onDragEnd, false);

        this._updateCanvasNodePositions();
    },

    _updatePosition : function()
    {
        var mousePos  = ControlKit.Mouse.getInstance().getPosition(),
            offsetPos = this._mouseOffset;

        var currPositionX = mousePos[0] - offsetPos[0],
            currPositionY = mousePos[1] - offsetPos[1];

        var node     = this._node,
            head     = this._headNode,
            position = this._position;

        var maxX = window.innerWidth  - node.getWidth(),
            maxY = window.innerHeight - head.getHeight();

        position[0] = Math.max(0,Math.min(currPositionX,maxX));
        position[1] = Math.max(0,Math.min(currPositionY,maxY));

        node.setPositionGlobal(position[0],position[1]);
    },

    /*---------------------------------------------------------------------------------*/

    _drawCanvasField : function()
    {
        var canvas  = this._canvasField,
            context = this._contextCanvasField;

        var width     = canvas.width,
            height    = canvas.height,
            invWidth  = 1 / width,
            invHeight = 1 / height;

        var imageData = this._imageDataField,
            rgb       = [],
            index     = 0;

        var valueHue  = this._valueHue;

        var i = -1, j;
        while(++i < height)
        {
            j = -1;

            while(++j < width)
            {
                rgb   = this._HSV2RGB(valueHue, j * invWidth * 100.0,( 1.0 - i * invHeight ) * 100.0);
                index = (i * width + j) * 4;

                imageData.data[index  ] = rgb[0];
                imageData.data[index+1] = rgb[1];
                imageData.data[index+2] = rgb[2];
                imageData.data[index+3] = 255;
            }
        }

        context.putImageData(imageData,0,0);

    },


    _drawCanvasSlider : function()
    {
        var canvas  = this._canvasSlider,
            context = this._contextCanvasSlider;

        var width     = canvas.width,
            height    = canvas.height,
            invHeight = 1 / height;

        var imageData = this._imageDataSlider,
            rgb       = [],
            index     = 0;

        var i = -1,j;
        while(++i < height)
        {
            j = -1;

            while(++j < width)
            {
                rgb   = this._HSV2RGB( (1.0 - i * invHeight) * 360.0,100.0,100.0);
                index = (i * width + j) * 4;

                imageData.data[index  ] = rgb[0];
                imageData.data[index+1] = rgb[1];
                imageData.data[index+2] = rgb[2];
                imageData.data[index+3] = 255;
            }
        }

        context.putImageData(imageData,0,0);

    },

    /*---------------------------------------------------------------------------------*/

    _onCanvasFieldMouseDown : function()
    {
        var eventMouseMove = ControlKit.DocumentEventType.MOUSE_MOVE,
            eventMouseUp   = ControlKit.DocumentEventType.MOUSE_UP;

        var self = this;

        var onDrag     = function()
            {
                self._drawHandleField();
            },

            onDragEnd  = function()
            {
                document.removeEventListener(eventMouseMove, onDrag,    false);
                document.removeEventListener(eventMouseUp,   onDragEnd, false);
            };

        document.addEventListener(eventMouseMove, onDrag,    false);
        document.addEventListener(eventMouseUp,   onDragEnd, false);

        self._drawHandleField();
    },

    _onCanvasSliderMouseDown : function()
    {
        var eventMouseMove = ControlKit.DocumentEventType.MOUSE_MOVE,
            eventMouseUp   = ControlKit.DocumentEventType.MOUSE_UP;

        var self = this;

        var onDrag     = function()
            {
                self._drawHandleSlider();
                self._drawCanvasField();
            },

            onDragEnd  = function()
            {
                document.removeEventListener(eventMouseMove, onDrag,    false);
                document.removeEventListener(eventMouseUp,   onDragEnd, false);
                self._drawCanvasField();
            };

        document.addEventListener(eventMouseMove, onDrag,    false);
        document.addEventListener(eventMouseUp,   onDragEnd, false);

        self._drawHandleSlider();
        self._drawCanvasField();
    },

    _setSizeCanvasField : function(width,height)
    {
        var canvas = this._canvasField;
            canvas.style.width  = width  + 'px';
            canvas.style.height = height + 'px';
            canvas.width  = width;
            canvas.height = height;

    },

    _setSizeCanvasSlider : function(width,height)
    {
        var canvas = this._canvasSlider;
            canvas.style.width  = width  + 'px';
            canvas.style.height = height + 'px';
            canvas.width  = width;
            canvas.height = height;
    },

    /*---------------------------------------------------------------------------------*/

    open  : function()
    {
        this._parentNode.addChild(this._node);
        this._updateCanvasNodePositions();
    },

    close : function(){this._parentNode.removeChild(this._node);},

    _onClose : function(e){e.cancelBubble = true;this.close();},
    _onPick  : function(){this._callbackPick();this.close();},

    _updateCanvasNodePositions : function()
    {
        var canvasSliderPos = this._canvasSliderPos,
            canvasFieldPos  = this._canvasFieldPos;

            canvasSliderPos[0] = canvasSliderPos[1] = 0;
            canvasFieldPos[0]  = canvasFieldPos[1]  = 0;

        var element = this._canvasSlider;

        while(element)
        {
            canvasSliderPos[0] += element.offsetLeft;
            canvasSliderPos[1] += element.offsetTop;
            element             = element.offsetParent;
        }

        element = this._canvasField;

        while(element)
        {
            canvasFieldPos[0] += element.offsetLeft;
            canvasFieldPos[1] += element.offsetTop;
            element            = element.offsetParent;
        }
    },

    setCallbackPick : function(func){this._callbackPick = func;},

    /*---------------------------------------------------------------------------------*/

    setColorHEX : function(hex)
    {
        this._setColorHEX(hex);
        this._updateColorFromHEX();

        this._drawCanvasField();

        this._updateHandles();

        var rgb = this._HEX2RGB(hex);
        this._setContrasPrevColor(rgb[0],rgb[1],rgb[2]);
    },

    //TODO ADD
    setColorRGB : function(r,g,b){},
    setColorHSV : function(h,s,v){},


    getR    : function(){return this._valueR;},
    getG    : function(){return this._valueG;},
    getB    : function(){return this._valueB;},
    getRGB  : function(){return [this._valueR,this._valueG,this._valueB];},
    getHue  : function(){return this._valueHue;},
    getSat  : function(){return this._valueSat;},
    getVal  : function(){return this._valueVal;},
    getHSV  : function(){return [this._valueHue,this._valueSat,this._valueVal];},
    getHEX  : function(){return this._valueHEX;},

    getNode : function(){return this._node;}

};

ControlKit.Picker.init        = function(parentNode){return ControlKit.Picker._instance = new ControlKit.Picker(parentNode);};
ControlKit.Picker.getInstance = function(){return ControlKit.Picker._instance;};

ControlKit.Canvas = function(parent,params)
{
    ControlKit.Component.apply(this,arguments);

    /*-------------------------------------------------------------------------------------*/

    var wrapNode = this._wrapNode;
        wrapNode.setStyleClass(ControlKit.CSS.CanvasWrap);

    var wrapWidth = wrapNode.getWidth();

    var canvas = this._canvas = document.createElement('canvas');
        wrapNode.getElement().appendChild(canvas);

    this._canvasWidth = this._canvasHeight = 0;
    this._setCanvasSize(wrapWidth,wrapWidth);

    this._updateHeight();

    /*-------------------------------------------------------------------------------------*/

    this._node.setStyleClass(ControlKit.CSS.CanvasListItem);

    this._parent.addEventListener(ControlKit.EventType.GROUP_SIZE_CHANGE,this,  'onGroupSizeChange');
    this.addEventListener(ControlKit.EventType.GROUP_SIZE_UPDATE,this._parent,'onGroupSizeUpdate');

};

ControlKit.Canvas.prototype = Object.create(ControlKit.Component.prototype);

/*-------------------------------------------------------------------------------------*/


ControlKit.Canvas.prototype._updateHeight = function()
{
    var canvasHeight = this._canvas.height;

    this._wrapNode.setHeight(canvasHeight);
    this._node.setHeight(canvasHeight + ControlKit.Metric.PADDING_WRAPPER);

};

ControlKit.Canvas.prototype.onGroupSizeChange = function()
{
    var width = this._wrapNode.getWidth();

    this._setCanvasSize(width,width);
    this._updateHeight();
    this._redraw();

    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.GROUP_SIZE_UPDATE,null));
};

ControlKit.Canvas.prototype._setCanvasSize = function(width,height)
{
    var canvasWidth  = this._canvasWidth  = width,
        canvasHeight = this._canvasHeight = height;

    var canvas = this._canvas;
        canvas.setStyleProperty('width', canvasWidth  + 'px');
        canvas.setStyleProperty('height',canvasHeight + 'px');
        canvas.width  = canvasWidth;
        canvas.height = canvasHeight;
};

ControlKit.Canvas.prototype.getCanvas  = function(){return this._canvas;};
ControlKit.Canvas.prototype.getContext = function(){return this._canvas.getContext('2d');};
ControlKit.SVG = function(parent,params)
{
    ControlKit.Component.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    var wrapNode = this._wrapNode;
    wrapNode.setStyleClass(ControlKit.CSS.CanvasWrap);
    var wrapSize = wrapNode.getWidth();


    var svg = this._svg = this._createSVGObject('svg');
    svg.setAttribute('version', '1.2');
    svg.setAttribute('baseProfile', 'tiny');
    svg.setAttribute('preserveAspectRatio','true');

    wrapNode.getElement().appendChild(svg);

    this._svgSetSize(wrapSize,wrapSize);
    this._updateHeight();

    /*---------------------------------------------------------------------------------*/

    this._node.setStyleClass(ControlKit.CSS.CanvasListItem);

    this._parent.addEventListener(ControlKit.EventType.GROUP_SIZE_CHANGE, this, 'onGroupSizeChange');
    this.addEventListener(ControlKit.EventType.GROUP_SIZE_UPDATE, this._parent, 'onGroupSizeUpdate');
};

ControlKit.Component.prototype = Object.create(ControlKit.Component.prototype);

/*---------------------------------------------------------------------------------*/

ControlKit.SVG.prototype._updateHeight = function()
{
    var svgHeight = Number(this._svg.getAttribute('height'));

    this._wrapNode.setHeight(svgHeight);
    this._node.setHeight(svgHeight + ControlKit.Metric.PADDING_WRAPPER);
};

ControlKit.SVG.prototype.onGroupSizeChange = function()
{
    var width = this._wrapNode.getWidth();

    this._svgSetSize(width,width);
    this._updateHeight();
};

/*---------------------------------------------------------------------------------*/

ControlKit.SVG.prototype._svgSetSize = function(width,height)
{
    var svg = this._svg;
    svg.setAttribute('width',  width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewbox', '0 0 ' + width + ' ' + height);
};

ControlKit.SVG.prototype.getSVG = function(){return this._svg;};
ControlKit.CSS.Style = "#controlKit .panel input[type='text'],  #controlKit .panel textarea,  #controlKit .panel .color,  #controlKit .picker input[type='text'] {    -webkit-box-sizing: border-box;    -moz-box-sizing: border-box;    box-sizing: border-box;    height: 25px;    width: 100%;    padding: 0 0 0 8px;    font-family: arial, sans-serif;    font-size: 11px;    color: white;    text-shadow: 1px 1px black;    background: #222729;    background-image: -o-linear-gradient(rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.125) 100%);    background-image: linear-gradient(rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.125) 100%);    border: none;    box-shadow: 0 0 1px 2px rgba(0, 0, 0, 0.0125) inset, 0 0 1px 1px #111314 inset;    border-radius: 2px;    -moz-border-radius: 2px;    border-bottom: 1px solid #3b4447; }  #controlKit .panel .color {    -webkit-box-sizing: border-box;    -moz-box-sizing: border-box;    box-sizing: border-box;    width: 100%;    height: 25px;    line-height: 25px;    background: #fff;    text-align: center;    padding: 0;    -webkit-touch-callout: none;    -webkit-user-select: none;    -khtml-user-select: none;    -moz-user-select: none;    -ms-user-select: none;    user-select: none;    cursor: pointer;    border: none;    box-shadow: 0 0 0 1px #111314 inset;    border-radius: 2px;    -moz-border-radius: 2px;    border-bottom: 1px solid #3b4447; }  #controlKit .panel .button,  #controlKit .picker .button,  #controlKit .panel .select,  #controlKit .panel .selectActive {    -webkit-box-sizing: border-box;    -moz-box-sizing: border-box;    box-sizing: border-box;    width: 100%;    height: 26px;    margin: -2px 0 0 0;    cursor: pointer;    background: #3c494e;    background-image: -o-linear-gradient(rgba(34, 39, 41, 0) 0%, rgba(34, 39, 41, 0.65) 100%);    background-image: linear-gradient(rgba(34, 39, 41, 0) 0%, rgba(34, 39, 41, 0.65) 100%);    font-family: arial, sans-serif;    color: white;    border: none;    border-radius: 2px;    -moz-border-radius: 2px;    box-shadow: 0 0 0 1px #131313 inset, -1px 2px 0 0 #323a44 inset;    border-bottom: 1px solid #3b4447; }  #controlKit .panel .button, #controlKit .picker .button {    font-size: 10px;    font-weight: bold;    text-shadow: 0 -1px black;    text-transform: uppercase; }    #controlKit .panel .button:hover, #controlKit .picker .button:hover {      background-image: none; }    #controlKit .panel .button:active, #controlKit .picker .button:active {      background-image: -o-linear-gradient(rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0) 100%);      background-image: linear-gradient(rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0) 100%); }  #controlKit .panel {    position: absolute;    left: 0;    top: 0;    z-index: 1;    margin: 0;    padding: 0;    width: 300px;    background-color: #303639;    box-shadow: 0 0 1px 1px rgba(0, 0, 0, 0.25);    font-family: arial, sans-serif;    -webkit-touch-callout: none;    -webkit-user-select: none;    -khtml-user-select: none;    -moz-user-select: none;    -ms-user-select: none;    user-select: none;    -webkit-box-sizing: border-box;    -moz-box-sizing: border-box;    box-sizing: border-box;    border-radius: 2px;    -moz-border-radius: 2px;    overflow: hidden;    opacity: 1.0; }    #controlKit .panel textarea {      padding: 5px 8px 2px 8px;      overflow: hidden;      resize: none;      vertical-align: top;      white-space: nowrap; }    #controlKit .panel .select, #controlKit .panel .selectActive {      padding-left: 10px;      padding-right: 20px;      font-size: 11px;      text-align: left;      text-shadow: 1px 1px black;      cursor: pointer;      overflow: hidden;      white-space: nowrap;      text-overflow: ellipsis; }    #controlKit .panel .select {      background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAALCAYAAAB24g05AAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo+qi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt/87fOH4p3iC+N7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi/RNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z+pn5mZ2y6xlhbL+xW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a/zYnKOZarnivN7cyzytuQN5zvn//tEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1+1dT1gvWd+1YfqGnRs+FYmKrhTbF5cVf9go3HjlG4dvyr+Z3JS0qavEuWTPZtJm6ebeLZ5bDpaql+aXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO/PLi8ZafJzs07P1SkVPRU+lQ27tLdtWHX+G7R7ht7vPY07NXbW7z3/T7JvttVAVVN1WbVZftJ+7P3P66Jqun4lvttXa1ObXHtxwPSA/0HIw6217nU1R3SPVRSj9Yr60cOxx++/p3vdy0NNg1VjZzG4iNwRHnk6fcJ3/ceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w+0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb++6EHTh0kX/i+c7vDvOXPK4dPKy2+UTV7hXmq86X23qdOo8/pPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb/1tWeOT3dvfN6b/fF9/XfFt1+cif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v+3Njv3H9qwHeg89HcR/cGhYPP/pH1jw9DBY+Zj8uGDYbrnjg+OTniP3L96fynQ89kzyaeF/6i/suuFxYvfvjV69fO0ZjRoZfyl5O/bXyl/erA6xmv28bCxh6+yXgzMV70VvvtwXfcdx3vo98PT+R8IH8o/2j5sfVT0Kf7kxmTk/8EA5jz/GMzLdsAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAAAMNJREFUeNqckjEKwjAUhj8l53AQ526BHKKLIhSlHkHxBkkuIFWPILQOQQd3V4VuXiguFlrFRPzhLXl833uB10uznCaP+q4BEqls83Y5HghFtOH1amkAit2+IwkmzXIGw5HeFFvfZFNs/WA40mmW470P1gf8LokJRCIV11vN9bb42C6RKvoDAdhX/RXxqO8G0F/6FjBBQSIV8+mE2XTcaVTuTOlO0Q36gCndyVbu/A5Hp7fvwLymaeBnuHNILQm/wgDPAQAPNIsHnO794QAAAABJRU5ErkJggg==) 100% 50% no-repeat, -o-linear-gradient(#3a464b 0%, rgba(44, 52, 55, 0) 100%);      background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAALCAYAAAB24g05AAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo+qi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt/87fOH4p3iC+N7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi/RNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z+pn5mZ2y6xlhbL+xW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a/zYnKOZarnivN7cyzytuQN5zvn//tEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1+1dT1gvWd+1YfqGnRs+FYmKrhTbF5cVf9go3HjlG4dvyr+Z3JS0qavEuWTPZtJm6ebeLZ5bDpaql+aXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO/PLi8ZafJzs07P1SkVPRU+lQ27tLdtWHX+G7R7ht7vPY07NXbW7z3/T7JvttVAVVN1WbVZftJ+7P3P66Jqun4lvttXa1ObXHtxwPSA/0HIw6217nU1R3SPVRSj9Yr60cOxx++/p3vdy0NNg1VjZzG4iNwRHnk6fcJ3/ceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w+0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb++6EHTh0kX/i+c7vDvOXPK4dPKy2+UTV7hXmq86X23qdOo8/pPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb/1tWeOT3dvfN6b/fF9/XfFt1+cif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v+3Njv3H9qwHeg89HcR/cGhYPP/pH1jw9DBY+Zj8uGDYbrnjg+OTniP3L96fynQ89kzyaeF/6i/suuFxYvfvjV69fO0ZjRoZfyl5O/bXyl/erA6xmv28bCxh6+yXgzMV70VvvtwXfcdx3vo98PT+R8IH8o/2j5sfVT0Kf7kxmTk/8EA5jz/GMzLdsAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAAAMNJREFUeNqckjEKwjAUhj8l53AQ526BHKKLIhSlHkHxBkkuIFWPILQOQQd3V4VuXiguFlrFRPzhLXl833uB10uznCaP+q4BEqls83Y5HghFtOH1amkAit2+IwkmzXIGw5HeFFvfZFNs/WA40mmW470P1gf8LokJRCIV11vN9bb42C6RKvoDAdhX/RXxqO8G0F/6FjBBQSIV8+mE2XTcaVTuTOlO0Q36gCndyVbu/A5Hp7fvwLymaeBnuHNILQm/wgDPAQAPNIsHnO794QAAAABJRU5ErkJggg==) 100% 50% no-repeat, linear-gradient(#3a464b 0%, rgba(44, 52, 55, 0) 100%); }    #controlKit .panel .select:hover, #controlKit .panel .selectActive {      background: url(data:image/png;base64,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) 100% 50% no-repeat, #3c494e; }    #controlKit .panel .presetBtn, #controlKit .panel .presetBtnActive {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      position: absolute;      right: 1px;      width: 20px;      height: 22px;      margin: 1px 0 0 0;      cursor: pointer;      float: right;      border: none;      border-top-right-radius: 2px;      border-bottom-right-radius: 2px;      border-left: 1px solid #0f1112;      box-shadow: 0 1px 0 0 #323a44 inset; }    #controlKit .panel .presetBtnActive, #controlKit .panel .presetBtn:hover {      background: url(data:image/png;base64,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) 50% 50% no-repeat, #3c494e; }    #controlKit .panel .presetBtn {      background: url(data:image/png;base64,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) 50% 50% no-repeat, -o-linear-gradient(#3a464b 0%, #2c3437 100%);      background: url(data:image/png;base64,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) 50% 50% no-repeat, linear-gradient(#3a464b 0%, #2c3437 100%); }    #controlKit .panel .scrollBar {      -webkit-box-sizing: content-box;      -moz-box-sizing: content-box;      box-sizing: content-box;      width: 17px;      height: 100%;      float: right;      top: 0;      padding: 0;      margin: 0;      position: relative;      background: #212628;      background-image: linear-gradient(to right, #15181a 0%, rgba(26, 29, 31, 0) 100%); }      #controlKit .panel .scrollBar .track {        padding: 0 3px 0 2px; }        #controlKit .panel .scrollBar .track .thumb {          -webkit-box-sizing: border-box;          -moz-box-sizing: border-box;          box-sizing: border-box;          width: 13px;          position: absolute;          cursor: pointer;          background: #3b484e;          background-image: -o-linear-gradient(#3a4145 0%, #363c40 100%);          background-image: linear-gradient(#3a4145 0%, #363c40 100%);          border: 1px solid #15181a;          border-radius: 2px;          -moz-border-radius: 2px;          box-shadow: inset 0 1px 0 0 #434b50; }    #controlKit .panel .wrap {      width: auto;      height: auto;      margin: 0;      padding: 0;      position: relative;      overflow: hidden; }    #controlKit .panel .inputWPresetWrap, #controlKit .panel .colorWPresetWrap {      width: 100%;      float: left; }    #controlKit .panel .inputWPresetWrap input[type='text'], #controlKit .panel .colorWPresetWrap .color {      padding-right: 25px;      border-top-right-radius: 2px;      border-bottom-right-radius: 2px;      width: 90%; }    #controlKit .panel .textAreaWrap {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      width: 100%;      padding: 0;      float: left;      height: 100%;      overflow: hidden;      border-radius: 2px;      border: none;      box-shadow: 0 0 1px 2px rgba(0, 0, 0, 0.0125) inset, 0 0 1px 1px #111314 inset;      border-radius: 2px;      -moz-border-radius: 2px;      border-bottom: 1px solid #3b4447;      background-color: #222729;      box-shadow: 0 0 1px 2px rgba(0, 0, 0, 0.0125) inset, 0 0 1px 1px #111314 inset;      background-image: -o-linear-gradient(rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.125) 100%);      background-image: linear-gradient(rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.125) 100%); }      #controlKit .panel .textAreaWrap textarea {        border: none;        border-top-right-radius: 0;        border-bottom-right-radius: 0;        border-radius: 2px;        -moz-border-radius: 2px;        box-shadow: none;        background: none; }      #controlKit .panel .textAreaWrap .scrollBar {        border: 1px solid #101213;        border-bottom-right-radius: 2px;        border-top-right-radius: 2px;        border-left: none;        box-shadow: 0 0 1px 2px rgba(0, 0, 0, 0.0125) inset, 0 0 1px 1px #111314 inset; }    #controlKit .panel .graphSliderXWrap, #controlKit .panel .graphSliderYWrap {      position: absolute;      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box; }    #controlKit .panel .graphSliderXWrap {      bottom: 0;      left: 0;      width: 100%;      padding: 6px 20px 6px 6px; }    #controlKit .panel .graphSliderYWrap {      top: 0;      right: 0;      height: 100%;      padding: 6px 6px 20px 6px; }    #controlKit .panel .graphSliderX, #controlKit .panel .graphSliderY {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      border-radius: 2px;      -moz-border-radius: 2px;      background: rgba(24, 27, 29, 0.5);      border: 1px solid #181b1d; }    #controlKit .panel .graphSliderX {      height: 8px; }    #controlKit .panel .graphSliderY {      width: 8px;      height: 100%; }    #controlKit .panel .graphSliderXHandle, #controlKit .panel .graphSliderYHandle {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      cursor: pointer;      border: 1px solid #181b1d;      background: #303639; }    #controlKit .panel .graphSliderXHandle {      width: 20px;      height: 100%;      border-top: none;      border-bottom: none; }    #controlKit .panel .graphSliderYHandle {      width: 100%;      height: 20px;      border-left: none;      border-right: none; }    #controlKit .panel .scrollWrap {      position: relative;      overflow: hidden; }    #controlKit .panel .scrollBuffer {      width: 100%;      height: 8px;      border-top: 1px solid #3b4447;      border-bottom: 1px solid #1e2224; }    #controlKit .panel canvas {      cursor: pointer;      vertical-align: bottom;      border: none;      box-shadow: 0 0 1px 2px rgba(0, 0, 0, 0.0125) inset, 0 0 1px 1px #111314 inset;      border-radius: 2px;      -moz-border-radius: 2px;      border-bottom: 1px solid #3b4447; }    #controlKit .panel .svgWrap, #controlKit .panel .canvasWrap {      margin: 6px 0 0 0;      position: relative;      width: 70%;      float: right;      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      border: none;      border-radius: 2px;      -moz-border-radius: 2px;      background: #1e2224;      background-image: -o-linear-gradient(rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.05) 100%);      background-image: linear-gradient(rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.05) 100%); }      #controlKit .panel .svgWrap svg, #controlKit .panel .canvasWrap svg {        cursor: pointer;        vertical-align: bottom;        border: none;        box-shadow: 0 0 1px 2px rgba(0, 0, 0, 0.0125) inset, 0 0 1px 1px #111314 inset;        border-radius: 2px;        -moz-border-radius: 2px;        border-bottom: 1px solid #3b4447; }    #controlKit .panel ul {      margin: 0;      padding: 0;      list-style: none; }    #controlKit .panel .groupList .group .head {      height: 40px;      border-top: 1px solid #566166;      border-bottom: 1px solid #1a1d1f;      padding: 0 20px 0 20px;      background-image: -o-linear-gradient(#3c4a4f 0%, #383f47 100%);      background-image: linear-gradient(#3c4a4f 0%, #383f47 100%);      cursor: pointer; }      #controlKit .panel .groupList .group .head .label {        font-size: 13px;        line-height: 40px;        color: white; }      #controlKit .panel .groupList .group .head:hover {        background-image: -o-linear-gradient(#3c4a4f 0%, #3c4a4f 100%);        background-image: linear-gradient(#3c4a4f 0%, #3c4a4f 100%); }    #controlKit .panel .groupList .group li {      height: 35px;      padding: 0 10px 0 10px; }    #controlKit .panel .groupList .group .subGroupList {      padding: 10px;      border-top: 1px solid #3b4447;      border-bottom: 1px solid #1e2224; }      #controlKit .panel .groupList .group .subGroupList .subGroup {        padding: 0;        margin-top: 6px;        height: auto;        border: 1px solid #1e2224;        border-radius: 2px;        -moz-border-radius: 2px;        box-shadow: 0 1px 0 0 #3b4447; }        #controlKit .panel .groupList .group .subGroupList .subGroup ul {          overflow: hidden; }        #controlKit .panel .groupList .group .subGroupList .subGroup:first-child {          margin-top: 0; }        #controlKit .panel .groupList .group .subGroupList .subGroup .head {          height: 26px;          padding: 0 10px 0 10px;          border-top: none;          border-bottom: 1px solid #1e2224;          border-top-left-radius: 2px;          border-top-right-radius: 2px;          background-image: none;          background-color: #25282b;          cursor: pointer; }          #controlKit .panel .groupList .group .subGroupList .subGroup .head:hover {            background-image: none;            background-color: #222629; }        #controlKit .panel .groupList .group .subGroupList .subGroup li:nth-child(odd) {          background-color: #292d30; }        #controlKit .panel .groupList .group .subGroupList .subGroup li:nth-child(even) {          background-color: #303639; }        #controlKit .panel .groupList .group .subGroupList .subGroup .headInactive {          -webkit-box-sizing: border-box;          -moz-box-sizing: border-box;          box-sizing: border-box;          height: 26px;          padding: 0 10px 0 10px;          background-image: -o-linear-gradient(#3a4145 0%, #363c40 100%);          background-image: linear-gradient(#3a4145 0%, #363c40 100%);          box-shadow: 0 1px 0 0 #434b50 inset;          cursor: pointer; }          #controlKit .panel .groupList .group .subGroupList .subGroup .headInactive:hover {            background-image: none;            background-color: #3a4145; }        #controlKit .panel .groupList .group .subGroupList .subGroup .head .label, #controlKit .panel .groupList .group .subGroupList .subGroup .headInactive .label {          margin: 0;          padding: 0;          line-height: 26px;          color: white;          font-weight: bold;          font-size: 11px;          text-shadow: 1px 1px black;          text-transform: capitalize; }        #controlKit .panel .groupList .group .subGroupList .subGroup .head .wrap .label, #controlKit .panel .groupList .group .subGroupList .subGroup .headInactive .wrap .label {          width: 100%;          font-weight: bold;          color: white;          padding: 0; }        #controlKit .panel .groupList .group .subGroupList .subGroup .wrap .label {          -webkit-box-sizing: border-box;          -moz-box-sizing: border-box;          box-sizing: border-box;          height: 100%;          width: 30%;          padding: 10px 5px 0 0;          float: left;          font-size: 11px;          font-weight: normal;          color: #aeb5b8;          text-shadow: 1px 1px black; }        #controlKit .panel .groupList .group .subGroupList .subGroup .wrap .wrap {          -webkit-box-sizing: border-box;          -moz-box-sizing: border-box;          box-sizing: border-box;          width: 70%;          padding: 6px 0 0 0;          float: right;          height: 100%; }          #controlKit .panel .groupList .group .subGroupList .subGroup .wrap .wrap .wrap {            width: 25%;            padding: 0;            float: left; }            #controlKit .panel .groupList .group .subGroupList .subGroup .wrap .wrap .wrap .label {              width: 100%;              padding: 4px 0 0 0;              color: #878787;              text-align: center;              text-transform: uppercase;              font-weight: bold;              text-shadow: 1px 1px #1a1a1a; }            #controlKit .panel .groupList .group .subGroupList .subGroup .wrap .wrap .wrap input[type='text'] {              padding: 0;              text-align: center; }        #controlKit .panel .groupList .group .subGroupList .subGroup .wrap {          background: #25282b; }        #controlKit .panel .groupList .group .subGroupList .subGroup .wrap .wrap {          background: none; }      #controlKit .panel .groupList .group .subGroupList .head .wrap, #controlKit .panel .groupList .group .subGroupList .headInactive .wrap {        background: none; }    #controlKit .panel .groupList .group:last-child .subGroupList, #controlKit .panel .groupList .group:last-child .scrollBuffer:nth-of-type(3) {      border-bottom: none; }    #controlKit .panel .groupList .group:last-child .scrollWrap .subGroupList {      border-bottom: 1px solid #1e2224; }    #controlKit .panel .wrapSlider {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      width: 70%;      padding: 6px 0 0 0;      float: right;      height: 100%; }      #controlKit .panel .wrapSlider input[type='text'] {        width: 25%;        text-align: center;        padding: 0;        float: right; }    #controlKit .panel .sliderWrap {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      float: left;      cursor: ew-resize;      width: 70%; }    #controlKit .panel .sliderSlot {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      width: 100%;      height: 25px;      padding: 3px;      background-color: #1e2224;      border: none;      box-shadow: 0 0 1px 2px rgba(0, 0, 0, 0.0125) inset, 0 0 1px 1px #111314 inset;      border-radius: 2px;      -moz-border-radius: 2px;      border-bottom: 1px solid #3b4447; }    #controlKit .panel .sliderHandle {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      position: relative;      width: 100%;      height: 100%;      background: #b32435;      background-image: -o-linear-gradient(rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.1) 100%);      background-image: linear-gradient(rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.1) 100%);      box-shadow: 0 1px 0 0 #0f0f0f; }    #controlKit .panel .canvasListItem, #controlKit .panel .svgListItem {      padding: 0 10px 0 10px; }    #controlKit .panel .arrowSMax {      background: url(data:image/png;base64,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) center no-repeat; }    #controlKit .panel .arrowSMin {      background: url(data:image/png;base64,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) center no-repeat; }    #controlKit .panel .arrowSMax, #controlKit .panel .arrowSMin {      width: 100%;      height: 20px; }    #controlKit .panel .arrowBMax {      background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAFCAYAAAB4ka1VAAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo+qi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt/87fOH4p3iC+N7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi/RNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z+pn5mZ2y6xlhbL+xW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a/zYnKOZarnivN7cyzytuQN5zvn//tEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1+1dT1gvWd+1YfqGnRs+FYmKrhTbF5cVf9go3HjlG4dvyr+Z3JS0qavEuWTPZtJm6ebeLZ5bDpaql+aXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO/PLi8ZafJzs07P1SkVPRU+lQ27tLdtWHX+G7R7ht7vPY07NXbW7z3/T7JvttVAVVN1WbVZftJ+7P3P66Jqun4lvttXa1ObXHtxwPSA/0HIw6217nU1R3SPVRSj9Yr60cOxx++/p3vdy0NNg1VjZzG4iNwRHnk6fcJ3/ceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w+0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb++6EHTh0kX/i+c7vDvOXPK4dPKy2+UTV7hXmq86X23qdOo8/pPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb/1tWeOT3dvfN6b/fF9/XfFt1+cif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v+3Njv3H9qwHeg89HcR/cGhYPP/pH1jw9DBY+Zj8uGDYbrnjg+OTniP3L96fynQ89kzyaeF/6i/suuFxYvfvjV69fO0ZjRoZfyl5O/bXyl/erA6xmv28bCxh6+yXgzMV70VvvtwXfcdx3vo98PT+R8IH8o/2j5sfVT0Kf7kxmTk/8EA5jz/GMzLdsAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAAADJJREFUeNpsysENACAMAzE29+jhAxKlPSmveK2aszEIMiHI7UflbChJfx+3AQAA//8DAPLkSamHastxAAAAAElFTkSuQmCC) center no-repeat; }    #controlKit .panel .arrowBMin {      background: url(data:image/png;base64,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) center no-repeat; }    #controlKit .panel .arrowBSubMax {      background: url(data:image/png;base64,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) center no-repeat; }    #controlKit .panel .arrowBSubMin {      background: url(data:image/png;base64,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) center no-repeat; }    #controlKit .panel .arrowBMax, #controlKit .panel .arrowBMin, #controlKit .panel .arrowBSubMax, #controlKit .panel .arrowBSubMin {      width: 10px;      height: 100%;      float: right; }  #controlKit .panel .label, #controlKit .picker .label {    width: 100%;    float: left;    font-size: 11px;    font-weight: bold;    text-shadow: 0 -1px black;    overflow: hidden;    white-space: nowrap;    text-overflow: ellipsis;    cursor: default; }  #controlKit .panel .head, #controlKit .picker .head, #controlKit .panel .panelHeadInactive {    height: 30px;    padding: 0 10px 0 10px;    background: #1a1d1f; }    #controlKit .panel .head .wrap, #controlKit .picker .head .wrap, #controlKit .panel .panelHeadInactive .wrap {      width: auto;      height: auto;      margin: 0;      padding: 0;      position: relative;      overflow: hidden; }  #controlKit .panel .head, #controlKit .picker .head {    border-top: 1px solid #202426;    border-bottom: 1px solid #111314; }    #controlKit .panel .head .label, #controlKit .picker .head .label {      cursor: pointer;      line-height: 30px;      color: #65696b; }  #controlKit .panel .panelHeadInactive {    border-top: 1px solid #202426; }  #controlKit .panel .menu, #controlKit .picker .menu {    float: right;    padding: 5px 0 0 0; }    #controlKit .panel .menu input[type='button'], #controlKit .picker .menu input[type='button'] {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      cursor: pointer;      height: 20px;      margin-left: 4px;      border: none;      border-radius: 2px;      -moz-border-radius: 2px;      font-family: arial, sans-serif;      font-size: 10px;      font-weight: bold;      color: #aaaaaa;      text-shadow: 0 -1px black;      text-transform: uppercase;      box-shadow: 0 0 0 1px #131313 inset, -1px 2px 0 0 #212527 inset;      border-bottom: 1px solid #24292b; }    #controlKit .panel .menu .btnHide, #controlKit .panel .menu .btnShow, #controlKit .panel .menu .btnClose, #controlKit .picker .menu .btnHide, #controlKit .picker .menu .btnShow, #controlKit .picker .menu .btnClose {      width: 20px; }    #controlKit .panel .menu .btnHide, #controlKit .picker .menu .btnHide {      background: url(data:image/png;base64,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) 50% 50% no-repeat, #1a1d1f; }      #controlKit .panel .menu .btnHide:hover, #controlKit .picker .menu .btnHide:hover {        background: url(data:image/png;base64,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) 50% 50% no-repeat, #111314;        box-shadow: 0 0 0 1px #131313 inset, -1px 2px 0 0 #121314 inset; }    #controlKit .panel .menu .btnShow, #controlKit .picker .menu .btnShow {      background: url(data:image/png;base64,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) 50% 50% no-repeat, #1a1d1f; }      #controlKit .panel .menu .btnShow:hover, #controlKit .picker .menu .btnShow:hover {        background: url(data:image/png;base64,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) 50% 50% no-repeat, #111314;        box-shadow: 0 0 0 1px #131313 inset, -1px 2px 0 0 #121314 inset; }    #controlKit .panel .menu .btnClose, #controlKit .picker .menu .btnClose {      background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAJCAYAAAAPU20uAAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo+qi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt/87fOH4p3iC+N7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi/RNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z+pn5mZ2y6xlhbL+xW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a/zYnKOZarnivN7cyzytuQN5zvn//tEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1+1dT1gvWd+1YfqGnRs+FYmKrhTbF5cVf9go3HjlG4dvyr+Z3JS0qavEuWTPZtJm6ebeLZ5bDpaql+aXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO/PLi8ZafJzs07P1SkVPRU+lQ27tLdtWHX+G7R7ht7vPY07NXbW7z3/T7JvttVAVVN1WbVZftJ+7P3P66Jqun4lvttXa1ObXHtxwPSA/0HIw6217nU1R3SPVRSj9Yr60cOxx++/p3vdy0NNg1VjZzG4iNwRHnk6fcJ3/ceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w+0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb++6EHTh0kX/i+c7vDvOXPK4dPKy2+UTV7hXmq86X23qdOo8/pPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb/1tWeOT3dvfN6b/fF9/XfFt1+cif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v+3Njv3H9qwHeg89HcR/cGhYPP/pH1jw9DBY+Zj8uGDYbrnjg+OTniP3L96fynQ89kzyaeF/6i/suuFxYvfvjV69fO0ZjRoZfyl5O/bXyl/erA6xmv28bCxh6+yXgzMV70VvvtwXfcdx3vo98PT+R8IH8o/2j5sfVT0Kf7kxmTk/8EA5jz/GMzLdsAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAAAQ1JREFUeNpM0D9LAmEAx/HvPXeDTqeXpVeYYjpYGQ1hBQ7SnxfQ0pA1FEVbr6FeRgZuCb2EoOCgm26spoIgiKBQQaIUnuceW27wt36HD/wMO+ncAna1Vl9jbIHvtYANa2lltYJhuIHvXVVr9ZMoHpXmFw/tpCOtWCx+L0xzv1heOA58Lw68pqdnzlNpl1DKNws40GH4kJrKXAphNgZ/v2TzBZSUbaAhIrLZ/f66m8y4zBaK/PT7XaABICLzbDgcbOkwJFQKPdITge+1AQw76dy42dxufq5EqFQLeBdCXPR6HV6eHz+M9fr2Z8JxXCVlEziNyD3Tsq6VksosV5Y3tdYdYGfshqeR1jkDI/E/AO8rYRlwXBquAAAAAElFTkSuQmCC) 50% 50% no-repeat, #1a1d1f; }      #controlKit .panel .menu .btnClose:hover, #controlKit .picker .menu .btnClose:hover {        background: url(data:image/png;base64,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) 50% 50% no-repeat, #111314;        box-shadow: 0 0 0 1px #131313 inset, -1px 2px 0 0 #121314 inset; }    #controlKit .panel .menu .btnUndo, #controlKit .picker .menu .btnUndo {      background: #1a1d1f 0%, #1a1d1f 100%, -o-linear-gradient(url(data:image/png;base64,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) 20% 50% no-repeat);      background: #1a1d1f 0%, #1a1d1f 100%, linear-gradient(url(data:image/png;base64,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) 20% 50% no-repeat);      padding: 0 6px 1px 0;      width: 38px;      vertical-align: top;      text-align: end; }      #controlKit .panel .menu .btnUndo:hover, #controlKit .picker .menu .btnUndo:hover {        background: url(data:image/png;base64,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) 20% 50% no-repeat, #111314; }  #controlKit .picker {    -webkit-box-sizing: border-box;    -moz-box-sizing: border-box;    box-sizing: border-box;    border-radius: 2px;    -moz-border-radius: 2px;    background-color: #303639;    font-family: arial, sans-serif;    font-size: 11px;    color: white;    text-shadow: 1px 1px black;    position: absolute;    z-index: 2147483631;    width: 360px;    -webkit-touch-callout: none;    -webkit-user-select: none;    -khtml-user-select: none;    -moz-user-select: none;    -ms-user-select: none;    user-select: none;    box-shadow: 0 0 1px 1px rgba(0, 0, 0, 0.25); }    #controlKit .picker canvas {      vertical-align: bottom;      cursor: pointer; }    #controlKit .picker .wrap {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      padding: 10px;      float: left; }    #controlKit .picker .fieldWrap {      padding: 3px; }    #controlKit .picker .sliderWrap {      padding: 3px 13px 3px 3px; }    #controlKit .picker .fieldWrap, #controlKit .picker .sliderWrap, #controlKit .picker .inputWrap {      height: auto;      overflow: hidden;      float: left; }    #controlKit .picker .inputWrap {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      border: 1px solid #1e2224;      border-radius: 2px;      -moz-border-radius: 2px;      box-shadow: 0 1px 0 0 #3b4447;      width: 140px;      float: right;      padding: 5px 10px 1px 0; }    #controlKit .picker .inputField {      width: 50%;      float: right;      margin-bottom: 4px; }      #controlKit .picker .inputField .label {        padding: 4px 0 0 0;        color: #878787;        text-align: center;        text-transform: uppercase;        font-weight: bold;        text-shadow: 1px 1px #1a1a1a;        width: 40%; }      #controlKit .picker .inputField .wrap {        padding: 0;        width: 60%;        height: auto;        float: right; }    #controlKit .picker .controlsWrap {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      width: 100%;      height: auto;      float: right;      padding: 9px 0 0 0; }      #controlKit .picker .controlsWrap input[type='button'] {        float: right;        width: 65px;        margin: 0 0 0 10px; }    #controlKit .picker .colorContrast {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      border: none;      box-shadow: 0 0 1px 2px rgba(0, 0, 0, 0.0125) inset, 0 0 1px 1px #111314 inset;      border-radius: 2px;      -moz-border-radius: 2px;      border-bottom: 1px solid #3b4447;      width: 100%;      height: 25px;      padding: 3px;      width: 80%;      margin-bottom: 4px;      float: right; }      #controlKit .picker .colorContrast div {        width: 50%;        height: 100%;        float: left; }    #controlKit .picker input[type='text'] {      padding: 0;      text-align: center;      width: 60%;      float: right; }    #controlKit .picker .wrap .inputWrap:nth-of-type(3) {      border-bottom-left-radius: 0;      border-bottom-right-radius: 0; }    #controlKit .picker .wrap .inputWrap:nth-of-type(4) {      border-top: none;      border-top-left-radius: 0;      border-top-right-radius: 0; }      #controlKit .picker .wrap .inputWrap:nth-of-type(4) .inputField {        width: 100%; }        #controlKit .picker .wrap .inputWrap:nth-of-type(4) .inputField .label {          width: 20%; }      #controlKit .picker .wrap .inputWrap:nth-of-type(4) input[type='text'] {        width: 80%; }    #controlKit .picker .fieldWrap, #controlKit .picker .sliderWrap {      background: #1e2224;      border: none;      box-shadow: 0 0 1px 2px rgba(0, 0, 0, 0.0125) inset, 0 0 1px 1px #111314 inset;      border-radius: 2px;      -moz-border-radius: 2px;      border-bottom: 1px solid #3b4447;      position: relative;      margin-right: 5px; }      #controlKit .picker .fieldWrap .indicator, #controlKit .picker .sliderWrap .indicator {        position: absolute;        border: 2px solid white;        box-shadow: 0 1px black, 0 1px black inset;        cursor: pointer; }    #controlKit .picker .fieldWrap .indicator {      width: 8px;      height: 8px;      left: 50%;      top: 50%;      border-radius: 50%;      -moz-border-radius: 50%; }    #controlKit .picker .sliderWrap .indicator {      width: 14px;      height: 3px;      border-radius: 8px;      -moz-border-radius: 8px;      left: 1px;      top: 1px; }      #controlKit .picker .sliderWrap .indicator:after {        content: "";        width: 0;        height: 0;        border-top: 4.5px solid transparent;        border-bottom: 4.5px solid transparent;        border-right: 4px solid white;        float: right;        position: absolute;        top: -2px;        left: 19px; }      #controlKit .picker .sliderWrap .indicator:before {        content: "";        width: 0;        height: 0;        border-top: 4.5px solid transparent;        border-bottom: 4.5px solid transparent;        border-right: 4px solid black;        float: right;        position: absolute;        top: -3px;        left: 19px; }  #controlKit .options {    -webkit-box-sizing: border-box;    -moz-box-sizing: border-box;    box-sizing: border-box;    border: 1px solid #131313;    border-radius: 2px;    -moz-border-radius: 2px;    position: absolute;    left: 0;    top: 0;    width: auto;    height: auto;    z-index: 2147483638;    font-family: arial, sans-serif;    font-size: 11px;    color: white;    text-shadow: 1px 1px black;    box-shadow: 0 1px 0 0 #566166 inset;    overflow: hidden;    background-color: #3c494e; }    #controlKit .options ul {      width: 100%;      list-style: none;      margin: 0;      padding: 0; }      #controlKit .options ul li {        margin: 0;        width: 100%;        height: 28px;        line-height: 28px;        padding: 0 20px 0 10px;        overflow: hidden;        white-space: normal;        text-overflow: ellipsis;        cursor: pointer; }        #controlKit .options ul li:hover {          background-color: #1f2325; }      #controlKit .options ul .liSelected {        background-color: #292d30; }    #controlKit .options .color {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box; }      #controlKit .options .color li, #controlKit .options .color .liSelected {        -webkit-box-sizing: border-box;        -moz-box-sizing: border-box;        box-sizing: border-box;        padding: 0;        height: 25px;        line-height: 25px;        text-align: center; }        #controlKit .options .color li:hover, #controlKit .options .color .liSelected:hover {          background: none;          font-weight: bold; }      #controlKit .options .color .liSelected {        font-weight: bold; }  ";