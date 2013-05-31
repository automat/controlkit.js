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
    VALUE_UPDATED          : 'valueUpdated',
    UPDATE_VALUE           : 'updateValue',

    SELECT_TRIGGERED       : 'selectTrigger',
    TRIGGER_SELECT         : 'triggerSelect',

    PANEL_MOVE_BEGIN       : 'panelMoveBegin',
    PANEL_MOVE             : 'panelMove',
    PANEL_MOVE_END         : 'panelMoveEnd',

    PANEL_SHOW             : 'panelShow',
    PANEL_HIDE             : 'panelHide',

    SUBGROUP_TRIGGER       : 'subGroupTrigger',

    COMPONENTS_ENABLE      : 'enableCompo',
    COMPONENTS_DISABLE     : 'disableComps',

    SUBGROUP_ENABLE        : 'enableSubGroup',
    SUBGROUP_DISABLE       : 'disableSubGroup',

    INDEX_ORDER_CHANGED    : 'indexOrderChanged',
    CHANGE_INDEX_ORDER     : 'changeIndexOrder',

    SCROLL_BEGIN           : 'scrollBegin',
    SCROLL                 : 'scroll',
    SCROLL_END             : 'scrollEnd',

    INPUT_SELECTDRAG_START : 'inputSelectDragStart',
    INPUT_SELECTDRAG       : 'inputSelectDrag',
    INPUT_SELECTDRAG_END   : 'inputSelectDragEnd',

    HISTORY_STATE_PUSH     : 'historyStatePush',
    HISTORY_STATE_POP      : 'historyStatePop',

    GROUP_SIZE_CHANGE     : 'groupSizeChange',
    GROUP_SIZE_UPDATE     : 'groupSizeUpdate',

    UPDATE_MENU            : 'updateMenu'
};

ControlKit.Constant =
{
    PADDING_WRAPPER : 12,
    PADDING_OPTIONS : 2,
    MIN_HEIGHT      : 25,
    MIN_WIDTH       : 100,

    PADDING_PRESET  : 20,

    SCROLLBAR_BTN_HEIGHT    : 17,
    SCROLLBAR_TRACK_PADDING : 2,

    HISTORY_MAX_STATES : 30,

    NUMBER_INPUT_SHIFT_MULTIPLIER : 10
};

ControlKit.History = function()
{
    ControlKit.EventDispatcher.apply(this,arguments);
    this._states = [];
};

ControlKit.History.prototype = Object.create(ControlKit.EventDispatcher.prototype);

/*---------------------------------------------------------------------------------*/

