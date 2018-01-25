!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var o;"undefined"!=typeof window?o=window:"undefined"!=typeof global?o=global:"undefined"!=typeof self&&(o=self),o.ControlKit=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var ControlKit        = require('./lib/ControlKit');
	ControlKit.Canvas = require('./lib/component/Canvas');
	ControlKit.SVG    = require('./lib/component/SVG');

module.exports = ControlKit;
},{"./lib/ControlKit":2,"./lib/component/Canvas":5,"./lib/component/SVG":22}],2:[function(require,module,exports){
var Node    = require('./core/document/Node'),
    Panel   = require('./group/Panel'),
    Options = require('./component/Options'),
    Picker  = require('./component/Picker');

var CSS = require('./core/document/CSS');

var EventDispatcher = require('./core/event/EventDispatcher'),
    Event_          = require('./core/event/Event'),
    DocumentEvent   = require('./core/document/DocumentEvent'),
    NodeEvent       = require('./core/document/NodeEvent'),
    ComponentEvent  = require('./core/ComponentEvent'),
    HistoryEvent    = require('./core/HistoryEvent'),
    MenuEvent       = require('./group/MenuEvent');

var History = require('./core/History'),
    State   = require('./core/State');

var Mouse   = require('./core/document/Mouse');

var ValuePlotter = require('./component/ValuePlotter');
var StringOutput = require('./component/StringOutput'),
    StringInput = require('./component/StringInput'),
    NumberOutput = require('./component/NumberOutput');

var DEFAULT_HISTORY = false,
    DEFAULT_OPACITY = 1.0,
    DEFAULT_PANELS_CLOSABLE = false,
    DEFAULT_ENABLE = true,
    DEFAULT_LOAD_AND_SAVE = false;

var DEFAULT_TRIGGER_SHORTCUT_CHAR = 'h';

var initiated = false;

/**
 * Initializes ControlKit.
 * @param {Object} [options] - ControlKit options
 * @param {Number} [options.opacity=1.0] - Overall opacity
 * @param {Boolean} [options.enable=true] - Initial ControlKit state, enabled / disabled
 * @param {Boolean} [options.useExternalStyle=false] - If true, an external style is used instead of the build-in one
 * @param {String} [options.styleString] - If true, an external style is used instead of the build-in one
 * @param {Boolean}[options.history=false] - (Experimental) Enables a value history for all components
 */
function ControlKit(options) {
    if(initiated){
        throw new Error('ControlKit is already initialized.');
    }
    options                  = options || {};
    options.history          = options.history === undefined ? DEFAULT_HISTORY : options.history;
    options.loadAndSave      = options.loadAndSave === undefined ? DEFAULT_LOAD_AND_SAVE : options.loadAndSave;
    options.opacity          = options.opacity === undefined ? DEFAULT_OPACITY : options.opacity;
    options.panelsClosable   = options.panelsClosable === undefined ? DEFAULT_PANELS_CLOSABLE : options.panelsClosable;
    options.useExternalStyle = options.useExternalStyle === undefined ? false : options.useExternalStyle;
    options.enable           = options.enable === undefined ? DEFAULT_ENABLE : options.enable;

    EventDispatcher.apply(this, arguments);

    var node = null;
    if (!options.parentDomElementId) {
        node = new Node();
        document.body.appendChild(node.getElement());
    } else {
        node = Node.getNodeById(options.parentDomElementId);
    }

    if(!options.useExternalStyle){
        var style = document.createElement('style');
            style.type = 'text/css';
        var css = !options.style ? require('./core/document/Style').string : options.styleString;
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
    this._enabled = options.enable;
    this._historyEnabled = options.history;
    this._statesEnabled = options.loadAndSave;
    this._panelsClosable = options.panelsClosable;

    var history = History.setup();

    if (!this._historyEnabled){
        history.disable();
    } else {
        history.addEventListener(HistoryEvent.STATE_PUSH, this, 'onHistoryStatePush');
        history.addEventListener(HistoryEvent.STATE_POP, this, 'onHistoryStatePop');
    }

    Mouse.setup();
    Picker.setup(node);
    Options.setup(node);

    var opacity = options.opacity;
    if (opacity != 1.0 && opacity != 0.0) {
        node.setStyleProperty('opacity', opacity);
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

    this._shortcutEnable = DEFAULT_TRIGGER_SHORTCUT_CHAR;

    document.addEventListener('keydown',function(e){
        if(!(e.ctrlKey && String.fromCharCode(e.which || e.keyCode).toLowerCase() == self._shortcutEnable)){
            return;
        }
        self._enabled = !self._enabled;
        if(self._enabled){
            self._enable();
        } else {
            self._disable();
        }
    });

    if(!this._enabled){
        this._disable();
    }

    initiated = true;
}
ControlKit.prototype = Object.create(EventDispatcher.prototype);
ControlKit.prototype.constructor = ControlKit;

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
  * @returns {Panel}
 */
ControlKit.prototype.addPanel = function (params) {
    var panel = new Panel(this, params);
    this._panels.push(panel);
    return panel;
};

/**
 * Updates all ControlKit components if the wat
 */
ControlKit.prototype.update = function () {
    if (!this._enabled || !this._canUpdate){
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
                    component instanceof StringInput ||
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

ControlKit.prototype.statesAreEnabled = function(){
    return this._statesEnabled;
};

ControlKit.prototype.panelsAreClosable = function () {
    return this._panelsClosable;
};

ControlKit.prototype._enable = function(){
    var i = -1, p = this._panels, l = p.length;
    while (++i < l){
        p[i].enable();
    }
    this._node.setStyleProperty('visibility', '');
};

ControlKit.prototype._disable = function(){
    var i = -1, p = this._panels, l = p.length;
    while (++i < l){
        p[i].disable();
    }
    this._node.setStyleProperty('visibility', 'hidden');
};

/**
 * Enables and shows controlKit.
 */

ControlKit.prototype.enable = function () {
    this._enable();
    this._enabled = true;
};

/**
 * Disable and hides controlKit.
 */

ControlKit.prototype.disable = function () {
    this._disable();
    this._enabled = false;
};


/**
 * Specifies the key to be used with ctrl & char, to trigger ControlKits visibility.
 * @param char
 */

ControlKit.prototype.setShortcutEnable = function(char){
    this._shortcutEnable = char;
};

ControlKit.prototype.onHistoryStatePush = function () {
    this.dispatchEvent(new Event_(this, MenuEvent.UPDATE_MENU, null));
};

ControlKit.prototype.onHistoryStatePop = function () {
    this.dispatchEvent(new Event_(this, ComponentEvent.UPDATE_VALUE, {origin: null}));
    this.dispatchEvent(new Event_(this, MenuEvent.UPDATE_MENU, null));
};

ControlKit.prototype.loadSettings = function(data){
    var i = -1, l = data.length;
    var panels = this._panels;
    while(++i < l){
        panels[i].setData(data[i]);
    }
};

ControlKit.prototype._loadState = function(){
    State.load(this.loadSettings.bind(this));
};

ControlKit.prototype._saveState = function(){
    this.update(); //force sync
    var p = this._panels, i = -1, l = p.length;
    var data = new Array(l);
    while(++i < l){
        data[i] = p[i].getData();
    }
    State.save({data:data});
};

/**
 * Returns the root element.
 * @returns {*}
 */

ControlKit.prototype.getNode = function () {
    return this._node;
};

ControlKit.destroy = function(){
    Mouse.get().destroy();
    Options.get().destroy();
    Picker.get().destroy();
    initiated = false;
};

module.exports = ControlKit;
},{"./component/NumberOutput":15,"./component/Options":16,"./component/Picker":19,"./component/StringInput":27,"./component/StringOutput":28,"./component/ValuePlotter":29,"./core/ComponentEvent":31,"./core/History":33,"./core/HistoryEvent":34,"./core/State":38,"./core/document/CSS":42,"./core/document/DocumentEvent":43,"./core/document/Mouse":44,"./core/document/Node":45,"./core/document/NodeEvent":46,"./core/document/Style":47,"./core/event/Event":48,"./core/event/EventDispatcher":49,"./group/MenuEvent":55,"./group/Panel":56}],3:[function(require,module,exports){
var Event_         = require('../core/event/Event'),
    NodeEvent      = require('../core/document/NodeEvent'),
    ComponentEvent = require('../core/ComponentEvent');

var Node      = require('../core/document/Node'),
    Component = require('../core/Component');

var CSS = require('../core/document/CSS');

var DEFAULT_LABEL = '';

function Button(parent,label,onPress,params) {
    onPress      = onPress || function(){};
    params       = params       || {};
    params.label = params.label || DEFAULT_LABEL;

    Component.apply(this,[parent,params.label]);

    var node = this._inputNode = new Node(Node.INPUT_BUTTON);

    node.setStyleClass(CSS.Button);
    node.setProperty('value',label);

    var self = this;
    node.addEventListener(NodeEvent.ON_CLICK,
                           function() {
                               onPress.bind(self)();
                               self.dispatchEvent(new Event_(self,ComponentEvent.VALUE_UPDATED));
                           });

    this._wrapNode.addChild(node);
}
Button.prototype = Object.create(Component.prototype);
Button.prototype.constructor = Button;

Button.prototype.getButtonLabel = function(){
    return this._inputNode.getProperty('value');
};

Button.prototype.setButtonLabel = function(label){
    this._inputNode.setProperty('value',label);
};

module.exports = Button;

},{"../core/Component":30,"../core/ComponentEvent":31,"../core/document/CSS":42,"../core/document/Node":45,"../core/document/NodeEvent":46,"../core/event/Event":48}],4:[function(require,module,exports){
var EventDispatcher         = require('../core/event/EventDispatcher');
var ObjectComponentNotifier = require('../core/ObjectComponentNotifier');

var Event_      = require('../core/event/Event'),
    OptionEvent = require('../core/OptionEvent'),
    NodeEvent   = require('../core/document/NodeEvent');

var Node = require('../core/document/Node');
var CSS = require('../core/document/CSS');

function ButtonPreset(parentNode) {
    EventDispatcher.apply(this);
    var node    = this._btnNode = new Node(Node.INPUT_BUTTON),
        imgNode = this._indiNode = new Node();

    this._onActive = function () {};
    this._onDeactive = function () {};
    this._isActive = false;

    node.setStyleClass(CSS.ButtonPreset);
    node.addEventListener(NodeEvent.MOUSE_DOWN, this._onMouseDown.bind(this));

    node.addChild(imgNode);
    parentNode.addChildAt(node, 0);

    ObjectComponentNotifier.get().addEventListener(OptionEvent.TRIGGER, this, 'onOptionTrigger');
    this.addEventListener(OptionEvent.TRIGGERED, ObjectComponentNotifier.get(), 'onOptionTriggered');
}
ButtonPreset.prototype = Object.create(EventDispatcher.prototype);
ButtonPreset.prototype.constructor = ButtonPreset;

ButtonPreset.prototype.onOptionTrigger = function(e){
    if(e.data.origin == this){
        if(!this._isActive){
            this._onActive();
            this._btnNode.setStyleClass(CSS.ButtonPresetActive);
            this._isActive = true;
        } else{
            this._onDeactive();
        }
        return;
    }

    if(this._isActive){
        this.deactivate();
    }
};

ButtonPreset.prototype._onMouseDown = function(){
    this.dispatchEvent(new Event_(this, OptionEvent.TRIGGERED, null));
};

ButtonPreset.prototype.setOnActive = function(func){
    this._onActive = func;
};

ButtonPreset.prototype.setOnDeactive = function(func){
    this._onDeactive = func;
};

ButtonPreset.prototype.deactivate = function(){
    this._isActive = false;
    this._btnNode.setStyleClass(CSS.ButtonPreset);
};

module.exports = ButtonPreset;

},{"../core/ObjectComponentNotifier":36,"../core/OptionEvent":37,"../core/document/CSS":42,"../core/document/Node":45,"../core/document/NodeEvent":46,"../core/event/Event":48,"../core/event/EventDispatcher":49}],5:[function(require,module,exports){
var Component = require('../core/Component');
var CSS       = require('../core/document/CSS'),
    Metric    = require('./Metric');

var Event_     = require('../core/event/Event'),
    GroupEvent = require('../group/GroupEvent');

function Canvas(parent,params) {
    Component.apply(this,arguments);

    var wrap = this._wrapNode;
        wrap.setStyleClass(CSS.CanvasWrap);
    var canvas = this._canvas = document.createElement('canvas');
        wrap.getElement().appendChild(canvas);

    var width = wrap.getWidth();
    this._canvasWidth = this._canvasHeight = 0;
    this._setCanvasSize(width,width);
    this._updateHeight();

    this._node.setStyleClass(CSS.CanvasListItem);
    this._parent.addEventListener(GroupEvent.GROUP_SIZE_CHANGE,this,  'onGroupSizeChange');
    this.addEventListener(GroupEvent.GROUP_SIZE_UPDATE,this._parent,'onGroupSizeUpdate');
}
Canvas.prototype = Object.create(Component.prototype);
Canvas.prototype.constructor = Canvas;

Canvas.prototype._updateHeight = function () {
    var canvasHeight = this._canvas.height;

    this._wrapNode.setHeight(canvasHeight);
    this._node.setHeight(canvasHeight + Metric.PADDING_WRAPPER);
};

Canvas.prototype.onGroupSizeChange = function () {
    var width = this._wrapNode.getWidth();

    this._setCanvasSize(width, width);
    this._updateHeight();
    this._redraw();

    this.dispatchEvent(new Event_(this, GroupEvent.GROUP_SIZE_UPDATE, null));
};

Canvas.prototype._setCanvasSize = function (width, height) {
    var canvasWidth = this._canvasWidth = width,
        canvasHeight = this._canvasHeight = height;

    var canvas = this._canvas;
        canvas.style.width = canvasWidth + 'px';
        canvas.style.height = canvasHeight + 'px';
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
};

Canvas.prototype.getCanvas = function () {
    return this._canvas;
};

Canvas.prototype.getContext = function () {
    return this._canvas.getContext('2d');
};

module.exports = Canvas;

},{"../core/Component":30,"../core/document/CSS":42,"../core/event/Event":48,"../group/GroupEvent":54,"./Metric":12}],6:[function(require,module,exports){
var ObjectComponent = require('../core/ObjectComponent'),
    Node            = require('../core/document/Node');

var Event_         = require('../core/event/Event'),
    NodeEvent      = require('../core/document/NodeEvent'),
    ComponentEvent = require('../core/ComponentEvent');

function Checkbox(parent, object, value, params) {
    ObjectComponent.apply(this,arguments);

    params = params || {};
    params.onChange = params.onChange || this._onChange;
    this._onChange = params.onChange;

    var node = this._input = new Node(Node.INPUT_CHECKBOX);
    node.setProperty('checked',this._obj[this._key]);
    node.addEventListener(NodeEvent.CHANGE,this._onInputChange.bind(this));

    this._wrapNode.addChild(this._input);
}
Checkbox.prototype = Object.create(ObjectComponent.prototype);
Checkbox.prototype.constructor = Checkbox;

Checkbox.prototype.applyValue = function () {
    this.pushHistoryState();

    var obj = this._obj, key = this._key;
    obj[key] = !obj[key];

    this.dispatchEvent(new Event_(this, ComponentEvent.VALUE_UPDATED, null));
};

Checkbox.prototype._onInputChange = function () {
    this.applyValue();
    this._onChange();
};

Checkbox.prototype.onValueUpdate = function (e) {
    if (e.data.origin == this){
        return;
    }
    this._input.setProperty('checked', this._obj[this._key]);
};

module.exports = Checkbox;
},{"../core/ComponentEvent":31,"../core/ObjectComponent":35,"../core/document/Node":45,"../core/document/NodeEvent":46,"../core/event/Event":48}],7:[function(require,module,exports){
var ObjectComponent = require('./../core/ObjectComponent');

var Node      = require('../core/document/Node');
var ColorMode = require('../core/color/ColorMode');
var Picker    = require('./Picker');
var ColorUtil = require('../core/color/ColorUtil');
var Options   = require('./Options');
var ButtonPreset = require('./ButtonPreset');
var Metric = require('./Metric'),
    CSS    = require('../core/document/CSS');

var Event_         = require('../core/event/Event'),
    NodeEvent      = require('../core/document/NodeEvent'),
    ComponentEvent = require('../core/ComponentEvent');

var ColorFormatError = require('../core/color/ColorFormatError');

var DEFAULT_COLOR_MODE = ColorMode.HEX,
    DEFAULT_PRESETS = null;

var MSG_COLOR_FORMAT_HEX = 'Color format should be hex. Set colorMode to rgb, rgbfv or hsv.',
    MSG_COLOR_FORMAT_RGB_RGBFV_HSV = 'Color format should be rgb, rgbfv or hsv. Set colorMode to hex.',
    MSG_COLOR_PRESET_FORMAT_HEX = 'Preset color format should be hex.',
    MSG_COLOR_PRESET_FORMAT_RGB_RGBFV_HSV = 'Preset color format should be rgb, rgbfv or hsv.';

function Color(parent, object, value, params){
    ObjectComponent.apply(this, arguments);

    params = params || {};
    params.presets = params.presets || DEFAULT_PRESETS;
    params.colorMode = params.colorMode || DEFAULT_COLOR_MODE;
    params.onChange = params.onChange || this._onChange;


    this._presetsKey = params.presets;
    this._onChange = params.onChange;

    var color = this._color = new Node();
    value = this._value = this._obj[this._key];

    var colorMode = this._colorMode = params.colorMode;

    this._validateColorFormat(value, MSG_COLOR_FORMAT_HEX, MSG_COLOR_FORMAT_RGB_RGBFV_HSV);

    var wrap = this._wrapNode;

    if(!this._presetsKey){
        color.setStyleClass(CSS.Color);
        wrap.addChild(color);
    }
    else{
        color.setStyleClass(CSS.Color);

        var wrap_ = new Node();
        wrap_.setStyleClass(CSS.WrapColorWPreset);

        wrap.addChild(wrap_);
        wrap_.addChild(color);

        var presets = this._obj[this._presetsKey];

        var i = -1;
        while(++i < presets.length){
            this._validateColorFormat(presets[i], MSG_COLOR_PRESET_FORMAT_HEX,
                MSG_COLOR_PRESET_FORMAT_RGB_RGBFV_HSV);
        }

        var options = Options.get(),
            presetBtn = new ButtonPreset(wrap);

        var onPresetDeactivate = function(){
            options.clear();
            presetBtn.deactivate();
        };

        var self = this;
        var onPresetActivate = function(){
            options.build(presets,
                self._value,
                color,
                function(){
                    self.pushHistoryState();
                    self._value = presets[options.getSelectedIndex()];
                    self.applyValue();
                    self._onChange(self._obj[self._key]);
                },
                onPresetDeactivate,
                Metric.PADDING_PRESET,
                true,
                colorMode);
        };
        presetBtn.setOnActive(onPresetActivate);
        presetBtn.setOnDeactive(onPresetDeactivate);
    }

    color.addEventListener(NodeEvent.MOUSE_DOWN, this._onColorTrigger.bind(this));
    this._updateColor();
}
Color.prototype = Object.create(ObjectComponent.prototype);
Color.prototype.constructor = Color;

Color.prototype._onColorTrigger = function(){
    var colorMode = this._colorMode,
        colorModeHEX = ColorMode.HEX,
        colorModeRGB = ColorMode.RGB,
        colorModeRGBfv = ColorMode.RGBfv,
        colorModeHSV = ColorMode.HSV;

    var value = this._value,
        temp;

    var onPickerPick = function(){
        this.pushHistoryState();

        switch(colorMode){
            case colorModeHEX:
                this._value = Picker.get().getHEX();
                break;
            case colorModeRGB:
                //if val = Float32array or so
                temp = Picker.get().getRGB();
                value[0] = temp[0];
                value[1] = temp[1];
                value[2] = temp[2];
                break;

            case colorModeRGBfv:
                temp = Picker.get().getRGBfv();
                value[0] = temp[0];
                value[1] = temp[1];
                value[2] = temp[2];
                break;

            case colorModeHSV:
                this._value = Picker.get().getHSV();
                break;
        }

        this.applyValue();

    }.bind(this);

    var picker = Picker.get();

    switch(colorMode){
        case colorModeHEX:
            picker.setColorHEX(value);
            break;
        case colorModeRGB:
            picker.setColorRGB(value[0], value[1], value[2]);
            break;
        case colorModeRGBfv:
            picker.setColorRGBfv(value[0], value[1], value[2]);
            break;
        case colorModeHSV:
            picker.setColorHSV(value[0], value[1], value[2]);
            break;
    }

    picker.setCallbackPick(onPickerPick);
    picker.open();
};

Color.prototype.applyValue = function(){
    this._obj[this._key] = this._value;
    this._updateColor();
    this.dispatchEvent(new Event_(this, ComponentEvent.VALUE_UPDATED, null));
    this._onChange(this._obj[this._key]);
};

Color.prototype.onValueUpdate = function(e){
    if(e.data.origin == this)return;
    this._value = this._obj[this._key];
    this._updateColor();
};

Color.prototype._updateColor = function(){
    var color = this._value,
        colorNode = this._color,
        nodeColor;

    colorNode.setProperty('innerHTML', color);

    switch(this._colorMode){
        case ColorMode.HEX:
            nodeColor = color;
            break;

        case ColorMode.RGB:
            nodeColor = ColorUtil.RGB2HEX(color[0], color[1], color[2]);
            break;

        case ColorMode.RGBfv:
            nodeColor = ColorUtil.RGBfv2HEX(color[0], color[1], color[2]);
            break;

        case ColorMode.HSV:
            nodeColor = ColorUtil.HSV2RGB(color[0], color[1], color[2]);
            break;
    }

    colorNode.getStyle().backgroundColor = nodeColor;
};

Color.prototype._validateColorFormat = function(value, msgHex, msgArr){
    var colorMode = this._colorMode;

    if(colorMode == ColorMode.HEX && Object.prototype.toString.call(value) === '[object Array]' ||
        colorMode == ColorMode.HEX && Object.prototype.toString.call(value) === '[object Float32Array]'){
        throw new ColorFormatError(msgHex);
    }
    if((colorMode == ColorMode.RGB ||
        colorMode == ColorMode.RGBfv ||
        colorMode == ColorMode.HSV) &&
        Object.prototype.toString.call(value) !== '[object Array]' ||
        colorMode == ColorMode.HSV &&
        Object.prototype.toString.call(value) !== '[object Float32Array]'){
        throw new ColorFormatError(msgArr);
    }
};

module.exports = Color;

},{"../core/ComponentEvent":31,"../core/color/ColorFormatError":39,"../core/color/ColorMode":40,"../core/color/ColorUtil":41,"../core/document/CSS":42,"../core/document/Node":45,"../core/document/NodeEvent":46,"../core/event/Event":48,"./../core/ObjectComponent":35,"./ButtonPreset":4,"./Metric":12,"./Options":16,"./Picker":19}],8:[function(require,module,exports){
var FunctionPlotType = {
    IMPLICIT: 'implicit',
    NON_IMPLICIT: 'nonImplicit'
};

module.exports = FunctionPlotType;
},{}],9:[function(require,module,exports){
var Plotter = require('./Plotter');

var Node = require('../core/document/Node');
var CSS = require('../core/document/CSS');
var FunctionPlotType = require('./FunctionPlotType');


var Mouse = require('../core/document/Mouse');
var Metric = require('./Metric');

var DocumentEvent  = require('../core/document/DocumentEvent'),
    ComponentEvent = require('../core/ComponentEvent'),
    NodeEvent      = require('../core/document/NodeEvent');

var FunctionPlotterObjectError       = require('./FunctionPlotterObjectError'),
    FunctionPlotterFunctionArgsError = require('./FunctionPlotterFunctionArgsError');

var ObjectComponentNotifier = require('../core/ObjectComponentNotifier');

var DEFAULT_SHOW_MIN_MAX_LABELS = true;

var DEFAULT_FUNCTION_PLOTTER_NON_IMPLICIT_UNIT_X  =  1,
    DEFAULT_FUNCTION_PLOTTER_NON_IMPLICIT_UNIT_Y  =  1,
    DEFAULT_FUNCTION_PLOTTER_IMPLICIT_UNIT_X  = 0.25,
    DEFAULT_FUNCTION_PLOTTER_IMPLICIT_UNIT_Y  = 0.25,
    DEFAULT_FUNCTION_PLOTTER_UNIT_MIN  = 0.15,
    DEFAULT_FUNCTION_PLOTTER_UNIT_MAX  = 4,
    DEFAULT_FUNCTION_PLOTTER_NON_IMPLICIT_SCALE  = 10.0,
    DEFAULT_FUNCTION_PLOTTER_IMPLICIT_SCALE = 1.0,
    DEFAULT_FUNCTION_PLOTTER_SCALE_MIN = 0.02,
    DEFAULT_FUNCTION_PLOTTER_SCALE_MAX = 25,

    DEFAULT_FUNCTION_PLOTTER_IMPLICIT_AXES_COLOR = 'rgba(255,255,255,0.75)',
    DEFAULT_FUNCTION_PLOTTER_IMPLICIT_GRID_COLOR = 'rgba(25,25,25,0.75)',

    DEFAULT_FUNCTION_PLOTTER_NON_IMPLICIT_AXES_COLOR = 'rgb(54,60,64)',
    DEFAULT_FUNCTION_PLOTTER_NON_IMPLICIT_GRID_COLOR = 'rgb(25,25,25)',

    DEFAULT_FUNCTION_PLOTTER_CIRCLE_LABEL_RADIUS = 3,
    DEFAULT_FUNCTION_PLOTTER_CIRCLE_LABEL_FILL   = 'rgb(255,255,255)',
    DEFAULT_FUNCTION_PLOTTER_CIRCLE_STROKE       = '#b12334';

function FunctionPlotter(parent, object, value, params) {
    params = params || {};
    params.showMinMaxLabels = params.showMinMaxLabels === undefined ? DEFAULT_SHOW_MIN_MAX_LABELS : params.showMinMaxLabels;

    Plotter.apply(this, arguments);

    if (typeof object[value] !== 'function') {
        throw new FunctionPlotterObjectError(object,value);
    }

    var funcArgLength = object[value].length;

    if (funcArgLength > 2 || funcArgLength == 0) {
        throw new FunctionPlotterFunctionArgsError();
    }

    var svgRoot = this._svgRoot,
        path = this._path;

    var axes = this._axes = svgRoot.insertBefore(this._createSVGObject('path'), path);
        axes.style.strokeWidth = 1;

    var axesLabels = this._axesLabels = svgRoot.insertBefore(this._createSVGObject('path'), path);
        axesLabels.style.stroke = 'rgb(43,48,51)';
        axesLabels.style.strokeWidth = 1;

    var grid = this._grid;

    var svg = this._svg,
        size = Number(svg.getAttribute('width'));

    var sliderXWrap = new Node();
        sliderXWrap.setStyleClass(CSS.GraphSliderXWrap);

    var sliderYWrap = new Node();
        sliderYWrap.setStyleClass(CSS.GraphSliderYWrap);

    var sliderXTrack = this._sliderXTrack = new Node();
        sliderXTrack.setStyleClass(CSS.GraphSliderX);

    var sliderYTrack = this._sliderYTrack = new Node();
        sliderYTrack.setStyleClass(CSS.GraphSliderY);

    var sliderXHandle = this._sliderXHandle = new Node();
        sliderXHandle.setStyleClass(CSS.GraphSliderXHandle);

    var sliderYHandle = this._sliderYHandle = new Node();
        sliderYHandle.setStyleClass(CSS.GraphSliderYHandle);

    sliderXTrack.addChild(sliderXHandle);
    sliderYTrack.addChild(sliderYHandle);
    sliderXWrap.addChild(sliderXTrack);
    sliderYWrap.addChild(sliderYTrack);

    var wrapNode = this._wrapNode;

    var plotMode = this._plotMode = funcArgLength == 1 ?
        FunctionPlotType.NON_IMPLICIT :
        FunctionPlotType.IMPLICIT;

    if (plotMode == FunctionPlotType.IMPLICIT) {
        var canvas = this._canvas = document.createElement('canvas');
        canvas.style.width = canvas.style.height = size + 'px';
        canvas.width = canvas.height = size;

        wrapNode.getElement().insertBefore(canvas, svg);

        this._canvasContext = canvas.getContext('2d');
        this._canvasImageData = this._canvasContext.getImageData(0, 0, size, size);

        axes.style.stroke = DEFAULT_FUNCTION_PLOTTER_IMPLICIT_AXES_COLOR;
        grid.style.stroke = DEFAULT_FUNCTION_PLOTTER_IMPLICIT_GRID_COLOR;
    }
    else {
        axes.style.stroke = DEFAULT_FUNCTION_PLOTTER_NON_IMPLICIT_AXES_COLOR;
        grid.style.stroke = DEFAULT_FUNCTION_PLOTTER_NON_IMPLICIT_GRID_COLOR;
    }

    wrapNode.addChild(sliderXWrap);
    wrapNode.addChild(sliderYWrap);

    sliderXHandle.addEventListener(NodeEvent.MOUSE_DOWN, this._onSliderXHandleDown.bind(this));
    sliderYHandle.addEventListener(NodeEvent.MOUSE_DOWN, this._onSliderYHandleDown.bind(this));

    var units = this._units = [null, null];
    this._scale = null;

    if (plotMode == FunctionPlotType.NON_IMPLICIT) {
        units[0] = DEFAULT_FUNCTION_PLOTTER_NON_IMPLICIT_UNIT_X;
        units[1] = DEFAULT_FUNCTION_PLOTTER_NON_IMPLICIT_UNIT_Y;

        this._scale = DEFAULT_FUNCTION_PLOTTER_NON_IMPLICIT_SCALE;
    }
    else if (plotMode == FunctionPlotType.IMPLICIT) {
        units[0] = DEFAULT_FUNCTION_PLOTTER_IMPLICIT_UNIT_X;
        units[1] = DEFAULT_FUNCTION_PLOTTER_IMPLICIT_UNIT_Y;

        this._scale = DEFAULT_FUNCTION_PLOTTER_IMPLICIT_SCALE;
    }

    this._unitsMinMax = [DEFAULT_FUNCTION_PLOTTER_UNIT_MIN, DEFAULT_FUNCTION_PLOTTER_UNIT_MAX]; //1/8->4

    this._scaleMinMax = [DEFAULT_FUNCTION_PLOTTER_SCALE_MIN, DEFAULT_FUNCTION_PLOTTER_SCALE_MAX]; //1/50 -> 25

    this._center = [Math.round(size * 0.5),Math.round(size * 0.5)];
    this._svgPos = [0, 0];

    this._func = null;
    this.setFunction(this._obj[this._key]);

    this._sliderXHandleUpdate();
    this._sliderYHandleUpdate();

    svg.addEventListener(DocumentEvent.MOUSE_DOWN, this._onDragStart.bind(this), false);
    this._wrapNode.getElement().addEventListener("mousewheel", this._onScale.bind(this, false));

    ObjectComponentNotifier.get().addEventListener(ComponentEvent.UPDATE_VALUE, this, 'onValueUpdate');
}
FunctionPlotter.prototype = Object.create(Plotter.prototype);
FunctionPlotter.prototype.constructor = FunctionPlotter;

FunctionPlotter.prototype._updateCenter = function () {
    var svg = this._svg,
        width = Number(svg.getAttribute('width')),
        height = Number(svg.getAttribute('height'));

    var mousePos = Mouse.get().getPosition(),
        svgPos = this._svgPos,
        center = this._center;

    center[0] = Math.max(0, Math.min(mousePos[0] - svgPos[0], width));
    center[1] = Math.max(0, Math.min(mousePos[1] - svgPos[1], height));

    this._plotGraph();
};

FunctionPlotter.prototype._onDragStart = function (e) {
    var svgPos = this._svgPos;
    svgPos[0] = 0;
    svgPos[1] = 0;

    //skip to container
    var element = this._svg.parentNode;

    while (element) {
        svgPos[0] += element.offsetLeft;
        svgPos[1] += element.offsetTop;
        element = element.offsetParent;
    }

    var eventMove = DocumentEvent.MOUSE_MOVE,
        eventUp = DocumentEvent.MOUSE_UP;

    var onDrag = this._updateCenter.bind(this),
        onDragEnd = function () {
            this._updateCenter.bind(this);
            document.removeEventListener(eventMove, onDrag, false);
            document.removeEventListener(eventUp, onDragEnd, false);

        }.bind(this);

    document.addEventListener(eventMove, onDrag, false);
    document.addEventListener(eventUp, onDragEnd, false);

    this._updateCenter();
};

FunctionPlotter.prototype._onScale = function (e) {
    e = window.event || e;
    this._scale += Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail))) * -1;

    var scaleMinMax = this._scaleMinMax;
    this._scale = Math.max(scaleMinMax[0], Math.min(this._scale, scaleMinMax[1]));

    this._plotGraph();

    e.preventDefault();

};

FunctionPlotter.prototype.onValueUpdate = function () {
    this.setFunction(this._obj[this._key]);
};

FunctionPlotter.prototype._redraw = function () {
    if (this._plotMode == FunctionPlotType.IMPLICIT) {
        var size = this._wrapNode.getWidth(),
            canvas = this._canvas;

        canvas.style.width = canvas.style.height = size + 'px';
        canvas.width = canvas.height = size;

        this._canvasImageData = this._canvasContext.getImageData(0, 0, size, size);
    }

    this._sliderXHandleUpdate();
    this._sliderYHandleUpdate();

    this.setFunction(this._obj[this._key]);
};

FunctionPlotter.prototype.setFunction = function (func) {
    this._func = func.bind(this._obj);
    this._plotGraph();
};

FunctionPlotter.prototype._plotGraph = function () {
    this._drawGrid();
    this._drawAxes();
    this._drawPlot();
};

FunctionPlotter.prototype._drawAxes = function () {
    var svg = this._svg,
        svgWidth = Number(svg.getAttribute('width')),
        svgHeight = Number(svg.getAttribute('height'));

    var center = this._center,
        centerX = center[0],
        centerY = center[1];

    var pathCmd = '';
    pathCmd += this._pathCmdLine(0, centerY, svgWidth, centerY);
    pathCmd += this._pathCmdLine(centerX, 0, centerX, svgHeight);

    this._axes.setAttribute('d', pathCmd);
};

FunctionPlotter.prototype._drawPlot = function () {
    var width, height;

    var center = this._center,
        centerX = center[0],
        centerY = center[1];

    var units = this._units,
        unitX, unitY;

    var scale = this._scale;
    var normval, scaledVal, value, index;
    var offsetX, offsetY;

    var i;

    if (this._plotMode == FunctionPlotType.NON_IMPLICIT) {
        var svg = this._svg;

        width = Number(svg.getAttribute('width'));
        height = Number(svg.getAttribute('height'));
        unitX = units[0] * scale;
        unitY = height / (units[1] * scale);
        offsetX = centerX / width;

        var len = Math.floor(width),
            points = new Array(len * 2);

        i = -1;
        while (++i < len) {
            normval = (-offsetX + i / len);
            scaledVal = normval * unitX;
            value = centerY - this._func(scaledVal) * unitY;

            index = i * 2;

            points[index] = i;
            points[index + 1] = value;
        }

        var pathCmd = '';
        pathCmd += this._pathCmdMoveTo(points[0], points[1]);

        i = 2;
        while (i < points.length) {
            pathCmd += this._pathCmdLineTo(points[i], points[i + 1]);
            i += 2;
        }

        this._path.setAttribute('d', pathCmd);
    }
    else {
        var canvas = this._canvas,
            context = this._canvasContext,
            imgData = this._canvasImageData;

        width = canvas.width;
        height = canvas.height;

        unitX = units[0] * scale;
        unitY = units[1] * scale;

        offsetX = centerX / width;
        offsetY = centerY / height;

        var invWidth = 1 / width,
            invHeight = 1 / height;
        var rgb = [0, 0, 0];

        var col0 = [30, 34, 36],
            col1 = [255, 255, 255];

        i = -1;
        var j;
        while (++i < height) {
            j = -1;

            while (++j < width) {
                value = this._func((-offsetX + j * invWidth) * unitX,
                    (-offsetY + i * invHeight) * unitY);

                rgb[0] = Math.floor((col1[0] - col0[0]) * value + col0[0]);
                rgb[1] = Math.floor((col1[1] - col0[1]) * value + col0[1]);
                rgb[2] = Math.floor((col1[2] - col0[2]) * value + col0[2]);

                index = (i * width + j) * 4;

                imgData.data[index] = rgb[0];
                imgData.data[index + 1] = rgb[1];
                imgData.data[index + 2] = rgb[2];
                imgData.data[index + 3] = 255;
            }
        }

        context.clearRect(0, 0, width, height);
        context.putImageData(imgData, 0, 0);
    }
};

FunctionPlotter.prototype._drawGrid = function () {
    var svg = this._svg,
        width = Number(svg.getAttribute('width')),
        height = Number(svg.getAttribute('height'));

    var scale = this._scale;

    var gridRes = this._units,
        gridSpacingX = width / (gridRes[0] * scale),
        gridSpacingY = height / (gridRes[1] * scale);

    var center = this._center,
        centerX = center[0],
        centerY = center[1];

    var gridNumTop = Math.round(centerY / gridSpacingY) + 1,
        gridNumBottom = Math.round((height - centerY) / gridSpacingY) + 1,
        gridNumLeft = Math.round(centerX / gridSpacingX) + 1,
        gridNumRight = Math.round((width - centerX) / gridSpacingX) + 1;

    var pathCmdGrid = '',
        pathCmdAxesLabels = '';

    var i, temp;

    var strokeSize = Metric.STROKE_SIZE;

    var labelTickSize = Metric.FUNCTION_PLOTTER_LABEL_TICK_SIZE,
        labelTickPaddingRight = width - labelTickSize - strokeSize,
        labelTickPaddingBottom = height - labelTickSize - strokeSize,
        labelTickPaddingRightOffset = labelTickPaddingRight - labelTickSize,
        labelTickPaddingBottomOffset = labelTickPaddingBottom - labelTickSize,
        labelTickOffsetRight = labelTickPaddingRight - (labelTickSize + strokeSize) * 2,
        labelTickOffsetBottom = labelTickPaddingBottom - (labelTickSize + strokeSize) * 2;

    i = -1;
    while (++i < gridNumTop) {
        temp = Math.round(centerY - gridSpacingY * i);
        pathCmdGrid += this._pathCmdLine(0, temp, width, temp);

        if (temp > labelTickSize){
            pathCmdAxesLabels += this._pathCmdLine(labelTickPaddingRight, temp,
                labelTickPaddingRightOffset, temp);
        }
    }

    i = -1;
    while (++i < gridNumBottom) {
        temp = Math.round(centerY + gridSpacingY * i);
        pathCmdGrid += this._pathCmdLine(0, temp, width, temp);

        if (temp < labelTickOffsetBottom){
            pathCmdAxesLabels += this._pathCmdLine(labelTickPaddingRight, temp,
                labelTickPaddingRightOffset, temp);
        }
    }

    i = -1;
    while (++i < gridNumLeft) {
        temp = Math.round(centerX - gridSpacingX * i);
        pathCmdGrid += this._pathCmdLine(temp, 0, temp, height);

        if (temp > labelTickSize){
            pathCmdAxesLabels += this._pathCmdLine(temp, labelTickPaddingBottom,
                temp, labelTickPaddingBottomOffset);
        }
    }

    i = -1;
    while (++i < gridNumRight) {
        temp = Math.round(centerX + gridSpacingX * i);
        pathCmdGrid += this._pathCmdLine(temp, 0, temp, height);

        if (temp < labelTickOffsetRight){
            pathCmdAxesLabels += this._pathCmdLine(temp, labelTickPaddingBottom,
                temp, labelTickPaddingBottomOffset);
        }
    }

    this._grid.setAttribute('d', pathCmdGrid);
    this._axesLabels.setAttribute('d', pathCmdAxesLabels);
};


FunctionPlotter.prototype._sliderXStep = function (mousePos) {
    var mouseX = mousePos[0];

    var handle = this._sliderXHandle,
        handleWidth = handle.getWidth(),
        handleWidthHalf = handleWidth * 0.5;

    var track = this._sliderXTrack,
        trackWidth = track.getWidth(),
        trackLeft = track.getPositionGlobalX();

    var strokeSize = Metric.STROKE_SIZE;

    var max = trackWidth - handleWidthHalf - strokeSize * 2;

    var pos = Math.max(handleWidthHalf, Math.min(mouseX - trackLeft, max)),
        handlePos = pos - handleWidthHalf;

    handle.setPositionX(handlePos);

    var unitsMin = this._unitsMinMax[0],
        unitsMax = this._unitsMinMax[1];

    var normVal = (pos - handleWidthHalf) / (max - handleWidthHalf),
        mappedVal = unitsMin + (unitsMax - unitsMin) * normVal;

    this._units[0] = mappedVal;

    this._plotGraph();
};

FunctionPlotter.prototype._sliderYStep = function (mousePos) {
    var mouseY = mousePos[1];

    var handle = this._sliderYHandle,
        handleHeight = handle.getHeight(),
        handleHeightHalf = handleHeight * 0.5;

    var track = this._sliderYTrack,
        trackHeight = track.getHeight(),
        trackTop = track.getPositionGlobalY();

    var max = trackHeight - handleHeightHalf - 2;

    var pos = Math.max(handleHeightHalf, Math.min(mouseY - trackTop, max)),
        handlePos = pos - handleHeightHalf;

    handle.setPositionY(handlePos);

    var unitsMax = this._unitsMinMax[0],
        unitsMin = this._unitsMinMax[1];

    var normVal = (pos - handleHeightHalf) / (max - handleHeightHalf),
        mappedVal = unitsMin + (unitsMax - unitsMin) * normVal;

    this._units[1] = mappedVal;

    this._plotGraph();
};

FunctionPlotter.prototype._onSliderXHandleDown = function () {
    this._onSliderHandleDown(this._sliderXStep.bind(this));
};

FunctionPlotter.prototype._onSliderYHandleDown = function () {
    this._onSliderHandleDown(this._sliderYStep.bind(this));
};

FunctionPlotter.prototype._onSliderHandleDown = function (sliderStepFunc) {
    var eventMouseMove = DocumentEvent.MOUSE_MOVE,
        eventMouseUp = DocumentEvent.MOUSE_UP;

    var mouse = Mouse.get();

    var onDrag = function () {
            sliderStepFunc(mouse.getPosition())
        },
        onDragEnd = function () {
            document.removeEventListener(eventMouseMove, onDrag, false);
            document.removeEventListener(eventMouseUp, onDragEnd, false);
        };

    sliderStepFunc(mouse.getPosition());
    document.addEventListener(eventMouseMove, onDrag, false);
    document.addEventListener(eventMouseUp, onDragEnd, false);
};

FunctionPlotter.prototype._sliderXHandleUpdate = function () {
    var unitMin = this._unitsMinMax[0],
        unitMax = this._unitsMinMax[1],
        unitX = this._units[0];

    var handleX = this._sliderXHandle,
        handleXWidth = handleX.getWidth(),
        handleXWidthHalf = handleXWidth * 0.5,
        trackXWidth = this._sliderXTrack.getWidth();

    var strokeSize = Metric.STROKE_SIZE;

    var handleXMin = handleXWidthHalf,
        handleXMax = trackXWidth - handleXWidthHalf - strokeSize * 2;

    handleX.setPositionX((handleXMin + (handleXMax - handleXMin) * ((unitX - unitMin) / (unitMax - unitMin))) - handleXWidthHalf);
};

FunctionPlotter.prototype._sliderYHandleUpdate = function () {
    var unitMin = this._unitsMinMax[0],
        unitMax = this._unitsMinMax[1],
        unitY = this._units[1];

    var handleY = this._sliderYHandle,
        handleYHeight = handleY.getHeight(),
        handleYHeightHalf = handleYHeight * 0.5,
        trackYHeight = this._sliderYTrack.getHeight();

    var strokeSize = Metric.STROKE_SIZE;

    var handleYMin = trackYHeight - handleYHeightHalf - strokeSize * 2,
        handleYMax = handleYHeightHalf;

    handleY.setPositionY((handleYMin + (handleYMax - handleYMin) * ((unitY - unitMin) / (unitMax - unitMin))) - handleYHeightHalf);
};

module.exports = FunctionPlotter;
},{"../core/ComponentEvent":31,"../core/ObjectComponentNotifier":36,"../core/document/CSS":42,"../core/document/DocumentEvent":43,"../core/document/Mouse":44,"../core/document/Node":45,"../core/document/NodeEvent":46,"./FunctionPlotType":8,"./FunctionPlotterFunctionArgsError":10,"./FunctionPlotterObjectError":11,"./Metric":12,"./Plotter":20}],10:[function(require,module,exports){
function FunctionPlotterFunctionArgsError(){
	Error.apply(this);
	Error.captureStackTrace(this,FunctionPlotterFunctionArgsError);
	this.name = 'FunctionPlotterFunctionArgsError';
	this.message = 'Function should be of form f(x) or f(x,y).';
}
FunctionPlotterFunctionArgsError.prototype = Object.create(Error.prototype);
FunctionPlotterFunctionArgsError.prototype.constructor = FunctionPlotterFunctionArgsError;

module.exports = FunctionPlotterFunctionArgsError;
},{}],11:[function(require,module,exports){
function FunctionPlotterObjectError(object,key){
	Error.apply(this);
	Error.captureStackTrace(this,FunctionPlotterObjectError);
	this.name = 'ComponentObjectError';
	this.message = 'Object ' + object.constructor.name + ' ' + key + 'should be of type Function.';
}
FunctionPlotterObjectError.prototype = Object.create(Error.prototype);
FunctionPlotterObjectError.prototype.constructor = FunctionPlotterObjectError;

module.exports = FunctionPlotterObjectError;
},{}],12:[function(require,module,exports){
var Metric = {
	COMPONENT_MIN_HEIGHT: 25,
	STROKE_SIZE: 1,
	PADDING_WRAPPER: 12,
	PADDING_OPTIONS: 2,
	PADDING_PRESET: 20,

	SCROLLBAR_TRACK_PADDING: 2,
	FUNCTION_PLOTTER_LABEL_TICK_SIZE: 6
};

module.exports = Metric;
},{}],13:[function(require,module,exports){
var ObjectComponent = require('../core/ObjectComponent');
var NumberInput_Internal = require('./NumberInput_Internal');

var Node = require('../core/document/Node');

var Options = require('./Options');
var ButtonPreset = require('./ButtonPreset');
var CSS = require('../core/document/CSS'),
    Metric = require('./Metric');

var Event_ = require('../core/event/Event'),
    DocumentEvent = require('../core/document/DocumentEvent'),
    NodeEvent = require('../core/document/NodeEvent'),
    ComponentEvent = require('../core/ComponentEvent');

var DEFAULT_INPUT_DP     = 2,
    DEFAULT_INPUT_STEP   = 1,
    DEFAULT_INPUT_PRESET = null;



function NumberInput(parent,object,value,params) {
    ObjectComponent.apply(this,arguments);

    params          = params || {};
    params.onBegin  = params.onBegin || null;
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || null;
    params.onError  = params.onError || null;
    params.dp       = (params.dp === undefined || params.dp == null) ? DEFAULT_INPUT_DP : params.dp;
    params.step     = params.step     || DEFAULT_INPUT_STEP;
    params.presets  = params.presets  || DEFAULT_INPUT_PRESET;

    this._onBegin     = params.onBegin;
    this._onChange    = params.onChange;
    this._presetsKey  = params.presets;

    var input = this._input = new NumberInput_Internal(params.step,
                                                       params.dp,
                                                       params.onBegin,
                                                       this._onInputChange.bind(this),
                                                       params.onFinish,
                                                       params.onError);

    var wrap = this._wrapNode;

    var presets =  params.presets;
    if (!presets) {
        wrap.addChild(input.getNode());
    }
    else {
        var wrap_ = new Node();
            wrap_.setStyleClass(CSS.WrapInputWPreset);

        wrap.addChild(wrap_);
        wrap_.addChild(input.getNode());

        var options   = Options.get();
        var presetBtn = this._btnPreset = new ButtonPreset(this._wrapNode);

        var onPresetDeactivate = function(){
            options.clear();
            presetBtn.deactivate();
        };

        var self = this;
        var onPresetActivate = function () {
            options.build(presets, input.getValue(), input.getNode(),
                function () {
                    input.setValue(presets[options.getSelectedIndex()]);
                    self.applyValue();
                    self._onChange(self._obj[self._key]);
                },
                onPresetDeactivate, Metric.PADDING_PRESET,
                false);
        };
        presetBtn.setOnActive(onPresetActivate);
        presetBtn.setOnDeactive(onPresetDeactivate)
    }

    input.getNode().addEventListener(NodeEvent.MOUSE_DOWN,   this._onInputDragStart.bind(this));
    this.addEventListener(ComponentEvent.INPUT_SELECT_DRAG,this._parent,'onComponentSelectDrag');

    input.setValue(this._obj[this._key]);
}
NumberInput.prototype = Object.create(ObjectComponent.prototype);
NumberInput.prototype.constructor = NumberInput;

NumberInput.prototype._onInputChange = function () {
    this.applyValue();
    this._onChange(this._obj[this._key]);
};

NumberInput.prototype.applyValue = function() {
    this.pushHistoryState();
    this._obj[this._key] = this._input.getValue();
    this.dispatchEvent(new Event_(this,ComponentEvent.VALUE_UPDATED,null));
};

NumberInput.prototype.onValueUpdate = function (e) {
    if (e.data.origin == this){
        return;
    }
    this._input.setValue(this._obj[this._key]);
};

//Prevent chrome select drag
NumberInput.prototype._onInputDragStart = function () {
    var eventMove = DocumentEvent.MOUSE_MOVE,
        eventUp = DocumentEvent.MOUSE_UP;

    var event = ComponentEvent.INPUT_SELECT_DRAG;

    var self = this;

    var onDrag = function () {
            self.dispatchEvent(new Event_(this, event, null));
        },
        onDragFinish = function () {
            self.dispatchEvent(new Event_(this, event, null));
            document.removeEventListener(eventMove, onDrag, false);
            document.removeEventListener(eventMove, onDragFinish, false);
        };

    this.dispatchEvent(new Event_(this, event, null));

    document.addEventListener(eventMove, onDrag, false);
    document.addEventListener(eventUp, onDragFinish, false);
};

module.exports = NumberInput;
},{"../core/ComponentEvent":31,"../core/ObjectComponent":35,"../core/document/CSS":42,"../core/document/DocumentEvent":43,"../core/document/Node":45,"../core/document/NodeEvent":46,"../core/event/Event":48,"./ButtonPreset":4,"./Metric":12,"./NumberInput_Internal":14,"./Options":16}],14:[function(require,module,exports){
var EventDispatcher = require('../core/event/EventDispatcher'),
    NodeEvent = require('../core/document/NodeEvent');
var Node      = require('../core/document/Node');

var PRESET_SHIFT_MULTIPLIER  = 10;
var NUM_REGEX = /^-?\d*\.?\d*$/;

var setCaretPos = null,
    selectAll = null;

function inputSetValue(input,value){
    input.setProperty('value',value);
    input.dispatchEvent(new Event('input'));
}

NumberInput_Internal = function (stepValue, dp, onBegin, onChange, onFinish, onError) {
    EventDispatcher.apply(this, null);

    this._value = 0;
    this._valueStep = stepValue;
    this._valueDp   = dp;

    this._onBegin = onBegin || function (){};
    this._onChange = onChange || function () {};
    this._onFinish = onFinish || function() {};
    this._onError = onError || function() {};

    this._keyCode = null;
    this._caretOffset = 0;

    var input = this._input = new Node('text');
        input.setProperty('value', this._value);

    input.addEventListener('input',this._onInput.bind(this));
    input.addEventListener('keydown',this._onKeydown.bind(this));

    if(!setCaretPos){
        if(input.getElement().setSelectionRange){
            setCaretPos = function(input,pos){
                input.getElement().setSelectionRange(pos,pos);
            };
            selectAll = function(input){
                input.getElement().setSelectionRange(0,input.getProperty('value').length);
            };
        } else {
            setCaretPos = function(input,pos){
                var range = input.getElement().createTextRange();
                    range.collapse(true);
                    range.moveEnd('character',pos);
                    range.moveStart('character',pos);
                    range.select();
            };
            selectAll = function(input){
                var range = input.getElement().createTextRange();
                    range.collapse(true);
                    range.moveStart('character',0);
                    range.moveEnd('character',input.getProperty('value').length);
                    range.select();
            }
        }
    }
};
NumberInput_Internal.prototype = Object.create(EventDispatcher.prototype);
NumberInput_Internal.prototype.constructor = NumberInput_Internal;

NumberInput_Internal.prototype._setValue = function(value){
    var prefix =  ((value = +value) || 1 / value) < 0 && value == 0 ? '-' : ''; //-0
        value = Number(value).toFixed(this._valueDp);
    this._input.setProperty('value',prefix + value);
    this._value = Number(value);
};

NumberInput_Internal.prototype._onInput = function(){
    var input = this._input,
        value = input.getProperty('value'),
        start = input.getProperty('selectionStart'),
        dp    = this._valueDp;

    var first = value[0];

    if(value == ''){
        value = 0;
    } else if(first === '.'){
        value = '0' + value;
    }

    if(!NUM_REGEX.test(value) || value == '-'){
        input.setProperty('value',this._value.toFixed(dp));
        setCaretPos(input,Math.max(--start,0));
        this._onError(this._keyCode);
        return;
    }
    this._onBegin(this._value);
    this._setValue(value);
    setCaretPos(input,start - this._caretOffset);
    this._onChange();
};

NumberInput_Internal.prototype._onKeydown = function(e){
    var keyCode = this._keyCode = e.keyCode;

    if(keyCode == 13){
        this._onFinish();
        e.preventDefault();
        return;
    }

    var input  = this._input,
        value  = input.getProperty('value');
    var start  = input.getProperty('selectionStart'),
        end    = input.getProperty('selectionEnd');
    var length = value.length;

    var isBackspaceDelete = keyCode == 8 || keyCode == 45,
        isMetaKey = e.metaKey,
        isCtrlKey = e.ctrlKey,
        isLeft = keyCode == 37,
        isRight = keyCode == 39,
        isLeftRight = isLeft || isRight,
        isShift = e.shiftKey,
        isUpDown = keyCode == 38 || keyCode == 40,
        isSelectAll = (isMetaKey || isCtrlKey) && keyCode == 65,
        isRangeSelected = start != end,
        isAllSelected = start == 0 && end == length,
        isMinus = keyCode == 189;

    var indexDecimalMark = value.indexOf('.');

    this._caretOffset = 0;

    //prevent cmd-z || ctrl-z
    if((isMetaKey || isCtrlKey) && keyCode == 90){
        e.preventDefault();
        return;
    }
    //select all cmd+a || ctrl+a
    if(isSelectAll){
        selectAll(input);
        e.preventDefault();
        return;
    }
    //everything is selected
    if(isAllSelected) {
        if (isMinus) {
            //set negative zero, as starting point for negative number
            inputSetValue(input, '-0');
            //set caret after  '-'
            setCaretPos(input, 1);
        } else {
            //delete number / replace / ignore
            inputSetValue(input, isBackspaceDelete ? 0 : String.fromCharCode(keyCode));
            //jump to start <--> end
            setCaretPos(input, isLeft ? start : end);
        }
        e.preventDefault();
        return;
    }
    //jump over decimal mark
    if(isBackspaceDelete && (start-1 == indexDecimalMark)){
        setCaretPos(input,start-1);
        return;
    }
    // 0|. enter first dp without jumping over decimal mark
    if(!isLeftRight && (value[0] == '0' && start == 1)){
        setCaretPos(input,1);
        this._caretOffset = 1;
        return;
    }
    //increase / decrease number by (step up / down) * multiplier on shift down
    if(isUpDown){
        var step = (isShift ? PRESET_SHIFT_MULTIPLIER : 1) * this._valueStep,
            mult = keyCode == 38 ? 1.0 : -1.0;
        inputSetValue(input,Number(value) + (step * mult));
        setCaretPos(input,start);
        e.preventDefault();
        return;
    }
    //range selected, not in selection process
    if(isRangeSelected && !(isShift && isLeftRight)){
        //jump to start <--> end
        if(isLeftRight){
            setCaretPos(input,isLeft ? start : end);
        } else { //replace complete range, not just parts
            value = value.substr(0,start) + String.fromCharCode(keyCode) + value.substr(end,length-end);
            inputSetValue(input,value);
            setCaretPos(input,end);
        }
        e.preventDefault();
        return;
    }
    //caret within fractional part, not moving caret, selecting, deleting
    if(!isShift && !isLeftRight && !isBackspaceDelete && (start > indexDecimalMark && start < length)){
        value = value.substr(0,start) + String.fromCharCode(keyCode) + value.substr(start+1,length-1);
        inputSetValue(input,value);
        setCaretPos(input,Math.min(start+1,length-1));
        e.preventDefault();
        return;
    }
    //caret at end of number, do nothing
    if(!isBackspaceDelete && !isLeftRight && !isUpDown && start >= length){
        e.preventDefault();
    }
};

NumberInput_Internal.prototype.getValue = function () {
    return this._value;
};

NumberInput_Internal.prototype.setValue = function (n) {
    this._setValue(n);
};

NumberInput_Internal.prototype.getNode = function () {
    return this._input;
};

module.exports = NumberInput_Internal;

},{"../core/document/Node":45,"../core/document/NodeEvent":46,"../core/event/EventDispatcher":49}],15:[function(require,module,exports){
var Output = require('./Output');

var DEFAULT_OUTPUT_DP = 2;

function NumberOutput(parent, object, value, params) {
	params = params || {};
	params.dp = params.dp || DEFAULT_OUTPUT_DP;

	Output.apply(this, arguments);
	this._valueDp = params.dp + 1;
}
NumberOutput.prototype = Object.create(Output.prototype);
NumberOutput.prototype.constructor = NumberOutput;

//FIXME
NumberOutput.prototype._setValue = function () {
	if (this._parent.isDisabled()){
		return;
	}

	var value = this._obj[this._key],
		textArea = this._textArea,
		dp = this._valueDp;

	var index,
		out;

	if (typeof(value) === 'object' &&
		typeof(value.length) === 'number' &&
		typeof(value.splice) === 'function' &&
		!value.propertyIsEnumerable('length')) {

		out = value.slice();

		var i = -1;
		var temp;
		var wrap = this._wrap;

		while (++i < out.length) {
			temp = out[i] = out[i].toString();
			index = temp.indexOf('.');
			if (index > 0){
				out[i] = temp.slice(0, index + dp);
			}
		}

		if (wrap) {
			textArea.setStyleProperty('white-space', 'nowrap');
			out = out.join('\n');
		}

		textArea.setProperty('value', out);
	}else {
		out = value.toString();
		index = out.indexOf('.');
		textArea.setProperty('value', index > 0 ? out.slice(0, index + dp) : out);
	}

};

module.exports = NumberOutput;
},{"./Output":17}],16:[function(require,module,exports){
var Node = require('../core/document/Node');
var DocumentEvent = require('../core/document/DocumentEvent'),
    NodeEvent     = require('../core/document/NodeEvent');
var CSS = require('../core/document/CSS');
var ColorMode = require('../core/color/ColorMode');
var ColorUtil = require('../core/color/ColorUtil');
var Metric = require('./Metric');

function Options(parentNode) {
    this._parenNode = parentNode;

    var node = this._node = new Node();
    var listNode = this._listNode = new Node(Node.LIST);

    node.setStyleClass(CSS.Options);
    node.addChild(listNode);

    this._selectedIndex = null;
    this._callbackOut = function () { };

    this._unfocusable = false;

    document.addEventListener(DocumentEvent.MOUSE_DOWN, this._onDocumentMouseDown.bind(this));
    document.addEventListener(DocumentEvent.MOUSE_UP, this._onDocumentMouseUp.bind(this));

    this.clear();
}

Options.prototype = {
    _onDocumentMouseDown: function () {
        if (!this._unfocusable)return;
        this._callbackOut();
    },

    _onDocumentMouseUp: function () {
        this._unfocusable = true;
    },

    build: function (entries, selected, element, callbackSelect, callbackOut, paddingRight, areColors, colorMode) {
        this._clearList();

        this._parenNode.addChild(this.getNode());

        var rootNode = this._node,
            listNode = this._listNode;

        paddingRight = paddingRight || 0;

        var self = this;

        // build list
        var itemNode, entry;
        var i = -1;

        if (areColors) {
            colorMode = colorMode || ColorMode.HEX;

            listNode.setStyleClass(CSS.Color);

            var color, nodeColor;

            while (++i < entries.length) {
                entry = entries[i];
                itemNode = listNode.addChild(new Node(Node.LIST_ITEM));
                color = itemNode.addChild(new Node());

                switch (colorMode) {
                    case ColorMode.HEX:
                        nodeColor = entry;
                        break;
                    case ColorMode.RGB:
                        nodeColor = ColorUtil.RGB2HEX(entry[0], entry[1], entry[2]);
                        break;
                    case ColorMode.RGBfv:
                        nodeColor = ColorUtil.RGBfv2HEX(entry[0], entry[1], entry[2]);
                        break;
                    case ColorMode.HSV:
                        nodeColor = ColorUtil.HSV2RGB(entry[0], entry[1], entry[2]);
                        break;
                }

                color.getStyle().backgroundColor = nodeColor;
                color.getStyle().backgroundImage = 'linear-gradient( rgba(0,0,0,0) 0%, rgba(0,0,0,0.1) 100%)';
                color.setProperty('innerHTML', entry);

                if (entry == selected)itemNode.setStyleClass(CSS.OptionsSelected);

                itemNode.addEventListener(NodeEvent.MOUSE_DOWN,
                    function () {
                        self._selectedIndex = Array.prototype.indexOf.call(this.parentNode.children, this);
                        callbackSelect();
                    });
            }

        }
        else {
            listNode.deleteStyleClass();

            while (++i < entries.length) {
                entry = entries[i];

                itemNode = listNode.addChild(new Node(Node.LIST_ITEM));
                itemNode.setProperty('innerHTML', entry);
                if (entry == selected)itemNode.setStyleClass(CSS.OptionsSelected);

                itemNode.addEventListener(NodeEvent.MOUSE_DOWN,
                    function () {
                        self._selectedIndex = Array.prototype.indexOf.call(this.parentNode.children, this);
                        callbackSelect();
                    });
            }
        }

        //position, set width and enable

        var elementPos = element.getPositionGlobal(),
            elementWidth = element.getWidth() - paddingRight,
            elementHeight = element.getHeight();

        var listWidth = listNode.getWidth(),
            listHeight = listNode.getHeight(),
            strokeOffset = Metric.STROKE_SIZE * 2;

        var paddingOptions = Metric.PADDING_OPTIONS;

        var width = (listWidth < elementWidth ? elementWidth : listWidth) - strokeOffset,
            posX = elementPos[0],
            posY = elementPos[1] + elementHeight - paddingOptions;

        var windowWidth = window.innerWidth,
            windowHeight = window.innerHeight;

        var rootPosX = (posX + width) > windowWidth ? (posX - width + elementWidth - strokeOffset) : posX,
            rootPosY = (posY + listHeight) > windowHeight ? (posY - listHeight * 0.5 - elementHeight * 0.5) : posY;

        listNode.setWidth(width);
        rootNode.setPositionGlobal(rootPosX, rootPosY);

        this._callbackOut = callbackOut;
        this._unfocusable = false;
    },

    _clearList: function () {
        this._listNode.removeAllChildren();
        this._listNode.deleteStyleProperty('width');
        this._selectedIndex = null;
        this._build = false;
    },

    clear: function () {
        this._clearList();
        this._callbackOut = function () {
        };
        this._parenNode.removeChild(this.getNode());

    },

    isBuild: function () {
        return this._build;
    },
    getNode: function () {
        return this._node;
    },
    getSelectedIndex: function () {
        return this._selectedIndex;
    }
};

Options.setup = function(parentNode){return Options._instance = new Options(parentNode);};
Options.get   = function(){return Options._instance;};
Options.destroy = function(){Options._instance = null;};

module.exports = Options;
},{"../core/color/ColorMode":40,"../core/color/ColorUtil":41,"../core/document/CSS":42,"../core/document/DocumentEvent":43,"../core/document/Node":45,"../core/document/NodeEvent":46,"./Metric":12}],17:[function(require,module,exports){
var ObjectComponent = require('../core/ObjectComponent');
var Node = require('../core/document/Node');

var CSS       = require('../core/document/CSS');
var Metric    = require('./Metric');
var ScrollBar = require('../core/layout/ScrollBar');

var Event_         = require('../core/event/Event'),
    DocumentEvent  = require('../core/document/DocumentEvent'),
    NodeEvent      = require('../core/document/NodeEvent'),
    ComponentEvent = require('../core/ComponentEvent');

var DEFAULT_HEIGHT = null,
    DEFAULT_WRAP   = false,
    DEFAULT_UPDATE = true;

function Output(parent,object,value,params) {
    ObjectComponent.apply(this,arguments);

    params        = params        || {};
    params.height = params.height || DEFAULT_HEIGHT;
    params.wrap   = params.wrap   === undefined ? DEFAULT_WRAP : params.wrap;
    params.update = params.update === undefined ? DEFAULT_UPDATE : params.update;

    this._wrap   = params.wrap;
    this._update = params.update;

    var textArea = this._textArea = new Node(Node.TEXTAREA),
        wrap = this._wrapNode,
        root = this._node;

        textArea.setProperty('readOnly',true);
        wrap.addChild(textArea);

        textArea.addEventListener(NodeEvent.MOUSE_DOWN,this._onInputDragStart.bind(this));
        this.addEventListener(ComponentEvent.INPUT_SELECT_DRAG,this._parent,'onComponentSelectDrag');


    if(params.height){
        var textAreaWrap = new Node();
            textAreaWrap.setStyleClass(CSS.TextAreaWrap);
            textAreaWrap.addChild(textArea);
            wrap.addChild(textAreaWrap);

        //FIXME
        var height  = this._height = params.height,
            padding = 4;

            textArea.setHeight(Math.max(height + padding  ,Metric.COMPONENT_MIN_HEIGHT));
            wrap.setHeight(textArea.getHeight());
            root.setHeight(wrap.getHeight() + padding);

        this._scrollBar = new ScrollBar(textAreaWrap,textArea,height - padding)
    }

    if(params.wrap){
        textArea.setStyleProperty('white-space','pre-wrap');
    }

    this._prevString = '';
    this._prevScrollHeight = -1;
    this._setValue();
}
Output.prototype = Object.create(ObjectComponent.prototype);
Output.prototype.constructor = Output;

//Override in subclass
Output.prototype._setValue = function () {};

Output.prototype.onValueUpdate = function () {
    this._setValue();
};

Output.prototype.update = function () {
    if(!this._update){
        return;
    }
    this._setValue();
};

//Prevent chrome select drag

Output.prototype._onDrag = function(){
    this.dispatchEvent(new Event_(this, ComponentEvent.INPUT_SELECT_DRAG, null));
};

Output.prototype._onDragFinish = function(){
    this.dispatchEvent(new Event_(this, ComponentEvent.INPUT_SELECT_DRAG, null));

    document.removeEventListener(DocumentEvent.MOUSE_MOVE, this._onDrag, false);
    document.removeEventListener(DocumentEvent.MOUSE_MOVE, this._onDragFinish, false);
};

Output.prototype._onInputDragStart = function() {
    this.dispatchEvent(new Event_(this, ComponentEvent.INPUT_SELECT_DRAG, null));
    document.addEventListener(DocumentEvent.MOUSE_MOVE, this._onDrag.bind(this), false);
    document.addEventListener(DocumentEvent.MOUSE_UP,   this._onDragFinish.bind(this), false);
};


module.exports = Output;

},{"../core/ComponentEvent":31,"../core/ObjectComponent":35,"../core/document/CSS":42,"../core/document/DocumentEvent":43,"../core/document/Node":45,"../core/document/NodeEvent":46,"../core/event/Event":48,"../core/layout/ScrollBar":51,"./Metric":12}],18:[function(require,module,exports){
var Plotter = require('./Plotter');
var Mouse = require('../core/document/Mouse');

var Event_         = require('../core/event/Event'),
    DocumentEvent  = require('../core/document/DocumentEvent'),
    ComponentEvent = require('../core/ComponentEvent');

var DEFAULT_BOUNDS_X = [-1,1],
    DEFAULT_BOUNDS_Y = [-1,1],
    DEFAULT_LABEL_X  = '',
    DEFAULT_LABEL_Y  = '';

function Pad(parent, object, value, params) {
    Plotter.apply(this,arguments);

    params            = params            || {};
    params.boundsX    = params.boundsX    || DEFAULT_BOUNDS_X;
    params.boundsY    = params.boundsY    || DEFAULT_BOUNDS_Y;
    params.labelX     = params.labelX     || DEFAULT_LABEL_X;
    params.labelY     = params.labelY     || DEFAULT_LABEL_Y;

    params.showCross  = params.showCross  || true;


    this._onChange     = params.onChange || this._onChange;
    this._onFinish     = params.onFinish || function(){};

    this._boundsX      = params.boundsX;
    this._boundsY      = params.boundsY;
    this._labelAxisX   = params.labelX != '' && params.labelX != 'none' ? params.labelX : null;
    this._labelAxisY   = params.labelY != '' && params.labelY != 'none' ? params.labelY : null;

    var path = this._path;
        path.style.strokeWidth = 1;
        path.style.stroke      = '#363c40';

    this._grid.style.stroke = 'rgb(25,25,25)';

    this._svgPos = [0,0];


    var handle = this._handle = this._svgRoot.appendChild(this._createSVGObject('g'));
    var handleCircle0 = handle.appendChild(this._createSVGObject('circle'));
        handleCircle0.setAttribute('r',String(11));
        handleCircle0.setAttribute('fill','rgba(0,0,0,0.05)');
    var handleCircle1 = handle.appendChild(this._createSVGObject('circle'));
        handleCircle1.setAttribute('r',String(10));
        handleCircle1.setAttribute('fill','rgb(83,93,98)');

    var handleCircle2 = handle.appendChild(this._createSVGObject('circle'));
        handleCircle2.setAttribute('r',String(9));
        handleCircle2.setAttribute('fill','rgb(57,69,76)');
        handleCircle2.setAttribute('cy',String(0.75));

    var handleCircle3 = handle.appendChild(this._createSVGObject('circle'));
        handleCircle3.setAttribute('r',String(10));
        handleCircle3.setAttribute('stroke','rgb(17,19,20)');
        handleCircle3.setAttribute('stroke-width',String(1));
        handleCircle3.setAttribute('fill','none');

    var handleCircle4 = handle.appendChild(this._createSVGObject('circle'));
        handleCircle4.setAttribute('r',String(6));
        handleCircle4.setAttribute('fill','rgb(30,34,36)');
    var handleCircle5 = handle.appendChild(this._createSVGObject('circle'));
        handleCircle5.setAttribute('r',String(3));
        handleCircle5.setAttribute('fill','rgb(255,255,255)');

        handle.setAttribute('tranform','translate(0 0)');

    this._svg.addEventListener(DocumentEvent.MOUSE_DOWN,this._onDragStart.bind(this),false);
    this._drawValue(this._obj[this._key]);
}
Pad.prototype = Object.create(Plotter.prototype);
Pad.prototype.constructor = Pad;

Pad.prototype._onDragStart = function () {
    var svgPos = this._svgPos;
    svgPos[0] = 0;
    svgPos[1] = 0;

    //skip to container
    var element = this._svg.parentNode;

    while (element) {
        svgPos[0] += element.offsetLeft;
        svgPos[1] += element.offsetTop;
        element = element.offsetParent;
    }

    var eventMove = DocumentEvent.MOUSE_MOVE,
        eventUp   = DocumentEvent.MOUSE_UP;

    var onDrag = function () {
        this._drawValueInput();
        this.applyValue();
        this._onChange();
    }.bind(this);

    var onDragEnd = function () {
        this.pushHistoryState();
        this._drawValueInput();
        this.applyValue();
        this._onFinish();

        document.removeEventListener(eventMove, onDrag, false);
        document.removeEventListener(eventUp, onDragEnd, false);
    }.bind(this);

    document.addEventListener(eventMove, onDrag,    false);
    document.addEventListener(eventUp,   onDragEnd, false);

    this._drawValueInput();
    this.applyValue();
    this._onChange();
};

Pad.prototype._redraw = function () {
    this._drawValue(this._obj[this._key]);
};

Pad.prototype._drawValueInput = function () {
    this._drawValue(this._getMouseNormalized());
};

Pad.prototype._drawValue = function (value) {
    this._obj[this._key] = value;
    this._drawGrid();
    this._drawPoint();
};

Pad.prototype._drawGrid = function () {
    var svgSize = Number(this._svg.getAttribute('width')),
        svgMidX = Math.floor(svgSize * 0.5),
        svgMidY = Math.floor(svgSize * 0.5);

    var pathCmd = '';
    pathCmd += this._pathCmdLine(0, svgMidY, svgSize, svgMidY);
    pathCmd += this._pathCmdLine(svgMidX, 0, svgMidX, svgSize);

    this._grid.setAttribute('d', pathCmd);
};


Pad.prototype._drawPoint = function () {
    var svgSize = Number(this._svg.getAttribute('width'));

    var value = this._obj[this._key];

    var localX = ( 0.5 + value[0] * 0.5 ) * svgSize,
        localY = ( 0.5 + -value[1] * 0.5 ) * svgSize;

    var pathCmd = '';
        pathCmd += this._pathCmdLine(0, localY, svgSize, localY);
        pathCmd += this._pathCmdLine(localX, 0, localX, svgSize);

    this._path.setAttribute('d', pathCmd);
    this._handle.setAttribute('transform', 'translate(' + localX + ' ' + localY + ')');
};

Pad.prototype._getMouseNormalized = function () {
    var offset = this._svgPos,
        mouse = Mouse.get().getPosition(),
        svgSize = Number(this._svg.getAttribute('width'));

    return [-1 + Math.max(0, Math.min(mouse[0] - offset[0], svgSize)) / svgSize * 2,
            ( 1 - Math.max(0, Math.min(mouse[1] - offset[1], svgSize)) / svgSize * 2)];

};

Pad.prototype.applyValue = function () {
    this.dispatchEvent(new Event_(this, ComponentEvent.VALUE_UPDATED, null));
};

Pad.prototype.onValueUpdate = function (e) {
    if (e.data.origin == this)return;
    this._drawValue(this._obj[this._key]);
};

module.exports = Pad;

},{"../core/ComponentEvent":31,"../core/document/DocumentEvent":43,"../core/document/Mouse":44,"../core/event/Event":48,"./Plotter":20}],19:[function(require,module,exports){
var Node = require('../core/document/Node');

var CSS = require('../core/document/CSS');
var NumberInput_Internal = require('./NumberInput_Internal');
var Mouse = require('../core/document/Mouse');
var ColorUtil = require('../core/color/ColorUtil');
var DocumentEvent = require('../core/document/DocumentEvent'),
    NodeEvent     = require('../core/document/NodeEvent');

var DEFAULT_VALUE_HUE = 200.0,
    DEFAULT_VALUE_SAT = 50.0,
    DEFAULT_VALUE_VAL = 50.0;

function Picker(parentNode){
    var root = this._node     = new Node().setStyleClass(CSS.Picker),
        head = this._headNode = new Node().setStyleClass(CSS.Head),
        labelWrap = new Node().setStyleClass(CSS.Wrap),
        label = new Node().setStyleClass(CSS.Label),
        menu = new Node().setStyleClass(CSS.Menu),
        menuWrap = new Node().setStyleClass(CSS.Wrap);

    var menuClose = new Node(Node.INPUT_BUTTON);
        menuClose.setStyleClass(CSS.ButtonMenuClose);

    var fieldWrap  = new Node().setStyleClass( CSS.PickerFieldWrap),
        sliderWrap = new Node().setStyleClass(CSS.SliderWrap),
        inputWrap  = new Node().setStyleClass( CSS.PickerInputWrap);

    var canvasField  = this._canvasField  = document.createElement('canvas'),
        canvasSlider = this._canvasSlider = document.createElement('canvas');

        fieldWrap.getElement().appendChild(canvasField);
        sliderWrap.getElement().appendChild(canvasSlider);

        this._setSizeCanvasField(154,154);
        this._setSizeCanvasSlider(14,154);

    var contextCanvasField  = this._contextCanvasField  = canvasField.getContext('2d'),
        contextCanvasSlider = this._contextCanvasSlider = canvasSlider.getContext('2d');

    var handleField  = this._handleField  = new Node();
        handleField.setStyleClass(CSS.PickerHandleField);

    var handleSlider = this._handleSlider = new Node();
        handleSlider.setStyleClass(CSS.PickerHandleSlider);

    var step = 1.0,
        dp   = 0;

    var callbackHue = this._onInputHueChange.bind(this),
        callbackSat = this._onInputSatChange.bind(this),
        callbackVal = this._onInputValChange.bind(this),
        callbackR   = this._onInputRChange.bind(this),
        callbackG   = this._onInputGChange.bind(this),
        callbackB   = this._onInputBChange.bind(this);


    var inputHue = this._inputHue = new NumberInput_Internal(step,dp,null,callbackHue),
        inputSat = this._inputSat = new NumberInput_Internal(step,dp,null,callbackSat),
        inputVal = this._inputVal = new NumberInput_Internal(step,dp,null,callbackVal),
        inputR   = this._inputR   = new NumberInput_Internal(step,dp,null,callbackR),
        inputG   = this._inputG   = new NumberInput_Internal(step,dp,null,callbackG),
        inputB   = this._inputB   = new NumberInput_Internal(step,dp,null,callbackB);

    var controlsWrap = new Node().setStyleClass(CSS.PickerControlsWrap);

    var buttonPick   = new Node(Node.INPUT_BUTTON).setStyleClass(CSS.Button).setProperty('value','pick'),
        buttonCancel = new Node(Node.INPUT_BUTTON).setStyleClass(CSS.Button).setProperty('value','cancel');


    var colorContrast = new Node().setStyleClass(CSS.PickerColorContrast);

    var color0 = this._colorCurrNode = new Node(),
        color1 = this._colorPrevNode = new Node();

    colorContrast.addChild(color0);
    colorContrast.addChild(color1);

    controlsWrap.addChild(buttonCancel);
    controlsWrap.addChild(buttonPick);
    controlsWrap.addChild(colorContrast);

    this._setContrasPrevColor(0,0,0);

    var inputFieldWrapHue = new Node().setStyleClass(CSS.PickerInputField),
        inputFieldWrapSat = new Node().setStyleClass(CSS.PickerInputField),
        inputFieldWrapVal = new Node().setStyleClass(CSS.PickerInputField);

    var inputFieldWrapHueLabel = new Node(Node.SPAN).setStyleClass(CSS.Label).setProperty('innerHTML','H'),
        inputFieldWrapSatLabel = new Node(Node.SPAN).setStyleClass(CSS.Label).setProperty('innerHTML','S'),
        inputFieldWrapValLabel = new Node(Node.SPAN).setStyleClass(CSS.Label).setProperty('innerHTML','V');

        inputFieldWrapHue.addChildren(inputFieldWrapHueLabel,inputHue.getNode());
        inputFieldWrapSat.addChildren(inputFieldWrapSatLabel,inputSat.getNode());
        inputFieldWrapVal.addChildren(inputFieldWrapValLabel,inputVal.getNode());

    var inputFieldWrapR = new Node().setStyleClass(CSS.PickerInputField),
        inputFieldWrapG = new Node().setStyleClass(CSS.PickerInputField),
        inputFieldWrapB = new Node().setStyleClass(CSS.PickerInputField);

    var inputFieldWrapRLabel = new Node(Node.SPAN).setStyleClass(CSS.Label).setProperty('innerHTML','R'),
        inputFieldWrapGLabel = new Node(Node.SPAN).setStyleClass(CSS.Label).setProperty('innerHTML','G'),
        inputFieldWrapBLabel = new Node(Node.SPAN).setStyleClass(CSS.Label).setProperty('innerHTML','B');

        inputFieldWrapR.addChildren(inputFieldWrapRLabel,inputR.getNode());
        inputFieldWrapG.addChildren(inputFieldWrapGLabel,inputG.getNode());
        inputFieldWrapB.addChildren(inputFieldWrapBLabel,inputB.getNode());


        inputWrap.addChildren(inputFieldWrapR,inputFieldWrapHue,
                              inputFieldWrapG,inputFieldWrapSat,
                              inputFieldWrapB,inputFieldWrapVal,colorContrast);

    var hexInputWrap = new Node();
        hexInputWrap.setStyleClass(CSS.PickerInputWrap);

    var inputHEX = this._inputHEX = new Node(Node.INPUT_TEXT),
        inputFieldWrapHEX         = new Node().setStyleClass(CSS.PickerInputField),
        inputFieldWrapHEXLabel    = new Node(Node.SPAN).setStyleClass(CSS.Label);

        inputFieldWrapHEXLabel.setProperty('innerHTML','#');
        inputFieldWrapHEX.addChildren(inputFieldWrapHEXLabel,inputHEX);

        hexInputWrap.addChild(inputFieldWrapHEX);

        inputHEX.addEventListener(NodeEvent.CHANGE,this._onInputHEXFinish.bind(this));

        label.setProperty('innerHTML','Color Picker');

        menu.addChild(menuClose);
        head.addChild(menu);
        labelWrap.addChild(label);
        head.addChild(labelWrap);
        root.addChild(head);
        root.addChild(menuWrap);

        //wrapNode.addChild(paletteWrap);

        menuWrap.addChild(fieldWrap);
        menuWrap.addChild(sliderWrap);
        menuWrap.addChild(inputWrap);
        menuWrap.addChild(hexInputWrap);
        menuWrap.addChild(controlsWrap);

        fieldWrap.addChild( handleField);
        sliderWrap.addChild(handleSlider);

    var eventMouseDown = NodeEvent.MOUSE_DOWN,
        callback       = this._onCanvasFieldMouseDown.bind(this);

        fieldWrap.addEventListener(  eventMouseDown, callback);
        handleField.addEventListener(eventMouseDown, callback);

        callback = this._onCanvasSliderMouseDown.bind(this);

        sliderWrap.addEventListener(  eventMouseDown, callback);
        handleSlider.addEventListener(eventMouseDown, callback);

        menuClose.addEventListener(   eventMouseDown, this._onClose.bind(this));
        buttonPick.addEventListener(  eventMouseDown, this._onPick.bind(this));
        buttonCancel.addEventListener(eventMouseDown, this._onClose.bind(this));

        head.addEventListener(NodeEvent.MOUSE_DOWN, this._onHeadDragStart.bind(this));

    this._parentNode = parentNode;

    this._mouseOffset = [0,0];
    this._position    = [null,null];

    this._canvasSliderPos = [0,0];
    this._canvasFieldPos  = [0,0];
    this._handleFieldSize    = 12;
    this._handleSliderHeight = 7;

    this._imageDataSlider = contextCanvasSlider.createImageData(canvasSlider.width,canvasSlider.height);
    this._imageDataField  = contextCanvasField.createImageData( canvasField.width, canvasField.height);

    this._valueHueMinMax = [0,360];
    this._valueSatMinMax = this._valueValMinMax = [0,100];
    this._valueRGBMinMax = [0,255];

    this._valueHue = DEFAULT_VALUE_HUE;
    this._valueSat = DEFAULT_VALUE_SAT;
    this._valueVal = DEFAULT_VALUE_VAL;
    this._valueR   = 0;
    this._valueG   = 0;
    this._valueB   = 0;

    this._valueHEX = '#000000';
    this._valueHEXValid = this._valueHEX;

    this._callbackPick = function(){};

    //this._canvasFieldImageDataFunc = function(i,j){return this._HSV2RGB(this._valueHue,j)}

    this._drawCanvasField();
    this._drawCanvasSlider();

    this._setColorHSV(this._valueHue,this._valueSat,this._valueVal);

    this._updateColorRGBFromHSV();
    this._updateColorHEXFromRGB();

    this._updateHandles();
}

Picker.prototype =
{
    _drawHandleField: function () {
        var canvas = this._canvasField,
            nodePos = this._canvasFieldPos,
            mousePos = Mouse.get().getPosition();

        var posX = Math.max(0, Math.min(mousePos[0] - nodePos[0], canvas.width)),
            posY = Math.max(0, Math.min(mousePos[1] - nodePos[1], canvas.height)),
            posXNorm = posX / canvas.width,
            posYNorm = posY / canvas.height;

        var sat = Math.round(posXNorm * this._valueSatMinMax[1]),
            val = Math.round((1.0 - posYNorm) * this._valueValMinMax[1]);

        this._setColorHSV(this._valueHue, sat, val);

        this._updateColorRGBFromHSV();
        this._updateColorHEXFromRGB();

        this._updateHandleField();
    },

    _updateHandleField: function () {
        var width = this._canvasField.width,
            height = this._canvasField.height,
            offsetHandle = this._handleFieldSize * 0.25;

        var satNorm = this._valueSat / this._valueSatMinMax[1],
            valNorm = this._valueVal / this._valueValMinMax[1];

        this._handleField.setPositionGlobal(satNorm * width - offsetHandle,
            (1.0 - valNorm) * height - offsetHandle);

    },

    _drawHandleSlider: function () {
        var canvas = this._canvasSlider,
            canvasPosY = this._canvasSliderPos[1],
            mousePosY = Mouse.get().getY();

        var posY = Math.max(0, Math.min(mousePosY - canvasPosY, canvas.height)),
            posYNorm = posY / canvas.height;

        var hue = Math.floor((1.0 - posYNorm) * this._valueHueMinMax[1]);

        this._setColorHSV(hue, this._valueSat, this._valueVal);

        this._updateColorRGBFromHSV();
        this._updateColorHEXFromRGB();

        this._updateHandleSlider();
    },

    _updateHandleSlider: function () {
        var height = this._canvasSlider.height,
            offsetHandle = this._handleSliderHeight * 0.25;

        var hueNorm = this._valueHue / this._valueHueMinMax[1];

        this._handleSlider.setPositionGlobalY((height - offsetHandle) * (1.0 - hueNorm));
    },

    _updateHandles: function () {
        this._updateHandleField();
        this._updateHandleSlider();
    },

    /*---------------------------------------------------------------------------------*/

    _setHue: function (value) {
        var minMax = this._valueHueMinMax;

        this._valueHue = value == minMax[1] ? minMax[0] : value;
        this._updateColorHSV();
        this._drawCanvasField();
    },

    _setSat: function (value) {
        this._valueSat = Math.round(value);
        this._updateColorHSV();
    },

    _setVal: function (value) {
        this._valueVal = Math.round(value);
        this._updateColorHSV();
    },

    _setR: function (value) {
        this._valueR = Math.round(value);
        this._updateColorRGB();
    },

    _setG: function (value) {
        this._valueG = Math.round(value);
        this._updateColorRGB();
    },

    _setB: function (value) {
        this._valueB = Math.round(value);
        this._updateColorRGB();
    },

    /*---------------------------------------------------------------------------------*/

    _onInputHueChange: function () {
        var input = this._inputHue,
            inputVal = this._getValueContrained(input, this._valueHueMinMax);

        var minMax = this._valueHueMinMax;

        if (inputVal == minMax[1]) {
            inputVal = minMax[0];
            input.setValue(inputVal);
        }

        this._setHue(inputVal);
        this._updateColorRGBFromHSV();
        this._updateColorHEXFromRGB();
        this._updateHandleSlider();

        this._drawCanvasField();
    },

    _onInputSatChange: function () {
        this._setSat(this._getValueContrained(this._inputSat, this._valueSatMinMax));
        this._onInputSVChange();
    },

    _onInputValChange: function () {
        this._setVal(this._getValueContrained(this._inputVal, this._valueValMinMax));
        this._onInputSVChange();
    },

    _onInputRChange: function () {
        this._setR(this._getValueContrained(this._inputR, this._valueRGBMinMax));
        this._onInputRGBChange();
    },

    _onInputGChange: function () {
        this._setG(this._getValueContrained(this._inputG, this._valueRGBMinMax));
        this._onInputRGBChange();
    },

    _onInputBChange: function () {
        this._setB(this._getValueContrained(this._inputB, this._valueRGBMinMax));
        this._onInputRGBChange();
    },

    _onInputHEXFinish: function () {
        var input = this._inputHEX,
            value = input.getProperty('value');

        if (!ColorUtil.isValidHEX(value)) {
            input.setProperty('value', this._valueHEXValid);
            return;
        }

        this._valueHEX = this._valueHEXValid = value;
        this._updateColorFromHEX();
    },

    _onInputSVChange: function () {
        this._updateColorRGBFromHSV();
        this._updateColorHEXFromRGB();
        this._updateHandleField();
    },

    _onInputRGBChange: function () {
        this._updateColorHSVFromRGB();
        this._updateColorHEXFromRGB();
        this._updateHandles();
    },

    _getValueContrained: function (input, minMax) {
        var inputVal = Math.round(input.getValue()),
            min = minMax[0],
            max = minMax[1];

        if (inputVal <= min) {
            inputVal = min;
            input.setValue(inputVal);
        }
        if (inputVal >= max) {
            inputVal = max;
            input.setValue(inputVal);
        }

        return inputVal;
    },


    _updateInputHue: function () {
        this._inputHue.setValue(this._valueHue);
    },
    _updateInputSat: function () {
        this._inputSat.setValue(this._valueSat);
    },
    _updateInputVal: function () {
        this._inputVal.setValue(this._valueVal);
    },
    _updateInputR: function () {
        this._inputR.setValue(this._valueR);
    },
    _updateInputG: function () {
        this._inputG.setValue(this._valueG);
    },
    _updateInputB: function () {
        this._inputB.setValue(this._valueB);
    },
    _updateInputHEX: function () {
        this._inputHEX.setProperty('value', this._valueHEX);
    },


    _setColorHSV: function (hue, sat, val) {
        this._valueHue = hue;
        this._valueSat = sat;
        this._valueVal = val;

        this._updateInputHue();
        this._updateInputSat();
        this._updateInputVal();

        this._updateContrastCurrColor();
    },

    _setColorRGB: function (r, g, b) {
        this._valueR = r;
        this._valueG = g;
        this._valueB = b;

        this._updateInputR();
        this._updateInputG();
        this._updateInputB();

        this._updateContrastCurrColor();
    },

    _setColorHEX: function (hex) {
        this._valueHEX = hex;
        this._updateInputHEX();
    },

    _updateColorHSV: function () {
        this._setColorHSV(this._valueHue, this._valueSat, this._valueVal);
        this._updateContrastCurrColor();
    },

    _updateColorRGB: function () {
        this._setColorRGB(this._valueR, this._valueG, this._valueB);
        this._updateContrastCurrColor();
    },

    _updateColorHSVFromRGB: function () {
        var hsv = ColorUtil.RGB2HSV(this._valueR, this._valueG, this._valueB);
        this._setColorHSV(hsv[0], hsv[1], hsv[2]);
    },

    _updateColorRGBFromHSV: function () {
        var rgb = ColorUtil.HSV2RGB(this._valueHue, this._valueSat, this._valueVal);
        this._setColorRGB(rgb[0], rgb[1], rgb[2]);
    },

    _updateColorHEXFromRGB: function () {
        var hex = ColorUtil.RGB2HEX(this._valueR, this._valueG, this._valueB);
        this._setColorHEX(hex);
    },

    _updateColorFromHEX: function () {
        var rgb = ColorUtil.HEX2RGB(this._valueHEX);

        this._setColorRGB(rgb[0], rgb[1], rgb[2]);
        this._updateColorHSVFromRGB();
        this._updateHandles();
    },

    _updateContrastCurrColor: function () {
        this._setContrastCurrColor(this._valueR, this._valueG, this._valueB);
    },
    _updateContrastPrevColor: function () {
        this._setContrasPrevColor(this._valueR, this._valueG, this._valueB)
    },

    _setContrastCurrColor: function (r, g, b) {
        this._colorCurrNode.setStyleProperty('background', 'rgb(' + r + ',' + g + ',' + b + ')')
    },
    _setContrasPrevColor: function (r, g, b) {
        this._colorPrevNode.setStyleProperty('background', 'rgb(' + r + ',' + g + ',' + b + ')')
    },

    _onHeadDragStart: function () {
        var node = this._node,
            parentNode = this._parentNode;

        var nodePos = node.getPositionGlobal(),
            mousePos = Mouse.get().getPosition(),
            offsetPos = this._mouseOffset;

        offsetPos[0] = mousePos[0] - nodePos[0];
        offsetPos[1] = mousePos[1] - nodePos[1];

        var eventMouseMove = DocumentEvent.MOUSE_MOVE,
            eventMouseUp = DocumentEvent.MOUSE_UP;

        var self = this;

        var onDrag = function () {
                self._updatePosition();
                self._updateCanvasNodePositions();
            },

            onDragEnd = function () {
                self._updateCanvasNodePositions();
                document.removeEventListener(eventMouseMove, onDrag, false);
                document.removeEventListener(eventMouseUp, onDragEnd, false);
            };

        parentNode.removeChild(node);
        parentNode.addChild(node);

        document.addEventListener(eventMouseMove, onDrag, false);
        document.addEventListener(eventMouseUp, onDragEnd, false);

        this._updateCanvasNodePositions();
    },

    _updatePosition: function () {
        var mousePos = Mouse.get().getPosition(),
            offsetPos = this._mouseOffset;

        var currPositionX = mousePos[0] - offsetPos[0],
            currPositionY = mousePos[1] - offsetPos[1];

        var node = this._node,
            head = this._headNode,
            position = this._position;

        var maxX = window.innerWidth - node.getWidth(),
            maxY = window.innerHeight - head.getHeight();

        position[0] = Math.max(0, Math.min(currPositionX, maxX));
        position[1] = Math.max(0, Math.min(currPositionY, maxY));

        node.setPositionGlobal(position[0], position[1]);
    },

    _drawCanvasField: function () {
        var canvas = this._canvasField,
            context = this._contextCanvasField;

        var width = canvas.width,
            height = canvas.height,
            invWidth = 1 / width,
            invHeight = 1 / height;

        var imageData = this._imageDataField,
            rgb = [],
            index = 0;

        var valueHue = this._valueHue;

        var i = -1, j;
        while (++i < height) {
            j = -1;

            while (++j < width) {
                rgb = ColorUtil.HSV2RGB(valueHue, j * invWidth * 100.0, ( 1.0 - i * invHeight ) * 100.0);
                index = (i * width + j) * 4;

                imageData.data[index] = rgb[0];
                imageData.data[index + 1] = rgb[1];
                imageData.data[index + 2] = rgb[2];
                imageData.data[index + 3] = 255;
            }
        }

        context.putImageData(imageData, 0, 0);
    },

    _drawCanvasSlider: function () {
        var canvas = this._canvasSlider,
            context = this._contextCanvasSlider;

        var width = canvas.width,
            height = canvas.height,
            invHeight = 1 / height;

        var imageData = this._imageDataSlider,
            rgb = [],
            index = 0;

        var i = -1, j;
        while (++i < height) {
            j = -1;

            while (++j < width) {
                rgb = ColorUtil.HSV2RGB((1.0 - i * invHeight) * 360.0, 100.0, 100.0);
                index = (i * width + j) * 4;

                imageData.data[index] = rgb[0];
                imageData.data[index + 1] = rgb[1];
                imageData.data[index + 2] = rgb[2];
                imageData.data[index + 3] = 255;
            }
        }

        context.putImageData(imageData, 0, 0);

    },

    _onCanvasFieldMouseDown: function () {
        var eventMouseMove = DocumentEvent.MOUSE_MOVE,
            eventMouseUp = DocumentEvent.MOUSE_UP;

        var self = this;

        var onDrag = function () {
                self._drawHandleField();
            },
            onDragEnd = function () {
                document.removeEventListener(eventMouseMove, onDrag, false);
                document.removeEventListener(eventMouseUp, onDragEnd, false);
            };

        document.addEventListener(eventMouseMove, onDrag, false);
        document.addEventListener(eventMouseUp, onDragEnd, false);

        self._drawHandleField();
    },

    _onCanvasSliderMouseDown: function () {
        var eventMouseMove = DocumentEvent.MOUSE_MOVE,
            eventMouseUp = DocumentEvent.MOUSE_UP;

        var self = this;

        var onDrag = function () {
                self._drawHandleSlider();
                self._drawCanvasField();
            },

            onDragEnd = function () {
                document.removeEventListener(eventMouseMove, onDrag, false);
                document.removeEventListener(eventMouseUp, onDragEnd, false);
                self._drawCanvasField();
            };

        document.addEventListener(eventMouseMove, onDrag, false);
        document.addEventListener(eventMouseUp, onDragEnd, false);

        self._drawHandleSlider();
        self._drawCanvasField();
    },

    _setSizeCanvasField: function (width, height) {
        var canvas = this._canvasField;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        canvas.width = width;
        canvas.height = height;

    },

    _setSizeCanvasSlider: function (width, height) {
        var canvas = this._canvasSlider;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        canvas.width = width;
        canvas.height = height;
    },

    open: function () {
        var node = this._node;

        this._parentNode.addChild(node);

        var position = this._position;
        if(position[0] === null || position[1] === null){
            position[0] = window.innerWidth * 0.5 - node.getWidth() * 0.5;
            position[1] = window.innerHeight * 0.5 - node.getHeight() * 0.5;
        } else {
            position[0] = Math.max(0,Math.min(position[0],window.innerWidth - node.getWidth()));
            position[1] = Math.max(0,Math.min(position[1],window.innerHeight - node.getHeight()));
        }

        node.setPositionGlobal(position[0],position[1]);
        this._updateCanvasNodePositions();
    },

    close: function () {
        this._parentNode.removeChild(this._node);
    },

    _onClose: function (e) {
        e.cancelBubble = true;
        this.close();
    },
    _onPick: function () {
        this._callbackPick();
        this.close();
    },

    _updateCanvasNodePositions: function () {
        var canvasSliderPos = this._canvasSliderPos,
            canvasFieldPos = this._canvasFieldPos;

        canvasSliderPos[0] = canvasSliderPos[1] = 0;
        canvasFieldPos[0] = canvasFieldPos[1] = 0;

        var element = this._canvasSlider;

        while (element) {
            canvasSliderPos[0] += element.offsetLeft;
            canvasSliderPos[1] += element.offsetTop;
            element = element.offsetParent;
        }

        element = this._canvasField;

        while (element) {
            canvasFieldPos[0] += element.offsetLeft;
            canvasFieldPos[1] += element.offsetTop;
            element = element.offsetParent;
        }
    },

    setCallbackPick: function (func) {
        this._callbackPick = func;
    },

    setColorHEX: function (hex) {
        this._setColorHEX(hex);
        this._updateColorFromHEX();
        this._setColor();
    },

    setColorRGB: function (r, g, b) {
        this._setColorRGB(r, g, b);
        this._updateColorHEXFromRGB();
        this._updateColorHSVFromRGB();
        this._setColor();
    },

    setColorRGBfv: function (r, g, b) {
        this.setColorRGB(Math.floor(r * 255.0),
            Math.floor(g * 255.0),
            Math.floor(b * 255.0));
    },

    setColorHSV: function (h, s, v) {
        this._setColorHSV(h, s, v);
        this._updateColorRGBFromHSV();
        this._updateColorHEXFromRGB();
        this._setColor();
    },

    _setColor: function () {
        this._drawCanvasField();
        this._drawCanvasSlider();
        this._updateHandles();
        this._setContrasPrevColor(this._valueR, this._valueG, this._valueB);
    },

    getR: function () {
        return this._valueR;
    },
    getG: function () {
        return this._valueG;
    },
    getB: function () {
        return this._valueB;
    },
    getRGB: function () {
        return [this._valueR, this._valueG, this._valueB];
    },
    getHue: function () {
        return this._valueHue;
    },
    getSat: function () {
        return this._valueSat;
    },
    getVal: function () {
        return this._valueVal;
    },
    getHSV: function () {
        return [this._valueHue, this._valueSat, this._valueVal];
    },
    getHEX: function () {
        return this._valueHEX;
    },
    getRGBfv: function () {
        return [this._valueR / 255.0, this._valueG / 255.0, this._valueB / 255.0];
    },

    getNode: function () {
        return this._node;
    }
};

Picker.setup = function (parentNode) {
    return Picker._instance = new Picker(parentNode);
};
Picker.get = function () {
    return Picker._instance;
};
Picker.destroy = function(){
    Picker._instance = null;
};

module.exports = Picker;

},{"../core/color/ColorUtil":41,"../core/document/CSS":42,"../core/document/DocumentEvent":43,"../core/document/Mouse":44,"../core/document/Node":45,"../core/document/NodeEvent":46,"./NumberInput_Internal":14}],20:[function(require,module,exports){
var SVGComponent = require('./SVGComponent');

function Plotter(parent,object,value,params) {
    params = params || {};
    params.lineWidth  = params.lineWidth  || 2;
    params.lineColor  = params.lineColor  || [255,255,255];

    SVGComponent.apply(this,arguments);

    var lineWidth = this._lineWidth = params.lineWidth;
    var lineColor = params.lineColor;

    var grid = this._grid = this._svgRoot.appendChild(this._createSVGObject('path'));
        grid.style.stroke = 'rgb(26,29,31)';

    var path = this._path = this._svgRoot.appendChild(this._createSVGObject('path'));
        path.style.stroke      = 'rgb('+lineColor[0]+','+lineColor[1]+','+lineColor[2]+')';
        path.style.strokeWidth = lineWidth ;
        path.style.fill        = 'none';
}
Plotter.prototype = Object.create(SVGComponent.prototype);
Plotter.prototype.constructor = Plotter;

module.exports = Plotter;

},{"./SVGComponent":23}],21:[function(require,module,exports){
var ObjectComponent = require('../core/ObjectComponent');
var Node = require('../core/document/Node');
var NumberInput_Internal = require('./NumberInput_Internal');
var CSS = require('../core/document/CSS');

var Event_         = require('../core/event/Event'),
    ComponentEvent = require('../core/ComponentEvent');

var DEFAULT_STEP = 1.0,
    DEFAULT_DP   = 2;

function Range(parent, object, value, params) {
    ObjectComponent.apply(this,arguments);

    params          = params          || {};
    params.onChange = params.onChange || this._onChange;
    params.step     = params.step || DEFAULT_STEP;
    params.dp       = (params.dp != null) ? params.dp : DEFAULT_DP;

    this._onChange  = params.onChange;

    var step = this._step = params.step,
        dp   = this._dp   = params.dp;

    //FIXME: history push pop

    var labelMin = new Node();
    var inputMin = this._inputMin = new NumberInput_Internal(step,dp, this.pushHistoryState.bind(this),
                                                                         this._onInputMinChange.bind(this));

    var labelMax = new Node();
    var inputMax = this._inputMax = new NumberInput_Internal(step,dp, this.pushHistoryState.bind(this),
                                                                         this._onInputMaxChange.bind(this));

    var labelMinWrap = new Node().setStyleClass(CSS.Wrap),
        inputMinWrap = new Node().setStyleClass(CSS.Wrap),
        labelMaxWrap = new Node().setStyleClass(CSS.Wrap),
        inputMaxWrap = new Node().setStyleClass(CSS.Wrap);

    labelMin.setStyleClass(CSS.Label).setProperty('innerHTML', 'MIN');
    labelMax.setStyleClass(CSS.Label).setProperty('innerHTML', 'MAX');

    var values = this._obj[this._key];

    inputMin.setValue(values[0]);
    inputMax.setValue(values[1]);

    var wrap = this._wrapNode;

    labelMinWrap.addChild(labelMin);
    inputMinWrap.addChild(inputMin.getNode());
    labelMaxWrap.addChild(labelMax);
    inputMaxWrap.addChild(inputMax.getNode());

    wrap.addChild(labelMinWrap);
    wrap.addChild(inputMinWrap);
    wrap.addChild(labelMaxWrap);
    wrap.addChild(inputMaxWrap);
}
Range.prototype = Object.create(ObjectComponent.prototype);
Range.prototype.constructor = Range;

Range.prototype._onInputChange = function () {
    this.dispatchEvent(new Event_(this, ComponentEvent.VALUE_UPDATED, null));
    this._onChange();
};

Range.prototype._updateValueMin = function () {
    var values = this._obj[this._key];

    var inputMin = this._inputMin,
        inputValue = inputMin.getValue();

    if (inputValue >= this._inputMax.getValue()) {
        inputMin.setValue(values[0]);
        return;
    }
    values[0] = inputValue;

};

Range.prototype._updateValueMax = function () {
    var values = this._obj[this._key];

    var inputMax = this._inputMax,
        inputValue = inputMax.getValue();

    if (inputValue <= this._inputMin.getValue()) {
        inputMax.setValue(values[1]);
        return;
    }
    values[1] = inputValue;
};


Range.prototype.onValueUpdate = function (e) {
    if (e.data.origin == this){
        return;
    }
    if (e.data.origin == null) {
    }
    var o = this._obj,k = this._key;
    this._inputMin.setValue(o[k][0]);
    this._inputMax.setValue(o[k][1]);
};

Range.prototype.setValue = function(value){
    var o = this._obj,k = this._key;
    o[k][0] = value[0];
    o[k][1] = value[1];
    this.dispatchEvent(new Event_(this,ComponentEvent.VALUE_UPDATED,null));
};

Range.prototype._onInputMinChange = function () {
    this._updateValueMin();
    this._onInputChange();
};

Range.prototype._onInputMaxChange = function () {
    this._updateValueMax();
    this._onInputChange();
};

module.exports = Range;
},{"../core/ComponentEvent":31,"../core/ObjectComponent":35,"../core/document/CSS":42,"../core/document/Node":45,"../core/event/Event":48,"./NumberInput_Internal":14}],22:[function(require,module,exports){
var Component = require('./../core/Component');
var CSS = require('../core/document/CSS');
var Metric = require('./Metric');
var GroupEvent = require('../group/GroupEvent');

function SVG(parent, params) {
    Component.apply(this, arguments);

    var wrap = this._wrapNode;
        wrap.setStyleClass(CSS.CanvasWrap);
    var wrapSize = wrap.getWidth();

    var svg = this._svg = this._createSVGObject('svg');
        svg.setAttribute('version', '1.2');
        svg.setAttribute('baseProfile', 'tiny');
        svg.setAttribute('preserveAspectRatio', 'true');

    wrap.getElement().appendChild(svg);

    this._svgSetSize(wrapSize, wrapSize);
    this._updateHeight();

    this._node.setStyleClass(CSS.CanvasListItem);

    this._parent.addEventListener(GroupEvent.GROUP_SIZE_CHANGE, this, 'onGroupSizeChange');
    this.addEventListener(GroupEvent.GROUP_SIZE_UPDATE, this._parent, 'onGroupSizeUpdate');
}
SVG.prototype = Object.create(Component.prototype);
SVG.prototype.constructor = SVG;

SVG.prototype._updateHeight = function () {
    var svgHeight = Number(this._svg.getAttribute('height'));
    this._wrapNode.setHeight(svgHeight);
    this._node.setHeight(svgHeight + Metric.PADDING_WRAPPER);
};

SVG.prototype.onGroupSizeChange = function () {
    var width = this._wrapNode.getWidth();
    this._svgSetSize(width, width);
    this._updateHeight();
};

SVG.prototype._svgSetSize = function (width, height) {
    var svg = this._svg;
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewbox', '0 0 ' + width + ' ' + height);
};

SVG.prototype.getSVG = function () {
    return this._svg;
};

module.exports = SVG;
},{"../core/document/CSS":42,"../group/GroupEvent":54,"./../core/Component":30,"./Metric":12}],23:[function(require,module,exports){
var ObjectComponent = require('../core/ObjectComponent');
var CSS = require('../core/document/CSS');
var GroupEvent = require('../group/GroupEvent');
var Metric = require('./Metric');

function SVGComponent(parent,object,value,params){
    ObjectComponent.apply(this,arguments);

    var wrap = this._wrapNode;
        wrap.setStyleClass(CSS.SVGWrap);
    var wrapSize = wrap.getWidth();

    var svg = this._svg = this._createSVGObject('svg');
        svg.setAttribute('version', '1.2');
        svg.setAttribute('baseProfile', 'tiny');

        wrap.getElement().appendChild(svg);

    var svgRoot = this._svgRoot = svg.appendChild(this._createSVGObject('g'));
        svgRoot.setAttribute('transform','translate(0.5 0.5)');

    this._svgSetSize(wrapSize,wrapSize);
    this._updateHeight();

    this._node.setStyleClass(CSS.SVGListItem);

    this._parent.addEventListener(GroupEvent.GROUP_SIZE_CHANGE, this, 'onGroupSizeChange');
    this.addEventListener(GroupEvent.GROUP_SIZE_UPDATE, this._parent, 'onGroupSizeUpdate');
}
SVGComponent.prototype = Object.create(ObjectComponent.prototype);
SVGComponent.prototype.constructor = SVGComponent;

SVGComponent.prototype._updateHeight = function(){
    var svgHeight = Number(this._svg.getAttribute('height'));

    this._wrapNode.setHeight(svgHeight);
    this._node.setHeight(svgHeight + Metric.PADDING_WRAPPER);
};

SVGComponent.prototype._redraw = function(){};

SVGComponent.prototype.onGroupSizeChange = function(){
    var width = this._wrapNode.getWidth();

    this._svgSetSize(width,width);
    this._updateHeight();
    this._redraw();
};

SVGComponent.prototype._createSVGObject = function(type) {
    return document.createElementNS("http://www.w3.org/2000/svg",type);
};

SVGComponent.prototype._svgSetSize = function(width,height) {
    var svg = this._svg;
        svg.setAttribute('width',  width);
        svg.setAttribute('height', height);
        svg.setAttribute('viewbox', '0 0 ' + width + ' ' + height);
};


SVGComponent.prototype._pathCmdMoveTo = function (x, y) {
    return 'M ' + x + ' ' + y + ' ';
};

SVGComponent.prototype._pathCmdLineTo = function (x, y) {
    return 'L ' + x + ' ' + y + ' ';
};

SVGComponent.prototype._pathCmdClose = function () {
    return 'Z';
};

SVGComponent.prototype._pathCmdLine = function (x0, y0, x1, y1) {
    return 'M ' + x0 + ' ' + y0 + ' L ' + x1 + ' ' + y1;
};

SVGComponent.prototype._pathCmdBezierCubic = function (cmd, x0, y0, cx0, cy0, cx1, cy1, x1, y1) {
    return 'M ' + x0 + ' ' + y0 + ' C ' + cx0 + ' ' + cy0 + ', ' + cx1 + ' ' + cy1 + ', ' + x1 + ' ' + y1;
};

SVGComponent.prototype._pathCmdBezierQuadratic = function (cmd, x0, y0, cx, cy, x1, y1) {
    return 'M ' + x0 + ' ' + y0 + ' Q ' + cx + ' ' + cy + ', ' + x1 + ' ' + y1;
};

module.exports = SVGComponent;
},{"../core/ObjectComponent":35,"../core/document/CSS":42,"../group/GroupEvent":54,"./Metric":12}],24:[function(require,module,exports){
var ObjectComponent = require('../core/ObjectComponent');
var Node = require('../core/document/Node');
var CSS  = require('../core/document/CSS');

var Options = require('./Options');

var History = require('../core/History');

var Event_         = require('../core/event/Event'),
    NodeEvent      = require('../core/document/NodeEvent'),
    ComponentEvent = require('../core/ComponentEvent'),
    OptionEvent    = require('../core/OptionEvent');

var ObjectComponentNotifier = require('../core/ObjectComponentNotifier');

var STR_CHOOSE = 'Choose ...';

function Select(parent, object, value, params) {
    ObjectComponent.apply(this, arguments);

    params = params || {};
    params.onChange = params.onChange || this._onChange;
    this._onChange = params.onChange;

    var obj = this._obj,
        key = this._key;

    var targetKey = this._targetKey = params.target,
        values = this._values = obj[key];


    this._selectedIndex = -1;
    this._selected = null;

    var select = this._select = new Node(Node.INPUT_BUTTON);
        select.setStyleClass(CSS.Select);
        select.addEventListener(NodeEvent.MOUSE_DOWN, this._onOptionTrigger.bind(this));

    if(this._hasTarget()) {
        var targetObj = obj[targetKey] || '';
        var i = -1;
        while (++i < values.length) {
            if (targetObj == values[i]){
                this._selected = values[i];
            }
        }
        select.setProperty('value', targetObj.toString().length > 0 ? targetObj : values[0]);
    }
    else {
        select.setProperty('value', params.selected !== -1 ? values[params.selected] : STR_CHOOSE);
    }

    this._wrapNode.addChild(select);

    ObjectComponentNotifier.get().addEventListener(OptionEvent.TRIGGER, this, 'onOptionTrigger');
    this.addEventListener(OptionEvent.TRIGGERED, ObjectComponentNotifier.get(), 'onOptionTriggered');
}
Select.prototype = Object.create(ObjectComponent.prototype);
Select.prototype.constructor = Select;

Select.prototype.onOptionTrigger = function (e) {
    if (e.data.origin == this) {
        this._active = !this._active;
        this._updateAppearance();

        if (this._active) {
            this._buildOptions();
        }
        else {
            Options.get().clear();
        }
        return;
    }
    this._active = false;
    this._updateAppearance();
};

Select.prototype._buildOptions = function () {
    var options = Options.get();
    var self = this;

    options.build(this._values, this._selected, this._select,
        function(){
            self.applyValue();
            self._active = false;
            self._updateAppearance();
            self._selectedIndex = options.getSelectedIndex();
            self._onChange(self._selectedIndex);
            options.clear();
        },
        function(){
            self._active = false;
            self._updateAppearance();
            options.clear()
        }, false);
};

Select.prototype._applySelected = function(selected){
    this._select.setProperty('value',selected);
    this.dispatchEvent(new Event_(this,ComponentEvent.VALUE_UPDATED),null);
}

Select.prototype.applyValue = function () {
    var index = Options.get().getSelectedIndex(),
        selected = this._selected = this._values[index];

    if (this._hasTarget()) {
        this.pushHistoryState();
        this._obj[this._targetKey] = selected;
    }

    this._applySelected(selected);
};

Select.prototype.pushHistoryState = function () {
    var obj = this._obj,
        key = this._targetKey;
    History.get().pushState(obj, key, obj[key]);
};

Select.prototype._onOptionTrigger = function () {
    this.dispatchEvent(new Event_(this, OptionEvent.TRIGGERED, null));
};

Select.prototype._updateAppearance = function () {
    this._select.setStyleClass(this._active ? CSS.SelectActive : CSS.Select);
};

Select.prototype.onValueUpdate = function (e) {
    if (!this._hasTarget()){
        return;
    }
    this._selected = this._obj[this._targetKey];
    this._select.setProperty('value', this._selected.toString());
};

Select.prototype._hasTarget = function () {
    return this._targetKey != null;
};

Select.prototype.setValue = function(value){
    this._selectedIndex = value;
    if(value == -1){
        this._selected = null;
        this._select.setProperty('value', STR_CHOOSE);
        return;
    }
    this._selected = this._values[this._selectedIndex];
    this._applySelected(this._selected);
};

Select.prototype.getData = function(){
    var obj = {};
        obj['selectedIndex'] = this._selectedIndex;
    return obj;
};

module.exports = Select;

},{"../core/ComponentEvent":31,"../core/History":33,"../core/ObjectComponent":35,"../core/ObjectComponentNotifier":36,"../core/OptionEvent":37,"../core/document/CSS":42,"../core/document/Node":45,"../core/document/NodeEvent":46,"../core/event/Event":48,"./Options":16}],25:[function(require,module,exports){
var ObjectComponent = require('../core/ObjectComponent');
var CSS = require('../core/document/CSS');
var Slider_Internal = require('./Slider_Internal');

var History = require('../core/History');
var Range = require('./Range');
var NumberInput_Internal = require('./NumberInput_Internal');

var Event_         = require('../core/event/Event'),
    DocumentEvent  = require('../core/document/DocumentEvent'),
    PanelEvent     = require('../group/PanelEvent'),
    GroupEvent     = require('../group/GroupEvent'),
    ComponentEvent = require('../core/ComponentEvent');

var DEFAULT_STEP = 1.0,
    DEFAULT_DP   = 2;


function Slider(parent,object,value,range,params) {
    params          = params          || {};
    params.label    = params.label    || value;

    ObjectComponent.apply(this,[parent,object,range,params]);

    this._values  = this._obj[this._key];
    this._targetKey = value;

    params.step     = params.step     || DEFAULT_STEP;
    params.dp       = (params.dp === undefined || params.dp == null) ?  DEFAULT_DP : params.dp;
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || function(){};

    this._dp       = params.dp;
    this._onChange = params.onChange;
    this._onFinish = params.onFinish;

    var values    = this._values,
        obj       = this._obj,
        targetKey = this._targetKey;

    var wrap  = this._wrapNode;
        wrap.setStyleClass(CSS.WrapSlider);

    var slider = this._slider = new Slider_Internal(wrap,
                                                    this._onSliderBegin.bind(this),
                                                    this._onSliderMove.bind(this),
                                                    this._onSliderEnd.bind(this));

    slider.setBoundMax(values[1]);
    slider.setBoundMin(values[0]);
    slider.setValue(obj[targetKey]);

    var input  = this._input = new NumberInput_Internal(params.step, params.dp, null,
                                                        this._onInputChange.bind(this));

    input.setValue(obj[targetKey]);

    wrap.addChild(input.getNode());

    this._parent.addEventListener(PanelEvent.PANEL_MOVE_END,    this, 'onPanelMoveEnd');
    this._parent.addEventListener(GroupEvent.GROUP_SIZE_CHANGE, this, 'onGroupWidthChange');
    this._parent.addEventListener(DocumentEvent.WINDOW_RESIZE,  this, 'onWindowResize');
}
Slider.prototype = Object.create(ObjectComponent.prototype);
Slider.prototype.constructor = Slider;

Slider.prototype.pushHistoryState = function () {
    var obj = this._obj,
        key = this._targetKey;
    History.get().pushState(obj, key, obj[key]);
};

Slider.prototype._onSliderBegin = function () {
    this.pushHistoryState();
};

Slider.prototype._onSliderMove = function () {
    this.applyValue();
    this._updateValueField();
    this.dispatchEvent(new Event_(this, ComponentEvent.VALUE_UPDATED, null));
    this._onChange();
};

Slider.prototype._onSliderEnd = function () {
    this.applyValue();
    this._updateValueField();
    this.dispatchEvent(new Event_(this, ComponentEvent.VALUE_UPDATED, null));
    this._onFinish();
};

Slider.prototype._onInputChange = function () {
    var input = this._input,
        valueMin = this._values[0],
        valueMax = this._values[1];

    if (input.getValue() >= valueMax){
        input.setValue(valueMax);
    }
    if (input.getValue() <= valueMin){
        input.setValue(valueMin);
    }

    var value = input.getValue();

    this._slider.setValue(value);
    this._obj[this._targetKey] = value;
    this.dispatchEvent(new Event_(this, ComponentEvent.VALUE_UPDATED, null));
    this._onFinish();
};

Slider.prototype.applyValue = function () {
    var value  = this._slider.getValue();
    this._obj[this._targetKey] = parseFloat(value.toFixed(this._dp));
    this._input.setValue(value);
};


Slider.prototype.onValueUpdate = function (e) {
    var origin = e.data.origin;
    if (origin == this){
        return;
    }
    var slider = this._slider;
    if (!(origin instanceof Slider)) {
        var values = this._values;
        slider.setBoundMin(values[0]);
        slider.setBoundMax(values[1]);
        if (!(origin instanceof Range)) {
            slider.setValue(this._obj[this._targetKey]);
        }
    }
    else {
        slider.setValue(this._obj[this._targetKey]);
    }
    this.applyValue();
};


Slider.prototype._updateValueField = function () {
    this._input.setValue(this._slider.getValue());
};

Slider.prototype.onPanelMoveEnd =
    Slider.prototype.onGroupWidthChange =
        Slider.prototype.onWindowResize = function () {
            this._slider.resetOffset();
        };

Slider.prototype.setValue = function(value){
    if(value == -1){
        return;
    }
    this._obj[this._targetKey] = value;
    this.dispatchEvent(new Event_(this,ComponentEvent.VALUE_UPDATED,null));
};

Slider.prototype.getData = function(){
    var obj = {};
        obj[this._targetKey] = this._obj[this._targetKey];
    return obj;
};

module.exports = Slider;
},{"../core/ComponentEvent":31,"../core/History":33,"../core/ObjectComponent":35,"../core/document/CSS":42,"../core/document/DocumentEvent":43,"../core/event/Event":48,"../group/GroupEvent":54,"../group/PanelEvent":57,"./NumberInput_Internal":14,"./Range":21,"./Slider_Internal":26}],26:[function(require,module,exports){
var Node = require('../core/document/Node');

var DocumentEvent = require('../core/document/DocumentEvent'),
    NodeEvent = require('../core/document/NodeEvent');

var CSS = require('../core/document/CSS');
var Mouse = require('../core/document/Mouse');

function Slider_Internal(parentNode,onBegin,onChange,onFinish) {
    this._bounds = [0,1];
    this._value  = 0;
    this._intrpl = 0;
    this._focus  = false;


    this._onBegin  = onBegin  || function(){};
    this._onChange = onChange || function(){};
    this._onFinish = onFinish || function(){};


    var wrap = new Node().setStyleClass(CSS.SliderWrap);
    parentNode.addChild(wrap);

    var slot   = this._slot   = {node:    new Node().setStyleClass(CSS.SliderSlot),
                                 offsetX: 0,
                                 width:   0,
                                 padding: 3};

    var handle = this._handle = {node    : new Node().setStyleClass(CSS.SliderHandle),
                                 width   : 0,
                                 dragging: false};

    wrap.addChild(slot.node);
    slot.node.addChild(handle.node);

    slot.offsetX = slot.node.getPositionGlobalX();
    slot.width   = Math.floor(slot.node.getWidth() - slot.padding * 2) ;

    handle.node.setWidth(handle.width);

    slot.node.addEventListener(NodeEvent.MOUSE_DOWN,this._onSlotMouseDown.bind(this));
    slot.node.addEventListener(NodeEvent.MOUSE_UP,  this._onSlotMouseUp.bind(this));

    document.addEventListener(DocumentEvent.MOUSE_MOVE,this._onDocumentMouseMove.bind(this));
    document.addEventListener(DocumentEvent.MOUSE_UP,  this._onDocumentMouseUp.bind(this));
}

Slider_Internal.prototype._onDocumentMouseMove = function(){
    if(!this._handle.dragging){
        return;
    }
    this._update();
    this._onChange();
};

Slider_Internal.prototype._onDocumentMouseUp = function(){
    if(this._handle.dragging){
        this._onFinish();
    }
    this._handle.dragging = false;
};

Slider_Internal.prototype._onSlotMouseDown = function(){
    this._onBegin();
    this._focus = true;
    this._handle.dragging = true;
    this._handle.node.getElement().focus();
    this._update();
};

Slider_Internal.prototype._onSlotMouseUp = function(){
    if (this._focus) {
        var handle = this._handle;
        if (handle.dragging){
            this._onFinish();
        }
        handle.dragging = false;
    }
    this._focus = false;
};

Slider_Internal.prototype._update = function(){
    var mx = Mouse.get().getX(),
        sx = this._slot.offsetX,
        sw = this._slot.width,
        px = (mx < sx) ? 0 : (mx > (sx + sw)) ? sw : (mx - sx);

    this._handle.node.setWidth(Math.round(px));
    this._intrpl = px / sw;
    this._interpolateValue();
};

Slider_Internal.prototype._updateHandle = function(){
    var slotWidth   = this._slot.width,
        handleWidth = Math.round(this._intrpl * slotWidth);
    this._handle.node.setWidth(Math.min(handleWidth,slotWidth));
};

Slider_Internal.prototype._interpolateValue = function () {
    var intrpl = this._intrpl,
        bounds = this._bounds;
    this._value = bounds[0] * (1.0 - intrpl) + bounds[1] * intrpl;
};

Slider_Internal.prototype.resetOffset = function () {
    var slot = this._slot;
    slot.offsetX = slot.node.getPositionGlobalX();
    slot.width = Math.floor(slot.node.getWidth() - slot.padding * 2)
};

Slider_Internal.prototype.setBoundMin = function (value) {
    var bounds = this._bounds;
    if (value >= bounds[1]){
        return;
    }
    bounds[0] = value;
    this._updateFromBounds();
};

Slider_Internal.prototype.setBoundMax = function (value) {
    var bounds = this._bounds;
    if (value <= bounds[0]){
        return;
    }
    bounds[1] = value;
    this._updateFromBounds();
};

Slider_Internal.prototype._updateFromBounds = function () {
    var boundsMin = this._bounds[0],
        boundsMax = this._bounds[1];
    this._value = Math.max(boundsMin,Math.min(this._value,boundsMax));
    this._intrpl = Math.abs((this._value - boundsMin) / (boundsMin - boundsMax));
    this._updateHandle();
};

Slider_Internal.prototype.setValue = function (value) {
    var boundsMin = this._bounds[0],
        boundsMax = this._bounds[1];

    if (value < boundsMin || value > boundsMax){
        return;
    }
    this._intrpl = Math.abs((value - boundsMin) / (boundsMin - boundsMax));
    this._updateHandle();
    this._value = value;
};

Slider_Internal.prototype.getValue = function () {
    return this._value;
};


module.exports = Slider_Internal;
},{"../core/document/CSS":42,"../core/document/DocumentEvent":43,"../core/document/Mouse":44,"../core/document/Node":45,"../core/document/NodeEvent":46}],27:[function(require,module,exports){
var ObjectComponent = require('../core/ObjectComponent');
var Node = require('../core/document/Node');
var CSS = require('../core/document/CSS');
var Options = require('./Options');
var ButtonPreset = require('./ButtonPreset');
var Metric = require('./Metric');

var Event_ = require('../core/event/Event'),
    DocumentEvent = require('../core/document/DocumentEvent'),
    NodeEvent = require('../core/document/NodeEvent'),
    ComponentEvent =  require('../core/ComponentEvent');

var DEFAULT_PRESET = null;

function StringInput(parent,object,value,params) {
    ObjectComponent.apply(this,arguments);

    params          = params || {};
    params.onChange = params.onChange || this._onChange;
    params.presets  = params.presets  || DEFAULT_PRESET;

    this._onChange   = params.onChange;

    var input = this._input = new Node(Node.INPUT_TEXT);

    var wrap = this._wrapNode;

    var presets = params.presets;
    if (!presets) {
        wrap.addChild(input);
    }
    else {
        var wrap_ = new Node();
        wrap_.setStyleClass(CSS.WrapInputWPreset);

        wrap.addChild(wrap_);
        wrap_.addChild(input);

        var options = Options.get(),
            btnPreset = new ButtonPreset(this._wrapNode);

        var onPresetDeactivate = function () {
            options.clear();
            btnPreset.deactivate();
        };

        var self = this;
        var onPresetActivate = function () {
            options.build(presets,
                input.getProperty('value'),
                input,
                function () {
                    input.setProperty('value', presets[options.getSelectedIndex()]);
                    self.pushHistoryState();
                    self.applyValue();
                },
                onPresetDeactivate,
                Metric.PADDING_PRESET,
                false);
        };

        btnPreset.setOnActive(onPresetActivate);
        btnPreset.setOnDeactive(onPresetDeactivate)
    }

    input.setProperty('value',this._obj[this._key]);

    input.addEventListener(NodeEvent.KEY_UP, this._onInputKeyUp.bind(this));
    input.addEventListener(NodeEvent.CHANGE, this._onInputChange.bind(this));

    input.addEventListener(NodeEvent.MOUSE_DOWN, this._onInputDragStart.bind(this));
    this.addEventListener(ComponentEvent.INPUT_SELECT_DRAG,this._parent,'onComponentSelectDrag');
}
StringInput.prototype = Object.create(ObjectComponent.prototype);
StringInput.prototype.constructor = StringInput;

StringInput.prototype._onInputKeyUp = function (e) {
    if (this._keyIsChar(e.keyCode)){
        this.pushHistoryState();
    }
    this.applyValue();
    this._onChange();
};

StringInput.prototype._onInputChange = function (e) {
    if (this._keyIsChar(e.keyCode)){
        this.pushHistoryState();
    }
    this.applyValue();
};

//TODO: Finish check
StringInput.prototype._keyIsChar = function (keyCode) {
    return keyCode != 17 &&
        keyCode != 18 &&
        keyCode != 20 &&
        keyCode != 37 &&
        keyCode != 38 &&
        keyCode != 39 &&
        keyCode != 40 &&
        keyCode != 16;
};


StringInput.prototype.applyValue = function () {
    this._obj[this._key] = this._input.getProperty('value');
    this.dispatchEvent(new Event_(this, ComponentEvent.VALUE_UPDATED, null));
};

StringInput.prototype.onValueUpdate = function (e) {
    if (e.data.origin == this)return;
    this._input.setProperty('value', this._obj[this._key]);
};

//Prevent chrome select drag
StringInput.prototype._onInputDragStart = function () {
    var eventMove = DocumentEvent.MOUSE_MOVE,
        eventUp = DocumentEvent.MOUSE_UP;

    var event = ComponentEvent.INPUT_SELECT_DRAG;
    var self = this;
    var onDrag = function () {
            self.dispatchEvent(new Event_(this, event, null));
        },

        onDragFinish = function () {
            self.dispatchEvent(new Event_(this, event, null));

            document.removeEventListener(eventMove, onDrag, false);
            document.removeEventListener(eventMove, onDragFinish, false);
        };

    this.dispatchEvent(new Event_(this, event, null));

    document.addEventListener(eventMove, onDrag, false);
    document.addEventListener(eventUp, onDragFinish, false);
};

StringInput.prototype.update = function () {
    this.onValueUpdate({ data: {} });
};

module.exports = StringInput;
},{"../core/ComponentEvent":31,"../core/ObjectComponent":35,"../core/document/CSS":42,"../core/document/DocumentEvent":43,"../core/document/Node":45,"../core/document/NodeEvent":46,"../core/event/Event":48,"./ButtonPreset":4,"./Metric":12,"./Options":16}],28:[function(require,module,exports){
var Output = require('./Output');

StringOutput = function (parent, object, value, params) {
    Output.apply(this, arguments);
};
StringOutput.prototype = Object.create(Output.prototype);
StringOutput.prototype.constructor = StringOutput;

StringOutput.prototype._setValue = function () {
    if (this._parent.isDisabled()) {
        return;
    }
    var textAreaString = this._obj[this._key];

    if (textAreaString == this._prevString){
        return;
    }
    var textArea = this._textArea,
        textAreaElement = textArea.getElement(),
        textAreaScrollHeight;

    textArea.setProperty('value', textAreaString);
    textAreaScrollHeight = textAreaElement.scrollHeight;
    textArea.setHeight(textAreaScrollHeight);

    var scrollBar = this._scrollBar;

    if (scrollBar) {
        if (textAreaScrollHeight <= this._wrapNode.getHeight()) {
            scrollBar.disable();
        }
        else {
            scrollBar.enable();
            scrollBar.update();
            scrollBar.reset();
        }
    }
    this._prevString = textAreaString;
};

module.exports = StringOutput;

},{"./Output":17}],29:[function(require,module,exports){
var Plotter = require('./Plotter');
var Metric  = require('./Metric');

var DEFAULT_RESOLUTION = 1;

function ValuePlotter(parent,object,value,params) {
    Plotter.apply(this,arguments);

    var svg       = this._svg,
        svgWidth  = Number(svg.getAttribute('width')),
        svgHeight = Number(svg.getAttribute('height'));

    params            = params            || {};
    params.height     = params.height     || svgHeight;
    params.resolution = params.resolution || DEFAULT_RESOLUTION;

    var resolution = params.resolution,
        length     = Math.floor(svgWidth / resolution);

    var points     = this._points  = new Array(length * 2),
        buffer0    = this._buffer0 = new Array(length),
        buffer1    = this._buffer1 = new Array(length);

    var min = this._lineWidth * 0.5;

    var i = -1;
    while (++i < length) {
        buffer0[i] = buffer1[i] = points[i * 2] = points[i * 2 + 1] = min;
    }

    this._height = params.height = params.height  < Metric.COMPONENT_MIN_HEIGHT ?
                   Metric.COMPONENT_MIN_HEIGHT : params.height;

    this._svgSetSize(svgHeight,Math.floor(params.height));
    this._grid.style.stroke = 'rgb(39,44,46)';

    this._updateHeight();
    this._drawValue();
}
ValuePlotter.prototype = Object.create(Plotter.prototype);
ValuePlotter.prototype.constructor = ValuePlotter;

ValuePlotter.prototype._redraw = function () {
    var points = this._points,
        bufferLen = this._buffer0.length;

    var width = Number(this._svg.getAttribute('width')),
        ratio = width / (bufferLen - 1);

    var i = -1;
    while (++i < bufferLen) {
        points[i * 2] = width - i * ratio;
    }

    this._drawValue();
};

ValuePlotter.prototype.onGroupSizeChange = function () {
    var width = this._wrapNode.getWidth(),
        height = this._height;

    this._svgSetSize(width, height);
    this._updateHeight();
    this._drawGrid();
    this._redraw();
};

ValuePlotter.prototype._drawValue = function () {
    this._drawCurve();
};

ValuePlotter.prototype._drawGrid = function () {
    var svg = this._svg;

    var svgWidth = Number(svg.getAttribute('width')),
        svgHeightHalf = Math.floor(Number(svg.getAttribute('height')) * 0.5);

    var pathCmd = '';
        pathCmd += this._pathCmdMoveTo(0, svgHeightHalf);
        pathCmd += this._pathCmdLineTo(svgWidth, svgHeightHalf);

    this._grid.setAttribute('d', pathCmd);
};

//TODO: merge update + pathcmd
ValuePlotter.prototype._drawCurve = function () {
    var svg = this._svg;

    var value = this._obj[this._key];

    var buffer0 = this._buffer0,
        buffer1 = this._buffer1,
        points = this._points;

    var bufferLength = buffer0.length;

    var pathCmd = '';

    var heightHalf = Number(svg.getAttribute('height')) * 0.5,
        unit = heightHalf - this._lineWidth * 0.5;

    points[1] = buffer0[0];
    buffer0[bufferLength - 1] = (value * unit) * -1 + Math.floor(heightHalf);

    pathCmd += this._pathCmdMoveTo(points[0], points[1]);

    var i = 0, index;

    while (++i < bufferLength) {
        index = i * 2;

        buffer1[i - 1] = buffer0[i];
        points[index + 1] = buffer0[i - 1] = buffer1[i - 1];

        pathCmd += this._pathCmdLineTo(points[index], points[index + 1]);
    }

    this._path.setAttribute('d', pathCmd);
};

ValuePlotter.prototype.update = function () {
    if (this._parent.isDisabled())return;
    this._drawValue();
}


module.exports = ValuePlotter;


},{"./Metric":12,"./Plotter":20}],30:[function(require,module,exports){
var Node = require('./document/Node'),
    CSS = require('./document/CSS');
var EventDispatcher = require('./event/EventDispatcher'),
    ComponentEvent  = require('./ComponentEvent');

function Component(parent,label) {
    EventDispatcher.apply(this,arguments);

    label = parent.usesLabels() ? label : 'none';

    this._parent  = parent;
    this._enabled = true;

    var root = this._node = new Node(Node.LIST_ITEM),
        wrap = this._wrapNode = new Node();
        wrap.setStyleClass(CSS.Wrap);
        root.addChild(wrap);

    if (label !== undefined) {
        if (label.length != 0 && label != 'none') {
            var label_ = this._lablNode = new Node(Node.SPAN);
                label_.setStyleClass(CSS.Label);
                label_.setProperty('innerHTML', label);
                root.addChild(label_);
        }

        if (label == 'none') {
            wrap.setStyleProperty('marginLeft', '0');
            wrap.setStyleProperty('width', '100%');
        }
    }

    this._parent.addEventListener(ComponentEvent.ENABLE, this,'onEnable');
    this._parent.addEventListener(ComponentEvent.DISABLE,this,'onDisable');
    this._parent.addComponentNode(root);
}
Component.prototype = Object.create(EventDispatcher.prototype);
Component.prototype.constructor = Component;

Component.prototype.enable = function () {
    this._enabled = true;
};

Component.prototype.disable = function () {
    this._enabled = false;
};

Component.prototype.isEnabled = function () {
    return this._enabled;
};
Component.prototype.isDisabled = function () {
    return !this._enabled;
};

Component.prototype.onEnable = function () {
    this.enable();
};

Component.prototype.onDisable = function () {
    this.disable();
};

module.exports = Component;
},{"./ComponentEvent":31,"./document/CSS":42,"./document/Node":45,"./event/EventDispatcher":49}],31:[function(require,module,exports){
var ComponentEvent = {
	VALUE_UPDATED: 'valueUpdated',
	UPDATE_VALUE: 'updateValue',

	INPUT_SELECT_DRAG: 'inputSelectDrag',

	ENABLE  : 'enable',
	DISABLE : 'disable'
};

module.exports = ComponentEvent;
},{}],32:[function(require,module,exports){
function ComponentObjectError(object,key) {
	Error.apply(this);
	Error.captureStackTrace(this,ComponentObjectError);
	this.name = 'ComponentObjectError';
	this.message = 'Object of type ' + object.constructor.name + ' has no member ' + key + '.';
}
ComponentObjectError.prototype = Object.create(Error.prototype);
ComponentObjectError.prototype.constructor = ComponentObjectError;

module.exports = ComponentObjectError;
},{}],33:[function(require,module,exports){
var EventDispatcher = require('./event/EventDispatcher'),
    Event_ = require('./event/Event'),
    HistoryEvent = require('./HistoryEvent');

var MAX_STATES = 30;

function History() {
    EventDispatcher.apply(this, arguments);
    this._states = [];
    this._enabled = false;
}
History.prototype = Object.create(EventDispatcher.prototype);
History.prototype.constructor = History;

History.prototype.pushState = function (object, key, value) {
    if (this._enabled){
        return;
    }

    var states = this._states;
    if (states.length >= MAX_STATES){
        states.shift();
    }
    states.push({object: object, key: key, value: value});
    this.dispatchEvent(new Event_(this, HistoryEvent.STATE_PUSH, null));
};

History.prototype.getState = function (object, key) {
    var states = this._states,
        statesLen = states.length;

    if (statesLen == 0){
        return null;
    }

    var state, value;
    var i = -1;
    while (++i < statesLen) {
        state = states[i];
        if (state.object === object) {
            if (state.key === key) {
                value = state.value;
                break;
            }
        }
    }
    return value;
};

History.prototype.popState = function () {
    if (this._enabled){
        return;
    }

    var states = this._states;
    if (states.length < 1){
        return;
    }

    var lastState = states.pop();
    lastState.object[lastState.key] = lastState.value;

    this.dispatchEvent(new Event_(this, HistoryEvent.STATE_POP, null));
};

History.prototype.getNumStates = function () {
    return this._states.length;
};

History._instance = null;

History.setup = function () {
    return History._instance = new History();
};

History.get = function () {
    return History._instance;
};

History.prototype.enable = function () {
    this._enabled = false;
};
History.prototype.disable = function () {
    this._enabled = true;
};

module.exports = History;
},{"./HistoryEvent":34,"./event/Event":48,"./event/EventDispatcher":49}],34:[function(require,module,exports){
var HistoryEvent = {
	STATE_PUSH: 'historyStatePush',
	STATE_POP: 'historyStatePop'
};

module.exports = HistoryEvent;
},{}],35:[function(require,module,exports){
var History = require('./History');
var Component = require('./Component'),
    ComponentEvent = require('./ComponentEvent'),
    ObjectComponentNotifier = require('./ObjectComponentNotifier'),
    ComponentObjectError = require('./ComponentObjectError');
var Event_ = require('./event/Event');

function ObjectComponent(parent, obj, key, params) {
    if (obj[key] === undefined) {
        throw new ComponentObjectError(obj, key);
    }
    params = params || {};
    params.label = params.label || key;

    Component.apply(this, [parent, params.label]);

    this._obj = obj;
    this._key = key;
    this._onChange = function(){};

    ObjectComponentNotifier.get().addEventListener(ComponentEvent.UPDATE_VALUE, this, 'onValueUpdate');
    this.addEventListener(ComponentEvent.VALUE_UPDATED, ObjectComponentNotifier.get(), 'onValueUpdated');
}
ObjectComponent.prototype = Object.create(Component.prototype);
ObjectComponent.prototype.constructor = ObjectComponent;

//Override in Subclass
ObjectComponent.prototype.applyValue = function() {};
ObjectComponent.prototype.onValueUpdate = function (e) {};

ObjectComponent.prototype.pushHistoryState = function () {
    var obj = this._obj, key = this._key;
    History.get().pushState(obj, key, obj[key]);
};

ObjectComponent.prototype.setValue = function (value) {
    this._obj[this._key] = value;
    this.dispatchEvent(new Event_(this,ComponentEvent.VALUE_UPDATED,null));
};

ObjectComponent.prototype.getData = function(){
    var obj = {};
        obj[this._key] = this._obj[this._key];
    return obj;
};

module.exports = ObjectComponent;

},{"./Component":30,"./ComponentEvent":31,"./ComponentObjectError":32,"./History":33,"./ObjectComponentNotifier":36,"./event/Event":48}],36:[function(require,module,exports){
var EventDispatcher = require('./event/EventDispatcher'),
	Event_ 			= require('./event/Event');
var ComponentEvent  = require('./ComponentEvent'),
	OptionEvent		= require('./OptionEvent');

function ObjectComponentNotifier(){
	EventDispatcher.apply(this);
}
ObjectComponentNotifier.prototype = Object.create(EventDispatcher.prototype);
ObjectComponentNotifier.prototype.constructor = ObjectComponentNotifier;

ObjectComponentNotifier.prototype.onValueUpdated = function (e) {
	this.dispatchEvent(new Event_(this, ComponentEvent.UPDATE_VALUE, {origin: e.sender}));
};

ObjectComponentNotifier.prototype.onOptionTriggered = function(e) {
	this.dispatchEvent(new Event_(this, OptionEvent.TRIGGER, {origin: e.sender}));
};

var instance = null;

ObjectComponentNotifier.get = function(){
	if(!instance){
		instance = new ObjectComponentNotifier();
	}
	return instance;
};

ObjectComponentNotifier.destroy = function(){
	instance = null;
};

module.exports = ObjectComponentNotifier;
},{"./ComponentEvent":31,"./OptionEvent":37,"./event/Event":48,"./event/EventDispatcher":49}],37:[function(require,module,exports){
var OptionEvent = {
	TRIGGERED: 'selectTrigger',
	TRIGGER: 'triggerSelect'
};
module.exports = OptionEvent;
},{}],38:[function(require,module,exports){
var DialogTemplate =
    '<head>\n' +
    '   <title>ControlKit State</title>\n' +
    '   <style type="text/css">\n' +
    '      body{\n' +
    '          box-sizing: border-box;\n' +
    '          padding: 20px;\n' +
    '          margin: 0;\n' +
    '          font-family: Arial, sans-serif;\n' +
    '          width: 100%;\n' +
    '      }\n' +
    '      textarea{\n' +
    '          margin-bottom:10px;\n' +
    '          box-sizing: border-box;\n' +
    '          padding: 0;\n' +
    '          border: 0;\n' +
    '          border: 1px solid #dedede;\n' +
    '          outline: none;\n' +
    '          font-family: Monaco, monospace;\n' +
    '          font-size: 11px;\n' +
    '          resize: none;\n' +
    '          word-wrap: break-word;\n' +
    '          display: block;\n' +
    '          width: 100%;\n' +
    '          overflow-y: scroll;\n' +
    '          height: 125px;\n' +
    '      }\n' +
    '      button{\n' +
    '          margin: 0;\n' +
    '          padding: 0 5px 3px 5px;\n' +
    '          height: 20px;\n' +
    '      }\n'+
    '      #save,#filename,#load{\n' +
    '          float: right;\n' +
    '      }\n' +
    '      input[type="text"]{\n' +
    '          margin: 0;\n' +
    '          padding: 0;\n' +
    '          width: 45%;\n' +
    '          height:20px;\n' +
    '      }\n'+
    '   </style>\n' +
    '</head>\n' +
    '<body>\n' +
    '   <textarea name="state" id="state"></textarea>\n' +
    '</body>';

var SaveDialogTemplate =
    '<button type="button" id="save">Save</button>\n' +
    '<input type="text" id="filename" value="ck-state.json"></input>';

var LoadDialogTemplate =
    '<input type="file" id="load-disk"></button>' +
    '<button type="button" id="load">Load</button>';

function createWindow(){
    var width = 320, height = 200;
    var window_ = window.open('','','\
        width=' + width + ',\
        height=' + height + ',\
        left=' + (window.screenX + window.innerWidth * 0.5 - width * 0.5) + ',\
        top=' + (window.screenY + window.innerHeight * 0.5 - height * 0.5) + ',\
        location=0,\
        titlebar=0,\
        resizable=0');
    window_.document.documentElement.innerHTML = DialogTemplate;
    return window_;
}

function save(data){
    var window_ = createWindow();
    var document_ = window_.document;
        document_.body.innerHTML += SaveDialogTemplate;
        document_.getElementById('save').addEventListener('click',function(){
            //log & save in main window
            var str  = document_.getElementById('state').value,
                blob = new Blob([str],{type:'application:json'}),
                name = document_.getElementById('filename').value;
            var a = document.createElement('a');
            a.download = name;
            if(window.webkitURL){
                a.href = window.webkitURL.createObjectURL(blob);
            } else {
                a.href = window.createObjectURL(blob);
                a.style.display = 'none';
                a.addEventListener('click',function(){
                    document_.body.removeChild(a);
                });
                document_.body.appendChild(a);
            }
            a.click();
        });
    document_.getElementById('state').innerText = JSON.stringify(data);
}

function load(callback){
    var window_ = createWindow();
    var document_ = window_.document;
        document_.body.innerHTML += LoadDialogTemplate;
    var input   = document_.getElementById('state');
    var btnLoad = document_.getElementById('load');
        btnLoad.disabled = true;

    function validateInput(){
        try{
            var obj = JSON.parse(input.value);
            if(obj && typeof obj === 'object' && obj !== null){
                btnLoad.disabled = false;
            }
        } catch (e){
            btnLoad.disabled = true;
        }
    }

    input.addEventListener('input',function(){
        validateInput();
    });
    document_.getElementById('load').addEventListener('click',function(){
        var str = input.value;
        callback(JSON.parse(str).data);
        window_.close();
    });
    var loadFromDisk = document_.getElementById('load-disk');
        loadFromDisk.addEventListener('change',function(){
            var reader = new FileReader();
            reader.addEventListener('loadend',function(e){
                input.value = e.target.result;
                validateInput();
            });
            reader.readAsText(loadFromDisk.files[0],'utf-8');
        });
}

module.exports = {
    load : load,
    save : save
};
},{}],39:[function(require,module,exports){
function ColorFormatError(msg) {
	Error.apply(this);
	Error.captureStackTrace(this,ColorFormatError);
	this.name = 'ColorFormatError';
	this.message = msg;
}
ColorFormatError.prototype = Object.create(Error.prototype);
ColorFormatError.prototype.constructor = ColorFormatError;

module.exports = ColorFormatError;
},{}],40:[function(require,module,exports){
var ColorMode = {
	RGB  : 'rgb',
	HSV  : 'hsv',
	HEX  : 'hex',
	RGBfv: 'rgbfv'
};

module.exports = ColorMode;
},{}],41:[function(require,module,exports){
var ColorUtil = {
	HSV2RGB: function (hue, sat, val) {
		var max_hue = 360.0,
			max_sat = 100.0,
			max_val = 100.0;

		var min_hue = 0.0,
			min_sat = 0,
			min_val = 0;

		hue = hue % max_hue;
		val = Math.max(min_val, Math.min(val, max_val)) / max_val * 255.0;

		if (sat <= min_sat) {
			val = Math.round(val);
			return [val, val, val];
		}
		else if (sat > max_sat)sat = max_sat;

		sat = sat / max_sat;

		//http://d.hatena.ne.jp/ja9/20100903/128350434

		var hi = Math.floor(hue / 60.0) % 6,
			f = (hue / 60.0) - hi,
			p = val * (1 - sat),
			q = val * (1 - f * sat),
			t = val * (1 - (1 - f) * sat);

		var r = 0,
			g = 0,
			b = 0;

		switch (hi) {
			case 0:
				r = val;
				g = t;
				b = p;
				break;
			case 1:
				r = q;
				g = val;
				b = p;
				break;
			case 2:
				r = p;
				g = val;
				b = t;
				break;
			case 3:
				r = p;
				g = q;
				b = val;
				break;
			case 4:
				r = t;
				g = p;
				b = val;
				break;
			case 5:
				r = val;
				g = p;
				b = q;
				break;
			default:
				break;
		}

		r = Math.round(r);
		g = Math.round(g);
		b = Math.round(b);

		return [r, g, b];

	},

	RGB2HSV: function (r, g, b) {
		var h = 0,
			s = 0,
			v = 0;

		r = r / 255.0;
		g = g / 255.0;
		b = b / 255.0;

		var minRGB = Math.min(r, Math.min(g, b)),
			maxRGB = Math.max(r, Math.max(g, b));

		if (minRGB == maxRGB) {
			v = minRGB;
			return [0, 0, Math.round(v)];
		}

		var dd = (r == minRGB) ? g - b : ((b == minRGB) ? r - g : b - r),
			hh = (r == minRGB) ? 3 : ((b == minRGB) ? 1 : 5);

		h = Math.round(60 * (hh - dd / (maxRGB - minRGB)));
		s = Math.round((maxRGB - minRGB) / maxRGB * 100.0);
		v = Math.round(maxRGB * 100.0);

		return [h, s, v];
	},

	RGB2HEX: function (r, g, b) {
		return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
	},

	RGBfv2HEX: function (r, g, b) {
		return ColorUtil.RGB2HEX(Math.floor(r * 255.0),
			Math.floor(g * 255.0),
			Math.floor(b * 255.0));
	},

	HSV2HEX: function (h, s, v) {
		var rgb = ControlKit.ColorUtil.HSV2RGB(h, s, v);
		return ControlKit.ColorUtil.RGB2HEX(rgb[0], rgb[1], rgb[2]);
	},

	HEX2RGB: function (hex) {
		var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
		hex = hex.replace(shorthandRegex, function (m, r, g, b) {
			return r + r + g + g + b + b;
		});

		var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : null;

	},

	isValidHEX: function (hex) {
		return /^#[0-9A-F]{6}$/i.test(hex);
	},

	isValidRGB: function (r, g, b) {
		return r >= 0 && r <= 255 &&
			g >= 0 && g <= 255 &&
			b >= 0 && b <= 255;
	},

	isValidRGBfv: function (r, g, b) {
		return r >= 0 && r <= 1.0 &&
			g >= 0 && g <= 1.0 &&
			b >= 0 && b <= 1.0;
	}
};

module.exports = ColorUtil;
},{}],42:[function(require,module,exports){
var CSS = {
    ControlKit: 'controlKit',

    Panel: 'panel',
    Head: 'head',
    Label: 'label',
    Menu: 'menu',
    Wrap: 'wrap',

    ButtonMenuClose: 'button-menu-close',
    ButtonMenuHide: 'button-menu-hide',
    ButtonMenuShow: 'button-menu-show',
    ButtonMenuUndo: 'button-menu-undo',
    ButtonMenuLoad: 'button-menu-load',
    ButtonMenuSave: 'button-menu-save',
    MenuActive: 'menu-active',

    Button: 'button',
    ButtonPreset: 'button-preset',
    ButtonPresetActive: 'button-preset-active',

    WrapInputWPreset: 'input-with-preset-wrap',
    WrapColorWPreset: 'color-with-preset-wrap',

    HeadInactive: 'head-inactive',
    PanelHeadInactive: 'panel-head-inactive',

    GroupList: 'group-list',
    Group: 'group',
    SubGroupList: 'sub-group-list',
    SubGroup: 'sub-group',


    TextAreaWrap: 'textarea-wrap',

    WrapSlider: 'wrap-slider',
    SliderWrap: 'slider-wrap',
    SliderSlot: 'slider-slot',
    SliderHandle: 'slider-handle',

    ArrowBMin: 'arrow-b-min',
    ArrowBMax: 'arrow-b-max',
    ArrowBSubMin: 'arrow-b-sub-min',
    ArrowBSubMax: 'arrow-b-sub-max',
    ArrowSMin: 'arrow-s-min',
    ArrowSMax: 'arrow-s-max',

    Select: 'select',
    SelectActive: 'select-active',

    Options: 'options',
    OptionsSelected: 'li-selected',

    CanvasListItem: 'canvas-list-item',
    CanvasWrap: 'canvas-wrap',

    SVGListItem: 'svg-list-item',
    SVGWrap: 'svg-wrap',

    GraphSliderXWrap: 'graph-slider-x-wrap',
    GraphSliderYWrap: 'graph-slider-y-wrap',
    GraphSliderX: 'graph-slider-x',
    GraphSliderY: 'graph-slider-y',
    GraphSliderXHandle: 'graph-slider-x-handle',
    GraphSliderYHandle: 'graph-slider-y-handle',

    Picker: 'picker',
    PickerFieldWrap: 'field-wrap',
    PickerInputWrap: 'input-wrap',
    PickerInputField: 'input-field',
    PickerControlsWrap: 'controls-wrap',
    PickerColorContrast: 'color-contrast',
    PickerHandleField: 'indicator',
    PickerHandleSlider: 'indicator',

    Color: 'color',

    ScrollBar: 'scrollBar',
    ScrollWrap: 'scroll-wrap',
    ScrollBarBtnUp: 'btnUp',
    ScrollBarBtnDown: 'btnDown',
    ScrollBarTrack: 'track',
    ScrollBarThumb: 'thumb',
    ScrollBuffer: 'scroll-buffer',
};

module.exports = CSS;

},{}],43:[function(require,module,exports){
var DocumentEvent = {
    MOUSE_MOVE: 'mousemove',
    MOUSE_UP: 'mouseup',
    MOUSE_DOWN: 'mousedown',
    MOUSE_WHEEL: 'mousewheel',
    WINDOW_RESIZE: 'resize'
};

module.exports = DocumentEvent;
},{}],44:[function(require,module,exports){
var EventDispatcher = require('../event/EventDispatcher'),
    Event_ = require('../event/Event'),
    DocumentEvent = require('./DocumentEvent');
var instance = null;

function Mouse() {
    EventDispatcher.apply(this);
    this._pos = [0,0];
    this._wheelDirection = 0;
    this._hoverElement = null;

    var self = this;
    this._onDocumentMouseMove = function(e){
        var dx = 0,
            dy = 0;

        if (!e)e = window.event;
        if (e.pageX) {
            dx = e.pageX;
            dy = e.pageY;
        }
        else if (e.clientX) {
            dx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
            dy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
        }
        self._pos[0] = dx;
        self._pos[1] = dy;

        self._hoverElement = document.elementFromPoint(dx,dy);
    };

    this._onDocumentMouseWheel = function(event){
        self._wheelDirection = (event.detail < 0) ? 1 : (event.wheelDelta > 0) ? 1 : -1;
        self.dispatchEvent(new Event_(self,DocumentEvent.MOUSE_WHEEL,event));
    };

    document.addEventListener(DocumentEvent.MOUSE_MOVE, this._onDocumentMouseMove);
    document.addEventListener(DocumentEvent.MOUSE_WHEEL,this._onDocumentMouseWheel);
}
Mouse.prototype = Object.create(EventDispatcher.prototype);
Mouse.prototype.constructor = Mouse;

Mouse.prototype._removeDocumentListener = function(){
    document.removeEventListener(DocumentEvent.MOUSE_MOVE, this._onDocumentMouseMove);
    document.removeEventListener(DocumentEvent.MOUSE_WHEEL,this._onDocumentMouseWheel);
};

Mouse.prototype.getPosition = function () {
    return this._pos;
};

Mouse.prototype.getX = function () {
    return this._pos[0];
};

Mouse.prototype.getY = function () {
    return this._pos[1];
};

Mouse.prototype.getWheelDirection = function(){
    return this._wheelDirection;
};

Mouse.prototype.getHoverElement = function(){
    return this._hoverElement;
};

Mouse.setup = function () {
    instance = instance || new Mouse();
    return instance;
};

Mouse.get = function () {
    return instance;
};

Mouse.destroy = function(){
    instance._removeDocumentListener();
    instance = null;
};

module.exports = Mouse;
},{"../event/Event":48,"../event/EventDispatcher":49,"./DocumentEvent":43}],45:[function(require,module,exports){
function Node() {
    this._element = null;

    switch (arguments.length){
        case 1 :
            var arg = arguments[0];
            if (arg != Node.INPUT_TEXT &&
                arg != Node.INPUT_BUTTON &&
                arg != Node.INPUT_SELECT &&
                arg != Node.INPUT_CHECKBOX) {
                this._element = document.createElement(arg);
            }
            else {
                this._element = document.createElement('input');
                this._element.type = arg;
            }
            break;
        case 0:
            this._element = document.createElement('div');
            break;
    }
}

Node.DIV            = 'div';
Node.INPUT_TEXT     = 'text';
Node.INPUT_BUTTON   = 'button';
Node.INPUT_SELECT   = 'select';
Node.INPUT_CHECKBOX = 'checkbox';
Node.OPTION         = 'option';
Node.LIST           = 'ul';
Node.LIST_ITEM      = 'li';
Node.SPAN           = 'span';
Node.TEXTAREA       = 'textarea';

Node.prototype = {
    addChild: function (node) {
        this._element.appendChild(node.getElement());
        return node;
    },
    addChildren: function () {
        var i = -1, l = arguments.length, e = this._element;
        while (++i < l) {
            e.appendChild(arguments[i].getElement());
        }
        return this;
    },
    addChildAt: function (node, index) {
        this._element.insertBefore(node.getElement(), this._element.children[index]);
        return node;
    },
    removeChild: function (node) {
        if (!this.contains(node))return null;
        this._element.removeChild(node.getElement());
        return node;
    },
    removeChildren: function () {
        var i = -1, l = arguments.length, e = this._element;
        while (++i < l) {
            e.removeChild(arguments[i].getElement());
        }
        return this;
    },
    removeChildAt: function (node, index) {
        if (!this.contains(node))return null;
        this._element.removeChild(node.getElement());
        return node;
    },
    removeAllChildren: function () {
        var element = this._element;
        while (element.hasChildNodes())element.removeChild(element.lastChild);
        return this;
    },
    setWidth: function (value) {
        this._element.style.width = value + 'px';
        return this;
    },
    getWidth: function () {
        return this._element.offsetWidth;
    },
    setHeight: function (value) {
        this._element.style.height = value + 'px';
        return this;
    },
    getHeight: function () {
        return this._element.offsetHeight;
    },
    setPosition: function (x, y) {
        return this.setPosition(x).setPosition(y);
    },
    setPositionX: function (x) {
        this._element.style.marginLeft = x + 'px';
        return this;
    },
    setPositionY: function (y) {
        this._element.style.marginTop = y + 'px';
        return this;
    },
    setPositionGlobal: function (x, y) {
        return this.setPositionGlobalX(x).setPositionGlobalY(y);
    },
    setPositionGlobalX: function (x) {
        this._element.style.left = x + 'px';
        return this;
    },
    setPositionGlobalY: function (y) {
        this._element.style.top = y + 'px';
        return this;
    },
    getPosition: function () {
        return [this.getPositionX(), this.getPositionY()];
    },
    getPositionX: function () {
        return this._element.offsetLeft;
    },
    getPositionY: function () {
        return this._element.offsetTop;
    },
    getPositionGlobal: function () {
        var offset = [0, 0],
            element = this._element;

        while (element) {
            offset[0] += element.offsetLeft;
            offset[1] += element.offsetTop;
            element = element.offsetParent;
        }

        return offset;
    },
    getPositionGlobalX: function () {
        var offset = 0,
            element = this._element;

        while (element) {
            offset += element.offsetLeft;
            element = element.offsetParent;
        }

        return offset;
    },
    getPositionGlobalY: function () {
        var offset = 0,
            element = this._element;

        while (element) {
            offset += element.offsetTop;
            element = element.offsetParent;
        }

        return offset;
    },
    addEventListener: function (type, listener, useCapture) {
        this._element.addEventListener(type, listener, useCapture);
        return this;
    },
    removeEventListener: function (type, listener, useCapture) {
        this._element.removeEventListener(type, listener, useCapture);
        return this;
    },
    dispatchEvent : function(event) {
        this._element.dispatchEvent(event);
        return this;
    },
    setStyleClass: function (style) {
        this._element.className = style;
        return this;
    },
    setStyleProperty: function (property, value) {
        this._element.style[property] = value;
        return this;
    },
    getStyleProperty: function (property) {
        return this._element.style[property];
    },
    setStyleProperties: function (properties) {
        for (var p in properties){
            this._element.style[p] = properties[p];
        }
        return this;
    },
    deleteStyleClass: function () {
        this._element.className = '';
        return this
    },
    deleteStyleProperty: function (property) {
        this._element.style[property] = '';
        return this;
    },
    deleteStyleProperties: function (properties) {
        for (var p in properties){
            this._element.style[p] = '';
        }
        return this;
    },
    getChildAt: function (index) {
        return new Node().setElement(this._element.children[index]);
    },
    getChildIndex: function (node) {
        return this._indexOf(this._element, node.getElement());
    },
    getNumChildren: function () {
        return this._element.children.length;
    },
    getFirstChild: function () {
        return new Node().setElement(this._element.firstChild);
    },
    getLastChild: function () {
        return new Node().setElement(this._element.lastChild);
    },
    hasChildren: function () {
        return this._element.children.length != 0;
    },
    contains: function (node) {
        return this._indexOf(this._element, node.getElement()) != -1;
    },
    _indexOf: function (parentElement, element) {
        return Array.prototype.indexOf.call(parentElement.children, element);
    },
    setProperty: function (property, value) {
        this._element[property] = value;
        return this;
    },
    setProperties: function (properties) {
        for (var p in properties){
            this._element[p] = properties[p];
        }
        return this;
    },
    getProperty: function (property) {
        return this._element[property];
    },
    setElement: function (element) {
        this._element = element;
        return this;
    },
    getElement: function () {
        return this._element;
    },
    getStyle: function () {
        return this._element.style;
    },
    getParent: function () {
        return new Node().setElement(this._element.parentNode);
    }
};

Node.getNodeByElement = function (element) {
    return new Node().setElement(element);
};
Node.getNodeById = function (id) {
    return new Node().setElement(document.getElementById(id));
};

module.exports = Node;
},{}],46:[function(require,module,exports){
var NodeEvent = {
    MOUSE_DOWN   : 'mousedown',
    MOUSE_UP     : 'mouseup',
    MOUSE_OVER   : 'mouseover',
    MOUSE_MOVE   : 'mousemove',
    MOUSE_OUT    : 'mouseout',
    KEY_DOWN     : 'keydown',
    KEY_UP       : 'keyup',
    CHANGE       : 'change',
    FINISH       : 'finish',
    DBL_CLICK    : 'dblclick',
    ON_CLICK     : 'click',
    SELECT_START : 'selectstart',
    DRAG_START   : 'dragstart',
    DRAG         : 'drag',
    DRAG_END     : 'dragend',

    DRAG_ENTER   : 'dragenter',
    DRAG_OVER    : 'dragover',
    DRAG_LEAVE   : 'dragleave',

    RESIZE       : 'resize'
};

module.exports = NodeEvent;
},{}],47:[function(require,module,exports){
var Style = { 
	string : "#controlKit{position:absolute;top:0;left:0;width:100%;height:100%;-webkit-touch-callout:none;-webkit-user-select:none;-khtml-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;pointer-events:none}#controlKit .panel{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;pointer-events:auto;position:relative;z-index:1;-webkit-touch-callout:none;-webkit-user-select:none;-khtml-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;overflow:hidden;opacity:1;float:left;width:200px;border-radius:3px;-moz-border-radius:3px;box-shadow:0 2px 2px rgba(0,0,0,.25);margin:0;padding:0;background-color:#1a1a1a;font-family:Arial,sans-serif}#controlKit .panel .wrap{width:auto;height:auto;margin:0;padding:0;position:relative;overflow:hidden}#controlKit .panel ul{margin:0;padding:0;list-style:none}#controlKit .panel .color,#controlKit .panel input[type=text],#controlKit .panel textarea,#controlKit .picker input[type=text]{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;width:100%;height:25px;padding:0 0 0 8px;font-family:Arial,sans-serif;font-size:11px;color:#fff;text-shadow:1px 1px #000;outline:0;background:#222729;background-image:-o-linear-gradient(rgba(0,0,0,.075) 0,rgba(0,0,0,.125) 100%);background-image:linear-gradient(rgba(0,0,0,.075) 0,rgba(0,0,0,.125) 100%);border:none;box-shadow:0 0 0 1px #1f1f1f inset;border-radius:2px;-moz-border-radius:2px}#controlKit .panel .button,#controlKit .panel .select,#controlKit .panel .select-active,#controlKit .picker .button{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;cursor:pointer;width:100%;height:26px;margin:0;background-image:-o-linear-gradient(#404040 0,#3b3b3b 100%);background-image:linear-gradient(#404040 0,#3b3b3b 100%);border:none;outline:0;border-radius:2px;box-shadow:0 0 0 1px #1f1f1f inset,-1px 2px 0 0 #4a4a4a inset;font-family:Arial,sans-serif;color:#fff}#controlKit .panel textarea{padding:5px 8px 2px;overflow:hidden;resize:none;vertical-align:top;white-space:nowrap}#controlKit .panel .textarea-wrap{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;width:100%;padding:0;float:left;height:100%;overflow:hidden;border:none;border-radius:2px;-moz-border-radius:2px;background-color:#222729;box-shadow:0 0 1px 2px rgba(0,0,0,.0125) inset,0 0 1px 1px #111314 inset;background-image:-o-linear-gradient(rgba(0,0,0,.075) 0,rgba(0,0,0,.125) 100%);background-image:linear-gradient(rgba(0,0,0,.075) 0,rgba(0,0,0,.125) 100%)}#controlKit .panel .textarea-wrap textarea{border:none;border-radius:2px;-moz-border-radius:2px;box-shadow:none;background:0 0}#controlKit .panel .textarea-wrap .scrollBar{border:1px solid #101213;border-bottom-right-radius:2px;border-top-right-radius:2px;border-left:none;box-shadow:0 0 1px 2px rgba(0,0,0,.0125) inset,0 0 1px 1px #111314 inset}#controlKit .panel canvas{cursor:pointer;vertical-align:bottom;border:none;box-shadow:0 0 0 1px #1f1f1f inset;border-radius:2px;-moz-border-radius:2px}#controlKit .panel .canvas-wrap,#controlKit .panel .svg-wrap{margin:6px 0 0;position:relative;width:70%;float:right;-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border:none;border-radius:2px;-moz-border-radius:2px;background:#1e2224;background-image:-o-linear-gradient(transparent 0,rgba(0,0,0,.05) 100%);background-image:linear-gradient(transparent 0,rgba(0,0,0,.05) 100%)}#controlKit .panel .canvas-wrap svg,#controlKit .panel .svg-wrap svg{position:absolute;left:0;top:0;cursor:pointer;vertical-align:bottom;border:none;box-shadow:0 0 0 1px #1f1f1f inset;border-radius:2px;-moz-border-radius:2px}#controlKit .panel .button,#controlKit .picker .button{font-size:10px;font-weight:700;text-shadow:0 1px #000;text-transform:uppercase}#controlKit .panel .button:hover,#controlKit .picker .button:hover{background-image:-o-linear-gradient(#454545 0,#3b3b3b 100%);background-image:linear-gradient(#454545 0,#3b3b3b 100%)}#controlKit .panel .button:active,#controlKit .picker .button:active{background-image:-o-linear-gradient(#404040 0,#3b3b3b 100%);background-image:linear-gradient(#404040 0,#3b3b3b 100%)}#controlKit .panel .color-with-preset-wrap,#controlKit .panel .input-with-preset-wrap{width:100%;float:left}#controlKit .panel .color-with-preset-wrap .color,#controlKit .panel .input-with-preset-wrap input[type=text]{padding-right:25px;border-top-right-radius:2px;border-bottom-right-radius:2px;float:left}#controlKit .panel .button-preset,#controlKit .panel .button-preset-active{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;position:absolute;right:0;width:20px;height:25px;margin:0;cursor:pointer;float:right;border:none;border-top-right-radius:2px;border-bottom-right-radius:2px;box-shadow:0 0 0 1px #1f1f1f inset,-1px 2px 0 0 #4a4a4a inset;outline:0}#controlKit .panel .button-preset-active,#controlKit .panel .button-preset:hover{background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAFCAYAAAB4ka1VAAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo+qi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt/87fOH4p3iC+N7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi/RNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z+pn5mZ2y6xlhbL+xW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a/zYnKOZarnivN7cyzytuQN5zvn//tEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1+1dT1gvWd+1YfqGnRs+FYmKrhTbF5cVf9go3HjlG4dvyr+Z3JS0qavEuWTPZtJm6ebeLZ5bDpaql+aXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO/PLi8ZafJzs07P1SkVPRU+lQ27tLdtWHX+G7R7ht7vPY07NXbW7z3/T7JvttVAVVN1WbVZftJ+7P3P66Jqun4lvttXa1ObXHtxwPSA/0HIw6217nU1R3SPVRSj9Yr60cOxx++/p3vdy0NNg1VjZzG4iNwRHnk6fcJ3/ceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w+0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb++6EHTh0kX/i+c7vDvOXPK4dPKy2+UTV7hXmq86X23qdOo8/pPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb/1tWeOT3dvfN6b/fF9/XfFt1+cif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v+3Njv3H9qwHeg89HcR/cGhYPP/pH1jw9DBY+Zj8uGDYbrnjg+OTniP3L96fynQ89kzyaeF/6i/suuFxYvfvjV69fO0ZjRoZfyl5O/bXyl/erA6xmv28bCxh6+yXgzMV70VvvtwXfcdx3vo98PT+R8IH8o/2j5sfVT0Kf7kxmTk/8EA5jz/GMzLdsAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAAAG5JREFUeNpi5ODiamRgYKhjwA4amVx8gxjmL1rC8P3rVxQ8b+ESBhffIAZmNR29A5evXWdiZGC019XSZGBgYGBYvmY9w7I16xoZGBgaWKBG1S9bs+4/AwNDPQMDA1ySgYGBgdEnPAbZzgY0mgEwAE9lJT1lrsffAAAAAElFTkSuQmCC) 50% 50% no-repeat,linear-gradient(#454545 0,#3b3b3b 100%)}#controlKit .panel .button-preset{background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAFCAYAAAB4ka1VAAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo+qi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt/87fOH4p3iC+N7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi/RNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z+pn5mZ2y6xlhbL+xW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a/zYnKOZarnivN7cyzytuQN5zvn//tEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1+1dT1gvWd+1YfqGnRs+FYmKrhTbF5cVf9go3HjlG4dvyr+Z3JS0qavEuWTPZtJm6ebeLZ5bDpaql+aXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO/PLi8ZafJzs07P1SkVPRU+lQ27tLdtWHX+G7R7ht7vPY07NXbW7z3/T7JvttVAVVN1WbVZftJ+7P3P66Jqun4lvttXa1ObXHtxwPSA/0HIw6217nU1R3SPVRSj9Yr60cOxx++/p3vdy0NNg1VjZzG4iNwRHnk6fcJ3/ceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w+0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb++6EHTh0kX/i+c7vDvOXPK4dPKy2+UTV7hXmq86X23qdOo8/pPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb/1tWeOT3dvfN6b/fF9/XfFt1+cif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v+3Njv3H9qwHeg89HcR/cGhYPP/pH1jw9DBY+Zj8uGDYbrnjg+OTniP3L96fynQ89kzyaeF/6i/suuFxYvfvjV69fO0ZjRoZfyl5O/bXyl/erA6xmv28bCxh6+yXgzMV70VvvtwXfcdx3vo98PT+R8IH8o/2j5sfVT0Kf7kxmTk/8EA5jz/GMzLdsAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAAAG5JREFUeNpi5ODiamRgYKhjwA4amVx8gxjmL1rC8P3rVxQ8b+ESBhffIAZmNR29A5evXWdiZGC019XSZGBgYGBYvmY9w7I16xoZGBgaWKBG1S9bs+4/AwNDPQMDA1ySgYGBgdEnPAbZzgY0mgEwAE9lJT1lrsffAAAAAElFTkSuQmCC) 50% 50% no-repeat,linear-gradient(#404040 0,#3b3b3b 100%)}#controlKit .panel input[type=checkbox]{margin:6px 0 0}#controlKit .panel .select,#controlKit .panel .select-active{padding-left:10px;padding-right:20px;font-size:11px;text-align:left;text-shadow:1px 1px #000;cursor:pointer;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}#controlKit .panel .select{background:url(data:image/png;base64,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) 100% 50% no-repeat,linear-gradient(#404040 0,#3b3b3b 100%)}#controlKit .panel .select-active,#controlKit .panel .select:hover{background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAALCAYAAAB24g05AAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo+qi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt/87fOH4p3iC+N7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi/RNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z+pn5mZ2y6xlhbL+xW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a/zYnKOZarnivN7cyzytuQN5zvn//tEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1+1dT1gvWd+1YfqGnRs+FYmKrhTbF5cVf9go3HjlG4dvyr+Z3JS0qavEuWTPZtJm6ebeLZ5bDpaql+aXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO/PLi8ZafJzs07P1SkVPRU+lQ27tLdtWHX+G7R7ht7vPY07NXbW7z3/T7JvttVAVVN1WbVZftJ+7P3P66Jqun4lvttXa1ObXHtxwPSA/0HIw6217nU1R3SPVRSj9Yr60cOxx++/p3vdy0NNg1VjZzG4iNwRHnk6fcJ3/ceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w+0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb++6EHTh0kX/i+c7vDvOXPK4dPKy2+UTV7hXmq86X23qdOo8/pPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb/1tWeOT3dvfN6b/fF9/XfFt1+cif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v+3Njv3H9qwHeg89HcR/cGhYPP/pH1jw9DBY+Zj8uGDYbrnjg+OTniP3L96fynQ89kzyaeF/6i/suuFxYvfvjV69fO0ZjRoZfyl5O/bXyl/erA6xmv28bCxh6+yXgzMV70VvvtwXfcdx3vo98PT+R8IH8o/2j5sfVT0Kf7kxmTk/8EA5jz/GMzLdsAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAAAMNJREFUeNqckjEKwjAUhj8l53AQ526BHKKLIhSlHkHxBkkuIFWPILQOQQd3V4VuXiguFlrFRPzhLXl833uB10uznCaP+q4BEqls83Y5HghFtOH1amkAit2+IwkmzXIGw5HeFFvfZFNs/WA40mmW470P1gf8LokJRCIV11vN9bb42C6RKvoDAdhX/RXxqO8G0F/6FjBBQSIV8+mE2XTcaVTuTOlO0Q36gCndyVbu/A5Hp7fvwLymaeBnuHNILQm/wgDPAQAPNIsHnO794QAAAABJRU5ErkJggg==) 100% 50% no-repeat,linear-gradient(#454545 0,#3b3b3b 100%)}#controlKit .panel .slider-handle,#controlKit .panel .slider-slot,#controlKit .panel .slider-wrap,#controlKit .panel .wrap-slider{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box}#controlKit .panel .wrap-slider{width:70%;padding:6px 0 0;float:right;height:100%}#controlKit .panel .wrap-slider input[type=text]{width:25%;text-align:center;padding:0;float:right}#controlKit .panel .slider-wrap{float:left;cursor:ew-resize;width:70%}#controlKit .panel .slider-slot{width:100%;height:25px;padding:3px;background-color:#1e2224;border:none;box-shadow:0 0 0 1px #1f1f1f inset;border-radius:2px;-moz-border-radius:2px}#controlKit .panel .slider-handle{position:relative;width:100%;height:100%;background:#b32435;background-image:-o-linear-gradient(transparent 0,rgba(0,0,0,.1) 100%);background-image:linear-gradient(transparent 0,rgba(0,0,0,.1) 100%);box-shadow:0 1px 0 0 #0f0f0f}#controlKit .panel .color{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;-webkit-touch-callout:none;-webkit-user-select:none;-khtml-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;cursor:pointer;width:100%;height:25px;padding:0;border:none;background:#fff;box-shadow:0 0 0 1px #111314 inset;text-align:center;line-height:25px;border-radius:2px;-moz-border-radius:2px}#controlKit .panel .graph-slider-x-wrap,#controlKit .panel .graph-slider-y-wrap{position:absolute;-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box}#controlKit .panel .graph-slider-x-wrap{bottom:0;left:0;width:100%;padding:6px 20px 6px 6px}#controlKit .panel .graph-slider-y-wrap{top:0;right:0;height:100%;padding:6px 6px 20px}#controlKit .panel .graph-slider-x,#controlKit .panel .graph-slider-y{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border-radius:2px;-moz-border-radius:2px;background:rgba(24,27,29,.5);border:1px solid #181b1d}#controlKit .panel .graph-slider-x{height:8px}#controlKit .panel .graph-slider-y{width:8px;height:100%}#controlKit .panel .graph-slider-x-handle,#controlKit .panel .graph-slider-y-handle{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;cursor:pointer;border:1px solid #181b1d;background:#303639}#controlKit .panel .graph-slider-x-handle{width:20px;height:100%;border-top:none;border-bottom:none}#controlKit .panel .graph-slider-y-handle{width:100%;height:20px;border-left:none;border-right:none}#controlKit .sub-group .wrap .wrap .wrap{width:25%!important;padding:0!important;float:left!important}#controlKit .sub-group .wrap .wrap .wrap .label{width:100%!important;padding:8px 0 0!important;color:#878787!important;text-align:center!important;text-transform:uppercase!important;font-weight:700!important;text-shadow:1px 1px #1a1a1a!important}#controlKit .sub-group .wrap .wrap .wrap input[type=text]{padding:0;text-align:center}#controlKit .options{pointer-events:auto;-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border:1px solid #1f1f1f;border-radius:2px;-moz-border-radius:2px;position:absolute;z-index:2147483638;left:0;top:0;width:auto;height:auto;box-shadow:0 1px 0 0 #4a4a4a inset;background-color:#454545;font-family:Arial,sans-serif;font-size:11px;color:#fff;text-shadow:1px 1px #000;overflow:hidden}#controlKit .options ul{width:100%;list-style:none;margin:0;padding:0}#controlKit .options ul li{margin:0;width:100%;height:25px;line-height:25px;padding:0 20px 0 10px;overflow:hidden;white-space:normal;text-overflow:ellipsis;cursor:pointer}#controlKit .options ul li:hover{background-color:#1f2325}#controlKit .options ul .li-selected{background-color:#292d30}#controlKit .options .color{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box}#controlKit .options .color .li-selected,#controlKit .options .color li{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;padding:0;height:25px;line-height:25px;text-align:center}#controlKit .options .color .li-selected:hover,#controlKit .options .color li:hover{background:0 0;font-weight:700}#controlKit .options .color .li-selected{font-weight:700}#controlKit .panel .label,#controlKit .picker .label{width:100%;float:left;font-size:11px;font-weight:700;text-shadow:0 1px #000;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;cursor:default}#controlKit .panel .head,#controlKit .panel .panel-head-inactive,#controlKit .picker .head{height:30px;padding:0 10px;background:#1a1a1a;overflow:hidden}#controlKit .panel .head .wrap,#controlKit .panel .panel-head-inactive .wrap,#controlKit .picker .head .wrap{width:auto;height:auto;margin:0;padding:0;position:relative;overflow:hidden}#controlKit .panel .head .label,#controlKit .picker .head .label{cursor:pointer;line-height:30px;color:#65696b}#controlKit .panel .group-list .group .head{height:38px;padding:0 10px;border-top:1px solid #4f4f4f;border-bottom:1px solid #262626;background-image:-o-linear-gradient(#454545 0,#3b3b3b 100%);background-image:linear-gradient(#454545 0,#3b3b3b 100%);cursor:pointer}#controlKit .panel .group-list .group .head .label{font-size:12px;line-height:38px;color:#fff}#controlKit .panel .group-list .group .head:hover{border-top:1px solid #525252;background-image:-o-linear-gradient(#454545 0,#404040 100%);background-image:linear-gradient(#454545 0,#404040 100%)}#controlKit .panel .group-list .group li{height:35px;padding:0 10px}#controlKit .panel .group-list .group .sub-group-list .sub-group:last-of-type{border-bottom:none}#controlKit .panel .group-list .group .sub-group-list .sub-group{padding:0;height:auto;border-bottom:1px solid #242424}#controlKit .panel .group-list .group .sub-group-list .sub-group ul{overflow:hidden}#controlKit .panel .group-list .group .sub-group-list .sub-group ul li{background:#2e2e2e;border-bottom:1px solid #222729}#controlKit .panel .group-list .group .sub-group-list .sub-group ul li:last-of-type{border-bottom:none}#controlKit .panel .group-list .group .sub-group-list .sub-group:first-child{margin-top:0}#controlKit .panel .group-list .group .sub-group-list .sub-group .head,#controlKit .panel .group-list .group .sub-group-list .sub-group .head-inactive{cursor:pointer}#controlKit .panel .group-list .group .sub-group-list .sub-group .head{height:27px;padding:0 10px;border-top:none;border-bottom:1px solid #242424;background-image:none;background-color:#272727}#controlKit .panel .group-list .group .sub-group-list .sub-group .head:hover{background-image:none;background-color:#272727}#controlKit .panel .group-list .group .sub-group-list .sub-group .head-inactive{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;height:27px;padding:0 10px;box-shadow:0 1px 0 0 #404040 inset;background-image:-o-linear-gradient(#3b3b3b 0,#383838 100%);background-image:linear-gradient(#3b3b3b 0,#383838 100%)}#controlKit .panel .group-list .group .sub-group-list .sub-group .head-inactive:hover{box-shadow:0 1px 0 0 #474747 inset;background-image:none;background-image:-o-linear-gradient(#404040 0,#3b3b3b 100%);background-image:linear-gradient(#404040 0,#3b3b3b 100%)}#controlKit .panel .group-list .group .sub-group-list .sub-group .head .label,#controlKit .panel .group-list .group .sub-group-list .sub-group .head-inactive .label{margin:0;padding:0;line-height:27px;color:#fff;font-weight:700;font-size:11px;text-shadow:1px 1px #000;text-transform:capitalize}#controlKit .panel .group-list .group .sub-group-list .sub-group .head .wrap .label,#controlKit .panel .group-list .group .sub-group-list .sub-group .head-inactive .wrap .label{width:100%;font-weight:700;color:#fff;padding:0}#controlKit .panel .group-list .group .sub-group-list .sub-group .wrap .label{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;height:100%;width:30%;padding:12px 5px 0 0;float:left;font-size:11px;font-weight:400;color:#aeb5b8;text-shadow:1px 1px #000}#controlKit .panel .group-list .group .sub-group-list .sub-group .wrap .wrap{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;width:70%;padding:5px 0 0;float:right;height:100%}#controlKit .panel .group-list .group:last-child .scroll-buffer:nth-of-type(3),#controlKit .panel .group-list .group:last-child .sub-group-list{border-bottom:none}#controlKit .panel .scroll-wrap{position:relative;overflow:hidden}#controlKit .panel .scroll-buffer{width:100%;height:8px;border-top:1px solid #3b4447;border-bottom:1px solid #1e2224}#controlKit .panel .scrollBar{-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box;width:15px;height:100%;float:right;top:0;padding:0;margin:0;position:relative;background:#212628;background-image:linear-gradient(to right,#242424 0,#2e2e2e 100%)}#controlKit .panel .scrollBar .track{padding:0 3px 0 2px}#controlKit .panel .scrollBar .track .thumb{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;width:11px;position:absolute;cursor:pointer;background-color:#343434;border:1px solid #1b1f21;border-radius:10px;-moz-border-radius:10px;box-shadow:inset 0 1px 0 0 #434b50}#controlKit .panel .menu,#controlKit .panel .menu-active,#controlKit .picker .menu{float:right;padding:5px 0 0}#controlKit .panel .menu input[type=button],#controlKit .panel .menu-active input[type=button],#controlKit .picker .menu input[type=button]{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;cursor:pointer;height:20px;border:none;vertical-align:top;border-radius:2px;-moz-border-radius:2px;font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:#aaa;text-shadow:0 -1px #000;text-transform:uppercase;box-shadow:0 0 0 1px #131313 inset,-1px 2px 0 0 #212527 inset;outline:0}#controlKit .panel .menu .button-menu-close,#controlKit .panel .menu .button-menu-hide,#controlKit .panel .menu .button-menu-show,#controlKit .panel .menu-active .button-menu-close,#controlKit .panel .menu-active .button-menu-hide,#controlKit .panel .menu-active .button-menu-show,#controlKit .picker .menu .button-menu-close,#controlKit .picker .menu .button-menu-hide,#controlKit .picker .menu .button-menu-show{width:20px;margin-left:4px}#controlKit .panel .menu .button-menu-hide,#controlKit .panel .menu-active .button-menu-hide,#controlKit .picker .menu .button-menu-hide{background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAFCAYAAAB4ka1VAAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo+qi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt/87fOH4p3iC+N7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi/RNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z+pn5mZ2y6xlhbL+xW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a/zYnKOZarnivN7cyzytuQN5zvn//tEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1+1dT1gvWd+1YfqGnRs+FYmKrhTbF5cVf9go3HjlG4dvyr+Z3JS0qavEuWTPZtJm6ebeLZ5bDpaql+aXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO/PLi8ZafJzs07P1SkVPRU+lQ27tLdtWHX+G7R7ht7vPY07NXbW7z3/T7JvttVAVVN1WbVZftJ+7P3P66Jqun4lvttXa1ObXHtxwPSA/0HIw6217nU1R3SPVRSj9Yr60cOxx++/p3vdy0NNg1VjZzG4iNwRHnk6fcJ3/ceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w+0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb++6EHTh0kX/i+c7vDvOXPK4dPKy2+UTV7hXmq86X23qdOo8/pPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb/1tWeOT3dvfN6b/fF9/XfFt1+cif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v+3Njv3H9qwHeg89HcR/cGhYPP/pH1jw9DBY+Zj8uGDYbrnjg+OTniP3L96fynQ89kzyaeF/6i/suuFxYvfvjV69fO0ZjRoZfyl5O/bXyl/erA6xmv28bCxh6+yXgzMV70VvvtwXfcdx3vo98PT+R8IH8o/2j5sfVT0Kf7kxmTk/8EA5jz/GMzLdsAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAAAGRJREFUeNpidPUNYoCBU0cO1DMwMDCY2Tg0wsRYkCVlFZUboGy4ImZldU24pJySCgO/oBADAwODw/VL5xmk5RQOMr99/RIuCQPIiljMbBwYGBgYGH7//MmADCSlZRkkpWUZAAMAvTsgXBvOsq0AAAAASUVORK5CYII=) 50% 50% no-repeat,#1a1d1f}#controlKit .panel .menu .button-menu-hide:hover,#controlKit .panel .menu-active .button-menu-hide:hover,#controlKit .picker .menu .button-menu-hide:hover{background:url(data:image/png;base64,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) 50% 50% no-repeat,#000;box-shadow:#fff 0,#000 100%}#controlKit .panel .menu .button-menu-show,#controlKit .panel .menu-active .button-menu-show,#controlKit .picker .menu .button-menu-show{background:url(data:image/png;base64,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) 50% 50% no-repeat,#1a1d1f}#controlKit .panel .menu .button-menu-show:hover,#controlKit .panel .menu-active .button-menu-show:hover,#controlKit .picker .menu .button-menu-show:hover{background:url(data:image/png;base64,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) 50% 50% no-repeat,#000;box-shadow:#fff 0,#000 100%}#controlKit .panel .menu .button-menu-close,#controlKit .panel .menu-active .button-menu-close,#controlKit .picker .menu .button-menu-close{background:url(data:image/png;base64,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) 50% 50% no-repeat,#1a1d1f}#controlKit .panel .menu .button-menu-close:hover,#controlKit .panel .menu-active .button-menu-close:hover,#controlKit .picker .menu .button-menu-close:hover{background:url(data:image/png;base64,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) 50% 50% no-repeat,#000;box-shadow:#fff 0,#000 100%}#controlKit .panel .menu .button-menu-undo,#controlKit .panel .menu-active .button-menu-undo{background:url(data:image/png;base64,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) 20% 50% no-repeat,#1a1d1f;padding:0 6px 1px 0;width:38px;vertical-align:top;text-align:end}#controlKit .panel .menu .button-menu-undo:hover,#controlKit .panel .menu-active .button-menu-undo:hover{background:url(data:image/png;base64,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) 20% 50% no-repeat,#000;box-shadow:#fff 0,#000 100%}#controlKit .panel .menu .button-menu-load,#controlKit .panel .menu-active .button-menu-load{margin-right:2px}#controlKit .panel .menu .button-menu-load,#controlKit .panel .menu .button-menu-save,#controlKit .panel .menu-active .button-menu-load,#controlKit .panel .menu-active .button-menu-save{background:#1a1d1f;font-size:9px!important}#controlKit .panel .menu .button-menu-load:hover,#controlKit .panel .menu .button-menu-save:hover,#controlKit .panel .menu-active .button-menu-load:hover,#controlKit .panel .menu-active .button-menu-save:hover{background:#000}#controlKit .panel .menu .wrap{display:none}#controlKit .panel .menu-active{width:100%;float:left}#controlKit .panel .menu-active .wrap{display:inline}#controlKit .panel .menu-active .button-menu-close,#controlKit .panel .menu-active .button-menu-hide,#controlKit .panel .menu-active .button-menu-show{float:right}#controlKit .panel .arrow-s-max{background:url(data:image/png;base64,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) center no-repeat}#controlKit .panel .arrow-s-min{background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAFCAYAAAB4ka1VAAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo+qi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt/87fOH4p3iC+N7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi/RNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z+pn5mZ2y6xlhbL+xW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a/zYnKOZarnivN7cyzytuQN5zvn//tEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1+1dT1gvWd+1YfqGnRs+FYmKrhTbF5cVf9go3HjlG4dvyr+Z3JS0qavEuWTPZtJm6ebeLZ5bDpaql+aXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO/PLi8ZafJzs07P1SkVPRU+lQ27tLdtWHX+G7R7ht7vPY07NXbW7z3/T7JvttVAVVN1WbVZftJ+7P3P66Jqun4lvttXa1ObXHtxwPSA/0HIw6217nU1R3SPVRSj9Yr60cOxx++/p3vdy0NNg1VjZzG4iNwRHnk6fcJ3/ceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w+0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb++6EHTh0kX/i+c7vDvOXPK4dPKy2+UTV7hXmq86X23qdOo8/pPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb/1tWeOT3dvfN6b/fF9/XfFt1+cif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v+3Njv3H9qwHeg89HcR/cGhYPP/pH1jw9DBY+Zj8uGDYbrnjg+OTniP3L96fynQ89kzyaeF/6i/suuFxYvfvjV69fO0ZjRoZfyl5O/bXyl/erA6xmv28bCxh6+yXgzMV70VvvtwXfcdx3vo98PT+R8IH8o/2j5sfVT0Kf7kxmTk/8EA5jz/GMzLdsAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAAAFpJREFUeNpsiiEOgDAMRf8SxNJzIYfB1PQkQ7RkZcfBYLnbUAsL4cn3Xkgs6NzXqQAwL+ve3TTGLWcDgKPWd0osiERa3FunuLdIpIkFiEQ2xu8UEosBUPxjzwATSjV/8qlMGAAAAABJRU5ErkJggg==) center no-repeat}#controlKit .panel .arrow-s-max,#controlKit .panel .arrow-s-min{width:100%;height:20px}#controlKit .panel .arrow-b-max{background:url(data:image/png;base64,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) center no-repeat}#controlKit .panel .arrow-b-min{background:url(data:image/png;base64,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) center no-repeat}#controlKit .panel .arrow-b-sub-max{background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAGCAYAAAD68A/GAAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo+qi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt/87fOH4p3iC+N7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi/RNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z+pn5mZ2y6xlhbL+xW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a/zYnKOZarnivN7cyzytuQN5zvn//tEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1+1dT1gvWd+1YfqGnRs+FYmKrhTbF5cVf9go3HjlG4dvyr+Z3JS0qavEuWTPZtJm6ebeLZ5bDpaql+aXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO/PLi8ZafJzs07P1SkVPRU+lQ27tLdtWHX+G7R7ht7vPY07NXbW7z3/T7JvttVAVVN1WbVZftJ+7P3P66Jqun4lvttXa1ObXHtxwPSA/0HIw6217nU1R3SPVRSj9Yr60cOxx++/p3vdy0NNg1VjZzG4iNwRHnk6fcJ3/ceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w+0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb++6EHTh0kX/i+c7vDvOXPK4dPKy2+UTV7hXmq86X23qdOo8/pPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb/1tWeOT3dvfN6b/fF9/XfFt1+cif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v+3Njv3H9qwHeg89HcR/cGhYPP/pH1jw9DBY+Zj8uGDYbrnjg+OTniP3L96fynQ89kzyaeF/6i/suuFxYvfvjV69fO0ZjRoZfyl5O/bXyl/erA6xmv28bCxh6+yXgzMV70VvvtwXfcdx3vo98PT+R8IH8o/2j5sfVT0Kf7kxmTk/8EA5jz/GMzLdsAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAAAGJJREFUeNpi9AmPYUAGezavq2dgYGBw8Q1qRBZnQVdkae/cAGWjKGZW09FDUWTp4MIgq6DEwMDA4HBo1zYGJXXNg3CFyIpgAF0x86P7dxrQFWFTzOgTHtPAwMBQz4AfNAAGAN1CKPs4NDLvAAAAAElFTkSuQmCC) center no-repeat}#controlKit .panel .arrow-b-sub-min{background:url(data:image/png;base64,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) center no-repeat}#controlKit .panel .arrow-b-max,#controlKit .panel .arrow-b-min,#controlKit .panel .arrow-b-sub-max,#controlKit .panel .arrow-b-sub-min{width:10px;height:100%;float:right}#controlKit .picker{pointer-events:auto;-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border-radius:3px;-moz-border-radius:3px;background-color:#3b3b3b;font-family:Arial,sans-serif;font-size:11px;color:#fff;text-shadow:1px 1px #000;overflow:hidden;position:absolute;z-index:2147483631;width:360px;-webkit-touch-callout:none;-webkit-user-select:none;-khtml-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;box-shadow:0 2px 2px rgba(0,0,0,.25)}#controlKit .picker canvas{vertical-align:bottom;cursor:pointer}#controlKit .picker .wrap{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;padding:10px;float:left}#controlKit .picker .field-wrap{padding:3px}#controlKit .picker .slider-wrap{padding:3px 13px 3px 3px}#controlKit .picker .field-wrap,#controlKit .picker .input-wrap,#controlKit .picker .slider-wrap{height:auto;overflow:hidden;float:left}#controlKit .picker .input-wrap{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border:1px solid #242424;border-radius:2px;-moz-border-radius:2px;width:140px;float:right;padding:5px 10px 1px 0}#controlKit .picker .input-field{width:50%;float:right;margin-bottom:4px}#controlKit .picker .input-field .label{padding:8px 0 0;color:#878787;text-align:center;text-transform:uppercase;font-weight:700;text-shadow:1px 1px #1a1a1a;width:40%}#controlKit .picker .input-field .wrap{padding:0;width:60%;height:auto;float:right}#controlKit .picker .controls-wrap{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;width:100%;height:auto;float:right;padding:9px 0 0}#controlKit .picker .controls-wrap input[type=button]{float:right;width:65px;margin:0 0 0 10px}#controlKit .picker .color-contrast{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border:none;box-shadow:0 0 0 1px #1f1f1f inset;border-radius:2px;-moz-border-radius:2px;height:25px;padding:3px;width:80%;margin-bottom:4px;float:right}#controlKit .picker .color-contrast div{width:50%;height:100%;float:left}#controlKit .picker input[type=text]{padding:0;text-align:center;width:60%;float:right}#controlKit .picker .wrap .input-wrap:nth-of-type(3){border-bottom-left-radius:0;border-bottom-right-radius:0}#controlKit .picker .wrap .input-wrap:nth-of-type(4){border-top:none;border-top-left-radius:0;border-top-right-radius:0}#controlKit .picker .wrap .input-wrap:nth-of-type(4) .input-field{width:100%}#controlKit .picker .wrap .input-wrap:nth-of-type(4) .input-field .label{width:20%}#controlKit .picker .wrap .input-wrap:nth-of-type(4) input[type=text]{width:80%}#controlKit .picker .field-wrap,#controlKit .picker .slider-wrap{background:#1e2224;border:none;box-shadow:0 0 0 1px #1f1f1f inset;border-radius:2px;-moz-border-radius:2px;position:relative;margin-right:5px}#controlKit .picker .field-wrap .indicator,#controlKit .picker .slider-wrap .indicator{position:absolute;border:2px solid #fff;box-shadow:0 1px black,0 1px #000 inset;cursor:pointer}#controlKit .picker .field-wrap .indicator{width:8px;height:8px;left:50%;top:50%;border-radius:50%;-moz-border-radius:50%}#controlKit .picker .slider-wrap .indicator{width:14px;height:3px;border-radius:8px;-moz-border-radius:8px;left:1px;top:1px}#controlKit .picker .slider-wrap .indicator:after{content:'';width:0;height:0;border-top:4.5px solid transparent;border-bottom:4.5px solid transparent;border-right:4px solid #fff;float:right;position:absolute;top:-2px;left:19px}#controlKit .picker .slider-wrap .indicator:before{content:'';width:0;height:0;border-top:4.5px solid transparent;border-bottom:4.5px solid transparent;border-right:4px solid #000;float:right;position:absolute;top:-3px;left:19px}"
}; 
module.exports = Style;
},{}],48:[function(require,module,exports){
function Event_(sender,type,data) {
    this.sender = sender;
    this.type   = type;
    this.data   = data;
}
module.exports = Event_;
},{}],49:[function(require,module,exports){
function EventDispatcher() {
    this._listeners = [];
};

EventDispatcher.prototype = {
    addEventListener: function (eventType, listener, callbackMethod) {
        this._listeners[eventType] = this._listeners[eventType] || [];
        this._listeners[eventType].push({obj: listener, method: callbackMethod});
    },

    dispatchEvent: function (event) {
        var type = event.type;

        if (!this.hasEventListener(type)){
            return;
        }

        var listeners = this._listeners[type];
        var i = -1, l = listeners.length;

        var obj, method;

        while (++i < l) {
            obj = listeners[i].obj;
            method = listeners[i].method;

            if (!obj[method]){
                throw obj + ' has no method ' + method;
            }

            obj[method](event);
        }
    },

    removeEventListener: function (type, obj, method) {
        if (!this.hasEventListener(type)){
            return;
        }

        var listeners = this._listeners[type];

        var i = listeners.length;
        while (--i > -1) {
            if (listeners[i].obj == obj && listeners[i].method == method) {
                listeners.splice(i, 1);
                if (listeners.length == 0){
                    delete this._listeners[type];
                }
                break;
            }
        }
    },

    removeAllEventListeners: function () {
        this._listeners = [];
    },

    hasEventListener: function (type) {
        return this._listeners[type] != undefined && this._listeners[type] != null;
    }
};

module.exports = EventDispatcher;
},{}],50:[function(require,module,exports){
var LayoutMode = {
    LEFT   : 'left',
    RIGHT  : 'right',
    TOP    : 'top',
    BOTTOM : 'bottom',
    NONE   : 'none'
};

module.exports = LayoutMode;
},{}],51:[function(require,module,exports){
var Node   = require('../document/Node');
var Metric = require('../../component/Metric');
var CSS    = require('../document/CSS');
var DocumentEvent = require('../document/DocumentEvent'),
    NodeEvent     = require('../document/NodeEvent');
var Mouse  = require('../document/Mouse');

function ScrollBar(parentNode,targetNode,wrapHeight) {
    this._parentNode = parentNode;
    this._targetNode = targetNode;
    this._wrapHeight = wrapHeight;

    var wrap   = this._wrapNode   = new Node().setStyleClass(CSS.ScrollWrap),
        node   = this._node       = new Node().setStyleClass(CSS.ScrollBar),
        track  = this._trackNode  = new Node().setStyleClass(CSS.ScrollBarTrack),
        thumb  = this._thumbNode  = new Node().setStyleClass(CSS.ScrollBarThumb);

    parentNode.removeChild(targetNode);
    parentNode.addChild(wrap);
    parentNode.addChildAt(node,0);

    wrap.addChild(targetNode);
    node.addChild(track);
    track.addChild(thumb);

    this._mouseThumbOffset = 0;
    this._scrollHeight = 0;
    this._scrollUnit   = 0;
    this._scrollMin    = 0;
    this._scrollMax    = 0;

    thumb.setPositionY(Metric.SCROLLBAR_TRACK_PADDING);
    thumb.addEventListener(DocumentEvent.MOUSE_DOWN,this._onThumbDragStart.bind(this));

    this._isValid  = false;
    this._enabled = false;

    var nodeElement = node.getElement(),
        thumbElement = thumb.getElement();
    var self = this;
    this._onMouseWheel = function(e){
        var sender = e.sender,
            hoverElement = sender.getHoverElement();
        if(hoverElement != nodeElement && hoverElement != thumbElement){
            return;
        }
        var scrollStep = self._scrollHeight * 0.0125;
        self._scroll(thumb.getPositionY() + sender.getWheelDirection() * scrollStep * -1);
        e.data.preventDefault();
    };

    this.addMouseListener();
}

ScrollBar.prototype.update = function(){
    var target = this._targetNode,
        thumb = this._thumbNode;

    var padding = Metric.SCROLLBAR_TRACK_PADDING;

    var targetWrapHeight = this._wrapHeight,
        targetHeight = target.getHeight(),
        trackHeight = targetWrapHeight - padding * 2;

    thumb.setHeight(trackHeight);

    var ratio = targetWrapHeight / targetHeight;

    this._isValid = false;

    if (ratio > 1.0){
        return;
    }
    var thumbHeight = trackHeight * ratio;

    this._scrollHeight = trackHeight;
    this._scrollUnit   = targetHeight - this._scrollHeight - padding * 2;
    this._scrollMin    = padding;
    this._scrollMax    = padding + trackHeight - thumbHeight;

    thumb.setHeight(thumbHeight);

    this._isValid = true;
};

ScrollBar.prototype._scroll = function(y){
    var min  = this._scrollMin,
        max  = this._scrollMax,
        pos  = Math.max(min, Math.min(y,max)),
        pos_ = (pos-min)/(max-min);

    this._thumbNode.setPositionY(pos);
    this._targetNode.setPositionY(pos_ * this._scrollUnit * -1);
};


ScrollBar.prototype._onThumbDragStart = function () {
    if (!this._isValid || this._enabled){
        return;
    }
    var eventMove = DocumentEvent.MOUSE_MOVE,
        eventUp = DocumentEvent.MOUSE_UP;

    var mouse = Mouse.get();
    var trackOffset = this._trackNode.getPositionGlobalY();

    this._mouseThumbOffset = mouse.getY() - this._thumbNode.getPositionGlobalY();

    var self = this;
    var onDrag = function () {
            self._scroll(mouse.getY() - trackOffset - self._mouseThumbOffset);
        },
        onDragEnd = function () {
            document.removeEventListener(eventMove, onDrag, false);
            document.removeEventListener(eventUp, onDragEnd, false);
        };

    document.addEventListener(eventMove, onDrag, false);
    document.addEventListener(eventUp, onDragEnd, false);
    this._scroll(mouse.getY() - trackOffset - self._mouseThumbOffset);
};


ScrollBar.prototype.enable = function () {
    this._enabled = false;
    this._updateAppearance();
};

ScrollBar.prototype.disable = function () {
    this._enabled = true;
    this._updateAppearance();
};
ScrollBar.prototype.reset = function () {
    this._scroll(0);
};

ScrollBar.prototype._updateAppearance = function () {
    if (this._enabled) {
        this._node.setStyleProperty('display', 'none');
        this._targetNode.setPositionY(0);
        this._thumbNode.setPositionY(Metric.SCROLLBAR_TRACK_PADDING);
    } else {
        this._node.setStyleProperty('display', 'block');
    }
};

ScrollBar.prototype.isValid = function () {
    return this._isValid;
};

ScrollBar.prototype.setWrapHeight = function (height) {
    this._wrapHeight = height;
    this.update();
};

ScrollBar.prototype.removeTargetNode = function () {
    return this._wrapNode.removeChild(this._targetNode);
};

ScrollBar.prototype.removeMouseListener = function(){
    Mouse.get().removeEventListener(DocumentEvent.MOUSE_WHEEL,this,'_onMouseWheel');
};

ScrollBar.prototype.addMouseListener = function(){
    Mouse.get().addEventListener(DocumentEvent.MOUSE_WHEEL,this,'_onMouseWheel');
};

ScrollBar.prototype.removeFromParent = function () {
    var parentNode = this._parentNode,
        rootNode = this._node,
        targetNode = this._targetNode;

    rootNode.removeChild(targetNode);
    parentNode.removeChild(this._wrapNode);
    parentNode.removeChild(rootNode);

    return targetNode;
};

ScrollBar.prototype.getWrapNode = function () {
    return this._wrapNode;
};

ScrollBar.prototype.getNode = function () {
    return this._node;
};

ScrollBar.prototype.getTargetNode = function () {
    return this._targetNode;
};


module.exports = ScrollBar;
},{"../../component/Metric":12,"../document/CSS":42,"../document/DocumentEvent":43,"../document/Mouse":44,"../document/Node":45,"../document/NodeEvent":46}],52:[function(require,module,exports){
var EventDispatcher = require('../core/event/EventDispatcher');
var Node            = require('../core/document/Node');
var ScrollBar       = require('../core/layout/ScrollBar');

function AbstractGroup(parent, params) {
    EventDispatcher.apply(this, arguments);

    params = params || {};
    params.height = params.height || null;
    params.enable = params.enable === undefined ? true : params.enable;

    this._parent = parent;
    this._height = params.height;
    this._enabled = params.enable;
    this._scrollBar = null;

    this._node = new Node(Node.LIST_ITEM);
    this._wrapNode = new Node();
    this._listNode = new Node(Node.LIST);

    this._parent.getList().addChild(this._node);
}
AbstractGroup.prototype = Object.create(EventDispatcher.prototype);
AbstractGroup.prototype.constructor = AbstractGroup;

AbstractGroup.prototype.addScrollWrap = function () {
    var wrapNode = this._wrapNode,
        maxHeight = this.getMaxHeight();

    this._scrollBar = new ScrollBar(wrapNode, this._listNode, maxHeight);
    if (this.isEnabled()) {
        wrapNode.setHeight(maxHeight);
    }
};

AbstractGroup.prototype.preventSelectDrag = function () {
    this._parent.preventSelectDrag();

    if (!this.hasScrollWrap()) {
        return;
    }
    this._wrapNode.getElement().scrollTop = 0;
};

AbstractGroup.prototype.hasMaxHeight = function () {
    return this._height != null;
};

AbstractGroup.prototype.getMaxHeight = function () {
    return this._height;
};

AbstractGroup.prototype.hasScrollWrap = function () {
    return this._scrollBar != null;
};

AbstractGroup.prototype.hasLabel = function () {
    return this._lablNode != null;
};

AbstractGroup.prototype.disable = function () {
    this._enabled = false;
    this._updateAppearance();
};

AbstractGroup.prototype.enable = function () {
    this._enabled = true;
    this._updateAppearance();
};

AbstractGroup.prototype.isDisabled = function () {
    return !this._enabled;
};

AbstractGroup.prototype.isEnabled = function () {
    return this._enabled;
};

AbstractGroup.prototype.getList = function () {
    return this._listNode;
};

module.exports = AbstractGroup;


},{"../core/document/Node":45,"../core/event/EventDispatcher":49,"../core/layout/ScrollBar":51}],53:[function(require,module,exports){
var AbstractGroup = require('./AbstractGroup');
var CSS = require('../core/document/CSS');
var Node = require('../core/document/Node');

var SubGroup = require('./SubGroup');

var Event_ = require('../core/event/Event'),
    DocumentEvent = require('../core/document/DocumentEvent'),
    NodeEvent = require('../core/document/NodeEvent'),
    PanelEvent = require('./PanelEvent'),
    GroupEvent = require('./GroupEvent');

var ObjectComponent = require('../core/ObjectComponent'),
    ValuePlotter    = require('../component/ValuePlotter'),
    FunctionPlotter = require('../component/FunctionPlotter');

function Group(parent,params) {
    params           = params || {};
    params.label     = params.label     || null;
    params.useLabels = params.useLabels || true;
    params.enable    = params.enable     === undefined ? true : params.enable;

    AbstractGroup.apply(this,arguments);

    this._components = [];
    this._subGroups  = [];

    var root = this._node,
        wrap = this._wrapNode,
        list = this._listNode;

        root.setStyleClass(CSS.Group);
        wrap.setStyleClass(CSS.Wrap);
        list.setStyleClass(CSS.SubGroupList);

        wrap.addChild(list);

    var label = params.label;

    if(label){
        var head  = new Node(),
            wrap_ = new Node(),
            label_  = new Node(Node.SPAN),
            indicator = this._indiNode = new Node();

            head.setStyleClass(CSS.Head);
            wrap_.setStyleClass(CSS.Wrap);
            label_.setStyleClass(CSS.Label);
            indicator.setStyleClass(CSS.ArrowBMax);
            label_.setProperty('innerHTML',label);

            head.addChild(indicator);
            wrap_.addChild(label_);
            head.addChild(wrap_);
            root.addChild(head);

        head.addEventListener(NodeEvent.MOUSE_DOWN,this._onHeadTrigger.bind(this));
        this.addEventListener(GroupEvent.GROUP_LIST_SIZE_CHANGE,parent,'onGroupListSizeChange');

        this._updateAppearance();
    }

    if(this.hasMaxHeight()){
        this.addScrollWrap();
    }

    root.addChild(wrap);

    if(this.hasMaxHeight()){
        if(!label){
            var bufferTop = this._scrollBufferTop = new Node();
                bufferTop.setStyleClass(CSS.ScrollBuffer);

            root.addChildAt(bufferTop,0);
        }
        var bufferBottom = this._scrollBufferBottom = new Node();
            bufferBottom.setStyleClass(CSS.ScrollBuffer);

        root.addChild(bufferBottom);
    }

    parent = this._parent;

    parent.addEventListener(PanelEvent.PANEL_MOVE_BEGIN, this, 'onPanelMoveBegin');
    parent.addEventListener(PanelEvent.PANEL_MOVE, this, 'onPanelMove');
    parent.addEventListener(PanelEvent.PANEL_MOVE_END, this, 'onPanelMoveEnd');
    parent.addEventListener(PanelEvent.PANEL_HIDE, this, 'onPanelHide');
    parent.addEventListener(PanelEvent.PANEL_SHOW, this, 'onPanelShow');
    parent.addEventListener(PanelEvent.PANEL_SCROLL_WRAP_ADDED, this, 'onPanelScrollWrapAdded');
    parent.addEventListener(PanelEvent.PANEL_SCROLL_WRAP_REMOVED, this, 'onPanelScrollWrapRemoved');
    parent.addEventListener(PanelEvent.PANEL_SIZE_CHANGE, this, 'onPanelSizeChange');
    parent.addEventListener(DocumentEvent.WINDOW_RESIZE, this, 'onWindowResize');

    this.addEventListener(GroupEvent.GROUP_SIZE_CHANGE,parent,'onGroupListSizeChange');
}
Group.prototype = Object.create(AbstractGroup.prototype);
Group.prototype.constructor = Group;

Group.prototype.onPanelMoveBegin = function () {
    this.dispatchEvent(new Event_(this, PanelEvent.PANEL_MOVE_BEGIN, null));
};

Group.prototype.onPanelMove = function () {
    this.dispatchEvent(new Event_(this, PanelEvent.PANEL_MOVE, null));
};

Group.prototype.onPanelMoveEnd = function () {
    this.dispatchEvent(new Event_(this, PanelEvent.PANEL_MOVE_END, null));
};

Group.prototype.onPanelScrollWrapAdded = function () {
    this.dispatchEvent(new Event_(this, GroupEvent.GROUP_SIZE_CHANGE, null));
};

Group.prototype.onPanelScrollWrapRemoved = function () {
    this.dispatchEvent(new Event_(this, GroupEvent.GROUP_SIZE_CHANGE, null));
};

Group.prototype.onPanelHide = function () {
    this.dispatchEvent(new Event_(this, GroupEvent.SUBGROUP_DISABLE, null));
};

Group.prototype.onPanelShow = function () {
    this.dispatchEvent(new Event_(this, GroupEvent.SUBGROUP_ENABLE, null));
};

Group.prototype.onPanelSizeChange = function () {
    this.dispatchEvent(new Event_(this, GroupEvent.GROUP_SIZE_CHANGE, null));
};

Group.prototype.onWindowResize = function (e) {
    this.dispatchEvent(e);
};

Group.prototype.onSubGroupTrigger = function () {
    this._updateHeight();

    if(!this.hasMaxHeight()){
        return;
    }
    var scrollBar = this._scrollBar,
        wrap  = this._wrapNode;
    var bufferTop    = this._scrollBufferTop,
        bufferBottom = this._scrollBufferBottom;

    scrollBar.update();

    if (!scrollBar.isValid()) {
        scrollBar.disable();
        wrap.setHeight(wrap.getChildAt(1).getHeight());
        if (bufferTop){
            bufferTop.setStyleProperty('display', 'none');
        }
        if (bufferBottom){
            bufferBottom.setStyleProperty('display', 'none');
        }
    }
    else {
        scrollBar.enable();
        wrap.setHeight(this.getMaxHeight());

        if (bufferTop){
            bufferTop.setStyleProperty('display', 'block');
        }
        if (bufferBottom){
            bufferBottom.setStyleProperty('display', 'block');
        }
    }
    this.dispatchEvent(new Event_(this,GroupEvent.GROUP_SIZE_CHANGE,null));
};

Group.prototype._onHeadTrigger = function () {
    this._enabled = !this._enabled;
    this._updateAppearance();
    this.dispatchEvent(new Event_(this, GroupEvent.GROUP_LIST_SIZE_CHANGE, null));
};

Group.prototype.addComponent = function(){
    var Class_ = arguments[0];
    var args   = Array.prototype.slice.call(arguments);
        args.shift();
        args.unshift(this._getSubGroup());

    var instance = Object.create(Class_.prototype);
    Class_.apply(instance,args);

    this._components.push(instance);
    this._updateHeight();
};

Group.prototype._updateHeight = function () {
    this._getSubGroup().update();
    this.dispatchEvent(new Event_(this,GroupEvent.GROUP_SIZE_CHANGE,null));
    if(this.hasMaxHeight()){
        this._scrollBar.update();
    }
};

Group.prototype._updateAppearance = function () {
    var wrap = this._wrapNode,
        indicator = this._indiNode;

    var scrollBar = this._scrollBar;

    var bufferTop    = this._scrollBufferTop,
        bufferBottom = this._scrollBufferBottom;

    if (this.isDisabled()) {
        wrap.setHeight(0);
        if (indicator){
            indicator.setStyleClass(CSS.ArrowBMin);
        }

        if (scrollBar) {
            if (bufferTop){
                bufferTop.setStyleProperty('display', 'none');
            }
            if (bufferBottom){
                bufferBottom.setStyleProperty('display', 'none');
            }
        }
        return;
    }

    if (this.hasMaxHeight()) {
        var maxHeight = this.getMaxHeight(),
            listHeight = wrap.getChildAt(1).getHeight();

        wrap.setHeight(listHeight < maxHeight ? listHeight : maxHeight);

        if (scrollBar.isValid()) {
            if (bufferTop){
                bufferTop.setStyleProperty('display', 'block');
            }
            if (bufferBottom){
                bufferBottom.setStyleProperty('display', 'block');
            }
        }
    }
    else {
        wrap.deleteStyleProperty('height');
    }
    if (indicator){
        indicator.setStyleClass(CSS.ArrowBMax);
    }
};

Group.prototype.onGroupSizeUpdate = function () {
    this._updateAppearance();
    if (this.hasMaxHeight()){
        this._scrollBar.update();
    }
};

Group.prototype.addSubGroup = function (params) {
    this._subGroups.push(new SubGroup(this, params));
    this._updateHeight();
    return this;
};

Group.prototype._getSubGroup = function () {
    var subGroups = this._subGroups;
    if (subGroups.length == 0){
        subGroups.push(new SubGroup(this));
    }
    return subGroups[subGroups.length - 1];
};

Group.prototype.getComponents = function () {
    return this._components;
};

function isDataComp(comp){
    return  (comp instanceof ObjectComponent) &&
           !(comp instanceof ValuePlotter) &&
           !(comp instanceof FunctionPlotter);
}


Group.prototype.setData = function(data){
    var comps = this._components, comp, data_;
    var i = -1, j = 0, l = comps.length;
    while(++i < l){
        comp = comps[i];
        if(!isDataComp(comp)){
            continue;
        }
        data_ = data[j++];
        comp.setValue(data_[Object.keys(data_)[0]]);
    }
};

Group.prototype.getData = function(){
    var comps = this._components,
        i = -1, l = comps.length;
    var values = [];
    var comp;
    while(++i < l){
        comp = comps[i];
        if(!isDataComp(comp)){
            continue;
        }
        values.push(comp.getData());
    }
    return values;
};

module.exports = Group;

},{"../component/FunctionPlotter":9,"../component/ValuePlotter":29,"../core/ObjectComponent":35,"../core/document/CSS":42,"../core/document/DocumentEvent":43,"../core/document/Node":45,"../core/document/NodeEvent":46,"../core/event/Event":48,"./AbstractGroup":52,"./GroupEvent":54,"./PanelEvent":57,"./SubGroup":58}],54:[function(require,module,exports){
var GroupEvent = {
	GROUP_SIZE_CHANGE        : 'groupSizeChange',
	GROUP_LIST_SIZE_CHANGE   : 'groupListSizeChange',
	GROUP_SIZE_UPDATE        : 'groupSizeUpdate',
	SUBGROUP_TRIGGER         : 'subGroupTrigger',

	SUBGROUP_ENABLE          : 'enableSubGroup',
	SUBGROUP_DISABLE         : 'disableSubGroup'
};

module.exports = GroupEvent;
},{}],55:[function(require,module,exports){
var MenuEvent = {
	UPDATE_MENU: 'updateMenu'
};
module.exports = MenuEvent;
},{}],56:[function(require,module,exports){
var Node      = require('../core/document/Node'),
    Group     = require('./Group'),
    ScrollBar = require('../core/layout/ScrollBar');

var CSS        = require('../core/document/CSS');
var LayoutMode = require('../core/layout/LayoutMode');
var History    = require('../core/History');

var EventDispatcher = require('../core/event/EventDispatcher'),
    Event_          = require('../core/event/Event'),
    DocumentEvent   = require('../core/document/DocumentEvent'),
    NodeEvent       = require('../core/document/NodeEvent'),
    PanelEvent      = require('./PanelEvent'),
    MenuEvent       = require('./MenuEvent');

var Mouse = require('../core/document/Mouse');

var StringInput     = require('../component/StringInput'),
    NumberInput     = require('../component/NumberInput'),
    Range           = require('../component/Range'),
    Checkbox        = require('../component/Checkbox'),
    Color           = require('../component/Color'),
    Button          = require('../component/Button'),
    Select          = require('../component/Select'),
    Slider          = require('../component/Slider'),
    FunctionPlotter = require('../component/FunctionPlotter'),
    Pad             = require('../component/Pad'),
    ValuePlotter    = require('../component/ValuePlotter'),
    NumberOutput    = require('../component/NumberOutput'),
    StringOutput    = require('../component/StringOutput'),
    Canvas_         = require('../component/Canvas'),
    SVG_            = require('../component/SVG');

var DEFAULT_PANEL_POSITION = null,
    DEFAULT_PANEL_WIDTH      = 200,
    DEFAULT_PANEL_HEIGHT     = null,
    DEFAULT_PANEL_WIDTH_MIN  = 100,
    DEFAULT_PANEL_WIDTH_MAX  = 600,
    DEFAULT_PANEL_RATIO      = 40,
    DEFAULT_PANEL_LABEL      = 'Control Panel',
    DEFAULT_PANEL_VALIGN     = LayoutMode.TOP,
    DEFAULT_PANEL_ALIGN      = LayoutMode.RIGHT,
    DEFAULT_PANEL_DOCK       = {align:LayoutMode.RIGHT,resizable:true},
    DEFAULT_PANEL_ENABLE     = true,
    DEFAULT_PANEL_OPACITY    = 1.0,
    DEFAULT_PANEL_FIXED      = true,
    DEFAULT_PANEL_VCONSTRAIN = true;

function Panel(controlKit,params){
    EventDispatcher.apply(this,arguments);
    this._parent = controlKit;


    params            = params           || {};
    params.valign     = params.valign    || DEFAULT_PANEL_VALIGN;
    params.align      = params.align     || DEFAULT_PANEL_ALIGN;
    params.position   = params.position  || DEFAULT_PANEL_POSITION;
    params.width      = params.width     || DEFAULT_PANEL_WIDTH;
    params.height     = params.height    || DEFAULT_PANEL_HEIGHT;
    params.ratio      = params.ratio     || DEFAULT_PANEL_RATIO;
    params.label      = params.label     || DEFAULT_PANEL_LABEL;
    params.opacity    = params.opacity   || DEFAULT_PANEL_OPACITY;
    params.fixed      = params.fixed      === undefined ? DEFAULT_PANEL_FIXED      : params.fixed;
    params.enable     = params.enable     === undefined ? DEFAULT_PANEL_ENABLE     : params.enable;
    params.vconstrain = params.vconstrain === undefined ? DEFAULT_PANEL_VCONSTRAIN : params.vconstrain;

    if (params.dock) {
        params.dock.align = params.dock.align || DEFAULT_PANEL_DOCK.align;
        params.dock.resizable = params.dock.resizable || DEFAULT_PANEL_DOCK.resizable;
    }

    this._width      = Math.max(DEFAULT_PANEL_WIDTH_MIN,
                       Math.min(params.width,DEFAULT_PANEL_WIDTH_MAX));
    this._height     = params.height ?  Math.max(0,Math.min(params.height,window.innerHeight)) : null;
    this._fixed      = params.fixed;
    this._dock       = params.dock;
    this._position   = params.position;
    this._vConstrain = params.vconstrain;
    this._label      = params.label;
    this._enabled    = params.enable;
    this._groups     = [];


    var width    = this._width,
        isFixed  = this._fixed,
        dock     = this._dock,
        position = this._position,
        label    = this._label,
        align    = params.align,
        opacity  = params.opacity;


    var root = this._node     = new Node().setStyleClass(CSS.Panel),
        head = this._headNode = new Node().setStyleClass(CSS.Head),
        menu      = new Node().setStyleClass(CSS.Menu),
        labelWrap = new Node().setStyleClass(CSS.Wrap),
        label_    = new Node(Node.SPAN).setStyleClass(CSS.Label),
        wrap = this._wrapNode = new Node(Node.DIV).setStyleClass(CSS.Wrap),
        list = this._listNode = new Node(Node.LIST).setStyleClass(CSS.GroupList);

    root.setWidth(width);
    label_.setProperty('innerHTML', label);

    labelWrap.addChild(label_);
    head.addChild(menu);
    head.addChild(labelWrap);
    wrap.addChild(list);
    root.addChild(head);
    root.addChild(wrap);

    controlKit.getNode().addChild(root);


    if (!dock) {
        var menuHide = this._menuHide = new Node(Node.INPUT_BUTTON);
            menuHide.setStyleClass(CSS.ButtonMenuHide);
            menuHide.addEventListener(NodeEvent.MOUSE_DOWN, this._onMenuHideMouseDown.bind(this));

        menu.addChild(menuHide);

        if (this._parent.panelsAreClosable()) {
            var menuClose = new Node(Node.INPUT_BUTTON);
            menuClose.setStyleClass(CSS.ButtonMenuClose);
            menuClose.addEventListener(NodeEvent.MOUSE_DOWN, this.disable.bind(this));

            menu.addChild(menuClose);
        }


        if (this.hasMaxHeight()) {
            this._addScrollWrap();
        }

        if (!isFixed) {
            if (position) {
                if (align == LayoutMode.LEFT ||
                    align == LayoutMode.TOP ||
                    align == LayoutMode.BOTTOM) {
                    root.setPositionGlobal(position[0], position[1]);
                }
                else {
                    root.setPositionGlobal(window.innerWidth - width - position[0], position[1]);
                    this._position = root.getPosition();
                }
            }
            else this._position = root.getPosition();

            this._mouseOffset = [0, 0];

            root.setStyleProperty('position', 'absolute');
            head.addEventListener(NodeEvent.MOUSE_DOWN, this._onHeadDragStart.bind(this));
        }
        else {
            if (position) {
                var positionX = position[0],
                    positionY = position[1];

                if (positionY != 0)root.setPositionY(positionY);
                if (positionX != 0)if (align == LayoutMode.RIGHT)root.getElement().marginRight = positionX;
                else root.setPositionX(positionX);
            }

            root.setStyleProperty('float', align);
        }
    }
    else {
        var dockAlignment = dock.align;

        if (dockAlignment == LayoutMode.LEFT ||
            dockAlignment == LayoutMode.RIGHT) {
            align = dockAlignment;
            this._height = window.innerHeight;
        }

        if (dockAlignment == LayoutMode.TOP ||
            dockAlignment == LayoutMode.BOTTOM) {

        }

        /*
         if(dock.resizable)
         {
         var sizeHandle = new ControlKit.Node(ControlKit.NodeType.DIV);
         sizeHandle.setStyleClass(ControlKit.CSS.SizeHandle);
         rootNode.addChild(sizeHandle);
         }
         */

        root.setStyleProperty('float', align);
    }

    var parent = this._parent;
    var historyIsEnabled = parent.historyIsEnabled(),
        statesAreEnabled = parent.statesAreEnabled();

    if(historyIsEnabled || statesAreEnabled){
        menu.addChildAt(new Node(),0).setStyleClass(CSS.Wrap);//.setStyleProperty('display','none');
    }

    if (historyIsEnabled) {
        this._menuUndo = menu.getChildAt(0)
            .addChild(new Node(Node.INPUT_BUTTON))
                .setStyleClass(CSS.ButtonMenuUndo)
                .setProperty('value',History.get().getNumStates())
                .addEventListener(NodeEvent.MOUSE_DOWN,function(){
                    History.get().popState();
                });
        parent.addEventListener(MenuEvent.UPDATE_MENU,this, 'onUpdateMenu');
    }
    if(statesAreEnabled){
        menu.getChildAt(0)
            .addChild(new Node(Node.INPUT_BUTTON))
                .setStyleClass(CSS.ButtonMenuLoad)
                .setProperty('value','Load')
                .addEventListener(NodeEvent.MOUSE_DOWN,function(){
                    controlKit._loadState();
                });
        menu.getChildAt(0)
            .addChild(new Node(Node.INPUT_BUTTON))
                .setStyleClass(CSS.ButtonMenuSave)
                .setProperty('value','Save')
                .addEventListener(NodeEvent.MOUSE_DOWN,function(){
                    controlKit._saveState();
                });
    }
    if(historyIsEnabled || statesAreEnabled){
        head.addEventListener(NodeEvent.MOUSE_OVER,function(){
            menu.setStyleClass(CSS.MenuActive);
        });
        head.addEventListener(NodeEvent.MOUSE_OUT,function(){
            menu.setStyleClass(CSS.Menu);
        });
    }
    if (opacity != 1.0 && opacity != 0.0) {
        root.setStyleProperty('opacity', opacity);
    }
    window.addEventListener(DocumentEvent.WINDOW_RESIZE,this._onWindowResize.bind(this));
    this._updateAppearance();
}
Panel.prototype = Object.create(EventDispatcher.prototype);
Panel.prototype.constructor = Panel;

Panel.prototype._onMenuHideMouseDown = function () {
    this._enabled = !this._enabled;
    this._updateAppearance();
};

Panel.prototype.onUpdateMenu = function () {
    this._menuUndo.setProperty('value', History.get().getNumStates());
};

Panel.prototype._onMenuUndoTrigger = function () {
    History.get().popState();
};


Panel.prototype._updateAppearance = function () {
    var rootNode = this._node,
        headNode = this._headNode,
        menuHide = this._menuHide;

    if (!this._enabled) {
        headNode.getStyle().borderBottom = 'none';
        rootNode.setHeight(headNode.getHeight());
        menuHide.setStyleClass(CSS.ButtonMenuShow);
        this.dispatchEvent(new Event_(this, PanelEvent.PANEL_HIDE, null));
    }
    else {
        rootNode.setHeight(headNode.getHeight() + this._wrapNode.getHeight());
        rootNode.deleteStyleProperty('height');
        menuHide.setStyleClass(CSS.ButtonMenuHide);
        headNode.setStyleClass(CSS.Head);
        this.dispatchEvent(new Event_(this, PanelEvent.PANEL_SHOW, null));
    }
};

Panel.prototype._onHeadDragStart = function(){
    var parentNode = this._parent.getNode(),
        node       = this._node;

    var nodePos   = node.getPositionGlobal(),
        mousePos  = Mouse.get().getPosition(),
        offsetPos = this._mouseOffset;

        offsetPos[0] = mousePos[0] - nodePos[0];
        offsetPos[1] = mousePos[1] - nodePos[1];

    var eventMouseMove = DocumentEvent.MOUSE_MOVE,
        eventMouseUp   = DocumentEvent.MOUSE_UP;

    var self = this;

    var onDrag = function () {
            self._updatePosition();
        },
        onDragEnd = function () {
            document.removeEventListener(eventMouseMove, onDrag, false);
            document.removeEventListener(eventMouseUp, onDragEnd, false);
            self.dispatchEvent(new Event_(this, PanelEvent.PANEL_MOVE_END, null));
        };

    parentNode.removeChild(node);
    parentNode.addChild(   node);

    document.addEventListener(eventMouseMove, onDrag,    false);
    document.addEventListener(eventMouseUp,   onDragEnd, false);

    this.dispatchEvent(new Event_(this,PanelEvent.PANEL_MOVE_BEGIN,null));
};

Panel.prototype._updatePosition = function () {
    var mousePos = Mouse.get().getPosition(),
        offsetPos = this._mouseOffset;

    var position = this._position;
    position[0] = mousePos[0] - offsetPos[0];
    position[1] = mousePos[1] - offsetPos[1];

    this._constrainHeight();
    this._constrainPosition();

    this.dispatchEvent(new Event_(this, PanelEvent.PANEL_MOVE, null));
};

Panel.prototype._onWindowResize = function () {
    if (this.isDocked()) {
        var dock = this._dock;

        if (dock.align == LayoutMode.RIGHT ||
            dock.align == LayoutMode.LEFT) {
            var windowHeight = window.innerHeight,
                listHeight = this._listNode.getHeight(),
                headHeight = this._headNode.getHeight();

            this._height = windowHeight;

            if ((windowHeight - headHeight) > listHeight){
                this._scrollBar.disable();
            }
            else{
                this._scrollBar.enable();
            }

            this.dispatchEvent(new Event_(this, PanelEvent.PANEL_SIZE_CHANGE));
        }
    }
    else {
        if (!this.isFixed()){
            this._constrainPosition();
        }
    }
    this._constrainHeight();
    this.dispatchEvent(new Event_(this, DocumentEvent.WINDOW_RESIZE));
};

Panel.prototype._constrainPosition = function () {
    var node = this._node;

    var maxX = window.innerWidth - node.getWidth(),
        maxY = window.innerHeight - node.getHeight();

    var position = this._position;
    position[0] = Math.max(0, Math.min(position[0], maxX));
    position[1] = Math.max(0, Math.min(position[1], maxY));

    node.setPositionGlobal(position[0], position[1]);
};

Panel.prototype._constrainHeight = function () {
    if (!this._vConstrain)return;

    var hasMaxHeight = this.hasMaxHeight(),
        hasScrollWrap = this.hasScrollWrap();

    var head = this._headNode,
        wrap = this._wrapNode;

    var scrollBar = this._scrollBar;

    var panelTop = this.isDocked() ? 0 :
        this.isFixed() ? 0 :
            this._position[1];

    var panelHeight = hasMaxHeight ? this.getMaxHeight() :
        hasScrollWrap ? scrollBar.getTargetNode().getHeight() :
            wrap.getHeight();

    var panelBottom = panelTop + panelHeight;
    var headHeight = head.getHeight();

    var windowHeight = window.innerHeight,
        heightDiff = windowHeight - panelBottom - headHeight,
        heightSum;

    if (heightDiff < 0.0) {
        heightSum = panelHeight + heightDiff;

        if (!hasScrollWrap) {
            this._addScrollWrap(heightSum);
            this.dispatchEvent(new Event_(this, PanelEvent.PANEL_SCROLL_WRAP_ADDED, null));
            return;
        }

        scrollBar.setWrapHeight(heightSum);
        wrap.setHeight(heightSum);
    }
    else {
        if (!hasMaxHeight && hasScrollWrap) {
            scrollBar.removeFromParent();
            wrap.addChild(this._listNode);
            wrap.deleteStyleProperty('height');
            this._scrollBar.removeMouseListener();
            this._scrollBar = null;

            this.dispatchEvent(new Event_(this, PanelEvent.PANEL_SCROLL_WRAP_REMOVED, null));
        }
    }
};

Panel.prototype.onGroupListSizeChange = function () {
    if (this.hasScrollWrap()){
        this._updateScrollWrap();
    }
    this._constrainHeight();
};

Panel.prototype._updateScrollWrap = function () {
    var wrap   = this._wrapNode,
        scrollBar  = this._scrollBar,
        height     = this.hasMaxHeight() ? this.getMaxHeight() : 100,
        listHeight = this._listNode.getHeight();

    wrap.setHeight(listHeight < height ? listHeight : height);

    scrollBar.update();

    if (!scrollBar.isValid()) {
        scrollBar.disable();
        wrap.setHeight(wrap.getChildAt(1).getHeight());
    }
    else {
        scrollBar.enable();
        wrap.setHeight(height);
    }
};

Panel.prototype._addScrollWrap = function () {
    var wrapNode = this._wrapNode,
        listNode = this._listNode,
        height = arguments.length == 0 ?
            this.getMaxHeight() :
            arguments[0];

    this._scrollBar = new ScrollBar(wrapNode, listNode, height);
    if (this.isEnabled()){
        wrapNode.setHeight(height);
    }
};

Panel.prototype.hasScrollWrap = function () {
    return this._scrollBar != null;
};


Panel.prototype.preventSelectDrag = function () {
    if (!this.hasScrollWrap()){
        return;
    }
    this._wrapNode.getElement().scrollTop = 0;
};

Panel.prototype.enable = function () {
    this._node.setStyleProperty('display', 'block');
    this._enabled = true;
    this._updateAppearance();
};


Panel.prototype.disable = function () {
    this._node.setStyleProperty('display', 'none');
    this._enabled = false;
    this._updateAppearance();
};

Panel.prototype.isEnabled = function () {
    return this._enabled;
};

Panel.prototype.isDisabled = function () {
    return !this._enabled;
};

Panel.prototype.hasMaxHeight = function () {
    return this._height != null;
};

Panel.prototype.getMaxHeight = function () {
    return this._height;
};

Panel.prototype.isDocked = function () {
    return this._dock;
};

Panel.prototype.isFixed = function () {
    return this._fixed;
};

Panel.prototype.getGroups = function () {
    return this._groups;
};

Panel.prototype.getNode = function () {
    return this._node;
};

Panel.prototype.getList = function () {
    return this._listNode;
};

Panel.prototype.getWidth = function () {
    return this._width;
};

Panel.prototype.getPosition = function () {
    return this._position;
};

Panel.prototype.getParent = function(){
    return this._parent;
};

/**
 * Adds a new Group to the Panel.
 * @param {Object} [params] - Group options
 * @param {String} [params.label=''] - The Group label string
 * @param {Boolean} [params.useLabel=true] - Trigger whether all contained SubGroups and Components should use labels
 * @param {Boolean} [params.enable=true] - Defines initial state open / closed
 * @param {Number} [params.height=null] - Defines if the height of the Group should be constrained to certain height
 * @returns {Panel}
 */

Panel.prototype.addGroup = function (params) {
    var group = new Group(this, params);
    this._groups.push(group);
    if (this.isDocked()){
        this.dispatchEvent(new Event_(this, PanelEvent.PANEL_SIZE_CHANGE));
    }
    return this;
};

/**
 * Adds a new SubGroup to the last added Group.
 * @param {Object} [params] - SubGroup options
 * @param {String} [params.label=''] - The SubGroup label string
 * @param {Boolean} [params.useLabel=true] - Trigger whether all Components should use labels
 * @param {Boolean} [params.enable=true] - Defines initial state open / closed
 * @param {Number} [params.height=null] - Defines if the height of the SubGroup should be constrained to certain height
 * @returns {Panel}
 */

Panel.prototype.addSubGroup = function(params){
    var groups = this._groups;
    if(groups.length == 0){
        this.addGroup();
    }
    groups[groups.length - 1].addSubGroup(params);
    return this;
};

Panel.prototype._addComponent = function(){
    var groups = this._groups,
        group;
    if(groups.length == 0){
        groups.push(new Group(this));
    }
    group = groups[groups.length-1];

    group.addComponent.apply(group,arguments);
    return this;
};

/**
 * Adds a new StringInput to last added SubGroup.
 * @param {Object} object - The object
 * @param {String} value - The property key
 * @param {Object} [params] - StringInput options
 * @param {String} [params.label=value] - StringInput label
 * @param {Function} [params.onChange] - Callback on change
 * @param {Array} [params.presets] - A set of presets
 * @returns {Panel}
 */

Panel.prototype.addStringInput = function (object, value, params) {
    return this._addComponent(StringInput,object,value,params);
};

/**
 * Adds a new NumberInput to last added SubGroup.
 * @param {Object} object - The object.
 * @param {String} value - The property key.
 * @param {Object} [params] - Component options.
 * @param {String} [params.label=value] - NumberInput label
 * @param {Function} [params.onChange] - Callback on change
 * @param {Number} [params.step] - Amount subbed/added on arrowDown/arrowUp press
 * @param {Number} [params.dp] - Decimal places displayed
 * @param {Array} [params.presets] - A set of presets
 * @returns {Panel}
 */

Panel.prototype.addNumberInput = function (object, value, params) {
    return this._addComponent(NumberInput,object,value,params);
};

/**
 * Adds a new Range input to last added SubGroup.
 * @param {Object} object - The object
 * @param {String} value - The property key
 * @param {Object} [params] - Component options
 * @param {String} [params.label=value] - Range label
 * @param {Function} [params.onChange] - Callback on change
 * @param {Number} [params.step] - Amount subbed/added on arrowDown/arrowUp press
 * @param {Number} [params.dp] - Decimal places displayed
 * @returns {Panel}
 */

Panel.prototype.addRange = function (object, value, params) {
    return this._addComponent(Range,object,value,params);
};

/**
 * Adds a new Checkbox to last added SubGroup.
 * @param {Object} object - The object
 * @param {String} value - The property key
 * @param {Object} [params] - Component options
 * @param {String} [params.label=value] - Checkbox label
 * @param {Function} [params.onChange] - Callback on change
 * @returns {Panel}
 */

Panel.prototype.addCheckbox = function (object, value, params) {
    return this._addComponent(Checkbox,object,value,params);
};

/**
 * Adds a new Color modifier to last added SubGroup.
 * @param {Object} object - The object
 * @param {String} value - The property key
 * @param {Object} [params] - Component options
 * @param {String} [params.label=value] - Color label
 * @param {Function} [params.onChange] - Callback on change
 * @param {String} [params.colorMode='rgb'] - The colorMode to be used: 'hex' #ff00ff, 'rgb' [255,0,255], 'rgbfv' [1,0,1]
 * @param {Array} [params.presets] - A set of preset colors matching params.colorMode
 * @returns {Panel}
 */

Panel.prototype.addColor = function (object, value, params) {
    return this._addComponent(Color,object,value, params);
};

/**
 * Adds a new Button to last added SubGroup.
 * @param {String} label - The object
 * @param {Function} onPress - Callback
 * @param {Object} [params] - Component options
 * @param {String} [params.label=value] - Button label
 * @returns {Panel}
 */

Panel.prototype.addButton = function (label, onPress, params) {
    return this._addComponent(Button,label,onPress,params);
};

/**
 * Adds a new Select to last added SubGroup.
 * @param {Object} object - The object
 * @param {String} value - The property key
 * @param {Object} [params] - Component options
 * @param {String} [params.label=value] - Button label
 * @param {Function} [params.onChange] - Callback on change - function(index){}
 * @param {String} [params.target] - The property to be set on select
 * @returns {Panel}
 */

Panel.prototype.addSelect = function (object, value, params) {
    return this._addComponent(Select,object,value,params);
};

/**
 * Adds a new Slider to last added SubGroup.
 * @param {Object} object - The object
 * @param {String} value - The property key
 * @param {String} range - The min/max array key to be used
 * @param {Object} [params] - Component options
 * @param {String} [params.label=value] - Slider label
 * @param {Function} [params.onChange] - Callback on change
 * @param {Function} [params.onFinish] - Callback on finish
 * @param {Number} [params.step] - Amount subbed/added on arrowDown/arrowUp press inside the input
 * @param {Number} [params.dp] - Decimal places displayed
 * @returns {Panel}
 */

Panel.prototype.addSlider = function (object, value, range, params) {
    return this._addComponent(Slider,object,value,range,params);
};

/**
 * Adds a new FunctionPlotter to last added SubGroup.
 * @param {Object} object - The object
 * @param {String} value - The property key - f(x), f(x,y)
 * @param {Object} [params] - Component options
 * @param {String} [params.label=value] - FunctionPlotter label
 * @returns {Panel}
 */

Panel.prototype.addFunctionPlotter = function (object, value, params) {
    return this._addComponent(FunctionPlotter,object,value,params);
};

/**
 * Adds a new XY-Pad to last added SubGroup.
 * @param {Object} object - The object
 * @param {String} value - The property key
 * @param {Object} [params] - Component options
 * @param {String} [params.label=value] - Pad label
 * @returns {Panel}
 */

Panel.prototype.addPad = function (object, value, params) {
    return this._addComponent(Pad,object,value,params);
};

/**
 * Adds a new ValuePlotter to last added SubGroup.
 * @param {Object} object - The object
 * @param {String} value - The property key
 * @param {Object} [params] - Component options
 * @param {String} [params.label=value] - Plotter label
 * @param {Number} [params.height] - Plotter height
 * @param {Number} [params.resolution] - Graph resolution
 * @returns {Panel}
 */

Panel.prototype.addValuePlotter = function (object, value, params) {
    return this._addComponent(ValuePlotter,object,value,params);
};

/**
 * Adds a new NumberOutput to last added SubGroup.
 * @param {Object} object - The object
 * @param {String} value - The property key
 * @param {Object} [params] - Component options
 * @param {String} [params.label=value] - Output label
 * @param {Number} [params.dp] - Decimal places displayed
 * @returns {Panel}
 */

Panel.prototype.addNumberOutput = function (object, value, params) {
    return this._addComponent(NumberOutput,object,value,params);
};

/**
 * Adds a new StringOutput to last added SubGroup.
 * @param {Object} object - The object
 * @param {String} value - The property key
 * @param {Object} [params] - Component options
 * @param {String} [params.label=value] - Output label
 * @returns {Panel}
 */

Panel.prototype.addStringOutput = function (object, value, params) {
    return this._addComponent(StringOutput,object,value,params);
};

Panel.prototype.addCanvas = function (params) {
    return this._addComponent(Canvas_,params);
};

Panel.prototype.addSVG = function (params) {
    return this._addComponent(SVG_,params);
};

Panel.prototype.setData = function(data){
    var groups = this._groups,
        i = -1, l = groups.length;
    while(++i < l){
        groups[i].setData(data[i]);
    }
};

Panel.prototype.getData = function(){
    var groups = this._groups,
        i = -1, l = groups.length;
    var data = [];
    while(++i  < l){
        data.push(groups[i].getData());
    }
    return data;
};

module.exports = Panel;
},{"../component/Button":3,"../component/Canvas":5,"../component/Checkbox":6,"../component/Color":7,"../component/FunctionPlotter":9,"../component/NumberInput":13,"../component/NumberOutput":15,"../component/Pad":18,"../component/Range":21,"../component/SVG":22,"../component/Select":24,"../component/Slider":25,"../component/StringInput":27,"../component/StringOutput":28,"../component/ValuePlotter":29,"../core/History":33,"../core/document/CSS":42,"../core/document/DocumentEvent":43,"../core/document/Mouse":44,"../core/document/Node":45,"../core/document/NodeEvent":46,"../core/event/Event":48,"../core/event/EventDispatcher":49,"../core/layout/LayoutMode":50,"../core/layout/ScrollBar":51,"./Group":53,"./MenuEvent":55,"./PanelEvent":57}],57:[function(require,module,exports){
var PanelEvent = {
	PANEL_MOVE_BEGIN          : 'panelMoveBegin',
	PANEL_MOVE                : 'panelMove',
	PANEL_MOVE_END            : 'panelMoveEnd',

	PANEL_SHOW                : 'panelShow',
	PANEL_HIDE                : 'panelHide',

	PANEL_SCROLL_WRAP_ADDED   : 'panelScrollWrapAdded',
	PANEL_SCROLL_WRAP_REMOVED : 'panelScrollWrapRemoved',

	PANEL_SIZE_CHANGE        : 'panelSizeChange'
};
module.exports = PanelEvent;
},{}],58:[function(require,module,exports){
var AbstractGroup = require('./AbstractGroup');
var Node = require('../core/document/Node');
var CSS  = require('../core/document/CSS');

var Event_         = require('../core/event/Event'),
    DocumentEvent  = require('../core/document/DocumentEvent'),
    PanelEvent     = require('./PanelEvent'),
    GroupEvent     = require('./GroupEvent'),
    ComponentEvent = require('../core/ComponentEvent');

function SubGroup(parent,params){
    params            = params          || {};
    params.label      = params.label    || null;
    params.useLabels  = params.useLabels  === undefined ? true : params.useLabels;

    AbstractGroup.apply(this,arguments);

    var rootNode = this._node,
        wrapNode = this._wrapNode,
        listNode = this._listNode;

        rootNode.setStyleClass(CSS.SubGroup);
        wrapNode.setStyleClass(CSS.Wrap);

        wrapNode.addChild(listNode);
        rootNode.addChild(wrapNode);

    this._useLabels  = params.useLabels;

    var label = params.label;

    if (label && label.length != 0 && label != 'none') {
        var headNode = this._headNode = new Node(),
            lablWrap = new Node(),
            lablNode = new Node(Node.SPAN);

        headNode.setStyleClass(CSS.Head);
        lablWrap.setStyleClass(CSS.Wrap);
        lablNode.setStyleClass(CSS.Label);

        lablNode.setProperty('innerHTML', label);

        lablWrap.addChild(lablNode);
        headNode.addChild(lablWrap);


        var indiNode = this._indiNode = new Node();
        indiNode.setStyleClass(CSS.ArrowBSubMax);
        headNode.addChildAt(indiNode, 0);

        rootNode.addChildAt(headNode, 0);

        this.addEventListener(GroupEvent.SUBGROUP_TRIGGER, this._parent, 'onSubGroupTrigger');
        headNode.addEventListener(DocumentEvent.MOUSE_DOWN, this._onHeadMouseDown.bind(this));

        this._updateAppearance();

    }

    if(this.hasMaxHeight()){
        this.addScrollWrap();
    }

    this._parent.addEventListener(GroupEvent.SUBGROUP_ENABLE,  this, 'onEnable');
    this._parent.addEventListener(GroupEvent.SUBGROUP_DISABLE, this, 'onDisable');
    this._parent.addEventListener(PanelEvent.PANEL_MOVE_END,   this, 'onPanelMoveEnd');
    this._parent.addEventListener(GroupEvent.GROUP_SIZE_CHANGE,this, 'onGroupSizeChange');
    this._parent.addEventListener(PanelEvent.PANEL_SIZE_CHANGE,this, 'onPanelSizeChange');
    this._parent.addEventListener(DocumentEvent.WINDOW_RESIZE,    this, 'onWindowResize');

    this.addEventListener(GroupEvent.GROUP_SIZE_UPDATE,this._parent,'onGroupSizeUpdate');
}
SubGroup.prototype = Object.create(AbstractGroup.prototype);
SubGroup.prototype.constructor = SubGroup;

//FIXME
SubGroup.prototype._onHeadMouseDown = function () {
    this._enabled = !this._enabled;
    this._onTrigger();

    var event = DocumentEvent.MOUSE_UP,
        self  = this;
    var onDocumentMouseUp = function () {
        self._onTrigger();
        document.removeEventListener(event, onDocumentMouseUp);
    };

    document.addEventListener(event,onDocumentMouseUp);
};

SubGroup.prototype._onTrigger = function() {
    this._updateAppearance();
    this.dispatchEvent(new Event_(this,GroupEvent.SUBGROUP_TRIGGER,null));
};


SubGroup.prototype._updateAppearance = function () {
    if (this.isDisabled()) {
        this._wrapNode.setHeight(0);
        if (this.hasLabel()) {
            this._headNode.setStyleClass(CSS.HeadInactive);
            this._indiNode.setStyleClass(CSS.ArrowBSubMin);
        }
    }
    else {
        if (this.hasMaxHeight()) {
            this._wrapNode.setHeight(this.getMaxHeight());
        } else {
            this._wrapNode.deleteStyleProperty('height');
        }
        if (this.hasLabel()) {
            this._headNode.setStyleClass(CSS.Head);
            this._indiNode.setStyleClass(CSS.ArrowBSubMax);
        }
    }
};

SubGroup.prototype.update = function () {
    if (this.hasMaxHeight()){
        this._scrollBar.update();
    }
};

SubGroup.prototype.onComponentSelectDrag = function () {
    this.preventSelectDrag();
};

SubGroup.prototype.onEnable = function () {
    if (this.isDisabled()){
        return;
    }
    this.dispatchEvent(new Event_(this, ComponentEvent.ENABLE, null));
};
SubGroup.prototype.onDisable = function () {
    if (this.isDisabled()){
        return;
    }
    this.dispatchEvent(new Event_(this, ComponentEvent.DISABLE, null));
};

//bubble
SubGroup.prototype.onGroupSizeChange = function () {
    this.dispatchEvent(new Event_(this, GroupEvent.GROUP_SIZE_CHANGE, null));
};
SubGroup.prototype.onGroupSizeUpdate = function () {
    this.dispatchEvent(new Event_(this, GroupEvent.GROUP_SIZE_UPDATE, null));
};
SubGroup.prototype.onPanelMoveEnd = function () {
    this.dispatchEvent(new Event_(this, PanelEvent.PANEL_MOVE_END, null));
};
SubGroup.prototype.onPanelSizeChange = function () {
    this._updateAppearance();
};
SubGroup.prototype.onWindowResize = function (e) {
    this.dispatchEvent(e);
};

SubGroup.prototype.hasLabel = function () {
    return this._headNode != null;
};
SubGroup.prototype.addComponentNode = function (node) {
    this._listNode.addChild(node);
};
SubGroup.prototype.usesLabels = function () {
    return this._useLabels;
};

module.exports = SubGroup;
},{"../core/ComponentEvent":31,"../core/document/CSS":42,"../core/document/DocumentEvent":43,"../core/document/Node":45,"../core/event/Event":48,"./AbstractGroup":52,"./GroupEvent":54,"./PanelEvent":57}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uXFxub2RlX21vZHVsZXNcXGJyb3dzZXItcGFja1xcX3ByZWx1ZGUuanMiLCIuLlxcaW5kZXguanMiLCIuLlxcbGliXFxDb250cm9sS2l0LmpzIiwiLi5cXGxpYlxcY29tcG9uZW50XFxCdXR0b24uanMiLCIuLlxcbGliXFxjb21wb25lbnRcXEJ1dHRvblByZXNldC5qcyIsIi4uXFxsaWJcXGNvbXBvbmVudFxcQ2FudmFzLmpzIiwiLi5cXGxpYlxcY29tcG9uZW50XFxDaGVja2JveC5qcyIsIi4uXFxsaWJcXGNvbXBvbmVudFxcQ29sb3IuanMiLCIuLlxcbGliXFxjb21wb25lbnRcXEZ1bmN0aW9uUGxvdFR5cGUuanMiLCIuLlxcbGliXFxjb21wb25lbnRcXEZ1bmN0aW9uUGxvdHRlci5qcyIsIi4uXFxsaWJcXGNvbXBvbmVudFxcRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3IuanMiLCIuLlxcbGliXFxjb21wb25lbnRcXEZ1bmN0aW9uUGxvdHRlck9iamVjdEVycm9yLmpzIiwiLi5cXGxpYlxcY29tcG9uZW50XFxNZXRyaWMuanMiLCIuLlxcbGliXFxjb21wb25lbnRcXE51bWJlcklucHV0LmpzIiwiLi5cXGxpYlxcY29tcG9uZW50XFxOdW1iZXJJbnB1dF9JbnRlcm5hbC5qcyIsIi4uXFxsaWJcXGNvbXBvbmVudFxcTnVtYmVyT3V0cHV0LmpzIiwiLi5cXGxpYlxcY29tcG9uZW50XFxPcHRpb25zLmpzIiwiLi5cXGxpYlxcY29tcG9uZW50XFxPdXRwdXQuanMiLCIuLlxcbGliXFxjb21wb25lbnRcXFBhZC5qcyIsIi4uXFxsaWJcXGNvbXBvbmVudFxcUGlja2VyLmpzIiwiLi5cXGxpYlxcY29tcG9uZW50XFxQbG90dGVyLmpzIiwiLi5cXGxpYlxcY29tcG9uZW50XFxSYW5nZS5qcyIsIi4uXFxsaWJcXGNvbXBvbmVudFxcU1ZHLmpzIiwiLi5cXGxpYlxcY29tcG9uZW50XFxTVkdDb21wb25lbnQuanMiLCIuLlxcbGliXFxjb21wb25lbnRcXFNlbGVjdC5qcyIsIi4uXFxsaWJcXGNvbXBvbmVudFxcU2xpZGVyLmpzIiwiLi5cXGxpYlxcY29tcG9uZW50XFxTbGlkZXJfSW50ZXJuYWwuanMiLCIuLlxcbGliXFxjb21wb25lbnRcXFN0cmluZ0lucHV0LmpzIiwiLi5cXGxpYlxcY29tcG9uZW50XFxTdHJpbmdPdXRwdXQuanMiLCIuLlxcbGliXFxjb21wb25lbnRcXFZhbHVlUGxvdHRlci5qcyIsIi4uXFxsaWJcXGNvcmVcXENvbXBvbmVudC5qcyIsIi4uXFxsaWJcXGNvcmVcXENvbXBvbmVudEV2ZW50LmpzIiwiLi5cXGxpYlxcY29yZVxcQ29tcG9uZW50T2JqZWN0RXJyb3IuanMiLCIuLlxcbGliXFxjb3JlXFxIaXN0b3J5LmpzIiwiLi5cXGxpYlxcY29yZVxcSGlzdG9yeUV2ZW50LmpzIiwiLi5cXGxpYlxcY29yZVxcT2JqZWN0Q29tcG9uZW50LmpzIiwiLi5cXGxpYlxcY29yZVxcT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIuanMiLCIuLlxcbGliXFxjb3JlXFxPcHRpb25FdmVudC5qcyIsIi4uXFxsaWJcXGNvcmVcXFN0YXRlLmpzIiwiLi5cXGxpYlxcY29yZVxcY29sb3JcXENvbG9yRm9ybWF0RXJyb3IuanMiLCIuLlxcbGliXFxjb3JlXFxjb2xvclxcQ29sb3JNb2RlLmpzIiwiLi5cXGxpYlxcY29yZVxcY29sb3JcXENvbG9yVXRpbC5qcyIsIi4uXFxsaWJcXGNvcmVcXGRvY3VtZW50XFxDU1MuanMiLCIuLlxcbGliXFxjb3JlXFxkb2N1bWVudFxcRG9jdW1lbnRFdmVudC5qcyIsIi4uXFxsaWJcXGNvcmVcXGRvY3VtZW50XFxNb3VzZS5qcyIsIi4uXFxsaWJcXGNvcmVcXGRvY3VtZW50XFxOb2RlLmpzIiwiLi5cXGxpYlxcY29yZVxcZG9jdW1lbnRcXE5vZGVFdmVudC5qcyIsIi4uXFxsaWJcXGNvcmVcXGRvY3VtZW50XFxTdHlsZS5qcyIsIi4uXFxsaWJcXGNvcmVcXGV2ZW50XFxFdmVudC5qcyIsIi4uXFxsaWJcXGNvcmVcXGV2ZW50XFxFdmVudERpc3BhdGNoZXIuanMiLCIuLlxcbGliXFxjb3JlXFxsYXlvdXRcXExheW91dE1vZGUuanMiLCIuLlxcbGliXFxjb3JlXFxsYXlvdXRcXFNjcm9sbEJhci5qcyIsIi4uXFxsaWJcXGdyb3VwXFxBYnN0cmFjdEdyb3VwLmpzIiwiLi5cXGxpYlxcZ3JvdXBcXEdyb3VwLmpzIiwiLi5cXGxpYlxcZ3JvdXBcXEdyb3VwRXZlbnQuanMiLCIuLlxcbGliXFxncm91cFxcTWVudUV2ZW50LmpzIiwiLi5cXGxpYlxcZ3JvdXBcXFBhbmVsLmpzIiwiLi5cXGxpYlxcZ3JvdXBcXFBhbmVsRXZlbnQuanMiLCIuLlxcbGliXFxncm91cFxcU3ViR3JvdXAuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3VEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hrQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDek5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3UEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaHlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgQ29udHJvbEtpdCAgICAgICAgPSByZXF1aXJlKCcuL2xpYi9Db250cm9sS2l0Jyk7XHJcblx0Q29udHJvbEtpdC5DYW52YXMgPSByZXF1aXJlKCcuL2xpYi9jb21wb25lbnQvQ2FudmFzJyk7XHJcblx0Q29udHJvbEtpdC5TVkcgICAgPSByZXF1aXJlKCcuL2xpYi9jb21wb25lbnQvU1ZHJyk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRyb2xLaXQ7IiwidmFyIE5vZGUgICAgPSByZXF1aXJlKCcuL2NvcmUvZG9jdW1lbnQvTm9kZScpLFxyXG4gICAgUGFuZWwgICA9IHJlcXVpcmUoJy4vZ3JvdXAvUGFuZWwnKSxcclxuICAgIE9wdGlvbnMgPSByZXF1aXJlKCcuL2NvbXBvbmVudC9PcHRpb25zJyksXHJcbiAgICBQaWNrZXIgID0gcmVxdWlyZSgnLi9jb21wb25lbnQvUGlja2VyJyk7XHJcblxyXG52YXIgQ1NTID0gcmVxdWlyZSgnLi9jb3JlL2RvY3VtZW50L0NTUycpO1xyXG5cclxudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4vY29yZS9ldmVudC9FdmVudERpc3BhdGNoZXInKSxcclxuICAgIEV2ZW50XyAgICAgICAgICA9IHJlcXVpcmUoJy4vY29yZS9ldmVudC9FdmVudCcpLFxyXG4gICAgRG9jdW1lbnRFdmVudCAgID0gcmVxdWlyZSgnLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcclxuICAgIE5vZGVFdmVudCAgICAgICA9IHJlcXVpcmUoJy4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKSxcclxuICAgIENvbXBvbmVudEV2ZW50ICA9IHJlcXVpcmUoJy4vY29yZS9Db21wb25lbnRFdmVudCcpLFxyXG4gICAgSGlzdG9yeUV2ZW50ICAgID0gcmVxdWlyZSgnLi9jb3JlL0hpc3RvcnlFdmVudCcpLFxyXG4gICAgTWVudUV2ZW50ICAgICAgID0gcmVxdWlyZSgnLi9ncm91cC9NZW51RXZlbnQnKTtcclxuXHJcbnZhciBIaXN0b3J5ID0gcmVxdWlyZSgnLi9jb3JlL0hpc3RvcnknKSxcclxuICAgIFN0YXRlICAgPSByZXF1aXJlKCcuL2NvcmUvU3RhdGUnKTtcclxuXHJcbnZhciBNb3VzZSAgID0gcmVxdWlyZSgnLi9jb3JlL2RvY3VtZW50L01vdXNlJyk7XHJcblxyXG52YXIgVmFsdWVQbG90dGVyID0gcmVxdWlyZSgnLi9jb21wb25lbnQvVmFsdWVQbG90dGVyJyk7XHJcbnZhciBTdHJpbmdPdXRwdXQgPSByZXF1aXJlKCcuL2NvbXBvbmVudC9TdHJpbmdPdXRwdXQnKSxcclxuICAgIFN0cmluZ0lucHV0ID0gcmVxdWlyZSgnLi9jb21wb25lbnQvU3RyaW5nSW5wdXQnKSxcclxuICAgIE51bWJlck91dHB1dCA9IHJlcXVpcmUoJy4vY29tcG9uZW50L051bWJlck91dHB1dCcpO1xyXG5cclxudmFyIERFRkFVTFRfSElTVE9SWSA9IGZhbHNlLFxyXG4gICAgREVGQVVMVF9PUEFDSVRZID0gMS4wLFxyXG4gICAgREVGQVVMVF9QQU5FTFNfQ0xPU0FCTEUgPSBmYWxzZSxcclxuICAgIERFRkFVTFRfRU5BQkxFID0gdHJ1ZSxcclxuICAgIERFRkFVTFRfTE9BRF9BTkRfU0FWRSA9IGZhbHNlO1xyXG5cclxudmFyIERFRkFVTFRfVFJJR0dFUl9TSE9SVENVVF9DSEFSID0gJ2gnO1xyXG5cclxudmFyIGluaXRpYXRlZCA9IGZhbHNlO1xyXG5cclxuLyoqXHJcbiAqIEluaXRpYWxpemVzIENvbnRyb2xLaXQuXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBDb250cm9sS2l0IG9wdGlvbnNcclxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLm9wYWNpdHk9MS4wXSAtIE92ZXJhbGwgb3BhY2l0eVxyXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmVuYWJsZT10cnVlXSAtIEluaXRpYWwgQ29udHJvbEtpdCBzdGF0ZSwgZW5hYmxlZCAvIGRpc2FibGVkXHJcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMudXNlRXh0ZXJuYWxTdHlsZT1mYWxzZV0gLSBJZiB0cnVlLCBhbiBleHRlcm5hbCBzdHlsZSBpcyB1c2VkIGluc3RlYWQgb2YgdGhlIGJ1aWxkLWluIG9uZVxyXG4gKiBAcGFyYW0ge1N0cmluZ30gW29wdGlvbnMuc3R5bGVTdHJpbmddIC0gSWYgdHJ1ZSwgYW4gZXh0ZXJuYWwgc3R5bGUgaXMgdXNlZCBpbnN0ZWFkIG9mIHRoZSBidWlsZC1pbiBvbmVcclxuICogQHBhcmFtIHtCb29sZWFufVtvcHRpb25zLmhpc3Rvcnk9ZmFsc2VdIC0gKEV4cGVyaW1lbnRhbCkgRW5hYmxlcyBhIHZhbHVlIGhpc3RvcnkgZm9yIGFsbCBjb21wb25lbnRzXHJcbiAqL1xyXG5mdW5jdGlvbiBDb250cm9sS2l0KG9wdGlvbnMpIHtcclxuICAgIGlmKGluaXRpYXRlZCl7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb250cm9sS2l0IGlzIGFscmVhZHkgaW5pdGlhbGl6ZWQuJyk7XHJcbiAgICB9XHJcbiAgICBvcHRpb25zICAgICAgICAgICAgICAgICAgPSBvcHRpb25zIHx8IHt9O1xyXG4gICAgb3B0aW9ucy5oaXN0b3J5ICAgICAgICAgID0gb3B0aW9ucy5oaXN0b3J5ID09PSB1bmRlZmluZWQgPyBERUZBVUxUX0hJU1RPUlkgOiBvcHRpb25zLmhpc3Rvcnk7XHJcbiAgICBvcHRpb25zLmxvYWRBbmRTYXZlICAgICAgPSBvcHRpb25zLmxvYWRBbmRTYXZlID09PSB1bmRlZmluZWQgPyBERUZBVUxUX0xPQURfQU5EX1NBVkUgOiBvcHRpb25zLmxvYWRBbmRTYXZlO1xyXG4gICAgb3B0aW9ucy5vcGFjaXR5ICAgICAgICAgID0gb3B0aW9ucy5vcGFjaXR5ID09PSB1bmRlZmluZWQgPyBERUZBVUxUX09QQUNJVFkgOiBvcHRpb25zLm9wYWNpdHk7XHJcbiAgICBvcHRpb25zLnBhbmVsc0Nsb3NhYmxlICAgPSBvcHRpb25zLnBhbmVsc0Nsb3NhYmxlID09PSB1bmRlZmluZWQgPyBERUZBVUxUX1BBTkVMU19DTE9TQUJMRSA6IG9wdGlvbnMucGFuZWxzQ2xvc2FibGU7XHJcbiAgICBvcHRpb25zLnVzZUV4dGVybmFsU3R5bGUgPSBvcHRpb25zLnVzZUV4dGVybmFsU3R5bGUgPT09IHVuZGVmaW5lZCA/IGZhbHNlIDogb3B0aW9ucy51c2VFeHRlcm5hbFN0eWxlO1xyXG4gICAgb3B0aW9ucy5lbmFibGUgICAgICAgICAgID0gb3B0aW9ucy5lbmFibGUgPT09IHVuZGVmaW5lZCA/IERFRkFVTFRfRU5BQkxFIDogb3B0aW9ucy5lbmFibGU7XHJcblxyXG4gICAgRXZlbnREaXNwYXRjaGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcblxyXG4gICAgdmFyIG5vZGUgPSBudWxsO1xyXG4gICAgaWYgKCFvcHRpb25zLnBhcmVudERvbUVsZW1lbnRJZCkge1xyXG4gICAgICAgIG5vZGUgPSBuZXcgTm9kZSgpO1xyXG4gICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQobm9kZS5nZXRFbGVtZW50KCkpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBub2RlID0gTm9kZS5nZXROb2RlQnlJZChvcHRpb25zLnBhcmVudERvbUVsZW1lbnRJZCk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYoIW9wdGlvbnMudXNlRXh0ZXJuYWxTdHlsZSl7XHJcbiAgICAgICAgdmFyIHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcclxuICAgICAgICAgICAgc3R5bGUudHlwZSA9ICd0ZXh0L2Nzcyc7XHJcbiAgICAgICAgdmFyIGNzcyA9ICFvcHRpb25zLnN0eWxlID8gcmVxdWlyZSgnLi9jb3JlL2RvY3VtZW50L1N0eWxlJykuc3RyaW5nIDogb3B0aW9ucy5zdHlsZVN0cmluZztcclxuICAgICAgICBpZihzdHlsZS5zdHlsZXNoZWV0KXtcclxuICAgICAgICAgICAgc3R5bGUuc3R5bGVzaGVldC5jc3NUZXh0ID0gY3NzO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHN0eWxlLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGNzcykpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAoZG9jdW1lbnQuaGVhZCB8fCBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdKS5hcHBlbmRDaGlsZChzdHlsZSk7XHJcbiAgICB9XHJcblxyXG4gICAgbm9kZS5zZXRQcm9wZXJ0eSgnaWQnLCBDU1MuQ29udHJvbEtpdCk7XHJcblxyXG4gICAgdGhpcy5fbm9kZSA9IG5vZGU7XHJcbiAgICB0aGlzLl9wYW5lbHMgPSBbXTtcclxuICAgIHRoaXMuX2VuYWJsZWQgPSBvcHRpb25zLmVuYWJsZTtcclxuICAgIHRoaXMuX2hpc3RvcnlFbmFibGVkID0gb3B0aW9ucy5oaXN0b3J5O1xyXG4gICAgdGhpcy5fc3RhdGVzRW5hYmxlZCA9IG9wdGlvbnMubG9hZEFuZFNhdmU7XHJcbiAgICB0aGlzLl9wYW5lbHNDbG9zYWJsZSA9IG9wdGlvbnMucGFuZWxzQ2xvc2FibGU7XHJcblxyXG4gICAgdmFyIGhpc3RvcnkgPSBIaXN0b3J5LnNldHVwKCk7XHJcblxyXG4gICAgaWYgKCF0aGlzLl9oaXN0b3J5RW5hYmxlZCl7XHJcbiAgICAgICAgaGlzdG9yeS5kaXNhYmxlKCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGhpc3RvcnkuYWRkRXZlbnRMaXN0ZW5lcihIaXN0b3J5RXZlbnQuU1RBVEVfUFVTSCwgdGhpcywgJ29uSGlzdG9yeVN0YXRlUHVzaCcpO1xyXG4gICAgICAgIGhpc3RvcnkuYWRkRXZlbnRMaXN0ZW5lcihIaXN0b3J5RXZlbnQuU1RBVEVfUE9QLCB0aGlzLCAnb25IaXN0b3J5U3RhdGVQb3AnKTtcclxuICAgIH1cclxuXHJcbiAgICBNb3VzZS5zZXR1cCgpO1xyXG4gICAgUGlja2VyLnNldHVwKG5vZGUpO1xyXG4gICAgT3B0aW9ucy5zZXR1cChub2RlKTtcclxuXHJcbiAgICB2YXIgb3BhY2l0eSA9IG9wdGlvbnMub3BhY2l0eTtcclxuICAgIGlmIChvcGFjaXR5ICE9IDEuMCAmJiBvcGFjaXR5ICE9IDAuMCkge1xyXG4gICAgICAgIG5vZGUuc2V0U3R5bGVQcm9wZXJ0eSgnb3BhY2l0eScsIG9wYWNpdHkpO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuX2NhblVwZGF0ZSA9IHRydWU7XHJcblxyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICAgIHZhciBpbnRlcnZhbCxcclxuICAgICAgICBjb3VudCA9IDAsXHJcbiAgICAgICAgY291bnRNYXggPSAxMDtcclxuXHJcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50LldJTkRPV19SRVNJWkUsZnVuY3Rpb24oKXtcclxuICAgICAgICBzZWxmLl9jYW5VcGRhdGUgPSBmYWxzZTtcclxuICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKTtcclxuICAgICAgICBpbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgIGlmKGNvdW50ID49IGNvdW50TWF4KXtcclxuICAgICAgICAgICAgICAgIGNvdW50ID0gMDtcclxuICAgICAgICAgICAgICAgIHNlbGYuX2NhblVwZGF0ZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb3VudCsrO1xyXG4gICAgICAgIH0sMjUpXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLl9zaG9ydGN1dEVuYWJsZSA9IERFRkFVTFRfVFJJR0dFUl9TSE9SVENVVF9DSEFSO1xyXG5cclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLGZ1bmN0aW9uKGUpe1xyXG4gICAgICAgIGlmKCEoZS5jdHJsS2V5ICYmIFN0cmluZy5mcm9tQ2hhckNvZGUoZS53aGljaCB8fCBlLmtleUNvZGUpLnRvTG93ZXJDYXNlKCkgPT0gc2VsZi5fc2hvcnRjdXRFbmFibGUpKXtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBzZWxmLl9lbmFibGVkID0gIXNlbGYuX2VuYWJsZWQ7XHJcbiAgICAgICAgaWYoc2VsZi5fZW5hYmxlZCl7XHJcbiAgICAgICAgICAgIHNlbGYuX2VuYWJsZSgpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHNlbGYuX2Rpc2FibGUoKTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICBpZighdGhpcy5fZW5hYmxlZCl7XHJcbiAgICAgICAgdGhpcy5fZGlzYWJsZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIGluaXRpYXRlZCA9IHRydWU7XHJcbn1cclxuQ29udHJvbEtpdC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUpO1xyXG5Db250cm9sS2l0LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IENvbnRyb2xLaXQ7XHJcblxyXG4vKipcclxuICogQWRkcyBhIHBhbmVsLlxyXG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBQYW5lbCBvcHRpb25zXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmxhYmVsPSdDb250cm9sIFBhbmVsJ10gLSBUaGUgcGFuZWwgbGFiZWxcclxuICogQHBhcmFtIHtOdW1iZXJ9IFtwYXJhbXMud2lkdGg9MzAwXSAtIFRoZSB3aWR0aFxyXG4gKiBAcGFyYW0ge051bWJlcn0gW3BhcmFtcy5oZWlnaHRdIC0gQ29uc3RyYWluZWQgcGFuZWwgaGVpZ2h0XHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBbcGFyYW1zLnJhdGlvPTQwXSAtIFRoZSByYXRpbyBvZiBsYWJlbCAoZGVmYXVsdDo0MCUpIGFuZCBjb21wb25lbnQgKGRlZmF1bHQ6NjAlKSB3aWR0aFxyXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy5hbGlnbj0ncmlnaHQnXSAtIEZsb2F0ICdsZWZ0JyBvciAncmlnaHQnLCBtdWx0aXBsZSBwYW5lbHMgZ2V0IGFsaWduZWQgbmV4dCB0byBlYWNoIG90aGVyXHJcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW3BhcmFtcy5maXhlZD10cnVlXSAtIElmIGZhbHNlIHRoZSBwYW5lbCBjYW4gYmUgbW92ZWRcclxuICogQHBhcmFtIHtBcnJheX0gW3BhcmFtcy5wb3NpdGlvbj1bMCwwXV0gLSBJZiB1bmZpeGVkLCB0aGUgcGFuZWwgcGFuZWwgcG9zaXRpb24gcmVsYXRpdmUgdG8gYWxpZ25tZW50IChlZy4gaWYgJ2xlZnQnIDAgKyBwb3NpdGlvblswXSBvciBpZiAncmlnaHQnIHdpbmRvdy5pbm5lckhlaWdodCAtIHBvc2l0aW9uWzBdIC0gcGFuZWxXaWR0aClcclxuICogQHBhcmFtIHtOdW1iZXJ9IFtwYXJhbXMub3BhY2l0eT0xLjBdIC0gVGhlIHBhbmVswrRzIG9wYWNpdHlcclxuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMuZG9jaz1mYWxzZV0gLSAoRXhwZXJpbWVudGFsKSBJbmRpY2F0ZXMgd2hldGhlciB0aGUgcGFuZWwgc2hvdWxkIGJlIGRvY2tlZCB0byBlaXRoZXIgdGhlIGxlZnQgb3IgcmlnaHQgd2luZG93IGJvcmRlciAoZGVwZW5kaW5nIG9uIHBhcmFtcy5hbGlnbiksIGRvY2tlZCBwYW5lbHMgaGVpZ2h0IGVxdWFsIHdpbmRvdyBoZWlnaHRcclxuICAqIEByZXR1cm5zIHtQYW5lbH1cclxuICovXHJcbkNvbnRyb2xLaXQucHJvdG90eXBlLmFkZFBhbmVsID0gZnVuY3Rpb24gKHBhcmFtcykge1xyXG4gICAgdmFyIHBhbmVsID0gbmV3IFBhbmVsKHRoaXMsIHBhcmFtcyk7XHJcbiAgICB0aGlzLl9wYW5lbHMucHVzaChwYW5lbCk7XHJcbiAgICByZXR1cm4gcGFuZWw7XHJcbn07XHJcblxyXG4vKipcclxuICogVXBkYXRlcyBhbGwgQ29udHJvbEtpdCBjb21wb25lbnRzIGlmIHRoZSB3YXRcclxuICovXHJcbkNvbnRyb2xLaXQucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGlmICghdGhpcy5fZW5hYmxlZCB8fCAhdGhpcy5fY2FuVXBkYXRlKXtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB2YXIgaSwgaiwgaztcclxuICAgIHZhciBsLCBtLCBuO1xyXG4gICAgdmFyIHBhbmVscyA9IHRoaXMuX3BhbmVscyxcclxuICAgICAgICBwYW5lbCxcclxuICAgICAgICBncm91cHMsXHJcbiAgICAgICAgY29tcG9uZW50cyxcclxuICAgICAgICBjb21wb25lbnQ7XHJcblxyXG4gICAgaSA9IC0xOyBsID0gcGFuZWxzLmxlbmd0aDtcclxuICAgIHdoaWxlICgrK2kgPCBsKSB7XHJcbiAgICAgICAgcGFuZWwgPSBwYW5lbHNbaV07XHJcblxyXG4gICAgICAgIGlmIChwYW5lbC5pc0Rpc2FibGVkKCkpe1xyXG4gICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZ3JvdXBzID0gcGFuZWwuZ2V0R3JvdXBzKCk7XHJcbiAgICAgICAgaiA9IC0xOyBtID0gZ3JvdXBzLmxlbmd0aDtcclxuXHJcbiAgICAgICAgd2hpbGUgKCsraiA8IG0pIHtcclxuICAgICAgICAgICAgY29tcG9uZW50cyA9IGdyb3Vwc1tqXS5nZXRDb21wb25lbnRzKCk7XHJcbiAgICAgICAgICAgIGsgPSAtMTsgbiA9IGNvbXBvbmVudHMubGVuZ3RoO1xyXG5cclxuICAgICAgICAgICAgd2hpbGUgKCsrayA8IG4pIHtcclxuICAgICAgICAgICAgICAgIGNvbXBvbmVudCA9IGNvbXBvbmVudHNba107XHJcbiAgICAgICAgICAgICAgICBpZiAoY29tcG9uZW50LmlzRGlzYWJsZWQoKSl7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoY29tcG9uZW50IGluc3RhbmNlb2YgVmFsdWVQbG90dGVyIHx8XHJcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50IGluc3RhbmNlb2YgU3RyaW5nT3V0cHV0IHx8XHJcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50IGluc3RhbmNlb2YgU3RyaW5nSW5wdXQgfHxcclxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQgaW5zdGFuY2VvZiBOdW1iZXJPdXRwdXQpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQudXBkYXRlKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn07XHJcblxyXG5Db250cm9sS2l0LnByb3RvdHlwZS5oaXN0b3J5SXNFbmFibGVkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX2hpc3RvcnlFbmFibGVkO1xyXG59O1xyXG5cclxuQ29udHJvbEtpdC5wcm90b3R5cGUuc3RhdGVzQXJlRW5hYmxlZCA9IGZ1bmN0aW9uKCl7XHJcbiAgICByZXR1cm4gdGhpcy5fc3RhdGVzRW5hYmxlZDtcclxufTtcclxuXHJcbkNvbnRyb2xLaXQucHJvdG90eXBlLnBhbmVsc0FyZUNsb3NhYmxlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX3BhbmVsc0Nsb3NhYmxlO1xyXG59O1xyXG5cclxuQ29udHJvbEtpdC5wcm90b3R5cGUuX2VuYWJsZSA9IGZ1bmN0aW9uKCl7XHJcbiAgICB2YXIgaSA9IC0xLCBwID0gdGhpcy5fcGFuZWxzLCBsID0gcC5sZW5ndGg7XHJcbiAgICB3aGlsZSAoKytpIDwgbCl7XHJcbiAgICAgICAgcFtpXS5lbmFibGUoKTtcclxuICAgIH1cclxuICAgIHRoaXMuX25vZGUuc2V0U3R5bGVQcm9wZXJ0eSgndmlzaWJpbGl0eScsICcnKTtcclxufTtcclxuXHJcbkNvbnRyb2xLaXQucHJvdG90eXBlLl9kaXNhYmxlID0gZnVuY3Rpb24oKXtcclxuICAgIHZhciBpID0gLTEsIHAgPSB0aGlzLl9wYW5lbHMsIGwgPSBwLmxlbmd0aDtcclxuICAgIHdoaWxlICgrK2kgPCBsKXtcclxuICAgICAgICBwW2ldLmRpc2FibGUoKTtcclxuICAgIH1cclxuICAgIHRoaXMuX25vZGUuc2V0U3R5bGVQcm9wZXJ0eSgndmlzaWJpbGl0eScsICdoaWRkZW4nKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBFbmFibGVzIGFuZCBzaG93cyBjb250cm9sS2l0LlxyXG4gKi9cclxuXHJcbkNvbnRyb2xLaXQucHJvdG90eXBlLmVuYWJsZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuX2VuYWJsZSgpO1xyXG4gICAgdGhpcy5fZW5hYmxlZCA9IHRydWU7XHJcbn07XHJcblxyXG4vKipcclxuICogRGlzYWJsZSBhbmQgaGlkZXMgY29udHJvbEtpdC5cclxuICovXHJcblxyXG5Db250cm9sS2l0LnByb3RvdHlwZS5kaXNhYmxlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5fZGlzYWJsZSgpO1xyXG4gICAgdGhpcy5fZW5hYmxlZCA9IGZhbHNlO1xyXG59O1xyXG5cclxuXHJcbi8qKlxyXG4gKiBTcGVjaWZpZXMgdGhlIGtleSB0byBiZSB1c2VkIHdpdGggY3RybCAmIGNoYXIsIHRvIHRyaWdnZXIgQ29udHJvbEtpdHMgdmlzaWJpbGl0eS5cclxuICogQHBhcmFtIGNoYXJcclxuICovXHJcblxyXG5Db250cm9sS2l0LnByb3RvdHlwZS5zZXRTaG9ydGN1dEVuYWJsZSA9IGZ1bmN0aW9uKGNoYXIpe1xyXG4gICAgdGhpcy5fc2hvcnRjdXRFbmFibGUgPSBjaGFyO1xyXG59O1xyXG5cclxuQ29udHJvbEtpdC5wcm90b3R5cGUub25IaXN0b3J5U3RhdGVQdXNoID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgTWVudUV2ZW50LlVQREFURV9NRU5VLCBudWxsKSk7XHJcbn07XHJcblxyXG5Db250cm9sS2l0LnByb3RvdHlwZS5vbkhpc3RvcnlTdGF0ZVBvcCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlVQREFURV9WQUxVRSwge29yaWdpbjogbnVsbH0pKTtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIE1lbnVFdmVudC5VUERBVEVfTUVOVSwgbnVsbCkpO1xyXG59O1xyXG5cclxuQ29udHJvbEtpdC5wcm90b3R5cGUubG9hZFNldHRpbmdzID0gZnVuY3Rpb24oZGF0YSl7XHJcbiAgICB2YXIgaSA9IC0xLCBsID0gZGF0YS5sZW5ndGg7XHJcbiAgICB2YXIgcGFuZWxzID0gdGhpcy5fcGFuZWxzO1xyXG4gICAgd2hpbGUoKytpIDwgbCl7XHJcbiAgICAgICAgcGFuZWxzW2ldLnNldERhdGEoZGF0YVtpXSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5Db250cm9sS2l0LnByb3RvdHlwZS5fbG9hZFN0YXRlID0gZnVuY3Rpb24oKXtcclxuICAgIFN0YXRlLmxvYWQodGhpcy5sb2FkU2V0dGluZ3MuYmluZCh0aGlzKSk7XHJcbn07XHJcblxyXG5Db250cm9sS2l0LnByb3RvdHlwZS5fc2F2ZVN0YXRlID0gZnVuY3Rpb24oKXtcclxuICAgIHRoaXMudXBkYXRlKCk7IC8vZm9yY2Ugc3luY1xyXG4gICAgdmFyIHAgPSB0aGlzLl9wYW5lbHMsIGkgPSAtMSwgbCA9IHAubGVuZ3RoO1xyXG4gICAgdmFyIGRhdGEgPSBuZXcgQXJyYXkobCk7XHJcbiAgICB3aGlsZSgrK2kgPCBsKXtcclxuICAgICAgICBkYXRhW2ldID0gcFtpXS5nZXREYXRhKCk7XHJcbiAgICB9XHJcbiAgICBTdGF0ZS5zYXZlKHtkYXRhOmRhdGF9KTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZXR1cm5zIHRoZSByb290IGVsZW1lbnQuXHJcbiAqIEByZXR1cm5zIHsqfVxyXG4gKi9cclxuXHJcbkNvbnRyb2xLaXQucHJvdG90eXBlLmdldE5vZGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fbm9kZTtcclxufTtcclxuXHJcbkNvbnRyb2xLaXQuZGVzdHJveSA9IGZ1bmN0aW9uKCl7XHJcbiAgICBNb3VzZS5nZXQoKS5kZXN0cm95KCk7XHJcbiAgICBPcHRpb25zLmdldCgpLmRlc3Ryb3koKTtcclxuICAgIFBpY2tlci5nZXQoKS5kZXN0cm95KCk7XHJcbiAgICBpbml0aWF0ZWQgPSBmYWxzZTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ29udHJvbEtpdDsiLCJ2YXIgRXZlbnRfICAgICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXHJcbiAgICBOb2RlRXZlbnQgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50JyksXHJcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKTtcclxuXHJcbnZhciBOb2RlICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKSxcclxuICAgIENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50Jyk7XHJcblxyXG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcclxuXHJcbnZhciBERUZBVUxUX0xBQkVMID0gJyc7XHJcblxyXG5mdW5jdGlvbiBCdXR0b24ocGFyZW50LGxhYmVsLG9uUHJlc3MscGFyYW1zKSB7XHJcbiAgICBvblByZXNzICAgICAgPSBvblByZXNzIHx8IGZ1bmN0aW9uKCl7fTtcclxuICAgIHBhcmFtcyAgICAgICA9IHBhcmFtcyAgICAgICB8fCB7fTtcclxuICAgIHBhcmFtcy5sYWJlbCA9IHBhcmFtcy5sYWJlbCB8fCBERUZBVUxUX0xBQkVMO1xyXG5cclxuICAgIENvbXBvbmVudC5hcHBseSh0aGlzLFtwYXJlbnQscGFyYW1zLmxhYmVsXSk7XHJcblxyXG4gICAgdmFyIG5vZGUgPSB0aGlzLl9pbnB1dE5vZGUgPSBuZXcgTm9kZShOb2RlLklOUFVUX0JVVFRPTik7XHJcblxyXG4gICAgbm9kZS5zZXRTdHlsZUNsYXNzKENTUy5CdXR0b24pO1xyXG4gICAgbm9kZS5zZXRQcm9wZXJ0eSgndmFsdWUnLGxhYmVsKTtcclxuXHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICBub2RlLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk9OX0NMSUNLLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uUHJlc3MuYmluZChzZWxmKSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8oc2VsZixDb21wb25lbnRFdmVudC5WQUxVRV9VUERBVEVEKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgIHRoaXMuX3dyYXBOb2RlLmFkZENoaWxkKG5vZGUpO1xyXG59XHJcbkJ1dHRvbi5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKENvbXBvbmVudC5wcm90b3R5cGUpO1xyXG5CdXR0b24ucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQnV0dG9uO1xyXG5cclxuQnV0dG9uLnByb3RvdHlwZS5nZXRCdXR0b25MYWJlbCA9IGZ1bmN0aW9uKCl7XHJcbiAgICByZXR1cm4gdGhpcy5faW5wdXROb2RlLmdldFByb3BlcnR5KCd2YWx1ZScpO1xyXG59O1xyXG5cclxuQnV0dG9uLnByb3RvdHlwZS5zZXRCdXR0b25MYWJlbCA9IGZ1bmN0aW9uKGxhYmVsKXtcclxuICAgIHRoaXMuX2lucHV0Tm9kZS5zZXRQcm9wZXJ0eSgndmFsdWUnLGxhYmVsKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQnV0dG9uO1xyXG4iLCJ2YXIgRXZlbnREaXNwYXRjaGVyICAgICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50RGlzcGF0Y2hlcicpO1xyXG52YXIgT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIgPSByZXF1aXJlKCcuLi9jb3JlL09iamVjdENvbXBvbmVudE5vdGlmaWVyJyk7XHJcblxyXG52YXIgRXZlbnRfICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXHJcbiAgICBPcHRpb25FdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvT3B0aW9uRXZlbnQnKSxcclxuICAgIE5vZGVFdmVudCAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKTtcclxuXHJcbnZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XHJcbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xyXG5cclxuZnVuY3Rpb24gQnV0dG9uUHJlc2V0KHBhcmVudE5vZGUpIHtcclxuICAgIEV2ZW50RGlzcGF0Y2hlci5hcHBseSh0aGlzKTtcclxuICAgIHZhciBub2RlICAgID0gdGhpcy5fYnRuTm9kZSA9IG5ldyBOb2RlKE5vZGUuSU5QVVRfQlVUVE9OKSxcclxuICAgICAgICBpbWdOb2RlID0gdGhpcy5faW5kaU5vZGUgPSBuZXcgTm9kZSgpO1xyXG5cclxuICAgIHRoaXMuX29uQWN0aXZlID0gZnVuY3Rpb24gKCkge307XHJcbiAgICB0aGlzLl9vbkRlYWN0aXZlID0gZnVuY3Rpb24gKCkge307XHJcbiAgICB0aGlzLl9pc0FjdGl2ZSA9IGZhbHNlO1xyXG5cclxuICAgIG5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQnV0dG9uUHJlc2V0KTtcclxuICAgIG5vZGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25Nb3VzZURvd24uYmluZCh0aGlzKSk7XHJcblxyXG4gICAgbm9kZS5hZGRDaGlsZChpbWdOb2RlKTtcclxuICAgIHBhcmVudE5vZGUuYWRkQ2hpbGRBdChub2RlLCAwKTtcclxuXHJcbiAgICBPYmplY3RDb21wb25lbnROb3RpZmllci5nZXQoKS5hZGRFdmVudExpc3RlbmVyKE9wdGlvbkV2ZW50LlRSSUdHRVIsIHRoaXMsICdvbk9wdGlvblRyaWdnZXInKTtcclxuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihPcHRpb25FdmVudC5UUklHR0VSRUQsIE9iamVjdENvbXBvbmVudE5vdGlmaWVyLmdldCgpLCAnb25PcHRpb25UcmlnZ2VyZWQnKTtcclxufVxyXG5CdXR0b25QcmVzZXQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudERpc3BhdGNoZXIucHJvdG90eXBlKTtcclxuQnV0dG9uUHJlc2V0LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEJ1dHRvblByZXNldDtcclxuXHJcbkJ1dHRvblByZXNldC5wcm90b3R5cGUub25PcHRpb25UcmlnZ2VyID0gZnVuY3Rpb24oZSl7XHJcbiAgICBpZihlLmRhdGEub3JpZ2luID09IHRoaXMpe1xyXG4gICAgICAgIGlmKCF0aGlzLl9pc0FjdGl2ZSl7XHJcbiAgICAgICAgICAgIHRoaXMuX29uQWN0aXZlKCk7XHJcbiAgICAgICAgICAgIHRoaXMuX2J0bk5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQnV0dG9uUHJlc2V0QWN0aXZlKTtcclxuICAgICAgICAgICAgdGhpcy5faXNBY3RpdmUgPSB0cnVlO1xyXG4gICAgICAgIH0gZWxzZXtcclxuICAgICAgICAgICAgdGhpcy5fb25EZWFjdGl2ZSgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgaWYodGhpcy5faXNBY3RpdmUpe1xyXG4gICAgICAgIHRoaXMuZGVhY3RpdmF0ZSgpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuQnV0dG9uUHJlc2V0LnByb3RvdHlwZS5fb25Nb3VzZURvd24gPSBmdW5jdGlvbigpe1xyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgT3B0aW9uRXZlbnQuVFJJR0dFUkVELCBudWxsKSk7XHJcbn07XHJcblxyXG5CdXR0b25QcmVzZXQucHJvdG90eXBlLnNldE9uQWN0aXZlID0gZnVuY3Rpb24oZnVuYyl7XHJcbiAgICB0aGlzLl9vbkFjdGl2ZSA9IGZ1bmM7XHJcbn07XHJcblxyXG5CdXR0b25QcmVzZXQucHJvdG90eXBlLnNldE9uRGVhY3RpdmUgPSBmdW5jdGlvbihmdW5jKXtcclxuICAgIHRoaXMuX29uRGVhY3RpdmUgPSBmdW5jO1xyXG59O1xyXG5cclxuQnV0dG9uUHJlc2V0LnByb3RvdHlwZS5kZWFjdGl2YXRlID0gZnVuY3Rpb24oKXtcclxuICAgIHRoaXMuX2lzQWN0aXZlID0gZmFsc2U7XHJcbiAgICB0aGlzLl9idG5Ob2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkJ1dHRvblByZXNldCk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEJ1dHRvblByZXNldDtcclxuIiwidmFyIENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50Jyk7XHJcbnZhciBDU1MgICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpLFxyXG4gICAgTWV0cmljICAgID0gcmVxdWlyZSgnLi9NZXRyaWMnKTtcclxuXHJcbnZhciBFdmVudF8gICAgID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxyXG4gICAgR3JvdXBFdmVudCA9IHJlcXVpcmUoJy4uL2dyb3VwL0dyb3VwRXZlbnQnKTtcclxuXHJcbmZ1bmN0aW9uIENhbnZhcyhwYXJlbnQscGFyYW1zKSB7XHJcbiAgICBDb21wb25lbnQuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xyXG5cclxuICAgIHZhciB3cmFwID0gdGhpcy5fd3JhcE5vZGU7XHJcbiAgICAgICAgd3JhcC5zZXRTdHlsZUNsYXNzKENTUy5DYW52YXNXcmFwKTtcclxuICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcclxuICAgICAgICB3cmFwLmdldEVsZW1lbnQoKS5hcHBlbmRDaGlsZChjYW52YXMpO1xyXG5cclxuICAgIHZhciB3aWR0aCA9IHdyYXAuZ2V0V2lkdGgoKTtcclxuICAgIHRoaXMuX2NhbnZhc1dpZHRoID0gdGhpcy5fY2FudmFzSGVpZ2h0ID0gMDtcclxuICAgIHRoaXMuX3NldENhbnZhc1NpemUod2lkdGgsd2lkdGgpO1xyXG4gICAgdGhpcy5fdXBkYXRlSGVpZ2h0KCk7XHJcblxyXG4gICAgdGhpcy5fbm9kZS5zZXRTdHlsZUNsYXNzKENTUy5DYW52YXNMaXN0SXRlbSk7XHJcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LkdST1VQX1NJWkVfQ0hBTkdFLHRoaXMsICAnb25Hcm91cFNpemVDaGFuZ2UnKTtcclxuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LkdST1VQX1NJWkVfVVBEQVRFLHRoaXMuX3BhcmVudCwnb25Hcm91cFNpemVVcGRhdGUnKTtcclxufVxyXG5DYW52YXMucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShDb21wb25lbnQucHJvdG90eXBlKTtcclxuQ2FudmFzLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IENhbnZhcztcclxuXHJcbkNhbnZhcy5wcm90b3R5cGUuX3VwZGF0ZUhlaWdodCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBjYW52YXNIZWlnaHQgPSB0aGlzLl9jYW52YXMuaGVpZ2h0O1xyXG5cclxuICAgIHRoaXMuX3dyYXBOb2RlLnNldEhlaWdodChjYW52YXNIZWlnaHQpO1xyXG4gICAgdGhpcy5fbm9kZS5zZXRIZWlnaHQoY2FudmFzSGVpZ2h0ICsgTWV0cmljLlBBRERJTkdfV1JBUFBFUik7XHJcbn07XHJcblxyXG5DYW52YXMucHJvdG90eXBlLm9uR3JvdXBTaXplQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHdpZHRoID0gdGhpcy5fd3JhcE5vZGUuZ2V0V2lkdGgoKTtcclxuXHJcbiAgICB0aGlzLl9zZXRDYW52YXNTaXplKHdpZHRoLCB3aWR0aCk7XHJcbiAgICB0aGlzLl91cGRhdGVIZWlnaHQoKTtcclxuICAgIHRoaXMuX3JlZHJhdygpO1xyXG5cclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIEdyb3VwRXZlbnQuR1JPVVBfU0laRV9VUERBVEUsIG51bGwpKTtcclxufTtcclxuXHJcbkNhbnZhcy5wcm90b3R5cGUuX3NldENhbnZhc1NpemUgPSBmdW5jdGlvbiAod2lkdGgsIGhlaWdodCkge1xyXG4gICAgdmFyIGNhbnZhc1dpZHRoID0gdGhpcy5fY2FudmFzV2lkdGggPSB3aWR0aCxcclxuICAgICAgICBjYW52YXNIZWlnaHQgPSB0aGlzLl9jYW52YXNIZWlnaHQgPSBoZWlnaHQ7XHJcblxyXG4gICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhcztcclxuICAgICAgICBjYW52YXMuc3R5bGUud2lkdGggPSBjYW52YXNXaWR0aCArICdweCc7XHJcbiAgICAgICAgY2FudmFzLnN0eWxlLmhlaWdodCA9IGNhbnZhc0hlaWdodCArICdweCc7XHJcbiAgICAgICAgY2FudmFzLndpZHRoID0gY2FudmFzV2lkdGg7XHJcbiAgICAgICAgY2FudmFzLmhlaWdodCA9IGNhbnZhc0hlaWdodDtcclxufTtcclxuXHJcbkNhbnZhcy5wcm90b3R5cGUuZ2V0Q2FudmFzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX2NhbnZhcztcclxufTtcclxuXHJcbkNhbnZhcy5wcm90b3R5cGUuZ2V0Q29udGV4dCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLl9jYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ2FudmFzO1xyXG4iLCJ2YXIgT2JqZWN0Q29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY29yZS9PYmplY3RDb21wb25lbnQnKSxcclxuICAgIE5vZGUgICAgICAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xyXG5cclxudmFyIEV2ZW50XyAgICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxyXG4gICAgTm9kZUV2ZW50ICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpLFxyXG4gICAgQ29tcG9uZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL0NvbXBvbmVudEV2ZW50Jyk7XHJcblxyXG5mdW5jdGlvbiBDaGVja2JveChwYXJlbnQsIG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xyXG4gICAgT2JqZWN0Q29tcG9uZW50LmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcclxuXHJcbiAgICBwYXJhbXMgPSBwYXJhbXMgfHwge307XHJcbiAgICBwYXJhbXMub25DaGFuZ2UgPSBwYXJhbXMub25DaGFuZ2UgfHwgdGhpcy5fb25DaGFuZ2U7XHJcbiAgICB0aGlzLl9vbkNoYW5nZSA9IHBhcmFtcy5vbkNoYW5nZTtcclxuXHJcbiAgICB2YXIgbm9kZSA9IHRoaXMuX2lucHV0ID0gbmV3IE5vZGUoTm9kZS5JTlBVVF9DSEVDS0JPWCk7XHJcbiAgICBub2RlLnNldFByb3BlcnR5KCdjaGVja2VkJyx0aGlzLl9vYmpbdGhpcy5fa2V5XSk7XHJcbiAgICBub2RlLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50LkNIQU5HRSx0aGlzLl9vbklucHV0Q2hhbmdlLmJpbmQodGhpcykpO1xyXG5cclxuICAgIHRoaXMuX3dyYXBOb2RlLmFkZENoaWxkKHRoaXMuX2lucHV0KTtcclxufVxyXG5DaGVja2JveC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE9iamVjdENvbXBvbmVudC5wcm90b3R5cGUpO1xyXG5DaGVja2JveC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBDaGVja2JveDtcclxuXHJcbkNoZWNrYm94LnByb3RvdHlwZS5hcHBseVZhbHVlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5wdXNoSGlzdG9yeVN0YXRlKCk7XHJcblxyXG4gICAgdmFyIG9iaiA9IHRoaXMuX29iaiwga2V5ID0gdGhpcy5fa2V5O1xyXG4gICAgb2JqW2tleV0gPSAhb2JqW2tleV07XHJcblxyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCwgbnVsbCkpO1xyXG59O1xyXG5cclxuQ2hlY2tib3gucHJvdG90eXBlLl9vbklucHV0Q2hhbmdlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5hcHBseVZhbHVlKCk7XHJcbiAgICB0aGlzLl9vbkNoYW5nZSgpO1xyXG59O1xyXG5cclxuQ2hlY2tib3gucHJvdG90eXBlLm9uVmFsdWVVcGRhdGUgPSBmdW5jdGlvbiAoZSkge1xyXG4gICAgaWYgKGUuZGF0YS5vcmlnaW4gPT0gdGhpcyl7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdGhpcy5faW5wdXQuc2V0UHJvcGVydHkoJ2NoZWNrZWQnLCB0aGlzLl9vYmpbdGhpcy5fa2V5XSk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENoZWNrYm94OyIsInZhciBPYmplY3RDb21wb25lbnQgPSByZXF1aXJlKCcuLy4uL2NvcmUvT2JqZWN0Q29tcG9uZW50Jyk7XHJcblxyXG52YXIgTm9kZSAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XHJcbnZhciBDb2xvck1vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2NvbG9yL0NvbG9yTW9kZScpO1xyXG52YXIgUGlja2VyICAgID0gcmVxdWlyZSgnLi9QaWNrZXInKTtcclxudmFyIENvbG9yVXRpbCA9IHJlcXVpcmUoJy4uL2NvcmUvY29sb3IvQ29sb3JVdGlsJyk7XHJcbnZhciBPcHRpb25zICAgPSByZXF1aXJlKCcuL09wdGlvbnMnKTtcclxudmFyIEJ1dHRvblByZXNldCA9IHJlcXVpcmUoJy4vQnV0dG9uUHJlc2V0Jyk7XHJcbnZhciBNZXRyaWMgPSByZXF1aXJlKCcuL01ldHJpYycpLFxyXG4gICAgQ1NTICAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcclxuXHJcbnZhciBFdmVudF8gICAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcclxuICAgIE5vZGVFdmVudCAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKSxcclxuICAgIENvbXBvbmVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9Db21wb25lbnRFdmVudCcpO1xyXG5cclxudmFyIENvbG9yRm9ybWF0RXJyb3IgPSByZXF1aXJlKCcuLi9jb3JlL2NvbG9yL0NvbG9yRm9ybWF0RXJyb3InKTtcclxuXHJcbnZhciBERUZBVUxUX0NPTE9SX01PREUgPSBDb2xvck1vZGUuSEVYLFxyXG4gICAgREVGQVVMVF9QUkVTRVRTID0gbnVsbDtcclxuXHJcbnZhciBNU0dfQ09MT1JfRk9STUFUX0hFWCA9ICdDb2xvciBmb3JtYXQgc2hvdWxkIGJlIGhleC4gU2V0IGNvbG9yTW9kZSB0byByZ2IsIHJnYmZ2IG9yIGhzdi4nLFxyXG4gICAgTVNHX0NPTE9SX0ZPUk1BVF9SR0JfUkdCRlZfSFNWID0gJ0NvbG9yIGZvcm1hdCBzaG91bGQgYmUgcmdiLCByZ2JmdiBvciBoc3YuIFNldCBjb2xvck1vZGUgdG8gaGV4LicsXHJcbiAgICBNU0dfQ09MT1JfUFJFU0VUX0ZPUk1BVF9IRVggPSAnUHJlc2V0IGNvbG9yIGZvcm1hdCBzaG91bGQgYmUgaGV4LicsXHJcbiAgICBNU0dfQ09MT1JfUFJFU0VUX0ZPUk1BVF9SR0JfUkdCRlZfSFNWID0gJ1ByZXNldCBjb2xvciBmb3JtYXQgc2hvdWxkIGJlIHJnYiwgcmdiZnYgb3IgaHN2Lic7XHJcblxyXG5mdW5jdGlvbiBDb2xvcihwYXJlbnQsIG9iamVjdCwgdmFsdWUsIHBhcmFtcyl7XHJcbiAgICBPYmplY3RDb21wb25lbnQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxuXHJcbiAgICBwYXJhbXMgPSBwYXJhbXMgfHwge307XHJcbiAgICBwYXJhbXMucHJlc2V0cyA9IHBhcmFtcy5wcmVzZXRzIHx8IERFRkFVTFRfUFJFU0VUUztcclxuICAgIHBhcmFtcy5jb2xvck1vZGUgPSBwYXJhbXMuY29sb3JNb2RlIHx8IERFRkFVTFRfQ09MT1JfTU9ERTtcclxuICAgIHBhcmFtcy5vbkNoYW5nZSA9IHBhcmFtcy5vbkNoYW5nZSB8fCB0aGlzLl9vbkNoYW5nZTtcclxuXHJcblxyXG4gICAgdGhpcy5fcHJlc2V0c0tleSA9IHBhcmFtcy5wcmVzZXRzO1xyXG4gICAgdGhpcy5fb25DaGFuZ2UgPSBwYXJhbXMub25DaGFuZ2U7XHJcblxyXG4gICAgdmFyIGNvbG9yID0gdGhpcy5fY29sb3IgPSBuZXcgTm9kZSgpO1xyXG4gICAgdmFsdWUgPSB0aGlzLl92YWx1ZSA9IHRoaXMuX29ialt0aGlzLl9rZXldO1xyXG5cclxuICAgIHZhciBjb2xvck1vZGUgPSB0aGlzLl9jb2xvck1vZGUgPSBwYXJhbXMuY29sb3JNb2RlO1xyXG5cclxuICAgIHRoaXMuX3ZhbGlkYXRlQ29sb3JGb3JtYXQodmFsdWUsIE1TR19DT0xPUl9GT1JNQVRfSEVYLCBNU0dfQ09MT1JfRk9STUFUX1JHQl9SR0JGVl9IU1YpO1xyXG5cclxuICAgIHZhciB3cmFwID0gdGhpcy5fd3JhcE5vZGU7XHJcblxyXG4gICAgaWYoIXRoaXMuX3ByZXNldHNLZXkpe1xyXG4gICAgICAgIGNvbG9yLnNldFN0eWxlQ2xhc3MoQ1NTLkNvbG9yKTtcclxuICAgICAgICB3cmFwLmFkZENoaWxkKGNvbG9yKTtcclxuICAgIH1cclxuICAgIGVsc2V7XHJcbiAgICAgICAgY29sb3Iuc2V0U3R5bGVDbGFzcyhDU1MuQ29sb3IpO1xyXG5cclxuICAgICAgICB2YXIgd3JhcF8gPSBuZXcgTm9kZSgpO1xyXG4gICAgICAgIHdyYXBfLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXBDb2xvcldQcmVzZXQpO1xyXG5cclxuICAgICAgICB3cmFwLmFkZENoaWxkKHdyYXBfKTtcclxuICAgICAgICB3cmFwXy5hZGRDaGlsZChjb2xvcik7XHJcblxyXG4gICAgICAgIHZhciBwcmVzZXRzID0gdGhpcy5fb2JqW3RoaXMuX3ByZXNldHNLZXldO1xyXG5cclxuICAgICAgICB2YXIgaSA9IC0xO1xyXG4gICAgICAgIHdoaWxlKCsraSA8IHByZXNldHMubGVuZ3RoKXtcclxuICAgICAgICAgICAgdGhpcy5fdmFsaWRhdGVDb2xvckZvcm1hdChwcmVzZXRzW2ldLCBNU0dfQ09MT1JfUFJFU0VUX0ZPUk1BVF9IRVgsXHJcbiAgICAgICAgICAgICAgICBNU0dfQ09MT1JfUFJFU0VUX0ZPUk1BVF9SR0JfUkdCRlZfSFNWKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBvcHRpb25zID0gT3B0aW9ucy5nZXQoKSxcclxuICAgICAgICAgICAgcHJlc2V0QnRuID0gbmV3IEJ1dHRvblByZXNldCh3cmFwKTtcclxuXHJcbiAgICAgICAgdmFyIG9uUHJlc2V0RGVhY3RpdmF0ZSA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgIG9wdGlvbnMuY2xlYXIoKTtcclxuICAgICAgICAgICAgcHJlc2V0QnRuLmRlYWN0aXZhdGUoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgdmFyIG9uUHJlc2V0QWN0aXZhdGUgPSBmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICBvcHRpb25zLmJ1aWxkKHByZXNldHMsXHJcbiAgICAgICAgICAgICAgICBzZWxmLl92YWx1ZSxcclxuICAgICAgICAgICAgICAgIGNvbG9yLFxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLnB1c2hIaXN0b3J5U3RhdGUoKTtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLl92YWx1ZSA9IHByZXNldHNbb3B0aW9ucy5nZXRTZWxlY3RlZEluZGV4KCldO1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGYuYXBwbHlWYWx1ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX29uQ2hhbmdlKHNlbGYuX29ialtzZWxmLl9rZXldKTtcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBvblByZXNldERlYWN0aXZhdGUsXHJcbiAgICAgICAgICAgICAgICBNZXRyaWMuUEFERElOR19QUkVTRVQsXHJcbiAgICAgICAgICAgICAgICB0cnVlLFxyXG4gICAgICAgICAgICAgICAgY29sb3JNb2RlKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIHByZXNldEJ0bi5zZXRPbkFjdGl2ZShvblByZXNldEFjdGl2YXRlKTtcclxuICAgICAgICBwcmVzZXRCdG4uc2V0T25EZWFjdGl2ZShvblByZXNldERlYWN0aXZhdGUpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbG9yLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uQ29sb3JUcmlnZ2VyLmJpbmQodGhpcykpO1xyXG4gICAgdGhpcy5fdXBkYXRlQ29sb3IoKTtcclxufVxyXG5Db2xvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE9iamVjdENvbXBvbmVudC5wcm90b3R5cGUpO1xyXG5Db2xvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBDb2xvcjtcclxuXHJcbkNvbG9yLnByb3RvdHlwZS5fb25Db2xvclRyaWdnZXIgPSBmdW5jdGlvbigpe1xyXG4gICAgdmFyIGNvbG9yTW9kZSA9IHRoaXMuX2NvbG9yTW9kZSxcclxuICAgICAgICBjb2xvck1vZGVIRVggPSBDb2xvck1vZGUuSEVYLFxyXG4gICAgICAgIGNvbG9yTW9kZVJHQiA9IENvbG9yTW9kZS5SR0IsXHJcbiAgICAgICAgY29sb3JNb2RlUkdCZnYgPSBDb2xvck1vZGUuUkdCZnYsXHJcbiAgICAgICAgY29sb3JNb2RlSFNWID0gQ29sb3JNb2RlLkhTVjtcclxuXHJcbiAgICB2YXIgdmFsdWUgPSB0aGlzLl92YWx1ZSxcclxuICAgICAgICB0ZW1wO1xyXG5cclxuICAgIHZhciBvblBpY2tlclBpY2sgPSBmdW5jdGlvbigpe1xyXG4gICAgICAgIHRoaXMucHVzaEhpc3RvcnlTdGF0ZSgpO1xyXG5cclxuICAgICAgICBzd2l0Y2goY29sb3JNb2RlKXtcclxuICAgICAgICAgICAgY2FzZSBjb2xvck1vZGVIRVg6XHJcbiAgICAgICAgICAgICAgICB0aGlzLl92YWx1ZSA9IFBpY2tlci5nZXQoKS5nZXRIRVgoKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIGNvbG9yTW9kZVJHQjpcclxuICAgICAgICAgICAgICAgIC8vaWYgdmFsID0gRmxvYXQzMmFycmF5IG9yIHNvXHJcbiAgICAgICAgICAgICAgICB0ZW1wID0gUGlja2VyLmdldCgpLmdldFJHQigpO1xyXG4gICAgICAgICAgICAgICAgdmFsdWVbMF0gPSB0ZW1wWzBdO1xyXG4gICAgICAgICAgICAgICAgdmFsdWVbMV0gPSB0ZW1wWzFdO1xyXG4gICAgICAgICAgICAgICAgdmFsdWVbMl0gPSB0ZW1wWzJdO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICBjYXNlIGNvbG9yTW9kZVJHQmZ2OlxyXG4gICAgICAgICAgICAgICAgdGVtcCA9IFBpY2tlci5nZXQoKS5nZXRSR0JmdigpO1xyXG4gICAgICAgICAgICAgICAgdmFsdWVbMF0gPSB0ZW1wWzBdO1xyXG4gICAgICAgICAgICAgICAgdmFsdWVbMV0gPSB0ZW1wWzFdO1xyXG4gICAgICAgICAgICAgICAgdmFsdWVbMl0gPSB0ZW1wWzJdO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICBjYXNlIGNvbG9yTW9kZUhTVjpcclxuICAgICAgICAgICAgICAgIHRoaXMuX3ZhbHVlID0gUGlja2VyLmdldCgpLmdldEhTVigpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmFwcGx5VmFsdWUoKTtcclxuXHJcbiAgICB9LmJpbmQodGhpcyk7XHJcblxyXG4gICAgdmFyIHBpY2tlciA9IFBpY2tlci5nZXQoKTtcclxuXHJcbiAgICBzd2l0Y2goY29sb3JNb2RlKXtcclxuICAgICAgICBjYXNlIGNvbG9yTW9kZUhFWDpcclxuICAgICAgICAgICAgcGlja2VyLnNldENvbG9ySEVYKHZhbHVlKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBjb2xvck1vZGVSR0I6XHJcbiAgICAgICAgICAgIHBpY2tlci5zZXRDb2xvclJHQih2YWx1ZVswXSwgdmFsdWVbMV0sIHZhbHVlWzJdKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBjb2xvck1vZGVSR0JmdjpcclxuICAgICAgICAgICAgcGlja2VyLnNldENvbG9yUkdCZnYodmFsdWVbMF0sIHZhbHVlWzFdLCB2YWx1ZVsyXSk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgY29sb3JNb2RlSFNWOlxyXG4gICAgICAgICAgICBwaWNrZXIuc2V0Q29sb3JIU1YodmFsdWVbMF0sIHZhbHVlWzFdLCB2YWx1ZVsyXSk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG5cclxuICAgIHBpY2tlci5zZXRDYWxsYmFja1BpY2sob25QaWNrZXJQaWNrKTtcclxuICAgIHBpY2tlci5vcGVuKCk7XHJcbn07XHJcblxyXG5Db2xvci5wcm90b3R5cGUuYXBwbHlWYWx1ZSA9IGZ1bmN0aW9uKCl7XHJcbiAgICB0aGlzLl9vYmpbdGhpcy5fa2V5XSA9IHRoaXMuX3ZhbHVlO1xyXG4gICAgdGhpcy5fdXBkYXRlQ29sb3IoKTtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIG51bGwpKTtcclxuICAgIHRoaXMuX29uQ2hhbmdlKHRoaXMuX29ialt0aGlzLl9rZXldKTtcclxufTtcclxuXHJcbkNvbG9yLnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24oZSl7XHJcbiAgICBpZihlLmRhdGEub3JpZ2luID09IHRoaXMpcmV0dXJuO1xyXG4gICAgdGhpcy5fdmFsdWUgPSB0aGlzLl9vYmpbdGhpcy5fa2V5XTtcclxuICAgIHRoaXMuX3VwZGF0ZUNvbG9yKCk7XHJcbn07XHJcblxyXG5Db2xvci5wcm90b3R5cGUuX3VwZGF0ZUNvbG9yID0gZnVuY3Rpb24oKXtcclxuICAgIHZhciBjb2xvciA9IHRoaXMuX3ZhbHVlLFxyXG4gICAgICAgIGNvbG9yTm9kZSA9IHRoaXMuX2NvbG9yLFxyXG4gICAgICAgIG5vZGVDb2xvcjtcclxuXHJcbiAgICBjb2xvck5vZGUuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsIGNvbG9yKTtcclxuXHJcbiAgICBzd2l0Y2godGhpcy5fY29sb3JNb2RlKXtcclxuICAgICAgICBjYXNlIENvbG9yTW9kZS5IRVg6XHJcbiAgICAgICAgICAgIG5vZGVDb2xvciA9IGNvbG9yO1xyXG4gICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgY2FzZSBDb2xvck1vZGUuUkdCOlxyXG4gICAgICAgICAgICBub2RlQ29sb3IgPSBDb2xvclV0aWwuUkdCMkhFWChjb2xvclswXSwgY29sb3JbMV0sIGNvbG9yWzJdKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgIGNhc2UgQ29sb3JNb2RlLlJHQmZ2OlxyXG4gICAgICAgICAgICBub2RlQ29sb3IgPSBDb2xvclV0aWwuUkdCZnYySEVYKGNvbG9yWzBdLCBjb2xvclsxXSwgY29sb3JbMl0pO1xyXG4gICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgY2FzZSBDb2xvck1vZGUuSFNWOlxyXG4gICAgICAgICAgICBub2RlQ29sb3IgPSBDb2xvclV0aWwuSFNWMlJHQihjb2xvclswXSwgY29sb3JbMV0sIGNvbG9yWzJdKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcblxyXG4gICAgY29sb3JOb2RlLmdldFN0eWxlKCkuYmFja2dyb3VuZENvbG9yID0gbm9kZUNvbG9yO1xyXG59O1xyXG5cclxuQ29sb3IucHJvdG90eXBlLl92YWxpZGF0ZUNvbG9yRm9ybWF0ID0gZnVuY3Rpb24odmFsdWUsIG1zZ0hleCwgbXNnQXJyKXtcclxuICAgIHZhciBjb2xvck1vZGUgPSB0aGlzLl9jb2xvck1vZGU7XHJcblxyXG4gICAgaWYoY29sb3JNb2RlID09IENvbG9yTW9kZS5IRVggJiYgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gJ1tvYmplY3QgQXJyYXldJyB8fFxyXG4gICAgICAgIGNvbG9yTW9kZSA9PSBDb2xvck1vZGUuSEVYICYmIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IEZsb2F0MzJBcnJheV0nKXtcclxuICAgICAgICB0aHJvdyBuZXcgQ29sb3JGb3JtYXRFcnJvcihtc2dIZXgpO1xyXG4gICAgfVxyXG4gICAgaWYoKGNvbG9yTW9kZSA9PSBDb2xvck1vZGUuUkdCIHx8XHJcbiAgICAgICAgY29sb3JNb2RlID09IENvbG9yTW9kZS5SR0JmdiB8fFxyXG4gICAgICAgIGNvbG9yTW9kZSA9PSBDb2xvck1vZGUuSFNWKSAmJlxyXG4gICAgICAgIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgIT09ICdbb2JqZWN0IEFycmF5XScgfHxcclxuICAgICAgICBjb2xvck1vZGUgPT0gQ29sb3JNb2RlLkhTViAmJlxyXG4gICAgICAgIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgIT09ICdbb2JqZWN0IEZsb2F0MzJBcnJheV0nKXtcclxuICAgICAgICB0aHJvdyBuZXcgQ29sb3JGb3JtYXRFcnJvcihtc2dBcnIpO1xyXG4gICAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDb2xvcjtcclxuIiwidmFyIEZ1bmN0aW9uUGxvdFR5cGUgPSB7XHJcbiAgICBJTVBMSUNJVDogJ2ltcGxpY2l0JyxcclxuICAgIE5PTl9JTVBMSUNJVDogJ25vbkltcGxpY2l0J1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBGdW5jdGlvblBsb3RUeXBlOyIsInZhciBQbG90dGVyID0gcmVxdWlyZSgnLi9QbG90dGVyJyk7XHJcblxyXG52YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xyXG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcclxudmFyIEZ1bmN0aW9uUGxvdFR5cGUgPSByZXF1aXJlKCcuL0Z1bmN0aW9uUGxvdFR5cGUnKTtcclxuXHJcblxyXG52YXIgTW91c2UgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L01vdXNlJyk7XHJcbnZhciBNZXRyaWMgPSByZXF1aXJlKCcuL01ldHJpYycpO1xyXG5cclxudmFyIERvY3VtZW50RXZlbnQgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXHJcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKSxcclxuICAgIE5vZGVFdmVudCAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKTtcclxuXHJcbnZhciBGdW5jdGlvblBsb3R0ZXJPYmplY3RFcnJvciAgICAgICA9IHJlcXVpcmUoJy4vRnVuY3Rpb25QbG90dGVyT2JqZWN0RXJyb3InKSxcclxuICAgIEZ1bmN0aW9uUGxvdHRlckZ1bmN0aW9uQXJnc0Vycm9yID0gcmVxdWlyZSgnLi9GdW5jdGlvblBsb3R0ZXJGdW5jdGlvbkFyZ3NFcnJvcicpO1xyXG5cclxudmFyIE9iamVjdENvbXBvbmVudE5vdGlmaWVyID0gcmVxdWlyZSgnLi4vY29yZS9PYmplY3RDb21wb25lbnROb3RpZmllcicpO1xyXG5cclxudmFyIERFRkFVTFRfU0hPV19NSU5fTUFYX0xBQkVMUyA9IHRydWU7XHJcblxyXG52YXIgREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX05PTl9JTVBMSUNJVF9VTklUX1ggID0gIDEsXHJcbiAgICBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfTk9OX0lNUExJQ0lUX1VOSVRfWSAgPSAgMSxcclxuICAgIERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9JTVBMSUNJVF9VTklUX1ggID0gMC4yNSxcclxuICAgIERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9JTVBMSUNJVF9VTklUX1kgID0gMC4yNSxcclxuICAgIERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9VTklUX01JTiAgPSAwLjE1LFxyXG4gICAgREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX1VOSVRfTUFYICA9IDQsXHJcbiAgICBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfTk9OX0lNUExJQ0lUX1NDQUxFICA9IDEwLjAsXHJcbiAgICBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfSU1QTElDSVRfU0NBTEUgPSAxLjAsXHJcbiAgICBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfU0NBTEVfTUlOID0gMC4wMixcclxuICAgIERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9TQ0FMRV9NQVggPSAyNSxcclxuXHJcbiAgICBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfSU1QTElDSVRfQVhFU19DT0xPUiA9ICdyZ2JhKDI1NSwyNTUsMjU1LDAuNzUpJyxcclxuICAgIERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9JTVBMSUNJVF9HUklEX0NPTE9SID0gJ3JnYmEoMjUsMjUsMjUsMC43NSknLFxyXG5cclxuICAgIERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9OT05fSU1QTElDSVRfQVhFU19DT0xPUiA9ICdyZ2IoNTQsNjAsNjQpJyxcclxuICAgIERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9OT05fSU1QTElDSVRfR1JJRF9DT0xPUiA9ICdyZ2IoMjUsMjUsMjUpJyxcclxuXHJcbiAgICBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfQ0lSQ0xFX0xBQkVMX1JBRElVUyA9IDMsXHJcbiAgICBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfQ0lSQ0xFX0xBQkVMX0ZJTEwgICA9ICdyZ2IoMjU1LDI1NSwyNTUpJyxcclxuICAgIERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9DSVJDTEVfU1RST0tFICAgICAgID0gJyNiMTIzMzQnO1xyXG5cclxuZnVuY3Rpb24gRnVuY3Rpb25QbG90dGVyKHBhcmVudCwgb2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XHJcbiAgICBwYXJhbXMgPSBwYXJhbXMgfHwge307XHJcbiAgICBwYXJhbXMuc2hvd01pbk1heExhYmVscyA9IHBhcmFtcy5zaG93TWluTWF4TGFiZWxzID09PSB1bmRlZmluZWQgPyBERUZBVUxUX1NIT1dfTUlOX01BWF9MQUJFTFMgOiBwYXJhbXMuc2hvd01pbk1heExhYmVscztcclxuXHJcbiAgICBQbG90dGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcblxyXG4gICAgaWYgKHR5cGVvZiBvYmplY3RbdmFsdWVdICE9PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEZ1bmN0aW9uUGxvdHRlck9iamVjdEVycm9yKG9iamVjdCx2YWx1ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGZ1bmNBcmdMZW5ndGggPSBvYmplY3RbdmFsdWVdLmxlbmd0aDtcclxuXHJcbiAgICBpZiAoZnVuY0FyZ0xlbmd0aCA+IDIgfHwgZnVuY0FyZ0xlbmd0aCA9PSAwKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEZ1bmN0aW9uUGxvdHRlckZ1bmN0aW9uQXJnc0Vycm9yKCk7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHN2Z1Jvb3QgPSB0aGlzLl9zdmdSb290LFxyXG4gICAgICAgIHBhdGggPSB0aGlzLl9wYXRoO1xyXG5cclxuICAgIHZhciBheGVzID0gdGhpcy5fYXhlcyA9IHN2Z1Jvb3QuaW5zZXJ0QmVmb3JlKHRoaXMuX2NyZWF0ZVNWR09iamVjdCgncGF0aCcpLCBwYXRoKTtcclxuICAgICAgICBheGVzLnN0eWxlLnN0cm9rZVdpZHRoID0gMTtcclxuXHJcbiAgICB2YXIgYXhlc0xhYmVscyA9IHRoaXMuX2F4ZXNMYWJlbHMgPSBzdmdSb290Lmluc2VydEJlZm9yZSh0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ3BhdGgnKSwgcGF0aCk7XHJcbiAgICAgICAgYXhlc0xhYmVscy5zdHlsZS5zdHJva2UgPSAncmdiKDQzLDQ4LDUxKSc7XHJcbiAgICAgICAgYXhlc0xhYmVscy5zdHlsZS5zdHJva2VXaWR0aCA9IDE7XHJcblxyXG4gICAgdmFyIGdyaWQgPSB0aGlzLl9ncmlkO1xyXG5cclxuICAgIHZhciBzdmcgPSB0aGlzLl9zdmcsXHJcbiAgICAgICAgc2l6ZSA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKTtcclxuXHJcbiAgICB2YXIgc2xpZGVyWFdyYXAgPSBuZXcgTm9kZSgpO1xyXG4gICAgICAgIHNsaWRlclhXcmFwLnNldFN0eWxlQ2xhc3MoQ1NTLkdyYXBoU2xpZGVyWFdyYXApO1xyXG5cclxuICAgIHZhciBzbGlkZXJZV3JhcCA9IG5ldyBOb2RlKCk7XHJcbiAgICAgICAgc2xpZGVyWVdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuR3JhcGhTbGlkZXJZV3JhcCk7XHJcblxyXG4gICAgdmFyIHNsaWRlclhUcmFjayA9IHRoaXMuX3NsaWRlclhUcmFjayA9IG5ldyBOb2RlKCk7XHJcbiAgICAgICAgc2xpZGVyWFRyYWNrLnNldFN0eWxlQ2xhc3MoQ1NTLkdyYXBoU2xpZGVyWCk7XHJcblxyXG4gICAgdmFyIHNsaWRlcllUcmFjayA9IHRoaXMuX3NsaWRlcllUcmFjayA9IG5ldyBOb2RlKCk7XHJcbiAgICAgICAgc2xpZGVyWVRyYWNrLnNldFN0eWxlQ2xhc3MoQ1NTLkdyYXBoU2xpZGVyWSk7XHJcblxyXG4gICAgdmFyIHNsaWRlclhIYW5kbGUgPSB0aGlzLl9zbGlkZXJYSGFuZGxlID0gbmV3IE5vZGUoKTtcclxuICAgICAgICBzbGlkZXJYSGFuZGxlLnNldFN0eWxlQ2xhc3MoQ1NTLkdyYXBoU2xpZGVyWEhhbmRsZSk7XHJcblxyXG4gICAgdmFyIHNsaWRlcllIYW5kbGUgPSB0aGlzLl9zbGlkZXJZSGFuZGxlID0gbmV3IE5vZGUoKTtcclxuICAgICAgICBzbGlkZXJZSGFuZGxlLnNldFN0eWxlQ2xhc3MoQ1NTLkdyYXBoU2xpZGVyWUhhbmRsZSk7XHJcblxyXG4gICAgc2xpZGVyWFRyYWNrLmFkZENoaWxkKHNsaWRlclhIYW5kbGUpO1xyXG4gICAgc2xpZGVyWVRyYWNrLmFkZENoaWxkKHNsaWRlcllIYW5kbGUpO1xyXG4gICAgc2xpZGVyWFdyYXAuYWRkQ2hpbGQoc2xpZGVyWFRyYWNrKTtcclxuICAgIHNsaWRlcllXcmFwLmFkZENoaWxkKHNsaWRlcllUcmFjayk7XHJcblxyXG4gICAgdmFyIHdyYXBOb2RlID0gdGhpcy5fd3JhcE5vZGU7XHJcblxyXG4gICAgdmFyIHBsb3RNb2RlID0gdGhpcy5fcGxvdE1vZGUgPSBmdW5jQXJnTGVuZ3RoID09IDEgP1xyXG4gICAgICAgIEZ1bmN0aW9uUGxvdFR5cGUuTk9OX0lNUExJQ0lUIDpcclxuICAgICAgICBGdW5jdGlvblBsb3RUeXBlLklNUExJQ0lUO1xyXG5cclxuICAgIGlmIChwbG90TW9kZSA9PSBGdW5jdGlvblBsb3RUeXBlLklNUExJQ0lUKSB7XHJcbiAgICAgICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xyXG4gICAgICAgIGNhbnZhcy5zdHlsZS53aWR0aCA9IGNhbnZhcy5zdHlsZS5oZWlnaHQgPSBzaXplICsgJ3B4JztcclxuICAgICAgICBjYW52YXMud2lkdGggPSBjYW52YXMuaGVpZ2h0ID0gc2l6ZTtcclxuXHJcbiAgICAgICAgd3JhcE5vZGUuZ2V0RWxlbWVudCgpLmluc2VydEJlZm9yZShjYW52YXMsIHN2Zyk7XHJcblxyXG4gICAgICAgIHRoaXMuX2NhbnZhc0NvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcclxuICAgICAgICB0aGlzLl9jYW52YXNJbWFnZURhdGEgPSB0aGlzLl9jYW52YXNDb250ZXh0LmdldEltYWdlRGF0YSgwLCAwLCBzaXplLCBzaXplKTtcclxuXHJcbiAgICAgICAgYXhlcy5zdHlsZS5zdHJva2UgPSBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfSU1QTElDSVRfQVhFU19DT0xPUjtcclxuICAgICAgICBncmlkLnN0eWxlLnN0cm9rZSA9IERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9JTVBMSUNJVF9HUklEX0NPTE9SO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgYXhlcy5zdHlsZS5zdHJva2UgPSBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfTk9OX0lNUExJQ0lUX0FYRVNfQ09MT1I7XHJcbiAgICAgICAgZ3JpZC5zdHlsZS5zdHJva2UgPSBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfTk9OX0lNUExJQ0lUX0dSSURfQ09MT1I7XHJcbiAgICB9XHJcblxyXG4gICAgd3JhcE5vZGUuYWRkQ2hpbGQoc2xpZGVyWFdyYXApO1xyXG4gICAgd3JhcE5vZGUuYWRkQ2hpbGQoc2xpZGVyWVdyYXApO1xyXG5cclxuICAgIHNsaWRlclhIYW5kbGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25TbGlkZXJYSGFuZGxlRG93bi5iaW5kKHRoaXMpKTtcclxuICAgIHNsaWRlcllIYW5kbGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25TbGlkZXJZSGFuZGxlRG93bi5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICB2YXIgdW5pdHMgPSB0aGlzLl91bml0cyA9IFtudWxsLCBudWxsXTtcclxuICAgIHRoaXMuX3NjYWxlID0gbnVsbDtcclxuXHJcbiAgICBpZiAocGxvdE1vZGUgPT0gRnVuY3Rpb25QbG90VHlwZS5OT05fSU1QTElDSVQpIHtcclxuICAgICAgICB1bml0c1swXSA9IERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9OT05fSU1QTElDSVRfVU5JVF9YO1xyXG4gICAgICAgIHVuaXRzWzFdID0gREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX05PTl9JTVBMSUNJVF9VTklUX1k7XHJcblxyXG4gICAgICAgIHRoaXMuX3NjYWxlID0gREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX05PTl9JTVBMSUNJVF9TQ0FMRTtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKHBsb3RNb2RlID09IEZ1bmN0aW9uUGxvdFR5cGUuSU1QTElDSVQpIHtcclxuICAgICAgICB1bml0c1swXSA9IERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9JTVBMSUNJVF9VTklUX1g7XHJcbiAgICAgICAgdW5pdHNbMV0gPSBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfSU1QTElDSVRfVU5JVF9ZO1xyXG5cclxuICAgICAgICB0aGlzLl9zY2FsZSA9IERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9JTVBMSUNJVF9TQ0FMRTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLl91bml0c01pbk1heCA9IFtERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfVU5JVF9NSU4sIERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9VTklUX01BWF07IC8vMS84LT40XHJcblxyXG4gICAgdGhpcy5fc2NhbGVNaW5NYXggPSBbREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX1NDQUxFX01JTiwgREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX1NDQUxFX01BWF07IC8vMS81MCAtPiAyNVxyXG5cclxuICAgIHRoaXMuX2NlbnRlciA9IFtNYXRoLnJvdW5kKHNpemUgKiAwLjUpLE1hdGgucm91bmQoc2l6ZSAqIDAuNSldO1xyXG4gICAgdGhpcy5fc3ZnUG9zID0gWzAsIDBdO1xyXG5cclxuICAgIHRoaXMuX2Z1bmMgPSBudWxsO1xyXG4gICAgdGhpcy5zZXRGdW5jdGlvbih0aGlzLl9vYmpbdGhpcy5fa2V5XSk7XHJcblxyXG4gICAgdGhpcy5fc2xpZGVyWEhhbmRsZVVwZGF0ZSgpO1xyXG4gICAgdGhpcy5fc2xpZGVyWUhhbmRsZVVwZGF0ZSgpO1xyXG5cclxuICAgIHN2Zy5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25EcmFnU3RhcnQuYmluZCh0aGlzKSwgZmFsc2UpO1xyXG4gICAgdGhpcy5fd3JhcE5vZGUuZ2V0RWxlbWVudCgpLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZXdoZWVsXCIsIHRoaXMuX29uU2NhbGUuYmluZCh0aGlzLCBmYWxzZSkpO1xyXG5cclxuICAgIE9iamVjdENvbXBvbmVudE5vdGlmaWVyLmdldCgpLmFkZEV2ZW50TGlzdGVuZXIoQ29tcG9uZW50RXZlbnQuVVBEQVRFX1ZBTFVFLCB0aGlzLCAnb25WYWx1ZVVwZGF0ZScpO1xyXG59XHJcbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFBsb3R0ZXIucHJvdG90eXBlKTtcclxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEZ1bmN0aW9uUGxvdHRlcjtcclxuXHJcbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX3VwZGF0ZUNlbnRlciA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBzdmcgPSB0aGlzLl9zdmcsXHJcbiAgICAgICAgd2lkdGggPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnd2lkdGgnKSksXHJcbiAgICAgICAgaGVpZ2h0ID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ2hlaWdodCcpKTtcclxuXHJcbiAgICB2YXIgbW91c2VQb3MgPSBNb3VzZS5nZXQoKS5nZXRQb3NpdGlvbigpLFxyXG4gICAgICAgIHN2Z1BvcyA9IHRoaXMuX3N2Z1BvcyxcclxuICAgICAgICBjZW50ZXIgPSB0aGlzLl9jZW50ZXI7XHJcblxyXG4gICAgY2VudGVyWzBdID0gTWF0aC5tYXgoMCwgTWF0aC5taW4obW91c2VQb3NbMF0gLSBzdmdQb3NbMF0sIHdpZHRoKSk7XHJcbiAgICBjZW50ZXJbMV0gPSBNYXRoLm1heCgwLCBNYXRoLm1pbihtb3VzZVBvc1sxXSAtIHN2Z1Bvc1sxXSwgaGVpZ2h0KSk7XHJcblxyXG4gICAgdGhpcy5fcGxvdEdyYXBoKCk7XHJcbn07XHJcblxyXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9vbkRyYWdTdGFydCA9IGZ1bmN0aW9uIChlKSB7XHJcbiAgICB2YXIgc3ZnUG9zID0gdGhpcy5fc3ZnUG9zO1xyXG4gICAgc3ZnUG9zWzBdID0gMDtcclxuICAgIHN2Z1Bvc1sxXSA9IDA7XHJcblxyXG4gICAgLy9za2lwIHRvIGNvbnRhaW5lclxyXG4gICAgdmFyIGVsZW1lbnQgPSB0aGlzLl9zdmcucGFyZW50Tm9kZTtcclxuXHJcbiAgICB3aGlsZSAoZWxlbWVudCkge1xyXG4gICAgICAgIHN2Z1Bvc1swXSArPSBlbGVtZW50Lm9mZnNldExlZnQ7XHJcbiAgICAgICAgc3ZnUG9zWzFdICs9IGVsZW1lbnQub2Zmc2V0VG9wO1xyXG4gICAgICAgIGVsZW1lbnQgPSBlbGVtZW50Lm9mZnNldFBhcmVudDtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgZXZlbnRNb3ZlID0gRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLFxyXG4gICAgICAgIGV2ZW50VXAgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX1VQO1xyXG5cclxuICAgIHZhciBvbkRyYWcgPSB0aGlzLl91cGRhdGVDZW50ZXIuYmluZCh0aGlzKSxcclxuICAgICAgICBvbkRyYWdFbmQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX3VwZGF0ZUNlbnRlci5iaW5kKHRoaXMpO1xyXG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnLCBmYWxzZSk7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRVcCwgb25EcmFnRW5kLCBmYWxzZSk7XHJcblxyXG4gICAgICAgIH0uYmluZCh0aGlzKTtcclxuXHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnLCBmYWxzZSk7XHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50VXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xyXG5cclxuICAgIHRoaXMuX3VwZGF0ZUNlbnRlcigpO1xyXG59O1xyXG5cclxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fb25TY2FsZSA9IGZ1bmN0aW9uIChlKSB7XHJcbiAgICBlID0gd2luZG93LmV2ZW50IHx8IGU7XHJcbiAgICB0aGlzLl9zY2FsZSArPSBNYXRoLm1heCgtMSwgTWF0aC5taW4oMSwgKGUud2hlZWxEZWx0YSB8fCAtZS5kZXRhaWwpKSkgKiAtMTtcclxuXHJcbiAgICB2YXIgc2NhbGVNaW5NYXggPSB0aGlzLl9zY2FsZU1pbk1heDtcclxuICAgIHRoaXMuX3NjYWxlID0gTWF0aC5tYXgoc2NhbGVNaW5NYXhbMF0sIE1hdGgubWluKHRoaXMuX3NjYWxlLCBzY2FsZU1pbk1heFsxXSkpO1xyXG5cclxuICAgIHRoaXMuX3Bsb3RHcmFwaCgpO1xyXG5cclxuICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuXHJcbn07XHJcblxyXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLm9uVmFsdWVVcGRhdGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLnNldEZ1bmN0aW9uKHRoaXMuX29ialt0aGlzLl9rZXldKTtcclxufTtcclxuXHJcbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX3JlZHJhdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGlmICh0aGlzLl9wbG90TW9kZSA9PSBGdW5jdGlvblBsb3RUeXBlLklNUExJQ0lUKSB7XHJcbiAgICAgICAgdmFyIHNpemUgPSB0aGlzLl93cmFwTm9kZS5nZXRXaWR0aCgpLFxyXG4gICAgICAgICAgICBjYW52YXMgPSB0aGlzLl9jYW52YXM7XHJcblxyXG4gICAgICAgIGNhbnZhcy5zdHlsZS53aWR0aCA9IGNhbnZhcy5zdHlsZS5oZWlnaHQgPSBzaXplICsgJ3B4JztcclxuICAgICAgICBjYW52YXMud2lkdGggPSBjYW52YXMuaGVpZ2h0ID0gc2l6ZTtcclxuXHJcbiAgICAgICAgdGhpcy5fY2FudmFzSW1hZ2VEYXRhID0gdGhpcy5fY2FudmFzQ29udGV4dC5nZXRJbWFnZURhdGEoMCwgMCwgc2l6ZSwgc2l6ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5fc2xpZGVyWEhhbmRsZVVwZGF0ZSgpO1xyXG4gICAgdGhpcy5fc2xpZGVyWUhhbmRsZVVwZGF0ZSgpO1xyXG5cclxuICAgIHRoaXMuc2V0RnVuY3Rpb24odGhpcy5fb2JqW3RoaXMuX2tleV0pO1xyXG59O1xyXG5cclxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5zZXRGdW5jdGlvbiA9IGZ1bmN0aW9uIChmdW5jKSB7XHJcbiAgICB0aGlzLl9mdW5jID0gZnVuYy5iaW5kKHRoaXMuX29iaik7XHJcbiAgICB0aGlzLl9wbG90R3JhcGgoKTtcclxufTtcclxuXHJcbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX3Bsb3RHcmFwaCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuX2RyYXdHcmlkKCk7XHJcbiAgICB0aGlzLl9kcmF3QXhlcygpO1xyXG4gICAgdGhpcy5fZHJhd1Bsb3QoKTtcclxufTtcclxuXHJcbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX2RyYXdBeGVzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHN2ZyA9IHRoaXMuX3N2ZyxcclxuICAgICAgICBzdmdXaWR0aCA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKSxcclxuICAgICAgICBzdmdIZWlnaHQgPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnaGVpZ2h0JykpO1xyXG5cclxuICAgIHZhciBjZW50ZXIgPSB0aGlzLl9jZW50ZXIsXHJcbiAgICAgICAgY2VudGVyWCA9IGNlbnRlclswXSxcclxuICAgICAgICBjZW50ZXJZID0gY2VudGVyWzFdO1xyXG5cclxuICAgIHZhciBwYXRoQ21kID0gJyc7XHJcbiAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRMaW5lKDAsIGNlbnRlclksIHN2Z1dpZHRoLCBjZW50ZXJZKTtcclxuICAgIHBhdGhDbWQgKz0gdGhpcy5fcGF0aENtZExpbmUoY2VudGVyWCwgMCwgY2VudGVyWCwgc3ZnSGVpZ2h0KTtcclxuXHJcbiAgICB0aGlzLl9heGVzLnNldEF0dHJpYnV0ZSgnZCcsIHBhdGhDbWQpO1xyXG59O1xyXG5cclxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fZHJhd1Bsb3QgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgd2lkdGgsIGhlaWdodDtcclxuXHJcbiAgICB2YXIgY2VudGVyID0gdGhpcy5fY2VudGVyLFxyXG4gICAgICAgIGNlbnRlclggPSBjZW50ZXJbMF0sXHJcbiAgICAgICAgY2VudGVyWSA9IGNlbnRlclsxXTtcclxuXHJcbiAgICB2YXIgdW5pdHMgPSB0aGlzLl91bml0cyxcclxuICAgICAgICB1bml0WCwgdW5pdFk7XHJcblxyXG4gICAgdmFyIHNjYWxlID0gdGhpcy5fc2NhbGU7XHJcbiAgICB2YXIgbm9ybXZhbCwgc2NhbGVkVmFsLCB2YWx1ZSwgaW5kZXg7XHJcbiAgICB2YXIgb2Zmc2V0WCwgb2Zmc2V0WTtcclxuXHJcbiAgICB2YXIgaTtcclxuXHJcbiAgICBpZiAodGhpcy5fcGxvdE1vZGUgPT0gRnVuY3Rpb25QbG90VHlwZS5OT05fSU1QTElDSVQpIHtcclxuICAgICAgICB2YXIgc3ZnID0gdGhpcy5fc3ZnO1xyXG5cclxuICAgICAgICB3aWR0aCA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKTtcclxuICAgICAgICBoZWlnaHQgPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnaGVpZ2h0JykpO1xyXG4gICAgICAgIHVuaXRYID0gdW5pdHNbMF0gKiBzY2FsZTtcclxuICAgICAgICB1bml0WSA9IGhlaWdodCAvICh1bml0c1sxXSAqIHNjYWxlKTtcclxuICAgICAgICBvZmZzZXRYID0gY2VudGVyWCAvIHdpZHRoO1xyXG5cclxuICAgICAgICB2YXIgbGVuID0gTWF0aC5mbG9vcih3aWR0aCksXHJcbiAgICAgICAgICAgIHBvaW50cyA9IG5ldyBBcnJheShsZW4gKiAyKTtcclxuXHJcbiAgICAgICAgaSA9IC0xO1xyXG4gICAgICAgIHdoaWxlICgrK2kgPCBsZW4pIHtcclxuICAgICAgICAgICAgbm9ybXZhbCA9ICgtb2Zmc2V0WCArIGkgLyBsZW4pO1xyXG4gICAgICAgICAgICBzY2FsZWRWYWwgPSBub3JtdmFsICogdW5pdFg7XHJcbiAgICAgICAgICAgIHZhbHVlID0gY2VudGVyWSAtIHRoaXMuX2Z1bmMoc2NhbGVkVmFsKSAqIHVuaXRZO1xyXG5cclxuICAgICAgICAgICAgaW5kZXggPSBpICogMjtcclxuXHJcbiAgICAgICAgICAgIHBvaW50c1tpbmRleF0gPSBpO1xyXG4gICAgICAgICAgICBwb2ludHNbaW5kZXggKyAxXSA9IHZhbHVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIHBhdGhDbWQgPSAnJztcclxuICAgICAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRNb3ZlVG8ocG9pbnRzWzBdLCBwb2ludHNbMV0pO1xyXG5cclxuICAgICAgICBpID0gMjtcclxuICAgICAgICB3aGlsZSAoaSA8IHBvaW50cy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgcGF0aENtZCArPSB0aGlzLl9wYXRoQ21kTGluZVRvKHBvaW50c1tpXSwgcG9pbnRzW2kgKyAxXSk7XHJcbiAgICAgICAgICAgIGkgKz0gMjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuX3BhdGguc2V0QXR0cmlidXRlKCdkJywgcGF0aENtZCk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzLFxyXG4gICAgICAgICAgICBjb250ZXh0ID0gdGhpcy5fY2FudmFzQ29udGV4dCxcclxuICAgICAgICAgICAgaW1nRGF0YSA9IHRoaXMuX2NhbnZhc0ltYWdlRGF0YTtcclxuXHJcbiAgICAgICAgd2lkdGggPSBjYW52YXMud2lkdGg7XHJcbiAgICAgICAgaGVpZ2h0ID0gY2FudmFzLmhlaWdodDtcclxuXHJcbiAgICAgICAgdW5pdFggPSB1bml0c1swXSAqIHNjYWxlO1xyXG4gICAgICAgIHVuaXRZID0gdW5pdHNbMV0gKiBzY2FsZTtcclxuXHJcbiAgICAgICAgb2Zmc2V0WCA9IGNlbnRlclggLyB3aWR0aDtcclxuICAgICAgICBvZmZzZXRZID0gY2VudGVyWSAvIGhlaWdodDtcclxuXHJcbiAgICAgICAgdmFyIGludldpZHRoID0gMSAvIHdpZHRoLFxyXG4gICAgICAgICAgICBpbnZIZWlnaHQgPSAxIC8gaGVpZ2h0O1xyXG4gICAgICAgIHZhciByZ2IgPSBbMCwgMCwgMF07XHJcblxyXG4gICAgICAgIHZhciBjb2wwID0gWzMwLCAzNCwgMzZdLFxyXG4gICAgICAgICAgICBjb2wxID0gWzI1NSwgMjU1LCAyNTVdO1xyXG5cclxuICAgICAgICBpID0gLTE7XHJcbiAgICAgICAgdmFyIGo7XHJcbiAgICAgICAgd2hpbGUgKCsraSA8IGhlaWdodCkge1xyXG4gICAgICAgICAgICBqID0gLTE7XHJcblxyXG4gICAgICAgICAgICB3aGlsZSAoKytqIDwgd2lkdGgpIHtcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gdGhpcy5fZnVuYygoLW9mZnNldFggKyBqICogaW52V2lkdGgpICogdW5pdFgsXHJcbiAgICAgICAgICAgICAgICAgICAgKC1vZmZzZXRZICsgaSAqIGludkhlaWdodCkgKiB1bml0WSk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmdiWzBdID0gTWF0aC5mbG9vcigoY29sMVswXSAtIGNvbDBbMF0pICogdmFsdWUgKyBjb2wwWzBdKTtcclxuICAgICAgICAgICAgICAgIHJnYlsxXSA9IE1hdGguZmxvb3IoKGNvbDFbMV0gLSBjb2wwWzFdKSAqIHZhbHVlICsgY29sMFsxXSk7XHJcbiAgICAgICAgICAgICAgICByZ2JbMl0gPSBNYXRoLmZsb29yKChjb2wxWzJdIC0gY29sMFsyXSkgKiB2YWx1ZSArIGNvbDBbMl0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGluZGV4ID0gKGkgKiB3aWR0aCArIGopICogNDtcclxuXHJcbiAgICAgICAgICAgICAgICBpbWdEYXRhLmRhdGFbaW5kZXhdID0gcmdiWzBdO1xyXG4gICAgICAgICAgICAgICAgaW1nRGF0YS5kYXRhW2luZGV4ICsgMV0gPSByZ2JbMV07XHJcbiAgICAgICAgICAgICAgICBpbWdEYXRhLmRhdGFbaW5kZXggKyAyXSA9IHJnYlsyXTtcclxuICAgICAgICAgICAgICAgIGltZ0RhdGEuZGF0YVtpbmRleCArIDNdID0gMjU1O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb250ZXh0LmNsZWFyUmVjdCgwLCAwLCB3aWR0aCwgaGVpZ2h0KTtcclxuICAgICAgICBjb250ZXh0LnB1dEltYWdlRGF0YShpbWdEYXRhLCAwLCAwKTtcclxuICAgIH1cclxufTtcclxuXHJcbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX2RyYXdHcmlkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHN2ZyA9IHRoaXMuX3N2ZyxcclxuICAgICAgICB3aWR0aCA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKSxcclxuICAgICAgICBoZWlnaHQgPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnaGVpZ2h0JykpO1xyXG5cclxuICAgIHZhciBzY2FsZSA9IHRoaXMuX3NjYWxlO1xyXG5cclxuICAgIHZhciBncmlkUmVzID0gdGhpcy5fdW5pdHMsXHJcbiAgICAgICAgZ3JpZFNwYWNpbmdYID0gd2lkdGggLyAoZ3JpZFJlc1swXSAqIHNjYWxlKSxcclxuICAgICAgICBncmlkU3BhY2luZ1kgPSBoZWlnaHQgLyAoZ3JpZFJlc1sxXSAqIHNjYWxlKTtcclxuXHJcbiAgICB2YXIgY2VudGVyID0gdGhpcy5fY2VudGVyLFxyXG4gICAgICAgIGNlbnRlclggPSBjZW50ZXJbMF0sXHJcbiAgICAgICAgY2VudGVyWSA9IGNlbnRlclsxXTtcclxuXHJcbiAgICB2YXIgZ3JpZE51bVRvcCA9IE1hdGgucm91bmQoY2VudGVyWSAvIGdyaWRTcGFjaW5nWSkgKyAxLFxyXG4gICAgICAgIGdyaWROdW1Cb3R0b20gPSBNYXRoLnJvdW5kKChoZWlnaHQgLSBjZW50ZXJZKSAvIGdyaWRTcGFjaW5nWSkgKyAxLFxyXG4gICAgICAgIGdyaWROdW1MZWZ0ID0gTWF0aC5yb3VuZChjZW50ZXJYIC8gZ3JpZFNwYWNpbmdYKSArIDEsXHJcbiAgICAgICAgZ3JpZE51bVJpZ2h0ID0gTWF0aC5yb3VuZCgod2lkdGggLSBjZW50ZXJYKSAvIGdyaWRTcGFjaW5nWCkgKyAxO1xyXG5cclxuICAgIHZhciBwYXRoQ21kR3JpZCA9ICcnLFxyXG4gICAgICAgIHBhdGhDbWRBeGVzTGFiZWxzID0gJyc7XHJcblxyXG4gICAgdmFyIGksIHRlbXA7XHJcblxyXG4gICAgdmFyIHN0cm9rZVNpemUgPSBNZXRyaWMuU1RST0tFX1NJWkU7XHJcblxyXG4gICAgdmFyIGxhYmVsVGlja1NpemUgPSBNZXRyaWMuRlVOQ1RJT05fUExPVFRFUl9MQUJFTF9USUNLX1NJWkUsXHJcbiAgICAgICAgbGFiZWxUaWNrUGFkZGluZ1JpZ2h0ID0gd2lkdGggLSBsYWJlbFRpY2tTaXplIC0gc3Ryb2tlU2l6ZSxcclxuICAgICAgICBsYWJlbFRpY2tQYWRkaW5nQm90dG9tID0gaGVpZ2h0IC0gbGFiZWxUaWNrU2l6ZSAtIHN0cm9rZVNpemUsXHJcbiAgICAgICAgbGFiZWxUaWNrUGFkZGluZ1JpZ2h0T2Zmc2V0ID0gbGFiZWxUaWNrUGFkZGluZ1JpZ2h0IC0gbGFiZWxUaWNrU2l6ZSxcclxuICAgICAgICBsYWJlbFRpY2tQYWRkaW5nQm90dG9tT2Zmc2V0ID0gbGFiZWxUaWNrUGFkZGluZ0JvdHRvbSAtIGxhYmVsVGlja1NpemUsXHJcbiAgICAgICAgbGFiZWxUaWNrT2Zmc2V0UmlnaHQgPSBsYWJlbFRpY2tQYWRkaW5nUmlnaHQgLSAobGFiZWxUaWNrU2l6ZSArIHN0cm9rZVNpemUpICogMixcclxuICAgICAgICBsYWJlbFRpY2tPZmZzZXRCb3R0b20gPSBsYWJlbFRpY2tQYWRkaW5nQm90dG9tIC0gKGxhYmVsVGlja1NpemUgKyBzdHJva2VTaXplKSAqIDI7XHJcblxyXG4gICAgaSA9IC0xO1xyXG4gICAgd2hpbGUgKCsraSA8IGdyaWROdW1Ub3ApIHtcclxuICAgICAgICB0ZW1wID0gTWF0aC5yb3VuZChjZW50ZXJZIC0gZ3JpZFNwYWNpbmdZICogaSk7XHJcbiAgICAgICAgcGF0aENtZEdyaWQgKz0gdGhpcy5fcGF0aENtZExpbmUoMCwgdGVtcCwgd2lkdGgsIHRlbXApO1xyXG5cclxuICAgICAgICBpZiAodGVtcCA+IGxhYmVsVGlja1NpemUpe1xyXG4gICAgICAgICAgICBwYXRoQ21kQXhlc0xhYmVscyArPSB0aGlzLl9wYXRoQ21kTGluZShsYWJlbFRpY2tQYWRkaW5nUmlnaHQsIHRlbXAsXHJcbiAgICAgICAgICAgICAgICBsYWJlbFRpY2tQYWRkaW5nUmlnaHRPZmZzZXQsIHRlbXApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpID0gLTE7XHJcbiAgICB3aGlsZSAoKytpIDwgZ3JpZE51bUJvdHRvbSkge1xyXG4gICAgICAgIHRlbXAgPSBNYXRoLnJvdW5kKGNlbnRlclkgKyBncmlkU3BhY2luZ1kgKiBpKTtcclxuICAgICAgICBwYXRoQ21kR3JpZCArPSB0aGlzLl9wYXRoQ21kTGluZSgwLCB0ZW1wLCB3aWR0aCwgdGVtcCk7XHJcblxyXG4gICAgICAgIGlmICh0ZW1wIDwgbGFiZWxUaWNrT2Zmc2V0Qm90dG9tKXtcclxuICAgICAgICAgICAgcGF0aENtZEF4ZXNMYWJlbHMgKz0gdGhpcy5fcGF0aENtZExpbmUobGFiZWxUaWNrUGFkZGluZ1JpZ2h0LCB0ZW1wLFxyXG4gICAgICAgICAgICAgICAgbGFiZWxUaWNrUGFkZGluZ1JpZ2h0T2Zmc2V0LCB0ZW1wKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaSA9IC0xO1xyXG4gICAgd2hpbGUgKCsraSA8IGdyaWROdW1MZWZ0KSB7XHJcbiAgICAgICAgdGVtcCA9IE1hdGgucm91bmQoY2VudGVyWCAtIGdyaWRTcGFjaW5nWCAqIGkpO1xyXG4gICAgICAgIHBhdGhDbWRHcmlkICs9IHRoaXMuX3BhdGhDbWRMaW5lKHRlbXAsIDAsIHRlbXAsIGhlaWdodCk7XHJcblxyXG4gICAgICAgIGlmICh0ZW1wID4gbGFiZWxUaWNrU2l6ZSl7XHJcbiAgICAgICAgICAgIHBhdGhDbWRBeGVzTGFiZWxzICs9IHRoaXMuX3BhdGhDbWRMaW5lKHRlbXAsIGxhYmVsVGlja1BhZGRpbmdCb3R0b20sXHJcbiAgICAgICAgICAgICAgICB0ZW1wLCBsYWJlbFRpY2tQYWRkaW5nQm90dG9tT2Zmc2V0KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaSA9IC0xO1xyXG4gICAgd2hpbGUgKCsraSA8IGdyaWROdW1SaWdodCkge1xyXG4gICAgICAgIHRlbXAgPSBNYXRoLnJvdW5kKGNlbnRlclggKyBncmlkU3BhY2luZ1ggKiBpKTtcclxuICAgICAgICBwYXRoQ21kR3JpZCArPSB0aGlzLl9wYXRoQ21kTGluZSh0ZW1wLCAwLCB0ZW1wLCBoZWlnaHQpO1xyXG5cclxuICAgICAgICBpZiAodGVtcCA8IGxhYmVsVGlja09mZnNldFJpZ2h0KXtcclxuICAgICAgICAgICAgcGF0aENtZEF4ZXNMYWJlbHMgKz0gdGhpcy5fcGF0aENtZExpbmUodGVtcCwgbGFiZWxUaWNrUGFkZGluZ0JvdHRvbSxcclxuICAgICAgICAgICAgICAgIHRlbXAsIGxhYmVsVGlja1BhZGRpbmdCb3R0b21PZmZzZXQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB0aGlzLl9ncmlkLnNldEF0dHJpYnV0ZSgnZCcsIHBhdGhDbWRHcmlkKTtcclxuICAgIHRoaXMuX2F4ZXNMYWJlbHMuc2V0QXR0cmlidXRlKCdkJywgcGF0aENtZEF4ZXNMYWJlbHMpO1xyXG59O1xyXG5cclxuXHJcbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX3NsaWRlclhTdGVwID0gZnVuY3Rpb24gKG1vdXNlUG9zKSB7XHJcbiAgICB2YXIgbW91c2VYID0gbW91c2VQb3NbMF07XHJcblxyXG4gICAgdmFyIGhhbmRsZSA9IHRoaXMuX3NsaWRlclhIYW5kbGUsXHJcbiAgICAgICAgaGFuZGxlV2lkdGggPSBoYW5kbGUuZ2V0V2lkdGgoKSxcclxuICAgICAgICBoYW5kbGVXaWR0aEhhbGYgPSBoYW5kbGVXaWR0aCAqIDAuNTtcclxuXHJcbiAgICB2YXIgdHJhY2sgPSB0aGlzLl9zbGlkZXJYVHJhY2ssXHJcbiAgICAgICAgdHJhY2tXaWR0aCA9IHRyYWNrLmdldFdpZHRoKCksXHJcbiAgICAgICAgdHJhY2tMZWZ0ID0gdHJhY2suZ2V0UG9zaXRpb25HbG9iYWxYKCk7XHJcblxyXG4gICAgdmFyIHN0cm9rZVNpemUgPSBNZXRyaWMuU1RST0tFX1NJWkU7XHJcblxyXG4gICAgdmFyIG1heCA9IHRyYWNrV2lkdGggLSBoYW5kbGVXaWR0aEhhbGYgLSBzdHJva2VTaXplICogMjtcclxuXHJcbiAgICB2YXIgcG9zID0gTWF0aC5tYXgoaGFuZGxlV2lkdGhIYWxmLCBNYXRoLm1pbihtb3VzZVggLSB0cmFja0xlZnQsIG1heCkpLFxyXG4gICAgICAgIGhhbmRsZVBvcyA9IHBvcyAtIGhhbmRsZVdpZHRoSGFsZjtcclxuXHJcbiAgICBoYW5kbGUuc2V0UG9zaXRpb25YKGhhbmRsZVBvcyk7XHJcblxyXG4gICAgdmFyIHVuaXRzTWluID0gdGhpcy5fdW5pdHNNaW5NYXhbMF0sXHJcbiAgICAgICAgdW5pdHNNYXggPSB0aGlzLl91bml0c01pbk1heFsxXTtcclxuXHJcbiAgICB2YXIgbm9ybVZhbCA9IChwb3MgLSBoYW5kbGVXaWR0aEhhbGYpIC8gKG1heCAtIGhhbmRsZVdpZHRoSGFsZiksXHJcbiAgICAgICAgbWFwcGVkVmFsID0gdW5pdHNNaW4gKyAodW5pdHNNYXggLSB1bml0c01pbikgKiBub3JtVmFsO1xyXG5cclxuICAgIHRoaXMuX3VuaXRzWzBdID0gbWFwcGVkVmFsO1xyXG5cclxuICAgIHRoaXMuX3Bsb3RHcmFwaCgpO1xyXG59O1xyXG5cclxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fc2xpZGVyWVN0ZXAgPSBmdW5jdGlvbiAobW91c2VQb3MpIHtcclxuICAgIHZhciBtb3VzZVkgPSBtb3VzZVBvc1sxXTtcclxuXHJcbiAgICB2YXIgaGFuZGxlID0gdGhpcy5fc2xpZGVyWUhhbmRsZSxcclxuICAgICAgICBoYW5kbGVIZWlnaHQgPSBoYW5kbGUuZ2V0SGVpZ2h0KCksXHJcbiAgICAgICAgaGFuZGxlSGVpZ2h0SGFsZiA9IGhhbmRsZUhlaWdodCAqIDAuNTtcclxuXHJcbiAgICB2YXIgdHJhY2sgPSB0aGlzLl9zbGlkZXJZVHJhY2ssXHJcbiAgICAgICAgdHJhY2tIZWlnaHQgPSB0cmFjay5nZXRIZWlnaHQoKSxcclxuICAgICAgICB0cmFja1RvcCA9IHRyYWNrLmdldFBvc2l0aW9uR2xvYmFsWSgpO1xyXG5cclxuICAgIHZhciBtYXggPSB0cmFja0hlaWdodCAtIGhhbmRsZUhlaWdodEhhbGYgLSAyO1xyXG5cclxuICAgIHZhciBwb3MgPSBNYXRoLm1heChoYW5kbGVIZWlnaHRIYWxmLCBNYXRoLm1pbihtb3VzZVkgLSB0cmFja1RvcCwgbWF4KSksXHJcbiAgICAgICAgaGFuZGxlUG9zID0gcG9zIC0gaGFuZGxlSGVpZ2h0SGFsZjtcclxuXHJcbiAgICBoYW5kbGUuc2V0UG9zaXRpb25ZKGhhbmRsZVBvcyk7XHJcblxyXG4gICAgdmFyIHVuaXRzTWF4ID0gdGhpcy5fdW5pdHNNaW5NYXhbMF0sXHJcbiAgICAgICAgdW5pdHNNaW4gPSB0aGlzLl91bml0c01pbk1heFsxXTtcclxuXHJcbiAgICB2YXIgbm9ybVZhbCA9IChwb3MgLSBoYW5kbGVIZWlnaHRIYWxmKSAvIChtYXggLSBoYW5kbGVIZWlnaHRIYWxmKSxcclxuICAgICAgICBtYXBwZWRWYWwgPSB1bml0c01pbiArICh1bml0c01heCAtIHVuaXRzTWluKSAqIG5vcm1WYWw7XHJcblxyXG4gICAgdGhpcy5fdW5pdHNbMV0gPSBtYXBwZWRWYWw7XHJcblxyXG4gICAgdGhpcy5fcGxvdEdyYXBoKCk7XHJcbn07XHJcblxyXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9vblNsaWRlclhIYW5kbGVEb3duID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5fb25TbGlkZXJIYW5kbGVEb3duKHRoaXMuX3NsaWRlclhTdGVwLmJpbmQodGhpcykpO1xyXG59O1xyXG5cclxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fb25TbGlkZXJZSGFuZGxlRG93biA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuX29uU2xpZGVySGFuZGxlRG93bih0aGlzLl9zbGlkZXJZU3RlcC5iaW5kKHRoaXMpKTtcclxufTtcclxuXHJcbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX29uU2xpZGVySGFuZGxlRG93biA9IGZ1bmN0aW9uIChzbGlkZXJTdGVwRnVuYykge1xyXG4gICAgdmFyIGV2ZW50TW91c2VNb3ZlID0gRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLFxyXG4gICAgICAgIGV2ZW50TW91c2VVcCA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XHJcblxyXG4gICAgdmFyIG1vdXNlID0gTW91c2UuZ2V0KCk7XHJcblxyXG4gICAgdmFyIG9uRHJhZyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgc2xpZGVyU3RlcEZ1bmMobW91c2UuZ2V0UG9zaXRpb24oKSlcclxuICAgICAgICB9LFxyXG4gICAgICAgIG9uRHJhZ0VuZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCBmYWxzZSk7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgIHNsaWRlclN0ZXBGdW5jKG1vdXNlLmdldFBvc2l0aW9uKCkpO1xyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCBmYWxzZSk7XHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VVcCwgb25EcmFnRW5kLCBmYWxzZSk7XHJcbn07XHJcblxyXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9zbGlkZXJYSGFuZGxlVXBkYXRlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHVuaXRNaW4gPSB0aGlzLl91bml0c01pbk1heFswXSxcclxuICAgICAgICB1bml0TWF4ID0gdGhpcy5fdW5pdHNNaW5NYXhbMV0sXHJcbiAgICAgICAgdW5pdFggPSB0aGlzLl91bml0c1swXTtcclxuXHJcbiAgICB2YXIgaGFuZGxlWCA9IHRoaXMuX3NsaWRlclhIYW5kbGUsXHJcbiAgICAgICAgaGFuZGxlWFdpZHRoID0gaGFuZGxlWC5nZXRXaWR0aCgpLFxyXG4gICAgICAgIGhhbmRsZVhXaWR0aEhhbGYgPSBoYW5kbGVYV2lkdGggKiAwLjUsXHJcbiAgICAgICAgdHJhY2tYV2lkdGggPSB0aGlzLl9zbGlkZXJYVHJhY2suZ2V0V2lkdGgoKTtcclxuXHJcbiAgICB2YXIgc3Ryb2tlU2l6ZSA9IE1ldHJpYy5TVFJPS0VfU0laRTtcclxuXHJcbiAgICB2YXIgaGFuZGxlWE1pbiA9IGhhbmRsZVhXaWR0aEhhbGYsXHJcbiAgICAgICAgaGFuZGxlWE1heCA9IHRyYWNrWFdpZHRoIC0gaGFuZGxlWFdpZHRoSGFsZiAtIHN0cm9rZVNpemUgKiAyO1xyXG5cclxuICAgIGhhbmRsZVguc2V0UG9zaXRpb25YKChoYW5kbGVYTWluICsgKGhhbmRsZVhNYXggLSBoYW5kbGVYTWluKSAqICgodW5pdFggLSB1bml0TWluKSAvICh1bml0TWF4IC0gdW5pdE1pbikpKSAtIGhhbmRsZVhXaWR0aEhhbGYpO1xyXG59O1xyXG5cclxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fc2xpZGVyWUhhbmRsZVVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciB1bml0TWluID0gdGhpcy5fdW5pdHNNaW5NYXhbMF0sXHJcbiAgICAgICAgdW5pdE1heCA9IHRoaXMuX3VuaXRzTWluTWF4WzFdLFxyXG4gICAgICAgIHVuaXRZID0gdGhpcy5fdW5pdHNbMV07XHJcblxyXG4gICAgdmFyIGhhbmRsZVkgPSB0aGlzLl9zbGlkZXJZSGFuZGxlLFxyXG4gICAgICAgIGhhbmRsZVlIZWlnaHQgPSBoYW5kbGVZLmdldEhlaWdodCgpLFxyXG4gICAgICAgIGhhbmRsZVlIZWlnaHRIYWxmID0gaGFuZGxlWUhlaWdodCAqIDAuNSxcclxuICAgICAgICB0cmFja1lIZWlnaHQgPSB0aGlzLl9zbGlkZXJZVHJhY2suZ2V0SGVpZ2h0KCk7XHJcblxyXG4gICAgdmFyIHN0cm9rZVNpemUgPSBNZXRyaWMuU1RST0tFX1NJWkU7XHJcblxyXG4gICAgdmFyIGhhbmRsZVlNaW4gPSB0cmFja1lIZWlnaHQgLSBoYW5kbGVZSGVpZ2h0SGFsZiAtIHN0cm9rZVNpemUgKiAyLFxyXG4gICAgICAgIGhhbmRsZVlNYXggPSBoYW5kbGVZSGVpZ2h0SGFsZjtcclxuXHJcbiAgICBoYW5kbGVZLnNldFBvc2l0aW9uWSgoaGFuZGxlWU1pbiArIChoYW5kbGVZTWF4IC0gaGFuZGxlWU1pbikgKiAoKHVuaXRZIC0gdW5pdE1pbikgLyAodW5pdE1heCAtIHVuaXRNaW4pKSkgLSBoYW5kbGVZSGVpZ2h0SGFsZik7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEZ1bmN0aW9uUGxvdHRlcjsiLCJmdW5jdGlvbiBGdW5jdGlvblBsb3R0ZXJGdW5jdGlvbkFyZ3NFcnJvcigpe1xyXG5cdEVycm9yLmFwcGx5KHRoaXMpO1xyXG5cdEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3IpO1xyXG5cdHRoaXMubmFtZSA9ICdGdW5jdGlvblBsb3R0ZXJGdW5jdGlvbkFyZ3NFcnJvcic7XHJcblx0dGhpcy5tZXNzYWdlID0gJ0Z1bmN0aW9uIHNob3VsZCBiZSBvZiBmb3JtIGYoeCkgb3IgZih4LHkpLic7XHJcbn1cclxuRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFcnJvci5wcm90b3R5cGUpO1xyXG5GdW5jdGlvblBsb3R0ZXJGdW5jdGlvbkFyZ3NFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBGdW5jdGlvblBsb3R0ZXJGdW5jdGlvbkFyZ3NFcnJvcjtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3I7IiwiZnVuY3Rpb24gRnVuY3Rpb25QbG90dGVyT2JqZWN0RXJyb3Iob2JqZWN0LGtleSl7XHJcblx0RXJyb3IuYXBwbHkodGhpcyk7XHJcblx0RXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcyxGdW5jdGlvblBsb3R0ZXJPYmplY3RFcnJvcik7XHJcblx0dGhpcy5uYW1lID0gJ0NvbXBvbmVudE9iamVjdEVycm9yJztcclxuXHR0aGlzLm1lc3NhZ2UgPSAnT2JqZWN0ICcgKyBvYmplY3QuY29uc3RydWN0b3IubmFtZSArICcgJyArIGtleSArICdzaG91bGQgYmUgb2YgdHlwZSBGdW5jdGlvbi4nO1xyXG59XHJcbkZ1bmN0aW9uUGxvdHRlck9iamVjdEVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcclxuRnVuY3Rpb25QbG90dGVyT2JqZWN0RXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRnVuY3Rpb25QbG90dGVyT2JqZWN0RXJyb3I7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEZ1bmN0aW9uUGxvdHRlck9iamVjdEVycm9yOyIsInZhciBNZXRyaWMgPSB7XHJcblx0Q09NUE9ORU5UX01JTl9IRUlHSFQ6IDI1LFxyXG5cdFNUUk9LRV9TSVpFOiAxLFxyXG5cdFBBRERJTkdfV1JBUFBFUjogMTIsXHJcblx0UEFERElOR19PUFRJT05TOiAyLFxyXG5cdFBBRERJTkdfUFJFU0VUOiAyMCxcclxuXHJcblx0U0NST0xMQkFSX1RSQUNLX1BBRERJTkc6IDIsXHJcblx0RlVOQ1RJT05fUExPVFRFUl9MQUJFTF9USUNLX1NJWkU6IDZcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTWV0cmljOyIsInZhciBPYmplY3RDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jb3JlL09iamVjdENvbXBvbmVudCcpO1xyXG52YXIgTnVtYmVySW5wdXRfSW50ZXJuYWwgPSByZXF1aXJlKCcuL051bWJlcklucHV0X0ludGVybmFsJyk7XHJcblxyXG52YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xyXG5cclxudmFyIE9wdGlvbnMgPSByZXF1aXJlKCcuL09wdGlvbnMnKTtcclxudmFyIEJ1dHRvblByZXNldCA9IHJlcXVpcmUoJy4vQnV0dG9uUHJlc2V0Jyk7XHJcbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpLFxyXG4gICAgTWV0cmljID0gcmVxdWlyZSgnLi9NZXRyaWMnKTtcclxuXHJcbnZhciBFdmVudF8gPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXHJcbiAgICBEb2N1bWVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXHJcbiAgICBOb2RlRXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpLFxyXG4gICAgQ29tcG9uZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL0NvbXBvbmVudEV2ZW50Jyk7XHJcblxyXG52YXIgREVGQVVMVF9JTlBVVF9EUCAgICAgPSAyLFxyXG4gICAgREVGQVVMVF9JTlBVVF9TVEVQICAgPSAxLFxyXG4gICAgREVGQVVMVF9JTlBVVF9QUkVTRVQgPSBudWxsO1xyXG5cclxuXHJcblxyXG5mdW5jdGlvbiBOdW1iZXJJbnB1dChwYXJlbnQsb2JqZWN0LHZhbHVlLHBhcmFtcykge1xyXG4gICAgT2JqZWN0Q29tcG9uZW50LmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcclxuXHJcbiAgICBwYXJhbXMgICAgICAgICAgPSBwYXJhbXMgfHwge307XHJcbiAgICBwYXJhbXMub25CZWdpbiAgPSBwYXJhbXMub25CZWdpbiB8fCBudWxsO1xyXG4gICAgcGFyYW1zLm9uQ2hhbmdlID0gcGFyYW1zLm9uQ2hhbmdlIHx8IHRoaXMuX29uQ2hhbmdlO1xyXG4gICAgcGFyYW1zLm9uRmluaXNoID0gcGFyYW1zLm9uRmluaXNoIHx8IG51bGw7XHJcbiAgICBwYXJhbXMub25FcnJvciAgPSBwYXJhbXMub25FcnJvciB8fCBudWxsO1xyXG4gICAgcGFyYW1zLmRwICAgICAgID0gKHBhcmFtcy5kcCA9PT0gdW5kZWZpbmVkIHx8IHBhcmFtcy5kcCA9PSBudWxsKSA/IERFRkFVTFRfSU5QVVRfRFAgOiBwYXJhbXMuZHA7XHJcbiAgICBwYXJhbXMuc3RlcCAgICAgPSBwYXJhbXMuc3RlcCAgICAgfHwgREVGQVVMVF9JTlBVVF9TVEVQO1xyXG4gICAgcGFyYW1zLnByZXNldHMgID0gcGFyYW1zLnByZXNldHMgIHx8IERFRkFVTFRfSU5QVVRfUFJFU0VUO1xyXG5cclxuICAgIHRoaXMuX29uQmVnaW4gICAgID0gcGFyYW1zLm9uQmVnaW47XHJcbiAgICB0aGlzLl9vbkNoYW5nZSAgICA9IHBhcmFtcy5vbkNoYW5nZTtcclxuICAgIHRoaXMuX3ByZXNldHNLZXkgID0gcGFyYW1zLnByZXNldHM7XHJcblxyXG4gICAgdmFyIGlucHV0ID0gdGhpcy5faW5wdXQgPSBuZXcgTnVtYmVySW5wdXRfSW50ZXJuYWwocGFyYW1zLnN0ZXAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMuZHAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMub25CZWdpbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX29uSW5wdXRDaGFuZ2UuYmluZCh0aGlzKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5vbkZpbmlzaCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5vbkVycm9yKTtcclxuXHJcbiAgICB2YXIgd3JhcCA9IHRoaXMuX3dyYXBOb2RlO1xyXG5cclxuICAgIHZhciBwcmVzZXRzID0gIHBhcmFtcy5wcmVzZXRzO1xyXG4gICAgaWYgKCFwcmVzZXRzKSB7XHJcbiAgICAgICAgd3JhcC5hZGRDaGlsZChpbnB1dC5nZXROb2RlKCkpO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgdmFyIHdyYXBfID0gbmV3IE5vZGUoKTtcclxuICAgICAgICAgICAgd3JhcF8uc2V0U3R5bGVDbGFzcyhDU1MuV3JhcElucHV0V1ByZXNldCk7XHJcblxyXG4gICAgICAgIHdyYXAuYWRkQ2hpbGQod3JhcF8pO1xyXG4gICAgICAgIHdyYXBfLmFkZENoaWxkKGlucHV0LmdldE5vZGUoKSk7XHJcblxyXG4gICAgICAgIHZhciBvcHRpb25zICAgPSBPcHRpb25zLmdldCgpO1xyXG4gICAgICAgIHZhciBwcmVzZXRCdG4gPSB0aGlzLl9idG5QcmVzZXQgPSBuZXcgQnV0dG9uUHJlc2V0KHRoaXMuX3dyYXBOb2RlKTtcclxuXHJcbiAgICAgICAgdmFyIG9uUHJlc2V0RGVhY3RpdmF0ZSA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgIG9wdGlvbnMuY2xlYXIoKTtcclxuICAgICAgICAgICAgcHJlc2V0QnRuLmRlYWN0aXZhdGUoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgdmFyIG9uUHJlc2V0QWN0aXZhdGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIG9wdGlvbnMuYnVpbGQocHJlc2V0cywgaW5wdXQuZ2V0VmFsdWUoKSwgaW5wdXQuZ2V0Tm9kZSgpLFxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlucHV0LnNldFZhbHVlKHByZXNldHNbb3B0aW9ucy5nZXRTZWxlY3RlZEluZGV4KCldKTtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLmFwcGx5VmFsdWUoKTtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLl9vbkNoYW5nZShzZWxmLl9vYmpbc2VsZi5fa2V5XSk7XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgb25QcmVzZXREZWFjdGl2YXRlLCBNZXRyaWMuUEFERElOR19QUkVTRVQsXHJcbiAgICAgICAgICAgICAgICBmYWxzZSk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBwcmVzZXRCdG4uc2V0T25BY3RpdmUob25QcmVzZXRBY3RpdmF0ZSk7XHJcbiAgICAgICAgcHJlc2V0QnRuLnNldE9uRGVhY3RpdmUob25QcmVzZXREZWFjdGl2YXRlKVxyXG4gICAgfVxyXG5cclxuICAgIGlucHV0LmdldE5vZGUoKS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLCAgIHRoaXMuX29uSW5wdXREcmFnU3RhcnQuYmluZCh0aGlzKSk7XHJcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoQ29tcG9uZW50RXZlbnQuSU5QVVRfU0VMRUNUX0RSQUcsdGhpcy5fcGFyZW50LCdvbkNvbXBvbmVudFNlbGVjdERyYWcnKTtcclxuXHJcbiAgICBpbnB1dC5zZXRWYWx1ZSh0aGlzLl9vYmpbdGhpcy5fa2V5XSk7XHJcbn1cclxuTnVtYmVySW5wdXQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShPYmplY3RDb21wb25lbnQucHJvdG90eXBlKTtcclxuTnVtYmVySW5wdXQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gTnVtYmVySW5wdXQ7XHJcblxyXG5OdW1iZXJJbnB1dC5wcm90b3R5cGUuX29uSW5wdXRDaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLmFwcGx5VmFsdWUoKTtcclxuICAgIHRoaXMuX29uQ2hhbmdlKHRoaXMuX29ialt0aGlzLl9rZXldKTtcclxufTtcclxuXHJcbk51bWJlcklucHV0LnByb3RvdHlwZS5hcHBseVZhbHVlID0gZnVuY3Rpb24oKSB7XHJcbiAgICB0aGlzLnB1c2hIaXN0b3J5U3RhdGUoKTtcclxuICAgIHRoaXMuX29ialt0aGlzLl9rZXldID0gdGhpcy5faW5wdXQuZ2V0VmFsdWUoKTtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCxudWxsKSk7XHJcbn07XHJcblxyXG5OdW1iZXJJbnB1dC5wcm90b3R5cGUub25WYWx1ZVVwZGF0ZSA9IGZ1bmN0aW9uIChlKSB7XHJcbiAgICBpZiAoZS5kYXRhLm9yaWdpbiA9PSB0aGlzKXtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB0aGlzLl9pbnB1dC5zZXRWYWx1ZSh0aGlzLl9vYmpbdGhpcy5fa2V5XSk7XHJcbn07XHJcblxyXG4vL1ByZXZlbnQgY2hyb21lIHNlbGVjdCBkcmFnXHJcbk51bWJlcklucHV0LnByb3RvdHlwZS5fb25JbnB1dERyYWdTdGFydCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBldmVudE1vdmUgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsXHJcbiAgICAgICAgZXZlbnRVcCA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XHJcblxyXG4gICAgdmFyIGV2ZW50ID0gQ29tcG9uZW50RXZlbnQuSU5QVVRfU0VMRUNUX0RSQUc7XHJcblxyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICAgIHZhciBvbkRyYWcgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHNlbGYuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIGV2ZW50LCBudWxsKSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBvbkRyYWdGaW5pc2ggPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHNlbGYuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIGV2ZW50LCBudWxsKSk7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcclxuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdmUsIG9uRHJhZ0ZpbmlzaCwgZmFsc2UpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgZXZlbnQsIG51bGwpKTtcclxuXHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnLCBmYWxzZSk7XHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50VXAsIG9uRHJhZ0ZpbmlzaCwgZmFsc2UpO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBOdW1iZXJJbnB1dDsiLCJ2YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudERpc3BhdGNoZXInKSxcclxuICAgIE5vZGVFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50Jyk7XHJcbnZhciBOb2RlICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcclxuXHJcbnZhciBQUkVTRVRfU0hJRlRfTVVMVElQTElFUiAgPSAxMDtcclxudmFyIE5VTV9SRUdFWCA9IC9eLT9cXGQqXFwuP1xcZCokLztcclxuXHJcbnZhciBzZXRDYXJldFBvcyA9IG51bGwsXHJcbiAgICBzZWxlY3RBbGwgPSBudWxsO1xyXG5cclxuZnVuY3Rpb24gaW5wdXRTZXRWYWx1ZShpbnB1dCx2YWx1ZSl7XHJcbiAgICBpbnB1dC5zZXRQcm9wZXJ0eSgndmFsdWUnLHZhbHVlKTtcclxuICAgIGlucHV0LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdpbnB1dCcpKTtcclxufVxyXG5cclxuTnVtYmVySW5wdXRfSW50ZXJuYWwgPSBmdW5jdGlvbiAoc3RlcFZhbHVlLCBkcCwgb25CZWdpbiwgb25DaGFuZ2UsIG9uRmluaXNoLCBvbkVycm9yKSB7XHJcbiAgICBFdmVudERpc3BhdGNoZXIuYXBwbHkodGhpcywgbnVsbCk7XHJcblxyXG4gICAgdGhpcy5fdmFsdWUgPSAwO1xyXG4gICAgdGhpcy5fdmFsdWVTdGVwID0gc3RlcFZhbHVlO1xyXG4gICAgdGhpcy5fdmFsdWVEcCAgID0gZHA7XHJcblxyXG4gICAgdGhpcy5fb25CZWdpbiA9IG9uQmVnaW4gfHwgZnVuY3Rpb24gKCl7fTtcclxuICAgIHRoaXMuX29uQ2hhbmdlID0gb25DaGFuZ2UgfHwgZnVuY3Rpb24gKCkge307XHJcbiAgICB0aGlzLl9vbkZpbmlzaCA9IG9uRmluaXNoIHx8IGZ1bmN0aW9uKCkge307XHJcbiAgICB0aGlzLl9vbkVycm9yID0gb25FcnJvciB8fCBmdW5jdGlvbigpIHt9O1xyXG5cclxuICAgIHRoaXMuX2tleUNvZGUgPSBudWxsO1xyXG4gICAgdGhpcy5fY2FyZXRPZmZzZXQgPSAwO1xyXG5cclxuICAgIHZhciBpbnB1dCA9IHRoaXMuX2lucHV0ID0gbmV3IE5vZGUoJ3RleHQnKTtcclxuICAgICAgICBpbnB1dC5zZXRQcm9wZXJ0eSgndmFsdWUnLCB0aGlzLl92YWx1ZSk7XHJcblxyXG4gICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLHRoaXMuX29uSW5wdXQuYmluZCh0aGlzKSk7XHJcbiAgICBpbnB1dC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJyx0aGlzLl9vbktleWRvd24uYmluZCh0aGlzKSk7XHJcblxyXG4gICAgaWYoIXNldENhcmV0UG9zKXtcclxuICAgICAgICBpZihpbnB1dC5nZXRFbGVtZW50KCkuc2V0U2VsZWN0aW9uUmFuZ2Upe1xyXG4gICAgICAgICAgICBzZXRDYXJldFBvcyA9IGZ1bmN0aW9uKGlucHV0LHBvcyl7XHJcbiAgICAgICAgICAgICAgICBpbnB1dC5nZXRFbGVtZW50KCkuc2V0U2VsZWN0aW9uUmFuZ2UocG9zLHBvcyk7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHNlbGVjdEFsbCA9IGZ1bmN0aW9uKGlucHV0KXtcclxuICAgICAgICAgICAgICAgIGlucHV0LmdldEVsZW1lbnQoKS5zZXRTZWxlY3Rpb25SYW5nZSgwLGlucHV0LmdldFByb3BlcnR5KCd2YWx1ZScpLmxlbmd0aCk7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc2V0Q2FyZXRQb3MgPSBmdW5jdGlvbihpbnB1dCxwb3Mpe1xyXG4gICAgICAgICAgICAgICAgdmFyIHJhbmdlID0gaW5wdXQuZ2V0RWxlbWVudCgpLmNyZWF0ZVRleHRSYW5nZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJhbmdlLmNvbGxhcHNlKHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJhbmdlLm1vdmVFbmQoJ2NoYXJhY3RlcicscG9zKTtcclxuICAgICAgICAgICAgICAgICAgICByYW5nZS5tb3ZlU3RhcnQoJ2NoYXJhY3RlcicscG9zKTtcclxuICAgICAgICAgICAgICAgICAgICByYW5nZS5zZWxlY3QoKTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgc2VsZWN0QWxsID0gZnVuY3Rpb24oaW5wdXQpe1xyXG4gICAgICAgICAgICAgICAgdmFyIHJhbmdlID0gaW5wdXQuZ2V0RWxlbWVudCgpLmNyZWF0ZVRleHRSYW5nZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJhbmdlLmNvbGxhcHNlKHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJhbmdlLm1vdmVTdGFydCgnY2hhcmFjdGVyJywwKTtcclxuICAgICAgICAgICAgICAgICAgICByYW5nZS5tb3ZlRW5kKCdjaGFyYWN0ZXInLGlucHV0LmdldFByb3BlcnR5KCd2YWx1ZScpLmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2Uuc2VsZWN0KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn07XHJcbk51bWJlcklucHV0X0ludGVybmFsLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZSk7XHJcbk51bWJlcklucHV0X0ludGVybmFsLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IE51bWJlcklucHV0X0ludGVybmFsO1xyXG5cclxuTnVtYmVySW5wdXRfSW50ZXJuYWwucHJvdG90eXBlLl9zZXRWYWx1ZSA9IGZ1bmN0aW9uKHZhbHVlKXtcclxuICAgIHZhciBwcmVmaXggPSAgKCh2YWx1ZSA9ICt2YWx1ZSkgfHwgMSAvIHZhbHVlKSA8IDAgJiYgdmFsdWUgPT0gMCA/ICctJyA6ICcnOyAvLy0wXHJcbiAgICAgICAgdmFsdWUgPSBOdW1iZXIodmFsdWUpLnRvRml4ZWQodGhpcy5fdmFsdWVEcCk7XHJcbiAgICB0aGlzLl9pbnB1dC5zZXRQcm9wZXJ0eSgndmFsdWUnLHByZWZpeCArIHZhbHVlKTtcclxuICAgIHRoaXMuX3ZhbHVlID0gTnVtYmVyKHZhbHVlKTtcclxufTtcclxuXHJcbk51bWJlcklucHV0X0ludGVybmFsLnByb3RvdHlwZS5fb25JbnB1dCA9IGZ1bmN0aW9uKCl7XHJcbiAgICB2YXIgaW5wdXQgPSB0aGlzLl9pbnB1dCxcclxuICAgICAgICB2YWx1ZSA9IGlucHV0LmdldFByb3BlcnR5KCd2YWx1ZScpLFxyXG4gICAgICAgIHN0YXJ0ID0gaW5wdXQuZ2V0UHJvcGVydHkoJ3NlbGVjdGlvblN0YXJ0JyksXHJcbiAgICAgICAgZHAgICAgPSB0aGlzLl92YWx1ZURwO1xyXG5cclxuICAgIHZhciBmaXJzdCA9IHZhbHVlWzBdO1xyXG5cclxuICAgIGlmKHZhbHVlID09ICcnKXtcclxuICAgICAgICB2YWx1ZSA9IDA7XHJcbiAgICB9IGVsc2UgaWYoZmlyc3QgPT09ICcuJyl7XHJcbiAgICAgICAgdmFsdWUgPSAnMCcgKyB2YWx1ZTtcclxuICAgIH1cclxuXHJcbiAgICBpZighTlVNX1JFR0VYLnRlc3QodmFsdWUpIHx8IHZhbHVlID09ICctJyl7XHJcbiAgICAgICAgaW5wdXQuc2V0UHJvcGVydHkoJ3ZhbHVlJyx0aGlzLl92YWx1ZS50b0ZpeGVkKGRwKSk7XHJcbiAgICAgICAgc2V0Q2FyZXRQb3MoaW5wdXQsTWF0aC5tYXgoLS1zdGFydCwwKSk7XHJcbiAgICAgICAgdGhpcy5fb25FcnJvcih0aGlzLl9rZXlDb2RlKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB0aGlzLl9vbkJlZ2luKHRoaXMuX3ZhbHVlKTtcclxuICAgIHRoaXMuX3NldFZhbHVlKHZhbHVlKTtcclxuICAgIHNldENhcmV0UG9zKGlucHV0LHN0YXJ0IC0gdGhpcy5fY2FyZXRPZmZzZXQpO1xyXG4gICAgdGhpcy5fb25DaGFuZ2UoKTtcclxufTtcclxuXHJcbk51bWJlcklucHV0X0ludGVybmFsLnByb3RvdHlwZS5fb25LZXlkb3duID0gZnVuY3Rpb24oZSl7XHJcbiAgICB2YXIga2V5Q29kZSA9IHRoaXMuX2tleUNvZGUgPSBlLmtleUNvZGU7XHJcblxyXG4gICAgaWYoa2V5Q29kZSA9PSAxMyl7XHJcbiAgICAgICAgdGhpcy5fb25GaW5pc2goKTtcclxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBpbnB1dCAgPSB0aGlzLl9pbnB1dCxcclxuICAgICAgICB2YWx1ZSAgPSBpbnB1dC5nZXRQcm9wZXJ0eSgndmFsdWUnKTtcclxuICAgIHZhciBzdGFydCAgPSBpbnB1dC5nZXRQcm9wZXJ0eSgnc2VsZWN0aW9uU3RhcnQnKSxcclxuICAgICAgICBlbmQgICAgPSBpbnB1dC5nZXRQcm9wZXJ0eSgnc2VsZWN0aW9uRW5kJyk7XHJcbiAgICB2YXIgbGVuZ3RoID0gdmFsdWUubGVuZ3RoO1xyXG5cclxuICAgIHZhciBpc0JhY2tzcGFjZURlbGV0ZSA9IGtleUNvZGUgPT0gOCB8fCBrZXlDb2RlID09IDQ1LFxyXG4gICAgICAgIGlzTWV0YUtleSA9IGUubWV0YUtleSxcclxuICAgICAgICBpc0N0cmxLZXkgPSBlLmN0cmxLZXksXHJcbiAgICAgICAgaXNMZWZ0ID0ga2V5Q29kZSA9PSAzNyxcclxuICAgICAgICBpc1JpZ2h0ID0ga2V5Q29kZSA9PSAzOSxcclxuICAgICAgICBpc0xlZnRSaWdodCA9IGlzTGVmdCB8fCBpc1JpZ2h0LFxyXG4gICAgICAgIGlzU2hpZnQgPSBlLnNoaWZ0S2V5LFxyXG4gICAgICAgIGlzVXBEb3duID0ga2V5Q29kZSA9PSAzOCB8fCBrZXlDb2RlID09IDQwLFxyXG4gICAgICAgIGlzU2VsZWN0QWxsID0gKGlzTWV0YUtleSB8fCBpc0N0cmxLZXkpICYmIGtleUNvZGUgPT0gNjUsXHJcbiAgICAgICAgaXNSYW5nZVNlbGVjdGVkID0gc3RhcnQgIT0gZW5kLFxyXG4gICAgICAgIGlzQWxsU2VsZWN0ZWQgPSBzdGFydCA9PSAwICYmIGVuZCA9PSBsZW5ndGgsXHJcbiAgICAgICAgaXNNaW51cyA9IGtleUNvZGUgPT0gMTg5O1xyXG5cclxuICAgIHZhciBpbmRleERlY2ltYWxNYXJrID0gdmFsdWUuaW5kZXhPZignLicpO1xyXG5cclxuICAgIHRoaXMuX2NhcmV0T2Zmc2V0ID0gMDtcclxuXHJcbiAgICAvL3ByZXZlbnQgY21kLXogfHwgY3RybC16XHJcbiAgICBpZigoaXNNZXRhS2V5IHx8IGlzQ3RybEtleSkgJiYga2V5Q29kZSA9PSA5MCl7XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIC8vc2VsZWN0IGFsbCBjbWQrYSB8fCBjdHJsK2FcclxuICAgIGlmKGlzU2VsZWN0QWxsKXtcclxuICAgICAgICBzZWxlY3RBbGwoaW5wdXQpO1xyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICAvL2V2ZXJ5dGhpbmcgaXMgc2VsZWN0ZWRcclxuICAgIGlmKGlzQWxsU2VsZWN0ZWQpIHtcclxuICAgICAgICBpZiAoaXNNaW51cykge1xyXG4gICAgICAgICAgICAvL3NldCBuZWdhdGl2ZSB6ZXJvLCBhcyBzdGFydGluZyBwb2ludCBmb3IgbmVnYXRpdmUgbnVtYmVyXHJcbiAgICAgICAgICAgIGlucHV0U2V0VmFsdWUoaW5wdXQsICctMCcpO1xyXG4gICAgICAgICAgICAvL3NldCBjYXJldCBhZnRlciAgJy0nXHJcbiAgICAgICAgICAgIHNldENhcmV0UG9zKGlucHV0LCAxKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvL2RlbGV0ZSBudW1iZXIgLyByZXBsYWNlIC8gaWdub3JlXHJcbiAgICAgICAgICAgIGlucHV0U2V0VmFsdWUoaW5wdXQsIGlzQmFja3NwYWNlRGVsZXRlID8gMCA6IFN0cmluZy5mcm9tQ2hhckNvZGUoa2V5Q29kZSkpO1xyXG4gICAgICAgICAgICAvL2p1bXAgdG8gc3RhcnQgPC0tPiBlbmRcclxuICAgICAgICAgICAgc2V0Q2FyZXRQb3MoaW5wdXQsIGlzTGVmdCA/IHN0YXJ0IDogZW5kKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIC8vanVtcCBvdmVyIGRlY2ltYWwgbWFya1xyXG4gICAgaWYoaXNCYWNrc3BhY2VEZWxldGUgJiYgKHN0YXJ0LTEgPT0gaW5kZXhEZWNpbWFsTWFyaykpe1xyXG4gICAgICAgIHNldENhcmV0UG9zKGlucHV0LHN0YXJ0LTEpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIC8vIDB8LiBlbnRlciBmaXJzdCBkcCB3aXRob3V0IGp1bXBpbmcgb3ZlciBkZWNpbWFsIG1hcmtcclxuICAgIGlmKCFpc0xlZnRSaWdodCAmJiAodmFsdWVbMF0gPT0gJzAnICYmIHN0YXJ0ID09IDEpKXtcclxuICAgICAgICBzZXRDYXJldFBvcyhpbnB1dCwxKTtcclxuICAgICAgICB0aGlzLl9jYXJldE9mZnNldCA9IDE7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgLy9pbmNyZWFzZSAvIGRlY3JlYXNlIG51bWJlciBieSAoc3RlcCB1cCAvIGRvd24pICogbXVsdGlwbGllciBvbiBzaGlmdCBkb3duXHJcbiAgICBpZihpc1VwRG93bil7XHJcbiAgICAgICAgdmFyIHN0ZXAgPSAoaXNTaGlmdCA/IFBSRVNFVF9TSElGVF9NVUxUSVBMSUVSIDogMSkgKiB0aGlzLl92YWx1ZVN0ZXAsXHJcbiAgICAgICAgICAgIG11bHQgPSBrZXlDb2RlID09IDM4ID8gMS4wIDogLTEuMDtcclxuICAgICAgICBpbnB1dFNldFZhbHVlKGlucHV0LE51bWJlcih2YWx1ZSkgKyAoc3RlcCAqIG11bHQpKTtcclxuICAgICAgICBzZXRDYXJldFBvcyhpbnB1dCxzdGFydCk7XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIC8vcmFuZ2Ugc2VsZWN0ZWQsIG5vdCBpbiBzZWxlY3Rpb24gcHJvY2Vzc1xyXG4gICAgaWYoaXNSYW5nZVNlbGVjdGVkICYmICEoaXNTaGlmdCAmJiBpc0xlZnRSaWdodCkpe1xyXG4gICAgICAgIC8vanVtcCB0byBzdGFydCA8LS0+IGVuZFxyXG4gICAgICAgIGlmKGlzTGVmdFJpZ2h0KXtcclxuICAgICAgICAgICAgc2V0Q2FyZXRQb3MoaW5wdXQsaXNMZWZ0ID8gc3RhcnQgOiBlbmQpO1xyXG4gICAgICAgIH0gZWxzZSB7IC8vcmVwbGFjZSBjb21wbGV0ZSByYW5nZSwgbm90IGp1c3QgcGFydHNcclxuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS5zdWJzdHIoMCxzdGFydCkgKyBTdHJpbmcuZnJvbUNoYXJDb2RlKGtleUNvZGUpICsgdmFsdWUuc3Vic3RyKGVuZCxsZW5ndGgtZW5kKTtcclxuICAgICAgICAgICAgaW5wdXRTZXRWYWx1ZShpbnB1dCx2YWx1ZSk7XHJcbiAgICAgICAgICAgIHNldENhcmV0UG9zKGlucHV0LGVuZCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICAvL2NhcmV0IHdpdGhpbiBmcmFjdGlvbmFsIHBhcnQsIG5vdCBtb3ZpbmcgY2FyZXQsIHNlbGVjdGluZywgZGVsZXRpbmdcclxuICAgIGlmKCFpc1NoaWZ0ICYmICFpc0xlZnRSaWdodCAmJiAhaXNCYWNrc3BhY2VEZWxldGUgJiYgKHN0YXJ0ID4gaW5kZXhEZWNpbWFsTWFyayAmJiBzdGFydCA8IGxlbmd0aCkpe1xyXG4gICAgICAgIHZhbHVlID0gdmFsdWUuc3Vic3RyKDAsc3RhcnQpICsgU3RyaW5nLmZyb21DaGFyQ29kZShrZXlDb2RlKSArIHZhbHVlLnN1YnN0cihzdGFydCsxLGxlbmd0aC0xKTtcclxuICAgICAgICBpbnB1dFNldFZhbHVlKGlucHV0LHZhbHVlKTtcclxuICAgICAgICBzZXRDYXJldFBvcyhpbnB1dCxNYXRoLm1pbihzdGFydCsxLGxlbmd0aC0xKSk7XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIC8vY2FyZXQgYXQgZW5kIG9mIG51bWJlciwgZG8gbm90aGluZ1xyXG4gICAgaWYoIWlzQmFja3NwYWNlRGVsZXRlICYmICFpc0xlZnRSaWdodCAmJiAhaXNVcERvd24gJiYgc3RhcnQgPj0gbGVuZ3RoKXtcclxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5OdW1iZXJJbnB1dF9JbnRlcm5hbC5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fdmFsdWU7XHJcbn07XHJcblxyXG5OdW1iZXJJbnB1dF9JbnRlcm5hbC5wcm90b3R5cGUuc2V0VmFsdWUgPSBmdW5jdGlvbiAobikge1xyXG4gICAgdGhpcy5fc2V0VmFsdWUobik7XHJcbn07XHJcblxyXG5OdW1iZXJJbnB1dF9JbnRlcm5hbC5wcm90b3R5cGUuZ2V0Tm9kZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLl9pbnB1dDtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTnVtYmVySW5wdXRfSW50ZXJuYWw7XHJcbiIsInZhciBPdXRwdXQgPSByZXF1aXJlKCcuL091dHB1dCcpO1xyXG5cclxudmFyIERFRkFVTFRfT1VUUFVUX0RQID0gMjtcclxuXHJcbmZ1bmN0aW9uIE51bWJlck91dHB1dChwYXJlbnQsIG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xyXG5cdHBhcmFtcyA9IHBhcmFtcyB8fCB7fTtcclxuXHRwYXJhbXMuZHAgPSBwYXJhbXMuZHAgfHwgREVGQVVMVF9PVVRQVVRfRFA7XHJcblxyXG5cdE91dHB1dC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG5cdHRoaXMuX3ZhbHVlRHAgPSBwYXJhbXMuZHAgKyAxO1xyXG59XHJcbk51bWJlck91dHB1dC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE91dHB1dC5wcm90b3R5cGUpO1xyXG5OdW1iZXJPdXRwdXQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gTnVtYmVyT3V0cHV0O1xyXG5cclxuLy9GSVhNRVxyXG5OdW1iZXJPdXRwdXQucHJvdG90eXBlLl9zZXRWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcclxuXHRpZiAodGhpcy5fcGFyZW50LmlzRGlzYWJsZWQoKSl7XHJcblx0XHRyZXR1cm47XHJcblx0fVxyXG5cclxuXHR2YXIgdmFsdWUgPSB0aGlzLl9vYmpbdGhpcy5fa2V5XSxcclxuXHRcdHRleHRBcmVhID0gdGhpcy5fdGV4dEFyZWEsXHJcblx0XHRkcCA9IHRoaXMuX3ZhbHVlRHA7XHJcblxyXG5cdHZhciBpbmRleCxcclxuXHRcdG91dDtcclxuXHJcblx0aWYgKHR5cGVvZih2YWx1ZSkgPT09ICdvYmplY3QnICYmXHJcblx0XHR0eXBlb2YodmFsdWUubGVuZ3RoKSA9PT0gJ251bWJlcicgJiZcclxuXHRcdHR5cGVvZih2YWx1ZS5zcGxpY2UpID09PSAnZnVuY3Rpb24nICYmXHJcblx0XHQhdmFsdWUucHJvcGVydHlJc0VudW1lcmFibGUoJ2xlbmd0aCcpKSB7XHJcblxyXG5cdFx0b3V0ID0gdmFsdWUuc2xpY2UoKTtcclxuXHJcblx0XHR2YXIgaSA9IC0xO1xyXG5cdFx0dmFyIHRlbXA7XHJcblx0XHR2YXIgd3JhcCA9IHRoaXMuX3dyYXA7XHJcblxyXG5cdFx0d2hpbGUgKCsraSA8IG91dC5sZW5ndGgpIHtcclxuXHRcdFx0dGVtcCA9IG91dFtpXSA9IG91dFtpXS50b1N0cmluZygpO1xyXG5cdFx0XHRpbmRleCA9IHRlbXAuaW5kZXhPZignLicpO1xyXG5cdFx0XHRpZiAoaW5kZXggPiAwKXtcclxuXHRcdFx0XHRvdXRbaV0gPSB0ZW1wLnNsaWNlKDAsIGluZGV4ICsgZHApO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKHdyYXApIHtcclxuXHRcdFx0dGV4dEFyZWEuc2V0U3R5bGVQcm9wZXJ0eSgnd2hpdGUtc3BhY2UnLCAnbm93cmFwJyk7XHJcblx0XHRcdG91dCA9IG91dC5qb2luKCdcXG4nKTtcclxuXHRcdH1cclxuXHJcblx0XHR0ZXh0QXJlYS5zZXRQcm9wZXJ0eSgndmFsdWUnLCBvdXQpO1xyXG5cdH1lbHNlIHtcclxuXHRcdG91dCA9IHZhbHVlLnRvU3RyaW5nKCk7XHJcblx0XHRpbmRleCA9IG91dC5pbmRleE9mKCcuJyk7XHJcblx0XHR0ZXh0QXJlYS5zZXRQcm9wZXJ0eSgndmFsdWUnLCBpbmRleCA+IDAgPyBvdXQuc2xpY2UoMCwgaW5kZXggKyBkcCkgOiBvdXQpO1xyXG5cdH1cclxuXHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE51bWJlck91dHB1dDsiLCJ2YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xyXG52YXIgRG9jdW1lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxyXG4gICAgTm9kZUV2ZW50ICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50Jyk7XHJcbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xyXG52YXIgQ29sb3JNb2RlID0gcmVxdWlyZSgnLi4vY29yZS9jb2xvci9Db2xvck1vZGUnKTtcclxudmFyIENvbG9yVXRpbCA9IHJlcXVpcmUoJy4uL2NvcmUvY29sb3IvQ29sb3JVdGlsJyk7XHJcbnZhciBNZXRyaWMgPSByZXF1aXJlKCcuL01ldHJpYycpO1xyXG5cclxuZnVuY3Rpb24gT3B0aW9ucyhwYXJlbnROb2RlKSB7XHJcbiAgICB0aGlzLl9wYXJlbk5vZGUgPSBwYXJlbnROb2RlO1xyXG5cclxuICAgIHZhciBub2RlID0gdGhpcy5fbm9kZSA9IG5ldyBOb2RlKCk7XHJcbiAgICB2YXIgbGlzdE5vZGUgPSB0aGlzLl9saXN0Tm9kZSA9IG5ldyBOb2RlKE5vZGUuTElTVCk7XHJcblxyXG4gICAgbm9kZS5zZXRTdHlsZUNsYXNzKENTUy5PcHRpb25zKTtcclxuICAgIG5vZGUuYWRkQ2hpbGQobGlzdE5vZGUpO1xyXG5cclxuICAgIHRoaXMuX3NlbGVjdGVkSW5kZXggPSBudWxsO1xyXG4gICAgdGhpcy5fY2FsbGJhY2tPdXQgPSBmdW5jdGlvbiAoKSB7IH07XHJcblxyXG4gICAgdGhpcy5fdW5mb2N1c2FibGUgPSBmYWxzZTtcclxuXHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25Eb2N1bWVudE1vdXNlRG93bi5iaW5kKHRoaXMpKTtcclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9VUCwgdGhpcy5fb25Eb2N1bWVudE1vdXNlVXAuYmluZCh0aGlzKSk7XHJcblxyXG4gICAgdGhpcy5jbGVhcigpO1xyXG59XHJcblxyXG5PcHRpb25zLnByb3RvdHlwZSA9IHtcclxuICAgIF9vbkRvY3VtZW50TW91c2VEb3duOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLl91bmZvY3VzYWJsZSlyZXR1cm47XHJcbiAgICAgICAgdGhpcy5fY2FsbGJhY2tPdXQoKTtcclxuICAgIH0sXHJcblxyXG4gICAgX29uRG9jdW1lbnRNb3VzZVVwOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5fdW5mb2N1c2FibGUgPSB0cnVlO1xyXG4gICAgfSxcclxuXHJcbiAgICBidWlsZDogZnVuY3Rpb24gKGVudHJpZXMsIHNlbGVjdGVkLCBlbGVtZW50LCBjYWxsYmFja1NlbGVjdCwgY2FsbGJhY2tPdXQsIHBhZGRpbmdSaWdodCwgYXJlQ29sb3JzLCBjb2xvck1vZGUpIHtcclxuICAgICAgICB0aGlzLl9jbGVhckxpc3QoKTtcclxuXHJcbiAgICAgICAgdGhpcy5fcGFyZW5Ob2RlLmFkZENoaWxkKHRoaXMuZ2V0Tm9kZSgpKTtcclxuXHJcbiAgICAgICAgdmFyIHJvb3ROb2RlID0gdGhpcy5fbm9kZSxcclxuICAgICAgICAgICAgbGlzdE5vZGUgPSB0aGlzLl9saXN0Tm9kZTtcclxuXHJcbiAgICAgICAgcGFkZGluZ1JpZ2h0ID0gcGFkZGluZ1JpZ2h0IHx8IDA7XHJcblxyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgICAgICAgLy8gYnVpbGQgbGlzdFxyXG4gICAgICAgIHZhciBpdGVtTm9kZSwgZW50cnk7XHJcbiAgICAgICAgdmFyIGkgPSAtMTtcclxuXHJcbiAgICAgICAgaWYgKGFyZUNvbG9ycykge1xyXG4gICAgICAgICAgICBjb2xvck1vZGUgPSBjb2xvck1vZGUgfHwgQ29sb3JNb2RlLkhFWDtcclxuXHJcbiAgICAgICAgICAgIGxpc3ROb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkNvbG9yKTtcclxuXHJcbiAgICAgICAgICAgIHZhciBjb2xvciwgbm9kZUNvbG9yO1xyXG5cclxuICAgICAgICAgICAgd2hpbGUgKCsraSA8IGVudHJpZXMubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICBlbnRyeSA9IGVudHJpZXNbaV07XHJcbiAgICAgICAgICAgICAgICBpdGVtTm9kZSA9IGxpc3ROb2RlLmFkZENoaWxkKG5ldyBOb2RlKE5vZGUuTElTVF9JVEVNKSk7XHJcbiAgICAgICAgICAgICAgICBjb2xvciA9IGl0ZW1Ob2RlLmFkZENoaWxkKG5ldyBOb2RlKCkpO1xyXG5cclxuICAgICAgICAgICAgICAgIHN3aXRjaCAoY29sb3JNb2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBDb2xvck1vZGUuSEVYOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlQ29sb3IgPSBlbnRyeTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBDb2xvck1vZGUuUkdCOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlQ29sb3IgPSBDb2xvclV0aWwuUkdCMkhFWChlbnRyeVswXSwgZW50cnlbMV0sIGVudHJ5WzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBDb2xvck1vZGUuUkdCZnY6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVDb2xvciA9IENvbG9yVXRpbC5SR0JmdjJIRVgoZW50cnlbMF0sIGVudHJ5WzFdLCBlbnRyeVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgQ29sb3JNb2RlLkhTVjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZUNvbG9yID0gQ29sb3JVdGlsLkhTVjJSR0IoZW50cnlbMF0sIGVudHJ5WzFdLCBlbnRyeVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGNvbG9yLmdldFN0eWxlKCkuYmFja2dyb3VuZENvbG9yID0gbm9kZUNvbG9yO1xyXG4gICAgICAgICAgICAgICAgY29sb3IuZ2V0U3R5bGUoKS5iYWNrZ3JvdW5kSW1hZ2UgPSAnbGluZWFyLWdyYWRpZW50KCByZ2JhKDAsMCwwLDApIDAlLCByZ2JhKDAsMCwwLDAuMSkgMTAwJSknO1xyXG4gICAgICAgICAgICAgICAgY29sb3Iuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsIGVudHJ5KTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoZW50cnkgPT0gc2VsZWN0ZWQpaXRlbU5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuT3B0aW9uc1NlbGVjdGVkKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpdGVtTm9kZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLFxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fc2VsZWN0ZWRJbmRleCA9IEFycmF5LnByb3RvdHlwZS5pbmRleE9mLmNhbGwodGhpcy5wYXJlbnROb2RlLmNoaWxkcmVuLCB0aGlzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2tTZWxlY3QoKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGxpc3ROb2RlLmRlbGV0ZVN0eWxlQ2xhc3MoKTtcclxuXHJcbiAgICAgICAgICAgIHdoaWxlICgrK2kgPCBlbnRyaWVzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgZW50cnkgPSBlbnRyaWVzW2ldO1xyXG5cclxuICAgICAgICAgICAgICAgIGl0ZW1Ob2RlID0gbGlzdE5vZGUuYWRkQ2hpbGQobmV3IE5vZGUoTm9kZS5MSVNUX0lURU0pKTtcclxuICAgICAgICAgICAgICAgIGl0ZW1Ob2RlLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCBlbnRyeSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoZW50cnkgPT0gc2VsZWN0ZWQpaXRlbU5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuT3B0aW9uc1NlbGVjdGVkKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpdGVtTm9kZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLFxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fc2VsZWN0ZWRJbmRleCA9IEFycmF5LnByb3RvdHlwZS5pbmRleE9mLmNhbGwodGhpcy5wYXJlbnROb2RlLmNoaWxkcmVuLCB0aGlzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2tTZWxlY3QoKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy9wb3NpdGlvbiwgc2V0IHdpZHRoIGFuZCBlbmFibGVcclxuXHJcbiAgICAgICAgdmFyIGVsZW1lbnRQb3MgPSBlbGVtZW50LmdldFBvc2l0aW9uR2xvYmFsKCksXHJcbiAgICAgICAgICAgIGVsZW1lbnRXaWR0aCA9IGVsZW1lbnQuZ2V0V2lkdGgoKSAtIHBhZGRpbmdSaWdodCxcclxuICAgICAgICAgICAgZWxlbWVudEhlaWdodCA9IGVsZW1lbnQuZ2V0SGVpZ2h0KCk7XHJcblxyXG4gICAgICAgIHZhciBsaXN0V2lkdGggPSBsaXN0Tm9kZS5nZXRXaWR0aCgpLFxyXG4gICAgICAgICAgICBsaXN0SGVpZ2h0ID0gbGlzdE5vZGUuZ2V0SGVpZ2h0KCksXHJcbiAgICAgICAgICAgIHN0cm9rZU9mZnNldCA9IE1ldHJpYy5TVFJPS0VfU0laRSAqIDI7XHJcblxyXG4gICAgICAgIHZhciBwYWRkaW5nT3B0aW9ucyA9IE1ldHJpYy5QQURESU5HX09QVElPTlM7XHJcblxyXG4gICAgICAgIHZhciB3aWR0aCA9IChsaXN0V2lkdGggPCBlbGVtZW50V2lkdGggPyBlbGVtZW50V2lkdGggOiBsaXN0V2lkdGgpIC0gc3Ryb2tlT2Zmc2V0LFxyXG4gICAgICAgICAgICBwb3NYID0gZWxlbWVudFBvc1swXSxcclxuICAgICAgICAgICAgcG9zWSA9IGVsZW1lbnRQb3NbMV0gKyBlbGVtZW50SGVpZ2h0IC0gcGFkZGluZ09wdGlvbnM7XHJcblxyXG4gICAgICAgIHZhciB3aW5kb3dXaWR0aCA9IHdpbmRvdy5pbm5lcldpZHRoLFxyXG4gICAgICAgICAgICB3aW5kb3dIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XHJcblxyXG4gICAgICAgIHZhciByb290UG9zWCA9IChwb3NYICsgd2lkdGgpID4gd2luZG93V2lkdGggPyAocG9zWCAtIHdpZHRoICsgZWxlbWVudFdpZHRoIC0gc3Ryb2tlT2Zmc2V0KSA6IHBvc1gsXHJcbiAgICAgICAgICAgIHJvb3RQb3NZID0gKHBvc1kgKyBsaXN0SGVpZ2h0KSA+IHdpbmRvd0hlaWdodCA/IChwb3NZIC0gbGlzdEhlaWdodCAqIDAuNSAtIGVsZW1lbnRIZWlnaHQgKiAwLjUpIDogcG9zWTtcclxuXHJcbiAgICAgICAgbGlzdE5vZGUuc2V0V2lkdGgod2lkdGgpO1xyXG4gICAgICAgIHJvb3ROb2RlLnNldFBvc2l0aW9uR2xvYmFsKHJvb3RQb3NYLCByb290UG9zWSk7XHJcblxyXG4gICAgICAgIHRoaXMuX2NhbGxiYWNrT3V0ID0gY2FsbGJhY2tPdXQ7XHJcbiAgICAgICAgdGhpcy5fdW5mb2N1c2FibGUgPSBmYWxzZTtcclxuICAgIH0sXHJcblxyXG4gICAgX2NsZWFyTGlzdDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuX2xpc3ROb2RlLnJlbW92ZUFsbENoaWxkcmVuKCk7XHJcbiAgICAgICAgdGhpcy5fbGlzdE5vZGUuZGVsZXRlU3R5bGVQcm9wZXJ0eSgnd2lkdGgnKTtcclxuICAgICAgICB0aGlzLl9zZWxlY3RlZEluZGV4ID0gbnVsbDtcclxuICAgICAgICB0aGlzLl9idWlsZCA9IGZhbHNlO1xyXG4gICAgfSxcclxuXHJcbiAgICBjbGVhcjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuX2NsZWFyTGlzdCgpO1xyXG4gICAgICAgIHRoaXMuX2NhbGxiYWNrT3V0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy5fcGFyZW5Ob2RlLnJlbW92ZUNoaWxkKHRoaXMuZ2V0Tm9kZSgpKTtcclxuXHJcbiAgICB9LFxyXG5cclxuICAgIGlzQnVpbGQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fYnVpbGQ7XHJcbiAgICB9LFxyXG4gICAgZ2V0Tm9kZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9ub2RlO1xyXG4gICAgfSxcclxuICAgIGdldFNlbGVjdGVkSW5kZXg6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fc2VsZWN0ZWRJbmRleDtcclxuICAgIH1cclxufTtcclxuXHJcbk9wdGlvbnMuc2V0dXAgPSBmdW5jdGlvbihwYXJlbnROb2RlKXtyZXR1cm4gT3B0aW9ucy5faW5zdGFuY2UgPSBuZXcgT3B0aW9ucyhwYXJlbnROb2RlKTt9O1xyXG5PcHRpb25zLmdldCAgID0gZnVuY3Rpb24oKXtyZXR1cm4gT3B0aW9ucy5faW5zdGFuY2U7fTtcclxuT3B0aW9ucy5kZXN0cm95ID0gZnVuY3Rpb24oKXtPcHRpb25zLl9pbnN0YW5jZSA9IG51bGw7fTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gT3B0aW9uczsiLCJ2YXIgT2JqZWN0Q29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY29yZS9PYmplY3RDb21wb25lbnQnKTtcclxudmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcclxuXHJcbnZhciBDU1MgICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xyXG52YXIgTWV0cmljICAgID0gcmVxdWlyZSgnLi9NZXRyaWMnKTtcclxudmFyIFNjcm9sbEJhciA9IHJlcXVpcmUoJy4uL2NvcmUvbGF5b3V0L1Njcm9sbEJhcicpO1xyXG5cclxudmFyIEV2ZW50XyAgICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxyXG4gICAgRG9jdW1lbnRFdmVudCAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcclxuICAgIE5vZGVFdmVudCAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKSxcclxuICAgIENvbXBvbmVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9Db21wb25lbnRFdmVudCcpO1xyXG5cclxudmFyIERFRkFVTFRfSEVJR0hUID0gbnVsbCxcclxuICAgIERFRkFVTFRfV1JBUCAgID0gZmFsc2UsXHJcbiAgICBERUZBVUxUX1VQREFURSA9IHRydWU7XHJcblxyXG5mdW5jdGlvbiBPdXRwdXQocGFyZW50LG9iamVjdCx2YWx1ZSxwYXJhbXMpIHtcclxuICAgIE9iamVjdENvbXBvbmVudC5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XHJcblxyXG4gICAgcGFyYW1zICAgICAgICA9IHBhcmFtcyAgICAgICAgfHwge307XHJcbiAgICBwYXJhbXMuaGVpZ2h0ID0gcGFyYW1zLmhlaWdodCB8fCBERUZBVUxUX0hFSUdIVDtcclxuICAgIHBhcmFtcy53cmFwICAgPSBwYXJhbXMud3JhcCAgID09PSB1bmRlZmluZWQgPyBERUZBVUxUX1dSQVAgOiBwYXJhbXMud3JhcDtcclxuICAgIHBhcmFtcy51cGRhdGUgPSBwYXJhbXMudXBkYXRlID09PSB1bmRlZmluZWQgPyBERUZBVUxUX1VQREFURSA6IHBhcmFtcy51cGRhdGU7XHJcblxyXG4gICAgdGhpcy5fd3JhcCAgID0gcGFyYW1zLndyYXA7XHJcbiAgICB0aGlzLl91cGRhdGUgPSBwYXJhbXMudXBkYXRlO1xyXG5cclxuICAgIHZhciB0ZXh0QXJlYSA9IHRoaXMuX3RleHRBcmVhID0gbmV3IE5vZGUoTm9kZS5URVhUQVJFQSksXHJcbiAgICAgICAgd3JhcCA9IHRoaXMuX3dyYXBOb2RlLFxyXG4gICAgICAgIHJvb3QgPSB0aGlzLl9ub2RlO1xyXG5cclxuICAgICAgICB0ZXh0QXJlYS5zZXRQcm9wZXJ0eSgncmVhZE9ubHknLHRydWUpO1xyXG4gICAgICAgIHdyYXAuYWRkQ2hpbGQodGV4dEFyZWEpO1xyXG5cclxuICAgICAgICB0ZXh0QXJlYS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLHRoaXMuX29uSW5wdXREcmFnU3RhcnQuYmluZCh0aGlzKSk7XHJcbiAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKENvbXBvbmVudEV2ZW50LklOUFVUX1NFTEVDVF9EUkFHLHRoaXMuX3BhcmVudCwnb25Db21wb25lbnRTZWxlY3REcmFnJyk7XHJcblxyXG5cclxuICAgIGlmKHBhcmFtcy5oZWlnaHQpe1xyXG4gICAgICAgIHZhciB0ZXh0QXJlYVdyYXAgPSBuZXcgTm9kZSgpO1xyXG4gICAgICAgICAgICB0ZXh0QXJlYVdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuVGV4dEFyZWFXcmFwKTtcclxuICAgICAgICAgICAgdGV4dEFyZWFXcmFwLmFkZENoaWxkKHRleHRBcmVhKTtcclxuICAgICAgICAgICAgd3JhcC5hZGRDaGlsZCh0ZXh0QXJlYVdyYXApO1xyXG5cclxuICAgICAgICAvL0ZJWE1FXHJcbiAgICAgICAgdmFyIGhlaWdodCAgPSB0aGlzLl9oZWlnaHQgPSBwYXJhbXMuaGVpZ2h0LFxyXG4gICAgICAgICAgICBwYWRkaW5nID0gNDtcclxuXHJcbiAgICAgICAgICAgIHRleHRBcmVhLnNldEhlaWdodChNYXRoLm1heChoZWlnaHQgKyBwYWRkaW5nICAsTWV0cmljLkNPTVBPTkVOVF9NSU5fSEVJR0hUKSk7XHJcbiAgICAgICAgICAgIHdyYXAuc2V0SGVpZ2h0KHRleHRBcmVhLmdldEhlaWdodCgpKTtcclxuICAgICAgICAgICAgcm9vdC5zZXRIZWlnaHQod3JhcC5nZXRIZWlnaHQoKSArIHBhZGRpbmcpO1xyXG5cclxuICAgICAgICB0aGlzLl9zY3JvbGxCYXIgPSBuZXcgU2Nyb2xsQmFyKHRleHRBcmVhV3JhcCx0ZXh0QXJlYSxoZWlnaHQgLSBwYWRkaW5nKVxyXG4gICAgfVxyXG5cclxuICAgIGlmKHBhcmFtcy53cmFwKXtcclxuICAgICAgICB0ZXh0QXJlYS5zZXRTdHlsZVByb3BlcnR5KCd3aGl0ZS1zcGFjZScsJ3ByZS13cmFwJyk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5fcHJldlN0cmluZyA9ICcnO1xyXG4gICAgdGhpcy5fcHJldlNjcm9sbEhlaWdodCA9IC0xO1xyXG4gICAgdGhpcy5fc2V0VmFsdWUoKTtcclxufVxyXG5PdXRwdXQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShPYmplY3RDb21wb25lbnQucHJvdG90eXBlKTtcclxuT3V0cHV0LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IE91dHB1dDtcclxuXHJcbi8vT3ZlcnJpZGUgaW4gc3ViY2xhc3NcclxuT3V0cHV0LnByb3RvdHlwZS5fc2V0VmFsdWUgPSBmdW5jdGlvbiAoKSB7fTtcclxuXHJcbk91dHB1dC5wcm90b3R5cGUub25WYWx1ZVVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuX3NldFZhbHVlKCk7XHJcbn07XHJcblxyXG5PdXRwdXQucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGlmKCF0aGlzLl91cGRhdGUpe1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHRoaXMuX3NldFZhbHVlKCk7XHJcbn07XHJcblxyXG4vL1ByZXZlbnQgY2hyb21lIHNlbGVjdCBkcmFnXHJcblxyXG5PdXRwdXQucHJvdG90eXBlLl9vbkRyYWcgPSBmdW5jdGlvbigpe1xyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuSU5QVVRfU0VMRUNUX0RSQUcsIG51bGwpKTtcclxufTtcclxuXHJcbk91dHB1dC5wcm90b3R5cGUuX29uRHJhZ0ZpbmlzaCA9IGZ1bmN0aW9uKCl7XHJcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBDb21wb25lbnRFdmVudC5JTlBVVF9TRUxFQ1RfRFJBRywgbnVsbCkpO1xyXG5cclxuICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLCB0aGlzLl9vbkRyYWcsIGZhbHNlKTtcclxuICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLCB0aGlzLl9vbkRyYWdGaW5pc2gsIGZhbHNlKTtcclxufTtcclxuXHJcbk91dHB1dC5wcm90b3R5cGUuX29uSW5wdXREcmFnU3RhcnQgPSBmdW5jdGlvbigpIHtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LklOUFVUX1NFTEVDVF9EUkFHLCBudWxsKSk7XHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSwgdGhpcy5fb25EcmFnLmJpbmQodGhpcyksIGZhbHNlKTtcclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9VUCwgICB0aGlzLl9vbkRyYWdGaW5pc2guYmluZCh0aGlzKSwgZmFsc2UpO1xyXG59O1xyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gT3V0cHV0O1xyXG4iLCJ2YXIgUGxvdHRlciA9IHJlcXVpcmUoJy4vUGxvdHRlcicpO1xyXG52YXIgTW91c2UgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L01vdXNlJyk7XHJcblxyXG52YXIgRXZlbnRfICAgICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXHJcbiAgICBEb2N1bWVudEV2ZW50ICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxyXG4gICAgQ29tcG9uZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL0NvbXBvbmVudEV2ZW50Jyk7XHJcblxyXG52YXIgREVGQVVMVF9CT1VORFNfWCA9IFstMSwxXSxcclxuICAgIERFRkFVTFRfQk9VTkRTX1kgPSBbLTEsMV0sXHJcbiAgICBERUZBVUxUX0xBQkVMX1ggID0gJycsXHJcbiAgICBERUZBVUxUX0xBQkVMX1kgID0gJyc7XHJcblxyXG5mdW5jdGlvbiBQYWQocGFyZW50LCBvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcclxuICAgIFBsb3R0ZXIuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xyXG5cclxuICAgIHBhcmFtcyAgICAgICAgICAgID0gcGFyYW1zICAgICAgICAgICAgfHwge307XHJcbiAgICBwYXJhbXMuYm91bmRzWCAgICA9IHBhcmFtcy5ib3VuZHNYICAgIHx8IERFRkFVTFRfQk9VTkRTX1g7XHJcbiAgICBwYXJhbXMuYm91bmRzWSAgICA9IHBhcmFtcy5ib3VuZHNZICAgIHx8IERFRkFVTFRfQk9VTkRTX1k7XHJcbiAgICBwYXJhbXMubGFiZWxYICAgICA9IHBhcmFtcy5sYWJlbFggICAgIHx8IERFRkFVTFRfTEFCRUxfWDtcclxuICAgIHBhcmFtcy5sYWJlbFkgICAgID0gcGFyYW1zLmxhYmVsWSAgICAgfHwgREVGQVVMVF9MQUJFTF9ZO1xyXG5cclxuICAgIHBhcmFtcy5zaG93Q3Jvc3MgID0gcGFyYW1zLnNob3dDcm9zcyAgfHwgdHJ1ZTtcclxuXHJcblxyXG4gICAgdGhpcy5fb25DaGFuZ2UgICAgID0gcGFyYW1zLm9uQ2hhbmdlIHx8IHRoaXMuX29uQ2hhbmdlO1xyXG4gICAgdGhpcy5fb25GaW5pc2ggICAgID0gcGFyYW1zLm9uRmluaXNoIHx8IGZ1bmN0aW9uKCl7fTtcclxuXHJcbiAgICB0aGlzLl9ib3VuZHNYICAgICAgPSBwYXJhbXMuYm91bmRzWDtcclxuICAgIHRoaXMuX2JvdW5kc1kgICAgICA9IHBhcmFtcy5ib3VuZHNZO1xyXG4gICAgdGhpcy5fbGFiZWxBeGlzWCAgID0gcGFyYW1zLmxhYmVsWCAhPSAnJyAmJiBwYXJhbXMubGFiZWxYICE9ICdub25lJyA/IHBhcmFtcy5sYWJlbFggOiBudWxsO1xyXG4gICAgdGhpcy5fbGFiZWxBeGlzWSAgID0gcGFyYW1zLmxhYmVsWSAhPSAnJyAmJiBwYXJhbXMubGFiZWxZICE9ICdub25lJyA/IHBhcmFtcy5sYWJlbFkgOiBudWxsO1xyXG5cclxuICAgIHZhciBwYXRoID0gdGhpcy5fcGF0aDtcclxuICAgICAgICBwYXRoLnN0eWxlLnN0cm9rZVdpZHRoID0gMTtcclxuICAgICAgICBwYXRoLnN0eWxlLnN0cm9rZSAgICAgID0gJyMzNjNjNDAnO1xyXG5cclxuICAgIHRoaXMuX2dyaWQuc3R5bGUuc3Ryb2tlID0gJ3JnYigyNSwyNSwyNSknO1xyXG5cclxuICAgIHRoaXMuX3N2Z1BvcyA9IFswLDBdO1xyXG5cclxuXHJcbiAgICB2YXIgaGFuZGxlID0gdGhpcy5faGFuZGxlID0gdGhpcy5fc3ZnUm9vdC5hcHBlbmRDaGlsZCh0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ2cnKSk7XHJcbiAgICB2YXIgaGFuZGxlQ2lyY2xlMCA9IGhhbmRsZS5hcHBlbmRDaGlsZCh0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ2NpcmNsZScpKTtcclxuICAgICAgICBoYW5kbGVDaXJjbGUwLnNldEF0dHJpYnV0ZSgncicsU3RyaW5nKDExKSk7XHJcbiAgICAgICAgaGFuZGxlQ2lyY2xlMC5zZXRBdHRyaWJ1dGUoJ2ZpbGwnLCdyZ2JhKDAsMCwwLDAuMDUpJyk7XHJcbiAgICB2YXIgaGFuZGxlQ2lyY2xlMSA9IGhhbmRsZS5hcHBlbmRDaGlsZCh0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ2NpcmNsZScpKTtcclxuICAgICAgICBoYW5kbGVDaXJjbGUxLnNldEF0dHJpYnV0ZSgncicsU3RyaW5nKDEwKSk7XHJcbiAgICAgICAgaGFuZGxlQ2lyY2xlMS5zZXRBdHRyaWJ1dGUoJ2ZpbGwnLCdyZ2IoODMsOTMsOTgpJyk7XHJcblxyXG4gICAgdmFyIGhhbmRsZUNpcmNsZTIgPSBoYW5kbGUuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdjaXJjbGUnKSk7XHJcbiAgICAgICAgaGFuZGxlQ2lyY2xlMi5zZXRBdHRyaWJ1dGUoJ3InLFN0cmluZyg5KSk7XHJcbiAgICAgICAgaGFuZGxlQ2lyY2xlMi5zZXRBdHRyaWJ1dGUoJ2ZpbGwnLCdyZ2IoNTcsNjksNzYpJyk7XHJcbiAgICAgICAgaGFuZGxlQ2lyY2xlMi5zZXRBdHRyaWJ1dGUoJ2N5JyxTdHJpbmcoMC43NSkpO1xyXG5cclxuICAgIHZhciBoYW5kbGVDaXJjbGUzID0gaGFuZGxlLmFwcGVuZENoaWxkKHRoaXMuX2NyZWF0ZVNWR09iamVjdCgnY2lyY2xlJykpO1xyXG4gICAgICAgIGhhbmRsZUNpcmNsZTMuc2V0QXR0cmlidXRlKCdyJyxTdHJpbmcoMTApKTtcclxuICAgICAgICBoYW5kbGVDaXJjbGUzLnNldEF0dHJpYnV0ZSgnc3Ryb2tlJywncmdiKDE3LDE5LDIwKScpO1xyXG4gICAgICAgIGhhbmRsZUNpcmNsZTMuc2V0QXR0cmlidXRlKCdzdHJva2Utd2lkdGgnLFN0cmluZygxKSk7XHJcbiAgICAgICAgaGFuZGxlQ2lyY2xlMy5zZXRBdHRyaWJ1dGUoJ2ZpbGwnLCdub25lJyk7XHJcblxyXG4gICAgdmFyIGhhbmRsZUNpcmNsZTQgPSBoYW5kbGUuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdjaXJjbGUnKSk7XHJcbiAgICAgICAgaGFuZGxlQ2lyY2xlNC5zZXRBdHRyaWJ1dGUoJ3InLFN0cmluZyg2KSk7XHJcbiAgICAgICAgaGFuZGxlQ2lyY2xlNC5zZXRBdHRyaWJ1dGUoJ2ZpbGwnLCdyZ2IoMzAsMzQsMzYpJyk7XHJcbiAgICB2YXIgaGFuZGxlQ2lyY2xlNSA9IGhhbmRsZS5hcHBlbmRDaGlsZCh0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ2NpcmNsZScpKTtcclxuICAgICAgICBoYW5kbGVDaXJjbGU1LnNldEF0dHJpYnV0ZSgncicsU3RyaW5nKDMpKTtcclxuICAgICAgICBoYW5kbGVDaXJjbGU1LnNldEF0dHJpYnV0ZSgnZmlsbCcsJ3JnYigyNTUsMjU1LDI1NSknKTtcclxuXHJcbiAgICAgICAgaGFuZGxlLnNldEF0dHJpYnV0ZSgndHJhbmZvcm0nLCd0cmFuc2xhdGUoMCAwKScpO1xyXG5cclxuICAgIHRoaXMuX3N2Zy5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfRE9XTix0aGlzLl9vbkRyYWdTdGFydC5iaW5kKHRoaXMpLGZhbHNlKTtcclxuICAgIHRoaXMuX2RyYXdWYWx1ZSh0aGlzLl9vYmpbdGhpcy5fa2V5XSk7XHJcbn1cclxuUGFkLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUGxvdHRlci5wcm90b3R5cGUpO1xyXG5QYWQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gUGFkO1xyXG5cclxuUGFkLnByb3RvdHlwZS5fb25EcmFnU3RhcnQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgc3ZnUG9zID0gdGhpcy5fc3ZnUG9zO1xyXG4gICAgc3ZnUG9zWzBdID0gMDtcclxuICAgIHN2Z1Bvc1sxXSA9IDA7XHJcblxyXG4gICAgLy9za2lwIHRvIGNvbnRhaW5lclxyXG4gICAgdmFyIGVsZW1lbnQgPSB0aGlzLl9zdmcucGFyZW50Tm9kZTtcclxuXHJcbiAgICB3aGlsZSAoZWxlbWVudCkge1xyXG4gICAgICAgIHN2Z1Bvc1swXSArPSBlbGVtZW50Lm9mZnNldExlZnQ7XHJcbiAgICAgICAgc3ZnUG9zWzFdICs9IGVsZW1lbnQub2Zmc2V0VG9wO1xyXG4gICAgICAgIGVsZW1lbnQgPSBlbGVtZW50Lm9mZnNldFBhcmVudDtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgZXZlbnRNb3ZlID0gRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLFxyXG4gICAgICAgIGV2ZW50VXAgICA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XHJcblxyXG4gICAgdmFyIG9uRHJhZyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLl9kcmF3VmFsdWVJbnB1dCgpO1xyXG4gICAgICAgIHRoaXMuYXBwbHlWYWx1ZSgpO1xyXG4gICAgICAgIHRoaXMuX29uQ2hhbmdlKCk7XHJcbiAgICB9LmJpbmQodGhpcyk7XHJcblxyXG4gICAgdmFyIG9uRHJhZ0VuZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLnB1c2hIaXN0b3J5U3RhdGUoKTtcclxuICAgICAgICB0aGlzLl9kcmF3VmFsdWVJbnB1dCgpO1xyXG4gICAgICAgIHRoaXMuYXBwbHlWYWx1ZSgpO1xyXG4gICAgICAgIHRoaXMuX29uRmluaXNoKCk7XHJcblxyXG4gICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcclxuICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50VXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG5cclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3ZlLCBvbkRyYWcsICAgIGZhbHNlKTtcclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRVcCwgICBvbkRyYWdFbmQsIGZhbHNlKTtcclxuXHJcbiAgICB0aGlzLl9kcmF3VmFsdWVJbnB1dCgpO1xyXG4gICAgdGhpcy5hcHBseVZhbHVlKCk7XHJcbiAgICB0aGlzLl9vbkNoYW5nZSgpO1xyXG59O1xyXG5cclxuUGFkLnByb3RvdHlwZS5fcmVkcmF3ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5fZHJhd1ZhbHVlKHRoaXMuX29ialt0aGlzLl9rZXldKTtcclxufTtcclxuXHJcblBhZC5wcm90b3R5cGUuX2RyYXdWYWx1ZUlucHV0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5fZHJhd1ZhbHVlKHRoaXMuX2dldE1vdXNlTm9ybWFsaXplZCgpKTtcclxufTtcclxuXHJcblBhZC5wcm90b3R5cGUuX2RyYXdWYWx1ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgdGhpcy5fb2JqW3RoaXMuX2tleV0gPSB2YWx1ZTtcclxuICAgIHRoaXMuX2RyYXdHcmlkKCk7XHJcbiAgICB0aGlzLl9kcmF3UG9pbnQoKTtcclxufTtcclxuXHJcblBhZC5wcm90b3R5cGUuX2RyYXdHcmlkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHN2Z1NpemUgPSBOdW1iZXIodGhpcy5fc3ZnLmdldEF0dHJpYnV0ZSgnd2lkdGgnKSksXHJcbiAgICAgICAgc3ZnTWlkWCA9IE1hdGguZmxvb3Ioc3ZnU2l6ZSAqIDAuNSksXHJcbiAgICAgICAgc3ZnTWlkWSA9IE1hdGguZmxvb3Ioc3ZnU2l6ZSAqIDAuNSk7XHJcblxyXG4gICAgdmFyIHBhdGhDbWQgPSAnJztcclxuICAgIHBhdGhDbWQgKz0gdGhpcy5fcGF0aENtZExpbmUoMCwgc3ZnTWlkWSwgc3ZnU2l6ZSwgc3ZnTWlkWSk7XHJcbiAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRMaW5lKHN2Z01pZFgsIDAsIHN2Z01pZFgsIHN2Z1NpemUpO1xyXG5cclxuICAgIHRoaXMuX2dyaWQuc2V0QXR0cmlidXRlKCdkJywgcGF0aENtZCk7XHJcbn07XHJcblxyXG5cclxuUGFkLnByb3RvdHlwZS5fZHJhd1BvaW50ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHN2Z1NpemUgPSBOdW1iZXIodGhpcy5fc3ZnLmdldEF0dHJpYnV0ZSgnd2lkdGgnKSk7XHJcblxyXG4gICAgdmFyIHZhbHVlID0gdGhpcy5fb2JqW3RoaXMuX2tleV07XHJcblxyXG4gICAgdmFyIGxvY2FsWCA9ICggMC41ICsgdmFsdWVbMF0gKiAwLjUgKSAqIHN2Z1NpemUsXHJcbiAgICAgICAgbG9jYWxZID0gKCAwLjUgKyAtdmFsdWVbMV0gKiAwLjUgKSAqIHN2Z1NpemU7XHJcblxyXG4gICAgdmFyIHBhdGhDbWQgPSAnJztcclxuICAgICAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRMaW5lKDAsIGxvY2FsWSwgc3ZnU2l6ZSwgbG9jYWxZKTtcclxuICAgICAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRMaW5lKGxvY2FsWCwgMCwgbG9jYWxYLCBzdmdTaXplKTtcclxuXHJcbiAgICB0aGlzLl9wYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBhdGhDbWQpO1xyXG4gICAgdGhpcy5faGFuZGxlLnNldEF0dHJpYnV0ZSgndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgnICsgbG9jYWxYICsgJyAnICsgbG9jYWxZICsgJyknKTtcclxufTtcclxuXHJcblBhZC5wcm90b3R5cGUuX2dldE1vdXNlTm9ybWFsaXplZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBvZmZzZXQgPSB0aGlzLl9zdmdQb3MsXHJcbiAgICAgICAgbW91c2UgPSBNb3VzZS5nZXQoKS5nZXRQb3NpdGlvbigpLFxyXG4gICAgICAgIHN2Z1NpemUgPSBOdW1iZXIodGhpcy5fc3ZnLmdldEF0dHJpYnV0ZSgnd2lkdGgnKSk7XHJcblxyXG4gICAgcmV0dXJuIFstMSArIE1hdGgubWF4KDAsIE1hdGgubWluKG1vdXNlWzBdIC0gb2Zmc2V0WzBdLCBzdmdTaXplKSkgLyBzdmdTaXplICogMixcclxuICAgICAgICAgICAgKCAxIC0gTWF0aC5tYXgoMCwgTWF0aC5taW4obW91c2VbMV0gLSBvZmZzZXRbMV0sIHN2Z1NpemUpKSAvIHN2Z1NpemUgKiAyKV07XHJcblxyXG59O1xyXG5cclxuUGFkLnByb3RvdHlwZS5hcHBseVZhbHVlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCwgbnVsbCkpO1xyXG59O1xyXG5cclxuUGFkLnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24gKGUpIHtcclxuICAgIGlmIChlLmRhdGEub3JpZ2luID09IHRoaXMpcmV0dXJuO1xyXG4gICAgdGhpcy5fZHJhd1ZhbHVlKHRoaXMuX29ialt0aGlzLl9rZXldKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUGFkO1xyXG4iLCJ2YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xyXG5cclxudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XHJcbnZhciBOdW1iZXJJbnB1dF9JbnRlcm5hbCA9IHJlcXVpcmUoJy4vTnVtYmVySW5wdXRfSW50ZXJuYWwnKTtcclxudmFyIE1vdXNlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Nb3VzZScpO1xyXG52YXIgQ29sb3JVdGlsID0gcmVxdWlyZSgnLi4vY29yZS9jb2xvci9Db2xvclV0aWwnKTtcclxudmFyIERvY3VtZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcclxuICAgIE5vZGVFdmVudCAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpO1xyXG5cclxudmFyIERFRkFVTFRfVkFMVUVfSFVFID0gMjAwLjAsXHJcbiAgICBERUZBVUxUX1ZBTFVFX1NBVCA9IDUwLjAsXHJcbiAgICBERUZBVUxUX1ZBTFVFX1ZBTCA9IDUwLjA7XHJcblxyXG5mdW5jdGlvbiBQaWNrZXIocGFyZW50Tm9kZSl7XHJcbiAgICB2YXIgcm9vdCA9IHRoaXMuX25vZGUgICAgID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXIpLFxyXG4gICAgICAgIGhlYWQgPSB0aGlzLl9oZWFkTm9kZSA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuSGVhZCksXHJcbiAgICAgICAgbGFiZWxXcmFwID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5XcmFwKSxcclxuICAgICAgICBsYWJlbCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpLFxyXG4gICAgICAgIG1lbnUgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLk1lbnUpLFxyXG4gICAgICAgIG1lbnVXcmFwID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5XcmFwKTtcclxuXHJcbiAgICB2YXIgbWVudUNsb3NlID0gbmV3IE5vZGUoTm9kZS5JTlBVVF9CVVRUT04pO1xyXG4gICAgICAgIG1lbnVDbG9zZS5zZXRTdHlsZUNsYXNzKENTUy5CdXR0b25NZW51Q2xvc2UpO1xyXG5cclxuICAgIHZhciBmaWVsZFdyYXAgID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKCBDU1MuUGlja2VyRmllbGRXcmFwKSxcclxuICAgICAgICBzbGlkZXJXcmFwID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5TbGlkZXJXcmFwKSxcclxuICAgICAgICBpbnB1dFdyYXAgID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKCBDU1MuUGlja2VySW5wdXRXcmFwKTtcclxuXHJcbiAgICB2YXIgY2FudmFzRmllbGQgID0gdGhpcy5fY2FudmFzRmllbGQgID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyksXHJcbiAgICAgICAgY2FudmFzU2xpZGVyID0gdGhpcy5fY2FudmFzU2xpZGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XHJcblxyXG4gICAgICAgIGZpZWxkV3JhcC5nZXRFbGVtZW50KCkuYXBwZW5kQ2hpbGQoY2FudmFzRmllbGQpO1xyXG4gICAgICAgIHNsaWRlcldyYXAuZ2V0RWxlbWVudCgpLmFwcGVuZENoaWxkKGNhbnZhc1NsaWRlcik7XHJcblxyXG4gICAgICAgIHRoaXMuX3NldFNpemVDYW52YXNGaWVsZCgxNTQsMTU0KTtcclxuICAgICAgICB0aGlzLl9zZXRTaXplQ2FudmFzU2xpZGVyKDE0LDE1NCk7XHJcblxyXG4gICAgdmFyIGNvbnRleHRDYW52YXNGaWVsZCAgPSB0aGlzLl9jb250ZXh0Q2FudmFzRmllbGQgID0gY2FudmFzRmllbGQuZ2V0Q29udGV4dCgnMmQnKSxcclxuICAgICAgICBjb250ZXh0Q2FudmFzU2xpZGVyID0gdGhpcy5fY29udGV4dENhbnZhc1NsaWRlciA9IGNhbnZhc1NsaWRlci5nZXRDb250ZXh0KCcyZCcpO1xyXG5cclxuICAgIHZhciBoYW5kbGVGaWVsZCAgPSB0aGlzLl9oYW5kbGVGaWVsZCAgPSBuZXcgTm9kZSgpO1xyXG4gICAgICAgIGhhbmRsZUZpZWxkLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlckhhbmRsZUZpZWxkKTtcclxuXHJcbiAgICB2YXIgaGFuZGxlU2xpZGVyID0gdGhpcy5faGFuZGxlU2xpZGVyID0gbmV3IE5vZGUoKTtcclxuICAgICAgICBoYW5kbGVTbGlkZXIuc2V0U3R5bGVDbGFzcyhDU1MuUGlja2VySGFuZGxlU2xpZGVyKTtcclxuXHJcbiAgICB2YXIgc3RlcCA9IDEuMCxcclxuICAgICAgICBkcCAgID0gMDtcclxuXHJcbiAgICB2YXIgY2FsbGJhY2tIdWUgPSB0aGlzLl9vbklucHV0SHVlQ2hhbmdlLmJpbmQodGhpcyksXHJcbiAgICAgICAgY2FsbGJhY2tTYXQgPSB0aGlzLl9vbklucHV0U2F0Q2hhbmdlLmJpbmQodGhpcyksXHJcbiAgICAgICAgY2FsbGJhY2tWYWwgPSB0aGlzLl9vbklucHV0VmFsQ2hhbmdlLmJpbmQodGhpcyksXHJcbiAgICAgICAgY2FsbGJhY2tSICAgPSB0aGlzLl9vbklucHV0UkNoYW5nZS5iaW5kKHRoaXMpLFxyXG4gICAgICAgIGNhbGxiYWNrRyAgID0gdGhpcy5fb25JbnB1dEdDaGFuZ2UuYmluZCh0aGlzKSxcclxuICAgICAgICBjYWxsYmFja0IgICA9IHRoaXMuX29uSW5wdXRCQ2hhbmdlLmJpbmQodGhpcyk7XHJcblxyXG5cclxuICAgIHZhciBpbnB1dEh1ZSA9IHRoaXMuX2lucHV0SHVlID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHN0ZXAsZHAsbnVsbCxjYWxsYmFja0h1ZSksXHJcbiAgICAgICAgaW5wdXRTYXQgPSB0aGlzLl9pbnB1dFNhdCA9IG5ldyBOdW1iZXJJbnB1dF9JbnRlcm5hbChzdGVwLGRwLG51bGwsY2FsbGJhY2tTYXQpLFxyXG4gICAgICAgIGlucHV0VmFsID0gdGhpcy5faW5wdXRWYWwgPSBuZXcgTnVtYmVySW5wdXRfSW50ZXJuYWwoc3RlcCxkcCxudWxsLGNhbGxiYWNrVmFsKSxcclxuICAgICAgICBpbnB1dFIgICA9IHRoaXMuX2lucHV0UiAgID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHN0ZXAsZHAsbnVsbCxjYWxsYmFja1IpLFxyXG4gICAgICAgIGlucHV0RyAgID0gdGhpcy5faW5wdXRHICAgPSBuZXcgTnVtYmVySW5wdXRfSW50ZXJuYWwoc3RlcCxkcCxudWxsLGNhbGxiYWNrRyksXHJcbiAgICAgICAgaW5wdXRCICAgPSB0aGlzLl9pbnB1dEIgICA9IG5ldyBOdW1iZXJJbnB1dF9JbnRlcm5hbChzdGVwLGRwLG51bGwsY2FsbGJhY2tCKTtcclxuXHJcbiAgICB2YXIgY29udHJvbHNXcmFwID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJDb250cm9sc1dyYXApO1xyXG5cclxuICAgIHZhciBidXR0b25QaWNrICAgPSBuZXcgTm9kZShOb2RlLklOUFVUX0JVVFRPTikuc2V0U3R5bGVDbGFzcyhDU1MuQnV0dG9uKS5zZXRQcm9wZXJ0eSgndmFsdWUnLCdwaWNrJyksXHJcbiAgICAgICAgYnV0dG9uQ2FuY2VsID0gbmV3IE5vZGUoTm9kZS5JTlBVVF9CVVRUT04pLnNldFN0eWxlQ2xhc3MoQ1NTLkJ1dHRvbikuc2V0UHJvcGVydHkoJ3ZhbHVlJywnY2FuY2VsJyk7XHJcblxyXG5cclxuICAgIHZhciBjb2xvckNvbnRyYXN0ID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJDb2xvckNvbnRyYXN0KTtcclxuXHJcbiAgICB2YXIgY29sb3IwID0gdGhpcy5fY29sb3JDdXJyTm9kZSA9IG5ldyBOb2RlKCksXHJcbiAgICAgICAgY29sb3IxID0gdGhpcy5fY29sb3JQcmV2Tm9kZSA9IG5ldyBOb2RlKCk7XHJcblxyXG4gICAgY29sb3JDb250cmFzdC5hZGRDaGlsZChjb2xvcjApO1xyXG4gICAgY29sb3JDb250cmFzdC5hZGRDaGlsZChjb2xvcjEpO1xyXG5cclxuICAgIGNvbnRyb2xzV3JhcC5hZGRDaGlsZChidXR0b25DYW5jZWwpO1xyXG4gICAgY29udHJvbHNXcmFwLmFkZENoaWxkKGJ1dHRvblBpY2spO1xyXG4gICAgY29udHJvbHNXcmFwLmFkZENoaWxkKGNvbG9yQ29udHJhc3QpO1xyXG5cclxuICAgIHRoaXMuX3NldENvbnRyYXNQcmV2Q29sb3IoMCwwLDApO1xyXG5cclxuICAgIHZhciBpbnB1dEZpZWxkV3JhcEh1ZSA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuUGlja2VySW5wdXRGaWVsZCksXHJcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBTYXQgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlcklucHV0RmllbGQpLFxyXG4gICAgICAgIGlucHV0RmllbGRXcmFwVmFsID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJJbnB1dEZpZWxkKTtcclxuXHJcbiAgICB2YXIgaW5wdXRGaWVsZFdyYXBIdWVMYWJlbCA9IG5ldyBOb2RlKE5vZGUuU1BBTikuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCdIJyksXHJcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBTYXRMYWJlbCA9IG5ldyBOb2RlKE5vZGUuU1BBTikuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCdTJyksXHJcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBWYWxMYWJlbCA9IG5ldyBOb2RlKE5vZGUuU1BBTikuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCdWJyk7XHJcblxyXG4gICAgICAgIGlucHV0RmllbGRXcmFwSHVlLmFkZENoaWxkcmVuKGlucHV0RmllbGRXcmFwSHVlTGFiZWwsaW5wdXRIdWUuZ2V0Tm9kZSgpKTtcclxuICAgICAgICBpbnB1dEZpZWxkV3JhcFNhdC5hZGRDaGlsZHJlbihpbnB1dEZpZWxkV3JhcFNhdExhYmVsLGlucHV0U2F0LmdldE5vZGUoKSk7XHJcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBWYWwuYWRkQ2hpbGRyZW4oaW5wdXRGaWVsZFdyYXBWYWxMYWJlbCxpbnB1dFZhbC5nZXROb2RlKCkpO1xyXG5cclxuICAgIHZhciBpbnB1dEZpZWxkV3JhcFIgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlcklucHV0RmllbGQpLFxyXG4gICAgICAgIGlucHV0RmllbGRXcmFwRyA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuUGlja2VySW5wdXRGaWVsZCksXHJcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBCID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJJbnB1dEZpZWxkKTtcclxuXHJcbiAgICB2YXIgaW5wdXRGaWVsZFdyYXBSTGFiZWwgPSBuZXcgTm9kZShOb2RlLlNQQU4pLnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywnUicpLFxyXG4gICAgICAgIGlucHV0RmllbGRXcmFwR0xhYmVsID0gbmV3IE5vZGUoTm9kZS5TUEFOKS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCkuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsJ0cnKSxcclxuICAgICAgICBpbnB1dEZpZWxkV3JhcEJMYWJlbCA9IG5ldyBOb2RlKE5vZGUuU1BBTikuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCdCJyk7XHJcblxyXG4gICAgICAgIGlucHV0RmllbGRXcmFwUi5hZGRDaGlsZHJlbihpbnB1dEZpZWxkV3JhcFJMYWJlbCxpbnB1dFIuZ2V0Tm9kZSgpKTtcclxuICAgICAgICBpbnB1dEZpZWxkV3JhcEcuYWRkQ2hpbGRyZW4oaW5wdXRGaWVsZFdyYXBHTGFiZWwsaW5wdXRHLmdldE5vZGUoKSk7XHJcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBCLmFkZENoaWxkcmVuKGlucHV0RmllbGRXcmFwQkxhYmVsLGlucHV0Qi5nZXROb2RlKCkpO1xyXG5cclxuXHJcbiAgICAgICAgaW5wdXRXcmFwLmFkZENoaWxkcmVuKGlucHV0RmllbGRXcmFwUixpbnB1dEZpZWxkV3JhcEh1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRGaWVsZFdyYXBHLGlucHV0RmllbGRXcmFwU2F0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dEZpZWxkV3JhcEIsaW5wdXRGaWVsZFdyYXBWYWwsY29sb3JDb250cmFzdCk7XHJcblxyXG4gICAgdmFyIGhleElucHV0V3JhcCA9IG5ldyBOb2RlKCk7XHJcbiAgICAgICAgaGV4SW5wdXRXcmFwLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlcklucHV0V3JhcCk7XHJcblxyXG4gICAgdmFyIGlucHV0SEVYID0gdGhpcy5faW5wdXRIRVggPSBuZXcgTm9kZShOb2RlLklOUFVUX1RFWFQpLFxyXG4gICAgICAgIGlucHV0RmllbGRXcmFwSEVYICAgICAgICAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlcklucHV0RmllbGQpLFxyXG4gICAgICAgIGlucHV0RmllbGRXcmFwSEVYTGFiZWwgICAgPSBuZXcgTm9kZShOb2RlLlNQQU4pLnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKTtcclxuXHJcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBIRVhMYWJlbC5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywnIycpO1xyXG4gICAgICAgIGlucHV0RmllbGRXcmFwSEVYLmFkZENoaWxkcmVuKGlucHV0RmllbGRXcmFwSEVYTGFiZWwsaW5wdXRIRVgpO1xyXG5cclxuICAgICAgICBoZXhJbnB1dFdyYXAuYWRkQ2hpbGQoaW5wdXRGaWVsZFdyYXBIRVgpO1xyXG5cclxuICAgICAgICBpbnB1dEhFWC5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5DSEFOR0UsdGhpcy5fb25JbnB1dEhFWEZpbmlzaC5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICAgICAgbGFiZWwuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsJ0NvbG9yIFBpY2tlcicpO1xyXG5cclxuICAgICAgICBtZW51LmFkZENoaWxkKG1lbnVDbG9zZSk7XHJcbiAgICAgICAgaGVhZC5hZGRDaGlsZChtZW51KTtcclxuICAgICAgICBsYWJlbFdyYXAuYWRkQ2hpbGQobGFiZWwpO1xyXG4gICAgICAgIGhlYWQuYWRkQ2hpbGQobGFiZWxXcmFwKTtcclxuICAgICAgICByb290LmFkZENoaWxkKGhlYWQpO1xyXG4gICAgICAgIHJvb3QuYWRkQ2hpbGQobWVudVdyYXApO1xyXG5cclxuICAgICAgICAvL3dyYXBOb2RlLmFkZENoaWxkKHBhbGV0dGVXcmFwKTtcclxuXHJcbiAgICAgICAgbWVudVdyYXAuYWRkQ2hpbGQoZmllbGRXcmFwKTtcclxuICAgICAgICBtZW51V3JhcC5hZGRDaGlsZChzbGlkZXJXcmFwKTtcclxuICAgICAgICBtZW51V3JhcC5hZGRDaGlsZChpbnB1dFdyYXApO1xyXG4gICAgICAgIG1lbnVXcmFwLmFkZENoaWxkKGhleElucHV0V3JhcCk7XHJcbiAgICAgICAgbWVudVdyYXAuYWRkQ2hpbGQoY29udHJvbHNXcmFwKTtcclxuXHJcbiAgICAgICAgZmllbGRXcmFwLmFkZENoaWxkKCBoYW5kbGVGaWVsZCk7XHJcbiAgICAgICAgc2xpZGVyV3JhcC5hZGRDaGlsZChoYW5kbGVTbGlkZXIpO1xyXG5cclxuICAgIHZhciBldmVudE1vdXNlRG93biA9IE5vZGVFdmVudC5NT1VTRV9ET1dOLFxyXG4gICAgICAgIGNhbGxiYWNrICAgICAgID0gdGhpcy5fb25DYW52YXNGaWVsZE1vdXNlRG93bi5iaW5kKHRoaXMpO1xyXG5cclxuICAgICAgICBmaWVsZFdyYXAuYWRkRXZlbnRMaXN0ZW5lciggIGV2ZW50TW91c2VEb3duLCBjYWxsYmFjayk7XHJcbiAgICAgICAgaGFuZGxlRmllbGQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlRG93biwgY2FsbGJhY2spO1xyXG5cclxuICAgICAgICBjYWxsYmFjayA9IHRoaXMuX29uQ2FudmFzU2xpZGVyTW91c2VEb3duLmJpbmQodGhpcyk7XHJcblxyXG4gICAgICAgIHNsaWRlcldyYXAuYWRkRXZlbnRMaXN0ZW5lciggIGV2ZW50TW91c2VEb3duLCBjYWxsYmFjayk7XHJcbiAgICAgICAgaGFuZGxlU2xpZGVyLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZURvd24sIGNhbGxiYWNrKTtcclxuXHJcbiAgICAgICAgbWVudUNsb3NlLmFkZEV2ZW50TGlzdGVuZXIoICAgZXZlbnRNb3VzZURvd24sIHRoaXMuX29uQ2xvc2UuYmluZCh0aGlzKSk7XHJcbiAgICAgICAgYnV0dG9uUGljay5hZGRFdmVudExpc3RlbmVyKCAgZXZlbnRNb3VzZURvd24sIHRoaXMuX29uUGljay5iaW5kKHRoaXMpKTtcclxuICAgICAgICBidXR0b25DYW5jZWwuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlRG93biwgdGhpcy5fb25DbG9zZS5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICAgICAgaGVhZC5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLCB0aGlzLl9vbkhlYWREcmFnU3RhcnQuYmluZCh0aGlzKSk7XHJcblxyXG4gICAgdGhpcy5fcGFyZW50Tm9kZSA9IHBhcmVudE5vZGU7XHJcblxyXG4gICAgdGhpcy5fbW91c2VPZmZzZXQgPSBbMCwwXTtcclxuICAgIHRoaXMuX3Bvc2l0aW9uICAgID0gW251bGwsbnVsbF07XHJcblxyXG4gICAgdGhpcy5fY2FudmFzU2xpZGVyUG9zID0gWzAsMF07XHJcbiAgICB0aGlzLl9jYW52YXNGaWVsZFBvcyAgPSBbMCwwXTtcclxuICAgIHRoaXMuX2hhbmRsZUZpZWxkU2l6ZSAgICA9IDEyO1xyXG4gICAgdGhpcy5faGFuZGxlU2xpZGVySGVpZ2h0ID0gNztcclxuXHJcbiAgICB0aGlzLl9pbWFnZURhdGFTbGlkZXIgPSBjb250ZXh0Q2FudmFzU2xpZGVyLmNyZWF0ZUltYWdlRGF0YShjYW52YXNTbGlkZXIud2lkdGgsY2FudmFzU2xpZGVyLmhlaWdodCk7XHJcbiAgICB0aGlzLl9pbWFnZURhdGFGaWVsZCAgPSBjb250ZXh0Q2FudmFzRmllbGQuY3JlYXRlSW1hZ2VEYXRhKCBjYW52YXNGaWVsZC53aWR0aCwgY2FudmFzRmllbGQuaGVpZ2h0KTtcclxuXHJcbiAgICB0aGlzLl92YWx1ZUh1ZU1pbk1heCA9IFswLDM2MF07XHJcbiAgICB0aGlzLl92YWx1ZVNhdE1pbk1heCA9IHRoaXMuX3ZhbHVlVmFsTWluTWF4ID0gWzAsMTAwXTtcclxuICAgIHRoaXMuX3ZhbHVlUkdCTWluTWF4ID0gWzAsMjU1XTtcclxuXHJcbiAgICB0aGlzLl92YWx1ZUh1ZSA9IERFRkFVTFRfVkFMVUVfSFVFO1xyXG4gICAgdGhpcy5fdmFsdWVTYXQgPSBERUZBVUxUX1ZBTFVFX1NBVDtcclxuICAgIHRoaXMuX3ZhbHVlVmFsID0gREVGQVVMVF9WQUxVRV9WQUw7XHJcbiAgICB0aGlzLl92YWx1ZVIgICA9IDA7XHJcbiAgICB0aGlzLl92YWx1ZUcgICA9IDA7XHJcbiAgICB0aGlzLl92YWx1ZUIgICA9IDA7XHJcblxyXG4gICAgdGhpcy5fdmFsdWVIRVggPSAnIzAwMDAwMCc7XHJcbiAgICB0aGlzLl92YWx1ZUhFWFZhbGlkID0gdGhpcy5fdmFsdWVIRVg7XHJcblxyXG4gICAgdGhpcy5fY2FsbGJhY2tQaWNrID0gZnVuY3Rpb24oKXt9O1xyXG5cclxuICAgIC8vdGhpcy5fY2FudmFzRmllbGRJbWFnZURhdGFGdW5jID0gZnVuY3Rpb24oaSxqKXtyZXR1cm4gdGhpcy5fSFNWMlJHQih0aGlzLl92YWx1ZUh1ZSxqKX1cclxuXHJcbiAgICB0aGlzLl9kcmF3Q2FudmFzRmllbGQoKTtcclxuICAgIHRoaXMuX2RyYXdDYW52YXNTbGlkZXIoKTtcclxuXHJcbiAgICB0aGlzLl9zZXRDb2xvckhTVih0aGlzLl92YWx1ZUh1ZSx0aGlzLl92YWx1ZVNhdCx0aGlzLl92YWx1ZVZhbCk7XHJcblxyXG4gICAgdGhpcy5fdXBkYXRlQ29sb3JSR0JGcm9tSFNWKCk7XHJcbiAgICB0aGlzLl91cGRhdGVDb2xvckhFWEZyb21SR0IoKTtcclxuXHJcbiAgICB0aGlzLl91cGRhdGVIYW5kbGVzKCk7XHJcbn1cclxuXHJcblBpY2tlci5wcm90b3R5cGUgPVxyXG57XHJcbiAgICBfZHJhd0hhbmRsZUZpZWxkOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhc0ZpZWxkLFxyXG4gICAgICAgICAgICBub2RlUG9zID0gdGhpcy5fY2FudmFzRmllbGRQb3MsXHJcbiAgICAgICAgICAgIG1vdXNlUG9zID0gTW91c2UuZ2V0KCkuZ2V0UG9zaXRpb24oKTtcclxuXHJcbiAgICAgICAgdmFyIHBvc1ggPSBNYXRoLm1heCgwLCBNYXRoLm1pbihtb3VzZVBvc1swXSAtIG5vZGVQb3NbMF0sIGNhbnZhcy53aWR0aCkpLFxyXG4gICAgICAgICAgICBwb3NZID0gTWF0aC5tYXgoMCwgTWF0aC5taW4obW91c2VQb3NbMV0gLSBub2RlUG9zWzFdLCBjYW52YXMuaGVpZ2h0KSksXHJcbiAgICAgICAgICAgIHBvc1hOb3JtID0gcG9zWCAvIGNhbnZhcy53aWR0aCxcclxuICAgICAgICAgICAgcG9zWU5vcm0gPSBwb3NZIC8gY2FudmFzLmhlaWdodDtcclxuXHJcbiAgICAgICAgdmFyIHNhdCA9IE1hdGgucm91bmQocG9zWE5vcm0gKiB0aGlzLl92YWx1ZVNhdE1pbk1heFsxXSksXHJcbiAgICAgICAgICAgIHZhbCA9IE1hdGgucm91bmQoKDEuMCAtIHBvc1lOb3JtKSAqIHRoaXMuX3ZhbHVlVmFsTWluTWF4WzFdKTtcclxuXHJcbiAgICAgICAgdGhpcy5fc2V0Q29sb3JIU1YodGhpcy5fdmFsdWVIdWUsIHNhdCwgdmFsKTtcclxuXHJcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JSR0JGcm9tSFNWKCk7XHJcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIRVhGcm9tUkdCKCk7XHJcblxyXG4gICAgICAgIHRoaXMuX3VwZGF0ZUhhbmRsZUZpZWxkKCk7XHJcbiAgICB9LFxyXG5cclxuICAgIF91cGRhdGVIYW5kbGVGaWVsZDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciB3aWR0aCA9IHRoaXMuX2NhbnZhc0ZpZWxkLndpZHRoLFxyXG4gICAgICAgICAgICBoZWlnaHQgPSB0aGlzLl9jYW52YXNGaWVsZC5oZWlnaHQsXHJcbiAgICAgICAgICAgIG9mZnNldEhhbmRsZSA9IHRoaXMuX2hhbmRsZUZpZWxkU2l6ZSAqIDAuMjU7XHJcblxyXG4gICAgICAgIHZhciBzYXROb3JtID0gdGhpcy5fdmFsdWVTYXQgLyB0aGlzLl92YWx1ZVNhdE1pbk1heFsxXSxcclxuICAgICAgICAgICAgdmFsTm9ybSA9IHRoaXMuX3ZhbHVlVmFsIC8gdGhpcy5fdmFsdWVWYWxNaW5NYXhbMV07XHJcblxyXG4gICAgICAgIHRoaXMuX2hhbmRsZUZpZWxkLnNldFBvc2l0aW9uR2xvYmFsKHNhdE5vcm0gKiB3aWR0aCAtIG9mZnNldEhhbmRsZSxcclxuICAgICAgICAgICAgKDEuMCAtIHZhbE5vcm0pICogaGVpZ2h0IC0gb2Zmc2V0SGFuZGxlKTtcclxuXHJcbiAgICB9LFxyXG5cclxuICAgIF9kcmF3SGFuZGxlU2xpZGVyOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhc1NsaWRlcixcclxuICAgICAgICAgICAgY2FudmFzUG9zWSA9IHRoaXMuX2NhbnZhc1NsaWRlclBvc1sxXSxcclxuICAgICAgICAgICAgbW91c2VQb3NZID0gTW91c2UuZ2V0KCkuZ2V0WSgpO1xyXG5cclxuICAgICAgICB2YXIgcG9zWSA9IE1hdGgubWF4KDAsIE1hdGgubWluKG1vdXNlUG9zWSAtIGNhbnZhc1Bvc1ksIGNhbnZhcy5oZWlnaHQpKSxcclxuICAgICAgICAgICAgcG9zWU5vcm0gPSBwb3NZIC8gY2FudmFzLmhlaWdodDtcclxuXHJcbiAgICAgICAgdmFyIGh1ZSA9IE1hdGguZmxvb3IoKDEuMCAtIHBvc1lOb3JtKSAqIHRoaXMuX3ZhbHVlSHVlTWluTWF4WzFdKTtcclxuXHJcbiAgICAgICAgdGhpcy5fc2V0Q29sb3JIU1YoaHVlLCB0aGlzLl92YWx1ZVNhdCwgdGhpcy5fdmFsdWVWYWwpO1xyXG5cclxuICAgICAgICB0aGlzLl91cGRhdGVDb2xvclJHQkZyb21IU1YoKTtcclxuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhFWEZyb21SR0IoKTtcclxuXHJcbiAgICAgICAgdGhpcy5fdXBkYXRlSGFuZGxlU2xpZGVyKCk7XHJcbiAgICB9LFxyXG5cclxuICAgIF91cGRhdGVIYW5kbGVTbGlkZXI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgaGVpZ2h0ID0gdGhpcy5fY2FudmFzU2xpZGVyLmhlaWdodCxcclxuICAgICAgICAgICAgb2Zmc2V0SGFuZGxlID0gdGhpcy5faGFuZGxlU2xpZGVySGVpZ2h0ICogMC4yNTtcclxuXHJcbiAgICAgICAgdmFyIGh1ZU5vcm0gPSB0aGlzLl92YWx1ZUh1ZSAvIHRoaXMuX3ZhbHVlSHVlTWluTWF4WzFdO1xyXG5cclxuICAgICAgICB0aGlzLl9oYW5kbGVTbGlkZXIuc2V0UG9zaXRpb25HbG9iYWxZKChoZWlnaHQgLSBvZmZzZXRIYW5kbGUpICogKDEuMCAtIGh1ZU5vcm0pKTtcclxuICAgIH0sXHJcblxyXG4gICAgX3VwZGF0ZUhhbmRsZXM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLl91cGRhdGVIYW5kbGVGaWVsZCgpO1xyXG4gICAgICAgIHRoaXMuX3VwZGF0ZUhhbmRsZVNsaWRlcigpO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXHJcblxyXG4gICAgX3NldEh1ZTogZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgdmFyIG1pbk1heCA9IHRoaXMuX3ZhbHVlSHVlTWluTWF4O1xyXG5cclxuICAgICAgICB0aGlzLl92YWx1ZUh1ZSA9IHZhbHVlID09IG1pbk1heFsxXSA/IG1pbk1heFswXSA6IHZhbHVlO1xyXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySFNWKCk7XHJcbiAgICAgICAgdGhpcy5fZHJhd0NhbnZhc0ZpZWxkKCk7XHJcbiAgICB9LFxyXG5cclxuICAgIF9zZXRTYXQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgICAgIHRoaXMuX3ZhbHVlU2F0ID0gTWF0aC5yb3VuZCh2YWx1ZSk7XHJcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIU1YoKTtcclxuICAgIH0sXHJcblxyXG4gICAgX3NldFZhbDogZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgdGhpcy5fdmFsdWVWYWwgPSBNYXRoLnJvdW5kKHZhbHVlKTtcclxuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhTVigpO1xyXG4gICAgfSxcclxuXHJcbiAgICBfc2V0UjogZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgdGhpcy5fdmFsdWVSID0gTWF0aC5yb3VuZCh2YWx1ZSk7XHJcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JSR0IoKTtcclxuICAgIH0sXHJcblxyXG4gICAgX3NldEc6IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgICAgIHRoaXMuX3ZhbHVlRyA9IE1hdGgucm91bmQodmFsdWUpO1xyXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9yUkdCKCk7XHJcbiAgICB9LFxyXG5cclxuICAgIF9zZXRCOiBmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgICAgICB0aGlzLl92YWx1ZUIgPSBNYXRoLnJvdW5kKHZhbHVlKTtcclxuICAgICAgICB0aGlzLl91cGRhdGVDb2xvclJHQigpO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXHJcblxyXG4gICAgX29uSW5wdXRIdWVDaGFuZ2U6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgaW5wdXQgPSB0aGlzLl9pbnB1dEh1ZSxcclxuICAgICAgICAgICAgaW5wdXRWYWwgPSB0aGlzLl9nZXRWYWx1ZUNvbnRyYWluZWQoaW5wdXQsIHRoaXMuX3ZhbHVlSHVlTWluTWF4KTtcclxuXHJcbiAgICAgICAgdmFyIG1pbk1heCA9IHRoaXMuX3ZhbHVlSHVlTWluTWF4O1xyXG5cclxuICAgICAgICBpZiAoaW5wdXRWYWwgPT0gbWluTWF4WzFdKSB7XHJcbiAgICAgICAgICAgIGlucHV0VmFsID0gbWluTWF4WzBdO1xyXG4gICAgICAgICAgICBpbnB1dC5zZXRWYWx1ZShpbnB1dFZhbCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLl9zZXRIdWUoaW5wdXRWYWwpO1xyXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9yUkdCRnJvbUhTVigpO1xyXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySEVYRnJvbVJHQigpO1xyXG4gICAgICAgIHRoaXMuX3VwZGF0ZUhhbmRsZVNsaWRlcigpO1xyXG5cclxuICAgICAgICB0aGlzLl9kcmF3Q2FudmFzRmllbGQoKTtcclxuICAgIH0sXHJcblxyXG4gICAgX29uSW5wdXRTYXRDaGFuZ2U6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLl9zZXRTYXQodGhpcy5fZ2V0VmFsdWVDb250cmFpbmVkKHRoaXMuX2lucHV0U2F0LCB0aGlzLl92YWx1ZVNhdE1pbk1heCkpO1xyXG4gICAgICAgIHRoaXMuX29uSW5wdXRTVkNoYW5nZSgpO1xyXG4gICAgfSxcclxuXHJcbiAgICBfb25JbnB1dFZhbENoYW5nZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuX3NldFZhbCh0aGlzLl9nZXRWYWx1ZUNvbnRyYWluZWQodGhpcy5faW5wdXRWYWwsIHRoaXMuX3ZhbHVlVmFsTWluTWF4KSk7XHJcbiAgICAgICAgdGhpcy5fb25JbnB1dFNWQ2hhbmdlKCk7XHJcbiAgICB9LFxyXG5cclxuICAgIF9vbklucHV0UkNoYW5nZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuX3NldFIodGhpcy5fZ2V0VmFsdWVDb250cmFpbmVkKHRoaXMuX2lucHV0UiwgdGhpcy5fdmFsdWVSR0JNaW5NYXgpKTtcclxuICAgICAgICB0aGlzLl9vbklucHV0UkdCQ2hhbmdlKCk7XHJcbiAgICB9LFxyXG5cclxuICAgIF9vbklucHV0R0NoYW5nZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuX3NldEcodGhpcy5fZ2V0VmFsdWVDb250cmFpbmVkKHRoaXMuX2lucHV0RywgdGhpcy5fdmFsdWVSR0JNaW5NYXgpKTtcclxuICAgICAgICB0aGlzLl9vbklucHV0UkdCQ2hhbmdlKCk7XHJcbiAgICB9LFxyXG5cclxuICAgIF9vbklucHV0QkNoYW5nZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuX3NldEIodGhpcy5fZ2V0VmFsdWVDb250cmFpbmVkKHRoaXMuX2lucHV0QiwgdGhpcy5fdmFsdWVSR0JNaW5NYXgpKTtcclxuICAgICAgICB0aGlzLl9vbklucHV0UkdCQ2hhbmdlKCk7XHJcbiAgICB9LFxyXG5cclxuICAgIF9vbklucHV0SEVYRmluaXNoOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIGlucHV0ID0gdGhpcy5faW5wdXRIRVgsXHJcbiAgICAgICAgICAgIHZhbHVlID0gaW5wdXQuZ2V0UHJvcGVydHkoJ3ZhbHVlJyk7XHJcblxyXG4gICAgICAgIGlmICghQ29sb3JVdGlsLmlzVmFsaWRIRVgodmFsdWUpKSB7XHJcbiAgICAgICAgICAgIGlucHV0LnNldFByb3BlcnR5KCd2YWx1ZScsIHRoaXMuX3ZhbHVlSEVYVmFsaWQpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLl92YWx1ZUhFWCA9IHRoaXMuX3ZhbHVlSEVYVmFsaWQgPSB2YWx1ZTtcclxuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckZyb21IRVgoKTtcclxuICAgIH0sXHJcblxyXG4gICAgX29uSW5wdXRTVkNoYW5nZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9yUkdCRnJvbUhTVigpO1xyXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySEVYRnJvbVJHQigpO1xyXG4gICAgICAgIHRoaXMuX3VwZGF0ZUhhbmRsZUZpZWxkKCk7XHJcbiAgICB9LFxyXG5cclxuICAgIF9vbklucHV0UkdCQ2hhbmdlOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIU1ZGcm9tUkdCKCk7XHJcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIRVhGcm9tUkdCKCk7XHJcbiAgICAgICAgdGhpcy5fdXBkYXRlSGFuZGxlcygpO1xyXG4gICAgfSxcclxuXHJcbiAgICBfZ2V0VmFsdWVDb250cmFpbmVkOiBmdW5jdGlvbiAoaW5wdXQsIG1pbk1heCkge1xyXG4gICAgICAgIHZhciBpbnB1dFZhbCA9IE1hdGgucm91bmQoaW5wdXQuZ2V0VmFsdWUoKSksXHJcbiAgICAgICAgICAgIG1pbiA9IG1pbk1heFswXSxcclxuICAgICAgICAgICAgbWF4ID0gbWluTWF4WzFdO1xyXG5cclxuICAgICAgICBpZiAoaW5wdXRWYWwgPD0gbWluKSB7XHJcbiAgICAgICAgICAgIGlucHV0VmFsID0gbWluO1xyXG4gICAgICAgICAgICBpbnB1dC5zZXRWYWx1ZShpbnB1dFZhbCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChpbnB1dFZhbCA+PSBtYXgpIHtcclxuICAgICAgICAgICAgaW5wdXRWYWwgPSBtYXg7XHJcbiAgICAgICAgICAgIGlucHV0LnNldFZhbHVlKGlucHV0VmFsKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBpbnB1dFZhbDtcclxuICAgIH0sXHJcblxyXG5cclxuICAgIF91cGRhdGVJbnB1dEh1ZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuX2lucHV0SHVlLnNldFZhbHVlKHRoaXMuX3ZhbHVlSHVlKTtcclxuICAgIH0sXHJcbiAgICBfdXBkYXRlSW5wdXRTYXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLl9pbnB1dFNhdC5zZXRWYWx1ZSh0aGlzLl92YWx1ZVNhdCk7XHJcbiAgICB9LFxyXG4gICAgX3VwZGF0ZUlucHV0VmFsOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5faW5wdXRWYWwuc2V0VmFsdWUodGhpcy5fdmFsdWVWYWwpO1xyXG4gICAgfSxcclxuICAgIF91cGRhdGVJbnB1dFI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLl9pbnB1dFIuc2V0VmFsdWUodGhpcy5fdmFsdWVSKTtcclxuICAgIH0sXHJcbiAgICBfdXBkYXRlSW5wdXRHOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5faW5wdXRHLnNldFZhbHVlKHRoaXMuX3ZhbHVlRyk7XHJcbiAgICB9LFxyXG4gICAgX3VwZGF0ZUlucHV0QjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuX2lucHV0Qi5zZXRWYWx1ZSh0aGlzLl92YWx1ZUIpO1xyXG4gICAgfSxcclxuICAgIF91cGRhdGVJbnB1dEhFWDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuX2lucHV0SEVYLnNldFByb3BlcnR5KCd2YWx1ZScsIHRoaXMuX3ZhbHVlSEVYKTtcclxuICAgIH0sXHJcblxyXG5cclxuICAgIF9zZXRDb2xvckhTVjogZnVuY3Rpb24gKGh1ZSwgc2F0LCB2YWwpIHtcclxuICAgICAgICB0aGlzLl92YWx1ZUh1ZSA9IGh1ZTtcclxuICAgICAgICB0aGlzLl92YWx1ZVNhdCA9IHNhdDtcclxuICAgICAgICB0aGlzLl92YWx1ZVZhbCA9IHZhbDtcclxuXHJcbiAgICAgICAgdGhpcy5fdXBkYXRlSW5wdXRIdWUoKTtcclxuICAgICAgICB0aGlzLl91cGRhdGVJbnB1dFNhdCgpO1xyXG4gICAgICAgIHRoaXMuX3VwZGF0ZUlucHV0VmFsKCk7XHJcblxyXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbnRyYXN0Q3VyckNvbG9yKCk7XHJcbiAgICB9LFxyXG5cclxuICAgIF9zZXRDb2xvclJHQjogZnVuY3Rpb24gKHIsIGcsIGIpIHtcclxuICAgICAgICB0aGlzLl92YWx1ZVIgPSByO1xyXG4gICAgICAgIHRoaXMuX3ZhbHVlRyA9IGc7XHJcbiAgICAgICAgdGhpcy5fdmFsdWVCID0gYjtcclxuXHJcbiAgICAgICAgdGhpcy5fdXBkYXRlSW5wdXRSKCk7XHJcbiAgICAgICAgdGhpcy5fdXBkYXRlSW5wdXRHKCk7XHJcbiAgICAgICAgdGhpcy5fdXBkYXRlSW5wdXRCKCk7XHJcblxyXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbnRyYXN0Q3VyckNvbG9yKCk7XHJcbiAgICB9LFxyXG5cclxuICAgIF9zZXRDb2xvckhFWDogZnVuY3Rpb24gKGhleCkge1xyXG4gICAgICAgIHRoaXMuX3ZhbHVlSEVYID0gaGV4O1xyXG4gICAgICAgIHRoaXMuX3VwZGF0ZUlucHV0SEVYKCk7XHJcbiAgICB9LFxyXG5cclxuICAgIF91cGRhdGVDb2xvckhTVjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuX3NldENvbG9ySFNWKHRoaXMuX3ZhbHVlSHVlLCB0aGlzLl92YWx1ZVNhdCwgdGhpcy5fdmFsdWVWYWwpO1xyXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbnRyYXN0Q3VyckNvbG9yKCk7XHJcbiAgICB9LFxyXG5cclxuICAgIF91cGRhdGVDb2xvclJHQjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuX3NldENvbG9yUkdCKHRoaXMuX3ZhbHVlUiwgdGhpcy5fdmFsdWVHLCB0aGlzLl92YWx1ZUIpO1xyXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbnRyYXN0Q3VyckNvbG9yKCk7XHJcbiAgICB9LFxyXG5cclxuICAgIF91cGRhdGVDb2xvckhTVkZyb21SR0I6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgaHN2ID0gQ29sb3JVdGlsLlJHQjJIU1YodGhpcy5fdmFsdWVSLCB0aGlzLl92YWx1ZUcsIHRoaXMuX3ZhbHVlQik7XHJcbiAgICAgICAgdGhpcy5fc2V0Q29sb3JIU1YoaHN2WzBdLCBoc3ZbMV0sIGhzdlsyXSk7XHJcbiAgICB9LFxyXG5cclxuICAgIF91cGRhdGVDb2xvclJHQkZyb21IU1Y6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgcmdiID0gQ29sb3JVdGlsLkhTVjJSR0IodGhpcy5fdmFsdWVIdWUsIHRoaXMuX3ZhbHVlU2F0LCB0aGlzLl92YWx1ZVZhbCk7XHJcbiAgICAgICAgdGhpcy5fc2V0Q29sb3JSR0IocmdiWzBdLCByZ2JbMV0sIHJnYlsyXSk7XHJcbiAgICB9LFxyXG5cclxuICAgIF91cGRhdGVDb2xvckhFWEZyb21SR0I6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgaGV4ID0gQ29sb3JVdGlsLlJHQjJIRVgodGhpcy5fdmFsdWVSLCB0aGlzLl92YWx1ZUcsIHRoaXMuX3ZhbHVlQik7XHJcbiAgICAgICAgdGhpcy5fc2V0Q29sb3JIRVgoaGV4KTtcclxuICAgIH0sXHJcblxyXG4gICAgX3VwZGF0ZUNvbG9yRnJvbUhFWDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciByZ2IgPSBDb2xvclV0aWwuSEVYMlJHQih0aGlzLl92YWx1ZUhFWCk7XHJcblxyXG4gICAgICAgIHRoaXMuX3NldENvbG9yUkdCKHJnYlswXSwgcmdiWzFdLCByZ2JbMl0pO1xyXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySFNWRnJvbVJHQigpO1xyXG4gICAgICAgIHRoaXMuX3VwZGF0ZUhhbmRsZXMoKTtcclxuICAgIH0sXHJcblxyXG4gICAgX3VwZGF0ZUNvbnRyYXN0Q3VyckNvbG9yOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5fc2V0Q29udHJhc3RDdXJyQ29sb3IodGhpcy5fdmFsdWVSLCB0aGlzLl92YWx1ZUcsIHRoaXMuX3ZhbHVlQik7XHJcbiAgICB9LFxyXG4gICAgX3VwZGF0ZUNvbnRyYXN0UHJldkNvbG9yOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5fc2V0Q29udHJhc1ByZXZDb2xvcih0aGlzLl92YWx1ZVIsIHRoaXMuX3ZhbHVlRywgdGhpcy5fdmFsdWVCKVxyXG4gICAgfSxcclxuXHJcbiAgICBfc2V0Q29udHJhc3RDdXJyQ29sb3I6IGZ1bmN0aW9uIChyLCBnLCBiKSB7XHJcbiAgICAgICAgdGhpcy5fY29sb3JDdXJyTm9kZS5zZXRTdHlsZVByb3BlcnR5KCdiYWNrZ3JvdW5kJywgJ3JnYignICsgciArICcsJyArIGcgKyAnLCcgKyBiICsgJyknKVxyXG4gICAgfSxcclxuICAgIF9zZXRDb250cmFzUHJldkNvbG9yOiBmdW5jdGlvbiAociwgZywgYikge1xyXG4gICAgICAgIHRoaXMuX2NvbG9yUHJldk5vZGUuc2V0U3R5bGVQcm9wZXJ0eSgnYmFja2dyb3VuZCcsICdyZ2IoJyArIHIgKyAnLCcgKyBnICsgJywnICsgYiArICcpJylcclxuICAgIH0sXHJcblxyXG4gICAgX29uSGVhZERyYWdTdGFydDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBub2RlID0gdGhpcy5fbm9kZSxcclxuICAgICAgICAgICAgcGFyZW50Tm9kZSA9IHRoaXMuX3BhcmVudE5vZGU7XHJcblxyXG4gICAgICAgIHZhciBub2RlUG9zID0gbm9kZS5nZXRQb3NpdGlvbkdsb2JhbCgpLFxyXG4gICAgICAgICAgICBtb3VzZVBvcyA9IE1vdXNlLmdldCgpLmdldFBvc2l0aW9uKCksXHJcbiAgICAgICAgICAgIG9mZnNldFBvcyA9IHRoaXMuX21vdXNlT2Zmc2V0O1xyXG5cclxuICAgICAgICBvZmZzZXRQb3NbMF0gPSBtb3VzZVBvc1swXSAtIG5vZGVQb3NbMF07XHJcbiAgICAgICAgb2Zmc2V0UG9zWzFdID0gbW91c2VQb3NbMV0gLSBub2RlUG9zWzFdO1xyXG5cclxuICAgICAgICB2YXIgZXZlbnRNb3VzZU1vdmUgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsXHJcbiAgICAgICAgICAgIGV2ZW50TW91c2VVcCA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XHJcblxyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgICAgICAgdmFyIG9uRHJhZyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZVBvc2l0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVDYW52YXNOb2RlUG9zaXRpb25zKCk7XHJcbiAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICBvbkRyYWdFbmQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVDYW52YXNOb2RlUG9zaXRpb25zKCk7XHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW91c2VNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcclxuICAgICAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcGFyZW50Tm9kZS5yZW1vdmVDaGlsZChub2RlKTtcclxuICAgICAgICBwYXJlbnROb2RlLmFkZENoaWxkKG5vZGUpO1xyXG5cclxuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcclxuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VVcCwgb25EcmFnRW5kLCBmYWxzZSk7XHJcblxyXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNhbnZhc05vZGVQb3NpdGlvbnMoKTtcclxuICAgIH0sXHJcblxyXG4gICAgX3VwZGF0ZVBvc2l0aW9uOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIG1vdXNlUG9zID0gTW91c2UuZ2V0KCkuZ2V0UG9zaXRpb24oKSxcclxuICAgICAgICAgICAgb2Zmc2V0UG9zID0gdGhpcy5fbW91c2VPZmZzZXQ7XHJcblxyXG4gICAgICAgIHZhciBjdXJyUG9zaXRpb25YID0gbW91c2VQb3NbMF0gLSBvZmZzZXRQb3NbMF0sXHJcbiAgICAgICAgICAgIGN1cnJQb3NpdGlvblkgPSBtb3VzZVBvc1sxXSAtIG9mZnNldFBvc1sxXTtcclxuXHJcbiAgICAgICAgdmFyIG5vZGUgPSB0aGlzLl9ub2RlLFxyXG4gICAgICAgICAgICBoZWFkID0gdGhpcy5faGVhZE5vZGUsXHJcbiAgICAgICAgICAgIHBvc2l0aW9uID0gdGhpcy5fcG9zaXRpb247XHJcblxyXG4gICAgICAgIHZhciBtYXhYID0gd2luZG93LmlubmVyV2lkdGggLSBub2RlLmdldFdpZHRoKCksXHJcbiAgICAgICAgICAgIG1heFkgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSBoZWFkLmdldEhlaWdodCgpO1xyXG5cclxuICAgICAgICBwb3NpdGlvblswXSA9IE1hdGgubWF4KDAsIE1hdGgubWluKGN1cnJQb3NpdGlvblgsIG1heFgpKTtcclxuICAgICAgICBwb3NpdGlvblsxXSA9IE1hdGgubWF4KDAsIE1hdGgubWluKGN1cnJQb3NpdGlvblksIG1heFkpKTtcclxuXHJcbiAgICAgICAgbm9kZS5zZXRQb3NpdGlvbkdsb2JhbChwb3NpdGlvblswXSwgcG9zaXRpb25bMV0pO1xyXG4gICAgfSxcclxuXHJcbiAgICBfZHJhd0NhbnZhc0ZpZWxkOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhc0ZpZWxkLFxyXG4gICAgICAgICAgICBjb250ZXh0ID0gdGhpcy5fY29udGV4dENhbnZhc0ZpZWxkO1xyXG5cclxuICAgICAgICB2YXIgd2lkdGggPSBjYW52YXMud2lkdGgsXHJcbiAgICAgICAgICAgIGhlaWdodCA9IGNhbnZhcy5oZWlnaHQsXHJcbiAgICAgICAgICAgIGludldpZHRoID0gMSAvIHdpZHRoLFxyXG4gICAgICAgICAgICBpbnZIZWlnaHQgPSAxIC8gaGVpZ2h0O1xyXG5cclxuICAgICAgICB2YXIgaW1hZ2VEYXRhID0gdGhpcy5faW1hZ2VEYXRhRmllbGQsXHJcbiAgICAgICAgICAgIHJnYiA9IFtdLFxyXG4gICAgICAgICAgICBpbmRleCA9IDA7XHJcblxyXG4gICAgICAgIHZhciB2YWx1ZUh1ZSA9IHRoaXMuX3ZhbHVlSHVlO1xyXG5cclxuICAgICAgICB2YXIgaSA9IC0xLCBqO1xyXG4gICAgICAgIHdoaWxlICgrK2kgPCBoZWlnaHQpIHtcclxuICAgICAgICAgICAgaiA9IC0xO1xyXG5cclxuICAgICAgICAgICAgd2hpbGUgKCsraiA8IHdpZHRoKSB7XHJcbiAgICAgICAgICAgICAgICByZ2IgPSBDb2xvclV0aWwuSFNWMlJHQih2YWx1ZUh1ZSwgaiAqIGludldpZHRoICogMTAwLjAsICggMS4wIC0gaSAqIGludkhlaWdodCApICogMTAwLjApO1xyXG4gICAgICAgICAgICAgICAgaW5kZXggPSAoaSAqIHdpZHRoICsgaikgKiA0O1xyXG5cclxuICAgICAgICAgICAgICAgIGltYWdlRGF0YS5kYXRhW2luZGV4XSA9IHJnYlswXTtcclxuICAgICAgICAgICAgICAgIGltYWdlRGF0YS5kYXRhW2luZGV4ICsgMV0gPSByZ2JbMV07XHJcbiAgICAgICAgICAgICAgICBpbWFnZURhdGEuZGF0YVtpbmRleCArIDJdID0gcmdiWzJdO1xyXG4gICAgICAgICAgICAgICAgaW1hZ2VEYXRhLmRhdGFbaW5kZXggKyAzXSA9IDI1NTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29udGV4dC5wdXRJbWFnZURhdGEoaW1hZ2VEYXRhLCAwLCAwKTtcclxuICAgIH0sXHJcblxyXG4gICAgX2RyYXdDYW52YXNTbGlkZXI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzU2xpZGVyLFxyXG4gICAgICAgICAgICBjb250ZXh0ID0gdGhpcy5fY29udGV4dENhbnZhc1NsaWRlcjtcclxuXHJcbiAgICAgICAgdmFyIHdpZHRoID0gY2FudmFzLndpZHRoLFxyXG4gICAgICAgICAgICBoZWlnaHQgPSBjYW52YXMuaGVpZ2h0LFxyXG4gICAgICAgICAgICBpbnZIZWlnaHQgPSAxIC8gaGVpZ2h0O1xyXG5cclxuICAgICAgICB2YXIgaW1hZ2VEYXRhID0gdGhpcy5faW1hZ2VEYXRhU2xpZGVyLFxyXG4gICAgICAgICAgICByZ2IgPSBbXSxcclxuICAgICAgICAgICAgaW5kZXggPSAwO1xyXG5cclxuICAgICAgICB2YXIgaSA9IC0xLCBqO1xyXG4gICAgICAgIHdoaWxlICgrK2kgPCBoZWlnaHQpIHtcclxuICAgICAgICAgICAgaiA9IC0xO1xyXG5cclxuICAgICAgICAgICAgd2hpbGUgKCsraiA8IHdpZHRoKSB7XHJcbiAgICAgICAgICAgICAgICByZ2IgPSBDb2xvclV0aWwuSFNWMlJHQigoMS4wIC0gaSAqIGludkhlaWdodCkgKiAzNjAuMCwgMTAwLjAsIDEwMC4wKTtcclxuICAgICAgICAgICAgICAgIGluZGV4ID0gKGkgKiB3aWR0aCArIGopICogNDtcclxuXHJcbiAgICAgICAgICAgICAgICBpbWFnZURhdGEuZGF0YVtpbmRleF0gPSByZ2JbMF07XHJcbiAgICAgICAgICAgICAgICBpbWFnZURhdGEuZGF0YVtpbmRleCArIDFdID0gcmdiWzFdO1xyXG4gICAgICAgICAgICAgICAgaW1hZ2VEYXRhLmRhdGFbaW5kZXggKyAyXSA9IHJnYlsyXTtcclxuICAgICAgICAgICAgICAgIGltYWdlRGF0YS5kYXRhW2luZGV4ICsgM10gPSAyNTU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnRleHQucHV0SW1hZ2VEYXRhKGltYWdlRGF0YSwgMCwgMCk7XHJcblxyXG4gICAgfSxcclxuXHJcbiAgICBfb25DYW52YXNGaWVsZE1vdXNlRG93bjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBldmVudE1vdXNlTW92ZSA9IERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSxcclxuICAgICAgICAgICAgZXZlbnRNb3VzZVVwID0gRG9jdW1lbnRFdmVudC5NT1VTRV9VUDtcclxuXHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICAgICAgICB2YXIgb25EcmFnID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgc2VsZi5fZHJhd0hhbmRsZUZpZWxkKCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIG9uRHJhZ0VuZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZU1vdmUsIG9uRHJhZywgZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlVXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcclxuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VVcCwgb25EcmFnRW5kLCBmYWxzZSk7XHJcblxyXG4gICAgICAgIHNlbGYuX2RyYXdIYW5kbGVGaWVsZCgpO1xyXG4gICAgfSxcclxuXHJcbiAgICBfb25DYW52YXNTbGlkZXJNb3VzZURvd246IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgZXZlbnRNb3VzZU1vdmUgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsXHJcbiAgICAgICAgICAgIGV2ZW50TW91c2VVcCA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XHJcblxyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgICAgICAgdmFyIG9uRHJhZyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHNlbGYuX2RyYXdIYW5kbGVTbGlkZXIoKTtcclxuICAgICAgICAgICAgICAgIHNlbGYuX2RyYXdDYW52YXNGaWVsZCgpO1xyXG4gICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAgICAgb25EcmFnRW5kID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCBmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW91c2VVcCwgb25EcmFnRW5kLCBmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICBzZWxmLl9kcmF3Q2FudmFzRmllbGQoKTtcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCBmYWxzZSk7XHJcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlVXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xyXG5cclxuICAgICAgICBzZWxmLl9kcmF3SGFuZGxlU2xpZGVyKCk7XHJcbiAgICAgICAgc2VsZi5fZHJhd0NhbnZhc0ZpZWxkKCk7XHJcbiAgICB9LFxyXG5cclxuICAgIF9zZXRTaXplQ2FudmFzRmllbGQ6IGZ1bmN0aW9uICh3aWR0aCwgaGVpZ2h0KSB7XHJcbiAgICAgICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhc0ZpZWxkO1xyXG4gICAgICAgIGNhbnZhcy5zdHlsZS53aWR0aCA9IHdpZHRoICsgJ3B4JztcclxuICAgICAgICBjYW52YXMuc3R5bGUuaGVpZ2h0ID0gaGVpZ2h0ICsgJ3B4JztcclxuICAgICAgICBjYW52YXMud2lkdGggPSB3aWR0aDtcclxuICAgICAgICBjYW52YXMuaGVpZ2h0ID0gaGVpZ2h0O1xyXG5cclxuICAgIH0sXHJcblxyXG4gICAgX3NldFNpemVDYW52YXNTbGlkZXI6IGZ1bmN0aW9uICh3aWR0aCwgaGVpZ2h0KSB7XHJcbiAgICAgICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhc1NsaWRlcjtcclxuICAgICAgICBjYW52YXMuc3R5bGUud2lkdGggPSB3aWR0aCArICdweCc7XHJcbiAgICAgICAgY2FudmFzLnN0eWxlLmhlaWdodCA9IGhlaWdodCArICdweCc7XHJcbiAgICAgICAgY2FudmFzLndpZHRoID0gd2lkdGg7XHJcbiAgICAgICAgY2FudmFzLmhlaWdodCA9IGhlaWdodDtcclxuICAgIH0sXHJcblxyXG4gICAgb3BlbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBub2RlID0gdGhpcy5fbm9kZTtcclxuXHJcbiAgICAgICAgdGhpcy5fcGFyZW50Tm9kZS5hZGRDaGlsZChub2RlKTtcclxuXHJcbiAgICAgICAgdmFyIHBvc2l0aW9uID0gdGhpcy5fcG9zaXRpb247XHJcbiAgICAgICAgaWYocG9zaXRpb25bMF0gPT09IG51bGwgfHwgcG9zaXRpb25bMV0gPT09IG51bGwpe1xyXG4gICAgICAgICAgICBwb3NpdGlvblswXSA9IHdpbmRvdy5pbm5lcldpZHRoICogMC41IC0gbm9kZS5nZXRXaWR0aCgpICogMC41O1xyXG4gICAgICAgICAgICBwb3NpdGlvblsxXSA9IHdpbmRvdy5pbm5lckhlaWdodCAqIDAuNSAtIG5vZGUuZ2V0SGVpZ2h0KCkgKiAwLjU7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcG9zaXRpb25bMF0gPSBNYXRoLm1heCgwLE1hdGgubWluKHBvc2l0aW9uWzBdLHdpbmRvdy5pbm5lcldpZHRoIC0gbm9kZS5nZXRXaWR0aCgpKSk7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uWzFdID0gTWF0aC5tYXgoMCxNYXRoLm1pbihwb3NpdGlvblsxXSx3aW5kb3cuaW5uZXJIZWlnaHQgLSBub2RlLmdldEhlaWdodCgpKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBub2RlLnNldFBvc2l0aW9uR2xvYmFsKHBvc2l0aW9uWzBdLHBvc2l0aW9uWzFdKTtcclxuICAgICAgICB0aGlzLl91cGRhdGVDYW52YXNOb2RlUG9zaXRpb25zKCk7XHJcbiAgICB9LFxyXG5cclxuICAgIGNsb3NlOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5fcGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLl9ub2RlKTtcclxuICAgIH0sXHJcblxyXG4gICAgX29uQ2xvc2U6IGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgZS5jYW5jZWxCdWJibGUgPSB0cnVlO1xyXG4gICAgICAgIHRoaXMuY2xvc2UoKTtcclxuICAgIH0sXHJcbiAgICBfb25QaWNrOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5fY2FsbGJhY2tQaWNrKCk7XHJcbiAgICAgICAgdGhpcy5jbG9zZSgpO1xyXG4gICAgfSxcclxuXHJcbiAgICBfdXBkYXRlQ2FudmFzTm9kZVBvc2l0aW9uczogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBjYW52YXNTbGlkZXJQb3MgPSB0aGlzLl9jYW52YXNTbGlkZXJQb3MsXHJcbiAgICAgICAgICAgIGNhbnZhc0ZpZWxkUG9zID0gdGhpcy5fY2FudmFzRmllbGRQb3M7XHJcblxyXG4gICAgICAgIGNhbnZhc1NsaWRlclBvc1swXSA9IGNhbnZhc1NsaWRlclBvc1sxXSA9IDA7XHJcbiAgICAgICAgY2FudmFzRmllbGRQb3NbMF0gPSBjYW52YXNGaWVsZFBvc1sxXSA9IDA7XHJcblxyXG4gICAgICAgIHZhciBlbGVtZW50ID0gdGhpcy5fY2FudmFzU2xpZGVyO1xyXG5cclxuICAgICAgICB3aGlsZSAoZWxlbWVudCkge1xyXG4gICAgICAgICAgICBjYW52YXNTbGlkZXJQb3NbMF0gKz0gZWxlbWVudC5vZmZzZXRMZWZ0O1xyXG4gICAgICAgICAgICBjYW52YXNTbGlkZXJQb3NbMV0gKz0gZWxlbWVudC5vZmZzZXRUb3A7XHJcbiAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50Lm9mZnNldFBhcmVudDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGVsZW1lbnQgPSB0aGlzLl9jYW52YXNGaWVsZDtcclxuXHJcbiAgICAgICAgd2hpbGUgKGVsZW1lbnQpIHtcclxuICAgICAgICAgICAgY2FudmFzRmllbGRQb3NbMF0gKz0gZWxlbWVudC5vZmZzZXRMZWZ0O1xyXG4gICAgICAgICAgICBjYW52YXNGaWVsZFBvc1sxXSArPSBlbGVtZW50Lm9mZnNldFRvcDtcclxuICAgICAgICAgICAgZWxlbWVudCA9IGVsZW1lbnQub2Zmc2V0UGFyZW50O1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgc2V0Q2FsbGJhY2tQaWNrOiBmdW5jdGlvbiAoZnVuYykge1xyXG4gICAgICAgIHRoaXMuX2NhbGxiYWNrUGljayA9IGZ1bmM7XHJcbiAgICB9LFxyXG5cclxuICAgIHNldENvbG9ySEVYOiBmdW5jdGlvbiAoaGV4KSB7XHJcbiAgICAgICAgdGhpcy5fc2V0Q29sb3JIRVgoaGV4KTtcclxuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckZyb21IRVgoKTtcclxuICAgICAgICB0aGlzLl9zZXRDb2xvcigpO1xyXG4gICAgfSxcclxuXHJcbiAgICBzZXRDb2xvclJHQjogZnVuY3Rpb24gKHIsIGcsIGIpIHtcclxuICAgICAgICB0aGlzLl9zZXRDb2xvclJHQihyLCBnLCBiKTtcclxuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhFWEZyb21SR0IoKTtcclxuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhTVkZyb21SR0IoKTtcclxuICAgICAgICB0aGlzLl9zZXRDb2xvcigpO1xyXG4gICAgfSxcclxuXHJcbiAgICBzZXRDb2xvclJHQmZ2OiBmdW5jdGlvbiAociwgZywgYikge1xyXG4gICAgICAgIHRoaXMuc2V0Q29sb3JSR0IoTWF0aC5mbG9vcihyICogMjU1LjApLFxyXG4gICAgICAgICAgICBNYXRoLmZsb29yKGcgKiAyNTUuMCksXHJcbiAgICAgICAgICAgIE1hdGguZmxvb3IoYiAqIDI1NS4wKSk7XHJcbiAgICB9LFxyXG5cclxuICAgIHNldENvbG9ySFNWOiBmdW5jdGlvbiAoaCwgcywgdikge1xyXG4gICAgICAgIHRoaXMuX3NldENvbG9ySFNWKGgsIHMsIHYpO1xyXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9yUkdCRnJvbUhTVigpO1xyXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySEVYRnJvbVJHQigpO1xyXG4gICAgICAgIHRoaXMuX3NldENvbG9yKCk7XHJcbiAgICB9LFxyXG5cclxuICAgIF9zZXRDb2xvcjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuX2RyYXdDYW52YXNGaWVsZCgpO1xyXG4gICAgICAgIHRoaXMuX2RyYXdDYW52YXNTbGlkZXIoKTtcclxuICAgICAgICB0aGlzLl91cGRhdGVIYW5kbGVzKCk7XHJcbiAgICAgICAgdGhpcy5fc2V0Q29udHJhc1ByZXZDb2xvcih0aGlzLl92YWx1ZVIsIHRoaXMuX3ZhbHVlRywgdGhpcy5fdmFsdWVCKTtcclxuICAgIH0sXHJcblxyXG4gICAgZ2V0UjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl92YWx1ZVI7XHJcbiAgICB9LFxyXG4gICAgZ2V0RzogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl92YWx1ZUc7XHJcbiAgICB9LFxyXG4gICAgZ2V0QjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl92YWx1ZUI7XHJcbiAgICB9LFxyXG4gICAgZ2V0UkdCOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIFt0aGlzLl92YWx1ZVIsIHRoaXMuX3ZhbHVlRywgdGhpcy5fdmFsdWVCXTtcclxuICAgIH0sXHJcbiAgICBnZXRIdWU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fdmFsdWVIdWU7XHJcbiAgICB9LFxyXG4gICAgZ2V0U2F0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX3ZhbHVlU2F0O1xyXG4gICAgfSxcclxuICAgIGdldFZhbDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl92YWx1ZVZhbDtcclxuICAgIH0sXHJcbiAgICBnZXRIU1Y6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gW3RoaXMuX3ZhbHVlSHVlLCB0aGlzLl92YWx1ZVNhdCwgdGhpcy5fdmFsdWVWYWxdO1xyXG4gICAgfSxcclxuICAgIGdldEhFWDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl92YWx1ZUhFWDtcclxuICAgIH0sXHJcbiAgICBnZXRSR0JmdjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiBbdGhpcy5fdmFsdWVSIC8gMjU1LjAsIHRoaXMuX3ZhbHVlRyAvIDI1NS4wLCB0aGlzLl92YWx1ZUIgLyAyNTUuMF07XHJcbiAgICB9LFxyXG5cclxuICAgIGdldE5vZGU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fbm9kZTtcclxuICAgIH1cclxufTtcclxuXHJcblBpY2tlci5zZXR1cCA9IGZ1bmN0aW9uIChwYXJlbnROb2RlKSB7XHJcbiAgICByZXR1cm4gUGlja2VyLl9pbnN0YW5jZSA9IG5ldyBQaWNrZXIocGFyZW50Tm9kZSk7XHJcbn07XHJcblBpY2tlci5nZXQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gUGlja2VyLl9pbnN0YW5jZTtcclxufTtcclxuUGlja2VyLmRlc3Ryb3kgPSBmdW5jdGlvbigpe1xyXG4gICAgUGlja2VyLl9pbnN0YW5jZSA9IG51bGw7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFBpY2tlcjtcclxuIiwidmFyIFNWR0NvbXBvbmVudCA9IHJlcXVpcmUoJy4vU1ZHQ29tcG9uZW50Jyk7XHJcblxyXG5mdW5jdGlvbiBQbG90dGVyKHBhcmVudCxvYmplY3QsdmFsdWUscGFyYW1zKSB7XHJcbiAgICBwYXJhbXMgPSBwYXJhbXMgfHwge307XHJcbiAgICBwYXJhbXMubGluZVdpZHRoICA9IHBhcmFtcy5saW5lV2lkdGggIHx8IDI7XHJcbiAgICBwYXJhbXMubGluZUNvbG9yICA9IHBhcmFtcy5saW5lQ29sb3IgIHx8IFsyNTUsMjU1LDI1NV07XHJcblxyXG4gICAgU1ZHQ29tcG9uZW50LmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcclxuXHJcbiAgICB2YXIgbGluZVdpZHRoID0gdGhpcy5fbGluZVdpZHRoID0gcGFyYW1zLmxpbmVXaWR0aDtcclxuICAgIHZhciBsaW5lQ29sb3IgPSBwYXJhbXMubGluZUNvbG9yO1xyXG5cclxuICAgIHZhciBncmlkID0gdGhpcy5fZ3JpZCA9IHRoaXMuX3N2Z1Jvb3QuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdwYXRoJykpO1xyXG4gICAgICAgIGdyaWQuc3R5bGUuc3Ryb2tlID0gJ3JnYigyNiwyOSwzMSknO1xyXG5cclxuICAgIHZhciBwYXRoID0gdGhpcy5fcGF0aCA9IHRoaXMuX3N2Z1Jvb3QuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdwYXRoJykpO1xyXG4gICAgICAgIHBhdGguc3R5bGUuc3Ryb2tlICAgICAgPSAncmdiKCcrbGluZUNvbG9yWzBdKycsJytsaW5lQ29sb3JbMV0rJywnK2xpbmVDb2xvclsyXSsnKSc7XHJcbiAgICAgICAgcGF0aC5zdHlsZS5zdHJva2VXaWR0aCA9IGxpbmVXaWR0aCA7XHJcbiAgICAgICAgcGF0aC5zdHlsZS5maWxsICAgICAgICA9ICdub25lJztcclxufVxyXG5QbG90dGVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoU1ZHQ29tcG9uZW50LnByb3RvdHlwZSk7XHJcblBsb3R0ZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gUGxvdHRlcjtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUGxvdHRlcjtcclxuIiwidmFyIE9iamVjdENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvT2JqZWN0Q29tcG9uZW50Jyk7XHJcbnZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XHJcbnZhciBOdW1iZXJJbnB1dF9JbnRlcm5hbCA9IHJlcXVpcmUoJy4vTnVtYmVySW5wdXRfSW50ZXJuYWwnKTtcclxudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XHJcblxyXG52YXIgRXZlbnRfICAgICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXHJcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKTtcclxuXHJcbnZhciBERUZBVUxUX1NURVAgPSAxLjAsXHJcbiAgICBERUZBVUxUX0RQICAgPSAyO1xyXG5cclxuZnVuY3Rpb24gUmFuZ2UocGFyZW50LCBvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcclxuICAgIE9iamVjdENvbXBvbmVudC5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XHJcblxyXG4gICAgcGFyYW1zICAgICAgICAgID0gcGFyYW1zICAgICAgICAgIHx8IHt9O1xyXG4gICAgcGFyYW1zLm9uQ2hhbmdlID0gcGFyYW1zLm9uQ2hhbmdlIHx8IHRoaXMuX29uQ2hhbmdlO1xyXG4gICAgcGFyYW1zLnN0ZXAgICAgID0gcGFyYW1zLnN0ZXAgfHwgREVGQVVMVF9TVEVQO1xyXG4gICAgcGFyYW1zLmRwICAgICAgID0gKHBhcmFtcy5kcCAhPSBudWxsKSA/IHBhcmFtcy5kcCA6IERFRkFVTFRfRFA7XHJcblxyXG4gICAgdGhpcy5fb25DaGFuZ2UgID0gcGFyYW1zLm9uQ2hhbmdlO1xyXG5cclxuICAgIHZhciBzdGVwID0gdGhpcy5fc3RlcCA9IHBhcmFtcy5zdGVwLFxyXG4gICAgICAgIGRwICAgPSB0aGlzLl9kcCAgID0gcGFyYW1zLmRwO1xyXG5cclxuICAgIC8vRklYTUU6IGhpc3RvcnkgcHVzaCBwb3BcclxuXHJcbiAgICB2YXIgbGFiZWxNaW4gPSBuZXcgTm9kZSgpO1xyXG4gICAgdmFyIGlucHV0TWluID0gdGhpcy5faW5wdXRNaW4gPSBuZXcgTnVtYmVySW5wdXRfSW50ZXJuYWwoc3RlcCxkcCwgdGhpcy5wdXNoSGlzdG9yeVN0YXRlLmJpbmQodGhpcyksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9vbklucHV0TWluQ2hhbmdlLmJpbmQodGhpcykpO1xyXG5cclxuICAgIHZhciBsYWJlbE1heCA9IG5ldyBOb2RlKCk7XHJcbiAgICB2YXIgaW5wdXRNYXggPSB0aGlzLl9pbnB1dE1heCA9IG5ldyBOdW1iZXJJbnB1dF9JbnRlcm5hbChzdGVwLGRwLCB0aGlzLnB1c2hIaXN0b3J5U3RhdGUuYmluZCh0aGlzKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX29uSW5wdXRNYXhDaGFuZ2UuYmluZCh0aGlzKSk7XHJcblxyXG4gICAgdmFyIGxhYmVsTWluV3JhcCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCksXHJcbiAgICAgICAgaW5wdXRNaW5XcmFwID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5XcmFwKSxcclxuICAgICAgICBsYWJlbE1heFdyYXAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApLFxyXG4gICAgICAgIGlucHV0TWF4V3JhcCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCk7XHJcblxyXG4gICAgbGFiZWxNaW4uc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCAnTUlOJyk7XHJcbiAgICBsYWJlbE1heC5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCkuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsICdNQVgnKTtcclxuXHJcbiAgICB2YXIgdmFsdWVzID0gdGhpcy5fb2JqW3RoaXMuX2tleV07XHJcblxyXG4gICAgaW5wdXRNaW4uc2V0VmFsdWUodmFsdWVzWzBdKTtcclxuICAgIGlucHV0TWF4LnNldFZhbHVlKHZhbHVlc1sxXSk7XHJcblxyXG4gICAgdmFyIHdyYXAgPSB0aGlzLl93cmFwTm9kZTtcclxuXHJcbiAgICBsYWJlbE1pbldyYXAuYWRkQ2hpbGQobGFiZWxNaW4pO1xyXG4gICAgaW5wdXRNaW5XcmFwLmFkZENoaWxkKGlucHV0TWluLmdldE5vZGUoKSk7XHJcbiAgICBsYWJlbE1heFdyYXAuYWRkQ2hpbGQobGFiZWxNYXgpO1xyXG4gICAgaW5wdXRNYXhXcmFwLmFkZENoaWxkKGlucHV0TWF4LmdldE5vZGUoKSk7XHJcblxyXG4gICAgd3JhcC5hZGRDaGlsZChsYWJlbE1pbldyYXApO1xyXG4gICAgd3JhcC5hZGRDaGlsZChpbnB1dE1pbldyYXApO1xyXG4gICAgd3JhcC5hZGRDaGlsZChsYWJlbE1heFdyYXApO1xyXG4gICAgd3JhcC5hZGRDaGlsZChpbnB1dE1heFdyYXApO1xyXG59XHJcblJhbmdlLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZSk7XHJcblJhbmdlLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFJhbmdlO1xyXG5cclxuUmFuZ2UucHJvdG90eXBlLl9vbklucHV0Q2hhbmdlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCwgbnVsbCkpO1xyXG4gICAgdGhpcy5fb25DaGFuZ2UoKTtcclxufTtcclxuXHJcblJhbmdlLnByb3RvdHlwZS5fdXBkYXRlVmFsdWVNaW4gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgdmFsdWVzID0gdGhpcy5fb2JqW3RoaXMuX2tleV07XHJcblxyXG4gICAgdmFyIGlucHV0TWluID0gdGhpcy5faW5wdXRNaW4sXHJcbiAgICAgICAgaW5wdXRWYWx1ZSA9IGlucHV0TWluLmdldFZhbHVlKCk7XHJcblxyXG4gICAgaWYgKGlucHV0VmFsdWUgPj0gdGhpcy5faW5wdXRNYXguZ2V0VmFsdWUoKSkge1xyXG4gICAgICAgIGlucHV0TWluLnNldFZhbHVlKHZhbHVlc1swXSk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdmFsdWVzWzBdID0gaW5wdXRWYWx1ZTtcclxuXHJcbn07XHJcblxyXG5SYW5nZS5wcm90b3R5cGUuX3VwZGF0ZVZhbHVlTWF4ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHZhbHVlcyA9IHRoaXMuX29ialt0aGlzLl9rZXldO1xyXG5cclxuICAgIHZhciBpbnB1dE1heCA9IHRoaXMuX2lucHV0TWF4LFxyXG4gICAgICAgIGlucHV0VmFsdWUgPSBpbnB1dE1heC5nZXRWYWx1ZSgpO1xyXG5cclxuICAgIGlmIChpbnB1dFZhbHVlIDw9IHRoaXMuX2lucHV0TWluLmdldFZhbHVlKCkpIHtcclxuICAgICAgICBpbnB1dE1heC5zZXRWYWx1ZSh2YWx1ZXNbMV0pO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHZhbHVlc1sxXSA9IGlucHV0VmFsdWU7XHJcbn07XHJcblxyXG5cclxuUmFuZ2UucHJvdG90eXBlLm9uVmFsdWVVcGRhdGUgPSBmdW5jdGlvbiAoZSkge1xyXG4gICAgaWYgKGUuZGF0YS5vcmlnaW4gPT0gdGhpcyl7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgaWYgKGUuZGF0YS5vcmlnaW4gPT0gbnVsbCkge1xyXG4gICAgfVxyXG4gICAgdmFyIG8gPSB0aGlzLl9vYmosayA9IHRoaXMuX2tleTtcclxuICAgIHRoaXMuX2lucHV0TWluLnNldFZhbHVlKG9ba11bMF0pO1xyXG4gICAgdGhpcy5faW5wdXRNYXguc2V0VmFsdWUob1trXVsxXSk7XHJcbn07XHJcblxyXG5SYW5nZS5wcm90b3R5cGUuc2V0VmFsdWUgPSBmdW5jdGlvbih2YWx1ZSl7XHJcbiAgICB2YXIgbyA9IHRoaXMuX29iaixrID0gdGhpcy5fa2V5O1xyXG4gICAgb1trXVswXSA9IHZhbHVlWzBdO1xyXG4gICAgb1trXVsxXSA9IHZhbHVlWzFdO1xyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcyxDb21wb25lbnRFdmVudC5WQUxVRV9VUERBVEVELG51bGwpKTtcclxufTtcclxuXHJcblJhbmdlLnByb3RvdHlwZS5fb25JbnB1dE1pbkNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuX3VwZGF0ZVZhbHVlTWluKCk7XHJcbiAgICB0aGlzLl9vbklucHV0Q2hhbmdlKCk7XHJcbn07XHJcblxyXG5SYW5nZS5wcm90b3R5cGUuX29uSW5wdXRNYXhDaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLl91cGRhdGVWYWx1ZU1heCgpO1xyXG4gICAgdGhpcy5fb25JbnB1dENoYW5nZSgpO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSYW5nZTsiLCJ2YXIgQ29tcG9uZW50ID0gcmVxdWlyZSgnLi8uLi9jb3JlL0NvbXBvbmVudCcpO1xyXG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcclxudmFyIE1ldHJpYyA9IHJlcXVpcmUoJy4vTWV0cmljJyk7XHJcbnZhciBHcm91cEV2ZW50ID0gcmVxdWlyZSgnLi4vZ3JvdXAvR3JvdXBFdmVudCcpO1xyXG5cclxuZnVuY3Rpb24gU1ZHKHBhcmVudCwgcGFyYW1zKSB7XHJcbiAgICBDb21wb25lbnQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxuXHJcbiAgICB2YXIgd3JhcCA9IHRoaXMuX3dyYXBOb2RlO1xyXG4gICAgICAgIHdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuQ2FudmFzV3JhcCk7XHJcbiAgICB2YXIgd3JhcFNpemUgPSB3cmFwLmdldFdpZHRoKCk7XHJcblxyXG4gICAgdmFyIHN2ZyA9IHRoaXMuX3N2ZyA9IHRoaXMuX2NyZWF0ZVNWR09iamVjdCgnc3ZnJyk7XHJcbiAgICAgICAgc3ZnLnNldEF0dHJpYnV0ZSgndmVyc2lvbicsICcxLjInKTtcclxuICAgICAgICBzdmcuc2V0QXR0cmlidXRlKCdiYXNlUHJvZmlsZScsICd0aW55Jyk7XHJcbiAgICAgICAgc3ZnLnNldEF0dHJpYnV0ZSgncHJlc2VydmVBc3BlY3RSYXRpbycsICd0cnVlJyk7XHJcblxyXG4gICAgd3JhcC5nZXRFbGVtZW50KCkuYXBwZW5kQ2hpbGQoc3ZnKTtcclxuXHJcbiAgICB0aGlzLl9zdmdTZXRTaXplKHdyYXBTaXplLCB3cmFwU2l6ZSk7XHJcbiAgICB0aGlzLl91cGRhdGVIZWlnaHQoKTtcclxuXHJcbiAgICB0aGlzLl9ub2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkNhbnZhc0xpc3RJdGVtKTtcclxuXHJcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LkdST1VQX1NJWkVfQ0hBTkdFLCB0aGlzLCAnb25Hcm91cFNpemVDaGFuZ2UnKTtcclxuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LkdST1VQX1NJWkVfVVBEQVRFLCB0aGlzLl9wYXJlbnQsICdvbkdyb3VwU2l6ZVVwZGF0ZScpO1xyXG59XHJcblNWRy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKENvbXBvbmVudC5wcm90b3R5cGUpO1xyXG5TVkcucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU1ZHO1xyXG5cclxuU1ZHLnByb3RvdHlwZS5fdXBkYXRlSGVpZ2h0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHN2Z0hlaWdodCA9IE51bWJlcih0aGlzLl9zdmcuZ2V0QXR0cmlidXRlKCdoZWlnaHQnKSk7XHJcbiAgICB0aGlzLl93cmFwTm9kZS5zZXRIZWlnaHQoc3ZnSGVpZ2h0KTtcclxuICAgIHRoaXMuX25vZGUuc2V0SGVpZ2h0KHN2Z0hlaWdodCArIE1ldHJpYy5QQURESU5HX1dSQVBQRVIpO1xyXG59O1xyXG5cclxuU1ZHLnByb3RvdHlwZS5vbkdyb3VwU2l6ZUNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciB3aWR0aCA9IHRoaXMuX3dyYXBOb2RlLmdldFdpZHRoKCk7XHJcbiAgICB0aGlzLl9zdmdTZXRTaXplKHdpZHRoLCB3aWR0aCk7XHJcbiAgICB0aGlzLl91cGRhdGVIZWlnaHQoKTtcclxufTtcclxuXHJcblNWRy5wcm90b3R5cGUuX3N2Z1NldFNpemUgPSBmdW5jdGlvbiAod2lkdGgsIGhlaWdodCkge1xyXG4gICAgdmFyIHN2ZyA9IHRoaXMuX3N2ZztcclxuICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgd2lkdGgpO1xyXG4gICAgc3ZnLnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgaGVpZ2h0KTtcclxuICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ3ZpZXdib3gnLCAnMCAwICcgKyB3aWR0aCArICcgJyArIGhlaWdodCk7XHJcbn07XHJcblxyXG5TVkcucHJvdG90eXBlLmdldFNWRyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLl9zdmc7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFNWRzsiLCJ2YXIgT2JqZWN0Q29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY29yZS9PYmplY3RDb21wb25lbnQnKTtcclxudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XHJcbnZhciBHcm91cEV2ZW50ID0gcmVxdWlyZSgnLi4vZ3JvdXAvR3JvdXBFdmVudCcpO1xyXG52YXIgTWV0cmljID0gcmVxdWlyZSgnLi9NZXRyaWMnKTtcclxuXHJcbmZ1bmN0aW9uIFNWR0NvbXBvbmVudChwYXJlbnQsb2JqZWN0LHZhbHVlLHBhcmFtcyl7XHJcbiAgICBPYmplY3RDb21wb25lbnQuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xyXG5cclxuICAgIHZhciB3cmFwID0gdGhpcy5fd3JhcE5vZGU7XHJcbiAgICAgICAgd3JhcC5zZXRTdHlsZUNsYXNzKENTUy5TVkdXcmFwKTtcclxuICAgIHZhciB3cmFwU2l6ZSA9IHdyYXAuZ2V0V2lkdGgoKTtcclxuXHJcbiAgICB2YXIgc3ZnID0gdGhpcy5fc3ZnID0gdGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdzdmcnKTtcclxuICAgICAgICBzdmcuc2V0QXR0cmlidXRlKCd2ZXJzaW9uJywgJzEuMicpO1xyXG4gICAgICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ2Jhc2VQcm9maWxlJywgJ3RpbnknKTtcclxuXHJcbiAgICAgICAgd3JhcC5nZXRFbGVtZW50KCkuYXBwZW5kQ2hpbGQoc3ZnKTtcclxuXHJcbiAgICB2YXIgc3ZnUm9vdCA9IHRoaXMuX3N2Z1Jvb3QgPSBzdmcuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdnJykpO1xyXG4gICAgICAgIHN2Z1Jvb3Quc2V0QXR0cmlidXRlKCd0cmFuc2Zvcm0nLCd0cmFuc2xhdGUoMC41IDAuNSknKTtcclxuXHJcbiAgICB0aGlzLl9zdmdTZXRTaXplKHdyYXBTaXplLHdyYXBTaXplKTtcclxuICAgIHRoaXMuX3VwZGF0ZUhlaWdodCgpO1xyXG5cclxuICAgIHRoaXMuX25vZGUuc2V0U3R5bGVDbGFzcyhDU1MuU1ZHTGlzdEl0ZW0pO1xyXG5cclxuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UsIHRoaXMsICdvbkdyb3VwU2l6ZUNoYW5nZScpO1xyXG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuR1JPVVBfU0laRV9VUERBVEUsIHRoaXMuX3BhcmVudCwgJ29uR3JvdXBTaXplVXBkYXRlJyk7XHJcbn1cclxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZSk7XHJcblNWR0NvbXBvbmVudC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTVkdDb21wb25lbnQ7XHJcblxyXG5TVkdDb21wb25lbnQucHJvdG90eXBlLl91cGRhdGVIZWlnaHQgPSBmdW5jdGlvbigpe1xyXG4gICAgdmFyIHN2Z0hlaWdodCA9IE51bWJlcih0aGlzLl9zdmcuZ2V0QXR0cmlidXRlKCdoZWlnaHQnKSk7XHJcblxyXG4gICAgdGhpcy5fd3JhcE5vZGUuc2V0SGVpZ2h0KHN2Z0hlaWdodCk7XHJcbiAgICB0aGlzLl9ub2RlLnNldEhlaWdodChzdmdIZWlnaHQgKyBNZXRyaWMuUEFERElOR19XUkFQUEVSKTtcclxufTtcclxuXHJcblNWR0NvbXBvbmVudC5wcm90b3R5cGUuX3JlZHJhdyA9IGZ1bmN0aW9uKCl7fTtcclxuXHJcblNWR0NvbXBvbmVudC5wcm90b3R5cGUub25Hcm91cFNpemVDaGFuZ2UgPSBmdW5jdGlvbigpe1xyXG4gICAgdmFyIHdpZHRoID0gdGhpcy5fd3JhcE5vZGUuZ2V0V2lkdGgoKTtcclxuXHJcbiAgICB0aGlzLl9zdmdTZXRTaXplKHdpZHRoLHdpZHRoKTtcclxuICAgIHRoaXMuX3VwZGF0ZUhlaWdodCgpO1xyXG4gICAgdGhpcy5fcmVkcmF3KCk7XHJcbn07XHJcblxyXG5TVkdDb21wb25lbnQucHJvdG90eXBlLl9jcmVhdGVTVkdPYmplY3QgPSBmdW5jdGlvbih0eXBlKSB7XHJcbiAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIix0eXBlKTtcclxufTtcclxuXHJcblNWR0NvbXBvbmVudC5wcm90b3R5cGUuX3N2Z1NldFNpemUgPSBmdW5jdGlvbih3aWR0aCxoZWlnaHQpIHtcclxuICAgIHZhciBzdmcgPSB0aGlzLl9zdmc7XHJcbiAgICAgICAgc3ZnLnNldEF0dHJpYnV0ZSgnd2lkdGgnLCAgd2lkdGgpO1xyXG4gICAgICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIGhlaWdodCk7XHJcbiAgICAgICAgc3ZnLnNldEF0dHJpYnV0ZSgndmlld2JveCcsICcwIDAgJyArIHdpZHRoICsgJyAnICsgaGVpZ2h0KTtcclxufTtcclxuXHJcblxyXG5TVkdDb21wb25lbnQucHJvdG90eXBlLl9wYXRoQ21kTW92ZVRvID0gZnVuY3Rpb24gKHgsIHkpIHtcclxuICAgIHJldHVybiAnTSAnICsgeCArICcgJyArIHkgKyAnICc7XHJcbn07XHJcblxyXG5TVkdDb21wb25lbnQucHJvdG90eXBlLl9wYXRoQ21kTGluZVRvID0gZnVuY3Rpb24gKHgsIHkpIHtcclxuICAgIHJldHVybiAnTCAnICsgeCArICcgJyArIHkgKyAnICc7XHJcbn07XHJcblxyXG5TVkdDb21wb25lbnQucHJvdG90eXBlLl9wYXRoQ21kQ2xvc2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gJ1onO1xyXG59O1xyXG5cclxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5fcGF0aENtZExpbmUgPSBmdW5jdGlvbiAoeDAsIHkwLCB4MSwgeTEpIHtcclxuICAgIHJldHVybiAnTSAnICsgeDAgKyAnICcgKyB5MCArICcgTCAnICsgeDEgKyAnICcgKyB5MTtcclxufTtcclxuXHJcblNWR0NvbXBvbmVudC5wcm90b3R5cGUuX3BhdGhDbWRCZXppZXJDdWJpYyA9IGZ1bmN0aW9uIChjbWQsIHgwLCB5MCwgY3gwLCBjeTAsIGN4MSwgY3kxLCB4MSwgeTEpIHtcclxuICAgIHJldHVybiAnTSAnICsgeDAgKyAnICcgKyB5MCArICcgQyAnICsgY3gwICsgJyAnICsgY3kwICsgJywgJyArIGN4MSArICcgJyArIGN5MSArICcsICcgKyB4MSArICcgJyArIHkxO1xyXG59O1xyXG5cclxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5fcGF0aENtZEJlemllclF1YWRyYXRpYyA9IGZ1bmN0aW9uIChjbWQsIHgwLCB5MCwgY3gsIGN5LCB4MSwgeTEpIHtcclxuICAgIHJldHVybiAnTSAnICsgeDAgKyAnICcgKyB5MCArICcgUSAnICsgY3ggKyAnICcgKyBjeSArICcsICcgKyB4MSArICcgJyArIHkxO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTVkdDb21wb25lbnQ7IiwidmFyIE9iamVjdENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvT2JqZWN0Q29tcG9uZW50Jyk7XHJcbnZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XHJcbnZhciBDU1MgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcclxuXHJcbnZhciBPcHRpb25zID0gcmVxdWlyZSgnLi9PcHRpb25zJyk7XHJcblxyXG52YXIgSGlzdG9yeSA9IHJlcXVpcmUoJy4uL2NvcmUvSGlzdG9yeScpO1xyXG5cclxudmFyIEV2ZW50XyAgICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxyXG4gICAgTm9kZUV2ZW50ICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpLFxyXG4gICAgQ29tcG9uZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL0NvbXBvbmVudEV2ZW50JyksXHJcbiAgICBPcHRpb25FdmVudCAgICA9IHJlcXVpcmUoJy4uL2NvcmUvT3B0aW9uRXZlbnQnKTtcclxuXHJcbnZhciBPYmplY3RDb21wb25lbnROb3RpZmllciA9IHJlcXVpcmUoJy4uL2NvcmUvT2JqZWN0Q29tcG9uZW50Tm90aWZpZXInKTtcclxuXHJcbnZhciBTVFJfQ0hPT1NFID0gJ0Nob29zZSAuLi4nO1xyXG5cclxuZnVuY3Rpb24gU2VsZWN0KHBhcmVudCwgb2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XHJcbiAgICBPYmplY3RDb21wb25lbnQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxuXHJcbiAgICBwYXJhbXMgPSBwYXJhbXMgfHwge307XHJcbiAgICBwYXJhbXMub25DaGFuZ2UgPSBwYXJhbXMub25DaGFuZ2UgfHwgdGhpcy5fb25DaGFuZ2U7XHJcbiAgICB0aGlzLl9vbkNoYW5nZSA9IHBhcmFtcy5vbkNoYW5nZTtcclxuXHJcbiAgICB2YXIgb2JqID0gdGhpcy5fb2JqLFxyXG4gICAgICAgIGtleSA9IHRoaXMuX2tleTtcclxuXHJcbiAgICB2YXIgdGFyZ2V0S2V5ID0gdGhpcy5fdGFyZ2V0S2V5ID0gcGFyYW1zLnRhcmdldCxcclxuICAgICAgICB2YWx1ZXMgPSB0aGlzLl92YWx1ZXMgPSBvYmpba2V5XTtcclxuXHJcblxyXG4gICAgdGhpcy5fc2VsZWN0ZWRJbmRleCA9IC0xO1xyXG4gICAgdGhpcy5fc2VsZWN0ZWQgPSBudWxsO1xyXG5cclxuICAgIHZhciBzZWxlY3QgPSB0aGlzLl9zZWxlY3QgPSBuZXcgTm9kZShOb2RlLklOUFVUX0JVVFRPTik7XHJcbiAgICAgICAgc2VsZWN0LnNldFN0eWxlQ2xhc3MoQ1NTLlNlbGVjdCk7XHJcbiAgICAgICAgc2VsZWN0LmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uT3B0aW9uVHJpZ2dlci5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICBpZih0aGlzLl9oYXNUYXJnZXQoKSkge1xyXG4gICAgICAgIHZhciB0YXJnZXRPYmogPSBvYmpbdGFyZ2V0S2V5XSB8fCAnJztcclxuICAgICAgICB2YXIgaSA9IC0xO1xyXG4gICAgICAgIHdoaWxlICgrK2kgPCB2YWx1ZXMubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIGlmICh0YXJnZXRPYmogPT0gdmFsdWVzW2ldKXtcclxuICAgICAgICAgICAgICAgIHRoaXMuX3NlbGVjdGVkID0gdmFsdWVzW2ldO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHNlbGVjdC5zZXRQcm9wZXJ0eSgndmFsdWUnLCB0YXJnZXRPYmoudG9TdHJpbmcoKS5sZW5ndGggPiAwID8gdGFyZ2V0T2JqIDogdmFsdWVzWzBdKTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIHNlbGVjdC5zZXRQcm9wZXJ0eSgndmFsdWUnLCBwYXJhbXMuc2VsZWN0ZWQgIT09IC0xID8gdmFsdWVzW3BhcmFtcy5zZWxlY3RlZF0gOiBTVFJfQ0hPT1NFKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLl93cmFwTm9kZS5hZGRDaGlsZChzZWxlY3QpO1xyXG5cclxuICAgIE9iamVjdENvbXBvbmVudE5vdGlmaWVyLmdldCgpLmFkZEV2ZW50TGlzdGVuZXIoT3B0aW9uRXZlbnQuVFJJR0dFUiwgdGhpcywgJ29uT3B0aW9uVHJpZ2dlcicpO1xyXG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKE9wdGlvbkV2ZW50LlRSSUdHRVJFRCwgT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIuZ2V0KCksICdvbk9wdGlvblRyaWdnZXJlZCcpO1xyXG59XHJcblNlbGVjdC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE9iamVjdENvbXBvbmVudC5wcm90b3R5cGUpO1xyXG5TZWxlY3QucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU2VsZWN0O1xyXG5cclxuU2VsZWN0LnByb3RvdHlwZS5vbk9wdGlvblRyaWdnZXIgPSBmdW5jdGlvbiAoZSkge1xyXG4gICAgaWYgKGUuZGF0YS5vcmlnaW4gPT0gdGhpcykge1xyXG4gICAgICAgIHRoaXMuX2FjdGl2ZSA9ICF0aGlzLl9hY3RpdmU7XHJcbiAgICAgICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5fYWN0aXZlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2J1aWxkT3B0aW9ucygpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgT3B0aW9ucy5nZXQoKS5jbGVhcigpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB0aGlzLl9hY3RpdmUgPSBmYWxzZTtcclxuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcclxufTtcclxuXHJcblNlbGVjdC5wcm90b3R5cGUuX2J1aWxkT3B0aW9ucyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBvcHRpb25zID0gT3B0aW9ucy5nZXQoKTtcclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgICBvcHRpb25zLmJ1aWxkKHRoaXMuX3ZhbHVlcywgdGhpcy5fc2VsZWN0ZWQsIHRoaXMuX3NlbGVjdCxcclxuICAgICAgICBmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICBzZWxmLmFwcGx5VmFsdWUoKTtcclxuICAgICAgICAgICAgc2VsZi5fYWN0aXZlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcclxuICAgICAgICAgICAgc2VsZi5fc2VsZWN0ZWRJbmRleCA9IG9wdGlvbnMuZ2V0U2VsZWN0ZWRJbmRleCgpO1xyXG4gICAgICAgICAgICBzZWxmLl9vbkNoYW5nZShzZWxmLl9zZWxlY3RlZEluZGV4KTtcclxuICAgICAgICAgICAgb3B0aW9ucy5jbGVhcigpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgc2VsZi5fYWN0aXZlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcclxuICAgICAgICAgICAgb3B0aW9ucy5jbGVhcigpXHJcbiAgICAgICAgfSwgZmFsc2UpO1xyXG59O1xyXG5cclxuU2VsZWN0LnByb3RvdHlwZS5fYXBwbHlTZWxlY3RlZCA9IGZ1bmN0aW9uKHNlbGVjdGVkKXtcclxuICAgIHRoaXMuX3NlbGVjdC5zZXRQcm9wZXJ0eSgndmFsdWUnLHNlbGVjdGVkKTtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCksbnVsbCk7XHJcbn1cclxuXHJcblNlbGVjdC5wcm90b3R5cGUuYXBwbHlWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBpbmRleCA9IE9wdGlvbnMuZ2V0KCkuZ2V0U2VsZWN0ZWRJbmRleCgpLFxyXG4gICAgICAgIHNlbGVjdGVkID0gdGhpcy5fc2VsZWN0ZWQgPSB0aGlzLl92YWx1ZXNbaW5kZXhdO1xyXG5cclxuICAgIGlmICh0aGlzLl9oYXNUYXJnZXQoKSkge1xyXG4gICAgICAgIHRoaXMucHVzaEhpc3RvcnlTdGF0ZSgpO1xyXG4gICAgICAgIHRoaXMuX29ialt0aGlzLl90YXJnZXRLZXldID0gc2VsZWN0ZWQ7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5fYXBwbHlTZWxlY3RlZChzZWxlY3RlZCk7XHJcbn07XHJcblxyXG5TZWxlY3QucHJvdG90eXBlLnB1c2hIaXN0b3J5U3RhdGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgb2JqID0gdGhpcy5fb2JqLFxyXG4gICAgICAgIGtleSA9IHRoaXMuX3RhcmdldEtleTtcclxuICAgIEhpc3RvcnkuZ2V0KCkucHVzaFN0YXRlKG9iaiwga2V5LCBvYmpba2V5XSk7XHJcbn07XHJcblxyXG5TZWxlY3QucHJvdG90eXBlLl9vbk9wdGlvblRyaWdnZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBPcHRpb25FdmVudC5UUklHR0VSRUQsIG51bGwpKTtcclxufTtcclxuXHJcblNlbGVjdC5wcm90b3R5cGUuX3VwZGF0ZUFwcGVhcmFuY2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLl9zZWxlY3Quc2V0U3R5bGVDbGFzcyh0aGlzLl9hY3RpdmUgPyBDU1MuU2VsZWN0QWN0aXZlIDogQ1NTLlNlbGVjdCk7XHJcbn07XHJcblxyXG5TZWxlY3QucHJvdG90eXBlLm9uVmFsdWVVcGRhdGUgPSBmdW5jdGlvbiAoZSkge1xyXG4gICAgaWYgKCF0aGlzLl9oYXNUYXJnZXQoKSl7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdGhpcy5fc2VsZWN0ZWQgPSB0aGlzLl9vYmpbdGhpcy5fdGFyZ2V0S2V5XTtcclxuICAgIHRoaXMuX3NlbGVjdC5zZXRQcm9wZXJ0eSgndmFsdWUnLCB0aGlzLl9zZWxlY3RlZC50b1N0cmluZygpKTtcclxufTtcclxuXHJcblNlbGVjdC5wcm90b3R5cGUuX2hhc1RhcmdldCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLl90YXJnZXRLZXkgIT0gbnVsbDtcclxufTtcclxuXHJcblNlbGVjdC5wcm90b3R5cGUuc2V0VmFsdWUgPSBmdW5jdGlvbih2YWx1ZSl7XHJcbiAgICB0aGlzLl9zZWxlY3RlZEluZGV4ID0gdmFsdWU7XHJcbiAgICBpZih2YWx1ZSA9PSAtMSl7XHJcbiAgICAgICAgdGhpcy5fc2VsZWN0ZWQgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuX3NlbGVjdC5zZXRQcm9wZXJ0eSgndmFsdWUnLCBTVFJfQ0hPT1NFKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB0aGlzLl9zZWxlY3RlZCA9IHRoaXMuX3ZhbHVlc1t0aGlzLl9zZWxlY3RlZEluZGV4XTtcclxuICAgIHRoaXMuX2FwcGx5U2VsZWN0ZWQodGhpcy5fc2VsZWN0ZWQpO1xyXG59O1xyXG5cclxuU2VsZWN0LnByb3RvdHlwZS5nZXREYXRhID0gZnVuY3Rpb24oKXtcclxuICAgIHZhciBvYmogPSB7fTtcclxuICAgICAgICBvYmpbJ3NlbGVjdGVkSW5kZXgnXSA9IHRoaXMuX3NlbGVjdGVkSW5kZXg7XHJcbiAgICByZXR1cm4gb2JqO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3Q7XHJcbiIsInZhciBPYmplY3RDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jb3JlL09iamVjdENvbXBvbmVudCcpO1xyXG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcclxudmFyIFNsaWRlcl9JbnRlcm5hbCA9IHJlcXVpcmUoJy4vU2xpZGVyX0ludGVybmFsJyk7XHJcblxyXG52YXIgSGlzdG9yeSA9IHJlcXVpcmUoJy4uL2NvcmUvSGlzdG9yeScpO1xyXG52YXIgUmFuZ2UgPSByZXF1aXJlKCcuL1JhbmdlJyk7XHJcbnZhciBOdW1iZXJJbnB1dF9JbnRlcm5hbCA9IHJlcXVpcmUoJy4vTnVtYmVySW5wdXRfSW50ZXJuYWwnKTtcclxuXHJcbnZhciBFdmVudF8gICAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcclxuICAgIERvY3VtZW50RXZlbnQgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXHJcbiAgICBQYW5lbEV2ZW50ICAgICA9IHJlcXVpcmUoJy4uL2dyb3VwL1BhbmVsRXZlbnQnKSxcclxuICAgIEdyb3VwRXZlbnQgICAgID0gcmVxdWlyZSgnLi4vZ3JvdXAvR3JvdXBFdmVudCcpLFxyXG4gICAgQ29tcG9uZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL0NvbXBvbmVudEV2ZW50Jyk7XHJcblxyXG52YXIgREVGQVVMVF9TVEVQID0gMS4wLFxyXG4gICAgREVGQVVMVF9EUCAgID0gMjtcclxuXHJcblxyXG5mdW5jdGlvbiBTbGlkZXIocGFyZW50LG9iamVjdCx2YWx1ZSxyYW5nZSxwYXJhbXMpIHtcclxuICAgIHBhcmFtcyAgICAgICAgICA9IHBhcmFtcyAgICAgICAgICB8fCB7fTtcclxuICAgIHBhcmFtcy5sYWJlbCAgICA9IHBhcmFtcy5sYWJlbCAgICB8fCB2YWx1ZTtcclxuXHJcbiAgICBPYmplY3RDb21wb25lbnQuYXBwbHkodGhpcyxbcGFyZW50LG9iamVjdCxyYW5nZSxwYXJhbXNdKTtcclxuXHJcbiAgICB0aGlzLl92YWx1ZXMgID0gdGhpcy5fb2JqW3RoaXMuX2tleV07XHJcbiAgICB0aGlzLl90YXJnZXRLZXkgPSB2YWx1ZTtcclxuXHJcbiAgICBwYXJhbXMuc3RlcCAgICAgPSBwYXJhbXMuc3RlcCAgICAgfHwgREVGQVVMVF9TVEVQO1xyXG4gICAgcGFyYW1zLmRwICAgICAgID0gKHBhcmFtcy5kcCA9PT0gdW5kZWZpbmVkIHx8IHBhcmFtcy5kcCA9PSBudWxsKSA/ICBERUZBVUxUX0RQIDogcGFyYW1zLmRwO1xyXG4gICAgcGFyYW1zLm9uQ2hhbmdlID0gcGFyYW1zLm9uQ2hhbmdlIHx8IHRoaXMuX29uQ2hhbmdlO1xyXG4gICAgcGFyYW1zLm9uRmluaXNoID0gcGFyYW1zLm9uRmluaXNoIHx8IGZ1bmN0aW9uKCl7fTtcclxuXHJcbiAgICB0aGlzLl9kcCAgICAgICA9IHBhcmFtcy5kcDtcclxuICAgIHRoaXMuX29uQ2hhbmdlID0gcGFyYW1zLm9uQ2hhbmdlO1xyXG4gICAgdGhpcy5fb25GaW5pc2ggPSBwYXJhbXMub25GaW5pc2g7XHJcblxyXG4gICAgdmFyIHZhbHVlcyAgICA9IHRoaXMuX3ZhbHVlcyxcclxuICAgICAgICBvYmogICAgICAgPSB0aGlzLl9vYmosXHJcbiAgICAgICAgdGFyZ2V0S2V5ID0gdGhpcy5fdGFyZ2V0S2V5O1xyXG5cclxuICAgIHZhciB3cmFwICA9IHRoaXMuX3dyYXBOb2RlO1xyXG4gICAgICAgIHdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcFNsaWRlcik7XHJcblxyXG4gICAgdmFyIHNsaWRlciA9IHRoaXMuX3NsaWRlciA9IG5ldyBTbGlkZXJfSW50ZXJuYWwod3JhcCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX29uU2xpZGVyQmVnaW4uYmluZCh0aGlzKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX29uU2xpZGVyTW92ZS5iaW5kKHRoaXMpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fb25TbGlkZXJFbmQuYmluZCh0aGlzKSk7XHJcblxyXG4gICAgc2xpZGVyLnNldEJvdW5kTWF4KHZhbHVlc1sxXSk7XHJcbiAgICBzbGlkZXIuc2V0Qm91bmRNaW4odmFsdWVzWzBdKTtcclxuICAgIHNsaWRlci5zZXRWYWx1ZShvYmpbdGFyZ2V0S2V5XSk7XHJcblxyXG4gICAgdmFyIGlucHV0ICA9IHRoaXMuX2lucHV0ID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHBhcmFtcy5zdGVwLCBwYXJhbXMuZHAsIG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fb25JbnB1dENoYW5nZS5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICBpbnB1dC5zZXRWYWx1ZShvYmpbdGFyZ2V0S2V5XSk7XHJcblxyXG4gICAgd3JhcC5hZGRDaGlsZChpbnB1dC5nZXROb2RlKCkpO1xyXG5cclxuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKFBhbmVsRXZlbnQuUEFORUxfTU9WRV9FTkQsICAgIHRoaXMsICdvblBhbmVsTW92ZUVuZCcpO1xyXG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSwgdGhpcywgJ29uR3JvdXBXaWR0aENoYW5nZScpO1xyXG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5XSU5ET1dfUkVTSVpFLCAgdGhpcywgJ29uV2luZG93UmVzaXplJyk7XHJcbn1cclxuU2xpZGVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZSk7XHJcblNsaWRlci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTbGlkZXI7XHJcblxyXG5TbGlkZXIucHJvdG90eXBlLnB1c2hIaXN0b3J5U3RhdGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgb2JqID0gdGhpcy5fb2JqLFxyXG4gICAgICAgIGtleSA9IHRoaXMuX3RhcmdldEtleTtcclxuICAgIEhpc3RvcnkuZ2V0KCkucHVzaFN0YXRlKG9iaiwga2V5LCBvYmpba2V5XSk7XHJcbn07XHJcblxyXG5TbGlkZXIucHJvdG90eXBlLl9vblNsaWRlckJlZ2luID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5wdXNoSGlzdG9yeVN0YXRlKCk7XHJcbn07XHJcblxyXG5TbGlkZXIucHJvdG90eXBlLl9vblNsaWRlck1vdmUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLmFwcGx5VmFsdWUoKTtcclxuICAgIHRoaXMuX3VwZGF0ZVZhbHVlRmllbGQoKTtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIG51bGwpKTtcclxuICAgIHRoaXMuX29uQ2hhbmdlKCk7XHJcbn07XHJcblxyXG5TbGlkZXIucHJvdG90eXBlLl9vblNsaWRlckVuZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuYXBwbHlWYWx1ZSgpO1xyXG4gICAgdGhpcy5fdXBkYXRlVmFsdWVGaWVsZCgpO1xyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCwgbnVsbCkpO1xyXG4gICAgdGhpcy5fb25GaW5pc2goKTtcclxufTtcclxuXHJcblNsaWRlci5wcm90b3R5cGUuX29uSW5wdXRDaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgaW5wdXQgPSB0aGlzLl9pbnB1dCxcclxuICAgICAgICB2YWx1ZU1pbiA9IHRoaXMuX3ZhbHVlc1swXSxcclxuICAgICAgICB2YWx1ZU1heCA9IHRoaXMuX3ZhbHVlc1sxXTtcclxuXHJcbiAgICBpZiAoaW5wdXQuZ2V0VmFsdWUoKSA+PSB2YWx1ZU1heCl7XHJcbiAgICAgICAgaW5wdXQuc2V0VmFsdWUodmFsdWVNYXgpO1xyXG4gICAgfVxyXG4gICAgaWYgKGlucHV0LmdldFZhbHVlKCkgPD0gdmFsdWVNaW4pe1xyXG4gICAgICAgIGlucHV0LnNldFZhbHVlKHZhbHVlTWluKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgdmFsdWUgPSBpbnB1dC5nZXRWYWx1ZSgpO1xyXG5cclxuICAgIHRoaXMuX3NsaWRlci5zZXRWYWx1ZSh2YWx1ZSk7XHJcbiAgICB0aGlzLl9vYmpbdGhpcy5fdGFyZ2V0S2V5XSA9IHZhbHVlO1xyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCwgbnVsbCkpO1xyXG4gICAgdGhpcy5fb25GaW5pc2goKTtcclxufTtcclxuXHJcblNsaWRlci5wcm90b3R5cGUuYXBwbHlWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciB2YWx1ZSAgPSB0aGlzLl9zbGlkZXIuZ2V0VmFsdWUoKTtcclxuICAgIHRoaXMuX29ialt0aGlzLl90YXJnZXRLZXldID0gcGFyc2VGbG9hdCh2YWx1ZS50b0ZpeGVkKHRoaXMuX2RwKSk7XHJcbiAgICB0aGlzLl9pbnB1dC5zZXRWYWx1ZSh2YWx1ZSk7XHJcbn07XHJcblxyXG5cclxuU2xpZGVyLnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24gKGUpIHtcclxuICAgIHZhciBvcmlnaW4gPSBlLmRhdGEub3JpZ2luO1xyXG4gICAgaWYgKG9yaWdpbiA9PSB0aGlzKXtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB2YXIgc2xpZGVyID0gdGhpcy5fc2xpZGVyO1xyXG4gICAgaWYgKCEob3JpZ2luIGluc3RhbmNlb2YgU2xpZGVyKSkge1xyXG4gICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLl92YWx1ZXM7XHJcbiAgICAgICAgc2xpZGVyLnNldEJvdW5kTWluKHZhbHVlc1swXSk7XHJcbiAgICAgICAgc2xpZGVyLnNldEJvdW5kTWF4KHZhbHVlc1sxXSk7XHJcbiAgICAgICAgaWYgKCEob3JpZ2luIGluc3RhbmNlb2YgUmFuZ2UpKSB7XHJcbiAgICAgICAgICAgIHNsaWRlci5zZXRWYWx1ZSh0aGlzLl9vYmpbdGhpcy5fdGFyZ2V0S2V5XSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgc2xpZGVyLnNldFZhbHVlKHRoaXMuX29ialt0aGlzLl90YXJnZXRLZXldKTtcclxuICAgIH1cclxuICAgIHRoaXMuYXBwbHlWYWx1ZSgpO1xyXG59O1xyXG5cclxuXHJcblNsaWRlci5wcm90b3R5cGUuX3VwZGF0ZVZhbHVlRmllbGQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLl9pbnB1dC5zZXRWYWx1ZSh0aGlzLl9zbGlkZXIuZ2V0VmFsdWUoKSk7XHJcbn07XHJcblxyXG5TbGlkZXIucHJvdG90eXBlLm9uUGFuZWxNb3ZlRW5kID1cclxuICAgIFNsaWRlci5wcm90b3R5cGUub25Hcm91cFdpZHRoQ2hhbmdlID1cclxuICAgICAgICBTbGlkZXIucHJvdG90eXBlLm9uV2luZG93UmVzaXplID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB0aGlzLl9zbGlkZXIucmVzZXRPZmZzZXQoKTtcclxuICAgICAgICB9O1xyXG5cclxuU2xpZGVyLnByb3RvdHlwZS5zZXRWYWx1ZSA9IGZ1bmN0aW9uKHZhbHVlKXtcclxuICAgIGlmKHZhbHVlID09IC0xKXtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB0aGlzLl9vYmpbdGhpcy5fdGFyZ2V0S2V5XSA9IHZhbHVlO1xyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcyxDb21wb25lbnRFdmVudC5WQUxVRV9VUERBVEVELG51bGwpKTtcclxufTtcclxuXHJcblNsaWRlci5wcm90b3R5cGUuZ2V0RGF0YSA9IGZ1bmN0aW9uKCl7XHJcbiAgICB2YXIgb2JqID0ge307XHJcbiAgICAgICAgb2JqW3RoaXMuX3RhcmdldEtleV0gPSB0aGlzLl9vYmpbdGhpcy5fdGFyZ2V0S2V5XTtcclxuICAgIHJldHVybiBvYmo7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFNsaWRlcjsiLCJ2YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xyXG5cclxudmFyIERvY3VtZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcclxuICAgIE5vZGVFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50Jyk7XHJcblxyXG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcclxudmFyIE1vdXNlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Nb3VzZScpO1xyXG5cclxuZnVuY3Rpb24gU2xpZGVyX0ludGVybmFsKHBhcmVudE5vZGUsb25CZWdpbixvbkNoYW5nZSxvbkZpbmlzaCkge1xyXG4gICAgdGhpcy5fYm91bmRzID0gWzAsMV07XHJcbiAgICB0aGlzLl92YWx1ZSAgPSAwO1xyXG4gICAgdGhpcy5faW50cnBsID0gMDtcclxuICAgIHRoaXMuX2ZvY3VzICA9IGZhbHNlO1xyXG5cclxuXHJcbiAgICB0aGlzLl9vbkJlZ2luICA9IG9uQmVnaW4gIHx8IGZ1bmN0aW9uKCl7fTtcclxuICAgIHRoaXMuX29uQ2hhbmdlID0gb25DaGFuZ2UgfHwgZnVuY3Rpb24oKXt9O1xyXG4gICAgdGhpcy5fb25GaW5pc2ggPSBvbkZpbmlzaCB8fCBmdW5jdGlvbigpe307XHJcblxyXG5cclxuICAgIHZhciB3cmFwID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5TbGlkZXJXcmFwKTtcclxuICAgIHBhcmVudE5vZGUuYWRkQ2hpbGQod3JhcCk7XHJcblxyXG4gICAgdmFyIHNsb3QgICA9IHRoaXMuX3Nsb3QgICA9IHtub2RlOiAgICBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlNsaWRlclNsb3QpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXRYOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogICAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWRkaW5nOiAzfTtcclxuXHJcbiAgICB2YXIgaGFuZGxlID0gdGhpcy5faGFuZGxlID0ge25vZGUgICAgOiBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlNsaWRlckhhbmRsZSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoICAgOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkcmFnZ2luZzogZmFsc2V9O1xyXG5cclxuICAgIHdyYXAuYWRkQ2hpbGQoc2xvdC5ub2RlKTtcclxuICAgIHNsb3Qubm9kZS5hZGRDaGlsZChoYW5kbGUubm9kZSk7XHJcblxyXG4gICAgc2xvdC5vZmZzZXRYID0gc2xvdC5ub2RlLmdldFBvc2l0aW9uR2xvYmFsWCgpO1xyXG4gICAgc2xvdC53aWR0aCAgID0gTWF0aC5mbG9vcihzbG90Lm5vZGUuZ2V0V2lkdGgoKSAtIHNsb3QucGFkZGluZyAqIDIpIDtcclxuXHJcbiAgICBoYW5kbGUubm9kZS5zZXRXaWR0aChoYW5kbGUud2lkdGgpO1xyXG5cclxuICAgIHNsb3Qubm9kZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLHRoaXMuX29uU2xvdE1vdXNlRG93bi5iaW5kKHRoaXMpKTtcclxuICAgIHNsb3Qubm9kZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9VUCwgIHRoaXMuX29uU2xvdE1vdXNlVXAuYmluZCh0aGlzKSk7XHJcblxyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsdGhpcy5fb25Eb2N1bWVudE1vdXNlTW92ZS5iaW5kKHRoaXMpKTtcclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9VUCwgIHRoaXMuX29uRG9jdW1lbnRNb3VzZVVwLmJpbmQodGhpcykpO1xyXG59XHJcblxyXG5TbGlkZXJfSW50ZXJuYWwucHJvdG90eXBlLl9vbkRvY3VtZW50TW91c2VNb3ZlID0gZnVuY3Rpb24oKXtcclxuICAgIGlmKCF0aGlzLl9oYW5kbGUuZHJhZ2dpbmcpe1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHRoaXMuX3VwZGF0ZSgpO1xyXG4gICAgdGhpcy5fb25DaGFuZ2UoKTtcclxufTtcclxuXHJcblNsaWRlcl9JbnRlcm5hbC5wcm90b3R5cGUuX29uRG9jdW1lbnRNb3VzZVVwID0gZnVuY3Rpb24oKXtcclxuICAgIGlmKHRoaXMuX2hhbmRsZS5kcmFnZ2luZyl7XHJcbiAgICAgICAgdGhpcy5fb25GaW5pc2goKTtcclxuICAgIH1cclxuICAgIHRoaXMuX2hhbmRsZS5kcmFnZ2luZyA9IGZhbHNlO1xyXG59O1xyXG5cclxuU2xpZGVyX0ludGVybmFsLnByb3RvdHlwZS5fb25TbG90TW91c2VEb3duID0gZnVuY3Rpb24oKXtcclxuICAgIHRoaXMuX29uQmVnaW4oKTtcclxuICAgIHRoaXMuX2ZvY3VzID0gdHJ1ZTtcclxuICAgIHRoaXMuX2hhbmRsZS5kcmFnZ2luZyA9IHRydWU7XHJcbiAgICB0aGlzLl9oYW5kbGUubm9kZS5nZXRFbGVtZW50KCkuZm9jdXMoKTtcclxuICAgIHRoaXMuX3VwZGF0ZSgpO1xyXG59O1xyXG5cclxuU2xpZGVyX0ludGVybmFsLnByb3RvdHlwZS5fb25TbG90TW91c2VVcCA9IGZ1bmN0aW9uKCl7XHJcbiAgICBpZiAodGhpcy5fZm9jdXMpIHtcclxuICAgICAgICB2YXIgaGFuZGxlID0gdGhpcy5faGFuZGxlO1xyXG4gICAgICAgIGlmIChoYW5kbGUuZHJhZ2dpbmcpe1xyXG4gICAgICAgICAgICB0aGlzLl9vbkZpbmlzaCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBoYW5kbGUuZHJhZ2dpbmcgPSBmYWxzZTtcclxuICAgIH1cclxuICAgIHRoaXMuX2ZvY3VzID0gZmFsc2U7XHJcbn07XHJcblxyXG5TbGlkZXJfSW50ZXJuYWwucHJvdG90eXBlLl91cGRhdGUgPSBmdW5jdGlvbigpe1xyXG4gICAgdmFyIG14ID0gTW91c2UuZ2V0KCkuZ2V0WCgpLFxyXG4gICAgICAgIHN4ID0gdGhpcy5fc2xvdC5vZmZzZXRYLFxyXG4gICAgICAgIHN3ID0gdGhpcy5fc2xvdC53aWR0aCxcclxuICAgICAgICBweCA9IChteCA8IHN4KSA/IDAgOiAobXggPiAoc3ggKyBzdykpID8gc3cgOiAobXggLSBzeCk7XHJcblxyXG4gICAgdGhpcy5faGFuZGxlLm5vZGUuc2V0V2lkdGgoTWF0aC5yb3VuZChweCkpO1xyXG4gICAgdGhpcy5faW50cnBsID0gcHggLyBzdztcclxuICAgIHRoaXMuX2ludGVycG9sYXRlVmFsdWUoKTtcclxufTtcclxuXHJcblNsaWRlcl9JbnRlcm5hbC5wcm90b3R5cGUuX3VwZGF0ZUhhbmRsZSA9IGZ1bmN0aW9uKCl7XHJcbiAgICB2YXIgc2xvdFdpZHRoICAgPSB0aGlzLl9zbG90LndpZHRoLFxyXG4gICAgICAgIGhhbmRsZVdpZHRoID0gTWF0aC5yb3VuZCh0aGlzLl9pbnRycGwgKiBzbG90V2lkdGgpO1xyXG4gICAgdGhpcy5faGFuZGxlLm5vZGUuc2V0V2lkdGgoTWF0aC5taW4oaGFuZGxlV2lkdGgsc2xvdFdpZHRoKSk7XHJcbn07XHJcblxyXG5TbGlkZXJfSW50ZXJuYWwucHJvdG90eXBlLl9pbnRlcnBvbGF0ZVZhbHVlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGludHJwbCA9IHRoaXMuX2ludHJwbCxcclxuICAgICAgICBib3VuZHMgPSB0aGlzLl9ib3VuZHM7XHJcbiAgICB0aGlzLl92YWx1ZSA9IGJvdW5kc1swXSAqICgxLjAgLSBpbnRycGwpICsgYm91bmRzWzFdICogaW50cnBsO1xyXG59O1xyXG5cclxuU2xpZGVyX0ludGVybmFsLnByb3RvdHlwZS5yZXNldE9mZnNldCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBzbG90ID0gdGhpcy5fc2xvdDtcclxuICAgIHNsb3Qub2Zmc2V0WCA9IHNsb3Qubm9kZS5nZXRQb3NpdGlvbkdsb2JhbFgoKTtcclxuICAgIHNsb3Qud2lkdGggPSBNYXRoLmZsb29yKHNsb3Qubm9kZS5nZXRXaWR0aCgpIC0gc2xvdC5wYWRkaW5nICogMilcclxufTtcclxuXHJcblNsaWRlcl9JbnRlcm5hbC5wcm90b3R5cGUuc2V0Qm91bmRNaW4gPSBmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgIHZhciBib3VuZHMgPSB0aGlzLl9ib3VuZHM7XHJcbiAgICBpZiAodmFsdWUgPj0gYm91bmRzWzFdKXtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBib3VuZHNbMF0gPSB2YWx1ZTtcclxuICAgIHRoaXMuX3VwZGF0ZUZyb21Cb3VuZHMoKTtcclxufTtcclxuXHJcblNsaWRlcl9JbnRlcm5hbC5wcm90b3R5cGUuc2V0Qm91bmRNYXggPSBmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgIHZhciBib3VuZHMgPSB0aGlzLl9ib3VuZHM7XHJcbiAgICBpZiAodmFsdWUgPD0gYm91bmRzWzBdKXtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBib3VuZHNbMV0gPSB2YWx1ZTtcclxuICAgIHRoaXMuX3VwZGF0ZUZyb21Cb3VuZHMoKTtcclxufTtcclxuXHJcblNsaWRlcl9JbnRlcm5hbC5wcm90b3R5cGUuX3VwZGF0ZUZyb21Cb3VuZHMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgYm91bmRzTWluID0gdGhpcy5fYm91bmRzWzBdLFxyXG4gICAgICAgIGJvdW5kc01heCA9IHRoaXMuX2JvdW5kc1sxXTtcclxuICAgIHRoaXMuX3ZhbHVlID0gTWF0aC5tYXgoYm91bmRzTWluLE1hdGgubWluKHRoaXMuX3ZhbHVlLGJvdW5kc01heCkpO1xyXG4gICAgdGhpcy5faW50cnBsID0gTWF0aC5hYnMoKHRoaXMuX3ZhbHVlIC0gYm91bmRzTWluKSAvIChib3VuZHNNaW4gLSBib3VuZHNNYXgpKTtcclxuICAgIHRoaXMuX3VwZGF0ZUhhbmRsZSgpO1xyXG59O1xyXG5cclxuU2xpZGVyX0ludGVybmFsLnByb3RvdHlwZS5zZXRWYWx1ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgdmFyIGJvdW5kc01pbiA9IHRoaXMuX2JvdW5kc1swXSxcclxuICAgICAgICBib3VuZHNNYXggPSB0aGlzLl9ib3VuZHNbMV07XHJcblxyXG4gICAgaWYgKHZhbHVlIDwgYm91bmRzTWluIHx8IHZhbHVlID4gYm91bmRzTWF4KXtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB0aGlzLl9pbnRycGwgPSBNYXRoLmFicygodmFsdWUgLSBib3VuZHNNaW4pIC8gKGJvdW5kc01pbiAtIGJvdW5kc01heCkpO1xyXG4gICAgdGhpcy5fdXBkYXRlSGFuZGxlKCk7XHJcbiAgICB0aGlzLl92YWx1ZSA9IHZhbHVlO1xyXG59O1xyXG5cclxuU2xpZGVyX0ludGVybmFsLnByb3RvdHlwZS5nZXRWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLl92YWx1ZTtcclxufTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFNsaWRlcl9JbnRlcm5hbDsiLCJ2YXIgT2JqZWN0Q29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY29yZS9PYmplY3RDb21wb25lbnQnKTtcclxudmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcclxudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XHJcbnZhciBPcHRpb25zID0gcmVxdWlyZSgnLi9PcHRpb25zJyk7XHJcbnZhciBCdXR0b25QcmVzZXQgPSByZXF1aXJlKCcuL0J1dHRvblByZXNldCcpO1xyXG52YXIgTWV0cmljID0gcmVxdWlyZSgnLi9NZXRyaWMnKTtcclxuXHJcbnZhciBFdmVudF8gPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXHJcbiAgICBEb2N1bWVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXHJcbiAgICBOb2RlRXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpLFxyXG4gICAgQ29tcG9uZW50RXZlbnQgPSAgcmVxdWlyZSgnLi4vY29yZS9Db21wb25lbnRFdmVudCcpO1xyXG5cclxudmFyIERFRkFVTFRfUFJFU0VUID0gbnVsbDtcclxuXHJcbmZ1bmN0aW9uIFN0cmluZ0lucHV0KHBhcmVudCxvYmplY3QsdmFsdWUscGFyYW1zKSB7XHJcbiAgICBPYmplY3RDb21wb25lbnQuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xyXG5cclxuICAgIHBhcmFtcyAgICAgICAgICA9IHBhcmFtcyB8fCB7fTtcclxuICAgIHBhcmFtcy5vbkNoYW5nZSA9IHBhcmFtcy5vbkNoYW5nZSB8fCB0aGlzLl9vbkNoYW5nZTtcclxuICAgIHBhcmFtcy5wcmVzZXRzICA9IHBhcmFtcy5wcmVzZXRzICB8fCBERUZBVUxUX1BSRVNFVDtcclxuXHJcbiAgICB0aGlzLl9vbkNoYW5nZSAgID0gcGFyYW1zLm9uQ2hhbmdlO1xyXG5cclxuICAgIHZhciBpbnB1dCA9IHRoaXMuX2lucHV0ID0gbmV3IE5vZGUoTm9kZS5JTlBVVF9URVhUKTtcclxuXHJcbiAgICB2YXIgd3JhcCA9IHRoaXMuX3dyYXBOb2RlO1xyXG5cclxuICAgIHZhciBwcmVzZXRzID0gcGFyYW1zLnByZXNldHM7XHJcbiAgICBpZiAoIXByZXNldHMpIHtcclxuICAgICAgICB3cmFwLmFkZENoaWxkKGlucHV0KTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIHZhciB3cmFwXyA9IG5ldyBOb2RlKCk7XHJcbiAgICAgICAgd3JhcF8uc2V0U3R5bGVDbGFzcyhDU1MuV3JhcElucHV0V1ByZXNldCk7XHJcblxyXG4gICAgICAgIHdyYXAuYWRkQ2hpbGQod3JhcF8pO1xyXG4gICAgICAgIHdyYXBfLmFkZENoaWxkKGlucHV0KTtcclxuXHJcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBPcHRpb25zLmdldCgpLFxyXG4gICAgICAgICAgICBidG5QcmVzZXQgPSBuZXcgQnV0dG9uUHJlc2V0KHRoaXMuX3dyYXBOb2RlKTtcclxuXHJcbiAgICAgICAgdmFyIG9uUHJlc2V0RGVhY3RpdmF0ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgb3B0aW9ucy5jbGVhcigpO1xyXG4gICAgICAgICAgICBidG5QcmVzZXQuZGVhY3RpdmF0ZSgpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICB2YXIgb25QcmVzZXRBY3RpdmF0ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgb3B0aW9ucy5idWlsZChwcmVzZXRzLFxyXG4gICAgICAgICAgICAgICAgaW5wdXQuZ2V0UHJvcGVydHkoJ3ZhbHVlJyksXHJcbiAgICAgICAgICAgICAgICBpbnB1dCxcclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICBpbnB1dC5zZXRQcm9wZXJ0eSgndmFsdWUnLCBwcmVzZXRzW29wdGlvbnMuZ2V0U2VsZWN0ZWRJbmRleCgpXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5wdXNoSGlzdG9yeVN0YXRlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5hcHBseVZhbHVlKCk7XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgb25QcmVzZXREZWFjdGl2YXRlLFxyXG4gICAgICAgICAgICAgICAgTWV0cmljLlBBRERJTkdfUFJFU0VULFxyXG4gICAgICAgICAgICAgICAgZmFsc2UpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGJ0blByZXNldC5zZXRPbkFjdGl2ZShvblByZXNldEFjdGl2YXRlKTtcclxuICAgICAgICBidG5QcmVzZXQuc2V0T25EZWFjdGl2ZShvblByZXNldERlYWN0aXZhdGUpXHJcbiAgICB9XHJcblxyXG4gICAgaW5wdXQuc2V0UHJvcGVydHkoJ3ZhbHVlJyx0aGlzLl9vYmpbdGhpcy5fa2V5XSk7XHJcblxyXG4gICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuS0VZX1VQLCB0aGlzLl9vbklucHV0S2V5VXAuYmluZCh0aGlzKSk7XHJcbiAgICBpbnB1dC5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5DSEFOR0UsIHRoaXMuX29uSW5wdXRDaGFuZ2UuYmluZCh0aGlzKSk7XHJcblxyXG4gICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25JbnB1dERyYWdTdGFydC5iaW5kKHRoaXMpKTtcclxuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihDb21wb25lbnRFdmVudC5JTlBVVF9TRUxFQ1RfRFJBRyx0aGlzLl9wYXJlbnQsJ29uQ29tcG9uZW50U2VsZWN0RHJhZycpO1xyXG59XHJcblN0cmluZ0lucHV0LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZSk7XHJcblN0cmluZ0lucHV0LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFN0cmluZ0lucHV0O1xyXG5cclxuU3RyaW5nSW5wdXQucHJvdG90eXBlLl9vbklucHV0S2V5VXAgPSBmdW5jdGlvbiAoZSkge1xyXG4gICAgaWYgKHRoaXMuX2tleUlzQ2hhcihlLmtleUNvZGUpKXtcclxuICAgICAgICB0aGlzLnB1c2hIaXN0b3J5U3RhdGUoKTtcclxuICAgIH1cclxuICAgIHRoaXMuYXBwbHlWYWx1ZSgpO1xyXG4gICAgdGhpcy5fb25DaGFuZ2UoKTtcclxufTtcclxuXHJcblN0cmluZ0lucHV0LnByb3RvdHlwZS5fb25JbnB1dENoYW5nZSA9IGZ1bmN0aW9uIChlKSB7XHJcbiAgICBpZiAodGhpcy5fa2V5SXNDaGFyKGUua2V5Q29kZSkpe1xyXG4gICAgICAgIHRoaXMucHVzaEhpc3RvcnlTdGF0ZSgpO1xyXG4gICAgfVxyXG4gICAgdGhpcy5hcHBseVZhbHVlKCk7XHJcbn07XHJcblxyXG4vL1RPRE86IEZpbmlzaCBjaGVja1xyXG5TdHJpbmdJbnB1dC5wcm90b3R5cGUuX2tleUlzQ2hhciA9IGZ1bmN0aW9uIChrZXlDb2RlKSB7XHJcbiAgICByZXR1cm4ga2V5Q29kZSAhPSAxNyAmJlxyXG4gICAgICAgIGtleUNvZGUgIT0gMTggJiZcclxuICAgICAgICBrZXlDb2RlICE9IDIwICYmXHJcbiAgICAgICAga2V5Q29kZSAhPSAzNyAmJlxyXG4gICAgICAgIGtleUNvZGUgIT0gMzggJiZcclxuICAgICAgICBrZXlDb2RlICE9IDM5ICYmXHJcbiAgICAgICAga2V5Q29kZSAhPSA0MCAmJlxyXG4gICAgICAgIGtleUNvZGUgIT0gMTY7XHJcbn07XHJcblxyXG5cclxuU3RyaW5nSW5wdXQucHJvdG90eXBlLmFwcGx5VmFsdWUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLl9vYmpbdGhpcy5fa2V5XSA9IHRoaXMuX2lucHV0LmdldFByb3BlcnR5KCd2YWx1ZScpO1xyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCwgbnVsbCkpO1xyXG59O1xyXG5cclxuU3RyaW5nSW5wdXQucHJvdG90eXBlLm9uVmFsdWVVcGRhdGUgPSBmdW5jdGlvbiAoZSkge1xyXG4gICAgaWYgKGUuZGF0YS5vcmlnaW4gPT0gdGhpcylyZXR1cm47XHJcbiAgICB0aGlzLl9pbnB1dC5zZXRQcm9wZXJ0eSgndmFsdWUnLCB0aGlzLl9vYmpbdGhpcy5fa2V5XSk7XHJcbn07XHJcblxyXG4vL1ByZXZlbnQgY2hyb21lIHNlbGVjdCBkcmFnXHJcblN0cmluZ0lucHV0LnByb3RvdHlwZS5fb25JbnB1dERyYWdTdGFydCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBldmVudE1vdmUgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsXHJcbiAgICAgICAgZXZlbnRVcCA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XHJcblxyXG4gICAgdmFyIGV2ZW50ID0gQ29tcG9uZW50RXZlbnQuSU5QVVRfU0VMRUNUX0RSQUc7XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICB2YXIgb25EcmFnID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBzZWxmLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBldmVudCwgbnVsbCkpO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIG9uRHJhZ0ZpbmlzaCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgc2VsZi5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgZXZlbnQsIG51bGwpKTtcclxuXHJcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcclxuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdmUsIG9uRHJhZ0ZpbmlzaCwgZmFsc2UpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgZXZlbnQsIG51bGwpKTtcclxuXHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnLCBmYWxzZSk7XHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50VXAsIG9uRHJhZ0ZpbmlzaCwgZmFsc2UpO1xyXG59O1xyXG5cclxuU3RyaW5nSW5wdXQucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMub25WYWx1ZVVwZGF0ZSh7IGRhdGE6IHt9IH0pO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTdHJpbmdJbnB1dDsiLCJ2YXIgT3V0cHV0ID0gcmVxdWlyZSgnLi9PdXRwdXQnKTtcclxuXHJcblN0cmluZ091dHB1dCA9IGZ1bmN0aW9uIChwYXJlbnQsIG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xyXG4gICAgT3V0cHV0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcbn07XHJcblN0cmluZ091dHB1dC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE91dHB1dC5wcm90b3R5cGUpO1xyXG5TdHJpbmdPdXRwdXQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU3RyaW5nT3V0cHV0O1xyXG5cclxuU3RyaW5nT3V0cHV0LnByb3RvdHlwZS5fc2V0VmFsdWUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBpZiAodGhpcy5fcGFyZW50LmlzRGlzYWJsZWQoKSkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHZhciB0ZXh0QXJlYVN0cmluZyA9IHRoaXMuX29ialt0aGlzLl9rZXldO1xyXG5cclxuICAgIGlmICh0ZXh0QXJlYVN0cmluZyA9PSB0aGlzLl9wcmV2U3RyaW5nKXtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB2YXIgdGV4dEFyZWEgPSB0aGlzLl90ZXh0QXJlYSxcclxuICAgICAgICB0ZXh0QXJlYUVsZW1lbnQgPSB0ZXh0QXJlYS5nZXRFbGVtZW50KCksXHJcbiAgICAgICAgdGV4dEFyZWFTY3JvbGxIZWlnaHQ7XHJcblxyXG4gICAgdGV4dEFyZWEuc2V0UHJvcGVydHkoJ3ZhbHVlJywgdGV4dEFyZWFTdHJpbmcpO1xyXG4gICAgdGV4dEFyZWFTY3JvbGxIZWlnaHQgPSB0ZXh0QXJlYUVsZW1lbnQuc2Nyb2xsSGVpZ2h0O1xyXG4gICAgdGV4dEFyZWEuc2V0SGVpZ2h0KHRleHRBcmVhU2Nyb2xsSGVpZ2h0KTtcclxuXHJcbiAgICB2YXIgc2Nyb2xsQmFyID0gdGhpcy5fc2Nyb2xsQmFyO1xyXG5cclxuICAgIGlmIChzY3JvbGxCYXIpIHtcclxuICAgICAgICBpZiAodGV4dEFyZWFTY3JvbGxIZWlnaHQgPD0gdGhpcy5fd3JhcE5vZGUuZ2V0SGVpZ2h0KCkpIHtcclxuICAgICAgICAgICAgc2Nyb2xsQmFyLmRpc2FibGUoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHNjcm9sbEJhci5lbmFibGUoKTtcclxuICAgICAgICAgICAgc2Nyb2xsQmFyLnVwZGF0ZSgpO1xyXG4gICAgICAgICAgICBzY3JvbGxCYXIucmVzZXQoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICB0aGlzLl9wcmV2U3RyaW5nID0gdGV4dEFyZWFTdHJpbmc7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFN0cmluZ091dHB1dDtcclxuIiwidmFyIFBsb3R0ZXIgPSByZXF1aXJlKCcuL1Bsb3R0ZXInKTtcclxudmFyIE1ldHJpYyAgPSByZXF1aXJlKCcuL01ldHJpYycpO1xyXG5cclxudmFyIERFRkFVTFRfUkVTT0xVVElPTiA9IDE7XHJcblxyXG5mdW5jdGlvbiBWYWx1ZVBsb3R0ZXIocGFyZW50LG9iamVjdCx2YWx1ZSxwYXJhbXMpIHtcclxuICAgIFBsb3R0ZXIuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xyXG5cclxuICAgIHZhciBzdmcgICAgICAgPSB0aGlzLl9zdmcsXHJcbiAgICAgICAgc3ZnV2lkdGggID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ3dpZHRoJykpLFxyXG4gICAgICAgIHN2Z0hlaWdodCA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCdoZWlnaHQnKSk7XHJcblxyXG4gICAgcGFyYW1zICAgICAgICAgICAgPSBwYXJhbXMgICAgICAgICAgICB8fCB7fTtcclxuICAgIHBhcmFtcy5oZWlnaHQgICAgID0gcGFyYW1zLmhlaWdodCAgICAgfHwgc3ZnSGVpZ2h0O1xyXG4gICAgcGFyYW1zLnJlc29sdXRpb24gPSBwYXJhbXMucmVzb2x1dGlvbiB8fCBERUZBVUxUX1JFU09MVVRJT047XHJcblxyXG4gICAgdmFyIHJlc29sdXRpb24gPSBwYXJhbXMucmVzb2x1dGlvbixcclxuICAgICAgICBsZW5ndGggICAgID0gTWF0aC5mbG9vcihzdmdXaWR0aCAvIHJlc29sdXRpb24pO1xyXG5cclxuICAgIHZhciBwb2ludHMgICAgID0gdGhpcy5fcG9pbnRzICA9IG5ldyBBcnJheShsZW5ndGggKiAyKSxcclxuICAgICAgICBidWZmZXIwICAgID0gdGhpcy5fYnVmZmVyMCA9IG5ldyBBcnJheShsZW5ndGgpLFxyXG4gICAgICAgIGJ1ZmZlcjEgICAgPSB0aGlzLl9idWZmZXIxID0gbmV3IEFycmF5KGxlbmd0aCk7XHJcblxyXG4gICAgdmFyIG1pbiA9IHRoaXMuX2xpbmVXaWR0aCAqIDAuNTtcclxuXHJcbiAgICB2YXIgaSA9IC0xO1xyXG4gICAgd2hpbGUgKCsraSA8IGxlbmd0aCkge1xyXG4gICAgICAgIGJ1ZmZlcjBbaV0gPSBidWZmZXIxW2ldID0gcG9pbnRzW2kgKiAyXSA9IHBvaW50c1tpICogMiArIDFdID0gbWluO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuX2hlaWdodCA9IHBhcmFtcy5oZWlnaHQgPSBwYXJhbXMuaGVpZ2h0ICA8IE1ldHJpYy5DT01QT05FTlRfTUlOX0hFSUdIVCA/XHJcbiAgICAgICAgICAgICAgICAgICBNZXRyaWMuQ09NUE9ORU5UX01JTl9IRUlHSFQgOiBwYXJhbXMuaGVpZ2h0O1xyXG5cclxuICAgIHRoaXMuX3N2Z1NldFNpemUoc3ZnSGVpZ2h0LE1hdGguZmxvb3IocGFyYW1zLmhlaWdodCkpO1xyXG4gICAgdGhpcy5fZ3JpZC5zdHlsZS5zdHJva2UgPSAncmdiKDM5LDQ0LDQ2KSc7XHJcblxyXG4gICAgdGhpcy5fdXBkYXRlSGVpZ2h0KCk7XHJcbiAgICB0aGlzLl9kcmF3VmFsdWUoKTtcclxufVxyXG5WYWx1ZVBsb3R0ZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShQbG90dGVyLnByb3RvdHlwZSk7XHJcblZhbHVlUGxvdHRlci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBWYWx1ZVBsb3R0ZXI7XHJcblxyXG5WYWx1ZVBsb3R0ZXIucHJvdG90eXBlLl9yZWRyYXcgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgcG9pbnRzID0gdGhpcy5fcG9pbnRzLFxyXG4gICAgICAgIGJ1ZmZlckxlbiA9IHRoaXMuX2J1ZmZlcjAubGVuZ3RoO1xyXG5cclxuICAgIHZhciB3aWR0aCA9IE51bWJlcih0aGlzLl9zdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKSxcclxuICAgICAgICByYXRpbyA9IHdpZHRoIC8gKGJ1ZmZlckxlbiAtIDEpO1xyXG5cclxuICAgIHZhciBpID0gLTE7XHJcbiAgICB3aGlsZSAoKytpIDwgYnVmZmVyTGVuKSB7XHJcbiAgICAgICAgcG9pbnRzW2kgKiAyXSA9IHdpZHRoIC0gaSAqIHJhdGlvO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuX2RyYXdWYWx1ZSgpO1xyXG59O1xyXG5cclxuVmFsdWVQbG90dGVyLnByb3RvdHlwZS5vbkdyb3VwU2l6ZUNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciB3aWR0aCA9IHRoaXMuX3dyYXBOb2RlLmdldFdpZHRoKCksXHJcbiAgICAgICAgaGVpZ2h0ID0gdGhpcy5faGVpZ2h0O1xyXG5cclxuICAgIHRoaXMuX3N2Z1NldFNpemUod2lkdGgsIGhlaWdodCk7XHJcbiAgICB0aGlzLl91cGRhdGVIZWlnaHQoKTtcclxuICAgIHRoaXMuX2RyYXdHcmlkKCk7XHJcbiAgICB0aGlzLl9yZWRyYXcoKTtcclxufTtcclxuXHJcblZhbHVlUGxvdHRlci5wcm90b3R5cGUuX2RyYXdWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuX2RyYXdDdXJ2ZSgpO1xyXG59O1xyXG5cclxuVmFsdWVQbG90dGVyLnByb3RvdHlwZS5fZHJhd0dyaWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgc3ZnID0gdGhpcy5fc3ZnO1xyXG5cclxuICAgIHZhciBzdmdXaWR0aCA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKSxcclxuICAgICAgICBzdmdIZWlnaHRIYWxmID0gTWF0aC5mbG9vcihOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnaGVpZ2h0JykpICogMC41KTtcclxuXHJcbiAgICB2YXIgcGF0aENtZCA9ICcnO1xyXG4gICAgICAgIHBhdGhDbWQgKz0gdGhpcy5fcGF0aENtZE1vdmVUbygwLCBzdmdIZWlnaHRIYWxmKTtcclxuICAgICAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRMaW5lVG8oc3ZnV2lkdGgsIHN2Z0hlaWdodEhhbGYpO1xyXG5cclxuICAgIHRoaXMuX2dyaWQuc2V0QXR0cmlidXRlKCdkJywgcGF0aENtZCk7XHJcbn07XHJcblxyXG4vL1RPRE86IG1lcmdlIHVwZGF0ZSArIHBhdGhjbWRcclxuVmFsdWVQbG90dGVyLnByb3RvdHlwZS5fZHJhd0N1cnZlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHN2ZyA9IHRoaXMuX3N2ZztcclxuXHJcbiAgICB2YXIgdmFsdWUgPSB0aGlzLl9vYmpbdGhpcy5fa2V5XTtcclxuXHJcbiAgICB2YXIgYnVmZmVyMCA9IHRoaXMuX2J1ZmZlcjAsXHJcbiAgICAgICAgYnVmZmVyMSA9IHRoaXMuX2J1ZmZlcjEsXHJcbiAgICAgICAgcG9pbnRzID0gdGhpcy5fcG9pbnRzO1xyXG5cclxuICAgIHZhciBidWZmZXJMZW5ndGggPSBidWZmZXIwLmxlbmd0aDtcclxuXHJcbiAgICB2YXIgcGF0aENtZCA9ICcnO1xyXG5cclxuICAgIHZhciBoZWlnaHRIYWxmID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ2hlaWdodCcpKSAqIDAuNSxcclxuICAgICAgICB1bml0ID0gaGVpZ2h0SGFsZiAtIHRoaXMuX2xpbmVXaWR0aCAqIDAuNTtcclxuXHJcbiAgICBwb2ludHNbMV0gPSBidWZmZXIwWzBdO1xyXG4gICAgYnVmZmVyMFtidWZmZXJMZW5ndGggLSAxXSA9ICh2YWx1ZSAqIHVuaXQpICogLTEgKyBNYXRoLmZsb29yKGhlaWdodEhhbGYpO1xyXG5cclxuICAgIHBhdGhDbWQgKz0gdGhpcy5fcGF0aENtZE1vdmVUbyhwb2ludHNbMF0sIHBvaW50c1sxXSk7XHJcblxyXG4gICAgdmFyIGkgPSAwLCBpbmRleDtcclxuXHJcbiAgICB3aGlsZSAoKytpIDwgYnVmZmVyTGVuZ3RoKSB7XHJcbiAgICAgICAgaW5kZXggPSBpICogMjtcclxuXHJcbiAgICAgICAgYnVmZmVyMVtpIC0gMV0gPSBidWZmZXIwW2ldO1xyXG4gICAgICAgIHBvaW50c1tpbmRleCArIDFdID0gYnVmZmVyMFtpIC0gMV0gPSBidWZmZXIxW2kgLSAxXTtcclxuXHJcbiAgICAgICAgcGF0aENtZCArPSB0aGlzLl9wYXRoQ21kTGluZVRvKHBvaW50c1tpbmRleF0sIHBvaW50c1tpbmRleCArIDFdKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLl9wYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBhdGhDbWQpO1xyXG59O1xyXG5cclxuVmFsdWVQbG90dGVyLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBpZiAodGhpcy5fcGFyZW50LmlzRGlzYWJsZWQoKSlyZXR1cm47XHJcbiAgICB0aGlzLl9kcmF3VmFsdWUoKTtcclxufVxyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVmFsdWVQbG90dGVyO1xyXG5cclxuIiwidmFyIE5vZGUgPSByZXF1aXJlKCcuL2RvY3VtZW50L05vZGUnKSxcclxuICAgIENTUyA9IHJlcXVpcmUoJy4vZG9jdW1lbnQvQ1NTJyk7XHJcbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKCcuL2V2ZW50L0V2ZW50RGlzcGF0Y2hlcicpLFxyXG4gICAgQ29tcG9uZW50RXZlbnQgID0gcmVxdWlyZSgnLi9Db21wb25lbnRFdmVudCcpO1xyXG5cclxuZnVuY3Rpb24gQ29tcG9uZW50KHBhcmVudCxsYWJlbCkge1xyXG4gICAgRXZlbnREaXNwYXRjaGVyLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcclxuXHJcbiAgICBsYWJlbCA9IHBhcmVudC51c2VzTGFiZWxzKCkgPyBsYWJlbCA6ICdub25lJztcclxuXHJcbiAgICB0aGlzLl9wYXJlbnQgID0gcGFyZW50O1xyXG4gICAgdGhpcy5fZW5hYmxlZCA9IHRydWU7XHJcblxyXG4gICAgdmFyIHJvb3QgPSB0aGlzLl9ub2RlID0gbmV3IE5vZGUoTm9kZS5MSVNUX0lURU0pLFxyXG4gICAgICAgIHdyYXAgPSB0aGlzLl93cmFwTm9kZSA9IG5ldyBOb2RlKCk7XHJcbiAgICAgICAgd3JhcC5zZXRTdHlsZUNsYXNzKENTUy5XcmFwKTtcclxuICAgICAgICByb290LmFkZENoaWxkKHdyYXApO1xyXG5cclxuICAgIGlmIChsYWJlbCAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgaWYgKGxhYmVsLmxlbmd0aCAhPSAwICYmIGxhYmVsICE9ICdub25lJykge1xyXG4gICAgICAgICAgICB2YXIgbGFiZWxfID0gdGhpcy5fbGFibE5vZGUgPSBuZXcgTm9kZShOb2RlLlNQQU4pO1xyXG4gICAgICAgICAgICAgICAgbGFiZWxfLnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKTtcclxuICAgICAgICAgICAgICAgIGxhYmVsXy5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywgbGFiZWwpO1xyXG4gICAgICAgICAgICAgICAgcm9vdC5hZGRDaGlsZChsYWJlbF8pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGxhYmVsID09ICdub25lJykge1xyXG4gICAgICAgICAgICB3cmFwLnNldFN0eWxlUHJvcGVydHkoJ21hcmdpbkxlZnQnLCAnMCcpO1xyXG4gICAgICAgICAgICB3cmFwLnNldFN0eWxlUHJvcGVydHkoJ3dpZHRoJywgJzEwMCUnKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoQ29tcG9uZW50RXZlbnQuRU5BQkxFLCB0aGlzLCdvbkVuYWJsZScpO1xyXG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoQ29tcG9uZW50RXZlbnQuRElTQUJMRSx0aGlzLCdvbkRpc2FibGUnKTtcclxuICAgIHRoaXMuX3BhcmVudC5hZGRDb21wb25lbnROb2RlKHJvb3QpO1xyXG59XHJcbkNvbXBvbmVudC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUpO1xyXG5Db21wb25lbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQ29tcG9uZW50O1xyXG5cclxuQ29tcG9uZW50LnByb3RvdHlwZS5lbmFibGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLl9lbmFibGVkID0gdHJ1ZTtcclxufTtcclxuXHJcbkNvbXBvbmVudC5wcm90b3R5cGUuZGlzYWJsZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuX2VuYWJsZWQgPSBmYWxzZTtcclxufTtcclxuXHJcbkNvbXBvbmVudC5wcm90b3R5cGUuaXNFbmFibGVkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX2VuYWJsZWQ7XHJcbn07XHJcbkNvbXBvbmVudC5wcm90b3R5cGUuaXNEaXNhYmxlZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiAhdGhpcy5fZW5hYmxlZDtcclxufTtcclxuXHJcbkNvbXBvbmVudC5wcm90b3R5cGUub25FbmFibGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLmVuYWJsZSgpO1xyXG59O1xyXG5cclxuQ29tcG9uZW50LnByb3RvdHlwZS5vbkRpc2FibGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLmRpc2FibGUoKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50OyIsInZhciBDb21wb25lbnRFdmVudCA9IHtcclxuXHRWQUxVRV9VUERBVEVEOiAndmFsdWVVcGRhdGVkJyxcclxuXHRVUERBVEVfVkFMVUU6ICd1cGRhdGVWYWx1ZScsXHJcblxyXG5cdElOUFVUX1NFTEVDVF9EUkFHOiAnaW5wdXRTZWxlY3REcmFnJyxcclxuXHJcblx0RU5BQkxFICA6ICdlbmFibGUnLFxyXG5cdERJU0FCTEUgOiAnZGlzYWJsZSdcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50RXZlbnQ7IiwiZnVuY3Rpb24gQ29tcG9uZW50T2JqZWN0RXJyb3Iob2JqZWN0LGtleSkge1xyXG5cdEVycm9yLmFwcGx5KHRoaXMpO1xyXG5cdEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsQ29tcG9uZW50T2JqZWN0RXJyb3IpO1xyXG5cdHRoaXMubmFtZSA9ICdDb21wb25lbnRPYmplY3RFcnJvcic7XHJcblx0dGhpcy5tZXNzYWdlID0gJ09iamVjdCBvZiB0eXBlICcgKyBvYmplY3QuY29uc3RydWN0b3IubmFtZSArICcgaGFzIG5vIG1lbWJlciAnICsga2V5ICsgJy4nO1xyXG59XHJcbkNvbXBvbmVudE9iamVjdEVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcclxuQ29tcG9uZW50T2JqZWN0RXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQ29tcG9uZW50T2JqZWN0RXJyb3I7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvbmVudE9iamVjdEVycm9yOyIsInZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKCcuL2V2ZW50L0V2ZW50RGlzcGF0Y2hlcicpLFxyXG4gICAgRXZlbnRfID0gcmVxdWlyZSgnLi9ldmVudC9FdmVudCcpLFxyXG4gICAgSGlzdG9yeUV2ZW50ID0gcmVxdWlyZSgnLi9IaXN0b3J5RXZlbnQnKTtcclxuXHJcbnZhciBNQVhfU1RBVEVTID0gMzA7XHJcblxyXG5mdW5jdGlvbiBIaXN0b3J5KCkge1xyXG4gICAgRXZlbnREaXNwYXRjaGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcbiAgICB0aGlzLl9zdGF0ZXMgPSBbXTtcclxuICAgIHRoaXMuX2VuYWJsZWQgPSBmYWxzZTtcclxufVxyXG5IaXN0b3J5LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZSk7XHJcbkhpc3RvcnkucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gSGlzdG9yeTtcclxuXHJcbkhpc3RvcnkucHJvdG90eXBlLnB1c2hTdGF0ZSA9IGZ1bmN0aW9uIChvYmplY3QsIGtleSwgdmFsdWUpIHtcclxuICAgIGlmICh0aGlzLl9lbmFibGVkKXtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcclxuICAgIGlmIChzdGF0ZXMubGVuZ3RoID49IE1BWF9TVEFURVMpe1xyXG4gICAgICAgIHN0YXRlcy5zaGlmdCgpO1xyXG4gICAgfVxyXG4gICAgc3RhdGVzLnB1c2goe29iamVjdDogb2JqZWN0LCBrZXk6IGtleSwgdmFsdWU6IHZhbHVlfSk7XHJcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBIaXN0b3J5RXZlbnQuU1RBVEVfUFVTSCwgbnVsbCkpO1xyXG59O1xyXG5cclxuSGlzdG9yeS5wcm90b3R5cGUuZ2V0U3RhdGUgPSBmdW5jdGlvbiAob2JqZWN0LCBrZXkpIHtcclxuICAgIHZhciBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXMsXHJcbiAgICAgICAgc3RhdGVzTGVuID0gc3RhdGVzLmxlbmd0aDtcclxuXHJcbiAgICBpZiAoc3RhdGVzTGVuID09IDApe1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBzdGF0ZSwgdmFsdWU7XHJcbiAgICB2YXIgaSA9IC0xO1xyXG4gICAgd2hpbGUgKCsraSA8IHN0YXRlc0xlbikge1xyXG4gICAgICAgIHN0YXRlID0gc3RhdGVzW2ldO1xyXG4gICAgICAgIGlmIChzdGF0ZS5vYmplY3QgPT09IG9iamVjdCkge1xyXG4gICAgICAgICAgICBpZiAoc3RhdGUua2V5ID09PSBrZXkpIHtcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gc3RhdGUudmFsdWU7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiB2YWx1ZTtcclxufTtcclxuXHJcbkhpc3RvcnkucHJvdG90eXBlLnBvcFN0YXRlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgaWYgKHRoaXMuX2VuYWJsZWQpe1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xyXG4gICAgaWYgKHN0YXRlcy5sZW5ndGggPCAxKXtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGxhc3RTdGF0ZSA9IHN0YXRlcy5wb3AoKTtcclxuICAgIGxhc3RTdGF0ZS5vYmplY3RbbGFzdFN0YXRlLmtleV0gPSBsYXN0U3RhdGUudmFsdWU7XHJcblxyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgSGlzdG9yeUV2ZW50LlNUQVRFX1BPUCwgbnVsbCkpO1xyXG59O1xyXG5cclxuSGlzdG9yeS5wcm90b3R5cGUuZ2V0TnVtU3RhdGVzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX3N0YXRlcy5sZW5ndGg7XHJcbn07XHJcblxyXG5IaXN0b3J5Ll9pbnN0YW5jZSA9IG51bGw7XHJcblxyXG5IaXN0b3J5LnNldHVwID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIEhpc3RvcnkuX2luc3RhbmNlID0gbmV3IEhpc3RvcnkoKTtcclxufTtcclxuXHJcbkhpc3RvcnkuZ2V0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIEhpc3RvcnkuX2luc3RhbmNlO1xyXG59O1xyXG5cclxuSGlzdG9yeS5wcm90b3R5cGUuZW5hYmxlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5fZW5hYmxlZCA9IGZhbHNlO1xyXG59O1xyXG5IaXN0b3J5LnByb3RvdHlwZS5kaXNhYmxlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5fZW5hYmxlZCA9IHRydWU7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEhpc3Rvcnk7IiwidmFyIEhpc3RvcnlFdmVudCA9IHtcclxuXHRTVEFURV9QVVNIOiAnaGlzdG9yeVN0YXRlUHVzaCcsXHJcblx0U1RBVEVfUE9QOiAnaGlzdG9yeVN0YXRlUG9wJ1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBIaXN0b3J5RXZlbnQ7IiwidmFyIEhpc3RvcnkgPSByZXF1aXJlKCcuL0hpc3RvcnknKTtcclxudmFyIENvbXBvbmVudCA9IHJlcXVpcmUoJy4vQ29tcG9uZW50JyksXHJcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4vQ29tcG9uZW50RXZlbnQnKSxcclxuICAgIE9iamVjdENvbXBvbmVudE5vdGlmaWVyID0gcmVxdWlyZSgnLi9PYmplY3RDb21wb25lbnROb3RpZmllcicpLFxyXG4gICAgQ29tcG9uZW50T2JqZWN0RXJyb3IgPSByZXF1aXJlKCcuL0NvbXBvbmVudE9iamVjdEVycm9yJyk7XHJcbnZhciBFdmVudF8gPSByZXF1aXJlKCcuL2V2ZW50L0V2ZW50Jyk7XHJcblxyXG5mdW5jdGlvbiBPYmplY3RDb21wb25lbnQocGFyZW50LCBvYmosIGtleSwgcGFyYW1zKSB7XHJcbiAgICBpZiAob2JqW2tleV0gPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIHRocm93IG5ldyBDb21wb25lbnRPYmplY3RFcnJvcihvYmosIGtleSk7XHJcbiAgICB9XHJcbiAgICBwYXJhbXMgPSBwYXJhbXMgfHwge307XHJcbiAgICBwYXJhbXMubGFiZWwgPSBwYXJhbXMubGFiZWwgfHwga2V5O1xyXG5cclxuICAgIENvbXBvbmVudC5hcHBseSh0aGlzLCBbcGFyZW50LCBwYXJhbXMubGFiZWxdKTtcclxuXHJcbiAgICB0aGlzLl9vYmogPSBvYmo7XHJcbiAgICB0aGlzLl9rZXkgPSBrZXk7XHJcbiAgICB0aGlzLl9vbkNoYW5nZSA9IGZ1bmN0aW9uKCl7fTtcclxuXHJcbiAgICBPYmplY3RDb21wb25lbnROb3RpZmllci5nZXQoKS5hZGRFdmVudExpc3RlbmVyKENvbXBvbmVudEV2ZW50LlVQREFURV9WQUxVRSwgdGhpcywgJ29uVmFsdWVVcGRhdGUnKTtcclxuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihDb21wb25lbnRFdmVudC5WQUxVRV9VUERBVEVELCBPYmplY3RDb21wb25lbnROb3RpZmllci5nZXQoKSwgJ29uVmFsdWVVcGRhdGVkJyk7XHJcbn1cclxuT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoQ29tcG9uZW50LnByb3RvdHlwZSk7XHJcbk9iamVjdENvbXBvbmVudC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBPYmplY3RDb21wb25lbnQ7XHJcblxyXG4vL092ZXJyaWRlIGluIFN1YmNsYXNzXHJcbk9iamVjdENvbXBvbmVudC5wcm90b3R5cGUuYXBwbHlWYWx1ZSA9IGZ1bmN0aW9uKCkge307XHJcbk9iamVjdENvbXBvbmVudC5wcm90b3R5cGUub25WYWx1ZVVwZGF0ZSA9IGZ1bmN0aW9uIChlKSB7fTtcclxuXHJcbk9iamVjdENvbXBvbmVudC5wcm90b3R5cGUucHVzaEhpc3RvcnlTdGF0ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBvYmogPSB0aGlzLl9vYmosIGtleSA9IHRoaXMuX2tleTtcclxuICAgIEhpc3RvcnkuZ2V0KCkucHVzaFN0YXRlKG9iaiwga2V5LCBvYmpba2V5XSk7XHJcbn07XHJcblxyXG5PYmplY3RDb21wb25lbnQucHJvdG90eXBlLnNldFZhbHVlID0gZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICB0aGlzLl9vYmpbdGhpcy5fa2V5XSA9IHZhbHVlO1xyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcyxDb21wb25lbnRFdmVudC5WQUxVRV9VUERBVEVELG51bGwpKTtcclxufTtcclxuXHJcbk9iamVjdENvbXBvbmVudC5wcm90b3R5cGUuZ2V0RGF0YSA9IGZ1bmN0aW9uKCl7XHJcbiAgICB2YXIgb2JqID0ge307XHJcbiAgICAgICAgb2JqW3RoaXMuX2tleV0gPSB0aGlzLl9vYmpbdGhpcy5fa2V5XTtcclxuICAgIHJldHVybiBvYmo7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE9iamVjdENvbXBvbmVudDtcclxuIiwidmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4vZXZlbnQvRXZlbnREaXNwYXRjaGVyJyksXHJcblx0RXZlbnRfIFx0XHRcdD0gcmVxdWlyZSgnLi9ldmVudC9FdmVudCcpO1xyXG52YXIgQ29tcG9uZW50RXZlbnQgID0gcmVxdWlyZSgnLi9Db21wb25lbnRFdmVudCcpLFxyXG5cdE9wdGlvbkV2ZW50XHRcdD0gcmVxdWlyZSgnLi9PcHRpb25FdmVudCcpO1xyXG5cclxuZnVuY3Rpb24gT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIoKXtcclxuXHRFdmVudERpc3BhdGNoZXIuYXBwbHkodGhpcyk7XHJcbn1cclxuT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudERpc3BhdGNoZXIucHJvdG90eXBlKTtcclxuT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gT2JqZWN0Q29tcG9uZW50Tm90aWZpZXI7XHJcblxyXG5PYmplY3RDb21wb25lbnROb3RpZmllci5wcm90b3R5cGUub25WYWx1ZVVwZGF0ZWQgPSBmdW5jdGlvbiAoZSkge1xyXG5cdHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlVQREFURV9WQUxVRSwge29yaWdpbjogZS5zZW5kZXJ9KSk7XHJcbn07XHJcblxyXG5PYmplY3RDb21wb25lbnROb3RpZmllci5wcm90b3R5cGUub25PcHRpb25UcmlnZ2VyZWQgPSBmdW5jdGlvbihlKSB7XHJcblx0dGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgT3B0aW9uRXZlbnQuVFJJR0dFUiwge29yaWdpbjogZS5zZW5kZXJ9KSk7XHJcbn07XHJcblxyXG52YXIgaW5zdGFuY2UgPSBudWxsO1xyXG5cclxuT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIuZ2V0ID0gZnVuY3Rpb24oKXtcclxuXHRpZighaW5zdGFuY2Upe1xyXG5cdFx0aW5zdGFuY2UgPSBuZXcgT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIoKTtcclxuXHR9XHJcblx0cmV0dXJuIGluc3RhbmNlO1xyXG59O1xyXG5cclxuT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIuZGVzdHJveSA9IGZ1bmN0aW9uKCl7XHJcblx0aW5zdGFuY2UgPSBudWxsO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBPYmplY3RDb21wb25lbnROb3RpZmllcjsiLCJ2YXIgT3B0aW9uRXZlbnQgPSB7XHJcblx0VFJJR0dFUkVEOiAnc2VsZWN0VHJpZ2dlcicsXHJcblx0VFJJR0dFUjogJ3RyaWdnZXJTZWxlY3QnXHJcbn07XHJcbm1vZHVsZS5leHBvcnRzID0gT3B0aW9uRXZlbnQ7IiwidmFyIERpYWxvZ1RlbXBsYXRlID1cclxuICAgICc8aGVhZD5cXG4nICtcclxuICAgICcgICA8dGl0bGU+Q29udHJvbEtpdCBTdGF0ZTwvdGl0bGU+XFxuJyArXHJcbiAgICAnICAgPHN0eWxlIHR5cGU9XCJ0ZXh0L2Nzc1wiPlxcbicgK1xyXG4gICAgJyAgICAgIGJvZHl7XFxuJyArXHJcbiAgICAnICAgICAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XFxuJyArXHJcbiAgICAnICAgICAgICAgIHBhZGRpbmc6IDIwcHg7XFxuJyArXHJcbiAgICAnICAgICAgICAgIG1hcmdpbjogMDtcXG4nICtcclxuICAgICcgICAgICAgICAgZm9udC1mYW1pbHk6IEFyaWFsLCBzYW5zLXNlcmlmO1xcbicgK1xyXG4gICAgJyAgICAgICAgICB3aWR0aDogMTAwJTtcXG4nICtcclxuICAgICcgICAgICB9XFxuJyArXHJcbiAgICAnICAgICAgdGV4dGFyZWF7XFxuJyArXHJcbiAgICAnICAgICAgICAgIG1hcmdpbi1ib3R0b206MTBweDtcXG4nICtcclxuICAgICcgICAgICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDtcXG4nICtcclxuICAgICcgICAgICAgICAgcGFkZGluZzogMDtcXG4nICtcclxuICAgICcgICAgICAgICAgYm9yZGVyOiAwO1xcbicgK1xyXG4gICAgJyAgICAgICAgICBib3JkZXI6IDFweCBzb2xpZCAjZGVkZWRlO1xcbicgK1xyXG4gICAgJyAgICAgICAgICBvdXRsaW5lOiBub25lO1xcbicgK1xyXG4gICAgJyAgICAgICAgICBmb250LWZhbWlseTogTW9uYWNvLCBtb25vc3BhY2U7XFxuJyArXHJcbiAgICAnICAgICAgICAgIGZvbnQtc2l6ZTogMTFweDtcXG4nICtcclxuICAgICcgICAgICAgICAgcmVzaXplOiBub25lO1xcbicgK1xyXG4gICAgJyAgICAgICAgICB3b3JkLXdyYXA6IGJyZWFrLXdvcmQ7XFxuJyArXHJcbiAgICAnICAgICAgICAgIGRpc3BsYXk6IGJsb2NrO1xcbicgK1xyXG4gICAgJyAgICAgICAgICB3aWR0aDogMTAwJTtcXG4nICtcclxuICAgICcgICAgICAgICAgb3ZlcmZsb3cteTogc2Nyb2xsO1xcbicgK1xyXG4gICAgJyAgICAgICAgICBoZWlnaHQ6IDEyNXB4O1xcbicgK1xyXG4gICAgJyAgICAgIH1cXG4nICtcclxuICAgICcgICAgICBidXR0b257XFxuJyArXHJcbiAgICAnICAgICAgICAgIG1hcmdpbjogMDtcXG4nICtcclxuICAgICcgICAgICAgICAgcGFkZGluZzogMCA1cHggM3B4IDVweDtcXG4nICtcclxuICAgICcgICAgICAgICAgaGVpZ2h0OiAyMHB4O1xcbicgK1xyXG4gICAgJyAgICAgIH1cXG4nK1xyXG4gICAgJyAgICAgICNzYXZlLCNmaWxlbmFtZSwjbG9hZHtcXG4nICtcclxuICAgICcgICAgICAgICAgZmxvYXQ6IHJpZ2h0O1xcbicgK1xyXG4gICAgJyAgICAgIH1cXG4nICtcclxuICAgICcgICAgICBpbnB1dFt0eXBlPVwidGV4dFwiXXtcXG4nICtcclxuICAgICcgICAgICAgICAgbWFyZ2luOiAwO1xcbicgK1xyXG4gICAgJyAgICAgICAgICBwYWRkaW5nOiAwO1xcbicgK1xyXG4gICAgJyAgICAgICAgICB3aWR0aDogNDUlO1xcbicgK1xyXG4gICAgJyAgICAgICAgICBoZWlnaHQ6MjBweDtcXG4nICtcclxuICAgICcgICAgICB9XFxuJytcclxuICAgICcgICA8L3N0eWxlPlxcbicgK1xyXG4gICAgJzwvaGVhZD5cXG4nICtcclxuICAgICc8Ym9keT5cXG4nICtcclxuICAgICcgICA8dGV4dGFyZWEgbmFtZT1cInN0YXRlXCIgaWQ9XCJzdGF0ZVwiPjwvdGV4dGFyZWE+XFxuJyArXHJcbiAgICAnPC9ib2R5Pic7XHJcblxyXG52YXIgU2F2ZURpYWxvZ1RlbXBsYXRlID1cclxuICAgICc8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBpZD1cInNhdmVcIj5TYXZlPC9idXR0b24+XFxuJyArXHJcbiAgICAnPGlucHV0IHR5cGU9XCJ0ZXh0XCIgaWQ9XCJmaWxlbmFtZVwiIHZhbHVlPVwiY2stc3RhdGUuanNvblwiPjwvaW5wdXQ+JztcclxuXHJcbnZhciBMb2FkRGlhbG9nVGVtcGxhdGUgPVxyXG4gICAgJzxpbnB1dCB0eXBlPVwiZmlsZVwiIGlkPVwibG9hZC1kaXNrXCI+PC9idXR0b24+JyArXHJcbiAgICAnPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgaWQ9XCJsb2FkXCI+TG9hZDwvYnV0dG9uPic7XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVXaW5kb3coKXtcclxuICAgIHZhciB3aWR0aCA9IDMyMCwgaGVpZ2h0ID0gMjAwO1xyXG4gICAgdmFyIHdpbmRvd18gPSB3aW5kb3cub3BlbignJywnJywnXFxcclxuICAgICAgICB3aWR0aD0nICsgd2lkdGggKyAnLFxcXHJcbiAgICAgICAgaGVpZ2h0PScgKyBoZWlnaHQgKyAnLFxcXHJcbiAgICAgICAgbGVmdD0nICsgKHdpbmRvdy5zY3JlZW5YICsgd2luZG93LmlubmVyV2lkdGggKiAwLjUgLSB3aWR0aCAqIDAuNSkgKyAnLFxcXHJcbiAgICAgICAgdG9wPScgKyAod2luZG93LnNjcmVlblkgKyB3aW5kb3cuaW5uZXJIZWlnaHQgKiAwLjUgLSBoZWlnaHQgKiAwLjUpICsgJyxcXFxyXG4gICAgICAgIGxvY2F0aW9uPTAsXFxcclxuICAgICAgICB0aXRsZWJhcj0wLFxcXHJcbiAgICAgICAgcmVzaXphYmxlPTAnKTtcclxuICAgIHdpbmRvd18uZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmlubmVySFRNTCA9IERpYWxvZ1RlbXBsYXRlO1xyXG4gICAgcmV0dXJuIHdpbmRvd187XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNhdmUoZGF0YSl7XHJcbiAgICB2YXIgd2luZG93XyA9IGNyZWF0ZVdpbmRvdygpO1xyXG4gICAgdmFyIGRvY3VtZW50XyA9IHdpbmRvd18uZG9jdW1lbnQ7XHJcbiAgICAgICAgZG9jdW1lbnRfLmJvZHkuaW5uZXJIVE1MICs9IFNhdmVEaWFsb2dUZW1wbGF0ZTtcclxuICAgICAgICBkb2N1bWVudF8uZ2V0RWxlbWVudEJ5SWQoJ3NhdmUnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgLy9sb2cgJiBzYXZlIGluIG1haW4gd2luZG93XHJcbiAgICAgICAgICAgIHZhciBzdHIgID0gZG9jdW1lbnRfLmdldEVsZW1lbnRCeUlkKCdzdGF0ZScpLnZhbHVlLFxyXG4gICAgICAgICAgICAgICAgYmxvYiA9IG5ldyBCbG9iKFtzdHJdLHt0eXBlOidhcHBsaWNhdGlvbjpqc29uJ30pLFxyXG4gICAgICAgICAgICAgICAgbmFtZSA9IGRvY3VtZW50Xy5nZXRFbGVtZW50QnlJZCgnZmlsZW5hbWUnKS52YWx1ZTtcclxuICAgICAgICAgICAgdmFyIGEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XHJcbiAgICAgICAgICAgIGEuZG93bmxvYWQgPSBuYW1lO1xyXG4gICAgICAgICAgICBpZih3aW5kb3cud2Via2l0VVJMKXtcclxuICAgICAgICAgICAgICAgIGEuaHJlZiA9IHdpbmRvdy53ZWJraXRVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgYS5ocmVmID0gd2luZG93LmNyZWF0ZU9iamVjdFVSTChibG9iKTtcclxuICAgICAgICAgICAgICAgIGEuc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuICAgICAgICAgICAgICAgIGEuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnRfLmJvZHkucmVtb3ZlQ2hpbGQoYSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIGRvY3VtZW50Xy5ib2R5LmFwcGVuZENoaWxkKGEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGEuY2xpY2soKTtcclxuICAgICAgICB9KTtcclxuICAgIGRvY3VtZW50Xy5nZXRFbGVtZW50QnlJZCgnc3RhdGUnKS5pbm5lclRleHQgPSBKU09OLnN0cmluZ2lmeShkYXRhKTtcclxufVxyXG5cclxuZnVuY3Rpb24gbG9hZChjYWxsYmFjayl7XHJcbiAgICB2YXIgd2luZG93XyA9IGNyZWF0ZVdpbmRvdygpO1xyXG4gICAgdmFyIGRvY3VtZW50XyA9IHdpbmRvd18uZG9jdW1lbnQ7XHJcbiAgICAgICAgZG9jdW1lbnRfLmJvZHkuaW5uZXJIVE1MICs9IExvYWREaWFsb2dUZW1wbGF0ZTtcclxuICAgIHZhciBpbnB1dCAgID0gZG9jdW1lbnRfLmdldEVsZW1lbnRCeUlkKCdzdGF0ZScpO1xyXG4gICAgdmFyIGJ0bkxvYWQgPSBkb2N1bWVudF8uZ2V0RWxlbWVudEJ5SWQoJ2xvYWQnKTtcclxuICAgICAgICBidG5Mb2FkLmRpc2FibGVkID0gdHJ1ZTtcclxuXHJcbiAgICBmdW5jdGlvbiB2YWxpZGF0ZUlucHV0KCl7XHJcbiAgICAgICAgdHJ5e1xyXG4gICAgICAgICAgICB2YXIgb2JqID0gSlNPTi5wYXJzZShpbnB1dC52YWx1ZSk7XHJcbiAgICAgICAgICAgIGlmKG9iaiAmJiB0eXBlb2Ygb2JqID09PSAnb2JqZWN0JyAmJiBvYmogIT09IG51bGwpe1xyXG4gICAgICAgICAgICAgICAgYnRuTG9hZC5kaXNhYmxlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBjYXRjaCAoZSl7XHJcbiAgICAgICAgICAgIGJ0bkxvYWQuZGlzYWJsZWQgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpbnB1dC5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsZnVuY3Rpb24oKXtcclxuICAgICAgICB2YWxpZGF0ZUlucHV0KCk7XHJcbiAgICB9KTtcclxuICAgIGRvY3VtZW50Xy5nZXRFbGVtZW50QnlJZCgnbG9hZCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxmdW5jdGlvbigpe1xyXG4gICAgICAgIHZhciBzdHIgPSBpbnB1dC52YWx1ZTtcclxuICAgICAgICBjYWxsYmFjayhKU09OLnBhcnNlKHN0cikuZGF0YSk7XHJcbiAgICAgICAgd2luZG93Xy5jbG9zZSgpO1xyXG4gICAgfSk7XHJcbiAgICB2YXIgbG9hZEZyb21EaXNrID0gZG9jdW1lbnRfLmdldEVsZW1lbnRCeUlkKCdsb2FkLWRpc2snKTtcclxuICAgICAgICBsb2FkRnJvbURpc2suYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJyxmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcclxuICAgICAgICAgICAgcmVhZGVyLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWRlbmQnLGZ1bmN0aW9uKGUpe1xyXG4gICAgICAgICAgICAgICAgaW5wdXQudmFsdWUgPSBlLnRhcmdldC5yZXN1bHQ7XHJcbiAgICAgICAgICAgICAgICB2YWxpZGF0ZUlucHV0KCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICByZWFkZXIucmVhZEFzVGV4dChsb2FkRnJvbURpc2suZmlsZXNbMF0sJ3V0Zi04Jyk7XHJcbiAgICAgICAgfSk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgbG9hZCA6IGxvYWQsXHJcbiAgICBzYXZlIDogc2F2ZVxyXG59OyIsImZ1bmN0aW9uIENvbG9yRm9ybWF0RXJyb3IobXNnKSB7XHJcblx0RXJyb3IuYXBwbHkodGhpcyk7XHJcblx0RXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcyxDb2xvckZvcm1hdEVycm9yKTtcclxuXHR0aGlzLm5hbWUgPSAnQ29sb3JGb3JtYXRFcnJvcic7XHJcblx0dGhpcy5tZXNzYWdlID0gbXNnO1xyXG59XHJcbkNvbG9yRm9ybWF0RXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFcnJvci5wcm90b3R5cGUpO1xyXG5Db2xvckZvcm1hdEVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IENvbG9yRm9ybWF0RXJyb3I7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENvbG9yRm9ybWF0RXJyb3I7IiwidmFyIENvbG9yTW9kZSA9IHtcclxuXHRSR0IgIDogJ3JnYicsXHJcblx0SFNWICA6ICdoc3YnLFxyXG5cdEhFWCAgOiAnaGV4JyxcclxuXHRSR0JmdjogJ3JnYmZ2J1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDb2xvck1vZGU7IiwidmFyIENvbG9yVXRpbCA9IHtcclxuXHRIU1YyUkdCOiBmdW5jdGlvbiAoaHVlLCBzYXQsIHZhbCkge1xyXG5cdFx0dmFyIG1heF9odWUgPSAzNjAuMCxcclxuXHRcdFx0bWF4X3NhdCA9IDEwMC4wLFxyXG5cdFx0XHRtYXhfdmFsID0gMTAwLjA7XHJcblxyXG5cdFx0dmFyIG1pbl9odWUgPSAwLjAsXHJcblx0XHRcdG1pbl9zYXQgPSAwLFxyXG5cdFx0XHRtaW5fdmFsID0gMDtcclxuXHJcblx0XHRodWUgPSBodWUgJSBtYXhfaHVlO1xyXG5cdFx0dmFsID0gTWF0aC5tYXgobWluX3ZhbCwgTWF0aC5taW4odmFsLCBtYXhfdmFsKSkgLyBtYXhfdmFsICogMjU1LjA7XHJcblxyXG5cdFx0aWYgKHNhdCA8PSBtaW5fc2F0KSB7XHJcblx0XHRcdHZhbCA9IE1hdGgucm91bmQodmFsKTtcclxuXHRcdFx0cmV0dXJuIFt2YWwsIHZhbCwgdmFsXTtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYgKHNhdCA+IG1heF9zYXQpc2F0ID0gbWF4X3NhdDtcclxuXHJcblx0XHRzYXQgPSBzYXQgLyBtYXhfc2F0O1xyXG5cclxuXHRcdC8vaHR0cDovL2QuaGF0ZW5hLm5lLmpwL2phOS8yMDEwMDkwMy8xMjgzNTA0MzRcclxuXHJcblx0XHR2YXIgaGkgPSBNYXRoLmZsb29yKGh1ZSAvIDYwLjApICUgNixcclxuXHRcdFx0ZiA9IChodWUgLyA2MC4wKSAtIGhpLFxyXG5cdFx0XHRwID0gdmFsICogKDEgLSBzYXQpLFxyXG5cdFx0XHRxID0gdmFsICogKDEgLSBmICogc2F0KSxcclxuXHRcdFx0dCA9IHZhbCAqICgxIC0gKDEgLSBmKSAqIHNhdCk7XHJcblxyXG5cdFx0dmFyIHIgPSAwLFxyXG5cdFx0XHRnID0gMCxcclxuXHRcdFx0YiA9IDA7XHJcblxyXG5cdFx0c3dpdGNoIChoaSkge1xyXG5cdFx0XHRjYXNlIDA6XHJcblx0XHRcdFx0ciA9IHZhbDtcclxuXHRcdFx0XHRnID0gdDtcclxuXHRcdFx0XHRiID0gcDtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSAxOlxyXG5cdFx0XHRcdHIgPSBxO1xyXG5cdFx0XHRcdGcgPSB2YWw7XHJcblx0XHRcdFx0YiA9IHA7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgMjpcclxuXHRcdFx0XHRyID0gcDtcclxuXHRcdFx0XHRnID0gdmFsO1xyXG5cdFx0XHRcdGIgPSB0O1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIDM6XHJcblx0XHRcdFx0ciA9IHA7XHJcblx0XHRcdFx0ZyA9IHE7XHJcblx0XHRcdFx0YiA9IHZhbDtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSA0OlxyXG5cdFx0XHRcdHIgPSB0O1xyXG5cdFx0XHRcdGcgPSBwO1xyXG5cdFx0XHRcdGIgPSB2YWw7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgNTpcclxuXHRcdFx0XHRyID0gdmFsO1xyXG5cdFx0XHRcdGcgPSBwO1xyXG5cdFx0XHRcdGIgPSBxO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0fVxyXG5cclxuXHRcdHIgPSBNYXRoLnJvdW5kKHIpO1xyXG5cdFx0ZyA9IE1hdGgucm91bmQoZyk7XHJcblx0XHRiID0gTWF0aC5yb3VuZChiKTtcclxuXHJcblx0XHRyZXR1cm4gW3IsIGcsIGJdO1xyXG5cclxuXHR9LFxyXG5cclxuXHRSR0IySFNWOiBmdW5jdGlvbiAociwgZywgYikge1xyXG5cdFx0dmFyIGggPSAwLFxyXG5cdFx0XHRzID0gMCxcclxuXHRcdFx0diA9IDA7XHJcblxyXG5cdFx0ciA9IHIgLyAyNTUuMDtcclxuXHRcdGcgPSBnIC8gMjU1LjA7XHJcblx0XHRiID0gYiAvIDI1NS4wO1xyXG5cclxuXHRcdHZhciBtaW5SR0IgPSBNYXRoLm1pbihyLCBNYXRoLm1pbihnLCBiKSksXHJcblx0XHRcdG1heFJHQiA9IE1hdGgubWF4KHIsIE1hdGgubWF4KGcsIGIpKTtcclxuXHJcblx0XHRpZiAobWluUkdCID09IG1heFJHQikge1xyXG5cdFx0XHR2ID0gbWluUkdCO1xyXG5cdFx0XHRyZXR1cm4gWzAsIDAsIE1hdGgucm91bmQodildO1xyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBkZCA9IChyID09IG1pblJHQikgPyBnIC0gYiA6ICgoYiA9PSBtaW5SR0IpID8gciAtIGcgOiBiIC0gciksXHJcblx0XHRcdGhoID0gKHIgPT0gbWluUkdCKSA/IDMgOiAoKGIgPT0gbWluUkdCKSA/IDEgOiA1KTtcclxuXHJcblx0XHRoID0gTWF0aC5yb3VuZCg2MCAqIChoaCAtIGRkIC8gKG1heFJHQiAtIG1pblJHQikpKTtcclxuXHRcdHMgPSBNYXRoLnJvdW5kKChtYXhSR0IgLSBtaW5SR0IpIC8gbWF4UkdCICogMTAwLjApO1xyXG5cdFx0diA9IE1hdGgucm91bmQobWF4UkdCICogMTAwLjApO1xyXG5cclxuXHRcdHJldHVybiBbaCwgcywgdl07XHJcblx0fSxcclxuXHJcblx0UkdCMkhFWDogZnVuY3Rpb24gKHIsIGcsIGIpIHtcclxuXHRcdHJldHVybiBcIiNcIiArICgoMSA8PCAyNCkgKyAociA8PCAxNikgKyAoZyA8PCA4KSArIGIpLnRvU3RyaW5nKDE2KS5zbGljZSgxKTtcclxuXHR9LFxyXG5cclxuXHRSR0JmdjJIRVg6IGZ1bmN0aW9uIChyLCBnLCBiKSB7XHJcblx0XHRyZXR1cm4gQ29sb3JVdGlsLlJHQjJIRVgoTWF0aC5mbG9vcihyICogMjU1LjApLFxyXG5cdFx0XHRNYXRoLmZsb29yKGcgKiAyNTUuMCksXHJcblx0XHRcdE1hdGguZmxvb3IoYiAqIDI1NS4wKSk7XHJcblx0fSxcclxuXHJcblx0SFNWMkhFWDogZnVuY3Rpb24gKGgsIHMsIHYpIHtcclxuXHRcdHZhciByZ2IgPSBDb250cm9sS2l0LkNvbG9yVXRpbC5IU1YyUkdCKGgsIHMsIHYpO1xyXG5cdFx0cmV0dXJuIENvbnRyb2xLaXQuQ29sb3JVdGlsLlJHQjJIRVgocmdiWzBdLCByZ2JbMV0sIHJnYlsyXSk7XHJcblx0fSxcclxuXHJcblx0SEVYMlJHQjogZnVuY3Rpb24gKGhleCkge1xyXG5cdFx0dmFyIHNob3J0aGFuZFJlZ2V4ID0gL14jPyhbYS1mXFxkXSkoW2EtZlxcZF0pKFthLWZcXGRdKSQvaTtcclxuXHRcdGhleCA9IGhleC5yZXBsYWNlKHNob3J0aGFuZFJlZ2V4LCBmdW5jdGlvbiAobSwgciwgZywgYikge1xyXG5cdFx0XHRyZXR1cm4gciArIHIgKyBnICsgZyArIGIgKyBiO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dmFyIHJlc3VsdCA9IC9eIz8oW2EtZlxcZF17Mn0pKFthLWZcXGRdezJ9KShbYS1mXFxkXXsyfSkkL2kuZXhlYyhoZXgpO1xyXG5cdFx0cmV0dXJuIHJlc3VsdCA/IFtwYXJzZUludChyZXN1bHRbMV0sIDE2KSwgcGFyc2VJbnQocmVzdWx0WzJdLCAxNiksIHBhcnNlSW50KHJlc3VsdFszXSwgMTYpXSA6IG51bGw7XHJcblxyXG5cdH0sXHJcblxyXG5cdGlzVmFsaWRIRVg6IGZ1bmN0aW9uIChoZXgpIHtcclxuXHRcdHJldHVybiAvXiNbMC05QS1GXXs2fSQvaS50ZXN0KGhleCk7XHJcblx0fSxcclxuXHJcblx0aXNWYWxpZFJHQjogZnVuY3Rpb24gKHIsIGcsIGIpIHtcclxuXHRcdHJldHVybiByID49IDAgJiYgciA8PSAyNTUgJiZcclxuXHRcdFx0ZyA+PSAwICYmIGcgPD0gMjU1ICYmXHJcblx0XHRcdGIgPj0gMCAmJiBiIDw9IDI1NTtcclxuXHR9LFxyXG5cclxuXHRpc1ZhbGlkUkdCZnY6IGZ1bmN0aW9uIChyLCBnLCBiKSB7XHJcblx0XHRyZXR1cm4gciA+PSAwICYmIHIgPD0gMS4wICYmXHJcblx0XHRcdGcgPj0gMCAmJiBnIDw9IDEuMCAmJlxyXG5cdFx0XHRiID49IDAgJiYgYiA8PSAxLjA7XHJcblx0fVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDb2xvclV0aWw7IiwidmFyIENTUyA9IHtcclxuICAgIENvbnRyb2xLaXQ6ICdjb250cm9sS2l0JyxcclxuXHJcbiAgICBQYW5lbDogJ3BhbmVsJyxcclxuICAgIEhlYWQ6ICdoZWFkJyxcclxuICAgIExhYmVsOiAnbGFiZWwnLFxyXG4gICAgTWVudTogJ21lbnUnLFxyXG4gICAgV3JhcDogJ3dyYXAnLFxyXG5cclxuICAgIEJ1dHRvbk1lbnVDbG9zZTogJ2J1dHRvbi1tZW51LWNsb3NlJyxcclxuICAgIEJ1dHRvbk1lbnVIaWRlOiAnYnV0dG9uLW1lbnUtaGlkZScsXHJcbiAgICBCdXR0b25NZW51U2hvdzogJ2J1dHRvbi1tZW51LXNob3cnLFxyXG4gICAgQnV0dG9uTWVudVVuZG86ICdidXR0b24tbWVudS11bmRvJyxcclxuICAgIEJ1dHRvbk1lbnVMb2FkOiAnYnV0dG9uLW1lbnUtbG9hZCcsXHJcbiAgICBCdXR0b25NZW51U2F2ZTogJ2J1dHRvbi1tZW51LXNhdmUnLFxyXG4gICAgTWVudUFjdGl2ZTogJ21lbnUtYWN0aXZlJyxcclxuXHJcbiAgICBCdXR0b246ICdidXR0b24nLFxyXG4gICAgQnV0dG9uUHJlc2V0OiAnYnV0dG9uLXByZXNldCcsXHJcbiAgICBCdXR0b25QcmVzZXRBY3RpdmU6ICdidXR0b24tcHJlc2V0LWFjdGl2ZScsXHJcblxyXG4gICAgV3JhcElucHV0V1ByZXNldDogJ2lucHV0LXdpdGgtcHJlc2V0LXdyYXAnLFxyXG4gICAgV3JhcENvbG9yV1ByZXNldDogJ2NvbG9yLXdpdGgtcHJlc2V0LXdyYXAnLFxyXG5cclxuICAgIEhlYWRJbmFjdGl2ZTogJ2hlYWQtaW5hY3RpdmUnLFxyXG4gICAgUGFuZWxIZWFkSW5hY3RpdmU6ICdwYW5lbC1oZWFkLWluYWN0aXZlJyxcclxuXHJcbiAgICBHcm91cExpc3Q6ICdncm91cC1saXN0JyxcclxuICAgIEdyb3VwOiAnZ3JvdXAnLFxyXG4gICAgU3ViR3JvdXBMaXN0OiAnc3ViLWdyb3VwLWxpc3QnLFxyXG4gICAgU3ViR3JvdXA6ICdzdWItZ3JvdXAnLFxyXG5cclxuXHJcbiAgICBUZXh0QXJlYVdyYXA6ICd0ZXh0YXJlYS13cmFwJyxcclxuXHJcbiAgICBXcmFwU2xpZGVyOiAnd3JhcC1zbGlkZXInLFxyXG4gICAgU2xpZGVyV3JhcDogJ3NsaWRlci13cmFwJyxcclxuICAgIFNsaWRlclNsb3Q6ICdzbGlkZXItc2xvdCcsXHJcbiAgICBTbGlkZXJIYW5kbGU6ICdzbGlkZXItaGFuZGxlJyxcclxuXHJcbiAgICBBcnJvd0JNaW46ICdhcnJvdy1iLW1pbicsXHJcbiAgICBBcnJvd0JNYXg6ICdhcnJvdy1iLW1heCcsXHJcbiAgICBBcnJvd0JTdWJNaW46ICdhcnJvdy1iLXN1Yi1taW4nLFxyXG4gICAgQXJyb3dCU3ViTWF4OiAnYXJyb3ctYi1zdWItbWF4JyxcclxuICAgIEFycm93U01pbjogJ2Fycm93LXMtbWluJyxcclxuICAgIEFycm93U01heDogJ2Fycm93LXMtbWF4JyxcclxuXHJcbiAgICBTZWxlY3Q6ICdzZWxlY3QnLFxyXG4gICAgU2VsZWN0QWN0aXZlOiAnc2VsZWN0LWFjdGl2ZScsXHJcblxyXG4gICAgT3B0aW9uczogJ29wdGlvbnMnLFxyXG4gICAgT3B0aW9uc1NlbGVjdGVkOiAnbGktc2VsZWN0ZWQnLFxyXG5cclxuICAgIENhbnZhc0xpc3RJdGVtOiAnY2FudmFzLWxpc3QtaXRlbScsXHJcbiAgICBDYW52YXNXcmFwOiAnY2FudmFzLXdyYXAnLFxyXG5cclxuICAgIFNWR0xpc3RJdGVtOiAnc3ZnLWxpc3QtaXRlbScsXHJcbiAgICBTVkdXcmFwOiAnc3ZnLXdyYXAnLFxyXG5cclxuICAgIEdyYXBoU2xpZGVyWFdyYXA6ICdncmFwaC1zbGlkZXIteC13cmFwJyxcclxuICAgIEdyYXBoU2xpZGVyWVdyYXA6ICdncmFwaC1zbGlkZXIteS13cmFwJyxcclxuICAgIEdyYXBoU2xpZGVyWDogJ2dyYXBoLXNsaWRlci14JyxcclxuICAgIEdyYXBoU2xpZGVyWTogJ2dyYXBoLXNsaWRlci15JyxcclxuICAgIEdyYXBoU2xpZGVyWEhhbmRsZTogJ2dyYXBoLXNsaWRlci14LWhhbmRsZScsXHJcbiAgICBHcmFwaFNsaWRlcllIYW5kbGU6ICdncmFwaC1zbGlkZXIteS1oYW5kbGUnLFxyXG5cclxuICAgIFBpY2tlcjogJ3BpY2tlcicsXHJcbiAgICBQaWNrZXJGaWVsZFdyYXA6ICdmaWVsZC13cmFwJyxcclxuICAgIFBpY2tlcklucHV0V3JhcDogJ2lucHV0LXdyYXAnLFxyXG4gICAgUGlja2VySW5wdXRGaWVsZDogJ2lucHV0LWZpZWxkJyxcclxuICAgIFBpY2tlckNvbnRyb2xzV3JhcDogJ2NvbnRyb2xzLXdyYXAnLFxyXG4gICAgUGlja2VyQ29sb3JDb250cmFzdDogJ2NvbG9yLWNvbnRyYXN0JyxcclxuICAgIFBpY2tlckhhbmRsZUZpZWxkOiAnaW5kaWNhdG9yJyxcclxuICAgIFBpY2tlckhhbmRsZVNsaWRlcjogJ2luZGljYXRvcicsXHJcblxyXG4gICAgQ29sb3I6ICdjb2xvcicsXHJcblxyXG4gICAgU2Nyb2xsQmFyOiAnc2Nyb2xsQmFyJyxcclxuICAgIFNjcm9sbFdyYXA6ICdzY3JvbGwtd3JhcCcsXHJcbiAgICBTY3JvbGxCYXJCdG5VcDogJ2J0blVwJyxcclxuICAgIFNjcm9sbEJhckJ0bkRvd246ICdidG5Eb3duJyxcclxuICAgIFNjcm9sbEJhclRyYWNrOiAndHJhY2snLFxyXG4gICAgU2Nyb2xsQmFyVGh1bWI6ICd0aHVtYicsXHJcbiAgICBTY3JvbGxCdWZmZXI6ICdzY3JvbGwtYnVmZmVyJyxcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ1NTO1xyXG4iLCJ2YXIgRG9jdW1lbnRFdmVudCA9IHtcclxuICAgIE1PVVNFX01PVkU6ICdtb3VzZW1vdmUnLFxyXG4gICAgTU9VU0VfVVA6ICdtb3VzZXVwJyxcclxuICAgIE1PVVNFX0RPV046ICdtb3VzZWRvd24nLFxyXG4gICAgTU9VU0VfV0hFRUw6ICdtb3VzZXdoZWVsJyxcclxuICAgIFdJTkRPV19SRVNJWkU6ICdyZXNpemUnXHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IERvY3VtZW50RXZlbnQ7IiwidmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4uL2V2ZW50L0V2ZW50RGlzcGF0Y2hlcicpLFxyXG4gICAgRXZlbnRfID0gcmVxdWlyZSgnLi4vZXZlbnQvRXZlbnQnKSxcclxuICAgIERvY3VtZW50RXZlbnQgPSByZXF1aXJlKCcuL0RvY3VtZW50RXZlbnQnKTtcclxudmFyIGluc3RhbmNlID0gbnVsbDtcclxuXHJcbmZ1bmN0aW9uIE1vdXNlKCkge1xyXG4gICAgRXZlbnREaXNwYXRjaGVyLmFwcGx5KHRoaXMpO1xyXG4gICAgdGhpcy5fcG9zID0gWzAsMF07XHJcbiAgICB0aGlzLl93aGVlbERpcmVjdGlvbiA9IDA7XHJcbiAgICB0aGlzLl9ob3ZlckVsZW1lbnQgPSBudWxsO1xyXG5cclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgIHRoaXMuX29uRG9jdW1lbnRNb3VzZU1vdmUgPSBmdW5jdGlvbihlKXtcclxuICAgICAgICB2YXIgZHggPSAwLFxyXG4gICAgICAgICAgICBkeSA9IDA7XHJcblxyXG4gICAgICAgIGlmICghZSllID0gd2luZG93LmV2ZW50O1xyXG4gICAgICAgIGlmIChlLnBhZ2VYKSB7XHJcbiAgICAgICAgICAgIGR4ID0gZS5wYWdlWDtcclxuICAgICAgICAgICAgZHkgPSBlLnBhZ2VZO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChlLmNsaWVudFgpIHtcclxuICAgICAgICAgICAgZHggPSBlLmNsaWVudFggKyBkb2N1bWVudC5ib2R5LnNjcm9sbExlZnQgKyBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsTGVmdDtcclxuICAgICAgICAgICAgZHkgPSBlLmNsaWVudFkgKyBkb2N1bWVudC5ib2R5LnNjcm9sbFRvcCArIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxUb3A7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHNlbGYuX3Bvc1swXSA9IGR4O1xyXG4gICAgICAgIHNlbGYuX3Bvc1sxXSA9IGR5O1xyXG5cclxuICAgICAgICBzZWxmLl9ob3ZlckVsZW1lbnQgPSBkb2N1bWVudC5lbGVtZW50RnJvbVBvaW50KGR4LGR5KTtcclxuICAgIH07XHJcblxyXG4gICAgdGhpcy5fb25Eb2N1bWVudE1vdXNlV2hlZWwgPSBmdW5jdGlvbihldmVudCl7XHJcbiAgICAgICAgc2VsZi5fd2hlZWxEaXJlY3Rpb24gPSAoZXZlbnQuZGV0YWlsIDwgMCkgPyAxIDogKGV2ZW50LndoZWVsRGVsdGEgPiAwKSA/IDEgOiAtMTtcclxuICAgICAgICBzZWxmLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50XyhzZWxmLERvY3VtZW50RXZlbnQuTU9VU0VfV0hFRUwsZXZlbnQpKTtcclxuICAgIH07XHJcblxyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsIHRoaXMuX29uRG9jdW1lbnRNb3VzZU1vdmUpO1xyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX1dIRUVMLHRoaXMuX29uRG9jdW1lbnRNb3VzZVdoZWVsKTtcclxufVxyXG5Nb3VzZS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUpO1xyXG5Nb3VzZS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBNb3VzZTtcclxuXHJcbk1vdXNlLnByb3RvdHlwZS5fcmVtb3ZlRG9jdW1lbnRMaXN0ZW5lciA9IGZ1bmN0aW9uKCl7XHJcbiAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSwgdGhpcy5fb25Eb2N1bWVudE1vdXNlTW92ZSk7XHJcbiAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfV0hFRUwsdGhpcy5fb25Eb2N1bWVudE1vdXNlV2hlZWwpO1xyXG59O1xyXG5cclxuTW91c2UucHJvdG90eXBlLmdldFBvc2l0aW9uID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX3BvcztcclxufTtcclxuXHJcbk1vdXNlLnByb3RvdHlwZS5nZXRYID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX3Bvc1swXTtcclxufTtcclxuXHJcbk1vdXNlLnByb3RvdHlwZS5nZXRZID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX3Bvc1sxXTtcclxufTtcclxuXHJcbk1vdXNlLnByb3RvdHlwZS5nZXRXaGVlbERpcmVjdGlvbiA9IGZ1bmN0aW9uKCl7XHJcbiAgICByZXR1cm4gdGhpcy5fd2hlZWxEaXJlY3Rpb247XHJcbn07XHJcblxyXG5Nb3VzZS5wcm90b3R5cGUuZ2V0SG92ZXJFbGVtZW50ID0gZnVuY3Rpb24oKXtcclxuICAgIHJldHVybiB0aGlzLl9ob3ZlckVsZW1lbnQ7XHJcbn07XHJcblxyXG5Nb3VzZS5zZXR1cCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGluc3RhbmNlID0gaW5zdGFuY2UgfHwgbmV3IE1vdXNlKCk7XHJcbiAgICByZXR1cm4gaW5zdGFuY2U7XHJcbn07XHJcblxyXG5Nb3VzZS5nZXQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gaW5zdGFuY2U7XHJcbn07XHJcblxyXG5Nb3VzZS5kZXN0cm95ID0gZnVuY3Rpb24oKXtcclxuICAgIGluc3RhbmNlLl9yZW1vdmVEb2N1bWVudExpc3RlbmVyKCk7XHJcbiAgICBpbnN0YW5jZSA9IG51bGw7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE1vdXNlOyIsImZ1bmN0aW9uIE5vZGUoKSB7XHJcbiAgICB0aGlzLl9lbGVtZW50ID0gbnVsbDtcclxuXHJcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpe1xyXG4gICAgICAgIGNhc2UgMSA6XHJcbiAgICAgICAgICAgIHZhciBhcmcgPSBhcmd1bWVudHNbMF07XHJcbiAgICAgICAgICAgIGlmIChhcmcgIT0gTm9kZS5JTlBVVF9URVhUICYmXHJcbiAgICAgICAgICAgICAgICBhcmcgIT0gTm9kZS5JTlBVVF9CVVRUT04gJiZcclxuICAgICAgICAgICAgICAgIGFyZyAhPSBOb2RlLklOUFVUX1NFTEVDVCAmJlxyXG4gICAgICAgICAgICAgICAgYXJnICE9IE5vZGUuSU5QVVRfQ0hFQ0tCT1gpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX2VsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KGFyZyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9lbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuX2VsZW1lbnQudHlwZSA9IGFyZztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDA6XHJcbiAgICAgICAgICAgIHRoaXMuX2VsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbn1cclxuXHJcbk5vZGUuRElWICAgICAgICAgICAgPSAnZGl2JztcclxuTm9kZS5JTlBVVF9URVhUICAgICA9ICd0ZXh0JztcclxuTm9kZS5JTlBVVF9CVVRUT04gICA9ICdidXR0b24nO1xyXG5Ob2RlLklOUFVUX1NFTEVDVCAgID0gJ3NlbGVjdCc7XHJcbk5vZGUuSU5QVVRfQ0hFQ0tCT1ggPSAnY2hlY2tib3gnO1xyXG5Ob2RlLk9QVElPTiAgICAgICAgID0gJ29wdGlvbic7XHJcbk5vZGUuTElTVCAgICAgICAgICAgPSAndWwnO1xyXG5Ob2RlLkxJU1RfSVRFTSAgICAgID0gJ2xpJztcclxuTm9kZS5TUEFOICAgICAgICAgICA9ICdzcGFuJztcclxuTm9kZS5URVhUQVJFQSAgICAgICA9ICd0ZXh0YXJlYSc7XHJcblxyXG5Ob2RlLnByb3RvdHlwZSA9IHtcclxuICAgIGFkZENoaWxkOiBmdW5jdGlvbiAobm9kZSkge1xyXG4gICAgICAgIHRoaXMuX2VsZW1lbnQuYXBwZW5kQ2hpbGQobm9kZS5nZXRFbGVtZW50KCkpO1xyXG4gICAgICAgIHJldHVybiBub2RlO1xyXG4gICAgfSxcclxuICAgIGFkZENoaWxkcmVuOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIGkgPSAtMSwgbCA9IGFyZ3VtZW50cy5sZW5ndGgsIGUgPSB0aGlzLl9lbGVtZW50O1xyXG4gICAgICAgIHdoaWxlICgrK2kgPCBsKSB7XHJcbiAgICAgICAgICAgIGUuYXBwZW5kQ2hpbGQoYXJndW1lbnRzW2ldLmdldEVsZW1lbnQoKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIGFkZENoaWxkQXQ6IGZ1bmN0aW9uIChub2RlLCBpbmRleCkge1xyXG4gICAgICAgIHRoaXMuX2VsZW1lbnQuaW5zZXJ0QmVmb3JlKG5vZGUuZ2V0RWxlbWVudCgpLCB0aGlzLl9lbGVtZW50LmNoaWxkcmVuW2luZGV4XSk7XHJcbiAgICAgICAgcmV0dXJuIG5vZGU7XHJcbiAgICB9LFxyXG4gICAgcmVtb3ZlQ2hpbGQ6IGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmNvbnRhaW5zKG5vZGUpKXJldHVybiBudWxsO1xyXG4gICAgICAgIHRoaXMuX2VsZW1lbnQucmVtb3ZlQ2hpbGQobm9kZS5nZXRFbGVtZW50KCkpO1xyXG4gICAgICAgIHJldHVybiBub2RlO1xyXG4gICAgfSxcclxuICAgIHJlbW92ZUNoaWxkcmVuOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIGkgPSAtMSwgbCA9IGFyZ3VtZW50cy5sZW5ndGgsIGUgPSB0aGlzLl9lbGVtZW50O1xyXG4gICAgICAgIHdoaWxlICgrK2kgPCBsKSB7XHJcbiAgICAgICAgICAgIGUucmVtb3ZlQ2hpbGQoYXJndW1lbnRzW2ldLmdldEVsZW1lbnQoKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIHJlbW92ZUNoaWxkQXQ6IGZ1bmN0aW9uIChub2RlLCBpbmRleCkge1xyXG4gICAgICAgIGlmICghdGhpcy5jb250YWlucyhub2RlKSlyZXR1cm4gbnVsbDtcclxuICAgICAgICB0aGlzLl9lbGVtZW50LnJlbW92ZUNoaWxkKG5vZGUuZ2V0RWxlbWVudCgpKTtcclxuICAgICAgICByZXR1cm4gbm9kZTtcclxuICAgIH0sXHJcbiAgICByZW1vdmVBbGxDaGlsZHJlbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBlbGVtZW50ID0gdGhpcy5fZWxlbWVudDtcclxuICAgICAgICB3aGlsZSAoZWxlbWVudC5oYXNDaGlsZE5vZGVzKCkpZWxlbWVudC5yZW1vdmVDaGlsZChlbGVtZW50Lmxhc3RDaGlsZCk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgc2V0V2lkdGg6IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGUud2lkdGggPSB2YWx1ZSArICdweCc7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgZ2V0V2lkdGg6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fZWxlbWVudC5vZmZzZXRXaWR0aDtcclxuICAgIH0sXHJcbiAgICBzZXRIZWlnaHQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gdmFsdWUgKyAncHgnO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIGdldEhlaWdodDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9lbGVtZW50Lm9mZnNldEhlaWdodDtcclxuICAgIH0sXHJcbiAgICBzZXRQb3NpdGlvbjogZnVuY3Rpb24gKHgsIHkpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5zZXRQb3NpdGlvbih4KS5zZXRQb3NpdGlvbih5KTtcclxuICAgIH0sXHJcbiAgICBzZXRQb3NpdGlvblg6IGZ1bmN0aW9uICh4KSB7XHJcbiAgICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZS5tYXJnaW5MZWZ0ID0geCArICdweCc7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgc2V0UG9zaXRpb25ZOiBmdW5jdGlvbiAoeSkge1xyXG4gICAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGUubWFyZ2luVG9wID0geSArICdweCc7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgc2V0UG9zaXRpb25HbG9iYWw6IGZ1bmN0aW9uICh4LCB5KSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0UG9zaXRpb25HbG9iYWxYKHgpLnNldFBvc2l0aW9uR2xvYmFsWSh5KTtcclxuICAgIH0sXHJcbiAgICBzZXRQb3NpdGlvbkdsb2JhbFg6IGZ1bmN0aW9uICh4KSB7XHJcbiAgICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZS5sZWZ0ID0geCArICdweCc7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgc2V0UG9zaXRpb25HbG9iYWxZOiBmdW5jdGlvbiAoeSkge1xyXG4gICAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGUudG9wID0geSArICdweCc7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgZ2V0UG9zaXRpb246IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gW3RoaXMuZ2V0UG9zaXRpb25YKCksIHRoaXMuZ2V0UG9zaXRpb25ZKCldO1xyXG4gICAgfSxcclxuICAgIGdldFBvc2l0aW9uWDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9lbGVtZW50Lm9mZnNldExlZnQ7XHJcbiAgICB9LFxyXG4gICAgZ2V0UG9zaXRpb25ZOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VsZW1lbnQub2Zmc2V0VG9wO1xyXG4gICAgfSxcclxuICAgIGdldFBvc2l0aW9uR2xvYmFsOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIG9mZnNldCA9IFswLCAwXSxcclxuICAgICAgICAgICAgZWxlbWVudCA9IHRoaXMuX2VsZW1lbnQ7XHJcblxyXG4gICAgICAgIHdoaWxlIChlbGVtZW50KSB7XHJcbiAgICAgICAgICAgIG9mZnNldFswXSArPSBlbGVtZW50Lm9mZnNldExlZnQ7XHJcbiAgICAgICAgICAgIG9mZnNldFsxXSArPSBlbGVtZW50Lm9mZnNldFRvcDtcclxuICAgICAgICAgICAgZWxlbWVudCA9IGVsZW1lbnQub2Zmc2V0UGFyZW50O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG9mZnNldDtcclxuICAgIH0sXHJcbiAgICBnZXRQb3NpdGlvbkdsb2JhbFg6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgb2Zmc2V0ID0gMCxcclxuICAgICAgICAgICAgZWxlbWVudCA9IHRoaXMuX2VsZW1lbnQ7XHJcblxyXG4gICAgICAgIHdoaWxlIChlbGVtZW50KSB7XHJcbiAgICAgICAgICAgIG9mZnNldCArPSBlbGVtZW50Lm9mZnNldExlZnQ7XHJcbiAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50Lm9mZnNldFBhcmVudDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBvZmZzZXQ7XHJcbiAgICB9LFxyXG4gICAgZ2V0UG9zaXRpb25HbG9iYWxZOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIG9mZnNldCA9IDAsXHJcbiAgICAgICAgICAgIGVsZW1lbnQgPSB0aGlzLl9lbGVtZW50O1xyXG5cclxuICAgICAgICB3aGlsZSAoZWxlbWVudCkge1xyXG4gICAgICAgICAgICBvZmZzZXQgKz0gZWxlbWVudC5vZmZzZXRUb3A7XHJcbiAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50Lm9mZnNldFBhcmVudDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBvZmZzZXQ7XHJcbiAgICB9LFxyXG4gICAgYWRkRXZlbnRMaXN0ZW5lcjogZnVuY3Rpb24gKHR5cGUsIGxpc3RlbmVyLCB1c2VDYXB0dXJlKSB7XHJcbiAgICAgICAgdGhpcy5fZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyLCB1c2VDYXB0dXJlKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICByZW1vdmVFdmVudExpc3RlbmVyOiBmdW5jdGlvbiAodHlwZSwgbGlzdGVuZXIsIHVzZUNhcHR1cmUpIHtcclxuICAgICAgICB0aGlzLl9lbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgbGlzdGVuZXIsIHVzZUNhcHR1cmUpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIGRpc3BhdGNoRXZlbnQgOiBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIHRoaXMuX2VsZW1lbnQuZGlzcGF0Y2hFdmVudChldmVudCk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgc2V0U3R5bGVDbGFzczogZnVuY3Rpb24gKHN0eWxlKSB7XHJcbiAgICAgICAgdGhpcy5fZWxlbWVudC5jbGFzc05hbWUgPSBzdHlsZTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBzZXRTdHlsZVByb3BlcnR5OiBmdW5jdGlvbiAocHJvcGVydHksIHZhbHVlKSB7XHJcbiAgICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZVtwcm9wZXJ0eV0gPSB2YWx1ZTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBnZXRTdHlsZVByb3BlcnR5OiBmdW5jdGlvbiAocHJvcGVydHkpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fZWxlbWVudC5zdHlsZVtwcm9wZXJ0eV07XHJcbiAgICB9LFxyXG4gICAgc2V0U3R5bGVQcm9wZXJ0aWVzOiBmdW5jdGlvbiAocHJvcGVydGllcykge1xyXG4gICAgICAgIGZvciAodmFyIHAgaW4gcHJvcGVydGllcyl7XHJcbiAgICAgICAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGVbcF0gPSBwcm9wZXJ0aWVzW3BdO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBkZWxldGVTdHlsZUNsYXNzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5fZWxlbWVudC5jbGFzc05hbWUgPSAnJztcclxuICAgICAgICByZXR1cm4gdGhpc1xyXG4gICAgfSxcclxuICAgIGRlbGV0ZVN0eWxlUHJvcGVydHk6IGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xyXG4gICAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGVbcHJvcGVydHldID0gJyc7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgZGVsZXRlU3R5bGVQcm9wZXJ0aWVzOiBmdW5jdGlvbiAocHJvcGVydGllcykge1xyXG4gICAgICAgIGZvciAodmFyIHAgaW4gcHJvcGVydGllcyl7XHJcbiAgICAgICAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGVbcF0gPSAnJztcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgZ2V0Q2hpbGRBdDogZnVuY3Rpb24gKGluZGV4KSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBOb2RlKCkuc2V0RWxlbWVudCh0aGlzLl9lbGVtZW50LmNoaWxkcmVuW2luZGV4XSk7XHJcbiAgICB9LFxyXG4gICAgZ2V0Q2hpbGRJbmRleDogZnVuY3Rpb24gKG5vZGUpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXhPZih0aGlzLl9lbGVtZW50LCBub2RlLmdldEVsZW1lbnQoKSk7XHJcbiAgICB9LFxyXG4gICAgZ2V0TnVtQ2hpbGRyZW46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fZWxlbWVudC5jaGlsZHJlbi5sZW5ndGg7XHJcbiAgICB9LFxyXG4gICAgZ2V0Rmlyc3RDaGlsZDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiBuZXcgTm9kZSgpLnNldEVsZW1lbnQodGhpcy5fZWxlbWVudC5maXJzdENoaWxkKTtcclxuICAgIH0sXHJcbiAgICBnZXRMYXN0Q2hpbGQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gbmV3IE5vZGUoKS5zZXRFbGVtZW50KHRoaXMuX2VsZW1lbnQubGFzdENoaWxkKTtcclxuICAgIH0sXHJcbiAgICBoYXNDaGlsZHJlbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9lbGVtZW50LmNoaWxkcmVuLmxlbmd0aCAhPSAwO1xyXG4gICAgfSxcclxuICAgIGNvbnRhaW5zOiBmdW5jdGlvbiAobm9kZSkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9pbmRleE9mKHRoaXMuX2VsZW1lbnQsIG5vZGUuZ2V0RWxlbWVudCgpKSAhPSAtMTtcclxuICAgIH0sXHJcbiAgICBfaW5kZXhPZjogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQsIGVsZW1lbnQpIHtcclxuICAgICAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLmluZGV4T2YuY2FsbChwYXJlbnRFbGVtZW50LmNoaWxkcmVuLCBlbGVtZW50KTtcclxuICAgIH0sXHJcbiAgICBzZXRQcm9wZXJ0eTogZnVuY3Rpb24gKHByb3BlcnR5LCB2YWx1ZSkge1xyXG4gICAgICAgIHRoaXMuX2VsZW1lbnRbcHJvcGVydHldID0gdmFsdWU7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgc2V0UHJvcGVydGllczogZnVuY3Rpb24gKHByb3BlcnRpZXMpIHtcclxuICAgICAgICBmb3IgKHZhciBwIGluIHByb3BlcnRpZXMpe1xyXG4gICAgICAgICAgICB0aGlzLl9lbGVtZW50W3BdID0gcHJvcGVydGllc1twXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgZ2V0UHJvcGVydHk6IGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9lbGVtZW50W3Byb3BlcnR5XTtcclxuICAgIH0sXHJcbiAgICBzZXRFbGVtZW50OiBmdW5jdGlvbiAoZWxlbWVudCkge1xyXG4gICAgICAgIHRoaXMuX2VsZW1lbnQgPSBlbGVtZW50O1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIGdldEVsZW1lbnQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fZWxlbWVudDtcclxuICAgIH0sXHJcbiAgICBnZXRTdHlsZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9lbGVtZW50LnN0eWxlO1xyXG4gICAgfSxcclxuICAgIGdldFBhcmVudDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiBuZXcgTm9kZSgpLnNldEVsZW1lbnQodGhpcy5fZWxlbWVudC5wYXJlbnROb2RlKTtcclxuICAgIH1cclxufTtcclxuXHJcbk5vZGUuZ2V0Tm9kZUJ5RWxlbWVudCA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XHJcbiAgICByZXR1cm4gbmV3IE5vZGUoKS5zZXRFbGVtZW50KGVsZW1lbnQpO1xyXG59O1xyXG5Ob2RlLmdldE5vZGVCeUlkID0gZnVuY3Rpb24gKGlkKSB7XHJcbiAgICByZXR1cm4gbmV3IE5vZGUoKS5zZXRFbGVtZW50KGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKSk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE5vZGU7IiwidmFyIE5vZGVFdmVudCA9IHtcclxuICAgIE1PVVNFX0RPV04gICA6ICdtb3VzZWRvd24nLFxyXG4gICAgTU9VU0VfVVAgICAgIDogJ21vdXNldXAnLFxyXG4gICAgTU9VU0VfT1ZFUiAgIDogJ21vdXNlb3ZlcicsXHJcbiAgICBNT1VTRV9NT1ZFICAgOiAnbW91c2Vtb3ZlJyxcclxuICAgIE1PVVNFX09VVCAgICA6ICdtb3VzZW91dCcsXHJcbiAgICBLRVlfRE9XTiAgICAgOiAna2V5ZG93bicsXHJcbiAgICBLRVlfVVAgICAgICAgOiAna2V5dXAnLFxyXG4gICAgQ0hBTkdFICAgICAgIDogJ2NoYW5nZScsXHJcbiAgICBGSU5JU0ggICAgICAgOiAnZmluaXNoJyxcclxuICAgIERCTF9DTElDSyAgICA6ICdkYmxjbGljaycsXHJcbiAgICBPTl9DTElDSyAgICAgOiAnY2xpY2snLFxyXG4gICAgU0VMRUNUX1NUQVJUIDogJ3NlbGVjdHN0YXJ0JyxcclxuICAgIERSQUdfU1RBUlQgICA6ICdkcmFnc3RhcnQnLFxyXG4gICAgRFJBRyAgICAgICAgIDogJ2RyYWcnLFxyXG4gICAgRFJBR19FTkQgICAgIDogJ2RyYWdlbmQnLFxyXG5cclxuICAgIERSQUdfRU5URVIgICA6ICdkcmFnZW50ZXInLFxyXG4gICAgRFJBR19PVkVSICAgIDogJ2RyYWdvdmVyJyxcclxuICAgIERSQUdfTEVBVkUgICA6ICdkcmFnbGVhdmUnLFxyXG5cclxuICAgIFJFU0laRSAgICAgICA6ICdyZXNpemUnXHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE5vZGVFdmVudDsiLCJ2YXIgU3R5bGUgPSB7IFxuXHRzdHJpbmcgOiBcIiNjb250cm9sS2l0e3Bvc2l0aW9uOmFic29sdXRlO3RvcDowO2xlZnQ6MDt3aWR0aDoxMDAlO2hlaWdodDoxMDAlOy13ZWJraXQtdG91Y2gtY2FsbG91dDpub25lOy13ZWJraXQtdXNlci1zZWxlY3Q6bm9uZTsta2h0bWwtdXNlci1zZWxlY3Q6bm9uZTstbW96LXVzZXItc2VsZWN0Om5vbmU7LW1zLXVzZXItc2VsZWN0Om5vbmU7dXNlci1zZWxlY3Q6bm9uZTtwb2ludGVyLWV2ZW50czpub25lfSNjb250cm9sS2l0IC5wYW5lbHstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7cG9pbnRlci1ldmVudHM6YXV0bztwb3NpdGlvbjpyZWxhdGl2ZTt6LWluZGV4OjE7LXdlYmtpdC10b3VjaC1jYWxsb3V0Om5vbmU7LXdlYmtpdC11c2VyLXNlbGVjdDpub25lOy1raHRtbC11c2VyLXNlbGVjdDpub25lOy1tb3otdXNlci1zZWxlY3Q6bm9uZTstbXMtdXNlci1zZWxlY3Q6bm9uZTt1c2VyLXNlbGVjdDpub25lO292ZXJmbG93OmhpZGRlbjtvcGFjaXR5OjE7ZmxvYXQ6bGVmdDt3aWR0aDoyMDBweDtib3JkZXItcmFkaXVzOjNweDstbW96LWJvcmRlci1yYWRpdXM6M3B4O2JveC1zaGFkb3c6MCAycHggMnB4IHJnYmEoMCwwLDAsLjI1KTttYXJnaW46MDtwYWRkaW5nOjA7YmFja2dyb3VuZC1jb2xvcjojMWExYTFhO2ZvbnQtZmFtaWx5OkFyaWFsLHNhbnMtc2VyaWZ9I2NvbnRyb2xLaXQgLnBhbmVsIC53cmFwe3dpZHRoOmF1dG87aGVpZ2h0OmF1dG87bWFyZ2luOjA7cGFkZGluZzowO3Bvc2l0aW9uOnJlbGF0aXZlO292ZXJmbG93OmhpZGRlbn0jY29udHJvbEtpdCAucGFuZWwgdWx7bWFyZ2luOjA7cGFkZGluZzowO2xpc3Qtc3R5bGU6bm9uZX0jY29udHJvbEtpdCAucGFuZWwgLmNvbG9yLCNjb250cm9sS2l0IC5wYW5lbCBpbnB1dFt0eXBlPXRleHRdLCNjb250cm9sS2l0IC5wYW5lbCB0ZXh0YXJlYSwjY29udHJvbEtpdCAucGlja2VyIGlucHV0W3R5cGU9dGV4dF17LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O3dpZHRoOjEwMCU7aGVpZ2h0OjI1cHg7cGFkZGluZzowIDAgMCA4cHg7Zm9udC1mYW1pbHk6QXJpYWwsc2Fucy1zZXJpZjtmb250LXNpemU6MTFweDtjb2xvcjojZmZmO3RleHQtc2hhZG93OjFweCAxcHggIzAwMDtvdXRsaW5lOjA7YmFja2dyb3VuZDojMjIyNzI5O2JhY2tncm91bmQtaW1hZ2U6LW8tbGluZWFyLWdyYWRpZW50KHJnYmEoMCwwLDAsLjA3NSkgMCxyZ2JhKDAsMCwwLC4xMjUpIDEwMCUpO2JhY2tncm91bmQtaW1hZ2U6bGluZWFyLWdyYWRpZW50KHJnYmEoMCwwLDAsLjA3NSkgMCxyZ2JhKDAsMCwwLC4xMjUpIDEwMCUpO2JvcmRlcjpub25lO2JveC1zaGFkb3c6MCAwIDAgMXB4ICMxZjFmMWYgaW5zZXQ7Ym9yZGVyLXJhZGl1czoycHg7LW1vei1ib3JkZXItcmFkaXVzOjJweH0jY29udHJvbEtpdCAucGFuZWwgLmJ1dHRvbiwjY29udHJvbEtpdCAucGFuZWwgLnNlbGVjdCwjY29udHJvbEtpdCAucGFuZWwgLnNlbGVjdC1hY3RpdmUsI2NvbnRyb2xLaXQgLnBpY2tlciAuYnV0dG9uey13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveDtjdXJzb3I6cG9pbnRlcjt3aWR0aDoxMDAlO2hlaWdodDoyNnB4O21hcmdpbjowO2JhY2tncm91bmQtaW1hZ2U6LW8tbGluZWFyLWdyYWRpZW50KCM0MDQwNDAgMCwjM2IzYjNiIDEwMCUpO2JhY2tncm91bmQtaW1hZ2U6bGluZWFyLWdyYWRpZW50KCM0MDQwNDAgMCwjM2IzYjNiIDEwMCUpO2JvcmRlcjpub25lO291dGxpbmU6MDtib3JkZXItcmFkaXVzOjJweDtib3gtc2hhZG93OjAgMCAwIDFweCAjMWYxZjFmIGluc2V0LC0xcHggMnB4IDAgMCAjNGE0YTRhIGluc2V0O2ZvbnQtZmFtaWx5OkFyaWFsLHNhbnMtc2VyaWY7Y29sb3I6I2ZmZn0jY29udHJvbEtpdCAucGFuZWwgdGV4dGFyZWF7cGFkZGluZzo1cHggOHB4IDJweDtvdmVyZmxvdzpoaWRkZW47cmVzaXplOm5vbmU7dmVydGljYWwtYWxpZ246dG9wO3doaXRlLXNwYWNlOm5vd3JhcH0jY29udHJvbEtpdCAucGFuZWwgLnRleHRhcmVhLXdyYXB7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O3dpZHRoOjEwMCU7cGFkZGluZzowO2Zsb2F0OmxlZnQ7aGVpZ2h0OjEwMCU7b3ZlcmZsb3c6aGlkZGVuO2JvcmRlcjpub25lO2JvcmRlci1yYWRpdXM6MnB4Oy1tb3otYm9yZGVyLXJhZGl1czoycHg7YmFja2dyb3VuZC1jb2xvcjojMjIyNzI5O2JveC1zaGFkb3c6MCAwIDFweCAycHggcmdiYSgwLDAsMCwuMDEyNSkgaW5zZXQsMCAwIDFweCAxcHggIzExMTMxNCBpbnNldDtiYWNrZ3JvdW5kLWltYWdlOi1vLWxpbmVhci1ncmFkaWVudChyZ2JhKDAsMCwwLC4wNzUpIDAscmdiYSgwLDAsMCwuMTI1KSAxMDAlKTtiYWNrZ3JvdW5kLWltYWdlOmxpbmVhci1ncmFkaWVudChyZ2JhKDAsMCwwLC4wNzUpIDAscmdiYSgwLDAsMCwuMTI1KSAxMDAlKX0jY29udHJvbEtpdCAucGFuZWwgLnRleHRhcmVhLXdyYXAgdGV4dGFyZWF7Ym9yZGVyOm5vbmU7Ym9yZGVyLXJhZGl1czoycHg7LW1vei1ib3JkZXItcmFkaXVzOjJweDtib3gtc2hhZG93Om5vbmU7YmFja2dyb3VuZDowIDB9I2NvbnRyb2xLaXQgLnBhbmVsIC50ZXh0YXJlYS13cmFwIC5zY3JvbGxCYXJ7Ym9yZGVyOjFweCBzb2xpZCAjMTAxMjEzO2JvcmRlci1ib3R0b20tcmlnaHQtcmFkaXVzOjJweDtib3JkZXItdG9wLXJpZ2h0LXJhZGl1czoycHg7Ym9yZGVyLWxlZnQ6bm9uZTtib3gtc2hhZG93OjAgMCAxcHggMnB4IHJnYmEoMCwwLDAsLjAxMjUpIGluc2V0LDAgMCAxcHggMXB4ICMxMTEzMTQgaW5zZXR9I2NvbnRyb2xLaXQgLnBhbmVsIGNhbnZhc3tjdXJzb3I6cG9pbnRlcjt2ZXJ0aWNhbC1hbGlnbjpib3R0b207Ym9yZGVyOm5vbmU7Ym94LXNoYWRvdzowIDAgMCAxcHggIzFmMWYxZiBpbnNldDtib3JkZXItcmFkaXVzOjJweDstbW96LWJvcmRlci1yYWRpdXM6MnB4fSNjb250cm9sS2l0IC5wYW5lbCAuY2FudmFzLXdyYXAsI2NvbnRyb2xLaXQgLnBhbmVsIC5zdmctd3JhcHttYXJnaW46NnB4IDAgMDtwb3NpdGlvbjpyZWxhdGl2ZTt3aWR0aDo3MCU7ZmxvYXQ6cmlnaHQ7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O2JvcmRlcjpub25lO2JvcmRlci1yYWRpdXM6MnB4Oy1tb3otYm9yZGVyLXJhZGl1czoycHg7YmFja2dyb3VuZDojMWUyMjI0O2JhY2tncm91bmQtaW1hZ2U6LW8tbGluZWFyLWdyYWRpZW50KHRyYW5zcGFyZW50IDAscmdiYSgwLDAsMCwuMDUpIDEwMCUpO2JhY2tncm91bmQtaW1hZ2U6bGluZWFyLWdyYWRpZW50KHRyYW5zcGFyZW50IDAscmdiYSgwLDAsMCwuMDUpIDEwMCUpfSNjb250cm9sS2l0IC5wYW5lbCAuY2FudmFzLXdyYXAgc3ZnLCNjb250cm9sS2l0IC5wYW5lbCAuc3ZnLXdyYXAgc3Zne3Bvc2l0aW9uOmFic29sdXRlO2xlZnQ6MDt0b3A6MDtjdXJzb3I6cG9pbnRlcjt2ZXJ0aWNhbC1hbGlnbjpib3R0b207Ym9yZGVyOm5vbmU7Ym94LXNoYWRvdzowIDAgMCAxcHggIzFmMWYxZiBpbnNldDtib3JkZXItcmFkaXVzOjJweDstbW96LWJvcmRlci1yYWRpdXM6MnB4fSNjb250cm9sS2l0IC5wYW5lbCAuYnV0dG9uLCNjb250cm9sS2l0IC5waWNrZXIgLmJ1dHRvbntmb250LXNpemU6MTBweDtmb250LXdlaWdodDo3MDA7dGV4dC1zaGFkb3c6MCAxcHggIzAwMDt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2V9I2NvbnRyb2xLaXQgLnBhbmVsIC5idXR0b246aG92ZXIsI2NvbnRyb2xLaXQgLnBpY2tlciAuYnV0dG9uOmhvdmVye2JhY2tncm91bmQtaW1hZ2U6LW8tbGluZWFyLWdyYWRpZW50KCM0NTQ1NDUgMCwjM2IzYjNiIDEwMCUpO2JhY2tncm91bmQtaW1hZ2U6bGluZWFyLWdyYWRpZW50KCM0NTQ1NDUgMCwjM2IzYjNiIDEwMCUpfSNjb250cm9sS2l0IC5wYW5lbCAuYnV0dG9uOmFjdGl2ZSwjY29udHJvbEtpdCAucGlja2VyIC5idXR0b246YWN0aXZle2JhY2tncm91bmQtaW1hZ2U6LW8tbGluZWFyLWdyYWRpZW50KCM0MDQwNDAgMCwjM2IzYjNiIDEwMCUpO2JhY2tncm91bmQtaW1hZ2U6bGluZWFyLWdyYWRpZW50KCM0MDQwNDAgMCwjM2IzYjNiIDEwMCUpfSNjb250cm9sS2l0IC5wYW5lbCAuY29sb3Itd2l0aC1wcmVzZXQtd3JhcCwjY29udHJvbEtpdCAucGFuZWwgLmlucHV0LXdpdGgtcHJlc2V0LXdyYXB7d2lkdGg6MTAwJTtmbG9hdDpsZWZ0fSNjb250cm9sS2l0IC5wYW5lbCAuY29sb3Itd2l0aC1wcmVzZXQtd3JhcCAuY29sb3IsI2NvbnRyb2xLaXQgLnBhbmVsIC5pbnB1dC13aXRoLXByZXNldC13cmFwIGlucHV0W3R5cGU9dGV4dF17cGFkZGluZy1yaWdodDoyNXB4O2JvcmRlci10b3AtcmlnaHQtcmFkaXVzOjJweDtib3JkZXItYm90dG9tLXJpZ2h0LXJhZGl1czoycHg7ZmxvYXQ6bGVmdH0jY29udHJvbEtpdCAucGFuZWwgLmJ1dHRvbi1wcmVzZXQsI2NvbnRyb2xLaXQgLnBhbmVsIC5idXR0b24tcHJlc2V0LWFjdGl2ZXstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7cG9zaXRpb246YWJzb2x1dGU7cmlnaHQ6MDt3aWR0aDoyMHB4O2hlaWdodDoyNXB4O21hcmdpbjowO2N1cnNvcjpwb2ludGVyO2Zsb2F0OnJpZ2h0O2JvcmRlcjpub25lO2JvcmRlci10b3AtcmlnaHQtcmFkaXVzOjJweDtib3JkZXItYm90dG9tLXJpZ2h0LXJhZGl1czoycHg7Ym94LXNoYWRvdzowIDAgMCAxcHggIzFmMWYxZiBpbnNldCwtMXB4IDJweCAwIDAgIzRhNGE0YSBpbnNldDtvdXRsaW5lOjB9I2NvbnRyb2xLaXQgLnBhbmVsIC5idXR0b24tcHJlc2V0LWFjdGl2ZSwjY29udHJvbEtpdCAucGFuZWwgLmJ1dHRvbi1wcmVzZXQ6aG92ZXJ7YmFja2dyb3VuZDp1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFGQ0FZQUFBQjRrYTFWQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQUc1SlJFRlVlTnBpNU9EaWFtUmdZS2hqd0E0YW1WeDhneGptTDFyQzhQM3JWeFE4YitFU0JoZmZJQVptTlIyOUE1ZXZYV2RpWkdDMDE5WFNaR0JnWUdCWXZtWTl3N0kxNnhvWkdCZ2FXS0JHMVM5YnMrNC9Bd05EUFFNREExeVNnWUdCZ2RFblBBYlp6Z1kwbWdFd0FFOWxKVDFscnNmZkFBQUFBRWxGVGtTdVFtQ0MpIDUwJSA1MCUgbm8tcmVwZWF0LGxpbmVhci1ncmFkaWVudCgjNDU0NTQ1IDAsIzNiM2IzYiAxMDAlKX0jY29udHJvbEtpdCAucGFuZWwgLmJ1dHRvbi1wcmVzZXR7YmFja2dyb3VuZDp1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFGQ0FZQUFBQjRrYTFWQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQUc1SlJFRlVlTnBpNU9EaWFtUmdZS2hqd0E0YW1WeDhneGptTDFyQzhQM3JWeFE4YitFU0JoZmZJQVptTlIyOUE1ZXZYV2RpWkdDMDE5WFNaR0JnWUdCWXZtWTl3N0kxNnhvWkdCZ2FXS0JHMVM5YnMrNC9Bd05EUFFNREExeVNnWUdCZ2RFblBBYlp6Z1kwbWdFd0FFOWxKVDFscnNmZkFBQUFBRWxGVGtTdVFtQ0MpIDUwJSA1MCUgbm8tcmVwZWF0LGxpbmVhci1ncmFkaWVudCgjNDA0MDQwIDAsIzNiM2IzYiAxMDAlKX0jY29udHJvbEtpdCAucGFuZWwgaW5wdXRbdHlwZT1jaGVja2JveF17bWFyZ2luOjZweCAwIDB9I2NvbnRyb2xLaXQgLnBhbmVsIC5zZWxlY3QsI2NvbnRyb2xLaXQgLnBhbmVsIC5zZWxlY3QtYWN0aXZle3BhZGRpbmctbGVmdDoxMHB4O3BhZGRpbmctcmlnaHQ6MjBweDtmb250LXNpemU6MTFweDt0ZXh0LWFsaWduOmxlZnQ7dGV4dC1zaGFkb3c6MXB4IDFweCAjMDAwO2N1cnNvcjpwb2ludGVyO292ZXJmbG93OmhpZGRlbjt3aGl0ZS1zcGFjZTpub3dyYXA7dGV4dC1vdmVyZmxvdzplbGxpcHNpc30jY29udHJvbEtpdCAucGFuZWwgLnNlbGVjdHtiYWNrZ3JvdW5kOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUJBQUFBQUxDQVlBQUFCMjRnMDVBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBTU5KUkVGVWVOcWNrakVLd2pBVWhqOGw1M0FRNTI2QkhLS0xJaFNsSGtIeEJra3VJRldQSUxRT1FRZDNWNFZ1WGlndUZsckZSUHpoTFhsODMzdUIxMHV6bkNhUCtxNEJFcWxzODNZNUhnaEZ0T0gxYW1rQWl0MitJd2ttelhJR3c1SGVGRnZmWkZOcy9XQTQwbW1XNDcwUDFnZjhMb2tKUkNJVjExdk45YmI0MkM2Ukt2b0RBZGhYL1JYeHFPOEcwRi82RmpCQlFTSVY4K21FMlhUY2FWVHVUT2xPMFEzNmdDbmR5VmJ1L0E1SHA3ZnZ3THltYWVCbnVITklMUW0vd2dEUEFRQVBOSXNIbk83OTRRQUFBQUJKUlU1RXJrSmdnZz09KSAxMDAlIDUwJSBuby1yZXBlYXQsbGluZWFyLWdyYWRpZW50KCM0MDQwNDAgMCwjM2IzYjNiIDEwMCUpfSNjb250cm9sS2l0IC5wYW5lbCAuc2VsZWN0LWFjdGl2ZSwjY29udHJvbEtpdCAucGFuZWwgLnNlbGVjdDpob3ZlcntiYWNrZ3JvdW5kOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUJBQUFBQUxDQVlBQUFCMjRnMDVBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBTU5KUkVGVWVOcWNrakVLd2pBVWhqOGw1M0FRNTI2QkhLS0xJaFNsSGtIeEJra3VJRldQSUxRT1FRZDNWNFZ1WGlndUZsckZSUHpoTFhsODMzdUIxMHV6bkNhUCtxNEJFcWxzODNZNUhnaEZ0T0gxYW1rQWl0MitJd2ttelhJR3c1SGVGRnZmWkZOcy9XQTQwbW1XNDcwUDFnZjhMb2tKUkNJVjExdk45YmI0MkM2Ukt2b0RBZGhYL1JYeHFPOEcwRi82RmpCQlFTSVY4K21FMlhUY2FWVHVUT2xPMFEzNmdDbmR5VmJ1L0E1SHA3ZnZ3THltYWVCbnVITklMUW0vd2dEUEFRQVBOSXNIbk83OTRRQUFBQUJKUlU1RXJrSmdnZz09KSAxMDAlIDUwJSBuby1yZXBlYXQsbGluZWFyLWdyYWRpZW50KCM0NTQ1NDUgMCwjM2IzYjNiIDEwMCUpfSNjb250cm9sS2l0IC5wYW5lbCAuc2xpZGVyLWhhbmRsZSwjY29udHJvbEtpdCAucGFuZWwgLnNsaWRlci1zbG90LCNjb250cm9sS2l0IC5wYW5lbCAuc2xpZGVyLXdyYXAsI2NvbnRyb2xLaXQgLnBhbmVsIC53cmFwLXNsaWRlcnstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3h9I2NvbnRyb2xLaXQgLnBhbmVsIC53cmFwLXNsaWRlcnt3aWR0aDo3MCU7cGFkZGluZzo2cHggMCAwO2Zsb2F0OnJpZ2h0O2hlaWdodDoxMDAlfSNjb250cm9sS2l0IC5wYW5lbCAud3JhcC1zbGlkZXIgaW5wdXRbdHlwZT10ZXh0XXt3aWR0aDoyNSU7dGV4dC1hbGlnbjpjZW50ZXI7cGFkZGluZzowO2Zsb2F0OnJpZ2h0fSNjb250cm9sS2l0IC5wYW5lbCAuc2xpZGVyLXdyYXB7ZmxvYXQ6bGVmdDtjdXJzb3I6ZXctcmVzaXplO3dpZHRoOjcwJX0jY29udHJvbEtpdCAucGFuZWwgLnNsaWRlci1zbG90e3dpZHRoOjEwMCU7aGVpZ2h0OjI1cHg7cGFkZGluZzozcHg7YmFja2dyb3VuZC1jb2xvcjojMWUyMjI0O2JvcmRlcjpub25lO2JveC1zaGFkb3c6MCAwIDAgMXB4ICMxZjFmMWYgaW5zZXQ7Ym9yZGVyLXJhZGl1czoycHg7LW1vei1ib3JkZXItcmFkaXVzOjJweH0jY29udHJvbEtpdCAucGFuZWwgLnNsaWRlci1oYW5kbGV7cG9zaXRpb246cmVsYXRpdmU7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJTtiYWNrZ3JvdW5kOiNiMzI0MzU7YmFja2dyb3VuZC1pbWFnZTotby1saW5lYXItZ3JhZGllbnQodHJhbnNwYXJlbnQgMCxyZ2JhKDAsMCwwLC4xKSAxMDAlKTtiYWNrZ3JvdW5kLWltYWdlOmxpbmVhci1ncmFkaWVudCh0cmFuc3BhcmVudCAwLHJnYmEoMCwwLDAsLjEpIDEwMCUpO2JveC1zaGFkb3c6MCAxcHggMCAwICMwZjBmMGZ9I2NvbnRyb2xLaXQgLnBhbmVsIC5jb2xvcnstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7LXdlYmtpdC10b3VjaC1jYWxsb3V0Om5vbmU7LXdlYmtpdC11c2VyLXNlbGVjdDpub25lOy1raHRtbC11c2VyLXNlbGVjdDpub25lOy1tb3otdXNlci1zZWxlY3Q6bm9uZTstbXMtdXNlci1zZWxlY3Q6bm9uZTt1c2VyLXNlbGVjdDpub25lO2N1cnNvcjpwb2ludGVyO3dpZHRoOjEwMCU7aGVpZ2h0OjI1cHg7cGFkZGluZzowO2JvcmRlcjpub25lO2JhY2tncm91bmQ6I2ZmZjtib3gtc2hhZG93OjAgMCAwIDFweCAjMTExMzE0IGluc2V0O3RleHQtYWxpZ246Y2VudGVyO2xpbmUtaGVpZ2h0OjI1cHg7Ym9yZGVyLXJhZGl1czoycHg7LW1vei1ib3JkZXItcmFkaXVzOjJweH0jY29udHJvbEtpdCAucGFuZWwgLmdyYXBoLXNsaWRlci14LXdyYXAsI2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaC1zbGlkZXIteS13cmFwe3Bvc2l0aW9uOmFic29sdXRlOy13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveH0jY29udHJvbEtpdCAucGFuZWwgLmdyYXBoLXNsaWRlci14LXdyYXB7Ym90dG9tOjA7bGVmdDowO3dpZHRoOjEwMCU7cGFkZGluZzo2cHggMjBweCA2cHggNnB4fSNjb250cm9sS2l0IC5wYW5lbCAuZ3JhcGgtc2xpZGVyLXktd3JhcHt0b3A6MDtyaWdodDowO2hlaWdodDoxMDAlO3BhZGRpbmc6NnB4IDZweCAyMHB4fSNjb250cm9sS2l0IC5wYW5lbCAuZ3JhcGgtc2xpZGVyLXgsI2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaC1zbGlkZXIteXstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym9yZGVyLXJhZGl1czoycHg7LW1vei1ib3JkZXItcmFkaXVzOjJweDtiYWNrZ3JvdW5kOnJnYmEoMjQsMjcsMjksLjUpO2JvcmRlcjoxcHggc29saWQgIzE4MWIxZH0jY29udHJvbEtpdCAucGFuZWwgLmdyYXBoLXNsaWRlci14e2hlaWdodDo4cHh9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaC1zbGlkZXIteXt3aWR0aDo4cHg7aGVpZ2h0OjEwMCV9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaC1zbGlkZXIteC1oYW5kbGUsI2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaC1zbGlkZXIteS1oYW5kbGV7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O2N1cnNvcjpwb2ludGVyO2JvcmRlcjoxcHggc29saWQgIzE4MWIxZDtiYWNrZ3JvdW5kOiMzMDM2Mzl9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaC1zbGlkZXIteC1oYW5kbGV7d2lkdGg6MjBweDtoZWlnaHQ6MTAwJTtib3JkZXItdG9wOm5vbmU7Ym9yZGVyLWJvdHRvbTpub25lfSNjb250cm9sS2l0IC5wYW5lbCAuZ3JhcGgtc2xpZGVyLXktaGFuZGxle3dpZHRoOjEwMCU7aGVpZ2h0OjIwcHg7Ym9yZGVyLWxlZnQ6bm9uZTtib3JkZXItcmlnaHQ6bm9uZX0jY29udHJvbEtpdCAuc3ViLWdyb3VwIC53cmFwIC53cmFwIC53cmFwe3dpZHRoOjI1JSFpbXBvcnRhbnQ7cGFkZGluZzowIWltcG9ydGFudDtmbG9hdDpsZWZ0IWltcG9ydGFudH0jY29udHJvbEtpdCAuc3ViLWdyb3VwIC53cmFwIC53cmFwIC53cmFwIC5sYWJlbHt3aWR0aDoxMDAlIWltcG9ydGFudDtwYWRkaW5nOjhweCAwIDAhaW1wb3J0YW50O2NvbG9yOiM4Nzg3ODchaW1wb3J0YW50O3RleHQtYWxpZ246Y2VudGVyIWltcG9ydGFudDt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2UhaW1wb3J0YW50O2ZvbnQtd2VpZ2h0OjcwMCFpbXBvcnRhbnQ7dGV4dC1zaGFkb3c6MXB4IDFweCAjMWExYTFhIWltcG9ydGFudH0jY29udHJvbEtpdCAuc3ViLWdyb3VwIC53cmFwIC53cmFwIC53cmFwIGlucHV0W3R5cGU9dGV4dF17cGFkZGluZzowO3RleHQtYWxpZ246Y2VudGVyfSNjb250cm9sS2l0IC5vcHRpb25ze3BvaW50ZXItZXZlbnRzOmF1dG87LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O2JvcmRlcjoxcHggc29saWQgIzFmMWYxZjtib3JkZXItcmFkaXVzOjJweDstbW96LWJvcmRlci1yYWRpdXM6MnB4O3Bvc2l0aW9uOmFic29sdXRlO3otaW5kZXg6MjE0NzQ4MzYzODtsZWZ0OjA7dG9wOjA7d2lkdGg6YXV0bztoZWlnaHQ6YXV0bztib3gtc2hhZG93OjAgMXB4IDAgMCAjNGE0YTRhIGluc2V0O2JhY2tncm91bmQtY29sb3I6IzQ1NDU0NTtmb250LWZhbWlseTpBcmlhbCxzYW5zLXNlcmlmO2ZvbnQtc2l6ZToxMXB4O2NvbG9yOiNmZmY7dGV4dC1zaGFkb3c6MXB4IDFweCAjMDAwO292ZXJmbG93OmhpZGRlbn0jY29udHJvbEtpdCAub3B0aW9ucyB1bHt3aWR0aDoxMDAlO2xpc3Qtc3R5bGU6bm9uZTttYXJnaW46MDtwYWRkaW5nOjB9I2NvbnRyb2xLaXQgLm9wdGlvbnMgdWwgbGl7bWFyZ2luOjA7d2lkdGg6MTAwJTtoZWlnaHQ6MjVweDtsaW5lLWhlaWdodDoyNXB4O3BhZGRpbmc6MCAyMHB4IDAgMTBweDtvdmVyZmxvdzpoaWRkZW47d2hpdGUtc3BhY2U6bm9ybWFsO3RleHQtb3ZlcmZsb3c6ZWxsaXBzaXM7Y3Vyc29yOnBvaW50ZXJ9I2NvbnRyb2xLaXQgLm9wdGlvbnMgdWwgbGk6aG92ZXJ7YmFja2dyb3VuZC1jb2xvcjojMWYyMzI1fSNjb250cm9sS2l0IC5vcHRpb25zIHVsIC5saS1zZWxlY3RlZHtiYWNrZ3JvdW5kLWNvbG9yOiMyOTJkMzB9I2NvbnRyb2xLaXQgLm9wdGlvbnMgLmNvbG9yey13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveH0jY29udHJvbEtpdCAub3B0aW9ucyAuY29sb3IgLmxpLXNlbGVjdGVkLCNjb250cm9sS2l0IC5vcHRpb25zIC5jb2xvciBsaXstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7cGFkZGluZzowO2hlaWdodDoyNXB4O2xpbmUtaGVpZ2h0OjI1cHg7dGV4dC1hbGlnbjpjZW50ZXJ9I2NvbnRyb2xLaXQgLm9wdGlvbnMgLmNvbG9yIC5saS1zZWxlY3RlZDpob3ZlciwjY29udHJvbEtpdCAub3B0aW9ucyAuY29sb3IgbGk6aG92ZXJ7YmFja2dyb3VuZDowIDA7Zm9udC13ZWlnaHQ6NzAwfSNjb250cm9sS2l0IC5vcHRpb25zIC5jb2xvciAubGktc2VsZWN0ZWR7Zm9udC13ZWlnaHQ6NzAwfSNjb250cm9sS2l0IC5wYW5lbCAubGFiZWwsI2NvbnRyb2xLaXQgLnBpY2tlciAubGFiZWx7d2lkdGg6MTAwJTtmbG9hdDpsZWZ0O2ZvbnQtc2l6ZToxMXB4O2ZvbnQtd2VpZ2h0OjcwMDt0ZXh0LXNoYWRvdzowIDFweCAjMDAwO292ZXJmbG93OmhpZGRlbjt3aGl0ZS1zcGFjZTpub3dyYXA7dGV4dC1vdmVyZmxvdzplbGxpcHNpcztjdXJzb3I6ZGVmYXVsdH0jY29udHJvbEtpdCAucGFuZWwgLmhlYWQsI2NvbnRyb2xLaXQgLnBhbmVsIC5wYW5lbC1oZWFkLWluYWN0aXZlLCNjb250cm9sS2l0IC5waWNrZXIgLmhlYWR7aGVpZ2h0OjMwcHg7cGFkZGluZzowIDEwcHg7YmFja2dyb3VuZDojMWExYTFhO292ZXJmbG93OmhpZGRlbn0jY29udHJvbEtpdCAucGFuZWwgLmhlYWQgLndyYXAsI2NvbnRyb2xLaXQgLnBhbmVsIC5wYW5lbC1oZWFkLWluYWN0aXZlIC53cmFwLCNjb250cm9sS2l0IC5waWNrZXIgLmhlYWQgLndyYXB7d2lkdGg6YXV0bztoZWlnaHQ6YXV0bzttYXJnaW46MDtwYWRkaW5nOjA7cG9zaXRpb246cmVsYXRpdmU7b3ZlcmZsb3c6aGlkZGVufSNjb250cm9sS2l0IC5wYW5lbCAuaGVhZCAubGFiZWwsI2NvbnRyb2xLaXQgLnBpY2tlciAuaGVhZCAubGFiZWx7Y3Vyc29yOnBvaW50ZXI7bGluZS1oZWlnaHQ6MzBweDtjb2xvcjojNjU2OTZifSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLmhlYWR7aGVpZ2h0OjM4cHg7cGFkZGluZzowIDEwcHg7Ym9yZGVyLXRvcDoxcHggc29saWQgIzRmNGY0Zjtib3JkZXItYm90dG9tOjFweCBzb2xpZCAjMjYyNjI2O2JhY2tncm91bmQtaW1hZ2U6LW8tbGluZWFyLWdyYWRpZW50KCM0NTQ1NDUgMCwjM2IzYjNiIDEwMCUpO2JhY2tncm91bmQtaW1hZ2U6bGluZWFyLWdyYWRpZW50KCM0NTQ1NDUgMCwjM2IzYjNiIDEwMCUpO2N1cnNvcjpwb2ludGVyfSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLmhlYWQgLmxhYmVse2ZvbnQtc2l6ZToxMnB4O2xpbmUtaGVpZ2h0OjM4cHg7Y29sb3I6I2ZmZn0jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5oZWFkOmhvdmVye2JvcmRlci10b3A6MXB4IHNvbGlkICM1MjUyNTI7YmFja2dyb3VuZC1pbWFnZTotby1saW5lYXItZ3JhZGllbnQoIzQ1NDU0NSAwLCM0MDQwNDAgMTAwJSk7YmFja2dyb3VuZC1pbWFnZTpsaW5lYXItZ3JhZGllbnQoIzQ1NDU0NSAwLCM0MDQwNDAgMTAwJSl9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCBsaXtoZWlnaHQ6MzVweDtwYWRkaW5nOjAgMTBweH0jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3VwOmxhc3Qtb2YtdHlwZXtib3JkZXItYm90dG9tOm5vbmV9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cHtwYWRkaW5nOjA7aGVpZ2h0OmF1dG87Ym9yZGVyLWJvdHRvbToxcHggc29saWQgIzI0MjQyNH0jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3VwIHVse292ZXJmbG93OmhpZGRlbn0jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3VwIHVsIGxpe2JhY2tncm91bmQ6IzJlMmUyZTtib3JkZXItYm90dG9tOjFweCBzb2xpZCAjMjIyNzI5fSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLnN1Yi1ncm91cC1saXN0IC5zdWItZ3JvdXAgdWwgbGk6bGFzdC1vZi10eXBle2JvcmRlci1ib3R0b206bm9uZX0jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3VwOmZpcnN0LWNoaWxke21hcmdpbi10b3A6MH0jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3VwIC5oZWFkLCNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLnN1Yi1ncm91cC1saXN0IC5zdWItZ3JvdXAgLmhlYWQtaW5hY3RpdmV7Y3Vyc29yOnBvaW50ZXJ9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cCAuaGVhZHtoZWlnaHQ6MjdweDtwYWRkaW5nOjAgMTBweDtib3JkZXItdG9wOm5vbmU7Ym9yZGVyLWJvdHRvbToxcHggc29saWQgIzI0MjQyNDtiYWNrZ3JvdW5kLWltYWdlOm5vbmU7YmFja2dyb3VuZC1jb2xvcjojMjcyNzI3fSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLnN1Yi1ncm91cC1saXN0IC5zdWItZ3JvdXAgLmhlYWQ6aG92ZXJ7YmFja2dyb3VuZC1pbWFnZTpub25lO2JhY2tncm91bmQtY29sb3I6IzI3MjcyN30jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3VwIC5oZWFkLWluYWN0aXZley13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveDtoZWlnaHQ6MjdweDtwYWRkaW5nOjAgMTBweDtib3gtc2hhZG93OjAgMXB4IDAgMCAjNDA0MDQwIGluc2V0O2JhY2tncm91bmQtaW1hZ2U6LW8tbGluZWFyLWdyYWRpZW50KCMzYjNiM2IgMCwjMzgzODM4IDEwMCUpO2JhY2tncm91bmQtaW1hZ2U6bGluZWFyLWdyYWRpZW50KCMzYjNiM2IgMCwjMzgzODM4IDEwMCUpfSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLnN1Yi1ncm91cC1saXN0IC5zdWItZ3JvdXAgLmhlYWQtaW5hY3RpdmU6aG92ZXJ7Ym94LXNoYWRvdzowIDFweCAwIDAgIzQ3NDc0NyBpbnNldDtiYWNrZ3JvdW5kLWltYWdlOm5vbmU7YmFja2dyb3VuZC1pbWFnZTotby1saW5lYXItZ3JhZGllbnQoIzQwNDA0MCAwLCMzYjNiM2IgMTAwJSk7YmFja2dyb3VuZC1pbWFnZTpsaW5lYXItZ3JhZGllbnQoIzQwNDA0MCAwLCMzYjNiM2IgMTAwJSl9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cCAuaGVhZCAubGFiZWwsI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cCAuaGVhZC1pbmFjdGl2ZSAubGFiZWx7bWFyZ2luOjA7cGFkZGluZzowO2xpbmUtaGVpZ2h0OjI3cHg7Y29sb3I6I2ZmZjtmb250LXdlaWdodDo3MDA7Zm9udC1zaXplOjExcHg7dGV4dC1zaGFkb3c6MXB4IDFweCAjMDAwO3RleHQtdHJhbnNmb3JtOmNhcGl0YWxpemV9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cCAuaGVhZCAud3JhcCAubGFiZWwsI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cCAuaGVhZC1pbmFjdGl2ZSAud3JhcCAubGFiZWx7d2lkdGg6MTAwJTtmb250LXdlaWdodDo3MDA7Y29sb3I6I2ZmZjtwYWRkaW5nOjB9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cCAud3JhcCAubGFiZWx7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O2hlaWdodDoxMDAlO3dpZHRoOjMwJTtwYWRkaW5nOjEycHggNXB4IDAgMDtmbG9hdDpsZWZ0O2ZvbnQtc2l6ZToxMXB4O2ZvbnQtd2VpZ2h0OjQwMDtjb2xvcjojYWViNWI4O3RleHQtc2hhZG93OjFweCAxcHggIzAwMH0jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3VwIC53cmFwIC53cmFwey13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveDt3aWR0aDo3MCU7cGFkZGluZzo1cHggMCAwO2Zsb2F0OnJpZ2h0O2hlaWdodDoxMDAlfSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXA6bGFzdC1jaGlsZCAuc2Nyb2xsLWJ1ZmZlcjpudGgtb2YtdHlwZSgzKSwjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwOmxhc3QtY2hpbGQgLnN1Yi1ncm91cC1saXN0e2JvcmRlci1ib3R0b206bm9uZX0jY29udHJvbEtpdCAucGFuZWwgLnNjcm9sbC13cmFwe3Bvc2l0aW9uOnJlbGF0aXZlO292ZXJmbG93OmhpZGRlbn0jY29udHJvbEtpdCAucGFuZWwgLnNjcm9sbC1idWZmZXJ7d2lkdGg6MTAwJTtoZWlnaHQ6OHB4O2JvcmRlci10b3A6MXB4IHNvbGlkICMzYjQ0NDc7Ym9yZGVyLWJvdHRvbToxcHggc29saWQgIzFlMjIyNH0jY29udHJvbEtpdCAucGFuZWwgLnNjcm9sbEJhcnstd2Via2l0LWJveC1zaXppbmc6Y29udGVudC1ib3g7LW1vei1ib3gtc2l6aW5nOmNvbnRlbnQtYm94O2JveC1zaXppbmc6Y29udGVudC1ib3g7d2lkdGg6MTVweDtoZWlnaHQ6MTAwJTtmbG9hdDpyaWdodDt0b3A6MDtwYWRkaW5nOjA7bWFyZ2luOjA7cG9zaXRpb246cmVsYXRpdmU7YmFja2dyb3VuZDojMjEyNjI4O2JhY2tncm91bmQtaW1hZ2U6bGluZWFyLWdyYWRpZW50KHRvIHJpZ2h0LCMyNDI0MjQgMCwjMmUyZTJlIDEwMCUpfSNjb250cm9sS2l0IC5wYW5lbCAuc2Nyb2xsQmFyIC50cmFja3twYWRkaW5nOjAgM3B4IDAgMnB4fSNjb250cm9sS2l0IC5wYW5lbCAuc2Nyb2xsQmFyIC50cmFjayAudGh1bWJ7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O3dpZHRoOjExcHg7cG9zaXRpb246YWJzb2x1dGU7Y3Vyc29yOnBvaW50ZXI7YmFja2dyb3VuZC1jb2xvcjojMzQzNDM0O2JvcmRlcjoxcHggc29saWQgIzFiMWYyMTtib3JkZXItcmFkaXVzOjEwcHg7LW1vei1ib3JkZXItcmFkaXVzOjEwcHg7Ym94LXNoYWRvdzppbnNldCAwIDFweCAwIDAgIzQzNGI1MH0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSwjY29udHJvbEtpdCAucGlja2VyIC5tZW51e2Zsb2F0OnJpZ2h0O3BhZGRpbmc6NXB4IDAgMH0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUgaW5wdXRbdHlwZT1idXR0b25dLCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgaW5wdXRbdHlwZT1idXR0b25dLCNjb250cm9sS2l0IC5waWNrZXIgLm1lbnUgaW5wdXRbdHlwZT1idXR0b25dey13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveDtjdXJzb3I6cG9pbnRlcjtoZWlnaHQ6MjBweDtib3JkZXI6bm9uZTt2ZXJ0aWNhbC1hbGlnbjp0b3A7Ym9yZGVyLXJhZGl1czoycHg7LW1vei1ib3JkZXItcmFkaXVzOjJweDtmb250LWZhbWlseTpBcmlhbCxzYW5zLXNlcmlmO2ZvbnQtc2l6ZToxMHB4O2ZvbnQtd2VpZ2h0OjcwMDtjb2xvcjojYWFhO3RleHQtc2hhZG93OjAgLTFweCAjMDAwO3RleHQtdHJhbnNmb3JtOnVwcGVyY2FzZTtib3gtc2hhZG93OjAgMCAwIDFweCAjMTMxMzEzIGluc2V0LC0xcHggMnB4IDAgMCAjMjEyNTI3IGluc2V0O291dGxpbmU6MH0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ1dHRvbi1tZW51LWNsb3NlLCNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnV0dG9uLW1lbnUtaGlkZSwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ1dHRvbi1tZW51LXNob3csI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtY2xvc2UsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtaGlkZSwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS1zaG93LCNjb250cm9sS2l0IC5waWNrZXIgLm1lbnUgLmJ1dHRvbi1tZW51LWNsb3NlLCNjb250cm9sS2l0IC5waWNrZXIgLm1lbnUgLmJ1dHRvbi1tZW51LWhpZGUsI2NvbnRyb2xLaXQgLnBpY2tlciAubWVudSAuYnV0dG9uLW1lbnUtc2hvd3t3aWR0aDoyMHB4O21hcmdpbi1sZWZ0OjRweH0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ1dHRvbi1tZW51LWhpZGUsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtaGlkZSwjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idXR0b24tbWVudS1oaWRle2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBRkNBWUFBQUI0a2ExVkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFHUkpSRUZVZU5waWRQVU5Zb0NCVTBjTzFETXdNRENZMlRnMHdzUllrQ1ZsRlpVYm9HeTRJbVpsZFUyNHBKeVNDZ08vb0JBREF3T0R3L1ZMNXhtazVSUU9Ncjk5L1JJdUNRUElpbGpNYkJ3WUdCZ1lHSDcvL01tQURDU2xaUmtrcFdVWkFBTUF2VHNnWEJ2T3NxMEFBQUFBU1VWT1JLNUNZSUk9KSA1MCUgNTAlIG5vLXJlcGVhdCwjMWExZDFmfSNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnV0dG9uLW1lbnUtaGlkZTpob3ZlciwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS1oaWRlOmhvdmVyLCNjb250cm9sS2l0IC5waWNrZXIgLm1lbnUgLmJ1dHRvbi1tZW51LWhpZGU6aG92ZXJ7YmFja2dyb3VuZDp1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFGQ0FZQUFBQjRrYTFWQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQUdSSlJFRlVlTnBpZFBVTllvQ0JVMGNPMURNd01EQ1kyVGcwd3NSWWtDVmxGWlVib0d5NEltWmxkVTI0cEp5U0NnTy9vQkFEQXdPRHcvVkw1eG1rNVJRT01yOTkvUkl1Q1FQSWlsak1iQndZR0JnWUdINy8vTW1BRENTbFpSa2twV1VaQUFNQXZUc2dYQnZPc3EwQUFBQUFTVVZPUks1Q1lJST0pIDUwJSA1MCUgbm8tcmVwZWF0LCMwMDA7Ym94LXNoYWRvdzojZmZmIDAsIzAwMCAxMDAlfSNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnV0dG9uLW1lbnUtc2hvdywjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS1zaG93LCNjb250cm9sS2l0IC5waWNrZXIgLm1lbnUgLmJ1dHRvbi1tZW51LXNob3d7YmFja2dyb3VuZDp1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFGQ0FZQUFBQjRrYTFWQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQUZwSlJFRlVlTnBzakRFT2dDQVFCT2M0ZXFOZm9DQjh3TXJDbndrLzgyRUhXRWt3Y2F0SlpyS3lyRnNHTHY1WC9INmNxUGM0MVk5cHRWTE4wQkRUM1ZzVEVUbkZ1VmtXSUd1SUNXQkV2ZmNoQWZ6MG1xdlo0QmVlQVFEelZpTXpKeTBSWGdBQUFBQkpSVTVFcmtKZ2dnPT0pIDUwJSA1MCUgbm8tcmVwZWF0LCMxYTFkMWZ9I2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idXR0b24tbWVudS1zaG93OmhvdmVyLCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LXNob3c6aG92ZXIsI2NvbnRyb2xLaXQgLnBpY2tlciAubWVudSAuYnV0dG9uLW1lbnUtc2hvdzpob3ZlcntiYWNrZ3JvdW5kOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBRnBKUkVGVWVOcHNqREVPZ0NBUUJPYzRlcU5mb0NCOHdNckNud2svODJFSFdFa3djYXRKWnJLeXJGc0dMdjVYL0g2Y3FQYzQxWTlwdFZMTjBCRFQzVnNURVRuRnVWa1dJR3VJQ1dCRXZmY2hBZnowbXF2WjRCZWVBUUR6VmlNekp5MFJYZ0FBQUFCSlJVNUVya0pnZ2c9PSkgNTAlIDUwJSBuby1yZXBlYXQsIzAwMDtib3gtc2hhZG93OiNmZmYgMCwjMDAwIDEwMCV9I2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idXR0b24tbWVudS1jbG9zZSwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS1jbG9zZSwjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idXR0b24tbWVudS1jbG9zZXtiYWNrZ3JvdW5kOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUpDQVlBQUFBUFUyMHVBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBUTFKUkVGVWVOcE0wRDlMQW1FQXgvSHZQWGVEVHFlWHBWZVlZanBZR1ExaEJRN1NueGZRMHBBMUZFVmJyNkZlUmdadUNiMkVvT0NnbTI2c3BvSWdpS0JRUWFJVW51Y2VXMjd3dDM2SEQvd01PK25jQW5hMVZsOWpiSUh2dFlBTmEybGx0WUpodUlIdlhWVnI5Wk1vSHBYbUZ3L3RwQ090V0N4K0wweHp2MWhlT0E1OEx3NjhwcWRuemxOcGwxREtOd3M0MEdINGtKcktYQXBoTmdaL3YyVHpCWlNVYmFBaElyTFovZjY2bTh5NHpCYUsvUFQ3WGFBQklDTHpiRGdjYk9rd0pGUUtQZElUZ2UrMUFRdzc2ZHk0MmR4dWZxNUVxRlFMZUJkQ1hQUjZIVjZlSHorTTlmcjJaOEp4WENWbEV6aU55RDNUc3E2Vmtzb3NWNVkzdGRZZFlHZnNocWVSMWprREkvRS9BTzhyWVJsd1hCcXVBQUFBQUVsRlRrU3VRbUNDKSA1MCUgNTAlIG5vLXJlcGVhdCwjMWExZDFmfSNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnV0dG9uLW1lbnUtY2xvc2U6aG92ZXIsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtY2xvc2U6aG92ZXIsI2NvbnRyb2xLaXQgLnBpY2tlciAubWVudSAuYnV0dG9uLW1lbnUtY2xvc2U6aG92ZXJ7YmFja2dyb3VuZDp1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFKQ0FZQUFBQVBVMjB1QUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQVExSlJFRlVlTnBNMEQ5TEFtRUF4L0h2UFhlRFRxZVhwVmVZWWpwWUdRMWhCUTdTbnhmUTBwQTFGRVZicjZGZVJnWnVDYjJFb09DZ20yNnNwb0lnaUtCUVFhSVVudWNlVzI3d3QzNkhEL3dNTytuY0FuYTFWbDlqYklIdnRZQU5hMmxsdFlKaHVJSHZYVlZyOVpNb0hwWG1Gdy90cENPdFdDeCtMMHh6djFoZU9BNThMdzY4cHFkbnpsTnBsMURLTndzNDBHSDRrSnJLWEFwaE5nWi92MlR6QlpTVWJhQWhJckxaL2Y2Nm04eTR6QmFLL1BUN1hhQUJJQ0x6YkRnY2JPa3dKRlFLUGRJVGdlKzFBUXc3NmR5NDJkeHVmcTVFcUZRTGVCZENYUFI2SFY2ZUh6K005ZnIyWjhKeFhDVmxFemlOeUQzVHNxNlZrc29zVjVZM3RkWWRZR2ZzaHFlUjFqa0RJL0UvQU84cllSbHdYQnF1QUFBQUFFbEZUa1N1UW1DQykgNTAlIDUwJSBuby1yZXBlYXQsIzAwMDtib3gtc2hhZG93OiNmZmYgMCwjMDAwIDEwMCV9I2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idXR0b24tbWVudS11bmRvLCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LXVuZG97YmFja2dyb3VuZDp1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBd0FBQUFMQ0FZQUFBQkxjR3hmQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQVlWSlJFRlVlTnBja0QxSVcxRVlocDl6N3JtM29xa2h6Wi94RDZ0UjFFcEZLZWxnaGxCb25Wd0tEcGFXRG5icTJsVkYwTUhCVWJkQ3A1YUNVaWdkbklTZ29VUEFxV01sWXNHbE50WUsxWmh6enIxZFZHN3pidC9MOTd4ODd5Y2VUejBsckhLcCtCSllCSHF1ckcvQWZDNWYrQXdnd2tDNVZIeWJ5clRQZHZkbUE5ZjFCRUpRTy8vTFlXV2ZrK09mUzdsOFllRUdLSmVLcjdORDk5YVQ2UXpXbUhQZ0UrQUFNNDdyY25SNHdJL0svcVM4VHM5MGRxK2xNaDFZWTFhQkZ1QUY4QXlRVnV2TnJydDl4T0tKanlJYXUvTU9HSnA0OU9SaHJYWmg5cjd1YmdQUGMvbkNyM0EzNlRqRzkzMUhEWStPVHlqUDZ3OEFLUjAxTXZhZ2NGcXR4b0gvZ0xQVDN3ZXhSREtySXJkYmQ2VGo5QXNoY0QwUFFhVGEzQkk1b1VGYTEzc0lBaVR3eXJkMndXcU5xVi91QVIzQWNjT3JQeVJTYlVyWDYzL1VsYmZrKzM0RnhKZHlxZGdFTEFPM2dEZ3dQVEJ5LzNwdlJvV0MzZ01rVW0zcFNEVDZSa3FKY2wzaXlYUVFXSXMxWmdYWVVvMjM5ZzRNMXNLejFmbzdNQWRzQVB3YkFMOWhmdHZUbE5rZEFBQUFBRWxGVGtTdVFtQ0MpIDIwJSA1MCUgbm8tcmVwZWF0LCMxYTFkMWY7cGFkZGluZzowIDZweCAxcHggMDt3aWR0aDozOHB4O3ZlcnRpY2FsLWFsaWduOnRvcDt0ZXh0LWFsaWduOmVuZH0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ1dHRvbi1tZW51LXVuZG86aG92ZXIsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtdW5kbzpob3ZlcntiYWNrZ3JvdW5kOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUF3QUFBQUxDQVlBQUFCTGNHeGZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBWVZKUkVGVWVOcGNrRDFJVzFFWWhwOXo3cm0zb3FraHpaL3hENnRSMUVwRktlbGdobEJvblZ3S0RwYVdEbmJxMmxWRjBNSEJVYmRDcDVhQ1VpZ2RuSVNnb1VQQXFXTWxZc0dsTnRZSzFaaHp6cjFkVkc3emJ0L0w5N3g4N3ljZVR6MGxySEtwK0JKWUJIcXVyRy9BZkM1ZitBd2d3a0M1Vkh5YnlyVFBkdmRtQTlmMUJFSlFPLy9MWVdXZmsrT2ZTN2w4WWVFR0tKZUtyN05EOTlhVDZReldtSFBnRStBQU00N3JjblI0d0kvSy9xUzhUczkwZHErbE1oMVlZMWFCRnVBRjhBeVFWdXZOcnJ0OXhPS0pqeUlhdS9NT0dKcDQ5T1JoclhaaDlyN3ViZ1BQYy9uQ3IzQTM2VGpHOTMxSERZK09UeWpQNnc4QUtSMDFNdmFnY0ZxdHhvSC9nTFBUM3dleFJES3JJcmRiZDZUajlBc2hjRDBQUWFUYTNCSTVvVUZhMTNzSUFpVHd5cmQyd1dxTnFWL3VBUjNBY2NPclB5UlNiVXJYNjMvVWxiZmsrMzRGeEpkeXFkZ0VMQU8zZ0Rnd1BUQnkvM3B2Um9XQzNnTWtVbTNwU0RUNlJrcUpjbDNpeVhRUVdJczFaZ1hZVW8yMzlnNE0xc0t6MWZvN01BZHNBUHdiQUw5aGZ0dlRsTmtkQUFBQUFFbEZUa1N1UW1DQykgMjAlIDUwJSBuby1yZXBlYXQsIzAwMDtib3gtc2hhZG93OiNmZmYgMCwjMDAwIDEwMCV9I2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idXR0b24tbWVudS1sb2FkLCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LWxvYWR7bWFyZ2luLXJpZ2h0OjJweH0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ1dHRvbi1tZW51LWxvYWQsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idXR0b24tbWVudS1zYXZlLCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LWxvYWQsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtc2F2ZXtiYWNrZ3JvdW5kOiMxYTFkMWY7Zm9udC1zaXplOjlweCFpbXBvcnRhbnR9I2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idXR0b24tbWVudS1sb2FkOmhvdmVyLCNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnV0dG9uLW1lbnUtc2F2ZTpob3ZlciwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS1sb2FkOmhvdmVyLCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LXNhdmU6aG92ZXJ7YmFja2dyb3VuZDojMDAwfSNjb250cm9sS2l0IC5wYW5lbCAubWVudSAud3JhcHtkaXNwbGF5Om5vbmV9I2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZXt3aWR0aDoxMDAlO2Zsb2F0OmxlZnR9I2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAud3JhcHtkaXNwbGF5OmlubGluZX0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS1jbG9zZSwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS1oaWRlLCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LXNob3d7ZmxvYXQ6cmlnaHR9I2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvdy1zLW1heHtiYWNrZ3JvdW5kOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBRzVKUkVGVWVOcGk1T0RpYW1SZ1lLaGp3QTRhbVZ4OGd4am1MMXJDOFAzclZ4UThiK0VTQmhmZklBWm1OUjI5QTVldlhXZGlaR0MwMTlYU1pHQmdZR0JZdm1ZOXc3STE2eG9aR0JnYVdLQkcxUzlicys0L0F3TkRQUU1EQTF5U2dZR0JnZEVuUEFiWnpnWTBtZ0V3QUU5bEpUMWxyc2ZmQUFBQUFFbEZUa1N1UW1DQykgY2VudGVyIG5vLXJlcGVhdH0jY29udHJvbEtpdCAucGFuZWwgLmFycm93LXMtbWlue2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBRkNBWUFBQUI0a2ExVkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFGcEpSRUZVZU5wc2lpRU9nREFNUmY4U3hOSnpJWWZCMVBRa1E3UmtaY2ZCWUxuYlVBc0w0Y24zWGtnczZOelhxUUF3TCt2ZTNUVEdMV2NEZ0tQV2Qwb3NpRVJhM0Z1bnVMZElwSWtGaUVRMnh1OFVFb3NCVVB4anp3QVRTalYvOHFsTUdBQUFBQUJKUlU1RXJrSmdnZz09KSBjZW50ZXIgbm8tcmVwZWF0fSNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3ctcy1tYXgsI2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvdy1zLW1pbnt3aWR0aDoxMDAlO2hlaWdodDoyMHB4fSNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3ctYi1tYXh7YmFja2dyb3VuZDp1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFGQ0FZQUFBQjRrYTFWQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQURKSlJFRlVlTnBzeXNFTkFDQU1BekUyOStqaEF4S2xQU212ZUsyYXN6RUlNaUhJN1VmbGJDaEpmeCszQVFBQS8vOERBUExrU2FtSGFzdHhBQUFBQUVsRlRrU3VRbUNDKSBjZW50ZXIgbm8tcmVwZWF0fSNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3ctYi1taW57YmFja2dyb3VuZDp1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFGQ0FZQUFBQjRrYTFWQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQUM5SlJFRlVlTnFFakRFT0FDQVFneGg4T0QvSDJSaFBrazQwQUFqMG1LdmlTMlUzVGllbjBpRTNBQUFBLy84REFFZDFOdElDVjRFdUFBQUFBRWxGVGtTdVFtQ0MpIGNlbnRlciBuby1yZXBlYXR9I2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvdy1iLXN1Yi1tYXh7YmFja2dyb3VuZDp1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBb0FBQUFHQ0FZQUFBRDY4QS9HQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQUdKSlJFRlVlTnBpOUFtUFlVQUdlemF2cTJkZ1lHQnc4UTFxUkJablFWZGthZS9jQUdXaktHWlcwOUZEVVdUcDRNSWdxNkRFd01EQTRIQm8xellHSlhYTmczQ0Z5SXBnQUYweDg2UDdkeHJRRldGVHpPZ1RIdFBBd01CUXo0QWZOQUFHQU4xQ0tQczROREx2QUFBQUFFbEZUa1N1UW1DQykgY2VudGVyIG5vLXJlcGVhdH0jY29udHJvbEtpdCAucGFuZWwgLmFycm93LWItc3ViLW1pbntiYWNrZ3JvdW5kOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFvQUFBQUdDQVlBQUFENjhBL0dBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBRzlKUkVGVWVOcDh6ckVPUURBQWhPRy9HRVNZQmJ0SnZBS0QxZUtCUk4rc0wxTk41N2E3aVNEaXBrdnVHMDZrV1NhQmxmL0laSm9YeXFxaHJPcFBZYzJPTlpxNDdYb1Z2SXRBREhsUmZDRUpiSEhiOVFBcWVDZEFqQ2UrSTRBVFBuRHc3b0VBa3RlbHpScDk5ZnR3REFDZnNTMFhBYno0UHdBQUFBQkpSVTVFcmtKZ2dnPT0pIGNlbnRlciBuby1yZXBlYXR9I2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvdy1iLW1heCwjY29udHJvbEtpdCAucGFuZWwgLmFycm93LWItbWluLCNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3ctYi1zdWItbWF4LCNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3ctYi1zdWItbWlue3dpZHRoOjEwcHg7aGVpZ2h0OjEwMCU7ZmxvYXQ6cmlnaHR9I2NvbnRyb2xLaXQgLnBpY2tlcntwb2ludGVyLWV2ZW50czphdXRvOy13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveDtib3JkZXItcmFkaXVzOjNweDstbW96LWJvcmRlci1yYWRpdXM6M3B4O2JhY2tncm91bmQtY29sb3I6IzNiM2IzYjtmb250LWZhbWlseTpBcmlhbCxzYW5zLXNlcmlmO2ZvbnQtc2l6ZToxMXB4O2NvbG9yOiNmZmY7dGV4dC1zaGFkb3c6MXB4IDFweCAjMDAwO292ZXJmbG93OmhpZGRlbjtwb3NpdGlvbjphYnNvbHV0ZTt6LWluZGV4OjIxNDc0ODM2MzE7d2lkdGg6MzYwcHg7LXdlYmtpdC10b3VjaC1jYWxsb3V0Om5vbmU7LXdlYmtpdC11c2VyLXNlbGVjdDpub25lOy1raHRtbC11c2VyLXNlbGVjdDpub25lOy1tb3otdXNlci1zZWxlY3Q6bm9uZTstbXMtdXNlci1zZWxlY3Q6bm9uZTt1c2VyLXNlbGVjdDpub25lO2JveC1zaGFkb3c6MCAycHggMnB4IHJnYmEoMCwwLDAsLjI1KX0jY29udHJvbEtpdCAucGlja2VyIGNhbnZhc3t2ZXJ0aWNhbC1hbGlnbjpib3R0b207Y3Vyc29yOnBvaW50ZXJ9I2NvbnRyb2xLaXQgLnBpY2tlciAud3JhcHstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7cGFkZGluZzoxMHB4O2Zsb2F0OmxlZnR9I2NvbnRyb2xLaXQgLnBpY2tlciAuZmllbGQtd3JhcHtwYWRkaW5nOjNweH0jY29udHJvbEtpdCAucGlja2VyIC5zbGlkZXItd3JhcHtwYWRkaW5nOjNweCAxM3B4IDNweCAzcHh9I2NvbnRyb2xLaXQgLnBpY2tlciAuZmllbGQtd3JhcCwjY29udHJvbEtpdCAucGlja2VyIC5pbnB1dC13cmFwLCNjb250cm9sS2l0IC5waWNrZXIgLnNsaWRlci13cmFwe2hlaWdodDphdXRvO292ZXJmbG93OmhpZGRlbjtmbG9hdDpsZWZ0fSNjb250cm9sS2l0IC5waWNrZXIgLmlucHV0LXdyYXB7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O2JvcmRlcjoxcHggc29saWQgIzI0MjQyNDtib3JkZXItcmFkaXVzOjJweDstbW96LWJvcmRlci1yYWRpdXM6MnB4O3dpZHRoOjE0MHB4O2Zsb2F0OnJpZ2h0O3BhZGRpbmc6NXB4IDEwcHggMXB4IDB9I2NvbnRyb2xLaXQgLnBpY2tlciAuaW5wdXQtZmllbGR7d2lkdGg6NTAlO2Zsb2F0OnJpZ2h0O21hcmdpbi1ib3R0b206NHB4fSNjb250cm9sS2l0IC5waWNrZXIgLmlucHV0LWZpZWxkIC5sYWJlbHtwYWRkaW5nOjhweCAwIDA7Y29sb3I6Izg3ODc4Nzt0ZXh0LWFsaWduOmNlbnRlcjt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2U7Zm9udC13ZWlnaHQ6NzAwO3RleHQtc2hhZG93OjFweCAxcHggIzFhMWExYTt3aWR0aDo0MCV9I2NvbnRyb2xLaXQgLnBpY2tlciAuaW5wdXQtZmllbGQgLndyYXB7cGFkZGluZzowO3dpZHRoOjYwJTtoZWlnaHQ6YXV0bztmbG9hdDpyaWdodH0jY29udHJvbEtpdCAucGlja2VyIC5jb250cm9scy13cmFwey13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveDt3aWR0aDoxMDAlO2hlaWdodDphdXRvO2Zsb2F0OnJpZ2h0O3BhZGRpbmc6OXB4IDAgMH0jY29udHJvbEtpdCAucGlja2VyIC5jb250cm9scy13cmFwIGlucHV0W3R5cGU9YnV0dG9uXXtmbG9hdDpyaWdodDt3aWR0aDo2NXB4O21hcmdpbjowIDAgMCAxMHB4fSNjb250cm9sS2l0IC5waWNrZXIgLmNvbG9yLWNvbnRyYXN0ey13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveDtib3JkZXI6bm9uZTtib3gtc2hhZG93OjAgMCAwIDFweCAjMWYxZjFmIGluc2V0O2JvcmRlci1yYWRpdXM6MnB4Oy1tb3otYm9yZGVyLXJhZGl1czoycHg7aGVpZ2h0OjI1cHg7cGFkZGluZzozcHg7d2lkdGg6ODAlO21hcmdpbi1ib3R0b206NHB4O2Zsb2F0OnJpZ2h0fSNjb250cm9sS2l0IC5waWNrZXIgLmNvbG9yLWNvbnRyYXN0IGRpdnt3aWR0aDo1MCU7aGVpZ2h0OjEwMCU7ZmxvYXQ6bGVmdH0jY29udHJvbEtpdCAucGlja2VyIGlucHV0W3R5cGU9dGV4dF17cGFkZGluZzowO3RleHQtYWxpZ246Y2VudGVyO3dpZHRoOjYwJTtmbG9hdDpyaWdodH0jY29udHJvbEtpdCAucGlja2VyIC53cmFwIC5pbnB1dC13cmFwOm50aC1vZi10eXBlKDMpe2JvcmRlci1ib3R0b20tbGVmdC1yYWRpdXM6MDtib3JkZXItYm90dG9tLXJpZ2h0LXJhZGl1czowfSNjb250cm9sS2l0IC5waWNrZXIgLndyYXAgLmlucHV0LXdyYXA6bnRoLW9mLXR5cGUoNCl7Ym9yZGVyLXRvcDpub25lO2JvcmRlci10b3AtbGVmdC1yYWRpdXM6MDtib3JkZXItdG9wLXJpZ2h0LXJhZGl1czowfSNjb250cm9sS2l0IC5waWNrZXIgLndyYXAgLmlucHV0LXdyYXA6bnRoLW9mLXR5cGUoNCkgLmlucHV0LWZpZWxke3dpZHRoOjEwMCV9I2NvbnRyb2xLaXQgLnBpY2tlciAud3JhcCAuaW5wdXQtd3JhcDpudGgtb2YtdHlwZSg0KSAuaW5wdXQtZmllbGQgLmxhYmVse3dpZHRoOjIwJX0jY29udHJvbEtpdCAucGlja2VyIC53cmFwIC5pbnB1dC13cmFwOm50aC1vZi10eXBlKDQpIGlucHV0W3R5cGU9dGV4dF17d2lkdGg6ODAlfSNjb250cm9sS2l0IC5waWNrZXIgLmZpZWxkLXdyYXAsI2NvbnRyb2xLaXQgLnBpY2tlciAuc2xpZGVyLXdyYXB7YmFja2dyb3VuZDojMWUyMjI0O2JvcmRlcjpub25lO2JveC1zaGFkb3c6MCAwIDAgMXB4ICMxZjFmMWYgaW5zZXQ7Ym9yZGVyLXJhZGl1czoycHg7LW1vei1ib3JkZXItcmFkaXVzOjJweDtwb3NpdGlvbjpyZWxhdGl2ZTttYXJnaW4tcmlnaHQ6NXB4fSNjb250cm9sS2l0IC5waWNrZXIgLmZpZWxkLXdyYXAgLmluZGljYXRvciwjY29udHJvbEtpdCAucGlja2VyIC5zbGlkZXItd3JhcCAuaW5kaWNhdG9ye3Bvc2l0aW9uOmFic29sdXRlO2JvcmRlcjoycHggc29saWQgI2ZmZjtib3gtc2hhZG93OjAgMXB4IGJsYWNrLDAgMXB4ICMwMDAgaW5zZXQ7Y3Vyc29yOnBvaW50ZXJ9I2NvbnRyb2xLaXQgLnBpY2tlciAuZmllbGQtd3JhcCAuaW5kaWNhdG9ye3dpZHRoOjhweDtoZWlnaHQ6OHB4O2xlZnQ6NTAlO3RvcDo1MCU7Ym9yZGVyLXJhZGl1czo1MCU7LW1vei1ib3JkZXItcmFkaXVzOjUwJX0jY29udHJvbEtpdCAucGlja2VyIC5zbGlkZXItd3JhcCAuaW5kaWNhdG9ye3dpZHRoOjE0cHg7aGVpZ2h0OjNweDtib3JkZXItcmFkaXVzOjhweDstbW96LWJvcmRlci1yYWRpdXM6OHB4O2xlZnQ6MXB4O3RvcDoxcHh9I2NvbnRyb2xLaXQgLnBpY2tlciAuc2xpZGVyLXdyYXAgLmluZGljYXRvcjphZnRlcntjb250ZW50OicnO3dpZHRoOjA7aGVpZ2h0OjA7Ym9yZGVyLXRvcDo0LjVweCBzb2xpZCB0cmFuc3BhcmVudDtib3JkZXItYm90dG9tOjQuNXB4IHNvbGlkIHRyYW5zcGFyZW50O2JvcmRlci1yaWdodDo0cHggc29saWQgI2ZmZjtmbG9hdDpyaWdodDtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6LTJweDtsZWZ0OjE5cHh9I2NvbnRyb2xLaXQgLnBpY2tlciAuc2xpZGVyLXdyYXAgLmluZGljYXRvcjpiZWZvcmV7Y29udGVudDonJzt3aWR0aDowO2hlaWdodDowO2JvcmRlci10b3A6NC41cHggc29saWQgdHJhbnNwYXJlbnQ7Ym9yZGVyLWJvdHRvbTo0LjVweCBzb2xpZCB0cmFuc3BhcmVudDtib3JkZXItcmlnaHQ6NHB4IHNvbGlkICMwMDA7ZmxvYXQ6cmlnaHQ7cG9zaXRpb246YWJzb2x1dGU7dG9wOi0zcHg7bGVmdDoxOXB4fVwiXG59OyBcbm1vZHVsZS5leHBvcnRzID0gU3R5bGU7IiwiZnVuY3Rpb24gRXZlbnRfKHNlbmRlcix0eXBlLGRhdGEpIHtcclxuICAgIHRoaXMuc2VuZGVyID0gc2VuZGVyO1xyXG4gICAgdGhpcy50eXBlICAgPSB0eXBlO1xyXG4gICAgdGhpcy5kYXRhICAgPSBkYXRhO1xyXG59XHJcbm1vZHVsZS5leHBvcnRzID0gRXZlbnRfOyIsImZ1bmN0aW9uIEV2ZW50RGlzcGF0Y2hlcigpIHtcclxuICAgIHRoaXMuX2xpc3RlbmVycyA9IFtdO1xyXG59O1xyXG5cclxuRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZSA9IHtcclxuICAgIGFkZEV2ZW50TGlzdGVuZXI6IGZ1bmN0aW9uIChldmVudFR5cGUsIGxpc3RlbmVyLCBjYWxsYmFja01ldGhvZCkge1xyXG4gICAgICAgIHRoaXMuX2xpc3RlbmVyc1tldmVudFR5cGVdID0gdGhpcy5fbGlzdGVuZXJzW2V2ZW50VHlwZV0gfHwgW107XHJcbiAgICAgICAgdGhpcy5fbGlzdGVuZXJzW2V2ZW50VHlwZV0ucHVzaCh7b2JqOiBsaXN0ZW5lciwgbWV0aG9kOiBjYWxsYmFja01ldGhvZH0pO1xyXG4gICAgfSxcclxuXHJcbiAgICBkaXNwYXRjaEV2ZW50OiBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICB2YXIgdHlwZSA9IGV2ZW50LnR5cGU7XHJcblxyXG4gICAgICAgIGlmICghdGhpcy5oYXNFdmVudExpc3RlbmVyKHR5cGUpKXtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIGxpc3RlbmVycyA9IHRoaXMuX2xpc3RlbmVyc1t0eXBlXTtcclxuICAgICAgICB2YXIgaSA9IC0xLCBsID0gbGlzdGVuZXJzLmxlbmd0aDtcclxuXHJcbiAgICAgICAgdmFyIG9iaiwgbWV0aG9kO1xyXG5cclxuICAgICAgICB3aGlsZSAoKytpIDwgbCkge1xyXG4gICAgICAgICAgICBvYmogPSBsaXN0ZW5lcnNbaV0ub2JqO1xyXG4gICAgICAgICAgICBtZXRob2QgPSBsaXN0ZW5lcnNbaV0ubWV0aG9kO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFvYmpbbWV0aG9kXSl7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBvYmogKyAnIGhhcyBubyBtZXRob2QgJyArIG1ldGhvZDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgb2JqW21ldGhvZF0oZXZlbnQpO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgcmVtb3ZlRXZlbnRMaXN0ZW5lcjogZnVuY3Rpb24gKHR5cGUsIG9iaiwgbWV0aG9kKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmhhc0V2ZW50TGlzdGVuZXIodHlwZSkpe1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy5fbGlzdGVuZXJzW3R5cGVdO1xyXG5cclxuICAgICAgICB2YXIgaSA9IGxpc3RlbmVycy5sZW5ndGg7XHJcbiAgICAgICAgd2hpbGUgKC0taSA+IC0xKSB7XHJcbiAgICAgICAgICAgIGlmIChsaXN0ZW5lcnNbaV0ub2JqID09IG9iaiAmJiBsaXN0ZW5lcnNbaV0ubWV0aG9kID09IG1ldGhvZCkge1xyXG4gICAgICAgICAgICAgICAgbGlzdGVuZXJzLnNwbGljZShpLCAxKTtcclxuICAgICAgICAgICAgICAgIGlmIChsaXN0ZW5lcnMubGVuZ3RoID09IDApe1xyXG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9saXN0ZW5lcnNbdHlwZV07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgcmVtb3ZlQWxsRXZlbnRMaXN0ZW5lcnM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLl9saXN0ZW5lcnMgPSBbXTtcclxuICAgIH0sXHJcblxyXG4gICAgaGFzRXZlbnRMaXN0ZW5lcjogZnVuY3Rpb24gKHR5cGUpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fbGlzdGVuZXJzW3R5cGVdICE9IHVuZGVmaW5lZCAmJiB0aGlzLl9saXN0ZW5lcnNbdHlwZV0gIT0gbnVsbDtcclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRXZlbnREaXNwYXRjaGVyOyIsInZhciBMYXlvdXRNb2RlID0ge1xyXG4gICAgTEVGVCAgIDogJ2xlZnQnLFxyXG4gICAgUklHSFQgIDogJ3JpZ2h0JyxcclxuICAgIFRPUCAgICA6ICd0b3AnLFxyXG4gICAgQk9UVE9NIDogJ2JvdHRvbScsXHJcbiAgICBOT05FICAgOiAnbm9uZSdcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTGF5b3V0TW9kZTsiLCJ2YXIgTm9kZSAgID0gcmVxdWlyZSgnLi4vZG9jdW1lbnQvTm9kZScpO1xyXG52YXIgTWV0cmljID0gcmVxdWlyZSgnLi4vLi4vY29tcG9uZW50L01ldHJpYycpO1xyXG52YXIgQ1NTICAgID0gcmVxdWlyZSgnLi4vZG9jdW1lbnQvQ1NTJyk7XHJcbnZhciBEb2N1bWVudEV2ZW50ID0gcmVxdWlyZSgnLi4vZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxyXG4gICAgTm9kZUV2ZW50ICAgICA9IHJlcXVpcmUoJy4uL2RvY3VtZW50L05vZGVFdmVudCcpO1xyXG52YXIgTW91c2UgID0gcmVxdWlyZSgnLi4vZG9jdW1lbnQvTW91c2UnKTtcclxuXHJcbmZ1bmN0aW9uIFNjcm9sbEJhcihwYXJlbnROb2RlLHRhcmdldE5vZGUsd3JhcEhlaWdodCkge1xyXG4gICAgdGhpcy5fcGFyZW50Tm9kZSA9IHBhcmVudE5vZGU7XHJcbiAgICB0aGlzLl90YXJnZXROb2RlID0gdGFyZ2V0Tm9kZTtcclxuICAgIHRoaXMuX3dyYXBIZWlnaHQgPSB3cmFwSGVpZ2h0O1xyXG5cclxuICAgIHZhciB3cmFwICAgPSB0aGlzLl93cmFwTm9kZSAgID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5TY3JvbGxXcmFwKSxcclxuICAgICAgICBub2RlICAgPSB0aGlzLl9ub2RlICAgICAgID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5TY3JvbGxCYXIpLFxyXG4gICAgICAgIHRyYWNrICA9IHRoaXMuX3RyYWNrTm9kZSAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlNjcm9sbEJhclRyYWNrKSxcclxuICAgICAgICB0aHVtYiAgPSB0aGlzLl90aHVtYk5vZGUgID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5TY3JvbGxCYXJUaHVtYik7XHJcblxyXG4gICAgcGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0YXJnZXROb2RlKTtcclxuICAgIHBhcmVudE5vZGUuYWRkQ2hpbGQod3JhcCk7XHJcbiAgICBwYXJlbnROb2RlLmFkZENoaWxkQXQobm9kZSwwKTtcclxuXHJcbiAgICB3cmFwLmFkZENoaWxkKHRhcmdldE5vZGUpO1xyXG4gICAgbm9kZS5hZGRDaGlsZCh0cmFjayk7XHJcbiAgICB0cmFjay5hZGRDaGlsZCh0aHVtYik7XHJcblxyXG4gICAgdGhpcy5fbW91c2VUaHVtYk9mZnNldCA9IDA7XHJcbiAgICB0aGlzLl9zY3JvbGxIZWlnaHQgPSAwO1xyXG4gICAgdGhpcy5fc2Nyb2xsVW5pdCAgID0gMDtcclxuICAgIHRoaXMuX3Njcm9sbE1pbiAgICA9IDA7XHJcbiAgICB0aGlzLl9zY3JvbGxNYXggICAgPSAwO1xyXG5cclxuICAgIHRodW1iLnNldFBvc2l0aW9uWShNZXRyaWMuU0NST0xMQkFSX1RSQUNLX1BBRERJTkcpO1xyXG4gICAgdGh1bWIuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX0RPV04sdGhpcy5fb25UaHVtYkRyYWdTdGFydC5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICB0aGlzLl9pc1ZhbGlkICA9IGZhbHNlO1xyXG4gICAgdGhpcy5fZW5hYmxlZCA9IGZhbHNlO1xyXG5cclxuICAgIHZhciBub2RlRWxlbWVudCA9IG5vZGUuZ2V0RWxlbWVudCgpLFxyXG4gICAgICAgIHRodW1iRWxlbWVudCA9IHRodW1iLmdldEVsZW1lbnQoKTtcclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgIHRoaXMuX29uTW91c2VXaGVlbCA9IGZ1bmN0aW9uKGUpe1xyXG4gICAgICAgIHZhciBzZW5kZXIgPSBlLnNlbmRlcixcclxuICAgICAgICAgICAgaG92ZXJFbGVtZW50ID0gc2VuZGVyLmdldEhvdmVyRWxlbWVudCgpO1xyXG4gICAgICAgIGlmKGhvdmVyRWxlbWVudCAhPSBub2RlRWxlbWVudCAmJiBob3ZlckVsZW1lbnQgIT0gdGh1bWJFbGVtZW50KXtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgc2Nyb2xsU3RlcCA9IHNlbGYuX3Njcm9sbEhlaWdodCAqIDAuMDEyNTtcclxuICAgICAgICBzZWxmLl9zY3JvbGwodGh1bWIuZ2V0UG9zaXRpb25ZKCkgKyBzZW5kZXIuZ2V0V2hlZWxEaXJlY3Rpb24oKSAqIHNjcm9sbFN0ZXAgKiAtMSk7XHJcbiAgICAgICAgZS5kYXRhLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICB9O1xyXG5cclxuICAgIHRoaXMuYWRkTW91c2VMaXN0ZW5lcigpO1xyXG59XHJcblxyXG5TY3JvbGxCYXIucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKCl7XHJcbiAgICB2YXIgdGFyZ2V0ID0gdGhpcy5fdGFyZ2V0Tm9kZSxcclxuICAgICAgICB0aHVtYiA9IHRoaXMuX3RodW1iTm9kZTtcclxuXHJcbiAgICB2YXIgcGFkZGluZyA9IE1ldHJpYy5TQ1JPTExCQVJfVFJBQ0tfUEFERElORztcclxuXHJcbiAgICB2YXIgdGFyZ2V0V3JhcEhlaWdodCA9IHRoaXMuX3dyYXBIZWlnaHQsXHJcbiAgICAgICAgdGFyZ2V0SGVpZ2h0ID0gdGFyZ2V0LmdldEhlaWdodCgpLFxyXG4gICAgICAgIHRyYWNrSGVpZ2h0ID0gdGFyZ2V0V3JhcEhlaWdodCAtIHBhZGRpbmcgKiAyO1xyXG5cclxuICAgIHRodW1iLnNldEhlaWdodCh0cmFja0hlaWdodCk7XHJcblxyXG4gICAgdmFyIHJhdGlvID0gdGFyZ2V0V3JhcEhlaWdodCAvIHRhcmdldEhlaWdodDtcclxuXHJcbiAgICB0aGlzLl9pc1ZhbGlkID0gZmFsc2U7XHJcblxyXG4gICAgaWYgKHJhdGlvID4gMS4wKXtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB2YXIgdGh1bWJIZWlnaHQgPSB0cmFja0hlaWdodCAqIHJhdGlvO1xyXG5cclxuICAgIHRoaXMuX3Njcm9sbEhlaWdodCA9IHRyYWNrSGVpZ2h0O1xyXG4gICAgdGhpcy5fc2Nyb2xsVW5pdCAgID0gdGFyZ2V0SGVpZ2h0IC0gdGhpcy5fc2Nyb2xsSGVpZ2h0IC0gcGFkZGluZyAqIDI7XHJcbiAgICB0aGlzLl9zY3JvbGxNaW4gICAgPSBwYWRkaW5nO1xyXG4gICAgdGhpcy5fc2Nyb2xsTWF4ICAgID0gcGFkZGluZyArIHRyYWNrSGVpZ2h0IC0gdGh1bWJIZWlnaHQ7XHJcblxyXG4gICAgdGh1bWIuc2V0SGVpZ2h0KHRodW1iSGVpZ2h0KTtcclxuXHJcbiAgICB0aGlzLl9pc1ZhbGlkID0gdHJ1ZTtcclxufTtcclxuXHJcblNjcm9sbEJhci5wcm90b3R5cGUuX3Njcm9sbCA9IGZ1bmN0aW9uKHkpe1xyXG4gICAgdmFyIG1pbiAgPSB0aGlzLl9zY3JvbGxNaW4sXHJcbiAgICAgICAgbWF4ICA9IHRoaXMuX3Njcm9sbE1heCxcclxuICAgICAgICBwb3MgID0gTWF0aC5tYXgobWluLCBNYXRoLm1pbih5LG1heCkpLFxyXG4gICAgICAgIHBvc18gPSAocG9zLW1pbikvKG1heC1taW4pO1xyXG5cclxuICAgIHRoaXMuX3RodW1iTm9kZS5zZXRQb3NpdGlvblkocG9zKTtcclxuICAgIHRoaXMuX3RhcmdldE5vZGUuc2V0UG9zaXRpb25ZKHBvc18gKiB0aGlzLl9zY3JvbGxVbml0ICogLTEpO1xyXG59O1xyXG5cclxuXHJcblNjcm9sbEJhci5wcm90b3R5cGUuX29uVGh1bWJEcmFnU3RhcnQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBpZiAoIXRoaXMuX2lzVmFsaWQgfHwgdGhpcy5fZW5hYmxlZCl7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdmFyIGV2ZW50TW92ZSA9IERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSxcclxuICAgICAgICBldmVudFVwID0gRG9jdW1lbnRFdmVudC5NT1VTRV9VUDtcclxuXHJcbiAgICB2YXIgbW91c2UgPSBNb3VzZS5nZXQoKTtcclxuICAgIHZhciB0cmFja09mZnNldCA9IHRoaXMuX3RyYWNrTm9kZS5nZXRQb3NpdGlvbkdsb2JhbFkoKTtcclxuXHJcbiAgICB0aGlzLl9tb3VzZVRodW1iT2Zmc2V0ID0gbW91c2UuZ2V0WSgpIC0gdGhpcy5fdGh1bWJOb2RlLmdldFBvc2l0aW9uR2xvYmFsWSgpO1xyXG5cclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgIHZhciBvbkRyYWcgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHNlbGYuX3Njcm9sbChtb3VzZS5nZXRZKCkgLSB0cmFja09mZnNldCAtIHNlbGYuX21vdXNlVGh1bWJPZmZzZXQpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgb25EcmFnRW5kID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnLCBmYWxzZSk7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRVcCwgb25EcmFnRW5kLCBmYWxzZSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnLCBmYWxzZSk7XHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50VXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xyXG4gICAgdGhpcy5fc2Nyb2xsKG1vdXNlLmdldFkoKSAtIHRyYWNrT2Zmc2V0IC0gc2VsZi5fbW91c2VUaHVtYk9mZnNldCk7XHJcbn07XHJcblxyXG5cclxuU2Nyb2xsQmFyLnByb3RvdHlwZS5lbmFibGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLl9lbmFibGVkID0gZmFsc2U7XHJcbiAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XHJcbn07XHJcblxyXG5TY3JvbGxCYXIucHJvdG90eXBlLmRpc2FibGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLl9lbmFibGVkID0gdHJ1ZTtcclxuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcclxufTtcclxuU2Nyb2xsQmFyLnByb3RvdHlwZS5yZXNldCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuX3Njcm9sbCgwKTtcclxufTtcclxuXHJcblNjcm9sbEJhci5wcm90b3R5cGUuX3VwZGF0ZUFwcGVhcmFuY2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBpZiAodGhpcy5fZW5hYmxlZCkge1xyXG4gICAgICAgIHRoaXMuX25vZGUuc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdub25lJyk7XHJcbiAgICAgICAgdGhpcy5fdGFyZ2V0Tm9kZS5zZXRQb3NpdGlvblkoMCk7XHJcbiAgICAgICAgdGhpcy5fdGh1bWJOb2RlLnNldFBvc2l0aW9uWShNZXRyaWMuU0NST0xMQkFSX1RSQUNLX1BBRERJTkcpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLl9ub2RlLnNldFN0eWxlUHJvcGVydHkoJ2Rpc3BsYXknLCAnYmxvY2snKTtcclxuICAgIH1cclxufTtcclxuXHJcblNjcm9sbEJhci5wcm90b3R5cGUuaXNWYWxpZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLl9pc1ZhbGlkO1xyXG59O1xyXG5cclxuU2Nyb2xsQmFyLnByb3RvdHlwZS5zZXRXcmFwSGVpZ2h0ID0gZnVuY3Rpb24gKGhlaWdodCkge1xyXG4gICAgdGhpcy5fd3JhcEhlaWdodCA9IGhlaWdodDtcclxuICAgIHRoaXMudXBkYXRlKCk7XHJcbn07XHJcblxyXG5TY3JvbGxCYXIucHJvdG90eXBlLnJlbW92ZVRhcmdldE5vZGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fd3JhcE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5fdGFyZ2V0Tm9kZSk7XHJcbn07XHJcblxyXG5TY3JvbGxCYXIucHJvdG90eXBlLnJlbW92ZU1vdXNlTGlzdGVuZXIgPSBmdW5jdGlvbigpe1xyXG4gICAgTW91c2UuZ2V0KCkucmVtb3ZlRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX1dIRUVMLHRoaXMsJ19vbk1vdXNlV2hlZWwnKTtcclxufTtcclxuXHJcblNjcm9sbEJhci5wcm90b3R5cGUuYWRkTW91c2VMaXN0ZW5lciA9IGZ1bmN0aW9uKCl7XHJcbiAgICBNb3VzZS5nZXQoKS5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfV0hFRUwsdGhpcywnX29uTW91c2VXaGVlbCcpO1xyXG59O1xyXG5cclxuU2Nyb2xsQmFyLnByb3RvdHlwZS5yZW1vdmVGcm9tUGFyZW50ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHBhcmVudE5vZGUgPSB0aGlzLl9wYXJlbnROb2RlLFxyXG4gICAgICAgIHJvb3ROb2RlID0gdGhpcy5fbm9kZSxcclxuICAgICAgICB0YXJnZXROb2RlID0gdGhpcy5fdGFyZ2V0Tm9kZTtcclxuXHJcbiAgICByb290Tm9kZS5yZW1vdmVDaGlsZCh0YXJnZXROb2RlKTtcclxuICAgIHBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5fd3JhcE5vZGUpO1xyXG4gICAgcGFyZW50Tm9kZS5yZW1vdmVDaGlsZChyb290Tm9kZSk7XHJcblxyXG4gICAgcmV0dXJuIHRhcmdldE5vZGU7XHJcbn07XHJcblxyXG5TY3JvbGxCYXIucHJvdG90eXBlLmdldFdyYXBOb2RlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX3dyYXBOb2RlO1xyXG59O1xyXG5cclxuU2Nyb2xsQmFyLnByb3RvdHlwZS5nZXROb2RlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX25vZGU7XHJcbn07XHJcblxyXG5TY3JvbGxCYXIucHJvdG90eXBlLmdldFRhcmdldE5vZGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fdGFyZ2V0Tm9kZTtcclxufTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFNjcm9sbEJhcjsiLCJ2YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudERpc3BhdGNoZXInKTtcclxudmFyIE5vZGUgICAgICAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xyXG52YXIgU2Nyb2xsQmFyICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9sYXlvdXQvU2Nyb2xsQmFyJyk7XHJcblxyXG5mdW5jdGlvbiBBYnN0cmFjdEdyb3VwKHBhcmVudCwgcGFyYW1zKSB7XHJcbiAgICBFdmVudERpc3BhdGNoZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxuXHJcbiAgICBwYXJhbXMgPSBwYXJhbXMgfHwge307XHJcbiAgICBwYXJhbXMuaGVpZ2h0ID0gcGFyYW1zLmhlaWdodCB8fCBudWxsO1xyXG4gICAgcGFyYW1zLmVuYWJsZSA9IHBhcmFtcy5lbmFibGUgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBwYXJhbXMuZW5hYmxlO1xyXG5cclxuICAgIHRoaXMuX3BhcmVudCA9IHBhcmVudDtcclxuICAgIHRoaXMuX2hlaWdodCA9IHBhcmFtcy5oZWlnaHQ7XHJcbiAgICB0aGlzLl9lbmFibGVkID0gcGFyYW1zLmVuYWJsZTtcclxuICAgIHRoaXMuX3Njcm9sbEJhciA9IG51bGw7XHJcblxyXG4gICAgdGhpcy5fbm9kZSA9IG5ldyBOb2RlKE5vZGUuTElTVF9JVEVNKTtcclxuICAgIHRoaXMuX3dyYXBOb2RlID0gbmV3IE5vZGUoKTtcclxuICAgIHRoaXMuX2xpc3ROb2RlID0gbmV3IE5vZGUoTm9kZS5MSVNUKTtcclxuXHJcbiAgICB0aGlzLl9wYXJlbnQuZ2V0TGlzdCgpLmFkZENoaWxkKHRoaXMuX25vZGUpO1xyXG59XHJcbkFic3RyYWN0R3JvdXAucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudERpc3BhdGNoZXIucHJvdG90eXBlKTtcclxuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBBYnN0cmFjdEdyb3VwO1xyXG5cclxuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUuYWRkU2Nyb2xsV3JhcCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciB3cmFwTm9kZSA9IHRoaXMuX3dyYXBOb2RlLFxyXG4gICAgICAgIG1heEhlaWdodCA9IHRoaXMuZ2V0TWF4SGVpZ2h0KCk7XHJcblxyXG4gICAgdGhpcy5fc2Nyb2xsQmFyID0gbmV3IFNjcm9sbEJhcih3cmFwTm9kZSwgdGhpcy5fbGlzdE5vZGUsIG1heEhlaWdodCk7XHJcbiAgICBpZiAodGhpcy5pc0VuYWJsZWQoKSkge1xyXG4gICAgICAgIHdyYXBOb2RlLnNldEhlaWdodChtYXhIZWlnaHQpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUucHJldmVudFNlbGVjdERyYWcgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLl9wYXJlbnQucHJldmVudFNlbGVjdERyYWcoKTtcclxuXHJcbiAgICBpZiAoIXRoaXMuaGFzU2Nyb2xsV3JhcCgpKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdGhpcy5fd3JhcE5vZGUuZ2V0RWxlbWVudCgpLnNjcm9sbFRvcCA9IDA7XHJcbn07XHJcblxyXG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZS5oYXNNYXhIZWlnaHQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5faGVpZ2h0ICE9IG51bGw7XHJcbn07XHJcblxyXG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZS5nZXRNYXhIZWlnaHQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5faGVpZ2h0O1xyXG59O1xyXG5cclxuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUuaGFzU2Nyb2xsV3JhcCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLl9zY3JvbGxCYXIgIT0gbnVsbDtcclxufTtcclxuXHJcbkFic3RyYWN0R3JvdXAucHJvdG90eXBlLmhhc0xhYmVsID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX2xhYmxOb2RlICE9IG51bGw7XHJcbn07XHJcblxyXG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZS5kaXNhYmxlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5fZW5hYmxlZCA9IGZhbHNlO1xyXG4gICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xyXG59O1xyXG5cclxuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUuZW5hYmxlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5fZW5hYmxlZCA9IHRydWU7XHJcbiAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XHJcbn07XHJcblxyXG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZS5pc0Rpc2FibGVkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuICF0aGlzLl9lbmFibGVkO1xyXG59O1xyXG5cclxuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUuaXNFbmFibGVkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX2VuYWJsZWQ7XHJcbn07XHJcblxyXG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZS5nZXRMaXN0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX2xpc3ROb2RlO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBBYnN0cmFjdEdyb3VwO1xyXG5cclxuIiwidmFyIEFic3RyYWN0R3JvdXAgPSByZXF1aXJlKCcuL0Fic3RyYWN0R3JvdXAnKTtcclxudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XHJcbnZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XHJcblxyXG52YXIgU3ViR3JvdXAgPSByZXF1aXJlKCcuL1N1Ykdyb3VwJyk7XHJcblxyXG52YXIgRXZlbnRfID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxyXG4gICAgRG9jdW1lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxyXG4gICAgTm9kZUV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKSxcclxuICAgIFBhbmVsRXZlbnQgPSByZXF1aXJlKCcuL1BhbmVsRXZlbnQnKSxcclxuICAgIEdyb3VwRXZlbnQgPSByZXF1aXJlKCcuL0dyb3VwRXZlbnQnKTtcclxuXHJcbnZhciBPYmplY3RDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jb3JlL09iamVjdENvbXBvbmVudCcpLFxyXG4gICAgVmFsdWVQbG90dGVyICAgID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L1ZhbHVlUGxvdHRlcicpLFxyXG4gICAgRnVuY3Rpb25QbG90dGVyID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L0Z1bmN0aW9uUGxvdHRlcicpO1xyXG5cclxuZnVuY3Rpb24gR3JvdXAocGFyZW50LHBhcmFtcykge1xyXG4gICAgcGFyYW1zICAgICAgICAgICA9IHBhcmFtcyB8fCB7fTtcclxuICAgIHBhcmFtcy5sYWJlbCAgICAgPSBwYXJhbXMubGFiZWwgICAgIHx8IG51bGw7XHJcbiAgICBwYXJhbXMudXNlTGFiZWxzID0gcGFyYW1zLnVzZUxhYmVscyB8fCB0cnVlO1xyXG4gICAgcGFyYW1zLmVuYWJsZSAgICA9IHBhcmFtcy5lbmFibGUgICAgID09PSB1bmRlZmluZWQgPyB0cnVlIDogcGFyYW1zLmVuYWJsZTtcclxuXHJcbiAgICBBYnN0cmFjdEdyb3VwLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcclxuXHJcbiAgICB0aGlzLl9jb21wb25lbnRzID0gW107XHJcbiAgICB0aGlzLl9zdWJHcm91cHMgID0gW107XHJcblxyXG4gICAgdmFyIHJvb3QgPSB0aGlzLl9ub2RlLFxyXG4gICAgICAgIHdyYXAgPSB0aGlzLl93cmFwTm9kZSxcclxuICAgICAgICBsaXN0ID0gdGhpcy5fbGlzdE5vZGU7XHJcblxyXG4gICAgICAgIHJvb3Quc2V0U3R5bGVDbGFzcyhDU1MuR3JvdXApO1xyXG4gICAgICAgIHdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCk7XHJcbiAgICAgICAgbGlzdC5zZXRTdHlsZUNsYXNzKENTUy5TdWJHcm91cExpc3QpO1xyXG5cclxuICAgICAgICB3cmFwLmFkZENoaWxkKGxpc3QpO1xyXG5cclxuICAgIHZhciBsYWJlbCA9IHBhcmFtcy5sYWJlbDtcclxuXHJcbiAgICBpZihsYWJlbCl7XHJcbiAgICAgICAgdmFyIGhlYWQgID0gbmV3IE5vZGUoKSxcclxuICAgICAgICAgICAgd3JhcF8gPSBuZXcgTm9kZSgpLFxyXG4gICAgICAgICAgICBsYWJlbF8gID0gbmV3IE5vZGUoTm9kZS5TUEFOKSxcclxuICAgICAgICAgICAgaW5kaWNhdG9yID0gdGhpcy5faW5kaU5vZGUgPSBuZXcgTm9kZSgpO1xyXG5cclxuICAgICAgICAgICAgaGVhZC5zZXRTdHlsZUNsYXNzKENTUy5IZWFkKTtcclxuICAgICAgICAgICAgd3JhcF8uc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCk7XHJcbiAgICAgICAgICAgIGxhYmVsXy5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCk7XHJcbiAgICAgICAgICAgIGluZGljYXRvci5zZXRTdHlsZUNsYXNzKENTUy5BcnJvd0JNYXgpO1xyXG4gICAgICAgICAgICBsYWJlbF8uc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsbGFiZWwpO1xyXG5cclxuICAgICAgICAgICAgaGVhZC5hZGRDaGlsZChpbmRpY2F0b3IpO1xyXG4gICAgICAgICAgICB3cmFwXy5hZGRDaGlsZChsYWJlbF8pO1xyXG4gICAgICAgICAgICBoZWFkLmFkZENoaWxkKHdyYXBfKTtcclxuICAgICAgICAgICAgcm9vdC5hZGRDaGlsZChoZWFkKTtcclxuXHJcbiAgICAgICAgaGVhZC5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLHRoaXMuX29uSGVhZFRyaWdnZXIuYmluZCh0aGlzKSk7XHJcbiAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuR1JPVVBfTElTVF9TSVpFX0NIQU5HRSxwYXJlbnQsJ29uR3JvdXBMaXN0U2l6ZUNoYW5nZScpO1xyXG5cclxuICAgICAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYodGhpcy5oYXNNYXhIZWlnaHQoKSl7XHJcbiAgICAgICAgdGhpcy5hZGRTY3JvbGxXcmFwKCk7XHJcbiAgICB9XHJcblxyXG4gICAgcm9vdC5hZGRDaGlsZCh3cmFwKTtcclxuXHJcbiAgICBpZih0aGlzLmhhc01heEhlaWdodCgpKXtcclxuICAgICAgICBpZighbGFiZWwpe1xyXG4gICAgICAgICAgICB2YXIgYnVmZmVyVG9wID0gdGhpcy5fc2Nyb2xsQnVmZmVyVG9wID0gbmV3IE5vZGUoKTtcclxuICAgICAgICAgICAgICAgIGJ1ZmZlclRvcC5zZXRTdHlsZUNsYXNzKENTUy5TY3JvbGxCdWZmZXIpO1xyXG5cclxuICAgICAgICAgICAgcm9vdC5hZGRDaGlsZEF0KGJ1ZmZlclRvcCwwKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGJ1ZmZlckJvdHRvbSA9IHRoaXMuX3Njcm9sbEJ1ZmZlckJvdHRvbSA9IG5ldyBOb2RlKCk7XHJcbiAgICAgICAgICAgIGJ1ZmZlckJvdHRvbS5zZXRTdHlsZUNsYXNzKENTUy5TY3JvbGxCdWZmZXIpO1xyXG5cclxuICAgICAgICByb290LmFkZENoaWxkKGJ1ZmZlckJvdHRvbSk7XHJcbiAgICB9XHJcblxyXG4gICAgcGFyZW50ID0gdGhpcy5fcGFyZW50O1xyXG5cclxuICAgIHBhcmVudC5hZGRFdmVudExpc3RlbmVyKFBhbmVsRXZlbnQuUEFORUxfTU9WRV9CRUdJTiwgdGhpcywgJ29uUGFuZWxNb3ZlQmVnaW4nKTtcclxuICAgIHBhcmVudC5hZGRFdmVudExpc3RlbmVyKFBhbmVsRXZlbnQuUEFORUxfTU9WRSwgdGhpcywgJ29uUGFuZWxNb3ZlJyk7XHJcbiAgICBwYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihQYW5lbEV2ZW50LlBBTkVMX01PVkVfRU5ELCB0aGlzLCAnb25QYW5lbE1vdmVFbmQnKTtcclxuICAgIHBhcmVudC5hZGRFdmVudExpc3RlbmVyKFBhbmVsRXZlbnQuUEFORUxfSElERSwgdGhpcywgJ29uUGFuZWxIaWRlJyk7XHJcbiAgICBwYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihQYW5lbEV2ZW50LlBBTkVMX1NIT1csIHRoaXMsICdvblBhbmVsU2hvdycpO1xyXG4gICAgcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoUGFuZWxFdmVudC5QQU5FTF9TQ1JPTExfV1JBUF9BRERFRCwgdGhpcywgJ29uUGFuZWxTY3JvbGxXcmFwQWRkZWQnKTtcclxuICAgIHBhcmVudC5hZGRFdmVudExpc3RlbmVyKFBhbmVsRXZlbnQuUEFORUxfU0NST0xMX1dSQVBfUkVNT1ZFRCwgdGhpcywgJ29uUGFuZWxTY3JvbGxXcmFwUmVtb3ZlZCcpO1xyXG4gICAgcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoUGFuZWxFdmVudC5QQU5FTF9TSVpFX0NIQU5HRSwgdGhpcywgJ29uUGFuZWxTaXplQ2hhbmdlJyk7XHJcbiAgICBwYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50LldJTkRPV19SRVNJWkUsIHRoaXMsICdvbldpbmRvd1Jlc2l6ZScpO1xyXG5cclxuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LkdST1VQX1NJWkVfQ0hBTkdFLHBhcmVudCwnb25Hcm91cExpc3RTaXplQ2hhbmdlJyk7XHJcbn1cclxuR3JvdXAucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShBYnN0cmFjdEdyb3VwLnByb3RvdHlwZSk7XHJcbkdyb3VwLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEdyb3VwO1xyXG5cclxuR3JvdXAucHJvdG90eXBlLm9uUGFuZWxNb3ZlQmVnaW4gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX01PVkVfQkVHSU4sIG51bGwpKTtcclxufTtcclxuXHJcbkdyb3VwLnByb3RvdHlwZS5vblBhbmVsTW92ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIFBhbmVsRXZlbnQuUEFORUxfTU9WRSwgbnVsbCkpO1xyXG59O1xyXG5cclxuR3JvdXAucHJvdG90eXBlLm9uUGFuZWxNb3ZlRW5kID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgUGFuZWxFdmVudC5QQU5FTF9NT1ZFX0VORCwgbnVsbCkpO1xyXG59O1xyXG5cclxuR3JvdXAucHJvdG90eXBlLm9uUGFuZWxTY3JvbGxXcmFwQWRkZWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBHcm91cEV2ZW50LkdST1VQX1NJWkVfQ0hBTkdFLCBudWxsKSk7XHJcbn07XHJcblxyXG5Hcm91cC5wcm90b3R5cGUub25QYW5lbFNjcm9sbFdyYXBSZW1vdmVkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSwgbnVsbCkpO1xyXG59O1xyXG5cclxuR3JvdXAucHJvdG90eXBlLm9uUGFuZWxIaWRlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgR3JvdXBFdmVudC5TVUJHUk9VUF9ESVNBQkxFLCBudWxsKSk7XHJcbn07XHJcblxyXG5Hcm91cC5wcm90b3R5cGUub25QYW5lbFNob3cgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBHcm91cEV2ZW50LlNVQkdST1VQX0VOQUJMRSwgbnVsbCkpO1xyXG59O1xyXG5cclxuR3JvdXAucHJvdG90eXBlLm9uUGFuZWxTaXplQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSwgbnVsbCkpO1xyXG59O1xyXG5cclxuR3JvdXAucHJvdG90eXBlLm9uV2luZG93UmVzaXplID0gZnVuY3Rpb24gKGUpIHtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChlKTtcclxufTtcclxuXHJcbkdyb3VwLnByb3RvdHlwZS5vblN1Ykdyb3VwVHJpZ2dlciA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuX3VwZGF0ZUhlaWdodCgpO1xyXG5cclxuICAgIGlmKCF0aGlzLmhhc01heEhlaWdodCgpKXtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB2YXIgc2Nyb2xsQmFyID0gdGhpcy5fc2Nyb2xsQmFyLFxyXG4gICAgICAgIHdyYXAgID0gdGhpcy5fd3JhcE5vZGU7XHJcbiAgICB2YXIgYnVmZmVyVG9wICAgID0gdGhpcy5fc2Nyb2xsQnVmZmVyVG9wLFxyXG4gICAgICAgIGJ1ZmZlckJvdHRvbSA9IHRoaXMuX3Njcm9sbEJ1ZmZlckJvdHRvbTtcclxuXHJcbiAgICBzY3JvbGxCYXIudXBkYXRlKCk7XHJcblxyXG4gICAgaWYgKCFzY3JvbGxCYXIuaXNWYWxpZCgpKSB7XHJcbiAgICAgICAgc2Nyb2xsQmFyLmRpc2FibGUoKTtcclxuICAgICAgICB3cmFwLnNldEhlaWdodCh3cmFwLmdldENoaWxkQXQoMSkuZ2V0SGVpZ2h0KCkpO1xyXG4gICAgICAgIGlmIChidWZmZXJUb3Ape1xyXG4gICAgICAgICAgICBidWZmZXJUb3Auc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdub25lJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChidWZmZXJCb3R0b20pe1xyXG4gICAgICAgICAgICBidWZmZXJCb3R0b20uc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdub25lJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgc2Nyb2xsQmFyLmVuYWJsZSgpO1xyXG4gICAgICAgIHdyYXAuc2V0SGVpZ2h0KHRoaXMuZ2V0TWF4SGVpZ2h0KCkpO1xyXG5cclxuICAgICAgICBpZiAoYnVmZmVyVG9wKXtcclxuICAgICAgICAgICAgYnVmZmVyVG9wLnNldFN0eWxlUHJvcGVydHkoJ2Rpc3BsYXknLCAnYmxvY2snKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGJ1ZmZlckJvdHRvbSl7XHJcbiAgICAgICAgICAgIGJ1ZmZlckJvdHRvbS5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ2Jsb2NrJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcyxHcm91cEV2ZW50LkdST1VQX1NJWkVfQ0hBTkdFLG51bGwpKTtcclxufTtcclxuXHJcbkdyb3VwLnByb3RvdHlwZS5fb25IZWFkVHJpZ2dlciA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuX2VuYWJsZWQgPSAhdGhpcy5fZW5hYmxlZDtcclxuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIEdyb3VwRXZlbnQuR1JPVVBfTElTVF9TSVpFX0NIQU5HRSwgbnVsbCkpO1xyXG59O1xyXG5cclxuR3JvdXAucHJvdG90eXBlLmFkZENvbXBvbmVudCA9IGZ1bmN0aW9uKCl7XHJcbiAgICB2YXIgQ2xhc3NfID0gYXJndW1lbnRzWzBdO1xyXG4gICAgdmFyIGFyZ3MgICA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XHJcbiAgICAgICAgYXJncy5zaGlmdCgpO1xyXG4gICAgICAgIGFyZ3MudW5zaGlmdCh0aGlzLl9nZXRTdWJHcm91cCgpKTtcclxuXHJcbiAgICB2YXIgaW5zdGFuY2UgPSBPYmplY3QuY3JlYXRlKENsYXNzXy5wcm90b3R5cGUpO1xyXG4gICAgQ2xhc3NfLmFwcGx5KGluc3RhbmNlLGFyZ3MpO1xyXG5cclxuICAgIHRoaXMuX2NvbXBvbmVudHMucHVzaChpbnN0YW5jZSk7XHJcbiAgICB0aGlzLl91cGRhdGVIZWlnaHQoKTtcclxufTtcclxuXHJcbkdyb3VwLnByb3RvdHlwZS5fdXBkYXRlSGVpZ2h0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5fZ2V0U3ViR3JvdXAoKS51cGRhdGUoKTtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSxudWxsKSk7XHJcbiAgICBpZih0aGlzLmhhc01heEhlaWdodCgpKXtcclxuICAgICAgICB0aGlzLl9zY3JvbGxCYXIudXBkYXRlKCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5Hcm91cC5wcm90b3R5cGUuX3VwZGF0ZUFwcGVhcmFuY2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgd3JhcCA9IHRoaXMuX3dyYXBOb2RlLFxyXG4gICAgICAgIGluZGljYXRvciA9IHRoaXMuX2luZGlOb2RlO1xyXG5cclxuICAgIHZhciBzY3JvbGxCYXIgPSB0aGlzLl9zY3JvbGxCYXI7XHJcblxyXG4gICAgdmFyIGJ1ZmZlclRvcCAgICA9IHRoaXMuX3Njcm9sbEJ1ZmZlclRvcCxcclxuICAgICAgICBidWZmZXJCb3R0b20gPSB0aGlzLl9zY3JvbGxCdWZmZXJCb3R0b207XHJcblxyXG4gICAgaWYgKHRoaXMuaXNEaXNhYmxlZCgpKSB7XHJcbiAgICAgICAgd3JhcC5zZXRIZWlnaHQoMCk7XHJcbiAgICAgICAgaWYgKGluZGljYXRvcil7XHJcbiAgICAgICAgICAgIGluZGljYXRvci5zZXRTdHlsZUNsYXNzKENTUy5BcnJvd0JNaW4pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHNjcm9sbEJhcikge1xyXG4gICAgICAgICAgICBpZiAoYnVmZmVyVG9wKXtcclxuICAgICAgICAgICAgICAgIGJ1ZmZlclRvcC5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ25vbmUnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoYnVmZmVyQm90dG9tKXtcclxuICAgICAgICAgICAgICAgIGJ1ZmZlckJvdHRvbS5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ25vbmUnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMuaGFzTWF4SGVpZ2h0KCkpIHtcclxuICAgICAgICB2YXIgbWF4SGVpZ2h0ID0gdGhpcy5nZXRNYXhIZWlnaHQoKSxcclxuICAgICAgICAgICAgbGlzdEhlaWdodCA9IHdyYXAuZ2V0Q2hpbGRBdCgxKS5nZXRIZWlnaHQoKTtcclxuXHJcbiAgICAgICAgd3JhcC5zZXRIZWlnaHQobGlzdEhlaWdodCA8IG1heEhlaWdodCA/IGxpc3RIZWlnaHQgOiBtYXhIZWlnaHQpO1xyXG5cclxuICAgICAgICBpZiAoc2Nyb2xsQmFyLmlzVmFsaWQoKSkge1xyXG4gICAgICAgICAgICBpZiAoYnVmZmVyVG9wKXtcclxuICAgICAgICAgICAgICAgIGJ1ZmZlclRvcC5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ2Jsb2NrJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGJ1ZmZlckJvdHRvbSl7XHJcbiAgICAgICAgICAgICAgICBidWZmZXJCb3R0b20uc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdibG9jaycpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgd3JhcC5kZWxldGVTdHlsZVByb3BlcnR5KCdoZWlnaHQnKTtcclxuICAgIH1cclxuICAgIGlmIChpbmRpY2F0b3Ipe1xyXG4gICAgICAgIGluZGljYXRvci5zZXRTdHlsZUNsYXNzKENTUy5BcnJvd0JNYXgpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuR3JvdXAucHJvdG90eXBlLm9uR3JvdXBTaXplVXBkYXRlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xyXG4gICAgaWYgKHRoaXMuaGFzTWF4SGVpZ2h0KCkpe1xyXG4gICAgICAgIHRoaXMuX3Njcm9sbEJhci51cGRhdGUoKTtcclxuICAgIH1cclxufTtcclxuXHJcbkdyb3VwLnByb3RvdHlwZS5hZGRTdWJHcm91cCA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcclxuICAgIHRoaXMuX3N1Ykdyb3Vwcy5wdXNoKG5ldyBTdWJHcm91cCh0aGlzLCBwYXJhbXMpKTtcclxuICAgIHRoaXMuX3VwZGF0ZUhlaWdodCgpO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG5Hcm91cC5wcm90b3R5cGUuX2dldFN1Ykdyb3VwID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHN1Ykdyb3VwcyA9IHRoaXMuX3N1Ykdyb3VwcztcclxuICAgIGlmIChzdWJHcm91cHMubGVuZ3RoID09IDApe1xyXG4gICAgICAgIHN1Ykdyb3Vwcy5wdXNoKG5ldyBTdWJHcm91cCh0aGlzKSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gc3ViR3JvdXBzW3N1Ykdyb3Vwcy5sZW5ndGggLSAxXTtcclxufTtcclxuXHJcbkdyb3VwLnByb3RvdHlwZS5nZXRDb21wb25lbnRzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX2NvbXBvbmVudHM7XHJcbn07XHJcblxyXG5mdW5jdGlvbiBpc0RhdGFDb21wKGNvbXApe1xyXG4gICAgcmV0dXJuICAoY29tcCBpbnN0YW5jZW9mIE9iamVjdENvbXBvbmVudCkgJiZcclxuICAgICAgICAgICAhKGNvbXAgaW5zdGFuY2VvZiBWYWx1ZVBsb3R0ZXIpICYmXHJcbiAgICAgICAgICAgIShjb21wIGluc3RhbmNlb2YgRnVuY3Rpb25QbG90dGVyKTtcclxufVxyXG5cclxuXHJcbkdyb3VwLnByb3RvdHlwZS5zZXREYXRhID0gZnVuY3Rpb24oZGF0YSl7XHJcbiAgICB2YXIgY29tcHMgPSB0aGlzLl9jb21wb25lbnRzLCBjb21wLCBkYXRhXztcclxuICAgIHZhciBpID0gLTEsIGogPSAwLCBsID0gY29tcHMubGVuZ3RoO1xyXG4gICAgd2hpbGUoKytpIDwgbCl7XHJcbiAgICAgICAgY29tcCA9IGNvbXBzW2ldO1xyXG4gICAgICAgIGlmKCFpc0RhdGFDb21wKGNvbXApKXtcclxuICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGRhdGFfID0gZGF0YVtqKytdO1xyXG4gICAgICAgIGNvbXAuc2V0VmFsdWUoZGF0YV9bT2JqZWN0LmtleXMoZGF0YV8pWzBdXSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5Hcm91cC5wcm90b3R5cGUuZ2V0RGF0YSA9IGZ1bmN0aW9uKCl7XHJcbiAgICB2YXIgY29tcHMgPSB0aGlzLl9jb21wb25lbnRzLFxyXG4gICAgICAgIGkgPSAtMSwgbCA9IGNvbXBzLmxlbmd0aDtcclxuICAgIHZhciB2YWx1ZXMgPSBbXTtcclxuICAgIHZhciBjb21wO1xyXG4gICAgd2hpbGUoKytpIDwgbCl7XHJcbiAgICAgICAgY29tcCA9IGNvbXBzW2ldO1xyXG4gICAgICAgIGlmKCFpc0RhdGFDb21wKGNvbXApKXtcclxuICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhbHVlcy5wdXNoKGNvbXAuZ2V0RGF0YSgpKTtcclxuICAgIH1cclxuICAgIHJldHVybiB2YWx1ZXM7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEdyb3VwO1xyXG4iLCJ2YXIgR3JvdXBFdmVudCA9IHtcclxuXHRHUk9VUF9TSVpFX0NIQU5HRSAgICAgICAgOiAnZ3JvdXBTaXplQ2hhbmdlJyxcclxuXHRHUk9VUF9MSVNUX1NJWkVfQ0hBTkdFICAgOiAnZ3JvdXBMaXN0U2l6ZUNoYW5nZScsXHJcblx0R1JPVVBfU0laRV9VUERBVEUgICAgICAgIDogJ2dyb3VwU2l6ZVVwZGF0ZScsXHJcblx0U1VCR1JPVVBfVFJJR0dFUiAgICAgICAgIDogJ3N1Ykdyb3VwVHJpZ2dlcicsXHJcblxyXG5cdFNVQkdST1VQX0VOQUJMRSAgICAgICAgICA6ICdlbmFibGVTdWJHcm91cCcsXHJcblx0U1VCR1JPVVBfRElTQUJMRSAgICAgICAgIDogJ2Rpc2FibGVTdWJHcm91cCdcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gR3JvdXBFdmVudDsiLCJ2YXIgTWVudUV2ZW50ID0ge1xyXG5cdFVQREFURV9NRU5VOiAndXBkYXRlTWVudSdcclxufTtcclxubW9kdWxlLmV4cG9ydHMgPSBNZW51RXZlbnQ7IiwidmFyIE5vZGUgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpLFxyXG4gICAgR3JvdXAgICAgID0gcmVxdWlyZSgnLi9Hcm91cCcpLFxyXG4gICAgU2Nyb2xsQmFyID0gcmVxdWlyZSgnLi4vY29yZS9sYXlvdXQvU2Nyb2xsQmFyJyk7XHJcblxyXG52YXIgQ1NTICAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XHJcbnZhciBMYXlvdXRNb2RlID0gcmVxdWlyZSgnLi4vY29yZS9sYXlvdXQvTGF5b3V0TW9kZScpO1xyXG52YXIgSGlzdG9yeSAgICA9IHJlcXVpcmUoJy4uL2NvcmUvSGlzdG9yeScpO1xyXG5cclxudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnREaXNwYXRjaGVyJyksXHJcbiAgICBFdmVudF8gICAgICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXHJcbiAgICBEb2N1bWVudEV2ZW50ICAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcclxuICAgIE5vZGVFdmVudCAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50JyksXHJcbiAgICBQYW5lbEV2ZW50ICAgICAgPSByZXF1aXJlKCcuL1BhbmVsRXZlbnQnKSxcclxuICAgIE1lbnVFdmVudCAgICAgICA9IHJlcXVpcmUoJy4vTWVudUV2ZW50Jyk7XHJcblxyXG52YXIgTW91c2UgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L01vdXNlJyk7XHJcblxyXG52YXIgU3RyaW5nSW5wdXQgICAgID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L1N0cmluZ0lucHV0JyksXHJcbiAgICBOdW1iZXJJbnB1dCAgICAgPSByZXF1aXJlKCcuLi9jb21wb25lbnQvTnVtYmVySW5wdXQnKSxcclxuICAgIFJhbmdlICAgICAgICAgICA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9SYW5nZScpLFxyXG4gICAgQ2hlY2tib3ggICAgICAgID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L0NoZWNrYm94JyksXHJcbiAgICBDb2xvciAgICAgICAgICAgPSByZXF1aXJlKCcuLi9jb21wb25lbnQvQ29sb3InKSxcclxuICAgIEJ1dHRvbiAgICAgICAgICA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9CdXR0b24nKSxcclxuICAgIFNlbGVjdCAgICAgICAgICA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9TZWxlY3QnKSxcclxuICAgIFNsaWRlciAgICAgICAgICA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9TbGlkZXInKSxcclxuICAgIEZ1bmN0aW9uUGxvdHRlciA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9GdW5jdGlvblBsb3R0ZXInKSxcclxuICAgIFBhZCAgICAgICAgICAgICA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9QYWQnKSxcclxuICAgIFZhbHVlUGxvdHRlciAgICA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9WYWx1ZVBsb3R0ZXInKSxcclxuICAgIE51bWJlck91dHB1dCAgICA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9OdW1iZXJPdXRwdXQnKSxcclxuICAgIFN0cmluZ091dHB1dCAgICA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9TdHJpbmdPdXRwdXQnKSxcclxuICAgIENhbnZhc18gICAgICAgICA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9DYW52YXMnKSxcclxuICAgIFNWR18gICAgICAgICAgICA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9TVkcnKTtcclxuXHJcbnZhciBERUZBVUxUX1BBTkVMX1BPU0lUSU9OID0gbnVsbCxcclxuICAgIERFRkFVTFRfUEFORUxfV0lEVEggICAgICA9IDIwMCxcclxuICAgIERFRkFVTFRfUEFORUxfSEVJR0hUICAgICA9IG51bGwsXHJcbiAgICBERUZBVUxUX1BBTkVMX1dJRFRIX01JTiAgPSAxMDAsXHJcbiAgICBERUZBVUxUX1BBTkVMX1dJRFRIX01BWCAgPSA2MDAsXHJcbiAgICBERUZBVUxUX1BBTkVMX1JBVElPICAgICAgPSA0MCxcclxuICAgIERFRkFVTFRfUEFORUxfTEFCRUwgICAgICA9ICdDb250cm9sIFBhbmVsJyxcclxuICAgIERFRkFVTFRfUEFORUxfVkFMSUdOICAgICA9IExheW91dE1vZGUuVE9QLFxyXG4gICAgREVGQVVMVF9QQU5FTF9BTElHTiAgICAgID0gTGF5b3V0TW9kZS5SSUdIVCxcclxuICAgIERFRkFVTFRfUEFORUxfRE9DSyAgICAgICA9IHthbGlnbjpMYXlvdXRNb2RlLlJJR0hULHJlc2l6YWJsZTp0cnVlfSxcclxuICAgIERFRkFVTFRfUEFORUxfRU5BQkxFICAgICA9IHRydWUsXHJcbiAgICBERUZBVUxUX1BBTkVMX09QQUNJVFkgICAgPSAxLjAsXHJcbiAgICBERUZBVUxUX1BBTkVMX0ZJWEVEICAgICAgPSB0cnVlLFxyXG4gICAgREVGQVVMVF9QQU5FTF9WQ09OU1RSQUlOID0gdHJ1ZTtcclxuXHJcbmZ1bmN0aW9uIFBhbmVsKGNvbnRyb2xLaXQscGFyYW1zKXtcclxuICAgIEV2ZW50RGlzcGF0Y2hlci5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XHJcbiAgICB0aGlzLl9wYXJlbnQgPSBjb250cm9sS2l0O1xyXG5cclxuXHJcbiAgICBwYXJhbXMgICAgICAgICAgICA9IHBhcmFtcyAgICAgICAgICAgfHwge307XHJcbiAgICBwYXJhbXMudmFsaWduICAgICA9IHBhcmFtcy52YWxpZ24gICAgfHwgREVGQVVMVF9QQU5FTF9WQUxJR047XHJcbiAgICBwYXJhbXMuYWxpZ24gICAgICA9IHBhcmFtcy5hbGlnbiAgICAgfHwgREVGQVVMVF9QQU5FTF9BTElHTjtcclxuICAgIHBhcmFtcy5wb3NpdGlvbiAgID0gcGFyYW1zLnBvc2l0aW9uICB8fCBERUZBVUxUX1BBTkVMX1BPU0lUSU9OO1xyXG4gICAgcGFyYW1zLndpZHRoICAgICAgPSBwYXJhbXMud2lkdGggICAgIHx8IERFRkFVTFRfUEFORUxfV0lEVEg7XHJcbiAgICBwYXJhbXMuaGVpZ2h0ICAgICA9IHBhcmFtcy5oZWlnaHQgICAgfHwgREVGQVVMVF9QQU5FTF9IRUlHSFQ7XHJcbiAgICBwYXJhbXMucmF0aW8gICAgICA9IHBhcmFtcy5yYXRpbyAgICAgfHwgREVGQVVMVF9QQU5FTF9SQVRJTztcclxuICAgIHBhcmFtcy5sYWJlbCAgICAgID0gcGFyYW1zLmxhYmVsICAgICB8fCBERUZBVUxUX1BBTkVMX0xBQkVMO1xyXG4gICAgcGFyYW1zLm9wYWNpdHkgICAgPSBwYXJhbXMub3BhY2l0eSAgIHx8IERFRkFVTFRfUEFORUxfT1BBQ0lUWTtcclxuICAgIHBhcmFtcy5maXhlZCAgICAgID0gcGFyYW1zLmZpeGVkICAgICAgPT09IHVuZGVmaW5lZCA/IERFRkFVTFRfUEFORUxfRklYRUQgICAgICA6IHBhcmFtcy5maXhlZDtcclxuICAgIHBhcmFtcy5lbmFibGUgICAgID0gcGFyYW1zLmVuYWJsZSAgICAgPT09IHVuZGVmaW5lZCA/IERFRkFVTFRfUEFORUxfRU5BQkxFICAgICA6IHBhcmFtcy5lbmFibGU7XHJcbiAgICBwYXJhbXMudmNvbnN0cmFpbiA9IHBhcmFtcy52Y29uc3RyYWluID09PSB1bmRlZmluZWQgPyBERUZBVUxUX1BBTkVMX1ZDT05TVFJBSU4gOiBwYXJhbXMudmNvbnN0cmFpbjtcclxuXHJcbiAgICBpZiAocGFyYW1zLmRvY2spIHtcclxuICAgICAgICBwYXJhbXMuZG9jay5hbGlnbiA9IHBhcmFtcy5kb2NrLmFsaWduIHx8IERFRkFVTFRfUEFORUxfRE9DSy5hbGlnbjtcclxuICAgICAgICBwYXJhbXMuZG9jay5yZXNpemFibGUgPSBwYXJhbXMuZG9jay5yZXNpemFibGUgfHwgREVGQVVMVF9QQU5FTF9ET0NLLnJlc2l6YWJsZTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLl93aWR0aCAgICAgID0gTWF0aC5tYXgoREVGQVVMVF9QQU5FTF9XSURUSF9NSU4sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgTWF0aC5taW4ocGFyYW1zLndpZHRoLERFRkFVTFRfUEFORUxfV0lEVEhfTUFYKSk7XHJcbiAgICB0aGlzLl9oZWlnaHQgICAgID0gcGFyYW1zLmhlaWdodCA/ICBNYXRoLm1heCgwLE1hdGgubWluKHBhcmFtcy5oZWlnaHQsd2luZG93LmlubmVySGVpZ2h0KSkgOiBudWxsO1xyXG4gICAgdGhpcy5fZml4ZWQgICAgICA9IHBhcmFtcy5maXhlZDtcclxuICAgIHRoaXMuX2RvY2sgICAgICAgPSBwYXJhbXMuZG9jaztcclxuICAgIHRoaXMuX3Bvc2l0aW9uICAgPSBwYXJhbXMucG9zaXRpb247XHJcbiAgICB0aGlzLl92Q29uc3RyYWluID0gcGFyYW1zLnZjb25zdHJhaW47XHJcbiAgICB0aGlzLl9sYWJlbCAgICAgID0gcGFyYW1zLmxhYmVsO1xyXG4gICAgdGhpcy5fZW5hYmxlZCAgICA9IHBhcmFtcy5lbmFibGU7XHJcbiAgICB0aGlzLl9ncm91cHMgICAgID0gW107XHJcblxyXG5cclxuICAgIHZhciB3aWR0aCAgICA9IHRoaXMuX3dpZHRoLFxyXG4gICAgICAgIGlzRml4ZWQgID0gdGhpcy5fZml4ZWQsXHJcbiAgICAgICAgZG9jayAgICAgPSB0aGlzLl9kb2NrLFxyXG4gICAgICAgIHBvc2l0aW9uID0gdGhpcy5fcG9zaXRpb24sXHJcbiAgICAgICAgbGFiZWwgICAgPSB0aGlzLl9sYWJlbCxcclxuICAgICAgICBhbGlnbiAgICA9IHBhcmFtcy5hbGlnbixcclxuICAgICAgICBvcGFjaXR5ICA9IHBhcmFtcy5vcGFjaXR5O1xyXG5cclxuXHJcbiAgICB2YXIgcm9vdCA9IHRoaXMuX25vZGUgICAgID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QYW5lbCksXHJcbiAgICAgICAgaGVhZCA9IHRoaXMuX2hlYWROb2RlID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5IZWFkKSxcclxuICAgICAgICBtZW51ICAgICAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLk1lbnUpLFxyXG4gICAgICAgIGxhYmVsV3JhcCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCksXHJcbiAgICAgICAgbGFiZWxfICAgID0gbmV3IE5vZGUoTm9kZS5TUEFOKS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCksXHJcbiAgICAgICAgd3JhcCA9IHRoaXMuX3dyYXBOb2RlID0gbmV3IE5vZGUoTm9kZS5ESVYpLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApLFxyXG4gICAgICAgIGxpc3QgPSB0aGlzLl9saXN0Tm9kZSA9IG5ldyBOb2RlKE5vZGUuTElTVCkuc2V0U3R5bGVDbGFzcyhDU1MuR3JvdXBMaXN0KTtcclxuXHJcbiAgICByb290LnNldFdpZHRoKHdpZHRoKTtcclxuICAgIGxhYmVsXy5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywgbGFiZWwpO1xyXG5cclxuICAgIGxhYmVsV3JhcC5hZGRDaGlsZChsYWJlbF8pO1xyXG4gICAgaGVhZC5hZGRDaGlsZChtZW51KTtcclxuICAgIGhlYWQuYWRkQ2hpbGQobGFiZWxXcmFwKTtcclxuICAgIHdyYXAuYWRkQ2hpbGQobGlzdCk7XHJcbiAgICByb290LmFkZENoaWxkKGhlYWQpO1xyXG4gICAgcm9vdC5hZGRDaGlsZCh3cmFwKTtcclxuXHJcbiAgICBjb250cm9sS2l0LmdldE5vZGUoKS5hZGRDaGlsZChyb290KTtcclxuXHJcblxyXG4gICAgaWYgKCFkb2NrKSB7XHJcbiAgICAgICAgdmFyIG1lbnVIaWRlID0gdGhpcy5fbWVudUhpZGUgPSBuZXcgTm9kZShOb2RlLklOUFVUX0JVVFRPTik7XHJcbiAgICAgICAgICAgIG1lbnVIaWRlLnNldFN0eWxlQ2xhc3MoQ1NTLkJ1dHRvbk1lbnVIaWRlKTtcclxuICAgICAgICAgICAgbWVudUhpZGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25NZW51SGlkZU1vdXNlRG93bi5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICAgICAgbWVudS5hZGRDaGlsZChtZW51SGlkZSk7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLl9wYXJlbnQucGFuZWxzQXJlQ2xvc2FibGUoKSkge1xyXG4gICAgICAgICAgICB2YXIgbWVudUNsb3NlID0gbmV3IE5vZGUoTm9kZS5JTlBVVF9CVVRUT04pO1xyXG4gICAgICAgICAgICBtZW51Q2xvc2Uuc2V0U3R5bGVDbGFzcyhDU1MuQnV0dG9uTWVudUNsb3NlKTtcclxuICAgICAgICAgICAgbWVudUNsb3NlLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuZGlzYWJsZS5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICAgICAgICAgIG1lbnUuYWRkQ2hpbGQobWVudUNsb3NlKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBpZiAodGhpcy5oYXNNYXhIZWlnaHQoKSkge1xyXG4gICAgICAgICAgICB0aGlzLl9hZGRTY3JvbGxXcmFwKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIWlzRml4ZWQpIHtcclxuICAgICAgICAgICAgaWYgKHBvc2l0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoYWxpZ24gPT0gTGF5b3V0TW9kZS5MRUZUIHx8XHJcbiAgICAgICAgICAgICAgICAgICAgYWxpZ24gPT0gTGF5b3V0TW9kZS5UT1AgfHxcclxuICAgICAgICAgICAgICAgICAgICBhbGlnbiA9PSBMYXlvdXRNb2RlLkJPVFRPTSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJvb3Quc2V0UG9zaXRpb25HbG9iYWwocG9zaXRpb25bMF0sIHBvc2l0aW9uWzFdKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJvb3Quc2V0UG9zaXRpb25HbG9iYWwod2luZG93LmlubmVyV2lkdGggLSB3aWR0aCAtIHBvc2l0aW9uWzBdLCBwb3NpdGlvblsxXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fcG9zaXRpb24gPSByb290LmdldFBvc2l0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB0aGlzLl9wb3NpdGlvbiA9IHJvb3QuZ2V0UG9zaXRpb24oKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuX21vdXNlT2Zmc2V0ID0gWzAsIDBdO1xyXG5cclxuICAgICAgICAgICAgcm9vdC5zZXRTdHlsZVByb3BlcnR5KCdwb3NpdGlvbicsICdhYnNvbHV0ZScpO1xyXG4gICAgICAgICAgICBoZWFkLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uSGVhZERyYWdTdGFydC5iaW5kKHRoaXMpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGlmIChwb3NpdGlvbikge1xyXG4gICAgICAgICAgICAgICAgdmFyIHBvc2l0aW9uWCA9IHBvc2l0aW9uWzBdLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uWSA9IHBvc2l0aW9uWzFdO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvblkgIT0gMClyb290LnNldFBvc2l0aW9uWShwb3NpdGlvblkpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHBvc2l0aW9uWCAhPSAwKWlmIChhbGlnbiA9PSBMYXlvdXRNb2RlLlJJR0hUKXJvb3QuZ2V0RWxlbWVudCgpLm1hcmdpblJpZ2h0ID0gcG9zaXRpb25YO1xyXG4gICAgICAgICAgICAgICAgZWxzZSByb290LnNldFBvc2l0aW9uWChwb3NpdGlvblgpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByb290LnNldFN0eWxlUHJvcGVydHkoJ2Zsb2F0JywgYWxpZ24pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIHZhciBkb2NrQWxpZ25tZW50ID0gZG9jay5hbGlnbjtcclxuXHJcbiAgICAgICAgaWYgKGRvY2tBbGlnbm1lbnQgPT0gTGF5b3V0TW9kZS5MRUZUIHx8XHJcbiAgICAgICAgICAgIGRvY2tBbGlnbm1lbnQgPT0gTGF5b3V0TW9kZS5SSUdIVCkge1xyXG4gICAgICAgICAgICBhbGlnbiA9IGRvY2tBbGlnbm1lbnQ7XHJcbiAgICAgICAgICAgIHRoaXMuX2hlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChkb2NrQWxpZ25tZW50ID09IExheW91dE1vZGUuVE9QIHx8XHJcbiAgICAgICAgICAgIGRvY2tBbGlnbm1lbnQgPT0gTGF5b3V0TW9kZS5CT1RUT00pIHtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKlxyXG4gICAgICAgICBpZihkb2NrLnJlc2l6YWJsZSlcclxuICAgICAgICAge1xyXG4gICAgICAgICB2YXIgc2l6ZUhhbmRsZSA9IG5ldyBDb250cm9sS2l0Lk5vZGUoQ29udHJvbEtpdC5Ob2RlVHlwZS5ESVYpO1xyXG4gICAgICAgICBzaXplSGFuZGxlLnNldFN0eWxlQ2xhc3MoQ29udHJvbEtpdC5DU1MuU2l6ZUhhbmRsZSk7XHJcbiAgICAgICAgIHJvb3ROb2RlLmFkZENoaWxkKHNpemVIYW5kbGUpO1xyXG4gICAgICAgICB9XHJcbiAgICAgICAgICovXHJcblxyXG4gICAgICAgIHJvb3Quc2V0U3R5bGVQcm9wZXJ0eSgnZmxvYXQnLCBhbGlnbik7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHBhcmVudCA9IHRoaXMuX3BhcmVudDtcclxuICAgIHZhciBoaXN0b3J5SXNFbmFibGVkID0gcGFyZW50Lmhpc3RvcnlJc0VuYWJsZWQoKSxcclxuICAgICAgICBzdGF0ZXNBcmVFbmFibGVkID0gcGFyZW50LnN0YXRlc0FyZUVuYWJsZWQoKTtcclxuXHJcbiAgICBpZihoaXN0b3J5SXNFbmFibGVkIHx8IHN0YXRlc0FyZUVuYWJsZWQpe1xyXG4gICAgICAgIG1lbnUuYWRkQ2hpbGRBdChuZXcgTm9kZSgpLDApLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApOy8vLnNldFN0eWxlUHJvcGVydHkoJ2Rpc3BsYXknLCdub25lJyk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGhpc3RvcnlJc0VuYWJsZWQpIHtcclxuICAgICAgICB0aGlzLl9tZW51VW5kbyA9IG1lbnUuZ2V0Q2hpbGRBdCgwKVxyXG4gICAgICAgICAgICAuYWRkQ2hpbGQobmV3IE5vZGUoTm9kZS5JTlBVVF9CVVRUT04pKVxyXG4gICAgICAgICAgICAgICAgLnNldFN0eWxlQ2xhc3MoQ1NTLkJ1dHRvbk1lbnVVbmRvKVxyXG4gICAgICAgICAgICAgICAgLnNldFByb3BlcnR5KCd2YWx1ZScsSGlzdG9yeS5nZXQoKS5nZXROdW1TdGF0ZXMoKSlcclxuICAgICAgICAgICAgICAgIC5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgICAgICAgICAgSGlzdG9yeS5nZXQoKS5wb3BTdGF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoTWVudUV2ZW50LlVQREFURV9NRU5VLHRoaXMsICdvblVwZGF0ZU1lbnUnKTtcclxuICAgIH1cclxuICAgIGlmKHN0YXRlc0FyZUVuYWJsZWQpe1xyXG4gICAgICAgIG1lbnUuZ2V0Q2hpbGRBdCgwKVxyXG4gICAgICAgICAgICAuYWRkQ2hpbGQobmV3IE5vZGUoTm9kZS5JTlBVVF9CVVRUT04pKVxyXG4gICAgICAgICAgICAgICAgLnNldFN0eWxlQ2xhc3MoQ1NTLkJ1dHRvbk1lbnVMb2FkKVxyXG4gICAgICAgICAgICAgICAgLnNldFByb3BlcnR5KCd2YWx1ZScsJ0xvYWQnKVxyXG4gICAgICAgICAgICAgICAgLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgICAgICAgICBjb250cm9sS2l0Ll9sb2FkU3RhdGUoKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIG1lbnUuZ2V0Q2hpbGRBdCgwKVxyXG4gICAgICAgICAgICAuYWRkQ2hpbGQobmV3IE5vZGUoTm9kZS5JTlBVVF9CVVRUT04pKVxyXG4gICAgICAgICAgICAgICAgLnNldFN0eWxlQ2xhc3MoQ1NTLkJ1dHRvbk1lbnVTYXZlKVxyXG4gICAgICAgICAgICAgICAgLnNldFByb3BlcnR5KCd2YWx1ZScsJ1NhdmUnKVxyXG4gICAgICAgICAgICAgICAgLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgICAgICAgICBjb250cm9sS2l0Ll9zYXZlU3RhdGUoKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgaWYoaGlzdG9yeUlzRW5hYmxlZCB8fCBzdGF0ZXNBcmVFbmFibGVkKXtcclxuICAgICAgICBoZWFkLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX09WRVIsZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgbWVudS5zZXRTdHlsZUNsYXNzKENTUy5NZW51QWN0aXZlKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBoZWFkLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX09VVCxmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICBtZW51LnNldFN0eWxlQ2xhc3MoQ1NTLk1lbnUpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgaWYgKG9wYWNpdHkgIT0gMS4wICYmIG9wYWNpdHkgIT0gMC4wKSB7XHJcbiAgICAgICAgcm9vdC5zZXRTdHlsZVByb3BlcnR5KCdvcGFjaXR5Jywgb3BhY2l0eSk7XHJcbiAgICB9XHJcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50LldJTkRPV19SRVNJWkUsdGhpcy5fb25XaW5kb3dSZXNpemUuYmluZCh0aGlzKSk7XHJcbiAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XHJcbn1cclxuUGFuZWwucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudERpc3BhdGNoZXIucHJvdG90eXBlKTtcclxuUGFuZWwucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gUGFuZWw7XHJcblxyXG5QYW5lbC5wcm90b3R5cGUuX29uTWVudUhpZGVNb3VzZURvd24gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLl9lbmFibGVkID0gIXRoaXMuX2VuYWJsZWQ7XHJcbiAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XHJcbn07XHJcblxyXG5QYW5lbC5wcm90b3R5cGUub25VcGRhdGVNZW51ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5fbWVudVVuZG8uc2V0UHJvcGVydHkoJ3ZhbHVlJywgSGlzdG9yeS5nZXQoKS5nZXROdW1TdGF0ZXMoKSk7XHJcbn07XHJcblxyXG5QYW5lbC5wcm90b3R5cGUuX29uTWVudVVuZG9UcmlnZ2VyID0gZnVuY3Rpb24gKCkge1xyXG4gICAgSGlzdG9yeS5nZXQoKS5wb3BTdGF0ZSgpO1xyXG59O1xyXG5cclxuXHJcblBhbmVsLnByb3RvdHlwZS5fdXBkYXRlQXBwZWFyYW5jZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciByb290Tm9kZSA9IHRoaXMuX25vZGUsXHJcbiAgICAgICAgaGVhZE5vZGUgPSB0aGlzLl9oZWFkTm9kZSxcclxuICAgICAgICBtZW51SGlkZSA9IHRoaXMuX21lbnVIaWRlO1xyXG5cclxuICAgIGlmICghdGhpcy5fZW5hYmxlZCkge1xyXG4gICAgICAgIGhlYWROb2RlLmdldFN0eWxlKCkuYm9yZGVyQm90dG9tID0gJ25vbmUnO1xyXG4gICAgICAgIHJvb3ROb2RlLnNldEhlaWdodChoZWFkTm9kZS5nZXRIZWlnaHQoKSk7XHJcbiAgICAgICAgbWVudUhpZGUuc2V0U3R5bGVDbGFzcyhDU1MuQnV0dG9uTWVudVNob3cpO1xyXG4gICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIFBhbmVsRXZlbnQuUEFORUxfSElERSwgbnVsbCkpO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgcm9vdE5vZGUuc2V0SGVpZ2h0KGhlYWROb2RlLmdldEhlaWdodCgpICsgdGhpcy5fd3JhcE5vZGUuZ2V0SGVpZ2h0KCkpO1xyXG4gICAgICAgIHJvb3ROb2RlLmRlbGV0ZVN0eWxlUHJvcGVydHkoJ2hlaWdodCcpO1xyXG4gICAgICAgIG1lbnVIaWRlLnNldFN0eWxlQ2xhc3MoQ1NTLkJ1dHRvbk1lbnVIaWRlKTtcclxuICAgICAgICBoZWFkTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5IZWFkKTtcclxuICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX1NIT1csIG51bGwpKTtcclxuICAgIH1cclxufTtcclxuXHJcblBhbmVsLnByb3RvdHlwZS5fb25IZWFkRHJhZ1N0YXJ0ID0gZnVuY3Rpb24oKXtcclxuICAgIHZhciBwYXJlbnROb2RlID0gdGhpcy5fcGFyZW50LmdldE5vZGUoKSxcclxuICAgICAgICBub2RlICAgICAgID0gdGhpcy5fbm9kZTtcclxuXHJcbiAgICB2YXIgbm9kZVBvcyAgID0gbm9kZS5nZXRQb3NpdGlvbkdsb2JhbCgpLFxyXG4gICAgICAgIG1vdXNlUG9zICA9IE1vdXNlLmdldCgpLmdldFBvc2l0aW9uKCksXHJcbiAgICAgICAgb2Zmc2V0UG9zID0gdGhpcy5fbW91c2VPZmZzZXQ7XHJcblxyXG4gICAgICAgIG9mZnNldFBvc1swXSA9IG1vdXNlUG9zWzBdIC0gbm9kZVBvc1swXTtcclxuICAgICAgICBvZmZzZXRQb3NbMV0gPSBtb3VzZVBvc1sxXSAtIG5vZGVQb3NbMV07XHJcblxyXG4gICAgdmFyIGV2ZW50TW91c2VNb3ZlID0gRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLFxyXG4gICAgICAgIGV2ZW50TW91c2VVcCAgID0gRG9jdW1lbnRFdmVudC5NT1VTRV9VUDtcclxuXHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gICAgdmFyIG9uRHJhZyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgc2VsZi5fdXBkYXRlUG9zaXRpb24oKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIG9uRHJhZ0VuZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCBmYWxzZSk7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcclxuICAgICAgICAgICAgc2VsZi5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgUGFuZWxFdmVudC5QQU5FTF9NT1ZFX0VORCwgbnVsbCkpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgcGFyZW50Tm9kZS5yZW1vdmVDaGlsZChub2RlKTtcclxuICAgIHBhcmVudE5vZGUuYWRkQ2hpbGQoICAgbm9kZSk7XHJcblxyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCAgICBmYWxzZSk7XHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VVcCwgICBvbkRyYWdFbmQsIGZhbHNlKTtcclxuXHJcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLFBhbmVsRXZlbnQuUEFORUxfTU9WRV9CRUdJTixudWxsKSk7XHJcbn07XHJcblxyXG5QYW5lbC5wcm90b3R5cGUuX3VwZGF0ZVBvc2l0aW9uID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIG1vdXNlUG9zID0gTW91c2UuZ2V0KCkuZ2V0UG9zaXRpb24oKSxcclxuICAgICAgICBvZmZzZXRQb3MgPSB0aGlzLl9tb3VzZU9mZnNldDtcclxuXHJcbiAgICB2YXIgcG9zaXRpb24gPSB0aGlzLl9wb3NpdGlvbjtcclxuICAgIHBvc2l0aW9uWzBdID0gbW91c2VQb3NbMF0gLSBvZmZzZXRQb3NbMF07XHJcbiAgICBwb3NpdGlvblsxXSA9IG1vdXNlUG9zWzFdIC0gb2Zmc2V0UG9zWzFdO1xyXG5cclxuICAgIHRoaXMuX2NvbnN0cmFpbkhlaWdodCgpO1xyXG4gICAgdGhpcy5fY29uc3RyYWluUG9zaXRpb24oKTtcclxuXHJcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX01PVkUsIG51bGwpKTtcclxufTtcclxuXHJcblBhbmVsLnByb3RvdHlwZS5fb25XaW5kb3dSZXNpemUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBpZiAodGhpcy5pc0RvY2tlZCgpKSB7XHJcbiAgICAgICAgdmFyIGRvY2sgPSB0aGlzLl9kb2NrO1xyXG5cclxuICAgICAgICBpZiAoZG9jay5hbGlnbiA9PSBMYXlvdXRNb2RlLlJJR0hUIHx8XHJcbiAgICAgICAgICAgIGRvY2suYWxpZ24gPT0gTGF5b3V0TW9kZS5MRUZUKSB7XHJcbiAgICAgICAgICAgIHZhciB3aW5kb3dIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQsXHJcbiAgICAgICAgICAgICAgICBsaXN0SGVpZ2h0ID0gdGhpcy5fbGlzdE5vZGUuZ2V0SGVpZ2h0KCksXHJcbiAgICAgICAgICAgICAgICBoZWFkSGVpZ2h0ID0gdGhpcy5faGVhZE5vZGUuZ2V0SGVpZ2h0KCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLl9oZWlnaHQgPSB3aW5kb3dIZWlnaHQ7XHJcblxyXG4gICAgICAgICAgICBpZiAoKHdpbmRvd0hlaWdodCAtIGhlYWRIZWlnaHQpID4gbGlzdEhlaWdodCl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9zY3JvbGxCYXIuZGlzYWJsZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2V7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9zY3JvbGxCYXIuZW5hYmxlKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIFBhbmVsRXZlbnQuUEFORUxfU0laRV9DSEFOR0UpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBpZiAoIXRoaXMuaXNGaXhlZCgpKXtcclxuICAgICAgICAgICAgdGhpcy5fY29uc3RyYWluUG9zaXRpb24oKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICB0aGlzLl9jb25zdHJhaW5IZWlnaHQoKTtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIERvY3VtZW50RXZlbnQuV0lORE9XX1JFU0laRSkpO1xyXG59O1xyXG5cclxuUGFuZWwucHJvdG90eXBlLl9jb25zdHJhaW5Qb3NpdGlvbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBub2RlID0gdGhpcy5fbm9kZTtcclxuXHJcbiAgICB2YXIgbWF4WCA9IHdpbmRvdy5pbm5lcldpZHRoIC0gbm9kZS5nZXRXaWR0aCgpLFxyXG4gICAgICAgIG1heFkgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSBub2RlLmdldEhlaWdodCgpO1xyXG5cclxuICAgIHZhciBwb3NpdGlvbiA9IHRoaXMuX3Bvc2l0aW9uO1xyXG4gICAgcG9zaXRpb25bMF0gPSBNYXRoLm1heCgwLCBNYXRoLm1pbihwb3NpdGlvblswXSwgbWF4WCkpO1xyXG4gICAgcG9zaXRpb25bMV0gPSBNYXRoLm1heCgwLCBNYXRoLm1pbihwb3NpdGlvblsxXSwgbWF4WSkpO1xyXG5cclxuICAgIG5vZGUuc2V0UG9zaXRpb25HbG9iYWwocG9zaXRpb25bMF0sIHBvc2l0aW9uWzFdKTtcclxufTtcclxuXHJcblBhbmVsLnByb3RvdHlwZS5fY29uc3RyYWluSGVpZ2h0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgaWYgKCF0aGlzLl92Q29uc3RyYWluKXJldHVybjtcclxuXHJcbiAgICB2YXIgaGFzTWF4SGVpZ2h0ID0gdGhpcy5oYXNNYXhIZWlnaHQoKSxcclxuICAgICAgICBoYXNTY3JvbGxXcmFwID0gdGhpcy5oYXNTY3JvbGxXcmFwKCk7XHJcblxyXG4gICAgdmFyIGhlYWQgPSB0aGlzLl9oZWFkTm9kZSxcclxuICAgICAgICB3cmFwID0gdGhpcy5fd3JhcE5vZGU7XHJcblxyXG4gICAgdmFyIHNjcm9sbEJhciA9IHRoaXMuX3Njcm9sbEJhcjtcclxuXHJcbiAgICB2YXIgcGFuZWxUb3AgPSB0aGlzLmlzRG9ja2VkKCkgPyAwIDpcclxuICAgICAgICB0aGlzLmlzRml4ZWQoKSA/IDAgOlxyXG4gICAgICAgICAgICB0aGlzLl9wb3NpdGlvblsxXTtcclxuXHJcbiAgICB2YXIgcGFuZWxIZWlnaHQgPSBoYXNNYXhIZWlnaHQgPyB0aGlzLmdldE1heEhlaWdodCgpIDpcclxuICAgICAgICBoYXNTY3JvbGxXcmFwID8gc2Nyb2xsQmFyLmdldFRhcmdldE5vZGUoKS5nZXRIZWlnaHQoKSA6XHJcbiAgICAgICAgICAgIHdyYXAuZ2V0SGVpZ2h0KCk7XHJcblxyXG4gICAgdmFyIHBhbmVsQm90dG9tID0gcGFuZWxUb3AgKyBwYW5lbEhlaWdodDtcclxuICAgIHZhciBoZWFkSGVpZ2h0ID0gaGVhZC5nZXRIZWlnaHQoKTtcclxuXHJcbiAgICB2YXIgd2luZG93SGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0LFxyXG4gICAgICAgIGhlaWdodERpZmYgPSB3aW5kb3dIZWlnaHQgLSBwYW5lbEJvdHRvbSAtIGhlYWRIZWlnaHQsXHJcbiAgICAgICAgaGVpZ2h0U3VtO1xyXG5cclxuICAgIGlmIChoZWlnaHREaWZmIDwgMC4wKSB7XHJcbiAgICAgICAgaGVpZ2h0U3VtID0gcGFuZWxIZWlnaHQgKyBoZWlnaHREaWZmO1xyXG5cclxuICAgICAgICBpZiAoIWhhc1Njcm9sbFdyYXApIHtcclxuICAgICAgICAgICAgdGhpcy5fYWRkU2Nyb2xsV3JhcChoZWlnaHRTdW0pO1xyXG4gICAgICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX1NDUk9MTF9XUkFQX0FEREVELCBudWxsKSk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjcm9sbEJhci5zZXRXcmFwSGVpZ2h0KGhlaWdodFN1bSk7XHJcbiAgICAgICAgd3JhcC5zZXRIZWlnaHQoaGVpZ2h0U3VtKTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIGlmICghaGFzTWF4SGVpZ2h0ICYmIGhhc1Njcm9sbFdyYXApIHtcclxuICAgICAgICAgICAgc2Nyb2xsQmFyLnJlbW92ZUZyb21QYXJlbnQoKTtcclxuICAgICAgICAgICAgd3JhcC5hZGRDaGlsZCh0aGlzLl9saXN0Tm9kZSk7XHJcbiAgICAgICAgICAgIHdyYXAuZGVsZXRlU3R5bGVQcm9wZXJ0eSgnaGVpZ2h0Jyk7XHJcbiAgICAgICAgICAgIHRoaXMuX3Njcm9sbEJhci5yZW1vdmVNb3VzZUxpc3RlbmVyKCk7XHJcbiAgICAgICAgICAgIHRoaXMuX3Njcm9sbEJhciA9IG51bGw7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX1NDUk9MTF9XUkFQX1JFTU9WRUQsIG51bGwpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn07XHJcblxyXG5QYW5lbC5wcm90b3R5cGUub25Hcm91cExpc3RTaXplQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgaWYgKHRoaXMuaGFzU2Nyb2xsV3JhcCgpKXtcclxuICAgICAgICB0aGlzLl91cGRhdGVTY3JvbGxXcmFwKCk7XHJcbiAgICB9XHJcbiAgICB0aGlzLl9jb25zdHJhaW5IZWlnaHQoKTtcclxufTtcclxuXHJcblBhbmVsLnByb3RvdHlwZS5fdXBkYXRlU2Nyb2xsV3JhcCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciB3cmFwICAgPSB0aGlzLl93cmFwTm9kZSxcclxuICAgICAgICBzY3JvbGxCYXIgID0gdGhpcy5fc2Nyb2xsQmFyLFxyXG4gICAgICAgIGhlaWdodCAgICAgPSB0aGlzLmhhc01heEhlaWdodCgpID8gdGhpcy5nZXRNYXhIZWlnaHQoKSA6IDEwMCxcclxuICAgICAgICBsaXN0SGVpZ2h0ID0gdGhpcy5fbGlzdE5vZGUuZ2V0SGVpZ2h0KCk7XHJcblxyXG4gICAgd3JhcC5zZXRIZWlnaHQobGlzdEhlaWdodCA8IGhlaWdodCA/IGxpc3RIZWlnaHQgOiBoZWlnaHQpO1xyXG5cclxuICAgIHNjcm9sbEJhci51cGRhdGUoKTtcclxuXHJcbiAgICBpZiAoIXNjcm9sbEJhci5pc1ZhbGlkKCkpIHtcclxuICAgICAgICBzY3JvbGxCYXIuZGlzYWJsZSgpO1xyXG4gICAgICAgIHdyYXAuc2V0SGVpZ2h0KHdyYXAuZ2V0Q2hpbGRBdCgxKS5nZXRIZWlnaHQoKSk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBzY3JvbGxCYXIuZW5hYmxlKCk7XHJcbiAgICAgICAgd3JhcC5zZXRIZWlnaHQoaGVpZ2h0KTtcclxuICAgIH1cclxufTtcclxuXHJcblBhbmVsLnByb3RvdHlwZS5fYWRkU2Nyb2xsV3JhcCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciB3cmFwTm9kZSA9IHRoaXMuX3dyYXBOb2RlLFxyXG4gICAgICAgIGxpc3ROb2RlID0gdGhpcy5fbGlzdE5vZGUsXHJcbiAgICAgICAgaGVpZ2h0ID0gYXJndW1lbnRzLmxlbmd0aCA9PSAwID9cclxuICAgICAgICAgICAgdGhpcy5nZXRNYXhIZWlnaHQoKSA6XHJcbiAgICAgICAgICAgIGFyZ3VtZW50c1swXTtcclxuXHJcbiAgICB0aGlzLl9zY3JvbGxCYXIgPSBuZXcgU2Nyb2xsQmFyKHdyYXBOb2RlLCBsaXN0Tm9kZSwgaGVpZ2h0KTtcclxuICAgIGlmICh0aGlzLmlzRW5hYmxlZCgpKXtcclxuICAgICAgICB3cmFwTm9kZS5zZXRIZWlnaHQoaGVpZ2h0KTtcclxuICAgIH1cclxufTtcclxuXHJcblBhbmVsLnByb3RvdHlwZS5oYXNTY3JvbGxXcmFwID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX3Njcm9sbEJhciAhPSBudWxsO1xyXG59O1xyXG5cclxuXHJcblBhbmVsLnByb3RvdHlwZS5wcmV2ZW50U2VsZWN0RHJhZyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGlmICghdGhpcy5oYXNTY3JvbGxXcmFwKCkpe1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHRoaXMuX3dyYXBOb2RlLmdldEVsZW1lbnQoKS5zY3JvbGxUb3AgPSAwO1xyXG59O1xyXG5cclxuUGFuZWwucHJvdG90eXBlLmVuYWJsZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuX25vZGUuc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdibG9jaycpO1xyXG4gICAgdGhpcy5fZW5hYmxlZCA9IHRydWU7XHJcbiAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XHJcbn07XHJcblxyXG5cclxuUGFuZWwucHJvdG90eXBlLmRpc2FibGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLl9ub2RlLnNldFN0eWxlUHJvcGVydHkoJ2Rpc3BsYXknLCAnbm9uZScpO1xyXG4gICAgdGhpcy5fZW5hYmxlZCA9IGZhbHNlO1xyXG4gICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xyXG59O1xyXG5cclxuUGFuZWwucHJvdG90eXBlLmlzRW5hYmxlZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLl9lbmFibGVkO1xyXG59O1xyXG5cclxuUGFuZWwucHJvdG90eXBlLmlzRGlzYWJsZWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gIXRoaXMuX2VuYWJsZWQ7XHJcbn07XHJcblxyXG5QYW5lbC5wcm90b3R5cGUuaGFzTWF4SGVpZ2h0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX2hlaWdodCAhPSBudWxsO1xyXG59O1xyXG5cclxuUGFuZWwucHJvdG90eXBlLmdldE1heEhlaWdodCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLl9oZWlnaHQ7XHJcbn07XHJcblxyXG5QYW5lbC5wcm90b3R5cGUuaXNEb2NrZWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fZG9jaztcclxufTtcclxuXHJcblBhbmVsLnByb3RvdHlwZS5pc0ZpeGVkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX2ZpeGVkO1xyXG59O1xyXG5cclxuUGFuZWwucHJvdG90eXBlLmdldEdyb3VwcyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLl9ncm91cHM7XHJcbn07XHJcblxyXG5QYW5lbC5wcm90b3R5cGUuZ2V0Tm9kZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLl9ub2RlO1xyXG59O1xyXG5cclxuUGFuZWwucHJvdG90eXBlLmdldExpc3QgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fbGlzdE5vZGU7XHJcbn07XHJcblxyXG5QYW5lbC5wcm90b3R5cGUuZ2V0V2lkdGggPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fd2lkdGg7XHJcbn07XHJcblxyXG5QYW5lbC5wcm90b3R5cGUuZ2V0UG9zaXRpb24gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fcG9zaXRpb247XHJcbn07XHJcblxyXG5QYW5lbC5wcm90b3R5cGUuZ2V0UGFyZW50ID0gZnVuY3Rpb24oKXtcclxuICAgIHJldHVybiB0aGlzLl9wYXJlbnQ7XHJcbn07XHJcblxyXG4vKipcclxuICogQWRkcyBhIG5ldyBHcm91cCB0byB0aGUgUGFuZWwuXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBbcGFyYW1zXSAtIEdyb3VwIG9wdGlvbnNcclxuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9JyddIC0gVGhlIEdyb3VwIGxhYmVsIHN0cmluZ1xyXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtwYXJhbXMudXNlTGFiZWw9dHJ1ZV0gLSBUcmlnZ2VyIHdoZXRoZXIgYWxsIGNvbnRhaW5lZCBTdWJHcm91cHMgYW5kIENvbXBvbmVudHMgc2hvdWxkIHVzZSBsYWJlbHNcclxuICogQHBhcmFtIHtCb29sZWFufSBbcGFyYW1zLmVuYWJsZT10cnVlXSAtIERlZmluZXMgaW5pdGlhbCBzdGF0ZSBvcGVuIC8gY2xvc2VkXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBbcGFyYW1zLmhlaWdodD1udWxsXSAtIERlZmluZXMgaWYgdGhlIGhlaWdodCBvZiB0aGUgR3JvdXAgc2hvdWxkIGJlIGNvbnN0cmFpbmVkIHRvIGNlcnRhaW4gaGVpZ2h0XHJcbiAqIEByZXR1cm5zIHtQYW5lbH1cclxuICovXHJcblxyXG5QYW5lbC5wcm90b3R5cGUuYWRkR3JvdXAgPSBmdW5jdGlvbiAocGFyYW1zKSB7XHJcbiAgICB2YXIgZ3JvdXAgPSBuZXcgR3JvdXAodGhpcywgcGFyYW1zKTtcclxuICAgIHRoaXMuX2dyb3Vwcy5wdXNoKGdyb3VwKTtcclxuICAgIGlmICh0aGlzLmlzRG9ja2VkKCkpe1xyXG4gICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIFBhbmVsRXZlbnQuUEFORUxfU0laRV9DSEFOR0UpKTtcclxuICAgIH1cclxuICAgIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFkZHMgYSBuZXcgU3ViR3JvdXAgdG8gdGhlIGxhc3QgYWRkZWQgR3JvdXAuXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBbcGFyYW1zXSAtIFN1Ykdyb3VwIG9wdGlvbnNcclxuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9JyddIC0gVGhlIFN1Ykdyb3VwIGxhYmVsIHN0cmluZ1xyXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtwYXJhbXMudXNlTGFiZWw9dHJ1ZV0gLSBUcmlnZ2VyIHdoZXRoZXIgYWxsIENvbXBvbmVudHMgc2hvdWxkIHVzZSBsYWJlbHNcclxuICogQHBhcmFtIHtCb29sZWFufSBbcGFyYW1zLmVuYWJsZT10cnVlXSAtIERlZmluZXMgaW5pdGlhbCBzdGF0ZSBvcGVuIC8gY2xvc2VkXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBbcGFyYW1zLmhlaWdodD1udWxsXSAtIERlZmluZXMgaWYgdGhlIGhlaWdodCBvZiB0aGUgU3ViR3JvdXAgc2hvdWxkIGJlIGNvbnN0cmFpbmVkIHRvIGNlcnRhaW4gaGVpZ2h0XHJcbiAqIEByZXR1cm5zIHtQYW5lbH1cclxuICovXHJcblxyXG5QYW5lbC5wcm90b3R5cGUuYWRkU3ViR3JvdXAgPSBmdW5jdGlvbihwYXJhbXMpe1xyXG4gICAgdmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcztcclxuICAgIGlmKGdyb3Vwcy5sZW5ndGggPT0gMCl7XHJcbiAgICAgICAgdGhpcy5hZGRHcm91cCgpO1xyXG4gICAgfVxyXG4gICAgZ3JvdXBzW2dyb3Vwcy5sZW5ndGggLSAxXS5hZGRTdWJHcm91cChwYXJhbXMpO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG5QYW5lbC5wcm90b3R5cGUuX2FkZENvbXBvbmVudCA9IGZ1bmN0aW9uKCl7XHJcbiAgICB2YXIgZ3JvdXBzID0gdGhpcy5fZ3JvdXBzLFxyXG4gICAgICAgIGdyb3VwO1xyXG4gICAgaWYoZ3JvdXBzLmxlbmd0aCA9PSAwKXtcclxuICAgICAgICBncm91cHMucHVzaChuZXcgR3JvdXAodGhpcykpO1xyXG4gICAgfVxyXG4gICAgZ3JvdXAgPSBncm91cHNbZ3JvdXBzLmxlbmd0aC0xXTtcclxuXHJcbiAgICBncm91cC5hZGRDb21wb25lbnQuYXBwbHkoZ3JvdXAsYXJndW1lbnRzKTtcclxuICAgIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFkZHMgYSBuZXcgU3RyaW5nSW5wdXQgdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cclxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCAtIFRoZSBvYmplY3RcclxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIC0gVGhlIHByb3BlcnR5IGtleVxyXG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBTdHJpbmdJbnB1dCBvcHRpb25zXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmxhYmVsPXZhbHVlXSAtIFN0cmluZ0lucHV0IGxhYmVsXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtwYXJhbXMub25DaGFuZ2VdIC0gQ2FsbGJhY2sgb24gY2hhbmdlXHJcbiAqIEBwYXJhbSB7QXJyYXl9IFtwYXJhbXMucHJlc2V0c10gLSBBIHNldCBvZiBwcmVzZXRzXHJcbiAqIEByZXR1cm5zIHtQYW5lbH1cclxuICovXHJcblxyXG5QYW5lbC5wcm90b3R5cGUuYWRkU3RyaW5nSW5wdXQgPSBmdW5jdGlvbiAob2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KFN0cmluZ0lucHV0LG9iamVjdCx2YWx1ZSxwYXJhbXMpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFkZHMgYSBuZXcgTnVtYmVySW5wdXQgdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cclxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCAtIFRoZSBvYmplY3QuXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSAtIFRoZSBwcm9wZXJ0eSBrZXkuXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBbcGFyYW1zXSAtIENvbXBvbmVudCBvcHRpb25zLlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy5sYWJlbD12YWx1ZV0gLSBOdW1iZXJJbnB1dCBsYWJlbFxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbcGFyYW1zLm9uQ2hhbmdlXSAtIENhbGxiYWNrIG9uIGNoYW5nZVxyXG4gKiBAcGFyYW0ge051bWJlcn0gW3BhcmFtcy5zdGVwXSAtIEFtb3VudCBzdWJiZWQvYWRkZWQgb24gYXJyb3dEb3duL2Fycm93VXAgcHJlc3NcclxuICogQHBhcmFtIHtOdW1iZXJ9IFtwYXJhbXMuZHBdIC0gRGVjaW1hbCBwbGFjZXMgZGlzcGxheWVkXHJcbiAqIEBwYXJhbSB7QXJyYXl9IFtwYXJhbXMucHJlc2V0c10gLSBBIHNldCBvZiBwcmVzZXRzXHJcbiAqIEByZXR1cm5zIHtQYW5lbH1cclxuICovXHJcblxyXG5QYW5lbC5wcm90b3R5cGUuYWRkTnVtYmVySW5wdXQgPSBmdW5jdGlvbiAob2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KE51bWJlcklucHV0LG9iamVjdCx2YWx1ZSxwYXJhbXMpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFkZHMgYSBuZXcgUmFuZ2UgaW5wdXQgdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cclxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCAtIFRoZSBvYmplY3RcclxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIC0gVGhlIHByb3BlcnR5IGtleVxyXG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9uc1xyXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy5sYWJlbD12YWx1ZV0gLSBSYW5nZSBsYWJlbFxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbcGFyYW1zLm9uQ2hhbmdlXSAtIENhbGxiYWNrIG9uIGNoYW5nZVxyXG4gKiBAcGFyYW0ge051bWJlcn0gW3BhcmFtcy5zdGVwXSAtIEFtb3VudCBzdWJiZWQvYWRkZWQgb24gYXJyb3dEb3duL2Fycm93VXAgcHJlc3NcclxuICogQHBhcmFtIHtOdW1iZXJ9IFtwYXJhbXMuZHBdIC0gRGVjaW1hbCBwbGFjZXMgZGlzcGxheWVkXHJcbiAqIEByZXR1cm5zIHtQYW5lbH1cclxuICovXHJcblxyXG5QYW5lbC5wcm90b3R5cGUuYWRkUmFuZ2UgPSBmdW5jdGlvbiAob2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KFJhbmdlLG9iamVjdCx2YWx1ZSxwYXJhbXMpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFkZHMgYSBuZXcgQ2hlY2tib3ggdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cclxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCAtIFRoZSBvYmplY3RcclxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIC0gVGhlIHByb3BlcnR5IGtleVxyXG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9uc1xyXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy5sYWJlbD12YWx1ZV0gLSBDaGVja2JveCBsYWJlbFxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbcGFyYW1zLm9uQ2hhbmdlXSAtIENhbGxiYWNrIG9uIGNoYW5nZVxyXG4gKiBAcmV0dXJucyB7UGFuZWx9XHJcbiAqL1xyXG5cclxuUGFuZWwucHJvdG90eXBlLmFkZENoZWNrYm94ID0gZnVuY3Rpb24gKG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xyXG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChDaGVja2JveCxvYmplY3QsdmFsdWUscGFyYW1zKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBZGRzIGEgbmV3IENvbG9yIG1vZGlmaWVyIHRvIGxhc3QgYWRkZWQgU3ViR3JvdXAuXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBUaGUgb2JqZWN0XHJcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSAtIFRoZSBwcm9wZXJ0eSBrZXlcclxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnNcclxuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9dmFsdWVdIC0gQ29sb3IgbGFiZWxcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gW3BhcmFtcy5vbkNoYW5nZV0gLSBDYWxsYmFjayBvbiBjaGFuZ2VcclxuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMuY29sb3JNb2RlPSdyZ2InXSAtIFRoZSBjb2xvck1vZGUgdG8gYmUgdXNlZDogJ2hleCcgI2ZmMDBmZiwgJ3JnYicgWzI1NSwwLDI1NV0sICdyZ2JmdicgWzEsMCwxXVxyXG4gKiBAcGFyYW0ge0FycmF5fSBbcGFyYW1zLnByZXNldHNdIC0gQSBzZXQgb2YgcHJlc2V0IGNvbG9ycyBtYXRjaGluZyBwYXJhbXMuY29sb3JNb2RlXHJcbiAqIEByZXR1cm5zIHtQYW5lbH1cclxuICovXHJcblxyXG5QYW5lbC5wcm90b3R5cGUuYWRkQ29sb3IgPSBmdW5jdGlvbiAob2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KENvbG9yLG9iamVjdCx2YWx1ZSwgcGFyYW1zKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBZGRzIGEgbmV3IEJ1dHRvbiB0byBsYXN0IGFkZGVkIFN1Ykdyb3VwLlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gbGFiZWwgLSBUaGUgb2JqZWN0XHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IG9uUHJlc3MgLSBDYWxsYmFja1xyXG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9uc1xyXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy5sYWJlbD12YWx1ZV0gLSBCdXR0b24gbGFiZWxcclxuICogQHJldHVybnMge1BhbmVsfVxyXG4gKi9cclxuXHJcblBhbmVsLnByb3RvdHlwZS5hZGRCdXR0b24gPSBmdW5jdGlvbiAobGFiZWwsIG9uUHJlc3MsIHBhcmFtcykge1xyXG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChCdXR0b24sbGFiZWwsb25QcmVzcyxwYXJhbXMpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFkZHMgYSBuZXcgU2VsZWN0IHRvIGxhc3QgYWRkZWQgU3ViR3JvdXAuXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBUaGUgb2JqZWN0XHJcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSAtIFRoZSBwcm9wZXJ0eSBrZXlcclxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnNcclxuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9dmFsdWVdIC0gQnV0dG9uIGxhYmVsXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtwYXJhbXMub25DaGFuZ2VdIC0gQ2FsbGJhY2sgb24gY2hhbmdlIC0gZnVuY3Rpb24oaW5kZXgpe31cclxuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMudGFyZ2V0XSAtIFRoZSBwcm9wZXJ0eSB0byBiZSBzZXQgb24gc2VsZWN0XHJcbiAqIEByZXR1cm5zIHtQYW5lbH1cclxuICovXHJcblxyXG5QYW5lbC5wcm90b3R5cGUuYWRkU2VsZWN0ID0gZnVuY3Rpb24gKG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xyXG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChTZWxlY3Qsb2JqZWN0LHZhbHVlLHBhcmFtcyk7XHJcbn07XHJcblxyXG4vKipcclxuICogQWRkcyBhIG5ldyBTbGlkZXIgdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cclxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCAtIFRoZSBvYmplY3RcclxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIC0gVGhlIHByb3BlcnR5IGtleVxyXG4gKiBAcGFyYW0ge1N0cmluZ30gcmFuZ2UgLSBUaGUgbWluL21heCBhcnJheSBrZXkgdG8gYmUgdXNlZFxyXG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9uc1xyXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy5sYWJlbD12YWx1ZV0gLSBTbGlkZXIgbGFiZWxcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gW3BhcmFtcy5vbkNoYW5nZV0gLSBDYWxsYmFjayBvbiBjaGFuZ2VcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gW3BhcmFtcy5vbkZpbmlzaF0gLSBDYWxsYmFjayBvbiBmaW5pc2hcclxuICogQHBhcmFtIHtOdW1iZXJ9IFtwYXJhbXMuc3RlcF0gLSBBbW91bnQgc3ViYmVkL2FkZGVkIG9uIGFycm93RG93bi9hcnJvd1VwIHByZXNzIGluc2lkZSB0aGUgaW5wdXRcclxuICogQHBhcmFtIHtOdW1iZXJ9IFtwYXJhbXMuZHBdIC0gRGVjaW1hbCBwbGFjZXMgZGlzcGxheWVkXHJcbiAqIEByZXR1cm5zIHtQYW5lbH1cclxuICovXHJcblxyXG5QYW5lbC5wcm90b3R5cGUuYWRkU2xpZGVyID0gZnVuY3Rpb24gKG9iamVjdCwgdmFsdWUsIHJhbmdlLCBwYXJhbXMpIHtcclxuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoU2xpZGVyLG9iamVjdCx2YWx1ZSxyYW5nZSxwYXJhbXMpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFkZHMgYSBuZXcgRnVuY3Rpb25QbG90dGVyIHRvIGxhc3QgYWRkZWQgU3ViR3JvdXAuXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBUaGUgb2JqZWN0XHJcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSAtIFRoZSBwcm9wZXJ0eSBrZXkgLSBmKHgpLCBmKHgseSlcclxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnNcclxuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9dmFsdWVdIC0gRnVuY3Rpb25QbG90dGVyIGxhYmVsXHJcbiAqIEByZXR1cm5zIHtQYW5lbH1cclxuICovXHJcblxyXG5QYW5lbC5wcm90b3R5cGUuYWRkRnVuY3Rpb25QbG90dGVyID0gZnVuY3Rpb24gKG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xyXG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChGdW5jdGlvblBsb3R0ZXIsb2JqZWN0LHZhbHVlLHBhcmFtcyk7XHJcbn07XHJcblxyXG4vKipcclxuICogQWRkcyBhIG5ldyBYWS1QYWQgdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cclxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCAtIFRoZSBvYmplY3RcclxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIC0gVGhlIHByb3BlcnR5IGtleVxyXG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9uc1xyXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy5sYWJlbD12YWx1ZV0gLSBQYWQgbGFiZWxcclxuICogQHJldHVybnMge1BhbmVsfVxyXG4gKi9cclxuXHJcblBhbmVsLnByb3RvdHlwZS5hZGRQYWQgPSBmdW5jdGlvbiAob2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KFBhZCxvYmplY3QsdmFsdWUscGFyYW1zKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBZGRzIGEgbmV3IFZhbHVlUGxvdHRlciB0byBsYXN0IGFkZGVkIFN1Ykdyb3VwLlxyXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IC0gVGhlIG9iamVjdFxyXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgLSBUaGUgcHJvcGVydHkga2V5XHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBbcGFyYW1zXSAtIENvbXBvbmVudCBvcHRpb25zXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmxhYmVsPXZhbHVlXSAtIFBsb3R0ZXIgbGFiZWxcclxuICogQHBhcmFtIHtOdW1iZXJ9IFtwYXJhbXMuaGVpZ2h0XSAtIFBsb3R0ZXIgaGVpZ2h0XHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBbcGFyYW1zLnJlc29sdXRpb25dIC0gR3JhcGggcmVzb2x1dGlvblxyXG4gKiBAcmV0dXJucyB7UGFuZWx9XHJcbiAqL1xyXG5cclxuUGFuZWwucHJvdG90eXBlLmFkZFZhbHVlUGxvdHRlciA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcclxuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoVmFsdWVQbG90dGVyLG9iamVjdCx2YWx1ZSxwYXJhbXMpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFkZHMgYSBuZXcgTnVtYmVyT3V0cHV0IHRvIGxhc3QgYWRkZWQgU3ViR3JvdXAuXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBUaGUgb2JqZWN0XHJcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSAtIFRoZSBwcm9wZXJ0eSBrZXlcclxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnNcclxuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9dmFsdWVdIC0gT3V0cHV0IGxhYmVsXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBbcGFyYW1zLmRwXSAtIERlY2ltYWwgcGxhY2VzIGRpc3BsYXllZFxyXG4gKiBAcmV0dXJucyB7UGFuZWx9XHJcbiAqL1xyXG5cclxuUGFuZWwucHJvdG90eXBlLmFkZE51bWJlck91dHB1dCA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcclxuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoTnVtYmVyT3V0cHV0LG9iamVjdCx2YWx1ZSxwYXJhbXMpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFkZHMgYSBuZXcgU3RyaW5nT3V0cHV0IHRvIGxhc3QgYWRkZWQgU3ViR3JvdXAuXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBUaGUgb2JqZWN0XHJcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSAtIFRoZSBwcm9wZXJ0eSBrZXlcclxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnNcclxuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9dmFsdWVdIC0gT3V0cHV0IGxhYmVsXHJcbiAqIEByZXR1cm5zIHtQYW5lbH1cclxuICovXHJcblxyXG5QYW5lbC5wcm90b3R5cGUuYWRkU3RyaW5nT3V0cHV0ID0gZnVuY3Rpb24gKG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xyXG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChTdHJpbmdPdXRwdXQsb2JqZWN0LHZhbHVlLHBhcmFtcyk7XHJcbn07XHJcblxyXG5QYW5lbC5wcm90b3R5cGUuYWRkQ2FudmFzID0gZnVuY3Rpb24gKHBhcmFtcykge1xyXG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChDYW52YXNfLHBhcmFtcyk7XHJcbn07XHJcblxyXG5QYW5lbC5wcm90b3R5cGUuYWRkU1ZHID0gZnVuY3Rpb24gKHBhcmFtcykge1xyXG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChTVkdfLHBhcmFtcyk7XHJcbn07XHJcblxyXG5QYW5lbC5wcm90b3R5cGUuc2V0RGF0YSA9IGZ1bmN0aW9uKGRhdGEpe1xyXG4gICAgdmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcyxcclxuICAgICAgICBpID0gLTEsIGwgPSBncm91cHMubGVuZ3RoO1xyXG4gICAgd2hpbGUoKytpIDwgbCl7XHJcbiAgICAgICAgZ3JvdXBzW2ldLnNldERhdGEoZGF0YVtpXSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5QYW5lbC5wcm90b3R5cGUuZ2V0RGF0YSA9IGZ1bmN0aW9uKCl7XHJcbiAgICB2YXIgZ3JvdXBzID0gdGhpcy5fZ3JvdXBzLFxyXG4gICAgICAgIGkgPSAtMSwgbCA9IGdyb3Vwcy5sZW5ndGg7XHJcbiAgICB2YXIgZGF0YSA9IFtdO1xyXG4gICAgd2hpbGUoKytpICA8IGwpe1xyXG4gICAgICAgIGRhdGEucHVzaChncm91cHNbaV0uZ2V0RGF0YSgpKTtcclxuICAgIH1cclxuICAgIHJldHVybiBkYXRhO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBQYW5lbDsiLCJ2YXIgUGFuZWxFdmVudCA9IHtcclxuXHRQQU5FTF9NT1ZFX0JFR0lOICAgICAgICAgIDogJ3BhbmVsTW92ZUJlZ2luJyxcclxuXHRQQU5FTF9NT1ZFICAgICAgICAgICAgICAgIDogJ3BhbmVsTW92ZScsXHJcblx0UEFORUxfTU9WRV9FTkQgICAgICAgICAgICA6ICdwYW5lbE1vdmVFbmQnLFxyXG5cclxuXHRQQU5FTF9TSE9XICAgICAgICAgICAgICAgIDogJ3BhbmVsU2hvdycsXHJcblx0UEFORUxfSElERSAgICAgICAgICAgICAgICA6ICdwYW5lbEhpZGUnLFxyXG5cclxuXHRQQU5FTF9TQ1JPTExfV1JBUF9BRERFRCAgIDogJ3BhbmVsU2Nyb2xsV3JhcEFkZGVkJyxcclxuXHRQQU5FTF9TQ1JPTExfV1JBUF9SRU1PVkVEIDogJ3BhbmVsU2Nyb2xsV3JhcFJlbW92ZWQnLFxyXG5cclxuXHRQQU5FTF9TSVpFX0NIQU5HRSAgICAgICAgOiAncGFuZWxTaXplQ2hhbmdlJ1xyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IFBhbmVsRXZlbnQ7IiwidmFyIEFic3RyYWN0R3JvdXAgPSByZXF1aXJlKCcuL0Fic3RyYWN0R3JvdXAnKTtcclxudmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcclxudmFyIENTUyAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xyXG5cclxudmFyIEV2ZW50XyAgICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxyXG4gICAgRG9jdW1lbnRFdmVudCAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcclxuICAgIFBhbmVsRXZlbnQgICAgID0gcmVxdWlyZSgnLi9QYW5lbEV2ZW50JyksXHJcbiAgICBHcm91cEV2ZW50ICAgICA9IHJlcXVpcmUoJy4vR3JvdXBFdmVudCcpLFxyXG4gICAgQ29tcG9uZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL0NvbXBvbmVudEV2ZW50Jyk7XHJcblxyXG5mdW5jdGlvbiBTdWJHcm91cChwYXJlbnQscGFyYW1zKXtcclxuICAgIHBhcmFtcyAgICAgICAgICAgID0gcGFyYW1zICAgICAgICAgIHx8IHt9O1xyXG4gICAgcGFyYW1zLmxhYmVsICAgICAgPSBwYXJhbXMubGFiZWwgICAgfHwgbnVsbDtcclxuICAgIHBhcmFtcy51c2VMYWJlbHMgID0gcGFyYW1zLnVzZUxhYmVscyAgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBwYXJhbXMudXNlTGFiZWxzO1xyXG5cclxuICAgIEFic3RyYWN0R3JvdXAuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xyXG5cclxuICAgIHZhciByb290Tm9kZSA9IHRoaXMuX25vZGUsXHJcbiAgICAgICAgd3JhcE5vZGUgPSB0aGlzLl93cmFwTm9kZSxcclxuICAgICAgICBsaXN0Tm9kZSA9IHRoaXMuX2xpc3ROb2RlO1xyXG5cclxuICAgICAgICByb290Tm9kZS5zZXRTdHlsZUNsYXNzKENTUy5TdWJHcm91cCk7XHJcbiAgICAgICAgd3JhcE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCk7XHJcblxyXG4gICAgICAgIHdyYXBOb2RlLmFkZENoaWxkKGxpc3ROb2RlKTtcclxuICAgICAgICByb290Tm9kZS5hZGRDaGlsZCh3cmFwTm9kZSk7XHJcblxyXG4gICAgdGhpcy5fdXNlTGFiZWxzICA9IHBhcmFtcy51c2VMYWJlbHM7XHJcblxyXG4gICAgdmFyIGxhYmVsID0gcGFyYW1zLmxhYmVsO1xyXG5cclxuICAgIGlmIChsYWJlbCAmJiBsYWJlbC5sZW5ndGggIT0gMCAmJiBsYWJlbCAhPSAnbm9uZScpIHtcclxuICAgICAgICB2YXIgaGVhZE5vZGUgPSB0aGlzLl9oZWFkTm9kZSA9IG5ldyBOb2RlKCksXHJcbiAgICAgICAgICAgIGxhYmxXcmFwID0gbmV3IE5vZGUoKSxcclxuICAgICAgICAgICAgbGFibE5vZGUgPSBuZXcgTm9kZShOb2RlLlNQQU4pO1xyXG5cclxuICAgICAgICBoZWFkTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5IZWFkKTtcclxuICAgICAgICBsYWJsV3JhcC5zZXRTdHlsZUNsYXNzKENTUy5XcmFwKTtcclxuICAgICAgICBsYWJsTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCk7XHJcblxyXG4gICAgICAgIGxhYmxOb2RlLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCBsYWJlbCk7XHJcblxyXG4gICAgICAgIGxhYmxXcmFwLmFkZENoaWxkKGxhYmxOb2RlKTtcclxuICAgICAgICBoZWFkTm9kZS5hZGRDaGlsZChsYWJsV3JhcCk7XHJcblxyXG5cclxuICAgICAgICB2YXIgaW5kaU5vZGUgPSB0aGlzLl9pbmRpTm9kZSA9IG5ldyBOb2RlKCk7XHJcbiAgICAgICAgaW5kaU5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQXJyb3dCU3ViTWF4KTtcclxuICAgICAgICBoZWFkTm9kZS5hZGRDaGlsZEF0KGluZGlOb2RlLCAwKTtcclxuXHJcbiAgICAgICAgcm9vdE5vZGUuYWRkQ2hpbGRBdChoZWFkTm9kZSwgMCk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LlNVQkdST1VQX1RSSUdHRVIsIHRoaXMuX3BhcmVudCwgJ29uU3ViR3JvdXBUcmlnZ2VyJyk7XHJcbiAgICAgICAgaGVhZE5vZGUuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uSGVhZE1vdXNlRG93bi5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICAgICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBpZih0aGlzLmhhc01heEhlaWdodCgpKXtcclxuICAgICAgICB0aGlzLmFkZFNjcm9sbFdyYXAoKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LlNVQkdST1VQX0VOQUJMRSwgIHRoaXMsICdvbkVuYWJsZScpO1xyXG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5TVUJHUk9VUF9ESVNBQkxFLCB0aGlzLCAnb25EaXNhYmxlJyk7XHJcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihQYW5lbEV2ZW50LlBBTkVMX01PVkVfRU5ELCAgIHRoaXMsICdvblBhbmVsTW92ZUVuZCcpO1xyXG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSx0aGlzLCAnb25Hcm91cFNpemVDaGFuZ2UnKTtcclxuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKFBhbmVsRXZlbnQuUEFORUxfU0laRV9DSEFOR0UsdGhpcywgJ29uUGFuZWxTaXplQ2hhbmdlJyk7XHJcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50LldJTkRPV19SRVNJWkUsICAgIHRoaXMsICdvbldpbmRvd1Jlc2l6ZScpO1xyXG5cclxuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LkdST1VQX1NJWkVfVVBEQVRFLHRoaXMuX3BhcmVudCwnb25Hcm91cFNpemVVcGRhdGUnKTtcclxufVxyXG5TdWJHcm91cC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEFic3RyYWN0R3JvdXAucHJvdG90eXBlKTtcclxuU3ViR3JvdXAucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU3ViR3JvdXA7XHJcblxyXG4vL0ZJWE1FXHJcblN1Ykdyb3VwLnByb3RvdHlwZS5fb25IZWFkTW91c2VEb3duID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5fZW5hYmxlZCA9ICF0aGlzLl9lbmFibGVkO1xyXG4gICAgdGhpcy5fb25UcmlnZ2VyKCk7XHJcblxyXG4gICAgdmFyIGV2ZW50ID0gRG9jdW1lbnRFdmVudC5NT1VTRV9VUCxcclxuICAgICAgICBzZWxmICA9IHRoaXM7XHJcbiAgICB2YXIgb25Eb2N1bWVudE1vdXNlVXAgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgc2VsZi5fb25UcmlnZ2VyKCk7XHJcbiAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudCwgb25Eb2N1bWVudE1vdXNlVXApO1xyXG4gICAgfTtcclxuXHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50LG9uRG9jdW1lbnRNb3VzZVVwKTtcclxufTtcclxuXHJcblN1Ykdyb3VwLnByb3RvdHlwZS5fb25UcmlnZ2VyID0gZnVuY3Rpb24oKSB7XHJcbiAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XHJcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLEdyb3VwRXZlbnQuU1VCR1JPVVBfVFJJR0dFUixudWxsKSk7XHJcbn07XHJcblxyXG5cclxuU3ViR3JvdXAucHJvdG90eXBlLl91cGRhdGVBcHBlYXJhbmNlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgaWYgKHRoaXMuaXNEaXNhYmxlZCgpKSB7XHJcbiAgICAgICAgdGhpcy5fd3JhcE5vZGUuc2V0SGVpZ2h0KDApO1xyXG4gICAgICAgIGlmICh0aGlzLmhhc0xhYmVsKCkpIHtcclxuICAgICAgICAgICAgdGhpcy5faGVhZE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuSGVhZEluYWN0aXZlKTtcclxuICAgICAgICAgICAgdGhpcy5faW5kaU5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQXJyb3dCU3ViTWluKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBpZiAodGhpcy5oYXNNYXhIZWlnaHQoKSkge1xyXG4gICAgICAgICAgICB0aGlzLl93cmFwTm9kZS5zZXRIZWlnaHQodGhpcy5nZXRNYXhIZWlnaHQoKSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5fd3JhcE5vZGUuZGVsZXRlU3R5bGVQcm9wZXJ0eSgnaGVpZ2h0Jyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0aGlzLmhhc0xhYmVsKCkpIHtcclxuICAgICAgICAgICAgdGhpcy5faGVhZE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuSGVhZCk7XHJcbiAgICAgICAgICAgIHRoaXMuX2luZGlOb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkFycm93QlN1Yk1heCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59O1xyXG5cclxuU3ViR3JvdXAucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGlmICh0aGlzLmhhc01heEhlaWdodCgpKXtcclxuICAgICAgICB0aGlzLl9zY3JvbGxCYXIudXBkYXRlKCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5TdWJHcm91cC5wcm90b3R5cGUub25Db21wb25lbnRTZWxlY3REcmFnID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5wcmV2ZW50U2VsZWN0RHJhZygpO1xyXG59O1xyXG5cclxuU3ViR3JvdXAucHJvdG90eXBlLm9uRW5hYmxlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgaWYgKHRoaXMuaXNEaXNhYmxlZCgpKXtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBDb21wb25lbnRFdmVudC5FTkFCTEUsIG51bGwpKTtcclxufTtcclxuU3ViR3JvdXAucHJvdG90eXBlLm9uRGlzYWJsZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGlmICh0aGlzLmlzRGlzYWJsZWQoKSl7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuRElTQUJMRSwgbnVsbCkpO1xyXG59O1xyXG5cclxuLy9idWJibGVcclxuU3ViR3JvdXAucHJvdG90eXBlLm9uR3JvdXBTaXplQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSwgbnVsbCkpO1xyXG59O1xyXG5TdWJHcm91cC5wcm90b3R5cGUub25Hcm91cFNpemVVcGRhdGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBHcm91cEV2ZW50LkdST1VQX1NJWkVfVVBEQVRFLCBudWxsKSk7XHJcbn07XHJcblN1Ykdyb3VwLnByb3RvdHlwZS5vblBhbmVsTW92ZUVuZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIFBhbmVsRXZlbnQuUEFORUxfTU9WRV9FTkQsIG51bGwpKTtcclxufTtcclxuU3ViR3JvdXAucHJvdG90eXBlLm9uUGFuZWxTaXplQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xyXG59O1xyXG5TdWJHcm91cC5wcm90b3R5cGUub25XaW5kb3dSZXNpemUgPSBmdW5jdGlvbiAoZSkge1xyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KGUpO1xyXG59O1xyXG5cclxuU3ViR3JvdXAucHJvdG90eXBlLmhhc0xhYmVsID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX2hlYWROb2RlICE9IG51bGw7XHJcbn07XHJcblN1Ykdyb3VwLnByb3RvdHlwZS5hZGRDb21wb25lbnROb2RlID0gZnVuY3Rpb24gKG5vZGUpIHtcclxuICAgIHRoaXMuX2xpc3ROb2RlLmFkZENoaWxkKG5vZGUpO1xyXG59O1xyXG5TdWJHcm91cC5wcm90b3R5cGUudXNlc0xhYmVscyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLl91c2VMYWJlbHM7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFN1Ykdyb3VwOyJdfQ==
