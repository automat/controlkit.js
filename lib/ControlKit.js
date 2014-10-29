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
    MenuEvent = require('./group/MenuEvent');

var History = require('./core/History');
var Mouse = require('./core/document/Mouse');

var ValuePlotter = require('./component/ValuePlotter');
var StringOutput = require('./component/StringOutput'),
    NumberOutput = require('./component/NumberOutput');

var DEFAULT_HISTORY = false,
    DEFAULT_OPACITY = 1.0,
    DEFAULT_PANELS_CLOSABLE = true;

function ControlKit_(params) {
    params = params || {};
    params.history = params.history === undefined ? DEFAULT_HISTORY : params.history;
    params.opacity = params.opacity === undefined ? DEFAULT_OPACITY : params.opacity;
    params.panelsClosable = params.panelsClosable === undefined ? DEFAULT_PANELS_CLOSABLE : params.panelsClosable;
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
        var css = !params.style ? require('./core/document/Style').string : params.styleString;
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

ControlKit_.prototype = Object.create(EventDispatcher.prototype);

ControlKit_.prototype._onTriggerDown = function () {
    this._node.setStyleProperty('visibility', this._isDisabled = !this._isDisabled ? 'hidden' : 'visible');
};

ControlKit_.prototype.addPanel = function (params) {
    var panel = new Panel(this, params);
    this._panels.push(panel);
    return panel;
};

ControlKit_.prototype.update = function () {
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

ControlKit_.prototype.historyIsEnabled = function () {
    return this._historyEnabled;
};

ControlKit_.prototype.panelsAreClosable = function () {
    return this._panelsClosable;
};


ControlKit_.prototype.enable = function () {
    this._isDisabled = false;
};

ControlKit_.prototype.disable = function () {
    this._isDisabled = true;
};

ControlKit_.prototype.disableAllPanels = function () {
    var i = -1, p = this._panels, l = p.length;
    while (++i < l){
        p[i].enable();
    }
};

ControlKit_.prototype.enableAllPanels = function () {
    var i = -1, p = this._panels, l = p.length;
    while (++i < l){
        p[i].disable();
    }
};

ControlKit_.prototype.onHistoryStatePush = function () {
    this.dispatchEvent(new Event_(this, MenuEvent.UPDATE_MENU, null));
};

ControlKit_.prototype.onHistoryStatePop = function () {
    this.dispatchEvent(new Event_(this, ComponentEvent.UPDATE_VALUE, {origin: null}));
    this.dispatchEvent(new Event_(this, MenuEvent.UPDATE_MENU, null));
};

ControlKit_.prototype.getNode = function () {
    return this._node;
};

//
var instance = null;
var ControlKit = {};

/**
 * Initializes ControlKit.
 * @param {Object} [options] - ControlKit options
 * @param {Number} [options.opacity=1.0] - Overall opacity
 * @param {Boolean} [options.useExternalStyle=false] - If true, an external style is used instead of the build-in one
 * @param {String} [options.styleString] - If true, an external style is used instead of the build-in one
 */
ControlKit.setup = function(options){
    instance = new ControlKit_(options);
};

/**
 * Updates all ControlKit components if the wat
 */
ControlKit.update = function(){
    if(!instance){
        return;
    }
    instance.update();
};

/**
 * Adds a panel.
 * @param {Object} [params] - Panel options
 * @param {String} [params.label='Control Panel'] - The panel label
 * @param {Number} [params.width=300] - The width
 * @param {Number} [params.height] - Constrained panel height
 * @param {Number} [params.ratio=40] - The ratio of label (default:40%) and component (default:60%) width
 * @param {String} [params.align='right'] - Float 'left' or 'right', multiple panels get aligned next to each other
 * @param {Boolean} [params.fixed=true] - If false the panel can be moved
 * @param {Array} [params.position=[0,0]] - If unfixed, the panel panel position relative to alignment (eg. if 'left' 0 + position[0] or if 'right' window.innerHeight - position[0] - panelWidth)
 * @param {Number} [params.opacity=1.0] - The panel´s opacity
 * @param {String} [params.dock=false] - (Experimental) Indicates whether the panel should be docked to either the left or right window border (depending on params.align), docked panels height equal window height
 * @param {Boolean}[params.history=false] - (Experimental) Enables a value history for all components
 * @returns {Panel}
 */
ControlKit.addPanel = function(params){
    if(!instance){
        return undefined;
    }
    return instance.addPanel(params);
};

/*
ControlKit.enable = function(){
    if(!instance){
        return;
    }
    instance.enable();
};

ControlKit.disable = function(){
    if(!instance){
        return;
    }
    instance.disable();
};
*/

ControlKit.destroy = function(){
    if(!instance){
        return;
    }
    Options.get().destroy();
    Picker.get().destroy();
    instance.destroy();
};

module.exports = ControlKit;