ControlKit.History.prototype.pushState = function(object,key,value)
{
    var states    = this._states,
        statesMax = ControlKit.Constant.HISTORY_MAX_STATES;

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

    /*-------------------------------------------------------------------------------------*/

    HeadInactive : 'headInactive',
    PanelHeadInactive : 'panelHeadInactive',

    /*-------------------------------------------------------------------------------------*/

    GroupList : 'groupList',
    Group     : 'group',
    SubGroupList  : 'subGroupList',
    SubGroup      : 'subGroup',


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

    /*-------------------------------------------------------------------------------------*/

    PresetBtn        : 'presetBtn',
    PresetBtnActive  : 'presetBtnActive',
    InputWPresetWrap : 'inputWPresetWrap',

    /*-------------------------------------------------------------------------------------*/


    CanvasListItem  : 'canvasListItem',
    CanvasWrap      : 'canvasWrap',

    /*-------------------------------------------------------------------------------------*/

    Picker : 'picker',
    PalleteWrap : 'palleteWrap',
    PaletteWrapInner :  'paletteWrapInner',

    /*-------------------------------------------------------------------------------------*/

    ScrollBar        : 'scrollBar',
    ScrollWrap       : 'scrollWrap',
    ScrollbarBtnUp   : 'btnUp',
    ScrollbarBtnDown : 'btnDown',
    ScrollbarTrack   : 'track',
    ScrollbarThumb   : 'thumb',
    ScrollBuffer     : 'scrollBuffer'
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

    setEventListener : function(event,func){this._element[event] = func; return this;},

    setStyleClass      : function(style)         {this._element.className = style; return this;},
    setStyleProperty   : function(property,value){this._element.style[property] = value; return this;},
    getStyleProperty   : function(property)      {return this._element.style[property];},
    setStyleProperties : function(properties)    {for(var p in properties)this._element.style[p] = properties[p];return this;},


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

ControlKit.Component = function(parent)
{
    ControlKit.EventDispatcher.apply(this,arguments);

    this._parent   = parent;
    this._disabled = false;

    var rootNode    = this._rootNode = new ControlKit.Node(ControlKit.NodeType.LIST_ITEM),
        lablNode    = this._lablNode = new ControlKit.Node(ControlKit.NodeType.SPAN),
        wrapNode    = this._wrapNode = new ControlKit.Node(ControlKit.NodeType.DIV);

    parent.addComponentRoot(rootNode);
    if(parent.hasLabel() && parent.getList().getNumChildren() == 1)
        rootNode.setStyleProperty('border-top','1px solid #303639');

    rootNode.addChild(lablNode);
    rootNode.addChild(wrapNode);

    lablNode.setStyleClass(ControlKit.CSS.Label);
    wrapNode.setStyleClass(ControlKit.CSS.Wrap);

    parent.addEventListener(ControlKit.EventType.COMPONENTS_ENABLE, this,'onEnable');
    parent.addEventListener(ControlKit.EventType.COMPONENTS_DISABLE,this,'onDisable');
};

ControlKit.Component.prototype = Object.create(ControlKit.EventDispatcher.prototype);

ControlKit.Component.prototype.enable     = function(){this._disabled = false;};
ControlKit.Component.prototype.disable    = function(){this._disabled = true; };

ControlKit.Component.prototype.isEnabled  = function(){return !this._disabled;};
ControlKit.Component.prototype.isDisabled = function(){return this._disabled};

ControlKit.Component.prototype.onEnable  = function(){this.enable();};
ControlKit.Component.prototype.onDisable = function(){this.disable();};


//Object bound component
ControlKit.ObjectComponent = function(parent,object,value,label)
{
    ControlKit.Component.apply(this,arguments);

    this._object   = object;
    this._key      = value;

    this._onChange = function(){};
    this._onFinish = function(){};

    this._lablNode.setProperty('innerHTML',label || '');

    var kit = ControlKit.getKitInstance();
    kit.addEventListener( ControlKit.EventType.UPDATE_VALUE, this,'onValueUpdate');

    this.addEventListener(ControlKit.EventType.VALUE_UPDATED,kit, 'onValueUpdated');
};

ControlKit.ObjectComponent.prototype = Object.create(ControlKit.Component.prototype);

//Override in Subclass
ControlKit.ObjectComponent.prototype.applyValue       = function(){};
ControlKit.ObjectComponent.prototype.pushHistoryState = function(){var obj = this._object,key = this._key;ControlKit.History.getInstance().pushState(obj,key,obj[key]);};
ControlKit.ObjectComponent.prototype.onValueUpdate    = function(e){};
ControlKit.ObjectComponent.prototype.setValue         = function(value){this._object[this._key] = value;};


//
//
// .
//
//  Created by henryk Wollik on 30.10.12.
//  Copyright (c) 2012 henryk Wollik. All rights reserved.
//
//


//TODO: MOVE TO CANVAS INTERNAL
ControlKit._InternalCanvasOptions = {};

ControlKit._InternalCanvasOptions.DEFAULT_WIDTH  = 300;
ControlKit._InternalCanvasOptions.DEFAULT_HEIGHT = 300;
ControlKit._InternalCanvasOptions.EMPTY_STYLE = 'rgba(0,0,0,0)';

ControlKit.Canvas = function(parentNode)
{
    this.parent = parentNode.getElement();
    this._size = {width: ControlKit._InternalCanvasOptions.DEFAULT_WIDTH ,
        height:ControlKit._InternalCanvasOptions.DEFAULT_HEIGHT};
    this._canvas = document.createElement('canvas');
    this._antialias    = true;
    this.setSize(ControlKit._InternalCanvasOptions.DEFAULT_WIDTH,
        ControlKit._InternalCanvasOptions.DEFAULT_HEIGHT);
    this.parent.appendChild(this._canvas);
    this.context = this._canvas.getContext('2d');

    this._fontProperties = {style:'', weight:'bold', size:20, family:'Arial'};
    this._textProperties = {lineHeight:1};
    this._applyFontStyle();

    this._pixelPerfect = true;

};

/*
 *
 *  Font
 *
 */

ControlKit.Canvas.FONT_STYLE_NON_ITALIC = '';
ControlKit.Canvas.FONT_STYLE_ITALIC = 'italic';
ControlKit.Canvas.FONT_WEIGHT_REGULAR = 'normal';
ControlKit.Canvas.FONT_WEIGHT_BOLD = 'bold';

/*
 *
 *  Text
 *
 */

ControlKit.Canvas.TEXT_BASELINE_BOTTOM = 'bottom';
ControlKit.Canvas.TEXT_BASELINE_TOP = 'top';
ControlKit.Canvas.TEXT_BASELINE_MIDDLE = 'middle';

ControlKit.Canvas.TEXT_ALIGN_START = 'start';
ControlKit.Canvas.TEXT_ALIGN_END = 'end';
ControlKit.Canvas.TEXT_ALIGN_LEFT = 'left';
ControlKit.Canvas.TEXT_ALIGN_RIGHT = 'right';
ControlKit.Canvas.TEXT_ALIGN_CENTER = 'center';

/*
 *
 *  Convenience wrapper for canvas
 *
 */

ControlKit.Canvas.prototype.setPixelPerfect = function(bool)
{
    this._pixelPerfect = bool;
};

ControlKit.Canvas.prototype.setAntialias = function(bool)
{
    this._antialias = bool;

    this.setSize(this._size.width,this._size.height);
};


/**
 * Sets the font style
 *
 * @param {Object} style The style (reg...) of the font
 *
 */

ControlKit.Canvas.prototype.setFontStyle = function (style)
{
    this._fontProperties.style = style;
    this._applyFontStyle();
};

/**
 * Sets the font weight
 *
 * @param {Object} weight The weight (bold,normal) of the font
 *
 */


ControlKit.Canvas.prototype.setFontWeight = function (weight)
{
    this._fontProperties.weight = weight;
    this._applyFontStyle();
};

/**
 * Sets the font size
 *
 * @param {Number} size The size of the font
 *
 */

ControlKit.Canvas.prototype.setFontSize = function (size)
{
    this._fontProperties.size = size;
    this._applyFontStyle();
};

/**
 * Sets the font family
 *
 * @param {String} family The font family
 *
 */

ControlKit.Canvas.prototype.setFontFamily = function (family)
{
    this._fontProperties.family = family;



    this._applyFontStyle();
};

/**
 * Sets the font properties
 *
 * @param {Object} fontProperties The font properties in an object
 *
 */

ControlKit.Canvas.prototype.setFontProperties = function (fontProperties)
{
    for (var p in fontProperties)
    {
        this._fontProperties[p] = fontProperties[p];
    }

    this._applyFontStyle();
};

/**
 * Internal - Applies the font style
 */

ControlKit.Canvas.prototype._applyFontStyle = function ()
{
    this.context.font = this._fontProperties.weight + " " +
        this._fontProperties.size + "px " +
        this._fontProperties.family;
};



ControlKit.Canvas.prototype.setTextBaseLine = function (textBaseLine)
{
    this.context.textBaseline = textBaseLine;
};

ControlKit.Canvas.prototype.setTextAlign = function (textAlign)
{
    this.context.textAlign = textAlign;
};

ControlKit.Canvas.prototype.setTextLineHeight = function(lineHeight)
{
    this._textProperties.lineHeight = lineHeight;

};

ControlKit.Canvas.prototype.text = function (string, x, y)
{
    this.context.fillText(string, Math.round(x) - 0.5, Math.round(y) - 0.5);
};

ControlKit.Canvas.prototype.textWrap = function(string,x,y,width,height)
{
    var ctx = this.context;
    var lines   = this._wrapText(string,width - ctx.measureText('A').width);
    var size    = this._fontProperties.size;
    var lHeight = this._textProperties.lineHeight;
    var cHeight = 0;
    var rHeight = 0;
    lines.forEach(function(line,i){cHeight=i*size*lHeight;rHeight+=cHeight;ctx.fillText(line,x,y+cHeight);});

    return rHeight*0.5;
};

ControlKit.Canvas.prototype.textWrapWithBackgroundColor = function(string,x,y,width,height,textColor,backColor)
{
    var ctx = this.context;
    var lines   = this._wrapText(string,width - ctx.measureText('A').width);
    var size    = this._fontProperties.size;
    var lHeight = this._textProperties.lineHeight;
    var cHeight = 0;
    var rHeight = 0;
    lines.forEach(function (line, i)
    {
        ctx.fillStyle = backColor;
        cHeight = i * size * lHeight;
        rHeight += cHeight;
        ctx.fillRect(x, y, ctx.measureText(line).width, cHeight);
        ctx.fillStyle = textColor;
        ctx.fillText(line, x, y + cHeight);
    });

    return rHeight*0.5;
};


ControlKit.Canvas.prototype.getTextWidth = function (string)
{
    var metrics = this.context.measureText(string);
    return metrics.width;
};

ControlKit.Canvas.prototype.getTextHeight = function ()
{
    return this._fontProperties.size;
};

ControlKit.Canvas.prototype.getTextWidth = function (string)
{
    return this.context.measureText(string).width;
};

ControlKit.Canvas.prototype._wrapText = function(text, maxWidth) {

    var ctx = this.context;

    var words = text.split(' '),
        lines = [],
        line = "";
    if (ctx.measureText(text).width < maxWidth) {
        return [text];
    }
    while (words.length > 0) {
        while (ctx.measureText(words[0]).width >= maxWidth) {
            var tmp = words[0];
            words[0] = tmp.slice(0, -1);
            if (words.length > 1) {
                words[1] = tmp.slice(-1) + words[1];
            } else {
                words.push(tmp.slice(-1));
            }
        }
        if (ctx.measureText(line + words[0]).width < maxWidth) {
            line += words.shift() + " ";
        } else {
            lines.push(line);
            line = "";
        }
        if (words.length === 0) {
            lines.push(line);
        }
    }
    return lines;
};



ControlKit.Canvas.prototype.getSize = function ()
{
    return {width:this._size.width, height:this._size.height};
};

/**
 * Resize the canvas to given width and height
 *
 * @param {Number} width  The width
 * @param {Number} height The height
 *
 */

ControlKit.Canvas.prototype.setSize = function (width, height)
{
    this._size.width = width;
    this._size.height = height;

    this._canvas.style.width = this._size.width + 'px';
    this._canvas.style.height = this._size.height + 'px';

    var styleWidth  = parseInt(this._canvas.style.width);
    var styleHeight = parseInt(this._canvas.style.height);

    this._canvas.width  = styleWidth;
    this._canvas.height = styleHeight;

    if(this._antialias)
    {
        this._canvas.width  *= 2;
        this._canvas.height *= 2;

        this._canvas.getContext('2d').scale(2, 2);
    }

    this.width = this._size.width;
    this.height = this._size.height;
};

/**
 * Get the canvas 2d context
 *
 * @returns {Object} The context
 *
 */

ControlKit.Canvas.prototype.getContext = function ()
{
    return this.context;
};

ControlKit.Canvas.prototype.getElement = function()
{
    return this._canvas;
};

ControlKit.Canvas.prototype.clear = function()
{
    this.context.clearRect(0,0,this.width,this.height);
};

ControlKit.Canvas.prototype.background = function()
{
    this.context.fillStyle = ControlKit.color.apply(this,arguments);
    this.noStroke();
    this.rect(0,0,this.width,this.height);

    this.applyFill();
};

/**
 * Draws a line between two points
 *
 * @param {Number} x0 X value of point 1
 * @param {Number} y0 y value of point 1
 * @param {Number} x1 X value of point 2
 * @param {Number} y1 y value of point 2
 *
 */

ControlKit.Canvas.prototype.line = function (x0, y0, x1, y1)
{

    var ctx = this.context;

    ctx.beginPath();
    ctx.moveTo(Math.round(x0), Math.round(y0));
    ctx.lineTo(Math.round(x1), Math.round(y1));
    ctx.closePath();
    this.applyStroke();

};

/**
 * Draws a line between points
 *
 * @param {Array} array The collection of points in format [[x,y],...]
 *
 */

ControlKit.Canvas.prototype.lineArray = function (array)
{
    var ctx = this.context;
    var i = 2;

    ctx.beginPath();
    ctx.moveTo(array[0], array[1]);
    while (i < array.length)
    {
        ctx.lineTo(array[i], array[i+1]);
        i+=2;
    }

    this.applyStroke();
};

/**
 * Draws a polygon from points
 *
 * @param {Array} array The collection of points in format [[x,y],...]
 *
 */

ControlKit.Canvas.prototype.polygon = function (array)
{
    var ctx = this.context;
    var i = 0;

    ctx.beginPath();
    ctx.moveTo(array[0][0], array[0][1]);
    while (++i < array.length)
    {
        ctx.lineTo(array[i][0], array[i][1]);
    }
    ctx.moveTo(array[array.length - 1][0], array[array.length - 1][1]);
    ctx.closePath();
    this.applyStroke();
    this.applyFill();
};

/**
 * Draws a circle
 *
 * @param {Number} x X value of the center point
 * @param {Number} y Y value of the center point
 * @param {Number} radius Radius of the circle
 *
 */

ControlKit.Canvas.prototype.circle = function (x, y, radius)
{
    var ctx = this.context;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2, true);
    ctx.closePath();

    this.applyStroke();
    this.applyFill();
};

