!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var o;"undefined"!=typeof window?o=window:"undefined"!=typeof global?o=global:"undefined"!=typeof self&&(o=self),o.ControlKit=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var Node    = _dereq_('./core/document/Node'),
    Panel   = _dereq_('./group/Panel'),
    Options = _dereq_('./component/Options'),
    Picker  = _dereq_('./component/Picker');

var CSS = _dereq_('./core/document/CSS');

var EventDispatcher = _dereq_('./core/event/EventDispatcher'),
    Event_          = _dereq_('./core/event/Event'),
    DocumentEvent   = _dereq_('./core/document/DocumentEvent'),
    NodeEvent       = _dereq_('./core/document/NodeEvent'),
    ComponentEvent  = _dereq_('./core/ComponentEvent'),
    HistoryEvent    = _dereq_('./core/HistoryEvent'),
    MenuEvent       = _dereq_('./group/MenuEvent');

var History = _dereq_('./core/History'),
    State   = _dereq_('./core/State');

var Mouse   = _dereq_('./core/document/Mouse');

var ValuePlotter = _dereq_('./component/ValuePlotter');
var StringOutput = _dereq_('./component/StringOutput'),
    NumberOutput = _dereq_('./component/NumberOutput');

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
        var css = !options.style ? _dereq_('./core/document/Style').string : options.styleString;
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
},{"./component/NumberOutput":14,"./component/Options":15,"./component/Picker":18,"./component/StringOutput":27,"./component/ValuePlotter":28,"./core/ComponentEvent":30,"./core/History":32,"./core/HistoryEvent":33,"./core/State":37,"./core/document/CSS":41,"./core/document/DocumentEvent":42,"./core/document/Mouse":43,"./core/document/Node":44,"./core/document/NodeEvent":45,"./core/document/Style":46,"./core/event/Event":47,"./core/event/EventDispatcher":48,"./group/MenuEvent":54,"./group/Panel":55}],2:[function(_dereq_,module,exports){
var Event_         = _dereq_('../core/event/Event'),
    NodeEvent      = _dereq_('../core/document/NodeEvent'),
    ComponentEvent = _dereq_('../core/ComponentEvent');

var Node      = _dereq_('../core/document/Node'),
    Component = _dereq_('../core/Component');

var CSS = _dereq_('../core/document/CSS');

var DEFAULT_LABEL = '';

function Button(parent,label,onPress,params) {
    onPress      = onPress || function(){};
    params       = params       || {};
    params.label = params.label || DEFAULT_LABEL;

    Component.apply(this,[parent,params.label]);

    var node = new Node(Node.INPUT_BUTTON);

    node.setStyleClass(CSS.Button);
    node.setProperty('value',label);

    var self = this;
    node.addEventListener(NodeEvent.ON_CLICK,
                           function() {
                               onPress();
                               self.dispatchEvent(new Event_(self,ComponentEvent.VALUE_UPDATED));
                           });

    this._wrapNode.addChild(node);
}
Button.prototype = Object.create(Component.prototype);
Button.prototype.constructor = Button;

module.exports = Button;

},{"../core/Component":29,"../core/ComponentEvent":30,"../core/document/CSS":41,"../core/document/Node":44,"../core/document/NodeEvent":45,"../core/event/Event":47}],3:[function(_dereq_,module,exports){
var EventDispatcher         = _dereq_('../core/event/EventDispatcher');
var ObjectComponentNotifier = _dereq_('../core/ObjectComponentNotifier');

var Event_      = _dereq_('../core/event/Event'),
    OptionEvent = _dereq_('../core/OptionEvent'),
    NodeEvent   = _dereq_('../core/document/NodeEvent');

var Node = _dereq_('../core/document/Node');
var CSS = _dereq_('../core/document/CSS');

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

},{"../core/ObjectComponentNotifier":35,"../core/OptionEvent":36,"../core/document/CSS":41,"../core/document/Node":44,"../core/document/NodeEvent":45,"../core/event/Event":47,"../core/event/EventDispatcher":48}],4:[function(_dereq_,module,exports){
var Component = _dereq_('../core/Component');
var CSS       = _dereq_('../core/document/CSS'),
    Metric    = _dereq_('./Metric');

var Event_     = _dereq_('../core/event/Event'),
    GroupEvent = _dereq_('../group/GroupEvent');

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

},{"../core/Component":29,"../core/document/CSS":41,"../core/event/Event":47,"../group/GroupEvent":53,"./Metric":11}],5:[function(_dereq_,module,exports){
var ObjectComponent = _dereq_('../core/ObjectComponent'),
    Node            = _dereq_('../core/document/Node');

var Event_         = _dereq_('../core/event/Event'),
    NodeEvent      = _dereq_('../core/document/NodeEvent'),
    ComponentEvent = _dereq_('../core/ComponentEvent');

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
},{"../core/ComponentEvent":30,"../core/ObjectComponent":34,"../core/document/Node":44,"../core/document/NodeEvent":45,"../core/event/Event":47}],6:[function(_dereq_,module,exports){
var ObjectComponent = _dereq_('./../core/ObjectComponent');

var Node      = _dereq_('../core/document/Node');
var ColorMode = _dereq_('../core/color/ColorMode');
var Picker    = _dereq_('./Picker');
var ColorUtil = _dereq_('../core/color/ColorUtil');
var Options   = _dereq_('./Options');
var ButtonPreset = _dereq_('./ButtonPreset');
var Metric       = _dereq_('./Metric'),
	CSS          = _dereq_('../core/document/CSS');

var Event_         = _dereq_('../core/event/Event'),
	NodeEvent      = _dereq_('../core/document/NodeEvent'),
	ComponentEvent = _dereq_('../core/ComponentEvent');

var ColorFormatError = _dereq_('../core/color/ColorFormatError');

var DEFAULT_COLOR_MODE = ColorMode.HEX,
	DEFAULT_PRESETS    = null;

var MSG_COLOR_FORMAT_HEX                  = 'Color format should be hex. Set colorMode to rgb, rgbfv or hsv.',
	MSG_COLOR_FORMAT_RGB_RGBFV_HSV        = 'Color format should be rgb, rgbfv or hsv. Set colorMode to hex.',
	MSG_COLOR_PRESET_FORMAT_HEX           = 'Preset color format should be hex.',
	MSG_COLOR_PRESET_FORMAT_RGB_RGBFV_HSV = 'Preset color format should be rgb, rgbfv or hsv.';

function Color(parent, object, value, params) {
	ObjectComponent.apply(this, arguments);

	params = params || {};
	params.presets = params.presets || DEFAULT_PRESETS;
	params.colorMode = params.colorMode || DEFAULT_COLOR_MODE;

	this._presetsKey = params.presets;

	var color = this._color = new Node();
	value = this._value = this._obj[this._key];

	var colorMode = this._colorMode = params.colorMode;

	this._validateColorFormat(value, MSG_COLOR_FORMAT_HEX, MSG_COLOR_FORMAT_RGB_RGBFV_HSV);

	var wrap = this._wrapNode;

	if (!this._presetsKey) {
		color.setStyleClass(CSS.Color);
		wrap.addChild(color);
	}
	else {
		color.setStyleClass(CSS.Color);

		var wrap_ = new Node();
		wrap_.setStyleClass(CSS.WrapColorWPreset);

		wrap.addChild(wrap_);
		wrap_.addChild(color);

		var presets = this._obj[this._presetsKey];

		var i = -1;
		while (++i < presets.length) {
			this._validateColorFormat(presets[i], MSG_COLOR_PRESET_FORMAT_HEX,
				MSG_COLOR_PRESET_FORMAT_RGB_RGBFV_HSV);
		}

		var options = Options.get(),
			presetBtn = new ButtonPreset(wrap);

		var onPresetDeactivate = function () {
			options.clear();
			presetBtn.deactivate();
		};

		var self = this;
		var onPresetActivate = function () {
			options.build(presets,
				self._value,
				color,
				function () {
					self.pushHistoryState();
					self._value = presets[options.getSelectedIndex()];
					self.applyValue();
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

Color.prototype._onColorTrigger = function () {
	var colorMode = this._colorMode,
		colorModeHEX = ColorMode.HEX,
		colorModeRGB = ColorMode.RGB,
		colorModeRGBfv = ColorMode.RGBfv,
		colorModeHSV = ColorMode.HSV;

	var value = this._value,
		temp;

	var onPickerPick = function () {
		this.pushHistoryState();

		switch (colorMode) {
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

	switch (colorMode) {
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

Color.prototype.applyValue = function () {
	this._obj[this._key] = this._value;
	this._updateColor();
	this.dispatchEvent(new Event_(this, ComponentEvent.VALUE_UPDATED, null));
};

Color.prototype.onValueUpdate = function (e) {
	if (e.data.origin == this)return;
	this._value = this._obj[this._key];
	this._updateColor();
};

Color.prototype._updateColor = function () {
	var color = this._value,
		colorNode = this._color,
		nodeColor;

	colorNode.setProperty('innerHTML', color);

	switch (this._colorMode) {
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

Color.prototype._validateColorFormat = function (value, msgHex, msgArr) {
	var colorMode = this._colorMode;

	if (colorMode == ColorMode.HEX && Object.prototype.toString.call(value) === '[object Array]' ||
		colorMode == ColorMode.HEX && Object.prototype.toString.call(value) === '[object Float32Array]') {
		throw new ColorFormatError(msgHex);
	}
	if ((colorMode == ColorMode.RGB ||
		colorMode == ColorMode.RGBfv ||
		colorMode == ColorMode.HSV) &&
		Object.prototype.toString.call(value) !== '[object Array]' ||
		colorMode == ColorMode.HSV &&
		Object.prototype.toString.call(value) !== '[object Float32Array]') {
		throw new ColorFormatError(msgArr);
	}
};

module.exports = Color;
},{"../core/ComponentEvent":30,"../core/color/ColorFormatError":38,"../core/color/ColorMode":39,"../core/color/ColorUtil":40,"../core/document/CSS":41,"../core/document/Node":44,"../core/document/NodeEvent":45,"../core/event/Event":47,"./../core/ObjectComponent":34,"./ButtonPreset":3,"./Metric":11,"./Options":15,"./Picker":18}],7:[function(_dereq_,module,exports){
var FunctionPlotType = {
    IMPLICIT: 'implicit',
    NON_IMPLICIT: 'nonImplicit'
};

module.exports = FunctionPlotType;
},{}],8:[function(_dereq_,module,exports){
var Plotter = _dereq_('./Plotter');

var Node = _dereq_('../core/document/Node');
var CSS = _dereq_('../core/document/CSS');
var FunctionPlotType = _dereq_('./FunctionPlotType');


var Mouse = _dereq_('../core/document/Mouse');
var Metric = _dereq_('./Metric');

var DocumentEvent  = _dereq_('../core/document/DocumentEvent'),
    ComponentEvent = _dereq_('../core/ComponentEvent'),
    NodeEvent      = _dereq_('../core/document/NodeEvent');

var FunctionPlotterObjectError       = _dereq_('./FunctionPlotterObjectError'),
    FunctionPlotterFunctionArgsError = _dereq_('./FunctionPlotterFunctionArgsError');

var ObjectComponentNotifier = _dereq_('../core/ObjectComponentNotifier');

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
    var element = this._svg;

    var svgPos = this._svgPos;
    svgPos[0] = 0;
    svgPos[1] = 0;

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
},{"../core/ComponentEvent":30,"../core/ObjectComponentNotifier":35,"../core/document/CSS":41,"../core/document/DocumentEvent":42,"../core/document/Mouse":43,"../core/document/Node":44,"../core/document/NodeEvent":45,"./FunctionPlotType":7,"./FunctionPlotterFunctionArgsError":9,"./FunctionPlotterObjectError":10,"./Metric":11,"./Plotter":19}],9:[function(_dereq_,module,exports){
function FunctionPlotterFunctionArgsError(){
	Error.apply(this);
	Error.captureStackTrace(this,FunctionPlotterFunctionArgsError);
	this.name = 'FunctionPlotterFunctionArgsError';
	this.message = 'Function should be of form f(x) or f(x,y).';
}
FunctionPlotterFunctionArgsError.prototype = Object.create(Error.prototype);
FunctionPlotterFunctionArgsError.prototype.constructor = FunctionPlotterFunctionArgsError;

module.exports = FunctionPlotterFunctionArgsError;
},{}],10:[function(_dereq_,module,exports){
function FunctionPlotterObjectError(object,key){
	Error.apply(this);
	Error.captureStackTrace(this,FunctionPlotterObjectError);
	this.name = 'ComponentObjectError';
	this.message = 'Object ' + object.constructor.name + ' ' + key + 'should be of type Function.';
}
FunctionPlotterObjectError.prototype = Object.create(Error.prototype);
FunctionPlotterObjectError.prototype.constructor = FunctionPlotterObjectError;

module.exports = FunctionPlotterObjectError;
},{}],11:[function(_dereq_,module,exports){
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
},{}],12:[function(_dereq_,module,exports){
var ObjectComponent = _dereq_('../core/ObjectComponent');
var NumberInput_Internal = _dereq_('./NumberInput_Internal');

var Node = _dereq_('../core/document/Node');

var Options = _dereq_('./Options');
var ButtonPreset = _dereq_('./ButtonPreset');
var CSS = _dereq_('../core/document/CSS'),
    Metric = _dereq_('./Metric');

var Event_ = _dereq_('../core/event/Event'),
    DocumentEvent = _dereq_('../core/document/DocumentEvent'),
    NodeEvent = _dereq_('../core/document/NodeEvent'),
    ComponentEvent = _dereq_('../core/ComponentEvent');

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
},{"../core/ComponentEvent":30,"../core/ObjectComponent":34,"../core/document/CSS":41,"../core/document/DocumentEvent":42,"../core/document/Node":44,"../core/document/NodeEvent":45,"../core/event/Event":47,"./ButtonPreset":3,"./Metric":11,"./NumberInput_Internal":13,"./Options":15}],13:[function(_dereq_,module,exports){
var EventDispatcher = _dereq_('../core/event/EventDispatcher'),
    NodeEvent = _dereq_('../core/document/NodeEvent');
var Node      = _dereq_('../core/document/Node');

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

},{"../core/document/Node":44,"../core/document/NodeEvent":45,"../core/event/EventDispatcher":48}],14:[function(_dereq_,module,exports){
var Output = _dereq_('./Output');

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
},{"./Output":16}],15:[function(_dereq_,module,exports){
var Node = _dereq_('../core/document/Node');
var DocumentEvent = _dereq_('../core/document/DocumentEvent'),
    NodeEvent     = _dereq_('../core/document/NodeEvent');
var CSS = _dereq_('../core/document/CSS');
var ColorMode = _dereq_('../core/color/ColorMode');
var ColorUtil = _dereq_('../core/color/ColorUtil');
var Metric = _dereq_('./Metric');

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
},{"../core/color/ColorMode":39,"../core/color/ColorUtil":40,"../core/document/CSS":41,"../core/document/DocumentEvent":42,"../core/document/Node":44,"../core/document/NodeEvent":45,"./Metric":11}],16:[function(_dereq_,module,exports){
var ObjectComponent = _dereq_('../core/ObjectComponent');
var Node = _dereq_('../core/document/Node');

var CSS       = _dereq_('../core/document/CSS');
var Metric    = _dereq_('./Metric');
var ScrollBar = _dereq_('../core/layout/ScrollBar');

var Event_         = _dereq_('../core/event/Event'),
    DocumentEvent  = _dereq_('../core/document/DocumentEvent'),
    NodeEvent      = _dereq_('../core/document/NodeEvent'),
    ComponentEvent = _dereq_('../core/ComponentEvent');

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

},{"../core/ComponentEvent":30,"../core/ObjectComponent":34,"../core/document/CSS":41,"../core/document/DocumentEvent":42,"../core/document/Node":44,"../core/document/NodeEvent":45,"../core/event/Event":47,"../core/layout/ScrollBar":50,"./Metric":11}],17:[function(_dereq_,module,exports){
var Plotter = _dereq_('./Plotter');
var Mouse = _dereq_('../core/document/Mouse');

var Event_         = _dereq_('../core/event/Event'),
    DocumentEvent  = _dereq_('../core/document/DocumentEvent'),
    ComponentEvent = _dereq_('../core/ComponentEvent');

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
    var element = this._svg;

    var svgPos = this._svgPos;
        svgPos[0] = 0;
        svgPos[1] = 0;

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
    var svgSize = Number(this._svg.getAttribute('width')),
        svgMidX = svgSize * 0.5,
        svgMidY = svgSize * 0.5;

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

},{"../core/ComponentEvent":30,"../core/document/DocumentEvent":42,"../core/document/Mouse":43,"../core/event/Event":47,"./Plotter":19}],18:[function(_dereq_,module,exports){
var Node = _dereq_('../core/document/Node');

var CSS = _dereq_('../core/document/CSS');
var NumberInput_Internal = _dereq_('./NumberInput_Internal');
var Mouse = _dereq_('../core/document/Mouse');
var ColorUtil = _dereq_('../core/color/ColorUtil');
var DocumentEvent = _dereq_('../core/document/DocumentEvent'),
    NodeEvent     = _dereq_('../core/document/NodeEvent');

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
        canvasSlider = this._canvasSlider = document.createElement('Canvas');

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
},{"../core/color/ColorUtil":40,"../core/document/CSS":41,"../core/document/DocumentEvent":42,"../core/document/Mouse":43,"../core/document/Node":44,"../core/document/NodeEvent":45,"./NumberInput_Internal":13}],19:[function(_dereq_,module,exports){
var SVGComponent = _dereq_('./SVGComponent');

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

},{"./SVGComponent":22}],20:[function(_dereq_,module,exports){
var ObjectComponent = _dereq_('../core/ObjectComponent');
var Node = _dereq_('../core/document/Node');
var NumberInput_Internal = _dereq_('./NumberInput_Internal');
var CSS = _dereq_('../core/document/CSS');

var Event_         = _dereq_('../core/event/Event'),
    ComponentEvent = _dereq_('../core/ComponentEvent');

var DEFAULT_STEP = 1.0,
    DEFAULT_DP   = 2;

function Range(parent, object, value, params) {
    ObjectComponent.apply(this,arguments);

    params          = params          || {};
    params.onChange = params.onChange || this._onChange;
    params.step     = params.step || DEFAULT_STEP;
    params.dp       = params.dp   || DEFAULT_DP;

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
},{"../core/ComponentEvent":30,"../core/ObjectComponent":34,"../core/document/CSS":41,"../core/document/Node":44,"../core/event/Event":47,"./NumberInput_Internal":13}],21:[function(_dereq_,module,exports){
var Component = _dereq_('./../core/Component');
var CSS = _dereq_('../core/document/CSS');
var Metric = _dereq_('./Metric');
var GroupEvent = _dereq_('../group/GroupEvent');

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
},{"../core/document/CSS":41,"../group/GroupEvent":53,"./../core/Component":29,"./Metric":11}],22:[function(_dereq_,module,exports){
var ObjectComponent = _dereq_('../core/ObjectComponent');
var CSS = _dereq_('../core/document/CSS');
var GroupEvent = _dereq_('../group/GroupEvent');
var Metric = _dereq_('./Metric');

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
},{"../core/ObjectComponent":34,"../core/document/CSS":41,"../group/GroupEvent":53,"./Metric":11}],23:[function(_dereq_,module,exports){
var ObjectComponent = _dereq_('../core/ObjectComponent');
var Node = _dereq_('../core/document/Node');
var CSS  = _dereq_('../core/document/CSS');

var Options = _dereq_('./Options');

var History = _dereq_('../core/History');

var Event_         = _dereq_('../core/event/Event'),
    NodeEvent      = _dereq_('../core/document/NodeEvent'),
    ComponentEvent = _dereq_('../core/ComponentEvent'),
    OptionEvent    = _dereq_('../core/OptionEvent');

var ObjectComponentNotifier = _dereq_('../core/ObjectComponentNotifier');

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
        select.setProperty('value', params.selected ? values[params.selected] : STR_CHOOSE);
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

},{"../core/ComponentEvent":30,"../core/History":32,"../core/ObjectComponent":34,"../core/ObjectComponentNotifier":35,"../core/OptionEvent":36,"../core/document/CSS":41,"../core/document/Node":44,"../core/document/NodeEvent":45,"../core/event/Event":47,"./Options":15}],24:[function(_dereq_,module,exports){
var ObjectComponent = _dereq_('../core/ObjectComponent');
var CSS = _dereq_('../core/document/CSS');
var Slider_Internal = _dereq_('./Slider_Internal');

var History = _dereq_('../core/History');
var Range = _dereq_('./Range');
var NumberInput_Internal = _dereq_('./NumberInput_Internal');

var Event_         = _dereq_('../core/event/Event'),
    DocumentEvent  = _dereq_('../core/document/DocumentEvent'),
    PanelEvent     = _dereq_('../group/PanelEvent'),
    GroupEvent     = _dereq_('../group/GroupEvent'),
    ComponentEvent = _dereq_('../core/ComponentEvent');

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
},{"../core/ComponentEvent":30,"../core/History":32,"../core/ObjectComponent":34,"../core/document/CSS":41,"../core/document/DocumentEvent":42,"../core/event/Event":47,"../group/GroupEvent":53,"../group/PanelEvent":56,"./NumberInput_Internal":13,"./Range":20,"./Slider_Internal":25}],25:[function(_dereq_,module,exports){
var Node = _dereq_('../core/document/Node');

var DocumentEvent = _dereq_('../core/document/DocumentEvent'),
    NodeEvent = _dereq_('../core/document/NodeEvent');

var CSS = _dereq_('../core/document/CSS');
var Mouse = _dereq_('../core/document/Mouse');

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
},{"../core/document/CSS":41,"../core/document/DocumentEvent":42,"../core/document/Mouse":43,"../core/document/Node":44,"../core/document/NodeEvent":45}],26:[function(_dereq_,module,exports){
var ObjectComponent = _dereq_('../core/ObjectComponent');
var Node = _dereq_('../core/document/Node');
var CSS = _dereq_('../core/document/CSS');
var Options = _dereq_('./Options');
var ButtonPreset = _dereq_('./ButtonPreset');
var Metric = _dereq_('./Metric');

var Event_ = _dereq_('../core/event/Event'),
    DocumentEvent = _dereq_('../core/document/DocumentEvent'),
    NodeEvent = _dereq_('../core/document/NodeEvent'),
    ComponentEvent =  _dereq_('../core/ComponentEvent');

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

module.exports = StringInput;
},{"../core/ComponentEvent":30,"../core/ObjectComponent":34,"../core/document/CSS":41,"../core/document/DocumentEvent":42,"../core/document/Node":44,"../core/document/NodeEvent":45,"../core/event/Event":47,"./ButtonPreset":3,"./Metric":11,"./Options":15}],27:[function(_dereq_,module,exports){
var Output = _dereq_('./Output');

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

},{"./Output":16}],28:[function(_dereq_,module,exports){
var Plotter = _dereq_('./Plotter');
var Metric  = _dereq_('./Metric');

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


},{"./Metric":11,"./Plotter":19}],29:[function(_dereq_,module,exports){
var Node = _dereq_('./document/Node'),
    CSS = _dereq_('./document/CSS');
var EventDispatcher = _dereq_('./event/EventDispatcher'),
    ComponentEvent  = _dereq_('./ComponentEvent');

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
},{"./ComponentEvent":30,"./document/CSS":41,"./document/Node":44,"./event/EventDispatcher":48}],30:[function(_dereq_,module,exports){
var ComponentEvent = {
	VALUE_UPDATED: 'valueUpdated',
	UPDATE_VALUE: 'updateValue',

	INPUT_SELECT_DRAG: 'inputSelectDrag',

	ENABLE  : 'enable',
	DISABLE : 'disable'
};

module.exports = ComponentEvent;
},{}],31:[function(_dereq_,module,exports){
function ComponentObjectError(object,key) {
	Error.apply(this);
	Error.captureStackTrace(this,ComponentObjectError);
	this.name = 'ComponentObjectError';
	this.message = 'Object of type ' + object.constructor.name + ' has no member ' + key + '.';
}
ComponentObjectError.prototype = Object.create(Error.prototype);
ComponentObjectError.prototype.constructor = ComponentObjectError;

module.exports = ComponentObjectError;
},{}],32:[function(_dereq_,module,exports){
var EventDispatcher = _dereq_('./event/EventDispatcher'),
    Event_ = _dereq_('./event/Event'),
    HistoryEvent = _dereq_('./HistoryEvent');

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
},{"./HistoryEvent":33,"./event/Event":47,"./event/EventDispatcher":48}],33:[function(_dereq_,module,exports){
var HistoryEvent = {
	STATE_PUSH: 'historyStatePush',
	STATE_POP: 'historyStatePop'
};

module.exports = HistoryEvent;
},{}],34:[function(_dereq_,module,exports){
var History = _dereq_('./History');
var Component = _dereq_('./Component'),
    ComponentEvent = _dereq_('./ComponentEvent'),
    ObjectComponentNotifier = _dereq_('./ObjectComponentNotifier'),
    ComponentObjectError = _dereq_('./ComponentObjectError');
var Event_ = _dereq_('./event/Event');

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

},{"./Component":29,"./ComponentEvent":30,"./ComponentObjectError":31,"./History":32,"./ObjectComponentNotifier":35,"./event/Event":47}],35:[function(_dereq_,module,exports){
var EventDispatcher = _dereq_('./event/EventDispatcher'),
	Event_ 			= _dereq_('./event/Event');
var ComponentEvent  = _dereq_('./ComponentEvent'),
	OptionEvent		= _dereq_('./OptionEvent');

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
},{"./ComponentEvent":30,"./OptionEvent":36,"./event/Event":47,"./event/EventDispatcher":48}],36:[function(_dereq_,module,exports){
var OptionEvent = {
	TRIGGERED: 'selectTrigger',
	TRIGGER: 'triggerSelect'
};
module.exports = OptionEvent;
},{}],37:[function(_dereq_,module,exports){
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
},{}],38:[function(_dereq_,module,exports){
function ColorFormatError(msg) {
	Error.apply(this);
	Error.captureStackTrace(this,ColorFormatError);
	this.name = 'ColorFormatError';
	this.message = msg;
}
ColorFormatError.prototype = Object.create(Error.prototype);
ColorFormatError.prototype.constructor = ColorFormatError;

module.exports = ColorFormatError;
},{}],39:[function(_dereq_,module,exports){
var ColorMode = {
	RGB  : 'rgb',
	HSV  : 'hsv',
	HEX  : 'hex',
	RGBfv: 'rgbfv'
};

module.exports = ColorMode;
},{}],40:[function(_dereq_,module,exports){
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
},{}],41:[function(_dereq_,module,exports){
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

},{}],42:[function(_dereq_,module,exports){
var DocumentEvent = {
    MOUSE_MOVE: 'mousemove',
    MOUSE_UP: 'mouseup',
    MOUSE_DOWN: 'mousedown',
    MOUSE_WHEEL: 'mousewheel',
    WINDOW_RESIZE: 'resize'
};

module.exports = DocumentEvent;
},{}],43:[function(_dereq_,module,exports){
var EventDispatcher = _dereq_('../event/EventDispatcher'),
    Event_ = _dereq_('../event/Event'),
    DocumentEvent = _dereq_('./DocumentEvent');
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
},{"../event/Event":47,"../event/EventDispatcher":48,"./DocumentEvent":42}],44:[function(_dereq_,module,exports){
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
},{}],45:[function(_dereq_,module,exports){
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
},{}],46:[function(_dereq_,module,exports){
var Style = { 
	string : "#controlKit{position:absolute;top:0;left:0;width:100%;height:100%;-webkit-touch-callout:none;-webkit-user-select:none;-khtml-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;pointer-events:none}#controlKit .panel{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;pointer-events:auto;position:relative;z-index:1;-webkit-touch-callout:none;-webkit-user-select:none;-khtml-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;overflow:hidden;opacity:1;float:left;width:200px;border-radius:3px;-moz-border-radius:3px;box-shadow:0 2px 2px rgba(0,0,0,.25);margin:0;padding:0;background-color:#1a1a1a;font-family:Arial,sans-serif}#controlKit .panel .wrap{width:auto;height:auto;margin:0;padding:0;position:relative;overflow:hidden}#controlKit .panel ul{margin:0;padding:0;list-style:none}#controlKit .panel .color,#controlKit .panel input[type=text],#controlKit .panel textarea,#controlKit .picker input[type=text]{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;width:100%;height:25px;padding:0 0 0 8px;font-family:Arial,sans-serif;font-size:11px;color:#fff;text-shadow:1px 1px #000;outline:0;background:#222729;background-image:-o-linear-gradient(rgba(0,0,0,.075) 0,rgba(0,0,0,.125) 100%);background-image:linear-gradient(rgba(0,0,0,.075) 0,rgba(0,0,0,.125) 100%);border:none;box-shadow:0 0 0 1px #1f1f1f inset;border-radius:2px;-moz-border-radius:2px}#controlKit .panel .button,#controlKit .panel .select,#controlKit .panel .select-active,#controlKit .picker .button{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;cursor:pointer;width:100%;height:26px;margin:0;background-image:-o-linear-gradient(#404040 0,#3b3b3b 100%);background-image:linear-gradient(#404040 0,#3b3b3b 100%);border:none;outline:0;border-radius:2px;box-shadow:0 0 0 1px #1f1f1f inset,-1px 2px 0 0 #4a4a4a inset;font-family:Arial,sans-serif;color:#fff}#controlKit .panel textarea{padding:5px 8px 2px;overflow:hidden;resize:none;vertical-align:top;white-space:nowrap}#controlKit .panel .textarea-wrap{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;width:100%;padding:0;float:left;height:100%;overflow:hidden;border:none;border-radius:2px;-moz-border-radius:2px;background-color:#222729;box-shadow:0 0 1px 2px rgba(0,0,0,.0125) inset,0 0 1px 1px #111314 inset;background-image:-o-linear-gradient(rgba(0,0,0,.075) 0,rgba(0,0,0,.125) 100%);background-image:linear-gradient(rgba(0,0,0,.075) 0,rgba(0,0,0,.125) 100%)}#controlKit .panel .textarea-wrap textarea{border:none;border-radius:2px;-moz-border-radius:2px;box-shadow:none;background:0 0}#controlKit .panel .textarea-wrap .scrollBar{border:1px solid #101213;border-bottom-right-radius:2px;border-top-right-radius:2px;border-left:none;box-shadow:0 0 1px 2px rgba(0,0,0,.0125) inset,0 0 1px 1px #111314 inset}#controlKit .panel canvas{cursor:pointer;vertical-align:bottom;border:none;box-shadow:0 0 0 1px #1f1f1f inset;border-radius:2px;-moz-border-radius:2px}#controlKit .panel .canvas-wrap,#controlKit .panel .svg-wrap{margin:6px 0 0;position:relative;width:70%;float:right;-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border:none;border-radius:2px;-moz-border-radius:2px;background:#1e2224;background-image:-o-linear-gradient(transparent 0,rgba(0,0,0,.05) 100%);background-image:linear-gradient(transparent 0,rgba(0,0,0,.05) 100%)}#controlKit .panel .canvas-wrap svg,#controlKit .panel .svg-wrap svg{position:absolute;left:0;top:0;cursor:pointer;vertical-align:bottom;border:none;box-shadow:0 0 0 1px #1f1f1f inset;border-radius:2px;-moz-border-radius:2px}#controlKit .panel .button,#controlKit .picker .button{font-size:10px;font-weight:700;text-shadow:0 1px #000;text-transform:uppercase}#controlKit .panel .button:hover,#controlKit .picker .button:hover{background-image:-o-linear-gradient(#454545 0,#3b3b3b 100%);background-image:linear-gradient(#454545 0,#3b3b3b 100%)}#controlKit .panel .button:active,#controlKit .picker .button:active{background-image:-o-linear-gradient(#404040 0,#3b3b3b 100%);background-image:linear-gradient(#404040 0,#3b3b3b 100%)}#controlKit .panel .color-with-preset-wrap,#controlKit .panel .input-with-preset-wrap{width:100%;float:left}#controlKit .panel .color-with-preset-wrap .color,#controlKit .panel .input-with-preset-wrap input[type=text]{padding-right:25px;border-top-right-radius:2px;border-bottom-right-radius:2px;float:left}#controlKit .panel .button-preset,#controlKit .panel .button-preset-active{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;position:absolute;right:0;width:20px;height:25px;margin:0;cursor:pointer;float:right;border:none;border-top-right-radius:2px;border-bottom-right-radius:2px;box-shadow:0 0 0 1px #1f1f1f inset,-1px 2px 0 0 #4a4a4a inset;outline:0}#controlKit .panel .button-preset-active,#controlKit .panel .button-preset:hover{background:url(data:image/png;base64,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) 50% 50% no-repeat,linear-gradient(#454545 0,#3b3b3b 100%)}#controlKit .panel .button-preset{background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAFCAYAAAB4ka1VAAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo+qi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt/87fOH4p3iC+N7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi/RNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z+pn5mZ2y6xlhbL+xW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a/zYnKOZarnivN7cyzytuQN5zvn//tEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1+1dT1gvWd+1YfqGnRs+FYmKrhTbF5cVf9go3HjlG4dvyr+Z3JS0qavEuWTPZtJm6ebeLZ5bDpaql+aXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO/PLi8ZafJzs07P1SkVPRU+lQ27tLdtWHX+G7R7ht7vPY07NXbW7z3/T7JvttVAVVN1WbVZftJ+7P3P66Jqun4lvttXa1ObXHtxwPSA/0HIw6217nU1R3SPVRSj9Yr60cOxx++/p3vdy0NNg1VjZzG4iNwRHnk6fcJ3/ceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w+0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb++6EHTh0kX/i+c7vDvOXPK4dPKy2+UTV7hXmq86X23qdOo8/pPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb/1tWeOT3dvfN6b/fF9/XfFt1+cif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v+3Njv3H9qwHeg89HcR/cGhYPP/pH1jw9DBY+Zj8uGDYbrnjg+OTniP3L96fynQ89kzyaeF/6i/suuFxYvfvjV69fO0ZjRoZfyl5O/bXyl/erA6xmv28bCxh6+yXgzMV70VvvtwXfcdx3vo98PT+R8IH8o/2j5sfVT0Kf7kxmTk/8EA5jz/GMzLdsAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAAAG5JREFUeNpi5ODiamRgYKhjwA4amVx8gxjmL1rC8P3rVxQ8b+ESBhffIAZmNR29A5evXWdiZGC019XSZGBgYGBYvmY9w7I16xoZGBgaWKBG1S9bs+4/AwNDPQMDA1ySgYGBgdEnPAbZzgY0mgEwAE9lJT1lrsffAAAAAElFTkSuQmCC) 50% 50% no-repeat,linear-gradient(#404040 0,#3b3b3b 100%)}#controlKit .panel input[type=checkbox]{margin:6px 0 0}#controlKit .panel .select,#controlKit .panel .select-active{padding-left:10px;padding-right:20px;font-size:11px;text-align:left;text-shadow:1px 1px #000;cursor:pointer;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}#controlKit .panel .select{background:url(data:image/png;base64,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) 100% 50% no-repeat,linear-gradient(#404040 0,#3b3b3b 100%)}#controlKit .panel .select-active,#controlKit .panel .select:hover{background:url(data:image/png;base64,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) 100% 50% no-repeat,linear-gradient(#454545 0,#3b3b3b 100%)}#controlKit .panel .slider-handle,#controlKit .panel .slider-slot,#controlKit .panel .slider-wrap,#controlKit .panel .wrap-slider{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box}#controlKit .panel .wrap-slider{width:70%;padding:6px 0 0;float:right;height:100%}#controlKit .panel .wrap-slider input[type=text]{width:25%;text-align:center;padding:0;float:right}#controlKit .panel .slider-wrap{float:left;cursor:ew-resize;width:70%}#controlKit .panel .slider-slot{width:100%;height:25px;padding:3px;background-color:#1e2224;border:none;box-shadow:0 0 0 1px #1f1f1f inset;border-radius:2px;-moz-border-radius:2px}#controlKit .panel .slider-handle{position:relative;width:100%;height:100%;background:#b32435;background-image:-o-linear-gradient(transparent 0,rgba(0,0,0,.1) 100%);background-image:linear-gradient(transparent 0,rgba(0,0,0,.1) 100%);box-shadow:0 1px 0 0 #0f0f0f}#controlKit .panel .color{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;-webkit-touch-callout:none;-webkit-user-select:none;-khtml-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;cursor:pointer;width:100%;height:25px;padding:0;border:none;background:#fff;box-shadow:0 0 0 1px #111314 inset;text-align:center;line-height:25px;border-radius:2px;-moz-border-radius:2px}#controlKit .panel .graph-slider-x-wrap,#controlKit .panel .graph-slider-y-wrap{position:absolute;-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box}#controlKit .panel .graph-slider-x-wrap{bottom:0;left:0;width:100%;padding:6px 20px 6px 6px}#controlKit .panel .graph-slider-y-wrap{top:0;right:0;height:100%;padding:6px 6px 20px}#controlKit .panel .graph-slider-x,#controlKit .panel .graph-slider-y{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border-radius:2px;-moz-border-radius:2px;background:rgba(24,27,29,.5);border:1px solid #181b1d}#controlKit .panel .graph-slider-x{height:8px}#controlKit .panel .graph-slider-y{width:8px;height:100%}#controlKit .panel .graph-slider-x-handle,#controlKit .panel .graph-slider-y-handle{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;cursor:pointer;border:1px solid #181b1d;background:#303639}#controlKit .panel .graph-slider-x-handle{width:20px;height:100%;border-top:none;border-bottom:none}#controlKit .panel .graph-slider-y-handle{width:100%;height:20px;border-left:none;border-right:none}#controlKit .sub-group .wrap .wrap .wrap{width:25%!important;padding:0!important;float:left!important}#controlKit .sub-group .wrap .wrap .wrap .label{width:100%!important;padding:8px 0 0!important;color:#878787!important;text-align:center!important;text-transform:uppercase!important;font-weight:700!important;text-shadow:1px 1px #1a1a1a!important}#controlKit .sub-group .wrap .wrap .wrap input[type=text]{padding:0;text-align:center}#controlKit .options{pointer-events:auto;-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border:1px solid #1f1f1f;border-radius:2px;-moz-border-radius:2px;position:absolute;z-index:2147483638;left:0;top:0;width:auto;height:auto;box-shadow:0 1px 0 0 #4a4a4a inset;background-color:#454545;font-family:Arial,sans-serif;font-size:11px;color:#fff;text-shadow:1px 1px #000;overflow:hidden}#controlKit .options ul{width:100%;list-style:none;margin:0;padding:0}#controlKit .options ul li{margin:0;width:100%;height:25px;line-height:25px;padding:0 20px 0 10px;overflow:hidden;white-space:normal;text-overflow:ellipsis;cursor:pointer}#controlKit .options ul li:hover{background-color:#1f2325}#controlKit .options ul .li-selected{background-color:#292d30}#controlKit .options .color{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box}#controlKit .options .color .li-selected,#controlKit .options .color li{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;padding:0;height:25px;line-height:25px;text-align:center}#controlKit .options .color .li-selected:hover,#controlKit .options .color li:hover{background:0 0;font-weight:700}#controlKit .options .color .li-selected{font-weight:700}#controlKit .panel .label,#controlKit .picker .label{width:100%;float:left;font-size:11px;font-weight:700;text-shadow:0 1px #000;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;cursor:default}#controlKit .panel .head,#controlKit .panel .panel-head-inactive,#controlKit .picker .head{height:30px;padding:0 10px;background:#1a1a1a;overflow:hidden}#controlKit .panel .head .wrap,#controlKit .panel .panel-head-inactive .wrap,#controlKit .picker .head .wrap{width:auto;height:auto;margin:0;padding:0;position:relative;overflow:hidden}#controlKit .panel .head .label,#controlKit .picker .head .label{cursor:pointer;line-height:30px;color:#65696b}#controlKit .panel .group-list .group .head{height:38px;padding:0 10px;border-top:1px solid #4f4f4f;border-bottom:1px solid #262626;background-image:-o-linear-gradient(#454545 0,#3b3b3b 100%);background-image:linear-gradient(#454545 0,#3b3b3b 100%);cursor:pointer}#controlKit .panel .group-list .group .head .label{font-size:12px;line-height:38px;color:#fff}#controlKit .panel .group-list .group .head:hover{border-top:1px solid #525252;background-image:-o-linear-gradient(#454545 0,#404040 100%);background-image:linear-gradient(#454545 0,#404040 100%)}#controlKit .panel .group-list .group li{height:35px;padding:0 10px}#controlKit .panel .group-list .group .sub-group-list .sub-group:last-of-type{border-bottom:none}#controlKit .panel .group-list .group .sub-group-list .sub-group{padding:0;height:auto;border-bottom:1px solid #242424}#controlKit .panel .group-list .group .sub-group-list .sub-group ul{overflow:hidden}#controlKit .panel .group-list .group .sub-group-list .sub-group ul li{background:#2e2e2e;border-bottom:1px solid #222729}#controlKit .panel .group-list .group .sub-group-list .sub-group ul li:last-of-type{border-bottom:none}#controlKit .panel .group-list .group .sub-group-list .sub-group:first-child{margin-top:0}#controlKit .panel .group-list .group .sub-group-list .sub-group .head,#controlKit .panel .group-list .group .sub-group-list .sub-group .head-inactive{cursor:pointer}#controlKit .panel .group-list .group .sub-group-list .sub-group .head{height:27px;padding:0 10px;border-top:none;border-bottom:1px solid #242424;background-image:none;background-color:#272727}#controlKit .panel .group-list .group .sub-group-list .sub-group .head:hover{background-image:none;background-color:#272727}#controlKit .panel .group-list .group .sub-group-list .sub-group .head-inactive{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;height:27px;padding:0 10px;box-shadow:0 1px 0 0 #404040 inset;background-image:-o-linear-gradient(#3b3b3b 0,#383838 100%);background-image:linear-gradient(#3b3b3b 0,#383838 100%)}#controlKit .panel .group-list .group .sub-group-list .sub-group .head-inactive:hover{box-shadow:0 1px 0 0 #474747 inset;background-image:none;background-image:-o-linear-gradient(#404040 0,#3b3b3b 100%);background-image:linear-gradient(#404040 0,#3b3b3b 100%)}#controlKit .panel .group-list .group .sub-group-list .sub-group .head .label,#controlKit .panel .group-list .group .sub-group-list .sub-group .head-inactive .label{margin:0;padding:0;line-height:27px;color:#fff;font-weight:700;font-size:11px;text-shadow:1px 1px #000;text-transform:capitalize}#controlKit .panel .group-list .group .sub-group-list .sub-group .head .wrap .label,#controlKit .panel .group-list .group .sub-group-list .sub-group .head-inactive .wrap .label{width:100%;font-weight:700;color:#fff;padding:0}#controlKit .panel .group-list .group .sub-group-list .sub-group .wrap .label{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;height:100%;width:30%;padding:12px 5px 0 0;float:left;font-size:11px;font-weight:400;color:#aeb5b8;text-shadow:1px 1px #000}#controlKit .panel .group-list .group .sub-group-list .sub-group .wrap .wrap{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;width:70%;padding:5px 0 0;float:right;height:100%}#controlKit .panel .group-list .group:last-child .scroll-buffer:nth-of-type(3),#controlKit .panel .group-list .group:last-child .sub-group-list{border-bottom:none}#controlKit .panel .scroll-wrap{position:relative;overflow:hidden}#controlKit .panel .scroll-buffer{width:100%;height:8px;border-top:1px solid #3b4447;border-bottom:1px solid #1e2224}#controlKit .panel .scrollBar{-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box;width:15px;height:100%;float:right;top:0;padding:0;margin:0;position:relative;background:#212628;background-image:linear-gradient(to right,#242424 0,#2e2e2e 100%)}#controlKit .panel .scrollBar .track{padding:0 3px 0 2px}#controlKit .panel .scrollBar .track .thumb{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;width:11px;position:absolute;cursor:pointer;background-color:#343434;border:1px solid #1b1f21;border-radius:10px;-moz-border-radius:10px;box-shadow:inset 0 1px 0 0 #434b50}#controlKit .panel .menu,#controlKit .panel .menu-active,#controlKit .picker .menu{float:right;padding:5px 0 0}#controlKit .panel .menu input[type=button],#controlKit .panel .menu-active input[type=button],#controlKit .picker .menu input[type=button]{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;cursor:pointer;height:20px;border:none;vertical-align:top;border-radius:2px;-moz-border-radius:2px;font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:#aaa;text-shadow:0 -1px #000;text-transform:uppercase;box-shadow:0 0 0 1px #131313 inset,-1px 2px 0 0 #212527 inset}#controlKit .panel .menu .button-menu-close,#controlKit .panel .menu .button-menu-hide,#controlKit .panel .menu .button-menu-show,#controlKit .panel .menu-active .button-menu-close,#controlKit .panel .menu-active .button-menu-hide,#controlKit .panel .menu-active .button-menu-show,#controlKit .picker .menu .button-menu-close,#controlKit .picker .menu .button-menu-hide,#controlKit .picker .menu .button-menu-show{width:20px;margin-left:4px}#controlKit .panel .menu .button-menu-hide,#controlKit .panel .menu-active .button-menu-hide,#controlKit .picker .menu .button-menu-hide{background:url(data:image/png;base64,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) 50% 50% no-repeat,#1a1d1f}#controlKit .panel .menu .button-menu-hide:hover,#controlKit .panel .menu-active .button-menu-hide:hover,#controlKit .picker .menu .button-menu-hide:hover{background:url(data:image/png;base64,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) 50% 50% no-repeat,#000;box-shadow:#fff 0,#000 100%}#controlKit .panel .menu .button-menu-show,#controlKit .panel .menu-active .button-menu-show,#controlKit .picker .menu .button-menu-show{background:url(data:image/png;base64,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) 50% 50% no-repeat,#1a1d1f}#controlKit .panel .menu .button-menu-show:hover,#controlKit .panel .menu-active .button-menu-show:hover,#controlKit .picker .menu .button-menu-show:hover{background:url(data:image/png;base64,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) 50% 50% no-repeat,#000;box-shadow:#fff 0,#000 100%}#controlKit .panel .menu .button-menu-close,#controlKit .panel .menu-active .button-menu-close,#controlKit .picker .menu .button-menu-close{background:url(data:image/png;base64,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) 50% 50% no-repeat,#1a1d1f}#controlKit .panel .menu .button-menu-close:hover,#controlKit .panel .menu-active .button-menu-close:hover,#controlKit .picker .menu .button-menu-close:hover{background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAJCAYAAAAPU20uAAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo+qi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt/87fOH4p3iC+N7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi/RNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z+pn5mZ2y6xlhbL+xW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a/zYnKOZarnivN7cyzytuQN5zvn//tEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1+1dT1gvWd+1YfqGnRs+FYmKrhTbF5cVf9go3HjlG4dvyr+Z3JS0qavEuWTPZtJm6ebeLZ5bDpaql+aXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO/PLi8ZafJzs07P1SkVPRU+lQ27tLdtWHX+G7R7ht7vPY07NXbW7z3/T7JvttVAVVN1WbVZftJ+7P3P66Jqun4lvttXa1ObXHtxwPSA/0HIw6217nU1R3SPVRSj9Yr60cOxx++/p3vdy0NNg1VjZzG4iNwRHnk6fcJ3/ceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w+0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb++6EHTh0kX/i+c7vDvOXPK4dPKy2+UTV7hXmq86X23qdOo8/pPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb/1tWeOT3dvfN6b/fF9/XfFt1+cif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v+3Njv3H9qwHeg89HcR/cGhYPP/pH1jw9DBY+Zj8uGDYbrnjg+OTniP3L96fynQ89kzyaeF/6i/suuFxYvfvjV69fO0ZjRoZfyl5O/bXyl/erA6xmv28bCxh6+yXgzMV70VvvtwXfcdx3vo98PT+R8IH8o/2j5sfVT0Kf7kxmTk/8EA5jz/GMzLdsAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAAAQ1JREFUeNpM0D9LAmEAx/HvPXeDTqeXpVeYYjpYGQ1hBQ7SnxfQ0pA1FEVbr6FeRgZuCb2EoOCgm26spoIgiKBQQaIUnuceW27wt36HD/wMO+ncAna1Vl9jbIHvtYANa2lltYJhuIHvXVVr9ZMoHpXmFw/tpCOtWCx+L0xzv1heOA58Lw68pqdnzlNpl1DKNws40GH4kJrKXAphNgZ/v2TzBZSUbaAhIrLZ/f66m8y4zBaK/PT7XaABICLzbDgcbOkwJFQKPdITge+1AQw76dy42dxufq5EqFQLeBdCXPR6HV6eHz+M9fr2Z8JxXCVlEziNyD3Tsq6VksosV5Y3tdYdYGfshqeR1jkDI/E/AO8rYRlwXBquAAAAAElFTkSuQmCC) 50% 50% no-repeat,#000;box-shadow:#fff 0,#000 100%}#controlKit .panel .menu .button-menu-undo,#controlKit .panel .menu-active .button-menu-undo{background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAALCAYAAABLcGxfAAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo+qi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt/87fOH4p3iC+N7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi/RNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z+pn5mZ2y6xlhbL+xW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a/zYnKOZarnivN7cyzytuQN5zvn//tEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1+1dT1gvWd+1YfqGnRs+FYmKrhTbF5cVf9go3HjlG4dvyr+Z3JS0qavEuWTPZtJm6ebeLZ5bDpaql+aXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO/PLi8ZafJzs07P1SkVPRU+lQ27tLdtWHX+G7R7ht7vPY07NXbW7z3/T7JvttVAVVN1WbVZftJ+7P3P66Jqun4lvttXa1ObXHtxwPSA/0HIw6217nU1R3SPVRSj9Yr60cOxx++/p3vdy0NNg1VjZzG4iNwRHnk6fcJ3/ceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w+0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb++6EHTh0kX/i+c7vDvOXPK4dPKy2+UTV7hXmq86X23qdOo8/pPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb/1tWeOT3dvfN6b/fF9/XfFt1+cif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v+3Njv3H9qwHeg89HcR/cGhYPP/pH1jw9DBY+Zj8uGDYbrnjg+OTniP3L96fynQ89kzyaeF/6i/suuFxYvfvjV69fO0ZjRoZfyl5O/bXyl/erA6xmv28bCxh6+yXgzMV70VvvtwXfcdx3vo98PT+R8IH8o/2j5sfVT0Kf7kxmTk/8EA5jz/GMzLdsAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAAAYVJREFUeNpckD1IW1EYhp9z7rm3oqkhzZ/xD6tR1EpFKelghlBonVwKDpaWDnbq2lVF0MHBUbdCp5aCUigdnISgoUPAqWMlYsGlNtYK1Zhzzr1dVG7zbt/L97x87yceTz0lrHKp+BJYBHqurG/AfC5f+AwgwkC5VHybyrTPdvdmA9f1BEJQO//LYWWfk+OfS7l8YeEGKJeKr7ND99aT6QzWmHPgE+AAM47rcnR4wI/K/qS8Ts90dq+lMh1YY1aBFuAF8AyQVuvNrrt9xOKJjyIau/MOGJp49ORhrXZh9r7ubgPPc/nCr3A36TjG931HDY+OTyjP6w8AKR01MvagcFqtxoH/gLPT3wexRDKrIrdbd6Tj9AshcD0PQaTa3BI5oUFa13sIAiTwyrd2wWqNqV/uAR3AccOrPyRSbUrX63/Ulbfk+34FxJdyqdgELAO3gDgwPTBy/3pvRoWC3gMkUm3pSDT6RkqJcl3iyXQQWIs1ZgXYUo239g4M1sKz1fo7MAdsAPwbAL9hftvTlNkdAAAAAElFTkSuQmCC) 20% 50% no-repeat,#1a1d1f;padding:0 6px 1px 0;width:38px;vertical-align:top;text-align:end}#controlKit .panel .menu .button-menu-undo:hover,#controlKit .panel .menu-active .button-menu-undo:hover{background:url(data:image/png;base64,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) 20% 50% no-repeat,#000;box-shadow:#fff 0,#000 100%}#controlKit .panel .menu .button-menu-load,#controlKit .panel .menu-active .button-menu-load{margin-right:2px}#controlKit .panel .menu .button-menu-load,#controlKit .panel .menu .button-menu-save,#controlKit .panel .menu-active .button-menu-load,#controlKit .panel .menu-active .button-menu-save{background:#1a1d1f;font-size:9px!important}#controlKit .panel .menu .button-menu-load:hover,#controlKit .panel .menu .button-menu-save:hover,#controlKit .panel .menu-active .button-menu-load:hover,#controlKit .panel .menu-active .button-menu-save:hover{background:#000}#controlKit .panel .menu .wrap{display:none}#controlKit .panel .menu-active{width:100%;float:left}#controlKit .panel .menu-active .wrap{display:inline}#controlKit .panel .menu-active .button-menu-close,#controlKit .panel .menu-active .button-menu-hide,#controlKit .panel .menu-active .button-menu-show{float:right}#controlKit .panel .arrow-s-max{background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAFCAYAAAB4ka1VAAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo+qi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt/87fOH4p3iC+N7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi/RNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z+pn5mZ2y6xlhbL+xW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a/zYnKOZarnivN7cyzytuQN5zvn//tEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1+1dT1gvWd+1YfqGnRs+FYmKrhTbF5cVf9go3HjlG4dvyr+Z3JS0qavEuWTPZtJm6ebeLZ5bDpaql+aXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO/PLi8ZafJzs07P1SkVPRU+lQ27tLdtWHX+G7R7ht7vPY07NXbW7z3/T7JvttVAVVN1WbVZftJ+7P3P66Jqun4lvttXa1ObXHtxwPSA/0HIw6217nU1R3SPVRSj9Yr60cOxx++/p3vdy0NNg1VjZzG4iNwRHnk6fcJ3/ceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w+0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb++6EHTh0kX/i+c7vDvOXPK4dPKy2+UTV7hXmq86X23qdOo8/pPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb/1tWeOT3dvfN6b/fF9/XfFt1+cif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v+3Njv3H9qwHeg89HcR/cGhYPP/pH1jw9DBY+Zj8uGDYbrnjg+OTniP3L96fynQ89kzyaeF/6i/suuFxYvfvjV69fO0ZjRoZfyl5O/bXyl/erA6xmv28bCxh6+yXgzMV70VvvtwXfcdx3vo98PT+R8IH8o/2j5sfVT0Kf7kxmTk/8EA5jz/GMzLdsAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAAAG5JREFUeNpi5ODiamRgYKhjwA4amVx8gxjmL1rC8P3rVxQ8b+ESBhffIAZmNR29A5evXWdiZGC019XSZGBgYGBYvmY9w7I16xoZGBgaWKBG1S9bs+4/AwNDPQMDA1ySgYGBgdEnPAbZzgY0mgEwAE9lJT1lrsffAAAAAElFTkSuQmCC) center no-repeat}#controlKit .panel .arrow-s-min{background:url(data:image/png;base64,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) center no-repeat}#controlKit .panel .arrow-s-max,#controlKit .panel .arrow-s-min{width:100%;height:20px}#controlKit .panel .arrow-b-max{background:url(data:image/png;base64,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) center no-repeat}#controlKit .panel .arrow-b-min{background:url(data:image/png;base64,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) center no-repeat}#controlKit .panel .arrow-b-sub-max{background:url(data:image/png;base64,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) center no-repeat}#controlKit .panel .arrow-b-sub-min{background:url(data:image/png;base64,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) center no-repeat}#controlKit .panel .arrow-b-max,#controlKit .panel .arrow-b-min,#controlKit .panel .arrow-b-sub-max,#controlKit .panel .arrow-b-sub-min{width:10px;height:100%;float:right}#controlKit .picker{pointer-events:auto;-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border-radius:3px;-moz-border-radius:3px;background-color:#3b3b3b;font-family:Arial,sans-serif;font-size:11px;color:#fff;text-shadow:1px 1px #000;overflow:hidden;position:absolute;z-index:2147483631;width:360px;-webkit-touch-callout:none;-webkit-user-select:none;-khtml-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;box-shadow:0 2px 2px rgba(0,0,0,.25)}#controlKit .picker canvas{vertical-align:bottom;cursor:pointer}#controlKit .picker .wrap{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;padding:10px;float:left}#controlKit .picker .field-wrap{padding:3px}#controlKit .picker .slider-wrap{padding:3px 13px 3px 3px}#controlKit .picker .field-wrap,#controlKit .picker .input-wrap,#controlKit .picker .slider-wrap{height:auto;overflow:hidden;float:left}#controlKit .picker .input-wrap{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border:1px solid #242424;border-radius:2px;-moz-border-radius:2px;width:140px;float:right;padding:5px 10px 1px 0}#controlKit .picker .input-field{width:50%;float:right;margin-bottom:4px}#controlKit .picker .input-field .label{padding:8px 0 0;color:#878787;text-align:center;text-transform:uppercase;font-weight:700;text-shadow:1px 1px #1a1a1a;width:40%}#controlKit .picker .input-field .wrap{padding:0;width:60%;height:auto;float:right}#controlKit .picker .controls-wrap{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;width:100%;height:auto;float:right;padding:9px 0 0}#controlKit .picker .controls-wrap input[type=button]{float:right;width:65px;margin:0 0 0 10px}#controlKit .picker .color-contrast{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border:none;box-shadow:0 0 0 1px #1f1f1f inset;border-radius:2px;-moz-border-radius:2px;height:25px;padding:3px;width:80%;margin-bottom:4px;float:right}#controlKit .picker .color-contrast div{width:50%;height:100%;float:left}#controlKit .picker input[type=text]{padding:0;text-align:center;width:60%;float:right}#controlKit .picker .wrap .input-wrap:nth-of-type(3){border-bottom-left-radius:0;border-bottom-right-radius:0}#controlKit .picker .wrap .input-wrap:nth-of-type(4){border-top:none;border-top-left-radius:0;border-top-right-radius:0}#controlKit .picker .wrap .input-wrap:nth-of-type(4) .input-field{width:100%}#controlKit .picker .wrap .input-wrap:nth-of-type(4) .input-field .label{width:20%}#controlKit .picker .wrap .input-wrap:nth-of-type(4) input[type=text]{width:80%}#controlKit .picker .field-wrap,#controlKit .picker .slider-wrap{background:#1e2224;border:none;box-shadow:0 0 0 1px #1f1f1f inset;border-radius:2px;-moz-border-radius:2px;position:relative;margin-right:5px}#controlKit .picker .field-wrap .indicator,#controlKit .picker .slider-wrap .indicator{position:absolute;border:2px solid #fff;box-shadow:0 1px black,0 1px #000 inset;cursor:pointer}#controlKit .picker .field-wrap .indicator{width:8px;height:8px;left:50%;top:50%;border-radius:50%;-moz-border-radius:50%}#controlKit .picker .slider-wrap .indicator{width:14px;height:3px;border-radius:8px;-moz-border-radius:8px;left:1px;top:1px}#controlKit .picker .slider-wrap .indicator:after{content:'';width:0;height:0;border-top:4.5px solid transparent;border-bottom:4.5px solid transparent;border-right:4px solid #fff;float:right;position:absolute;top:-2px;left:19px}#controlKit .picker .slider-wrap .indicator:before{content:'';width:0;height:0;border-top:4.5px solid transparent;border-bottom:4.5px solid transparent;border-right:4px solid #000;float:right;position:absolute;top:-3px;left:19px}"
}; 
module.exports = Style;
},{}],47:[function(_dereq_,module,exports){
function Event_(sender,type,data) {
    this.sender = sender;
    this.type   = type;
    this.data   = data;
}
module.exports = Event_;
},{}],48:[function(_dereq_,module,exports){
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
},{}],49:[function(_dereq_,module,exports){
var LayoutMode = {
    LEFT   : 'left',
    RIGHT  : 'right',
    TOP    : 'top',
    BOTTOM : 'bottom',
    NONE   : 'none'
};

module.exports = LayoutMode;
},{}],50:[function(_dereq_,module,exports){
var Node   = _dereq_('../document/Node');
var Metric = _dereq_('../../component/Metric');
var CSS    = _dereq_('../document/CSS');
var DocumentEvent = _dereq_('../document/DocumentEvent'),
    NodeEvent     = _dereq_('../document/NodeEvent');
var Mouse  = _dereq_('../document/Mouse');

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
},{"../../component/Metric":11,"../document/CSS":41,"../document/DocumentEvent":42,"../document/Mouse":43,"../document/Node":44,"../document/NodeEvent":45}],51:[function(_dereq_,module,exports){
var EventDispatcher = _dereq_('../core/event/EventDispatcher');
var Node            = _dereq_('../core/document/Node');
var ScrollBar       = _dereq_('../core/layout/ScrollBar');

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


},{"../core/document/Node":44,"../core/event/EventDispatcher":48,"../core/layout/ScrollBar":50}],52:[function(_dereq_,module,exports){
var AbstractGroup = _dereq_('./AbstractGroup');
var CSS = _dereq_('../core/document/CSS');
var Node = _dereq_('../core/document/Node');

var SubGroup = _dereq_('./SubGroup');

var Event_ = _dereq_('../core/event/Event'),
    DocumentEvent = _dereq_('../core/document/DocumentEvent'),
    NodeEvent = _dereq_('../core/document/NodeEvent'),
    PanelEvent = _dereq_('./PanelEvent'),
    GroupEvent = _dereq_('./GroupEvent');

var ObjectComponent = _dereq_('../core/ObjectComponent'),
    ValuePlotter    = _dereq_('../component/ValuePlotter'),
    FunctionPlotter = _dereq_('../component/FunctionPlotter');

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

},{"../component/FunctionPlotter":8,"../component/ValuePlotter":28,"../core/ObjectComponent":34,"../core/document/CSS":41,"../core/document/DocumentEvent":42,"../core/document/Node":44,"../core/document/NodeEvent":45,"../core/event/Event":47,"./AbstractGroup":51,"./GroupEvent":53,"./PanelEvent":56,"./SubGroup":57}],53:[function(_dereq_,module,exports){
var GroupEvent = {
	GROUP_SIZE_CHANGE        : 'groupSizeChange',
	GROUP_LIST_SIZE_CHANGE   : 'groupListSizeChange',
	GROUP_SIZE_UPDATE        : 'groupSizeUpdate',
	SUBGROUP_TRIGGER         : 'subGroupTrigger',

	SUBGROUP_ENABLE          : 'enableSubGroup',
	SUBGROUP_DISABLE         : 'disableSubGroup'
};

module.exports = GroupEvent;
},{}],54:[function(_dereq_,module,exports){
var MenuEvent = {
	UPDATE_MENU: 'updateMenu'
};
module.exports = MenuEvent;
},{}],55:[function(_dereq_,module,exports){
var Node      = _dereq_('../core/document/Node'),
    Group     = _dereq_('./Group'),
    ScrollBar = _dereq_('../core/layout/ScrollBar');

var CSS        = _dereq_('../core/document/CSS');
var LayoutMode = _dereq_('../core/layout/LayoutMode');
var History    = _dereq_('../core/History');

var EventDispatcher = _dereq_('../core/event/EventDispatcher'),
    Event_          = _dereq_('../core/event/Event'),
    DocumentEvent   = _dereq_('../core/document/DocumentEvent'),
    NodeEvent       = _dereq_('../core/document/NodeEvent'),
    PanelEvent      = _dereq_('./PanelEvent'),
    MenuEvent       = _dereq_('./MenuEvent');

var Mouse = _dereq_('../core/document/Mouse');

var StringInput     = _dereq_('../component/StringInput'),
    NumberInput     = _dereq_('../component/NumberInput'),
    Range           = _dereq_('../component/Range'),
    Checkbox        = _dereq_('../component/Checkbox'),
    Color           = _dereq_('../component/Color'),
    Button          = _dereq_('../component/Button'),
    Select          = _dereq_('../component/Select'),
    Slider          = _dereq_('../component/Slider'),
    FunctionPlotter = _dereq_('../component/FunctionPlotter'),
    Pad             = _dereq_('../component/Pad'),
    ValuePlotter    = _dereq_('../component/ValuePlotter'),
    NumberOutput    = _dereq_('../component/NumberOutput'),
    StringOutput    = _dereq_('../component/StringOutput'),
    Canvas_         = _dereq_('../component/Canvas'),
    SVG_            = _dereq_('../component/SVG');

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
},{"../component/Button":2,"../component/Canvas":4,"../component/Checkbox":5,"../component/Color":6,"../component/FunctionPlotter":8,"../component/NumberInput":12,"../component/NumberOutput":14,"../component/Pad":17,"../component/Range":20,"../component/SVG":21,"../component/Select":23,"../component/Slider":24,"../component/StringInput":26,"../component/StringOutput":27,"../component/ValuePlotter":28,"../core/History":32,"../core/document/CSS":41,"../core/document/DocumentEvent":42,"../core/document/Mouse":43,"../core/document/Node":44,"../core/document/NodeEvent":45,"../core/event/Event":47,"../core/event/EventDispatcher":48,"../core/layout/LayoutMode":49,"../core/layout/ScrollBar":50,"./Group":52,"./MenuEvent":54,"./PanelEvent":56}],56:[function(_dereq_,module,exports){
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
},{}],57:[function(_dereq_,module,exports){
var AbstractGroup = _dereq_('./AbstractGroup');
var Node = _dereq_('../core/document/Node');
var CSS  = _dereq_('../core/document/CSS');

var Event_         = _dereq_('../core/event/Event'),
    DocumentEvent  = _dereq_('../core/document/DocumentEvent'),
    PanelEvent     = _dereq_('./PanelEvent'),
    GroupEvent     = _dereq_('./GroupEvent'),
    ComponentEvent = _dereq_('../core/ComponentEvent');

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
},{"../core/ComponentEvent":30,"../core/document/CSS":41,"../core/document/DocumentEvent":42,"../core/document/Node":44,"../core/event/Event":47,"./AbstractGroup":51,"./GroupEvent":53,"./PanelEvent":56}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvQ29udHJvbEtpdC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L0J1dHRvbi5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L0J1dHRvblByZXNldC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L0NhbnZhcy5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L0NoZWNrYm94LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvQ29sb3IuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9GdW5jdGlvblBsb3RUeXBlLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvRnVuY3Rpb25QbG90dGVyLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3IuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9GdW5jdGlvblBsb3R0ZXJPYmplY3RFcnJvci5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L01ldHJpYy5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L051bWJlcklucHV0LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvTnVtYmVySW5wdXRfSW50ZXJuYWwuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9OdW1iZXJPdXRwdXQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9PcHRpb25zLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvT3V0cHV0LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvUGFkLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvUGlja2VyLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvUGxvdHRlci5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L1JhbmdlLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvU1ZHLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvU1ZHQ29tcG9uZW50LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvU2VsZWN0LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvU2xpZGVyLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvU2xpZGVyX0ludGVybmFsLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvU3RyaW5nSW5wdXQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9TdHJpbmdPdXRwdXQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9WYWx1ZVBsb3R0ZXIuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvQ29tcG9uZW50LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL0NvbXBvbmVudEV2ZW50LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL0NvbXBvbmVudE9iamVjdEVycm9yLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL0hpc3RvcnkuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvSGlzdG9yeUV2ZW50LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL09iamVjdENvbXBvbmVudC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9PYmplY3RDb21wb25lbnROb3RpZmllci5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9PcHRpb25FdmVudC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9TdGF0ZS5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9jb2xvci9Db2xvckZvcm1hdEVycm9yLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL2NvbG9yL0NvbG9yTW9kZS5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9jb2xvci9Db2xvclV0aWwuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvZG9jdW1lbnQvQ1NTLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvZG9jdW1lbnQvTW91c2UuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvZG9jdW1lbnQvTm9kZS5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvZG9jdW1lbnQvU3R5bGUuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvZXZlbnQvRXZlbnQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvZXZlbnQvRXZlbnREaXNwYXRjaGVyLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL2xheW91dC9MYXlvdXRNb2RlLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL2xheW91dC9TY3JvbGxCYXIuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2dyb3VwL0Fic3RyYWN0R3JvdXAuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2dyb3VwL0dyb3VwLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9ncm91cC9Hcm91cEV2ZW50LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9ncm91cC9NZW51RXZlbnQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2dyb3VwL1BhbmVsLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9ncm91cC9QYW5lbEV2ZW50LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9ncm91cC9TdWJHcm91cC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeE5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2h6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3UEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy94QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBOb2RlICAgID0gcmVxdWlyZSgnLi9jb3JlL2RvY3VtZW50L05vZGUnKSxcbiAgICBQYW5lbCAgID0gcmVxdWlyZSgnLi9ncm91cC9QYW5lbCcpLFxuICAgIE9wdGlvbnMgPSByZXF1aXJlKCcuL2NvbXBvbmVudC9PcHRpb25zJyksXG4gICAgUGlja2VyICA9IHJlcXVpcmUoJy4vY29tcG9uZW50L1BpY2tlcicpO1xuXG52YXIgQ1NTID0gcmVxdWlyZSgnLi9jb3JlL2RvY3VtZW50L0NTUycpO1xuXG52YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZSgnLi9jb3JlL2V2ZW50L0V2ZW50RGlzcGF0Y2hlcicpLFxuICAgIEV2ZW50XyAgICAgICAgICA9IHJlcXVpcmUoJy4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIERvY3VtZW50RXZlbnQgICA9IHJlcXVpcmUoJy4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXG4gICAgTm9kZUV2ZW50ICAgICAgID0gcmVxdWlyZSgnLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpLFxuICAgIENvbXBvbmVudEV2ZW50ICA9IHJlcXVpcmUoJy4vY29yZS9Db21wb25lbnRFdmVudCcpLFxuICAgIEhpc3RvcnlFdmVudCAgICA9IHJlcXVpcmUoJy4vY29yZS9IaXN0b3J5RXZlbnQnKSxcbiAgICBNZW51RXZlbnQgICAgICAgPSByZXF1aXJlKCcuL2dyb3VwL01lbnVFdmVudCcpO1xuXG52YXIgSGlzdG9yeSA9IHJlcXVpcmUoJy4vY29yZS9IaXN0b3J5JyksXG4gICAgU3RhdGUgICA9IHJlcXVpcmUoJy4vY29yZS9TdGF0ZScpO1xuXG52YXIgTW91c2UgICA9IHJlcXVpcmUoJy4vY29yZS9kb2N1bWVudC9Nb3VzZScpO1xuXG52YXIgVmFsdWVQbG90dGVyID0gcmVxdWlyZSgnLi9jb21wb25lbnQvVmFsdWVQbG90dGVyJyk7XG52YXIgU3RyaW5nT3V0cHV0ID0gcmVxdWlyZSgnLi9jb21wb25lbnQvU3RyaW5nT3V0cHV0JyksXG4gICAgTnVtYmVyT3V0cHV0ID0gcmVxdWlyZSgnLi9jb21wb25lbnQvTnVtYmVyT3V0cHV0Jyk7XG5cbnZhciBERUZBVUxUX0hJU1RPUlkgPSBmYWxzZSxcbiAgICBERUZBVUxUX09QQUNJVFkgPSAxLjAsXG4gICAgREVGQVVMVF9QQU5FTFNfQ0xPU0FCTEUgPSBmYWxzZSxcbiAgICBERUZBVUxUX0VOQUJMRSA9IHRydWUsXG4gICAgREVGQVVMVF9MT0FEX0FORF9TQVZFID0gZmFsc2U7XG5cbnZhciBERUZBVUxUX1RSSUdHRVJfU0hPUlRDVVRfQ0hBUiA9ICdoJztcblxudmFyIGluaXRpYXRlZCA9IGZhbHNlO1xuXG4vKipcbiAqIEluaXRpYWxpemVzIENvbnRyb2xLaXQuXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQ29udHJvbEtpdCBvcHRpb25zXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMub3BhY2l0eT0xLjBdIC0gT3ZlcmFsbCBvcGFjaXR5XG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmVuYWJsZT10cnVlXSAtIEluaXRpYWwgQ29udHJvbEtpdCBzdGF0ZSwgZW5hYmxlZCAvIGRpc2FibGVkXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLnVzZUV4dGVybmFsU3R5bGU9ZmFsc2VdIC0gSWYgdHJ1ZSwgYW4gZXh0ZXJuYWwgc3R5bGUgaXMgdXNlZCBpbnN0ZWFkIG9mIHRoZSBidWlsZC1pbiBvbmVcbiAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0aW9ucy5zdHlsZVN0cmluZ10gLSBJZiB0cnVlLCBhbiBleHRlcm5hbCBzdHlsZSBpcyB1c2VkIGluc3RlYWQgb2YgdGhlIGJ1aWxkLWluIG9uZVxuICogQHBhcmFtIHtCb29sZWFufVtvcHRpb25zLmhpc3Rvcnk9ZmFsc2VdIC0gKEV4cGVyaW1lbnRhbCkgRW5hYmxlcyBhIHZhbHVlIGhpc3RvcnkgZm9yIGFsbCBjb21wb25lbnRzXG4gKi9cbmZ1bmN0aW9uIENvbnRyb2xLaXQob3B0aW9ucykge1xuICAgIGlmKGluaXRpYXRlZCl7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ29udHJvbEtpdCBpcyBhbHJlYWR5IGluaXRpYWxpemVkLicpO1xuICAgIH1cbiAgICBvcHRpb25zICAgICAgICAgICAgICAgICAgPSBvcHRpb25zIHx8IHt9O1xuICAgIG9wdGlvbnMuaGlzdG9yeSAgICAgICAgICA9IG9wdGlvbnMuaGlzdG9yeSA9PT0gdW5kZWZpbmVkID8gREVGQVVMVF9ISVNUT1JZIDogb3B0aW9ucy5oaXN0b3J5O1xuICAgIG9wdGlvbnMubG9hZEFuZFNhdmUgICAgICA9IG9wdGlvbnMubG9hZEFuZFNhdmUgPT09IHVuZGVmaW5lZCA/IERFRkFVTFRfTE9BRF9BTkRfU0FWRSA6IG9wdGlvbnMubG9hZEFuZFNhdmU7XG4gICAgb3B0aW9ucy5vcGFjaXR5ICAgICAgICAgID0gb3B0aW9ucy5vcGFjaXR5ID09PSB1bmRlZmluZWQgPyBERUZBVUxUX09QQUNJVFkgOiBvcHRpb25zLm9wYWNpdHk7XG4gICAgb3B0aW9ucy5wYW5lbHNDbG9zYWJsZSAgID0gb3B0aW9ucy5wYW5lbHNDbG9zYWJsZSA9PT0gdW5kZWZpbmVkID8gREVGQVVMVF9QQU5FTFNfQ0xPU0FCTEUgOiBvcHRpb25zLnBhbmVsc0Nsb3NhYmxlO1xuICAgIG9wdGlvbnMudXNlRXh0ZXJuYWxTdHlsZSA9IG9wdGlvbnMudXNlRXh0ZXJuYWxTdHlsZSA9PT0gdW5kZWZpbmVkID8gZmFsc2UgOiBvcHRpb25zLnVzZUV4dGVybmFsU3R5bGU7XG4gICAgb3B0aW9ucy5lbmFibGUgICAgICAgICAgID0gb3B0aW9ucy5lbmFibGUgPT09IHVuZGVmaW5lZCA/IERFRkFVTFRfRU5BQkxFIDogb3B0aW9ucy5lbmFibGU7XG5cbiAgICBFdmVudERpc3BhdGNoZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgIHZhciBub2RlID0gbnVsbDtcbiAgICBpZiAoIW9wdGlvbnMucGFyZW50RG9tRWxlbWVudElkKSB7XG4gICAgICAgIG5vZGUgPSBuZXcgTm9kZSgpO1xuICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKG5vZGUuZ2V0RWxlbWVudCgpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBub2RlID0gTm9kZS5nZXROb2RlQnlJZChvcHRpb25zLnBhcmVudERvbUVsZW1lbnRJZCk7XG4gICAgfVxuXG4gICAgaWYoIW9wdGlvbnMudXNlRXh0ZXJuYWxTdHlsZSl7XG4gICAgICAgIHZhciBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG4gICAgICAgICAgICBzdHlsZS50eXBlID0gJ3RleHQvY3NzJztcbiAgICAgICAgdmFyIGNzcyA9ICFvcHRpb25zLnN0eWxlID8gcmVxdWlyZSgnLi9jb3JlL2RvY3VtZW50L1N0eWxlJykuc3RyaW5nIDogb3B0aW9ucy5zdHlsZVN0cmluZztcbiAgICAgICAgaWYoc3R5bGUuc3R5bGVzaGVldCl7XG4gICAgICAgICAgICBzdHlsZS5zdHlsZXNoZWV0LmNzc1RleHQgPSBjc3M7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzdHlsZS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3MpKTtcbiAgICAgICAgfVxuICAgICAgICAoZG9jdW1lbnQuaGVhZCB8fCBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdKS5hcHBlbmRDaGlsZChzdHlsZSk7XG4gICAgfVxuXG4gICAgbm9kZS5zZXRQcm9wZXJ0eSgnaWQnLCBDU1MuQ29udHJvbEtpdCk7XG5cbiAgICB0aGlzLl9ub2RlID0gbm9kZTtcbiAgICB0aGlzLl9wYW5lbHMgPSBbXTtcbiAgICB0aGlzLl9lbmFibGVkID0gb3B0aW9ucy5lbmFibGU7XG4gICAgdGhpcy5faGlzdG9yeUVuYWJsZWQgPSBvcHRpb25zLmhpc3Rvcnk7XG4gICAgdGhpcy5fc3RhdGVzRW5hYmxlZCA9IG9wdGlvbnMubG9hZEFuZFNhdmU7XG4gICAgdGhpcy5fcGFuZWxzQ2xvc2FibGUgPSBvcHRpb25zLnBhbmVsc0Nsb3NhYmxlO1xuXG4gICAgdmFyIGhpc3RvcnkgPSBIaXN0b3J5LnNldHVwKCk7XG5cbiAgICBpZiAoIXRoaXMuX2hpc3RvcnlFbmFibGVkKXtcbiAgICAgICAgaGlzdG9yeS5kaXNhYmxlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaGlzdG9yeS5hZGRFdmVudExpc3RlbmVyKEhpc3RvcnlFdmVudC5TVEFURV9QVVNILCB0aGlzLCAnb25IaXN0b3J5U3RhdGVQdXNoJyk7XG4gICAgICAgIGhpc3RvcnkuYWRkRXZlbnRMaXN0ZW5lcihIaXN0b3J5RXZlbnQuU1RBVEVfUE9QLCB0aGlzLCAnb25IaXN0b3J5U3RhdGVQb3AnKTtcbiAgICB9XG5cbiAgICBNb3VzZS5zZXR1cCgpO1xuICAgIFBpY2tlci5zZXR1cChub2RlKTtcbiAgICBPcHRpb25zLnNldHVwKG5vZGUpO1xuXG4gICAgdmFyIG9wYWNpdHkgPSBvcHRpb25zLm9wYWNpdHk7XG4gICAgaWYgKG9wYWNpdHkgIT0gMS4wICYmIG9wYWNpdHkgIT0gMC4wKSB7XG4gICAgICAgIG5vZGUuc2V0U3R5bGVQcm9wZXJ0eSgnb3BhY2l0eScsIG9wYWNpdHkpO1xuICAgIH1cblxuICAgIHRoaXMuX2NhblVwZGF0ZSA9IHRydWU7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgaW50ZXJ2YWwsXG4gICAgICAgIGNvdW50ID0gMCxcbiAgICAgICAgY291bnRNYXggPSAxMDtcblxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuV0lORE9XX1JFU0laRSxmdW5jdGlvbigpe1xuICAgICAgICBzZWxmLl9jYW5VcGRhdGUgPSBmYWxzZTtcbiAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG4gICAgICAgIGludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGlmKGNvdW50ID49IGNvdW50TWF4KXtcbiAgICAgICAgICAgICAgICBjb3VudCA9IDA7XG4gICAgICAgICAgICAgICAgc2VsZi5fY2FuVXBkYXRlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgIH0sMjUpXG4gICAgfSk7XG5cbiAgICB0aGlzLl9zaG9ydGN1dEVuYWJsZSA9IERFRkFVTFRfVFJJR0dFUl9TSE9SVENVVF9DSEFSO1xuXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsZnVuY3Rpb24oZSl7XG4gICAgICAgIGlmKCEoZS5jdHJsS2V5ICYmIFN0cmluZy5mcm9tQ2hhckNvZGUoZS53aGljaCB8fCBlLmtleUNvZGUpLnRvTG93ZXJDYXNlKCkgPT0gc2VsZi5fc2hvcnRjdXRFbmFibGUpKXtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBzZWxmLl9lbmFibGVkID0gIXNlbGYuX2VuYWJsZWQ7XG4gICAgICAgIGlmKHNlbGYuX2VuYWJsZWQpe1xuICAgICAgICAgICAgc2VsZi5fZW5hYmxlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzZWxmLl9kaXNhYmxlKCk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmKCF0aGlzLl9lbmFibGVkKXtcbiAgICAgICAgdGhpcy5fZGlzYWJsZSgpO1xuICAgIH1cblxuICAgIGluaXRpYXRlZCA9IHRydWU7XG59XG5Db250cm9sS2l0LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZSk7XG5Db250cm9sS2l0LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IENvbnRyb2xLaXQ7XG5cbi8qKlxuICogQWRkcyBhIHBhbmVsLlxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gUGFuZWwgb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9J0NvbnRyb2wgUGFuZWwnXSAtIFRoZSBwYW5lbCBsYWJlbFxuICogQHBhcmFtIHtOdW1iZXJ9IFtwYXJhbXMud2lkdGg9MzAwXSAtIFRoZSB3aWR0aFxuICogQHBhcmFtIHtOdW1iZXJ9IFtwYXJhbXMuaGVpZ2h0XSAtIENvbnN0cmFpbmVkIHBhbmVsIGhlaWdodFxuICogQHBhcmFtIHtOdW1iZXJ9IFtwYXJhbXMucmF0aW89NDBdIC0gVGhlIHJhdGlvIG9mIGxhYmVsIChkZWZhdWx0OjQwJSkgYW5kIGNvbXBvbmVudCAoZGVmYXVsdDo2MCUpIHdpZHRoXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy5hbGlnbj0ncmlnaHQnXSAtIEZsb2F0ICdsZWZ0JyBvciAncmlnaHQnLCBtdWx0aXBsZSBwYW5lbHMgZ2V0IGFsaWduZWQgbmV4dCB0byBlYWNoIG90aGVyXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtwYXJhbXMuZml4ZWQ9dHJ1ZV0gLSBJZiBmYWxzZSB0aGUgcGFuZWwgY2FuIGJlIG1vdmVkXG4gKiBAcGFyYW0ge0FycmF5fSBbcGFyYW1zLnBvc2l0aW9uPVswLDBdXSAtIElmIHVuZml4ZWQsIHRoZSBwYW5lbCBwYW5lbCBwb3NpdGlvbiByZWxhdGl2ZSB0byBhbGlnbm1lbnQgKGVnLiBpZiAnbGVmdCcgMCArIHBvc2l0aW9uWzBdIG9yIGlmICdyaWdodCcgd2luZG93LmlubmVySGVpZ2h0IC0gcG9zaXRpb25bMF0gLSBwYW5lbFdpZHRoKVxuICogQHBhcmFtIHtOdW1iZXJ9IFtwYXJhbXMub3BhY2l0eT0xLjBdIC0gVGhlIHBhbmVswrRzIG9wYWNpdHlcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmRvY2s9ZmFsc2VdIC0gKEV4cGVyaW1lbnRhbCkgSW5kaWNhdGVzIHdoZXRoZXIgdGhlIHBhbmVsIHNob3VsZCBiZSBkb2NrZWQgdG8gZWl0aGVyIHRoZSBsZWZ0IG9yIHJpZ2h0IHdpbmRvdyBib3JkZXIgKGRlcGVuZGluZyBvbiBwYXJhbXMuYWxpZ24pLCBkb2NrZWQgcGFuZWxzIGhlaWdodCBlcXVhbCB3aW5kb3cgaGVpZ2h0XG4gICogQHJldHVybnMge1BhbmVsfVxuICovXG5Db250cm9sS2l0LnByb3RvdHlwZS5hZGRQYW5lbCA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICB2YXIgcGFuZWwgPSBuZXcgUGFuZWwodGhpcywgcGFyYW1zKTtcbiAgICB0aGlzLl9wYW5lbHMucHVzaChwYW5lbCk7XG4gICAgcmV0dXJuIHBhbmVsO1xufTtcblxuLyoqXG4gKiBVcGRhdGVzIGFsbCBDb250cm9sS2l0IGNvbXBvbmVudHMgaWYgdGhlIHdhdFxuICovXG5Db250cm9sS2l0LnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLl9lbmFibGVkIHx8ICF0aGlzLl9jYW5VcGRhdGUpe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBpLCBqLCBrO1xuICAgIHZhciBsLCBtLCBuO1xuICAgIHZhciBwYW5lbHMgPSB0aGlzLl9wYW5lbHMsXG4gICAgICAgIHBhbmVsLFxuICAgICAgICBncm91cHMsXG4gICAgICAgIGNvbXBvbmVudHMsXG4gICAgICAgIGNvbXBvbmVudDtcblxuICAgIGkgPSAtMTsgbCA9IHBhbmVscy5sZW5ndGg7XG4gICAgd2hpbGUgKCsraSA8IGwpIHtcbiAgICAgICAgcGFuZWwgPSBwYW5lbHNbaV07XG5cbiAgICAgICAgaWYgKHBhbmVsLmlzRGlzYWJsZWQoKSl7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBncm91cHMgPSBwYW5lbC5nZXRHcm91cHMoKTtcbiAgICAgICAgaiA9IC0xOyBtID0gZ3JvdXBzLmxlbmd0aDtcblxuICAgICAgICB3aGlsZSAoKytqIDwgbSkge1xuICAgICAgICAgICAgY29tcG9uZW50cyA9IGdyb3Vwc1tqXS5nZXRDb21wb25lbnRzKCk7XG4gICAgICAgICAgICBrID0gLTE7IG4gPSBjb21wb25lbnRzLmxlbmd0aDtcblxuICAgICAgICAgICAgd2hpbGUgKCsrayA8IG4pIHtcbiAgICAgICAgICAgICAgICBjb21wb25lbnQgPSBjb21wb25lbnRzW2tdO1xuICAgICAgICAgICAgICAgIGlmIChjb21wb25lbnQuaXNEaXNhYmxlZCgpKXtcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjb21wb25lbnQgaW5zdGFuY2VvZiBWYWx1ZVBsb3R0ZXIgfHxcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50IGluc3RhbmNlb2YgU3RyaW5nT3V0cHV0IHx8XG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudCBpbnN0YW5jZW9mIE51bWJlck91dHB1dCkge1xuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQudXBkYXRlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxuQ29udHJvbEtpdC5wcm90b3R5cGUuaGlzdG9yeUlzRW5hYmxlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5faGlzdG9yeUVuYWJsZWQ7XG59O1xuXG5Db250cm9sS2l0LnByb3RvdHlwZS5zdGF0ZXNBcmVFbmFibGVkID0gZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gdGhpcy5fc3RhdGVzRW5hYmxlZDtcbn07XG5cbkNvbnRyb2xLaXQucHJvdG90eXBlLnBhbmVsc0FyZUNsb3NhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9wYW5lbHNDbG9zYWJsZTtcbn07XG5cbkNvbnRyb2xLaXQucHJvdG90eXBlLl9lbmFibGUgPSBmdW5jdGlvbigpe1xuICAgIHZhciBpID0gLTEsIHAgPSB0aGlzLl9wYW5lbHMsIGwgPSBwLmxlbmd0aDtcbiAgICB3aGlsZSAoKytpIDwgbCl7XG4gICAgICAgIHBbaV0uZW5hYmxlKCk7XG4gICAgfVxuICAgIHRoaXMuX25vZGUuc2V0U3R5bGVQcm9wZXJ0eSgndmlzaWJpbGl0eScsICcnKTtcbn07XG5cbkNvbnRyb2xLaXQucHJvdG90eXBlLl9kaXNhYmxlID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgaSA9IC0xLCBwID0gdGhpcy5fcGFuZWxzLCBsID0gcC5sZW5ndGg7XG4gICAgd2hpbGUgKCsraSA8IGwpe1xuICAgICAgICBwW2ldLmRpc2FibGUoKTtcbiAgICB9XG4gICAgdGhpcy5fbm9kZS5zZXRTdHlsZVByb3BlcnR5KCd2aXNpYmlsaXR5JywgJ2hpZGRlbicpO1xufTtcblxuLyoqXG4gKiBFbmFibGVzIGFuZCBzaG93cyBjb250cm9sS2l0LlxuICovXG5cbkNvbnRyb2xLaXQucHJvdG90eXBlLmVuYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9lbmFibGUoKTtcbiAgICB0aGlzLl9lbmFibGVkID0gdHJ1ZTtcbn07XG5cbi8qKlxuICogRGlzYWJsZSBhbmQgaGlkZXMgY29udHJvbEtpdC5cbiAqL1xuXG5Db250cm9sS2l0LnByb3RvdHlwZS5kaXNhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2Rpc2FibGUoKTtcbiAgICB0aGlzLl9lbmFibGVkID0gZmFsc2U7XG59O1xuXG5cbi8qKlxuICogU3BlY2lmaWVzIHRoZSBrZXkgdG8gYmUgdXNlZCB3aXRoIGN0cmwgJiBjaGFyLCB0byB0cmlnZ2VyIENvbnRyb2xLaXRzIHZpc2liaWxpdHkuXG4gKiBAcGFyYW0gY2hhclxuICovXG5cbkNvbnRyb2xLaXQucHJvdG90eXBlLnNldFNob3J0Y3V0RW5hYmxlID0gZnVuY3Rpb24oY2hhcil7XG4gICAgdGhpcy5fc2hvcnRjdXRFbmFibGUgPSBjaGFyO1xufTtcblxuQ29udHJvbEtpdC5wcm90b3R5cGUub25IaXN0b3J5U3RhdGVQdXNoID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIE1lbnVFdmVudC5VUERBVEVfTUVOVSwgbnVsbCkpO1xufTtcblxuQ29udHJvbEtpdC5wcm90b3R5cGUub25IaXN0b3J5U3RhdGVQb3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuVVBEQVRFX1ZBTFVFLCB7b3JpZ2luOiBudWxsfSkpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIE1lbnVFdmVudC5VUERBVEVfTUVOVSwgbnVsbCkpO1xufTtcblxuQ29udHJvbEtpdC5wcm90b3R5cGUubG9hZFNldHRpbmdzID0gZnVuY3Rpb24oZGF0YSl7XG4gICAgdmFyIGkgPSAtMSwgbCA9IGRhdGEubGVuZ3RoO1xuICAgIHZhciBwYW5lbHMgPSB0aGlzLl9wYW5lbHM7XG4gICAgd2hpbGUoKytpIDwgbCl7XG4gICAgICAgIHBhbmVsc1tpXS5zZXREYXRhKGRhdGFbaV0pO1xuICAgIH1cbn07XG5cbkNvbnRyb2xLaXQucHJvdG90eXBlLl9sb2FkU3RhdGUgPSBmdW5jdGlvbigpe1xuICAgIFN0YXRlLmxvYWQodGhpcy5sb2FkU2V0dGluZ3MuYmluZCh0aGlzKSk7XG59O1xuXG5Db250cm9sS2l0LnByb3RvdHlwZS5fc2F2ZVN0YXRlID0gZnVuY3Rpb24oKXtcbiAgICB0aGlzLnVwZGF0ZSgpOyAvL2ZvcmNlIHN5bmNcbiAgICB2YXIgcCA9IHRoaXMuX3BhbmVscywgaSA9IC0xLCBsID0gcC5sZW5ndGg7XG4gICAgdmFyIGRhdGEgPSBuZXcgQXJyYXkobCk7XG4gICAgd2hpbGUoKytpIDwgbCl7XG4gICAgICAgIGRhdGFbaV0gPSBwW2ldLmdldERhdGEoKTtcbiAgICB9XG4gICAgU3RhdGUuc2F2ZSh7ZGF0YTpkYXRhfSk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIHJvb3QgZWxlbWVudC5cbiAqIEByZXR1cm5zIHsqfVxuICovXG5cbkNvbnRyb2xLaXQucHJvdG90eXBlLmdldE5vZGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX25vZGU7XG59O1xuXG5Db250cm9sS2l0LmRlc3Ryb3kgPSBmdW5jdGlvbigpe1xuICAgIE1vdXNlLmdldCgpLmRlc3Ryb3koKTtcbiAgICBPcHRpb25zLmdldCgpLmRlc3Ryb3koKTtcbiAgICBQaWNrZXIuZ2V0KCkuZGVzdHJveSgpO1xuICAgIGluaXRpYXRlZCA9IGZhbHNlO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb250cm9sS2l0OyIsInZhciBFdmVudF8gICAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcbiAgICBOb2RlRXZlbnQgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50JyksXG4gICAgQ29tcG9uZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL0NvbXBvbmVudEV2ZW50Jyk7XG5cbnZhciBOb2RlICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKSxcbiAgICBDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jb3JlL0NvbXBvbmVudCcpO1xuXG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcblxudmFyIERFRkFVTFRfTEFCRUwgPSAnJztcblxuZnVuY3Rpb24gQnV0dG9uKHBhcmVudCxsYWJlbCxvblByZXNzLHBhcmFtcykge1xuICAgIG9uUHJlc3MgICAgICA9IG9uUHJlc3MgfHwgZnVuY3Rpb24oKXt9O1xuICAgIHBhcmFtcyAgICAgICA9IHBhcmFtcyAgICAgICB8fCB7fTtcbiAgICBwYXJhbXMubGFiZWwgPSBwYXJhbXMubGFiZWwgfHwgREVGQVVMVF9MQUJFTDtcblxuICAgIENvbXBvbmVudC5hcHBseSh0aGlzLFtwYXJlbnQscGFyYW1zLmxhYmVsXSk7XG5cbiAgICB2YXIgbm9kZSA9IG5ldyBOb2RlKE5vZGUuSU5QVVRfQlVUVE9OKTtcblxuICAgIG5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQnV0dG9uKTtcbiAgICBub2RlLnNldFByb3BlcnR5KCd2YWx1ZScsbGFiZWwpO1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIG5vZGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuT05fQ0xJQ0ssXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvblByZXNzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8oc2VsZixDb21wb25lbnRFdmVudC5WQUxVRV9VUERBVEVEKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgIHRoaXMuX3dyYXBOb2RlLmFkZENoaWxkKG5vZGUpO1xufVxuQnV0dG9uLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoQ29tcG9uZW50LnByb3RvdHlwZSk7XG5CdXR0b24ucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQnV0dG9uO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJ1dHRvbjtcbiIsInZhciBFdmVudERpc3BhdGNoZXIgICAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnREaXNwYXRjaGVyJyk7XG52YXIgT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIgPSByZXF1aXJlKCcuLi9jb3JlL09iamVjdENvbXBvbmVudE5vdGlmaWVyJyk7XG5cbnZhciBFdmVudF8gICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcbiAgICBPcHRpb25FdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvT3B0aW9uRXZlbnQnKSxcbiAgICBOb2RlRXZlbnQgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50Jyk7XG5cbnZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcblxuZnVuY3Rpb24gQnV0dG9uUHJlc2V0KHBhcmVudE5vZGUpIHtcbiAgICBFdmVudERpc3BhdGNoZXIuYXBwbHkodGhpcyk7XG4gICAgdmFyIG5vZGUgICAgPSB0aGlzLl9idG5Ob2RlID0gbmV3IE5vZGUoTm9kZS5JTlBVVF9CVVRUT04pLFxuICAgICAgICBpbWdOb2RlID0gdGhpcy5faW5kaU5vZGUgPSBuZXcgTm9kZSgpO1xuXG4gICAgdGhpcy5fb25BY3RpdmUgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICB0aGlzLl9vbkRlYWN0aXZlID0gZnVuY3Rpb24gKCkge307XG4gICAgdGhpcy5faXNBY3RpdmUgPSBmYWxzZTtcblxuICAgIG5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQnV0dG9uUHJlc2V0KTtcbiAgICBub2RlLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uTW91c2VEb3duLmJpbmQodGhpcykpO1xuXG4gICAgbm9kZS5hZGRDaGlsZChpbWdOb2RlKTtcbiAgICBwYXJlbnROb2RlLmFkZENoaWxkQXQobm9kZSwgMCk7XG5cbiAgICBPYmplY3RDb21wb25lbnROb3RpZmllci5nZXQoKS5hZGRFdmVudExpc3RlbmVyKE9wdGlvbkV2ZW50LlRSSUdHRVIsIHRoaXMsICdvbk9wdGlvblRyaWdnZXInKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoT3B0aW9uRXZlbnQuVFJJR0dFUkVELCBPYmplY3RDb21wb25lbnROb3RpZmllci5nZXQoKSwgJ29uT3B0aW9uVHJpZ2dlcmVkJyk7XG59XG5CdXR0b25QcmVzZXQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudERpc3BhdGNoZXIucHJvdG90eXBlKTtcbkJ1dHRvblByZXNldC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBCdXR0b25QcmVzZXQ7XG5cbkJ1dHRvblByZXNldC5wcm90b3R5cGUub25PcHRpb25UcmlnZ2VyID0gZnVuY3Rpb24oZSl7XG4gICAgaWYoZS5kYXRhLm9yaWdpbiA9PSB0aGlzKXtcbiAgICAgICAgaWYoIXRoaXMuX2lzQWN0aXZlKXtcbiAgICAgICAgICAgIHRoaXMuX29uQWN0aXZlKCk7XG4gICAgICAgICAgICB0aGlzLl9idG5Ob2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkJ1dHRvblByZXNldEFjdGl2ZSk7XG4gICAgICAgICAgICB0aGlzLl9pc0FjdGl2ZSA9IHRydWU7XG4gICAgICAgIH0gZWxzZXtcbiAgICAgICAgICAgIHRoaXMuX29uRGVhY3RpdmUoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYodGhpcy5faXNBY3RpdmUpe1xuICAgICAgICB0aGlzLmRlYWN0aXZhdGUoKTtcbiAgICB9XG59O1xuXG5CdXR0b25QcmVzZXQucHJvdG90eXBlLl9vbk1vdXNlRG93biA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgT3B0aW9uRXZlbnQuVFJJR0dFUkVELCBudWxsKSk7XG59O1xuXG5CdXR0b25QcmVzZXQucHJvdG90eXBlLnNldE9uQWN0aXZlID0gZnVuY3Rpb24oZnVuYyl7XG4gICAgdGhpcy5fb25BY3RpdmUgPSBmdW5jO1xufTtcblxuQnV0dG9uUHJlc2V0LnByb3RvdHlwZS5zZXRPbkRlYWN0aXZlID0gZnVuY3Rpb24oZnVuYyl7XG4gICAgdGhpcy5fb25EZWFjdGl2ZSA9IGZ1bmM7XG59O1xuXG5CdXR0b25QcmVzZXQucHJvdG90eXBlLmRlYWN0aXZhdGUgPSBmdW5jdGlvbigpe1xuICAgIHRoaXMuX2lzQWN0aXZlID0gZmFsc2U7XG4gICAgdGhpcy5fYnRuTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5CdXR0b25QcmVzZXQpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBCdXR0b25QcmVzZXQ7XG4iLCJ2YXIgQ29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY29yZS9Db21wb25lbnQnKTtcbnZhciBDU1MgICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpLFxuICAgIE1ldHJpYyAgICA9IHJlcXVpcmUoJy4vTWV0cmljJyk7XG5cbnZhciBFdmVudF8gICAgID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIEdyb3VwRXZlbnQgPSByZXF1aXJlKCcuLi9ncm91cC9Hcm91cEV2ZW50Jyk7XG5cbmZ1bmN0aW9uIENhbnZhcyhwYXJlbnQscGFyYW1zKSB7XG4gICAgQ29tcG9uZW50LmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuICAgIHZhciB3cmFwID0gdGhpcy5fd3JhcE5vZGU7XG4gICAgICAgIHdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuQ2FudmFzV3JhcCk7XG4gICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgICAgICB3cmFwLmdldEVsZW1lbnQoKS5hcHBlbmRDaGlsZChjYW52YXMpO1xuXG4gICAgdmFyIHdpZHRoID0gd3JhcC5nZXRXaWR0aCgpO1xuICAgIHRoaXMuX2NhbnZhc1dpZHRoID0gdGhpcy5fY2FudmFzSGVpZ2h0ID0gMDtcbiAgICB0aGlzLl9zZXRDYW52YXNTaXplKHdpZHRoLHdpZHRoKTtcbiAgICB0aGlzLl91cGRhdGVIZWlnaHQoKTtcblxuICAgIHRoaXMuX25vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQ2FudmFzTGlzdEl0ZW0pO1xuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UsdGhpcywgICdvbkdyb3VwU2l6ZUNoYW5nZScpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LkdST1VQX1NJWkVfVVBEQVRFLHRoaXMuX3BhcmVudCwnb25Hcm91cFNpemVVcGRhdGUnKTtcbn1cbkNhbnZhcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKENvbXBvbmVudC5wcm90b3R5cGUpO1xuQ2FudmFzLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IENhbnZhcztcblxuQ2FudmFzLnByb3RvdHlwZS5fdXBkYXRlSGVpZ2h0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW52YXNIZWlnaHQgPSB0aGlzLl9jYW52YXMuaGVpZ2h0O1xuXG4gICAgdGhpcy5fd3JhcE5vZGUuc2V0SGVpZ2h0KGNhbnZhc0hlaWdodCk7XG4gICAgdGhpcy5fbm9kZS5zZXRIZWlnaHQoY2FudmFzSGVpZ2h0ICsgTWV0cmljLlBBRERJTkdfV1JBUFBFUik7XG59O1xuXG5DYW52YXMucHJvdG90eXBlLm9uR3JvdXBTaXplQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB3aWR0aCA9IHRoaXMuX3dyYXBOb2RlLmdldFdpZHRoKCk7XG5cbiAgICB0aGlzLl9zZXRDYW52YXNTaXplKHdpZHRoLCB3aWR0aCk7XG4gICAgdGhpcy5fdXBkYXRlSGVpZ2h0KCk7XG4gICAgdGhpcy5fcmVkcmF3KCk7XG5cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBHcm91cEV2ZW50LkdST1VQX1NJWkVfVVBEQVRFLCBudWxsKSk7XG59O1xuXG5DYW52YXMucHJvdG90eXBlLl9zZXRDYW52YXNTaXplID0gZnVuY3Rpb24gKHdpZHRoLCBoZWlnaHQpIHtcbiAgICB2YXIgY2FudmFzV2lkdGggPSB0aGlzLl9jYW52YXNXaWR0aCA9IHdpZHRoLFxuICAgICAgICBjYW52YXNIZWlnaHQgPSB0aGlzLl9jYW52YXNIZWlnaHQgPSBoZWlnaHQ7XG5cbiAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzO1xuICAgICAgICBjYW52YXMuc3R5bGUud2lkdGggPSBjYW52YXNXaWR0aCArICdweCc7XG4gICAgICAgIGNhbnZhcy5zdHlsZS5oZWlnaHQgPSBjYW52YXNIZWlnaHQgKyAncHgnO1xuICAgICAgICBjYW52YXMud2lkdGggPSBjYW52YXNXaWR0aDtcbiAgICAgICAgY2FudmFzLmhlaWdodCA9IGNhbnZhc0hlaWdodDtcbn07XG5cbkNhbnZhcy5wcm90b3R5cGUuZ2V0Q2FudmFzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9jYW52YXM7XG59O1xuXG5DYW52YXMucHJvdG90eXBlLmdldENvbnRleHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYW52YXM7XG4iLCJ2YXIgT2JqZWN0Q29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY29yZS9PYmplY3RDb21wb25lbnQnKSxcbiAgICBOb2RlICAgICAgICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcblxudmFyIEV2ZW50XyAgICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIE5vZGVFdmVudCAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKSxcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKTtcblxuZnVuY3Rpb24gQ2hlY2tib3gocGFyZW50LCBvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICBPYmplY3RDb21wb25lbnQuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG4gICAgcGFyYW1zID0gcGFyYW1zIHx8IHt9O1xuICAgIHBhcmFtcy5vbkNoYW5nZSA9IHBhcmFtcy5vbkNoYW5nZSB8fCB0aGlzLl9vbkNoYW5nZTtcbiAgICB0aGlzLl9vbkNoYW5nZSA9IHBhcmFtcy5vbkNoYW5nZTtcblxuICAgIHZhciBub2RlID0gdGhpcy5faW5wdXQgPSBuZXcgTm9kZShOb2RlLklOUFVUX0NIRUNLQk9YKTtcbiAgICBub2RlLnNldFByb3BlcnR5KCdjaGVja2VkJyx0aGlzLl9vYmpbdGhpcy5fa2V5XSk7XG4gICAgbm9kZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5DSEFOR0UsdGhpcy5fb25JbnB1dENoYW5nZS5iaW5kKHRoaXMpKTtcblxuICAgIHRoaXMuX3dyYXBOb2RlLmFkZENoaWxkKHRoaXMuX2lucHV0KTtcbn1cbkNoZWNrYm94LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZSk7XG5DaGVja2JveC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBDaGVja2JveDtcblxuQ2hlY2tib3gucHJvdG90eXBlLmFwcGx5VmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5wdXNoSGlzdG9yeVN0YXRlKCk7XG5cbiAgICB2YXIgb2JqID0gdGhpcy5fb2JqLCBrZXkgPSB0aGlzLl9rZXk7XG4gICAgb2JqW2tleV0gPSAhb2JqW2tleV07XG5cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBDb21wb25lbnRFdmVudC5WQUxVRV9VUERBVEVELCBudWxsKSk7XG59O1xuXG5DaGVja2JveC5wcm90b3R5cGUuX29uSW5wdXRDaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5hcHBseVZhbHVlKCk7XG4gICAgdGhpcy5fb25DaGFuZ2UoKTtcbn07XG5cbkNoZWNrYm94LnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAoZS5kYXRhLm9yaWdpbiA9PSB0aGlzKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl9pbnB1dC5zZXRQcm9wZXJ0eSgnY2hlY2tlZCcsIHRoaXMuX29ialt0aGlzLl9rZXldKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ2hlY2tib3g7IiwidmFyIE9iamVjdENvbXBvbmVudCA9IHJlcXVpcmUoJy4vLi4vY29yZS9PYmplY3RDb21wb25lbnQnKTtcblxudmFyIE5vZGUgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xudmFyIENvbG9yTW9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvY29sb3IvQ29sb3JNb2RlJyk7XG52YXIgUGlja2VyICAgID0gcmVxdWlyZSgnLi9QaWNrZXInKTtcbnZhciBDb2xvclV0aWwgPSByZXF1aXJlKCcuLi9jb3JlL2NvbG9yL0NvbG9yVXRpbCcpO1xudmFyIE9wdGlvbnMgICA9IHJlcXVpcmUoJy4vT3B0aW9ucycpO1xudmFyIEJ1dHRvblByZXNldCA9IHJlcXVpcmUoJy4vQnV0dG9uUHJlc2V0Jyk7XG52YXIgTWV0cmljICAgICAgID0gcmVxdWlyZSgnLi9NZXRyaWMnKSxcblx0Q1NTICAgICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcblxudmFyIEV2ZW50XyAgICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuXHROb2RlRXZlbnQgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50JyksXG5cdENvbXBvbmVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9Db21wb25lbnRFdmVudCcpO1xuXG52YXIgQ29sb3JGb3JtYXRFcnJvciA9IHJlcXVpcmUoJy4uL2NvcmUvY29sb3IvQ29sb3JGb3JtYXRFcnJvcicpO1xuXG52YXIgREVGQVVMVF9DT0xPUl9NT0RFID0gQ29sb3JNb2RlLkhFWCxcblx0REVGQVVMVF9QUkVTRVRTICAgID0gbnVsbDtcblxudmFyIE1TR19DT0xPUl9GT1JNQVRfSEVYICAgICAgICAgICAgICAgICAgPSAnQ29sb3IgZm9ybWF0IHNob3VsZCBiZSBoZXguIFNldCBjb2xvck1vZGUgdG8gcmdiLCByZ2JmdiBvciBoc3YuJyxcblx0TVNHX0NPTE9SX0ZPUk1BVF9SR0JfUkdCRlZfSFNWICAgICAgICA9ICdDb2xvciBmb3JtYXQgc2hvdWxkIGJlIHJnYiwgcmdiZnYgb3IgaHN2LiBTZXQgY29sb3JNb2RlIHRvIGhleC4nLFxuXHRNU0dfQ09MT1JfUFJFU0VUX0ZPUk1BVF9IRVggICAgICAgICAgID0gJ1ByZXNldCBjb2xvciBmb3JtYXQgc2hvdWxkIGJlIGhleC4nLFxuXHRNU0dfQ09MT1JfUFJFU0VUX0ZPUk1BVF9SR0JfUkdCRlZfSFNWID0gJ1ByZXNldCBjb2xvciBmb3JtYXQgc2hvdWxkIGJlIHJnYiwgcmdiZnYgb3IgaHN2Lic7XG5cbmZ1bmN0aW9uIENvbG9yKHBhcmVudCwgb2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG5cdE9iamVjdENvbXBvbmVudC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG5cdHBhcmFtcyA9IHBhcmFtcyB8fCB7fTtcblx0cGFyYW1zLnByZXNldHMgPSBwYXJhbXMucHJlc2V0cyB8fCBERUZBVUxUX1BSRVNFVFM7XG5cdHBhcmFtcy5jb2xvck1vZGUgPSBwYXJhbXMuY29sb3JNb2RlIHx8IERFRkFVTFRfQ09MT1JfTU9ERTtcblxuXHR0aGlzLl9wcmVzZXRzS2V5ID0gcGFyYW1zLnByZXNldHM7XG5cblx0dmFyIGNvbG9yID0gdGhpcy5fY29sb3IgPSBuZXcgTm9kZSgpO1xuXHR2YWx1ZSA9IHRoaXMuX3ZhbHVlID0gdGhpcy5fb2JqW3RoaXMuX2tleV07XG5cblx0dmFyIGNvbG9yTW9kZSA9IHRoaXMuX2NvbG9yTW9kZSA9IHBhcmFtcy5jb2xvck1vZGU7XG5cblx0dGhpcy5fdmFsaWRhdGVDb2xvckZvcm1hdCh2YWx1ZSwgTVNHX0NPTE9SX0ZPUk1BVF9IRVgsIE1TR19DT0xPUl9GT1JNQVRfUkdCX1JHQkZWX0hTVik7XG5cblx0dmFyIHdyYXAgPSB0aGlzLl93cmFwTm9kZTtcblxuXHRpZiAoIXRoaXMuX3ByZXNldHNLZXkpIHtcblx0XHRjb2xvci5zZXRTdHlsZUNsYXNzKENTUy5Db2xvcik7XG5cdFx0d3JhcC5hZGRDaGlsZChjb2xvcik7XG5cdH1cblx0ZWxzZSB7XG5cdFx0Y29sb3Iuc2V0U3R5bGVDbGFzcyhDU1MuQ29sb3IpO1xuXG5cdFx0dmFyIHdyYXBfID0gbmV3IE5vZGUoKTtcblx0XHR3cmFwXy5zZXRTdHlsZUNsYXNzKENTUy5XcmFwQ29sb3JXUHJlc2V0KTtcblxuXHRcdHdyYXAuYWRkQ2hpbGQod3JhcF8pO1xuXHRcdHdyYXBfLmFkZENoaWxkKGNvbG9yKTtcblxuXHRcdHZhciBwcmVzZXRzID0gdGhpcy5fb2JqW3RoaXMuX3ByZXNldHNLZXldO1xuXG5cdFx0dmFyIGkgPSAtMTtcblx0XHR3aGlsZSAoKytpIDwgcHJlc2V0cy5sZW5ndGgpIHtcblx0XHRcdHRoaXMuX3ZhbGlkYXRlQ29sb3JGb3JtYXQocHJlc2V0c1tpXSwgTVNHX0NPTE9SX1BSRVNFVF9GT1JNQVRfSEVYLFxuXHRcdFx0XHRNU0dfQ09MT1JfUFJFU0VUX0ZPUk1BVF9SR0JfUkdCRlZfSFNWKTtcblx0XHR9XG5cblx0XHR2YXIgb3B0aW9ucyA9IE9wdGlvbnMuZ2V0KCksXG5cdFx0XHRwcmVzZXRCdG4gPSBuZXcgQnV0dG9uUHJlc2V0KHdyYXApO1xuXG5cdFx0dmFyIG9uUHJlc2V0RGVhY3RpdmF0ZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdG9wdGlvbnMuY2xlYXIoKTtcblx0XHRcdHByZXNldEJ0bi5kZWFjdGl2YXRlKCk7XG5cdFx0fTtcblxuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHR2YXIgb25QcmVzZXRBY3RpdmF0ZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdG9wdGlvbnMuYnVpbGQocHJlc2V0cyxcblx0XHRcdFx0c2VsZi5fdmFsdWUsXG5cdFx0XHRcdGNvbG9yLFxuXHRcdFx0XHRmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0c2VsZi5wdXNoSGlzdG9yeVN0YXRlKCk7XG5cdFx0XHRcdFx0c2VsZi5fdmFsdWUgPSBwcmVzZXRzW29wdGlvbnMuZ2V0U2VsZWN0ZWRJbmRleCgpXTtcblx0XHRcdFx0XHRzZWxmLmFwcGx5VmFsdWUoKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0b25QcmVzZXREZWFjdGl2YXRlLFxuXHRcdFx0XHRNZXRyaWMuUEFERElOR19QUkVTRVQsXG5cdFx0XHRcdHRydWUsXG5cdFx0XHRcdGNvbG9yTW9kZSk7XG5cdFx0fTtcblx0XHRwcmVzZXRCdG4uc2V0T25BY3RpdmUob25QcmVzZXRBY3RpdmF0ZSk7XG5cdFx0cHJlc2V0QnRuLnNldE9uRGVhY3RpdmUob25QcmVzZXREZWFjdGl2YXRlKTtcblx0fVxuXG5cdGNvbG9yLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uQ29sb3JUcmlnZ2VyLmJpbmQodGhpcykpO1xuXHR0aGlzLl91cGRhdGVDb2xvcigpO1xufVxuQ29sb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShPYmplY3RDb21wb25lbnQucHJvdG90eXBlKTtcbkNvbG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IENvbG9yO1xuXG5Db2xvci5wcm90b3R5cGUuX29uQ29sb3JUcmlnZ2VyID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgY29sb3JNb2RlID0gdGhpcy5fY29sb3JNb2RlLFxuXHRcdGNvbG9yTW9kZUhFWCA9IENvbG9yTW9kZS5IRVgsXG5cdFx0Y29sb3JNb2RlUkdCID0gQ29sb3JNb2RlLlJHQixcblx0XHRjb2xvck1vZGVSR0JmdiA9IENvbG9yTW9kZS5SR0Jmdixcblx0XHRjb2xvck1vZGVIU1YgPSBDb2xvck1vZGUuSFNWO1xuXG5cdHZhciB2YWx1ZSA9IHRoaXMuX3ZhbHVlLFxuXHRcdHRlbXA7XG5cblx0dmFyIG9uUGlja2VyUGljayA9IGZ1bmN0aW9uICgpIHtcblx0XHR0aGlzLnB1c2hIaXN0b3J5U3RhdGUoKTtcblxuXHRcdHN3aXRjaCAoY29sb3JNb2RlKSB7XG5cdFx0XHRjYXNlIGNvbG9yTW9kZUhFWDpcblx0XHRcdFx0dGhpcy5fdmFsdWUgPSBQaWNrZXIuZ2V0KCkuZ2V0SEVYKCk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSBjb2xvck1vZGVSR0I6XG5cdFx0XHRcdC8vaWYgdmFsID0gRmxvYXQzMmFycmF5IG9yIHNvXG5cdFx0XHRcdHRlbXAgPSBQaWNrZXIuZ2V0KCkuZ2V0UkdCKCk7XG5cdFx0XHRcdHZhbHVlWzBdID0gdGVtcFswXTtcblx0XHRcdFx0dmFsdWVbMV0gPSB0ZW1wWzFdO1xuXHRcdFx0XHR2YWx1ZVsyXSA9IHRlbXBbMl07XG5cdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRjYXNlIGNvbG9yTW9kZVJHQmZ2OlxuXHRcdFx0XHR0ZW1wID0gUGlja2VyLmdldCgpLmdldFJHQmZ2KCk7XG5cdFx0XHRcdHZhbHVlWzBdID0gdGVtcFswXTtcblx0XHRcdFx0dmFsdWVbMV0gPSB0ZW1wWzFdO1xuXHRcdFx0XHR2YWx1ZVsyXSA9IHRlbXBbMl07XG5cdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRjYXNlIGNvbG9yTW9kZUhTVjpcblx0XHRcdFx0dGhpcy5fdmFsdWUgPSBQaWNrZXIuZ2V0KCkuZ2V0SFNWKCk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblxuXHRcdHRoaXMuYXBwbHlWYWx1ZSgpO1xuXG5cdH0uYmluZCh0aGlzKTtcblxuXHR2YXIgcGlja2VyID0gUGlja2VyLmdldCgpO1xuXG5cdHN3aXRjaCAoY29sb3JNb2RlKSB7XG5cdFx0Y2FzZSBjb2xvck1vZGVIRVg6XG5cdFx0XHRwaWNrZXIuc2V0Q29sb3JIRVgodmFsdWUpO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSBjb2xvck1vZGVSR0I6XG5cdFx0XHRwaWNrZXIuc2V0Q29sb3JSR0IodmFsdWVbMF0sIHZhbHVlWzFdLCB2YWx1ZVsyXSk7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlIGNvbG9yTW9kZVJHQmZ2OlxuXHRcdFx0cGlja2VyLnNldENvbG9yUkdCZnYodmFsdWVbMF0sIHZhbHVlWzFdLCB2YWx1ZVsyXSk7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlIGNvbG9yTW9kZUhTVjpcblx0XHRcdHBpY2tlci5zZXRDb2xvckhTVih2YWx1ZVswXSwgdmFsdWVbMV0sIHZhbHVlWzJdKTtcblx0XHRcdGJyZWFrO1xuXHR9XG5cblx0cGlja2VyLnNldENhbGxiYWNrUGljayhvblBpY2tlclBpY2spO1xuXHRwaWNrZXIub3BlbigpO1xufTtcblxuQ29sb3IucHJvdG90eXBlLmFwcGx5VmFsdWUgPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMuX29ialt0aGlzLl9rZXldID0gdGhpcy5fdmFsdWU7XG5cdHRoaXMuX3VwZGF0ZUNvbG9yKCk7XG5cdHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIG51bGwpKTtcbn07XG5cbkNvbG9yLnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24gKGUpIHtcblx0aWYgKGUuZGF0YS5vcmlnaW4gPT0gdGhpcylyZXR1cm47XG5cdHRoaXMuX3ZhbHVlID0gdGhpcy5fb2JqW3RoaXMuX2tleV07XG5cdHRoaXMuX3VwZGF0ZUNvbG9yKCk7XG59O1xuXG5Db2xvci5wcm90b3R5cGUuX3VwZGF0ZUNvbG9yID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgY29sb3IgPSB0aGlzLl92YWx1ZSxcblx0XHRjb2xvck5vZGUgPSB0aGlzLl9jb2xvcixcblx0XHRub2RlQ29sb3I7XG5cblx0Y29sb3JOb2RlLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCBjb2xvcik7XG5cblx0c3dpdGNoICh0aGlzLl9jb2xvck1vZGUpIHtcblx0XHRjYXNlIENvbG9yTW9kZS5IRVg6XG5cdFx0XHRub2RlQ29sb3IgPSBjb2xvcjtcblx0XHRcdGJyZWFrO1xuXG5cdFx0Y2FzZSBDb2xvck1vZGUuUkdCOlxuXHRcdFx0bm9kZUNvbG9yID0gQ29sb3JVdGlsLlJHQjJIRVgoY29sb3JbMF0sIGNvbG9yWzFdLCBjb2xvclsyXSk7XG5cdFx0XHRicmVhaztcblxuXHRcdGNhc2UgQ29sb3JNb2RlLlJHQmZ2OlxuXHRcdFx0bm9kZUNvbG9yID0gQ29sb3JVdGlsLlJHQmZ2MkhFWChjb2xvclswXSwgY29sb3JbMV0sIGNvbG9yWzJdKTtcblx0XHRcdGJyZWFrO1xuXG5cdFx0Y2FzZSBDb2xvck1vZGUuSFNWOlxuXHRcdFx0bm9kZUNvbG9yID0gQ29sb3JVdGlsLkhTVjJSR0IoY29sb3JbMF0sIGNvbG9yWzFdLCBjb2xvclsyXSk7XG5cdFx0XHRicmVhaztcblx0fVxuXG5cdGNvbG9yTm9kZS5nZXRTdHlsZSgpLmJhY2tncm91bmRDb2xvciA9IG5vZGVDb2xvcjtcbn07XG5cbkNvbG9yLnByb3RvdHlwZS5fdmFsaWRhdGVDb2xvckZvcm1hdCA9IGZ1bmN0aW9uICh2YWx1ZSwgbXNnSGV4LCBtc2dBcnIpIHtcblx0dmFyIGNvbG9yTW9kZSA9IHRoaXMuX2NvbG9yTW9kZTtcblxuXHRpZiAoY29sb3JNb2RlID09IENvbG9yTW9kZS5IRVggJiYgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gJ1tvYmplY3QgQXJyYXldJyB8fFxuXHRcdGNvbG9yTW9kZSA9PSBDb2xvck1vZGUuSEVYICYmIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IEZsb2F0MzJBcnJheV0nKSB7XG5cdFx0dGhyb3cgbmV3IENvbG9yRm9ybWF0RXJyb3IobXNnSGV4KTtcblx0fVxuXHRpZiAoKGNvbG9yTW9kZSA9PSBDb2xvck1vZGUuUkdCIHx8XG5cdFx0Y29sb3JNb2RlID09IENvbG9yTW9kZS5SR0JmdiB8fFxuXHRcdGNvbG9yTW9kZSA9PSBDb2xvck1vZGUuSFNWKSAmJlxuXHRcdE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgIT09ICdbb2JqZWN0IEFycmF5XScgfHxcblx0XHRjb2xvck1vZGUgPT0gQ29sb3JNb2RlLkhTViAmJlxuXHRcdE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgIT09ICdbb2JqZWN0IEZsb2F0MzJBcnJheV0nKSB7XG5cdFx0dGhyb3cgbmV3IENvbG9yRm9ybWF0RXJyb3IobXNnQXJyKTtcblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb2xvcjsiLCJ2YXIgRnVuY3Rpb25QbG90VHlwZSA9IHtcbiAgICBJTVBMSUNJVDogJ2ltcGxpY2l0JyxcbiAgICBOT05fSU1QTElDSVQ6ICdub25JbXBsaWNpdCdcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRnVuY3Rpb25QbG90VHlwZTsiLCJ2YXIgUGxvdHRlciA9IHJlcXVpcmUoJy4vUGxvdHRlcicpO1xuXG52YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG52YXIgRnVuY3Rpb25QbG90VHlwZSA9IHJlcXVpcmUoJy4vRnVuY3Rpb25QbG90VHlwZScpO1xuXG5cbnZhciBNb3VzZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTW91c2UnKTtcbnZhciBNZXRyaWMgPSByZXF1aXJlKCcuL01ldHJpYycpO1xuXG52YXIgRG9jdW1lbnRFdmVudCAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKSxcbiAgICBOb2RlRXZlbnQgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50Jyk7XG5cbnZhciBGdW5jdGlvblBsb3R0ZXJPYmplY3RFcnJvciAgICAgICA9IHJlcXVpcmUoJy4vRnVuY3Rpb25QbG90dGVyT2JqZWN0RXJyb3InKSxcbiAgICBGdW5jdGlvblBsb3R0ZXJGdW5jdGlvbkFyZ3NFcnJvciA9IHJlcXVpcmUoJy4vRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3InKTtcblxudmFyIE9iamVjdENvbXBvbmVudE5vdGlmaWVyID0gcmVxdWlyZSgnLi4vY29yZS9PYmplY3RDb21wb25lbnROb3RpZmllcicpO1xuXG52YXIgREVGQVVMVF9TSE9XX01JTl9NQVhfTEFCRUxTID0gdHJ1ZTtcblxudmFyIERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9OT05fSU1QTElDSVRfVU5JVF9YICA9ICAxLFxuICAgIERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9OT05fSU1QTElDSVRfVU5JVF9ZICA9ICAxLFxuICAgIERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9JTVBMSUNJVF9VTklUX1ggID0gMC4yNSxcbiAgICBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfSU1QTElDSVRfVU5JVF9ZICA9IDAuMjUsXG4gICAgREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX1VOSVRfTUlOICA9IDAuMTUsXG4gICAgREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX1VOSVRfTUFYICA9IDQsXG4gICAgREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX05PTl9JTVBMSUNJVF9TQ0FMRSAgPSAxMC4wLFxuICAgIERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9JTVBMSUNJVF9TQ0FMRSA9IDEuMCxcbiAgICBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfU0NBTEVfTUlOID0gMC4wMixcbiAgICBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfU0NBTEVfTUFYID0gMjUsXG5cbiAgICBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfSU1QTElDSVRfQVhFU19DT0xPUiA9ICdyZ2JhKDI1NSwyNTUsMjU1LDAuNzUpJyxcbiAgICBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfSU1QTElDSVRfR1JJRF9DT0xPUiA9ICdyZ2JhKDI1LDI1LDI1LDAuNzUpJyxcblxuICAgIERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9OT05fSU1QTElDSVRfQVhFU19DT0xPUiA9ICdyZ2IoNTQsNjAsNjQpJyxcbiAgICBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfTk9OX0lNUExJQ0lUX0dSSURfQ09MT1IgPSAncmdiKDI1LDI1LDI1KScsXG5cbiAgICBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfQ0lSQ0xFX0xBQkVMX1JBRElVUyA9IDMsXG4gICAgREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX0NJUkNMRV9MQUJFTF9GSUxMICAgPSAncmdiKDI1NSwyNTUsMjU1KScsXG4gICAgREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX0NJUkNMRV9TVFJPS0UgICAgICAgPSAnI2IxMjMzNCc7XG5cbmZ1bmN0aW9uIEZ1bmN0aW9uUGxvdHRlcihwYXJlbnQsIG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuICAgIHBhcmFtcyA9IHBhcmFtcyB8fCB7fTtcbiAgICBwYXJhbXMuc2hvd01pbk1heExhYmVscyA9IHBhcmFtcy5zaG93TWluTWF4TGFiZWxzID09PSB1bmRlZmluZWQgPyBERUZBVUxUX1NIT1dfTUlOX01BWF9MQUJFTFMgOiBwYXJhbXMuc2hvd01pbk1heExhYmVscztcblxuICAgIFBsb3R0ZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgIGlmICh0eXBlb2Ygb2JqZWN0W3ZhbHVlXSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aHJvdyBuZXcgRnVuY3Rpb25QbG90dGVyT2JqZWN0RXJyb3Iob2JqZWN0LHZhbHVlKTtcbiAgICB9XG5cbiAgICB2YXIgZnVuY0FyZ0xlbmd0aCA9IG9iamVjdFt2YWx1ZV0ubGVuZ3RoO1xuXG4gICAgaWYgKGZ1bmNBcmdMZW5ndGggPiAyIHx8IGZ1bmNBcmdMZW5ndGggPT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3IoKTtcbiAgICB9XG5cbiAgICB2YXIgc3ZnUm9vdCA9IHRoaXMuX3N2Z1Jvb3QsXG4gICAgICAgIHBhdGggPSB0aGlzLl9wYXRoO1xuXG4gICAgdmFyIGF4ZXMgPSB0aGlzLl9heGVzID0gc3ZnUm9vdC5pbnNlcnRCZWZvcmUodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdwYXRoJyksIHBhdGgpO1xuICAgICAgICBheGVzLnN0eWxlLnN0cm9rZVdpZHRoID0gMTtcblxuICAgIHZhciBheGVzTGFiZWxzID0gdGhpcy5fYXhlc0xhYmVscyA9IHN2Z1Jvb3QuaW5zZXJ0QmVmb3JlKHRoaXMuX2NyZWF0ZVNWR09iamVjdCgncGF0aCcpLCBwYXRoKTtcbiAgICAgICAgYXhlc0xhYmVscy5zdHlsZS5zdHJva2UgPSAncmdiKDQzLDQ4LDUxKSc7XG4gICAgICAgIGF4ZXNMYWJlbHMuc3R5bGUuc3Ryb2tlV2lkdGggPSAxO1xuXG4gICAgdmFyIGdyaWQgPSB0aGlzLl9ncmlkO1xuXG4gICAgdmFyIHN2ZyA9IHRoaXMuX3N2ZyxcbiAgICAgICAgc2l6ZSA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKTtcblxuICAgIHZhciBzbGlkZXJYV3JhcCA9IG5ldyBOb2RlKCk7XG4gICAgICAgIHNsaWRlclhXcmFwLnNldFN0eWxlQ2xhc3MoQ1NTLkdyYXBoU2xpZGVyWFdyYXApO1xuXG4gICAgdmFyIHNsaWRlcllXcmFwID0gbmV3IE5vZGUoKTtcbiAgICAgICAgc2xpZGVyWVdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuR3JhcGhTbGlkZXJZV3JhcCk7XG5cbiAgICB2YXIgc2xpZGVyWFRyYWNrID0gdGhpcy5fc2xpZGVyWFRyYWNrID0gbmV3IE5vZGUoKTtcbiAgICAgICAgc2xpZGVyWFRyYWNrLnNldFN0eWxlQ2xhc3MoQ1NTLkdyYXBoU2xpZGVyWCk7XG5cbiAgICB2YXIgc2xpZGVyWVRyYWNrID0gdGhpcy5fc2xpZGVyWVRyYWNrID0gbmV3IE5vZGUoKTtcbiAgICAgICAgc2xpZGVyWVRyYWNrLnNldFN0eWxlQ2xhc3MoQ1NTLkdyYXBoU2xpZGVyWSk7XG5cbiAgICB2YXIgc2xpZGVyWEhhbmRsZSA9IHRoaXMuX3NsaWRlclhIYW5kbGUgPSBuZXcgTm9kZSgpO1xuICAgICAgICBzbGlkZXJYSGFuZGxlLnNldFN0eWxlQ2xhc3MoQ1NTLkdyYXBoU2xpZGVyWEhhbmRsZSk7XG5cbiAgICB2YXIgc2xpZGVyWUhhbmRsZSA9IHRoaXMuX3NsaWRlcllIYW5kbGUgPSBuZXcgTm9kZSgpO1xuICAgICAgICBzbGlkZXJZSGFuZGxlLnNldFN0eWxlQ2xhc3MoQ1NTLkdyYXBoU2xpZGVyWUhhbmRsZSk7XG5cbiAgICBzbGlkZXJYVHJhY2suYWRkQ2hpbGQoc2xpZGVyWEhhbmRsZSk7XG4gICAgc2xpZGVyWVRyYWNrLmFkZENoaWxkKHNsaWRlcllIYW5kbGUpO1xuICAgIHNsaWRlclhXcmFwLmFkZENoaWxkKHNsaWRlclhUcmFjayk7XG4gICAgc2xpZGVyWVdyYXAuYWRkQ2hpbGQoc2xpZGVyWVRyYWNrKTtcblxuICAgIHZhciB3cmFwTm9kZSA9IHRoaXMuX3dyYXBOb2RlO1xuXG4gICAgdmFyIHBsb3RNb2RlID0gdGhpcy5fcGxvdE1vZGUgPSBmdW5jQXJnTGVuZ3RoID09IDEgP1xuICAgICAgICBGdW5jdGlvblBsb3RUeXBlLk5PTl9JTVBMSUNJVCA6XG4gICAgICAgIEZ1bmN0aW9uUGxvdFR5cGUuSU1QTElDSVQ7XG5cbiAgICBpZiAocGxvdE1vZGUgPT0gRnVuY3Rpb25QbG90VHlwZS5JTVBMSUNJVCkge1xuICAgICAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgICAgIGNhbnZhcy5zdHlsZS53aWR0aCA9IGNhbnZhcy5zdHlsZS5oZWlnaHQgPSBzaXplICsgJ3B4JztcbiAgICAgICAgY2FudmFzLndpZHRoID0gY2FudmFzLmhlaWdodCA9IHNpemU7XG5cbiAgICAgICAgd3JhcE5vZGUuZ2V0RWxlbWVudCgpLmluc2VydEJlZm9yZShjYW52YXMsIHN2Zyk7XG5cbiAgICAgICAgdGhpcy5fY2FudmFzQ29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgICAgICB0aGlzLl9jYW52YXNJbWFnZURhdGEgPSB0aGlzLl9jYW52YXNDb250ZXh0LmdldEltYWdlRGF0YSgwLCAwLCBzaXplLCBzaXplKTtcblxuICAgICAgICBheGVzLnN0eWxlLnN0cm9rZSA9IERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9JTVBMSUNJVF9BWEVTX0NPTE9SO1xuICAgICAgICBncmlkLnN0eWxlLnN0cm9rZSA9IERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9JTVBMSUNJVF9HUklEX0NPTE9SO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgYXhlcy5zdHlsZS5zdHJva2UgPSBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfTk9OX0lNUExJQ0lUX0FYRVNfQ09MT1I7XG4gICAgICAgIGdyaWQuc3R5bGUuc3Ryb2tlID0gREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX05PTl9JTVBMSUNJVF9HUklEX0NPTE9SO1xuICAgIH1cblxuICAgIHdyYXBOb2RlLmFkZENoaWxkKHNsaWRlclhXcmFwKTtcbiAgICB3cmFwTm9kZS5hZGRDaGlsZChzbGlkZXJZV3JhcCk7XG5cbiAgICBzbGlkZXJYSGFuZGxlLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uU2xpZGVyWEhhbmRsZURvd24uYmluZCh0aGlzKSk7XG4gICAgc2xpZGVyWUhhbmRsZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLCB0aGlzLl9vblNsaWRlcllIYW5kbGVEb3duLmJpbmQodGhpcykpO1xuXG4gICAgdmFyIHVuaXRzID0gdGhpcy5fdW5pdHMgPSBbbnVsbCwgbnVsbF07XG4gICAgdGhpcy5fc2NhbGUgPSBudWxsO1xuXG4gICAgaWYgKHBsb3RNb2RlID09IEZ1bmN0aW9uUGxvdFR5cGUuTk9OX0lNUExJQ0lUKSB7XG4gICAgICAgIHVuaXRzWzBdID0gREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX05PTl9JTVBMSUNJVF9VTklUX1g7XG4gICAgICAgIHVuaXRzWzFdID0gREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX05PTl9JTVBMSUNJVF9VTklUX1k7XG5cbiAgICAgICAgdGhpcy5fc2NhbGUgPSBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfTk9OX0lNUExJQ0lUX1NDQUxFO1xuICAgIH1cbiAgICBlbHNlIGlmIChwbG90TW9kZSA9PSBGdW5jdGlvblBsb3RUeXBlLklNUExJQ0lUKSB7XG4gICAgICAgIHVuaXRzWzBdID0gREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX0lNUExJQ0lUX1VOSVRfWDtcbiAgICAgICAgdW5pdHNbMV0gPSBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfSU1QTElDSVRfVU5JVF9ZO1xuXG4gICAgICAgIHRoaXMuX3NjYWxlID0gREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX0lNUExJQ0lUX1NDQUxFO1xuICAgIH1cblxuICAgIHRoaXMuX3VuaXRzTWluTWF4ID0gW0RFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9VTklUX01JTiwgREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX1VOSVRfTUFYXTsgLy8xLzgtPjRcblxuICAgIHRoaXMuX3NjYWxlTWluTWF4ID0gW0RFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9TQ0FMRV9NSU4sIERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9TQ0FMRV9NQVhdOyAvLzEvNTAgLT4gMjVcblxuICAgIHRoaXMuX2NlbnRlciA9IFtNYXRoLnJvdW5kKHNpemUgKiAwLjUpLE1hdGgucm91bmQoc2l6ZSAqIDAuNSldO1xuICAgIHRoaXMuX3N2Z1BvcyA9IFswLCAwXTtcblxuICAgIHRoaXMuX2Z1bmMgPSBudWxsO1xuICAgIHRoaXMuc2V0RnVuY3Rpb24odGhpcy5fb2JqW3RoaXMuX2tleV0pO1xuXG4gICAgdGhpcy5fc2xpZGVyWEhhbmRsZVVwZGF0ZSgpO1xuICAgIHRoaXMuX3NsaWRlcllIYW5kbGVVcGRhdGUoKTtcblxuICAgIHN2Zy5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25EcmFnU3RhcnQuYmluZCh0aGlzKSwgZmFsc2UpO1xuICAgIHRoaXMuX3dyYXBOb2RlLmdldEVsZW1lbnQoKS5hZGRFdmVudExpc3RlbmVyKFwibW91c2V3aGVlbFwiLCB0aGlzLl9vblNjYWxlLmJpbmQodGhpcywgZmFsc2UpKTtcblxuICAgIE9iamVjdENvbXBvbmVudE5vdGlmaWVyLmdldCgpLmFkZEV2ZW50TGlzdGVuZXIoQ29tcG9uZW50RXZlbnQuVVBEQVRFX1ZBTFVFLCB0aGlzLCAnb25WYWx1ZVVwZGF0ZScpO1xufVxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUGxvdHRlci5wcm90b3R5cGUpO1xuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEZ1bmN0aW9uUGxvdHRlcjtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fdXBkYXRlQ2VudGVyID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzdmcgPSB0aGlzLl9zdmcsXG4gICAgICAgIHdpZHRoID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ3dpZHRoJykpLFxuICAgICAgICBoZWlnaHQgPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnaGVpZ2h0JykpO1xuXG4gICAgdmFyIG1vdXNlUG9zID0gTW91c2UuZ2V0KCkuZ2V0UG9zaXRpb24oKSxcbiAgICAgICAgc3ZnUG9zID0gdGhpcy5fc3ZnUG9zLFxuICAgICAgICBjZW50ZXIgPSB0aGlzLl9jZW50ZXI7XG5cbiAgICBjZW50ZXJbMF0gPSBNYXRoLm1heCgwLCBNYXRoLm1pbihtb3VzZVBvc1swXSAtIHN2Z1Bvc1swXSwgd2lkdGgpKTtcbiAgICBjZW50ZXJbMV0gPSBNYXRoLm1heCgwLCBNYXRoLm1pbihtb3VzZVBvc1sxXSAtIHN2Z1Bvc1sxXSwgaGVpZ2h0KSk7XG5cbiAgICB0aGlzLl9wbG90R3JhcGgoKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX29uRHJhZ1N0YXJ0ID0gZnVuY3Rpb24gKGUpIHtcbiAgICB2YXIgZWxlbWVudCA9IHRoaXMuX3N2ZztcblxuICAgIHZhciBzdmdQb3MgPSB0aGlzLl9zdmdQb3M7XG4gICAgc3ZnUG9zWzBdID0gMDtcbiAgICBzdmdQb3NbMV0gPSAwO1xuXG4gICAgd2hpbGUgKGVsZW1lbnQpIHtcbiAgICAgICAgc3ZnUG9zWzBdICs9IGVsZW1lbnQub2Zmc2V0TGVmdDtcbiAgICAgICAgc3ZnUG9zWzFdICs9IGVsZW1lbnQub2Zmc2V0VG9wO1xuICAgICAgICBlbGVtZW50ID0gZWxlbWVudC5vZmZzZXRQYXJlbnQ7XG4gICAgfVxuXG4gICAgdmFyIGV2ZW50TW92ZSA9IERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSxcbiAgICAgICAgZXZlbnRVcCA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XG5cbiAgICB2YXIgb25EcmFnID0gdGhpcy5fdXBkYXRlQ2VudGVyLmJpbmQodGhpcyksXG4gICAgICAgIG9uRHJhZ0VuZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuX3VwZGF0ZUNlbnRlci5iaW5kKHRoaXMpO1xuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudFVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcblxuICAgICAgICB9LmJpbmQodGhpcyk7XG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudFVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcblxuICAgIHRoaXMuX3VwZGF0ZUNlbnRlcigpO1xufTtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fb25TY2FsZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgZSA9IHdpbmRvdy5ldmVudCB8fCBlO1xuICAgIHRoaXMuX3NjYWxlICs9IE1hdGgubWF4KC0xLCBNYXRoLm1pbigxLCAoZS53aGVlbERlbHRhIHx8IC1lLmRldGFpbCkpKSAqIC0xO1xuXG4gICAgdmFyIHNjYWxlTWluTWF4ID0gdGhpcy5fc2NhbGVNaW5NYXg7XG4gICAgdGhpcy5fc2NhbGUgPSBNYXRoLm1heChzY2FsZU1pbk1heFswXSwgTWF0aC5taW4odGhpcy5fc2NhbGUsIHNjYWxlTWluTWF4WzFdKSk7XG5cbiAgICB0aGlzLl9wbG90R3JhcGgoKTtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxufTtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc2V0RnVuY3Rpb24odGhpcy5fb2JqW3RoaXMuX2tleV0pO1xufTtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fcmVkcmF3ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLl9wbG90TW9kZSA9PSBGdW5jdGlvblBsb3RUeXBlLklNUExJQ0lUKSB7XG4gICAgICAgIHZhciBzaXplID0gdGhpcy5fd3JhcE5vZGUuZ2V0V2lkdGgoKSxcbiAgICAgICAgICAgIGNhbnZhcyA9IHRoaXMuX2NhbnZhcztcblxuICAgICAgICBjYW52YXMuc3R5bGUud2lkdGggPSBjYW52YXMuc3R5bGUuaGVpZ2h0ID0gc2l6ZSArICdweCc7XG4gICAgICAgIGNhbnZhcy53aWR0aCA9IGNhbnZhcy5oZWlnaHQgPSBzaXplO1xuXG4gICAgICAgIHRoaXMuX2NhbnZhc0ltYWdlRGF0YSA9IHRoaXMuX2NhbnZhc0NvbnRleHQuZ2V0SW1hZ2VEYXRhKDAsIDAsIHNpemUsIHNpemUpO1xuICAgIH1cblxuICAgIHRoaXMuX3NsaWRlclhIYW5kbGVVcGRhdGUoKTtcbiAgICB0aGlzLl9zbGlkZXJZSGFuZGxlVXBkYXRlKCk7XG5cbiAgICB0aGlzLnNldEZ1bmN0aW9uKHRoaXMuX29ialt0aGlzLl9rZXldKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuc2V0RnVuY3Rpb24gPSBmdW5jdGlvbiAoZnVuYykge1xuICAgIHRoaXMuX2Z1bmMgPSBmdW5jLmJpbmQodGhpcy5fb2JqKTtcbiAgICB0aGlzLl9wbG90R3JhcGgoKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX3Bsb3RHcmFwaCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9kcmF3R3JpZCgpO1xuICAgIHRoaXMuX2RyYXdBeGVzKCk7XG4gICAgdGhpcy5fZHJhd1Bsb3QoKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX2RyYXdBeGVzID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzdmcgPSB0aGlzLl9zdmcsXG4gICAgICAgIHN2Z1dpZHRoID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ3dpZHRoJykpLFxuICAgICAgICBzdmdIZWlnaHQgPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnaGVpZ2h0JykpO1xuXG4gICAgdmFyIGNlbnRlciA9IHRoaXMuX2NlbnRlcixcbiAgICAgICAgY2VudGVyWCA9IGNlbnRlclswXSxcbiAgICAgICAgY2VudGVyWSA9IGNlbnRlclsxXTtcblxuICAgIHZhciBwYXRoQ21kID0gJyc7XG4gICAgcGF0aENtZCArPSB0aGlzLl9wYXRoQ21kTGluZSgwLCBjZW50ZXJZLCBzdmdXaWR0aCwgY2VudGVyWSk7XG4gICAgcGF0aENtZCArPSB0aGlzLl9wYXRoQ21kTGluZShjZW50ZXJYLCAwLCBjZW50ZXJYLCBzdmdIZWlnaHQpO1xuXG4gICAgdGhpcy5fYXhlcy5zZXRBdHRyaWJ1dGUoJ2QnLCBwYXRoQ21kKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX2RyYXdQbG90ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB3aWR0aCwgaGVpZ2h0O1xuXG4gICAgdmFyIGNlbnRlciA9IHRoaXMuX2NlbnRlcixcbiAgICAgICAgY2VudGVyWCA9IGNlbnRlclswXSxcbiAgICAgICAgY2VudGVyWSA9IGNlbnRlclsxXTtcblxuICAgIHZhciB1bml0cyA9IHRoaXMuX3VuaXRzLFxuICAgICAgICB1bml0WCwgdW5pdFk7XG5cbiAgICB2YXIgc2NhbGUgPSB0aGlzLl9zY2FsZTtcbiAgICB2YXIgbm9ybXZhbCwgc2NhbGVkVmFsLCB2YWx1ZSwgaW5kZXg7XG4gICAgdmFyIG9mZnNldFgsIG9mZnNldFk7XG5cbiAgICB2YXIgaTtcblxuICAgIGlmICh0aGlzLl9wbG90TW9kZSA9PSBGdW5jdGlvblBsb3RUeXBlLk5PTl9JTVBMSUNJVCkge1xuICAgICAgICB2YXIgc3ZnID0gdGhpcy5fc3ZnO1xuXG4gICAgICAgIHdpZHRoID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ3dpZHRoJykpO1xuICAgICAgICBoZWlnaHQgPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnaGVpZ2h0JykpO1xuICAgICAgICB1bml0WCA9IHVuaXRzWzBdICogc2NhbGU7XG4gICAgICAgIHVuaXRZID0gaGVpZ2h0IC8gKHVuaXRzWzFdICogc2NhbGUpO1xuICAgICAgICBvZmZzZXRYID0gY2VudGVyWCAvIHdpZHRoO1xuXG4gICAgICAgIHZhciBsZW4gPSBNYXRoLmZsb29yKHdpZHRoKSxcbiAgICAgICAgICAgIHBvaW50cyA9IG5ldyBBcnJheShsZW4gKiAyKTtcblxuICAgICAgICBpID0gLTE7XG4gICAgICAgIHdoaWxlICgrK2kgPCBsZW4pIHtcbiAgICAgICAgICAgIG5vcm12YWwgPSAoLW9mZnNldFggKyBpIC8gbGVuKTtcbiAgICAgICAgICAgIHNjYWxlZFZhbCA9IG5vcm12YWwgKiB1bml0WDtcbiAgICAgICAgICAgIHZhbHVlID0gY2VudGVyWSAtIHRoaXMuX2Z1bmMoc2NhbGVkVmFsKSAqIHVuaXRZO1xuXG4gICAgICAgICAgICBpbmRleCA9IGkgKiAyO1xuXG4gICAgICAgICAgICBwb2ludHNbaW5kZXhdID0gaTtcbiAgICAgICAgICAgIHBvaW50c1tpbmRleCArIDFdID0gdmFsdWU7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcGF0aENtZCA9ICcnO1xuICAgICAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRNb3ZlVG8ocG9pbnRzWzBdLCBwb2ludHNbMV0pO1xuXG4gICAgICAgIGkgPSAyO1xuICAgICAgICB3aGlsZSAoaSA8IHBvaW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHBhdGhDbWQgKz0gdGhpcy5fcGF0aENtZExpbmVUbyhwb2ludHNbaV0sIHBvaW50c1tpICsgMV0pO1xuICAgICAgICAgICAgaSArPSAyO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fcGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwYXRoQ21kKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXMsXG4gICAgICAgICAgICBjb250ZXh0ID0gdGhpcy5fY2FudmFzQ29udGV4dCxcbiAgICAgICAgICAgIGltZ0RhdGEgPSB0aGlzLl9jYW52YXNJbWFnZURhdGE7XG5cbiAgICAgICAgd2lkdGggPSBjYW52YXMud2lkdGg7XG4gICAgICAgIGhlaWdodCA9IGNhbnZhcy5oZWlnaHQ7XG5cbiAgICAgICAgdW5pdFggPSB1bml0c1swXSAqIHNjYWxlO1xuICAgICAgICB1bml0WSA9IHVuaXRzWzFdICogc2NhbGU7XG5cbiAgICAgICAgb2Zmc2V0WCA9IGNlbnRlclggLyB3aWR0aDtcbiAgICAgICAgb2Zmc2V0WSA9IGNlbnRlclkgLyBoZWlnaHQ7XG5cbiAgICAgICAgdmFyIGludldpZHRoID0gMSAvIHdpZHRoLFxuICAgICAgICAgICAgaW52SGVpZ2h0ID0gMSAvIGhlaWdodDtcbiAgICAgICAgdmFyIHJnYiA9IFswLCAwLCAwXTtcblxuICAgICAgICB2YXIgY29sMCA9IFszMCwgMzQsIDM2XSxcbiAgICAgICAgICAgIGNvbDEgPSBbMjU1LCAyNTUsIDI1NV07XG5cbiAgICAgICAgaSA9IC0xO1xuICAgICAgICB2YXIgajtcbiAgICAgICAgd2hpbGUgKCsraSA8IGhlaWdodCkge1xuICAgICAgICAgICAgaiA9IC0xO1xuXG4gICAgICAgICAgICB3aGlsZSAoKytqIDwgd2lkdGgpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXMuX2Z1bmMoKC1vZmZzZXRYICsgaiAqIGludldpZHRoKSAqIHVuaXRYLFxuICAgICAgICAgICAgICAgICAgICAoLW9mZnNldFkgKyBpICogaW52SGVpZ2h0KSAqIHVuaXRZKTtcblxuICAgICAgICAgICAgICAgIHJnYlswXSA9IE1hdGguZmxvb3IoKGNvbDFbMF0gLSBjb2wwWzBdKSAqIHZhbHVlICsgY29sMFswXSk7XG4gICAgICAgICAgICAgICAgcmdiWzFdID0gTWF0aC5mbG9vcigoY29sMVsxXSAtIGNvbDBbMV0pICogdmFsdWUgKyBjb2wwWzFdKTtcbiAgICAgICAgICAgICAgICByZ2JbMl0gPSBNYXRoLmZsb29yKChjb2wxWzJdIC0gY29sMFsyXSkgKiB2YWx1ZSArIGNvbDBbMl0pO1xuXG4gICAgICAgICAgICAgICAgaW5kZXggPSAoaSAqIHdpZHRoICsgaikgKiA0O1xuXG4gICAgICAgICAgICAgICAgaW1nRGF0YS5kYXRhW2luZGV4XSA9IHJnYlswXTtcbiAgICAgICAgICAgICAgICBpbWdEYXRhLmRhdGFbaW5kZXggKyAxXSA9IHJnYlsxXTtcbiAgICAgICAgICAgICAgICBpbWdEYXRhLmRhdGFbaW5kZXggKyAyXSA9IHJnYlsyXTtcbiAgICAgICAgICAgICAgICBpbWdEYXRhLmRhdGFbaW5kZXggKyAzXSA9IDI1NTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICBjb250ZXh0LnB1dEltYWdlRGF0YShpbWdEYXRhLCAwLCAwKTtcbiAgICB9XG59O1xuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9kcmF3R3JpZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc3ZnID0gdGhpcy5fc3ZnLFxuICAgICAgICB3aWR0aCA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKSxcbiAgICAgICAgaGVpZ2h0ID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ2hlaWdodCcpKTtcblxuICAgIHZhciBzY2FsZSA9IHRoaXMuX3NjYWxlO1xuXG4gICAgdmFyIGdyaWRSZXMgPSB0aGlzLl91bml0cyxcbiAgICAgICAgZ3JpZFNwYWNpbmdYID0gd2lkdGggLyAoZ3JpZFJlc1swXSAqIHNjYWxlKSxcbiAgICAgICAgZ3JpZFNwYWNpbmdZID0gaGVpZ2h0IC8gKGdyaWRSZXNbMV0gKiBzY2FsZSk7XG5cbiAgICB2YXIgY2VudGVyID0gdGhpcy5fY2VudGVyLFxuICAgICAgICBjZW50ZXJYID0gY2VudGVyWzBdLFxuICAgICAgICBjZW50ZXJZID0gY2VudGVyWzFdO1xuXG4gICAgdmFyIGdyaWROdW1Ub3AgPSBNYXRoLnJvdW5kKGNlbnRlclkgLyBncmlkU3BhY2luZ1kpICsgMSxcbiAgICAgICAgZ3JpZE51bUJvdHRvbSA9IE1hdGgucm91bmQoKGhlaWdodCAtIGNlbnRlclkpIC8gZ3JpZFNwYWNpbmdZKSArIDEsXG4gICAgICAgIGdyaWROdW1MZWZ0ID0gTWF0aC5yb3VuZChjZW50ZXJYIC8gZ3JpZFNwYWNpbmdYKSArIDEsXG4gICAgICAgIGdyaWROdW1SaWdodCA9IE1hdGgucm91bmQoKHdpZHRoIC0gY2VudGVyWCkgLyBncmlkU3BhY2luZ1gpICsgMTtcblxuICAgIHZhciBwYXRoQ21kR3JpZCA9ICcnLFxuICAgICAgICBwYXRoQ21kQXhlc0xhYmVscyA9ICcnO1xuXG4gICAgdmFyIGksIHRlbXA7XG5cbiAgICB2YXIgc3Ryb2tlU2l6ZSA9IE1ldHJpYy5TVFJPS0VfU0laRTtcblxuICAgIHZhciBsYWJlbFRpY2tTaXplID0gTWV0cmljLkZVTkNUSU9OX1BMT1RURVJfTEFCRUxfVElDS19TSVpFLFxuICAgICAgICBsYWJlbFRpY2tQYWRkaW5nUmlnaHQgPSB3aWR0aCAtIGxhYmVsVGlja1NpemUgLSBzdHJva2VTaXplLFxuICAgICAgICBsYWJlbFRpY2tQYWRkaW5nQm90dG9tID0gaGVpZ2h0IC0gbGFiZWxUaWNrU2l6ZSAtIHN0cm9rZVNpemUsXG4gICAgICAgIGxhYmVsVGlja1BhZGRpbmdSaWdodE9mZnNldCA9IGxhYmVsVGlja1BhZGRpbmdSaWdodCAtIGxhYmVsVGlja1NpemUsXG4gICAgICAgIGxhYmVsVGlja1BhZGRpbmdCb3R0b21PZmZzZXQgPSBsYWJlbFRpY2tQYWRkaW5nQm90dG9tIC0gbGFiZWxUaWNrU2l6ZSxcbiAgICAgICAgbGFiZWxUaWNrT2Zmc2V0UmlnaHQgPSBsYWJlbFRpY2tQYWRkaW5nUmlnaHQgLSAobGFiZWxUaWNrU2l6ZSArIHN0cm9rZVNpemUpICogMixcbiAgICAgICAgbGFiZWxUaWNrT2Zmc2V0Qm90dG9tID0gbGFiZWxUaWNrUGFkZGluZ0JvdHRvbSAtIChsYWJlbFRpY2tTaXplICsgc3Ryb2tlU2l6ZSkgKiAyO1xuXG4gICAgaSA9IC0xO1xuICAgIHdoaWxlICgrK2kgPCBncmlkTnVtVG9wKSB7XG4gICAgICAgIHRlbXAgPSBNYXRoLnJvdW5kKGNlbnRlclkgLSBncmlkU3BhY2luZ1kgKiBpKTtcbiAgICAgICAgcGF0aENtZEdyaWQgKz0gdGhpcy5fcGF0aENtZExpbmUoMCwgdGVtcCwgd2lkdGgsIHRlbXApO1xuXG4gICAgICAgIGlmICh0ZW1wID4gbGFiZWxUaWNrU2l6ZSl7XG4gICAgICAgICAgICBwYXRoQ21kQXhlc0xhYmVscyArPSB0aGlzLl9wYXRoQ21kTGluZShsYWJlbFRpY2tQYWRkaW5nUmlnaHQsIHRlbXAsXG4gICAgICAgICAgICAgICAgbGFiZWxUaWNrUGFkZGluZ1JpZ2h0T2Zmc2V0LCB0ZW1wKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGkgPSAtMTtcbiAgICB3aGlsZSAoKytpIDwgZ3JpZE51bUJvdHRvbSkge1xuICAgICAgICB0ZW1wID0gTWF0aC5yb3VuZChjZW50ZXJZICsgZ3JpZFNwYWNpbmdZICogaSk7XG4gICAgICAgIHBhdGhDbWRHcmlkICs9IHRoaXMuX3BhdGhDbWRMaW5lKDAsIHRlbXAsIHdpZHRoLCB0ZW1wKTtcblxuICAgICAgICBpZiAodGVtcCA8IGxhYmVsVGlja09mZnNldEJvdHRvbSl7XG4gICAgICAgICAgICBwYXRoQ21kQXhlc0xhYmVscyArPSB0aGlzLl9wYXRoQ21kTGluZShsYWJlbFRpY2tQYWRkaW5nUmlnaHQsIHRlbXAsXG4gICAgICAgICAgICAgICAgbGFiZWxUaWNrUGFkZGluZ1JpZ2h0T2Zmc2V0LCB0ZW1wKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGkgPSAtMTtcbiAgICB3aGlsZSAoKytpIDwgZ3JpZE51bUxlZnQpIHtcbiAgICAgICAgdGVtcCA9IE1hdGgucm91bmQoY2VudGVyWCAtIGdyaWRTcGFjaW5nWCAqIGkpO1xuICAgICAgICBwYXRoQ21kR3JpZCArPSB0aGlzLl9wYXRoQ21kTGluZSh0ZW1wLCAwLCB0ZW1wLCBoZWlnaHQpO1xuXG4gICAgICAgIGlmICh0ZW1wID4gbGFiZWxUaWNrU2l6ZSl7XG4gICAgICAgICAgICBwYXRoQ21kQXhlc0xhYmVscyArPSB0aGlzLl9wYXRoQ21kTGluZSh0ZW1wLCBsYWJlbFRpY2tQYWRkaW5nQm90dG9tLFxuICAgICAgICAgICAgICAgIHRlbXAsIGxhYmVsVGlja1BhZGRpbmdCb3R0b21PZmZzZXQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaSA9IC0xO1xuICAgIHdoaWxlICgrK2kgPCBncmlkTnVtUmlnaHQpIHtcbiAgICAgICAgdGVtcCA9IE1hdGgucm91bmQoY2VudGVyWCArIGdyaWRTcGFjaW5nWCAqIGkpO1xuICAgICAgICBwYXRoQ21kR3JpZCArPSB0aGlzLl9wYXRoQ21kTGluZSh0ZW1wLCAwLCB0ZW1wLCBoZWlnaHQpO1xuXG4gICAgICAgIGlmICh0ZW1wIDwgbGFiZWxUaWNrT2Zmc2V0UmlnaHQpe1xuICAgICAgICAgICAgcGF0aENtZEF4ZXNMYWJlbHMgKz0gdGhpcy5fcGF0aENtZExpbmUodGVtcCwgbGFiZWxUaWNrUGFkZGluZ0JvdHRvbSxcbiAgICAgICAgICAgICAgICB0ZW1wLCBsYWJlbFRpY2tQYWRkaW5nQm90dG9tT2Zmc2V0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuX2dyaWQuc2V0QXR0cmlidXRlKCdkJywgcGF0aENtZEdyaWQpO1xuICAgIHRoaXMuX2F4ZXNMYWJlbHMuc2V0QXR0cmlidXRlKCdkJywgcGF0aENtZEF4ZXNMYWJlbHMpO1xufTtcblxuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9zbGlkZXJYU3RlcCA9IGZ1bmN0aW9uIChtb3VzZVBvcykge1xuICAgIHZhciBtb3VzZVggPSBtb3VzZVBvc1swXTtcblxuICAgIHZhciBoYW5kbGUgPSB0aGlzLl9zbGlkZXJYSGFuZGxlLFxuICAgICAgICBoYW5kbGVXaWR0aCA9IGhhbmRsZS5nZXRXaWR0aCgpLFxuICAgICAgICBoYW5kbGVXaWR0aEhhbGYgPSBoYW5kbGVXaWR0aCAqIDAuNTtcblxuICAgIHZhciB0cmFjayA9IHRoaXMuX3NsaWRlclhUcmFjayxcbiAgICAgICAgdHJhY2tXaWR0aCA9IHRyYWNrLmdldFdpZHRoKCksXG4gICAgICAgIHRyYWNrTGVmdCA9IHRyYWNrLmdldFBvc2l0aW9uR2xvYmFsWCgpO1xuXG4gICAgdmFyIHN0cm9rZVNpemUgPSBNZXRyaWMuU1RST0tFX1NJWkU7XG5cbiAgICB2YXIgbWF4ID0gdHJhY2tXaWR0aCAtIGhhbmRsZVdpZHRoSGFsZiAtIHN0cm9rZVNpemUgKiAyO1xuXG4gICAgdmFyIHBvcyA9IE1hdGgubWF4KGhhbmRsZVdpZHRoSGFsZiwgTWF0aC5taW4obW91c2VYIC0gdHJhY2tMZWZ0LCBtYXgpKSxcbiAgICAgICAgaGFuZGxlUG9zID0gcG9zIC0gaGFuZGxlV2lkdGhIYWxmO1xuXG4gICAgaGFuZGxlLnNldFBvc2l0aW9uWChoYW5kbGVQb3MpO1xuXG4gICAgdmFyIHVuaXRzTWluID0gdGhpcy5fdW5pdHNNaW5NYXhbMF0sXG4gICAgICAgIHVuaXRzTWF4ID0gdGhpcy5fdW5pdHNNaW5NYXhbMV07XG5cbiAgICB2YXIgbm9ybVZhbCA9IChwb3MgLSBoYW5kbGVXaWR0aEhhbGYpIC8gKG1heCAtIGhhbmRsZVdpZHRoSGFsZiksXG4gICAgICAgIG1hcHBlZFZhbCA9IHVuaXRzTWluICsgKHVuaXRzTWF4IC0gdW5pdHNNaW4pICogbm9ybVZhbDtcblxuICAgIHRoaXMuX3VuaXRzWzBdID0gbWFwcGVkVmFsO1xuXG4gICAgdGhpcy5fcGxvdEdyYXBoKCk7XG59O1xuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9zbGlkZXJZU3RlcCA9IGZ1bmN0aW9uIChtb3VzZVBvcykge1xuICAgIHZhciBtb3VzZVkgPSBtb3VzZVBvc1sxXTtcblxuICAgIHZhciBoYW5kbGUgPSB0aGlzLl9zbGlkZXJZSGFuZGxlLFxuICAgICAgICBoYW5kbGVIZWlnaHQgPSBoYW5kbGUuZ2V0SGVpZ2h0KCksXG4gICAgICAgIGhhbmRsZUhlaWdodEhhbGYgPSBoYW5kbGVIZWlnaHQgKiAwLjU7XG5cbiAgICB2YXIgdHJhY2sgPSB0aGlzLl9zbGlkZXJZVHJhY2ssXG4gICAgICAgIHRyYWNrSGVpZ2h0ID0gdHJhY2suZ2V0SGVpZ2h0KCksXG4gICAgICAgIHRyYWNrVG9wID0gdHJhY2suZ2V0UG9zaXRpb25HbG9iYWxZKCk7XG5cbiAgICB2YXIgbWF4ID0gdHJhY2tIZWlnaHQgLSBoYW5kbGVIZWlnaHRIYWxmIC0gMjtcblxuICAgIHZhciBwb3MgPSBNYXRoLm1heChoYW5kbGVIZWlnaHRIYWxmLCBNYXRoLm1pbihtb3VzZVkgLSB0cmFja1RvcCwgbWF4KSksXG4gICAgICAgIGhhbmRsZVBvcyA9IHBvcyAtIGhhbmRsZUhlaWdodEhhbGY7XG5cbiAgICBoYW5kbGUuc2V0UG9zaXRpb25ZKGhhbmRsZVBvcyk7XG5cbiAgICB2YXIgdW5pdHNNYXggPSB0aGlzLl91bml0c01pbk1heFswXSxcbiAgICAgICAgdW5pdHNNaW4gPSB0aGlzLl91bml0c01pbk1heFsxXTtcblxuICAgIHZhciBub3JtVmFsID0gKHBvcyAtIGhhbmRsZUhlaWdodEhhbGYpIC8gKG1heCAtIGhhbmRsZUhlaWdodEhhbGYpLFxuICAgICAgICBtYXBwZWRWYWwgPSB1bml0c01pbiArICh1bml0c01heCAtIHVuaXRzTWluKSAqIG5vcm1WYWw7XG5cbiAgICB0aGlzLl91bml0c1sxXSA9IG1hcHBlZFZhbDtcblxuICAgIHRoaXMuX3Bsb3RHcmFwaCgpO1xufTtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fb25TbGlkZXJYSGFuZGxlRG93biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9vblNsaWRlckhhbmRsZURvd24odGhpcy5fc2xpZGVyWFN0ZXAuYmluZCh0aGlzKSk7XG59O1xuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9vblNsaWRlcllIYW5kbGVEb3duID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX29uU2xpZGVySGFuZGxlRG93bih0aGlzLl9zbGlkZXJZU3RlcC5iaW5kKHRoaXMpKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX29uU2xpZGVySGFuZGxlRG93biA9IGZ1bmN0aW9uIChzbGlkZXJTdGVwRnVuYykge1xuICAgIHZhciBldmVudE1vdXNlTW92ZSA9IERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSxcbiAgICAgICAgZXZlbnRNb3VzZVVwID0gRG9jdW1lbnRFdmVudC5NT1VTRV9VUDtcblxuICAgIHZhciBtb3VzZSA9IE1vdXNlLmdldCgpO1xuXG4gICAgdmFyIG9uRHJhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNsaWRlclN0ZXBGdW5jKG1vdXNlLmdldFBvc2l0aW9uKCkpXG4gICAgICAgIH0sXG4gICAgICAgIG9uRHJhZ0VuZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZU1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlVXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xuICAgICAgICB9O1xuXG4gICAgc2xpZGVyU3RlcEZ1bmMobW91c2UuZ2V0UG9zaXRpb24oKSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlVXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xufTtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fc2xpZGVyWEhhbmRsZVVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdW5pdE1pbiA9IHRoaXMuX3VuaXRzTWluTWF4WzBdLFxuICAgICAgICB1bml0TWF4ID0gdGhpcy5fdW5pdHNNaW5NYXhbMV0sXG4gICAgICAgIHVuaXRYID0gdGhpcy5fdW5pdHNbMF07XG5cbiAgICB2YXIgaGFuZGxlWCA9IHRoaXMuX3NsaWRlclhIYW5kbGUsXG4gICAgICAgIGhhbmRsZVhXaWR0aCA9IGhhbmRsZVguZ2V0V2lkdGgoKSxcbiAgICAgICAgaGFuZGxlWFdpZHRoSGFsZiA9IGhhbmRsZVhXaWR0aCAqIDAuNSxcbiAgICAgICAgdHJhY2tYV2lkdGggPSB0aGlzLl9zbGlkZXJYVHJhY2suZ2V0V2lkdGgoKTtcblxuICAgIHZhciBzdHJva2VTaXplID0gTWV0cmljLlNUUk9LRV9TSVpFO1xuXG4gICAgdmFyIGhhbmRsZVhNaW4gPSBoYW5kbGVYV2lkdGhIYWxmLFxuICAgICAgICBoYW5kbGVYTWF4ID0gdHJhY2tYV2lkdGggLSBoYW5kbGVYV2lkdGhIYWxmIC0gc3Ryb2tlU2l6ZSAqIDI7XG5cbiAgICBoYW5kbGVYLnNldFBvc2l0aW9uWCgoaGFuZGxlWE1pbiArIChoYW5kbGVYTWF4IC0gaGFuZGxlWE1pbikgKiAoKHVuaXRYIC0gdW5pdE1pbikgLyAodW5pdE1heCAtIHVuaXRNaW4pKSkgLSBoYW5kbGVYV2lkdGhIYWxmKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX3NsaWRlcllIYW5kbGVVcGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHVuaXRNaW4gPSB0aGlzLl91bml0c01pbk1heFswXSxcbiAgICAgICAgdW5pdE1heCA9IHRoaXMuX3VuaXRzTWluTWF4WzFdLFxuICAgICAgICB1bml0WSA9IHRoaXMuX3VuaXRzWzFdO1xuXG4gICAgdmFyIGhhbmRsZVkgPSB0aGlzLl9zbGlkZXJZSGFuZGxlLFxuICAgICAgICBoYW5kbGVZSGVpZ2h0ID0gaGFuZGxlWS5nZXRIZWlnaHQoKSxcbiAgICAgICAgaGFuZGxlWUhlaWdodEhhbGYgPSBoYW5kbGVZSGVpZ2h0ICogMC41LFxuICAgICAgICB0cmFja1lIZWlnaHQgPSB0aGlzLl9zbGlkZXJZVHJhY2suZ2V0SGVpZ2h0KCk7XG5cbiAgICB2YXIgc3Ryb2tlU2l6ZSA9IE1ldHJpYy5TVFJPS0VfU0laRTtcblxuICAgIHZhciBoYW5kbGVZTWluID0gdHJhY2tZSGVpZ2h0IC0gaGFuZGxlWUhlaWdodEhhbGYgLSBzdHJva2VTaXplICogMixcbiAgICAgICAgaGFuZGxlWU1heCA9IGhhbmRsZVlIZWlnaHRIYWxmO1xuXG4gICAgaGFuZGxlWS5zZXRQb3NpdGlvblkoKGhhbmRsZVlNaW4gKyAoaGFuZGxlWU1heCAtIGhhbmRsZVlNaW4pICogKCh1bml0WSAtIHVuaXRNaW4pIC8gKHVuaXRNYXggLSB1bml0TWluKSkpIC0gaGFuZGxlWUhlaWdodEhhbGYpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBGdW5jdGlvblBsb3R0ZXI7IiwiZnVuY3Rpb24gRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3IoKXtcblx0RXJyb3IuYXBwbHkodGhpcyk7XG5cdEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3IpO1xuXHR0aGlzLm5hbWUgPSAnRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3InO1xuXHR0aGlzLm1lc3NhZ2UgPSAnRnVuY3Rpb24gc2hvdWxkIGJlIG9mIGZvcm0gZih4KSBvciBmKHgseSkuJztcbn1cbkZ1bmN0aW9uUGxvdHRlckZ1bmN0aW9uQXJnc0Vycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcbkZ1bmN0aW9uUGxvdHRlckZ1bmN0aW9uQXJnc0Vycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEZ1bmN0aW9uUGxvdHRlckZ1bmN0aW9uQXJnc0Vycm9yO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZ1bmN0aW9uUGxvdHRlckZ1bmN0aW9uQXJnc0Vycm9yOyIsImZ1bmN0aW9uIEZ1bmN0aW9uUGxvdHRlck9iamVjdEVycm9yKG9iamVjdCxrZXkpe1xuXHRFcnJvci5hcHBseSh0aGlzKTtcblx0RXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcyxGdW5jdGlvblBsb3R0ZXJPYmplY3RFcnJvcik7XG5cdHRoaXMubmFtZSA9ICdDb21wb25lbnRPYmplY3RFcnJvcic7XG5cdHRoaXMubWVzc2FnZSA9ICdPYmplY3QgJyArIG9iamVjdC5jb25zdHJ1Y3Rvci5uYW1lICsgJyAnICsga2V5ICsgJ3Nob3VsZCBiZSBvZiB0eXBlIEZ1bmN0aW9uLic7XG59XG5GdW5jdGlvblBsb3R0ZXJPYmplY3RFcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVycm9yLnByb3RvdHlwZSk7XG5GdW5jdGlvblBsb3R0ZXJPYmplY3RFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBGdW5jdGlvblBsb3R0ZXJPYmplY3RFcnJvcjtcblxubW9kdWxlLmV4cG9ydHMgPSBGdW5jdGlvblBsb3R0ZXJPYmplY3RFcnJvcjsiLCJ2YXIgTWV0cmljID0ge1xuXHRDT01QT05FTlRfTUlOX0hFSUdIVDogMjUsXG5cdFNUUk9LRV9TSVpFOiAxLFxuXHRQQURESU5HX1dSQVBQRVI6IDEyLFxuXHRQQURESU5HX09QVElPTlM6IDIsXG5cdFBBRERJTkdfUFJFU0VUOiAyMCxcblxuXHRTQ1JPTExCQVJfVFJBQ0tfUEFERElORzogMixcblx0RlVOQ1RJT05fUExPVFRFUl9MQUJFTF9USUNLX1NJWkU6IDZcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTWV0cmljOyIsInZhciBPYmplY3RDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jb3JlL09iamVjdENvbXBvbmVudCcpO1xudmFyIE51bWJlcklucHV0X0ludGVybmFsID0gcmVxdWlyZSgnLi9OdW1iZXJJbnB1dF9JbnRlcm5hbCcpO1xuXG52YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xuXG52YXIgT3B0aW9ucyA9IHJlcXVpcmUoJy4vT3B0aW9ucycpO1xudmFyIEJ1dHRvblByZXNldCA9IHJlcXVpcmUoJy4vQnV0dG9uUHJlc2V0Jyk7XG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKSxcbiAgICBNZXRyaWMgPSByZXF1aXJlKCcuL01ldHJpYycpO1xuXG52YXIgRXZlbnRfID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIERvY3VtZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcbiAgICBOb2RlRXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpLFxuICAgIENvbXBvbmVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9Db21wb25lbnRFdmVudCcpO1xuXG52YXIgREVGQVVMVF9JTlBVVF9EUCAgICAgPSAyLFxuICAgIERFRkFVTFRfSU5QVVRfU1RFUCAgID0gMSxcbiAgICBERUZBVUxUX0lOUFVUX1BSRVNFVCA9IG51bGw7XG5cblxuXG5mdW5jdGlvbiBOdW1iZXJJbnB1dChwYXJlbnQsb2JqZWN0LHZhbHVlLHBhcmFtcykge1xuICAgIE9iamVjdENvbXBvbmVudC5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cbiAgICBwYXJhbXMgICAgICAgICAgPSBwYXJhbXMgfHwge307XG4gICAgcGFyYW1zLm9uQmVnaW4gID0gcGFyYW1zLm9uQmVnaW4gfHwgbnVsbDtcbiAgICBwYXJhbXMub25DaGFuZ2UgPSBwYXJhbXMub25DaGFuZ2UgfHwgdGhpcy5fb25DaGFuZ2U7XG4gICAgcGFyYW1zLm9uRmluaXNoID0gcGFyYW1zLm9uRmluaXNoIHx8IG51bGw7XG4gICAgcGFyYW1zLm9uRXJyb3IgID0gcGFyYW1zLm9uRXJyb3IgfHwgbnVsbDtcbiAgICBwYXJhbXMuZHAgICAgICAgPSAocGFyYW1zLmRwID09PSB1bmRlZmluZWQgfHwgcGFyYW1zLmRwID09IG51bGwpID8gREVGQVVMVF9JTlBVVF9EUCA6IHBhcmFtcy5kcDtcbiAgICBwYXJhbXMuc3RlcCAgICAgPSBwYXJhbXMuc3RlcCAgICAgfHwgREVGQVVMVF9JTlBVVF9TVEVQO1xuICAgIHBhcmFtcy5wcmVzZXRzICA9IHBhcmFtcy5wcmVzZXRzICB8fCBERUZBVUxUX0lOUFVUX1BSRVNFVDtcblxuICAgIHRoaXMuX29uQmVnaW4gICAgID0gcGFyYW1zLm9uQmVnaW47XG4gICAgdGhpcy5fb25DaGFuZ2UgICAgPSBwYXJhbXMub25DaGFuZ2U7XG4gICAgdGhpcy5fcHJlc2V0c0tleSAgPSBwYXJhbXMucHJlc2V0cztcblxuICAgIHZhciBpbnB1dCA9IHRoaXMuX2lucHV0ID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHBhcmFtcy5zdGVwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5kcCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMub25CZWdpbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9vbklucHV0Q2hhbmdlLmJpbmQodGhpcyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLm9uRmluaXNoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5vbkVycm9yKTtcblxuICAgIHZhciB3cmFwID0gdGhpcy5fd3JhcE5vZGU7XG5cbiAgICB2YXIgcHJlc2V0cyA9ICBwYXJhbXMucHJlc2V0cztcbiAgICBpZiAoIXByZXNldHMpIHtcbiAgICAgICAgd3JhcC5hZGRDaGlsZChpbnB1dC5nZXROb2RlKCkpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdmFyIHdyYXBfID0gbmV3IE5vZGUoKTtcbiAgICAgICAgICAgIHdyYXBfLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXBJbnB1dFdQcmVzZXQpO1xuXG4gICAgICAgIHdyYXAuYWRkQ2hpbGQod3JhcF8pO1xuICAgICAgICB3cmFwXy5hZGRDaGlsZChpbnB1dC5nZXROb2RlKCkpO1xuXG4gICAgICAgIHZhciBvcHRpb25zICAgPSBPcHRpb25zLmdldCgpO1xuICAgICAgICB2YXIgcHJlc2V0QnRuID0gdGhpcy5fYnRuUHJlc2V0ID0gbmV3IEJ1dHRvblByZXNldCh0aGlzLl93cmFwTm9kZSk7XG5cbiAgICAgICAgdmFyIG9uUHJlc2V0RGVhY3RpdmF0ZSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBvcHRpb25zLmNsZWFyKCk7XG4gICAgICAgICAgICBwcmVzZXRCdG4uZGVhY3RpdmF0ZSgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIG9uUHJlc2V0QWN0aXZhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBvcHRpb25zLmJ1aWxkKHByZXNldHMsIGlucHV0LmdldFZhbHVlKCksIGlucHV0LmdldE5vZGUoKSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlucHV0LnNldFZhbHVlKHByZXNldHNbb3B0aW9ucy5nZXRTZWxlY3RlZEluZGV4KCldKTtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5hcHBseVZhbHVlKCk7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX29uQ2hhbmdlKHNlbGYuX29ialtzZWxmLl9rZXldKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uUHJlc2V0RGVhY3RpdmF0ZSwgTWV0cmljLlBBRERJTkdfUFJFU0VULFxuICAgICAgICAgICAgICAgIGZhbHNlKTtcbiAgICAgICAgfTtcbiAgICAgICAgcHJlc2V0QnRuLnNldE9uQWN0aXZlKG9uUHJlc2V0QWN0aXZhdGUpO1xuICAgICAgICBwcmVzZXRCdG4uc2V0T25EZWFjdGl2ZShvblByZXNldERlYWN0aXZhdGUpXG4gICAgfVxuXG4gICAgaW5wdXQuZ2V0Tm9kZSgpLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sICAgdGhpcy5fb25JbnB1dERyYWdTdGFydC5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoQ29tcG9uZW50RXZlbnQuSU5QVVRfU0VMRUNUX0RSQUcsdGhpcy5fcGFyZW50LCdvbkNvbXBvbmVudFNlbGVjdERyYWcnKTtcblxuICAgIGlucHV0LnNldFZhbHVlKHRoaXMuX29ialt0aGlzLl9rZXldKTtcbn1cbk51bWJlcklucHV0LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZSk7XG5OdW1iZXJJbnB1dC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBOdW1iZXJJbnB1dDtcblxuTnVtYmVySW5wdXQucHJvdG90eXBlLl9vbklucHV0Q2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuYXBwbHlWYWx1ZSgpO1xuICAgIHRoaXMuX29uQ2hhbmdlKHRoaXMuX29ialt0aGlzLl9rZXldKTtcbn07XG5cbk51bWJlcklucHV0LnByb3RvdHlwZS5hcHBseVZhbHVlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5wdXNoSGlzdG9yeVN0YXRlKCk7XG4gICAgdGhpcy5fb2JqW3RoaXMuX2tleV0gPSB0aGlzLl9pbnB1dC5nZXRWYWx1ZSgpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCxudWxsKSk7XG59O1xuXG5OdW1iZXJJbnB1dC5wcm90b3R5cGUub25WYWx1ZVVwZGF0ZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKGUuZGF0YS5vcmlnaW4gPT0gdGhpcyl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5faW5wdXQuc2V0VmFsdWUodGhpcy5fb2JqW3RoaXMuX2tleV0pO1xufTtcblxuLy9QcmV2ZW50IGNocm9tZSBzZWxlY3QgZHJhZ1xuTnVtYmVySW5wdXQucHJvdG90eXBlLl9vbklucHV0RHJhZ1N0YXJ0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBldmVudE1vdmUgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsXG4gICAgICAgIGV2ZW50VXAgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX1VQO1xuXG4gICAgdmFyIGV2ZW50ID0gQ29tcG9uZW50RXZlbnQuSU5QVVRfU0VMRUNUX0RSQUc7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgb25EcmFnID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgZXZlbnQsIG51bGwpKTtcbiAgICAgICAgfSxcbiAgICAgICAgb25EcmFnRmluaXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgZXZlbnQsIG51bGwpKTtcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3ZlLCBvbkRyYWdGaW5pc2gsIGZhbHNlKTtcbiAgICAgICAgfTtcblxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIGV2ZW50LCBudWxsKSk7XG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudFVwLCBvbkRyYWdGaW5pc2gsIGZhbHNlKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTnVtYmVySW5wdXQ7IiwidmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnREaXNwYXRjaGVyJyksXG4gICAgTm9kZUV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKTtcbnZhciBOb2RlICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcblxudmFyIFBSRVNFVF9TSElGVF9NVUxUSVBMSUVSICA9IDEwO1xudmFyIE5VTV9SRUdFWCA9IC9eLT9cXGQqXFwuP1xcZCokLztcblxudmFyIHNldENhcmV0UG9zID0gbnVsbCxcbiAgICBzZWxlY3RBbGwgPSBudWxsO1xuXG5mdW5jdGlvbiBpbnB1dFNldFZhbHVlKGlucHV0LHZhbHVlKXtcbiAgICBpbnB1dC5zZXRQcm9wZXJ0eSgndmFsdWUnLHZhbHVlKTtcbiAgICBpbnB1dC5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgnaW5wdXQnKSk7XG59XG5cbk51bWJlcklucHV0X0ludGVybmFsID0gZnVuY3Rpb24gKHN0ZXBWYWx1ZSwgZHAsIG9uQmVnaW4sIG9uQ2hhbmdlLCBvbkZpbmlzaCwgb25FcnJvcikge1xuICAgIEV2ZW50RGlzcGF0Y2hlci5hcHBseSh0aGlzLCBudWxsKTtcblxuICAgIHRoaXMuX3ZhbHVlID0gMDtcbiAgICB0aGlzLl92YWx1ZVN0ZXAgPSBzdGVwVmFsdWU7XG4gICAgdGhpcy5fdmFsdWVEcCAgID0gZHA7XG5cbiAgICB0aGlzLl9vbkJlZ2luID0gb25CZWdpbiB8fCBmdW5jdGlvbiAoKXt9O1xuICAgIHRoaXMuX29uQ2hhbmdlID0gb25DaGFuZ2UgfHwgZnVuY3Rpb24gKCkge307XG4gICAgdGhpcy5fb25GaW5pc2ggPSBvbkZpbmlzaCB8fCBmdW5jdGlvbigpIHt9O1xuICAgIHRoaXMuX29uRXJyb3IgPSBvbkVycm9yIHx8IGZ1bmN0aW9uKCkge307XG5cbiAgICB0aGlzLl9rZXlDb2RlID0gbnVsbDtcbiAgICB0aGlzLl9jYXJldE9mZnNldCA9IDA7XG5cbiAgICB2YXIgaW5wdXQgPSB0aGlzLl9pbnB1dCA9IG5ldyBOb2RlKCd0ZXh0Jyk7XG4gICAgICAgIGlucHV0LnNldFByb3BlcnR5KCd2YWx1ZScsIHRoaXMuX3ZhbHVlKTtcblxuICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0Jyx0aGlzLl9vbklucHV0LmJpbmQodGhpcykpO1xuICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLHRoaXMuX29uS2V5ZG93bi5iaW5kKHRoaXMpKTtcblxuICAgIGlmKCFzZXRDYXJldFBvcyl7XG4gICAgICAgIGlmKGlucHV0LmdldEVsZW1lbnQoKS5zZXRTZWxlY3Rpb25SYW5nZSl7XG4gICAgICAgICAgICBzZXRDYXJldFBvcyA9IGZ1bmN0aW9uKGlucHV0LHBvcyl7XG4gICAgICAgICAgICAgICAgaW5wdXQuZ2V0RWxlbWVudCgpLnNldFNlbGVjdGlvblJhbmdlKHBvcyxwb3MpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHNlbGVjdEFsbCA9IGZ1bmN0aW9uKGlucHV0KXtcbiAgICAgICAgICAgICAgICBpbnB1dC5nZXRFbGVtZW50KCkuc2V0U2VsZWN0aW9uUmFuZ2UoMCxpbnB1dC5nZXRQcm9wZXJ0eSgndmFsdWUnKS5sZW5ndGgpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNldENhcmV0UG9zID0gZnVuY3Rpb24oaW5wdXQscG9zKXtcbiAgICAgICAgICAgICAgICB2YXIgcmFuZ2UgPSBpbnB1dC5nZXRFbGVtZW50KCkuY3JlYXRlVGV4dFJhbmdlKCk7XG4gICAgICAgICAgICAgICAgICAgIHJhbmdlLmNvbGxhcHNlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICByYW5nZS5tb3ZlRW5kKCdjaGFyYWN0ZXInLHBvcyk7XG4gICAgICAgICAgICAgICAgICAgIHJhbmdlLm1vdmVTdGFydCgnY2hhcmFjdGVyJyxwb3MpO1xuICAgICAgICAgICAgICAgICAgICByYW5nZS5zZWxlY3QoKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBzZWxlY3RBbGwgPSBmdW5jdGlvbihpbnB1dCl7XG4gICAgICAgICAgICAgICAgdmFyIHJhbmdlID0gaW5wdXQuZ2V0RWxlbWVudCgpLmNyZWF0ZVRleHRSYW5nZSgpO1xuICAgICAgICAgICAgICAgICAgICByYW5nZS5jb2xsYXBzZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2UubW92ZVN0YXJ0KCdjaGFyYWN0ZXInLDApO1xuICAgICAgICAgICAgICAgICAgICByYW5nZS5tb3ZlRW5kKCdjaGFyYWN0ZXInLGlucHV0LmdldFByb3BlcnR5KCd2YWx1ZScpLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIHJhbmdlLnNlbGVjdCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcbk51bWJlcklucHV0X0ludGVybmFsLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZSk7XG5OdW1iZXJJbnB1dF9JbnRlcm5hbC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBOdW1iZXJJbnB1dF9JbnRlcm5hbDtcblxuTnVtYmVySW5wdXRfSW50ZXJuYWwucHJvdG90eXBlLl9zZXRWYWx1ZSA9IGZ1bmN0aW9uKHZhbHVlKXtcbiAgICB2YXIgcHJlZml4ID0gICgodmFsdWUgPSArdmFsdWUpIHx8IDEgLyB2YWx1ZSkgPCAwICYmIHZhbHVlID09IDAgPyAnLScgOiAnJzsgLy8tMFxuICAgICAgICB2YWx1ZSA9IE51bWJlcih2YWx1ZSkudG9GaXhlZCh0aGlzLl92YWx1ZURwKTtcbiAgICB0aGlzLl9pbnB1dC5zZXRQcm9wZXJ0eSgndmFsdWUnLHByZWZpeCArIHZhbHVlKTtcbiAgICB0aGlzLl92YWx1ZSA9IE51bWJlcih2YWx1ZSk7XG59O1xuXG5OdW1iZXJJbnB1dF9JbnRlcm5hbC5wcm90b3R5cGUuX29uSW5wdXQgPSBmdW5jdGlvbigpe1xuICAgIHZhciBpbnB1dCA9IHRoaXMuX2lucHV0LFxuICAgICAgICB2YWx1ZSA9IGlucHV0LmdldFByb3BlcnR5KCd2YWx1ZScpLFxuICAgICAgICBzdGFydCA9IGlucHV0LmdldFByb3BlcnR5KCdzZWxlY3Rpb25TdGFydCcpLFxuICAgICAgICBkcCAgICA9IHRoaXMuX3ZhbHVlRHA7XG5cbiAgICB2YXIgZmlyc3QgPSB2YWx1ZVswXTtcblxuICAgIGlmKHZhbHVlID09ICcnKXtcbiAgICAgICAgdmFsdWUgPSAwO1xuICAgIH0gZWxzZSBpZihmaXJzdCA9PT0gJy4nKXtcbiAgICAgICAgdmFsdWUgPSAnMCcgKyB2YWx1ZTtcbiAgICB9XG5cbiAgICBpZighTlVNX1JFR0VYLnRlc3QodmFsdWUpIHx8IHZhbHVlID09ICctJyl7XG4gICAgICAgIGlucHV0LnNldFByb3BlcnR5KCd2YWx1ZScsdGhpcy5fdmFsdWUudG9GaXhlZChkcCkpO1xuICAgICAgICBzZXRDYXJldFBvcyhpbnB1dCxNYXRoLm1heCgtLXN0YXJ0LDApKTtcbiAgICAgICAgdGhpcy5fb25FcnJvcih0aGlzLl9rZXlDb2RlKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl9vbkJlZ2luKHRoaXMuX3ZhbHVlKTtcbiAgICB0aGlzLl9zZXRWYWx1ZSh2YWx1ZSk7XG4gICAgc2V0Q2FyZXRQb3MoaW5wdXQsc3RhcnQgLSB0aGlzLl9jYXJldE9mZnNldCk7XG4gICAgdGhpcy5fb25DaGFuZ2UoKTtcbn07XG5cbk51bWJlcklucHV0X0ludGVybmFsLnByb3RvdHlwZS5fb25LZXlkb3duID0gZnVuY3Rpb24oZSl7XG4gICAgdmFyIGtleUNvZGUgPSB0aGlzLl9rZXlDb2RlID0gZS5rZXlDb2RlO1xuXG4gICAgaWYoa2V5Q29kZSA9PSAxMyl7XG4gICAgICAgIHRoaXMuX29uRmluaXNoKCk7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBpbnB1dCAgPSB0aGlzLl9pbnB1dCxcbiAgICAgICAgdmFsdWUgID0gaW5wdXQuZ2V0UHJvcGVydHkoJ3ZhbHVlJyk7XG4gICAgdmFyIHN0YXJ0ICA9IGlucHV0LmdldFByb3BlcnR5KCdzZWxlY3Rpb25TdGFydCcpLFxuICAgICAgICBlbmQgICAgPSBpbnB1dC5nZXRQcm9wZXJ0eSgnc2VsZWN0aW9uRW5kJyk7XG4gICAgdmFyIGxlbmd0aCA9IHZhbHVlLmxlbmd0aDtcblxuICAgIHZhciBpc0JhY2tzcGFjZURlbGV0ZSA9IGtleUNvZGUgPT0gOCB8fCBrZXlDb2RlID09IDQ1LFxuICAgICAgICBpc01ldGFLZXkgPSBlLm1ldGFLZXksXG4gICAgICAgIGlzQ3RybEtleSA9IGUuY3RybEtleSxcbiAgICAgICAgaXNMZWZ0ID0ga2V5Q29kZSA9PSAzNyxcbiAgICAgICAgaXNSaWdodCA9IGtleUNvZGUgPT0gMzksXG4gICAgICAgIGlzTGVmdFJpZ2h0ID0gaXNMZWZ0IHx8IGlzUmlnaHQsXG4gICAgICAgIGlzU2hpZnQgPSBlLnNoaWZ0S2V5LFxuICAgICAgICBpc1VwRG93biA9IGtleUNvZGUgPT0gMzggfHwga2V5Q29kZSA9PSA0MCxcbiAgICAgICAgaXNTZWxlY3RBbGwgPSAoaXNNZXRhS2V5IHx8IGlzQ3RybEtleSkgJiYga2V5Q29kZSA9PSA2NSxcbiAgICAgICAgaXNSYW5nZVNlbGVjdGVkID0gc3RhcnQgIT0gZW5kLFxuICAgICAgICBpc0FsbFNlbGVjdGVkID0gc3RhcnQgPT0gMCAmJiBlbmQgPT0gbGVuZ3RoLFxuICAgICAgICBpc01pbnVzID0ga2V5Q29kZSA9PSAxODk7XG5cbiAgICB2YXIgaW5kZXhEZWNpbWFsTWFyayA9IHZhbHVlLmluZGV4T2YoJy4nKTtcblxuICAgIHRoaXMuX2NhcmV0T2Zmc2V0ID0gMDtcblxuICAgIC8vcHJldmVudCBjbWQteiB8fCBjdHJsLXpcbiAgICBpZigoaXNNZXRhS2V5IHx8IGlzQ3RybEtleSkgJiYga2V5Q29kZSA9PSA5MCl7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvL3NlbGVjdCBhbGwgY21kK2EgfHwgY3RybCthXG4gICAgaWYoaXNTZWxlY3RBbGwpe1xuICAgICAgICBzZWxlY3RBbGwoaW5wdXQpO1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy9ldmVyeXRoaW5nIGlzIHNlbGVjdGVkXG4gICAgaWYoaXNBbGxTZWxlY3RlZCkge1xuICAgICAgICBpZiAoaXNNaW51cykge1xuICAgICAgICAgICAgLy9zZXQgbmVnYXRpdmUgemVybywgYXMgc3RhcnRpbmcgcG9pbnQgZm9yIG5lZ2F0aXZlIG51bWJlclxuICAgICAgICAgICAgaW5wdXRTZXRWYWx1ZShpbnB1dCwgJy0wJyk7XG4gICAgICAgICAgICAvL3NldCBjYXJldCBhZnRlciAgJy0nXG4gICAgICAgICAgICBzZXRDYXJldFBvcyhpbnB1dCwgMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvL2RlbGV0ZSBudW1iZXIgLyByZXBsYWNlIC8gaWdub3JlXG4gICAgICAgICAgICBpbnB1dFNldFZhbHVlKGlucHV0LCBpc0JhY2tzcGFjZURlbGV0ZSA/IDAgOiBTdHJpbmcuZnJvbUNoYXJDb2RlKGtleUNvZGUpKTtcbiAgICAgICAgICAgIC8vanVtcCB0byBzdGFydCA8LS0+IGVuZFxuICAgICAgICAgICAgc2V0Q2FyZXRQb3MoaW5wdXQsIGlzTGVmdCA/IHN0YXJ0IDogZW5kKTtcbiAgICAgICAgfVxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy9qdW1wIG92ZXIgZGVjaW1hbCBtYXJrXG4gICAgaWYoaXNCYWNrc3BhY2VEZWxldGUgJiYgKHN0YXJ0LTEgPT0gaW5kZXhEZWNpbWFsTWFyaykpe1xuICAgICAgICBzZXRDYXJldFBvcyhpbnB1dCxzdGFydC0xKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyAwfC4gZW50ZXIgZmlyc3QgZHAgd2l0aG91dCBqdW1waW5nIG92ZXIgZGVjaW1hbCBtYXJrXG4gICAgaWYoIWlzTGVmdFJpZ2h0ICYmICh2YWx1ZVswXSA9PSAnMCcgJiYgc3RhcnQgPT0gMSkpe1xuICAgICAgICBzZXRDYXJldFBvcyhpbnB1dCwxKTtcbiAgICAgICAgdGhpcy5fY2FyZXRPZmZzZXQgPSAxO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vaW5jcmVhc2UgLyBkZWNyZWFzZSBudW1iZXIgYnkgKHN0ZXAgdXAgLyBkb3duKSAqIG11bHRpcGxpZXIgb24gc2hpZnQgZG93blxuICAgIGlmKGlzVXBEb3duKXtcbiAgICAgICAgdmFyIHN0ZXAgPSAoaXNTaGlmdCA/IFBSRVNFVF9TSElGVF9NVUxUSVBMSUVSIDogMSkgKiB0aGlzLl92YWx1ZVN0ZXAsXG4gICAgICAgICAgICBtdWx0ID0ga2V5Q29kZSA9PSAzOCA/IDEuMCA6IC0xLjA7XG4gICAgICAgIGlucHV0U2V0VmFsdWUoaW5wdXQsTnVtYmVyKHZhbHVlKSArIChzdGVwICogbXVsdCkpO1xuICAgICAgICBzZXRDYXJldFBvcyhpbnB1dCxzdGFydCk7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvL3JhbmdlIHNlbGVjdGVkLCBub3QgaW4gc2VsZWN0aW9uIHByb2Nlc3NcbiAgICBpZihpc1JhbmdlU2VsZWN0ZWQgJiYgIShpc1NoaWZ0ICYmIGlzTGVmdFJpZ2h0KSl7XG4gICAgICAgIC8vanVtcCB0byBzdGFydCA8LS0+IGVuZFxuICAgICAgICBpZihpc0xlZnRSaWdodCl7XG4gICAgICAgICAgICBzZXRDYXJldFBvcyhpbnB1dCxpc0xlZnQgPyBzdGFydCA6IGVuZCk7XG4gICAgICAgIH0gZWxzZSB7IC8vcmVwbGFjZSBjb21wbGV0ZSByYW5nZSwgbm90IGp1c3QgcGFydHNcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWUuc3Vic3RyKDAsc3RhcnQpICsgU3RyaW5nLmZyb21DaGFyQ29kZShrZXlDb2RlKSArIHZhbHVlLnN1YnN0cihlbmQsbGVuZ3RoLWVuZCk7XG4gICAgICAgICAgICBpbnB1dFNldFZhbHVlKGlucHV0LHZhbHVlKTtcbiAgICAgICAgICAgIHNldENhcmV0UG9zKGlucHV0LGVuZCk7XG4gICAgICAgIH1cbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vY2FyZXQgd2l0aGluIGZyYWN0aW9uYWwgcGFydCwgbm90IG1vdmluZyBjYXJldCwgc2VsZWN0aW5nLCBkZWxldGluZ1xuICAgIGlmKCFpc1NoaWZ0ICYmICFpc0xlZnRSaWdodCAmJiAhaXNCYWNrc3BhY2VEZWxldGUgJiYgKHN0YXJ0ID4gaW5kZXhEZWNpbWFsTWFyayAmJiBzdGFydCA8IGxlbmd0aCkpe1xuICAgICAgICB2YWx1ZSA9IHZhbHVlLnN1YnN0cigwLHN0YXJ0KSArIFN0cmluZy5mcm9tQ2hhckNvZGUoa2V5Q29kZSkgKyB2YWx1ZS5zdWJzdHIoc3RhcnQrMSxsZW5ndGgtMSk7XG4gICAgICAgIGlucHV0U2V0VmFsdWUoaW5wdXQsdmFsdWUpO1xuICAgICAgICBzZXRDYXJldFBvcyhpbnB1dCxNYXRoLm1pbihzdGFydCsxLGxlbmd0aC0xKSk7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvL2NhcmV0IGF0IGVuZCBvZiBudW1iZXIsIGRvIG5vdGhpbmdcbiAgICBpZighaXNCYWNrc3BhY2VEZWxldGUgJiYgIWlzTGVmdFJpZ2h0ICYmICFpc1VwRG93biAmJiBzdGFydCA+PSBsZW5ndGgpe1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxufTtcblxuTnVtYmVySW5wdXRfSW50ZXJuYWwucHJvdG90eXBlLmdldFZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl92YWx1ZTtcbn07XG5cbk51bWJlcklucHV0X0ludGVybmFsLnByb3RvdHlwZS5zZXRWYWx1ZSA9IGZ1bmN0aW9uIChuKSB7XG4gICAgdGhpcy5fc2V0VmFsdWUobik7XG59O1xuXG5OdW1iZXJJbnB1dF9JbnRlcm5hbC5wcm90b3R5cGUuZ2V0Tm9kZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5faW5wdXQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE51bWJlcklucHV0X0ludGVybmFsO1xuIiwidmFyIE91dHB1dCA9IHJlcXVpcmUoJy4vT3V0cHV0Jyk7XG5cbnZhciBERUZBVUxUX09VVFBVVF9EUCA9IDI7XG5cbmZ1bmN0aW9uIE51bWJlck91dHB1dChwYXJlbnQsIG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuXHRwYXJhbXMgPSBwYXJhbXMgfHwge307XG5cdHBhcmFtcy5kcCA9IHBhcmFtcy5kcCB8fCBERUZBVUxUX09VVFBVVF9EUDtcblxuXHRPdXRwdXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblx0dGhpcy5fdmFsdWVEcCA9IHBhcmFtcy5kcCArIDE7XG59XG5OdW1iZXJPdXRwdXQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShPdXRwdXQucHJvdG90eXBlKTtcbk51bWJlck91dHB1dC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBOdW1iZXJPdXRwdXQ7XG5cbi8vRklYTUVcbk51bWJlck91dHB1dC5wcm90b3R5cGUuX3NldFZhbHVlID0gZnVuY3Rpb24gKCkge1xuXHRpZiAodGhpcy5fcGFyZW50LmlzRGlzYWJsZWQoKSl7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0dmFyIHZhbHVlID0gdGhpcy5fb2JqW3RoaXMuX2tleV0sXG5cdFx0dGV4dEFyZWEgPSB0aGlzLl90ZXh0QXJlYSxcblx0XHRkcCA9IHRoaXMuX3ZhbHVlRHA7XG5cblx0dmFyIGluZGV4LFxuXHRcdG91dDtcblxuXHRpZiAodHlwZW9mKHZhbHVlKSA9PT0gJ29iamVjdCcgJiZcblx0XHR0eXBlb2YodmFsdWUubGVuZ3RoKSA9PT0gJ251bWJlcicgJiZcblx0XHR0eXBlb2YodmFsdWUuc3BsaWNlKSA9PT0gJ2Z1bmN0aW9uJyAmJlxuXHRcdCF2YWx1ZS5wcm9wZXJ0eUlzRW51bWVyYWJsZSgnbGVuZ3RoJykpIHtcblxuXHRcdG91dCA9IHZhbHVlLnNsaWNlKCk7XG5cblx0XHR2YXIgaSA9IC0xO1xuXHRcdHZhciB0ZW1wO1xuXHRcdHZhciB3cmFwID0gdGhpcy5fd3JhcDtcblxuXHRcdHdoaWxlICgrK2kgPCBvdXQubGVuZ3RoKSB7XG5cdFx0XHR0ZW1wID0gb3V0W2ldID0gb3V0W2ldLnRvU3RyaW5nKCk7XG5cdFx0XHRpbmRleCA9IHRlbXAuaW5kZXhPZignLicpO1xuXHRcdFx0aWYgKGluZGV4ID4gMCl7XG5cdFx0XHRcdG91dFtpXSA9IHRlbXAuc2xpY2UoMCwgaW5kZXggKyBkcCk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHdyYXApIHtcblx0XHRcdHRleHRBcmVhLnNldFN0eWxlUHJvcGVydHkoJ3doaXRlLXNwYWNlJywgJ25vd3JhcCcpO1xuXHRcdFx0b3V0ID0gb3V0LmpvaW4oJ1xcbicpO1xuXHRcdH1cblxuXHRcdHRleHRBcmVhLnNldFByb3BlcnR5KCd2YWx1ZScsIG91dCk7XG5cdH1lbHNlIHtcblx0XHRvdXQgPSB2YWx1ZS50b1N0cmluZygpO1xuXHRcdGluZGV4ID0gb3V0LmluZGV4T2YoJy4nKTtcblx0XHR0ZXh0QXJlYS5zZXRQcm9wZXJ0eSgndmFsdWUnLCBpbmRleCA+IDAgPyBvdXQuc2xpY2UoMCwgaW5kZXggKyBkcCkgOiBvdXQpO1xuXHR9XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTnVtYmVyT3V0cHV0OyIsInZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XG52YXIgRG9jdW1lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxuICAgIE5vZGVFdmVudCAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpO1xudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG52YXIgQ29sb3JNb2RlID0gcmVxdWlyZSgnLi4vY29yZS9jb2xvci9Db2xvck1vZGUnKTtcbnZhciBDb2xvclV0aWwgPSByZXF1aXJlKCcuLi9jb3JlL2NvbG9yL0NvbG9yVXRpbCcpO1xudmFyIE1ldHJpYyA9IHJlcXVpcmUoJy4vTWV0cmljJyk7XG5cbmZ1bmN0aW9uIE9wdGlvbnMocGFyZW50Tm9kZSkge1xuICAgIHRoaXMuX3BhcmVuTm9kZSA9IHBhcmVudE5vZGU7XG5cbiAgICB2YXIgbm9kZSA9IHRoaXMuX25vZGUgPSBuZXcgTm9kZSgpO1xuICAgIHZhciBsaXN0Tm9kZSA9IHRoaXMuX2xpc3ROb2RlID0gbmV3IE5vZGUoTm9kZS5MSVNUKTtcblxuICAgIG5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuT3B0aW9ucyk7XG4gICAgbm9kZS5hZGRDaGlsZChsaXN0Tm9kZSk7XG5cbiAgICB0aGlzLl9zZWxlY3RlZEluZGV4ID0gbnVsbDtcbiAgICB0aGlzLl9jYWxsYmFja091dCA9IGZ1bmN0aW9uICgpIHsgfTtcblxuICAgIHRoaXMuX3VuZm9jdXNhYmxlID0gZmFsc2U7XG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25Eb2N1bWVudE1vdXNlRG93bi5iaW5kKHRoaXMpKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfVVAsIHRoaXMuX29uRG9jdW1lbnRNb3VzZVVwLmJpbmQodGhpcykpO1xuXG4gICAgdGhpcy5jbGVhcigpO1xufVxuXG5PcHRpb25zLnByb3RvdHlwZSA9IHtcbiAgICBfb25Eb2N1bWVudE1vdXNlRG93bjogZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIXRoaXMuX3VuZm9jdXNhYmxlKXJldHVybjtcbiAgICAgICAgdGhpcy5fY2FsbGJhY2tPdXQoKTtcbiAgICB9LFxuXG4gICAgX29uRG9jdW1lbnRNb3VzZVVwOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3VuZm9jdXNhYmxlID0gdHJ1ZTtcbiAgICB9LFxuXG4gICAgYnVpbGQ6IGZ1bmN0aW9uIChlbnRyaWVzLCBzZWxlY3RlZCwgZWxlbWVudCwgY2FsbGJhY2tTZWxlY3QsIGNhbGxiYWNrT3V0LCBwYWRkaW5nUmlnaHQsIGFyZUNvbG9ycywgY29sb3JNb2RlKSB7XG4gICAgICAgIHRoaXMuX2NsZWFyTGlzdCgpO1xuXG4gICAgICAgIHRoaXMuX3BhcmVuTm9kZS5hZGRDaGlsZCh0aGlzLmdldE5vZGUoKSk7XG5cbiAgICAgICAgdmFyIHJvb3ROb2RlID0gdGhpcy5fbm9kZSxcbiAgICAgICAgICAgIGxpc3ROb2RlID0gdGhpcy5fbGlzdE5vZGU7XG5cbiAgICAgICAgcGFkZGluZ1JpZ2h0ID0gcGFkZGluZ1JpZ2h0IHx8IDA7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIC8vIGJ1aWxkIGxpc3RcbiAgICAgICAgdmFyIGl0ZW1Ob2RlLCBlbnRyeTtcbiAgICAgICAgdmFyIGkgPSAtMTtcblxuICAgICAgICBpZiAoYXJlQ29sb3JzKSB7XG4gICAgICAgICAgICBjb2xvck1vZGUgPSBjb2xvck1vZGUgfHwgQ29sb3JNb2RlLkhFWDtcblxuICAgICAgICAgICAgbGlzdE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQ29sb3IpO1xuXG4gICAgICAgICAgICB2YXIgY29sb3IsIG5vZGVDb2xvcjtcblxuICAgICAgICAgICAgd2hpbGUgKCsraSA8IGVudHJpZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgZW50cnkgPSBlbnRyaWVzW2ldO1xuICAgICAgICAgICAgICAgIGl0ZW1Ob2RlID0gbGlzdE5vZGUuYWRkQ2hpbGQobmV3IE5vZGUoTm9kZS5MSVNUX0lURU0pKTtcbiAgICAgICAgICAgICAgICBjb2xvciA9IGl0ZW1Ob2RlLmFkZENoaWxkKG5ldyBOb2RlKCkpO1xuXG4gICAgICAgICAgICAgICAgc3dpdGNoIChjb2xvck1vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBDb2xvck1vZGUuSEVYOlxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZUNvbG9yID0gZW50cnk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBDb2xvck1vZGUuUkdCOlxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZUNvbG9yID0gQ29sb3JVdGlsLlJHQjJIRVgoZW50cnlbMF0sIGVudHJ5WzFdLCBlbnRyeVsyXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBDb2xvck1vZGUuUkdCZnY6XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlQ29sb3IgPSBDb2xvclV0aWwuUkdCZnYySEVYKGVudHJ5WzBdLCBlbnRyeVsxXSwgZW50cnlbMl0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgQ29sb3JNb2RlLkhTVjpcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVDb2xvciA9IENvbG9yVXRpbC5IU1YyUkdCKGVudHJ5WzBdLCBlbnRyeVsxXSwgZW50cnlbMl0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29sb3IuZ2V0U3R5bGUoKS5iYWNrZ3JvdW5kQ29sb3IgPSBub2RlQ29sb3I7XG4gICAgICAgICAgICAgICAgY29sb3IuZ2V0U3R5bGUoKS5iYWNrZ3JvdW5kSW1hZ2UgPSAnbGluZWFyLWdyYWRpZW50KCByZ2JhKDAsMCwwLDApIDAlLCByZ2JhKDAsMCwwLDAuMSkgMTAwJSknO1xuICAgICAgICAgICAgICAgIGNvbG9yLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCBlbnRyeSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoZW50cnkgPT0gc2VsZWN0ZWQpaXRlbU5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuT3B0aW9uc1NlbGVjdGVkKTtcblxuICAgICAgICAgICAgICAgIGl0ZW1Ob2RlLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3NlbGVjdGVkSW5kZXggPSBBcnJheS5wcm90b3R5cGUuaW5kZXhPZi5jYWxsKHRoaXMucGFyZW50Tm9kZS5jaGlsZHJlbiwgdGhpcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFja1NlbGVjdCgpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbGlzdE5vZGUuZGVsZXRlU3R5bGVDbGFzcygpO1xuXG4gICAgICAgICAgICB3aGlsZSAoKytpIDwgZW50cmllcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBlbnRyeSA9IGVudHJpZXNbaV07XG5cbiAgICAgICAgICAgICAgICBpdGVtTm9kZSA9IGxpc3ROb2RlLmFkZENoaWxkKG5ldyBOb2RlKE5vZGUuTElTVF9JVEVNKSk7XG4gICAgICAgICAgICAgICAgaXRlbU5vZGUuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsIGVudHJ5KTtcbiAgICAgICAgICAgICAgICBpZiAoZW50cnkgPT0gc2VsZWN0ZWQpaXRlbU5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuT3B0aW9uc1NlbGVjdGVkKTtcblxuICAgICAgICAgICAgICAgIGl0ZW1Ob2RlLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3NlbGVjdGVkSW5kZXggPSBBcnJheS5wcm90b3R5cGUuaW5kZXhPZi5jYWxsKHRoaXMucGFyZW50Tm9kZS5jaGlsZHJlbiwgdGhpcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFja1NlbGVjdCgpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vcG9zaXRpb24sIHNldCB3aWR0aCBhbmQgZW5hYmxlXG5cbiAgICAgICAgdmFyIGVsZW1lbnRQb3MgPSBlbGVtZW50LmdldFBvc2l0aW9uR2xvYmFsKCksXG4gICAgICAgICAgICBlbGVtZW50V2lkdGggPSBlbGVtZW50LmdldFdpZHRoKCkgLSBwYWRkaW5nUmlnaHQsXG4gICAgICAgICAgICBlbGVtZW50SGVpZ2h0ID0gZWxlbWVudC5nZXRIZWlnaHQoKTtcblxuICAgICAgICB2YXIgbGlzdFdpZHRoID0gbGlzdE5vZGUuZ2V0V2lkdGgoKSxcbiAgICAgICAgICAgIGxpc3RIZWlnaHQgPSBsaXN0Tm9kZS5nZXRIZWlnaHQoKSxcbiAgICAgICAgICAgIHN0cm9rZU9mZnNldCA9IE1ldHJpYy5TVFJPS0VfU0laRSAqIDI7XG5cbiAgICAgICAgdmFyIHBhZGRpbmdPcHRpb25zID0gTWV0cmljLlBBRERJTkdfT1BUSU9OUztcblxuICAgICAgICB2YXIgd2lkdGggPSAobGlzdFdpZHRoIDwgZWxlbWVudFdpZHRoID8gZWxlbWVudFdpZHRoIDogbGlzdFdpZHRoKSAtIHN0cm9rZU9mZnNldCxcbiAgICAgICAgICAgIHBvc1ggPSBlbGVtZW50UG9zWzBdLFxuICAgICAgICAgICAgcG9zWSA9IGVsZW1lbnRQb3NbMV0gKyBlbGVtZW50SGVpZ2h0IC0gcGFkZGluZ09wdGlvbnM7XG5cbiAgICAgICAgdmFyIHdpbmRvd1dpZHRoID0gd2luZG93LmlubmVyV2lkdGgsXG4gICAgICAgICAgICB3aW5kb3dIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG5cbiAgICAgICAgdmFyIHJvb3RQb3NYID0gKHBvc1ggKyB3aWR0aCkgPiB3aW5kb3dXaWR0aCA/IChwb3NYIC0gd2lkdGggKyBlbGVtZW50V2lkdGggLSBzdHJva2VPZmZzZXQpIDogcG9zWCxcbiAgICAgICAgICAgIHJvb3RQb3NZID0gKHBvc1kgKyBsaXN0SGVpZ2h0KSA+IHdpbmRvd0hlaWdodCA/IChwb3NZIC0gbGlzdEhlaWdodCAqIDAuNSAtIGVsZW1lbnRIZWlnaHQgKiAwLjUpIDogcG9zWTtcblxuICAgICAgICBsaXN0Tm9kZS5zZXRXaWR0aCh3aWR0aCk7XG4gICAgICAgIHJvb3ROb2RlLnNldFBvc2l0aW9uR2xvYmFsKHJvb3RQb3NYLCByb290UG9zWSk7XG5cbiAgICAgICAgdGhpcy5fY2FsbGJhY2tPdXQgPSBjYWxsYmFja091dDtcbiAgICAgICAgdGhpcy5fdW5mb2N1c2FibGUgPSBmYWxzZTtcbiAgICB9LFxuXG4gICAgX2NsZWFyTGlzdDogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9saXN0Tm9kZS5yZW1vdmVBbGxDaGlsZHJlbigpO1xuICAgICAgICB0aGlzLl9saXN0Tm9kZS5kZWxldGVTdHlsZVByb3BlcnR5KCd3aWR0aCcpO1xuICAgICAgICB0aGlzLl9zZWxlY3RlZEluZGV4ID0gbnVsbDtcbiAgICAgICAgdGhpcy5fYnVpbGQgPSBmYWxzZTtcbiAgICB9LFxuXG4gICAgY2xlYXI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fY2xlYXJMaXN0KCk7XG4gICAgICAgIHRoaXMuX2NhbGxiYWNrT3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLl9wYXJlbk5vZGUucmVtb3ZlQ2hpbGQodGhpcy5nZXROb2RlKCkpO1xuXG4gICAgfSxcblxuICAgIGlzQnVpbGQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2J1aWxkO1xuICAgIH0sXG4gICAgZ2V0Tm9kZTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbm9kZTtcbiAgICB9LFxuICAgIGdldFNlbGVjdGVkSW5kZXg6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NlbGVjdGVkSW5kZXg7XG4gICAgfVxufTtcblxuT3B0aW9ucy5zZXR1cCA9IGZ1bmN0aW9uKHBhcmVudE5vZGUpe3JldHVybiBPcHRpb25zLl9pbnN0YW5jZSA9IG5ldyBPcHRpb25zKHBhcmVudE5vZGUpO307XG5PcHRpb25zLmdldCAgID0gZnVuY3Rpb24oKXtyZXR1cm4gT3B0aW9ucy5faW5zdGFuY2U7fTtcbk9wdGlvbnMuZGVzdHJveSA9IGZ1bmN0aW9uKCl7T3B0aW9ucy5faW5zdGFuY2UgPSBudWxsO307XG5cbm1vZHVsZS5leHBvcnRzID0gT3B0aW9uczsiLCJ2YXIgT2JqZWN0Q29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY29yZS9PYmplY3RDb21wb25lbnQnKTtcbnZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XG5cbnZhciBDU1MgICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xudmFyIE1ldHJpYyAgICA9IHJlcXVpcmUoJy4vTWV0cmljJyk7XG52YXIgU2Nyb2xsQmFyID0gcmVxdWlyZSgnLi4vY29yZS9sYXlvdXQvU2Nyb2xsQmFyJyk7XG5cbnZhciBFdmVudF8gICAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcbiAgICBEb2N1bWVudEV2ZW50ICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxuICAgIE5vZGVFdmVudCAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKSxcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKTtcblxudmFyIERFRkFVTFRfSEVJR0hUID0gbnVsbCxcbiAgICBERUZBVUxUX1dSQVAgICA9IGZhbHNlLFxuICAgIERFRkFVTFRfVVBEQVRFID0gdHJ1ZTtcblxuZnVuY3Rpb24gT3V0cHV0KHBhcmVudCxvYmplY3QsdmFsdWUscGFyYW1zKSB7XG4gICAgT2JqZWN0Q29tcG9uZW50LmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuICAgIHBhcmFtcyAgICAgICAgPSBwYXJhbXMgICAgICAgIHx8IHt9O1xuICAgIHBhcmFtcy5oZWlnaHQgPSBwYXJhbXMuaGVpZ2h0IHx8IERFRkFVTFRfSEVJR0hUO1xuICAgIHBhcmFtcy53cmFwICAgPSBwYXJhbXMud3JhcCAgID09PSB1bmRlZmluZWQgPyBERUZBVUxUX1dSQVAgOiBwYXJhbXMud3JhcDtcbiAgICBwYXJhbXMudXBkYXRlID0gcGFyYW1zLnVwZGF0ZSA9PT0gdW5kZWZpbmVkID8gREVGQVVMVF9VUERBVEUgOiBwYXJhbXMudXBkYXRlO1xuXG4gICAgdGhpcy5fd3JhcCAgID0gcGFyYW1zLndyYXA7XG4gICAgdGhpcy5fdXBkYXRlID0gcGFyYW1zLnVwZGF0ZTtcblxuICAgIHZhciB0ZXh0QXJlYSA9IHRoaXMuX3RleHRBcmVhID0gbmV3IE5vZGUoTm9kZS5URVhUQVJFQSksXG4gICAgICAgIHdyYXAgPSB0aGlzLl93cmFwTm9kZSxcbiAgICAgICAgcm9vdCA9IHRoaXMuX25vZGU7XG5cbiAgICAgICAgdGV4dEFyZWEuc2V0UHJvcGVydHkoJ3JlYWRPbmx5Jyx0cnVlKTtcbiAgICAgICAgd3JhcC5hZGRDaGlsZCh0ZXh0QXJlYSk7XG5cbiAgICAgICAgdGV4dEFyZWEuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTix0aGlzLl9vbklucHV0RHJhZ1N0YXJ0LmJpbmQodGhpcykpO1xuICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoQ29tcG9uZW50RXZlbnQuSU5QVVRfU0VMRUNUX0RSQUcsdGhpcy5fcGFyZW50LCdvbkNvbXBvbmVudFNlbGVjdERyYWcnKTtcblxuXG4gICAgaWYocGFyYW1zLmhlaWdodCl7XG4gICAgICAgIHZhciB0ZXh0QXJlYVdyYXAgPSBuZXcgTm9kZSgpO1xuICAgICAgICAgICAgdGV4dEFyZWFXcmFwLnNldFN0eWxlQ2xhc3MoQ1NTLlRleHRBcmVhV3JhcCk7XG4gICAgICAgICAgICB0ZXh0QXJlYVdyYXAuYWRkQ2hpbGQodGV4dEFyZWEpO1xuICAgICAgICAgICAgd3JhcC5hZGRDaGlsZCh0ZXh0QXJlYVdyYXApO1xuXG4gICAgICAgIC8vRklYTUVcbiAgICAgICAgdmFyIGhlaWdodCAgPSB0aGlzLl9oZWlnaHQgPSBwYXJhbXMuaGVpZ2h0LFxuICAgICAgICAgICAgcGFkZGluZyA9IDQ7XG5cbiAgICAgICAgICAgIHRleHRBcmVhLnNldEhlaWdodChNYXRoLm1heChoZWlnaHQgKyBwYWRkaW5nICAsTWV0cmljLkNPTVBPTkVOVF9NSU5fSEVJR0hUKSk7XG4gICAgICAgICAgICB3cmFwLnNldEhlaWdodCh0ZXh0QXJlYS5nZXRIZWlnaHQoKSk7XG4gICAgICAgICAgICByb290LnNldEhlaWdodCh3cmFwLmdldEhlaWdodCgpICsgcGFkZGluZyk7XG5cbiAgICAgICAgdGhpcy5fc2Nyb2xsQmFyID0gbmV3IFNjcm9sbEJhcih0ZXh0QXJlYVdyYXAsdGV4dEFyZWEsaGVpZ2h0IC0gcGFkZGluZylcbiAgICB9XG5cbiAgICBpZihwYXJhbXMud3JhcCl7XG4gICAgICAgIHRleHRBcmVhLnNldFN0eWxlUHJvcGVydHkoJ3doaXRlLXNwYWNlJywncHJlLXdyYXAnKTtcbiAgICB9XG5cbiAgICB0aGlzLl9wcmV2U3RyaW5nID0gJyc7XG4gICAgdGhpcy5fcHJldlNjcm9sbEhlaWdodCA9IC0xO1xuICAgIHRoaXMuX3NldFZhbHVlKCk7XG59XG5PdXRwdXQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShPYmplY3RDb21wb25lbnQucHJvdG90eXBlKTtcbk91dHB1dC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBPdXRwdXQ7XG5cbi8vT3ZlcnJpZGUgaW4gc3ViY2xhc3Ncbk91dHB1dC5wcm90b3R5cGUuX3NldFZhbHVlID0gZnVuY3Rpb24gKCkge307XG5cbk91dHB1dC5wcm90b3R5cGUub25WYWx1ZVVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9zZXRWYWx1ZSgpO1xufTtcblxuT3V0cHV0LnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYoIXRoaXMuX3VwZGF0ZSl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5fc2V0VmFsdWUoKTtcbn07XG5cbi8vUHJldmVudCBjaHJvbWUgc2VsZWN0IGRyYWdcblxuT3V0cHV0LnByb3RvdHlwZS5fb25EcmFnID0gZnVuY3Rpb24oKXtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBDb21wb25lbnRFdmVudC5JTlBVVF9TRUxFQ1RfRFJBRywgbnVsbCkpO1xufTtcblxuT3V0cHV0LnByb3RvdHlwZS5fb25EcmFnRmluaXNoID0gZnVuY3Rpb24oKXtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBDb21wb25lbnRFdmVudC5JTlBVVF9TRUxFQ1RfRFJBRywgbnVsbCkpO1xuXG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsIHRoaXMuX29uRHJhZywgZmFsc2UpO1xuICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLCB0aGlzLl9vbkRyYWdGaW5pc2gsIGZhbHNlKTtcbn07XG5cbk91dHB1dC5wcm90b3R5cGUuX29uSW5wdXREcmFnU3RhcnQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBDb21wb25lbnRFdmVudC5JTlBVVF9TRUxFQ1RfRFJBRywgbnVsbCkpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLCB0aGlzLl9vbkRyYWcuYmluZCh0aGlzKSwgZmFsc2UpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9VUCwgICB0aGlzLl9vbkRyYWdGaW5pc2guYmluZCh0aGlzKSwgZmFsc2UpO1xufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IE91dHB1dDtcbiIsInZhciBQbG90dGVyID0gcmVxdWlyZSgnLi9QbG90dGVyJyk7XG52YXIgTW91c2UgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L01vdXNlJyk7XG5cbnZhciBFdmVudF8gICAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcbiAgICBEb2N1bWVudEV2ZW50ICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxuICAgIENvbXBvbmVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9Db21wb25lbnRFdmVudCcpO1xuXG52YXIgREVGQVVMVF9CT1VORFNfWCA9IFstMSwxXSxcbiAgICBERUZBVUxUX0JPVU5EU19ZID0gWy0xLDFdLFxuICAgIERFRkFVTFRfTEFCRUxfWCAgPSAnJyxcbiAgICBERUZBVUxUX0xBQkVMX1kgID0gJyc7XG5cbmZ1bmN0aW9uIFBhZChwYXJlbnQsIG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuICAgIFBsb3R0ZXIuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG4gICAgcGFyYW1zICAgICAgICAgICAgPSBwYXJhbXMgICAgICAgICAgICB8fCB7fTtcbiAgICBwYXJhbXMuYm91bmRzWCAgICA9IHBhcmFtcy5ib3VuZHNYICAgIHx8IERFRkFVTFRfQk9VTkRTX1g7XG4gICAgcGFyYW1zLmJvdW5kc1kgICAgPSBwYXJhbXMuYm91bmRzWSAgICB8fCBERUZBVUxUX0JPVU5EU19ZO1xuICAgIHBhcmFtcy5sYWJlbFggICAgID0gcGFyYW1zLmxhYmVsWCAgICAgfHwgREVGQVVMVF9MQUJFTF9YO1xuICAgIHBhcmFtcy5sYWJlbFkgICAgID0gcGFyYW1zLmxhYmVsWSAgICAgfHwgREVGQVVMVF9MQUJFTF9ZO1xuXG4gICAgcGFyYW1zLnNob3dDcm9zcyAgPSBwYXJhbXMuc2hvd0Nyb3NzICB8fCB0cnVlO1xuXG5cbiAgICB0aGlzLl9vbkNoYW5nZSAgICAgPSBwYXJhbXMub25DaGFuZ2UgfHwgdGhpcy5fb25DaGFuZ2U7XG4gICAgdGhpcy5fb25GaW5pc2ggICAgID0gcGFyYW1zLm9uRmluaXNoIHx8IGZ1bmN0aW9uKCl7fTtcblxuICAgIHRoaXMuX2JvdW5kc1ggICAgICA9IHBhcmFtcy5ib3VuZHNYO1xuICAgIHRoaXMuX2JvdW5kc1kgICAgICA9IHBhcmFtcy5ib3VuZHNZO1xuICAgIHRoaXMuX2xhYmVsQXhpc1ggICA9IHBhcmFtcy5sYWJlbFggIT0gJycgJiYgcGFyYW1zLmxhYmVsWCAhPSAnbm9uZScgPyBwYXJhbXMubGFiZWxYIDogbnVsbDtcbiAgICB0aGlzLl9sYWJlbEF4aXNZICAgPSBwYXJhbXMubGFiZWxZICE9ICcnICYmIHBhcmFtcy5sYWJlbFkgIT0gJ25vbmUnID8gcGFyYW1zLmxhYmVsWSA6IG51bGw7XG5cbiAgICB2YXIgcGF0aCA9IHRoaXMuX3BhdGg7XG4gICAgICAgIHBhdGguc3R5bGUuc3Ryb2tlV2lkdGggPSAxO1xuICAgICAgICBwYXRoLnN0eWxlLnN0cm9rZSAgICAgID0gJyMzNjNjNDAnO1xuXG4gICAgdGhpcy5fZ3JpZC5zdHlsZS5zdHJva2UgPSAncmdiKDI1LDI1LDI1KSc7XG5cbiAgICB0aGlzLl9zdmdQb3MgPSBbMCwwXTtcblxuXG4gICAgdmFyIGhhbmRsZSA9IHRoaXMuX2hhbmRsZSA9IHRoaXMuX3N2Z1Jvb3QuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdnJykpO1xuICAgIHZhciBoYW5kbGVDaXJjbGUwID0gaGFuZGxlLmFwcGVuZENoaWxkKHRoaXMuX2NyZWF0ZVNWR09iamVjdCgnY2lyY2xlJykpO1xuICAgICAgICBoYW5kbGVDaXJjbGUwLnNldEF0dHJpYnV0ZSgncicsU3RyaW5nKDExKSk7XG4gICAgICAgIGhhbmRsZUNpcmNsZTAuc2V0QXR0cmlidXRlKCdmaWxsJywncmdiYSgwLDAsMCwwLjA1KScpO1xuICAgIHZhciBoYW5kbGVDaXJjbGUxID0gaGFuZGxlLmFwcGVuZENoaWxkKHRoaXMuX2NyZWF0ZVNWR09iamVjdCgnY2lyY2xlJykpO1xuICAgICAgICBoYW5kbGVDaXJjbGUxLnNldEF0dHJpYnV0ZSgncicsU3RyaW5nKDEwKSk7XG4gICAgICAgIGhhbmRsZUNpcmNsZTEuc2V0QXR0cmlidXRlKCdmaWxsJywncmdiKDgzLDkzLDk4KScpO1xuXG4gICAgdmFyIGhhbmRsZUNpcmNsZTIgPSBoYW5kbGUuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdjaXJjbGUnKSk7XG4gICAgICAgIGhhbmRsZUNpcmNsZTIuc2V0QXR0cmlidXRlKCdyJyxTdHJpbmcoOSkpO1xuICAgICAgICBoYW5kbGVDaXJjbGUyLnNldEF0dHJpYnV0ZSgnZmlsbCcsJ3JnYig1Nyw2OSw3NiknKTtcbiAgICAgICAgaGFuZGxlQ2lyY2xlMi5zZXRBdHRyaWJ1dGUoJ2N5JyxTdHJpbmcoMC43NSkpO1xuXG4gICAgdmFyIGhhbmRsZUNpcmNsZTMgPSBoYW5kbGUuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdjaXJjbGUnKSk7XG4gICAgICAgIGhhbmRsZUNpcmNsZTMuc2V0QXR0cmlidXRlKCdyJyxTdHJpbmcoMTApKTtcbiAgICAgICAgaGFuZGxlQ2lyY2xlMy5zZXRBdHRyaWJ1dGUoJ3N0cm9rZScsJ3JnYigxNywxOSwyMCknKTtcbiAgICAgICAgaGFuZGxlQ2lyY2xlMy5zZXRBdHRyaWJ1dGUoJ3N0cm9rZS13aWR0aCcsU3RyaW5nKDEpKTtcbiAgICAgICAgaGFuZGxlQ2lyY2xlMy5zZXRBdHRyaWJ1dGUoJ2ZpbGwnLCdub25lJyk7XG5cbiAgICB2YXIgaGFuZGxlQ2lyY2xlNCA9IGhhbmRsZS5hcHBlbmRDaGlsZCh0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ2NpcmNsZScpKTtcbiAgICAgICAgaGFuZGxlQ2lyY2xlNC5zZXRBdHRyaWJ1dGUoJ3InLFN0cmluZyg2KSk7XG4gICAgICAgIGhhbmRsZUNpcmNsZTQuc2V0QXR0cmlidXRlKCdmaWxsJywncmdiKDMwLDM0LDM2KScpO1xuICAgIHZhciBoYW5kbGVDaXJjbGU1ID0gaGFuZGxlLmFwcGVuZENoaWxkKHRoaXMuX2NyZWF0ZVNWR09iamVjdCgnY2lyY2xlJykpO1xuICAgICAgICBoYW5kbGVDaXJjbGU1LnNldEF0dHJpYnV0ZSgncicsU3RyaW5nKDMpKTtcbiAgICAgICAgaGFuZGxlQ2lyY2xlNS5zZXRBdHRyaWJ1dGUoJ2ZpbGwnLCdyZ2IoMjU1LDI1NSwyNTUpJyk7XG5cbiAgICAgICAgaGFuZGxlLnNldEF0dHJpYnV0ZSgndHJhbmZvcm0nLCd0cmFuc2xhdGUoMCAwKScpO1xuXG4gICAgdGhpcy5fc3ZnLmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9ET1dOLHRoaXMuX29uRHJhZ1N0YXJ0LmJpbmQodGhpcyksZmFsc2UpO1xuICAgIHRoaXMuX2RyYXdWYWx1ZSh0aGlzLl9vYmpbdGhpcy5fa2V5XSk7XG59XG5QYWQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShQbG90dGVyLnByb3RvdHlwZSk7XG5QYWQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gUGFkO1xuXG5QYWQucHJvdG90eXBlLl9vbkRyYWdTdGFydCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZWxlbWVudCA9IHRoaXMuX3N2ZztcblxuICAgIHZhciBzdmdQb3MgPSB0aGlzLl9zdmdQb3M7XG4gICAgICAgIHN2Z1Bvc1swXSA9IDA7XG4gICAgICAgIHN2Z1Bvc1sxXSA9IDA7XG5cbiAgICB3aGlsZSAoZWxlbWVudCkge1xuICAgICAgICBzdmdQb3NbMF0gKz0gZWxlbWVudC5vZmZzZXRMZWZ0O1xuICAgICAgICBzdmdQb3NbMV0gKz0gZWxlbWVudC5vZmZzZXRUb3A7XG4gICAgICAgIGVsZW1lbnQgPSBlbGVtZW50Lm9mZnNldFBhcmVudDtcbiAgICB9XG5cbiAgICB2YXIgZXZlbnRNb3ZlID0gRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLFxuICAgICAgICBldmVudFVwICAgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX1VQO1xuXG4gICAgdmFyIG9uRHJhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fZHJhd1ZhbHVlSW5wdXQoKTtcbiAgICAgICAgdGhpcy5hcHBseVZhbHVlKCk7XG4gICAgICAgIHRoaXMuX29uQ2hhbmdlKCk7XG4gICAgfS5iaW5kKHRoaXMpO1xuXG4gICAgdmFyIG9uRHJhZ0VuZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5wdXNoSGlzdG9yeVN0YXRlKCk7XG4gICAgICAgIHRoaXMuX2RyYXdWYWx1ZUlucHV0KCk7XG4gICAgICAgIHRoaXMuYXBwbHlWYWx1ZSgpO1xuICAgICAgICB0aGlzLl9vbkZpbmlzaCgpO1xuXG4gICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcbiAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudFVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcbiAgICB9LmJpbmQodGhpcyk7XG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnLCAgICBmYWxzZSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudFVwLCAgIG9uRHJhZ0VuZCwgZmFsc2UpO1xuXG4gICAgdGhpcy5fZHJhd1ZhbHVlSW5wdXQoKTtcbiAgICB0aGlzLmFwcGx5VmFsdWUoKTtcbiAgICB0aGlzLl9vbkNoYW5nZSgpO1xufTtcblxuUGFkLnByb3RvdHlwZS5fcmVkcmF3ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2RyYXdWYWx1ZSh0aGlzLl9vYmpbdGhpcy5fa2V5XSk7XG59O1xuXG5QYWQucHJvdG90eXBlLl9kcmF3VmFsdWVJbnB1dCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9kcmF3VmFsdWUodGhpcy5fZ2V0TW91c2VOb3JtYWxpemVkKCkpO1xufTtcblxuUGFkLnByb3RvdHlwZS5fZHJhd1ZhbHVlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdGhpcy5fb2JqW3RoaXMuX2tleV0gPSB2YWx1ZTtcbiAgICB0aGlzLl9kcmF3R3JpZCgpO1xuICAgIHRoaXMuX2RyYXdQb2ludCgpO1xufTtcblxuUGFkLnByb3RvdHlwZS5fZHJhd0dyaWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHN2Z1NpemUgPSBOdW1iZXIodGhpcy5fc3ZnLmdldEF0dHJpYnV0ZSgnd2lkdGgnKSksXG4gICAgICAgIHN2Z01pZFggPSBNYXRoLmZsb29yKHN2Z1NpemUgKiAwLjUpLFxuICAgICAgICBzdmdNaWRZID0gTWF0aC5mbG9vcihzdmdTaXplICogMC41KTtcblxuICAgIHZhciBwYXRoQ21kID0gJyc7XG4gICAgcGF0aENtZCArPSB0aGlzLl9wYXRoQ21kTGluZSgwLCBzdmdNaWRZLCBzdmdTaXplLCBzdmdNaWRZKTtcbiAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRMaW5lKHN2Z01pZFgsIDAsIHN2Z01pZFgsIHN2Z1NpemUpO1xuXG4gICAgdGhpcy5fZ3JpZC5zZXRBdHRyaWJ1dGUoJ2QnLCBwYXRoQ21kKTtcbn07XG5cblxuUGFkLnByb3RvdHlwZS5fZHJhd1BvaW50ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzdmdTaXplID0gTnVtYmVyKHRoaXMuX3N2Zy5nZXRBdHRyaWJ1dGUoJ3dpZHRoJykpLFxuICAgICAgICBzdmdNaWRYID0gc3ZnU2l6ZSAqIDAuNSxcbiAgICAgICAgc3ZnTWlkWSA9IHN2Z1NpemUgKiAwLjU7XG5cbiAgICB2YXIgdmFsdWUgPSB0aGlzLl9vYmpbdGhpcy5fa2V5XTtcblxuICAgIHZhciBsb2NhbFggPSAoIDAuNSArIHZhbHVlWzBdICogMC41ICkgKiBzdmdTaXplLFxuICAgICAgICBsb2NhbFkgPSAoIDAuNSArIC12YWx1ZVsxXSAqIDAuNSApICogc3ZnU2l6ZTtcblxuICAgIHZhciBwYXRoQ21kID0gJyc7XG4gICAgICAgIHBhdGhDbWQgKz0gdGhpcy5fcGF0aENtZExpbmUoMCwgbG9jYWxZLCBzdmdTaXplLCBsb2NhbFkpO1xuICAgICAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRMaW5lKGxvY2FsWCwgMCwgbG9jYWxYLCBzdmdTaXplKTtcblxuICAgIHRoaXMuX3BhdGguc2V0QXR0cmlidXRlKCdkJywgcGF0aENtZCk7XG4gICAgdGhpcy5faGFuZGxlLnNldEF0dHJpYnV0ZSgndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgnICsgbG9jYWxYICsgJyAnICsgbG9jYWxZICsgJyknKTtcbn07XG5cblBhZC5wcm90b3R5cGUuX2dldE1vdXNlTm9ybWFsaXplZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgb2Zmc2V0ID0gdGhpcy5fc3ZnUG9zLFxuICAgICAgICBtb3VzZSA9IE1vdXNlLmdldCgpLmdldFBvc2l0aW9uKCksXG4gICAgICAgIHN2Z1NpemUgPSBOdW1iZXIodGhpcy5fc3ZnLmdldEF0dHJpYnV0ZSgnd2lkdGgnKSk7XG5cbiAgICByZXR1cm4gWy0xICsgTWF0aC5tYXgoMCwgTWF0aC5taW4obW91c2VbMF0gLSBvZmZzZXRbMF0sIHN2Z1NpemUpKSAvIHN2Z1NpemUgKiAyLFxuICAgICAgICAoIDEgLSBNYXRoLm1heCgwLCBNYXRoLm1pbihtb3VzZVsxXSAtIG9mZnNldFsxXSwgc3ZnU2l6ZSkpIC8gc3ZnU2l6ZSAqIDIpXTtcblxufTtcblxuUGFkLnByb3RvdHlwZS5hcHBseVZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIG51bGwpKTtcbn07XG5cblBhZC5wcm90b3R5cGUub25WYWx1ZVVwZGF0ZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKGUuZGF0YS5vcmlnaW4gPT0gdGhpcylyZXR1cm47XG4gICAgdGhpcy5fZHJhd1ZhbHVlKHRoaXMuX29ialt0aGlzLl9rZXldKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUGFkO1xuIiwidmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcblxudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG52YXIgTnVtYmVySW5wdXRfSW50ZXJuYWwgPSByZXF1aXJlKCcuL051bWJlcklucHV0X0ludGVybmFsJyk7XG52YXIgTW91c2UgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L01vdXNlJyk7XG52YXIgQ29sb3JVdGlsID0gcmVxdWlyZSgnLi4vY29yZS9jb2xvci9Db2xvclV0aWwnKTtcbnZhciBEb2N1bWVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXG4gICAgTm9kZUV2ZW50ICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50Jyk7XG5cbnZhciBERUZBVUxUX1ZBTFVFX0hVRSA9IDIwMC4wLFxuICAgIERFRkFVTFRfVkFMVUVfU0FUID0gNTAuMCxcbiAgICBERUZBVUxUX1ZBTFVFX1ZBTCA9IDUwLjA7XG5cbmZ1bmN0aW9uIFBpY2tlcihwYXJlbnROb2RlKXtcbiAgICB2YXIgcm9vdCA9IHRoaXMuX25vZGUgICAgID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXIpLFxuICAgICAgICBoZWFkID0gdGhpcy5faGVhZE5vZGUgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLkhlYWQpLFxuICAgICAgICBsYWJlbFdyYXAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApLFxuICAgICAgICBsYWJlbCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpLFxuICAgICAgICBtZW51ID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5NZW51KSxcbiAgICAgICAgbWVudVdyYXAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApO1xuXG4gICAgdmFyIG1lbnVDbG9zZSA9IG5ldyBOb2RlKE5vZGUuSU5QVVRfQlVUVE9OKTtcbiAgICAgICAgbWVudUNsb3NlLnNldFN0eWxlQ2xhc3MoQ1NTLkJ1dHRvbk1lbnVDbG9zZSk7XG5cbiAgICB2YXIgZmllbGRXcmFwICA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyggQ1NTLlBpY2tlckZpZWxkV3JhcCksXG4gICAgICAgIHNsaWRlcldyYXAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlNsaWRlcldyYXApLFxuICAgICAgICBpbnB1dFdyYXAgID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKCBDU1MuUGlja2VySW5wdXRXcmFwKTtcblxuICAgIHZhciBjYW52YXNGaWVsZCAgPSB0aGlzLl9jYW52YXNGaWVsZCAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKSxcbiAgICAgICAgY2FudmFzU2xpZGVyID0gdGhpcy5fY2FudmFzU2xpZGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnQ2FudmFzJyk7XG5cbiAgICAgICAgZmllbGRXcmFwLmdldEVsZW1lbnQoKS5hcHBlbmRDaGlsZChjYW52YXNGaWVsZCk7XG4gICAgICAgIHNsaWRlcldyYXAuZ2V0RWxlbWVudCgpLmFwcGVuZENoaWxkKGNhbnZhc1NsaWRlcik7XG5cbiAgICAgICAgdGhpcy5fc2V0U2l6ZUNhbnZhc0ZpZWxkKDE1NCwxNTQpO1xuICAgICAgICB0aGlzLl9zZXRTaXplQ2FudmFzU2xpZGVyKDE0LDE1NCk7XG5cbiAgICB2YXIgY29udGV4dENhbnZhc0ZpZWxkICA9IHRoaXMuX2NvbnRleHRDYW52YXNGaWVsZCAgPSBjYW52YXNGaWVsZC5nZXRDb250ZXh0KCcyZCcpLFxuICAgICAgICBjb250ZXh0Q2FudmFzU2xpZGVyID0gdGhpcy5fY29udGV4dENhbnZhc1NsaWRlciA9IGNhbnZhc1NsaWRlci5nZXRDb250ZXh0KCcyZCcpO1xuXG4gICAgdmFyIGhhbmRsZUZpZWxkICA9IHRoaXMuX2hhbmRsZUZpZWxkICA9IG5ldyBOb2RlKCk7XG4gICAgICAgIGhhbmRsZUZpZWxkLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlckhhbmRsZUZpZWxkKTtcblxuICAgIHZhciBoYW5kbGVTbGlkZXIgPSB0aGlzLl9oYW5kbGVTbGlkZXIgPSBuZXcgTm9kZSgpO1xuICAgICAgICBoYW5kbGVTbGlkZXIuc2V0U3R5bGVDbGFzcyhDU1MuUGlja2VySGFuZGxlU2xpZGVyKTtcblxuICAgIHZhciBzdGVwID0gMS4wLFxuICAgICAgICBkcCAgID0gMDtcblxuICAgIHZhciBjYWxsYmFja0h1ZSA9IHRoaXMuX29uSW5wdXRIdWVDaGFuZ2UuYmluZCh0aGlzKSxcbiAgICAgICAgY2FsbGJhY2tTYXQgPSB0aGlzLl9vbklucHV0U2F0Q2hhbmdlLmJpbmQodGhpcyksXG4gICAgICAgIGNhbGxiYWNrVmFsID0gdGhpcy5fb25JbnB1dFZhbENoYW5nZS5iaW5kKHRoaXMpLFxuICAgICAgICBjYWxsYmFja1IgICA9IHRoaXMuX29uSW5wdXRSQ2hhbmdlLmJpbmQodGhpcyksXG4gICAgICAgIGNhbGxiYWNrRyAgID0gdGhpcy5fb25JbnB1dEdDaGFuZ2UuYmluZCh0aGlzKSxcbiAgICAgICAgY2FsbGJhY2tCICAgPSB0aGlzLl9vbklucHV0QkNoYW5nZS5iaW5kKHRoaXMpO1xuXG5cbiAgICB2YXIgaW5wdXRIdWUgPSB0aGlzLl9pbnB1dEh1ZSA9IG5ldyBOdW1iZXJJbnB1dF9JbnRlcm5hbChzdGVwLGRwLG51bGwsY2FsbGJhY2tIdWUpLFxuICAgICAgICBpbnB1dFNhdCA9IHRoaXMuX2lucHV0U2F0ID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHN0ZXAsZHAsbnVsbCxjYWxsYmFja1NhdCksXG4gICAgICAgIGlucHV0VmFsID0gdGhpcy5faW5wdXRWYWwgPSBuZXcgTnVtYmVySW5wdXRfSW50ZXJuYWwoc3RlcCxkcCxudWxsLGNhbGxiYWNrVmFsKSxcbiAgICAgICAgaW5wdXRSICAgPSB0aGlzLl9pbnB1dFIgICA9IG5ldyBOdW1iZXJJbnB1dF9JbnRlcm5hbChzdGVwLGRwLG51bGwsY2FsbGJhY2tSKSxcbiAgICAgICAgaW5wdXRHICAgPSB0aGlzLl9pbnB1dEcgICA9IG5ldyBOdW1iZXJJbnB1dF9JbnRlcm5hbChzdGVwLGRwLG51bGwsY2FsbGJhY2tHKSxcbiAgICAgICAgaW5wdXRCICAgPSB0aGlzLl9pbnB1dEIgICA9IG5ldyBOdW1iZXJJbnB1dF9JbnRlcm5hbChzdGVwLGRwLG51bGwsY2FsbGJhY2tCKTtcblxuICAgIHZhciBjb250cm9sc1dyYXAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlckNvbnRyb2xzV3JhcCk7XG5cbiAgICB2YXIgYnV0dG9uUGljayAgID0gbmV3IE5vZGUoTm9kZS5JTlBVVF9CVVRUT04pLnNldFN0eWxlQ2xhc3MoQ1NTLkJ1dHRvbikuc2V0UHJvcGVydHkoJ3ZhbHVlJywncGljaycpLFxuICAgICAgICBidXR0b25DYW5jZWwgPSBuZXcgTm9kZShOb2RlLklOUFVUX0JVVFRPTikuc2V0U3R5bGVDbGFzcyhDU1MuQnV0dG9uKS5zZXRQcm9wZXJ0eSgndmFsdWUnLCdjYW5jZWwnKTtcblxuXG4gICAgdmFyIGNvbG9yQ29udHJhc3QgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlckNvbG9yQ29udHJhc3QpO1xuXG4gICAgdmFyIGNvbG9yMCA9IHRoaXMuX2NvbG9yQ3Vyck5vZGUgPSBuZXcgTm9kZSgpLFxuICAgICAgICBjb2xvcjEgPSB0aGlzLl9jb2xvclByZXZOb2RlID0gbmV3IE5vZGUoKTtcblxuICAgIGNvbG9yQ29udHJhc3QuYWRkQ2hpbGQoY29sb3IwKTtcbiAgICBjb2xvckNvbnRyYXN0LmFkZENoaWxkKGNvbG9yMSk7XG5cbiAgICBjb250cm9sc1dyYXAuYWRkQ2hpbGQoYnV0dG9uQ2FuY2VsKTtcbiAgICBjb250cm9sc1dyYXAuYWRkQ2hpbGQoYnV0dG9uUGljayk7XG4gICAgY29udHJvbHNXcmFwLmFkZENoaWxkKGNvbG9yQ29udHJhc3QpO1xuXG4gICAgdGhpcy5fc2V0Q29udHJhc1ByZXZDb2xvcigwLDAsMCk7XG5cbiAgICB2YXIgaW5wdXRGaWVsZFdyYXBIdWUgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlcklucHV0RmllbGQpLFxuICAgICAgICBpbnB1dEZpZWxkV3JhcFNhdCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuUGlja2VySW5wdXRGaWVsZCksXG4gICAgICAgIGlucHV0RmllbGRXcmFwVmFsID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJJbnB1dEZpZWxkKTtcblxuICAgIHZhciBpbnB1dEZpZWxkV3JhcEh1ZUxhYmVsID0gbmV3IE5vZGUoTm9kZS5TUEFOKS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCkuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsJ0gnKSxcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBTYXRMYWJlbCA9IG5ldyBOb2RlKE5vZGUuU1BBTikuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCdTJyksXG4gICAgICAgIGlucHV0RmllbGRXcmFwVmFsTGFiZWwgPSBuZXcgTm9kZShOb2RlLlNQQU4pLnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywnVicpO1xuXG4gICAgICAgIGlucHV0RmllbGRXcmFwSHVlLmFkZENoaWxkcmVuKGlucHV0RmllbGRXcmFwSHVlTGFiZWwsaW5wdXRIdWUuZ2V0Tm9kZSgpKTtcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBTYXQuYWRkQ2hpbGRyZW4oaW5wdXRGaWVsZFdyYXBTYXRMYWJlbCxpbnB1dFNhdC5nZXROb2RlKCkpO1xuICAgICAgICBpbnB1dEZpZWxkV3JhcFZhbC5hZGRDaGlsZHJlbihpbnB1dEZpZWxkV3JhcFZhbExhYmVsLGlucHV0VmFsLmdldE5vZGUoKSk7XG5cbiAgICB2YXIgaW5wdXRGaWVsZFdyYXBSID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJJbnB1dEZpZWxkKSxcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBHID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJJbnB1dEZpZWxkKSxcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBCID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJJbnB1dEZpZWxkKTtcblxuICAgIHZhciBpbnB1dEZpZWxkV3JhcFJMYWJlbCA9IG5ldyBOb2RlKE5vZGUuU1BBTikuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCdSJyksXG4gICAgICAgIGlucHV0RmllbGRXcmFwR0xhYmVsID0gbmV3IE5vZGUoTm9kZS5TUEFOKS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCkuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsJ0cnKSxcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBCTGFiZWwgPSBuZXcgTm9kZShOb2RlLlNQQU4pLnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywnQicpO1xuXG4gICAgICAgIGlucHV0RmllbGRXcmFwUi5hZGRDaGlsZHJlbihpbnB1dEZpZWxkV3JhcFJMYWJlbCxpbnB1dFIuZ2V0Tm9kZSgpKTtcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBHLmFkZENoaWxkcmVuKGlucHV0RmllbGRXcmFwR0xhYmVsLGlucHV0Ry5nZXROb2RlKCkpO1xuICAgICAgICBpbnB1dEZpZWxkV3JhcEIuYWRkQ2hpbGRyZW4oaW5wdXRGaWVsZFdyYXBCTGFiZWwsaW5wdXRCLmdldE5vZGUoKSk7XG5cblxuICAgICAgICBpbnB1dFdyYXAuYWRkQ2hpbGRyZW4oaW5wdXRGaWVsZFdyYXBSLGlucHV0RmllbGRXcmFwSHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRGaWVsZFdyYXBHLGlucHV0RmllbGRXcmFwU2F0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRGaWVsZFdyYXBCLGlucHV0RmllbGRXcmFwVmFsLGNvbG9yQ29udHJhc3QpO1xuXG4gICAgdmFyIGhleElucHV0V3JhcCA9IG5ldyBOb2RlKCk7XG4gICAgICAgIGhleElucHV0V3JhcC5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJJbnB1dFdyYXApO1xuXG4gICAgdmFyIGlucHV0SEVYID0gdGhpcy5faW5wdXRIRVggPSBuZXcgTm9kZShOb2RlLklOUFVUX1RFWFQpLFxuICAgICAgICBpbnB1dEZpZWxkV3JhcEhFWCAgICAgICAgID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJJbnB1dEZpZWxkKSxcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBIRVhMYWJlbCAgICA9IG5ldyBOb2RlKE5vZGUuU1BBTikuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpO1xuXG4gICAgICAgIGlucHV0RmllbGRXcmFwSEVYTGFiZWwuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsJyMnKTtcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBIRVguYWRkQ2hpbGRyZW4oaW5wdXRGaWVsZFdyYXBIRVhMYWJlbCxpbnB1dEhFWCk7XG5cbiAgICAgICAgaGV4SW5wdXRXcmFwLmFkZENoaWxkKGlucHV0RmllbGRXcmFwSEVYKTtcblxuICAgICAgICBpbnB1dEhFWC5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5DSEFOR0UsdGhpcy5fb25JbnB1dEhFWEZpbmlzaC5iaW5kKHRoaXMpKTtcblxuICAgICAgICBsYWJlbC5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywnQ29sb3IgUGlja2VyJyk7XG5cbiAgICAgICAgbWVudS5hZGRDaGlsZChtZW51Q2xvc2UpO1xuICAgICAgICBoZWFkLmFkZENoaWxkKG1lbnUpO1xuICAgICAgICBsYWJlbFdyYXAuYWRkQ2hpbGQobGFiZWwpO1xuICAgICAgICBoZWFkLmFkZENoaWxkKGxhYmVsV3JhcCk7XG4gICAgICAgIHJvb3QuYWRkQ2hpbGQoaGVhZCk7XG4gICAgICAgIHJvb3QuYWRkQ2hpbGQobWVudVdyYXApO1xuXG4gICAgICAgIC8vd3JhcE5vZGUuYWRkQ2hpbGQocGFsZXR0ZVdyYXApO1xuXG4gICAgICAgIG1lbnVXcmFwLmFkZENoaWxkKGZpZWxkV3JhcCk7XG4gICAgICAgIG1lbnVXcmFwLmFkZENoaWxkKHNsaWRlcldyYXApO1xuICAgICAgICBtZW51V3JhcC5hZGRDaGlsZChpbnB1dFdyYXApO1xuICAgICAgICBtZW51V3JhcC5hZGRDaGlsZChoZXhJbnB1dFdyYXApO1xuICAgICAgICBtZW51V3JhcC5hZGRDaGlsZChjb250cm9sc1dyYXApO1xuXG4gICAgICAgIGZpZWxkV3JhcC5hZGRDaGlsZCggaGFuZGxlRmllbGQpO1xuICAgICAgICBzbGlkZXJXcmFwLmFkZENoaWxkKGhhbmRsZVNsaWRlcik7XG5cbiAgICB2YXIgZXZlbnRNb3VzZURvd24gPSBOb2RlRXZlbnQuTU9VU0VfRE9XTixcbiAgICAgICAgY2FsbGJhY2sgICAgICAgPSB0aGlzLl9vbkNhbnZhc0ZpZWxkTW91c2VEb3duLmJpbmQodGhpcyk7XG5cbiAgICAgICAgZmllbGRXcmFwLmFkZEV2ZW50TGlzdGVuZXIoICBldmVudE1vdXNlRG93biwgY2FsbGJhY2spO1xuICAgICAgICBoYW5kbGVGaWVsZC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VEb3duLCBjYWxsYmFjayk7XG5cbiAgICAgICAgY2FsbGJhY2sgPSB0aGlzLl9vbkNhbnZhc1NsaWRlck1vdXNlRG93bi5iaW5kKHRoaXMpO1xuXG4gICAgICAgIHNsaWRlcldyYXAuYWRkRXZlbnRMaXN0ZW5lciggIGV2ZW50TW91c2VEb3duLCBjYWxsYmFjayk7XG4gICAgICAgIGhhbmRsZVNsaWRlci5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VEb3duLCBjYWxsYmFjayk7XG5cbiAgICAgICAgbWVudUNsb3NlLmFkZEV2ZW50TGlzdGVuZXIoICAgZXZlbnRNb3VzZURvd24sIHRoaXMuX29uQ2xvc2UuYmluZCh0aGlzKSk7XG4gICAgICAgIGJ1dHRvblBpY2suYWRkRXZlbnRMaXN0ZW5lciggIGV2ZW50TW91c2VEb3duLCB0aGlzLl9vblBpY2suYmluZCh0aGlzKSk7XG4gICAgICAgIGJ1dHRvbkNhbmNlbC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VEb3duLCB0aGlzLl9vbkNsb3NlLmJpbmQodGhpcykpO1xuXG4gICAgICAgIGhlYWQuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25IZWFkRHJhZ1N0YXJ0LmJpbmQodGhpcykpO1xuXG4gICAgdGhpcy5fcGFyZW50Tm9kZSA9IHBhcmVudE5vZGU7XG5cbiAgICB0aGlzLl9tb3VzZU9mZnNldCA9IFswLDBdO1xuICAgIHRoaXMuX3Bvc2l0aW9uICAgID0gW251bGwsbnVsbF07XG5cbiAgICB0aGlzLl9jYW52YXNTbGlkZXJQb3MgPSBbMCwwXTtcbiAgICB0aGlzLl9jYW52YXNGaWVsZFBvcyAgPSBbMCwwXTtcbiAgICB0aGlzLl9oYW5kbGVGaWVsZFNpemUgICAgPSAxMjtcbiAgICB0aGlzLl9oYW5kbGVTbGlkZXJIZWlnaHQgPSA3O1xuXG4gICAgdGhpcy5faW1hZ2VEYXRhU2xpZGVyID0gY29udGV4dENhbnZhc1NsaWRlci5jcmVhdGVJbWFnZURhdGEoY2FudmFzU2xpZGVyLndpZHRoLGNhbnZhc1NsaWRlci5oZWlnaHQpO1xuICAgIHRoaXMuX2ltYWdlRGF0YUZpZWxkICA9IGNvbnRleHRDYW52YXNGaWVsZC5jcmVhdGVJbWFnZURhdGEoIGNhbnZhc0ZpZWxkLndpZHRoLCBjYW52YXNGaWVsZC5oZWlnaHQpO1xuXG4gICAgdGhpcy5fdmFsdWVIdWVNaW5NYXggPSBbMCwzNjBdO1xuICAgIHRoaXMuX3ZhbHVlU2F0TWluTWF4ID0gdGhpcy5fdmFsdWVWYWxNaW5NYXggPSBbMCwxMDBdO1xuICAgIHRoaXMuX3ZhbHVlUkdCTWluTWF4ID0gWzAsMjU1XTtcblxuICAgIHRoaXMuX3ZhbHVlSHVlID0gREVGQVVMVF9WQUxVRV9IVUU7XG4gICAgdGhpcy5fdmFsdWVTYXQgPSBERUZBVUxUX1ZBTFVFX1NBVDtcbiAgICB0aGlzLl92YWx1ZVZhbCA9IERFRkFVTFRfVkFMVUVfVkFMO1xuICAgIHRoaXMuX3ZhbHVlUiAgID0gMDtcbiAgICB0aGlzLl92YWx1ZUcgICA9IDA7XG4gICAgdGhpcy5fdmFsdWVCICAgPSAwO1xuXG4gICAgdGhpcy5fdmFsdWVIRVggPSAnIzAwMDAwMCc7XG4gICAgdGhpcy5fdmFsdWVIRVhWYWxpZCA9IHRoaXMuX3ZhbHVlSEVYO1xuXG4gICAgdGhpcy5fY2FsbGJhY2tQaWNrID0gZnVuY3Rpb24oKXt9O1xuXG4gICAgLy90aGlzLl9jYW52YXNGaWVsZEltYWdlRGF0YUZ1bmMgPSBmdW5jdGlvbihpLGope3JldHVybiB0aGlzLl9IU1YyUkdCKHRoaXMuX3ZhbHVlSHVlLGopfVxuXG4gICAgdGhpcy5fZHJhd0NhbnZhc0ZpZWxkKCk7XG4gICAgdGhpcy5fZHJhd0NhbnZhc1NsaWRlcigpO1xuXG4gICAgdGhpcy5fc2V0Q29sb3JIU1YodGhpcy5fdmFsdWVIdWUsdGhpcy5fdmFsdWVTYXQsdGhpcy5fdmFsdWVWYWwpO1xuXG4gICAgdGhpcy5fdXBkYXRlQ29sb3JSR0JGcm9tSFNWKCk7XG4gICAgdGhpcy5fdXBkYXRlQ29sb3JIRVhGcm9tUkdCKCk7XG5cbiAgICB0aGlzLl91cGRhdGVIYW5kbGVzKCk7XG59XG5cblBpY2tlci5wcm90b3R5cGUgPVxue1xuICAgIF9kcmF3SGFuZGxlRmllbGQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhc0ZpZWxkLFxuICAgICAgICAgICAgbm9kZVBvcyA9IHRoaXMuX2NhbnZhc0ZpZWxkUG9zLFxuICAgICAgICAgICAgbW91c2VQb3MgPSBNb3VzZS5nZXQoKS5nZXRQb3NpdGlvbigpO1xuXG4gICAgICAgIHZhciBwb3NYID0gTWF0aC5tYXgoMCwgTWF0aC5taW4obW91c2VQb3NbMF0gLSBub2RlUG9zWzBdLCBjYW52YXMud2lkdGgpKSxcbiAgICAgICAgICAgIHBvc1kgPSBNYXRoLm1heCgwLCBNYXRoLm1pbihtb3VzZVBvc1sxXSAtIG5vZGVQb3NbMV0sIGNhbnZhcy5oZWlnaHQpKSxcbiAgICAgICAgICAgIHBvc1hOb3JtID0gcG9zWCAvIGNhbnZhcy53aWR0aCxcbiAgICAgICAgICAgIHBvc1lOb3JtID0gcG9zWSAvIGNhbnZhcy5oZWlnaHQ7XG5cbiAgICAgICAgdmFyIHNhdCA9IE1hdGgucm91bmQocG9zWE5vcm0gKiB0aGlzLl92YWx1ZVNhdE1pbk1heFsxXSksXG4gICAgICAgICAgICB2YWwgPSBNYXRoLnJvdW5kKCgxLjAgLSBwb3NZTm9ybSkgKiB0aGlzLl92YWx1ZVZhbE1pbk1heFsxXSk7XG5cbiAgICAgICAgdGhpcy5fc2V0Q29sb3JIU1YodGhpcy5fdmFsdWVIdWUsIHNhdCwgdmFsKTtcblxuICAgICAgICB0aGlzLl91cGRhdGVDb2xvclJHQkZyb21IU1YoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIRVhGcm9tUkdCKCk7XG5cbiAgICAgICAgdGhpcy5fdXBkYXRlSGFuZGxlRmllbGQoKTtcbiAgICB9LFxuXG4gICAgX3VwZGF0ZUhhbmRsZUZpZWxkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB3aWR0aCA9IHRoaXMuX2NhbnZhc0ZpZWxkLndpZHRoLFxuICAgICAgICAgICAgaGVpZ2h0ID0gdGhpcy5fY2FudmFzRmllbGQuaGVpZ2h0LFxuICAgICAgICAgICAgb2Zmc2V0SGFuZGxlID0gdGhpcy5faGFuZGxlRmllbGRTaXplICogMC4yNTtcblxuICAgICAgICB2YXIgc2F0Tm9ybSA9IHRoaXMuX3ZhbHVlU2F0IC8gdGhpcy5fdmFsdWVTYXRNaW5NYXhbMV0sXG4gICAgICAgICAgICB2YWxOb3JtID0gdGhpcy5fdmFsdWVWYWwgLyB0aGlzLl92YWx1ZVZhbE1pbk1heFsxXTtcblxuICAgICAgICB0aGlzLl9oYW5kbGVGaWVsZC5zZXRQb3NpdGlvbkdsb2JhbChzYXROb3JtICogd2lkdGggLSBvZmZzZXRIYW5kbGUsXG4gICAgICAgICAgICAoMS4wIC0gdmFsTm9ybSkgKiBoZWlnaHQgLSBvZmZzZXRIYW5kbGUpO1xuXG4gICAgfSxcblxuICAgIF9kcmF3SGFuZGxlU2xpZGVyOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXNTbGlkZXIsXG4gICAgICAgICAgICBjYW52YXNQb3NZID0gdGhpcy5fY2FudmFzU2xpZGVyUG9zWzFdLFxuICAgICAgICAgICAgbW91c2VQb3NZID0gTW91c2UuZ2V0KCkuZ2V0WSgpO1xuXG4gICAgICAgIHZhciBwb3NZID0gTWF0aC5tYXgoMCwgTWF0aC5taW4obW91c2VQb3NZIC0gY2FudmFzUG9zWSwgY2FudmFzLmhlaWdodCkpLFxuICAgICAgICAgICAgcG9zWU5vcm0gPSBwb3NZIC8gY2FudmFzLmhlaWdodDtcblxuICAgICAgICB2YXIgaHVlID0gTWF0aC5mbG9vcigoMS4wIC0gcG9zWU5vcm0pICogdGhpcy5fdmFsdWVIdWVNaW5NYXhbMV0pO1xuXG4gICAgICAgIHRoaXMuX3NldENvbG9ySFNWKGh1ZSwgdGhpcy5fdmFsdWVTYXQsIHRoaXMuX3ZhbHVlVmFsKTtcblxuICAgICAgICB0aGlzLl91cGRhdGVDb2xvclJHQkZyb21IU1YoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIRVhGcm9tUkdCKCk7XG5cbiAgICAgICAgdGhpcy5fdXBkYXRlSGFuZGxlU2xpZGVyKCk7XG4gICAgfSxcblxuICAgIF91cGRhdGVIYW5kbGVTbGlkZXI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGhlaWdodCA9IHRoaXMuX2NhbnZhc1NsaWRlci5oZWlnaHQsXG4gICAgICAgICAgICBvZmZzZXRIYW5kbGUgPSB0aGlzLl9oYW5kbGVTbGlkZXJIZWlnaHQgKiAwLjI1O1xuXG4gICAgICAgIHZhciBodWVOb3JtID0gdGhpcy5fdmFsdWVIdWUgLyB0aGlzLl92YWx1ZUh1ZU1pbk1heFsxXTtcblxuICAgICAgICB0aGlzLl9oYW5kbGVTbGlkZXIuc2V0UG9zaXRpb25HbG9iYWxZKChoZWlnaHQgLSBvZmZzZXRIYW5kbGUpICogKDEuMCAtIGh1ZU5vcm0pKTtcbiAgICB9LFxuXG4gICAgX3VwZGF0ZUhhbmRsZXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fdXBkYXRlSGFuZGxlRmllbGQoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlSGFuZGxlU2xpZGVyKCk7XG4gICAgfSxcblxuICAgIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuICAgIF9zZXRIdWU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB2YXIgbWluTWF4ID0gdGhpcy5fdmFsdWVIdWVNaW5NYXg7XG5cbiAgICAgICAgdGhpcy5fdmFsdWVIdWUgPSB2YWx1ZSA9PSBtaW5NYXhbMV0gPyBtaW5NYXhbMF0gOiB2YWx1ZTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIU1YoKTtcbiAgICAgICAgdGhpcy5fZHJhd0NhbnZhc0ZpZWxkKCk7XG4gICAgfSxcblxuICAgIF9zZXRTYXQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB0aGlzLl92YWx1ZVNhdCA9IE1hdGgucm91bmQodmFsdWUpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhTVigpO1xuICAgIH0sXG5cbiAgICBfc2V0VmFsOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdGhpcy5fdmFsdWVWYWwgPSBNYXRoLnJvdW5kKHZhbHVlKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIU1YoKTtcbiAgICB9LFxuXG4gICAgX3NldFI6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB0aGlzLl92YWx1ZVIgPSBNYXRoLnJvdW5kKHZhbHVlKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JSR0IoKTtcbiAgICB9LFxuXG4gICAgX3NldEc6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB0aGlzLl92YWx1ZUcgPSBNYXRoLnJvdW5kKHZhbHVlKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JSR0IoKTtcbiAgICB9LFxuXG4gICAgX3NldEI6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB0aGlzLl92YWx1ZUIgPSBNYXRoLnJvdW5kKHZhbHVlKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JSR0IoKTtcbiAgICB9LFxuXG4gICAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gICAgX29uSW5wdXRIdWVDaGFuZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGlucHV0ID0gdGhpcy5faW5wdXRIdWUsXG4gICAgICAgICAgICBpbnB1dFZhbCA9IHRoaXMuX2dldFZhbHVlQ29udHJhaW5lZChpbnB1dCwgdGhpcy5fdmFsdWVIdWVNaW5NYXgpO1xuXG4gICAgICAgIHZhciBtaW5NYXggPSB0aGlzLl92YWx1ZUh1ZU1pbk1heDtcblxuICAgICAgICBpZiAoaW5wdXRWYWwgPT0gbWluTWF4WzFdKSB7XG4gICAgICAgICAgICBpbnB1dFZhbCA9IG1pbk1heFswXTtcbiAgICAgICAgICAgIGlucHV0LnNldFZhbHVlKGlucHV0VmFsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX3NldEh1ZShpbnB1dFZhbCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9yUkdCRnJvbUhTVigpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhFWEZyb21SR0IoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlSGFuZGxlU2xpZGVyKCk7XG5cbiAgICAgICAgdGhpcy5fZHJhd0NhbnZhc0ZpZWxkKCk7XG4gICAgfSxcblxuICAgIF9vbklucHV0U2F0Q2hhbmdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3NldFNhdCh0aGlzLl9nZXRWYWx1ZUNvbnRyYWluZWQodGhpcy5faW5wdXRTYXQsIHRoaXMuX3ZhbHVlU2F0TWluTWF4KSk7XG4gICAgICAgIHRoaXMuX29uSW5wdXRTVkNoYW5nZSgpO1xuICAgIH0sXG5cbiAgICBfb25JbnB1dFZhbENoYW5nZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9zZXRWYWwodGhpcy5fZ2V0VmFsdWVDb250cmFpbmVkKHRoaXMuX2lucHV0VmFsLCB0aGlzLl92YWx1ZVZhbE1pbk1heCkpO1xuICAgICAgICB0aGlzLl9vbklucHV0U1ZDaGFuZ2UoKTtcbiAgICB9LFxuXG4gICAgX29uSW5wdXRSQ2hhbmdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3NldFIodGhpcy5fZ2V0VmFsdWVDb250cmFpbmVkKHRoaXMuX2lucHV0UiwgdGhpcy5fdmFsdWVSR0JNaW5NYXgpKTtcbiAgICAgICAgdGhpcy5fb25JbnB1dFJHQkNoYW5nZSgpO1xuICAgIH0sXG5cbiAgICBfb25JbnB1dEdDaGFuZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fc2V0Ryh0aGlzLl9nZXRWYWx1ZUNvbnRyYWluZWQodGhpcy5faW5wdXRHLCB0aGlzLl92YWx1ZVJHQk1pbk1heCkpO1xuICAgICAgICB0aGlzLl9vbklucHV0UkdCQ2hhbmdlKCk7XG4gICAgfSxcblxuICAgIF9vbklucHV0QkNoYW5nZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9zZXRCKHRoaXMuX2dldFZhbHVlQ29udHJhaW5lZCh0aGlzLl9pbnB1dEIsIHRoaXMuX3ZhbHVlUkdCTWluTWF4KSk7XG4gICAgICAgIHRoaXMuX29uSW5wdXRSR0JDaGFuZ2UoKTtcbiAgICB9LFxuXG4gICAgX29uSW5wdXRIRVhGaW5pc2g6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGlucHV0ID0gdGhpcy5faW5wdXRIRVgsXG4gICAgICAgICAgICB2YWx1ZSA9IGlucHV0LmdldFByb3BlcnR5KCd2YWx1ZScpO1xuXG4gICAgICAgIGlmICghQ29sb3JVdGlsLmlzVmFsaWRIRVgodmFsdWUpKSB7XG4gICAgICAgICAgICBpbnB1dC5zZXRQcm9wZXJ0eSgndmFsdWUnLCB0aGlzLl92YWx1ZUhFWFZhbGlkKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX3ZhbHVlSEVYID0gdGhpcy5fdmFsdWVIRVhWYWxpZCA9IHZhbHVlO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckZyb21IRVgoKTtcbiAgICB9LFxuXG4gICAgX29uSW5wdXRTVkNoYW5nZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvclJHQkZyb21IU1YoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIRVhGcm9tUkdCKCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUhhbmRsZUZpZWxkKCk7XG4gICAgfSxcblxuICAgIF9vbklucHV0UkdCQ2hhbmdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySFNWRnJvbVJHQigpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhFWEZyb21SR0IoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlSGFuZGxlcygpO1xuICAgIH0sXG5cbiAgICBfZ2V0VmFsdWVDb250cmFpbmVkOiBmdW5jdGlvbiAoaW5wdXQsIG1pbk1heCkge1xuICAgICAgICB2YXIgaW5wdXRWYWwgPSBNYXRoLnJvdW5kKGlucHV0LmdldFZhbHVlKCkpLFxuICAgICAgICAgICAgbWluID0gbWluTWF4WzBdLFxuICAgICAgICAgICAgbWF4ID0gbWluTWF4WzFdO1xuXG4gICAgICAgIGlmIChpbnB1dFZhbCA8PSBtaW4pIHtcbiAgICAgICAgICAgIGlucHV0VmFsID0gbWluO1xuICAgICAgICAgICAgaW5wdXQuc2V0VmFsdWUoaW5wdXRWYWwpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpbnB1dFZhbCA+PSBtYXgpIHtcbiAgICAgICAgICAgIGlucHV0VmFsID0gbWF4O1xuICAgICAgICAgICAgaW5wdXQuc2V0VmFsdWUoaW5wdXRWYWwpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGlucHV0VmFsO1xuICAgIH0sXG5cblxuICAgIF91cGRhdGVJbnB1dEh1ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9pbnB1dEh1ZS5zZXRWYWx1ZSh0aGlzLl92YWx1ZUh1ZSk7XG4gICAgfSxcbiAgICBfdXBkYXRlSW5wdXRTYXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5faW5wdXRTYXQuc2V0VmFsdWUodGhpcy5fdmFsdWVTYXQpO1xuICAgIH0sXG4gICAgX3VwZGF0ZUlucHV0VmFsOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2lucHV0VmFsLnNldFZhbHVlKHRoaXMuX3ZhbHVlVmFsKTtcbiAgICB9LFxuICAgIF91cGRhdGVJbnB1dFI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5faW5wdXRSLnNldFZhbHVlKHRoaXMuX3ZhbHVlUik7XG4gICAgfSxcbiAgICBfdXBkYXRlSW5wdXRHOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2lucHV0Ry5zZXRWYWx1ZSh0aGlzLl92YWx1ZUcpO1xuICAgIH0sXG4gICAgX3VwZGF0ZUlucHV0QjogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9pbnB1dEIuc2V0VmFsdWUodGhpcy5fdmFsdWVCKTtcbiAgICB9LFxuICAgIF91cGRhdGVJbnB1dEhFWDogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9pbnB1dEhFWC5zZXRQcm9wZXJ0eSgndmFsdWUnLCB0aGlzLl92YWx1ZUhFWCk7XG4gICAgfSxcblxuXG4gICAgX3NldENvbG9ySFNWOiBmdW5jdGlvbiAoaHVlLCBzYXQsIHZhbCkge1xuICAgICAgICB0aGlzLl92YWx1ZUh1ZSA9IGh1ZTtcbiAgICAgICAgdGhpcy5fdmFsdWVTYXQgPSBzYXQ7XG4gICAgICAgIHRoaXMuX3ZhbHVlVmFsID0gdmFsO1xuXG4gICAgICAgIHRoaXMuX3VwZGF0ZUlucHV0SHVlKCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUlucHV0U2F0KCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUlucHV0VmFsKCk7XG5cbiAgICAgICAgdGhpcy5fdXBkYXRlQ29udHJhc3RDdXJyQ29sb3IoKTtcbiAgICB9LFxuXG4gICAgX3NldENvbG9yUkdCOiBmdW5jdGlvbiAociwgZywgYikge1xuICAgICAgICB0aGlzLl92YWx1ZVIgPSByO1xuICAgICAgICB0aGlzLl92YWx1ZUcgPSBnO1xuICAgICAgICB0aGlzLl92YWx1ZUIgPSBiO1xuXG4gICAgICAgIHRoaXMuX3VwZGF0ZUlucHV0UigpO1xuICAgICAgICB0aGlzLl91cGRhdGVJbnB1dEcoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlSW5wdXRCKCk7XG5cbiAgICAgICAgdGhpcy5fdXBkYXRlQ29udHJhc3RDdXJyQ29sb3IoKTtcbiAgICB9LFxuXG4gICAgX3NldENvbG9ySEVYOiBmdW5jdGlvbiAoaGV4KSB7XG4gICAgICAgIHRoaXMuX3ZhbHVlSEVYID0gaGV4O1xuICAgICAgICB0aGlzLl91cGRhdGVJbnB1dEhFWCgpO1xuICAgIH0sXG5cbiAgICBfdXBkYXRlQ29sb3JIU1Y6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fc2V0Q29sb3JIU1YodGhpcy5fdmFsdWVIdWUsIHRoaXMuX3ZhbHVlU2F0LCB0aGlzLl92YWx1ZVZhbCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbnRyYXN0Q3VyckNvbG9yKCk7XG4gICAgfSxcblxuICAgIF91cGRhdGVDb2xvclJHQjogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9zZXRDb2xvclJHQih0aGlzLl92YWx1ZVIsIHRoaXMuX3ZhbHVlRywgdGhpcy5fdmFsdWVCKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29udHJhc3RDdXJyQ29sb3IoKTtcbiAgICB9LFxuXG4gICAgX3VwZGF0ZUNvbG9ySFNWRnJvbVJHQjogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaHN2ID0gQ29sb3JVdGlsLlJHQjJIU1YodGhpcy5fdmFsdWVSLCB0aGlzLl92YWx1ZUcsIHRoaXMuX3ZhbHVlQik7XG4gICAgICAgIHRoaXMuX3NldENvbG9ySFNWKGhzdlswXSwgaHN2WzFdLCBoc3ZbMl0pO1xuICAgIH0sXG5cbiAgICBfdXBkYXRlQ29sb3JSR0JGcm9tSFNWOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciByZ2IgPSBDb2xvclV0aWwuSFNWMlJHQih0aGlzLl92YWx1ZUh1ZSwgdGhpcy5fdmFsdWVTYXQsIHRoaXMuX3ZhbHVlVmFsKTtcbiAgICAgICAgdGhpcy5fc2V0Q29sb3JSR0IocmdiWzBdLCByZ2JbMV0sIHJnYlsyXSk7XG4gICAgfSxcblxuICAgIF91cGRhdGVDb2xvckhFWEZyb21SR0I6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGhleCA9IENvbG9yVXRpbC5SR0IySEVYKHRoaXMuX3ZhbHVlUiwgdGhpcy5fdmFsdWVHLCB0aGlzLl92YWx1ZUIpO1xuICAgICAgICB0aGlzLl9zZXRDb2xvckhFWChoZXgpO1xuICAgIH0sXG5cbiAgICBfdXBkYXRlQ29sb3JGcm9tSEVYOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciByZ2IgPSBDb2xvclV0aWwuSEVYMlJHQih0aGlzLl92YWx1ZUhFWCk7XG5cbiAgICAgICAgdGhpcy5fc2V0Q29sb3JSR0IocmdiWzBdLCByZ2JbMV0sIHJnYlsyXSk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySFNWRnJvbVJHQigpO1xuICAgICAgICB0aGlzLl91cGRhdGVIYW5kbGVzKCk7XG4gICAgfSxcblxuICAgIF91cGRhdGVDb250cmFzdEN1cnJDb2xvcjogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9zZXRDb250cmFzdEN1cnJDb2xvcih0aGlzLl92YWx1ZVIsIHRoaXMuX3ZhbHVlRywgdGhpcy5fdmFsdWVCKTtcbiAgICB9LFxuICAgIF91cGRhdGVDb250cmFzdFByZXZDb2xvcjogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9zZXRDb250cmFzUHJldkNvbG9yKHRoaXMuX3ZhbHVlUiwgdGhpcy5fdmFsdWVHLCB0aGlzLl92YWx1ZUIpXG4gICAgfSxcblxuICAgIF9zZXRDb250cmFzdEN1cnJDb2xvcjogZnVuY3Rpb24gKHIsIGcsIGIpIHtcbiAgICAgICAgdGhpcy5fY29sb3JDdXJyTm9kZS5zZXRTdHlsZVByb3BlcnR5KCdiYWNrZ3JvdW5kJywgJ3JnYignICsgciArICcsJyArIGcgKyAnLCcgKyBiICsgJyknKVxuICAgIH0sXG4gICAgX3NldENvbnRyYXNQcmV2Q29sb3I6IGZ1bmN0aW9uIChyLCBnLCBiKSB7XG4gICAgICAgIHRoaXMuX2NvbG9yUHJldk5vZGUuc2V0U3R5bGVQcm9wZXJ0eSgnYmFja2dyb3VuZCcsICdyZ2IoJyArIHIgKyAnLCcgKyBnICsgJywnICsgYiArICcpJylcbiAgICB9LFxuXG4gICAgX29uSGVhZERyYWdTdGFydDogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbm9kZSA9IHRoaXMuX25vZGUsXG4gICAgICAgICAgICBwYXJlbnROb2RlID0gdGhpcy5fcGFyZW50Tm9kZTtcblxuICAgICAgICB2YXIgbm9kZVBvcyA9IG5vZGUuZ2V0UG9zaXRpb25HbG9iYWwoKSxcbiAgICAgICAgICAgIG1vdXNlUG9zID0gTW91c2UuZ2V0KCkuZ2V0UG9zaXRpb24oKSxcbiAgICAgICAgICAgIG9mZnNldFBvcyA9IHRoaXMuX21vdXNlT2Zmc2V0O1xuXG4gICAgICAgIG9mZnNldFBvc1swXSA9IG1vdXNlUG9zWzBdIC0gbm9kZVBvc1swXTtcbiAgICAgICAgb2Zmc2V0UG9zWzFdID0gbW91c2VQb3NbMV0gLSBub2RlUG9zWzFdO1xuXG4gICAgICAgIHZhciBldmVudE1vdXNlTW92ZSA9IERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSxcbiAgICAgICAgICAgIGV2ZW50TW91c2VVcCA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIHZhciBvbkRyYWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlUG9zaXRpb24oKTtcbiAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVDYW52YXNOb2RlUG9zaXRpb25zKCk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvbkRyYWdFbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlQ2FudmFzTm9kZVBvc2l0aW9ucygpO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZU1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgcGFyZW50Tm9kZS5yZW1vdmVDaGlsZChub2RlKTtcbiAgICAgICAgcGFyZW50Tm9kZS5hZGRDaGlsZChub2RlKTtcblxuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlVXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xuXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNhbnZhc05vZGVQb3NpdGlvbnMoKTtcbiAgICB9LFxuXG4gICAgX3VwZGF0ZVBvc2l0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBtb3VzZVBvcyA9IE1vdXNlLmdldCgpLmdldFBvc2l0aW9uKCksXG4gICAgICAgICAgICBvZmZzZXRQb3MgPSB0aGlzLl9tb3VzZU9mZnNldDtcblxuICAgICAgICB2YXIgY3VyclBvc2l0aW9uWCA9IG1vdXNlUG9zWzBdIC0gb2Zmc2V0UG9zWzBdLFxuICAgICAgICAgICAgY3VyclBvc2l0aW9uWSA9IG1vdXNlUG9zWzFdIC0gb2Zmc2V0UG9zWzFdO1xuXG4gICAgICAgIHZhciBub2RlID0gdGhpcy5fbm9kZSxcbiAgICAgICAgICAgIGhlYWQgPSB0aGlzLl9oZWFkTm9kZSxcbiAgICAgICAgICAgIHBvc2l0aW9uID0gdGhpcy5fcG9zaXRpb247XG5cbiAgICAgICAgdmFyIG1heFggPSB3aW5kb3cuaW5uZXJXaWR0aCAtIG5vZGUuZ2V0V2lkdGgoKSxcbiAgICAgICAgICAgIG1heFkgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSBoZWFkLmdldEhlaWdodCgpO1xuXG4gICAgICAgIHBvc2l0aW9uWzBdID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oY3VyclBvc2l0aW9uWCwgbWF4WCkpO1xuICAgICAgICBwb3NpdGlvblsxXSA9IE1hdGgubWF4KDAsIE1hdGgubWluKGN1cnJQb3NpdGlvblksIG1heFkpKTtcblxuICAgICAgICBub2RlLnNldFBvc2l0aW9uR2xvYmFsKHBvc2l0aW9uWzBdLCBwb3NpdGlvblsxXSk7XG4gICAgfSxcblxuICAgIF9kcmF3Q2FudmFzRmllbGQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhc0ZpZWxkLFxuICAgICAgICAgICAgY29udGV4dCA9IHRoaXMuX2NvbnRleHRDYW52YXNGaWVsZDtcblxuICAgICAgICB2YXIgd2lkdGggPSBjYW52YXMud2lkdGgsXG4gICAgICAgICAgICBoZWlnaHQgPSBjYW52YXMuaGVpZ2h0LFxuICAgICAgICAgICAgaW52V2lkdGggPSAxIC8gd2lkdGgsXG4gICAgICAgICAgICBpbnZIZWlnaHQgPSAxIC8gaGVpZ2h0O1xuXG4gICAgICAgIHZhciBpbWFnZURhdGEgPSB0aGlzLl9pbWFnZURhdGFGaWVsZCxcbiAgICAgICAgICAgIHJnYiA9IFtdLFxuICAgICAgICAgICAgaW5kZXggPSAwO1xuXG4gICAgICAgIHZhciB2YWx1ZUh1ZSA9IHRoaXMuX3ZhbHVlSHVlO1xuXG4gICAgICAgIHZhciBpID0gLTEsIGo7XG4gICAgICAgIHdoaWxlICgrK2kgPCBoZWlnaHQpIHtcbiAgICAgICAgICAgIGogPSAtMTtcblxuICAgICAgICAgICAgd2hpbGUgKCsraiA8IHdpZHRoKSB7XG4gICAgICAgICAgICAgICAgcmdiID0gQ29sb3JVdGlsLkhTVjJSR0IodmFsdWVIdWUsIGogKiBpbnZXaWR0aCAqIDEwMC4wLCAoIDEuMCAtIGkgKiBpbnZIZWlnaHQgKSAqIDEwMC4wKTtcbiAgICAgICAgICAgICAgICBpbmRleCA9IChpICogd2lkdGggKyBqKSAqIDQ7XG5cbiAgICAgICAgICAgICAgICBpbWFnZURhdGEuZGF0YVtpbmRleF0gPSByZ2JbMF07XG4gICAgICAgICAgICAgICAgaW1hZ2VEYXRhLmRhdGFbaW5kZXggKyAxXSA9IHJnYlsxXTtcbiAgICAgICAgICAgICAgICBpbWFnZURhdGEuZGF0YVtpbmRleCArIDJdID0gcmdiWzJdO1xuICAgICAgICAgICAgICAgIGltYWdlRGF0YS5kYXRhW2luZGV4ICsgM10gPSAyNTU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb250ZXh0LnB1dEltYWdlRGF0YShpbWFnZURhdGEsIDAsIDApO1xuICAgIH0sXG5cbiAgICBfZHJhd0NhbnZhc1NsaWRlcjogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzU2xpZGVyLFxuICAgICAgICAgICAgY29udGV4dCA9IHRoaXMuX2NvbnRleHRDYW52YXNTbGlkZXI7XG5cbiAgICAgICAgdmFyIHdpZHRoID0gY2FudmFzLndpZHRoLFxuICAgICAgICAgICAgaGVpZ2h0ID0gY2FudmFzLmhlaWdodCxcbiAgICAgICAgICAgIGludkhlaWdodCA9IDEgLyBoZWlnaHQ7XG5cbiAgICAgICAgdmFyIGltYWdlRGF0YSA9IHRoaXMuX2ltYWdlRGF0YVNsaWRlcixcbiAgICAgICAgICAgIHJnYiA9IFtdLFxuICAgICAgICAgICAgaW5kZXggPSAwO1xuXG4gICAgICAgIHZhciBpID0gLTEsIGo7XG4gICAgICAgIHdoaWxlICgrK2kgPCBoZWlnaHQpIHtcbiAgICAgICAgICAgIGogPSAtMTtcblxuICAgICAgICAgICAgd2hpbGUgKCsraiA8IHdpZHRoKSB7XG4gICAgICAgICAgICAgICAgcmdiID0gQ29sb3JVdGlsLkhTVjJSR0IoKDEuMCAtIGkgKiBpbnZIZWlnaHQpICogMzYwLjAsIDEwMC4wLCAxMDAuMCk7XG4gICAgICAgICAgICAgICAgaW5kZXggPSAoaSAqIHdpZHRoICsgaikgKiA0O1xuXG4gICAgICAgICAgICAgICAgaW1hZ2VEYXRhLmRhdGFbaW5kZXhdID0gcmdiWzBdO1xuICAgICAgICAgICAgICAgIGltYWdlRGF0YS5kYXRhW2luZGV4ICsgMV0gPSByZ2JbMV07XG4gICAgICAgICAgICAgICAgaW1hZ2VEYXRhLmRhdGFbaW5kZXggKyAyXSA9IHJnYlsyXTtcbiAgICAgICAgICAgICAgICBpbWFnZURhdGEuZGF0YVtpbmRleCArIDNdID0gMjU1O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29udGV4dC5wdXRJbWFnZURhdGEoaW1hZ2VEYXRhLCAwLCAwKTtcblxuICAgIH0sXG5cbiAgICBfb25DYW52YXNGaWVsZE1vdXNlRG93bjogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgZXZlbnRNb3VzZU1vdmUgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsXG4gICAgICAgICAgICBldmVudE1vdXNlVXAgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX1VQO1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICB2YXIgb25EcmFnID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNlbGYuX2RyYXdIYW5kbGVGaWVsZCgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRHJhZ0VuZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW91c2VNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW91c2VVcCwgb25EcmFnRW5kLCBmYWxzZSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZU1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VVcCwgb25EcmFnRW5kLCBmYWxzZSk7XG5cbiAgICAgICAgc2VsZi5fZHJhd0hhbmRsZUZpZWxkKCk7XG4gICAgfSxcblxuICAgIF9vbkNhbnZhc1NsaWRlck1vdXNlRG93bjogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgZXZlbnRNb3VzZU1vdmUgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsXG4gICAgICAgICAgICBldmVudE1vdXNlVXAgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX1VQO1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICB2YXIgb25EcmFnID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNlbGYuX2RyYXdIYW5kbGVTbGlkZXIoKTtcbiAgICAgICAgICAgICAgICBzZWxmLl9kcmF3Q2FudmFzRmllbGQoKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIG9uRHJhZ0VuZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW91c2VNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW91c2VVcCwgb25EcmFnRW5kLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgc2VsZi5fZHJhd0NhbnZhc0ZpZWxkKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZU1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VVcCwgb25EcmFnRW5kLCBmYWxzZSk7XG5cbiAgICAgICAgc2VsZi5fZHJhd0hhbmRsZVNsaWRlcigpO1xuICAgICAgICBzZWxmLl9kcmF3Q2FudmFzRmllbGQoKTtcbiAgICB9LFxuXG4gICAgX3NldFNpemVDYW52YXNGaWVsZDogZnVuY3Rpb24gKHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhc0ZpZWxkO1xuICAgICAgICBjYW52YXMuc3R5bGUud2lkdGggPSB3aWR0aCArICdweCc7XG4gICAgICAgIGNhbnZhcy5zdHlsZS5oZWlnaHQgPSBoZWlnaHQgKyAncHgnO1xuICAgICAgICBjYW52YXMud2lkdGggPSB3aWR0aDtcbiAgICAgICAgY2FudmFzLmhlaWdodCA9IGhlaWdodDtcblxuICAgIH0sXG5cbiAgICBfc2V0U2l6ZUNhbnZhc1NsaWRlcjogZnVuY3Rpb24gKHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhc1NsaWRlcjtcbiAgICAgICAgY2FudmFzLnN0eWxlLndpZHRoID0gd2lkdGggKyAncHgnO1xuICAgICAgICBjYW52YXMuc3R5bGUuaGVpZ2h0ID0gaGVpZ2h0ICsgJ3B4JztcbiAgICAgICAgY2FudmFzLndpZHRoID0gd2lkdGg7XG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgfSxcblxuICAgIG9wZW46IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG5vZGUgPSB0aGlzLl9ub2RlO1xuXG4gICAgICAgIHRoaXMuX3BhcmVudE5vZGUuYWRkQ2hpbGQobm9kZSk7XG5cbiAgICAgICAgdmFyIHBvc2l0aW9uID0gdGhpcy5fcG9zaXRpb247XG4gICAgICAgIGlmKHBvc2l0aW9uWzBdID09PSBudWxsIHx8IHBvc2l0aW9uWzFdID09PSBudWxsKXtcbiAgICAgICAgICAgIHBvc2l0aW9uWzBdID0gd2luZG93LmlubmVyV2lkdGggKiAwLjUgLSBub2RlLmdldFdpZHRoKCkgKiAwLjU7XG4gICAgICAgICAgICBwb3NpdGlvblsxXSA9IHdpbmRvdy5pbm5lckhlaWdodCAqIDAuNSAtIG5vZGUuZ2V0SGVpZ2h0KCkgKiAwLjU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwb3NpdGlvblswXSA9IE1hdGgubWF4KDAsTWF0aC5taW4ocG9zaXRpb25bMF0sd2luZG93LmlubmVyV2lkdGggLSBub2RlLmdldFdpZHRoKCkpKTtcbiAgICAgICAgICAgIHBvc2l0aW9uWzFdID0gTWF0aC5tYXgoMCxNYXRoLm1pbihwb3NpdGlvblsxXSx3aW5kb3cuaW5uZXJIZWlnaHQgLSBub2RlLmdldEhlaWdodCgpKSk7XG4gICAgICAgIH1cblxuICAgICAgICBub2RlLnNldFBvc2l0aW9uR2xvYmFsKHBvc2l0aW9uWzBdLHBvc2l0aW9uWzFdKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ2FudmFzTm9kZVBvc2l0aW9ucygpO1xuICAgIH0sXG5cbiAgICBjbG9zZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMuX25vZGUpO1xuICAgIH0sXG5cbiAgICBfb25DbG9zZTogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgZS5jYW5jZWxCdWJibGUgPSB0cnVlO1xuICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgfSxcbiAgICBfb25QaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2NhbGxiYWNrUGljaygpO1xuICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgfSxcblxuICAgIF91cGRhdGVDYW52YXNOb2RlUG9zaXRpb25zOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjYW52YXNTbGlkZXJQb3MgPSB0aGlzLl9jYW52YXNTbGlkZXJQb3MsXG4gICAgICAgICAgICBjYW52YXNGaWVsZFBvcyA9IHRoaXMuX2NhbnZhc0ZpZWxkUG9zO1xuXG4gICAgICAgIGNhbnZhc1NsaWRlclBvc1swXSA9IGNhbnZhc1NsaWRlclBvc1sxXSA9IDA7XG4gICAgICAgIGNhbnZhc0ZpZWxkUG9zWzBdID0gY2FudmFzRmllbGRQb3NbMV0gPSAwO1xuXG4gICAgICAgIHZhciBlbGVtZW50ID0gdGhpcy5fY2FudmFzU2xpZGVyO1xuXG4gICAgICAgIHdoaWxlIChlbGVtZW50KSB7XG4gICAgICAgICAgICBjYW52YXNTbGlkZXJQb3NbMF0gKz0gZWxlbWVudC5vZmZzZXRMZWZ0O1xuICAgICAgICAgICAgY2FudmFzU2xpZGVyUG9zWzFdICs9IGVsZW1lbnQub2Zmc2V0VG9wO1xuICAgICAgICAgICAgZWxlbWVudCA9IGVsZW1lbnQub2Zmc2V0UGFyZW50O1xuICAgICAgICB9XG5cbiAgICAgICAgZWxlbWVudCA9IHRoaXMuX2NhbnZhc0ZpZWxkO1xuXG4gICAgICAgIHdoaWxlIChlbGVtZW50KSB7XG4gICAgICAgICAgICBjYW52YXNGaWVsZFBvc1swXSArPSBlbGVtZW50Lm9mZnNldExlZnQ7XG4gICAgICAgICAgICBjYW52YXNGaWVsZFBvc1sxXSArPSBlbGVtZW50Lm9mZnNldFRvcDtcbiAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50Lm9mZnNldFBhcmVudDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBzZXRDYWxsYmFja1BpY2s6IGZ1bmN0aW9uIChmdW5jKSB7XG4gICAgICAgIHRoaXMuX2NhbGxiYWNrUGljayA9IGZ1bmM7XG4gICAgfSxcblxuICAgIHNldENvbG9ySEVYOiBmdW5jdGlvbiAoaGV4KSB7XG4gICAgICAgIHRoaXMuX3NldENvbG9ySEVYKGhleCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9yRnJvbUhFWCgpO1xuICAgICAgICB0aGlzLl9zZXRDb2xvcigpO1xuICAgIH0sXG5cbiAgICBzZXRDb2xvclJHQjogZnVuY3Rpb24gKHIsIGcsIGIpIHtcbiAgICAgICAgdGhpcy5fc2V0Q29sb3JSR0IociwgZywgYik7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySEVYRnJvbVJHQigpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhTVkZyb21SR0IoKTtcbiAgICAgICAgdGhpcy5fc2V0Q29sb3IoKTtcbiAgICB9LFxuXG4gICAgc2V0Q29sb3JSR0JmdjogZnVuY3Rpb24gKHIsIGcsIGIpIHtcbiAgICAgICAgdGhpcy5zZXRDb2xvclJHQihNYXRoLmZsb29yKHIgKiAyNTUuMCksXG4gICAgICAgICAgICBNYXRoLmZsb29yKGcgKiAyNTUuMCksXG4gICAgICAgICAgICBNYXRoLmZsb29yKGIgKiAyNTUuMCkpO1xuICAgIH0sXG5cbiAgICBzZXRDb2xvckhTVjogZnVuY3Rpb24gKGgsIHMsIHYpIHtcbiAgICAgICAgdGhpcy5fc2V0Q29sb3JIU1YoaCwgcywgdik7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9yUkdCRnJvbUhTVigpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhFWEZyb21SR0IoKTtcbiAgICAgICAgdGhpcy5fc2V0Q29sb3IoKTtcbiAgICB9LFxuXG4gICAgX3NldENvbG9yOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2RyYXdDYW52YXNGaWVsZCgpO1xuICAgICAgICB0aGlzLl9kcmF3Q2FudmFzU2xpZGVyKCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUhhbmRsZXMoKTtcbiAgICAgICAgdGhpcy5fc2V0Q29udHJhc1ByZXZDb2xvcih0aGlzLl92YWx1ZVIsIHRoaXMuX3ZhbHVlRywgdGhpcy5fdmFsdWVCKTtcbiAgICB9LFxuXG4gICAgZ2V0UjogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdmFsdWVSO1xuICAgIH0sXG4gICAgZ2V0RzogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdmFsdWVHO1xuICAgIH0sXG4gICAgZ2V0QjogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdmFsdWVCO1xuICAgIH0sXG4gICAgZ2V0UkdCOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBbdGhpcy5fdmFsdWVSLCB0aGlzLl92YWx1ZUcsIHRoaXMuX3ZhbHVlQl07XG4gICAgfSxcbiAgICBnZXRIdWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3ZhbHVlSHVlO1xuICAgIH0sXG4gICAgZ2V0U2F0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl92YWx1ZVNhdDtcbiAgICB9LFxuICAgIGdldFZhbDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdmFsdWVWYWw7XG4gICAgfSxcbiAgICBnZXRIU1Y6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIFt0aGlzLl92YWx1ZUh1ZSwgdGhpcy5fdmFsdWVTYXQsIHRoaXMuX3ZhbHVlVmFsXTtcbiAgICB9LFxuICAgIGdldEhFWDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdmFsdWVIRVg7XG4gICAgfSxcbiAgICBnZXRSR0JmdjogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gW3RoaXMuX3ZhbHVlUiAvIDI1NS4wLCB0aGlzLl92YWx1ZUcgLyAyNTUuMCwgdGhpcy5fdmFsdWVCIC8gMjU1LjBdO1xuICAgIH0sXG5cbiAgICBnZXROb2RlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9ub2RlO1xuICAgIH1cbn07XG5cblBpY2tlci5zZXR1cCA9IGZ1bmN0aW9uIChwYXJlbnROb2RlKSB7XG4gICAgcmV0dXJuIFBpY2tlci5faW5zdGFuY2UgPSBuZXcgUGlja2VyKHBhcmVudE5vZGUpO1xufTtcblBpY2tlci5nZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFBpY2tlci5faW5zdGFuY2U7XG59O1xuUGlja2VyLmRlc3Ryb3kgPSBmdW5jdGlvbigpe1xuICAgIFBpY2tlci5faW5zdGFuY2UgPSBudWxsO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQaWNrZXI7IiwidmFyIFNWR0NvbXBvbmVudCA9IHJlcXVpcmUoJy4vU1ZHQ29tcG9uZW50Jyk7XG5cbmZ1bmN0aW9uIFBsb3R0ZXIocGFyZW50LG9iamVjdCx2YWx1ZSxwYXJhbXMpIHtcbiAgICBwYXJhbXMgPSBwYXJhbXMgfHwge307XG4gICAgcGFyYW1zLmxpbmVXaWR0aCAgPSBwYXJhbXMubGluZVdpZHRoICB8fCAyO1xuICAgIHBhcmFtcy5saW5lQ29sb3IgID0gcGFyYW1zLmxpbmVDb2xvciAgfHwgWzI1NSwyNTUsMjU1XTtcblxuICAgIFNWR0NvbXBvbmVudC5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cbiAgICB2YXIgbGluZVdpZHRoID0gdGhpcy5fbGluZVdpZHRoID0gcGFyYW1zLmxpbmVXaWR0aDtcbiAgICB2YXIgbGluZUNvbG9yID0gcGFyYW1zLmxpbmVDb2xvcjtcblxuICAgIHZhciBncmlkID0gdGhpcy5fZ3JpZCA9IHRoaXMuX3N2Z1Jvb3QuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdwYXRoJykpO1xuICAgICAgICBncmlkLnN0eWxlLnN0cm9rZSA9ICdyZ2IoMjYsMjksMzEpJztcblxuICAgIHZhciBwYXRoID0gdGhpcy5fcGF0aCA9IHRoaXMuX3N2Z1Jvb3QuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdwYXRoJykpO1xuICAgICAgICBwYXRoLnN0eWxlLnN0cm9rZSAgICAgID0gJ3JnYignK2xpbmVDb2xvclswXSsnLCcrbGluZUNvbG9yWzFdKycsJytsaW5lQ29sb3JbMl0rJyknO1xuICAgICAgICBwYXRoLnN0eWxlLnN0cm9rZVdpZHRoID0gbGluZVdpZHRoIDtcbiAgICAgICAgcGF0aC5zdHlsZS5maWxsICAgICAgICA9ICdub25lJztcbn1cblBsb3R0ZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTVkdDb21wb25lbnQucHJvdG90eXBlKTtcblBsb3R0ZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gUGxvdHRlcjtcblxubW9kdWxlLmV4cG9ydHMgPSBQbG90dGVyO1xuIiwidmFyIE9iamVjdENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvT2JqZWN0Q29tcG9uZW50Jyk7XG52YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xudmFyIE51bWJlcklucHV0X0ludGVybmFsID0gcmVxdWlyZSgnLi9OdW1iZXJJbnB1dF9JbnRlcm5hbCcpO1xudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG5cbnZhciBFdmVudF8gICAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKTtcblxudmFyIERFRkFVTFRfU1RFUCA9IDEuMCxcbiAgICBERUZBVUxUX0RQICAgPSAyO1xuXG5mdW5jdGlvbiBSYW5nZShwYXJlbnQsIG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuICAgIE9iamVjdENvbXBvbmVudC5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cbiAgICBwYXJhbXMgICAgICAgICAgPSBwYXJhbXMgICAgICAgICAgfHwge307XG4gICAgcGFyYW1zLm9uQ2hhbmdlID0gcGFyYW1zLm9uQ2hhbmdlIHx8IHRoaXMuX29uQ2hhbmdlO1xuICAgIHBhcmFtcy5zdGVwICAgICA9IHBhcmFtcy5zdGVwIHx8IERFRkFVTFRfU1RFUDtcbiAgICBwYXJhbXMuZHAgICAgICAgPSBwYXJhbXMuZHAgICB8fCBERUZBVUxUX0RQO1xuXG4gICAgdGhpcy5fb25DaGFuZ2UgID0gcGFyYW1zLm9uQ2hhbmdlO1xuXG4gICAgdmFyIHN0ZXAgPSB0aGlzLl9zdGVwID0gcGFyYW1zLnN0ZXAsXG4gICAgICAgIGRwICAgPSB0aGlzLl9kcCAgID0gcGFyYW1zLmRwO1xuXG4gICAgLy9GSVhNRTogaGlzdG9yeSBwdXNoIHBvcFxuXG4gICAgdmFyIGxhYmVsTWluID0gbmV3IE5vZGUoKTtcbiAgICB2YXIgaW5wdXRNaW4gPSB0aGlzLl9pbnB1dE1pbiA9IG5ldyBOdW1iZXJJbnB1dF9JbnRlcm5hbChzdGVwLGRwLCB0aGlzLnB1c2hIaXN0b3J5U3RhdGUuYmluZCh0aGlzKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9vbklucHV0TWluQ2hhbmdlLmJpbmQodGhpcykpO1xuXG4gICAgdmFyIGxhYmVsTWF4ID0gbmV3IE5vZGUoKTtcbiAgICB2YXIgaW5wdXRNYXggPSB0aGlzLl9pbnB1dE1heCA9IG5ldyBOdW1iZXJJbnB1dF9JbnRlcm5hbChzdGVwLGRwLCB0aGlzLnB1c2hIaXN0b3J5U3RhdGUuYmluZCh0aGlzKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9vbklucHV0TWF4Q2hhbmdlLmJpbmQodGhpcykpO1xuXG4gICAgdmFyIGxhYmVsTWluV3JhcCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCksXG4gICAgICAgIGlucHV0TWluV3JhcCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCksXG4gICAgICAgIGxhYmVsTWF4V3JhcCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCksXG4gICAgICAgIGlucHV0TWF4V3JhcCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCk7XG5cbiAgICBsYWJlbE1pbi5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCkuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsICdNSU4nKTtcbiAgICBsYWJlbE1heC5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCkuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsICdNQVgnKTtcblxuICAgIHZhciB2YWx1ZXMgPSB0aGlzLl9vYmpbdGhpcy5fa2V5XTtcblxuICAgIGlucHV0TWluLnNldFZhbHVlKHZhbHVlc1swXSk7XG4gICAgaW5wdXRNYXguc2V0VmFsdWUodmFsdWVzWzFdKTtcblxuICAgIHZhciB3cmFwID0gdGhpcy5fd3JhcE5vZGU7XG5cbiAgICBsYWJlbE1pbldyYXAuYWRkQ2hpbGQobGFiZWxNaW4pO1xuICAgIGlucHV0TWluV3JhcC5hZGRDaGlsZChpbnB1dE1pbi5nZXROb2RlKCkpO1xuICAgIGxhYmVsTWF4V3JhcC5hZGRDaGlsZChsYWJlbE1heCk7XG4gICAgaW5wdXRNYXhXcmFwLmFkZENoaWxkKGlucHV0TWF4LmdldE5vZGUoKSk7XG5cbiAgICB3cmFwLmFkZENoaWxkKGxhYmVsTWluV3JhcCk7XG4gICAgd3JhcC5hZGRDaGlsZChpbnB1dE1pbldyYXApO1xuICAgIHdyYXAuYWRkQ2hpbGQobGFiZWxNYXhXcmFwKTtcbiAgICB3cmFwLmFkZENoaWxkKGlucHV0TWF4V3JhcCk7XG59XG5SYW5nZS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE9iamVjdENvbXBvbmVudC5wcm90b3R5cGUpO1xuUmFuZ2UucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gUmFuZ2U7XG5cblJhbmdlLnByb3RvdHlwZS5fb25JbnB1dENoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBDb21wb25lbnRFdmVudC5WQUxVRV9VUERBVEVELCBudWxsKSk7XG4gICAgdGhpcy5fb25DaGFuZ2UoKTtcbn07XG5cblJhbmdlLnByb3RvdHlwZS5fdXBkYXRlVmFsdWVNaW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHZhbHVlcyA9IHRoaXMuX29ialt0aGlzLl9rZXldO1xuXG4gICAgdmFyIGlucHV0TWluID0gdGhpcy5faW5wdXRNaW4sXG4gICAgICAgIGlucHV0VmFsdWUgPSBpbnB1dE1pbi5nZXRWYWx1ZSgpO1xuXG4gICAgaWYgKGlucHV0VmFsdWUgPj0gdGhpcy5faW5wdXRNYXguZ2V0VmFsdWUoKSkge1xuICAgICAgICBpbnB1dE1pbi5zZXRWYWx1ZSh2YWx1ZXNbMF0pO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhbHVlc1swXSA9IGlucHV0VmFsdWU7XG5cbn07XG5cblJhbmdlLnByb3RvdHlwZS5fdXBkYXRlVmFsdWVNYXggPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHZhbHVlcyA9IHRoaXMuX29ialt0aGlzLl9rZXldO1xuXG4gICAgdmFyIGlucHV0TWF4ID0gdGhpcy5faW5wdXRNYXgsXG4gICAgICAgIGlucHV0VmFsdWUgPSBpbnB1dE1heC5nZXRWYWx1ZSgpO1xuXG4gICAgaWYgKGlucHV0VmFsdWUgPD0gdGhpcy5faW5wdXRNaW4uZ2V0VmFsdWUoKSkge1xuICAgICAgICBpbnB1dE1heC5zZXRWYWx1ZSh2YWx1ZXNbMV0pO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhbHVlc1sxXSA9IGlucHV0VmFsdWU7XG59O1xuXG5cblJhbmdlLnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAoZS5kYXRhLm9yaWdpbiA9PSB0aGlzKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoZS5kYXRhLm9yaWdpbiA9PSBudWxsKSB7XG4gICAgfVxuICAgIHZhciBvID0gdGhpcy5fb2JqLGsgPSB0aGlzLl9rZXk7XG4gICAgdGhpcy5faW5wdXRNaW4uc2V0VmFsdWUob1trXVswXSk7XG4gICAgdGhpcy5faW5wdXRNYXguc2V0VmFsdWUob1trXVsxXSk7XG59O1xuXG5SYW5nZS5wcm90b3R5cGUuc2V0VmFsdWUgPSBmdW5jdGlvbih2YWx1ZSl7XG4gICAgdmFyIG8gPSB0aGlzLl9vYmosayA9IHRoaXMuX2tleTtcbiAgICBvW2tdWzBdID0gdmFsdWVbMF07XG4gICAgb1trXVsxXSA9IHZhbHVlWzFdO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCxudWxsKSk7XG59O1xuXG5SYW5nZS5wcm90b3R5cGUuX29uSW5wdXRNaW5DaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fdXBkYXRlVmFsdWVNaW4oKTtcbiAgICB0aGlzLl9vbklucHV0Q2hhbmdlKCk7XG59O1xuXG5SYW5nZS5wcm90b3R5cGUuX29uSW5wdXRNYXhDaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fdXBkYXRlVmFsdWVNYXgoKTtcbiAgICB0aGlzLl9vbklucHV0Q2hhbmdlKCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJhbmdlOyIsInZhciBDb21wb25lbnQgPSByZXF1aXJlKCcuLy4uL2NvcmUvQ29tcG9uZW50Jyk7XG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcbnZhciBNZXRyaWMgPSByZXF1aXJlKCcuL01ldHJpYycpO1xudmFyIEdyb3VwRXZlbnQgPSByZXF1aXJlKCcuLi9ncm91cC9Hcm91cEV2ZW50Jyk7XG5cbmZ1bmN0aW9uIFNWRyhwYXJlbnQsIHBhcmFtcykge1xuICAgIENvbXBvbmVudC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgdmFyIHdyYXAgPSB0aGlzLl93cmFwTm9kZTtcbiAgICAgICAgd3JhcC5zZXRTdHlsZUNsYXNzKENTUy5DYW52YXNXcmFwKTtcbiAgICB2YXIgd3JhcFNpemUgPSB3cmFwLmdldFdpZHRoKCk7XG5cbiAgICB2YXIgc3ZnID0gdGhpcy5fc3ZnID0gdGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdzdmcnKTtcbiAgICAgICAgc3ZnLnNldEF0dHJpYnV0ZSgndmVyc2lvbicsICcxLjInKTtcbiAgICAgICAgc3ZnLnNldEF0dHJpYnV0ZSgnYmFzZVByb2ZpbGUnLCAndGlueScpO1xuICAgICAgICBzdmcuc2V0QXR0cmlidXRlKCdwcmVzZXJ2ZUFzcGVjdFJhdGlvJywgJ3RydWUnKTtcblxuICAgIHdyYXAuZ2V0RWxlbWVudCgpLmFwcGVuZENoaWxkKHN2Zyk7XG5cbiAgICB0aGlzLl9zdmdTZXRTaXplKHdyYXBTaXplLCB3cmFwU2l6ZSk7XG4gICAgdGhpcy5fdXBkYXRlSGVpZ2h0KCk7XG5cbiAgICB0aGlzLl9ub2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkNhbnZhc0xpc3RJdGVtKTtcblxuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UsIHRoaXMsICdvbkdyb3VwU2l6ZUNoYW5nZScpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LkdST1VQX1NJWkVfVVBEQVRFLCB0aGlzLl9wYXJlbnQsICdvbkdyb3VwU2l6ZVVwZGF0ZScpO1xufVxuU1ZHLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoQ29tcG9uZW50LnByb3RvdHlwZSk7XG5TVkcucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU1ZHO1xuXG5TVkcucHJvdG90eXBlLl91cGRhdGVIZWlnaHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHN2Z0hlaWdodCA9IE51bWJlcih0aGlzLl9zdmcuZ2V0QXR0cmlidXRlKCdoZWlnaHQnKSk7XG4gICAgdGhpcy5fd3JhcE5vZGUuc2V0SGVpZ2h0KHN2Z0hlaWdodCk7XG4gICAgdGhpcy5fbm9kZS5zZXRIZWlnaHQoc3ZnSGVpZ2h0ICsgTWV0cmljLlBBRERJTkdfV1JBUFBFUik7XG59O1xuXG5TVkcucHJvdG90eXBlLm9uR3JvdXBTaXplQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB3aWR0aCA9IHRoaXMuX3dyYXBOb2RlLmdldFdpZHRoKCk7XG4gICAgdGhpcy5fc3ZnU2V0U2l6ZSh3aWR0aCwgd2lkdGgpO1xuICAgIHRoaXMuX3VwZGF0ZUhlaWdodCgpO1xufTtcblxuU1ZHLnByb3RvdHlwZS5fc3ZnU2V0U2l6ZSA9IGZ1bmN0aW9uICh3aWR0aCwgaGVpZ2h0KSB7XG4gICAgdmFyIHN2ZyA9IHRoaXMuX3N2ZztcbiAgICBzdmcuc2V0QXR0cmlidXRlKCd3aWR0aCcsIHdpZHRoKTtcbiAgICBzdmcuc2V0QXR0cmlidXRlKCdoZWlnaHQnLCBoZWlnaHQpO1xuICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ3ZpZXdib3gnLCAnMCAwICcgKyB3aWR0aCArICcgJyArIGhlaWdodCk7XG59O1xuXG5TVkcucHJvdG90eXBlLmdldFNWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fc3ZnO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTVkc7IiwidmFyIE9iamVjdENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvT2JqZWN0Q29tcG9uZW50Jyk7XG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcbnZhciBHcm91cEV2ZW50ID0gcmVxdWlyZSgnLi4vZ3JvdXAvR3JvdXBFdmVudCcpO1xudmFyIE1ldHJpYyA9IHJlcXVpcmUoJy4vTWV0cmljJyk7XG5cbmZ1bmN0aW9uIFNWR0NvbXBvbmVudChwYXJlbnQsb2JqZWN0LHZhbHVlLHBhcmFtcyl7XG4gICAgT2JqZWN0Q29tcG9uZW50LmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuICAgIHZhciB3cmFwID0gdGhpcy5fd3JhcE5vZGU7XG4gICAgICAgIHdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuU1ZHV3JhcCk7XG4gICAgdmFyIHdyYXBTaXplID0gd3JhcC5nZXRXaWR0aCgpO1xuXG4gICAgdmFyIHN2ZyA9IHRoaXMuX3N2ZyA9IHRoaXMuX2NyZWF0ZVNWR09iamVjdCgnc3ZnJyk7XG4gICAgICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ3ZlcnNpb24nLCAnMS4yJyk7XG4gICAgICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ2Jhc2VQcm9maWxlJywgJ3RpbnknKTtcblxuICAgICAgICB3cmFwLmdldEVsZW1lbnQoKS5hcHBlbmRDaGlsZChzdmcpO1xuXG4gICAgdmFyIHN2Z1Jvb3QgPSB0aGlzLl9zdmdSb290ID0gc3ZnLmFwcGVuZENoaWxkKHRoaXMuX2NyZWF0ZVNWR09iamVjdCgnZycpKTtcbiAgICAgICAgc3ZnUm9vdC5zZXRBdHRyaWJ1dGUoJ3RyYW5zZm9ybScsJ3RyYW5zbGF0ZSgwLjUgMC41KScpO1xuXG4gICAgdGhpcy5fc3ZnU2V0U2l6ZSh3cmFwU2l6ZSx3cmFwU2l6ZSk7XG4gICAgdGhpcy5fdXBkYXRlSGVpZ2h0KCk7XG5cbiAgICB0aGlzLl9ub2RlLnNldFN0eWxlQ2xhc3MoQ1NTLlNWR0xpc3RJdGVtKTtcblxuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UsIHRoaXMsICdvbkdyb3VwU2l6ZUNoYW5nZScpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LkdST1VQX1NJWkVfVVBEQVRFLCB0aGlzLl9wYXJlbnQsICdvbkdyb3VwU2l6ZVVwZGF0ZScpO1xufVxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZSk7XG5TVkdDb21wb25lbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU1ZHQ29tcG9uZW50O1xuXG5TVkdDb21wb25lbnQucHJvdG90eXBlLl91cGRhdGVIZWlnaHQgPSBmdW5jdGlvbigpe1xuICAgIHZhciBzdmdIZWlnaHQgPSBOdW1iZXIodGhpcy5fc3ZnLmdldEF0dHJpYnV0ZSgnaGVpZ2h0JykpO1xuXG4gICAgdGhpcy5fd3JhcE5vZGUuc2V0SGVpZ2h0KHN2Z0hlaWdodCk7XG4gICAgdGhpcy5fbm9kZS5zZXRIZWlnaHQoc3ZnSGVpZ2h0ICsgTWV0cmljLlBBRERJTkdfV1JBUFBFUik7XG59O1xuXG5TVkdDb21wb25lbnQucHJvdG90eXBlLl9yZWRyYXcgPSBmdW5jdGlvbigpe307XG5cblNWR0NvbXBvbmVudC5wcm90b3R5cGUub25Hcm91cFNpemVDaGFuZ2UgPSBmdW5jdGlvbigpe1xuICAgIHZhciB3aWR0aCA9IHRoaXMuX3dyYXBOb2RlLmdldFdpZHRoKCk7XG5cbiAgICB0aGlzLl9zdmdTZXRTaXplKHdpZHRoLHdpZHRoKTtcbiAgICB0aGlzLl91cGRhdGVIZWlnaHQoKTtcbiAgICB0aGlzLl9yZWRyYXcoKTtcbn07XG5cblNWR0NvbXBvbmVudC5wcm90b3R5cGUuX2NyZWF0ZVNWR09iamVjdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIix0eXBlKTtcbn07XG5cblNWR0NvbXBvbmVudC5wcm90b3R5cGUuX3N2Z1NldFNpemUgPSBmdW5jdGlvbih3aWR0aCxoZWlnaHQpIHtcbiAgICB2YXIgc3ZnID0gdGhpcy5fc3ZnO1xuICAgICAgICBzdmcuc2V0QXR0cmlidXRlKCd3aWR0aCcsICB3aWR0aCk7XG4gICAgICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIGhlaWdodCk7XG4gICAgICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ3ZpZXdib3gnLCAnMCAwICcgKyB3aWR0aCArICcgJyArIGhlaWdodCk7XG59O1xuXG5cblNWR0NvbXBvbmVudC5wcm90b3R5cGUuX3BhdGhDbWRNb3ZlVG8gPSBmdW5jdGlvbiAoeCwgeSkge1xuICAgIHJldHVybiAnTSAnICsgeCArICcgJyArIHkgKyAnICc7XG59O1xuXG5TVkdDb21wb25lbnQucHJvdG90eXBlLl9wYXRoQ21kTGluZVRvID0gZnVuY3Rpb24gKHgsIHkpIHtcbiAgICByZXR1cm4gJ0wgJyArIHggKyAnICcgKyB5ICsgJyAnO1xufTtcblxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5fcGF0aENtZENsb3NlID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAnWic7XG59O1xuXG5TVkdDb21wb25lbnQucHJvdG90eXBlLl9wYXRoQ21kTGluZSA9IGZ1bmN0aW9uICh4MCwgeTAsIHgxLCB5MSkge1xuICAgIHJldHVybiAnTSAnICsgeDAgKyAnICcgKyB5MCArICcgTCAnICsgeDEgKyAnICcgKyB5MTtcbn07XG5cblNWR0NvbXBvbmVudC5wcm90b3R5cGUuX3BhdGhDbWRCZXppZXJDdWJpYyA9IGZ1bmN0aW9uIChjbWQsIHgwLCB5MCwgY3gwLCBjeTAsIGN4MSwgY3kxLCB4MSwgeTEpIHtcbiAgICByZXR1cm4gJ00gJyArIHgwICsgJyAnICsgeTAgKyAnIEMgJyArIGN4MCArICcgJyArIGN5MCArICcsICcgKyBjeDEgKyAnICcgKyBjeTEgKyAnLCAnICsgeDEgKyAnICcgKyB5MTtcbn07XG5cblNWR0NvbXBvbmVudC5wcm90b3R5cGUuX3BhdGhDbWRCZXppZXJRdWFkcmF0aWMgPSBmdW5jdGlvbiAoY21kLCB4MCwgeTAsIGN4LCBjeSwgeDEsIHkxKSB7XG4gICAgcmV0dXJuICdNICcgKyB4MCArICcgJyArIHkwICsgJyBRICcgKyBjeCArICcgJyArIGN5ICsgJywgJyArIHgxICsgJyAnICsgeTE7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNWR0NvbXBvbmVudDsiLCJ2YXIgT2JqZWN0Q29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY29yZS9PYmplY3RDb21wb25lbnQnKTtcbnZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XG52YXIgQ1NTICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG5cbnZhciBPcHRpb25zID0gcmVxdWlyZSgnLi9PcHRpb25zJyk7XG5cbnZhciBIaXN0b3J5ID0gcmVxdWlyZSgnLi4vY29yZS9IaXN0b3J5Jyk7XG5cbnZhciBFdmVudF8gICAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcbiAgICBOb2RlRXZlbnQgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50JyksXG4gICAgQ29tcG9uZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL0NvbXBvbmVudEV2ZW50JyksXG4gICAgT3B0aW9uRXZlbnQgICAgPSByZXF1aXJlKCcuLi9jb3JlL09wdGlvbkV2ZW50Jyk7XG5cbnZhciBPYmplY3RDb21wb25lbnROb3RpZmllciA9IHJlcXVpcmUoJy4uL2NvcmUvT2JqZWN0Q29tcG9uZW50Tm90aWZpZXInKTtcblxudmFyIFNUUl9DSE9PU0UgPSAnQ2hvb3NlIC4uLic7XG5cbmZ1bmN0aW9uIFNlbGVjdChwYXJlbnQsIG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuICAgIE9iamVjdENvbXBvbmVudC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgcGFyYW1zID0gcGFyYW1zIHx8IHt9O1xuICAgIHBhcmFtcy5vbkNoYW5nZSA9IHBhcmFtcy5vbkNoYW5nZSB8fCB0aGlzLl9vbkNoYW5nZTtcbiAgICB0aGlzLl9vbkNoYW5nZSA9IHBhcmFtcy5vbkNoYW5nZTtcblxuICAgIHZhciBvYmogPSB0aGlzLl9vYmosXG4gICAgICAgIGtleSA9IHRoaXMuX2tleTtcblxuICAgIHZhciB0YXJnZXRLZXkgPSB0aGlzLl90YXJnZXRLZXkgPSBwYXJhbXMudGFyZ2V0LFxuICAgICAgICB2YWx1ZXMgPSB0aGlzLl92YWx1ZXMgPSBvYmpba2V5XTtcblxuXG4gICAgdGhpcy5fc2VsZWN0ZWRJbmRleCA9IC0xO1xuICAgIHRoaXMuX3NlbGVjdGVkID0gbnVsbDtcblxuICAgIHZhciBzZWxlY3QgPSB0aGlzLl9zZWxlY3QgPSBuZXcgTm9kZShOb2RlLklOUFVUX0JVVFRPTik7XG4gICAgICAgIHNlbGVjdC5zZXRTdHlsZUNsYXNzKENTUy5TZWxlY3QpO1xuICAgICAgICBzZWxlY3QuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25PcHRpb25UcmlnZ2VyLmJpbmQodGhpcykpO1xuXG4gICAgaWYodGhpcy5faGFzVGFyZ2V0KCkpIHtcbiAgICAgICAgdmFyIHRhcmdldE9iaiA9IG9ialt0YXJnZXRLZXldIHx8ICcnO1xuICAgICAgICB2YXIgaSA9IC0xO1xuICAgICAgICB3aGlsZSAoKytpIDwgdmFsdWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKHRhcmdldE9iaiA9PSB2YWx1ZXNbaV0pe1xuICAgICAgICAgICAgICAgIHRoaXMuX3NlbGVjdGVkID0gdmFsdWVzW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHNlbGVjdC5zZXRQcm9wZXJ0eSgndmFsdWUnLCB0YXJnZXRPYmoudG9TdHJpbmcoKS5sZW5ndGggPiAwID8gdGFyZ2V0T2JqIDogdmFsdWVzWzBdKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHNlbGVjdC5zZXRQcm9wZXJ0eSgndmFsdWUnLCBwYXJhbXMuc2VsZWN0ZWQgPyB2YWx1ZXNbcGFyYW1zLnNlbGVjdGVkXSA6IFNUUl9DSE9PU0UpO1xuICAgIH1cblxuICAgIHRoaXMuX3dyYXBOb2RlLmFkZENoaWxkKHNlbGVjdCk7XG5cbiAgICBPYmplY3RDb21wb25lbnROb3RpZmllci5nZXQoKS5hZGRFdmVudExpc3RlbmVyKE9wdGlvbkV2ZW50LlRSSUdHRVIsIHRoaXMsICdvbk9wdGlvblRyaWdnZXInKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoT3B0aW9uRXZlbnQuVFJJR0dFUkVELCBPYmplY3RDb21wb25lbnROb3RpZmllci5nZXQoKSwgJ29uT3B0aW9uVHJpZ2dlcmVkJyk7XG59XG5TZWxlY3QucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShPYmplY3RDb21wb25lbnQucHJvdG90eXBlKTtcblNlbGVjdC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTZWxlY3Q7XG5cblNlbGVjdC5wcm90b3R5cGUub25PcHRpb25UcmlnZ2VyID0gZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAoZS5kYXRhLm9yaWdpbiA9PSB0aGlzKSB7XG4gICAgICAgIHRoaXMuX2FjdGl2ZSA9ICF0aGlzLl9hY3RpdmU7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcblxuICAgICAgICBpZiAodGhpcy5fYWN0aXZlKSB7XG4gICAgICAgICAgICB0aGlzLl9idWlsZE9wdGlvbnMoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIE9wdGlvbnMuZ2V0KCkuY2xlYXIoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX2FjdGl2ZSA9IGZhbHNlO1xuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbn07XG5cblNlbGVjdC5wcm90b3R5cGUuX2J1aWxkT3B0aW9ucyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgb3B0aW9ucyA9IE9wdGlvbnMuZ2V0KCk7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgb3B0aW9ucy5idWlsZCh0aGlzLl92YWx1ZXMsIHRoaXMuX3NlbGVjdGVkLCB0aGlzLl9zZWxlY3QsXG4gICAgICAgIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBzZWxmLmFwcGx5VmFsdWUoKTtcbiAgICAgICAgICAgIHNlbGYuX2FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgc2VsZi5fdXBkYXRlQXBwZWFyYW5jZSgpO1xuICAgICAgICAgICAgc2VsZi5fc2VsZWN0ZWRJbmRleCA9IG9wdGlvbnMuZ2V0U2VsZWN0ZWRJbmRleCgpO1xuICAgICAgICAgICAgc2VsZi5fb25DaGFuZ2Uoc2VsZi5fc2VsZWN0ZWRJbmRleCk7XG4gICAgICAgICAgICBvcHRpb25zLmNsZWFyKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBzZWxmLl9hY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbiAgICAgICAgICAgIG9wdGlvbnMuY2xlYXIoKVxuICAgICAgICB9LCBmYWxzZSk7XG59O1xuXG5TZWxlY3QucHJvdG90eXBlLl9hcHBseVNlbGVjdGVkID0gZnVuY3Rpb24oc2VsZWN0ZWQpe1xuICAgIHRoaXMuX3NlbGVjdC5zZXRQcm9wZXJ0eSgndmFsdWUnLHNlbGVjdGVkKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQpLG51bGwpO1xufVxuXG5TZWxlY3QucHJvdG90eXBlLmFwcGx5VmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGluZGV4ID0gT3B0aW9ucy5nZXQoKS5nZXRTZWxlY3RlZEluZGV4KCksXG4gICAgICAgIHNlbGVjdGVkID0gdGhpcy5fc2VsZWN0ZWQgPSB0aGlzLl92YWx1ZXNbaW5kZXhdO1xuXG4gICAgaWYgKHRoaXMuX2hhc1RhcmdldCgpKSB7XG4gICAgICAgIHRoaXMucHVzaEhpc3RvcnlTdGF0ZSgpO1xuICAgICAgICB0aGlzLl9vYmpbdGhpcy5fdGFyZ2V0S2V5XSA9IHNlbGVjdGVkO1xuICAgIH1cblxuICAgIHRoaXMuX2FwcGx5U2VsZWN0ZWQoc2VsZWN0ZWQpO1xufTtcblxuU2VsZWN0LnByb3RvdHlwZS5wdXNoSGlzdG9yeVN0YXRlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBvYmogPSB0aGlzLl9vYmosXG4gICAgICAgIGtleSA9IHRoaXMuX3RhcmdldEtleTtcbiAgICBIaXN0b3J5LmdldCgpLnB1c2hTdGF0ZShvYmosIGtleSwgb2JqW2tleV0pO1xufTtcblxuU2VsZWN0LnByb3RvdHlwZS5fb25PcHRpb25UcmlnZ2VyID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIE9wdGlvbkV2ZW50LlRSSUdHRVJFRCwgbnVsbCkpO1xufTtcblxuU2VsZWN0LnByb3RvdHlwZS5fdXBkYXRlQXBwZWFyYW5jZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9zZWxlY3Quc2V0U3R5bGVDbGFzcyh0aGlzLl9hY3RpdmUgPyBDU1MuU2VsZWN0QWN0aXZlIDogQ1NTLlNlbGVjdCk7XG59O1xuXG5TZWxlY3QucHJvdG90eXBlLm9uVmFsdWVVcGRhdGUgPSBmdW5jdGlvbiAoZSkge1xuICAgIGlmICghdGhpcy5faGFzVGFyZ2V0KCkpe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX3NlbGVjdGVkID0gdGhpcy5fb2JqW3RoaXMuX3RhcmdldEtleV07XG4gICAgdGhpcy5fc2VsZWN0LnNldFByb3BlcnR5KCd2YWx1ZScsIHRoaXMuX3NlbGVjdGVkLnRvU3RyaW5nKCkpO1xufTtcblxuU2VsZWN0LnByb3RvdHlwZS5faGFzVGFyZ2V0ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl90YXJnZXRLZXkgIT0gbnVsbDtcbn07XG5cblNlbGVjdC5wcm90b3R5cGUuc2V0VmFsdWUgPSBmdW5jdGlvbih2YWx1ZSl7XG4gICAgdGhpcy5fc2VsZWN0ZWRJbmRleCA9IHZhbHVlO1xuICAgIGlmKHZhbHVlID09IC0xKXtcbiAgICAgICAgdGhpcy5fc2VsZWN0ZWQgPSBudWxsO1xuICAgICAgICB0aGlzLl9zZWxlY3Quc2V0UHJvcGVydHkoJ3ZhbHVlJywgU1RSX0NIT09TRSk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5fc2VsZWN0ZWQgPSB0aGlzLl92YWx1ZXNbdGhpcy5fc2VsZWN0ZWRJbmRleF07XG4gICAgdGhpcy5fYXBwbHlTZWxlY3RlZCh0aGlzLl9zZWxlY3RlZCk7XG59O1xuXG5TZWxlY3QucHJvdG90eXBlLmdldERhdGEgPSBmdW5jdGlvbigpe1xuICAgIHZhciBvYmogPSB7fTtcbiAgICAgICAgb2JqWydzZWxlY3RlZEluZGV4J10gPSB0aGlzLl9zZWxlY3RlZEluZGV4O1xuICAgIHJldHVybiBvYmo7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdDtcbiIsInZhciBPYmplY3RDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jb3JlL09iamVjdENvbXBvbmVudCcpO1xudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG52YXIgU2xpZGVyX0ludGVybmFsID0gcmVxdWlyZSgnLi9TbGlkZXJfSW50ZXJuYWwnKTtcblxudmFyIEhpc3RvcnkgPSByZXF1aXJlKCcuLi9jb3JlL0hpc3RvcnknKTtcbnZhciBSYW5nZSA9IHJlcXVpcmUoJy4vUmFuZ2UnKTtcbnZhciBOdW1iZXJJbnB1dF9JbnRlcm5hbCA9IHJlcXVpcmUoJy4vTnVtYmVySW5wdXRfSW50ZXJuYWwnKTtcblxudmFyIEV2ZW50XyAgICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIERvY3VtZW50RXZlbnQgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXG4gICAgUGFuZWxFdmVudCAgICAgPSByZXF1aXJlKCcuLi9ncm91cC9QYW5lbEV2ZW50JyksXG4gICAgR3JvdXBFdmVudCAgICAgPSByZXF1aXJlKCcuLi9ncm91cC9Hcm91cEV2ZW50JyksXG4gICAgQ29tcG9uZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL0NvbXBvbmVudEV2ZW50Jyk7XG5cbnZhciBERUZBVUxUX1NURVAgPSAxLjAsXG4gICAgREVGQVVMVF9EUCAgID0gMjtcblxuXG5mdW5jdGlvbiBTbGlkZXIocGFyZW50LG9iamVjdCx2YWx1ZSxyYW5nZSxwYXJhbXMpIHtcbiAgICBwYXJhbXMgICAgICAgICAgPSBwYXJhbXMgICAgICAgICAgfHwge307XG4gICAgcGFyYW1zLmxhYmVsICAgID0gcGFyYW1zLmxhYmVsICAgIHx8IHZhbHVlO1xuXG4gICAgT2JqZWN0Q29tcG9uZW50LmFwcGx5KHRoaXMsW3BhcmVudCxvYmplY3QscmFuZ2UscGFyYW1zXSk7XG5cbiAgICB0aGlzLl92YWx1ZXMgID0gdGhpcy5fb2JqW3RoaXMuX2tleV07XG4gICAgdGhpcy5fdGFyZ2V0S2V5ID0gdmFsdWU7XG5cbiAgICBwYXJhbXMuc3RlcCAgICAgPSBwYXJhbXMuc3RlcCAgICAgfHwgREVGQVVMVF9TVEVQO1xuICAgIHBhcmFtcy5kcCAgICAgICA9IChwYXJhbXMuZHAgPT09IHVuZGVmaW5lZCB8fCBwYXJhbXMuZHAgPT0gbnVsbCkgPyAgREVGQVVMVF9EUCA6IHBhcmFtcy5kcDtcbiAgICBwYXJhbXMub25DaGFuZ2UgPSBwYXJhbXMub25DaGFuZ2UgfHwgdGhpcy5fb25DaGFuZ2U7XG4gICAgcGFyYW1zLm9uRmluaXNoID0gcGFyYW1zLm9uRmluaXNoIHx8IGZ1bmN0aW9uKCl7fTtcblxuICAgIHRoaXMuX2RwICAgICAgID0gcGFyYW1zLmRwO1xuICAgIHRoaXMuX29uQ2hhbmdlID0gcGFyYW1zLm9uQ2hhbmdlO1xuICAgIHRoaXMuX29uRmluaXNoID0gcGFyYW1zLm9uRmluaXNoO1xuXG4gICAgdmFyIHZhbHVlcyAgICA9IHRoaXMuX3ZhbHVlcyxcbiAgICAgICAgb2JqICAgICAgID0gdGhpcy5fb2JqLFxuICAgICAgICB0YXJnZXRLZXkgPSB0aGlzLl90YXJnZXRLZXk7XG5cbiAgICB2YXIgd3JhcCAgPSB0aGlzLl93cmFwTm9kZTtcbiAgICAgICAgd3JhcC5zZXRTdHlsZUNsYXNzKENTUy5XcmFwU2xpZGVyKTtcblxuICAgIHZhciBzbGlkZXIgPSB0aGlzLl9zbGlkZXIgPSBuZXcgU2xpZGVyX0ludGVybmFsKHdyYXAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fb25TbGlkZXJCZWdpbi5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX29uU2xpZGVyTW92ZS5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX29uU2xpZGVyRW5kLmJpbmQodGhpcykpO1xuXG4gICAgc2xpZGVyLnNldEJvdW5kTWF4KHZhbHVlc1sxXSk7XG4gICAgc2xpZGVyLnNldEJvdW5kTWluKHZhbHVlc1swXSk7XG4gICAgc2xpZGVyLnNldFZhbHVlKG9ialt0YXJnZXRLZXldKTtcblxuICAgIHZhciBpbnB1dCAgPSB0aGlzLl9pbnB1dCA9IG5ldyBOdW1iZXJJbnB1dF9JbnRlcm5hbChwYXJhbXMuc3RlcCwgcGFyYW1zLmRwLCBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9vbklucHV0Q2hhbmdlLmJpbmQodGhpcykpO1xuXG4gICAgaW5wdXQuc2V0VmFsdWUob2JqW3RhcmdldEtleV0pO1xuXG4gICAgd3JhcC5hZGRDaGlsZChpbnB1dC5nZXROb2RlKCkpO1xuXG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoUGFuZWxFdmVudC5QQU5FTF9NT1ZFX0VORCwgICAgdGhpcywgJ29uUGFuZWxNb3ZlRW5kJyk7XG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSwgdGhpcywgJ29uR3JvdXBXaWR0aENoYW5nZScpO1xuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuV0lORE9XX1JFU0laRSwgIHRoaXMsICdvbldpbmRvd1Jlc2l6ZScpO1xufVxuU2xpZGVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZSk7XG5TbGlkZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU2xpZGVyO1xuXG5TbGlkZXIucHJvdG90eXBlLnB1c2hIaXN0b3J5U3RhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG9iaiA9IHRoaXMuX29iaixcbiAgICAgICAga2V5ID0gdGhpcy5fdGFyZ2V0S2V5O1xuICAgIEhpc3RvcnkuZ2V0KCkucHVzaFN0YXRlKG9iaiwga2V5LCBvYmpba2V5XSk7XG59O1xuXG5TbGlkZXIucHJvdG90eXBlLl9vblNsaWRlckJlZ2luID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMucHVzaEhpc3RvcnlTdGF0ZSgpO1xufTtcblxuU2xpZGVyLnByb3RvdHlwZS5fb25TbGlkZXJNb3ZlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuYXBwbHlWYWx1ZSgpO1xuICAgIHRoaXMuX3VwZGF0ZVZhbHVlRmllbGQoKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBDb21wb25lbnRFdmVudC5WQUxVRV9VUERBVEVELCBudWxsKSk7XG4gICAgdGhpcy5fb25DaGFuZ2UoKTtcbn07XG5cblNsaWRlci5wcm90b3R5cGUuX29uU2xpZGVyRW5kID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuYXBwbHlWYWx1ZSgpO1xuICAgIHRoaXMuX3VwZGF0ZVZhbHVlRmllbGQoKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBDb21wb25lbnRFdmVudC5WQUxVRV9VUERBVEVELCBudWxsKSk7XG4gICAgdGhpcy5fb25GaW5pc2goKTtcbn07XG5cblNsaWRlci5wcm90b3R5cGUuX29uSW5wdXRDaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGlucHV0ID0gdGhpcy5faW5wdXQsXG4gICAgICAgIHZhbHVlTWluID0gdGhpcy5fdmFsdWVzWzBdLFxuICAgICAgICB2YWx1ZU1heCA9IHRoaXMuX3ZhbHVlc1sxXTtcblxuICAgIGlmIChpbnB1dC5nZXRWYWx1ZSgpID49IHZhbHVlTWF4KXtcbiAgICAgICAgaW5wdXQuc2V0VmFsdWUodmFsdWVNYXgpO1xuICAgIH1cbiAgICBpZiAoaW5wdXQuZ2V0VmFsdWUoKSA8PSB2YWx1ZU1pbil7XG4gICAgICAgIGlucHV0LnNldFZhbHVlKHZhbHVlTWluKTtcbiAgICB9XG5cbiAgICB2YXIgdmFsdWUgPSBpbnB1dC5nZXRWYWx1ZSgpO1xuXG4gICAgdGhpcy5fc2xpZGVyLnNldFZhbHVlKHZhbHVlKTtcbiAgICB0aGlzLl9vYmpbdGhpcy5fdGFyZ2V0S2V5XSA9IHZhbHVlO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIG51bGwpKTtcbiAgICB0aGlzLl9vbkZpbmlzaCgpO1xufTtcblxuU2xpZGVyLnByb3RvdHlwZS5hcHBseVZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB2YWx1ZSAgPSB0aGlzLl9zbGlkZXIuZ2V0VmFsdWUoKTtcbiAgICB0aGlzLl9vYmpbdGhpcy5fdGFyZ2V0S2V5XSA9IHBhcnNlRmxvYXQodmFsdWUudG9GaXhlZCh0aGlzLl9kcCkpO1xuICAgIHRoaXMuX2lucHV0LnNldFZhbHVlKHZhbHVlKTtcbn07XG5cblxuU2xpZGVyLnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24gKGUpIHtcbiAgICB2YXIgb3JpZ2luID0gZS5kYXRhLm9yaWdpbjtcbiAgICBpZiAob3JpZ2luID09IHRoaXMpe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBzbGlkZXIgPSB0aGlzLl9zbGlkZXI7XG4gICAgaWYgKCEob3JpZ2luIGluc3RhbmNlb2YgU2xpZGVyKSkge1xuICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5fdmFsdWVzO1xuICAgICAgICBzbGlkZXIuc2V0Qm91bmRNaW4odmFsdWVzWzBdKTtcbiAgICAgICAgc2xpZGVyLnNldEJvdW5kTWF4KHZhbHVlc1sxXSk7XG4gICAgICAgIGlmICghKG9yaWdpbiBpbnN0YW5jZW9mIFJhbmdlKSkge1xuICAgICAgICAgICAgc2xpZGVyLnNldFZhbHVlKHRoaXMuX29ialt0aGlzLl90YXJnZXRLZXldKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgc2xpZGVyLnNldFZhbHVlKHRoaXMuX29ialt0aGlzLl90YXJnZXRLZXldKTtcbiAgICB9XG4gICAgdGhpcy5hcHBseVZhbHVlKCk7XG59O1xuXG5cblNsaWRlci5wcm90b3R5cGUuX3VwZGF0ZVZhbHVlRmllbGQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5faW5wdXQuc2V0VmFsdWUodGhpcy5fc2xpZGVyLmdldFZhbHVlKCkpO1xufTtcblxuU2xpZGVyLnByb3RvdHlwZS5vblBhbmVsTW92ZUVuZCA9XG4gICAgU2xpZGVyLnByb3RvdHlwZS5vbkdyb3VwV2lkdGhDaGFuZ2UgPVxuICAgICAgICBTbGlkZXIucHJvdG90eXBlLm9uV2luZG93UmVzaXplID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5fc2xpZGVyLnJlc2V0T2Zmc2V0KCk7XG4gICAgICAgIH07XG5cblNsaWRlci5wcm90b3R5cGUuc2V0VmFsdWUgPSBmdW5jdGlvbih2YWx1ZSl7XG4gICAgaWYodmFsdWUgPT0gLTEpe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX29ialt0aGlzLl90YXJnZXRLZXldID0gdmFsdWU7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcyxDb21wb25lbnRFdmVudC5WQUxVRV9VUERBVEVELG51bGwpKTtcbn07XG5cblNsaWRlci5wcm90b3R5cGUuZ2V0RGF0YSA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIG9iaiA9IHt9O1xuICAgICAgICBvYmpbdGhpcy5fdGFyZ2V0S2V5XSA9IHRoaXMuX29ialt0aGlzLl90YXJnZXRLZXldO1xuICAgIHJldHVybiBvYmo7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNsaWRlcjsiLCJ2YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xuXG52YXIgRG9jdW1lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxuICAgIE5vZGVFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50Jyk7XG5cbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xudmFyIE1vdXNlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Nb3VzZScpO1xuXG5mdW5jdGlvbiBTbGlkZXJfSW50ZXJuYWwocGFyZW50Tm9kZSxvbkJlZ2luLG9uQ2hhbmdlLG9uRmluaXNoKSB7XG4gICAgdGhpcy5fYm91bmRzID0gWzAsMV07XG4gICAgdGhpcy5fdmFsdWUgID0gMDtcbiAgICB0aGlzLl9pbnRycGwgPSAwO1xuICAgIHRoaXMuX2ZvY3VzICA9IGZhbHNlO1xuXG5cbiAgICB0aGlzLl9vbkJlZ2luICA9IG9uQmVnaW4gIHx8IGZ1bmN0aW9uKCl7fTtcbiAgICB0aGlzLl9vbkNoYW5nZSA9IG9uQ2hhbmdlIHx8IGZ1bmN0aW9uKCl7fTtcbiAgICB0aGlzLl9vbkZpbmlzaCA9IG9uRmluaXNoIHx8IGZ1bmN0aW9uKCl7fTtcblxuXG4gICAgdmFyIHdyYXAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlNsaWRlcldyYXApO1xuICAgIHBhcmVudE5vZGUuYWRkQ2hpbGQod3JhcCk7XG5cbiAgICB2YXIgc2xvdCAgID0gdGhpcy5fc2xvdCAgID0ge25vZGU6ICAgIG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuU2xpZGVyU2xvdCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXRYOiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6ICAgMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhZGRpbmc6IDN9O1xuXG4gICAgdmFyIGhhbmRsZSA9IHRoaXMuX2hhbmRsZSA9IHtub2RlICAgIDogbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5TbGlkZXJIYW5kbGUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGggICA6IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkcmFnZ2luZzogZmFsc2V9O1xuXG4gICAgd3JhcC5hZGRDaGlsZChzbG90Lm5vZGUpO1xuICAgIHNsb3Qubm9kZS5hZGRDaGlsZChoYW5kbGUubm9kZSk7XG5cbiAgICBzbG90Lm9mZnNldFggPSBzbG90Lm5vZGUuZ2V0UG9zaXRpb25HbG9iYWxYKCk7XG4gICAgc2xvdC53aWR0aCAgID0gTWF0aC5mbG9vcihzbG90Lm5vZGUuZ2V0V2lkdGgoKSAtIHNsb3QucGFkZGluZyAqIDIpIDtcblxuICAgIGhhbmRsZS5ub2RlLnNldFdpZHRoKGhhbmRsZS53aWR0aCk7XG5cbiAgICBzbG90Lm5vZGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTix0aGlzLl9vblNsb3RNb3VzZURvd24uYmluZCh0aGlzKSk7XG4gICAgc2xvdC5ub2RlLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX1VQLCAgdGhpcy5fb25TbG90TW91c2VVcC5iaW5kKHRoaXMpKTtcblxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLHRoaXMuX29uRG9jdW1lbnRNb3VzZU1vdmUuYmluZCh0aGlzKSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX1VQLCAgdGhpcy5fb25Eb2N1bWVudE1vdXNlVXAuYmluZCh0aGlzKSk7XG59XG5cblNsaWRlcl9JbnRlcm5hbC5wcm90b3R5cGUuX29uRG9jdW1lbnRNb3VzZU1vdmUgPSBmdW5jdGlvbigpe1xuICAgIGlmKCF0aGlzLl9oYW5kbGUuZHJhZ2dpbmcpe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX3VwZGF0ZSgpO1xuICAgIHRoaXMuX29uQ2hhbmdlKCk7XG59O1xuXG5TbGlkZXJfSW50ZXJuYWwucHJvdG90eXBlLl9vbkRvY3VtZW50TW91c2VVcCA9IGZ1bmN0aW9uKCl7XG4gICAgaWYodGhpcy5faGFuZGxlLmRyYWdnaW5nKXtcbiAgICAgICAgdGhpcy5fb25GaW5pc2goKTtcbiAgICB9XG4gICAgdGhpcy5faGFuZGxlLmRyYWdnaW5nID0gZmFsc2U7XG59O1xuXG5TbGlkZXJfSW50ZXJuYWwucHJvdG90eXBlLl9vblNsb3RNb3VzZURvd24gPSBmdW5jdGlvbigpe1xuICAgIHRoaXMuX29uQmVnaW4oKTtcbiAgICB0aGlzLl9mb2N1cyA9IHRydWU7XG4gICAgdGhpcy5faGFuZGxlLmRyYWdnaW5nID0gdHJ1ZTtcbiAgICB0aGlzLl9oYW5kbGUubm9kZS5nZXRFbGVtZW50KCkuZm9jdXMoKTtcbiAgICB0aGlzLl91cGRhdGUoKTtcbn07XG5cblNsaWRlcl9JbnRlcm5hbC5wcm90b3R5cGUuX29uU2xvdE1vdXNlVXAgPSBmdW5jdGlvbigpe1xuICAgIGlmICh0aGlzLl9mb2N1cykge1xuICAgICAgICB2YXIgaGFuZGxlID0gdGhpcy5faGFuZGxlO1xuICAgICAgICBpZiAoaGFuZGxlLmRyYWdnaW5nKXtcbiAgICAgICAgICAgIHRoaXMuX29uRmluaXNoKCk7XG4gICAgICAgIH1cbiAgICAgICAgaGFuZGxlLmRyYWdnaW5nID0gZmFsc2U7XG4gICAgfVxuICAgIHRoaXMuX2ZvY3VzID0gZmFsc2U7XG59O1xuXG5TbGlkZXJfSW50ZXJuYWwucHJvdG90eXBlLl91cGRhdGUgPSBmdW5jdGlvbigpe1xuICAgIHZhciBteCA9IE1vdXNlLmdldCgpLmdldFgoKSxcbiAgICAgICAgc3ggPSB0aGlzLl9zbG90Lm9mZnNldFgsXG4gICAgICAgIHN3ID0gdGhpcy5fc2xvdC53aWR0aCxcbiAgICAgICAgcHggPSAobXggPCBzeCkgPyAwIDogKG14ID4gKHN4ICsgc3cpKSA/IHN3IDogKG14IC0gc3gpO1xuXG4gICAgdGhpcy5faGFuZGxlLm5vZGUuc2V0V2lkdGgoTWF0aC5yb3VuZChweCkpO1xuICAgIHRoaXMuX2ludHJwbCA9IHB4IC8gc3c7XG4gICAgdGhpcy5faW50ZXJwb2xhdGVWYWx1ZSgpO1xufTtcblxuU2xpZGVyX0ludGVybmFsLnByb3RvdHlwZS5fdXBkYXRlSGFuZGxlID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2xvdFdpZHRoICAgPSB0aGlzLl9zbG90LndpZHRoLFxuICAgICAgICBoYW5kbGVXaWR0aCA9IE1hdGgucm91bmQodGhpcy5faW50cnBsICogc2xvdFdpZHRoKTtcbiAgICB0aGlzLl9oYW5kbGUubm9kZS5zZXRXaWR0aChNYXRoLm1pbihoYW5kbGVXaWR0aCxzbG90V2lkdGgpKTtcbn07XG5cblNsaWRlcl9JbnRlcm5hbC5wcm90b3R5cGUuX2ludGVycG9sYXRlVmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGludHJwbCA9IHRoaXMuX2ludHJwbCxcbiAgICAgICAgYm91bmRzID0gdGhpcy5fYm91bmRzO1xuICAgIHRoaXMuX3ZhbHVlID0gYm91bmRzWzBdICogKDEuMCAtIGludHJwbCkgKyBib3VuZHNbMV0gKiBpbnRycGw7XG59O1xuXG5TbGlkZXJfSW50ZXJuYWwucHJvdG90eXBlLnJlc2V0T2Zmc2V0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzbG90ID0gdGhpcy5fc2xvdDtcbiAgICBzbG90Lm9mZnNldFggPSBzbG90Lm5vZGUuZ2V0UG9zaXRpb25HbG9iYWxYKCk7XG4gICAgc2xvdC53aWR0aCA9IE1hdGguZmxvb3Ioc2xvdC5ub2RlLmdldFdpZHRoKCkgLSBzbG90LnBhZGRpbmcgKiAyKVxufTtcblxuU2xpZGVyX0ludGVybmFsLnByb3RvdHlwZS5zZXRCb3VuZE1pbiA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHZhciBib3VuZHMgPSB0aGlzLl9ib3VuZHM7XG4gICAgaWYgKHZhbHVlID49IGJvdW5kc1sxXSl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgYm91bmRzWzBdID0gdmFsdWU7XG4gICAgdGhpcy5fdXBkYXRlRnJvbUJvdW5kcygpO1xufTtcblxuU2xpZGVyX0ludGVybmFsLnByb3RvdHlwZS5zZXRCb3VuZE1heCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHZhciBib3VuZHMgPSB0aGlzLl9ib3VuZHM7XG4gICAgaWYgKHZhbHVlIDw9IGJvdW5kc1swXSl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgYm91bmRzWzFdID0gdmFsdWU7XG4gICAgdGhpcy5fdXBkYXRlRnJvbUJvdW5kcygpO1xufTtcblxuU2xpZGVyX0ludGVybmFsLnByb3RvdHlwZS5fdXBkYXRlRnJvbUJvdW5kcyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYm91bmRzTWluID0gdGhpcy5fYm91bmRzWzBdLFxuICAgICAgICBib3VuZHNNYXggPSB0aGlzLl9ib3VuZHNbMV07XG4gICAgdGhpcy5fdmFsdWUgPSBNYXRoLm1heChib3VuZHNNaW4sTWF0aC5taW4odGhpcy5fdmFsdWUsYm91bmRzTWF4KSk7XG4gICAgdGhpcy5faW50cnBsID0gTWF0aC5hYnMoKHRoaXMuX3ZhbHVlIC0gYm91bmRzTWluKSAvIChib3VuZHNNaW4gLSBib3VuZHNNYXgpKTtcbiAgICB0aGlzLl91cGRhdGVIYW5kbGUoKTtcbn07XG5cblNsaWRlcl9JbnRlcm5hbC5wcm90b3R5cGUuc2V0VmFsdWUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB2YXIgYm91bmRzTWluID0gdGhpcy5fYm91bmRzWzBdLFxuICAgICAgICBib3VuZHNNYXggPSB0aGlzLl9ib3VuZHNbMV07XG5cbiAgICBpZiAodmFsdWUgPCBib3VuZHNNaW4gfHwgdmFsdWUgPiBib3VuZHNNYXgpe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX2ludHJwbCA9IE1hdGguYWJzKCh2YWx1ZSAtIGJvdW5kc01pbikgLyAoYm91bmRzTWluIC0gYm91bmRzTWF4KSk7XG4gICAgdGhpcy5fdXBkYXRlSGFuZGxlKCk7XG4gICAgdGhpcy5fdmFsdWUgPSB2YWx1ZTtcbn07XG5cblNsaWRlcl9JbnRlcm5hbC5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3ZhbHVlO1xufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IFNsaWRlcl9JbnRlcm5hbDsiLCJ2YXIgT2JqZWN0Q29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY29yZS9PYmplY3RDb21wb25lbnQnKTtcbnZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcbnZhciBPcHRpb25zID0gcmVxdWlyZSgnLi9PcHRpb25zJyk7XG52YXIgQnV0dG9uUHJlc2V0ID0gcmVxdWlyZSgnLi9CdXR0b25QcmVzZXQnKTtcbnZhciBNZXRyaWMgPSByZXF1aXJlKCcuL01ldHJpYycpO1xuXG52YXIgRXZlbnRfID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIERvY3VtZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcbiAgICBOb2RlRXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpLFxuICAgIENvbXBvbmVudEV2ZW50ID0gIHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKTtcblxudmFyIERFRkFVTFRfUFJFU0VUID0gbnVsbDtcblxuZnVuY3Rpb24gU3RyaW5nSW5wdXQocGFyZW50LG9iamVjdCx2YWx1ZSxwYXJhbXMpIHtcbiAgICBPYmplY3RDb21wb25lbnQuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG4gICAgcGFyYW1zICAgICAgICAgID0gcGFyYW1zIHx8IHt9O1xuICAgIHBhcmFtcy5vbkNoYW5nZSA9IHBhcmFtcy5vbkNoYW5nZSB8fCB0aGlzLl9vbkNoYW5nZTtcbiAgICBwYXJhbXMucHJlc2V0cyAgPSBwYXJhbXMucHJlc2V0cyAgfHwgREVGQVVMVF9QUkVTRVQ7XG5cbiAgICB0aGlzLl9vbkNoYW5nZSAgID0gcGFyYW1zLm9uQ2hhbmdlO1xuXG4gICAgdmFyIGlucHV0ID0gdGhpcy5faW5wdXQgPSBuZXcgTm9kZShOb2RlLklOUFVUX1RFWFQpO1xuXG4gICAgdmFyIHdyYXAgPSB0aGlzLl93cmFwTm9kZTtcblxuICAgIHZhciBwcmVzZXRzID0gcGFyYW1zLnByZXNldHM7XG4gICAgaWYgKCFwcmVzZXRzKSB7XG4gICAgICAgIHdyYXAuYWRkQ2hpbGQoaW5wdXQpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdmFyIHdyYXBfID0gbmV3IE5vZGUoKTtcbiAgICAgICAgd3JhcF8uc2V0U3R5bGVDbGFzcyhDU1MuV3JhcElucHV0V1ByZXNldCk7XG5cbiAgICAgICAgd3JhcC5hZGRDaGlsZCh3cmFwXyk7XG4gICAgICAgIHdyYXBfLmFkZENoaWxkKGlucHV0KTtcblxuICAgICAgICB2YXIgb3B0aW9ucyA9IE9wdGlvbnMuZ2V0KCksXG4gICAgICAgICAgICBidG5QcmVzZXQgPSBuZXcgQnV0dG9uUHJlc2V0KHRoaXMuX3dyYXBOb2RlKTtcblxuICAgICAgICB2YXIgb25QcmVzZXREZWFjdGl2YXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgb3B0aW9ucy5jbGVhcigpO1xuICAgICAgICAgICAgYnRuUHJlc2V0LmRlYWN0aXZhdGUoKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBvblByZXNldEFjdGl2YXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgb3B0aW9ucy5idWlsZChwcmVzZXRzLFxuICAgICAgICAgICAgICAgIGlucHV0LmdldFByb3BlcnR5KCd2YWx1ZScpLFxuICAgICAgICAgICAgICAgIGlucHV0LFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5wdXQuc2V0UHJvcGVydHkoJ3ZhbHVlJywgcHJlc2V0c1tvcHRpb25zLmdldFNlbGVjdGVkSW5kZXgoKV0pO1xuICAgICAgICAgICAgICAgICAgICBzZWxmLnB1c2hIaXN0b3J5U3RhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5hcHBseVZhbHVlKCk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvblByZXNldERlYWN0aXZhdGUsXG4gICAgICAgICAgICAgICAgTWV0cmljLlBBRERJTkdfUFJFU0VULFxuICAgICAgICAgICAgICAgIGZhbHNlKTtcbiAgICAgICAgfTtcblxuICAgICAgICBidG5QcmVzZXQuc2V0T25BY3RpdmUob25QcmVzZXRBY3RpdmF0ZSk7XG4gICAgICAgIGJ0blByZXNldC5zZXRPbkRlYWN0aXZlKG9uUHJlc2V0RGVhY3RpdmF0ZSlcbiAgICB9XG5cbiAgICBpbnB1dC5zZXRQcm9wZXJ0eSgndmFsdWUnLHRoaXMuX29ialt0aGlzLl9rZXldKTtcblxuICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50LktFWV9VUCwgdGhpcy5fb25JbnB1dEtleVVwLmJpbmQodGhpcykpO1xuICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50LkNIQU5HRSwgdGhpcy5fb25JbnB1dENoYW5nZS5iaW5kKHRoaXMpKTtcblxuICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uSW5wdXREcmFnU3RhcnQuYmluZCh0aGlzKSk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKENvbXBvbmVudEV2ZW50LklOUFVUX1NFTEVDVF9EUkFHLHRoaXMuX3BhcmVudCwnb25Db21wb25lbnRTZWxlY3REcmFnJyk7XG59XG5TdHJpbmdJbnB1dC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE9iamVjdENvbXBvbmVudC5wcm90b3R5cGUpO1xuU3RyaW5nSW5wdXQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU3RyaW5nSW5wdXQ7XG5cblN0cmluZ0lucHV0LnByb3RvdHlwZS5fb25JbnB1dEtleVVwID0gZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAodGhpcy5fa2V5SXNDaGFyKGUua2V5Q29kZSkpe1xuICAgICAgICB0aGlzLnB1c2hIaXN0b3J5U3RhdGUoKTtcbiAgICB9XG4gICAgdGhpcy5hcHBseVZhbHVlKCk7XG4gICAgdGhpcy5fb25DaGFuZ2UoKTtcbn07XG5cblN0cmluZ0lucHV0LnByb3RvdHlwZS5fb25JbnB1dENoYW5nZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKHRoaXMuX2tleUlzQ2hhcihlLmtleUNvZGUpKXtcbiAgICAgICAgdGhpcy5wdXNoSGlzdG9yeVN0YXRlKCk7XG4gICAgfVxuICAgIHRoaXMuYXBwbHlWYWx1ZSgpO1xufTtcblxuLy9UT0RPOiBGaW5pc2ggY2hlY2tcblN0cmluZ0lucHV0LnByb3RvdHlwZS5fa2V5SXNDaGFyID0gZnVuY3Rpb24gKGtleUNvZGUpIHtcbiAgICByZXR1cm4ga2V5Q29kZSAhPSAxNyAmJlxuICAgICAgICBrZXlDb2RlICE9IDE4ICYmXG4gICAgICAgIGtleUNvZGUgIT0gMjAgJiZcbiAgICAgICAga2V5Q29kZSAhPSAzNyAmJlxuICAgICAgICBrZXlDb2RlICE9IDM4ICYmXG4gICAgICAgIGtleUNvZGUgIT0gMzkgJiZcbiAgICAgICAga2V5Q29kZSAhPSA0MCAmJlxuICAgICAgICBrZXlDb2RlICE9IDE2O1xufTtcblxuXG5TdHJpbmdJbnB1dC5wcm90b3R5cGUuYXBwbHlWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9vYmpbdGhpcy5fa2V5XSA9IHRoaXMuX2lucHV0LmdldFByb3BlcnR5KCd2YWx1ZScpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIG51bGwpKTtcbn07XG5cblN0cmluZ0lucHV0LnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAoZS5kYXRhLm9yaWdpbiA9PSB0aGlzKXJldHVybjtcbiAgICB0aGlzLl9pbnB1dC5zZXRQcm9wZXJ0eSgndmFsdWUnLCB0aGlzLl9vYmpbdGhpcy5fa2V5XSk7XG59O1xuXG4vL1ByZXZlbnQgY2hyb21lIHNlbGVjdCBkcmFnXG5TdHJpbmdJbnB1dC5wcm90b3R5cGUuX29uSW5wdXREcmFnU3RhcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGV2ZW50TW92ZSA9IERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSxcbiAgICAgICAgZXZlbnRVcCA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XG5cbiAgICB2YXIgZXZlbnQgPSBDb21wb25lbnRFdmVudC5JTlBVVF9TRUxFQ1RfRFJBRztcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG9uRHJhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIGV2ZW50LCBudWxsKSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb25EcmFnRmluaXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgZXZlbnQsIG51bGwpKTtcblxuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdmUsIG9uRHJhZ0ZpbmlzaCwgZmFsc2UpO1xuICAgICAgICB9O1xuXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgZXZlbnQsIG51bGwpKTtcblxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50VXAsIG9uRHJhZ0ZpbmlzaCwgZmFsc2UpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTdHJpbmdJbnB1dDsiLCJ2YXIgT3V0cHV0ID0gcmVxdWlyZSgnLi9PdXRwdXQnKTtcblxuU3RyaW5nT3V0cHV0ID0gZnVuY3Rpb24gKHBhcmVudCwgb2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgT3V0cHV0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuU3RyaW5nT3V0cHV0LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT3V0cHV0LnByb3RvdHlwZSk7XG5TdHJpbmdPdXRwdXQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU3RyaW5nT3V0cHV0O1xuXG5TdHJpbmdPdXRwdXQucHJvdG90eXBlLl9zZXRWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5fcGFyZW50LmlzRGlzYWJsZWQoKSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0ZXh0QXJlYVN0cmluZyA9IHRoaXMuX29ialt0aGlzLl9rZXldO1xuXG4gICAgaWYgKHRleHRBcmVhU3RyaW5nID09IHRoaXMuX3ByZXZTdHJpbmcpe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0ZXh0QXJlYSA9IHRoaXMuX3RleHRBcmVhLFxuICAgICAgICB0ZXh0QXJlYUVsZW1lbnQgPSB0ZXh0QXJlYS5nZXRFbGVtZW50KCksXG4gICAgICAgIHRleHRBcmVhU2Nyb2xsSGVpZ2h0O1xuXG4gICAgdGV4dEFyZWEuc2V0UHJvcGVydHkoJ3ZhbHVlJywgdGV4dEFyZWFTdHJpbmcpO1xuICAgIHRleHRBcmVhU2Nyb2xsSGVpZ2h0ID0gdGV4dEFyZWFFbGVtZW50LnNjcm9sbEhlaWdodDtcbiAgICB0ZXh0QXJlYS5zZXRIZWlnaHQodGV4dEFyZWFTY3JvbGxIZWlnaHQpO1xuXG4gICAgdmFyIHNjcm9sbEJhciA9IHRoaXMuX3Njcm9sbEJhcjtcblxuICAgIGlmIChzY3JvbGxCYXIpIHtcbiAgICAgICAgaWYgKHRleHRBcmVhU2Nyb2xsSGVpZ2h0IDw9IHRoaXMuX3dyYXBOb2RlLmdldEhlaWdodCgpKSB7XG4gICAgICAgICAgICBzY3JvbGxCYXIuZGlzYWJsZSgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgc2Nyb2xsQmFyLmVuYWJsZSgpO1xuICAgICAgICAgICAgc2Nyb2xsQmFyLnVwZGF0ZSgpO1xuICAgICAgICAgICAgc2Nyb2xsQmFyLnJlc2V0KCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5fcHJldlN0cmluZyA9IHRleHRBcmVhU3RyaW5nO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTdHJpbmdPdXRwdXQ7XG4iLCJ2YXIgUGxvdHRlciA9IHJlcXVpcmUoJy4vUGxvdHRlcicpO1xudmFyIE1ldHJpYyAgPSByZXF1aXJlKCcuL01ldHJpYycpO1xuXG52YXIgREVGQVVMVF9SRVNPTFVUSU9OID0gMTtcblxuZnVuY3Rpb24gVmFsdWVQbG90dGVyKHBhcmVudCxvYmplY3QsdmFsdWUscGFyYW1zKSB7XG4gICAgUGxvdHRlci5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cbiAgICB2YXIgc3ZnICAgICAgID0gdGhpcy5fc3ZnLFxuICAgICAgICBzdmdXaWR0aCAgPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnd2lkdGgnKSksXG4gICAgICAgIHN2Z0hlaWdodCA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCdoZWlnaHQnKSk7XG5cbiAgICBwYXJhbXMgICAgICAgICAgICA9IHBhcmFtcyAgICAgICAgICAgIHx8IHt9O1xuICAgIHBhcmFtcy5oZWlnaHQgICAgID0gcGFyYW1zLmhlaWdodCAgICAgfHwgc3ZnSGVpZ2h0O1xuICAgIHBhcmFtcy5yZXNvbHV0aW9uID0gcGFyYW1zLnJlc29sdXRpb24gfHwgREVGQVVMVF9SRVNPTFVUSU9OO1xuXG4gICAgdmFyIHJlc29sdXRpb24gPSBwYXJhbXMucmVzb2x1dGlvbixcbiAgICAgICAgbGVuZ3RoICAgICA9IE1hdGguZmxvb3Ioc3ZnV2lkdGggLyByZXNvbHV0aW9uKTtcblxuICAgIHZhciBwb2ludHMgICAgID0gdGhpcy5fcG9pbnRzICA9IG5ldyBBcnJheShsZW5ndGggKiAyKSxcbiAgICAgICAgYnVmZmVyMCAgICA9IHRoaXMuX2J1ZmZlcjAgPSBuZXcgQXJyYXkobGVuZ3RoKSxcbiAgICAgICAgYnVmZmVyMSAgICA9IHRoaXMuX2J1ZmZlcjEgPSBuZXcgQXJyYXkobGVuZ3RoKTtcblxuICAgIHZhciBtaW4gPSB0aGlzLl9saW5lV2lkdGggKiAwLjU7XG5cbiAgICB2YXIgaSA9IC0xO1xuICAgIHdoaWxlICgrK2kgPCBsZW5ndGgpIHtcbiAgICAgICAgYnVmZmVyMFtpXSA9IGJ1ZmZlcjFbaV0gPSBwb2ludHNbaSAqIDJdID0gcG9pbnRzW2kgKiAyICsgMV0gPSBtaW47XG4gICAgfVxuXG4gICAgdGhpcy5faGVpZ2h0ID0gcGFyYW1zLmhlaWdodCA9IHBhcmFtcy5oZWlnaHQgIDwgTWV0cmljLkNPTVBPTkVOVF9NSU5fSEVJR0hUID9cbiAgICAgICAgICAgICAgICAgICBNZXRyaWMuQ09NUE9ORU5UX01JTl9IRUlHSFQgOiBwYXJhbXMuaGVpZ2h0O1xuXG4gICAgdGhpcy5fc3ZnU2V0U2l6ZShzdmdIZWlnaHQsTWF0aC5mbG9vcihwYXJhbXMuaGVpZ2h0KSk7XG4gICAgdGhpcy5fZ3JpZC5zdHlsZS5zdHJva2UgPSAncmdiKDM5LDQ0LDQ2KSc7XG5cbiAgICB0aGlzLl91cGRhdGVIZWlnaHQoKTtcbiAgICB0aGlzLl9kcmF3VmFsdWUoKTtcbn1cblZhbHVlUGxvdHRlci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFBsb3R0ZXIucHJvdG90eXBlKTtcblZhbHVlUGxvdHRlci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBWYWx1ZVBsb3R0ZXI7XG5cblZhbHVlUGxvdHRlci5wcm90b3R5cGUuX3JlZHJhdyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcG9pbnRzID0gdGhpcy5fcG9pbnRzLFxuICAgICAgICBidWZmZXJMZW4gPSB0aGlzLl9idWZmZXIwLmxlbmd0aDtcblxuICAgIHZhciB3aWR0aCA9IE51bWJlcih0aGlzLl9zdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKSxcbiAgICAgICAgcmF0aW8gPSB3aWR0aCAvIChidWZmZXJMZW4gLSAxKTtcblxuICAgIHZhciBpID0gLTE7XG4gICAgd2hpbGUgKCsraSA8IGJ1ZmZlckxlbikge1xuICAgICAgICBwb2ludHNbaSAqIDJdID0gd2lkdGggLSBpICogcmF0aW87XG4gICAgfVxuXG4gICAgdGhpcy5fZHJhd1ZhbHVlKCk7XG59O1xuXG5WYWx1ZVBsb3R0ZXIucHJvdG90eXBlLm9uR3JvdXBTaXplQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB3aWR0aCA9IHRoaXMuX3dyYXBOb2RlLmdldFdpZHRoKCksXG4gICAgICAgIGhlaWdodCA9IHRoaXMuX2hlaWdodDtcblxuICAgIHRoaXMuX3N2Z1NldFNpemUod2lkdGgsIGhlaWdodCk7XG4gICAgdGhpcy5fdXBkYXRlSGVpZ2h0KCk7XG4gICAgdGhpcy5fZHJhd0dyaWQoKTtcbiAgICB0aGlzLl9yZWRyYXcoKTtcbn07XG5cblZhbHVlUGxvdHRlci5wcm90b3R5cGUuX2RyYXdWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9kcmF3Q3VydmUoKTtcbn07XG5cblZhbHVlUGxvdHRlci5wcm90b3R5cGUuX2RyYXdHcmlkID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzdmcgPSB0aGlzLl9zdmc7XG5cbiAgICB2YXIgc3ZnV2lkdGggPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnd2lkdGgnKSksXG4gICAgICAgIHN2Z0hlaWdodEhhbGYgPSBNYXRoLmZsb29yKE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCdoZWlnaHQnKSkgKiAwLjUpO1xuXG4gICAgdmFyIHBhdGhDbWQgPSAnJztcbiAgICAgICAgcGF0aENtZCArPSB0aGlzLl9wYXRoQ21kTW92ZVRvKDAsIHN2Z0hlaWdodEhhbGYpO1xuICAgICAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRMaW5lVG8oc3ZnV2lkdGgsIHN2Z0hlaWdodEhhbGYpO1xuXG4gICAgdGhpcy5fZ3JpZC5zZXRBdHRyaWJ1dGUoJ2QnLCBwYXRoQ21kKTtcbn07XG5cbi8vVE9ETzogbWVyZ2UgdXBkYXRlICsgcGF0aGNtZFxuVmFsdWVQbG90dGVyLnByb3RvdHlwZS5fZHJhd0N1cnZlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzdmcgPSB0aGlzLl9zdmc7XG5cbiAgICB2YXIgdmFsdWUgPSB0aGlzLl9vYmpbdGhpcy5fa2V5XTtcblxuICAgIHZhciBidWZmZXIwID0gdGhpcy5fYnVmZmVyMCxcbiAgICAgICAgYnVmZmVyMSA9IHRoaXMuX2J1ZmZlcjEsXG4gICAgICAgIHBvaW50cyA9IHRoaXMuX3BvaW50cztcblxuICAgIHZhciBidWZmZXJMZW5ndGggPSBidWZmZXIwLmxlbmd0aDtcblxuICAgIHZhciBwYXRoQ21kID0gJyc7XG5cbiAgICB2YXIgaGVpZ2h0SGFsZiA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCdoZWlnaHQnKSkgKiAwLjUsXG4gICAgICAgIHVuaXQgPSBoZWlnaHRIYWxmIC0gdGhpcy5fbGluZVdpZHRoICogMC41O1xuXG4gICAgcG9pbnRzWzFdID0gYnVmZmVyMFswXTtcbiAgICBidWZmZXIwW2J1ZmZlckxlbmd0aCAtIDFdID0gKHZhbHVlICogdW5pdCkgKiAtMSArIE1hdGguZmxvb3IoaGVpZ2h0SGFsZik7XG5cbiAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRNb3ZlVG8ocG9pbnRzWzBdLCBwb2ludHNbMV0pO1xuXG4gICAgdmFyIGkgPSAwLCBpbmRleDtcblxuICAgIHdoaWxlICgrK2kgPCBidWZmZXJMZW5ndGgpIHtcbiAgICAgICAgaW5kZXggPSBpICogMjtcblxuICAgICAgICBidWZmZXIxW2kgLSAxXSA9IGJ1ZmZlcjBbaV07XG4gICAgICAgIHBvaW50c1tpbmRleCArIDFdID0gYnVmZmVyMFtpIC0gMV0gPSBidWZmZXIxW2kgLSAxXTtcblxuICAgICAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRMaW5lVG8ocG9pbnRzW2luZGV4XSwgcG9pbnRzW2luZGV4ICsgMV0pO1xuICAgIH1cblxuICAgIHRoaXMuX3BhdGguc2V0QXR0cmlidXRlKCdkJywgcGF0aENtZCk7XG59O1xuXG5WYWx1ZVBsb3R0ZXIucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5fcGFyZW50LmlzRGlzYWJsZWQoKSlyZXR1cm47XG4gICAgdGhpcy5fZHJhd1ZhbHVlKCk7XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSBWYWx1ZVBsb3R0ZXI7XG5cbiIsInZhciBOb2RlID0gcmVxdWlyZSgnLi9kb2N1bWVudC9Ob2RlJyksXG4gICAgQ1NTID0gcmVxdWlyZSgnLi9kb2N1bWVudC9DU1MnKTtcbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKCcuL2V2ZW50L0V2ZW50RGlzcGF0Y2hlcicpLFxuICAgIENvbXBvbmVudEV2ZW50ICA9IHJlcXVpcmUoJy4vQ29tcG9uZW50RXZlbnQnKTtcblxuZnVuY3Rpb24gQ29tcG9uZW50KHBhcmVudCxsYWJlbCkge1xuICAgIEV2ZW50RGlzcGF0Y2hlci5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cbiAgICBsYWJlbCA9IHBhcmVudC51c2VzTGFiZWxzKCkgPyBsYWJlbCA6ICdub25lJztcblxuICAgIHRoaXMuX3BhcmVudCAgPSBwYXJlbnQ7XG4gICAgdGhpcy5fZW5hYmxlZCA9IHRydWU7XG5cbiAgICB2YXIgcm9vdCA9IHRoaXMuX25vZGUgPSBuZXcgTm9kZShOb2RlLkxJU1RfSVRFTSksXG4gICAgICAgIHdyYXAgPSB0aGlzLl93cmFwTm9kZSA9IG5ldyBOb2RlKCk7XG4gICAgICAgIHdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCk7XG4gICAgICAgIHJvb3QuYWRkQ2hpbGQod3JhcCk7XG5cbiAgICBpZiAobGFiZWwgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAobGFiZWwubGVuZ3RoICE9IDAgJiYgbGFiZWwgIT0gJ25vbmUnKSB7XG4gICAgICAgICAgICB2YXIgbGFiZWxfID0gdGhpcy5fbGFibE5vZGUgPSBuZXcgTm9kZShOb2RlLlNQQU4pO1xuICAgICAgICAgICAgICAgIGxhYmVsXy5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCk7XG4gICAgICAgICAgICAgICAgbGFiZWxfLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCBsYWJlbCk7XG4gICAgICAgICAgICAgICAgcm9vdC5hZGRDaGlsZChsYWJlbF8pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGxhYmVsID09ICdub25lJykge1xuICAgICAgICAgICAgd3JhcC5zZXRTdHlsZVByb3BlcnR5KCdtYXJnaW5MZWZ0JywgJzAnKTtcbiAgICAgICAgICAgIHdyYXAuc2V0U3R5bGVQcm9wZXJ0eSgnd2lkdGgnLCAnMTAwJScpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoQ29tcG9uZW50RXZlbnQuRU5BQkxFLCB0aGlzLCdvbkVuYWJsZScpO1xuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKENvbXBvbmVudEV2ZW50LkRJU0FCTEUsdGhpcywnb25EaXNhYmxlJyk7XG4gICAgdGhpcy5fcGFyZW50LmFkZENvbXBvbmVudE5vZGUocm9vdCk7XG59XG5Db21wb25lbnQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudERpc3BhdGNoZXIucHJvdG90eXBlKTtcbkNvbXBvbmVudC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBDb21wb25lbnQ7XG5cbkNvbXBvbmVudC5wcm90b3R5cGUuZW5hYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2VuYWJsZWQgPSB0cnVlO1xufTtcblxuQ29tcG9uZW50LnByb3RvdHlwZS5kaXNhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2VuYWJsZWQgPSBmYWxzZTtcbn07XG5cbkNvbXBvbmVudC5wcm90b3R5cGUuaXNFbmFibGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9lbmFibGVkO1xufTtcbkNvbXBvbmVudC5wcm90b3R5cGUuaXNEaXNhYmxlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gIXRoaXMuX2VuYWJsZWQ7XG59O1xuXG5Db21wb25lbnQucHJvdG90eXBlLm9uRW5hYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZW5hYmxlKCk7XG59O1xuXG5Db21wb25lbnQucHJvdG90eXBlLm9uRGlzYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc2FibGUoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50OyIsInZhciBDb21wb25lbnRFdmVudCA9IHtcblx0VkFMVUVfVVBEQVRFRDogJ3ZhbHVlVXBkYXRlZCcsXG5cdFVQREFURV9WQUxVRTogJ3VwZGF0ZVZhbHVlJyxcblxuXHRJTlBVVF9TRUxFQ1RfRFJBRzogJ2lucHV0U2VsZWN0RHJhZycsXG5cblx0RU5BQkxFICA6ICdlbmFibGUnLFxuXHRESVNBQkxFIDogJ2Rpc2FibGUnXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvbmVudEV2ZW50OyIsImZ1bmN0aW9uIENvbXBvbmVudE9iamVjdEVycm9yKG9iamVjdCxrZXkpIHtcblx0RXJyb3IuYXBwbHkodGhpcyk7XG5cdEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsQ29tcG9uZW50T2JqZWN0RXJyb3IpO1xuXHR0aGlzLm5hbWUgPSAnQ29tcG9uZW50T2JqZWN0RXJyb3InO1xuXHR0aGlzLm1lc3NhZ2UgPSAnT2JqZWN0IG9mIHR5cGUgJyArIG9iamVjdC5jb25zdHJ1Y3Rvci5uYW1lICsgJyBoYXMgbm8gbWVtYmVyICcgKyBrZXkgKyAnLic7XG59XG5Db21wb25lbnRPYmplY3RFcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVycm9yLnByb3RvdHlwZSk7XG5Db21wb25lbnRPYmplY3RFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBDb21wb25lbnRPYmplY3RFcnJvcjtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnRPYmplY3RFcnJvcjsiLCJ2YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZSgnLi9ldmVudC9FdmVudERpc3BhdGNoZXInKSxcbiAgICBFdmVudF8gPSByZXF1aXJlKCcuL2V2ZW50L0V2ZW50JyksXG4gICAgSGlzdG9yeUV2ZW50ID0gcmVxdWlyZSgnLi9IaXN0b3J5RXZlbnQnKTtcblxudmFyIE1BWF9TVEFURVMgPSAzMDtcblxuZnVuY3Rpb24gSGlzdG9yeSgpIHtcbiAgICBFdmVudERpc3BhdGNoZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB0aGlzLl9zdGF0ZXMgPSBbXTtcbiAgICB0aGlzLl9lbmFibGVkID0gZmFsc2U7XG59XG5IaXN0b3J5LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZSk7XG5IaXN0b3J5LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEhpc3Rvcnk7XG5cbkhpc3RvcnkucHJvdG90eXBlLnB1c2hTdGF0ZSA9IGZ1bmN0aW9uIChvYmplY3QsIGtleSwgdmFsdWUpIHtcbiAgICBpZiAodGhpcy5fZW5hYmxlZCl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuICAgIGlmIChzdGF0ZXMubGVuZ3RoID49IE1BWF9TVEFURVMpe1xuICAgICAgICBzdGF0ZXMuc2hpZnQoKTtcbiAgICB9XG4gICAgc3RhdGVzLnB1c2goe29iamVjdDogb2JqZWN0LCBrZXk6IGtleSwgdmFsdWU6IHZhbHVlfSk7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgSGlzdG9yeUV2ZW50LlNUQVRFX1BVU0gsIG51bGwpKTtcbn07XG5cbkhpc3RvcnkucHJvdG90eXBlLmdldFN0YXRlID0gZnVuY3Rpb24gKG9iamVjdCwga2V5KSB7XG4gICAgdmFyIHN0YXRlcyA9IHRoaXMuX3N0YXRlcyxcbiAgICAgICAgc3RhdGVzTGVuID0gc3RhdGVzLmxlbmd0aDtcblxuICAgIGlmIChzdGF0ZXNMZW4gPT0gMCl7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHZhciBzdGF0ZSwgdmFsdWU7XG4gICAgdmFyIGkgPSAtMTtcbiAgICB3aGlsZSAoKytpIDwgc3RhdGVzTGVuKSB7XG4gICAgICAgIHN0YXRlID0gc3RhdGVzW2ldO1xuICAgICAgICBpZiAoc3RhdGUub2JqZWN0ID09PSBvYmplY3QpIHtcbiAgICAgICAgICAgIGlmIChzdGF0ZS5rZXkgPT09IGtleSkge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gc3RhdGUudmFsdWU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlO1xufTtcblxuSGlzdG9yeS5wcm90b3R5cGUucG9wU3RhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuX2VuYWJsZWQpe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcbiAgICBpZiAoc3RhdGVzLmxlbmd0aCA8IDEpe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGxhc3RTdGF0ZSA9IHN0YXRlcy5wb3AoKTtcbiAgICBsYXN0U3RhdGUub2JqZWN0W2xhc3RTdGF0ZS5rZXldID0gbGFzdFN0YXRlLnZhbHVlO1xuXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgSGlzdG9yeUV2ZW50LlNUQVRFX1BPUCwgbnVsbCkpO1xufTtcblxuSGlzdG9yeS5wcm90b3R5cGUuZ2V0TnVtU3RhdGVzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9zdGF0ZXMubGVuZ3RoO1xufTtcblxuSGlzdG9yeS5faW5zdGFuY2UgPSBudWxsO1xuXG5IaXN0b3J5LnNldHVwID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBIaXN0b3J5Ll9pbnN0YW5jZSA9IG5ldyBIaXN0b3J5KCk7XG59O1xuXG5IaXN0b3J5LmdldCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gSGlzdG9yeS5faW5zdGFuY2U7XG59O1xuXG5IaXN0b3J5LnByb3RvdHlwZS5lbmFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fZW5hYmxlZCA9IGZhbHNlO1xufTtcbkhpc3RvcnkucHJvdG90eXBlLmRpc2FibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fZW5hYmxlZCA9IHRydWU7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEhpc3Rvcnk7IiwidmFyIEhpc3RvcnlFdmVudCA9IHtcblx0U1RBVEVfUFVTSDogJ2hpc3RvcnlTdGF0ZVB1c2gnLFxuXHRTVEFURV9QT1A6ICdoaXN0b3J5U3RhdGVQb3AnXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEhpc3RvcnlFdmVudDsiLCJ2YXIgSGlzdG9yeSA9IHJlcXVpcmUoJy4vSGlzdG9yeScpO1xudmFyIENvbXBvbmVudCA9IHJlcXVpcmUoJy4vQ29tcG9uZW50JyksXG4gICAgQ29tcG9uZW50RXZlbnQgPSByZXF1aXJlKCcuL0NvbXBvbmVudEV2ZW50JyksXG4gICAgT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIgPSByZXF1aXJlKCcuL09iamVjdENvbXBvbmVudE5vdGlmaWVyJyksXG4gICAgQ29tcG9uZW50T2JqZWN0RXJyb3IgPSByZXF1aXJlKCcuL0NvbXBvbmVudE9iamVjdEVycm9yJyk7XG52YXIgRXZlbnRfID0gcmVxdWlyZSgnLi9ldmVudC9FdmVudCcpO1xuXG5mdW5jdGlvbiBPYmplY3RDb21wb25lbnQocGFyZW50LCBvYmosIGtleSwgcGFyYW1zKSB7XG4gICAgaWYgKG9ialtrZXldID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IENvbXBvbmVudE9iamVjdEVycm9yKG9iaiwga2V5KTtcbiAgICB9XG4gICAgcGFyYW1zID0gcGFyYW1zIHx8IHt9O1xuICAgIHBhcmFtcy5sYWJlbCA9IHBhcmFtcy5sYWJlbCB8fCBrZXk7XG5cbiAgICBDb21wb25lbnQuYXBwbHkodGhpcywgW3BhcmVudCwgcGFyYW1zLmxhYmVsXSk7XG5cbiAgICB0aGlzLl9vYmogPSBvYmo7XG4gICAgdGhpcy5fa2V5ID0ga2V5O1xuICAgIHRoaXMuX29uQ2hhbmdlID0gZnVuY3Rpb24oKXt9O1xuXG4gICAgT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIuZ2V0KCkuYWRkRXZlbnRMaXN0ZW5lcihDb21wb25lbnRFdmVudC5VUERBVEVfVkFMVUUsIHRoaXMsICdvblZhbHVlVXBkYXRlJyk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIE9iamVjdENvbXBvbmVudE5vdGlmaWVyLmdldCgpLCAnb25WYWx1ZVVwZGF0ZWQnKTtcbn1cbk9iamVjdENvbXBvbmVudC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKENvbXBvbmVudC5wcm90b3R5cGUpO1xuT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IE9iamVjdENvbXBvbmVudDtcblxuLy9PdmVycmlkZSBpbiBTdWJjbGFzc1xuT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZS5hcHBseVZhbHVlID0gZnVuY3Rpb24oKSB7fTtcbk9iamVjdENvbXBvbmVudC5wcm90b3R5cGUub25WYWx1ZVVwZGF0ZSA9IGZ1bmN0aW9uIChlKSB7fTtcblxuT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZS5wdXNoSGlzdG9yeVN0YXRlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBvYmogPSB0aGlzLl9vYmosIGtleSA9IHRoaXMuX2tleTtcbiAgICBIaXN0b3J5LmdldCgpLnB1c2hTdGF0ZShvYmosIGtleSwgb2JqW2tleV0pO1xufTtcblxuT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZS5zZXRWYWx1ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHRoaXMuX29ialt0aGlzLl9rZXldID0gdmFsdWU7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcyxDb21wb25lbnRFdmVudC5WQUxVRV9VUERBVEVELG51bGwpKTtcbn07XG5cbk9iamVjdENvbXBvbmVudC5wcm90b3R5cGUuZ2V0RGF0YSA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIG9iaiA9IHt9O1xuICAgICAgICBvYmpbdGhpcy5fa2V5XSA9IHRoaXMuX29ialt0aGlzLl9rZXldO1xuICAgIHJldHVybiBvYmo7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE9iamVjdENvbXBvbmVudDtcbiIsInZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKCcuL2V2ZW50L0V2ZW50RGlzcGF0Y2hlcicpLFxuXHRFdmVudF8gXHRcdFx0PSByZXF1aXJlKCcuL2V2ZW50L0V2ZW50Jyk7XG52YXIgQ29tcG9uZW50RXZlbnQgID0gcmVxdWlyZSgnLi9Db21wb25lbnRFdmVudCcpLFxuXHRPcHRpb25FdmVudFx0XHQ9IHJlcXVpcmUoJy4vT3B0aW9uRXZlbnQnKTtcblxuZnVuY3Rpb24gT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIoKXtcblx0RXZlbnREaXNwYXRjaGVyLmFwcGx5KHRoaXMpO1xufVxuT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudERpc3BhdGNoZXIucHJvdG90eXBlKTtcbk9iamVjdENvbXBvbmVudE5vdGlmaWVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IE9iamVjdENvbXBvbmVudE5vdGlmaWVyO1xuXG5PYmplY3RDb21wb25lbnROb3RpZmllci5wcm90b3R5cGUub25WYWx1ZVVwZGF0ZWQgPSBmdW5jdGlvbiAoZSkge1xuXHR0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBDb21wb25lbnRFdmVudC5VUERBVEVfVkFMVUUsIHtvcmlnaW46IGUuc2VuZGVyfSkpO1xufTtcblxuT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIucHJvdG90eXBlLm9uT3B0aW9uVHJpZ2dlcmVkID0gZnVuY3Rpb24oZSkge1xuXHR0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBPcHRpb25FdmVudC5UUklHR0VSLCB7b3JpZ2luOiBlLnNlbmRlcn0pKTtcbn07XG5cbnZhciBpbnN0YW5jZSA9IG51bGw7XG5cbk9iamVjdENvbXBvbmVudE5vdGlmaWVyLmdldCA9IGZ1bmN0aW9uKCl7XG5cdGlmKCFpbnN0YW5jZSl7XG5cdFx0aW5zdGFuY2UgPSBuZXcgT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIoKTtcblx0fVxuXHRyZXR1cm4gaW5zdGFuY2U7XG59O1xuXG5PYmplY3RDb21wb25lbnROb3RpZmllci5kZXN0cm95ID0gZnVuY3Rpb24oKXtcblx0aW5zdGFuY2UgPSBudWxsO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBPYmplY3RDb21wb25lbnROb3RpZmllcjsiLCJ2YXIgT3B0aW9uRXZlbnQgPSB7XG5cdFRSSUdHRVJFRDogJ3NlbGVjdFRyaWdnZXInLFxuXHRUUklHR0VSOiAndHJpZ2dlclNlbGVjdCdcbn07XG5tb2R1bGUuZXhwb3J0cyA9IE9wdGlvbkV2ZW50OyIsInZhciBEaWFsb2dUZW1wbGF0ZSA9XG4gICAgJzxoZWFkPlxcbicgK1xuICAgICcgICA8dGl0bGU+Q29udHJvbEtpdCBTdGF0ZTwvdGl0bGU+XFxuJyArXG4gICAgJyAgIDxzdHlsZSB0eXBlPVwidGV4dC9jc3NcIj5cXG4nICtcbiAgICAnICAgICAgYm9keXtcXG4nICtcbiAgICAnICAgICAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XFxuJyArXG4gICAgJyAgICAgICAgICBwYWRkaW5nOiAyMHB4O1xcbicgK1xuICAgICcgICAgICAgICAgbWFyZ2luOiAwO1xcbicgK1xuICAgICcgICAgICAgICAgZm9udC1mYW1pbHk6IEFyaWFsLCBzYW5zLXNlcmlmO1xcbicgK1xuICAgICcgICAgICAgICAgd2lkdGg6IDEwMCU7XFxuJyArXG4gICAgJyAgICAgIH1cXG4nICtcbiAgICAnICAgICAgdGV4dGFyZWF7XFxuJyArXG4gICAgJyAgICAgICAgICBtYXJnaW4tYm90dG9tOjEwcHg7XFxuJyArXG4gICAgJyAgICAgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94O1xcbicgK1xuICAgICcgICAgICAgICAgcGFkZGluZzogMDtcXG4nICtcbiAgICAnICAgICAgICAgIGJvcmRlcjogMDtcXG4nICtcbiAgICAnICAgICAgICAgIGJvcmRlcjogMXB4IHNvbGlkICNkZWRlZGU7XFxuJyArXG4gICAgJyAgICAgICAgICBvdXRsaW5lOiBub25lO1xcbicgK1xuICAgICcgICAgICAgICAgZm9udC1mYW1pbHk6IE1vbmFjbywgbW9ub3NwYWNlO1xcbicgK1xuICAgICcgICAgICAgICAgZm9udC1zaXplOiAxMXB4O1xcbicgK1xuICAgICcgICAgICAgICAgcmVzaXplOiBub25lO1xcbicgK1xuICAgICcgICAgICAgICAgd29yZC13cmFwOiBicmVhay13b3JkO1xcbicgK1xuICAgICcgICAgICAgICAgZGlzcGxheTogYmxvY2s7XFxuJyArXG4gICAgJyAgICAgICAgICB3aWR0aDogMTAwJTtcXG4nICtcbiAgICAnICAgICAgICAgIG92ZXJmbG93LXk6IHNjcm9sbDtcXG4nICtcbiAgICAnICAgICAgICAgIGhlaWdodDogMTI1cHg7XFxuJyArXG4gICAgJyAgICAgIH1cXG4nICtcbiAgICAnICAgICAgYnV0dG9ue1xcbicgK1xuICAgICcgICAgICAgICAgbWFyZ2luOiAwO1xcbicgK1xuICAgICcgICAgICAgICAgcGFkZGluZzogMCA1cHggM3B4IDVweDtcXG4nICtcbiAgICAnICAgICAgICAgIGhlaWdodDogMjBweDtcXG4nICtcbiAgICAnICAgICAgfVxcbicrXG4gICAgJyAgICAgICNzYXZlLCNmaWxlbmFtZSwjbG9hZHtcXG4nICtcbiAgICAnICAgICAgICAgIGZsb2F0OiByaWdodDtcXG4nICtcbiAgICAnICAgICAgfVxcbicgK1xuICAgICcgICAgICBpbnB1dFt0eXBlPVwidGV4dFwiXXtcXG4nICtcbiAgICAnICAgICAgICAgIG1hcmdpbjogMDtcXG4nICtcbiAgICAnICAgICAgICAgIHBhZGRpbmc6IDA7XFxuJyArXG4gICAgJyAgICAgICAgICB3aWR0aDogNDUlO1xcbicgK1xuICAgICcgICAgICAgICAgaGVpZ2h0OjIwcHg7XFxuJyArXG4gICAgJyAgICAgIH1cXG4nK1xuICAgICcgICA8L3N0eWxlPlxcbicgK1xuICAgICc8L2hlYWQ+XFxuJyArXG4gICAgJzxib2R5PlxcbicgK1xuICAgICcgICA8dGV4dGFyZWEgbmFtZT1cInN0YXRlXCIgaWQ9XCJzdGF0ZVwiPjwvdGV4dGFyZWE+XFxuJyArXG4gICAgJzwvYm9keT4nO1xuXG52YXIgU2F2ZURpYWxvZ1RlbXBsYXRlID1cbiAgICAnPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgaWQ9XCJzYXZlXCI+U2F2ZTwvYnV0dG9uPlxcbicgK1xuICAgICc8aW5wdXQgdHlwZT1cInRleHRcIiBpZD1cImZpbGVuYW1lXCIgdmFsdWU9XCJjay1zdGF0ZS5qc29uXCI+PC9pbnB1dD4nO1xuXG52YXIgTG9hZERpYWxvZ1RlbXBsYXRlID1cbiAgICAnPGlucHV0IHR5cGU9XCJmaWxlXCIgaWQ9XCJsb2FkLWRpc2tcIj48L2J1dHRvbj4nICtcbiAgICAnPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgaWQ9XCJsb2FkXCI+TG9hZDwvYnV0dG9uPic7XG5cbmZ1bmN0aW9uIGNyZWF0ZVdpbmRvdygpe1xuICAgIHZhciB3aWR0aCA9IDMyMCwgaGVpZ2h0ID0gMjAwO1xuICAgIHZhciB3aW5kb3dfID0gd2luZG93Lm9wZW4oJycsJycsJ1xcXG4gICAgICAgIHdpZHRoPScgKyB3aWR0aCArICcsXFxcbiAgICAgICAgaGVpZ2h0PScgKyBoZWlnaHQgKyAnLFxcXG4gICAgICAgIGxlZnQ9JyArICh3aW5kb3cuc2NyZWVuWCArIHdpbmRvdy5pbm5lcldpZHRoICogMC41IC0gd2lkdGggKiAwLjUpICsgJyxcXFxuICAgICAgICB0b3A9JyArICh3aW5kb3cuc2NyZWVuWSArIHdpbmRvdy5pbm5lckhlaWdodCAqIDAuNSAtIGhlaWdodCAqIDAuNSkgKyAnLFxcXG4gICAgICAgIGxvY2F0aW9uPTAsXFxcbiAgICAgICAgdGl0bGViYXI9MCxcXFxuICAgICAgICByZXNpemFibGU9MCcpO1xuICAgIHdpbmRvd18uZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmlubmVySFRNTCA9IERpYWxvZ1RlbXBsYXRlO1xuICAgIHJldHVybiB3aW5kb3dfO1xufVxuXG5mdW5jdGlvbiBzYXZlKGRhdGEpe1xuICAgIHZhciB3aW5kb3dfID0gY3JlYXRlV2luZG93KCk7XG4gICAgdmFyIGRvY3VtZW50XyA9IHdpbmRvd18uZG9jdW1lbnQ7XG4gICAgICAgIGRvY3VtZW50Xy5ib2R5LmlubmVySFRNTCArPSBTYXZlRGlhbG9nVGVtcGxhdGU7XG4gICAgICAgIGRvY3VtZW50Xy5nZXRFbGVtZW50QnlJZCgnc2F2ZScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxmdW5jdGlvbigpe1xuICAgICAgICAgICAgLy9sb2cgJiBzYXZlIGluIG1haW4gd2luZG93XG4gICAgICAgICAgICB2YXIgc3RyICA9IGRvY3VtZW50Xy5nZXRFbGVtZW50QnlJZCgnc3RhdGUnKS52YWx1ZSxcbiAgICAgICAgICAgICAgICBibG9iID0gbmV3IEJsb2IoW3N0cl0se3R5cGU6J2FwcGxpY2F0aW9uOmpzb24nfSksXG4gICAgICAgICAgICAgICAgbmFtZSA9IGRvY3VtZW50Xy5nZXRFbGVtZW50QnlJZCgnZmlsZW5hbWUnKS52YWx1ZTtcbiAgICAgICAgICAgIHZhciBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICAgICAgICAgICAgYS5kb3dubG9hZCA9IG5hbWU7XG4gICAgICAgICAgICBpZih3aW5kb3cud2Via2l0VVJMKXtcbiAgICAgICAgICAgICAgICBhLmhyZWYgPSB3aW5kb3cud2Via2l0VVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYS5ocmVmID0gd2luZG93LmNyZWF0ZU9iamVjdFVSTChibG9iKTtcbiAgICAgICAgICAgICAgICBhLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgICAgICAgICAgICAgYS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnRfLmJvZHkucmVtb3ZlQ2hpbGQoYSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnRfLmJvZHkuYXBwZW5kQ2hpbGQoYSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhLmNsaWNrKCk7XG4gICAgICAgIH0pO1xuICAgIGRvY3VtZW50Xy5nZXRFbGVtZW50QnlJZCgnc3RhdGUnKS5pbm5lclRleHQgPSBKU09OLnN0cmluZ2lmeShkYXRhKTtcbn1cblxuZnVuY3Rpb24gbG9hZChjYWxsYmFjayl7XG4gICAgdmFyIHdpbmRvd18gPSBjcmVhdGVXaW5kb3coKTtcbiAgICB2YXIgZG9jdW1lbnRfID0gd2luZG93Xy5kb2N1bWVudDtcbiAgICAgICAgZG9jdW1lbnRfLmJvZHkuaW5uZXJIVE1MICs9IExvYWREaWFsb2dUZW1wbGF0ZTtcbiAgICB2YXIgaW5wdXQgICA9IGRvY3VtZW50Xy5nZXRFbGVtZW50QnlJZCgnc3RhdGUnKTtcbiAgICB2YXIgYnRuTG9hZCA9IGRvY3VtZW50Xy5nZXRFbGVtZW50QnlJZCgnbG9hZCcpO1xuICAgICAgICBidG5Mb2FkLmRpc2FibGVkID0gdHJ1ZTtcblxuICAgIGZ1bmN0aW9uIHZhbGlkYXRlSW5wdXQoKXtcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgdmFyIG9iaiA9IEpTT04ucGFyc2UoaW5wdXQudmFsdWUpO1xuICAgICAgICAgICAgaWYob2JqICYmIHR5cGVvZiBvYmogPT09ICdvYmplY3QnICYmIG9iaiAhPT0gbnVsbCl7XG4gICAgICAgICAgICAgICAgYnRuTG9hZC5kaXNhYmxlZCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIGJ0bkxvYWQuZGlzYWJsZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhbGlkYXRlSW5wdXQoKTtcbiAgICB9KTtcbiAgICBkb2N1bWVudF8uZ2V0RWxlbWVudEJ5SWQoJ2xvYWQnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHN0ciA9IGlucHV0LnZhbHVlO1xuICAgICAgICBjYWxsYmFjayhKU09OLnBhcnNlKHN0cikuZGF0YSk7XG4gICAgICAgIHdpbmRvd18uY2xvc2UoKTtcbiAgICB9KTtcbiAgICB2YXIgbG9hZEZyb21EaXNrID0gZG9jdW1lbnRfLmdldEVsZW1lbnRCeUlkKCdsb2FkLWRpc2snKTtcbiAgICAgICAgbG9hZEZyb21EaXNrLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuICAgICAgICAgICAgcmVhZGVyLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWRlbmQnLGZ1bmN0aW9uKGUpe1xuICAgICAgICAgICAgICAgIGlucHV0LnZhbHVlID0gZS50YXJnZXQucmVzdWx0O1xuICAgICAgICAgICAgICAgIHZhbGlkYXRlSW5wdXQoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmVhZGVyLnJlYWRBc1RleHQobG9hZEZyb21EaXNrLmZpbGVzWzBdLCd1dGYtOCcpO1xuICAgICAgICB9KTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgbG9hZCA6IGxvYWQsXG4gICAgc2F2ZSA6IHNhdmVcbn07IiwiZnVuY3Rpb24gQ29sb3JGb3JtYXRFcnJvcihtc2cpIHtcblx0RXJyb3IuYXBwbHkodGhpcyk7XG5cdEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsQ29sb3JGb3JtYXRFcnJvcik7XG5cdHRoaXMubmFtZSA9ICdDb2xvckZvcm1hdEVycm9yJztcblx0dGhpcy5tZXNzYWdlID0gbXNnO1xufVxuQ29sb3JGb3JtYXRFcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVycm9yLnByb3RvdHlwZSk7XG5Db2xvckZvcm1hdEVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IENvbG9yRm9ybWF0RXJyb3I7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29sb3JGb3JtYXRFcnJvcjsiLCJ2YXIgQ29sb3JNb2RlID0ge1xuXHRSR0IgIDogJ3JnYicsXG5cdEhTViAgOiAnaHN2Jyxcblx0SEVYICA6ICdoZXgnLFxuXHRSR0JmdjogJ3JnYmZ2J1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb2xvck1vZGU7IiwidmFyIENvbG9yVXRpbCA9IHtcblx0SFNWMlJHQjogZnVuY3Rpb24gKGh1ZSwgc2F0LCB2YWwpIHtcblx0XHR2YXIgbWF4X2h1ZSA9IDM2MC4wLFxuXHRcdFx0bWF4X3NhdCA9IDEwMC4wLFxuXHRcdFx0bWF4X3ZhbCA9IDEwMC4wO1xuXG5cdFx0dmFyIG1pbl9odWUgPSAwLjAsXG5cdFx0XHRtaW5fc2F0ID0gMCxcblx0XHRcdG1pbl92YWwgPSAwO1xuXG5cdFx0aHVlID0gaHVlICUgbWF4X2h1ZTtcblx0XHR2YWwgPSBNYXRoLm1heChtaW5fdmFsLCBNYXRoLm1pbih2YWwsIG1heF92YWwpKSAvIG1heF92YWwgKiAyNTUuMDtcblxuXHRcdGlmIChzYXQgPD0gbWluX3NhdCkge1xuXHRcdFx0dmFsID0gTWF0aC5yb3VuZCh2YWwpO1xuXHRcdFx0cmV0dXJuIFt2YWwsIHZhbCwgdmFsXTtcblx0XHR9XG5cdFx0ZWxzZSBpZiAoc2F0ID4gbWF4X3NhdClzYXQgPSBtYXhfc2F0O1xuXG5cdFx0c2F0ID0gc2F0IC8gbWF4X3NhdDtcblxuXHRcdC8vaHR0cDovL2QuaGF0ZW5hLm5lLmpwL2phOS8yMDEwMDkwMy8xMjgzNTA0MzRcblxuXHRcdHZhciBoaSA9IE1hdGguZmxvb3IoaHVlIC8gNjAuMCkgJSA2LFxuXHRcdFx0ZiA9IChodWUgLyA2MC4wKSAtIGhpLFxuXHRcdFx0cCA9IHZhbCAqICgxIC0gc2F0KSxcblx0XHRcdHEgPSB2YWwgKiAoMSAtIGYgKiBzYXQpLFxuXHRcdFx0dCA9IHZhbCAqICgxIC0gKDEgLSBmKSAqIHNhdCk7XG5cblx0XHR2YXIgciA9IDAsXG5cdFx0XHRnID0gMCxcblx0XHRcdGIgPSAwO1xuXG5cdFx0c3dpdGNoIChoaSkge1xuXHRcdFx0Y2FzZSAwOlxuXHRcdFx0XHRyID0gdmFsO1xuXHRcdFx0XHRnID0gdDtcblx0XHRcdFx0YiA9IHA7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAxOlxuXHRcdFx0XHRyID0gcTtcblx0XHRcdFx0ZyA9IHZhbDtcblx0XHRcdFx0YiA9IHA7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAyOlxuXHRcdFx0XHRyID0gcDtcblx0XHRcdFx0ZyA9IHZhbDtcblx0XHRcdFx0YiA9IHQ7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAzOlxuXHRcdFx0XHRyID0gcDtcblx0XHRcdFx0ZyA9IHE7XG5cdFx0XHRcdGIgPSB2YWw7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSA0OlxuXHRcdFx0XHRyID0gdDtcblx0XHRcdFx0ZyA9IHA7XG5cdFx0XHRcdGIgPSB2YWw7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSA1OlxuXHRcdFx0XHRyID0gdmFsO1xuXHRcdFx0XHRnID0gcDtcblx0XHRcdFx0YiA9IHE7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0YnJlYWs7XG5cdFx0fVxuXG5cdFx0ciA9IE1hdGgucm91bmQocik7XG5cdFx0ZyA9IE1hdGgucm91bmQoZyk7XG5cdFx0YiA9IE1hdGgucm91bmQoYik7XG5cblx0XHRyZXR1cm4gW3IsIGcsIGJdO1xuXG5cdH0sXG5cblx0UkdCMkhTVjogZnVuY3Rpb24gKHIsIGcsIGIpIHtcblx0XHR2YXIgaCA9IDAsXG5cdFx0XHRzID0gMCxcblx0XHRcdHYgPSAwO1xuXG5cdFx0ciA9IHIgLyAyNTUuMDtcblx0XHRnID0gZyAvIDI1NS4wO1xuXHRcdGIgPSBiIC8gMjU1LjA7XG5cblx0XHR2YXIgbWluUkdCID0gTWF0aC5taW4ociwgTWF0aC5taW4oZywgYikpLFxuXHRcdFx0bWF4UkdCID0gTWF0aC5tYXgociwgTWF0aC5tYXgoZywgYikpO1xuXG5cdFx0aWYgKG1pblJHQiA9PSBtYXhSR0IpIHtcblx0XHRcdHYgPSBtaW5SR0I7XG5cdFx0XHRyZXR1cm4gWzAsIDAsIE1hdGgucm91bmQodildO1xuXHRcdH1cblxuXHRcdHZhciBkZCA9IChyID09IG1pblJHQikgPyBnIC0gYiA6ICgoYiA9PSBtaW5SR0IpID8gciAtIGcgOiBiIC0gciksXG5cdFx0XHRoaCA9IChyID09IG1pblJHQikgPyAzIDogKChiID09IG1pblJHQikgPyAxIDogNSk7XG5cblx0XHRoID0gTWF0aC5yb3VuZCg2MCAqIChoaCAtIGRkIC8gKG1heFJHQiAtIG1pblJHQikpKTtcblx0XHRzID0gTWF0aC5yb3VuZCgobWF4UkdCIC0gbWluUkdCKSAvIG1heFJHQiAqIDEwMC4wKTtcblx0XHR2ID0gTWF0aC5yb3VuZChtYXhSR0IgKiAxMDAuMCk7XG5cblx0XHRyZXR1cm4gW2gsIHMsIHZdO1xuXHR9LFxuXG5cdFJHQjJIRVg6IGZ1bmN0aW9uIChyLCBnLCBiKSB7XG5cdFx0cmV0dXJuIFwiI1wiICsgKCgxIDw8IDI0KSArIChyIDw8IDE2KSArIChnIDw8IDgpICsgYikudG9TdHJpbmcoMTYpLnNsaWNlKDEpO1xuXHR9LFxuXG5cdFJHQmZ2MkhFWDogZnVuY3Rpb24gKHIsIGcsIGIpIHtcblx0XHRyZXR1cm4gQ29sb3JVdGlsLlJHQjJIRVgoTWF0aC5mbG9vcihyICogMjU1LjApLFxuXHRcdFx0TWF0aC5mbG9vcihnICogMjU1LjApLFxuXHRcdFx0TWF0aC5mbG9vcihiICogMjU1LjApKTtcblx0fSxcblxuXHRIU1YySEVYOiBmdW5jdGlvbiAoaCwgcywgdikge1xuXHRcdHZhciByZ2IgPSBDb250cm9sS2l0LkNvbG9yVXRpbC5IU1YyUkdCKGgsIHMsIHYpO1xuXHRcdHJldHVybiBDb250cm9sS2l0LkNvbG9yVXRpbC5SR0IySEVYKHJnYlswXSwgcmdiWzFdLCByZ2JbMl0pO1xuXHR9LFxuXG5cdEhFWDJSR0I6IGZ1bmN0aW9uIChoZXgpIHtcblx0XHR2YXIgc2hvcnRoYW5kUmVnZXggPSAvXiM/KFthLWZcXGRdKShbYS1mXFxkXSkoW2EtZlxcZF0pJC9pO1xuXHRcdGhleCA9IGhleC5yZXBsYWNlKHNob3J0aGFuZFJlZ2V4LCBmdW5jdGlvbiAobSwgciwgZywgYikge1xuXHRcdFx0cmV0dXJuIHIgKyByICsgZyArIGcgKyBiICsgYjtcblx0XHR9KTtcblxuXHRcdHZhciByZXN1bHQgPSAvXiM/KFthLWZcXGRdezJ9KShbYS1mXFxkXXsyfSkoW2EtZlxcZF17Mn0pJC9pLmV4ZWMoaGV4KTtcblx0XHRyZXR1cm4gcmVzdWx0ID8gW3BhcnNlSW50KHJlc3VsdFsxXSwgMTYpLCBwYXJzZUludChyZXN1bHRbMl0sIDE2KSwgcGFyc2VJbnQocmVzdWx0WzNdLCAxNildIDogbnVsbDtcblxuXHR9LFxuXG5cdGlzVmFsaWRIRVg6IGZ1bmN0aW9uIChoZXgpIHtcblx0XHRyZXR1cm4gL14jWzAtOUEtRl17Nn0kL2kudGVzdChoZXgpO1xuXHR9LFxuXG5cdGlzVmFsaWRSR0I6IGZ1bmN0aW9uIChyLCBnLCBiKSB7XG5cdFx0cmV0dXJuIHIgPj0gMCAmJiByIDw9IDI1NSAmJlxuXHRcdFx0ZyA+PSAwICYmIGcgPD0gMjU1ICYmXG5cdFx0XHRiID49IDAgJiYgYiA8PSAyNTU7XG5cdH0sXG5cblx0aXNWYWxpZFJHQmZ2OiBmdW5jdGlvbiAociwgZywgYikge1xuXHRcdHJldHVybiByID49IDAgJiYgciA8PSAxLjAgJiZcblx0XHRcdGcgPj0gMCAmJiBnIDw9IDEuMCAmJlxuXHRcdFx0YiA+PSAwICYmIGIgPD0gMS4wO1xuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbG9yVXRpbDsiLCJ2YXIgQ1NTID0ge1xuICAgIENvbnRyb2xLaXQ6ICdjb250cm9sS2l0JyxcblxuICAgIFBhbmVsOiAncGFuZWwnLFxuICAgIEhlYWQ6ICdoZWFkJyxcbiAgICBMYWJlbDogJ2xhYmVsJyxcbiAgICBNZW51OiAnbWVudScsXG4gICAgV3JhcDogJ3dyYXAnLFxuXG4gICAgQnV0dG9uTWVudUNsb3NlOiAnYnV0dG9uLW1lbnUtY2xvc2UnLFxuICAgIEJ1dHRvbk1lbnVIaWRlOiAnYnV0dG9uLW1lbnUtaGlkZScsXG4gICAgQnV0dG9uTWVudVNob3c6ICdidXR0b24tbWVudS1zaG93JyxcbiAgICBCdXR0b25NZW51VW5kbzogJ2J1dHRvbi1tZW51LXVuZG8nLFxuICAgIEJ1dHRvbk1lbnVMb2FkOiAnYnV0dG9uLW1lbnUtbG9hZCcsXG4gICAgQnV0dG9uTWVudVNhdmU6ICdidXR0b24tbWVudS1zYXZlJyxcbiAgICBNZW51QWN0aXZlOiAnbWVudS1hY3RpdmUnLFxuXG4gICAgQnV0dG9uOiAnYnV0dG9uJyxcbiAgICBCdXR0b25QcmVzZXQ6ICdidXR0b24tcHJlc2V0JyxcbiAgICBCdXR0b25QcmVzZXRBY3RpdmU6ICdidXR0b24tcHJlc2V0LWFjdGl2ZScsXG5cbiAgICBXcmFwSW5wdXRXUHJlc2V0OiAnaW5wdXQtd2l0aC1wcmVzZXQtd3JhcCcsXG4gICAgV3JhcENvbG9yV1ByZXNldDogJ2NvbG9yLXdpdGgtcHJlc2V0LXdyYXAnLFxuXG4gICAgSGVhZEluYWN0aXZlOiAnaGVhZC1pbmFjdGl2ZScsXG4gICAgUGFuZWxIZWFkSW5hY3RpdmU6ICdwYW5lbC1oZWFkLWluYWN0aXZlJyxcblxuICAgIEdyb3VwTGlzdDogJ2dyb3VwLWxpc3QnLFxuICAgIEdyb3VwOiAnZ3JvdXAnLFxuICAgIFN1Ykdyb3VwTGlzdDogJ3N1Yi1ncm91cC1saXN0JyxcbiAgICBTdWJHcm91cDogJ3N1Yi1ncm91cCcsXG5cblxuICAgIFRleHRBcmVhV3JhcDogJ3RleHRhcmVhLXdyYXAnLFxuXG4gICAgV3JhcFNsaWRlcjogJ3dyYXAtc2xpZGVyJyxcbiAgICBTbGlkZXJXcmFwOiAnc2xpZGVyLXdyYXAnLFxuICAgIFNsaWRlclNsb3Q6ICdzbGlkZXItc2xvdCcsXG4gICAgU2xpZGVySGFuZGxlOiAnc2xpZGVyLWhhbmRsZScsXG5cbiAgICBBcnJvd0JNaW46ICdhcnJvdy1iLW1pbicsXG4gICAgQXJyb3dCTWF4OiAnYXJyb3ctYi1tYXgnLFxuICAgIEFycm93QlN1Yk1pbjogJ2Fycm93LWItc3ViLW1pbicsXG4gICAgQXJyb3dCU3ViTWF4OiAnYXJyb3ctYi1zdWItbWF4JyxcbiAgICBBcnJvd1NNaW46ICdhcnJvdy1zLW1pbicsXG4gICAgQXJyb3dTTWF4OiAnYXJyb3ctcy1tYXgnLFxuXG4gICAgU2VsZWN0OiAnc2VsZWN0JyxcbiAgICBTZWxlY3RBY3RpdmU6ICdzZWxlY3QtYWN0aXZlJyxcblxuICAgIE9wdGlvbnM6ICdvcHRpb25zJyxcbiAgICBPcHRpb25zU2VsZWN0ZWQ6ICdsaS1zZWxlY3RlZCcsXG5cbiAgICBDYW52YXNMaXN0SXRlbTogJ2NhbnZhcy1saXN0LWl0ZW0nLFxuICAgIENhbnZhc1dyYXA6ICdjYW52YXMtd3JhcCcsXG5cbiAgICBTVkdMaXN0SXRlbTogJ3N2Zy1saXN0LWl0ZW0nLFxuICAgIFNWR1dyYXA6ICdzdmctd3JhcCcsXG5cbiAgICBHcmFwaFNsaWRlclhXcmFwOiAnZ3JhcGgtc2xpZGVyLXgtd3JhcCcsXG4gICAgR3JhcGhTbGlkZXJZV3JhcDogJ2dyYXBoLXNsaWRlci15LXdyYXAnLFxuICAgIEdyYXBoU2xpZGVyWDogJ2dyYXBoLXNsaWRlci14JyxcbiAgICBHcmFwaFNsaWRlclk6ICdncmFwaC1zbGlkZXIteScsXG4gICAgR3JhcGhTbGlkZXJYSGFuZGxlOiAnZ3JhcGgtc2xpZGVyLXgtaGFuZGxlJyxcbiAgICBHcmFwaFNsaWRlcllIYW5kbGU6ICdncmFwaC1zbGlkZXIteS1oYW5kbGUnLFxuXG4gICAgUGlja2VyOiAncGlja2VyJyxcbiAgICBQaWNrZXJGaWVsZFdyYXA6ICdmaWVsZC13cmFwJyxcbiAgICBQaWNrZXJJbnB1dFdyYXA6ICdpbnB1dC13cmFwJyxcbiAgICBQaWNrZXJJbnB1dEZpZWxkOiAnaW5wdXQtZmllbGQnLFxuICAgIFBpY2tlckNvbnRyb2xzV3JhcDogJ2NvbnRyb2xzLXdyYXAnLFxuICAgIFBpY2tlckNvbG9yQ29udHJhc3Q6ICdjb2xvci1jb250cmFzdCcsXG4gICAgUGlja2VySGFuZGxlRmllbGQ6ICdpbmRpY2F0b3InLFxuICAgIFBpY2tlckhhbmRsZVNsaWRlcjogJ2luZGljYXRvcicsXG5cbiAgICBDb2xvcjogJ2NvbG9yJyxcblxuICAgIFNjcm9sbEJhcjogJ3Njcm9sbEJhcicsXG4gICAgU2Nyb2xsV3JhcDogJ3Njcm9sbC13cmFwJyxcbiAgICBTY3JvbGxCYXJCdG5VcDogJ2J0blVwJyxcbiAgICBTY3JvbGxCYXJCdG5Eb3duOiAnYnRuRG93bicsXG4gICAgU2Nyb2xsQmFyVHJhY2s6ICd0cmFjaycsXG4gICAgU2Nyb2xsQmFyVGh1bWI6ICd0aHVtYicsXG4gICAgU2Nyb2xsQnVmZmVyOiAnc2Nyb2xsLWJ1ZmZlcicsXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENTUztcbiIsInZhciBEb2N1bWVudEV2ZW50ID0ge1xuICAgIE1PVVNFX01PVkU6ICdtb3VzZW1vdmUnLFxuICAgIE1PVVNFX1VQOiAnbW91c2V1cCcsXG4gICAgTU9VU0VfRE9XTjogJ21vdXNlZG93bicsXG4gICAgTU9VU0VfV0hFRUw6ICdtb3VzZXdoZWVsJyxcbiAgICBXSU5ET1dfUkVTSVpFOiAncmVzaXplJ1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBEb2N1bWVudEV2ZW50OyIsInZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKCcuLi9ldmVudC9FdmVudERpc3BhdGNoZXInKSxcbiAgICBFdmVudF8gPSByZXF1aXJlKCcuLi9ldmVudC9FdmVudCcpLFxuICAgIERvY3VtZW50RXZlbnQgPSByZXF1aXJlKCcuL0RvY3VtZW50RXZlbnQnKTtcbnZhciBpbnN0YW5jZSA9IG51bGw7XG5cbmZ1bmN0aW9uIE1vdXNlKCkge1xuICAgIEV2ZW50RGlzcGF0Y2hlci5hcHBseSh0aGlzKTtcbiAgICB0aGlzLl9wb3MgPSBbMCwwXTtcbiAgICB0aGlzLl93aGVlbERpcmVjdGlvbiA9IDA7XG4gICAgdGhpcy5faG92ZXJFbGVtZW50ID0gbnVsbDtcblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLl9vbkRvY3VtZW50TW91c2VNb3ZlID0gZnVuY3Rpb24oZSl7XG4gICAgICAgIHZhciBkeCA9IDAsXG4gICAgICAgICAgICBkeSA9IDA7XG5cbiAgICAgICAgaWYgKCFlKWUgPSB3aW5kb3cuZXZlbnQ7XG4gICAgICAgIGlmIChlLnBhZ2VYKSB7XG4gICAgICAgICAgICBkeCA9IGUucGFnZVg7XG4gICAgICAgICAgICBkeSA9IGUucGFnZVk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZS5jbGllbnRYKSB7XG4gICAgICAgICAgICBkeCA9IGUuY2xpZW50WCArIGRvY3VtZW50LmJvZHkuc2Nyb2xsTGVmdCArIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxMZWZ0O1xuICAgICAgICAgICAgZHkgPSBlLmNsaWVudFkgKyBkb2N1bWVudC5ib2R5LnNjcm9sbFRvcCArIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxUb3A7XG4gICAgICAgIH1cbiAgICAgICAgc2VsZi5fcG9zWzBdID0gZHg7XG4gICAgICAgIHNlbGYuX3Bvc1sxXSA9IGR5O1xuXG4gICAgICAgIHNlbGYuX2hvdmVyRWxlbWVudCA9IGRvY3VtZW50LmVsZW1lbnRGcm9tUG9pbnQoZHgsZHkpO1xuICAgIH07XG5cbiAgICB0aGlzLl9vbkRvY3VtZW50TW91c2VXaGVlbCA9IGZ1bmN0aW9uKGV2ZW50KXtcbiAgICAgICAgc2VsZi5fd2hlZWxEaXJlY3Rpb24gPSAoZXZlbnQuZGV0YWlsIDwgMCkgPyAxIDogKGV2ZW50LndoZWVsRGVsdGEgPiAwKSA/IDEgOiAtMTtcbiAgICAgICAgc2VsZi5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8oc2VsZixEb2N1bWVudEV2ZW50Lk1PVVNFX1dIRUVMLGV2ZW50KSk7XG4gICAgfTtcblxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLCB0aGlzLl9vbkRvY3VtZW50TW91c2VNb3ZlKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfV0hFRUwsdGhpcy5fb25Eb2N1bWVudE1vdXNlV2hlZWwpO1xufVxuTW91c2UucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudERpc3BhdGNoZXIucHJvdG90eXBlKTtcbk1vdXNlLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IE1vdXNlO1xuXG5Nb3VzZS5wcm90b3R5cGUuX3JlbW92ZURvY3VtZW50TGlzdGVuZXIgPSBmdW5jdGlvbigpe1xuICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLCB0aGlzLl9vbkRvY3VtZW50TW91c2VNb3ZlKTtcbiAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfV0hFRUwsdGhpcy5fb25Eb2N1bWVudE1vdXNlV2hlZWwpO1xufTtcblxuTW91c2UucHJvdG90eXBlLmdldFBvc2l0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9wb3M7XG59O1xuXG5Nb3VzZS5wcm90b3R5cGUuZ2V0WCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fcG9zWzBdO1xufTtcblxuTW91c2UucHJvdG90eXBlLmdldFkgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3Bvc1sxXTtcbn07XG5cbk1vdXNlLnByb3RvdHlwZS5nZXRXaGVlbERpcmVjdGlvbiA9IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIHRoaXMuX3doZWVsRGlyZWN0aW9uO1xufTtcblxuTW91c2UucHJvdG90eXBlLmdldEhvdmVyRWxlbWVudCA9IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIHRoaXMuX2hvdmVyRWxlbWVudDtcbn07XG5cbk1vdXNlLnNldHVwID0gZnVuY3Rpb24gKCkge1xuICAgIGluc3RhbmNlID0gaW5zdGFuY2UgfHwgbmV3IE1vdXNlKCk7XG4gICAgcmV0dXJuIGluc3RhbmNlO1xufTtcblxuTW91c2UuZ2V0ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBpbnN0YW5jZTtcbn07XG5cbk1vdXNlLmRlc3Ryb3kgPSBmdW5jdGlvbigpe1xuICAgIGluc3RhbmNlLl9yZW1vdmVEb2N1bWVudExpc3RlbmVyKCk7XG4gICAgaW5zdGFuY2UgPSBudWxsO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNb3VzZTsiLCJmdW5jdGlvbiBOb2RlKCkge1xuICAgIHRoaXMuX2VsZW1lbnQgPSBudWxsO1xuXG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKXtcbiAgICAgICAgY2FzZSAxIDpcbiAgICAgICAgICAgIHZhciBhcmcgPSBhcmd1bWVudHNbMF07XG4gICAgICAgICAgICBpZiAoYXJnICE9IE5vZGUuSU5QVVRfVEVYVCAmJlxuICAgICAgICAgICAgICAgIGFyZyAhPSBOb2RlLklOUFVUX0JVVFRPTiAmJlxuICAgICAgICAgICAgICAgIGFyZyAhPSBOb2RlLklOUFVUX1NFTEVDVCAmJlxuICAgICAgICAgICAgICAgIGFyZyAhPSBOb2RlLklOUFVUX0NIRUNLQk9YKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoYXJnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xuICAgICAgICAgICAgICAgIHRoaXMuX2VsZW1lbnQudHlwZSA9IGFyZztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICB0aGlzLl9lbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICB9XG59XG5cbk5vZGUuRElWICAgICAgICAgICAgPSAnZGl2Jztcbk5vZGUuSU5QVVRfVEVYVCAgICAgPSAndGV4dCc7XG5Ob2RlLklOUFVUX0JVVFRPTiAgID0gJ2J1dHRvbic7XG5Ob2RlLklOUFVUX1NFTEVDVCAgID0gJ3NlbGVjdCc7XG5Ob2RlLklOUFVUX0NIRUNLQk9YID0gJ2NoZWNrYm94Jztcbk5vZGUuT1BUSU9OICAgICAgICAgPSAnb3B0aW9uJztcbk5vZGUuTElTVCAgICAgICAgICAgPSAndWwnO1xuTm9kZS5MSVNUX0lURU0gICAgICA9ICdsaSc7XG5Ob2RlLlNQQU4gICAgICAgICAgID0gJ3NwYW4nO1xuTm9kZS5URVhUQVJFQSAgICAgICA9ICd0ZXh0YXJlYSc7XG5cbk5vZGUucHJvdG90eXBlID0ge1xuICAgIGFkZENoaWxkOiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICB0aGlzLl9lbGVtZW50LmFwcGVuZENoaWxkKG5vZGUuZ2V0RWxlbWVudCgpKTtcbiAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfSxcbiAgICBhZGRDaGlsZHJlbjogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaSA9IC0xLCBsID0gYXJndW1lbnRzLmxlbmd0aCwgZSA9IHRoaXMuX2VsZW1lbnQ7XG4gICAgICAgIHdoaWxlICgrK2kgPCBsKSB7XG4gICAgICAgICAgICBlLmFwcGVuZENoaWxkKGFyZ3VtZW50c1tpXS5nZXRFbGVtZW50KCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgYWRkQ2hpbGRBdDogZnVuY3Rpb24gKG5vZGUsIGluZGV4KSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQuaW5zZXJ0QmVmb3JlKG5vZGUuZ2V0RWxlbWVudCgpLCB0aGlzLl9lbGVtZW50LmNoaWxkcmVuW2luZGV4XSk7XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgIH0sXG4gICAgcmVtb3ZlQ2hpbGQ6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIGlmICghdGhpcy5jb250YWlucyhub2RlKSlyZXR1cm4gbnVsbDtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5yZW1vdmVDaGlsZChub2RlLmdldEVsZW1lbnQoKSk7XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgIH0sXG4gICAgcmVtb3ZlQ2hpbGRyZW46IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGkgPSAtMSwgbCA9IGFyZ3VtZW50cy5sZW5ndGgsIGUgPSB0aGlzLl9lbGVtZW50O1xuICAgICAgICB3aGlsZSAoKytpIDwgbCkge1xuICAgICAgICAgICAgZS5yZW1vdmVDaGlsZChhcmd1bWVudHNbaV0uZ2V0RWxlbWVudCgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHJlbW92ZUNoaWxkQXQ6IGZ1bmN0aW9uIChub2RlLCBpbmRleCkge1xuICAgICAgICBpZiAoIXRoaXMuY29udGFpbnMobm9kZSkpcmV0dXJuIG51bGw7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQucmVtb3ZlQ2hpbGQobm9kZS5nZXRFbGVtZW50KCkpO1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9LFxuICAgIHJlbW92ZUFsbENoaWxkcmVuOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBlbGVtZW50ID0gdGhpcy5fZWxlbWVudDtcbiAgICAgICAgd2hpbGUgKGVsZW1lbnQuaGFzQ2hpbGROb2RlcygpKWVsZW1lbnQucmVtb3ZlQ2hpbGQoZWxlbWVudC5sYXN0Q2hpbGQpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHNldFdpZHRoOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZS53aWR0aCA9IHZhbHVlICsgJ3B4JztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBnZXRXaWR0aDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZWxlbWVudC5vZmZzZXRXaWR0aDtcbiAgICB9LFxuICAgIHNldEhlaWdodDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gdmFsdWUgKyAncHgnO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGdldEhlaWdodDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZWxlbWVudC5vZmZzZXRIZWlnaHQ7XG4gICAgfSxcbiAgICBzZXRQb3NpdGlvbjogZnVuY3Rpb24gKHgsIHkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0UG9zaXRpb24oeCkuc2V0UG9zaXRpb24oeSk7XG4gICAgfSxcbiAgICBzZXRQb3NpdGlvblg6IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGUubWFyZ2luTGVmdCA9IHggKyAncHgnO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHNldFBvc2l0aW9uWTogZnVuY3Rpb24gKHkpIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZS5tYXJnaW5Ub3AgPSB5ICsgJ3B4JztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBzZXRQb3NpdGlvbkdsb2JhbDogZnVuY3Rpb24gKHgsIHkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0UG9zaXRpb25HbG9iYWxYKHgpLnNldFBvc2l0aW9uR2xvYmFsWSh5KTtcbiAgICB9LFxuICAgIHNldFBvc2l0aW9uR2xvYmFsWDogZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZS5sZWZ0ID0geCArICdweCc7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgc2V0UG9zaXRpb25HbG9iYWxZOiBmdW5jdGlvbiAoeSkge1xuICAgICAgICB0aGlzLl9lbGVtZW50LnN0eWxlLnRvcCA9IHkgKyAncHgnO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGdldFBvc2l0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBbdGhpcy5nZXRQb3NpdGlvblgoKSwgdGhpcy5nZXRQb3NpdGlvblkoKV07XG4gICAgfSxcbiAgICBnZXRQb3NpdGlvblg6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VsZW1lbnQub2Zmc2V0TGVmdDtcbiAgICB9LFxuICAgIGdldFBvc2l0aW9uWTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZWxlbWVudC5vZmZzZXRUb3A7XG4gICAgfSxcbiAgICBnZXRQb3NpdGlvbkdsb2JhbDogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgb2Zmc2V0ID0gWzAsIDBdLFxuICAgICAgICAgICAgZWxlbWVudCA9IHRoaXMuX2VsZW1lbnQ7XG5cbiAgICAgICAgd2hpbGUgKGVsZW1lbnQpIHtcbiAgICAgICAgICAgIG9mZnNldFswXSArPSBlbGVtZW50Lm9mZnNldExlZnQ7XG4gICAgICAgICAgICBvZmZzZXRbMV0gKz0gZWxlbWVudC5vZmZzZXRUb3A7XG4gICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudC5vZmZzZXRQYXJlbnQ7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gb2Zmc2V0O1xuICAgIH0sXG4gICAgZ2V0UG9zaXRpb25HbG9iYWxYOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBvZmZzZXQgPSAwLFxuICAgICAgICAgICAgZWxlbWVudCA9IHRoaXMuX2VsZW1lbnQ7XG5cbiAgICAgICAgd2hpbGUgKGVsZW1lbnQpIHtcbiAgICAgICAgICAgIG9mZnNldCArPSBlbGVtZW50Lm9mZnNldExlZnQ7XG4gICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudC5vZmZzZXRQYXJlbnQ7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gb2Zmc2V0O1xuICAgIH0sXG4gICAgZ2V0UG9zaXRpb25HbG9iYWxZOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBvZmZzZXQgPSAwLFxuICAgICAgICAgICAgZWxlbWVudCA9IHRoaXMuX2VsZW1lbnQ7XG5cbiAgICAgICAgd2hpbGUgKGVsZW1lbnQpIHtcbiAgICAgICAgICAgIG9mZnNldCArPSBlbGVtZW50Lm9mZnNldFRvcDtcbiAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50Lm9mZnNldFBhcmVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBvZmZzZXQ7XG4gICAgfSxcbiAgICBhZGRFdmVudExpc3RlbmVyOiBmdW5jdGlvbiAodHlwZSwgbGlzdGVuZXIsIHVzZUNhcHR1cmUpIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyLCB1c2VDYXB0dXJlKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICByZW1vdmVFdmVudExpc3RlbmVyOiBmdW5jdGlvbiAodHlwZSwgbGlzdGVuZXIsIHVzZUNhcHR1cmUpIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyLCB1c2VDYXB0dXJlKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBkaXNwYXRjaEV2ZW50IDogZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBzZXRTdHlsZUNsYXNzOiBmdW5jdGlvbiAoc3R5bGUpIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5jbGFzc05hbWUgPSBzdHlsZTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBzZXRTdHlsZVByb3BlcnR5OiBmdW5jdGlvbiAocHJvcGVydHksIHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGVbcHJvcGVydHldID0gdmFsdWU7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgZ2V0U3R5bGVQcm9wZXJ0eTogZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbGVtZW50LnN0eWxlW3Byb3BlcnR5XTtcbiAgICB9LFxuICAgIHNldFN0eWxlUHJvcGVydGllczogZnVuY3Rpb24gKHByb3BlcnRpZXMpIHtcbiAgICAgICAgZm9yICh2YXIgcCBpbiBwcm9wZXJ0aWVzKXtcbiAgICAgICAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGVbcF0gPSBwcm9wZXJ0aWVzW3BdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgZGVsZXRlU3R5bGVDbGFzczogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9lbGVtZW50LmNsYXNzTmFtZSA9ICcnO1xuICAgICAgICByZXR1cm4gdGhpc1xuICAgIH0sXG4gICAgZGVsZXRlU3R5bGVQcm9wZXJ0eTogZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGVbcHJvcGVydHldID0gJyc7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgZGVsZXRlU3R5bGVQcm9wZXJ0aWVzOiBmdW5jdGlvbiAocHJvcGVydGllcykge1xuICAgICAgICBmb3IgKHZhciBwIGluIHByb3BlcnRpZXMpe1xuICAgICAgICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZVtwXSA9ICcnO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgZ2V0Q2hpbGRBdDogZnVuY3Rpb24gKGluZGV4KSB7XG4gICAgICAgIHJldHVybiBuZXcgTm9kZSgpLnNldEVsZW1lbnQodGhpcy5fZWxlbWVudC5jaGlsZHJlbltpbmRleF0pO1xuICAgIH0sXG4gICAgZ2V0Q2hpbGRJbmRleDogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2luZGV4T2YodGhpcy5fZWxlbWVudCwgbm9kZS5nZXRFbGVtZW50KCkpO1xuICAgIH0sXG4gICAgZ2V0TnVtQ2hpbGRyZW46IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VsZW1lbnQuY2hpbGRyZW4ubGVuZ3RoO1xuICAgIH0sXG4gICAgZ2V0Rmlyc3RDaGlsZDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IE5vZGUoKS5zZXRFbGVtZW50KHRoaXMuX2VsZW1lbnQuZmlyc3RDaGlsZCk7XG4gICAgfSxcbiAgICBnZXRMYXN0Q2hpbGQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBOb2RlKCkuc2V0RWxlbWVudCh0aGlzLl9lbGVtZW50Lmxhc3RDaGlsZCk7XG4gICAgfSxcbiAgICBoYXNDaGlsZHJlbjogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZWxlbWVudC5jaGlsZHJlbi5sZW5ndGggIT0gMDtcbiAgICB9LFxuICAgIGNvbnRhaW5zOiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXhPZih0aGlzLl9lbGVtZW50LCBub2RlLmdldEVsZW1lbnQoKSkgIT0gLTE7XG4gICAgfSxcbiAgICBfaW5kZXhPZjogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQsIGVsZW1lbnQpIHtcbiAgICAgICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5pbmRleE9mLmNhbGwocGFyZW50RWxlbWVudC5jaGlsZHJlbiwgZWxlbWVudCk7XG4gICAgfSxcbiAgICBzZXRQcm9wZXJ0eTogZnVuY3Rpb24gKHByb3BlcnR5LCB2YWx1ZSkge1xuICAgICAgICB0aGlzLl9lbGVtZW50W3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHNldFByb3BlcnRpZXM6IGZ1bmN0aW9uIChwcm9wZXJ0aWVzKSB7XG4gICAgICAgIGZvciAodmFyIHAgaW4gcHJvcGVydGllcyl7XG4gICAgICAgICAgICB0aGlzLl9lbGVtZW50W3BdID0gcHJvcGVydGllc1twXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGdldFByb3BlcnR5OiBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VsZW1lbnRbcHJvcGVydHldO1xuICAgIH0sXG4gICAgc2V0RWxlbWVudDogZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgZ2V0RWxlbWVudDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZWxlbWVudDtcbiAgICB9LFxuICAgIGdldFN0eWxlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbGVtZW50LnN0eWxlO1xuICAgIH0sXG4gICAgZ2V0UGFyZW50OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgTm9kZSgpLnNldEVsZW1lbnQodGhpcy5fZWxlbWVudC5wYXJlbnROb2RlKTtcbiAgICB9XG59O1xuXG5Ob2RlLmdldE5vZGVCeUVsZW1lbnQgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgIHJldHVybiBuZXcgTm9kZSgpLnNldEVsZW1lbnQoZWxlbWVudCk7XG59O1xuTm9kZS5nZXROb2RlQnlJZCA9IGZ1bmN0aW9uIChpZCkge1xuICAgIHJldHVybiBuZXcgTm9kZSgpLnNldEVsZW1lbnQoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTm9kZTsiLCJ2YXIgTm9kZUV2ZW50ID0ge1xuICAgIE1PVVNFX0RPV04gICA6ICdtb3VzZWRvd24nLFxuICAgIE1PVVNFX1VQICAgICA6ICdtb3VzZXVwJyxcbiAgICBNT1VTRV9PVkVSICAgOiAnbW91c2VvdmVyJyxcbiAgICBNT1VTRV9NT1ZFICAgOiAnbW91c2Vtb3ZlJyxcbiAgICBNT1VTRV9PVVQgICAgOiAnbW91c2VvdXQnLFxuICAgIEtFWV9ET1dOICAgICA6ICdrZXlkb3duJyxcbiAgICBLRVlfVVAgICAgICAgOiAna2V5dXAnLFxuICAgIENIQU5HRSAgICAgICA6ICdjaGFuZ2UnLFxuICAgIEZJTklTSCAgICAgICA6ICdmaW5pc2gnLFxuICAgIERCTF9DTElDSyAgICA6ICdkYmxjbGljaycsXG4gICAgT05fQ0xJQ0sgICAgIDogJ2NsaWNrJyxcbiAgICBTRUxFQ1RfU1RBUlQgOiAnc2VsZWN0c3RhcnQnLFxuICAgIERSQUdfU1RBUlQgICA6ICdkcmFnc3RhcnQnLFxuICAgIERSQUcgICAgICAgICA6ICdkcmFnJyxcbiAgICBEUkFHX0VORCAgICAgOiAnZHJhZ2VuZCcsXG5cbiAgICBEUkFHX0VOVEVSICAgOiAnZHJhZ2VudGVyJyxcbiAgICBEUkFHX09WRVIgICAgOiAnZHJhZ292ZXInLFxuICAgIERSQUdfTEVBVkUgICA6ICdkcmFnbGVhdmUnLFxuXG4gICAgUkVTSVpFICAgICAgIDogJ3Jlc2l6ZSdcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTm9kZUV2ZW50OyIsInZhciBTdHlsZSA9IHsgXG5cdHN0cmluZyA6IFwiI2NvbnRyb2xLaXR7cG9zaXRpb246YWJzb2x1dGU7dG9wOjA7bGVmdDowO3dpZHRoOjEwMCU7aGVpZ2h0OjEwMCU7LXdlYmtpdC10b3VjaC1jYWxsb3V0Om5vbmU7LXdlYmtpdC11c2VyLXNlbGVjdDpub25lOy1raHRtbC11c2VyLXNlbGVjdDpub25lOy1tb3otdXNlci1zZWxlY3Q6bm9uZTstbXMtdXNlci1zZWxlY3Q6bm9uZTt1c2VyLXNlbGVjdDpub25lO3BvaW50ZXItZXZlbnRzOm5vbmV9I2NvbnRyb2xLaXQgLnBhbmVsey13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveDtwb2ludGVyLWV2ZW50czphdXRvO3Bvc2l0aW9uOnJlbGF0aXZlO3otaW5kZXg6MTstd2Via2l0LXRvdWNoLWNhbGxvdXQ6bm9uZTstd2Via2l0LXVzZXItc2VsZWN0Om5vbmU7LWtodG1sLXVzZXItc2VsZWN0Om5vbmU7LW1vei11c2VyLXNlbGVjdDpub25lOy1tcy11c2VyLXNlbGVjdDpub25lO3VzZXItc2VsZWN0Om5vbmU7b3ZlcmZsb3c6aGlkZGVuO29wYWNpdHk6MTtmbG9hdDpsZWZ0O3dpZHRoOjIwMHB4O2JvcmRlci1yYWRpdXM6M3B4Oy1tb3otYm9yZGVyLXJhZGl1czozcHg7Ym94LXNoYWRvdzowIDJweCAycHggcmdiYSgwLDAsMCwuMjUpO21hcmdpbjowO3BhZGRpbmc6MDtiYWNrZ3JvdW5kLWNvbG9yOiMxYTFhMWE7Zm9udC1mYW1pbHk6QXJpYWwsc2Fucy1zZXJpZn0jY29udHJvbEtpdCAucGFuZWwgLndyYXB7d2lkdGg6YXV0bztoZWlnaHQ6YXV0bzttYXJnaW46MDtwYWRkaW5nOjA7cG9zaXRpb246cmVsYXRpdmU7b3ZlcmZsb3c6aGlkZGVufSNjb250cm9sS2l0IC5wYW5lbCB1bHttYXJnaW46MDtwYWRkaW5nOjA7bGlzdC1zdHlsZTpub25lfSNjb250cm9sS2l0IC5wYW5lbCAuY29sb3IsI2NvbnRyb2xLaXQgLnBhbmVsIGlucHV0W3R5cGU9dGV4dF0sI2NvbnRyb2xLaXQgLnBhbmVsIHRleHRhcmVhLCNjb250cm9sS2l0IC5waWNrZXIgaW5wdXRbdHlwZT10ZXh0XXstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7d2lkdGg6MTAwJTtoZWlnaHQ6MjVweDtwYWRkaW5nOjAgMCAwIDhweDtmb250LWZhbWlseTpBcmlhbCxzYW5zLXNlcmlmO2ZvbnQtc2l6ZToxMXB4O2NvbG9yOiNmZmY7dGV4dC1zaGFkb3c6MXB4IDFweCAjMDAwO291dGxpbmU6MDtiYWNrZ3JvdW5kOiMyMjI3Mjk7YmFja2dyb3VuZC1pbWFnZTotby1saW5lYXItZ3JhZGllbnQocmdiYSgwLDAsMCwuMDc1KSAwLHJnYmEoMCwwLDAsLjEyNSkgMTAwJSk7YmFja2dyb3VuZC1pbWFnZTpsaW5lYXItZ3JhZGllbnQocmdiYSgwLDAsMCwuMDc1KSAwLHJnYmEoMCwwLDAsLjEyNSkgMTAwJSk7Ym9yZGVyOm5vbmU7Ym94LXNoYWRvdzowIDAgMCAxcHggIzFmMWYxZiBpbnNldDtib3JkZXItcmFkaXVzOjJweDstbW96LWJvcmRlci1yYWRpdXM6MnB4fSNjb250cm9sS2l0IC5wYW5lbCAuYnV0dG9uLCNjb250cm9sS2l0IC5wYW5lbCAuc2VsZWN0LCNjb250cm9sS2l0IC5wYW5lbCAuc2VsZWN0LWFjdGl2ZSwjY29udHJvbEtpdCAucGlja2VyIC5idXR0b257LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O2N1cnNvcjpwb2ludGVyO3dpZHRoOjEwMCU7aGVpZ2h0OjI2cHg7bWFyZ2luOjA7YmFja2dyb3VuZC1pbWFnZTotby1saW5lYXItZ3JhZGllbnQoIzQwNDA0MCAwLCMzYjNiM2IgMTAwJSk7YmFja2dyb3VuZC1pbWFnZTpsaW5lYXItZ3JhZGllbnQoIzQwNDA0MCAwLCMzYjNiM2IgMTAwJSk7Ym9yZGVyOm5vbmU7b3V0bGluZTowO2JvcmRlci1yYWRpdXM6MnB4O2JveC1zaGFkb3c6MCAwIDAgMXB4ICMxZjFmMWYgaW5zZXQsLTFweCAycHggMCAwICM0YTRhNGEgaW5zZXQ7Zm9udC1mYW1pbHk6QXJpYWwsc2Fucy1zZXJpZjtjb2xvcjojZmZmfSNjb250cm9sS2l0IC5wYW5lbCB0ZXh0YXJlYXtwYWRkaW5nOjVweCA4cHggMnB4O292ZXJmbG93OmhpZGRlbjtyZXNpemU6bm9uZTt2ZXJ0aWNhbC1hbGlnbjp0b3A7d2hpdGUtc3BhY2U6bm93cmFwfSNjb250cm9sS2l0IC5wYW5lbCAudGV4dGFyZWEtd3JhcHstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7d2lkdGg6MTAwJTtwYWRkaW5nOjA7ZmxvYXQ6bGVmdDtoZWlnaHQ6MTAwJTtvdmVyZmxvdzpoaWRkZW47Ym9yZGVyOm5vbmU7Ym9yZGVyLXJhZGl1czoycHg7LW1vei1ib3JkZXItcmFkaXVzOjJweDtiYWNrZ3JvdW5kLWNvbG9yOiMyMjI3Mjk7Ym94LXNoYWRvdzowIDAgMXB4IDJweCByZ2JhKDAsMCwwLC4wMTI1KSBpbnNldCwwIDAgMXB4IDFweCAjMTExMzE0IGluc2V0O2JhY2tncm91bmQtaW1hZ2U6LW8tbGluZWFyLWdyYWRpZW50KHJnYmEoMCwwLDAsLjA3NSkgMCxyZ2JhKDAsMCwwLC4xMjUpIDEwMCUpO2JhY2tncm91bmQtaW1hZ2U6bGluZWFyLWdyYWRpZW50KHJnYmEoMCwwLDAsLjA3NSkgMCxyZ2JhKDAsMCwwLC4xMjUpIDEwMCUpfSNjb250cm9sS2l0IC5wYW5lbCAudGV4dGFyZWEtd3JhcCB0ZXh0YXJlYXtib3JkZXI6bm9uZTtib3JkZXItcmFkaXVzOjJweDstbW96LWJvcmRlci1yYWRpdXM6MnB4O2JveC1zaGFkb3c6bm9uZTtiYWNrZ3JvdW5kOjAgMH0jY29udHJvbEtpdCAucGFuZWwgLnRleHRhcmVhLXdyYXAgLnNjcm9sbEJhcntib3JkZXI6MXB4IHNvbGlkICMxMDEyMTM7Ym9yZGVyLWJvdHRvbS1yaWdodC1yYWRpdXM6MnB4O2JvcmRlci10b3AtcmlnaHQtcmFkaXVzOjJweDtib3JkZXItbGVmdDpub25lO2JveC1zaGFkb3c6MCAwIDFweCAycHggcmdiYSgwLDAsMCwuMDEyNSkgaW5zZXQsMCAwIDFweCAxcHggIzExMTMxNCBpbnNldH0jY29udHJvbEtpdCAucGFuZWwgY2FudmFze2N1cnNvcjpwb2ludGVyO3ZlcnRpY2FsLWFsaWduOmJvdHRvbTtib3JkZXI6bm9uZTtib3gtc2hhZG93OjAgMCAwIDFweCAjMWYxZjFmIGluc2V0O2JvcmRlci1yYWRpdXM6MnB4Oy1tb3otYm9yZGVyLXJhZGl1czoycHh9I2NvbnRyb2xLaXQgLnBhbmVsIC5jYW52YXMtd3JhcCwjY29udHJvbEtpdCAucGFuZWwgLnN2Zy13cmFwe21hcmdpbjo2cHggMCAwO3Bvc2l0aW9uOnJlbGF0aXZlO3dpZHRoOjcwJTtmbG9hdDpyaWdodDstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym9yZGVyOm5vbmU7Ym9yZGVyLXJhZGl1czoycHg7LW1vei1ib3JkZXItcmFkaXVzOjJweDtiYWNrZ3JvdW5kOiMxZTIyMjQ7YmFja2dyb3VuZC1pbWFnZTotby1saW5lYXItZ3JhZGllbnQodHJhbnNwYXJlbnQgMCxyZ2JhKDAsMCwwLC4wNSkgMTAwJSk7YmFja2dyb3VuZC1pbWFnZTpsaW5lYXItZ3JhZGllbnQodHJhbnNwYXJlbnQgMCxyZ2JhKDAsMCwwLC4wNSkgMTAwJSl9I2NvbnRyb2xLaXQgLnBhbmVsIC5jYW52YXMtd3JhcCBzdmcsI2NvbnRyb2xLaXQgLnBhbmVsIC5zdmctd3JhcCBzdmd7cG9zaXRpb246YWJzb2x1dGU7bGVmdDowO3RvcDowO2N1cnNvcjpwb2ludGVyO3ZlcnRpY2FsLWFsaWduOmJvdHRvbTtib3JkZXI6bm9uZTtib3gtc2hhZG93OjAgMCAwIDFweCAjMWYxZjFmIGluc2V0O2JvcmRlci1yYWRpdXM6MnB4Oy1tb3otYm9yZGVyLXJhZGl1czoycHh9I2NvbnRyb2xLaXQgLnBhbmVsIC5idXR0b24sI2NvbnRyb2xLaXQgLnBpY2tlciAuYnV0dG9ue2ZvbnQtc2l6ZToxMHB4O2ZvbnQtd2VpZ2h0OjcwMDt0ZXh0LXNoYWRvdzowIDFweCAjMDAwO3RleHQtdHJhbnNmb3JtOnVwcGVyY2FzZX0jY29udHJvbEtpdCAucGFuZWwgLmJ1dHRvbjpob3ZlciwjY29udHJvbEtpdCAucGlja2VyIC5idXR0b246aG92ZXJ7YmFja2dyb3VuZC1pbWFnZTotby1saW5lYXItZ3JhZGllbnQoIzQ1NDU0NSAwLCMzYjNiM2IgMTAwJSk7YmFja2dyb3VuZC1pbWFnZTpsaW5lYXItZ3JhZGllbnQoIzQ1NDU0NSAwLCMzYjNiM2IgMTAwJSl9I2NvbnRyb2xLaXQgLnBhbmVsIC5idXR0b246YWN0aXZlLCNjb250cm9sS2l0IC5waWNrZXIgLmJ1dHRvbjphY3RpdmV7YmFja2dyb3VuZC1pbWFnZTotby1saW5lYXItZ3JhZGllbnQoIzQwNDA0MCAwLCMzYjNiM2IgMTAwJSk7YmFja2dyb3VuZC1pbWFnZTpsaW5lYXItZ3JhZGllbnQoIzQwNDA0MCAwLCMzYjNiM2IgMTAwJSl9I2NvbnRyb2xLaXQgLnBhbmVsIC5jb2xvci13aXRoLXByZXNldC13cmFwLCNjb250cm9sS2l0IC5wYW5lbCAuaW5wdXQtd2l0aC1wcmVzZXQtd3JhcHt3aWR0aDoxMDAlO2Zsb2F0OmxlZnR9I2NvbnRyb2xLaXQgLnBhbmVsIC5jb2xvci13aXRoLXByZXNldC13cmFwIC5jb2xvciwjY29udHJvbEtpdCAucGFuZWwgLmlucHV0LXdpdGgtcHJlc2V0LXdyYXAgaW5wdXRbdHlwZT10ZXh0XXtwYWRkaW5nLXJpZ2h0OjI1cHg7Ym9yZGVyLXRvcC1yaWdodC1yYWRpdXM6MnB4O2JvcmRlci1ib3R0b20tcmlnaHQtcmFkaXVzOjJweDtmbG9hdDpsZWZ0fSNjb250cm9sS2l0IC5wYW5lbCAuYnV0dG9uLXByZXNldCwjY29udHJvbEtpdCAucGFuZWwgLmJ1dHRvbi1wcmVzZXQtYWN0aXZley13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveDtwb3NpdGlvbjphYnNvbHV0ZTtyaWdodDowO3dpZHRoOjIwcHg7aGVpZ2h0OjI1cHg7bWFyZ2luOjA7Y3Vyc29yOnBvaW50ZXI7ZmxvYXQ6cmlnaHQ7Ym9yZGVyOm5vbmU7Ym9yZGVyLXRvcC1yaWdodC1yYWRpdXM6MnB4O2JvcmRlci1ib3R0b20tcmlnaHQtcmFkaXVzOjJweDtib3gtc2hhZG93OjAgMCAwIDFweCAjMWYxZjFmIGluc2V0LC0xcHggMnB4IDAgMCAjNGE0YTRhIGluc2V0O291dGxpbmU6MH0jY29udHJvbEtpdCAucGFuZWwgLmJ1dHRvbi1wcmVzZXQtYWN0aXZlLCNjb250cm9sS2l0IC5wYW5lbCAuYnV0dG9uLXByZXNldDpob3ZlcntiYWNrZ3JvdW5kOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBRzVKUkVGVWVOcGk1T0RpYW1SZ1lLaGp3QTRhbVZ4OGd4am1MMXJDOFAzclZ4UThiK0VTQmhmZklBWm1OUjI5QTVldlhXZGlaR0MwMTlYU1pHQmdZR0JZdm1ZOXc3STE2eG9aR0JnYVdLQkcxUzlicys0L0F3TkRQUU1EQTF5U2dZR0JnZEVuUEFiWnpnWTBtZ0V3QUU5bEpUMWxyc2ZmQUFBQUFFbEZUa1N1UW1DQykgNTAlIDUwJSBuby1yZXBlYXQsbGluZWFyLWdyYWRpZW50KCM0NTQ1NDUgMCwjM2IzYjNiIDEwMCUpfSNjb250cm9sS2l0IC5wYW5lbCAuYnV0dG9uLXByZXNldHtiYWNrZ3JvdW5kOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBRzVKUkVGVWVOcGk1T0RpYW1SZ1lLaGp3QTRhbVZ4OGd4am1MMXJDOFAzclZ4UThiK0VTQmhmZklBWm1OUjI5QTVldlhXZGlaR0MwMTlYU1pHQmdZR0JZdm1ZOXc3STE2eG9aR0JnYVdLQkcxUzlicys0L0F3TkRQUU1EQTF5U2dZR0JnZEVuUEFiWnpnWTBtZ0V3QUU5bEpUMWxyc2ZmQUFBQUFFbEZUa1N1UW1DQykgNTAlIDUwJSBuby1yZXBlYXQsbGluZWFyLWdyYWRpZW50KCM0MDQwNDAgMCwjM2IzYjNiIDEwMCUpfSNjb250cm9sS2l0IC5wYW5lbCBpbnB1dFt0eXBlPWNoZWNrYm94XXttYXJnaW46NnB4IDAgMH0jY29udHJvbEtpdCAucGFuZWwgLnNlbGVjdCwjY29udHJvbEtpdCAucGFuZWwgLnNlbGVjdC1hY3RpdmV7cGFkZGluZy1sZWZ0OjEwcHg7cGFkZGluZy1yaWdodDoyMHB4O2ZvbnQtc2l6ZToxMXB4O3RleHQtYWxpZ246bGVmdDt0ZXh0LXNoYWRvdzoxcHggMXB4ICMwMDA7Y3Vyc29yOnBvaW50ZXI7b3ZlcmZsb3c6aGlkZGVuO3doaXRlLXNwYWNlOm5vd3JhcDt0ZXh0LW92ZXJmbG93OmVsbGlwc2lzfSNjb250cm9sS2l0IC5wYW5lbCAuc2VsZWN0e2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQkFBQUFBTENBWUFBQUIyNGcwNUFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFNTkpSRUZVZU5xY2tqRUt3akFVaGo4bDUzQVE1MjZCSEtLTEloU2xIa0h4QmtrdUlGV1BJTFFPUVFkM1Y0VnVYaWd1RmxyRlJQemhMWGw4MzN1QjEwdXpuQ2FQK3E0QkVxbHM4M1k1SGdoRnRPSDFhbWtBaXQyK0l3a216WElHdzVIZUZGdmZaRk5zL1dBNDBtbVc0NzBQMWdmOExva0pSQ0lWMTF2TjliYjQyQzZSS3ZvREFkaFgvUlh4cU84RzBGLzZGakJCUVNJVjgrbUUyWFRjYVZUdVRPbE8wUTM2Z0NuZHlWYnUvQTVIcDdmdndMeW1hZUJudUhOSUxRbS93Z0RQQVFBUE5Jc0huTzc5NFFBQUFBQkpSVTVFcmtKZ2dnPT0pIDEwMCUgNTAlIG5vLXJlcGVhdCxsaW5lYXItZ3JhZGllbnQoIzQwNDA0MCAwLCMzYjNiM2IgMTAwJSl9I2NvbnRyb2xLaXQgLnBhbmVsIC5zZWxlY3QtYWN0aXZlLCNjb250cm9sS2l0IC5wYW5lbCAuc2VsZWN0OmhvdmVye2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQkFBQUFBTENBWUFBQUIyNGcwNUFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFNTkpSRUZVZU5xY2tqRUt3akFVaGo4bDUzQVE1MjZCSEtLTEloU2xIa0h4QmtrdUlGV1BJTFFPUVFkM1Y0VnVYaWd1RmxyRlJQemhMWGw4MzN1QjEwdXpuQ2FQK3E0QkVxbHM4M1k1SGdoRnRPSDFhbWtBaXQyK0l3a216WElHdzVIZUZGdmZaRk5zL1dBNDBtbVc0NzBQMWdmOExva0pSQ0lWMTF2TjliYjQyQzZSS3ZvREFkaFgvUlh4cU84RzBGLzZGakJCUVNJVjgrbUUyWFRjYVZUdVRPbE8wUTM2Z0NuZHlWYnUvQTVIcDdmdndMeW1hZUJudUhOSUxRbS93Z0RQQVFBUE5Jc0huTzc5NFFBQUFBQkpSVTVFcmtKZ2dnPT0pIDEwMCUgNTAlIG5vLXJlcGVhdCxsaW5lYXItZ3JhZGllbnQoIzQ1NDU0NSAwLCMzYjNiM2IgMTAwJSl9I2NvbnRyb2xLaXQgLnBhbmVsIC5zbGlkZXItaGFuZGxlLCNjb250cm9sS2l0IC5wYW5lbCAuc2xpZGVyLXNsb3QsI2NvbnRyb2xLaXQgLnBhbmVsIC5zbGlkZXItd3JhcCwjY29udHJvbEtpdCAucGFuZWwgLndyYXAtc2xpZGVyey13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveH0jY29udHJvbEtpdCAucGFuZWwgLndyYXAtc2xpZGVye3dpZHRoOjcwJTtwYWRkaW5nOjZweCAwIDA7ZmxvYXQ6cmlnaHQ7aGVpZ2h0OjEwMCV9I2NvbnRyb2xLaXQgLnBhbmVsIC53cmFwLXNsaWRlciBpbnB1dFt0eXBlPXRleHRde3dpZHRoOjI1JTt0ZXh0LWFsaWduOmNlbnRlcjtwYWRkaW5nOjA7ZmxvYXQ6cmlnaHR9I2NvbnRyb2xLaXQgLnBhbmVsIC5zbGlkZXItd3JhcHtmbG9hdDpsZWZ0O2N1cnNvcjpldy1yZXNpemU7d2lkdGg6NzAlfSNjb250cm9sS2l0IC5wYW5lbCAuc2xpZGVyLXNsb3R7d2lkdGg6MTAwJTtoZWlnaHQ6MjVweDtwYWRkaW5nOjNweDtiYWNrZ3JvdW5kLWNvbG9yOiMxZTIyMjQ7Ym9yZGVyOm5vbmU7Ym94LXNoYWRvdzowIDAgMCAxcHggIzFmMWYxZiBpbnNldDtib3JkZXItcmFkaXVzOjJweDstbW96LWJvcmRlci1yYWRpdXM6MnB4fSNjb250cm9sS2l0IC5wYW5lbCAuc2xpZGVyLWhhbmRsZXtwb3NpdGlvbjpyZWxhdGl2ZTt3aWR0aDoxMDAlO2hlaWdodDoxMDAlO2JhY2tncm91bmQ6I2IzMjQzNTtiYWNrZ3JvdW5kLWltYWdlOi1vLWxpbmVhci1ncmFkaWVudCh0cmFuc3BhcmVudCAwLHJnYmEoMCwwLDAsLjEpIDEwMCUpO2JhY2tncm91bmQtaW1hZ2U6bGluZWFyLWdyYWRpZW50KHRyYW5zcGFyZW50IDAscmdiYSgwLDAsMCwuMSkgMTAwJSk7Ym94LXNoYWRvdzowIDFweCAwIDAgIzBmMGYwZn0jY29udHJvbEtpdCAucGFuZWwgLmNvbG9yey13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveDstd2Via2l0LXRvdWNoLWNhbGxvdXQ6bm9uZTstd2Via2l0LXVzZXItc2VsZWN0Om5vbmU7LWtodG1sLXVzZXItc2VsZWN0Om5vbmU7LW1vei11c2VyLXNlbGVjdDpub25lOy1tcy11c2VyLXNlbGVjdDpub25lO3VzZXItc2VsZWN0Om5vbmU7Y3Vyc29yOnBvaW50ZXI7d2lkdGg6MTAwJTtoZWlnaHQ6MjVweDtwYWRkaW5nOjA7Ym9yZGVyOm5vbmU7YmFja2dyb3VuZDojZmZmO2JveC1zaGFkb3c6MCAwIDAgMXB4ICMxMTEzMTQgaW5zZXQ7dGV4dC1hbGlnbjpjZW50ZXI7bGluZS1oZWlnaHQ6MjVweDtib3JkZXItcmFkaXVzOjJweDstbW96LWJvcmRlci1yYWRpdXM6MnB4fSNjb250cm9sS2l0IC5wYW5lbCAuZ3JhcGgtc2xpZGVyLXgtd3JhcCwjY29udHJvbEtpdCAucGFuZWwgLmdyYXBoLXNsaWRlci15LXdyYXB7cG9zaXRpb246YWJzb2x1dGU7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94fSNjb250cm9sS2l0IC5wYW5lbCAuZ3JhcGgtc2xpZGVyLXgtd3JhcHtib3R0b206MDtsZWZ0OjA7d2lkdGg6MTAwJTtwYWRkaW5nOjZweCAyMHB4IDZweCA2cHh9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaC1zbGlkZXIteS13cmFwe3RvcDowO3JpZ2h0OjA7aGVpZ2h0OjEwMCU7cGFkZGluZzo2cHggNnB4IDIwcHh9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaC1zbGlkZXIteCwjY29udHJvbEtpdCAucGFuZWwgLmdyYXBoLXNsaWRlci15ey13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveDtib3JkZXItcmFkaXVzOjJweDstbW96LWJvcmRlci1yYWRpdXM6MnB4O2JhY2tncm91bmQ6cmdiYSgyNCwyNywyOSwuNSk7Ym9yZGVyOjFweCBzb2xpZCAjMTgxYjFkfSNjb250cm9sS2l0IC5wYW5lbCAuZ3JhcGgtc2xpZGVyLXh7aGVpZ2h0OjhweH0jY29udHJvbEtpdCAucGFuZWwgLmdyYXBoLXNsaWRlci15e3dpZHRoOjhweDtoZWlnaHQ6MTAwJX0jY29udHJvbEtpdCAucGFuZWwgLmdyYXBoLXNsaWRlci14LWhhbmRsZSwjY29udHJvbEtpdCAucGFuZWwgLmdyYXBoLXNsaWRlci15LWhhbmRsZXstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7Y3Vyc29yOnBvaW50ZXI7Ym9yZGVyOjFweCBzb2xpZCAjMTgxYjFkO2JhY2tncm91bmQ6IzMwMzYzOX0jY29udHJvbEtpdCAucGFuZWwgLmdyYXBoLXNsaWRlci14LWhhbmRsZXt3aWR0aDoyMHB4O2hlaWdodDoxMDAlO2JvcmRlci10b3A6bm9uZTtib3JkZXItYm90dG9tOm5vbmV9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaC1zbGlkZXIteS1oYW5kbGV7d2lkdGg6MTAwJTtoZWlnaHQ6MjBweDtib3JkZXItbGVmdDpub25lO2JvcmRlci1yaWdodDpub25lfSNjb250cm9sS2l0IC5zdWItZ3JvdXAgLndyYXAgLndyYXAgLndyYXB7d2lkdGg6MjUlIWltcG9ydGFudDtwYWRkaW5nOjAhaW1wb3J0YW50O2Zsb2F0OmxlZnQhaW1wb3J0YW50fSNjb250cm9sS2l0IC5zdWItZ3JvdXAgLndyYXAgLndyYXAgLndyYXAgLmxhYmVse3dpZHRoOjEwMCUhaW1wb3J0YW50O3BhZGRpbmc6OHB4IDAgMCFpbXBvcnRhbnQ7Y29sb3I6Izg3ODc4NyFpbXBvcnRhbnQ7dGV4dC1hbGlnbjpjZW50ZXIhaW1wb3J0YW50O3RleHQtdHJhbnNmb3JtOnVwcGVyY2FzZSFpbXBvcnRhbnQ7Zm9udC13ZWlnaHQ6NzAwIWltcG9ydGFudDt0ZXh0LXNoYWRvdzoxcHggMXB4ICMxYTFhMWEhaW1wb3J0YW50fSNjb250cm9sS2l0IC5zdWItZ3JvdXAgLndyYXAgLndyYXAgLndyYXAgaW5wdXRbdHlwZT10ZXh0XXtwYWRkaW5nOjA7dGV4dC1hbGlnbjpjZW50ZXJ9I2NvbnRyb2xLaXQgLm9wdGlvbnN7cG9pbnRlci1ldmVudHM6YXV0bzstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym9yZGVyOjFweCBzb2xpZCAjMWYxZjFmO2JvcmRlci1yYWRpdXM6MnB4Oy1tb3otYm9yZGVyLXJhZGl1czoycHg7cG9zaXRpb246YWJzb2x1dGU7ei1pbmRleDoyMTQ3NDgzNjM4O2xlZnQ6MDt0b3A6MDt3aWR0aDphdXRvO2hlaWdodDphdXRvO2JveC1zaGFkb3c6MCAxcHggMCAwICM0YTRhNGEgaW5zZXQ7YmFja2dyb3VuZC1jb2xvcjojNDU0NTQ1O2ZvbnQtZmFtaWx5OkFyaWFsLHNhbnMtc2VyaWY7Zm9udC1zaXplOjExcHg7Y29sb3I6I2ZmZjt0ZXh0LXNoYWRvdzoxcHggMXB4ICMwMDA7b3ZlcmZsb3c6aGlkZGVufSNjb250cm9sS2l0IC5vcHRpb25zIHVse3dpZHRoOjEwMCU7bGlzdC1zdHlsZTpub25lO21hcmdpbjowO3BhZGRpbmc6MH0jY29udHJvbEtpdCAub3B0aW9ucyB1bCBsaXttYXJnaW46MDt3aWR0aDoxMDAlO2hlaWdodDoyNXB4O2xpbmUtaGVpZ2h0OjI1cHg7cGFkZGluZzowIDIwcHggMCAxMHB4O292ZXJmbG93OmhpZGRlbjt3aGl0ZS1zcGFjZTpub3JtYWw7dGV4dC1vdmVyZmxvdzplbGxpcHNpcztjdXJzb3I6cG9pbnRlcn0jY29udHJvbEtpdCAub3B0aW9ucyB1bCBsaTpob3ZlcntiYWNrZ3JvdW5kLWNvbG9yOiMxZjIzMjV9I2NvbnRyb2xLaXQgLm9wdGlvbnMgdWwgLmxpLXNlbGVjdGVke2JhY2tncm91bmQtY29sb3I6IzI5MmQzMH0jY29udHJvbEtpdCAub3B0aW9ucyAuY29sb3J7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94fSNjb250cm9sS2l0IC5vcHRpb25zIC5jb2xvciAubGktc2VsZWN0ZWQsI2NvbnRyb2xLaXQgLm9wdGlvbnMgLmNvbG9yIGxpey13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveDtwYWRkaW5nOjA7aGVpZ2h0OjI1cHg7bGluZS1oZWlnaHQ6MjVweDt0ZXh0LWFsaWduOmNlbnRlcn0jY29udHJvbEtpdCAub3B0aW9ucyAuY29sb3IgLmxpLXNlbGVjdGVkOmhvdmVyLCNjb250cm9sS2l0IC5vcHRpb25zIC5jb2xvciBsaTpob3ZlcntiYWNrZ3JvdW5kOjAgMDtmb250LXdlaWdodDo3MDB9I2NvbnRyb2xLaXQgLm9wdGlvbnMgLmNvbG9yIC5saS1zZWxlY3RlZHtmb250LXdlaWdodDo3MDB9I2NvbnRyb2xLaXQgLnBhbmVsIC5sYWJlbCwjY29udHJvbEtpdCAucGlja2VyIC5sYWJlbHt3aWR0aDoxMDAlO2Zsb2F0OmxlZnQ7Zm9udC1zaXplOjExcHg7Zm9udC13ZWlnaHQ6NzAwO3RleHQtc2hhZG93OjAgMXB4ICMwMDA7b3ZlcmZsb3c6aGlkZGVuO3doaXRlLXNwYWNlOm5vd3JhcDt0ZXh0LW92ZXJmbG93OmVsbGlwc2lzO2N1cnNvcjpkZWZhdWx0fSNjb250cm9sS2l0IC5wYW5lbCAuaGVhZCwjY29udHJvbEtpdCAucGFuZWwgLnBhbmVsLWhlYWQtaW5hY3RpdmUsI2NvbnRyb2xLaXQgLnBpY2tlciAuaGVhZHtoZWlnaHQ6MzBweDtwYWRkaW5nOjAgMTBweDtiYWNrZ3JvdW5kOiMxYTFhMWE7b3ZlcmZsb3c6aGlkZGVufSNjb250cm9sS2l0IC5wYW5lbCAuaGVhZCAud3JhcCwjY29udHJvbEtpdCAucGFuZWwgLnBhbmVsLWhlYWQtaW5hY3RpdmUgLndyYXAsI2NvbnRyb2xLaXQgLnBpY2tlciAuaGVhZCAud3JhcHt3aWR0aDphdXRvO2hlaWdodDphdXRvO21hcmdpbjowO3BhZGRpbmc6MDtwb3NpdGlvbjpyZWxhdGl2ZTtvdmVyZmxvdzpoaWRkZW59I2NvbnRyb2xLaXQgLnBhbmVsIC5oZWFkIC5sYWJlbCwjY29udHJvbEtpdCAucGlja2VyIC5oZWFkIC5sYWJlbHtjdXJzb3I6cG9pbnRlcjtsaW5lLWhlaWdodDozMHB4O2NvbG9yOiM2NTY5NmJ9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuaGVhZHtoZWlnaHQ6MzhweDtwYWRkaW5nOjAgMTBweDtib3JkZXItdG9wOjFweCBzb2xpZCAjNGY0ZjRmO2JvcmRlci1ib3R0b206MXB4IHNvbGlkICMyNjI2MjY7YmFja2dyb3VuZC1pbWFnZTotby1saW5lYXItZ3JhZGllbnQoIzQ1NDU0NSAwLCMzYjNiM2IgMTAwJSk7YmFja2dyb3VuZC1pbWFnZTpsaW5lYXItZ3JhZGllbnQoIzQ1NDU0NSAwLCMzYjNiM2IgMTAwJSk7Y3Vyc29yOnBvaW50ZXJ9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuaGVhZCAubGFiZWx7Zm9udC1zaXplOjEycHg7bGluZS1oZWlnaHQ6MzhweDtjb2xvcjojZmZmfSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLmhlYWQ6aG92ZXJ7Ym9yZGVyLXRvcDoxcHggc29saWQgIzUyNTI1MjtiYWNrZ3JvdW5kLWltYWdlOi1vLWxpbmVhci1ncmFkaWVudCgjNDU0NTQ1IDAsIzQwNDA0MCAxMDAlKTtiYWNrZ3JvdW5kLWltYWdlOmxpbmVhci1ncmFkaWVudCgjNDU0NTQ1IDAsIzQwNDA0MCAxMDAlKX0jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIGxpe2hlaWdodDozNXB4O3BhZGRpbmc6MCAxMHB4fSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLnN1Yi1ncm91cC1saXN0IC5zdWItZ3JvdXA6bGFzdC1vZi10eXBle2JvcmRlci1ib3R0b206bm9uZX0jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3Vwe3BhZGRpbmc6MDtoZWlnaHQ6YXV0bztib3JkZXItYm90dG9tOjFweCBzb2xpZCAjMjQyNDI0fSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLnN1Yi1ncm91cC1saXN0IC5zdWItZ3JvdXAgdWx7b3ZlcmZsb3c6aGlkZGVufSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLnN1Yi1ncm91cC1saXN0IC5zdWItZ3JvdXAgdWwgbGl7YmFja2dyb3VuZDojMmUyZTJlO2JvcmRlci1ib3R0b206MXB4IHNvbGlkICMyMjI3Mjl9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cCB1bCBsaTpsYXN0LW9mLXR5cGV7Ym9yZGVyLWJvdHRvbTpub25lfSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLnN1Yi1ncm91cC1saXN0IC5zdWItZ3JvdXA6Zmlyc3QtY2hpbGR7bWFyZ2luLXRvcDowfSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLnN1Yi1ncm91cC1saXN0IC5zdWItZ3JvdXAgLmhlYWQsI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cCAuaGVhZC1pbmFjdGl2ZXtjdXJzb3I6cG9pbnRlcn0jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3VwIC5oZWFke2hlaWdodDoyN3B4O3BhZGRpbmc6MCAxMHB4O2JvcmRlci10b3A6bm9uZTtib3JkZXItYm90dG9tOjFweCBzb2xpZCAjMjQyNDI0O2JhY2tncm91bmQtaW1hZ2U6bm9uZTtiYWNrZ3JvdW5kLWNvbG9yOiMyNzI3Mjd9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cCAuaGVhZDpob3ZlcntiYWNrZ3JvdW5kLWltYWdlOm5vbmU7YmFja2dyb3VuZC1jb2xvcjojMjcyNzI3fSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLnN1Yi1ncm91cC1saXN0IC5zdWItZ3JvdXAgLmhlYWQtaW5hY3RpdmV7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O2hlaWdodDoyN3B4O3BhZGRpbmc6MCAxMHB4O2JveC1zaGFkb3c6MCAxcHggMCAwICM0MDQwNDAgaW5zZXQ7YmFja2dyb3VuZC1pbWFnZTotby1saW5lYXItZ3JhZGllbnQoIzNiM2IzYiAwLCMzODM4MzggMTAwJSk7YmFja2dyb3VuZC1pbWFnZTpsaW5lYXItZ3JhZGllbnQoIzNiM2IzYiAwLCMzODM4MzggMTAwJSl9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cCAuaGVhZC1pbmFjdGl2ZTpob3Zlcntib3gtc2hhZG93OjAgMXB4IDAgMCAjNDc0NzQ3IGluc2V0O2JhY2tncm91bmQtaW1hZ2U6bm9uZTtiYWNrZ3JvdW5kLWltYWdlOi1vLWxpbmVhci1ncmFkaWVudCgjNDA0MDQwIDAsIzNiM2IzYiAxMDAlKTtiYWNrZ3JvdW5kLWltYWdlOmxpbmVhci1ncmFkaWVudCgjNDA0MDQwIDAsIzNiM2IzYiAxMDAlKX0jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3VwIC5oZWFkIC5sYWJlbCwjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3VwIC5oZWFkLWluYWN0aXZlIC5sYWJlbHttYXJnaW46MDtwYWRkaW5nOjA7bGluZS1oZWlnaHQ6MjdweDtjb2xvcjojZmZmO2ZvbnQtd2VpZ2h0OjcwMDtmb250LXNpemU6MTFweDt0ZXh0LXNoYWRvdzoxcHggMXB4ICMwMDA7dGV4dC10cmFuc2Zvcm06Y2FwaXRhbGl6ZX0jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3VwIC5oZWFkIC53cmFwIC5sYWJlbCwjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3VwIC5oZWFkLWluYWN0aXZlIC53cmFwIC5sYWJlbHt3aWR0aDoxMDAlO2ZvbnQtd2VpZ2h0OjcwMDtjb2xvcjojZmZmO3BhZGRpbmc6MH0jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3VwIC53cmFwIC5sYWJlbHstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7aGVpZ2h0OjEwMCU7d2lkdGg6MzAlO3BhZGRpbmc6MTJweCA1cHggMCAwO2Zsb2F0OmxlZnQ7Zm9udC1zaXplOjExcHg7Zm9udC13ZWlnaHQ6NDAwO2NvbG9yOiNhZWI1Yjg7dGV4dC1zaGFkb3c6MXB4IDFweCAjMDAwfSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLnN1Yi1ncm91cC1saXN0IC5zdWItZ3JvdXAgLndyYXAgLndyYXB7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O3dpZHRoOjcwJTtwYWRkaW5nOjVweCAwIDA7ZmxvYXQ6cmlnaHQ7aGVpZ2h0OjEwMCV9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cDpsYXN0LWNoaWxkIC5zY3JvbGwtYnVmZmVyOm50aC1vZi10eXBlKDMpLCNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXA6bGFzdC1jaGlsZCAuc3ViLWdyb3VwLWxpc3R7Ym9yZGVyLWJvdHRvbTpub25lfSNjb250cm9sS2l0IC5wYW5lbCAuc2Nyb2xsLXdyYXB7cG9zaXRpb246cmVsYXRpdmU7b3ZlcmZsb3c6aGlkZGVufSNjb250cm9sS2l0IC5wYW5lbCAuc2Nyb2xsLWJ1ZmZlcnt3aWR0aDoxMDAlO2hlaWdodDo4cHg7Ym9yZGVyLXRvcDoxcHggc29saWQgIzNiNDQ0Nztib3JkZXItYm90dG9tOjFweCBzb2xpZCAjMWUyMjI0fSNjb250cm9sS2l0IC5wYW5lbCAuc2Nyb2xsQmFyey13ZWJraXQtYm94LXNpemluZzpjb250ZW50LWJveDstbW96LWJveC1zaXppbmc6Y29udGVudC1ib3g7Ym94LXNpemluZzpjb250ZW50LWJveDt3aWR0aDoxNXB4O2hlaWdodDoxMDAlO2Zsb2F0OnJpZ2h0O3RvcDowO3BhZGRpbmc6MDttYXJnaW46MDtwb3NpdGlvbjpyZWxhdGl2ZTtiYWNrZ3JvdW5kOiMyMTI2Mjg7YmFja2dyb3VuZC1pbWFnZTpsaW5lYXItZ3JhZGllbnQodG8gcmlnaHQsIzI0MjQyNCAwLCMyZTJlMmUgMTAwJSl9I2NvbnRyb2xLaXQgLnBhbmVsIC5zY3JvbGxCYXIgLnRyYWNre3BhZGRpbmc6MCAzcHggMCAycHh9I2NvbnRyb2xLaXQgLnBhbmVsIC5zY3JvbGxCYXIgLnRyYWNrIC50aHVtYnstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7d2lkdGg6MTFweDtwb3NpdGlvbjphYnNvbHV0ZTtjdXJzb3I6cG9pbnRlcjtiYWNrZ3JvdW5kLWNvbG9yOiMzNDM0MzQ7Ym9yZGVyOjFweCBzb2xpZCAjMWIxZjIxO2JvcmRlci1yYWRpdXM6MTBweDstbW96LWJvcmRlci1yYWRpdXM6MTBweDtib3gtc2hhZG93Omluc2V0IDAgMXB4IDAgMCAjNDM0YjUwfSNjb250cm9sS2l0IC5wYW5lbCAubWVudSwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlLCNjb250cm9sS2l0IC5waWNrZXIgLm1lbnV7ZmxvYXQ6cmlnaHQ7cGFkZGluZzo1cHggMCAwfSNjb250cm9sS2l0IC5wYW5lbCAubWVudSBpbnB1dFt0eXBlPWJ1dHRvbl0sI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSBpbnB1dFt0eXBlPWJ1dHRvbl0sI2NvbnRyb2xLaXQgLnBpY2tlciAubWVudSBpbnB1dFt0eXBlPWJ1dHRvbl17LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O2N1cnNvcjpwb2ludGVyO2hlaWdodDoyMHB4O2JvcmRlcjpub25lO3ZlcnRpY2FsLWFsaWduOnRvcDtib3JkZXItcmFkaXVzOjJweDstbW96LWJvcmRlci1yYWRpdXM6MnB4O2ZvbnQtZmFtaWx5OkFyaWFsLHNhbnMtc2VyaWY7Zm9udC1zaXplOjEwcHg7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOiNhYWE7dGV4dC1zaGFkb3c6MCAtMXB4ICMwMDA7dGV4dC10cmFuc2Zvcm06dXBwZXJjYXNlO2JveC1zaGFkb3c6MCAwIDAgMXB4ICMxMzEzMTMgaW5zZXQsLTFweCAycHggMCAwICMyMTI1MjcgaW5zZXR9I2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idXR0b24tbWVudS1jbG9zZSwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ1dHRvbi1tZW51LWhpZGUsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idXR0b24tbWVudS1zaG93LCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LWNsb3NlLCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LWhpZGUsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtc2hvdywjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idXR0b24tbWVudS1jbG9zZSwjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idXR0b24tbWVudS1oaWRlLCNjb250cm9sS2l0IC5waWNrZXIgLm1lbnUgLmJ1dHRvbi1tZW51LXNob3d7d2lkdGg6MjBweDttYXJnaW4tbGVmdDo0cHh9I2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idXR0b24tbWVudS1oaWRlLCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LWhpZGUsI2NvbnRyb2xLaXQgLnBpY2tlciAubWVudSAuYnV0dG9uLW1lbnUtaGlkZXtiYWNrZ3JvdW5kOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBR1JKUkVGVWVOcGlkUFVOWW9DQlUwY08xRE13TURDWTJUZzB3c1JZa0NWbEZaVWJvR3k0SW1abGRVMjRwSnlTQ2dPL29CQURBd09Edy9WTDV4bWs1UlFPTXI5OS9SSXVDUVBJaWxqTWJCd1lHQmdZR0g3Ly9NbUFEQ1NsWlJra3BXVVpBQU1BdlRzZ1hCdk9zcTBBQUFBQVNVVk9SSzVDWUlJPSkgNTAlIDUwJSBuby1yZXBlYXQsIzFhMWQxZn0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ1dHRvbi1tZW51LWhpZGU6aG92ZXIsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtaGlkZTpob3ZlciwjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idXR0b24tbWVudS1oaWRlOmhvdmVye2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBRkNBWUFBQUI0a2ExVkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFHUkpSRUZVZU5waWRQVU5Zb0NCVTBjTzFETXdNRENZMlRnMHdzUllrQ1ZsRlpVYm9HeTRJbVpsZFUyNHBKeVNDZ08vb0JBREF3T0R3L1ZMNXhtazVSUU9Ncjk5L1JJdUNRUElpbGpNYkJ3WUdCZ1lHSDcvL01tQURDU2xaUmtrcFdVWkFBTUF2VHNnWEJ2T3NxMEFBQUFBU1VWT1JLNUNZSUk9KSA1MCUgNTAlIG5vLXJlcGVhdCwjMDAwO2JveC1zaGFkb3c6I2ZmZiAwLCMwMDAgMTAwJX0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ1dHRvbi1tZW51LXNob3csI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtc2hvdywjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idXR0b24tbWVudS1zaG93e2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBRkNBWUFBQUI0a2ExVkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFGcEpSRUZVZU5wc2pERU9nQ0FRQk9jNGVxTmZvQ0I4d01yQ253ay84MkVIV0Vrd2NhdEpackt5ckZzR0x2NVgvSDZjcVBjNDFZOXB0VkxOMEJEVDNWc1RFVG5GdVZrV0lHdUlDV0JFdmZjaEFmejBtcXZaNEJlZUFRRHpWaU16SnkwUlhnQUFBQUJKUlU1RXJrSmdnZz09KSA1MCUgNTAlIG5vLXJlcGVhdCwjMWExZDFmfSNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnV0dG9uLW1lbnUtc2hvdzpob3ZlciwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS1zaG93OmhvdmVyLCNjb250cm9sS2l0IC5waWNrZXIgLm1lbnUgLmJ1dHRvbi1tZW51LXNob3c6aG92ZXJ7YmFja2dyb3VuZDp1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFGQ0FZQUFBQjRrYTFWQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQUZwSlJFRlVlTnBzakRFT2dDQVFCT2M0ZXFOZm9DQjh3TXJDbndrLzgyRUhXRWt3Y2F0SlpyS3lyRnNHTHY1WC9INmNxUGM0MVk5cHRWTE4wQkRUM1ZzVEVUbkZ1VmtXSUd1SUNXQkV2ZmNoQWZ6MG1xdlo0QmVlQVFEelZpTXpKeTBSWGdBQUFBQkpSVTVFcmtKZ2dnPT0pIDUwJSA1MCUgbm8tcmVwZWF0LCMwMDA7Ym94LXNoYWRvdzojZmZmIDAsIzAwMCAxMDAlfSNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnV0dG9uLW1lbnUtY2xvc2UsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtY2xvc2UsI2NvbnRyb2xLaXQgLnBpY2tlciAubWVudSAuYnV0dG9uLW1lbnUtY2xvc2V7YmFja2dyb3VuZDp1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFKQ0FZQUFBQVBVMjB1QUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQVExSlJFRlVlTnBNMEQ5TEFtRUF4L0h2UFhlRFRxZVhwVmVZWWpwWUdRMWhCUTdTbnhmUTBwQTFGRVZicjZGZVJnWnVDYjJFb09DZ20yNnNwb0lnaUtCUVFhSVVudWNlVzI3d3QzNkhEL3dNTytuY0FuYTFWbDlqYklIdnRZQU5hMmxsdFlKaHVJSHZYVlZyOVpNb0hwWG1Gdy90cENPdFdDeCtMMHh6djFoZU9BNThMdzY4cHFkbnpsTnBsMURLTndzNDBHSDRrSnJLWEFwaE5nWi92MlR6QlpTVWJhQWhJckxaL2Y2Nm04eTR6QmFLL1BUN1hhQUJJQ0x6YkRnY2JPa3dKRlFLUGRJVGdlKzFBUXc3NmR5NDJkeHVmcTVFcUZRTGVCZENYUFI2SFY2ZUh6K005ZnIyWjhKeFhDVmxFemlOeUQzVHNxNlZrc29zVjVZM3RkWWRZR2ZzaHFlUjFqa0RJL0UvQU84cllSbHdYQnF1QUFBQUFFbEZUa1N1UW1DQykgNTAlIDUwJSBuby1yZXBlYXQsIzFhMWQxZn0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ1dHRvbi1tZW51LWNsb3NlOmhvdmVyLCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LWNsb3NlOmhvdmVyLCNjb250cm9sS2l0IC5waWNrZXIgLm1lbnUgLmJ1dHRvbi1tZW51LWNsb3NlOmhvdmVye2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBSkNBWUFBQUFQVTIwdUFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFRMUpSRUZVZU5wTTBEOUxBbUVBeC9IdlBYZURUcWVYcFZlWVlqcFlHUTFoQlE3U254ZlEwcEExRkVWYnI2RmVSZ1p1Q2IyRW9PQ2dtMjZzcG9JZ2lLQlFRYUlVbnVjZVcyN3d0MzZIRC93TU8rbmNBbmExVmw5amJJSHZ0WUFOYTJsbHRZSmh1SUh2WFZWcjlaTW9IcFhtRncvdHBDT3RXQ3grTDB4enYxaGVPQTU4THc2OHBxZG56bE5wbDFES053czQwR0g0a0pyS1hBcGhOZ1ovdjJUekJaU1ViYUFoSXJMWi9mNjZtOHk0ekJhSy9QVDdYYUFCSUNMemJEZ2NiT2t3SkZRS1BkSVRnZSsxQVF3NzZkeTQyZHh1ZnE1RXFGUUxlQmRDWFBSNkhWNmVIeitNOWZyMlo4SnhYQ1ZsRXppTnlEM1RzcTZWa3Nvc1Y1WTN0ZFlkWUdmc2hxZVIxamtESS9FL0FPOHJZUmx3WEJxdUFBQUFBRWxGVGtTdVFtQ0MpIDUwJSA1MCUgbm8tcmVwZWF0LCMwMDA7Ym94LXNoYWRvdzojZmZmIDAsIzAwMCAxMDAlfSNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnV0dG9uLW1lbnUtdW5kbywjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS11bmRve2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQXdBQUFBTENBWUFBQUJMY0d4ZkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFZVkpSRUZVZU5wY2tEMUlXMUVZaHA5ejdybTNvcWtoeloveEQ2dFIxRXBGS2VsZ2hsQm9uVndLRHBhV0RuYnEybFZGME1IQlViZENwNWFDVWlnZG5JU2dvVVBBcVdNbFlzR2xOdFlLMVpoenpyMWRWRzd6YnQvTDk3eDg3eWNlVHowbHJIS3ArQkpZQkhxdXJHL0FmQzVmK0F3Z3drQzVWSHlieXJUUGR2ZG1BOWYxQkVKUU8vL0xZV1dmaytPZlM3bDhZZUVHS0plS3I3TkQ5OWFUNlF6V21IUGdFK0FBTTQ3cmNuUjR3SS9LL3FTOFRzOTBkcStsTWgxWVkxYUJGdUFGOEF5UVZ1dk5ycnQ5eE9LSmp5SWF1L01PR0pwNDlPUmhyWFpoOXI3dWJnUFBjL25DcjNBMzZUakc5MzFIRFkrT1R5alA2dzhBS1IwMU12YWdjRnF0eG9IL2dMUFQzd2V4UkRLcklyZGJkNlRqOUFzaGNEMFBRYVRhM0JJNW9VRmExM3NJQWlUd3lyZDJ3V3FOcVYvdUFSM0FjY09yUHlSU2JVclg2My9VbGJmayszNEZ4SmR5cWRnRUxBTzNnRGd3UFRCeS8zcHZSb1dDM2dNa1VtM3BTRFQ2UmtxSmNsM2l5WFFRV0lzMVpnWFlVbzIzOWc0TTFzS3oxZm83TUFkc0FQd2JBTDloZnR2VGxOa2RBQUFBQUVsRlRrU3VRbUNDKSAyMCUgNTAlIG5vLXJlcGVhdCwjMWExZDFmO3BhZGRpbmc6MCA2cHggMXB4IDA7d2lkdGg6MzhweDt2ZXJ0aWNhbC1hbGlnbjp0b3A7dGV4dC1hbGlnbjplbmR9I2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idXR0b24tbWVudS11bmRvOmhvdmVyLCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LXVuZG86aG92ZXJ7YmFja2dyb3VuZDp1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBd0FBQUFMQ0FZQUFBQkxjR3hmQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQVlWSlJFRlVlTnBja0QxSVcxRVlocDl6N3JtM29xa2h6Wi94RDZ0UjFFcEZLZWxnaGxCb25Wd0tEcGFXRG5icTJsVkYwTUhCVWJkQ3A1YUNVaWdkbklTZ29VUEFxV01sWXNHbE50WUsxWmh6enIxZFZHN3pidC9MOTd4ODd5Y2VUejBsckhLcCtCSllCSHF1ckcvQWZDNWYrQXdnd2tDNVZIeWJ5clRQZHZkbUE5ZjFCRUpRTy8vTFlXV2ZrK09mUzdsOFllRUdLSmVLcjdORDk5YVQ2UXpXbUhQZ0UrQUFNNDdyY25SNHdJL0svcVM4VHM5MGRxK2xNaDFZWTFhQkZ1QUY4QXlRVnV2TnJydDl4T0tKanlJYXUvTU9HSnA0OU9SaHJYWmg5cjd1YmdQUGMvbkNyM0EzNlRqRzkzMUhEWStPVHlqUDZ3OEFLUjAxTXZhZ2NGcXR4b0gvZ0xQVDN3ZXhSREtySXJkYmQ2VGo5QXNoY0QwUFFhVGEzQkk1b1VGYTEzc0lBaVR3eXJkMndXcU5xVi91QVIzQWNjT3JQeVJTYlVyWDYzL1VsYmZrKzM0RnhKZHlxZGdFTEFPM2dEZ3dQVEJ5LzNwdlJvV0MzZ01rVW0zcFNEVDZSa3FKY2wzaXlYUVFXSXMxWmdYWVVvMjM5ZzRNMXNLejFmbzdNQWRzQVB3YkFMOWhmdHZUbE5rZEFBQUFBRWxGVGtTdVFtQ0MpIDIwJSA1MCUgbm8tcmVwZWF0LCMwMDA7Ym94LXNoYWRvdzojZmZmIDAsIzAwMCAxMDAlfSNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnV0dG9uLW1lbnUtbG9hZCwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS1sb2Fke21hcmdpbi1yaWdodDoycHh9I2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idXR0b24tbWVudS1sb2FkLCNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnV0dG9uLW1lbnUtc2F2ZSwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS1sb2FkLCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LXNhdmV7YmFja2dyb3VuZDojMWExZDFmO2ZvbnQtc2l6ZTo5cHghaW1wb3J0YW50fSNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnV0dG9uLW1lbnUtbG9hZDpob3ZlciwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ1dHRvbi1tZW51LXNhdmU6aG92ZXIsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtbG9hZDpob3ZlciwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS1zYXZlOmhvdmVye2JhY2tncm91bmQ6IzAwMH0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLndyYXB7ZGlzcGxheTpub25lfSNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmV7d2lkdGg6MTAwJTtmbG9hdDpsZWZ0fSNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLndyYXB7ZGlzcGxheTppbmxpbmV9I2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtY2xvc2UsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtaGlkZSwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS1zaG93e2Zsb2F0OnJpZ2h0fSNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3ctcy1tYXh7YmFja2dyb3VuZDp1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFGQ0FZQUFBQjRrYTFWQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQUc1SlJFRlVlTnBpNU9EaWFtUmdZS2hqd0E0YW1WeDhneGptTDFyQzhQM3JWeFE4YitFU0JoZmZJQVptTlIyOUE1ZXZYV2RpWkdDMDE5WFNaR0JnWUdCWXZtWTl3N0kxNnhvWkdCZ2FXS0JHMVM5YnMrNC9Bd05EUFFNREExeVNnWUdCZ2RFblBBYlp6Z1kwbWdFd0FFOWxKVDFscnNmZkFBQUFBRWxGVGtTdVFtQ0MpIGNlbnRlciBuby1yZXBlYXR9I2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvdy1zLW1pbntiYWNrZ3JvdW5kOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBRnBKUkVGVWVOcHNpaUVPZ0RBTVJmOFN4Tkp6SVlmQjFQUWtRN1JrWmNmQllMbmJVQXNMNGNuM1hrZ3M2TnpYcVFBd0wrdmUzVFRHTFdjRGdLUFdkMG9zaUVSYTNGdW51TGRJcElrRmlFUTJ4dThVRW9zQlVQeGp6d0FUU2pWLzhxbE1HQUFBQUFCSlJVNUVya0pnZ2c9PSkgY2VudGVyIG5vLXJlcGVhdH0jY29udHJvbEtpdCAucGFuZWwgLmFycm93LXMtbWF4LCNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3ctcy1taW57d2lkdGg6MTAwJTtoZWlnaHQ6MjBweH0jY29udHJvbEtpdCAucGFuZWwgLmFycm93LWItbWF4e2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBRkNBWUFBQUI0a2ExVkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFESkpSRUZVZU5wc3lzRU5BQ0FNQXpFMjkramhBeEtsUFNtdmVLMmFzekVJTWlISTdVZmxiQ2hKZngrM0FRQUEvLzhEQVBMa1NhbUhhc3R4QUFBQUFFbEZUa1N1UW1DQykgY2VudGVyIG5vLXJlcGVhdH0jY29udHJvbEtpdCAucGFuZWwgLmFycm93LWItbWlue2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBRkNBWUFBQUI0a2ExVkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFDOUpSRUZVZU5xRWpERU9BQ0FRZ3hoOE9EL0gyUmhQa2s0MEFBajBtS3ZpUzJVM1RpZW4waUUzQUFBQS8vOERBRWQxTnRJQ1Y0RXVBQUFBQUVsRlRrU3VRbUNDKSBjZW50ZXIgbm8tcmVwZWF0fSNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3ctYi1zdWItbWF4e2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQW9BQUFBR0NBWUFBQUQ2OEEvR0FBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFHSkpSRUZVZU5waTlBbVBZVUFHZXphdnEyZGdZR0J3OFExcVJCWm5RVmRrYWUvY0FHV2pLR1pXMDlGRFVXVHA0TUlncTZERXdNREE0SEJvMXpZR0pYWE5nM0NGeUlwZ0FGMHg4NlA3ZHhyUUZXRlR6T2dUSHRQQXdNQlF6NEFmTkFBR0FOMUNLUHM0TkRMdkFBQUFBRWxGVGtTdVFtQ0MpIGNlbnRlciBuby1yZXBlYXR9I2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvdy1iLXN1Yi1taW57YmFja2dyb3VuZDp1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBb0FBQUFHQ0FZQUFBRDY4QS9HQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQUc5SlJFRlVlTnA4enJFT1FEQUFoT0cvR0VTWUJidEp2QUtEMWVLQlJOK3NMMU5ONTdhN2lTRGlwa3Z1RzA2a1dTYUJsZi9JWkpvWHlxcWhyT3BQWWMyT05acTQ3WG9Wdkl0QURIbFJmQ0VKYkhIYjlRQXFlQ2RBakNlK0k0QVRQbkR3N29FQWt0ZWx6UnA5OWZ0d0RBQ2ZzUzBYQWJ6NFB3QUFBQUJKUlU1RXJrSmdnZz09KSBjZW50ZXIgbm8tcmVwZWF0fSNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3ctYi1tYXgsI2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvdy1iLW1pbiwjY29udHJvbEtpdCAucGFuZWwgLmFycm93LWItc3ViLW1heCwjY29udHJvbEtpdCAucGFuZWwgLmFycm93LWItc3ViLW1pbnt3aWR0aDoxMHB4O2hlaWdodDoxMDAlO2Zsb2F0OnJpZ2h0fSNjb250cm9sS2l0IC5waWNrZXJ7cG9pbnRlci1ldmVudHM6YXV0bzstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym9yZGVyLXJhZGl1czozcHg7LW1vei1ib3JkZXItcmFkaXVzOjNweDtiYWNrZ3JvdW5kLWNvbG9yOiMzYjNiM2I7Zm9udC1mYW1pbHk6QXJpYWwsc2Fucy1zZXJpZjtmb250LXNpemU6MTFweDtjb2xvcjojZmZmO3RleHQtc2hhZG93OjFweCAxcHggIzAwMDtvdmVyZmxvdzpoaWRkZW47cG9zaXRpb246YWJzb2x1dGU7ei1pbmRleDoyMTQ3NDgzNjMxO3dpZHRoOjM2MHB4Oy13ZWJraXQtdG91Y2gtY2FsbG91dDpub25lOy13ZWJraXQtdXNlci1zZWxlY3Q6bm9uZTsta2h0bWwtdXNlci1zZWxlY3Q6bm9uZTstbW96LXVzZXItc2VsZWN0Om5vbmU7LW1zLXVzZXItc2VsZWN0Om5vbmU7dXNlci1zZWxlY3Q6bm9uZTtib3gtc2hhZG93OjAgMnB4IDJweCByZ2JhKDAsMCwwLC4yNSl9I2NvbnRyb2xLaXQgLnBpY2tlciBjYW52YXN7dmVydGljYWwtYWxpZ246Ym90dG9tO2N1cnNvcjpwb2ludGVyfSNjb250cm9sS2l0IC5waWNrZXIgLndyYXB7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O3BhZGRpbmc6MTBweDtmbG9hdDpsZWZ0fSNjb250cm9sS2l0IC5waWNrZXIgLmZpZWxkLXdyYXB7cGFkZGluZzozcHh9I2NvbnRyb2xLaXQgLnBpY2tlciAuc2xpZGVyLXdyYXB7cGFkZGluZzozcHggMTNweCAzcHggM3B4fSNjb250cm9sS2l0IC5waWNrZXIgLmZpZWxkLXdyYXAsI2NvbnRyb2xLaXQgLnBpY2tlciAuaW5wdXQtd3JhcCwjY29udHJvbEtpdCAucGlja2VyIC5zbGlkZXItd3JhcHtoZWlnaHQ6YXV0bztvdmVyZmxvdzpoaWRkZW47ZmxvYXQ6bGVmdH0jY29udHJvbEtpdCAucGlja2VyIC5pbnB1dC13cmFwey13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveDtib3JkZXI6MXB4IHNvbGlkICMyNDI0MjQ7Ym9yZGVyLXJhZGl1czoycHg7LW1vei1ib3JkZXItcmFkaXVzOjJweDt3aWR0aDoxNDBweDtmbG9hdDpyaWdodDtwYWRkaW5nOjVweCAxMHB4IDFweCAwfSNjb250cm9sS2l0IC5waWNrZXIgLmlucHV0LWZpZWxke3dpZHRoOjUwJTtmbG9hdDpyaWdodDttYXJnaW4tYm90dG9tOjRweH0jY29udHJvbEtpdCAucGlja2VyIC5pbnB1dC1maWVsZCAubGFiZWx7cGFkZGluZzo4cHggMCAwO2NvbG9yOiM4Nzg3ODc7dGV4dC1hbGlnbjpjZW50ZXI7dGV4dC10cmFuc2Zvcm06dXBwZXJjYXNlO2ZvbnQtd2VpZ2h0OjcwMDt0ZXh0LXNoYWRvdzoxcHggMXB4ICMxYTFhMWE7d2lkdGg6NDAlfSNjb250cm9sS2l0IC5waWNrZXIgLmlucHV0LWZpZWxkIC53cmFwe3BhZGRpbmc6MDt3aWR0aDo2MCU7aGVpZ2h0OmF1dG87ZmxvYXQ6cmlnaHR9I2NvbnRyb2xLaXQgLnBpY2tlciAuY29udHJvbHMtd3JhcHstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7d2lkdGg6MTAwJTtoZWlnaHQ6YXV0bztmbG9hdDpyaWdodDtwYWRkaW5nOjlweCAwIDB9I2NvbnRyb2xLaXQgLnBpY2tlciAuY29udHJvbHMtd3JhcCBpbnB1dFt0eXBlPWJ1dHRvbl17ZmxvYXQ6cmlnaHQ7d2lkdGg6NjVweDttYXJnaW46MCAwIDAgMTBweH0jY29udHJvbEtpdCAucGlja2VyIC5jb2xvci1jb250cmFzdHstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym9yZGVyOm5vbmU7Ym94LXNoYWRvdzowIDAgMCAxcHggIzFmMWYxZiBpbnNldDtib3JkZXItcmFkaXVzOjJweDstbW96LWJvcmRlci1yYWRpdXM6MnB4O2hlaWdodDoyNXB4O3BhZGRpbmc6M3B4O3dpZHRoOjgwJTttYXJnaW4tYm90dG9tOjRweDtmbG9hdDpyaWdodH0jY29udHJvbEtpdCAucGlja2VyIC5jb2xvci1jb250cmFzdCBkaXZ7d2lkdGg6NTAlO2hlaWdodDoxMDAlO2Zsb2F0OmxlZnR9I2NvbnRyb2xLaXQgLnBpY2tlciBpbnB1dFt0eXBlPXRleHRde3BhZGRpbmc6MDt0ZXh0LWFsaWduOmNlbnRlcjt3aWR0aDo2MCU7ZmxvYXQ6cmlnaHR9I2NvbnRyb2xLaXQgLnBpY2tlciAud3JhcCAuaW5wdXQtd3JhcDpudGgtb2YtdHlwZSgzKXtib3JkZXItYm90dG9tLWxlZnQtcmFkaXVzOjA7Ym9yZGVyLWJvdHRvbS1yaWdodC1yYWRpdXM6MH0jY29udHJvbEtpdCAucGlja2VyIC53cmFwIC5pbnB1dC13cmFwOm50aC1vZi10eXBlKDQpe2JvcmRlci10b3A6bm9uZTtib3JkZXItdG9wLWxlZnQtcmFkaXVzOjA7Ym9yZGVyLXRvcC1yaWdodC1yYWRpdXM6MH0jY29udHJvbEtpdCAucGlja2VyIC53cmFwIC5pbnB1dC13cmFwOm50aC1vZi10eXBlKDQpIC5pbnB1dC1maWVsZHt3aWR0aDoxMDAlfSNjb250cm9sS2l0IC5waWNrZXIgLndyYXAgLmlucHV0LXdyYXA6bnRoLW9mLXR5cGUoNCkgLmlucHV0LWZpZWxkIC5sYWJlbHt3aWR0aDoyMCV9I2NvbnRyb2xLaXQgLnBpY2tlciAud3JhcCAuaW5wdXQtd3JhcDpudGgtb2YtdHlwZSg0KSBpbnB1dFt0eXBlPXRleHRde3dpZHRoOjgwJX0jY29udHJvbEtpdCAucGlja2VyIC5maWVsZC13cmFwLCNjb250cm9sS2l0IC5waWNrZXIgLnNsaWRlci13cmFwe2JhY2tncm91bmQ6IzFlMjIyNDtib3JkZXI6bm9uZTtib3gtc2hhZG93OjAgMCAwIDFweCAjMWYxZjFmIGluc2V0O2JvcmRlci1yYWRpdXM6MnB4Oy1tb3otYm9yZGVyLXJhZGl1czoycHg7cG9zaXRpb246cmVsYXRpdmU7bWFyZ2luLXJpZ2h0OjVweH0jY29udHJvbEtpdCAucGlja2VyIC5maWVsZC13cmFwIC5pbmRpY2F0b3IsI2NvbnRyb2xLaXQgLnBpY2tlciAuc2xpZGVyLXdyYXAgLmluZGljYXRvcntwb3NpdGlvbjphYnNvbHV0ZTtib3JkZXI6MnB4IHNvbGlkICNmZmY7Ym94LXNoYWRvdzowIDFweCBibGFjaywwIDFweCAjMDAwIGluc2V0O2N1cnNvcjpwb2ludGVyfSNjb250cm9sS2l0IC5waWNrZXIgLmZpZWxkLXdyYXAgLmluZGljYXRvcnt3aWR0aDo4cHg7aGVpZ2h0OjhweDtsZWZ0OjUwJTt0b3A6NTAlO2JvcmRlci1yYWRpdXM6NTAlOy1tb3otYm9yZGVyLXJhZGl1czo1MCV9I2NvbnRyb2xLaXQgLnBpY2tlciAuc2xpZGVyLXdyYXAgLmluZGljYXRvcnt3aWR0aDoxNHB4O2hlaWdodDozcHg7Ym9yZGVyLXJhZGl1czo4cHg7LW1vei1ib3JkZXItcmFkaXVzOjhweDtsZWZ0OjFweDt0b3A6MXB4fSNjb250cm9sS2l0IC5waWNrZXIgLnNsaWRlci13cmFwIC5pbmRpY2F0b3I6YWZ0ZXJ7Y29udGVudDonJzt3aWR0aDowO2hlaWdodDowO2JvcmRlci10b3A6NC41cHggc29saWQgdHJhbnNwYXJlbnQ7Ym9yZGVyLWJvdHRvbTo0LjVweCBzb2xpZCB0cmFuc3BhcmVudDtib3JkZXItcmlnaHQ6NHB4IHNvbGlkICNmZmY7ZmxvYXQ6cmlnaHQ7cG9zaXRpb246YWJzb2x1dGU7dG9wOi0ycHg7bGVmdDoxOXB4fSNjb250cm9sS2l0IC5waWNrZXIgLnNsaWRlci13cmFwIC5pbmRpY2F0b3I6YmVmb3Jle2NvbnRlbnQ6Jyc7d2lkdGg6MDtoZWlnaHQ6MDtib3JkZXItdG9wOjQuNXB4IHNvbGlkIHRyYW5zcGFyZW50O2JvcmRlci1ib3R0b206NC41cHggc29saWQgdHJhbnNwYXJlbnQ7Ym9yZGVyLXJpZ2h0OjRweCBzb2xpZCAjMDAwO2Zsb2F0OnJpZ2h0O3Bvc2l0aW9uOmFic29sdXRlO3RvcDotM3B4O2xlZnQ6MTlweH1cIlxufTsgXG5tb2R1bGUuZXhwb3J0cyA9IFN0eWxlOyIsImZ1bmN0aW9uIEV2ZW50XyhzZW5kZXIsdHlwZSxkYXRhKSB7XG4gICAgdGhpcy5zZW5kZXIgPSBzZW5kZXI7XG4gICAgdGhpcy50eXBlICAgPSB0eXBlO1xuICAgIHRoaXMuZGF0YSAgID0gZGF0YTtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRfOyIsImZ1bmN0aW9uIEV2ZW50RGlzcGF0Y2hlcigpIHtcbiAgICB0aGlzLl9saXN0ZW5lcnMgPSBbXTtcbn07XG5cbkV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUgPSB7XG4gICAgYWRkRXZlbnRMaXN0ZW5lcjogZnVuY3Rpb24gKGV2ZW50VHlwZSwgbGlzdGVuZXIsIGNhbGxiYWNrTWV0aG9kKSB7XG4gICAgICAgIHRoaXMuX2xpc3RlbmVyc1tldmVudFR5cGVdID0gdGhpcy5fbGlzdGVuZXJzW2V2ZW50VHlwZV0gfHwgW107XG4gICAgICAgIHRoaXMuX2xpc3RlbmVyc1tldmVudFR5cGVdLnB1c2goe29iajogbGlzdGVuZXIsIG1ldGhvZDogY2FsbGJhY2tNZXRob2R9KTtcbiAgICB9LFxuXG4gICAgZGlzcGF0Y2hFdmVudDogZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIHZhciB0eXBlID0gZXZlbnQudHlwZTtcblxuICAgICAgICBpZiAoIXRoaXMuaGFzRXZlbnRMaXN0ZW5lcih0eXBlKSl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy5fbGlzdGVuZXJzW3R5cGVdO1xuICAgICAgICB2YXIgaSA9IC0xLCBsID0gbGlzdGVuZXJzLmxlbmd0aDtcblxuICAgICAgICB2YXIgb2JqLCBtZXRob2Q7XG5cbiAgICAgICAgd2hpbGUgKCsraSA8IGwpIHtcbiAgICAgICAgICAgIG9iaiA9IGxpc3RlbmVyc1tpXS5vYmo7XG4gICAgICAgICAgICBtZXRob2QgPSBsaXN0ZW5lcnNbaV0ubWV0aG9kO1xuXG4gICAgICAgICAgICBpZiAoIW9ialttZXRob2RdKXtcbiAgICAgICAgICAgICAgICB0aHJvdyBvYmogKyAnIGhhcyBubyBtZXRob2QgJyArIG1ldGhvZDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgb2JqW21ldGhvZF0oZXZlbnQpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHJlbW92ZUV2ZW50TGlzdGVuZXI6IGZ1bmN0aW9uICh0eXBlLCBvYmosIG1ldGhvZCkge1xuICAgICAgICBpZiAoIXRoaXMuaGFzRXZlbnRMaXN0ZW5lcih0eXBlKSl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy5fbGlzdGVuZXJzW3R5cGVdO1xuXG4gICAgICAgIHZhciBpID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICAgICAgd2hpbGUgKC0taSA+IC0xKSB7XG4gICAgICAgICAgICBpZiAobGlzdGVuZXJzW2ldLm9iaiA9PSBvYmogJiYgbGlzdGVuZXJzW2ldLm1ldGhvZCA9PSBtZXRob2QpIHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lcnMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgIGlmIChsaXN0ZW5lcnMubGVuZ3RoID09IDApe1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5fbGlzdGVuZXJzW3R5cGVdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICByZW1vdmVBbGxFdmVudExpc3RlbmVyczogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9saXN0ZW5lcnMgPSBbXTtcbiAgICB9LFxuXG4gICAgaGFzRXZlbnRMaXN0ZW5lcjogZnVuY3Rpb24gKHR5cGUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2xpc3RlbmVyc1t0eXBlXSAhPSB1bmRlZmluZWQgJiYgdGhpcy5fbGlzdGVuZXJzW3R5cGVdICE9IG51bGw7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBFdmVudERpc3BhdGNoZXI7IiwidmFyIExheW91dE1vZGUgPSB7XG4gICAgTEVGVCAgIDogJ2xlZnQnLFxuICAgIFJJR0hUICA6ICdyaWdodCcsXG4gICAgVE9QICAgIDogJ3RvcCcsXG4gICAgQk9UVE9NIDogJ2JvdHRvbScsXG4gICAgTk9ORSAgIDogJ25vbmUnXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IExheW91dE1vZGU7IiwidmFyIE5vZGUgICA9IHJlcXVpcmUoJy4uL2RvY3VtZW50L05vZGUnKTtcbnZhciBNZXRyaWMgPSByZXF1aXJlKCcuLi8uLi9jb21wb25lbnQvTWV0cmljJyk7XG52YXIgQ1NTICAgID0gcmVxdWlyZSgnLi4vZG9jdW1lbnQvQ1NTJyk7XG52YXIgRG9jdW1lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcbiAgICBOb2RlRXZlbnQgICAgID0gcmVxdWlyZSgnLi4vZG9jdW1lbnQvTm9kZUV2ZW50Jyk7XG52YXIgTW91c2UgID0gcmVxdWlyZSgnLi4vZG9jdW1lbnQvTW91c2UnKTtcblxuZnVuY3Rpb24gU2Nyb2xsQmFyKHBhcmVudE5vZGUsdGFyZ2V0Tm9kZSx3cmFwSGVpZ2h0KSB7XG4gICAgdGhpcy5fcGFyZW50Tm9kZSA9IHBhcmVudE5vZGU7XG4gICAgdGhpcy5fdGFyZ2V0Tm9kZSA9IHRhcmdldE5vZGU7XG4gICAgdGhpcy5fd3JhcEhlaWdodCA9IHdyYXBIZWlnaHQ7XG5cbiAgICB2YXIgd3JhcCAgID0gdGhpcy5fd3JhcE5vZGUgICA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuU2Nyb2xsV3JhcCksXG4gICAgICAgIG5vZGUgICA9IHRoaXMuX25vZGUgICAgICAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlNjcm9sbEJhciksXG4gICAgICAgIHRyYWNrICA9IHRoaXMuX3RyYWNrTm9kZSAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlNjcm9sbEJhclRyYWNrKSxcbiAgICAgICAgdGh1bWIgID0gdGhpcy5fdGh1bWJOb2RlICA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuU2Nyb2xsQmFyVGh1bWIpO1xuXG4gICAgcGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0YXJnZXROb2RlKTtcbiAgICBwYXJlbnROb2RlLmFkZENoaWxkKHdyYXApO1xuICAgIHBhcmVudE5vZGUuYWRkQ2hpbGRBdChub2RlLDApO1xuXG4gICAgd3JhcC5hZGRDaGlsZCh0YXJnZXROb2RlKTtcbiAgICBub2RlLmFkZENoaWxkKHRyYWNrKTtcbiAgICB0cmFjay5hZGRDaGlsZCh0aHVtYik7XG5cbiAgICB0aGlzLl9tb3VzZVRodW1iT2Zmc2V0ID0gMDtcbiAgICB0aGlzLl9zY3JvbGxIZWlnaHQgPSAwO1xuICAgIHRoaXMuX3Njcm9sbFVuaXQgICA9IDA7XG4gICAgdGhpcy5fc2Nyb2xsTWluICAgID0gMDtcbiAgICB0aGlzLl9zY3JvbGxNYXggICAgPSAwO1xuXG4gICAgdGh1bWIuc2V0UG9zaXRpb25ZKE1ldHJpYy5TQ1JPTExCQVJfVFJBQ0tfUEFERElORyk7XG4gICAgdGh1bWIuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX0RPV04sdGhpcy5fb25UaHVtYkRyYWdTdGFydC5iaW5kKHRoaXMpKTtcblxuICAgIHRoaXMuX2lzVmFsaWQgID0gZmFsc2U7XG4gICAgdGhpcy5fZW5hYmxlZCA9IGZhbHNlO1xuXG4gICAgdmFyIG5vZGVFbGVtZW50ID0gbm9kZS5nZXRFbGVtZW50KCksXG4gICAgICAgIHRodW1iRWxlbWVudCA9IHRodW1iLmdldEVsZW1lbnQoKTtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5fb25Nb3VzZVdoZWVsID0gZnVuY3Rpb24oZSl7XG4gICAgICAgIHZhciBzZW5kZXIgPSBlLnNlbmRlcixcbiAgICAgICAgICAgIGhvdmVyRWxlbWVudCA9IHNlbmRlci5nZXRIb3ZlckVsZW1lbnQoKTtcbiAgICAgICAgaWYoaG92ZXJFbGVtZW50ICE9IG5vZGVFbGVtZW50ICYmIGhvdmVyRWxlbWVudCAhPSB0aHVtYkVsZW1lbnQpe1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzY3JvbGxTdGVwID0gc2VsZi5fc2Nyb2xsSGVpZ2h0ICogMC4wMTI1O1xuICAgICAgICBzZWxmLl9zY3JvbGwodGh1bWIuZ2V0UG9zaXRpb25ZKCkgKyBzZW5kZXIuZ2V0V2hlZWxEaXJlY3Rpb24oKSAqIHNjcm9sbFN0ZXAgKiAtMSk7XG4gICAgICAgIGUuZGF0YS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH07XG5cbiAgICB0aGlzLmFkZE1vdXNlTGlzdGVuZXIoKTtcbn1cblxuU2Nyb2xsQmFyLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpe1xuICAgIHZhciB0YXJnZXQgPSB0aGlzLl90YXJnZXROb2RlLFxuICAgICAgICB0aHVtYiA9IHRoaXMuX3RodW1iTm9kZTtcblxuICAgIHZhciBwYWRkaW5nID0gTWV0cmljLlNDUk9MTEJBUl9UUkFDS19QQURESU5HO1xuXG4gICAgdmFyIHRhcmdldFdyYXBIZWlnaHQgPSB0aGlzLl93cmFwSGVpZ2h0LFxuICAgICAgICB0YXJnZXRIZWlnaHQgPSB0YXJnZXQuZ2V0SGVpZ2h0KCksXG4gICAgICAgIHRyYWNrSGVpZ2h0ID0gdGFyZ2V0V3JhcEhlaWdodCAtIHBhZGRpbmcgKiAyO1xuXG4gICAgdGh1bWIuc2V0SGVpZ2h0KHRyYWNrSGVpZ2h0KTtcblxuICAgIHZhciByYXRpbyA9IHRhcmdldFdyYXBIZWlnaHQgLyB0YXJnZXRIZWlnaHQ7XG5cbiAgICB0aGlzLl9pc1ZhbGlkID0gZmFsc2U7XG5cbiAgICBpZiAocmF0aW8gPiAxLjApe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aHVtYkhlaWdodCA9IHRyYWNrSGVpZ2h0ICogcmF0aW87XG5cbiAgICB0aGlzLl9zY3JvbGxIZWlnaHQgPSB0cmFja0hlaWdodDtcbiAgICB0aGlzLl9zY3JvbGxVbml0ICAgPSB0YXJnZXRIZWlnaHQgLSB0aGlzLl9zY3JvbGxIZWlnaHQgLSBwYWRkaW5nICogMjtcbiAgICB0aGlzLl9zY3JvbGxNaW4gICAgPSBwYWRkaW5nO1xuICAgIHRoaXMuX3Njcm9sbE1heCAgICA9IHBhZGRpbmcgKyB0cmFja0hlaWdodCAtIHRodW1iSGVpZ2h0O1xuXG4gICAgdGh1bWIuc2V0SGVpZ2h0KHRodW1iSGVpZ2h0KTtcblxuICAgIHRoaXMuX2lzVmFsaWQgPSB0cnVlO1xufTtcblxuU2Nyb2xsQmFyLnByb3RvdHlwZS5fc2Nyb2xsID0gZnVuY3Rpb24oeSl7XG4gICAgdmFyIG1pbiAgPSB0aGlzLl9zY3JvbGxNaW4sXG4gICAgICAgIG1heCAgPSB0aGlzLl9zY3JvbGxNYXgsXG4gICAgICAgIHBvcyAgPSBNYXRoLm1heChtaW4sIE1hdGgubWluKHksbWF4KSksXG4gICAgICAgIHBvc18gPSAocG9zLW1pbikvKG1heC1taW4pO1xuXG4gICAgdGhpcy5fdGh1bWJOb2RlLnNldFBvc2l0aW9uWShwb3MpO1xuICAgIHRoaXMuX3RhcmdldE5vZGUuc2V0UG9zaXRpb25ZKHBvc18gKiB0aGlzLl9zY3JvbGxVbml0ICogLTEpO1xufTtcblxuXG5TY3JvbGxCYXIucHJvdG90eXBlLl9vblRodW1iRHJhZ1N0YXJ0ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5faXNWYWxpZCB8fCB0aGlzLl9lbmFibGVkKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgZXZlbnRNb3ZlID0gRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLFxuICAgICAgICBldmVudFVwID0gRG9jdW1lbnRFdmVudC5NT1VTRV9VUDtcblxuICAgIHZhciBtb3VzZSA9IE1vdXNlLmdldCgpO1xuICAgIHZhciB0cmFja09mZnNldCA9IHRoaXMuX3RyYWNrTm9kZS5nZXRQb3NpdGlvbkdsb2JhbFkoKTtcblxuICAgIHRoaXMuX21vdXNlVGh1bWJPZmZzZXQgPSBtb3VzZS5nZXRZKCkgLSB0aGlzLl90aHVtYk5vZGUuZ2V0UG9zaXRpb25HbG9iYWxZKCk7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG9uRHJhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuX3Njcm9sbChtb3VzZS5nZXRZKCkgLSB0cmFja09mZnNldCAtIHNlbGYuX21vdXNlVGh1bWJPZmZzZXQpO1xuICAgICAgICB9LFxuICAgICAgICBvbkRyYWdFbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50VXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xuICAgICAgICB9O1xuXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRVcCwgb25EcmFnRW5kLCBmYWxzZSk7XG4gICAgdGhpcy5fc2Nyb2xsKG1vdXNlLmdldFkoKSAtIHRyYWNrT2Zmc2V0IC0gc2VsZi5fbW91c2VUaHVtYk9mZnNldCk7XG59O1xuXG5cblNjcm9sbEJhci5wcm90b3R5cGUuZW5hYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2VuYWJsZWQgPSBmYWxzZTtcbiAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XG59O1xuXG5TY3JvbGxCYXIucHJvdG90eXBlLmRpc2FibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fZW5hYmxlZCA9IHRydWU7XG4gICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xufTtcblNjcm9sbEJhci5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fc2Nyb2xsKDApO1xufTtcblxuU2Nyb2xsQmFyLnByb3RvdHlwZS5fdXBkYXRlQXBwZWFyYW5jZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5fZW5hYmxlZCkge1xuICAgICAgICB0aGlzLl9ub2RlLnNldFN0eWxlUHJvcGVydHkoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgICAgICB0aGlzLl90YXJnZXROb2RlLnNldFBvc2l0aW9uWSgwKTtcbiAgICAgICAgdGhpcy5fdGh1bWJOb2RlLnNldFBvc2l0aW9uWShNZXRyaWMuU0NST0xMQkFSX1RSQUNLX1BBRERJTkcpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX25vZGUuc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdibG9jaycpO1xuICAgIH1cbn07XG5cblNjcm9sbEJhci5wcm90b3R5cGUuaXNWYWxpZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5faXNWYWxpZDtcbn07XG5cblNjcm9sbEJhci5wcm90b3R5cGUuc2V0V3JhcEhlaWdodCA9IGZ1bmN0aW9uIChoZWlnaHQpIHtcbiAgICB0aGlzLl93cmFwSGVpZ2h0ID0gaGVpZ2h0O1xuICAgIHRoaXMudXBkYXRlKCk7XG59O1xuXG5TY3JvbGxCYXIucHJvdG90eXBlLnJlbW92ZVRhcmdldE5vZGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3dyYXBOb2RlLnJlbW92ZUNoaWxkKHRoaXMuX3RhcmdldE5vZGUpO1xufTtcblxuU2Nyb2xsQmFyLnByb3RvdHlwZS5yZW1vdmVNb3VzZUxpc3RlbmVyID0gZnVuY3Rpb24oKXtcbiAgICBNb3VzZS5nZXQoKS5yZW1vdmVFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfV0hFRUwsdGhpcywnX29uTW91c2VXaGVlbCcpO1xufTtcblxuU2Nyb2xsQmFyLnByb3RvdHlwZS5hZGRNb3VzZUxpc3RlbmVyID0gZnVuY3Rpb24oKXtcbiAgICBNb3VzZS5nZXQoKS5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfV0hFRUwsdGhpcywnX29uTW91c2VXaGVlbCcpO1xufTtcblxuU2Nyb2xsQmFyLnByb3RvdHlwZS5yZW1vdmVGcm9tUGFyZW50ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBwYXJlbnROb2RlID0gdGhpcy5fcGFyZW50Tm9kZSxcbiAgICAgICAgcm9vdE5vZGUgPSB0aGlzLl9ub2RlLFxuICAgICAgICB0YXJnZXROb2RlID0gdGhpcy5fdGFyZ2V0Tm9kZTtcblxuICAgIHJvb3ROb2RlLnJlbW92ZUNoaWxkKHRhcmdldE5vZGUpO1xuICAgIHBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5fd3JhcE5vZGUpO1xuICAgIHBhcmVudE5vZGUucmVtb3ZlQ2hpbGQocm9vdE5vZGUpO1xuXG4gICAgcmV0dXJuIHRhcmdldE5vZGU7XG59O1xuXG5TY3JvbGxCYXIucHJvdG90eXBlLmdldFdyYXBOb2RlID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl93cmFwTm9kZTtcbn07XG5cblNjcm9sbEJhci5wcm90b3R5cGUuZ2V0Tm9kZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fbm9kZTtcbn07XG5cblNjcm9sbEJhci5wcm90b3R5cGUuZ2V0VGFyZ2V0Tm9kZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fdGFyZ2V0Tm9kZTtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBTY3JvbGxCYXI7IiwidmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnREaXNwYXRjaGVyJyk7XG52YXIgTm9kZSAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XG52YXIgU2Nyb2xsQmFyICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9sYXlvdXQvU2Nyb2xsQmFyJyk7XG5cbmZ1bmN0aW9uIEFic3RyYWN0R3JvdXAocGFyZW50LCBwYXJhbXMpIHtcbiAgICBFdmVudERpc3BhdGNoZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgIHBhcmFtcyA9IHBhcmFtcyB8fCB7fTtcbiAgICBwYXJhbXMuaGVpZ2h0ID0gcGFyYW1zLmhlaWdodCB8fCBudWxsO1xuICAgIHBhcmFtcy5lbmFibGUgPSBwYXJhbXMuZW5hYmxlID09PSB1bmRlZmluZWQgPyB0cnVlIDogcGFyYW1zLmVuYWJsZTtcblxuICAgIHRoaXMuX3BhcmVudCA9IHBhcmVudDtcbiAgICB0aGlzLl9oZWlnaHQgPSBwYXJhbXMuaGVpZ2h0O1xuICAgIHRoaXMuX2VuYWJsZWQgPSBwYXJhbXMuZW5hYmxlO1xuICAgIHRoaXMuX3Njcm9sbEJhciA9IG51bGw7XG5cbiAgICB0aGlzLl9ub2RlID0gbmV3IE5vZGUoTm9kZS5MSVNUX0lURU0pO1xuICAgIHRoaXMuX3dyYXBOb2RlID0gbmV3IE5vZGUoKTtcbiAgICB0aGlzLl9saXN0Tm9kZSA9IG5ldyBOb2RlKE5vZGUuTElTVCk7XG5cbiAgICB0aGlzLl9wYXJlbnQuZ2V0TGlzdCgpLmFkZENoaWxkKHRoaXMuX25vZGUpO1xufVxuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUpO1xuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBBYnN0cmFjdEdyb3VwO1xuXG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZS5hZGRTY3JvbGxXcmFwID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB3cmFwTm9kZSA9IHRoaXMuX3dyYXBOb2RlLFxuICAgICAgICBtYXhIZWlnaHQgPSB0aGlzLmdldE1heEhlaWdodCgpO1xuXG4gICAgdGhpcy5fc2Nyb2xsQmFyID0gbmV3IFNjcm9sbEJhcih3cmFwTm9kZSwgdGhpcy5fbGlzdE5vZGUsIG1heEhlaWdodCk7XG4gICAgaWYgKHRoaXMuaXNFbmFibGVkKCkpIHtcbiAgICAgICAgd3JhcE5vZGUuc2V0SGVpZ2h0KG1heEhlaWdodCk7XG4gICAgfVxufTtcblxuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUucHJldmVudFNlbGVjdERyYWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fcGFyZW50LnByZXZlbnRTZWxlY3REcmFnKCk7XG5cbiAgICBpZiAoIXRoaXMuaGFzU2Nyb2xsV3JhcCgpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5fd3JhcE5vZGUuZ2V0RWxlbWVudCgpLnNjcm9sbFRvcCA9IDA7XG59O1xuXG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZS5oYXNNYXhIZWlnaHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2hlaWdodCAhPSBudWxsO1xufTtcblxuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUuZ2V0TWF4SGVpZ2h0ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9oZWlnaHQ7XG59O1xuXG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZS5oYXNTY3JvbGxXcmFwID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9zY3JvbGxCYXIgIT0gbnVsbDtcbn07XG5cbkFic3RyYWN0R3JvdXAucHJvdG90eXBlLmhhc0xhYmVsID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9sYWJsTm9kZSAhPSBudWxsO1xufTtcblxuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUuZGlzYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9lbmFibGVkID0gZmFsc2U7XG4gICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xufTtcblxuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUuZW5hYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2VuYWJsZWQgPSB0cnVlO1xuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbn07XG5cbkFic3RyYWN0R3JvdXAucHJvdG90eXBlLmlzRGlzYWJsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICF0aGlzLl9lbmFibGVkO1xufTtcblxuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUuaXNFbmFibGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9lbmFibGVkO1xufTtcblxuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUuZ2V0TGlzdCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fbGlzdE5vZGU7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFic3RyYWN0R3JvdXA7XG5cbiIsInZhciBBYnN0cmFjdEdyb3VwID0gcmVxdWlyZSgnLi9BYnN0cmFjdEdyb3VwJyk7XG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcbnZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XG5cbnZhciBTdWJHcm91cCA9IHJlcXVpcmUoJy4vU3ViR3JvdXAnKTtcblxudmFyIEV2ZW50XyA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcbiAgICBEb2N1bWVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXG4gICAgTm9kZUV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKSxcbiAgICBQYW5lbEV2ZW50ID0gcmVxdWlyZSgnLi9QYW5lbEV2ZW50JyksXG4gICAgR3JvdXBFdmVudCA9IHJlcXVpcmUoJy4vR3JvdXBFdmVudCcpO1xuXG52YXIgT2JqZWN0Q29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY29yZS9PYmplY3RDb21wb25lbnQnKSxcbiAgICBWYWx1ZVBsb3R0ZXIgICAgPSByZXF1aXJlKCcuLi9jb21wb25lbnQvVmFsdWVQbG90dGVyJyksXG4gICAgRnVuY3Rpb25QbG90dGVyID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L0Z1bmN0aW9uUGxvdHRlcicpO1xuXG5mdW5jdGlvbiBHcm91cChwYXJlbnQscGFyYW1zKSB7XG4gICAgcGFyYW1zICAgICAgICAgICA9IHBhcmFtcyB8fCB7fTtcbiAgICBwYXJhbXMubGFiZWwgICAgID0gcGFyYW1zLmxhYmVsICAgICB8fCBudWxsO1xuICAgIHBhcmFtcy51c2VMYWJlbHMgPSBwYXJhbXMudXNlTGFiZWxzIHx8IHRydWU7XG4gICAgcGFyYW1zLmVuYWJsZSAgICA9IHBhcmFtcy5lbmFibGUgICAgID09PSB1bmRlZmluZWQgPyB0cnVlIDogcGFyYW1zLmVuYWJsZTtcblxuICAgIEFic3RyYWN0R3JvdXAuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG4gICAgdGhpcy5fY29tcG9uZW50cyA9IFtdO1xuICAgIHRoaXMuX3N1Ykdyb3VwcyAgPSBbXTtcblxuICAgIHZhciByb290ID0gdGhpcy5fbm9kZSxcbiAgICAgICAgd3JhcCA9IHRoaXMuX3dyYXBOb2RlLFxuICAgICAgICBsaXN0ID0gdGhpcy5fbGlzdE5vZGU7XG5cbiAgICAgICAgcm9vdC5zZXRTdHlsZUNsYXNzKENTUy5Hcm91cCk7XG4gICAgICAgIHdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCk7XG4gICAgICAgIGxpc3Quc2V0U3R5bGVDbGFzcyhDU1MuU3ViR3JvdXBMaXN0KTtcblxuICAgICAgICB3cmFwLmFkZENoaWxkKGxpc3QpO1xuXG4gICAgdmFyIGxhYmVsID0gcGFyYW1zLmxhYmVsO1xuXG4gICAgaWYobGFiZWwpe1xuICAgICAgICB2YXIgaGVhZCAgPSBuZXcgTm9kZSgpLFxuICAgICAgICAgICAgd3JhcF8gPSBuZXcgTm9kZSgpLFxuICAgICAgICAgICAgbGFiZWxfICA9IG5ldyBOb2RlKE5vZGUuU1BBTiksXG4gICAgICAgICAgICBpbmRpY2F0b3IgPSB0aGlzLl9pbmRpTm9kZSA9IG5ldyBOb2RlKCk7XG5cbiAgICAgICAgICAgIGhlYWQuc2V0U3R5bGVDbGFzcyhDU1MuSGVhZCk7XG4gICAgICAgICAgICB3cmFwXy5zZXRTdHlsZUNsYXNzKENTUy5XcmFwKTtcbiAgICAgICAgICAgIGxhYmVsXy5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCk7XG4gICAgICAgICAgICBpbmRpY2F0b3Iuc2V0U3R5bGVDbGFzcyhDU1MuQXJyb3dCTWF4KTtcbiAgICAgICAgICAgIGxhYmVsXy5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJyxsYWJlbCk7XG5cbiAgICAgICAgICAgIGhlYWQuYWRkQ2hpbGQoaW5kaWNhdG9yKTtcbiAgICAgICAgICAgIHdyYXBfLmFkZENoaWxkKGxhYmVsXyk7XG4gICAgICAgICAgICBoZWFkLmFkZENoaWxkKHdyYXBfKTtcbiAgICAgICAgICAgIHJvb3QuYWRkQ2hpbGQoaGVhZCk7XG5cbiAgICAgICAgaGVhZC5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLHRoaXMuX29uSGVhZFRyaWdnZXIuYmluZCh0aGlzKSk7XG4gICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LkdST1VQX0xJU1RfU0laRV9DSEFOR0UscGFyZW50LCdvbkdyb3VwTGlzdFNpemVDaGFuZ2UnKTtcblxuICAgICAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XG4gICAgfVxuXG4gICAgaWYodGhpcy5oYXNNYXhIZWlnaHQoKSl7XG4gICAgICAgIHRoaXMuYWRkU2Nyb2xsV3JhcCgpO1xuICAgIH1cblxuICAgIHJvb3QuYWRkQ2hpbGQod3JhcCk7XG5cbiAgICBpZih0aGlzLmhhc01heEhlaWdodCgpKXtcbiAgICAgICAgaWYoIWxhYmVsKXtcbiAgICAgICAgICAgIHZhciBidWZmZXJUb3AgPSB0aGlzLl9zY3JvbGxCdWZmZXJUb3AgPSBuZXcgTm9kZSgpO1xuICAgICAgICAgICAgICAgIGJ1ZmZlclRvcC5zZXRTdHlsZUNsYXNzKENTUy5TY3JvbGxCdWZmZXIpO1xuXG4gICAgICAgICAgICByb290LmFkZENoaWxkQXQoYnVmZmVyVG9wLDApO1xuICAgICAgICB9XG4gICAgICAgIHZhciBidWZmZXJCb3R0b20gPSB0aGlzLl9zY3JvbGxCdWZmZXJCb3R0b20gPSBuZXcgTm9kZSgpO1xuICAgICAgICAgICAgYnVmZmVyQm90dG9tLnNldFN0eWxlQ2xhc3MoQ1NTLlNjcm9sbEJ1ZmZlcik7XG5cbiAgICAgICAgcm9vdC5hZGRDaGlsZChidWZmZXJCb3R0b20pO1xuICAgIH1cblxuICAgIHBhcmVudCA9IHRoaXMuX3BhcmVudDtcblxuICAgIHBhcmVudC5hZGRFdmVudExpc3RlbmVyKFBhbmVsRXZlbnQuUEFORUxfTU9WRV9CRUdJTiwgdGhpcywgJ29uUGFuZWxNb3ZlQmVnaW4nKTtcbiAgICBwYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihQYW5lbEV2ZW50LlBBTkVMX01PVkUsIHRoaXMsICdvblBhbmVsTW92ZScpO1xuICAgIHBhcmVudC5hZGRFdmVudExpc3RlbmVyKFBhbmVsRXZlbnQuUEFORUxfTU9WRV9FTkQsIHRoaXMsICdvblBhbmVsTW92ZUVuZCcpO1xuICAgIHBhcmVudC5hZGRFdmVudExpc3RlbmVyKFBhbmVsRXZlbnQuUEFORUxfSElERSwgdGhpcywgJ29uUGFuZWxIaWRlJyk7XG4gICAgcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoUGFuZWxFdmVudC5QQU5FTF9TSE9XLCB0aGlzLCAnb25QYW5lbFNob3cnKTtcbiAgICBwYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihQYW5lbEV2ZW50LlBBTkVMX1NDUk9MTF9XUkFQX0FEREVELCB0aGlzLCAnb25QYW5lbFNjcm9sbFdyYXBBZGRlZCcpO1xuICAgIHBhcmVudC5hZGRFdmVudExpc3RlbmVyKFBhbmVsRXZlbnQuUEFORUxfU0NST0xMX1dSQVBfUkVNT1ZFRCwgdGhpcywgJ29uUGFuZWxTY3JvbGxXcmFwUmVtb3ZlZCcpO1xuICAgIHBhcmVudC5hZGRFdmVudExpc3RlbmVyKFBhbmVsRXZlbnQuUEFORUxfU0laRV9DSEFOR0UsIHRoaXMsICdvblBhbmVsU2l6ZUNoYW5nZScpO1xuICAgIHBhcmVudC5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuV0lORE9XX1JFU0laRSwgdGhpcywgJ29uV2luZG93UmVzaXplJyk7XG5cbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSxwYXJlbnQsJ29uR3JvdXBMaXN0U2l6ZUNoYW5nZScpO1xufVxuR3JvdXAucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShBYnN0cmFjdEdyb3VwLnByb3RvdHlwZSk7XG5Hcm91cC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBHcm91cDtcblxuR3JvdXAucHJvdG90eXBlLm9uUGFuZWxNb3ZlQmVnaW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgUGFuZWxFdmVudC5QQU5FTF9NT1ZFX0JFR0lOLCBudWxsKSk7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUub25QYW5lbE1vdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgUGFuZWxFdmVudC5QQU5FTF9NT1ZFLCBudWxsKSk7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUub25QYW5lbE1vdmVFbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgUGFuZWxFdmVudC5QQU5FTF9NT1ZFX0VORCwgbnVsbCkpO1xufTtcblxuR3JvdXAucHJvdG90eXBlLm9uUGFuZWxTY3JvbGxXcmFwQWRkZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSwgbnVsbCkpO1xufTtcblxuR3JvdXAucHJvdG90eXBlLm9uUGFuZWxTY3JvbGxXcmFwUmVtb3ZlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBHcm91cEV2ZW50LkdST1VQX1NJWkVfQ0hBTkdFLCBudWxsKSk7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUub25QYW5lbEhpZGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgR3JvdXBFdmVudC5TVUJHUk9VUF9ESVNBQkxFLCBudWxsKSk7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUub25QYW5lbFNob3cgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgR3JvdXBFdmVudC5TVUJHUk9VUF9FTkFCTEUsIG51bGwpKTtcbn07XG5cbkdyb3VwLnByb3RvdHlwZS5vblBhbmVsU2l6ZUNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBHcm91cEV2ZW50LkdST1VQX1NJWkVfQ0hBTkdFLCBudWxsKSk7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUub25XaW5kb3dSZXNpemUgPSBmdW5jdGlvbiAoZSkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChlKTtcbn07XG5cbkdyb3VwLnByb3RvdHlwZS5vblN1Ykdyb3VwVHJpZ2dlciA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl91cGRhdGVIZWlnaHQoKTtcblxuICAgIGlmKCF0aGlzLmhhc01heEhlaWdodCgpKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgc2Nyb2xsQmFyID0gdGhpcy5fc2Nyb2xsQmFyLFxuICAgICAgICB3cmFwICA9IHRoaXMuX3dyYXBOb2RlO1xuICAgIHZhciBidWZmZXJUb3AgICAgPSB0aGlzLl9zY3JvbGxCdWZmZXJUb3AsXG4gICAgICAgIGJ1ZmZlckJvdHRvbSA9IHRoaXMuX3Njcm9sbEJ1ZmZlckJvdHRvbTtcblxuICAgIHNjcm9sbEJhci51cGRhdGUoKTtcblxuICAgIGlmICghc2Nyb2xsQmFyLmlzVmFsaWQoKSkge1xuICAgICAgICBzY3JvbGxCYXIuZGlzYWJsZSgpO1xuICAgICAgICB3cmFwLnNldEhlaWdodCh3cmFwLmdldENoaWxkQXQoMSkuZ2V0SGVpZ2h0KCkpO1xuICAgICAgICBpZiAoYnVmZmVyVG9wKXtcbiAgICAgICAgICAgIGJ1ZmZlclRvcC5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYnVmZmVyQm90dG9tKXtcbiAgICAgICAgICAgIGJ1ZmZlckJvdHRvbS5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgc2Nyb2xsQmFyLmVuYWJsZSgpO1xuICAgICAgICB3cmFwLnNldEhlaWdodCh0aGlzLmdldE1heEhlaWdodCgpKTtcblxuICAgICAgICBpZiAoYnVmZmVyVG9wKXtcbiAgICAgICAgICAgIGJ1ZmZlclRvcC5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ2Jsb2NrJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGJ1ZmZlckJvdHRvbSl7XG4gICAgICAgICAgICBidWZmZXJCb3R0b20uc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdibG9jaycpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSxudWxsKSk7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUuX29uSGVhZFRyaWdnZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fZW5hYmxlZCA9ICF0aGlzLl9lbmFibGVkO1xuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBHcm91cEV2ZW50LkdST1VQX0xJU1RfU0laRV9DSEFOR0UsIG51bGwpKTtcbn07XG5cbkdyb3VwLnByb3RvdHlwZS5hZGRDb21wb25lbnQgPSBmdW5jdGlvbigpe1xuICAgIHZhciBDbGFzc18gPSBhcmd1bWVudHNbMF07XG4gICAgdmFyIGFyZ3MgICA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgIGFyZ3Muc2hpZnQoKTtcbiAgICAgICAgYXJncy51bnNoaWZ0KHRoaXMuX2dldFN1Ykdyb3VwKCkpO1xuXG4gICAgdmFyIGluc3RhbmNlID0gT2JqZWN0LmNyZWF0ZShDbGFzc18ucHJvdG90eXBlKTtcbiAgICBDbGFzc18uYXBwbHkoaW5zdGFuY2UsYXJncyk7XG5cbiAgICB0aGlzLl9jb21wb25lbnRzLnB1c2goaW5zdGFuY2UpO1xuICAgIHRoaXMuX3VwZGF0ZUhlaWdodCgpO1xufTtcblxuR3JvdXAucHJvdG90eXBlLl91cGRhdGVIZWlnaHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fZ2V0U3ViR3JvdXAoKS51cGRhdGUoKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UsbnVsbCkpO1xuICAgIGlmKHRoaXMuaGFzTWF4SGVpZ2h0KCkpe1xuICAgICAgICB0aGlzLl9zY3JvbGxCYXIudXBkYXRlKCk7XG4gICAgfVxufTtcblxuR3JvdXAucHJvdG90eXBlLl91cGRhdGVBcHBlYXJhbmNlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB3cmFwID0gdGhpcy5fd3JhcE5vZGUsXG4gICAgICAgIGluZGljYXRvciA9IHRoaXMuX2luZGlOb2RlO1xuXG4gICAgdmFyIHNjcm9sbEJhciA9IHRoaXMuX3Njcm9sbEJhcjtcblxuICAgIHZhciBidWZmZXJUb3AgICAgPSB0aGlzLl9zY3JvbGxCdWZmZXJUb3AsXG4gICAgICAgIGJ1ZmZlckJvdHRvbSA9IHRoaXMuX3Njcm9sbEJ1ZmZlckJvdHRvbTtcblxuICAgIGlmICh0aGlzLmlzRGlzYWJsZWQoKSkge1xuICAgICAgICB3cmFwLnNldEhlaWdodCgwKTtcbiAgICAgICAgaWYgKGluZGljYXRvcil7XG4gICAgICAgICAgICBpbmRpY2F0b3Iuc2V0U3R5bGVDbGFzcyhDU1MuQXJyb3dCTWluKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzY3JvbGxCYXIpIHtcbiAgICAgICAgICAgIGlmIChidWZmZXJUb3Ape1xuICAgICAgICAgICAgICAgIGJ1ZmZlclRvcC5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChidWZmZXJCb3R0b20pe1xuICAgICAgICAgICAgICAgIGJ1ZmZlckJvdHRvbS5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuaGFzTWF4SGVpZ2h0KCkpIHtcbiAgICAgICAgdmFyIG1heEhlaWdodCA9IHRoaXMuZ2V0TWF4SGVpZ2h0KCksXG4gICAgICAgICAgICBsaXN0SGVpZ2h0ID0gd3JhcC5nZXRDaGlsZEF0KDEpLmdldEhlaWdodCgpO1xuXG4gICAgICAgIHdyYXAuc2V0SGVpZ2h0KGxpc3RIZWlnaHQgPCBtYXhIZWlnaHQgPyBsaXN0SGVpZ2h0IDogbWF4SGVpZ2h0KTtcblxuICAgICAgICBpZiAoc2Nyb2xsQmFyLmlzVmFsaWQoKSkge1xuICAgICAgICAgICAgaWYgKGJ1ZmZlclRvcCl7XG4gICAgICAgICAgICAgICAgYnVmZmVyVG9wLnNldFN0eWxlUHJvcGVydHkoJ2Rpc3BsYXknLCAnYmxvY2snKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChidWZmZXJCb3R0b20pe1xuICAgICAgICAgICAgICAgIGJ1ZmZlckJvdHRvbS5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ2Jsb2NrJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHdyYXAuZGVsZXRlU3R5bGVQcm9wZXJ0eSgnaGVpZ2h0Jyk7XG4gICAgfVxuICAgIGlmIChpbmRpY2F0b3Ipe1xuICAgICAgICBpbmRpY2F0b3Iuc2V0U3R5bGVDbGFzcyhDU1MuQXJyb3dCTWF4KTtcbiAgICB9XG59O1xuXG5Hcm91cC5wcm90b3R5cGUub25Hcm91cFNpemVVcGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xuICAgIGlmICh0aGlzLmhhc01heEhlaWdodCgpKXtcbiAgICAgICAgdGhpcy5fc2Nyb2xsQmFyLnVwZGF0ZSgpO1xuICAgIH1cbn07XG5cbkdyb3VwLnByb3RvdHlwZS5hZGRTdWJHcm91cCA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICB0aGlzLl9zdWJHcm91cHMucHVzaChuZXcgU3ViR3JvdXAodGhpcywgcGFyYW1zKSk7XG4gICAgdGhpcy5fdXBkYXRlSGVpZ2h0KCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUuX2dldFN1Ykdyb3VwID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzdWJHcm91cHMgPSB0aGlzLl9zdWJHcm91cHM7XG4gICAgaWYgKHN1Ykdyb3Vwcy5sZW5ndGggPT0gMCl7XG4gICAgICAgIHN1Ykdyb3Vwcy5wdXNoKG5ldyBTdWJHcm91cCh0aGlzKSk7XG4gICAgfVxuICAgIHJldHVybiBzdWJHcm91cHNbc3ViR3JvdXBzLmxlbmd0aCAtIDFdO1xufTtcblxuR3JvdXAucHJvdG90eXBlLmdldENvbXBvbmVudHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NvbXBvbmVudHM7XG59O1xuXG5mdW5jdGlvbiBpc0RhdGFDb21wKGNvbXApe1xuICAgIHJldHVybiAgKGNvbXAgaW5zdGFuY2VvZiBPYmplY3RDb21wb25lbnQpICYmXG4gICAgICAgICAgICEoY29tcCBpbnN0YW5jZW9mIFZhbHVlUGxvdHRlcikgJiZcbiAgICAgICAgICAgIShjb21wIGluc3RhbmNlb2YgRnVuY3Rpb25QbG90dGVyKTtcbn1cblxuXG5Hcm91cC5wcm90b3R5cGUuc2V0RGF0YSA9IGZ1bmN0aW9uKGRhdGEpe1xuICAgIHZhciBjb21wcyA9IHRoaXMuX2NvbXBvbmVudHMsIGNvbXAsIGRhdGFfO1xuICAgIHZhciBpID0gLTEsIGogPSAwLCBsID0gY29tcHMubGVuZ3RoO1xuICAgIHdoaWxlKCsraSA8IGwpe1xuICAgICAgICBjb21wID0gY29tcHNbaV07XG4gICAgICAgIGlmKCFpc0RhdGFDb21wKGNvbXApKXtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGRhdGFfID0gZGF0YVtqKytdO1xuICAgICAgICBjb21wLnNldFZhbHVlKGRhdGFfW09iamVjdC5rZXlzKGRhdGFfKVswXV0pO1xuICAgIH1cbn07XG5cbkdyb3VwLnByb3RvdHlwZS5nZXREYXRhID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgY29tcHMgPSB0aGlzLl9jb21wb25lbnRzLFxuICAgICAgICBpID0gLTEsIGwgPSBjb21wcy5sZW5ndGg7XG4gICAgdmFyIHZhbHVlcyA9IFtdO1xuICAgIHZhciBjb21wO1xuICAgIHdoaWxlKCsraSA8IGwpe1xuICAgICAgICBjb21wID0gY29tcHNbaV07XG4gICAgICAgIGlmKCFpc0RhdGFDb21wKGNvbXApKXtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHZhbHVlcy5wdXNoKGNvbXAuZ2V0RGF0YSgpKTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlcztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gR3JvdXA7XG4iLCJ2YXIgR3JvdXBFdmVudCA9IHtcblx0R1JPVVBfU0laRV9DSEFOR0UgICAgICAgIDogJ2dyb3VwU2l6ZUNoYW5nZScsXG5cdEdST1VQX0xJU1RfU0laRV9DSEFOR0UgICA6ICdncm91cExpc3RTaXplQ2hhbmdlJyxcblx0R1JPVVBfU0laRV9VUERBVEUgICAgICAgIDogJ2dyb3VwU2l6ZVVwZGF0ZScsXG5cdFNVQkdST1VQX1RSSUdHRVIgICAgICAgICA6ICdzdWJHcm91cFRyaWdnZXInLFxuXG5cdFNVQkdST1VQX0VOQUJMRSAgICAgICAgICA6ICdlbmFibGVTdWJHcm91cCcsXG5cdFNVQkdST1VQX0RJU0FCTEUgICAgICAgICA6ICdkaXNhYmxlU3ViR3JvdXAnXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEdyb3VwRXZlbnQ7IiwidmFyIE1lbnVFdmVudCA9IHtcblx0VVBEQVRFX01FTlU6ICd1cGRhdGVNZW51J1xufTtcbm1vZHVsZS5leHBvcnRzID0gTWVudUV2ZW50OyIsInZhciBOb2RlICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKSxcbiAgICBHcm91cCAgICAgPSByZXF1aXJlKCcuL0dyb3VwJyksXG4gICAgU2Nyb2xsQmFyID0gcmVxdWlyZSgnLi4vY29yZS9sYXlvdXQvU2Nyb2xsQmFyJyk7XG5cbnZhciBDU1MgICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcbnZhciBMYXlvdXRNb2RlID0gcmVxdWlyZSgnLi4vY29yZS9sYXlvdXQvTGF5b3V0TW9kZScpO1xudmFyIEhpc3RvcnkgICAgPSByZXF1aXJlKCcuLi9jb3JlL0hpc3RvcnknKTtcblxudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnREaXNwYXRjaGVyJyksXG4gICAgRXZlbnRfICAgICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIERvY3VtZW50RXZlbnQgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxuICAgIE5vZGVFdmVudCAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50JyksXG4gICAgUGFuZWxFdmVudCAgICAgID0gcmVxdWlyZSgnLi9QYW5lbEV2ZW50JyksXG4gICAgTWVudUV2ZW50ICAgICAgID0gcmVxdWlyZSgnLi9NZW51RXZlbnQnKTtcblxudmFyIE1vdXNlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Nb3VzZScpO1xuXG52YXIgU3RyaW5nSW5wdXQgICAgID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L1N0cmluZ0lucHV0JyksXG4gICAgTnVtYmVySW5wdXQgICAgID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L051bWJlcklucHV0JyksXG4gICAgUmFuZ2UgICAgICAgICAgID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L1JhbmdlJyksXG4gICAgQ2hlY2tib3ggICAgICAgID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L0NoZWNrYm94JyksXG4gICAgQ29sb3IgICAgICAgICAgID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L0NvbG9yJyksXG4gICAgQnV0dG9uICAgICAgICAgID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L0J1dHRvbicpLFxuICAgIFNlbGVjdCAgICAgICAgICA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9TZWxlY3QnKSxcbiAgICBTbGlkZXIgICAgICAgICAgPSByZXF1aXJlKCcuLi9jb21wb25lbnQvU2xpZGVyJyksXG4gICAgRnVuY3Rpb25QbG90dGVyID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L0Z1bmN0aW9uUGxvdHRlcicpLFxuICAgIFBhZCAgICAgICAgICAgICA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9QYWQnKSxcbiAgICBWYWx1ZVBsb3R0ZXIgICAgPSByZXF1aXJlKCcuLi9jb21wb25lbnQvVmFsdWVQbG90dGVyJyksXG4gICAgTnVtYmVyT3V0cHV0ICAgID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L051bWJlck91dHB1dCcpLFxuICAgIFN0cmluZ091dHB1dCAgICA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9TdHJpbmdPdXRwdXQnKSxcbiAgICBDYW52YXNfICAgICAgICAgPSByZXF1aXJlKCcuLi9jb21wb25lbnQvQ2FudmFzJyksXG4gICAgU1ZHXyAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L1NWRycpO1xuXG52YXIgREVGQVVMVF9QQU5FTF9QT1NJVElPTiA9IG51bGwsXG4gICAgREVGQVVMVF9QQU5FTF9XSURUSCAgICAgID0gMjAwLFxuICAgIERFRkFVTFRfUEFORUxfSEVJR0hUICAgICA9IG51bGwsXG4gICAgREVGQVVMVF9QQU5FTF9XSURUSF9NSU4gID0gMTAwLFxuICAgIERFRkFVTFRfUEFORUxfV0lEVEhfTUFYICA9IDYwMCxcbiAgICBERUZBVUxUX1BBTkVMX1JBVElPICAgICAgPSA0MCxcbiAgICBERUZBVUxUX1BBTkVMX0xBQkVMICAgICAgPSAnQ29udHJvbCBQYW5lbCcsXG4gICAgREVGQVVMVF9QQU5FTF9WQUxJR04gICAgID0gTGF5b3V0TW9kZS5UT1AsXG4gICAgREVGQVVMVF9QQU5FTF9BTElHTiAgICAgID0gTGF5b3V0TW9kZS5SSUdIVCxcbiAgICBERUZBVUxUX1BBTkVMX0RPQ0sgICAgICAgPSB7YWxpZ246TGF5b3V0TW9kZS5SSUdIVCxyZXNpemFibGU6dHJ1ZX0sXG4gICAgREVGQVVMVF9QQU5FTF9FTkFCTEUgICAgID0gdHJ1ZSxcbiAgICBERUZBVUxUX1BBTkVMX09QQUNJVFkgICAgPSAxLjAsXG4gICAgREVGQVVMVF9QQU5FTF9GSVhFRCAgICAgID0gdHJ1ZSxcbiAgICBERUZBVUxUX1BBTkVMX1ZDT05TVFJBSU4gPSB0cnVlO1xuXG5mdW5jdGlvbiBQYW5lbChjb250cm9sS2l0LHBhcmFtcyl7XG4gICAgRXZlbnREaXNwYXRjaGVyLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcbiAgICB0aGlzLl9wYXJlbnQgPSBjb250cm9sS2l0O1xuXG5cbiAgICBwYXJhbXMgICAgICAgICAgICA9IHBhcmFtcyAgICAgICAgICAgfHwge307XG4gICAgcGFyYW1zLnZhbGlnbiAgICAgPSBwYXJhbXMudmFsaWduICAgIHx8IERFRkFVTFRfUEFORUxfVkFMSUdOO1xuICAgIHBhcmFtcy5hbGlnbiAgICAgID0gcGFyYW1zLmFsaWduICAgICB8fCBERUZBVUxUX1BBTkVMX0FMSUdOO1xuICAgIHBhcmFtcy5wb3NpdGlvbiAgID0gcGFyYW1zLnBvc2l0aW9uICB8fCBERUZBVUxUX1BBTkVMX1BPU0lUSU9OO1xuICAgIHBhcmFtcy53aWR0aCAgICAgID0gcGFyYW1zLndpZHRoICAgICB8fCBERUZBVUxUX1BBTkVMX1dJRFRIO1xuICAgIHBhcmFtcy5oZWlnaHQgICAgID0gcGFyYW1zLmhlaWdodCAgICB8fCBERUZBVUxUX1BBTkVMX0hFSUdIVDtcbiAgICBwYXJhbXMucmF0aW8gICAgICA9IHBhcmFtcy5yYXRpbyAgICAgfHwgREVGQVVMVF9QQU5FTF9SQVRJTztcbiAgICBwYXJhbXMubGFiZWwgICAgICA9IHBhcmFtcy5sYWJlbCAgICAgfHwgREVGQVVMVF9QQU5FTF9MQUJFTDtcbiAgICBwYXJhbXMub3BhY2l0eSAgICA9IHBhcmFtcy5vcGFjaXR5ICAgfHwgREVGQVVMVF9QQU5FTF9PUEFDSVRZO1xuICAgIHBhcmFtcy5maXhlZCAgICAgID0gcGFyYW1zLmZpeGVkICAgICAgPT09IHVuZGVmaW5lZCA/IERFRkFVTFRfUEFORUxfRklYRUQgICAgICA6IHBhcmFtcy5maXhlZDtcbiAgICBwYXJhbXMuZW5hYmxlICAgICA9IHBhcmFtcy5lbmFibGUgICAgID09PSB1bmRlZmluZWQgPyBERUZBVUxUX1BBTkVMX0VOQUJMRSAgICAgOiBwYXJhbXMuZW5hYmxlO1xuICAgIHBhcmFtcy52Y29uc3RyYWluID0gcGFyYW1zLnZjb25zdHJhaW4gPT09IHVuZGVmaW5lZCA/IERFRkFVTFRfUEFORUxfVkNPTlNUUkFJTiA6IHBhcmFtcy52Y29uc3RyYWluO1xuXG4gICAgaWYgKHBhcmFtcy5kb2NrKSB7XG4gICAgICAgIHBhcmFtcy5kb2NrLmFsaWduID0gcGFyYW1zLmRvY2suYWxpZ24gfHwgREVGQVVMVF9QQU5FTF9ET0NLLmFsaWduO1xuICAgICAgICBwYXJhbXMuZG9jay5yZXNpemFibGUgPSBwYXJhbXMuZG9jay5yZXNpemFibGUgfHwgREVGQVVMVF9QQU5FTF9ET0NLLnJlc2l6YWJsZTtcbiAgICB9XG5cbiAgICB0aGlzLl93aWR0aCAgICAgID0gTWF0aC5tYXgoREVGQVVMVF9QQU5FTF9XSURUSF9NSU4sXG4gICAgICAgICAgICAgICAgICAgICAgIE1hdGgubWluKHBhcmFtcy53aWR0aCxERUZBVUxUX1BBTkVMX1dJRFRIX01BWCkpO1xuICAgIHRoaXMuX2hlaWdodCAgICAgPSBwYXJhbXMuaGVpZ2h0ID8gIE1hdGgubWF4KDAsTWF0aC5taW4ocGFyYW1zLmhlaWdodCx3aW5kb3cuaW5uZXJIZWlnaHQpKSA6IG51bGw7XG4gICAgdGhpcy5fZml4ZWQgICAgICA9IHBhcmFtcy5maXhlZDtcbiAgICB0aGlzLl9kb2NrICAgICAgID0gcGFyYW1zLmRvY2s7XG4gICAgdGhpcy5fcG9zaXRpb24gICA9IHBhcmFtcy5wb3NpdGlvbjtcbiAgICB0aGlzLl92Q29uc3RyYWluID0gcGFyYW1zLnZjb25zdHJhaW47XG4gICAgdGhpcy5fbGFiZWwgICAgICA9IHBhcmFtcy5sYWJlbDtcbiAgICB0aGlzLl9lbmFibGVkICAgID0gcGFyYW1zLmVuYWJsZTtcbiAgICB0aGlzLl9ncm91cHMgICAgID0gW107XG5cblxuICAgIHZhciB3aWR0aCAgICA9IHRoaXMuX3dpZHRoLFxuICAgICAgICBpc0ZpeGVkICA9IHRoaXMuX2ZpeGVkLFxuICAgICAgICBkb2NrICAgICA9IHRoaXMuX2RvY2ssXG4gICAgICAgIHBvc2l0aW9uID0gdGhpcy5fcG9zaXRpb24sXG4gICAgICAgIGxhYmVsICAgID0gdGhpcy5fbGFiZWwsXG4gICAgICAgIGFsaWduICAgID0gcGFyYW1zLmFsaWduLFxuICAgICAgICBvcGFjaXR5ICA9IHBhcmFtcy5vcGFjaXR5O1xuXG5cbiAgICB2YXIgcm9vdCA9IHRoaXMuX25vZGUgICAgID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QYW5lbCksXG4gICAgICAgIGhlYWQgPSB0aGlzLl9oZWFkTm9kZSA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuSGVhZCksXG4gICAgICAgIG1lbnUgICAgICA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuTWVudSksXG4gICAgICAgIGxhYmVsV3JhcCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCksXG4gICAgICAgIGxhYmVsXyAgICA9IG5ldyBOb2RlKE5vZGUuU1BBTikuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpLFxuICAgICAgICB3cmFwID0gdGhpcy5fd3JhcE5vZGUgPSBuZXcgTm9kZShOb2RlLkRJVikuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCksXG4gICAgICAgIGxpc3QgPSB0aGlzLl9saXN0Tm9kZSA9IG5ldyBOb2RlKE5vZGUuTElTVCkuc2V0U3R5bGVDbGFzcyhDU1MuR3JvdXBMaXN0KTtcblxuICAgIHJvb3Quc2V0V2lkdGgod2lkdGgpO1xuICAgIGxhYmVsXy5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywgbGFiZWwpO1xuXG4gICAgbGFiZWxXcmFwLmFkZENoaWxkKGxhYmVsXyk7XG4gICAgaGVhZC5hZGRDaGlsZChtZW51KTtcbiAgICBoZWFkLmFkZENoaWxkKGxhYmVsV3JhcCk7XG4gICAgd3JhcC5hZGRDaGlsZChsaXN0KTtcbiAgICByb290LmFkZENoaWxkKGhlYWQpO1xuICAgIHJvb3QuYWRkQ2hpbGQod3JhcCk7XG5cbiAgICBjb250cm9sS2l0LmdldE5vZGUoKS5hZGRDaGlsZChyb290KTtcblxuXG4gICAgaWYgKCFkb2NrKSB7XG4gICAgICAgIHZhciBtZW51SGlkZSA9IHRoaXMuX21lbnVIaWRlID0gbmV3IE5vZGUoTm9kZS5JTlBVVF9CVVRUT04pO1xuICAgICAgICAgICAgbWVudUhpZGUuc2V0U3R5bGVDbGFzcyhDU1MuQnV0dG9uTWVudUhpZGUpO1xuICAgICAgICAgICAgbWVudUhpZGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25NZW51SGlkZU1vdXNlRG93bi5iaW5kKHRoaXMpKTtcblxuICAgICAgICBtZW51LmFkZENoaWxkKG1lbnVIaWRlKTtcblxuICAgICAgICBpZiAodGhpcy5fcGFyZW50LnBhbmVsc0FyZUNsb3NhYmxlKCkpIHtcbiAgICAgICAgICAgIHZhciBtZW51Q2xvc2UgPSBuZXcgTm9kZShOb2RlLklOUFVUX0JVVFRPTik7XG4gICAgICAgICAgICBtZW51Q2xvc2Uuc2V0U3R5bGVDbGFzcyhDU1MuQnV0dG9uTWVudUNsb3NlKTtcbiAgICAgICAgICAgIG1lbnVDbG9zZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLCB0aGlzLmRpc2FibGUuYmluZCh0aGlzKSk7XG5cbiAgICAgICAgICAgIG1lbnUuYWRkQ2hpbGQobWVudUNsb3NlKTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgaWYgKHRoaXMuaGFzTWF4SGVpZ2h0KCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2FkZFNjcm9sbFdyYXAoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghaXNGaXhlZCkge1xuICAgICAgICAgICAgaWYgKHBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgaWYgKGFsaWduID09IExheW91dE1vZGUuTEVGVCB8fFxuICAgICAgICAgICAgICAgICAgICBhbGlnbiA9PSBMYXlvdXRNb2RlLlRPUCB8fFxuICAgICAgICAgICAgICAgICAgICBhbGlnbiA9PSBMYXlvdXRNb2RlLkJPVFRPTSkge1xuICAgICAgICAgICAgICAgICAgICByb290LnNldFBvc2l0aW9uR2xvYmFsKHBvc2l0aW9uWzBdLCBwb3NpdGlvblsxXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByb290LnNldFBvc2l0aW9uR2xvYmFsKHdpbmRvdy5pbm5lcldpZHRoIC0gd2lkdGggLSBwb3NpdGlvblswXSwgcG9zaXRpb25bMV0pO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9wb3NpdGlvbiA9IHJvb3QuZ2V0UG9zaXRpb24oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHRoaXMuX3Bvc2l0aW9uID0gcm9vdC5nZXRQb3NpdGlvbigpO1xuXG4gICAgICAgICAgICB0aGlzLl9tb3VzZU9mZnNldCA9IFswLCAwXTtcblxuICAgICAgICAgICAgcm9vdC5zZXRTdHlsZVByb3BlcnR5KCdwb3NpdGlvbicsICdhYnNvbHV0ZScpO1xuICAgICAgICAgICAgaGVhZC5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLCB0aGlzLl9vbkhlYWREcmFnU3RhcnQuYmluZCh0aGlzKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpZiAocG9zaXRpb24pIHtcbiAgICAgICAgICAgICAgICB2YXIgcG9zaXRpb25YID0gcG9zaXRpb25bMF0sXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uWSA9IHBvc2l0aW9uWzFdO1xuXG4gICAgICAgICAgICAgICAgaWYgKHBvc2l0aW9uWSAhPSAwKXJvb3Quc2V0UG9zaXRpb25ZKHBvc2l0aW9uWSk7XG4gICAgICAgICAgICAgICAgaWYgKHBvc2l0aW9uWCAhPSAwKWlmIChhbGlnbiA9PSBMYXlvdXRNb2RlLlJJR0hUKXJvb3QuZ2V0RWxlbWVudCgpLm1hcmdpblJpZ2h0ID0gcG9zaXRpb25YO1xuICAgICAgICAgICAgICAgIGVsc2Ugcm9vdC5zZXRQb3NpdGlvblgocG9zaXRpb25YKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcm9vdC5zZXRTdHlsZVByb3BlcnR5KCdmbG9hdCcsIGFsaWduKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdmFyIGRvY2tBbGlnbm1lbnQgPSBkb2NrLmFsaWduO1xuXG4gICAgICAgIGlmIChkb2NrQWxpZ25tZW50ID09IExheW91dE1vZGUuTEVGVCB8fFxuICAgICAgICAgICAgZG9ja0FsaWdubWVudCA9PSBMYXlvdXRNb2RlLlJJR0hUKSB7XG4gICAgICAgICAgICBhbGlnbiA9IGRvY2tBbGlnbm1lbnQ7XG4gICAgICAgICAgICB0aGlzLl9oZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZG9ja0FsaWdubWVudCA9PSBMYXlvdXRNb2RlLlRPUCB8fFxuICAgICAgICAgICAgZG9ja0FsaWdubWVudCA9PSBMYXlvdXRNb2RlLkJPVFRPTSkge1xuXG4gICAgICAgIH1cblxuICAgICAgICAvKlxuICAgICAgICAgaWYoZG9jay5yZXNpemFibGUpXG4gICAgICAgICB7XG4gICAgICAgICB2YXIgc2l6ZUhhbmRsZSA9IG5ldyBDb250cm9sS2l0Lk5vZGUoQ29udHJvbEtpdC5Ob2RlVHlwZS5ESVYpO1xuICAgICAgICAgc2l6ZUhhbmRsZS5zZXRTdHlsZUNsYXNzKENvbnRyb2xLaXQuQ1NTLlNpemVIYW5kbGUpO1xuICAgICAgICAgcm9vdE5vZGUuYWRkQ2hpbGQoc2l6ZUhhbmRsZSk7XG4gICAgICAgICB9XG4gICAgICAgICAqL1xuXG4gICAgICAgIHJvb3Quc2V0U3R5bGVQcm9wZXJ0eSgnZmxvYXQnLCBhbGlnbik7XG4gICAgfVxuXG4gICAgdmFyIHBhcmVudCA9IHRoaXMuX3BhcmVudDtcbiAgICB2YXIgaGlzdG9yeUlzRW5hYmxlZCA9IHBhcmVudC5oaXN0b3J5SXNFbmFibGVkKCksXG4gICAgICAgIHN0YXRlc0FyZUVuYWJsZWQgPSBwYXJlbnQuc3RhdGVzQXJlRW5hYmxlZCgpO1xuXG4gICAgaWYoaGlzdG9yeUlzRW5hYmxlZCB8fCBzdGF0ZXNBcmVFbmFibGVkKXtcbiAgICAgICAgbWVudS5hZGRDaGlsZEF0KG5ldyBOb2RlKCksMCkuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCk7Ly8uc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsJ25vbmUnKTtcbiAgICB9XG5cbiAgICBpZiAoaGlzdG9yeUlzRW5hYmxlZCkge1xuICAgICAgICB0aGlzLl9tZW51VW5kbyA9IG1lbnUuZ2V0Q2hpbGRBdCgwKVxuICAgICAgICAgICAgLmFkZENoaWxkKG5ldyBOb2RlKE5vZGUuSU5QVVRfQlVUVE9OKSlcbiAgICAgICAgICAgICAgICAuc2V0U3R5bGVDbGFzcyhDU1MuQnV0dG9uTWVudVVuZG8pXG4gICAgICAgICAgICAgICAgLnNldFByb3BlcnR5KCd2YWx1ZScsSGlzdG9yeS5nZXQoKS5nZXROdW1TdGF0ZXMoKSlcbiAgICAgICAgICAgICAgICAuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTixmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICBIaXN0b3J5LmdldCgpLnBvcFN0YXRlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIHBhcmVudC5hZGRFdmVudExpc3RlbmVyKE1lbnVFdmVudC5VUERBVEVfTUVOVSx0aGlzLCAnb25VcGRhdGVNZW51Jyk7XG4gICAgfVxuICAgIGlmKHN0YXRlc0FyZUVuYWJsZWQpe1xuICAgICAgICBtZW51LmdldENoaWxkQXQoMClcbiAgICAgICAgICAgIC5hZGRDaGlsZChuZXcgTm9kZShOb2RlLklOUFVUX0JVVFRPTikpXG4gICAgICAgICAgICAgICAgLnNldFN0eWxlQ2xhc3MoQ1NTLkJ1dHRvbk1lbnVMb2FkKVxuICAgICAgICAgICAgICAgIC5zZXRQcm9wZXJ0eSgndmFsdWUnLCdMb2FkJylcbiAgICAgICAgICAgICAgICAuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTixmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICBjb250cm9sS2l0Ll9sb2FkU3RhdGUoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgbWVudS5nZXRDaGlsZEF0KDApXG4gICAgICAgICAgICAuYWRkQ2hpbGQobmV3IE5vZGUoTm9kZS5JTlBVVF9CVVRUT04pKVxuICAgICAgICAgICAgICAgIC5zZXRTdHlsZUNsYXNzKENTUy5CdXR0b25NZW51U2F2ZSlcbiAgICAgICAgICAgICAgICAuc2V0UHJvcGVydHkoJ3ZhbHVlJywnU2F2ZScpXG4gICAgICAgICAgICAgICAgLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgY29udHJvbEtpdC5fc2F2ZVN0YXRlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgfVxuICAgIGlmKGhpc3RvcnlJc0VuYWJsZWQgfHwgc3RhdGVzQXJlRW5hYmxlZCl7XG4gICAgICAgIGhlYWQuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfT1ZFUixmdW5jdGlvbigpe1xuICAgICAgICAgICAgbWVudS5zZXRTdHlsZUNsYXNzKENTUy5NZW51QWN0aXZlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGhlYWQuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfT1VULGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBtZW51LnNldFN0eWxlQ2xhc3MoQ1NTLk1lbnUpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgaWYgKG9wYWNpdHkgIT0gMS4wICYmIG9wYWNpdHkgIT0gMC4wKSB7XG4gICAgICAgIHJvb3Quc2V0U3R5bGVQcm9wZXJ0eSgnb3BhY2l0eScsIG9wYWNpdHkpO1xuICAgIH1cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50LldJTkRPV19SRVNJWkUsdGhpcy5fb25XaW5kb3dSZXNpemUuYmluZCh0aGlzKSk7XG59XG5QYW5lbC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUpO1xuUGFuZWwucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gUGFuZWw7XG5cblBhbmVsLnByb3RvdHlwZS5fb25NZW51SGlkZU1vdXNlRG93biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9lbmFibGVkID0gIXRoaXMuX2VuYWJsZWQ7XG4gICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xufTtcblxuUGFuZWwucHJvdG90eXBlLm9uVXBkYXRlTWVudSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9tZW51VW5kby5zZXRQcm9wZXJ0eSgndmFsdWUnLCBIaXN0b3J5LmdldCgpLmdldE51bVN0YXRlcygpKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5fb25NZW51VW5kb1RyaWdnZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgSGlzdG9yeS5nZXQoKS5wb3BTdGF0ZSgpO1xufTtcblxuXG5QYW5lbC5wcm90b3R5cGUuX3VwZGF0ZUFwcGVhcmFuY2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHJvb3ROb2RlID0gdGhpcy5fbm9kZSxcbiAgICAgICAgaGVhZE5vZGUgPSB0aGlzLl9oZWFkTm9kZSxcbiAgICAgICAgbWVudUhpZGUgPSB0aGlzLl9tZW51SGlkZTtcblxuICAgIGlmICghdGhpcy5fZW5hYmxlZCkge1xuICAgICAgICBoZWFkTm9kZS5nZXRTdHlsZSgpLmJvcmRlckJvdHRvbSA9ICdub25lJztcbiAgICAgICAgcm9vdE5vZGUuc2V0SGVpZ2h0KGhlYWROb2RlLmdldEhlaWdodCgpKTtcbiAgICAgICAgbWVudUhpZGUuc2V0U3R5bGVDbGFzcyhDU1MuQnV0dG9uTWVudVNob3cpO1xuICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX0hJREUsIG51bGwpKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHJvb3ROb2RlLnNldEhlaWdodChoZWFkTm9kZS5nZXRIZWlnaHQoKSArIHRoaXMuX3dyYXBOb2RlLmdldEhlaWdodCgpKTtcbiAgICAgICAgcm9vdE5vZGUuZGVsZXRlU3R5bGVQcm9wZXJ0eSgnaGVpZ2h0Jyk7XG4gICAgICAgIG1lbnVIaWRlLnNldFN0eWxlQ2xhc3MoQ1NTLkJ1dHRvbk1lbnVIaWRlKTtcbiAgICAgICAgaGVhZE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuSGVhZCk7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIFBhbmVsRXZlbnQuUEFORUxfU0hPVywgbnVsbCkpO1xuICAgIH1cbn07XG5cblBhbmVsLnByb3RvdHlwZS5fb25IZWFkRHJhZ1N0YXJ0ID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgcGFyZW50Tm9kZSA9IHRoaXMuX3BhcmVudC5nZXROb2RlKCksXG4gICAgICAgIG5vZGUgICAgICAgPSB0aGlzLl9ub2RlO1xuXG4gICAgdmFyIG5vZGVQb3MgICA9IG5vZGUuZ2V0UG9zaXRpb25HbG9iYWwoKSxcbiAgICAgICAgbW91c2VQb3MgID0gTW91c2UuZ2V0KCkuZ2V0UG9zaXRpb24oKSxcbiAgICAgICAgb2Zmc2V0UG9zID0gdGhpcy5fbW91c2VPZmZzZXQ7XG5cbiAgICAgICAgb2Zmc2V0UG9zWzBdID0gbW91c2VQb3NbMF0gLSBub2RlUG9zWzBdO1xuICAgICAgICBvZmZzZXRQb3NbMV0gPSBtb3VzZVBvc1sxXSAtIG5vZGVQb3NbMV07XG5cbiAgICB2YXIgZXZlbnRNb3VzZU1vdmUgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsXG4gICAgICAgIGV2ZW50TW91c2VVcCAgID0gRG9jdW1lbnRFdmVudC5NT1VTRV9VUDtcblxuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHZhciBvbkRyYWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLl91cGRhdGVQb3NpdGlvbigpO1xuICAgICAgICB9LFxuICAgICAgICBvbkRyYWdFbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW91c2VNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcbiAgICAgICAgICAgIHNlbGYuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIFBhbmVsRXZlbnQuUEFORUxfTU9WRV9FTkQsIG51bGwpKTtcbiAgICAgICAgfTtcblxuICAgIHBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobm9kZSk7XG4gICAgcGFyZW50Tm9kZS5hZGRDaGlsZCggICBub2RlKTtcblxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZU1vdmUsIG9uRHJhZywgICAgZmFsc2UpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCAgIG9uRHJhZ0VuZCwgZmFsc2UpO1xuXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcyxQYW5lbEV2ZW50LlBBTkVMX01PVkVfQkVHSU4sbnVsbCkpO1xufTtcblxuUGFuZWwucHJvdG90eXBlLl91cGRhdGVQb3NpdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgbW91c2VQb3MgPSBNb3VzZS5nZXQoKS5nZXRQb3NpdGlvbigpLFxuICAgICAgICBvZmZzZXRQb3MgPSB0aGlzLl9tb3VzZU9mZnNldDtcblxuICAgIHZhciBwb3NpdGlvbiA9IHRoaXMuX3Bvc2l0aW9uO1xuICAgIHBvc2l0aW9uWzBdID0gbW91c2VQb3NbMF0gLSBvZmZzZXRQb3NbMF07XG4gICAgcG9zaXRpb25bMV0gPSBtb3VzZVBvc1sxXSAtIG9mZnNldFBvc1sxXTtcblxuICAgIHRoaXMuX2NvbnN0cmFpbkhlaWdodCgpO1xuICAgIHRoaXMuX2NvbnN0cmFpblBvc2l0aW9uKCk7XG5cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX01PVkUsIG51bGwpKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5fb25XaW5kb3dSZXNpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuaXNEb2NrZWQoKSkge1xuICAgICAgICB2YXIgZG9jayA9IHRoaXMuX2RvY2s7XG5cbiAgICAgICAgaWYgKGRvY2suYWxpZ24gPT0gTGF5b3V0TW9kZS5SSUdIVCB8fFxuICAgICAgICAgICAgZG9jay5hbGlnbiA9PSBMYXlvdXRNb2RlLkxFRlQpIHtcbiAgICAgICAgICAgIHZhciB3aW5kb3dIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQsXG4gICAgICAgICAgICAgICAgbGlzdEhlaWdodCA9IHRoaXMuX2xpc3ROb2RlLmdldEhlaWdodCgpLFxuICAgICAgICAgICAgICAgIGhlYWRIZWlnaHQgPSB0aGlzLl9oZWFkTm9kZS5nZXRIZWlnaHQoKTtcblxuICAgICAgICAgICAgdGhpcy5faGVpZ2h0ID0gd2luZG93SGVpZ2h0O1xuXG4gICAgICAgICAgICBpZiAoKHdpbmRvd0hlaWdodCAtIGhlYWRIZWlnaHQpID4gbGlzdEhlaWdodCl7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2Nyb2xsQmFyLmRpc2FibGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2Nyb2xsQmFyLmVuYWJsZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX1NJWkVfQ0hBTkdFKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGlmICghdGhpcy5pc0ZpeGVkKCkpe1xuICAgICAgICAgICAgdGhpcy5fY29uc3RyYWluUG9zaXRpb24oKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB0aGlzLl9jb25zdHJhaW5IZWlnaHQoKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBEb2N1bWVudEV2ZW50LldJTkRPV19SRVNJWkUpKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5fY29uc3RyYWluUG9zaXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG5vZGUgPSB0aGlzLl9ub2RlO1xuXG4gICAgdmFyIG1heFggPSB3aW5kb3cuaW5uZXJXaWR0aCAtIG5vZGUuZ2V0V2lkdGgoKSxcbiAgICAgICAgbWF4WSA9IHdpbmRvdy5pbm5lckhlaWdodCAtIG5vZGUuZ2V0SGVpZ2h0KCk7XG5cbiAgICB2YXIgcG9zaXRpb24gPSB0aGlzLl9wb3NpdGlvbjtcbiAgICBwb3NpdGlvblswXSA9IE1hdGgubWF4KDAsIE1hdGgubWluKHBvc2l0aW9uWzBdLCBtYXhYKSk7XG4gICAgcG9zaXRpb25bMV0gPSBNYXRoLm1heCgwLCBNYXRoLm1pbihwb3NpdGlvblsxXSwgbWF4WSkpO1xuXG4gICAgbm9kZS5zZXRQb3NpdGlvbkdsb2JhbChwb3NpdGlvblswXSwgcG9zaXRpb25bMV0pO1xufTtcblxuUGFuZWwucHJvdG90eXBlLl9jb25zdHJhaW5IZWlnaHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLl92Q29uc3RyYWluKXJldHVybjtcblxuICAgIHZhciBoYXNNYXhIZWlnaHQgPSB0aGlzLmhhc01heEhlaWdodCgpLFxuICAgICAgICBoYXNTY3JvbGxXcmFwID0gdGhpcy5oYXNTY3JvbGxXcmFwKCk7XG5cbiAgICB2YXIgaGVhZCA9IHRoaXMuX2hlYWROb2RlLFxuICAgICAgICB3cmFwID0gdGhpcy5fd3JhcE5vZGU7XG5cbiAgICB2YXIgc2Nyb2xsQmFyID0gdGhpcy5fc2Nyb2xsQmFyO1xuXG4gICAgdmFyIHBhbmVsVG9wID0gdGhpcy5pc0RvY2tlZCgpID8gMCA6XG4gICAgICAgIHRoaXMuaXNGaXhlZCgpID8gMCA6XG4gICAgICAgICAgICB0aGlzLl9wb3NpdGlvblsxXTtcblxuICAgIHZhciBwYW5lbEhlaWdodCA9IGhhc01heEhlaWdodCA/IHRoaXMuZ2V0TWF4SGVpZ2h0KCkgOlxuICAgICAgICBoYXNTY3JvbGxXcmFwID8gc2Nyb2xsQmFyLmdldFRhcmdldE5vZGUoKS5nZXRIZWlnaHQoKSA6XG4gICAgICAgICAgICB3cmFwLmdldEhlaWdodCgpO1xuXG4gICAgdmFyIHBhbmVsQm90dG9tID0gcGFuZWxUb3AgKyBwYW5lbEhlaWdodDtcbiAgICB2YXIgaGVhZEhlaWdodCA9IGhlYWQuZ2V0SGVpZ2h0KCk7XG5cbiAgICB2YXIgd2luZG93SGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0LFxuICAgICAgICBoZWlnaHREaWZmID0gd2luZG93SGVpZ2h0IC0gcGFuZWxCb3R0b20gLSBoZWFkSGVpZ2h0LFxuICAgICAgICBoZWlnaHRTdW07XG5cbiAgICBpZiAoaGVpZ2h0RGlmZiA8IDAuMCkge1xuICAgICAgICBoZWlnaHRTdW0gPSBwYW5lbEhlaWdodCArIGhlaWdodERpZmY7XG5cbiAgICAgICAgaWYgKCFoYXNTY3JvbGxXcmFwKSB7XG4gICAgICAgICAgICB0aGlzLl9hZGRTY3JvbGxXcmFwKGhlaWdodFN1bSk7XG4gICAgICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX1NDUk9MTF9XUkFQX0FEREVELCBudWxsKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBzY3JvbGxCYXIuc2V0V3JhcEhlaWdodChoZWlnaHRTdW0pO1xuICAgICAgICB3cmFwLnNldEhlaWdodChoZWlnaHRTdW0pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgaWYgKCFoYXNNYXhIZWlnaHQgJiYgaGFzU2Nyb2xsV3JhcCkge1xuICAgICAgICAgICAgc2Nyb2xsQmFyLnJlbW92ZUZyb21QYXJlbnQoKTtcbiAgICAgICAgICAgIHdyYXAuYWRkQ2hpbGQodGhpcy5fbGlzdE5vZGUpO1xuICAgICAgICAgICAgd3JhcC5kZWxldGVTdHlsZVByb3BlcnR5KCdoZWlnaHQnKTtcbiAgICAgICAgICAgIHRoaXMuX3Njcm9sbEJhci5yZW1vdmVNb3VzZUxpc3RlbmVyKCk7XG4gICAgICAgICAgICB0aGlzLl9zY3JvbGxCYXIgPSBudWxsO1xuXG4gICAgICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX1NDUk9MTF9XUkFQX1JFTU9WRUQsIG51bGwpKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblBhbmVsLnByb3RvdHlwZS5vbkdyb3VwTGlzdFNpemVDaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuaGFzU2Nyb2xsV3JhcCgpKXtcbiAgICAgICAgdGhpcy5fdXBkYXRlU2Nyb2xsV3JhcCgpO1xuICAgIH1cbiAgICB0aGlzLl9jb25zdHJhaW5IZWlnaHQoKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5fdXBkYXRlU2Nyb2xsV3JhcCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgd3JhcCAgID0gdGhpcy5fd3JhcE5vZGUsXG4gICAgICAgIHNjcm9sbEJhciAgPSB0aGlzLl9zY3JvbGxCYXIsXG4gICAgICAgIGhlaWdodCAgICAgPSB0aGlzLmhhc01heEhlaWdodCgpID8gdGhpcy5nZXRNYXhIZWlnaHQoKSA6IDEwMCxcbiAgICAgICAgbGlzdEhlaWdodCA9IHRoaXMuX2xpc3ROb2RlLmdldEhlaWdodCgpO1xuXG4gICAgd3JhcC5zZXRIZWlnaHQobGlzdEhlaWdodCA8IGhlaWdodCA/IGxpc3RIZWlnaHQgOiBoZWlnaHQpO1xuXG4gICAgc2Nyb2xsQmFyLnVwZGF0ZSgpO1xuXG4gICAgaWYgKCFzY3JvbGxCYXIuaXNWYWxpZCgpKSB7XG4gICAgICAgIHNjcm9sbEJhci5kaXNhYmxlKCk7XG4gICAgICAgIHdyYXAuc2V0SGVpZ2h0KHdyYXAuZ2V0Q2hpbGRBdCgxKS5nZXRIZWlnaHQoKSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBzY3JvbGxCYXIuZW5hYmxlKCk7XG4gICAgICAgIHdyYXAuc2V0SGVpZ2h0KGhlaWdodCk7XG4gICAgfVxufTtcblxuUGFuZWwucHJvdG90eXBlLl9hZGRTY3JvbGxXcmFwID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB3cmFwTm9kZSA9IHRoaXMuX3dyYXBOb2RlLFxuICAgICAgICBsaXN0Tm9kZSA9IHRoaXMuX2xpc3ROb2RlLFxuICAgICAgICBoZWlnaHQgPSBhcmd1bWVudHMubGVuZ3RoID09IDAgP1xuICAgICAgICAgICAgdGhpcy5nZXRNYXhIZWlnaHQoKSA6XG4gICAgICAgICAgICBhcmd1bWVudHNbMF07XG5cbiAgICB0aGlzLl9zY3JvbGxCYXIgPSBuZXcgU2Nyb2xsQmFyKHdyYXBOb2RlLCBsaXN0Tm9kZSwgaGVpZ2h0KTtcbiAgICBpZiAodGhpcy5pc0VuYWJsZWQoKSl7XG4gICAgICAgIHdyYXBOb2RlLnNldEhlaWdodChoZWlnaHQpO1xuICAgIH1cbn07XG5cblBhbmVsLnByb3RvdHlwZS5oYXNTY3JvbGxXcmFwID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9zY3JvbGxCYXIgIT0gbnVsbDtcbn07XG5cblxuUGFuZWwucHJvdG90eXBlLnByZXZlbnRTZWxlY3REcmFnID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5oYXNTY3JvbGxXcmFwKCkpe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX3dyYXBOb2RlLmdldEVsZW1lbnQoKS5zY3JvbGxUb3AgPSAwO1xufTtcblxuUGFuZWwucHJvdG90eXBlLmVuYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9ub2RlLnNldFN0eWxlUHJvcGVydHkoJ2Rpc3BsYXknLCAnYmxvY2snKTtcbiAgICB0aGlzLl9lbmFibGVkID0gdHJ1ZTtcbiAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XG59O1xuXG5cblBhbmVsLnByb3RvdHlwZS5kaXNhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX25vZGUuc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdub25lJyk7XG4gICAgdGhpcy5fZW5hYmxlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5pc0VuYWJsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2VuYWJsZWQ7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuaXNEaXNhYmxlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gIXRoaXMuX2VuYWJsZWQ7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuaGFzTWF4SGVpZ2h0ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9oZWlnaHQgIT0gbnVsbDtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5nZXRNYXhIZWlnaHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2hlaWdodDtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5pc0RvY2tlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fZG9jaztcbn07XG5cblBhbmVsLnByb3RvdHlwZS5pc0ZpeGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9maXhlZDtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5nZXRHcm91cHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2dyb3Vwcztcbn07XG5cblBhbmVsLnByb3RvdHlwZS5nZXROb2RlID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9ub2RlO1xufTtcblxuUGFuZWwucHJvdG90eXBlLmdldExpc3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2xpc3ROb2RlO1xufTtcblxuUGFuZWwucHJvdG90eXBlLmdldFdpZHRoID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl93aWR0aDtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5nZXRQb3NpdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fcG9zaXRpb247XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuZ2V0UGFyZW50ID0gZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gdGhpcy5fcGFyZW50O1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbmV3IEdyb3VwIHRvIHRoZSBQYW5lbC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbcGFyYW1zXSAtIEdyb3VwIG9wdGlvbnNcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmxhYmVsPScnXSAtIFRoZSBHcm91cCBsYWJlbCBzdHJpbmdcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW3BhcmFtcy51c2VMYWJlbD10cnVlXSAtIFRyaWdnZXIgd2hldGhlciBhbGwgY29udGFpbmVkIFN1Ykdyb3VwcyBhbmQgQ29tcG9uZW50cyBzaG91bGQgdXNlIGxhYmVsc1xuICogQHBhcmFtIHtCb29sZWFufSBbcGFyYW1zLmVuYWJsZT10cnVlXSAtIERlZmluZXMgaW5pdGlhbCBzdGF0ZSBvcGVuIC8gY2xvc2VkXG4gKiBAcGFyYW0ge051bWJlcn0gW3BhcmFtcy5oZWlnaHQ9bnVsbF0gLSBEZWZpbmVzIGlmIHRoZSBoZWlnaHQgb2YgdGhlIEdyb3VwIHNob3VsZCBiZSBjb25zdHJhaW5lZCB0byBjZXJ0YWluIGhlaWdodFxuICogQHJldHVybnMge1BhbmVsfVxuICovXG5cblBhbmVsLnByb3RvdHlwZS5hZGRHcm91cCA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICB2YXIgZ3JvdXAgPSBuZXcgR3JvdXAodGhpcywgcGFyYW1zKTtcbiAgICB0aGlzLl9ncm91cHMucHVzaChncm91cCk7XG4gICAgaWYgKHRoaXMuaXNEb2NrZWQoKSl7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIFBhbmVsRXZlbnQuUEFORUxfU0laRV9DSEFOR0UpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBuZXcgU3ViR3JvdXAgdG8gdGhlIGxhc3QgYWRkZWQgR3JvdXAuXG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBTdWJHcm91cCBvcHRpb25zXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy5sYWJlbD0nJ10gLSBUaGUgU3ViR3JvdXAgbGFiZWwgc3RyaW5nXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtwYXJhbXMudXNlTGFiZWw9dHJ1ZV0gLSBUcmlnZ2VyIHdoZXRoZXIgYWxsIENvbXBvbmVudHMgc2hvdWxkIHVzZSBsYWJlbHNcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW3BhcmFtcy5lbmFibGU9dHJ1ZV0gLSBEZWZpbmVzIGluaXRpYWwgc3RhdGUgb3BlbiAvIGNsb3NlZFxuICogQHBhcmFtIHtOdW1iZXJ9IFtwYXJhbXMuaGVpZ2h0PW51bGxdIC0gRGVmaW5lcyBpZiB0aGUgaGVpZ2h0IG9mIHRoZSBTdWJHcm91cCBzaG91bGQgYmUgY29uc3RyYWluZWQgdG8gY2VydGFpbiBoZWlnaHRcbiAqIEByZXR1cm5zIHtQYW5lbH1cbiAqL1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkU3ViR3JvdXAgPSBmdW5jdGlvbihwYXJhbXMpe1xuICAgIHZhciBncm91cHMgPSB0aGlzLl9ncm91cHM7XG4gICAgaWYoZ3JvdXBzLmxlbmd0aCA9PSAwKXtcbiAgICAgICAgdGhpcy5hZGRHcm91cCgpO1xuICAgIH1cbiAgICBncm91cHNbZ3JvdXBzLmxlbmd0aCAtIDFdLmFkZFN1Ykdyb3VwKHBhcmFtcyk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuX2FkZENvbXBvbmVudCA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcyxcbiAgICAgICAgZ3JvdXA7XG4gICAgaWYoZ3JvdXBzLmxlbmd0aCA9PSAwKXtcbiAgICAgICAgZ3JvdXBzLnB1c2gobmV3IEdyb3VwKHRoaXMpKTtcbiAgICB9XG4gICAgZ3JvdXAgPSBncm91cHNbZ3JvdXBzLmxlbmd0aC0xXTtcblxuICAgIGdyb3VwLmFkZENvbXBvbmVudC5hcHBseShncm91cCxhcmd1bWVudHMpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbmV3IFN0cmluZ0lucHV0IHRvIGxhc3QgYWRkZWQgU3ViR3JvdXAuXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IC0gVGhlIG9iamVjdFxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIC0gVGhlIHByb3BlcnR5IGtleVxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gU3RyaW5nSW5wdXQgb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9dmFsdWVdIC0gU3RyaW5nSW5wdXQgbGFiZWxcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtwYXJhbXMub25DaGFuZ2VdIC0gQ2FsbGJhY2sgb24gY2hhbmdlXG4gKiBAcGFyYW0ge0FycmF5fSBbcGFyYW1zLnByZXNldHNdIC0gQSBzZXQgb2YgcHJlc2V0c1xuICogQHJldHVybnMge1BhbmVsfVxuICovXG5cblBhbmVsLnByb3RvdHlwZS5hZGRTdHJpbmdJbnB1dCA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KFN0cmluZ0lucHV0LG9iamVjdCx2YWx1ZSxwYXJhbXMpO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbmV3IE51bWJlcklucHV0IHRvIGxhc3QgYWRkZWQgU3ViR3JvdXAuXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IC0gVGhlIG9iamVjdC5cbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSAtIFRoZSBwcm9wZXJ0eSBrZXkuXG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9ucy5cbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmxhYmVsPXZhbHVlXSAtIE51bWJlcklucHV0IGxhYmVsXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbcGFyYW1zLm9uQ2hhbmdlXSAtIENhbGxiYWNrIG9uIGNoYW5nZVxuICogQHBhcmFtIHtOdW1iZXJ9IFtwYXJhbXMuc3RlcF0gLSBBbW91bnQgc3ViYmVkL2FkZGVkIG9uIGFycm93RG93bi9hcnJvd1VwIHByZXNzXG4gKiBAcGFyYW0ge051bWJlcn0gW3BhcmFtcy5kcF0gLSBEZWNpbWFsIHBsYWNlcyBkaXNwbGF5ZWRcbiAqIEBwYXJhbSB7QXJyYXl9IFtwYXJhbXMucHJlc2V0c10gLSBBIHNldCBvZiBwcmVzZXRzXG4gKiBAcmV0dXJucyB7UGFuZWx9XG4gKi9cblxuUGFuZWwucHJvdG90eXBlLmFkZE51bWJlcklucHV0ID0gZnVuY3Rpb24gKG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoTnVtYmVySW5wdXQsb2JqZWN0LHZhbHVlLHBhcmFtcyk7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBuZXcgUmFuZ2UgaW5wdXQgdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBUaGUgb2JqZWN0XG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgLSBUaGUgcHJvcGVydHkga2V5XG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9dmFsdWVdIC0gUmFuZ2UgbGFiZWxcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtwYXJhbXMub25DaGFuZ2VdIC0gQ2FsbGJhY2sgb24gY2hhbmdlXG4gKiBAcGFyYW0ge051bWJlcn0gW3BhcmFtcy5zdGVwXSAtIEFtb3VudCBzdWJiZWQvYWRkZWQgb24gYXJyb3dEb3duL2Fycm93VXAgcHJlc3NcbiAqIEBwYXJhbSB7TnVtYmVyfSBbcGFyYW1zLmRwXSAtIERlY2ltYWwgcGxhY2VzIGRpc3BsYXllZFxuICogQHJldHVybnMge1BhbmVsfVxuICovXG5cblBhbmVsLnByb3RvdHlwZS5hZGRSYW5nZSA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KFJhbmdlLG9iamVjdCx2YWx1ZSxwYXJhbXMpO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbmV3IENoZWNrYm94IHRvIGxhc3QgYWRkZWQgU3ViR3JvdXAuXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IC0gVGhlIG9iamVjdFxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIC0gVGhlIHByb3BlcnR5IGtleVxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnNcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmxhYmVsPXZhbHVlXSAtIENoZWNrYm94IGxhYmVsXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbcGFyYW1zLm9uQ2hhbmdlXSAtIENhbGxiYWNrIG9uIGNoYW5nZVxuICogQHJldHVybnMge1BhbmVsfVxuICovXG5cblBhbmVsLnByb3RvdHlwZS5hZGRDaGVja2JveCA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KENoZWNrYm94LG9iamVjdCx2YWx1ZSxwYXJhbXMpO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbmV3IENvbG9yIG1vZGlmaWVyIHRvIGxhc3QgYWRkZWQgU3ViR3JvdXAuXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IC0gVGhlIG9iamVjdFxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIC0gVGhlIHByb3BlcnR5IGtleVxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnNcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmxhYmVsPXZhbHVlXSAtIENvbG9yIGxhYmVsXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbcGFyYW1zLm9uQ2hhbmdlXSAtIENhbGxiYWNrIG9uIGNoYW5nZVxuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMuY29sb3JNb2RlPSdyZ2InXSAtIFRoZSBjb2xvck1vZGUgdG8gYmUgdXNlZDogJ2hleCcgI2ZmMDBmZiwgJ3JnYicgWzI1NSwwLDI1NV0sICdyZ2JmdicgWzEsMCwxXVxuICogQHBhcmFtIHtBcnJheX0gW3BhcmFtcy5wcmVzZXRzXSAtIEEgc2V0IG9mIHByZXNldCBjb2xvcnMgbWF0Y2hpbmcgcGFyYW1zLmNvbG9yTW9kZVxuICogQHJldHVybnMge1BhbmVsfVxuICovXG5cblBhbmVsLnByb3RvdHlwZS5hZGRDb2xvciA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KENvbG9yLG9iamVjdCx2YWx1ZSwgcGFyYW1zKTtcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBCdXR0b24gdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cbiAqIEBwYXJhbSB7U3RyaW5nfSBsYWJlbCAtIFRoZSBvYmplY3RcbiAqIEBwYXJhbSB7RnVuY3Rpb259IG9uUHJlc3MgLSBDYWxsYmFja1xuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnNcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmxhYmVsPXZhbHVlXSAtIEJ1dHRvbiBsYWJlbFxuICogQHJldHVybnMge1BhbmVsfVxuICovXG5cblBhbmVsLnByb3RvdHlwZS5hZGRCdXR0b24gPSBmdW5jdGlvbiAobGFiZWwsIG9uUHJlc3MsIHBhcmFtcykge1xuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoQnV0dG9uLGxhYmVsLG9uUHJlc3MscGFyYW1zKTtcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBTZWxlY3QgdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBUaGUgb2JqZWN0XG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgLSBUaGUgcHJvcGVydHkga2V5XG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9dmFsdWVdIC0gQnV0dG9uIGxhYmVsXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbcGFyYW1zLm9uQ2hhbmdlXSAtIENhbGxiYWNrIG9uIGNoYW5nZSAtIGZ1bmN0aW9uKGluZGV4KXt9XG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy50YXJnZXRdIC0gVGhlIHByb3BlcnR5IHRvIGJlIHNldCBvbiBzZWxlY3RcbiAqIEByZXR1cm5zIHtQYW5lbH1cbiAqL1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkU2VsZWN0ID0gZnVuY3Rpb24gKG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoU2VsZWN0LG9iamVjdCx2YWx1ZSxwYXJhbXMpO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbmV3IFNsaWRlciB0byBsYXN0IGFkZGVkIFN1Ykdyb3VwLlxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCAtIFRoZSBvYmplY3RcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSAtIFRoZSBwcm9wZXJ0eSBrZXlcbiAqIEBwYXJhbSB7U3RyaW5nfSByYW5nZSAtIFRoZSBtaW4vbWF4IGFycmF5IGtleSB0byBiZSB1c2VkXG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9dmFsdWVdIC0gU2xpZGVyIGxhYmVsXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbcGFyYW1zLm9uQ2hhbmdlXSAtIENhbGxiYWNrIG9uIGNoYW5nZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gW3BhcmFtcy5vbkZpbmlzaF0gLSBDYWxsYmFjayBvbiBmaW5pc2hcbiAqIEBwYXJhbSB7TnVtYmVyfSBbcGFyYW1zLnN0ZXBdIC0gQW1vdW50IHN1YmJlZC9hZGRlZCBvbiBhcnJvd0Rvd24vYXJyb3dVcCBwcmVzcyBpbnNpZGUgdGhlIGlucHV0XG4gKiBAcGFyYW0ge051bWJlcn0gW3BhcmFtcy5kcF0gLSBEZWNpbWFsIHBsYWNlcyBkaXNwbGF5ZWRcbiAqIEByZXR1cm5zIHtQYW5lbH1cbiAqL1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkU2xpZGVyID0gZnVuY3Rpb24gKG9iamVjdCwgdmFsdWUsIHJhbmdlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KFNsaWRlcixvYmplY3QsdmFsdWUscmFuZ2UscGFyYW1zKTtcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBGdW5jdGlvblBsb3R0ZXIgdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBUaGUgb2JqZWN0XG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgLSBUaGUgcHJvcGVydHkga2V5IC0gZih4KSwgZih4LHkpXG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9dmFsdWVdIC0gRnVuY3Rpb25QbG90dGVyIGxhYmVsXG4gKiBAcmV0dXJucyB7UGFuZWx9XG4gKi9cblxuUGFuZWwucHJvdG90eXBlLmFkZEZ1bmN0aW9uUGxvdHRlciA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KEZ1bmN0aW9uUGxvdHRlcixvYmplY3QsdmFsdWUscGFyYW1zKTtcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBYWS1QYWQgdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBUaGUgb2JqZWN0XG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgLSBUaGUgcHJvcGVydHkga2V5XG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9dmFsdWVdIC0gUGFkIGxhYmVsXG4gKiBAcmV0dXJucyB7UGFuZWx9XG4gKi9cblxuUGFuZWwucHJvdG90eXBlLmFkZFBhZCA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KFBhZCxvYmplY3QsdmFsdWUscGFyYW1zKTtcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBWYWx1ZVBsb3R0ZXIgdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBUaGUgb2JqZWN0XG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgLSBUaGUgcHJvcGVydHkga2V5XG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9dmFsdWVdIC0gUGxvdHRlciBsYWJlbFxuICogQHBhcmFtIHtOdW1iZXJ9IFtwYXJhbXMuaGVpZ2h0XSAtIFBsb3R0ZXIgaGVpZ2h0XG4gKiBAcGFyYW0ge051bWJlcn0gW3BhcmFtcy5yZXNvbHV0aW9uXSAtIEdyYXBoIHJlc29sdXRpb25cbiAqIEByZXR1cm5zIHtQYW5lbH1cbiAqL1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkVmFsdWVQbG90dGVyID0gZnVuY3Rpb24gKG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoVmFsdWVQbG90dGVyLG9iamVjdCx2YWx1ZSxwYXJhbXMpO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbmV3IE51bWJlck91dHB1dCB0byBsYXN0IGFkZGVkIFN1Ykdyb3VwLlxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCAtIFRoZSBvYmplY3RcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSAtIFRoZSBwcm9wZXJ0eSBrZXlcbiAqIEBwYXJhbSB7T2JqZWN0fSBbcGFyYW1zXSAtIENvbXBvbmVudCBvcHRpb25zXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy5sYWJlbD12YWx1ZV0gLSBPdXRwdXQgbGFiZWxcbiAqIEBwYXJhbSB7TnVtYmVyfSBbcGFyYW1zLmRwXSAtIERlY2ltYWwgcGxhY2VzIGRpc3BsYXllZFxuICogQHJldHVybnMge1BhbmVsfVxuICovXG5cblBhbmVsLnByb3RvdHlwZS5hZGROdW1iZXJPdXRwdXQgPSBmdW5jdGlvbiAob2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChOdW1iZXJPdXRwdXQsb2JqZWN0LHZhbHVlLHBhcmFtcyk7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBuZXcgU3RyaW5nT3V0cHV0IHRvIGxhc3QgYWRkZWQgU3ViR3JvdXAuXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IC0gVGhlIG9iamVjdFxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIC0gVGhlIHByb3BlcnR5IGtleVxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnNcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmxhYmVsPXZhbHVlXSAtIE91dHB1dCBsYWJlbFxuICogQHJldHVybnMge1BhbmVsfVxuICovXG5cblBhbmVsLnByb3RvdHlwZS5hZGRTdHJpbmdPdXRwdXQgPSBmdW5jdGlvbiAob2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChTdHJpbmdPdXRwdXQsb2JqZWN0LHZhbHVlLHBhcmFtcyk7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkQ2FudmFzID0gZnVuY3Rpb24gKHBhcmFtcykge1xuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoQ2FudmFzXyxwYXJhbXMpO1xufTtcblxuUGFuZWwucHJvdG90eXBlLmFkZFNWRyA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KFNWR18scGFyYW1zKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5zZXREYXRhID0gZnVuY3Rpb24oZGF0YSl7XG4gICAgdmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcyxcbiAgICAgICAgaSA9IC0xLCBsID0gZ3JvdXBzLmxlbmd0aDtcbiAgICB3aGlsZSgrK2kgPCBsKXtcbiAgICAgICAgZ3JvdXBzW2ldLnNldERhdGEoZGF0YVtpXSk7XG4gICAgfVxufTtcblxuUGFuZWwucHJvdG90eXBlLmdldERhdGEgPSBmdW5jdGlvbigpe1xuICAgIHZhciBncm91cHMgPSB0aGlzLl9ncm91cHMsXG4gICAgICAgIGkgPSAtMSwgbCA9IGdyb3Vwcy5sZW5ndGg7XG4gICAgdmFyIGRhdGEgPSBbXTtcbiAgICB3aGlsZSgrK2kgIDwgbCl7XG4gICAgICAgIGRhdGEucHVzaChncm91cHNbaV0uZ2V0RGF0YSgpKTtcbiAgICB9XG4gICAgcmV0dXJuIGRhdGE7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBhbmVsOyIsInZhciBQYW5lbEV2ZW50ID0ge1xuXHRQQU5FTF9NT1ZFX0JFR0lOICAgICAgICAgIDogJ3BhbmVsTW92ZUJlZ2luJyxcblx0UEFORUxfTU9WRSAgICAgICAgICAgICAgICA6ICdwYW5lbE1vdmUnLFxuXHRQQU5FTF9NT1ZFX0VORCAgICAgICAgICAgIDogJ3BhbmVsTW92ZUVuZCcsXG5cblx0UEFORUxfU0hPVyAgICAgICAgICAgICAgICA6ICdwYW5lbFNob3cnLFxuXHRQQU5FTF9ISURFICAgICAgICAgICAgICAgIDogJ3BhbmVsSGlkZScsXG5cblx0UEFORUxfU0NST0xMX1dSQVBfQURERUQgICA6ICdwYW5lbFNjcm9sbFdyYXBBZGRlZCcsXG5cdFBBTkVMX1NDUk9MTF9XUkFQX1JFTU9WRUQgOiAncGFuZWxTY3JvbGxXcmFwUmVtb3ZlZCcsXG5cblx0UEFORUxfU0laRV9DSEFOR0UgICAgICAgIDogJ3BhbmVsU2l6ZUNoYW5nZSdcbn07XG5tb2R1bGUuZXhwb3J0cyA9IFBhbmVsRXZlbnQ7IiwidmFyIEFic3RyYWN0R3JvdXAgPSByZXF1aXJlKCcuL0Fic3RyYWN0R3JvdXAnKTtcbnZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XG52YXIgQ1NTICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG5cbnZhciBFdmVudF8gICAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcbiAgICBEb2N1bWVudEV2ZW50ICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxuICAgIFBhbmVsRXZlbnQgICAgID0gcmVxdWlyZSgnLi9QYW5lbEV2ZW50JyksXG4gICAgR3JvdXBFdmVudCAgICAgPSByZXF1aXJlKCcuL0dyb3VwRXZlbnQnKSxcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKTtcblxuZnVuY3Rpb24gU3ViR3JvdXAocGFyZW50LHBhcmFtcyl7XG4gICAgcGFyYW1zICAgICAgICAgICAgPSBwYXJhbXMgICAgICAgICAgfHwge307XG4gICAgcGFyYW1zLmxhYmVsICAgICAgPSBwYXJhbXMubGFiZWwgICAgfHwgbnVsbDtcbiAgICBwYXJhbXMudXNlTGFiZWxzICA9IHBhcmFtcy51c2VMYWJlbHMgID09PSB1bmRlZmluZWQgPyB0cnVlIDogcGFyYW1zLnVzZUxhYmVscztcblxuICAgIEFic3RyYWN0R3JvdXAuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG4gICAgdmFyIHJvb3ROb2RlID0gdGhpcy5fbm9kZSxcbiAgICAgICAgd3JhcE5vZGUgPSB0aGlzLl93cmFwTm9kZSxcbiAgICAgICAgbGlzdE5vZGUgPSB0aGlzLl9saXN0Tm9kZTtcblxuICAgICAgICByb290Tm9kZS5zZXRTdHlsZUNsYXNzKENTUy5TdWJHcm91cCk7XG4gICAgICAgIHdyYXBOb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApO1xuXG4gICAgICAgIHdyYXBOb2RlLmFkZENoaWxkKGxpc3ROb2RlKTtcbiAgICAgICAgcm9vdE5vZGUuYWRkQ2hpbGQod3JhcE5vZGUpO1xuXG4gICAgdGhpcy5fdXNlTGFiZWxzICA9IHBhcmFtcy51c2VMYWJlbHM7XG5cbiAgICB2YXIgbGFiZWwgPSBwYXJhbXMubGFiZWw7XG5cbiAgICBpZiAobGFiZWwgJiYgbGFiZWwubGVuZ3RoICE9IDAgJiYgbGFiZWwgIT0gJ25vbmUnKSB7XG4gICAgICAgIHZhciBoZWFkTm9kZSA9IHRoaXMuX2hlYWROb2RlID0gbmV3IE5vZGUoKSxcbiAgICAgICAgICAgIGxhYmxXcmFwID0gbmV3IE5vZGUoKSxcbiAgICAgICAgICAgIGxhYmxOb2RlID0gbmV3IE5vZGUoTm9kZS5TUEFOKTtcblxuICAgICAgICBoZWFkTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5IZWFkKTtcbiAgICAgICAgbGFibFdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCk7XG4gICAgICAgIGxhYmxOb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKTtcblxuICAgICAgICBsYWJsTm9kZS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywgbGFiZWwpO1xuXG4gICAgICAgIGxhYmxXcmFwLmFkZENoaWxkKGxhYmxOb2RlKTtcbiAgICAgICAgaGVhZE5vZGUuYWRkQ2hpbGQobGFibFdyYXApO1xuXG5cbiAgICAgICAgdmFyIGluZGlOb2RlID0gdGhpcy5faW5kaU5vZGUgPSBuZXcgTm9kZSgpO1xuICAgICAgICBpbmRpTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5BcnJvd0JTdWJNYXgpO1xuICAgICAgICBoZWFkTm9kZS5hZGRDaGlsZEF0KGluZGlOb2RlLCAwKTtcblxuICAgICAgICByb290Tm9kZS5hZGRDaGlsZEF0KGhlYWROb2RlLCAwKTtcblxuICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5TVUJHUk9VUF9UUklHR0VSLCB0aGlzLl9wYXJlbnQsICdvblN1Ykdyb3VwVHJpZ2dlcicpO1xuICAgICAgICBoZWFkTm9kZS5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25IZWFkTW91c2VEb3duLmJpbmQodGhpcykpO1xuXG4gICAgICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcblxuICAgIH1cblxuICAgIGlmKHRoaXMuaGFzTWF4SGVpZ2h0KCkpe1xuICAgICAgICB0aGlzLmFkZFNjcm9sbFdyYXAoKTtcbiAgICB9XG5cbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LlNVQkdST1VQX0VOQUJMRSwgIHRoaXMsICdvbkVuYWJsZScpO1xuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuU1VCR1JPVVBfRElTQUJMRSwgdGhpcywgJ29uRGlzYWJsZScpO1xuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKFBhbmVsRXZlbnQuUEFORUxfTU9WRV9FTkQsICAgdGhpcywgJ29uUGFuZWxNb3ZlRW5kJyk7XG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSx0aGlzLCAnb25Hcm91cFNpemVDaGFuZ2UnKTtcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihQYW5lbEV2ZW50LlBBTkVMX1NJWkVfQ0hBTkdFLHRoaXMsICdvblBhbmVsU2l6ZUNoYW5nZScpO1xuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuV0lORE9XX1JFU0laRSwgICAgdGhpcywgJ29uV2luZG93UmVzaXplJyk7XG5cbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5HUk9VUF9TSVpFX1VQREFURSx0aGlzLl9wYXJlbnQsJ29uR3JvdXBTaXplVXBkYXRlJyk7XG59XG5TdWJHcm91cC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEFic3RyYWN0R3JvdXAucHJvdG90eXBlKTtcblN1Ykdyb3VwLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFN1Ykdyb3VwO1xuXG4vL0ZJWE1FXG5TdWJHcm91cC5wcm90b3R5cGUuX29uSGVhZE1vdXNlRG93biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9lbmFibGVkID0gIXRoaXMuX2VuYWJsZWQ7XG4gICAgdGhpcy5fb25UcmlnZ2VyKCk7XG5cbiAgICB2YXIgZXZlbnQgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX1VQLFxuICAgICAgICBzZWxmICA9IHRoaXM7XG4gICAgdmFyIG9uRG9jdW1lbnRNb3VzZVVwID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBzZWxmLl9vblRyaWdnZXIoKTtcbiAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudCwgb25Eb2N1bWVudE1vdXNlVXApO1xuICAgIH07XG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50LG9uRG9jdW1lbnRNb3VzZVVwKTtcbn07XG5cblN1Ykdyb3VwLnByb3RvdHlwZS5fb25UcmlnZ2VyID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsR3JvdXBFdmVudC5TVUJHUk9VUF9UUklHR0VSLG51bGwpKTtcbn07XG5cblxuU3ViR3JvdXAucHJvdG90eXBlLl91cGRhdGVBcHBlYXJhbmNlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmlzRGlzYWJsZWQoKSkge1xuICAgICAgICB0aGlzLl93cmFwTm9kZS5zZXRIZWlnaHQoMCk7XG4gICAgICAgIGlmICh0aGlzLmhhc0xhYmVsKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2hlYWROb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkhlYWRJbmFjdGl2ZSk7XG4gICAgICAgICAgICB0aGlzLl9pbmRpTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5BcnJvd0JTdWJNaW4pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBpZiAodGhpcy5oYXNNYXhIZWlnaHQoKSkge1xuICAgICAgICAgICAgdGhpcy5fd3JhcE5vZGUuc2V0SGVpZ2h0KHRoaXMuZ2V0TWF4SGVpZ2h0KCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fd3JhcE5vZGUuZGVsZXRlU3R5bGVQcm9wZXJ0eSgnaGVpZ2h0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuaGFzTGFiZWwoKSkge1xuICAgICAgICAgICAgdGhpcy5faGVhZE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuSGVhZCk7XG4gICAgICAgICAgICB0aGlzLl9pbmRpTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5BcnJvd0JTdWJNYXgpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuU3ViR3JvdXAucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5oYXNNYXhIZWlnaHQoKSl7XG4gICAgICAgIHRoaXMuX3Njcm9sbEJhci51cGRhdGUoKTtcbiAgICB9XG59O1xuXG5TdWJHcm91cC5wcm90b3R5cGUub25Db21wb25lbnRTZWxlY3REcmFnID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMucHJldmVudFNlbGVjdERyYWcoKTtcbn07XG5cblN1Ykdyb3VwLnByb3RvdHlwZS5vbkVuYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5pc0Rpc2FibGVkKCkpe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LkVOQUJMRSwgbnVsbCkpO1xufTtcblN1Ykdyb3VwLnByb3RvdHlwZS5vbkRpc2FibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuaXNEaXNhYmxlZCgpKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBDb21wb25lbnRFdmVudC5ESVNBQkxFLCBudWxsKSk7XG59O1xuXG4vL2J1YmJsZVxuU3ViR3JvdXAucHJvdG90eXBlLm9uR3JvdXBTaXplQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UsIG51bGwpKTtcbn07XG5TdWJHcm91cC5wcm90b3R5cGUub25Hcm91cFNpemVVcGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgR3JvdXBFdmVudC5HUk9VUF9TSVpFX1VQREFURSwgbnVsbCkpO1xufTtcblN1Ykdyb3VwLnByb3RvdHlwZS5vblBhbmVsTW92ZUVuZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX01PVkVfRU5ELCBudWxsKSk7XG59O1xuU3ViR3JvdXAucHJvdG90eXBlLm9uUGFuZWxTaXplQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbn07XG5TdWJHcm91cC5wcm90b3R5cGUub25XaW5kb3dSZXNpemUgPSBmdW5jdGlvbiAoZSkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChlKTtcbn07XG5cblN1Ykdyb3VwLnByb3RvdHlwZS5oYXNMYWJlbCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5faGVhZE5vZGUgIT0gbnVsbDtcbn07XG5TdWJHcm91cC5wcm90b3R5cGUuYWRkQ29tcG9uZW50Tm9kZSA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgdGhpcy5fbGlzdE5vZGUuYWRkQ2hpbGQobm9kZSk7XG59O1xuU3ViR3JvdXAucHJvdG90eXBlLnVzZXNMYWJlbHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3VzZUxhYmVscztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU3ViR3JvdXA7Il19
(1)
});
