var EventDispatcher = require('./event/EventDispatcher');
var Node = require('./document/Node');
var NodeType = require('./document/NodeType');
var EventType = require('./event/EventType');
var NodeEventType = require('./document/NodeEventType');
var CSS = require('./document/CSS');
var Default = require('./Default');
var History = require('./History');
var Mouse = require('./document/Mouse');
var Picker = require('../component/internal/Picker');
var Options = require('../component/internal/Options');
var Event_ = require('./event/Event');
var Panel = require('./Panel');
var ValuePlotter = require('../component/ValuePlotter');
var StringOutput = require('../component/StringOutput'),
    NumberOutput = require('../component/NumberOutput');

var BaseShared = require('./BaseShared');


function Base(params) {
    params = params || {};
    params.trigger = params.trigger === undefined ? Default.KIT_TRIGGER : params.fixed;
    params.history = params.history === undefined ? Default.KIT_HISTORY : params.history;
    params.panelsClosable = params.panelsClosable === undefined ? Default.KIT_PANELS_CLOSABLE : params.panelsClosable;
    params.opacity = params.opacity || Default.KIT_OPACITY;
    params.useExternalStyle = params.useExternalStyle === undefined ? false : params.useExternalStyle;

    EventDispatcher.apply(this, arguments);

    var node = null;
    if (!params.parentDomElementId) {
        node = new Node(NodeType.DIV);
        document.body.appendChild(node.getElement());
    } else {
        node = Node.getNodeById(params.parentDomElementId);
    }

    if(!params.useExternalStyle){
        var style = document.createElement('style');
            style.type = 'text/css';
        var css = !params.style ? require('./document/Style').string : params.style;
        if(style.stylesheet){
            style.stylesheet.cssText = css;
        } else {
            style.appendChild(document.createTextNode(css));
        }
        (document.head || document.getElementsByTagName('head')[0]).appendChild(style);
    }

    node.setProperty('id', CSS.ControlKit);

    this._node = node;
    this._panels = [];
    this._isDisabled = false;
    this._historyEnabled = params.history;
    this._panelsClosable = params.panelsClosable;

    var history = History.setup();

    if (!this._historyEnabled){
        history.disable();
    } else {
        history.addEventListener(EventType.HISTORY_STATE_PUSH, this, 'onHistoryStatePush');
        history.addEventListener(EventType.HISTORY_STATE_POP, this, 'onHistoryStatePop');
    }

    Mouse.setup();
    Picker.setup(this.getNode());
    Options.setup(this.getNode());

    if (params.trigger) {
        var trigger = new Node(NodeType.DIV);
        trigger.setProperty('id', CSS.Trigger);
        trigger.addEventListener(NodeEventType.MOUSE_DOWN, this._onTriggerDown.bind(this));

        document.body.appendChild(trigger.getElement());
    }

    if (params.opacity != 1.0 && params.opacity != 0.0) {
        node.setStyleProperty('opacity', params.opacity);
    }
    BaseShared._instance = this;
}

Base.prototype = Object.create(EventDispatcher.prototype);

Base.prototype._onTriggerDown = function () {
    this._node.setStyleProperty('visibility', this._isDisabled = !this._isDisabled ? 'hidden' : 'visible');
};

Base.prototype.onValueUpdated = function (e) {
    this.dispatchEvent(new Event_(this, EventType.UPDATE_VALUE, {origin: e.sender}));
};

Base.prototype.onSelectTriggered = function (e) {
    this.dispatchEvent(new Event_(this, EventType.TRIGGER_SELECT, {origin: e.sender}));
};

Base.prototype.addPanel = function (params) {
    var panel = new Panel(this, params);
    this._panels.push(panel);
    return panel;
};

Base.prototype.update = function () {
    if (this._isDisabled){
        return;
    }
    var i, j, k;
    var l, m, n;

    var panels = this._panels,
        panel,
        groups,
        components,
        component;

    i = -1; l = panels.length;
    while (++i < l) {
        panel = panels[i];
        if (panel.isDisabled()){
            continue;
        }
        groups = panel.getGroups();
        j = -1; m = groups.length;

        while (++j < m) {
            components = groups[j].getComponents();
            k = -1; n = components.length;

            while (++k < n) {
                component = components[k];
                if (component.isDisabled()){
                    continue;
                }
                if (component instanceof ValuePlotter ||
                    component instanceof StringOutput ||
                    component instanceof NumberOutput) {
                    component.update();
                }
            }
        }
    }
};

Base.prototype.historyIsEnabled = function () {
    return this._historyEnabled;
};
Base.prototype.panelsAreClosable = function () {
    return this._panelsClosable;
};

Base.prototype.enable = function () {
    this._isDisabled = false;
};
Base.prototype.disable = function () {
    this._isDisabled = true;
};

Base.prototype.disableAllPanels = function () {
    var i = -1, p = this._panels, l = p.length;
    while (++i < l){
        p[i].enable();
    }
};

Base.prototype.enableAllPanels = function () {
    var i = -1, p = this._panels, l = p.length;
    while (++i < l){
        p[i].disable();
    }
};

Base.prototype.onHistoryStatePush = function () {
    this.dispatchEvent(new Event_(this, EventType.UPDATE_MENU, null));
};

Base.prototype.onHistoryStatePop = function () {
    this.dispatchEvent(new Event_(this, EventType.UPDATE_VALUE, {origin: null}));
    this.dispatchEvent(new Event_(this, EventType.UPDATE_MENU, null));
};

Base.prototype.getNode = function () {
    return this._node;
};


module.exports = Base;