/**
 * Draws a Rectangle
 *
 * @param {Number} x X value of the upper left point
 * @param {Number} y Y value of the upper left point
 * @param {Number} width  Width  of the rectangle
 * @param {Number} height Height of the rectangle
 *
 */


ControlKit.Canvas.prototype.rect = function (x, y, width, height)
{
    var ctx = this.context;

    ctx.fillRect(Math.round(x) - 0.5, Math.round(y) - 0.5, width, height);
    ctx.strokeRect(Math.round(x), Math.round(y), width, height);
};

ControlKit.Canvas.prototype.point = function (x, y)
{
    var ctx = this.context;

    if(this._pixelPerfect)
    {
        ctx.fillRect(Math.round(x) - 0.5, Math.round(y) - 0.5, 1, 1);
    }
    else if(!this._pixelPerfect)
    {
        ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
    }


    //ctx.strokeRect(Math.round(x), Math.round(y), 1, 1);
};

/*
 *
 *  Context Tools
 *
 */

ControlKit.Canvas.POINT_HALF_FLOAT = {x:0.5, y:0.5};

/**
 * Pushes a new state
 */

ControlKit.Canvas.prototype.push = function ()
{
    this.context.save();
};

/**
 * Pops a new states, restores the old state
 *
 */

ControlKit.Canvas.prototype.pop = function ()
{
    this.context.restore();
};

ControlKit.Canvas.prototype.translate = function (x, y)
{
    this.context.translate(x, y);
};

ControlKit.Canvas.prototype.rotate = function(angle)
{
    this.context.rotate(angle);
};

ControlKit.Canvas.prototype.translateHalfFloat = function()
{
    this.context.translate(ControlKit.Canvas.POINT_HALF_FLOAT.x,ControlKit.Canvas.POINT_HALF_FLOAT.y);
};

ControlKit.Canvas.prototype.scale = function (s)
{
    this.context.scale(s);
};

ControlKit.Canvas.prototype.applyFill = function ()
{
    this.context.fill();
};

ControlKit.Canvas.prototype.fill = function ()
{
    this.context.fillStyle = ControlKit.color.apply(this,arguments) || this.context.fillStyle;
};

ControlKit.Canvas.prototype.noFill = function ()
{
    this.context.fillStyle = ControlKit._InternalCanvasOptions.EMPTY_STYLE;
};

ControlKit.Canvas.prototype.applyStroke = function ()
{
    this.context.stroke();
};

/**
 * Draws a Rectangle
 *
 * @param {Number} strokeStyle X value of the upper left point
 *
 */

ControlKit.Canvas.prototype.stroke = function (strokeStyle)
{
    this.context.strokeStyle = ControlKit.color.apply(this,arguments) || this.context.strokeStyle;
};


ControlKit.Canvas.prototype.setLineWidth = function(value)
{
    this.context.lineWidth = value;
};

/**
 * Sets stroke to empty
 */

ControlKit.Canvas.prototype.noStroke = function ()
{
    this.context.strokeStyle = ControlKit._InternalCanvasOptions.EMPTY_STYLE ;
};

/**
 * Opens the image data in a new window
 *
 */

ControlKit.Canvas.prototype.saveToPNG = function()
{
    var canvas =

        window.open(this._canvas.toDataURL('image/png'));
};

ControlKit.color = function()
{
    var r, g, b, a = 1.0;
    var s = 'rgba';

    switch (arguments.length)
    {
        case 1:
            r = g = b = arguments[0];
            break;
        case 2:
            r = g = b = arguments[0];
            a = arguments[1];
            break;
        case 3:
            r = arguments[0];
            g = arguments[1];
            b = arguments[2];
            break;
        case 4:
            r = arguments[0];
            g = arguments[1];
            b = arguments[2];
            a = arguments[3];
            break;
    }

    return s + '(' + r + ',' + g + ',' + b + ',' + a + ')';
}

ControlKit.CanvasComponent = function(parent,object,value,label)
{
    ControlKit.ObjectComponent.apply(this,arguments);

    this._rootNode.setStyleClass(ControlKit.CSS.CanvasListItem);
    var wrapNode = this._wrapNode.setStyleClass(ControlKit.CSS.CanvasWrap);

    var canvas = this._canvas = new ControlKit.Canvas(wrapNode);
    canvas.setAntialias(false);
    canvas.setSize(wrapNode.getWidth(),wrapNode.getWidth());

    canvas.setFontFamily('Arial');
    canvas.setFontSize(10);

    this._canvasNode = ControlKit.Node.getNodeByElement(canvas.getElement());

    this._updateHeight();

    parent.addEventListener(ControlKit.EventType.GROUP_SIZE_CHANGE,this,  'onGroupSizeChange');
    this.addEventListener(  ControlKit.EventType.GROUP_SIZE_UPDATE,parent,'onGroupSizeUpdate');
};

ControlKit.CanvasComponent.prototype = Object.create(ControlKit.ObjectComponent.prototype);

ControlKit.CanvasComponent.prototype._updateHeight = function()
{
    var canvasHeight = this._canvas.height;

    this._wrapNode.setHeight(canvasHeight);
    this._rootNode.setHeight(canvasHeight + ControlKit.Constant.PADDING_WRAPPER);
};

ControlKit.CanvasComponent.prototype._redraw = function(){};

ControlKit.CanvasComponent.prototype.onGroupSizeChange = function()
{
    var wrapNodeWidth = this._wrapNode.getWidth();
    this._canvas.setSize(wrapNodeWidth,wrapNodeWidth);
    this._updateHeight();
    this._redraw();

    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.GROUP_SIZE_UPDATE,null));
};

//TODO: Add mouseoffset
ControlKit.ScrollBar = function(parentNode,targetNode,wrapHeight)
{
    this._wrapHeight = wrapHeight;
    this._targetNode = targetNode;

    var wrap   = this._wrapNode   = new ControlKit.Node(ControlKit.NodeType.DIV),
        node   = this._rootNode   = new ControlKit.Node(ControlKit.NodeType.DIV),
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

    thumb.setPositionY(ControlKit.Constant.SCROLLBAR_TRACK_PADDING);
    thumb.setEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onThumbDragStart.bind(this));

    this._isValid  = false;
    this._disabled = false;
};

