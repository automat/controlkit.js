!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var o;"undefined"!=typeof window?o=window:"undefined"!=typeof global?o=global:"undefined"!=typeof self&&(o=self),o.ControlKit=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var ControlKit        = _dereq_('./lib/ControlKit');
	ControlKit.Canvas = _dereq_('./lib/component/Canvas');
	ControlKit.SVG    = _dereq_('./lib/component/SVG');

module.exports = ControlKit;
},{"./lib/ControlKit":2,"./lib/component/Canvas":5,"./lib/component/SVG":22}],2:[function(_dereq_,module,exports){
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
},{"./component/NumberOutput":15,"./component/Options":16,"./component/Picker":19,"./component/StringOutput":28,"./component/ValuePlotter":29,"./core/ComponentEvent":31,"./core/History":33,"./core/HistoryEvent":34,"./core/State":38,"./core/document/CSS":42,"./core/document/DocumentEvent":43,"./core/document/Mouse":44,"./core/document/Node":45,"./core/document/NodeEvent":46,"./core/document/Style":47,"./core/event/Event":48,"./core/event/EventDispatcher":49,"./group/MenuEvent":55,"./group/Panel":56}],3:[function(_dereq_,module,exports){
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

},{"../core/Component":30,"../core/ComponentEvent":31,"../core/document/CSS":42,"../core/document/Node":45,"../core/document/NodeEvent":46,"../core/event/Event":48}],4:[function(_dereq_,module,exports){
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

},{"../core/ObjectComponentNotifier":36,"../core/OptionEvent":37,"../core/document/CSS":42,"../core/document/Node":45,"../core/document/NodeEvent":46,"../core/event/Event":48,"../core/event/EventDispatcher":49}],5:[function(_dereq_,module,exports){
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

},{"../core/Component":30,"../core/document/CSS":42,"../core/event/Event":48,"../group/GroupEvent":54,"./Metric":12}],6:[function(_dereq_,module,exports){
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
},{"../core/ComponentEvent":31,"../core/ObjectComponent":35,"../core/document/Node":45,"../core/document/NodeEvent":46,"../core/event/Event":48}],7:[function(_dereq_,module,exports){
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
},{"../core/ComponentEvent":31,"../core/color/ColorFormatError":39,"../core/color/ColorMode":40,"../core/color/ColorUtil":41,"../core/document/CSS":42,"../core/document/Node":45,"../core/document/NodeEvent":46,"../core/event/Event":48,"./../core/ObjectComponent":35,"./ButtonPreset":4,"./Metric":12,"./Options":16,"./Picker":19}],8:[function(_dereq_,module,exports){
var FunctionPlotType = {
    IMPLICIT: 'implicit',
    NON_IMPLICIT: 'nonImplicit'
};

module.exports = FunctionPlotType;
},{}],9:[function(_dereq_,module,exports){
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
},{"../core/ComponentEvent":31,"../core/ObjectComponentNotifier":36,"../core/document/CSS":42,"../core/document/DocumentEvent":43,"../core/document/Mouse":44,"../core/document/Node":45,"../core/document/NodeEvent":46,"./FunctionPlotType":8,"./FunctionPlotterFunctionArgsError":10,"./FunctionPlotterObjectError":11,"./Metric":12,"./Plotter":20}],10:[function(_dereq_,module,exports){
function FunctionPlotterFunctionArgsError(){
	Error.apply(this);
	Error.captureStackTrace(this,FunctionPlotterFunctionArgsError);
	this.name = 'FunctionPlotterFunctionArgsError';
	this.message = 'Function should be of form f(x) or f(x,y).';
}
FunctionPlotterFunctionArgsError.prototype = Object.create(Error.prototype);
FunctionPlotterFunctionArgsError.prototype.constructor = FunctionPlotterFunctionArgsError;

module.exports = FunctionPlotterFunctionArgsError;
},{}],11:[function(_dereq_,module,exports){
function FunctionPlotterObjectError(object,key){
	Error.apply(this);
	Error.captureStackTrace(this,FunctionPlotterObjectError);
	this.name = 'ComponentObjectError';
	this.message = 'Object ' + object.constructor.name + ' ' + key + 'should be of type Function.';
}
FunctionPlotterObjectError.prototype = Object.create(Error.prototype);
FunctionPlotterObjectError.prototype.constructor = FunctionPlotterObjectError;

module.exports = FunctionPlotterObjectError;
},{}],12:[function(_dereq_,module,exports){
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
},{}],13:[function(_dereq_,module,exports){
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
    params.onChange = params.onChange || this._onChange;
    params.dp       = (params.dp === undefined || params.dp == null) ? DEFAULT_INPUT_DP : params.dp;
    params.step     = params.step     || DEFAULT_INPUT_STEP;
    params.presets  = params.presets  || DEFAULT_INPUT_PRESET;

    this._onChange    = params.onChange;
    this._presetsKey  = params.presets;

    var input = this._input = new NumberInput_Internal(params.step,
                                                       params.dp,
                                                       null,
                                                       this._onInputChange.bind(this));

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
    this._onChange();
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
},{"../core/ComponentEvent":31,"../core/ObjectComponent":35,"../core/document/CSS":42,"../core/document/DocumentEvent":43,"../core/document/Node":45,"../core/document/NodeEvent":46,"../core/event/Event":48,"./ButtonPreset":4,"./Metric":12,"./NumberInput_Internal":14,"./Options":16}],14:[function(_dereq_,module,exports){
var EventDispatcher = _dereq_('../core/event/EventDispatcher'),
    NodeEvent = _dereq_('../core/document/NodeEvent');
var Node      = _dereq_('../core/document/Node');

var PRESET_SHIFT_MULTIPLIER  = 10;

NumberInput_Internal = function (stepValue, dp, onBegin, onChange) {
    EventDispatcher.apply(this, null);

    this._value = 0;
    this._valueStep = stepValue;
    this._valueDp   = dp;

    this._onBegin = onBegin || function (){};
    this._onChange = onChange || function () {};

    this._prevKeyCode = null;

    var input = this._input = new Node(Node.INPUT_TEXT);
    input.setProperty('value', this._value);

    input.addEventListener(NodeEvent.KEY_DOWN, this._onInputKeyDown.bind(this));
    input.addEventListener(NodeEvent.KEY_UP, this._onInputKeyUp.bind(this));
    input.addEventListener(NodeEvent.CHANGE, this._onInputChange.bind(this));
};
NumberInput_Internal.prototype = Object.create(EventDispatcher.prototype);
NumberInput_Internal.prototype.constructor = NumberInput_Internal;

NumberInput_Internal.prototype._onInputKeyDown = function (e) {
    var step = (e.shiftKey ? PRESET_SHIFT_MULTIPLIER : 1) * this._valueStep,
        keyCode = e.keyCode;

    if (keyCode == 38 ||
        keyCode == 40) {
        e.preventDefault();

        var multiplier = keyCode == 38 ? 1.0 : -1.0;
        this._value += (step * multiplier);

        this._onBegin();
        this._onChange();
        this._format();
    }
};

NumberInput_Internal.prototype._onInputKeyUp = function (e) {
    var keyCode = e.keyCode;


    if (e.shiftKey || keyCode == 38 ||
        keyCode == 40 || keyCode == 190 ||
        keyCode == 8 || keyCode == 39 ||
        keyCode == 37 || keyCode == 189) {
        this._prevKeyCode = keyCode;
        return;
    }

    if (this._prevKeyCode == 189 && keyCode == 48) {
        return;
    } //-0
    if (this._prevKeyCode == 190 && keyCode == 48) {
        return;
    } //0.0

    this._validate();
    this._format();
};

NumberInput_Internal.prototype._onInputChange = function (e) {
    this._validate();
    this._format();
};

NumberInput_Internal.prototype._validate = function () {
    if (this.inputIsNumber()) {
        var input = this._getInput();
        if (input != '-')this._value = Number(input);
        this._onChange();
        return;
    }

    this._setOutput(this._value);
};

NumberInput_Internal.prototype.inputIsNumber = function () {
    var value = this._getInput();

    //TODO:FIX
    if (value == '-' || value == '0')return true;
    return /^\s*-?[0-9]\d*(\.\d{1,1000000})?\s*$/.test(value);
};

NumberInput_Internal.prototype._format = function () {
    var value = this._value.toFixed(this._valueDp);
    this._setOutput(value);
};

NumberInput_Internal.prototype._setOutput = function (n) {
    this._input.setProperty('value', n);
};

NumberInput_Internal.prototype._getInput = function () {
    return this._input.getProperty('value')
};

NumberInput_Internal.prototype.getValue = function () {
    return this._value;
};

NumberInput_Internal.prototype.setValue = function (n) {
    this._value = n;
    this._format();
};

NumberInput_Internal.prototype.getNode = function () {
    return this._input;
};

module.exports = NumberInput_Internal;

},{"../core/document/Node":45,"../core/document/NodeEvent":46,"../core/event/EventDispatcher":49}],15:[function(_dereq_,module,exports){
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
},{"./Output":17}],16:[function(_dereq_,module,exports){
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
},{"../core/color/ColorMode":40,"../core/color/ColorUtil":41,"../core/document/CSS":42,"../core/document/DocumentEvent":43,"../core/document/Node":45,"../core/document/NodeEvent":46,"./Metric":12}],17:[function(_dereq_,module,exports){
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

},{"../core/ComponentEvent":31,"../core/ObjectComponent":35,"../core/document/CSS":42,"../core/document/DocumentEvent":43,"../core/document/Node":45,"../core/document/NodeEvent":46,"../core/event/Event":48,"../core/layout/ScrollBar":51,"./Metric":12}],18:[function(_dereq_,module,exports){
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

},{"../core/ComponentEvent":31,"../core/document/DocumentEvent":43,"../core/document/Mouse":44,"../core/event/Event":48,"./Plotter":20}],19:[function(_dereq_,module,exports){
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
},{"../core/color/ColorUtil":41,"../core/document/CSS":42,"../core/document/DocumentEvent":43,"../core/document/Mouse":44,"../core/document/Node":45,"../core/document/NodeEvent":46,"./NumberInput_Internal":14}],20:[function(_dereq_,module,exports){
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

},{"./SVGComponent":23}],21:[function(_dereq_,module,exports){
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
},{"../core/ComponentEvent":31,"../core/ObjectComponent":35,"../core/document/CSS":42,"../core/document/Node":45,"../core/event/Event":48,"./NumberInput_Internal":14}],22:[function(_dereq_,module,exports){
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
},{"../core/document/CSS":42,"../group/GroupEvent":54,"./../core/Component":30,"./Metric":12}],23:[function(_dereq_,module,exports){
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
},{"../core/ObjectComponent":35,"../core/document/CSS":42,"../group/GroupEvent":54,"./Metric":12}],24:[function(_dereq_,module,exports){
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

},{"../core/ComponentEvent":31,"../core/History":33,"../core/ObjectComponent":35,"../core/ObjectComponentNotifier":36,"../core/OptionEvent":37,"../core/document/CSS":42,"../core/document/Node":45,"../core/document/NodeEvent":46,"../core/event/Event":48,"./Options":16}],25:[function(_dereq_,module,exports){
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

    slider.setBoundMin(values[0]);
    slider.setBoundMax(values[1]);
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
},{"../core/ComponentEvent":31,"../core/History":33,"../core/ObjectComponent":35,"../core/document/CSS":42,"../core/document/DocumentEvent":43,"../core/event/Event":48,"../group/GroupEvent":54,"../group/PanelEvent":57,"./NumberInput_Internal":14,"./Range":21,"./Slider_Internal":26}],26:[function(_dereq_,module,exports){
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
},{"../core/document/CSS":42,"../core/document/DocumentEvent":43,"../core/document/Mouse":44,"../core/document/Node":45,"../core/document/NodeEvent":46}],27:[function(_dereq_,module,exports){
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
},{"../core/ComponentEvent":31,"../core/ObjectComponent":35,"../core/document/CSS":42,"../core/document/DocumentEvent":43,"../core/document/Node":45,"../core/document/NodeEvent":46,"../core/event/Event":48,"./ButtonPreset":4,"./Metric":12,"./Options":16}],28:[function(_dereq_,module,exports){
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

},{"./Output":17}],29:[function(_dereq_,module,exports){
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


},{"./Metric":12,"./Plotter":20}],30:[function(_dereq_,module,exports){
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
},{"./ComponentEvent":31,"./document/CSS":42,"./document/Node":45,"./event/EventDispatcher":49}],31:[function(_dereq_,module,exports){
var ComponentEvent = {
	VALUE_UPDATED: 'valueUpdated',
	UPDATE_VALUE: 'updateValue',

	INPUT_SELECT_DRAG: 'inputSelectDrag',

	ENABLE  : 'enable',
	DISABLE : 'disable'
};

module.exports = ComponentEvent;
},{}],32:[function(_dereq_,module,exports){
function ComponentObjectError(object,key) {
	Error.apply(this);
	Error.captureStackTrace(this,ComponentObjectError);
	this.name = 'ComponentObjectError';
	this.message = 'Object of type ' + object.constructor.name + ' has no member ' + key + '.';
}
ComponentObjectError.prototype = Object.create(Error.prototype);
ComponentObjectError.prototype.constructor = ComponentObjectError;

module.exports = ComponentObjectError;
},{}],33:[function(_dereq_,module,exports){
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
},{"./HistoryEvent":34,"./event/Event":48,"./event/EventDispatcher":49}],34:[function(_dereq_,module,exports){
var HistoryEvent = {
	STATE_PUSH: 'historyStatePush',
	STATE_POP: 'historyStatePop'
};

module.exports = HistoryEvent;
},{}],35:[function(_dereq_,module,exports){
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

},{"./Component":30,"./ComponentEvent":31,"./ComponentObjectError":32,"./History":33,"./ObjectComponentNotifier":36,"./event/Event":48}],36:[function(_dereq_,module,exports){
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
},{"./ComponentEvent":31,"./OptionEvent":37,"./event/Event":48,"./event/EventDispatcher":49}],37:[function(_dereq_,module,exports){
var OptionEvent = {
	TRIGGERED: 'selectTrigger',
	TRIGGER: 'triggerSelect'
};
module.exports = OptionEvent;
},{}],38:[function(_dereq_,module,exports){
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
},{}],39:[function(_dereq_,module,exports){
function ColorFormatError(msg) {
	Error.apply(this);
	Error.captureStackTrace(this,ColorFormatError);
	this.name = 'ColorFormatError';
	this.message = msg;
}
ColorFormatError.prototype = Object.create(Error.prototype);
ColorFormatError.prototype.constructor = ColorFormatError;

module.exports = ColorFormatError;
},{}],40:[function(_dereq_,module,exports){
var ColorMode = {
	RGB  : 'rgb',
	HSV  : 'hsv',
	HEX  : 'hex',
	RGBfv: 'rgbfv'
};

module.exports = ColorMode;
},{}],41:[function(_dereq_,module,exports){
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
},{}],42:[function(_dereq_,module,exports){
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

},{}],43:[function(_dereq_,module,exports){
var DocumentEvent = {
    MOUSE_MOVE: 'mousemove',
    MOUSE_UP: 'mouseup',
    MOUSE_DOWN: 'mousedown',
    MOUSE_WHEEL: 'mousewheel',
    WINDOW_RESIZE: 'resize'
};

module.exports = DocumentEvent;
},{}],44:[function(_dereq_,module,exports){
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
},{"../event/Event":48,"../event/EventDispatcher":49,"./DocumentEvent":43}],45:[function(_dereq_,module,exports){
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
},{}],46:[function(_dereq_,module,exports){
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
},{}],47:[function(_dereq_,module,exports){
var Style = { 
	string : "#controlKit{position:absolute;top:0;left:0;width:100%;height:100%;-webkit-touch-callout:none;-webkit-user-select:none;-khtml-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;pointer-events:none}#controlKit *{outline:0}#controlKit .panel{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;pointer-events:auto;position:relative;z-index:1;-webkit-touch-callout:none;-webkit-user-select:none;-khtml-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;overflow:hidden;opacity:1;float:left;width:300px;border-radius:3px;-moz-border-radius:3px;box-shadow:0 2px 2px rgba(0,0,0,.25);margin:0;padding:0;background-color:#1a1a1a;font-family:Arial,sans-serif}#controlKit .panel .wrap{width:auto;height:auto;margin:0;padding:0;position:relative;overflow:hidden}#controlKit .panel ul{margin:0;padding:0;list-style:none}#controlKit .panel .color,#controlKit .panel input[type=text],#controlKit .panel textarea,#controlKit .picker input[type=text]{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;-webkit-touch-callout:none;-webkit-user-select:none;-khtml-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;width:100%;height:25px;padding:0 0 0 8px;font-family:Arial,sans-serif;font-size:11px;color:#fff;text-shadow:1px 1px #000;background:#222729;background-image:-o-linear-gradient(rgba(0,0,0,.075) 0,rgba(0,0,0,.125) 100%);background-image:linear-gradient(rgba(0,0,0,.075) 0,rgba(0,0,0,.125) 100%);border:none;box-shadow:0 0 0 1px #1f1f1f inset;border-radius:2px;-moz-border-radius:2px}#controlKit .panel .button,#controlKit .panel .select,#controlKit .panel .select-active,#controlKit .picker .button{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;cursor:pointer;width:100%;height:26px;margin:0;background-image:-o-linear-gradient(#404040 0,#3b3b3b 100%);background-image:linear-gradient(#404040 0,#3b3b3b 100%);border:none;outline:0;border-radius:2px;box-shadow:0 0 0 1px #1f1f1f inset,-1px 2px 0 0 #4a4a4a inset;font-family:Arial,sans-serif;color:#fff}#controlKit .panel textarea{padding:5px 8px 2px;overflow:hidden;resize:none;vertical-align:top;white-space:nowrap}#controlKit .panel .textarea-wrap{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;width:100%;padding:0;float:left;height:100%;overflow:hidden;border:none;border-radius:2px;-moz-border-radius:2px;background-color:#222729;box-shadow:0 0 1px 2px rgba(0,0,0,.0125) inset,0 0 1px 1px #111314 inset;background-image:-o-linear-gradient(rgba(0,0,0,.075) 0,rgba(0,0,0,.125) 100%);background-image:linear-gradient(rgba(0,0,0,.075) 0,rgba(0,0,0,.125) 100%)}#controlKit .panel .textarea-wrap textarea{border:none;border-radius:2px;-moz-border-radius:2px;box-shadow:none;background:0 0}#controlKit .panel .textarea-wrap .scrollBar{border:1px solid #101213;border-bottom-right-radius:2px;border-top-right-radius:2px;border-left:none;box-shadow:0 0 1px 2px rgba(0,0,0,.0125) inset,0 0 1px 1px #111314 inset}#controlKit .panel canvas{cursor:pointer;vertical-align:bottom;border:none;box-shadow:0 0 0 1px #1f1f1f inset;border-radius:2px;-moz-border-radius:2px}#controlKit .panel .canvas-wrap,#controlKit .panel .svg-wrap{margin:6px 0 0;position:relative;width:70%;float:right;-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border:none;border-radius:2px;-moz-border-radius:2px;background:#1e2224;background-image:-o-linear-gradient(transparent 0,rgba(0,0,0,.05) 100%);background-image:linear-gradient(transparent 0,rgba(0,0,0,.05) 100%)}#controlKit .panel .canvas-wrap svg,#controlKit .panel .svg-wrap svg{position:absolute;left:0;top:0;cursor:pointer;vertical-align:bottom;border:none;box-shadow:0 0 0 1px #1f1f1f inset;border-radius:2px;-moz-border-radius:2px}#controlKit .panel .button,#controlKit .picker .button{font-size:10px;font-weight:700;text-shadow:0 1px #000;text-transform:uppercase}#controlKit .panel .button:hover,#controlKit .picker .button:hover{background-image:-o-linear-gradient(#454545 0,#3b3b3b 100%);background-image:linear-gradient(#454545 0,#3b3b3b 100%)}#controlKit .panel .button:active,#controlKit .picker .button:active{background-image:-o-linear-gradient(#404040 0,#3b3b3b 100%);background-image:linear-gradient(#404040 0,#3b3b3b 100%)}#controlKit .panel .color-with-preset-wrap,#controlKit .panel .input-with-preset-wrap{width:100%;float:left}#controlKit .panel .color-with-preset-wrap .color,#controlKit .panel .input-with-preset-wrap input[type=text]{padding-right:25px;border-top-right-radius:2px;border-bottom-right-radius:2px;float:left}#controlKit .panel .button-preset,#controlKit .panel .button-preset-active{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;position:absolute;right:0;width:20px;height:25px;margin:0;cursor:pointer;float:right;border:none;border-top-right-radius:2px;border-bottom-right-radius:2px;box-shadow:0 0 0 1px #1f1f1f inset,-1px 2px 0 0 #4a4a4a inset}#controlKit .panel .button-preset-active,#controlKit .panel .button-preset:hover{background:url(data:image/png;base64,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) 50% 50% no-repeat,linear-gradient(#454545 0,#3b3b3b 100%)}#controlKit .panel .button-preset{background:url(data:image/png;base64,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) 50% 50% no-repeat,linear-gradient(#404040 0,#3b3b3b 100%)}#controlKit .panel input[type=checkbox]{margin:6px 0 0}#controlKit .panel .select,#controlKit .panel .select-active{padding-left:10px;padding-right:20px;font-size:11px;text-align:left;text-shadow:1px 1px #000;cursor:pointer;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}#controlKit .panel .select{background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAALCAYAAAB24g05AAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo+qi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt/87fOH4p3iC+N7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi/RNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z+pn5mZ2y6xlhbL+xW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a/zYnKOZarnivN7cyzytuQN5zvn//tEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1+1dT1gvWd+1YfqGnRs+FYmKrhTbF5cVf9go3HjlG4dvyr+Z3JS0qavEuWTPZtJm6ebeLZ5bDpaql+aXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO/PLi8ZafJzs07P1SkVPRU+lQ27tLdtWHX+G7R7ht7vPY07NXbW7z3/T7JvttVAVVN1WbVZftJ+7P3P66Jqun4lvttXa1ObXHtxwPSA/0HIw6217nU1R3SPVRSj9Yr60cOxx++/p3vdy0NNg1VjZzG4iNwRHnk6fcJ3/ceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w+0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb++6EHTh0kX/i+c7vDvOXPK4dPKy2+UTV7hXmq86X23qdOo8/pPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb/1tWeOT3dvfN6b/fF9/XfFt1+cif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v+3Njv3H9qwHeg89HcR/cGhYPP/pH1jw9DBY+Zj8uGDYbrnjg+OTniP3L96fynQ89kzyaeF/6i/suuFxYvfvjV69fO0ZjRoZfyl5O/bXyl/erA6xmv28bCxh6+yXgzMV70VvvtwXfcdx3vo98PT+R8IH8o/2j5sfVT0Kf7kxmTk/8EA5jz/GMzLdsAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAAAMNJREFUeNqckjEKwjAUhj8l53AQ526BHKKLIhSlHkHxBkkuIFWPILQOQQd3V4VuXiguFlrFRPzhLXl833uB10uznCaP+q4BEqls83Y5HghFtOH1amkAit2+IwkmzXIGw5HeFFvfZFNs/WA40mmW470P1gf8LokJRCIV11vN9bb42C6RKvoDAdhX/RXxqO8G0F/6FjBBQSIV8+mE2XTcaVTuTOlO0Q36gCndyVbu/A5Hp7fvwLymaeBnuHNILQm/wgDPAQAPNIsHnO794QAAAABJRU5ErkJggg==) 100% 50% no-repeat,linear-gradient(#404040 0,#3b3b3b 100%)}#controlKit .panel .select-active,#controlKit .panel .select:hover{background:url(data:image/png;base64,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) 100% 50% no-repeat,linear-gradient(#454545 0,#3b3b3b 100%)}#controlKit .panel .slider-handle,#controlKit .panel .slider-slot,#controlKit .panel .slider-wrap,#controlKit .panel .wrap-slider{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box}#controlKit .panel .wrap-slider{width:70%;padding:6px 0 0;float:right;height:100%}#controlKit .panel .wrap-slider input[type=text]{width:25%;text-align:center;padding:0;float:right}#controlKit .panel .slider-wrap{float:left;cursor:ew-resize;width:70%}#controlKit .panel .slider-slot{width:100%;height:25px;padding:3px;background-color:#1e2224;border:none;box-shadow:0 0 0 1px #1f1f1f inset;border-radius:2px;-moz-border-radius:2px}#controlKit .panel .slider-handle{position:relative;width:100%;height:100%;background:#b32435;background-image:-o-linear-gradient(transparent 0,rgba(0,0,0,.1) 100%);background-image:linear-gradient(transparent 0,rgba(0,0,0,.1) 100%);box-shadow:0 1px 0 0 #0f0f0f}#controlKit .panel .color{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;-webkit-touch-callout:none;-webkit-user-select:none;-khtml-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;cursor:pointer;width:100%;height:25px;padding:0;border:none;background:#fff;box-shadow:0 0 0 1px #111314 inset;text-align:center;line-height:25px;border-radius:2px;-moz-border-radius:2px}#controlKit .panel .graph-slider-x-wrap,#controlKit .panel .graph-slider-y-wrap{position:absolute;-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box}#controlKit .panel .graph-slider-x-wrap{bottom:0;left:0;width:100%;padding:6px 20px 6px 6px}#controlKit .panel .graph-slider-y-wrap{top:0;right:0;height:100%;padding:6px 6px 20px}#controlKit .panel .graph-slider-x,#controlKit .panel .graph-slider-y{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border-radius:2px;-moz-border-radius:2px;background:rgba(24,27,29,.5);border:1px solid #181b1d}#controlKit .panel .graph-slider-x{height:8px}#controlKit .panel .graph-slider-y{width:8px;height:100%}#controlKit .panel .graph-slider-x-handle,#controlKit .panel .graph-slider-y-handle{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;cursor:pointer;border:1px solid #181b1d;background:#303639}#controlKit .panel .graph-slider-x-handle{width:20px;height:100%;border-top:none;border-bottom:none}#controlKit .panel .graph-slider-y-handle{width:100%;height:20px;border-left:none;border-right:none}#controlKit .sub-group .wrap .wrap .wrap{width:25%!important;padding:0!important;float:left!important}#controlKit .sub-group .wrap .wrap .wrap .label{width:100%!important;padding:8px 0 0!important;color:#878787!important;text-align:center!important;text-transform:uppercase!important;font-weight:700!important;text-shadow:1px 1px #1a1a1a!important}#controlKit .sub-group .wrap .wrap .wrap input[type=text]{padding:0;text-align:center}#controlKit .options{pointer-events:auto;-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border:1px solid #1f1f1f;border-radius:2px;-moz-border-radius:2px;position:absolute;z-index:2147483638;left:0;top:0;width:auto;height:auto;box-shadow:0 1px 0 0 #4a4a4a inset;background-color:#454545;font-family:Arial,sans-serif;font-size:11px;color:#fff;text-shadow:1px 1px #000;overflow:hidden}#controlKit .options ul{width:100%;list-style:none;margin:0;padding:0}#controlKit .options ul li{margin:0;width:100%;height:25px;line-height:25px;padding:0 20px 0 10px;overflow:hidden;white-space:normal;text-overflow:ellipsis;cursor:pointer}#controlKit .options ul li:hover{background-color:#1f2325}#controlKit .options ul .li-selected{background-color:#292d30}#controlKit .options .color{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box}#controlKit .options .color .li-selected,#controlKit .options .color li{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;padding:0;height:25px;line-height:25px;text-align:center}#controlKit .options .color .li-selected:hover,#controlKit .options .color li:hover{background:0 0;font-weight:700}#controlKit .options .color .li-selected{font-weight:700}#controlKit .panel .label,#controlKit .picker .label{width:100%;float:left;font-size:11px;font-weight:700;text-shadow:0 1px #000;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;cursor:default}#controlKit .panel .head,#controlKit .panel .panel-head-inactive,#controlKit .picker .head{height:30px;padding:0 10px;background:#1a1a1a;overflow:hidden}#controlKit .panel .head .wrap,#controlKit .panel .panel-head-inactive .wrap,#controlKit .picker .head .wrap{width:auto;height:auto;margin:0;padding:0;position:relative;overflow:hidden}#controlKit .panel .head .label,#controlKit .picker .head .label{cursor:pointer;line-height:30px;color:#65696b}#controlKit .panel .group-list .group .head{height:38px;padding:0 10px;border-top:1px solid #4f4f4f;border-bottom:1px solid #262626;background-image:-o-linear-gradient(#454545 0,#3b3b3b 100%);background-image:linear-gradient(#454545 0,#3b3b3b 100%);cursor:pointer}#controlKit .panel .group-list .group .head .label{font-size:12px;line-height:38px;color:#fff}#controlKit .panel .group-list .group .head:hover{border-top:1px solid #525252;background-image:-o-linear-gradient(#454545 0,#404040 100%);background-image:linear-gradient(#454545 0,#404040 100%)}#controlKit .panel .group-list .group li{height:35px;padding:0 10px}#controlKit .panel .group-list .group .sub-group-list .sub-group{padding:0;height:auto;border-bottom:1px solid #242424}#controlKit .panel .group-list .group .sub-group-list .sub-group ul{overflow:hidden}#controlKit .panel .group-list .group .sub-group-list .sub-group ul li{background:#2e2e2e;border-bottom:1px solid #1e2224}#controlKit .panel .group-list .group .sub-group-list .sub-group ul li:last-of-type{border-bottom:none}#controlKit .panel .group-list .group .sub-group-list .sub-group:first-child{margin-top:0}#controlKit .panel .group-list .group .sub-group-list .sub-group .head,#controlKit .panel .group-list .group .sub-group-list .sub-group .head-inactive{cursor:pointer}#controlKit .panel .group-list .group .sub-group-list .sub-group .head{height:27px;padding:0 10px;border-top:none;border-bottom:1px solid #242424;background-image:none;background-color:#272727}#controlKit .panel .group-list .group .sub-group-list .sub-group .head:hover{background-image:none;background-color:#272727}#controlKit .panel .group-list .group .sub-group-list .sub-group .head-inactive{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;height:27px;padding:0 10px;box-shadow:0 1px 0 0 #404040 inset;background-image:-o-linear-gradient(#3b3b3b 0,#383838 100%);background-image:linear-gradient(#3b3b3b 0,#383838 100%)}#controlKit .panel .group-list .group .sub-group-list .sub-group .head-inactive:hover{box-shadow:0 1px 0 0 #474747 inset;background-image:none;background-image:-o-linear-gradient(#404040 0,#3b3b3b 100%);background-image:linear-gradient(#404040 0,#3b3b3b 100%)}#controlKit .panel .group-list .group .sub-group-list .sub-group .head .label,#controlKit .panel .group-list .group .sub-group-list .sub-group .head-inactive .label{margin:0;padding:0;line-height:27px;color:#fff;font-weight:700;font-size:11px;text-shadow:1px 1px #000;text-transform:capitalize}#controlKit .panel .group-list .group .sub-group-list .sub-group .head .wrap .label,#controlKit .panel .group-list .group .sub-group-list .sub-group .head-inactive .wrap .label{width:100%;font-weight:700;color:#fff;padding:0}#controlKit .panel .group-list .group .sub-group-list .sub-group .wrap .label{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;height:100%;width:30%;padding:12px 5px 0 0;float:left;font-size:11px;font-weight:400;color:#aeb5b8;text-shadow:1px 1px #000}#controlKit .panel .group-list .group .sub-group-list .sub-group .wrap .wrap{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;width:70%;padding:5px 0 0;float:right;height:100%}#controlKit .panel .group-list .group:last-child .scroll-buffer:nth-of-type(3),#controlKit .panel .group-list .group:last-child .sub-group-list{border-bottom:none}#controlKit .panel .scroll-wrap{position:relative;overflow:hidden}#controlKit .panel .scroll-buffer{width:100%;height:8px;border-top:1px solid #3b4447;border-bottom:1px solid #1e2224}#controlKit .panel .scrollBar{-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box;width:15px;height:100%;float:right;top:0;padding:0;margin:0;position:relative;background:#212628;background-image:linear-gradient(to right,#242424 0,#2e2e2e 100%)}#controlKit .panel .scrollBar .track{padding:0 3px 0 2px}#controlKit .panel .scrollBar .track .thumb{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;width:11px;position:absolute;cursor:pointer;background-color:#343434;border:1px solid #1b1f21;border-radius:10px;-moz-border-radius:10px;box-shadow:inset 0 1px 0 0 #434b50}#controlKit .panel .menu,#controlKit .panel .menu-active,#controlKit .picker .menu{float:right;padding:5px 0 0}#controlKit .panel .menu input[type=button],#controlKit .panel .menu-active input[type=button],#controlKit .picker .menu input[type=button]{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;cursor:pointer;height:20px;border:none;vertical-align:top;border-radius:2px;-moz-border-radius:2px;font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:#aaa;text-shadow:0 -1px #000;text-transform:uppercase;box-shadow:0 0 0 1px #131313 inset,-1px 2px 0 0 #212527 inset}#controlKit .panel .menu .button-menu-close,#controlKit .panel .menu .button-menu-hide,#controlKit .panel .menu .button-menu-show,#controlKit .panel .menu-active .button-menu-close,#controlKit .panel .menu-active .button-menu-hide,#controlKit .panel .menu-active .button-menu-show,#controlKit .picker .menu .button-menu-close,#controlKit .picker .menu .button-menu-hide,#controlKit .picker .menu .button-menu-show{width:20px;margin-left:4px}#controlKit .panel .menu .button-menu-hide,#controlKit .panel .menu-active .button-menu-hide,#controlKit .picker .menu .button-menu-hide{background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAFCAYAAAB4ka1VAAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo+qi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt/87fOH4p3iC+N7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi/RNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z+pn5mZ2y6xlhbL+xW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a/zYnKOZarnivN7cyzytuQN5zvn//tEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1+1dT1gvWd+1YfqGnRs+FYmKrhTbF5cVf9go3HjlG4dvyr+Z3JS0qavEuWTPZtJm6ebeLZ5bDpaql+aXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO/PLi8ZafJzs07P1SkVPRU+lQ27tLdtWHX+G7R7ht7vPY07NXbW7z3/T7JvttVAVVN1WbVZftJ+7P3P66Jqun4lvttXa1ObXHtxwPSA/0HIw6217nU1R3SPVRSj9Yr60cOxx++/p3vdy0NNg1VjZzG4iNwRHnk6fcJ3/ceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w+0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb++6EHTh0kX/i+c7vDvOXPK4dPKy2+UTV7hXmq86X23qdOo8/pPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb/1tWeOT3dvfN6b/fF9/XfFt1+cif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v+3Njv3H9qwHeg89HcR/cGhYPP/pH1jw9DBY+Zj8uGDYbrnjg+OTniP3L96fynQ89kzyaeF/6i/suuFxYvfvjV69fO0ZjRoZfyl5O/bXyl/erA6xmv28bCxh6+yXgzMV70VvvtwXfcdx3vo98PT+R8IH8o/2j5sfVT0Kf7kxmTk/8EA5jz/GMzLdsAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAAAGRJREFUeNpidPUNYoCBU0cO1DMwMDCY2Tg0wsRYkCVlFZUboGy4ImZldU24pJySCgO/oBADAwODw/VL5xmk5RQOMr99/RIuCQPIiljMbBwYGBgYGH7//MmADCSlZRkkpWUZAAMAvTsgXBvOsq0AAAAASUVORK5CYII=) 50% 50% no-repeat,#1a1d1f}#controlKit .panel .menu .button-menu-hide:hover,#controlKit .panel .menu-active .button-menu-hide:hover,#controlKit .picker .menu .button-menu-hide:hover{background:url(data:image/png;base64,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) 50% 50% no-repeat,#000;box-shadow:#fff 0,#000 100%}#controlKit .panel .menu .button-menu-show,#controlKit .panel .menu-active .button-menu-show,#controlKit .picker .menu .button-menu-show{background:url(data:image/png;base64,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) 50% 50% no-repeat,#1a1d1f}#controlKit .panel .menu .button-menu-show:hover,#controlKit .panel .menu-active .button-menu-show:hover,#controlKit .picker .menu .button-menu-show:hover{background:url(data:image/png;base64,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) 50% 50% no-repeat,#000;box-shadow:#fff 0,#000 100%}#controlKit .panel .menu .button-menu-close,#controlKit .panel .menu-active .button-menu-close,#controlKit .picker .menu .button-menu-close{background:url(data:image/png;base64,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) 50% 50% no-repeat,#1a1d1f}#controlKit .panel .menu .button-menu-close:hover,#controlKit .panel .menu-active .button-menu-close:hover,#controlKit .picker .menu .button-menu-close:hover{background:url(data:image/png;base64,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) 50% 50% no-repeat,#000;box-shadow:#fff 0,#000 100%}#controlKit .panel .menu .button-menu-undo,#controlKit .panel .menu-active .button-menu-undo{background:url(data:image/png;base64,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) 20% 50% no-repeat,#1a1d1f;padding:0 6px 1px 0;width:38px;vertical-align:top;text-align:end}#controlKit .panel .menu .button-menu-undo:hover,#controlKit .panel .menu-active .button-menu-undo:hover{background:url(data:image/png;base64,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) 20% 50% no-repeat,#000;box-shadow:#fff 0,#000 100%}#controlKit .panel .menu .button-menu-load,#controlKit .panel .menu-active .button-menu-load{margin-right:2px}#controlKit .panel .menu .button-menu-load,#controlKit .panel .menu .button-menu-save,#controlKit .panel .menu-active .button-menu-load,#controlKit .panel .menu-active .button-menu-save{background:#1a1d1f;font-size:9px!important}#controlKit .panel .menu .button-menu-load:hover,#controlKit .panel .menu .button-menu-save:hover,#controlKit .panel .menu-active .button-menu-load:hover,#controlKit .panel .menu-active .button-menu-save:hover{background:#000}#controlKit .panel .menu .wrap{display:none}#controlKit .panel .menu-active{width:100%;float:left}#controlKit .panel .menu-active .wrap{display:inline}#controlKit .panel .menu-active .button-menu-close,#controlKit .panel .menu-active .button-menu-hide,#controlKit .panel .menu-active .button-menu-show{float:right}#controlKit .panel .arrow-s-max{background:url(data:image/png;base64,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) center no-repeat}#controlKit .panel .arrow-s-min{background:url(data:image/png;base64,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) center no-repeat}#controlKit .panel .arrow-s-max,#controlKit .panel .arrow-s-min{width:100%;height:20px}#controlKit .panel .arrow-b-max{background:url(data:image/png;base64,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) center no-repeat}#controlKit .panel .arrow-b-min{background:url(data:image/png;base64,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) center no-repeat}#controlKit .panel .arrow-b-sub-max{background:url(data:image/png;base64,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) center no-repeat}#controlKit .panel .arrow-b-sub-min{background:url(data:image/png;base64,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) center no-repeat}#controlKit .panel .arrow-b-max,#controlKit .panel .arrow-b-min,#controlKit .panel .arrow-b-sub-max,#controlKit .panel .arrow-b-sub-min{width:10px;height:100%;float:right}#controlKit .picker{pointer-events:auto;-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border-radius:3px;-moz-border-radius:3px;background-color:#3b3b3b;font-family:Arial,sans-serif;font-size:11px;color:#fff;text-shadow:1px 1px #000;overflow:hidden;position:absolute;z-index:2147483631;width:360px;-webkit-touch-callout:none;-webkit-user-select:none;-khtml-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;box-shadow:0 2px 2px rgba(0,0,0,.25)}#controlKit .picker canvas{vertical-align:bottom;cursor:pointer}#controlKit .picker .wrap{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;padding:10px;float:left}#controlKit .picker .field-wrap{padding:3px}#controlKit .picker .slider-wrap{padding:3px 13px 3px 3px}#controlKit .picker .field-wrap,#controlKit .picker .input-wrap,#controlKit .picker .slider-wrap{height:auto;overflow:hidden;float:left}#controlKit .picker .input-wrap{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border:1px solid #242424;border-radius:2px;-moz-border-radius:2px;width:140px;float:right;padding:5px 10px 1px 0}#controlKit .picker .input-field{width:50%;float:right;margin-bottom:4px}#controlKit .picker .input-field .label{padding:8px 0 0;color:#878787;text-align:center;text-transform:uppercase;font-weight:700;text-shadow:1px 1px #1a1a1a;width:40%}#controlKit .picker .input-field .wrap{padding:0;width:60%;height:auto;float:right}#controlKit .picker .controls-wrap{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;width:100%;height:auto;float:right;padding:9px 0 0}#controlKit .picker .controls-wrap input[type=button]{float:right;width:65px;margin:0 0 0 10px}#controlKit .picker .color-contrast{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border:none;box-shadow:0 0 0 1px #1f1f1f inset;border-radius:2px;-moz-border-radius:2px;height:25px;padding:3px;width:80%;margin-bottom:4px;float:right}#controlKit .picker .color-contrast div{width:50%;height:100%;float:left}#controlKit .picker input[type=text]{padding:0;text-align:center;width:60%;float:right}#controlKit .picker .wrap .input-wrap:nth-of-type(3){border-bottom-left-radius:0;border-bottom-right-radius:0}#controlKit .picker .wrap .input-wrap:nth-of-type(4){border-top:none;border-top-left-radius:0;border-top-right-radius:0}#controlKit .picker .wrap .input-wrap:nth-of-type(4) .input-field{width:100%}#controlKit .picker .wrap .input-wrap:nth-of-type(4) .input-field .label{width:20%}#controlKit .picker .wrap .input-wrap:nth-of-type(4) input[type=text]{width:80%}#controlKit .picker .field-wrap,#controlKit .picker .slider-wrap{background:#1e2224;border:none;box-shadow:0 0 0 1px #1f1f1f inset;border-radius:2px;-moz-border-radius:2px;position:relative;margin-right:5px}#controlKit .picker .field-wrap .indicator,#controlKit .picker .slider-wrap .indicator{position:absolute;border:2px solid #fff;box-shadow:0 1px black,0 1px #000 inset;cursor:pointer}#controlKit .picker .field-wrap .indicator{width:8px;height:8px;left:50%;top:50%;border-radius:50%;-moz-border-radius:50%}#controlKit .picker .slider-wrap .indicator{width:14px;height:3px;border-radius:8px;-moz-border-radius:8px;left:1px;top:1px}#controlKit .picker .slider-wrap .indicator:after{content:'';width:0;height:0;border-top:4.5px solid transparent;border-bottom:4.5px solid transparent;border-right:4px solid #fff;float:right;position:absolute;top:-2px;left:19px}#controlKit .picker .slider-wrap .indicator:before{content:'';width:0;height:0;border-top:4.5px solid transparent;border-bottom:4.5px solid transparent;border-right:4px solid #000;float:right;position:absolute;top:-3px;left:19px}"
}; 
module.exports = Style;
},{}],48:[function(_dereq_,module,exports){
function Event_(sender,type,data) {
    this.sender = sender;
    this.type   = type;
    this.data   = data;
}
module.exports = Event_;
},{}],49:[function(_dereq_,module,exports){
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
},{}],50:[function(_dereq_,module,exports){
var LayoutMode = {
    LEFT   : 'left',
    RIGHT  : 'right',
    TOP    : 'top',
    BOTTOM : 'bottom',
    NONE   : 'none'
};

module.exports = LayoutMode;
},{}],51:[function(_dereq_,module,exports){
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
},{"../../component/Metric":12,"../document/CSS":42,"../document/DocumentEvent":43,"../document/Mouse":44,"../document/Node":45,"../document/NodeEvent":46}],52:[function(_dereq_,module,exports){
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


},{"../core/document/Node":45,"../core/event/EventDispatcher":49,"../core/layout/ScrollBar":51}],53:[function(_dereq_,module,exports){
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

},{"../component/FunctionPlotter":9,"../component/ValuePlotter":29,"../core/ObjectComponent":35,"../core/document/CSS":42,"../core/document/DocumentEvent":43,"../core/document/Node":45,"../core/document/NodeEvent":46,"../core/event/Event":48,"./AbstractGroup":52,"./GroupEvent":54,"./PanelEvent":57,"./SubGroup":58}],54:[function(_dereq_,module,exports){
var GroupEvent = {
	GROUP_SIZE_CHANGE        : 'groupSizeChange',
	GROUP_LIST_SIZE_CHANGE   : 'groupListSizeChange',
	GROUP_SIZE_UPDATE        : 'groupSizeUpdate',
	SUBGROUP_TRIGGER         : 'subGroupTrigger',

	SUBGROUP_ENABLE          : 'enableSubGroup',
	SUBGROUP_DISABLE         : 'disableSubGroup'
};

module.exports = GroupEvent;
},{}],55:[function(_dereq_,module,exports){
var MenuEvent = {
	UPDATE_MENU: 'updateMenu'
};
module.exports = MenuEvent;
},{}],56:[function(_dereq_,module,exports){
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
    DEFAULT_PANEL_WIDTH      = 300,
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
},{"../component/Button":3,"../component/Canvas":5,"../component/Checkbox":6,"../component/Color":7,"../component/FunctionPlotter":9,"../component/NumberInput":13,"../component/NumberOutput":15,"../component/Pad":18,"../component/Range":21,"../component/SVG":22,"../component/Select":24,"../component/Slider":25,"../component/StringInput":27,"../component/StringOutput":28,"../component/ValuePlotter":29,"../core/History":33,"../core/document/CSS":42,"../core/document/DocumentEvent":43,"../core/document/Mouse":44,"../core/document/Node":45,"../core/document/NodeEvent":46,"../core/event/Event":48,"../core/event/EventDispatcher":49,"../core/layout/LayoutMode":50,"../core/layout/ScrollBar":51,"./Group":53,"./MenuEvent":55,"./PanelEvent":57}],57:[function(_dereq_,module,exports){
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
},{}],58:[function(_dereq_,module,exports){
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
},{"../core/ComponentEvent":31,"../core/document/CSS":42,"../core/document/DocumentEvent":43,"../core/document/Node":45,"../core/event/Event":48,"./AbstractGroup":52,"./GroupEvent":54,"./PanelEvent":57}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9pbmRleC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvQ29udHJvbEtpdC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L0J1dHRvbi5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L0J1dHRvblByZXNldC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L0NhbnZhcy5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L0NoZWNrYm94LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvQ29sb3IuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9GdW5jdGlvblBsb3RUeXBlLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvRnVuY3Rpb25QbG90dGVyLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3IuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9GdW5jdGlvblBsb3R0ZXJPYmplY3RFcnJvci5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L01ldHJpYy5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L051bWJlcklucHV0LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvTnVtYmVySW5wdXRfSW50ZXJuYWwuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9OdW1iZXJPdXRwdXQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9PcHRpb25zLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvT3V0cHV0LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvUGFkLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvUGlja2VyLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvUGxvdHRlci5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L1JhbmdlLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvU1ZHLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvU1ZHQ29tcG9uZW50LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvU2VsZWN0LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvU2xpZGVyLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvU2xpZGVyX0ludGVybmFsLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvU3RyaW5nSW5wdXQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9TdHJpbmdPdXRwdXQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9WYWx1ZVBsb3R0ZXIuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvQ29tcG9uZW50LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL0NvbXBvbmVudEV2ZW50LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL0NvbXBvbmVudE9iamVjdEVycm9yLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL0hpc3RvcnkuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvSGlzdG9yeUV2ZW50LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL09iamVjdENvbXBvbmVudC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9PYmplY3RDb21wb25lbnROb3RpZmllci5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9PcHRpb25FdmVudC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9TdGF0ZS5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9jb2xvci9Db2xvckZvcm1hdEVycm9yLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL2NvbG9yL0NvbG9yTW9kZS5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9jb2xvci9Db2xvclV0aWwuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvZG9jdW1lbnQvQ1NTLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvZG9jdW1lbnQvTW91c2UuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvZG9jdW1lbnQvTm9kZS5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvZG9jdW1lbnQvU3R5bGUuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvZXZlbnQvRXZlbnQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvZXZlbnQvRXZlbnREaXNwYXRjaGVyLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL2xheW91dC9MYXlvdXRNb2RlLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL2xheW91dC9TY3JvbGxCYXIuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2dyb3VwL0Fic3RyYWN0R3JvdXAuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2dyb3VwL0dyb3VwLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9ncm91cC9Hcm91cEV2ZW50LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9ncm91cC9NZW51RXZlbnQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2dyb3VwL1BhbmVsLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9ncm91cC9QYW5lbEV2ZW50LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9ncm91cC9TdWJHcm91cC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaHpCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcFRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMveEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgQ29udHJvbEtpdCAgICAgICAgPSByZXF1aXJlKCcuL2xpYi9Db250cm9sS2l0Jyk7XG5cdENvbnRyb2xLaXQuQ2FudmFzID0gcmVxdWlyZSgnLi9saWIvY29tcG9uZW50L0NhbnZhcycpO1xuXHRDb250cm9sS2l0LlNWRyAgICA9IHJlcXVpcmUoJy4vbGliL2NvbXBvbmVudC9TVkcnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb250cm9sS2l0OyIsInZhciBOb2RlICAgID0gcmVxdWlyZSgnLi9jb3JlL2RvY3VtZW50L05vZGUnKSxcbiAgICBQYW5lbCAgID0gcmVxdWlyZSgnLi9ncm91cC9QYW5lbCcpLFxuICAgIE9wdGlvbnMgPSByZXF1aXJlKCcuL2NvbXBvbmVudC9PcHRpb25zJyksXG4gICAgUGlja2VyICA9IHJlcXVpcmUoJy4vY29tcG9uZW50L1BpY2tlcicpO1xuXG52YXIgQ1NTID0gcmVxdWlyZSgnLi9jb3JlL2RvY3VtZW50L0NTUycpO1xuXG52YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZSgnLi9jb3JlL2V2ZW50L0V2ZW50RGlzcGF0Y2hlcicpLFxuICAgIEV2ZW50XyAgICAgICAgICA9IHJlcXVpcmUoJy4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIERvY3VtZW50RXZlbnQgICA9IHJlcXVpcmUoJy4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXG4gICAgTm9kZUV2ZW50ICAgICAgID0gcmVxdWlyZSgnLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpLFxuICAgIENvbXBvbmVudEV2ZW50ICA9IHJlcXVpcmUoJy4vY29yZS9Db21wb25lbnRFdmVudCcpLFxuICAgIEhpc3RvcnlFdmVudCAgICA9IHJlcXVpcmUoJy4vY29yZS9IaXN0b3J5RXZlbnQnKSxcbiAgICBNZW51RXZlbnQgICAgICAgPSByZXF1aXJlKCcuL2dyb3VwL01lbnVFdmVudCcpO1xuXG52YXIgSGlzdG9yeSA9IHJlcXVpcmUoJy4vY29yZS9IaXN0b3J5JyksXG4gICAgU3RhdGUgICA9IHJlcXVpcmUoJy4vY29yZS9TdGF0ZScpO1xuXG52YXIgTW91c2UgICA9IHJlcXVpcmUoJy4vY29yZS9kb2N1bWVudC9Nb3VzZScpO1xuXG52YXIgVmFsdWVQbG90dGVyID0gcmVxdWlyZSgnLi9jb21wb25lbnQvVmFsdWVQbG90dGVyJyk7XG52YXIgU3RyaW5nT3V0cHV0ID0gcmVxdWlyZSgnLi9jb21wb25lbnQvU3RyaW5nT3V0cHV0JyksXG4gICAgTnVtYmVyT3V0cHV0ID0gcmVxdWlyZSgnLi9jb21wb25lbnQvTnVtYmVyT3V0cHV0Jyk7XG5cbnZhciBERUZBVUxUX0hJU1RPUlkgPSBmYWxzZSxcbiAgICBERUZBVUxUX09QQUNJVFkgPSAxLjAsXG4gICAgREVGQVVMVF9QQU5FTFNfQ0xPU0FCTEUgPSBmYWxzZSxcbiAgICBERUZBVUxUX0VOQUJMRSA9IHRydWUsXG4gICAgREVGQVVMVF9MT0FEX0FORF9TQVZFID0gZmFsc2U7XG5cbnZhciBERUZBVUxUX1RSSUdHRVJfU0hPUlRDVVRfQ0hBUiA9ICdoJztcblxudmFyIGluaXRpYXRlZCA9IGZhbHNlO1xuXG4vKipcbiAqIEluaXRpYWxpemVzIENvbnRyb2xLaXQuXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gQ29udHJvbEtpdCBvcHRpb25zXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMub3BhY2l0eT0xLjBdIC0gT3ZlcmFsbCBvcGFjaXR5XG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmVuYWJsZT10cnVlXSAtIEluaXRpYWwgQ29udHJvbEtpdCBzdGF0ZSwgZW5hYmxlZCAvIGRpc2FibGVkXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLnVzZUV4dGVybmFsU3R5bGU9ZmFsc2VdIC0gSWYgdHJ1ZSwgYW4gZXh0ZXJuYWwgc3R5bGUgaXMgdXNlZCBpbnN0ZWFkIG9mIHRoZSBidWlsZC1pbiBvbmVcbiAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0aW9ucy5zdHlsZVN0cmluZ10gLSBJZiB0cnVlLCBhbiBleHRlcm5hbCBzdHlsZSBpcyB1c2VkIGluc3RlYWQgb2YgdGhlIGJ1aWxkLWluIG9uZVxuICogQHBhcmFtIHtCb29sZWFufVtvcHRpb25zLmhpc3Rvcnk9ZmFsc2VdIC0gKEV4cGVyaW1lbnRhbCkgRW5hYmxlcyBhIHZhbHVlIGhpc3RvcnkgZm9yIGFsbCBjb21wb25lbnRzXG4gKi9cbmZ1bmN0aW9uIENvbnRyb2xLaXQob3B0aW9ucykge1xuICAgIGlmKGluaXRpYXRlZCl7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ29udHJvbEtpdCBpcyBhbHJlYWR5IGluaXRpYWxpemVkLicpO1xuICAgIH1cbiAgICBvcHRpb25zICAgICAgICAgICAgICAgICAgPSBvcHRpb25zIHx8IHt9O1xuICAgIG9wdGlvbnMuaGlzdG9yeSAgICAgICAgICA9IG9wdGlvbnMuaGlzdG9yeSA9PT0gdW5kZWZpbmVkID8gREVGQVVMVF9ISVNUT1JZIDogb3B0aW9ucy5oaXN0b3J5O1xuICAgIG9wdGlvbnMubG9hZEFuZFNhdmUgICAgICA9IG9wdGlvbnMubG9hZEFuZFNhdmUgPT09IHVuZGVmaW5lZCA/IERFRkFVTFRfTE9BRF9BTkRfU0FWRSA6IG9wdGlvbnMubG9hZEFuZFNhdmU7XG4gICAgb3B0aW9ucy5vcGFjaXR5ICAgICAgICAgID0gb3B0aW9ucy5vcGFjaXR5ID09PSB1bmRlZmluZWQgPyBERUZBVUxUX09QQUNJVFkgOiBvcHRpb25zLm9wYWNpdHk7XG4gICAgb3B0aW9ucy5wYW5lbHNDbG9zYWJsZSAgID0gb3B0aW9ucy5wYW5lbHNDbG9zYWJsZSA9PT0gdW5kZWZpbmVkID8gREVGQVVMVF9QQU5FTFNfQ0xPU0FCTEUgOiBvcHRpb25zLnBhbmVsc0Nsb3NhYmxlO1xuICAgIG9wdGlvbnMudXNlRXh0ZXJuYWxTdHlsZSA9IG9wdGlvbnMudXNlRXh0ZXJuYWxTdHlsZSA9PT0gdW5kZWZpbmVkID8gZmFsc2UgOiBvcHRpb25zLnVzZUV4dGVybmFsU3R5bGU7XG4gICAgb3B0aW9ucy5lbmFibGUgICAgICAgICAgID0gb3B0aW9ucy5lbmFibGUgPT09IHVuZGVmaW5lZCA/IERFRkFVTFRfRU5BQkxFIDogb3B0aW9ucy5lbmFibGU7XG5cbiAgICBFdmVudERpc3BhdGNoZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgIHZhciBub2RlID0gbnVsbDtcbiAgICBpZiAoIW9wdGlvbnMucGFyZW50RG9tRWxlbWVudElkKSB7XG4gICAgICAgIG5vZGUgPSBuZXcgTm9kZSgpO1xuICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKG5vZGUuZ2V0RWxlbWVudCgpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBub2RlID0gTm9kZS5nZXROb2RlQnlJZChvcHRpb25zLnBhcmVudERvbUVsZW1lbnRJZCk7XG4gICAgfVxuXG4gICAgaWYoIW9wdGlvbnMudXNlRXh0ZXJuYWxTdHlsZSl7XG4gICAgICAgIHZhciBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG4gICAgICAgICAgICBzdHlsZS50eXBlID0gJ3RleHQvY3NzJztcbiAgICAgICAgdmFyIGNzcyA9ICFvcHRpb25zLnN0eWxlID8gcmVxdWlyZSgnLi9jb3JlL2RvY3VtZW50L1N0eWxlJykuc3RyaW5nIDogb3B0aW9ucy5zdHlsZVN0cmluZztcbiAgICAgICAgaWYoc3R5bGUuc3R5bGVzaGVldCl7XG4gICAgICAgICAgICBzdHlsZS5zdHlsZXNoZWV0LmNzc1RleHQgPSBjc3M7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzdHlsZS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3MpKTtcbiAgICAgICAgfVxuICAgICAgICAoZG9jdW1lbnQuaGVhZCB8fCBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdKS5hcHBlbmRDaGlsZChzdHlsZSk7XG4gICAgfVxuXG4gICAgbm9kZS5zZXRQcm9wZXJ0eSgnaWQnLCBDU1MuQ29udHJvbEtpdCk7XG5cbiAgICB0aGlzLl9ub2RlID0gbm9kZTtcbiAgICB0aGlzLl9wYW5lbHMgPSBbXTtcbiAgICB0aGlzLl9lbmFibGVkID0gb3B0aW9ucy5lbmFibGU7XG4gICAgdGhpcy5faGlzdG9yeUVuYWJsZWQgPSBvcHRpb25zLmhpc3Rvcnk7XG4gICAgdGhpcy5fc3RhdGVzRW5hYmxlZCA9IG9wdGlvbnMubG9hZEFuZFNhdmU7XG4gICAgdGhpcy5fcGFuZWxzQ2xvc2FibGUgPSBvcHRpb25zLnBhbmVsc0Nsb3NhYmxlO1xuXG4gICAgdmFyIGhpc3RvcnkgPSBIaXN0b3J5LnNldHVwKCk7XG5cbiAgICBpZiAoIXRoaXMuX2hpc3RvcnlFbmFibGVkKXtcbiAgICAgICAgaGlzdG9yeS5kaXNhYmxlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaGlzdG9yeS5hZGRFdmVudExpc3RlbmVyKEhpc3RvcnlFdmVudC5TVEFURV9QVVNILCB0aGlzLCAnb25IaXN0b3J5U3RhdGVQdXNoJyk7XG4gICAgICAgIGhpc3RvcnkuYWRkRXZlbnRMaXN0ZW5lcihIaXN0b3J5RXZlbnQuU1RBVEVfUE9QLCB0aGlzLCAnb25IaXN0b3J5U3RhdGVQb3AnKTtcbiAgICB9XG5cbiAgICBNb3VzZS5zZXR1cCgpO1xuICAgIFBpY2tlci5zZXR1cChub2RlKTtcbiAgICBPcHRpb25zLnNldHVwKG5vZGUpO1xuXG4gICAgdmFyIG9wYWNpdHkgPSBvcHRpb25zLm9wYWNpdHk7XG4gICAgaWYgKG9wYWNpdHkgIT0gMS4wICYmIG9wYWNpdHkgIT0gMC4wKSB7XG4gICAgICAgIG5vZGUuc2V0U3R5bGVQcm9wZXJ0eSgnb3BhY2l0eScsIG9wYWNpdHkpO1xuICAgIH1cblxuICAgIHRoaXMuX2NhblVwZGF0ZSA9IHRydWU7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgaW50ZXJ2YWwsXG4gICAgICAgIGNvdW50ID0gMCxcbiAgICAgICAgY291bnRNYXggPSAxMDtcblxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuV0lORE9XX1JFU0laRSxmdW5jdGlvbigpe1xuICAgICAgICBzZWxmLl9jYW5VcGRhdGUgPSBmYWxzZTtcbiAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG4gICAgICAgIGludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGlmKGNvdW50ID49IGNvdW50TWF4KXtcbiAgICAgICAgICAgICAgICBjb3VudCA9IDA7XG4gICAgICAgICAgICAgICAgc2VsZi5fY2FuVXBkYXRlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgIH0sMjUpXG4gICAgfSk7XG5cbiAgICB0aGlzLl9zaG9ydGN1dEVuYWJsZSA9IERFRkFVTFRfVFJJR0dFUl9TSE9SVENVVF9DSEFSO1xuXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsZnVuY3Rpb24oZSl7XG4gICAgICAgIGlmKCEoZS5jdHJsS2V5ICYmIFN0cmluZy5mcm9tQ2hhckNvZGUoZS53aGljaCB8fCBlLmtleUNvZGUpLnRvTG93ZXJDYXNlKCkgPT0gc2VsZi5fc2hvcnRjdXRFbmFibGUpKXtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBzZWxmLl9lbmFibGVkID0gIXNlbGYuX2VuYWJsZWQ7XG4gICAgICAgIGlmKHNlbGYuX2VuYWJsZWQpe1xuICAgICAgICAgICAgc2VsZi5fZW5hYmxlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzZWxmLl9kaXNhYmxlKCk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmKCF0aGlzLl9lbmFibGVkKXtcbiAgICAgICAgdGhpcy5fZGlzYWJsZSgpO1xuICAgIH1cblxuICAgIGluaXRpYXRlZCA9IHRydWU7XG59XG5Db250cm9sS2l0LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZSk7XG5Db250cm9sS2l0LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IENvbnRyb2xLaXQ7XG5cbi8qKlxuICogQWRkcyBhIHBhbmVsLlxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gUGFuZWwgb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9J0NvbnRyb2wgUGFuZWwnXSAtIFRoZSBwYW5lbCBsYWJlbFxuICogQHBhcmFtIHtOdW1iZXJ9IFtwYXJhbXMud2lkdGg9MzAwXSAtIFRoZSB3aWR0aFxuICogQHBhcmFtIHtOdW1iZXJ9IFtwYXJhbXMuaGVpZ2h0XSAtIENvbnN0cmFpbmVkIHBhbmVsIGhlaWdodFxuICogQHBhcmFtIHtOdW1iZXJ9IFtwYXJhbXMucmF0aW89NDBdIC0gVGhlIHJhdGlvIG9mIGxhYmVsIChkZWZhdWx0OjQwJSkgYW5kIGNvbXBvbmVudCAoZGVmYXVsdDo2MCUpIHdpZHRoXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy5hbGlnbj0ncmlnaHQnXSAtIEZsb2F0ICdsZWZ0JyBvciAncmlnaHQnLCBtdWx0aXBsZSBwYW5lbHMgZ2V0IGFsaWduZWQgbmV4dCB0byBlYWNoIG90aGVyXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtwYXJhbXMuZml4ZWQ9dHJ1ZV0gLSBJZiBmYWxzZSB0aGUgcGFuZWwgY2FuIGJlIG1vdmVkXG4gKiBAcGFyYW0ge0FycmF5fSBbcGFyYW1zLnBvc2l0aW9uPVswLDBdXSAtIElmIHVuZml4ZWQsIHRoZSBwYW5lbCBwYW5lbCBwb3NpdGlvbiByZWxhdGl2ZSB0byBhbGlnbm1lbnQgKGVnLiBpZiAnbGVmdCcgMCArIHBvc2l0aW9uWzBdIG9yIGlmICdyaWdodCcgd2luZG93LmlubmVySGVpZ2h0IC0gcG9zaXRpb25bMF0gLSBwYW5lbFdpZHRoKVxuICogQHBhcmFtIHtOdW1iZXJ9IFtwYXJhbXMub3BhY2l0eT0xLjBdIC0gVGhlIHBhbmVswrRzIG9wYWNpdHlcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmRvY2s9ZmFsc2VdIC0gKEV4cGVyaW1lbnRhbCkgSW5kaWNhdGVzIHdoZXRoZXIgdGhlIHBhbmVsIHNob3VsZCBiZSBkb2NrZWQgdG8gZWl0aGVyIHRoZSBsZWZ0IG9yIHJpZ2h0IHdpbmRvdyBib3JkZXIgKGRlcGVuZGluZyBvbiBwYXJhbXMuYWxpZ24pLCBkb2NrZWQgcGFuZWxzIGhlaWdodCBlcXVhbCB3aW5kb3cgaGVpZ2h0XG4gICogQHJldHVybnMge1BhbmVsfVxuICovXG5Db250cm9sS2l0LnByb3RvdHlwZS5hZGRQYW5lbCA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICB2YXIgcGFuZWwgPSBuZXcgUGFuZWwodGhpcywgcGFyYW1zKTtcbiAgICB0aGlzLl9wYW5lbHMucHVzaChwYW5lbCk7XG4gICAgcmV0dXJuIHBhbmVsO1xufTtcblxuLyoqXG4gKiBVcGRhdGVzIGFsbCBDb250cm9sS2l0IGNvbXBvbmVudHMgaWYgdGhlIHdhdFxuICovXG5Db250cm9sS2l0LnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLl9lbmFibGVkIHx8ICF0aGlzLl9jYW5VcGRhdGUpe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBpLCBqLCBrO1xuICAgIHZhciBsLCBtLCBuO1xuICAgIHZhciBwYW5lbHMgPSB0aGlzLl9wYW5lbHMsXG4gICAgICAgIHBhbmVsLFxuICAgICAgICBncm91cHMsXG4gICAgICAgIGNvbXBvbmVudHMsXG4gICAgICAgIGNvbXBvbmVudDtcblxuICAgIGkgPSAtMTsgbCA9IHBhbmVscy5sZW5ndGg7XG4gICAgd2hpbGUgKCsraSA8IGwpIHtcbiAgICAgICAgcGFuZWwgPSBwYW5lbHNbaV07XG5cbiAgICAgICAgaWYgKHBhbmVsLmlzRGlzYWJsZWQoKSl7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBncm91cHMgPSBwYW5lbC5nZXRHcm91cHMoKTtcbiAgICAgICAgaiA9IC0xOyBtID0gZ3JvdXBzLmxlbmd0aDtcblxuICAgICAgICB3aGlsZSAoKytqIDwgbSkge1xuICAgICAgICAgICAgY29tcG9uZW50cyA9IGdyb3Vwc1tqXS5nZXRDb21wb25lbnRzKCk7XG4gICAgICAgICAgICBrID0gLTE7IG4gPSBjb21wb25lbnRzLmxlbmd0aDtcblxuICAgICAgICAgICAgd2hpbGUgKCsrayA8IG4pIHtcbiAgICAgICAgICAgICAgICBjb21wb25lbnQgPSBjb21wb25lbnRzW2tdO1xuICAgICAgICAgICAgICAgIGlmIChjb21wb25lbnQuaXNEaXNhYmxlZCgpKXtcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjb21wb25lbnQgaW5zdGFuY2VvZiBWYWx1ZVBsb3R0ZXIgfHxcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50IGluc3RhbmNlb2YgU3RyaW5nT3V0cHV0IHx8XG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudCBpbnN0YW5jZW9mIE51bWJlck91dHB1dCkge1xuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQudXBkYXRlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxuQ29udHJvbEtpdC5wcm90b3R5cGUuaGlzdG9yeUlzRW5hYmxlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5faGlzdG9yeUVuYWJsZWQ7XG59O1xuXG5Db250cm9sS2l0LnByb3RvdHlwZS5zdGF0ZXNBcmVFbmFibGVkID0gZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gdGhpcy5fc3RhdGVzRW5hYmxlZDtcbn07XG5cbkNvbnRyb2xLaXQucHJvdG90eXBlLnBhbmVsc0FyZUNsb3NhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9wYW5lbHNDbG9zYWJsZTtcbn07XG5cbkNvbnRyb2xLaXQucHJvdG90eXBlLl9lbmFibGUgPSBmdW5jdGlvbigpe1xuICAgIHZhciBpID0gLTEsIHAgPSB0aGlzLl9wYW5lbHMsIGwgPSBwLmxlbmd0aDtcbiAgICB3aGlsZSAoKytpIDwgbCl7XG4gICAgICAgIHBbaV0uZW5hYmxlKCk7XG4gICAgfVxuICAgIHRoaXMuX25vZGUuc2V0U3R5bGVQcm9wZXJ0eSgndmlzaWJpbGl0eScsICcnKTtcbn07XG5cbkNvbnRyb2xLaXQucHJvdG90eXBlLl9kaXNhYmxlID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgaSA9IC0xLCBwID0gdGhpcy5fcGFuZWxzLCBsID0gcC5sZW5ndGg7XG4gICAgd2hpbGUgKCsraSA8IGwpe1xuICAgICAgICBwW2ldLmRpc2FibGUoKTtcbiAgICB9XG4gICAgdGhpcy5fbm9kZS5zZXRTdHlsZVByb3BlcnR5KCd2aXNpYmlsaXR5JywgJ2hpZGRlbicpO1xufTtcblxuLyoqXG4gKiBFbmFibGVzIGFuZCBzaG93cyBjb250cm9sS2l0LlxuICovXG5cbkNvbnRyb2xLaXQucHJvdG90eXBlLmVuYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9lbmFibGUoKTtcbiAgICB0aGlzLl9lbmFibGVkID0gdHJ1ZTtcbn07XG5cbi8qKlxuICogRGlzYWJsZSBhbmQgaGlkZXMgY29udHJvbEtpdC5cbiAqL1xuXG5Db250cm9sS2l0LnByb3RvdHlwZS5kaXNhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2Rpc2FibGUoKTtcbiAgICB0aGlzLl9lbmFibGVkID0gZmFsc2U7XG59O1xuXG5cbi8qKlxuICogU3BlY2lmaWVzIHRoZSBrZXkgdG8gYmUgdXNlZCB3aXRoIGN0cmwgJiBjaGFyLCB0byB0cmlnZ2VyIENvbnRyb2xLaXRzIHZpc2liaWxpdHkuXG4gKiBAcGFyYW0gY2hhclxuICovXG5cbkNvbnRyb2xLaXQucHJvdG90eXBlLnNldFNob3J0Y3V0RW5hYmxlID0gZnVuY3Rpb24oY2hhcil7XG4gICAgdGhpcy5fc2hvcnRjdXRFbmFibGUgPSBjaGFyO1xufTtcblxuQ29udHJvbEtpdC5wcm90b3R5cGUub25IaXN0b3J5U3RhdGVQdXNoID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIE1lbnVFdmVudC5VUERBVEVfTUVOVSwgbnVsbCkpO1xufTtcblxuQ29udHJvbEtpdC5wcm90b3R5cGUub25IaXN0b3J5U3RhdGVQb3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuVVBEQVRFX1ZBTFVFLCB7b3JpZ2luOiBudWxsfSkpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIE1lbnVFdmVudC5VUERBVEVfTUVOVSwgbnVsbCkpO1xufTtcblxuQ29udHJvbEtpdC5wcm90b3R5cGUubG9hZFNldHRpbmdzID0gZnVuY3Rpb24oZGF0YSl7XG4gICAgdmFyIGkgPSAtMSwgbCA9IGRhdGEubGVuZ3RoO1xuICAgIHZhciBwYW5lbHMgPSB0aGlzLl9wYW5lbHM7XG4gICAgd2hpbGUoKytpIDwgbCl7XG4gICAgICAgIHBhbmVsc1tpXS5zZXREYXRhKGRhdGFbaV0pO1xuICAgIH1cbn07XG5cbkNvbnRyb2xLaXQucHJvdG90eXBlLl9sb2FkU3RhdGUgPSBmdW5jdGlvbigpe1xuICAgIFN0YXRlLmxvYWQodGhpcy5sb2FkU2V0dGluZ3MuYmluZCh0aGlzKSk7XG59O1xuXG5Db250cm9sS2l0LnByb3RvdHlwZS5fc2F2ZVN0YXRlID0gZnVuY3Rpb24oKXtcbiAgICB0aGlzLnVwZGF0ZSgpOyAvL2ZvcmNlIHN5bmNcbiAgICB2YXIgcCA9IHRoaXMuX3BhbmVscywgaSA9IC0xLCBsID0gcC5sZW5ndGg7XG4gICAgdmFyIGRhdGEgPSBuZXcgQXJyYXkobCk7XG4gICAgd2hpbGUoKytpIDwgbCl7XG4gICAgICAgIGRhdGFbaV0gPSBwW2ldLmdldERhdGEoKTtcbiAgICB9XG4gICAgU3RhdGUuc2F2ZSh7ZGF0YTpkYXRhfSk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIHJvb3QgZWxlbWVudC5cbiAqIEByZXR1cm5zIHsqfVxuICovXG5cbkNvbnRyb2xLaXQucHJvdG90eXBlLmdldE5vZGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX25vZGU7XG59O1xuXG5Db250cm9sS2l0LmRlc3Ryb3kgPSBmdW5jdGlvbigpe1xuICAgIE1vdXNlLmdldCgpLmRlc3Ryb3koKTtcbiAgICBPcHRpb25zLmdldCgpLmRlc3Ryb3koKTtcbiAgICBQaWNrZXIuZ2V0KCkuZGVzdHJveSgpO1xuICAgIGluaXRpYXRlZCA9IGZhbHNlO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb250cm9sS2l0OyIsInZhciBFdmVudF8gICAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcbiAgICBOb2RlRXZlbnQgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50JyksXG4gICAgQ29tcG9uZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL0NvbXBvbmVudEV2ZW50Jyk7XG5cbnZhciBOb2RlICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKSxcbiAgICBDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jb3JlL0NvbXBvbmVudCcpO1xuXG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcblxudmFyIERFRkFVTFRfTEFCRUwgPSAnJztcblxuZnVuY3Rpb24gQnV0dG9uKHBhcmVudCxsYWJlbCxvblByZXNzLHBhcmFtcykge1xuICAgIG9uUHJlc3MgICAgICA9IG9uUHJlc3MgfHwgZnVuY3Rpb24oKXt9O1xuICAgIHBhcmFtcyAgICAgICA9IHBhcmFtcyAgICAgICB8fCB7fTtcbiAgICBwYXJhbXMubGFiZWwgPSBwYXJhbXMubGFiZWwgfHwgREVGQVVMVF9MQUJFTDtcblxuICAgIENvbXBvbmVudC5hcHBseSh0aGlzLFtwYXJlbnQscGFyYW1zLmxhYmVsXSk7XG5cbiAgICB2YXIgbm9kZSA9IG5ldyBOb2RlKE5vZGUuSU5QVVRfQlVUVE9OKTtcblxuICAgIG5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQnV0dG9uKTtcbiAgICBub2RlLnNldFByb3BlcnR5KCd2YWx1ZScsbGFiZWwpO1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIG5vZGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuT05fQ0xJQ0ssXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvblByZXNzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8oc2VsZixDb21wb25lbnRFdmVudC5WQUxVRV9VUERBVEVEKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgIHRoaXMuX3dyYXBOb2RlLmFkZENoaWxkKG5vZGUpO1xufVxuQnV0dG9uLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoQ29tcG9uZW50LnByb3RvdHlwZSk7XG5CdXR0b24ucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQnV0dG9uO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJ1dHRvbjtcbiIsInZhciBFdmVudERpc3BhdGNoZXIgICAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnREaXNwYXRjaGVyJyk7XG52YXIgT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIgPSByZXF1aXJlKCcuLi9jb3JlL09iamVjdENvbXBvbmVudE5vdGlmaWVyJyk7XG5cbnZhciBFdmVudF8gICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcbiAgICBPcHRpb25FdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvT3B0aW9uRXZlbnQnKSxcbiAgICBOb2RlRXZlbnQgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50Jyk7XG5cbnZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcblxuZnVuY3Rpb24gQnV0dG9uUHJlc2V0KHBhcmVudE5vZGUpIHtcbiAgICBFdmVudERpc3BhdGNoZXIuYXBwbHkodGhpcyk7XG4gICAgdmFyIG5vZGUgICAgPSB0aGlzLl9idG5Ob2RlID0gbmV3IE5vZGUoTm9kZS5JTlBVVF9CVVRUT04pLFxuICAgICAgICBpbWdOb2RlID0gdGhpcy5faW5kaU5vZGUgPSBuZXcgTm9kZSgpO1xuXG4gICAgdGhpcy5fb25BY3RpdmUgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICB0aGlzLl9vbkRlYWN0aXZlID0gZnVuY3Rpb24gKCkge307XG4gICAgdGhpcy5faXNBY3RpdmUgPSBmYWxzZTtcblxuICAgIG5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQnV0dG9uUHJlc2V0KTtcbiAgICBub2RlLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uTW91c2VEb3duLmJpbmQodGhpcykpO1xuXG4gICAgbm9kZS5hZGRDaGlsZChpbWdOb2RlKTtcbiAgICBwYXJlbnROb2RlLmFkZENoaWxkQXQobm9kZSwgMCk7XG5cbiAgICBPYmplY3RDb21wb25lbnROb3RpZmllci5nZXQoKS5hZGRFdmVudExpc3RlbmVyKE9wdGlvbkV2ZW50LlRSSUdHRVIsIHRoaXMsICdvbk9wdGlvblRyaWdnZXInKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoT3B0aW9uRXZlbnQuVFJJR0dFUkVELCBPYmplY3RDb21wb25lbnROb3RpZmllci5nZXQoKSwgJ29uT3B0aW9uVHJpZ2dlcmVkJyk7XG59XG5CdXR0b25QcmVzZXQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudERpc3BhdGNoZXIucHJvdG90eXBlKTtcbkJ1dHRvblByZXNldC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBCdXR0b25QcmVzZXQ7XG5cbkJ1dHRvblByZXNldC5wcm90b3R5cGUub25PcHRpb25UcmlnZ2VyID0gZnVuY3Rpb24oZSl7XG4gICAgaWYoZS5kYXRhLm9yaWdpbiA9PSB0aGlzKXtcbiAgICAgICAgaWYoIXRoaXMuX2lzQWN0aXZlKXtcbiAgICAgICAgICAgIHRoaXMuX29uQWN0aXZlKCk7XG4gICAgICAgICAgICB0aGlzLl9idG5Ob2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkJ1dHRvblByZXNldEFjdGl2ZSk7XG4gICAgICAgICAgICB0aGlzLl9pc0FjdGl2ZSA9IHRydWU7XG4gICAgICAgIH0gZWxzZXtcbiAgICAgICAgICAgIHRoaXMuX29uRGVhY3RpdmUoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYodGhpcy5faXNBY3RpdmUpe1xuICAgICAgICB0aGlzLmRlYWN0aXZhdGUoKTtcbiAgICB9XG59O1xuXG5CdXR0b25QcmVzZXQucHJvdG90eXBlLl9vbk1vdXNlRG93biA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgT3B0aW9uRXZlbnQuVFJJR0dFUkVELCBudWxsKSk7XG59O1xuXG5CdXR0b25QcmVzZXQucHJvdG90eXBlLnNldE9uQWN0aXZlID0gZnVuY3Rpb24oZnVuYyl7XG4gICAgdGhpcy5fb25BY3RpdmUgPSBmdW5jO1xufTtcblxuQnV0dG9uUHJlc2V0LnByb3RvdHlwZS5zZXRPbkRlYWN0aXZlID0gZnVuY3Rpb24oZnVuYyl7XG4gICAgdGhpcy5fb25EZWFjdGl2ZSA9IGZ1bmM7XG59O1xuXG5CdXR0b25QcmVzZXQucHJvdG90eXBlLmRlYWN0aXZhdGUgPSBmdW5jdGlvbigpe1xuICAgIHRoaXMuX2lzQWN0aXZlID0gZmFsc2U7XG4gICAgdGhpcy5fYnRuTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5CdXR0b25QcmVzZXQpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBCdXR0b25QcmVzZXQ7XG4iLCJ2YXIgQ29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY29yZS9Db21wb25lbnQnKTtcbnZhciBDU1MgICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpLFxuICAgIE1ldHJpYyAgICA9IHJlcXVpcmUoJy4vTWV0cmljJyk7XG5cbnZhciBFdmVudF8gICAgID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIEdyb3VwRXZlbnQgPSByZXF1aXJlKCcuLi9ncm91cC9Hcm91cEV2ZW50Jyk7XG5cbmZ1bmN0aW9uIENhbnZhcyhwYXJlbnQscGFyYW1zKSB7XG4gICAgQ29tcG9uZW50LmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuICAgIHZhciB3cmFwID0gdGhpcy5fd3JhcE5vZGU7XG4gICAgICAgIHdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuQ2FudmFzV3JhcCk7XG4gICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgICAgICB3cmFwLmdldEVsZW1lbnQoKS5hcHBlbmRDaGlsZChjYW52YXMpO1xuXG4gICAgdmFyIHdpZHRoID0gd3JhcC5nZXRXaWR0aCgpO1xuICAgIHRoaXMuX2NhbnZhc1dpZHRoID0gdGhpcy5fY2FudmFzSGVpZ2h0ID0gMDtcbiAgICB0aGlzLl9zZXRDYW52YXNTaXplKHdpZHRoLHdpZHRoKTtcbiAgICB0aGlzLl91cGRhdGVIZWlnaHQoKTtcblxuICAgIHRoaXMuX25vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQ2FudmFzTGlzdEl0ZW0pO1xuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UsdGhpcywgICdvbkdyb3VwU2l6ZUNoYW5nZScpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LkdST1VQX1NJWkVfVVBEQVRFLHRoaXMuX3BhcmVudCwnb25Hcm91cFNpemVVcGRhdGUnKTtcbn1cbkNhbnZhcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKENvbXBvbmVudC5wcm90b3R5cGUpO1xuQ2FudmFzLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IENhbnZhcztcblxuQ2FudmFzLnByb3RvdHlwZS5fdXBkYXRlSGVpZ2h0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW52YXNIZWlnaHQgPSB0aGlzLl9jYW52YXMuaGVpZ2h0O1xuXG4gICAgdGhpcy5fd3JhcE5vZGUuc2V0SGVpZ2h0KGNhbnZhc0hlaWdodCk7XG4gICAgdGhpcy5fbm9kZS5zZXRIZWlnaHQoY2FudmFzSGVpZ2h0ICsgTWV0cmljLlBBRERJTkdfV1JBUFBFUik7XG59O1xuXG5DYW52YXMucHJvdG90eXBlLm9uR3JvdXBTaXplQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB3aWR0aCA9IHRoaXMuX3dyYXBOb2RlLmdldFdpZHRoKCk7XG5cbiAgICB0aGlzLl9zZXRDYW52YXNTaXplKHdpZHRoLCB3aWR0aCk7XG4gICAgdGhpcy5fdXBkYXRlSGVpZ2h0KCk7XG4gICAgdGhpcy5fcmVkcmF3KCk7XG5cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBHcm91cEV2ZW50LkdST1VQX1NJWkVfVVBEQVRFLCBudWxsKSk7XG59O1xuXG5DYW52YXMucHJvdG90eXBlLl9zZXRDYW52YXNTaXplID0gZnVuY3Rpb24gKHdpZHRoLCBoZWlnaHQpIHtcbiAgICB2YXIgY2FudmFzV2lkdGggPSB0aGlzLl9jYW52YXNXaWR0aCA9IHdpZHRoLFxuICAgICAgICBjYW52YXNIZWlnaHQgPSB0aGlzLl9jYW52YXNIZWlnaHQgPSBoZWlnaHQ7XG5cbiAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzO1xuICAgICAgICBjYW52YXMuc3R5bGUud2lkdGggPSBjYW52YXNXaWR0aCArICdweCc7XG4gICAgICAgIGNhbnZhcy5zdHlsZS5oZWlnaHQgPSBjYW52YXNIZWlnaHQgKyAncHgnO1xuICAgICAgICBjYW52YXMud2lkdGggPSBjYW52YXNXaWR0aDtcbiAgICAgICAgY2FudmFzLmhlaWdodCA9IGNhbnZhc0hlaWdodDtcbn07XG5cbkNhbnZhcy5wcm90b3R5cGUuZ2V0Q2FudmFzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9jYW52YXM7XG59O1xuXG5DYW52YXMucHJvdG90eXBlLmdldENvbnRleHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYW52YXM7XG4iLCJ2YXIgT2JqZWN0Q29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY29yZS9PYmplY3RDb21wb25lbnQnKSxcbiAgICBOb2RlICAgICAgICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcblxudmFyIEV2ZW50XyAgICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIE5vZGVFdmVudCAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKSxcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKTtcblxuZnVuY3Rpb24gQ2hlY2tib3gocGFyZW50LCBvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICBPYmplY3RDb21wb25lbnQuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG4gICAgcGFyYW1zID0gcGFyYW1zIHx8IHt9O1xuICAgIHBhcmFtcy5vbkNoYW5nZSA9IHBhcmFtcy5vbkNoYW5nZSB8fCB0aGlzLl9vbkNoYW5nZTtcbiAgICB0aGlzLl9vbkNoYW5nZSA9IHBhcmFtcy5vbkNoYW5nZTtcblxuICAgIHZhciBub2RlID0gdGhpcy5faW5wdXQgPSBuZXcgTm9kZShOb2RlLklOUFVUX0NIRUNLQk9YKTtcbiAgICBub2RlLnNldFByb3BlcnR5KCdjaGVja2VkJyx0aGlzLl9vYmpbdGhpcy5fa2V5XSk7XG4gICAgbm9kZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5DSEFOR0UsdGhpcy5fb25JbnB1dENoYW5nZS5iaW5kKHRoaXMpKTtcblxuICAgIHRoaXMuX3dyYXBOb2RlLmFkZENoaWxkKHRoaXMuX2lucHV0KTtcbn1cbkNoZWNrYm94LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZSk7XG5DaGVja2JveC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBDaGVja2JveDtcblxuQ2hlY2tib3gucHJvdG90eXBlLmFwcGx5VmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5wdXNoSGlzdG9yeVN0YXRlKCk7XG5cbiAgICB2YXIgb2JqID0gdGhpcy5fb2JqLCBrZXkgPSB0aGlzLl9rZXk7XG4gICAgb2JqW2tleV0gPSAhb2JqW2tleV07XG5cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBDb21wb25lbnRFdmVudC5WQUxVRV9VUERBVEVELCBudWxsKSk7XG59O1xuXG5DaGVja2JveC5wcm90b3R5cGUuX29uSW5wdXRDaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5hcHBseVZhbHVlKCk7XG4gICAgdGhpcy5fb25DaGFuZ2UoKTtcbn07XG5cbkNoZWNrYm94LnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAoZS5kYXRhLm9yaWdpbiA9PSB0aGlzKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl9pbnB1dC5zZXRQcm9wZXJ0eSgnY2hlY2tlZCcsIHRoaXMuX29ialt0aGlzLl9rZXldKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ2hlY2tib3g7IiwidmFyIE9iamVjdENvbXBvbmVudCA9IHJlcXVpcmUoJy4vLi4vY29yZS9PYmplY3RDb21wb25lbnQnKTtcblxudmFyIE5vZGUgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xudmFyIENvbG9yTW9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvY29sb3IvQ29sb3JNb2RlJyk7XG52YXIgUGlja2VyICAgID0gcmVxdWlyZSgnLi9QaWNrZXInKTtcbnZhciBDb2xvclV0aWwgPSByZXF1aXJlKCcuLi9jb3JlL2NvbG9yL0NvbG9yVXRpbCcpO1xudmFyIE9wdGlvbnMgICA9IHJlcXVpcmUoJy4vT3B0aW9ucycpO1xudmFyIEJ1dHRvblByZXNldCA9IHJlcXVpcmUoJy4vQnV0dG9uUHJlc2V0Jyk7XG52YXIgTWV0cmljICAgICAgID0gcmVxdWlyZSgnLi9NZXRyaWMnKSxcblx0Q1NTICAgICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcblxudmFyIEV2ZW50XyAgICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuXHROb2RlRXZlbnQgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50JyksXG5cdENvbXBvbmVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9Db21wb25lbnRFdmVudCcpO1xuXG52YXIgQ29sb3JGb3JtYXRFcnJvciA9IHJlcXVpcmUoJy4uL2NvcmUvY29sb3IvQ29sb3JGb3JtYXRFcnJvcicpO1xuXG52YXIgREVGQVVMVF9DT0xPUl9NT0RFID0gQ29sb3JNb2RlLkhFWCxcblx0REVGQVVMVF9QUkVTRVRTICAgID0gbnVsbDtcblxudmFyIE1TR19DT0xPUl9GT1JNQVRfSEVYICAgICAgICAgICAgICAgICAgPSAnQ29sb3IgZm9ybWF0IHNob3VsZCBiZSBoZXguIFNldCBjb2xvck1vZGUgdG8gcmdiLCByZ2JmdiBvciBoc3YuJyxcblx0TVNHX0NPTE9SX0ZPUk1BVF9SR0JfUkdCRlZfSFNWICAgICAgICA9ICdDb2xvciBmb3JtYXQgc2hvdWxkIGJlIHJnYiwgcmdiZnYgb3IgaHN2LiBTZXQgY29sb3JNb2RlIHRvIGhleC4nLFxuXHRNU0dfQ09MT1JfUFJFU0VUX0ZPUk1BVF9IRVggICAgICAgICAgID0gJ1ByZXNldCBjb2xvciBmb3JtYXQgc2hvdWxkIGJlIGhleC4nLFxuXHRNU0dfQ09MT1JfUFJFU0VUX0ZPUk1BVF9SR0JfUkdCRlZfSFNWID0gJ1ByZXNldCBjb2xvciBmb3JtYXQgc2hvdWxkIGJlIHJnYiwgcmdiZnYgb3IgaHN2Lic7XG5cbmZ1bmN0aW9uIENvbG9yKHBhcmVudCwgb2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG5cdE9iamVjdENvbXBvbmVudC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG5cdHBhcmFtcyA9IHBhcmFtcyB8fCB7fTtcblx0cGFyYW1zLnByZXNldHMgPSBwYXJhbXMucHJlc2V0cyB8fCBERUZBVUxUX1BSRVNFVFM7XG5cdHBhcmFtcy5jb2xvck1vZGUgPSBwYXJhbXMuY29sb3JNb2RlIHx8IERFRkFVTFRfQ09MT1JfTU9ERTtcblxuXHR0aGlzLl9wcmVzZXRzS2V5ID0gcGFyYW1zLnByZXNldHM7XG5cblx0dmFyIGNvbG9yID0gdGhpcy5fY29sb3IgPSBuZXcgTm9kZSgpO1xuXHR2YWx1ZSA9IHRoaXMuX3ZhbHVlID0gdGhpcy5fb2JqW3RoaXMuX2tleV07XG5cblx0dmFyIGNvbG9yTW9kZSA9IHRoaXMuX2NvbG9yTW9kZSA9IHBhcmFtcy5jb2xvck1vZGU7XG5cblx0dGhpcy5fdmFsaWRhdGVDb2xvckZvcm1hdCh2YWx1ZSwgTVNHX0NPTE9SX0ZPUk1BVF9IRVgsIE1TR19DT0xPUl9GT1JNQVRfUkdCX1JHQkZWX0hTVik7XG5cblx0dmFyIHdyYXAgPSB0aGlzLl93cmFwTm9kZTtcblxuXHRpZiAoIXRoaXMuX3ByZXNldHNLZXkpIHtcblx0XHRjb2xvci5zZXRTdHlsZUNsYXNzKENTUy5Db2xvcik7XG5cdFx0d3JhcC5hZGRDaGlsZChjb2xvcik7XG5cdH1cblx0ZWxzZSB7XG5cdFx0Y29sb3Iuc2V0U3R5bGVDbGFzcyhDU1MuQ29sb3IpO1xuXG5cdFx0dmFyIHdyYXBfID0gbmV3IE5vZGUoKTtcblx0XHR3cmFwXy5zZXRTdHlsZUNsYXNzKENTUy5XcmFwQ29sb3JXUHJlc2V0KTtcblxuXHRcdHdyYXAuYWRkQ2hpbGQod3JhcF8pO1xuXHRcdHdyYXBfLmFkZENoaWxkKGNvbG9yKTtcblxuXHRcdHZhciBwcmVzZXRzID0gdGhpcy5fb2JqW3RoaXMuX3ByZXNldHNLZXldO1xuXG5cdFx0dmFyIGkgPSAtMTtcblx0XHR3aGlsZSAoKytpIDwgcHJlc2V0cy5sZW5ndGgpIHtcblx0XHRcdHRoaXMuX3ZhbGlkYXRlQ29sb3JGb3JtYXQocHJlc2V0c1tpXSwgTVNHX0NPTE9SX1BSRVNFVF9GT1JNQVRfSEVYLFxuXHRcdFx0XHRNU0dfQ09MT1JfUFJFU0VUX0ZPUk1BVF9SR0JfUkdCRlZfSFNWKTtcblx0XHR9XG5cblx0XHR2YXIgb3B0aW9ucyA9IE9wdGlvbnMuZ2V0KCksXG5cdFx0XHRwcmVzZXRCdG4gPSBuZXcgQnV0dG9uUHJlc2V0KHdyYXApO1xuXG5cdFx0dmFyIG9uUHJlc2V0RGVhY3RpdmF0ZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdG9wdGlvbnMuY2xlYXIoKTtcblx0XHRcdHByZXNldEJ0bi5kZWFjdGl2YXRlKCk7XG5cdFx0fTtcblxuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHR2YXIgb25QcmVzZXRBY3RpdmF0ZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdG9wdGlvbnMuYnVpbGQocHJlc2V0cyxcblx0XHRcdFx0c2VsZi5fdmFsdWUsXG5cdFx0XHRcdGNvbG9yLFxuXHRcdFx0XHRmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0c2VsZi5wdXNoSGlzdG9yeVN0YXRlKCk7XG5cdFx0XHRcdFx0c2VsZi5fdmFsdWUgPSBwcmVzZXRzW29wdGlvbnMuZ2V0U2VsZWN0ZWRJbmRleCgpXTtcblx0XHRcdFx0XHRzZWxmLmFwcGx5VmFsdWUoKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0b25QcmVzZXREZWFjdGl2YXRlLFxuXHRcdFx0XHRNZXRyaWMuUEFERElOR19QUkVTRVQsXG5cdFx0XHRcdHRydWUsXG5cdFx0XHRcdGNvbG9yTW9kZSk7XG5cdFx0fTtcblx0XHRwcmVzZXRCdG4uc2V0T25BY3RpdmUob25QcmVzZXRBY3RpdmF0ZSk7XG5cdFx0cHJlc2V0QnRuLnNldE9uRGVhY3RpdmUob25QcmVzZXREZWFjdGl2YXRlKTtcblx0fVxuXG5cdGNvbG9yLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uQ29sb3JUcmlnZ2VyLmJpbmQodGhpcykpO1xuXHR0aGlzLl91cGRhdGVDb2xvcigpO1xufVxuQ29sb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShPYmplY3RDb21wb25lbnQucHJvdG90eXBlKTtcbkNvbG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IENvbG9yO1xuXG5Db2xvci5wcm90b3R5cGUuX29uQ29sb3JUcmlnZ2VyID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgY29sb3JNb2RlID0gdGhpcy5fY29sb3JNb2RlLFxuXHRcdGNvbG9yTW9kZUhFWCA9IENvbG9yTW9kZS5IRVgsXG5cdFx0Y29sb3JNb2RlUkdCID0gQ29sb3JNb2RlLlJHQixcblx0XHRjb2xvck1vZGVSR0JmdiA9IENvbG9yTW9kZS5SR0Jmdixcblx0XHRjb2xvck1vZGVIU1YgPSBDb2xvck1vZGUuSFNWO1xuXG5cdHZhciB2YWx1ZSA9IHRoaXMuX3ZhbHVlLFxuXHRcdHRlbXA7XG5cblx0dmFyIG9uUGlja2VyUGljayA9IGZ1bmN0aW9uICgpIHtcblx0XHR0aGlzLnB1c2hIaXN0b3J5U3RhdGUoKTtcblxuXHRcdHN3aXRjaCAoY29sb3JNb2RlKSB7XG5cdFx0XHRjYXNlIGNvbG9yTW9kZUhFWDpcblx0XHRcdFx0dGhpcy5fdmFsdWUgPSBQaWNrZXIuZ2V0KCkuZ2V0SEVYKCk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSBjb2xvck1vZGVSR0I6XG5cdFx0XHRcdC8vaWYgdmFsID0gRmxvYXQzMmFycmF5IG9yIHNvXG5cdFx0XHRcdHRlbXAgPSBQaWNrZXIuZ2V0KCkuZ2V0UkdCKCk7XG5cdFx0XHRcdHZhbHVlWzBdID0gdGVtcFswXTtcblx0XHRcdFx0dmFsdWVbMV0gPSB0ZW1wWzFdO1xuXHRcdFx0XHR2YWx1ZVsyXSA9IHRlbXBbMl07XG5cdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRjYXNlIGNvbG9yTW9kZVJHQmZ2OlxuXHRcdFx0XHR0ZW1wID0gUGlja2VyLmdldCgpLmdldFJHQmZ2KCk7XG5cdFx0XHRcdHZhbHVlWzBdID0gdGVtcFswXTtcblx0XHRcdFx0dmFsdWVbMV0gPSB0ZW1wWzFdO1xuXHRcdFx0XHR2YWx1ZVsyXSA9IHRlbXBbMl07XG5cdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRjYXNlIGNvbG9yTW9kZUhTVjpcblx0XHRcdFx0dGhpcy5fdmFsdWUgPSBQaWNrZXIuZ2V0KCkuZ2V0SFNWKCk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblxuXHRcdHRoaXMuYXBwbHlWYWx1ZSgpO1xuXG5cdH0uYmluZCh0aGlzKTtcblxuXHR2YXIgcGlja2VyID0gUGlja2VyLmdldCgpO1xuXG5cdHN3aXRjaCAoY29sb3JNb2RlKSB7XG5cdFx0Y2FzZSBjb2xvck1vZGVIRVg6XG5cdFx0XHRwaWNrZXIuc2V0Q29sb3JIRVgodmFsdWUpO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSBjb2xvck1vZGVSR0I6XG5cdFx0XHRwaWNrZXIuc2V0Q29sb3JSR0IodmFsdWVbMF0sIHZhbHVlWzFdLCB2YWx1ZVsyXSk7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlIGNvbG9yTW9kZVJHQmZ2OlxuXHRcdFx0cGlja2VyLnNldENvbG9yUkdCZnYodmFsdWVbMF0sIHZhbHVlWzFdLCB2YWx1ZVsyXSk7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlIGNvbG9yTW9kZUhTVjpcblx0XHRcdHBpY2tlci5zZXRDb2xvckhTVih2YWx1ZVswXSwgdmFsdWVbMV0sIHZhbHVlWzJdKTtcblx0XHRcdGJyZWFrO1xuXHR9XG5cblx0cGlja2VyLnNldENhbGxiYWNrUGljayhvblBpY2tlclBpY2spO1xuXHRwaWNrZXIub3BlbigpO1xufTtcblxuQ29sb3IucHJvdG90eXBlLmFwcGx5VmFsdWUgPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMuX29ialt0aGlzLl9rZXldID0gdGhpcy5fdmFsdWU7XG5cdHRoaXMuX3VwZGF0ZUNvbG9yKCk7XG5cdHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIG51bGwpKTtcbn07XG5cbkNvbG9yLnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24gKGUpIHtcblx0aWYgKGUuZGF0YS5vcmlnaW4gPT0gdGhpcylyZXR1cm47XG5cdHRoaXMuX3ZhbHVlID0gdGhpcy5fb2JqW3RoaXMuX2tleV07XG5cdHRoaXMuX3VwZGF0ZUNvbG9yKCk7XG59O1xuXG5Db2xvci5wcm90b3R5cGUuX3VwZGF0ZUNvbG9yID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgY29sb3IgPSB0aGlzLl92YWx1ZSxcblx0XHRjb2xvck5vZGUgPSB0aGlzLl9jb2xvcixcblx0XHRub2RlQ29sb3I7XG5cblx0Y29sb3JOb2RlLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCBjb2xvcik7XG5cblx0c3dpdGNoICh0aGlzLl9jb2xvck1vZGUpIHtcblx0XHRjYXNlIENvbG9yTW9kZS5IRVg6XG5cdFx0XHRub2RlQ29sb3IgPSBjb2xvcjtcblx0XHRcdGJyZWFrO1xuXG5cdFx0Y2FzZSBDb2xvck1vZGUuUkdCOlxuXHRcdFx0bm9kZUNvbG9yID0gQ29sb3JVdGlsLlJHQjJIRVgoY29sb3JbMF0sIGNvbG9yWzFdLCBjb2xvclsyXSk7XG5cdFx0XHRicmVhaztcblxuXHRcdGNhc2UgQ29sb3JNb2RlLlJHQmZ2OlxuXHRcdFx0bm9kZUNvbG9yID0gQ29sb3JVdGlsLlJHQmZ2MkhFWChjb2xvclswXSwgY29sb3JbMV0sIGNvbG9yWzJdKTtcblx0XHRcdGJyZWFrO1xuXG5cdFx0Y2FzZSBDb2xvck1vZGUuSFNWOlxuXHRcdFx0bm9kZUNvbG9yID0gQ29sb3JVdGlsLkhTVjJSR0IoY29sb3JbMF0sIGNvbG9yWzFdLCBjb2xvclsyXSk7XG5cdFx0XHRicmVhaztcblx0fVxuXG5cdGNvbG9yTm9kZS5nZXRTdHlsZSgpLmJhY2tncm91bmRDb2xvciA9IG5vZGVDb2xvcjtcbn07XG5cbkNvbG9yLnByb3RvdHlwZS5fdmFsaWRhdGVDb2xvckZvcm1hdCA9IGZ1bmN0aW9uICh2YWx1ZSwgbXNnSGV4LCBtc2dBcnIpIHtcblx0dmFyIGNvbG9yTW9kZSA9IHRoaXMuX2NvbG9yTW9kZTtcblxuXHRpZiAoY29sb3JNb2RlID09IENvbG9yTW9kZS5IRVggJiYgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gJ1tvYmplY3QgQXJyYXldJyB8fFxuXHRcdGNvbG9yTW9kZSA9PSBDb2xvck1vZGUuSEVYICYmIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IEZsb2F0MzJBcnJheV0nKSB7XG5cdFx0dGhyb3cgbmV3IENvbG9yRm9ybWF0RXJyb3IobXNnSGV4KTtcblx0fVxuXHRpZiAoKGNvbG9yTW9kZSA9PSBDb2xvck1vZGUuUkdCIHx8XG5cdFx0Y29sb3JNb2RlID09IENvbG9yTW9kZS5SR0JmdiB8fFxuXHRcdGNvbG9yTW9kZSA9PSBDb2xvck1vZGUuSFNWKSAmJlxuXHRcdE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgIT09ICdbb2JqZWN0IEFycmF5XScgfHxcblx0XHRjb2xvck1vZGUgPT0gQ29sb3JNb2RlLkhTViAmJlxuXHRcdE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgIT09ICdbb2JqZWN0IEZsb2F0MzJBcnJheV0nKSB7XG5cdFx0dGhyb3cgbmV3IENvbG9yRm9ybWF0RXJyb3IobXNnQXJyKTtcblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb2xvcjsiLCJ2YXIgRnVuY3Rpb25QbG90VHlwZSA9IHtcbiAgICBJTVBMSUNJVDogJ2ltcGxpY2l0JyxcbiAgICBOT05fSU1QTElDSVQ6ICdub25JbXBsaWNpdCdcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRnVuY3Rpb25QbG90VHlwZTsiLCJ2YXIgUGxvdHRlciA9IHJlcXVpcmUoJy4vUGxvdHRlcicpO1xuXG52YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG52YXIgRnVuY3Rpb25QbG90VHlwZSA9IHJlcXVpcmUoJy4vRnVuY3Rpb25QbG90VHlwZScpO1xuXG5cbnZhciBNb3VzZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTW91c2UnKTtcbnZhciBNZXRyaWMgPSByZXF1aXJlKCcuL01ldHJpYycpO1xuXG52YXIgRG9jdW1lbnRFdmVudCAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKSxcbiAgICBOb2RlRXZlbnQgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50Jyk7XG5cbnZhciBGdW5jdGlvblBsb3R0ZXJPYmplY3RFcnJvciAgICAgICA9IHJlcXVpcmUoJy4vRnVuY3Rpb25QbG90dGVyT2JqZWN0RXJyb3InKSxcbiAgICBGdW5jdGlvblBsb3R0ZXJGdW5jdGlvbkFyZ3NFcnJvciA9IHJlcXVpcmUoJy4vRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3InKTtcblxudmFyIE9iamVjdENvbXBvbmVudE5vdGlmaWVyID0gcmVxdWlyZSgnLi4vY29yZS9PYmplY3RDb21wb25lbnROb3RpZmllcicpO1xuXG52YXIgREVGQVVMVF9TSE9XX01JTl9NQVhfTEFCRUxTID0gdHJ1ZTtcblxudmFyIERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9OT05fSU1QTElDSVRfVU5JVF9YICA9ICAxLFxuICAgIERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9OT05fSU1QTElDSVRfVU5JVF9ZICA9ICAxLFxuICAgIERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9JTVBMSUNJVF9VTklUX1ggID0gMC4yNSxcbiAgICBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfSU1QTElDSVRfVU5JVF9ZICA9IDAuMjUsXG4gICAgREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX1VOSVRfTUlOICA9IDAuMTUsXG4gICAgREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX1VOSVRfTUFYICA9IDQsXG4gICAgREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX05PTl9JTVBMSUNJVF9TQ0FMRSAgPSAxMC4wLFxuICAgIERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9JTVBMSUNJVF9TQ0FMRSA9IDEuMCxcbiAgICBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfU0NBTEVfTUlOID0gMC4wMixcbiAgICBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfU0NBTEVfTUFYID0gMjUsXG5cbiAgICBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfSU1QTElDSVRfQVhFU19DT0xPUiA9ICdyZ2JhKDI1NSwyNTUsMjU1LDAuNzUpJyxcbiAgICBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfSU1QTElDSVRfR1JJRF9DT0xPUiA9ICdyZ2JhKDI1LDI1LDI1LDAuNzUpJyxcblxuICAgIERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9OT05fSU1QTElDSVRfQVhFU19DT0xPUiA9ICdyZ2IoNTQsNjAsNjQpJyxcbiAgICBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfTk9OX0lNUExJQ0lUX0dSSURfQ09MT1IgPSAncmdiKDI1LDI1LDI1KScsXG5cbiAgICBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfQ0lSQ0xFX0xBQkVMX1JBRElVUyA9IDMsXG4gICAgREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX0NJUkNMRV9MQUJFTF9GSUxMICAgPSAncmdiKDI1NSwyNTUsMjU1KScsXG4gICAgREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX0NJUkNMRV9TVFJPS0UgICAgICAgPSAnI2IxMjMzNCc7XG5cbmZ1bmN0aW9uIEZ1bmN0aW9uUGxvdHRlcihwYXJlbnQsIG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuICAgIHBhcmFtcyA9IHBhcmFtcyB8fCB7fTtcbiAgICBwYXJhbXMuc2hvd01pbk1heExhYmVscyA9IHBhcmFtcy5zaG93TWluTWF4TGFiZWxzID09PSB1bmRlZmluZWQgPyBERUZBVUxUX1NIT1dfTUlOX01BWF9MQUJFTFMgOiBwYXJhbXMuc2hvd01pbk1heExhYmVscztcblxuICAgIFBsb3R0ZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgIGlmICh0eXBlb2Ygb2JqZWN0W3ZhbHVlXSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aHJvdyBuZXcgRnVuY3Rpb25QbG90dGVyT2JqZWN0RXJyb3Iob2JqZWN0LHZhbHVlKTtcbiAgICB9XG5cbiAgICB2YXIgZnVuY0FyZ0xlbmd0aCA9IG9iamVjdFt2YWx1ZV0ubGVuZ3RoO1xuXG4gICAgaWYgKGZ1bmNBcmdMZW5ndGggPiAyIHx8IGZ1bmNBcmdMZW5ndGggPT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3IoKTtcbiAgICB9XG5cbiAgICB2YXIgc3ZnUm9vdCA9IHRoaXMuX3N2Z1Jvb3QsXG4gICAgICAgIHBhdGggPSB0aGlzLl9wYXRoO1xuXG4gICAgdmFyIGF4ZXMgPSB0aGlzLl9heGVzID0gc3ZnUm9vdC5pbnNlcnRCZWZvcmUodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdwYXRoJyksIHBhdGgpO1xuICAgICAgICBheGVzLnN0eWxlLnN0cm9rZVdpZHRoID0gMTtcblxuICAgIHZhciBheGVzTGFiZWxzID0gdGhpcy5fYXhlc0xhYmVscyA9IHN2Z1Jvb3QuaW5zZXJ0QmVmb3JlKHRoaXMuX2NyZWF0ZVNWR09iamVjdCgncGF0aCcpLCBwYXRoKTtcbiAgICAgICAgYXhlc0xhYmVscy5zdHlsZS5zdHJva2UgPSAncmdiKDQzLDQ4LDUxKSc7XG4gICAgICAgIGF4ZXNMYWJlbHMuc3R5bGUuc3Ryb2tlV2lkdGggPSAxO1xuXG4gICAgdmFyIGdyaWQgPSB0aGlzLl9ncmlkO1xuXG4gICAgdmFyIHN2ZyA9IHRoaXMuX3N2ZyxcbiAgICAgICAgc2l6ZSA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKTtcblxuICAgIHZhciBzbGlkZXJYV3JhcCA9IG5ldyBOb2RlKCk7XG4gICAgICAgIHNsaWRlclhXcmFwLnNldFN0eWxlQ2xhc3MoQ1NTLkdyYXBoU2xpZGVyWFdyYXApO1xuXG4gICAgdmFyIHNsaWRlcllXcmFwID0gbmV3IE5vZGUoKTtcbiAgICAgICAgc2xpZGVyWVdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuR3JhcGhTbGlkZXJZV3JhcCk7XG5cbiAgICB2YXIgc2xpZGVyWFRyYWNrID0gdGhpcy5fc2xpZGVyWFRyYWNrID0gbmV3IE5vZGUoKTtcbiAgICAgICAgc2xpZGVyWFRyYWNrLnNldFN0eWxlQ2xhc3MoQ1NTLkdyYXBoU2xpZGVyWCk7XG5cbiAgICB2YXIgc2xpZGVyWVRyYWNrID0gdGhpcy5fc2xpZGVyWVRyYWNrID0gbmV3IE5vZGUoKTtcbiAgICAgICAgc2xpZGVyWVRyYWNrLnNldFN0eWxlQ2xhc3MoQ1NTLkdyYXBoU2xpZGVyWSk7XG5cbiAgICB2YXIgc2xpZGVyWEhhbmRsZSA9IHRoaXMuX3NsaWRlclhIYW5kbGUgPSBuZXcgTm9kZSgpO1xuICAgICAgICBzbGlkZXJYSGFuZGxlLnNldFN0eWxlQ2xhc3MoQ1NTLkdyYXBoU2xpZGVyWEhhbmRsZSk7XG5cbiAgICB2YXIgc2xpZGVyWUhhbmRsZSA9IHRoaXMuX3NsaWRlcllIYW5kbGUgPSBuZXcgTm9kZSgpO1xuICAgICAgICBzbGlkZXJZSGFuZGxlLnNldFN0eWxlQ2xhc3MoQ1NTLkdyYXBoU2xpZGVyWUhhbmRsZSk7XG5cbiAgICBzbGlkZXJYVHJhY2suYWRkQ2hpbGQoc2xpZGVyWEhhbmRsZSk7XG4gICAgc2xpZGVyWVRyYWNrLmFkZENoaWxkKHNsaWRlcllIYW5kbGUpO1xuICAgIHNsaWRlclhXcmFwLmFkZENoaWxkKHNsaWRlclhUcmFjayk7XG4gICAgc2xpZGVyWVdyYXAuYWRkQ2hpbGQoc2xpZGVyWVRyYWNrKTtcblxuICAgIHZhciB3cmFwTm9kZSA9IHRoaXMuX3dyYXBOb2RlO1xuXG4gICAgdmFyIHBsb3RNb2RlID0gdGhpcy5fcGxvdE1vZGUgPSBmdW5jQXJnTGVuZ3RoID09IDEgP1xuICAgICAgICBGdW5jdGlvblBsb3RUeXBlLk5PTl9JTVBMSUNJVCA6XG4gICAgICAgIEZ1bmN0aW9uUGxvdFR5cGUuSU1QTElDSVQ7XG5cbiAgICBpZiAocGxvdE1vZGUgPT0gRnVuY3Rpb25QbG90VHlwZS5JTVBMSUNJVCkge1xuICAgICAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgICAgIGNhbnZhcy5zdHlsZS53aWR0aCA9IGNhbnZhcy5zdHlsZS5oZWlnaHQgPSBzaXplICsgJ3B4JztcbiAgICAgICAgY2FudmFzLndpZHRoID0gY2FudmFzLmhlaWdodCA9IHNpemU7XG5cbiAgICAgICAgd3JhcE5vZGUuZ2V0RWxlbWVudCgpLmluc2VydEJlZm9yZShjYW52YXMsIHN2Zyk7XG5cbiAgICAgICAgdGhpcy5fY2FudmFzQ29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgICAgICB0aGlzLl9jYW52YXNJbWFnZURhdGEgPSB0aGlzLl9jYW52YXNDb250ZXh0LmdldEltYWdlRGF0YSgwLCAwLCBzaXplLCBzaXplKTtcblxuICAgICAgICBheGVzLnN0eWxlLnN0cm9rZSA9IERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9JTVBMSUNJVF9BWEVTX0NPTE9SO1xuICAgICAgICBncmlkLnN0eWxlLnN0cm9rZSA9IERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9JTVBMSUNJVF9HUklEX0NPTE9SO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgYXhlcy5zdHlsZS5zdHJva2UgPSBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfTk9OX0lNUExJQ0lUX0FYRVNfQ09MT1I7XG4gICAgICAgIGdyaWQuc3R5bGUuc3Ryb2tlID0gREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX05PTl9JTVBMSUNJVF9HUklEX0NPTE9SO1xuICAgIH1cblxuICAgIHdyYXBOb2RlLmFkZENoaWxkKHNsaWRlclhXcmFwKTtcbiAgICB3cmFwTm9kZS5hZGRDaGlsZChzbGlkZXJZV3JhcCk7XG5cbiAgICBzbGlkZXJYSGFuZGxlLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uU2xpZGVyWEhhbmRsZURvd24uYmluZCh0aGlzKSk7XG4gICAgc2xpZGVyWUhhbmRsZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLCB0aGlzLl9vblNsaWRlcllIYW5kbGVEb3duLmJpbmQodGhpcykpO1xuXG4gICAgdmFyIHVuaXRzID0gdGhpcy5fdW5pdHMgPSBbbnVsbCwgbnVsbF07XG4gICAgdGhpcy5fc2NhbGUgPSBudWxsO1xuXG4gICAgaWYgKHBsb3RNb2RlID09IEZ1bmN0aW9uUGxvdFR5cGUuTk9OX0lNUExJQ0lUKSB7XG4gICAgICAgIHVuaXRzWzBdID0gREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX05PTl9JTVBMSUNJVF9VTklUX1g7XG4gICAgICAgIHVuaXRzWzFdID0gREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX05PTl9JTVBMSUNJVF9VTklUX1k7XG5cbiAgICAgICAgdGhpcy5fc2NhbGUgPSBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfTk9OX0lNUExJQ0lUX1NDQUxFO1xuICAgIH1cbiAgICBlbHNlIGlmIChwbG90TW9kZSA9PSBGdW5jdGlvblBsb3RUeXBlLklNUExJQ0lUKSB7XG4gICAgICAgIHVuaXRzWzBdID0gREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX0lNUExJQ0lUX1VOSVRfWDtcbiAgICAgICAgdW5pdHNbMV0gPSBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfSU1QTElDSVRfVU5JVF9ZO1xuXG4gICAgICAgIHRoaXMuX3NjYWxlID0gREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX0lNUExJQ0lUX1NDQUxFO1xuICAgIH1cblxuICAgIHRoaXMuX3VuaXRzTWluTWF4ID0gW0RFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9VTklUX01JTiwgREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX1VOSVRfTUFYXTsgLy8xLzgtPjRcblxuICAgIHRoaXMuX3NjYWxlTWluTWF4ID0gW0RFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9TQ0FMRV9NSU4sIERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9TQ0FMRV9NQVhdOyAvLzEvNTAgLT4gMjVcblxuICAgIHRoaXMuX2NlbnRlciA9IFtNYXRoLnJvdW5kKHNpemUgKiAwLjUpLE1hdGgucm91bmQoc2l6ZSAqIDAuNSldO1xuICAgIHRoaXMuX3N2Z1BvcyA9IFswLCAwXTtcblxuICAgIHRoaXMuX2Z1bmMgPSBudWxsO1xuICAgIHRoaXMuc2V0RnVuY3Rpb24odGhpcy5fb2JqW3RoaXMuX2tleV0pO1xuXG4gICAgdGhpcy5fc2xpZGVyWEhhbmRsZVVwZGF0ZSgpO1xuICAgIHRoaXMuX3NsaWRlcllIYW5kbGVVcGRhdGUoKTtcblxuICAgIHN2Zy5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25EcmFnU3RhcnQuYmluZCh0aGlzKSwgZmFsc2UpO1xuICAgIHRoaXMuX3dyYXBOb2RlLmdldEVsZW1lbnQoKS5hZGRFdmVudExpc3RlbmVyKFwibW91c2V3aGVlbFwiLCB0aGlzLl9vblNjYWxlLmJpbmQodGhpcywgZmFsc2UpKTtcblxuICAgIE9iamVjdENvbXBvbmVudE5vdGlmaWVyLmdldCgpLmFkZEV2ZW50TGlzdGVuZXIoQ29tcG9uZW50RXZlbnQuVVBEQVRFX1ZBTFVFLCB0aGlzLCAnb25WYWx1ZVVwZGF0ZScpO1xufVxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUGxvdHRlci5wcm90b3R5cGUpO1xuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEZ1bmN0aW9uUGxvdHRlcjtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fdXBkYXRlQ2VudGVyID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzdmcgPSB0aGlzLl9zdmcsXG4gICAgICAgIHdpZHRoID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ3dpZHRoJykpLFxuICAgICAgICBoZWlnaHQgPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnaGVpZ2h0JykpO1xuXG4gICAgdmFyIG1vdXNlUG9zID0gTW91c2UuZ2V0KCkuZ2V0UG9zaXRpb24oKSxcbiAgICAgICAgc3ZnUG9zID0gdGhpcy5fc3ZnUG9zLFxuICAgICAgICBjZW50ZXIgPSB0aGlzLl9jZW50ZXI7XG5cbiAgICBjZW50ZXJbMF0gPSBNYXRoLm1heCgwLCBNYXRoLm1pbihtb3VzZVBvc1swXSAtIHN2Z1Bvc1swXSwgd2lkdGgpKTtcbiAgICBjZW50ZXJbMV0gPSBNYXRoLm1heCgwLCBNYXRoLm1pbihtb3VzZVBvc1sxXSAtIHN2Z1Bvc1sxXSwgaGVpZ2h0KSk7XG5cbiAgICB0aGlzLl9wbG90R3JhcGgoKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX29uRHJhZ1N0YXJ0ID0gZnVuY3Rpb24gKGUpIHtcbiAgICB2YXIgZWxlbWVudCA9IHRoaXMuX3N2ZztcblxuICAgIHZhciBzdmdQb3MgPSB0aGlzLl9zdmdQb3M7XG4gICAgc3ZnUG9zWzBdID0gMDtcbiAgICBzdmdQb3NbMV0gPSAwO1xuXG4gICAgd2hpbGUgKGVsZW1lbnQpIHtcbiAgICAgICAgc3ZnUG9zWzBdICs9IGVsZW1lbnQub2Zmc2V0TGVmdDtcbiAgICAgICAgc3ZnUG9zWzFdICs9IGVsZW1lbnQub2Zmc2V0VG9wO1xuICAgICAgICBlbGVtZW50ID0gZWxlbWVudC5vZmZzZXRQYXJlbnQ7XG4gICAgfVxuXG4gICAgdmFyIGV2ZW50TW92ZSA9IERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSxcbiAgICAgICAgZXZlbnRVcCA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XG5cbiAgICB2YXIgb25EcmFnID0gdGhpcy5fdXBkYXRlQ2VudGVyLmJpbmQodGhpcyksXG4gICAgICAgIG9uRHJhZ0VuZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuX3VwZGF0ZUNlbnRlci5iaW5kKHRoaXMpO1xuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudFVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcblxuICAgICAgICB9LmJpbmQodGhpcyk7XG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudFVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcblxuICAgIHRoaXMuX3VwZGF0ZUNlbnRlcigpO1xufTtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fb25TY2FsZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgZSA9IHdpbmRvdy5ldmVudCB8fCBlO1xuICAgIHRoaXMuX3NjYWxlICs9IE1hdGgubWF4KC0xLCBNYXRoLm1pbigxLCAoZS53aGVlbERlbHRhIHx8IC1lLmRldGFpbCkpKSAqIC0xO1xuXG4gICAgdmFyIHNjYWxlTWluTWF4ID0gdGhpcy5fc2NhbGVNaW5NYXg7XG4gICAgdGhpcy5fc2NhbGUgPSBNYXRoLm1heChzY2FsZU1pbk1heFswXSwgTWF0aC5taW4odGhpcy5fc2NhbGUsIHNjYWxlTWluTWF4WzFdKSk7XG5cbiAgICB0aGlzLl9wbG90R3JhcGgoKTtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxufTtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc2V0RnVuY3Rpb24odGhpcy5fb2JqW3RoaXMuX2tleV0pO1xufTtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fcmVkcmF3ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLl9wbG90TW9kZSA9PSBGdW5jdGlvblBsb3RUeXBlLklNUExJQ0lUKSB7XG4gICAgICAgIHZhciBzaXplID0gdGhpcy5fd3JhcE5vZGUuZ2V0V2lkdGgoKSxcbiAgICAgICAgICAgIGNhbnZhcyA9IHRoaXMuX2NhbnZhcztcblxuICAgICAgICBjYW52YXMuc3R5bGUud2lkdGggPSBjYW52YXMuc3R5bGUuaGVpZ2h0ID0gc2l6ZSArICdweCc7XG4gICAgICAgIGNhbnZhcy53aWR0aCA9IGNhbnZhcy5oZWlnaHQgPSBzaXplO1xuXG4gICAgICAgIHRoaXMuX2NhbnZhc0ltYWdlRGF0YSA9IHRoaXMuX2NhbnZhc0NvbnRleHQuZ2V0SW1hZ2VEYXRhKDAsIDAsIHNpemUsIHNpemUpO1xuICAgIH1cblxuICAgIHRoaXMuX3NsaWRlclhIYW5kbGVVcGRhdGUoKTtcbiAgICB0aGlzLl9zbGlkZXJZSGFuZGxlVXBkYXRlKCk7XG5cbiAgICB0aGlzLnNldEZ1bmN0aW9uKHRoaXMuX29ialt0aGlzLl9rZXldKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuc2V0RnVuY3Rpb24gPSBmdW5jdGlvbiAoZnVuYykge1xuICAgIHRoaXMuX2Z1bmMgPSBmdW5jLmJpbmQodGhpcy5fb2JqKTtcbiAgICB0aGlzLl9wbG90R3JhcGgoKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX3Bsb3RHcmFwaCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9kcmF3R3JpZCgpO1xuICAgIHRoaXMuX2RyYXdBeGVzKCk7XG4gICAgdGhpcy5fZHJhd1Bsb3QoKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX2RyYXdBeGVzID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzdmcgPSB0aGlzLl9zdmcsXG4gICAgICAgIHN2Z1dpZHRoID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ3dpZHRoJykpLFxuICAgICAgICBzdmdIZWlnaHQgPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnaGVpZ2h0JykpO1xuXG4gICAgdmFyIGNlbnRlciA9IHRoaXMuX2NlbnRlcixcbiAgICAgICAgY2VudGVyWCA9IGNlbnRlclswXSxcbiAgICAgICAgY2VudGVyWSA9IGNlbnRlclsxXTtcblxuICAgIHZhciBwYXRoQ21kID0gJyc7XG4gICAgcGF0aENtZCArPSB0aGlzLl9wYXRoQ21kTGluZSgwLCBjZW50ZXJZLCBzdmdXaWR0aCwgY2VudGVyWSk7XG4gICAgcGF0aENtZCArPSB0aGlzLl9wYXRoQ21kTGluZShjZW50ZXJYLCAwLCBjZW50ZXJYLCBzdmdIZWlnaHQpO1xuXG4gICAgdGhpcy5fYXhlcy5zZXRBdHRyaWJ1dGUoJ2QnLCBwYXRoQ21kKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX2RyYXdQbG90ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB3aWR0aCwgaGVpZ2h0O1xuXG4gICAgdmFyIGNlbnRlciA9IHRoaXMuX2NlbnRlcixcbiAgICAgICAgY2VudGVyWCA9IGNlbnRlclswXSxcbiAgICAgICAgY2VudGVyWSA9IGNlbnRlclsxXTtcblxuICAgIHZhciB1bml0cyA9IHRoaXMuX3VuaXRzLFxuICAgICAgICB1bml0WCwgdW5pdFk7XG5cbiAgICB2YXIgc2NhbGUgPSB0aGlzLl9zY2FsZTtcbiAgICB2YXIgbm9ybXZhbCwgc2NhbGVkVmFsLCB2YWx1ZSwgaW5kZXg7XG4gICAgdmFyIG9mZnNldFgsIG9mZnNldFk7XG5cbiAgICB2YXIgaTtcblxuICAgIGlmICh0aGlzLl9wbG90TW9kZSA9PSBGdW5jdGlvblBsb3RUeXBlLk5PTl9JTVBMSUNJVCkge1xuICAgICAgICB2YXIgc3ZnID0gdGhpcy5fc3ZnO1xuXG4gICAgICAgIHdpZHRoID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ3dpZHRoJykpO1xuICAgICAgICBoZWlnaHQgPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnaGVpZ2h0JykpO1xuICAgICAgICB1bml0WCA9IHVuaXRzWzBdICogc2NhbGU7XG4gICAgICAgIHVuaXRZID0gaGVpZ2h0IC8gKHVuaXRzWzFdICogc2NhbGUpO1xuICAgICAgICBvZmZzZXRYID0gY2VudGVyWCAvIHdpZHRoO1xuXG4gICAgICAgIHZhciBsZW4gPSBNYXRoLmZsb29yKHdpZHRoKSxcbiAgICAgICAgICAgIHBvaW50cyA9IG5ldyBBcnJheShsZW4gKiAyKTtcblxuICAgICAgICBpID0gLTE7XG4gICAgICAgIHdoaWxlICgrK2kgPCBsZW4pIHtcbiAgICAgICAgICAgIG5vcm12YWwgPSAoLW9mZnNldFggKyBpIC8gbGVuKTtcbiAgICAgICAgICAgIHNjYWxlZFZhbCA9IG5vcm12YWwgKiB1bml0WDtcbiAgICAgICAgICAgIHZhbHVlID0gY2VudGVyWSAtIHRoaXMuX2Z1bmMoc2NhbGVkVmFsKSAqIHVuaXRZO1xuXG4gICAgICAgICAgICBpbmRleCA9IGkgKiAyO1xuXG4gICAgICAgICAgICBwb2ludHNbaW5kZXhdID0gaTtcbiAgICAgICAgICAgIHBvaW50c1tpbmRleCArIDFdID0gdmFsdWU7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcGF0aENtZCA9ICcnO1xuICAgICAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRNb3ZlVG8ocG9pbnRzWzBdLCBwb2ludHNbMV0pO1xuXG4gICAgICAgIGkgPSAyO1xuICAgICAgICB3aGlsZSAoaSA8IHBvaW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHBhdGhDbWQgKz0gdGhpcy5fcGF0aENtZExpbmVUbyhwb2ludHNbaV0sIHBvaW50c1tpICsgMV0pO1xuICAgICAgICAgICAgaSArPSAyO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fcGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwYXRoQ21kKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXMsXG4gICAgICAgICAgICBjb250ZXh0ID0gdGhpcy5fY2FudmFzQ29udGV4dCxcbiAgICAgICAgICAgIGltZ0RhdGEgPSB0aGlzLl9jYW52YXNJbWFnZURhdGE7XG5cbiAgICAgICAgd2lkdGggPSBjYW52YXMud2lkdGg7XG4gICAgICAgIGhlaWdodCA9IGNhbnZhcy5oZWlnaHQ7XG5cbiAgICAgICAgdW5pdFggPSB1bml0c1swXSAqIHNjYWxlO1xuICAgICAgICB1bml0WSA9IHVuaXRzWzFdICogc2NhbGU7XG5cbiAgICAgICAgb2Zmc2V0WCA9IGNlbnRlclggLyB3aWR0aDtcbiAgICAgICAgb2Zmc2V0WSA9IGNlbnRlclkgLyBoZWlnaHQ7XG5cbiAgICAgICAgdmFyIGludldpZHRoID0gMSAvIHdpZHRoLFxuICAgICAgICAgICAgaW52SGVpZ2h0ID0gMSAvIGhlaWdodDtcbiAgICAgICAgdmFyIHJnYiA9IFswLCAwLCAwXTtcblxuICAgICAgICB2YXIgY29sMCA9IFszMCwgMzQsIDM2XSxcbiAgICAgICAgICAgIGNvbDEgPSBbMjU1LCAyNTUsIDI1NV07XG5cbiAgICAgICAgaSA9IC0xO1xuICAgICAgICB2YXIgajtcbiAgICAgICAgd2hpbGUgKCsraSA8IGhlaWdodCkge1xuICAgICAgICAgICAgaiA9IC0xO1xuXG4gICAgICAgICAgICB3aGlsZSAoKytqIDwgd2lkdGgpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXMuX2Z1bmMoKC1vZmZzZXRYICsgaiAqIGludldpZHRoKSAqIHVuaXRYLFxuICAgICAgICAgICAgICAgICAgICAoLW9mZnNldFkgKyBpICogaW52SGVpZ2h0KSAqIHVuaXRZKTtcblxuICAgICAgICAgICAgICAgIHJnYlswXSA9IE1hdGguZmxvb3IoKGNvbDFbMF0gLSBjb2wwWzBdKSAqIHZhbHVlICsgY29sMFswXSk7XG4gICAgICAgICAgICAgICAgcmdiWzFdID0gTWF0aC5mbG9vcigoY29sMVsxXSAtIGNvbDBbMV0pICogdmFsdWUgKyBjb2wwWzFdKTtcbiAgICAgICAgICAgICAgICByZ2JbMl0gPSBNYXRoLmZsb29yKChjb2wxWzJdIC0gY29sMFsyXSkgKiB2YWx1ZSArIGNvbDBbMl0pO1xuXG4gICAgICAgICAgICAgICAgaW5kZXggPSAoaSAqIHdpZHRoICsgaikgKiA0O1xuXG4gICAgICAgICAgICAgICAgaW1nRGF0YS5kYXRhW2luZGV4XSA9IHJnYlswXTtcbiAgICAgICAgICAgICAgICBpbWdEYXRhLmRhdGFbaW5kZXggKyAxXSA9IHJnYlsxXTtcbiAgICAgICAgICAgICAgICBpbWdEYXRhLmRhdGFbaW5kZXggKyAyXSA9IHJnYlsyXTtcbiAgICAgICAgICAgICAgICBpbWdEYXRhLmRhdGFbaW5kZXggKyAzXSA9IDI1NTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICBjb250ZXh0LnB1dEltYWdlRGF0YShpbWdEYXRhLCAwLCAwKTtcbiAgICB9XG59O1xuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9kcmF3R3JpZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc3ZnID0gdGhpcy5fc3ZnLFxuICAgICAgICB3aWR0aCA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKSxcbiAgICAgICAgaGVpZ2h0ID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ2hlaWdodCcpKTtcblxuICAgIHZhciBzY2FsZSA9IHRoaXMuX3NjYWxlO1xuXG4gICAgdmFyIGdyaWRSZXMgPSB0aGlzLl91bml0cyxcbiAgICAgICAgZ3JpZFNwYWNpbmdYID0gd2lkdGggLyAoZ3JpZFJlc1swXSAqIHNjYWxlKSxcbiAgICAgICAgZ3JpZFNwYWNpbmdZID0gaGVpZ2h0IC8gKGdyaWRSZXNbMV0gKiBzY2FsZSk7XG5cbiAgICB2YXIgY2VudGVyID0gdGhpcy5fY2VudGVyLFxuICAgICAgICBjZW50ZXJYID0gY2VudGVyWzBdLFxuICAgICAgICBjZW50ZXJZID0gY2VudGVyWzFdO1xuXG4gICAgdmFyIGdyaWROdW1Ub3AgPSBNYXRoLnJvdW5kKGNlbnRlclkgLyBncmlkU3BhY2luZ1kpICsgMSxcbiAgICAgICAgZ3JpZE51bUJvdHRvbSA9IE1hdGgucm91bmQoKGhlaWdodCAtIGNlbnRlclkpIC8gZ3JpZFNwYWNpbmdZKSArIDEsXG4gICAgICAgIGdyaWROdW1MZWZ0ID0gTWF0aC5yb3VuZChjZW50ZXJYIC8gZ3JpZFNwYWNpbmdYKSArIDEsXG4gICAgICAgIGdyaWROdW1SaWdodCA9IE1hdGgucm91bmQoKHdpZHRoIC0gY2VudGVyWCkgLyBncmlkU3BhY2luZ1gpICsgMTtcblxuICAgIHZhciBwYXRoQ21kR3JpZCA9ICcnLFxuICAgICAgICBwYXRoQ21kQXhlc0xhYmVscyA9ICcnO1xuXG4gICAgdmFyIGksIHRlbXA7XG5cbiAgICB2YXIgc3Ryb2tlU2l6ZSA9IE1ldHJpYy5TVFJPS0VfU0laRTtcblxuICAgIHZhciBsYWJlbFRpY2tTaXplID0gTWV0cmljLkZVTkNUSU9OX1BMT1RURVJfTEFCRUxfVElDS19TSVpFLFxuICAgICAgICBsYWJlbFRpY2tQYWRkaW5nUmlnaHQgPSB3aWR0aCAtIGxhYmVsVGlja1NpemUgLSBzdHJva2VTaXplLFxuICAgICAgICBsYWJlbFRpY2tQYWRkaW5nQm90dG9tID0gaGVpZ2h0IC0gbGFiZWxUaWNrU2l6ZSAtIHN0cm9rZVNpemUsXG4gICAgICAgIGxhYmVsVGlja1BhZGRpbmdSaWdodE9mZnNldCA9IGxhYmVsVGlja1BhZGRpbmdSaWdodCAtIGxhYmVsVGlja1NpemUsXG4gICAgICAgIGxhYmVsVGlja1BhZGRpbmdCb3R0b21PZmZzZXQgPSBsYWJlbFRpY2tQYWRkaW5nQm90dG9tIC0gbGFiZWxUaWNrU2l6ZSxcbiAgICAgICAgbGFiZWxUaWNrT2Zmc2V0UmlnaHQgPSBsYWJlbFRpY2tQYWRkaW5nUmlnaHQgLSAobGFiZWxUaWNrU2l6ZSArIHN0cm9rZVNpemUpICogMixcbiAgICAgICAgbGFiZWxUaWNrT2Zmc2V0Qm90dG9tID0gbGFiZWxUaWNrUGFkZGluZ0JvdHRvbSAtIChsYWJlbFRpY2tTaXplICsgc3Ryb2tlU2l6ZSkgKiAyO1xuXG4gICAgaSA9IC0xO1xuICAgIHdoaWxlICgrK2kgPCBncmlkTnVtVG9wKSB7XG4gICAgICAgIHRlbXAgPSBNYXRoLnJvdW5kKGNlbnRlclkgLSBncmlkU3BhY2luZ1kgKiBpKTtcbiAgICAgICAgcGF0aENtZEdyaWQgKz0gdGhpcy5fcGF0aENtZExpbmUoMCwgdGVtcCwgd2lkdGgsIHRlbXApO1xuXG4gICAgICAgIGlmICh0ZW1wID4gbGFiZWxUaWNrU2l6ZSl7XG4gICAgICAgICAgICBwYXRoQ21kQXhlc0xhYmVscyArPSB0aGlzLl9wYXRoQ21kTGluZShsYWJlbFRpY2tQYWRkaW5nUmlnaHQsIHRlbXAsXG4gICAgICAgICAgICAgICAgbGFiZWxUaWNrUGFkZGluZ1JpZ2h0T2Zmc2V0LCB0ZW1wKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGkgPSAtMTtcbiAgICB3aGlsZSAoKytpIDwgZ3JpZE51bUJvdHRvbSkge1xuICAgICAgICB0ZW1wID0gTWF0aC5yb3VuZChjZW50ZXJZICsgZ3JpZFNwYWNpbmdZICogaSk7XG4gICAgICAgIHBhdGhDbWRHcmlkICs9IHRoaXMuX3BhdGhDbWRMaW5lKDAsIHRlbXAsIHdpZHRoLCB0ZW1wKTtcblxuICAgICAgICBpZiAodGVtcCA8IGxhYmVsVGlja09mZnNldEJvdHRvbSl7XG4gICAgICAgICAgICBwYXRoQ21kQXhlc0xhYmVscyArPSB0aGlzLl9wYXRoQ21kTGluZShsYWJlbFRpY2tQYWRkaW5nUmlnaHQsIHRlbXAsXG4gICAgICAgICAgICAgICAgbGFiZWxUaWNrUGFkZGluZ1JpZ2h0T2Zmc2V0LCB0ZW1wKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGkgPSAtMTtcbiAgICB3aGlsZSAoKytpIDwgZ3JpZE51bUxlZnQpIHtcbiAgICAgICAgdGVtcCA9IE1hdGgucm91bmQoY2VudGVyWCAtIGdyaWRTcGFjaW5nWCAqIGkpO1xuICAgICAgICBwYXRoQ21kR3JpZCArPSB0aGlzLl9wYXRoQ21kTGluZSh0ZW1wLCAwLCB0ZW1wLCBoZWlnaHQpO1xuXG4gICAgICAgIGlmICh0ZW1wID4gbGFiZWxUaWNrU2l6ZSl7XG4gICAgICAgICAgICBwYXRoQ21kQXhlc0xhYmVscyArPSB0aGlzLl9wYXRoQ21kTGluZSh0ZW1wLCBsYWJlbFRpY2tQYWRkaW5nQm90dG9tLFxuICAgICAgICAgICAgICAgIHRlbXAsIGxhYmVsVGlja1BhZGRpbmdCb3R0b21PZmZzZXQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaSA9IC0xO1xuICAgIHdoaWxlICgrK2kgPCBncmlkTnVtUmlnaHQpIHtcbiAgICAgICAgdGVtcCA9IE1hdGgucm91bmQoY2VudGVyWCArIGdyaWRTcGFjaW5nWCAqIGkpO1xuICAgICAgICBwYXRoQ21kR3JpZCArPSB0aGlzLl9wYXRoQ21kTGluZSh0ZW1wLCAwLCB0ZW1wLCBoZWlnaHQpO1xuXG4gICAgICAgIGlmICh0ZW1wIDwgbGFiZWxUaWNrT2Zmc2V0UmlnaHQpe1xuICAgICAgICAgICAgcGF0aENtZEF4ZXNMYWJlbHMgKz0gdGhpcy5fcGF0aENtZExpbmUodGVtcCwgbGFiZWxUaWNrUGFkZGluZ0JvdHRvbSxcbiAgICAgICAgICAgICAgICB0ZW1wLCBsYWJlbFRpY2tQYWRkaW5nQm90dG9tT2Zmc2V0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuX2dyaWQuc2V0QXR0cmlidXRlKCdkJywgcGF0aENtZEdyaWQpO1xuICAgIHRoaXMuX2F4ZXNMYWJlbHMuc2V0QXR0cmlidXRlKCdkJywgcGF0aENtZEF4ZXNMYWJlbHMpO1xufTtcblxuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9zbGlkZXJYU3RlcCA9IGZ1bmN0aW9uIChtb3VzZVBvcykge1xuICAgIHZhciBtb3VzZVggPSBtb3VzZVBvc1swXTtcblxuICAgIHZhciBoYW5kbGUgPSB0aGlzLl9zbGlkZXJYSGFuZGxlLFxuICAgICAgICBoYW5kbGVXaWR0aCA9IGhhbmRsZS5nZXRXaWR0aCgpLFxuICAgICAgICBoYW5kbGVXaWR0aEhhbGYgPSBoYW5kbGVXaWR0aCAqIDAuNTtcblxuICAgIHZhciB0cmFjayA9IHRoaXMuX3NsaWRlclhUcmFjayxcbiAgICAgICAgdHJhY2tXaWR0aCA9IHRyYWNrLmdldFdpZHRoKCksXG4gICAgICAgIHRyYWNrTGVmdCA9IHRyYWNrLmdldFBvc2l0aW9uR2xvYmFsWCgpO1xuXG4gICAgdmFyIHN0cm9rZVNpemUgPSBNZXRyaWMuU1RST0tFX1NJWkU7XG5cbiAgICB2YXIgbWF4ID0gdHJhY2tXaWR0aCAtIGhhbmRsZVdpZHRoSGFsZiAtIHN0cm9rZVNpemUgKiAyO1xuXG4gICAgdmFyIHBvcyA9IE1hdGgubWF4KGhhbmRsZVdpZHRoSGFsZiwgTWF0aC5taW4obW91c2VYIC0gdHJhY2tMZWZ0LCBtYXgpKSxcbiAgICAgICAgaGFuZGxlUG9zID0gcG9zIC0gaGFuZGxlV2lkdGhIYWxmO1xuXG4gICAgaGFuZGxlLnNldFBvc2l0aW9uWChoYW5kbGVQb3MpO1xuXG4gICAgdmFyIHVuaXRzTWluID0gdGhpcy5fdW5pdHNNaW5NYXhbMF0sXG4gICAgICAgIHVuaXRzTWF4ID0gdGhpcy5fdW5pdHNNaW5NYXhbMV07XG5cbiAgICB2YXIgbm9ybVZhbCA9IChwb3MgLSBoYW5kbGVXaWR0aEhhbGYpIC8gKG1heCAtIGhhbmRsZVdpZHRoSGFsZiksXG4gICAgICAgIG1hcHBlZFZhbCA9IHVuaXRzTWluICsgKHVuaXRzTWF4IC0gdW5pdHNNaW4pICogbm9ybVZhbDtcblxuICAgIHRoaXMuX3VuaXRzWzBdID0gbWFwcGVkVmFsO1xuXG4gICAgdGhpcy5fcGxvdEdyYXBoKCk7XG59O1xuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9zbGlkZXJZU3RlcCA9IGZ1bmN0aW9uIChtb3VzZVBvcykge1xuICAgIHZhciBtb3VzZVkgPSBtb3VzZVBvc1sxXTtcblxuICAgIHZhciBoYW5kbGUgPSB0aGlzLl9zbGlkZXJZSGFuZGxlLFxuICAgICAgICBoYW5kbGVIZWlnaHQgPSBoYW5kbGUuZ2V0SGVpZ2h0KCksXG4gICAgICAgIGhhbmRsZUhlaWdodEhhbGYgPSBoYW5kbGVIZWlnaHQgKiAwLjU7XG5cbiAgICB2YXIgdHJhY2sgPSB0aGlzLl9zbGlkZXJZVHJhY2ssXG4gICAgICAgIHRyYWNrSGVpZ2h0ID0gdHJhY2suZ2V0SGVpZ2h0KCksXG4gICAgICAgIHRyYWNrVG9wID0gdHJhY2suZ2V0UG9zaXRpb25HbG9iYWxZKCk7XG5cbiAgICB2YXIgbWF4ID0gdHJhY2tIZWlnaHQgLSBoYW5kbGVIZWlnaHRIYWxmIC0gMjtcblxuICAgIHZhciBwb3MgPSBNYXRoLm1heChoYW5kbGVIZWlnaHRIYWxmLCBNYXRoLm1pbihtb3VzZVkgLSB0cmFja1RvcCwgbWF4KSksXG4gICAgICAgIGhhbmRsZVBvcyA9IHBvcyAtIGhhbmRsZUhlaWdodEhhbGY7XG5cbiAgICBoYW5kbGUuc2V0UG9zaXRpb25ZKGhhbmRsZVBvcyk7XG5cbiAgICB2YXIgdW5pdHNNYXggPSB0aGlzLl91bml0c01pbk1heFswXSxcbiAgICAgICAgdW5pdHNNaW4gPSB0aGlzLl91bml0c01pbk1heFsxXTtcblxuICAgIHZhciBub3JtVmFsID0gKHBvcyAtIGhhbmRsZUhlaWdodEhhbGYpIC8gKG1heCAtIGhhbmRsZUhlaWdodEhhbGYpLFxuICAgICAgICBtYXBwZWRWYWwgPSB1bml0c01pbiArICh1bml0c01heCAtIHVuaXRzTWluKSAqIG5vcm1WYWw7XG5cbiAgICB0aGlzLl91bml0c1sxXSA9IG1hcHBlZFZhbDtcblxuICAgIHRoaXMuX3Bsb3RHcmFwaCgpO1xufTtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fb25TbGlkZXJYSGFuZGxlRG93biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9vblNsaWRlckhhbmRsZURvd24odGhpcy5fc2xpZGVyWFN0ZXAuYmluZCh0aGlzKSk7XG59O1xuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9vblNsaWRlcllIYW5kbGVEb3duID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX29uU2xpZGVySGFuZGxlRG93bih0aGlzLl9zbGlkZXJZU3RlcC5iaW5kKHRoaXMpKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX29uU2xpZGVySGFuZGxlRG93biA9IGZ1bmN0aW9uIChzbGlkZXJTdGVwRnVuYykge1xuICAgIHZhciBldmVudE1vdXNlTW92ZSA9IERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSxcbiAgICAgICAgZXZlbnRNb3VzZVVwID0gRG9jdW1lbnRFdmVudC5NT1VTRV9VUDtcblxuICAgIHZhciBtb3VzZSA9IE1vdXNlLmdldCgpO1xuXG4gICAgdmFyIG9uRHJhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNsaWRlclN0ZXBGdW5jKG1vdXNlLmdldFBvc2l0aW9uKCkpXG4gICAgICAgIH0sXG4gICAgICAgIG9uRHJhZ0VuZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZU1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlVXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xuICAgICAgICB9O1xuXG4gICAgc2xpZGVyU3RlcEZ1bmMobW91c2UuZ2V0UG9zaXRpb24oKSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlVXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xufTtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fc2xpZGVyWEhhbmRsZVVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdW5pdE1pbiA9IHRoaXMuX3VuaXRzTWluTWF4WzBdLFxuICAgICAgICB1bml0TWF4ID0gdGhpcy5fdW5pdHNNaW5NYXhbMV0sXG4gICAgICAgIHVuaXRYID0gdGhpcy5fdW5pdHNbMF07XG5cbiAgICB2YXIgaGFuZGxlWCA9IHRoaXMuX3NsaWRlclhIYW5kbGUsXG4gICAgICAgIGhhbmRsZVhXaWR0aCA9IGhhbmRsZVguZ2V0V2lkdGgoKSxcbiAgICAgICAgaGFuZGxlWFdpZHRoSGFsZiA9IGhhbmRsZVhXaWR0aCAqIDAuNSxcbiAgICAgICAgdHJhY2tYV2lkdGggPSB0aGlzLl9zbGlkZXJYVHJhY2suZ2V0V2lkdGgoKTtcblxuICAgIHZhciBzdHJva2VTaXplID0gTWV0cmljLlNUUk9LRV9TSVpFO1xuXG4gICAgdmFyIGhhbmRsZVhNaW4gPSBoYW5kbGVYV2lkdGhIYWxmLFxuICAgICAgICBoYW5kbGVYTWF4ID0gdHJhY2tYV2lkdGggLSBoYW5kbGVYV2lkdGhIYWxmIC0gc3Ryb2tlU2l6ZSAqIDI7XG5cbiAgICBoYW5kbGVYLnNldFBvc2l0aW9uWCgoaGFuZGxlWE1pbiArIChoYW5kbGVYTWF4IC0gaGFuZGxlWE1pbikgKiAoKHVuaXRYIC0gdW5pdE1pbikgLyAodW5pdE1heCAtIHVuaXRNaW4pKSkgLSBoYW5kbGVYV2lkdGhIYWxmKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX3NsaWRlcllIYW5kbGVVcGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHVuaXRNaW4gPSB0aGlzLl91bml0c01pbk1heFswXSxcbiAgICAgICAgdW5pdE1heCA9IHRoaXMuX3VuaXRzTWluTWF4WzFdLFxuICAgICAgICB1bml0WSA9IHRoaXMuX3VuaXRzWzFdO1xuXG4gICAgdmFyIGhhbmRsZVkgPSB0aGlzLl9zbGlkZXJZSGFuZGxlLFxuICAgICAgICBoYW5kbGVZSGVpZ2h0ID0gaGFuZGxlWS5nZXRIZWlnaHQoKSxcbiAgICAgICAgaGFuZGxlWUhlaWdodEhhbGYgPSBoYW5kbGVZSGVpZ2h0ICogMC41LFxuICAgICAgICB0cmFja1lIZWlnaHQgPSB0aGlzLl9zbGlkZXJZVHJhY2suZ2V0SGVpZ2h0KCk7XG5cbiAgICB2YXIgc3Ryb2tlU2l6ZSA9IE1ldHJpYy5TVFJPS0VfU0laRTtcblxuICAgIHZhciBoYW5kbGVZTWluID0gdHJhY2tZSGVpZ2h0IC0gaGFuZGxlWUhlaWdodEhhbGYgLSBzdHJva2VTaXplICogMixcbiAgICAgICAgaGFuZGxlWU1heCA9IGhhbmRsZVlIZWlnaHRIYWxmO1xuXG4gICAgaGFuZGxlWS5zZXRQb3NpdGlvblkoKGhhbmRsZVlNaW4gKyAoaGFuZGxlWU1heCAtIGhhbmRsZVlNaW4pICogKCh1bml0WSAtIHVuaXRNaW4pIC8gKHVuaXRNYXggLSB1bml0TWluKSkpIC0gaGFuZGxlWUhlaWdodEhhbGYpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBGdW5jdGlvblBsb3R0ZXI7IiwiZnVuY3Rpb24gRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3IoKXtcblx0RXJyb3IuYXBwbHkodGhpcyk7XG5cdEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3IpO1xuXHR0aGlzLm5hbWUgPSAnRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3InO1xuXHR0aGlzLm1lc3NhZ2UgPSAnRnVuY3Rpb24gc2hvdWxkIGJlIG9mIGZvcm0gZih4KSBvciBmKHgseSkuJztcbn1cbkZ1bmN0aW9uUGxvdHRlckZ1bmN0aW9uQXJnc0Vycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcbkZ1bmN0aW9uUGxvdHRlckZ1bmN0aW9uQXJnc0Vycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEZ1bmN0aW9uUGxvdHRlckZ1bmN0aW9uQXJnc0Vycm9yO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZ1bmN0aW9uUGxvdHRlckZ1bmN0aW9uQXJnc0Vycm9yOyIsImZ1bmN0aW9uIEZ1bmN0aW9uUGxvdHRlck9iamVjdEVycm9yKG9iamVjdCxrZXkpe1xuXHRFcnJvci5hcHBseSh0aGlzKTtcblx0RXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcyxGdW5jdGlvblBsb3R0ZXJPYmplY3RFcnJvcik7XG5cdHRoaXMubmFtZSA9ICdDb21wb25lbnRPYmplY3RFcnJvcic7XG5cdHRoaXMubWVzc2FnZSA9ICdPYmplY3QgJyArIG9iamVjdC5jb25zdHJ1Y3Rvci5uYW1lICsgJyAnICsga2V5ICsgJ3Nob3VsZCBiZSBvZiB0eXBlIEZ1bmN0aW9uLic7XG59XG5GdW5jdGlvblBsb3R0ZXJPYmplY3RFcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVycm9yLnByb3RvdHlwZSk7XG5GdW5jdGlvblBsb3R0ZXJPYmplY3RFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBGdW5jdGlvblBsb3R0ZXJPYmplY3RFcnJvcjtcblxubW9kdWxlLmV4cG9ydHMgPSBGdW5jdGlvblBsb3R0ZXJPYmplY3RFcnJvcjsiLCJ2YXIgTWV0cmljID0ge1xuXHRDT01QT05FTlRfTUlOX0hFSUdIVDogMjUsXG5cdFNUUk9LRV9TSVpFOiAxLFxuXHRQQURESU5HX1dSQVBQRVI6IDEyLFxuXHRQQURESU5HX09QVElPTlM6IDIsXG5cdFBBRERJTkdfUFJFU0VUOiAyMCxcblxuXHRTQ1JPTExCQVJfVFJBQ0tfUEFERElORzogMixcblx0RlVOQ1RJT05fUExPVFRFUl9MQUJFTF9USUNLX1NJWkU6IDZcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTWV0cmljOyIsInZhciBPYmplY3RDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jb3JlL09iamVjdENvbXBvbmVudCcpO1xudmFyIE51bWJlcklucHV0X0ludGVybmFsID0gcmVxdWlyZSgnLi9OdW1iZXJJbnB1dF9JbnRlcm5hbCcpO1xuXG52YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xuXG52YXIgT3B0aW9ucyA9IHJlcXVpcmUoJy4vT3B0aW9ucycpO1xudmFyIEJ1dHRvblByZXNldCA9IHJlcXVpcmUoJy4vQnV0dG9uUHJlc2V0Jyk7XG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKSxcbiAgICBNZXRyaWMgPSByZXF1aXJlKCcuL01ldHJpYycpO1xuXG52YXIgRXZlbnRfID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIERvY3VtZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcbiAgICBOb2RlRXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpLFxuICAgIENvbXBvbmVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9Db21wb25lbnRFdmVudCcpO1xuXG52YXIgREVGQVVMVF9JTlBVVF9EUCAgICAgPSAyLFxuICAgIERFRkFVTFRfSU5QVVRfU1RFUCAgID0gMSxcbiAgICBERUZBVUxUX0lOUFVUX1BSRVNFVCA9IG51bGw7XG5cblxuXG5mdW5jdGlvbiBOdW1iZXJJbnB1dChwYXJlbnQsb2JqZWN0LHZhbHVlLHBhcmFtcykge1xuICAgIE9iamVjdENvbXBvbmVudC5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cbiAgICBwYXJhbXMgICAgICAgICAgPSBwYXJhbXMgfHwge307XG4gICAgcGFyYW1zLm9uQ2hhbmdlID0gcGFyYW1zLm9uQ2hhbmdlIHx8IHRoaXMuX29uQ2hhbmdlO1xuICAgIHBhcmFtcy5kcCAgICAgICA9IChwYXJhbXMuZHAgPT09IHVuZGVmaW5lZCB8fCBwYXJhbXMuZHAgPT0gbnVsbCkgPyBERUZBVUxUX0lOUFVUX0RQIDogcGFyYW1zLmRwO1xuICAgIHBhcmFtcy5zdGVwICAgICA9IHBhcmFtcy5zdGVwICAgICB8fCBERUZBVUxUX0lOUFVUX1NURVA7XG4gICAgcGFyYW1zLnByZXNldHMgID0gcGFyYW1zLnByZXNldHMgIHx8IERFRkFVTFRfSU5QVVRfUFJFU0VUO1xuXG4gICAgdGhpcy5fb25DaGFuZ2UgICAgPSBwYXJhbXMub25DaGFuZ2U7XG4gICAgdGhpcy5fcHJlc2V0c0tleSAgPSBwYXJhbXMucHJlc2V0cztcblxuICAgIHZhciBpbnB1dCA9IHRoaXMuX2lucHV0ID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHBhcmFtcy5zdGVwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5kcCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX29uSW5wdXRDaGFuZ2UuYmluZCh0aGlzKSk7XG5cbiAgICB2YXIgd3JhcCA9IHRoaXMuX3dyYXBOb2RlO1xuXG4gICAgdmFyIHByZXNldHMgPSAgcGFyYW1zLnByZXNldHM7XG4gICAgaWYgKCFwcmVzZXRzKSB7XG4gICAgICAgIHdyYXAuYWRkQ2hpbGQoaW5wdXQuZ2V0Tm9kZSgpKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHZhciB3cmFwXyA9IG5ldyBOb2RlKCk7XG4gICAgICAgICAgICB3cmFwXy5zZXRTdHlsZUNsYXNzKENTUy5XcmFwSW5wdXRXUHJlc2V0KTtcblxuICAgICAgICB3cmFwLmFkZENoaWxkKHdyYXBfKTtcbiAgICAgICAgd3JhcF8uYWRkQ2hpbGQoaW5wdXQuZ2V0Tm9kZSgpKTtcblxuICAgICAgICB2YXIgb3B0aW9ucyAgID0gT3B0aW9ucy5nZXQoKTtcbiAgICAgICAgdmFyIHByZXNldEJ0biA9IHRoaXMuX2J0blByZXNldCA9IG5ldyBCdXR0b25QcmVzZXQodGhpcy5fd3JhcE5vZGUpO1xuXG4gICAgICAgIHZhciBvblByZXNldERlYWN0aXZhdGUgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgb3B0aW9ucy5jbGVhcigpO1xuICAgICAgICAgICAgcHJlc2V0QnRuLmRlYWN0aXZhdGUoKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBvblByZXNldEFjdGl2YXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgb3B0aW9ucy5idWlsZChwcmVzZXRzLCBpbnB1dC5nZXRWYWx1ZSgpLCBpbnB1dC5nZXROb2RlKCksXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBpbnB1dC5zZXRWYWx1ZShwcmVzZXRzW29wdGlvbnMuZ2V0U2VsZWN0ZWRJbmRleCgpXSk7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuYXBwbHlWYWx1ZSgpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25QcmVzZXREZWFjdGl2YXRlLCBNZXRyaWMuUEFERElOR19QUkVTRVQsXG4gICAgICAgICAgICAgICAgZmFsc2UpO1xuICAgICAgICB9O1xuICAgICAgICBwcmVzZXRCdG4uc2V0T25BY3RpdmUob25QcmVzZXRBY3RpdmF0ZSk7XG4gICAgICAgIHByZXNldEJ0bi5zZXRPbkRlYWN0aXZlKG9uUHJlc2V0RGVhY3RpdmF0ZSlcbiAgICB9XG5cbiAgICBpbnB1dC5nZXROb2RlKCkuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgICB0aGlzLl9vbklucHV0RHJhZ1N0YXJ0LmJpbmQodGhpcykpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihDb21wb25lbnRFdmVudC5JTlBVVF9TRUxFQ1RfRFJBRyx0aGlzLl9wYXJlbnQsJ29uQ29tcG9uZW50U2VsZWN0RHJhZycpO1xuXG4gICAgaW5wdXQuc2V0VmFsdWUodGhpcy5fb2JqW3RoaXMuX2tleV0pO1xufVxuTnVtYmVySW5wdXQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShPYmplY3RDb21wb25lbnQucHJvdG90eXBlKTtcbk51bWJlcklucHV0LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IE51bWJlcklucHV0O1xuXG5OdW1iZXJJbnB1dC5wcm90b3R5cGUuX29uSW5wdXRDaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5hcHBseVZhbHVlKCk7XG4gICAgdGhpcy5fb25DaGFuZ2UoKTtcbn07XG5cbk51bWJlcklucHV0LnByb3RvdHlwZS5hcHBseVZhbHVlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5wdXNoSGlzdG9yeVN0YXRlKCk7XG4gICAgdGhpcy5fb2JqW3RoaXMuX2tleV0gPSB0aGlzLl9pbnB1dC5nZXRWYWx1ZSgpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCxudWxsKSk7XG59O1xuXG5OdW1iZXJJbnB1dC5wcm90b3R5cGUub25WYWx1ZVVwZGF0ZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKGUuZGF0YS5vcmlnaW4gPT0gdGhpcyl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5faW5wdXQuc2V0VmFsdWUodGhpcy5fb2JqW3RoaXMuX2tleV0pO1xufTtcblxuLy9QcmV2ZW50IGNocm9tZSBzZWxlY3QgZHJhZ1xuTnVtYmVySW5wdXQucHJvdG90eXBlLl9vbklucHV0RHJhZ1N0YXJ0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBldmVudE1vdmUgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsXG4gICAgICAgIGV2ZW50VXAgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX1VQO1xuXG4gICAgdmFyIGV2ZW50ID0gQ29tcG9uZW50RXZlbnQuSU5QVVRfU0VMRUNUX0RSQUc7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgb25EcmFnID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgZXZlbnQsIG51bGwpKTtcbiAgICAgICAgfSxcbiAgICAgICAgb25EcmFnRmluaXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgZXZlbnQsIG51bGwpKTtcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3ZlLCBvbkRyYWdGaW5pc2gsIGZhbHNlKTtcbiAgICAgICAgfTtcblxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIGV2ZW50LCBudWxsKSk7XG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudFVwLCBvbkRyYWdGaW5pc2gsIGZhbHNlKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTnVtYmVySW5wdXQ7IiwidmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnREaXNwYXRjaGVyJyksXG4gICAgTm9kZUV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKTtcbnZhciBOb2RlICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcblxudmFyIFBSRVNFVF9TSElGVF9NVUxUSVBMSUVSICA9IDEwO1xuXG5OdW1iZXJJbnB1dF9JbnRlcm5hbCA9IGZ1bmN0aW9uIChzdGVwVmFsdWUsIGRwLCBvbkJlZ2luLCBvbkNoYW5nZSkge1xuICAgIEV2ZW50RGlzcGF0Y2hlci5hcHBseSh0aGlzLCBudWxsKTtcblxuICAgIHRoaXMuX3ZhbHVlID0gMDtcbiAgICB0aGlzLl92YWx1ZVN0ZXAgPSBzdGVwVmFsdWU7XG4gICAgdGhpcy5fdmFsdWVEcCAgID0gZHA7XG5cbiAgICB0aGlzLl9vbkJlZ2luID0gb25CZWdpbiB8fCBmdW5jdGlvbiAoKXt9O1xuICAgIHRoaXMuX29uQ2hhbmdlID0gb25DaGFuZ2UgfHwgZnVuY3Rpb24gKCkge307XG5cbiAgICB0aGlzLl9wcmV2S2V5Q29kZSA9IG51bGw7XG5cbiAgICB2YXIgaW5wdXQgPSB0aGlzLl9pbnB1dCA9IG5ldyBOb2RlKE5vZGUuSU5QVVRfVEVYVCk7XG4gICAgaW5wdXQuc2V0UHJvcGVydHkoJ3ZhbHVlJywgdGhpcy5fdmFsdWUpO1xuXG4gICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuS0VZX0RPV04sIHRoaXMuX29uSW5wdXRLZXlEb3duLmJpbmQodGhpcykpO1xuICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50LktFWV9VUCwgdGhpcy5fb25JbnB1dEtleVVwLmJpbmQodGhpcykpO1xuICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50LkNIQU5HRSwgdGhpcy5fb25JbnB1dENoYW5nZS5iaW5kKHRoaXMpKTtcbn07XG5OdW1iZXJJbnB1dF9JbnRlcm5hbC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUpO1xuTnVtYmVySW5wdXRfSW50ZXJuYWwucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gTnVtYmVySW5wdXRfSW50ZXJuYWw7XG5cbk51bWJlcklucHV0X0ludGVybmFsLnByb3RvdHlwZS5fb25JbnB1dEtleURvd24gPSBmdW5jdGlvbiAoZSkge1xuICAgIHZhciBzdGVwID0gKGUuc2hpZnRLZXkgPyBQUkVTRVRfU0hJRlRfTVVMVElQTElFUiA6IDEpICogdGhpcy5fdmFsdWVTdGVwLFxuICAgICAgICBrZXlDb2RlID0gZS5rZXlDb2RlO1xuXG4gICAgaWYgKGtleUNvZGUgPT0gMzggfHxcbiAgICAgICAga2V5Q29kZSA9PSA0MCkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgdmFyIG11bHRpcGxpZXIgPSBrZXlDb2RlID09IDM4ID8gMS4wIDogLTEuMDtcbiAgICAgICAgdGhpcy5fdmFsdWUgKz0gKHN0ZXAgKiBtdWx0aXBsaWVyKTtcblxuICAgICAgICB0aGlzLl9vbkJlZ2luKCk7XG4gICAgICAgIHRoaXMuX29uQ2hhbmdlKCk7XG4gICAgICAgIHRoaXMuX2Zvcm1hdCgpO1xuICAgIH1cbn07XG5cbk51bWJlcklucHV0X0ludGVybmFsLnByb3RvdHlwZS5fb25JbnB1dEtleVVwID0gZnVuY3Rpb24gKGUpIHtcbiAgICB2YXIga2V5Q29kZSA9IGUua2V5Q29kZTtcblxuXG4gICAgaWYgKGUuc2hpZnRLZXkgfHwga2V5Q29kZSA9PSAzOCB8fFxuICAgICAgICBrZXlDb2RlID09IDQwIHx8IGtleUNvZGUgPT0gMTkwIHx8XG4gICAgICAgIGtleUNvZGUgPT0gOCB8fCBrZXlDb2RlID09IDM5IHx8XG4gICAgICAgIGtleUNvZGUgPT0gMzcgfHwga2V5Q29kZSA9PSAxODkpIHtcbiAgICAgICAgdGhpcy5fcHJldktleUNvZGUgPSBrZXlDb2RlO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3ByZXZLZXlDb2RlID09IDE4OSAmJiBrZXlDb2RlID09IDQ4KSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9IC8vLTBcbiAgICBpZiAodGhpcy5fcHJldktleUNvZGUgPT0gMTkwICYmIGtleUNvZGUgPT0gNDgpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH0gLy8wLjBcblxuICAgIHRoaXMuX3ZhbGlkYXRlKCk7XG4gICAgdGhpcy5fZm9ybWF0KCk7XG59O1xuXG5OdW1iZXJJbnB1dF9JbnRlcm5hbC5wcm90b3R5cGUuX29uSW5wdXRDaGFuZ2UgPSBmdW5jdGlvbiAoZSkge1xuICAgIHRoaXMuX3ZhbGlkYXRlKCk7XG4gICAgdGhpcy5fZm9ybWF0KCk7XG59O1xuXG5OdW1iZXJJbnB1dF9JbnRlcm5hbC5wcm90b3R5cGUuX3ZhbGlkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmlucHV0SXNOdW1iZXIoKSkge1xuICAgICAgICB2YXIgaW5wdXQgPSB0aGlzLl9nZXRJbnB1dCgpO1xuICAgICAgICBpZiAoaW5wdXQgIT0gJy0nKXRoaXMuX3ZhbHVlID0gTnVtYmVyKGlucHV0KTtcbiAgICAgICAgdGhpcy5fb25DaGFuZ2UoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuX3NldE91dHB1dCh0aGlzLl92YWx1ZSk7XG59O1xuXG5OdW1iZXJJbnB1dF9JbnRlcm5hbC5wcm90b3R5cGUuaW5wdXRJc051bWJlciA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdmFsdWUgPSB0aGlzLl9nZXRJbnB1dCgpO1xuXG4gICAgLy9UT0RPOkZJWFxuICAgIGlmICh2YWx1ZSA9PSAnLScgfHwgdmFsdWUgPT0gJzAnKXJldHVybiB0cnVlO1xuICAgIHJldHVybiAvXlxccyotP1swLTldXFxkKihcXC5cXGR7MSwxMDAwMDAwfSk/XFxzKiQvLnRlc3QodmFsdWUpO1xufTtcblxuTnVtYmVySW5wdXRfSW50ZXJuYWwucHJvdG90eXBlLl9mb3JtYXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHZhbHVlID0gdGhpcy5fdmFsdWUudG9GaXhlZCh0aGlzLl92YWx1ZURwKTtcbiAgICB0aGlzLl9zZXRPdXRwdXQodmFsdWUpO1xufTtcblxuTnVtYmVySW5wdXRfSW50ZXJuYWwucHJvdG90eXBlLl9zZXRPdXRwdXQgPSBmdW5jdGlvbiAobikge1xuICAgIHRoaXMuX2lucHV0LnNldFByb3BlcnR5KCd2YWx1ZScsIG4pO1xufTtcblxuTnVtYmVySW5wdXRfSW50ZXJuYWwucHJvdG90eXBlLl9nZXRJbnB1dCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5faW5wdXQuZ2V0UHJvcGVydHkoJ3ZhbHVlJylcbn07XG5cbk51bWJlcklucHV0X0ludGVybmFsLnByb3RvdHlwZS5nZXRWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fdmFsdWU7XG59O1xuXG5OdW1iZXJJbnB1dF9JbnRlcm5hbC5wcm90b3R5cGUuc2V0VmFsdWUgPSBmdW5jdGlvbiAobikge1xuICAgIHRoaXMuX3ZhbHVlID0gbjtcbiAgICB0aGlzLl9mb3JtYXQoKTtcbn07XG5cbk51bWJlcklucHV0X0ludGVybmFsLnByb3RvdHlwZS5nZXROb2RlID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9pbnB1dDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTnVtYmVySW5wdXRfSW50ZXJuYWw7XG4iLCJ2YXIgT3V0cHV0ID0gcmVxdWlyZSgnLi9PdXRwdXQnKTtcblxudmFyIERFRkFVTFRfT1VUUFVUX0RQID0gMjtcblxuZnVuY3Rpb24gTnVtYmVyT3V0cHV0KHBhcmVudCwgb2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG5cdHBhcmFtcyA9IHBhcmFtcyB8fCB7fTtcblx0cGFyYW1zLmRwID0gcGFyYW1zLmRwIHx8IERFRkFVTFRfT1VUUFVUX0RQO1xuXG5cdE91dHB1dC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXHR0aGlzLl92YWx1ZURwID0gcGFyYW1zLmRwICsgMTtcbn1cbk51bWJlck91dHB1dC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE91dHB1dC5wcm90b3R5cGUpO1xuTnVtYmVyT3V0cHV0LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IE51bWJlck91dHB1dDtcblxuLy9GSVhNRVxuTnVtYmVyT3V0cHV0LnByb3RvdHlwZS5fc2V0VmFsdWUgPSBmdW5jdGlvbiAoKSB7XG5cdGlmICh0aGlzLl9wYXJlbnQuaXNEaXNhYmxlZCgpKXtcblx0XHRyZXR1cm47XG5cdH1cblxuXHR2YXIgdmFsdWUgPSB0aGlzLl9vYmpbdGhpcy5fa2V5XSxcblx0XHR0ZXh0QXJlYSA9IHRoaXMuX3RleHRBcmVhLFxuXHRcdGRwID0gdGhpcy5fdmFsdWVEcDtcblxuXHR2YXIgaW5kZXgsXG5cdFx0b3V0O1xuXG5cdGlmICh0eXBlb2YodmFsdWUpID09PSAnb2JqZWN0JyAmJlxuXHRcdHR5cGVvZih2YWx1ZS5sZW5ndGgpID09PSAnbnVtYmVyJyAmJlxuXHRcdHR5cGVvZih2YWx1ZS5zcGxpY2UpID09PSAnZnVuY3Rpb24nICYmXG5cdFx0IXZhbHVlLnByb3BlcnR5SXNFbnVtZXJhYmxlKCdsZW5ndGgnKSkge1xuXG5cdFx0b3V0ID0gdmFsdWUuc2xpY2UoKTtcblxuXHRcdHZhciBpID0gLTE7XG5cdFx0dmFyIHRlbXA7XG5cdFx0dmFyIHdyYXAgPSB0aGlzLl93cmFwO1xuXG5cdFx0d2hpbGUgKCsraSA8IG91dC5sZW5ndGgpIHtcblx0XHRcdHRlbXAgPSBvdXRbaV0gPSBvdXRbaV0udG9TdHJpbmcoKTtcblx0XHRcdGluZGV4ID0gdGVtcC5pbmRleE9mKCcuJyk7XG5cdFx0XHRpZiAoaW5kZXggPiAwKXtcblx0XHRcdFx0b3V0W2ldID0gdGVtcC5zbGljZSgwLCBpbmRleCArIGRwKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAod3JhcCkge1xuXHRcdFx0dGV4dEFyZWEuc2V0U3R5bGVQcm9wZXJ0eSgnd2hpdGUtc3BhY2UnLCAnbm93cmFwJyk7XG5cdFx0XHRvdXQgPSBvdXQuam9pbignXFxuJyk7XG5cdFx0fVxuXG5cdFx0dGV4dEFyZWEuc2V0UHJvcGVydHkoJ3ZhbHVlJywgb3V0KTtcblx0fWVsc2Uge1xuXHRcdG91dCA9IHZhbHVlLnRvU3RyaW5nKCk7XG5cdFx0aW5kZXggPSBvdXQuaW5kZXhPZignLicpO1xuXHRcdHRleHRBcmVhLnNldFByb3BlcnR5KCd2YWx1ZScsIGluZGV4ID4gMCA/IG91dC5zbGljZSgwLCBpbmRleCArIGRwKSA6IG91dCk7XG5cdH1cblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBOdW1iZXJPdXRwdXQ7IiwidmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcbnZhciBEb2N1bWVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXG4gICAgTm9kZUV2ZW50ICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50Jyk7XG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcbnZhciBDb2xvck1vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2NvbG9yL0NvbG9yTW9kZScpO1xudmFyIENvbG9yVXRpbCA9IHJlcXVpcmUoJy4uL2NvcmUvY29sb3IvQ29sb3JVdGlsJyk7XG52YXIgTWV0cmljID0gcmVxdWlyZSgnLi9NZXRyaWMnKTtcblxuZnVuY3Rpb24gT3B0aW9ucyhwYXJlbnROb2RlKSB7XG4gICAgdGhpcy5fcGFyZW5Ob2RlID0gcGFyZW50Tm9kZTtcblxuICAgIHZhciBub2RlID0gdGhpcy5fbm9kZSA9IG5ldyBOb2RlKCk7XG4gICAgdmFyIGxpc3ROb2RlID0gdGhpcy5fbGlzdE5vZGUgPSBuZXcgTm9kZShOb2RlLkxJU1QpO1xuXG4gICAgbm9kZS5zZXRTdHlsZUNsYXNzKENTUy5PcHRpb25zKTtcbiAgICBub2RlLmFkZENoaWxkKGxpc3ROb2RlKTtcblxuICAgIHRoaXMuX3NlbGVjdGVkSW5kZXggPSBudWxsO1xuICAgIHRoaXMuX2NhbGxiYWNrT3V0ID0gZnVuY3Rpb24gKCkgeyB9O1xuXG4gICAgdGhpcy5fdW5mb2N1c2FibGUgPSBmYWxzZTtcblxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9ET1dOLCB0aGlzLl9vbkRvY3VtZW50TW91c2VEb3duLmJpbmQodGhpcykpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9VUCwgdGhpcy5fb25Eb2N1bWVudE1vdXNlVXAuYmluZCh0aGlzKSk7XG5cbiAgICB0aGlzLmNsZWFyKCk7XG59XG5cbk9wdGlvbnMucHJvdG90eXBlID0ge1xuICAgIF9vbkRvY3VtZW50TW91c2VEb3duOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghdGhpcy5fdW5mb2N1c2FibGUpcmV0dXJuO1xuICAgICAgICB0aGlzLl9jYWxsYmFja091dCgpO1xuICAgIH0sXG5cbiAgICBfb25Eb2N1bWVudE1vdXNlVXA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fdW5mb2N1c2FibGUgPSB0cnVlO1xuICAgIH0sXG5cbiAgICBidWlsZDogZnVuY3Rpb24gKGVudHJpZXMsIHNlbGVjdGVkLCBlbGVtZW50LCBjYWxsYmFja1NlbGVjdCwgY2FsbGJhY2tPdXQsIHBhZGRpbmdSaWdodCwgYXJlQ29sb3JzLCBjb2xvck1vZGUpIHtcbiAgICAgICAgdGhpcy5fY2xlYXJMaXN0KCk7XG5cbiAgICAgICAgdGhpcy5fcGFyZW5Ob2RlLmFkZENoaWxkKHRoaXMuZ2V0Tm9kZSgpKTtcblxuICAgICAgICB2YXIgcm9vdE5vZGUgPSB0aGlzLl9ub2RlLFxuICAgICAgICAgICAgbGlzdE5vZGUgPSB0aGlzLl9saXN0Tm9kZTtcblxuICAgICAgICBwYWRkaW5nUmlnaHQgPSBwYWRkaW5nUmlnaHQgfHwgMDtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgLy8gYnVpbGQgbGlzdFxuICAgICAgICB2YXIgaXRlbU5vZGUsIGVudHJ5O1xuICAgICAgICB2YXIgaSA9IC0xO1xuXG4gICAgICAgIGlmIChhcmVDb2xvcnMpIHtcbiAgICAgICAgICAgIGNvbG9yTW9kZSA9IGNvbG9yTW9kZSB8fCBDb2xvck1vZGUuSEVYO1xuXG4gICAgICAgICAgICBsaXN0Tm9kZS5zZXRTdHlsZUNsYXNzKENTUy5Db2xvcik7XG5cbiAgICAgICAgICAgIHZhciBjb2xvciwgbm9kZUNvbG9yO1xuXG4gICAgICAgICAgICB3aGlsZSAoKytpIDwgZW50cmllcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBlbnRyeSA9IGVudHJpZXNbaV07XG4gICAgICAgICAgICAgICAgaXRlbU5vZGUgPSBsaXN0Tm9kZS5hZGRDaGlsZChuZXcgTm9kZShOb2RlLkxJU1RfSVRFTSkpO1xuICAgICAgICAgICAgICAgIGNvbG9yID0gaXRlbU5vZGUuYWRkQ2hpbGQobmV3IE5vZGUoKSk7XG5cbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGNvbG9yTW9kZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIENvbG9yTW9kZS5IRVg6XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlQ29sb3IgPSBlbnRyeTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIENvbG9yTW9kZS5SR0I6XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlQ29sb3IgPSBDb2xvclV0aWwuUkdCMkhFWChlbnRyeVswXSwgZW50cnlbMV0sIGVudHJ5WzJdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIENvbG9yTW9kZS5SR0JmdjpcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVDb2xvciA9IENvbG9yVXRpbC5SR0JmdjJIRVgoZW50cnlbMF0sIGVudHJ5WzFdLCBlbnRyeVsyXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBDb2xvck1vZGUuSFNWOlxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZUNvbG9yID0gQ29sb3JVdGlsLkhTVjJSR0IoZW50cnlbMF0sIGVudHJ5WzFdLCBlbnRyeVsyXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb2xvci5nZXRTdHlsZSgpLmJhY2tncm91bmRDb2xvciA9IG5vZGVDb2xvcjtcbiAgICAgICAgICAgICAgICBjb2xvci5nZXRTdHlsZSgpLmJhY2tncm91bmRJbWFnZSA9ICdsaW5lYXItZ3JhZGllbnQoIHJnYmEoMCwwLDAsMCkgMCUsIHJnYmEoMCwwLDAsMC4xKSAxMDAlKSc7XG4gICAgICAgICAgICAgICAgY29sb3Iuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsIGVudHJ5KTtcblxuICAgICAgICAgICAgICAgIGlmIChlbnRyeSA9PSBzZWxlY3RlZClpdGVtTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5PcHRpb25zU2VsZWN0ZWQpO1xuXG4gICAgICAgICAgICAgICAgaXRlbU5vZGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTixcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fc2VsZWN0ZWRJbmRleCA9IEFycmF5LnByb3RvdHlwZS5pbmRleE9mLmNhbGwodGhpcy5wYXJlbnROb2RlLmNoaWxkcmVuLCB0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrU2VsZWN0KCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBsaXN0Tm9kZS5kZWxldGVTdHlsZUNsYXNzKCk7XG5cbiAgICAgICAgICAgIHdoaWxlICgrK2kgPCBlbnRyaWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGVudHJ5ID0gZW50cmllc1tpXTtcblxuICAgICAgICAgICAgICAgIGl0ZW1Ob2RlID0gbGlzdE5vZGUuYWRkQ2hpbGQobmV3IE5vZGUoTm9kZS5MSVNUX0lURU0pKTtcbiAgICAgICAgICAgICAgICBpdGVtTm9kZS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywgZW50cnkpO1xuICAgICAgICAgICAgICAgIGlmIChlbnRyeSA9PSBzZWxlY3RlZClpdGVtTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5PcHRpb25zU2VsZWN0ZWQpO1xuXG4gICAgICAgICAgICAgICAgaXRlbU5vZGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTixcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fc2VsZWN0ZWRJbmRleCA9IEFycmF5LnByb3RvdHlwZS5pbmRleE9mLmNhbGwodGhpcy5wYXJlbnROb2RlLmNoaWxkcmVuLCB0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrU2VsZWN0KCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy9wb3NpdGlvbiwgc2V0IHdpZHRoIGFuZCBlbmFibGVcblxuICAgICAgICB2YXIgZWxlbWVudFBvcyA9IGVsZW1lbnQuZ2V0UG9zaXRpb25HbG9iYWwoKSxcbiAgICAgICAgICAgIGVsZW1lbnRXaWR0aCA9IGVsZW1lbnQuZ2V0V2lkdGgoKSAtIHBhZGRpbmdSaWdodCxcbiAgICAgICAgICAgIGVsZW1lbnRIZWlnaHQgPSBlbGVtZW50LmdldEhlaWdodCgpO1xuXG4gICAgICAgIHZhciBsaXN0V2lkdGggPSBsaXN0Tm9kZS5nZXRXaWR0aCgpLFxuICAgICAgICAgICAgbGlzdEhlaWdodCA9IGxpc3ROb2RlLmdldEhlaWdodCgpLFxuICAgICAgICAgICAgc3Ryb2tlT2Zmc2V0ID0gTWV0cmljLlNUUk9LRV9TSVpFICogMjtcblxuICAgICAgICB2YXIgcGFkZGluZ09wdGlvbnMgPSBNZXRyaWMuUEFERElOR19PUFRJT05TO1xuXG4gICAgICAgIHZhciB3aWR0aCA9IChsaXN0V2lkdGggPCBlbGVtZW50V2lkdGggPyBlbGVtZW50V2lkdGggOiBsaXN0V2lkdGgpIC0gc3Ryb2tlT2Zmc2V0LFxuICAgICAgICAgICAgcG9zWCA9IGVsZW1lbnRQb3NbMF0sXG4gICAgICAgICAgICBwb3NZID0gZWxlbWVudFBvc1sxXSArIGVsZW1lbnRIZWlnaHQgLSBwYWRkaW5nT3B0aW9ucztcblxuICAgICAgICB2YXIgd2luZG93V2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aCxcbiAgICAgICAgICAgIHdpbmRvd0hlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcblxuICAgICAgICB2YXIgcm9vdFBvc1ggPSAocG9zWCArIHdpZHRoKSA+IHdpbmRvd1dpZHRoID8gKHBvc1ggLSB3aWR0aCArIGVsZW1lbnRXaWR0aCAtIHN0cm9rZU9mZnNldCkgOiBwb3NYLFxuICAgICAgICAgICAgcm9vdFBvc1kgPSAocG9zWSArIGxpc3RIZWlnaHQpID4gd2luZG93SGVpZ2h0ID8gKHBvc1kgLSBsaXN0SGVpZ2h0ICogMC41IC0gZWxlbWVudEhlaWdodCAqIDAuNSkgOiBwb3NZO1xuXG4gICAgICAgIGxpc3ROb2RlLnNldFdpZHRoKHdpZHRoKTtcbiAgICAgICAgcm9vdE5vZGUuc2V0UG9zaXRpb25HbG9iYWwocm9vdFBvc1gsIHJvb3RQb3NZKTtcblxuICAgICAgICB0aGlzLl9jYWxsYmFja091dCA9IGNhbGxiYWNrT3V0O1xuICAgICAgICB0aGlzLl91bmZvY3VzYWJsZSA9IGZhbHNlO1xuICAgIH0sXG5cbiAgICBfY2xlYXJMaXN0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2xpc3ROb2RlLnJlbW92ZUFsbENoaWxkcmVuKCk7XG4gICAgICAgIHRoaXMuX2xpc3ROb2RlLmRlbGV0ZVN0eWxlUHJvcGVydHkoJ3dpZHRoJyk7XG4gICAgICAgIHRoaXMuX3NlbGVjdGVkSW5kZXggPSBudWxsO1xuICAgICAgICB0aGlzLl9idWlsZCA9IGZhbHNlO1xuICAgIH0sXG5cbiAgICBjbGVhcjogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9jbGVhckxpc3QoKTtcbiAgICAgICAgdGhpcy5fY2FsbGJhY2tPdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuX3BhcmVuTm9kZS5yZW1vdmVDaGlsZCh0aGlzLmdldE5vZGUoKSk7XG5cbiAgICB9LFxuXG4gICAgaXNCdWlsZDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYnVpbGQ7XG4gICAgfSxcbiAgICBnZXROb2RlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9ub2RlO1xuICAgIH0sXG4gICAgZ2V0U2VsZWN0ZWRJbmRleDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2VsZWN0ZWRJbmRleDtcbiAgICB9XG59O1xuXG5PcHRpb25zLnNldHVwID0gZnVuY3Rpb24ocGFyZW50Tm9kZSl7cmV0dXJuIE9wdGlvbnMuX2luc3RhbmNlID0gbmV3IE9wdGlvbnMocGFyZW50Tm9kZSk7fTtcbk9wdGlvbnMuZ2V0ICAgPSBmdW5jdGlvbigpe3JldHVybiBPcHRpb25zLl9pbnN0YW5jZTt9O1xuT3B0aW9ucy5kZXN0cm95ID0gZnVuY3Rpb24oKXtPcHRpb25zLl9pbnN0YW5jZSA9IG51bGw7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBPcHRpb25zOyIsInZhciBPYmplY3RDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jb3JlL09iamVjdENvbXBvbmVudCcpO1xudmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcblxudmFyIENTUyAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG52YXIgTWV0cmljICAgID0gcmVxdWlyZSgnLi9NZXRyaWMnKTtcbnZhciBTY3JvbGxCYXIgPSByZXF1aXJlKCcuLi9jb3JlL2xheW91dC9TY3JvbGxCYXInKTtcblxudmFyIEV2ZW50XyAgICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIERvY3VtZW50RXZlbnQgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXG4gICAgTm9kZUV2ZW50ICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpLFxuICAgIENvbXBvbmVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9Db21wb25lbnRFdmVudCcpO1xuXG52YXIgREVGQVVMVF9IRUlHSFQgPSBudWxsLFxuICAgIERFRkFVTFRfV1JBUCAgID0gZmFsc2UsXG4gICAgREVGQVVMVF9VUERBVEUgPSB0cnVlO1xuXG5mdW5jdGlvbiBPdXRwdXQocGFyZW50LG9iamVjdCx2YWx1ZSxwYXJhbXMpIHtcbiAgICBPYmplY3RDb21wb25lbnQuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG4gICAgcGFyYW1zICAgICAgICA9IHBhcmFtcyAgICAgICAgfHwge307XG4gICAgcGFyYW1zLmhlaWdodCA9IHBhcmFtcy5oZWlnaHQgfHwgREVGQVVMVF9IRUlHSFQ7XG4gICAgcGFyYW1zLndyYXAgICA9IHBhcmFtcy53cmFwICAgPT09IHVuZGVmaW5lZCA/IERFRkFVTFRfV1JBUCA6IHBhcmFtcy53cmFwO1xuICAgIHBhcmFtcy51cGRhdGUgPSBwYXJhbXMudXBkYXRlID09PSB1bmRlZmluZWQgPyBERUZBVUxUX1VQREFURSA6IHBhcmFtcy51cGRhdGU7XG5cbiAgICB0aGlzLl93cmFwICAgPSBwYXJhbXMud3JhcDtcbiAgICB0aGlzLl91cGRhdGUgPSBwYXJhbXMudXBkYXRlO1xuXG4gICAgdmFyIHRleHRBcmVhID0gdGhpcy5fdGV4dEFyZWEgPSBuZXcgTm9kZShOb2RlLlRFWFRBUkVBKSxcbiAgICAgICAgd3JhcCA9IHRoaXMuX3dyYXBOb2RlLFxuICAgICAgICByb290ID0gdGhpcy5fbm9kZTtcblxuICAgICAgICB0ZXh0QXJlYS5zZXRQcm9wZXJ0eSgncmVhZE9ubHknLHRydWUpO1xuICAgICAgICB3cmFwLmFkZENoaWxkKHRleHRBcmVhKTtcblxuICAgICAgICB0ZXh0QXJlYS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLHRoaXMuX29uSW5wdXREcmFnU3RhcnQuYmluZCh0aGlzKSk7XG4gICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihDb21wb25lbnRFdmVudC5JTlBVVF9TRUxFQ1RfRFJBRyx0aGlzLl9wYXJlbnQsJ29uQ29tcG9uZW50U2VsZWN0RHJhZycpO1xuXG5cbiAgICBpZihwYXJhbXMuaGVpZ2h0KXtcbiAgICAgICAgdmFyIHRleHRBcmVhV3JhcCA9IG5ldyBOb2RlKCk7XG4gICAgICAgICAgICB0ZXh0QXJlYVdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuVGV4dEFyZWFXcmFwKTtcbiAgICAgICAgICAgIHRleHRBcmVhV3JhcC5hZGRDaGlsZCh0ZXh0QXJlYSk7XG4gICAgICAgICAgICB3cmFwLmFkZENoaWxkKHRleHRBcmVhV3JhcCk7XG5cbiAgICAgICAgLy9GSVhNRVxuICAgICAgICB2YXIgaGVpZ2h0ICA9IHRoaXMuX2hlaWdodCA9IHBhcmFtcy5oZWlnaHQsXG4gICAgICAgICAgICBwYWRkaW5nID0gNDtcblxuICAgICAgICAgICAgdGV4dEFyZWEuc2V0SGVpZ2h0KE1hdGgubWF4KGhlaWdodCArIHBhZGRpbmcgICxNZXRyaWMuQ09NUE9ORU5UX01JTl9IRUlHSFQpKTtcbiAgICAgICAgICAgIHdyYXAuc2V0SGVpZ2h0KHRleHRBcmVhLmdldEhlaWdodCgpKTtcbiAgICAgICAgICAgIHJvb3Quc2V0SGVpZ2h0KHdyYXAuZ2V0SGVpZ2h0KCkgKyBwYWRkaW5nKTtcblxuICAgICAgICB0aGlzLl9zY3JvbGxCYXIgPSBuZXcgU2Nyb2xsQmFyKHRleHRBcmVhV3JhcCx0ZXh0QXJlYSxoZWlnaHQgLSBwYWRkaW5nKVxuICAgIH1cblxuICAgIGlmKHBhcmFtcy53cmFwKXtcbiAgICAgICAgdGV4dEFyZWEuc2V0U3R5bGVQcm9wZXJ0eSgnd2hpdGUtc3BhY2UnLCdwcmUtd3JhcCcpO1xuICAgIH1cblxuICAgIHRoaXMuX3ByZXZTdHJpbmcgPSAnJztcbiAgICB0aGlzLl9wcmV2U2Nyb2xsSGVpZ2h0ID0gLTE7XG4gICAgdGhpcy5fc2V0VmFsdWUoKTtcbn1cbk91dHB1dC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE9iamVjdENvbXBvbmVudC5wcm90b3R5cGUpO1xuT3V0cHV0LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IE91dHB1dDtcblxuLy9PdmVycmlkZSBpbiBzdWJjbGFzc1xuT3V0cHV0LnByb3RvdHlwZS5fc2V0VmFsdWUgPSBmdW5jdGlvbiAoKSB7fTtcblxuT3V0cHV0LnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX3NldFZhbHVlKCk7XG59O1xuXG5PdXRwdXQucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZighdGhpcy5fdXBkYXRlKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl9zZXRWYWx1ZSgpO1xufTtcblxuLy9QcmV2ZW50IGNocm9tZSBzZWxlY3QgZHJhZ1xuXG5PdXRwdXQucHJvdG90eXBlLl9vbkRyYWcgPSBmdW5jdGlvbigpe1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LklOUFVUX1NFTEVDVF9EUkFHLCBudWxsKSk7XG59O1xuXG5PdXRwdXQucHJvdG90eXBlLl9vbkRyYWdGaW5pc2ggPSBmdW5jdGlvbigpe1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LklOUFVUX1NFTEVDVF9EUkFHLCBudWxsKSk7XG5cbiAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSwgdGhpcy5fb25EcmFnLCBmYWxzZSk7XG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsIHRoaXMuX29uRHJhZ0ZpbmlzaCwgZmFsc2UpO1xufTtcblxuT3V0cHV0LnByb3RvdHlwZS5fb25JbnB1dERyYWdTdGFydCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LklOUFVUX1NFTEVDVF9EUkFHLCBudWxsKSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsIHRoaXMuX29uRHJhZy5iaW5kKHRoaXMpLCBmYWxzZSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX1VQLCAgIHRoaXMuX29uRHJhZ0ZpbmlzaC5iaW5kKHRoaXMpLCBmYWxzZSk7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gT3V0cHV0O1xuIiwidmFyIFBsb3R0ZXIgPSByZXF1aXJlKCcuL1Bsb3R0ZXInKTtcbnZhciBNb3VzZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTW91c2UnKTtcblxudmFyIEV2ZW50XyAgICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIERvY3VtZW50RXZlbnQgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXG4gICAgQ29tcG9uZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL0NvbXBvbmVudEV2ZW50Jyk7XG5cbnZhciBERUZBVUxUX0JPVU5EU19YID0gWy0xLDFdLFxuICAgIERFRkFVTFRfQk9VTkRTX1kgPSBbLTEsMV0sXG4gICAgREVGQVVMVF9MQUJFTF9YICA9ICcnLFxuICAgIERFRkFVTFRfTEFCRUxfWSAgPSAnJztcblxuZnVuY3Rpb24gUGFkKHBhcmVudCwgb2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgUGxvdHRlci5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cbiAgICBwYXJhbXMgICAgICAgICAgICA9IHBhcmFtcyAgICAgICAgICAgIHx8IHt9O1xuICAgIHBhcmFtcy5ib3VuZHNYICAgID0gcGFyYW1zLmJvdW5kc1ggICAgfHwgREVGQVVMVF9CT1VORFNfWDtcbiAgICBwYXJhbXMuYm91bmRzWSAgICA9IHBhcmFtcy5ib3VuZHNZICAgIHx8IERFRkFVTFRfQk9VTkRTX1k7XG4gICAgcGFyYW1zLmxhYmVsWCAgICAgPSBwYXJhbXMubGFiZWxYICAgICB8fCBERUZBVUxUX0xBQkVMX1g7XG4gICAgcGFyYW1zLmxhYmVsWSAgICAgPSBwYXJhbXMubGFiZWxZICAgICB8fCBERUZBVUxUX0xBQkVMX1k7XG5cbiAgICBwYXJhbXMuc2hvd0Nyb3NzICA9IHBhcmFtcy5zaG93Q3Jvc3MgIHx8IHRydWU7XG5cblxuICAgIHRoaXMuX29uQ2hhbmdlICAgICA9IHBhcmFtcy5vbkNoYW5nZSB8fCB0aGlzLl9vbkNoYW5nZTtcbiAgICB0aGlzLl9vbkZpbmlzaCAgICAgPSBwYXJhbXMub25GaW5pc2ggfHwgZnVuY3Rpb24oKXt9O1xuXG4gICAgdGhpcy5fYm91bmRzWCAgICAgID0gcGFyYW1zLmJvdW5kc1g7XG4gICAgdGhpcy5fYm91bmRzWSAgICAgID0gcGFyYW1zLmJvdW5kc1k7XG4gICAgdGhpcy5fbGFiZWxBeGlzWCAgID0gcGFyYW1zLmxhYmVsWCAhPSAnJyAmJiBwYXJhbXMubGFiZWxYICE9ICdub25lJyA/IHBhcmFtcy5sYWJlbFggOiBudWxsO1xuICAgIHRoaXMuX2xhYmVsQXhpc1kgICA9IHBhcmFtcy5sYWJlbFkgIT0gJycgJiYgcGFyYW1zLmxhYmVsWSAhPSAnbm9uZScgPyBwYXJhbXMubGFiZWxZIDogbnVsbDtcblxuICAgIHZhciBwYXRoID0gdGhpcy5fcGF0aDtcbiAgICAgICAgcGF0aC5zdHlsZS5zdHJva2VXaWR0aCA9IDE7XG4gICAgICAgIHBhdGguc3R5bGUuc3Ryb2tlICAgICAgPSAnIzM2M2M0MCc7XG5cbiAgICB0aGlzLl9ncmlkLnN0eWxlLnN0cm9rZSA9ICdyZ2IoMjUsMjUsMjUpJztcblxuICAgIHRoaXMuX3N2Z1BvcyA9IFswLDBdO1xuXG5cbiAgICB2YXIgaGFuZGxlID0gdGhpcy5faGFuZGxlID0gdGhpcy5fc3ZnUm9vdC5hcHBlbmRDaGlsZCh0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ2cnKSk7XG4gICAgdmFyIGhhbmRsZUNpcmNsZTAgPSBoYW5kbGUuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdjaXJjbGUnKSk7XG4gICAgICAgIGhhbmRsZUNpcmNsZTAuc2V0QXR0cmlidXRlKCdyJyxTdHJpbmcoMTEpKTtcbiAgICAgICAgaGFuZGxlQ2lyY2xlMC5zZXRBdHRyaWJ1dGUoJ2ZpbGwnLCdyZ2JhKDAsMCwwLDAuMDUpJyk7XG4gICAgdmFyIGhhbmRsZUNpcmNsZTEgPSBoYW5kbGUuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdjaXJjbGUnKSk7XG4gICAgICAgIGhhbmRsZUNpcmNsZTEuc2V0QXR0cmlidXRlKCdyJyxTdHJpbmcoMTApKTtcbiAgICAgICAgaGFuZGxlQ2lyY2xlMS5zZXRBdHRyaWJ1dGUoJ2ZpbGwnLCdyZ2IoODMsOTMsOTgpJyk7XG5cbiAgICB2YXIgaGFuZGxlQ2lyY2xlMiA9IGhhbmRsZS5hcHBlbmRDaGlsZCh0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ2NpcmNsZScpKTtcbiAgICAgICAgaGFuZGxlQ2lyY2xlMi5zZXRBdHRyaWJ1dGUoJ3InLFN0cmluZyg5KSk7XG4gICAgICAgIGhhbmRsZUNpcmNsZTIuc2V0QXR0cmlidXRlKCdmaWxsJywncmdiKDU3LDY5LDc2KScpO1xuICAgICAgICBoYW5kbGVDaXJjbGUyLnNldEF0dHJpYnV0ZSgnY3knLFN0cmluZygwLjc1KSk7XG5cbiAgICB2YXIgaGFuZGxlQ2lyY2xlMyA9IGhhbmRsZS5hcHBlbmRDaGlsZCh0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ2NpcmNsZScpKTtcbiAgICAgICAgaGFuZGxlQ2lyY2xlMy5zZXRBdHRyaWJ1dGUoJ3InLFN0cmluZygxMCkpO1xuICAgICAgICBoYW5kbGVDaXJjbGUzLnNldEF0dHJpYnV0ZSgnc3Ryb2tlJywncmdiKDE3LDE5LDIwKScpO1xuICAgICAgICBoYW5kbGVDaXJjbGUzLnNldEF0dHJpYnV0ZSgnc3Ryb2tlLXdpZHRoJyxTdHJpbmcoMSkpO1xuICAgICAgICBoYW5kbGVDaXJjbGUzLnNldEF0dHJpYnV0ZSgnZmlsbCcsJ25vbmUnKTtcblxuICAgIHZhciBoYW5kbGVDaXJjbGU0ID0gaGFuZGxlLmFwcGVuZENoaWxkKHRoaXMuX2NyZWF0ZVNWR09iamVjdCgnY2lyY2xlJykpO1xuICAgICAgICBoYW5kbGVDaXJjbGU0LnNldEF0dHJpYnV0ZSgncicsU3RyaW5nKDYpKTtcbiAgICAgICAgaGFuZGxlQ2lyY2xlNC5zZXRBdHRyaWJ1dGUoJ2ZpbGwnLCdyZ2IoMzAsMzQsMzYpJyk7XG4gICAgdmFyIGhhbmRsZUNpcmNsZTUgPSBoYW5kbGUuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdjaXJjbGUnKSk7XG4gICAgICAgIGhhbmRsZUNpcmNsZTUuc2V0QXR0cmlidXRlKCdyJyxTdHJpbmcoMykpO1xuICAgICAgICBoYW5kbGVDaXJjbGU1LnNldEF0dHJpYnV0ZSgnZmlsbCcsJ3JnYigyNTUsMjU1LDI1NSknKTtcblxuICAgICAgICBoYW5kbGUuc2V0QXR0cmlidXRlKCd0cmFuZm9ybScsJ3RyYW5zbGF0ZSgwIDApJyk7XG5cbiAgICB0aGlzLl9zdmcuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX0RPV04sdGhpcy5fb25EcmFnU3RhcnQuYmluZCh0aGlzKSxmYWxzZSk7XG4gICAgdGhpcy5fZHJhd1ZhbHVlKHRoaXMuX29ialt0aGlzLl9rZXldKTtcbn1cblBhZC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFBsb3R0ZXIucHJvdG90eXBlKTtcblBhZC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBQYWQ7XG5cblBhZC5wcm90b3R5cGUuX29uRHJhZ1N0YXJ0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBlbGVtZW50ID0gdGhpcy5fc3ZnO1xuXG4gICAgdmFyIHN2Z1BvcyA9IHRoaXMuX3N2Z1BvcztcbiAgICAgICAgc3ZnUG9zWzBdID0gMDtcbiAgICAgICAgc3ZnUG9zWzFdID0gMDtcblxuICAgIHdoaWxlIChlbGVtZW50KSB7XG4gICAgICAgIHN2Z1Bvc1swXSArPSBlbGVtZW50Lm9mZnNldExlZnQ7XG4gICAgICAgIHN2Z1Bvc1sxXSArPSBlbGVtZW50Lm9mZnNldFRvcDtcbiAgICAgICAgZWxlbWVudCA9IGVsZW1lbnQub2Zmc2V0UGFyZW50O1xuICAgIH1cblxuICAgIHZhciBldmVudE1vdmUgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsXG4gICAgICAgIGV2ZW50VXAgICA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XG5cbiAgICB2YXIgb25EcmFnID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9kcmF3VmFsdWVJbnB1dCgpO1xuICAgICAgICB0aGlzLmFwcGx5VmFsdWUoKTtcbiAgICAgICAgdGhpcy5fb25DaGFuZ2UoKTtcbiAgICB9LmJpbmQodGhpcyk7XG5cbiAgICB2YXIgb25EcmFnRW5kID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnB1c2hIaXN0b3J5U3RhdGUoKTtcbiAgICAgICAgdGhpcy5fZHJhd1ZhbHVlSW5wdXQoKTtcbiAgICAgICAgdGhpcy5hcHBseVZhbHVlKCk7XG4gICAgICAgIHRoaXMuX29uRmluaXNoKCk7XG5cbiAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50VXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xuICAgIH0uYmluZCh0aGlzKTtcblxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3ZlLCBvbkRyYWcsICAgIGZhbHNlKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50VXAsICAgb25EcmFnRW5kLCBmYWxzZSk7XG5cbiAgICB0aGlzLl9kcmF3VmFsdWVJbnB1dCgpO1xuICAgIHRoaXMuYXBwbHlWYWx1ZSgpO1xuICAgIHRoaXMuX29uQ2hhbmdlKCk7XG59O1xuXG5QYWQucHJvdG90eXBlLl9yZWRyYXcgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fZHJhd1ZhbHVlKHRoaXMuX29ialt0aGlzLl9rZXldKTtcbn07XG5cblBhZC5wcm90b3R5cGUuX2RyYXdWYWx1ZUlucHV0ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2RyYXdWYWx1ZSh0aGlzLl9nZXRNb3VzZU5vcm1hbGl6ZWQoKSk7XG59O1xuXG5QYWQucHJvdG90eXBlLl9kcmF3VmFsdWUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB0aGlzLl9vYmpbdGhpcy5fa2V5XSA9IHZhbHVlO1xuICAgIHRoaXMuX2RyYXdHcmlkKCk7XG4gICAgdGhpcy5fZHJhd1BvaW50KCk7XG59O1xuXG5QYWQucHJvdG90eXBlLl9kcmF3R3JpZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc3ZnU2l6ZSA9IE51bWJlcih0aGlzLl9zdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKSxcbiAgICAgICAgc3ZnTWlkWCA9IE1hdGguZmxvb3Ioc3ZnU2l6ZSAqIDAuNSksXG4gICAgICAgIHN2Z01pZFkgPSBNYXRoLmZsb29yKHN2Z1NpemUgKiAwLjUpO1xuXG4gICAgdmFyIHBhdGhDbWQgPSAnJztcbiAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRMaW5lKDAsIHN2Z01pZFksIHN2Z1NpemUsIHN2Z01pZFkpO1xuICAgIHBhdGhDbWQgKz0gdGhpcy5fcGF0aENtZExpbmUoc3ZnTWlkWCwgMCwgc3ZnTWlkWCwgc3ZnU2l6ZSk7XG5cbiAgICB0aGlzLl9ncmlkLnNldEF0dHJpYnV0ZSgnZCcsIHBhdGhDbWQpO1xufTtcblxuXG5QYWQucHJvdG90eXBlLl9kcmF3UG9pbnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHN2Z1NpemUgPSBOdW1iZXIodGhpcy5fc3ZnLmdldEF0dHJpYnV0ZSgnd2lkdGgnKSksXG4gICAgICAgIHN2Z01pZFggPSBzdmdTaXplICogMC41LFxuICAgICAgICBzdmdNaWRZID0gc3ZnU2l6ZSAqIDAuNTtcblxuICAgIHZhciB2YWx1ZSA9IHRoaXMuX29ialt0aGlzLl9rZXldO1xuXG4gICAgdmFyIGxvY2FsWCA9ICggMC41ICsgdmFsdWVbMF0gKiAwLjUgKSAqIHN2Z1NpemUsXG4gICAgICAgIGxvY2FsWSA9ICggMC41ICsgLXZhbHVlWzFdICogMC41ICkgKiBzdmdTaXplO1xuXG4gICAgdmFyIHBhdGhDbWQgPSAnJztcbiAgICAgICAgcGF0aENtZCArPSB0aGlzLl9wYXRoQ21kTGluZSgwLCBsb2NhbFksIHN2Z1NpemUsIGxvY2FsWSk7XG4gICAgICAgIHBhdGhDbWQgKz0gdGhpcy5fcGF0aENtZExpbmUobG9jYWxYLCAwLCBsb2NhbFgsIHN2Z1NpemUpO1xuXG4gICAgdGhpcy5fcGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwYXRoQ21kKTtcbiAgICB0aGlzLl9oYW5kbGUuc2V0QXR0cmlidXRlKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyBsb2NhbFggKyAnICcgKyBsb2NhbFkgKyAnKScpO1xufTtcblxuUGFkLnByb3RvdHlwZS5fZ2V0TW91c2VOb3JtYWxpemVkID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBvZmZzZXQgPSB0aGlzLl9zdmdQb3MsXG4gICAgICAgIG1vdXNlID0gTW91c2UuZ2V0KCkuZ2V0UG9zaXRpb24oKSxcbiAgICAgICAgc3ZnU2l6ZSA9IE51bWJlcih0aGlzLl9zdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKTtcblxuICAgIHJldHVybiBbLTEgKyBNYXRoLm1heCgwLCBNYXRoLm1pbihtb3VzZVswXSAtIG9mZnNldFswXSwgc3ZnU2l6ZSkpIC8gc3ZnU2l6ZSAqIDIsXG4gICAgICAgICggMSAtIE1hdGgubWF4KDAsIE1hdGgubWluKG1vdXNlWzFdIC0gb2Zmc2V0WzFdLCBzdmdTaXplKSkgLyBzdmdTaXplICogMildO1xuXG59O1xuXG5QYWQucHJvdG90eXBlLmFwcGx5VmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCwgbnVsbCkpO1xufTtcblxuUGFkLnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAoZS5kYXRhLm9yaWdpbiA9PSB0aGlzKXJldHVybjtcbiAgICB0aGlzLl9kcmF3VmFsdWUodGhpcy5fb2JqW3RoaXMuX2tleV0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQYWQ7XG4iLCJ2YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xuXG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcbnZhciBOdW1iZXJJbnB1dF9JbnRlcm5hbCA9IHJlcXVpcmUoJy4vTnVtYmVySW5wdXRfSW50ZXJuYWwnKTtcbnZhciBNb3VzZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTW91c2UnKTtcbnZhciBDb2xvclV0aWwgPSByZXF1aXJlKCcuLi9jb3JlL2NvbG9yL0NvbG9yVXRpbCcpO1xudmFyIERvY3VtZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcbiAgICBOb2RlRXZlbnQgICAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKTtcblxudmFyIERFRkFVTFRfVkFMVUVfSFVFID0gMjAwLjAsXG4gICAgREVGQVVMVF9WQUxVRV9TQVQgPSA1MC4wLFxuICAgIERFRkFVTFRfVkFMVUVfVkFMID0gNTAuMDtcblxuZnVuY3Rpb24gUGlja2VyKHBhcmVudE5vZGUpe1xuICAgIHZhciByb290ID0gdGhpcy5fbm9kZSAgICAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlciksXG4gICAgICAgIGhlYWQgPSB0aGlzLl9oZWFkTm9kZSA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuSGVhZCksXG4gICAgICAgIGxhYmVsV3JhcCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCksXG4gICAgICAgIGxhYmVsID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCksXG4gICAgICAgIG1lbnUgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLk1lbnUpLFxuICAgICAgICBtZW51V3JhcCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCk7XG5cbiAgICB2YXIgbWVudUNsb3NlID0gbmV3IE5vZGUoTm9kZS5JTlBVVF9CVVRUT04pO1xuICAgICAgICBtZW51Q2xvc2Uuc2V0U3R5bGVDbGFzcyhDU1MuQnV0dG9uTWVudUNsb3NlKTtcblxuICAgIHZhciBmaWVsZFdyYXAgID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKCBDU1MuUGlja2VyRmllbGRXcmFwKSxcbiAgICAgICAgc2xpZGVyV3JhcCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuU2xpZGVyV3JhcCksXG4gICAgICAgIGlucHV0V3JhcCAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoIENTUy5QaWNrZXJJbnB1dFdyYXApO1xuXG4gICAgdmFyIGNhbnZhc0ZpZWxkICA9IHRoaXMuX2NhbnZhc0ZpZWxkICA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpLFxuICAgICAgICBjYW52YXNTbGlkZXIgPSB0aGlzLl9jYW52YXNTbGlkZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdDYW52YXMnKTtcblxuICAgICAgICBmaWVsZFdyYXAuZ2V0RWxlbWVudCgpLmFwcGVuZENoaWxkKGNhbnZhc0ZpZWxkKTtcbiAgICAgICAgc2xpZGVyV3JhcC5nZXRFbGVtZW50KCkuYXBwZW5kQ2hpbGQoY2FudmFzU2xpZGVyKTtcblxuICAgICAgICB0aGlzLl9zZXRTaXplQ2FudmFzRmllbGQoMTU0LDE1NCk7XG4gICAgICAgIHRoaXMuX3NldFNpemVDYW52YXNTbGlkZXIoMTQsMTU0KTtcblxuICAgIHZhciBjb250ZXh0Q2FudmFzRmllbGQgID0gdGhpcy5fY29udGV4dENhbnZhc0ZpZWxkICA9IGNhbnZhc0ZpZWxkLmdldENvbnRleHQoJzJkJyksXG4gICAgICAgIGNvbnRleHRDYW52YXNTbGlkZXIgPSB0aGlzLl9jb250ZXh0Q2FudmFzU2xpZGVyID0gY2FudmFzU2xpZGVyLmdldENvbnRleHQoJzJkJyk7XG5cbiAgICB2YXIgaGFuZGxlRmllbGQgID0gdGhpcy5faGFuZGxlRmllbGQgID0gbmV3IE5vZGUoKTtcbiAgICAgICAgaGFuZGxlRmllbGQuc2V0U3R5bGVDbGFzcyhDU1MuUGlja2VySGFuZGxlRmllbGQpO1xuXG4gICAgdmFyIGhhbmRsZVNsaWRlciA9IHRoaXMuX2hhbmRsZVNsaWRlciA9IG5ldyBOb2RlKCk7XG4gICAgICAgIGhhbmRsZVNsaWRlci5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJIYW5kbGVTbGlkZXIpO1xuXG4gICAgdmFyIHN0ZXAgPSAxLjAsXG4gICAgICAgIGRwICAgPSAwO1xuXG4gICAgdmFyIGNhbGxiYWNrSHVlID0gdGhpcy5fb25JbnB1dEh1ZUNoYW5nZS5iaW5kKHRoaXMpLFxuICAgICAgICBjYWxsYmFja1NhdCA9IHRoaXMuX29uSW5wdXRTYXRDaGFuZ2UuYmluZCh0aGlzKSxcbiAgICAgICAgY2FsbGJhY2tWYWwgPSB0aGlzLl9vbklucHV0VmFsQ2hhbmdlLmJpbmQodGhpcyksXG4gICAgICAgIGNhbGxiYWNrUiAgID0gdGhpcy5fb25JbnB1dFJDaGFuZ2UuYmluZCh0aGlzKSxcbiAgICAgICAgY2FsbGJhY2tHICAgPSB0aGlzLl9vbklucHV0R0NoYW5nZS5iaW5kKHRoaXMpLFxuICAgICAgICBjYWxsYmFja0IgICA9IHRoaXMuX29uSW5wdXRCQ2hhbmdlLmJpbmQodGhpcyk7XG5cblxuICAgIHZhciBpbnB1dEh1ZSA9IHRoaXMuX2lucHV0SHVlID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHN0ZXAsZHAsbnVsbCxjYWxsYmFja0h1ZSksXG4gICAgICAgIGlucHV0U2F0ID0gdGhpcy5faW5wdXRTYXQgPSBuZXcgTnVtYmVySW5wdXRfSW50ZXJuYWwoc3RlcCxkcCxudWxsLGNhbGxiYWNrU2F0KSxcbiAgICAgICAgaW5wdXRWYWwgPSB0aGlzLl9pbnB1dFZhbCA9IG5ldyBOdW1iZXJJbnB1dF9JbnRlcm5hbChzdGVwLGRwLG51bGwsY2FsbGJhY2tWYWwpLFxuICAgICAgICBpbnB1dFIgICA9IHRoaXMuX2lucHV0UiAgID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHN0ZXAsZHAsbnVsbCxjYWxsYmFja1IpLFxuICAgICAgICBpbnB1dEcgICA9IHRoaXMuX2lucHV0RyAgID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHN0ZXAsZHAsbnVsbCxjYWxsYmFja0cpLFxuICAgICAgICBpbnB1dEIgICA9IHRoaXMuX2lucHV0QiAgID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHN0ZXAsZHAsbnVsbCxjYWxsYmFja0IpO1xuXG4gICAgdmFyIGNvbnRyb2xzV3JhcCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuUGlja2VyQ29udHJvbHNXcmFwKTtcblxuICAgIHZhciBidXR0b25QaWNrICAgPSBuZXcgTm9kZShOb2RlLklOUFVUX0JVVFRPTikuc2V0U3R5bGVDbGFzcyhDU1MuQnV0dG9uKS5zZXRQcm9wZXJ0eSgndmFsdWUnLCdwaWNrJyksXG4gICAgICAgIGJ1dHRvbkNhbmNlbCA9IG5ldyBOb2RlKE5vZGUuSU5QVVRfQlVUVE9OKS5zZXRTdHlsZUNsYXNzKENTUy5CdXR0b24pLnNldFByb3BlcnR5KCd2YWx1ZScsJ2NhbmNlbCcpO1xuXG5cbiAgICB2YXIgY29sb3JDb250cmFzdCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuUGlja2VyQ29sb3JDb250cmFzdCk7XG5cbiAgICB2YXIgY29sb3IwID0gdGhpcy5fY29sb3JDdXJyTm9kZSA9IG5ldyBOb2RlKCksXG4gICAgICAgIGNvbG9yMSA9IHRoaXMuX2NvbG9yUHJldk5vZGUgPSBuZXcgTm9kZSgpO1xuXG4gICAgY29sb3JDb250cmFzdC5hZGRDaGlsZChjb2xvcjApO1xuICAgIGNvbG9yQ29udHJhc3QuYWRkQ2hpbGQoY29sb3IxKTtcblxuICAgIGNvbnRyb2xzV3JhcC5hZGRDaGlsZChidXR0b25DYW5jZWwpO1xuICAgIGNvbnRyb2xzV3JhcC5hZGRDaGlsZChidXR0b25QaWNrKTtcbiAgICBjb250cm9sc1dyYXAuYWRkQ2hpbGQoY29sb3JDb250cmFzdCk7XG5cbiAgICB0aGlzLl9zZXRDb250cmFzUHJldkNvbG9yKDAsMCwwKTtcblxuICAgIHZhciBpbnB1dEZpZWxkV3JhcEh1ZSA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuUGlja2VySW5wdXRGaWVsZCksXG4gICAgICAgIGlucHV0RmllbGRXcmFwU2F0ID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJJbnB1dEZpZWxkKSxcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBWYWwgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlcklucHV0RmllbGQpO1xuXG4gICAgdmFyIGlucHV0RmllbGRXcmFwSHVlTGFiZWwgPSBuZXcgTm9kZShOb2RlLlNQQU4pLnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywnSCcpLFxuICAgICAgICBpbnB1dEZpZWxkV3JhcFNhdExhYmVsID0gbmV3IE5vZGUoTm9kZS5TUEFOKS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCkuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsJ1MnKSxcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBWYWxMYWJlbCA9IG5ldyBOb2RlKE5vZGUuU1BBTikuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCdWJyk7XG5cbiAgICAgICAgaW5wdXRGaWVsZFdyYXBIdWUuYWRkQ2hpbGRyZW4oaW5wdXRGaWVsZFdyYXBIdWVMYWJlbCxpbnB1dEh1ZS5nZXROb2RlKCkpO1xuICAgICAgICBpbnB1dEZpZWxkV3JhcFNhdC5hZGRDaGlsZHJlbihpbnB1dEZpZWxkV3JhcFNhdExhYmVsLGlucHV0U2F0LmdldE5vZGUoKSk7XG4gICAgICAgIGlucHV0RmllbGRXcmFwVmFsLmFkZENoaWxkcmVuKGlucHV0RmllbGRXcmFwVmFsTGFiZWwsaW5wdXRWYWwuZ2V0Tm9kZSgpKTtcblxuICAgIHZhciBpbnB1dEZpZWxkV3JhcFIgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlcklucHV0RmllbGQpLFxuICAgICAgICBpbnB1dEZpZWxkV3JhcEcgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlcklucHV0RmllbGQpLFxuICAgICAgICBpbnB1dEZpZWxkV3JhcEIgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlcklucHV0RmllbGQpO1xuXG4gICAgdmFyIGlucHV0RmllbGRXcmFwUkxhYmVsID0gbmV3IE5vZGUoTm9kZS5TUEFOKS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCkuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsJ1InKSxcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBHTGFiZWwgPSBuZXcgTm9kZShOb2RlLlNQQU4pLnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywnRycpLFxuICAgICAgICBpbnB1dEZpZWxkV3JhcEJMYWJlbCA9IG5ldyBOb2RlKE5vZGUuU1BBTikuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCdCJyk7XG5cbiAgICAgICAgaW5wdXRGaWVsZFdyYXBSLmFkZENoaWxkcmVuKGlucHV0RmllbGRXcmFwUkxhYmVsLGlucHV0Ui5nZXROb2RlKCkpO1xuICAgICAgICBpbnB1dEZpZWxkV3JhcEcuYWRkQ2hpbGRyZW4oaW5wdXRGaWVsZFdyYXBHTGFiZWwsaW5wdXRHLmdldE5vZGUoKSk7XG4gICAgICAgIGlucHV0RmllbGRXcmFwQi5hZGRDaGlsZHJlbihpbnB1dEZpZWxkV3JhcEJMYWJlbCxpbnB1dEIuZ2V0Tm9kZSgpKTtcblxuXG4gICAgICAgIGlucHV0V3JhcC5hZGRDaGlsZHJlbihpbnB1dEZpZWxkV3JhcFIsaW5wdXRGaWVsZFdyYXBIdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dEZpZWxkV3JhcEcsaW5wdXRGaWVsZFdyYXBTYXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dEZpZWxkV3JhcEIsaW5wdXRGaWVsZFdyYXBWYWwsY29sb3JDb250cmFzdCk7XG5cbiAgICB2YXIgaGV4SW5wdXRXcmFwID0gbmV3IE5vZGUoKTtcbiAgICAgICAgaGV4SW5wdXRXcmFwLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlcklucHV0V3JhcCk7XG5cbiAgICB2YXIgaW5wdXRIRVggPSB0aGlzLl9pbnB1dEhFWCA9IG5ldyBOb2RlKE5vZGUuSU5QVVRfVEVYVCksXG4gICAgICAgIGlucHV0RmllbGRXcmFwSEVYICAgICAgICAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlcklucHV0RmllbGQpLFxuICAgICAgICBpbnB1dEZpZWxkV3JhcEhFWExhYmVsICAgID0gbmV3IE5vZGUoTm9kZS5TUEFOKS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCk7XG5cbiAgICAgICAgaW5wdXRGaWVsZFdyYXBIRVhMYWJlbC5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywnIycpO1xuICAgICAgICBpbnB1dEZpZWxkV3JhcEhFWC5hZGRDaGlsZHJlbihpbnB1dEZpZWxkV3JhcEhFWExhYmVsLGlucHV0SEVYKTtcblxuICAgICAgICBoZXhJbnB1dFdyYXAuYWRkQ2hpbGQoaW5wdXRGaWVsZFdyYXBIRVgpO1xuXG4gICAgICAgIGlucHV0SEVYLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50LkNIQU5HRSx0aGlzLl9vbklucHV0SEVYRmluaXNoLmJpbmQodGhpcykpO1xuXG4gICAgICAgIGxhYmVsLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCdDb2xvciBQaWNrZXInKTtcblxuICAgICAgICBtZW51LmFkZENoaWxkKG1lbnVDbG9zZSk7XG4gICAgICAgIGhlYWQuYWRkQ2hpbGQobWVudSk7XG4gICAgICAgIGxhYmVsV3JhcC5hZGRDaGlsZChsYWJlbCk7XG4gICAgICAgIGhlYWQuYWRkQ2hpbGQobGFiZWxXcmFwKTtcbiAgICAgICAgcm9vdC5hZGRDaGlsZChoZWFkKTtcbiAgICAgICAgcm9vdC5hZGRDaGlsZChtZW51V3JhcCk7XG5cbiAgICAgICAgLy93cmFwTm9kZS5hZGRDaGlsZChwYWxldHRlV3JhcCk7XG5cbiAgICAgICAgbWVudVdyYXAuYWRkQ2hpbGQoZmllbGRXcmFwKTtcbiAgICAgICAgbWVudVdyYXAuYWRkQ2hpbGQoc2xpZGVyV3JhcCk7XG4gICAgICAgIG1lbnVXcmFwLmFkZENoaWxkKGlucHV0V3JhcCk7XG4gICAgICAgIG1lbnVXcmFwLmFkZENoaWxkKGhleElucHV0V3JhcCk7XG4gICAgICAgIG1lbnVXcmFwLmFkZENoaWxkKGNvbnRyb2xzV3JhcCk7XG5cbiAgICAgICAgZmllbGRXcmFwLmFkZENoaWxkKCBoYW5kbGVGaWVsZCk7XG4gICAgICAgIHNsaWRlcldyYXAuYWRkQ2hpbGQoaGFuZGxlU2xpZGVyKTtcblxuICAgIHZhciBldmVudE1vdXNlRG93biA9IE5vZGVFdmVudC5NT1VTRV9ET1dOLFxuICAgICAgICBjYWxsYmFjayAgICAgICA9IHRoaXMuX29uQ2FudmFzRmllbGRNb3VzZURvd24uYmluZCh0aGlzKTtcblxuICAgICAgICBmaWVsZFdyYXAuYWRkRXZlbnRMaXN0ZW5lciggIGV2ZW50TW91c2VEb3duLCBjYWxsYmFjayk7XG4gICAgICAgIGhhbmRsZUZpZWxkLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZURvd24sIGNhbGxiYWNrKTtcblxuICAgICAgICBjYWxsYmFjayA9IHRoaXMuX29uQ2FudmFzU2xpZGVyTW91c2VEb3duLmJpbmQodGhpcyk7XG5cbiAgICAgICAgc2xpZGVyV3JhcC5hZGRFdmVudExpc3RlbmVyKCAgZXZlbnRNb3VzZURvd24sIGNhbGxiYWNrKTtcbiAgICAgICAgaGFuZGxlU2xpZGVyLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZURvd24sIGNhbGxiYWNrKTtcblxuICAgICAgICBtZW51Q2xvc2UuYWRkRXZlbnRMaXN0ZW5lciggICBldmVudE1vdXNlRG93biwgdGhpcy5fb25DbG9zZS5iaW5kKHRoaXMpKTtcbiAgICAgICAgYnV0dG9uUGljay5hZGRFdmVudExpc3RlbmVyKCAgZXZlbnRNb3VzZURvd24sIHRoaXMuX29uUGljay5iaW5kKHRoaXMpKTtcbiAgICAgICAgYnV0dG9uQ2FuY2VsLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZURvd24sIHRoaXMuX29uQ2xvc2UuYmluZCh0aGlzKSk7XG5cbiAgICAgICAgaGVhZC5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLCB0aGlzLl9vbkhlYWREcmFnU3RhcnQuYmluZCh0aGlzKSk7XG5cbiAgICB0aGlzLl9wYXJlbnROb2RlID0gcGFyZW50Tm9kZTtcblxuICAgIHRoaXMuX21vdXNlT2Zmc2V0ID0gWzAsMF07XG4gICAgdGhpcy5fcG9zaXRpb24gICAgPSBbbnVsbCxudWxsXTtcblxuICAgIHRoaXMuX2NhbnZhc1NsaWRlclBvcyA9IFswLDBdO1xuICAgIHRoaXMuX2NhbnZhc0ZpZWxkUG9zICA9IFswLDBdO1xuICAgIHRoaXMuX2hhbmRsZUZpZWxkU2l6ZSAgICA9IDEyO1xuICAgIHRoaXMuX2hhbmRsZVNsaWRlckhlaWdodCA9IDc7XG5cbiAgICB0aGlzLl9pbWFnZURhdGFTbGlkZXIgPSBjb250ZXh0Q2FudmFzU2xpZGVyLmNyZWF0ZUltYWdlRGF0YShjYW52YXNTbGlkZXIud2lkdGgsY2FudmFzU2xpZGVyLmhlaWdodCk7XG4gICAgdGhpcy5faW1hZ2VEYXRhRmllbGQgID0gY29udGV4dENhbnZhc0ZpZWxkLmNyZWF0ZUltYWdlRGF0YSggY2FudmFzRmllbGQud2lkdGgsIGNhbnZhc0ZpZWxkLmhlaWdodCk7XG5cbiAgICB0aGlzLl92YWx1ZUh1ZU1pbk1heCA9IFswLDM2MF07XG4gICAgdGhpcy5fdmFsdWVTYXRNaW5NYXggPSB0aGlzLl92YWx1ZVZhbE1pbk1heCA9IFswLDEwMF07XG4gICAgdGhpcy5fdmFsdWVSR0JNaW5NYXggPSBbMCwyNTVdO1xuXG4gICAgdGhpcy5fdmFsdWVIdWUgPSBERUZBVUxUX1ZBTFVFX0hVRTtcbiAgICB0aGlzLl92YWx1ZVNhdCA9IERFRkFVTFRfVkFMVUVfU0FUO1xuICAgIHRoaXMuX3ZhbHVlVmFsID0gREVGQVVMVF9WQUxVRV9WQUw7XG4gICAgdGhpcy5fdmFsdWVSICAgPSAwO1xuICAgIHRoaXMuX3ZhbHVlRyAgID0gMDtcbiAgICB0aGlzLl92YWx1ZUIgICA9IDA7XG5cbiAgICB0aGlzLl92YWx1ZUhFWCA9ICcjMDAwMDAwJztcbiAgICB0aGlzLl92YWx1ZUhFWFZhbGlkID0gdGhpcy5fdmFsdWVIRVg7XG5cbiAgICB0aGlzLl9jYWxsYmFja1BpY2sgPSBmdW5jdGlvbigpe307XG5cbiAgICAvL3RoaXMuX2NhbnZhc0ZpZWxkSW1hZ2VEYXRhRnVuYyA9IGZ1bmN0aW9uKGksail7cmV0dXJuIHRoaXMuX0hTVjJSR0IodGhpcy5fdmFsdWVIdWUsail9XG5cbiAgICB0aGlzLl9kcmF3Q2FudmFzRmllbGQoKTtcbiAgICB0aGlzLl9kcmF3Q2FudmFzU2xpZGVyKCk7XG5cbiAgICB0aGlzLl9zZXRDb2xvckhTVih0aGlzLl92YWx1ZUh1ZSx0aGlzLl92YWx1ZVNhdCx0aGlzLl92YWx1ZVZhbCk7XG5cbiAgICB0aGlzLl91cGRhdGVDb2xvclJHQkZyb21IU1YoKTtcbiAgICB0aGlzLl91cGRhdGVDb2xvckhFWEZyb21SR0IoKTtcblxuICAgIHRoaXMuX3VwZGF0ZUhhbmRsZXMoKTtcbn1cblxuUGlja2VyLnByb3RvdHlwZSA9XG57XG4gICAgX2RyYXdIYW5kbGVGaWVsZDogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzRmllbGQsXG4gICAgICAgICAgICBub2RlUG9zID0gdGhpcy5fY2FudmFzRmllbGRQb3MsXG4gICAgICAgICAgICBtb3VzZVBvcyA9IE1vdXNlLmdldCgpLmdldFBvc2l0aW9uKCk7XG5cbiAgICAgICAgdmFyIHBvc1ggPSBNYXRoLm1heCgwLCBNYXRoLm1pbihtb3VzZVBvc1swXSAtIG5vZGVQb3NbMF0sIGNhbnZhcy53aWR0aCkpLFxuICAgICAgICAgICAgcG9zWSA9IE1hdGgubWF4KDAsIE1hdGgubWluKG1vdXNlUG9zWzFdIC0gbm9kZVBvc1sxXSwgY2FudmFzLmhlaWdodCkpLFxuICAgICAgICAgICAgcG9zWE5vcm0gPSBwb3NYIC8gY2FudmFzLndpZHRoLFxuICAgICAgICAgICAgcG9zWU5vcm0gPSBwb3NZIC8gY2FudmFzLmhlaWdodDtcblxuICAgICAgICB2YXIgc2F0ID0gTWF0aC5yb3VuZChwb3NYTm9ybSAqIHRoaXMuX3ZhbHVlU2F0TWluTWF4WzFdKSxcbiAgICAgICAgICAgIHZhbCA9IE1hdGgucm91bmQoKDEuMCAtIHBvc1lOb3JtKSAqIHRoaXMuX3ZhbHVlVmFsTWluTWF4WzFdKTtcblxuICAgICAgICB0aGlzLl9zZXRDb2xvckhTVih0aGlzLl92YWx1ZUh1ZSwgc2F0LCB2YWwpO1xuXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9yUkdCRnJvbUhTVigpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhFWEZyb21SR0IoKTtcblxuICAgICAgICB0aGlzLl91cGRhdGVIYW5kbGVGaWVsZCgpO1xuICAgIH0sXG5cbiAgICBfdXBkYXRlSGFuZGxlRmllbGQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHdpZHRoID0gdGhpcy5fY2FudmFzRmllbGQud2lkdGgsXG4gICAgICAgICAgICBoZWlnaHQgPSB0aGlzLl9jYW52YXNGaWVsZC5oZWlnaHQsXG4gICAgICAgICAgICBvZmZzZXRIYW5kbGUgPSB0aGlzLl9oYW5kbGVGaWVsZFNpemUgKiAwLjI1O1xuXG4gICAgICAgIHZhciBzYXROb3JtID0gdGhpcy5fdmFsdWVTYXQgLyB0aGlzLl92YWx1ZVNhdE1pbk1heFsxXSxcbiAgICAgICAgICAgIHZhbE5vcm0gPSB0aGlzLl92YWx1ZVZhbCAvIHRoaXMuX3ZhbHVlVmFsTWluTWF4WzFdO1xuXG4gICAgICAgIHRoaXMuX2hhbmRsZUZpZWxkLnNldFBvc2l0aW9uR2xvYmFsKHNhdE5vcm0gKiB3aWR0aCAtIG9mZnNldEhhbmRsZSxcbiAgICAgICAgICAgICgxLjAgLSB2YWxOb3JtKSAqIGhlaWdodCAtIG9mZnNldEhhbmRsZSk7XG5cbiAgICB9LFxuXG4gICAgX2RyYXdIYW5kbGVTbGlkZXI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhc1NsaWRlcixcbiAgICAgICAgICAgIGNhbnZhc1Bvc1kgPSB0aGlzLl9jYW52YXNTbGlkZXJQb3NbMV0sXG4gICAgICAgICAgICBtb3VzZVBvc1kgPSBNb3VzZS5nZXQoKS5nZXRZKCk7XG5cbiAgICAgICAgdmFyIHBvc1kgPSBNYXRoLm1heCgwLCBNYXRoLm1pbihtb3VzZVBvc1kgLSBjYW52YXNQb3NZLCBjYW52YXMuaGVpZ2h0KSksXG4gICAgICAgICAgICBwb3NZTm9ybSA9IHBvc1kgLyBjYW52YXMuaGVpZ2h0O1xuXG4gICAgICAgIHZhciBodWUgPSBNYXRoLmZsb29yKCgxLjAgLSBwb3NZTm9ybSkgKiB0aGlzLl92YWx1ZUh1ZU1pbk1heFsxXSk7XG5cbiAgICAgICAgdGhpcy5fc2V0Q29sb3JIU1YoaHVlLCB0aGlzLl92YWx1ZVNhdCwgdGhpcy5fdmFsdWVWYWwpO1xuXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9yUkdCRnJvbUhTVigpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhFWEZyb21SR0IoKTtcblxuICAgICAgICB0aGlzLl91cGRhdGVIYW5kbGVTbGlkZXIoKTtcbiAgICB9LFxuXG4gICAgX3VwZGF0ZUhhbmRsZVNsaWRlcjogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaGVpZ2h0ID0gdGhpcy5fY2FudmFzU2xpZGVyLmhlaWdodCxcbiAgICAgICAgICAgIG9mZnNldEhhbmRsZSA9IHRoaXMuX2hhbmRsZVNsaWRlckhlaWdodCAqIDAuMjU7XG5cbiAgICAgICAgdmFyIGh1ZU5vcm0gPSB0aGlzLl92YWx1ZUh1ZSAvIHRoaXMuX3ZhbHVlSHVlTWluTWF4WzFdO1xuXG4gICAgICAgIHRoaXMuX2hhbmRsZVNsaWRlci5zZXRQb3NpdGlvbkdsb2JhbFkoKGhlaWdodCAtIG9mZnNldEhhbmRsZSkgKiAoMS4wIC0gaHVlTm9ybSkpO1xuICAgIH0sXG5cbiAgICBfdXBkYXRlSGFuZGxlczogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl91cGRhdGVIYW5kbGVGaWVsZCgpO1xuICAgICAgICB0aGlzLl91cGRhdGVIYW5kbGVTbGlkZXIoKTtcbiAgICB9LFxuXG4gICAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gICAgX3NldEh1ZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHZhciBtaW5NYXggPSB0aGlzLl92YWx1ZUh1ZU1pbk1heDtcblxuICAgICAgICB0aGlzLl92YWx1ZUh1ZSA9IHZhbHVlID09IG1pbk1heFsxXSA/IG1pbk1heFswXSA6IHZhbHVlO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhTVigpO1xuICAgICAgICB0aGlzLl9kcmF3Q2FudmFzRmllbGQoKTtcbiAgICB9LFxuXG4gICAgX3NldFNhdDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX3ZhbHVlU2F0ID0gTWF0aC5yb3VuZCh2YWx1ZSk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySFNWKCk7XG4gICAgfSxcblxuICAgIF9zZXRWYWw6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB0aGlzLl92YWx1ZVZhbCA9IE1hdGgucm91bmQodmFsdWUpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhTVigpO1xuICAgIH0sXG5cbiAgICBfc2V0UjogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX3ZhbHVlUiA9IE1hdGgucm91bmQodmFsdWUpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvclJHQigpO1xuICAgIH0sXG5cbiAgICBfc2V0RzogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX3ZhbHVlRyA9IE1hdGgucm91bmQodmFsdWUpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvclJHQigpO1xuICAgIH0sXG5cbiAgICBfc2V0QjogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX3ZhbHVlQiA9IE1hdGgucm91bmQodmFsdWUpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvclJHQigpO1xuICAgIH0sXG5cbiAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbiAgICBfb25JbnB1dEh1ZUNoYW5nZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaW5wdXQgPSB0aGlzLl9pbnB1dEh1ZSxcbiAgICAgICAgICAgIGlucHV0VmFsID0gdGhpcy5fZ2V0VmFsdWVDb250cmFpbmVkKGlucHV0LCB0aGlzLl92YWx1ZUh1ZU1pbk1heCk7XG5cbiAgICAgICAgdmFyIG1pbk1heCA9IHRoaXMuX3ZhbHVlSHVlTWluTWF4O1xuXG4gICAgICAgIGlmIChpbnB1dFZhbCA9PSBtaW5NYXhbMV0pIHtcbiAgICAgICAgICAgIGlucHV0VmFsID0gbWluTWF4WzBdO1xuICAgICAgICAgICAgaW5wdXQuc2V0VmFsdWUoaW5wdXRWYWwpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fc2V0SHVlKGlucHV0VmFsKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JSR0JGcm9tSFNWKCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySEVYRnJvbVJHQigpO1xuICAgICAgICB0aGlzLl91cGRhdGVIYW5kbGVTbGlkZXIoKTtcblxuICAgICAgICB0aGlzLl9kcmF3Q2FudmFzRmllbGQoKTtcbiAgICB9LFxuXG4gICAgX29uSW5wdXRTYXRDaGFuZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fc2V0U2F0KHRoaXMuX2dldFZhbHVlQ29udHJhaW5lZCh0aGlzLl9pbnB1dFNhdCwgdGhpcy5fdmFsdWVTYXRNaW5NYXgpKTtcbiAgICAgICAgdGhpcy5fb25JbnB1dFNWQ2hhbmdlKCk7XG4gICAgfSxcblxuICAgIF9vbklucHV0VmFsQ2hhbmdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3NldFZhbCh0aGlzLl9nZXRWYWx1ZUNvbnRyYWluZWQodGhpcy5faW5wdXRWYWwsIHRoaXMuX3ZhbHVlVmFsTWluTWF4KSk7XG4gICAgICAgIHRoaXMuX29uSW5wdXRTVkNoYW5nZSgpO1xuICAgIH0sXG5cbiAgICBfb25JbnB1dFJDaGFuZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fc2V0Uih0aGlzLl9nZXRWYWx1ZUNvbnRyYWluZWQodGhpcy5faW5wdXRSLCB0aGlzLl92YWx1ZVJHQk1pbk1heCkpO1xuICAgICAgICB0aGlzLl9vbklucHV0UkdCQ2hhbmdlKCk7XG4gICAgfSxcblxuICAgIF9vbklucHV0R0NoYW5nZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9zZXRHKHRoaXMuX2dldFZhbHVlQ29udHJhaW5lZCh0aGlzLl9pbnB1dEcsIHRoaXMuX3ZhbHVlUkdCTWluTWF4KSk7XG4gICAgICAgIHRoaXMuX29uSW5wdXRSR0JDaGFuZ2UoKTtcbiAgICB9LFxuXG4gICAgX29uSW5wdXRCQ2hhbmdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3NldEIodGhpcy5fZ2V0VmFsdWVDb250cmFpbmVkKHRoaXMuX2lucHV0QiwgdGhpcy5fdmFsdWVSR0JNaW5NYXgpKTtcbiAgICAgICAgdGhpcy5fb25JbnB1dFJHQkNoYW5nZSgpO1xuICAgIH0sXG5cbiAgICBfb25JbnB1dEhFWEZpbmlzaDogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaW5wdXQgPSB0aGlzLl9pbnB1dEhFWCxcbiAgICAgICAgICAgIHZhbHVlID0gaW5wdXQuZ2V0UHJvcGVydHkoJ3ZhbHVlJyk7XG5cbiAgICAgICAgaWYgKCFDb2xvclV0aWwuaXNWYWxpZEhFWCh2YWx1ZSkpIHtcbiAgICAgICAgICAgIGlucHV0LnNldFByb3BlcnR5KCd2YWx1ZScsIHRoaXMuX3ZhbHVlSEVYVmFsaWQpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fdmFsdWVIRVggPSB0aGlzLl92YWx1ZUhFWFZhbGlkID0gdmFsdWU7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9yRnJvbUhFWCgpO1xuICAgIH0sXG5cbiAgICBfb25JbnB1dFNWQ2hhbmdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9yUkdCRnJvbUhTVigpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhFWEZyb21SR0IoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlSGFuZGxlRmllbGQoKTtcbiAgICB9LFxuXG4gICAgX29uSW5wdXRSR0JDaGFuZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIU1ZGcm9tUkdCKCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySEVYRnJvbVJHQigpO1xuICAgICAgICB0aGlzLl91cGRhdGVIYW5kbGVzKCk7XG4gICAgfSxcblxuICAgIF9nZXRWYWx1ZUNvbnRyYWluZWQ6IGZ1bmN0aW9uIChpbnB1dCwgbWluTWF4KSB7XG4gICAgICAgIHZhciBpbnB1dFZhbCA9IE1hdGgucm91bmQoaW5wdXQuZ2V0VmFsdWUoKSksXG4gICAgICAgICAgICBtaW4gPSBtaW5NYXhbMF0sXG4gICAgICAgICAgICBtYXggPSBtaW5NYXhbMV07XG5cbiAgICAgICAgaWYgKGlucHV0VmFsIDw9IG1pbikge1xuICAgICAgICAgICAgaW5wdXRWYWwgPSBtaW47XG4gICAgICAgICAgICBpbnB1dC5zZXRWYWx1ZShpbnB1dFZhbCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlucHV0VmFsID49IG1heCkge1xuICAgICAgICAgICAgaW5wdXRWYWwgPSBtYXg7XG4gICAgICAgICAgICBpbnB1dC5zZXRWYWx1ZShpbnB1dFZhbCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaW5wdXRWYWw7XG4gICAgfSxcblxuXG4gICAgX3VwZGF0ZUlucHV0SHVlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2lucHV0SHVlLnNldFZhbHVlKHRoaXMuX3ZhbHVlSHVlKTtcbiAgICB9LFxuICAgIF91cGRhdGVJbnB1dFNhdDogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9pbnB1dFNhdC5zZXRWYWx1ZSh0aGlzLl92YWx1ZVNhdCk7XG4gICAgfSxcbiAgICBfdXBkYXRlSW5wdXRWYWw6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5faW5wdXRWYWwuc2V0VmFsdWUodGhpcy5fdmFsdWVWYWwpO1xuICAgIH0sXG4gICAgX3VwZGF0ZUlucHV0UjogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9pbnB1dFIuc2V0VmFsdWUodGhpcy5fdmFsdWVSKTtcbiAgICB9LFxuICAgIF91cGRhdGVJbnB1dEc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5faW5wdXRHLnNldFZhbHVlKHRoaXMuX3ZhbHVlRyk7XG4gICAgfSxcbiAgICBfdXBkYXRlSW5wdXRCOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2lucHV0Qi5zZXRWYWx1ZSh0aGlzLl92YWx1ZUIpO1xuICAgIH0sXG4gICAgX3VwZGF0ZUlucHV0SEVYOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2lucHV0SEVYLnNldFByb3BlcnR5KCd2YWx1ZScsIHRoaXMuX3ZhbHVlSEVYKTtcbiAgICB9LFxuXG5cbiAgICBfc2V0Q29sb3JIU1Y6IGZ1bmN0aW9uIChodWUsIHNhdCwgdmFsKSB7XG4gICAgICAgIHRoaXMuX3ZhbHVlSHVlID0gaHVlO1xuICAgICAgICB0aGlzLl92YWx1ZVNhdCA9IHNhdDtcbiAgICAgICAgdGhpcy5fdmFsdWVWYWwgPSB2YWw7XG5cbiAgICAgICAgdGhpcy5fdXBkYXRlSW5wdXRIdWUoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlSW5wdXRTYXQoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlSW5wdXRWYWwoKTtcblxuICAgICAgICB0aGlzLl91cGRhdGVDb250cmFzdEN1cnJDb2xvcigpO1xuICAgIH0sXG5cbiAgICBfc2V0Q29sb3JSR0I6IGZ1bmN0aW9uIChyLCBnLCBiKSB7XG4gICAgICAgIHRoaXMuX3ZhbHVlUiA9IHI7XG4gICAgICAgIHRoaXMuX3ZhbHVlRyA9IGc7XG4gICAgICAgIHRoaXMuX3ZhbHVlQiA9IGI7XG5cbiAgICAgICAgdGhpcy5fdXBkYXRlSW5wdXRSKCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUlucHV0RygpO1xuICAgICAgICB0aGlzLl91cGRhdGVJbnB1dEIoKTtcblxuICAgICAgICB0aGlzLl91cGRhdGVDb250cmFzdEN1cnJDb2xvcigpO1xuICAgIH0sXG5cbiAgICBfc2V0Q29sb3JIRVg6IGZ1bmN0aW9uIChoZXgpIHtcbiAgICAgICAgdGhpcy5fdmFsdWVIRVggPSBoZXg7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUlucHV0SEVYKCk7XG4gICAgfSxcblxuICAgIF91cGRhdGVDb2xvckhTVjogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9zZXRDb2xvckhTVih0aGlzLl92YWx1ZUh1ZSwgdGhpcy5fdmFsdWVTYXQsIHRoaXMuX3ZhbHVlVmFsKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29udHJhc3RDdXJyQ29sb3IoKTtcbiAgICB9LFxuXG4gICAgX3VwZGF0ZUNvbG9yUkdCOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3NldENvbG9yUkdCKHRoaXMuX3ZhbHVlUiwgdGhpcy5fdmFsdWVHLCB0aGlzLl92YWx1ZUIpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb250cmFzdEN1cnJDb2xvcigpO1xuICAgIH0sXG5cbiAgICBfdXBkYXRlQ29sb3JIU1ZGcm9tUkdCOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBoc3YgPSBDb2xvclV0aWwuUkdCMkhTVih0aGlzLl92YWx1ZVIsIHRoaXMuX3ZhbHVlRywgdGhpcy5fdmFsdWVCKTtcbiAgICAgICAgdGhpcy5fc2V0Q29sb3JIU1YoaHN2WzBdLCBoc3ZbMV0sIGhzdlsyXSk7XG4gICAgfSxcblxuICAgIF91cGRhdGVDb2xvclJHQkZyb21IU1Y6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHJnYiA9IENvbG9yVXRpbC5IU1YyUkdCKHRoaXMuX3ZhbHVlSHVlLCB0aGlzLl92YWx1ZVNhdCwgdGhpcy5fdmFsdWVWYWwpO1xuICAgICAgICB0aGlzLl9zZXRDb2xvclJHQihyZ2JbMF0sIHJnYlsxXSwgcmdiWzJdKTtcbiAgICB9LFxuXG4gICAgX3VwZGF0ZUNvbG9ySEVYRnJvbVJHQjogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaGV4ID0gQ29sb3JVdGlsLlJHQjJIRVgodGhpcy5fdmFsdWVSLCB0aGlzLl92YWx1ZUcsIHRoaXMuX3ZhbHVlQik7XG4gICAgICAgIHRoaXMuX3NldENvbG9ySEVYKGhleCk7XG4gICAgfSxcblxuICAgIF91cGRhdGVDb2xvckZyb21IRVg6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHJnYiA9IENvbG9yVXRpbC5IRVgyUkdCKHRoaXMuX3ZhbHVlSEVYKTtcblxuICAgICAgICB0aGlzLl9zZXRDb2xvclJHQihyZ2JbMF0sIHJnYlsxXSwgcmdiWzJdKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIU1ZGcm9tUkdCKCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUhhbmRsZXMoKTtcbiAgICB9LFxuXG4gICAgX3VwZGF0ZUNvbnRyYXN0Q3VyckNvbG9yOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3NldENvbnRyYXN0Q3VyckNvbG9yKHRoaXMuX3ZhbHVlUiwgdGhpcy5fdmFsdWVHLCB0aGlzLl92YWx1ZUIpO1xuICAgIH0sXG4gICAgX3VwZGF0ZUNvbnRyYXN0UHJldkNvbG9yOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3NldENvbnRyYXNQcmV2Q29sb3IodGhpcy5fdmFsdWVSLCB0aGlzLl92YWx1ZUcsIHRoaXMuX3ZhbHVlQilcbiAgICB9LFxuXG4gICAgX3NldENvbnRyYXN0Q3VyckNvbG9yOiBmdW5jdGlvbiAociwgZywgYikge1xuICAgICAgICB0aGlzLl9jb2xvckN1cnJOb2RlLnNldFN0eWxlUHJvcGVydHkoJ2JhY2tncm91bmQnLCAncmdiKCcgKyByICsgJywnICsgZyArICcsJyArIGIgKyAnKScpXG4gICAgfSxcbiAgICBfc2V0Q29udHJhc1ByZXZDb2xvcjogZnVuY3Rpb24gKHIsIGcsIGIpIHtcbiAgICAgICAgdGhpcy5fY29sb3JQcmV2Tm9kZS5zZXRTdHlsZVByb3BlcnR5KCdiYWNrZ3JvdW5kJywgJ3JnYignICsgciArICcsJyArIGcgKyAnLCcgKyBiICsgJyknKVxuICAgIH0sXG5cbiAgICBfb25IZWFkRHJhZ1N0YXJ0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBub2RlID0gdGhpcy5fbm9kZSxcbiAgICAgICAgICAgIHBhcmVudE5vZGUgPSB0aGlzLl9wYXJlbnROb2RlO1xuXG4gICAgICAgIHZhciBub2RlUG9zID0gbm9kZS5nZXRQb3NpdGlvbkdsb2JhbCgpLFxuICAgICAgICAgICAgbW91c2VQb3MgPSBNb3VzZS5nZXQoKS5nZXRQb3NpdGlvbigpLFxuICAgICAgICAgICAgb2Zmc2V0UG9zID0gdGhpcy5fbW91c2VPZmZzZXQ7XG5cbiAgICAgICAgb2Zmc2V0UG9zWzBdID0gbW91c2VQb3NbMF0gLSBub2RlUG9zWzBdO1xuICAgICAgICBvZmZzZXRQb3NbMV0gPSBtb3VzZVBvc1sxXSAtIG5vZGVQb3NbMV07XG5cbiAgICAgICAgdmFyIGV2ZW50TW91c2VNb3ZlID0gRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLFxuICAgICAgICAgICAgZXZlbnRNb3VzZVVwID0gRG9jdW1lbnRFdmVudC5NT1VTRV9VUDtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgdmFyIG9uRHJhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVQb3NpdGlvbigpO1xuICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUNhbnZhc05vZGVQb3NpdGlvbnMoKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIG9uRHJhZ0VuZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVDYW52YXNOb2RlUG9zaXRpb25zKCk7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlVXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICBwYXJlbnROb2RlLnJlbW92ZUNoaWxkKG5vZGUpO1xuICAgICAgICBwYXJlbnROb2RlLmFkZENoaWxkKG5vZGUpO1xuXG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZU1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VVcCwgb25EcmFnRW5kLCBmYWxzZSk7XG5cbiAgICAgICAgdGhpcy5fdXBkYXRlQ2FudmFzTm9kZVBvc2l0aW9ucygpO1xuICAgIH0sXG5cbiAgICBfdXBkYXRlUG9zaXRpb246IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG1vdXNlUG9zID0gTW91c2UuZ2V0KCkuZ2V0UG9zaXRpb24oKSxcbiAgICAgICAgICAgIG9mZnNldFBvcyA9IHRoaXMuX21vdXNlT2Zmc2V0O1xuXG4gICAgICAgIHZhciBjdXJyUG9zaXRpb25YID0gbW91c2VQb3NbMF0gLSBvZmZzZXRQb3NbMF0sXG4gICAgICAgICAgICBjdXJyUG9zaXRpb25ZID0gbW91c2VQb3NbMV0gLSBvZmZzZXRQb3NbMV07XG5cbiAgICAgICAgdmFyIG5vZGUgPSB0aGlzLl9ub2RlLFxuICAgICAgICAgICAgaGVhZCA9IHRoaXMuX2hlYWROb2RlLFxuICAgICAgICAgICAgcG9zaXRpb24gPSB0aGlzLl9wb3NpdGlvbjtcblxuICAgICAgICB2YXIgbWF4WCA9IHdpbmRvdy5pbm5lcldpZHRoIC0gbm9kZS5nZXRXaWR0aCgpLFxuICAgICAgICAgICAgbWF4WSA9IHdpbmRvdy5pbm5lckhlaWdodCAtIGhlYWQuZ2V0SGVpZ2h0KCk7XG5cbiAgICAgICAgcG9zaXRpb25bMF0gPSBNYXRoLm1heCgwLCBNYXRoLm1pbihjdXJyUG9zaXRpb25YLCBtYXhYKSk7XG4gICAgICAgIHBvc2l0aW9uWzFdID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oY3VyclBvc2l0aW9uWSwgbWF4WSkpO1xuXG4gICAgICAgIG5vZGUuc2V0UG9zaXRpb25HbG9iYWwocG9zaXRpb25bMF0sIHBvc2l0aW9uWzFdKTtcbiAgICB9LFxuXG4gICAgX2RyYXdDYW52YXNGaWVsZDogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzRmllbGQsXG4gICAgICAgICAgICBjb250ZXh0ID0gdGhpcy5fY29udGV4dENhbnZhc0ZpZWxkO1xuXG4gICAgICAgIHZhciB3aWR0aCA9IGNhbnZhcy53aWR0aCxcbiAgICAgICAgICAgIGhlaWdodCA9IGNhbnZhcy5oZWlnaHQsXG4gICAgICAgICAgICBpbnZXaWR0aCA9IDEgLyB3aWR0aCxcbiAgICAgICAgICAgIGludkhlaWdodCA9IDEgLyBoZWlnaHQ7XG5cbiAgICAgICAgdmFyIGltYWdlRGF0YSA9IHRoaXMuX2ltYWdlRGF0YUZpZWxkLFxuICAgICAgICAgICAgcmdiID0gW10sXG4gICAgICAgICAgICBpbmRleCA9IDA7XG5cbiAgICAgICAgdmFyIHZhbHVlSHVlID0gdGhpcy5fdmFsdWVIdWU7XG5cbiAgICAgICAgdmFyIGkgPSAtMSwgajtcbiAgICAgICAgd2hpbGUgKCsraSA8IGhlaWdodCkge1xuICAgICAgICAgICAgaiA9IC0xO1xuXG4gICAgICAgICAgICB3aGlsZSAoKytqIDwgd2lkdGgpIHtcbiAgICAgICAgICAgICAgICByZ2IgPSBDb2xvclV0aWwuSFNWMlJHQih2YWx1ZUh1ZSwgaiAqIGludldpZHRoICogMTAwLjAsICggMS4wIC0gaSAqIGludkhlaWdodCApICogMTAwLjApO1xuICAgICAgICAgICAgICAgIGluZGV4ID0gKGkgKiB3aWR0aCArIGopICogNDtcblxuICAgICAgICAgICAgICAgIGltYWdlRGF0YS5kYXRhW2luZGV4XSA9IHJnYlswXTtcbiAgICAgICAgICAgICAgICBpbWFnZURhdGEuZGF0YVtpbmRleCArIDFdID0gcmdiWzFdO1xuICAgICAgICAgICAgICAgIGltYWdlRGF0YS5kYXRhW2luZGV4ICsgMl0gPSByZ2JbMl07XG4gICAgICAgICAgICAgICAgaW1hZ2VEYXRhLmRhdGFbaW5kZXggKyAzXSA9IDI1NTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnRleHQucHV0SW1hZ2VEYXRhKGltYWdlRGF0YSwgMCwgMCk7XG4gICAgfSxcblxuICAgIF9kcmF3Q2FudmFzU2xpZGVyOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXNTbGlkZXIsXG4gICAgICAgICAgICBjb250ZXh0ID0gdGhpcy5fY29udGV4dENhbnZhc1NsaWRlcjtcblxuICAgICAgICB2YXIgd2lkdGggPSBjYW52YXMud2lkdGgsXG4gICAgICAgICAgICBoZWlnaHQgPSBjYW52YXMuaGVpZ2h0LFxuICAgICAgICAgICAgaW52SGVpZ2h0ID0gMSAvIGhlaWdodDtcblxuICAgICAgICB2YXIgaW1hZ2VEYXRhID0gdGhpcy5faW1hZ2VEYXRhU2xpZGVyLFxuICAgICAgICAgICAgcmdiID0gW10sXG4gICAgICAgICAgICBpbmRleCA9IDA7XG5cbiAgICAgICAgdmFyIGkgPSAtMSwgajtcbiAgICAgICAgd2hpbGUgKCsraSA8IGhlaWdodCkge1xuICAgICAgICAgICAgaiA9IC0xO1xuXG4gICAgICAgICAgICB3aGlsZSAoKytqIDwgd2lkdGgpIHtcbiAgICAgICAgICAgICAgICByZ2IgPSBDb2xvclV0aWwuSFNWMlJHQigoMS4wIC0gaSAqIGludkhlaWdodCkgKiAzNjAuMCwgMTAwLjAsIDEwMC4wKTtcbiAgICAgICAgICAgICAgICBpbmRleCA9IChpICogd2lkdGggKyBqKSAqIDQ7XG5cbiAgICAgICAgICAgICAgICBpbWFnZURhdGEuZGF0YVtpbmRleF0gPSByZ2JbMF07XG4gICAgICAgICAgICAgICAgaW1hZ2VEYXRhLmRhdGFbaW5kZXggKyAxXSA9IHJnYlsxXTtcbiAgICAgICAgICAgICAgICBpbWFnZURhdGEuZGF0YVtpbmRleCArIDJdID0gcmdiWzJdO1xuICAgICAgICAgICAgICAgIGltYWdlRGF0YS5kYXRhW2luZGV4ICsgM10gPSAyNTU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb250ZXh0LnB1dEltYWdlRGF0YShpbWFnZURhdGEsIDAsIDApO1xuXG4gICAgfSxcblxuICAgIF9vbkNhbnZhc0ZpZWxkTW91c2VEb3duOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBldmVudE1vdXNlTW92ZSA9IERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSxcbiAgICAgICAgICAgIGV2ZW50TW91c2VVcCA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIHZhciBvbkRyYWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fZHJhd0hhbmRsZUZpZWxkKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25EcmFnRW5kID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZU1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcblxuICAgICAgICBzZWxmLl9kcmF3SGFuZGxlRmllbGQoKTtcbiAgICB9LFxuXG4gICAgX29uQ2FudmFzU2xpZGVyTW91c2VEb3duOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBldmVudE1vdXNlTW92ZSA9IERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSxcbiAgICAgICAgICAgIGV2ZW50TW91c2VVcCA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIHZhciBvbkRyYWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fZHJhd0hhbmRsZVNsaWRlcigpO1xuICAgICAgICAgICAgICAgIHNlbGYuX2RyYXdDYW52YXNGaWVsZCgpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb25EcmFnRW5kID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZU1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBzZWxmLl9kcmF3Q2FudmFzRmllbGQoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcblxuICAgICAgICBzZWxmLl9kcmF3SGFuZGxlU2xpZGVyKCk7XG4gICAgICAgIHNlbGYuX2RyYXdDYW52YXNGaWVsZCgpO1xuICAgIH0sXG5cbiAgICBfc2V0U2l6ZUNhbnZhc0ZpZWxkOiBmdW5jdGlvbiAod2lkdGgsIGhlaWdodCkge1xuICAgICAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzRmllbGQ7XG4gICAgICAgIGNhbnZhcy5zdHlsZS53aWR0aCA9IHdpZHRoICsgJ3B4JztcbiAgICAgICAgY2FudmFzLnN0eWxlLmhlaWdodCA9IGhlaWdodCArICdweCc7XG4gICAgICAgIGNhbnZhcy53aWR0aCA9IHdpZHRoO1xuICAgICAgICBjYW52YXMuaGVpZ2h0ID0gaGVpZ2h0O1xuXG4gICAgfSxcblxuICAgIF9zZXRTaXplQ2FudmFzU2xpZGVyOiBmdW5jdGlvbiAod2lkdGgsIGhlaWdodCkge1xuICAgICAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzU2xpZGVyO1xuICAgICAgICBjYW52YXMuc3R5bGUud2lkdGggPSB3aWR0aCArICdweCc7XG4gICAgICAgIGNhbnZhcy5zdHlsZS5oZWlnaHQgPSBoZWlnaHQgKyAncHgnO1xuICAgICAgICBjYW52YXMud2lkdGggPSB3aWR0aDtcbiAgICAgICAgY2FudmFzLmhlaWdodCA9IGhlaWdodDtcbiAgICB9LFxuXG4gICAgb3BlbjogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbm9kZSA9IHRoaXMuX25vZGU7XG5cbiAgICAgICAgdGhpcy5fcGFyZW50Tm9kZS5hZGRDaGlsZChub2RlKTtcblxuICAgICAgICB2YXIgcG9zaXRpb24gPSB0aGlzLl9wb3NpdGlvbjtcbiAgICAgICAgaWYocG9zaXRpb25bMF0gPT09IG51bGwgfHwgcG9zaXRpb25bMV0gPT09IG51bGwpe1xuICAgICAgICAgICAgcG9zaXRpb25bMF0gPSB3aW5kb3cuaW5uZXJXaWR0aCAqIDAuNSAtIG5vZGUuZ2V0V2lkdGgoKSAqIDAuNTtcbiAgICAgICAgICAgIHBvc2l0aW9uWzFdID0gd2luZG93LmlubmVySGVpZ2h0ICogMC41IC0gbm9kZS5nZXRIZWlnaHQoKSAqIDAuNTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBvc2l0aW9uWzBdID0gTWF0aC5tYXgoMCxNYXRoLm1pbihwb3NpdGlvblswXSx3aW5kb3cuaW5uZXJXaWR0aCAtIG5vZGUuZ2V0V2lkdGgoKSkpO1xuICAgICAgICAgICAgcG9zaXRpb25bMV0gPSBNYXRoLm1heCgwLE1hdGgubWluKHBvc2l0aW9uWzFdLHdpbmRvdy5pbm5lckhlaWdodCAtIG5vZGUuZ2V0SGVpZ2h0KCkpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG5vZGUuc2V0UG9zaXRpb25HbG9iYWwocG9zaXRpb25bMF0scG9zaXRpb25bMV0pO1xuICAgICAgICB0aGlzLl91cGRhdGVDYW52YXNOb2RlUG9zaXRpb25zKCk7XG4gICAgfSxcblxuICAgIGNsb3NlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3BhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5fbm9kZSk7XG4gICAgfSxcblxuICAgIF9vbkNsb3NlOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICBlLmNhbmNlbEJ1YmJsZSA9IHRydWU7XG4gICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICB9LFxuICAgIF9vblBpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fY2FsbGJhY2tQaWNrKCk7XG4gICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICB9LFxuXG4gICAgX3VwZGF0ZUNhbnZhc05vZGVQb3NpdGlvbnM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNhbnZhc1NsaWRlclBvcyA9IHRoaXMuX2NhbnZhc1NsaWRlclBvcyxcbiAgICAgICAgICAgIGNhbnZhc0ZpZWxkUG9zID0gdGhpcy5fY2FudmFzRmllbGRQb3M7XG5cbiAgICAgICAgY2FudmFzU2xpZGVyUG9zWzBdID0gY2FudmFzU2xpZGVyUG9zWzFdID0gMDtcbiAgICAgICAgY2FudmFzRmllbGRQb3NbMF0gPSBjYW52YXNGaWVsZFBvc1sxXSA9IDA7XG5cbiAgICAgICAgdmFyIGVsZW1lbnQgPSB0aGlzLl9jYW52YXNTbGlkZXI7XG5cbiAgICAgICAgd2hpbGUgKGVsZW1lbnQpIHtcbiAgICAgICAgICAgIGNhbnZhc1NsaWRlclBvc1swXSArPSBlbGVtZW50Lm9mZnNldExlZnQ7XG4gICAgICAgICAgICBjYW52YXNTbGlkZXJQb3NbMV0gKz0gZWxlbWVudC5vZmZzZXRUb3A7XG4gICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudC5vZmZzZXRQYXJlbnQ7XG4gICAgICAgIH1cblxuICAgICAgICBlbGVtZW50ID0gdGhpcy5fY2FudmFzRmllbGQ7XG5cbiAgICAgICAgd2hpbGUgKGVsZW1lbnQpIHtcbiAgICAgICAgICAgIGNhbnZhc0ZpZWxkUG9zWzBdICs9IGVsZW1lbnQub2Zmc2V0TGVmdDtcbiAgICAgICAgICAgIGNhbnZhc0ZpZWxkUG9zWzFdICs9IGVsZW1lbnQub2Zmc2V0VG9wO1xuICAgICAgICAgICAgZWxlbWVudCA9IGVsZW1lbnQub2Zmc2V0UGFyZW50O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHNldENhbGxiYWNrUGljazogZnVuY3Rpb24gKGZ1bmMpIHtcbiAgICAgICAgdGhpcy5fY2FsbGJhY2tQaWNrID0gZnVuYztcbiAgICB9LFxuXG4gICAgc2V0Q29sb3JIRVg6IGZ1bmN0aW9uIChoZXgpIHtcbiAgICAgICAgdGhpcy5fc2V0Q29sb3JIRVgoaGV4KTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JGcm9tSEVYKCk7XG4gICAgICAgIHRoaXMuX3NldENvbG9yKCk7XG4gICAgfSxcblxuICAgIHNldENvbG9yUkdCOiBmdW5jdGlvbiAociwgZywgYikge1xuICAgICAgICB0aGlzLl9zZXRDb2xvclJHQihyLCBnLCBiKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIRVhGcm9tUkdCKCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySFNWRnJvbVJHQigpO1xuICAgICAgICB0aGlzLl9zZXRDb2xvcigpO1xuICAgIH0sXG5cbiAgICBzZXRDb2xvclJHQmZ2OiBmdW5jdGlvbiAociwgZywgYikge1xuICAgICAgICB0aGlzLnNldENvbG9yUkdCKE1hdGguZmxvb3IociAqIDI1NS4wKSxcbiAgICAgICAgICAgIE1hdGguZmxvb3IoZyAqIDI1NS4wKSxcbiAgICAgICAgICAgIE1hdGguZmxvb3IoYiAqIDI1NS4wKSk7XG4gICAgfSxcblxuICAgIHNldENvbG9ySFNWOiBmdW5jdGlvbiAoaCwgcywgdikge1xuICAgICAgICB0aGlzLl9zZXRDb2xvckhTVihoLCBzLCB2KTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JSR0JGcm9tSFNWKCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySEVYRnJvbVJHQigpO1xuICAgICAgICB0aGlzLl9zZXRDb2xvcigpO1xuICAgIH0sXG5cbiAgICBfc2V0Q29sb3I6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fZHJhd0NhbnZhc0ZpZWxkKCk7XG4gICAgICAgIHRoaXMuX2RyYXdDYW52YXNTbGlkZXIoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlSGFuZGxlcygpO1xuICAgICAgICB0aGlzLl9zZXRDb250cmFzUHJldkNvbG9yKHRoaXMuX3ZhbHVlUiwgdGhpcy5fdmFsdWVHLCB0aGlzLl92YWx1ZUIpO1xuICAgIH0sXG5cbiAgICBnZXRSOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl92YWx1ZVI7XG4gICAgfSxcbiAgICBnZXRHOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl92YWx1ZUc7XG4gICAgfSxcbiAgICBnZXRCOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl92YWx1ZUI7XG4gICAgfSxcbiAgICBnZXRSR0I6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIFt0aGlzLl92YWx1ZVIsIHRoaXMuX3ZhbHVlRywgdGhpcy5fdmFsdWVCXTtcbiAgICB9LFxuICAgIGdldEh1ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdmFsdWVIdWU7XG4gICAgfSxcbiAgICBnZXRTYXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3ZhbHVlU2F0O1xuICAgIH0sXG4gICAgZ2V0VmFsOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl92YWx1ZVZhbDtcbiAgICB9LFxuICAgIGdldEhTVjogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gW3RoaXMuX3ZhbHVlSHVlLCB0aGlzLl92YWx1ZVNhdCwgdGhpcy5fdmFsdWVWYWxdO1xuICAgIH0sXG4gICAgZ2V0SEVYOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl92YWx1ZUhFWDtcbiAgICB9LFxuICAgIGdldFJHQmZ2OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBbdGhpcy5fdmFsdWVSIC8gMjU1LjAsIHRoaXMuX3ZhbHVlRyAvIDI1NS4wLCB0aGlzLl92YWx1ZUIgLyAyNTUuMF07XG4gICAgfSxcblxuICAgIGdldE5vZGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX25vZGU7XG4gICAgfVxufTtcblxuUGlja2VyLnNldHVwID0gZnVuY3Rpb24gKHBhcmVudE5vZGUpIHtcbiAgICByZXR1cm4gUGlja2VyLl9pbnN0YW5jZSA9IG5ldyBQaWNrZXIocGFyZW50Tm9kZSk7XG59O1xuUGlja2VyLmdldCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gUGlja2VyLl9pbnN0YW5jZTtcbn07XG5QaWNrZXIuZGVzdHJveSA9IGZ1bmN0aW9uKCl7XG4gICAgUGlja2VyLl9pbnN0YW5jZSA9IG51bGw7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBpY2tlcjsiLCJ2YXIgU1ZHQ29tcG9uZW50ID0gcmVxdWlyZSgnLi9TVkdDb21wb25lbnQnKTtcblxuZnVuY3Rpb24gUGxvdHRlcihwYXJlbnQsb2JqZWN0LHZhbHVlLHBhcmFtcykge1xuICAgIHBhcmFtcyA9IHBhcmFtcyB8fCB7fTtcbiAgICBwYXJhbXMubGluZVdpZHRoICA9IHBhcmFtcy5saW5lV2lkdGggIHx8IDI7XG4gICAgcGFyYW1zLmxpbmVDb2xvciAgPSBwYXJhbXMubGluZUNvbG9yICB8fCBbMjU1LDI1NSwyNTVdO1xuXG4gICAgU1ZHQ29tcG9uZW50LmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuICAgIHZhciBsaW5lV2lkdGggPSB0aGlzLl9saW5lV2lkdGggPSBwYXJhbXMubGluZVdpZHRoO1xuICAgIHZhciBsaW5lQ29sb3IgPSBwYXJhbXMubGluZUNvbG9yO1xuXG4gICAgdmFyIGdyaWQgPSB0aGlzLl9ncmlkID0gdGhpcy5fc3ZnUm9vdC5hcHBlbmRDaGlsZCh0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ3BhdGgnKSk7XG4gICAgICAgIGdyaWQuc3R5bGUuc3Ryb2tlID0gJ3JnYigyNiwyOSwzMSknO1xuXG4gICAgdmFyIHBhdGggPSB0aGlzLl9wYXRoID0gdGhpcy5fc3ZnUm9vdC5hcHBlbmRDaGlsZCh0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ3BhdGgnKSk7XG4gICAgICAgIHBhdGguc3R5bGUuc3Ryb2tlICAgICAgPSAncmdiKCcrbGluZUNvbG9yWzBdKycsJytsaW5lQ29sb3JbMV0rJywnK2xpbmVDb2xvclsyXSsnKSc7XG4gICAgICAgIHBhdGguc3R5bGUuc3Ryb2tlV2lkdGggPSBsaW5lV2lkdGggO1xuICAgICAgICBwYXRoLnN0eWxlLmZpbGwgICAgICAgID0gJ25vbmUnO1xufVxuUGxvdHRlci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFNWR0NvbXBvbmVudC5wcm90b3R5cGUpO1xuUGxvdHRlci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBQbG90dGVyO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBsb3R0ZXI7XG4iLCJ2YXIgT2JqZWN0Q29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY29yZS9PYmplY3RDb21wb25lbnQnKTtcbnZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XG52YXIgTnVtYmVySW5wdXRfSW50ZXJuYWwgPSByZXF1aXJlKCcuL051bWJlcklucHV0X0ludGVybmFsJyk7XG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcblxudmFyIEV2ZW50XyAgICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIENvbXBvbmVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9Db21wb25lbnRFdmVudCcpO1xuXG52YXIgREVGQVVMVF9TVEVQID0gMS4wLFxuICAgIERFRkFVTFRfRFAgICA9IDI7XG5cbmZ1bmN0aW9uIFJhbmdlKHBhcmVudCwgb2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgT2JqZWN0Q29tcG9uZW50LmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuICAgIHBhcmFtcyAgICAgICAgICA9IHBhcmFtcyAgICAgICAgICB8fCB7fTtcbiAgICBwYXJhbXMub25DaGFuZ2UgPSBwYXJhbXMub25DaGFuZ2UgfHwgdGhpcy5fb25DaGFuZ2U7XG4gICAgcGFyYW1zLnN0ZXAgICAgID0gcGFyYW1zLnN0ZXAgfHwgREVGQVVMVF9TVEVQO1xuICAgIHBhcmFtcy5kcCAgICAgICA9IHBhcmFtcy5kcCAgIHx8IERFRkFVTFRfRFA7XG5cbiAgICB0aGlzLl9vbkNoYW5nZSAgPSBwYXJhbXMub25DaGFuZ2U7XG5cbiAgICB2YXIgc3RlcCA9IHRoaXMuX3N0ZXAgPSBwYXJhbXMuc3RlcCxcbiAgICAgICAgZHAgICA9IHRoaXMuX2RwICAgPSBwYXJhbXMuZHA7XG5cbiAgICAvL0ZJWE1FOiBoaXN0b3J5IHB1c2ggcG9wXG5cbiAgICB2YXIgbGFiZWxNaW4gPSBuZXcgTm9kZSgpO1xuICAgIHZhciBpbnB1dE1pbiA9IHRoaXMuX2lucHV0TWluID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHN0ZXAsZHAsIHRoaXMucHVzaEhpc3RvcnlTdGF0ZS5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX29uSW5wdXRNaW5DaGFuZ2UuYmluZCh0aGlzKSk7XG5cbiAgICB2YXIgbGFiZWxNYXggPSBuZXcgTm9kZSgpO1xuICAgIHZhciBpbnB1dE1heCA9IHRoaXMuX2lucHV0TWF4ID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHN0ZXAsZHAsIHRoaXMucHVzaEhpc3RvcnlTdGF0ZS5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX29uSW5wdXRNYXhDaGFuZ2UuYmluZCh0aGlzKSk7XG5cbiAgICB2YXIgbGFiZWxNaW5XcmFwID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5XcmFwKSxcbiAgICAgICAgaW5wdXRNaW5XcmFwID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5XcmFwKSxcbiAgICAgICAgbGFiZWxNYXhXcmFwID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5XcmFwKSxcbiAgICAgICAgaW5wdXRNYXhXcmFwID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5XcmFwKTtcblxuICAgIGxhYmVsTWluLnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywgJ01JTicpO1xuICAgIGxhYmVsTWF4LnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywgJ01BWCcpO1xuXG4gICAgdmFyIHZhbHVlcyA9IHRoaXMuX29ialt0aGlzLl9rZXldO1xuXG4gICAgaW5wdXRNaW4uc2V0VmFsdWUodmFsdWVzWzBdKTtcbiAgICBpbnB1dE1heC5zZXRWYWx1ZSh2YWx1ZXNbMV0pO1xuXG4gICAgdmFyIHdyYXAgPSB0aGlzLl93cmFwTm9kZTtcblxuICAgIGxhYmVsTWluV3JhcC5hZGRDaGlsZChsYWJlbE1pbik7XG4gICAgaW5wdXRNaW5XcmFwLmFkZENoaWxkKGlucHV0TWluLmdldE5vZGUoKSk7XG4gICAgbGFiZWxNYXhXcmFwLmFkZENoaWxkKGxhYmVsTWF4KTtcbiAgICBpbnB1dE1heFdyYXAuYWRkQ2hpbGQoaW5wdXRNYXguZ2V0Tm9kZSgpKTtcblxuICAgIHdyYXAuYWRkQ2hpbGQobGFiZWxNaW5XcmFwKTtcbiAgICB3cmFwLmFkZENoaWxkKGlucHV0TWluV3JhcCk7XG4gICAgd3JhcC5hZGRDaGlsZChsYWJlbE1heFdyYXApO1xuICAgIHdyYXAuYWRkQ2hpbGQoaW5wdXRNYXhXcmFwKTtcbn1cblJhbmdlLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZSk7XG5SYW5nZS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBSYW5nZTtcblxuUmFuZ2UucHJvdG90eXBlLl9vbklucHV0Q2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIG51bGwpKTtcbiAgICB0aGlzLl9vbkNoYW5nZSgpO1xufTtcblxuUmFuZ2UucHJvdG90eXBlLl91cGRhdGVWYWx1ZU1pbiA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdmFsdWVzID0gdGhpcy5fb2JqW3RoaXMuX2tleV07XG5cbiAgICB2YXIgaW5wdXRNaW4gPSB0aGlzLl9pbnB1dE1pbixcbiAgICAgICAgaW5wdXRWYWx1ZSA9IGlucHV0TWluLmdldFZhbHVlKCk7XG5cbiAgICBpZiAoaW5wdXRWYWx1ZSA+PSB0aGlzLl9pbnB1dE1heC5nZXRWYWx1ZSgpKSB7XG4gICAgICAgIGlucHV0TWluLnNldFZhbHVlKHZhbHVlc1swXSk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFsdWVzWzBdID0gaW5wdXRWYWx1ZTtcblxufTtcblxuUmFuZ2UucHJvdG90eXBlLl91cGRhdGVWYWx1ZU1heCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdmFsdWVzID0gdGhpcy5fb2JqW3RoaXMuX2tleV07XG5cbiAgICB2YXIgaW5wdXRNYXggPSB0aGlzLl9pbnB1dE1heCxcbiAgICAgICAgaW5wdXRWYWx1ZSA9IGlucHV0TWF4LmdldFZhbHVlKCk7XG5cbiAgICBpZiAoaW5wdXRWYWx1ZSA8PSB0aGlzLl9pbnB1dE1pbi5nZXRWYWx1ZSgpKSB7XG4gICAgICAgIGlucHV0TWF4LnNldFZhbHVlKHZhbHVlc1sxXSk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFsdWVzWzFdID0gaW5wdXRWYWx1ZTtcbn07XG5cblxuUmFuZ2UucHJvdG90eXBlLm9uVmFsdWVVcGRhdGUgPSBmdW5jdGlvbiAoZSkge1xuICAgIGlmIChlLmRhdGEub3JpZ2luID09IHRoaXMpe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChlLmRhdGEub3JpZ2luID09IG51bGwpIHtcbiAgICB9XG4gICAgdmFyIG8gPSB0aGlzLl9vYmosayA9IHRoaXMuX2tleTtcbiAgICB0aGlzLl9pbnB1dE1pbi5zZXRWYWx1ZShvW2tdWzBdKTtcbiAgICB0aGlzLl9pbnB1dE1heC5zZXRWYWx1ZShvW2tdWzFdKTtcbn07XG5cblJhbmdlLnByb3RvdHlwZS5zZXRWYWx1ZSA9IGZ1bmN0aW9uKHZhbHVlKXtcbiAgICB2YXIgbyA9IHRoaXMuX29iaixrID0gdGhpcy5fa2V5O1xuICAgIG9ba11bMF0gPSB2YWx1ZVswXTtcbiAgICBvW2tdWzFdID0gdmFsdWVbMV07XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcyxDb21wb25lbnRFdmVudC5WQUxVRV9VUERBVEVELG51bGwpKTtcbn07XG5cblJhbmdlLnByb3RvdHlwZS5fb25JbnB1dE1pbkNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl91cGRhdGVWYWx1ZU1pbigpO1xuICAgIHRoaXMuX29uSW5wdXRDaGFuZ2UoKTtcbn07XG5cblJhbmdlLnByb3RvdHlwZS5fb25JbnB1dE1heENoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl91cGRhdGVWYWx1ZU1heCgpO1xuICAgIHRoaXMuX29uSW5wdXRDaGFuZ2UoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUmFuZ2U7IiwidmFyIENvbXBvbmVudCA9IHJlcXVpcmUoJy4vLi4vY29yZS9Db21wb25lbnQnKTtcbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xudmFyIE1ldHJpYyA9IHJlcXVpcmUoJy4vTWV0cmljJyk7XG52YXIgR3JvdXBFdmVudCA9IHJlcXVpcmUoJy4uL2dyb3VwL0dyb3VwRXZlbnQnKTtcblxuZnVuY3Rpb24gU1ZHKHBhcmVudCwgcGFyYW1zKSB7XG4gICAgQ29tcG9uZW50LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICB2YXIgd3JhcCA9IHRoaXMuX3dyYXBOb2RlO1xuICAgICAgICB3cmFwLnNldFN0eWxlQ2xhc3MoQ1NTLkNhbnZhc1dyYXApO1xuICAgIHZhciB3cmFwU2l6ZSA9IHdyYXAuZ2V0V2lkdGgoKTtcblxuICAgIHZhciBzdmcgPSB0aGlzLl9zdmcgPSB0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ3N2ZycpO1xuICAgICAgICBzdmcuc2V0QXR0cmlidXRlKCd2ZXJzaW9uJywgJzEuMicpO1xuICAgICAgICBzdmcuc2V0QXR0cmlidXRlKCdiYXNlUHJvZmlsZScsICd0aW55Jyk7XG4gICAgICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ3ByZXNlcnZlQXNwZWN0UmF0aW8nLCAndHJ1ZScpO1xuXG4gICAgd3JhcC5nZXRFbGVtZW50KCkuYXBwZW5kQ2hpbGQoc3ZnKTtcblxuICAgIHRoaXMuX3N2Z1NldFNpemUod3JhcFNpemUsIHdyYXBTaXplKTtcbiAgICB0aGlzLl91cGRhdGVIZWlnaHQoKTtcblxuICAgIHRoaXMuX25vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQ2FudmFzTGlzdEl0ZW0pO1xuXG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSwgdGhpcywgJ29uR3JvdXBTaXplQ2hhbmdlJyk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuR1JPVVBfU0laRV9VUERBVEUsIHRoaXMuX3BhcmVudCwgJ29uR3JvdXBTaXplVXBkYXRlJyk7XG59XG5TVkcucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShDb21wb25lbnQucHJvdG90eXBlKTtcblNWRy5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTVkc7XG5cblNWRy5wcm90b3R5cGUuX3VwZGF0ZUhlaWdodCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc3ZnSGVpZ2h0ID0gTnVtYmVyKHRoaXMuX3N2Zy5nZXRBdHRyaWJ1dGUoJ2hlaWdodCcpKTtcbiAgICB0aGlzLl93cmFwTm9kZS5zZXRIZWlnaHQoc3ZnSGVpZ2h0KTtcbiAgICB0aGlzLl9ub2RlLnNldEhlaWdodChzdmdIZWlnaHQgKyBNZXRyaWMuUEFERElOR19XUkFQUEVSKTtcbn07XG5cblNWRy5wcm90b3R5cGUub25Hcm91cFNpemVDaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHdpZHRoID0gdGhpcy5fd3JhcE5vZGUuZ2V0V2lkdGgoKTtcbiAgICB0aGlzLl9zdmdTZXRTaXplKHdpZHRoLCB3aWR0aCk7XG4gICAgdGhpcy5fdXBkYXRlSGVpZ2h0KCk7XG59O1xuXG5TVkcucHJvdG90eXBlLl9zdmdTZXRTaXplID0gZnVuY3Rpb24gKHdpZHRoLCBoZWlnaHQpIHtcbiAgICB2YXIgc3ZnID0gdGhpcy5fc3ZnO1xuICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgd2lkdGgpO1xuICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIGhlaWdodCk7XG4gICAgc3ZnLnNldEF0dHJpYnV0ZSgndmlld2JveCcsICcwIDAgJyArIHdpZHRoICsgJyAnICsgaGVpZ2h0KTtcbn07XG5cblNWRy5wcm90b3R5cGUuZ2V0U1ZHID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9zdmc7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNWRzsiLCJ2YXIgT2JqZWN0Q29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY29yZS9PYmplY3RDb21wb25lbnQnKTtcbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xudmFyIEdyb3VwRXZlbnQgPSByZXF1aXJlKCcuLi9ncm91cC9Hcm91cEV2ZW50Jyk7XG52YXIgTWV0cmljID0gcmVxdWlyZSgnLi9NZXRyaWMnKTtcblxuZnVuY3Rpb24gU1ZHQ29tcG9uZW50KHBhcmVudCxvYmplY3QsdmFsdWUscGFyYW1zKXtcbiAgICBPYmplY3RDb21wb25lbnQuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG4gICAgdmFyIHdyYXAgPSB0aGlzLl93cmFwTm9kZTtcbiAgICAgICAgd3JhcC5zZXRTdHlsZUNsYXNzKENTUy5TVkdXcmFwKTtcbiAgICB2YXIgd3JhcFNpemUgPSB3cmFwLmdldFdpZHRoKCk7XG5cbiAgICB2YXIgc3ZnID0gdGhpcy5fc3ZnID0gdGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdzdmcnKTtcbiAgICAgICAgc3ZnLnNldEF0dHJpYnV0ZSgndmVyc2lvbicsICcxLjInKTtcbiAgICAgICAgc3ZnLnNldEF0dHJpYnV0ZSgnYmFzZVByb2ZpbGUnLCAndGlueScpO1xuXG4gICAgICAgIHdyYXAuZ2V0RWxlbWVudCgpLmFwcGVuZENoaWxkKHN2Zyk7XG5cbiAgICB2YXIgc3ZnUm9vdCA9IHRoaXMuX3N2Z1Jvb3QgPSBzdmcuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdnJykpO1xuICAgICAgICBzdmdSb290LnNldEF0dHJpYnV0ZSgndHJhbnNmb3JtJywndHJhbnNsYXRlKDAuNSAwLjUpJyk7XG5cbiAgICB0aGlzLl9zdmdTZXRTaXplKHdyYXBTaXplLHdyYXBTaXplKTtcbiAgICB0aGlzLl91cGRhdGVIZWlnaHQoKTtcblxuICAgIHRoaXMuX25vZGUuc2V0U3R5bGVDbGFzcyhDU1MuU1ZHTGlzdEl0ZW0pO1xuXG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSwgdGhpcywgJ29uR3JvdXBTaXplQ2hhbmdlJyk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuR1JPVVBfU0laRV9VUERBVEUsIHRoaXMuX3BhcmVudCwgJ29uR3JvdXBTaXplVXBkYXRlJyk7XG59XG5TVkdDb21wb25lbnQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShPYmplY3RDb21wb25lbnQucHJvdG90eXBlKTtcblNWR0NvbXBvbmVudC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTVkdDb21wb25lbnQ7XG5cblNWR0NvbXBvbmVudC5wcm90b3R5cGUuX3VwZGF0ZUhlaWdodCA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHN2Z0hlaWdodCA9IE51bWJlcih0aGlzLl9zdmcuZ2V0QXR0cmlidXRlKCdoZWlnaHQnKSk7XG5cbiAgICB0aGlzLl93cmFwTm9kZS5zZXRIZWlnaHQoc3ZnSGVpZ2h0KTtcbiAgICB0aGlzLl9ub2RlLnNldEhlaWdodChzdmdIZWlnaHQgKyBNZXRyaWMuUEFERElOR19XUkFQUEVSKTtcbn07XG5cblNWR0NvbXBvbmVudC5wcm90b3R5cGUuX3JlZHJhdyA9IGZ1bmN0aW9uKCl7fTtcblxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5vbkdyb3VwU2l6ZUNoYW5nZSA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHdpZHRoID0gdGhpcy5fd3JhcE5vZGUuZ2V0V2lkdGgoKTtcblxuICAgIHRoaXMuX3N2Z1NldFNpemUod2lkdGgsd2lkdGgpO1xuICAgIHRoaXMuX3VwZGF0ZUhlaWdodCgpO1xuICAgIHRoaXMuX3JlZHJhdygpO1xufTtcblxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5fY3JlYXRlU1ZHT2JqZWN0ID0gZnVuY3Rpb24odHlwZSkge1xuICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiLHR5cGUpO1xufTtcblxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5fc3ZnU2V0U2l6ZSA9IGZ1bmN0aW9uKHdpZHRoLGhlaWdodCkge1xuICAgIHZhciBzdmcgPSB0aGlzLl9zdmc7XG4gICAgICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgIHdpZHRoKTtcbiAgICAgICAgc3ZnLnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgaGVpZ2h0KTtcbiAgICAgICAgc3ZnLnNldEF0dHJpYnV0ZSgndmlld2JveCcsICcwIDAgJyArIHdpZHRoICsgJyAnICsgaGVpZ2h0KTtcbn07XG5cblxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5fcGF0aENtZE1vdmVUbyA9IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgcmV0dXJuICdNICcgKyB4ICsgJyAnICsgeSArICcgJztcbn07XG5cblNWR0NvbXBvbmVudC5wcm90b3R5cGUuX3BhdGhDbWRMaW5lVG8gPSBmdW5jdGlvbiAoeCwgeSkge1xuICAgIHJldHVybiAnTCAnICsgeCArICcgJyArIHkgKyAnICc7XG59O1xuXG5TVkdDb21wb25lbnQucHJvdG90eXBlLl9wYXRoQ21kQ2xvc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICdaJztcbn07XG5cblNWR0NvbXBvbmVudC5wcm90b3R5cGUuX3BhdGhDbWRMaW5lID0gZnVuY3Rpb24gKHgwLCB5MCwgeDEsIHkxKSB7XG4gICAgcmV0dXJuICdNICcgKyB4MCArICcgJyArIHkwICsgJyBMICcgKyB4MSArICcgJyArIHkxO1xufTtcblxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5fcGF0aENtZEJlemllckN1YmljID0gZnVuY3Rpb24gKGNtZCwgeDAsIHkwLCBjeDAsIGN5MCwgY3gxLCBjeTEsIHgxLCB5MSkge1xuICAgIHJldHVybiAnTSAnICsgeDAgKyAnICcgKyB5MCArICcgQyAnICsgY3gwICsgJyAnICsgY3kwICsgJywgJyArIGN4MSArICcgJyArIGN5MSArICcsICcgKyB4MSArICcgJyArIHkxO1xufTtcblxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5fcGF0aENtZEJlemllclF1YWRyYXRpYyA9IGZ1bmN0aW9uIChjbWQsIHgwLCB5MCwgY3gsIGN5LCB4MSwgeTEpIHtcbiAgICByZXR1cm4gJ00gJyArIHgwICsgJyAnICsgeTAgKyAnIFEgJyArIGN4ICsgJyAnICsgY3kgKyAnLCAnICsgeDEgKyAnICcgKyB5MTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU1ZHQ29tcG9uZW50OyIsInZhciBPYmplY3RDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jb3JlL09iamVjdENvbXBvbmVudCcpO1xudmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcbnZhciBDU1MgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcblxudmFyIE9wdGlvbnMgPSByZXF1aXJlKCcuL09wdGlvbnMnKTtcblxudmFyIEhpc3RvcnkgPSByZXF1aXJlKCcuLi9jb3JlL0hpc3RvcnknKTtcblxudmFyIEV2ZW50XyAgICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIE5vZGVFdmVudCAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKSxcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKSxcbiAgICBPcHRpb25FdmVudCAgICA9IHJlcXVpcmUoJy4uL2NvcmUvT3B0aW9uRXZlbnQnKTtcblxudmFyIE9iamVjdENvbXBvbmVudE5vdGlmaWVyID0gcmVxdWlyZSgnLi4vY29yZS9PYmplY3RDb21wb25lbnROb3RpZmllcicpO1xuXG52YXIgU1RSX0NIT09TRSA9ICdDaG9vc2UgLi4uJztcblxuZnVuY3Rpb24gU2VsZWN0KHBhcmVudCwgb2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgT2JqZWN0Q29tcG9uZW50LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICBwYXJhbXMgPSBwYXJhbXMgfHwge307XG4gICAgcGFyYW1zLm9uQ2hhbmdlID0gcGFyYW1zLm9uQ2hhbmdlIHx8IHRoaXMuX29uQ2hhbmdlO1xuICAgIHRoaXMuX29uQ2hhbmdlID0gcGFyYW1zLm9uQ2hhbmdlO1xuXG4gICAgdmFyIG9iaiA9IHRoaXMuX29iaixcbiAgICAgICAga2V5ID0gdGhpcy5fa2V5O1xuXG4gICAgdmFyIHRhcmdldEtleSA9IHRoaXMuX3RhcmdldEtleSA9IHBhcmFtcy50YXJnZXQsXG4gICAgICAgIHZhbHVlcyA9IHRoaXMuX3ZhbHVlcyA9IG9ialtrZXldO1xuXG5cbiAgICB0aGlzLl9zZWxlY3RlZEluZGV4ID0gLTE7XG4gICAgdGhpcy5fc2VsZWN0ZWQgPSBudWxsO1xuXG4gICAgdmFyIHNlbGVjdCA9IHRoaXMuX3NlbGVjdCA9IG5ldyBOb2RlKE5vZGUuSU5QVVRfQlVUVE9OKTtcbiAgICAgICAgc2VsZWN0LnNldFN0eWxlQ2xhc3MoQ1NTLlNlbGVjdCk7XG4gICAgICAgIHNlbGVjdC5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLCB0aGlzLl9vbk9wdGlvblRyaWdnZXIuYmluZCh0aGlzKSk7XG5cbiAgICBpZih0aGlzLl9oYXNUYXJnZXQoKSkge1xuICAgICAgICB2YXIgdGFyZ2V0T2JqID0gb2JqW3RhcmdldEtleV0gfHwgJyc7XG4gICAgICAgIHZhciBpID0gLTE7XG4gICAgICAgIHdoaWxlICgrK2kgPCB2YWx1ZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAodGFyZ2V0T2JqID09IHZhbHVlc1tpXSl7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2VsZWN0ZWQgPSB2YWx1ZXNbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc2VsZWN0LnNldFByb3BlcnR5KCd2YWx1ZScsIHRhcmdldE9iai50b1N0cmluZygpLmxlbmd0aCA+IDAgPyB0YXJnZXRPYmogOiB2YWx1ZXNbMF0pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgc2VsZWN0LnNldFByb3BlcnR5KCd2YWx1ZScsIHBhcmFtcy5zZWxlY3RlZCA/IHZhbHVlc1twYXJhbXMuc2VsZWN0ZWRdIDogU1RSX0NIT09TRSk7XG4gICAgfVxuXG4gICAgdGhpcy5fd3JhcE5vZGUuYWRkQ2hpbGQoc2VsZWN0KTtcblxuICAgIE9iamVjdENvbXBvbmVudE5vdGlmaWVyLmdldCgpLmFkZEV2ZW50TGlzdGVuZXIoT3B0aW9uRXZlbnQuVFJJR0dFUiwgdGhpcywgJ29uT3B0aW9uVHJpZ2dlcicpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihPcHRpb25FdmVudC5UUklHR0VSRUQsIE9iamVjdENvbXBvbmVudE5vdGlmaWVyLmdldCgpLCAnb25PcHRpb25UcmlnZ2VyZWQnKTtcbn1cblNlbGVjdC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE9iamVjdENvbXBvbmVudC5wcm90b3R5cGUpO1xuU2VsZWN0LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNlbGVjdDtcblxuU2VsZWN0LnByb3RvdHlwZS5vbk9wdGlvblRyaWdnZXIgPSBmdW5jdGlvbiAoZSkge1xuICAgIGlmIChlLmRhdGEub3JpZ2luID09IHRoaXMpIHtcbiAgICAgICAgdGhpcy5fYWN0aXZlID0gIXRoaXMuX2FjdGl2ZTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xuXG4gICAgICAgIGlmICh0aGlzLl9hY3RpdmUpIHtcbiAgICAgICAgICAgIHRoaXMuX2J1aWxkT3B0aW9ucygpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgT3B0aW9ucy5nZXQoKS5jbGVhcigpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5fYWN0aXZlID0gZmFsc2U7XG4gICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xufTtcblxuU2VsZWN0LnByb3RvdHlwZS5fYnVpbGRPcHRpb25zID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBvcHRpb25zID0gT3B0aW9ucy5nZXQoKTtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBvcHRpb25zLmJ1aWxkKHRoaXMuX3ZhbHVlcywgdGhpcy5fc2VsZWN0ZWQsIHRoaXMuX3NlbGVjdCxcbiAgICAgICAgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHNlbGYuYXBwbHlWYWx1ZSgpO1xuICAgICAgICAgICAgc2VsZi5fYWN0aXZlID0gZmFsc2U7XG4gICAgICAgICAgICBzZWxmLl91cGRhdGVBcHBlYXJhbmNlKCk7XG4gICAgICAgICAgICBzZWxmLl9zZWxlY3RlZEluZGV4ID0gb3B0aW9ucy5nZXRTZWxlY3RlZEluZGV4KCk7XG4gICAgICAgICAgICBzZWxmLl9vbkNoYW5nZShzZWxmLl9zZWxlY3RlZEluZGV4KTtcbiAgICAgICAgICAgIG9wdGlvbnMuY2xlYXIoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHNlbGYuX2FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgc2VsZi5fdXBkYXRlQXBwZWFyYW5jZSgpO1xuICAgICAgICAgICAgb3B0aW9ucy5jbGVhcigpXG4gICAgICAgIH0sIGZhbHNlKTtcbn07XG5cblNlbGVjdC5wcm90b3R5cGUuX2FwcGx5U2VsZWN0ZWQgPSBmdW5jdGlvbihzZWxlY3RlZCl7XG4gICAgdGhpcy5fc2VsZWN0LnNldFByb3BlcnR5KCd2YWx1ZScsc2VsZWN0ZWQpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCksbnVsbCk7XG59XG5cblNlbGVjdC5wcm90b3R5cGUuYXBwbHlWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaW5kZXggPSBPcHRpb25zLmdldCgpLmdldFNlbGVjdGVkSW5kZXgoKSxcbiAgICAgICAgc2VsZWN0ZWQgPSB0aGlzLl9zZWxlY3RlZCA9IHRoaXMuX3ZhbHVlc1tpbmRleF07XG5cbiAgICBpZiAodGhpcy5faGFzVGFyZ2V0KCkpIHtcbiAgICAgICAgdGhpcy5wdXNoSGlzdG9yeVN0YXRlKCk7XG4gICAgICAgIHRoaXMuX29ialt0aGlzLl90YXJnZXRLZXldID0gc2VsZWN0ZWQ7XG4gICAgfVxuXG4gICAgdGhpcy5fYXBwbHlTZWxlY3RlZChzZWxlY3RlZCk7XG59O1xuXG5TZWxlY3QucHJvdG90eXBlLnB1c2hIaXN0b3J5U3RhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG9iaiA9IHRoaXMuX29iaixcbiAgICAgICAga2V5ID0gdGhpcy5fdGFyZ2V0S2V5O1xuICAgIEhpc3RvcnkuZ2V0KCkucHVzaFN0YXRlKG9iaiwga2V5LCBvYmpba2V5XSk7XG59O1xuXG5TZWxlY3QucHJvdG90eXBlLl9vbk9wdGlvblRyaWdnZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgT3B0aW9uRXZlbnQuVFJJR0dFUkVELCBudWxsKSk7XG59O1xuXG5TZWxlY3QucHJvdG90eXBlLl91cGRhdGVBcHBlYXJhbmNlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX3NlbGVjdC5zZXRTdHlsZUNsYXNzKHRoaXMuX2FjdGl2ZSA/IENTUy5TZWxlY3RBY3RpdmUgOiBDU1MuU2VsZWN0KTtcbn07XG5cblNlbGVjdC5wcm90b3R5cGUub25WYWx1ZVVwZGF0ZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKCF0aGlzLl9oYXNUYXJnZXQoKSl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5fc2VsZWN0ZWQgPSB0aGlzLl9vYmpbdGhpcy5fdGFyZ2V0S2V5XTtcbiAgICB0aGlzLl9zZWxlY3Quc2V0UHJvcGVydHkoJ3ZhbHVlJywgdGhpcy5fc2VsZWN0ZWQudG9TdHJpbmcoKSk7XG59O1xuXG5TZWxlY3QucHJvdG90eXBlLl9oYXNUYXJnZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3RhcmdldEtleSAhPSBudWxsO1xufTtcblxuU2VsZWN0LnByb3RvdHlwZS5zZXRWYWx1ZSA9IGZ1bmN0aW9uKHZhbHVlKXtcbiAgICB0aGlzLl9zZWxlY3RlZEluZGV4ID0gdmFsdWU7XG4gICAgaWYodmFsdWUgPT0gLTEpe1xuICAgICAgICB0aGlzLl9zZWxlY3RlZCA9IG51bGw7XG4gICAgICAgIHRoaXMuX3NlbGVjdC5zZXRQcm9wZXJ0eSgndmFsdWUnLCBTVFJfQ0hPT1NFKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl9zZWxlY3RlZCA9IHRoaXMuX3ZhbHVlc1t0aGlzLl9zZWxlY3RlZEluZGV4XTtcbiAgICB0aGlzLl9hcHBseVNlbGVjdGVkKHRoaXMuX3NlbGVjdGVkKTtcbn07XG5cblNlbGVjdC5wcm90b3R5cGUuZ2V0RGF0YSA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIG9iaiA9IHt9O1xuICAgICAgICBvYmpbJ3NlbGVjdGVkSW5kZXgnXSA9IHRoaXMuX3NlbGVjdGVkSW5kZXg7XG4gICAgcmV0dXJuIG9iajtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0O1xuIiwidmFyIE9iamVjdENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvT2JqZWN0Q29tcG9uZW50Jyk7XG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcbnZhciBTbGlkZXJfSW50ZXJuYWwgPSByZXF1aXJlKCcuL1NsaWRlcl9JbnRlcm5hbCcpO1xuXG52YXIgSGlzdG9yeSA9IHJlcXVpcmUoJy4uL2NvcmUvSGlzdG9yeScpO1xudmFyIFJhbmdlID0gcmVxdWlyZSgnLi9SYW5nZScpO1xudmFyIE51bWJlcklucHV0X0ludGVybmFsID0gcmVxdWlyZSgnLi9OdW1iZXJJbnB1dF9JbnRlcm5hbCcpO1xuXG52YXIgRXZlbnRfICAgICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXG4gICAgRG9jdW1lbnRFdmVudCAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcbiAgICBQYW5lbEV2ZW50ICAgICA9IHJlcXVpcmUoJy4uL2dyb3VwL1BhbmVsRXZlbnQnKSxcbiAgICBHcm91cEV2ZW50ICAgICA9IHJlcXVpcmUoJy4uL2dyb3VwL0dyb3VwRXZlbnQnKSxcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKTtcblxudmFyIERFRkFVTFRfU1RFUCA9IDEuMCxcbiAgICBERUZBVUxUX0RQICAgPSAyO1xuXG5cbmZ1bmN0aW9uIFNsaWRlcihwYXJlbnQsb2JqZWN0LHZhbHVlLHJhbmdlLHBhcmFtcykge1xuICAgIHBhcmFtcyAgICAgICAgICA9IHBhcmFtcyAgICAgICAgICB8fCB7fTtcbiAgICBwYXJhbXMubGFiZWwgICAgPSBwYXJhbXMubGFiZWwgICAgfHwgdmFsdWU7XG5cbiAgICBPYmplY3RDb21wb25lbnQuYXBwbHkodGhpcyxbcGFyZW50LG9iamVjdCxyYW5nZSxwYXJhbXNdKTtcblxuICAgIHRoaXMuX3ZhbHVlcyAgPSB0aGlzLl9vYmpbdGhpcy5fa2V5XTtcbiAgICB0aGlzLl90YXJnZXRLZXkgPSB2YWx1ZTtcblxuICAgIHBhcmFtcy5zdGVwICAgICA9IHBhcmFtcy5zdGVwICAgICB8fCBERUZBVUxUX1NURVA7XG4gICAgcGFyYW1zLmRwICAgICAgID0gKHBhcmFtcy5kcCA9PT0gdW5kZWZpbmVkIHx8IHBhcmFtcy5kcCA9PSBudWxsKSA/ICBERUZBVUxUX0RQIDogcGFyYW1zLmRwO1xuICAgIHBhcmFtcy5vbkNoYW5nZSA9IHBhcmFtcy5vbkNoYW5nZSB8fCB0aGlzLl9vbkNoYW5nZTtcbiAgICBwYXJhbXMub25GaW5pc2ggPSBwYXJhbXMub25GaW5pc2ggfHwgZnVuY3Rpb24oKXt9O1xuXG4gICAgdGhpcy5fZHAgICAgICAgPSBwYXJhbXMuZHA7XG4gICAgdGhpcy5fb25DaGFuZ2UgPSBwYXJhbXMub25DaGFuZ2U7XG4gICAgdGhpcy5fb25GaW5pc2ggPSBwYXJhbXMub25GaW5pc2g7XG5cbiAgICB2YXIgdmFsdWVzICAgID0gdGhpcy5fdmFsdWVzLFxuICAgICAgICBvYmogICAgICAgPSB0aGlzLl9vYmosXG4gICAgICAgIHRhcmdldEtleSA9IHRoaXMuX3RhcmdldEtleTtcblxuICAgIHZhciB3cmFwICA9IHRoaXMuX3dyYXBOb2RlO1xuICAgICAgICB3cmFwLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXBTbGlkZXIpO1xuXG4gICAgdmFyIHNsaWRlciA9IHRoaXMuX3NsaWRlciA9IG5ldyBTbGlkZXJfSW50ZXJuYWwod3JhcCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9vblNsaWRlckJlZ2luLmJpbmQodGhpcyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fb25TbGlkZXJNb3ZlLmJpbmQodGhpcyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fb25TbGlkZXJFbmQuYmluZCh0aGlzKSk7XG5cbiAgICBzbGlkZXIuc2V0Qm91bmRNaW4odmFsdWVzWzBdKTtcbiAgICBzbGlkZXIuc2V0Qm91bmRNYXgodmFsdWVzWzFdKTtcbiAgICBzbGlkZXIuc2V0VmFsdWUob2JqW3RhcmdldEtleV0pO1xuXG4gICAgdmFyIGlucHV0ICA9IHRoaXMuX2lucHV0ID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHBhcmFtcy5zdGVwLCBwYXJhbXMuZHAsIG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX29uSW5wdXRDaGFuZ2UuYmluZCh0aGlzKSk7XG5cbiAgICBpbnB1dC5zZXRWYWx1ZShvYmpbdGFyZ2V0S2V5XSk7XG5cbiAgICB3cmFwLmFkZENoaWxkKGlucHV0LmdldE5vZGUoKSk7XG5cbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihQYW5lbEV2ZW50LlBBTkVMX01PVkVfRU5ELCAgICB0aGlzLCAnb25QYW5lbE1vdmVFbmQnKTtcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LkdST1VQX1NJWkVfQ0hBTkdFLCB0aGlzLCAnb25Hcm91cFdpZHRoQ2hhbmdlJyk7XG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5XSU5ET1dfUkVTSVpFLCAgdGhpcywgJ29uV2luZG93UmVzaXplJyk7XG59XG5TbGlkZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShPYmplY3RDb21wb25lbnQucHJvdG90eXBlKTtcblNsaWRlci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTbGlkZXI7XG5cblNsaWRlci5wcm90b3R5cGUucHVzaEhpc3RvcnlTdGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgb2JqID0gdGhpcy5fb2JqLFxuICAgICAgICBrZXkgPSB0aGlzLl90YXJnZXRLZXk7XG4gICAgSGlzdG9yeS5nZXQoKS5wdXNoU3RhdGUob2JqLCBrZXksIG9ialtrZXldKTtcbn07XG5cblNsaWRlci5wcm90b3R5cGUuX29uU2xpZGVyQmVnaW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5wdXNoSGlzdG9yeVN0YXRlKCk7XG59O1xuXG5TbGlkZXIucHJvdG90eXBlLl9vblNsaWRlck1vdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5hcHBseVZhbHVlKCk7XG4gICAgdGhpcy5fdXBkYXRlVmFsdWVGaWVsZCgpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIG51bGwpKTtcbiAgICB0aGlzLl9vbkNoYW5nZSgpO1xufTtcblxuU2xpZGVyLnByb3RvdHlwZS5fb25TbGlkZXJFbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5hcHBseVZhbHVlKCk7XG4gICAgdGhpcy5fdXBkYXRlVmFsdWVGaWVsZCgpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIG51bGwpKTtcbiAgICB0aGlzLl9vbkZpbmlzaCgpO1xufTtcblxuU2xpZGVyLnByb3RvdHlwZS5fb25JbnB1dENoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaW5wdXQgPSB0aGlzLl9pbnB1dCxcbiAgICAgICAgdmFsdWVNaW4gPSB0aGlzLl92YWx1ZXNbMF0sXG4gICAgICAgIHZhbHVlTWF4ID0gdGhpcy5fdmFsdWVzWzFdO1xuXG4gICAgaWYgKGlucHV0LmdldFZhbHVlKCkgPj0gdmFsdWVNYXgpe1xuICAgICAgICBpbnB1dC5zZXRWYWx1ZSh2YWx1ZU1heCk7XG4gICAgfVxuICAgIGlmIChpbnB1dC5nZXRWYWx1ZSgpIDw9IHZhbHVlTWluKXtcbiAgICAgICAgaW5wdXQuc2V0VmFsdWUodmFsdWVNaW4pO1xuICAgIH1cblxuICAgIHZhciB2YWx1ZSA9IGlucHV0LmdldFZhbHVlKCk7XG5cbiAgICB0aGlzLl9zbGlkZXIuc2V0VmFsdWUodmFsdWUpO1xuICAgIHRoaXMuX29ialt0aGlzLl90YXJnZXRLZXldID0gdmFsdWU7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCwgbnVsbCkpO1xuICAgIHRoaXMuX29uRmluaXNoKCk7XG59O1xuXG5TbGlkZXIucHJvdG90eXBlLmFwcGx5VmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHZhbHVlICA9IHRoaXMuX3NsaWRlci5nZXRWYWx1ZSgpO1xuICAgIHRoaXMuX29ialt0aGlzLl90YXJnZXRLZXldID0gcGFyc2VGbG9hdCh2YWx1ZS50b0ZpeGVkKHRoaXMuX2RwKSk7XG4gICAgdGhpcy5faW5wdXQuc2V0VmFsdWUodmFsdWUpO1xufTtcblxuXG5TbGlkZXIucHJvdG90eXBlLm9uVmFsdWVVcGRhdGUgPSBmdW5jdGlvbiAoZSkge1xuICAgIHZhciBvcmlnaW4gPSBlLmRhdGEub3JpZ2luO1xuICAgIGlmIChvcmlnaW4gPT0gdGhpcyl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHNsaWRlciA9IHRoaXMuX3NsaWRlcjtcbiAgICBpZiAoIShvcmlnaW4gaW5zdGFuY2VvZiBTbGlkZXIpKSB7XG4gICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLl92YWx1ZXM7XG4gICAgICAgIHNsaWRlci5zZXRCb3VuZE1pbih2YWx1ZXNbMF0pO1xuICAgICAgICBzbGlkZXIuc2V0Qm91bmRNYXgodmFsdWVzWzFdKTtcbiAgICAgICAgaWYgKCEob3JpZ2luIGluc3RhbmNlb2YgUmFuZ2UpKSB7XG4gICAgICAgICAgICBzbGlkZXIuc2V0VmFsdWUodGhpcy5fb2JqW3RoaXMuX3RhcmdldEtleV0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBzbGlkZXIuc2V0VmFsdWUodGhpcy5fb2JqW3RoaXMuX3RhcmdldEtleV0pO1xuICAgIH1cbiAgICB0aGlzLmFwcGx5VmFsdWUoKTtcbn07XG5cblxuU2xpZGVyLnByb3RvdHlwZS5fdXBkYXRlVmFsdWVGaWVsZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9pbnB1dC5zZXRWYWx1ZSh0aGlzLl9zbGlkZXIuZ2V0VmFsdWUoKSk7XG59O1xuXG5TbGlkZXIucHJvdG90eXBlLm9uUGFuZWxNb3ZlRW5kID1cbiAgICBTbGlkZXIucHJvdG90eXBlLm9uR3JvdXBXaWR0aENoYW5nZSA9XG4gICAgICAgIFNsaWRlci5wcm90b3R5cGUub25XaW5kb3dSZXNpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLl9zbGlkZXIucmVzZXRPZmZzZXQoKTtcbiAgICAgICAgfTtcblxuU2xpZGVyLnByb3RvdHlwZS5zZXRWYWx1ZSA9IGZ1bmN0aW9uKHZhbHVlKXtcbiAgICBpZih2YWx1ZSA9PSAtMSl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5fb2JqW3RoaXMuX3RhcmdldEtleV0gPSB2YWx1ZTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsbnVsbCkpO1xufTtcblxuU2xpZGVyLnByb3RvdHlwZS5nZXREYXRhID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgb2JqID0ge307XG4gICAgICAgIG9ialt0aGlzLl90YXJnZXRLZXldID0gdGhpcy5fb2JqW3RoaXMuX3RhcmdldEtleV07XG4gICAgcmV0dXJuIG9iajtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU2xpZGVyOyIsInZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XG5cbnZhciBEb2N1bWVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXG4gICAgTm9kZUV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKTtcblxudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG52YXIgTW91c2UgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L01vdXNlJyk7XG5cbmZ1bmN0aW9uIFNsaWRlcl9JbnRlcm5hbChwYXJlbnROb2RlLG9uQmVnaW4sb25DaGFuZ2Usb25GaW5pc2gpIHtcbiAgICB0aGlzLl9ib3VuZHMgPSBbMCwxXTtcbiAgICB0aGlzLl92YWx1ZSAgPSAwO1xuICAgIHRoaXMuX2ludHJwbCA9IDA7XG4gICAgdGhpcy5fZm9jdXMgID0gZmFsc2U7XG5cblxuICAgIHRoaXMuX29uQmVnaW4gID0gb25CZWdpbiAgfHwgZnVuY3Rpb24oKXt9O1xuICAgIHRoaXMuX29uQ2hhbmdlID0gb25DaGFuZ2UgfHwgZnVuY3Rpb24oKXt9O1xuICAgIHRoaXMuX29uRmluaXNoID0gb25GaW5pc2ggfHwgZnVuY3Rpb24oKXt9O1xuXG5cbiAgICB2YXIgd3JhcCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuU2xpZGVyV3JhcCk7XG4gICAgcGFyZW50Tm9kZS5hZGRDaGlsZCh3cmFwKTtcblxuICAgIHZhciBzbG90ICAgPSB0aGlzLl9zbG90ICAgPSB7bm9kZTogICAgbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5TbGlkZXJTbG90KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9mZnNldFg6IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogICAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFkZGluZzogM307XG5cbiAgICB2YXIgaGFuZGxlID0gdGhpcy5faGFuZGxlID0ge25vZGUgICAgOiBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlNsaWRlckhhbmRsZSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aCAgIDogMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRyYWdnaW5nOiBmYWxzZX07XG5cbiAgICB3cmFwLmFkZENoaWxkKHNsb3Qubm9kZSk7XG4gICAgc2xvdC5ub2RlLmFkZENoaWxkKGhhbmRsZS5ub2RlKTtcblxuICAgIHNsb3Qub2Zmc2V0WCA9IHNsb3Qubm9kZS5nZXRQb3NpdGlvbkdsb2JhbFgoKTtcbiAgICBzbG90LndpZHRoICAgPSBNYXRoLmZsb29yKHNsb3Qubm9kZS5nZXRXaWR0aCgpIC0gc2xvdC5wYWRkaW5nICogMikgO1xuXG4gICAgaGFuZGxlLm5vZGUuc2V0V2lkdGgoaGFuZGxlLndpZHRoKTtcblxuICAgIHNsb3Qubm9kZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLHRoaXMuX29uU2xvdE1vdXNlRG93bi5iaW5kKHRoaXMpKTtcbiAgICBzbG90Lm5vZGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfVVAsICB0aGlzLl9vblNsb3RNb3VzZVVwLmJpbmQodGhpcykpO1xuXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsdGhpcy5fb25Eb2N1bWVudE1vdXNlTW92ZS5iaW5kKHRoaXMpKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfVVAsICB0aGlzLl9vbkRvY3VtZW50TW91c2VVcC5iaW5kKHRoaXMpKTtcbn1cblxuU2xpZGVyX0ludGVybmFsLnByb3RvdHlwZS5fb25Eb2N1bWVudE1vdXNlTW92ZSA9IGZ1bmN0aW9uKCl7XG4gICAgaWYoIXRoaXMuX2hhbmRsZS5kcmFnZ2luZyl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5fdXBkYXRlKCk7XG4gICAgdGhpcy5fb25DaGFuZ2UoKTtcbn07XG5cblNsaWRlcl9JbnRlcm5hbC5wcm90b3R5cGUuX29uRG9jdW1lbnRNb3VzZVVwID0gZnVuY3Rpb24oKXtcbiAgICBpZih0aGlzLl9oYW5kbGUuZHJhZ2dpbmcpe1xuICAgICAgICB0aGlzLl9vbkZpbmlzaCgpO1xuICAgIH1cbiAgICB0aGlzLl9oYW5kbGUuZHJhZ2dpbmcgPSBmYWxzZTtcbn07XG5cblNsaWRlcl9JbnRlcm5hbC5wcm90b3R5cGUuX29uU2xvdE1vdXNlRG93biA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5fb25CZWdpbigpO1xuICAgIHRoaXMuX2ZvY3VzID0gdHJ1ZTtcbiAgICB0aGlzLl9oYW5kbGUuZHJhZ2dpbmcgPSB0cnVlO1xuICAgIHRoaXMuX2hhbmRsZS5ub2RlLmdldEVsZW1lbnQoKS5mb2N1cygpO1xuICAgIHRoaXMuX3VwZGF0ZSgpO1xufTtcblxuU2xpZGVyX0ludGVybmFsLnByb3RvdHlwZS5fb25TbG90TW91c2VVcCA9IGZ1bmN0aW9uKCl7XG4gICAgaWYgKHRoaXMuX2ZvY3VzKSB7XG4gICAgICAgIHZhciBoYW5kbGUgPSB0aGlzLl9oYW5kbGU7XG4gICAgICAgIGlmIChoYW5kbGUuZHJhZ2dpbmcpe1xuICAgICAgICAgICAgdGhpcy5fb25GaW5pc2goKTtcbiAgICAgICAgfVxuICAgICAgICBoYW5kbGUuZHJhZ2dpbmcgPSBmYWxzZTtcbiAgICB9XG4gICAgdGhpcy5fZm9jdXMgPSBmYWxzZTtcbn07XG5cblNsaWRlcl9JbnRlcm5hbC5wcm90b3R5cGUuX3VwZGF0ZSA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIG14ID0gTW91c2UuZ2V0KCkuZ2V0WCgpLFxuICAgICAgICBzeCA9IHRoaXMuX3Nsb3Qub2Zmc2V0WCxcbiAgICAgICAgc3cgPSB0aGlzLl9zbG90LndpZHRoLFxuICAgICAgICBweCA9IChteCA8IHN4KSA/IDAgOiAobXggPiAoc3ggKyBzdykpID8gc3cgOiAobXggLSBzeCk7XG5cbiAgICB0aGlzLl9oYW5kbGUubm9kZS5zZXRXaWR0aChNYXRoLnJvdW5kKHB4KSk7XG4gICAgdGhpcy5faW50cnBsID0gcHggLyBzdztcbiAgICB0aGlzLl9pbnRlcnBvbGF0ZVZhbHVlKCk7XG59O1xuXG5TbGlkZXJfSW50ZXJuYWwucHJvdG90eXBlLl91cGRhdGVIYW5kbGUgPSBmdW5jdGlvbigpe1xuICAgIHZhciBzbG90V2lkdGggICA9IHRoaXMuX3Nsb3Qud2lkdGgsXG4gICAgICAgIGhhbmRsZVdpZHRoID0gTWF0aC5yb3VuZCh0aGlzLl9pbnRycGwgKiBzbG90V2lkdGgpO1xuICAgIHRoaXMuX2hhbmRsZS5ub2RlLnNldFdpZHRoKE1hdGgubWluKGhhbmRsZVdpZHRoLHNsb3RXaWR0aCkpO1xufTtcblxuU2xpZGVyX0ludGVybmFsLnByb3RvdHlwZS5faW50ZXJwb2xhdGVWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaW50cnBsID0gdGhpcy5faW50cnBsLFxuICAgICAgICBib3VuZHMgPSB0aGlzLl9ib3VuZHM7XG4gICAgdGhpcy5fdmFsdWUgPSBib3VuZHNbMF0gKiAoMS4wIC0gaW50cnBsKSArIGJvdW5kc1sxXSAqIGludHJwbDtcbn07XG5cblNsaWRlcl9JbnRlcm5hbC5wcm90b3R5cGUucmVzZXRPZmZzZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNsb3QgPSB0aGlzLl9zbG90O1xuICAgIHNsb3Qub2Zmc2V0WCA9IHNsb3Qubm9kZS5nZXRQb3NpdGlvbkdsb2JhbFgoKTtcbiAgICBzbG90LndpZHRoID0gTWF0aC5mbG9vcihzbG90Lm5vZGUuZ2V0V2lkdGgoKSAtIHNsb3QucGFkZGluZyAqIDIpXG59O1xuXG5TbGlkZXJfSW50ZXJuYWwucHJvdG90eXBlLnNldEJvdW5kTWluID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdmFyIGJvdW5kcyA9IHRoaXMuX2JvdW5kcztcbiAgICBpZiAodmFsdWUgPj0gYm91bmRzWzFdKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBib3VuZHNbMF0gPSB2YWx1ZTtcbiAgICB0aGlzLl91cGRhdGVGcm9tQm91bmRzKCk7XG59O1xuXG5TbGlkZXJfSW50ZXJuYWwucHJvdG90eXBlLnNldEJvdW5kTWF4ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdmFyIGJvdW5kcyA9IHRoaXMuX2JvdW5kcztcbiAgICBpZiAodmFsdWUgPD0gYm91bmRzWzBdKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBib3VuZHNbMV0gPSB2YWx1ZTtcbiAgICB0aGlzLl91cGRhdGVGcm9tQm91bmRzKCk7XG59O1xuXG5TbGlkZXJfSW50ZXJuYWwucHJvdG90eXBlLl91cGRhdGVGcm9tQm91bmRzID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBib3VuZHNNaW4gPSB0aGlzLl9ib3VuZHNbMF0sXG4gICAgICAgIGJvdW5kc01heCA9IHRoaXMuX2JvdW5kc1sxXTtcbiAgICB0aGlzLl92YWx1ZSA9IE1hdGgubWF4KGJvdW5kc01pbixNYXRoLm1pbih0aGlzLl92YWx1ZSxib3VuZHNNYXgpKTtcbiAgICB0aGlzLl9pbnRycGwgPSBNYXRoLmFicygodGhpcy5fdmFsdWUgLSBib3VuZHNNaW4pIC8gKGJvdW5kc01pbiAtIGJvdW5kc01heCkpO1xuICAgIHRoaXMuX3VwZGF0ZUhhbmRsZSgpO1xufTtcblxuU2xpZGVyX0ludGVybmFsLnByb3RvdHlwZS5zZXRWYWx1ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHZhciBib3VuZHNNaW4gPSB0aGlzLl9ib3VuZHNbMF0sXG4gICAgICAgIGJvdW5kc01heCA9IHRoaXMuX2JvdW5kc1sxXTtcblxuICAgIGlmICh2YWx1ZSA8IGJvdW5kc01pbiB8fCB2YWx1ZSA+IGJvdW5kc01heCl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5faW50cnBsID0gTWF0aC5hYnMoKHZhbHVlIC0gYm91bmRzTWluKSAvIChib3VuZHNNaW4gLSBib3VuZHNNYXgpKTtcbiAgICB0aGlzLl91cGRhdGVIYW5kbGUoKTtcbiAgICB0aGlzLl92YWx1ZSA9IHZhbHVlO1xufTtcblxuU2xpZGVyX0ludGVybmFsLnByb3RvdHlwZS5nZXRWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fdmFsdWU7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gU2xpZGVyX0ludGVybmFsOyIsInZhciBPYmplY3RDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jb3JlL09iamVjdENvbXBvbmVudCcpO1xudmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xudmFyIE9wdGlvbnMgPSByZXF1aXJlKCcuL09wdGlvbnMnKTtcbnZhciBCdXR0b25QcmVzZXQgPSByZXF1aXJlKCcuL0J1dHRvblByZXNldCcpO1xudmFyIE1ldHJpYyA9IHJlcXVpcmUoJy4vTWV0cmljJyk7XG5cbnZhciBFdmVudF8gPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXG4gICAgRG9jdW1lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxuICAgIE5vZGVFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50JyksXG4gICAgQ29tcG9uZW50RXZlbnQgPSAgcmVxdWlyZSgnLi4vY29yZS9Db21wb25lbnRFdmVudCcpO1xuXG52YXIgREVGQVVMVF9QUkVTRVQgPSBudWxsO1xuXG5mdW5jdGlvbiBTdHJpbmdJbnB1dChwYXJlbnQsb2JqZWN0LHZhbHVlLHBhcmFtcykge1xuICAgIE9iamVjdENvbXBvbmVudC5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cbiAgICBwYXJhbXMgICAgICAgICAgPSBwYXJhbXMgfHwge307XG4gICAgcGFyYW1zLm9uQ2hhbmdlID0gcGFyYW1zLm9uQ2hhbmdlIHx8IHRoaXMuX29uQ2hhbmdlO1xuICAgIHBhcmFtcy5wcmVzZXRzICA9IHBhcmFtcy5wcmVzZXRzICB8fCBERUZBVUxUX1BSRVNFVDtcblxuICAgIHRoaXMuX29uQ2hhbmdlICAgPSBwYXJhbXMub25DaGFuZ2U7XG5cbiAgICB2YXIgaW5wdXQgPSB0aGlzLl9pbnB1dCA9IG5ldyBOb2RlKE5vZGUuSU5QVVRfVEVYVCk7XG5cbiAgICB2YXIgd3JhcCA9IHRoaXMuX3dyYXBOb2RlO1xuXG4gICAgdmFyIHByZXNldHMgPSBwYXJhbXMucHJlc2V0cztcbiAgICBpZiAoIXByZXNldHMpIHtcbiAgICAgICAgd3JhcC5hZGRDaGlsZChpbnB1dCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB2YXIgd3JhcF8gPSBuZXcgTm9kZSgpO1xuICAgICAgICB3cmFwXy5zZXRTdHlsZUNsYXNzKENTUy5XcmFwSW5wdXRXUHJlc2V0KTtcblxuICAgICAgICB3cmFwLmFkZENoaWxkKHdyYXBfKTtcbiAgICAgICAgd3JhcF8uYWRkQ2hpbGQoaW5wdXQpO1xuXG4gICAgICAgIHZhciBvcHRpb25zID0gT3B0aW9ucy5nZXQoKSxcbiAgICAgICAgICAgIGJ0blByZXNldCA9IG5ldyBCdXR0b25QcmVzZXQodGhpcy5fd3JhcE5vZGUpO1xuXG4gICAgICAgIHZhciBvblByZXNldERlYWN0aXZhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBvcHRpb25zLmNsZWFyKCk7XG4gICAgICAgICAgICBidG5QcmVzZXQuZGVhY3RpdmF0ZSgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIG9uUHJlc2V0QWN0aXZhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBvcHRpb25zLmJ1aWxkKHByZXNldHMsXG4gICAgICAgICAgICAgICAgaW5wdXQuZ2V0UHJvcGVydHkoJ3ZhbHVlJyksXG4gICAgICAgICAgICAgICAgaW5wdXQsXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBpbnB1dC5zZXRQcm9wZXJ0eSgndmFsdWUnLCBwcmVzZXRzW29wdGlvbnMuZ2V0U2VsZWN0ZWRJbmRleCgpXSk7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYucHVzaEhpc3RvcnlTdGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICBzZWxmLmFwcGx5VmFsdWUoKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uUHJlc2V0RGVhY3RpdmF0ZSxcbiAgICAgICAgICAgICAgICBNZXRyaWMuUEFERElOR19QUkVTRVQsXG4gICAgICAgICAgICAgICAgZmFsc2UpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGJ0blByZXNldC5zZXRPbkFjdGl2ZShvblByZXNldEFjdGl2YXRlKTtcbiAgICAgICAgYnRuUHJlc2V0LnNldE9uRGVhY3RpdmUob25QcmVzZXREZWFjdGl2YXRlKVxuICAgIH1cblxuICAgIGlucHV0LnNldFByb3BlcnR5KCd2YWx1ZScsdGhpcy5fb2JqW3RoaXMuX2tleV0pO1xuXG4gICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuS0VZX1VQLCB0aGlzLl9vbklucHV0S2V5VXAuYmluZCh0aGlzKSk7XG4gICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuQ0hBTkdFLCB0aGlzLl9vbklucHV0Q2hhbmdlLmJpbmQodGhpcykpO1xuXG4gICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25JbnB1dERyYWdTdGFydC5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoQ29tcG9uZW50RXZlbnQuSU5QVVRfU0VMRUNUX0RSQUcsdGhpcy5fcGFyZW50LCdvbkNvbXBvbmVudFNlbGVjdERyYWcnKTtcbn1cblN0cmluZ0lucHV0LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZSk7XG5TdHJpbmdJbnB1dC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTdHJpbmdJbnB1dDtcblxuU3RyaW5nSW5wdXQucHJvdG90eXBlLl9vbklucHV0S2V5VXAgPSBmdW5jdGlvbiAoZSkge1xuICAgIGlmICh0aGlzLl9rZXlJc0NoYXIoZS5rZXlDb2RlKSl7XG4gICAgICAgIHRoaXMucHVzaEhpc3RvcnlTdGF0ZSgpO1xuICAgIH1cbiAgICB0aGlzLmFwcGx5VmFsdWUoKTtcbiAgICB0aGlzLl9vbkNoYW5nZSgpO1xufTtcblxuU3RyaW5nSW5wdXQucHJvdG90eXBlLl9vbklucHV0Q2hhbmdlID0gZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAodGhpcy5fa2V5SXNDaGFyKGUua2V5Q29kZSkpe1xuICAgICAgICB0aGlzLnB1c2hIaXN0b3J5U3RhdGUoKTtcbiAgICB9XG4gICAgdGhpcy5hcHBseVZhbHVlKCk7XG59O1xuXG4vL1RPRE86IEZpbmlzaCBjaGVja1xuU3RyaW5nSW5wdXQucHJvdG90eXBlLl9rZXlJc0NoYXIgPSBmdW5jdGlvbiAoa2V5Q29kZSkge1xuICAgIHJldHVybiBrZXlDb2RlICE9IDE3ICYmXG4gICAgICAgIGtleUNvZGUgIT0gMTggJiZcbiAgICAgICAga2V5Q29kZSAhPSAyMCAmJlxuICAgICAgICBrZXlDb2RlICE9IDM3ICYmXG4gICAgICAgIGtleUNvZGUgIT0gMzggJiZcbiAgICAgICAga2V5Q29kZSAhPSAzOSAmJlxuICAgICAgICBrZXlDb2RlICE9IDQwICYmXG4gICAgICAgIGtleUNvZGUgIT0gMTY7XG59O1xuXG5cblN0cmluZ0lucHV0LnByb3RvdHlwZS5hcHBseVZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX29ialt0aGlzLl9rZXldID0gdGhpcy5faW5wdXQuZ2V0UHJvcGVydHkoJ3ZhbHVlJyk7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCwgbnVsbCkpO1xufTtcblxuU3RyaW5nSW5wdXQucHJvdG90eXBlLm9uVmFsdWVVcGRhdGUgPSBmdW5jdGlvbiAoZSkge1xuICAgIGlmIChlLmRhdGEub3JpZ2luID09IHRoaXMpcmV0dXJuO1xuICAgIHRoaXMuX2lucHV0LnNldFByb3BlcnR5KCd2YWx1ZScsIHRoaXMuX29ialt0aGlzLl9rZXldKTtcbn07XG5cbi8vUHJldmVudCBjaHJvbWUgc2VsZWN0IGRyYWdcblN0cmluZ0lucHV0LnByb3RvdHlwZS5fb25JbnB1dERyYWdTdGFydCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZXZlbnRNb3ZlID0gRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLFxuICAgICAgICBldmVudFVwID0gRG9jdW1lbnRFdmVudC5NT1VTRV9VUDtcblxuICAgIHZhciBldmVudCA9IENvbXBvbmVudEV2ZW50LklOUFVUX1NFTEVDVF9EUkFHO1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgb25EcmFnID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgZXZlbnQsIG51bGwpKTtcbiAgICAgICAgfSxcblxuICAgICAgICBvbkRyYWdGaW5pc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBldmVudCwgbnVsbCkpO1xuXG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnRmluaXNoLCBmYWxzZSk7XG4gICAgICAgIH07XG5cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBldmVudCwgbnVsbCkpO1xuXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRVcCwgb25EcmFnRmluaXNoLCBmYWxzZSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN0cmluZ0lucHV0OyIsInZhciBPdXRwdXQgPSByZXF1aXJlKCcuL091dHB1dCcpO1xuXG5TdHJpbmdPdXRwdXQgPSBmdW5jdGlvbiAocGFyZW50LCBvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICBPdXRwdXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5TdHJpbmdPdXRwdXQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShPdXRwdXQucHJvdG90eXBlKTtcblN0cmluZ091dHB1dC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTdHJpbmdPdXRwdXQ7XG5cblN0cmluZ091dHB1dC5wcm90b3R5cGUuX3NldFZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLl9wYXJlbnQuaXNEaXNhYmxlZCgpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRleHRBcmVhU3RyaW5nID0gdGhpcy5fb2JqW3RoaXMuX2tleV07XG5cbiAgICBpZiAodGV4dEFyZWFTdHJpbmcgPT0gdGhpcy5fcHJldlN0cmluZyl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRleHRBcmVhID0gdGhpcy5fdGV4dEFyZWEsXG4gICAgICAgIHRleHRBcmVhRWxlbWVudCA9IHRleHRBcmVhLmdldEVsZW1lbnQoKSxcbiAgICAgICAgdGV4dEFyZWFTY3JvbGxIZWlnaHQ7XG5cbiAgICB0ZXh0QXJlYS5zZXRQcm9wZXJ0eSgndmFsdWUnLCB0ZXh0QXJlYVN0cmluZyk7XG4gICAgdGV4dEFyZWFTY3JvbGxIZWlnaHQgPSB0ZXh0QXJlYUVsZW1lbnQuc2Nyb2xsSGVpZ2h0O1xuICAgIHRleHRBcmVhLnNldEhlaWdodCh0ZXh0QXJlYVNjcm9sbEhlaWdodCk7XG5cbiAgICB2YXIgc2Nyb2xsQmFyID0gdGhpcy5fc2Nyb2xsQmFyO1xuXG4gICAgaWYgKHNjcm9sbEJhcikge1xuICAgICAgICBpZiAodGV4dEFyZWFTY3JvbGxIZWlnaHQgPD0gdGhpcy5fd3JhcE5vZGUuZ2V0SGVpZ2h0KCkpIHtcbiAgICAgICAgICAgIHNjcm9sbEJhci5kaXNhYmxlKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzY3JvbGxCYXIuZW5hYmxlKCk7XG4gICAgICAgICAgICBzY3JvbGxCYXIudXBkYXRlKCk7XG4gICAgICAgICAgICBzY3JvbGxCYXIucmVzZXQoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB0aGlzLl9wcmV2U3RyaW5nID0gdGV4dEFyZWFTdHJpbmc7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN0cmluZ091dHB1dDtcbiIsInZhciBQbG90dGVyID0gcmVxdWlyZSgnLi9QbG90dGVyJyk7XG52YXIgTWV0cmljICA9IHJlcXVpcmUoJy4vTWV0cmljJyk7XG5cbnZhciBERUZBVUxUX1JFU09MVVRJT04gPSAxO1xuXG5mdW5jdGlvbiBWYWx1ZVBsb3R0ZXIocGFyZW50LG9iamVjdCx2YWx1ZSxwYXJhbXMpIHtcbiAgICBQbG90dGVyLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuICAgIHZhciBzdmcgICAgICAgPSB0aGlzLl9zdmcsXG4gICAgICAgIHN2Z1dpZHRoICA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKSxcbiAgICAgICAgc3ZnSGVpZ2h0ID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ2hlaWdodCcpKTtcblxuICAgIHBhcmFtcyAgICAgICAgICAgID0gcGFyYW1zICAgICAgICAgICAgfHwge307XG4gICAgcGFyYW1zLmhlaWdodCAgICAgPSBwYXJhbXMuaGVpZ2h0ICAgICB8fCBzdmdIZWlnaHQ7XG4gICAgcGFyYW1zLnJlc29sdXRpb24gPSBwYXJhbXMucmVzb2x1dGlvbiB8fCBERUZBVUxUX1JFU09MVVRJT047XG5cbiAgICB2YXIgcmVzb2x1dGlvbiA9IHBhcmFtcy5yZXNvbHV0aW9uLFxuICAgICAgICBsZW5ndGggICAgID0gTWF0aC5mbG9vcihzdmdXaWR0aCAvIHJlc29sdXRpb24pO1xuXG4gICAgdmFyIHBvaW50cyAgICAgPSB0aGlzLl9wb2ludHMgID0gbmV3IEFycmF5KGxlbmd0aCAqIDIpLFxuICAgICAgICBidWZmZXIwICAgID0gdGhpcy5fYnVmZmVyMCA9IG5ldyBBcnJheShsZW5ndGgpLFxuICAgICAgICBidWZmZXIxICAgID0gdGhpcy5fYnVmZmVyMSA9IG5ldyBBcnJheShsZW5ndGgpO1xuXG4gICAgdmFyIG1pbiA9IHRoaXMuX2xpbmVXaWR0aCAqIDAuNTtcblxuICAgIHZhciBpID0gLTE7XG4gICAgd2hpbGUgKCsraSA8IGxlbmd0aCkge1xuICAgICAgICBidWZmZXIwW2ldID0gYnVmZmVyMVtpXSA9IHBvaW50c1tpICogMl0gPSBwb2ludHNbaSAqIDIgKyAxXSA9IG1pbjtcbiAgICB9XG5cbiAgICB0aGlzLl9oZWlnaHQgPSBwYXJhbXMuaGVpZ2h0ID0gcGFyYW1zLmhlaWdodCAgPCBNZXRyaWMuQ09NUE9ORU5UX01JTl9IRUlHSFQgP1xuICAgICAgICAgICAgICAgICAgIE1ldHJpYy5DT01QT05FTlRfTUlOX0hFSUdIVCA6IHBhcmFtcy5oZWlnaHQ7XG5cbiAgICB0aGlzLl9zdmdTZXRTaXplKHN2Z0hlaWdodCxNYXRoLmZsb29yKHBhcmFtcy5oZWlnaHQpKTtcbiAgICB0aGlzLl9ncmlkLnN0eWxlLnN0cm9rZSA9ICdyZ2IoMzksNDQsNDYpJztcblxuICAgIHRoaXMuX3VwZGF0ZUhlaWdodCgpO1xuICAgIHRoaXMuX2RyYXdWYWx1ZSgpO1xufVxuVmFsdWVQbG90dGVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUGxvdHRlci5wcm90b3R5cGUpO1xuVmFsdWVQbG90dGVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFZhbHVlUGxvdHRlcjtcblxuVmFsdWVQbG90dGVyLnByb3RvdHlwZS5fcmVkcmF3ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBwb2ludHMgPSB0aGlzLl9wb2ludHMsXG4gICAgICAgIGJ1ZmZlckxlbiA9IHRoaXMuX2J1ZmZlcjAubGVuZ3RoO1xuXG4gICAgdmFyIHdpZHRoID0gTnVtYmVyKHRoaXMuX3N2Zy5nZXRBdHRyaWJ1dGUoJ3dpZHRoJykpLFxuICAgICAgICByYXRpbyA9IHdpZHRoIC8gKGJ1ZmZlckxlbiAtIDEpO1xuXG4gICAgdmFyIGkgPSAtMTtcbiAgICB3aGlsZSAoKytpIDwgYnVmZmVyTGVuKSB7XG4gICAgICAgIHBvaW50c1tpICogMl0gPSB3aWR0aCAtIGkgKiByYXRpbztcbiAgICB9XG5cbiAgICB0aGlzLl9kcmF3VmFsdWUoKTtcbn07XG5cblZhbHVlUGxvdHRlci5wcm90b3R5cGUub25Hcm91cFNpemVDaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHdpZHRoID0gdGhpcy5fd3JhcE5vZGUuZ2V0V2lkdGgoKSxcbiAgICAgICAgaGVpZ2h0ID0gdGhpcy5faGVpZ2h0O1xuXG4gICAgdGhpcy5fc3ZnU2V0U2l6ZSh3aWR0aCwgaGVpZ2h0KTtcbiAgICB0aGlzLl91cGRhdGVIZWlnaHQoKTtcbiAgICB0aGlzLl9kcmF3R3JpZCgpO1xuICAgIHRoaXMuX3JlZHJhdygpO1xufTtcblxuVmFsdWVQbG90dGVyLnByb3RvdHlwZS5fZHJhd1ZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2RyYXdDdXJ2ZSgpO1xufTtcblxuVmFsdWVQbG90dGVyLnByb3RvdHlwZS5fZHJhd0dyaWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHN2ZyA9IHRoaXMuX3N2ZztcblxuICAgIHZhciBzdmdXaWR0aCA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKSxcbiAgICAgICAgc3ZnSGVpZ2h0SGFsZiA9IE1hdGguZmxvb3IoTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ2hlaWdodCcpKSAqIDAuNSk7XG5cbiAgICB2YXIgcGF0aENtZCA9ICcnO1xuICAgICAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRNb3ZlVG8oMCwgc3ZnSGVpZ2h0SGFsZik7XG4gICAgICAgIHBhdGhDbWQgKz0gdGhpcy5fcGF0aENtZExpbmVUbyhzdmdXaWR0aCwgc3ZnSGVpZ2h0SGFsZik7XG5cbiAgICB0aGlzLl9ncmlkLnNldEF0dHJpYnV0ZSgnZCcsIHBhdGhDbWQpO1xufTtcblxuLy9UT0RPOiBtZXJnZSB1cGRhdGUgKyBwYXRoY21kXG5WYWx1ZVBsb3R0ZXIucHJvdG90eXBlLl9kcmF3Q3VydmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHN2ZyA9IHRoaXMuX3N2ZztcblxuICAgIHZhciB2YWx1ZSA9IHRoaXMuX29ialt0aGlzLl9rZXldO1xuXG4gICAgdmFyIGJ1ZmZlcjAgPSB0aGlzLl9idWZmZXIwLFxuICAgICAgICBidWZmZXIxID0gdGhpcy5fYnVmZmVyMSxcbiAgICAgICAgcG9pbnRzID0gdGhpcy5fcG9pbnRzO1xuXG4gICAgdmFyIGJ1ZmZlckxlbmd0aCA9IGJ1ZmZlcjAubGVuZ3RoO1xuXG4gICAgdmFyIHBhdGhDbWQgPSAnJztcblxuICAgIHZhciBoZWlnaHRIYWxmID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ2hlaWdodCcpKSAqIDAuNSxcbiAgICAgICAgdW5pdCA9IGhlaWdodEhhbGYgLSB0aGlzLl9saW5lV2lkdGggKiAwLjU7XG5cbiAgICBwb2ludHNbMV0gPSBidWZmZXIwWzBdO1xuICAgIGJ1ZmZlcjBbYnVmZmVyTGVuZ3RoIC0gMV0gPSAodmFsdWUgKiB1bml0KSAqIC0xICsgTWF0aC5mbG9vcihoZWlnaHRIYWxmKTtcblxuICAgIHBhdGhDbWQgKz0gdGhpcy5fcGF0aENtZE1vdmVUbyhwb2ludHNbMF0sIHBvaW50c1sxXSk7XG5cbiAgICB2YXIgaSA9IDAsIGluZGV4O1xuXG4gICAgd2hpbGUgKCsraSA8IGJ1ZmZlckxlbmd0aCkge1xuICAgICAgICBpbmRleCA9IGkgKiAyO1xuXG4gICAgICAgIGJ1ZmZlcjFbaSAtIDFdID0gYnVmZmVyMFtpXTtcbiAgICAgICAgcG9pbnRzW2luZGV4ICsgMV0gPSBidWZmZXIwW2kgLSAxXSA9IGJ1ZmZlcjFbaSAtIDFdO1xuXG4gICAgICAgIHBhdGhDbWQgKz0gdGhpcy5fcGF0aENtZExpbmVUbyhwb2ludHNbaW5kZXhdLCBwb2ludHNbaW5kZXggKyAxXSk7XG4gICAgfVxuXG4gICAgdGhpcy5fcGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwYXRoQ21kKTtcbn07XG5cblZhbHVlUGxvdHRlci5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLl9wYXJlbnQuaXNEaXNhYmxlZCgpKXJldHVybjtcbiAgICB0aGlzLl9kcmF3VmFsdWUoKTtcbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IFZhbHVlUGxvdHRlcjtcblxuIiwidmFyIE5vZGUgPSByZXF1aXJlKCcuL2RvY3VtZW50L05vZGUnKSxcbiAgICBDU1MgPSByZXF1aXJlKCcuL2RvY3VtZW50L0NTUycpO1xudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4vZXZlbnQvRXZlbnREaXNwYXRjaGVyJyksXG4gICAgQ29tcG9uZW50RXZlbnQgID0gcmVxdWlyZSgnLi9Db21wb25lbnRFdmVudCcpO1xuXG5mdW5jdGlvbiBDb21wb25lbnQocGFyZW50LGxhYmVsKSB7XG4gICAgRXZlbnREaXNwYXRjaGVyLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuICAgIGxhYmVsID0gcGFyZW50LnVzZXNMYWJlbHMoKSA/IGxhYmVsIDogJ25vbmUnO1xuXG4gICAgdGhpcy5fcGFyZW50ICA9IHBhcmVudDtcbiAgICB0aGlzLl9lbmFibGVkID0gdHJ1ZTtcblxuICAgIHZhciByb290ID0gdGhpcy5fbm9kZSA9IG5ldyBOb2RlKE5vZGUuTElTVF9JVEVNKSxcbiAgICAgICAgd3JhcCA9IHRoaXMuX3dyYXBOb2RlID0gbmV3IE5vZGUoKTtcbiAgICAgICAgd3JhcC5zZXRTdHlsZUNsYXNzKENTUy5XcmFwKTtcbiAgICAgICAgcm9vdC5hZGRDaGlsZCh3cmFwKTtcblxuICAgIGlmIChsYWJlbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmIChsYWJlbC5sZW5ndGggIT0gMCAmJiBsYWJlbCAhPSAnbm9uZScpIHtcbiAgICAgICAgICAgIHZhciBsYWJlbF8gPSB0aGlzLl9sYWJsTm9kZSA9IG5ldyBOb2RlKE5vZGUuU1BBTik7XG4gICAgICAgICAgICAgICAgbGFiZWxfLnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKTtcbiAgICAgICAgICAgICAgICBsYWJlbF8uc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsIGxhYmVsKTtcbiAgICAgICAgICAgICAgICByb290LmFkZENoaWxkKGxhYmVsXyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobGFiZWwgPT0gJ25vbmUnKSB7XG4gICAgICAgICAgICB3cmFwLnNldFN0eWxlUHJvcGVydHkoJ21hcmdpbkxlZnQnLCAnMCcpO1xuICAgICAgICAgICAgd3JhcC5zZXRTdHlsZVByb3BlcnR5KCd3aWR0aCcsICcxMDAlJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihDb21wb25lbnRFdmVudC5FTkFCTEUsIHRoaXMsJ29uRW5hYmxlJyk7XG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoQ29tcG9uZW50RXZlbnQuRElTQUJMRSx0aGlzLCdvbkRpc2FibGUnKTtcbiAgICB0aGlzLl9wYXJlbnQuYWRkQ29tcG9uZW50Tm9kZShyb290KTtcbn1cbkNvbXBvbmVudC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUpO1xuQ29tcG9uZW50LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IENvbXBvbmVudDtcblxuQ29tcG9uZW50LnByb3RvdHlwZS5lbmFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fZW5hYmxlZCA9IHRydWU7XG59O1xuXG5Db21wb25lbnQucHJvdG90eXBlLmRpc2FibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fZW5hYmxlZCA9IGZhbHNlO1xufTtcblxuQ29tcG9uZW50LnByb3RvdHlwZS5pc0VuYWJsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2VuYWJsZWQ7XG59O1xuQ29tcG9uZW50LnByb3RvdHlwZS5pc0Rpc2FibGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAhdGhpcy5fZW5hYmxlZDtcbn07XG5cbkNvbXBvbmVudC5wcm90b3R5cGUub25FbmFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5lbmFibGUoKTtcbn07XG5cbkNvbXBvbmVudC5wcm90b3R5cGUub25EaXNhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzYWJsZSgpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7IiwidmFyIENvbXBvbmVudEV2ZW50ID0ge1xuXHRWQUxVRV9VUERBVEVEOiAndmFsdWVVcGRhdGVkJyxcblx0VVBEQVRFX1ZBTFVFOiAndXBkYXRlVmFsdWUnLFxuXG5cdElOUFVUX1NFTEVDVF9EUkFHOiAnaW5wdXRTZWxlY3REcmFnJyxcblxuXHRFTkFCTEUgIDogJ2VuYWJsZScsXG5cdERJU0FCTEUgOiAnZGlzYWJsZSdcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50RXZlbnQ7IiwiZnVuY3Rpb24gQ29tcG9uZW50T2JqZWN0RXJyb3Iob2JqZWN0LGtleSkge1xuXHRFcnJvci5hcHBseSh0aGlzKTtcblx0RXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcyxDb21wb25lbnRPYmplY3RFcnJvcik7XG5cdHRoaXMubmFtZSA9ICdDb21wb25lbnRPYmplY3RFcnJvcic7XG5cdHRoaXMubWVzc2FnZSA9ICdPYmplY3Qgb2YgdHlwZSAnICsgb2JqZWN0LmNvbnN0cnVjdG9yLm5hbWUgKyAnIGhhcyBubyBtZW1iZXIgJyArIGtleSArICcuJztcbn1cbkNvbXBvbmVudE9iamVjdEVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcbkNvbXBvbmVudE9iamVjdEVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IENvbXBvbmVudE9iamVjdEVycm9yO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvbmVudE9iamVjdEVycm9yOyIsInZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKCcuL2V2ZW50L0V2ZW50RGlzcGF0Y2hlcicpLFxuICAgIEV2ZW50XyA9IHJlcXVpcmUoJy4vZXZlbnQvRXZlbnQnKSxcbiAgICBIaXN0b3J5RXZlbnQgPSByZXF1aXJlKCcuL0hpc3RvcnlFdmVudCcpO1xuXG52YXIgTUFYX1NUQVRFUyA9IDMwO1xuXG5mdW5jdGlvbiBIaXN0b3J5KCkge1xuICAgIEV2ZW50RGlzcGF0Y2hlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIHRoaXMuX3N0YXRlcyA9IFtdO1xuICAgIHRoaXMuX2VuYWJsZWQgPSBmYWxzZTtcbn1cbkhpc3RvcnkucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudERpc3BhdGNoZXIucHJvdG90eXBlKTtcbkhpc3RvcnkucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gSGlzdG9yeTtcblxuSGlzdG9yeS5wcm90b3R5cGUucHVzaFN0YXRlID0gZnVuY3Rpb24gKG9iamVjdCwga2V5LCB2YWx1ZSkge1xuICAgIGlmICh0aGlzLl9lbmFibGVkKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG4gICAgaWYgKHN0YXRlcy5sZW5ndGggPj0gTUFYX1NUQVRFUyl7XG4gICAgICAgIHN0YXRlcy5zaGlmdCgpO1xuICAgIH1cbiAgICBzdGF0ZXMucHVzaCh7b2JqZWN0OiBvYmplY3QsIGtleToga2V5LCB2YWx1ZTogdmFsdWV9KTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBIaXN0b3J5RXZlbnQuU1RBVEVfUFVTSCwgbnVsbCkpO1xufTtcblxuSGlzdG9yeS5wcm90b3R5cGUuZ2V0U3RhdGUgPSBmdW5jdGlvbiAob2JqZWN0LCBrZXkpIHtcbiAgICB2YXIgc3RhdGVzID0gdGhpcy5fc3RhdGVzLFxuICAgICAgICBzdGF0ZXNMZW4gPSBzdGF0ZXMubGVuZ3RoO1xuXG4gICAgaWYgKHN0YXRlc0xlbiA9PSAwKXtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgdmFyIHN0YXRlLCB2YWx1ZTtcbiAgICB2YXIgaSA9IC0xO1xuICAgIHdoaWxlICgrK2kgPCBzdGF0ZXNMZW4pIHtcbiAgICAgICAgc3RhdGUgPSBzdGF0ZXNbaV07XG4gICAgICAgIGlmIChzdGF0ZS5vYmplY3QgPT09IG9iamVjdCkge1xuICAgICAgICAgICAgaWYgKHN0YXRlLmtleSA9PT0ga2V5KSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBzdGF0ZS52YWx1ZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdmFsdWU7XG59O1xuXG5IaXN0b3J5LnByb3RvdHlwZS5wb3BTdGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5fZW5hYmxlZCl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuICAgIGlmIChzdGF0ZXMubGVuZ3RoIDwgMSl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgbGFzdFN0YXRlID0gc3RhdGVzLnBvcCgpO1xuICAgIGxhc3RTdGF0ZS5vYmplY3RbbGFzdFN0YXRlLmtleV0gPSBsYXN0U3RhdGUudmFsdWU7XG5cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBIaXN0b3J5RXZlbnQuU1RBVEVfUE9QLCBudWxsKSk7XG59O1xuXG5IaXN0b3J5LnByb3RvdHlwZS5nZXROdW1TdGF0ZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3N0YXRlcy5sZW5ndGg7XG59O1xuXG5IaXN0b3J5Ll9pbnN0YW5jZSA9IG51bGw7XG5cbkhpc3Rvcnkuc2V0dXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIEhpc3RvcnkuX2luc3RhbmNlID0gbmV3IEhpc3RvcnkoKTtcbn07XG5cbkhpc3RvcnkuZ2V0ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBIaXN0b3J5Ll9pbnN0YW5jZTtcbn07XG5cbkhpc3RvcnkucHJvdG90eXBlLmVuYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9lbmFibGVkID0gZmFsc2U7XG59O1xuSGlzdG9yeS5wcm90b3R5cGUuZGlzYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9lbmFibGVkID0gdHJ1ZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSGlzdG9yeTsiLCJ2YXIgSGlzdG9yeUV2ZW50ID0ge1xuXHRTVEFURV9QVVNIOiAnaGlzdG9yeVN0YXRlUHVzaCcsXG5cdFNUQVRFX1BPUDogJ2hpc3RvcnlTdGF0ZVBvcCdcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSGlzdG9yeUV2ZW50OyIsInZhciBIaXN0b3J5ID0gcmVxdWlyZSgnLi9IaXN0b3J5Jyk7XG52YXIgQ29tcG9uZW50ID0gcmVxdWlyZSgnLi9Db21wb25lbnQnKSxcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4vQ29tcG9uZW50RXZlbnQnKSxcbiAgICBPYmplY3RDb21wb25lbnROb3RpZmllciA9IHJlcXVpcmUoJy4vT2JqZWN0Q29tcG9uZW50Tm90aWZpZXInKSxcbiAgICBDb21wb25lbnRPYmplY3RFcnJvciA9IHJlcXVpcmUoJy4vQ29tcG9uZW50T2JqZWN0RXJyb3InKTtcbnZhciBFdmVudF8gPSByZXF1aXJlKCcuL2V2ZW50L0V2ZW50Jyk7XG5cbmZ1bmN0aW9uIE9iamVjdENvbXBvbmVudChwYXJlbnQsIG9iaiwga2V5LCBwYXJhbXMpIHtcbiAgICBpZiAob2JqW2tleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aHJvdyBuZXcgQ29tcG9uZW50T2JqZWN0RXJyb3Iob2JqLCBrZXkpO1xuICAgIH1cbiAgICBwYXJhbXMgPSBwYXJhbXMgfHwge307XG4gICAgcGFyYW1zLmxhYmVsID0gcGFyYW1zLmxhYmVsIHx8IGtleTtcblxuICAgIENvbXBvbmVudC5hcHBseSh0aGlzLCBbcGFyZW50LCBwYXJhbXMubGFiZWxdKTtcblxuICAgIHRoaXMuX29iaiA9IG9iajtcbiAgICB0aGlzLl9rZXkgPSBrZXk7XG4gICAgdGhpcy5fb25DaGFuZ2UgPSBmdW5jdGlvbigpe307XG5cbiAgICBPYmplY3RDb21wb25lbnROb3RpZmllci5nZXQoKS5hZGRFdmVudExpc3RlbmVyKENvbXBvbmVudEV2ZW50LlVQREFURV9WQUxVRSwgdGhpcywgJ29uVmFsdWVVcGRhdGUnKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCwgT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIuZ2V0KCksICdvblZhbHVlVXBkYXRlZCcpO1xufVxuT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoQ29tcG9uZW50LnByb3RvdHlwZSk7XG5PYmplY3RDb21wb25lbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gT2JqZWN0Q29tcG9uZW50O1xuXG4vL092ZXJyaWRlIGluIFN1YmNsYXNzXG5PYmplY3RDb21wb25lbnQucHJvdG90eXBlLmFwcGx5VmFsdWUgPSBmdW5jdGlvbigpIHt9O1xuT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24gKGUpIHt9O1xuXG5PYmplY3RDb21wb25lbnQucHJvdG90eXBlLnB1c2hIaXN0b3J5U3RhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG9iaiA9IHRoaXMuX29iaiwga2V5ID0gdGhpcy5fa2V5O1xuICAgIEhpc3RvcnkuZ2V0KCkucHVzaFN0YXRlKG9iaiwga2V5LCBvYmpba2V5XSk7XG59O1xuXG5PYmplY3RDb21wb25lbnQucHJvdG90eXBlLnNldFZhbHVlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdGhpcy5fb2JqW3RoaXMuX2tleV0gPSB2YWx1ZTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsbnVsbCkpO1xufTtcblxuT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZS5nZXREYXRhID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgb2JqID0ge307XG4gICAgICAgIG9ialt0aGlzLl9rZXldID0gdGhpcy5fb2JqW3RoaXMuX2tleV07XG4gICAgcmV0dXJuIG9iajtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gT2JqZWN0Q29tcG9uZW50O1xuIiwidmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4vZXZlbnQvRXZlbnREaXNwYXRjaGVyJyksXG5cdEV2ZW50XyBcdFx0XHQ9IHJlcXVpcmUoJy4vZXZlbnQvRXZlbnQnKTtcbnZhciBDb21wb25lbnRFdmVudCAgPSByZXF1aXJlKCcuL0NvbXBvbmVudEV2ZW50JyksXG5cdE9wdGlvbkV2ZW50XHRcdD0gcmVxdWlyZSgnLi9PcHRpb25FdmVudCcpO1xuXG5mdW5jdGlvbiBPYmplY3RDb21wb25lbnROb3RpZmllcigpe1xuXHRFdmVudERpc3BhdGNoZXIuYXBwbHkodGhpcyk7XG59XG5PYmplY3RDb21wb25lbnROb3RpZmllci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUpO1xuT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gT2JqZWN0Q29tcG9uZW50Tm90aWZpZXI7XG5cbk9iamVjdENvbXBvbmVudE5vdGlmaWVyLnByb3RvdHlwZS5vblZhbHVlVXBkYXRlZCA9IGZ1bmN0aW9uIChlKSB7XG5cdHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlVQREFURV9WQUxVRSwge29yaWdpbjogZS5zZW5kZXJ9KSk7XG59O1xuXG5PYmplY3RDb21wb25lbnROb3RpZmllci5wcm90b3R5cGUub25PcHRpb25UcmlnZ2VyZWQgPSBmdW5jdGlvbihlKSB7XG5cdHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIE9wdGlvbkV2ZW50LlRSSUdHRVIsIHtvcmlnaW46IGUuc2VuZGVyfSkpO1xufTtcblxudmFyIGluc3RhbmNlID0gbnVsbDtcblxuT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIuZ2V0ID0gZnVuY3Rpb24oKXtcblx0aWYoIWluc3RhbmNlKXtcblx0XHRpbnN0YW5jZSA9IG5ldyBPYmplY3RDb21wb25lbnROb3RpZmllcigpO1xuXHR9XG5cdHJldHVybiBpbnN0YW5jZTtcbn07XG5cbk9iamVjdENvbXBvbmVudE5vdGlmaWVyLmRlc3Ryb3kgPSBmdW5jdGlvbigpe1xuXHRpbnN0YW5jZSA9IG51bGw7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE9iamVjdENvbXBvbmVudE5vdGlmaWVyOyIsInZhciBPcHRpb25FdmVudCA9IHtcblx0VFJJR0dFUkVEOiAnc2VsZWN0VHJpZ2dlcicsXG5cdFRSSUdHRVI6ICd0cmlnZ2VyU2VsZWN0J1xufTtcbm1vZHVsZS5leHBvcnRzID0gT3B0aW9uRXZlbnQ7IiwidmFyIERpYWxvZ1RlbXBsYXRlID1cbiAgICAnPGhlYWQ+XFxuJyArXG4gICAgJyAgIDx0aXRsZT5Db250cm9sS2l0IFN0YXRlPC90aXRsZT5cXG4nICtcbiAgICAnICAgPHN0eWxlIHR5cGU9XCJ0ZXh0L2Nzc1wiPlxcbicgK1xuICAgICcgICAgICBib2R5e1xcbicgK1xuICAgICcgICAgICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDtcXG4nICtcbiAgICAnICAgICAgICAgIHBhZGRpbmc6IDIwcHg7XFxuJyArXG4gICAgJyAgICAgICAgICBtYXJnaW46IDA7XFxuJyArXG4gICAgJyAgICAgICAgICBmb250LWZhbWlseTogQXJpYWwsIHNhbnMtc2VyaWY7XFxuJyArXG4gICAgJyAgICAgICAgICB3aWR0aDogMTAwJTtcXG4nICtcbiAgICAnICAgICAgfVxcbicgK1xuICAgICcgICAgICB0ZXh0YXJlYXtcXG4nICtcbiAgICAnICAgICAgICAgIG1hcmdpbi1ib3R0b206MTBweDtcXG4nICtcbiAgICAnICAgICAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XFxuJyArXG4gICAgJyAgICAgICAgICBwYWRkaW5nOiAwO1xcbicgK1xuICAgICcgICAgICAgICAgYm9yZGVyOiAwO1xcbicgK1xuICAgICcgICAgICAgICAgYm9yZGVyOiAxcHggc29saWQgI2RlZGVkZTtcXG4nICtcbiAgICAnICAgICAgICAgIG91dGxpbmU6IG5vbmU7XFxuJyArXG4gICAgJyAgICAgICAgICBmb250LWZhbWlseTogTW9uYWNvLCBtb25vc3BhY2U7XFxuJyArXG4gICAgJyAgICAgICAgICBmb250LXNpemU6IDExcHg7XFxuJyArXG4gICAgJyAgICAgICAgICByZXNpemU6IG5vbmU7XFxuJyArXG4gICAgJyAgICAgICAgICB3b3JkLXdyYXA6IGJyZWFrLXdvcmQ7XFxuJyArXG4gICAgJyAgICAgICAgICBkaXNwbGF5OiBibG9jaztcXG4nICtcbiAgICAnICAgICAgICAgIHdpZHRoOiAxMDAlO1xcbicgK1xuICAgICcgICAgICAgICAgb3ZlcmZsb3cteTogc2Nyb2xsO1xcbicgK1xuICAgICcgICAgICAgICAgaGVpZ2h0OiAxMjVweDtcXG4nICtcbiAgICAnICAgICAgfVxcbicgK1xuICAgICcgICAgICBidXR0b257XFxuJyArXG4gICAgJyAgICAgICAgICBtYXJnaW46IDA7XFxuJyArXG4gICAgJyAgICAgICAgICBwYWRkaW5nOiAwIDVweCAzcHggNXB4O1xcbicgK1xuICAgICcgICAgICAgICAgaGVpZ2h0OiAyMHB4O1xcbicgK1xuICAgICcgICAgICB9XFxuJytcbiAgICAnICAgICAgI3NhdmUsI2ZpbGVuYW1lLCNsb2Fke1xcbicgK1xuICAgICcgICAgICAgICAgZmxvYXQ6IHJpZ2h0O1xcbicgK1xuICAgICcgICAgICB9XFxuJyArXG4gICAgJyAgICAgIGlucHV0W3R5cGU9XCJ0ZXh0XCJde1xcbicgK1xuICAgICcgICAgICAgICAgbWFyZ2luOiAwO1xcbicgK1xuICAgICcgICAgICAgICAgcGFkZGluZzogMDtcXG4nICtcbiAgICAnICAgICAgICAgIHdpZHRoOiA0NSU7XFxuJyArXG4gICAgJyAgICAgICAgICBoZWlnaHQ6MjBweDtcXG4nICtcbiAgICAnICAgICAgfVxcbicrXG4gICAgJyAgIDwvc3R5bGU+XFxuJyArXG4gICAgJzwvaGVhZD5cXG4nICtcbiAgICAnPGJvZHk+XFxuJyArXG4gICAgJyAgIDx0ZXh0YXJlYSBuYW1lPVwic3RhdGVcIiBpZD1cInN0YXRlXCI+PC90ZXh0YXJlYT5cXG4nICtcbiAgICAnPC9ib2R5Pic7XG5cbnZhciBTYXZlRGlhbG9nVGVtcGxhdGUgPVxuICAgICc8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBpZD1cInNhdmVcIj5TYXZlPC9idXR0b24+XFxuJyArXG4gICAgJzxpbnB1dCB0eXBlPVwidGV4dFwiIGlkPVwiZmlsZW5hbWVcIiB2YWx1ZT1cImNrLXN0YXRlLmpzb25cIj48L2lucHV0Pic7XG5cbnZhciBMb2FkRGlhbG9nVGVtcGxhdGUgPVxuICAgICc8aW5wdXQgdHlwZT1cImZpbGVcIiBpZD1cImxvYWQtZGlza1wiPjwvYnV0dG9uPicgK1xuICAgICc8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBpZD1cImxvYWRcIj5Mb2FkPC9idXR0b24+JztcblxuZnVuY3Rpb24gY3JlYXRlV2luZG93KCl7XG4gICAgdmFyIHdpZHRoID0gMzIwLCBoZWlnaHQgPSAyMDA7XG4gICAgdmFyIHdpbmRvd18gPSB3aW5kb3cub3BlbignJywnJywnXFxcbiAgICAgICAgd2lkdGg9JyArIHdpZHRoICsgJyxcXFxuICAgICAgICBoZWlnaHQ9JyArIGhlaWdodCArICcsXFxcbiAgICAgICAgbGVmdD0nICsgKHdpbmRvdy5zY3JlZW5YICsgd2luZG93LmlubmVyV2lkdGggKiAwLjUgLSB3aWR0aCAqIDAuNSkgKyAnLFxcXG4gICAgICAgIHRvcD0nICsgKHdpbmRvdy5zY3JlZW5ZICsgd2luZG93LmlubmVySGVpZ2h0ICogMC41IC0gaGVpZ2h0ICogMC41KSArICcsXFxcbiAgICAgICAgbG9jYXRpb249MCxcXFxuICAgICAgICB0aXRsZWJhcj0wLFxcXG4gICAgICAgIHJlc2l6YWJsZT0wJyk7XG4gICAgd2luZG93Xy5kb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuaW5uZXJIVE1MID0gRGlhbG9nVGVtcGxhdGU7XG4gICAgcmV0dXJuIHdpbmRvd187XG59XG5cbmZ1bmN0aW9uIHNhdmUoZGF0YSl7XG4gICAgdmFyIHdpbmRvd18gPSBjcmVhdGVXaW5kb3coKTtcbiAgICB2YXIgZG9jdW1lbnRfID0gd2luZG93Xy5kb2N1bWVudDtcbiAgICAgICAgZG9jdW1lbnRfLmJvZHkuaW5uZXJIVE1MICs9IFNhdmVEaWFsb2dUZW1wbGF0ZTtcbiAgICAgICAgZG9jdW1lbnRfLmdldEVsZW1lbnRCeUlkKCdzYXZlJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAvL2xvZyAmIHNhdmUgaW4gbWFpbiB3aW5kb3dcbiAgICAgICAgICAgIHZhciBzdHIgID0gZG9jdW1lbnRfLmdldEVsZW1lbnRCeUlkKCdzdGF0ZScpLnZhbHVlLFxuICAgICAgICAgICAgICAgIGJsb2IgPSBuZXcgQmxvYihbc3RyXSx7dHlwZTonYXBwbGljYXRpb246anNvbid9KSxcbiAgICAgICAgICAgICAgICBuYW1lID0gZG9jdW1lbnRfLmdldEVsZW1lbnRCeUlkKCdmaWxlbmFtZScpLnZhbHVlO1xuICAgICAgICAgICAgdmFyIGEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gICAgICAgICAgICBhLmRvd25sb2FkID0gbmFtZTtcbiAgICAgICAgICAgIGlmKHdpbmRvdy53ZWJraXRVUkwpe1xuICAgICAgICAgICAgICAgIGEuaHJlZiA9IHdpbmRvdy53ZWJraXRVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhLmhyZWYgPSB3aW5kb3cuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICAgICAgICAgICAgICAgIGEuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgICAgICAgICAgICBhLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudF8uYm9keS5yZW1vdmVDaGlsZChhKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBkb2N1bWVudF8uYm9keS5hcHBlbmRDaGlsZChhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGEuY2xpY2soKTtcbiAgICAgICAgfSk7XG4gICAgZG9jdW1lbnRfLmdldEVsZW1lbnRCeUlkKCdzdGF0ZScpLmlubmVyVGV4dCA9IEpTT04uc3RyaW5naWZ5KGRhdGEpO1xufVxuXG5mdW5jdGlvbiBsb2FkKGNhbGxiYWNrKXtcbiAgICB2YXIgd2luZG93XyA9IGNyZWF0ZVdpbmRvdygpO1xuICAgIHZhciBkb2N1bWVudF8gPSB3aW5kb3dfLmRvY3VtZW50O1xuICAgICAgICBkb2N1bWVudF8uYm9keS5pbm5lckhUTUwgKz0gTG9hZERpYWxvZ1RlbXBsYXRlO1xuICAgIHZhciBpbnB1dCAgID0gZG9jdW1lbnRfLmdldEVsZW1lbnRCeUlkKCdzdGF0ZScpO1xuICAgIHZhciBidG5Mb2FkID0gZG9jdW1lbnRfLmdldEVsZW1lbnRCeUlkKCdsb2FkJyk7XG4gICAgICAgIGJ0bkxvYWQuZGlzYWJsZWQgPSB0cnVlO1xuXG4gICAgZnVuY3Rpb24gdmFsaWRhdGVJbnB1dCgpe1xuICAgICAgICB0cnl7XG4gICAgICAgICAgICB2YXIgb2JqID0gSlNPTi5wYXJzZShpbnB1dC52YWx1ZSk7XG4gICAgICAgICAgICBpZihvYmogJiYgdHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgb2JqICE9PSBudWxsKXtcbiAgICAgICAgICAgICAgICBidG5Mb2FkLmRpc2FibGVkID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgYnRuTG9hZC5kaXNhYmxlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpbnB1dC5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsZnVuY3Rpb24oKXtcbiAgICAgICAgdmFsaWRhdGVJbnB1dCgpO1xuICAgIH0pO1xuICAgIGRvY3VtZW50Xy5nZXRFbGVtZW50QnlJZCgnbG9hZCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxmdW5jdGlvbigpe1xuICAgICAgICB2YXIgc3RyID0gaW5wdXQudmFsdWU7XG4gICAgICAgIGNhbGxiYWNrKEpTT04ucGFyc2Uoc3RyKS5kYXRhKTtcbiAgICAgICAgd2luZG93Xy5jbG9zZSgpO1xuICAgIH0pO1xuICAgIHZhciBsb2FkRnJvbURpc2sgPSBkb2N1bWVudF8uZ2V0RWxlbWVudEJ5SWQoJ2xvYWQtZGlzaycpO1xuICAgICAgICBsb2FkRnJvbURpc2suYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJyxmdW5jdGlvbigpe1xuICAgICAgICAgICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgICAgICAgICByZWFkZXIuYWRkRXZlbnRMaXN0ZW5lcignbG9hZGVuZCcsZnVuY3Rpb24oZSl7XG4gICAgICAgICAgICAgICAgaW5wdXQudmFsdWUgPSBlLnRhcmdldC5yZXN1bHQ7XG4gICAgICAgICAgICAgICAgdmFsaWRhdGVJbnB1dCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZWFkZXIucmVhZEFzVGV4dChsb2FkRnJvbURpc2suZmlsZXNbMF0sJ3V0Zi04Jyk7XG4gICAgICAgIH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBsb2FkIDogbG9hZCxcbiAgICBzYXZlIDogc2F2ZVxufTsiLCJmdW5jdGlvbiBDb2xvckZvcm1hdEVycm9yKG1zZykge1xuXHRFcnJvci5hcHBseSh0aGlzKTtcblx0RXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcyxDb2xvckZvcm1hdEVycm9yKTtcblx0dGhpcy5uYW1lID0gJ0NvbG9yRm9ybWF0RXJyb3InO1xuXHR0aGlzLm1lc3NhZ2UgPSBtc2c7XG59XG5Db2xvckZvcm1hdEVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcbkNvbG9yRm9ybWF0RXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQ29sb3JGb3JtYXRFcnJvcjtcblxubW9kdWxlLmV4cG9ydHMgPSBDb2xvckZvcm1hdEVycm9yOyIsInZhciBDb2xvck1vZGUgPSB7XG5cdFJHQiAgOiAncmdiJyxcblx0SFNWICA6ICdoc3YnLFxuXHRIRVggIDogJ2hleCcsXG5cdFJHQmZ2OiAncmdiZnYnXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbG9yTW9kZTsiLCJ2YXIgQ29sb3JVdGlsID0ge1xuXHRIU1YyUkdCOiBmdW5jdGlvbiAoaHVlLCBzYXQsIHZhbCkge1xuXHRcdHZhciBtYXhfaHVlID0gMzYwLjAsXG5cdFx0XHRtYXhfc2F0ID0gMTAwLjAsXG5cdFx0XHRtYXhfdmFsID0gMTAwLjA7XG5cblx0XHR2YXIgbWluX2h1ZSA9IDAuMCxcblx0XHRcdG1pbl9zYXQgPSAwLFxuXHRcdFx0bWluX3ZhbCA9IDA7XG5cblx0XHRodWUgPSBodWUgJSBtYXhfaHVlO1xuXHRcdHZhbCA9IE1hdGgubWF4KG1pbl92YWwsIE1hdGgubWluKHZhbCwgbWF4X3ZhbCkpIC8gbWF4X3ZhbCAqIDI1NS4wO1xuXG5cdFx0aWYgKHNhdCA8PSBtaW5fc2F0KSB7XG5cdFx0XHR2YWwgPSBNYXRoLnJvdW5kKHZhbCk7XG5cdFx0XHRyZXR1cm4gW3ZhbCwgdmFsLCB2YWxdO1xuXHRcdH1cblx0XHRlbHNlIGlmIChzYXQgPiBtYXhfc2F0KXNhdCA9IG1heF9zYXQ7XG5cblx0XHRzYXQgPSBzYXQgLyBtYXhfc2F0O1xuXG5cdFx0Ly9odHRwOi8vZC5oYXRlbmEubmUuanAvamE5LzIwMTAwOTAzLzEyODM1MDQzNFxuXG5cdFx0dmFyIGhpID0gTWF0aC5mbG9vcihodWUgLyA2MC4wKSAlIDYsXG5cdFx0XHRmID0gKGh1ZSAvIDYwLjApIC0gaGksXG5cdFx0XHRwID0gdmFsICogKDEgLSBzYXQpLFxuXHRcdFx0cSA9IHZhbCAqICgxIC0gZiAqIHNhdCksXG5cdFx0XHR0ID0gdmFsICogKDEgLSAoMSAtIGYpICogc2F0KTtcblxuXHRcdHZhciByID0gMCxcblx0XHRcdGcgPSAwLFxuXHRcdFx0YiA9IDA7XG5cblx0XHRzd2l0Y2ggKGhpKSB7XG5cdFx0XHRjYXNlIDA6XG5cdFx0XHRcdHIgPSB2YWw7XG5cdFx0XHRcdGcgPSB0O1xuXHRcdFx0XHRiID0gcDtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIDE6XG5cdFx0XHRcdHIgPSBxO1xuXHRcdFx0XHRnID0gdmFsO1xuXHRcdFx0XHRiID0gcDtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIDI6XG5cdFx0XHRcdHIgPSBwO1xuXHRcdFx0XHRnID0gdmFsO1xuXHRcdFx0XHRiID0gdDtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIDM6XG5cdFx0XHRcdHIgPSBwO1xuXHRcdFx0XHRnID0gcTtcblx0XHRcdFx0YiA9IHZhbDtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIDQ6XG5cdFx0XHRcdHIgPSB0O1xuXHRcdFx0XHRnID0gcDtcblx0XHRcdFx0YiA9IHZhbDtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIDU6XG5cdFx0XHRcdHIgPSB2YWw7XG5cdFx0XHRcdGcgPSBwO1xuXHRcdFx0XHRiID0gcTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRicmVhaztcblx0XHR9XG5cblx0XHRyID0gTWF0aC5yb3VuZChyKTtcblx0XHRnID0gTWF0aC5yb3VuZChnKTtcblx0XHRiID0gTWF0aC5yb3VuZChiKTtcblxuXHRcdHJldHVybiBbciwgZywgYl07XG5cblx0fSxcblxuXHRSR0IySFNWOiBmdW5jdGlvbiAociwgZywgYikge1xuXHRcdHZhciBoID0gMCxcblx0XHRcdHMgPSAwLFxuXHRcdFx0diA9IDA7XG5cblx0XHRyID0gciAvIDI1NS4wO1xuXHRcdGcgPSBnIC8gMjU1LjA7XG5cdFx0YiA9IGIgLyAyNTUuMDtcblxuXHRcdHZhciBtaW5SR0IgPSBNYXRoLm1pbihyLCBNYXRoLm1pbihnLCBiKSksXG5cdFx0XHRtYXhSR0IgPSBNYXRoLm1heChyLCBNYXRoLm1heChnLCBiKSk7XG5cblx0XHRpZiAobWluUkdCID09IG1heFJHQikge1xuXHRcdFx0diA9IG1pblJHQjtcblx0XHRcdHJldHVybiBbMCwgMCwgTWF0aC5yb3VuZCh2KV07XG5cdFx0fVxuXG5cdFx0dmFyIGRkID0gKHIgPT0gbWluUkdCKSA/IGcgLSBiIDogKChiID09IG1pblJHQikgPyByIC0gZyA6IGIgLSByKSxcblx0XHRcdGhoID0gKHIgPT0gbWluUkdCKSA/IDMgOiAoKGIgPT0gbWluUkdCKSA/IDEgOiA1KTtcblxuXHRcdGggPSBNYXRoLnJvdW5kKDYwICogKGhoIC0gZGQgLyAobWF4UkdCIC0gbWluUkdCKSkpO1xuXHRcdHMgPSBNYXRoLnJvdW5kKChtYXhSR0IgLSBtaW5SR0IpIC8gbWF4UkdCICogMTAwLjApO1xuXHRcdHYgPSBNYXRoLnJvdW5kKG1heFJHQiAqIDEwMC4wKTtcblxuXHRcdHJldHVybiBbaCwgcywgdl07XG5cdH0sXG5cblx0UkdCMkhFWDogZnVuY3Rpb24gKHIsIGcsIGIpIHtcblx0XHRyZXR1cm4gXCIjXCIgKyAoKDEgPDwgMjQpICsgKHIgPDwgMTYpICsgKGcgPDwgOCkgKyBiKS50b1N0cmluZygxNikuc2xpY2UoMSk7XG5cdH0sXG5cblx0UkdCZnYySEVYOiBmdW5jdGlvbiAociwgZywgYikge1xuXHRcdHJldHVybiBDb2xvclV0aWwuUkdCMkhFWChNYXRoLmZsb29yKHIgKiAyNTUuMCksXG5cdFx0XHRNYXRoLmZsb29yKGcgKiAyNTUuMCksXG5cdFx0XHRNYXRoLmZsb29yKGIgKiAyNTUuMCkpO1xuXHR9LFxuXG5cdEhTVjJIRVg6IGZ1bmN0aW9uIChoLCBzLCB2KSB7XG5cdFx0dmFyIHJnYiA9IENvbnRyb2xLaXQuQ29sb3JVdGlsLkhTVjJSR0IoaCwgcywgdik7XG5cdFx0cmV0dXJuIENvbnRyb2xLaXQuQ29sb3JVdGlsLlJHQjJIRVgocmdiWzBdLCByZ2JbMV0sIHJnYlsyXSk7XG5cdH0sXG5cblx0SEVYMlJHQjogZnVuY3Rpb24gKGhleCkge1xuXHRcdHZhciBzaG9ydGhhbmRSZWdleCA9IC9eIz8oW2EtZlxcZF0pKFthLWZcXGRdKShbYS1mXFxkXSkkL2k7XG5cdFx0aGV4ID0gaGV4LnJlcGxhY2Uoc2hvcnRoYW5kUmVnZXgsIGZ1bmN0aW9uIChtLCByLCBnLCBiKSB7XG5cdFx0XHRyZXR1cm4gciArIHIgKyBnICsgZyArIGIgKyBiO1xuXHRcdH0pO1xuXG5cdFx0dmFyIHJlc3VsdCA9IC9eIz8oW2EtZlxcZF17Mn0pKFthLWZcXGRdezJ9KShbYS1mXFxkXXsyfSkkL2kuZXhlYyhoZXgpO1xuXHRcdHJldHVybiByZXN1bHQgPyBbcGFyc2VJbnQocmVzdWx0WzFdLCAxNiksIHBhcnNlSW50KHJlc3VsdFsyXSwgMTYpLCBwYXJzZUludChyZXN1bHRbM10sIDE2KV0gOiBudWxsO1xuXG5cdH0sXG5cblx0aXNWYWxpZEhFWDogZnVuY3Rpb24gKGhleCkge1xuXHRcdHJldHVybiAvXiNbMC05QS1GXXs2fSQvaS50ZXN0KGhleCk7XG5cdH0sXG5cblx0aXNWYWxpZFJHQjogZnVuY3Rpb24gKHIsIGcsIGIpIHtcblx0XHRyZXR1cm4gciA+PSAwICYmIHIgPD0gMjU1ICYmXG5cdFx0XHRnID49IDAgJiYgZyA8PSAyNTUgJiZcblx0XHRcdGIgPj0gMCAmJiBiIDw9IDI1NTtcblx0fSxcblxuXHRpc1ZhbGlkUkdCZnY6IGZ1bmN0aW9uIChyLCBnLCBiKSB7XG5cdFx0cmV0dXJuIHIgPj0gMCAmJiByIDw9IDEuMCAmJlxuXHRcdFx0ZyA+PSAwICYmIGcgPD0gMS4wICYmXG5cdFx0XHRiID49IDAgJiYgYiA8PSAxLjA7XG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29sb3JVdGlsOyIsInZhciBDU1MgPSB7XG4gICAgQ29udHJvbEtpdDogJ2NvbnRyb2xLaXQnLFxuXG4gICAgUGFuZWw6ICdwYW5lbCcsXG4gICAgSGVhZDogJ2hlYWQnLFxuICAgIExhYmVsOiAnbGFiZWwnLFxuICAgIE1lbnU6ICdtZW51JyxcbiAgICBXcmFwOiAnd3JhcCcsXG5cbiAgICBCdXR0b25NZW51Q2xvc2U6ICdidXR0b24tbWVudS1jbG9zZScsXG4gICAgQnV0dG9uTWVudUhpZGU6ICdidXR0b24tbWVudS1oaWRlJyxcbiAgICBCdXR0b25NZW51U2hvdzogJ2J1dHRvbi1tZW51LXNob3cnLFxuICAgIEJ1dHRvbk1lbnVVbmRvOiAnYnV0dG9uLW1lbnUtdW5kbycsXG4gICAgQnV0dG9uTWVudUxvYWQ6ICdidXR0b24tbWVudS1sb2FkJyxcbiAgICBCdXR0b25NZW51U2F2ZTogJ2J1dHRvbi1tZW51LXNhdmUnLFxuICAgIE1lbnVBY3RpdmU6ICdtZW51LWFjdGl2ZScsXG5cbiAgICBCdXR0b246ICdidXR0b24nLFxuICAgIEJ1dHRvblByZXNldDogJ2J1dHRvbi1wcmVzZXQnLFxuICAgIEJ1dHRvblByZXNldEFjdGl2ZTogJ2J1dHRvbi1wcmVzZXQtYWN0aXZlJyxcblxuICAgIFdyYXBJbnB1dFdQcmVzZXQ6ICdpbnB1dC13aXRoLXByZXNldC13cmFwJyxcbiAgICBXcmFwQ29sb3JXUHJlc2V0OiAnY29sb3Itd2l0aC1wcmVzZXQtd3JhcCcsXG5cbiAgICBIZWFkSW5hY3RpdmU6ICdoZWFkLWluYWN0aXZlJyxcbiAgICBQYW5lbEhlYWRJbmFjdGl2ZTogJ3BhbmVsLWhlYWQtaW5hY3RpdmUnLFxuXG4gICAgR3JvdXBMaXN0OiAnZ3JvdXAtbGlzdCcsXG4gICAgR3JvdXA6ICdncm91cCcsXG4gICAgU3ViR3JvdXBMaXN0OiAnc3ViLWdyb3VwLWxpc3QnLFxuICAgIFN1Ykdyb3VwOiAnc3ViLWdyb3VwJyxcblxuXG4gICAgVGV4dEFyZWFXcmFwOiAndGV4dGFyZWEtd3JhcCcsXG5cbiAgICBXcmFwU2xpZGVyOiAnd3JhcC1zbGlkZXInLFxuICAgIFNsaWRlcldyYXA6ICdzbGlkZXItd3JhcCcsXG4gICAgU2xpZGVyU2xvdDogJ3NsaWRlci1zbG90JyxcbiAgICBTbGlkZXJIYW5kbGU6ICdzbGlkZXItaGFuZGxlJyxcblxuICAgIEFycm93Qk1pbjogJ2Fycm93LWItbWluJyxcbiAgICBBcnJvd0JNYXg6ICdhcnJvdy1iLW1heCcsXG4gICAgQXJyb3dCU3ViTWluOiAnYXJyb3ctYi1zdWItbWluJyxcbiAgICBBcnJvd0JTdWJNYXg6ICdhcnJvdy1iLXN1Yi1tYXgnLFxuICAgIEFycm93U01pbjogJ2Fycm93LXMtbWluJyxcbiAgICBBcnJvd1NNYXg6ICdhcnJvdy1zLW1heCcsXG5cbiAgICBTZWxlY3Q6ICdzZWxlY3QnLFxuICAgIFNlbGVjdEFjdGl2ZTogJ3NlbGVjdC1hY3RpdmUnLFxuXG4gICAgT3B0aW9uczogJ29wdGlvbnMnLFxuICAgIE9wdGlvbnNTZWxlY3RlZDogJ2xpLXNlbGVjdGVkJyxcblxuICAgIENhbnZhc0xpc3RJdGVtOiAnY2FudmFzLWxpc3QtaXRlbScsXG4gICAgQ2FudmFzV3JhcDogJ2NhbnZhcy13cmFwJyxcblxuICAgIFNWR0xpc3RJdGVtOiAnc3ZnLWxpc3QtaXRlbScsXG4gICAgU1ZHV3JhcDogJ3N2Zy13cmFwJyxcblxuICAgIEdyYXBoU2xpZGVyWFdyYXA6ICdncmFwaC1zbGlkZXIteC13cmFwJyxcbiAgICBHcmFwaFNsaWRlcllXcmFwOiAnZ3JhcGgtc2xpZGVyLXktd3JhcCcsXG4gICAgR3JhcGhTbGlkZXJYOiAnZ3JhcGgtc2xpZGVyLXgnLFxuICAgIEdyYXBoU2xpZGVyWTogJ2dyYXBoLXNsaWRlci15JyxcbiAgICBHcmFwaFNsaWRlclhIYW5kbGU6ICdncmFwaC1zbGlkZXIteC1oYW5kbGUnLFxuICAgIEdyYXBoU2xpZGVyWUhhbmRsZTogJ2dyYXBoLXNsaWRlci15LWhhbmRsZScsXG5cbiAgICBQaWNrZXI6ICdwaWNrZXInLFxuICAgIFBpY2tlckZpZWxkV3JhcDogJ2ZpZWxkLXdyYXAnLFxuICAgIFBpY2tlcklucHV0V3JhcDogJ2lucHV0LXdyYXAnLFxuICAgIFBpY2tlcklucHV0RmllbGQ6ICdpbnB1dC1maWVsZCcsXG4gICAgUGlja2VyQ29udHJvbHNXcmFwOiAnY29udHJvbHMtd3JhcCcsXG4gICAgUGlja2VyQ29sb3JDb250cmFzdDogJ2NvbG9yLWNvbnRyYXN0JyxcbiAgICBQaWNrZXJIYW5kbGVGaWVsZDogJ2luZGljYXRvcicsXG4gICAgUGlja2VySGFuZGxlU2xpZGVyOiAnaW5kaWNhdG9yJyxcblxuICAgIENvbG9yOiAnY29sb3InLFxuXG4gICAgU2Nyb2xsQmFyOiAnc2Nyb2xsQmFyJyxcbiAgICBTY3JvbGxXcmFwOiAnc2Nyb2xsLXdyYXAnLFxuICAgIFNjcm9sbEJhckJ0blVwOiAnYnRuVXAnLFxuICAgIFNjcm9sbEJhckJ0bkRvd246ICdidG5Eb3duJyxcbiAgICBTY3JvbGxCYXJUcmFjazogJ3RyYWNrJyxcbiAgICBTY3JvbGxCYXJUaHVtYjogJ3RodW1iJyxcbiAgICBTY3JvbGxCdWZmZXI6ICdzY3JvbGwtYnVmZmVyJyxcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ1NTO1xuIiwidmFyIERvY3VtZW50RXZlbnQgPSB7XG4gICAgTU9VU0VfTU9WRTogJ21vdXNlbW92ZScsXG4gICAgTU9VU0VfVVA6ICdtb3VzZXVwJyxcbiAgICBNT1VTRV9ET1dOOiAnbW91c2Vkb3duJyxcbiAgICBNT1VTRV9XSEVFTDogJ21vdXNld2hlZWwnLFxuICAgIFdJTkRPV19SRVNJWkU6ICdyZXNpemUnXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IERvY3VtZW50RXZlbnQ7IiwidmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4uL2V2ZW50L0V2ZW50RGlzcGF0Y2hlcicpLFxuICAgIEV2ZW50XyA9IHJlcXVpcmUoJy4uL2V2ZW50L0V2ZW50JyksXG4gICAgRG9jdW1lbnRFdmVudCA9IHJlcXVpcmUoJy4vRG9jdW1lbnRFdmVudCcpO1xudmFyIGluc3RhbmNlID0gbnVsbDtcblxuZnVuY3Rpb24gTW91c2UoKSB7XG4gICAgRXZlbnREaXNwYXRjaGVyLmFwcGx5KHRoaXMpO1xuICAgIHRoaXMuX3BvcyA9IFswLDBdO1xuICAgIHRoaXMuX3doZWVsRGlyZWN0aW9uID0gMDtcbiAgICB0aGlzLl9ob3ZlckVsZW1lbnQgPSBudWxsO1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuX29uRG9jdW1lbnRNb3VzZU1vdmUgPSBmdW5jdGlvbihlKXtcbiAgICAgICAgdmFyIGR4ID0gMCxcbiAgICAgICAgICAgIGR5ID0gMDtcblxuICAgICAgICBpZiAoIWUpZSA9IHdpbmRvdy5ldmVudDtcbiAgICAgICAgaWYgKGUucGFnZVgpIHtcbiAgICAgICAgICAgIGR4ID0gZS5wYWdlWDtcbiAgICAgICAgICAgIGR5ID0gZS5wYWdlWTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChlLmNsaWVudFgpIHtcbiAgICAgICAgICAgIGR4ID0gZS5jbGllbnRYICsgZG9jdW1lbnQuYm9keS5zY3JvbGxMZWZ0ICsgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbExlZnQ7XG4gICAgICAgICAgICBkeSA9IGUuY2xpZW50WSArIGRvY3VtZW50LmJvZHkuc2Nyb2xsVG9wICsgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcDtcbiAgICAgICAgfVxuICAgICAgICBzZWxmLl9wb3NbMF0gPSBkeDtcbiAgICAgICAgc2VsZi5fcG9zWzFdID0gZHk7XG5cbiAgICAgICAgc2VsZi5faG92ZXJFbGVtZW50ID0gZG9jdW1lbnQuZWxlbWVudEZyb21Qb2ludChkeCxkeSk7XG4gICAgfTtcblxuICAgIHRoaXMuX29uRG9jdW1lbnRNb3VzZVdoZWVsID0gZnVuY3Rpb24oZXZlbnQpe1xuICAgICAgICBzZWxmLl93aGVlbERpcmVjdGlvbiA9IChldmVudC5kZXRhaWwgPCAwKSA/IDEgOiAoZXZlbnQud2hlZWxEZWx0YSA+IDApID8gMSA6IC0xO1xuICAgICAgICBzZWxmLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50XyhzZWxmLERvY3VtZW50RXZlbnQuTU9VU0VfV0hFRUwsZXZlbnQpKTtcbiAgICB9O1xuXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsIHRoaXMuX29uRG9jdW1lbnRNb3VzZU1vdmUpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9XSEVFTCx0aGlzLl9vbkRvY3VtZW50TW91c2VXaGVlbCk7XG59XG5Nb3VzZS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUpO1xuTW91c2UucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gTW91c2U7XG5cbk1vdXNlLnByb3RvdHlwZS5fcmVtb3ZlRG9jdW1lbnRMaXN0ZW5lciA9IGZ1bmN0aW9uKCl7XG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsIHRoaXMuX29uRG9jdW1lbnRNb3VzZU1vdmUpO1xuICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9XSEVFTCx0aGlzLl9vbkRvY3VtZW50TW91c2VXaGVlbCk7XG59O1xuXG5Nb3VzZS5wcm90b3R5cGUuZ2V0UG9zaXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3Bvcztcbn07XG5cbk1vdXNlLnByb3RvdHlwZS5nZXRYID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9wb3NbMF07XG59O1xuXG5Nb3VzZS5wcm90b3R5cGUuZ2V0WSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fcG9zWzFdO1xufTtcblxuTW91c2UucHJvdG90eXBlLmdldFdoZWVsRGlyZWN0aW9uID0gZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gdGhpcy5fd2hlZWxEaXJlY3Rpb247XG59O1xuXG5Nb3VzZS5wcm90b3R5cGUuZ2V0SG92ZXJFbGVtZW50ID0gZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gdGhpcy5faG92ZXJFbGVtZW50O1xufTtcblxuTW91c2Uuc2V0dXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgaW5zdGFuY2UgPSBpbnN0YW5jZSB8fCBuZXcgTW91c2UoKTtcbiAgICByZXR1cm4gaW5zdGFuY2U7XG59O1xuXG5Nb3VzZS5nZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGluc3RhbmNlO1xufTtcblxuTW91c2UuZGVzdHJveSA9IGZ1bmN0aW9uKCl7XG4gICAgaW5zdGFuY2UuX3JlbW92ZURvY3VtZW50TGlzdGVuZXIoKTtcbiAgICBpbnN0YW5jZSA9IG51bGw7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1vdXNlOyIsImZ1bmN0aW9uIE5vZGUoKSB7XG4gICAgdGhpcy5fZWxlbWVudCA9IG51bGw7XG5cbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpe1xuICAgICAgICBjYXNlIDEgOlxuICAgICAgICAgICAgdmFyIGFyZyA9IGFyZ3VtZW50c1swXTtcbiAgICAgICAgICAgIGlmIChhcmcgIT0gTm9kZS5JTlBVVF9URVhUICYmXG4gICAgICAgICAgICAgICAgYXJnICE9IE5vZGUuSU5QVVRfQlVUVE9OICYmXG4gICAgICAgICAgICAgICAgYXJnICE9IE5vZGUuSU5QVVRfU0VMRUNUICYmXG4gICAgICAgICAgICAgICAgYXJnICE9IE5vZGUuSU5QVVRfQ0hFQ0tCT1gpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChhcmcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gICAgICAgICAgICAgICAgdGhpcy5fZWxlbWVudC50eXBlID0gYXJnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgIHRoaXMuX2VsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH1cbn1cblxuTm9kZS5ESVYgICAgICAgICAgICA9ICdkaXYnO1xuTm9kZS5JTlBVVF9URVhUICAgICA9ICd0ZXh0Jztcbk5vZGUuSU5QVVRfQlVUVE9OICAgPSAnYnV0dG9uJztcbk5vZGUuSU5QVVRfU0VMRUNUICAgPSAnc2VsZWN0Jztcbk5vZGUuSU5QVVRfQ0hFQ0tCT1ggPSAnY2hlY2tib3gnO1xuTm9kZS5PUFRJT04gICAgICAgICA9ICdvcHRpb24nO1xuTm9kZS5MSVNUICAgICAgICAgICA9ICd1bCc7XG5Ob2RlLkxJU1RfSVRFTSAgICAgID0gJ2xpJztcbk5vZGUuU1BBTiAgICAgICAgICAgPSAnc3Bhbic7XG5Ob2RlLlRFWFRBUkVBICAgICAgID0gJ3RleHRhcmVhJztcblxuTm9kZS5wcm90b3R5cGUgPSB7XG4gICAgYWRkQ2hpbGQ6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQuYXBwZW5kQ2hpbGQobm9kZS5nZXRFbGVtZW50KCkpO1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9LFxuXG4gICAgYWRkQ2hpbGRyZW46IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGkgPSAtMSwgbCA9IGFyZ3VtZW50cy5sZW5ndGgsIGUgPSB0aGlzLl9lbGVtZW50O1xuICAgICAgICB3aGlsZSAoKytpIDwgbCkge1xuICAgICAgICAgICAgZS5hcHBlbmRDaGlsZChhcmd1bWVudHNbaV0uZ2V0RWxlbWVudCgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgYWRkQ2hpbGRBdDogZnVuY3Rpb24gKG5vZGUsIGluZGV4KSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQuaW5zZXJ0QmVmb3JlKG5vZGUuZ2V0RWxlbWVudCgpLCB0aGlzLl9lbGVtZW50LmNoaWxkcmVuW2luZGV4XSk7XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgIH0sXG5cbiAgICByZW1vdmVDaGlsZDogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgaWYgKCF0aGlzLmNvbnRhaW5zKG5vZGUpKXJldHVybiBudWxsO1xuICAgICAgICB0aGlzLl9lbGVtZW50LnJlbW92ZUNoaWxkKG5vZGUuZ2V0RWxlbWVudCgpKTtcbiAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfSxcblxuICAgIHJlbW92ZUNoaWxkcmVuOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBpID0gLTEsIGwgPSBhcmd1bWVudHMubGVuZ3RoLCBlID0gdGhpcy5fZWxlbWVudDtcbiAgICAgICAgd2hpbGUgKCsraSA8IGwpIHtcbiAgICAgICAgICAgIGUucmVtb3ZlQ2hpbGQoYXJndW1lbnRzW2ldLmdldEVsZW1lbnQoKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIHJlbW92ZUNoaWxkQXQ6IGZ1bmN0aW9uIChub2RlLCBpbmRleCkge1xuICAgICAgICBpZiAoIXRoaXMuY29udGFpbnMobm9kZSkpcmV0dXJuIG51bGw7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQucmVtb3ZlQ2hpbGQobm9kZS5nZXRFbGVtZW50KCkpO1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9LFxuXG4gICAgcmVtb3ZlQWxsQ2hpbGRyZW46IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGVsZW1lbnQgPSB0aGlzLl9lbGVtZW50O1xuICAgICAgICB3aGlsZSAoZWxlbWVudC5oYXNDaGlsZE5vZGVzKCkpZWxlbWVudC5yZW1vdmVDaGlsZChlbGVtZW50Lmxhc3RDaGlsZCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBzZXRXaWR0aDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGUud2lkdGggPSB2YWx1ZSArICdweCc7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgZ2V0V2lkdGg6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VsZW1lbnQub2Zmc2V0V2lkdGg7XG4gICAgfSxcblxuICAgIHNldEhlaWdodDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gdmFsdWUgKyAncHgnO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGdldEhlaWdodDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZWxlbWVudC5vZmZzZXRIZWlnaHQ7XG4gICAgfSxcblxuICAgIHNldFBvc2l0aW9uOiBmdW5jdGlvbiAoeCwgeSkge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXRQb3NpdGlvbih4KS5zZXRQb3NpdGlvbih5KTtcbiAgICB9LFxuICAgIHNldFBvc2l0aW9uWDogZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZS5tYXJnaW5MZWZ0ID0geCArICdweCc7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgc2V0UG9zaXRpb25ZOiBmdW5jdGlvbiAoeSkge1xuICAgICAgICB0aGlzLl9lbGVtZW50LnN0eWxlLm1hcmdpblRvcCA9IHkgKyAncHgnO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgc2V0UG9zaXRpb25HbG9iYWw6IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldFBvc2l0aW9uR2xvYmFsWCh4KS5zZXRQb3NpdGlvbkdsb2JhbFkoeSk7XG4gICAgfSxcbiAgICBzZXRQb3NpdGlvbkdsb2JhbFg6IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGUubGVmdCA9IHggKyAncHgnO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHNldFBvc2l0aW9uR2xvYmFsWTogZnVuY3Rpb24gKHkpIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZS50b3AgPSB5ICsgJ3B4JztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIGdldFBvc2l0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBbdGhpcy5nZXRQb3NpdGlvblgoKSwgdGhpcy5nZXRQb3NpdGlvblkoKV07XG4gICAgfSxcbiAgICBnZXRQb3NpdGlvblg6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VsZW1lbnQub2Zmc2V0TGVmdDtcbiAgICB9LFxuICAgIGdldFBvc2l0aW9uWTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZWxlbWVudC5vZmZzZXRUb3A7XG4gICAgfSxcblxuICAgIGdldFBvc2l0aW9uR2xvYmFsOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBvZmZzZXQgPSBbMCwgMF0sXG4gICAgICAgICAgICBlbGVtZW50ID0gdGhpcy5fZWxlbWVudDtcblxuICAgICAgICB3aGlsZSAoZWxlbWVudCkge1xuICAgICAgICAgICAgb2Zmc2V0WzBdICs9IGVsZW1lbnQub2Zmc2V0TGVmdDtcbiAgICAgICAgICAgIG9mZnNldFsxXSArPSBlbGVtZW50Lm9mZnNldFRvcDtcbiAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50Lm9mZnNldFBhcmVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBvZmZzZXQ7XG4gICAgfSxcblxuICAgIGdldFBvc2l0aW9uR2xvYmFsWDogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgb2Zmc2V0ID0gMCxcbiAgICAgICAgICAgIGVsZW1lbnQgPSB0aGlzLl9lbGVtZW50O1xuXG4gICAgICAgIHdoaWxlIChlbGVtZW50KSB7XG4gICAgICAgICAgICBvZmZzZXQgKz0gZWxlbWVudC5vZmZzZXRMZWZ0O1xuICAgICAgICAgICAgZWxlbWVudCA9IGVsZW1lbnQub2Zmc2V0UGFyZW50O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG9mZnNldDtcbiAgICB9LFxuXG4gICAgZ2V0UG9zaXRpb25HbG9iYWxZOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBvZmZzZXQgPSAwLFxuICAgICAgICAgICAgZWxlbWVudCA9IHRoaXMuX2VsZW1lbnQ7XG5cbiAgICAgICAgd2hpbGUgKGVsZW1lbnQpIHtcbiAgICAgICAgICAgIG9mZnNldCArPSBlbGVtZW50Lm9mZnNldFRvcDtcbiAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50Lm9mZnNldFBhcmVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBvZmZzZXQ7XG4gICAgfSxcblxuICAgIGFkZEV2ZW50TGlzdGVuZXI6IGZ1bmN0aW9uICh0eXBlLCBsaXN0ZW5lciwgdXNlQ2FwdHVyZSkge1xuICAgICAgICB0aGlzLl9lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgbGlzdGVuZXIsIHVzZUNhcHR1cmUpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHJlbW92ZUV2ZW50TGlzdGVuZXI6IGZ1bmN0aW9uICh0eXBlLCBsaXN0ZW5lciwgdXNlQ2FwdHVyZSkge1xuICAgICAgICB0aGlzLl9lbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgbGlzdGVuZXIsIHVzZUNhcHR1cmUpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgc2V0U3R5bGVDbGFzczogZnVuY3Rpb24gKHN0eWxlKSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQuY2xhc3NOYW1lID0gc3R5bGU7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgc2V0U3R5bGVQcm9wZXJ0eTogZnVuY3Rpb24gKHByb3BlcnR5LCB2YWx1ZSkge1xuICAgICAgICB0aGlzLl9lbGVtZW50LnN0eWxlW3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGdldFN0eWxlUHJvcGVydHk6IGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZWxlbWVudC5zdHlsZVtwcm9wZXJ0eV07XG4gICAgfSxcbiAgICBzZXRTdHlsZVByb3BlcnRpZXM6IGZ1bmN0aW9uIChwcm9wZXJ0aWVzKSB7XG4gICAgICAgIGZvciAodmFyIHAgaW4gcHJvcGVydGllcyl7XG4gICAgICAgICAgICB0aGlzLl9lbGVtZW50LnN0eWxlW3BdID0gcHJvcGVydGllc1twXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgZGVsZXRlU3R5bGVDbGFzczogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9lbGVtZW50LmNsYXNzTmFtZSA9ICcnO1xuICAgICAgICByZXR1cm4gdGhpc1xuICAgIH0sXG4gICAgZGVsZXRlU3R5bGVQcm9wZXJ0eTogZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGVbcHJvcGVydHldID0gJyc7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgZGVsZXRlU3R5bGVQcm9wZXJ0aWVzOiBmdW5jdGlvbiAocHJvcGVydGllcykge1xuICAgICAgICBmb3IgKHZhciBwIGluIHByb3BlcnRpZXMpe1xuICAgICAgICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZVtwXSA9ICcnO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBnZXRDaGlsZEF0OiBmdW5jdGlvbiAoaW5kZXgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBOb2RlKCkuc2V0RWxlbWVudCh0aGlzLl9lbGVtZW50LmNoaWxkcmVuW2luZGV4XSk7XG4gICAgfSxcbiAgICBnZXRDaGlsZEluZGV4OiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXhPZih0aGlzLl9lbGVtZW50LCBub2RlLmdldEVsZW1lbnQoKSk7XG4gICAgfSxcbiAgICBnZXROdW1DaGlsZHJlbjogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZWxlbWVudC5jaGlsZHJlbi5sZW5ndGg7XG4gICAgfSxcbiAgICBnZXRGaXJzdENoaWxkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgTm9kZSgpLnNldEVsZW1lbnQodGhpcy5fZWxlbWVudC5maXJzdENoaWxkKTtcbiAgICB9LFxuICAgIGdldExhc3RDaGlsZDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IE5vZGUoKS5zZXRFbGVtZW50KHRoaXMuX2VsZW1lbnQubGFzdENoaWxkKTtcbiAgICB9LFxuICAgIGhhc0NoaWxkcmVuOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbGVtZW50LmNoaWxkcmVuLmxlbmd0aCAhPSAwO1xuICAgIH0sXG4gICAgY29udGFpbnM6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbmRleE9mKHRoaXMuX2VsZW1lbnQsIG5vZGUuZ2V0RWxlbWVudCgpKSAhPSAtMTtcbiAgICB9LFxuXG4gICAgX2luZGV4T2Y6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50LCBlbGVtZW50KSB7XG4gICAgICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUuaW5kZXhPZi5jYWxsKHBhcmVudEVsZW1lbnQuY2hpbGRyZW4sIGVsZW1lbnQpO1xuICAgIH0sXG5cbiAgICBzZXRQcm9wZXJ0eTogZnVuY3Rpb24gKHByb3BlcnR5LCB2YWx1ZSkge1xuICAgICAgICB0aGlzLl9lbGVtZW50W3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHNldFByb3BlcnRpZXM6IGZ1bmN0aW9uIChwcm9wZXJ0aWVzKSB7XG4gICAgICAgIGZvciAodmFyIHAgaW4gcHJvcGVydGllcyl7XG4gICAgICAgICAgICB0aGlzLl9lbGVtZW50W3BdID0gcHJvcGVydGllc1twXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGdldFByb3BlcnR5OiBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VsZW1lbnRbcHJvcGVydHldO1xuICAgIH0sXG5cbiAgICBzZXRFbGVtZW50OiBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICB0aGlzLl9lbGVtZW50ID0gZWxlbWVudDtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBnZXRFbGVtZW50OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbGVtZW50O1xuICAgIH0sXG5cbiAgICBnZXRTdHlsZTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZWxlbWVudC5zdHlsZTtcbiAgICB9LFxuXG4gICAgZ2V0UGFyZW50OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgTm9kZSgpLnNldEVsZW1lbnQodGhpcy5fZWxlbWVudC5wYXJlbnROb2RlKTtcbiAgICB9XG59O1xuXG5Ob2RlLmdldE5vZGVCeUVsZW1lbnQgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgIHJldHVybiBuZXcgTm9kZSgpLnNldEVsZW1lbnQoZWxlbWVudCk7XG59O1xuTm9kZS5nZXROb2RlQnlJZCA9IGZ1bmN0aW9uIChpZCkge1xuICAgIHJldHVybiBuZXcgTm9kZSgpLnNldEVsZW1lbnQoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTm9kZTsiLCJ2YXIgTm9kZUV2ZW50ID0ge1xuICAgIE1PVVNFX0RPV04gICA6ICdtb3VzZWRvd24nLFxuICAgIE1PVVNFX1VQICAgICA6ICdtb3VzZXVwJyxcbiAgICBNT1VTRV9PVkVSICAgOiAnbW91c2VvdmVyJyxcbiAgICBNT1VTRV9NT1ZFICAgOiAnbW91c2Vtb3ZlJyxcbiAgICBNT1VTRV9PVVQgICAgOiAnbW91c2VvdXQnLFxuICAgIEtFWV9ET1dOICAgICA6ICdrZXlkb3duJyxcbiAgICBLRVlfVVAgICAgICAgOiAna2V5dXAnLFxuICAgIENIQU5HRSAgICAgICA6ICdjaGFuZ2UnLFxuICAgIEZJTklTSCAgICAgICA6ICdmaW5pc2gnLFxuICAgIERCTF9DTElDSyAgICA6ICdkYmxjbGljaycsXG4gICAgT05fQ0xJQ0sgICAgIDogJ2NsaWNrJyxcbiAgICBTRUxFQ1RfU1RBUlQgOiAnc2VsZWN0c3RhcnQnLFxuICAgIERSQUdfU1RBUlQgICA6ICdkcmFnc3RhcnQnLFxuICAgIERSQUcgICAgICAgICA6ICdkcmFnJyxcbiAgICBEUkFHX0VORCAgICAgOiAnZHJhZ2VuZCcsXG5cbiAgICBEUkFHX0VOVEVSICAgOiAnZHJhZ2VudGVyJyxcbiAgICBEUkFHX09WRVIgICAgOiAnZHJhZ292ZXInLFxuICAgIERSQUdfTEVBVkUgICA6ICdkcmFnbGVhdmUnLFxuXG4gICAgUkVTSVpFICAgICAgIDogJ3Jlc2l6ZSdcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTm9kZUV2ZW50OyIsInZhciBTdHlsZSA9IHsgXG5cdHN0cmluZyA6IFwiI2NvbnRyb2xLaXR7cG9zaXRpb246YWJzb2x1dGU7dG9wOjA7bGVmdDowO3dpZHRoOjEwMCU7aGVpZ2h0OjEwMCU7LXdlYmtpdC10b3VjaC1jYWxsb3V0Om5vbmU7LXdlYmtpdC11c2VyLXNlbGVjdDpub25lOy1raHRtbC11c2VyLXNlbGVjdDpub25lOy1tb3otdXNlci1zZWxlY3Q6bm9uZTstbXMtdXNlci1zZWxlY3Q6bm9uZTt1c2VyLXNlbGVjdDpub25lO3BvaW50ZXItZXZlbnRzOm5vbmV9I2NvbnRyb2xLaXQgKntvdXRsaW5lOjB9I2NvbnRyb2xLaXQgLnBhbmVsey13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveDtwb2ludGVyLWV2ZW50czphdXRvO3Bvc2l0aW9uOnJlbGF0aXZlO3otaW5kZXg6MTstd2Via2l0LXRvdWNoLWNhbGxvdXQ6bm9uZTstd2Via2l0LXVzZXItc2VsZWN0Om5vbmU7LWtodG1sLXVzZXItc2VsZWN0Om5vbmU7LW1vei11c2VyLXNlbGVjdDpub25lOy1tcy11c2VyLXNlbGVjdDpub25lO3VzZXItc2VsZWN0Om5vbmU7b3ZlcmZsb3c6aGlkZGVuO29wYWNpdHk6MTtmbG9hdDpsZWZ0O3dpZHRoOjMwMHB4O2JvcmRlci1yYWRpdXM6M3B4Oy1tb3otYm9yZGVyLXJhZGl1czozcHg7Ym94LXNoYWRvdzowIDJweCAycHggcmdiYSgwLDAsMCwuMjUpO21hcmdpbjowO3BhZGRpbmc6MDtiYWNrZ3JvdW5kLWNvbG9yOiMxYTFhMWE7Zm9udC1mYW1pbHk6QXJpYWwsc2Fucy1zZXJpZn0jY29udHJvbEtpdCAucGFuZWwgLndyYXB7d2lkdGg6YXV0bztoZWlnaHQ6YXV0bzttYXJnaW46MDtwYWRkaW5nOjA7cG9zaXRpb246cmVsYXRpdmU7b3ZlcmZsb3c6aGlkZGVufSNjb250cm9sS2l0IC5wYW5lbCB1bHttYXJnaW46MDtwYWRkaW5nOjA7bGlzdC1zdHlsZTpub25lfSNjb250cm9sS2l0IC5wYW5lbCAuY29sb3IsI2NvbnRyb2xLaXQgLnBhbmVsIGlucHV0W3R5cGU9dGV4dF0sI2NvbnRyb2xLaXQgLnBhbmVsIHRleHRhcmVhLCNjb250cm9sS2l0IC5waWNrZXIgaW5wdXRbdHlwZT10ZXh0XXstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7LXdlYmtpdC10b3VjaC1jYWxsb3V0Om5vbmU7LXdlYmtpdC11c2VyLXNlbGVjdDpub25lOy1raHRtbC11c2VyLXNlbGVjdDpub25lOy1tb3otdXNlci1zZWxlY3Q6bm9uZTstbXMtdXNlci1zZWxlY3Q6bm9uZTt1c2VyLXNlbGVjdDpub25lO3dpZHRoOjEwMCU7aGVpZ2h0OjI1cHg7cGFkZGluZzowIDAgMCA4cHg7Zm9udC1mYW1pbHk6QXJpYWwsc2Fucy1zZXJpZjtmb250LXNpemU6MTFweDtjb2xvcjojZmZmO3RleHQtc2hhZG93OjFweCAxcHggIzAwMDtiYWNrZ3JvdW5kOiMyMjI3Mjk7YmFja2dyb3VuZC1pbWFnZTotby1saW5lYXItZ3JhZGllbnQocmdiYSgwLDAsMCwuMDc1KSAwLHJnYmEoMCwwLDAsLjEyNSkgMTAwJSk7YmFja2dyb3VuZC1pbWFnZTpsaW5lYXItZ3JhZGllbnQocmdiYSgwLDAsMCwuMDc1KSAwLHJnYmEoMCwwLDAsLjEyNSkgMTAwJSk7Ym9yZGVyOm5vbmU7Ym94LXNoYWRvdzowIDAgMCAxcHggIzFmMWYxZiBpbnNldDtib3JkZXItcmFkaXVzOjJweDstbW96LWJvcmRlci1yYWRpdXM6MnB4fSNjb250cm9sS2l0IC5wYW5lbCAuYnV0dG9uLCNjb250cm9sS2l0IC5wYW5lbCAuc2VsZWN0LCNjb250cm9sS2l0IC5wYW5lbCAuc2VsZWN0LWFjdGl2ZSwjY29udHJvbEtpdCAucGlja2VyIC5idXR0b257LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O2N1cnNvcjpwb2ludGVyO3dpZHRoOjEwMCU7aGVpZ2h0OjI2cHg7bWFyZ2luOjA7YmFja2dyb3VuZC1pbWFnZTotby1saW5lYXItZ3JhZGllbnQoIzQwNDA0MCAwLCMzYjNiM2IgMTAwJSk7YmFja2dyb3VuZC1pbWFnZTpsaW5lYXItZ3JhZGllbnQoIzQwNDA0MCAwLCMzYjNiM2IgMTAwJSk7Ym9yZGVyOm5vbmU7b3V0bGluZTowO2JvcmRlci1yYWRpdXM6MnB4O2JveC1zaGFkb3c6MCAwIDAgMXB4ICMxZjFmMWYgaW5zZXQsLTFweCAycHggMCAwICM0YTRhNGEgaW5zZXQ7Zm9udC1mYW1pbHk6QXJpYWwsc2Fucy1zZXJpZjtjb2xvcjojZmZmfSNjb250cm9sS2l0IC5wYW5lbCB0ZXh0YXJlYXtwYWRkaW5nOjVweCA4cHggMnB4O292ZXJmbG93OmhpZGRlbjtyZXNpemU6bm9uZTt2ZXJ0aWNhbC1hbGlnbjp0b3A7d2hpdGUtc3BhY2U6bm93cmFwfSNjb250cm9sS2l0IC5wYW5lbCAudGV4dGFyZWEtd3JhcHstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7d2lkdGg6MTAwJTtwYWRkaW5nOjA7ZmxvYXQ6bGVmdDtoZWlnaHQ6MTAwJTtvdmVyZmxvdzpoaWRkZW47Ym9yZGVyOm5vbmU7Ym9yZGVyLXJhZGl1czoycHg7LW1vei1ib3JkZXItcmFkaXVzOjJweDtiYWNrZ3JvdW5kLWNvbG9yOiMyMjI3Mjk7Ym94LXNoYWRvdzowIDAgMXB4IDJweCByZ2JhKDAsMCwwLC4wMTI1KSBpbnNldCwwIDAgMXB4IDFweCAjMTExMzE0IGluc2V0O2JhY2tncm91bmQtaW1hZ2U6LW8tbGluZWFyLWdyYWRpZW50KHJnYmEoMCwwLDAsLjA3NSkgMCxyZ2JhKDAsMCwwLC4xMjUpIDEwMCUpO2JhY2tncm91bmQtaW1hZ2U6bGluZWFyLWdyYWRpZW50KHJnYmEoMCwwLDAsLjA3NSkgMCxyZ2JhKDAsMCwwLC4xMjUpIDEwMCUpfSNjb250cm9sS2l0IC5wYW5lbCAudGV4dGFyZWEtd3JhcCB0ZXh0YXJlYXtib3JkZXI6bm9uZTtib3JkZXItcmFkaXVzOjJweDstbW96LWJvcmRlci1yYWRpdXM6MnB4O2JveC1zaGFkb3c6bm9uZTtiYWNrZ3JvdW5kOjAgMH0jY29udHJvbEtpdCAucGFuZWwgLnRleHRhcmVhLXdyYXAgLnNjcm9sbEJhcntib3JkZXI6MXB4IHNvbGlkICMxMDEyMTM7Ym9yZGVyLWJvdHRvbS1yaWdodC1yYWRpdXM6MnB4O2JvcmRlci10b3AtcmlnaHQtcmFkaXVzOjJweDtib3JkZXItbGVmdDpub25lO2JveC1zaGFkb3c6MCAwIDFweCAycHggcmdiYSgwLDAsMCwuMDEyNSkgaW5zZXQsMCAwIDFweCAxcHggIzExMTMxNCBpbnNldH0jY29udHJvbEtpdCAucGFuZWwgY2FudmFze2N1cnNvcjpwb2ludGVyO3ZlcnRpY2FsLWFsaWduOmJvdHRvbTtib3JkZXI6bm9uZTtib3gtc2hhZG93OjAgMCAwIDFweCAjMWYxZjFmIGluc2V0O2JvcmRlci1yYWRpdXM6MnB4Oy1tb3otYm9yZGVyLXJhZGl1czoycHh9I2NvbnRyb2xLaXQgLnBhbmVsIC5jYW52YXMtd3JhcCwjY29udHJvbEtpdCAucGFuZWwgLnN2Zy13cmFwe21hcmdpbjo2cHggMCAwO3Bvc2l0aW9uOnJlbGF0aXZlO3dpZHRoOjcwJTtmbG9hdDpyaWdodDstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym9yZGVyOm5vbmU7Ym9yZGVyLXJhZGl1czoycHg7LW1vei1ib3JkZXItcmFkaXVzOjJweDtiYWNrZ3JvdW5kOiMxZTIyMjQ7YmFja2dyb3VuZC1pbWFnZTotby1saW5lYXItZ3JhZGllbnQodHJhbnNwYXJlbnQgMCxyZ2JhKDAsMCwwLC4wNSkgMTAwJSk7YmFja2dyb3VuZC1pbWFnZTpsaW5lYXItZ3JhZGllbnQodHJhbnNwYXJlbnQgMCxyZ2JhKDAsMCwwLC4wNSkgMTAwJSl9I2NvbnRyb2xLaXQgLnBhbmVsIC5jYW52YXMtd3JhcCBzdmcsI2NvbnRyb2xLaXQgLnBhbmVsIC5zdmctd3JhcCBzdmd7cG9zaXRpb246YWJzb2x1dGU7bGVmdDowO3RvcDowO2N1cnNvcjpwb2ludGVyO3ZlcnRpY2FsLWFsaWduOmJvdHRvbTtib3JkZXI6bm9uZTtib3gtc2hhZG93OjAgMCAwIDFweCAjMWYxZjFmIGluc2V0O2JvcmRlci1yYWRpdXM6MnB4Oy1tb3otYm9yZGVyLXJhZGl1czoycHh9I2NvbnRyb2xLaXQgLnBhbmVsIC5idXR0b24sI2NvbnRyb2xLaXQgLnBpY2tlciAuYnV0dG9ue2ZvbnQtc2l6ZToxMHB4O2ZvbnQtd2VpZ2h0OjcwMDt0ZXh0LXNoYWRvdzowIDFweCAjMDAwO3RleHQtdHJhbnNmb3JtOnVwcGVyY2FzZX0jY29udHJvbEtpdCAucGFuZWwgLmJ1dHRvbjpob3ZlciwjY29udHJvbEtpdCAucGlja2VyIC5idXR0b246aG92ZXJ7YmFja2dyb3VuZC1pbWFnZTotby1saW5lYXItZ3JhZGllbnQoIzQ1NDU0NSAwLCMzYjNiM2IgMTAwJSk7YmFja2dyb3VuZC1pbWFnZTpsaW5lYXItZ3JhZGllbnQoIzQ1NDU0NSAwLCMzYjNiM2IgMTAwJSl9I2NvbnRyb2xLaXQgLnBhbmVsIC5idXR0b246YWN0aXZlLCNjb250cm9sS2l0IC5waWNrZXIgLmJ1dHRvbjphY3RpdmV7YmFja2dyb3VuZC1pbWFnZTotby1saW5lYXItZ3JhZGllbnQoIzQwNDA0MCAwLCMzYjNiM2IgMTAwJSk7YmFja2dyb3VuZC1pbWFnZTpsaW5lYXItZ3JhZGllbnQoIzQwNDA0MCAwLCMzYjNiM2IgMTAwJSl9I2NvbnRyb2xLaXQgLnBhbmVsIC5jb2xvci13aXRoLXByZXNldC13cmFwLCNjb250cm9sS2l0IC5wYW5lbCAuaW5wdXQtd2l0aC1wcmVzZXQtd3JhcHt3aWR0aDoxMDAlO2Zsb2F0OmxlZnR9I2NvbnRyb2xLaXQgLnBhbmVsIC5jb2xvci13aXRoLXByZXNldC13cmFwIC5jb2xvciwjY29udHJvbEtpdCAucGFuZWwgLmlucHV0LXdpdGgtcHJlc2V0LXdyYXAgaW5wdXRbdHlwZT10ZXh0XXtwYWRkaW5nLXJpZ2h0OjI1cHg7Ym9yZGVyLXRvcC1yaWdodC1yYWRpdXM6MnB4O2JvcmRlci1ib3R0b20tcmlnaHQtcmFkaXVzOjJweDtmbG9hdDpsZWZ0fSNjb250cm9sS2l0IC5wYW5lbCAuYnV0dG9uLXByZXNldCwjY29udHJvbEtpdCAucGFuZWwgLmJ1dHRvbi1wcmVzZXQtYWN0aXZley13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveDtwb3NpdGlvbjphYnNvbHV0ZTtyaWdodDowO3dpZHRoOjIwcHg7aGVpZ2h0OjI1cHg7bWFyZ2luOjA7Y3Vyc29yOnBvaW50ZXI7ZmxvYXQ6cmlnaHQ7Ym9yZGVyOm5vbmU7Ym9yZGVyLXRvcC1yaWdodC1yYWRpdXM6MnB4O2JvcmRlci1ib3R0b20tcmlnaHQtcmFkaXVzOjJweDtib3gtc2hhZG93OjAgMCAwIDFweCAjMWYxZjFmIGluc2V0LC0xcHggMnB4IDAgMCAjNGE0YTRhIGluc2V0fSNjb250cm9sS2l0IC5wYW5lbCAuYnV0dG9uLXByZXNldC1hY3RpdmUsI2NvbnRyb2xLaXQgLnBhbmVsIC5idXR0b24tcHJlc2V0OmhvdmVye2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBRkNBWUFBQUI0a2ExVkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFHNUpSRUZVZU5waTVPRGlhbVJnWUtoandBNGFtVng4Z3hqbUwxckM4UDNyVnhROGIrRVNCaGZmSUFabU5SMjlBNWV2WFdkaVpHQzAxOVhTWkdCZ1lHQll2bVk5dzdJMTZ4b1pHQmdhV0tCRzFTOWJzKzQvQXdORFBRTURBMXlTZ1lHQmdkRW5QQWJaemdZMG1nRXdBRTlsSlQxbHJzZmZBQUFBQUVsRlRrU3VRbUNDKSA1MCUgNTAlIG5vLXJlcGVhdCxsaW5lYXItZ3JhZGllbnQoIzQ1NDU0NSAwLCMzYjNiM2IgMTAwJSl9I2NvbnRyb2xLaXQgLnBhbmVsIC5idXR0b24tcHJlc2V0e2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBRkNBWUFBQUI0a2ExVkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFHNUpSRUZVZU5waTVPRGlhbVJnWUtoandBNGFtVng4Z3hqbUwxckM4UDNyVnhROGIrRVNCaGZmSUFabU5SMjlBNWV2WFdkaVpHQzAxOVhTWkdCZ1lHQll2bVk5dzdJMTZ4b1pHQmdhV0tCRzFTOWJzKzQvQXdORFBRTURBMXlTZ1lHQmdkRW5QQWJaemdZMG1nRXdBRTlsSlQxbHJzZmZBQUFBQUVsRlRrU3VRbUNDKSA1MCUgNTAlIG5vLXJlcGVhdCxsaW5lYXItZ3JhZGllbnQoIzQwNDA0MCAwLCMzYjNiM2IgMTAwJSl9I2NvbnRyb2xLaXQgLnBhbmVsIGlucHV0W3R5cGU9Y2hlY2tib3hde21hcmdpbjo2cHggMCAwfSNjb250cm9sS2l0IC5wYW5lbCAuc2VsZWN0LCNjb250cm9sS2l0IC5wYW5lbCAuc2VsZWN0LWFjdGl2ZXtwYWRkaW5nLWxlZnQ6MTBweDtwYWRkaW5nLXJpZ2h0OjIwcHg7Zm9udC1zaXplOjExcHg7dGV4dC1hbGlnbjpsZWZ0O3RleHQtc2hhZG93OjFweCAxcHggIzAwMDtjdXJzb3I6cG9pbnRlcjtvdmVyZmxvdzpoaWRkZW47d2hpdGUtc3BhY2U6bm93cmFwO3RleHQtb3ZlcmZsb3c6ZWxsaXBzaXN9I2NvbnRyb2xLaXQgLnBhbmVsIC5zZWxlY3R7YmFja2dyb3VuZDp1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFCQUFBQUFMQ0FZQUFBQjI0ZzA1QUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQU1OSlJFRlVlTnFja2pFS3dqQVVoajhsNTNBUTUyNkJIS0tMSWhTbEhrSHhCa2t1SUZXUElMUU9RUWQzVjRWdVhpZ3VGbHJGUlB6aExYbDgzM3VCMTB1em5DYVArcTRCRXFsczgzWTVIZ2hGdE9IMWFta0FpdDIrSXdrbXpYSUd3NUhlRkZ2ZlpGTnMvV0E0MG1tVzQ3MFAxZ2Y4TG9rSlJDSVYxMXZOOWJiNDJDNlJLdm9EQWRoWC9SWHhxTzhHMEYvNkZqQkJRU0lWOCttRTJYVGNhVlR1VE9sTzBRMzZnQ25keVZidS9BNUhwN2Z2d0x5bWFlQm51SE5JTFFtL3dnRFBBUUFQTklzSG5PNzk0UUFBQUFCSlJVNUVya0pnZ2c9PSkgMTAwJSA1MCUgbm8tcmVwZWF0LGxpbmVhci1ncmFkaWVudCgjNDA0MDQwIDAsIzNiM2IzYiAxMDAlKX0jY29udHJvbEtpdCAucGFuZWwgLnNlbGVjdC1hY3RpdmUsI2NvbnRyb2xLaXQgLnBhbmVsIC5zZWxlY3Q6aG92ZXJ7YmFja2dyb3VuZDp1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFCQUFBQUFMQ0FZQUFBQjI0ZzA1QUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQU1OSlJFRlVlTnFja2pFS3dqQVVoajhsNTNBUTUyNkJIS0tMSWhTbEhrSHhCa2t1SUZXUElMUU9RUWQzVjRWdVhpZ3VGbHJGUlB6aExYbDgzM3VCMTB1em5DYVArcTRCRXFsczgzWTVIZ2hGdE9IMWFta0FpdDIrSXdrbXpYSUd3NUhlRkZ2ZlpGTnMvV0E0MG1tVzQ3MFAxZ2Y4TG9rSlJDSVYxMXZOOWJiNDJDNlJLdm9EQWRoWC9SWHhxTzhHMEYvNkZqQkJRU0lWOCttRTJYVGNhVlR1VE9sTzBRMzZnQ25keVZidS9BNUhwN2Z2d0x5bWFlQm51SE5JTFFtL3dnRFBBUUFQTklzSG5PNzk0UUFBQUFCSlJVNUVya0pnZ2c9PSkgMTAwJSA1MCUgbm8tcmVwZWF0LGxpbmVhci1ncmFkaWVudCgjNDU0NTQ1IDAsIzNiM2IzYiAxMDAlKX0jY29udHJvbEtpdCAucGFuZWwgLnNsaWRlci1oYW5kbGUsI2NvbnRyb2xLaXQgLnBhbmVsIC5zbGlkZXItc2xvdCwjY29udHJvbEtpdCAucGFuZWwgLnNsaWRlci13cmFwLCNjb250cm9sS2l0IC5wYW5lbCAud3JhcC1zbGlkZXJ7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94fSNjb250cm9sS2l0IC5wYW5lbCAud3JhcC1zbGlkZXJ7d2lkdGg6NzAlO3BhZGRpbmc6NnB4IDAgMDtmbG9hdDpyaWdodDtoZWlnaHQ6MTAwJX0jY29udHJvbEtpdCAucGFuZWwgLndyYXAtc2xpZGVyIGlucHV0W3R5cGU9dGV4dF17d2lkdGg6MjUlO3RleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6MDtmbG9hdDpyaWdodH0jY29udHJvbEtpdCAucGFuZWwgLnNsaWRlci13cmFwe2Zsb2F0OmxlZnQ7Y3Vyc29yOmV3LXJlc2l6ZTt3aWR0aDo3MCV9I2NvbnRyb2xLaXQgLnBhbmVsIC5zbGlkZXItc2xvdHt3aWR0aDoxMDAlO2hlaWdodDoyNXB4O3BhZGRpbmc6M3B4O2JhY2tncm91bmQtY29sb3I6IzFlMjIyNDtib3JkZXI6bm9uZTtib3gtc2hhZG93OjAgMCAwIDFweCAjMWYxZjFmIGluc2V0O2JvcmRlci1yYWRpdXM6MnB4Oy1tb3otYm9yZGVyLXJhZGl1czoycHh9I2NvbnRyb2xLaXQgLnBhbmVsIC5zbGlkZXItaGFuZGxle3Bvc2l0aW9uOnJlbGF0aXZlO3dpZHRoOjEwMCU7aGVpZ2h0OjEwMCU7YmFja2dyb3VuZDojYjMyNDM1O2JhY2tncm91bmQtaW1hZ2U6LW8tbGluZWFyLWdyYWRpZW50KHRyYW5zcGFyZW50IDAscmdiYSgwLDAsMCwuMSkgMTAwJSk7YmFja2dyb3VuZC1pbWFnZTpsaW5lYXItZ3JhZGllbnQodHJhbnNwYXJlbnQgMCxyZ2JhKDAsMCwwLC4xKSAxMDAlKTtib3gtc2hhZG93OjAgMXB4IDAgMCAjMGYwZjBmfSNjb250cm9sS2l0IC5wYW5lbCAuY29sb3J7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94Oy13ZWJraXQtdG91Y2gtY2FsbG91dDpub25lOy13ZWJraXQtdXNlci1zZWxlY3Q6bm9uZTsta2h0bWwtdXNlci1zZWxlY3Q6bm9uZTstbW96LXVzZXItc2VsZWN0Om5vbmU7LW1zLXVzZXItc2VsZWN0Om5vbmU7dXNlci1zZWxlY3Q6bm9uZTtjdXJzb3I6cG9pbnRlcjt3aWR0aDoxMDAlO2hlaWdodDoyNXB4O3BhZGRpbmc6MDtib3JkZXI6bm9uZTtiYWNrZ3JvdW5kOiNmZmY7Ym94LXNoYWRvdzowIDAgMCAxcHggIzExMTMxNCBpbnNldDt0ZXh0LWFsaWduOmNlbnRlcjtsaW5lLWhlaWdodDoyNXB4O2JvcmRlci1yYWRpdXM6MnB4Oy1tb3otYm9yZGVyLXJhZGl1czoycHh9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaC1zbGlkZXIteC13cmFwLCNjb250cm9sS2l0IC5wYW5lbCAuZ3JhcGgtc2xpZGVyLXktd3JhcHtwb3NpdGlvbjphYnNvbHV0ZTstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3h9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaC1zbGlkZXIteC13cmFwe2JvdHRvbTowO2xlZnQ6MDt3aWR0aDoxMDAlO3BhZGRpbmc6NnB4IDIwcHggNnB4IDZweH0jY29udHJvbEtpdCAucGFuZWwgLmdyYXBoLXNsaWRlci15LXdyYXB7dG9wOjA7cmlnaHQ6MDtoZWlnaHQ6MTAwJTtwYWRkaW5nOjZweCA2cHggMjBweH0jY29udHJvbEtpdCAucGFuZWwgLmdyYXBoLXNsaWRlci14LCNjb250cm9sS2l0IC5wYW5lbCAuZ3JhcGgtc2xpZGVyLXl7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O2JvcmRlci1yYWRpdXM6MnB4Oy1tb3otYm9yZGVyLXJhZGl1czoycHg7YmFja2dyb3VuZDpyZ2JhKDI0LDI3LDI5LC41KTtib3JkZXI6MXB4IHNvbGlkICMxODFiMWR9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaC1zbGlkZXIteHtoZWlnaHQ6OHB4fSNjb250cm9sS2l0IC5wYW5lbCAuZ3JhcGgtc2xpZGVyLXl7d2lkdGg6OHB4O2hlaWdodDoxMDAlfSNjb250cm9sS2l0IC5wYW5lbCAuZ3JhcGgtc2xpZGVyLXgtaGFuZGxlLCNjb250cm9sS2l0IC5wYW5lbCAuZ3JhcGgtc2xpZGVyLXktaGFuZGxley13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveDtjdXJzb3I6cG9pbnRlcjtib3JkZXI6MXB4IHNvbGlkICMxODFiMWQ7YmFja2dyb3VuZDojMzAzNjM5fSNjb250cm9sS2l0IC5wYW5lbCAuZ3JhcGgtc2xpZGVyLXgtaGFuZGxle3dpZHRoOjIwcHg7aGVpZ2h0OjEwMCU7Ym9yZGVyLXRvcDpub25lO2JvcmRlci1ib3R0b206bm9uZX0jY29udHJvbEtpdCAucGFuZWwgLmdyYXBoLXNsaWRlci15LWhhbmRsZXt3aWR0aDoxMDAlO2hlaWdodDoyMHB4O2JvcmRlci1sZWZ0Om5vbmU7Ym9yZGVyLXJpZ2h0Om5vbmV9I2NvbnRyb2xLaXQgLnN1Yi1ncm91cCAud3JhcCAud3JhcCAud3JhcHt3aWR0aDoyNSUhaW1wb3J0YW50O3BhZGRpbmc6MCFpbXBvcnRhbnQ7ZmxvYXQ6bGVmdCFpbXBvcnRhbnR9I2NvbnRyb2xLaXQgLnN1Yi1ncm91cCAud3JhcCAud3JhcCAud3JhcCAubGFiZWx7d2lkdGg6MTAwJSFpbXBvcnRhbnQ7cGFkZGluZzo4cHggMCAwIWltcG9ydGFudDtjb2xvcjojODc4Nzg3IWltcG9ydGFudDt0ZXh0LWFsaWduOmNlbnRlciFpbXBvcnRhbnQ7dGV4dC10cmFuc2Zvcm06dXBwZXJjYXNlIWltcG9ydGFudDtmb250LXdlaWdodDo3MDAhaW1wb3J0YW50O3RleHQtc2hhZG93OjFweCAxcHggIzFhMWExYSFpbXBvcnRhbnR9I2NvbnRyb2xLaXQgLnN1Yi1ncm91cCAud3JhcCAud3JhcCAud3JhcCBpbnB1dFt0eXBlPXRleHRde3BhZGRpbmc6MDt0ZXh0LWFsaWduOmNlbnRlcn0jY29udHJvbEtpdCAub3B0aW9uc3twb2ludGVyLWV2ZW50czphdXRvOy13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveDtib3JkZXI6MXB4IHNvbGlkICMxZjFmMWY7Ym9yZGVyLXJhZGl1czoycHg7LW1vei1ib3JkZXItcmFkaXVzOjJweDtwb3NpdGlvbjphYnNvbHV0ZTt6LWluZGV4OjIxNDc0ODM2Mzg7bGVmdDowO3RvcDowO3dpZHRoOmF1dG87aGVpZ2h0OmF1dG87Ym94LXNoYWRvdzowIDFweCAwIDAgIzRhNGE0YSBpbnNldDtiYWNrZ3JvdW5kLWNvbG9yOiM0NTQ1NDU7Zm9udC1mYW1pbHk6QXJpYWwsc2Fucy1zZXJpZjtmb250LXNpemU6MTFweDtjb2xvcjojZmZmO3RleHQtc2hhZG93OjFweCAxcHggIzAwMDtvdmVyZmxvdzpoaWRkZW59I2NvbnRyb2xLaXQgLm9wdGlvbnMgdWx7d2lkdGg6MTAwJTtsaXN0LXN0eWxlOm5vbmU7bWFyZ2luOjA7cGFkZGluZzowfSNjb250cm9sS2l0IC5vcHRpb25zIHVsIGxpe21hcmdpbjowO3dpZHRoOjEwMCU7aGVpZ2h0OjI1cHg7bGluZS1oZWlnaHQ6MjVweDtwYWRkaW5nOjAgMjBweCAwIDEwcHg7b3ZlcmZsb3c6aGlkZGVuO3doaXRlLXNwYWNlOm5vcm1hbDt0ZXh0LW92ZXJmbG93OmVsbGlwc2lzO2N1cnNvcjpwb2ludGVyfSNjb250cm9sS2l0IC5vcHRpb25zIHVsIGxpOmhvdmVye2JhY2tncm91bmQtY29sb3I6IzFmMjMyNX0jY29udHJvbEtpdCAub3B0aW9ucyB1bCAubGktc2VsZWN0ZWR7YmFja2dyb3VuZC1jb2xvcjojMjkyZDMwfSNjb250cm9sS2l0IC5vcHRpb25zIC5jb2xvcnstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3h9I2NvbnRyb2xLaXQgLm9wdGlvbnMgLmNvbG9yIC5saS1zZWxlY3RlZCwjY29udHJvbEtpdCAub3B0aW9ucyAuY29sb3IgbGl7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O3BhZGRpbmc6MDtoZWlnaHQ6MjVweDtsaW5lLWhlaWdodDoyNXB4O3RleHQtYWxpZ246Y2VudGVyfSNjb250cm9sS2l0IC5vcHRpb25zIC5jb2xvciAubGktc2VsZWN0ZWQ6aG92ZXIsI2NvbnRyb2xLaXQgLm9wdGlvbnMgLmNvbG9yIGxpOmhvdmVye2JhY2tncm91bmQ6MCAwO2ZvbnQtd2VpZ2h0OjcwMH0jY29udHJvbEtpdCAub3B0aW9ucyAuY29sb3IgLmxpLXNlbGVjdGVke2ZvbnQtd2VpZ2h0OjcwMH0jY29udHJvbEtpdCAucGFuZWwgLmxhYmVsLCNjb250cm9sS2l0IC5waWNrZXIgLmxhYmVse3dpZHRoOjEwMCU7ZmxvYXQ6bGVmdDtmb250LXNpemU6MTFweDtmb250LXdlaWdodDo3MDA7dGV4dC1zaGFkb3c6MCAxcHggIzAwMDtvdmVyZmxvdzpoaWRkZW47d2hpdGUtc3BhY2U6bm93cmFwO3RleHQtb3ZlcmZsb3c6ZWxsaXBzaXM7Y3Vyc29yOmRlZmF1bHR9I2NvbnRyb2xLaXQgLnBhbmVsIC5oZWFkLCNjb250cm9sS2l0IC5wYW5lbCAucGFuZWwtaGVhZC1pbmFjdGl2ZSwjY29udHJvbEtpdCAucGlja2VyIC5oZWFke2hlaWdodDozMHB4O3BhZGRpbmc6MCAxMHB4O2JhY2tncm91bmQ6IzFhMWExYTtvdmVyZmxvdzpoaWRkZW59I2NvbnRyb2xLaXQgLnBhbmVsIC5oZWFkIC53cmFwLCNjb250cm9sS2l0IC5wYW5lbCAucGFuZWwtaGVhZC1pbmFjdGl2ZSAud3JhcCwjY29udHJvbEtpdCAucGlja2VyIC5oZWFkIC53cmFwe3dpZHRoOmF1dG87aGVpZ2h0OmF1dG87bWFyZ2luOjA7cGFkZGluZzowO3Bvc2l0aW9uOnJlbGF0aXZlO292ZXJmbG93OmhpZGRlbn0jY29udHJvbEtpdCAucGFuZWwgLmhlYWQgLmxhYmVsLCNjb250cm9sS2l0IC5waWNrZXIgLmhlYWQgLmxhYmVse2N1cnNvcjpwb2ludGVyO2xpbmUtaGVpZ2h0OjMwcHg7Y29sb3I6IzY1Njk2Yn0jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5oZWFke2hlaWdodDozOHB4O3BhZGRpbmc6MCAxMHB4O2JvcmRlci10b3A6MXB4IHNvbGlkICM0ZjRmNGY7Ym9yZGVyLWJvdHRvbToxcHggc29saWQgIzI2MjYyNjtiYWNrZ3JvdW5kLWltYWdlOi1vLWxpbmVhci1ncmFkaWVudCgjNDU0NTQ1IDAsIzNiM2IzYiAxMDAlKTtiYWNrZ3JvdW5kLWltYWdlOmxpbmVhci1ncmFkaWVudCgjNDU0NTQ1IDAsIzNiM2IzYiAxMDAlKTtjdXJzb3I6cG9pbnRlcn0jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5oZWFkIC5sYWJlbHtmb250LXNpemU6MTJweDtsaW5lLWhlaWdodDozOHB4O2NvbG9yOiNmZmZ9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuaGVhZDpob3Zlcntib3JkZXItdG9wOjFweCBzb2xpZCAjNTI1MjUyO2JhY2tncm91bmQtaW1hZ2U6LW8tbGluZWFyLWdyYWRpZW50KCM0NTQ1NDUgMCwjNDA0MDQwIDEwMCUpO2JhY2tncm91bmQtaW1hZ2U6bGluZWFyLWdyYWRpZW50KCM0NTQ1NDUgMCwjNDA0MDQwIDEwMCUpfSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgbGl7aGVpZ2h0OjM1cHg7cGFkZGluZzowIDEwcHh9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cHtwYWRkaW5nOjA7aGVpZ2h0OmF1dG87Ym9yZGVyLWJvdHRvbToxcHggc29saWQgIzI0MjQyNH0jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3VwIHVse292ZXJmbG93OmhpZGRlbn0jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3VwIHVsIGxpe2JhY2tncm91bmQ6IzJlMmUyZTtib3JkZXItYm90dG9tOjFweCBzb2xpZCAjMWUyMjI0fSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLnN1Yi1ncm91cC1saXN0IC5zdWItZ3JvdXAgdWwgbGk6bGFzdC1vZi10eXBle2JvcmRlci1ib3R0b206bm9uZX0jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3VwOmZpcnN0LWNoaWxke21hcmdpbi10b3A6MH0jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3VwIC5oZWFkLCNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLnN1Yi1ncm91cC1saXN0IC5zdWItZ3JvdXAgLmhlYWQtaW5hY3RpdmV7Y3Vyc29yOnBvaW50ZXJ9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cCAuaGVhZHtoZWlnaHQ6MjdweDtwYWRkaW5nOjAgMTBweDtib3JkZXItdG9wOm5vbmU7Ym9yZGVyLWJvdHRvbToxcHggc29saWQgIzI0MjQyNDtiYWNrZ3JvdW5kLWltYWdlOm5vbmU7YmFja2dyb3VuZC1jb2xvcjojMjcyNzI3fSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLnN1Yi1ncm91cC1saXN0IC5zdWItZ3JvdXAgLmhlYWQ6aG92ZXJ7YmFja2dyb3VuZC1pbWFnZTpub25lO2JhY2tncm91bmQtY29sb3I6IzI3MjcyN30jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3VwIC5oZWFkLWluYWN0aXZley13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveDtoZWlnaHQ6MjdweDtwYWRkaW5nOjAgMTBweDtib3gtc2hhZG93OjAgMXB4IDAgMCAjNDA0MDQwIGluc2V0O2JhY2tncm91bmQtaW1hZ2U6LW8tbGluZWFyLWdyYWRpZW50KCMzYjNiM2IgMCwjMzgzODM4IDEwMCUpO2JhY2tncm91bmQtaW1hZ2U6bGluZWFyLWdyYWRpZW50KCMzYjNiM2IgMCwjMzgzODM4IDEwMCUpfSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLnN1Yi1ncm91cC1saXN0IC5zdWItZ3JvdXAgLmhlYWQtaW5hY3RpdmU6aG92ZXJ7Ym94LXNoYWRvdzowIDFweCAwIDAgIzQ3NDc0NyBpbnNldDtiYWNrZ3JvdW5kLWltYWdlOm5vbmU7YmFja2dyb3VuZC1pbWFnZTotby1saW5lYXItZ3JhZGllbnQoIzQwNDA0MCAwLCMzYjNiM2IgMTAwJSk7YmFja2dyb3VuZC1pbWFnZTpsaW5lYXItZ3JhZGllbnQoIzQwNDA0MCAwLCMzYjNiM2IgMTAwJSl9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cCAuaGVhZCAubGFiZWwsI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cCAuaGVhZC1pbmFjdGl2ZSAubGFiZWx7bWFyZ2luOjA7cGFkZGluZzowO2xpbmUtaGVpZ2h0OjI3cHg7Y29sb3I6I2ZmZjtmb250LXdlaWdodDo3MDA7Zm9udC1zaXplOjExcHg7dGV4dC1zaGFkb3c6MXB4IDFweCAjMDAwO3RleHQtdHJhbnNmb3JtOmNhcGl0YWxpemV9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cCAuaGVhZCAud3JhcCAubGFiZWwsI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cCAuaGVhZC1pbmFjdGl2ZSAud3JhcCAubGFiZWx7d2lkdGg6MTAwJTtmb250LXdlaWdodDo3MDA7Y29sb3I6I2ZmZjtwYWRkaW5nOjB9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cCAud3JhcCAubGFiZWx7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O2hlaWdodDoxMDAlO3dpZHRoOjMwJTtwYWRkaW5nOjEycHggNXB4IDAgMDtmbG9hdDpsZWZ0O2ZvbnQtc2l6ZToxMXB4O2ZvbnQtd2VpZ2h0OjQwMDtjb2xvcjojYWViNWI4O3RleHQtc2hhZG93OjFweCAxcHggIzAwMH0jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3VwIC53cmFwIC53cmFwey13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveDt3aWR0aDo3MCU7cGFkZGluZzo1cHggMCAwO2Zsb2F0OnJpZ2h0O2hlaWdodDoxMDAlfSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXA6bGFzdC1jaGlsZCAuc2Nyb2xsLWJ1ZmZlcjpudGgtb2YtdHlwZSgzKSwjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwOmxhc3QtY2hpbGQgLnN1Yi1ncm91cC1saXN0e2JvcmRlci1ib3R0b206bm9uZX0jY29udHJvbEtpdCAucGFuZWwgLnNjcm9sbC13cmFwe3Bvc2l0aW9uOnJlbGF0aXZlO292ZXJmbG93OmhpZGRlbn0jY29udHJvbEtpdCAucGFuZWwgLnNjcm9sbC1idWZmZXJ7d2lkdGg6MTAwJTtoZWlnaHQ6OHB4O2JvcmRlci10b3A6MXB4IHNvbGlkICMzYjQ0NDc7Ym9yZGVyLWJvdHRvbToxcHggc29saWQgIzFlMjIyNH0jY29udHJvbEtpdCAucGFuZWwgLnNjcm9sbEJhcnstd2Via2l0LWJveC1zaXppbmc6Y29udGVudC1ib3g7LW1vei1ib3gtc2l6aW5nOmNvbnRlbnQtYm94O2JveC1zaXppbmc6Y29udGVudC1ib3g7d2lkdGg6MTVweDtoZWlnaHQ6MTAwJTtmbG9hdDpyaWdodDt0b3A6MDtwYWRkaW5nOjA7bWFyZ2luOjA7cG9zaXRpb246cmVsYXRpdmU7YmFja2dyb3VuZDojMjEyNjI4O2JhY2tncm91bmQtaW1hZ2U6bGluZWFyLWdyYWRpZW50KHRvIHJpZ2h0LCMyNDI0MjQgMCwjMmUyZTJlIDEwMCUpfSNjb250cm9sS2l0IC5wYW5lbCAuc2Nyb2xsQmFyIC50cmFja3twYWRkaW5nOjAgM3B4IDAgMnB4fSNjb250cm9sS2l0IC5wYW5lbCAuc2Nyb2xsQmFyIC50cmFjayAudGh1bWJ7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O3dpZHRoOjExcHg7cG9zaXRpb246YWJzb2x1dGU7Y3Vyc29yOnBvaW50ZXI7YmFja2dyb3VuZC1jb2xvcjojMzQzNDM0O2JvcmRlcjoxcHggc29saWQgIzFiMWYyMTtib3JkZXItcmFkaXVzOjEwcHg7LW1vei1ib3JkZXItcmFkaXVzOjEwcHg7Ym94LXNoYWRvdzppbnNldCAwIDFweCAwIDAgIzQzNGI1MH0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSwjY29udHJvbEtpdCAucGlja2VyIC5tZW51e2Zsb2F0OnJpZ2h0O3BhZGRpbmc6NXB4IDAgMH0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUgaW5wdXRbdHlwZT1idXR0b25dLCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgaW5wdXRbdHlwZT1idXR0b25dLCNjb250cm9sS2l0IC5waWNrZXIgLm1lbnUgaW5wdXRbdHlwZT1idXR0b25dey13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveDtjdXJzb3I6cG9pbnRlcjtoZWlnaHQ6MjBweDtib3JkZXI6bm9uZTt2ZXJ0aWNhbC1hbGlnbjp0b3A7Ym9yZGVyLXJhZGl1czoycHg7LW1vei1ib3JkZXItcmFkaXVzOjJweDtmb250LWZhbWlseTpBcmlhbCxzYW5zLXNlcmlmO2ZvbnQtc2l6ZToxMHB4O2ZvbnQtd2VpZ2h0OjcwMDtjb2xvcjojYWFhO3RleHQtc2hhZG93OjAgLTFweCAjMDAwO3RleHQtdHJhbnNmb3JtOnVwcGVyY2FzZTtib3gtc2hhZG93OjAgMCAwIDFweCAjMTMxMzEzIGluc2V0LC0xcHggMnB4IDAgMCAjMjEyNTI3IGluc2V0fSNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnV0dG9uLW1lbnUtY2xvc2UsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idXR0b24tbWVudS1oaWRlLCNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnV0dG9uLW1lbnUtc2hvdywjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS1jbG9zZSwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS1oaWRlLCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LXNob3csI2NvbnRyb2xLaXQgLnBpY2tlciAubWVudSAuYnV0dG9uLW1lbnUtY2xvc2UsI2NvbnRyb2xLaXQgLnBpY2tlciAubWVudSAuYnV0dG9uLW1lbnUtaGlkZSwjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idXR0b24tbWVudS1zaG93e3dpZHRoOjIwcHg7bWFyZ2luLWxlZnQ6NHB4fSNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnV0dG9uLW1lbnUtaGlkZSwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS1oaWRlLCNjb250cm9sS2l0IC5waWNrZXIgLm1lbnUgLmJ1dHRvbi1tZW51LWhpZGV7YmFja2dyb3VuZDp1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFGQ0FZQUFBQjRrYTFWQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQUdSSlJFRlVlTnBpZFBVTllvQ0JVMGNPMURNd01EQ1kyVGcwd3NSWWtDVmxGWlVib0d5NEltWmxkVTI0cEp5U0NnTy9vQkFEQXdPRHcvVkw1eG1rNVJRT01yOTkvUkl1Q1FQSWlsak1iQndZR0JnWUdINy8vTW1BRENTbFpSa2twV1VaQUFNQXZUc2dYQnZPc3EwQUFBQUFTVVZPUks1Q1lJST0pIDUwJSA1MCUgbm8tcmVwZWF0LCMxYTFkMWZ9I2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idXR0b24tbWVudS1oaWRlOmhvdmVyLCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LWhpZGU6aG92ZXIsI2NvbnRyb2xLaXQgLnBpY2tlciAubWVudSAuYnV0dG9uLW1lbnUtaGlkZTpob3ZlcntiYWNrZ3JvdW5kOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBR1JKUkVGVWVOcGlkUFVOWW9DQlUwY08xRE13TURDWTJUZzB3c1JZa0NWbEZaVWJvR3k0SW1abGRVMjRwSnlTQ2dPL29CQURBd09Edy9WTDV4bWs1UlFPTXI5OS9SSXVDUVBJaWxqTWJCd1lHQmdZR0g3Ly9NbUFEQ1NsWlJra3BXVVpBQU1BdlRzZ1hCdk9zcTBBQUFBQVNVVk9SSzVDWUlJPSkgNTAlIDUwJSBuby1yZXBlYXQsIzAwMDtib3gtc2hhZG93OiNmZmYgMCwjMDAwIDEwMCV9I2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idXR0b24tbWVudS1zaG93LCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LXNob3csI2NvbnRyb2xLaXQgLnBpY2tlciAubWVudSAuYnV0dG9uLW1lbnUtc2hvd3tiYWNrZ3JvdW5kOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBRnBKUkVGVWVOcHNqREVPZ0NBUUJPYzRlcU5mb0NCOHdNckNud2svODJFSFdFa3djYXRKWnJLeXJGc0dMdjVYL0g2Y3FQYzQxWTlwdFZMTjBCRFQzVnNURVRuRnVWa1dJR3VJQ1dCRXZmY2hBZnowbXF2WjRCZWVBUUR6VmlNekp5MFJYZ0FBQUFCSlJVNUVya0pnZ2c9PSkgNTAlIDUwJSBuby1yZXBlYXQsIzFhMWQxZn0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ1dHRvbi1tZW51LXNob3c6aG92ZXIsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtc2hvdzpob3ZlciwjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idXR0b24tbWVudS1zaG93OmhvdmVye2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBRkNBWUFBQUI0a2ExVkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFGcEpSRUZVZU5wc2pERU9nQ0FRQk9jNGVxTmZvQ0I4d01yQ253ay84MkVIV0Vrd2NhdEpackt5ckZzR0x2NVgvSDZjcVBjNDFZOXB0VkxOMEJEVDNWc1RFVG5GdVZrV0lHdUlDV0JFdmZjaEFmejBtcXZaNEJlZUFRRHpWaU16SnkwUlhnQUFBQUJKUlU1RXJrSmdnZz09KSA1MCUgNTAlIG5vLXJlcGVhdCwjMDAwO2JveC1zaGFkb3c6I2ZmZiAwLCMwMDAgMTAwJX0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ1dHRvbi1tZW51LWNsb3NlLCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LWNsb3NlLCNjb250cm9sS2l0IC5waWNrZXIgLm1lbnUgLmJ1dHRvbi1tZW51LWNsb3Nle2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBSkNBWUFBQUFQVTIwdUFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFRMUpSRUZVZU5wTTBEOUxBbUVBeC9IdlBYZURUcWVYcFZlWVlqcFlHUTFoQlE3U254ZlEwcEExRkVWYnI2RmVSZ1p1Q2IyRW9PQ2dtMjZzcG9JZ2lLQlFRYUlVbnVjZVcyN3d0MzZIRC93TU8rbmNBbmExVmw5amJJSHZ0WUFOYTJsbHRZSmh1SUh2WFZWcjlaTW9IcFhtRncvdHBDT3RXQ3grTDB4enYxaGVPQTU4THc2OHBxZG56bE5wbDFES053czQwR0g0a0pyS1hBcGhOZ1ovdjJUekJaU1ViYUFoSXJMWi9mNjZtOHk0ekJhSy9QVDdYYUFCSUNMemJEZ2NiT2t3SkZRS1BkSVRnZSsxQVF3NzZkeTQyZHh1ZnE1RXFGUUxlQmRDWFBSNkhWNmVIeitNOWZyMlo4SnhYQ1ZsRXppTnlEM1RzcTZWa3Nvc1Y1WTN0ZFlkWUdmc2hxZVIxamtESS9FL0FPOHJZUmx3WEJxdUFBQUFBRWxGVGtTdVFtQ0MpIDUwJSA1MCUgbm8tcmVwZWF0LCMxYTFkMWZ9I2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idXR0b24tbWVudS1jbG9zZTpob3ZlciwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS1jbG9zZTpob3ZlciwjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idXR0b24tbWVudS1jbG9zZTpob3ZlcntiYWNrZ3JvdW5kOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUpDQVlBQUFBUFUyMHVBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBUTFKUkVGVWVOcE0wRDlMQW1FQXgvSHZQWGVEVHFlWHBWZVlZanBZR1ExaEJRN1NueGZRMHBBMUZFVmJyNkZlUmdadUNiMkVvT0NnbTI2c3BvSWdpS0JRUWFJVW51Y2VXMjd3dDM2SEQvd01PK25jQW5hMVZsOWpiSUh2dFlBTmEybGx0WUpodUlIdlhWVnI5Wk1vSHBYbUZ3L3RwQ090V0N4K0wweHp2MWhlT0E1OEx3NjhwcWRuemxOcGwxREtOd3M0MEdINGtKcktYQXBoTmdaL3YyVHpCWlNVYmFBaElyTFovZjY2bTh5NHpCYUsvUFQ3WGFBQklDTHpiRGdjYk9rd0pGUUtQZElUZ2UrMUFRdzc2ZHk0MmR4dWZxNUVxRlFMZUJkQ1hQUjZIVjZlSHorTTlmcjJaOEp4WENWbEV6aU55RDNUc3E2Vmtzb3NWNVkzdGRZZFlHZnNocWVSMWprREkvRS9BTzhyWVJsd1hCcXVBQUFBQUVsRlRrU3VRbUNDKSA1MCUgNTAlIG5vLXJlcGVhdCwjMDAwO2JveC1zaGFkb3c6I2ZmZiAwLCMwMDAgMTAwJX0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ1dHRvbi1tZW51LXVuZG8sI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtdW5kb3tiYWNrZ3JvdW5kOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUF3QUFBQUxDQVlBQUFCTGNHeGZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBWVZKUkVGVWVOcGNrRDFJVzFFWWhwOXo3cm0zb3FraHpaL3hENnRSMUVwRktlbGdobEJvblZ3S0RwYVdEbmJxMmxWRjBNSEJVYmRDcDVhQ1VpZ2RuSVNnb1VQQXFXTWxZc0dsTnRZSzFaaHp6cjFkVkc3emJ0L0w5N3g4N3ljZVR6MGxySEtwK0JKWUJIcXVyRy9BZkM1ZitBd2d3a0M1Vkh5YnlyVFBkdmRtQTlmMUJFSlFPLy9MWVdXZmsrT2ZTN2w4WWVFR0tKZUtyN05EOTlhVDZReldtSFBnRStBQU00N3JjblI0d0kvSy9xUzhUczkwZHErbE1oMVlZMWFCRnVBRjhBeVFWdXZOcnJ0OXhPS0pqeUlhdS9NT0dKcDQ5T1JoclhaaDlyN3ViZ1BQYy9uQ3IzQTM2VGpHOTMxSERZK09UeWpQNnc4QUtSMDFNdmFnY0ZxdHhvSC9nTFBUM3dleFJES3JJcmRiZDZUajlBc2hjRDBQUWFUYTNCSTVvVUZhMTNzSUFpVHd5cmQyd1dxTnFWL3VBUjNBY2NPclB5UlNiVXJYNjMvVWxiZmsrMzRGeEpkeXFkZ0VMQU8zZ0Rnd1BUQnkvM3B2Um9XQzNnTWtVbTNwU0RUNlJrcUpjbDNpeVhRUVdJczFaZ1hZVW8yMzlnNE0xc0t6MWZvN01BZHNBUHdiQUw5aGZ0dlRsTmtkQUFBQUFFbEZUa1N1UW1DQykgMjAlIDUwJSBuby1yZXBlYXQsIzFhMWQxZjtwYWRkaW5nOjAgNnB4IDFweCAwO3dpZHRoOjM4cHg7dmVydGljYWwtYWxpZ246dG9wO3RleHQtYWxpZ246ZW5kfSNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnV0dG9uLW1lbnUtdW5kbzpob3ZlciwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS11bmRvOmhvdmVye2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQXdBQUFBTENBWUFBQUJMY0d4ZkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFZVkpSRUZVZU5wY2tEMUlXMUVZaHA5ejdybTNvcWtoeloveEQ2dFIxRXBGS2VsZ2hsQm9uVndLRHBhV0RuYnEybFZGME1IQlViZENwNWFDVWlnZG5JU2dvVVBBcVdNbFlzR2xOdFlLMVpoenpyMWRWRzd6YnQvTDk3eDg3eWNlVHowbHJIS3ArQkpZQkhxdXJHL0FmQzVmK0F3Z3drQzVWSHlieXJUUGR2ZG1BOWYxQkVKUU8vL0xZV1dmaytPZlM3bDhZZUVHS0plS3I3TkQ5OWFUNlF6V21IUGdFK0FBTTQ3cmNuUjR3SS9LL3FTOFRzOTBkcStsTWgxWVkxYUJGdUFGOEF5UVZ1dk5ycnQ5eE9LSmp5SWF1L01PR0pwNDlPUmhyWFpoOXI3dWJnUFBjL25DcjNBMzZUakc5MzFIRFkrT1R5alA2dzhBS1IwMU12YWdjRnF0eG9IL2dMUFQzd2V4UkRLcklyZGJkNlRqOUFzaGNEMFBRYVRhM0JJNW9VRmExM3NJQWlUd3lyZDJ3V3FOcVYvdUFSM0FjY09yUHlSU2JVclg2My9VbGJmayszNEZ4SmR5cWRnRUxBTzNnRGd3UFRCeS8zcHZSb1dDM2dNa1VtM3BTRFQ2UmtxSmNsM2l5WFFRV0lzMVpnWFlVbzIzOWc0TTFzS3oxZm83TUFkc0FQd2JBTDloZnR2VGxOa2RBQUFBQUVsRlRrU3VRbUNDKSAyMCUgNTAlIG5vLXJlcGVhdCwjMDAwO2JveC1zaGFkb3c6I2ZmZiAwLCMwMDAgMTAwJX0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ1dHRvbi1tZW51LWxvYWQsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtbG9hZHttYXJnaW4tcmlnaHQ6MnB4fSNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnV0dG9uLW1lbnUtbG9hZCwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ1dHRvbi1tZW51LXNhdmUsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtbG9hZCwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS1zYXZle2JhY2tncm91bmQ6IzFhMWQxZjtmb250LXNpemU6OXB4IWltcG9ydGFudH0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ1dHRvbi1tZW51LWxvYWQ6aG92ZXIsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idXR0b24tbWVudS1zYXZlOmhvdmVyLCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LWxvYWQ6aG92ZXIsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtc2F2ZTpob3ZlcntiYWNrZ3JvdW5kOiMwMDB9I2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC53cmFwe2Rpc3BsYXk6bm9uZX0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZle3dpZHRoOjEwMCU7ZmxvYXQ6bGVmdH0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC53cmFwe2Rpc3BsYXk6aW5saW5lfSNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LWNsb3NlLCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LWhpZGUsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtc2hvd3tmbG9hdDpyaWdodH0jY29udHJvbEtpdCAucGFuZWwgLmFycm93LXMtbWF4e2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBRkNBWUFBQUI0a2ExVkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFHNUpSRUZVZU5waTVPRGlhbVJnWUtoandBNGFtVng4Z3hqbUwxckM4UDNyVnhROGIrRVNCaGZmSUFabU5SMjlBNWV2WFdkaVpHQzAxOVhTWkdCZ1lHQll2bVk5dzdJMTZ4b1pHQmdhV0tCRzFTOWJzKzQvQXdORFBRTURBMXlTZ1lHQmdkRW5QQWJaemdZMG1nRXdBRTlsSlQxbHJzZmZBQUFBQUVsRlRrU3VRbUNDKSBjZW50ZXIgbm8tcmVwZWF0fSNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3ctcy1taW57YmFja2dyb3VuZDp1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFGQ0FZQUFBQjRrYTFWQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQUZwSlJFRlVlTnBzaWlFT2dEQU1SZjhTeE5KeklZZkIxUFFrUTdSa1pjZkJZTG5iVUFzTDRjbjNYa2dzNk56WHFRQXdMK3ZlM1RUR0xXY0RnS1BXZDBvc2lFUmEzRnVudUxkSXBJa0ZpRVEyeHU4VUVvc0JVUHhqendBVFNqVi84cWxNR0FBQUFBQkpSVTVFcmtKZ2dnPT0pIGNlbnRlciBuby1yZXBlYXR9I2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvdy1zLW1heCwjY29udHJvbEtpdCAucGFuZWwgLmFycm93LXMtbWlue3dpZHRoOjEwMCU7aGVpZ2h0OjIwcHh9I2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvdy1iLW1heHtiYWNrZ3JvdW5kOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBREpKUkVGVWVOcHN5c0VOQUNBTUF6RTI5K2poQXhLbFBTbXZlSzJhc3pFSU1pSEk3VWZsYkNoSmZ4KzNBUUFBLy84REFQTGtTYW1IYXN0eEFBQUFBRWxGVGtTdVFtQ0MpIGNlbnRlciBuby1yZXBlYXR9I2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvdy1iLW1pbntiYWNrZ3JvdW5kOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBQzlKUkVGVWVOcUVqREVPQUNBUWd4aDhPRC9IMlJoUGtrNDBBQWowbUt2aVMyVTNUaWVuMGlFM0FBQUEvLzhEQUVkMU50SUNWNEV1QUFBQUFFbEZUa1N1UW1DQykgY2VudGVyIG5vLXJlcGVhdH0jY29udHJvbEtpdCAucGFuZWwgLmFycm93LWItc3ViLW1heHtiYWNrZ3JvdW5kOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFvQUFBQUdDQVlBQUFENjhBL0dBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBR0pKUkVGVWVOcGk5QW1QWVVBR2V6YXZxMmRnWUdCdzhRMXFSQlpuUVZka2FlL2NBR1dqS0daVzA5RkRVV1RwNE1JZ3E2REV3TURBNEhCbzF6WUdKWFhOZzNDRnlJcGdBRjB4ODZQN2R4clFGV0ZUek9nVEh0UEF3TUJRejRBZk5BQUdBTjFDS1BzNE5ETHZBQUFBQUVsRlRrU3VRbUNDKSBjZW50ZXIgbm8tcmVwZWF0fSNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3ctYi1zdWItbWlue2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQW9BQUFBR0NBWUFBQUQ2OEEvR0FBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFHOUpSRUZVZU5wOHpyRU9RREFBaE9HL0dFU1lCYnRKdkFLRDFlS0JSTitzTDFOTjU3YTdpU0RpcGt2dUcwNmtXU2FCbGYvSVpKb1h5cXFock9wUFljMk9OWnE0N1hvVnZJdEFESGxSZkNFSmJISGI5UUFxZUNkQWpDZStJNEFUUG5EdzdvRUFrdGVselJwOTlmdHdEQUNmc1MwWEFiejRQd0FBQUFCSlJVNUVya0pnZ2c9PSkgY2VudGVyIG5vLXJlcGVhdH0jY29udHJvbEtpdCAucGFuZWwgLmFycm93LWItbWF4LCNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3ctYi1taW4sI2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvdy1iLXN1Yi1tYXgsI2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvdy1iLXN1Yi1taW57d2lkdGg6MTBweDtoZWlnaHQ6MTAwJTtmbG9hdDpyaWdodH0jY29udHJvbEtpdCAucGlja2Vye3BvaW50ZXItZXZlbnRzOmF1dG87LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O2JvcmRlci1yYWRpdXM6M3B4Oy1tb3otYm9yZGVyLXJhZGl1czozcHg7YmFja2dyb3VuZC1jb2xvcjojM2IzYjNiO2ZvbnQtZmFtaWx5OkFyaWFsLHNhbnMtc2VyaWY7Zm9udC1zaXplOjExcHg7Y29sb3I6I2ZmZjt0ZXh0LXNoYWRvdzoxcHggMXB4ICMwMDA7b3ZlcmZsb3c6aGlkZGVuO3Bvc2l0aW9uOmFic29sdXRlO3otaW5kZXg6MjE0NzQ4MzYzMTt3aWR0aDozNjBweDstd2Via2l0LXRvdWNoLWNhbGxvdXQ6bm9uZTstd2Via2l0LXVzZXItc2VsZWN0Om5vbmU7LWtodG1sLXVzZXItc2VsZWN0Om5vbmU7LW1vei11c2VyLXNlbGVjdDpub25lOy1tcy11c2VyLXNlbGVjdDpub25lO3VzZXItc2VsZWN0Om5vbmU7Ym94LXNoYWRvdzowIDJweCAycHggcmdiYSgwLDAsMCwuMjUpfSNjb250cm9sS2l0IC5waWNrZXIgY2FudmFze3ZlcnRpY2FsLWFsaWduOmJvdHRvbTtjdXJzb3I6cG9pbnRlcn0jY29udHJvbEtpdCAucGlja2VyIC53cmFwey13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveDtwYWRkaW5nOjEwcHg7ZmxvYXQ6bGVmdH0jY29udHJvbEtpdCAucGlja2VyIC5maWVsZC13cmFwe3BhZGRpbmc6M3B4fSNjb250cm9sS2l0IC5waWNrZXIgLnNsaWRlci13cmFwe3BhZGRpbmc6M3B4IDEzcHggM3B4IDNweH0jY29udHJvbEtpdCAucGlja2VyIC5maWVsZC13cmFwLCNjb250cm9sS2l0IC5waWNrZXIgLmlucHV0LXdyYXAsI2NvbnRyb2xLaXQgLnBpY2tlciAuc2xpZGVyLXdyYXB7aGVpZ2h0OmF1dG87b3ZlcmZsb3c6aGlkZGVuO2Zsb2F0OmxlZnR9I2NvbnRyb2xLaXQgLnBpY2tlciAuaW5wdXQtd3JhcHstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym9yZGVyOjFweCBzb2xpZCAjMjQyNDI0O2JvcmRlci1yYWRpdXM6MnB4Oy1tb3otYm9yZGVyLXJhZGl1czoycHg7d2lkdGg6MTQwcHg7ZmxvYXQ6cmlnaHQ7cGFkZGluZzo1cHggMTBweCAxcHggMH0jY29udHJvbEtpdCAucGlja2VyIC5pbnB1dC1maWVsZHt3aWR0aDo1MCU7ZmxvYXQ6cmlnaHQ7bWFyZ2luLWJvdHRvbTo0cHh9I2NvbnRyb2xLaXQgLnBpY2tlciAuaW5wdXQtZmllbGQgLmxhYmVse3BhZGRpbmc6OHB4IDAgMDtjb2xvcjojODc4Nzg3O3RleHQtYWxpZ246Y2VudGVyO3RleHQtdHJhbnNmb3JtOnVwcGVyY2FzZTtmb250LXdlaWdodDo3MDA7dGV4dC1zaGFkb3c6MXB4IDFweCAjMWExYTFhO3dpZHRoOjQwJX0jY29udHJvbEtpdCAucGlja2VyIC5pbnB1dC1maWVsZCAud3JhcHtwYWRkaW5nOjA7d2lkdGg6NjAlO2hlaWdodDphdXRvO2Zsb2F0OnJpZ2h0fSNjb250cm9sS2l0IC5waWNrZXIgLmNvbnRyb2xzLXdyYXB7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O3dpZHRoOjEwMCU7aGVpZ2h0OmF1dG87ZmxvYXQ6cmlnaHQ7cGFkZGluZzo5cHggMCAwfSNjb250cm9sS2l0IC5waWNrZXIgLmNvbnRyb2xzLXdyYXAgaW5wdXRbdHlwZT1idXR0b25de2Zsb2F0OnJpZ2h0O3dpZHRoOjY1cHg7bWFyZ2luOjAgMCAwIDEwcHh9I2NvbnRyb2xLaXQgLnBpY2tlciAuY29sb3ItY29udHJhc3R7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O2JvcmRlcjpub25lO2JveC1zaGFkb3c6MCAwIDAgMXB4ICMxZjFmMWYgaW5zZXQ7Ym9yZGVyLXJhZGl1czoycHg7LW1vei1ib3JkZXItcmFkaXVzOjJweDtoZWlnaHQ6MjVweDtwYWRkaW5nOjNweDt3aWR0aDo4MCU7bWFyZ2luLWJvdHRvbTo0cHg7ZmxvYXQ6cmlnaHR9I2NvbnRyb2xLaXQgLnBpY2tlciAuY29sb3ItY29udHJhc3QgZGl2e3dpZHRoOjUwJTtoZWlnaHQ6MTAwJTtmbG9hdDpsZWZ0fSNjb250cm9sS2l0IC5waWNrZXIgaW5wdXRbdHlwZT10ZXh0XXtwYWRkaW5nOjA7dGV4dC1hbGlnbjpjZW50ZXI7d2lkdGg6NjAlO2Zsb2F0OnJpZ2h0fSNjb250cm9sS2l0IC5waWNrZXIgLndyYXAgLmlucHV0LXdyYXA6bnRoLW9mLXR5cGUoMyl7Ym9yZGVyLWJvdHRvbS1sZWZ0LXJhZGl1czowO2JvcmRlci1ib3R0b20tcmlnaHQtcmFkaXVzOjB9I2NvbnRyb2xLaXQgLnBpY2tlciAud3JhcCAuaW5wdXQtd3JhcDpudGgtb2YtdHlwZSg0KXtib3JkZXItdG9wOm5vbmU7Ym9yZGVyLXRvcC1sZWZ0LXJhZGl1czowO2JvcmRlci10b3AtcmlnaHQtcmFkaXVzOjB9I2NvbnRyb2xLaXQgLnBpY2tlciAud3JhcCAuaW5wdXQtd3JhcDpudGgtb2YtdHlwZSg0KSAuaW5wdXQtZmllbGR7d2lkdGg6MTAwJX0jY29udHJvbEtpdCAucGlja2VyIC53cmFwIC5pbnB1dC13cmFwOm50aC1vZi10eXBlKDQpIC5pbnB1dC1maWVsZCAubGFiZWx7d2lkdGg6MjAlfSNjb250cm9sS2l0IC5waWNrZXIgLndyYXAgLmlucHV0LXdyYXA6bnRoLW9mLXR5cGUoNCkgaW5wdXRbdHlwZT10ZXh0XXt3aWR0aDo4MCV9I2NvbnRyb2xLaXQgLnBpY2tlciAuZmllbGQtd3JhcCwjY29udHJvbEtpdCAucGlja2VyIC5zbGlkZXItd3JhcHtiYWNrZ3JvdW5kOiMxZTIyMjQ7Ym9yZGVyOm5vbmU7Ym94LXNoYWRvdzowIDAgMCAxcHggIzFmMWYxZiBpbnNldDtib3JkZXItcmFkaXVzOjJweDstbW96LWJvcmRlci1yYWRpdXM6MnB4O3Bvc2l0aW9uOnJlbGF0aXZlO21hcmdpbi1yaWdodDo1cHh9I2NvbnRyb2xLaXQgLnBpY2tlciAuZmllbGQtd3JhcCAuaW5kaWNhdG9yLCNjb250cm9sS2l0IC5waWNrZXIgLnNsaWRlci13cmFwIC5pbmRpY2F0b3J7cG9zaXRpb246YWJzb2x1dGU7Ym9yZGVyOjJweCBzb2xpZCAjZmZmO2JveC1zaGFkb3c6MCAxcHggYmxhY2ssMCAxcHggIzAwMCBpbnNldDtjdXJzb3I6cG9pbnRlcn0jY29udHJvbEtpdCAucGlja2VyIC5maWVsZC13cmFwIC5pbmRpY2F0b3J7d2lkdGg6OHB4O2hlaWdodDo4cHg7bGVmdDo1MCU7dG9wOjUwJTtib3JkZXItcmFkaXVzOjUwJTstbW96LWJvcmRlci1yYWRpdXM6NTAlfSNjb250cm9sS2l0IC5waWNrZXIgLnNsaWRlci13cmFwIC5pbmRpY2F0b3J7d2lkdGg6MTRweDtoZWlnaHQ6M3B4O2JvcmRlci1yYWRpdXM6OHB4Oy1tb3otYm9yZGVyLXJhZGl1czo4cHg7bGVmdDoxcHg7dG9wOjFweH0jY29udHJvbEtpdCAucGlja2VyIC5zbGlkZXItd3JhcCAuaW5kaWNhdG9yOmFmdGVye2NvbnRlbnQ6Jyc7d2lkdGg6MDtoZWlnaHQ6MDtib3JkZXItdG9wOjQuNXB4IHNvbGlkIHRyYW5zcGFyZW50O2JvcmRlci1ib3R0b206NC41cHggc29saWQgdHJhbnNwYXJlbnQ7Ym9yZGVyLXJpZ2h0OjRweCBzb2xpZCAjZmZmO2Zsb2F0OnJpZ2h0O3Bvc2l0aW9uOmFic29sdXRlO3RvcDotMnB4O2xlZnQ6MTlweH0jY29udHJvbEtpdCAucGlja2VyIC5zbGlkZXItd3JhcCAuaW5kaWNhdG9yOmJlZm9yZXtjb250ZW50OicnO3dpZHRoOjA7aGVpZ2h0OjA7Ym9yZGVyLXRvcDo0LjVweCBzb2xpZCB0cmFuc3BhcmVudDtib3JkZXItYm90dG9tOjQuNXB4IHNvbGlkIHRyYW5zcGFyZW50O2JvcmRlci1yaWdodDo0cHggc29saWQgIzAwMDtmbG9hdDpyaWdodDtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6LTNweDtsZWZ0OjE5cHh9XCJcbn07IFxubW9kdWxlLmV4cG9ydHMgPSBTdHlsZTsiLCJmdW5jdGlvbiBFdmVudF8oc2VuZGVyLHR5cGUsZGF0YSkge1xuICAgIHRoaXMuc2VuZGVyID0gc2VuZGVyO1xuICAgIHRoaXMudHlwZSAgID0gdHlwZTtcbiAgICB0aGlzLmRhdGEgICA9IGRhdGE7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50XzsiLCJmdW5jdGlvbiBFdmVudERpc3BhdGNoZXIoKSB7XG4gICAgdGhpcy5fbGlzdGVuZXJzID0gW107XG59O1xuXG5FdmVudERpc3BhdGNoZXIucHJvdG90eXBlID0ge1xuICAgIGFkZEV2ZW50TGlzdGVuZXI6IGZ1bmN0aW9uIChldmVudFR5cGUsIGxpc3RlbmVyLCBjYWxsYmFja01ldGhvZCkge1xuICAgICAgICB0aGlzLl9saXN0ZW5lcnNbZXZlbnRUeXBlXSA9IHRoaXMuX2xpc3RlbmVyc1tldmVudFR5cGVdIHx8IFtdO1xuICAgICAgICB0aGlzLl9saXN0ZW5lcnNbZXZlbnRUeXBlXS5wdXNoKHtvYmo6IGxpc3RlbmVyLCBtZXRob2Q6IGNhbGxiYWNrTWV0aG9kfSk7XG4gICAgfSxcblxuICAgIGRpc3BhdGNoRXZlbnQ6IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICB2YXIgdHlwZSA9IGV2ZW50LnR5cGU7XG5cbiAgICAgICAgaWYgKCF0aGlzLmhhc0V2ZW50TGlzdGVuZXIodHlwZSkpe1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGxpc3RlbmVycyA9IHRoaXMuX2xpc3RlbmVyc1t0eXBlXTtcbiAgICAgICAgdmFyIGkgPSAtMSwgbCA9IGxpc3RlbmVycy5sZW5ndGg7XG5cbiAgICAgICAgdmFyIG9iaiwgbWV0aG9kO1xuXG4gICAgICAgIHdoaWxlICgrK2kgPCBsKSB7XG4gICAgICAgICAgICBvYmogPSBsaXN0ZW5lcnNbaV0ub2JqO1xuICAgICAgICAgICAgbWV0aG9kID0gbGlzdGVuZXJzW2ldLm1ldGhvZDtcblxuICAgICAgICAgICAgaWYgKCFvYmpbbWV0aG9kXSl7XG4gICAgICAgICAgICAgICAgdGhyb3cgb2JqICsgJyBoYXMgbm8gbWV0aG9kICcgKyBtZXRob2Q7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG9ialttZXRob2RdKGV2ZW50KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICByZW1vdmVFdmVudExpc3RlbmVyOiBmdW5jdGlvbiAodHlwZSwgb2JqLCBtZXRob2QpIHtcbiAgICAgICAgaWYgKCF0aGlzLmhhc0V2ZW50TGlzdGVuZXIodHlwZSkpe1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGxpc3RlbmVycyA9IHRoaXMuX2xpc3RlbmVyc1t0eXBlXTtcblxuICAgICAgICB2YXIgaSA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgICAgIHdoaWxlICgtLWkgPiAtMSkge1xuICAgICAgICAgICAgaWYgKGxpc3RlbmVyc1tpXS5vYmogPT0gb2JqICYmIGxpc3RlbmVyc1tpXS5tZXRob2QgPT0gbWV0aG9kKSB7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXJzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgICAgICBpZiAobGlzdGVuZXJzLmxlbmd0aCA9PSAwKXtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2xpc3RlbmVyc1t0eXBlXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgcmVtb3ZlQWxsRXZlbnRMaXN0ZW5lcnM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fbGlzdGVuZXJzID0gW107XG4gICAgfSxcblxuICAgIGhhc0V2ZW50TGlzdGVuZXI6IGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9saXN0ZW5lcnNbdHlwZV0gIT0gdW5kZWZpbmVkICYmIHRoaXMuX2xpc3RlbmVyc1t0eXBlXSAhPSBudWxsO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRXZlbnREaXNwYXRjaGVyOyIsInZhciBMYXlvdXRNb2RlID0ge1xuICAgIExFRlQgICA6ICdsZWZ0JyxcbiAgICBSSUdIVCAgOiAncmlnaHQnLFxuICAgIFRPUCAgICA6ICd0b3AnLFxuICAgIEJPVFRPTSA6ICdib3R0b20nLFxuICAgIE5PTkUgICA6ICdub25lJ1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBMYXlvdXRNb2RlOyIsInZhciBOb2RlICAgPSByZXF1aXJlKCcuLi9kb2N1bWVudC9Ob2RlJyk7XG52YXIgTWV0cmljID0gcmVxdWlyZSgnLi4vLi4vY29tcG9uZW50L01ldHJpYycpO1xudmFyIENTUyAgICA9IHJlcXVpcmUoJy4uL2RvY3VtZW50L0NTUycpO1xudmFyIERvY3VtZW50RXZlbnQgPSByZXF1aXJlKCcuLi9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXG4gICAgTm9kZUV2ZW50ICAgICA9IHJlcXVpcmUoJy4uL2RvY3VtZW50L05vZGVFdmVudCcpO1xudmFyIE1vdXNlICA9IHJlcXVpcmUoJy4uL2RvY3VtZW50L01vdXNlJyk7XG5cbmZ1bmN0aW9uIFNjcm9sbEJhcihwYXJlbnROb2RlLHRhcmdldE5vZGUsd3JhcEhlaWdodCkge1xuICAgIHRoaXMuX3BhcmVudE5vZGUgPSBwYXJlbnROb2RlO1xuICAgIHRoaXMuX3RhcmdldE5vZGUgPSB0YXJnZXROb2RlO1xuICAgIHRoaXMuX3dyYXBIZWlnaHQgPSB3cmFwSGVpZ2h0O1xuXG4gICAgdmFyIHdyYXAgICA9IHRoaXMuX3dyYXBOb2RlICAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlNjcm9sbFdyYXApLFxuICAgICAgICBub2RlICAgPSB0aGlzLl9ub2RlICAgICAgID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5TY3JvbGxCYXIpLFxuICAgICAgICB0cmFjayAgPSB0aGlzLl90cmFja05vZGUgID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5TY3JvbGxCYXJUcmFjayksXG4gICAgICAgIHRodW1iICA9IHRoaXMuX3RodW1iTm9kZSAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlNjcm9sbEJhclRodW1iKTtcblxuICAgIHBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGFyZ2V0Tm9kZSk7XG4gICAgcGFyZW50Tm9kZS5hZGRDaGlsZCh3cmFwKTtcbiAgICBwYXJlbnROb2RlLmFkZENoaWxkQXQobm9kZSwwKTtcblxuICAgIHdyYXAuYWRkQ2hpbGQodGFyZ2V0Tm9kZSk7XG4gICAgbm9kZS5hZGRDaGlsZCh0cmFjayk7XG4gICAgdHJhY2suYWRkQ2hpbGQodGh1bWIpO1xuXG4gICAgdGhpcy5fbW91c2VUaHVtYk9mZnNldCA9IDA7XG4gICAgdGhpcy5fc2Nyb2xsSGVpZ2h0ID0gMDtcbiAgICB0aGlzLl9zY3JvbGxVbml0ICAgPSAwO1xuICAgIHRoaXMuX3Njcm9sbE1pbiAgICA9IDA7XG4gICAgdGhpcy5fc2Nyb2xsTWF4ICAgID0gMDtcblxuICAgIHRodW1iLnNldFBvc2l0aW9uWShNZXRyaWMuU0NST0xMQkFSX1RSQUNLX1BBRERJTkcpO1xuICAgIHRodW1iLmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9ET1dOLHRoaXMuX29uVGh1bWJEcmFnU3RhcnQuYmluZCh0aGlzKSk7XG5cbiAgICB0aGlzLl9pc1ZhbGlkICA9IGZhbHNlO1xuICAgIHRoaXMuX2VuYWJsZWQgPSBmYWxzZTtcblxuICAgIHZhciBub2RlRWxlbWVudCA9IG5vZGUuZ2V0RWxlbWVudCgpLFxuICAgICAgICB0aHVtYkVsZW1lbnQgPSB0aHVtYi5nZXRFbGVtZW50KCk7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuX29uTW91c2VXaGVlbCA9IGZ1bmN0aW9uKGUpe1xuICAgICAgICB2YXIgc2VuZGVyID0gZS5zZW5kZXIsXG4gICAgICAgICAgICBob3ZlckVsZW1lbnQgPSBzZW5kZXIuZ2V0SG92ZXJFbGVtZW50KCk7XG4gICAgICAgIGlmKGhvdmVyRWxlbWVudCAhPSBub2RlRWxlbWVudCAmJiBob3ZlckVsZW1lbnQgIT0gdGh1bWJFbGVtZW50KXtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc2Nyb2xsU3RlcCA9IHNlbGYuX3Njcm9sbEhlaWdodCAqIDAuMDEyNTtcbiAgICAgICAgc2VsZi5fc2Nyb2xsKHRodW1iLmdldFBvc2l0aW9uWSgpICsgc2VuZGVyLmdldFdoZWVsRGlyZWN0aW9uKCkgKiBzY3JvbGxTdGVwICogLTEpO1xuICAgICAgICBlLmRhdGEucHJldmVudERlZmF1bHQoKTtcbiAgICB9O1xuXG4gICAgdGhpcy5hZGRNb3VzZUxpc3RlbmVyKCk7XG59XG5cblNjcm9sbEJhci5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgdGFyZ2V0ID0gdGhpcy5fdGFyZ2V0Tm9kZSxcbiAgICAgICAgdGh1bWIgPSB0aGlzLl90aHVtYk5vZGU7XG5cbiAgICB2YXIgcGFkZGluZyA9IE1ldHJpYy5TQ1JPTExCQVJfVFJBQ0tfUEFERElORztcblxuICAgIHZhciB0YXJnZXRXcmFwSGVpZ2h0ID0gdGhpcy5fd3JhcEhlaWdodCxcbiAgICAgICAgdGFyZ2V0SGVpZ2h0ID0gdGFyZ2V0LmdldEhlaWdodCgpLFxuICAgICAgICB0cmFja0hlaWdodCA9IHRhcmdldFdyYXBIZWlnaHQgLSBwYWRkaW5nICogMjtcblxuICAgIHRodW1iLnNldEhlaWdodCh0cmFja0hlaWdodCk7XG5cbiAgICB2YXIgcmF0aW8gPSB0YXJnZXRXcmFwSGVpZ2h0IC8gdGFyZ2V0SGVpZ2h0O1xuXG4gICAgdGhpcy5faXNWYWxpZCA9IGZhbHNlO1xuXG4gICAgaWYgKHJhdGlvID4gMS4wKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGh1bWJIZWlnaHQgPSB0cmFja0hlaWdodCAqIHJhdGlvO1xuXG4gICAgdGhpcy5fc2Nyb2xsSGVpZ2h0ID0gdHJhY2tIZWlnaHQ7XG4gICAgdGhpcy5fc2Nyb2xsVW5pdCAgID0gdGFyZ2V0SGVpZ2h0IC0gdGhpcy5fc2Nyb2xsSGVpZ2h0IC0gcGFkZGluZyAqIDI7XG4gICAgdGhpcy5fc2Nyb2xsTWluICAgID0gcGFkZGluZztcbiAgICB0aGlzLl9zY3JvbGxNYXggICAgPSBwYWRkaW5nICsgdHJhY2tIZWlnaHQgLSB0aHVtYkhlaWdodDtcblxuICAgIHRodW1iLnNldEhlaWdodCh0aHVtYkhlaWdodCk7XG5cbiAgICB0aGlzLl9pc1ZhbGlkID0gdHJ1ZTtcbn07XG5cblNjcm9sbEJhci5wcm90b3R5cGUuX3Njcm9sbCA9IGZ1bmN0aW9uKHkpe1xuICAgIHZhciBtaW4gID0gdGhpcy5fc2Nyb2xsTWluLFxuICAgICAgICBtYXggID0gdGhpcy5fc2Nyb2xsTWF4LFxuICAgICAgICBwb3MgID0gTWF0aC5tYXgobWluLCBNYXRoLm1pbih5LG1heCkpLFxuICAgICAgICBwb3NfID0gKHBvcy1taW4pLyhtYXgtbWluKTtcblxuICAgIHRoaXMuX3RodW1iTm9kZS5zZXRQb3NpdGlvblkocG9zKTtcbiAgICB0aGlzLl90YXJnZXROb2RlLnNldFBvc2l0aW9uWShwb3NfICogdGhpcy5fc2Nyb2xsVW5pdCAqIC0xKTtcbn07XG5cblxuU2Nyb2xsQmFyLnByb3RvdHlwZS5fb25UaHVtYkRyYWdTdGFydCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMuX2lzVmFsaWQgfHwgdGhpcy5fZW5hYmxlZCl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGV2ZW50TW92ZSA9IERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSxcbiAgICAgICAgZXZlbnRVcCA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XG5cbiAgICB2YXIgbW91c2UgPSBNb3VzZS5nZXQoKTtcbiAgICB2YXIgdHJhY2tPZmZzZXQgPSB0aGlzLl90cmFja05vZGUuZ2V0UG9zaXRpb25HbG9iYWxZKCk7XG5cbiAgICB0aGlzLl9tb3VzZVRodW1iT2Zmc2V0ID0gbW91c2UuZ2V0WSgpIC0gdGhpcy5fdGh1bWJOb2RlLmdldFBvc2l0aW9uR2xvYmFsWSgpO1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBvbkRyYWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLl9zY3JvbGwobW91c2UuZ2V0WSgpIC0gdHJhY2tPZmZzZXQgLSBzZWxmLl9tb3VzZVRodW1iT2Zmc2V0KTtcbiAgICAgICAgfSxcbiAgICAgICAgb25EcmFnRW5kID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudFVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcbiAgICAgICAgfTtcblxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50VXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xuICAgIHRoaXMuX3Njcm9sbChtb3VzZS5nZXRZKCkgLSB0cmFja09mZnNldCAtIHNlbGYuX21vdXNlVGh1bWJPZmZzZXQpO1xufTtcblxuXG5TY3JvbGxCYXIucHJvdG90eXBlLmVuYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9lbmFibGVkID0gZmFsc2U7XG4gICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xufTtcblxuU2Nyb2xsQmFyLnByb3RvdHlwZS5kaXNhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2VuYWJsZWQgPSB0cnVlO1xuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbn07XG5TY3JvbGxCYXIucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX3Njcm9sbCgwKTtcbn07XG5cblNjcm9sbEJhci5wcm90b3R5cGUuX3VwZGF0ZUFwcGVhcmFuY2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuX2VuYWJsZWQpIHtcbiAgICAgICAgdGhpcy5fbm9kZS5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAgICAgdGhpcy5fdGFyZ2V0Tm9kZS5zZXRQb3NpdGlvblkoMCk7XG4gICAgICAgIHRoaXMuX3RodW1iTm9kZS5zZXRQb3NpdGlvblkoTWV0cmljLlNDUk9MTEJBUl9UUkFDS19QQURESU5HKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9ub2RlLnNldFN0eWxlUHJvcGVydHkoJ2Rpc3BsYXknLCAnYmxvY2snKTtcbiAgICB9XG59O1xuXG5TY3JvbGxCYXIucHJvdG90eXBlLmlzVmFsaWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2lzVmFsaWQ7XG59O1xuXG5TY3JvbGxCYXIucHJvdG90eXBlLnNldFdyYXBIZWlnaHQgPSBmdW5jdGlvbiAoaGVpZ2h0KSB7XG4gICAgdGhpcy5fd3JhcEhlaWdodCA9IGhlaWdodDtcbiAgICB0aGlzLnVwZGF0ZSgpO1xufTtcblxuU2Nyb2xsQmFyLnByb3RvdHlwZS5yZW1vdmVUYXJnZXROb2RlID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl93cmFwTm9kZS5yZW1vdmVDaGlsZCh0aGlzLl90YXJnZXROb2RlKTtcbn07XG5cblNjcm9sbEJhci5wcm90b3R5cGUucmVtb3ZlTW91c2VMaXN0ZW5lciA9IGZ1bmN0aW9uKCl7XG4gICAgTW91c2UuZ2V0KCkucmVtb3ZlRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX1dIRUVMLHRoaXMsJ19vbk1vdXNlV2hlZWwnKTtcbn07XG5cblNjcm9sbEJhci5wcm90b3R5cGUuYWRkTW91c2VMaXN0ZW5lciA9IGZ1bmN0aW9uKCl7XG4gICAgTW91c2UuZ2V0KCkuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX1dIRUVMLHRoaXMsJ19vbk1vdXNlV2hlZWwnKTtcbn07XG5cblNjcm9sbEJhci5wcm90b3R5cGUucmVtb3ZlRnJvbVBhcmVudCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcGFyZW50Tm9kZSA9IHRoaXMuX3BhcmVudE5vZGUsXG4gICAgICAgIHJvb3ROb2RlID0gdGhpcy5fbm9kZSxcbiAgICAgICAgdGFyZ2V0Tm9kZSA9IHRoaXMuX3RhcmdldE5vZGU7XG5cbiAgICByb290Tm9kZS5yZW1vdmVDaGlsZCh0YXJnZXROb2RlKTtcbiAgICBwYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMuX3dyYXBOb2RlKTtcbiAgICBwYXJlbnROb2RlLnJlbW92ZUNoaWxkKHJvb3ROb2RlKTtcblxuICAgIHJldHVybiB0YXJnZXROb2RlO1xufTtcblxuU2Nyb2xsQmFyLnByb3RvdHlwZS5nZXRXcmFwTm9kZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fd3JhcE5vZGU7XG59O1xuXG5TY3JvbGxCYXIucHJvdG90eXBlLmdldE5vZGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX25vZGU7XG59O1xuXG5TY3JvbGxCYXIucHJvdG90eXBlLmdldFRhcmdldE5vZGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3RhcmdldE5vZGU7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gU2Nyb2xsQmFyOyIsInZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50RGlzcGF0Y2hlcicpO1xudmFyIE5vZGUgICAgICAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xudmFyIFNjcm9sbEJhciAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvbGF5b3V0L1Njcm9sbEJhcicpO1xuXG5mdW5jdGlvbiBBYnN0cmFjdEdyb3VwKHBhcmVudCwgcGFyYW1zKSB7XG4gICAgRXZlbnREaXNwYXRjaGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICBwYXJhbXMgPSBwYXJhbXMgfHwge307XG4gICAgcGFyYW1zLmhlaWdodCA9IHBhcmFtcy5oZWlnaHQgfHwgbnVsbDtcbiAgICBwYXJhbXMuZW5hYmxlID0gcGFyYW1zLmVuYWJsZSA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IHBhcmFtcy5lbmFibGU7XG5cbiAgICB0aGlzLl9wYXJlbnQgPSBwYXJlbnQ7XG4gICAgdGhpcy5faGVpZ2h0ID0gcGFyYW1zLmhlaWdodDtcbiAgICB0aGlzLl9lbmFibGVkID0gcGFyYW1zLmVuYWJsZTtcbiAgICB0aGlzLl9zY3JvbGxCYXIgPSBudWxsO1xuXG4gICAgdGhpcy5fbm9kZSA9IG5ldyBOb2RlKE5vZGUuTElTVF9JVEVNKTtcbiAgICB0aGlzLl93cmFwTm9kZSA9IG5ldyBOb2RlKCk7XG4gICAgdGhpcy5fbGlzdE5vZGUgPSBuZXcgTm9kZShOb2RlLkxJU1QpO1xuXG4gICAgdGhpcy5fcGFyZW50LmdldExpc3QoKS5hZGRDaGlsZCh0aGlzLl9ub2RlKTtcbn1cbkFic3RyYWN0R3JvdXAucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudERpc3BhdGNoZXIucHJvdG90eXBlKTtcbkFic3RyYWN0R3JvdXAucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQWJzdHJhY3RHcm91cDtcblxuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUuYWRkU2Nyb2xsV3JhcCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgd3JhcE5vZGUgPSB0aGlzLl93cmFwTm9kZSxcbiAgICAgICAgbWF4SGVpZ2h0ID0gdGhpcy5nZXRNYXhIZWlnaHQoKTtcblxuICAgIHRoaXMuX3Njcm9sbEJhciA9IG5ldyBTY3JvbGxCYXIod3JhcE5vZGUsIHRoaXMuX2xpc3ROb2RlLCBtYXhIZWlnaHQpO1xuICAgIGlmICh0aGlzLmlzRW5hYmxlZCgpKSB7XG4gICAgICAgIHdyYXBOb2RlLnNldEhlaWdodChtYXhIZWlnaHQpO1xuICAgIH1cbn07XG5cbkFic3RyYWN0R3JvdXAucHJvdG90eXBlLnByZXZlbnRTZWxlY3REcmFnID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX3BhcmVudC5wcmV2ZW50U2VsZWN0RHJhZygpO1xuXG4gICAgaWYgKCF0aGlzLmhhc1Njcm9sbFdyYXAoKSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX3dyYXBOb2RlLmdldEVsZW1lbnQoKS5zY3JvbGxUb3AgPSAwO1xufTtcblxuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUuaGFzTWF4SGVpZ2h0ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9oZWlnaHQgIT0gbnVsbDtcbn07XG5cbkFic3RyYWN0R3JvdXAucHJvdG90eXBlLmdldE1heEhlaWdodCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5faGVpZ2h0O1xufTtcblxuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUuaGFzU2Nyb2xsV3JhcCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fc2Nyb2xsQmFyICE9IG51bGw7XG59O1xuXG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZS5oYXNMYWJlbCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fbGFibE5vZGUgIT0gbnVsbDtcbn07XG5cbkFic3RyYWN0R3JvdXAucHJvdG90eXBlLmRpc2FibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fZW5hYmxlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbn07XG5cbkFic3RyYWN0R3JvdXAucHJvdG90eXBlLmVuYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9lbmFibGVkID0gdHJ1ZTtcbiAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XG59O1xuXG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZS5pc0Rpc2FibGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAhdGhpcy5fZW5hYmxlZDtcbn07XG5cbkFic3RyYWN0R3JvdXAucHJvdG90eXBlLmlzRW5hYmxlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fZW5hYmxlZDtcbn07XG5cbkFic3RyYWN0R3JvdXAucHJvdG90eXBlLmdldExpc3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2xpc3ROb2RlO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBBYnN0cmFjdEdyb3VwO1xuXG4iLCJ2YXIgQWJzdHJhY3RHcm91cCA9IHJlcXVpcmUoJy4vQWJzdHJhY3RHcm91cCcpO1xudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG52YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xuXG52YXIgU3ViR3JvdXAgPSByZXF1aXJlKCcuL1N1Ykdyb3VwJyk7XG5cbnZhciBFdmVudF8gPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXG4gICAgRG9jdW1lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxuICAgIE5vZGVFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50JyksXG4gICAgUGFuZWxFdmVudCA9IHJlcXVpcmUoJy4vUGFuZWxFdmVudCcpLFxuICAgIEdyb3VwRXZlbnQgPSByZXF1aXJlKCcuL0dyb3VwRXZlbnQnKTtcblxudmFyIE9iamVjdENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvT2JqZWN0Q29tcG9uZW50JyksXG4gICAgVmFsdWVQbG90dGVyICAgID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L1ZhbHVlUGxvdHRlcicpLFxuICAgIEZ1bmN0aW9uUGxvdHRlciA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9GdW5jdGlvblBsb3R0ZXInKTtcblxuZnVuY3Rpb24gR3JvdXAocGFyZW50LHBhcmFtcykge1xuICAgIHBhcmFtcyAgICAgICAgICAgPSBwYXJhbXMgfHwge307XG4gICAgcGFyYW1zLmxhYmVsICAgICA9IHBhcmFtcy5sYWJlbCAgICAgfHwgbnVsbDtcbiAgICBwYXJhbXMudXNlTGFiZWxzID0gcGFyYW1zLnVzZUxhYmVscyB8fCB0cnVlO1xuICAgIHBhcmFtcy5lbmFibGUgICAgPSBwYXJhbXMuZW5hYmxlICAgICA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IHBhcmFtcy5lbmFibGU7XG5cbiAgICBBYnN0cmFjdEdyb3VwLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuICAgIHRoaXMuX2NvbXBvbmVudHMgPSBbXTtcbiAgICB0aGlzLl9zdWJHcm91cHMgID0gW107XG5cbiAgICB2YXIgcm9vdCA9IHRoaXMuX25vZGUsXG4gICAgICAgIHdyYXAgPSB0aGlzLl93cmFwTm9kZSxcbiAgICAgICAgbGlzdCA9IHRoaXMuX2xpc3ROb2RlO1xuXG4gICAgICAgIHJvb3Quc2V0U3R5bGVDbGFzcyhDU1MuR3JvdXApO1xuICAgICAgICB3cmFwLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApO1xuICAgICAgICBsaXN0LnNldFN0eWxlQ2xhc3MoQ1NTLlN1Ykdyb3VwTGlzdCk7XG5cbiAgICAgICAgd3JhcC5hZGRDaGlsZChsaXN0KTtcblxuICAgIHZhciBsYWJlbCA9IHBhcmFtcy5sYWJlbDtcblxuICAgIGlmKGxhYmVsKXtcbiAgICAgICAgdmFyIGhlYWQgID0gbmV3IE5vZGUoKSxcbiAgICAgICAgICAgIHdyYXBfID0gbmV3IE5vZGUoKSxcbiAgICAgICAgICAgIGxhYmVsXyAgPSBuZXcgTm9kZShOb2RlLlNQQU4pLFxuICAgICAgICAgICAgaW5kaWNhdG9yID0gdGhpcy5faW5kaU5vZGUgPSBuZXcgTm9kZSgpO1xuXG4gICAgICAgICAgICBoZWFkLnNldFN0eWxlQ2xhc3MoQ1NTLkhlYWQpO1xuICAgICAgICAgICAgd3JhcF8uc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCk7XG4gICAgICAgICAgICBsYWJlbF8uc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpO1xuICAgICAgICAgICAgaW5kaWNhdG9yLnNldFN0eWxlQ2xhc3MoQ1NTLkFycm93Qk1heCk7XG4gICAgICAgICAgICBsYWJlbF8uc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsbGFiZWwpO1xuXG4gICAgICAgICAgICBoZWFkLmFkZENoaWxkKGluZGljYXRvcik7XG4gICAgICAgICAgICB3cmFwXy5hZGRDaGlsZChsYWJlbF8pO1xuICAgICAgICAgICAgaGVhZC5hZGRDaGlsZCh3cmFwXyk7XG4gICAgICAgICAgICByb290LmFkZENoaWxkKGhlYWQpO1xuXG4gICAgICAgIGhlYWQuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTix0aGlzLl9vbkhlYWRUcmlnZ2VyLmJpbmQodGhpcykpO1xuICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5HUk9VUF9MSVNUX1NJWkVfQ0hBTkdFLHBhcmVudCwnb25Hcm91cExpc3RTaXplQ2hhbmdlJyk7XG5cbiAgICAgICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xuICAgIH1cblxuICAgIGlmKHRoaXMuaGFzTWF4SGVpZ2h0KCkpe1xuICAgICAgICB0aGlzLmFkZFNjcm9sbFdyYXAoKTtcbiAgICB9XG5cbiAgICByb290LmFkZENoaWxkKHdyYXApO1xuXG4gICAgaWYodGhpcy5oYXNNYXhIZWlnaHQoKSl7XG4gICAgICAgIGlmKCFsYWJlbCl7XG4gICAgICAgICAgICB2YXIgYnVmZmVyVG9wID0gdGhpcy5fc2Nyb2xsQnVmZmVyVG9wID0gbmV3IE5vZGUoKTtcbiAgICAgICAgICAgICAgICBidWZmZXJUb3Auc2V0U3R5bGVDbGFzcyhDU1MuU2Nyb2xsQnVmZmVyKTtcblxuICAgICAgICAgICAgcm9vdC5hZGRDaGlsZEF0KGJ1ZmZlclRvcCwwKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgYnVmZmVyQm90dG9tID0gdGhpcy5fc2Nyb2xsQnVmZmVyQm90dG9tID0gbmV3IE5vZGUoKTtcbiAgICAgICAgICAgIGJ1ZmZlckJvdHRvbS5zZXRTdHlsZUNsYXNzKENTUy5TY3JvbGxCdWZmZXIpO1xuXG4gICAgICAgIHJvb3QuYWRkQ2hpbGQoYnVmZmVyQm90dG9tKTtcbiAgICB9XG5cbiAgICBwYXJlbnQgPSB0aGlzLl9wYXJlbnQ7XG5cbiAgICBwYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihQYW5lbEV2ZW50LlBBTkVMX01PVkVfQkVHSU4sIHRoaXMsICdvblBhbmVsTW92ZUJlZ2luJyk7XG4gICAgcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoUGFuZWxFdmVudC5QQU5FTF9NT1ZFLCB0aGlzLCAnb25QYW5lbE1vdmUnKTtcbiAgICBwYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihQYW5lbEV2ZW50LlBBTkVMX01PVkVfRU5ELCB0aGlzLCAnb25QYW5lbE1vdmVFbmQnKTtcbiAgICBwYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihQYW5lbEV2ZW50LlBBTkVMX0hJREUsIHRoaXMsICdvblBhbmVsSGlkZScpO1xuICAgIHBhcmVudC5hZGRFdmVudExpc3RlbmVyKFBhbmVsRXZlbnQuUEFORUxfU0hPVywgdGhpcywgJ29uUGFuZWxTaG93Jyk7XG4gICAgcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoUGFuZWxFdmVudC5QQU5FTF9TQ1JPTExfV1JBUF9BRERFRCwgdGhpcywgJ29uUGFuZWxTY3JvbGxXcmFwQWRkZWQnKTtcbiAgICBwYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihQYW5lbEV2ZW50LlBBTkVMX1NDUk9MTF9XUkFQX1JFTU9WRUQsIHRoaXMsICdvblBhbmVsU2Nyb2xsV3JhcFJlbW92ZWQnKTtcbiAgICBwYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihQYW5lbEV2ZW50LlBBTkVMX1NJWkVfQ0hBTkdFLCB0aGlzLCAnb25QYW5lbFNpemVDaGFuZ2UnKTtcbiAgICBwYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50LldJTkRPV19SRVNJWkUsIHRoaXMsICdvbldpbmRvd1Jlc2l6ZScpO1xuXG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UscGFyZW50LCdvbkdyb3VwTGlzdFNpemVDaGFuZ2UnKTtcbn1cbkdyb3VwLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoQWJzdHJhY3RHcm91cC5wcm90b3R5cGUpO1xuR3JvdXAucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gR3JvdXA7XG5cbkdyb3VwLnByb3RvdHlwZS5vblBhbmVsTW92ZUJlZ2luID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIFBhbmVsRXZlbnQuUEFORUxfTU9WRV9CRUdJTiwgbnVsbCkpO1xufTtcblxuR3JvdXAucHJvdG90eXBlLm9uUGFuZWxNb3ZlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIFBhbmVsRXZlbnQuUEFORUxfTU9WRSwgbnVsbCkpO1xufTtcblxuR3JvdXAucHJvdG90eXBlLm9uUGFuZWxNb3ZlRW5kID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIFBhbmVsRXZlbnQuUEFORUxfTU9WRV9FTkQsIG51bGwpKTtcbn07XG5cbkdyb3VwLnByb3RvdHlwZS5vblBhbmVsU2Nyb2xsV3JhcEFkZGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UsIG51bGwpKTtcbn07XG5cbkdyb3VwLnByb3RvdHlwZS5vblBhbmVsU2Nyb2xsV3JhcFJlbW92ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSwgbnVsbCkpO1xufTtcblxuR3JvdXAucHJvdG90eXBlLm9uUGFuZWxIaWRlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIEdyb3VwRXZlbnQuU1VCR1JPVVBfRElTQUJMRSwgbnVsbCkpO1xufTtcblxuR3JvdXAucHJvdG90eXBlLm9uUGFuZWxTaG93ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIEdyb3VwRXZlbnQuU1VCR1JPVVBfRU5BQkxFLCBudWxsKSk7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUub25QYW5lbFNpemVDaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSwgbnVsbCkpO1xufTtcblxuR3JvdXAucHJvdG90eXBlLm9uV2luZG93UmVzaXplID0gZnVuY3Rpb24gKGUpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQoZSk7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUub25TdWJHcm91cFRyaWdnZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fdXBkYXRlSGVpZ2h0KCk7XG5cbiAgICBpZighdGhpcy5oYXNNYXhIZWlnaHQoKSl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHNjcm9sbEJhciA9IHRoaXMuX3Njcm9sbEJhcixcbiAgICAgICAgd3JhcCAgPSB0aGlzLl93cmFwTm9kZTtcbiAgICB2YXIgYnVmZmVyVG9wICAgID0gdGhpcy5fc2Nyb2xsQnVmZmVyVG9wLFxuICAgICAgICBidWZmZXJCb3R0b20gPSB0aGlzLl9zY3JvbGxCdWZmZXJCb3R0b207XG5cbiAgICBzY3JvbGxCYXIudXBkYXRlKCk7XG5cbiAgICBpZiAoIXNjcm9sbEJhci5pc1ZhbGlkKCkpIHtcbiAgICAgICAgc2Nyb2xsQmFyLmRpc2FibGUoKTtcbiAgICAgICAgd3JhcC5zZXRIZWlnaHQod3JhcC5nZXRDaGlsZEF0KDEpLmdldEhlaWdodCgpKTtcbiAgICAgICAgaWYgKGJ1ZmZlclRvcCl7XG4gICAgICAgICAgICBidWZmZXJUb3Auc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdub25lJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGJ1ZmZlckJvdHRvbSl7XG4gICAgICAgICAgICBidWZmZXJCb3R0b20uc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdub25lJyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHNjcm9sbEJhci5lbmFibGUoKTtcbiAgICAgICAgd3JhcC5zZXRIZWlnaHQodGhpcy5nZXRNYXhIZWlnaHQoKSk7XG5cbiAgICAgICAgaWYgKGJ1ZmZlclRvcCl7XG4gICAgICAgICAgICBidWZmZXJUb3Auc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdibG9jaycpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChidWZmZXJCb3R0b20pe1xuICAgICAgICAgICAgYnVmZmVyQm90dG9tLnNldFN0eWxlUHJvcGVydHkoJ2Rpc3BsYXknLCAnYmxvY2snKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UsbnVsbCkpO1xufTtcblxuR3JvdXAucHJvdG90eXBlLl9vbkhlYWRUcmlnZ2VyID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2VuYWJsZWQgPSAhdGhpcy5fZW5hYmxlZDtcbiAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgR3JvdXBFdmVudC5HUk9VUF9MSVNUX1NJWkVfQ0hBTkdFLCBudWxsKSk7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUuYWRkQ29tcG9uZW50ID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgQ2xhc3NfID0gYXJndW1lbnRzWzBdO1xuICAgIHZhciBhcmdzICAgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgICBhcmdzLnNoaWZ0KCk7XG4gICAgICAgIGFyZ3MudW5zaGlmdCh0aGlzLl9nZXRTdWJHcm91cCgpKTtcblxuICAgIHZhciBpbnN0YW5jZSA9IE9iamVjdC5jcmVhdGUoQ2xhc3NfLnByb3RvdHlwZSk7XG4gICAgQ2xhc3NfLmFwcGx5KGluc3RhbmNlLGFyZ3MpO1xuXG4gICAgdGhpcy5fY29tcG9uZW50cy5wdXNoKGluc3RhbmNlKTtcbiAgICB0aGlzLl91cGRhdGVIZWlnaHQoKTtcbn07XG5cbkdyb3VwLnByb3RvdHlwZS5fdXBkYXRlSGVpZ2h0ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2dldFN1Ykdyb3VwKCkudXBkYXRlKCk7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcyxHcm91cEV2ZW50LkdST1VQX1NJWkVfQ0hBTkdFLG51bGwpKTtcbiAgICBpZih0aGlzLmhhc01heEhlaWdodCgpKXtcbiAgICAgICAgdGhpcy5fc2Nyb2xsQmFyLnVwZGF0ZSgpO1xuICAgIH1cbn07XG5cbkdyb3VwLnByb3RvdHlwZS5fdXBkYXRlQXBwZWFyYW5jZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgd3JhcCA9IHRoaXMuX3dyYXBOb2RlLFxuICAgICAgICBpbmRpY2F0b3IgPSB0aGlzLl9pbmRpTm9kZTtcblxuICAgIHZhciBzY3JvbGxCYXIgPSB0aGlzLl9zY3JvbGxCYXI7XG5cbiAgICB2YXIgYnVmZmVyVG9wICAgID0gdGhpcy5fc2Nyb2xsQnVmZmVyVG9wLFxuICAgICAgICBidWZmZXJCb3R0b20gPSB0aGlzLl9zY3JvbGxCdWZmZXJCb3R0b207XG5cbiAgICBpZiAodGhpcy5pc0Rpc2FibGVkKCkpIHtcbiAgICAgICAgd3JhcC5zZXRIZWlnaHQoMCk7XG4gICAgICAgIGlmIChpbmRpY2F0b3Ipe1xuICAgICAgICAgICAgaW5kaWNhdG9yLnNldFN0eWxlQ2xhc3MoQ1NTLkFycm93Qk1pbik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc2Nyb2xsQmFyKSB7XG4gICAgICAgICAgICBpZiAoYnVmZmVyVG9wKXtcbiAgICAgICAgICAgICAgICBidWZmZXJUb3Auc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdub25lJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoYnVmZmVyQm90dG9tKXtcbiAgICAgICAgICAgICAgICBidWZmZXJCb3R0b20uc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdub25lJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmhhc01heEhlaWdodCgpKSB7XG4gICAgICAgIHZhciBtYXhIZWlnaHQgPSB0aGlzLmdldE1heEhlaWdodCgpLFxuICAgICAgICAgICAgbGlzdEhlaWdodCA9IHdyYXAuZ2V0Q2hpbGRBdCgxKS5nZXRIZWlnaHQoKTtcblxuICAgICAgICB3cmFwLnNldEhlaWdodChsaXN0SGVpZ2h0IDwgbWF4SGVpZ2h0ID8gbGlzdEhlaWdodCA6IG1heEhlaWdodCk7XG5cbiAgICAgICAgaWYgKHNjcm9sbEJhci5pc1ZhbGlkKCkpIHtcbiAgICAgICAgICAgIGlmIChidWZmZXJUb3Ape1xuICAgICAgICAgICAgICAgIGJ1ZmZlclRvcC5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ2Jsb2NrJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoYnVmZmVyQm90dG9tKXtcbiAgICAgICAgICAgICAgICBidWZmZXJCb3R0b20uc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdibG9jaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB3cmFwLmRlbGV0ZVN0eWxlUHJvcGVydHkoJ2hlaWdodCcpO1xuICAgIH1cbiAgICBpZiAoaW5kaWNhdG9yKXtcbiAgICAgICAgaW5kaWNhdG9yLnNldFN0eWxlQ2xhc3MoQ1NTLkFycm93Qk1heCk7XG4gICAgfVxufTtcblxuR3JvdXAucHJvdG90eXBlLm9uR3JvdXBTaXplVXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbiAgICBpZiAodGhpcy5oYXNNYXhIZWlnaHQoKSl7XG4gICAgICAgIHRoaXMuX3Njcm9sbEJhci51cGRhdGUoKTtcbiAgICB9XG59O1xuXG5Hcm91cC5wcm90b3R5cGUuYWRkU3ViR3JvdXAgPSBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgdGhpcy5fc3ViR3JvdXBzLnB1c2gobmV3IFN1Ykdyb3VwKHRoaXMsIHBhcmFtcykpO1xuICAgIHRoaXMuX3VwZGF0ZUhlaWdodCgpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuR3JvdXAucHJvdG90eXBlLl9nZXRTdWJHcm91cCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc3ViR3JvdXBzID0gdGhpcy5fc3ViR3JvdXBzO1xuICAgIGlmIChzdWJHcm91cHMubGVuZ3RoID09IDApe1xuICAgICAgICBzdWJHcm91cHMucHVzaChuZXcgU3ViR3JvdXAodGhpcykpO1xuICAgIH1cbiAgICByZXR1cm4gc3ViR3JvdXBzW3N1Ykdyb3Vwcy5sZW5ndGggLSAxXTtcbn07XG5cbkdyb3VwLnByb3RvdHlwZS5nZXRDb21wb25lbnRzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9jb21wb25lbnRzO1xufTtcblxuZnVuY3Rpb24gaXNEYXRhQ29tcChjb21wKXtcbiAgICByZXR1cm4gIChjb21wIGluc3RhbmNlb2YgT2JqZWN0Q29tcG9uZW50KSAmJlxuICAgICAgICAgICAhKGNvbXAgaW5zdGFuY2VvZiBWYWx1ZVBsb3R0ZXIpICYmXG4gICAgICAgICAgICEoY29tcCBpbnN0YW5jZW9mIEZ1bmN0aW9uUGxvdHRlcik7XG59XG5cblxuR3JvdXAucHJvdG90eXBlLnNldERhdGEgPSBmdW5jdGlvbihkYXRhKXtcbiAgICB2YXIgY29tcHMgPSB0aGlzLl9jb21wb25lbnRzLCBjb21wLCBkYXRhXztcbiAgICB2YXIgaSA9IC0xLCBqID0gMCwgbCA9IGNvbXBzLmxlbmd0aDtcbiAgICB3aGlsZSgrK2kgPCBsKXtcbiAgICAgICAgY29tcCA9IGNvbXBzW2ldO1xuICAgICAgICBpZighaXNEYXRhQ29tcChjb21wKSl7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBkYXRhXyA9IGRhdGFbaisrXTtcbiAgICAgICAgY29tcC5zZXRWYWx1ZShkYXRhX1tPYmplY3Qua2V5cyhkYXRhXylbMF1dKTtcbiAgICB9XG59O1xuXG5Hcm91cC5wcm90b3R5cGUuZ2V0RGF0YSA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGNvbXBzID0gdGhpcy5fY29tcG9uZW50cyxcbiAgICAgICAgaSA9IC0xLCBsID0gY29tcHMubGVuZ3RoO1xuICAgIHZhciB2YWx1ZXMgPSBbXTtcbiAgICB2YXIgY29tcDtcbiAgICB3aGlsZSgrK2kgPCBsKXtcbiAgICAgICAgY29tcCA9IGNvbXBzW2ldO1xuICAgICAgICBpZighaXNEYXRhQ29tcChjb21wKSl7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICB2YWx1ZXMucHVzaChjb21wLmdldERhdGEoKSk7XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZXM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEdyb3VwO1xuIiwidmFyIEdyb3VwRXZlbnQgPSB7XG5cdEdST1VQX1NJWkVfQ0hBTkdFICAgICAgICA6ICdncm91cFNpemVDaGFuZ2UnLFxuXHRHUk9VUF9MSVNUX1NJWkVfQ0hBTkdFICAgOiAnZ3JvdXBMaXN0U2l6ZUNoYW5nZScsXG5cdEdST1VQX1NJWkVfVVBEQVRFICAgICAgICA6ICdncm91cFNpemVVcGRhdGUnLFxuXHRTVUJHUk9VUF9UUklHR0VSICAgICAgICAgOiAnc3ViR3JvdXBUcmlnZ2VyJyxcblxuXHRTVUJHUk9VUF9FTkFCTEUgICAgICAgICAgOiAnZW5hYmxlU3ViR3JvdXAnLFxuXHRTVUJHUk9VUF9ESVNBQkxFICAgICAgICAgOiAnZGlzYWJsZVN1Ykdyb3VwJ1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBHcm91cEV2ZW50OyIsInZhciBNZW51RXZlbnQgPSB7XG5cdFVQREFURV9NRU5VOiAndXBkYXRlTWVudSdcbn07XG5tb2R1bGUuZXhwb3J0cyA9IE1lbnVFdmVudDsiLCJ2YXIgTm9kZSAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyksXG4gICAgR3JvdXAgICAgID0gcmVxdWlyZSgnLi9Hcm91cCcpLFxuICAgIFNjcm9sbEJhciA9IHJlcXVpcmUoJy4uL2NvcmUvbGF5b3V0L1Njcm9sbEJhcicpO1xuXG52YXIgQ1NTICAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG52YXIgTGF5b3V0TW9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvbGF5b3V0L0xheW91dE1vZGUnKTtcbnZhciBIaXN0b3J5ICAgID0gcmVxdWlyZSgnLi4vY29yZS9IaXN0b3J5Jyk7XG5cbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50RGlzcGF0Y2hlcicpLFxuICAgIEV2ZW50XyAgICAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcbiAgICBEb2N1bWVudEV2ZW50ICAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcbiAgICBOb2RlRXZlbnQgICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpLFxuICAgIFBhbmVsRXZlbnQgICAgICA9IHJlcXVpcmUoJy4vUGFuZWxFdmVudCcpLFxuICAgIE1lbnVFdmVudCAgICAgICA9IHJlcXVpcmUoJy4vTWVudUV2ZW50Jyk7XG5cbnZhciBNb3VzZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTW91c2UnKTtcblxudmFyIFN0cmluZ0lucHV0ICAgICA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9TdHJpbmdJbnB1dCcpLFxuICAgIE51bWJlcklucHV0ICAgICA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9OdW1iZXJJbnB1dCcpLFxuICAgIFJhbmdlICAgICAgICAgICA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9SYW5nZScpLFxuICAgIENoZWNrYm94ICAgICAgICA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9DaGVja2JveCcpLFxuICAgIENvbG9yICAgICAgICAgICA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9Db2xvcicpLFxuICAgIEJ1dHRvbiAgICAgICAgICA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9CdXR0b24nKSxcbiAgICBTZWxlY3QgICAgICAgICAgPSByZXF1aXJlKCcuLi9jb21wb25lbnQvU2VsZWN0JyksXG4gICAgU2xpZGVyICAgICAgICAgID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L1NsaWRlcicpLFxuICAgIEZ1bmN0aW9uUGxvdHRlciA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9GdW5jdGlvblBsb3R0ZXInKSxcbiAgICBQYWQgICAgICAgICAgICAgPSByZXF1aXJlKCcuLi9jb21wb25lbnQvUGFkJyksXG4gICAgVmFsdWVQbG90dGVyICAgID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L1ZhbHVlUGxvdHRlcicpLFxuICAgIE51bWJlck91dHB1dCAgICA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9OdW1iZXJPdXRwdXQnKSxcbiAgICBTdHJpbmdPdXRwdXQgICAgPSByZXF1aXJlKCcuLi9jb21wb25lbnQvU3RyaW5nT3V0cHV0JyksXG4gICAgQ2FudmFzXyAgICAgICAgID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L0NhbnZhcycpLFxuICAgIFNWR18gICAgICAgICAgICA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9TVkcnKTtcblxudmFyIERFRkFVTFRfUEFORUxfUE9TSVRJT04gPSBudWxsLFxuICAgIERFRkFVTFRfUEFORUxfV0lEVEggICAgICA9IDMwMCxcbiAgICBERUZBVUxUX1BBTkVMX0hFSUdIVCAgICAgPSBudWxsLFxuICAgIERFRkFVTFRfUEFORUxfV0lEVEhfTUlOICA9IDEwMCxcbiAgICBERUZBVUxUX1BBTkVMX1dJRFRIX01BWCAgPSA2MDAsXG4gICAgREVGQVVMVF9QQU5FTF9SQVRJTyAgICAgID0gNDAsXG4gICAgREVGQVVMVF9QQU5FTF9MQUJFTCAgICAgID0gJ0NvbnRyb2wgUGFuZWwnLFxuICAgIERFRkFVTFRfUEFORUxfVkFMSUdOICAgICA9IExheW91dE1vZGUuVE9QLFxuICAgIERFRkFVTFRfUEFORUxfQUxJR04gICAgICA9IExheW91dE1vZGUuUklHSFQsXG4gICAgREVGQVVMVF9QQU5FTF9ET0NLICAgICAgID0ge2FsaWduOkxheW91dE1vZGUuUklHSFQscmVzaXphYmxlOnRydWV9LFxuICAgIERFRkFVTFRfUEFORUxfRU5BQkxFICAgICA9IHRydWUsXG4gICAgREVGQVVMVF9QQU5FTF9PUEFDSVRZICAgID0gMS4wLFxuICAgIERFRkFVTFRfUEFORUxfRklYRUQgICAgICA9IHRydWUsXG4gICAgREVGQVVMVF9QQU5FTF9WQ09OU1RSQUlOID0gdHJ1ZTtcblxuZnVuY3Rpb24gUGFuZWwoY29udHJvbEtpdCxwYXJhbXMpe1xuICAgIEV2ZW50RGlzcGF0Y2hlci5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG4gICAgdGhpcy5fcGFyZW50ID0gY29udHJvbEtpdDtcblxuXG4gICAgcGFyYW1zICAgICAgICAgICAgPSBwYXJhbXMgICAgICAgICAgIHx8IHt9O1xuICAgIHBhcmFtcy52YWxpZ24gICAgID0gcGFyYW1zLnZhbGlnbiAgICB8fCBERUZBVUxUX1BBTkVMX1ZBTElHTjtcbiAgICBwYXJhbXMuYWxpZ24gICAgICA9IHBhcmFtcy5hbGlnbiAgICAgfHwgREVGQVVMVF9QQU5FTF9BTElHTjtcbiAgICBwYXJhbXMucG9zaXRpb24gICA9IHBhcmFtcy5wb3NpdGlvbiAgfHwgREVGQVVMVF9QQU5FTF9QT1NJVElPTjtcbiAgICBwYXJhbXMud2lkdGggICAgICA9IHBhcmFtcy53aWR0aCAgICAgfHwgREVGQVVMVF9QQU5FTF9XSURUSDtcbiAgICBwYXJhbXMuaGVpZ2h0ICAgICA9IHBhcmFtcy5oZWlnaHQgICAgfHwgREVGQVVMVF9QQU5FTF9IRUlHSFQ7XG4gICAgcGFyYW1zLnJhdGlvICAgICAgPSBwYXJhbXMucmF0aW8gICAgIHx8IERFRkFVTFRfUEFORUxfUkFUSU87XG4gICAgcGFyYW1zLmxhYmVsICAgICAgPSBwYXJhbXMubGFiZWwgICAgIHx8IERFRkFVTFRfUEFORUxfTEFCRUw7XG4gICAgcGFyYW1zLm9wYWNpdHkgICAgPSBwYXJhbXMub3BhY2l0eSAgIHx8IERFRkFVTFRfUEFORUxfT1BBQ0lUWTtcbiAgICBwYXJhbXMuZml4ZWQgICAgICA9IHBhcmFtcy5maXhlZCAgICAgID09PSB1bmRlZmluZWQgPyBERUZBVUxUX1BBTkVMX0ZJWEVEICAgICAgOiBwYXJhbXMuZml4ZWQ7XG4gICAgcGFyYW1zLmVuYWJsZSAgICAgPSBwYXJhbXMuZW5hYmxlICAgICA9PT0gdW5kZWZpbmVkID8gREVGQVVMVF9QQU5FTF9FTkFCTEUgICAgIDogcGFyYW1zLmVuYWJsZTtcbiAgICBwYXJhbXMudmNvbnN0cmFpbiA9IHBhcmFtcy52Y29uc3RyYWluID09PSB1bmRlZmluZWQgPyBERUZBVUxUX1BBTkVMX1ZDT05TVFJBSU4gOiBwYXJhbXMudmNvbnN0cmFpbjtcblxuICAgIGlmIChwYXJhbXMuZG9jaykge1xuICAgICAgICBwYXJhbXMuZG9jay5hbGlnbiA9IHBhcmFtcy5kb2NrLmFsaWduIHx8IERFRkFVTFRfUEFORUxfRE9DSy5hbGlnbjtcbiAgICAgICAgcGFyYW1zLmRvY2sucmVzaXphYmxlID0gcGFyYW1zLmRvY2sucmVzaXphYmxlIHx8IERFRkFVTFRfUEFORUxfRE9DSy5yZXNpemFibGU7XG4gICAgfVxuXG4gICAgdGhpcy5fd2lkdGggICAgICA9IE1hdGgubWF4KERFRkFVTFRfUEFORUxfV0lEVEhfTUlOLFxuICAgICAgICAgICAgICAgICAgICAgICBNYXRoLm1pbihwYXJhbXMud2lkdGgsREVGQVVMVF9QQU5FTF9XSURUSF9NQVgpKTtcbiAgICB0aGlzLl9oZWlnaHQgICAgID0gcGFyYW1zLmhlaWdodCA/ICBNYXRoLm1heCgwLE1hdGgubWluKHBhcmFtcy5oZWlnaHQsd2luZG93LmlubmVySGVpZ2h0KSkgOiBudWxsO1xuICAgIHRoaXMuX2ZpeGVkICAgICAgPSBwYXJhbXMuZml4ZWQ7XG4gICAgdGhpcy5fZG9jayAgICAgICA9IHBhcmFtcy5kb2NrO1xuICAgIHRoaXMuX3Bvc2l0aW9uICAgPSBwYXJhbXMucG9zaXRpb247XG4gICAgdGhpcy5fdkNvbnN0cmFpbiA9IHBhcmFtcy52Y29uc3RyYWluO1xuICAgIHRoaXMuX2xhYmVsICAgICAgPSBwYXJhbXMubGFiZWw7XG4gICAgdGhpcy5fZW5hYmxlZCAgICA9IHBhcmFtcy5lbmFibGU7XG4gICAgdGhpcy5fZ3JvdXBzICAgICA9IFtdO1xuXG5cbiAgICB2YXIgd2lkdGggICAgPSB0aGlzLl93aWR0aCxcbiAgICAgICAgaXNGaXhlZCAgPSB0aGlzLl9maXhlZCxcbiAgICAgICAgZG9jayAgICAgPSB0aGlzLl9kb2NrLFxuICAgICAgICBwb3NpdGlvbiA9IHRoaXMuX3Bvc2l0aW9uLFxuICAgICAgICBsYWJlbCAgICA9IHRoaXMuX2xhYmVsLFxuICAgICAgICBhbGlnbiAgICA9IHBhcmFtcy5hbGlnbixcbiAgICAgICAgb3BhY2l0eSAgPSBwYXJhbXMub3BhY2l0eTtcblxuXG4gICAgdmFyIHJvb3QgPSB0aGlzLl9ub2RlICAgICA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuUGFuZWwpLFxuICAgICAgICBoZWFkID0gdGhpcy5faGVhZE5vZGUgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLkhlYWQpLFxuICAgICAgICBtZW51ICAgICAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLk1lbnUpLFxuICAgICAgICBsYWJlbFdyYXAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApLFxuICAgICAgICBsYWJlbF8gICAgPSBuZXcgTm9kZShOb2RlLlNQQU4pLnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKSxcbiAgICAgICAgd3JhcCA9IHRoaXMuX3dyYXBOb2RlID0gbmV3IE5vZGUoTm9kZS5ESVYpLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApLFxuICAgICAgICBsaXN0ID0gdGhpcy5fbGlzdE5vZGUgPSBuZXcgTm9kZShOb2RlLkxJU1QpLnNldFN0eWxlQ2xhc3MoQ1NTLkdyb3VwTGlzdCk7XG5cbiAgICByb290LnNldFdpZHRoKHdpZHRoKTtcbiAgICBsYWJlbF8uc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsIGxhYmVsKTtcblxuICAgIGxhYmVsV3JhcC5hZGRDaGlsZChsYWJlbF8pO1xuICAgIGhlYWQuYWRkQ2hpbGQobWVudSk7XG4gICAgaGVhZC5hZGRDaGlsZChsYWJlbFdyYXApO1xuICAgIHdyYXAuYWRkQ2hpbGQobGlzdCk7XG4gICAgcm9vdC5hZGRDaGlsZChoZWFkKTtcbiAgICByb290LmFkZENoaWxkKHdyYXApO1xuXG4gICAgY29udHJvbEtpdC5nZXROb2RlKCkuYWRkQ2hpbGQocm9vdCk7XG5cblxuICAgIGlmICghZG9jaykge1xuICAgICAgICB2YXIgbWVudUhpZGUgPSB0aGlzLl9tZW51SGlkZSA9IG5ldyBOb2RlKE5vZGUuSU5QVVRfQlVUVE9OKTtcbiAgICAgICAgICAgIG1lbnVIaWRlLnNldFN0eWxlQ2xhc3MoQ1NTLkJ1dHRvbk1lbnVIaWRlKTtcbiAgICAgICAgICAgIG1lbnVIaWRlLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uTWVudUhpZGVNb3VzZURvd24uYmluZCh0aGlzKSk7XG5cbiAgICAgICAgbWVudS5hZGRDaGlsZChtZW51SGlkZSk7XG5cbiAgICAgICAgaWYgKHRoaXMuX3BhcmVudC5wYW5lbHNBcmVDbG9zYWJsZSgpKSB7XG4gICAgICAgICAgICB2YXIgbWVudUNsb3NlID0gbmV3IE5vZGUoTm9kZS5JTlBVVF9CVVRUT04pO1xuICAgICAgICAgICAgbWVudUNsb3NlLnNldFN0eWxlQ2xhc3MoQ1NTLkJ1dHRvbk1lbnVDbG9zZSk7XG4gICAgICAgICAgICBtZW51Q2xvc2UuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5kaXNhYmxlLmJpbmQodGhpcykpO1xuXG4gICAgICAgICAgICBtZW51LmFkZENoaWxkKG1lbnVDbG9zZSk7XG4gICAgICAgIH1cblxuXG4gICAgICAgIGlmICh0aGlzLmhhc01heEhlaWdodCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9hZGRTY3JvbGxXcmFwKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWlzRml4ZWQpIHtcbiAgICAgICAgICAgIGlmIChwb3NpdGlvbikge1xuICAgICAgICAgICAgICAgIGlmIChhbGlnbiA9PSBMYXlvdXRNb2RlLkxFRlQgfHxcbiAgICAgICAgICAgICAgICAgICAgYWxpZ24gPT0gTGF5b3V0TW9kZS5UT1AgfHxcbiAgICAgICAgICAgICAgICAgICAgYWxpZ24gPT0gTGF5b3V0TW9kZS5CT1RUT00pIHtcbiAgICAgICAgICAgICAgICAgICAgcm9vdC5zZXRQb3NpdGlvbkdsb2JhbChwb3NpdGlvblswXSwgcG9zaXRpb25bMV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcm9vdC5zZXRQb3NpdGlvbkdsb2JhbCh3aW5kb3cuaW5uZXJXaWR0aCAtIHdpZHRoIC0gcG9zaXRpb25bMF0sIHBvc2l0aW9uWzFdKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fcG9zaXRpb24gPSByb290LmdldFBvc2l0aW9uKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB0aGlzLl9wb3NpdGlvbiA9IHJvb3QuZ2V0UG9zaXRpb24oKTtcblxuICAgICAgICAgICAgdGhpcy5fbW91c2VPZmZzZXQgPSBbMCwgMF07XG5cbiAgICAgICAgICAgIHJvb3Quc2V0U3R5bGVQcm9wZXJ0eSgncG9zaXRpb24nLCAnYWJzb2x1dGUnKTtcbiAgICAgICAgICAgIGhlYWQuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25IZWFkRHJhZ1N0YXJ0LmJpbmQodGhpcykpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYgKHBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBvc2l0aW9uWCA9IHBvc2l0aW9uWzBdLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvblkgPSBwb3NpdGlvblsxXTtcblxuICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvblkgIT0gMClyb290LnNldFBvc2l0aW9uWShwb3NpdGlvblkpO1xuICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvblggIT0gMClpZiAoYWxpZ24gPT0gTGF5b3V0TW9kZS5SSUdIVClyb290LmdldEVsZW1lbnQoKS5tYXJnaW5SaWdodCA9IHBvc2l0aW9uWDtcbiAgICAgICAgICAgICAgICBlbHNlIHJvb3Quc2V0UG9zaXRpb25YKHBvc2l0aW9uWCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJvb3Quc2V0U3R5bGVQcm9wZXJ0eSgnZmxvYXQnLCBhbGlnbik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHZhciBkb2NrQWxpZ25tZW50ID0gZG9jay5hbGlnbjtcblxuICAgICAgICBpZiAoZG9ja0FsaWdubWVudCA9PSBMYXlvdXRNb2RlLkxFRlQgfHxcbiAgICAgICAgICAgIGRvY2tBbGlnbm1lbnQgPT0gTGF5b3V0TW9kZS5SSUdIVCkge1xuICAgICAgICAgICAgYWxpZ24gPSBkb2NrQWxpZ25tZW50O1xuICAgICAgICAgICAgdGhpcy5faGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGRvY2tBbGlnbm1lbnQgPT0gTGF5b3V0TW9kZS5UT1AgfHxcbiAgICAgICAgICAgIGRvY2tBbGlnbm1lbnQgPT0gTGF5b3V0TW9kZS5CT1RUT00pIHtcblxuICAgICAgICB9XG5cbiAgICAgICAgLypcbiAgICAgICAgIGlmKGRvY2sucmVzaXphYmxlKVxuICAgICAgICAge1xuICAgICAgICAgdmFyIHNpemVIYW5kbGUgPSBuZXcgQ29udHJvbEtpdC5Ob2RlKENvbnRyb2xLaXQuTm9kZVR5cGUuRElWKTtcbiAgICAgICAgIHNpemVIYW5kbGUuc2V0U3R5bGVDbGFzcyhDb250cm9sS2l0LkNTUy5TaXplSGFuZGxlKTtcbiAgICAgICAgIHJvb3ROb2RlLmFkZENoaWxkKHNpemVIYW5kbGUpO1xuICAgICAgICAgfVxuICAgICAgICAgKi9cblxuICAgICAgICByb290LnNldFN0eWxlUHJvcGVydHkoJ2Zsb2F0JywgYWxpZ24pO1xuICAgIH1cblxuICAgIHZhciBwYXJlbnQgPSB0aGlzLl9wYXJlbnQ7XG4gICAgdmFyIGhpc3RvcnlJc0VuYWJsZWQgPSBwYXJlbnQuaGlzdG9yeUlzRW5hYmxlZCgpLFxuICAgICAgICBzdGF0ZXNBcmVFbmFibGVkID0gcGFyZW50LnN0YXRlc0FyZUVuYWJsZWQoKTtcblxuICAgIGlmKGhpc3RvcnlJc0VuYWJsZWQgfHwgc3RhdGVzQXJlRW5hYmxlZCl7XG4gICAgICAgIG1lbnUuYWRkQ2hpbGRBdChuZXcgTm9kZSgpLDApLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApOy8vLnNldFN0eWxlUHJvcGVydHkoJ2Rpc3BsYXknLCdub25lJyk7XG4gICAgfVxuXG4gICAgaWYgKGhpc3RvcnlJc0VuYWJsZWQpIHtcbiAgICAgICAgdGhpcy5fbWVudVVuZG8gPSBtZW51LmdldENoaWxkQXQoMClcbiAgICAgICAgICAgIC5hZGRDaGlsZChuZXcgTm9kZShOb2RlLklOUFVUX0JVVFRPTikpXG4gICAgICAgICAgICAgICAgLnNldFN0eWxlQ2xhc3MoQ1NTLkJ1dHRvbk1lbnVVbmRvKVxuICAgICAgICAgICAgICAgIC5zZXRQcm9wZXJ0eSgndmFsdWUnLEhpc3RvcnkuZ2V0KCkuZ2V0TnVtU3RhdGVzKCkpXG4gICAgICAgICAgICAgICAgLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgSGlzdG9yeS5nZXQoKS5wb3BTdGF0ZSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICBwYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihNZW51RXZlbnQuVVBEQVRFX01FTlUsdGhpcywgJ29uVXBkYXRlTWVudScpO1xuICAgIH1cbiAgICBpZihzdGF0ZXNBcmVFbmFibGVkKXtcbiAgICAgICAgbWVudS5nZXRDaGlsZEF0KDApXG4gICAgICAgICAgICAuYWRkQ2hpbGQobmV3IE5vZGUoTm9kZS5JTlBVVF9CVVRUT04pKVxuICAgICAgICAgICAgICAgIC5zZXRTdHlsZUNsYXNzKENTUy5CdXR0b25NZW51TG9hZClcbiAgICAgICAgICAgICAgICAuc2V0UHJvcGVydHkoJ3ZhbHVlJywnTG9hZCcpXG4gICAgICAgICAgICAgICAgLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgY29udHJvbEtpdC5fbG9hZFN0YXRlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIG1lbnUuZ2V0Q2hpbGRBdCgwKVxuICAgICAgICAgICAgLmFkZENoaWxkKG5ldyBOb2RlKE5vZGUuSU5QVVRfQlVUVE9OKSlcbiAgICAgICAgICAgICAgICAuc2V0U3R5bGVDbGFzcyhDU1MuQnV0dG9uTWVudVNhdmUpXG4gICAgICAgICAgICAgICAgLnNldFByb3BlcnR5KCd2YWx1ZScsJ1NhdmUnKVxuICAgICAgICAgICAgICAgIC5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRyb2xLaXQuX3NhdmVTdGF0ZSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgIH1cbiAgICBpZihoaXN0b3J5SXNFbmFibGVkIHx8IHN0YXRlc0FyZUVuYWJsZWQpe1xuICAgICAgICBoZWFkLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX09WRVIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIG1lbnUuc2V0U3R5bGVDbGFzcyhDU1MuTWVudUFjdGl2ZSk7XG4gICAgICAgIH0pO1xuICAgICAgICBoZWFkLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX09VVCxmdW5jdGlvbigpe1xuICAgICAgICAgICAgbWVudS5zZXRTdHlsZUNsYXNzKENTUy5NZW51KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGlmIChvcGFjaXR5ICE9IDEuMCAmJiBvcGFjaXR5ICE9IDAuMCkge1xuICAgICAgICByb290LnNldFN0eWxlUHJvcGVydHkoJ29wYWNpdHknLCBvcGFjaXR5KTtcbiAgICB9XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5XSU5ET1dfUkVTSVpFLHRoaXMuX29uV2luZG93UmVzaXplLmJpbmQodGhpcykpO1xufVxuUGFuZWwucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudERpc3BhdGNoZXIucHJvdG90eXBlKTtcblBhbmVsLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFBhbmVsO1xuXG5QYW5lbC5wcm90b3R5cGUuX29uTWVudUhpZGVNb3VzZURvd24gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fZW5hYmxlZCA9ICF0aGlzLl9lbmFibGVkO1xuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5vblVwZGF0ZU1lbnUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fbWVudVVuZG8uc2V0UHJvcGVydHkoJ3ZhbHVlJywgSGlzdG9yeS5nZXQoKS5nZXROdW1TdGF0ZXMoKSk7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuX29uTWVudVVuZG9UcmlnZ2VyID0gZnVuY3Rpb24gKCkge1xuICAgIEhpc3RvcnkuZ2V0KCkucG9wU3RhdGUoKTtcbn07XG5cblxuUGFuZWwucHJvdG90eXBlLl91cGRhdGVBcHBlYXJhbmNlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciByb290Tm9kZSA9IHRoaXMuX25vZGUsXG4gICAgICAgIGhlYWROb2RlID0gdGhpcy5faGVhZE5vZGUsXG4gICAgICAgIG1lbnVIaWRlID0gdGhpcy5fbWVudUhpZGU7XG5cbiAgICBpZiAoIXRoaXMuX2VuYWJsZWQpIHtcbiAgICAgICAgaGVhZE5vZGUuZ2V0U3R5bGUoKS5ib3JkZXJCb3R0b20gPSAnbm9uZSc7XG4gICAgICAgIHJvb3ROb2RlLnNldEhlaWdodChoZWFkTm9kZS5nZXRIZWlnaHQoKSk7XG4gICAgICAgIG1lbnVIaWRlLnNldFN0eWxlQ2xhc3MoQ1NTLkJ1dHRvbk1lbnVTaG93KTtcbiAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgUGFuZWxFdmVudC5QQU5FTF9ISURFLCBudWxsKSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICByb290Tm9kZS5zZXRIZWlnaHQoaGVhZE5vZGUuZ2V0SGVpZ2h0KCkgKyB0aGlzLl93cmFwTm9kZS5nZXRIZWlnaHQoKSk7XG4gICAgICAgIHJvb3ROb2RlLmRlbGV0ZVN0eWxlUHJvcGVydHkoJ2hlaWdodCcpO1xuICAgICAgICBtZW51SGlkZS5zZXRTdHlsZUNsYXNzKENTUy5CdXR0b25NZW51SGlkZSk7XG4gICAgICAgIGhlYWROb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkhlYWQpO1xuICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX1NIT1csIG51bGwpKTtcbiAgICB9XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuX29uSGVhZERyYWdTdGFydCA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHBhcmVudE5vZGUgPSB0aGlzLl9wYXJlbnQuZ2V0Tm9kZSgpLFxuICAgICAgICBub2RlICAgICAgID0gdGhpcy5fbm9kZTtcblxuICAgIHZhciBub2RlUG9zICAgPSBub2RlLmdldFBvc2l0aW9uR2xvYmFsKCksXG4gICAgICAgIG1vdXNlUG9zICA9IE1vdXNlLmdldCgpLmdldFBvc2l0aW9uKCksXG4gICAgICAgIG9mZnNldFBvcyA9IHRoaXMuX21vdXNlT2Zmc2V0O1xuXG4gICAgICAgIG9mZnNldFBvc1swXSA9IG1vdXNlUG9zWzBdIC0gbm9kZVBvc1swXTtcbiAgICAgICAgb2Zmc2V0UG9zWzFdID0gbW91c2VQb3NbMV0gLSBub2RlUG9zWzFdO1xuXG4gICAgdmFyIGV2ZW50TW91c2VNb3ZlID0gRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLFxuICAgICAgICBldmVudE1vdXNlVXAgICA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgb25EcmFnID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5fdXBkYXRlUG9zaXRpb24oKTtcbiAgICAgICAgfSxcbiAgICAgICAgb25EcmFnRW5kID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW91c2VVcCwgb25EcmFnRW5kLCBmYWxzZSk7XG4gICAgICAgICAgICBzZWxmLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX01PVkVfRU5ELCBudWxsKSk7XG4gICAgICAgIH07XG5cbiAgICBwYXJlbnROb2RlLnJlbW92ZUNoaWxkKG5vZGUpO1xuICAgIHBhcmVudE5vZGUuYWRkQ2hpbGQoICAgbm9kZSk7XG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VNb3ZlLCBvbkRyYWcsICAgIGZhbHNlKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VVcCwgICBvbkRyYWdFbmQsIGZhbHNlKTtcblxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsUGFuZWxFdmVudC5QQU5FTF9NT1ZFX0JFR0lOLG51bGwpKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5fdXBkYXRlUG9zaXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG1vdXNlUG9zID0gTW91c2UuZ2V0KCkuZ2V0UG9zaXRpb24oKSxcbiAgICAgICAgb2Zmc2V0UG9zID0gdGhpcy5fbW91c2VPZmZzZXQ7XG5cbiAgICB2YXIgcG9zaXRpb24gPSB0aGlzLl9wb3NpdGlvbjtcbiAgICBwb3NpdGlvblswXSA9IG1vdXNlUG9zWzBdIC0gb2Zmc2V0UG9zWzBdO1xuICAgIHBvc2l0aW9uWzFdID0gbW91c2VQb3NbMV0gLSBvZmZzZXRQb3NbMV07XG5cbiAgICB0aGlzLl9jb25zdHJhaW5IZWlnaHQoKTtcbiAgICB0aGlzLl9jb25zdHJhaW5Qb3NpdGlvbigpO1xuXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgUGFuZWxFdmVudC5QQU5FTF9NT1ZFLCBudWxsKSk7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuX29uV2luZG93UmVzaXplID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmlzRG9ja2VkKCkpIHtcbiAgICAgICAgdmFyIGRvY2sgPSB0aGlzLl9kb2NrO1xuXG4gICAgICAgIGlmIChkb2NrLmFsaWduID09IExheW91dE1vZGUuUklHSFQgfHxcbiAgICAgICAgICAgIGRvY2suYWxpZ24gPT0gTGF5b3V0TW9kZS5MRUZUKSB7XG4gICAgICAgICAgICB2YXIgd2luZG93SGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0LFxuICAgICAgICAgICAgICAgIGxpc3RIZWlnaHQgPSB0aGlzLl9saXN0Tm9kZS5nZXRIZWlnaHQoKSxcbiAgICAgICAgICAgICAgICBoZWFkSGVpZ2h0ID0gdGhpcy5faGVhZE5vZGUuZ2V0SGVpZ2h0KCk7XG5cbiAgICAgICAgICAgIHRoaXMuX2hlaWdodCA9IHdpbmRvd0hlaWdodDtcblxuICAgICAgICAgICAgaWYgKCh3aW5kb3dIZWlnaHQgLSBoZWFkSGVpZ2h0KSA+IGxpc3RIZWlnaHQpe1xuICAgICAgICAgICAgICAgIHRoaXMuX3Njcm9sbEJhci5kaXNhYmxlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgIHRoaXMuX3Njcm9sbEJhci5lbmFibGUoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgUGFuZWxFdmVudC5QQU5FTF9TSVpFX0NIQU5HRSkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBpZiAoIXRoaXMuaXNGaXhlZCgpKXtcbiAgICAgICAgICAgIHRoaXMuX2NvbnN0cmFpblBvc2l0aW9uKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5fY29uc3RyYWluSGVpZ2h0KCk7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgRG9jdW1lbnRFdmVudC5XSU5ET1dfUkVTSVpFKSk7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuX2NvbnN0cmFpblBvc2l0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBub2RlID0gdGhpcy5fbm9kZTtcblxuICAgIHZhciBtYXhYID0gd2luZG93LmlubmVyV2lkdGggLSBub2RlLmdldFdpZHRoKCksXG4gICAgICAgIG1heFkgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSBub2RlLmdldEhlaWdodCgpO1xuXG4gICAgdmFyIHBvc2l0aW9uID0gdGhpcy5fcG9zaXRpb247XG4gICAgcG9zaXRpb25bMF0gPSBNYXRoLm1heCgwLCBNYXRoLm1pbihwb3NpdGlvblswXSwgbWF4WCkpO1xuICAgIHBvc2l0aW9uWzFdID0gTWF0aC5tYXgoMCwgTWF0aC5taW4ocG9zaXRpb25bMV0sIG1heFkpKTtcblxuICAgIG5vZGUuc2V0UG9zaXRpb25HbG9iYWwocG9zaXRpb25bMF0sIHBvc2l0aW9uWzFdKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5fY29uc3RyYWluSGVpZ2h0ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5fdkNvbnN0cmFpbilyZXR1cm47XG5cbiAgICB2YXIgaGFzTWF4SGVpZ2h0ID0gdGhpcy5oYXNNYXhIZWlnaHQoKSxcbiAgICAgICAgaGFzU2Nyb2xsV3JhcCA9IHRoaXMuaGFzU2Nyb2xsV3JhcCgpO1xuXG4gICAgdmFyIGhlYWQgPSB0aGlzLl9oZWFkTm9kZSxcbiAgICAgICAgd3JhcCA9IHRoaXMuX3dyYXBOb2RlO1xuXG4gICAgdmFyIHNjcm9sbEJhciA9IHRoaXMuX3Njcm9sbEJhcjtcblxuICAgIHZhciBwYW5lbFRvcCA9IHRoaXMuaXNEb2NrZWQoKSA/IDAgOlxuICAgICAgICB0aGlzLmlzRml4ZWQoKSA/IDAgOlxuICAgICAgICAgICAgdGhpcy5fcG9zaXRpb25bMV07XG5cbiAgICB2YXIgcGFuZWxIZWlnaHQgPSBoYXNNYXhIZWlnaHQgPyB0aGlzLmdldE1heEhlaWdodCgpIDpcbiAgICAgICAgaGFzU2Nyb2xsV3JhcCA/IHNjcm9sbEJhci5nZXRUYXJnZXROb2RlKCkuZ2V0SGVpZ2h0KCkgOlxuICAgICAgICAgICAgd3JhcC5nZXRIZWlnaHQoKTtcblxuICAgIHZhciBwYW5lbEJvdHRvbSA9IHBhbmVsVG9wICsgcGFuZWxIZWlnaHQ7XG4gICAgdmFyIGhlYWRIZWlnaHQgPSBoZWFkLmdldEhlaWdodCgpO1xuXG4gICAgdmFyIHdpbmRvd0hlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCxcbiAgICAgICAgaGVpZ2h0RGlmZiA9IHdpbmRvd0hlaWdodCAtIHBhbmVsQm90dG9tIC0gaGVhZEhlaWdodCxcbiAgICAgICAgaGVpZ2h0U3VtO1xuXG4gICAgaWYgKGhlaWdodERpZmYgPCAwLjApIHtcbiAgICAgICAgaGVpZ2h0U3VtID0gcGFuZWxIZWlnaHQgKyBoZWlnaHREaWZmO1xuXG4gICAgICAgIGlmICghaGFzU2Nyb2xsV3JhcCkge1xuICAgICAgICAgICAgdGhpcy5fYWRkU2Nyb2xsV3JhcChoZWlnaHRTdW0pO1xuICAgICAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgUGFuZWxFdmVudC5QQU5FTF9TQ1JPTExfV1JBUF9BRERFRCwgbnVsbCkpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgc2Nyb2xsQmFyLnNldFdyYXBIZWlnaHQoaGVpZ2h0U3VtKTtcbiAgICAgICAgd3JhcC5zZXRIZWlnaHQoaGVpZ2h0U3VtKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGlmICghaGFzTWF4SGVpZ2h0ICYmIGhhc1Njcm9sbFdyYXApIHtcbiAgICAgICAgICAgIHNjcm9sbEJhci5yZW1vdmVGcm9tUGFyZW50KCk7XG4gICAgICAgICAgICB3cmFwLmFkZENoaWxkKHRoaXMuX2xpc3ROb2RlKTtcbiAgICAgICAgICAgIHdyYXAuZGVsZXRlU3R5bGVQcm9wZXJ0eSgnaGVpZ2h0Jyk7XG4gICAgICAgICAgICB0aGlzLl9zY3JvbGxCYXIucmVtb3ZlTW91c2VMaXN0ZW5lcigpO1xuICAgICAgICAgICAgdGhpcy5fc2Nyb2xsQmFyID0gbnVsbDtcblxuICAgICAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgUGFuZWxFdmVudC5QQU5FTF9TQ1JPTExfV1JBUF9SRU1PVkVELCBudWxsKSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5QYW5lbC5wcm90b3R5cGUub25Hcm91cExpc3RTaXplQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmhhc1Njcm9sbFdyYXAoKSl7XG4gICAgICAgIHRoaXMuX3VwZGF0ZVNjcm9sbFdyYXAoKTtcbiAgICB9XG4gICAgdGhpcy5fY29uc3RyYWluSGVpZ2h0KCk7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuX3VwZGF0ZVNjcm9sbFdyYXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHdyYXAgICA9IHRoaXMuX3dyYXBOb2RlLFxuICAgICAgICBzY3JvbGxCYXIgID0gdGhpcy5fc2Nyb2xsQmFyLFxuICAgICAgICBoZWlnaHQgICAgID0gdGhpcy5oYXNNYXhIZWlnaHQoKSA/IHRoaXMuZ2V0TWF4SGVpZ2h0KCkgOiAxMDAsXG4gICAgICAgIGxpc3RIZWlnaHQgPSB0aGlzLl9saXN0Tm9kZS5nZXRIZWlnaHQoKTtcblxuICAgIHdyYXAuc2V0SGVpZ2h0KGxpc3RIZWlnaHQgPCBoZWlnaHQgPyBsaXN0SGVpZ2h0IDogaGVpZ2h0KTtcblxuICAgIHNjcm9sbEJhci51cGRhdGUoKTtcblxuICAgIGlmICghc2Nyb2xsQmFyLmlzVmFsaWQoKSkge1xuICAgICAgICBzY3JvbGxCYXIuZGlzYWJsZSgpO1xuICAgICAgICB3cmFwLnNldEhlaWdodCh3cmFwLmdldENoaWxkQXQoMSkuZ2V0SGVpZ2h0KCkpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgc2Nyb2xsQmFyLmVuYWJsZSgpO1xuICAgICAgICB3cmFwLnNldEhlaWdodChoZWlnaHQpO1xuICAgIH1cbn07XG5cblBhbmVsLnByb3RvdHlwZS5fYWRkU2Nyb2xsV3JhcCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgd3JhcE5vZGUgPSB0aGlzLl93cmFwTm9kZSxcbiAgICAgICAgbGlzdE5vZGUgPSB0aGlzLl9saXN0Tm9kZSxcbiAgICAgICAgaGVpZ2h0ID0gYXJndW1lbnRzLmxlbmd0aCA9PSAwID9cbiAgICAgICAgICAgIHRoaXMuZ2V0TWF4SGVpZ2h0KCkgOlxuICAgICAgICAgICAgYXJndW1lbnRzWzBdO1xuXG4gICAgdGhpcy5fc2Nyb2xsQmFyID0gbmV3IFNjcm9sbEJhcih3cmFwTm9kZSwgbGlzdE5vZGUsIGhlaWdodCk7XG4gICAgaWYgKHRoaXMuaXNFbmFibGVkKCkpe1xuICAgICAgICB3cmFwTm9kZS5zZXRIZWlnaHQoaGVpZ2h0KTtcbiAgICB9XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuaGFzU2Nyb2xsV3JhcCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fc2Nyb2xsQmFyICE9IG51bGw7XG59O1xuXG5cblBhbmVsLnByb3RvdHlwZS5wcmV2ZW50U2VsZWN0RHJhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMuaGFzU2Nyb2xsV3JhcCgpKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl93cmFwTm9kZS5nZXRFbGVtZW50KCkuc2Nyb2xsVG9wID0gMDtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5lbmFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fbm9kZS5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ2Jsb2NrJyk7XG4gICAgdGhpcy5fZW5hYmxlZCA9IHRydWU7XG4gICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xufTtcblxuXG5QYW5lbC5wcm90b3R5cGUuZGlzYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9ub2RlLnNldFN0eWxlUHJvcGVydHkoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgIHRoaXMuX2VuYWJsZWQgPSBmYWxzZTtcbiAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuaXNFbmFibGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9lbmFibGVkO1xufTtcblxuUGFuZWwucHJvdG90eXBlLmlzRGlzYWJsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICF0aGlzLl9lbmFibGVkO1xufTtcblxuUGFuZWwucHJvdG90eXBlLmhhc01heEhlaWdodCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5faGVpZ2h0ICE9IG51bGw7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuZ2V0TWF4SGVpZ2h0ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9oZWlnaHQ7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuaXNEb2NrZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2RvY2s7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuaXNGaXhlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fZml4ZWQ7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuZ2V0R3JvdXBzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9ncm91cHM7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuZ2V0Tm9kZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fbm9kZTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5nZXRMaXN0ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9saXN0Tm9kZTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5nZXRXaWR0aCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fd2lkdGg7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuZ2V0UG9zaXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3Bvc2l0aW9uO1xufTtcblxuUGFuZWwucHJvdG90eXBlLmdldFBhcmVudCA9IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIHRoaXMuX3BhcmVudDtcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBHcm91cCB0byB0aGUgUGFuZWwuXG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBHcm91cCBvcHRpb25zXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy5sYWJlbD0nJ10gLSBUaGUgR3JvdXAgbGFiZWwgc3RyaW5nXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtwYXJhbXMudXNlTGFiZWw9dHJ1ZV0gLSBUcmlnZ2VyIHdoZXRoZXIgYWxsIGNvbnRhaW5lZCBTdWJHcm91cHMgYW5kIENvbXBvbmVudHMgc2hvdWxkIHVzZSBsYWJlbHNcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW3BhcmFtcy5lbmFibGU9dHJ1ZV0gLSBEZWZpbmVzIGluaXRpYWwgc3RhdGUgb3BlbiAvIGNsb3NlZFxuICogQHBhcmFtIHtOdW1iZXJ9IFtwYXJhbXMuaGVpZ2h0PW51bGxdIC0gRGVmaW5lcyBpZiB0aGUgaGVpZ2h0IG9mIHRoZSBHcm91cCBzaG91bGQgYmUgY29uc3RyYWluZWQgdG8gY2VydGFpbiBoZWlnaHRcbiAqIEByZXR1cm5zIHtQYW5lbH1cbiAqL1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkR3JvdXAgPSBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgdmFyIGdyb3VwID0gbmV3IEdyb3VwKHRoaXMsIHBhcmFtcyk7XG4gICAgdGhpcy5fZ3JvdXBzLnB1c2goZ3JvdXApO1xuICAgIGlmICh0aGlzLmlzRG9ja2VkKCkpe1xuICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX1NJWkVfQ0hBTkdFKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbmV3IFN1Ykdyb3VwIHRvIHRoZSBsYXN0IGFkZGVkIEdyb3VwLlxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gU3ViR3JvdXAgb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9JyddIC0gVGhlIFN1Ykdyb3VwIGxhYmVsIHN0cmluZ1xuICogQHBhcmFtIHtCb29sZWFufSBbcGFyYW1zLnVzZUxhYmVsPXRydWVdIC0gVHJpZ2dlciB3aGV0aGVyIGFsbCBDb21wb25lbnRzIHNob3VsZCB1c2UgbGFiZWxzXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtwYXJhbXMuZW5hYmxlPXRydWVdIC0gRGVmaW5lcyBpbml0aWFsIHN0YXRlIG9wZW4gLyBjbG9zZWRcbiAqIEBwYXJhbSB7TnVtYmVyfSBbcGFyYW1zLmhlaWdodD1udWxsXSAtIERlZmluZXMgaWYgdGhlIGhlaWdodCBvZiB0aGUgU3ViR3JvdXAgc2hvdWxkIGJlIGNvbnN0cmFpbmVkIHRvIGNlcnRhaW4gaGVpZ2h0XG4gKiBAcmV0dXJucyB7UGFuZWx9XG4gKi9cblxuUGFuZWwucHJvdG90eXBlLmFkZFN1Ykdyb3VwID0gZnVuY3Rpb24ocGFyYW1zKXtcbiAgICB2YXIgZ3JvdXBzID0gdGhpcy5fZ3JvdXBzO1xuICAgIGlmKGdyb3Vwcy5sZW5ndGggPT0gMCl7XG4gICAgICAgIHRoaXMuYWRkR3JvdXAoKTtcbiAgICB9XG4gICAgZ3JvdXBzW2dyb3Vwcy5sZW5ndGggLSAxXS5hZGRTdWJHcm91cChwYXJhbXMpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuUGFuZWwucHJvdG90eXBlLl9hZGRDb21wb25lbnQgPSBmdW5jdGlvbigpe1xuICAgIHZhciBncm91cHMgPSB0aGlzLl9ncm91cHMsXG4gICAgICAgIGdyb3VwO1xuICAgIGlmKGdyb3Vwcy5sZW5ndGggPT0gMCl7XG4gICAgICAgIGdyb3Vwcy5wdXNoKG5ldyBHcm91cCh0aGlzKSk7XG4gICAgfVxuICAgIGdyb3VwID0gZ3JvdXBzW2dyb3Vwcy5sZW5ndGgtMV07XG5cbiAgICBncm91cC5hZGRDb21wb25lbnQuYXBwbHkoZ3JvdXAsYXJndW1lbnRzKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBTdHJpbmdJbnB1dCB0byBsYXN0IGFkZGVkIFN1Ykdyb3VwLlxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCAtIFRoZSBvYmplY3RcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSAtIFRoZSBwcm9wZXJ0eSBrZXlcbiAqIEBwYXJhbSB7T2JqZWN0fSBbcGFyYW1zXSAtIFN0cmluZ0lucHV0IG9wdGlvbnNcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmxhYmVsPXZhbHVlXSAtIFN0cmluZ0lucHV0IGxhYmVsXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbcGFyYW1zLm9uQ2hhbmdlXSAtIENhbGxiYWNrIG9uIGNoYW5nZVxuICogQHBhcmFtIHtBcnJheX0gW3BhcmFtcy5wcmVzZXRzXSAtIEEgc2V0IG9mIHByZXNldHNcbiAqIEByZXR1cm5zIHtQYW5lbH1cbiAqL1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkU3RyaW5nSW5wdXQgPSBmdW5jdGlvbiAob2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChTdHJpbmdJbnB1dCxvYmplY3QsdmFsdWUscGFyYW1zKTtcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBOdW1iZXJJbnB1dCB0byBsYXN0IGFkZGVkIFN1Ykdyb3VwLlxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCAtIFRoZSBvYmplY3QuXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgLSBUaGUgcHJvcGVydHkga2V5LlxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnMuXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy5sYWJlbD12YWx1ZV0gLSBOdW1iZXJJbnB1dCBsYWJlbFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW3BhcmFtcy5vbkNoYW5nZV0gLSBDYWxsYmFjayBvbiBjaGFuZ2VcbiAqIEBwYXJhbSB7TnVtYmVyfSBbcGFyYW1zLnN0ZXBdIC0gQW1vdW50IHN1YmJlZC9hZGRlZCBvbiBhcnJvd0Rvd24vYXJyb3dVcCBwcmVzc1xuICogQHBhcmFtIHtOdW1iZXJ9IFtwYXJhbXMuZHBdIC0gRGVjaW1hbCBwbGFjZXMgZGlzcGxheWVkXG4gKiBAcGFyYW0ge0FycmF5fSBbcGFyYW1zLnByZXNldHNdIC0gQSBzZXQgb2YgcHJlc2V0c1xuICogQHJldHVybnMge1BhbmVsfVxuICovXG5cblBhbmVsLnByb3RvdHlwZS5hZGROdW1iZXJJbnB1dCA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KE51bWJlcklucHV0LG9iamVjdCx2YWx1ZSxwYXJhbXMpO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbmV3IFJhbmdlIGlucHV0IHRvIGxhc3QgYWRkZWQgU3ViR3JvdXAuXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IC0gVGhlIG9iamVjdFxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIC0gVGhlIHByb3BlcnR5IGtleVxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnNcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmxhYmVsPXZhbHVlXSAtIFJhbmdlIGxhYmVsXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbcGFyYW1zLm9uQ2hhbmdlXSAtIENhbGxiYWNrIG9uIGNoYW5nZVxuICogQHBhcmFtIHtOdW1iZXJ9IFtwYXJhbXMuc3RlcF0gLSBBbW91bnQgc3ViYmVkL2FkZGVkIG9uIGFycm93RG93bi9hcnJvd1VwIHByZXNzXG4gKiBAcGFyYW0ge051bWJlcn0gW3BhcmFtcy5kcF0gLSBEZWNpbWFsIHBsYWNlcyBkaXNwbGF5ZWRcbiAqIEByZXR1cm5zIHtQYW5lbH1cbiAqL1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkUmFuZ2UgPSBmdW5jdGlvbiAob2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChSYW5nZSxvYmplY3QsdmFsdWUscGFyYW1zKTtcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBDaGVja2JveCB0byBsYXN0IGFkZGVkIFN1Ykdyb3VwLlxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCAtIFRoZSBvYmplY3RcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSAtIFRoZSBwcm9wZXJ0eSBrZXlcbiAqIEBwYXJhbSB7T2JqZWN0fSBbcGFyYW1zXSAtIENvbXBvbmVudCBvcHRpb25zXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy5sYWJlbD12YWx1ZV0gLSBDaGVja2JveCBsYWJlbFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW3BhcmFtcy5vbkNoYW5nZV0gLSBDYWxsYmFjayBvbiBjaGFuZ2VcbiAqIEByZXR1cm5zIHtQYW5lbH1cbiAqL1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkQ2hlY2tib3ggPSBmdW5jdGlvbiAob2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChDaGVja2JveCxvYmplY3QsdmFsdWUscGFyYW1zKTtcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBDb2xvciBtb2RpZmllciB0byBsYXN0IGFkZGVkIFN1Ykdyb3VwLlxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCAtIFRoZSBvYmplY3RcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSAtIFRoZSBwcm9wZXJ0eSBrZXlcbiAqIEBwYXJhbSB7T2JqZWN0fSBbcGFyYW1zXSAtIENvbXBvbmVudCBvcHRpb25zXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy5sYWJlbD12YWx1ZV0gLSBDb2xvciBsYWJlbFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW3BhcmFtcy5vbkNoYW5nZV0gLSBDYWxsYmFjayBvbiBjaGFuZ2VcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmNvbG9yTW9kZT0ncmdiJ10gLSBUaGUgY29sb3JNb2RlIHRvIGJlIHVzZWQ6ICdoZXgnICNmZjAwZmYsICdyZ2InIFsyNTUsMCwyNTVdLCAncmdiZnYnIFsxLDAsMV1cbiAqIEBwYXJhbSB7QXJyYXl9IFtwYXJhbXMucHJlc2V0c10gLSBBIHNldCBvZiBwcmVzZXQgY29sb3JzIG1hdGNoaW5nIHBhcmFtcy5jb2xvck1vZGVcbiAqIEByZXR1cm5zIHtQYW5lbH1cbiAqL1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkQ29sb3IgPSBmdW5jdGlvbiAob2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChDb2xvcixvYmplY3QsdmFsdWUsIHBhcmFtcyk7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBuZXcgQnV0dG9uIHRvIGxhc3QgYWRkZWQgU3ViR3JvdXAuXG4gKiBAcGFyYW0ge1N0cmluZ30gbGFiZWwgLSBUaGUgb2JqZWN0XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBvblByZXNzIC0gQ2FsbGJhY2tcbiAqIEBwYXJhbSB7T2JqZWN0fSBbcGFyYW1zXSAtIENvbXBvbmVudCBvcHRpb25zXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy5sYWJlbD12YWx1ZV0gLSBCdXR0b24gbGFiZWxcbiAqIEByZXR1cm5zIHtQYW5lbH1cbiAqL1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkQnV0dG9uID0gZnVuY3Rpb24gKGxhYmVsLCBvblByZXNzLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KEJ1dHRvbixsYWJlbCxvblByZXNzLHBhcmFtcyk7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBuZXcgU2VsZWN0IHRvIGxhc3QgYWRkZWQgU3ViR3JvdXAuXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IC0gVGhlIG9iamVjdFxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIC0gVGhlIHByb3BlcnR5IGtleVxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnNcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmxhYmVsPXZhbHVlXSAtIEJ1dHRvbiBsYWJlbFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW3BhcmFtcy5vbkNoYW5nZV0gLSBDYWxsYmFjayBvbiBjaGFuZ2UgLSBmdW5jdGlvbihpbmRleCl7fVxuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMudGFyZ2V0XSAtIFRoZSBwcm9wZXJ0eSB0byBiZSBzZXQgb24gc2VsZWN0XG4gKiBAcmV0dXJucyB7UGFuZWx9XG4gKi9cblxuUGFuZWwucHJvdG90eXBlLmFkZFNlbGVjdCA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KFNlbGVjdCxvYmplY3QsdmFsdWUscGFyYW1zKTtcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBTbGlkZXIgdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBUaGUgb2JqZWN0XG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgLSBUaGUgcHJvcGVydHkga2V5XG4gKiBAcGFyYW0ge1N0cmluZ30gcmFuZ2UgLSBUaGUgbWluL21heCBhcnJheSBrZXkgdG8gYmUgdXNlZFxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnNcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmxhYmVsPXZhbHVlXSAtIFNsaWRlciBsYWJlbFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW3BhcmFtcy5vbkNoYW5nZV0gLSBDYWxsYmFjayBvbiBjaGFuZ2VcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtwYXJhbXMub25GaW5pc2hdIC0gQ2FsbGJhY2sgb24gZmluaXNoXG4gKiBAcGFyYW0ge051bWJlcn0gW3BhcmFtcy5zdGVwXSAtIEFtb3VudCBzdWJiZWQvYWRkZWQgb24gYXJyb3dEb3duL2Fycm93VXAgcHJlc3MgaW5zaWRlIHRoZSBpbnB1dFxuICogQHBhcmFtIHtOdW1iZXJ9IFtwYXJhbXMuZHBdIC0gRGVjaW1hbCBwbGFjZXMgZGlzcGxheWVkXG4gKiBAcmV0dXJucyB7UGFuZWx9XG4gKi9cblxuUGFuZWwucHJvdG90eXBlLmFkZFNsaWRlciA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCByYW5nZSwgcGFyYW1zKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChTbGlkZXIsb2JqZWN0LHZhbHVlLHJhbmdlLHBhcmFtcyk7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBuZXcgRnVuY3Rpb25QbG90dGVyIHRvIGxhc3QgYWRkZWQgU3ViR3JvdXAuXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IC0gVGhlIG9iamVjdFxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIC0gVGhlIHByb3BlcnR5IGtleSAtIGYoeCksIGYoeCx5KVxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnNcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmxhYmVsPXZhbHVlXSAtIEZ1bmN0aW9uUGxvdHRlciBsYWJlbFxuICogQHJldHVybnMge1BhbmVsfVxuICovXG5cblBhbmVsLnByb3RvdHlwZS5hZGRGdW5jdGlvblBsb3R0ZXIgPSBmdW5jdGlvbiAob2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChGdW5jdGlvblBsb3R0ZXIsb2JqZWN0LHZhbHVlLHBhcmFtcyk7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBuZXcgWFktUGFkIHRvIGxhc3QgYWRkZWQgU3ViR3JvdXAuXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IC0gVGhlIG9iamVjdFxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIC0gVGhlIHByb3BlcnR5IGtleVxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnNcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmxhYmVsPXZhbHVlXSAtIFBhZCBsYWJlbFxuICogQHJldHVybnMge1BhbmVsfVxuICovXG5cblBhbmVsLnByb3RvdHlwZS5hZGRQYWQgPSBmdW5jdGlvbiAob2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChQYWQsb2JqZWN0LHZhbHVlLHBhcmFtcyk7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBuZXcgVmFsdWVQbG90dGVyIHRvIGxhc3QgYWRkZWQgU3ViR3JvdXAuXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IC0gVGhlIG9iamVjdFxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIC0gVGhlIHByb3BlcnR5IGtleVxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnNcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmxhYmVsPXZhbHVlXSAtIFBsb3R0ZXIgbGFiZWxcbiAqIEBwYXJhbSB7TnVtYmVyfSBbcGFyYW1zLmhlaWdodF0gLSBQbG90dGVyIGhlaWdodFxuICogQHBhcmFtIHtOdW1iZXJ9IFtwYXJhbXMucmVzb2x1dGlvbl0gLSBHcmFwaCByZXNvbHV0aW9uXG4gKiBAcmV0dXJucyB7UGFuZWx9XG4gKi9cblxuUGFuZWwucHJvdG90eXBlLmFkZFZhbHVlUGxvdHRlciA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KFZhbHVlUGxvdHRlcixvYmplY3QsdmFsdWUscGFyYW1zKTtcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBOdW1iZXJPdXRwdXQgdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBUaGUgb2JqZWN0XG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgLSBUaGUgcHJvcGVydHkga2V5XG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9dmFsdWVdIC0gT3V0cHV0IGxhYmVsXG4gKiBAcGFyYW0ge051bWJlcn0gW3BhcmFtcy5kcF0gLSBEZWNpbWFsIHBsYWNlcyBkaXNwbGF5ZWRcbiAqIEByZXR1cm5zIHtQYW5lbH1cbiAqL1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkTnVtYmVyT3V0cHV0ID0gZnVuY3Rpb24gKG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoTnVtYmVyT3V0cHV0LG9iamVjdCx2YWx1ZSxwYXJhbXMpO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbmV3IFN0cmluZ091dHB1dCB0byBsYXN0IGFkZGVkIFN1Ykdyb3VwLlxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCAtIFRoZSBvYmplY3RcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSAtIFRoZSBwcm9wZXJ0eSBrZXlcbiAqIEBwYXJhbSB7T2JqZWN0fSBbcGFyYW1zXSAtIENvbXBvbmVudCBvcHRpb25zXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy5sYWJlbD12YWx1ZV0gLSBPdXRwdXQgbGFiZWxcbiAqIEByZXR1cm5zIHtQYW5lbH1cbiAqL1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkU3RyaW5nT3V0cHV0ID0gZnVuY3Rpb24gKG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoU3RyaW5nT3V0cHV0LG9iamVjdCx2YWx1ZSxwYXJhbXMpO1xufTtcblxuUGFuZWwucHJvdG90eXBlLmFkZENhbnZhcyA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KENhbnZhc18scGFyYW1zKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5hZGRTVkcgPSBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChTVkdfLHBhcmFtcyk7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuc2V0RGF0YSA9IGZ1bmN0aW9uKGRhdGEpe1xuICAgIHZhciBncm91cHMgPSB0aGlzLl9ncm91cHMsXG4gICAgICAgIGkgPSAtMSwgbCA9IGdyb3Vwcy5sZW5ndGg7XG4gICAgd2hpbGUoKytpIDwgbCl7XG4gICAgICAgIGdyb3Vwc1tpXS5zZXREYXRhKGRhdGFbaV0pO1xuICAgIH1cbn07XG5cblBhbmVsLnByb3RvdHlwZS5nZXREYXRhID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgZ3JvdXBzID0gdGhpcy5fZ3JvdXBzLFxuICAgICAgICBpID0gLTEsIGwgPSBncm91cHMubGVuZ3RoO1xuICAgIHZhciBkYXRhID0gW107XG4gICAgd2hpbGUoKytpICA8IGwpe1xuICAgICAgICBkYXRhLnB1c2goZ3JvdXBzW2ldLmdldERhdGEoKSk7XG4gICAgfVxuICAgIHJldHVybiBkYXRhO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQYW5lbDsiLCJ2YXIgUGFuZWxFdmVudCA9IHtcblx0UEFORUxfTU9WRV9CRUdJTiAgICAgICAgICA6ICdwYW5lbE1vdmVCZWdpbicsXG5cdFBBTkVMX01PVkUgICAgICAgICAgICAgICAgOiAncGFuZWxNb3ZlJyxcblx0UEFORUxfTU9WRV9FTkQgICAgICAgICAgICA6ICdwYW5lbE1vdmVFbmQnLFxuXG5cdFBBTkVMX1NIT1cgICAgICAgICAgICAgICAgOiAncGFuZWxTaG93Jyxcblx0UEFORUxfSElERSAgICAgICAgICAgICAgICA6ICdwYW5lbEhpZGUnLFxuXG5cdFBBTkVMX1NDUk9MTF9XUkFQX0FEREVEICAgOiAncGFuZWxTY3JvbGxXcmFwQWRkZWQnLFxuXHRQQU5FTF9TQ1JPTExfV1JBUF9SRU1PVkVEIDogJ3BhbmVsU2Nyb2xsV3JhcFJlbW92ZWQnLFxuXG5cdFBBTkVMX1NJWkVfQ0hBTkdFICAgICAgICA6ICdwYW5lbFNpemVDaGFuZ2UnXG59O1xubW9kdWxlLmV4cG9ydHMgPSBQYW5lbEV2ZW50OyIsInZhciBBYnN0cmFjdEdyb3VwID0gcmVxdWlyZSgnLi9BYnN0cmFjdEdyb3VwJyk7XG52YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xudmFyIENTUyAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xuXG52YXIgRXZlbnRfICAgICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXG4gICAgRG9jdW1lbnRFdmVudCAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcbiAgICBQYW5lbEV2ZW50ICAgICA9IHJlcXVpcmUoJy4vUGFuZWxFdmVudCcpLFxuICAgIEdyb3VwRXZlbnQgICAgID0gcmVxdWlyZSgnLi9Hcm91cEV2ZW50JyksXG4gICAgQ29tcG9uZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL0NvbXBvbmVudEV2ZW50Jyk7XG5cbmZ1bmN0aW9uIFN1Ykdyb3VwKHBhcmVudCxwYXJhbXMpe1xuICAgIHBhcmFtcyAgICAgICAgICAgID0gcGFyYW1zICAgICAgICAgIHx8IHt9O1xuICAgIHBhcmFtcy5sYWJlbCAgICAgID0gcGFyYW1zLmxhYmVsICAgIHx8IG51bGw7XG4gICAgcGFyYW1zLnVzZUxhYmVscyAgPSBwYXJhbXMudXNlTGFiZWxzICA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IHBhcmFtcy51c2VMYWJlbHM7XG5cbiAgICBBYnN0cmFjdEdyb3VwLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuICAgIHZhciByb290Tm9kZSA9IHRoaXMuX25vZGUsXG4gICAgICAgIHdyYXBOb2RlID0gdGhpcy5fd3JhcE5vZGUsXG4gICAgICAgIGxpc3ROb2RlID0gdGhpcy5fbGlzdE5vZGU7XG5cbiAgICAgICAgcm9vdE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuU3ViR3JvdXApO1xuICAgICAgICB3cmFwTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5XcmFwKTtcblxuICAgICAgICB3cmFwTm9kZS5hZGRDaGlsZChsaXN0Tm9kZSk7XG4gICAgICAgIHJvb3ROb2RlLmFkZENoaWxkKHdyYXBOb2RlKTtcblxuICAgIHRoaXMuX3VzZUxhYmVscyAgPSBwYXJhbXMudXNlTGFiZWxzO1xuXG4gICAgdmFyIGxhYmVsID0gcGFyYW1zLmxhYmVsO1xuXG4gICAgaWYgKGxhYmVsICYmIGxhYmVsLmxlbmd0aCAhPSAwICYmIGxhYmVsICE9ICdub25lJykge1xuICAgICAgICB2YXIgaGVhZE5vZGUgPSB0aGlzLl9oZWFkTm9kZSA9IG5ldyBOb2RlKCksXG4gICAgICAgICAgICBsYWJsV3JhcCA9IG5ldyBOb2RlKCksXG4gICAgICAgICAgICBsYWJsTm9kZSA9IG5ldyBOb2RlKE5vZGUuU1BBTik7XG5cbiAgICAgICAgaGVhZE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuSGVhZCk7XG4gICAgICAgIGxhYmxXcmFwLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApO1xuICAgICAgICBsYWJsTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCk7XG5cbiAgICAgICAgbGFibE5vZGUuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsIGxhYmVsKTtcblxuICAgICAgICBsYWJsV3JhcC5hZGRDaGlsZChsYWJsTm9kZSk7XG4gICAgICAgIGhlYWROb2RlLmFkZENoaWxkKGxhYmxXcmFwKTtcblxuXG4gICAgICAgIHZhciBpbmRpTm9kZSA9IHRoaXMuX2luZGlOb2RlID0gbmV3IE5vZGUoKTtcbiAgICAgICAgaW5kaU5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQXJyb3dCU3ViTWF4KTtcbiAgICAgICAgaGVhZE5vZGUuYWRkQ2hpbGRBdChpbmRpTm9kZSwgMCk7XG5cbiAgICAgICAgcm9vdE5vZGUuYWRkQ2hpbGRBdChoZWFkTm9kZSwgMCk7XG5cbiAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuU1VCR1JPVVBfVFJJR0dFUiwgdGhpcy5fcGFyZW50LCAnb25TdWJHcm91cFRyaWdnZXInKTtcbiAgICAgICAgaGVhZE5vZGUuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uSGVhZE1vdXNlRG93bi5iaW5kKHRoaXMpKTtcblxuICAgICAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XG5cbiAgICB9XG5cbiAgICBpZih0aGlzLmhhc01heEhlaWdodCgpKXtcbiAgICAgICAgdGhpcy5hZGRTY3JvbGxXcmFwKCk7XG4gICAgfVxuXG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5TVUJHUk9VUF9FTkFCTEUsICB0aGlzLCAnb25FbmFibGUnKTtcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LlNVQkdST1VQX0RJU0FCTEUsIHRoaXMsICdvbkRpc2FibGUnKTtcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihQYW5lbEV2ZW50LlBBTkVMX01PVkVfRU5ELCAgIHRoaXMsICdvblBhbmVsTW92ZUVuZCcpO1xuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UsdGhpcywgJ29uR3JvdXBTaXplQ2hhbmdlJyk7XG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoUGFuZWxFdmVudC5QQU5FTF9TSVpFX0NIQU5HRSx0aGlzLCAnb25QYW5lbFNpemVDaGFuZ2UnKTtcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50LldJTkRPV19SRVNJWkUsICAgIHRoaXMsICdvbldpbmRvd1Jlc2l6ZScpO1xuXG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuR1JPVVBfU0laRV9VUERBVEUsdGhpcy5fcGFyZW50LCdvbkdyb3VwU2l6ZVVwZGF0ZScpO1xufVxuU3ViR3JvdXAucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShBYnN0cmFjdEdyb3VwLnByb3RvdHlwZSk7XG5TdWJHcm91cC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTdWJHcm91cDtcblxuLy9GSVhNRVxuU3ViR3JvdXAucHJvdG90eXBlLl9vbkhlYWRNb3VzZURvd24gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fZW5hYmxlZCA9ICF0aGlzLl9lbmFibGVkO1xuICAgIHRoaXMuX29uVHJpZ2dlcigpO1xuXG4gICAgdmFyIGV2ZW50ID0gRG9jdW1lbnRFdmVudC5NT1VTRV9VUCxcbiAgICAgICAgc2VsZiAgPSB0aGlzO1xuICAgIHZhciBvbkRvY3VtZW50TW91c2VVcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2VsZi5fb25UcmlnZ2VyKCk7XG4gICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnQsIG9uRG9jdW1lbnRNb3VzZVVwKTtcbiAgICB9O1xuXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudCxvbkRvY3VtZW50TW91c2VVcCk7XG59O1xuXG5TdWJHcm91cC5wcm90b3R5cGUuX29uVHJpZ2dlciA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLEdyb3VwRXZlbnQuU1VCR1JPVVBfVFJJR0dFUixudWxsKSk7XG59O1xuXG5cblN1Ykdyb3VwLnByb3RvdHlwZS5fdXBkYXRlQXBwZWFyYW5jZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5pc0Rpc2FibGVkKCkpIHtcbiAgICAgICAgdGhpcy5fd3JhcE5vZGUuc2V0SGVpZ2h0KDApO1xuICAgICAgICBpZiAodGhpcy5oYXNMYWJlbCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9oZWFkTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5IZWFkSW5hY3RpdmUpO1xuICAgICAgICAgICAgdGhpcy5faW5kaU5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQXJyb3dCU3ViTWluKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgaWYgKHRoaXMuaGFzTWF4SGVpZ2h0KCkpIHtcbiAgICAgICAgICAgIHRoaXMuX3dyYXBOb2RlLnNldEhlaWdodCh0aGlzLmdldE1heEhlaWdodCgpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3dyYXBOb2RlLmRlbGV0ZVN0eWxlUHJvcGVydHkoJ2hlaWdodCcpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmhhc0xhYmVsKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2hlYWROb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkhlYWQpO1xuICAgICAgICAgICAgdGhpcy5faW5kaU5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQXJyb3dCU3ViTWF4KTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblN1Ykdyb3VwLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuaGFzTWF4SGVpZ2h0KCkpe1xuICAgICAgICB0aGlzLl9zY3JvbGxCYXIudXBkYXRlKCk7XG4gICAgfVxufTtcblxuU3ViR3JvdXAucHJvdG90eXBlLm9uQ29tcG9uZW50U2VsZWN0RHJhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnByZXZlbnRTZWxlY3REcmFnKCk7XG59O1xuXG5TdWJHcm91cC5wcm90b3R5cGUub25FbmFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuaXNEaXNhYmxlZCgpKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBDb21wb25lbnRFdmVudC5FTkFCTEUsIG51bGwpKTtcbn07XG5TdWJHcm91cC5wcm90b3R5cGUub25EaXNhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmlzRGlzYWJsZWQoKSl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuRElTQUJMRSwgbnVsbCkpO1xufTtcblxuLy9idWJibGVcblN1Ykdyb3VwLnByb3RvdHlwZS5vbkdyb3VwU2l6ZUNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBHcm91cEV2ZW50LkdST1VQX1NJWkVfQ0hBTkdFLCBudWxsKSk7XG59O1xuU3ViR3JvdXAucHJvdG90eXBlLm9uR3JvdXBTaXplVXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIEdyb3VwRXZlbnQuR1JPVVBfU0laRV9VUERBVEUsIG51bGwpKTtcbn07XG5TdWJHcm91cC5wcm90b3R5cGUub25QYW5lbE1vdmVFbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgUGFuZWxFdmVudC5QQU5FTF9NT1ZFX0VORCwgbnVsbCkpO1xufTtcblN1Ykdyb3VwLnByb3RvdHlwZS5vblBhbmVsU2l6ZUNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XG59O1xuU3ViR3JvdXAucHJvdG90eXBlLm9uV2luZG93UmVzaXplID0gZnVuY3Rpb24gKGUpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQoZSk7XG59O1xuXG5TdWJHcm91cC5wcm90b3R5cGUuaGFzTGFiZWwgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2hlYWROb2RlICE9IG51bGw7XG59O1xuU3ViR3JvdXAucHJvdG90eXBlLmFkZENvbXBvbmVudE5vZGUgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgIHRoaXMuX2xpc3ROb2RlLmFkZENoaWxkKG5vZGUpO1xufTtcblN1Ykdyb3VwLnByb3RvdHlwZS51c2VzTGFiZWxzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl91c2VMYWJlbHM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN1Ykdyb3VwOyJdfQ==
(1)
});