// ControlKit.Base = function(parentDomElementId,params)
//{
//    ControlKit.EventDispatcher.apply(this,arguments);
//
//    var node = null;
//
//    if(!parentDomElementId)
//    {
//        node = new ControlKit.Node(ControlKit.NodeType.DIV);
//        document.body.appendChild(node.getElement());
//    }
//    else
//    {
//        node = ControlKit.Node.getNodeById(parentDomElementId);
//    }
//
//    node.setProperty('id',ControlKit.CSS.ControlKit);
//
//    /*---------------------------------------------------------------------------------*/
//
//    params                = params                || {};
//    params.trigger        = params.trigger        === undefined ? ControlKit.Default.KIT_TRIGGER         : params.fixed;
//    params.history        = params.history        === undefined ? ControlKit.Default.KIT_HISTORY         : params.history;
//    params.panelsClosable = params.panelsClosable === undefined ? ControlKit.Default.KIT_PANELS_CLOSABLE : params.panelsClosable;
//    params.opacity        = params.opacity        || ControlKit.Default.KIT_OPACITY;
//
//    /*---------------------------------------------------------------------------------*/
//
//    this._node           = node;
//    this._panels         = [];
//    this._isDisabled     = false;
//    this._historyEnabled = params.history;
//    this._panelsClosable = params.panelsClosable;
//
//    /*---------------------------------------------------------------------------------*/
//
//    var history = ControlKit.History.setup();
//        history.addEventListener(ControlKit.EventType.HISTORY_STATE_PUSH,this,'onHistoryStatePush');
//        history.addEventListener(ControlKit.EventType.HISTORY_STATE_POP ,this,'onHistoryStatePop');
//
//    if(!this._historyEnabled)history.disable();
//
//    var mouse   = ControlKit.Mouse.setup(),
//        picker  = ControlKit.Picker.setup( this.getNode()),
//        options = ControlKit.Options.setup(this.getNode());
//
//    if(params.trigger)
//    {
//        var trigger = new ControlKit.Node(ControlKit.NodeType.DIV);
//            trigger.setProperty('id',ControlKit.CSS.Trigger);
//            trigger.addEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onTriggerDown.bind(this));
//
//        document.body.appendChild(trigger.getElement());
//    }
//
//    if(params.opacity != 1.0 && params.opacity != 0.0)
//    {
//        node.setStyleProperty('opacity',params.opacity);
//    }
//
//    /*---------------------------------------------------------------------------------*/
//
//    ControlKit.Base._instance = this;
//};
//
//ControlKit.Base.prototype = Object.create(ControlKit.EventDispatcher.prototype);
//
///*---------------------------------------------------------------------------------*/
//
//ControlKit.Base.prototype._onTriggerDown = function()
//{
//    var disabled = this._isDisabled = !this._isDisabled;
//    this._node.setStyleProperty('visibility',disabled ? 'hidden' : 'visible');
//};
//
//ControlKit.Base.prototype.onValueUpdated = function(e)
//{
//    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.UPDATE_VALUE,{origin: e.sender}));
//};
//
//ControlKit.Base.prototype.onSelectTriggered = function(e)
//{
//    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.TRIGGER_SELECT,{origin: e.sender}));
//};
//
///*---------------------------------------------------------------------------------*/
//
//ControlKit.Base.prototype.addPanel = function(params)
//{
//    var panel = new ControlKit.Panel(this, params);
//    this._panels.push(panel);
//    return panel;
//};
//
///*---------------------------------------------------------------------------------*/
//
//ControlKit.Base.prototype.update = function()
//{
//    if(this._isDisabled)return;
//
//    var i = -1, j, k;
//
//    var panels = this._panels,
//        panel,
//        groups,
//        components,
//        component;
//
//    while (++i < panels.length)
//    {
//        panel = panels[i];
//
//        if(panel.isDisabled())continue;
//
//        groups = panel.getGroups();
//
//        j = -1;
//        while (++j < groups.length)
//        {
//            components = groups[j].getComponents();
//
//            k = -1;
//            while (++k < components.length)
//            {
//                component = components[k];
//
//                if(component.isDisabled())continue;
//
//                if (component instanceof ControlKit.ValuePlotter ||
//                    component instanceof ControlKit.StringOutput ||
//                    component instanceof ControlKit.NumberOutput)
//                {
//                    component.update();
//                }
//            }
//        }
//    }
//};
//
//ControlKit.Base.prototype.historyIsEnabled  = function(){return this._historyEnabled;};
//ControlKit.Base.prototype.panelsAreClosable = function(){return this._panelsClosable;};
//
//ControlKit.Base.prototype.enable  = function(){this._isDisabled = false;};
//ControlKit.Base.prototype.disable = function(){this._isDisabled = true;};
//
//ControlKit.Base.prototype.disableAllPanels = function(){var i=-1,p=this._panels;while(++i<p.length)p[i].enable();};
//ControlKit.Base.prototype.enableAllPanels  = function(){var i=-1,p=this._panels;while(++i<p.length)p[i].disable();};
//
///*---------------------------------------------------------------------------------*/
//
//ControlKit.Base.prototype.onHistoryStatePush = function()
//{
//    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.UPDATE_MENU,null));
//};
//
//ControlKit.Base.prototype.onHistoryStatePop  = function()
//{
//    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.UPDATE_VALUE,{origin: null}));
//    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.UPDATE_MENU, null));
//};
//
///*---------------------------------------------------------------------------------*/
//
//ControlKit.Base.prototype.getNode = function(){return this._node;};
//
///*---------------------------------------------------------------------------------*/
//
//
//ControlKit.getKitInstance = function(){return ControlKit.Base._instance;};