ControlKit.ScrollBar.prototype =
{
    update : function()
    {
        var target  = this._targetNode,
            thumb   = this._thumbNode;

        var padding = ControlKit.Constant.SCROLLBAR_TRACK_PADDING;

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
        if(!this._isValid || this._disabled)return;

        var eventMouseMove = ControlKit.DocumentEventType.MOUSE_MOVE,
            eventMouseUp   = ControlKit.DocumentEventType.MOUSE_UP;

        var self = this;

        var mouse = ControlKit.Mouse.getInstance();

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

    enable  : function(){this._disabled = false;this._updateAppearance();},
    disable : function(){this._disabled = true; this._updateAppearance();},

    _updateAppearance : function()
    {
        if(this._disabled)
        {
            this._rootNode.setStyleProperty('display','none');
            this._targetNode.setPositionY(0);
            this._thumbNode.setPositionY(ControlKit.Constant.SCROLLBAR_TRACK_PADDING);
        }
        else
        {
            this._rootNode.setStyleProperty('display','block');
        }
    },

    isValid : function(){return this._isValid;}
};

ControlKit.AbstractGroup = function(parent,params)
{
    ControlKit.EventDispatcher.apply(this,arguments);

    this._parent = parent;

    /*---------------------------------------------------------------------------------*/

    var rootNode = this._rootNode = new ControlKit.Node(ControlKit.NodeType.LIST_ITEM),
        wrapNode = this._wrapNode = new ControlKit.Node(ControlKit.NodeType.DIV),
        listNode = this._listNode = new ControlKit.Node(ControlKit.NodeType.LIST);

    /*---------------------------------------------------------------------------------*/

    this._parent.getList().addChild(rootNode);

    /*---------------------------------------------------------------------------------z*/

    this._height = null;
    this._disabled  = false;

    /*---------------------------------------------------------------------------------*/
};

ControlKit.AbstractGroup.prototype = Object.create(ControlKit.EventDispatcher.prototype);

//Override in subclass
ControlKit.AbstractGroup.prototype.set = function(label,params){};

/*---------------------------------------------------------------------------------*/

ControlKit.AbstractGroup.prototype._onHeadDragStart  = function(){};
ControlKit.AbstractGroup.prototype._updateAppearance = function(){};

/*---------------------------------------------------------------------------------*/

ControlKit.AbstractGroup.prototype.disable         = function() {this._disabled = false; this._updateAppearance();};
ControlKit.AbstractGroup.prototype.enable         = function() {this._disabled = true;  this._updateAppearance();};
ControlKit.AbstractGroup.prototype.isDisabled   = function() {return this._disabled;};
ControlKit.AbstractGroup.prototype.isEnabled    = function() {return !this._disabled;};


ControlKit.AbstractGroup.prototype.getMaxHeight = function() {return this._height;};


/*---------------------------------------------------------------------------------*/

/*
 ControlKit.AbstractGroup.prototype.onSelectDragStart = function(e){this.scrollTo(this._scrollV);};
 ControlKit.AbstractGroup.prototype.onSelectDrag      = function(e){this.scrollTo(this._scrollV);};
 ControlKit.AbstractGroup.prototype.onSelectDragEnd   = function(e){this.scrollTo(this._scrollV);};
 */

/*---------------------------------------------------------------------------------*/

ControlKit.AbstractGroup.prototype.onComponentAdded = function()
{
    if(!this._height)return;
    this._scrollbar._update();
};

/*---------------------------------------------------------------------------------*/

ControlKit.AbstractGroup.prototype.getList      = function(){return this._listNode;};

ControlKit.Group = function(parent,params)
{
    ControlKit.AbstractGroup.apply(this,arguments);

    /*-------------------------------------------------------------------------------------*/

    params = params || {};

    /*-------------------------------------------------------------------------------------*/

    var rootNode = this._rootNode.setStyleClass(ControlKit.CSS.Group),
        wrapNode = this._wrapNode.setStyleClass(ControlKit.CSS.Wrap),
        listNode = this._listNode.setStyleClass(ControlKit.CSS.SubGroupList);

    //TODO: FIX ORDER!!!*_*
    wrapNode.addChild(listNode);
    this.set(params);
    rootNode.addChild(wrapNode);
    this._setBuffer(params);

    /*-------------------------------------_collapsed-----------------------------------------*/

    this._components = [];
    this._subGroups  = [];

    /*-------------------------------------------------------------------------------------*/

    this._subGroupsInit = false;
    this._subGroups.push(new ControlKit.SubGroup(this,'',null));

    /*-------------------------------------------------------------------------------------*/

    parent.addEventListener(ControlKit.EventType.PANEL_MOVE_BEGIN,this,'onPanelMoveBegin');
    parent.addEventListener(ControlKit.EventType.PANEL_MOVE,      this,'onPanelMove');
    parent.addEventListener(ControlKit.EventType.PANEL_MOVE_END,  this,'onPanelMoveEnd');
    parent.addEventListener(ControlKit.EventType.PANEL_HIDE,      this,'onPanelHide');
    parent.addEventListener(ControlKit.EventType.PANEL_SHOW,      this,'onPanelShow');

};

ControlKit.Group.prototype = Object.create(ControlKit.AbstractGroup.prototype);

/*-------------------------------------------------------------------------------------*/

ControlKit.Group.prototype.set = function(params)
{
    /*-------------------------------------------------------------------------------------*/

    params.label     = params.label     || null;
    params.useLabels = params.useLabels || true;
    params.enable      = params.enable === undefined ? true : params.enable;

    /*-------------------------------------------------------------------------------------*/

    if(params.label)
    {
        var headNode  = new ControlKit.Node(ControlKit.NodeType.DIV),
            lablWrap  = new ControlKit.Node(ControlKit.NodeType.DIV),
            lablNode  = new ControlKit.Node(ControlKit.NodeType.SPAN),
            indiNode  = this._indiNode = new ControlKit.Node(ControlKit.NodeType.DIV);

        headNode.setStyleClass(ControlKit.CSS.Head);
        lablWrap.setStyleClass(ControlKit.CSS.Wrap);
        lablNode.setStyleClass(ControlKit.CSS.Label);
        indiNode.setStyleClass(ControlKit.CSS.ArrowBMax);
        lablNode.setProperty('innerHTML',params.label);

        headNode.addChild(indiNode);
        lablWrap.addChild(lablNode);
        headNode.addChild(lablWrap);

        headNode.setEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onHeadDragStart.bind(this));

        this._rootNode.addChild(headNode);

        if(!params.enable)this.disable();
    }
    else
    {
        //TODO: Add CSS Class
        if(!params.maxHeight)this._wrapNode.getStyle().borderTop = "1px solid #3b4447";
    }

    /*-------------------------------------------------------------------------------------*/

    if(params.maxHeight)
    {
        var maxHeight = this._height = params.maxHeight,
            wrapNode  = this._wrapNode;

        if(this.isEnabled())wrapNode.setHeight(maxHeight);
        this._scrollbar  = new ControlKit.ScrollBar(wrapNode,this._listNode,maxHeight);
    }
};

//TODO: Rethink
ControlKit.Group.prototype._setBuffer = function(params)
{
    if(!params.maxHeight)return;

    var rootNode = this._rootNode,
        style    = ControlKit.CSS.ScrollBuffer;

    if(!params.label)
    {
        var bufferTop = this._scrollBufferTop = new ControlKit.Node(ControlKit.NodeType.DIV);
        bufferTop.setStyleClass(style);
        rootNode.addChildAt(bufferTop,0);
    }

    var bufferBottom = this._scrollBufferBottom = new ControlKit.Node(ControlKit.NodeType.DIV);
    bufferBottom.setStyleClass(style);
    rootNode.addChild(bufferBottom);
};

/*-------------------------------------------------------------------------------------*/

ControlKit.Group.prototype.onPanelMoveBegin = function(){this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.PANEL_MOVE_BEGIN,null));};
ControlKit.Group.prototype.onPanelMove      = function(){this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.PANEL_MOVE,      null))};
ControlKit.Group.prototype.onPanelMoveEnd   = function(){this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.PANEL_MOVE_END,  null))};

ControlKit.Group.prototype.onPanelHide      = function(){this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.SUBGROUP_DISABLE,null));};
ControlKit.Group.prototype.onPanelShow      = function(){this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.SUBGROUP_ENABLE, null));};

/*-------------------------------------------------------------------------------------*/

ControlKit.Group.prototype.onSubGroupTrigger = function()
{
    this._updateHeight();
    if(!this._height)return;
    this._updateScrollBar();
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.GROUP_SIZE_CHANGE,null));
};

ControlKit.Group.prototype._updateScrollBar = function()
{
    var scrollbar = this._scrollbar,
        wrapNode  = this._wrapNode;

    var bufferTop    = this._scrollBufferTop,
        bufferBottom = this._scrollBufferBottom;

    scrollbar.update();

    if(!scrollbar.isValid())
    {
        scrollbar.disable();
        wrapNode.setHeight(wrapNode.getChildAt(1).getHeight());

        if(bufferTop   )bufferTop.setStyleProperty(   'display','none');
        if(bufferBottom)bufferBottom.setStyleProperty('display','none');
    }
    else
    {
        scrollbar.enable();
        wrapNode.setHeight(this._height);

        if(bufferTop   )bufferTop.setStyleProperty(   'display','block');
        if(bufferBottom)bufferBottom.setStyleProperty('display','block');
    }

};

/*-------------------------------------------------------------------------------------*/

ControlKit.Group.prototype._onHeadDragStart   = function(){this._disabled = !this._disabled;this._updateAppearance();};

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

    if(this._height)this._scrollbar.update();
};

/*----------------------------------------------------------collapsed---------------------*/

