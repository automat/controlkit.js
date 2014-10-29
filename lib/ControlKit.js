var Node = require('./core/document/Node'),
    Panel = require('./group/Panel'),
    Options = require('./component/Options'),
    Picker = require('./component/Picker');

var CSS = require('./core/document/CSS');

var EventDispatcher = require('./core/event/EventDispatcher'),
    Event_ = require('./core/event/Event'),
    DocumentEvent = require('./core/document/DocumentEvent'),
    NodeEvent = require('./core/document/NodeEvent'),
    ComponentEvent = require('./core/ComponentEvent'),
    HistoryEvent = require('./core/HistoryEvent'),
    SelectEvent = require('./core/OptionEvent'),
    MenuEvent = require('./group/MenuEvent');

var History = require('./core/History');
var Mouse = require('./core/document/Mouse');

var ValuePlotter = require('./component/ValuePlotter');
var StringOutput = require('./component/StringOutput'),
    NumberOutput = require('./component/NumberOutput');

var DEFAULT_KIT_TRIGGER = false,
    DEFAULT_HISTORY = false,
    DEFAULT_PANELS_CLOSABLE = false,
    DEFAULT_OPACITY = 1.0;

function ControlKit(params) {
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
        var css = !params.style ? require('./core/document/Style').string : params.style;
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
}

ControlKit.prototype = Object.create(EventDispatcher.prototype);

ControlKit.prototype._onTriggerDown = function () {
    this._node.setStyleProperty('visibility', this._isDisabled = !this._isDisabled ? 'hidden' : 'visible');
};

ControlKit.prototype.addPanel = function (params) {
    var panel = new Panel(this, params);
    this._panels.push(panel);
    return panel;
};

ControlKit.prototype.update = function () {
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

ControlKit.prototype.historyIsEnabled = function () {
    return this._historyEnabled;
};
ControlKit.prototype.panelsAreClosable = function () {
    return this._panelsClosable;
};

ControlKit.prototype.enable = function () {
    this._isDisabled = false;
};
ControlKit.prototype.disable = function () {
    this._isDisabled = true;
};

ControlKit.prototype.disableAllPanels = function () {
    var i = -1, p = this._panels, l = p.length;
    while (++i < l){
        p[i].enable();
    }
};

ControlKit.prototype.enableAllPanels = function () {
    var i = -1, p = this._panels, l = p.length;
    while (++i < l){
        p[i].disable();
    }
};

ControlKit.prototype.onHistoryStatePush = function () {
    this.dispatchEvent(new Event_(this, MenuEvent.UPDATE_MENU, null));
};

ControlKit.prototype.onHistoryStatePop = function () {
    this.dispatchEvent(new Event_(this, ComponentEvent.UPDATE_VALUE, {origin: null}));
    this.dispatchEvent(new Event_(this, MenuEvent.UPDATE_MENU, null));
};

ControlKit.prototype.getNode = function () {
    return this._node;
};

//
var instance = null;

var ControlKitGlobal = {
    setup : function(options){
        instance = new ControlKit(options);
    },
    update : function(){
        if(!instance){
            return;
        }
        instance.update();
    },
    addPanel : function(params){
        if(!instance){
            return undefined;
        }
        return instance.addPanel(params);
    },
    enable : function(){
        if(!instance){
            return;
        }
        instance.enable();
    },
    disable : function(){
        if(!instance){
            return;
        }
        instance.disable();
    },
    destroy : function(){
        instance = null;
    }
};

module.exports = ControlKitGlobal;