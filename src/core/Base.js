var Node = require('./document/Node'),
    Panel = require('./Panel'),
    Options = require('../component/internal/Options'),
    Picker = require('../component/internal/Picker');

var CSS = require('./document/CSS');

var EventDispatcher = require('./event/EventDispatcher'),
    Event_ = require('./event/Event'),
    DocumentEvent = require('./document/DocumentEvent'),
    NodeEvent = require('./document/NodeEvent'),
    ComponentEvent = require('./component/ComponentEvent'),
    HistoryEvent = require('./HistoryEvent'),
    SelectEvent = require('../component/SelectEvent'),
    MenuEvent = require('./group/MenuEvent');

var History = require('./History');
var Mouse = require('./document/Mouse');

var ValuePlotter = require('../component/ValuePlotter');
var StringOutput = require('../component/StringOutput'),
    NumberOutput = require('../component/NumberOutput');

var BaseShared = require('./BaseShared');

var DEFAULT_KIT_TRIGGER = false,
    DEFAULT_HISTORY = false,
    DEFAULT_PANELS_CLOSABLE = false,
    DEFAULT_OPACITY = 1.0;

function Base(params) {
    params = params || {};
    params.trigger = params.trigger === undefined ? DEFAULT_KIT_TRIGGER : params.fixed;
    params.history = params.history === undefined ? DEFAULT_HISTORY : params.history;
    params.panelsClosable = params.panelsClosable === undefined ? DEFAULT_PANELS_CLOSABLE : params.panelsClosable;
    params.opacity = params.opacity === undefined ? DEFAULT_OPACITY : params.opacity;
    params.useExternalStyle = params.useExternalStyle === undefined ? false : params.useExternalStyle;

    EventDispatcher.apply(this, arguments);

    var node = null;
    if (!params.parentDomElementId) {
        node = new Node();
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
        history.addEventListener(HistoryEvent.STATE_PUSH, this, 'onHistoryStatePush');
        history.addEventListener(HistoryEvent.STATE_POP, this, 'onHistoryStatePop');
    }

    Mouse.setup();
    Picker.setup(this.getNode());
    Options.setup(this.getNode());

    if (params.trigger) {
        var trigger = new Node();
        trigger.setProperty('id', CSS.Trigger);
        trigger.addEventListener(NodeEvent.MOUSE_DOWN, this._onTriggerDown.bind(this));

        document.body.appendChild(trigger.getElement());
    }

    if (params.opacity != 1.0 && params.opacity != 0.0) {
        node.setStyleProperty('opacity', params.opacity);
    }

    this._canUpdate = true;

    var self = this;
    var interval,
        count = 0,
        countMax = 10;

    window.addEventListener(DocumentEvent.WINDOW_RESIZE,function(){
        self._canUpdate = false;
        clearInterval(interval);
        interval = setInterval(function(){
            if(count >= countMax){
                count = 0;
                self._canUpdate = true;
                clearInterval(interval);
            }
            count++;
        },25)
    });

    BaseShared._instance = this;
}

Base.prototype = Object.create(EventDispatcher.prototype);

Base.prototype._onTriggerDown = function () {
    this._node.setStyleProperty('visibility', this._isDisabled = !this._isDisabled ? 'hidden' : 'visible');
};

Base.prototype.onValueUpdated = function (e) {
    this.dispatchEvent(new Event_(this, ComponentEvent.UPDATE_VALUE, {origin: e.sender}));
};

Base.prototype.onSelectTriggered = function (e) {
    this.dispatchEvent(new Event_(this, SelectEvent.TRIGGER_SELECT, {origin: e.sender}));
};

Base.prototype.addPanel = function (params) {
    var panel = new Panel(this, params);
    this._panels.push(panel);
    return panel;
};

Base.prototype.update = function () {
    if (this._isDisabled || !this._canUpdate){
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
    this.dispatchEvent(new Event_(this, MenuEvent.UPDATE_MENU, null));
};

Base.prototype.onHistoryStatePop = function () {
    this.dispatchEvent(new Event_(this, ComponentEvent.UPDATE_VALUE, {origin: null}));
    this.dispatchEvent(new Event_(this, MenuEvent.UPDATE_MENU, null));
};

Base.prototype.getNode = function () {
    return this._node;
};

module.exports = Base;