ControlKit.Group.prototype._updateAppearance = function()
{
    var wrapNode = this._wrapNode,
        inidNode = this._indiNode;

    var bufferTop    = this._scrollBufferTop,
        bufferBottom = this._scrollBufferBottom;

    var scrollbar    = this._scrollbar;

    if(this.isDisabled())
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
        var maxHeight = this._height,
            listHeight;

        if(maxHeight)
        {
            listHeight = wrapNode.getChildAt(1).getHeight();
            wrapNode.setHeight(listHeight < maxHeight ? listHeight : maxHeight);
        }
        else
        {
            listHeight = wrapNode.getFirstChild().getHeight();
            wrapNode.setHeight(listHeight);
        }

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

ControlKit.Group.prototype.onGroupSizeUpdate = function(){this._updateAppearance();this._scrollbar.update();};

/*-------------------------------------------------------------------------------------*/

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

ControlKit.Group.prototype.getSubGroup = function(){var subGroups = this._subGroups;return subGroups[subGroups.length-1];};

/*-------------------------------------------------------------------------------------*/

ControlKit.Group.prototype.getComponents = function(){return this._components;};

ControlKit.SubGroup = function(parent,params)
{
    ControlKit.AbstractGroup.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    this._rootNode.setStyleClass(ControlKit.CSS.SubGroup);
    this._wrapNode.setStyleClass(ControlKit.CSS.Wrap);

    this._wrapNode.addChild(this._listNode);
    this._rootNode.addChild(this._wrapNode);

    /*-------------------------------------------------------------------------------------*/

    this._components = [];

    this.set(params);

    parent.addEventListener(ControlKit.EventType.PANEL_MOVE_END,   this,  'onPanelMoveEnd');
    parent.addEventListener(ControlKit.EventType.GROUP_SIZE_CHANGE,this,  'onGroupSizeChange');
    this.addEventListener(  ControlKit.EventType.GROUP_SIZE_UPDATE,parent,'onGroupSizeUpdate');
};

ControlKit.SubGroup.prototype = Object.create(ControlKit.AbstractGroup.prototype);

/*-------------------------------------------------------------------------------------*/

ControlKit.SubGroup.prototype.set = function(params)
{
    /*-------------------------------------------------------------------------------------*/

    params           = params || {};
    params.enable    = params.enable === undefined ? true : params.enable;
    params.label     = params.label     || null;
    params.maxHeight = params.maxHeight || null;

    var parent = this._parent;

    /*-------------------------------------------------------------------------------------*/

    if(params.label && params.label.length!=0 )
    {
        var headNode = this._headNode = new ControlKit.Node(ControlKit.NodeType.DIV),
            lablWrap =                  new ControlKit.Node(ControlKit.NodeType.DIV),
            lablNode =                  new ControlKit.Node(ControlKit.NodeType.SPAN),
            indiNode = this._indiNode = new ControlKit.Node(ControlKit.NodeType.DIV);

        headNode.setStyleClass(ControlKit.CSS.Head);
        lablWrap.setStyleClass(ControlKit.CSS.Wrap);
        lablNode.setStyleClass(ControlKit.CSS.Label);
        indiNode.setStyleClass(ControlKit.CSS.ArrowBSubMax);

        lablNode.setProperty('innerHTML',params.label);

        headNode.addChild(indiNode);
        lablWrap.addChild(lablNode);
        headNode.addChild(lablWrap);

        headNode.setEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onHeadDragStart.bind(this));

        this.addEventListener(ControlKit.EventType.SUBGROUP_TRIGGER,parent,'onSubGroupTrigger');

        this._rootNode.addChildAt(headNode,0);

        if(!params.enable)this.disable();
    }

    /*-------------------------------------------------------------------------------------*/

    if(params.maxHeight)
    {
        var maxHeight = this._height = params.maxHeight,
            wrapNode  = this._wrapNode;

        if(!this._disabled)wrapNode.setHeight(maxHeight);

        this._scrollbar  = new ControlKit.ScrollBar(wrapNode,this._listNode,maxHeight);
    }

    parent.addEventListener(ControlKit.EventType.SUBGROUP_ENABLE,  this, 'onEnable');
    parent.addEventListener(ControlKit.EventType.SUBGROUP_DISABLE, this, 'onDisable');
};

/*-------------------------------------------------------------------------------------*/

ControlKit.SubGroup.prototype._onHeadDragStart = function()
{
    this._disabled = !this._disabled;this._updateAppearance();
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.SUBGROUP_TRIGGER,null));
};

ControlKit.SubGroup.prototype._updateAppearance = function()
{
    if(this.isDisabled())
    {
        this._wrapNode.setHeight(0);
        this._headNode.setStyleClass(ControlKit.CSS.HeadInactive);
        this._indiNode.setStyleClass(ControlKit.CSS.ArrowBSubMin);
    }
    else
    {
        var maxHeight = this._height;

        this._wrapNode.setHeight(maxHeight ? maxHeight : this._wrapNode.getFirstChild().getHeight());
        this._headNode.setStyleClass(ControlKit.CSS.Head);
        this._indiNode.setStyleClass(ControlKit.CSS.ArrowBSubMax);
    }
};

ControlKit.SubGroup.prototype.update = function()
{
    if(!this._height)return;
    this._scrollbar.update();
};

ControlKit.SubGroup.prototype.onEnable  = function(){if(this.isDisabled())return;this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.COMPONENTS_ENABLE, null));};
ControlKit.SubGroup.prototype.onDisable = function(){if(this.isDisabled())return;this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.COMPONENTS_DISABLE,null));};

/*-------------------------------------------------------------------------------------*/

//bubble
ControlKit.SubGroup.prototype.onGroupSizeChange = function(){this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.GROUP_SIZE_CHANGE,null));};
ControlKit.SubGroup.prototype.onGroupSizeUpdate = function(){this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.GROUP_SIZE_UPDATE,null));};

/*-------------------------------------------------------------------------------------*/

ControlKit.SubGroup.prototype.hasLabel         = function()    {return this._headNode != null;};
ControlKit.SubGroup.prototype.addComponentRoot = function(node){this._listNode.addChild(node);};

/*-------------------------------------------------------------------------------------*/

ControlKit.SubGroup.prototype.onPanelMoveEnd    = function(){this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.PANEL_MOVE_END,   null));};


ControlKit.Default =
{
    POSITION  : [0,0],
    WIDTH     : 300,
    WIDTH_MIN : 150,
    WIDTH_MAX : 600,
    RATIO     : 40,
    LABEL     : 'Control Panel',

    VALIGN : ControlKit.Layout.ALIGN_TOP,
    ALIGN  : ControlKit.Layout.ALIGN_RIGHT,

    FIXED : true
};

ControlKit.Panel = function(controlKit,params)
{
    ControlKit.EventDispatcher.apply(this,arguments);

    var parent = this._parent = controlKit;

    /*---------------------------------------------------------------------------------*/

    params            = params           || {};
    params.valign     = params.valign    || ControlKit.Default.VALIGN;
    params.align      = params.align     || ControlKit.Default.ALIGN;
    params.position   = params.position  || ControlKit.Default.POSITION;
    params.width      = params.width     || ControlKit.Default.WIDTH;
    params.maxHeight  = params.maxHeight || window.innerHeight;
    params.ratio      = params.ratio     || ControlKit.Default.RATIO;
    params.label      = params.label     || ControlKit.Default.LABEL;

    params.fixed      = params.fixed === undefined ?
        ControlKit.Default.FIXED :
        params.fixed;

    /*---------------------------------------------------------------------------------*/

    var align     = this._align     = params.align;
    var maxHeight = this._height = params.maxHeight;
    var width     = this._width     = Math.max(ControlKit.Default.WIDTH_MIN,
        Math.min(params.width,ControlKit.Default.WIDTH_MAX));
    var fixed     = this._fixed     = params.fixed;

    /*---------------------------------------------------------------------------------*/

    var rootNode  = this._rootNode = new ControlKit.Node(ControlKit.NodeType.DIV),
        headNode  = this._headNode = new ControlKit.Node(ControlKit.NodeType.DIV),
        lablWrap  =                  new ControlKit.Node(ControlKit.NodeType.DIV),
        lablNode  =                  new ControlKit.Node(ControlKit.NodeType.SPAN),
        menuNode  = this._menuNode = new ControlKit.Node(ControlKit.NodeType.DIV),
        wrapNode  = this._wrapNode = new ControlKit.Node(ControlKit.NodeType.DIV),
        listNode  = this._listNode = new ControlKit.Node(ControlKit.NodeType.LIST);

    var menuClose =                  new ControlKit.Node(ControlKit.NodeType.INPUT_BUTTON),
        menuHide  = this._menuHide = new ControlKit.Node(ControlKit.NodeType.INPUT_BUTTON),
        menuUndo  = this._menuUndo = new ControlKit.Node(ControlKit.NodeType.INPUT_BUTTON);

    /*---------------------------------------------------------------------------------*/

    controlKit.getRootNode().addChild(rootNode);

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
    menuUndo.setStyleClass( ControlKit.CSS.MenuBtnUndo);

    menuUndo.setProperty('value',ControlKit.History.getInstance().getNumStates());

    /*---------------------------------------------------------------------------------*/

    rootNode.setWidth(width);
    lablNode.setProperty('innerHTML',params.label);

    /*---------------------------------------------------------------------------------*/

    if(!fixed)
    {
        this._dragging = false;
        this._mouseOffset  = [0,0];

        headNode.setStyleProperty('cursor','pointer');

        headNode.setEventListener(ControlKit.NodeEventType.MOUSE_DOWN,    this._onHeadDragStart.bind(this));
    }

    headNode.setEventListener(ControlKit.NodeEventType.MOUSE_OVER, this._onHeadMouseOver.bind(this));
    headNode.setEventListener(ControlKit.NodeEventType.MOUSE_OUT,  this._onHeadMouseOut.bind(this));

    /*---------------------------------------------------------------------------------*/

    menuNode.addChild(menuUndo);
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

    this._disabled = false;

    menuHide.setEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onMenuHideMouseDown.bind(this));
    menuUndo.setStyleProperty('display','none');
    menuUndo.setEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onMenuUndoTrigger.bind(this));

    parent.addEventListener(ControlKit.EventType.UPDATE_MENU,this,'onUpdateMenu');


    /*---------------------------------------------------------------------------------*/

    this._position = params.position;

    if(align == 'left')this._setPosition(params.position[0],params.position[1]);
    else               this._setPosition(window.innerWidth - params.position[0] - width,params.position[1]);

    this._groups = [];

    /*---------------------------------------------------------------------------------*/

    window.addEventListener('resize',this._onWindowResize.bind(this));
};

