(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.ControlKit = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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
    NumberOutput = require('./component/NumberOutput'),
    Slider = require('./component/Slider'),
    Select = require('./component/Select');

var DEFAULT_HISTORY = false,
    DEFAULT_OPACITY = 1.0,
    DEFAULT_PANELS_CLOSABLE = false,
    DEFAULT_ENABLE = true,
    DEFAULT_FULL = false,
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
    options.full             = options.full === undefined ? DEFAULT_FULL : options.full;

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
    if (options.full) node.setStyleClass('full');

    this._node = node;
    this._panels = [];
    this._enabled = options.enable;
    this._historyEnabled = options.history;
    this._statesEnabled = options.loadAndSave;
    this._panelsClosable = options.panelsClosable;
    this._full = options.full;

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
                if (component instanceof Slider ||
                    component instanceof Select) {
                    component.onValueUpdate({ data: { origin: null }});
                }
            }
        }
    }
};

/**
 * Return the first component found with a given key or label.
 * @param {Object} [params] - Options
 * @param {String} [params.label] - Label
 * @param {String} [params.key] - Key
  */
ControlKit.prototype.getComponentBy = function (params) {
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

        groups = panel.getGroups();
        j = -1; m = groups.length;

        while (++j < m) {
            components = groups[j].getComponents();
            k = -1; n = components.length;

            while (++k < n) {
                component = components[k];
                if (!component) continue;

                if (component._key === params.key) return component;
                
                if (!component._lablNode) continue;
                if (component._lablNode._element.innerText === params.label) return component;
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
},{"./component/NumberOutput":15,"./component/Options":16,"./component/Picker":19,"./component/Select":24,"./component/Slider":25,"./component/StringInput":27,"./component/StringOutput":28,"./component/ValuePlotter":29,"./core/ComponentEvent":31,"./core/History":33,"./core/HistoryEvent":34,"./core/State":38,"./core/document/CSS":42,"./core/document/DocumentEvent":43,"./core/document/Mouse":44,"./core/document/Node":45,"./core/document/NodeEvent":46,"./core/document/Style":47,"./core/event/Event":48,"./core/event/EventDispatcher":49,"./group/MenuEvent":55,"./group/Panel":56}],3:[function(require,module,exports){
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
    params.label = params.label || '';

    Component.apply(this,[parent,params.label]);

    var wrap = this._wrapNode;
        wrap.setStyleClass(CSS.CanvasWrap);
    var canvas = this._canvas = document.createElement('canvas');
        wrap.getElement().appendChild(canvas);

    var width = wrap.getWidth();
    var height = params.height || width;
    this._canvasWidth = width;
    this._canvasHeight = height;
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

Canvas.prototype._redraw = function(){};

Canvas.prototype.onGroupSizeChange = function () {
    var width = this._wrapNode.getWidth();

    this._setCanvasSize(width);
    this._updateHeight();
    this._redraw();

    this.dispatchEvent(new Event_(this, GroupEvent.GROUP_SIZE_UPDATE, null));
};

Canvas.prototype._setCanvasSize = function (width, height) {
    var canvasWidth = width;
    var canvasHeight = (height) ? height : this._canvasHeight;

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
        rootNode.setPositionGlobal(rootPosX, rootPosY + 2);

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
	string : "#controlKit{position:absolute;top:0;right:0;width:100%;-webkit-touch-callout:none;-webkit-user-select:none;-khtml-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;pointer-events:none}#controlKit.full{height:100%}#controlKit .panel{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;pointer-events:auto;position:relative;z-index:1;-webkit-touch-callout:none;-webkit-user-select:none;-khtml-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;overflow:hidden;opacity:1;float:left;height:100%;width:200px;border-radius:3px;-moz-border-radius:3px;box-shadow:0 2px 2px rgba(0,0,0,.25);margin:0;padding:0;background-color:#1A1A1A;font-family:monospace}#controlKit .panel .wrap{width:auto;height:auto;margin:0;padding:0;position:relative;overflow:hidden}#controlKit .panel ul{margin:0;padding:0;list-style:none}#controlKit .panel .color,#controlKit .panel input[type=text],#controlKit .panel textarea,#controlKit .picker input[type=text]{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;width:100%;height:18px;padding:0 0 0 8px;font-family:monospace;font-size:11px;color:#fff;text-shadow:1px 1px #000;outline:0;background:#222;border:none;box-shadow:0 0 0 1px #1F1F1F inset;border-radius:0;-moz-border-radius:0}#controlKit .panel .button,#controlKit .panel .select,#controlKit .panel .select-active,#controlKit .picker .button{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;cursor:pointer;width:100%;height:20px;margin:0;background:#333;border:none;outline:0;border-radius:0;box-shadow:0 0 0 1px #1F1F1F inset,-1px 2px 0 0 #4a4a4a inset;font-family:monospace;color:#aaa}#controlKit .panel .button{width:78%}#controlKit .panel textarea{padding:3px 8px 2px;overflow:hidden;resize:none;vertical-align:top;white-space:nowrap}#controlKit .panel .textarea-wrap{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;width:100%;padding:0;float:left;height:100%;overflow:hidden;border:none;border-radius:0;-moz-border-radius:0;background-color:#222;box-shadow:0 0 1px 2px rgba(0,0,0,.0125) inset,0 0 1px 1px #111314 inset;background-image:-o-linear-gradient(rgba(0,0,0,.075) 0,rgba(0,0,0,.125) 100%);background-image:linear-gradient(rgba(0,0,0,.075) 0,rgba(0,0,0,.125) 100%)}#controlKit .panel .textarea-wrap textarea{border:none;border-radius:0;-moz-border-radius:0;box-shadow:none;background:0 0}#controlKit .panel .textarea-wrap .scrollBar{border:1px solid #101213;border-bottom-right-radius:0;border-top-right-radius:0;border-left:none;box-shadow:0 0 1px 2px rgba(0,0,0,.0125) inset,0 0 1px 1px #111314 inset}#controlKit .panel canvas{cursor:pointer;vertical-align:bottom;border:none;box-shadow:0 0 0 1px #1F1F1F inset;border-radius:0;-moz-border-radius:0}#controlKit .panel .canvas-wrap,#controlKit .panel .svg-wrap{margin:6px 0 0;position:relative;width:70%;float:right;-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border:none;border-radius:0;-moz-border-radius:0;background:#222;background:-o-linear-gradient(rgba(0,0,0,0) 0,rgba(0,0,0,.05) 100%) #222;background:linear-gradient(rgba(0,0,0,0) 0,rgba(0,0,0,.05) 100%) #222}#controlKit .panel .canvas-wrap svg,#controlKit .panel .svg-wrap svg{position:absolute;left:0;top:0;cursor:pointer;vertical-align:bottom;border:none;box-shadow:0 0 0 1px #1F1F1F inset;border-radius:0;-moz-border-radius:0}#controlKit .panel .button,#controlKit .picker .button{font-size:11px;text-shadow:0 1px #000;text-transform:uppercase}#controlKit .panel .button:hover,#controlKit .picker .button:hover{background-image:-o-linear-gradient(#454545 0,#3b3b3b 100%);background-image:linear-gradient(#454545 0,#3b3b3b 100%)}#controlKit .panel .button:active,#controlKit .picker .button:active{background:#111}#controlKit .panel .color-with-preset-wrap,#controlKit .panel .input-with-preset-wrap{width:100%;float:left}#controlKit .panel .color-with-preset-wrap .color,#controlKit .panel .input-with-preset-wrap input[type=text]{padding-right:25px;border-top-right-radius:2px;border-bottom-right-radius:2px;float:left}#controlKit .panel .button-preset,#controlKit .panel .button-preset-active{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;position:absolute;right:0;width:20px;height:18px;margin:0;cursor:pointer;float:right;border:none;border-top-right-radius:0;border-bottom-right-radius:0;box-shadow:0 0 0 1px #1F1F1F inset,-1px 2px 0 0 #4a4a4a inset;outline:0}#controlKit .panel .button-preset-active,#controlKit .panel .button-preset:hover{background:url(data:image/png;base64,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) 50% 50% no-repeat,linear-gradient(#454545 0,#3b3b3b 100%)}#controlKit .panel .button-preset{background:url(data:image/png;base64,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) 50% 50% no-repeat,linear-gradient(#404040 0,#3b3b3b 100%)}#controlKit .panel .select,#controlKit .panel .select-active{padding-left:10px;padding-right:20px;font-size:10px;text-align:left;text-shadow:1px 1px #000;cursor:pointer;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;color:#fff;box-shadow:0 0 0 1px #1F1F1F inset,-1px -2px 0 0 #4a4a4a inset}#controlKit .panel .select{background-color:#222;background-image:url(data:image/png;base64,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Z2VSZWFkeXHJZTwAAAMhaVRYdFhNTDpjb20uYWRvYmUueG1wAAAAAAA8P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/PiA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJBZG9iZSBYTVAgQ29yZSA1LjYtYzE0MiA3OS4xNjA5MjQsIDIwMTcvMDcvMTMtMDE6MDY6MzkgICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCBDQyAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MzYzQUIyM0E3NTJCMTFFQUE1MEJEQ0U5OTk2REJGQUYiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MzYzQUIyM0I3NTJCMTFFQUE1MEJEQ0U5OTk2REJGQUYiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDozNjNBQjIzODc1MkIxMUVBQTUwQkRDRTk5OTZEQkZBRiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDozNjNBQjIzOTc1MkIxMUVBQTUwQkRDRTk5OTZEQkZBRiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PmuSAWsAAAA6SURBVHjaYvz//z8DNQATEOMy6T+pBjFi0fQfKk6SQQxohpFsCLJByIYxkhtGDGiGMVDDILIBQIABAPjUCgsOUg6IAAAAAElFTkSuQmCC);background-repeat:no-repeat;background-position:center right}#controlKit .panel .select-active,#controlKit .panel .select:hover{background-color:#333;background-image:url(data:image/png;base64,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Z2VSZWFkeXHJZTwAAAMhaVRYdFhNTDpjb20uYWRvYmUueG1wAAAAAAA8P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/PiA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJBZG9iZSBYTVAgQ29yZSA1LjYtYzE0MiA3OS4xNjA5MjQsIDIwMTcvMDcvMTMtMDE6MDY6MzkgICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCBDQyAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MzYzQUIyM0E3NTJCMTFFQUE1MEJEQ0U5OTk2REJGQUYiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MzYzQUIyM0I3NTJCMTFFQUE1MEJEQ0U5OTk2REJGQUYiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDozNjNBQjIzODc1MkIxMUVBQTUwQkRDRTk5OTZEQkZBRiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDozNjNBQjIzOTc1MkIxMUVBQTUwQkRDRTk5OTZEQkZBRiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PmuSAWsAAAA6SURBVHjaYvz//z8DNQATEOMy6T+pBjFi0fQfKk6SQQxohpFsCLJByIYxkhtGDGiGMVDDILIBQIABAPjUCgsOUg6IAAAAAElFTkSuQmCC);background-repeat:no-repeat;background-position:center right}#controlKit .panel .slider-handle,#controlKit .panel .slider-slot,#controlKit .panel .slider-wrap,#controlKit .panel .wrap-slider{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box}#controlKit .panel .wrap-slider{width:70%;padding:6px 0 0;float:right;height:100%}#controlKit .panel .wrap-slider input[type=text]{width:20%;text-align:center;padding:0;float:right}#controlKit .panel .slider-wrap{float:left;cursor:ew-resize;width:78%}#controlKit .panel .slider-slot{width:100%;height:18px;padding:4px 2px;background-color:#1e2224;border:none;box-shadow:0 0 0 1px #1F1F1F inset;border-radius:0;-moz-border-radius:0}#controlKit .panel .slider-handle{position:relative;width:100%;height:100%;background:#0000ea}#controlKit .panel .color{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;-webkit-touch-callout:none;-webkit-user-select:none;-khtml-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;cursor:pointer;width:100%;height:18px;padding:0;border:none;background:#fff;box-shadow:0 0 0 1px #111314 inset;text-align:center;line-height:18px;border-radius:0;-moz-border-radius:0}#controlKit .panel .graph-slider-x-wrap,#controlKit .panel .graph-slider-y-wrap{position:absolute;-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box}#controlKit .panel .graph-slider-x-wrap{bottom:0;left:0;width:100%;padding:6px 20px 6px 6px}#controlKit .panel .graph-slider-y-wrap{top:0;right:0;height:100%;padding:6px 6px 20px}#controlKit .panel .graph-slider-x,#controlKit .panel .graph-slider-y{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border-radius:2px;-moz-border-radius:2px;background:rgba(24,27,29,.5);border:1px solid #181b1d}#controlKit .panel .graph-slider-x{height:8px}#controlKit .panel .graph-slider-y{width:8px;height:100%}#controlKit .panel .graph-slider-x-handle,#controlKit .panel .graph-slider-y-handle{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;cursor:pointer;border:1px solid #181b1d;background:#303639}#controlKit .panel .graph-slider-x-handle{width:20px;height:100%;border-top:none;border-bottom:none}#controlKit .panel .graph-slider-y-handle{width:100%;height:20px;border-left:none;border-right:none}#controlKit .sub-group .wrap .wrap .wrap{width:25%!important;padding:0!important;float:left!important}#controlKit .sub-group .wrap .wrap .wrap .label{width:100%!important;padding:5px 0 0!important;color:#878787!important;text-align:center!important;text-transform:uppercase!important;font-weight:700!important;text-shadow:1px 1px #1a1a1a!important}#controlKit .sub-group .wrap .wrap .wrap input[type=text]{padding:0;text-align:center}#controlKit .options{pointer-events:auto;-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border:1px solid #1F1F1F;border-radius:2px;-moz-border-radius:2px;position:absolute;z-index:2147483638;left:0;top:0;width:auto;height:auto;box-shadow:0 -1px 0 0 #4a4a4a inset;background-color:#333;font-family:monospace;font-size:10px;color:#fff;overflow:hidden}#controlKit .options ul{width:100%;list-style:none;margin:0;padding:0}#controlKit .options ul li{margin:0;width:100%;height:22px;line-height:22px;padding:0 20px 0 10px;overflow:hidden;white-space:normal;text-overflow:ellipsis;cursor:pointer}#controlKit .options ul li:hover{background-color:#0000ea}#controlKit .options ul .li-selected{background-color:#222}#controlKit .options .color{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box}#controlKit .options .color .li-selected,#controlKit .options .color li{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;padding:0;height:18px;line-height:18px;text-align:center}#controlKit .options .color .li-selected:hover,#controlKit .options .color li:hover{background:0 0;font-weight:700}#controlKit .options .color .li-selected{font-weight:700}#controlKit .panel .label,#controlKit .picker .label{width:100%;float:left;font-size:10px;font-weight:700;text-shadow:0 1px #000;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;cursor:default}#controlKit .panel .head,#controlKit .panel .panel-head-inactive,#controlKit .picker .head{height:30px;padding:0 20px 0 10px;background:#1A1A1A;overflow:hidden}#controlKit .panel .head .wrap,#controlKit .panel .panel-head-inactive .wrap,#controlKit .picker .head .wrap{width:auto;height:auto;margin:0;padding:0;position:relative;overflow:hidden}#controlKit .panel .head .label,#controlKit .picker .head .label{cursor:pointer;line-height:32px;color:#65696b}#controlKit .panel .group-list .group .head{height:32px;padding:0 20px 0 10px;border-top:1px solid #4f4f4f;border-bottom:1px solid #262626;background:#000;cursor:pointer}#controlKit .panel .group-list .group .head .label{font-size:12px;line-height:32px;color:#fff}#controlKit .panel .group-list .group .head:hover{border-top:1px solid #525252;background:#333}#controlKit .panel .group-list .group li{height:32px;padding:0 10px}#controlKit .panel .group-list .group .sub-group-list .sub-group:last-of-type{border-bottom:none}#controlKit .panel .group-list .group .sub-group-list .sub-group{padding:0;height:auto;border-bottom:1px solid #242424}#controlKit .panel .group-list .group .sub-group-list .sub-group ul{overflow:hidden}#controlKit .panel .group-list .group .sub-group-list .sub-group ul li{background:auto;border-bottom:1px solid #2e2e2e}#controlKit .panel .group-list .group .sub-group-list .sub-group ul li:hover .slider-slot,#controlKit .panel .group-list .group .sub-group-list .sub-group ul li:hover input[type=text]{background-color:#333}#controlKit .panel .group-list .group .sub-group-list .sub-group ul li:last-of-type{border-bottom:none}#controlKit .panel .group-list .group .sub-group-list .sub-group:first-child{margin-top:0}#controlKit .panel .group-list .group .sub-group-list .sub-group .head,#controlKit .panel .group-list .group .sub-group-list .sub-group .head-inactive{cursor:pointer}#controlKit .panel .group-list .group .sub-group-list .sub-group .head{height:27px;padding:0 20px 0 10px;border-top:none;border-bottom:1px solid #242424;background-image:none;background-color:#111}#controlKit .panel .group-list .group .sub-group-list .sub-group .head:hover{background:#333}#controlKit .panel .group-list .group .sub-group-list .sub-group .head-inactive{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;height:27px;padding:0 20px 0 10px;box-shadow:0 1px 0 0 #404040 inset;background-color:#111;cursor:pointer}#controlKit .panel .group-list .group .sub-group-list .sub-group .head-inactive:hover{box-shadow:0 1px 0 0 #474747 inset;background:#333;cursor:pointer}#controlKit .panel .group-list .group .sub-group-list .sub-group .head .label,#controlKit .panel .group-list .group .sub-group-list .sub-group .head-inactive .label{margin:0;padding:0;line-height:27px;color:#fff;font-weight:700;font-size:11px;text-shadow:1px 1px #000;text-transform:capitalize}#controlKit .panel .group-list .group .sub-group-list .sub-group .head .wrap .label,#controlKit .panel .group-list .group .sub-group-list .sub-group .head-inactive .wrap .label{width:100%;font-weight:700;color:#fff;padding:0}#controlKit .panel .group-list .group .sub-group-list .sub-group .wrap .label{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;height:100%;width:30%;padding:10px 6px 0 0;float:left;font-size:10px;font-weight:400;color:#aeb5b8;text-shadow:1px 1px #000}#controlKit .panel .group-list .group .sub-group-list .sub-group .wrap .wrap{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;width:70%;padding:5px 0 0;float:right;height:100%}#controlKit .panel .group-list .group:last-child .scroll-buffer:nth-of-type(3),#controlKit .panel .group-list .group:last-child .sub-group-list{border-bottom:none}#controlKit .panel .scroll-wrap{position:relative;overflow:hidden}#controlKit .panel .scroll-buffer{width:100%;height:8px;border-top:1px solid #3b4447;border-bottom:1px solid #1e2224}#controlKit .panel .scrollBar{-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box;width:15px;height:100%;float:right;top:0;padding:0;margin:0;position:relative;background:#212628;background-image:linear-gradient(to right,#242424 0,#2E2E2E 100%)}#controlKit .panel .scrollBar .track{padding:0 3px 0 2px}#controlKit .panel .scrollBar .track .thumb{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;width:11px;position:absolute;cursor:pointer;background-color:#343434;border:1px solid #1b1f21;border-radius:10px;-moz-border-radius:10px;box-shadow:inset 0 1px 0 0 #434b50}#controlKit .panel .menu,#controlKit .panel .menu-active,#controlKit .picker .menu{display:none;float:right;padding:5px 0 0}#controlKit .panel .menu input[type=button],#controlKit .panel .menu-active input[type=button],#controlKit .picker .menu input[type=button]{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;cursor:pointer;height:20px;border:none;vertical-align:top;border-radius:0;-moz-border-radius:0;font-family:monospace;font-size:11px;font-weight:700;color:#aaa;text-shadow:0 -1px #000;text-transform:uppercase;box-shadow:0 0 0 1px #131313 inset,-1px 2px 0 0 #212527 inset;outline:0}#controlKit .panel .menu .button-menu-close,#controlKit .panel .menu .button-menu-hide,#controlKit .panel .menu .button-menu-show,#controlKit .panel .menu-active .button-menu-close,#controlKit .panel .menu-active .button-menu-hide,#controlKit .panel .menu-active .button-menu-show,#controlKit .picker .menu .button-menu-close,#controlKit .picker .menu .button-menu-hide,#controlKit .picker .menu .button-menu-show{width:20px;margin-left:4px}#controlKit .panel .menu .button-menu-hide,#controlKit .panel .menu-active .button-menu-hide,#controlKit .picker .menu .button-menu-hide{background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAFCAYAAAB4ka1VAAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo+qi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt/87fOH4p3iC+N7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi/RNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z+pn5mZ2y6xlhbL+xW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a/zYnKOZarnivN7cyzytuQN5zvn//tEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1+1dT1gvWd+1YfqGnRs+FYmKrhTbF5cVf9go3HjlG4dvyr+Z3JS0qavEuWTPZtJm6ebeLZ5bDpaql+aXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO/PLi8ZafJzs07P1SkVPRU+lQ27tLdtWHX+G7R7ht7vPY07NXbW7z3/T7JvttVAVVN1WbVZftJ+7P3P66Jqun4lvttXa1ObXHtxwPSA/0HIw6217nU1R3SPVRSj9Yr60cOxx++/p3vdy0NNg1VjZzG4iNwRHnk6fcJ3/ceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w+0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb++6EHTh0kX/i+c7vDvOXPK4dPKy2+UTV7hXmq86X23qdOo8/pPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb/1tWeOT3dvfN6b/fF9/XfFt1+cif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v+3Njv3H9qwHeg89HcR/cGhYPP/pH1jw9DBY+Zj8uGDYbrnjg+OTniP3L96fynQ89kzyaeF/6i/suuFxYvfvjV69fO0ZjRoZfyl5O/bXyl/erA6xmv28bCxh6+yXgzMV70VvvtwXfcdx3vo98PT+R8IH8o/2j5sfVT0Kf7kxmTk/8EA5jz/GMzLdsAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAAAGRJREFUeNpidPUNYoCBU0cO1DMwMDCY2Tg0wsRYkCVlFZUboGy4ImZldU24pJySCgO/oBADAwODw/VL5xmk5RQOMr99/RIuCQPIiljMbBwYGBgYGH7//MmADCSlZRkkpWUZAAMAvTsgXBvOsq0AAAAASUVORK5CYII=) 50% 50% no-repeat,#1a1d1f}#controlKit .panel .menu .button-menu-hide:hover,#controlKit .panel .menu-active .button-menu-hide:hover,#controlKit .picker .menu .button-menu-hide:hover{background:url(data:image/png;base64,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) 50% 50% no-repeat,#000;box-shadow:#fff 0,#000 100%}#controlKit .panel .menu .button-menu-show,#controlKit .panel .menu-active .button-menu-show,#controlKit .picker .menu .button-menu-show{background:url(data:image/png;base64,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) 50% 50% no-repeat,#1a1d1f}#controlKit .panel .menu .button-menu-show:hover,#controlKit .panel .menu-active .button-menu-show:hover,#controlKit .picker .menu .button-menu-show:hover{background:url(data:image/png;base64,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) 50% 50% no-repeat,#000;box-shadow:#fff 0,#000 100%}#controlKit .panel .menu .button-menu-close,#controlKit .panel .menu-active .button-menu-close,#controlKit .picker .menu .button-menu-close{background:url(data:image/png;base64,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) 50% 50% no-repeat,#1a1d1f}#controlKit .panel .menu .button-menu-close:hover,#controlKit .panel .menu-active .button-menu-close:hover,#controlKit .picker .menu .button-menu-close:hover{background:url(data:image/png;base64,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) 50% 50% no-repeat,#000;box-shadow:#fff 0,#000 100%}#controlKit .panel .menu .button-menu-undo,#controlKit .panel .menu-active .button-menu-undo{background:url(data:image/png;base64,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) 20% 50% no-repeat,#1a1d1f;padding:0 6px 1px 0;width:38px;vertical-align:top;text-align:end}#controlKit .panel .menu .button-menu-undo:hover,#controlKit .panel .menu-active .button-menu-undo:hover{background:url(data:image/png;base64,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) 20% 50% no-repeat,#000;box-shadow:#fff 0,#000 100%}#controlKit .panel .menu .button-menu-load,#controlKit .panel .menu-active .button-menu-load{margin-right:2px}#controlKit .panel .menu .button-menu-load,#controlKit .panel .menu .button-menu-save,#controlKit .panel .menu-active .button-menu-load,#controlKit .panel .menu-active .button-menu-save{background:#1a1d1f;font-size:9px!important}#controlKit .panel .menu .button-menu-load:hover,#controlKit .panel .menu .button-menu-save:hover,#controlKit .panel .menu-active .button-menu-load:hover,#controlKit .panel .menu-active .button-menu-save:hover{background:#000}#controlKit .panel .menu .wrap{display:none}#controlKit .panel .menu-active{width:100%;float:left}#controlKit .panel .menu-active .wrap{display:inline}#controlKit .panel .menu-active .button-menu-close,#controlKit .panel .menu-active .button-menu-hide,#controlKit .panel .menu-active .button-menu-show{float:right}#controlKit .panel .arrow-s-max{background:url(data:image/png;base64,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) center no-repeat}#controlKit .panel .arrow-s-min{background:url(data:image/png;base64,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) center no-repeat}#controlKit .panel .arrow-s-max,#controlKit .panel .arrow-s-min{width:100%;height:20px}#controlKit .panel .arrow-b-max{background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHCAYAAADEUlfTAAAKRWlDQ1BJQ0MgcHJvZmlsZQAAeNqdU2dUU+kWPffe9EJLiICUS29SFQggUkKLgBSRJiohCRBKiCGh2RVRwRFFRQQbyKCIA46OgIwVUSwMigrYB+Qhoo6Do4iKyvvhe6Nr1rz35s3+tdc+56zznbPPB8AIDJZIM1E1gAypQh4R4IPHxMbh5C5AgQokcAAQCLNkIXP9IwEA+H48PCsiwAe+AAF40wsIAMBNm8AwHIf/D+pCmVwBgIQBwHSROEsIgBQAQHqOQqYAQEYBgJ2YJlMAoAQAYMtjYuMAUC0AYCd/5tMAgJ34mXsBAFuUIRUBoJEAIBNliEQAaDsArM9WikUAWDAAFGZLxDkA2C0AMElXZkgAsLcAwM4QC7IACAwAMFGIhSkABHsAYMgjI3gAhJkAFEbyVzzxK64Q5yoAAHiZsjy5JDlFgVsILXEHV1cuHijOSRcrFDZhAmGaQC7CeZkZMoE0D+DzzAAAoJEVEeCD8/14zg6uzs42jrYOXy3qvwb/ImJi4/7lz6twQAAA4XR+0f4sL7MagDsGgG3+oiXuBGheC6B194tmsg9AtQCg6dpX83D4fjw8RaGQudnZ5eTk2ErEQlthyld9/mfCX8BX/Wz5fjz89/XgvuIkgTJdgUcE+ODCzPRMpRzPkgmEYtzmj0f8twv//B3TIsRJYrlYKhTjURJxjkSajPMypSKJQpIpxSXS/2Ti3yz7Az7fNQCwaj4Be5EtqF1jA/ZLJxBYdMDi9wAA8rtvwdQoCAOAaIPhz3f/7z/9R6AlAIBmSZJxAABeRCQuVMqzP8cIAABEoIEqsEEb9MEYLMAGHMEF3MEL/GA2hEIkxMJCEEIKZIAccmAprIJCKIbNsB0qYC/UQB00wFFohpNwDi7CVbgOPXAP+mEInsEovIEJBEHICBNhIdqIAWKKWCOOCBeZhfghwUgEEoskIMmIFFEiS5E1SDFSilQgVUgd8j1yAjmHXEa6kTvIADKC/Ia8RzGUgbJRPdQMtUO5qDcahEaiC9BkdDGajxagm9BytBo9jDah59CraA/ajz5DxzDA6BgHM8RsMC7Gw0KxOCwJk2PLsSKsDKvGGrBWrAO7ifVjz7F3BBKBRcAJNgR3QiBhHkFIWExYTthIqCAcJDQR2gk3CQOEUcInIpOoS7QmuhH5xBhiMjGHWEgsI9YSjxMvEHuIQ8Q3JBKJQzInuZACSbGkVNIS0kbSblIj6SypmzRIGiOTydpka7IHOZQsICvIheSd5MPkM+Qb5CHyWwqdYkBxpPhT4ihSympKGeUQ5TTlBmWYMkFVo5pS3aihVBE1j1pCraG2Uq9Rh6gTNHWaOc2DFklLpa2ildMaaBdo92mv6HS6Ed2VHk6X0FfSy+lH6JfoA/R3DA2GFYPHiGcoGZsYBxhnGXcYr5hMphnTixnHVDA3MeuY55kPmW9VWCq2KnwVkcoKlUqVJpUbKi9Uqaqmqt6qC1XzVctUj6leU32uRlUzU+OpCdSWq1WqnVDrUxtTZ6k7qIeqZ6hvVD+kfln9iQZZw0zDT0OkUaCxX+O8xiALYxmzeCwhaw2rhnWBNcQmsc3ZfHYqu5j9HbuLPaqpoTlDM0ozV7NS85RmPwfjmHH4nHROCecop5fzforeFO8p4ikbpjRMuTFlXGuqlpeWWKtIq1GrR+u9Nq7tp52mvUW7WfuBDkHHSidcJ0dnj84FnedT2VPdpwqnFk09OvWuLqprpRuhu0R3v26n7pievl6Ankxvp955vef6HH0v/VT9bfqn9UcMWAazDCQG2wzOGDzFNXFvPB0vx9vxUUNdw0BDpWGVYZfhhJG50Tyj1UaNRg+MacZc4yTjbcZtxqMmBiYhJktN6k3umlJNuaYppjtMO0zHzczNos3WmTWbPTHXMueb55vXm9+3YFp4Wiy2qLa4ZUmy5FqmWe62vG6FWjlZpVhVWl2zRq2drSXWu627pxGnuU6TTque1mfDsPG2ybaptxmw5dgG2662bbZ9YWdiF2e3xa7D7pO9k326fY39PQcNh9kOqx1aHX5ztHIUOlY63prOnO4/fcX0lukvZ1jPEM/YM+O2E8spxGmdU5vTR2cXZ7lzg/OIi4lLgssulz4umxvG3ci95Ep09XFd4XrS9Z2bs5vC7ajbr+427mnuh9yfzDSfKZ5ZM3PQw8hD4FHl0T8Ln5Uwa9+sfk9DT4FntecjL2MvkVet17C3pXeq92HvFz72PnKf4z7jPDfeMt5ZX8w3wLfIt8tPw2+eX4XfQ38j/2T/ev/RAKeAJQFnA4mBQYFbAvv4enwhv44/Ottl9rLZ7UGMoLlBFUGPgq2C5cGtIWjI7JCtIffnmM6RzmkOhVB+6NbQB2HmYYvDfgwnhYeFV4Y/jnCIWBrRMZc1d9HcQ3PfRPpElkTem2cxTzmvLUo1Kj6qLmo82je6NLo/xi5mWczVWJ1YSWxLHDkuKq42bmy+3/zt84fineIL43sXmC/IXXB5oc7C9IWnFqkuEiw6lkBMiE44lPBBECqoFowl8hN3JY4KecIdwmciL9E20YjYQ1wqHk7ySCpNepLskbw1eSTFM6Us5bmEJ6mQvEwNTN2bOp4WmnYgbTI9Or0xg5KRkHFCqiFNk7Zn6mfmZnbLrGWFsv7Fbou3Lx6VB8lrs5CsBVktCrZCpuhUWijXKgeyZ2VXZr/Nico5lqueK83tzLPK25A3nO+f/+0SwhLhkralhktXLR1Y5r2sajmyPHF52wrjFQUrhlYGrDy4irYqbdVPq+1Xl65+vSZ6TWuBXsHKgsG1AWvrC1UK5YV969zX7V1PWC9Z37Vh+oadGz4ViYquFNsXlxV/2CjceOUbh2/Kv5nclLSpq8S5ZM9m0mbp5t4tnlsOlqqX5pcObg3Z2rQN31a07fX2Rdsvl80o27uDtkO5o788uLxlp8nOzTs/VKRU9FT6VDbu0t21Ydf4btHuG3u89jTs1dtbvPf9Psm+21UBVU3VZtVl+0n7s/c/romq6fiW+21drU5tce3HA9ID/QcjDrbXudTVHdI9VFKP1ivrRw7HH77+ne93LQ02DVWNnMbiI3BEeeTp9wnf9x4NOtp2jHus4QfTH3YdZx0vakKa8ppGm1Oa+1tiW7pPzD7R1ureevxH2x8PnDQ8WXlK81TJadrpgtOTZ/LPjJ2VnX1+LvncYNuitnvnY87fag9v77oQdOHSRf+L5zu8O85c8rh08rLb5RNXuFearzpfbep06jz+k9NPx7ucu5quuVxrue56vbV7ZvfpG543zt30vXnxFv/W1Z45Pd2983pv98X39d8W3X5yJ/3Oy7vZdyfurbxPvF/0QO1B2UPdh9U/W/7c2O/cf2rAd6Dz0dxH9waFg8/+kfWPD0MFj5mPy4YNhuueOD45OeI/cv3p/KdDz2TPJp4X/qL+y64XFi9++NXr187RmNGhl/KXk79tfKX96sDrGa/bxsLGHr7JeDMxXvRW++3Bd9x3He+j3w9P5Hwgfyj/aPmx9VPQp/uTGZOT/wQDmPP87zWUggAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAMhaVRYdFhNTDpjb20uYWRvYmUueG1wAAAAAAA8P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/PiA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJBZG9iZSBYTVAgQ29yZSA1LjYtYzE0MiA3OS4xNjA5MjQsIDIwMTcvMDcvMTMtMDE6MDY6MzkgICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCBDQyAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MzkwNTg1Qjg3NTI4MTFFQTlDRjJBMzJGNUVGNDgxMDEiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MzkwNTg1Qjk3NTI4MTFFQTlDRjJBMzJGNUVGNDgxMDEiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDozOTA1ODVCNjc1MjgxMUVBOUNGMkEzMkY1RUY0ODEwMSIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDozOTA1ODVCNzc1MjgxMUVBOUNGMkEzMkY1RUY0ODEwMSIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PvxdIXQAAAAhSURBVHjaYvz//z8DLsDEgAfglWQB4v/4JBmpbydAgAEA0JQED3szFVUAAAAASUVORK5CYII=) center no-repeat}#controlKit .panel .arrow-b-min{background:url(data:image/png;base64,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Z2VSZWFkeXHJZTwAAAMhaVRYdFhNTDpjb20uYWRvYmUueG1wAAAAAAA8P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/PiA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJBZG9iZSBYTVAgQ29yZSA1LjYtYzE0MiA3OS4xNjA5MjQsIDIwMTcvMDcvMTMtMDE6MDY6MzkgICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCBDQyAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NzlBQzczOUU3NTI3MTFFQUIxODVGNzBFRjY0RENERkMiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NzlBQzczOUY3NTI3MTFFQUIxODVGNzBFRjY0RENERkMiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo3OUFDNzM5Qzc1MjcxMUVBQjE4NUY3MEVGNjREQ0RGQyIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo3OUFDNzM5RDc1MjcxMUVBQjE4NUY3MEVGNjREQ0RGQyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PrWJuIcAAAAmSURBVHjaYvz//z8DEgBxGGEcJgY8AK8kC9QodKPhkozUtxMgwAAySgcOYy2xpAAAAABJRU5ErkJggg==) center no-repeat}#controlKit .panel .arrow-b-sub-max{background:url(data:image/png;base64,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Z2VSZWFkeXHJZTwAAAMhaVRYdFhNTDpjb20uYWRvYmUueG1wAAAAAAA8P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/PiA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJBZG9iZSBYTVAgQ29yZSA1LjYtYzE0MiA3OS4xNjA5MjQsIDIwMTcvMDcvMTMtMDE6MDY6MzkgICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCBDQyAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MzkwNTg1Qjg3NTI4MTFFQTlDRjJBMzJGNUVGNDgxMDEiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MzkwNTg1Qjk3NTI4MTFFQTlDRjJBMzJGNUVGNDgxMDEiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDozOTA1ODVCNjc1MjgxMUVBOUNGMkEzMkY1RUY0ODEwMSIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDozOTA1ODVCNzc1MjgxMUVBOUNGMkEzMkY1RUY0ODEwMSIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PvxdIXQAAAAhSURBVHjaYvz//z8DLsDEgAfglWQB4v/4JBmpbydAgAEA0JQED3szFVUAAAAASUVORK5CYII=) center no-repeat}#controlKit .panel .arrow-b-sub-min{background:url(data:image/png;base64,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Z2VSZWFkeXHJZTwAAAMhaVRYdFhNTDpjb20uYWRvYmUueG1wAAAAAAA8P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/PiA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJBZG9iZSBYTVAgQ29yZSA1LjYtYzE0MiA3OS4xNjA5MjQsIDIwMTcvMDcvMTMtMDE6MDY6MzkgICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCBDQyAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NzlBQzczOUU3NTI3MTFFQUIxODVGNzBFRjY0RENERkMiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NzlBQzczOUY3NTI3MTFFQUIxODVGNzBFRjY0RENERkMiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo3OUFDNzM5Qzc1MjcxMUVBQjE4NUY3MEVGNjREQ0RGQyIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo3OUFDNzM5RDc1MjcxMUVBQjE4NUY3MEVGNjREQ0RGQyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PrWJuIcAAAAmSURBVHjaYvz//z8DEgBxGGEcJgY8AK8kC9QodKPhkozUtxMgwAAySgcOYy2xpAAAAABJRU5ErkJggg==) center no-repeat}#controlKit .panel .arrow-b-max,#controlKit .panel .arrow-b-min,#controlKit .panel .arrow-b-sub-max,#controlKit .panel .arrow-b-sub-min{width:10px;height:100%;float:right}#controlKit .picker{pointer-events:auto;-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border-radius:3px;-moz-border-radius:3px;background-color:#3b3b3b;font-family:monospace;font-size:11px;color:#fff;text-shadow:1px 1px #000;overflow:hidden;position:absolute;z-index:2147483631;width:360px;-webkit-touch-callout:none;-webkit-user-select:none;-khtml-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;box-shadow:0 2px 2px rgba(0,0,0,.25)}#controlKit .picker canvas{vertical-align:bottom;cursor:pointer}#controlKit .picker .wrap{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;padding:10px;float:left}#controlKit .picker .field-wrap{padding:3px}#controlKit .picker .slider-wrap{padding:3px 13px 3px 3px}#controlKit .picker .field-wrap,#controlKit .picker .input-wrap,#controlKit .picker .slider-wrap{height:auto;overflow:hidden;float:left}#controlKit .picker .input-wrap{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border:1px solid #242424;border-radius:0;-moz-border-radius:0;width:140px;float:right;padding:5px 10px 1px 0}#controlKit .picker .input-field{width:50%;float:right;margin-bottom:4px}#controlKit .picker .input-field .label{padding:5px 0 0;color:#878787;text-align:center;text-transform:uppercase;font-weight:700;text-shadow:1px 1px #1a1a1a;width:40%}#controlKit .picker .input-field .wrap{padding:0;width:60%;height:auto;float:right}#controlKit .picker .controls-wrap{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;width:100%;height:auto;float:right;padding:9px 0 0}#controlKit .picker .controls-wrap input[type=button]{float:right;width:65px;margin:0 0 0 10px}#controlKit .picker .color-contrast{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border:none;box-shadow:0 0 0 1px #1F1F1F inset;border-radius:0;-moz-border-radius:0;height:18px;padding:3px;width:80%;margin-bottom:4px;float:right}#controlKit .picker .color-contrast div{width:50%;height:100%;float:left}#controlKit .picker input[type=text]{padding:0;text-align:center;width:60%;float:right}#controlKit .picker .wrap .input-wrap:nth-of-type(3){border-bottom-left-radius:0;border-bottom-right-radius:0}#controlKit .picker .wrap .input-wrap:nth-of-type(4){border-top:none;border-top-left-radius:0;border-top-right-radius:0}#controlKit .picker .wrap .input-wrap:nth-of-type(4) .input-field{width:100%}#controlKit .picker .wrap .input-wrap:nth-of-type(4) .input-field .label{width:20%}#controlKit .picker .wrap .input-wrap:nth-of-type(4) input[type=text]{width:80%}#controlKit .picker .field-wrap,#controlKit .picker .slider-wrap{background:#1e2224;border:none;box-shadow:0 0 0 1px #1F1F1F inset;border-radius:0;-moz-border-radius:0;position:relative;margin-right:5px}#controlKit .picker .field-wrap .indicator,#controlKit .picker .slider-wrap .indicator{position:absolute;border:2px solid #fff;box-shadow:0 1px #000,0 1px #000 inset;cursor:pointer}#controlKit .picker .field-wrap .indicator{width:8px;height:8px;left:50%;top:50%;border-radius:50%;-moz-border-radius:50%}#controlKit .picker .slider-wrap .indicator{width:14px;height:3px;border-radius:8px;-moz-border-radius:8px;left:1px;top:1px}#controlKit .picker .slider-wrap .indicator:after{content:'';width:0;height:0;border-top:4.5px solid transparent;border-bottom:4.5px solid transparent;border-right:4px solid #fff;float:right;position:absolute;top:-2px;left:19px}#controlKit .picker .slider-wrap .indicator:before{content:'';width:0;height:0;border-top:4.5px solid transparent;border-bottom:4.5px solid transparent;border-right:4px solid #000;float:right;position:absolute;top:-3px;left:19px}"
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
    DEFAULT_PANEL_WIDTH_MAX  = 800,
    DEFAULT_PANEL_RATIO      = 40,
    DEFAULT_PANEL_LABEL      = 'Parameters (P)',
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
            head.addEventListener(NodeEvent.MOUSE_DOWN, this._onMenuHideMouseDown.bind(this));

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
 * Removes a Group from the Panel.
 * @param {Object} [group] - Group
 * @returns {Panel}
 */
Panel.prototype.removeGroup = function (group) {
    var index = this._groups.findIndex(function(element) { return element === group; });
    if (index < 0) return this;
    
    var list = this.getNode().getLastChild().getFirstChild();
    var _group = this._groups.splice(index, 1)[0];
    list.removeChild(_group._node);

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
    params.enable     = params.enable     === undefined ? true : params.enable;

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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9pbmRleC5qcyIsIi4uL2xpYi9Db250cm9sS2l0LmpzIiwiLi4vbGliL2NvbXBvbmVudC9CdXR0b24uanMiLCIuLi9saWIvY29tcG9uZW50L0J1dHRvblByZXNldC5qcyIsIi4uL2xpYi9jb21wb25lbnQvQ2FudmFzLmpzIiwiLi4vbGliL2NvbXBvbmVudC9DaGVja2JveC5qcyIsIi4uL2xpYi9jb21wb25lbnQvQ29sb3IuanMiLCIuLi9saWIvY29tcG9uZW50L0Z1bmN0aW9uUGxvdFR5cGUuanMiLCIuLi9saWIvY29tcG9uZW50L0Z1bmN0aW9uUGxvdHRlci5qcyIsIi4uL2xpYi9jb21wb25lbnQvRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3IuanMiLCIuLi9saWIvY29tcG9uZW50L0Z1bmN0aW9uUGxvdHRlck9iamVjdEVycm9yLmpzIiwiLi4vbGliL2NvbXBvbmVudC9NZXRyaWMuanMiLCIuLi9saWIvY29tcG9uZW50L051bWJlcklucHV0LmpzIiwiLi4vbGliL2NvbXBvbmVudC9OdW1iZXJJbnB1dF9JbnRlcm5hbC5qcyIsIi4uL2xpYi9jb21wb25lbnQvTnVtYmVyT3V0cHV0LmpzIiwiLi4vbGliL2NvbXBvbmVudC9PcHRpb25zLmpzIiwiLi4vbGliL2NvbXBvbmVudC9PdXRwdXQuanMiLCIuLi9saWIvY29tcG9uZW50L1BhZC5qcyIsIi4uL2xpYi9jb21wb25lbnQvUGlja2VyLmpzIiwiLi4vbGliL2NvbXBvbmVudC9QbG90dGVyLmpzIiwiLi4vbGliL2NvbXBvbmVudC9SYW5nZS5qcyIsIi4uL2xpYi9jb21wb25lbnQvU1ZHLmpzIiwiLi4vbGliL2NvbXBvbmVudC9TVkdDb21wb25lbnQuanMiLCIuLi9saWIvY29tcG9uZW50L1NlbGVjdC5qcyIsIi4uL2xpYi9jb21wb25lbnQvU2xpZGVyLmpzIiwiLi4vbGliL2NvbXBvbmVudC9TbGlkZXJfSW50ZXJuYWwuanMiLCIuLi9saWIvY29tcG9uZW50L1N0cmluZ0lucHV0LmpzIiwiLi4vbGliL2NvbXBvbmVudC9TdHJpbmdPdXRwdXQuanMiLCIuLi9saWIvY29tcG9uZW50L1ZhbHVlUGxvdHRlci5qcyIsIi4uL2xpYi9jb3JlL0NvbXBvbmVudC5qcyIsIi4uL2xpYi9jb3JlL0NvbXBvbmVudEV2ZW50LmpzIiwiLi4vbGliL2NvcmUvQ29tcG9uZW50T2JqZWN0RXJyb3IuanMiLCIuLi9saWIvY29yZS9IaXN0b3J5LmpzIiwiLi4vbGliL2NvcmUvSGlzdG9yeUV2ZW50LmpzIiwiLi4vbGliL2NvcmUvT2JqZWN0Q29tcG9uZW50LmpzIiwiLi4vbGliL2NvcmUvT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIuanMiLCIuLi9saWIvY29yZS9PcHRpb25FdmVudC5qcyIsIi4uL2xpYi9jb3JlL1N0YXRlLmpzIiwiLi4vbGliL2NvcmUvY29sb3IvQ29sb3JGb3JtYXRFcnJvci5qcyIsIi4uL2xpYi9jb3JlL2NvbG9yL0NvbG9yTW9kZS5qcyIsIi4uL2xpYi9jb3JlL2NvbG9yL0NvbG9yVXRpbC5qcyIsIi4uL2xpYi9jb3JlL2RvY3VtZW50L0NTUy5qcyIsIi4uL2xpYi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQuanMiLCIuLi9saWIvY29yZS9kb2N1bWVudC9Nb3VzZS5qcyIsIi4uL2xpYi9jb3JlL2RvY3VtZW50L05vZGUuanMiLCIuLi9saWIvY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQuanMiLCIuLi9saWIvY29yZS9kb2N1bWVudC9TdHlsZS5qcyIsIi4uL2xpYi9jb3JlL2V2ZW50L0V2ZW50LmpzIiwiLi4vbGliL2NvcmUvZXZlbnQvRXZlbnREaXNwYXRjaGVyLmpzIiwiLi4vbGliL2NvcmUvbGF5b3V0L0xheW91dE1vZGUuanMiLCIuLi9saWIvY29yZS9sYXlvdXQvU2Nyb2xsQmFyLmpzIiwiLi4vbGliL2dyb3VwL0Fic3RyYWN0R3JvdXAuanMiLCIuLi9saWIvZ3JvdXAvR3JvdXAuanMiLCIuLi9saWIvZ3JvdXAvR3JvdXBFdmVudC5qcyIsIi4uL2xpYi9ncm91cC9NZW51RXZlbnQuanMiLCIuLi9saWIvZ3JvdXAvUGFuZWwuanMiLCIuLi9saWIvZ3JvdXAvUGFuZWxFdmVudC5qcyIsIi4uL2xpYi9ncm91cC9TdWJHcm91cC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOVdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOU5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoa0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDanpCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcFRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbnpCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwidmFyIENvbnRyb2xLaXQgICAgICAgID0gcmVxdWlyZSgnLi9saWIvQ29udHJvbEtpdCcpO1xyXG5cdENvbnRyb2xLaXQuQ2FudmFzID0gcmVxdWlyZSgnLi9saWIvY29tcG9uZW50L0NhbnZhcycpO1xyXG5cdENvbnRyb2xLaXQuU1ZHICAgID0gcmVxdWlyZSgnLi9saWIvY29tcG9uZW50L1NWRycpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDb250cm9sS2l0OyIsInZhciBOb2RlICAgID0gcmVxdWlyZSgnLi9jb3JlL2RvY3VtZW50L05vZGUnKSxcclxuICAgIFBhbmVsICAgPSByZXF1aXJlKCcuL2dyb3VwL1BhbmVsJyksXHJcbiAgICBPcHRpb25zID0gcmVxdWlyZSgnLi9jb21wb25lbnQvT3B0aW9ucycpLFxyXG4gICAgUGlja2VyICA9IHJlcXVpcmUoJy4vY29tcG9uZW50L1BpY2tlcicpO1xyXG5cclxudmFyIENTUyA9IHJlcXVpcmUoJy4vY29yZS9kb2N1bWVudC9DU1MnKTtcclxuXHJcbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKCcuL2NvcmUvZXZlbnQvRXZlbnREaXNwYXRjaGVyJyksXHJcbiAgICBFdmVudF8gICAgICAgICAgPSByZXF1aXJlKCcuL2NvcmUvZXZlbnQvRXZlbnQnKSxcclxuICAgIERvY3VtZW50RXZlbnQgICA9IHJlcXVpcmUoJy4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXHJcbiAgICBOb2RlRXZlbnQgICAgICAgPSByZXF1aXJlKCcuL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50JyksXHJcbiAgICBDb21wb25lbnRFdmVudCAgPSByZXF1aXJlKCcuL2NvcmUvQ29tcG9uZW50RXZlbnQnKSxcclxuICAgIEhpc3RvcnlFdmVudCAgICA9IHJlcXVpcmUoJy4vY29yZS9IaXN0b3J5RXZlbnQnKSxcclxuICAgIE1lbnVFdmVudCAgICAgICA9IHJlcXVpcmUoJy4vZ3JvdXAvTWVudUV2ZW50Jyk7XHJcblxyXG52YXIgSGlzdG9yeSA9IHJlcXVpcmUoJy4vY29yZS9IaXN0b3J5JyksXHJcbiAgICBTdGF0ZSAgID0gcmVxdWlyZSgnLi9jb3JlL1N0YXRlJyk7XHJcblxyXG52YXIgTW91c2UgICA9IHJlcXVpcmUoJy4vY29yZS9kb2N1bWVudC9Nb3VzZScpO1xyXG5cclxudmFyIFZhbHVlUGxvdHRlciA9IHJlcXVpcmUoJy4vY29tcG9uZW50L1ZhbHVlUGxvdHRlcicpO1xyXG52YXIgU3RyaW5nT3V0cHV0ID0gcmVxdWlyZSgnLi9jb21wb25lbnQvU3RyaW5nT3V0cHV0JyksXHJcbiAgICBTdHJpbmdJbnB1dCA9IHJlcXVpcmUoJy4vY29tcG9uZW50L1N0cmluZ0lucHV0JyksXHJcbiAgICBOdW1iZXJPdXRwdXQgPSByZXF1aXJlKCcuL2NvbXBvbmVudC9OdW1iZXJPdXRwdXQnKSxcclxuICAgIFNsaWRlciA9IHJlcXVpcmUoJy4vY29tcG9uZW50L1NsaWRlcicpLFxyXG4gICAgU2VsZWN0ID0gcmVxdWlyZSgnLi9jb21wb25lbnQvU2VsZWN0Jyk7XHJcblxyXG52YXIgREVGQVVMVF9ISVNUT1JZID0gZmFsc2UsXHJcbiAgICBERUZBVUxUX09QQUNJVFkgPSAxLjAsXHJcbiAgICBERUZBVUxUX1BBTkVMU19DTE9TQUJMRSA9IGZhbHNlLFxyXG4gICAgREVGQVVMVF9FTkFCTEUgPSB0cnVlLFxyXG4gICAgREVGQVVMVF9GVUxMID0gZmFsc2UsXHJcbiAgICBERUZBVUxUX0xPQURfQU5EX1NBVkUgPSBmYWxzZTtcclxuXHJcbnZhciBERUZBVUxUX1RSSUdHRVJfU0hPUlRDVVRfQ0hBUiA9ICdoJztcclxuXHJcbnZhciBpbml0aWF0ZWQgPSBmYWxzZTtcclxuXHJcbi8qKlxyXG4gKiBJbml0aWFsaXplcyBDb250cm9sS2l0LlxyXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQ29udHJvbEtpdCBvcHRpb25zXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5vcGFjaXR5PTEuMF0gLSBPdmVyYWxsIG9wYWNpdHlcclxuICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5lbmFibGU9dHJ1ZV0gLSBJbml0aWFsIENvbnRyb2xLaXQgc3RhdGUsIGVuYWJsZWQgLyBkaXNhYmxlZFxyXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLnVzZUV4dGVybmFsU3R5bGU9ZmFsc2VdIC0gSWYgdHJ1ZSwgYW4gZXh0ZXJuYWwgc3R5bGUgaXMgdXNlZCBpbnN0ZWFkIG9mIHRoZSBidWlsZC1pbiBvbmVcclxuICogQHBhcmFtIHtTdHJpbmd9IFtvcHRpb25zLnN0eWxlU3RyaW5nXSAtIElmIHRydWUsIGFuIGV4dGVybmFsIHN0eWxlIGlzIHVzZWQgaW5zdGVhZCBvZiB0aGUgYnVpbGQtaW4gb25lXHJcbiAqIEBwYXJhbSB7Qm9vbGVhbn1bb3B0aW9ucy5oaXN0b3J5PWZhbHNlXSAtIChFeHBlcmltZW50YWwpIEVuYWJsZXMgYSB2YWx1ZSBoaXN0b3J5IGZvciBhbGwgY29tcG9uZW50c1xyXG4gKi9cclxuZnVuY3Rpb24gQ29udHJvbEtpdChvcHRpb25zKSB7XHJcbiAgICBpZihpbml0aWF0ZWQpe1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ29udHJvbEtpdCBpcyBhbHJlYWR5IGluaXRpYWxpemVkLicpO1xyXG4gICAgfVxyXG4gICAgb3B0aW9ucyAgICAgICAgICAgICAgICAgID0gb3B0aW9ucyB8fCB7fTtcclxuICAgIG9wdGlvbnMuaGlzdG9yeSAgICAgICAgICA9IG9wdGlvbnMuaGlzdG9yeSA9PT0gdW5kZWZpbmVkID8gREVGQVVMVF9ISVNUT1JZIDogb3B0aW9ucy5oaXN0b3J5O1xyXG4gICAgb3B0aW9ucy5sb2FkQW5kU2F2ZSAgICAgID0gb3B0aW9ucy5sb2FkQW5kU2F2ZSA9PT0gdW5kZWZpbmVkID8gREVGQVVMVF9MT0FEX0FORF9TQVZFIDogb3B0aW9ucy5sb2FkQW5kU2F2ZTtcclxuICAgIG9wdGlvbnMub3BhY2l0eSAgICAgICAgICA9IG9wdGlvbnMub3BhY2l0eSA9PT0gdW5kZWZpbmVkID8gREVGQVVMVF9PUEFDSVRZIDogb3B0aW9ucy5vcGFjaXR5O1xyXG4gICAgb3B0aW9ucy5wYW5lbHNDbG9zYWJsZSAgID0gb3B0aW9ucy5wYW5lbHNDbG9zYWJsZSA9PT0gdW5kZWZpbmVkID8gREVGQVVMVF9QQU5FTFNfQ0xPU0FCTEUgOiBvcHRpb25zLnBhbmVsc0Nsb3NhYmxlO1xyXG4gICAgb3B0aW9ucy51c2VFeHRlcm5hbFN0eWxlID0gb3B0aW9ucy51c2VFeHRlcm5hbFN0eWxlID09PSB1bmRlZmluZWQgPyBmYWxzZSA6IG9wdGlvbnMudXNlRXh0ZXJuYWxTdHlsZTtcclxuICAgIG9wdGlvbnMuZW5hYmxlICAgICAgICAgICA9IG9wdGlvbnMuZW5hYmxlID09PSB1bmRlZmluZWQgPyBERUZBVUxUX0VOQUJMRSA6IG9wdGlvbnMuZW5hYmxlO1xyXG4gICAgb3B0aW9ucy5mdWxsICAgICAgICAgICAgID0gb3B0aW9ucy5mdWxsID09PSB1bmRlZmluZWQgPyBERUZBVUxUX0ZVTEwgOiBvcHRpb25zLmZ1bGw7XHJcblxyXG4gICAgRXZlbnREaXNwYXRjaGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcblxyXG4gICAgdmFyIG5vZGUgPSBudWxsO1xyXG4gICAgaWYgKCFvcHRpb25zLnBhcmVudERvbUVsZW1lbnRJZCkge1xyXG4gICAgICAgIG5vZGUgPSBuZXcgTm9kZSgpO1xyXG4gICAgICAgIGRvY3VtZW50LmJvZHkucHJlcGVuZChub2RlLmdldEVsZW1lbnQoKSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIG5vZGUgPSBOb2RlLmdldE5vZGVCeUlkKG9wdGlvbnMucGFyZW50RG9tRWxlbWVudElkKTtcclxuICAgIH1cclxuXHJcbiAgICBpZighb3B0aW9ucy51c2VFeHRlcm5hbFN0eWxlKXtcclxuICAgICAgICB2YXIgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xyXG4gICAgICAgICAgICBzdHlsZS50eXBlID0gJ3RleHQvY3NzJztcclxuICAgICAgICB2YXIgY3NzID0gIW9wdGlvbnMuc3R5bGUgPyByZXF1aXJlKCcuL2NvcmUvZG9jdW1lbnQvU3R5bGUnKS5zdHJpbmcgOiBvcHRpb25zLnN0eWxlU3RyaW5nO1xyXG4gICAgICAgIGlmKHN0eWxlLnN0eWxlc2hlZXQpe1xyXG4gICAgICAgICAgICBzdHlsZS5zdHlsZXNoZWV0LmNzc1RleHQgPSBjc3M7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc3R5bGUuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY3NzKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIChkb2N1bWVudC5oZWFkIHx8IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF0pLmFwcGVuZENoaWxkKHN0eWxlKTtcclxuICAgIH1cclxuXHJcbiAgICBub2RlLnNldFByb3BlcnR5KCdpZCcsIENTUy5Db250cm9sS2l0KTtcclxuICAgIGlmIChvcHRpb25zLmZ1bGwpIG5vZGUuc2V0U3R5bGVDbGFzcygnZnVsbCcpO1xyXG5cclxuICAgIHRoaXMuX25vZGUgPSBub2RlO1xyXG4gICAgdGhpcy5fcGFuZWxzID0gW107XHJcbiAgICB0aGlzLl9lbmFibGVkID0gb3B0aW9ucy5lbmFibGU7XHJcbiAgICB0aGlzLl9oaXN0b3J5RW5hYmxlZCA9IG9wdGlvbnMuaGlzdG9yeTtcclxuICAgIHRoaXMuX3N0YXRlc0VuYWJsZWQgPSBvcHRpb25zLmxvYWRBbmRTYXZlO1xyXG4gICAgdGhpcy5fcGFuZWxzQ2xvc2FibGUgPSBvcHRpb25zLnBhbmVsc0Nsb3NhYmxlO1xyXG4gICAgdGhpcy5fZnVsbCA9IG9wdGlvbnMuZnVsbDtcclxuXHJcbiAgICB2YXIgaGlzdG9yeSA9IEhpc3Rvcnkuc2V0dXAoKTtcclxuXHJcbiAgICBpZiAoIXRoaXMuX2hpc3RvcnlFbmFibGVkKXtcclxuICAgICAgICBoaXN0b3J5LmRpc2FibGUoKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaGlzdG9yeS5hZGRFdmVudExpc3RlbmVyKEhpc3RvcnlFdmVudC5TVEFURV9QVVNILCB0aGlzLCAnb25IaXN0b3J5U3RhdGVQdXNoJyk7XHJcbiAgICAgICAgaGlzdG9yeS5hZGRFdmVudExpc3RlbmVyKEhpc3RvcnlFdmVudC5TVEFURV9QT1AsIHRoaXMsICdvbkhpc3RvcnlTdGF0ZVBvcCcpO1xyXG4gICAgfVxyXG5cclxuICAgIE1vdXNlLnNldHVwKCk7XHJcbiAgICBQaWNrZXIuc2V0dXAobm9kZSk7XHJcbiAgICBPcHRpb25zLnNldHVwKG5vZGUpO1xyXG5cclxuICAgIHZhciBvcGFjaXR5ID0gb3B0aW9ucy5vcGFjaXR5O1xyXG4gICAgaWYgKG9wYWNpdHkgIT0gMS4wICYmIG9wYWNpdHkgIT0gMC4wKSB7XHJcbiAgICAgICAgbm9kZS5zZXRTdHlsZVByb3BlcnR5KCdvcGFjaXR5Jywgb3BhY2l0eSk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5fY2FuVXBkYXRlID0gdHJ1ZTtcclxuXHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gICAgdmFyIGludGVydmFsLFxyXG4gICAgICAgIGNvdW50ID0gMCxcclxuICAgICAgICBjb3VudE1heCA9IDEwO1xyXG5cclxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuV0lORE9XX1JFU0laRSxmdW5jdGlvbigpe1xyXG4gICAgICAgIHNlbGYuX2NhblVwZGF0ZSA9IGZhbHNlO1xyXG4gICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xyXG4gICAgICAgIGludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgaWYoY291bnQgPj0gY291bnRNYXgpe1xyXG4gICAgICAgICAgICAgICAgY291bnQgPSAwO1xyXG4gICAgICAgICAgICAgICAgc2VsZi5fY2FuVXBkYXRlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvdW50Kys7XHJcbiAgICAgICAgfSwyNSlcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMuX3Nob3J0Y3V0RW5hYmxlID0gREVGQVVMVF9UUklHR0VSX1NIT1JUQ1VUX0NIQVI7XHJcblxyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsZnVuY3Rpb24oZSl7XHJcbiAgICAgICAgaWYoIShlLmN0cmxLZXkgJiYgU3RyaW5nLmZyb21DaGFyQ29kZShlLndoaWNoIHx8IGUua2V5Q29kZSkudG9Mb3dlckNhc2UoKSA9PSBzZWxmLl9zaG9ydGN1dEVuYWJsZSkpe1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHNlbGYuX2VuYWJsZWQgPSAhc2VsZi5fZW5hYmxlZDtcclxuICAgICAgICBpZihzZWxmLl9lbmFibGVkKXtcclxuICAgICAgICAgICAgc2VsZi5fZW5hYmxlKCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc2VsZi5fZGlzYWJsZSgpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIGlmKCF0aGlzLl9lbmFibGVkKXtcclxuICAgICAgICB0aGlzLl9kaXNhYmxlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgaW5pdGlhdGVkID0gdHJ1ZTtcclxufVxyXG5Db250cm9sS2l0LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZSk7XHJcbkNvbnRyb2xLaXQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQ29udHJvbEtpdDtcclxuXHJcbi8qKlxyXG4gKiBBZGRzIGEgcGFuZWwuXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBbcGFyYW1zXSAtIFBhbmVsIG9wdGlvbnNcclxuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9J0NvbnRyb2wgUGFuZWwnXSAtIFRoZSBwYW5lbCBsYWJlbFxyXG4gKiBAcGFyYW0ge051bWJlcn0gW3BhcmFtcy53aWR0aD0zMDBdIC0gVGhlIHdpZHRoXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBbcGFyYW1zLmhlaWdodF0gLSBDb25zdHJhaW5lZCBwYW5lbCBoZWlnaHRcclxuICogQHBhcmFtIHtOdW1iZXJ9IFtwYXJhbXMucmF0aW89NDBdIC0gVGhlIHJhdGlvIG9mIGxhYmVsIChkZWZhdWx0OjQwJSkgYW5kIGNvbXBvbmVudCAoZGVmYXVsdDo2MCUpIHdpZHRoXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmFsaWduPSdyaWdodCddIC0gRmxvYXQgJ2xlZnQnIG9yICdyaWdodCcsIG11bHRpcGxlIHBhbmVscyBnZXQgYWxpZ25lZCBuZXh0IHRvIGVhY2ggb3RoZXJcclxuICogQHBhcmFtIHtCb29sZWFufSBbcGFyYW1zLmZpeGVkPXRydWVdIC0gSWYgZmFsc2UgdGhlIHBhbmVsIGNhbiBiZSBtb3ZlZFxyXG4gKiBAcGFyYW0ge0FycmF5fSBbcGFyYW1zLnBvc2l0aW9uPVswLDBdXSAtIElmIHVuZml4ZWQsIHRoZSBwYW5lbCBwYW5lbCBwb3NpdGlvbiByZWxhdGl2ZSB0byBhbGlnbm1lbnQgKGVnLiBpZiAnbGVmdCcgMCArIHBvc2l0aW9uWzBdIG9yIGlmICdyaWdodCcgd2luZG93LmlubmVySGVpZ2h0IC0gcG9zaXRpb25bMF0gLSBwYW5lbFdpZHRoKVxyXG4gKiBAcGFyYW0ge051bWJlcn0gW3BhcmFtcy5vcGFjaXR5PTEuMF0gLSBUaGUgcGFuZWzCtHMgb3BhY2l0eVxyXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy5kb2NrPWZhbHNlXSAtIChFeHBlcmltZW50YWwpIEluZGljYXRlcyB3aGV0aGVyIHRoZSBwYW5lbCBzaG91bGQgYmUgZG9ja2VkIHRvIGVpdGhlciB0aGUgbGVmdCBvciByaWdodCB3aW5kb3cgYm9yZGVyIChkZXBlbmRpbmcgb24gcGFyYW1zLmFsaWduKSwgZG9ja2VkIHBhbmVscyBoZWlnaHQgZXF1YWwgd2luZG93IGhlaWdodFxyXG4gICogQHJldHVybnMge1BhbmVsfVxyXG4gKi9cclxuQ29udHJvbEtpdC5wcm90b3R5cGUuYWRkUGFuZWwgPSBmdW5jdGlvbiAocGFyYW1zKSB7XHJcbiAgICB2YXIgcGFuZWwgPSBuZXcgUGFuZWwodGhpcywgcGFyYW1zKTtcclxuICAgIHRoaXMuX3BhbmVscy5wdXNoKHBhbmVsKTtcclxuICAgIHJldHVybiBwYW5lbDtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBVcGRhdGVzIGFsbCBDb250cm9sS2l0IGNvbXBvbmVudHMgaWYgdGhlIHdhdFxyXG4gKi9cclxuQ29udHJvbEtpdC5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgaWYgKCF0aGlzLl9lbmFibGVkIHx8ICF0aGlzLl9jYW5VcGRhdGUpe1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHZhciBpLCBqLCBrO1xyXG4gICAgdmFyIGwsIG0sIG47XHJcbiAgICB2YXIgcGFuZWxzID0gdGhpcy5fcGFuZWxzLFxyXG4gICAgICAgIHBhbmVsLFxyXG4gICAgICAgIGdyb3VwcyxcclxuICAgICAgICBjb21wb25lbnRzLFxyXG4gICAgICAgIGNvbXBvbmVudDtcclxuXHJcbiAgICBpID0gLTE7IGwgPSBwYW5lbHMubGVuZ3RoO1xyXG4gICAgd2hpbGUgKCsraSA8IGwpIHtcclxuICAgICAgICBwYW5lbCA9IHBhbmVsc1tpXTtcclxuXHJcbiAgICAgICAgaWYgKHBhbmVsLmlzRGlzYWJsZWQoKSl7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBncm91cHMgPSBwYW5lbC5nZXRHcm91cHMoKTtcclxuICAgICAgICBqID0gLTE7IG0gPSBncm91cHMubGVuZ3RoO1xyXG5cclxuICAgICAgICB3aGlsZSAoKytqIDwgbSkge1xyXG4gICAgICAgICAgICBjb21wb25lbnRzID0gZ3JvdXBzW2pdLmdldENvbXBvbmVudHMoKTtcclxuICAgICAgICAgICAgayA9IC0xOyBuID0gY29tcG9uZW50cy5sZW5ndGg7XHJcblxyXG4gICAgICAgICAgICB3aGlsZSAoKytrIDwgbikge1xyXG4gICAgICAgICAgICAgICAgY29tcG9uZW50ID0gY29tcG9uZW50c1trXTtcclxuICAgICAgICAgICAgICAgIGlmIChjb21wb25lbnQuaXNEaXNhYmxlZCgpKXtcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChjb21wb25lbnQgaW5zdGFuY2VvZiBWYWx1ZVBsb3R0ZXIgfHxcclxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQgaW5zdGFuY2VvZiBTdHJpbmdPdXRwdXQgfHxcclxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQgaW5zdGFuY2VvZiBTdHJpbmdJbnB1dCB8fFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudCBpbnN0YW5jZW9mIE51bWJlck91dHB1dCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudC51cGRhdGUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChjb21wb25lbnQgaW5zdGFuY2VvZiBTbGlkZXIgfHxcclxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQgaW5zdGFuY2VvZiBTZWxlY3QpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQub25WYWx1ZVVwZGF0ZSh7IGRhdGE6IHsgb3JpZ2luOiBudWxsIH19KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZXR1cm4gdGhlIGZpcnN0IGNvbXBvbmVudCBmb3VuZCB3aXRoIGEgZ2l2ZW4ga2V5IG9yIGxhYmVsLlxyXG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBPcHRpb25zXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmxhYmVsXSAtIExhYmVsXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmtleV0gLSBLZXlcclxuICAqL1xyXG5Db250cm9sS2l0LnByb3RvdHlwZS5nZXRDb21wb25lbnRCeSA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcclxuICAgIHZhciBpLCBqLCBrO1xyXG4gICAgdmFyIGwsIG0sIG47XHJcbiAgICB2YXIgcGFuZWxzID0gdGhpcy5fcGFuZWxzLFxyXG4gICAgICAgIHBhbmVsLFxyXG4gICAgICAgIGdyb3VwcyxcclxuICAgICAgICBjb21wb25lbnRzLFxyXG4gICAgICAgIGNvbXBvbmVudDtcclxuXHJcbiAgICBpID0gLTE7IGwgPSBwYW5lbHMubGVuZ3RoO1xyXG4gICAgd2hpbGUgKCsraSA8IGwpIHtcclxuICAgICAgICBwYW5lbCA9IHBhbmVsc1tpXTtcclxuXHJcbiAgICAgICAgZ3JvdXBzID0gcGFuZWwuZ2V0R3JvdXBzKCk7XHJcbiAgICAgICAgaiA9IC0xOyBtID0gZ3JvdXBzLmxlbmd0aDtcclxuXHJcbiAgICAgICAgd2hpbGUgKCsraiA8IG0pIHtcclxuICAgICAgICAgICAgY29tcG9uZW50cyA9IGdyb3Vwc1tqXS5nZXRDb21wb25lbnRzKCk7XHJcbiAgICAgICAgICAgIGsgPSAtMTsgbiA9IGNvbXBvbmVudHMubGVuZ3RoO1xyXG5cclxuICAgICAgICAgICAgd2hpbGUgKCsrayA8IG4pIHtcclxuICAgICAgICAgICAgICAgIGNvbXBvbmVudCA9IGNvbXBvbmVudHNba107XHJcbiAgICAgICAgICAgICAgICBpZiAoIWNvbXBvbmVudCkgY29udGludWU7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGNvbXBvbmVudC5fa2V5ID09PSBwYXJhbXMua2V5KSByZXR1cm4gY29tcG9uZW50O1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBpZiAoIWNvbXBvbmVudC5fbGFibE5vZGUpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgaWYgKGNvbXBvbmVudC5fbGFibE5vZGUuX2VsZW1lbnQuaW5uZXJUZXh0ID09PSBwYXJhbXMubGFiZWwpIHJldHVybiBjb21wb25lbnQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn07XHJcblxyXG5Db250cm9sS2l0LnByb3RvdHlwZS5oaXN0b3J5SXNFbmFibGVkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX2hpc3RvcnlFbmFibGVkO1xyXG59O1xyXG5cclxuQ29udHJvbEtpdC5wcm90b3R5cGUuc3RhdGVzQXJlRW5hYmxlZCA9IGZ1bmN0aW9uKCl7XHJcbiAgICByZXR1cm4gdGhpcy5fc3RhdGVzRW5hYmxlZDtcclxufTtcclxuXHJcbkNvbnRyb2xLaXQucHJvdG90eXBlLnBhbmVsc0FyZUNsb3NhYmxlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX3BhbmVsc0Nsb3NhYmxlO1xyXG59O1xyXG5cclxuQ29udHJvbEtpdC5wcm90b3R5cGUuX2VuYWJsZSA9IGZ1bmN0aW9uKCl7XHJcbiAgICB2YXIgaSA9IC0xLCBwID0gdGhpcy5fcGFuZWxzLCBsID0gcC5sZW5ndGg7XHJcbiAgICB3aGlsZSAoKytpIDwgbCl7XHJcbiAgICAgICAgcFtpXS5lbmFibGUoKTtcclxuICAgIH1cclxuICAgIHRoaXMuX25vZGUuc2V0U3R5bGVQcm9wZXJ0eSgndmlzaWJpbGl0eScsICcnKTtcclxufTtcclxuXHJcbkNvbnRyb2xLaXQucHJvdG90eXBlLl9kaXNhYmxlID0gZnVuY3Rpb24oKXtcclxuICAgIHZhciBpID0gLTEsIHAgPSB0aGlzLl9wYW5lbHMsIGwgPSBwLmxlbmd0aDtcclxuICAgIHdoaWxlICgrK2kgPCBsKXtcclxuICAgICAgICBwW2ldLmRpc2FibGUoKTtcclxuICAgIH1cclxuICAgIHRoaXMuX25vZGUuc2V0U3R5bGVQcm9wZXJ0eSgndmlzaWJpbGl0eScsICdoaWRkZW4nKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBFbmFibGVzIGFuZCBzaG93cyBjb250cm9sS2l0LlxyXG4gKi9cclxuXHJcbkNvbnRyb2xLaXQucHJvdG90eXBlLmVuYWJsZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuX2VuYWJsZSgpO1xyXG4gICAgdGhpcy5fZW5hYmxlZCA9IHRydWU7XHJcbn07XHJcblxyXG4vKipcclxuICogRGlzYWJsZSBhbmQgaGlkZXMgY29udHJvbEtpdC5cclxuICovXHJcblxyXG5Db250cm9sS2l0LnByb3RvdHlwZS5kaXNhYmxlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5fZGlzYWJsZSgpO1xyXG4gICAgdGhpcy5fZW5hYmxlZCA9IGZhbHNlO1xyXG59O1xyXG5cclxuXHJcbi8qKlxyXG4gKiBTcGVjaWZpZXMgdGhlIGtleSB0byBiZSB1c2VkIHdpdGggY3RybCAmIGNoYXIsIHRvIHRyaWdnZXIgQ29udHJvbEtpdHMgdmlzaWJpbGl0eS5cclxuICogQHBhcmFtIGNoYXJcclxuICovXHJcblxyXG5Db250cm9sS2l0LnByb3RvdHlwZS5zZXRTaG9ydGN1dEVuYWJsZSA9IGZ1bmN0aW9uKGNoYXIpe1xyXG4gICAgdGhpcy5fc2hvcnRjdXRFbmFibGUgPSBjaGFyO1xyXG59O1xyXG5cclxuQ29udHJvbEtpdC5wcm90b3R5cGUub25IaXN0b3J5U3RhdGVQdXNoID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgTWVudUV2ZW50LlVQREFURV9NRU5VLCBudWxsKSk7XHJcbn07XHJcblxyXG5Db250cm9sS2l0LnByb3RvdHlwZS5vbkhpc3RvcnlTdGF0ZVBvcCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlVQREFURV9WQUxVRSwge29yaWdpbjogbnVsbH0pKTtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIE1lbnVFdmVudC5VUERBVEVfTUVOVSwgbnVsbCkpO1xyXG59O1xyXG5cclxuQ29udHJvbEtpdC5wcm90b3R5cGUubG9hZFNldHRpbmdzID0gZnVuY3Rpb24oZGF0YSl7XHJcbiAgICB2YXIgaSA9IC0xLCBsID0gZGF0YS5sZW5ndGg7XHJcbiAgICB2YXIgcGFuZWxzID0gdGhpcy5fcGFuZWxzO1xyXG4gICAgd2hpbGUoKytpIDwgbCl7XHJcbiAgICAgICAgcGFuZWxzW2ldLnNldERhdGEoZGF0YVtpXSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5Db250cm9sS2l0LnByb3RvdHlwZS5fbG9hZFN0YXRlID0gZnVuY3Rpb24oKXtcclxuICAgIFN0YXRlLmxvYWQodGhpcy5sb2FkU2V0dGluZ3MuYmluZCh0aGlzKSk7XHJcbn07XHJcblxyXG5Db250cm9sS2l0LnByb3RvdHlwZS5fc2F2ZVN0YXRlID0gZnVuY3Rpb24oKXtcclxuICAgIHRoaXMudXBkYXRlKCk7IC8vZm9yY2Ugc3luY1xyXG4gICAgdmFyIHAgPSB0aGlzLl9wYW5lbHMsIGkgPSAtMSwgbCA9IHAubGVuZ3RoO1xyXG4gICAgdmFyIGRhdGEgPSBuZXcgQXJyYXkobCk7XHJcbiAgICB3aGlsZSgrK2kgPCBsKXtcclxuICAgICAgICBkYXRhW2ldID0gcFtpXS5nZXREYXRhKCk7XHJcbiAgICB9XHJcbiAgICBTdGF0ZS5zYXZlKHtkYXRhOmRhdGF9KTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZXR1cm5zIHRoZSByb290IGVsZW1lbnQuXHJcbiAqIEByZXR1cm5zIHsqfVxyXG4gKi9cclxuXHJcbkNvbnRyb2xLaXQucHJvdG90eXBlLmdldE5vZGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fbm9kZTtcclxufTtcclxuXHJcbkNvbnRyb2xLaXQuZGVzdHJveSA9IGZ1bmN0aW9uKCl7XHJcbiAgICBNb3VzZS5nZXQoKS5kZXN0cm95KCk7XHJcbiAgICBPcHRpb25zLmdldCgpLmRlc3Ryb3koKTtcclxuICAgIFBpY2tlci5nZXQoKS5kZXN0cm95KCk7XHJcbiAgICBpbml0aWF0ZWQgPSBmYWxzZTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ29udHJvbEtpdDsiLCJ2YXIgRXZlbnRfICAgICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXHJcbiAgICBOb2RlRXZlbnQgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50JyksXHJcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKTtcclxuXHJcbnZhciBOb2RlICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKSxcclxuICAgIENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50Jyk7XHJcblxyXG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcclxuXHJcbnZhciBERUZBVUxUX0xBQkVMID0gJyc7XHJcblxyXG5mdW5jdGlvbiBCdXR0b24ocGFyZW50LGxhYmVsLG9uUHJlc3MscGFyYW1zKSB7XHJcbiAgICBvblByZXNzICAgICAgPSBvblByZXNzIHx8IGZ1bmN0aW9uKCl7fTtcclxuICAgIHBhcmFtcyAgICAgICA9IHBhcmFtcyAgICAgICB8fCB7fTtcclxuICAgIHBhcmFtcy5sYWJlbCA9IHBhcmFtcy5sYWJlbCB8fCBERUZBVUxUX0xBQkVMO1xyXG5cclxuICAgIENvbXBvbmVudC5hcHBseSh0aGlzLFtwYXJlbnQscGFyYW1zLmxhYmVsXSk7XHJcblxyXG4gICAgdmFyIG5vZGUgPSB0aGlzLl9pbnB1dE5vZGUgPSBuZXcgTm9kZShOb2RlLklOUFVUX0JVVFRPTik7XHJcblxyXG4gICAgbm9kZS5zZXRTdHlsZUNsYXNzKENTUy5CdXR0b24pO1xyXG4gICAgbm9kZS5zZXRQcm9wZXJ0eSgndmFsdWUnLGxhYmVsKTtcclxuXHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICBub2RlLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk9OX0NMSUNLLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uUHJlc3MuYmluZChzZWxmKSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8oc2VsZixDb21wb25lbnRFdmVudC5WQUxVRV9VUERBVEVEKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgIHRoaXMuX3dyYXBOb2RlLmFkZENoaWxkKG5vZGUpO1xyXG59XHJcbkJ1dHRvbi5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKENvbXBvbmVudC5wcm90b3R5cGUpO1xyXG5CdXR0b24ucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQnV0dG9uO1xyXG5cclxuQnV0dG9uLnByb3RvdHlwZS5nZXRCdXR0b25MYWJlbCA9IGZ1bmN0aW9uKCl7XHJcbiAgICByZXR1cm4gdGhpcy5faW5wdXROb2RlLmdldFByb3BlcnR5KCd2YWx1ZScpO1xyXG59O1xyXG5cclxuQnV0dG9uLnByb3RvdHlwZS5zZXRCdXR0b25MYWJlbCA9IGZ1bmN0aW9uKGxhYmVsKXtcclxuICAgIHRoaXMuX2lucHV0Tm9kZS5zZXRQcm9wZXJ0eSgndmFsdWUnLGxhYmVsKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQnV0dG9uO1xyXG4iLCJ2YXIgRXZlbnREaXNwYXRjaGVyICAgICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50RGlzcGF0Y2hlcicpO1xyXG52YXIgT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIgPSByZXF1aXJlKCcuLi9jb3JlL09iamVjdENvbXBvbmVudE5vdGlmaWVyJyk7XHJcblxyXG52YXIgRXZlbnRfICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXHJcbiAgICBPcHRpb25FdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvT3B0aW9uRXZlbnQnKSxcclxuICAgIE5vZGVFdmVudCAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKTtcclxuXHJcbnZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XHJcbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xyXG5cclxuZnVuY3Rpb24gQnV0dG9uUHJlc2V0KHBhcmVudE5vZGUpIHtcclxuICAgIEV2ZW50RGlzcGF0Y2hlci5hcHBseSh0aGlzKTtcclxuICAgIHZhciBub2RlICAgID0gdGhpcy5fYnRuTm9kZSA9IG5ldyBOb2RlKE5vZGUuSU5QVVRfQlVUVE9OKSxcclxuICAgICAgICBpbWdOb2RlID0gdGhpcy5faW5kaU5vZGUgPSBuZXcgTm9kZSgpO1xyXG5cclxuICAgIHRoaXMuX29uQWN0aXZlID0gZnVuY3Rpb24gKCkge307XHJcbiAgICB0aGlzLl9vbkRlYWN0aXZlID0gZnVuY3Rpb24gKCkge307XHJcbiAgICB0aGlzLl9pc0FjdGl2ZSA9IGZhbHNlO1xyXG5cclxuICAgIG5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQnV0dG9uUHJlc2V0KTtcclxuICAgIG5vZGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25Nb3VzZURvd24uYmluZCh0aGlzKSk7XHJcblxyXG4gICAgbm9kZS5hZGRDaGlsZChpbWdOb2RlKTtcclxuICAgIHBhcmVudE5vZGUuYWRkQ2hpbGRBdChub2RlLCAwKTtcclxuXHJcbiAgICBPYmplY3RDb21wb25lbnROb3RpZmllci5nZXQoKS5hZGRFdmVudExpc3RlbmVyKE9wdGlvbkV2ZW50LlRSSUdHRVIsIHRoaXMsICdvbk9wdGlvblRyaWdnZXInKTtcclxuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihPcHRpb25FdmVudC5UUklHR0VSRUQsIE9iamVjdENvbXBvbmVudE5vdGlmaWVyLmdldCgpLCAnb25PcHRpb25UcmlnZ2VyZWQnKTtcclxufVxyXG5CdXR0b25QcmVzZXQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudERpc3BhdGNoZXIucHJvdG90eXBlKTtcclxuQnV0dG9uUHJlc2V0LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEJ1dHRvblByZXNldDtcclxuXHJcbkJ1dHRvblByZXNldC5wcm90b3R5cGUub25PcHRpb25UcmlnZ2VyID0gZnVuY3Rpb24oZSl7XHJcbiAgICBpZihlLmRhdGEub3JpZ2luID09IHRoaXMpe1xyXG4gICAgICAgIGlmKCF0aGlzLl9pc0FjdGl2ZSl7XHJcbiAgICAgICAgICAgIHRoaXMuX29uQWN0aXZlKCk7XHJcbiAgICAgICAgICAgIHRoaXMuX2J0bk5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQnV0dG9uUHJlc2V0QWN0aXZlKTtcclxuICAgICAgICAgICAgdGhpcy5faXNBY3RpdmUgPSB0cnVlO1xyXG4gICAgICAgIH0gZWxzZXtcclxuICAgICAgICAgICAgdGhpcy5fb25EZWFjdGl2ZSgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgaWYodGhpcy5faXNBY3RpdmUpe1xyXG4gICAgICAgIHRoaXMuZGVhY3RpdmF0ZSgpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuQnV0dG9uUHJlc2V0LnByb3RvdHlwZS5fb25Nb3VzZURvd24gPSBmdW5jdGlvbigpe1xyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgT3B0aW9uRXZlbnQuVFJJR0dFUkVELCBudWxsKSk7XHJcbn07XHJcblxyXG5CdXR0b25QcmVzZXQucHJvdG90eXBlLnNldE9uQWN0aXZlID0gZnVuY3Rpb24oZnVuYyl7XHJcbiAgICB0aGlzLl9vbkFjdGl2ZSA9IGZ1bmM7XHJcbn07XHJcblxyXG5CdXR0b25QcmVzZXQucHJvdG90eXBlLnNldE9uRGVhY3RpdmUgPSBmdW5jdGlvbihmdW5jKXtcclxuICAgIHRoaXMuX29uRGVhY3RpdmUgPSBmdW5jO1xyXG59O1xyXG5cclxuQnV0dG9uUHJlc2V0LnByb3RvdHlwZS5kZWFjdGl2YXRlID0gZnVuY3Rpb24oKXtcclxuICAgIHRoaXMuX2lzQWN0aXZlID0gZmFsc2U7XHJcbiAgICB0aGlzLl9idG5Ob2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkJ1dHRvblByZXNldCk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEJ1dHRvblByZXNldDtcclxuIiwidmFyIENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50Jyk7XHJcbnZhciBDU1MgICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpLFxyXG4gICAgTWV0cmljICAgID0gcmVxdWlyZSgnLi9NZXRyaWMnKTtcclxuXHJcbnZhciBFdmVudF8gICAgID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxyXG4gICAgR3JvdXBFdmVudCA9IHJlcXVpcmUoJy4uL2dyb3VwL0dyb3VwRXZlbnQnKTtcclxuXHJcbmZ1bmN0aW9uIENhbnZhcyhwYXJlbnQscGFyYW1zKSB7XHJcbiAgICBwYXJhbXMubGFiZWwgPSBwYXJhbXMubGFiZWwgfHwgJyc7XHJcblxyXG4gICAgQ29tcG9uZW50LmFwcGx5KHRoaXMsW3BhcmVudCxwYXJhbXMubGFiZWxdKTtcclxuXHJcbiAgICB2YXIgd3JhcCA9IHRoaXMuX3dyYXBOb2RlO1xyXG4gICAgICAgIHdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuQ2FudmFzV3JhcCk7XHJcbiAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XHJcbiAgICAgICAgd3JhcC5nZXRFbGVtZW50KCkuYXBwZW5kQ2hpbGQoY2FudmFzKTtcclxuXHJcbiAgICB2YXIgd2lkdGggPSB3cmFwLmdldFdpZHRoKCk7XHJcbiAgICB2YXIgaGVpZ2h0ID0gcGFyYW1zLmhlaWdodCB8fCB3aWR0aDtcclxuICAgIHRoaXMuX2NhbnZhc1dpZHRoID0gd2lkdGg7XHJcbiAgICB0aGlzLl9jYW52YXNIZWlnaHQgPSBoZWlnaHQ7XHJcbiAgICB0aGlzLl9zZXRDYW52YXNTaXplKHdpZHRoLHdpZHRoKTtcclxuICAgIHRoaXMuX3VwZGF0ZUhlaWdodCgpO1xyXG5cclxuICAgIHRoaXMuX25vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQ2FudmFzTGlzdEl0ZW0pO1xyXG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSx0aGlzLCAgJ29uR3JvdXBTaXplQ2hhbmdlJyk7XHJcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5HUk9VUF9TSVpFX1VQREFURSx0aGlzLl9wYXJlbnQsJ29uR3JvdXBTaXplVXBkYXRlJyk7XHJcbn1cclxuQ2FudmFzLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoQ29tcG9uZW50LnByb3RvdHlwZSk7XHJcbkNhbnZhcy5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBDYW52YXM7XHJcblxyXG5DYW52YXMucHJvdG90eXBlLl91cGRhdGVIZWlnaHQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgY2FudmFzSGVpZ2h0ID0gdGhpcy5fY2FudmFzLmhlaWdodDtcclxuXHJcbiAgICB0aGlzLl93cmFwTm9kZS5zZXRIZWlnaHQoY2FudmFzSGVpZ2h0KTtcclxuICAgIHRoaXMuX25vZGUuc2V0SGVpZ2h0KGNhbnZhc0hlaWdodCArIE1ldHJpYy5QQURESU5HX1dSQVBQRVIpO1xyXG59O1xyXG5cclxuQ2FudmFzLnByb3RvdHlwZS5fcmVkcmF3ID0gZnVuY3Rpb24oKXt9O1xyXG5cclxuQ2FudmFzLnByb3RvdHlwZS5vbkdyb3VwU2l6ZUNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciB3aWR0aCA9IHRoaXMuX3dyYXBOb2RlLmdldFdpZHRoKCk7XHJcblxyXG4gICAgdGhpcy5fc2V0Q2FudmFzU2l6ZSh3aWR0aCk7XHJcbiAgICB0aGlzLl91cGRhdGVIZWlnaHQoKTtcclxuICAgIHRoaXMuX3JlZHJhdygpO1xyXG5cclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIEdyb3VwRXZlbnQuR1JPVVBfU0laRV9VUERBVEUsIG51bGwpKTtcclxufTtcclxuXHJcbkNhbnZhcy5wcm90b3R5cGUuX3NldENhbnZhc1NpemUgPSBmdW5jdGlvbiAod2lkdGgsIGhlaWdodCkge1xyXG4gICAgdmFyIGNhbnZhc1dpZHRoID0gd2lkdGg7XHJcbiAgICB2YXIgY2FudmFzSGVpZ2h0ID0gKGhlaWdodCkgPyBoZWlnaHQgOiB0aGlzLl9jYW52YXNIZWlnaHQ7XHJcblxyXG4gICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhcztcclxuICAgICAgICBjYW52YXMuc3R5bGUud2lkdGggPSBjYW52YXNXaWR0aCArICdweCc7XHJcbiAgICAgICAgY2FudmFzLnN0eWxlLmhlaWdodCA9IGNhbnZhc0hlaWdodCArICdweCc7XHJcbiAgICAgICAgY2FudmFzLndpZHRoID0gY2FudmFzV2lkdGg7XHJcbiAgICAgICAgY2FudmFzLmhlaWdodCA9IGNhbnZhc0hlaWdodDtcclxufTtcclxuXHJcbkNhbnZhcy5wcm90b3R5cGUuZ2V0Q2FudmFzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX2NhbnZhcztcclxufTtcclxuXHJcbkNhbnZhcy5wcm90b3R5cGUuZ2V0Q29udGV4dCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLl9jYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ2FudmFzO1xyXG4iLCJ2YXIgT2JqZWN0Q29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY29yZS9PYmplY3RDb21wb25lbnQnKSxcclxuICAgIE5vZGUgICAgICAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xyXG5cclxudmFyIEV2ZW50XyAgICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxyXG4gICAgTm9kZUV2ZW50ICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpLFxyXG4gICAgQ29tcG9uZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL0NvbXBvbmVudEV2ZW50Jyk7XHJcblxyXG5mdW5jdGlvbiBDaGVja2JveChwYXJlbnQsIG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xyXG4gICAgT2JqZWN0Q29tcG9uZW50LmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcclxuXHJcbiAgICBwYXJhbXMgPSBwYXJhbXMgfHwge307XHJcbiAgICBwYXJhbXMub25DaGFuZ2UgPSBwYXJhbXMub25DaGFuZ2UgfHwgdGhpcy5fb25DaGFuZ2U7XHJcbiAgICB0aGlzLl9vbkNoYW5nZSA9IHBhcmFtcy5vbkNoYW5nZTtcclxuXHJcbiAgICB2YXIgbm9kZSA9IHRoaXMuX2lucHV0ID0gbmV3IE5vZGUoTm9kZS5JTlBVVF9DSEVDS0JPWCk7XHJcbiAgICBub2RlLnNldFByb3BlcnR5KCdjaGVja2VkJyx0aGlzLl9vYmpbdGhpcy5fa2V5XSk7XHJcbiAgICBub2RlLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50LkNIQU5HRSx0aGlzLl9vbklucHV0Q2hhbmdlLmJpbmQodGhpcykpO1xyXG5cclxuICAgIHRoaXMuX3dyYXBOb2RlLmFkZENoaWxkKHRoaXMuX2lucHV0KTtcclxufVxyXG5DaGVja2JveC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE9iamVjdENvbXBvbmVudC5wcm90b3R5cGUpO1xyXG5DaGVja2JveC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBDaGVja2JveDtcclxuXHJcbkNoZWNrYm94LnByb3RvdHlwZS5hcHBseVZhbHVlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5wdXNoSGlzdG9yeVN0YXRlKCk7XHJcblxyXG4gICAgdmFyIG9iaiA9IHRoaXMuX29iaiwga2V5ID0gdGhpcy5fa2V5O1xyXG4gICAgb2JqW2tleV0gPSAhb2JqW2tleV07XHJcblxyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCwgbnVsbCkpO1xyXG59O1xyXG5cclxuQ2hlY2tib3gucHJvdG90eXBlLl9vbklucHV0Q2hhbmdlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5hcHBseVZhbHVlKCk7XHJcbiAgICB0aGlzLl9vbkNoYW5nZSgpO1xyXG59O1xyXG5cclxuQ2hlY2tib3gucHJvdG90eXBlLm9uVmFsdWVVcGRhdGUgPSBmdW5jdGlvbiAoZSkge1xyXG4gICAgaWYgKGUuZGF0YS5vcmlnaW4gPT0gdGhpcyl7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdGhpcy5faW5wdXQuc2V0UHJvcGVydHkoJ2NoZWNrZWQnLCB0aGlzLl9vYmpbdGhpcy5fa2V5XSk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENoZWNrYm94OyIsInZhciBPYmplY3RDb21wb25lbnQgPSByZXF1aXJlKCcuLy4uL2NvcmUvT2JqZWN0Q29tcG9uZW50Jyk7XHJcblxyXG52YXIgTm9kZSAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XHJcbnZhciBDb2xvck1vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2NvbG9yL0NvbG9yTW9kZScpO1xyXG52YXIgUGlja2VyICAgID0gcmVxdWlyZSgnLi9QaWNrZXInKTtcclxudmFyIENvbG9yVXRpbCA9IHJlcXVpcmUoJy4uL2NvcmUvY29sb3IvQ29sb3JVdGlsJyk7XHJcbnZhciBPcHRpb25zICAgPSByZXF1aXJlKCcuL09wdGlvbnMnKTtcclxudmFyIEJ1dHRvblByZXNldCA9IHJlcXVpcmUoJy4vQnV0dG9uUHJlc2V0Jyk7XHJcbnZhciBNZXRyaWMgPSByZXF1aXJlKCcuL01ldHJpYycpLFxyXG4gICAgQ1NTICAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcclxuXHJcbnZhciBFdmVudF8gICAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcclxuICAgIE5vZGVFdmVudCAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKSxcclxuICAgIENvbXBvbmVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9Db21wb25lbnRFdmVudCcpO1xyXG5cclxudmFyIENvbG9yRm9ybWF0RXJyb3IgPSByZXF1aXJlKCcuLi9jb3JlL2NvbG9yL0NvbG9yRm9ybWF0RXJyb3InKTtcclxuXHJcbnZhciBERUZBVUxUX0NPTE9SX01PREUgPSBDb2xvck1vZGUuSEVYLFxyXG4gICAgREVGQVVMVF9QUkVTRVRTID0gbnVsbDtcclxuXHJcbnZhciBNU0dfQ09MT1JfRk9STUFUX0hFWCA9ICdDb2xvciBmb3JtYXQgc2hvdWxkIGJlIGhleC4gU2V0IGNvbG9yTW9kZSB0byByZ2IsIHJnYmZ2IG9yIGhzdi4nLFxyXG4gICAgTVNHX0NPTE9SX0ZPUk1BVF9SR0JfUkdCRlZfSFNWID0gJ0NvbG9yIGZvcm1hdCBzaG91bGQgYmUgcmdiLCByZ2JmdiBvciBoc3YuIFNldCBjb2xvck1vZGUgdG8gaGV4LicsXHJcbiAgICBNU0dfQ09MT1JfUFJFU0VUX0ZPUk1BVF9IRVggPSAnUHJlc2V0IGNvbG9yIGZvcm1hdCBzaG91bGQgYmUgaGV4LicsXHJcbiAgICBNU0dfQ09MT1JfUFJFU0VUX0ZPUk1BVF9SR0JfUkdCRlZfSFNWID0gJ1ByZXNldCBjb2xvciBmb3JtYXQgc2hvdWxkIGJlIHJnYiwgcmdiZnYgb3IgaHN2Lic7XHJcblxyXG5mdW5jdGlvbiBDb2xvcihwYXJlbnQsIG9iamVjdCwgdmFsdWUsIHBhcmFtcyl7XHJcbiAgICBPYmplY3RDb21wb25lbnQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxuXHJcbiAgICBwYXJhbXMgPSBwYXJhbXMgfHwge307XHJcbiAgICBwYXJhbXMucHJlc2V0cyA9IHBhcmFtcy5wcmVzZXRzIHx8IERFRkFVTFRfUFJFU0VUUztcclxuICAgIHBhcmFtcy5jb2xvck1vZGUgPSBwYXJhbXMuY29sb3JNb2RlIHx8IERFRkFVTFRfQ09MT1JfTU9ERTtcclxuICAgIHBhcmFtcy5vbkNoYW5nZSA9IHBhcmFtcy5vbkNoYW5nZSB8fCB0aGlzLl9vbkNoYW5nZTtcclxuXHJcblxyXG4gICAgdGhpcy5fcHJlc2V0c0tleSA9IHBhcmFtcy5wcmVzZXRzO1xyXG4gICAgdGhpcy5fb25DaGFuZ2UgPSBwYXJhbXMub25DaGFuZ2U7XHJcblxyXG4gICAgdmFyIGNvbG9yID0gdGhpcy5fY29sb3IgPSBuZXcgTm9kZSgpO1xyXG4gICAgdmFsdWUgPSB0aGlzLl92YWx1ZSA9IHRoaXMuX29ialt0aGlzLl9rZXldO1xyXG5cclxuICAgIHZhciBjb2xvck1vZGUgPSB0aGlzLl9jb2xvck1vZGUgPSBwYXJhbXMuY29sb3JNb2RlO1xyXG5cclxuICAgIHRoaXMuX3ZhbGlkYXRlQ29sb3JGb3JtYXQodmFsdWUsIE1TR19DT0xPUl9GT1JNQVRfSEVYLCBNU0dfQ09MT1JfRk9STUFUX1JHQl9SR0JGVl9IU1YpO1xyXG5cclxuICAgIHZhciB3cmFwID0gdGhpcy5fd3JhcE5vZGU7XHJcblxyXG4gICAgaWYoIXRoaXMuX3ByZXNldHNLZXkpe1xyXG4gICAgICAgIGNvbG9yLnNldFN0eWxlQ2xhc3MoQ1NTLkNvbG9yKTtcclxuICAgICAgICB3cmFwLmFkZENoaWxkKGNvbG9yKTtcclxuICAgIH1cclxuICAgIGVsc2V7XHJcbiAgICAgICAgY29sb3Iuc2V0U3R5bGVDbGFzcyhDU1MuQ29sb3IpO1xyXG5cclxuICAgICAgICB2YXIgd3JhcF8gPSBuZXcgTm9kZSgpO1xyXG4gICAgICAgIHdyYXBfLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXBDb2xvcldQcmVzZXQpO1xyXG5cclxuICAgICAgICB3cmFwLmFkZENoaWxkKHdyYXBfKTtcclxuICAgICAgICB3cmFwXy5hZGRDaGlsZChjb2xvcik7XHJcblxyXG4gICAgICAgIHZhciBwcmVzZXRzID0gdGhpcy5fb2JqW3RoaXMuX3ByZXNldHNLZXldO1xyXG5cclxuICAgICAgICB2YXIgaSA9IC0xO1xyXG4gICAgICAgIHdoaWxlKCsraSA8IHByZXNldHMubGVuZ3RoKXtcclxuICAgICAgICAgICAgdGhpcy5fdmFsaWRhdGVDb2xvckZvcm1hdChwcmVzZXRzW2ldLCBNU0dfQ09MT1JfUFJFU0VUX0ZPUk1BVF9IRVgsXHJcbiAgICAgICAgICAgICAgICBNU0dfQ09MT1JfUFJFU0VUX0ZPUk1BVF9SR0JfUkdCRlZfSFNWKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBvcHRpb25zID0gT3B0aW9ucy5nZXQoKSxcclxuICAgICAgICAgICAgcHJlc2V0QnRuID0gbmV3IEJ1dHRvblByZXNldCh3cmFwKTtcclxuXHJcbiAgICAgICAgdmFyIG9uUHJlc2V0RGVhY3RpdmF0ZSA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgIG9wdGlvbnMuY2xlYXIoKTtcclxuICAgICAgICAgICAgcHJlc2V0QnRuLmRlYWN0aXZhdGUoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgdmFyIG9uUHJlc2V0QWN0aXZhdGUgPSBmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICBvcHRpb25zLmJ1aWxkKHByZXNldHMsXHJcbiAgICAgICAgICAgICAgICBzZWxmLl92YWx1ZSxcclxuICAgICAgICAgICAgICAgIGNvbG9yLFxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLnB1c2hIaXN0b3J5U3RhdGUoKTtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLl92YWx1ZSA9IHByZXNldHNbb3B0aW9ucy5nZXRTZWxlY3RlZEluZGV4KCldO1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGYuYXBwbHlWYWx1ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX29uQ2hhbmdlKHNlbGYuX29ialtzZWxmLl9rZXldKTtcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBvblByZXNldERlYWN0aXZhdGUsXHJcbiAgICAgICAgICAgICAgICBNZXRyaWMuUEFERElOR19QUkVTRVQsXHJcbiAgICAgICAgICAgICAgICB0cnVlLFxyXG4gICAgICAgICAgICAgICAgY29sb3JNb2RlKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIHByZXNldEJ0bi5zZXRPbkFjdGl2ZShvblByZXNldEFjdGl2YXRlKTtcclxuICAgICAgICBwcmVzZXRCdG4uc2V0T25EZWFjdGl2ZShvblByZXNldERlYWN0aXZhdGUpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbG9yLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uQ29sb3JUcmlnZ2VyLmJpbmQodGhpcykpO1xyXG4gICAgdGhpcy5fdXBkYXRlQ29sb3IoKTtcclxufVxyXG5Db2xvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE9iamVjdENvbXBvbmVudC5wcm90b3R5cGUpO1xyXG5Db2xvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBDb2xvcjtcclxuXHJcbkNvbG9yLnByb3RvdHlwZS5fb25Db2xvclRyaWdnZXIgPSBmdW5jdGlvbigpe1xyXG4gICAgdmFyIGNvbG9yTW9kZSA9IHRoaXMuX2NvbG9yTW9kZSxcclxuICAgICAgICBjb2xvck1vZGVIRVggPSBDb2xvck1vZGUuSEVYLFxyXG4gICAgICAgIGNvbG9yTW9kZVJHQiA9IENvbG9yTW9kZS5SR0IsXHJcbiAgICAgICAgY29sb3JNb2RlUkdCZnYgPSBDb2xvck1vZGUuUkdCZnYsXHJcbiAgICAgICAgY29sb3JNb2RlSFNWID0gQ29sb3JNb2RlLkhTVjtcclxuXHJcbiAgICB2YXIgdmFsdWUgPSB0aGlzLl92YWx1ZSxcclxuICAgICAgICB0ZW1wO1xyXG5cclxuICAgIHZhciBvblBpY2tlclBpY2sgPSBmdW5jdGlvbigpe1xyXG4gICAgICAgIHRoaXMucHVzaEhpc3RvcnlTdGF0ZSgpO1xyXG5cclxuICAgICAgICBzd2l0Y2goY29sb3JNb2RlKXtcclxuICAgICAgICAgICAgY2FzZSBjb2xvck1vZGVIRVg6XHJcbiAgICAgICAgICAgICAgICB0aGlzLl92YWx1ZSA9IFBpY2tlci5nZXQoKS5nZXRIRVgoKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIGNvbG9yTW9kZVJHQjpcclxuICAgICAgICAgICAgICAgIC8vaWYgdmFsID0gRmxvYXQzMmFycmF5IG9yIHNvXHJcbiAgICAgICAgICAgICAgICB0ZW1wID0gUGlja2VyLmdldCgpLmdldFJHQigpO1xyXG4gICAgICAgICAgICAgICAgdmFsdWVbMF0gPSB0ZW1wWzBdO1xyXG4gICAgICAgICAgICAgICAgdmFsdWVbMV0gPSB0ZW1wWzFdO1xyXG4gICAgICAgICAgICAgICAgdmFsdWVbMl0gPSB0ZW1wWzJdO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICBjYXNlIGNvbG9yTW9kZVJHQmZ2OlxyXG4gICAgICAgICAgICAgICAgdGVtcCA9IFBpY2tlci5nZXQoKS5nZXRSR0JmdigpO1xyXG4gICAgICAgICAgICAgICAgdmFsdWVbMF0gPSB0ZW1wWzBdO1xyXG4gICAgICAgICAgICAgICAgdmFsdWVbMV0gPSB0ZW1wWzFdO1xyXG4gICAgICAgICAgICAgICAgdmFsdWVbMl0gPSB0ZW1wWzJdO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICBjYXNlIGNvbG9yTW9kZUhTVjpcclxuICAgICAgICAgICAgICAgIHRoaXMuX3ZhbHVlID0gUGlja2VyLmdldCgpLmdldEhTVigpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmFwcGx5VmFsdWUoKTtcclxuXHJcbiAgICB9LmJpbmQodGhpcyk7XHJcblxyXG4gICAgdmFyIHBpY2tlciA9IFBpY2tlci5nZXQoKTtcclxuXHJcbiAgICBzd2l0Y2goY29sb3JNb2RlKXtcclxuICAgICAgICBjYXNlIGNvbG9yTW9kZUhFWDpcclxuICAgICAgICAgICAgcGlja2VyLnNldENvbG9ySEVYKHZhbHVlKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBjb2xvck1vZGVSR0I6XHJcbiAgICAgICAgICAgIHBpY2tlci5zZXRDb2xvclJHQih2YWx1ZVswXSwgdmFsdWVbMV0sIHZhbHVlWzJdKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBjb2xvck1vZGVSR0JmdjpcclxuICAgICAgICAgICAgcGlja2VyLnNldENvbG9yUkdCZnYodmFsdWVbMF0sIHZhbHVlWzFdLCB2YWx1ZVsyXSk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgY29sb3JNb2RlSFNWOlxyXG4gICAgICAgICAgICBwaWNrZXIuc2V0Q29sb3JIU1YodmFsdWVbMF0sIHZhbHVlWzFdLCB2YWx1ZVsyXSk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG5cclxuICAgIHBpY2tlci5zZXRDYWxsYmFja1BpY2sob25QaWNrZXJQaWNrKTtcclxuICAgIHBpY2tlci5vcGVuKCk7XHJcbn07XHJcblxyXG5Db2xvci5wcm90b3R5cGUuYXBwbHlWYWx1ZSA9IGZ1bmN0aW9uKCl7XHJcbiAgICB0aGlzLl9vYmpbdGhpcy5fa2V5XSA9IHRoaXMuX3ZhbHVlO1xyXG4gICAgdGhpcy5fdXBkYXRlQ29sb3IoKTtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIG51bGwpKTtcclxuICAgIHRoaXMuX29uQ2hhbmdlKHRoaXMuX29ialt0aGlzLl9rZXldKTtcclxufTtcclxuXHJcbkNvbG9yLnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24oZSl7XHJcbiAgICBpZihlLmRhdGEub3JpZ2luID09IHRoaXMpcmV0dXJuO1xyXG4gICAgdGhpcy5fdmFsdWUgPSB0aGlzLl9vYmpbdGhpcy5fa2V5XTtcclxuICAgIHRoaXMuX3VwZGF0ZUNvbG9yKCk7XHJcbn07XHJcblxyXG5Db2xvci5wcm90b3R5cGUuX3VwZGF0ZUNvbG9yID0gZnVuY3Rpb24oKXtcclxuICAgIHZhciBjb2xvciA9IHRoaXMuX3ZhbHVlLFxyXG4gICAgICAgIGNvbG9yTm9kZSA9IHRoaXMuX2NvbG9yLFxyXG4gICAgICAgIG5vZGVDb2xvcjtcclxuXHJcbiAgICBjb2xvck5vZGUuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsIGNvbG9yKTtcclxuXHJcbiAgICBzd2l0Y2godGhpcy5fY29sb3JNb2RlKXtcclxuICAgICAgICBjYXNlIENvbG9yTW9kZS5IRVg6XHJcbiAgICAgICAgICAgIG5vZGVDb2xvciA9IGNvbG9yO1xyXG4gICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgY2FzZSBDb2xvck1vZGUuUkdCOlxyXG4gICAgICAgICAgICBub2RlQ29sb3IgPSBDb2xvclV0aWwuUkdCMkhFWChjb2xvclswXSwgY29sb3JbMV0sIGNvbG9yWzJdKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgIGNhc2UgQ29sb3JNb2RlLlJHQmZ2OlxyXG4gICAgICAgICAgICBub2RlQ29sb3IgPSBDb2xvclV0aWwuUkdCZnYySEVYKGNvbG9yWzBdLCBjb2xvclsxXSwgY29sb3JbMl0pO1xyXG4gICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgY2FzZSBDb2xvck1vZGUuSFNWOlxyXG4gICAgICAgICAgICBub2RlQ29sb3IgPSBDb2xvclV0aWwuSFNWMlJHQihjb2xvclswXSwgY29sb3JbMV0sIGNvbG9yWzJdKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcblxyXG4gICAgY29sb3JOb2RlLmdldFN0eWxlKCkuYmFja2dyb3VuZENvbG9yID0gbm9kZUNvbG9yO1xyXG59O1xyXG5cclxuQ29sb3IucHJvdG90eXBlLl92YWxpZGF0ZUNvbG9yRm9ybWF0ID0gZnVuY3Rpb24odmFsdWUsIG1zZ0hleCwgbXNnQXJyKXtcclxuICAgIHZhciBjb2xvck1vZGUgPSB0aGlzLl9jb2xvck1vZGU7XHJcblxyXG4gICAgaWYoY29sb3JNb2RlID09IENvbG9yTW9kZS5IRVggJiYgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gJ1tvYmplY3QgQXJyYXldJyB8fFxyXG4gICAgICAgIGNvbG9yTW9kZSA9PSBDb2xvck1vZGUuSEVYICYmIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IEZsb2F0MzJBcnJheV0nKXtcclxuICAgICAgICB0aHJvdyBuZXcgQ29sb3JGb3JtYXRFcnJvcihtc2dIZXgpO1xyXG4gICAgfVxyXG4gICAgaWYoKGNvbG9yTW9kZSA9PSBDb2xvck1vZGUuUkdCIHx8XHJcbiAgICAgICAgY29sb3JNb2RlID09IENvbG9yTW9kZS5SR0JmdiB8fFxyXG4gICAgICAgIGNvbG9yTW9kZSA9PSBDb2xvck1vZGUuSFNWKSAmJlxyXG4gICAgICAgIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgIT09ICdbb2JqZWN0IEFycmF5XScgfHxcclxuICAgICAgICBjb2xvck1vZGUgPT0gQ29sb3JNb2RlLkhTViAmJlxyXG4gICAgICAgIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgIT09ICdbb2JqZWN0IEZsb2F0MzJBcnJheV0nKXtcclxuICAgICAgICB0aHJvdyBuZXcgQ29sb3JGb3JtYXRFcnJvcihtc2dBcnIpO1xyXG4gICAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDb2xvcjtcclxuIiwidmFyIEZ1bmN0aW9uUGxvdFR5cGUgPSB7XHJcbiAgICBJTVBMSUNJVDogJ2ltcGxpY2l0JyxcclxuICAgIE5PTl9JTVBMSUNJVDogJ25vbkltcGxpY2l0J1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBGdW5jdGlvblBsb3RUeXBlOyIsInZhciBQbG90dGVyID0gcmVxdWlyZSgnLi9QbG90dGVyJyk7XHJcblxyXG52YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xyXG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcclxudmFyIEZ1bmN0aW9uUGxvdFR5cGUgPSByZXF1aXJlKCcuL0Z1bmN0aW9uUGxvdFR5cGUnKTtcclxuXHJcblxyXG52YXIgTW91c2UgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L01vdXNlJyk7XHJcbnZhciBNZXRyaWMgPSByZXF1aXJlKCcuL01ldHJpYycpO1xyXG5cclxudmFyIERvY3VtZW50RXZlbnQgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXHJcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKSxcclxuICAgIE5vZGVFdmVudCAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKTtcclxuXHJcbnZhciBGdW5jdGlvblBsb3R0ZXJPYmplY3RFcnJvciAgICAgICA9IHJlcXVpcmUoJy4vRnVuY3Rpb25QbG90dGVyT2JqZWN0RXJyb3InKSxcclxuICAgIEZ1bmN0aW9uUGxvdHRlckZ1bmN0aW9uQXJnc0Vycm9yID0gcmVxdWlyZSgnLi9GdW5jdGlvblBsb3R0ZXJGdW5jdGlvbkFyZ3NFcnJvcicpO1xyXG5cclxudmFyIE9iamVjdENvbXBvbmVudE5vdGlmaWVyID0gcmVxdWlyZSgnLi4vY29yZS9PYmplY3RDb21wb25lbnROb3RpZmllcicpO1xyXG5cclxudmFyIERFRkFVTFRfU0hPV19NSU5fTUFYX0xBQkVMUyA9IHRydWU7XHJcblxyXG52YXIgREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX05PTl9JTVBMSUNJVF9VTklUX1ggID0gIDEsXHJcbiAgICBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfTk9OX0lNUExJQ0lUX1VOSVRfWSAgPSAgMSxcclxuICAgIERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9JTVBMSUNJVF9VTklUX1ggID0gMC4yNSxcclxuICAgIERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9JTVBMSUNJVF9VTklUX1kgID0gMC4yNSxcclxuICAgIERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9VTklUX01JTiAgPSAwLjE1LFxyXG4gICAgREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX1VOSVRfTUFYICA9IDQsXHJcbiAgICBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfTk9OX0lNUExJQ0lUX1NDQUxFICA9IDEwLjAsXHJcbiAgICBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfSU1QTElDSVRfU0NBTEUgPSAxLjAsXHJcbiAgICBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfU0NBTEVfTUlOID0gMC4wMixcclxuICAgIERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9TQ0FMRV9NQVggPSAyNSxcclxuXHJcbiAgICBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfSU1QTElDSVRfQVhFU19DT0xPUiA9ICdyZ2JhKDI1NSwyNTUsMjU1LDAuNzUpJyxcclxuICAgIERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9JTVBMSUNJVF9HUklEX0NPTE9SID0gJ3JnYmEoMjUsMjUsMjUsMC43NSknLFxyXG5cclxuICAgIERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9OT05fSU1QTElDSVRfQVhFU19DT0xPUiA9ICdyZ2IoNTQsNjAsNjQpJyxcclxuICAgIERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9OT05fSU1QTElDSVRfR1JJRF9DT0xPUiA9ICdyZ2IoMjUsMjUsMjUpJyxcclxuXHJcbiAgICBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfQ0lSQ0xFX0xBQkVMX1JBRElVUyA9IDMsXHJcbiAgICBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfQ0lSQ0xFX0xBQkVMX0ZJTEwgICA9ICdyZ2IoMjU1LDI1NSwyNTUpJyxcclxuICAgIERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9DSVJDTEVfU1RST0tFICAgICAgID0gJyNiMTIzMzQnO1xyXG5cclxuZnVuY3Rpb24gRnVuY3Rpb25QbG90dGVyKHBhcmVudCwgb2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XHJcbiAgICBwYXJhbXMgPSBwYXJhbXMgfHwge307XHJcbiAgICBwYXJhbXMuc2hvd01pbk1heExhYmVscyA9IHBhcmFtcy5zaG93TWluTWF4TGFiZWxzID09PSB1bmRlZmluZWQgPyBERUZBVUxUX1NIT1dfTUlOX01BWF9MQUJFTFMgOiBwYXJhbXMuc2hvd01pbk1heExhYmVscztcclxuXHJcbiAgICBQbG90dGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcblxyXG4gICAgaWYgKHR5cGVvZiBvYmplY3RbdmFsdWVdICE9PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEZ1bmN0aW9uUGxvdHRlck9iamVjdEVycm9yKG9iamVjdCx2YWx1ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGZ1bmNBcmdMZW5ndGggPSBvYmplY3RbdmFsdWVdLmxlbmd0aDtcclxuXHJcbiAgICBpZiAoZnVuY0FyZ0xlbmd0aCA+IDIgfHwgZnVuY0FyZ0xlbmd0aCA9PSAwKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEZ1bmN0aW9uUGxvdHRlckZ1bmN0aW9uQXJnc0Vycm9yKCk7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHN2Z1Jvb3QgPSB0aGlzLl9zdmdSb290LFxyXG4gICAgICAgIHBhdGggPSB0aGlzLl9wYXRoO1xyXG5cclxuICAgIHZhciBheGVzID0gdGhpcy5fYXhlcyA9IHN2Z1Jvb3QuaW5zZXJ0QmVmb3JlKHRoaXMuX2NyZWF0ZVNWR09iamVjdCgncGF0aCcpLCBwYXRoKTtcclxuICAgICAgICBheGVzLnN0eWxlLnN0cm9rZVdpZHRoID0gMTtcclxuXHJcbiAgICB2YXIgYXhlc0xhYmVscyA9IHRoaXMuX2F4ZXNMYWJlbHMgPSBzdmdSb290Lmluc2VydEJlZm9yZSh0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ3BhdGgnKSwgcGF0aCk7XHJcbiAgICAgICAgYXhlc0xhYmVscy5zdHlsZS5zdHJva2UgPSAncmdiKDQzLDQ4LDUxKSc7XHJcbiAgICAgICAgYXhlc0xhYmVscy5zdHlsZS5zdHJva2VXaWR0aCA9IDE7XHJcblxyXG4gICAgdmFyIGdyaWQgPSB0aGlzLl9ncmlkO1xyXG5cclxuICAgIHZhciBzdmcgPSB0aGlzLl9zdmcsXHJcbiAgICAgICAgc2l6ZSA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKTtcclxuXHJcbiAgICB2YXIgc2xpZGVyWFdyYXAgPSBuZXcgTm9kZSgpO1xyXG4gICAgICAgIHNsaWRlclhXcmFwLnNldFN0eWxlQ2xhc3MoQ1NTLkdyYXBoU2xpZGVyWFdyYXApO1xyXG5cclxuICAgIHZhciBzbGlkZXJZV3JhcCA9IG5ldyBOb2RlKCk7XHJcbiAgICAgICAgc2xpZGVyWVdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuR3JhcGhTbGlkZXJZV3JhcCk7XHJcblxyXG4gICAgdmFyIHNsaWRlclhUcmFjayA9IHRoaXMuX3NsaWRlclhUcmFjayA9IG5ldyBOb2RlKCk7XHJcbiAgICAgICAgc2xpZGVyWFRyYWNrLnNldFN0eWxlQ2xhc3MoQ1NTLkdyYXBoU2xpZGVyWCk7XHJcblxyXG4gICAgdmFyIHNsaWRlcllUcmFjayA9IHRoaXMuX3NsaWRlcllUcmFjayA9IG5ldyBOb2RlKCk7XHJcbiAgICAgICAgc2xpZGVyWVRyYWNrLnNldFN0eWxlQ2xhc3MoQ1NTLkdyYXBoU2xpZGVyWSk7XHJcblxyXG4gICAgdmFyIHNsaWRlclhIYW5kbGUgPSB0aGlzLl9zbGlkZXJYSGFuZGxlID0gbmV3IE5vZGUoKTtcclxuICAgICAgICBzbGlkZXJYSGFuZGxlLnNldFN0eWxlQ2xhc3MoQ1NTLkdyYXBoU2xpZGVyWEhhbmRsZSk7XHJcblxyXG4gICAgdmFyIHNsaWRlcllIYW5kbGUgPSB0aGlzLl9zbGlkZXJZSGFuZGxlID0gbmV3IE5vZGUoKTtcclxuICAgICAgICBzbGlkZXJZSGFuZGxlLnNldFN0eWxlQ2xhc3MoQ1NTLkdyYXBoU2xpZGVyWUhhbmRsZSk7XHJcblxyXG4gICAgc2xpZGVyWFRyYWNrLmFkZENoaWxkKHNsaWRlclhIYW5kbGUpO1xyXG4gICAgc2xpZGVyWVRyYWNrLmFkZENoaWxkKHNsaWRlcllIYW5kbGUpO1xyXG4gICAgc2xpZGVyWFdyYXAuYWRkQ2hpbGQoc2xpZGVyWFRyYWNrKTtcclxuICAgIHNsaWRlcllXcmFwLmFkZENoaWxkKHNsaWRlcllUcmFjayk7XHJcblxyXG4gICAgdmFyIHdyYXBOb2RlID0gdGhpcy5fd3JhcE5vZGU7XHJcblxyXG4gICAgdmFyIHBsb3RNb2RlID0gdGhpcy5fcGxvdE1vZGUgPSBmdW5jQXJnTGVuZ3RoID09IDEgP1xyXG4gICAgICAgIEZ1bmN0aW9uUGxvdFR5cGUuTk9OX0lNUExJQ0lUIDpcclxuICAgICAgICBGdW5jdGlvblBsb3RUeXBlLklNUExJQ0lUO1xyXG5cclxuICAgIGlmIChwbG90TW9kZSA9PSBGdW5jdGlvblBsb3RUeXBlLklNUExJQ0lUKSB7XHJcbiAgICAgICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xyXG4gICAgICAgIGNhbnZhcy5zdHlsZS53aWR0aCA9IGNhbnZhcy5zdHlsZS5oZWlnaHQgPSBzaXplICsgJ3B4JztcclxuICAgICAgICBjYW52YXMud2lkdGggPSBjYW52YXMuaGVpZ2h0ID0gc2l6ZTtcclxuXHJcbiAgICAgICAgd3JhcE5vZGUuZ2V0RWxlbWVudCgpLmluc2VydEJlZm9yZShjYW52YXMsIHN2Zyk7XHJcblxyXG4gICAgICAgIHRoaXMuX2NhbnZhc0NvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcclxuICAgICAgICB0aGlzLl9jYW52YXNJbWFnZURhdGEgPSB0aGlzLl9jYW52YXNDb250ZXh0LmdldEltYWdlRGF0YSgwLCAwLCBzaXplLCBzaXplKTtcclxuXHJcbiAgICAgICAgYXhlcy5zdHlsZS5zdHJva2UgPSBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfSU1QTElDSVRfQVhFU19DT0xPUjtcclxuICAgICAgICBncmlkLnN0eWxlLnN0cm9rZSA9IERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9JTVBMSUNJVF9HUklEX0NPTE9SO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgYXhlcy5zdHlsZS5zdHJva2UgPSBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfTk9OX0lNUExJQ0lUX0FYRVNfQ09MT1I7XHJcbiAgICAgICAgZ3JpZC5zdHlsZS5zdHJva2UgPSBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfTk9OX0lNUExJQ0lUX0dSSURfQ09MT1I7XHJcbiAgICB9XHJcblxyXG4gICAgd3JhcE5vZGUuYWRkQ2hpbGQoc2xpZGVyWFdyYXApO1xyXG4gICAgd3JhcE5vZGUuYWRkQ2hpbGQoc2xpZGVyWVdyYXApO1xyXG5cclxuICAgIHNsaWRlclhIYW5kbGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25TbGlkZXJYSGFuZGxlRG93bi5iaW5kKHRoaXMpKTtcclxuICAgIHNsaWRlcllIYW5kbGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25TbGlkZXJZSGFuZGxlRG93bi5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICB2YXIgdW5pdHMgPSB0aGlzLl91bml0cyA9IFtudWxsLCBudWxsXTtcclxuICAgIHRoaXMuX3NjYWxlID0gbnVsbDtcclxuXHJcbiAgICBpZiAocGxvdE1vZGUgPT0gRnVuY3Rpb25QbG90VHlwZS5OT05fSU1QTElDSVQpIHtcclxuICAgICAgICB1bml0c1swXSA9IERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9OT05fSU1QTElDSVRfVU5JVF9YO1xyXG4gICAgICAgIHVuaXRzWzFdID0gREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX05PTl9JTVBMSUNJVF9VTklUX1k7XHJcblxyXG4gICAgICAgIHRoaXMuX3NjYWxlID0gREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX05PTl9JTVBMSUNJVF9TQ0FMRTtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKHBsb3RNb2RlID09IEZ1bmN0aW9uUGxvdFR5cGUuSU1QTElDSVQpIHtcclxuICAgICAgICB1bml0c1swXSA9IERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9JTVBMSUNJVF9VTklUX1g7XHJcbiAgICAgICAgdW5pdHNbMV0gPSBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfSU1QTElDSVRfVU5JVF9ZO1xyXG5cclxuICAgICAgICB0aGlzLl9zY2FsZSA9IERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9JTVBMSUNJVF9TQ0FMRTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLl91bml0c01pbk1heCA9IFtERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfVU5JVF9NSU4sIERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9VTklUX01BWF07IC8vMS84LT40XHJcblxyXG4gICAgdGhpcy5fc2NhbGVNaW5NYXggPSBbREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX1NDQUxFX01JTiwgREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX1NDQUxFX01BWF07IC8vMS81MCAtPiAyNVxyXG5cclxuICAgIHRoaXMuX2NlbnRlciA9IFtNYXRoLnJvdW5kKHNpemUgKiAwLjUpLE1hdGgucm91bmQoc2l6ZSAqIDAuNSldO1xyXG4gICAgdGhpcy5fc3ZnUG9zID0gWzAsIDBdO1xyXG5cclxuICAgIHRoaXMuX2Z1bmMgPSBudWxsO1xyXG4gICAgdGhpcy5zZXRGdW5jdGlvbih0aGlzLl9vYmpbdGhpcy5fa2V5XSk7XHJcblxyXG4gICAgdGhpcy5fc2xpZGVyWEhhbmRsZVVwZGF0ZSgpO1xyXG4gICAgdGhpcy5fc2xpZGVyWUhhbmRsZVVwZGF0ZSgpO1xyXG5cclxuICAgIHN2Zy5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25EcmFnU3RhcnQuYmluZCh0aGlzKSwgZmFsc2UpO1xyXG4gICAgdGhpcy5fd3JhcE5vZGUuZ2V0RWxlbWVudCgpLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZXdoZWVsXCIsIHRoaXMuX29uU2NhbGUuYmluZCh0aGlzLCBmYWxzZSkpO1xyXG5cclxuICAgIE9iamVjdENvbXBvbmVudE5vdGlmaWVyLmdldCgpLmFkZEV2ZW50TGlzdGVuZXIoQ29tcG9uZW50RXZlbnQuVVBEQVRFX1ZBTFVFLCB0aGlzLCAnb25WYWx1ZVVwZGF0ZScpO1xyXG59XHJcbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFBsb3R0ZXIucHJvdG90eXBlKTtcclxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEZ1bmN0aW9uUGxvdHRlcjtcclxuXHJcbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX3VwZGF0ZUNlbnRlciA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBzdmcgPSB0aGlzLl9zdmcsXHJcbiAgICAgICAgd2lkdGggPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnd2lkdGgnKSksXHJcbiAgICAgICAgaGVpZ2h0ID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ2hlaWdodCcpKTtcclxuXHJcbiAgICB2YXIgbW91c2VQb3MgPSBNb3VzZS5nZXQoKS5nZXRQb3NpdGlvbigpLFxyXG4gICAgICAgIHN2Z1BvcyA9IHRoaXMuX3N2Z1BvcyxcclxuICAgICAgICBjZW50ZXIgPSB0aGlzLl9jZW50ZXI7XHJcblxyXG4gICAgY2VudGVyWzBdID0gTWF0aC5tYXgoMCwgTWF0aC5taW4obW91c2VQb3NbMF0gLSBzdmdQb3NbMF0sIHdpZHRoKSk7XHJcbiAgICBjZW50ZXJbMV0gPSBNYXRoLm1heCgwLCBNYXRoLm1pbihtb3VzZVBvc1sxXSAtIHN2Z1Bvc1sxXSwgaGVpZ2h0KSk7XHJcblxyXG4gICAgdGhpcy5fcGxvdEdyYXBoKCk7XHJcbn07XHJcblxyXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9vbkRyYWdTdGFydCA9IGZ1bmN0aW9uIChlKSB7XHJcbiAgICB2YXIgc3ZnUG9zID0gdGhpcy5fc3ZnUG9zO1xyXG4gICAgc3ZnUG9zWzBdID0gMDtcclxuICAgIHN2Z1Bvc1sxXSA9IDA7XHJcblxyXG4gICAgLy9za2lwIHRvIGNvbnRhaW5lclxyXG4gICAgdmFyIGVsZW1lbnQgPSB0aGlzLl9zdmcucGFyZW50Tm9kZTtcclxuXHJcbiAgICB3aGlsZSAoZWxlbWVudCkge1xyXG4gICAgICAgIHN2Z1Bvc1swXSArPSBlbGVtZW50Lm9mZnNldExlZnQ7XHJcbiAgICAgICAgc3ZnUG9zWzFdICs9IGVsZW1lbnQub2Zmc2V0VG9wO1xyXG4gICAgICAgIGVsZW1lbnQgPSBlbGVtZW50Lm9mZnNldFBhcmVudDtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgZXZlbnRNb3ZlID0gRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLFxyXG4gICAgICAgIGV2ZW50VXAgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX1VQO1xyXG5cclxuICAgIHZhciBvbkRyYWcgPSB0aGlzLl91cGRhdGVDZW50ZXIuYmluZCh0aGlzKSxcclxuICAgICAgICBvbkRyYWdFbmQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX3VwZGF0ZUNlbnRlci5iaW5kKHRoaXMpO1xyXG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnLCBmYWxzZSk7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRVcCwgb25EcmFnRW5kLCBmYWxzZSk7XHJcblxyXG4gICAgICAgIH0uYmluZCh0aGlzKTtcclxuXHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnLCBmYWxzZSk7XHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50VXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xyXG5cclxuICAgIHRoaXMuX3VwZGF0ZUNlbnRlcigpO1xyXG59O1xyXG5cclxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fb25TY2FsZSA9IGZ1bmN0aW9uIChlKSB7XHJcbiAgICBlID0gd2luZG93LmV2ZW50IHx8IGU7XHJcbiAgICB0aGlzLl9zY2FsZSArPSBNYXRoLm1heCgtMSwgTWF0aC5taW4oMSwgKGUud2hlZWxEZWx0YSB8fCAtZS5kZXRhaWwpKSkgKiAtMTtcclxuXHJcbiAgICB2YXIgc2NhbGVNaW5NYXggPSB0aGlzLl9zY2FsZU1pbk1heDtcclxuICAgIHRoaXMuX3NjYWxlID0gTWF0aC5tYXgoc2NhbGVNaW5NYXhbMF0sIE1hdGgubWluKHRoaXMuX3NjYWxlLCBzY2FsZU1pbk1heFsxXSkpO1xyXG5cclxuICAgIHRoaXMuX3Bsb3RHcmFwaCgpO1xyXG5cclxuICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuXHJcbn07XHJcblxyXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLm9uVmFsdWVVcGRhdGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLnNldEZ1bmN0aW9uKHRoaXMuX29ialt0aGlzLl9rZXldKTtcclxufTtcclxuXHJcbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX3JlZHJhdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGlmICh0aGlzLl9wbG90TW9kZSA9PSBGdW5jdGlvblBsb3RUeXBlLklNUExJQ0lUKSB7XHJcbiAgICAgICAgdmFyIHNpemUgPSB0aGlzLl93cmFwTm9kZS5nZXRXaWR0aCgpLFxyXG4gICAgICAgICAgICBjYW52YXMgPSB0aGlzLl9jYW52YXM7XHJcblxyXG4gICAgICAgIGNhbnZhcy5zdHlsZS53aWR0aCA9IGNhbnZhcy5zdHlsZS5oZWlnaHQgPSBzaXplICsgJ3B4JztcclxuICAgICAgICBjYW52YXMud2lkdGggPSBjYW52YXMuaGVpZ2h0ID0gc2l6ZTtcclxuXHJcbiAgICAgICAgdGhpcy5fY2FudmFzSW1hZ2VEYXRhID0gdGhpcy5fY2FudmFzQ29udGV4dC5nZXRJbWFnZURhdGEoMCwgMCwgc2l6ZSwgc2l6ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5fc2xpZGVyWEhhbmRsZVVwZGF0ZSgpO1xyXG4gICAgdGhpcy5fc2xpZGVyWUhhbmRsZVVwZGF0ZSgpO1xyXG5cclxuICAgIHRoaXMuc2V0RnVuY3Rpb24odGhpcy5fb2JqW3RoaXMuX2tleV0pO1xyXG59O1xyXG5cclxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5zZXRGdW5jdGlvbiA9IGZ1bmN0aW9uIChmdW5jKSB7XHJcbiAgICB0aGlzLl9mdW5jID0gZnVuYy5iaW5kKHRoaXMuX29iaik7XHJcbiAgICB0aGlzLl9wbG90R3JhcGgoKTtcclxufTtcclxuXHJcbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX3Bsb3RHcmFwaCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuX2RyYXdHcmlkKCk7XHJcbiAgICB0aGlzLl9kcmF3QXhlcygpO1xyXG4gICAgdGhpcy5fZHJhd1Bsb3QoKTtcclxufTtcclxuXHJcbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX2RyYXdBeGVzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHN2ZyA9IHRoaXMuX3N2ZyxcclxuICAgICAgICBzdmdXaWR0aCA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKSxcclxuICAgICAgICBzdmdIZWlnaHQgPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnaGVpZ2h0JykpO1xyXG5cclxuICAgIHZhciBjZW50ZXIgPSB0aGlzLl9jZW50ZXIsXHJcbiAgICAgICAgY2VudGVyWCA9IGNlbnRlclswXSxcclxuICAgICAgICBjZW50ZXJZID0gY2VudGVyWzFdO1xyXG5cclxuICAgIHZhciBwYXRoQ21kID0gJyc7XHJcbiAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRMaW5lKDAsIGNlbnRlclksIHN2Z1dpZHRoLCBjZW50ZXJZKTtcclxuICAgIHBhdGhDbWQgKz0gdGhpcy5fcGF0aENtZExpbmUoY2VudGVyWCwgMCwgY2VudGVyWCwgc3ZnSGVpZ2h0KTtcclxuXHJcbiAgICB0aGlzLl9heGVzLnNldEF0dHJpYnV0ZSgnZCcsIHBhdGhDbWQpO1xyXG59O1xyXG5cclxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fZHJhd1Bsb3QgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgd2lkdGgsIGhlaWdodDtcclxuXHJcbiAgICB2YXIgY2VudGVyID0gdGhpcy5fY2VudGVyLFxyXG4gICAgICAgIGNlbnRlclggPSBjZW50ZXJbMF0sXHJcbiAgICAgICAgY2VudGVyWSA9IGNlbnRlclsxXTtcclxuXHJcbiAgICB2YXIgdW5pdHMgPSB0aGlzLl91bml0cyxcclxuICAgICAgICB1bml0WCwgdW5pdFk7XHJcblxyXG4gICAgdmFyIHNjYWxlID0gdGhpcy5fc2NhbGU7XHJcbiAgICB2YXIgbm9ybXZhbCwgc2NhbGVkVmFsLCB2YWx1ZSwgaW5kZXg7XHJcbiAgICB2YXIgb2Zmc2V0WCwgb2Zmc2V0WTtcclxuXHJcbiAgICB2YXIgaTtcclxuXHJcbiAgICBpZiAodGhpcy5fcGxvdE1vZGUgPT0gRnVuY3Rpb25QbG90VHlwZS5OT05fSU1QTElDSVQpIHtcclxuICAgICAgICB2YXIgc3ZnID0gdGhpcy5fc3ZnO1xyXG5cclxuICAgICAgICB3aWR0aCA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKTtcclxuICAgICAgICBoZWlnaHQgPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnaGVpZ2h0JykpO1xyXG4gICAgICAgIHVuaXRYID0gdW5pdHNbMF0gKiBzY2FsZTtcclxuICAgICAgICB1bml0WSA9IGhlaWdodCAvICh1bml0c1sxXSAqIHNjYWxlKTtcclxuICAgICAgICBvZmZzZXRYID0gY2VudGVyWCAvIHdpZHRoO1xyXG5cclxuICAgICAgICB2YXIgbGVuID0gTWF0aC5mbG9vcih3aWR0aCksXHJcbiAgICAgICAgICAgIHBvaW50cyA9IG5ldyBBcnJheShsZW4gKiAyKTtcclxuXHJcbiAgICAgICAgaSA9IC0xO1xyXG4gICAgICAgIHdoaWxlICgrK2kgPCBsZW4pIHtcclxuICAgICAgICAgICAgbm9ybXZhbCA9ICgtb2Zmc2V0WCArIGkgLyBsZW4pO1xyXG4gICAgICAgICAgICBzY2FsZWRWYWwgPSBub3JtdmFsICogdW5pdFg7XHJcbiAgICAgICAgICAgIHZhbHVlID0gY2VudGVyWSAtIHRoaXMuX2Z1bmMoc2NhbGVkVmFsKSAqIHVuaXRZO1xyXG5cclxuICAgICAgICAgICAgaW5kZXggPSBpICogMjtcclxuXHJcbiAgICAgICAgICAgIHBvaW50c1tpbmRleF0gPSBpO1xyXG4gICAgICAgICAgICBwb2ludHNbaW5kZXggKyAxXSA9IHZhbHVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIHBhdGhDbWQgPSAnJztcclxuICAgICAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRNb3ZlVG8ocG9pbnRzWzBdLCBwb2ludHNbMV0pO1xyXG5cclxuICAgICAgICBpID0gMjtcclxuICAgICAgICB3aGlsZSAoaSA8IHBvaW50cy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgcGF0aENtZCArPSB0aGlzLl9wYXRoQ21kTGluZVRvKHBvaW50c1tpXSwgcG9pbnRzW2kgKyAxXSk7XHJcbiAgICAgICAgICAgIGkgKz0gMjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuX3BhdGguc2V0QXR0cmlidXRlKCdkJywgcGF0aENtZCk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzLFxyXG4gICAgICAgICAgICBjb250ZXh0ID0gdGhpcy5fY2FudmFzQ29udGV4dCxcclxuICAgICAgICAgICAgaW1nRGF0YSA9IHRoaXMuX2NhbnZhc0ltYWdlRGF0YTtcclxuXHJcbiAgICAgICAgd2lkdGggPSBjYW52YXMud2lkdGg7XHJcbiAgICAgICAgaGVpZ2h0ID0gY2FudmFzLmhlaWdodDtcclxuXHJcbiAgICAgICAgdW5pdFggPSB1bml0c1swXSAqIHNjYWxlO1xyXG4gICAgICAgIHVuaXRZID0gdW5pdHNbMV0gKiBzY2FsZTtcclxuXHJcbiAgICAgICAgb2Zmc2V0WCA9IGNlbnRlclggLyB3aWR0aDtcclxuICAgICAgICBvZmZzZXRZID0gY2VudGVyWSAvIGhlaWdodDtcclxuXHJcbiAgICAgICAgdmFyIGludldpZHRoID0gMSAvIHdpZHRoLFxyXG4gICAgICAgICAgICBpbnZIZWlnaHQgPSAxIC8gaGVpZ2h0O1xyXG4gICAgICAgIHZhciByZ2IgPSBbMCwgMCwgMF07XHJcblxyXG4gICAgICAgIHZhciBjb2wwID0gWzMwLCAzNCwgMzZdLFxyXG4gICAgICAgICAgICBjb2wxID0gWzI1NSwgMjU1LCAyNTVdO1xyXG5cclxuICAgICAgICBpID0gLTE7XHJcbiAgICAgICAgdmFyIGo7XHJcbiAgICAgICAgd2hpbGUgKCsraSA8IGhlaWdodCkge1xyXG4gICAgICAgICAgICBqID0gLTE7XHJcblxyXG4gICAgICAgICAgICB3aGlsZSAoKytqIDwgd2lkdGgpIHtcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gdGhpcy5fZnVuYygoLW9mZnNldFggKyBqICogaW52V2lkdGgpICogdW5pdFgsXHJcbiAgICAgICAgICAgICAgICAgICAgKC1vZmZzZXRZICsgaSAqIGludkhlaWdodCkgKiB1bml0WSk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmdiWzBdID0gTWF0aC5mbG9vcigoY29sMVswXSAtIGNvbDBbMF0pICogdmFsdWUgKyBjb2wwWzBdKTtcclxuICAgICAgICAgICAgICAgIHJnYlsxXSA9IE1hdGguZmxvb3IoKGNvbDFbMV0gLSBjb2wwWzFdKSAqIHZhbHVlICsgY29sMFsxXSk7XHJcbiAgICAgICAgICAgICAgICByZ2JbMl0gPSBNYXRoLmZsb29yKChjb2wxWzJdIC0gY29sMFsyXSkgKiB2YWx1ZSArIGNvbDBbMl0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGluZGV4ID0gKGkgKiB3aWR0aCArIGopICogNDtcclxuXHJcbiAgICAgICAgICAgICAgICBpbWdEYXRhLmRhdGFbaW5kZXhdID0gcmdiWzBdO1xyXG4gICAgICAgICAgICAgICAgaW1nRGF0YS5kYXRhW2luZGV4ICsgMV0gPSByZ2JbMV07XHJcbiAgICAgICAgICAgICAgICBpbWdEYXRhLmRhdGFbaW5kZXggKyAyXSA9IHJnYlsyXTtcclxuICAgICAgICAgICAgICAgIGltZ0RhdGEuZGF0YVtpbmRleCArIDNdID0gMjU1O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb250ZXh0LmNsZWFyUmVjdCgwLCAwLCB3aWR0aCwgaGVpZ2h0KTtcclxuICAgICAgICBjb250ZXh0LnB1dEltYWdlRGF0YShpbWdEYXRhLCAwLCAwKTtcclxuICAgIH1cclxufTtcclxuXHJcbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX2RyYXdHcmlkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHN2ZyA9IHRoaXMuX3N2ZyxcclxuICAgICAgICB3aWR0aCA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKSxcclxuICAgICAgICBoZWlnaHQgPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnaGVpZ2h0JykpO1xyXG5cclxuICAgIHZhciBzY2FsZSA9IHRoaXMuX3NjYWxlO1xyXG5cclxuICAgIHZhciBncmlkUmVzID0gdGhpcy5fdW5pdHMsXHJcbiAgICAgICAgZ3JpZFNwYWNpbmdYID0gd2lkdGggLyAoZ3JpZFJlc1swXSAqIHNjYWxlKSxcclxuICAgICAgICBncmlkU3BhY2luZ1kgPSBoZWlnaHQgLyAoZ3JpZFJlc1sxXSAqIHNjYWxlKTtcclxuXHJcbiAgICB2YXIgY2VudGVyID0gdGhpcy5fY2VudGVyLFxyXG4gICAgICAgIGNlbnRlclggPSBjZW50ZXJbMF0sXHJcbiAgICAgICAgY2VudGVyWSA9IGNlbnRlclsxXTtcclxuXHJcbiAgICB2YXIgZ3JpZE51bVRvcCA9IE1hdGgucm91bmQoY2VudGVyWSAvIGdyaWRTcGFjaW5nWSkgKyAxLFxyXG4gICAgICAgIGdyaWROdW1Cb3R0b20gPSBNYXRoLnJvdW5kKChoZWlnaHQgLSBjZW50ZXJZKSAvIGdyaWRTcGFjaW5nWSkgKyAxLFxyXG4gICAgICAgIGdyaWROdW1MZWZ0ID0gTWF0aC5yb3VuZChjZW50ZXJYIC8gZ3JpZFNwYWNpbmdYKSArIDEsXHJcbiAgICAgICAgZ3JpZE51bVJpZ2h0ID0gTWF0aC5yb3VuZCgod2lkdGggLSBjZW50ZXJYKSAvIGdyaWRTcGFjaW5nWCkgKyAxO1xyXG5cclxuICAgIHZhciBwYXRoQ21kR3JpZCA9ICcnLFxyXG4gICAgICAgIHBhdGhDbWRBeGVzTGFiZWxzID0gJyc7XHJcblxyXG4gICAgdmFyIGksIHRlbXA7XHJcblxyXG4gICAgdmFyIHN0cm9rZVNpemUgPSBNZXRyaWMuU1RST0tFX1NJWkU7XHJcblxyXG4gICAgdmFyIGxhYmVsVGlja1NpemUgPSBNZXRyaWMuRlVOQ1RJT05fUExPVFRFUl9MQUJFTF9USUNLX1NJWkUsXHJcbiAgICAgICAgbGFiZWxUaWNrUGFkZGluZ1JpZ2h0ID0gd2lkdGggLSBsYWJlbFRpY2tTaXplIC0gc3Ryb2tlU2l6ZSxcclxuICAgICAgICBsYWJlbFRpY2tQYWRkaW5nQm90dG9tID0gaGVpZ2h0IC0gbGFiZWxUaWNrU2l6ZSAtIHN0cm9rZVNpemUsXHJcbiAgICAgICAgbGFiZWxUaWNrUGFkZGluZ1JpZ2h0T2Zmc2V0ID0gbGFiZWxUaWNrUGFkZGluZ1JpZ2h0IC0gbGFiZWxUaWNrU2l6ZSxcclxuICAgICAgICBsYWJlbFRpY2tQYWRkaW5nQm90dG9tT2Zmc2V0ID0gbGFiZWxUaWNrUGFkZGluZ0JvdHRvbSAtIGxhYmVsVGlja1NpemUsXHJcbiAgICAgICAgbGFiZWxUaWNrT2Zmc2V0UmlnaHQgPSBsYWJlbFRpY2tQYWRkaW5nUmlnaHQgLSAobGFiZWxUaWNrU2l6ZSArIHN0cm9rZVNpemUpICogMixcclxuICAgICAgICBsYWJlbFRpY2tPZmZzZXRCb3R0b20gPSBsYWJlbFRpY2tQYWRkaW5nQm90dG9tIC0gKGxhYmVsVGlja1NpemUgKyBzdHJva2VTaXplKSAqIDI7XHJcblxyXG4gICAgaSA9IC0xO1xyXG4gICAgd2hpbGUgKCsraSA8IGdyaWROdW1Ub3ApIHtcclxuICAgICAgICB0ZW1wID0gTWF0aC5yb3VuZChjZW50ZXJZIC0gZ3JpZFNwYWNpbmdZICogaSk7XHJcbiAgICAgICAgcGF0aENtZEdyaWQgKz0gdGhpcy5fcGF0aENtZExpbmUoMCwgdGVtcCwgd2lkdGgsIHRlbXApO1xyXG5cclxuICAgICAgICBpZiAodGVtcCA+IGxhYmVsVGlja1NpemUpe1xyXG4gICAgICAgICAgICBwYXRoQ21kQXhlc0xhYmVscyArPSB0aGlzLl9wYXRoQ21kTGluZShsYWJlbFRpY2tQYWRkaW5nUmlnaHQsIHRlbXAsXHJcbiAgICAgICAgICAgICAgICBsYWJlbFRpY2tQYWRkaW5nUmlnaHRPZmZzZXQsIHRlbXApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpID0gLTE7XHJcbiAgICB3aGlsZSAoKytpIDwgZ3JpZE51bUJvdHRvbSkge1xyXG4gICAgICAgIHRlbXAgPSBNYXRoLnJvdW5kKGNlbnRlclkgKyBncmlkU3BhY2luZ1kgKiBpKTtcclxuICAgICAgICBwYXRoQ21kR3JpZCArPSB0aGlzLl9wYXRoQ21kTGluZSgwLCB0ZW1wLCB3aWR0aCwgdGVtcCk7XHJcblxyXG4gICAgICAgIGlmICh0ZW1wIDwgbGFiZWxUaWNrT2Zmc2V0Qm90dG9tKXtcclxuICAgICAgICAgICAgcGF0aENtZEF4ZXNMYWJlbHMgKz0gdGhpcy5fcGF0aENtZExpbmUobGFiZWxUaWNrUGFkZGluZ1JpZ2h0LCB0ZW1wLFxyXG4gICAgICAgICAgICAgICAgbGFiZWxUaWNrUGFkZGluZ1JpZ2h0T2Zmc2V0LCB0ZW1wKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaSA9IC0xO1xyXG4gICAgd2hpbGUgKCsraSA8IGdyaWROdW1MZWZ0KSB7XHJcbiAgICAgICAgdGVtcCA9IE1hdGgucm91bmQoY2VudGVyWCAtIGdyaWRTcGFjaW5nWCAqIGkpO1xyXG4gICAgICAgIHBhdGhDbWRHcmlkICs9IHRoaXMuX3BhdGhDbWRMaW5lKHRlbXAsIDAsIHRlbXAsIGhlaWdodCk7XHJcblxyXG4gICAgICAgIGlmICh0ZW1wID4gbGFiZWxUaWNrU2l6ZSl7XHJcbiAgICAgICAgICAgIHBhdGhDbWRBeGVzTGFiZWxzICs9IHRoaXMuX3BhdGhDbWRMaW5lKHRlbXAsIGxhYmVsVGlja1BhZGRpbmdCb3R0b20sXHJcbiAgICAgICAgICAgICAgICB0ZW1wLCBsYWJlbFRpY2tQYWRkaW5nQm90dG9tT2Zmc2V0KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaSA9IC0xO1xyXG4gICAgd2hpbGUgKCsraSA8IGdyaWROdW1SaWdodCkge1xyXG4gICAgICAgIHRlbXAgPSBNYXRoLnJvdW5kKGNlbnRlclggKyBncmlkU3BhY2luZ1ggKiBpKTtcclxuICAgICAgICBwYXRoQ21kR3JpZCArPSB0aGlzLl9wYXRoQ21kTGluZSh0ZW1wLCAwLCB0ZW1wLCBoZWlnaHQpO1xyXG5cclxuICAgICAgICBpZiAodGVtcCA8IGxhYmVsVGlja09mZnNldFJpZ2h0KXtcclxuICAgICAgICAgICAgcGF0aENtZEF4ZXNMYWJlbHMgKz0gdGhpcy5fcGF0aENtZExpbmUodGVtcCwgbGFiZWxUaWNrUGFkZGluZ0JvdHRvbSxcclxuICAgICAgICAgICAgICAgIHRlbXAsIGxhYmVsVGlja1BhZGRpbmdCb3R0b21PZmZzZXQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB0aGlzLl9ncmlkLnNldEF0dHJpYnV0ZSgnZCcsIHBhdGhDbWRHcmlkKTtcclxuICAgIHRoaXMuX2F4ZXNMYWJlbHMuc2V0QXR0cmlidXRlKCdkJywgcGF0aENtZEF4ZXNMYWJlbHMpO1xyXG59O1xyXG5cclxuXHJcbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX3NsaWRlclhTdGVwID0gZnVuY3Rpb24gKG1vdXNlUG9zKSB7XHJcbiAgICB2YXIgbW91c2VYID0gbW91c2VQb3NbMF07XHJcblxyXG4gICAgdmFyIGhhbmRsZSA9IHRoaXMuX3NsaWRlclhIYW5kbGUsXHJcbiAgICAgICAgaGFuZGxlV2lkdGggPSBoYW5kbGUuZ2V0V2lkdGgoKSxcclxuICAgICAgICBoYW5kbGVXaWR0aEhhbGYgPSBoYW5kbGVXaWR0aCAqIDAuNTtcclxuXHJcbiAgICB2YXIgdHJhY2sgPSB0aGlzLl9zbGlkZXJYVHJhY2ssXHJcbiAgICAgICAgdHJhY2tXaWR0aCA9IHRyYWNrLmdldFdpZHRoKCksXHJcbiAgICAgICAgdHJhY2tMZWZ0ID0gdHJhY2suZ2V0UG9zaXRpb25HbG9iYWxYKCk7XHJcblxyXG4gICAgdmFyIHN0cm9rZVNpemUgPSBNZXRyaWMuU1RST0tFX1NJWkU7XHJcblxyXG4gICAgdmFyIG1heCA9IHRyYWNrV2lkdGggLSBoYW5kbGVXaWR0aEhhbGYgLSBzdHJva2VTaXplICogMjtcclxuXHJcbiAgICB2YXIgcG9zID0gTWF0aC5tYXgoaGFuZGxlV2lkdGhIYWxmLCBNYXRoLm1pbihtb3VzZVggLSB0cmFja0xlZnQsIG1heCkpLFxyXG4gICAgICAgIGhhbmRsZVBvcyA9IHBvcyAtIGhhbmRsZVdpZHRoSGFsZjtcclxuXHJcbiAgICBoYW5kbGUuc2V0UG9zaXRpb25YKGhhbmRsZVBvcyk7XHJcblxyXG4gICAgdmFyIHVuaXRzTWluID0gdGhpcy5fdW5pdHNNaW5NYXhbMF0sXHJcbiAgICAgICAgdW5pdHNNYXggPSB0aGlzLl91bml0c01pbk1heFsxXTtcclxuXHJcbiAgICB2YXIgbm9ybVZhbCA9IChwb3MgLSBoYW5kbGVXaWR0aEhhbGYpIC8gKG1heCAtIGhhbmRsZVdpZHRoSGFsZiksXHJcbiAgICAgICAgbWFwcGVkVmFsID0gdW5pdHNNaW4gKyAodW5pdHNNYXggLSB1bml0c01pbikgKiBub3JtVmFsO1xyXG5cclxuICAgIHRoaXMuX3VuaXRzWzBdID0gbWFwcGVkVmFsO1xyXG5cclxuICAgIHRoaXMuX3Bsb3RHcmFwaCgpO1xyXG59O1xyXG5cclxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fc2xpZGVyWVN0ZXAgPSBmdW5jdGlvbiAobW91c2VQb3MpIHtcclxuICAgIHZhciBtb3VzZVkgPSBtb3VzZVBvc1sxXTtcclxuXHJcbiAgICB2YXIgaGFuZGxlID0gdGhpcy5fc2xpZGVyWUhhbmRsZSxcclxuICAgICAgICBoYW5kbGVIZWlnaHQgPSBoYW5kbGUuZ2V0SGVpZ2h0KCksXHJcbiAgICAgICAgaGFuZGxlSGVpZ2h0SGFsZiA9IGhhbmRsZUhlaWdodCAqIDAuNTtcclxuXHJcbiAgICB2YXIgdHJhY2sgPSB0aGlzLl9zbGlkZXJZVHJhY2ssXHJcbiAgICAgICAgdHJhY2tIZWlnaHQgPSB0cmFjay5nZXRIZWlnaHQoKSxcclxuICAgICAgICB0cmFja1RvcCA9IHRyYWNrLmdldFBvc2l0aW9uR2xvYmFsWSgpO1xyXG5cclxuICAgIHZhciBtYXggPSB0cmFja0hlaWdodCAtIGhhbmRsZUhlaWdodEhhbGYgLSAyO1xyXG5cclxuICAgIHZhciBwb3MgPSBNYXRoLm1heChoYW5kbGVIZWlnaHRIYWxmLCBNYXRoLm1pbihtb3VzZVkgLSB0cmFja1RvcCwgbWF4KSksXHJcbiAgICAgICAgaGFuZGxlUG9zID0gcG9zIC0gaGFuZGxlSGVpZ2h0SGFsZjtcclxuXHJcbiAgICBoYW5kbGUuc2V0UG9zaXRpb25ZKGhhbmRsZVBvcyk7XHJcblxyXG4gICAgdmFyIHVuaXRzTWF4ID0gdGhpcy5fdW5pdHNNaW5NYXhbMF0sXHJcbiAgICAgICAgdW5pdHNNaW4gPSB0aGlzLl91bml0c01pbk1heFsxXTtcclxuXHJcbiAgICB2YXIgbm9ybVZhbCA9IChwb3MgLSBoYW5kbGVIZWlnaHRIYWxmKSAvIChtYXggLSBoYW5kbGVIZWlnaHRIYWxmKSxcclxuICAgICAgICBtYXBwZWRWYWwgPSB1bml0c01pbiArICh1bml0c01heCAtIHVuaXRzTWluKSAqIG5vcm1WYWw7XHJcblxyXG4gICAgdGhpcy5fdW5pdHNbMV0gPSBtYXBwZWRWYWw7XHJcblxyXG4gICAgdGhpcy5fcGxvdEdyYXBoKCk7XHJcbn07XHJcblxyXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9vblNsaWRlclhIYW5kbGVEb3duID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5fb25TbGlkZXJIYW5kbGVEb3duKHRoaXMuX3NsaWRlclhTdGVwLmJpbmQodGhpcykpO1xyXG59O1xyXG5cclxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fb25TbGlkZXJZSGFuZGxlRG93biA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuX29uU2xpZGVySGFuZGxlRG93bih0aGlzLl9zbGlkZXJZU3RlcC5iaW5kKHRoaXMpKTtcclxufTtcclxuXHJcbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX29uU2xpZGVySGFuZGxlRG93biA9IGZ1bmN0aW9uIChzbGlkZXJTdGVwRnVuYykge1xyXG4gICAgdmFyIGV2ZW50TW91c2VNb3ZlID0gRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLFxyXG4gICAgICAgIGV2ZW50TW91c2VVcCA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XHJcblxyXG4gICAgdmFyIG1vdXNlID0gTW91c2UuZ2V0KCk7XHJcblxyXG4gICAgdmFyIG9uRHJhZyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgc2xpZGVyU3RlcEZ1bmMobW91c2UuZ2V0UG9zaXRpb24oKSlcclxuICAgICAgICB9LFxyXG4gICAgICAgIG9uRHJhZ0VuZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCBmYWxzZSk7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgIHNsaWRlclN0ZXBGdW5jKG1vdXNlLmdldFBvc2l0aW9uKCkpO1xyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCBmYWxzZSk7XHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VVcCwgb25EcmFnRW5kLCBmYWxzZSk7XHJcbn07XHJcblxyXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9zbGlkZXJYSGFuZGxlVXBkYXRlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHVuaXRNaW4gPSB0aGlzLl91bml0c01pbk1heFswXSxcclxuICAgICAgICB1bml0TWF4ID0gdGhpcy5fdW5pdHNNaW5NYXhbMV0sXHJcbiAgICAgICAgdW5pdFggPSB0aGlzLl91bml0c1swXTtcclxuXHJcbiAgICB2YXIgaGFuZGxlWCA9IHRoaXMuX3NsaWRlclhIYW5kbGUsXHJcbiAgICAgICAgaGFuZGxlWFdpZHRoID0gaGFuZGxlWC5nZXRXaWR0aCgpLFxyXG4gICAgICAgIGhhbmRsZVhXaWR0aEhhbGYgPSBoYW5kbGVYV2lkdGggKiAwLjUsXHJcbiAgICAgICAgdHJhY2tYV2lkdGggPSB0aGlzLl9zbGlkZXJYVHJhY2suZ2V0V2lkdGgoKTtcclxuXHJcbiAgICB2YXIgc3Ryb2tlU2l6ZSA9IE1ldHJpYy5TVFJPS0VfU0laRTtcclxuXHJcbiAgICB2YXIgaGFuZGxlWE1pbiA9IGhhbmRsZVhXaWR0aEhhbGYsXHJcbiAgICAgICAgaGFuZGxlWE1heCA9IHRyYWNrWFdpZHRoIC0gaGFuZGxlWFdpZHRoSGFsZiAtIHN0cm9rZVNpemUgKiAyO1xyXG5cclxuICAgIGhhbmRsZVguc2V0UG9zaXRpb25YKChoYW5kbGVYTWluICsgKGhhbmRsZVhNYXggLSBoYW5kbGVYTWluKSAqICgodW5pdFggLSB1bml0TWluKSAvICh1bml0TWF4IC0gdW5pdE1pbikpKSAtIGhhbmRsZVhXaWR0aEhhbGYpO1xyXG59O1xyXG5cclxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fc2xpZGVyWUhhbmRsZVVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciB1bml0TWluID0gdGhpcy5fdW5pdHNNaW5NYXhbMF0sXHJcbiAgICAgICAgdW5pdE1heCA9IHRoaXMuX3VuaXRzTWluTWF4WzFdLFxyXG4gICAgICAgIHVuaXRZID0gdGhpcy5fdW5pdHNbMV07XHJcblxyXG4gICAgdmFyIGhhbmRsZVkgPSB0aGlzLl9zbGlkZXJZSGFuZGxlLFxyXG4gICAgICAgIGhhbmRsZVlIZWlnaHQgPSBoYW5kbGVZLmdldEhlaWdodCgpLFxyXG4gICAgICAgIGhhbmRsZVlIZWlnaHRIYWxmID0gaGFuZGxlWUhlaWdodCAqIDAuNSxcclxuICAgICAgICB0cmFja1lIZWlnaHQgPSB0aGlzLl9zbGlkZXJZVHJhY2suZ2V0SGVpZ2h0KCk7XHJcblxyXG4gICAgdmFyIHN0cm9rZVNpemUgPSBNZXRyaWMuU1RST0tFX1NJWkU7XHJcblxyXG4gICAgdmFyIGhhbmRsZVlNaW4gPSB0cmFja1lIZWlnaHQgLSBoYW5kbGVZSGVpZ2h0SGFsZiAtIHN0cm9rZVNpemUgKiAyLFxyXG4gICAgICAgIGhhbmRsZVlNYXggPSBoYW5kbGVZSGVpZ2h0SGFsZjtcclxuXHJcbiAgICBoYW5kbGVZLnNldFBvc2l0aW9uWSgoaGFuZGxlWU1pbiArIChoYW5kbGVZTWF4IC0gaGFuZGxlWU1pbikgKiAoKHVuaXRZIC0gdW5pdE1pbikgLyAodW5pdE1heCAtIHVuaXRNaW4pKSkgLSBoYW5kbGVZSGVpZ2h0SGFsZik7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEZ1bmN0aW9uUGxvdHRlcjsiLCJmdW5jdGlvbiBGdW5jdGlvblBsb3R0ZXJGdW5jdGlvbkFyZ3NFcnJvcigpe1xyXG5cdEVycm9yLmFwcGx5KHRoaXMpO1xyXG5cdEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3IpO1xyXG5cdHRoaXMubmFtZSA9ICdGdW5jdGlvblBsb3R0ZXJGdW5jdGlvbkFyZ3NFcnJvcic7XHJcblx0dGhpcy5tZXNzYWdlID0gJ0Z1bmN0aW9uIHNob3VsZCBiZSBvZiBmb3JtIGYoeCkgb3IgZih4LHkpLic7XHJcbn1cclxuRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFcnJvci5wcm90b3R5cGUpO1xyXG5GdW5jdGlvblBsb3R0ZXJGdW5jdGlvbkFyZ3NFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBGdW5jdGlvblBsb3R0ZXJGdW5jdGlvbkFyZ3NFcnJvcjtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3I7IiwiZnVuY3Rpb24gRnVuY3Rpb25QbG90dGVyT2JqZWN0RXJyb3Iob2JqZWN0LGtleSl7XHJcblx0RXJyb3IuYXBwbHkodGhpcyk7XHJcblx0RXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcyxGdW5jdGlvblBsb3R0ZXJPYmplY3RFcnJvcik7XHJcblx0dGhpcy5uYW1lID0gJ0NvbXBvbmVudE9iamVjdEVycm9yJztcclxuXHR0aGlzLm1lc3NhZ2UgPSAnT2JqZWN0ICcgKyBvYmplY3QuY29uc3RydWN0b3IubmFtZSArICcgJyArIGtleSArICdzaG91bGQgYmUgb2YgdHlwZSBGdW5jdGlvbi4nO1xyXG59XHJcbkZ1bmN0aW9uUGxvdHRlck9iamVjdEVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcclxuRnVuY3Rpb25QbG90dGVyT2JqZWN0RXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRnVuY3Rpb25QbG90dGVyT2JqZWN0RXJyb3I7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEZ1bmN0aW9uUGxvdHRlck9iamVjdEVycm9yOyIsInZhciBNZXRyaWMgPSB7XHJcblx0Q09NUE9ORU5UX01JTl9IRUlHSFQ6IDI1LFxyXG5cdFNUUk9LRV9TSVpFOiAxLFxyXG5cdFBBRERJTkdfV1JBUFBFUjogMTIsXHJcblx0UEFERElOR19PUFRJT05TOiAyLFxyXG5cdFBBRERJTkdfUFJFU0VUOiAyMCxcclxuXHJcblx0U0NST0xMQkFSX1RSQUNLX1BBRERJTkc6IDIsXHJcblx0RlVOQ1RJT05fUExPVFRFUl9MQUJFTF9USUNLX1NJWkU6IDZcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTWV0cmljOyIsInZhciBPYmplY3RDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jb3JlL09iamVjdENvbXBvbmVudCcpO1xyXG52YXIgTnVtYmVySW5wdXRfSW50ZXJuYWwgPSByZXF1aXJlKCcuL051bWJlcklucHV0X0ludGVybmFsJyk7XHJcblxyXG52YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xyXG5cclxudmFyIE9wdGlvbnMgPSByZXF1aXJlKCcuL09wdGlvbnMnKTtcclxudmFyIEJ1dHRvblByZXNldCA9IHJlcXVpcmUoJy4vQnV0dG9uUHJlc2V0Jyk7XHJcbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpLFxyXG4gICAgTWV0cmljID0gcmVxdWlyZSgnLi9NZXRyaWMnKTtcclxuXHJcbnZhciBFdmVudF8gPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXHJcbiAgICBEb2N1bWVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXHJcbiAgICBOb2RlRXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpLFxyXG4gICAgQ29tcG9uZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL0NvbXBvbmVudEV2ZW50Jyk7XHJcblxyXG52YXIgREVGQVVMVF9JTlBVVF9EUCAgICAgPSAyLFxyXG4gICAgREVGQVVMVF9JTlBVVF9TVEVQICAgPSAxLFxyXG4gICAgREVGQVVMVF9JTlBVVF9QUkVTRVQgPSBudWxsO1xyXG5cclxuXHJcblxyXG5mdW5jdGlvbiBOdW1iZXJJbnB1dChwYXJlbnQsb2JqZWN0LHZhbHVlLHBhcmFtcykge1xyXG4gICAgT2JqZWN0Q29tcG9uZW50LmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcclxuXHJcbiAgICBwYXJhbXMgICAgICAgICAgPSBwYXJhbXMgfHwge307XHJcbiAgICBwYXJhbXMub25CZWdpbiAgPSBwYXJhbXMub25CZWdpbiB8fCBudWxsO1xyXG4gICAgcGFyYW1zLm9uQ2hhbmdlID0gcGFyYW1zLm9uQ2hhbmdlIHx8IHRoaXMuX29uQ2hhbmdlO1xyXG4gICAgcGFyYW1zLm9uRmluaXNoID0gcGFyYW1zLm9uRmluaXNoIHx8IG51bGw7XHJcbiAgICBwYXJhbXMub25FcnJvciAgPSBwYXJhbXMub25FcnJvciB8fCBudWxsO1xyXG4gICAgcGFyYW1zLmRwICAgICAgID0gKHBhcmFtcy5kcCA9PT0gdW5kZWZpbmVkIHx8IHBhcmFtcy5kcCA9PSBudWxsKSA/IERFRkFVTFRfSU5QVVRfRFAgOiBwYXJhbXMuZHA7XHJcbiAgICBwYXJhbXMuc3RlcCAgICAgPSBwYXJhbXMuc3RlcCAgICAgfHwgREVGQVVMVF9JTlBVVF9TVEVQO1xyXG4gICAgcGFyYW1zLnByZXNldHMgID0gcGFyYW1zLnByZXNldHMgIHx8IERFRkFVTFRfSU5QVVRfUFJFU0VUO1xyXG5cclxuICAgIHRoaXMuX29uQmVnaW4gICAgID0gcGFyYW1zLm9uQmVnaW47XHJcbiAgICB0aGlzLl9vbkNoYW5nZSAgICA9IHBhcmFtcy5vbkNoYW5nZTtcclxuICAgIHRoaXMuX3ByZXNldHNLZXkgID0gcGFyYW1zLnByZXNldHM7XHJcblxyXG4gICAgdmFyIGlucHV0ID0gdGhpcy5faW5wdXQgPSBuZXcgTnVtYmVySW5wdXRfSW50ZXJuYWwocGFyYW1zLnN0ZXAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMuZHAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMub25CZWdpbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX29uSW5wdXRDaGFuZ2UuYmluZCh0aGlzKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5vbkZpbmlzaCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5vbkVycm9yKTtcclxuXHJcbiAgICB2YXIgd3JhcCA9IHRoaXMuX3dyYXBOb2RlO1xyXG5cclxuICAgIHZhciBwcmVzZXRzID0gIHBhcmFtcy5wcmVzZXRzO1xyXG4gICAgaWYgKCFwcmVzZXRzKSB7XHJcbiAgICAgICAgd3JhcC5hZGRDaGlsZChpbnB1dC5nZXROb2RlKCkpO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgdmFyIHdyYXBfID0gbmV3IE5vZGUoKTtcclxuICAgICAgICAgICAgd3JhcF8uc2V0U3R5bGVDbGFzcyhDU1MuV3JhcElucHV0V1ByZXNldCk7XHJcblxyXG4gICAgICAgIHdyYXAuYWRkQ2hpbGQod3JhcF8pO1xyXG4gICAgICAgIHdyYXBfLmFkZENoaWxkKGlucHV0LmdldE5vZGUoKSk7XHJcblxyXG4gICAgICAgIHZhciBvcHRpb25zICAgPSBPcHRpb25zLmdldCgpO1xyXG4gICAgICAgIHZhciBwcmVzZXRCdG4gPSB0aGlzLl9idG5QcmVzZXQgPSBuZXcgQnV0dG9uUHJlc2V0KHRoaXMuX3dyYXBOb2RlKTtcclxuXHJcbiAgICAgICAgdmFyIG9uUHJlc2V0RGVhY3RpdmF0ZSA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgIG9wdGlvbnMuY2xlYXIoKTtcclxuICAgICAgICAgICAgcHJlc2V0QnRuLmRlYWN0aXZhdGUoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgdmFyIG9uUHJlc2V0QWN0aXZhdGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIG9wdGlvbnMuYnVpbGQocHJlc2V0cywgaW5wdXQuZ2V0VmFsdWUoKSwgaW5wdXQuZ2V0Tm9kZSgpLFxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlucHV0LnNldFZhbHVlKHByZXNldHNbb3B0aW9ucy5nZXRTZWxlY3RlZEluZGV4KCldKTtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLmFwcGx5VmFsdWUoKTtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLl9vbkNoYW5nZShzZWxmLl9vYmpbc2VsZi5fa2V5XSk7XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgb25QcmVzZXREZWFjdGl2YXRlLCBNZXRyaWMuUEFERElOR19QUkVTRVQsXHJcbiAgICAgICAgICAgICAgICBmYWxzZSk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBwcmVzZXRCdG4uc2V0T25BY3RpdmUob25QcmVzZXRBY3RpdmF0ZSk7XHJcbiAgICAgICAgcHJlc2V0QnRuLnNldE9uRGVhY3RpdmUob25QcmVzZXREZWFjdGl2YXRlKVxyXG4gICAgfVxyXG5cclxuICAgIGlucHV0LmdldE5vZGUoKS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLCAgIHRoaXMuX29uSW5wdXREcmFnU3RhcnQuYmluZCh0aGlzKSk7XHJcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoQ29tcG9uZW50RXZlbnQuSU5QVVRfU0VMRUNUX0RSQUcsdGhpcy5fcGFyZW50LCdvbkNvbXBvbmVudFNlbGVjdERyYWcnKTtcclxuXHJcbiAgICBpbnB1dC5zZXRWYWx1ZSh0aGlzLl9vYmpbdGhpcy5fa2V5XSk7XHJcbn1cclxuTnVtYmVySW5wdXQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShPYmplY3RDb21wb25lbnQucHJvdG90eXBlKTtcclxuTnVtYmVySW5wdXQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gTnVtYmVySW5wdXQ7XHJcblxyXG5OdW1iZXJJbnB1dC5wcm90b3R5cGUuX29uSW5wdXRDaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLmFwcGx5VmFsdWUoKTtcclxuICAgIHRoaXMuX29uQ2hhbmdlKHRoaXMuX29ialt0aGlzLl9rZXldKTtcclxufTtcclxuXHJcbk51bWJlcklucHV0LnByb3RvdHlwZS5hcHBseVZhbHVlID0gZnVuY3Rpb24oKSB7XHJcbiAgICB0aGlzLnB1c2hIaXN0b3J5U3RhdGUoKTtcclxuICAgIHRoaXMuX29ialt0aGlzLl9rZXldID0gdGhpcy5faW5wdXQuZ2V0VmFsdWUoKTtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCxudWxsKSk7XHJcbn07XHJcblxyXG5OdW1iZXJJbnB1dC5wcm90b3R5cGUub25WYWx1ZVVwZGF0ZSA9IGZ1bmN0aW9uIChlKSB7XHJcbiAgICBpZiAoZS5kYXRhLm9yaWdpbiA9PSB0aGlzKXtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB0aGlzLl9pbnB1dC5zZXRWYWx1ZSh0aGlzLl9vYmpbdGhpcy5fa2V5XSk7XHJcbn07XHJcblxyXG4vL1ByZXZlbnQgY2hyb21lIHNlbGVjdCBkcmFnXHJcbk51bWJlcklucHV0LnByb3RvdHlwZS5fb25JbnB1dERyYWdTdGFydCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBldmVudE1vdmUgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsXHJcbiAgICAgICAgZXZlbnRVcCA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XHJcblxyXG4gICAgdmFyIGV2ZW50ID0gQ29tcG9uZW50RXZlbnQuSU5QVVRfU0VMRUNUX0RSQUc7XHJcblxyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICAgIHZhciBvbkRyYWcgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHNlbGYuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIGV2ZW50LCBudWxsKSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBvbkRyYWdGaW5pc2ggPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHNlbGYuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIGV2ZW50LCBudWxsKSk7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcclxuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdmUsIG9uRHJhZ0ZpbmlzaCwgZmFsc2UpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgZXZlbnQsIG51bGwpKTtcclxuXHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnLCBmYWxzZSk7XHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50VXAsIG9uRHJhZ0ZpbmlzaCwgZmFsc2UpO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBOdW1iZXJJbnB1dDsiLCJ2YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudERpc3BhdGNoZXInKSxcclxuICAgIE5vZGVFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50Jyk7XHJcbnZhciBOb2RlICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcclxuXHJcbnZhciBQUkVTRVRfU0hJRlRfTVVMVElQTElFUiAgPSAxMDtcclxudmFyIE5VTV9SRUdFWCA9IC9eLT9cXGQqXFwuP1xcZCokLztcclxuXHJcbnZhciBzZXRDYXJldFBvcyA9IG51bGwsXHJcbiAgICBzZWxlY3RBbGwgPSBudWxsO1xyXG5cclxuZnVuY3Rpb24gaW5wdXRTZXRWYWx1ZShpbnB1dCx2YWx1ZSl7XHJcbiAgICBpbnB1dC5zZXRQcm9wZXJ0eSgndmFsdWUnLHZhbHVlKTtcclxuICAgIGlucHV0LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdpbnB1dCcpKTtcclxufVxyXG5cclxuTnVtYmVySW5wdXRfSW50ZXJuYWwgPSBmdW5jdGlvbiAoc3RlcFZhbHVlLCBkcCwgb25CZWdpbiwgb25DaGFuZ2UsIG9uRmluaXNoLCBvbkVycm9yKSB7XHJcbiAgICBFdmVudERpc3BhdGNoZXIuYXBwbHkodGhpcywgbnVsbCk7XHJcblxyXG4gICAgdGhpcy5fdmFsdWUgPSAwO1xyXG4gICAgdGhpcy5fdmFsdWVTdGVwID0gc3RlcFZhbHVlO1xyXG4gICAgdGhpcy5fdmFsdWVEcCAgID0gZHA7XHJcblxyXG4gICAgdGhpcy5fb25CZWdpbiA9IG9uQmVnaW4gfHwgZnVuY3Rpb24gKCl7fTtcclxuICAgIHRoaXMuX29uQ2hhbmdlID0gb25DaGFuZ2UgfHwgZnVuY3Rpb24gKCkge307XHJcbiAgICB0aGlzLl9vbkZpbmlzaCA9IG9uRmluaXNoIHx8IGZ1bmN0aW9uKCkge307XHJcbiAgICB0aGlzLl9vbkVycm9yID0gb25FcnJvciB8fCBmdW5jdGlvbigpIHt9O1xyXG5cclxuICAgIHRoaXMuX2tleUNvZGUgPSBudWxsO1xyXG4gICAgdGhpcy5fY2FyZXRPZmZzZXQgPSAwO1xyXG5cclxuICAgIHZhciBpbnB1dCA9IHRoaXMuX2lucHV0ID0gbmV3IE5vZGUoJ3RleHQnKTtcclxuICAgICAgICBpbnB1dC5zZXRQcm9wZXJ0eSgndmFsdWUnLCB0aGlzLl92YWx1ZSk7XHJcblxyXG4gICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLHRoaXMuX29uSW5wdXQuYmluZCh0aGlzKSk7XHJcbiAgICBpbnB1dC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJyx0aGlzLl9vbktleWRvd24uYmluZCh0aGlzKSk7XHJcblxyXG4gICAgaWYoIXNldENhcmV0UG9zKXtcclxuICAgICAgICBpZihpbnB1dC5nZXRFbGVtZW50KCkuc2V0U2VsZWN0aW9uUmFuZ2Upe1xyXG4gICAgICAgICAgICBzZXRDYXJldFBvcyA9IGZ1bmN0aW9uKGlucHV0LHBvcyl7XHJcbiAgICAgICAgICAgICAgICBpbnB1dC5nZXRFbGVtZW50KCkuc2V0U2VsZWN0aW9uUmFuZ2UocG9zLHBvcyk7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHNlbGVjdEFsbCA9IGZ1bmN0aW9uKGlucHV0KXtcclxuICAgICAgICAgICAgICAgIGlucHV0LmdldEVsZW1lbnQoKS5zZXRTZWxlY3Rpb25SYW5nZSgwLGlucHV0LmdldFByb3BlcnR5KCd2YWx1ZScpLmxlbmd0aCk7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc2V0Q2FyZXRQb3MgPSBmdW5jdGlvbihpbnB1dCxwb3Mpe1xyXG4gICAgICAgICAgICAgICAgdmFyIHJhbmdlID0gaW5wdXQuZ2V0RWxlbWVudCgpLmNyZWF0ZVRleHRSYW5nZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJhbmdlLmNvbGxhcHNlKHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJhbmdlLm1vdmVFbmQoJ2NoYXJhY3RlcicscG9zKTtcclxuICAgICAgICAgICAgICAgICAgICByYW5nZS5tb3ZlU3RhcnQoJ2NoYXJhY3RlcicscG9zKTtcclxuICAgICAgICAgICAgICAgICAgICByYW5nZS5zZWxlY3QoKTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgc2VsZWN0QWxsID0gZnVuY3Rpb24oaW5wdXQpe1xyXG4gICAgICAgICAgICAgICAgdmFyIHJhbmdlID0gaW5wdXQuZ2V0RWxlbWVudCgpLmNyZWF0ZVRleHRSYW5nZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJhbmdlLmNvbGxhcHNlKHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJhbmdlLm1vdmVTdGFydCgnY2hhcmFjdGVyJywwKTtcclxuICAgICAgICAgICAgICAgICAgICByYW5nZS5tb3ZlRW5kKCdjaGFyYWN0ZXInLGlucHV0LmdldFByb3BlcnR5KCd2YWx1ZScpLmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2Uuc2VsZWN0KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn07XHJcbk51bWJlcklucHV0X0ludGVybmFsLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZSk7XHJcbk51bWJlcklucHV0X0ludGVybmFsLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IE51bWJlcklucHV0X0ludGVybmFsO1xyXG5cclxuTnVtYmVySW5wdXRfSW50ZXJuYWwucHJvdG90eXBlLl9zZXRWYWx1ZSA9IGZ1bmN0aW9uKHZhbHVlKXtcclxuICAgIHZhciBwcmVmaXggPSAgKCh2YWx1ZSA9ICt2YWx1ZSkgfHwgMSAvIHZhbHVlKSA8IDAgJiYgdmFsdWUgPT0gMCA/ICctJyA6ICcnOyAvLy0wXHJcbiAgICAgICAgdmFsdWUgPSBOdW1iZXIodmFsdWUpLnRvRml4ZWQodGhpcy5fdmFsdWVEcCk7XHJcbiAgICB0aGlzLl9pbnB1dC5zZXRQcm9wZXJ0eSgndmFsdWUnLHByZWZpeCArIHZhbHVlKTtcclxuICAgIHRoaXMuX3ZhbHVlID0gTnVtYmVyKHZhbHVlKTtcclxufTtcclxuXHJcbk51bWJlcklucHV0X0ludGVybmFsLnByb3RvdHlwZS5fb25JbnB1dCA9IGZ1bmN0aW9uKCl7XHJcbiAgICB2YXIgaW5wdXQgPSB0aGlzLl9pbnB1dCxcclxuICAgICAgICB2YWx1ZSA9IGlucHV0LmdldFByb3BlcnR5KCd2YWx1ZScpLFxyXG4gICAgICAgIHN0YXJ0ID0gaW5wdXQuZ2V0UHJvcGVydHkoJ3NlbGVjdGlvblN0YXJ0JyksXHJcbiAgICAgICAgZHAgICAgPSB0aGlzLl92YWx1ZURwO1xyXG5cclxuICAgIHZhciBmaXJzdCA9IHZhbHVlWzBdO1xyXG5cclxuICAgIGlmKHZhbHVlID09ICcnKXtcclxuICAgICAgICB2YWx1ZSA9IDA7XHJcbiAgICB9IGVsc2UgaWYoZmlyc3QgPT09ICcuJyl7XHJcbiAgICAgICAgdmFsdWUgPSAnMCcgKyB2YWx1ZTtcclxuICAgIH1cclxuXHJcbiAgICBpZighTlVNX1JFR0VYLnRlc3QodmFsdWUpIHx8IHZhbHVlID09ICctJyl7XHJcbiAgICAgICAgaW5wdXQuc2V0UHJvcGVydHkoJ3ZhbHVlJyx0aGlzLl92YWx1ZS50b0ZpeGVkKGRwKSk7XHJcbiAgICAgICAgc2V0Q2FyZXRQb3MoaW5wdXQsTWF0aC5tYXgoLS1zdGFydCwwKSk7XHJcbiAgICAgICAgdGhpcy5fb25FcnJvcih0aGlzLl9rZXlDb2RlKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB0aGlzLl9vbkJlZ2luKHRoaXMuX3ZhbHVlKTtcclxuICAgIHRoaXMuX3NldFZhbHVlKHZhbHVlKTtcclxuICAgIHNldENhcmV0UG9zKGlucHV0LHN0YXJ0IC0gdGhpcy5fY2FyZXRPZmZzZXQpO1xyXG4gICAgdGhpcy5fb25DaGFuZ2UoKTtcclxufTtcclxuXHJcbk51bWJlcklucHV0X0ludGVybmFsLnByb3RvdHlwZS5fb25LZXlkb3duID0gZnVuY3Rpb24oZSl7XHJcbiAgICB2YXIga2V5Q29kZSA9IHRoaXMuX2tleUNvZGUgPSBlLmtleUNvZGU7XHJcblxyXG4gICAgaWYoa2V5Q29kZSA9PSAxMyl7XHJcbiAgICAgICAgdGhpcy5fb25GaW5pc2goKTtcclxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBpbnB1dCAgPSB0aGlzLl9pbnB1dCxcclxuICAgICAgICB2YWx1ZSAgPSBpbnB1dC5nZXRQcm9wZXJ0eSgndmFsdWUnKTtcclxuICAgIHZhciBzdGFydCAgPSBpbnB1dC5nZXRQcm9wZXJ0eSgnc2VsZWN0aW9uU3RhcnQnKSxcclxuICAgICAgICBlbmQgICAgPSBpbnB1dC5nZXRQcm9wZXJ0eSgnc2VsZWN0aW9uRW5kJyk7XHJcbiAgICB2YXIgbGVuZ3RoID0gdmFsdWUubGVuZ3RoO1xyXG5cclxuICAgIHZhciBpc0JhY2tzcGFjZURlbGV0ZSA9IGtleUNvZGUgPT0gOCB8fCBrZXlDb2RlID09IDQ1LFxyXG4gICAgICAgIGlzTWV0YUtleSA9IGUubWV0YUtleSxcclxuICAgICAgICBpc0N0cmxLZXkgPSBlLmN0cmxLZXksXHJcbiAgICAgICAgaXNMZWZ0ID0ga2V5Q29kZSA9PSAzNyxcclxuICAgICAgICBpc1JpZ2h0ID0ga2V5Q29kZSA9PSAzOSxcclxuICAgICAgICBpc0xlZnRSaWdodCA9IGlzTGVmdCB8fCBpc1JpZ2h0LFxyXG4gICAgICAgIGlzU2hpZnQgPSBlLnNoaWZ0S2V5LFxyXG4gICAgICAgIGlzVXBEb3duID0ga2V5Q29kZSA9PSAzOCB8fCBrZXlDb2RlID09IDQwLFxyXG4gICAgICAgIGlzU2VsZWN0QWxsID0gKGlzTWV0YUtleSB8fCBpc0N0cmxLZXkpICYmIGtleUNvZGUgPT0gNjUsXHJcbiAgICAgICAgaXNSYW5nZVNlbGVjdGVkID0gc3RhcnQgIT0gZW5kLFxyXG4gICAgICAgIGlzQWxsU2VsZWN0ZWQgPSBzdGFydCA9PSAwICYmIGVuZCA9PSBsZW5ndGgsXHJcbiAgICAgICAgaXNNaW51cyA9IGtleUNvZGUgPT0gMTg5O1xyXG5cclxuICAgIHZhciBpbmRleERlY2ltYWxNYXJrID0gdmFsdWUuaW5kZXhPZignLicpO1xyXG5cclxuICAgIHRoaXMuX2NhcmV0T2Zmc2V0ID0gMDtcclxuXHJcbiAgICAvL3ByZXZlbnQgY21kLXogfHwgY3RybC16XHJcbiAgICBpZigoaXNNZXRhS2V5IHx8IGlzQ3RybEtleSkgJiYga2V5Q29kZSA9PSA5MCl7XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIC8vc2VsZWN0IGFsbCBjbWQrYSB8fCBjdHJsK2FcclxuICAgIGlmKGlzU2VsZWN0QWxsKXtcclxuICAgICAgICBzZWxlY3RBbGwoaW5wdXQpO1xyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICAvL2V2ZXJ5dGhpbmcgaXMgc2VsZWN0ZWRcclxuICAgIGlmKGlzQWxsU2VsZWN0ZWQpIHtcclxuICAgICAgICBpZiAoaXNNaW51cykge1xyXG4gICAgICAgICAgICAvL3NldCBuZWdhdGl2ZSB6ZXJvLCBhcyBzdGFydGluZyBwb2ludCBmb3IgbmVnYXRpdmUgbnVtYmVyXHJcbiAgICAgICAgICAgIGlucHV0U2V0VmFsdWUoaW5wdXQsICctMCcpO1xyXG4gICAgICAgICAgICAvL3NldCBjYXJldCBhZnRlciAgJy0nXHJcbiAgICAgICAgICAgIHNldENhcmV0UG9zKGlucHV0LCAxKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvL2RlbGV0ZSBudW1iZXIgLyByZXBsYWNlIC8gaWdub3JlXHJcbiAgICAgICAgICAgIGlucHV0U2V0VmFsdWUoaW5wdXQsIGlzQmFja3NwYWNlRGVsZXRlID8gMCA6IFN0cmluZy5mcm9tQ2hhckNvZGUoa2V5Q29kZSkpO1xyXG4gICAgICAgICAgICAvL2p1bXAgdG8gc3RhcnQgPC0tPiBlbmRcclxuICAgICAgICAgICAgc2V0Q2FyZXRQb3MoaW5wdXQsIGlzTGVmdCA/IHN0YXJ0IDogZW5kKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIC8vanVtcCBvdmVyIGRlY2ltYWwgbWFya1xyXG4gICAgaWYoaXNCYWNrc3BhY2VEZWxldGUgJiYgKHN0YXJ0LTEgPT0gaW5kZXhEZWNpbWFsTWFyaykpe1xyXG4gICAgICAgIHNldENhcmV0UG9zKGlucHV0LHN0YXJ0LTEpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIC8vIDB8LiBlbnRlciBmaXJzdCBkcCB3aXRob3V0IGp1bXBpbmcgb3ZlciBkZWNpbWFsIG1hcmtcclxuICAgIGlmKCFpc0xlZnRSaWdodCAmJiAodmFsdWVbMF0gPT0gJzAnICYmIHN0YXJ0ID09IDEpKXtcclxuICAgICAgICBzZXRDYXJldFBvcyhpbnB1dCwxKTtcclxuICAgICAgICB0aGlzLl9jYXJldE9mZnNldCA9IDE7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgLy9pbmNyZWFzZSAvIGRlY3JlYXNlIG51bWJlciBieSAoc3RlcCB1cCAvIGRvd24pICogbXVsdGlwbGllciBvbiBzaGlmdCBkb3duXHJcbiAgICBpZihpc1VwRG93bil7XHJcbiAgICAgICAgdmFyIHN0ZXAgPSAoaXNTaGlmdCA/IFBSRVNFVF9TSElGVF9NVUxUSVBMSUVSIDogMSkgKiB0aGlzLl92YWx1ZVN0ZXAsXHJcbiAgICAgICAgICAgIG11bHQgPSBrZXlDb2RlID09IDM4ID8gMS4wIDogLTEuMDtcclxuICAgICAgICBpbnB1dFNldFZhbHVlKGlucHV0LE51bWJlcih2YWx1ZSkgKyAoc3RlcCAqIG11bHQpKTtcclxuICAgICAgICBzZXRDYXJldFBvcyhpbnB1dCxzdGFydCk7XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIC8vcmFuZ2Ugc2VsZWN0ZWQsIG5vdCBpbiBzZWxlY3Rpb24gcHJvY2Vzc1xyXG4gICAgaWYoaXNSYW5nZVNlbGVjdGVkICYmICEoaXNTaGlmdCAmJiBpc0xlZnRSaWdodCkpe1xyXG4gICAgICAgIC8vanVtcCB0byBzdGFydCA8LS0+IGVuZFxyXG4gICAgICAgIGlmKGlzTGVmdFJpZ2h0KXtcclxuICAgICAgICAgICAgc2V0Q2FyZXRQb3MoaW5wdXQsaXNMZWZ0ID8gc3RhcnQgOiBlbmQpO1xyXG4gICAgICAgIH0gZWxzZSB7IC8vcmVwbGFjZSBjb21wbGV0ZSByYW5nZSwgbm90IGp1c3QgcGFydHNcclxuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS5zdWJzdHIoMCxzdGFydCkgKyBTdHJpbmcuZnJvbUNoYXJDb2RlKGtleUNvZGUpICsgdmFsdWUuc3Vic3RyKGVuZCxsZW5ndGgtZW5kKTtcclxuICAgICAgICAgICAgaW5wdXRTZXRWYWx1ZShpbnB1dCx2YWx1ZSk7XHJcbiAgICAgICAgICAgIHNldENhcmV0UG9zKGlucHV0LGVuZCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICAvL2NhcmV0IHdpdGhpbiBmcmFjdGlvbmFsIHBhcnQsIG5vdCBtb3ZpbmcgY2FyZXQsIHNlbGVjdGluZywgZGVsZXRpbmdcclxuICAgIGlmKCFpc1NoaWZ0ICYmICFpc0xlZnRSaWdodCAmJiAhaXNCYWNrc3BhY2VEZWxldGUgJiYgKHN0YXJ0ID4gaW5kZXhEZWNpbWFsTWFyayAmJiBzdGFydCA8IGxlbmd0aCkpe1xyXG4gICAgICAgIHZhbHVlID0gdmFsdWUuc3Vic3RyKDAsc3RhcnQpICsgU3RyaW5nLmZyb21DaGFyQ29kZShrZXlDb2RlKSArIHZhbHVlLnN1YnN0cihzdGFydCsxLGxlbmd0aC0xKTtcclxuICAgICAgICBpbnB1dFNldFZhbHVlKGlucHV0LHZhbHVlKTtcclxuICAgICAgICBzZXRDYXJldFBvcyhpbnB1dCxNYXRoLm1pbihzdGFydCsxLGxlbmd0aC0xKSk7XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIC8vY2FyZXQgYXQgZW5kIG9mIG51bWJlciwgZG8gbm90aGluZ1xyXG4gICAgaWYoIWlzQmFja3NwYWNlRGVsZXRlICYmICFpc0xlZnRSaWdodCAmJiAhaXNVcERvd24gJiYgc3RhcnQgPj0gbGVuZ3RoKXtcclxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5OdW1iZXJJbnB1dF9JbnRlcm5hbC5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fdmFsdWU7XHJcbn07XHJcblxyXG5OdW1iZXJJbnB1dF9JbnRlcm5hbC5wcm90b3R5cGUuc2V0VmFsdWUgPSBmdW5jdGlvbiAobikge1xyXG4gICAgdGhpcy5fc2V0VmFsdWUobik7XHJcbn07XHJcblxyXG5OdW1iZXJJbnB1dF9JbnRlcm5hbC5wcm90b3R5cGUuZ2V0Tm9kZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLl9pbnB1dDtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTnVtYmVySW5wdXRfSW50ZXJuYWw7XHJcbiIsInZhciBPdXRwdXQgPSByZXF1aXJlKCcuL091dHB1dCcpO1xyXG5cclxudmFyIERFRkFVTFRfT1VUUFVUX0RQID0gMjtcclxuXHJcbmZ1bmN0aW9uIE51bWJlck91dHB1dChwYXJlbnQsIG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xyXG5cdHBhcmFtcyA9IHBhcmFtcyB8fCB7fTtcclxuXHRwYXJhbXMuZHAgPSBwYXJhbXMuZHAgfHwgREVGQVVMVF9PVVRQVVRfRFA7XHJcblxyXG5cdE91dHB1dC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG5cdHRoaXMuX3ZhbHVlRHAgPSBwYXJhbXMuZHAgKyAxO1xyXG59XHJcbk51bWJlck91dHB1dC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE91dHB1dC5wcm90b3R5cGUpO1xyXG5OdW1iZXJPdXRwdXQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gTnVtYmVyT3V0cHV0O1xyXG5cclxuLy9GSVhNRVxyXG5OdW1iZXJPdXRwdXQucHJvdG90eXBlLl9zZXRWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcclxuXHRpZiAodGhpcy5fcGFyZW50LmlzRGlzYWJsZWQoKSl7XHJcblx0XHRyZXR1cm47XHJcblx0fVxyXG5cclxuXHR2YXIgdmFsdWUgPSB0aGlzLl9vYmpbdGhpcy5fa2V5XSxcclxuXHRcdHRleHRBcmVhID0gdGhpcy5fdGV4dEFyZWEsXHJcblx0XHRkcCA9IHRoaXMuX3ZhbHVlRHA7XHJcblxyXG5cdHZhciBpbmRleCxcclxuXHRcdG91dDtcclxuXHJcblx0aWYgKHR5cGVvZih2YWx1ZSkgPT09ICdvYmplY3QnICYmXHJcblx0XHR0eXBlb2YodmFsdWUubGVuZ3RoKSA9PT0gJ251bWJlcicgJiZcclxuXHRcdHR5cGVvZih2YWx1ZS5zcGxpY2UpID09PSAnZnVuY3Rpb24nICYmXHJcblx0XHQhdmFsdWUucHJvcGVydHlJc0VudW1lcmFibGUoJ2xlbmd0aCcpKSB7XHJcblxyXG5cdFx0b3V0ID0gdmFsdWUuc2xpY2UoKTtcclxuXHJcblx0XHR2YXIgaSA9IC0xO1xyXG5cdFx0dmFyIHRlbXA7XHJcblx0XHR2YXIgd3JhcCA9IHRoaXMuX3dyYXA7XHJcblxyXG5cdFx0d2hpbGUgKCsraSA8IG91dC5sZW5ndGgpIHtcclxuXHRcdFx0dGVtcCA9IG91dFtpXSA9IG91dFtpXS50b1N0cmluZygpO1xyXG5cdFx0XHRpbmRleCA9IHRlbXAuaW5kZXhPZignLicpO1xyXG5cdFx0XHRpZiAoaW5kZXggPiAwKXtcclxuXHRcdFx0XHRvdXRbaV0gPSB0ZW1wLnNsaWNlKDAsIGluZGV4ICsgZHApO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKHdyYXApIHtcclxuXHRcdFx0dGV4dEFyZWEuc2V0U3R5bGVQcm9wZXJ0eSgnd2hpdGUtc3BhY2UnLCAnbm93cmFwJyk7XHJcblx0XHRcdG91dCA9IG91dC5qb2luKCdcXG4nKTtcclxuXHRcdH1cclxuXHJcblx0XHR0ZXh0QXJlYS5zZXRQcm9wZXJ0eSgndmFsdWUnLCBvdXQpO1xyXG5cdH1lbHNlIHtcclxuXHRcdG91dCA9IHZhbHVlLnRvU3RyaW5nKCk7XHJcblx0XHRpbmRleCA9IG91dC5pbmRleE9mKCcuJyk7XHJcblx0XHR0ZXh0QXJlYS5zZXRQcm9wZXJ0eSgndmFsdWUnLCBpbmRleCA+IDAgPyBvdXQuc2xpY2UoMCwgaW5kZXggKyBkcCkgOiBvdXQpO1xyXG5cdH1cclxuXHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE51bWJlck91dHB1dDsiLCJ2YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xyXG52YXIgRG9jdW1lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxyXG4gICAgTm9kZUV2ZW50ICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50Jyk7XHJcbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xyXG52YXIgQ29sb3JNb2RlID0gcmVxdWlyZSgnLi4vY29yZS9jb2xvci9Db2xvck1vZGUnKTtcclxudmFyIENvbG9yVXRpbCA9IHJlcXVpcmUoJy4uL2NvcmUvY29sb3IvQ29sb3JVdGlsJyk7XHJcbnZhciBNZXRyaWMgPSByZXF1aXJlKCcuL01ldHJpYycpO1xyXG5cclxuZnVuY3Rpb24gT3B0aW9ucyhwYXJlbnROb2RlKSB7XHJcbiAgICB0aGlzLl9wYXJlbk5vZGUgPSBwYXJlbnROb2RlO1xyXG5cclxuICAgIHZhciBub2RlID0gdGhpcy5fbm9kZSA9IG5ldyBOb2RlKCk7XHJcbiAgICB2YXIgbGlzdE5vZGUgPSB0aGlzLl9saXN0Tm9kZSA9IG5ldyBOb2RlKE5vZGUuTElTVCk7XHJcblxyXG4gICAgbm9kZS5zZXRTdHlsZUNsYXNzKENTUy5PcHRpb25zKTtcclxuICAgIG5vZGUuYWRkQ2hpbGQobGlzdE5vZGUpO1xyXG5cclxuICAgIHRoaXMuX3NlbGVjdGVkSW5kZXggPSBudWxsO1xyXG4gICAgdGhpcy5fY2FsbGJhY2tPdXQgPSBmdW5jdGlvbiAoKSB7IH07XHJcblxyXG4gICAgdGhpcy5fdW5mb2N1c2FibGUgPSBmYWxzZTtcclxuXHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25Eb2N1bWVudE1vdXNlRG93bi5iaW5kKHRoaXMpKTtcclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9VUCwgdGhpcy5fb25Eb2N1bWVudE1vdXNlVXAuYmluZCh0aGlzKSk7XHJcblxyXG4gICAgdGhpcy5jbGVhcigpO1xyXG59XHJcblxyXG5PcHRpb25zLnByb3RvdHlwZSA9IHtcclxuICAgIF9vbkRvY3VtZW50TW91c2VEb3duOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLl91bmZvY3VzYWJsZSlyZXR1cm47XHJcbiAgICAgICAgdGhpcy5fY2FsbGJhY2tPdXQoKTtcclxuICAgIH0sXHJcblxyXG4gICAgX29uRG9jdW1lbnRNb3VzZVVwOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5fdW5mb2N1c2FibGUgPSB0cnVlO1xyXG4gICAgfSxcclxuXHJcbiAgICBidWlsZDogZnVuY3Rpb24gKGVudHJpZXMsIHNlbGVjdGVkLCBlbGVtZW50LCBjYWxsYmFja1NlbGVjdCwgY2FsbGJhY2tPdXQsIHBhZGRpbmdSaWdodCwgYXJlQ29sb3JzLCBjb2xvck1vZGUpIHtcclxuICAgICAgICB0aGlzLl9jbGVhckxpc3QoKTtcclxuXHJcbiAgICAgICAgdGhpcy5fcGFyZW5Ob2RlLmFkZENoaWxkKHRoaXMuZ2V0Tm9kZSgpKTtcclxuXHJcbiAgICAgICAgdmFyIHJvb3ROb2RlID0gdGhpcy5fbm9kZSxcclxuICAgICAgICAgICAgbGlzdE5vZGUgPSB0aGlzLl9saXN0Tm9kZTtcclxuXHJcbiAgICAgICAgcGFkZGluZ1JpZ2h0ID0gcGFkZGluZ1JpZ2h0IHx8IDA7XHJcblxyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgICAgICAgLy8gYnVpbGQgbGlzdFxyXG4gICAgICAgIHZhciBpdGVtTm9kZSwgZW50cnk7XHJcbiAgICAgICAgdmFyIGkgPSAtMTtcclxuXHJcbiAgICAgICAgaWYgKGFyZUNvbG9ycykge1xyXG4gICAgICAgICAgICBjb2xvck1vZGUgPSBjb2xvck1vZGUgfHwgQ29sb3JNb2RlLkhFWDtcclxuXHJcbiAgICAgICAgICAgIGxpc3ROb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkNvbG9yKTtcclxuXHJcbiAgICAgICAgICAgIHZhciBjb2xvciwgbm9kZUNvbG9yO1xyXG5cclxuICAgICAgICAgICAgd2hpbGUgKCsraSA8IGVudHJpZXMubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICBlbnRyeSA9IGVudHJpZXNbaV07XHJcbiAgICAgICAgICAgICAgICBpdGVtTm9kZSA9IGxpc3ROb2RlLmFkZENoaWxkKG5ldyBOb2RlKE5vZGUuTElTVF9JVEVNKSk7XHJcbiAgICAgICAgICAgICAgICBjb2xvciA9IGl0ZW1Ob2RlLmFkZENoaWxkKG5ldyBOb2RlKCkpO1xyXG5cclxuICAgICAgICAgICAgICAgIHN3aXRjaCAoY29sb3JNb2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBDb2xvck1vZGUuSEVYOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlQ29sb3IgPSBlbnRyeTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBDb2xvck1vZGUuUkdCOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlQ29sb3IgPSBDb2xvclV0aWwuUkdCMkhFWChlbnRyeVswXSwgZW50cnlbMV0sIGVudHJ5WzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBDb2xvck1vZGUuUkdCZnY6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVDb2xvciA9IENvbG9yVXRpbC5SR0JmdjJIRVgoZW50cnlbMF0sIGVudHJ5WzFdLCBlbnRyeVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgQ29sb3JNb2RlLkhTVjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZUNvbG9yID0gQ29sb3JVdGlsLkhTVjJSR0IoZW50cnlbMF0sIGVudHJ5WzFdLCBlbnRyeVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGNvbG9yLmdldFN0eWxlKCkuYmFja2dyb3VuZENvbG9yID0gbm9kZUNvbG9yO1xyXG4gICAgICAgICAgICAgICAgY29sb3IuZ2V0U3R5bGUoKS5iYWNrZ3JvdW5kSW1hZ2UgPSAnbGluZWFyLWdyYWRpZW50KCByZ2JhKDAsMCwwLDApIDAlLCByZ2JhKDAsMCwwLDAuMSkgMTAwJSknO1xyXG4gICAgICAgICAgICAgICAgY29sb3Iuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsIGVudHJ5KTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoZW50cnkgPT0gc2VsZWN0ZWQpaXRlbU5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuT3B0aW9uc1NlbGVjdGVkKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpdGVtTm9kZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLFxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fc2VsZWN0ZWRJbmRleCA9IEFycmF5LnByb3RvdHlwZS5pbmRleE9mLmNhbGwodGhpcy5wYXJlbnROb2RlLmNoaWxkcmVuLCB0aGlzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2tTZWxlY3QoKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGxpc3ROb2RlLmRlbGV0ZVN0eWxlQ2xhc3MoKTtcclxuXHJcbiAgICAgICAgICAgIHdoaWxlICgrK2kgPCBlbnRyaWVzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgZW50cnkgPSBlbnRyaWVzW2ldO1xyXG5cclxuICAgICAgICAgICAgICAgIGl0ZW1Ob2RlID0gbGlzdE5vZGUuYWRkQ2hpbGQobmV3IE5vZGUoTm9kZS5MSVNUX0lURU0pKTtcclxuICAgICAgICAgICAgICAgIGl0ZW1Ob2RlLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCBlbnRyeSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoZW50cnkgPT0gc2VsZWN0ZWQpaXRlbU5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuT3B0aW9uc1NlbGVjdGVkKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpdGVtTm9kZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLFxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fc2VsZWN0ZWRJbmRleCA9IEFycmF5LnByb3RvdHlwZS5pbmRleE9mLmNhbGwodGhpcy5wYXJlbnROb2RlLmNoaWxkcmVuLCB0aGlzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2tTZWxlY3QoKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy9wb3NpdGlvbiwgc2V0IHdpZHRoIGFuZCBlbmFibGVcclxuXHJcbiAgICAgICAgdmFyIGVsZW1lbnRQb3MgPSBlbGVtZW50LmdldFBvc2l0aW9uR2xvYmFsKCksXHJcbiAgICAgICAgICAgIGVsZW1lbnRXaWR0aCA9IGVsZW1lbnQuZ2V0V2lkdGgoKSAtIHBhZGRpbmdSaWdodCxcclxuICAgICAgICAgICAgZWxlbWVudEhlaWdodCA9IGVsZW1lbnQuZ2V0SGVpZ2h0KCk7XHJcblxyXG4gICAgICAgIHZhciBsaXN0V2lkdGggPSBsaXN0Tm9kZS5nZXRXaWR0aCgpLFxyXG4gICAgICAgICAgICBsaXN0SGVpZ2h0ID0gbGlzdE5vZGUuZ2V0SGVpZ2h0KCksXHJcbiAgICAgICAgICAgIHN0cm9rZU9mZnNldCA9IE1ldHJpYy5TVFJPS0VfU0laRSAqIDI7XHJcblxyXG4gICAgICAgIHZhciBwYWRkaW5nT3B0aW9ucyA9IE1ldHJpYy5QQURESU5HX09QVElPTlM7XHJcblxyXG4gICAgICAgIHZhciB3aWR0aCA9IChsaXN0V2lkdGggPCBlbGVtZW50V2lkdGggPyBlbGVtZW50V2lkdGggOiBsaXN0V2lkdGgpIC0gc3Ryb2tlT2Zmc2V0LFxyXG4gICAgICAgICAgICBwb3NYID0gZWxlbWVudFBvc1swXSxcclxuICAgICAgICAgICAgcG9zWSA9IGVsZW1lbnRQb3NbMV0gKyBlbGVtZW50SGVpZ2h0IC0gcGFkZGluZ09wdGlvbnM7XHJcblxyXG4gICAgICAgIHZhciB3aW5kb3dXaWR0aCA9IHdpbmRvdy5pbm5lcldpZHRoLFxyXG4gICAgICAgICAgICB3aW5kb3dIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XHJcblxyXG4gICAgICAgIHZhciByb290UG9zWCA9IChwb3NYICsgd2lkdGgpID4gd2luZG93V2lkdGggPyAocG9zWCAtIHdpZHRoICsgZWxlbWVudFdpZHRoIC0gc3Ryb2tlT2Zmc2V0KSA6IHBvc1gsXHJcbiAgICAgICAgICAgIHJvb3RQb3NZID0gKHBvc1kgKyBsaXN0SGVpZ2h0KSA+IHdpbmRvd0hlaWdodCA/IChwb3NZIC0gbGlzdEhlaWdodCAqIDAuNSAtIGVsZW1lbnRIZWlnaHQgKiAwLjUpIDogcG9zWTtcclxuXHJcbiAgICAgICAgbGlzdE5vZGUuc2V0V2lkdGgod2lkdGgpO1xyXG4gICAgICAgIHJvb3ROb2RlLnNldFBvc2l0aW9uR2xvYmFsKHJvb3RQb3NYLCByb290UG9zWSArIDIpO1xyXG5cclxuICAgICAgICB0aGlzLl9jYWxsYmFja091dCA9IGNhbGxiYWNrT3V0O1xyXG4gICAgICAgIHRoaXMuX3VuZm9jdXNhYmxlID0gZmFsc2U7XHJcbiAgICB9LFxyXG5cclxuICAgIF9jbGVhckxpc3Q6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLl9saXN0Tm9kZS5yZW1vdmVBbGxDaGlsZHJlbigpO1xyXG4gICAgICAgIHRoaXMuX2xpc3ROb2RlLmRlbGV0ZVN0eWxlUHJvcGVydHkoJ3dpZHRoJyk7XHJcbiAgICAgICAgdGhpcy5fc2VsZWN0ZWRJbmRleCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5fYnVpbGQgPSBmYWxzZTtcclxuICAgIH0sXHJcblxyXG4gICAgY2xlYXI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLl9jbGVhckxpc3QoKTtcclxuICAgICAgICB0aGlzLl9jYWxsYmFja091dCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMuX3BhcmVuTm9kZS5yZW1vdmVDaGlsZCh0aGlzLmdldE5vZGUoKSk7XHJcblxyXG4gICAgfSxcclxuXHJcbiAgICBpc0J1aWxkOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2J1aWxkO1xyXG4gICAgfSxcclxuICAgIGdldE5vZGU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fbm9kZTtcclxuICAgIH0sXHJcbiAgICBnZXRTZWxlY3RlZEluZGV4OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NlbGVjdGVkSW5kZXg7XHJcbiAgICB9XHJcbn07XHJcblxyXG5PcHRpb25zLnNldHVwID0gZnVuY3Rpb24ocGFyZW50Tm9kZSl7cmV0dXJuIE9wdGlvbnMuX2luc3RhbmNlID0gbmV3IE9wdGlvbnMocGFyZW50Tm9kZSk7fTtcclxuT3B0aW9ucy5nZXQgICA9IGZ1bmN0aW9uKCl7cmV0dXJuIE9wdGlvbnMuX2luc3RhbmNlO307XHJcbk9wdGlvbnMuZGVzdHJveSA9IGZ1bmN0aW9uKCl7T3B0aW9ucy5faW5zdGFuY2UgPSBudWxsO307XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE9wdGlvbnM7IiwidmFyIE9iamVjdENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvT2JqZWN0Q29tcG9uZW50Jyk7XHJcbnZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XHJcblxyXG52YXIgQ1NTICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcclxudmFyIE1ldHJpYyAgICA9IHJlcXVpcmUoJy4vTWV0cmljJyk7XHJcbnZhciBTY3JvbGxCYXIgPSByZXF1aXJlKCcuLi9jb3JlL2xheW91dC9TY3JvbGxCYXInKTtcclxuXHJcbnZhciBFdmVudF8gICAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcclxuICAgIERvY3VtZW50RXZlbnQgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXHJcbiAgICBOb2RlRXZlbnQgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50JyksXHJcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKTtcclxuXHJcbnZhciBERUZBVUxUX0hFSUdIVCA9IG51bGwsXHJcbiAgICBERUZBVUxUX1dSQVAgICA9IGZhbHNlLFxyXG4gICAgREVGQVVMVF9VUERBVEUgPSB0cnVlO1xyXG5cclxuZnVuY3Rpb24gT3V0cHV0KHBhcmVudCxvYmplY3QsdmFsdWUscGFyYW1zKSB7XHJcbiAgICBPYmplY3RDb21wb25lbnQuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xyXG5cclxuICAgIHBhcmFtcyAgICAgICAgPSBwYXJhbXMgICAgICAgIHx8IHt9O1xyXG4gICAgcGFyYW1zLmhlaWdodCA9IHBhcmFtcy5oZWlnaHQgfHwgREVGQVVMVF9IRUlHSFQ7XHJcbiAgICBwYXJhbXMud3JhcCAgID0gcGFyYW1zLndyYXAgICA9PT0gdW5kZWZpbmVkID8gREVGQVVMVF9XUkFQIDogcGFyYW1zLndyYXA7XHJcbiAgICBwYXJhbXMudXBkYXRlID0gcGFyYW1zLnVwZGF0ZSA9PT0gdW5kZWZpbmVkID8gREVGQVVMVF9VUERBVEUgOiBwYXJhbXMudXBkYXRlO1xyXG5cclxuICAgIHRoaXMuX3dyYXAgICA9IHBhcmFtcy53cmFwO1xyXG4gICAgdGhpcy5fdXBkYXRlID0gcGFyYW1zLnVwZGF0ZTtcclxuXHJcbiAgICB2YXIgdGV4dEFyZWEgPSB0aGlzLl90ZXh0QXJlYSA9IG5ldyBOb2RlKE5vZGUuVEVYVEFSRUEpLFxyXG4gICAgICAgIHdyYXAgPSB0aGlzLl93cmFwTm9kZSxcclxuICAgICAgICByb290ID0gdGhpcy5fbm9kZTtcclxuXHJcbiAgICAgICAgdGV4dEFyZWEuc2V0UHJvcGVydHkoJ3JlYWRPbmx5Jyx0cnVlKTtcclxuICAgICAgICB3cmFwLmFkZENoaWxkKHRleHRBcmVhKTtcclxuXHJcbiAgICAgICAgdGV4dEFyZWEuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTix0aGlzLl9vbklucHV0RHJhZ1N0YXJ0LmJpbmQodGhpcykpO1xyXG4gICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihDb21wb25lbnRFdmVudC5JTlBVVF9TRUxFQ1RfRFJBRyx0aGlzLl9wYXJlbnQsJ29uQ29tcG9uZW50U2VsZWN0RHJhZycpO1xyXG5cclxuXHJcbiAgICBpZihwYXJhbXMuaGVpZ2h0KXtcclxuICAgICAgICB2YXIgdGV4dEFyZWFXcmFwID0gbmV3IE5vZGUoKTtcclxuICAgICAgICAgICAgdGV4dEFyZWFXcmFwLnNldFN0eWxlQ2xhc3MoQ1NTLlRleHRBcmVhV3JhcCk7XHJcbiAgICAgICAgICAgIHRleHRBcmVhV3JhcC5hZGRDaGlsZCh0ZXh0QXJlYSk7XHJcbiAgICAgICAgICAgIHdyYXAuYWRkQ2hpbGQodGV4dEFyZWFXcmFwKTtcclxuXHJcbiAgICAgICAgLy9GSVhNRVxyXG4gICAgICAgIHZhciBoZWlnaHQgID0gdGhpcy5faGVpZ2h0ID0gcGFyYW1zLmhlaWdodCxcclxuICAgICAgICAgICAgcGFkZGluZyA9IDQ7XHJcblxyXG4gICAgICAgICAgICB0ZXh0QXJlYS5zZXRIZWlnaHQoTWF0aC5tYXgoaGVpZ2h0ICsgcGFkZGluZyAgLE1ldHJpYy5DT01QT05FTlRfTUlOX0hFSUdIVCkpO1xyXG4gICAgICAgICAgICB3cmFwLnNldEhlaWdodCh0ZXh0QXJlYS5nZXRIZWlnaHQoKSk7XHJcbiAgICAgICAgICAgIHJvb3Quc2V0SGVpZ2h0KHdyYXAuZ2V0SGVpZ2h0KCkgKyBwYWRkaW5nKTtcclxuXHJcbiAgICAgICAgdGhpcy5fc2Nyb2xsQmFyID0gbmV3IFNjcm9sbEJhcih0ZXh0QXJlYVdyYXAsdGV4dEFyZWEsaGVpZ2h0IC0gcGFkZGluZylcclxuICAgIH1cclxuXHJcbiAgICBpZihwYXJhbXMud3JhcCl7XHJcbiAgICAgICAgdGV4dEFyZWEuc2V0U3R5bGVQcm9wZXJ0eSgnd2hpdGUtc3BhY2UnLCdwcmUtd3JhcCcpO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuX3ByZXZTdHJpbmcgPSAnJztcclxuICAgIHRoaXMuX3ByZXZTY3JvbGxIZWlnaHQgPSAtMTtcclxuICAgIHRoaXMuX3NldFZhbHVlKCk7XHJcbn1cclxuT3V0cHV0LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZSk7XHJcbk91dHB1dC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBPdXRwdXQ7XHJcblxyXG4vL092ZXJyaWRlIGluIHN1YmNsYXNzXHJcbk91dHB1dC5wcm90b3R5cGUuX3NldFZhbHVlID0gZnVuY3Rpb24gKCkge307XHJcblxyXG5PdXRwdXQucHJvdG90eXBlLm9uVmFsdWVVcGRhdGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLl9zZXRWYWx1ZSgpO1xyXG59O1xyXG5cclxuT3V0cHV0LnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBpZighdGhpcy5fdXBkYXRlKXtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB0aGlzLl9zZXRWYWx1ZSgpO1xyXG59O1xyXG5cclxuLy9QcmV2ZW50IGNocm9tZSBzZWxlY3QgZHJhZ1xyXG5cclxuT3V0cHV0LnByb3RvdHlwZS5fb25EcmFnID0gZnVuY3Rpb24oKXtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LklOUFVUX1NFTEVDVF9EUkFHLCBudWxsKSk7XHJcbn07XHJcblxyXG5PdXRwdXQucHJvdG90eXBlLl9vbkRyYWdGaW5pc2ggPSBmdW5jdGlvbigpe1xyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuSU5QVVRfU0VMRUNUX0RSQUcsIG51bGwpKTtcclxuXHJcbiAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSwgdGhpcy5fb25EcmFnLCBmYWxzZSk7XHJcbiAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSwgdGhpcy5fb25EcmFnRmluaXNoLCBmYWxzZSk7XHJcbn07XHJcblxyXG5PdXRwdXQucHJvdG90eXBlLl9vbklucHV0RHJhZ1N0YXJ0ID0gZnVuY3Rpb24oKSB7XHJcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBDb21wb25lbnRFdmVudC5JTlBVVF9TRUxFQ1RfRFJBRywgbnVsbCkpO1xyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsIHRoaXMuX29uRHJhZy5iaW5kKHRoaXMpLCBmYWxzZSk7XHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfVVAsICAgdGhpcy5fb25EcmFnRmluaXNoLmJpbmQodGhpcyksIGZhbHNlKTtcclxufTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE91dHB1dDtcclxuIiwidmFyIFBsb3R0ZXIgPSByZXF1aXJlKCcuL1Bsb3R0ZXInKTtcclxudmFyIE1vdXNlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Nb3VzZScpO1xyXG5cclxudmFyIEV2ZW50XyAgICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxyXG4gICAgRG9jdW1lbnRFdmVudCAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcclxuICAgIENvbXBvbmVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9Db21wb25lbnRFdmVudCcpO1xyXG5cclxudmFyIERFRkFVTFRfQk9VTkRTX1ggPSBbLTEsMV0sXHJcbiAgICBERUZBVUxUX0JPVU5EU19ZID0gWy0xLDFdLFxyXG4gICAgREVGQVVMVF9MQUJFTF9YICA9ICcnLFxyXG4gICAgREVGQVVMVF9MQUJFTF9ZICA9ICcnO1xyXG5cclxuZnVuY3Rpb24gUGFkKHBhcmVudCwgb2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XHJcbiAgICBQbG90dGVyLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcclxuXHJcbiAgICBwYXJhbXMgICAgICAgICAgICA9IHBhcmFtcyAgICAgICAgICAgIHx8IHt9O1xyXG4gICAgcGFyYW1zLmJvdW5kc1ggICAgPSBwYXJhbXMuYm91bmRzWCAgICB8fCBERUZBVUxUX0JPVU5EU19YO1xyXG4gICAgcGFyYW1zLmJvdW5kc1kgICAgPSBwYXJhbXMuYm91bmRzWSAgICB8fCBERUZBVUxUX0JPVU5EU19ZO1xyXG4gICAgcGFyYW1zLmxhYmVsWCAgICAgPSBwYXJhbXMubGFiZWxYICAgICB8fCBERUZBVUxUX0xBQkVMX1g7XHJcbiAgICBwYXJhbXMubGFiZWxZICAgICA9IHBhcmFtcy5sYWJlbFkgICAgIHx8IERFRkFVTFRfTEFCRUxfWTtcclxuXHJcbiAgICBwYXJhbXMuc2hvd0Nyb3NzICA9IHBhcmFtcy5zaG93Q3Jvc3MgIHx8IHRydWU7XHJcblxyXG5cclxuICAgIHRoaXMuX29uQ2hhbmdlICAgICA9IHBhcmFtcy5vbkNoYW5nZSB8fCB0aGlzLl9vbkNoYW5nZTtcclxuICAgIHRoaXMuX29uRmluaXNoICAgICA9IHBhcmFtcy5vbkZpbmlzaCB8fCBmdW5jdGlvbigpe307XHJcblxyXG4gICAgdGhpcy5fYm91bmRzWCAgICAgID0gcGFyYW1zLmJvdW5kc1g7XHJcbiAgICB0aGlzLl9ib3VuZHNZICAgICAgPSBwYXJhbXMuYm91bmRzWTtcclxuICAgIHRoaXMuX2xhYmVsQXhpc1ggICA9IHBhcmFtcy5sYWJlbFggIT0gJycgJiYgcGFyYW1zLmxhYmVsWCAhPSAnbm9uZScgPyBwYXJhbXMubGFiZWxYIDogbnVsbDtcclxuICAgIHRoaXMuX2xhYmVsQXhpc1kgICA9IHBhcmFtcy5sYWJlbFkgIT0gJycgJiYgcGFyYW1zLmxhYmVsWSAhPSAnbm9uZScgPyBwYXJhbXMubGFiZWxZIDogbnVsbDtcclxuXHJcbiAgICB2YXIgcGF0aCA9IHRoaXMuX3BhdGg7XHJcbiAgICAgICAgcGF0aC5zdHlsZS5zdHJva2VXaWR0aCA9IDE7XHJcbiAgICAgICAgcGF0aC5zdHlsZS5zdHJva2UgICAgICA9ICcjMzYzYzQwJztcclxuXHJcbiAgICB0aGlzLl9ncmlkLnN0eWxlLnN0cm9rZSA9ICdyZ2IoMjUsMjUsMjUpJztcclxuXHJcbiAgICB0aGlzLl9zdmdQb3MgPSBbMCwwXTtcclxuXHJcblxyXG4gICAgdmFyIGhhbmRsZSA9IHRoaXMuX2hhbmRsZSA9IHRoaXMuX3N2Z1Jvb3QuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdnJykpO1xyXG4gICAgdmFyIGhhbmRsZUNpcmNsZTAgPSBoYW5kbGUuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdjaXJjbGUnKSk7XHJcbiAgICAgICAgaGFuZGxlQ2lyY2xlMC5zZXRBdHRyaWJ1dGUoJ3InLFN0cmluZygxMSkpO1xyXG4gICAgICAgIGhhbmRsZUNpcmNsZTAuc2V0QXR0cmlidXRlKCdmaWxsJywncmdiYSgwLDAsMCwwLjA1KScpO1xyXG4gICAgdmFyIGhhbmRsZUNpcmNsZTEgPSBoYW5kbGUuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdjaXJjbGUnKSk7XHJcbiAgICAgICAgaGFuZGxlQ2lyY2xlMS5zZXRBdHRyaWJ1dGUoJ3InLFN0cmluZygxMCkpO1xyXG4gICAgICAgIGhhbmRsZUNpcmNsZTEuc2V0QXR0cmlidXRlKCdmaWxsJywncmdiKDgzLDkzLDk4KScpO1xyXG5cclxuICAgIHZhciBoYW5kbGVDaXJjbGUyID0gaGFuZGxlLmFwcGVuZENoaWxkKHRoaXMuX2NyZWF0ZVNWR09iamVjdCgnY2lyY2xlJykpO1xyXG4gICAgICAgIGhhbmRsZUNpcmNsZTIuc2V0QXR0cmlidXRlKCdyJyxTdHJpbmcoOSkpO1xyXG4gICAgICAgIGhhbmRsZUNpcmNsZTIuc2V0QXR0cmlidXRlKCdmaWxsJywncmdiKDU3LDY5LDc2KScpO1xyXG4gICAgICAgIGhhbmRsZUNpcmNsZTIuc2V0QXR0cmlidXRlKCdjeScsU3RyaW5nKDAuNzUpKTtcclxuXHJcbiAgICB2YXIgaGFuZGxlQ2lyY2xlMyA9IGhhbmRsZS5hcHBlbmRDaGlsZCh0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ2NpcmNsZScpKTtcclxuICAgICAgICBoYW5kbGVDaXJjbGUzLnNldEF0dHJpYnV0ZSgncicsU3RyaW5nKDEwKSk7XHJcbiAgICAgICAgaGFuZGxlQ2lyY2xlMy5zZXRBdHRyaWJ1dGUoJ3N0cm9rZScsJ3JnYigxNywxOSwyMCknKTtcclxuICAgICAgICBoYW5kbGVDaXJjbGUzLnNldEF0dHJpYnV0ZSgnc3Ryb2tlLXdpZHRoJyxTdHJpbmcoMSkpO1xyXG4gICAgICAgIGhhbmRsZUNpcmNsZTMuc2V0QXR0cmlidXRlKCdmaWxsJywnbm9uZScpO1xyXG5cclxuICAgIHZhciBoYW5kbGVDaXJjbGU0ID0gaGFuZGxlLmFwcGVuZENoaWxkKHRoaXMuX2NyZWF0ZVNWR09iamVjdCgnY2lyY2xlJykpO1xyXG4gICAgICAgIGhhbmRsZUNpcmNsZTQuc2V0QXR0cmlidXRlKCdyJyxTdHJpbmcoNikpO1xyXG4gICAgICAgIGhhbmRsZUNpcmNsZTQuc2V0QXR0cmlidXRlKCdmaWxsJywncmdiKDMwLDM0LDM2KScpO1xyXG4gICAgdmFyIGhhbmRsZUNpcmNsZTUgPSBoYW5kbGUuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdjaXJjbGUnKSk7XHJcbiAgICAgICAgaGFuZGxlQ2lyY2xlNS5zZXRBdHRyaWJ1dGUoJ3InLFN0cmluZygzKSk7XHJcbiAgICAgICAgaGFuZGxlQ2lyY2xlNS5zZXRBdHRyaWJ1dGUoJ2ZpbGwnLCdyZ2IoMjU1LDI1NSwyNTUpJyk7XHJcblxyXG4gICAgICAgIGhhbmRsZS5zZXRBdHRyaWJ1dGUoJ3RyYW5mb3JtJywndHJhbnNsYXRlKDAgMCknKTtcclxuXHJcbiAgICB0aGlzLl9zdmcuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX0RPV04sdGhpcy5fb25EcmFnU3RhcnQuYmluZCh0aGlzKSxmYWxzZSk7XHJcbiAgICB0aGlzLl9kcmF3VmFsdWUodGhpcy5fb2JqW3RoaXMuX2tleV0pO1xyXG59XHJcblBhZC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFBsb3R0ZXIucHJvdG90eXBlKTtcclxuUGFkLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFBhZDtcclxuXHJcblBhZC5wcm90b3R5cGUuX29uRHJhZ1N0YXJ0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHN2Z1BvcyA9IHRoaXMuX3N2Z1BvcztcclxuICAgIHN2Z1Bvc1swXSA9IDA7XHJcbiAgICBzdmdQb3NbMV0gPSAwO1xyXG5cclxuICAgIC8vc2tpcCB0byBjb250YWluZXJcclxuICAgIHZhciBlbGVtZW50ID0gdGhpcy5fc3ZnLnBhcmVudE5vZGU7XHJcblxyXG4gICAgd2hpbGUgKGVsZW1lbnQpIHtcclxuICAgICAgICBzdmdQb3NbMF0gKz0gZWxlbWVudC5vZmZzZXRMZWZ0O1xyXG4gICAgICAgIHN2Z1Bvc1sxXSArPSBlbGVtZW50Lm9mZnNldFRvcDtcclxuICAgICAgICBlbGVtZW50ID0gZWxlbWVudC5vZmZzZXRQYXJlbnQ7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGV2ZW50TW92ZSA9IERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSxcclxuICAgICAgICBldmVudFVwICAgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX1VQO1xyXG5cclxuICAgIHZhciBvbkRyYWcgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5fZHJhd1ZhbHVlSW5wdXQoKTtcclxuICAgICAgICB0aGlzLmFwcGx5VmFsdWUoKTtcclxuICAgICAgICB0aGlzLl9vbkNoYW5nZSgpO1xyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG5cclxuICAgIHZhciBvbkRyYWdFbmQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5wdXNoSGlzdG9yeVN0YXRlKCk7XHJcbiAgICAgICAgdGhpcy5fZHJhd1ZhbHVlSW5wdXQoKTtcclxuICAgICAgICB0aGlzLmFwcGx5VmFsdWUoKTtcclxuICAgICAgICB0aGlzLl9vbkZpbmlzaCgpO1xyXG5cclxuICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnLCBmYWxzZSk7XHJcbiAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudFVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcclxuICAgIH0uYmluZCh0aGlzKTtcclxuXHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnLCAgICBmYWxzZSk7XHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50VXAsICAgb25EcmFnRW5kLCBmYWxzZSk7XHJcblxyXG4gICAgdGhpcy5fZHJhd1ZhbHVlSW5wdXQoKTtcclxuICAgIHRoaXMuYXBwbHlWYWx1ZSgpO1xyXG4gICAgdGhpcy5fb25DaGFuZ2UoKTtcclxufTtcclxuXHJcblBhZC5wcm90b3R5cGUuX3JlZHJhdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuX2RyYXdWYWx1ZSh0aGlzLl9vYmpbdGhpcy5fa2V5XSk7XHJcbn07XHJcblxyXG5QYWQucHJvdG90eXBlLl9kcmF3VmFsdWVJbnB1dCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuX2RyYXdWYWx1ZSh0aGlzLl9nZXRNb3VzZU5vcm1hbGl6ZWQoKSk7XHJcbn07XHJcblxyXG5QYWQucHJvdG90eXBlLl9kcmF3VmFsdWUgPSBmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgIHRoaXMuX29ialt0aGlzLl9rZXldID0gdmFsdWU7XHJcbiAgICB0aGlzLl9kcmF3R3JpZCgpO1xyXG4gICAgdGhpcy5fZHJhd1BvaW50KCk7XHJcbn07XHJcblxyXG5QYWQucHJvdG90eXBlLl9kcmF3R3JpZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBzdmdTaXplID0gTnVtYmVyKHRoaXMuX3N2Zy5nZXRBdHRyaWJ1dGUoJ3dpZHRoJykpLFxyXG4gICAgICAgIHN2Z01pZFggPSBNYXRoLmZsb29yKHN2Z1NpemUgKiAwLjUpLFxyXG4gICAgICAgIHN2Z01pZFkgPSBNYXRoLmZsb29yKHN2Z1NpemUgKiAwLjUpO1xyXG5cclxuICAgIHZhciBwYXRoQ21kID0gJyc7XHJcbiAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRMaW5lKDAsIHN2Z01pZFksIHN2Z1NpemUsIHN2Z01pZFkpO1xyXG4gICAgcGF0aENtZCArPSB0aGlzLl9wYXRoQ21kTGluZShzdmdNaWRYLCAwLCBzdmdNaWRYLCBzdmdTaXplKTtcclxuXHJcbiAgICB0aGlzLl9ncmlkLnNldEF0dHJpYnV0ZSgnZCcsIHBhdGhDbWQpO1xyXG59O1xyXG5cclxuXHJcblBhZC5wcm90b3R5cGUuX2RyYXdQb2ludCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBzdmdTaXplID0gTnVtYmVyKHRoaXMuX3N2Zy5nZXRBdHRyaWJ1dGUoJ3dpZHRoJykpO1xyXG5cclxuICAgIHZhciB2YWx1ZSA9IHRoaXMuX29ialt0aGlzLl9rZXldO1xyXG5cclxuICAgIHZhciBsb2NhbFggPSAoIDAuNSArIHZhbHVlWzBdICogMC41ICkgKiBzdmdTaXplLFxyXG4gICAgICAgIGxvY2FsWSA9ICggMC41ICsgLXZhbHVlWzFdICogMC41ICkgKiBzdmdTaXplO1xyXG5cclxuICAgIHZhciBwYXRoQ21kID0gJyc7XHJcbiAgICAgICAgcGF0aENtZCArPSB0aGlzLl9wYXRoQ21kTGluZSgwLCBsb2NhbFksIHN2Z1NpemUsIGxvY2FsWSk7XHJcbiAgICAgICAgcGF0aENtZCArPSB0aGlzLl9wYXRoQ21kTGluZShsb2NhbFgsIDAsIGxvY2FsWCwgc3ZnU2l6ZSk7XHJcblxyXG4gICAgdGhpcy5fcGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwYXRoQ21kKTtcclxuICAgIHRoaXMuX2hhbmRsZS5zZXRBdHRyaWJ1dGUoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArIGxvY2FsWCArICcgJyArIGxvY2FsWSArICcpJyk7XHJcbn07XHJcblxyXG5QYWQucHJvdG90eXBlLl9nZXRNb3VzZU5vcm1hbGl6ZWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgb2Zmc2V0ID0gdGhpcy5fc3ZnUG9zLFxyXG4gICAgICAgIG1vdXNlID0gTW91c2UuZ2V0KCkuZ2V0UG9zaXRpb24oKSxcclxuICAgICAgICBzdmdTaXplID0gTnVtYmVyKHRoaXMuX3N2Zy5nZXRBdHRyaWJ1dGUoJ3dpZHRoJykpO1xyXG5cclxuICAgIHJldHVybiBbLTEgKyBNYXRoLm1heCgwLCBNYXRoLm1pbihtb3VzZVswXSAtIG9mZnNldFswXSwgc3ZnU2l6ZSkpIC8gc3ZnU2l6ZSAqIDIsXHJcbiAgICAgICAgICAgICggMSAtIE1hdGgubWF4KDAsIE1hdGgubWluKG1vdXNlWzFdIC0gb2Zmc2V0WzFdLCBzdmdTaXplKSkgLyBzdmdTaXplICogMildO1xyXG5cclxufTtcclxuXHJcblBhZC5wcm90b3R5cGUuYXBwbHlWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIG51bGwpKTtcclxufTtcclxuXHJcblBhZC5wcm90b3R5cGUub25WYWx1ZVVwZGF0ZSA9IGZ1bmN0aW9uIChlKSB7XHJcbiAgICBpZiAoZS5kYXRhLm9yaWdpbiA9PSB0aGlzKXJldHVybjtcclxuICAgIHRoaXMuX2RyYXdWYWx1ZSh0aGlzLl9vYmpbdGhpcy5fa2V5XSk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFBhZDtcclxuIiwidmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcclxuXHJcbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xyXG52YXIgTnVtYmVySW5wdXRfSW50ZXJuYWwgPSByZXF1aXJlKCcuL051bWJlcklucHV0X0ludGVybmFsJyk7XHJcbnZhciBNb3VzZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTW91c2UnKTtcclxudmFyIENvbG9yVXRpbCA9IHJlcXVpcmUoJy4uL2NvcmUvY29sb3IvQ29sb3JVdGlsJyk7XHJcbnZhciBEb2N1bWVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXHJcbiAgICBOb2RlRXZlbnQgICAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKTtcclxuXHJcbnZhciBERUZBVUxUX1ZBTFVFX0hVRSA9IDIwMC4wLFxyXG4gICAgREVGQVVMVF9WQUxVRV9TQVQgPSA1MC4wLFxyXG4gICAgREVGQVVMVF9WQUxVRV9WQUwgPSA1MC4wO1xyXG5cclxuZnVuY3Rpb24gUGlja2VyKHBhcmVudE5vZGUpe1xyXG4gICAgdmFyIHJvb3QgPSB0aGlzLl9ub2RlICAgICA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuUGlja2VyKSxcclxuICAgICAgICBoZWFkID0gdGhpcy5faGVhZE5vZGUgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLkhlYWQpLFxyXG4gICAgICAgIGxhYmVsV3JhcCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCksXHJcbiAgICAgICAgbGFiZWwgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKSxcclxuICAgICAgICBtZW51ID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5NZW51KSxcclxuICAgICAgICBtZW51V3JhcCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCk7XHJcblxyXG4gICAgdmFyIG1lbnVDbG9zZSA9IG5ldyBOb2RlKE5vZGUuSU5QVVRfQlVUVE9OKTtcclxuICAgICAgICBtZW51Q2xvc2Uuc2V0U3R5bGVDbGFzcyhDU1MuQnV0dG9uTWVudUNsb3NlKTtcclxuXHJcbiAgICB2YXIgZmllbGRXcmFwICA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyggQ1NTLlBpY2tlckZpZWxkV3JhcCksXHJcbiAgICAgICAgc2xpZGVyV3JhcCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuU2xpZGVyV3JhcCksXHJcbiAgICAgICAgaW5wdXRXcmFwICA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyggQ1NTLlBpY2tlcklucHV0V3JhcCk7XHJcblxyXG4gICAgdmFyIGNhbnZhc0ZpZWxkICA9IHRoaXMuX2NhbnZhc0ZpZWxkICA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpLFxyXG4gICAgICAgIGNhbnZhc1NsaWRlciA9IHRoaXMuX2NhbnZhc1NsaWRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xyXG5cclxuICAgICAgICBmaWVsZFdyYXAuZ2V0RWxlbWVudCgpLmFwcGVuZENoaWxkKGNhbnZhc0ZpZWxkKTtcclxuICAgICAgICBzbGlkZXJXcmFwLmdldEVsZW1lbnQoKS5hcHBlbmRDaGlsZChjYW52YXNTbGlkZXIpO1xyXG5cclxuICAgICAgICB0aGlzLl9zZXRTaXplQ2FudmFzRmllbGQoMTU0LDE1NCk7XHJcbiAgICAgICAgdGhpcy5fc2V0U2l6ZUNhbnZhc1NsaWRlcigxNCwxNTQpO1xyXG5cclxuICAgIHZhciBjb250ZXh0Q2FudmFzRmllbGQgID0gdGhpcy5fY29udGV4dENhbnZhc0ZpZWxkICA9IGNhbnZhc0ZpZWxkLmdldENvbnRleHQoJzJkJyksXHJcbiAgICAgICAgY29udGV4dENhbnZhc1NsaWRlciA9IHRoaXMuX2NvbnRleHRDYW52YXNTbGlkZXIgPSBjYW52YXNTbGlkZXIuZ2V0Q29udGV4dCgnMmQnKTtcclxuXHJcbiAgICB2YXIgaGFuZGxlRmllbGQgID0gdGhpcy5faGFuZGxlRmllbGQgID0gbmV3IE5vZGUoKTtcclxuICAgICAgICBoYW5kbGVGaWVsZC5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJIYW5kbGVGaWVsZCk7XHJcblxyXG4gICAgdmFyIGhhbmRsZVNsaWRlciA9IHRoaXMuX2hhbmRsZVNsaWRlciA9IG5ldyBOb2RlKCk7XHJcbiAgICAgICAgaGFuZGxlU2xpZGVyLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlckhhbmRsZVNsaWRlcik7XHJcblxyXG4gICAgdmFyIHN0ZXAgPSAxLjAsXHJcbiAgICAgICAgZHAgICA9IDA7XHJcblxyXG4gICAgdmFyIGNhbGxiYWNrSHVlID0gdGhpcy5fb25JbnB1dEh1ZUNoYW5nZS5iaW5kKHRoaXMpLFxyXG4gICAgICAgIGNhbGxiYWNrU2F0ID0gdGhpcy5fb25JbnB1dFNhdENoYW5nZS5iaW5kKHRoaXMpLFxyXG4gICAgICAgIGNhbGxiYWNrVmFsID0gdGhpcy5fb25JbnB1dFZhbENoYW5nZS5iaW5kKHRoaXMpLFxyXG4gICAgICAgIGNhbGxiYWNrUiAgID0gdGhpcy5fb25JbnB1dFJDaGFuZ2UuYmluZCh0aGlzKSxcclxuICAgICAgICBjYWxsYmFja0cgICA9IHRoaXMuX29uSW5wdXRHQ2hhbmdlLmJpbmQodGhpcyksXHJcbiAgICAgICAgY2FsbGJhY2tCICAgPSB0aGlzLl9vbklucHV0QkNoYW5nZS5iaW5kKHRoaXMpO1xyXG5cclxuXHJcbiAgICB2YXIgaW5wdXRIdWUgPSB0aGlzLl9pbnB1dEh1ZSA9IG5ldyBOdW1iZXJJbnB1dF9JbnRlcm5hbChzdGVwLGRwLG51bGwsY2FsbGJhY2tIdWUpLFxyXG4gICAgICAgIGlucHV0U2F0ID0gdGhpcy5faW5wdXRTYXQgPSBuZXcgTnVtYmVySW5wdXRfSW50ZXJuYWwoc3RlcCxkcCxudWxsLGNhbGxiYWNrU2F0KSxcclxuICAgICAgICBpbnB1dFZhbCA9IHRoaXMuX2lucHV0VmFsID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHN0ZXAsZHAsbnVsbCxjYWxsYmFja1ZhbCksXHJcbiAgICAgICAgaW5wdXRSICAgPSB0aGlzLl9pbnB1dFIgICA9IG5ldyBOdW1iZXJJbnB1dF9JbnRlcm5hbChzdGVwLGRwLG51bGwsY2FsbGJhY2tSKSxcclxuICAgICAgICBpbnB1dEcgICA9IHRoaXMuX2lucHV0RyAgID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHN0ZXAsZHAsbnVsbCxjYWxsYmFja0cpLFxyXG4gICAgICAgIGlucHV0QiAgID0gdGhpcy5faW5wdXRCICAgPSBuZXcgTnVtYmVySW5wdXRfSW50ZXJuYWwoc3RlcCxkcCxudWxsLGNhbGxiYWNrQik7XHJcblxyXG4gICAgdmFyIGNvbnRyb2xzV3JhcCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuUGlja2VyQ29udHJvbHNXcmFwKTtcclxuXHJcbiAgICB2YXIgYnV0dG9uUGljayAgID0gbmV3IE5vZGUoTm9kZS5JTlBVVF9CVVRUT04pLnNldFN0eWxlQ2xhc3MoQ1NTLkJ1dHRvbikuc2V0UHJvcGVydHkoJ3ZhbHVlJywncGljaycpLFxyXG4gICAgICAgIGJ1dHRvbkNhbmNlbCA9IG5ldyBOb2RlKE5vZGUuSU5QVVRfQlVUVE9OKS5zZXRTdHlsZUNsYXNzKENTUy5CdXR0b24pLnNldFByb3BlcnR5KCd2YWx1ZScsJ2NhbmNlbCcpO1xyXG5cclxuXHJcbiAgICB2YXIgY29sb3JDb250cmFzdCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuUGlja2VyQ29sb3JDb250cmFzdCk7XHJcblxyXG4gICAgdmFyIGNvbG9yMCA9IHRoaXMuX2NvbG9yQ3Vyck5vZGUgPSBuZXcgTm9kZSgpLFxyXG4gICAgICAgIGNvbG9yMSA9IHRoaXMuX2NvbG9yUHJldk5vZGUgPSBuZXcgTm9kZSgpO1xyXG5cclxuICAgIGNvbG9yQ29udHJhc3QuYWRkQ2hpbGQoY29sb3IwKTtcclxuICAgIGNvbG9yQ29udHJhc3QuYWRkQ2hpbGQoY29sb3IxKTtcclxuXHJcbiAgICBjb250cm9sc1dyYXAuYWRkQ2hpbGQoYnV0dG9uQ2FuY2VsKTtcclxuICAgIGNvbnRyb2xzV3JhcC5hZGRDaGlsZChidXR0b25QaWNrKTtcclxuICAgIGNvbnRyb2xzV3JhcC5hZGRDaGlsZChjb2xvckNvbnRyYXN0KTtcclxuXHJcbiAgICB0aGlzLl9zZXRDb250cmFzUHJldkNvbG9yKDAsMCwwKTtcclxuXHJcbiAgICB2YXIgaW5wdXRGaWVsZFdyYXBIdWUgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlcklucHV0RmllbGQpLFxyXG4gICAgICAgIGlucHV0RmllbGRXcmFwU2F0ID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJJbnB1dEZpZWxkKSxcclxuICAgICAgICBpbnB1dEZpZWxkV3JhcFZhbCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuUGlja2VySW5wdXRGaWVsZCk7XHJcblxyXG4gICAgdmFyIGlucHV0RmllbGRXcmFwSHVlTGFiZWwgPSBuZXcgTm9kZShOb2RlLlNQQU4pLnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywnSCcpLFxyXG4gICAgICAgIGlucHV0RmllbGRXcmFwU2F0TGFiZWwgPSBuZXcgTm9kZShOb2RlLlNQQU4pLnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywnUycpLFxyXG4gICAgICAgIGlucHV0RmllbGRXcmFwVmFsTGFiZWwgPSBuZXcgTm9kZShOb2RlLlNQQU4pLnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywnVicpO1xyXG5cclxuICAgICAgICBpbnB1dEZpZWxkV3JhcEh1ZS5hZGRDaGlsZHJlbihpbnB1dEZpZWxkV3JhcEh1ZUxhYmVsLGlucHV0SHVlLmdldE5vZGUoKSk7XHJcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBTYXQuYWRkQ2hpbGRyZW4oaW5wdXRGaWVsZFdyYXBTYXRMYWJlbCxpbnB1dFNhdC5nZXROb2RlKCkpO1xyXG4gICAgICAgIGlucHV0RmllbGRXcmFwVmFsLmFkZENoaWxkcmVuKGlucHV0RmllbGRXcmFwVmFsTGFiZWwsaW5wdXRWYWwuZ2V0Tm9kZSgpKTtcclxuXHJcbiAgICB2YXIgaW5wdXRGaWVsZFdyYXBSID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJJbnB1dEZpZWxkKSxcclxuICAgICAgICBpbnB1dEZpZWxkV3JhcEcgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlcklucHV0RmllbGQpLFxyXG4gICAgICAgIGlucHV0RmllbGRXcmFwQiA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuUGlja2VySW5wdXRGaWVsZCk7XHJcblxyXG4gICAgdmFyIGlucHV0RmllbGRXcmFwUkxhYmVsID0gbmV3IE5vZGUoTm9kZS5TUEFOKS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCkuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsJ1InKSxcclxuICAgICAgICBpbnB1dEZpZWxkV3JhcEdMYWJlbCA9IG5ldyBOb2RlKE5vZGUuU1BBTikuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCdHJyksXHJcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBCTGFiZWwgPSBuZXcgTm9kZShOb2RlLlNQQU4pLnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywnQicpO1xyXG5cclxuICAgICAgICBpbnB1dEZpZWxkV3JhcFIuYWRkQ2hpbGRyZW4oaW5wdXRGaWVsZFdyYXBSTGFiZWwsaW5wdXRSLmdldE5vZGUoKSk7XHJcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBHLmFkZENoaWxkcmVuKGlucHV0RmllbGRXcmFwR0xhYmVsLGlucHV0Ry5nZXROb2RlKCkpO1xyXG4gICAgICAgIGlucHV0RmllbGRXcmFwQi5hZGRDaGlsZHJlbihpbnB1dEZpZWxkV3JhcEJMYWJlbCxpbnB1dEIuZ2V0Tm9kZSgpKTtcclxuXHJcblxyXG4gICAgICAgIGlucHV0V3JhcC5hZGRDaGlsZHJlbihpbnB1dEZpZWxkV3JhcFIsaW5wdXRGaWVsZFdyYXBIdWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0RmllbGRXcmFwRyxpbnB1dEZpZWxkV3JhcFNhdCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRGaWVsZFdyYXBCLGlucHV0RmllbGRXcmFwVmFsLGNvbG9yQ29udHJhc3QpO1xyXG5cclxuICAgIHZhciBoZXhJbnB1dFdyYXAgPSBuZXcgTm9kZSgpO1xyXG4gICAgICAgIGhleElucHV0V3JhcC5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJJbnB1dFdyYXApO1xyXG5cclxuICAgIHZhciBpbnB1dEhFWCA9IHRoaXMuX2lucHV0SEVYID0gbmV3IE5vZGUoTm9kZS5JTlBVVF9URVhUKSxcclxuICAgICAgICBpbnB1dEZpZWxkV3JhcEhFWCAgICAgICAgID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJJbnB1dEZpZWxkKSxcclxuICAgICAgICBpbnB1dEZpZWxkV3JhcEhFWExhYmVsICAgID0gbmV3IE5vZGUoTm9kZS5TUEFOKS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCk7XHJcblxyXG4gICAgICAgIGlucHV0RmllbGRXcmFwSEVYTGFiZWwuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsJyMnKTtcclxuICAgICAgICBpbnB1dEZpZWxkV3JhcEhFWC5hZGRDaGlsZHJlbihpbnB1dEZpZWxkV3JhcEhFWExhYmVsLGlucHV0SEVYKTtcclxuXHJcbiAgICAgICAgaGV4SW5wdXRXcmFwLmFkZENoaWxkKGlucHV0RmllbGRXcmFwSEVYKTtcclxuXHJcbiAgICAgICAgaW5wdXRIRVguYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuQ0hBTkdFLHRoaXMuX29uSW5wdXRIRVhGaW5pc2guYmluZCh0aGlzKSk7XHJcblxyXG4gICAgICAgIGxhYmVsLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCdDb2xvciBQaWNrZXInKTtcclxuXHJcbiAgICAgICAgbWVudS5hZGRDaGlsZChtZW51Q2xvc2UpO1xyXG4gICAgICAgIGhlYWQuYWRkQ2hpbGQobWVudSk7XHJcbiAgICAgICAgbGFiZWxXcmFwLmFkZENoaWxkKGxhYmVsKTtcclxuICAgICAgICBoZWFkLmFkZENoaWxkKGxhYmVsV3JhcCk7XHJcbiAgICAgICAgcm9vdC5hZGRDaGlsZChoZWFkKTtcclxuICAgICAgICByb290LmFkZENoaWxkKG1lbnVXcmFwKTtcclxuXHJcbiAgICAgICAgLy93cmFwTm9kZS5hZGRDaGlsZChwYWxldHRlV3JhcCk7XHJcblxyXG4gICAgICAgIG1lbnVXcmFwLmFkZENoaWxkKGZpZWxkV3JhcCk7XHJcbiAgICAgICAgbWVudVdyYXAuYWRkQ2hpbGQoc2xpZGVyV3JhcCk7XHJcbiAgICAgICAgbWVudVdyYXAuYWRkQ2hpbGQoaW5wdXRXcmFwKTtcclxuICAgICAgICBtZW51V3JhcC5hZGRDaGlsZChoZXhJbnB1dFdyYXApO1xyXG4gICAgICAgIG1lbnVXcmFwLmFkZENoaWxkKGNvbnRyb2xzV3JhcCk7XHJcblxyXG4gICAgICAgIGZpZWxkV3JhcC5hZGRDaGlsZCggaGFuZGxlRmllbGQpO1xyXG4gICAgICAgIHNsaWRlcldyYXAuYWRkQ2hpbGQoaGFuZGxlU2xpZGVyKTtcclxuXHJcbiAgICB2YXIgZXZlbnRNb3VzZURvd24gPSBOb2RlRXZlbnQuTU9VU0VfRE9XTixcclxuICAgICAgICBjYWxsYmFjayAgICAgICA9IHRoaXMuX29uQ2FudmFzRmllbGRNb3VzZURvd24uYmluZCh0aGlzKTtcclxuXHJcbiAgICAgICAgZmllbGRXcmFwLmFkZEV2ZW50TGlzdGVuZXIoICBldmVudE1vdXNlRG93biwgY2FsbGJhY2spO1xyXG4gICAgICAgIGhhbmRsZUZpZWxkLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZURvd24sIGNhbGxiYWNrKTtcclxuXHJcbiAgICAgICAgY2FsbGJhY2sgPSB0aGlzLl9vbkNhbnZhc1NsaWRlck1vdXNlRG93bi5iaW5kKHRoaXMpO1xyXG5cclxuICAgICAgICBzbGlkZXJXcmFwLmFkZEV2ZW50TGlzdGVuZXIoICBldmVudE1vdXNlRG93biwgY2FsbGJhY2spO1xyXG4gICAgICAgIGhhbmRsZVNsaWRlci5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VEb3duLCBjYWxsYmFjayk7XHJcblxyXG4gICAgICAgIG1lbnVDbG9zZS5hZGRFdmVudExpc3RlbmVyKCAgIGV2ZW50TW91c2VEb3duLCB0aGlzLl9vbkNsb3NlLmJpbmQodGhpcykpO1xyXG4gICAgICAgIGJ1dHRvblBpY2suYWRkRXZlbnRMaXN0ZW5lciggIGV2ZW50TW91c2VEb3duLCB0aGlzLl9vblBpY2suYmluZCh0aGlzKSk7XHJcbiAgICAgICAgYnV0dG9uQ2FuY2VsLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZURvd24sIHRoaXMuX29uQ2xvc2UuYmluZCh0aGlzKSk7XHJcblxyXG4gICAgICAgIGhlYWQuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25IZWFkRHJhZ1N0YXJ0LmJpbmQodGhpcykpO1xyXG5cclxuICAgIHRoaXMuX3BhcmVudE5vZGUgPSBwYXJlbnROb2RlO1xyXG5cclxuICAgIHRoaXMuX21vdXNlT2Zmc2V0ID0gWzAsMF07XHJcbiAgICB0aGlzLl9wb3NpdGlvbiAgICA9IFtudWxsLG51bGxdO1xyXG5cclxuICAgIHRoaXMuX2NhbnZhc1NsaWRlclBvcyA9IFswLDBdO1xyXG4gICAgdGhpcy5fY2FudmFzRmllbGRQb3MgID0gWzAsMF07XHJcbiAgICB0aGlzLl9oYW5kbGVGaWVsZFNpemUgICAgPSAxMjtcclxuICAgIHRoaXMuX2hhbmRsZVNsaWRlckhlaWdodCA9IDc7XHJcblxyXG4gICAgdGhpcy5faW1hZ2VEYXRhU2xpZGVyID0gY29udGV4dENhbnZhc1NsaWRlci5jcmVhdGVJbWFnZURhdGEoY2FudmFzU2xpZGVyLndpZHRoLGNhbnZhc1NsaWRlci5oZWlnaHQpO1xyXG4gICAgdGhpcy5faW1hZ2VEYXRhRmllbGQgID0gY29udGV4dENhbnZhc0ZpZWxkLmNyZWF0ZUltYWdlRGF0YSggY2FudmFzRmllbGQud2lkdGgsIGNhbnZhc0ZpZWxkLmhlaWdodCk7XHJcblxyXG4gICAgdGhpcy5fdmFsdWVIdWVNaW5NYXggPSBbMCwzNjBdO1xyXG4gICAgdGhpcy5fdmFsdWVTYXRNaW5NYXggPSB0aGlzLl92YWx1ZVZhbE1pbk1heCA9IFswLDEwMF07XHJcbiAgICB0aGlzLl92YWx1ZVJHQk1pbk1heCA9IFswLDI1NV07XHJcblxyXG4gICAgdGhpcy5fdmFsdWVIdWUgPSBERUZBVUxUX1ZBTFVFX0hVRTtcclxuICAgIHRoaXMuX3ZhbHVlU2F0ID0gREVGQVVMVF9WQUxVRV9TQVQ7XHJcbiAgICB0aGlzLl92YWx1ZVZhbCA9IERFRkFVTFRfVkFMVUVfVkFMO1xyXG4gICAgdGhpcy5fdmFsdWVSICAgPSAwO1xyXG4gICAgdGhpcy5fdmFsdWVHICAgPSAwO1xyXG4gICAgdGhpcy5fdmFsdWVCICAgPSAwO1xyXG5cclxuICAgIHRoaXMuX3ZhbHVlSEVYID0gJyMwMDAwMDAnO1xyXG4gICAgdGhpcy5fdmFsdWVIRVhWYWxpZCA9IHRoaXMuX3ZhbHVlSEVYO1xyXG5cclxuICAgIHRoaXMuX2NhbGxiYWNrUGljayA9IGZ1bmN0aW9uKCl7fTtcclxuXHJcbiAgICAvL3RoaXMuX2NhbnZhc0ZpZWxkSW1hZ2VEYXRhRnVuYyA9IGZ1bmN0aW9uKGksail7cmV0dXJuIHRoaXMuX0hTVjJSR0IodGhpcy5fdmFsdWVIdWUsail9XHJcblxyXG4gICAgdGhpcy5fZHJhd0NhbnZhc0ZpZWxkKCk7XHJcbiAgICB0aGlzLl9kcmF3Q2FudmFzU2xpZGVyKCk7XHJcblxyXG4gICAgdGhpcy5fc2V0Q29sb3JIU1YodGhpcy5fdmFsdWVIdWUsdGhpcy5fdmFsdWVTYXQsdGhpcy5fdmFsdWVWYWwpO1xyXG5cclxuICAgIHRoaXMuX3VwZGF0ZUNvbG9yUkdCRnJvbUhTVigpO1xyXG4gICAgdGhpcy5fdXBkYXRlQ29sb3JIRVhGcm9tUkdCKCk7XHJcblxyXG4gICAgdGhpcy5fdXBkYXRlSGFuZGxlcygpO1xyXG59XHJcblxyXG5QaWNrZXIucHJvdG90eXBlID1cclxue1xyXG4gICAgX2RyYXdIYW5kbGVGaWVsZDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXNGaWVsZCxcclxuICAgICAgICAgICAgbm9kZVBvcyA9IHRoaXMuX2NhbnZhc0ZpZWxkUG9zLFxyXG4gICAgICAgICAgICBtb3VzZVBvcyA9IE1vdXNlLmdldCgpLmdldFBvc2l0aW9uKCk7XHJcblxyXG4gICAgICAgIHZhciBwb3NYID0gTWF0aC5tYXgoMCwgTWF0aC5taW4obW91c2VQb3NbMF0gLSBub2RlUG9zWzBdLCBjYW52YXMud2lkdGgpKSxcclxuICAgICAgICAgICAgcG9zWSA9IE1hdGgubWF4KDAsIE1hdGgubWluKG1vdXNlUG9zWzFdIC0gbm9kZVBvc1sxXSwgY2FudmFzLmhlaWdodCkpLFxyXG4gICAgICAgICAgICBwb3NYTm9ybSA9IHBvc1ggLyBjYW52YXMud2lkdGgsXHJcbiAgICAgICAgICAgIHBvc1lOb3JtID0gcG9zWSAvIGNhbnZhcy5oZWlnaHQ7XHJcblxyXG4gICAgICAgIHZhciBzYXQgPSBNYXRoLnJvdW5kKHBvc1hOb3JtICogdGhpcy5fdmFsdWVTYXRNaW5NYXhbMV0pLFxyXG4gICAgICAgICAgICB2YWwgPSBNYXRoLnJvdW5kKCgxLjAgLSBwb3NZTm9ybSkgKiB0aGlzLl92YWx1ZVZhbE1pbk1heFsxXSk7XHJcblxyXG4gICAgICAgIHRoaXMuX3NldENvbG9ySFNWKHRoaXMuX3ZhbHVlSHVlLCBzYXQsIHZhbCk7XHJcblxyXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9yUkdCRnJvbUhTVigpO1xyXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySEVYRnJvbVJHQigpO1xyXG5cclxuICAgICAgICB0aGlzLl91cGRhdGVIYW5kbGVGaWVsZCgpO1xyXG4gICAgfSxcclxuXHJcbiAgICBfdXBkYXRlSGFuZGxlRmllbGQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgd2lkdGggPSB0aGlzLl9jYW52YXNGaWVsZC53aWR0aCxcclxuICAgICAgICAgICAgaGVpZ2h0ID0gdGhpcy5fY2FudmFzRmllbGQuaGVpZ2h0LFxyXG4gICAgICAgICAgICBvZmZzZXRIYW5kbGUgPSB0aGlzLl9oYW5kbGVGaWVsZFNpemUgKiAwLjI1O1xyXG5cclxuICAgICAgICB2YXIgc2F0Tm9ybSA9IHRoaXMuX3ZhbHVlU2F0IC8gdGhpcy5fdmFsdWVTYXRNaW5NYXhbMV0sXHJcbiAgICAgICAgICAgIHZhbE5vcm0gPSB0aGlzLl92YWx1ZVZhbCAvIHRoaXMuX3ZhbHVlVmFsTWluTWF4WzFdO1xyXG5cclxuICAgICAgICB0aGlzLl9oYW5kbGVGaWVsZC5zZXRQb3NpdGlvbkdsb2JhbChzYXROb3JtICogd2lkdGggLSBvZmZzZXRIYW5kbGUsXHJcbiAgICAgICAgICAgICgxLjAgLSB2YWxOb3JtKSAqIGhlaWdodCAtIG9mZnNldEhhbmRsZSk7XHJcblxyXG4gICAgfSxcclxuXHJcbiAgICBfZHJhd0hhbmRsZVNsaWRlcjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXNTbGlkZXIsXHJcbiAgICAgICAgICAgIGNhbnZhc1Bvc1kgPSB0aGlzLl9jYW52YXNTbGlkZXJQb3NbMV0sXHJcbiAgICAgICAgICAgIG1vdXNlUG9zWSA9IE1vdXNlLmdldCgpLmdldFkoKTtcclxuXHJcbiAgICAgICAgdmFyIHBvc1kgPSBNYXRoLm1heCgwLCBNYXRoLm1pbihtb3VzZVBvc1kgLSBjYW52YXNQb3NZLCBjYW52YXMuaGVpZ2h0KSksXHJcbiAgICAgICAgICAgIHBvc1lOb3JtID0gcG9zWSAvIGNhbnZhcy5oZWlnaHQ7XHJcblxyXG4gICAgICAgIHZhciBodWUgPSBNYXRoLmZsb29yKCgxLjAgLSBwb3NZTm9ybSkgKiB0aGlzLl92YWx1ZUh1ZU1pbk1heFsxXSk7XHJcblxyXG4gICAgICAgIHRoaXMuX3NldENvbG9ySFNWKGh1ZSwgdGhpcy5fdmFsdWVTYXQsIHRoaXMuX3ZhbHVlVmFsKTtcclxuXHJcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JSR0JGcm9tSFNWKCk7XHJcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIRVhGcm9tUkdCKCk7XHJcblxyXG4gICAgICAgIHRoaXMuX3VwZGF0ZUhhbmRsZVNsaWRlcigpO1xyXG4gICAgfSxcclxuXHJcbiAgICBfdXBkYXRlSGFuZGxlU2xpZGVyOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIGhlaWdodCA9IHRoaXMuX2NhbnZhc1NsaWRlci5oZWlnaHQsXHJcbiAgICAgICAgICAgIG9mZnNldEhhbmRsZSA9IHRoaXMuX2hhbmRsZVNsaWRlckhlaWdodCAqIDAuMjU7XHJcblxyXG4gICAgICAgIHZhciBodWVOb3JtID0gdGhpcy5fdmFsdWVIdWUgLyB0aGlzLl92YWx1ZUh1ZU1pbk1heFsxXTtcclxuXHJcbiAgICAgICAgdGhpcy5faGFuZGxlU2xpZGVyLnNldFBvc2l0aW9uR2xvYmFsWSgoaGVpZ2h0IC0gb2Zmc2V0SGFuZGxlKSAqICgxLjAgLSBodWVOb3JtKSk7XHJcbiAgICB9LFxyXG5cclxuICAgIF91cGRhdGVIYW5kbGVzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5fdXBkYXRlSGFuZGxlRmllbGQoKTtcclxuICAgICAgICB0aGlzLl91cGRhdGVIYW5kbGVTbGlkZXIoKTtcclxuICAgIH0sXHJcblxyXG4gICAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xyXG5cclxuICAgIF9zZXRIdWU6IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgICAgIHZhciBtaW5NYXggPSB0aGlzLl92YWx1ZUh1ZU1pbk1heDtcclxuXHJcbiAgICAgICAgdGhpcy5fdmFsdWVIdWUgPSB2YWx1ZSA9PSBtaW5NYXhbMV0gPyBtaW5NYXhbMF0gOiB2YWx1ZTtcclxuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhTVigpO1xyXG4gICAgICAgIHRoaXMuX2RyYXdDYW52YXNGaWVsZCgpO1xyXG4gICAgfSxcclxuXHJcbiAgICBfc2V0U2F0OiBmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgICAgICB0aGlzLl92YWx1ZVNhdCA9IE1hdGgucm91bmQodmFsdWUpO1xyXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySFNWKCk7XHJcbiAgICB9LFxyXG5cclxuICAgIF9zZXRWYWw6IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgICAgIHRoaXMuX3ZhbHVlVmFsID0gTWF0aC5yb3VuZCh2YWx1ZSk7XHJcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIU1YoKTtcclxuICAgIH0sXHJcblxyXG4gICAgX3NldFI6IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgICAgIHRoaXMuX3ZhbHVlUiA9IE1hdGgucm91bmQodmFsdWUpO1xyXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9yUkdCKCk7XHJcbiAgICB9LFxyXG5cclxuICAgIF9zZXRHOiBmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgICAgICB0aGlzLl92YWx1ZUcgPSBNYXRoLnJvdW5kKHZhbHVlKTtcclxuICAgICAgICB0aGlzLl91cGRhdGVDb2xvclJHQigpO1xyXG4gICAgfSxcclxuXHJcbiAgICBfc2V0QjogZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgdGhpcy5fdmFsdWVCID0gTWF0aC5yb3VuZCh2YWx1ZSk7XHJcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JSR0IoKTtcclxuICAgIH0sXHJcblxyXG4gICAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xyXG5cclxuICAgIF9vbklucHV0SHVlQ2hhbmdlOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIGlucHV0ID0gdGhpcy5faW5wdXRIdWUsXHJcbiAgICAgICAgICAgIGlucHV0VmFsID0gdGhpcy5fZ2V0VmFsdWVDb250cmFpbmVkKGlucHV0LCB0aGlzLl92YWx1ZUh1ZU1pbk1heCk7XHJcblxyXG4gICAgICAgIHZhciBtaW5NYXggPSB0aGlzLl92YWx1ZUh1ZU1pbk1heDtcclxuXHJcbiAgICAgICAgaWYgKGlucHV0VmFsID09IG1pbk1heFsxXSkge1xyXG4gICAgICAgICAgICBpbnB1dFZhbCA9IG1pbk1heFswXTtcclxuICAgICAgICAgICAgaW5wdXQuc2V0VmFsdWUoaW5wdXRWYWwpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5fc2V0SHVlKGlucHV0VmFsKTtcclxuICAgICAgICB0aGlzLl91cGRhdGVDb2xvclJHQkZyb21IU1YoKTtcclxuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhFWEZyb21SR0IoKTtcclxuICAgICAgICB0aGlzLl91cGRhdGVIYW5kbGVTbGlkZXIoKTtcclxuXHJcbiAgICAgICAgdGhpcy5fZHJhd0NhbnZhc0ZpZWxkKCk7XHJcbiAgICB9LFxyXG5cclxuICAgIF9vbklucHV0U2F0Q2hhbmdlOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5fc2V0U2F0KHRoaXMuX2dldFZhbHVlQ29udHJhaW5lZCh0aGlzLl9pbnB1dFNhdCwgdGhpcy5fdmFsdWVTYXRNaW5NYXgpKTtcclxuICAgICAgICB0aGlzLl9vbklucHV0U1ZDaGFuZ2UoKTtcclxuICAgIH0sXHJcblxyXG4gICAgX29uSW5wdXRWYWxDaGFuZ2U6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLl9zZXRWYWwodGhpcy5fZ2V0VmFsdWVDb250cmFpbmVkKHRoaXMuX2lucHV0VmFsLCB0aGlzLl92YWx1ZVZhbE1pbk1heCkpO1xyXG4gICAgICAgIHRoaXMuX29uSW5wdXRTVkNoYW5nZSgpO1xyXG4gICAgfSxcclxuXHJcbiAgICBfb25JbnB1dFJDaGFuZ2U6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLl9zZXRSKHRoaXMuX2dldFZhbHVlQ29udHJhaW5lZCh0aGlzLl9pbnB1dFIsIHRoaXMuX3ZhbHVlUkdCTWluTWF4KSk7XHJcbiAgICAgICAgdGhpcy5fb25JbnB1dFJHQkNoYW5nZSgpO1xyXG4gICAgfSxcclxuXHJcbiAgICBfb25JbnB1dEdDaGFuZ2U6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLl9zZXRHKHRoaXMuX2dldFZhbHVlQ29udHJhaW5lZCh0aGlzLl9pbnB1dEcsIHRoaXMuX3ZhbHVlUkdCTWluTWF4KSk7XHJcbiAgICAgICAgdGhpcy5fb25JbnB1dFJHQkNoYW5nZSgpO1xyXG4gICAgfSxcclxuXHJcbiAgICBfb25JbnB1dEJDaGFuZ2U6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLl9zZXRCKHRoaXMuX2dldFZhbHVlQ29udHJhaW5lZCh0aGlzLl9pbnB1dEIsIHRoaXMuX3ZhbHVlUkdCTWluTWF4KSk7XHJcbiAgICAgICAgdGhpcy5fb25JbnB1dFJHQkNoYW5nZSgpO1xyXG4gICAgfSxcclxuXHJcbiAgICBfb25JbnB1dEhFWEZpbmlzaDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBpbnB1dCA9IHRoaXMuX2lucHV0SEVYLFxyXG4gICAgICAgICAgICB2YWx1ZSA9IGlucHV0LmdldFByb3BlcnR5KCd2YWx1ZScpO1xyXG5cclxuICAgICAgICBpZiAoIUNvbG9yVXRpbC5pc1ZhbGlkSEVYKHZhbHVlKSkge1xyXG4gICAgICAgICAgICBpbnB1dC5zZXRQcm9wZXJ0eSgndmFsdWUnLCB0aGlzLl92YWx1ZUhFWFZhbGlkKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5fdmFsdWVIRVggPSB0aGlzLl92YWx1ZUhFWFZhbGlkID0gdmFsdWU7XHJcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JGcm9tSEVYKCk7XHJcbiAgICB9LFxyXG5cclxuICAgIF9vbklucHV0U1ZDaGFuZ2U6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLl91cGRhdGVDb2xvclJHQkZyb21IU1YoKTtcclxuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhFWEZyb21SR0IoKTtcclxuICAgICAgICB0aGlzLl91cGRhdGVIYW5kbGVGaWVsZCgpO1xyXG4gICAgfSxcclxuXHJcbiAgICBfb25JbnB1dFJHQkNoYW5nZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySFNWRnJvbVJHQigpO1xyXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySEVYRnJvbVJHQigpO1xyXG4gICAgICAgIHRoaXMuX3VwZGF0ZUhhbmRsZXMoKTtcclxuICAgIH0sXHJcblxyXG4gICAgX2dldFZhbHVlQ29udHJhaW5lZDogZnVuY3Rpb24gKGlucHV0LCBtaW5NYXgpIHtcclxuICAgICAgICB2YXIgaW5wdXRWYWwgPSBNYXRoLnJvdW5kKGlucHV0LmdldFZhbHVlKCkpLFxyXG4gICAgICAgICAgICBtaW4gPSBtaW5NYXhbMF0sXHJcbiAgICAgICAgICAgIG1heCA9IG1pbk1heFsxXTtcclxuXHJcbiAgICAgICAgaWYgKGlucHV0VmFsIDw9IG1pbikge1xyXG4gICAgICAgICAgICBpbnB1dFZhbCA9IG1pbjtcclxuICAgICAgICAgICAgaW5wdXQuc2V0VmFsdWUoaW5wdXRWYWwpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoaW5wdXRWYWwgPj0gbWF4KSB7XHJcbiAgICAgICAgICAgIGlucHV0VmFsID0gbWF4O1xyXG4gICAgICAgICAgICBpbnB1dC5zZXRWYWx1ZShpbnB1dFZhbCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gaW5wdXRWYWw7XHJcbiAgICB9LFxyXG5cclxuXHJcbiAgICBfdXBkYXRlSW5wdXRIdWU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLl9pbnB1dEh1ZS5zZXRWYWx1ZSh0aGlzLl92YWx1ZUh1ZSk7XHJcbiAgICB9LFxyXG4gICAgX3VwZGF0ZUlucHV0U2F0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5faW5wdXRTYXQuc2V0VmFsdWUodGhpcy5fdmFsdWVTYXQpO1xyXG4gICAgfSxcclxuICAgIF91cGRhdGVJbnB1dFZhbDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuX2lucHV0VmFsLnNldFZhbHVlKHRoaXMuX3ZhbHVlVmFsKTtcclxuICAgIH0sXHJcbiAgICBfdXBkYXRlSW5wdXRSOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5faW5wdXRSLnNldFZhbHVlKHRoaXMuX3ZhbHVlUik7XHJcbiAgICB9LFxyXG4gICAgX3VwZGF0ZUlucHV0RzogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuX2lucHV0Ry5zZXRWYWx1ZSh0aGlzLl92YWx1ZUcpO1xyXG4gICAgfSxcclxuICAgIF91cGRhdGVJbnB1dEI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLl9pbnB1dEIuc2V0VmFsdWUodGhpcy5fdmFsdWVCKTtcclxuICAgIH0sXHJcbiAgICBfdXBkYXRlSW5wdXRIRVg6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLl9pbnB1dEhFWC5zZXRQcm9wZXJ0eSgndmFsdWUnLCB0aGlzLl92YWx1ZUhFWCk7XHJcbiAgICB9LFxyXG5cclxuXHJcbiAgICBfc2V0Q29sb3JIU1Y6IGZ1bmN0aW9uIChodWUsIHNhdCwgdmFsKSB7XHJcbiAgICAgICAgdGhpcy5fdmFsdWVIdWUgPSBodWU7XHJcbiAgICAgICAgdGhpcy5fdmFsdWVTYXQgPSBzYXQ7XHJcbiAgICAgICAgdGhpcy5fdmFsdWVWYWwgPSB2YWw7XHJcblxyXG4gICAgICAgIHRoaXMuX3VwZGF0ZUlucHV0SHVlKCk7XHJcbiAgICAgICAgdGhpcy5fdXBkYXRlSW5wdXRTYXQoKTtcclxuICAgICAgICB0aGlzLl91cGRhdGVJbnB1dFZhbCgpO1xyXG5cclxuICAgICAgICB0aGlzLl91cGRhdGVDb250cmFzdEN1cnJDb2xvcigpO1xyXG4gICAgfSxcclxuXHJcbiAgICBfc2V0Q29sb3JSR0I6IGZ1bmN0aW9uIChyLCBnLCBiKSB7XHJcbiAgICAgICAgdGhpcy5fdmFsdWVSID0gcjtcclxuICAgICAgICB0aGlzLl92YWx1ZUcgPSBnO1xyXG4gICAgICAgIHRoaXMuX3ZhbHVlQiA9IGI7XHJcblxyXG4gICAgICAgIHRoaXMuX3VwZGF0ZUlucHV0UigpO1xyXG4gICAgICAgIHRoaXMuX3VwZGF0ZUlucHV0RygpO1xyXG4gICAgICAgIHRoaXMuX3VwZGF0ZUlucHV0QigpO1xyXG5cclxuICAgICAgICB0aGlzLl91cGRhdGVDb250cmFzdEN1cnJDb2xvcigpO1xyXG4gICAgfSxcclxuXHJcbiAgICBfc2V0Q29sb3JIRVg6IGZ1bmN0aW9uIChoZXgpIHtcclxuICAgICAgICB0aGlzLl92YWx1ZUhFWCA9IGhleDtcclxuICAgICAgICB0aGlzLl91cGRhdGVJbnB1dEhFWCgpO1xyXG4gICAgfSxcclxuXHJcbiAgICBfdXBkYXRlQ29sb3JIU1Y6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLl9zZXRDb2xvckhTVih0aGlzLl92YWx1ZUh1ZSwgdGhpcy5fdmFsdWVTYXQsIHRoaXMuX3ZhbHVlVmFsKTtcclxuICAgICAgICB0aGlzLl91cGRhdGVDb250cmFzdEN1cnJDb2xvcigpO1xyXG4gICAgfSxcclxuXHJcbiAgICBfdXBkYXRlQ29sb3JSR0I6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLl9zZXRDb2xvclJHQih0aGlzLl92YWx1ZVIsIHRoaXMuX3ZhbHVlRywgdGhpcy5fdmFsdWVCKTtcclxuICAgICAgICB0aGlzLl91cGRhdGVDb250cmFzdEN1cnJDb2xvcigpO1xyXG4gICAgfSxcclxuXHJcbiAgICBfdXBkYXRlQ29sb3JIU1ZGcm9tUkdCOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIGhzdiA9IENvbG9yVXRpbC5SR0IySFNWKHRoaXMuX3ZhbHVlUiwgdGhpcy5fdmFsdWVHLCB0aGlzLl92YWx1ZUIpO1xyXG4gICAgICAgIHRoaXMuX3NldENvbG9ySFNWKGhzdlswXSwgaHN2WzFdLCBoc3ZbMl0pO1xyXG4gICAgfSxcclxuXHJcbiAgICBfdXBkYXRlQ29sb3JSR0JGcm9tSFNWOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIHJnYiA9IENvbG9yVXRpbC5IU1YyUkdCKHRoaXMuX3ZhbHVlSHVlLCB0aGlzLl92YWx1ZVNhdCwgdGhpcy5fdmFsdWVWYWwpO1xyXG4gICAgICAgIHRoaXMuX3NldENvbG9yUkdCKHJnYlswXSwgcmdiWzFdLCByZ2JbMl0pO1xyXG4gICAgfSxcclxuXHJcbiAgICBfdXBkYXRlQ29sb3JIRVhGcm9tUkdCOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIGhleCA9IENvbG9yVXRpbC5SR0IySEVYKHRoaXMuX3ZhbHVlUiwgdGhpcy5fdmFsdWVHLCB0aGlzLl92YWx1ZUIpO1xyXG4gICAgICAgIHRoaXMuX3NldENvbG9ySEVYKGhleCk7XHJcbiAgICB9LFxyXG5cclxuICAgIF91cGRhdGVDb2xvckZyb21IRVg6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgcmdiID0gQ29sb3JVdGlsLkhFWDJSR0IodGhpcy5fdmFsdWVIRVgpO1xyXG5cclxuICAgICAgICB0aGlzLl9zZXRDb2xvclJHQihyZ2JbMF0sIHJnYlsxXSwgcmdiWzJdKTtcclxuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhTVkZyb21SR0IoKTtcclxuICAgICAgICB0aGlzLl91cGRhdGVIYW5kbGVzKCk7XHJcbiAgICB9LFxyXG5cclxuICAgIF91cGRhdGVDb250cmFzdEN1cnJDb2xvcjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuX3NldENvbnRyYXN0Q3VyckNvbG9yKHRoaXMuX3ZhbHVlUiwgdGhpcy5fdmFsdWVHLCB0aGlzLl92YWx1ZUIpO1xyXG4gICAgfSxcclxuICAgIF91cGRhdGVDb250cmFzdFByZXZDb2xvcjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuX3NldENvbnRyYXNQcmV2Q29sb3IodGhpcy5fdmFsdWVSLCB0aGlzLl92YWx1ZUcsIHRoaXMuX3ZhbHVlQilcclxuICAgIH0sXHJcblxyXG4gICAgX3NldENvbnRyYXN0Q3VyckNvbG9yOiBmdW5jdGlvbiAociwgZywgYikge1xyXG4gICAgICAgIHRoaXMuX2NvbG9yQ3Vyck5vZGUuc2V0U3R5bGVQcm9wZXJ0eSgnYmFja2dyb3VuZCcsICdyZ2IoJyArIHIgKyAnLCcgKyBnICsgJywnICsgYiArICcpJylcclxuICAgIH0sXHJcbiAgICBfc2V0Q29udHJhc1ByZXZDb2xvcjogZnVuY3Rpb24gKHIsIGcsIGIpIHtcclxuICAgICAgICB0aGlzLl9jb2xvclByZXZOb2RlLnNldFN0eWxlUHJvcGVydHkoJ2JhY2tncm91bmQnLCAncmdiKCcgKyByICsgJywnICsgZyArICcsJyArIGIgKyAnKScpXHJcbiAgICB9LFxyXG5cclxuICAgIF9vbkhlYWREcmFnU3RhcnQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgbm9kZSA9IHRoaXMuX25vZGUsXHJcbiAgICAgICAgICAgIHBhcmVudE5vZGUgPSB0aGlzLl9wYXJlbnROb2RlO1xyXG5cclxuICAgICAgICB2YXIgbm9kZVBvcyA9IG5vZGUuZ2V0UG9zaXRpb25HbG9iYWwoKSxcclxuICAgICAgICAgICAgbW91c2VQb3MgPSBNb3VzZS5nZXQoKS5nZXRQb3NpdGlvbigpLFxyXG4gICAgICAgICAgICBvZmZzZXRQb3MgPSB0aGlzLl9tb3VzZU9mZnNldDtcclxuXHJcbiAgICAgICAgb2Zmc2V0UG9zWzBdID0gbW91c2VQb3NbMF0gLSBub2RlUG9zWzBdO1xyXG4gICAgICAgIG9mZnNldFBvc1sxXSA9IG1vdXNlUG9zWzFdIC0gbm9kZVBvc1sxXTtcclxuXHJcbiAgICAgICAgdmFyIGV2ZW50TW91c2VNb3ZlID0gRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLFxyXG4gICAgICAgICAgICBldmVudE1vdXNlVXAgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX1VQO1xyXG5cclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gICAgICAgIHZhciBvbkRyYWcgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVQb3NpdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlQ2FudmFzTm9kZVBvc2l0aW9ucygpO1xyXG4gICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAgICAgb25EcmFnRW5kID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlQ2FudmFzTm9kZVBvc2l0aW9ucygpO1xyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCBmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW91c2VVcCwgb25EcmFnRW5kLCBmYWxzZSk7XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgIHBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobm9kZSk7XHJcbiAgICAgICAgcGFyZW50Tm9kZS5hZGRDaGlsZChub2RlKTtcclxuXHJcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCBmYWxzZSk7XHJcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlVXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xyXG5cclxuICAgICAgICB0aGlzLl91cGRhdGVDYW52YXNOb2RlUG9zaXRpb25zKCk7XHJcbiAgICB9LFxyXG5cclxuICAgIF91cGRhdGVQb3NpdGlvbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBtb3VzZVBvcyA9IE1vdXNlLmdldCgpLmdldFBvc2l0aW9uKCksXHJcbiAgICAgICAgICAgIG9mZnNldFBvcyA9IHRoaXMuX21vdXNlT2Zmc2V0O1xyXG5cclxuICAgICAgICB2YXIgY3VyclBvc2l0aW9uWCA9IG1vdXNlUG9zWzBdIC0gb2Zmc2V0UG9zWzBdLFxyXG4gICAgICAgICAgICBjdXJyUG9zaXRpb25ZID0gbW91c2VQb3NbMV0gLSBvZmZzZXRQb3NbMV07XHJcblxyXG4gICAgICAgIHZhciBub2RlID0gdGhpcy5fbm9kZSxcclxuICAgICAgICAgICAgaGVhZCA9IHRoaXMuX2hlYWROb2RlLFxyXG4gICAgICAgICAgICBwb3NpdGlvbiA9IHRoaXMuX3Bvc2l0aW9uO1xyXG5cclxuICAgICAgICB2YXIgbWF4WCA9IHdpbmRvdy5pbm5lcldpZHRoIC0gbm9kZS5nZXRXaWR0aCgpLFxyXG4gICAgICAgICAgICBtYXhZID0gd2luZG93LmlubmVySGVpZ2h0IC0gaGVhZC5nZXRIZWlnaHQoKTtcclxuXHJcbiAgICAgICAgcG9zaXRpb25bMF0gPSBNYXRoLm1heCgwLCBNYXRoLm1pbihjdXJyUG9zaXRpb25YLCBtYXhYKSk7XHJcbiAgICAgICAgcG9zaXRpb25bMV0gPSBNYXRoLm1heCgwLCBNYXRoLm1pbihjdXJyUG9zaXRpb25ZLCBtYXhZKSk7XHJcblxyXG4gICAgICAgIG5vZGUuc2V0UG9zaXRpb25HbG9iYWwocG9zaXRpb25bMF0sIHBvc2l0aW9uWzFdKTtcclxuICAgIH0sXHJcblxyXG4gICAgX2RyYXdDYW52YXNGaWVsZDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXNGaWVsZCxcclxuICAgICAgICAgICAgY29udGV4dCA9IHRoaXMuX2NvbnRleHRDYW52YXNGaWVsZDtcclxuXHJcbiAgICAgICAgdmFyIHdpZHRoID0gY2FudmFzLndpZHRoLFxyXG4gICAgICAgICAgICBoZWlnaHQgPSBjYW52YXMuaGVpZ2h0LFxyXG4gICAgICAgICAgICBpbnZXaWR0aCA9IDEgLyB3aWR0aCxcclxuICAgICAgICAgICAgaW52SGVpZ2h0ID0gMSAvIGhlaWdodDtcclxuXHJcbiAgICAgICAgdmFyIGltYWdlRGF0YSA9IHRoaXMuX2ltYWdlRGF0YUZpZWxkLFxyXG4gICAgICAgICAgICByZ2IgPSBbXSxcclxuICAgICAgICAgICAgaW5kZXggPSAwO1xyXG5cclxuICAgICAgICB2YXIgdmFsdWVIdWUgPSB0aGlzLl92YWx1ZUh1ZTtcclxuXHJcbiAgICAgICAgdmFyIGkgPSAtMSwgajtcclxuICAgICAgICB3aGlsZSAoKytpIDwgaGVpZ2h0KSB7XHJcbiAgICAgICAgICAgIGogPSAtMTtcclxuXHJcbiAgICAgICAgICAgIHdoaWxlICgrK2ogPCB3aWR0aCkge1xyXG4gICAgICAgICAgICAgICAgcmdiID0gQ29sb3JVdGlsLkhTVjJSR0IodmFsdWVIdWUsIGogKiBpbnZXaWR0aCAqIDEwMC4wLCAoIDEuMCAtIGkgKiBpbnZIZWlnaHQgKSAqIDEwMC4wKTtcclxuICAgICAgICAgICAgICAgIGluZGV4ID0gKGkgKiB3aWR0aCArIGopICogNDtcclxuXHJcbiAgICAgICAgICAgICAgICBpbWFnZURhdGEuZGF0YVtpbmRleF0gPSByZ2JbMF07XHJcbiAgICAgICAgICAgICAgICBpbWFnZURhdGEuZGF0YVtpbmRleCArIDFdID0gcmdiWzFdO1xyXG4gICAgICAgICAgICAgICAgaW1hZ2VEYXRhLmRhdGFbaW5kZXggKyAyXSA9IHJnYlsyXTtcclxuICAgICAgICAgICAgICAgIGltYWdlRGF0YS5kYXRhW2luZGV4ICsgM10gPSAyNTU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnRleHQucHV0SW1hZ2VEYXRhKGltYWdlRGF0YSwgMCwgMCk7XHJcbiAgICB9LFxyXG5cclxuICAgIF9kcmF3Q2FudmFzU2xpZGVyOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhc1NsaWRlcixcclxuICAgICAgICAgICAgY29udGV4dCA9IHRoaXMuX2NvbnRleHRDYW52YXNTbGlkZXI7XHJcblxyXG4gICAgICAgIHZhciB3aWR0aCA9IGNhbnZhcy53aWR0aCxcclxuICAgICAgICAgICAgaGVpZ2h0ID0gY2FudmFzLmhlaWdodCxcclxuICAgICAgICAgICAgaW52SGVpZ2h0ID0gMSAvIGhlaWdodDtcclxuXHJcbiAgICAgICAgdmFyIGltYWdlRGF0YSA9IHRoaXMuX2ltYWdlRGF0YVNsaWRlcixcclxuICAgICAgICAgICAgcmdiID0gW10sXHJcbiAgICAgICAgICAgIGluZGV4ID0gMDtcclxuXHJcbiAgICAgICAgdmFyIGkgPSAtMSwgajtcclxuICAgICAgICB3aGlsZSAoKytpIDwgaGVpZ2h0KSB7XHJcbiAgICAgICAgICAgIGogPSAtMTtcclxuXHJcbiAgICAgICAgICAgIHdoaWxlICgrK2ogPCB3aWR0aCkge1xyXG4gICAgICAgICAgICAgICAgcmdiID0gQ29sb3JVdGlsLkhTVjJSR0IoKDEuMCAtIGkgKiBpbnZIZWlnaHQpICogMzYwLjAsIDEwMC4wLCAxMDAuMCk7XHJcbiAgICAgICAgICAgICAgICBpbmRleCA9IChpICogd2lkdGggKyBqKSAqIDQ7XHJcblxyXG4gICAgICAgICAgICAgICAgaW1hZ2VEYXRhLmRhdGFbaW5kZXhdID0gcmdiWzBdO1xyXG4gICAgICAgICAgICAgICAgaW1hZ2VEYXRhLmRhdGFbaW5kZXggKyAxXSA9IHJnYlsxXTtcclxuICAgICAgICAgICAgICAgIGltYWdlRGF0YS5kYXRhW2luZGV4ICsgMl0gPSByZ2JbMl07XHJcbiAgICAgICAgICAgICAgICBpbWFnZURhdGEuZGF0YVtpbmRleCArIDNdID0gMjU1O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb250ZXh0LnB1dEltYWdlRGF0YShpbWFnZURhdGEsIDAsIDApO1xyXG5cclxuICAgIH0sXHJcblxyXG4gICAgX29uQ2FudmFzRmllbGRNb3VzZURvd246IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgZXZlbnRNb3VzZU1vdmUgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsXHJcbiAgICAgICAgICAgIGV2ZW50TW91c2VVcCA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XHJcblxyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgICAgICAgdmFyIG9uRHJhZyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHNlbGYuX2RyYXdIYW5kbGVGaWVsZCgpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBvbkRyYWdFbmQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW91c2VNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcclxuICAgICAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCBmYWxzZSk7XHJcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlVXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xyXG5cclxuICAgICAgICBzZWxmLl9kcmF3SGFuZGxlRmllbGQoKTtcclxuICAgIH0sXHJcblxyXG4gICAgX29uQ2FudmFzU2xpZGVyTW91c2VEb3duOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIGV2ZW50TW91c2VNb3ZlID0gRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLFxyXG4gICAgICAgICAgICBldmVudE1vdXNlVXAgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX1VQO1xyXG5cclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gICAgICAgIHZhciBvbkRyYWcgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBzZWxmLl9kcmF3SGFuZGxlU2xpZGVyKCk7XHJcbiAgICAgICAgICAgICAgICBzZWxmLl9kcmF3Q2FudmFzRmllbGQoKTtcclxuICAgICAgICAgICAgfSxcclxuXHJcbiAgICAgICAgICAgIG9uRHJhZ0VuZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZU1vdmUsIG9uRHJhZywgZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlVXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgc2VsZi5fZHJhd0NhbnZhc0ZpZWxkKCk7XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZU1vdmUsIG9uRHJhZywgZmFsc2UpO1xyXG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcclxuXHJcbiAgICAgICAgc2VsZi5fZHJhd0hhbmRsZVNsaWRlcigpO1xyXG4gICAgICAgIHNlbGYuX2RyYXdDYW52YXNGaWVsZCgpO1xyXG4gICAgfSxcclxuXHJcbiAgICBfc2V0U2l6ZUNhbnZhc0ZpZWxkOiBmdW5jdGlvbiAod2lkdGgsIGhlaWdodCkge1xyXG4gICAgICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXNGaWVsZDtcclxuICAgICAgICBjYW52YXMuc3R5bGUud2lkdGggPSB3aWR0aCArICdweCc7XHJcbiAgICAgICAgY2FudmFzLnN0eWxlLmhlaWdodCA9IGhlaWdodCArICdweCc7XHJcbiAgICAgICAgY2FudmFzLndpZHRoID0gd2lkdGg7XHJcbiAgICAgICAgY2FudmFzLmhlaWdodCA9IGhlaWdodDtcclxuXHJcbiAgICB9LFxyXG5cclxuICAgIF9zZXRTaXplQ2FudmFzU2xpZGVyOiBmdW5jdGlvbiAod2lkdGgsIGhlaWdodCkge1xyXG4gICAgICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXNTbGlkZXI7XHJcbiAgICAgICAgY2FudmFzLnN0eWxlLndpZHRoID0gd2lkdGggKyAncHgnO1xyXG4gICAgICAgIGNhbnZhcy5zdHlsZS5oZWlnaHQgPSBoZWlnaHQgKyAncHgnO1xyXG4gICAgICAgIGNhbnZhcy53aWR0aCA9IHdpZHRoO1xyXG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSBoZWlnaHQ7XHJcbiAgICB9LFxyXG5cclxuICAgIG9wZW46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgbm9kZSA9IHRoaXMuX25vZGU7XHJcblxyXG4gICAgICAgIHRoaXMuX3BhcmVudE5vZGUuYWRkQ2hpbGQobm9kZSk7XHJcblxyXG4gICAgICAgIHZhciBwb3NpdGlvbiA9IHRoaXMuX3Bvc2l0aW9uO1xyXG4gICAgICAgIGlmKHBvc2l0aW9uWzBdID09PSBudWxsIHx8IHBvc2l0aW9uWzFdID09PSBudWxsKXtcclxuICAgICAgICAgICAgcG9zaXRpb25bMF0gPSB3aW5kb3cuaW5uZXJXaWR0aCAqIDAuNSAtIG5vZGUuZ2V0V2lkdGgoKSAqIDAuNTtcclxuICAgICAgICAgICAgcG9zaXRpb25bMV0gPSB3aW5kb3cuaW5uZXJIZWlnaHQgKiAwLjUgLSBub2RlLmdldEhlaWdodCgpICogMC41O1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uWzBdID0gTWF0aC5tYXgoMCxNYXRoLm1pbihwb3NpdGlvblswXSx3aW5kb3cuaW5uZXJXaWR0aCAtIG5vZGUuZ2V0V2lkdGgoKSkpO1xyXG4gICAgICAgICAgICBwb3NpdGlvblsxXSA9IE1hdGgubWF4KDAsTWF0aC5taW4ocG9zaXRpb25bMV0sd2luZG93LmlubmVySGVpZ2h0IC0gbm9kZS5nZXRIZWlnaHQoKSkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbm9kZS5zZXRQb3NpdGlvbkdsb2JhbChwb3NpdGlvblswXSxwb3NpdGlvblsxXSk7XHJcbiAgICAgICAgdGhpcy5fdXBkYXRlQ2FudmFzTm9kZVBvc2l0aW9ucygpO1xyXG4gICAgfSxcclxuXHJcbiAgICBjbG9zZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuX3BhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5fbm9kZSk7XHJcbiAgICB9LFxyXG5cclxuICAgIF9vbkNsb3NlOiBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgIGUuY2FuY2VsQnViYmxlID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLmNsb3NlKCk7XHJcbiAgICB9LFxyXG4gICAgX29uUGljazogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuX2NhbGxiYWNrUGljaygpO1xyXG4gICAgICAgIHRoaXMuY2xvc2UoKTtcclxuICAgIH0sXHJcblxyXG4gICAgX3VwZGF0ZUNhbnZhc05vZGVQb3NpdGlvbnM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgY2FudmFzU2xpZGVyUG9zID0gdGhpcy5fY2FudmFzU2xpZGVyUG9zLFxyXG4gICAgICAgICAgICBjYW52YXNGaWVsZFBvcyA9IHRoaXMuX2NhbnZhc0ZpZWxkUG9zO1xyXG5cclxuICAgICAgICBjYW52YXNTbGlkZXJQb3NbMF0gPSBjYW52YXNTbGlkZXJQb3NbMV0gPSAwO1xyXG4gICAgICAgIGNhbnZhc0ZpZWxkUG9zWzBdID0gY2FudmFzRmllbGRQb3NbMV0gPSAwO1xyXG5cclxuICAgICAgICB2YXIgZWxlbWVudCA9IHRoaXMuX2NhbnZhc1NsaWRlcjtcclxuXHJcbiAgICAgICAgd2hpbGUgKGVsZW1lbnQpIHtcclxuICAgICAgICAgICAgY2FudmFzU2xpZGVyUG9zWzBdICs9IGVsZW1lbnQub2Zmc2V0TGVmdDtcclxuICAgICAgICAgICAgY2FudmFzU2xpZGVyUG9zWzFdICs9IGVsZW1lbnQub2Zmc2V0VG9wO1xyXG4gICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudC5vZmZzZXRQYXJlbnQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBlbGVtZW50ID0gdGhpcy5fY2FudmFzRmllbGQ7XHJcblxyXG4gICAgICAgIHdoaWxlIChlbGVtZW50KSB7XHJcbiAgICAgICAgICAgIGNhbnZhc0ZpZWxkUG9zWzBdICs9IGVsZW1lbnQub2Zmc2V0TGVmdDtcclxuICAgICAgICAgICAgY2FudmFzRmllbGRQb3NbMV0gKz0gZWxlbWVudC5vZmZzZXRUb3A7XHJcbiAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50Lm9mZnNldFBhcmVudDtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIHNldENhbGxiYWNrUGljazogZnVuY3Rpb24gKGZ1bmMpIHtcclxuICAgICAgICB0aGlzLl9jYWxsYmFja1BpY2sgPSBmdW5jO1xyXG4gICAgfSxcclxuXHJcbiAgICBzZXRDb2xvckhFWDogZnVuY3Rpb24gKGhleCkge1xyXG4gICAgICAgIHRoaXMuX3NldENvbG9ySEVYKGhleCk7XHJcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JGcm9tSEVYKCk7XHJcbiAgICAgICAgdGhpcy5fc2V0Q29sb3IoKTtcclxuICAgIH0sXHJcblxyXG4gICAgc2V0Q29sb3JSR0I6IGZ1bmN0aW9uIChyLCBnLCBiKSB7XHJcbiAgICAgICAgdGhpcy5fc2V0Q29sb3JSR0IociwgZywgYik7XHJcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIRVhGcm9tUkdCKCk7XHJcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIU1ZGcm9tUkdCKCk7XHJcbiAgICAgICAgdGhpcy5fc2V0Q29sb3IoKTtcclxuICAgIH0sXHJcblxyXG4gICAgc2V0Q29sb3JSR0JmdjogZnVuY3Rpb24gKHIsIGcsIGIpIHtcclxuICAgICAgICB0aGlzLnNldENvbG9yUkdCKE1hdGguZmxvb3IociAqIDI1NS4wKSxcclxuICAgICAgICAgICAgTWF0aC5mbG9vcihnICogMjU1LjApLFxyXG4gICAgICAgICAgICBNYXRoLmZsb29yKGIgKiAyNTUuMCkpO1xyXG4gICAgfSxcclxuXHJcbiAgICBzZXRDb2xvckhTVjogZnVuY3Rpb24gKGgsIHMsIHYpIHtcclxuICAgICAgICB0aGlzLl9zZXRDb2xvckhTVihoLCBzLCB2KTtcclxuICAgICAgICB0aGlzLl91cGRhdGVDb2xvclJHQkZyb21IU1YoKTtcclxuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhFWEZyb21SR0IoKTtcclxuICAgICAgICB0aGlzLl9zZXRDb2xvcigpO1xyXG4gICAgfSxcclxuXHJcbiAgICBfc2V0Q29sb3I6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLl9kcmF3Q2FudmFzRmllbGQoKTtcclxuICAgICAgICB0aGlzLl9kcmF3Q2FudmFzU2xpZGVyKCk7XHJcbiAgICAgICAgdGhpcy5fdXBkYXRlSGFuZGxlcygpO1xyXG4gICAgICAgIHRoaXMuX3NldENvbnRyYXNQcmV2Q29sb3IodGhpcy5fdmFsdWVSLCB0aGlzLl92YWx1ZUcsIHRoaXMuX3ZhbHVlQik7XHJcbiAgICB9LFxyXG5cclxuICAgIGdldFI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fdmFsdWVSO1xyXG4gICAgfSxcclxuICAgIGdldEc6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fdmFsdWVHO1xyXG4gICAgfSxcclxuICAgIGdldEI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fdmFsdWVCO1xyXG4gICAgfSxcclxuICAgIGdldFJHQjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiBbdGhpcy5fdmFsdWVSLCB0aGlzLl92YWx1ZUcsIHRoaXMuX3ZhbHVlQl07XHJcbiAgICB9LFxyXG4gICAgZ2V0SHVlOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX3ZhbHVlSHVlO1xyXG4gICAgfSxcclxuICAgIGdldFNhdDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl92YWx1ZVNhdDtcclxuICAgIH0sXHJcbiAgICBnZXRWYWw6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fdmFsdWVWYWw7XHJcbiAgICB9LFxyXG4gICAgZ2V0SFNWOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIFt0aGlzLl92YWx1ZUh1ZSwgdGhpcy5fdmFsdWVTYXQsIHRoaXMuX3ZhbHVlVmFsXTtcclxuICAgIH0sXHJcbiAgICBnZXRIRVg6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fdmFsdWVIRVg7XHJcbiAgICB9LFxyXG4gICAgZ2V0UkdCZnY6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gW3RoaXMuX3ZhbHVlUiAvIDI1NS4wLCB0aGlzLl92YWx1ZUcgLyAyNTUuMCwgdGhpcy5fdmFsdWVCIC8gMjU1LjBdO1xyXG4gICAgfSxcclxuXHJcbiAgICBnZXROb2RlOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX25vZGU7XHJcbiAgICB9XHJcbn07XHJcblxyXG5QaWNrZXIuc2V0dXAgPSBmdW5jdGlvbiAocGFyZW50Tm9kZSkge1xyXG4gICAgcmV0dXJuIFBpY2tlci5faW5zdGFuY2UgPSBuZXcgUGlja2VyKHBhcmVudE5vZGUpO1xyXG59O1xyXG5QaWNrZXIuZ2V0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIFBpY2tlci5faW5zdGFuY2U7XHJcbn07XHJcblBpY2tlci5kZXN0cm95ID0gZnVuY3Rpb24oKXtcclxuICAgIFBpY2tlci5faW5zdGFuY2UgPSBudWxsO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBQaWNrZXI7XHJcbiIsInZhciBTVkdDb21wb25lbnQgPSByZXF1aXJlKCcuL1NWR0NvbXBvbmVudCcpO1xyXG5cclxuZnVuY3Rpb24gUGxvdHRlcihwYXJlbnQsb2JqZWN0LHZhbHVlLHBhcmFtcykge1xyXG4gICAgcGFyYW1zID0gcGFyYW1zIHx8IHt9O1xyXG4gICAgcGFyYW1zLmxpbmVXaWR0aCAgPSBwYXJhbXMubGluZVdpZHRoICB8fCAyO1xyXG4gICAgcGFyYW1zLmxpbmVDb2xvciAgPSBwYXJhbXMubGluZUNvbG9yICB8fCBbMjU1LDI1NSwyNTVdO1xyXG5cclxuICAgIFNWR0NvbXBvbmVudC5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XHJcblxyXG4gICAgdmFyIGxpbmVXaWR0aCA9IHRoaXMuX2xpbmVXaWR0aCA9IHBhcmFtcy5saW5lV2lkdGg7XHJcbiAgICB2YXIgbGluZUNvbG9yID0gcGFyYW1zLmxpbmVDb2xvcjtcclxuXHJcbiAgICB2YXIgZ3JpZCA9IHRoaXMuX2dyaWQgPSB0aGlzLl9zdmdSb290LmFwcGVuZENoaWxkKHRoaXMuX2NyZWF0ZVNWR09iamVjdCgncGF0aCcpKTtcclxuICAgICAgICBncmlkLnN0eWxlLnN0cm9rZSA9ICdyZ2IoMjYsMjksMzEpJztcclxuXHJcbiAgICB2YXIgcGF0aCA9IHRoaXMuX3BhdGggPSB0aGlzLl9zdmdSb290LmFwcGVuZENoaWxkKHRoaXMuX2NyZWF0ZVNWR09iamVjdCgncGF0aCcpKTtcclxuICAgICAgICBwYXRoLnN0eWxlLnN0cm9rZSAgICAgID0gJ3JnYignK2xpbmVDb2xvclswXSsnLCcrbGluZUNvbG9yWzFdKycsJytsaW5lQ29sb3JbMl0rJyknO1xyXG4gICAgICAgIHBhdGguc3R5bGUuc3Ryb2tlV2lkdGggPSBsaW5lV2lkdGggO1xyXG4gICAgICAgIHBhdGguc3R5bGUuZmlsbCAgICAgICAgPSAnbm9uZSc7XHJcbn1cclxuUGxvdHRlci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFNWR0NvbXBvbmVudC5wcm90b3R5cGUpO1xyXG5QbG90dGVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFBsb3R0ZXI7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFBsb3R0ZXI7XHJcbiIsInZhciBPYmplY3RDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jb3JlL09iamVjdENvbXBvbmVudCcpO1xyXG52YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xyXG52YXIgTnVtYmVySW5wdXRfSW50ZXJuYWwgPSByZXF1aXJlKCcuL051bWJlcklucHV0X0ludGVybmFsJyk7XHJcbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xyXG5cclxudmFyIEV2ZW50XyAgICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxyXG4gICAgQ29tcG9uZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL0NvbXBvbmVudEV2ZW50Jyk7XHJcblxyXG52YXIgREVGQVVMVF9TVEVQID0gMS4wLFxyXG4gICAgREVGQVVMVF9EUCAgID0gMjtcclxuXHJcbmZ1bmN0aW9uIFJhbmdlKHBhcmVudCwgb2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XHJcbiAgICBPYmplY3RDb21wb25lbnQuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xyXG5cclxuICAgIHBhcmFtcyAgICAgICAgICA9IHBhcmFtcyAgICAgICAgICB8fCB7fTtcclxuICAgIHBhcmFtcy5vbkNoYW5nZSA9IHBhcmFtcy5vbkNoYW5nZSB8fCB0aGlzLl9vbkNoYW5nZTtcclxuICAgIHBhcmFtcy5zdGVwICAgICA9IHBhcmFtcy5zdGVwIHx8IERFRkFVTFRfU1RFUDtcclxuICAgIHBhcmFtcy5kcCAgICAgICA9IChwYXJhbXMuZHAgIT0gbnVsbCkgPyBwYXJhbXMuZHAgOiBERUZBVUxUX0RQO1xyXG5cclxuICAgIHRoaXMuX29uQ2hhbmdlICA9IHBhcmFtcy5vbkNoYW5nZTtcclxuXHJcbiAgICB2YXIgc3RlcCA9IHRoaXMuX3N0ZXAgPSBwYXJhbXMuc3RlcCxcclxuICAgICAgICBkcCAgID0gdGhpcy5fZHAgICA9IHBhcmFtcy5kcDtcclxuXHJcbiAgICAvL0ZJWE1FOiBoaXN0b3J5IHB1c2ggcG9wXHJcblxyXG4gICAgdmFyIGxhYmVsTWluID0gbmV3IE5vZGUoKTtcclxuICAgIHZhciBpbnB1dE1pbiA9IHRoaXMuX2lucHV0TWluID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHN0ZXAsZHAsIHRoaXMucHVzaEhpc3RvcnlTdGF0ZS5iaW5kKHRoaXMpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fb25JbnB1dE1pbkNoYW5nZS5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICB2YXIgbGFiZWxNYXggPSBuZXcgTm9kZSgpO1xyXG4gICAgdmFyIGlucHV0TWF4ID0gdGhpcy5faW5wdXRNYXggPSBuZXcgTnVtYmVySW5wdXRfSW50ZXJuYWwoc3RlcCxkcCwgdGhpcy5wdXNoSGlzdG9yeVN0YXRlLmJpbmQodGhpcyksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9vbklucHV0TWF4Q2hhbmdlLmJpbmQodGhpcykpO1xyXG5cclxuICAgIHZhciBsYWJlbE1pbldyYXAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApLFxyXG4gICAgICAgIGlucHV0TWluV3JhcCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCksXHJcbiAgICAgICAgbGFiZWxNYXhXcmFwID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5XcmFwKSxcclxuICAgICAgICBpbnB1dE1heFdyYXAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApO1xyXG5cclxuICAgIGxhYmVsTWluLnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywgJ01JTicpO1xyXG4gICAgbGFiZWxNYXguc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCAnTUFYJyk7XHJcblxyXG4gICAgdmFyIHZhbHVlcyA9IHRoaXMuX29ialt0aGlzLl9rZXldO1xyXG5cclxuICAgIGlucHV0TWluLnNldFZhbHVlKHZhbHVlc1swXSk7XHJcbiAgICBpbnB1dE1heC5zZXRWYWx1ZSh2YWx1ZXNbMV0pO1xyXG5cclxuICAgIHZhciB3cmFwID0gdGhpcy5fd3JhcE5vZGU7XHJcblxyXG4gICAgbGFiZWxNaW5XcmFwLmFkZENoaWxkKGxhYmVsTWluKTtcclxuICAgIGlucHV0TWluV3JhcC5hZGRDaGlsZChpbnB1dE1pbi5nZXROb2RlKCkpO1xyXG4gICAgbGFiZWxNYXhXcmFwLmFkZENoaWxkKGxhYmVsTWF4KTtcclxuICAgIGlucHV0TWF4V3JhcC5hZGRDaGlsZChpbnB1dE1heC5nZXROb2RlKCkpO1xyXG5cclxuICAgIHdyYXAuYWRkQ2hpbGQobGFiZWxNaW5XcmFwKTtcclxuICAgIHdyYXAuYWRkQ2hpbGQoaW5wdXRNaW5XcmFwKTtcclxuICAgIHdyYXAuYWRkQ2hpbGQobGFiZWxNYXhXcmFwKTtcclxuICAgIHdyYXAuYWRkQ2hpbGQoaW5wdXRNYXhXcmFwKTtcclxufVxyXG5SYW5nZS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE9iamVjdENvbXBvbmVudC5wcm90b3R5cGUpO1xyXG5SYW5nZS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBSYW5nZTtcclxuXHJcblJhbmdlLnByb3RvdHlwZS5fb25JbnB1dENoYW5nZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIG51bGwpKTtcclxuICAgIHRoaXMuX29uQ2hhbmdlKCk7XHJcbn07XHJcblxyXG5SYW5nZS5wcm90b3R5cGUuX3VwZGF0ZVZhbHVlTWluID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHZhbHVlcyA9IHRoaXMuX29ialt0aGlzLl9rZXldO1xyXG5cclxuICAgIHZhciBpbnB1dE1pbiA9IHRoaXMuX2lucHV0TWluLFxyXG4gICAgICAgIGlucHV0VmFsdWUgPSBpbnB1dE1pbi5nZXRWYWx1ZSgpO1xyXG5cclxuICAgIGlmIChpbnB1dFZhbHVlID49IHRoaXMuX2lucHV0TWF4LmdldFZhbHVlKCkpIHtcclxuICAgICAgICBpbnB1dE1pbi5zZXRWYWx1ZSh2YWx1ZXNbMF0pO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHZhbHVlc1swXSA9IGlucHV0VmFsdWU7XHJcblxyXG59O1xyXG5cclxuUmFuZ2UucHJvdG90eXBlLl91cGRhdGVWYWx1ZU1heCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciB2YWx1ZXMgPSB0aGlzLl9vYmpbdGhpcy5fa2V5XTtcclxuXHJcbiAgICB2YXIgaW5wdXRNYXggPSB0aGlzLl9pbnB1dE1heCxcclxuICAgICAgICBpbnB1dFZhbHVlID0gaW5wdXRNYXguZ2V0VmFsdWUoKTtcclxuXHJcbiAgICBpZiAoaW5wdXRWYWx1ZSA8PSB0aGlzLl9pbnB1dE1pbi5nZXRWYWx1ZSgpKSB7XHJcbiAgICAgICAgaW5wdXRNYXguc2V0VmFsdWUodmFsdWVzWzFdKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB2YWx1ZXNbMV0gPSBpbnB1dFZhbHVlO1xyXG59O1xyXG5cclxuXHJcblJhbmdlLnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24gKGUpIHtcclxuICAgIGlmIChlLmRhdGEub3JpZ2luID09IHRoaXMpe1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIGlmIChlLmRhdGEub3JpZ2luID09IG51bGwpIHtcclxuICAgIH1cclxuICAgIHZhciBvID0gdGhpcy5fb2JqLGsgPSB0aGlzLl9rZXk7XHJcbiAgICB0aGlzLl9pbnB1dE1pbi5zZXRWYWx1ZShvW2tdWzBdKTtcclxuICAgIHRoaXMuX2lucHV0TWF4LnNldFZhbHVlKG9ba11bMV0pO1xyXG59O1xyXG5cclxuUmFuZ2UucHJvdG90eXBlLnNldFZhbHVlID0gZnVuY3Rpb24odmFsdWUpe1xyXG4gICAgdmFyIG8gPSB0aGlzLl9vYmosayA9IHRoaXMuX2tleTtcclxuICAgIG9ba11bMF0gPSB2YWx1ZVswXTtcclxuICAgIG9ba11bMV0gPSB2YWx1ZVsxXTtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCxudWxsKSk7XHJcbn07XHJcblxyXG5SYW5nZS5wcm90b3R5cGUuX29uSW5wdXRNaW5DaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLl91cGRhdGVWYWx1ZU1pbigpO1xyXG4gICAgdGhpcy5fb25JbnB1dENoYW5nZSgpO1xyXG59O1xyXG5cclxuUmFuZ2UucHJvdG90eXBlLl9vbklucHV0TWF4Q2hhbmdlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5fdXBkYXRlVmFsdWVNYXgoKTtcclxuICAgIHRoaXMuX29uSW5wdXRDaGFuZ2UoKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmFuZ2U7IiwidmFyIENvbXBvbmVudCA9IHJlcXVpcmUoJy4vLi4vY29yZS9Db21wb25lbnQnKTtcclxudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XHJcbnZhciBNZXRyaWMgPSByZXF1aXJlKCcuL01ldHJpYycpO1xyXG52YXIgR3JvdXBFdmVudCA9IHJlcXVpcmUoJy4uL2dyb3VwL0dyb3VwRXZlbnQnKTtcclxuXHJcbmZ1bmN0aW9uIFNWRyhwYXJlbnQsIHBhcmFtcykge1xyXG4gICAgQ29tcG9uZW50LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcblxyXG4gICAgdmFyIHdyYXAgPSB0aGlzLl93cmFwTm9kZTtcclxuICAgICAgICB3cmFwLnNldFN0eWxlQ2xhc3MoQ1NTLkNhbnZhc1dyYXApO1xyXG4gICAgdmFyIHdyYXBTaXplID0gd3JhcC5nZXRXaWR0aCgpO1xyXG5cclxuICAgIHZhciBzdmcgPSB0aGlzLl9zdmcgPSB0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ3N2ZycpO1xyXG4gICAgICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ3ZlcnNpb24nLCAnMS4yJyk7XHJcbiAgICAgICAgc3ZnLnNldEF0dHJpYnV0ZSgnYmFzZVByb2ZpbGUnLCAndGlueScpO1xyXG4gICAgICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ3ByZXNlcnZlQXNwZWN0UmF0aW8nLCAndHJ1ZScpO1xyXG5cclxuICAgIHdyYXAuZ2V0RWxlbWVudCgpLmFwcGVuZENoaWxkKHN2Zyk7XHJcblxyXG4gICAgdGhpcy5fc3ZnU2V0U2l6ZSh3cmFwU2l6ZSwgd3JhcFNpemUpO1xyXG4gICAgdGhpcy5fdXBkYXRlSGVpZ2h0KCk7XHJcblxyXG4gICAgdGhpcy5fbm9kZS5zZXRTdHlsZUNsYXNzKENTUy5DYW52YXNMaXN0SXRlbSk7XHJcblxyXG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSwgdGhpcywgJ29uR3JvdXBTaXplQ2hhbmdlJyk7XHJcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5HUk9VUF9TSVpFX1VQREFURSwgdGhpcy5fcGFyZW50LCAnb25Hcm91cFNpemVVcGRhdGUnKTtcclxufVxyXG5TVkcucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShDb21wb25lbnQucHJvdG90eXBlKTtcclxuU1ZHLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNWRztcclxuXHJcblNWRy5wcm90b3R5cGUuX3VwZGF0ZUhlaWdodCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBzdmdIZWlnaHQgPSBOdW1iZXIodGhpcy5fc3ZnLmdldEF0dHJpYnV0ZSgnaGVpZ2h0JykpO1xyXG4gICAgdGhpcy5fd3JhcE5vZGUuc2V0SGVpZ2h0KHN2Z0hlaWdodCk7XHJcbiAgICB0aGlzLl9ub2RlLnNldEhlaWdodChzdmdIZWlnaHQgKyBNZXRyaWMuUEFERElOR19XUkFQUEVSKTtcclxufTtcclxuXHJcblNWRy5wcm90b3R5cGUub25Hcm91cFNpemVDaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgd2lkdGggPSB0aGlzLl93cmFwTm9kZS5nZXRXaWR0aCgpO1xyXG4gICAgdGhpcy5fc3ZnU2V0U2l6ZSh3aWR0aCwgd2lkdGgpO1xyXG4gICAgdGhpcy5fdXBkYXRlSGVpZ2h0KCk7XHJcbn07XHJcblxyXG5TVkcucHJvdG90eXBlLl9zdmdTZXRTaXplID0gZnVuY3Rpb24gKHdpZHRoLCBoZWlnaHQpIHtcclxuICAgIHZhciBzdmcgPSB0aGlzLl9zdmc7XHJcbiAgICBzdmcuc2V0QXR0cmlidXRlKCd3aWR0aCcsIHdpZHRoKTtcclxuICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIGhlaWdodCk7XHJcbiAgICBzdmcuc2V0QXR0cmlidXRlKCd2aWV3Ym94JywgJzAgMCAnICsgd2lkdGggKyAnICcgKyBoZWlnaHQpO1xyXG59O1xyXG5cclxuU1ZHLnByb3RvdHlwZS5nZXRTVkcgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fc3ZnO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTVkc7IiwidmFyIE9iamVjdENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvT2JqZWN0Q29tcG9uZW50Jyk7XHJcbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xyXG52YXIgR3JvdXBFdmVudCA9IHJlcXVpcmUoJy4uL2dyb3VwL0dyb3VwRXZlbnQnKTtcclxudmFyIE1ldHJpYyA9IHJlcXVpcmUoJy4vTWV0cmljJyk7XHJcblxyXG5mdW5jdGlvbiBTVkdDb21wb25lbnQocGFyZW50LG9iamVjdCx2YWx1ZSxwYXJhbXMpe1xyXG4gICAgT2JqZWN0Q29tcG9uZW50LmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcclxuXHJcbiAgICB2YXIgd3JhcCA9IHRoaXMuX3dyYXBOb2RlO1xyXG4gICAgICAgIHdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuU1ZHV3JhcCk7XHJcbiAgICB2YXIgd3JhcFNpemUgPSB3cmFwLmdldFdpZHRoKCk7XHJcblxyXG4gICAgdmFyIHN2ZyA9IHRoaXMuX3N2ZyA9IHRoaXMuX2NyZWF0ZVNWR09iamVjdCgnc3ZnJyk7XHJcbiAgICAgICAgc3ZnLnNldEF0dHJpYnV0ZSgndmVyc2lvbicsICcxLjInKTtcclxuICAgICAgICBzdmcuc2V0QXR0cmlidXRlKCdiYXNlUHJvZmlsZScsICd0aW55Jyk7XHJcblxyXG4gICAgICAgIHdyYXAuZ2V0RWxlbWVudCgpLmFwcGVuZENoaWxkKHN2Zyk7XHJcblxyXG4gICAgdmFyIHN2Z1Jvb3QgPSB0aGlzLl9zdmdSb290ID0gc3ZnLmFwcGVuZENoaWxkKHRoaXMuX2NyZWF0ZVNWR09iamVjdCgnZycpKTtcclxuICAgICAgICBzdmdSb290LnNldEF0dHJpYnV0ZSgndHJhbnNmb3JtJywndHJhbnNsYXRlKDAuNSAwLjUpJyk7XHJcblxyXG4gICAgdGhpcy5fc3ZnU2V0U2l6ZSh3cmFwU2l6ZSx3cmFwU2l6ZSk7XHJcbiAgICB0aGlzLl91cGRhdGVIZWlnaHQoKTtcclxuXHJcbiAgICB0aGlzLl9ub2RlLnNldFN0eWxlQ2xhc3MoQ1NTLlNWR0xpc3RJdGVtKTtcclxuXHJcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LkdST1VQX1NJWkVfQ0hBTkdFLCB0aGlzLCAnb25Hcm91cFNpemVDaGFuZ2UnKTtcclxuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LkdST1VQX1NJWkVfVVBEQVRFLCB0aGlzLl9wYXJlbnQsICdvbkdyb3VwU2l6ZVVwZGF0ZScpO1xyXG59XHJcblNWR0NvbXBvbmVudC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE9iamVjdENvbXBvbmVudC5wcm90b3R5cGUpO1xyXG5TVkdDb21wb25lbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU1ZHQ29tcG9uZW50O1xyXG5cclxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5fdXBkYXRlSGVpZ2h0ID0gZnVuY3Rpb24oKXtcclxuICAgIHZhciBzdmdIZWlnaHQgPSBOdW1iZXIodGhpcy5fc3ZnLmdldEF0dHJpYnV0ZSgnaGVpZ2h0JykpO1xyXG5cclxuICAgIHRoaXMuX3dyYXBOb2RlLnNldEhlaWdodChzdmdIZWlnaHQpO1xyXG4gICAgdGhpcy5fbm9kZS5zZXRIZWlnaHQoc3ZnSGVpZ2h0ICsgTWV0cmljLlBBRERJTkdfV1JBUFBFUik7XHJcbn07XHJcblxyXG5TVkdDb21wb25lbnQucHJvdG90eXBlLl9yZWRyYXcgPSBmdW5jdGlvbigpe307XHJcblxyXG5TVkdDb21wb25lbnQucHJvdG90eXBlLm9uR3JvdXBTaXplQ2hhbmdlID0gZnVuY3Rpb24oKXtcclxuICAgIHZhciB3aWR0aCA9IHRoaXMuX3dyYXBOb2RlLmdldFdpZHRoKCk7XHJcblxyXG4gICAgdGhpcy5fc3ZnU2V0U2l6ZSh3aWR0aCx3aWR0aCk7XHJcbiAgICB0aGlzLl91cGRhdGVIZWlnaHQoKTtcclxuICAgIHRoaXMuX3JlZHJhdygpO1xyXG59O1xyXG5cclxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5fY3JlYXRlU1ZHT2JqZWN0ID0gZnVuY3Rpb24odHlwZSkge1xyXG4gICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIsdHlwZSk7XHJcbn07XHJcblxyXG5TVkdDb21wb25lbnQucHJvdG90eXBlLl9zdmdTZXRTaXplID0gZnVuY3Rpb24od2lkdGgsaGVpZ2h0KSB7XHJcbiAgICB2YXIgc3ZnID0gdGhpcy5fc3ZnO1xyXG4gICAgICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgIHdpZHRoKTtcclxuICAgICAgICBzdmcuc2V0QXR0cmlidXRlKCdoZWlnaHQnLCBoZWlnaHQpO1xyXG4gICAgICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ3ZpZXdib3gnLCAnMCAwICcgKyB3aWR0aCArICcgJyArIGhlaWdodCk7XHJcbn07XHJcblxyXG5cclxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5fcGF0aENtZE1vdmVUbyA9IGZ1bmN0aW9uICh4LCB5KSB7XHJcbiAgICByZXR1cm4gJ00gJyArIHggKyAnICcgKyB5ICsgJyAnO1xyXG59O1xyXG5cclxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5fcGF0aENtZExpbmVUbyA9IGZ1bmN0aW9uICh4LCB5KSB7XHJcbiAgICByZXR1cm4gJ0wgJyArIHggKyAnICcgKyB5ICsgJyAnO1xyXG59O1xyXG5cclxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5fcGF0aENtZENsb3NlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuICdaJztcclxufTtcclxuXHJcblNWR0NvbXBvbmVudC5wcm90b3R5cGUuX3BhdGhDbWRMaW5lID0gZnVuY3Rpb24gKHgwLCB5MCwgeDEsIHkxKSB7XHJcbiAgICByZXR1cm4gJ00gJyArIHgwICsgJyAnICsgeTAgKyAnIEwgJyArIHgxICsgJyAnICsgeTE7XHJcbn07XHJcblxyXG5TVkdDb21wb25lbnQucHJvdG90eXBlLl9wYXRoQ21kQmV6aWVyQ3ViaWMgPSBmdW5jdGlvbiAoY21kLCB4MCwgeTAsIGN4MCwgY3kwLCBjeDEsIGN5MSwgeDEsIHkxKSB7XHJcbiAgICByZXR1cm4gJ00gJyArIHgwICsgJyAnICsgeTAgKyAnIEMgJyArIGN4MCArICcgJyArIGN5MCArICcsICcgKyBjeDEgKyAnICcgKyBjeTEgKyAnLCAnICsgeDEgKyAnICcgKyB5MTtcclxufTtcclxuXHJcblNWR0NvbXBvbmVudC5wcm90b3R5cGUuX3BhdGhDbWRCZXppZXJRdWFkcmF0aWMgPSBmdW5jdGlvbiAoY21kLCB4MCwgeTAsIGN4LCBjeSwgeDEsIHkxKSB7XHJcbiAgICByZXR1cm4gJ00gJyArIHgwICsgJyAnICsgeTAgKyAnIFEgJyArIGN4ICsgJyAnICsgY3kgKyAnLCAnICsgeDEgKyAnICcgKyB5MTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU1ZHQ29tcG9uZW50OyIsInZhciBPYmplY3RDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jb3JlL09iamVjdENvbXBvbmVudCcpO1xyXG52YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xyXG52YXIgQ1NTICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XHJcblxyXG52YXIgT3B0aW9ucyA9IHJlcXVpcmUoJy4vT3B0aW9ucycpO1xyXG5cclxudmFyIEhpc3RvcnkgPSByZXF1aXJlKCcuLi9jb3JlL0hpc3RvcnknKTtcclxuXHJcbnZhciBFdmVudF8gICAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcclxuICAgIE5vZGVFdmVudCAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKSxcclxuICAgIENvbXBvbmVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9Db21wb25lbnRFdmVudCcpLFxyXG4gICAgT3B0aW9uRXZlbnQgICAgPSByZXF1aXJlKCcuLi9jb3JlL09wdGlvbkV2ZW50Jyk7XHJcblxyXG52YXIgT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIgPSByZXF1aXJlKCcuLi9jb3JlL09iamVjdENvbXBvbmVudE5vdGlmaWVyJyk7XHJcblxyXG52YXIgU1RSX0NIT09TRSA9ICdDaG9vc2UgLi4uJztcclxuXHJcbmZ1bmN0aW9uIFNlbGVjdChwYXJlbnQsIG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xyXG4gICAgT2JqZWN0Q29tcG9uZW50LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcblxyXG4gICAgcGFyYW1zID0gcGFyYW1zIHx8IHt9O1xyXG4gICAgcGFyYW1zLm9uQ2hhbmdlID0gcGFyYW1zLm9uQ2hhbmdlIHx8IHRoaXMuX29uQ2hhbmdlO1xyXG4gICAgdGhpcy5fb25DaGFuZ2UgPSBwYXJhbXMub25DaGFuZ2U7XHJcblxyXG4gICAgdmFyIG9iaiA9IHRoaXMuX29iaixcclxuICAgICAgICBrZXkgPSB0aGlzLl9rZXk7XHJcblxyXG4gICAgdmFyIHRhcmdldEtleSA9IHRoaXMuX3RhcmdldEtleSA9IHBhcmFtcy50YXJnZXQsXHJcbiAgICAgICAgdmFsdWVzID0gdGhpcy5fdmFsdWVzID0gb2JqW2tleV07XHJcblxyXG5cclxuICAgIHRoaXMuX3NlbGVjdGVkSW5kZXggPSAtMTtcclxuICAgIHRoaXMuX3NlbGVjdGVkID0gbnVsbDtcclxuXHJcbiAgICB2YXIgc2VsZWN0ID0gdGhpcy5fc2VsZWN0ID0gbmV3IE5vZGUoTm9kZS5JTlBVVF9CVVRUT04pO1xyXG4gICAgICAgIHNlbGVjdC5zZXRTdHlsZUNsYXNzKENTUy5TZWxlY3QpO1xyXG4gICAgICAgIHNlbGVjdC5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLCB0aGlzLl9vbk9wdGlvblRyaWdnZXIuYmluZCh0aGlzKSk7XHJcblxyXG4gICAgaWYodGhpcy5faGFzVGFyZ2V0KCkpIHtcclxuICAgICAgICB2YXIgdGFyZ2V0T2JqID0gb2JqW3RhcmdldEtleV0gfHwgJyc7XHJcbiAgICAgICAgdmFyIGkgPSAtMTtcclxuICAgICAgICB3aGlsZSAoKytpIDwgdmFsdWVzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICBpZiAodGFyZ2V0T2JqID09IHZhbHVlc1tpXSl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9zZWxlY3RlZCA9IHZhbHVlc1tpXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBzZWxlY3Quc2V0UHJvcGVydHkoJ3ZhbHVlJywgdGFyZ2V0T2JqLnRvU3RyaW5nKCkubGVuZ3RoID4gMCA/IHRhcmdldE9iaiA6IHZhbHVlc1swXSk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBzZWxlY3Quc2V0UHJvcGVydHkoJ3ZhbHVlJywgcGFyYW1zLnNlbGVjdGVkICE9PSAtMSA/IHZhbHVlc1twYXJhbXMuc2VsZWN0ZWRdIDogU1RSX0NIT09TRSk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5fd3JhcE5vZGUuYWRkQ2hpbGQoc2VsZWN0KTtcclxuXHJcbiAgICBPYmplY3RDb21wb25lbnROb3RpZmllci5nZXQoKS5hZGRFdmVudExpc3RlbmVyKE9wdGlvbkV2ZW50LlRSSUdHRVIsIHRoaXMsICdvbk9wdGlvblRyaWdnZXInKTtcclxuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihPcHRpb25FdmVudC5UUklHR0VSRUQsIE9iamVjdENvbXBvbmVudE5vdGlmaWVyLmdldCgpLCAnb25PcHRpb25UcmlnZ2VyZWQnKTtcclxufVxyXG5TZWxlY3QucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShPYmplY3RDb21wb25lbnQucHJvdG90eXBlKTtcclxuU2VsZWN0LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNlbGVjdDtcclxuXHJcblNlbGVjdC5wcm90b3R5cGUub25PcHRpb25UcmlnZ2VyID0gZnVuY3Rpb24gKGUpIHtcclxuICAgIGlmIChlLmRhdGEub3JpZ2luID09IHRoaXMpIHtcclxuICAgICAgICB0aGlzLl9hY3RpdmUgPSAhdGhpcy5fYWN0aXZlO1xyXG4gICAgICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuX2FjdGl2ZSkge1xyXG4gICAgICAgICAgICB0aGlzLl9idWlsZE9wdGlvbnMoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIE9wdGlvbnMuZ2V0KCkuY2xlYXIoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdGhpcy5fYWN0aXZlID0gZmFsc2U7XHJcbiAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XHJcbn07XHJcblxyXG5TZWxlY3QucHJvdG90eXBlLl9idWlsZE9wdGlvbnMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgb3B0aW9ucyA9IE9wdGlvbnMuZ2V0KCk7XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gICAgb3B0aW9ucy5idWlsZCh0aGlzLl92YWx1ZXMsIHRoaXMuX3NlbGVjdGVkLCB0aGlzLl9zZWxlY3QsXHJcbiAgICAgICAgZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgc2VsZi5hcHBseVZhbHVlKCk7XHJcbiAgICAgICAgICAgIHNlbGYuX2FjdGl2ZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICBzZWxmLl91cGRhdGVBcHBlYXJhbmNlKCk7XHJcbiAgICAgICAgICAgIHNlbGYuX3NlbGVjdGVkSW5kZXggPSBvcHRpb25zLmdldFNlbGVjdGVkSW5kZXgoKTtcclxuICAgICAgICAgICAgc2VsZi5fb25DaGFuZ2Uoc2VsZi5fc2VsZWN0ZWRJbmRleCk7XHJcbiAgICAgICAgICAgIG9wdGlvbnMuY2xlYXIoKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgIHNlbGYuX2FjdGl2ZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICBzZWxmLl91cGRhdGVBcHBlYXJhbmNlKCk7XHJcbiAgICAgICAgICAgIG9wdGlvbnMuY2xlYXIoKVxyXG4gICAgICAgIH0sIGZhbHNlKTtcclxufTtcclxuXHJcblNlbGVjdC5wcm90b3R5cGUuX2FwcGx5U2VsZWN0ZWQgPSBmdW5jdGlvbihzZWxlY3RlZCl7XHJcbiAgICB0aGlzLl9zZWxlY3Quc2V0UHJvcGVydHkoJ3ZhbHVlJyxzZWxlY3RlZCk7XHJcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQpLG51bGwpO1xyXG59XHJcblxyXG5TZWxlY3QucHJvdG90eXBlLmFwcGx5VmFsdWUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgaW5kZXggPSBPcHRpb25zLmdldCgpLmdldFNlbGVjdGVkSW5kZXgoKSxcclxuICAgICAgICBzZWxlY3RlZCA9IHRoaXMuX3NlbGVjdGVkID0gdGhpcy5fdmFsdWVzW2luZGV4XTtcclxuXHJcbiAgICBpZiAodGhpcy5faGFzVGFyZ2V0KCkpIHtcclxuICAgICAgICB0aGlzLnB1c2hIaXN0b3J5U3RhdGUoKTtcclxuICAgICAgICB0aGlzLl9vYmpbdGhpcy5fdGFyZ2V0S2V5XSA9IHNlbGVjdGVkO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuX2FwcGx5U2VsZWN0ZWQoc2VsZWN0ZWQpO1xyXG59O1xyXG5cclxuU2VsZWN0LnByb3RvdHlwZS5wdXNoSGlzdG9yeVN0YXRlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIG9iaiA9IHRoaXMuX29iaixcclxuICAgICAgICBrZXkgPSB0aGlzLl90YXJnZXRLZXk7XHJcbiAgICBIaXN0b3J5LmdldCgpLnB1c2hTdGF0ZShvYmosIGtleSwgb2JqW2tleV0pO1xyXG59O1xyXG5cclxuU2VsZWN0LnByb3RvdHlwZS5fb25PcHRpb25UcmlnZ2VyID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgT3B0aW9uRXZlbnQuVFJJR0dFUkVELCBudWxsKSk7XHJcbn07XHJcblxyXG5TZWxlY3QucHJvdG90eXBlLl91cGRhdGVBcHBlYXJhbmNlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5fc2VsZWN0LnNldFN0eWxlQ2xhc3ModGhpcy5fYWN0aXZlID8gQ1NTLlNlbGVjdEFjdGl2ZSA6IENTUy5TZWxlY3QpO1xyXG59O1xyXG5cclxuU2VsZWN0LnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24gKGUpIHtcclxuICAgIGlmICghdGhpcy5faGFzVGFyZ2V0KCkpe1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHRoaXMuX3NlbGVjdGVkID0gdGhpcy5fb2JqW3RoaXMuX3RhcmdldEtleV07XHJcbiAgICB0aGlzLl9zZWxlY3Quc2V0UHJvcGVydHkoJ3ZhbHVlJywgdGhpcy5fc2VsZWN0ZWQudG9TdHJpbmcoKSk7XHJcbn07XHJcblxyXG5TZWxlY3QucHJvdG90eXBlLl9oYXNUYXJnZXQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fdGFyZ2V0S2V5ICE9IG51bGw7XHJcbn07XHJcblxyXG5TZWxlY3QucHJvdG90eXBlLnNldFZhbHVlID0gZnVuY3Rpb24odmFsdWUpe1xyXG4gICAgdGhpcy5fc2VsZWN0ZWRJbmRleCA9IHZhbHVlO1xyXG4gICAgaWYodmFsdWUgPT0gLTEpe1xyXG4gICAgICAgIHRoaXMuX3NlbGVjdGVkID0gbnVsbDtcclxuICAgICAgICB0aGlzLl9zZWxlY3Quc2V0UHJvcGVydHkoJ3ZhbHVlJywgU1RSX0NIT09TRSk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdGhpcy5fc2VsZWN0ZWQgPSB0aGlzLl92YWx1ZXNbdGhpcy5fc2VsZWN0ZWRJbmRleF07XHJcbiAgICB0aGlzLl9hcHBseVNlbGVjdGVkKHRoaXMuX3NlbGVjdGVkKTtcclxufTtcclxuXHJcblNlbGVjdC5wcm90b3R5cGUuZ2V0RGF0YSA9IGZ1bmN0aW9uKCl7XHJcbiAgICB2YXIgb2JqID0ge307XHJcbiAgICAgICAgb2JqWydzZWxlY3RlZEluZGV4J10gPSB0aGlzLl9zZWxlY3RlZEluZGV4O1xyXG4gICAgcmV0dXJuIG9iajtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0O1xyXG4iLCJ2YXIgT2JqZWN0Q29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY29yZS9PYmplY3RDb21wb25lbnQnKTtcclxudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XHJcbnZhciBTbGlkZXJfSW50ZXJuYWwgPSByZXF1aXJlKCcuL1NsaWRlcl9JbnRlcm5hbCcpO1xyXG5cclxudmFyIEhpc3RvcnkgPSByZXF1aXJlKCcuLi9jb3JlL0hpc3RvcnknKTtcclxudmFyIFJhbmdlID0gcmVxdWlyZSgnLi9SYW5nZScpO1xyXG52YXIgTnVtYmVySW5wdXRfSW50ZXJuYWwgPSByZXF1aXJlKCcuL051bWJlcklucHV0X0ludGVybmFsJyk7XHJcblxyXG52YXIgRXZlbnRfICAgICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXHJcbiAgICBEb2N1bWVudEV2ZW50ICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxyXG4gICAgUGFuZWxFdmVudCAgICAgPSByZXF1aXJlKCcuLi9ncm91cC9QYW5lbEV2ZW50JyksXHJcbiAgICBHcm91cEV2ZW50ICAgICA9IHJlcXVpcmUoJy4uL2dyb3VwL0dyb3VwRXZlbnQnKSxcclxuICAgIENvbXBvbmVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9Db21wb25lbnRFdmVudCcpO1xyXG5cclxudmFyIERFRkFVTFRfU1RFUCA9IDEuMCxcclxuICAgIERFRkFVTFRfRFAgICA9IDI7XHJcblxyXG5cclxuZnVuY3Rpb24gU2xpZGVyKHBhcmVudCxvYmplY3QsdmFsdWUscmFuZ2UscGFyYW1zKSB7XHJcbiAgICBwYXJhbXMgICAgICAgICAgPSBwYXJhbXMgICAgICAgICAgfHwge307XHJcbiAgICBwYXJhbXMubGFiZWwgICAgPSBwYXJhbXMubGFiZWwgICAgfHwgdmFsdWU7XHJcblxyXG4gICAgT2JqZWN0Q29tcG9uZW50LmFwcGx5KHRoaXMsW3BhcmVudCxvYmplY3QscmFuZ2UscGFyYW1zXSk7XHJcblxyXG4gICAgdGhpcy5fdmFsdWVzICA9IHRoaXMuX29ialt0aGlzLl9rZXldO1xyXG4gICAgdGhpcy5fdGFyZ2V0S2V5ID0gdmFsdWU7XHJcblxyXG4gICAgcGFyYW1zLnN0ZXAgICAgID0gcGFyYW1zLnN0ZXAgICAgIHx8IERFRkFVTFRfU1RFUDtcclxuICAgIHBhcmFtcy5kcCAgICAgICA9IChwYXJhbXMuZHAgPT09IHVuZGVmaW5lZCB8fCBwYXJhbXMuZHAgPT0gbnVsbCkgPyAgREVGQVVMVF9EUCA6IHBhcmFtcy5kcDtcclxuICAgIHBhcmFtcy5vbkNoYW5nZSA9IHBhcmFtcy5vbkNoYW5nZSB8fCB0aGlzLl9vbkNoYW5nZTtcclxuICAgIHBhcmFtcy5vbkZpbmlzaCA9IHBhcmFtcy5vbkZpbmlzaCB8fCBmdW5jdGlvbigpe307XHJcblxyXG4gICAgdGhpcy5fZHAgICAgICAgPSBwYXJhbXMuZHA7XHJcbiAgICB0aGlzLl9vbkNoYW5nZSA9IHBhcmFtcy5vbkNoYW5nZTtcclxuICAgIHRoaXMuX29uRmluaXNoID0gcGFyYW1zLm9uRmluaXNoO1xyXG5cclxuICAgIHZhciB2YWx1ZXMgICAgPSB0aGlzLl92YWx1ZXMsXHJcbiAgICAgICAgb2JqICAgICAgID0gdGhpcy5fb2JqLFxyXG4gICAgICAgIHRhcmdldEtleSA9IHRoaXMuX3RhcmdldEtleTtcclxuXHJcbiAgICB2YXIgd3JhcCAgPSB0aGlzLl93cmFwTm9kZTtcclxuICAgICAgICB3cmFwLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXBTbGlkZXIpO1xyXG5cclxuICAgIHZhciBzbGlkZXIgPSB0aGlzLl9zbGlkZXIgPSBuZXcgU2xpZGVyX0ludGVybmFsKHdyYXAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9vblNsaWRlckJlZ2luLmJpbmQodGhpcyksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9vblNsaWRlck1vdmUuYmluZCh0aGlzKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX29uU2xpZGVyRW5kLmJpbmQodGhpcykpO1xyXG5cclxuICAgIHNsaWRlci5zZXRCb3VuZE1heCh2YWx1ZXNbMV0pO1xyXG4gICAgc2xpZGVyLnNldEJvdW5kTWluKHZhbHVlc1swXSk7XHJcbiAgICBzbGlkZXIuc2V0VmFsdWUob2JqW3RhcmdldEtleV0pO1xyXG5cclxuICAgIHZhciBpbnB1dCAgPSB0aGlzLl9pbnB1dCA9IG5ldyBOdW1iZXJJbnB1dF9JbnRlcm5hbChwYXJhbXMuc3RlcCwgcGFyYW1zLmRwLCBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX29uSW5wdXRDaGFuZ2UuYmluZCh0aGlzKSk7XHJcblxyXG4gICAgaW5wdXQuc2V0VmFsdWUob2JqW3RhcmdldEtleV0pO1xyXG5cclxuICAgIHdyYXAuYWRkQ2hpbGQoaW5wdXQuZ2V0Tm9kZSgpKTtcclxuXHJcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihQYW5lbEV2ZW50LlBBTkVMX01PVkVfRU5ELCAgICB0aGlzLCAnb25QYW5lbE1vdmVFbmQnKTtcclxuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UsIHRoaXMsICdvbkdyb3VwV2lkdGhDaGFuZ2UnKTtcclxuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuV0lORE9XX1JFU0laRSwgIHRoaXMsICdvbldpbmRvd1Jlc2l6ZScpO1xyXG59XHJcblNsaWRlci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE9iamVjdENvbXBvbmVudC5wcm90b3R5cGUpO1xyXG5TbGlkZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU2xpZGVyO1xyXG5cclxuU2xpZGVyLnByb3RvdHlwZS5wdXNoSGlzdG9yeVN0YXRlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIG9iaiA9IHRoaXMuX29iaixcclxuICAgICAgICBrZXkgPSB0aGlzLl90YXJnZXRLZXk7XHJcbiAgICBIaXN0b3J5LmdldCgpLnB1c2hTdGF0ZShvYmosIGtleSwgb2JqW2tleV0pO1xyXG59O1xyXG5cclxuU2xpZGVyLnByb3RvdHlwZS5fb25TbGlkZXJCZWdpbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMucHVzaEhpc3RvcnlTdGF0ZSgpO1xyXG59O1xyXG5cclxuU2xpZGVyLnByb3RvdHlwZS5fb25TbGlkZXJNb3ZlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5hcHBseVZhbHVlKCk7XHJcbiAgICB0aGlzLl91cGRhdGVWYWx1ZUZpZWxkKCk7XHJcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBDb21wb25lbnRFdmVudC5WQUxVRV9VUERBVEVELCBudWxsKSk7XHJcbiAgICB0aGlzLl9vbkNoYW5nZSgpO1xyXG59O1xyXG5cclxuU2xpZGVyLnByb3RvdHlwZS5fb25TbGlkZXJFbmQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLmFwcGx5VmFsdWUoKTtcclxuICAgIHRoaXMuX3VwZGF0ZVZhbHVlRmllbGQoKTtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIG51bGwpKTtcclxuICAgIHRoaXMuX29uRmluaXNoKCk7XHJcbn07XHJcblxyXG5TbGlkZXIucHJvdG90eXBlLl9vbklucHV0Q2hhbmdlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGlucHV0ID0gdGhpcy5faW5wdXQsXHJcbiAgICAgICAgdmFsdWVNaW4gPSB0aGlzLl92YWx1ZXNbMF0sXHJcbiAgICAgICAgdmFsdWVNYXggPSB0aGlzLl92YWx1ZXNbMV07XHJcblxyXG4gICAgaWYgKGlucHV0LmdldFZhbHVlKCkgPj0gdmFsdWVNYXgpe1xyXG4gICAgICAgIGlucHV0LnNldFZhbHVlKHZhbHVlTWF4KTtcclxuICAgIH1cclxuICAgIGlmIChpbnB1dC5nZXRWYWx1ZSgpIDw9IHZhbHVlTWluKXtcclxuICAgICAgICBpbnB1dC5zZXRWYWx1ZSh2YWx1ZU1pbik7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHZhbHVlID0gaW5wdXQuZ2V0VmFsdWUoKTtcclxuXHJcbiAgICB0aGlzLl9zbGlkZXIuc2V0VmFsdWUodmFsdWUpO1xyXG4gICAgdGhpcy5fb2JqW3RoaXMuX3RhcmdldEtleV0gPSB2YWx1ZTtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIG51bGwpKTtcclxuICAgIHRoaXMuX29uRmluaXNoKCk7XHJcbn07XHJcblxyXG5TbGlkZXIucHJvdG90eXBlLmFwcGx5VmFsdWUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgdmFsdWUgID0gdGhpcy5fc2xpZGVyLmdldFZhbHVlKCk7XHJcbiAgICB0aGlzLl9vYmpbdGhpcy5fdGFyZ2V0S2V5XSA9IHBhcnNlRmxvYXQodmFsdWUudG9GaXhlZCh0aGlzLl9kcCkpO1xyXG4gICAgdGhpcy5faW5wdXQuc2V0VmFsdWUodmFsdWUpO1xyXG59O1xyXG5cclxuXHJcblNsaWRlci5wcm90b3R5cGUub25WYWx1ZVVwZGF0ZSA9IGZ1bmN0aW9uIChlKSB7XHJcbiAgICB2YXIgb3JpZ2luID0gZS5kYXRhLm9yaWdpbjtcclxuICAgIGlmIChvcmlnaW4gPT0gdGhpcyl7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdmFyIHNsaWRlciA9IHRoaXMuX3NsaWRlcjtcclxuICAgIGlmICghKG9yaWdpbiBpbnN0YW5jZW9mIFNsaWRlcikpIHtcclxuICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5fdmFsdWVzO1xyXG4gICAgICAgIHNsaWRlci5zZXRCb3VuZE1pbih2YWx1ZXNbMF0pO1xyXG4gICAgICAgIHNsaWRlci5zZXRCb3VuZE1heCh2YWx1ZXNbMV0pO1xyXG4gICAgICAgIGlmICghKG9yaWdpbiBpbnN0YW5jZW9mIFJhbmdlKSkge1xyXG4gICAgICAgICAgICBzbGlkZXIuc2V0VmFsdWUodGhpcy5fb2JqW3RoaXMuX3RhcmdldEtleV0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIHNsaWRlci5zZXRWYWx1ZSh0aGlzLl9vYmpbdGhpcy5fdGFyZ2V0S2V5XSk7XHJcbiAgICB9XHJcbiAgICB0aGlzLmFwcGx5VmFsdWUoKTtcclxufTtcclxuXHJcblxyXG5TbGlkZXIucHJvdG90eXBlLl91cGRhdGVWYWx1ZUZpZWxkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5faW5wdXQuc2V0VmFsdWUodGhpcy5fc2xpZGVyLmdldFZhbHVlKCkpO1xyXG59O1xyXG5cclxuU2xpZGVyLnByb3RvdHlwZS5vblBhbmVsTW92ZUVuZCA9XHJcbiAgICBTbGlkZXIucHJvdG90eXBlLm9uR3JvdXBXaWR0aENoYW5nZSA9XHJcbiAgICAgICAgU2xpZGVyLnByb3RvdHlwZS5vbldpbmRvd1Jlc2l6ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdGhpcy5fc2xpZGVyLnJlc2V0T2Zmc2V0KCk7XHJcbiAgICAgICAgfTtcclxuXHJcblNsaWRlci5wcm90b3R5cGUuc2V0VmFsdWUgPSBmdW5jdGlvbih2YWx1ZSl7XHJcbiAgICBpZih2YWx1ZSA9PSAtMSl7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdGhpcy5fb2JqW3RoaXMuX3RhcmdldEtleV0gPSB2YWx1ZTtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCxudWxsKSk7XHJcbn07XHJcblxyXG5TbGlkZXIucHJvdG90eXBlLmdldERhdGEgPSBmdW5jdGlvbigpe1xyXG4gICAgdmFyIG9iaiA9IHt9O1xyXG4gICAgICAgIG9ialt0aGlzLl90YXJnZXRLZXldID0gdGhpcy5fb2JqW3RoaXMuX3RhcmdldEtleV07XHJcbiAgICByZXR1cm4gb2JqO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTbGlkZXI7IiwidmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcclxuXHJcbnZhciBEb2N1bWVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXHJcbiAgICBOb2RlRXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpO1xyXG5cclxudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XHJcbnZhciBNb3VzZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTW91c2UnKTtcclxuXHJcbmZ1bmN0aW9uIFNsaWRlcl9JbnRlcm5hbChwYXJlbnROb2RlLG9uQmVnaW4sb25DaGFuZ2Usb25GaW5pc2gpIHtcclxuICAgIHRoaXMuX2JvdW5kcyA9IFswLDFdO1xyXG4gICAgdGhpcy5fdmFsdWUgID0gMDtcclxuICAgIHRoaXMuX2ludHJwbCA9IDA7XHJcbiAgICB0aGlzLl9mb2N1cyAgPSBmYWxzZTtcclxuXHJcblxyXG4gICAgdGhpcy5fb25CZWdpbiAgPSBvbkJlZ2luICB8fCBmdW5jdGlvbigpe307XHJcbiAgICB0aGlzLl9vbkNoYW5nZSA9IG9uQ2hhbmdlIHx8IGZ1bmN0aW9uKCl7fTtcclxuICAgIHRoaXMuX29uRmluaXNoID0gb25GaW5pc2ggfHwgZnVuY3Rpb24oKXt9O1xyXG5cclxuXHJcbiAgICB2YXIgd3JhcCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuU2xpZGVyV3JhcCk7XHJcbiAgICBwYXJlbnROb2RlLmFkZENoaWxkKHdyYXApO1xyXG5cclxuICAgIHZhciBzbG90ICAgPSB0aGlzLl9zbG90ICAgPSB7bm9kZTogICAgbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5TbGlkZXJTbG90KSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2Zmc2V0WDogMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6ICAgMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFkZGluZzogM307XHJcblxyXG4gICAgdmFyIGhhbmRsZSA9IHRoaXMuX2hhbmRsZSA9IHtub2RlICAgIDogbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5TbGlkZXJIYW5kbGUpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aCAgIDogMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZHJhZ2dpbmc6IGZhbHNlfTtcclxuXHJcbiAgICB3cmFwLmFkZENoaWxkKHNsb3Qubm9kZSk7XHJcbiAgICBzbG90Lm5vZGUuYWRkQ2hpbGQoaGFuZGxlLm5vZGUpO1xyXG5cclxuICAgIHNsb3Qub2Zmc2V0WCA9IHNsb3Qubm9kZS5nZXRQb3NpdGlvbkdsb2JhbFgoKTtcclxuICAgIHNsb3Qud2lkdGggICA9IE1hdGguZmxvb3Ioc2xvdC5ub2RlLmdldFdpZHRoKCkgLSBzbG90LnBhZGRpbmcgKiAyKSA7XHJcblxyXG4gICAgaGFuZGxlLm5vZGUuc2V0V2lkdGgoaGFuZGxlLndpZHRoKTtcclxuXHJcbiAgICBzbG90Lm5vZGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTix0aGlzLl9vblNsb3RNb3VzZURvd24uYmluZCh0aGlzKSk7XHJcbiAgICBzbG90Lm5vZGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfVVAsICB0aGlzLl9vblNsb3RNb3VzZVVwLmJpbmQodGhpcykpO1xyXG5cclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLHRoaXMuX29uRG9jdW1lbnRNb3VzZU1vdmUuYmluZCh0aGlzKSk7XHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfVVAsICB0aGlzLl9vbkRvY3VtZW50TW91c2VVcC5iaW5kKHRoaXMpKTtcclxufVxyXG5cclxuU2xpZGVyX0ludGVybmFsLnByb3RvdHlwZS5fb25Eb2N1bWVudE1vdXNlTW92ZSA9IGZ1bmN0aW9uKCl7XHJcbiAgICBpZighdGhpcy5faGFuZGxlLmRyYWdnaW5nKXtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB0aGlzLl91cGRhdGUoKTtcclxuICAgIHRoaXMuX29uQ2hhbmdlKCk7XHJcbn07XHJcblxyXG5TbGlkZXJfSW50ZXJuYWwucHJvdG90eXBlLl9vbkRvY3VtZW50TW91c2VVcCA9IGZ1bmN0aW9uKCl7XHJcbiAgICBpZih0aGlzLl9oYW5kbGUuZHJhZ2dpbmcpe1xyXG4gICAgICAgIHRoaXMuX29uRmluaXNoKCk7XHJcbiAgICB9XHJcbiAgICB0aGlzLl9oYW5kbGUuZHJhZ2dpbmcgPSBmYWxzZTtcclxufTtcclxuXHJcblNsaWRlcl9JbnRlcm5hbC5wcm90b3R5cGUuX29uU2xvdE1vdXNlRG93biA9IGZ1bmN0aW9uKCl7XHJcbiAgICB0aGlzLl9vbkJlZ2luKCk7XHJcbiAgICB0aGlzLl9mb2N1cyA9IHRydWU7XHJcbiAgICB0aGlzLl9oYW5kbGUuZHJhZ2dpbmcgPSB0cnVlO1xyXG4gICAgdGhpcy5faGFuZGxlLm5vZGUuZ2V0RWxlbWVudCgpLmZvY3VzKCk7XHJcbiAgICB0aGlzLl91cGRhdGUoKTtcclxufTtcclxuXHJcblNsaWRlcl9JbnRlcm5hbC5wcm90b3R5cGUuX29uU2xvdE1vdXNlVXAgPSBmdW5jdGlvbigpe1xyXG4gICAgaWYgKHRoaXMuX2ZvY3VzKSB7XHJcbiAgICAgICAgdmFyIGhhbmRsZSA9IHRoaXMuX2hhbmRsZTtcclxuICAgICAgICBpZiAoaGFuZGxlLmRyYWdnaW5nKXtcclxuICAgICAgICAgICAgdGhpcy5fb25GaW5pc2goKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaGFuZGxlLmRyYWdnaW5nID0gZmFsc2U7XHJcbiAgICB9XHJcbiAgICB0aGlzLl9mb2N1cyA9IGZhbHNlO1xyXG59O1xyXG5cclxuU2xpZGVyX0ludGVybmFsLnByb3RvdHlwZS5fdXBkYXRlID0gZnVuY3Rpb24oKXtcclxuICAgIHZhciBteCA9IE1vdXNlLmdldCgpLmdldFgoKSxcclxuICAgICAgICBzeCA9IHRoaXMuX3Nsb3Qub2Zmc2V0WCxcclxuICAgICAgICBzdyA9IHRoaXMuX3Nsb3Qud2lkdGgsXHJcbiAgICAgICAgcHggPSAobXggPCBzeCkgPyAwIDogKG14ID4gKHN4ICsgc3cpKSA/IHN3IDogKG14IC0gc3gpO1xyXG5cclxuICAgIHRoaXMuX2hhbmRsZS5ub2RlLnNldFdpZHRoKE1hdGgucm91bmQocHgpKTtcclxuICAgIHRoaXMuX2ludHJwbCA9IHB4IC8gc3c7XHJcbiAgICB0aGlzLl9pbnRlcnBvbGF0ZVZhbHVlKCk7XHJcbn07XHJcblxyXG5TbGlkZXJfSW50ZXJuYWwucHJvdG90eXBlLl91cGRhdGVIYW5kbGUgPSBmdW5jdGlvbigpe1xyXG4gICAgdmFyIHNsb3RXaWR0aCAgID0gdGhpcy5fc2xvdC53aWR0aCxcclxuICAgICAgICBoYW5kbGVXaWR0aCA9IE1hdGgucm91bmQodGhpcy5faW50cnBsICogc2xvdFdpZHRoKTtcclxuICAgIHRoaXMuX2hhbmRsZS5ub2RlLnNldFdpZHRoKE1hdGgubWluKGhhbmRsZVdpZHRoLHNsb3RXaWR0aCkpO1xyXG59O1xyXG5cclxuU2xpZGVyX0ludGVybmFsLnByb3RvdHlwZS5faW50ZXJwb2xhdGVWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBpbnRycGwgPSB0aGlzLl9pbnRycGwsXHJcbiAgICAgICAgYm91bmRzID0gdGhpcy5fYm91bmRzO1xyXG4gICAgdGhpcy5fdmFsdWUgPSBib3VuZHNbMF0gKiAoMS4wIC0gaW50cnBsKSArIGJvdW5kc1sxXSAqIGludHJwbDtcclxufTtcclxuXHJcblNsaWRlcl9JbnRlcm5hbC5wcm90b3R5cGUucmVzZXRPZmZzZXQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgc2xvdCA9IHRoaXMuX3Nsb3Q7XHJcbiAgICBzbG90Lm9mZnNldFggPSBzbG90Lm5vZGUuZ2V0UG9zaXRpb25HbG9iYWxYKCk7XHJcbiAgICBzbG90LndpZHRoID0gTWF0aC5mbG9vcihzbG90Lm5vZGUuZ2V0V2lkdGgoKSAtIHNsb3QucGFkZGluZyAqIDIpXHJcbn07XHJcblxyXG5TbGlkZXJfSW50ZXJuYWwucHJvdG90eXBlLnNldEJvdW5kTWluID0gZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICB2YXIgYm91bmRzID0gdGhpcy5fYm91bmRzO1xyXG4gICAgaWYgKHZhbHVlID49IGJvdW5kc1sxXSl7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgYm91bmRzWzBdID0gdmFsdWU7XHJcbiAgICB0aGlzLl91cGRhdGVGcm9tQm91bmRzKCk7XHJcbn07XHJcblxyXG5TbGlkZXJfSW50ZXJuYWwucHJvdG90eXBlLnNldEJvdW5kTWF4ID0gZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICB2YXIgYm91bmRzID0gdGhpcy5fYm91bmRzO1xyXG4gICAgaWYgKHZhbHVlIDw9IGJvdW5kc1swXSl7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgYm91bmRzWzFdID0gdmFsdWU7XHJcbiAgICB0aGlzLl91cGRhdGVGcm9tQm91bmRzKCk7XHJcbn07XHJcblxyXG5TbGlkZXJfSW50ZXJuYWwucHJvdG90eXBlLl91cGRhdGVGcm9tQm91bmRzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGJvdW5kc01pbiA9IHRoaXMuX2JvdW5kc1swXSxcclxuICAgICAgICBib3VuZHNNYXggPSB0aGlzLl9ib3VuZHNbMV07XHJcbiAgICB0aGlzLl92YWx1ZSA9IE1hdGgubWF4KGJvdW5kc01pbixNYXRoLm1pbih0aGlzLl92YWx1ZSxib3VuZHNNYXgpKTtcclxuICAgIHRoaXMuX2ludHJwbCA9IE1hdGguYWJzKCh0aGlzLl92YWx1ZSAtIGJvdW5kc01pbikgLyAoYm91bmRzTWluIC0gYm91bmRzTWF4KSk7XHJcbiAgICB0aGlzLl91cGRhdGVIYW5kbGUoKTtcclxufTtcclxuXHJcblNsaWRlcl9JbnRlcm5hbC5wcm90b3R5cGUuc2V0VmFsdWUgPSBmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgIHZhciBib3VuZHNNaW4gPSB0aGlzLl9ib3VuZHNbMF0sXHJcbiAgICAgICAgYm91bmRzTWF4ID0gdGhpcy5fYm91bmRzWzFdO1xyXG5cclxuICAgIGlmICh2YWx1ZSA8IGJvdW5kc01pbiB8fCB2YWx1ZSA+IGJvdW5kc01heCl7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdGhpcy5faW50cnBsID0gTWF0aC5hYnMoKHZhbHVlIC0gYm91bmRzTWluKSAvIChib3VuZHNNaW4gLSBib3VuZHNNYXgpKTtcclxuICAgIHRoaXMuX3VwZGF0ZUhhbmRsZSgpO1xyXG4gICAgdGhpcy5fdmFsdWUgPSB2YWx1ZTtcclxufTtcclxuXHJcblNsaWRlcl9JbnRlcm5hbC5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fdmFsdWU7XHJcbn07XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTbGlkZXJfSW50ZXJuYWw7IiwidmFyIE9iamVjdENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvT2JqZWN0Q29tcG9uZW50Jyk7XHJcbnZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XHJcbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xyXG52YXIgT3B0aW9ucyA9IHJlcXVpcmUoJy4vT3B0aW9ucycpO1xyXG52YXIgQnV0dG9uUHJlc2V0ID0gcmVxdWlyZSgnLi9CdXR0b25QcmVzZXQnKTtcclxudmFyIE1ldHJpYyA9IHJlcXVpcmUoJy4vTWV0cmljJyk7XHJcblxyXG52YXIgRXZlbnRfID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxyXG4gICAgRG9jdW1lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxyXG4gICAgTm9kZUV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKSxcclxuICAgIENvbXBvbmVudEV2ZW50ID0gIHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKTtcclxuXHJcbnZhciBERUZBVUxUX1BSRVNFVCA9IG51bGw7XHJcblxyXG5mdW5jdGlvbiBTdHJpbmdJbnB1dChwYXJlbnQsb2JqZWN0LHZhbHVlLHBhcmFtcykge1xyXG4gICAgT2JqZWN0Q29tcG9uZW50LmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcclxuXHJcbiAgICBwYXJhbXMgICAgICAgICAgPSBwYXJhbXMgfHwge307XHJcbiAgICBwYXJhbXMub25DaGFuZ2UgPSBwYXJhbXMub25DaGFuZ2UgfHwgdGhpcy5fb25DaGFuZ2U7XHJcbiAgICBwYXJhbXMucHJlc2V0cyAgPSBwYXJhbXMucHJlc2V0cyAgfHwgREVGQVVMVF9QUkVTRVQ7XHJcblxyXG4gICAgdGhpcy5fb25DaGFuZ2UgICA9IHBhcmFtcy5vbkNoYW5nZTtcclxuXHJcbiAgICB2YXIgaW5wdXQgPSB0aGlzLl9pbnB1dCA9IG5ldyBOb2RlKE5vZGUuSU5QVVRfVEVYVCk7XHJcblxyXG4gICAgdmFyIHdyYXAgPSB0aGlzLl93cmFwTm9kZTtcclxuXHJcbiAgICB2YXIgcHJlc2V0cyA9IHBhcmFtcy5wcmVzZXRzO1xyXG4gICAgaWYgKCFwcmVzZXRzKSB7XHJcbiAgICAgICAgd3JhcC5hZGRDaGlsZChpbnB1dCk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICB2YXIgd3JhcF8gPSBuZXcgTm9kZSgpO1xyXG4gICAgICAgIHdyYXBfLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXBJbnB1dFdQcmVzZXQpO1xyXG5cclxuICAgICAgICB3cmFwLmFkZENoaWxkKHdyYXBfKTtcclxuICAgICAgICB3cmFwXy5hZGRDaGlsZChpbnB1dCk7XHJcblxyXG4gICAgICAgIHZhciBvcHRpb25zID0gT3B0aW9ucy5nZXQoKSxcclxuICAgICAgICAgICAgYnRuUHJlc2V0ID0gbmV3IEJ1dHRvblByZXNldCh0aGlzLl93cmFwTm9kZSk7XHJcblxyXG4gICAgICAgIHZhciBvblByZXNldERlYWN0aXZhdGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIG9wdGlvbnMuY2xlYXIoKTtcclxuICAgICAgICAgICAgYnRuUHJlc2V0LmRlYWN0aXZhdGUoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgdmFyIG9uUHJlc2V0QWN0aXZhdGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIG9wdGlvbnMuYnVpbGQocHJlc2V0cyxcclxuICAgICAgICAgICAgICAgIGlucHV0LmdldFByb3BlcnR5KCd2YWx1ZScpLFxyXG4gICAgICAgICAgICAgICAgaW5wdXQsXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaW5wdXQuc2V0UHJvcGVydHkoJ3ZhbHVlJywgcHJlc2V0c1tvcHRpb25zLmdldFNlbGVjdGVkSW5kZXgoKV0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGYucHVzaEhpc3RvcnlTdGF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGYuYXBwbHlWYWx1ZSgpO1xyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIG9uUHJlc2V0RGVhY3RpdmF0ZSxcclxuICAgICAgICAgICAgICAgIE1ldHJpYy5QQURESU5HX1BSRVNFVCxcclxuICAgICAgICAgICAgICAgIGZhbHNlKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBidG5QcmVzZXQuc2V0T25BY3RpdmUob25QcmVzZXRBY3RpdmF0ZSk7XHJcbiAgICAgICAgYnRuUHJlc2V0LnNldE9uRGVhY3RpdmUob25QcmVzZXREZWFjdGl2YXRlKVxyXG4gICAgfVxyXG5cclxuICAgIGlucHV0LnNldFByb3BlcnR5KCd2YWx1ZScsdGhpcy5fb2JqW3RoaXMuX2tleV0pO1xyXG5cclxuICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50LktFWV9VUCwgdGhpcy5fb25JbnB1dEtleVVwLmJpbmQodGhpcykpO1xyXG4gICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuQ0hBTkdFLCB0aGlzLl9vbklucHV0Q2hhbmdlLmJpbmQodGhpcykpO1xyXG5cclxuICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uSW5wdXREcmFnU3RhcnQuYmluZCh0aGlzKSk7XHJcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoQ29tcG9uZW50RXZlbnQuSU5QVVRfU0VMRUNUX0RSQUcsdGhpcy5fcGFyZW50LCdvbkNvbXBvbmVudFNlbGVjdERyYWcnKTtcclxufVxyXG5TdHJpbmdJbnB1dC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE9iamVjdENvbXBvbmVudC5wcm90b3R5cGUpO1xyXG5TdHJpbmdJbnB1dC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTdHJpbmdJbnB1dDtcclxuXHJcblN0cmluZ0lucHV0LnByb3RvdHlwZS5fb25JbnB1dEtleVVwID0gZnVuY3Rpb24gKGUpIHtcclxuICAgIGlmICh0aGlzLl9rZXlJc0NoYXIoZS5rZXlDb2RlKSl7XHJcbiAgICAgICAgdGhpcy5wdXNoSGlzdG9yeVN0YXRlKCk7XHJcbiAgICB9XHJcbiAgICB0aGlzLmFwcGx5VmFsdWUoKTtcclxuICAgIHRoaXMuX29uQ2hhbmdlKCk7XHJcbn07XHJcblxyXG5TdHJpbmdJbnB1dC5wcm90b3R5cGUuX29uSW5wdXRDaGFuZ2UgPSBmdW5jdGlvbiAoZSkge1xyXG4gICAgaWYgKHRoaXMuX2tleUlzQ2hhcihlLmtleUNvZGUpKXtcclxuICAgICAgICB0aGlzLnB1c2hIaXN0b3J5U3RhdGUoKTtcclxuICAgIH1cclxuICAgIHRoaXMuYXBwbHlWYWx1ZSgpO1xyXG59O1xyXG5cclxuLy9UT0RPOiBGaW5pc2ggY2hlY2tcclxuU3RyaW5nSW5wdXQucHJvdG90eXBlLl9rZXlJc0NoYXIgPSBmdW5jdGlvbiAoa2V5Q29kZSkge1xyXG4gICAgcmV0dXJuIGtleUNvZGUgIT0gMTcgJiZcclxuICAgICAgICBrZXlDb2RlICE9IDE4ICYmXHJcbiAgICAgICAga2V5Q29kZSAhPSAyMCAmJlxyXG4gICAgICAgIGtleUNvZGUgIT0gMzcgJiZcclxuICAgICAgICBrZXlDb2RlICE9IDM4ICYmXHJcbiAgICAgICAga2V5Q29kZSAhPSAzOSAmJlxyXG4gICAgICAgIGtleUNvZGUgIT0gNDAgJiZcclxuICAgICAgICBrZXlDb2RlICE9IDE2O1xyXG59O1xyXG5cclxuXHJcblN0cmluZ0lucHV0LnByb3RvdHlwZS5hcHBseVZhbHVlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5fb2JqW3RoaXMuX2tleV0gPSB0aGlzLl9pbnB1dC5nZXRQcm9wZXJ0eSgndmFsdWUnKTtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIG51bGwpKTtcclxufTtcclxuXHJcblN0cmluZ0lucHV0LnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24gKGUpIHtcclxuICAgIGlmIChlLmRhdGEub3JpZ2luID09IHRoaXMpcmV0dXJuO1xyXG4gICAgdGhpcy5faW5wdXQuc2V0UHJvcGVydHkoJ3ZhbHVlJywgdGhpcy5fb2JqW3RoaXMuX2tleV0pO1xyXG59O1xyXG5cclxuLy9QcmV2ZW50IGNocm9tZSBzZWxlY3QgZHJhZ1xyXG5TdHJpbmdJbnB1dC5wcm90b3R5cGUuX29uSW5wdXREcmFnU3RhcnQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgZXZlbnRNb3ZlID0gRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLFxyXG4gICAgICAgIGV2ZW50VXAgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX1VQO1xyXG5cclxuICAgIHZhciBldmVudCA9IENvbXBvbmVudEV2ZW50LklOUFVUX1NFTEVDVF9EUkFHO1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgdmFyIG9uRHJhZyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgc2VsZi5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgZXZlbnQsIG51bGwpKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBvbkRyYWdGaW5pc2ggPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHNlbGYuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIGV2ZW50LCBudWxsKSk7XHJcblxyXG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnLCBmYWxzZSk7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3ZlLCBvbkRyYWdGaW5pc2gsIGZhbHNlKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIGV2ZW50LCBudWxsKSk7XHJcblxyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdmUsIG9uRHJhZywgZmFsc2UpO1xyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudFVwLCBvbkRyYWdGaW5pc2gsIGZhbHNlKTtcclxufTtcclxuXHJcblN0cmluZ0lucHV0LnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLm9uVmFsdWVVcGRhdGUoeyBkYXRhOiB7fSB9KTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU3RyaW5nSW5wdXQ7IiwidmFyIE91dHB1dCA9IHJlcXVpcmUoJy4vT3V0cHV0Jyk7XHJcblxyXG5TdHJpbmdPdXRwdXQgPSBmdW5jdGlvbiAocGFyZW50LCBvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcclxuICAgIE91dHB1dC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG59O1xyXG5TdHJpbmdPdXRwdXQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShPdXRwdXQucHJvdG90eXBlKTtcclxuU3RyaW5nT3V0cHV0LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFN0cmluZ091dHB1dDtcclxuXHJcblN0cmluZ091dHB1dC5wcm90b3R5cGUuX3NldFZhbHVlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgaWYgKHRoaXMuX3BhcmVudC5pc0Rpc2FibGVkKCkpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB2YXIgdGV4dEFyZWFTdHJpbmcgPSB0aGlzLl9vYmpbdGhpcy5fa2V5XTtcclxuXHJcbiAgICBpZiAodGV4dEFyZWFTdHJpbmcgPT0gdGhpcy5fcHJldlN0cmluZyl7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdmFyIHRleHRBcmVhID0gdGhpcy5fdGV4dEFyZWEsXHJcbiAgICAgICAgdGV4dEFyZWFFbGVtZW50ID0gdGV4dEFyZWEuZ2V0RWxlbWVudCgpLFxyXG4gICAgICAgIHRleHRBcmVhU2Nyb2xsSGVpZ2h0O1xyXG5cclxuICAgIHRleHRBcmVhLnNldFByb3BlcnR5KCd2YWx1ZScsIHRleHRBcmVhU3RyaW5nKTtcclxuICAgIHRleHRBcmVhU2Nyb2xsSGVpZ2h0ID0gdGV4dEFyZWFFbGVtZW50LnNjcm9sbEhlaWdodDtcclxuICAgIHRleHRBcmVhLnNldEhlaWdodCh0ZXh0QXJlYVNjcm9sbEhlaWdodCk7XHJcblxyXG4gICAgdmFyIHNjcm9sbEJhciA9IHRoaXMuX3Njcm9sbEJhcjtcclxuXHJcbiAgICBpZiAoc2Nyb2xsQmFyKSB7XHJcbiAgICAgICAgaWYgKHRleHRBcmVhU2Nyb2xsSGVpZ2h0IDw9IHRoaXMuX3dyYXBOb2RlLmdldEhlaWdodCgpKSB7XHJcbiAgICAgICAgICAgIHNjcm9sbEJhci5kaXNhYmxlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBzY3JvbGxCYXIuZW5hYmxlKCk7XHJcbiAgICAgICAgICAgIHNjcm9sbEJhci51cGRhdGUoKTtcclxuICAgICAgICAgICAgc2Nyb2xsQmFyLnJlc2V0KCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgdGhpcy5fcHJldlN0cmluZyA9IHRleHRBcmVhU3RyaW5nO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTdHJpbmdPdXRwdXQ7XHJcbiIsInZhciBQbG90dGVyID0gcmVxdWlyZSgnLi9QbG90dGVyJyk7XHJcbnZhciBNZXRyaWMgID0gcmVxdWlyZSgnLi9NZXRyaWMnKTtcclxuXHJcbnZhciBERUZBVUxUX1JFU09MVVRJT04gPSAxO1xyXG5cclxuZnVuY3Rpb24gVmFsdWVQbG90dGVyKHBhcmVudCxvYmplY3QsdmFsdWUscGFyYW1zKSB7XHJcbiAgICBQbG90dGVyLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcclxuXHJcbiAgICB2YXIgc3ZnICAgICAgID0gdGhpcy5fc3ZnLFxyXG4gICAgICAgIHN2Z1dpZHRoICA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKSxcclxuICAgICAgICBzdmdIZWlnaHQgPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnaGVpZ2h0JykpO1xyXG5cclxuICAgIHBhcmFtcyAgICAgICAgICAgID0gcGFyYW1zICAgICAgICAgICAgfHwge307XHJcbiAgICBwYXJhbXMuaGVpZ2h0ICAgICA9IHBhcmFtcy5oZWlnaHQgICAgIHx8IHN2Z0hlaWdodDtcclxuICAgIHBhcmFtcy5yZXNvbHV0aW9uID0gcGFyYW1zLnJlc29sdXRpb24gfHwgREVGQVVMVF9SRVNPTFVUSU9OO1xyXG5cclxuICAgIHZhciByZXNvbHV0aW9uID0gcGFyYW1zLnJlc29sdXRpb24sXHJcbiAgICAgICAgbGVuZ3RoICAgICA9IE1hdGguZmxvb3Ioc3ZnV2lkdGggLyByZXNvbHV0aW9uKTtcclxuXHJcbiAgICB2YXIgcG9pbnRzICAgICA9IHRoaXMuX3BvaW50cyAgPSBuZXcgQXJyYXkobGVuZ3RoICogMiksXHJcbiAgICAgICAgYnVmZmVyMCAgICA9IHRoaXMuX2J1ZmZlcjAgPSBuZXcgQXJyYXkobGVuZ3RoKSxcclxuICAgICAgICBidWZmZXIxICAgID0gdGhpcy5fYnVmZmVyMSA9IG5ldyBBcnJheShsZW5ndGgpO1xyXG5cclxuICAgIHZhciBtaW4gPSB0aGlzLl9saW5lV2lkdGggKiAwLjU7XHJcblxyXG4gICAgdmFyIGkgPSAtMTtcclxuICAgIHdoaWxlICgrK2kgPCBsZW5ndGgpIHtcclxuICAgICAgICBidWZmZXIwW2ldID0gYnVmZmVyMVtpXSA9IHBvaW50c1tpICogMl0gPSBwb2ludHNbaSAqIDIgKyAxXSA9IG1pbjtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLl9oZWlnaHQgPSBwYXJhbXMuaGVpZ2h0ID0gcGFyYW1zLmhlaWdodCAgPCBNZXRyaWMuQ09NUE9ORU5UX01JTl9IRUlHSFQgP1xyXG4gICAgICAgICAgICAgICAgICAgTWV0cmljLkNPTVBPTkVOVF9NSU5fSEVJR0hUIDogcGFyYW1zLmhlaWdodDtcclxuXHJcbiAgICB0aGlzLl9zdmdTZXRTaXplKHN2Z0hlaWdodCxNYXRoLmZsb29yKHBhcmFtcy5oZWlnaHQpKTtcclxuICAgIHRoaXMuX2dyaWQuc3R5bGUuc3Ryb2tlID0gJ3JnYigzOSw0NCw0NiknO1xyXG5cclxuICAgIHRoaXMuX3VwZGF0ZUhlaWdodCgpO1xyXG4gICAgdGhpcy5fZHJhd1ZhbHVlKCk7XHJcbn1cclxuVmFsdWVQbG90dGVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUGxvdHRlci5wcm90b3R5cGUpO1xyXG5WYWx1ZVBsb3R0ZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gVmFsdWVQbG90dGVyO1xyXG5cclxuVmFsdWVQbG90dGVyLnByb3RvdHlwZS5fcmVkcmF3ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHBvaW50cyA9IHRoaXMuX3BvaW50cyxcclxuICAgICAgICBidWZmZXJMZW4gPSB0aGlzLl9idWZmZXIwLmxlbmd0aDtcclxuXHJcbiAgICB2YXIgd2lkdGggPSBOdW1iZXIodGhpcy5fc3ZnLmdldEF0dHJpYnV0ZSgnd2lkdGgnKSksXHJcbiAgICAgICAgcmF0aW8gPSB3aWR0aCAvIChidWZmZXJMZW4gLSAxKTtcclxuXHJcbiAgICB2YXIgaSA9IC0xO1xyXG4gICAgd2hpbGUgKCsraSA8IGJ1ZmZlckxlbikge1xyXG4gICAgICAgIHBvaW50c1tpICogMl0gPSB3aWR0aCAtIGkgKiByYXRpbztcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLl9kcmF3VmFsdWUoKTtcclxufTtcclxuXHJcblZhbHVlUGxvdHRlci5wcm90b3R5cGUub25Hcm91cFNpemVDaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgd2lkdGggPSB0aGlzLl93cmFwTm9kZS5nZXRXaWR0aCgpLFxyXG4gICAgICAgIGhlaWdodCA9IHRoaXMuX2hlaWdodDtcclxuXHJcbiAgICB0aGlzLl9zdmdTZXRTaXplKHdpZHRoLCBoZWlnaHQpO1xyXG4gICAgdGhpcy5fdXBkYXRlSGVpZ2h0KCk7XHJcbiAgICB0aGlzLl9kcmF3R3JpZCgpO1xyXG4gICAgdGhpcy5fcmVkcmF3KCk7XHJcbn07XHJcblxyXG5WYWx1ZVBsb3R0ZXIucHJvdG90eXBlLl9kcmF3VmFsdWUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLl9kcmF3Q3VydmUoKTtcclxufTtcclxuXHJcblZhbHVlUGxvdHRlci5wcm90b3R5cGUuX2RyYXdHcmlkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHN2ZyA9IHRoaXMuX3N2ZztcclxuXHJcbiAgICB2YXIgc3ZnV2lkdGggPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnd2lkdGgnKSksXHJcbiAgICAgICAgc3ZnSGVpZ2h0SGFsZiA9IE1hdGguZmxvb3IoTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ2hlaWdodCcpKSAqIDAuNSk7XHJcblxyXG4gICAgdmFyIHBhdGhDbWQgPSAnJztcclxuICAgICAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRNb3ZlVG8oMCwgc3ZnSGVpZ2h0SGFsZik7XHJcbiAgICAgICAgcGF0aENtZCArPSB0aGlzLl9wYXRoQ21kTGluZVRvKHN2Z1dpZHRoLCBzdmdIZWlnaHRIYWxmKTtcclxuXHJcbiAgICB0aGlzLl9ncmlkLnNldEF0dHJpYnV0ZSgnZCcsIHBhdGhDbWQpO1xyXG59O1xyXG5cclxuLy9UT0RPOiBtZXJnZSB1cGRhdGUgKyBwYXRoY21kXHJcblZhbHVlUGxvdHRlci5wcm90b3R5cGUuX2RyYXdDdXJ2ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBzdmcgPSB0aGlzLl9zdmc7XHJcblxyXG4gICAgdmFyIHZhbHVlID0gdGhpcy5fb2JqW3RoaXMuX2tleV07XHJcblxyXG4gICAgdmFyIGJ1ZmZlcjAgPSB0aGlzLl9idWZmZXIwLFxyXG4gICAgICAgIGJ1ZmZlcjEgPSB0aGlzLl9idWZmZXIxLFxyXG4gICAgICAgIHBvaW50cyA9IHRoaXMuX3BvaW50cztcclxuXHJcbiAgICB2YXIgYnVmZmVyTGVuZ3RoID0gYnVmZmVyMC5sZW5ndGg7XHJcblxyXG4gICAgdmFyIHBhdGhDbWQgPSAnJztcclxuXHJcbiAgICB2YXIgaGVpZ2h0SGFsZiA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCdoZWlnaHQnKSkgKiAwLjUsXHJcbiAgICAgICAgdW5pdCA9IGhlaWdodEhhbGYgLSB0aGlzLl9saW5lV2lkdGggKiAwLjU7XHJcblxyXG4gICAgcG9pbnRzWzFdID0gYnVmZmVyMFswXTtcclxuICAgIGJ1ZmZlcjBbYnVmZmVyTGVuZ3RoIC0gMV0gPSAodmFsdWUgKiB1bml0KSAqIC0xICsgTWF0aC5mbG9vcihoZWlnaHRIYWxmKTtcclxuXHJcbiAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRNb3ZlVG8ocG9pbnRzWzBdLCBwb2ludHNbMV0pO1xyXG5cclxuICAgIHZhciBpID0gMCwgaW5kZXg7XHJcblxyXG4gICAgd2hpbGUgKCsraSA8IGJ1ZmZlckxlbmd0aCkge1xyXG4gICAgICAgIGluZGV4ID0gaSAqIDI7XHJcblxyXG4gICAgICAgIGJ1ZmZlcjFbaSAtIDFdID0gYnVmZmVyMFtpXTtcclxuICAgICAgICBwb2ludHNbaW5kZXggKyAxXSA9IGJ1ZmZlcjBbaSAtIDFdID0gYnVmZmVyMVtpIC0gMV07XHJcblxyXG4gICAgICAgIHBhdGhDbWQgKz0gdGhpcy5fcGF0aENtZExpbmVUbyhwb2ludHNbaW5kZXhdLCBwb2ludHNbaW5kZXggKyAxXSk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5fcGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwYXRoQ21kKTtcclxufTtcclxuXHJcblZhbHVlUGxvdHRlci5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgaWYgKHRoaXMuX3BhcmVudC5pc0Rpc2FibGVkKCkpcmV0dXJuO1xyXG4gICAgdGhpcy5fZHJhd1ZhbHVlKCk7XHJcbn1cclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFZhbHVlUGxvdHRlcjtcclxuXHJcbiIsInZhciBOb2RlID0gcmVxdWlyZSgnLi9kb2N1bWVudC9Ob2RlJyksXHJcbiAgICBDU1MgPSByZXF1aXJlKCcuL2RvY3VtZW50L0NTUycpO1xyXG52YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZSgnLi9ldmVudC9FdmVudERpc3BhdGNoZXInKSxcclxuICAgIENvbXBvbmVudEV2ZW50ICA9IHJlcXVpcmUoJy4vQ29tcG9uZW50RXZlbnQnKTtcclxuXHJcbmZ1bmN0aW9uIENvbXBvbmVudChwYXJlbnQsbGFiZWwpIHtcclxuICAgIEV2ZW50RGlzcGF0Y2hlci5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XHJcblxyXG4gICAgbGFiZWwgPSBwYXJlbnQudXNlc0xhYmVscygpID8gbGFiZWwgOiAnbm9uZSc7XHJcblxyXG4gICAgdGhpcy5fcGFyZW50ICA9IHBhcmVudDtcclxuICAgIHRoaXMuX2VuYWJsZWQgPSB0cnVlO1xyXG5cclxuICAgIHZhciByb290ID0gdGhpcy5fbm9kZSA9IG5ldyBOb2RlKE5vZGUuTElTVF9JVEVNKSxcclxuICAgICAgICB3cmFwID0gdGhpcy5fd3JhcE5vZGUgPSBuZXcgTm9kZSgpO1xyXG4gICAgICAgIHdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCk7XHJcbiAgICAgICAgcm9vdC5hZGRDaGlsZCh3cmFwKTtcclxuXHJcbiAgICBpZiAobGFiZWwgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIGlmIChsYWJlbC5sZW5ndGggIT0gMCAmJiBsYWJlbCAhPSAnbm9uZScpIHtcclxuICAgICAgICAgICAgdmFyIGxhYmVsXyA9IHRoaXMuX2xhYmxOb2RlID0gbmV3IE5vZGUoTm9kZS5TUEFOKTtcclxuICAgICAgICAgICAgICAgIGxhYmVsXy5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCk7XHJcbiAgICAgICAgICAgICAgICBsYWJlbF8uc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsIGxhYmVsKTtcclxuICAgICAgICAgICAgICAgIHJvb3QuYWRkQ2hpbGQobGFiZWxfKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChsYWJlbCA9PSAnbm9uZScpIHtcclxuICAgICAgICAgICAgd3JhcC5zZXRTdHlsZVByb3BlcnR5KCdtYXJnaW5MZWZ0JywgJzAnKTtcclxuICAgICAgICAgICAgd3JhcC5zZXRTdHlsZVByb3BlcnR5KCd3aWR0aCcsICcxMDAlJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKENvbXBvbmVudEV2ZW50LkVOQUJMRSwgdGhpcywnb25FbmFibGUnKTtcclxuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKENvbXBvbmVudEV2ZW50LkRJU0FCTEUsdGhpcywnb25EaXNhYmxlJyk7XHJcbiAgICB0aGlzLl9wYXJlbnQuYWRkQ29tcG9uZW50Tm9kZShyb290KTtcclxufVxyXG5Db21wb25lbnQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudERpc3BhdGNoZXIucHJvdG90eXBlKTtcclxuQ29tcG9uZW50LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IENvbXBvbmVudDtcclxuXHJcbkNvbXBvbmVudC5wcm90b3R5cGUuZW5hYmxlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5fZW5hYmxlZCA9IHRydWU7XHJcbn07XHJcblxyXG5Db21wb25lbnQucHJvdG90eXBlLmRpc2FibGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLl9lbmFibGVkID0gZmFsc2U7XHJcbn07XHJcblxyXG5Db21wb25lbnQucHJvdG90eXBlLmlzRW5hYmxlZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLl9lbmFibGVkO1xyXG59O1xyXG5Db21wb25lbnQucHJvdG90eXBlLmlzRGlzYWJsZWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gIXRoaXMuX2VuYWJsZWQ7XHJcbn07XHJcblxyXG5Db21wb25lbnQucHJvdG90eXBlLm9uRW5hYmxlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5lbmFibGUoKTtcclxufTtcclxuXHJcbkNvbXBvbmVudC5wcm90b3R5cGUub25EaXNhYmxlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5kaXNhYmxlKCk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvbmVudDsiLCJ2YXIgQ29tcG9uZW50RXZlbnQgPSB7XHJcblx0VkFMVUVfVVBEQVRFRDogJ3ZhbHVlVXBkYXRlZCcsXHJcblx0VVBEQVRFX1ZBTFVFOiAndXBkYXRlVmFsdWUnLFxyXG5cclxuXHRJTlBVVF9TRUxFQ1RfRFJBRzogJ2lucHV0U2VsZWN0RHJhZycsXHJcblxyXG5cdEVOQUJMRSAgOiAnZW5hYmxlJyxcclxuXHRESVNBQkxFIDogJ2Rpc2FibGUnXHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvbmVudEV2ZW50OyIsImZ1bmN0aW9uIENvbXBvbmVudE9iamVjdEVycm9yKG9iamVjdCxrZXkpIHtcclxuXHRFcnJvci5hcHBseSh0aGlzKTtcclxuXHRFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLENvbXBvbmVudE9iamVjdEVycm9yKTtcclxuXHR0aGlzLm5hbWUgPSAnQ29tcG9uZW50T2JqZWN0RXJyb3InO1xyXG5cdHRoaXMubWVzc2FnZSA9ICdPYmplY3Qgb2YgdHlwZSAnICsgb2JqZWN0LmNvbnN0cnVjdG9yLm5hbWUgKyAnIGhhcyBubyBtZW1iZXIgJyArIGtleSArICcuJztcclxufVxyXG5Db21wb25lbnRPYmplY3RFcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVycm9yLnByb3RvdHlwZSk7XHJcbkNvbXBvbmVudE9iamVjdEVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IENvbXBvbmVudE9iamVjdEVycm9yO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnRPYmplY3RFcnJvcjsiLCJ2YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZSgnLi9ldmVudC9FdmVudERpc3BhdGNoZXInKSxcclxuICAgIEV2ZW50XyA9IHJlcXVpcmUoJy4vZXZlbnQvRXZlbnQnKSxcclxuICAgIEhpc3RvcnlFdmVudCA9IHJlcXVpcmUoJy4vSGlzdG9yeUV2ZW50Jyk7XHJcblxyXG52YXIgTUFYX1NUQVRFUyA9IDMwO1xyXG5cclxuZnVuY3Rpb24gSGlzdG9yeSgpIHtcclxuICAgIEV2ZW50RGlzcGF0Y2hlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG4gICAgdGhpcy5fc3RhdGVzID0gW107XHJcbiAgICB0aGlzLl9lbmFibGVkID0gZmFsc2U7XHJcbn1cclxuSGlzdG9yeS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUpO1xyXG5IaXN0b3J5LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEhpc3Rvcnk7XHJcblxyXG5IaXN0b3J5LnByb3RvdHlwZS5wdXNoU3RhdGUgPSBmdW5jdGlvbiAob2JqZWN0LCBrZXksIHZhbHVlKSB7XHJcbiAgICBpZiAodGhpcy5fZW5hYmxlZCl7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XHJcbiAgICBpZiAoc3RhdGVzLmxlbmd0aCA+PSBNQVhfU1RBVEVTKXtcclxuICAgICAgICBzdGF0ZXMuc2hpZnQoKTtcclxuICAgIH1cclxuICAgIHN0YXRlcy5wdXNoKHtvYmplY3Q6IG9iamVjdCwga2V5OiBrZXksIHZhbHVlOiB2YWx1ZX0pO1xyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgSGlzdG9yeUV2ZW50LlNUQVRFX1BVU0gsIG51bGwpKTtcclxufTtcclxuXHJcbkhpc3RvcnkucHJvdG90eXBlLmdldFN0YXRlID0gZnVuY3Rpb24gKG9iamVjdCwga2V5KSB7XHJcbiAgICB2YXIgc3RhdGVzID0gdGhpcy5fc3RhdGVzLFxyXG4gICAgICAgIHN0YXRlc0xlbiA9IHN0YXRlcy5sZW5ndGg7XHJcblxyXG4gICAgaWYgKHN0YXRlc0xlbiA9PSAwKXtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgc3RhdGUsIHZhbHVlO1xyXG4gICAgdmFyIGkgPSAtMTtcclxuICAgIHdoaWxlICgrK2kgPCBzdGF0ZXNMZW4pIHtcclxuICAgICAgICBzdGF0ZSA9IHN0YXRlc1tpXTtcclxuICAgICAgICBpZiAoc3RhdGUub2JqZWN0ID09PSBvYmplY3QpIHtcclxuICAgICAgICAgICAgaWYgKHN0YXRlLmtleSA9PT0ga2V5KSB7XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHN0YXRlLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdmFsdWU7XHJcbn07XHJcblxyXG5IaXN0b3J5LnByb3RvdHlwZS5wb3BTdGF0ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGlmICh0aGlzLl9lbmFibGVkKXtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcclxuICAgIGlmIChzdGF0ZXMubGVuZ3RoIDwgMSl7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBsYXN0U3RhdGUgPSBzdGF0ZXMucG9wKCk7XHJcbiAgICBsYXN0U3RhdGUub2JqZWN0W2xhc3RTdGF0ZS5rZXldID0gbGFzdFN0YXRlLnZhbHVlO1xyXG5cclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIEhpc3RvcnlFdmVudC5TVEFURV9QT1AsIG51bGwpKTtcclxufTtcclxuXHJcbkhpc3RvcnkucHJvdG90eXBlLmdldE51bVN0YXRlcyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLl9zdGF0ZXMubGVuZ3RoO1xyXG59O1xyXG5cclxuSGlzdG9yeS5faW5zdGFuY2UgPSBudWxsO1xyXG5cclxuSGlzdG9yeS5zZXR1cCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiBIaXN0b3J5Ll9pbnN0YW5jZSA9IG5ldyBIaXN0b3J5KCk7XHJcbn07XHJcblxyXG5IaXN0b3J5LmdldCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiBIaXN0b3J5Ll9pbnN0YW5jZTtcclxufTtcclxuXHJcbkhpc3RvcnkucHJvdG90eXBlLmVuYWJsZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuX2VuYWJsZWQgPSBmYWxzZTtcclxufTtcclxuSGlzdG9yeS5wcm90b3R5cGUuZGlzYWJsZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuX2VuYWJsZWQgPSB0cnVlO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBIaXN0b3J5OyIsInZhciBIaXN0b3J5RXZlbnQgPSB7XHJcblx0U1RBVEVfUFVTSDogJ2hpc3RvcnlTdGF0ZVB1c2gnLFxyXG5cdFNUQVRFX1BPUDogJ2hpc3RvcnlTdGF0ZVBvcCdcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gSGlzdG9yeUV2ZW50OyIsInZhciBIaXN0b3J5ID0gcmVxdWlyZSgnLi9IaXN0b3J5Jyk7XHJcbnZhciBDb21wb25lbnQgPSByZXF1aXJlKCcuL0NvbXBvbmVudCcpLFxyXG4gICAgQ29tcG9uZW50RXZlbnQgPSByZXF1aXJlKCcuL0NvbXBvbmVudEV2ZW50JyksXHJcbiAgICBPYmplY3RDb21wb25lbnROb3RpZmllciA9IHJlcXVpcmUoJy4vT2JqZWN0Q29tcG9uZW50Tm90aWZpZXInKSxcclxuICAgIENvbXBvbmVudE9iamVjdEVycm9yID0gcmVxdWlyZSgnLi9Db21wb25lbnRPYmplY3RFcnJvcicpO1xyXG52YXIgRXZlbnRfID0gcmVxdWlyZSgnLi9ldmVudC9FdmVudCcpO1xyXG5cclxuZnVuY3Rpb24gT2JqZWN0Q29tcG9uZW50KHBhcmVudCwgb2JqLCBrZXksIHBhcmFtcykge1xyXG4gICAgaWYgKG9ialtrZXldID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICB0aHJvdyBuZXcgQ29tcG9uZW50T2JqZWN0RXJyb3Iob2JqLCBrZXkpO1xyXG4gICAgfVxyXG4gICAgcGFyYW1zID0gcGFyYW1zIHx8IHt9O1xyXG4gICAgcGFyYW1zLmxhYmVsID0gcGFyYW1zLmxhYmVsIHx8IGtleTtcclxuXHJcbiAgICBDb21wb25lbnQuYXBwbHkodGhpcywgW3BhcmVudCwgcGFyYW1zLmxhYmVsXSk7XHJcblxyXG4gICAgdGhpcy5fb2JqID0gb2JqO1xyXG4gICAgdGhpcy5fa2V5ID0ga2V5O1xyXG4gICAgdGhpcy5fb25DaGFuZ2UgPSBmdW5jdGlvbigpe307XHJcblxyXG4gICAgT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIuZ2V0KCkuYWRkRXZlbnRMaXN0ZW5lcihDb21wb25lbnRFdmVudC5VUERBVEVfVkFMVUUsIHRoaXMsICdvblZhbHVlVXBkYXRlJyk7XHJcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCwgT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIuZ2V0KCksICdvblZhbHVlVXBkYXRlZCcpO1xyXG59XHJcbk9iamVjdENvbXBvbmVudC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKENvbXBvbmVudC5wcm90b3R5cGUpO1xyXG5PYmplY3RDb21wb25lbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gT2JqZWN0Q29tcG9uZW50O1xyXG5cclxuLy9PdmVycmlkZSBpbiBTdWJjbGFzc1xyXG5PYmplY3RDb21wb25lbnQucHJvdG90eXBlLmFwcGx5VmFsdWUgPSBmdW5jdGlvbigpIHt9O1xyXG5PYmplY3RDb21wb25lbnQucHJvdG90eXBlLm9uVmFsdWVVcGRhdGUgPSBmdW5jdGlvbiAoZSkge307XHJcblxyXG5PYmplY3RDb21wb25lbnQucHJvdG90eXBlLnB1c2hIaXN0b3J5U3RhdGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgb2JqID0gdGhpcy5fb2JqLCBrZXkgPSB0aGlzLl9rZXk7XHJcbiAgICBIaXN0b3J5LmdldCgpLnB1c2hTdGF0ZShvYmosIGtleSwgb2JqW2tleV0pO1xyXG59O1xyXG5cclxuT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZS5zZXRWYWx1ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgdGhpcy5fb2JqW3RoaXMuX2tleV0gPSB2YWx1ZTtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCxudWxsKSk7XHJcbn07XHJcblxyXG5PYmplY3RDb21wb25lbnQucHJvdG90eXBlLmdldERhdGEgPSBmdW5jdGlvbigpe1xyXG4gICAgdmFyIG9iaiA9IHt9O1xyXG4gICAgICAgIG9ialt0aGlzLl9rZXldID0gdGhpcy5fb2JqW3RoaXMuX2tleV07XHJcbiAgICByZXR1cm4gb2JqO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBPYmplY3RDb21wb25lbnQ7XHJcbiIsInZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKCcuL2V2ZW50L0V2ZW50RGlzcGF0Y2hlcicpLFxyXG5cdEV2ZW50XyBcdFx0XHQ9IHJlcXVpcmUoJy4vZXZlbnQvRXZlbnQnKTtcclxudmFyIENvbXBvbmVudEV2ZW50ICA9IHJlcXVpcmUoJy4vQ29tcG9uZW50RXZlbnQnKSxcclxuXHRPcHRpb25FdmVudFx0XHQ9IHJlcXVpcmUoJy4vT3B0aW9uRXZlbnQnKTtcclxuXHJcbmZ1bmN0aW9uIE9iamVjdENvbXBvbmVudE5vdGlmaWVyKCl7XHJcblx0RXZlbnREaXNwYXRjaGVyLmFwcGx5KHRoaXMpO1xyXG59XHJcbk9iamVjdENvbXBvbmVudE5vdGlmaWVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZSk7XHJcbk9iamVjdENvbXBvbmVudE5vdGlmaWVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IE9iamVjdENvbXBvbmVudE5vdGlmaWVyO1xyXG5cclxuT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIucHJvdG90eXBlLm9uVmFsdWVVcGRhdGVkID0gZnVuY3Rpb24gKGUpIHtcclxuXHR0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBDb21wb25lbnRFdmVudC5VUERBVEVfVkFMVUUsIHtvcmlnaW46IGUuc2VuZGVyfSkpO1xyXG59O1xyXG5cclxuT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIucHJvdG90eXBlLm9uT3B0aW9uVHJpZ2dlcmVkID0gZnVuY3Rpb24oZSkge1xyXG5cdHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIE9wdGlvbkV2ZW50LlRSSUdHRVIsIHtvcmlnaW46IGUuc2VuZGVyfSkpO1xyXG59O1xyXG5cclxudmFyIGluc3RhbmNlID0gbnVsbDtcclxuXHJcbk9iamVjdENvbXBvbmVudE5vdGlmaWVyLmdldCA9IGZ1bmN0aW9uKCl7XHJcblx0aWYoIWluc3RhbmNlKXtcclxuXHRcdGluc3RhbmNlID0gbmV3IE9iamVjdENvbXBvbmVudE5vdGlmaWVyKCk7XHJcblx0fVxyXG5cdHJldHVybiBpbnN0YW5jZTtcclxufTtcclxuXHJcbk9iamVjdENvbXBvbmVudE5vdGlmaWVyLmRlc3Ryb3kgPSBmdW5jdGlvbigpe1xyXG5cdGluc3RhbmNlID0gbnVsbDtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gT2JqZWN0Q29tcG9uZW50Tm90aWZpZXI7IiwidmFyIE9wdGlvbkV2ZW50ID0ge1xyXG5cdFRSSUdHRVJFRDogJ3NlbGVjdFRyaWdnZXInLFxyXG5cdFRSSUdHRVI6ICd0cmlnZ2VyU2VsZWN0J1xyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IE9wdGlvbkV2ZW50OyIsInZhciBEaWFsb2dUZW1wbGF0ZSA9XHJcbiAgICAnPGhlYWQ+XFxuJyArXHJcbiAgICAnICAgPHRpdGxlPkNvbnRyb2xLaXQgU3RhdGU8L3RpdGxlPlxcbicgK1xyXG4gICAgJyAgIDxzdHlsZSB0eXBlPVwidGV4dC9jc3NcIj5cXG4nICtcclxuICAgICcgICAgICBib2R5e1xcbicgK1xyXG4gICAgJyAgICAgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94O1xcbicgK1xyXG4gICAgJyAgICAgICAgICBwYWRkaW5nOiAyMHB4O1xcbicgK1xyXG4gICAgJyAgICAgICAgICBtYXJnaW46IDA7XFxuJyArXHJcbiAgICAnICAgICAgICAgIGZvbnQtZmFtaWx5OiBBcmlhbCwgc2Fucy1zZXJpZjtcXG4nICtcclxuICAgICcgICAgICAgICAgd2lkdGg6IDEwMCU7XFxuJyArXHJcbiAgICAnICAgICAgfVxcbicgK1xyXG4gICAgJyAgICAgIHRleHRhcmVhe1xcbicgK1xyXG4gICAgJyAgICAgICAgICBtYXJnaW4tYm90dG9tOjEwcHg7XFxuJyArXHJcbiAgICAnICAgICAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XFxuJyArXHJcbiAgICAnICAgICAgICAgIHBhZGRpbmc6IDA7XFxuJyArXHJcbiAgICAnICAgICAgICAgIGJvcmRlcjogMDtcXG4nICtcclxuICAgICcgICAgICAgICAgYm9yZGVyOiAxcHggc29saWQgI2RlZGVkZTtcXG4nICtcclxuICAgICcgICAgICAgICAgb3V0bGluZTogbm9uZTtcXG4nICtcclxuICAgICcgICAgICAgICAgZm9udC1mYW1pbHk6IE1vbmFjbywgbW9ub3NwYWNlO1xcbicgK1xyXG4gICAgJyAgICAgICAgICBmb250LXNpemU6IDExcHg7XFxuJyArXHJcbiAgICAnICAgICAgICAgIHJlc2l6ZTogbm9uZTtcXG4nICtcclxuICAgICcgICAgICAgICAgd29yZC13cmFwOiBicmVhay13b3JkO1xcbicgK1xyXG4gICAgJyAgICAgICAgICBkaXNwbGF5OiBibG9jaztcXG4nICtcclxuICAgICcgICAgICAgICAgd2lkdGg6IDEwMCU7XFxuJyArXHJcbiAgICAnICAgICAgICAgIG92ZXJmbG93LXk6IHNjcm9sbDtcXG4nICtcclxuICAgICcgICAgICAgICAgaGVpZ2h0OiAxMjVweDtcXG4nICtcclxuICAgICcgICAgICB9XFxuJyArXHJcbiAgICAnICAgICAgYnV0dG9ue1xcbicgK1xyXG4gICAgJyAgICAgICAgICBtYXJnaW46IDA7XFxuJyArXHJcbiAgICAnICAgICAgICAgIHBhZGRpbmc6IDAgNXB4IDNweCA1cHg7XFxuJyArXHJcbiAgICAnICAgICAgICAgIGhlaWdodDogMjBweDtcXG4nICtcclxuICAgICcgICAgICB9XFxuJytcclxuICAgICcgICAgICAjc2F2ZSwjZmlsZW5hbWUsI2xvYWR7XFxuJyArXHJcbiAgICAnICAgICAgICAgIGZsb2F0OiByaWdodDtcXG4nICtcclxuICAgICcgICAgICB9XFxuJyArXHJcbiAgICAnICAgICAgaW5wdXRbdHlwZT1cInRleHRcIl17XFxuJyArXHJcbiAgICAnICAgICAgICAgIG1hcmdpbjogMDtcXG4nICtcclxuICAgICcgICAgICAgICAgcGFkZGluZzogMDtcXG4nICtcclxuICAgICcgICAgICAgICAgd2lkdGg6IDQ1JTtcXG4nICtcclxuICAgICcgICAgICAgICAgaGVpZ2h0OjIwcHg7XFxuJyArXHJcbiAgICAnICAgICAgfVxcbicrXHJcbiAgICAnICAgPC9zdHlsZT5cXG4nICtcclxuICAgICc8L2hlYWQ+XFxuJyArXHJcbiAgICAnPGJvZHk+XFxuJyArXHJcbiAgICAnICAgPHRleHRhcmVhIG5hbWU9XCJzdGF0ZVwiIGlkPVwic3RhdGVcIj48L3RleHRhcmVhPlxcbicgK1xyXG4gICAgJzwvYm9keT4nO1xyXG5cclxudmFyIFNhdmVEaWFsb2dUZW1wbGF0ZSA9XHJcbiAgICAnPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgaWQ9XCJzYXZlXCI+U2F2ZTwvYnV0dG9uPlxcbicgK1xyXG4gICAgJzxpbnB1dCB0eXBlPVwidGV4dFwiIGlkPVwiZmlsZW5hbWVcIiB2YWx1ZT1cImNrLXN0YXRlLmpzb25cIj48L2lucHV0Pic7XHJcblxyXG52YXIgTG9hZERpYWxvZ1RlbXBsYXRlID1cclxuICAgICc8aW5wdXQgdHlwZT1cImZpbGVcIiBpZD1cImxvYWQtZGlza1wiPjwvYnV0dG9uPicgK1xyXG4gICAgJzxidXR0b24gdHlwZT1cImJ1dHRvblwiIGlkPVwibG9hZFwiPkxvYWQ8L2J1dHRvbj4nO1xyXG5cclxuZnVuY3Rpb24gY3JlYXRlV2luZG93KCl7XHJcbiAgICB2YXIgd2lkdGggPSAzMjAsIGhlaWdodCA9IDIwMDtcclxuICAgIHZhciB3aW5kb3dfID0gd2luZG93Lm9wZW4oJycsJycsJ1xcXHJcbiAgICAgICAgd2lkdGg9JyArIHdpZHRoICsgJyxcXFxyXG4gICAgICAgIGhlaWdodD0nICsgaGVpZ2h0ICsgJyxcXFxyXG4gICAgICAgIGxlZnQ9JyArICh3aW5kb3cuc2NyZWVuWCArIHdpbmRvdy5pbm5lcldpZHRoICogMC41IC0gd2lkdGggKiAwLjUpICsgJyxcXFxyXG4gICAgICAgIHRvcD0nICsgKHdpbmRvdy5zY3JlZW5ZICsgd2luZG93LmlubmVySGVpZ2h0ICogMC41IC0gaGVpZ2h0ICogMC41KSArICcsXFxcclxuICAgICAgICBsb2NhdGlvbj0wLFxcXHJcbiAgICAgICAgdGl0bGViYXI9MCxcXFxyXG4gICAgICAgIHJlc2l6YWJsZT0wJyk7XHJcbiAgICB3aW5kb3dfLmRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5pbm5lckhUTUwgPSBEaWFsb2dUZW1wbGF0ZTtcclxuICAgIHJldHVybiB3aW5kb3dfO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzYXZlKGRhdGEpe1xyXG4gICAgdmFyIHdpbmRvd18gPSBjcmVhdGVXaW5kb3coKTtcclxuICAgIHZhciBkb2N1bWVudF8gPSB3aW5kb3dfLmRvY3VtZW50O1xyXG4gICAgICAgIGRvY3VtZW50Xy5ib2R5LmlubmVySFRNTCArPSBTYXZlRGlhbG9nVGVtcGxhdGU7XHJcbiAgICAgICAgZG9jdW1lbnRfLmdldEVsZW1lbnRCeUlkKCdzYXZlJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgIC8vbG9nICYgc2F2ZSBpbiBtYWluIHdpbmRvd1xyXG4gICAgICAgICAgICB2YXIgc3RyICA9IGRvY3VtZW50Xy5nZXRFbGVtZW50QnlJZCgnc3RhdGUnKS52YWx1ZSxcclxuICAgICAgICAgICAgICAgIGJsb2IgPSBuZXcgQmxvYihbc3RyXSx7dHlwZTonYXBwbGljYXRpb246anNvbid9KSxcclxuICAgICAgICAgICAgICAgIG5hbWUgPSBkb2N1bWVudF8uZ2V0RWxlbWVudEJ5SWQoJ2ZpbGVuYW1lJykudmFsdWU7XHJcbiAgICAgICAgICAgIHZhciBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xyXG4gICAgICAgICAgICBhLmRvd25sb2FkID0gbmFtZTtcclxuICAgICAgICAgICAgaWYod2luZG93LndlYmtpdFVSTCl7XHJcbiAgICAgICAgICAgICAgICBhLmhyZWYgPSB3aW5kb3cud2Via2l0VVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGEuaHJlZiA9IHdpbmRvdy5jcmVhdGVPYmplY3RVUkwoYmxvYik7XHJcbiAgICAgICAgICAgICAgICBhLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcbiAgICAgICAgICAgICAgICBhLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50Xy5ib2R5LnJlbW92ZUNoaWxkKGEpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudF8uYm9keS5hcHBlbmRDaGlsZChhKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBhLmNsaWNrKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICBkb2N1bWVudF8uZ2V0RWxlbWVudEJ5SWQoJ3N0YXRlJykuaW5uZXJUZXh0ID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxvYWQoY2FsbGJhY2spe1xyXG4gICAgdmFyIHdpbmRvd18gPSBjcmVhdGVXaW5kb3coKTtcclxuICAgIHZhciBkb2N1bWVudF8gPSB3aW5kb3dfLmRvY3VtZW50O1xyXG4gICAgICAgIGRvY3VtZW50Xy5ib2R5LmlubmVySFRNTCArPSBMb2FkRGlhbG9nVGVtcGxhdGU7XHJcbiAgICB2YXIgaW5wdXQgICA9IGRvY3VtZW50Xy5nZXRFbGVtZW50QnlJZCgnc3RhdGUnKTtcclxuICAgIHZhciBidG5Mb2FkID0gZG9jdW1lbnRfLmdldEVsZW1lbnRCeUlkKCdsb2FkJyk7XHJcbiAgICAgICAgYnRuTG9hZC5kaXNhYmxlZCA9IHRydWU7XHJcblxyXG4gICAgZnVuY3Rpb24gdmFsaWRhdGVJbnB1dCgpe1xyXG4gICAgICAgIHRyeXtcclxuICAgICAgICAgICAgdmFyIG9iaiA9IEpTT04ucGFyc2UoaW5wdXQudmFsdWUpO1xyXG4gICAgICAgICAgICBpZihvYmogJiYgdHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgb2JqICE9PSBudWxsKXtcclxuICAgICAgICAgICAgICAgIGJ0bkxvYWQuZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gY2F0Y2ggKGUpe1xyXG4gICAgICAgICAgICBidG5Mb2FkLmRpc2FibGVkID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgdmFsaWRhdGVJbnB1dCgpO1xyXG4gICAgfSk7XHJcbiAgICBkb2N1bWVudF8uZ2V0RWxlbWVudEJ5SWQoJ2xvYWQnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsZnVuY3Rpb24oKXtcclxuICAgICAgICB2YXIgc3RyID0gaW5wdXQudmFsdWU7XHJcbiAgICAgICAgY2FsbGJhY2soSlNPTi5wYXJzZShzdHIpLmRhdGEpO1xyXG4gICAgICAgIHdpbmRvd18uY2xvc2UoKTtcclxuICAgIH0pO1xyXG4gICAgdmFyIGxvYWRGcm9tRGlzayA9IGRvY3VtZW50Xy5nZXRFbGVtZW50QnlJZCgnbG9hZC1kaXNrJyk7XHJcbiAgICAgICAgbG9hZEZyb21EaXNrLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XHJcbiAgICAgICAgICAgIHJlYWRlci5hZGRFdmVudExpc3RlbmVyKCdsb2FkZW5kJyxmdW5jdGlvbihlKXtcclxuICAgICAgICAgICAgICAgIGlucHV0LnZhbHVlID0gZS50YXJnZXQucmVzdWx0O1xyXG4gICAgICAgICAgICAgICAgdmFsaWRhdGVJbnB1dCgpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgcmVhZGVyLnJlYWRBc1RleHQobG9hZEZyb21EaXNrLmZpbGVzWzBdLCd1dGYtOCcpO1xyXG4gICAgICAgIH0pO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICAgIGxvYWQgOiBsb2FkLFxyXG4gICAgc2F2ZSA6IHNhdmVcclxufTsiLCJmdW5jdGlvbiBDb2xvckZvcm1hdEVycm9yKG1zZykge1xyXG5cdEVycm9yLmFwcGx5KHRoaXMpO1xyXG5cdEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsQ29sb3JGb3JtYXRFcnJvcik7XHJcblx0dGhpcy5uYW1lID0gJ0NvbG9yRm9ybWF0RXJyb3InO1xyXG5cdHRoaXMubWVzc2FnZSA9IG1zZztcclxufVxyXG5Db2xvckZvcm1hdEVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcclxuQ29sb3JGb3JtYXRFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBDb2xvckZvcm1hdEVycm9yO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDb2xvckZvcm1hdEVycm9yOyIsInZhciBDb2xvck1vZGUgPSB7XHJcblx0UkdCICA6ICdyZ2InLFxyXG5cdEhTViAgOiAnaHN2JyxcclxuXHRIRVggIDogJ2hleCcsXHJcblx0UkdCZnY6ICdyZ2JmdidcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ29sb3JNb2RlOyIsInZhciBDb2xvclV0aWwgPSB7XHJcblx0SFNWMlJHQjogZnVuY3Rpb24gKGh1ZSwgc2F0LCB2YWwpIHtcclxuXHRcdHZhciBtYXhfaHVlID0gMzYwLjAsXHJcblx0XHRcdG1heF9zYXQgPSAxMDAuMCxcclxuXHRcdFx0bWF4X3ZhbCA9IDEwMC4wO1xyXG5cclxuXHRcdHZhciBtaW5faHVlID0gMC4wLFxyXG5cdFx0XHRtaW5fc2F0ID0gMCxcclxuXHRcdFx0bWluX3ZhbCA9IDA7XHJcblxyXG5cdFx0aHVlID0gaHVlICUgbWF4X2h1ZTtcclxuXHRcdHZhbCA9IE1hdGgubWF4KG1pbl92YWwsIE1hdGgubWluKHZhbCwgbWF4X3ZhbCkpIC8gbWF4X3ZhbCAqIDI1NS4wO1xyXG5cclxuXHRcdGlmIChzYXQgPD0gbWluX3NhdCkge1xyXG5cdFx0XHR2YWwgPSBNYXRoLnJvdW5kKHZhbCk7XHJcblx0XHRcdHJldHVybiBbdmFsLCB2YWwsIHZhbF07XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmIChzYXQgPiBtYXhfc2F0KXNhdCA9IG1heF9zYXQ7XHJcblxyXG5cdFx0c2F0ID0gc2F0IC8gbWF4X3NhdDtcclxuXHJcblx0XHQvL2h0dHA6Ly9kLmhhdGVuYS5uZS5qcC9qYTkvMjAxMDA5MDMvMTI4MzUwNDM0XHJcblxyXG5cdFx0dmFyIGhpID0gTWF0aC5mbG9vcihodWUgLyA2MC4wKSAlIDYsXHJcblx0XHRcdGYgPSAoaHVlIC8gNjAuMCkgLSBoaSxcclxuXHRcdFx0cCA9IHZhbCAqICgxIC0gc2F0KSxcclxuXHRcdFx0cSA9IHZhbCAqICgxIC0gZiAqIHNhdCksXHJcblx0XHRcdHQgPSB2YWwgKiAoMSAtICgxIC0gZikgKiBzYXQpO1xyXG5cclxuXHRcdHZhciByID0gMCxcclxuXHRcdFx0ZyA9IDAsXHJcblx0XHRcdGIgPSAwO1xyXG5cclxuXHRcdHN3aXRjaCAoaGkpIHtcclxuXHRcdFx0Y2FzZSAwOlxyXG5cdFx0XHRcdHIgPSB2YWw7XHJcblx0XHRcdFx0ZyA9IHQ7XHJcblx0XHRcdFx0YiA9IHA7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgMTpcclxuXHRcdFx0XHRyID0gcTtcclxuXHRcdFx0XHRnID0gdmFsO1xyXG5cdFx0XHRcdGIgPSBwO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIDI6XHJcblx0XHRcdFx0ciA9IHA7XHJcblx0XHRcdFx0ZyA9IHZhbDtcclxuXHRcdFx0XHRiID0gdDtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSAzOlxyXG5cdFx0XHRcdHIgPSBwO1xyXG5cdFx0XHRcdGcgPSBxO1xyXG5cdFx0XHRcdGIgPSB2YWw7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgNDpcclxuXHRcdFx0XHRyID0gdDtcclxuXHRcdFx0XHRnID0gcDtcclxuXHRcdFx0XHRiID0gdmFsO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIDU6XHJcblx0XHRcdFx0ciA9IHZhbDtcclxuXHRcdFx0XHRnID0gcDtcclxuXHRcdFx0XHRiID0gcTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdH1cclxuXHJcblx0XHRyID0gTWF0aC5yb3VuZChyKTtcclxuXHRcdGcgPSBNYXRoLnJvdW5kKGcpO1xyXG5cdFx0YiA9IE1hdGgucm91bmQoYik7XHJcblxyXG5cdFx0cmV0dXJuIFtyLCBnLCBiXTtcclxuXHJcblx0fSxcclxuXHJcblx0UkdCMkhTVjogZnVuY3Rpb24gKHIsIGcsIGIpIHtcclxuXHRcdHZhciBoID0gMCxcclxuXHRcdFx0cyA9IDAsXHJcblx0XHRcdHYgPSAwO1xyXG5cclxuXHRcdHIgPSByIC8gMjU1LjA7XHJcblx0XHRnID0gZyAvIDI1NS4wO1xyXG5cdFx0YiA9IGIgLyAyNTUuMDtcclxuXHJcblx0XHR2YXIgbWluUkdCID0gTWF0aC5taW4ociwgTWF0aC5taW4oZywgYikpLFxyXG5cdFx0XHRtYXhSR0IgPSBNYXRoLm1heChyLCBNYXRoLm1heChnLCBiKSk7XHJcblxyXG5cdFx0aWYgKG1pblJHQiA9PSBtYXhSR0IpIHtcclxuXHRcdFx0diA9IG1pblJHQjtcclxuXHRcdFx0cmV0dXJuIFswLCAwLCBNYXRoLnJvdW5kKHYpXTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgZGQgPSAociA9PSBtaW5SR0IpID8gZyAtIGIgOiAoKGIgPT0gbWluUkdCKSA/IHIgLSBnIDogYiAtIHIpLFxyXG5cdFx0XHRoaCA9IChyID09IG1pblJHQikgPyAzIDogKChiID09IG1pblJHQikgPyAxIDogNSk7XHJcblxyXG5cdFx0aCA9IE1hdGgucm91bmQoNjAgKiAoaGggLSBkZCAvIChtYXhSR0IgLSBtaW5SR0IpKSk7XHJcblx0XHRzID0gTWF0aC5yb3VuZCgobWF4UkdCIC0gbWluUkdCKSAvIG1heFJHQiAqIDEwMC4wKTtcclxuXHRcdHYgPSBNYXRoLnJvdW5kKG1heFJHQiAqIDEwMC4wKTtcclxuXHJcblx0XHRyZXR1cm4gW2gsIHMsIHZdO1xyXG5cdH0sXHJcblxyXG5cdFJHQjJIRVg6IGZ1bmN0aW9uIChyLCBnLCBiKSB7XHJcblx0XHRyZXR1cm4gXCIjXCIgKyAoKDEgPDwgMjQpICsgKHIgPDwgMTYpICsgKGcgPDwgOCkgKyBiKS50b1N0cmluZygxNikuc2xpY2UoMSk7XHJcblx0fSxcclxuXHJcblx0UkdCZnYySEVYOiBmdW5jdGlvbiAociwgZywgYikge1xyXG5cdFx0cmV0dXJuIENvbG9yVXRpbC5SR0IySEVYKE1hdGguZmxvb3IociAqIDI1NS4wKSxcclxuXHRcdFx0TWF0aC5mbG9vcihnICogMjU1LjApLFxyXG5cdFx0XHRNYXRoLmZsb29yKGIgKiAyNTUuMCkpO1xyXG5cdH0sXHJcblxyXG5cdEhTVjJIRVg6IGZ1bmN0aW9uIChoLCBzLCB2KSB7XHJcblx0XHR2YXIgcmdiID0gQ29udHJvbEtpdC5Db2xvclV0aWwuSFNWMlJHQihoLCBzLCB2KTtcclxuXHRcdHJldHVybiBDb250cm9sS2l0LkNvbG9yVXRpbC5SR0IySEVYKHJnYlswXSwgcmdiWzFdLCByZ2JbMl0pO1xyXG5cdH0sXHJcblxyXG5cdEhFWDJSR0I6IGZ1bmN0aW9uIChoZXgpIHtcclxuXHRcdHZhciBzaG9ydGhhbmRSZWdleCA9IC9eIz8oW2EtZlxcZF0pKFthLWZcXGRdKShbYS1mXFxkXSkkL2k7XHJcblx0XHRoZXggPSBoZXgucmVwbGFjZShzaG9ydGhhbmRSZWdleCwgZnVuY3Rpb24gKG0sIHIsIGcsIGIpIHtcclxuXHRcdFx0cmV0dXJuIHIgKyByICsgZyArIGcgKyBiICsgYjtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHZhciByZXN1bHQgPSAvXiM/KFthLWZcXGRdezJ9KShbYS1mXFxkXXsyfSkoW2EtZlxcZF17Mn0pJC9pLmV4ZWMoaGV4KTtcclxuXHRcdHJldHVybiByZXN1bHQgPyBbcGFyc2VJbnQocmVzdWx0WzFdLCAxNiksIHBhcnNlSW50KHJlc3VsdFsyXSwgMTYpLCBwYXJzZUludChyZXN1bHRbM10sIDE2KV0gOiBudWxsO1xyXG5cclxuXHR9LFxyXG5cclxuXHRpc1ZhbGlkSEVYOiBmdW5jdGlvbiAoaGV4KSB7XHJcblx0XHRyZXR1cm4gL14jWzAtOUEtRl17Nn0kL2kudGVzdChoZXgpO1xyXG5cdH0sXHJcblxyXG5cdGlzVmFsaWRSR0I6IGZ1bmN0aW9uIChyLCBnLCBiKSB7XHJcblx0XHRyZXR1cm4gciA+PSAwICYmIHIgPD0gMjU1ICYmXHJcblx0XHRcdGcgPj0gMCAmJiBnIDw9IDI1NSAmJlxyXG5cdFx0XHRiID49IDAgJiYgYiA8PSAyNTU7XHJcblx0fSxcclxuXHJcblx0aXNWYWxpZFJHQmZ2OiBmdW5jdGlvbiAociwgZywgYikge1xyXG5cdFx0cmV0dXJuIHIgPj0gMCAmJiByIDw9IDEuMCAmJlxyXG5cdFx0XHRnID49IDAgJiYgZyA8PSAxLjAgJiZcclxuXHRcdFx0YiA+PSAwICYmIGIgPD0gMS4wO1xyXG5cdH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ29sb3JVdGlsOyIsInZhciBDU1MgPSB7XHJcbiAgICBDb250cm9sS2l0OiAnY29udHJvbEtpdCcsXHJcblxyXG4gICAgUGFuZWw6ICdwYW5lbCcsXHJcbiAgICBIZWFkOiAnaGVhZCcsXHJcbiAgICBMYWJlbDogJ2xhYmVsJyxcclxuICAgIE1lbnU6ICdtZW51JyxcclxuICAgIFdyYXA6ICd3cmFwJyxcclxuXHJcbiAgICBCdXR0b25NZW51Q2xvc2U6ICdidXR0b24tbWVudS1jbG9zZScsXHJcbiAgICBCdXR0b25NZW51SGlkZTogJ2J1dHRvbi1tZW51LWhpZGUnLFxyXG4gICAgQnV0dG9uTWVudVNob3c6ICdidXR0b24tbWVudS1zaG93JyxcclxuICAgIEJ1dHRvbk1lbnVVbmRvOiAnYnV0dG9uLW1lbnUtdW5kbycsXHJcbiAgICBCdXR0b25NZW51TG9hZDogJ2J1dHRvbi1tZW51LWxvYWQnLFxyXG4gICAgQnV0dG9uTWVudVNhdmU6ICdidXR0b24tbWVudS1zYXZlJyxcclxuICAgIE1lbnVBY3RpdmU6ICdtZW51LWFjdGl2ZScsXHJcblxyXG4gICAgQnV0dG9uOiAnYnV0dG9uJyxcclxuICAgIEJ1dHRvblByZXNldDogJ2J1dHRvbi1wcmVzZXQnLFxyXG4gICAgQnV0dG9uUHJlc2V0QWN0aXZlOiAnYnV0dG9uLXByZXNldC1hY3RpdmUnLFxyXG5cclxuICAgIFdyYXBJbnB1dFdQcmVzZXQ6ICdpbnB1dC13aXRoLXByZXNldC13cmFwJyxcclxuICAgIFdyYXBDb2xvcldQcmVzZXQ6ICdjb2xvci13aXRoLXByZXNldC13cmFwJyxcclxuXHJcbiAgICBIZWFkSW5hY3RpdmU6ICdoZWFkLWluYWN0aXZlJyxcclxuICAgIFBhbmVsSGVhZEluYWN0aXZlOiAncGFuZWwtaGVhZC1pbmFjdGl2ZScsXHJcblxyXG4gICAgR3JvdXBMaXN0OiAnZ3JvdXAtbGlzdCcsXHJcbiAgICBHcm91cDogJ2dyb3VwJyxcclxuICAgIFN1Ykdyb3VwTGlzdDogJ3N1Yi1ncm91cC1saXN0JyxcclxuICAgIFN1Ykdyb3VwOiAnc3ViLWdyb3VwJyxcclxuXHJcblxyXG4gICAgVGV4dEFyZWFXcmFwOiAndGV4dGFyZWEtd3JhcCcsXHJcblxyXG4gICAgV3JhcFNsaWRlcjogJ3dyYXAtc2xpZGVyJyxcclxuICAgIFNsaWRlcldyYXA6ICdzbGlkZXItd3JhcCcsXHJcbiAgICBTbGlkZXJTbG90OiAnc2xpZGVyLXNsb3QnLFxyXG4gICAgU2xpZGVySGFuZGxlOiAnc2xpZGVyLWhhbmRsZScsXHJcblxyXG4gICAgQXJyb3dCTWluOiAnYXJyb3ctYi1taW4nLFxyXG4gICAgQXJyb3dCTWF4OiAnYXJyb3ctYi1tYXgnLFxyXG4gICAgQXJyb3dCU3ViTWluOiAnYXJyb3ctYi1zdWItbWluJyxcclxuICAgIEFycm93QlN1Yk1heDogJ2Fycm93LWItc3ViLW1heCcsXHJcbiAgICBBcnJvd1NNaW46ICdhcnJvdy1zLW1pbicsXHJcbiAgICBBcnJvd1NNYXg6ICdhcnJvdy1zLW1heCcsXHJcblxyXG4gICAgU2VsZWN0OiAnc2VsZWN0JyxcclxuICAgIFNlbGVjdEFjdGl2ZTogJ3NlbGVjdC1hY3RpdmUnLFxyXG5cclxuICAgIE9wdGlvbnM6ICdvcHRpb25zJyxcclxuICAgIE9wdGlvbnNTZWxlY3RlZDogJ2xpLXNlbGVjdGVkJyxcclxuXHJcbiAgICBDYW52YXNMaXN0SXRlbTogJ2NhbnZhcy1saXN0LWl0ZW0nLFxyXG4gICAgQ2FudmFzV3JhcDogJ2NhbnZhcy13cmFwJyxcclxuXHJcbiAgICBTVkdMaXN0SXRlbTogJ3N2Zy1saXN0LWl0ZW0nLFxyXG4gICAgU1ZHV3JhcDogJ3N2Zy13cmFwJyxcclxuXHJcbiAgICBHcmFwaFNsaWRlclhXcmFwOiAnZ3JhcGgtc2xpZGVyLXgtd3JhcCcsXHJcbiAgICBHcmFwaFNsaWRlcllXcmFwOiAnZ3JhcGgtc2xpZGVyLXktd3JhcCcsXHJcbiAgICBHcmFwaFNsaWRlclg6ICdncmFwaC1zbGlkZXIteCcsXHJcbiAgICBHcmFwaFNsaWRlclk6ICdncmFwaC1zbGlkZXIteScsXHJcbiAgICBHcmFwaFNsaWRlclhIYW5kbGU6ICdncmFwaC1zbGlkZXIteC1oYW5kbGUnLFxyXG4gICAgR3JhcGhTbGlkZXJZSGFuZGxlOiAnZ3JhcGgtc2xpZGVyLXktaGFuZGxlJyxcclxuXHJcbiAgICBQaWNrZXI6ICdwaWNrZXInLFxyXG4gICAgUGlja2VyRmllbGRXcmFwOiAnZmllbGQtd3JhcCcsXHJcbiAgICBQaWNrZXJJbnB1dFdyYXA6ICdpbnB1dC13cmFwJyxcclxuICAgIFBpY2tlcklucHV0RmllbGQ6ICdpbnB1dC1maWVsZCcsXHJcbiAgICBQaWNrZXJDb250cm9sc1dyYXA6ICdjb250cm9scy13cmFwJyxcclxuICAgIFBpY2tlckNvbG9yQ29udHJhc3Q6ICdjb2xvci1jb250cmFzdCcsXHJcbiAgICBQaWNrZXJIYW5kbGVGaWVsZDogJ2luZGljYXRvcicsXHJcbiAgICBQaWNrZXJIYW5kbGVTbGlkZXI6ICdpbmRpY2F0b3InLFxyXG5cclxuICAgIENvbG9yOiAnY29sb3InLFxyXG5cclxuICAgIFNjcm9sbEJhcjogJ3Njcm9sbEJhcicsXHJcbiAgICBTY3JvbGxXcmFwOiAnc2Nyb2xsLXdyYXAnLFxyXG4gICAgU2Nyb2xsQmFyQnRuVXA6ICdidG5VcCcsXHJcbiAgICBTY3JvbGxCYXJCdG5Eb3duOiAnYnRuRG93bicsXHJcbiAgICBTY3JvbGxCYXJUcmFjazogJ3RyYWNrJyxcclxuICAgIFNjcm9sbEJhclRodW1iOiAndGh1bWInLFxyXG4gICAgU2Nyb2xsQnVmZmVyOiAnc2Nyb2xsLWJ1ZmZlcicsXHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENTUztcclxuIiwidmFyIERvY3VtZW50RXZlbnQgPSB7XHJcbiAgICBNT1VTRV9NT1ZFOiAnbW91c2Vtb3ZlJyxcclxuICAgIE1PVVNFX1VQOiAnbW91c2V1cCcsXHJcbiAgICBNT1VTRV9ET1dOOiAnbW91c2Vkb3duJyxcclxuICAgIE1PVVNFX1dIRUVMOiAnbW91c2V3aGVlbCcsXHJcbiAgICBXSU5ET1dfUkVTSVpFOiAncmVzaXplJ1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBEb2N1bWVudEV2ZW50OyIsInZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKCcuLi9ldmVudC9FdmVudERpc3BhdGNoZXInKSxcclxuICAgIEV2ZW50XyA9IHJlcXVpcmUoJy4uL2V2ZW50L0V2ZW50JyksXHJcbiAgICBEb2N1bWVudEV2ZW50ID0gcmVxdWlyZSgnLi9Eb2N1bWVudEV2ZW50Jyk7XHJcbnZhciBpbnN0YW5jZSA9IG51bGw7XHJcblxyXG5mdW5jdGlvbiBNb3VzZSgpIHtcclxuICAgIEV2ZW50RGlzcGF0Y2hlci5hcHBseSh0aGlzKTtcclxuICAgIHRoaXMuX3BvcyA9IFswLDBdO1xyXG4gICAgdGhpcy5fd2hlZWxEaXJlY3Rpb24gPSAwO1xyXG4gICAgdGhpcy5faG92ZXJFbGVtZW50ID0gbnVsbDtcclxuXHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICB0aGlzLl9vbkRvY3VtZW50TW91c2VNb3ZlID0gZnVuY3Rpb24oZSl7XHJcbiAgICAgICAgdmFyIGR4ID0gMCxcclxuICAgICAgICAgICAgZHkgPSAwO1xyXG5cclxuICAgICAgICBpZiAoIWUpZSA9IHdpbmRvdy5ldmVudDtcclxuICAgICAgICBpZiAoZS5wYWdlWCkge1xyXG4gICAgICAgICAgICBkeCA9IGUucGFnZVg7XHJcbiAgICAgICAgICAgIGR5ID0gZS5wYWdlWTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoZS5jbGllbnRYKSB7XHJcbiAgICAgICAgICAgIGR4ID0gZS5jbGllbnRYICsgZG9jdW1lbnQuYm9keS5zY3JvbGxMZWZ0ICsgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbExlZnQ7XHJcbiAgICAgICAgICAgIGR5ID0gZS5jbGllbnRZICsgZG9jdW1lbnQuYm9keS5zY3JvbGxUb3AgKyBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wO1xyXG4gICAgICAgIH1cclxuICAgICAgICBzZWxmLl9wb3NbMF0gPSBkeDtcclxuICAgICAgICBzZWxmLl9wb3NbMV0gPSBkeTtcclxuXHJcbiAgICAgICAgc2VsZi5faG92ZXJFbGVtZW50ID0gZG9jdW1lbnQuZWxlbWVudEZyb21Qb2ludChkeCxkeSk7XHJcbiAgICB9O1xyXG5cclxuICAgIHRoaXMuX29uRG9jdW1lbnRNb3VzZVdoZWVsID0gZnVuY3Rpb24oZXZlbnQpe1xyXG4gICAgICAgIHNlbGYuX3doZWVsRGlyZWN0aW9uID0gKGV2ZW50LmRldGFpbCA8IDApID8gMSA6IChldmVudC53aGVlbERlbHRhID4gMCkgPyAxIDogLTE7XHJcbiAgICAgICAgc2VsZi5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8oc2VsZixEb2N1bWVudEV2ZW50Lk1PVVNFX1dIRUVMLGV2ZW50KSk7XHJcbiAgICB9O1xyXG5cclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLCB0aGlzLl9vbkRvY3VtZW50TW91c2VNb3ZlKTtcclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9XSEVFTCx0aGlzLl9vbkRvY3VtZW50TW91c2VXaGVlbCk7XHJcbn1cclxuTW91c2UucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudERpc3BhdGNoZXIucHJvdG90eXBlKTtcclxuTW91c2UucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gTW91c2U7XHJcblxyXG5Nb3VzZS5wcm90b3R5cGUuX3JlbW92ZURvY3VtZW50TGlzdGVuZXIgPSBmdW5jdGlvbigpe1xyXG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsIHRoaXMuX29uRG9jdW1lbnRNb3VzZU1vdmUpO1xyXG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX1dIRUVMLHRoaXMuX29uRG9jdW1lbnRNb3VzZVdoZWVsKTtcclxufTtcclxuXHJcbk1vdXNlLnByb3RvdHlwZS5nZXRQb3NpdGlvbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLl9wb3M7XHJcbn07XHJcblxyXG5Nb3VzZS5wcm90b3R5cGUuZ2V0WCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLl9wb3NbMF07XHJcbn07XHJcblxyXG5Nb3VzZS5wcm90b3R5cGUuZ2V0WSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLl9wb3NbMV07XHJcbn07XHJcblxyXG5Nb3VzZS5wcm90b3R5cGUuZ2V0V2hlZWxEaXJlY3Rpb24gPSBmdW5jdGlvbigpe1xyXG4gICAgcmV0dXJuIHRoaXMuX3doZWVsRGlyZWN0aW9uO1xyXG59O1xyXG5cclxuTW91c2UucHJvdG90eXBlLmdldEhvdmVyRWxlbWVudCA9IGZ1bmN0aW9uKCl7XHJcbiAgICByZXR1cm4gdGhpcy5faG92ZXJFbGVtZW50O1xyXG59O1xyXG5cclxuTW91c2Uuc2V0dXAgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBpbnN0YW5jZSA9IGluc3RhbmNlIHx8IG5ldyBNb3VzZSgpO1xyXG4gICAgcmV0dXJuIGluc3RhbmNlO1xyXG59O1xyXG5cclxuTW91c2UuZ2V0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIGluc3RhbmNlO1xyXG59O1xyXG5cclxuTW91c2UuZGVzdHJveSA9IGZ1bmN0aW9uKCl7XHJcbiAgICBpbnN0YW5jZS5fcmVtb3ZlRG9jdW1lbnRMaXN0ZW5lcigpO1xyXG4gICAgaW5zdGFuY2UgPSBudWxsO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNb3VzZTsiLCJmdW5jdGlvbiBOb2RlKCkge1xyXG4gICAgdGhpcy5fZWxlbWVudCA9IG51bGw7XHJcblxyXG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKXtcclxuICAgICAgICBjYXNlIDEgOlxyXG4gICAgICAgICAgICB2YXIgYXJnID0gYXJndW1lbnRzWzBdO1xyXG4gICAgICAgICAgICBpZiAoYXJnICE9IE5vZGUuSU5QVVRfVEVYVCAmJlxyXG4gICAgICAgICAgICAgICAgYXJnICE9IE5vZGUuSU5QVVRfQlVUVE9OICYmXHJcbiAgICAgICAgICAgICAgICBhcmcgIT0gTm9kZS5JTlBVVF9TRUxFQ1QgJiZcclxuICAgICAgICAgICAgICAgIGFyZyAhPSBOb2RlLklOUFVUX0NIRUNLQk9YKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9lbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChhcmcpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9lbGVtZW50LnR5cGUgPSBhcmc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAwOlxyXG4gICAgICAgICAgICB0aGlzLl9lbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG59XHJcblxyXG5Ob2RlLkRJViAgICAgICAgICAgID0gJ2Rpdic7XHJcbk5vZGUuSU5QVVRfVEVYVCAgICAgPSAndGV4dCc7XHJcbk5vZGUuSU5QVVRfQlVUVE9OICAgPSAnYnV0dG9uJztcclxuTm9kZS5JTlBVVF9TRUxFQ1QgICA9ICdzZWxlY3QnO1xyXG5Ob2RlLklOUFVUX0NIRUNLQk9YID0gJ2NoZWNrYm94JztcclxuTm9kZS5PUFRJT04gICAgICAgICA9ICdvcHRpb24nO1xyXG5Ob2RlLkxJU1QgICAgICAgICAgID0gJ3VsJztcclxuTm9kZS5MSVNUX0lURU0gICAgICA9ICdsaSc7XHJcbk5vZGUuU1BBTiAgICAgICAgICAgPSAnc3Bhbic7XHJcbk5vZGUuVEVYVEFSRUEgICAgICAgPSAndGV4dGFyZWEnO1xyXG5cclxuTm9kZS5wcm90b3R5cGUgPSB7XHJcbiAgICBhZGRDaGlsZDogZnVuY3Rpb24gKG5vZGUpIHtcclxuICAgICAgICB0aGlzLl9lbGVtZW50LmFwcGVuZENoaWxkKG5vZGUuZ2V0RWxlbWVudCgpKTtcclxuICAgICAgICByZXR1cm4gbm9kZTtcclxuICAgIH0sXHJcbiAgICBhZGRDaGlsZHJlbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBpID0gLTEsIGwgPSBhcmd1bWVudHMubGVuZ3RoLCBlID0gdGhpcy5fZWxlbWVudDtcclxuICAgICAgICB3aGlsZSAoKytpIDwgbCkge1xyXG4gICAgICAgICAgICBlLmFwcGVuZENoaWxkKGFyZ3VtZW50c1tpXS5nZXRFbGVtZW50KCkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBhZGRDaGlsZEF0OiBmdW5jdGlvbiAobm9kZSwgaW5kZXgpIHtcclxuICAgICAgICB0aGlzLl9lbGVtZW50Lmluc2VydEJlZm9yZShub2RlLmdldEVsZW1lbnQoKSwgdGhpcy5fZWxlbWVudC5jaGlsZHJlbltpbmRleF0pO1xyXG4gICAgICAgIHJldHVybiBub2RlO1xyXG4gICAgfSxcclxuICAgIHJlbW92ZUNoaWxkOiBmdW5jdGlvbiAobm9kZSkge1xyXG4gICAgICAgIGlmICghdGhpcy5jb250YWlucyhub2RlKSlyZXR1cm4gbnVsbDtcclxuICAgICAgICB0aGlzLl9lbGVtZW50LnJlbW92ZUNoaWxkKG5vZGUuZ2V0RWxlbWVudCgpKTtcclxuICAgICAgICByZXR1cm4gbm9kZTtcclxuICAgIH0sXHJcbiAgICByZW1vdmVDaGlsZHJlbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBpID0gLTEsIGwgPSBhcmd1bWVudHMubGVuZ3RoLCBlID0gdGhpcy5fZWxlbWVudDtcclxuICAgICAgICB3aGlsZSAoKytpIDwgbCkge1xyXG4gICAgICAgICAgICBlLnJlbW92ZUNoaWxkKGFyZ3VtZW50c1tpXS5nZXRFbGVtZW50KCkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICByZW1vdmVDaGlsZEF0OiBmdW5jdGlvbiAobm9kZSwgaW5kZXgpIHtcclxuICAgICAgICBpZiAoIXRoaXMuY29udGFpbnMobm9kZSkpcmV0dXJuIG51bGw7XHJcbiAgICAgICAgdGhpcy5fZWxlbWVudC5yZW1vdmVDaGlsZChub2RlLmdldEVsZW1lbnQoKSk7XHJcbiAgICAgICAgcmV0dXJuIG5vZGU7XHJcbiAgICB9LFxyXG4gICAgcmVtb3ZlQWxsQ2hpbGRyZW46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgZWxlbWVudCA9IHRoaXMuX2VsZW1lbnQ7XHJcbiAgICAgICAgd2hpbGUgKGVsZW1lbnQuaGFzQ2hpbGROb2RlcygpKWVsZW1lbnQucmVtb3ZlQ2hpbGQoZWxlbWVudC5sYXN0Q2hpbGQpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIHNldFdpZHRoOiBmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgICAgICB0aGlzLl9lbGVtZW50LnN0eWxlLndpZHRoID0gdmFsdWUgKyAncHgnO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIGdldFdpZHRoOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VsZW1lbnQub2Zmc2V0V2lkdGg7XHJcbiAgICB9LFxyXG4gICAgc2V0SGVpZ2h0OiBmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgICAgICB0aGlzLl9lbGVtZW50LnN0eWxlLmhlaWdodCA9IHZhbHVlICsgJ3B4JztcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBnZXRIZWlnaHQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fZWxlbWVudC5vZmZzZXRIZWlnaHQ7XHJcbiAgICB9LFxyXG4gICAgc2V0UG9zaXRpb246IGZ1bmN0aW9uICh4LCB5KSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0UG9zaXRpb24oeCkuc2V0UG9zaXRpb24oeSk7XHJcbiAgICB9LFxyXG4gICAgc2V0UG9zaXRpb25YOiBmdW5jdGlvbiAoeCkge1xyXG4gICAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGUubWFyZ2luTGVmdCA9IHggKyAncHgnO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIHNldFBvc2l0aW9uWTogZnVuY3Rpb24gKHkpIHtcclxuICAgICAgICB0aGlzLl9lbGVtZW50LnN0eWxlLm1hcmdpblRvcCA9IHkgKyAncHgnO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIHNldFBvc2l0aW9uR2xvYmFsOiBmdW5jdGlvbiAoeCwgeSkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnNldFBvc2l0aW9uR2xvYmFsWCh4KS5zZXRQb3NpdGlvbkdsb2JhbFkoeSk7XHJcbiAgICB9LFxyXG4gICAgc2V0UG9zaXRpb25HbG9iYWxYOiBmdW5jdGlvbiAoeCkge1xyXG4gICAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGUubGVmdCA9IHggKyAncHgnO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIHNldFBvc2l0aW9uR2xvYmFsWTogZnVuY3Rpb24gKHkpIHtcclxuICAgICAgICB0aGlzLl9lbGVtZW50LnN0eWxlLnRvcCA9IHkgKyAncHgnO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIGdldFBvc2l0aW9uOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIFt0aGlzLmdldFBvc2l0aW9uWCgpLCB0aGlzLmdldFBvc2l0aW9uWSgpXTtcclxuICAgIH0sXHJcbiAgICBnZXRQb3NpdGlvblg6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fZWxlbWVudC5vZmZzZXRMZWZ0O1xyXG4gICAgfSxcclxuICAgIGdldFBvc2l0aW9uWTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9lbGVtZW50Lm9mZnNldFRvcDtcclxuICAgIH0sXHJcbiAgICBnZXRQb3NpdGlvbkdsb2JhbDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBvZmZzZXQgPSBbMCwgMF0sXHJcbiAgICAgICAgICAgIGVsZW1lbnQgPSB0aGlzLl9lbGVtZW50O1xyXG5cclxuICAgICAgICB3aGlsZSAoZWxlbWVudCkge1xyXG4gICAgICAgICAgICBvZmZzZXRbMF0gKz0gZWxlbWVudC5vZmZzZXRMZWZ0O1xyXG4gICAgICAgICAgICBvZmZzZXRbMV0gKz0gZWxlbWVudC5vZmZzZXRUb3A7XHJcbiAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50Lm9mZnNldFBhcmVudDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBvZmZzZXQ7XHJcbiAgICB9LFxyXG4gICAgZ2V0UG9zaXRpb25HbG9iYWxYOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIG9mZnNldCA9IDAsXHJcbiAgICAgICAgICAgIGVsZW1lbnQgPSB0aGlzLl9lbGVtZW50O1xyXG5cclxuICAgICAgICB3aGlsZSAoZWxlbWVudCkge1xyXG4gICAgICAgICAgICBvZmZzZXQgKz0gZWxlbWVudC5vZmZzZXRMZWZ0O1xyXG4gICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudC5vZmZzZXRQYXJlbnQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gb2Zmc2V0O1xyXG4gICAgfSxcclxuICAgIGdldFBvc2l0aW9uR2xvYmFsWTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBvZmZzZXQgPSAwLFxyXG4gICAgICAgICAgICBlbGVtZW50ID0gdGhpcy5fZWxlbWVudDtcclxuXHJcbiAgICAgICAgd2hpbGUgKGVsZW1lbnQpIHtcclxuICAgICAgICAgICAgb2Zmc2V0ICs9IGVsZW1lbnQub2Zmc2V0VG9wO1xyXG4gICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudC5vZmZzZXRQYXJlbnQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gb2Zmc2V0O1xyXG4gICAgfSxcclxuICAgIGFkZEV2ZW50TGlzdGVuZXI6IGZ1bmN0aW9uICh0eXBlLCBsaXN0ZW5lciwgdXNlQ2FwdHVyZSkge1xyXG4gICAgICAgIHRoaXMuX2VsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lciwgdXNlQ2FwdHVyZSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgcmVtb3ZlRXZlbnRMaXN0ZW5lcjogZnVuY3Rpb24gKHR5cGUsIGxpc3RlbmVyLCB1c2VDYXB0dXJlKSB7XHJcbiAgICAgICAgdGhpcy5fZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyLCB1c2VDYXB0dXJlKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBkaXNwYXRjaEV2ZW50IDogZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICB0aGlzLl9lbGVtZW50LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIHNldFN0eWxlQ2xhc3M6IGZ1bmN0aW9uIChzdHlsZSkge1xyXG4gICAgICAgIHRoaXMuX2VsZW1lbnQuY2xhc3NOYW1lID0gc3R5bGU7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgc2V0U3R5bGVQcm9wZXJ0eTogZnVuY3Rpb24gKHByb3BlcnR5LCB2YWx1ZSkge1xyXG4gICAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGVbcHJvcGVydHldID0gdmFsdWU7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgZ2V0U3R5bGVQcm9wZXJ0eTogZnVuY3Rpb24gKHByb3BlcnR5KSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VsZW1lbnQuc3R5bGVbcHJvcGVydHldO1xyXG4gICAgfSxcclxuICAgIHNldFN0eWxlUHJvcGVydGllczogZnVuY3Rpb24gKHByb3BlcnRpZXMpIHtcclxuICAgICAgICBmb3IgKHZhciBwIGluIHByb3BlcnRpZXMpe1xyXG4gICAgICAgICAgICB0aGlzLl9lbGVtZW50LnN0eWxlW3BdID0gcHJvcGVydGllc1twXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgZGVsZXRlU3R5bGVDbGFzczogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuX2VsZW1lbnQuY2xhc3NOYW1lID0gJyc7XHJcbiAgICAgICAgcmV0dXJuIHRoaXNcclxuICAgIH0sXHJcbiAgICBkZWxldGVTdHlsZVByb3BlcnR5OiBmdW5jdGlvbiAocHJvcGVydHkpIHtcclxuICAgICAgICB0aGlzLl9lbGVtZW50LnN0eWxlW3Byb3BlcnR5XSA9ICcnO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIGRlbGV0ZVN0eWxlUHJvcGVydGllczogZnVuY3Rpb24gKHByb3BlcnRpZXMpIHtcclxuICAgICAgICBmb3IgKHZhciBwIGluIHByb3BlcnRpZXMpe1xyXG4gICAgICAgICAgICB0aGlzLl9lbGVtZW50LnN0eWxlW3BdID0gJyc7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIGdldENoaWxkQXQ6IGZ1bmN0aW9uIChpbmRleCkge1xyXG4gICAgICAgIHJldHVybiBuZXcgTm9kZSgpLnNldEVsZW1lbnQodGhpcy5fZWxlbWVudC5jaGlsZHJlbltpbmRleF0pO1xyXG4gICAgfSxcclxuICAgIGdldENoaWxkSW5kZXg6IGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2luZGV4T2YodGhpcy5fZWxlbWVudCwgbm9kZS5nZXRFbGVtZW50KCkpO1xyXG4gICAgfSxcclxuICAgIGdldE51bUNoaWxkcmVuOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VsZW1lbnQuY2hpbGRyZW4ubGVuZ3RoO1xyXG4gICAgfSxcclxuICAgIGdldEZpcnN0Q2hpbGQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gbmV3IE5vZGUoKS5zZXRFbGVtZW50KHRoaXMuX2VsZW1lbnQuZmlyc3RDaGlsZCk7XHJcbiAgICB9LFxyXG4gICAgZ2V0TGFzdENoaWxkOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBOb2RlKCkuc2V0RWxlbWVudCh0aGlzLl9lbGVtZW50Lmxhc3RDaGlsZCk7XHJcbiAgICB9LFxyXG4gICAgaGFzQ2hpbGRyZW46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fZWxlbWVudC5jaGlsZHJlbi5sZW5ndGggIT0gMDtcclxuICAgIH0sXHJcbiAgICBjb250YWluczogZnVuY3Rpb24gKG5vZGUpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXhPZih0aGlzLl9lbGVtZW50LCBub2RlLmdldEVsZW1lbnQoKSkgIT0gLTE7XHJcbiAgICB9LFxyXG4gICAgX2luZGV4T2Y6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50LCBlbGVtZW50KSB7XHJcbiAgICAgICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5pbmRleE9mLmNhbGwocGFyZW50RWxlbWVudC5jaGlsZHJlbiwgZWxlbWVudCk7XHJcbiAgICB9LFxyXG4gICAgc2V0UHJvcGVydHk6IGZ1bmN0aW9uIChwcm9wZXJ0eSwgdmFsdWUpIHtcclxuICAgICAgICB0aGlzLl9lbGVtZW50W3Byb3BlcnR5XSA9IHZhbHVlO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIHNldFByb3BlcnRpZXM6IGZ1bmN0aW9uIChwcm9wZXJ0aWVzKSB7XHJcbiAgICAgICAgZm9yICh2YXIgcCBpbiBwcm9wZXJ0aWVzKXtcclxuICAgICAgICAgICAgdGhpcy5fZWxlbWVudFtwXSA9IHByb3BlcnRpZXNbcF07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIGdldFByb3BlcnR5OiBmdW5jdGlvbiAocHJvcGVydHkpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fZWxlbWVudFtwcm9wZXJ0eV07XHJcbiAgICB9LFxyXG4gICAgc2V0RWxlbWVudDogZnVuY3Rpb24gKGVsZW1lbnQpIHtcclxuICAgICAgICB0aGlzLl9lbGVtZW50ID0gZWxlbWVudDtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBnZXRFbGVtZW50OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VsZW1lbnQ7XHJcbiAgICB9LFxyXG4gICAgZ2V0U3R5bGU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fZWxlbWVudC5zdHlsZTtcclxuICAgIH0sXHJcbiAgICBnZXRQYXJlbnQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gbmV3IE5vZGUoKS5zZXRFbGVtZW50KHRoaXMuX2VsZW1lbnQucGFyZW50Tm9kZSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5Ob2RlLmdldE5vZGVCeUVsZW1lbnQgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xyXG4gICAgcmV0dXJuIG5ldyBOb2RlKCkuc2V0RWxlbWVudChlbGVtZW50KTtcclxufTtcclxuTm9kZS5nZXROb2RlQnlJZCA9IGZ1bmN0aW9uIChpZCkge1xyXG4gICAgcmV0dXJuIG5ldyBOb2RlKCkuc2V0RWxlbWVudChkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCkpO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBOb2RlOyIsInZhciBOb2RlRXZlbnQgPSB7XHJcbiAgICBNT1VTRV9ET1dOICAgOiAnbW91c2Vkb3duJyxcclxuICAgIE1PVVNFX1VQICAgICA6ICdtb3VzZXVwJyxcclxuICAgIE1PVVNFX09WRVIgICA6ICdtb3VzZW92ZXInLFxyXG4gICAgTU9VU0VfTU9WRSAgIDogJ21vdXNlbW92ZScsXHJcbiAgICBNT1VTRV9PVVQgICAgOiAnbW91c2VvdXQnLFxyXG4gICAgS0VZX0RPV04gICAgIDogJ2tleWRvd24nLFxyXG4gICAgS0VZX1VQICAgICAgIDogJ2tleXVwJyxcclxuICAgIENIQU5HRSAgICAgICA6ICdjaGFuZ2UnLFxyXG4gICAgRklOSVNIICAgICAgIDogJ2ZpbmlzaCcsXHJcbiAgICBEQkxfQ0xJQ0sgICAgOiAnZGJsY2xpY2snLFxyXG4gICAgT05fQ0xJQ0sgICAgIDogJ2NsaWNrJyxcclxuICAgIFNFTEVDVF9TVEFSVCA6ICdzZWxlY3RzdGFydCcsXHJcbiAgICBEUkFHX1NUQVJUICAgOiAnZHJhZ3N0YXJ0JyxcclxuICAgIERSQUcgICAgICAgICA6ICdkcmFnJyxcclxuICAgIERSQUdfRU5EICAgICA6ICdkcmFnZW5kJyxcclxuXHJcbiAgICBEUkFHX0VOVEVSICAgOiAnZHJhZ2VudGVyJyxcclxuICAgIERSQUdfT1ZFUiAgICA6ICdkcmFnb3ZlcicsXHJcbiAgICBEUkFHX0xFQVZFICAgOiAnZHJhZ2xlYXZlJyxcclxuXHJcbiAgICBSRVNJWkUgICAgICAgOiAncmVzaXplJ1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBOb2RlRXZlbnQ7IiwidmFyIFN0eWxlID0geyBcblx0c3RyaW5nIDogXCIjY29udHJvbEtpdHtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MDtyaWdodDowO3dpZHRoOjEwMCU7LXdlYmtpdC10b3VjaC1jYWxsb3V0Om5vbmU7LXdlYmtpdC11c2VyLXNlbGVjdDpub25lOy1raHRtbC11c2VyLXNlbGVjdDpub25lOy1tb3otdXNlci1zZWxlY3Q6bm9uZTstbXMtdXNlci1zZWxlY3Q6bm9uZTt1c2VyLXNlbGVjdDpub25lO3BvaW50ZXItZXZlbnRzOm5vbmV9I2NvbnRyb2xLaXQuZnVsbHtoZWlnaHQ6MTAwJX0jY29udHJvbEtpdCAucGFuZWx7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O3BvaW50ZXItZXZlbnRzOmF1dG87cG9zaXRpb246cmVsYXRpdmU7ei1pbmRleDoxOy13ZWJraXQtdG91Y2gtY2FsbG91dDpub25lOy13ZWJraXQtdXNlci1zZWxlY3Q6bm9uZTsta2h0bWwtdXNlci1zZWxlY3Q6bm9uZTstbW96LXVzZXItc2VsZWN0Om5vbmU7LW1zLXVzZXItc2VsZWN0Om5vbmU7dXNlci1zZWxlY3Q6bm9uZTtvdmVyZmxvdzpoaWRkZW47b3BhY2l0eToxO2Zsb2F0OmxlZnQ7aGVpZ2h0OjEwMCU7d2lkdGg6MjAwcHg7Ym9yZGVyLXJhZGl1czozcHg7LW1vei1ib3JkZXItcmFkaXVzOjNweDtib3gtc2hhZG93OjAgMnB4IDJweCByZ2JhKDAsMCwwLC4yNSk7bWFyZ2luOjA7cGFkZGluZzowO2JhY2tncm91bmQtY29sb3I6IzFBMUExQTtmb250LWZhbWlseTptb25vc3BhY2V9I2NvbnRyb2xLaXQgLnBhbmVsIC53cmFwe3dpZHRoOmF1dG87aGVpZ2h0OmF1dG87bWFyZ2luOjA7cGFkZGluZzowO3Bvc2l0aW9uOnJlbGF0aXZlO292ZXJmbG93OmhpZGRlbn0jY29udHJvbEtpdCAucGFuZWwgdWx7bWFyZ2luOjA7cGFkZGluZzowO2xpc3Qtc3R5bGU6bm9uZX0jY29udHJvbEtpdCAucGFuZWwgLmNvbG9yLCNjb250cm9sS2l0IC5wYW5lbCBpbnB1dFt0eXBlPXRleHRdLCNjb250cm9sS2l0IC5wYW5lbCB0ZXh0YXJlYSwjY29udHJvbEtpdCAucGlja2VyIGlucHV0W3R5cGU9dGV4dF17LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O3dpZHRoOjEwMCU7aGVpZ2h0OjE4cHg7cGFkZGluZzowIDAgMCA4cHg7Zm9udC1mYW1pbHk6bW9ub3NwYWNlO2ZvbnQtc2l6ZToxMXB4O2NvbG9yOiNmZmY7dGV4dC1zaGFkb3c6MXB4IDFweCAjMDAwO291dGxpbmU6MDtiYWNrZ3JvdW5kOiMyMjI7Ym9yZGVyOm5vbmU7Ym94LXNoYWRvdzowIDAgMCAxcHggIzFGMUYxRiBpbnNldDtib3JkZXItcmFkaXVzOjA7LW1vei1ib3JkZXItcmFkaXVzOjB9I2NvbnRyb2xLaXQgLnBhbmVsIC5idXR0b24sI2NvbnRyb2xLaXQgLnBhbmVsIC5zZWxlY3QsI2NvbnRyb2xLaXQgLnBhbmVsIC5zZWxlY3QtYWN0aXZlLCNjb250cm9sS2l0IC5waWNrZXIgLmJ1dHRvbnstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7Y3Vyc29yOnBvaW50ZXI7d2lkdGg6MTAwJTtoZWlnaHQ6MjBweDttYXJnaW46MDtiYWNrZ3JvdW5kOiMzMzM7Ym9yZGVyOm5vbmU7b3V0bGluZTowO2JvcmRlci1yYWRpdXM6MDtib3gtc2hhZG93OjAgMCAwIDFweCAjMUYxRjFGIGluc2V0LC0xcHggMnB4IDAgMCAjNGE0YTRhIGluc2V0O2ZvbnQtZmFtaWx5Om1vbm9zcGFjZTtjb2xvcjojYWFhfSNjb250cm9sS2l0IC5wYW5lbCAuYnV0dG9ue3dpZHRoOjc4JX0jY29udHJvbEtpdCAucGFuZWwgdGV4dGFyZWF7cGFkZGluZzozcHggOHB4IDJweDtvdmVyZmxvdzpoaWRkZW47cmVzaXplOm5vbmU7dmVydGljYWwtYWxpZ246dG9wO3doaXRlLXNwYWNlOm5vd3JhcH0jY29udHJvbEtpdCAucGFuZWwgLnRleHRhcmVhLXdyYXB7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O3dpZHRoOjEwMCU7cGFkZGluZzowO2Zsb2F0OmxlZnQ7aGVpZ2h0OjEwMCU7b3ZlcmZsb3c6aGlkZGVuO2JvcmRlcjpub25lO2JvcmRlci1yYWRpdXM6MDstbW96LWJvcmRlci1yYWRpdXM6MDtiYWNrZ3JvdW5kLWNvbG9yOiMyMjI7Ym94LXNoYWRvdzowIDAgMXB4IDJweCByZ2JhKDAsMCwwLC4wMTI1KSBpbnNldCwwIDAgMXB4IDFweCAjMTExMzE0IGluc2V0O2JhY2tncm91bmQtaW1hZ2U6LW8tbGluZWFyLWdyYWRpZW50KHJnYmEoMCwwLDAsLjA3NSkgMCxyZ2JhKDAsMCwwLC4xMjUpIDEwMCUpO2JhY2tncm91bmQtaW1hZ2U6bGluZWFyLWdyYWRpZW50KHJnYmEoMCwwLDAsLjA3NSkgMCxyZ2JhKDAsMCwwLC4xMjUpIDEwMCUpfSNjb250cm9sS2l0IC5wYW5lbCAudGV4dGFyZWEtd3JhcCB0ZXh0YXJlYXtib3JkZXI6bm9uZTtib3JkZXItcmFkaXVzOjA7LW1vei1ib3JkZXItcmFkaXVzOjA7Ym94LXNoYWRvdzpub25lO2JhY2tncm91bmQ6MCAwfSNjb250cm9sS2l0IC5wYW5lbCAudGV4dGFyZWEtd3JhcCAuc2Nyb2xsQmFye2JvcmRlcjoxcHggc29saWQgIzEwMTIxMztib3JkZXItYm90dG9tLXJpZ2h0LXJhZGl1czowO2JvcmRlci10b3AtcmlnaHQtcmFkaXVzOjA7Ym9yZGVyLWxlZnQ6bm9uZTtib3gtc2hhZG93OjAgMCAxcHggMnB4IHJnYmEoMCwwLDAsLjAxMjUpIGluc2V0LDAgMCAxcHggMXB4ICMxMTEzMTQgaW5zZXR9I2NvbnRyb2xLaXQgLnBhbmVsIGNhbnZhc3tjdXJzb3I6cG9pbnRlcjt2ZXJ0aWNhbC1hbGlnbjpib3R0b207Ym9yZGVyOm5vbmU7Ym94LXNoYWRvdzowIDAgMCAxcHggIzFGMUYxRiBpbnNldDtib3JkZXItcmFkaXVzOjA7LW1vei1ib3JkZXItcmFkaXVzOjB9I2NvbnRyb2xLaXQgLnBhbmVsIC5jYW52YXMtd3JhcCwjY29udHJvbEtpdCAucGFuZWwgLnN2Zy13cmFwe21hcmdpbjo2cHggMCAwO3Bvc2l0aW9uOnJlbGF0aXZlO3dpZHRoOjcwJTtmbG9hdDpyaWdodDstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym9yZGVyOm5vbmU7Ym9yZGVyLXJhZGl1czowOy1tb3otYm9yZGVyLXJhZGl1czowO2JhY2tncm91bmQ6IzIyMjtiYWNrZ3JvdW5kOi1vLWxpbmVhci1ncmFkaWVudChyZ2JhKDAsMCwwLDApIDAscmdiYSgwLDAsMCwuMDUpIDEwMCUpICMyMjI7YmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQocmdiYSgwLDAsMCwwKSAwLHJnYmEoMCwwLDAsLjA1KSAxMDAlKSAjMjIyfSNjb250cm9sS2l0IC5wYW5lbCAuY2FudmFzLXdyYXAgc3ZnLCNjb250cm9sS2l0IC5wYW5lbCAuc3ZnLXdyYXAgc3Zne3Bvc2l0aW9uOmFic29sdXRlO2xlZnQ6MDt0b3A6MDtjdXJzb3I6cG9pbnRlcjt2ZXJ0aWNhbC1hbGlnbjpib3R0b207Ym9yZGVyOm5vbmU7Ym94LXNoYWRvdzowIDAgMCAxcHggIzFGMUYxRiBpbnNldDtib3JkZXItcmFkaXVzOjA7LW1vei1ib3JkZXItcmFkaXVzOjB9I2NvbnRyb2xLaXQgLnBhbmVsIC5idXR0b24sI2NvbnRyb2xLaXQgLnBpY2tlciAuYnV0dG9ue2ZvbnQtc2l6ZToxMXB4O3RleHQtc2hhZG93OjAgMXB4ICMwMDA7dGV4dC10cmFuc2Zvcm06dXBwZXJjYXNlfSNjb250cm9sS2l0IC5wYW5lbCAuYnV0dG9uOmhvdmVyLCNjb250cm9sS2l0IC5waWNrZXIgLmJ1dHRvbjpob3ZlcntiYWNrZ3JvdW5kLWltYWdlOi1vLWxpbmVhci1ncmFkaWVudCgjNDU0NTQ1IDAsIzNiM2IzYiAxMDAlKTtiYWNrZ3JvdW5kLWltYWdlOmxpbmVhci1ncmFkaWVudCgjNDU0NTQ1IDAsIzNiM2IzYiAxMDAlKX0jY29udHJvbEtpdCAucGFuZWwgLmJ1dHRvbjphY3RpdmUsI2NvbnRyb2xLaXQgLnBpY2tlciAuYnV0dG9uOmFjdGl2ZXtiYWNrZ3JvdW5kOiMxMTF9I2NvbnRyb2xLaXQgLnBhbmVsIC5jb2xvci13aXRoLXByZXNldC13cmFwLCNjb250cm9sS2l0IC5wYW5lbCAuaW5wdXQtd2l0aC1wcmVzZXQtd3JhcHt3aWR0aDoxMDAlO2Zsb2F0OmxlZnR9I2NvbnRyb2xLaXQgLnBhbmVsIC5jb2xvci13aXRoLXByZXNldC13cmFwIC5jb2xvciwjY29udHJvbEtpdCAucGFuZWwgLmlucHV0LXdpdGgtcHJlc2V0LXdyYXAgaW5wdXRbdHlwZT10ZXh0XXtwYWRkaW5nLXJpZ2h0OjI1cHg7Ym9yZGVyLXRvcC1yaWdodC1yYWRpdXM6MnB4O2JvcmRlci1ib3R0b20tcmlnaHQtcmFkaXVzOjJweDtmbG9hdDpsZWZ0fSNjb250cm9sS2l0IC5wYW5lbCAuYnV0dG9uLXByZXNldCwjY29udHJvbEtpdCAucGFuZWwgLmJ1dHRvbi1wcmVzZXQtYWN0aXZley13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveDtwb3NpdGlvbjphYnNvbHV0ZTtyaWdodDowO3dpZHRoOjIwcHg7aGVpZ2h0OjE4cHg7bWFyZ2luOjA7Y3Vyc29yOnBvaW50ZXI7ZmxvYXQ6cmlnaHQ7Ym9yZGVyOm5vbmU7Ym9yZGVyLXRvcC1yaWdodC1yYWRpdXM6MDtib3JkZXItYm90dG9tLXJpZ2h0LXJhZGl1czowO2JveC1zaGFkb3c6MCAwIDAgMXB4ICMxRjFGMUYgaW5zZXQsLTFweCAycHggMCAwICM0YTRhNGEgaW5zZXQ7b3V0bGluZTowfSNjb250cm9sS2l0IC5wYW5lbCAuYnV0dG9uLXByZXNldC1hY3RpdmUsI2NvbnRyb2xLaXQgLnBhbmVsIC5idXR0b24tcHJlc2V0OmhvdmVye2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBRkNBWUFBQUI0a2ExVkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFHNUpSRUZVZU5waTVPRGlhbVJnWUtoandBNGFtVng4Z3hqbUwxckM4UDNyVnhROGIrRVNCaGZmSUFabU5SMjlBNWV2WFdkaVpHQzAxOVhTWkdCZ1lHQll2bVk5dzdJMTZ4b1pHQmdhV0tCRzFTOWJzKzQvQXdORFBRTURBMXlTZ1lHQmdkRW5QQWJaemdZMG1nRXdBRTlsSlQxbHJzZmZBQUFBQUVsRlRrU3VRbUNDKSA1MCUgNTAlIG5vLXJlcGVhdCxsaW5lYXItZ3JhZGllbnQoIzQ1NDU0NSAwLCMzYjNiM2IgMTAwJSl9I2NvbnRyb2xLaXQgLnBhbmVsIC5idXR0b24tcHJlc2V0e2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBRkNBWUFBQUI0a2ExVkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFHNUpSRUZVZU5waTVPRGlhbVJnWUtoandBNGFtVng4Z3hqbUwxckM4UDNyVnhROGIrRVNCaGZmSUFabU5SMjlBNWV2WFdkaVpHQzAxOVhTWkdCZ1lHQll2bVk5dzdJMTZ4b1pHQmdhV0tCRzFTOWJzKzQvQXdORFBRTURBMXlTZ1lHQmdkRW5QQWJaemdZMG1nRXdBRTlsSlQxbHJzZmZBQUFBQUVsRlRrU3VRbUNDKSA1MCUgNTAlIG5vLXJlcGVhdCxsaW5lYXItZ3JhZGllbnQoIzQwNDA0MCAwLCMzYjNiM2IgMTAwJSl9I2NvbnRyb2xLaXQgLnBhbmVsIC5zZWxlY3QsI2NvbnRyb2xLaXQgLnBhbmVsIC5zZWxlY3QtYWN0aXZle3BhZGRpbmctbGVmdDoxMHB4O3BhZGRpbmctcmlnaHQ6MjBweDtmb250LXNpemU6MTBweDt0ZXh0LWFsaWduOmxlZnQ7dGV4dC1zaGFkb3c6MXB4IDFweCAjMDAwO2N1cnNvcjpwb2ludGVyO292ZXJmbG93OmhpZGRlbjt3aGl0ZS1zcGFjZTpub3dyYXA7dGV4dC1vdmVyZmxvdzplbGxpcHNpcztjb2xvcjojZmZmO2JveC1zaGFkb3c6MCAwIDAgMXB4ICMxRjFGMUYgaW5zZXQsLTFweCAtMnB4IDAgMCAjNGE0YTRhIGluc2V0fSNjb250cm9sS2l0IC5wYW5lbCAuc2VsZWN0e2JhY2tncm91bmQtY29sb3I6IzIyMjtiYWNrZ3JvdW5kLWltYWdlOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUJJQUFBQUhDQVlBQUFBRjFSMS9BQUFLUldsRFExQkpRME1nY0hKdlptbHNaUUFBZU5xZFUyZFVVK2tXUGZmZTlFSkxpSUNVUzI5U0ZRZ2dVa0tMZ0JTUkppb2hDUkJLaUNHaDJSVlJ3UkZGUlFRYnlLQ0lBNDZPZ0l3VlVTd01pZ3JZQitRaG9vNkRvNGlLeXZ2aGU2TnIxcnozNXMzK3RkYys1Nnp6bmJQUEI4QUlESlpJTTFFMWdBeXBRaDRSNElQSHhNYmg1QzVBZ1Fva2NBQVFDTE5rSVhQOUl3RUErSDQ4UENzaXdBZStBQUY0MHdzSUFNQk5tOEF3SElmL0QrcENtVndCZ0lRQndIU1JPRXNJZ0JRQVFIcU9RcVlBUUVZQmdKMllKbE1Bb0FRQVlNdGpZdU1BVUMwQVlDZC81dE1BZ0ozNG1Yc0JBRnVVSVJVQm9KRUFJQk5saUVRQWFEc0FyTTlXaWtVQVdEQUFGR1pMeERrQTJDMEFNRWxYWmtnQXNMY0F3TTRRQzdJQUNBd0FNRkdJaFNrQUJIc0FZTWdqSTNnQWhKa0FGRWJ5Vnp6eEs2NFE1eW9BQUhpWnNqeTVKRGxGZ1ZzSUxYRUhWMWN1SGlqT1NSY3JGRFpoQW1HYVFDN0NlWmtaTW9FMEQrRHp6QUFBb0pFVkVlQ0Q4LzE0emc2dXpzNDJqcllPWHkzcXZ3Yi9JbUppNC83bHo2dHdRQUFBNFhSKzBmNHNMN01hZ0RzR2dHMytvaVh1QkdoZUM2QjE5NHRtc2c5QXRRQ2c2ZHBYODNENGZqdzhSYUdRdWRuWjVlVGsyRXJFUWx0aHlsZDkvbWZDWDhCWC9XejVmano4OS9YZ3Z1SWtnVEpkZ1VjRStPREN6UFJNcFJ6UGtnbUVZdHptajBmOHR3di8vQjNUSXNSSllybFlLaFRqVVJKeGprU2FqUE15cFNLSlFwSXB4U1hTLzJUaTN5ejdBejdmTlFDd2FqNEJlNUV0cUYxakEvWkxKeEJZZE1EaTl3QUE4cnR2d2RRb0NBT0FhSVBoejNmLzd6LzlSNkFsQUlCbVNaSnhBQUJlUkNRdVZNcXpQOGNJQUFCRW9JRXFzRUViOU1FWUxNQUdITUVGM01FTC9HQTJoRUlreE1KQ0VFSUtaSUFjY21BcHJJSkNLSWJOc0IwcVlDL1VRQjAwd0ZGb2hwTndEaTdDVmJnT1BYQVArbUVJbnNFb3ZJRUpCRUhJQ0JOaElkcUlBV0tLV0NPT0NCZVpoZmdod1VnRUVvc2tJTW1JRkZFaVM1RTFTREZTaWxRZ1ZVZ2Q4ajF5QWptSFhFYTZrVHZJQURLQy9JYThSekdVZ2JKUlBkUU10VU81cURjYWhFYWlDOUJrZERHYWp4YWdtOUJ5dEJvOWpEYWg1OUNyYUEvYWp6NUR4ekRBNkJnSE04UnNNQzdHdzBLeE9Dd0prMlBMc1NLc0RLdkdHckJXckFPN2lmVmp6N0YzQkJLQlJjQUpOZ1IzUWlCaEhrRklXRXhZVHRoSXFDQWNKRFFSMmdrM0NRT0VVY0luSXBPb1M3UW11aEg1eEJoaU1qR0hXRWdzSTlZU2p4TXZFSHVJUThRM0pCS0pRekludVpBQ1NiR2tWTklTMGtiU2JsSWo2U3lwbXpSSUdpT1R5ZHBrYTdJSE9aUXNJQ3ZJaGVTZDVNUGtNK1FiNUNIeVd3cWRZa0J4cFBoVDRpaFN5bXBLR2VVUTVUVGxCbVdZTWtGVm81cFMzYWloVkJFMWoxcENyYUcyVXE5Umg2Z1ROSFdhT2MyREZrbExwYTJpbGRNYWFCZG85Mm12NkhTNkVkMlZIazZYMEZmU3krbEg2SmZvQS9SM0RBMkdGWVBIaUdjb0dac1lCeGhuR1hjWXI1aE1waG5UaXhuSFZEQTNNZXVZNTVrUG1XOVZXQ3EyS253Vmtjb0tsVXFWSnBVYktpOVVxYXFtcXQ2cUMxWHpWY3RVajZsZVUzMnVSbFV6VStPcENkU1dxMVdxblZEclV4dFRaNms3cUllcVo2aHZWRCtrZmxuOWlRWlp3MHpEVDBPa1VhQ3hYK084eGlBTFl4bXplQ3doYXcycmhuV0JOY1Ftc2MzWmZIWXF1NWo5SGJ1TFBhcXBvVGxETTBvelY3TlM4NVJtUHdmam1ISDRuSFJPQ2Vjb3A1Znpmb3JlRk84cDRpa2JwalJNdVRGbFhHdXFscGVXV0t0SXExR3JSK3U5TnE3dHA1Mm12VVc3V2Z1QkRrSEhTaWRjSjBkbmo4NEZuZWRUMlZQZHB3cW5GazA5T3ZXdUxxcHJwUnVodTBSM3YyNm43cGlldmw2QW5reHZwOTU1dmVmNkhIMHYvVlQ5YmZxbjlVY01XQWF6RENRRzJ3ek9HRHpGTlhGdlBCMHZ4OXZ4VVVOZHcwQkRwV0dWWVpmaGhKRzUwVHlqMVVhTlJnK01hY1pjNHlUamJjWnR4cU1tQmlZaEprdE42azN1bWxKTnVhWXBwanRNTzB6SHpjek5vczNXbVRXYlBUSFhNdWViNTV2WG05KzNZRnA0V2l5MnFMYTRaVW15NUZxbVdlNjJ2RzZGV2psWnBWaFZXbDJ6UnEyZHJTWFd1NjI3cHhHbnVVNlRUcXVlMW1mRHNQRzJ5YmFwdHhtdzVkZ0cyNjYyYmJaOVlXZGlGMmUzeGE3RDdwTzlrMzI2ZlkzOVBRY05oOWtPcXgxYUhYNXp0SElVT2xZNjNwck9uTzQvZmNYMGx1a3ZaMWpQRU0vWU0rTzJFOHNweEdtZFU1dlRSMmNYWjdsemcvT0lpNGxMZ3NzdWx6NHVteHZHM2NpOTVFcDA5WEZkNFhyUzlaMmJzNXZDN2FqYnIrNDI3bW51aDl5ZnpEU2ZLWjVaTTNQUXc4aEQ0RkhsMFQ4TG41VXdhOStzZms5RFQ0Rm50ZWNqTDJNdmtWZXQxN0MzcFhlcTkySHZGejcyUG5LZjR6N2pQRGZlTXQ1Wlg4dzN3TGZJdDh0UHcyK2VYNFhmUTM4ai8yVC9ldi9SQUtlQUpRRm5BNG1CUVlGYkF2djRlbndodjQ0L090dGw5ckxaN1VHTW9MbEJGVUdQZ3EyQzVjR3RJV2pJN0pDdElmZm5tTTZSem1rT2hWQis2TmJRQjJIbVlZdkRmZ3duaFllRlY0WS9qbkNJV0JyUk1aYzFkOUhjUTNQZlJQcEVsa1RlbTJjeFR6bXZMVW8xS2o2cUxtbzgyamU2TkxvL3hpNW1XY3pWV0oxWVNXeExIRGt1S3E0MmJteSszL3p0ODRmaW5lSUw0M3NYbUMvSVhYQjVvYzdDOUlXbkZxa3VFaXc2bGtCTWlFNDRsUEJCRUNxb0Zvd2w4aE4zSlk0S2VjSWR3bWNpTDlFMjBZallRMXdxSGs3eVNDcE5lcExza2J3MWVTVEZNNlVzNWJtRUo2bVF2RXdOVE4yYk9wNFdtbllnYlRJOU9yMHhnNUtSa0hGQ3FpRk5rN1puNm1mbVpuYkxyR1dGc3Y3RmJvdTNMeDZWQjhscnM1Q3NCVmt0Q3JaQ3B1aFVXaWpYS2dleVoyVlhaci9OaWNvNWxxdWVLODN0ekxQSzI1QTNuTytmLyswU3doTGhrcmFsaGt0WExSMVk1cjJzYWpteVBIRjUyd3JqRlFVcmhsWUdyRHk0aXJZcWJkVlBxKzFYbDY1K3ZTWjZUV3VCWHNIS2dzRzFBV3ZyQzFVSzVZVjk2OXpYN1YxUFdDOVozN1ZoK29hZEd6NFZpWXF1Rk5zWGx4Vi8yQ2pjZU9VYmgyL0t2NW5jbExTcHE4UzVaTTltMG1icDV0NHRubHNPbHFxWDVwY09iZzNaMnJRTjMxYTA3ZlgyUmRzdmw4MG8yN3VEdGtPNW83ODh1THhscDhuT3pUcy9WS1JVOUZUNlZEYnUwdDIxWWRmNGJ0SHVHM3U4OWpUczFkdGJ2UGY5UHNtKzIxVUJWVTNWWnRWbCswbjdzL2Mvcm9tcTZmaVcrMjFkclU1dGNlM0hBOUlEL1FjakRyYlh1ZFRWSGRJOVZGS1AxaXZyUnc3SEg3NytuZTkzTFEwMkRWV05uTWJpSTNCRWVlVHA5d25mOXg0Tk90cDJqSHVzNFFmVEgzWWRaeDB2YWtLYThwcEdtMU9hKzF0aVc3cFB6RDdSMXVyZWV2eEgyeDhQbkRROFdYbEs4MVRKYWRycGd0T1RaL0xQakoyVm5YMStMdm5jWU51aXRudm5ZODdmYWc5djc3b1FkT0hTUmYrTDV6dThPODVjOHJoMDhyTGI1Uk5YdUZlYXJ6cGZiZXAwNmp6K2s5TlB4N3VjdTVxdXVWeHJ1ZTU2dmJWN1p2ZnBHNTQzenQzMHZYbnhGdi9XMVo0NVBkMjk4M3B2OThYMzlkOFczWDV5Si8zT3k3dlpkeWZ1cmJ4UHZGLzBRTzFCMlVQZGg5VS9XLzdjMk8vY2YyckFkNkR6MGR4SDl3YUZnOC8ra2ZXUEQwTUZqNW1QeTRZTmh1dWVPRDQ1T2VJL2N2M3AvS2REejJUUEpwNFgvcUwreTY0WEZpOSsrTlhyMTg3Um1OR2hsL0tYazc5dGZLWDk2c0RyR2EvYnhzTEdIcjdKZURNeFh2UlcrKzNCZDl4M0hlK2ozdzlQNUh3Z2Z5ai9hUG14OVZQUXAvdVRHWk9UL3dRRG1QUDg3eldVZ2dBQUFCbDBSVmgwVTI5bWRIZGhjbVVBUVdSdlltVWdTVzFoWjJWU1pXRmtlWEhKWlR3QUFBTWhhVlJZZEZoTlREcGpiMjB1WVdSdlltVXVlRzF3QUFBQUFBQThQM2h3WVdOclpYUWdZbVZuYVc0OUl1Kzd2eUlnYVdROUlsYzFUVEJOY0VObGFHbEllbkpsVTNwT1ZHTjZhMk01WkNJL1BpQThlRHA0YlhCdFpYUmhJSGh0Ykc1ek9uZzlJbUZrYjJKbE9tNXpPbTFsZEdFdklpQjRPbmh0Y0hSclBTSkJaRzlpWlNCWVRWQWdRMjl5WlNBMUxqWXRZekUwTWlBM09TNHhOakE1TWpRc0lESXdNVGN2TURjdk1UTXRNREU2TURZNk16a2dJQ0FnSUNBZ0lDSStJRHh5WkdZNlVrUkdJSGh0Ykc1ek9uSmtaajBpYUhSMGNEb3ZMM2QzZHk1M015NXZjbWN2TVRrNU9TOHdNaTh5TWkxeVpHWXRjM2x1ZEdGNExXNXpJeUkrSUR4eVpHWTZSR1Z6WTNKcGNIUnBiMjRnY21SbU9tRmliM1YwUFNJaUlIaHRiRzV6T25odGNEMGlhSFIwY0RvdkwyNXpMbUZrYjJKbExtTnZiUzk0WVhBdk1TNHdMeUlnZUcxc2JuTTZlRzF3VFUwOUltaDBkSEE2THk5dWN5NWhaRzlpWlM1amIyMHZlR0Z3THpFdU1DOXRiUzhpSUhodGJHNXpPbk4wVW1WbVBTSm9kSFJ3T2k4dmJuTXVZV1J2WW1VdVkyOXRMM2hoY0M4eExqQXZjMVI1Y0dVdlVtVnpiM1Z5WTJWU1pXWWpJaUI0YlhBNlEzSmxZWFJ2Y2xSdmIydzlJa0ZrYjJKbElGQm9iM1J2YzJodmNDQkRReUFvVjJsdVpHOTNjeWtpSUhodGNFMU5Pa2x1YzNSaGJtTmxTVVE5SW5odGNDNXBhV1E2TXpZelFVSXlNMEUzTlRKQ01URkZRVUUxTUVKRVEwVTVPVGsyUkVKR1FVWWlJSGh0Y0UxTk9rUnZZM1Z0Wlc1MFNVUTlJbmh0Y0M1a2FXUTZNell6UVVJeU0wSTNOVEpDTVRGRlFVRTFNRUpFUTBVNU9UazJSRUpHUVVZaVBpQThlRzF3VFUwNlJHVnlhWFpsWkVaeWIyMGdjM1JTWldZNmFXNXpkR0Z1WTJWSlJEMGllRzF3TG1scFpEb3pOak5CUWpJek9EYzFNa0l4TVVWQlFUVXdRa1JEUlRrNU9UWkVRa1pCUmlJZ2MzUlNaV1k2Wkc5amRXMWxiblJKUkQwaWVHMXdMbVJwWkRvek5qTkJRakl6T1RjMU1rSXhNVVZCUVRVd1FrUkRSVGs1T1RaRVFrWkJSaUl2UGlBOEwzSmtaanBFWlhOamNtbHdkR2x2Ymo0Z1BDOXlaR1k2VWtSR1BpQThMM2c2ZUcxd2JXVjBZVDRnUEQ5NGNHRmphMlYwSUdWdVpEMGljaUkvUG11U0FXc0FBQUE2U1VSQlZIamFZdnovL3o4RE5RQVRFT015NlQrcEJqRmkwZlFmS2s2U1FReG9ocEZzQ0xKQnlJWXhraHRHREdpR01WRERJTElCUUlBQkFQalVDZ3NPVWc2SUFBQUFBRWxGVGtTdVFtQ0MpO2JhY2tncm91bmQtcmVwZWF0Om5vLXJlcGVhdDtiYWNrZ3JvdW5kLXBvc2l0aW9uOmNlbnRlciByaWdodH0jY29udHJvbEtpdCAucGFuZWwgLnNlbGVjdC1hY3RpdmUsI2NvbnRyb2xLaXQgLnBhbmVsIC5zZWxlY3Q6aG92ZXJ7YmFja2dyb3VuZC1jb2xvcjojMzMzO2JhY2tncm91bmQtaW1hZ2U6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQklBQUFBSENBWUFBQUFGMVIxL0FBQUtSV2xEUTFCSlEwTWdjSEp2Wm1sc1pRQUFlTnFkVTJkVVUra1dQZmZlOUVKTGlJQ1VTMjlTRlFnZ1VrS0xnQlNSSmlvaENSQktpQ0doMlJWUndSRkZSUVFieUtDSUE0Nk9nSXdWVVN3TWlncllCK1Fob282RG80aUt5dnZoZTZOcjFyejM1czMrdGRjKzU2enpuYlBQQjhBSURKWklNMUUxZ0F5cFFoNFI0SVBIeE1iaDVDNUFnUW9rY0FBUUNMTmtJWFA5SXdFQStINDhQQ3Npd0FlK0FBRjQwd3NJQU1CTm04QXdISWYvRCtwQ21Wd0JnSVFCd0hTUk9Fc0lnQlFBUUhxT1FxWUFRRVlCZ0oyWUpsTUFvQVFBWU10all1TUFVQzBBWUNkLzV0TUFnSjM0bVhzQkFGdVVJUlVCb0pFQUlCTmxpRVFBYURzQXJNOVdpa1VBV0RBQUZHWkx4RGtBMkMwQU1FbFhaa2dBc0xjQXdNNFFDN0lBQ0F3QU1GR0loU2tBQkhzQVlNZ2pJM2dBaEprQUZFYnlWenp4SzY0UTV5b0FBSGlac2p5NUpEbEZnVnNJTFhFSFYxY3VIaWpPU1JjckZEWmhBbUdhUUM3Q2Vaa1pNb0UwRCtEenpBQUFvSkVWRWVDRDgvMTR6ZzZ1enM0MmpyWU9YeTNxdndiL0ltSmk0LzdsejZ0d1FBQUE0WFIrMGY0c0w3TWFnRHNHZ0czK29pWHVCR2hlQzZCMTk0dG1zZzlBdFFDZzZkcFg4M0Q0Zmp3OFJhR1F1ZG5aNWVUazJFckVRbHRoeWxkOS9tZkNYOEJYL1d6NWZqejg5L1hndnVJa2dUSmRnVWNFK09EQ3pQUk1wUnpQa2dtRVl0em1qMGY4dHd2Ly9CM1RJc1JKWXJsWUtoVGpVUkp4amtTYWpQTXlwU0tKUXBJcHhTWFMvMlRpM3l6N0F6N2ZOUUN3YWo0QmU1RXRxRjFqQS9aTEp4QllkTURpOXdBQThydHZ3ZFFvQ0FPQWFJUGh6M2YvN3ovOVI2QWxBSUJtU1pKeEFBQmVSQ1F1Vk1xelA4Y0lBQUJFb0lFcXNFRWI5TUVZTE1BR0hNRUYzTUVML0dBMmhFSWt4TUpDRUVJS1pJQWNjbUFwcklKQ0tJYk5zQjBxWUMvVVFCMDB3RkZvaHBOd0RpN0NWYmdPUFhBUCttRUluc0VvdklFSkJFSElDQk5oSWRxSUFXS0tXQ09PQ0JlWmhmZ2h3VWdFRW9za0lNbUlGRkVpUzVFMVNERlNpbFFnVlVnZDhqMXlBam1IWEVhNmtUdklBREtDL0lhOFJ6R1VnYkpSUGRRTXRVTzVxRGNhaEVhaUM5QmtkREdhanhhZ205Qnl0Qm85akRhaDU5Q3JhQS9hano1RHh6REE2QmdITThSc01DN0d3MEt4T0N3SmsyUExzU0tzREt2R0dyQldyQU83aWZWano3RjNCQktCUmNBSk5nUjNRaUJoSGtGSVdFeFlUdGhJcUNBY0pEUVIyZ2szQ1FPRVVjSW5JcE9vUzdRbXVoSDV4QmhpTWpHSFdFZ3NJOVlTanhNdkVIdUlROFEzSkJLSlF6SW51WkFDU2JHa1ZOSVMwa2JTYmxJajZTeXBtelJJR2lPVHlkcGthN0lIT1pRc0lDdkloZVNkNU1Qa00rUWI1Q0h5V3dxZFlrQnhwUGhUNGloU3ltcEtHZVVRNVRUbEJtV1lNa0ZWbzVwUzNhaWhWQkUxajFwQ3JhRzJVcTlSaDZnVE5IV2FPYzJERmtsTHBhMmlsZE1hYUJkbzkybXY2SFM2RWQyVkhrNlgwRmZTeStsSDZKZm9BL1IzREEyR0ZZUEhpR2NvR1pzWUJ4aG5HWGNZcjVoTXBoblRpeG5IVkRBM01ldVk1NWtQbVc5VldDcTJLbndWa2NvS2xVcVZKcFViS2k5VXFhcW1xdDZxQzFYelZjdFVqNmxlVTMydVJsVXpVK09wQ2RTV3ExV3FuVkRyVXh0VFo2azdxSWVxWjZodlZEK2tmbG45aVFaWncwekRUME9rVWFDeFgrTzh4aUFMWXhtemVDd2hhdzJyaG5XQk5jUW1zYzNaZkhZcXU1ajlIYnVMUGFxcG9UbERNMG96VjdOUzg1Um1Qd2ZqbUhING5IUk9DZWNvcDVmemZvcmVGTzhwNGlrYnBqUk11VEZsWEd1cWxwZVdXS3RJcTFHclIrdTlOcTd0cDUybXZVVzdXZnVCRGtISFNpZGNKMGRuajg0Rm5lZFQyVlBkcHdxbkZrMDlPdld1THFwcnBSdWh1MFIzdjI2bjdwaWV2bDZBbmt4dnA5NTV2ZWY2SEgwdi9WVDliZnFuOVVjTVdBYXpEQ1FHMnd6T0dEekZOWEZ2UEIwdng5dnhVVU5kdzBCRHBXR1ZZWmZoaEpHNTBUeWoxVWFOUmcrTWFjWmM0eVRqYmNadHhxTW1CaVloSmt0TjZrM3VtbEpOdWFZcHBqdE1PMHpIemN6Tm9zM1dtVFdiUFRIWE11ZWI1NXZYbTkrM1lGcDRXaXkycUxhNFpVbXk1RnFtV2U2MnZHNkZXamxacFZoVldsMnpScTJkclNYV3U2MjdweEdudVU2VFRxdWUxbWZEc1BHMnliYXB0eG13NWRnRzI2NjJiYlo5WVdkaUYyZTN4YTdEN3BPOWszMjZmWTM5UFFjTmg5a09xeDFhSFg1enRISVVPbFk2M3ByT25PNC9mY1gwbHVrdloxalBFTS9ZTStPMkU4c3B4R21kVTV2VFIyY1haN2x6Zy9PSWk0bExnc3N1bHo0dW14dkczY2k5NUVwMDlYRmQ0WHJTOVoyYnM1dkM3YWpicis0MjdtbnVoOXlmekRTZktaNVpNM1BRdzhoRDRGSGwwVDhMbjVVd2E5K3NmazlEVDRGbnRlY2pMMk12a1ZldDE3QzNwWGVxOTJIdkZ6NzJQbktmNHo3alBEZmVNdDVaWDh3M3dMZkl0OHRQdzIrZVg0WGZRMzhqLzJUL2V2L1JBS2VBSlFGbkE0bUJRWUZiQXZ2NGVud2h2NDQvT3R0bDlyTFo3VUdNb0xsQkZVR1BncTJDNWNHdElXakk3SkN0SWZmbm1NNlJ6bWtPaFZCKzZOYlFCMkhtWVl2RGZnd25oWWVGVjRZL2puQ0lXQnJSTVpjMWQ5SGNRM1BmUlBwRWxrVGVtMmN4VHptdkxVbzFLajZxTG1vODJqZTZOTG8veGk1bVdjelZXSjFZU1d4TEhEa3VLcTQyYm15KzMvenQ4NGZpbmVJTDQzc1htQy9JWFhCNW9jN0M5SVduRnFrdUVpdzZsa0JNaUU0NGxQQkJFQ3FvRm93bDhoTjNKWTRLZWNJZHdtY2lMOUUyMFlqWVExd3FIazd5U0NwTmVwTHNrYncxZVNURk02VXM1Ym1FSjZtUXZFd05UTjJiT3A0V21uWWdiVEk5T3IweGc1S1JrSEZDcWlGTms3Wm42bWZtWm5iTHJHV0ZzdjdGYm91M0x4NlZCOGxyczVDc0JWa3RDclpDcHVoVVdpalhLZ2V5WjJWWFpyL05pY281bHF1ZUs4M3R6TFBLMjVBM25PK2YvKzBTd2hMaGtyYWxoa3RYTFIxWTVyMnNham15UEhGNTJ3cmpGUVVyaGxZR3JEeTRpcllxYmRWUHErMVhsNjUrdlNaNlRXdUJYc0hLZ3NHMUFXdnJDMVVLNVlWOTY5elg3VjFQV0M5WjM3Vmgrb2FkR3o0VmlZcXVGTnNYbHhWLzJDamNlT1ViaDIvS3Y1bmNsTFNwcThTNVpNOW0wbWJwNXQ0dG5sc09scXFYNXBjT2JnM1oyclFOMzFhMDdmWDJSZHN2bDgwbzI3dUR0a081bzc4OHVMeGxwOG5PelRzL1ZLUlU5RlQ2VkRidTB0MjFZZGY0YnRIdUczdTg5alRzMWR0YnZQZjlQc20rMjFVQlZVM1ZadFZsKzBuN3MvYy9yb21xNmZpVysyMWRyVTV0Y2UzSEE5SUQvUWNqRHJiWHVkVFZIZEk5VkZLUDFpdnJSdzdISDc3K25lOTNMUTAyRFZXTm5NYmlJM0JFZWVUcDl3bmY5eDROT3RwMmpIdXM0UWZUSDNZZFp4MHZha0thOHBwR20xT2ErMXRpVzdwUHpEN1IxdXJlZXZ4SDJ4OFBuRFE4V1hsSzgxVEphZHJwZ3RPVFovTFBqSjJWblgxK0x2bmNZTnVpdG52blk4N2ZhZzl2NzdvUWRPSFNSZitMNXp1OE84NWM4cmgwOHJMYjVSTlh1RmVhcnpwZmJlcDA2anorazlOUHg3dWN1NXF1dVZ4cnVlNTZ2YlY3WnZmcEc1NDN6dDMwdlhueEZ2L1cxWjQ1UGQyOTgzcHY5OFgzOWQ4VzNYNXlKLzNPeTd2WmR5ZnVyYnhQdkYvMFFPMUIyVVBkaDlVL1cvN2MyTy9jZjJyQWQ2RHowZHhIOXdhRmc4LytrZldQRDBNRmo1bVB5NFlOaHV1ZU9ENDVPZUkvY3YzcC9LZER6MlRQSnA0WC9xTCt5NjRYRmk5KytOWHIxODdSbU5HaGwvS1hrNzl0ZktYOTZzRHJHYS9ieHNMR0hyN0plRE14WHZSVysrM0JkOXgzSGUrajN3OVA1SHdnZnlqL2FQbXg5VlBRcC91VEdaT1Qvd1FEbVBQODd6V1VnZ0FBQUJsMFJWaDBVMjltZEhkaGNtVUFRV1J2WW1VZ1NXMWhaMlZTWldGa2VYSEpaVHdBQUFNaGFWUllkRmhOVERwamIyMHVZV1J2WW1VdWVHMXdBQUFBQUFBOFAzaHdZV05yWlhRZ1ltVm5hVzQ5SXUrN3Z5SWdhV1E5SWxjMVRUQk5jRU5sYUdsSWVuSmxVM3BPVkdONmEyTTVaQ0kvUGlBOGVEcDRiWEJ0WlhSaElIaHRiRzV6T25nOUltRmtiMkpsT201ek9tMWxkR0V2SWlCNE9uaHRjSFJyUFNKQlpHOWlaU0JZVFZBZ1EyOXlaU0ExTGpZdFl6RTBNaUEzT1M0eE5qQTVNalFzSURJd01UY3ZNRGN2TVRNdE1ERTZNRFk2TXprZ0lDQWdJQ0FnSUNJK0lEeHlaR1k2VWtSR0lIaHRiRzV6T25Ka1pqMGlhSFIwY0RvdkwzZDNkeTUzTXk1dmNtY3ZNVGs1T1M4d01pOHlNaTF5WkdZdGMzbHVkR0Y0TFc1ekl5SStJRHh5WkdZNlJHVnpZM0pwY0hScGIyNGdjbVJtT21GaWIzVjBQU0lpSUhodGJHNXpPbmh0Y0QwaWFIUjBjRG92TDI1ekxtRmtiMkpsTG1OdmJTOTRZWEF2TVM0d0x5SWdlRzFzYm5NNmVHMXdUVTA5SW1oMGRIQTZMeTl1Y3k1aFpHOWlaUzVqYjIwdmVHRndMekV1TUM5dGJTOGlJSGh0Ykc1ek9uTjBVbVZtUFNKb2RIUndPaTh2Ym5NdVlXUnZZbVV1WTI5dEwzaGhjQzh4TGpBdmMxUjVjR1V2VW1WemIzVnlZMlZTWldZaklpQjRiWEE2UTNKbFlYUnZjbFJ2YjJ3OUlrRmtiMkpsSUZCb2IzUnZjMmh2Y0NCRFF5QW9WMmx1Wkc5M2N5a2lJSGh0Y0UxTk9rbHVjM1JoYm1ObFNVUTlJbmh0Y0M1cGFXUTZNell6UVVJeU0wRTNOVEpDTVRGRlFVRTFNRUpFUTBVNU9UazJSRUpHUVVZaUlIaHRjRTFOT2tSdlkzVnRaVzUwU1VROUluaHRjQzVrYVdRNk16WXpRVUl5TTBJM05USkNNVEZGUVVFMU1FSkVRMFU1T1RrMlJFSkdRVVlpUGlBOGVHMXdUVTA2UkdWeWFYWmxaRVp5YjIwZ2MzUlNaV1k2YVc1emRHRnVZMlZKUkQwaWVHMXdMbWxwWkRvek5qTkJRakl6T0RjMU1rSXhNVVZCUVRVd1FrUkRSVGs1T1RaRVFrWkJSaUlnYzNSU1pXWTZaRzlqZFcxbGJuUkpSRDBpZUcxd0xtUnBaRG96TmpOQlFqSXpPVGMxTWtJeE1VVkJRVFV3UWtSRFJUazVPVFpFUWtaQlJpSXZQaUE4TDNKa1pqcEVaWE5qY21sd2RHbHZiajRnUEM5eVpHWTZVa1JHUGlBOEwzZzZlRzF3YldWMFlUNGdQRDk0Y0dGamEyVjBJR1Z1WkQwaWNpSS9QbXVTQVdzQUFBQTZTVVJCVkhqYVl2ei8vejhETlFBVEVPTXk2VCtwQmpGaTBmUWZLazZTUVF4b2hwRnNDTEpCeUlZeGtodEdER2lHTVZERElMSUJRSUFCQVBqVUNnc09VZzZJQUFBQUFFbEZUa1N1UW1DQyk7YmFja2dyb3VuZC1yZXBlYXQ6bm8tcmVwZWF0O2JhY2tncm91bmQtcG9zaXRpb246Y2VudGVyIHJpZ2h0fSNjb250cm9sS2l0IC5wYW5lbCAuc2xpZGVyLWhhbmRsZSwjY29udHJvbEtpdCAucGFuZWwgLnNsaWRlci1zbG90LCNjb250cm9sS2l0IC5wYW5lbCAuc2xpZGVyLXdyYXAsI2NvbnRyb2xLaXQgLnBhbmVsIC53cmFwLXNsaWRlcnstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3h9I2NvbnRyb2xLaXQgLnBhbmVsIC53cmFwLXNsaWRlcnt3aWR0aDo3MCU7cGFkZGluZzo2cHggMCAwO2Zsb2F0OnJpZ2h0O2hlaWdodDoxMDAlfSNjb250cm9sS2l0IC5wYW5lbCAud3JhcC1zbGlkZXIgaW5wdXRbdHlwZT10ZXh0XXt3aWR0aDoyMCU7dGV4dC1hbGlnbjpjZW50ZXI7cGFkZGluZzowO2Zsb2F0OnJpZ2h0fSNjb250cm9sS2l0IC5wYW5lbCAuc2xpZGVyLXdyYXB7ZmxvYXQ6bGVmdDtjdXJzb3I6ZXctcmVzaXplO3dpZHRoOjc4JX0jY29udHJvbEtpdCAucGFuZWwgLnNsaWRlci1zbG90e3dpZHRoOjEwMCU7aGVpZ2h0OjE4cHg7cGFkZGluZzo0cHggMnB4O2JhY2tncm91bmQtY29sb3I6IzFlMjIyNDtib3JkZXI6bm9uZTtib3gtc2hhZG93OjAgMCAwIDFweCAjMUYxRjFGIGluc2V0O2JvcmRlci1yYWRpdXM6MDstbW96LWJvcmRlci1yYWRpdXM6MH0jY29udHJvbEtpdCAucGFuZWwgLnNsaWRlci1oYW5kbGV7cG9zaXRpb246cmVsYXRpdmU7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJTtiYWNrZ3JvdW5kOiMwMDAwZWF9I2NvbnRyb2xLaXQgLnBhbmVsIC5jb2xvcnstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7LXdlYmtpdC10b3VjaC1jYWxsb3V0Om5vbmU7LXdlYmtpdC11c2VyLXNlbGVjdDpub25lOy1raHRtbC11c2VyLXNlbGVjdDpub25lOy1tb3otdXNlci1zZWxlY3Q6bm9uZTstbXMtdXNlci1zZWxlY3Q6bm9uZTt1c2VyLXNlbGVjdDpub25lO2N1cnNvcjpwb2ludGVyO3dpZHRoOjEwMCU7aGVpZ2h0OjE4cHg7cGFkZGluZzowO2JvcmRlcjpub25lO2JhY2tncm91bmQ6I2ZmZjtib3gtc2hhZG93OjAgMCAwIDFweCAjMTExMzE0IGluc2V0O3RleHQtYWxpZ246Y2VudGVyO2xpbmUtaGVpZ2h0OjE4cHg7Ym9yZGVyLXJhZGl1czowOy1tb3otYm9yZGVyLXJhZGl1czowfSNjb250cm9sS2l0IC5wYW5lbCAuZ3JhcGgtc2xpZGVyLXgtd3JhcCwjY29udHJvbEtpdCAucGFuZWwgLmdyYXBoLXNsaWRlci15LXdyYXB7cG9zaXRpb246YWJzb2x1dGU7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94fSNjb250cm9sS2l0IC5wYW5lbCAuZ3JhcGgtc2xpZGVyLXgtd3JhcHtib3R0b206MDtsZWZ0OjA7d2lkdGg6MTAwJTtwYWRkaW5nOjZweCAyMHB4IDZweCA2cHh9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaC1zbGlkZXIteS13cmFwe3RvcDowO3JpZ2h0OjA7aGVpZ2h0OjEwMCU7cGFkZGluZzo2cHggNnB4IDIwcHh9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaC1zbGlkZXIteCwjY29udHJvbEtpdCAucGFuZWwgLmdyYXBoLXNsaWRlci15ey13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveDtib3JkZXItcmFkaXVzOjJweDstbW96LWJvcmRlci1yYWRpdXM6MnB4O2JhY2tncm91bmQ6cmdiYSgyNCwyNywyOSwuNSk7Ym9yZGVyOjFweCBzb2xpZCAjMTgxYjFkfSNjb250cm9sS2l0IC5wYW5lbCAuZ3JhcGgtc2xpZGVyLXh7aGVpZ2h0OjhweH0jY29udHJvbEtpdCAucGFuZWwgLmdyYXBoLXNsaWRlci15e3dpZHRoOjhweDtoZWlnaHQ6MTAwJX0jY29udHJvbEtpdCAucGFuZWwgLmdyYXBoLXNsaWRlci14LWhhbmRsZSwjY29udHJvbEtpdCAucGFuZWwgLmdyYXBoLXNsaWRlci15LWhhbmRsZXstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7Y3Vyc29yOnBvaW50ZXI7Ym9yZGVyOjFweCBzb2xpZCAjMTgxYjFkO2JhY2tncm91bmQ6IzMwMzYzOX0jY29udHJvbEtpdCAucGFuZWwgLmdyYXBoLXNsaWRlci14LWhhbmRsZXt3aWR0aDoyMHB4O2hlaWdodDoxMDAlO2JvcmRlci10b3A6bm9uZTtib3JkZXItYm90dG9tOm5vbmV9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaC1zbGlkZXIteS1oYW5kbGV7d2lkdGg6MTAwJTtoZWlnaHQ6MjBweDtib3JkZXItbGVmdDpub25lO2JvcmRlci1yaWdodDpub25lfSNjb250cm9sS2l0IC5zdWItZ3JvdXAgLndyYXAgLndyYXAgLndyYXB7d2lkdGg6MjUlIWltcG9ydGFudDtwYWRkaW5nOjAhaW1wb3J0YW50O2Zsb2F0OmxlZnQhaW1wb3J0YW50fSNjb250cm9sS2l0IC5zdWItZ3JvdXAgLndyYXAgLndyYXAgLndyYXAgLmxhYmVse3dpZHRoOjEwMCUhaW1wb3J0YW50O3BhZGRpbmc6NXB4IDAgMCFpbXBvcnRhbnQ7Y29sb3I6Izg3ODc4NyFpbXBvcnRhbnQ7dGV4dC1hbGlnbjpjZW50ZXIhaW1wb3J0YW50O3RleHQtdHJhbnNmb3JtOnVwcGVyY2FzZSFpbXBvcnRhbnQ7Zm9udC13ZWlnaHQ6NzAwIWltcG9ydGFudDt0ZXh0LXNoYWRvdzoxcHggMXB4ICMxYTFhMWEhaW1wb3J0YW50fSNjb250cm9sS2l0IC5zdWItZ3JvdXAgLndyYXAgLndyYXAgLndyYXAgaW5wdXRbdHlwZT10ZXh0XXtwYWRkaW5nOjA7dGV4dC1hbGlnbjpjZW50ZXJ9I2NvbnRyb2xLaXQgLm9wdGlvbnN7cG9pbnRlci1ldmVudHM6YXV0bzstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym9yZGVyOjFweCBzb2xpZCAjMUYxRjFGO2JvcmRlci1yYWRpdXM6MnB4Oy1tb3otYm9yZGVyLXJhZGl1czoycHg7cG9zaXRpb246YWJzb2x1dGU7ei1pbmRleDoyMTQ3NDgzNjM4O2xlZnQ6MDt0b3A6MDt3aWR0aDphdXRvO2hlaWdodDphdXRvO2JveC1zaGFkb3c6MCAtMXB4IDAgMCAjNGE0YTRhIGluc2V0O2JhY2tncm91bmQtY29sb3I6IzMzMztmb250LWZhbWlseTptb25vc3BhY2U7Zm9udC1zaXplOjEwcHg7Y29sb3I6I2ZmZjtvdmVyZmxvdzpoaWRkZW59I2NvbnRyb2xLaXQgLm9wdGlvbnMgdWx7d2lkdGg6MTAwJTtsaXN0LXN0eWxlOm5vbmU7bWFyZ2luOjA7cGFkZGluZzowfSNjb250cm9sS2l0IC5vcHRpb25zIHVsIGxpe21hcmdpbjowO3dpZHRoOjEwMCU7aGVpZ2h0OjIycHg7bGluZS1oZWlnaHQ6MjJweDtwYWRkaW5nOjAgMjBweCAwIDEwcHg7b3ZlcmZsb3c6aGlkZGVuO3doaXRlLXNwYWNlOm5vcm1hbDt0ZXh0LW92ZXJmbG93OmVsbGlwc2lzO2N1cnNvcjpwb2ludGVyfSNjb250cm9sS2l0IC5vcHRpb25zIHVsIGxpOmhvdmVye2JhY2tncm91bmQtY29sb3I6IzAwMDBlYX0jY29udHJvbEtpdCAub3B0aW9ucyB1bCAubGktc2VsZWN0ZWR7YmFja2dyb3VuZC1jb2xvcjojMjIyfSNjb250cm9sS2l0IC5vcHRpb25zIC5jb2xvcnstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3h9I2NvbnRyb2xLaXQgLm9wdGlvbnMgLmNvbG9yIC5saS1zZWxlY3RlZCwjY29udHJvbEtpdCAub3B0aW9ucyAuY29sb3IgbGl7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O3BhZGRpbmc6MDtoZWlnaHQ6MThweDtsaW5lLWhlaWdodDoxOHB4O3RleHQtYWxpZ246Y2VudGVyfSNjb250cm9sS2l0IC5vcHRpb25zIC5jb2xvciAubGktc2VsZWN0ZWQ6aG92ZXIsI2NvbnRyb2xLaXQgLm9wdGlvbnMgLmNvbG9yIGxpOmhvdmVye2JhY2tncm91bmQ6MCAwO2ZvbnQtd2VpZ2h0OjcwMH0jY29udHJvbEtpdCAub3B0aW9ucyAuY29sb3IgLmxpLXNlbGVjdGVke2ZvbnQtd2VpZ2h0OjcwMH0jY29udHJvbEtpdCAucGFuZWwgLmxhYmVsLCNjb250cm9sS2l0IC5waWNrZXIgLmxhYmVse3dpZHRoOjEwMCU7ZmxvYXQ6bGVmdDtmb250LXNpemU6MTBweDtmb250LXdlaWdodDo3MDA7dGV4dC1zaGFkb3c6MCAxcHggIzAwMDtvdmVyZmxvdzpoaWRkZW47d2hpdGUtc3BhY2U6bm93cmFwO3RleHQtb3ZlcmZsb3c6ZWxsaXBzaXM7Y3Vyc29yOmRlZmF1bHR9I2NvbnRyb2xLaXQgLnBhbmVsIC5oZWFkLCNjb250cm9sS2l0IC5wYW5lbCAucGFuZWwtaGVhZC1pbmFjdGl2ZSwjY29udHJvbEtpdCAucGlja2VyIC5oZWFke2hlaWdodDozMHB4O3BhZGRpbmc6MCAyMHB4IDAgMTBweDtiYWNrZ3JvdW5kOiMxQTFBMUE7b3ZlcmZsb3c6aGlkZGVufSNjb250cm9sS2l0IC5wYW5lbCAuaGVhZCAud3JhcCwjY29udHJvbEtpdCAucGFuZWwgLnBhbmVsLWhlYWQtaW5hY3RpdmUgLndyYXAsI2NvbnRyb2xLaXQgLnBpY2tlciAuaGVhZCAud3JhcHt3aWR0aDphdXRvO2hlaWdodDphdXRvO21hcmdpbjowO3BhZGRpbmc6MDtwb3NpdGlvbjpyZWxhdGl2ZTtvdmVyZmxvdzpoaWRkZW59I2NvbnRyb2xLaXQgLnBhbmVsIC5oZWFkIC5sYWJlbCwjY29udHJvbEtpdCAucGlja2VyIC5oZWFkIC5sYWJlbHtjdXJzb3I6cG9pbnRlcjtsaW5lLWhlaWdodDozMnB4O2NvbG9yOiM2NTY5NmJ9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuaGVhZHtoZWlnaHQ6MzJweDtwYWRkaW5nOjAgMjBweCAwIDEwcHg7Ym9yZGVyLXRvcDoxcHggc29saWQgIzRmNGY0Zjtib3JkZXItYm90dG9tOjFweCBzb2xpZCAjMjYyNjI2O2JhY2tncm91bmQ6IzAwMDtjdXJzb3I6cG9pbnRlcn0jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5oZWFkIC5sYWJlbHtmb250LXNpemU6MTJweDtsaW5lLWhlaWdodDozMnB4O2NvbG9yOiNmZmZ9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuaGVhZDpob3Zlcntib3JkZXItdG9wOjFweCBzb2xpZCAjNTI1MjUyO2JhY2tncm91bmQ6IzMzM30jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIGxpe2hlaWdodDozMnB4O3BhZGRpbmc6MCAxMHB4fSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLnN1Yi1ncm91cC1saXN0IC5zdWItZ3JvdXA6bGFzdC1vZi10eXBle2JvcmRlci1ib3R0b206bm9uZX0jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3Vwe3BhZGRpbmc6MDtoZWlnaHQ6YXV0bztib3JkZXItYm90dG9tOjFweCBzb2xpZCAjMjQyNDI0fSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLnN1Yi1ncm91cC1saXN0IC5zdWItZ3JvdXAgdWx7b3ZlcmZsb3c6aGlkZGVufSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLnN1Yi1ncm91cC1saXN0IC5zdWItZ3JvdXAgdWwgbGl7YmFja2dyb3VuZDphdXRvO2JvcmRlci1ib3R0b206MXB4IHNvbGlkICMyZTJlMmV9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cCB1bCBsaTpob3ZlciAuc2xpZGVyLXNsb3QsI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cCB1bCBsaTpob3ZlciBpbnB1dFt0eXBlPXRleHRde2JhY2tncm91bmQtY29sb3I6IzMzM30jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3VwIHVsIGxpOmxhc3Qtb2YtdHlwZXtib3JkZXItYm90dG9tOm5vbmV9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cDpmaXJzdC1jaGlsZHttYXJnaW4tdG9wOjB9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cCAuaGVhZCwjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3VwIC5oZWFkLWluYWN0aXZle2N1cnNvcjpwb2ludGVyfSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLnN1Yi1ncm91cC1saXN0IC5zdWItZ3JvdXAgLmhlYWR7aGVpZ2h0OjI3cHg7cGFkZGluZzowIDIwcHggMCAxMHB4O2JvcmRlci10b3A6bm9uZTtib3JkZXItYm90dG9tOjFweCBzb2xpZCAjMjQyNDI0O2JhY2tncm91bmQtaW1hZ2U6bm9uZTtiYWNrZ3JvdW5kLWNvbG9yOiMxMTF9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cCAuaGVhZDpob3ZlcntiYWNrZ3JvdW5kOiMzMzN9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cCAuaGVhZC1pbmFjdGl2ZXstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7aGVpZ2h0OjI3cHg7cGFkZGluZzowIDIwcHggMCAxMHB4O2JveC1zaGFkb3c6MCAxcHggMCAwICM0MDQwNDAgaW5zZXQ7YmFja2dyb3VuZC1jb2xvcjojMTExO2N1cnNvcjpwb2ludGVyfSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLnN1Yi1ncm91cC1saXN0IC5zdWItZ3JvdXAgLmhlYWQtaW5hY3RpdmU6aG92ZXJ7Ym94LXNoYWRvdzowIDFweCAwIDAgIzQ3NDc0NyBpbnNldDtiYWNrZ3JvdW5kOiMzMzM7Y3Vyc29yOnBvaW50ZXJ9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cCAuaGVhZCAubGFiZWwsI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cCAuaGVhZC1pbmFjdGl2ZSAubGFiZWx7bWFyZ2luOjA7cGFkZGluZzowO2xpbmUtaGVpZ2h0OjI3cHg7Y29sb3I6I2ZmZjtmb250LXdlaWdodDo3MDA7Zm9udC1zaXplOjExcHg7dGV4dC1zaGFkb3c6MXB4IDFweCAjMDAwO3RleHQtdHJhbnNmb3JtOmNhcGl0YWxpemV9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cCAuaGVhZCAud3JhcCAubGFiZWwsI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cCAuaGVhZC1pbmFjdGl2ZSAud3JhcCAubGFiZWx7d2lkdGg6MTAwJTtmb250LXdlaWdodDo3MDA7Y29sb3I6I2ZmZjtwYWRkaW5nOjB9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cCAud3JhcCAubGFiZWx7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O2hlaWdodDoxMDAlO3dpZHRoOjMwJTtwYWRkaW5nOjEwcHggNnB4IDAgMDtmbG9hdDpsZWZ0O2ZvbnQtc2l6ZToxMHB4O2ZvbnQtd2VpZ2h0OjQwMDtjb2xvcjojYWViNWI4O3RleHQtc2hhZG93OjFweCAxcHggIzAwMH0jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3VwIC53cmFwIC53cmFwey13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveDt3aWR0aDo3MCU7cGFkZGluZzo1cHggMCAwO2Zsb2F0OnJpZ2h0O2hlaWdodDoxMDAlfSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXA6bGFzdC1jaGlsZCAuc2Nyb2xsLWJ1ZmZlcjpudGgtb2YtdHlwZSgzKSwjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwOmxhc3QtY2hpbGQgLnN1Yi1ncm91cC1saXN0e2JvcmRlci1ib3R0b206bm9uZX0jY29udHJvbEtpdCAucGFuZWwgLnNjcm9sbC13cmFwe3Bvc2l0aW9uOnJlbGF0aXZlO292ZXJmbG93OmhpZGRlbn0jY29udHJvbEtpdCAucGFuZWwgLnNjcm9sbC1idWZmZXJ7d2lkdGg6MTAwJTtoZWlnaHQ6OHB4O2JvcmRlci10b3A6MXB4IHNvbGlkICMzYjQ0NDc7Ym9yZGVyLWJvdHRvbToxcHggc29saWQgIzFlMjIyNH0jY29udHJvbEtpdCAucGFuZWwgLnNjcm9sbEJhcnstd2Via2l0LWJveC1zaXppbmc6Y29udGVudC1ib3g7LW1vei1ib3gtc2l6aW5nOmNvbnRlbnQtYm94O2JveC1zaXppbmc6Y29udGVudC1ib3g7d2lkdGg6MTVweDtoZWlnaHQ6MTAwJTtmbG9hdDpyaWdodDt0b3A6MDtwYWRkaW5nOjA7bWFyZ2luOjA7cG9zaXRpb246cmVsYXRpdmU7YmFja2dyb3VuZDojMjEyNjI4O2JhY2tncm91bmQtaW1hZ2U6bGluZWFyLWdyYWRpZW50KHRvIHJpZ2h0LCMyNDI0MjQgMCwjMkUyRTJFIDEwMCUpfSNjb250cm9sS2l0IC5wYW5lbCAuc2Nyb2xsQmFyIC50cmFja3twYWRkaW5nOjAgM3B4IDAgMnB4fSNjb250cm9sS2l0IC5wYW5lbCAuc2Nyb2xsQmFyIC50cmFjayAudGh1bWJ7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O3dpZHRoOjExcHg7cG9zaXRpb246YWJzb2x1dGU7Y3Vyc29yOnBvaW50ZXI7YmFja2dyb3VuZC1jb2xvcjojMzQzNDM0O2JvcmRlcjoxcHggc29saWQgIzFiMWYyMTtib3JkZXItcmFkaXVzOjEwcHg7LW1vei1ib3JkZXItcmFkaXVzOjEwcHg7Ym94LXNoYWRvdzppbnNldCAwIDFweCAwIDAgIzQzNGI1MH0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSwjY29udHJvbEtpdCAucGlja2VyIC5tZW51e2Rpc3BsYXk6bm9uZTtmbG9hdDpyaWdodDtwYWRkaW5nOjVweCAwIDB9I2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IGlucHV0W3R5cGU9YnV0dG9uXSwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIGlucHV0W3R5cGU9YnV0dG9uXSwjY29udHJvbEtpdCAucGlja2VyIC5tZW51IGlucHV0W3R5cGU9YnV0dG9uXXstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7Y3Vyc29yOnBvaW50ZXI7aGVpZ2h0OjIwcHg7Ym9yZGVyOm5vbmU7dmVydGljYWwtYWxpZ246dG9wO2JvcmRlci1yYWRpdXM6MDstbW96LWJvcmRlci1yYWRpdXM6MDtmb250LWZhbWlseTptb25vc3BhY2U7Zm9udC1zaXplOjExcHg7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOiNhYWE7dGV4dC1zaGFkb3c6MCAtMXB4ICMwMDA7dGV4dC10cmFuc2Zvcm06dXBwZXJjYXNlO2JveC1zaGFkb3c6MCAwIDAgMXB4ICMxMzEzMTMgaW5zZXQsLTFweCAycHggMCAwICMyMTI1MjcgaW5zZXQ7b3V0bGluZTowfSNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnV0dG9uLW1lbnUtY2xvc2UsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idXR0b24tbWVudS1oaWRlLCNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnV0dG9uLW1lbnUtc2hvdywjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS1jbG9zZSwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS1oaWRlLCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LXNob3csI2NvbnRyb2xLaXQgLnBpY2tlciAubWVudSAuYnV0dG9uLW1lbnUtY2xvc2UsI2NvbnRyb2xLaXQgLnBpY2tlciAubWVudSAuYnV0dG9uLW1lbnUtaGlkZSwjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idXR0b24tbWVudS1zaG93e3dpZHRoOjIwcHg7bWFyZ2luLWxlZnQ6NHB4fSNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnV0dG9uLW1lbnUtaGlkZSwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS1oaWRlLCNjb250cm9sS2l0IC5waWNrZXIgLm1lbnUgLmJ1dHRvbi1tZW51LWhpZGV7YmFja2dyb3VuZDp1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFGQ0FZQUFBQjRrYTFWQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQUdSSlJFRlVlTnBpZFBVTllvQ0JVMGNPMURNd01EQ1kyVGcwd3NSWWtDVmxGWlVib0d5NEltWmxkVTI0cEp5U0NnTy9vQkFEQXdPRHcvVkw1eG1rNVJRT01yOTkvUkl1Q1FQSWlsak1iQndZR0JnWUdINy8vTW1BRENTbFpSa2twV1VaQUFNQXZUc2dYQnZPc3EwQUFBQUFTVVZPUks1Q1lJST0pIDUwJSA1MCUgbm8tcmVwZWF0LCMxYTFkMWZ9I2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idXR0b24tbWVudS1oaWRlOmhvdmVyLCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LWhpZGU6aG92ZXIsI2NvbnRyb2xLaXQgLnBpY2tlciAubWVudSAuYnV0dG9uLW1lbnUtaGlkZTpob3ZlcntiYWNrZ3JvdW5kOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBR1JKUkVGVWVOcGlkUFVOWW9DQlUwY08xRE13TURDWTJUZzB3c1JZa0NWbEZaVWJvR3k0SW1abGRVMjRwSnlTQ2dPL29CQURBd09Edy9WTDV4bWs1UlFPTXI5OS9SSXVDUVBJaWxqTWJCd1lHQmdZR0g3Ly9NbUFEQ1NsWlJra3BXVVpBQU1BdlRzZ1hCdk9zcTBBQUFBQVNVVk9SSzVDWUlJPSkgNTAlIDUwJSBuby1yZXBlYXQsIzAwMDtib3gtc2hhZG93OiNmZmYgMCwjMDAwIDEwMCV9I2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idXR0b24tbWVudS1zaG93LCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LXNob3csI2NvbnRyb2xLaXQgLnBpY2tlciAubWVudSAuYnV0dG9uLW1lbnUtc2hvd3tiYWNrZ3JvdW5kOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBRnBKUkVGVWVOcHNqREVPZ0NBUUJPYzRlcU5mb0NCOHdNckNud2svODJFSFdFa3djYXRKWnJLeXJGc0dMdjVYL0g2Y3FQYzQxWTlwdFZMTjBCRFQzVnNURVRuRnVWa1dJR3VJQ1dCRXZmY2hBZnowbXF2WjRCZWVBUUR6VmlNekp5MFJYZ0FBQUFCSlJVNUVya0pnZ2c9PSkgNTAlIDUwJSBuby1yZXBlYXQsIzFhMWQxZn0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ1dHRvbi1tZW51LXNob3c6aG92ZXIsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtc2hvdzpob3ZlciwjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idXR0b24tbWVudS1zaG93OmhvdmVye2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBRkNBWUFBQUI0a2ExVkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFGcEpSRUZVZU5wc2pERU9nQ0FRQk9jNGVxTmZvQ0I4d01yQ253ay84MkVIV0Vrd2NhdEpackt5ckZzR0x2NVgvSDZjcVBjNDFZOXB0VkxOMEJEVDNWc1RFVG5GdVZrV0lHdUlDV0JFdmZjaEFmejBtcXZaNEJlZUFRRHpWaU16SnkwUlhnQUFBQUJKUlU1RXJrSmdnZz09KSA1MCUgNTAlIG5vLXJlcGVhdCwjMDAwO2JveC1zaGFkb3c6I2ZmZiAwLCMwMDAgMTAwJX0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ1dHRvbi1tZW51LWNsb3NlLCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LWNsb3NlLCNjb250cm9sS2l0IC5waWNrZXIgLm1lbnUgLmJ1dHRvbi1tZW51LWNsb3Nle2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBSkNBWUFBQUFQVTIwdUFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFRMUpSRUZVZU5wTTBEOUxBbUVBeC9IdlBYZURUcWVYcFZlWVlqcFlHUTFoQlE3U254ZlEwcEExRkVWYnI2RmVSZ1p1Q2IyRW9PQ2dtMjZzcG9JZ2lLQlFRYUlVbnVjZVcyN3d0MzZIRC93TU8rbmNBbmExVmw5amJJSHZ0WUFOYTJsbHRZSmh1SUh2WFZWcjlaTW9IcFhtRncvdHBDT3RXQ3grTDB4enYxaGVPQTU4THc2OHBxZG56bE5wbDFES053czQwR0g0a0pyS1hBcGhOZ1ovdjJUekJaU1ViYUFoSXJMWi9mNjZtOHk0ekJhSy9QVDdYYUFCSUNMemJEZ2NiT2t3SkZRS1BkSVRnZSsxQVF3NzZkeTQyZHh1ZnE1RXFGUUxlQmRDWFBSNkhWNmVIeitNOWZyMlo4SnhYQ1ZsRXppTnlEM1RzcTZWa3Nvc1Y1WTN0ZFlkWUdmc2hxZVIxamtESS9FL0FPOHJZUmx3WEJxdUFBQUFBRWxGVGtTdVFtQ0MpIDUwJSA1MCUgbm8tcmVwZWF0LCMxYTFkMWZ9I2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idXR0b24tbWVudS1jbG9zZTpob3ZlciwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS1jbG9zZTpob3ZlciwjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idXR0b24tbWVudS1jbG9zZTpob3ZlcntiYWNrZ3JvdW5kOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUpDQVlBQUFBUFUyMHVBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBUTFKUkVGVWVOcE0wRDlMQW1FQXgvSHZQWGVEVHFlWHBWZVlZanBZR1ExaEJRN1NueGZRMHBBMUZFVmJyNkZlUmdadUNiMkVvT0NnbTI2c3BvSWdpS0JRUWFJVW51Y2VXMjd3dDM2SEQvd01PK25jQW5hMVZsOWpiSUh2dFlBTmEybGx0WUpodUlIdlhWVnI5Wk1vSHBYbUZ3L3RwQ090V0N4K0wweHp2MWhlT0E1OEx3NjhwcWRuemxOcGwxREtOd3M0MEdINGtKcktYQXBoTmdaL3YyVHpCWlNVYmFBaElyTFovZjY2bTh5NHpCYUsvUFQ3WGFBQklDTHpiRGdjYk9rd0pGUUtQZElUZ2UrMUFRdzc2ZHk0MmR4dWZxNUVxRlFMZUJkQ1hQUjZIVjZlSHorTTlmcjJaOEp4WENWbEV6aU55RDNUc3E2Vmtzb3NWNVkzdGRZZFlHZnNocWVSMWprREkvRS9BTzhyWVJsd1hCcXVBQUFBQUVsRlRrU3VRbUNDKSA1MCUgNTAlIG5vLXJlcGVhdCwjMDAwO2JveC1zaGFkb3c6I2ZmZiAwLCMwMDAgMTAwJX0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ1dHRvbi1tZW51LXVuZG8sI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtdW5kb3tiYWNrZ3JvdW5kOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUF3QUFBQUxDQVlBQUFCTGNHeGZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBWVZKUkVGVWVOcGNrRDFJVzFFWWhwOXo3cm0zb3FraHpaL3hENnRSMUVwRktlbGdobEJvblZ3S0RwYVdEbmJxMmxWRjBNSEJVYmRDcDVhQ1VpZ2RuSVNnb1VQQXFXTWxZc0dsTnRZSzFaaHp6cjFkVkc3emJ0L0w5N3g4N3ljZVR6MGxySEtwK0JKWUJIcXVyRy9BZkM1ZitBd2d3a0M1Vkh5YnlyVFBkdmRtQTlmMUJFSlFPLy9MWVdXZmsrT2ZTN2w4WWVFR0tKZUtyN05EOTlhVDZReldtSFBnRStBQU00N3JjblI0d0kvSy9xUzhUczkwZHErbE1oMVlZMWFCRnVBRjhBeVFWdXZOcnJ0OXhPS0pqeUlhdS9NT0dKcDQ5T1JoclhaaDlyN3ViZ1BQYy9uQ3IzQTM2VGpHOTMxSERZK09UeWpQNnc4QUtSMDFNdmFnY0ZxdHhvSC9nTFBUM3dleFJES3JJcmRiZDZUajlBc2hjRDBQUWFUYTNCSTVvVUZhMTNzSUFpVHd5cmQyd1dxTnFWL3VBUjNBY2NPclB5UlNiVXJYNjMvVWxiZmsrMzRGeEpkeXFkZ0VMQU8zZ0Rnd1BUQnkvM3B2Um9XQzNnTWtVbTNwU0RUNlJrcUpjbDNpeVhRUVdJczFaZ1hZVW8yMzlnNE0xc0t6MWZvN01BZHNBUHdiQUw5aGZ0dlRsTmtkQUFBQUFFbEZUa1N1UW1DQykgMjAlIDUwJSBuby1yZXBlYXQsIzFhMWQxZjtwYWRkaW5nOjAgNnB4IDFweCAwO3dpZHRoOjM4cHg7dmVydGljYWwtYWxpZ246dG9wO3RleHQtYWxpZ246ZW5kfSNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnV0dG9uLW1lbnUtdW5kbzpob3ZlciwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS11bmRvOmhvdmVye2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQXdBQUFBTENBWUFBQUJMY0d4ZkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFZVkpSRUZVZU5wY2tEMUlXMUVZaHA5ejdybTNvcWtoeloveEQ2dFIxRXBGS2VsZ2hsQm9uVndLRHBhV0RuYnEybFZGME1IQlViZENwNWFDVWlnZG5JU2dvVVBBcVdNbFlzR2xOdFlLMVpoenpyMWRWRzd6YnQvTDk3eDg3eWNlVHowbHJIS3ArQkpZQkhxdXJHL0FmQzVmK0F3Z3drQzVWSHlieXJUUGR2ZG1BOWYxQkVKUU8vL0xZV1dmaytPZlM3bDhZZUVHS0plS3I3TkQ5OWFUNlF6V21IUGdFK0FBTTQ3cmNuUjR3SS9LL3FTOFRzOTBkcStsTWgxWVkxYUJGdUFGOEF5UVZ1dk5ycnQ5eE9LSmp5SWF1L01PR0pwNDlPUmhyWFpoOXI3dWJnUFBjL25DcjNBMzZUakc5MzFIRFkrT1R5alA2dzhBS1IwMU12YWdjRnF0eG9IL2dMUFQzd2V4UkRLcklyZGJkNlRqOUFzaGNEMFBRYVRhM0JJNW9VRmExM3NJQWlUd3lyZDJ3V3FOcVYvdUFSM0FjY09yUHlSU2JVclg2My9VbGJmayszNEZ4SmR5cWRnRUxBTzNnRGd3UFRCeS8zcHZSb1dDM2dNa1VtM3BTRFQ2UmtxSmNsM2l5WFFRV0lzMVpnWFlVbzIzOWc0TTFzS3oxZm83TUFkc0FQd2JBTDloZnR2VGxOa2RBQUFBQUVsRlRrU3VRbUNDKSAyMCUgNTAlIG5vLXJlcGVhdCwjMDAwO2JveC1zaGFkb3c6I2ZmZiAwLCMwMDAgMTAwJX0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ1dHRvbi1tZW51LWxvYWQsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtbG9hZHttYXJnaW4tcmlnaHQ6MnB4fSNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnV0dG9uLW1lbnUtbG9hZCwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ1dHRvbi1tZW51LXNhdmUsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtbG9hZCwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS1zYXZle2JhY2tncm91bmQ6IzFhMWQxZjtmb250LXNpemU6OXB4IWltcG9ydGFudH0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ1dHRvbi1tZW51LWxvYWQ6aG92ZXIsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idXR0b24tbWVudS1zYXZlOmhvdmVyLCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LWxvYWQ6aG92ZXIsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtc2F2ZTpob3ZlcntiYWNrZ3JvdW5kOiMwMDB9I2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC53cmFwe2Rpc3BsYXk6bm9uZX0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZle3dpZHRoOjEwMCU7ZmxvYXQ6bGVmdH0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC53cmFwe2Rpc3BsYXk6aW5saW5lfSNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LWNsb3NlLCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LWhpZGUsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtc2hvd3tmbG9hdDpyaWdodH0jY29udHJvbEtpdCAucGFuZWwgLmFycm93LXMtbWF4e2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBRkNBWUFBQUI0a2ExVkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFHNUpSRUZVZU5waTVPRGlhbVJnWUtoandBNGFtVng4Z3hqbUwxckM4UDNyVnhROGIrRVNCaGZmSUFabU5SMjlBNWV2WFdkaVpHQzAxOVhTWkdCZ1lHQll2bVk5dzdJMTZ4b1pHQmdhV0tCRzFTOWJzKzQvQXdORFBRTURBMXlTZ1lHQmdkRW5QQWJaemdZMG1nRXdBRTlsSlQxbHJzZmZBQUFBQUVsRlRrU3VRbUNDKSBjZW50ZXIgbm8tcmVwZWF0fSNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3ctcy1taW57YmFja2dyb3VuZDp1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFGQ0FZQUFBQjRrYTFWQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQUZwSlJFRlVlTnBzaWlFT2dEQU1SZjhTeE5KeklZZkIxUFFrUTdSa1pjZkJZTG5iVUFzTDRjbjNYa2dzNk56WHFRQXdMK3ZlM1RUR0xXY0RnS1BXZDBvc2lFUmEzRnVudUxkSXBJa0ZpRVEyeHU4VUVvc0JVUHhqendBVFNqVi84cWxNR0FBQUFBQkpSVTVFcmtKZ2dnPT0pIGNlbnRlciBuby1yZXBlYXR9I2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvdy1zLW1heCwjY29udHJvbEtpdCAucGFuZWwgLmFycm93LXMtbWlue3dpZHRoOjEwMCU7aGVpZ2h0OjIwcHh9I2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvdy1iLW1heHtiYWNrZ3JvdW5kOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFjQUFBQUhDQVlBQUFERVVsZlRBQUFLUldsRFExQkpRME1nY0hKdlptbHNaUUFBZU5xZFUyZFVVK2tXUGZmZTlFSkxpSUNVUzI5U0ZRZ2dVa0tMZ0JTUkppb2hDUkJLaUNHaDJSVlJ3UkZGUlFRYnlLQ0lBNDZPZ0l3VlVTd01pZ3JZQitRaG9vNkRvNGlLeXZ2aGU2TnIxcnozNXMzK3RkYys1Nnp6bmJQUEI4QUlESlpJTTFFMWdBeXBRaDRSNElQSHhNYmg1QzVBZ1Fva2NBQVFDTE5rSVhQOUl3RUErSDQ4UENzaXdBZStBQUY0MHdzSUFNQk5tOEF3SElmL0QrcENtVndCZ0lRQndIU1JPRXNJZ0JRQVFIcU9RcVlBUUVZQmdKMllKbE1Bb0FRQVlNdGpZdU1BVUMwQVlDZC81dE1BZ0ozNG1Yc0JBRnVVSVJVQm9KRUFJQk5saUVRQWFEc0FyTTlXaWtVQVdEQUFGR1pMeERrQTJDMEFNRWxYWmtnQXNMY0F3TTRRQzdJQUNBd0FNRkdJaFNrQUJIc0FZTWdqSTNnQWhKa0FGRWJ5Vnp6eEs2NFE1eW9BQUhpWnNqeTVKRGxGZ1ZzSUxYRUhWMWN1SGlqT1NSY3JGRFpoQW1HYVFDN0NlWmtaTW9FMEQrRHp6QUFBb0pFVkVlQ0Q4LzE0emc2dXpzNDJqcllPWHkzcXZ3Yi9JbUppNC83bHo2dHdRQUFBNFhSKzBmNHNMN01hZ0RzR2dHMytvaVh1QkdoZUM2QjE5NHRtc2c5QXRRQ2c2ZHBYODNENGZqdzhSYUdRdWRuWjVlVGsyRXJFUWx0aHlsZDkvbWZDWDhCWC9XejVmano4OS9YZ3Z1SWtnVEpkZ1VjRStPREN6UFJNcFJ6UGtnbUVZdHptajBmOHR3di8vQjNUSXNSSllybFlLaFRqVVJKeGprU2FqUE15cFNLSlFwSXB4U1hTLzJUaTN5ejdBejdmTlFDd2FqNEJlNUV0cUYxakEvWkxKeEJZZE1EaTl3QUE4cnR2d2RRb0NBT0FhSVBoejNmLzd6LzlSNkFsQUlCbVNaSnhBQUJlUkNRdVZNcXpQOGNJQUFCRW9JRXFzRUViOU1FWUxNQUdITUVGM01FTC9HQTJoRUlreE1KQ0VFSUtaSUFjY21BcHJJSkNLSWJOc0IwcVlDL1VRQjAwd0ZGb2hwTndEaTdDVmJnT1BYQVArbUVJbnNFb3ZJRUpCRUhJQ0JOaElkcUlBV0tLV0NPT0NCZVpoZmdod1VnRUVvc2tJTW1JRkZFaVM1RTFTREZTaWxRZ1ZVZ2Q4ajF5QWptSFhFYTZrVHZJQURLQy9JYThSekdVZ2JKUlBkUU10VU81cURjYWhFYWlDOUJrZERHYWp4YWdtOUJ5dEJvOWpEYWg1OUNyYUEvYWp6NUR4ekRBNkJnSE04UnNNQzdHdzBLeE9Dd0prMlBMc1NLc0RLdkdHckJXckFPN2lmVmp6N0YzQkJLQlJjQUpOZ1IzUWlCaEhrRklXRXhZVHRoSXFDQWNKRFFSMmdrM0NRT0VVY0luSXBPb1M3UW11aEg1eEJoaU1qR0hXRWdzSTlZU2p4TXZFSHVJUThRM0pCS0pRekludVpBQ1NiR2tWTklTMGtiU2JsSWo2U3lwbXpSSUdpT1R5ZHBrYTdJSE9aUXNJQ3ZJaGVTZDVNUGtNK1FiNUNIeVd3cWRZa0J4cFBoVDRpaFN5bXBLR2VVUTVUVGxCbVdZTWtGVm81cFMzYWloVkJFMWoxcENyYUcyVXE5Umg2Z1ROSFdhT2MyREZrbExwYTJpbGRNYWFCZG85Mm12NkhTNkVkMlZIazZYMEZmU3krbEg2SmZvQS9SM0RBMkdGWVBIaUdjb0dac1lCeGhuR1hjWXI1aE1waG5UaXhuSFZEQTNNZXVZNTVrUG1XOVZXQ3EyS253Vmtjb0tsVXFWSnBVYktpOVVxYXFtcXQ2cUMxWHpWY3RVajZsZVUzMnVSbFV6VStPcENkU1dxMVdxblZEclV4dFRaNms3cUllcVo2aHZWRCtrZmxuOWlRWlp3MHpEVDBPa1VhQ3hYK084eGlBTFl4bXplQ3doYXcycmhuV0JOY1Ftc2MzWmZIWXF1NWo5SGJ1TFBhcXBvVGxETTBvelY3TlM4NVJtUHdmam1ISDRuSFJPQ2Vjb3A1Znpmb3JlRk84cDRpa2JwalJNdVRGbFhHdXFscGVXV0t0SXExR3JSK3U5TnE3dHA1Mm12VVc3V2Z1QkRrSEhTaWRjSjBkbmo4NEZuZWRUMlZQZHB3cW5GazA5T3ZXdUxxcHJwUnVodTBSM3YyNm43cGlldmw2QW5reHZwOTU1dmVmNkhIMHYvVlQ5YmZxbjlVY01XQWF6RENRRzJ3ek9HRHpGTlhGdlBCMHZ4OXZ4VVVOZHcwQkRwV0dWWVpmaGhKRzUwVHlqMVVhTlJnK01hY1pjNHlUamJjWnR4cU1tQmlZaEprdE42azN1bWxKTnVhWXBwanRNTzB6SHpjek5vczNXbVRXYlBUSFhNdWViNTV2WG05KzNZRnA0V2l5MnFMYTRaVW15NUZxbVdlNjJ2RzZGV2psWnBWaFZXbDJ6UnEyZHJTWFd1NjI3cHhHbnVVNlRUcXVlMW1mRHNQRzJ5YmFwdHhtdzVkZ0cyNjYyYmJaOVlXZGlGMmUzeGE3RDdwTzlrMzI2ZlkzOVBRY05oOWtPcXgxYUhYNXp0SElVT2xZNjNwck9uTzQvZmNYMGx1a3ZaMWpQRU0vWU0rTzJFOHNweEdtZFU1dlRSMmNYWjdsemcvT0lpNGxMZ3NzdWx6NHVteHZHM2NpOTVFcDA5WEZkNFhyUzlaMmJzNXZDN2FqYnIrNDI3bW51aDl5ZnpEU2ZLWjVaTTNQUXc4aEQ0RkhsMFQ4TG41VXdhOStzZms5RFQ0Rm50ZWNqTDJNdmtWZXQxN0MzcFhlcTkySHZGejcyUG5LZjR6N2pQRGZlTXQ1Wlg4dzN3TGZJdDh0UHcyK2VYNFhmUTM4ai8yVC9ldi9SQUtlQUpRRm5BNG1CUVlGYkF2djRlbndodjQ0L090dGw5ckxaN1VHTW9MbEJGVUdQZ3EyQzVjR3RJV2pJN0pDdElmZm5tTTZSem1rT2hWQis2TmJRQjJIbVlZdkRmZ3duaFllRlY0WS9qbkNJV0JyUk1aYzFkOUhjUTNQZlJQcEVsa1RlbTJjeFR6bXZMVW8xS2o2cUxtbzgyamU2TkxvL3hpNW1XY3pWV0oxWVNXeExIRGt1S3E0MmJteSszL3p0ODRmaW5lSUw0M3NYbUMvSVhYQjVvYzdDOUlXbkZxa3VFaXc2bGtCTWlFNDRsUEJCRUNxb0Zvd2w4aE4zSlk0S2VjSWR3bWNpTDlFMjBZallRMXdxSGs3eVNDcE5lcExza2J3MWVTVEZNNlVzNWJtRUo2bVF2RXdOVE4yYk9wNFdtbllnYlRJOU9yMHhnNUtSa0hGQ3FpRk5rN1puNm1mbVpuYkxyR1dGc3Y3RmJvdTNMeDZWQjhscnM1Q3NCVmt0Q3JaQ3B1aFVXaWpYS2dleVoyVlhaci9OaWNvNWxxdWVLODN0ekxQSzI1QTNuTytmLyswU3doTGhrcmFsaGt0WExSMVk1cjJzYWpteVBIRjUyd3JqRlFVcmhsWUdyRHk0aXJZcWJkVlBxKzFYbDY1K3ZTWjZUV3VCWHNIS2dzRzFBV3ZyQzFVSzVZVjk2OXpYN1YxUFdDOVozN1ZoK29hZEd6NFZpWXF1Rk5zWGx4Vi8yQ2pjZU9VYmgyL0t2NW5jbExTcHE4UzVaTTltMG1icDV0NHRubHNPbHFxWDVwY09iZzNaMnJRTjMxYTA3ZlgyUmRzdmw4MG8yN3VEdGtPNW83ODh1THhscDhuT3pUcy9WS1JVOUZUNlZEYnUwdDIxWWRmNGJ0SHVHM3U4OWpUczFkdGJ2UGY5UHNtKzIxVUJWVTNWWnRWbCswbjdzL2Mvcm9tcTZmaVcrMjFkclU1dGNlM0hBOUlEL1FjakRyYlh1ZFRWSGRJOVZGS1AxaXZyUnc3SEg3NytuZTkzTFEwMkRWV05uTWJpSTNCRWVlVHA5d25mOXg0Tk90cDJqSHVzNFFmVEgzWWRaeDB2YWtLYThwcEdtMU9hKzF0aVc3cFB6RDdSMXVyZWV2eEgyeDhQbkRROFdYbEs4MVRKYWRycGd0T1RaL0xQakoyVm5YMStMdm5jWU51aXRudm5ZODdmYWc5djc3b1FkT0hTUmYrTDV6dThPODVjOHJoMDhyTGI1Uk5YdUZlYXJ6cGZiZXAwNmp6K2s5TlB4N3VjdTVxdXVWeHJ1ZTU2dmJWN1p2ZnBHNTQzenQzMHZYbnhGdi9XMVo0NVBkMjk4M3B2OThYMzlkOFczWDV5Si8zT3k3dlpkeWZ1cmJ4UHZGLzBRTzFCMlVQZGg5VS9XLzdjMk8vY2YyckFkNkR6MGR4SDl3YUZnOC8ra2ZXUEQwTUZqNW1QeTRZTmh1dWVPRDQ1T2VJL2N2M3AvS2REejJUUEpwNFgvcUwreTY0WEZpOSsrTlhyMTg3Um1OR2hsL0tYazc5dGZLWDk2c0RyR2EvYnhzTEdIcjdKZURNeFh2UlcrKzNCZDl4M0hlK2ozdzlQNUh3Z2Z5ai9hUG14OVZQUXAvdVRHWk9UL3dRRG1QUDg3eldVZ2dBQUFCbDBSVmgwVTI5bWRIZGhjbVVBUVdSdlltVWdTVzFoWjJWU1pXRmtlWEhKWlR3QUFBTWhhVlJZZEZoTlREcGpiMjB1WVdSdlltVXVlRzF3QUFBQUFBQThQM2h3WVdOclpYUWdZbVZuYVc0OUl1Kzd2eUlnYVdROUlsYzFUVEJOY0VObGFHbEllbkpsVTNwT1ZHTjZhMk01WkNJL1BpQThlRHA0YlhCdFpYUmhJSGh0Ykc1ek9uZzlJbUZrYjJKbE9tNXpPbTFsZEdFdklpQjRPbmh0Y0hSclBTSkJaRzlpWlNCWVRWQWdRMjl5WlNBMUxqWXRZekUwTWlBM09TNHhOakE1TWpRc0lESXdNVGN2TURjdk1UTXRNREU2TURZNk16a2dJQ0FnSUNBZ0lDSStJRHh5WkdZNlVrUkdJSGh0Ykc1ek9uSmtaajBpYUhSMGNEb3ZMM2QzZHk1M015NXZjbWN2TVRrNU9TOHdNaTh5TWkxeVpHWXRjM2x1ZEdGNExXNXpJeUkrSUR4eVpHWTZSR1Z6WTNKcGNIUnBiMjRnY21SbU9tRmliM1YwUFNJaUlIaHRiRzV6T25odGNEMGlhSFIwY0RvdkwyNXpMbUZrYjJKbExtTnZiUzk0WVhBdk1TNHdMeUlnZUcxc2JuTTZlRzF3VFUwOUltaDBkSEE2THk5dWN5NWhaRzlpWlM1amIyMHZlR0Z3THpFdU1DOXRiUzhpSUhodGJHNXpPbk4wVW1WbVBTSm9kSFJ3T2k4dmJuTXVZV1J2WW1VdVkyOXRMM2hoY0M4eExqQXZjMVI1Y0dVdlVtVnpiM1Z5WTJWU1pXWWpJaUI0YlhBNlEzSmxZWFJ2Y2xSdmIydzlJa0ZrYjJKbElGQm9iM1J2YzJodmNDQkRReUFvVjJsdVpHOTNjeWtpSUhodGNFMU5Pa2x1YzNSaGJtTmxTVVE5SW5odGNDNXBhV1E2TXprd05UZzFRamczTlRJNE1URkZRVGxEUmpKQk16SkdOVVZHTkRneE1ERWlJSGh0Y0UxTk9rUnZZM1Z0Wlc1MFNVUTlJbmh0Y0M1a2FXUTZNemt3TlRnMVFqazNOVEk0TVRGRlFUbERSakpCTXpKR05VVkdORGd4TURFaVBpQThlRzF3VFUwNlJHVnlhWFpsWkVaeWIyMGdjM1JTWldZNmFXNXpkR0Z1WTJWSlJEMGllRzF3TG1scFpEb3pPVEExT0RWQ05qYzFNamd4TVVWQk9VTkdNa0V6TWtZMVJVWTBPREV3TVNJZ2MzUlNaV1k2Wkc5amRXMWxiblJKUkQwaWVHMXdMbVJwWkRvek9UQTFPRFZDTnpjMU1qZ3hNVVZCT1VOR01rRXpNa1kxUlVZME9ERXdNU0l2UGlBOEwzSmtaanBFWlhOamNtbHdkR2x2Ymo0Z1BDOXlaR1k2VWtSR1BpQThMM2c2ZUcxd2JXVjBZVDRnUEQ5NGNHRmphMlYwSUdWdVpEMGljaUkvUHZ4ZElYUUFBQUFoU1VSQlZIamFZdnovL3o4RExzREVnQWZnbFdRQjR2LzRKQm1wYnlkQWdBRUEwSlFFRDNzekZWVUFBQUFBU1VWT1JLNUNZSUk9KSBjZW50ZXIgbm8tcmVwZWF0fSNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3ctYi1taW57YmFja2dyb3VuZDp1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBY0FBQUFIQ0FZQUFBREVVbGZUQUFBS1JXbERRMUJKUTBNZ2NISnZabWxzWlFBQWVOcWRVMmRVVStrV1BmZmU5RUpMaUlDVVMyOVNGUWdnVWtLTGdCU1JKaW9oQ1JCS2lDR2gyUlZSd1JGRlJRUWJ5S0NJQTQ2T2dJd1ZVU3dNaWdyWUIrUWhvbzZEbzRpS3l2dmhlNk5yMXJ6MzVzMyt0ZGMrNTZ6em5iUFBCOEFJREpaSU0xRTFnQXlwUWg0UjRJUEh4TWJoNUM1QWdRb2tjQUFRQ0xOa0lYUDlJd0VBK0g0OFBDc2l3QWUrQUFGNDB3c0lBTUJObThBd0hJZi9EK3BDbVZ3QmdJUUJ3SFNST0VzSWdCUUFRSHFPUXFZQVFFWUJnSjJZSmxNQW9BUUFZTXRqWXVNQVVDMEFZQ2QvNXRNQWdKMzRtWHNCQUZ1VUlSVUJvSkVBSUJObGlFUUFhRHNBck05V2lrVUFXREFBRkdaTHhEa0EyQzBBTUVsWFprZ0FzTGNBd000UUM3SUFDQXdBTUZHSWhTa0FCSHNBWU1nakkzZ0FoSmtBRkVieVZ6enhLNjRRNXlvQUFIaVpzank1SkRsRmdWc0lMWEVIVjFjdUhpak9TUmNyRkRaaEFtR2FRQzdDZVprWk1vRTBEK0R6ekFBQW9KRVZFZUNEOC8xNHpnNnV6czQyanJZT1h5M3F2d2IvSW1KaTQvN2x6NnR3UUFBQTRYUiswZjRzTDdNYWdEc0dnRzMrb2lYdUJHaGVDNkIxOTR0bXNnOUF0UUNnNmRwWDgzRDRmanc4UmFHUXVkblo1ZVRrMkVyRVFsdGh5bGQ5L21mQ1g4QlgvV3o1Zmp6ODkvWGd2dUlrZ1RKZGdVY0UrT0RDelBSTXBSelBrZ21FWXR6bWowZjh0d3YvL0IzVElzUkpZcmxZS2hUalVSSnhqa1NhalBNeXBTS0pRcElweFNYUy8yVGkzeXo3QXo3Zk5RQ3dhajRCZTVFdHFGMWpBL1pMSnhCWWRNRGk5d0FBOHJ0dndkUW9DQU9BYUlQaHozZi83ei85UjZBbEFJQm1TWkp4QUFCZVJDUXVWTXF6UDhjSUFBQkVvSUVxc0VFYjlNRVlMTUFHSE1FRjNNRUwvR0EyaEVJa3hNSkNFRUlLWklBY2NtQXBySUpDS0liTnNCMHFZQy9VUUIwMHdGRm9ocE53RGk3Q1ZiZ09QWEFQK21FSW5zRW92SUVKQkVISUNCTmhJZHFJQVdLS1dDT09DQmVaaGZnaHdVZ0VFb3NrSU1tSUZGRWlTNUUxU0RGU2lsUWdWVWdkOGoxeUFqbUhYRWE2a1R2SUFES0MvSWE4UnpHVWdiSlJQZFFNdFVPNXFEY2FoRWFpQzlCa2RER2FqeGFnbTlCeXRCbzlqRGFoNTlDcmFBL2FqejVEeHpEQTZCZ0hNOFJzTUM3R3cwS3hPQ3dKazJQTHNTS3NES3ZHR3JCV3JBTzdpZlZqejdGM0JCS0JSY0FKTmdSM1FpQmhIa0ZJV0V4WVR0aElxQ0FjSkRRUjJnazNDUU9FVWNJbklwT29TN1FtdWhINXhCaGlNakdIV0Vnc0k5WVNqeE12RUh1SVE4UTNKQktKUXpJbnVaQUNTYkdrVk5JUzBrYlNibElqNlN5cG16UklHaU9UeWRwa2E3SUhPWlFzSUN2SWhlU2Q1TVBrTStRYjVDSHlXd3FkWWtCeHBQaFQ0aWhTeW1wS0dlVVE1VFRsQm1XWU1rRlZvNXBTM2FpaFZCRTFqMXBDcmFHMlVxOVJoNmdUTkhXYU9jMkRGa2xMcGEyaWxkTWFhQmRvOTJtdjZIUzZFZDJWSGs2WDBGZlN5K2xINkpmb0EvUjNEQTJHRllQSGlHY29HWnNZQnhobkdYY1lyNWhNcGhuVGl4bkhWREEzTWV1WTU1a1BtVzlWV0NxMktud1ZrY29LbFVxVkpwVWJLaTlVcWFxbXF0NnFDMVh6VmN0VWo2bGVVMzJ1UmxVelUrT3BDZFNXcTFXcW5WRHJVeHRUWjZrN3FJZXFaNmh2VkQra2ZsbjlpUVpadzB6RFQwT2tVYUN4WCtPOHhpQUxZeG16ZUN3aGF3MnJobldCTmNRbXNjM1pmSFlxdTVqOUhidUxQYXFwb1RsRE0wb3pWN05TODVSbVB3ZmptSEg0bkhST0NlY29wNWZ6Zm9yZUZPOHA0aWticGpSTXVURmxYR3VxbHBlV1dLdElxMUdyUit1OU5xN3RwNTJtdlVXN1dmdUJEa0hIU2lkY0owZG5qODRGbmVkVDJWUGRwd3FuRmswOU92V3VMcXBycFJ1aHUwUjN2MjZuN3BpZXZsNkFua3h2cDk1NXZlZjZISDB2L1ZUOWJmcW45VWNNV0FhekRDUUcyd3pPR0R6Rk5YRnZQQjB2eDl2eFVVTmR3MEJEcFdHVllaZmhoSkc1MFR5ajFVYU5SZytNYWNaYzR5VGpiY1p0eHFNbUJpWWhKa3RONmszdW1sSk51YVlwcGp0TU8wekh6Y3pOb3MzV21UV2JQVEhYTXVlYjU1dlhtOSszWUZwNFdpeTJxTGE0WlVteTVGcW1XZTYydkc2RldqbFpwVmhWV2wyelJxMmRyU1hXdTYyN3B4R251VTZUVHF1ZTFtZkRzUEcyeWJhcHR4bXc1ZGdHMjY2MmJiWjlZV2RpRjJlM3hhN0Q3cE85azMyNmZZMzlQUWNOaDlrT3F4MWFIWDV6dEhJVU9sWTYzcHJPbk80L2ZjWDBsdWt2WjFqUEVNL1lNK08yRThzcHhHbWRVNXZUUjJjWFo3bHpnL09JaTRsTGdzc3VsejR1bXh2RzNjaTk1RXAwOVhGZDRYclM5WjJiczV2QzdhamJyKzQyN21udWg5eWZ6RFNmS1o1Wk0zUFF3OGhENEZIbDBUOExuNVV3YTkrc2ZrOURUNEZudGVjakwyTXZrVmV0MTdDM3BYZXE5Mkh2Rno3MlBuS2Y0ejdqUERmZU10NVpYOHczd0xmSXQ4dFB3MitlWDRYZlEzOGovMlQvZXYvUkFLZUFKUUZuQTRtQlFZRmJBdnY0ZW53aHY0NC9PdHRsOXJMWjdVR01vTGxCRlVHUGdxMkM1Y0d0SVdqSTdKQ3RJZmZubU02Unpta09oVkIrNk5iUUIySG1ZWXZEZmd3bmhZZUZWNFkvam5DSVdCclJNWmMxZDlIY1EzUGZSUHBFbGtUZW0yY3hUem12TFVvMUtqNnFMbW84MmplNk5Mby94aTVtV2N6VldKMVlTV3hMSERrdUtxNDJibXkrMy96dDg0ZmluZUlMNDNzWG1DL0lYWEI1b2M3QzlJV25GcWt1RWl3NmxrQk1pRTQ0bFBCQkVDcW9Gb3dsOGhOM0pZNEtlY0lkd21jaUw5RTIwWWpZUTF3cUhrN3lTQ3BOZXBMc2tidzFlU1RGTTZVczVibUVKNm1RdkV3TlROMmJPcDRXbW5ZZ2JUSTlPcjB4ZzVLUmtIRkNxaUZOazdabjZtZm1abmJMckdXRnN2N0Zib3UzTHg2VkI4bHJzNUNzQlZrdENyWkNwdWhVV2lqWEtnZXlaMlZYWnIvTmljbzVscXVlSzgzdHpMUEsyNUEzbk8rZi8rMFN3aExoa3JhbGhrdFhMUjFZNXIyc2FqbXlQSEY1MndyakZRVXJobFlHckR5NGlyWXFiZFZQcSsxWGw2NSt2U1o2VFd1QlhzSEtnc0cxQVd2ckMxVUs1WVY5Njl6WDdWMVBXQzlaMzdWaCtvYWRHejRWaVlxdUZOc1hseFYvMkNqY2VPVWJoMi9LdjVuY2xMU3BxOFM1Wk05bTBtYnA1dDR0bmxzT2xxcVg1cGNPYmczWjJyUU4zMWEwN2ZYMlJkc3ZsODBvMjd1RHRrTzVvNzg4dUx4bHA4bk96VHMvVktSVTlGVDZWRGJ1MHQyMVlkZjRidEh1RzN1ODlqVHMxZHRidlBmOVBzbSsyMVVCVlUzVlp0VmwrMG43cy9jL3JvbXE2ZmlXKzIxZHJVNXRjZTNIQTlJRC9RY2pEcmJYdWRUVkhkSTlWRktQMWl2clJ3N0hINzcrbmU5M0xRMDJEVldObk1iaUkzQkVlZVRwOXduZjl4NE5PdHAyakh1czRRZlRIM1lkWngwdmFrS2E4cHBHbTFPYSsxdGlXN3BQekQ3UjF1cmVldnhIMng4UG5EUThXWGxLODFUSmFkcnBndE9UWi9MUGpKMlZuWDErTHZuY1lOdWl0bnZuWTg3ZmFnOXY3N29RZE9IU1JmK0w1enU4Tzg1YzhyaDA4ckxiNVJOWHVGZWFyenBmYmVwMDZqeitrOU5QeDd1Y3U1cXV1VnhydWU1NnZiVjdadmZwRzU0M3p0MzB2WG54RnYvVzFaNDVQZDI5ODNwdjk4WDM5ZDhXM1g1eUovM095N3ZaZHlmdXJieFB2Ri8wUU8xQjJVUGRoOVUvVy83YzJPL2NmMnJBZDZEejBkeEg5d2FGZzgvK2tmV1BEME1GajVtUHk0WU5odXVlT0Q0NU9lSS9jdjNwL0tkRHoyVFBKcDRYL3FMK3k2NFhGaTkrK05YcjE4N1JtTkdobC9LWGs3OXRmS1g5NnNEckdhL2J4c0xHSHI3SmVETXhYdlJXKyszQmQ5eDNIZStqM3c5UDVId2dmeWovYVBteDlWUFFwL3VUR1pPVC93UURtUFA4N3pXVWdnQUFBQmwwUlZoMFUyOW1kSGRoY21VQVFXUnZZbVVnU1cxaFoyVlNaV0ZrZVhISlpUd0FBQU1oYVZSWWRGaE5URHBqYjIwdVlXUnZZbVV1ZUcxd0FBQUFBQUE4UDNod1lXTnJaWFFnWW1WbmFXNDlJdSs3dnlJZ2FXUTlJbGMxVFRCTmNFTmxhR2xJZW5KbFUzcE9WR042YTJNNVpDSS9QaUE4ZURwNGJYQnRaWFJoSUhodGJHNXpPbmc5SW1Ga2IySmxPbTV6T20xbGRHRXZJaUI0T25odGNIUnJQU0pCWkc5aVpTQllUVkFnUTI5eVpTQTFMall0WXpFME1pQTNPUzR4TmpBNU1qUXNJREl3TVRjdk1EY3ZNVE10TURFNk1EWTZNemtnSUNBZ0lDQWdJQ0krSUR4eVpHWTZVa1JHSUhodGJHNXpPbkprWmowaWFIUjBjRG92TDNkM2R5NTNNeTV2Y21jdk1UazVPUzh3TWk4eU1pMXlaR1l0YzNsdWRHRjRMVzV6SXlJK0lEeHlaR1k2UkdWelkzSnBjSFJwYjI0Z2NtUm1PbUZpYjNWMFBTSWlJSGh0Ykc1ek9uaHRjRDBpYUhSMGNEb3ZMMjV6TG1Ga2IySmxMbU52YlM5NFlYQXZNUzR3THlJZ2VHMXNibk02ZUcxd1RVMDlJbWgwZEhBNkx5OXVjeTVoWkc5aVpTNWpiMjB2ZUdGd0x6RXVNQzl0YlM4aUlIaHRiRzV6T25OMFVtVm1QU0pvZEhSd09pOHZibk11WVdSdlltVXVZMjl0TDNoaGNDOHhMakF2YzFSNWNHVXZVbVZ6YjNWeVkyVlNaV1lqSWlCNGJYQTZRM0psWVhSdmNsUnZiMnc5SWtGa2IySmxJRkJvYjNSdmMyaHZjQ0JEUXlBb1YybHVaRzkzY3lraUlIaHRjRTFOT2tsdWMzUmhibU5sU1VROUluaHRjQzVwYVdRNk56bEJRemN6T1VVM05USTNNVEZGUVVJeE9EVkdOekJGUmpZMFJFTkVSa01pSUhodGNFMU5Pa1J2WTNWdFpXNTBTVVE5SW5odGNDNWthV1E2TnpsQlF6Y3pPVVkzTlRJM01URkZRVUl4T0RWR056QkZSalkwUkVORVJrTWlQaUE4ZUcxd1RVMDZSR1Z5YVhabFpFWnliMjBnYzNSU1pXWTZhVzV6ZEdGdVkyVkpSRDBpZUcxd0xtbHBaRG8zT1VGRE56TTVRemMxTWpjeE1VVkJRakU0TlVZM01FVkdOalJFUTBSR1F5SWdjM1JTWldZNlpHOWpkVzFsYm5SSlJEMGllRzF3TG1ScFpEbzNPVUZETnpNNVJEYzFNamN4TVVWQlFqRTROVVkzTUVWR05qUkVRMFJHUXlJdlBpQThMM0prWmpwRVpYTmpjbWx3ZEdsdmJqNGdQQzl5WkdZNlVrUkdQaUE4TDNnNmVHMXdiV1YwWVQ0Z1BEOTRjR0ZqYTJWMElHVnVaRDBpY2lJL1ByV0p1SWNBQUFBbVNVUkJWSGphWXZ6Ly96OERFZ0J4R0dFY0pnWThBSzhrQzlRb2RLUGhrb3pVdHhNZ3dBQXlTZ2NPWXkyeHBBQUFBQUJKUlU1RXJrSmdnZz09KSBjZW50ZXIgbm8tcmVwZWF0fSNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3ctYi1zdWItbWF4e2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWNBQUFBSENBWUFBQURFVWxmVEFBQUtSV2xEUTFCSlEwTWdjSEp2Wm1sc1pRQUFlTnFkVTJkVVUra1dQZmZlOUVKTGlJQ1VTMjlTRlFnZ1VrS0xnQlNSSmlvaENSQktpQ0doMlJWUndSRkZSUVFieUtDSUE0Nk9nSXdWVVN3TWlncllCK1Fob282RG80aUt5dnZoZTZOcjFyejM1czMrdGRjKzU2enpuYlBQQjhBSURKWklNMUUxZ0F5cFFoNFI0SVBIeE1iaDVDNUFnUW9rY0FBUUNMTmtJWFA5SXdFQStINDhQQ3Npd0FlK0FBRjQwd3NJQU1CTm04QXdISWYvRCtwQ21Wd0JnSVFCd0hTUk9Fc0lnQlFBUUhxT1FxWUFRRVlCZ0oyWUpsTUFvQVFBWU10all1TUFVQzBBWUNkLzV0TUFnSjM0bVhzQkFGdVVJUlVCb0pFQUlCTmxpRVFBYURzQXJNOVdpa1VBV0RBQUZHWkx4RGtBMkMwQU1FbFhaa2dBc0xjQXdNNFFDN0lBQ0F3QU1GR0loU2tBQkhzQVlNZ2pJM2dBaEprQUZFYnlWenp4SzY0UTV5b0FBSGlac2p5NUpEbEZnVnNJTFhFSFYxY3VIaWpPU1JjckZEWmhBbUdhUUM3Q2Vaa1pNb0UwRCtEenpBQUFvSkVWRWVDRDgvMTR6ZzZ1enM0MmpyWU9YeTNxdndiL0ltSmk0LzdsejZ0d1FBQUE0WFIrMGY0c0w3TWFnRHNHZ0czK29pWHVCR2hlQzZCMTk0dG1zZzlBdFFDZzZkcFg4M0Q0Zmp3OFJhR1F1ZG5aNWVUazJFckVRbHRoeWxkOS9tZkNYOEJYL1d6NWZqejg5L1hndnVJa2dUSmRnVWNFK09EQ3pQUk1wUnpQa2dtRVl0em1qMGY4dHd2Ly9CM1RJc1JKWXJsWUtoVGpVUkp4amtTYWpQTXlwU0tKUXBJcHhTWFMvMlRpM3l6N0F6N2ZOUUN3YWo0QmU1RXRxRjFqQS9aTEp4QllkTURpOXdBQThydHZ3ZFFvQ0FPQWFJUGh6M2YvN3ovOVI2QWxBSUJtU1pKeEFBQmVSQ1F1Vk1xelA4Y0lBQUJFb0lFcXNFRWI5TUVZTE1BR0hNRUYzTUVML0dBMmhFSWt4TUpDRUVJS1pJQWNjbUFwcklKQ0tJYk5zQjBxWUMvVVFCMDB3RkZvaHBOd0RpN0NWYmdPUFhBUCttRUluc0VvdklFSkJFSElDQk5oSWRxSUFXS0tXQ09PQ0JlWmhmZ2h3VWdFRW9za0lNbUlGRkVpUzVFMVNERlNpbFFnVlVnZDhqMXlBam1IWEVhNmtUdklBREtDL0lhOFJ6R1VnYkpSUGRRTXRVTzVxRGNhaEVhaUM5QmtkREdhanhhZ205Qnl0Qm85akRhaDU5Q3JhQS9hano1RHh6REE2QmdITThSc01DN0d3MEt4T0N3SmsyUExzU0tzREt2R0dyQldyQU83aWZWano3RjNCQktCUmNBSk5nUjNRaUJoSGtGSVdFeFlUdGhJcUNBY0pEUVIyZ2szQ1FPRVVjSW5JcE9vUzdRbXVoSDV4QmhpTWpHSFdFZ3NJOVlTanhNdkVIdUlROFEzSkJLSlF6SW51WkFDU2JHa1ZOSVMwa2JTYmxJajZTeXBtelJJR2lPVHlkcGthN0lIT1pRc0lDdkloZVNkNU1Qa00rUWI1Q0h5V3dxZFlrQnhwUGhUNGloU3ltcEtHZVVRNVRUbEJtV1lNa0ZWbzVwUzNhaWhWQkUxajFwQ3JhRzJVcTlSaDZnVE5IV2FPYzJERmtsTHBhMmlsZE1hYUJkbzkybXY2SFM2RWQyVkhrNlgwRmZTeStsSDZKZm9BL1IzREEyR0ZZUEhpR2NvR1pzWUJ4aG5HWGNZcjVoTXBoblRpeG5IVkRBM01ldVk1NWtQbVc5VldDcTJLbndWa2NvS2xVcVZKcFViS2k5VXFhcW1xdDZxQzFYelZjdFVqNmxlVTMydVJsVXpVK09wQ2RTV3ExV3FuVkRyVXh0VFo2azdxSWVxWjZodlZEK2tmbG45aVFaWncwekRUME9rVWFDeFgrTzh4aUFMWXhtemVDd2hhdzJyaG5XQk5jUW1zYzNaZkhZcXU1ajlIYnVMUGFxcG9UbERNMG96VjdOUzg1Um1Qd2ZqbUhING5IUk9DZWNvcDVmemZvcmVGTzhwNGlrYnBqUk11VEZsWEd1cWxwZVdXS3RJcTFHclIrdTlOcTd0cDUybXZVVzdXZnVCRGtISFNpZGNKMGRuajg0Rm5lZFQyVlBkcHdxbkZrMDlPdld1THFwcnBSdWh1MFIzdjI2bjdwaWV2bDZBbmt4dnA5NTV2ZWY2SEgwdi9WVDliZnFuOVVjTVdBYXpEQ1FHMnd6T0dEekZOWEZ2UEIwdng5dnhVVU5kdzBCRHBXR1ZZWmZoaEpHNTBUeWoxVWFOUmcrTWFjWmM0eVRqYmNadHhxTW1CaVloSmt0TjZrM3VtbEpOdWFZcHBqdE1PMHpIemN6Tm9zM1dtVFdiUFRIWE11ZWI1NXZYbTkrM1lGcDRXaXkycUxhNFpVbXk1RnFtV2U2MnZHNkZXamxacFZoVldsMnpScTJkclNYV3U2MjdweEdudVU2VFRxdWUxbWZEc1BHMnliYXB0eG13NWRnRzI2NjJiYlo5WVdkaUYyZTN4YTdEN3BPOWszMjZmWTM5UFFjTmg5a09xeDFhSFg1enRISVVPbFk2M3ByT25PNC9mY1gwbHVrdloxalBFTS9ZTStPMkU4c3B4R21kVTV2VFIyY1haN2x6Zy9PSWk0bExnc3N1bHo0dW14dkczY2k5NUVwMDlYRmQ0WHJTOVoyYnM1dkM3YWpicis0MjdtbnVoOXlmekRTZktaNVpNM1BRdzhoRDRGSGwwVDhMbjVVd2E5K3NmazlEVDRGbnRlY2pMMk12a1ZldDE3QzNwWGVxOTJIdkZ6NzJQbktmNHo3alBEZmVNdDVaWDh3M3dMZkl0OHRQdzIrZVg0WGZRMzhqLzJUL2V2L1JBS2VBSlFGbkE0bUJRWUZiQXZ2NGVud2h2NDQvT3R0bDlyTFo3VUdNb0xsQkZVR1BncTJDNWNHdElXakk3SkN0SWZmbm1NNlJ6bWtPaFZCKzZOYlFCMkhtWVl2RGZnd25oWWVGVjRZL2puQ0lXQnJSTVpjMWQ5SGNRM1BmUlBwRWxrVGVtMmN4VHptdkxVbzFLajZxTG1vODJqZTZOTG8veGk1bVdjelZXSjFZU1d4TEhEa3VLcTQyYm15KzMvenQ4NGZpbmVJTDQzc1htQy9JWFhCNW9jN0M5SVduRnFrdUVpdzZsa0JNaUU0NGxQQkJFQ3FvRm93bDhoTjNKWTRLZWNJZHdtY2lMOUUyMFlqWVExd3FIazd5U0NwTmVwTHNrYncxZVNURk02VXM1Ym1FSjZtUXZFd05UTjJiT3A0V21uWWdiVEk5T3IweGc1S1JrSEZDcWlGTms3Wm42bWZtWm5iTHJHV0ZzdjdGYm91M0x4NlZCOGxyczVDc0JWa3RDclpDcHVoVVdpalhLZ2V5WjJWWFpyL05pY281bHF1ZUs4M3R6TFBLMjVBM25PK2YvKzBTd2hMaGtyYWxoa3RYTFIxWTVyMnNham15UEhGNTJ3cmpGUVVyaGxZR3JEeTRpcllxYmRWUHErMVhsNjUrdlNaNlRXdUJYc0hLZ3NHMUFXdnJDMVVLNVlWOTY5elg3VjFQV0M5WjM3Vmgrb2FkR3o0VmlZcXVGTnNYbHhWLzJDamNlT1ViaDIvS3Y1bmNsTFNwcThTNVpNOW0wbWJwNXQ0dG5sc09scXFYNXBjT2JnM1oyclFOMzFhMDdmWDJSZHN2bDgwbzI3dUR0a081bzc4OHVMeGxwOG5PelRzL1ZLUlU5RlQ2VkRidTB0MjFZZGY0YnRIdUczdTg5alRzMWR0YnZQZjlQc20rMjFVQlZVM1ZadFZsKzBuN3MvYy9yb21xNmZpVysyMWRyVTV0Y2UzSEE5SUQvUWNqRHJiWHVkVFZIZEk5VkZLUDFpdnJSdzdISDc3K25lOTNMUTAyRFZXTm5NYmlJM0JFZWVUcDl3bmY5eDROT3RwMmpIdXM0UWZUSDNZZFp4MHZha0thOHBwR20xT2ErMXRpVzdwUHpEN1IxdXJlZXZ4SDJ4OFBuRFE4V1hsSzgxVEphZHJwZ3RPVFovTFBqSjJWblgxK0x2bmNZTnVpdG52blk4N2ZhZzl2NzdvUWRPSFNSZitMNXp1OE84NWM4cmgwOHJMYjVSTlh1RmVhcnpwZmJlcDA2anorazlOUHg3dWN1NXF1dVZ4cnVlNTZ2YlY3WnZmcEc1NDN6dDMwdlhueEZ2L1cxWjQ1UGQyOTgzcHY5OFgzOWQ4VzNYNXlKLzNPeTd2WmR5ZnVyYnhQdkYvMFFPMUIyVVBkaDlVL1cvN2MyTy9jZjJyQWQ2RHowZHhIOXdhRmc4LytrZldQRDBNRmo1bVB5NFlOaHV1ZU9ENDVPZUkvY3YzcC9LZER6MlRQSnA0WC9xTCt5NjRYRmk5KytOWHIxODdSbU5HaGwvS1hrNzl0ZktYOTZzRHJHYS9ieHNMR0hyN0plRE14WHZSVysrM0JkOXgzSGUrajN3OVA1SHdnZnlqL2FQbXg5VlBRcC91VEdaT1Qvd1FEbVBQODd6V1VnZ0FBQUJsMFJWaDBVMjltZEhkaGNtVUFRV1J2WW1VZ1NXMWhaMlZTWldGa2VYSEpaVHdBQUFNaGFWUllkRmhOVERwamIyMHVZV1J2WW1VdWVHMXdBQUFBQUFBOFAzaHdZV05yWlhRZ1ltVm5hVzQ5SXUrN3Z5SWdhV1E5SWxjMVRUQk5jRU5sYUdsSWVuSmxVM3BPVkdONmEyTTVaQ0kvUGlBOGVEcDRiWEJ0WlhSaElIaHRiRzV6T25nOUltRmtiMkpsT201ek9tMWxkR0V2SWlCNE9uaHRjSFJyUFNKQlpHOWlaU0JZVFZBZ1EyOXlaU0ExTGpZdFl6RTBNaUEzT1M0eE5qQTVNalFzSURJd01UY3ZNRGN2TVRNdE1ERTZNRFk2TXprZ0lDQWdJQ0FnSUNJK0lEeHlaR1k2VWtSR0lIaHRiRzV6T25Ka1pqMGlhSFIwY0RvdkwzZDNkeTUzTXk1dmNtY3ZNVGs1T1M4d01pOHlNaTF5WkdZdGMzbHVkR0Y0TFc1ekl5SStJRHh5WkdZNlJHVnpZM0pwY0hScGIyNGdjbVJtT21GaWIzVjBQU0lpSUhodGJHNXpPbmh0Y0QwaWFIUjBjRG92TDI1ekxtRmtiMkpsTG1OdmJTOTRZWEF2TVM0d0x5SWdlRzFzYm5NNmVHMXdUVTA5SW1oMGRIQTZMeTl1Y3k1aFpHOWlaUzVqYjIwdmVHRndMekV1TUM5dGJTOGlJSGh0Ykc1ek9uTjBVbVZtUFNKb2RIUndPaTh2Ym5NdVlXUnZZbVV1WTI5dEwzaGhjQzh4TGpBdmMxUjVjR1V2VW1WemIzVnlZMlZTWldZaklpQjRiWEE2UTNKbFlYUnZjbFJ2YjJ3OUlrRmtiMkpsSUZCb2IzUnZjMmh2Y0NCRFF5QW9WMmx1Wkc5M2N5a2lJSGh0Y0UxTk9rbHVjM1JoYm1ObFNVUTlJbmh0Y0M1cGFXUTZNemt3TlRnMVFqZzNOVEk0TVRGRlFUbERSakpCTXpKR05VVkdORGd4TURFaUlIaHRjRTFOT2tSdlkzVnRaVzUwU1VROUluaHRjQzVrYVdRNk16a3dOVGcxUWprM05USTRNVEZGUVRsRFJqSkJNekpHTlVWR05EZ3hNREVpUGlBOGVHMXdUVTA2UkdWeWFYWmxaRVp5YjIwZ2MzUlNaV1k2YVc1emRHRnVZMlZKUkQwaWVHMXdMbWxwWkRvek9UQTFPRFZDTmpjMU1qZ3hNVVZCT1VOR01rRXpNa1kxUlVZME9ERXdNU0lnYzNSU1pXWTZaRzlqZFcxbGJuUkpSRDBpZUcxd0xtUnBaRG96T1RBMU9EVkNOemMxTWpneE1VVkJPVU5HTWtFek1rWTFSVVkwT0RFd01TSXZQaUE4TDNKa1pqcEVaWE5qY21sd2RHbHZiajRnUEM5eVpHWTZVa1JHUGlBOEwzZzZlRzF3YldWMFlUNGdQRDk0Y0dGamEyVjBJR1Z1WkQwaWNpSS9QdnhkSVhRQUFBQWhTVVJCVkhqYVl2ei8vejhETHNERWdBZmdsV1FCNHYvNEpCbXBieWRBZ0FFQTBKUUVEM3N6RlZVQUFBQUFTVVZPUks1Q1lJST0pIGNlbnRlciBuby1yZXBlYXR9I2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvdy1iLXN1Yi1taW57YmFja2dyb3VuZDp1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBY0FBQUFIQ0FZQUFBREVVbGZUQUFBS1JXbERRMUJKUTBNZ2NISnZabWxzWlFBQWVOcWRVMmRVVStrV1BmZmU5RUpMaUlDVVMyOVNGUWdnVWtLTGdCU1JKaW9oQ1JCS2lDR2gyUlZSd1JGRlJRUWJ5S0NJQTQ2T2dJd1ZVU3dNaWdyWUIrUWhvbzZEbzRpS3l2dmhlNk5yMXJ6MzVzMyt0ZGMrNTZ6em5iUFBCOEFJREpaSU0xRTFnQXlwUWg0UjRJUEh4TWJoNUM1QWdRb2tjQUFRQ0xOa0lYUDlJd0VBK0g0OFBDc2l3QWUrQUFGNDB3c0lBTUJObThBd0hJZi9EK3BDbVZ3QmdJUUJ3SFNST0VzSWdCUUFRSHFPUXFZQVFFWUJnSjJZSmxNQW9BUUFZTXRqWXVNQVVDMEFZQ2QvNXRNQWdKMzRtWHNCQUZ1VUlSVUJvSkVBSUJObGlFUUFhRHNBck05V2lrVUFXREFBRkdaTHhEa0EyQzBBTUVsWFprZ0FzTGNBd000UUM3SUFDQXdBTUZHSWhTa0FCSHNBWU1nakkzZ0FoSmtBRkVieVZ6enhLNjRRNXlvQUFIaVpzank1SkRsRmdWc0lMWEVIVjFjdUhpak9TUmNyRkRaaEFtR2FRQzdDZVprWk1vRTBEK0R6ekFBQW9KRVZFZUNEOC8xNHpnNnV6czQyanJZT1h5M3F2d2IvSW1KaTQvN2x6NnR3UUFBQTRYUiswZjRzTDdNYWdEc0dnRzMrb2lYdUJHaGVDNkIxOTR0bXNnOUF0UUNnNmRwWDgzRDRmanc4UmFHUXVkblo1ZVRrMkVyRVFsdGh5bGQ5L21mQ1g4QlgvV3o1Zmp6ODkvWGd2dUlrZ1RKZGdVY0UrT0RDelBSTXBSelBrZ21FWXR6bWowZjh0d3YvL0IzVElzUkpZcmxZS2hUalVSSnhqa1NhalBNeXBTS0pRcElweFNYUy8yVGkzeXo3QXo3Zk5RQ3dhajRCZTVFdHFGMWpBL1pMSnhCWWRNRGk5d0FBOHJ0dndkUW9DQU9BYUlQaHozZi83ei85UjZBbEFJQm1TWkp4QUFCZVJDUXVWTXF6UDhjSUFBQkVvSUVxc0VFYjlNRVlMTUFHSE1FRjNNRUwvR0EyaEVJa3hNSkNFRUlLWklBY2NtQXBySUpDS0liTnNCMHFZQy9VUUIwMHdGRm9ocE53RGk3Q1ZiZ09QWEFQK21FSW5zRW92SUVKQkVISUNCTmhJZHFJQVdLS1dDT09DQmVaaGZnaHdVZ0VFb3NrSU1tSUZGRWlTNUUxU0RGU2lsUWdWVWdkOGoxeUFqbUhYRWE2a1R2SUFES0MvSWE4UnpHVWdiSlJQZFFNdFVPNXFEY2FoRWFpQzlCa2RER2FqeGFnbTlCeXRCbzlqRGFoNTlDcmFBL2FqejVEeHpEQTZCZ0hNOFJzTUM3R3cwS3hPQ3dKazJQTHNTS3NES3ZHR3JCV3JBTzdpZlZqejdGM0JCS0JSY0FKTmdSM1FpQmhIa0ZJV0V4WVR0aElxQ0FjSkRRUjJnazNDUU9FVWNJbklwT29TN1FtdWhINXhCaGlNakdIV0Vnc0k5WVNqeE12RUh1SVE4UTNKQktKUXpJbnVaQUNTYkdrVk5JUzBrYlNibElqNlN5cG16UklHaU9UeWRwa2E3SUhPWlFzSUN2SWhlU2Q1TVBrTStRYjVDSHlXd3FkWWtCeHBQaFQ0aWhTeW1wS0dlVVE1VFRsQm1XWU1rRlZvNXBTM2FpaFZCRTFqMXBDcmFHMlVxOVJoNmdUTkhXYU9jMkRGa2xMcGEyaWxkTWFhQmRvOTJtdjZIUzZFZDJWSGs2WDBGZlN5K2xINkpmb0EvUjNEQTJHRllQSGlHY29HWnNZQnhobkdYY1lyNWhNcGhuVGl4bkhWREEzTWV1WTU1a1BtVzlWV0NxMktud1ZrY29LbFVxVkpwVWJLaTlVcWFxbXF0NnFDMVh6VmN0VWo2bGVVMzJ1UmxVelUrT3BDZFNXcTFXcW5WRHJVeHRUWjZrN3FJZXFaNmh2VkQra2ZsbjlpUVpadzB6RFQwT2tVYUN4WCtPOHhpQUxZeG16ZUN3aGF3MnJobldCTmNRbXNjM1pmSFlxdTVqOUhidUxQYXFwb1RsRE0wb3pWN05TODVSbVB3ZmptSEg0bkhST0NlY29wNWZ6Zm9yZUZPOHA0aWticGpSTXVURmxYR3VxbHBlV1dLdElxMUdyUit1OU5xN3RwNTJtdlVXN1dmdUJEa0hIU2lkY0owZG5qODRGbmVkVDJWUGRwd3FuRmswOU92V3VMcXBycFJ1aHUwUjN2MjZuN3BpZXZsNkFua3h2cDk1NXZlZjZISDB2L1ZUOWJmcW45VWNNV0FhekRDUUcyd3pPR0R6Rk5YRnZQQjB2eDl2eFVVTmR3MEJEcFdHVllaZmhoSkc1MFR5ajFVYU5SZytNYWNaYzR5VGpiY1p0eHFNbUJpWWhKa3RONmszdW1sSk51YVlwcGp0TU8wekh6Y3pOb3MzV21UV2JQVEhYTXVlYjU1dlhtOSszWUZwNFdpeTJxTGE0WlVteTVGcW1XZTYydkc2RldqbFpwVmhWV2wyelJxMmRyU1hXdTYyN3B4R251VTZUVHF1ZTFtZkRzUEcyeWJhcHR4bXc1ZGdHMjY2MmJiWjlZV2RpRjJlM3hhN0Q3cE85azMyNmZZMzlQUWNOaDlrT3F4MWFIWDV6dEhJVU9sWTYzcHJPbk80L2ZjWDBsdWt2WjFqUEVNL1lNK08yRThzcHhHbWRVNXZUUjJjWFo3bHpnL09JaTRsTGdzc3VsejR1bXh2RzNjaTk1RXAwOVhGZDRYclM5WjJiczV2QzdhamJyKzQyN21udWg5eWZ6RFNmS1o1Wk0zUFF3OGhENEZIbDBUOExuNVV3YTkrc2ZrOURUNEZudGVjakwyTXZrVmV0MTdDM3BYZXE5Mkh2Rno3MlBuS2Y0ejdqUERmZU10NVpYOHczd0xmSXQ4dFB3MitlWDRYZlEzOGovMlQvZXYvUkFLZUFKUUZuQTRtQlFZRmJBdnY0ZW53aHY0NC9PdHRsOXJMWjdVR01vTGxCRlVHUGdxMkM1Y0d0SVdqSTdKQ3RJZmZubU02Unpta09oVkIrNk5iUUIySG1ZWXZEZmd3bmhZZUZWNFkvam5DSVdCclJNWmMxZDlIY1EzUGZSUHBFbGtUZW0yY3hUem12TFVvMUtqNnFMbW84MmplNk5Mby94aTVtV2N6VldKMVlTV3hMSERrdUtxNDJibXkrMy96dDg0ZmluZUlMNDNzWG1DL0lYWEI1b2M3QzlJV25GcWt1RWl3NmxrQk1pRTQ0bFBCQkVDcW9Gb3dsOGhOM0pZNEtlY0lkd21jaUw5RTIwWWpZUTF3cUhrN3lTQ3BOZXBMc2tidzFlU1RGTTZVczVibUVKNm1RdkV3TlROMmJPcDRXbW5ZZ2JUSTlPcjB4ZzVLUmtIRkNxaUZOazdabjZtZm1abmJMckdXRnN2N0Zib3UzTHg2VkI4bHJzNUNzQlZrdENyWkNwdWhVV2lqWEtnZXlaMlZYWnIvTmljbzVscXVlSzgzdHpMUEsyNUEzbk8rZi8rMFN3aExoa3JhbGhrdFhMUjFZNXIyc2FqbXlQSEY1MndyakZRVXJobFlHckR5NGlyWXFiZFZQcSsxWGw2NSt2U1o2VFd1QlhzSEtnc0cxQVd2ckMxVUs1WVY5Njl6WDdWMVBXQzlaMzdWaCtvYWRHejRWaVlxdUZOc1hseFYvMkNqY2VPVWJoMi9LdjVuY2xMU3BxOFM1Wk05bTBtYnA1dDR0bmxzT2xxcVg1cGNPYmczWjJyUU4zMWEwN2ZYMlJkc3ZsODBvMjd1RHRrTzVvNzg4dUx4bHA4bk96VHMvVktSVTlGVDZWRGJ1MHQyMVlkZjRidEh1RzN1ODlqVHMxZHRidlBmOVBzbSsyMVVCVlUzVlp0VmwrMG43cy9jL3JvbXE2ZmlXKzIxZHJVNXRjZTNIQTlJRC9RY2pEcmJYdWRUVkhkSTlWRktQMWl2clJ3N0hINzcrbmU5M0xRMDJEVldObk1iaUkzQkVlZVRwOXduZjl4NE5PdHAyakh1czRRZlRIM1lkWngwdmFrS2E4cHBHbTFPYSsxdGlXN3BQekQ3UjF1cmVldnhIMng4UG5EUThXWGxLODFUSmFkcnBndE9UWi9MUGpKMlZuWDErTHZuY1lOdWl0bnZuWTg3ZmFnOXY3N29RZE9IU1JmK0w1enU4Tzg1YzhyaDA4ckxiNVJOWHVGZWFyenBmYmVwMDZqeitrOU5QeDd1Y3U1cXV1VnhydWU1NnZiVjdadmZwRzU0M3p0MzB2WG54RnYvVzFaNDVQZDI5ODNwdjk4WDM5ZDhXM1g1eUovM095N3ZaZHlmdXJieFB2Ri8wUU8xQjJVUGRoOVUvVy83YzJPL2NmMnJBZDZEejBkeEg5d2FGZzgvK2tmV1BEME1GajVtUHk0WU5odXVlT0Q0NU9lSS9jdjNwL0tkRHoyVFBKcDRYL3FMK3k2NFhGaTkrK05YcjE4N1JtTkdobC9LWGs3OXRmS1g5NnNEckdhL2J4c0xHSHI3SmVETXhYdlJXKyszQmQ5eDNIZStqM3c5UDVId2dmeWovYVBteDlWUFFwL3VUR1pPVC93UURtUFA4N3pXVWdnQUFBQmwwUlZoMFUyOW1kSGRoY21VQVFXUnZZbVVnU1cxaFoyVlNaV0ZrZVhISlpUd0FBQU1oYVZSWWRGaE5URHBqYjIwdVlXUnZZbVV1ZUcxd0FBQUFBQUE4UDNod1lXTnJaWFFnWW1WbmFXNDlJdSs3dnlJZ2FXUTlJbGMxVFRCTmNFTmxhR2xJZW5KbFUzcE9WR042YTJNNVpDSS9QaUE4ZURwNGJYQnRaWFJoSUhodGJHNXpPbmc5SW1Ga2IySmxPbTV6T20xbGRHRXZJaUI0T25odGNIUnJQU0pCWkc5aVpTQllUVkFnUTI5eVpTQTFMall0WXpFME1pQTNPUzR4TmpBNU1qUXNJREl3TVRjdk1EY3ZNVE10TURFNk1EWTZNemtnSUNBZ0lDQWdJQ0krSUR4eVpHWTZVa1JHSUhodGJHNXpPbkprWmowaWFIUjBjRG92TDNkM2R5NTNNeTV2Y21jdk1UazVPUzh3TWk4eU1pMXlaR1l0YzNsdWRHRjRMVzV6SXlJK0lEeHlaR1k2UkdWelkzSnBjSFJwYjI0Z2NtUm1PbUZpYjNWMFBTSWlJSGh0Ykc1ek9uaHRjRDBpYUhSMGNEb3ZMMjV6TG1Ga2IySmxMbU52YlM5NFlYQXZNUzR3THlJZ2VHMXNibk02ZUcxd1RVMDlJbWgwZEhBNkx5OXVjeTVoWkc5aVpTNWpiMjB2ZUdGd0x6RXVNQzl0YlM4aUlIaHRiRzV6T25OMFVtVm1QU0pvZEhSd09pOHZibk11WVdSdlltVXVZMjl0TDNoaGNDOHhMakF2YzFSNWNHVXZVbVZ6YjNWeVkyVlNaV1lqSWlCNGJYQTZRM0psWVhSdmNsUnZiMnc5SWtGa2IySmxJRkJvYjNSdmMyaHZjQ0JEUXlBb1YybHVaRzkzY3lraUlIaHRjRTFOT2tsdWMzUmhibU5sU1VROUluaHRjQzVwYVdRNk56bEJRemN6T1VVM05USTNNVEZGUVVJeE9EVkdOekJGUmpZMFJFTkVSa01pSUhodGNFMU5Pa1J2WTNWdFpXNTBTVVE5SW5odGNDNWthV1E2TnpsQlF6Y3pPVVkzTlRJM01URkZRVUl4T0RWR056QkZSalkwUkVORVJrTWlQaUE4ZUcxd1RVMDZSR1Z5YVhabFpFWnliMjBnYzNSU1pXWTZhVzV6ZEdGdVkyVkpSRDBpZUcxd0xtbHBaRG8zT1VGRE56TTVRemMxTWpjeE1VVkJRakU0TlVZM01FVkdOalJFUTBSR1F5SWdjM1JTWldZNlpHOWpkVzFsYm5SSlJEMGllRzF3TG1ScFpEbzNPVUZETnpNNVJEYzFNamN4TVVWQlFqRTROVVkzTUVWR05qUkVRMFJHUXlJdlBpQThMM0prWmpwRVpYTmpjbWx3ZEdsdmJqNGdQQzl5WkdZNlVrUkdQaUE4TDNnNmVHMXdiV1YwWVQ0Z1BEOTRjR0ZqYTJWMElHVnVaRDBpY2lJL1ByV0p1SWNBQUFBbVNVUkJWSGphWXZ6Ly96OERFZ0J4R0dFY0pnWThBSzhrQzlRb2RLUGhrb3pVdHhNZ3dBQXlTZ2NPWXkyeHBBQUFBQUJKUlU1RXJrSmdnZz09KSBjZW50ZXIgbm8tcmVwZWF0fSNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3ctYi1tYXgsI2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvdy1iLW1pbiwjY29udHJvbEtpdCAucGFuZWwgLmFycm93LWItc3ViLW1heCwjY29udHJvbEtpdCAucGFuZWwgLmFycm93LWItc3ViLW1pbnt3aWR0aDoxMHB4O2hlaWdodDoxMDAlO2Zsb2F0OnJpZ2h0fSNjb250cm9sS2l0IC5waWNrZXJ7cG9pbnRlci1ldmVudHM6YXV0bzstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym9yZGVyLXJhZGl1czozcHg7LW1vei1ib3JkZXItcmFkaXVzOjNweDtiYWNrZ3JvdW5kLWNvbG9yOiMzYjNiM2I7Zm9udC1mYW1pbHk6bW9ub3NwYWNlO2ZvbnQtc2l6ZToxMXB4O2NvbG9yOiNmZmY7dGV4dC1zaGFkb3c6MXB4IDFweCAjMDAwO292ZXJmbG93OmhpZGRlbjtwb3NpdGlvbjphYnNvbHV0ZTt6LWluZGV4OjIxNDc0ODM2MzE7d2lkdGg6MzYwcHg7LXdlYmtpdC10b3VjaC1jYWxsb3V0Om5vbmU7LXdlYmtpdC11c2VyLXNlbGVjdDpub25lOy1raHRtbC11c2VyLXNlbGVjdDpub25lOy1tb3otdXNlci1zZWxlY3Q6bm9uZTstbXMtdXNlci1zZWxlY3Q6bm9uZTt1c2VyLXNlbGVjdDpub25lO2JveC1zaGFkb3c6MCAycHggMnB4IHJnYmEoMCwwLDAsLjI1KX0jY29udHJvbEtpdCAucGlja2VyIGNhbnZhc3t2ZXJ0aWNhbC1hbGlnbjpib3R0b207Y3Vyc29yOnBvaW50ZXJ9I2NvbnRyb2xLaXQgLnBpY2tlciAud3JhcHstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7cGFkZGluZzoxMHB4O2Zsb2F0OmxlZnR9I2NvbnRyb2xLaXQgLnBpY2tlciAuZmllbGQtd3JhcHtwYWRkaW5nOjNweH0jY29udHJvbEtpdCAucGlja2VyIC5zbGlkZXItd3JhcHtwYWRkaW5nOjNweCAxM3B4IDNweCAzcHh9I2NvbnRyb2xLaXQgLnBpY2tlciAuZmllbGQtd3JhcCwjY29udHJvbEtpdCAucGlja2VyIC5pbnB1dC13cmFwLCNjb250cm9sS2l0IC5waWNrZXIgLnNsaWRlci13cmFwe2hlaWdodDphdXRvO292ZXJmbG93OmhpZGRlbjtmbG9hdDpsZWZ0fSNjb250cm9sS2l0IC5waWNrZXIgLmlucHV0LXdyYXB7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O2JvcmRlcjoxcHggc29saWQgIzI0MjQyNDtib3JkZXItcmFkaXVzOjA7LW1vei1ib3JkZXItcmFkaXVzOjA7d2lkdGg6MTQwcHg7ZmxvYXQ6cmlnaHQ7cGFkZGluZzo1cHggMTBweCAxcHggMH0jY29udHJvbEtpdCAucGlja2VyIC5pbnB1dC1maWVsZHt3aWR0aDo1MCU7ZmxvYXQ6cmlnaHQ7bWFyZ2luLWJvdHRvbTo0cHh9I2NvbnRyb2xLaXQgLnBpY2tlciAuaW5wdXQtZmllbGQgLmxhYmVse3BhZGRpbmc6NXB4IDAgMDtjb2xvcjojODc4Nzg3O3RleHQtYWxpZ246Y2VudGVyO3RleHQtdHJhbnNmb3JtOnVwcGVyY2FzZTtmb250LXdlaWdodDo3MDA7dGV4dC1zaGFkb3c6MXB4IDFweCAjMWExYTFhO3dpZHRoOjQwJX0jY29udHJvbEtpdCAucGlja2VyIC5pbnB1dC1maWVsZCAud3JhcHtwYWRkaW5nOjA7d2lkdGg6NjAlO2hlaWdodDphdXRvO2Zsb2F0OnJpZ2h0fSNjb250cm9sS2l0IC5waWNrZXIgLmNvbnRyb2xzLXdyYXB7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O3dpZHRoOjEwMCU7aGVpZ2h0OmF1dG87ZmxvYXQ6cmlnaHQ7cGFkZGluZzo5cHggMCAwfSNjb250cm9sS2l0IC5waWNrZXIgLmNvbnRyb2xzLXdyYXAgaW5wdXRbdHlwZT1idXR0b25de2Zsb2F0OnJpZ2h0O3dpZHRoOjY1cHg7bWFyZ2luOjAgMCAwIDEwcHh9I2NvbnRyb2xLaXQgLnBpY2tlciAuY29sb3ItY29udHJhc3R7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O2JvcmRlcjpub25lO2JveC1zaGFkb3c6MCAwIDAgMXB4ICMxRjFGMUYgaW5zZXQ7Ym9yZGVyLXJhZGl1czowOy1tb3otYm9yZGVyLXJhZGl1czowO2hlaWdodDoxOHB4O3BhZGRpbmc6M3B4O3dpZHRoOjgwJTttYXJnaW4tYm90dG9tOjRweDtmbG9hdDpyaWdodH0jY29udHJvbEtpdCAucGlja2VyIC5jb2xvci1jb250cmFzdCBkaXZ7d2lkdGg6NTAlO2hlaWdodDoxMDAlO2Zsb2F0OmxlZnR9I2NvbnRyb2xLaXQgLnBpY2tlciBpbnB1dFt0eXBlPXRleHRde3BhZGRpbmc6MDt0ZXh0LWFsaWduOmNlbnRlcjt3aWR0aDo2MCU7ZmxvYXQ6cmlnaHR9I2NvbnRyb2xLaXQgLnBpY2tlciAud3JhcCAuaW5wdXQtd3JhcDpudGgtb2YtdHlwZSgzKXtib3JkZXItYm90dG9tLWxlZnQtcmFkaXVzOjA7Ym9yZGVyLWJvdHRvbS1yaWdodC1yYWRpdXM6MH0jY29udHJvbEtpdCAucGlja2VyIC53cmFwIC5pbnB1dC13cmFwOm50aC1vZi10eXBlKDQpe2JvcmRlci10b3A6bm9uZTtib3JkZXItdG9wLWxlZnQtcmFkaXVzOjA7Ym9yZGVyLXRvcC1yaWdodC1yYWRpdXM6MH0jY29udHJvbEtpdCAucGlja2VyIC53cmFwIC5pbnB1dC13cmFwOm50aC1vZi10eXBlKDQpIC5pbnB1dC1maWVsZHt3aWR0aDoxMDAlfSNjb250cm9sS2l0IC5waWNrZXIgLndyYXAgLmlucHV0LXdyYXA6bnRoLW9mLXR5cGUoNCkgLmlucHV0LWZpZWxkIC5sYWJlbHt3aWR0aDoyMCV9I2NvbnRyb2xLaXQgLnBpY2tlciAud3JhcCAuaW5wdXQtd3JhcDpudGgtb2YtdHlwZSg0KSBpbnB1dFt0eXBlPXRleHRde3dpZHRoOjgwJX0jY29udHJvbEtpdCAucGlja2VyIC5maWVsZC13cmFwLCNjb250cm9sS2l0IC5waWNrZXIgLnNsaWRlci13cmFwe2JhY2tncm91bmQ6IzFlMjIyNDtib3JkZXI6bm9uZTtib3gtc2hhZG93OjAgMCAwIDFweCAjMUYxRjFGIGluc2V0O2JvcmRlci1yYWRpdXM6MDstbW96LWJvcmRlci1yYWRpdXM6MDtwb3NpdGlvbjpyZWxhdGl2ZTttYXJnaW4tcmlnaHQ6NXB4fSNjb250cm9sS2l0IC5waWNrZXIgLmZpZWxkLXdyYXAgLmluZGljYXRvciwjY29udHJvbEtpdCAucGlja2VyIC5zbGlkZXItd3JhcCAuaW5kaWNhdG9ye3Bvc2l0aW9uOmFic29sdXRlO2JvcmRlcjoycHggc29saWQgI2ZmZjtib3gtc2hhZG93OjAgMXB4ICMwMDAsMCAxcHggIzAwMCBpbnNldDtjdXJzb3I6cG9pbnRlcn0jY29udHJvbEtpdCAucGlja2VyIC5maWVsZC13cmFwIC5pbmRpY2F0b3J7d2lkdGg6OHB4O2hlaWdodDo4cHg7bGVmdDo1MCU7dG9wOjUwJTtib3JkZXItcmFkaXVzOjUwJTstbW96LWJvcmRlci1yYWRpdXM6NTAlfSNjb250cm9sS2l0IC5waWNrZXIgLnNsaWRlci13cmFwIC5pbmRpY2F0b3J7d2lkdGg6MTRweDtoZWlnaHQ6M3B4O2JvcmRlci1yYWRpdXM6OHB4Oy1tb3otYm9yZGVyLXJhZGl1czo4cHg7bGVmdDoxcHg7dG9wOjFweH0jY29udHJvbEtpdCAucGlja2VyIC5zbGlkZXItd3JhcCAuaW5kaWNhdG9yOmFmdGVye2NvbnRlbnQ6Jyc7d2lkdGg6MDtoZWlnaHQ6MDtib3JkZXItdG9wOjQuNXB4IHNvbGlkIHRyYW5zcGFyZW50O2JvcmRlci1ib3R0b206NC41cHggc29saWQgdHJhbnNwYXJlbnQ7Ym9yZGVyLXJpZ2h0OjRweCBzb2xpZCAjZmZmO2Zsb2F0OnJpZ2h0O3Bvc2l0aW9uOmFic29sdXRlO3RvcDotMnB4O2xlZnQ6MTlweH0jY29udHJvbEtpdCAucGlja2VyIC5zbGlkZXItd3JhcCAuaW5kaWNhdG9yOmJlZm9yZXtjb250ZW50OicnO3dpZHRoOjA7aGVpZ2h0OjA7Ym9yZGVyLXRvcDo0LjVweCBzb2xpZCB0cmFuc3BhcmVudDtib3JkZXItYm90dG9tOjQuNXB4IHNvbGlkIHRyYW5zcGFyZW50O2JvcmRlci1yaWdodDo0cHggc29saWQgIzAwMDtmbG9hdDpyaWdodDtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6LTNweDtsZWZ0OjE5cHh9XCJcbn07IFxubW9kdWxlLmV4cG9ydHMgPSBTdHlsZTsiLCJmdW5jdGlvbiBFdmVudF8oc2VuZGVyLHR5cGUsZGF0YSkge1xyXG4gICAgdGhpcy5zZW5kZXIgPSBzZW5kZXI7XHJcbiAgICB0aGlzLnR5cGUgICA9IHR5cGU7XHJcbiAgICB0aGlzLmRhdGEgICA9IGRhdGE7XHJcbn1cclxubW9kdWxlLmV4cG9ydHMgPSBFdmVudF87IiwiZnVuY3Rpb24gRXZlbnREaXNwYXRjaGVyKCkge1xyXG4gICAgdGhpcy5fbGlzdGVuZXJzID0gW107XHJcbn07XHJcblxyXG5FdmVudERpc3BhdGNoZXIucHJvdG90eXBlID0ge1xyXG4gICAgYWRkRXZlbnRMaXN0ZW5lcjogZnVuY3Rpb24gKGV2ZW50VHlwZSwgbGlzdGVuZXIsIGNhbGxiYWNrTWV0aG9kKSB7XHJcbiAgICAgICAgdGhpcy5fbGlzdGVuZXJzW2V2ZW50VHlwZV0gPSB0aGlzLl9saXN0ZW5lcnNbZXZlbnRUeXBlXSB8fCBbXTtcclxuICAgICAgICB0aGlzLl9saXN0ZW5lcnNbZXZlbnRUeXBlXS5wdXNoKHtvYmo6IGxpc3RlbmVyLCBtZXRob2Q6IGNhbGxiYWNrTWV0aG9kfSk7XHJcbiAgICB9LFxyXG5cclxuICAgIGRpc3BhdGNoRXZlbnQ6IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIHZhciB0eXBlID0gZXZlbnQudHlwZTtcclxuXHJcbiAgICAgICAgaWYgKCF0aGlzLmhhc0V2ZW50TGlzdGVuZXIodHlwZSkpe1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy5fbGlzdGVuZXJzW3R5cGVdO1xyXG4gICAgICAgIHZhciBpID0gLTEsIGwgPSBsaXN0ZW5lcnMubGVuZ3RoO1xyXG5cclxuICAgICAgICB2YXIgb2JqLCBtZXRob2Q7XHJcblxyXG4gICAgICAgIHdoaWxlICgrK2kgPCBsKSB7XHJcbiAgICAgICAgICAgIG9iaiA9IGxpc3RlbmVyc1tpXS5vYmo7XHJcbiAgICAgICAgICAgIG1ldGhvZCA9IGxpc3RlbmVyc1tpXS5tZXRob2Q7XHJcblxyXG4gICAgICAgICAgICBpZiAoIW9ialttZXRob2RdKXtcclxuICAgICAgICAgICAgICAgIHRocm93IG9iaiArICcgaGFzIG5vIG1ldGhvZCAnICsgbWV0aG9kO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBvYmpbbWV0aG9kXShldmVudCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICByZW1vdmVFdmVudExpc3RlbmVyOiBmdW5jdGlvbiAodHlwZSwgb2JqLCBtZXRob2QpIHtcclxuICAgICAgICBpZiAoIXRoaXMuaGFzRXZlbnRMaXN0ZW5lcih0eXBlKSl7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLl9saXN0ZW5lcnNbdHlwZV07XHJcblxyXG4gICAgICAgIHZhciBpID0gbGlzdGVuZXJzLmxlbmd0aDtcclxuICAgICAgICB3aGlsZSAoLS1pID4gLTEpIHtcclxuICAgICAgICAgICAgaWYgKGxpc3RlbmVyc1tpXS5vYmogPT0gb2JqICYmIGxpc3RlbmVyc1tpXS5tZXRob2QgPT0gbWV0aG9kKSB7XHJcbiAgICAgICAgICAgICAgICBsaXN0ZW5lcnMuc3BsaWNlKGksIDEpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGxpc3RlbmVycy5sZW5ndGggPT0gMCl7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2xpc3RlbmVyc1t0eXBlXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICByZW1vdmVBbGxFdmVudExpc3RlbmVyczogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuX2xpc3RlbmVycyA9IFtdO1xyXG4gICAgfSxcclxuXHJcbiAgICBoYXNFdmVudExpc3RlbmVyOiBmdW5jdGlvbiAodHlwZSkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9saXN0ZW5lcnNbdHlwZV0gIT0gdW5kZWZpbmVkICYmIHRoaXMuX2xpc3RlbmVyc1t0eXBlXSAhPSBudWxsO1xyXG4gICAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBFdmVudERpc3BhdGNoZXI7IiwidmFyIExheW91dE1vZGUgPSB7XHJcbiAgICBMRUZUICAgOiAnbGVmdCcsXHJcbiAgICBSSUdIVCAgOiAncmlnaHQnLFxyXG4gICAgVE9QICAgIDogJ3RvcCcsXHJcbiAgICBCT1RUT00gOiAnYm90dG9tJyxcclxuICAgIE5PTkUgICA6ICdub25lJ1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBMYXlvdXRNb2RlOyIsInZhciBOb2RlICAgPSByZXF1aXJlKCcuLi9kb2N1bWVudC9Ob2RlJyk7XHJcbnZhciBNZXRyaWMgPSByZXF1aXJlKCcuLi8uLi9jb21wb25lbnQvTWV0cmljJyk7XHJcbnZhciBDU1MgICAgPSByZXF1aXJlKCcuLi9kb2N1bWVudC9DU1MnKTtcclxudmFyIERvY3VtZW50RXZlbnQgPSByZXF1aXJlKCcuLi9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXHJcbiAgICBOb2RlRXZlbnQgICAgID0gcmVxdWlyZSgnLi4vZG9jdW1lbnQvTm9kZUV2ZW50Jyk7XHJcbnZhciBNb3VzZSAgPSByZXF1aXJlKCcuLi9kb2N1bWVudC9Nb3VzZScpO1xyXG5cclxuZnVuY3Rpb24gU2Nyb2xsQmFyKHBhcmVudE5vZGUsdGFyZ2V0Tm9kZSx3cmFwSGVpZ2h0KSB7XHJcbiAgICB0aGlzLl9wYXJlbnROb2RlID0gcGFyZW50Tm9kZTtcclxuICAgIHRoaXMuX3RhcmdldE5vZGUgPSB0YXJnZXROb2RlO1xyXG4gICAgdGhpcy5fd3JhcEhlaWdodCA9IHdyYXBIZWlnaHQ7XHJcblxyXG4gICAgdmFyIHdyYXAgICA9IHRoaXMuX3dyYXBOb2RlICAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlNjcm9sbFdyYXApLFxyXG4gICAgICAgIG5vZGUgICA9IHRoaXMuX25vZGUgICAgICAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlNjcm9sbEJhciksXHJcbiAgICAgICAgdHJhY2sgID0gdGhpcy5fdHJhY2tOb2RlICA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuU2Nyb2xsQmFyVHJhY2spLFxyXG4gICAgICAgIHRodW1iICA9IHRoaXMuX3RodW1iTm9kZSAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlNjcm9sbEJhclRodW1iKTtcclxuXHJcbiAgICBwYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRhcmdldE5vZGUpO1xyXG4gICAgcGFyZW50Tm9kZS5hZGRDaGlsZCh3cmFwKTtcclxuICAgIHBhcmVudE5vZGUuYWRkQ2hpbGRBdChub2RlLDApO1xyXG5cclxuICAgIHdyYXAuYWRkQ2hpbGQodGFyZ2V0Tm9kZSk7XHJcbiAgICBub2RlLmFkZENoaWxkKHRyYWNrKTtcclxuICAgIHRyYWNrLmFkZENoaWxkKHRodW1iKTtcclxuXHJcbiAgICB0aGlzLl9tb3VzZVRodW1iT2Zmc2V0ID0gMDtcclxuICAgIHRoaXMuX3Njcm9sbEhlaWdodCA9IDA7XHJcbiAgICB0aGlzLl9zY3JvbGxVbml0ICAgPSAwO1xyXG4gICAgdGhpcy5fc2Nyb2xsTWluICAgID0gMDtcclxuICAgIHRoaXMuX3Njcm9sbE1heCAgICA9IDA7XHJcblxyXG4gICAgdGh1bWIuc2V0UG9zaXRpb25ZKE1ldHJpYy5TQ1JPTExCQVJfVFJBQ0tfUEFERElORyk7XHJcbiAgICB0aHVtYi5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfRE9XTix0aGlzLl9vblRodW1iRHJhZ1N0YXJ0LmJpbmQodGhpcykpO1xyXG5cclxuICAgIHRoaXMuX2lzVmFsaWQgID0gZmFsc2U7XHJcbiAgICB0aGlzLl9lbmFibGVkID0gZmFsc2U7XHJcblxyXG4gICAgdmFyIG5vZGVFbGVtZW50ID0gbm9kZS5nZXRFbGVtZW50KCksXHJcbiAgICAgICAgdGh1bWJFbGVtZW50ID0gdGh1bWIuZ2V0RWxlbWVudCgpO1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgdGhpcy5fb25Nb3VzZVdoZWVsID0gZnVuY3Rpb24oZSl7XHJcbiAgICAgICAgdmFyIHNlbmRlciA9IGUuc2VuZGVyLFxyXG4gICAgICAgICAgICBob3ZlckVsZW1lbnQgPSBzZW5kZXIuZ2V0SG92ZXJFbGVtZW50KCk7XHJcbiAgICAgICAgaWYoaG92ZXJFbGVtZW50ICE9IG5vZGVFbGVtZW50ICYmIGhvdmVyRWxlbWVudCAhPSB0aHVtYkVsZW1lbnQpe1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBzY3JvbGxTdGVwID0gc2VsZi5fc2Nyb2xsSGVpZ2h0ICogMC4wMTI1O1xyXG4gICAgICAgIHNlbGYuX3Njcm9sbCh0aHVtYi5nZXRQb3NpdGlvblkoKSArIHNlbmRlci5nZXRXaGVlbERpcmVjdGlvbigpICogc2Nyb2xsU3RlcCAqIC0xKTtcclxuICAgICAgICBlLmRhdGEucHJldmVudERlZmF1bHQoKTtcclxuICAgIH07XHJcblxyXG4gICAgdGhpcy5hZGRNb3VzZUxpc3RlbmVyKCk7XHJcbn1cclxuXHJcblNjcm9sbEJhci5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oKXtcclxuICAgIHZhciB0YXJnZXQgPSB0aGlzLl90YXJnZXROb2RlLFxyXG4gICAgICAgIHRodW1iID0gdGhpcy5fdGh1bWJOb2RlO1xyXG5cclxuICAgIHZhciBwYWRkaW5nID0gTWV0cmljLlNDUk9MTEJBUl9UUkFDS19QQURESU5HO1xyXG5cclxuICAgIHZhciB0YXJnZXRXcmFwSGVpZ2h0ID0gdGhpcy5fd3JhcEhlaWdodCxcclxuICAgICAgICB0YXJnZXRIZWlnaHQgPSB0YXJnZXQuZ2V0SGVpZ2h0KCksXHJcbiAgICAgICAgdHJhY2tIZWlnaHQgPSB0YXJnZXRXcmFwSGVpZ2h0IC0gcGFkZGluZyAqIDI7XHJcblxyXG4gICAgdGh1bWIuc2V0SGVpZ2h0KHRyYWNrSGVpZ2h0KTtcclxuXHJcbiAgICB2YXIgcmF0aW8gPSB0YXJnZXRXcmFwSGVpZ2h0IC8gdGFyZ2V0SGVpZ2h0O1xyXG5cclxuICAgIHRoaXMuX2lzVmFsaWQgPSBmYWxzZTtcclxuXHJcbiAgICBpZiAocmF0aW8gPiAxLjApe1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHZhciB0aHVtYkhlaWdodCA9IHRyYWNrSGVpZ2h0ICogcmF0aW87XHJcblxyXG4gICAgdGhpcy5fc2Nyb2xsSGVpZ2h0ID0gdHJhY2tIZWlnaHQ7XHJcbiAgICB0aGlzLl9zY3JvbGxVbml0ICAgPSB0YXJnZXRIZWlnaHQgLSB0aGlzLl9zY3JvbGxIZWlnaHQgLSBwYWRkaW5nICogMjtcclxuICAgIHRoaXMuX3Njcm9sbE1pbiAgICA9IHBhZGRpbmc7XHJcbiAgICB0aGlzLl9zY3JvbGxNYXggICAgPSBwYWRkaW5nICsgdHJhY2tIZWlnaHQgLSB0aHVtYkhlaWdodDtcclxuXHJcbiAgICB0aHVtYi5zZXRIZWlnaHQodGh1bWJIZWlnaHQpO1xyXG5cclxuICAgIHRoaXMuX2lzVmFsaWQgPSB0cnVlO1xyXG59O1xyXG5cclxuU2Nyb2xsQmFyLnByb3RvdHlwZS5fc2Nyb2xsID0gZnVuY3Rpb24oeSl7XHJcbiAgICB2YXIgbWluICA9IHRoaXMuX3Njcm9sbE1pbixcclxuICAgICAgICBtYXggID0gdGhpcy5fc2Nyb2xsTWF4LFxyXG4gICAgICAgIHBvcyAgPSBNYXRoLm1heChtaW4sIE1hdGgubWluKHksbWF4KSksXHJcbiAgICAgICAgcG9zXyA9IChwb3MtbWluKS8obWF4LW1pbik7XHJcblxyXG4gICAgdGhpcy5fdGh1bWJOb2RlLnNldFBvc2l0aW9uWShwb3MpO1xyXG4gICAgdGhpcy5fdGFyZ2V0Tm9kZS5zZXRQb3NpdGlvblkocG9zXyAqIHRoaXMuX3Njcm9sbFVuaXQgKiAtMSk7XHJcbn07XHJcblxyXG5cclxuU2Nyb2xsQmFyLnByb3RvdHlwZS5fb25UaHVtYkRyYWdTdGFydCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGlmICghdGhpcy5faXNWYWxpZCB8fCB0aGlzLl9lbmFibGVkKXtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB2YXIgZXZlbnRNb3ZlID0gRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLFxyXG4gICAgICAgIGV2ZW50VXAgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX1VQO1xyXG5cclxuICAgIHZhciBtb3VzZSA9IE1vdXNlLmdldCgpO1xyXG4gICAgdmFyIHRyYWNrT2Zmc2V0ID0gdGhpcy5fdHJhY2tOb2RlLmdldFBvc2l0aW9uR2xvYmFsWSgpO1xyXG5cclxuICAgIHRoaXMuX21vdXNlVGh1bWJPZmZzZXQgPSBtb3VzZS5nZXRZKCkgLSB0aGlzLl90aHVtYk5vZGUuZ2V0UG9zaXRpb25HbG9iYWxZKCk7XHJcblxyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgdmFyIG9uRHJhZyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgc2VsZi5fc2Nyb2xsKG1vdXNlLmdldFkoKSAtIHRyYWNrT2Zmc2V0IC0gc2VsZi5fbW91c2VUaHVtYk9mZnNldCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBvbkRyYWdFbmQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcclxuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudFVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRVcCwgb25EcmFnRW5kLCBmYWxzZSk7XHJcbiAgICB0aGlzLl9zY3JvbGwobW91c2UuZ2V0WSgpIC0gdHJhY2tPZmZzZXQgLSBzZWxmLl9tb3VzZVRodW1iT2Zmc2V0KTtcclxufTtcclxuXHJcblxyXG5TY3JvbGxCYXIucHJvdG90eXBlLmVuYWJsZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuX2VuYWJsZWQgPSBmYWxzZTtcclxuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcclxufTtcclxuXHJcblNjcm9sbEJhci5wcm90b3R5cGUuZGlzYWJsZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuX2VuYWJsZWQgPSB0cnVlO1xyXG4gICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xyXG59O1xyXG5TY3JvbGxCYXIucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5fc2Nyb2xsKDApO1xyXG59O1xyXG5cclxuU2Nyb2xsQmFyLnByb3RvdHlwZS5fdXBkYXRlQXBwZWFyYW5jZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGlmICh0aGlzLl9lbmFibGVkKSB7XHJcbiAgICAgICAgdGhpcy5fbm9kZS5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ25vbmUnKTtcclxuICAgICAgICB0aGlzLl90YXJnZXROb2RlLnNldFBvc2l0aW9uWSgwKTtcclxuICAgICAgICB0aGlzLl90aHVtYk5vZGUuc2V0UG9zaXRpb25ZKE1ldHJpYy5TQ1JPTExCQVJfVFJBQ0tfUEFERElORyk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRoaXMuX25vZGUuc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdibG9jaycpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuU2Nyb2xsQmFyLnByb3RvdHlwZS5pc1ZhbGlkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX2lzVmFsaWQ7XHJcbn07XHJcblxyXG5TY3JvbGxCYXIucHJvdG90eXBlLnNldFdyYXBIZWlnaHQgPSBmdW5jdGlvbiAoaGVpZ2h0KSB7XHJcbiAgICB0aGlzLl93cmFwSGVpZ2h0ID0gaGVpZ2h0O1xyXG4gICAgdGhpcy51cGRhdGUoKTtcclxufTtcclxuXHJcblNjcm9sbEJhci5wcm90b3R5cGUucmVtb3ZlVGFyZ2V0Tm9kZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLl93cmFwTm9kZS5yZW1vdmVDaGlsZCh0aGlzLl90YXJnZXROb2RlKTtcclxufTtcclxuXHJcblNjcm9sbEJhci5wcm90b3R5cGUucmVtb3ZlTW91c2VMaXN0ZW5lciA9IGZ1bmN0aW9uKCl7XHJcbiAgICBNb3VzZS5nZXQoKS5yZW1vdmVFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfV0hFRUwsdGhpcywnX29uTW91c2VXaGVlbCcpO1xyXG59O1xyXG5cclxuU2Nyb2xsQmFyLnByb3RvdHlwZS5hZGRNb3VzZUxpc3RlbmVyID0gZnVuY3Rpb24oKXtcclxuICAgIE1vdXNlLmdldCgpLmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9XSEVFTCx0aGlzLCdfb25Nb3VzZVdoZWVsJyk7XHJcbn07XHJcblxyXG5TY3JvbGxCYXIucHJvdG90eXBlLnJlbW92ZUZyb21QYXJlbnQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgcGFyZW50Tm9kZSA9IHRoaXMuX3BhcmVudE5vZGUsXHJcbiAgICAgICAgcm9vdE5vZGUgPSB0aGlzLl9ub2RlLFxyXG4gICAgICAgIHRhcmdldE5vZGUgPSB0aGlzLl90YXJnZXROb2RlO1xyXG5cclxuICAgIHJvb3ROb2RlLnJlbW92ZUNoaWxkKHRhcmdldE5vZGUpO1xyXG4gICAgcGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLl93cmFwTm9kZSk7XHJcbiAgICBwYXJlbnROb2RlLnJlbW92ZUNoaWxkKHJvb3ROb2RlKTtcclxuXHJcbiAgICByZXR1cm4gdGFyZ2V0Tm9kZTtcclxufTtcclxuXHJcblNjcm9sbEJhci5wcm90b3R5cGUuZ2V0V3JhcE5vZGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fd3JhcE5vZGU7XHJcbn07XHJcblxyXG5TY3JvbGxCYXIucHJvdG90eXBlLmdldE5vZGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fbm9kZTtcclxufTtcclxuXHJcblNjcm9sbEJhci5wcm90b3R5cGUuZ2V0VGFyZ2V0Tm9kZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLl90YXJnZXROb2RlO1xyXG59O1xyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU2Nyb2xsQmFyOyIsInZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50RGlzcGF0Y2hlcicpO1xyXG52YXIgTm9kZSAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XHJcbnZhciBTY3JvbGxCYXIgICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2xheW91dC9TY3JvbGxCYXInKTtcclxuXHJcbmZ1bmN0aW9uIEFic3RyYWN0R3JvdXAocGFyZW50LCBwYXJhbXMpIHtcclxuICAgIEV2ZW50RGlzcGF0Y2hlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG5cclxuICAgIHBhcmFtcyA9IHBhcmFtcyB8fCB7fTtcclxuICAgIHBhcmFtcy5oZWlnaHQgPSBwYXJhbXMuaGVpZ2h0IHx8IG51bGw7XHJcbiAgICBwYXJhbXMuZW5hYmxlID0gcGFyYW1zLmVuYWJsZSA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IHBhcmFtcy5lbmFibGU7XHJcblxyXG4gICAgdGhpcy5fcGFyZW50ID0gcGFyZW50O1xyXG4gICAgdGhpcy5faGVpZ2h0ID0gcGFyYW1zLmhlaWdodDtcclxuICAgIHRoaXMuX2VuYWJsZWQgPSBwYXJhbXMuZW5hYmxlO1xyXG4gICAgdGhpcy5fc2Nyb2xsQmFyID0gbnVsbDtcclxuXHJcbiAgICB0aGlzLl9ub2RlID0gbmV3IE5vZGUoTm9kZS5MSVNUX0lURU0pO1xyXG4gICAgdGhpcy5fd3JhcE5vZGUgPSBuZXcgTm9kZSgpO1xyXG4gICAgdGhpcy5fbGlzdE5vZGUgPSBuZXcgTm9kZShOb2RlLkxJU1QpO1xyXG5cclxuICAgIHRoaXMuX3BhcmVudC5nZXRMaXN0KCkuYWRkQ2hpbGQodGhpcy5fbm9kZSk7XHJcbn1cclxuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUpO1xyXG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEFic3RyYWN0R3JvdXA7XHJcblxyXG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZS5hZGRTY3JvbGxXcmFwID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHdyYXBOb2RlID0gdGhpcy5fd3JhcE5vZGUsXHJcbiAgICAgICAgbWF4SGVpZ2h0ID0gdGhpcy5nZXRNYXhIZWlnaHQoKTtcclxuXHJcbiAgICB0aGlzLl9zY3JvbGxCYXIgPSBuZXcgU2Nyb2xsQmFyKHdyYXBOb2RlLCB0aGlzLl9saXN0Tm9kZSwgbWF4SGVpZ2h0KTtcclxuICAgIGlmICh0aGlzLmlzRW5hYmxlZCgpKSB7XHJcbiAgICAgICAgd3JhcE5vZGUuc2V0SGVpZ2h0KG1heEhlaWdodCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZS5wcmV2ZW50U2VsZWN0RHJhZyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuX3BhcmVudC5wcmV2ZW50U2VsZWN0RHJhZygpO1xyXG5cclxuICAgIGlmICghdGhpcy5oYXNTY3JvbGxXcmFwKCkpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB0aGlzLl93cmFwTm9kZS5nZXRFbGVtZW50KCkuc2Nyb2xsVG9wID0gMDtcclxufTtcclxuXHJcbkFic3RyYWN0R3JvdXAucHJvdG90eXBlLmhhc01heEhlaWdodCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLl9oZWlnaHQgIT0gbnVsbDtcclxufTtcclxuXHJcbkFic3RyYWN0R3JvdXAucHJvdG90eXBlLmdldE1heEhlaWdodCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLl9oZWlnaHQ7XHJcbn07XHJcblxyXG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZS5oYXNTY3JvbGxXcmFwID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX3Njcm9sbEJhciAhPSBudWxsO1xyXG59O1xyXG5cclxuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUuaGFzTGFiZWwgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fbGFibE5vZGUgIT0gbnVsbDtcclxufTtcclxuXHJcbkFic3RyYWN0R3JvdXAucHJvdG90eXBlLmRpc2FibGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLl9lbmFibGVkID0gZmFsc2U7XHJcbiAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XHJcbn07XHJcblxyXG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZS5lbmFibGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLl9lbmFibGVkID0gdHJ1ZTtcclxuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcclxufTtcclxuXHJcbkFic3RyYWN0R3JvdXAucHJvdG90eXBlLmlzRGlzYWJsZWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gIXRoaXMuX2VuYWJsZWQ7XHJcbn07XHJcblxyXG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZS5pc0VuYWJsZWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fZW5hYmxlZDtcclxufTtcclxuXHJcbkFic3RyYWN0R3JvdXAucHJvdG90eXBlLmdldExpc3QgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fbGlzdE5vZGU7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEFic3RyYWN0R3JvdXA7XHJcblxyXG4iLCJ2YXIgQWJzdHJhY3RHcm91cCA9IHJlcXVpcmUoJy4vQWJzdHJhY3RHcm91cCcpO1xyXG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcclxudmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcclxuXHJcbnZhciBTdWJHcm91cCA9IHJlcXVpcmUoJy4vU3ViR3JvdXAnKTtcclxuXHJcbnZhciBFdmVudF8gPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXHJcbiAgICBEb2N1bWVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXHJcbiAgICBOb2RlRXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpLFxyXG4gICAgUGFuZWxFdmVudCA9IHJlcXVpcmUoJy4vUGFuZWxFdmVudCcpLFxyXG4gICAgR3JvdXBFdmVudCA9IHJlcXVpcmUoJy4vR3JvdXBFdmVudCcpO1xyXG5cclxudmFyIE9iamVjdENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvT2JqZWN0Q29tcG9uZW50JyksXHJcbiAgICBWYWx1ZVBsb3R0ZXIgICAgPSByZXF1aXJlKCcuLi9jb21wb25lbnQvVmFsdWVQbG90dGVyJyksXHJcbiAgICBGdW5jdGlvblBsb3R0ZXIgPSByZXF1aXJlKCcuLi9jb21wb25lbnQvRnVuY3Rpb25QbG90dGVyJyk7XHJcblxyXG5mdW5jdGlvbiBHcm91cChwYXJlbnQscGFyYW1zKSB7XHJcbiAgICBwYXJhbXMgICAgICAgICAgID0gcGFyYW1zIHx8IHt9O1xyXG4gICAgcGFyYW1zLmxhYmVsICAgICA9IHBhcmFtcy5sYWJlbCAgICAgfHwgbnVsbDtcclxuICAgIHBhcmFtcy51c2VMYWJlbHMgPSBwYXJhbXMudXNlTGFiZWxzIHx8IHRydWU7XHJcbiAgICBwYXJhbXMuZW5hYmxlICAgID0gcGFyYW1zLmVuYWJsZSAgICAgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBwYXJhbXMuZW5hYmxlO1xyXG5cclxuICAgIEFic3RyYWN0R3JvdXAuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xyXG5cclxuICAgIHRoaXMuX2NvbXBvbmVudHMgPSBbXTtcclxuICAgIHRoaXMuX3N1Ykdyb3VwcyAgPSBbXTtcclxuXHJcbiAgICB2YXIgcm9vdCA9IHRoaXMuX25vZGUsXHJcbiAgICAgICAgd3JhcCA9IHRoaXMuX3dyYXBOb2RlLFxyXG4gICAgICAgIGxpc3QgPSB0aGlzLl9saXN0Tm9kZTtcclxuXHJcbiAgICAgICAgcm9vdC5zZXRTdHlsZUNsYXNzKENTUy5Hcm91cCk7XHJcbiAgICAgICAgd3JhcC5zZXRTdHlsZUNsYXNzKENTUy5XcmFwKTtcclxuICAgICAgICBsaXN0LnNldFN0eWxlQ2xhc3MoQ1NTLlN1Ykdyb3VwTGlzdCk7XHJcblxyXG4gICAgICAgIHdyYXAuYWRkQ2hpbGQobGlzdCk7XHJcblxyXG4gICAgdmFyIGxhYmVsID0gcGFyYW1zLmxhYmVsO1xyXG5cclxuICAgIGlmKGxhYmVsKXtcclxuICAgICAgICB2YXIgaGVhZCAgPSBuZXcgTm9kZSgpLFxyXG4gICAgICAgICAgICB3cmFwXyA9IG5ldyBOb2RlKCksXHJcbiAgICAgICAgICAgIGxhYmVsXyAgPSBuZXcgTm9kZShOb2RlLlNQQU4pLFxyXG4gICAgICAgICAgICBpbmRpY2F0b3IgPSB0aGlzLl9pbmRpTm9kZSA9IG5ldyBOb2RlKCk7XHJcblxyXG4gICAgICAgICAgICBoZWFkLnNldFN0eWxlQ2xhc3MoQ1NTLkhlYWQpO1xyXG4gICAgICAgICAgICB3cmFwXy5zZXRTdHlsZUNsYXNzKENTUy5XcmFwKTtcclxuICAgICAgICAgICAgbGFiZWxfLnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKTtcclxuICAgICAgICAgICAgaW5kaWNhdG9yLnNldFN0eWxlQ2xhc3MoQ1NTLkFycm93Qk1heCk7XHJcbiAgICAgICAgICAgIGxhYmVsXy5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJyxsYWJlbCk7XHJcblxyXG4gICAgICAgICAgICBoZWFkLmFkZENoaWxkKGluZGljYXRvcik7XHJcbiAgICAgICAgICAgIHdyYXBfLmFkZENoaWxkKGxhYmVsXyk7XHJcbiAgICAgICAgICAgIGhlYWQuYWRkQ2hpbGQod3JhcF8pO1xyXG4gICAgICAgICAgICByb290LmFkZENoaWxkKGhlYWQpO1xyXG5cclxuICAgICAgICBoZWFkLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sdGhpcy5fb25IZWFkVHJpZ2dlci5iaW5kKHRoaXMpKTtcclxuICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5HUk9VUF9MSVNUX1NJWkVfQ0hBTkdFLHBhcmVudCwnb25Hcm91cExpc3RTaXplQ2hhbmdlJyk7XHJcblxyXG4gICAgICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcclxuICAgIH1cclxuXHJcbiAgICBpZih0aGlzLmhhc01heEhlaWdodCgpKXtcclxuICAgICAgICB0aGlzLmFkZFNjcm9sbFdyYXAoKTtcclxuICAgIH1cclxuXHJcbiAgICByb290LmFkZENoaWxkKHdyYXApO1xyXG5cclxuICAgIGlmKHRoaXMuaGFzTWF4SGVpZ2h0KCkpe1xyXG4gICAgICAgIGlmKCFsYWJlbCl7XHJcbiAgICAgICAgICAgIHZhciBidWZmZXJUb3AgPSB0aGlzLl9zY3JvbGxCdWZmZXJUb3AgPSBuZXcgTm9kZSgpO1xyXG4gICAgICAgICAgICAgICAgYnVmZmVyVG9wLnNldFN0eWxlQ2xhc3MoQ1NTLlNjcm9sbEJ1ZmZlcik7XHJcblxyXG4gICAgICAgICAgICByb290LmFkZENoaWxkQXQoYnVmZmVyVG9wLDApO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgYnVmZmVyQm90dG9tID0gdGhpcy5fc2Nyb2xsQnVmZmVyQm90dG9tID0gbmV3IE5vZGUoKTtcclxuICAgICAgICAgICAgYnVmZmVyQm90dG9tLnNldFN0eWxlQ2xhc3MoQ1NTLlNjcm9sbEJ1ZmZlcik7XHJcblxyXG4gICAgICAgIHJvb3QuYWRkQ2hpbGQoYnVmZmVyQm90dG9tKTtcclxuICAgIH1cclxuXHJcbiAgICBwYXJlbnQgPSB0aGlzLl9wYXJlbnQ7XHJcblxyXG4gICAgcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoUGFuZWxFdmVudC5QQU5FTF9NT1ZFX0JFR0lOLCB0aGlzLCAnb25QYW5lbE1vdmVCZWdpbicpO1xyXG4gICAgcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoUGFuZWxFdmVudC5QQU5FTF9NT1ZFLCB0aGlzLCAnb25QYW5lbE1vdmUnKTtcclxuICAgIHBhcmVudC5hZGRFdmVudExpc3RlbmVyKFBhbmVsRXZlbnQuUEFORUxfTU9WRV9FTkQsIHRoaXMsICdvblBhbmVsTW92ZUVuZCcpO1xyXG4gICAgcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoUGFuZWxFdmVudC5QQU5FTF9ISURFLCB0aGlzLCAnb25QYW5lbEhpZGUnKTtcclxuICAgIHBhcmVudC5hZGRFdmVudExpc3RlbmVyKFBhbmVsRXZlbnQuUEFORUxfU0hPVywgdGhpcywgJ29uUGFuZWxTaG93Jyk7XHJcbiAgICBwYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihQYW5lbEV2ZW50LlBBTkVMX1NDUk9MTF9XUkFQX0FEREVELCB0aGlzLCAnb25QYW5lbFNjcm9sbFdyYXBBZGRlZCcpO1xyXG4gICAgcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoUGFuZWxFdmVudC5QQU5FTF9TQ1JPTExfV1JBUF9SRU1PVkVELCB0aGlzLCAnb25QYW5lbFNjcm9sbFdyYXBSZW1vdmVkJyk7XHJcbiAgICBwYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihQYW5lbEV2ZW50LlBBTkVMX1NJWkVfQ0hBTkdFLCB0aGlzLCAnb25QYW5lbFNpemVDaGFuZ2UnKTtcclxuICAgIHBhcmVudC5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuV0lORE9XX1JFU0laRSwgdGhpcywgJ29uV2luZG93UmVzaXplJyk7XHJcblxyXG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UscGFyZW50LCdvbkdyb3VwTGlzdFNpemVDaGFuZ2UnKTtcclxufVxyXG5Hcm91cC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEFic3RyYWN0R3JvdXAucHJvdG90eXBlKTtcclxuR3JvdXAucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gR3JvdXA7XHJcblxyXG5Hcm91cC5wcm90b3R5cGUub25QYW5lbE1vdmVCZWdpbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIFBhbmVsRXZlbnQuUEFORUxfTU9WRV9CRUdJTiwgbnVsbCkpO1xyXG59O1xyXG5cclxuR3JvdXAucHJvdG90eXBlLm9uUGFuZWxNb3ZlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgUGFuZWxFdmVudC5QQU5FTF9NT1ZFLCBudWxsKSk7XHJcbn07XHJcblxyXG5Hcm91cC5wcm90b3R5cGUub25QYW5lbE1vdmVFbmQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX01PVkVfRU5ELCBudWxsKSk7XHJcbn07XHJcblxyXG5Hcm91cC5wcm90b3R5cGUub25QYW5lbFNjcm9sbFdyYXBBZGRlZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UsIG51bGwpKTtcclxufTtcclxuXHJcbkdyb3VwLnByb3RvdHlwZS5vblBhbmVsU2Nyb2xsV3JhcFJlbW92ZWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBHcm91cEV2ZW50LkdST1VQX1NJWkVfQ0hBTkdFLCBudWxsKSk7XHJcbn07XHJcblxyXG5Hcm91cC5wcm90b3R5cGUub25QYW5lbEhpZGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBHcm91cEV2ZW50LlNVQkdST1VQX0RJU0FCTEUsIG51bGwpKTtcclxufTtcclxuXHJcbkdyb3VwLnByb3RvdHlwZS5vblBhbmVsU2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIEdyb3VwRXZlbnQuU1VCR1JPVVBfRU5BQkxFLCBudWxsKSk7XHJcbn07XHJcblxyXG5Hcm91cC5wcm90b3R5cGUub25QYW5lbFNpemVDaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBHcm91cEV2ZW50LkdST1VQX1NJWkVfQ0hBTkdFLCBudWxsKSk7XHJcbn07XHJcblxyXG5Hcm91cC5wcm90b3R5cGUub25XaW5kb3dSZXNpemUgPSBmdW5jdGlvbiAoZSkge1xyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KGUpO1xyXG59O1xyXG5cclxuR3JvdXAucHJvdG90eXBlLm9uU3ViR3JvdXBUcmlnZ2VyID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5fdXBkYXRlSGVpZ2h0KCk7XHJcblxyXG4gICAgaWYoIXRoaXMuaGFzTWF4SGVpZ2h0KCkpe1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHZhciBzY3JvbGxCYXIgPSB0aGlzLl9zY3JvbGxCYXIsXHJcbiAgICAgICAgd3JhcCAgPSB0aGlzLl93cmFwTm9kZTtcclxuICAgIHZhciBidWZmZXJUb3AgICAgPSB0aGlzLl9zY3JvbGxCdWZmZXJUb3AsXHJcbiAgICAgICAgYnVmZmVyQm90dG9tID0gdGhpcy5fc2Nyb2xsQnVmZmVyQm90dG9tO1xyXG5cclxuICAgIHNjcm9sbEJhci51cGRhdGUoKTtcclxuXHJcbiAgICBpZiAoIXNjcm9sbEJhci5pc1ZhbGlkKCkpIHtcclxuICAgICAgICBzY3JvbGxCYXIuZGlzYWJsZSgpO1xyXG4gICAgICAgIHdyYXAuc2V0SGVpZ2h0KHdyYXAuZ2V0Q2hpbGRBdCgxKS5nZXRIZWlnaHQoKSk7XHJcbiAgICAgICAgaWYgKGJ1ZmZlclRvcCl7XHJcbiAgICAgICAgICAgIGJ1ZmZlclRvcC5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ25vbmUnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGJ1ZmZlckJvdHRvbSl7XHJcbiAgICAgICAgICAgIGJ1ZmZlckJvdHRvbS5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ25vbmUnKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBzY3JvbGxCYXIuZW5hYmxlKCk7XHJcbiAgICAgICAgd3JhcC5zZXRIZWlnaHQodGhpcy5nZXRNYXhIZWlnaHQoKSk7XHJcblxyXG4gICAgICAgIGlmIChidWZmZXJUb3Ape1xyXG4gICAgICAgICAgICBidWZmZXJUb3Auc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdibG9jaycpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoYnVmZmVyQm90dG9tKXtcclxuICAgICAgICAgICAgYnVmZmVyQm90dG9tLnNldFN0eWxlUHJvcGVydHkoJ2Rpc3BsYXknLCAnYmxvY2snKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UsbnVsbCkpO1xyXG59O1xyXG5cclxuR3JvdXAucHJvdG90eXBlLl9vbkhlYWRUcmlnZ2VyID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5fZW5hYmxlZCA9ICF0aGlzLl9lbmFibGVkO1xyXG4gICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgR3JvdXBFdmVudC5HUk9VUF9MSVNUX1NJWkVfQ0hBTkdFLCBudWxsKSk7XHJcbn07XHJcblxyXG5Hcm91cC5wcm90b3R5cGUuYWRkQ29tcG9uZW50ID0gZnVuY3Rpb24oKXtcclxuICAgIHZhciBDbGFzc18gPSBhcmd1bWVudHNbMF07XHJcbiAgICB2YXIgYXJncyAgID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcclxuICAgICAgICBhcmdzLnNoaWZ0KCk7XHJcbiAgICAgICAgYXJncy51bnNoaWZ0KHRoaXMuX2dldFN1Ykdyb3VwKCkpO1xyXG5cclxuICAgIHZhciBpbnN0YW5jZSA9IE9iamVjdC5jcmVhdGUoQ2xhc3NfLnByb3RvdHlwZSk7XHJcbiAgICBDbGFzc18uYXBwbHkoaW5zdGFuY2UsYXJncyk7XHJcblxyXG4gICAgdGhpcy5fY29tcG9uZW50cy5wdXNoKGluc3RhbmNlKTtcclxuICAgIHRoaXMuX3VwZGF0ZUhlaWdodCgpO1xyXG59O1xyXG5cclxuR3JvdXAucHJvdG90eXBlLl91cGRhdGVIZWlnaHQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLl9nZXRTdWJHcm91cCgpLnVwZGF0ZSgpO1xyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcyxHcm91cEV2ZW50LkdST1VQX1NJWkVfQ0hBTkdFLG51bGwpKTtcclxuICAgIGlmKHRoaXMuaGFzTWF4SGVpZ2h0KCkpe1xyXG4gICAgICAgIHRoaXMuX3Njcm9sbEJhci51cGRhdGUoKTtcclxuICAgIH1cclxufTtcclxuXHJcbkdyb3VwLnByb3RvdHlwZS5fdXBkYXRlQXBwZWFyYW5jZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciB3cmFwID0gdGhpcy5fd3JhcE5vZGUsXHJcbiAgICAgICAgaW5kaWNhdG9yID0gdGhpcy5faW5kaU5vZGU7XHJcblxyXG4gICAgdmFyIHNjcm9sbEJhciA9IHRoaXMuX3Njcm9sbEJhcjtcclxuXHJcbiAgICB2YXIgYnVmZmVyVG9wICAgID0gdGhpcy5fc2Nyb2xsQnVmZmVyVG9wLFxyXG4gICAgICAgIGJ1ZmZlckJvdHRvbSA9IHRoaXMuX3Njcm9sbEJ1ZmZlckJvdHRvbTtcclxuXHJcbiAgICBpZiAodGhpcy5pc0Rpc2FibGVkKCkpIHtcclxuICAgICAgICB3cmFwLnNldEhlaWdodCgwKTtcclxuICAgICAgICBpZiAoaW5kaWNhdG9yKXtcclxuICAgICAgICAgICAgaW5kaWNhdG9yLnNldFN0eWxlQ2xhc3MoQ1NTLkFycm93Qk1pbik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoc2Nyb2xsQmFyKSB7XHJcbiAgICAgICAgICAgIGlmIChidWZmZXJUb3Ape1xyXG4gICAgICAgICAgICAgICAgYnVmZmVyVG9wLnNldFN0eWxlUHJvcGVydHkoJ2Rpc3BsYXknLCAnbm9uZScpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChidWZmZXJCb3R0b20pe1xyXG4gICAgICAgICAgICAgICAgYnVmZmVyQm90dG9tLnNldFN0eWxlUHJvcGVydHkoJ2Rpc3BsYXknLCAnbm9uZScpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodGhpcy5oYXNNYXhIZWlnaHQoKSkge1xyXG4gICAgICAgIHZhciBtYXhIZWlnaHQgPSB0aGlzLmdldE1heEhlaWdodCgpLFxyXG4gICAgICAgICAgICBsaXN0SGVpZ2h0ID0gd3JhcC5nZXRDaGlsZEF0KDEpLmdldEhlaWdodCgpO1xyXG5cclxuICAgICAgICB3cmFwLnNldEhlaWdodChsaXN0SGVpZ2h0IDwgbWF4SGVpZ2h0ID8gbGlzdEhlaWdodCA6IG1heEhlaWdodCk7XHJcblxyXG4gICAgICAgIGlmIChzY3JvbGxCYXIuaXNWYWxpZCgpKSB7XHJcbiAgICAgICAgICAgIGlmIChidWZmZXJUb3Ape1xyXG4gICAgICAgICAgICAgICAgYnVmZmVyVG9wLnNldFN0eWxlUHJvcGVydHkoJ2Rpc3BsYXknLCAnYmxvY2snKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoYnVmZmVyQm90dG9tKXtcclxuICAgICAgICAgICAgICAgIGJ1ZmZlckJvdHRvbS5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ2Jsb2NrJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICB3cmFwLmRlbGV0ZVN0eWxlUHJvcGVydHkoJ2hlaWdodCcpO1xyXG4gICAgfVxyXG4gICAgaWYgKGluZGljYXRvcil7XHJcbiAgICAgICAgaW5kaWNhdG9yLnNldFN0eWxlQ2xhc3MoQ1NTLkFycm93Qk1heCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5Hcm91cC5wcm90b3R5cGUub25Hcm91cFNpemVVcGRhdGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XHJcbiAgICBpZiAodGhpcy5oYXNNYXhIZWlnaHQoKSl7XHJcbiAgICAgICAgdGhpcy5fc2Nyb2xsQmFyLnVwZGF0ZSgpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuR3JvdXAucHJvdG90eXBlLmFkZFN1Ykdyb3VwID0gZnVuY3Rpb24gKHBhcmFtcykge1xyXG4gICAgdGhpcy5fc3ViR3JvdXBzLnB1c2gobmV3IFN1Ykdyb3VwKHRoaXMsIHBhcmFtcykpO1xyXG4gICAgdGhpcy5fdXBkYXRlSGVpZ2h0KCk7XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbkdyb3VwLnByb3RvdHlwZS5fZ2V0U3ViR3JvdXAgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgc3ViR3JvdXBzID0gdGhpcy5fc3ViR3JvdXBzO1xyXG4gICAgaWYgKHN1Ykdyb3Vwcy5sZW5ndGggPT0gMCl7XHJcbiAgICAgICAgc3ViR3JvdXBzLnB1c2gobmV3IFN1Ykdyb3VwKHRoaXMpKTtcclxuICAgIH1cclxuICAgIHJldHVybiBzdWJHcm91cHNbc3ViR3JvdXBzLmxlbmd0aCAtIDFdO1xyXG59O1xyXG5cclxuR3JvdXAucHJvdG90eXBlLmdldENvbXBvbmVudHMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fY29tcG9uZW50cztcclxufTtcclxuXHJcbmZ1bmN0aW9uIGlzRGF0YUNvbXAoY29tcCl7XHJcbiAgICByZXR1cm4gIChjb21wIGluc3RhbmNlb2YgT2JqZWN0Q29tcG9uZW50KSAmJlxyXG4gICAgICAgICAgICEoY29tcCBpbnN0YW5jZW9mIFZhbHVlUGxvdHRlcikgJiZcclxuICAgICAgICAgICAhKGNvbXAgaW5zdGFuY2VvZiBGdW5jdGlvblBsb3R0ZXIpO1xyXG59XHJcblxyXG5cclxuR3JvdXAucHJvdG90eXBlLnNldERhdGEgPSBmdW5jdGlvbihkYXRhKXtcclxuICAgIHZhciBjb21wcyA9IHRoaXMuX2NvbXBvbmVudHMsIGNvbXAsIGRhdGFfO1xyXG4gICAgdmFyIGkgPSAtMSwgaiA9IDAsIGwgPSBjb21wcy5sZW5ndGg7XHJcbiAgICB3aGlsZSgrK2kgPCBsKXtcclxuICAgICAgICBjb21wID0gY29tcHNbaV07XHJcbiAgICAgICAgaWYoIWlzRGF0YUNvbXAoY29tcCkpe1xyXG4gICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZGF0YV8gPSBkYXRhW2orK107XHJcbiAgICAgICAgY29tcC5zZXRWYWx1ZShkYXRhX1tPYmplY3Qua2V5cyhkYXRhXylbMF1dKTtcclxuICAgIH1cclxufTtcclxuXHJcbkdyb3VwLnByb3RvdHlwZS5nZXREYXRhID0gZnVuY3Rpb24oKXtcclxuICAgIHZhciBjb21wcyA9IHRoaXMuX2NvbXBvbmVudHMsXHJcbiAgICAgICAgaSA9IC0xLCBsID0gY29tcHMubGVuZ3RoO1xyXG4gICAgdmFyIHZhbHVlcyA9IFtdO1xyXG4gICAgdmFyIGNvbXA7XHJcbiAgICB3aGlsZSgrK2kgPCBsKXtcclxuICAgICAgICBjb21wID0gY29tcHNbaV07XHJcbiAgICAgICAgaWYoIWlzRGF0YUNvbXAoY29tcCkpe1xyXG4gICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFsdWVzLnB1c2goY29tcC5nZXREYXRhKCkpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHZhbHVlcztcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gR3JvdXA7XHJcbiIsInZhciBHcm91cEV2ZW50ID0ge1xyXG5cdEdST1VQX1NJWkVfQ0hBTkdFICAgICAgICA6ICdncm91cFNpemVDaGFuZ2UnLFxyXG5cdEdST1VQX0xJU1RfU0laRV9DSEFOR0UgICA6ICdncm91cExpc3RTaXplQ2hhbmdlJyxcclxuXHRHUk9VUF9TSVpFX1VQREFURSAgICAgICAgOiAnZ3JvdXBTaXplVXBkYXRlJyxcclxuXHRTVUJHUk9VUF9UUklHR0VSICAgICAgICAgOiAnc3ViR3JvdXBUcmlnZ2VyJyxcclxuXHJcblx0U1VCR1JPVVBfRU5BQkxFICAgICAgICAgIDogJ2VuYWJsZVN1Ykdyb3VwJyxcclxuXHRTVUJHUk9VUF9ESVNBQkxFICAgICAgICAgOiAnZGlzYWJsZVN1Ykdyb3VwJ1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBHcm91cEV2ZW50OyIsInZhciBNZW51RXZlbnQgPSB7XHJcblx0VVBEQVRFX01FTlU6ICd1cGRhdGVNZW51J1xyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IE1lbnVFdmVudDsiLCJ2YXIgTm9kZSAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyksXHJcbiAgICBHcm91cCAgICAgPSByZXF1aXJlKCcuL0dyb3VwJyksXHJcbiAgICBTY3JvbGxCYXIgPSByZXF1aXJlKCcuLi9jb3JlL2xheW91dC9TY3JvbGxCYXInKTtcclxuXHJcbnZhciBDU1MgICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcclxudmFyIExheW91dE1vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2xheW91dC9MYXlvdXRNb2RlJyk7XHJcbnZhciBIaXN0b3J5ICAgID0gcmVxdWlyZSgnLi4vY29yZS9IaXN0b3J5Jyk7XHJcblxyXG52YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudERpc3BhdGNoZXInKSxcclxuICAgIEV2ZW50XyAgICAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcclxuICAgIERvY3VtZW50RXZlbnQgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxyXG4gICAgTm9kZUV2ZW50ICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKSxcclxuICAgIFBhbmVsRXZlbnQgICAgICA9IHJlcXVpcmUoJy4vUGFuZWxFdmVudCcpLFxyXG4gICAgTWVudUV2ZW50ICAgICAgID0gcmVxdWlyZSgnLi9NZW51RXZlbnQnKTtcclxuXHJcbnZhciBNb3VzZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTW91c2UnKTtcclxuXHJcbnZhciBTdHJpbmdJbnB1dCAgICAgPSByZXF1aXJlKCcuLi9jb21wb25lbnQvU3RyaW5nSW5wdXQnKSxcclxuICAgIE51bWJlcklucHV0ICAgICA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9OdW1iZXJJbnB1dCcpLFxyXG4gICAgUmFuZ2UgICAgICAgICAgID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L1JhbmdlJyksXHJcbiAgICBDaGVja2JveCAgICAgICAgPSByZXF1aXJlKCcuLi9jb21wb25lbnQvQ2hlY2tib3gnKSxcclxuICAgIENvbG9yICAgICAgICAgICA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9Db2xvcicpLFxyXG4gICAgQnV0dG9uICAgICAgICAgID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L0J1dHRvbicpLFxyXG4gICAgU2VsZWN0ICAgICAgICAgID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L1NlbGVjdCcpLFxyXG4gICAgU2xpZGVyICAgICAgICAgID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L1NsaWRlcicpLFxyXG4gICAgRnVuY3Rpb25QbG90dGVyID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L0Z1bmN0aW9uUGxvdHRlcicpLFxyXG4gICAgUGFkICAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L1BhZCcpLFxyXG4gICAgVmFsdWVQbG90dGVyICAgID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L1ZhbHVlUGxvdHRlcicpLFxyXG4gICAgTnVtYmVyT3V0cHV0ICAgID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L051bWJlck91dHB1dCcpLFxyXG4gICAgU3RyaW5nT3V0cHV0ICAgID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L1N0cmluZ091dHB1dCcpLFxyXG4gICAgQ2FudmFzXyAgICAgICAgID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L0NhbnZhcycpLFxyXG4gICAgU1ZHXyAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L1NWRycpO1xyXG5cclxudmFyIERFRkFVTFRfUEFORUxfUE9TSVRJT04gPSBudWxsLFxyXG4gICAgREVGQVVMVF9QQU5FTF9XSURUSCAgICAgID0gMjAwLFxyXG4gICAgREVGQVVMVF9QQU5FTF9IRUlHSFQgICAgID0gbnVsbCxcclxuICAgIERFRkFVTFRfUEFORUxfV0lEVEhfTUlOICA9IDEwMCxcclxuICAgIERFRkFVTFRfUEFORUxfV0lEVEhfTUFYICA9IDgwMCxcclxuICAgIERFRkFVTFRfUEFORUxfUkFUSU8gICAgICA9IDQwLFxyXG4gICAgREVGQVVMVF9QQU5FTF9MQUJFTCAgICAgID0gJ1BhcmFtZXRlcnMgKFApJyxcclxuICAgIERFRkFVTFRfUEFORUxfVkFMSUdOICAgICA9IExheW91dE1vZGUuVE9QLFxyXG4gICAgREVGQVVMVF9QQU5FTF9BTElHTiAgICAgID0gTGF5b3V0TW9kZS5SSUdIVCxcclxuICAgIERFRkFVTFRfUEFORUxfRE9DSyAgICAgICA9IHthbGlnbjpMYXlvdXRNb2RlLlJJR0hULHJlc2l6YWJsZTp0cnVlfSxcclxuICAgIERFRkFVTFRfUEFORUxfRU5BQkxFICAgICA9IHRydWUsXHJcbiAgICBERUZBVUxUX1BBTkVMX09QQUNJVFkgICAgPSAxLjAsXHJcbiAgICBERUZBVUxUX1BBTkVMX0ZJWEVEICAgICAgPSB0cnVlLFxyXG4gICAgREVGQVVMVF9QQU5FTF9WQ09OU1RSQUlOID0gdHJ1ZTtcclxuXHJcbmZ1bmN0aW9uIFBhbmVsKGNvbnRyb2xLaXQscGFyYW1zKXtcclxuICAgIEV2ZW50RGlzcGF0Y2hlci5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XHJcbiAgICB0aGlzLl9wYXJlbnQgPSBjb250cm9sS2l0O1xyXG5cclxuXHJcbiAgICBwYXJhbXMgICAgICAgICAgICA9IHBhcmFtcyAgICAgICAgICAgfHwge307XHJcbiAgICBwYXJhbXMudmFsaWduICAgICA9IHBhcmFtcy52YWxpZ24gICAgfHwgREVGQVVMVF9QQU5FTF9WQUxJR047XHJcbiAgICBwYXJhbXMuYWxpZ24gICAgICA9IHBhcmFtcy5hbGlnbiAgICAgfHwgREVGQVVMVF9QQU5FTF9BTElHTjtcclxuICAgIHBhcmFtcy5wb3NpdGlvbiAgID0gcGFyYW1zLnBvc2l0aW9uICB8fCBERUZBVUxUX1BBTkVMX1BPU0lUSU9OO1xyXG4gICAgcGFyYW1zLndpZHRoICAgICAgPSBwYXJhbXMud2lkdGggICAgIHx8IERFRkFVTFRfUEFORUxfV0lEVEg7XHJcbiAgICBwYXJhbXMuaGVpZ2h0ICAgICA9IHBhcmFtcy5oZWlnaHQgICAgfHwgREVGQVVMVF9QQU5FTF9IRUlHSFQ7XHJcbiAgICBwYXJhbXMucmF0aW8gICAgICA9IHBhcmFtcy5yYXRpbyAgICAgfHwgREVGQVVMVF9QQU5FTF9SQVRJTztcclxuICAgIHBhcmFtcy5sYWJlbCAgICAgID0gcGFyYW1zLmxhYmVsICAgICB8fCBERUZBVUxUX1BBTkVMX0xBQkVMO1xyXG4gICAgcGFyYW1zLm9wYWNpdHkgICAgPSBwYXJhbXMub3BhY2l0eSAgIHx8IERFRkFVTFRfUEFORUxfT1BBQ0lUWTtcclxuICAgIHBhcmFtcy5maXhlZCAgICAgID0gcGFyYW1zLmZpeGVkICAgICAgPT09IHVuZGVmaW5lZCA/IERFRkFVTFRfUEFORUxfRklYRUQgICAgICA6IHBhcmFtcy5maXhlZDtcclxuICAgIHBhcmFtcy5lbmFibGUgICAgID0gcGFyYW1zLmVuYWJsZSAgICAgPT09IHVuZGVmaW5lZCA/IERFRkFVTFRfUEFORUxfRU5BQkxFICAgICA6IHBhcmFtcy5lbmFibGU7XHJcbiAgICBwYXJhbXMudmNvbnN0cmFpbiA9IHBhcmFtcy52Y29uc3RyYWluID09PSB1bmRlZmluZWQgPyBERUZBVUxUX1BBTkVMX1ZDT05TVFJBSU4gOiBwYXJhbXMudmNvbnN0cmFpbjtcclxuXHJcbiAgICBpZiAocGFyYW1zLmRvY2spIHtcclxuICAgICAgICBwYXJhbXMuZG9jay5hbGlnbiA9IHBhcmFtcy5kb2NrLmFsaWduIHx8IERFRkFVTFRfUEFORUxfRE9DSy5hbGlnbjtcclxuICAgICAgICBwYXJhbXMuZG9jay5yZXNpemFibGUgPSBwYXJhbXMuZG9jay5yZXNpemFibGUgfHwgREVGQVVMVF9QQU5FTF9ET0NLLnJlc2l6YWJsZTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLl93aWR0aCAgICAgID0gTWF0aC5tYXgoREVGQVVMVF9QQU5FTF9XSURUSF9NSU4sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgTWF0aC5taW4ocGFyYW1zLndpZHRoLERFRkFVTFRfUEFORUxfV0lEVEhfTUFYKSk7XHJcbiAgICB0aGlzLl9oZWlnaHQgICAgID0gcGFyYW1zLmhlaWdodCA/ICBNYXRoLm1heCgwLE1hdGgubWluKHBhcmFtcy5oZWlnaHQsd2luZG93LmlubmVySGVpZ2h0KSkgOiBudWxsO1xyXG4gICAgdGhpcy5fZml4ZWQgICAgICA9IHBhcmFtcy5maXhlZDtcclxuICAgIHRoaXMuX2RvY2sgICAgICAgPSBwYXJhbXMuZG9jaztcclxuICAgIHRoaXMuX3Bvc2l0aW9uICAgPSBwYXJhbXMucG9zaXRpb247XHJcbiAgICB0aGlzLl92Q29uc3RyYWluID0gcGFyYW1zLnZjb25zdHJhaW47XHJcbiAgICB0aGlzLl9sYWJlbCAgICAgID0gcGFyYW1zLmxhYmVsO1xyXG4gICAgdGhpcy5fZW5hYmxlZCAgICA9IHBhcmFtcy5lbmFibGU7XHJcbiAgICB0aGlzLl9ncm91cHMgICAgID0gW107XHJcblxyXG5cclxuICAgIHZhciB3aWR0aCAgICA9IHRoaXMuX3dpZHRoLFxyXG4gICAgICAgIGlzRml4ZWQgID0gdGhpcy5fZml4ZWQsXHJcbiAgICAgICAgZG9jayAgICAgPSB0aGlzLl9kb2NrLFxyXG4gICAgICAgIHBvc2l0aW9uID0gdGhpcy5fcG9zaXRpb24sXHJcbiAgICAgICAgbGFiZWwgICAgPSB0aGlzLl9sYWJlbCxcclxuICAgICAgICBhbGlnbiAgICA9IHBhcmFtcy5hbGlnbixcclxuICAgICAgICBvcGFjaXR5ICA9IHBhcmFtcy5vcGFjaXR5O1xyXG5cclxuXHJcbiAgICB2YXIgcm9vdCA9IHRoaXMuX25vZGUgICAgID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QYW5lbCksXHJcbiAgICAgICAgaGVhZCA9IHRoaXMuX2hlYWROb2RlID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5IZWFkKSxcclxuICAgICAgICBtZW51ICAgICAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLk1lbnUpLFxyXG4gICAgICAgIGxhYmVsV3JhcCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCksXHJcbiAgICAgICAgbGFiZWxfICAgID0gbmV3IE5vZGUoTm9kZS5TUEFOKS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCksXHJcbiAgICAgICAgd3JhcCA9IHRoaXMuX3dyYXBOb2RlID0gbmV3IE5vZGUoTm9kZS5ESVYpLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApLFxyXG4gICAgICAgIGxpc3QgPSB0aGlzLl9saXN0Tm9kZSA9IG5ldyBOb2RlKE5vZGUuTElTVCkuc2V0U3R5bGVDbGFzcyhDU1MuR3JvdXBMaXN0KTtcclxuXHJcbiAgICByb290LnNldFdpZHRoKHdpZHRoKTtcclxuICAgIGxhYmVsXy5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywgbGFiZWwpO1xyXG5cclxuICAgIGxhYmVsV3JhcC5hZGRDaGlsZChsYWJlbF8pO1xyXG4gICAgaGVhZC5hZGRDaGlsZChtZW51KTtcclxuICAgIGhlYWQuYWRkQ2hpbGQobGFiZWxXcmFwKTtcclxuICAgIHdyYXAuYWRkQ2hpbGQobGlzdCk7XHJcbiAgICByb290LmFkZENoaWxkKGhlYWQpO1xyXG4gICAgcm9vdC5hZGRDaGlsZCh3cmFwKTtcclxuXHJcbiAgICBjb250cm9sS2l0LmdldE5vZGUoKS5hZGRDaGlsZChyb290KTtcclxuXHJcblxyXG4gICAgaWYgKCFkb2NrKSB7XHJcbiAgICAgICAgdmFyIG1lbnVIaWRlID0gdGhpcy5fbWVudUhpZGUgPSBuZXcgTm9kZShOb2RlLklOUFVUX0JVVFRPTik7XHJcbiAgICAgICAgICAgIG1lbnVIaWRlLnNldFN0eWxlQ2xhc3MoQ1NTLkJ1dHRvbk1lbnVIaWRlKTtcclxuICAgICAgICAgICAgaGVhZC5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLCB0aGlzLl9vbk1lbnVIaWRlTW91c2VEb3duLmJpbmQodGhpcykpO1xyXG5cclxuICAgICAgICBtZW51LmFkZENoaWxkKG1lbnVIaWRlKTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuX3BhcmVudC5wYW5lbHNBcmVDbG9zYWJsZSgpKSB7XHJcbiAgICAgICAgICAgIHZhciBtZW51Q2xvc2UgPSBuZXcgTm9kZShOb2RlLklOUFVUX0JVVFRPTik7XHJcbiAgICAgICAgICAgIG1lbnVDbG9zZS5zZXRTdHlsZUNsYXNzKENTUy5CdXR0b25NZW51Q2xvc2UpO1xyXG4gICAgICAgICAgICBtZW51Q2xvc2UuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5kaXNhYmxlLmJpbmQodGhpcykpO1xyXG5cclxuICAgICAgICAgICAgbWVudS5hZGRDaGlsZChtZW51Q2xvc2UpO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIGlmICh0aGlzLmhhc01heEhlaWdodCgpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2FkZFNjcm9sbFdyYXAoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghaXNGaXhlZCkge1xyXG4gICAgICAgICAgICBpZiAocG9zaXRpb24pIHtcclxuICAgICAgICAgICAgICAgIGlmIChhbGlnbiA9PSBMYXlvdXRNb2RlLkxFRlQgfHxcclxuICAgICAgICAgICAgICAgICAgICBhbGlnbiA9PSBMYXlvdXRNb2RlLlRPUCB8fFxyXG4gICAgICAgICAgICAgICAgICAgIGFsaWduID09IExheW91dE1vZGUuQk9UVE9NKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcm9vdC5zZXRQb3NpdGlvbkdsb2JhbChwb3NpdGlvblswXSwgcG9zaXRpb25bMV0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcm9vdC5zZXRQb3NpdGlvbkdsb2JhbCh3aW5kb3cuaW5uZXJXaWR0aCAtIHdpZHRoIC0gcG9zaXRpb25bMF0sIHBvc2l0aW9uWzFdKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9wb3NpdGlvbiA9IHJvb3QuZ2V0UG9zaXRpb24oKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHRoaXMuX3Bvc2l0aW9uID0gcm9vdC5nZXRQb3NpdGlvbigpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5fbW91c2VPZmZzZXQgPSBbMCwgMF07XHJcblxyXG4gICAgICAgICAgICByb290LnNldFN0eWxlUHJvcGVydHkoJ3Bvc2l0aW9uJywgJ2Fic29sdXRlJyk7XHJcbiAgICAgICAgICAgIGhlYWQuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25IZWFkRHJhZ1N0YXJ0LmJpbmQodGhpcykpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgaWYgKHBvc2l0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcG9zaXRpb25YID0gcG9zaXRpb25bMF0sXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb25ZID0gcG9zaXRpb25bMV07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHBvc2l0aW9uWSAhPSAwKXJvb3Quc2V0UG9zaXRpb25ZKHBvc2l0aW9uWSk7XHJcbiAgICAgICAgICAgICAgICBpZiAocG9zaXRpb25YICE9IDApaWYgKGFsaWduID09IExheW91dE1vZGUuUklHSFQpcm9vdC5nZXRFbGVtZW50KCkubWFyZ2luUmlnaHQgPSBwb3NpdGlvblg7XHJcbiAgICAgICAgICAgICAgICBlbHNlIHJvb3Quc2V0UG9zaXRpb25YKHBvc2l0aW9uWCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJvb3Quc2V0U3R5bGVQcm9wZXJ0eSgnZmxvYXQnLCBhbGlnbik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgdmFyIGRvY2tBbGlnbm1lbnQgPSBkb2NrLmFsaWduO1xyXG5cclxuICAgICAgICBpZiAoZG9ja0FsaWdubWVudCA9PSBMYXlvdXRNb2RlLkxFRlQgfHxcclxuICAgICAgICAgICAgZG9ja0FsaWdubWVudCA9PSBMYXlvdXRNb2RlLlJJR0hUKSB7XHJcbiAgICAgICAgICAgIGFsaWduID0gZG9ja0FsaWdubWVudDtcclxuICAgICAgICAgICAgdGhpcy5faGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGRvY2tBbGlnbm1lbnQgPT0gTGF5b3V0TW9kZS5UT1AgfHxcclxuICAgICAgICAgICAgZG9ja0FsaWdubWVudCA9PSBMYXlvdXRNb2RlLkJPVFRPTSkge1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qXHJcbiAgICAgICAgIGlmKGRvY2sucmVzaXphYmxlKVxyXG4gICAgICAgICB7XHJcbiAgICAgICAgIHZhciBzaXplSGFuZGxlID0gbmV3IENvbnRyb2xLaXQuTm9kZShDb250cm9sS2l0Lk5vZGVUeXBlLkRJVik7XHJcbiAgICAgICAgIHNpemVIYW5kbGUuc2V0U3R5bGVDbGFzcyhDb250cm9sS2l0LkNTUy5TaXplSGFuZGxlKTtcclxuICAgICAgICAgcm9vdE5vZGUuYWRkQ2hpbGQoc2l6ZUhhbmRsZSk7XHJcbiAgICAgICAgIH1cclxuICAgICAgICAgKi9cclxuXHJcbiAgICAgICAgcm9vdC5zZXRTdHlsZVByb3BlcnR5KCdmbG9hdCcsIGFsaWduKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgcGFyZW50ID0gdGhpcy5fcGFyZW50O1xyXG4gICAgdmFyIGhpc3RvcnlJc0VuYWJsZWQgPSBwYXJlbnQuaGlzdG9yeUlzRW5hYmxlZCgpLFxyXG4gICAgICAgIHN0YXRlc0FyZUVuYWJsZWQgPSBwYXJlbnQuc3RhdGVzQXJlRW5hYmxlZCgpO1xyXG5cclxuICAgIGlmKGhpc3RvcnlJc0VuYWJsZWQgfHwgc3RhdGVzQXJlRW5hYmxlZCl7XHJcbiAgICAgICAgbWVudS5hZGRDaGlsZEF0KG5ldyBOb2RlKCksMCkuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCk7Ly8uc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsJ25vbmUnKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoaGlzdG9yeUlzRW5hYmxlZCkge1xyXG4gICAgICAgIHRoaXMuX21lbnVVbmRvID0gbWVudS5nZXRDaGlsZEF0KDApXHJcbiAgICAgICAgICAgIC5hZGRDaGlsZChuZXcgTm9kZShOb2RlLklOUFVUX0JVVFRPTikpXHJcbiAgICAgICAgICAgICAgICAuc2V0U3R5bGVDbGFzcyhDU1MuQnV0dG9uTWVudVVuZG8pXHJcbiAgICAgICAgICAgICAgICAuc2V0UHJvcGVydHkoJ3ZhbHVlJyxIaXN0b3J5LmdldCgpLmdldE51bVN0YXRlcygpKVxyXG4gICAgICAgICAgICAgICAgLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgICAgICAgICBIaXN0b3J5LmdldCgpLnBvcFN0YXRlKCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICBwYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihNZW51RXZlbnQuVVBEQVRFX01FTlUsdGhpcywgJ29uVXBkYXRlTWVudScpO1xyXG4gICAgfVxyXG4gICAgaWYoc3RhdGVzQXJlRW5hYmxlZCl7XHJcbiAgICAgICAgbWVudS5nZXRDaGlsZEF0KDApXHJcbiAgICAgICAgICAgIC5hZGRDaGlsZChuZXcgTm9kZShOb2RlLklOUFVUX0JVVFRPTikpXHJcbiAgICAgICAgICAgICAgICAuc2V0U3R5bGVDbGFzcyhDU1MuQnV0dG9uTWVudUxvYWQpXHJcbiAgICAgICAgICAgICAgICAuc2V0UHJvcGVydHkoJ3ZhbHVlJywnTG9hZCcpXHJcbiAgICAgICAgICAgICAgICAuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTixmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRyb2xLaXQuX2xvYWRTdGF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgbWVudS5nZXRDaGlsZEF0KDApXHJcbiAgICAgICAgICAgIC5hZGRDaGlsZChuZXcgTm9kZShOb2RlLklOUFVUX0JVVFRPTikpXHJcbiAgICAgICAgICAgICAgICAuc2V0U3R5bGVDbGFzcyhDU1MuQnV0dG9uTWVudVNhdmUpXHJcbiAgICAgICAgICAgICAgICAuc2V0UHJvcGVydHkoJ3ZhbHVlJywnU2F2ZScpXHJcbiAgICAgICAgICAgICAgICAuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTixmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRyb2xLaXQuX3NhdmVTdGF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBpZihoaXN0b3J5SXNFbmFibGVkIHx8IHN0YXRlc0FyZUVuYWJsZWQpe1xyXG4gICAgICAgIGhlYWQuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfT1ZFUixmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICBtZW51LnNldFN0eWxlQ2xhc3MoQ1NTLk1lbnVBY3RpdmUpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGhlYWQuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfT1VULGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgIG1lbnUuc2V0U3R5bGVDbGFzcyhDU1MuTWVudSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBpZiAob3BhY2l0eSAhPSAxLjAgJiYgb3BhY2l0eSAhPSAwLjApIHtcclxuICAgICAgICByb290LnNldFN0eWxlUHJvcGVydHkoJ29wYWNpdHknLCBvcGFjaXR5KTtcclxuICAgIH1cclxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuV0lORE9XX1JFU0laRSx0aGlzLl9vbldpbmRvd1Jlc2l6ZS5iaW5kKHRoaXMpKTtcclxuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcclxufVxyXG5QYW5lbC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUpO1xyXG5QYW5lbC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBQYW5lbDtcclxuXHJcblBhbmVsLnByb3RvdHlwZS5fb25NZW51SGlkZU1vdXNlRG93biA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuX2VuYWJsZWQgPSAhdGhpcy5fZW5hYmxlZDtcclxuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcclxufTtcclxuXHJcblBhbmVsLnByb3RvdHlwZS5vblVwZGF0ZU1lbnUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLl9tZW51VW5kby5zZXRQcm9wZXJ0eSgndmFsdWUnLCBIaXN0b3J5LmdldCgpLmdldE51bVN0YXRlcygpKTtcclxufTtcclxuXHJcblBhbmVsLnByb3RvdHlwZS5fb25NZW51VW5kb1RyaWdnZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBIaXN0b3J5LmdldCgpLnBvcFN0YXRlKCk7XHJcbn07XHJcblxyXG5cclxuUGFuZWwucHJvdG90eXBlLl91cGRhdGVBcHBlYXJhbmNlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHJvb3ROb2RlID0gdGhpcy5fbm9kZSxcclxuICAgICAgICBoZWFkTm9kZSA9IHRoaXMuX2hlYWROb2RlLFxyXG4gICAgICAgIG1lbnVIaWRlID0gdGhpcy5fbWVudUhpZGU7XHJcblxyXG4gICAgaWYgKCF0aGlzLl9lbmFibGVkKSB7XHJcbiAgICAgICAgaGVhZE5vZGUuZ2V0U3R5bGUoKS5ib3JkZXJCb3R0b20gPSAnbm9uZSc7XHJcbiAgICAgICAgcm9vdE5vZGUuc2V0SGVpZ2h0KGhlYWROb2RlLmdldEhlaWdodCgpKTtcclxuICAgICAgICBtZW51SGlkZS5zZXRTdHlsZUNsYXNzKENTUy5CdXR0b25NZW51U2hvdyk7XHJcbiAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgUGFuZWxFdmVudC5QQU5FTF9ISURFLCBudWxsKSk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICByb290Tm9kZS5zZXRIZWlnaHQoaGVhZE5vZGUuZ2V0SGVpZ2h0KCkgKyB0aGlzLl93cmFwTm9kZS5nZXRIZWlnaHQoKSk7XHJcbiAgICAgICAgcm9vdE5vZGUuZGVsZXRlU3R5bGVQcm9wZXJ0eSgnaGVpZ2h0Jyk7XHJcbiAgICAgICAgbWVudUhpZGUuc2V0U3R5bGVDbGFzcyhDU1MuQnV0dG9uTWVudUhpZGUpO1xyXG4gICAgICAgIGhlYWROb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkhlYWQpO1xyXG4gICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIFBhbmVsRXZlbnQuUEFORUxfU0hPVywgbnVsbCkpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuUGFuZWwucHJvdG90eXBlLl9vbkhlYWREcmFnU3RhcnQgPSBmdW5jdGlvbigpe1xyXG4gICAgdmFyIHBhcmVudE5vZGUgPSB0aGlzLl9wYXJlbnQuZ2V0Tm9kZSgpLFxyXG4gICAgICAgIG5vZGUgICAgICAgPSB0aGlzLl9ub2RlO1xyXG5cclxuICAgIHZhciBub2RlUG9zICAgPSBub2RlLmdldFBvc2l0aW9uR2xvYmFsKCksXHJcbiAgICAgICAgbW91c2VQb3MgID0gTW91c2UuZ2V0KCkuZ2V0UG9zaXRpb24oKSxcclxuICAgICAgICBvZmZzZXRQb3MgPSB0aGlzLl9tb3VzZU9mZnNldDtcclxuXHJcbiAgICAgICAgb2Zmc2V0UG9zWzBdID0gbW91c2VQb3NbMF0gLSBub2RlUG9zWzBdO1xyXG4gICAgICAgIG9mZnNldFBvc1sxXSA9IG1vdXNlUG9zWzFdIC0gbm9kZVBvc1sxXTtcclxuXHJcbiAgICB2YXIgZXZlbnRNb3VzZU1vdmUgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsXHJcbiAgICAgICAgZXZlbnRNb3VzZVVwICAgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX1VQO1xyXG5cclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgICB2YXIgb25EcmFnID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBzZWxmLl91cGRhdGVQb3NpdGlvbigpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgb25EcmFnRW5kID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW91c2VNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcclxuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlVXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xyXG4gICAgICAgICAgICBzZWxmLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX01PVkVfRU5ELCBudWxsKSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICBwYXJlbnROb2RlLnJlbW92ZUNoaWxkKG5vZGUpO1xyXG4gICAgcGFyZW50Tm9kZS5hZGRDaGlsZCggICBub2RlKTtcclxuXHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VNb3ZlLCBvbkRyYWcsICAgIGZhbHNlKTtcclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCAgIG9uRHJhZ0VuZCwgZmFsc2UpO1xyXG5cclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsUGFuZWxFdmVudC5QQU5FTF9NT1ZFX0JFR0lOLG51bGwpKTtcclxufTtcclxuXHJcblBhbmVsLnByb3RvdHlwZS5fdXBkYXRlUG9zaXRpb24gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgbW91c2VQb3MgPSBNb3VzZS5nZXQoKS5nZXRQb3NpdGlvbigpLFxyXG4gICAgICAgIG9mZnNldFBvcyA9IHRoaXMuX21vdXNlT2Zmc2V0O1xyXG5cclxuICAgIHZhciBwb3NpdGlvbiA9IHRoaXMuX3Bvc2l0aW9uO1xyXG4gICAgcG9zaXRpb25bMF0gPSBtb3VzZVBvc1swXSAtIG9mZnNldFBvc1swXTtcclxuICAgIHBvc2l0aW9uWzFdID0gbW91c2VQb3NbMV0gLSBvZmZzZXRQb3NbMV07XHJcblxyXG4gICAgdGhpcy5fY29uc3RyYWluSGVpZ2h0KCk7XHJcbiAgICB0aGlzLl9jb25zdHJhaW5Qb3NpdGlvbigpO1xyXG5cclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIFBhbmVsRXZlbnQuUEFORUxfTU9WRSwgbnVsbCkpO1xyXG59O1xyXG5cclxuUGFuZWwucHJvdG90eXBlLl9vbldpbmRvd1Jlc2l6ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGlmICh0aGlzLmlzRG9ja2VkKCkpIHtcclxuICAgICAgICB2YXIgZG9jayA9IHRoaXMuX2RvY2s7XHJcblxyXG4gICAgICAgIGlmIChkb2NrLmFsaWduID09IExheW91dE1vZGUuUklHSFQgfHxcclxuICAgICAgICAgICAgZG9jay5hbGlnbiA9PSBMYXlvdXRNb2RlLkxFRlQpIHtcclxuICAgICAgICAgICAgdmFyIHdpbmRvd0hlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCxcclxuICAgICAgICAgICAgICAgIGxpc3RIZWlnaHQgPSB0aGlzLl9saXN0Tm9kZS5nZXRIZWlnaHQoKSxcclxuICAgICAgICAgICAgICAgIGhlYWRIZWlnaHQgPSB0aGlzLl9oZWFkTm9kZS5nZXRIZWlnaHQoKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuX2hlaWdodCA9IHdpbmRvd0hlaWdodDtcclxuXHJcbiAgICAgICAgICAgIGlmICgod2luZG93SGVpZ2h0IC0gaGVhZEhlaWdodCkgPiBsaXN0SGVpZ2h0KXtcclxuICAgICAgICAgICAgICAgIHRoaXMuX3Njcm9sbEJhci5kaXNhYmxlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZXtcclxuICAgICAgICAgICAgICAgIHRoaXMuX3Njcm9sbEJhci5lbmFibGUoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgUGFuZWxFdmVudC5QQU5FTF9TSVpFX0NIQU5HRSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIGlmICghdGhpcy5pc0ZpeGVkKCkpe1xyXG4gICAgICAgICAgICB0aGlzLl9jb25zdHJhaW5Qb3NpdGlvbigpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHRoaXMuX2NvbnN0cmFpbkhlaWdodCgpO1xyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgRG9jdW1lbnRFdmVudC5XSU5ET1dfUkVTSVpFKSk7XHJcbn07XHJcblxyXG5QYW5lbC5wcm90b3R5cGUuX2NvbnN0cmFpblBvc2l0aW9uID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIG5vZGUgPSB0aGlzLl9ub2RlO1xyXG5cclxuICAgIHZhciBtYXhYID0gd2luZG93LmlubmVyV2lkdGggLSBub2RlLmdldFdpZHRoKCksXHJcbiAgICAgICAgbWF4WSA9IHdpbmRvdy5pbm5lckhlaWdodCAtIG5vZGUuZ2V0SGVpZ2h0KCk7XHJcblxyXG4gICAgdmFyIHBvc2l0aW9uID0gdGhpcy5fcG9zaXRpb247XHJcbiAgICBwb3NpdGlvblswXSA9IE1hdGgubWF4KDAsIE1hdGgubWluKHBvc2l0aW9uWzBdLCBtYXhYKSk7XHJcbiAgICBwb3NpdGlvblsxXSA9IE1hdGgubWF4KDAsIE1hdGgubWluKHBvc2l0aW9uWzFdLCBtYXhZKSk7XHJcblxyXG4gICAgbm9kZS5zZXRQb3NpdGlvbkdsb2JhbChwb3NpdGlvblswXSwgcG9zaXRpb25bMV0pO1xyXG59O1xyXG5cclxuUGFuZWwucHJvdG90eXBlLl9jb25zdHJhaW5IZWlnaHQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBpZiAoIXRoaXMuX3ZDb25zdHJhaW4pcmV0dXJuO1xyXG5cclxuICAgIHZhciBoYXNNYXhIZWlnaHQgPSB0aGlzLmhhc01heEhlaWdodCgpLFxyXG4gICAgICAgIGhhc1Njcm9sbFdyYXAgPSB0aGlzLmhhc1Njcm9sbFdyYXAoKTtcclxuXHJcbiAgICB2YXIgaGVhZCA9IHRoaXMuX2hlYWROb2RlLFxyXG4gICAgICAgIHdyYXAgPSB0aGlzLl93cmFwTm9kZTtcclxuXHJcbiAgICB2YXIgc2Nyb2xsQmFyID0gdGhpcy5fc2Nyb2xsQmFyO1xyXG5cclxuICAgIHZhciBwYW5lbFRvcCA9IHRoaXMuaXNEb2NrZWQoKSA/IDAgOlxyXG4gICAgICAgIHRoaXMuaXNGaXhlZCgpID8gMCA6XHJcbiAgICAgICAgICAgIHRoaXMuX3Bvc2l0aW9uWzFdO1xyXG5cclxuICAgIHZhciBwYW5lbEhlaWdodCA9IGhhc01heEhlaWdodCA/IHRoaXMuZ2V0TWF4SGVpZ2h0KCkgOlxyXG4gICAgICAgIGhhc1Njcm9sbFdyYXAgPyBzY3JvbGxCYXIuZ2V0VGFyZ2V0Tm9kZSgpLmdldEhlaWdodCgpIDpcclxuICAgICAgICAgICAgd3JhcC5nZXRIZWlnaHQoKTtcclxuXHJcbiAgICB2YXIgcGFuZWxCb3R0b20gPSBwYW5lbFRvcCArIHBhbmVsSGVpZ2h0O1xyXG4gICAgdmFyIGhlYWRIZWlnaHQgPSBoZWFkLmdldEhlaWdodCgpO1xyXG5cclxuICAgIHZhciB3aW5kb3dIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQsXHJcbiAgICAgICAgaGVpZ2h0RGlmZiA9IHdpbmRvd0hlaWdodCAtIHBhbmVsQm90dG9tIC0gaGVhZEhlaWdodCxcclxuICAgICAgICBoZWlnaHRTdW07XHJcblxyXG4gICAgaWYgKGhlaWdodERpZmYgPCAwLjApIHtcclxuICAgICAgICBoZWlnaHRTdW0gPSBwYW5lbEhlaWdodCArIGhlaWdodERpZmY7XHJcblxyXG4gICAgICAgIGlmICghaGFzU2Nyb2xsV3JhcCkge1xyXG4gICAgICAgICAgICB0aGlzLl9hZGRTY3JvbGxXcmFwKGhlaWdodFN1bSk7XHJcbiAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIFBhbmVsRXZlbnQuUEFORUxfU0NST0xMX1dSQVBfQURERUQsIG51bGwpKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2Nyb2xsQmFyLnNldFdyYXBIZWlnaHQoaGVpZ2h0U3VtKTtcclxuICAgICAgICB3cmFwLnNldEhlaWdodChoZWlnaHRTdW0pO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgaWYgKCFoYXNNYXhIZWlnaHQgJiYgaGFzU2Nyb2xsV3JhcCkge1xyXG4gICAgICAgICAgICBzY3JvbGxCYXIucmVtb3ZlRnJvbVBhcmVudCgpO1xyXG4gICAgICAgICAgICB3cmFwLmFkZENoaWxkKHRoaXMuX2xpc3ROb2RlKTtcclxuICAgICAgICAgICAgd3JhcC5kZWxldGVTdHlsZVByb3BlcnR5KCdoZWlnaHQnKTtcclxuICAgICAgICAgICAgdGhpcy5fc2Nyb2xsQmFyLnJlbW92ZU1vdXNlTGlzdGVuZXIoKTtcclxuICAgICAgICAgICAgdGhpcy5fc2Nyb2xsQmFyID0gbnVsbDtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIFBhbmVsRXZlbnQuUEFORUxfU0NST0xMX1dSQVBfUkVNT1ZFRCwgbnVsbCkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxuXHJcblBhbmVsLnByb3RvdHlwZS5vbkdyb3VwTGlzdFNpemVDaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBpZiAodGhpcy5oYXNTY3JvbGxXcmFwKCkpe1xyXG4gICAgICAgIHRoaXMuX3VwZGF0ZVNjcm9sbFdyYXAoKTtcclxuICAgIH1cclxuICAgIHRoaXMuX2NvbnN0cmFpbkhlaWdodCgpO1xyXG59O1xyXG5cclxuUGFuZWwucHJvdG90eXBlLl91cGRhdGVTY3JvbGxXcmFwID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHdyYXAgICA9IHRoaXMuX3dyYXBOb2RlLFxyXG4gICAgICAgIHNjcm9sbEJhciAgPSB0aGlzLl9zY3JvbGxCYXIsXHJcbiAgICAgICAgaGVpZ2h0ICAgICA9IHRoaXMuaGFzTWF4SGVpZ2h0KCkgPyB0aGlzLmdldE1heEhlaWdodCgpIDogMTAwLFxyXG4gICAgICAgIGxpc3RIZWlnaHQgPSB0aGlzLl9saXN0Tm9kZS5nZXRIZWlnaHQoKTtcclxuXHJcbiAgICB3cmFwLnNldEhlaWdodChsaXN0SGVpZ2h0IDwgaGVpZ2h0ID8gbGlzdEhlaWdodCA6IGhlaWdodCk7XHJcblxyXG4gICAgc2Nyb2xsQmFyLnVwZGF0ZSgpO1xyXG5cclxuICAgIGlmICghc2Nyb2xsQmFyLmlzVmFsaWQoKSkge1xyXG4gICAgICAgIHNjcm9sbEJhci5kaXNhYmxlKCk7XHJcbiAgICAgICAgd3JhcC5zZXRIZWlnaHQod3JhcC5nZXRDaGlsZEF0KDEpLmdldEhlaWdodCgpKTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIHNjcm9sbEJhci5lbmFibGUoKTtcclxuICAgICAgICB3cmFwLnNldEhlaWdodChoZWlnaHQpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuUGFuZWwucHJvdG90eXBlLl9hZGRTY3JvbGxXcmFwID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHdyYXBOb2RlID0gdGhpcy5fd3JhcE5vZGUsXHJcbiAgICAgICAgbGlzdE5vZGUgPSB0aGlzLl9saXN0Tm9kZSxcclxuICAgICAgICBoZWlnaHQgPSBhcmd1bWVudHMubGVuZ3RoID09IDAgP1xyXG4gICAgICAgICAgICB0aGlzLmdldE1heEhlaWdodCgpIDpcclxuICAgICAgICAgICAgYXJndW1lbnRzWzBdO1xyXG5cclxuICAgIHRoaXMuX3Njcm9sbEJhciA9IG5ldyBTY3JvbGxCYXIod3JhcE5vZGUsIGxpc3ROb2RlLCBoZWlnaHQpO1xyXG4gICAgaWYgKHRoaXMuaXNFbmFibGVkKCkpe1xyXG4gICAgICAgIHdyYXBOb2RlLnNldEhlaWdodChoZWlnaHQpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuUGFuZWwucHJvdG90eXBlLmhhc1Njcm9sbFdyYXAgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fc2Nyb2xsQmFyICE9IG51bGw7XHJcbn07XHJcblxyXG5cclxuUGFuZWwucHJvdG90eXBlLnByZXZlbnRTZWxlY3REcmFnID0gZnVuY3Rpb24gKCkge1xyXG4gICAgaWYgKCF0aGlzLmhhc1Njcm9sbFdyYXAoKSl7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdGhpcy5fd3JhcE5vZGUuZ2V0RWxlbWVudCgpLnNjcm9sbFRvcCA9IDA7XHJcbn07XHJcblxyXG5QYW5lbC5wcm90b3R5cGUuZW5hYmxlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5fbm9kZS5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ2Jsb2NrJyk7XHJcbiAgICB0aGlzLl9lbmFibGVkID0gdHJ1ZTtcclxuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcclxufTtcclxuXHJcblxyXG5QYW5lbC5wcm90b3R5cGUuZGlzYWJsZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuX25vZGUuc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdub25lJyk7XHJcbiAgICB0aGlzLl9lbmFibGVkID0gZmFsc2U7XHJcbiAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XHJcbn07XHJcblxyXG5QYW5lbC5wcm90b3R5cGUuaXNFbmFibGVkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX2VuYWJsZWQ7XHJcbn07XHJcblxyXG5QYW5lbC5wcm90b3R5cGUuaXNEaXNhYmxlZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiAhdGhpcy5fZW5hYmxlZDtcclxufTtcclxuXHJcblBhbmVsLnByb3RvdHlwZS5oYXNNYXhIZWlnaHQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5faGVpZ2h0ICE9IG51bGw7XHJcbn07XHJcblxyXG5QYW5lbC5wcm90b3R5cGUuZ2V0TWF4SGVpZ2h0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX2hlaWdodDtcclxufTtcclxuXHJcblBhbmVsLnByb3RvdHlwZS5pc0RvY2tlZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLl9kb2NrO1xyXG59O1xyXG5cclxuUGFuZWwucHJvdG90eXBlLmlzRml4ZWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fZml4ZWQ7XHJcbn07XHJcblxyXG5QYW5lbC5wcm90b3R5cGUuZ2V0R3JvdXBzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX2dyb3VwcztcclxufTtcclxuXHJcblBhbmVsLnByb3RvdHlwZS5nZXROb2RlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX25vZGU7XHJcbn07XHJcblxyXG5QYW5lbC5wcm90b3R5cGUuZ2V0TGlzdCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLl9saXN0Tm9kZTtcclxufTtcclxuXHJcblBhbmVsLnByb3RvdHlwZS5nZXRXaWR0aCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLl93aWR0aDtcclxufTtcclxuXHJcblBhbmVsLnByb3RvdHlwZS5nZXRQb3NpdGlvbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLl9wb3NpdGlvbjtcclxufTtcclxuXHJcblBhbmVsLnByb3RvdHlwZS5nZXRQYXJlbnQgPSBmdW5jdGlvbigpe1xyXG4gICAgcmV0dXJuIHRoaXMuX3BhcmVudDtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBZGRzIGEgbmV3IEdyb3VwIHRvIHRoZSBQYW5lbC5cclxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gR3JvdXAgb3B0aW9uc1xyXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy5sYWJlbD0nJ10gLSBUaGUgR3JvdXAgbGFiZWwgc3RyaW5nXHJcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW3BhcmFtcy51c2VMYWJlbD10cnVlXSAtIFRyaWdnZXIgd2hldGhlciBhbGwgY29udGFpbmVkIFN1Ykdyb3VwcyBhbmQgQ29tcG9uZW50cyBzaG91bGQgdXNlIGxhYmVsc1xyXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtwYXJhbXMuZW5hYmxlPXRydWVdIC0gRGVmaW5lcyBpbml0aWFsIHN0YXRlIG9wZW4gLyBjbG9zZWRcclxuICogQHBhcmFtIHtOdW1iZXJ9IFtwYXJhbXMuaGVpZ2h0PW51bGxdIC0gRGVmaW5lcyBpZiB0aGUgaGVpZ2h0IG9mIHRoZSBHcm91cCBzaG91bGQgYmUgY29uc3RyYWluZWQgdG8gY2VydGFpbiBoZWlnaHRcclxuICogQHJldHVybnMge1BhbmVsfVxyXG4gKi9cclxuXHJcblBhbmVsLnByb3RvdHlwZS5hZGRHcm91cCA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcclxuICAgIHZhciBncm91cCA9IG5ldyBHcm91cCh0aGlzLCBwYXJhbXMpO1xyXG4gICAgdGhpcy5fZ3JvdXBzLnB1c2goZ3JvdXApO1xyXG4gICAgaWYgKHRoaXMuaXNEb2NrZWQoKSl7XHJcbiAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgUGFuZWxFdmVudC5QQU5FTF9TSVpFX0NIQU5HRSkpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogUmVtb3ZlcyBhIEdyb3VwIGZyb20gdGhlIFBhbmVsLlxyXG4gKiBAcGFyYW0ge09iamVjdH0gW2dyb3VwXSAtIEdyb3VwXHJcbiAqIEByZXR1cm5zIHtQYW5lbH1cclxuICovXHJcblBhbmVsLnByb3RvdHlwZS5yZW1vdmVHcm91cCA9IGZ1bmN0aW9uIChncm91cCkge1xyXG4gICAgdmFyIGluZGV4ID0gdGhpcy5fZ3JvdXBzLmZpbmRJbmRleChmdW5jdGlvbihlbGVtZW50KSB7IHJldHVybiBlbGVtZW50ID09PSBncm91cDsgfSk7XHJcbiAgICBpZiAoaW5kZXggPCAwKSByZXR1cm4gdGhpcztcclxuICAgIFxyXG4gICAgdmFyIGxpc3QgPSB0aGlzLmdldE5vZGUoKS5nZXRMYXN0Q2hpbGQoKS5nZXRGaXJzdENoaWxkKCk7XHJcbiAgICB2YXIgX2dyb3VwID0gdGhpcy5fZ3JvdXBzLnNwbGljZShpbmRleCwgMSlbMF07XHJcbiAgICBsaXN0LnJlbW92ZUNoaWxkKF9ncm91cC5fbm9kZSk7XHJcblxyXG4gICAgaWYgKHRoaXMuaXNEb2NrZWQoKSl7XHJcbiAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgUGFuZWxFdmVudC5QQU5FTF9TSVpFX0NIQU5HRSkpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogQWRkcyBhIG5ldyBTdWJHcm91cCB0byB0aGUgbGFzdCBhZGRlZCBHcm91cC5cclxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gU3ViR3JvdXAgb3B0aW9uc1xyXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy5sYWJlbD0nJ10gLSBUaGUgU3ViR3JvdXAgbGFiZWwgc3RyaW5nXHJcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW3BhcmFtcy51c2VMYWJlbD10cnVlXSAtIFRyaWdnZXIgd2hldGhlciBhbGwgQ29tcG9uZW50cyBzaG91bGQgdXNlIGxhYmVsc1xyXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtwYXJhbXMuZW5hYmxlPXRydWVdIC0gRGVmaW5lcyBpbml0aWFsIHN0YXRlIG9wZW4gLyBjbG9zZWRcclxuICogQHBhcmFtIHtOdW1iZXJ9IFtwYXJhbXMuaGVpZ2h0PW51bGxdIC0gRGVmaW5lcyBpZiB0aGUgaGVpZ2h0IG9mIHRoZSBTdWJHcm91cCBzaG91bGQgYmUgY29uc3RyYWluZWQgdG8gY2VydGFpbiBoZWlnaHRcclxuICogQHJldHVybnMge1BhbmVsfVxyXG4gKi9cclxuXHJcblBhbmVsLnByb3RvdHlwZS5hZGRTdWJHcm91cCA9IGZ1bmN0aW9uKHBhcmFtcyl7XHJcbiAgICB2YXIgZ3JvdXBzID0gdGhpcy5fZ3JvdXBzO1xyXG4gICAgaWYoZ3JvdXBzLmxlbmd0aCA9PSAwKXtcclxuICAgICAgICB0aGlzLmFkZEdyb3VwKCk7XHJcbiAgICB9XHJcbiAgICBncm91cHNbZ3JvdXBzLmxlbmd0aCAtIDFdLmFkZFN1Ykdyb3VwKHBhcmFtcyk7XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcblBhbmVsLnByb3RvdHlwZS5fYWRkQ29tcG9uZW50ID0gZnVuY3Rpb24oKXtcclxuICAgIHZhciBncm91cHMgPSB0aGlzLl9ncm91cHMsXHJcbiAgICAgICAgZ3JvdXA7XHJcbiAgICBpZihncm91cHMubGVuZ3RoID09IDApe1xyXG4gICAgICAgIGdyb3Vwcy5wdXNoKG5ldyBHcm91cCh0aGlzKSk7XHJcbiAgICB9XHJcbiAgICBncm91cCA9IGdyb3Vwc1tncm91cHMubGVuZ3RoLTFdO1xyXG5cclxuICAgIGdyb3VwLmFkZENvbXBvbmVudC5hcHBseShncm91cCxhcmd1bWVudHMpO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogQWRkcyBhIG5ldyBTdHJpbmdJbnB1dCB0byBsYXN0IGFkZGVkIFN1Ykdyb3VwLlxyXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IC0gVGhlIG9iamVjdFxyXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgLSBUaGUgcHJvcGVydHkga2V5XHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBbcGFyYW1zXSAtIFN0cmluZ0lucHV0IG9wdGlvbnNcclxuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9dmFsdWVdIC0gU3RyaW5nSW5wdXQgbGFiZWxcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gW3BhcmFtcy5vbkNoYW5nZV0gLSBDYWxsYmFjayBvbiBjaGFuZ2VcclxuICogQHBhcmFtIHtBcnJheX0gW3BhcmFtcy5wcmVzZXRzXSAtIEEgc2V0IG9mIHByZXNldHNcclxuICogQHJldHVybnMge1BhbmVsfVxyXG4gKi9cclxuXHJcblBhbmVsLnByb3RvdHlwZS5hZGRTdHJpbmdJbnB1dCA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcclxuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoU3RyaW5nSW5wdXQsb2JqZWN0LHZhbHVlLHBhcmFtcyk7XHJcbn07XHJcblxyXG4vKipcclxuICogQWRkcyBhIG5ldyBOdW1iZXJJbnB1dCB0byBsYXN0IGFkZGVkIFN1Ykdyb3VwLlxyXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IC0gVGhlIG9iamVjdC5cclxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIC0gVGhlIHByb3BlcnR5IGtleS5cclxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnMuXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmxhYmVsPXZhbHVlXSAtIE51bWJlcklucHV0IGxhYmVsXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtwYXJhbXMub25DaGFuZ2VdIC0gQ2FsbGJhY2sgb24gY2hhbmdlXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBbcGFyYW1zLnN0ZXBdIC0gQW1vdW50IHN1YmJlZC9hZGRlZCBvbiBhcnJvd0Rvd24vYXJyb3dVcCBwcmVzc1xyXG4gKiBAcGFyYW0ge051bWJlcn0gW3BhcmFtcy5kcF0gLSBEZWNpbWFsIHBsYWNlcyBkaXNwbGF5ZWRcclxuICogQHBhcmFtIHtBcnJheX0gW3BhcmFtcy5wcmVzZXRzXSAtIEEgc2V0IG9mIHByZXNldHNcclxuICogQHJldHVybnMge1BhbmVsfVxyXG4gKi9cclxuXHJcblBhbmVsLnByb3RvdHlwZS5hZGROdW1iZXJJbnB1dCA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcclxuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoTnVtYmVySW5wdXQsb2JqZWN0LHZhbHVlLHBhcmFtcyk7XHJcbn07XHJcblxyXG4vKipcclxuICogQWRkcyBhIG5ldyBSYW5nZSBpbnB1dCB0byBsYXN0IGFkZGVkIFN1Ykdyb3VwLlxyXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IC0gVGhlIG9iamVjdFxyXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgLSBUaGUgcHJvcGVydHkga2V5XHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBbcGFyYW1zXSAtIENvbXBvbmVudCBvcHRpb25zXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmxhYmVsPXZhbHVlXSAtIFJhbmdlIGxhYmVsXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtwYXJhbXMub25DaGFuZ2VdIC0gQ2FsbGJhY2sgb24gY2hhbmdlXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBbcGFyYW1zLnN0ZXBdIC0gQW1vdW50IHN1YmJlZC9hZGRlZCBvbiBhcnJvd0Rvd24vYXJyb3dVcCBwcmVzc1xyXG4gKiBAcGFyYW0ge051bWJlcn0gW3BhcmFtcy5kcF0gLSBEZWNpbWFsIHBsYWNlcyBkaXNwbGF5ZWRcclxuICogQHJldHVybnMge1BhbmVsfVxyXG4gKi9cclxuXHJcblBhbmVsLnByb3RvdHlwZS5hZGRSYW5nZSA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcclxuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoUmFuZ2Usb2JqZWN0LHZhbHVlLHBhcmFtcyk7XHJcbn07XHJcblxyXG4vKipcclxuICogQWRkcyBhIG5ldyBDaGVja2JveCB0byBsYXN0IGFkZGVkIFN1Ykdyb3VwLlxyXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IC0gVGhlIG9iamVjdFxyXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgLSBUaGUgcHJvcGVydHkga2V5XHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBbcGFyYW1zXSAtIENvbXBvbmVudCBvcHRpb25zXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmxhYmVsPXZhbHVlXSAtIENoZWNrYm94IGxhYmVsXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtwYXJhbXMub25DaGFuZ2VdIC0gQ2FsbGJhY2sgb24gY2hhbmdlXHJcbiAqIEByZXR1cm5zIHtQYW5lbH1cclxuICovXHJcblxyXG5QYW5lbC5wcm90b3R5cGUuYWRkQ2hlY2tib3ggPSBmdW5jdGlvbiAob2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KENoZWNrYm94LG9iamVjdCx2YWx1ZSxwYXJhbXMpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFkZHMgYSBuZXcgQ29sb3IgbW9kaWZpZXIgdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cclxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCAtIFRoZSBvYmplY3RcclxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIC0gVGhlIHByb3BlcnR5IGtleVxyXG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9uc1xyXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy5sYWJlbD12YWx1ZV0gLSBDb2xvciBsYWJlbFxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbcGFyYW1zLm9uQ2hhbmdlXSAtIENhbGxiYWNrIG9uIGNoYW5nZVxyXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy5jb2xvck1vZGU9J3JnYiddIC0gVGhlIGNvbG9yTW9kZSB0byBiZSB1c2VkOiAnaGV4JyAjZmYwMGZmLCAncmdiJyBbMjU1LDAsMjU1XSwgJ3JnYmZ2JyBbMSwwLDFdXHJcbiAqIEBwYXJhbSB7QXJyYXl9IFtwYXJhbXMucHJlc2V0c10gLSBBIHNldCBvZiBwcmVzZXQgY29sb3JzIG1hdGNoaW5nIHBhcmFtcy5jb2xvck1vZGVcclxuICogQHJldHVybnMge1BhbmVsfVxyXG4gKi9cclxuXHJcblBhbmVsLnByb3RvdHlwZS5hZGRDb2xvciA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcclxuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoQ29sb3Isb2JqZWN0LHZhbHVlLCBwYXJhbXMpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFkZHMgYSBuZXcgQnV0dG9uIHRvIGxhc3QgYWRkZWQgU3ViR3JvdXAuXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBsYWJlbCAtIFRoZSBvYmplY3RcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gb25QcmVzcyAtIENhbGxiYWNrXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBbcGFyYW1zXSAtIENvbXBvbmVudCBvcHRpb25zXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmxhYmVsPXZhbHVlXSAtIEJ1dHRvbiBsYWJlbFxyXG4gKiBAcmV0dXJucyB7UGFuZWx9XHJcbiAqL1xyXG5cclxuUGFuZWwucHJvdG90eXBlLmFkZEJ1dHRvbiA9IGZ1bmN0aW9uIChsYWJlbCwgb25QcmVzcywgcGFyYW1zKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KEJ1dHRvbixsYWJlbCxvblByZXNzLHBhcmFtcyk7XHJcbn07XHJcblxyXG4vKipcclxuICogQWRkcyBhIG5ldyBTZWxlY3QgdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cclxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCAtIFRoZSBvYmplY3RcclxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIC0gVGhlIHByb3BlcnR5IGtleVxyXG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9uc1xyXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy5sYWJlbD12YWx1ZV0gLSBCdXR0b24gbGFiZWxcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gW3BhcmFtcy5vbkNoYW5nZV0gLSBDYWxsYmFjayBvbiBjaGFuZ2UgLSBmdW5jdGlvbihpbmRleCl7fVxyXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy50YXJnZXRdIC0gVGhlIHByb3BlcnR5IHRvIGJlIHNldCBvbiBzZWxlY3RcclxuICogQHJldHVybnMge1BhbmVsfVxyXG4gKi9cclxuXHJcblBhbmVsLnByb3RvdHlwZS5hZGRTZWxlY3QgPSBmdW5jdGlvbiAob2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KFNlbGVjdCxvYmplY3QsdmFsdWUscGFyYW1zKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBZGRzIGEgbmV3IFNsaWRlciB0byBsYXN0IGFkZGVkIFN1Ykdyb3VwLlxyXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IC0gVGhlIG9iamVjdFxyXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgLSBUaGUgcHJvcGVydHkga2V5XHJcbiAqIEBwYXJhbSB7U3RyaW5nfSByYW5nZSAtIFRoZSBtaW4vbWF4IGFycmF5IGtleSB0byBiZSB1c2VkXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBbcGFyYW1zXSAtIENvbXBvbmVudCBvcHRpb25zXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmxhYmVsPXZhbHVlXSAtIFNsaWRlciBsYWJlbFxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbcGFyYW1zLm9uQ2hhbmdlXSAtIENhbGxiYWNrIG9uIGNoYW5nZVxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbcGFyYW1zLm9uRmluaXNoXSAtIENhbGxiYWNrIG9uIGZpbmlzaFxyXG4gKiBAcGFyYW0ge051bWJlcn0gW3BhcmFtcy5zdGVwXSAtIEFtb3VudCBzdWJiZWQvYWRkZWQgb24gYXJyb3dEb3duL2Fycm93VXAgcHJlc3MgaW5zaWRlIHRoZSBpbnB1dFxyXG4gKiBAcGFyYW0ge051bWJlcn0gW3BhcmFtcy5kcF0gLSBEZWNpbWFsIHBsYWNlcyBkaXNwbGF5ZWRcclxuICogQHJldHVybnMge1BhbmVsfVxyXG4gKi9cclxuXHJcblBhbmVsLnByb3RvdHlwZS5hZGRTbGlkZXIgPSBmdW5jdGlvbiAob2JqZWN0LCB2YWx1ZSwgcmFuZ2UsIHBhcmFtcykge1xyXG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChTbGlkZXIsb2JqZWN0LHZhbHVlLHJhbmdlLHBhcmFtcyk7XHJcbn07XHJcblxyXG4vKipcclxuICogQWRkcyBhIG5ldyBGdW5jdGlvblBsb3R0ZXIgdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cclxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCAtIFRoZSBvYmplY3RcclxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIC0gVGhlIHByb3BlcnR5IGtleSAtIGYoeCksIGYoeCx5KVxyXG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9uc1xyXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy5sYWJlbD12YWx1ZV0gLSBGdW5jdGlvblBsb3R0ZXIgbGFiZWxcclxuICogQHJldHVybnMge1BhbmVsfVxyXG4gKi9cclxuXHJcblBhbmVsLnByb3RvdHlwZS5hZGRGdW5jdGlvblBsb3R0ZXIgPSBmdW5jdGlvbiAob2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KEZ1bmN0aW9uUGxvdHRlcixvYmplY3QsdmFsdWUscGFyYW1zKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBZGRzIGEgbmV3IFhZLVBhZCB0byBsYXN0IGFkZGVkIFN1Ykdyb3VwLlxyXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IC0gVGhlIG9iamVjdFxyXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgLSBUaGUgcHJvcGVydHkga2V5XHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBbcGFyYW1zXSAtIENvbXBvbmVudCBvcHRpb25zXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmxhYmVsPXZhbHVlXSAtIFBhZCBsYWJlbFxyXG4gKiBAcmV0dXJucyB7UGFuZWx9XHJcbiAqL1xyXG5cclxuUGFuZWwucHJvdG90eXBlLmFkZFBhZCA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcclxuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoUGFkLG9iamVjdCx2YWx1ZSxwYXJhbXMpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFkZHMgYSBuZXcgVmFsdWVQbG90dGVyIHRvIGxhc3QgYWRkZWQgU3ViR3JvdXAuXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBUaGUgb2JqZWN0XHJcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSAtIFRoZSBwcm9wZXJ0eSBrZXlcclxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnNcclxuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9dmFsdWVdIC0gUGxvdHRlciBsYWJlbFxyXG4gKiBAcGFyYW0ge051bWJlcn0gW3BhcmFtcy5oZWlnaHRdIC0gUGxvdHRlciBoZWlnaHRcclxuICogQHBhcmFtIHtOdW1iZXJ9IFtwYXJhbXMucmVzb2x1dGlvbl0gLSBHcmFwaCByZXNvbHV0aW9uXHJcbiAqIEByZXR1cm5zIHtQYW5lbH1cclxuICovXHJcblxyXG5QYW5lbC5wcm90b3R5cGUuYWRkVmFsdWVQbG90dGVyID0gZnVuY3Rpb24gKG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xyXG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChWYWx1ZVBsb3R0ZXIsb2JqZWN0LHZhbHVlLHBhcmFtcyk7XHJcbn07XHJcblxyXG4vKipcclxuICogQWRkcyBhIG5ldyBOdW1iZXJPdXRwdXQgdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cclxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCAtIFRoZSBvYmplY3RcclxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIC0gVGhlIHByb3BlcnR5IGtleVxyXG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9uc1xyXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy5sYWJlbD12YWx1ZV0gLSBPdXRwdXQgbGFiZWxcclxuICogQHBhcmFtIHtOdW1iZXJ9IFtwYXJhbXMuZHBdIC0gRGVjaW1hbCBwbGFjZXMgZGlzcGxheWVkXHJcbiAqIEByZXR1cm5zIHtQYW5lbH1cclxuICovXHJcblxyXG5QYW5lbC5wcm90b3R5cGUuYWRkTnVtYmVyT3V0cHV0ID0gZnVuY3Rpb24gKG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xyXG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChOdW1iZXJPdXRwdXQsb2JqZWN0LHZhbHVlLHBhcmFtcyk7XHJcbn07XHJcblxyXG4vKipcclxuICogQWRkcyBhIG5ldyBTdHJpbmdPdXRwdXQgdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cclxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCAtIFRoZSBvYmplY3RcclxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIC0gVGhlIHByb3BlcnR5IGtleVxyXG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9uc1xyXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy5sYWJlbD12YWx1ZV0gLSBPdXRwdXQgbGFiZWxcclxuICogQHJldHVybnMge1BhbmVsfVxyXG4gKi9cclxuXHJcblBhbmVsLnByb3RvdHlwZS5hZGRTdHJpbmdPdXRwdXQgPSBmdW5jdGlvbiAob2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KFN0cmluZ091dHB1dCxvYmplY3QsdmFsdWUscGFyYW1zKTtcclxufTtcclxuXHJcblBhbmVsLnByb3RvdHlwZS5hZGRDYW52YXMgPSBmdW5jdGlvbiAocGFyYW1zKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KENhbnZhc18scGFyYW1zKTtcclxufTtcclxuXHJcblBhbmVsLnByb3RvdHlwZS5hZGRTVkcgPSBmdW5jdGlvbiAocGFyYW1zKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KFNWR18scGFyYW1zKTtcclxufTtcclxuXHJcblBhbmVsLnByb3RvdHlwZS5zZXREYXRhID0gZnVuY3Rpb24oZGF0YSl7XHJcbiAgICB2YXIgZ3JvdXBzID0gdGhpcy5fZ3JvdXBzLFxyXG4gICAgICAgIGkgPSAtMSwgbCA9IGdyb3Vwcy5sZW5ndGg7XHJcbiAgICB3aGlsZSgrK2kgPCBsKXtcclxuICAgICAgICBncm91cHNbaV0uc2V0RGF0YShkYXRhW2ldKTtcclxuICAgIH1cclxufTtcclxuXHJcblBhbmVsLnByb3RvdHlwZS5nZXREYXRhID0gZnVuY3Rpb24oKXtcclxuICAgIHZhciBncm91cHMgPSB0aGlzLl9ncm91cHMsXHJcbiAgICAgICAgaSA9IC0xLCBsID0gZ3JvdXBzLmxlbmd0aDtcclxuICAgIHZhciBkYXRhID0gW107XHJcbiAgICB3aGlsZSgrK2kgIDwgbCl7XHJcbiAgICAgICAgZGF0YS5wdXNoKGdyb3Vwc1tpXS5nZXREYXRhKCkpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGRhdGE7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFBhbmVsOyIsInZhciBQYW5lbEV2ZW50ID0ge1xyXG5cdFBBTkVMX01PVkVfQkVHSU4gICAgICAgICAgOiAncGFuZWxNb3ZlQmVnaW4nLFxyXG5cdFBBTkVMX01PVkUgICAgICAgICAgICAgICAgOiAncGFuZWxNb3ZlJyxcclxuXHRQQU5FTF9NT1ZFX0VORCAgICAgICAgICAgIDogJ3BhbmVsTW92ZUVuZCcsXHJcblxyXG5cdFBBTkVMX1NIT1cgICAgICAgICAgICAgICAgOiAncGFuZWxTaG93JyxcclxuXHRQQU5FTF9ISURFICAgICAgICAgICAgICAgIDogJ3BhbmVsSGlkZScsXHJcblxyXG5cdFBBTkVMX1NDUk9MTF9XUkFQX0FEREVEICAgOiAncGFuZWxTY3JvbGxXcmFwQWRkZWQnLFxyXG5cdFBBTkVMX1NDUk9MTF9XUkFQX1JFTU9WRUQgOiAncGFuZWxTY3JvbGxXcmFwUmVtb3ZlZCcsXHJcblxyXG5cdFBBTkVMX1NJWkVfQ0hBTkdFICAgICAgICA6ICdwYW5lbFNpemVDaGFuZ2UnXHJcbn07XHJcbm1vZHVsZS5leHBvcnRzID0gUGFuZWxFdmVudDsiLCJ2YXIgQWJzdHJhY3RHcm91cCA9IHJlcXVpcmUoJy4vQWJzdHJhY3RHcm91cCcpO1xyXG52YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xyXG52YXIgQ1NTICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XHJcblxyXG52YXIgRXZlbnRfICAgICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXHJcbiAgICBEb2N1bWVudEV2ZW50ICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxyXG4gICAgUGFuZWxFdmVudCAgICAgPSByZXF1aXJlKCcuL1BhbmVsRXZlbnQnKSxcclxuICAgIEdyb3VwRXZlbnQgICAgID0gcmVxdWlyZSgnLi9Hcm91cEV2ZW50JyksXHJcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKTtcclxuXHJcbmZ1bmN0aW9uIFN1Ykdyb3VwKHBhcmVudCxwYXJhbXMpe1xyXG4gICAgcGFyYW1zICAgICAgICAgICAgPSBwYXJhbXMgICAgICAgICAgfHwge307XHJcbiAgICBwYXJhbXMubGFiZWwgICAgICA9IHBhcmFtcy5sYWJlbCAgICB8fCBudWxsO1xyXG4gICAgcGFyYW1zLnVzZUxhYmVscyAgPSBwYXJhbXMudXNlTGFiZWxzICA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IHBhcmFtcy51c2VMYWJlbHM7XHJcbiAgICBwYXJhbXMuZW5hYmxlICAgICA9IHBhcmFtcy5lbmFibGUgICAgID09PSB1bmRlZmluZWQgPyB0cnVlIDogcGFyYW1zLmVuYWJsZTtcclxuXHJcbiAgICBBYnN0cmFjdEdyb3VwLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcclxuXHJcbiAgICB2YXIgcm9vdE5vZGUgPSB0aGlzLl9ub2RlLFxyXG4gICAgICAgIHdyYXBOb2RlID0gdGhpcy5fd3JhcE5vZGUsXHJcbiAgICAgICAgbGlzdE5vZGUgPSB0aGlzLl9saXN0Tm9kZTtcclxuXHJcbiAgICAgICAgcm9vdE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuU3ViR3JvdXApO1xyXG4gICAgICAgIHdyYXBOb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApO1xyXG5cclxuICAgICAgICB3cmFwTm9kZS5hZGRDaGlsZChsaXN0Tm9kZSk7XHJcbiAgICAgICAgcm9vdE5vZGUuYWRkQ2hpbGQod3JhcE5vZGUpO1xyXG5cclxuICAgIHRoaXMuX3VzZUxhYmVscyAgPSBwYXJhbXMudXNlTGFiZWxzO1xyXG5cclxuICAgIHZhciBsYWJlbCA9IHBhcmFtcy5sYWJlbDtcclxuXHJcbiAgICBpZiAobGFiZWwgJiYgbGFiZWwubGVuZ3RoICE9IDAgJiYgbGFiZWwgIT0gJ25vbmUnKSB7XHJcbiAgICAgICAgdmFyIGhlYWROb2RlID0gdGhpcy5faGVhZE5vZGUgPSBuZXcgTm9kZSgpLFxyXG4gICAgICAgICAgICBsYWJsV3JhcCA9IG5ldyBOb2RlKCksXHJcbiAgICAgICAgICAgIGxhYmxOb2RlID0gbmV3IE5vZGUoTm9kZS5TUEFOKTtcclxuXHJcbiAgICAgICAgaGVhZE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuSGVhZCk7XHJcbiAgICAgICAgbGFibFdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCk7XHJcbiAgICAgICAgbGFibE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpO1xyXG5cclxuICAgICAgICBsYWJsTm9kZS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywgbGFiZWwpO1xyXG5cclxuICAgICAgICBsYWJsV3JhcC5hZGRDaGlsZChsYWJsTm9kZSk7XHJcbiAgICAgICAgaGVhZE5vZGUuYWRkQ2hpbGQobGFibFdyYXApO1xyXG5cclxuXHJcbiAgICAgICAgdmFyIGluZGlOb2RlID0gdGhpcy5faW5kaU5vZGUgPSBuZXcgTm9kZSgpO1xyXG4gICAgICAgIGluZGlOb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkFycm93QlN1Yk1heCk7XHJcbiAgICAgICAgaGVhZE5vZGUuYWRkQ2hpbGRBdChpbmRpTm9kZSwgMCk7XHJcblxyXG4gICAgICAgIHJvb3ROb2RlLmFkZENoaWxkQXQoaGVhZE5vZGUsIDApO1xyXG5cclxuICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5TVUJHUk9VUF9UUklHR0VSLCB0aGlzLl9wYXJlbnQsICdvblN1Ykdyb3VwVHJpZ2dlcicpO1xyXG4gICAgICAgIGhlYWROb2RlLmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9ET1dOLCB0aGlzLl9vbkhlYWRNb3VzZURvd24uYmluZCh0aGlzKSk7XHJcblxyXG4gICAgICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgaWYodGhpcy5oYXNNYXhIZWlnaHQoKSl7XHJcbiAgICAgICAgdGhpcy5hZGRTY3JvbGxXcmFwKCk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5TVUJHUk9VUF9FTkFCTEUsICB0aGlzLCAnb25FbmFibGUnKTtcclxuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuU1VCR1JPVVBfRElTQUJMRSwgdGhpcywgJ29uRGlzYWJsZScpO1xyXG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoUGFuZWxFdmVudC5QQU5FTF9NT1ZFX0VORCwgICB0aGlzLCAnb25QYW5lbE1vdmVFbmQnKTtcclxuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UsdGhpcywgJ29uR3JvdXBTaXplQ2hhbmdlJyk7XHJcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihQYW5lbEV2ZW50LlBBTkVMX1NJWkVfQ0hBTkdFLHRoaXMsICdvblBhbmVsU2l6ZUNoYW5nZScpO1xyXG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5XSU5ET1dfUkVTSVpFLCAgICB0aGlzLCAnb25XaW5kb3dSZXNpemUnKTtcclxuXHJcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5HUk9VUF9TSVpFX1VQREFURSx0aGlzLl9wYXJlbnQsJ29uR3JvdXBTaXplVXBkYXRlJyk7XHJcbn1cclxuU3ViR3JvdXAucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShBYnN0cmFjdEdyb3VwLnByb3RvdHlwZSk7XHJcblN1Ykdyb3VwLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFN1Ykdyb3VwO1xyXG5cclxuLy9GSVhNRVxyXG5TdWJHcm91cC5wcm90b3R5cGUuX29uSGVhZE1vdXNlRG93biA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuX2VuYWJsZWQgPSAhdGhpcy5fZW5hYmxlZDtcclxuICAgIHRoaXMuX29uVHJpZ2dlcigpO1xyXG5cclxuICAgIHZhciBldmVudCA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVAsXHJcbiAgICAgICAgc2VsZiAgPSB0aGlzO1xyXG4gICAgdmFyIG9uRG9jdW1lbnRNb3VzZVVwID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHNlbGYuX29uVHJpZ2dlcigpO1xyXG4gICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnQsIG9uRG9jdW1lbnRNb3VzZVVwKTtcclxuICAgIH07XHJcblxyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudCxvbkRvY3VtZW50TW91c2VVcCk7XHJcbn07XHJcblxyXG5TdWJHcm91cC5wcm90b3R5cGUuX29uVHJpZ2dlciA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcyxHcm91cEV2ZW50LlNVQkdST1VQX1RSSUdHRVIsbnVsbCkpO1xyXG59O1xyXG5cclxuXHJcblN1Ykdyb3VwLnByb3RvdHlwZS5fdXBkYXRlQXBwZWFyYW5jZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGlmICh0aGlzLmlzRGlzYWJsZWQoKSkge1xyXG4gICAgICAgIHRoaXMuX3dyYXBOb2RlLnNldEhlaWdodCgwKTtcclxuICAgICAgICBpZiAodGhpcy5oYXNMYWJlbCgpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2hlYWROb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkhlYWRJbmFjdGl2ZSk7XHJcbiAgICAgICAgICAgIHRoaXMuX2luZGlOb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkFycm93QlN1Yk1pbik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgaWYgKHRoaXMuaGFzTWF4SGVpZ2h0KCkpIHtcclxuICAgICAgICAgICAgdGhpcy5fd3JhcE5vZGUuc2V0SGVpZ2h0KHRoaXMuZ2V0TWF4SGVpZ2h0KCkpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuX3dyYXBOb2RlLmRlbGV0ZVN0eWxlUHJvcGVydHkoJ2hlaWdodCcpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodGhpcy5oYXNMYWJlbCgpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2hlYWROb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkhlYWQpO1xyXG4gICAgICAgICAgICB0aGlzLl9pbmRpTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5BcnJvd0JTdWJNYXgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxuXHJcblN1Ykdyb3VwLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBpZiAodGhpcy5oYXNNYXhIZWlnaHQoKSl7XHJcbiAgICAgICAgdGhpcy5fc2Nyb2xsQmFyLnVwZGF0ZSgpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuU3ViR3JvdXAucHJvdG90eXBlLm9uQ29tcG9uZW50U2VsZWN0RHJhZyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMucHJldmVudFNlbGVjdERyYWcoKTtcclxufTtcclxuXHJcblN1Ykdyb3VwLnByb3RvdHlwZS5vbkVuYWJsZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGlmICh0aGlzLmlzRGlzYWJsZWQoKSl7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuRU5BQkxFLCBudWxsKSk7XHJcbn07XHJcblN1Ykdyb3VwLnByb3RvdHlwZS5vbkRpc2FibGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBpZiAodGhpcy5pc0Rpc2FibGVkKCkpe1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LkRJU0FCTEUsIG51bGwpKTtcclxufTtcclxuXHJcbi8vYnViYmxlXHJcblN1Ykdyb3VwLnByb3RvdHlwZS5vbkdyb3VwU2l6ZUNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UsIG51bGwpKTtcclxufTtcclxuU3ViR3JvdXAucHJvdG90eXBlLm9uR3JvdXBTaXplVXBkYXRlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgR3JvdXBFdmVudC5HUk9VUF9TSVpFX1VQREFURSwgbnVsbCkpO1xyXG59O1xyXG5TdWJHcm91cC5wcm90b3R5cGUub25QYW5lbE1vdmVFbmQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX01PVkVfRU5ELCBudWxsKSk7XHJcbn07XHJcblN1Ykdyb3VwLnByb3RvdHlwZS5vblBhbmVsU2l6ZUNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcclxufTtcclxuU3ViR3JvdXAucHJvdG90eXBlLm9uV2luZG93UmVzaXplID0gZnVuY3Rpb24gKGUpIHtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChlKTtcclxufTtcclxuXHJcblN1Ykdyb3VwLnByb3RvdHlwZS5oYXNMYWJlbCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLl9oZWFkTm9kZSAhPSBudWxsO1xyXG59O1xyXG5TdWJHcm91cC5wcm90b3R5cGUuYWRkQ29tcG9uZW50Tm9kZSA9IGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICB0aGlzLl9saXN0Tm9kZS5hZGRDaGlsZChub2RlKTtcclxufTtcclxuU3ViR3JvdXAucHJvdG90eXBlLnVzZXNMYWJlbHMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fdXNlTGFiZWxzO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTdWJHcm91cDsiXX0=