ControlKit.Panel.prototype = Object.create(ControlKit.EventDispatcher.prototype);

/*---------------------------------------------------------------------------------*/

ControlKit.Panel.prototype.isEnabled  = function(){return !this._disabled;};
ControlKit.Panel.prototype.isDisabled = function(){return this._disabled;};

ControlKit.Panel.prototype.addGroup  = function(params)
{
    var group = new ControlKit.Group(this,params);
    this._groups.push(group);
    return group;
};

ControlKit.Panel.prototype._onMenuHideMouseDown = function(){this._disabled=!this._disabled;this._updateAppearance();};

ControlKit.Panel.prototype._updateAppearance = function()
{
    var rootNode = this._rootNode,
        headNode = this._headNode,
        menuHide = this._menuHide;

    if(this._disabled)
    {
        headNode.getStyle().borderBottom = 'none';

        rootNode.setHeight(headNode.getHeight());
        menuHide.setStyleClass(ControlKit.CSS.MenuBtnShow);

        //TODO:Add inactive state


        this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.PANEL_HIDE,null));
    }
    else
    {
        rootNode.setHeight(headNode.getHeight() +  this._wrapNode.getHeight());
        rootNode.setStyleProperty('height','auto');
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
    var parentNode = this._parent.getRootNode(),
        node       = this._rootNode;

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
    var position = this._position;this._setPosition(position[0],position[1]);
};

/*---------------------------------------------------------------------------------*/

ControlKit.Panel.prototype._setPosition = function(x,y)
{
    var node     = this._rootNode,
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
};

/*
 ControlKit.Panel.prototype._constrainHeight = function()
 {
 return;

 var node        = this._wrapNode;

 var panelTop    = this._position[1],
 panelHeight = node.getHeight(),
 panelBottom = panelTop + panelHeight;

 var height = window.innerHeight;

 if(panelBottom  < height)
 {
 node.setHeight(node.getFirstChild().getHeight());

 console.log(node.getFirstChild().getHeight());

 }
 else
 {
 node.setHeight(100);

 }
 };
 */

ControlKit.Panel.prototype.getWidth      = function(){return this._width;};
ControlKit.Panel.prototype.getAlignment  = function(){return this._align;};
ControlKit.Panel.prototype.getPosition   = function(){return this._position;};

/*---------------------------------------------------------------------------------*/
ControlKit.Panel.prototype.getGroups     = function(){return this._groups;};
ControlKit.Panel.prototype.getNode       = function(){return this._rootNode;};
ControlKit.Panel.prototype.getList       = function(){return this._listNode;};

ControlKit.Options = function()
{
    var node     = this._rootNode = new ControlKit.Node(ControlKit.NodeType.DIV);
    var listNode = this._listNode = new ControlKit.Node(ControlKit.NodeType.LIST);

    node.setStyleClass(ControlKit.CSS.Options);
    node.addChild(listNode);

    this._selectedIndex = null;
    this._selectHover   = false;
    this._callbackOut = function(){};

    this._unfocusable = false;

    document.addEventListener(ControlKit.DocumentEventType.MOUSE_DOWN,this._onDocumentMouseDown.bind(this));
    document.addEventListener(ControlKit.DocumentEventType.MOUSE_UP,  this._onDocumentMouseUp.bind(this));
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

    build : function(entries,selected,element,callbackSelect,callbackOut,paddingRight)
    {
        this._clearList();

        var rootNode = this._rootNode,
            listNode = this._listNode;

        paddingRight = paddingRight || 0;

        var self = this;

        // build list
        var itemNode,entry;
        var i = -1;
        while(++i < entries.length)
        {
            entry = entries[i];

            itemNode = listNode.addChild(new ControlKit.Node(ControlKit.NodeType.LIST_ITEM));
            itemNode.setProperty('innerHTML',entry);
            if(entry == selected)itemNode.setStyleClass(ControlKit.CSS.OptionsSelected);

            itemNode.setEventListener(ControlKit.NodeEventType.MOUSE_DOWN,
                function()
                {
                    self._selectedIndex = Array.prototype.indexOf.call(this.parentNode.children,this);
                    callbackSelect();
                });
        }

        //position, set width and enable

        var elementPos    = element.getPositionGlobal(),
            elementWidth  = element.getWidth() - paddingRight,
            elementHeight = element.getHeight();

        var listWidth  = listNode.getWidth(),
            listHeight = listNode.getHeight();

        rootNode.setWidth( listWidth < elementWidth ? elementWidth : listWidth);
        rootNode.setHeight(listHeight);
        rootNode.setPositionGlobal(elementPos[0],elementPos[1]+elementHeight-ControlKit.Constant.PADDING_OPTIONS);
        rootNode.setStyleProperty('visibility','visible');

        this._callbackOut = callbackOut;
        this._unfocusable = false;
    },

    _entriesAreColors : function(entries)
    {
        return false;
    },

    _clearList : function()
    {
        this._listNode.removeAllChildren();
        this._selectedIndex  = null;
        this._build          = false;
    },

    clear : function()
    {
        this._clearList();
        this._callbackOut = function(){};
        this._rootNode.setStyleProperty('visibility','hidden');

    },

    isBuild     : function(){return this._build;},
    getNode     : function(){return this._rootNode; },
    getSelectedIndex : function(){return this._selectedIndex;}
};

ControlKit.Options.init        = function(){return ControlKit.Options._instance = new ControlKit.Options();};
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

    input.setEventListener(ControlKit.NodeEventType.KEY_DOWN, this._onInputKeyDown.bind(this));
    input.setEventListener(ControlKit.NodeEventType.KEY_UP,   this._onInputKeyUp.bind(this));
    input.setEventListener(ControlKit.NodeEventType.CHANGE,   this._onInputChange.bind(this));
};

ControlKit.NumberInput_Internal.prototype = Object.create(ControlKit.EventDispatcher.prototype);

ControlKit.NumberInput_Internal.prototype._onInputKeyDown = function(e)
{
    var step       = (e.shiftKey ? ControlKit.Constant.NUMBER_INPUT_SHIFT_MULTIPLIER : 1) * this._valueStep,
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
    if(value == '-')return true;
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
ControlKit.NumberInput_Internal.prototype.getNode    = function() {return this._input;
};


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

    slot.node.setEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onSlotMouseDown.bind(this));
    slot.node.setEventListener(ControlKit.NodeEventType.MOUSE_UP,  this._onSlotMouseUp.bind(this));

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

    setBoundMin : function(value){this._bounds[0] = value;this._interpolateValue();this._updateHandle();},
    setBoundMax : function(value){this._bounds[1] = value; this._interpolateValue();this._updateHandle();},
    setValue    : function(value){this._intrpl    = value/this._bounds[1]; this._updateHandle();this._value  = value;},


    getValue : function(){return this._value;}
};

ControlKit.Plotter = function(parent,object,value,label,params)
{
    ControlKit.CanvasComponent.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params            = params            || {};
    params.gridRes    = params.gridRes    || [10,10];
    params.lineWidth  = params.lineWidth  || 1;
    params.lineColor  = params.lineColor  || [255,255,255];

    /*---------------------------------------------------------------------------------*/

    this._gridRes   = params.gridRes;
    this._lineWidth = params.lineWidth;
    this._lineColor = params.lineColor;
};

ControlKit.Plotter.prototype = Object.create(ControlKit.CanvasComponent.prototype);

ControlKit.Plotter.prototype._drawGrid = function()
{
    var c = this._canvas;

    var gridResX     = this._gridRes[0],
        gridResY     = this._gridRes[1],
        canvasWidth  = c.width,
        canvasHeight = c.height;


    var spacingGridX = canvasWidth  / gridResX,
        spacingGridY = canvasHeight / gridResY;

    var temp;
    var i = -1;

    c.stroke(26,29,31);

    while(++i < gridResX)
    {
        temp = Math.round(spacingGridX + spacingGridX * i);
        c.line(0,temp,canvasWidth,temp);
    }
    i = -1;
    while(++i < gridResY)
    {
        temp = Math.round(spacingGridY + spacingGridY * i);
        c.line(temp,0,temp,canvasHeight);
    }
};


ControlKit.PresetBtn = function(parentNode)
{
    var btnNode  = this._btnNode  = new ControlKit.Node(ControlKit.NodeType.INPUT_BUTTON);
    var indiNode = this._indiNode = new ControlKit.Node(ControlKit.NodeType.DIV);

    this._callbackA = function(){};
    this._callbackI = function(){};
    this._active   = false;

    btnNode.setStyleClass(ControlKit.CSS.PresetBtn);
    btnNode.setEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onMouseDown.bind(this));

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

ControlKit.Output = function(parent,object,value,label,params)
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
        rootNode = this._rootNode;

    textArea.setProperty('readOnly',true);
    wrapNode.addChild(textArea);

    /*---------------------------------------------------------------------------------*/

    if(params.height)
    {
        if(params.height != 'auto')
        {
            textArea.setHeight(Math.max(params.height,ControlKit.Constant.MIN_HEIGHT));
            wrapNode.setHeight(textArea.getHeight() + ControlKit.Constant.PADDING_WRAPPER - 6);
            rootNode.setHeight(textArea.getHeight() + ControlKit.Constant.PADDING_WRAPPER - 3);
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


ControlKit.StringInput = function(parent,object,value,label,params)
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
        inputWrap.setStyleClass(ControlKit.CSS.InputWPresetWrap);

        wrapNode.addChild(inputWrap);
        inputWrap.addChild(input);

        var presets = this._presets   = this._object[this._presetsKey];

        var options   = ControlKit.Options.getInstance();
        var presetBtn = this._presetBtn = new ControlKit.PresetBtn(this._wrapNode);

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
                onPresetDeactivate,ControlKit.Constant.PADDING_PRESET);
        };

        presetBtn.setCallbackActive(onPresetActivate);
        presetBtn.setCallbackInactive(onPresetDeactivate)
    }

    input.setProperty('value',this._object[this._key]);

    input.setEventListener(ControlKit.NodeEventType.KEY_UP, this._onInputKeyUp.bind(this));
    input.setEventListener(ControlKit.NodeEventType.CHANGE, this._onInputChange.bind(this));

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


ControlKit.NumberInput = function(parent,object,value,label,params)
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
        inputWrap.setStyleClass(ControlKit.CSS.InputWPresetWrap);

        wrapNode.addChild(inputWrap);
        inputWrap.addChild(input.getNode());

        var presets = this._presets   = this._object[this._presetsKey],
            obj     = this._object,
            key     = this._key;

        var options   = ControlKit.Options.getInstance();
        var presetBtn = this._presetBtn = new ControlKit.PresetBtn(this._wrapNode);

        var onPresetDeactivate = function(){options.clear();presetBtn.deactivate();};

        var self = this;
        var onPresetActivate = function()
        {
            options.build(presets,input.getValue(),input.getNode(),
                function(){input.setValue(presets[options.getSelectedIndex()]);
                    self.applyValue();},
                onPresetDeactivate,ControlKit.Constant.PADDING_PRESET);
        };

        presetBtn.setCallbackActive(onPresetActivate);
        presetBtn.setCallbackInactive(onPresetDeactivate)
    }

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

ControlKit.Button = function(parent,label,onPress)
{
    ControlKit.Component.apply(this,arguments);

    var input = this._textArea = new ControlKit.Node(ControlKit.NodeType.INPUT_BUTTON);

    onPress = onPress  || function(){};

    input.setStyleClass(ControlKit.CSS.Button);
    input.setProperty('value',label);
    input.setEventListener(ControlKit.NodeEventType.ON_CLICK,
        function()
        {
            onPress();
            this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.VALUE_UPDATED));
        }.bind(this));

    this._wrapNode.addChild(input);
};

ControlKit.Button.prototype = Object.create(ControlKit.Component.prototype);


ControlKit.Range = function(parent,object,value,label,params)
{
    ControlKit.ObjectComponent.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params          = params          || {};
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || this._onFinish;

    params.step     = params.step     || 1;
    params.dp       = params.dp   || 2;

    /*---------------------------------------------------------------------------------*/

    this._onChange  = params.onChange;
    this._onFinish  = params.onFinish;

    var step = this._step = params.step;
    var dp   = this._dp   = params.dp;

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

    var values = this._object[this._key];

    this._inputMin.setValue(values[0]);
    this._inputMax.setValue(values[1]);
};



ControlKit.Range.prototype._onInputMinChange = function(){this._updateValueMin();this._onInputChange();};
ControlKit.Range.prototype._onInputMinFinish = function(){this._updateValueMin();this._onInputFinish();};
ControlKit.Range.prototype._onInputMaxChange = function(){this._updateValueMax();this._onInputChange();};
ControlKit.Range.prototype._onInputMaxFinish = function(){this._updateValueMax();this._onInputFinish();};


ControlKit.Checkbox = function(parent,object,value,label,params)
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
    input.setEventListener(ControlKit.NodeEventType.CHANGE,this._onInputChange.bind(this));

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

ControlKit.Slider = function(parent,object,value,target,label,params)
{
    ControlKit.ObjectComponent.apply(this,arguments);

    this._values  = this._object[this._key];
    this._targetKey = target;

    /*---------------------------------------------------------------------------------*/

    params          = params          || {};
    params.step     = params.step     || 1;
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || this._onFinish;
    params.dp       = params.dp       || 2;

    /*---------------------------------------------------------------------------------*/

    this._step     = params.step;
    this._onChange = params.onChange;
    this._onFinish = params.onFinish;
    this._dp       = params.dp;

    var values    = this._values,
        obj       = this._object,
        targetKey = this._targetKey;

    var wrapNode  = this._wrapNode;

    /*---------------------------------------------------------------------------------*/

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

ControlKit.Slider.prototype.pushHistoryState = function(){var obj = this._object,key = this._targetKey;ControlKit.History.getInstance().pushState(obj,key,obj[key]);};

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
            slider.setValue(this._object[this._targetKey]);
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


ControlKit.Select = function(parent,object,value,target,label,params)
{
    ControlKit.ObjectComponent.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params = params || {};
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || this._onFinish;

    /*---------------------------------------------------------------------------------*/

    this._onChange    = params.onChange;
    this._onFinish    = params.onFinish;

    var select = this._select = new ControlKit.Node(ControlKit.NodeType.INPUT_BUTTON);
    select.setStyleClass(ControlKit.CSS.Select);

    this._wrapNode.addChild(select);

    /*---------------------------------------------------------------------------------*/

    this._targetKey = target;
    this._values    = this._object[this._key];
    this._selected  = null;

    var targetObj = this._object[this._targetKey];
    targetObj = targetObj || '';

    var values = this._values;

    var i = -1;
    while(++i < values.length){if(targetObj == values[i])this._selected = values[i];}
    select.setProperty('value',targetObj.toString().length > 0 ? targetObj : values[0]);

    /*---------------------------------------------------------------------------------*/

    this._active = false;

    /*---------------------------------------------------------------------------------*/

    select.setEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onSelectMouseDown.bind(this));

    /*---------------------------------------------------------------------------------*/

    var kit = ControlKit.getKitInstance();
    kit.addEventListener(ControlKit.EventType.TRIGGER_SELECT,   this,'onSelectTrigger');
    this.addEventListener(ControlKit.EventType.SELECT_TRIGGERED,kit, 'onSelectTriggered');

};

ControlKit.Select.prototype = Object.create(ControlKit.ObjectComponent.prototype);

ControlKit.Select.prototype.onSelectTrigger = function(e)
{

    if(e.data.origin == this)
    {
        this._active = !this._active;
        this._updateAppearance();

        var options = ControlKit.Options.getInstance();

        if(this._active)
        {
            options.build(this._values,
                this._selected,
                this._select,
                function()
                {
                    this.applyValue();

                    this._active = false;
                    this._updateAppearance();

                    options.clear();

                }.bind(this),
                function()
                {
                    this._active = false;
                    this._updateAppearance();

                    options.clear();

                }.bind(this));

        }
        else
        {
            options.clear();
        }

        return;
    }


    this._active = false;
    this._updateAppearance();

};


ControlKit.Select.prototype.applyValue = function()
{
    this.pushHistoryState();

    this._selected = this._object[this._targetKey]  = this._values[ControlKit.Options.getInstance().getSelectedIndex()];
    this._select.setProperty('value',this._selected);

    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.VALUE_UPDATED,null));
};

ControlKit.Select.prototype.pushHistoryState = function(){var obj = this._object,key = this._targetKey;ControlKit.History.getInstance().pushState(obj,key,obj[key]);};

ControlKit.Select.prototype._onSelectMouseDown = function()
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

ControlKit.FunctionPlotter = function(parent,object,value,label,params)
{
    ControlKit.Plotter.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params          = params          || {};
    params.bounds   = params.bounds   || [-1,1,-1,1];

    /*---------------------------------------------------------------------------------*/

    this._bounds       = params.bounds;

    this._func = null;
    this.setFunction(this._object[this._key]);
};

ControlKit.FunctionPlotter.prototype = Object.create(ControlKit.Plotter.prototype);

ControlKit.FunctionPlotter.prototype.setFunction = function(func)
{
    this._func = func;

    var c = this._canvas;

    c.background(0,0);
    c.noFill();
    c.push();
    {
        c.translateHalfFloat();
        this._drawGrid();
        this._drawPlot();
    }
    c.pop();
};

ControlKit.FunctionPlotter.prototype._drawPlot = function()
{
    var canvas = this._canvas;

    var width  = Math.floor(canvas.width),
        height = Math.floor(canvas.height);

    var bounds = this._bounds,
        minx = bounds[0],
        maxx = bounds[1],
        miny = bounds[2],
        maxy = bounds[3];

    var points = new Array(width * 2);
    var i = 0, l = points.length;
    var normval;
    while(i<l)
    {

        normval =  i/l;
        points[i]   = normval*width;
        points[i+1] = this._func(normval)*height*0.5;


        i+=2;
    }
    canvas.push();
    {
        canvas.translate(0,(Math.floor(height)*0.5+0.5));
        canvas.setLineWidth(this._lineWidth+3);
        canvas.stroke(0);
        canvas.lineArray(points);
        canvas.setLineWidth(this._lineWidth+0.5);
        canvas.stroke(255);
        canvas.lineArray(points);
    }
    canvas.pop();

};


ControlKit.Pad = function(parent,object,value,label,params)
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

    var canvas = this._canvas;
    canvas.setFontFamily('Arial');
    canvas.setFontSize(10);

    /*---------------------------------------------------------------------------------*/

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

    /*---------------------------------------------------------------------------------*/

    this._drawValue(this._object[this._key]);
};

ControlKit.Pad.prototype = Object.create(ControlKit.Plotter.prototype);

/*---------------------------------------------------------------------------------*/

ControlKit.Pad.prototype._redraw = function(){this._drawValue(this._object[this._key]);};

ControlKit.Pad.prototype._drawValue = function(value)
{
    this._object[this._key] = value;

    var canvas = this._canvas;

    canvas.clear();
    canvas.background(0,0);
    canvas.push();
    canvas.translateHalfFloat();
    this._drawGrid();
    this._drawPoint();
    canvas.pop();
};


ControlKit.Pad.prototype._drawPoint = function()
{
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
};

ControlKit.Pad.prototype._getMouseNormalized = function()
{
    var offset       = this._canvasNode.getPositionGlobal(),
        mouse        = ControlKit.Mouse.getInstance().getPosition();

    var canvas       = this._canvas,
        canvasWidth  = canvas.width  - 1,
        canvasHeight = canvas.height - 1;

    return [ -1 + Math.max(0,Math.min(mouse[0]-offset[0],canvasWidth )) / canvasWidth  * 2,
        ( 1 - Math.max(0,Math.min(mouse[1]-offset[1],canvasHeight)) / canvasHeight * 2)];
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

ControlKit.ValuePlotter = function(parent,object,value,label,params)
{
    ControlKit.Plotter.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params            = params            || {};
    params.height     = params.height     || this._canvas.height * 0.5;
    params.resolution = params.resolution || 1;

    /*---------------------------------------------------------------------------------*/

    var resolution = params.resolution,
        length     = Math.floor(this._canvas.width / resolution);

    var points  = this._points  = new Array(length * 2),
        buffer0 = this._buffer0 = new Array(length),
        buffer1 = this._buffer1 = new Array(length);

    var pointsLength = points.length;

    var i = 0; while(i   < pointsLength){points[i]  = (length-i+1)*resolution;points[i+1]=0.0;i+=2;}
    i =-1; while(++i < length    )  {buffer0[i] =  buffer1[i] = 0.0;}

    params.height = params.height  < ControlKit.Constant.MIN_HEIGHT ?
        ControlKit.Constant.MIN_HEIGHT : params.height;

    var canvas = this._canvas;
    canvas.setSize(canvas.width,Math.floor(params.height));

    this._updateHeight();

    this._drawValue();
};

ControlKit.ValuePlotter.prototype = Object.create(ControlKit.Plotter.prototype);

ControlKit.ValuePlotter.prototype._redraw = function(){this._drawValue();};

ControlKit.ValuePlotter.prototype._drawValue = function()
{
    var canvas = this._canvas;

    canvas.clear();
    canvas.background(0,0);
    canvas.push();
    {
        canvas.translateHalfFloat();
        this._drawGrid();
        this._drawCurve();
    }
    canvas.pop();
};

ControlKit.ValuePlotter.prototype._drawGrid = function()
{
    var canvas           = this._canvas,
        canvasWidth      = canvas.width,
        canvasHeightHalf = Math.floor(canvas.height * 0.5);

    canvas.setLineWidth(1);
    canvas.stroke(39,44,46);
    canvas.line(0,canvasHeightHalf,canvasWidth,canvasHeightHalf);
};

ControlKit.ValuePlotter.prototype._drawCurve = function()
{
    var value = this._object[this._key];

    var canvas       = this._canvas,
        canvasHeight = this._canvas.height-2;

    var i = 0;

    var length  = this._buffer0.length;

    var buffer0 = this._buffer0,
        buffer1 = this._buffer1,
        points  = this._points;

    buffer0[length - 1] = value * (canvasHeight * 0.5) * -1;

    while(++i < length)
    {
        buffer1[i - 1 ] = buffer0[i];
        points[ i*2+1 ] = buffer0[i - 1] = buffer1[i - 1];
    }

    points[1] = buffer0[0];

    var strokeColor = this._lineColor;

    canvas.push();
    {
        canvas.translate(0,(Math.floor(canvasHeight)*0.5+0.5));
        //canvas.setLineWidth(this._lineWidth+3);
        //canvas.stroke(0);
        //canvas.lineArray(this._points);
        canvas.setLineWidth(this._lineWidth+0.5);
        canvas.stroke(strokeColor[0],strokeColor[1],strokeColor[2]);
        canvas.lineArray(this._points);
    }
    canvas.pop();

};

ControlKit.ValuePlotter.prototype.update = function()
{
    if(this._parent.isDisabled())return;
    this._drawValue();
};

ControlKit.StringOutput = function(parent,object,value,label,params)
{
    ControlKit.Output.apply(this,arguments);
};

ControlKit.StringOutput.prototype = Object.create(ControlKit.Output.prototype);

ControlKit.StringOutput.prototype._setValue = function()
{
    if(this._parent.isDisabled())return;

    var textArea = this._textArea;

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


ControlKit.NumberOutput = function(parent,object,value,label,params)
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

ControlKit.Picker = function()
{
    /*---------------------------------------------------------------------------------*/

    var node = this._rootNode = new ControlKit.Node(ControlKit.NodeType.DIV),
        head = new ControlKit.Node(ControlKit.NodeType.DIV),
        labl = new ControlKit.Node(ControlKit.NodeType.DIV),
        wrap = new ControlKit.Node(ControlKit.NodeType.DIV);

    node.setStyleClass(ControlKit.CSS.Picker);
    head.setStyleClass(ControlKit.CSS.Head);
    labl.setStyleClass(ControlKit.CSS.Label);
    wrap.setStyleClass(ControlKit.CSS.Wrap);

    /*---------------------------------------------------------------------------------*/

    var paletteWrap = new ControlKit.Node(ControlKit.NodeType.DIV);
    paletteWrap.setStyleClass(ControlKit.CSS.PalleteWrap);

    var paletteWrapInner = new ControlKit.Node(ControlKit.NodeType.DIV);
    paletteWrapInner.setStyleClass(ControlKit.CSS.PaletteWrapInner);

    var sliderWrapInner  = new ControlKit.Node(ControlKit.NodeType.DIV);
    sliderWrapInner.setStyleClass(ControlKit.CSS.PaletteWrapInner);

    /*---------------------------------------------------------------------------------*/

    var paletteCanvas = this._paletteCanvas = new ControlKit.Canvas(paletteWrapInner);
    paletteCanvas.setAntialias(false);
    paletteCanvas.setSize(154,154);


    var sliderCanvas  = this._sliderCanvas  = new ControlKit.Canvas(sliderWrapInner);
    sliderCanvas.setAntialias(false);
    sliderCanvas.setSize(24,154);

    /*---------------------------------------------------------------------------------*/

    labl.setProperty('innerHTML','Color Picker');

    head.addChild(labl);
    node.addChild(head);
    node.addChild(wrap);

    wrap.addChild(paletteWrap);
    paletteWrap.addChild(paletteWrapInner);
    paletteWrap.addChild(sliderWrapInner);

    /*---------------------------------------------------------------------------------*/

    this._drawPalette();
    this._drawSlider();

    //for testing
    node.setPositionGlobal(300,200);
};

ControlKit.Picker.prototype =
{
    getNode : function(){return this._rootNode;},

    _drawPalette : function()
    {
        var c = this._paletteCanvas;

        var width  = c.width,
            height = c.height;

        c.clear();
        c.noStroke();
        c.push();
        {
            c.translateHalfFloat();
            c.fill(255);
            c.rect(0,0,width,height);
        }
        c.pop();
    },

    _drawSlider : function()
    {
        var c = this._sliderCanvas;

        c.clear();
        c.noStroke();
        c.push();
        {
            c.translateHalfFloat();
            c.fill(255);
            //c.rect(0,0,width,height);
        }
        c.pop();
    }
};



ControlKit.Picker.init        = function(){return ControlKit.Picker._instance = new ControlKit.Picker();};
ControlKit.Picker.getInstance = function(){return ControlKit.Picker._instance;};

