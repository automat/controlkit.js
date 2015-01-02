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
},{"../core/ComponentEvent":31,"../core/ObjectComponent":35,"../core/document/CSS":42,"../core/document/DocumentEvent":43,"../core/document/Node":45,"../core/document/NodeEvent":46,"../core/event/Event":48,"./ButtonPreset":4,"./Metric":12,"./NumberInput_Internal":14,"./Options":16}],14:[function(_dereq_,module,exports){
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
var Style = { string : "#controlKit{position:absolute;top:0;left:0;width:100%;height:100%;-webkit-touch-callout:none;-webkit-user-select:none;-khtml-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;pointer-events:none}#controlKit .panel{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;pointer-events:auto;position:relative;z-index:1;-webkit-touch-callout:none;-webkit-user-select:none;-khtml-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;overflow:hidden;opacity:1;float:left;width:200px;border-radius:3px;-moz-border-radius:3px;box-shadow:0 2px 2px rgba(0,0,0,.25);margin:0;padding:0;background-color:#1a1a1a;font-family:Arial,sans-serif}#controlKit .panel .wrap{width:auto;height:auto;margin:0;padding:0;position:relative;overflow:hidden}#controlKit .panel ul{margin:0;padding:0;list-style:none}#controlKit .panel .color,#controlKit .panel input[type=text],#controlKit .panel textarea,#controlKit .picker input[type=text]{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;width:100%;height:25px;padding:0 0 0 8px;font-family:Arial,sans-serif;font-size:11px;color:#fff;text-shadow:1px 1px #000;outline:0;background:#222729;background-image:-o-linear-gradient(rgba(0,0,0,.075) 0,rgba(0,0,0,.125) 100%);background-image:linear-gradient(rgba(0,0,0,.075) 0,rgba(0,0,0,.125) 100%);border:none;box-shadow:0 0 0 1px #1f1f1f inset;border-radius:2px;-moz-border-radius:2px}#controlKit .panel .button,#controlKit .panel .select,#controlKit .panel .select-active,#controlKit .picker .button{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;cursor:pointer;width:100%;height:26px;margin:0;background-image:-o-linear-gradient(#404040 0,#3b3b3b 100%);background-image:linear-gradient(#404040 0,#3b3b3b 100%);border:none;outline:0;border-radius:2px;box-shadow:0 0 0 1px #1f1f1f inset,-1px 2px 0 0 #4a4a4a inset;font-family:Arial,sans-serif;color:#fff}#controlKit .panel textarea{padding:5px 8px 2px;overflow:hidden;resize:none;vertical-align:top;white-space:nowrap}#controlKit .panel .textarea-wrap{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;width:100%;padding:0;float:left;height:100%;overflow:hidden;border:none;border-radius:2px;-moz-border-radius:2px;background-color:#222729;box-shadow:0 0 1px 2px rgba(0,0,0,.0125) inset,0 0 1px 1px #111314 inset;background-image:-o-linear-gradient(rgba(0,0,0,.075) 0,rgba(0,0,0,.125) 100%);background-image:linear-gradient(rgba(0,0,0,.075) 0,rgba(0,0,0,.125) 100%)}#controlKit .panel .textarea-wrap textarea{border:none;border-radius:2px;-moz-border-radius:2px;box-shadow:none;background:0 0}#controlKit .panel .textarea-wrap .scrollBar{border:1px solid #101213;border-bottom-right-radius:2px;border-top-right-radius:2px;border-left:none;box-shadow:0 0 1px 2px rgba(0,0,0,.0125) inset,0 0 1px 1px #111314 inset}#controlKit .panel canvas{cursor:pointer;vertical-align:bottom;border:none;box-shadow:0 0 0 1px #1f1f1f inset;border-radius:2px;-moz-border-radius:2px}#controlKit .panel .canvas-wrap,#controlKit .panel .svg-wrap{margin:6px 0 0;position:relative;width:70%;float:right;-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border:none;border-radius:2px;-moz-border-radius:2px;background:#1e2224;background-image:-o-linear-gradient(transparent 0,rgba(0,0,0,.05) 100%);background-image:linear-gradient(transparent 0,rgba(0,0,0,.05) 100%)}#controlKit .panel .canvas-wrap svg,#controlKit .panel .svg-wrap svg{position:absolute;left:0;top:0;cursor:pointer;vertical-align:bottom;border:none;box-shadow:0 0 0 1px #1f1f1f inset;border-radius:2px;-moz-border-radius:2px}#controlKit .panel .button,#controlKit .picker .button{font-size:10px;font-weight:700;text-shadow:0 1px #000;text-transform:uppercase}#controlKit .panel .button:hover,#controlKit .picker .button:hover{background-image:-o-linear-gradient(#454545 0,#3b3b3b 100%);background-image:linear-gradient(#454545 0,#3b3b3b 100%)}#controlKit .panel .button:active,#controlKit .picker .button:active{background-image:-o-linear-gradient(#404040 0,#3b3b3b 100%);background-image:linear-gradient(#404040 0,#3b3b3b 100%)}#controlKit .panel .color-with-preset-wrap,#controlKit .panel .input-with-preset-wrap{width:100%;float:left}#controlKit .panel .color-with-preset-wrap .color,#controlKit .panel .input-with-preset-wrap input[type=text]{padding-right:25px;border-top-right-radius:2px;border-bottom-right-radius:2px;float:left}#controlKit .panel .button-preset,#controlKit .panel .button-preset-active{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;position:absolute;right:0;width:20px;height:25px;margin:0;cursor:pointer;float:right;border:none;border-top-right-radius:2px;border-bottom-right-radius:2px;box-shadow:0 0 0 1px #1f1f1f inset,-1px 2px 0 0 #4a4a4a inset;outline:0}#controlKit .panel .button-preset-active,#controlKit .panel .button-preset:hover{background:url(data:image/png;base64,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) 50% 50% no-repeat,linear-gradient(#454545 0,#3b3b3b 100%)}#controlKit .panel .button-preset{background:url(data:image/png;base64,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) 50% 50% no-repeat,linear-gradient(#404040 0,#3b3b3b 100%)}#controlKit .panel input[type=checkbox]{margin:6px 0 0}#controlKit .panel .select,#controlKit .panel .select-active{padding-left:10px;padding-right:20px;font-size:11px;text-align:left;text-shadow:1px 1px #000;cursor:pointer;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}#controlKit .panel .select{background:url(data:image/png;base64,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) 100% 50% no-repeat,linear-gradient(#404040 0,#3b3b3b 100%)}#controlKit .panel .select-active,#controlKit .panel .select:hover{background:url(data:image/png;base64,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) 100% 50% no-repeat,linear-gradient(#454545 0,#3b3b3b 100%)}#controlKit .panel .slider-handle,#controlKit .panel .slider-slot,#controlKit .panel .slider-wrap,#controlKit .panel .wrap-slider{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box}#controlKit .panel .wrap-slider{width:70%;padding:6px 0 0;float:right;height:100%}#controlKit .panel .wrap-slider input[type=text]{width:25%;text-align:center;padding:0;float:right}#controlKit .panel .slider-wrap{float:left;cursor:ew-resize;width:70%}#controlKit .panel .slider-slot{width:100%;height:25px;padding:3px;background-color:#1e2224;border:none;box-shadow:0 0 0 1px #1f1f1f inset;border-radius:2px;-moz-border-radius:2px}#controlKit .panel .slider-handle{position:relative;width:100%;height:100%;background:#b32435;background-image:-o-linear-gradient(transparent 0,rgba(0,0,0,.1) 100%);background-image:linear-gradient(transparent 0,rgba(0,0,0,.1) 100%);box-shadow:0 1px 0 0 #0f0f0f}#controlKit .panel .color{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;-webkit-touch-callout:none;-webkit-user-select:none;-khtml-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;cursor:pointer;width:100%;height:25px;padding:0;border:none;background:#fff;box-shadow:0 0 0 1px #111314 inset;text-align:center;line-height:25px;border-radius:2px;-moz-border-radius:2px}#controlKit .panel .graph-slider-x-wrap,#controlKit .panel .graph-slider-y-wrap{position:absolute;-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box}#controlKit .panel .graph-slider-x-wrap{bottom:0;left:0;width:100%;padding:6px 20px 6px 6px}#controlKit .panel .graph-slider-y-wrap{top:0;right:0;height:100%;padding:6px 6px 20px}#controlKit .panel .graph-slider-x,#controlKit .panel .graph-slider-y{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border-radius:2px;-moz-border-radius:2px;background:rgba(24,27,29,.5);border:1px solid #181b1d}#controlKit .panel .graph-slider-x{height:8px}#controlKit .panel .graph-slider-y{width:8px;height:100%}#controlKit .panel .graph-slider-x-handle,#controlKit .panel .graph-slider-y-handle{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;cursor:pointer;border:1px solid #181b1d;background:#303639}#controlKit .panel .graph-slider-x-handle{width:20px;height:100%;border-top:none;border-bottom:none}#controlKit .panel .graph-slider-y-handle{width:100%;height:20px;border-left:none;border-right:none}#controlKit .sub-group .wrap .wrap .wrap{width:25%!important;padding:0!important;float:left!important}#controlKit .sub-group .wrap .wrap .wrap .label{width:100%!important;padding:8px 0 0!important;color:#878787!important;text-align:center!important;text-transform:uppercase!important;font-weight:700!important;text-shadow:1px 1px #1a1a1a!important}#controlKit .sub-group .wrap .wrap .wrap input[type=text]{padding:0;text-align:center}#controlKit .options{pointer-events:auto;-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border:1px solid #1f1f1f;border-radius:2px;-moz-border-radius:2px;position:absolute;z-index:2147483638;left:0;top:0;width:auto;height:auto;box-shadow:0 1px 0 0 #4a4a4a inset;background-color:#454545;font-family:Arial,sans-serif;font-size:11px;color:#fff;text-shadow:1px 1px #000;overflow:hidden}#controlKit .options ul{width:100%;list-style:none;margin:0;padding:0}#controlKit .options ul li{margin:0;width:100%;height:25px;line-height:25px;padding:0 20px 0 10px;overflow:hidden;white-space:normal;text-overflow:ellipsis;cursor:pointer}#controlKit .options ul li:hover{background-color:#1f2325}#controlKit .options ul .li-selected{background-color:#292d30}#controlKit .options .color{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box}#controlKit .options .color .li-selected,#controlKit .options .color li{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;padding:0;height:25px;line-height:25px;text-align:center}#controlKit .options .color .li-selected:hover,#controlKit .options .color li:hover{background:0 0;font-weight:700}#controlKit .options .color .li-selected{font-weight:700}#controlKit .panel .label,#controlKit .picker .label{width:100%;float:left;font-size:11px;font-weight:700;text-shadow:0 1px #000;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;cursor:default}#controlKit .panel .head,#controlKit .panel .panel-head-inactive,#controlKit .picker .head{height:30px;padding:0 10px;background:#1a1a1a;overflow:hidden}#controlKit .panel .head .wrap,#controlKit .panel .panel-head-inactive .wrap,#controlKit .picker .head .wrap{width:auto;height:auto;margin:0;padding:0;position:relative;overflow:hidden}#controlKit .panel .head .label,#controlKit .picker .head .label{cursor:pointer;line-height:30px;color:#65696b}#controlKit .panel .group-list .group .head{height:38px;padding:0 10px;border-top:1px solid #4f4f4f;border-bottom:1px solid #262626;background-image:-o-linear-gradient(#454545 0,#3b3b3b 100%);background-image:linear-gradient(#454545 0,#3b3b3b 100%);cursor:pointer}#controlKit .panel .group-list .group .head .label{font-size:12px;line-height:38px;color:#fff}#controlKit .panel .group-list .group .head:hover{border-top:1px solid #525252;background-image:-o-linear-gradient(#454545 0,#404040 100%);background-image:linear-gradient(#454545 0,#404040 100%)}#controlKit .panel .group-list .group li{height:35px;padding:0 10px}#controlKit .panel .group-list .group .sub-group-list .sub-group:last-of-type{border-bottom:none}#controlKit .panel .group-list .group .sub-group-list .sub-group{padding:0;height:auto;border-bottom:1px solid #242424}#controlKit .panel .group-list .group .sub-group-list .sub-group ul{overflow:hidden}#controlKit .panel .group-list .group .sub-group-list .sub-group ul li{background:#2e2e2e;border-bottom:1px solid #222729}#controlKit .panel .group-list .group .sub-group-list .sub-group ul li:last-of-type{border-bottom:none}#controlKit .panel .group-list .group .sub-group-list .sub-group:first-child{margin-top:0}#controlKit .panel .group-list .group .sub-group-list .sub-group .head,#controlKit .panel .group-list .group .sub-group-list .sub-group .head-inactive{cursor:pointer}#controlKit .panel .group-list .group .sub-group-list .sub-group .head{height:27px;padding:0 10px;border-top:none;border-bottom:1px solid #242424;background-image:none;background-color:#272727}#controlKit .panel .group-list .group .sub-group-list .sub-group .head:hover{background-image:none;background-color:#272727}#controlKit .panel .group-list .group .sub-group-list .sub-group .head-inactive{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;height:27px;padding:0 10px;box-shadow:0 1px 0 0 #404040 inset;background-image:-o-linear-gradient(#3b3b3b 0,#383838 100%);background-image:linear-gradient(#3b3b3b 0,#383838 100%)}#controlKit .panel .group-list .group .sub-group-list .sub-group .head-inactive:hover{box-shadow:0 1px 0 0 #474747 inset;background-image:none;background-image:-o-linear-gradient(#404040 0,#3b3b3b 100%);background-image:linear-gradient(#404040 0,#3b3b3b 100%)}#controlKit .panel .group-list .group .sub-group-list .sub-group .head .label,#controlKit .panel .group-list .group .sub-group-list .sub-group .head-inactive .label{margin:0;padding:0;line-height:27px;color:#fff;font-weight:700;font-size:11px;text-shadow:1px 1px #000;text-transform:capitalize}#controlKit .panel .group-list .group .sub-group-list .sub-group .head .wrap .label,#controlKit .panel .group-list .group .sub-group-list .sub-group .head-inactive .wrap .label{width:100%;font-weight:700;color:#fff;padding:0}#controlKit .panel .group-list .group .sub-group-list .sub-group .wrap .label{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;height:100%;width:30%;padding:12px 5px 0 0;float:left;font-size:11px;font-weight:400;color:#aeb5b8;text-shadow:1px 1px #000}#controlKit .panel .group-list .group .sub-group-list .sub-group .wrap .wrap{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;width:70%;padding:5px 0 0;float:right;height:100%}#controlKit .panel .group-list .group:last-child .scroll-buffer:nth-of-type(3),#controlKit .panel .group-list .group:last-child .sub-group-list{border-bottom:none}#controlKit .panel .scroll-wrap{position:relative;overflow:hidden}#controlKit .panel .scroll-buffer{width:100%;height:8px;border-top:1px solid #3b4447;border-bottom:1px solid #1e2224}#controlKit .panel .scrollBar{-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box;width:15px;height:100%;float:right;top:0;padding:0;margin:0;position:relative;background:#212628;background-image:linear-gradient(to right,#242424 0,#2e2e2e 100%)}#controlKit .panel .scrollBar .track{padding:0 3px 0 2px}#controlKit .panel .scrollBar .track .thumb{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;width:11px;position:absolute;cursor:pointer;background-color:#343434;border:1px solid #1b1f21;border-radius:10px;-moz-border-radius:10px;box-shadow:inset 0 1px 0 0 #434b50}#controlKit .panel .menu,#controlKit .panel .menu-active,#controlKit .picker .menu{float:right;padding:5px 0 0}#controlKit .panel .menu input[type=button],#controlKit .panel .menu-active input[type=button],#controlKit .picker .menu input[type=button]{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;cursor:pointer;height:20px;border:none;vertical-align:top;border-radius:2px;-moz-border-radius:2px;font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:#aaa;text-shadow:0 -1px #000;text-transform:uppercase;box-shadow:0 0 0 1px #131313 inset,-1px 2px 0 0 #212527 inset}#controlKit .panel .menu .button-menu-close,#controlKit .panel .menu .button-menu-hide,#controlKit .panel .menu .button-menu-show,#controlKit .panel .menu-active .button-menu-close,#controlKit .panel .menu-active .button-menu-hide,#controlKit .panel .menu-active .button-menu-show,#controlKit .picker .menu .button-menu-close,#controlKit .picker .menu .button-menu-hide,#controlKit .picker .menu .button-menu-show{width:20px;margin-left:4px}#controlKit .panel .menu .button-menu-hide,#controlKit .panel .menu-active .button-menu-hide,#controlKit .picker .menu .button-menu-hide{background:url(data:image/png;base64,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) 50% 50% no-repeat,#1a1d1f}#controlKit .panel .menu .button-menu-hide:hover,#controlKit .panel .menu-active .button-menu-hide:hover,#controlKit .picker .menu .button-menu-hide:hover{background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAFCAYAAAB4ka1VAAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo+qi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt/87fOH4p3iC+N7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi/RNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z+pn5mZ2y6xlhbL+xW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a/zYnKOZarnivN7cyzytuQN5zvn//tEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1+1dT1gvWd+1YfqGnRs+FYmKrhTbF5cVf9go3HjlG4dvyr+Z3JS0qavEuWTPZtJm6ebeLZ5bDpaql+aXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO/PLi8ZafJzs07P1SkVPRU+lQ27tLdtWHX+G7R7ht7vPY07NXbW7z3/T7JvttVAVVN1WbVZftJ+7P3P66Jqun4lvttXa1ObXHtxwPSA/0HIw6217nU1R3SPVRSj9Yr60cOxx++/p3vdy0NNg1VjZzG4iNwRHnk6fcJ3/ceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w+0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb++6EHTh0kX/i+c7vDvOXPK4dPKy2+UTV7hXmq86X23qdOo8/pPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb/1tWeOT3dvfN6b/fF9/XfFt1+cif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v+3Njv3H9qwHeg89HcR/cGhYPP/pH1jw9DBY+Zj8uGDYbrnjg+OTniP3L96fynQ89kzyaeF/6i/suuFxYvfvjV69fO0ZjRoZfyl5O/bXyl/erA6xmv28bCxh6+yXgzMV70VvvtwXfcdx3vo98PT+R8IH8o/2j5sfVT0Kf7kxmTk/8EA5jz/GMzLdsAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAAAGRJREFUeNpidPUNYoCBU0cO1DMwMDCY2Tg0wsRYkCVlFZUboGy4ImZldU24pJySCgO/oBADAwODw/VL5xmk5RQOMr99/RIuCQPIiljMbBwYGBgYGH7//MmADCSlZRkkpWUZAAMAvTsgXBvOsq0AAAAASUVORK5CYII=) 50% 50% no-repeat,#000;box-shadow:#fff 0,#000 100%}#controlKit .panel .menu .button-menu-show,#controlKit .panel .menu-active .button-menu-show,#controlKit .picker .menu .button-menu-show{background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAFCAYAAAB4ka1VAAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo+qi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt/87fOH4p3iC+N7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi/RNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z+pn5mZ2y6xlhbL+xW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a/zYnKOZarnivN7cyzytuQN5zvn//tEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1+1dT1gvWd+1YfqGnRs+FYmKrhTbF5cVf9go3HjlG4dvyr+Z3JS0qavEuWTPZtJm6ebeLZ5bDpaql+aXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO/PLi8ZafJzs07P1SkVPRU+lQ27tLdtWHX+G7R7ht7vPY07NXbW7z3/T7JvttVAVVN1WbVZftJ+7P3P66Jqun4lvttXa1ObXHtxwPSA/0HIw6217nU1R3SPVRSj9Yr60cOxx++/p3vdy0NNg1VjZzG4iNwRHnk6fcJ3/ceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w+0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb++6EHTh0kX/i+c7vDvOXPK4dPKy2+UTV7hXmq86X23qdOo8/pPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb/1tWeOT3dvfN6b/fF9/XfFt1+cif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v+3Njv3H9qwHeg89HcR/cGhYPP/pH1jw9DBY+Zj8uGDYbrnjg+OTniP3L96fynQ89kzyaeF/6i/suuFxYvfvjV69fO0ZjRoZfyl5O/bXyl/erA6xmv28bCxh6+yXgzMV70VvvtwXfcdx3vo98PT+R8IH8o/2j5sfVT0Kf7kxmTk/8EA5jz/GMzLdsAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAAAFpJREFUeNpsjDEOgCAQBOc4eqNfoCB8wMrCnwk/82EHWEkwcatJZrKyrFsGLv5X/H6cqPc41Y9ptVLN0BDT3VsTETnFuVkWIGuICWBEvfchAfz0mqvZ4BeeAQDzViMzJy0RXgAAAABJRU5ErkJggg==) 50% 50% no-repeat,#1a1d1f}#controlKit .panel .menu .button-menu-show:hover,#controlKit .panel .menu-active .button-menu-show:hover,#controlKit .picker .menu .button-menu-show:hover{background:url(data:image/png;base64,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) 50% 50% no-repeat,#000;box-shadow:#fff 0,#000 100%}#controlKit .panel .menu .button-menu-close,#controlKit .panel .menu-active .button-menu-close,#controlKit .picker .menu .button-menu-close{background:url(data:image/png;base64,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) 50% 50% no-repeat,#1a1d1f}#controlKit .panel .menu .button-menu-close:hover,#controlKit .panel .menu-active .button-menu-close:hover,#controlKit .picker .menu .button-menu-close:hover{background:url(data:image/png;base64,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) 50% 50% no-repeat,#000;box-shadow:#fff 0,#000 100%}#controlKit .panel .menu .button-menu-undo,#controlKit .panel .menu-active .button-menu-undo{background:url(data:image/png;base64,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) 20% 50% no-repeat,#1a1d1f;padding:0 6px 1px 0;width:38px;vertical-align:top;text-align:end}#controlKit .panel .menu .button-menu-undo:hover,#controlKit .panel .menu-active .button-menu-undo:hover{background:url(data:image/png;base64,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) 20% 50% no-repeat,#000;box-shadow:#fff 0,#000 100%}#controlKit .panel .menu .button-menu-load,#controlKit .panel .menu-active .button-menu-load{margin-right:2px}#controlKit .panel .menu .button-menu-load,#controlKit .panel .menu .button-menu-save,#controlKit .panel .menu-active .button-menu-load,#controlKit .panel .menu-active .button-menu-save{background:#1a1d1f;font-size:9px!important}#controlKit .panel .menu .button-menu-load:hover,#controlKit .panel .menu .button-menu-save:hover,#controlKit .panel .menu-active .button-menu-load:hover,#controlKit .panel .menu-active .button-menu-save:hover{background:#000}#controlKit .panel .menu .wrap{display:none}#controlKit .panel .menu-active{width:100%;float:left}#controlKit .panel .menu-active .wrap{display:inline}#controlKit .panel .menu-active .button-menu-close,#controlKit .panel .menu-active .button-menu-hide,#controlKit .panel .menu-active .button-menu-show{float:right}#controlKit .panel .arrow-s-max{background:url(data:image/png;base64,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) center no-repeat}#controlKit .panel .arrow-s-min{background:url(data:image/png;base64,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) center no-repeat}#controlKit .panel .arrow-s-max,#controlKit .panel .arrow-s-min{width:100%;height:20px}#controlKit .panel .arrow-b-max{background:url(data:image/png;base64,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) center no-repeat}#controlKit .panel .arrow-b-min{background:url(data:image/png;base64,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) center no-repeat}#controlKit .panel .arrow-b-sub-max{background:url(data:image/png;base64,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) center no-repeat}#controlKit .panel .arrow-b-sub-min{background:url(data:image/png;base64,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) center no-repeat}#controlKit .panel .arrow-b-max,#controlKit .panel .arrow-b-min,#controlKit .panel .arrow-b-sub-max,#controlKit .panel .arrow-b-sub-min{width:10px;height:100%;float:right}#controlKit .picker{pointer-events:auto;-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border-radius:3px;-moz-border-radius:3px;background-color:#3b3b3b;font-family:Arial,sans-serif;font-size:11px;color:#fff;text-shadow:1px 1px #000;overflow:hidden;position:absolute;z-index:2147483631;width:360px;-webkit-touch-callout:none;-webkit-user-select:none;-khtml-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;box-shadow:0 2px 2px rgba(0,0,0,.25)}#controlKit .picker canvas{vertical-align:bottom;cursor:pointer}#controlKit .picker .wrap{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;padding:10px;float:left}#controlKit .picker .field-wrap{padding:3px}#controlKit .picker .slider-wrap{padding:3px 13px 3px 3px}#controlKit .picker .field-wrap,#controlKit .picker .input-wrap,#controlKit .picker .slider-wrap{height:auto;overflow:hidden;float:left}#controlKit .picker .input-wrap{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border:1px solid #242424;border-radius:2px;-moz-border-radius:2px;width:140px;float:right;padding:5px 10px 1px 0}#controlKit .picker .input-field{width:50%;float:right;margin-bottom:4px}#controlKit .picker .input-field .label{padding:8px 0 0;color:#878787;text-align:center;text-transform:uppercase;font-weight:700;text-shadow:1px 1px #1a1a1a;width:40%}#controlKit .picker .input-field .wrap{padding:0;width:60%;height:auto;float:right}#controlKit .picker .controls-wrap{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;width:100%;height:auto;float:right;padding:9px 0 0}#controlKit .picker .controls-wrap input[type=button]{float:right;width:65px;margin:0 0 0 10px}#controlKit .picker .color-contrast{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border:none;box-shadow:0 0 0 1px #1f1f1f inset;border-radius:2px;-moz-border-radius:2px;height:25px;padding:3px;width:80%;margin-bottom:4px;float:right}#controlKit .picker .color-contrast div{width:50%;height:100%;float:left}#controlKit .picker input[type=text]{padding:0;text-align:center;width:60%;float:right}#controlKit .picker .wrap .input-wrap:nth-of-type(3){border-bottom-left-radius:0;border-bottom-right-radius:0}#controlKit .picker .wrap .input-wrap:nth-of-type(4){border-top:none;border-top-left-radius:0;border-top-right-radius:0}#controlKit .picker .wrap .input-wrap:nth-of-type(4) .input-field{width:100%}#controlKit .picker .wrap .input-wrap:nth-of-type(4) .input-field .label{width:20%}#controlKit .picker .wrap .input-wrap:nth-of-type(4) input[type=text]{width:80%}#controlKit .picker .field-wrap,#controlKit .picker .slider-wrap{background:#1e2224;border:none;box-shadow:0 0 0 1px #1f1f1f inset;border-radius:2px;-moz-border-radius:2px;position:relative;margin-right:5px}#controlKit .picker .field-wrap .indicator,#controlKit .picker .slider-wrap .indicator{position:absolute;border:2px solid #fff;box-shadow:0 1px black,0 1px #000 inset;cursor:pointer}#controlKit .picker .field-wrap .indicator{width:8px;height:8px;left:50%;top:50%;border-radius:50%;-moz-border-radius:50%}#controlKit .picker .slider-wrap .indicator{width:14px;height:3px;border-radius:8px;-moz-border-radius:8px;left:1px;top:1px}#controlKit .picker .slider-wrap .indicator:after{content:'';width:0;height:0;border-top:4.5px solid transparent;border-bottom:4.5px solid transparent;border-right:4px solid #fff;float:right;position:absolute;top:-2px;left:19px}#controlKit .picker .slider-wrap .indicator:before{content:'';width:0;height:0;border-top:4.5px solid transparent;border-bottom:4.5px solid transparent;border-right:4px solid #000;float:right;position:absolute;top:-3px;left:19px}" }; module.exports = Style;var Style = { string : "#controlKit{position:absolute;top:0;left:0;width:100%;height:100%;-webkit-touch-callout:none;-webkit-user-select:none;-khtml-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;pointer-events:none}#controlKit .panel{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;pointer-events:auto;position:relative;z-index:1;-webkit-touch-callout:none;-webkit-user-select:none;-khtml-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;overflow:hidden;opacity:1;float:left;width:200px;border-radius:3px;-moz-border-radius:3px;box-shadow:0 2px 2px rgba(0,0,0,.25);margin:0;padding:0;background-color:#1a1a1a;font-family:Arial,sans-serif}#controlKit .panel .wrap{width:auto;height:auto;margin:0;padding:0;position:relative;overflow:hidden}#controlKit .panel ul{margin:0;padding:0;list-style:none}#controlKit .panel .color,#controlKit .panel input[type=text],#controlKit .panel textarea,#controlKit .picker input[type=text]{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;width:100%;height:25px;padding:0 0 0 8px;font-family:Arial,sans-serif;font-size:11px;color:#fff;text-shadow:1px 1px #000;outline:0;background:#222729;background-image:-o-linear-gradient(rgba(0,0,0,.075) 0,rgba(0,0,0,.125) 100%);background-image:linear-gradient(rgba(0,0,0,.075) 0,rgba(0,0,0,.125) 100%);border:none;box-shadow:0 0 0 1px #1f1f1f inset;border-radius:2px;-moz-border-radius:2px}#controlKit .panel .button,#controlKit .panel .select,#controlKit .panel .select-active,#controlKit .picker .button{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;cursor:pointer;width:100%;height:26px;margin:0;background-image:-o-linear-gradient(#404040 0,#3b3b3b 100%);background-image:linear-gradient(#404040 0,#3b3b3b 100%);border:none;outline:0;border-radius:2px;box-shadow:0 0 0 1px #1f1f1f inset,-1px 2px 0 0 #4a4a4a inset;font-family:Arial,sans-serif;color:#fff}#controlKit .panel textarea{padding:5px 8px 2px;overflow:hidden;resize:none;vertical-align:top;white-space:nowrap}#controlKit .panel .textarea-wrap{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;width:100%;padding:0;float:left;height:100%;overflow:hidden;border:none;border-radius:2px;-moz-border-radius:2px;background-color:#222729;box-shadow:0 0 1px 2px rgba(0,0,0,.0125) inset,0 0 1px 1px #111314 inset;background-image:-o-linear-gradient(rgba(0,0,0,.075) 0,rgba(0,0,0,.125) 100%);background-image:linear-gradient(rgba(0,0,0,.075) 0,rgba(0,0,0,.125) 100%)}#controlKit .panel .textarea-wrap textarea{border:none;border-radius:2px;-moz-border-radius:2px;box-shadow:none;background:0 0}#controlKit .panel .textarea-wrap .scrollBar{border:1px solid #101213;border-bottom-right-radius:2px;border-top-right-radius:2px;border-left:none;box-shadow:0 0 1px 2px rgba(0,0,0,.0125) inset,0 0 1px 1px #111314 inset}#controlKit .panel canvas{cursor:pointer;vertical-align:bottom;border:none;box-shadow:0 0 0 1px #1f1f1f inset;border-radius:2px;-moz-border-radius:2px}#controlKit .panel .canvas-wrap,#controlKit .panel .svg-wrap{margin:6px 0 0;position:relative;width:70%;float:right;-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border:none;border-radius:2px;-moz-border-radius:2px;background:#1e2224;background-image:-o-linear-gradient(transparent 0,rgba(0,0,0,.05) 100%);background-image:linear-gradient(transparent 0,rgba(0,0,0,.05) 100%)}#controlKit .panel .canvas-wrap svg,#controlKit .panel .svg-wrap svg{position:absolute;left:0;top:0;cursor:pointer;vertical-align:bottom;border:none;box-shadow:0 0 0 1px #1f1f1f inset;border-radius:2px;-moz-border-radius:2px}#controlKit .panel .button,#controlKit .picker .button{font-size:10px;font-weight:700;text-shadow:0 1px #000;text-transform:uppercase}#controlKit .panel .button:hover,#controlKit .picker .button:hover{background-image:-o-linear-gradient(#454545 0,#3b3b3b 100%);background-image:linear-gradient(#454545 0,#3b3b3b 100%)}#controlKit .panel .button:active,#controlKit .picker .button:active{background-image:-o-linear-gradient(#404040 0,#3b3b3b 100%);background-image:linear-gradient(#404040 0,#3b3b3b 100%)}#controlKit .panel .color-with-preset-wrap,#controlKit .panel .input-with-preset-wrap{width:100%;float:left}#controlKit .panel .color-with-preset-wrap .color,#controlKit .panel .input-with-preset-wrap input[type=text]{padding-right:25px;border-top-right-radius:2px;border-bottom-right-radius:2px;float:left}#controlKit .panel .button-preset,#controlKit .panel .button-preset-active{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;position:absolute;right:0;width:20px;height:25px;margin:0;cursor:pointer;float:right;border:none;border-top-right-radius:2px;border-bottom-right-radius:2px;box-shadow:0 0 0 1px #1f1f1f inset,-1px 2px 0 0 #4a4a4a inset;outline:0}#controlKit .panel .button-preset-active,#controlKit .panel .button-preset:hover{background:url(data:image/png;base64,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) 50% 50% no-repeat,linear-gradient(#454545 0,#3b3b3b 100%)}#controlKit .panel .button-preset{background:url(data:image/png;base64,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) 50% 50% no-repeat,linear-gradient(#404040 0,#3b3b3b 100%)}#controlKit .panel input[type=checkbox]{margin:6px 0 0}#controlKit .panel .select,#controlKit .panel .select-active{padding-left:10px;padding-right:20px;font-size:11px;text-align:left;text-shadow:1px 1px #000;cursor:pointer;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}#controlKit .panel .select{background:url(data:image/png;base64,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) 100% 50% no-repeat,linear-gradient(#404040 0,#3b3b3b 100%)}#controlKit .panel .select-active,#controlKit .panel .select:hover{background:url(data:image/png;base64,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) 100% 50% no-repeat,linear-gradient(#454545 0,#3b3b3b 100%)}#controlKit .panel .slider-handle,#controlKit .panel .slider-slot,#controlKit .panel .slider-wrap,#controlKit .panel .wrap-slider{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box}#controlKit .panel .wrap-slider{width:70%;padding:6px 0 0;float:right;height:100%}#controlKit .panel .wrap-slider input[type=text]{width:25%;text-align:center;padding:0;float:right}#controlKit .panel .slider-wrap{float:left;cursor:ew-resize;width:70%}#controlKit .panel .slider-slot{width:100%;height:25px;padding:3px;background-color:#1e2224;border:none;box-shadow:0 0 0 1px #1f1f1f inset;border-radius:2px;-moz-border-radius:2px}#controlKit .panel .slider-handle{position:relative;width:100%;height:100%;background:#b32435;background-image:-o-linear-gradient(transparent 0,rgba(0,0,0,.1) 100%);background-image:linear-gradient(transparent 0,rgba(0,0,0,.1) 100%);box-shadow:0 1px 0 0 #0f0f0f}#controlKit .panel .color{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;-webkit-touch-callout:none;-webkit-user-select:none;-khtml-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;cursor:pointer;width:100%;height:25px;padding:0;border:none;background:#fff;box-shadow:0 0 0 1px #111314 inset;text-align:center;line-height:25px;border-radius:2px;-moz-border-radius:2px}#controlKit .panel .graph-slider-x-wrap,#controlKit .panel .graph-slider-y-wrap{position:absolute;-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box}#controlKit .panel .graph-slider-x-wrap{bottom:0;left:0;width:100%;padding:6px 20px 6px 6px}#controlKit .panel .graph-slider-y-wrap{top:0;right:0;height:100%;padding:6px 6px 20px}#controlKit .panel .graph-slider-x,#controlKit .panel .graph-slider-y{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border-radius:2px;-moz-border-radius:2px;background:rgba(24,27,29,.5);border:1px solid #181b1d}#controlKit .panel .graph-slider-x{height:8px}#controlKit .panel .graph-slider-y{width:8px;height:100%}#controlKit .panel .graph-slider-x-handle,#controlKit .panel .graph-slider-y-handle{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;cursor:pointer;border:1px solid #181b1d;background:#303639}#controlKit .panel .graph-slider-x-handle{width:20px;height:100%;border-top:none;border-bottom:none}#controlKit .panel .graph-slider-y-handle{width:100%;height:20px;border-left:none;border-right:none}#controlKit .sub-group .wrap .wrap .wrap{width:25%!important;padding:0!important;float:left!important}#controlKit .sub-group .wrap .wrap .wrap .label{width:100%!important;padding:8px 0 0!important;color:#878787!important;text-align:center!important;text-transform:uppercase!important;font-weight:700!important;text-shadow:1px 1px #1a1a1a!important}#controlKit .sub-group .wrap .wrap .wrap input[type=text]{padding:0;text-align:center}#controlKit .options{pointer-events:auto;-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border:1px solid #1f1f1f;border-radius:2px;-moz-border-radius:2px;position:absolute;z-index:2147483638;left:0;top:0;width:auto;height:auto;box-shadow:0 1px 0 0 #4a4a4a inset;background-color:#454545;font-family:Arial,sans-serif;font-size:11px;color:#fff;text-shadow:1px 1px #000;overflow:hidden}#controlKit .options ul{width:100%;list-style:none;margin:0;padding:0}#controlKit .options ul li{margin:0;width:100%;height:25px;line-height:25px;padding:0 20px 0 10px;overflow:hidden;white-space:normal;text-overflow:ellipsis;cursor:pointer}#controlKit .options ul li:hover{background-color:#1f2325}#controlKit .options ul .li-selected{background-color:#292d30}#controlKit .options .color{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box}#controlKit .options .color .li-selected,#controlKit .options .color li{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;padding:0;height:25px;line-height:25px;text-align:center}#controlKit .options .color .li-selected:hover,#controlKit .options .color li:hover{background:0 0;font-weight:700}#controlKit .options .color .li-selected{font-weight:700}#controlKit .panel .label,#controlKit .picker .label{width:100%;float:left;font-size:11px;font-weight:700;text-shadow:0 1px #000;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;cursor:default}#controlKit .panel .head,#controlKit .panel .panel-head-inactive,#controlKit .picker .head{height:30px;padding:0 10px;background:#1a1a1a;overflow:hidden}#controlKit .panel .head .wrap,#controlKit .panel .panel-head-inactive .wrap,#controlKit .picker .head .wrap{width:auto;height:auto;margin:0;padding:0;position:relative;overflow:hidden}#controlKit .panel .head .label,#controlKit .picker .head .label{cursor:pointer;line-height:30px;color:#65696b}#controlKit .panel .group-list .group .head{height:38px;padding:0 10px;border-top:1px solid #4f4f4f;border-bottom:1px solid #262626;background-image:-o-linear-gradient(#454545 0,#3b3b3b 100%);background-image:linear-gradient(#454545 0,#3b3b3b 100%);cursor:pointer}#controlKit .panel .group-list .group .head .label{font-size:12px;line-height:38px;color:#fff}#controlKit .panel .group-list .group .head:hover{border-top:1px solid #525252;background-image:-o-linear-gradient(#454545 0,#404040 100%);background-image:linear-gradient(#454545 0,#404040 100%)}#controlKit .panel .group-list .group li{height:35px;padding:0 10px}#controlKit .panel .group-list .group .sub-group-list .sub-group:last-of-type{border-bottom:none}#controlKit .panel .group-list .group .sub-group-list .sub-group{padding:0;height:auto;border-bottom:1px solid #242424}#controlKit .panel .group-list .group .sub-group-list .sub-group ul{overflow:hidden}#controlKit .panel .group-list .group .sub-group-list .sub-group ul li{background:#2e2e2e;border-bottom:1px solid #222729}#controlKit .panel .group-list .group .sub-group-list .sub-group ul li:last-of-type{border-bottom:none}#controlKit .panel .group-list .group .sub-group-list .sub-group:first-child{margin-top:0}#controlKit .panel .group-list .group .sub-group-list .sub-group .head,#controlKit .panel .group-list .group .sub-group-list .sub-group .head-inactive{cursor:pointer}#controlKit .panel .group-list .group .sub-group-list .sub-group .head{height:27px;padding:0 10px;border-top:none;border-bottom:1px solid #242424;background-image:none;background-color:#272727}#controlKit .panel .group-list .group .sub-group-list .sub-group .head:hover{background-image:none;background-color:#272727}#controlKit .panel .group-list .group .sub-group-list .sub-group .head-inactive{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;height:27px;padding:0 10px;box-shadow:0 1px 0 0 #404040 inset;background-image:-o-linear-gradient(#3b3b3b 0,#383838 100%);background-image:linear-gradient(#3b3b3b 0,#383838 100%)}#controlKit .panel .group-list .group .sub-group-list .sub-group .head-inactive:hover{box-shadow:0 1px 0 0 #474747 inset;background-image:none;background-image:-o-linear-gradient(#404040 0,#3b3b3b 100%);background-image:linear-gradient(#404040 0,#3b3b3b 100%)}#controlKit .panel .group-list .group .sub-group-list .sub-group .head .label,#controlKit .panel .group-list .group .sub-group-list .sub-group .head-inactive .label{margin:0;padding:0;line-height:27px;color:#fff;font-weight:700;font-size:11px;text-shadow:1px 1px #000;text-transform:capitalize}#controlKit .panel .group-list .group .sub-group-list .sub-group .head .wrap .label,#controlKit .panel .group-list .group .sub-group-list .sub-group .head-inactive .wrap .label{width:100%;font-weight:700;color:#fff;padding:0}#controlKit .panel .group-list .group .sub-group-list .sub-group .wrap .label{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;height:100%;width:30%;padding:12px 5px 0 0;float:left;font-size:11px;font-weight:400;color:#aeb5b8;text-shadow:1px 1px #000}#controlKit .panel .group-list .group .sub-group-list .sub-group .wrap .wrap{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;width:70%;padding:5px 0 0;float:right;height:100%}#controlKit .panel .group-list .group:last-child .scroll-buffer:nth-of-type(3),#controlKit .panel .group-list .group:last-child .sub-group-list{border-bottom:none}#controlKit .panel .scroll-wrap{position:relative;overflow:hidden}#controlKit .panel .scroll-buffer{width:100%;height:8px;border-top:1px solid #3b4447;border-bottom:1px solid #1e2224}#controlKit .panel .scrollBar{-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box;width:15px;height:100%;float:right;top:0;padding:0;margin:0;position:relative;background:#212628;background-image:linear-gradient(to right,#242424 0,#2e2e2e 100%)}#controlKit .panel .scrollBar .track{padding:0 3px 0 2px}#controlKit .panel .scrollBar .track .thumb{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;width:11px;position:absolute;cursor:pointer;background-color:#343434;border:1px solid #1b1f21;border-radius:10px;-moz-border-radius:10px;box-shadow:inset 0 1px 0 0 #434b50}#controlKit .panel .menu,#controlKit .panel .menu-active,#controlKit .picker .menu{float:right;padding:5px 0 0}#controlKit .panel .menu input[type=button],#controlKit .panel .menu-active input[type=button],#controlKit .picker .menu input[type=button]{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;cursor:pointer;height:20px;border:none;vertical-align:top;border-radius:2px;-moz-border-radius:2px;font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:#aaa;text-shadow:0 -1px #000;text-transform:uppercase;box-shadow:0 0 0 1px #131313 inset,-1px 2px 0 0 #212527 inset}#controlKit .panel .menu .button-menu-close,#controlKit .panel .menu .button-menu-hide,#controlKit .panel .menu .button-menu-show,#controlKit .panel .menu-active .button-menu-close,#controlKit .panel .menu-active .button-menu-hide,#controlKit .panel .menu-active .button-menu-show,#controlKit .picker .menu .button-menu-close,#controlKit .picker .menu .button-menu-hide,#controlKit .picker .menu .button-menu-show{width:20px;margin-left:4px}#controlKit .panel .menu .button-menu-hide,#controlKit .panel .menu-active .button-menu-hide,#controlKit .picker .menu .button-menu-hide{background:url(data:image/png;base64,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) 50% 50% no-repeat,#1a1d1f}#controlKit .panel .menu .button-menu-hide:hover,#controlKit .panel .menu-active .button-menu-hide:hover,#controlKit .picker .menu .button-menu-hide:hover{background:url(data:image/png;base64,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) 50% 50% no-repeat,#000;box-shadow:#fff 0,#000 100%}#controlKit .panel .menu .button-menu-show,#controlKit .panel .menu-active .button-menu-show,#controlKit .picker .menu .button-menu-show{background:url(data:image/png;base64,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) 50% 50% no-repeat,#1a1d1f}#controlKit .panel .menu .button-menu-show:hover,#controlKit .panel .menu-active .button-menu-show:hover,#controlKit .picker .menu .button-menu-show:hover{background:url(data:image/png;base64,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) 50% 50% no-repeat,#000;box-shadow:#fff 0,#000 100%}#controlKit .panel .menu .button-menu-close,#controlKit .panel .menu-active .button-menu-close,#controlKit .picker .menu .button-menu-close{background:url(data:image/png;base64,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) 50% 50% no-repeat,#1a1d1f}#controlKit .panel .menu .button-menu-close:hover,#controlKit .panel .menu-active .button-menu-close:hover,#controlKit .picker .menu .button-menu-close:hover{background:url(data:image/png;base64,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) 50% 50% no-repeat,#000;box-shadow:#fff 0,#000 100%}#controlKit .panel .menu .button-menu-undo,#controlKit .panel .menu-active .button-menu-undo{background:url(data:image/png;base64,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) 20% 50% no-repeat,#1a1d1f;padding:0 6px 1px 0;width:38px;vertical-align:top;text-align:end}#controlKit .panel .menu .button-menu-undo:hover,#controlKit .panel .menu-active .button-menu-undo:hover{background:url(data:image/png;base64,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) 20% 50% no-repeat,#000;box-shadow:#fff 0,#000 100%}#controlKit .panel .menu .button-menu-load,#controlKit .panel .menu-active .button-menu-load{margin-right:2px}#controlKit .panel .menu .button-menu-load,#controlKit .panel .menu .button-menu-save,#controlKit .panel .menu-active .button-menu-load,#controlKit .panel .menu-active .button-menu-save{background:#1a1d1f;font-size:9px!important}#controlKit .panel .menu .button-menu-load:hover,#controlKit .panel .menu .button-menu-save:hover,#controlKit .panel .menu-active .button-menu-load:hover,#controlKit .panel .menu-active .button-menu-save:hover{background:#000}#controlKit .panel .menu .wrap{display:none}#controlKit .panel .menu-active{width:100%;float:left}#controlKit .panel .menu-active .wrap{display:inline}#controlKit .panel .menu-active .button-menu-close,#controlKit .panel .menu-active .button-menu-hide,#controlKit .panel .menu-active .button-menu-show{float:right}#controlKit .panel .arrow-s-max{background:url(data:image/png;base64,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) center no-repeat}#controlKit .panel .arrow-s-min{background:url(data:image/png;base64,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) center no-repeat}#controlKit .panel .arrow-s-max,#controlKit .panel .arrow-s-min{width:100%;height:20px}#controlKit .panel .arrow-b-max{background:url(data:image/png;base64,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) center no-repeat}#controlKit .panel .arrow-b-min{background:url(data:image/png;base64,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) center no-repeat}#controlKit .panel .arrow-b-sub-max{background:url(data:image/png;base64,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) center no-repeat}#controlKit .panel .arrow-b-sub-min{background:url(data:image/png;base64,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) center no-repeat}#controlKit .panel .arrow-b-max,#controlKit .panel .arrow-b-min,#controlKit .panel .arrow-b-sub-max,#controlKit .panel .arrow-b-sub-min{width:10px;height:100%;float:right}#controlKit .picker{pointer-events:auto;-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border-radius:3px;-moz-border-radius:3px;background-color:#3b3b3b;font-family:Arial,sans-serif;font-size:11px;color:#fff;text-shadow:1px 1px #000;overflow:hidden;position:absolute;z-index:2147483631;width:360px;-webkit-touch-callout:none;-webkit-user-select:none;-khtml-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;box-shadow:0 2px 2px rgba(0,0,0,.25)}#controlKit .picker canvas{vertical-align:bottom;cursor:pointer}#controlKit .picker .wrap{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;padding:10px;float:left}#controlKit .picker .field-wrap{padding:3px}#controlKit .picker .slider-wrap{padding:3px 13px 3px 3px}#controlKit .picker .field-wrap,#controlKit .picker .input-wrap,#controlKit .picker .slider-wrap{height:auto;overflow:hidden;float:left}#controlKit .picker .input-wrap{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border:1px solid #242424;border-radius:2px;-moz-border-radius:2px;width:140px;float:right;padding:5px 10px 1px 0}#controlKit .picker .input-field{width:50%;float:right;margin-bottom:4px}#controlKit .picker .input-field .label{padding:8px 0 0;color:#878787;text-align:center;text-transform:uppercase;font-weight:700;text-shadow:1px 1px #1a1a1a;width:40%}#controlKit .picker .input-field .wrap{padding:0;width:60%;height:auto;float:right}#controlKit .picker .controls-wrap{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;width:100%;height:auto;float:right;padding:9px 0 0}#controlKit .picker .controls-wrap input[type=button]{float:right;width:65px;margin:0 0 0 10px}#controlKit .picker .color-contrast{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;border:none;box-shadow:0 0 0 1px #1f1f1f inset;border-radius:2px;-moz-border-radius:2px;height:25px;padding:3px;width:80%;margin-bottom:4px;float:right}#controlKit .picker .color-contrast div{width:50%;height:100%;float:left}#controlKit .picker input[type=text]{padding:0;text-align:center;width:60%;float:right}#controlKit .picker .wrap .input-wrap:nth-of-type(3){border-bottom-left-radius:0;border-bottom-right-radius:0}#controlKit .picker .wrap .input-wrap:nth-of-type(4){border-top:none;border-top-left-radius:0;border-top-right-radius:0}#controlKit .picker .wrap .input-wrap:nth-of-type(4) .input-field{width:100%}#controlKit .picker .wrap .input-wrap:nth-of-type(4) .input-field .label{width:20%}#controlKit .picker .wrap .input-wrap:nth-of-type(4) input[type=text]{width:80%}#controlKit .picker .field-wrap,#controlKit .picker .slider-wrap{background:#1e2224;border:none;box-shadow:0 0 0 1px #1f1f1f inset;border-radius:2px;-moz-border-radius:2px;position:relative;margin-right:5px}#controlKit .picker .field-wrap .indicator,#controlKit .picker .slider-wrap .indicator{position:absolute;border:2px solid #fff;box-shadow:0 1px black,0 1px #000 inset;cursor:pointer}#controlKit .picker .field-wrap .indicator{width:8px;height:8px;left:50%;top:50%;border-radius:50%;-moz-border-radius:50%}#controlKit .picker .slider-wrap .indicator{width:14px;height:3px;border-radius:8px;-moz-border-radius:8px;left:1px;top:1px}#controlKit .picker .slider-wrap .indicator:after{content:'';width:0;height:0;border-top:4.5px solid transparent;border-bottom:4.5px solid transparent;border-right:4px solid #fff;float:right;position:absolute;top:-2px;left:19px}#controlKit .picker .slider-wrap .indicator:before{content:'';width:0;height:0;border-top:4.5px solid transparent;border-bottom:4.5px solid transparent;border-right:4px solid #000;float:right;position:absolute;top:-3px;left:19px}" }; module.exports = Style;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYXV0b21hdC9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2luZGV4LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9Db250cm9sS2l0LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvQnV0dG9uLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvQnV0dG9uUHJlc2V0LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvQ2FudmFzLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvQ2hlY2tib3guanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9Db2xvci5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L0Z1bmN0aW9uUGxvdFR5cGUuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9GdW5jdGlvblBsb3R0ZXIuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9GdW5jdGlvblBsb3R0ZXJGdW5jdGlvbkFyZ3NFcnJvci5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L0Z1bmN0aW9uUGxvdHRlck9iamVjdEVycm9yLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvTWV0cmljLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvTnVtYmVySW5wdXQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9OdW1iZXJJbnB1dF9JbnRlcm5hbC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L051bWJlck91dHB1dC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L09wdGlvbnMuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9PdXRwdXQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9QYWQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9QaWNrZXIuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9QbG90dGVyLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvUmFuZ2UuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9TVkcuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9TVkdDb21wb25lbnQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9TZWxlY3QuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9TbGlkZXIuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9TbGlkZXJfSW50ZXJuYWwuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9TdHJpbmdJbnB1dC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L1N0cmluZ091dHB1dC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L1ZhbHVlUGxvdHRlci5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9Db21wb25lbnQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvQ29tcG9uZW50RXZlbnQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvQ29tcG9uZW50T2JqZWN0RXJyb3IuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvSGlzdG9yeS5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9IaXN0b3J5RXZlbnQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvT2JqZWN0Q29tcG9uZW50LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL09iamVjdENvbXBvbmVudE5vdGlmaWVyLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL09wdGlvbkV2ZW50LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL1N0YXRlLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL2NvbG9yL0NvbG9yRm9ybWF0RXJyb3IuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvY29sb3IvQ29sb3JNb2RlLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL2NvbG9yL0NvbG9yVXRpbC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9kb2N1bWVudC9DU1MuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9kb2N1bWVudC9Nb3VzZS5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9kb2N1bWVudC9Ob2RlLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL2RvY3VtZW50L05vZGVFdmVudC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9kb2N1bWVudC9TdHlsZS5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9ldmVudC9FdmVudC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9ldmVudC9FdmVudERpc3BhdGNoZXIuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvbGF5b3V0L0xheW91dE1vZGUuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvbGF5b3V0L1Njcm9sbEJhci5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvZ3JvdXAvQWJzdHJhY3RHcm91cC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvZ3JvdXAvR3JvdXAuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2dyb3VwL0dyb3VwRXZlbnQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2dyb3VwL01lbnVFdmVudC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvZ3JvdXAvUGFuZWwuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2dyb3VwL1BhbmVsRXZlbnQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2dyb3VwL1N1Ykdyb3VwLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9qQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaHpCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIENvbnRyb2xLaXQgICAgICAgID0gcmVxdWlyZSgnLi9saWIvQ29udHJvbEtpdCcpO1xuXHRDb250cm9sS2l0LkNhbnZhcyA9IHJlcXVpcmUoJy4vbGliL2NvbXBvbmVudC9DYW52YXMnKTtcblx0Q29udHJvbEtpdC5TVkcgICAgPSByZXF1aXJlKCcuL2xpYi9jb21wb25lbnQvU1ZHJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29udHJvbEtpdDsiLCJ2YXIgTm9kZSAgICA9IHJlcXVpcmUoJy4vY29yZS9kb2N1bWVudC9Ob2RlJyksXG4gICAgUGFuZWwgICA9IHJlcXVpcmUoJy4vZ3JvdXAvUGFuZWwnKSxcbiAgICBPcHRpb25zID0gcmVxdWlyZSgnLi9jb21wb25lbnQvT3B0aW9ucycpLFxuICAgIFBpY2tlciAgPSByZXF1aXJlKCcuL2NvbXBvbmVudC9QaWNrZXInKTtcblxudmFyIENTUyA9IHJlcXVpcmUoJy4vY29yZS9kb2N1bWVudC9DU1MnKTtcblxudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4vY29yZS9ldmVudC9FdmVudERpc3BhdGNoZXInKSxcbiAgICBFdmVudF8gICAgICAgICAgPSByZXF1aXJlKCcuL2NvcmUvZXZlbnQvRXZlbnQnKSxcbiAgICBEb2N1bWVudEV2ZW50ICAgPSByZXF1aXJlKCcuL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxuICAgIE5vZGVFdmVudCAgICAgICA9IHJlcXVpcmUoJy4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKSxcbiAgICBDb21wb25lbnRFdmVudCAgPSByZXF1aXJlKCcuL2NvcmUvQ29tcG9uZW50RXZlbnQnKSxcbiAgICBIaXN0b3J5RXZlbnQgICAgPSByZXF1aXJlKCcuL2NvcmUvSGlzdG9yeUV2ZW50JyksXG4gICAgTWVudUV2ZW50ICAgICAgID0gcmVxdWlyZSgnLi9ncm91cC9NZW51RXZlbnQnKTtcblxudmFyIEhpc3RvcnkgPSByZXF1aXJlKCcuL2NvcmUvSGlzdG9yeScpLFxuICAgIFN0YXRlICAgPSByZXF1aXJlKCcuL2NvcmUvU3RhdGUnKTtcblxudmFyIE1vdXNlICAgPSByZXF1aXJlKCcuL2NvcmUvZG9jdW1lbnQvTW91c2UnKTtcblxudmFyIFZhbHVlUGxvdHRlciA9IHJlcXVpcmUoJy4vY29tcG9uZW50L1ZhbHVlUGxvdHRlcicpO1xudmFyIFN0cmluZ091dHB1dCA9IHJlcXVpcmUoJy4vY29tcG9uZW50L1N0cmluZ091dHB1dCcpLFxuICAgIE51bWJlck91dHB1dCA9IHJlcXVpcmUoJy4vY29tcG9uZW50L051bWJlck91dHB1dCcpO1xuXG52YXIgREVGQVVMVF9ISVNUT1JZID0gZmFsc2UsXG4gICAgREVGQVVMVF9PUEFDSVRZID0gMS4wLFxuICAgIERFRkFVTFRfUEFORUxTX0NMT1NBQkxFID0gZmFsc2UsXG4gICAgREVGQVVMVF9FTkFCTEUgPSB0cnVlLFxuICAgIERFRkFVTFRfTE9BRF9BTkRfU0FWRSA9IGZhbHNlO1xuXG52YXIgREVGQVVMVF9UUklHR0VSX1NIT1JUQ1VUX0NIQVIgPSAnaCc7XG5cbnZhciBpbml0aWF0ZWQgPSBmYWxzZTtcblxuLyoqXG4gKiBJbml0aWFsaXplcyBDb250cm9sS2l0LlxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIENvbnRyb2xLaXQgb3B0aW9uc1xuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLm9wYWNpdHk9MS4wXSAtIE92ZXJhbGwgb3BhY2l0eVxuICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5lbmFibGU9dHJ1ZV0gLSBJbml0aWFsIENvbnRyb2xLaXQgc3RhdGUsIGVuYWJsZWQgLyBkaXNhYmxlZFxuICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy51c2VFeHRlcm5hbFN0eWxlPWZhbHNlXSAtIElmIHRydWUsIGFuIGV4dGVybmFsIHN0eWxlIGlzIHVzZWQgaW5zdGVhZCBvZiB0aGUgYnVpbGQtaW4gb25lXG4gKiBAcGFyYW0ge1N0cmluZ30gW29wdGlvbnMuc3R5bGVTdHJpbmddIC0gSWYgdHJ1ZSwgYW4gZXh0ZXJuYWwgc3R5bGUgaXMgdXNlZCBpbnN0ZWFkIG9mIHRoZSBidWlsZC1pbiBvbmVcbiAqIEBwYXJhbSB7Qm9vbGVhbn1bb3B0aW9ucy5oaXN0b3J5PWZhbHNlXSAtIChFeHBlcmltZW50YWwpIEVuYWJsZXMgYSB2YWx1ZSBoaXN0b3J5IGZvciBhbGwgY29tcG9uZW50c1xuICovXG5mdW5jdGlvbiBDb250cm9sS2l0KG9wdGlvbnMpIHtcbiAgICBpZihpbml0aWF0ZWQpe1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbnRyb2xLaXQgaXMgYWxyZWFkeSBpbml0aWFsaXplZC4nKTtcbiAgICB9XG4gICAgb3B0aW9ucyAgICAgICAgICAgICAgICAgID0gb3B0aW9ucyB8fCB7fTtcbiAgICBvcHRpb25zLmhpc3RvcnkgICAgICAgICAgPSBvcHRpb25zLmhpc3RvcnkgPT09IHVuZGVmaW5lZCA/IERFRkFVTFRfSElTVE9SWSA6IG9wdGlvbnMuaGlzdG9yeTtcbiAgICBvcHRpb25zLmxvYWRBbmRTYXZlICAgICAgPSBvcHRpb25zLmxvYWRBbmRTYXZlID09PSB1bmRlZmluZWQgPyBERUZBVUxUX0xPQURfQU5EX1NBVkUgOiBvcHRpb25zLmxvYWRBbmRTYXZlO1xuICAgIG9wdGlvbnMub3BhY2l0eSAgICAgICAgICA9IG9wdGlvbnMub3BhY2l0eSA9PT0gdW5kZWZpbmVkID8gREVGQVVMVF9PUEFDSVRZIDogb3B0aW9ucy5vcGFjaXR5O1xuICAgIG9wdGlvbnMucGFuZWxzQ2xvc2FibGUgICA9IG9wdGlvbnMucGFuZWxzQ2xvc2FibGUgPT09IHVuZGVmaW5lZCA/IERFRkFVTFRfUEFORUxTX0NMT1NBQkxFIDogb3B0aW9ucy5wYW5lbHNDbG9zYWJsZTtcbiAgICBvcHRpb25zLnVzZUV4dGVybmFsU3R5bGUgPSBvcHRpb25zLnVzZUV4dGVybmFsU3R5bGUgPT09IHVuZGVmaW5lZCA/IGZhbHNlIDogb3B0aW9ucy51c2VFeHRlcm5hbFN0eWxlO1xuICAgIG9wdGlvbnMuZW5hYmxlICAgICAgICAgICA9IG9wdGlvbnMuZW5hYmxlID09PSB1bmRlZmluZWQgPyBERUZBVUxUX0VOQUJMRSA6IG9wdGlvbnMuZW5hYmxlO1xuXG4gICAgRXZlbnREaXNwYXRjaGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICB2YXIgbm9kZSA9IG51bGw7XG4gICAgaWYgKCFvcHRpb25zLnBhcmVudERvbUVsZW1lbnRJZCkge1xuICAgICAgICBub2RlID0gbmV3IE5vZGUoKTtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChub2RlLmdldEVsZW1lbnQoKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbm9kZSA9IE5vZGUuZ2V0Tm9kZUJ5SWQob3B0aW9ucy5wYXJlbnREb21FbGVtZW50SWQpO1xuICAgIH1cblxuICAgIGlmKCFvcHRpb25zLnVzZUV4dGVybmFsU3R5bGUpe1xuICAgICAgICB2YXIgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuICAgICAgICAgICAgc3R5bGUudHlwZSA9ICd0ZXh0L2Nzcyc7XG4gICAgICAgIHZhciBjc3MgPSAhb3B0aW9ucy5zdHlsZSA/IHJlcXVpcmUoJy4vY29yZS9kb2N1bWVudC9TdHlsZScpLnN0cmluZyA6IG9wdGlvbnMuc3R5bGVTdHJpbmc7XG4gICAgICAgIGlmKHN0eWxlLnN0eWxlc2hlZXQpe1xuICAgICAgICAgICAgc3R5bGUuc3R5bGVzaGVldC5jc3NUZXh0ID0gY3NzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3R5bGUuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY3NzKSk7XG4gICAgICAgIH1cbiAgICAgICAgKGRvY3VtZW50LmhlYWQgfHwgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXSkuYXBwZW5kQ2hpbGQoc3R5bGUpO1xuICAgIH1cblxuICAgIG5vZGUuc2V0UHJvcGVydHkoJ2lkJywgQ1NTLkNvbnRyb2xLaXQpO1xuXG4gICAgdGhpcy5fbm9kZSA9IG5vZGU7XG4gICAgdGhpcy5fcGFuZWxzID0gW107XG4gICAgdGhpcy5fZW5hYmxlZCA9IG9wdGlvbnMuZW5hYmxlO1xuICAgIHRoaXMuX2hpc3RvcnlFbmFibGVkID0gb3B0aW9ucy5oaXN0b3J5O1xuICAgIHRoaXMuX3N0YXRlc0VuYWJsZWQgPSBvcHRpb25zLmxvYWRBbmRTYXZlO1xuICAgIHRoaXMuX3BhbmVsc0Nsb3NhYmxlID0gb3B0aW9ucy5wYW5lbHNDbG9zYWJsZTtcblxuICAgIHZhciBoaXN0b3J5ID0gSGlzdG9yeS5zZXR1cCgpO1xuXG4gICAgaWYgKCF0aGlzLl9oaXN0b3J5RW5hYmxlZCl7XG4gICAgICAgIGhpc3RvcnkuZGlzYWJsZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGhpc3RvcnkuYWRkRXZlbnRMaXN0ZW5lcihIaXN0b3J5RXZlbnQuU1RBVEVfUFVTSCwgdGhpcywgJ29uSGlzdG9yeVN0YXRlUHVzaCcpO1xuICAgICAgICBoaXN0b3J5LmFkZEV2ZW50TGlzdGVuZXIoSGlzdG9yeUV2ZW50LlNUQVRFX1BPUCwgdGhpcywgJ29uSGlzdG9yeVN0YXRlUG9wJyk7XG4gICAgfVxuXG4gICAgTW91c2Uuc2V0dXAoKTtcbiAgICBQaWNrZXIuc2V0dXAobm9kZSk7XG4gICAgT3B0aW9ucy5zZXR1cChub2RlKTtcblxuICAgIHZhciBvcGFjaXR5ID0gb3B0aW9ucy5vcGFjaXR5O1xuICAgIGlmIChvcGFjaXR5ICE9IDEuMCAmJiBvcGFjaXR5ICE9IDAuMCkge1xuICAgICAgICBub2RlLnNldFN0eWxlUHJvcGVydHkoJ29wYWNpdHknLCBvcGFjaXR5KTtcbiAgICB9XG5cbiAgICB0aGlzLl9jYW5VcGRhdGUgPSB0cnVlO1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIGludGVydmFsLFxuICAgICAgICBjb3VudCA9IDAsXG4gICAgICAgIGNvdW50TWF4ID0gMTA7XG5cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50LldJTkRPV19SRVNJWkUsZnVuY3Rpb24oKXtcbiAgICAgICAgc2VsZi5fY2FuVXBkYXRlID0gZmFsc2U7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgICAgICBpbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBpZihjb3VudCA+PSBjb3VudE1heCl7XG4gICAgICAgICAgICAgICAgY291bnQgPSAwO1xuICAgICAgICAgICAgICAgIHNlbGYuX2NhblVwZGF0ZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICB9LDI1KVxuICAgIH0pO1xuXG4gICAgdGhpcy5fc2hvcnRjdXRFbmFibGUgPSBERUZBVUxUX1RSSUdHRVJfU0hPUlRDVVRfQ0hBUjtcblxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLGZ1bmN0aW9uKGUpe1xuICAgICAgICBpZighKGUuY3RybEtleSAmJiBTdHJpbmcuZnJvbUNoYXJDb2RlKGUud2hpY2ggfHwgZS5rZXlDb2RlKS50b0xvd2VyQ2FzZSgpID09IHNlbGYuX3Nob3J0Y3V0RW5hYmxlKSl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgc2VsZi5fZW5hYmxlZCA9ICFzZWxmLl9lbmFibGVkO1xuICAgICAgICBpZihzZWxmLl9lbmFibGVkKXtcbiAgICAgICAgICAgIHNlbGYuX2VuYWJsZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2VsZi5fZGlzYWJsZSgpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBpZighdGhpcy5fZW5hYmxlZCl7XG4gICAgICAgIHRoaXMuX2Rpc2FibGUoKTtcbiAgICB9XG5cbiAgICBpbml0aWF0ZWQgPSB0cnVlO1xufVxuQ29udHJvbEtpdC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUpO1xuQ29udHJvbEtpdC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBDb250cm9sS2l0O1xuXG4vKipcbiAqIEFkZHMgYSBwYW5lbC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbcGFyYW1zXSAtIFBhbmVsIG9wdGlvbnNcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmxhYmVsPSdDb250cm9sIFBhbmVsJ10gLSBUaGUgcGFuZWwgbGFiZWxcbiAqIEBwYXJhbSB7TnVtYmVyfSBbcGFyYW1zLndpZHRoPTMwMF0gLSBUaGUgd2lkdGhcbiAqIEBwYXJhbSB7TnVtYmVyfSBbcGFyYW1zLmhlaWdodF0gLSBDb25zdHJhaW5lZCBwYW5lbCBoZWlnaHRcbiAqIEBwYXJhbSB7TnVtYmVyfSBbcGFyYW1zLnJhdGlvPTQwXSAtIFRoZSByYXRpbyBvZiBsYWJlbCAoZGVmYXVsdDo0MCUpIGFuZCBjb21wb25lbnQgKGRlZmF1bHQ6NjAlKSB3aWR0aFxuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMuYWxpZ249J3JpZ2h0J10gLSBGbG9hdCAnbGVmdCcgb3IgJ3JpZ2h0JywgbXVsdGlwbGUgcGFuZWxzIGdldCBhbGlnbmVkIG5leHQgdG8gZWFjaCBvdGhlclxuICogQHBhcmFtIHtCb29sZWFufSBbcGFyYW1zLmZpeGVkPXRydWVdIC0gSWYgZmFsc2UgdGhlIHBhbmVsIGNhbiBiZSBtb3ZlZFxuICogQHBhcmFtIHtBcnJheX0gW3BhcmFtcy5wb3NpdGlvbj1bMCwwXV0gLSBJZiB1bmZpeGVkLCB0aGUgcGFuZWwgcGFuZWwgcG9zaXRpb24gcmVsYXRpdmUgdG8gYWxpZ25tZW50IChlZy4gaWYgJ2xlZnQnIDAgKyBwb3NpdGlvblswXSBvciBpZiAncmlnaHQnIHdpbmRvdy5pbm5lckhlaWdodCAtIHBvc2l0aW9uWzBdIC0gcGFuZWxXaWR0aClcbiAqIEBwYXJhbSB7TnVtYmVyfSBbcGFyYW1zLm9wYWNpdHk9MS4wXSAtIFRoZSBwYW5lbMK0cyBvcGFjaXR5XG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy5kb2NrPWZhbHNlXSAtIChFeHBlcmltZW50YWwpIEluZGljYXRlcyB3aGV0aGVyIHRoZSBwYW5lbCBzaG91bGQgYmUgZG9ja2VkIHRvIGVpdGhlciB0aGUgbGVmdCBvciByaWdodCB3aW5kb3cgYm9yZGVyIChkZXBlbmRpbmcgb24gcGFyYW1zLmFsaWduKSwgZG9ja2VkIHBhbmVscyBoZWlnaHQgZXF1YWwgd2luZG93IGhlaWdodFxuICAqIEByZXR1cm5zIHtQYW5lbH1cbiAqL1xuQ29udHJvbEtpdC5wcm90b3R5cGUuYWRkUGFuZWwgPSBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgdmFyIHBhbmVsID0gbmV3IFBhbmVsKHRoaXMsIHBhcmFtcyk7XG4gICAgdGhpcy5fcGFuZWxzLnB1c2gocGFuZWwpO1xuICAgIHJldHVybiBwYW5lbDtcbn07XG5cbi8qKlxuICogVXBkYXRlcyBhbGwgQ29udHJvbEtpdCBjb21wb25lbnRzIGlmIHRoZSB3YXRcbiAqL1xuQ29udHJvbEtpdC5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5fZW5hYmxlZCB8fCAhdGhpcy5fY2FuVXBkYXRlKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgaSwgaiwgaztcbiAgICB2YXIgbCwgbSwgbjtcbiAgICB2YXIgcGFuZWxzID0gdGhpcy5fcGFuZWxzLFxuICAgICAgICBwYW5lbCxcbiAgICAgICAgZ3JvdXBzLFxuICAgICAgICBjb21wb25lbnRzLFxuICAgICAgICBjb21wb25lbnQ7XG5cbiAgICBpID0gLTE7IGwgPSBwYW5lbHMubGVuZ3RoO1xuICAgIHdoaWxlICgrK2kgPCBsKSB7XG4gICAgICAgIHBhbmVsID0gcGFuZWxzW2ldO1xuXG4gICAgICAgIGlmIChwYW5lbC5pc0Rpc2FibGVkKCkpe1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgZ3JvdXBzID0gcGFuZWwuZ2V0R3JvdXBzKCk7XG4gICAgICAgIGogPSAtMTsgbSA9IGdyb3Vwcy5sZW5ndGg7XG5cbiAgICAgICAgd2hpbGUgKCsraiA8IG0pIHtcbiAgICAgICAgICAgIGNvbXBvbmVudHMgPSBncm91cHNbal0uZ2V0Q29tcG9uZW50cygpO1xuICAgICAgICAgICAgayA9IC0xOyBuID0gY29tcG9uZW50cy5sZW5ndGg7XG5cbiAgICAgICAgICAgIHdoaWxlICgrK2sgPCBuKSB7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50ID0gY29tcG9uZW50c1trXTtcbiAgICAgICAgICAgICAgICBpZiAoY29tcG9uZW50LmlzRGlzYWJsZWQoKSl7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoY29tcG9uZW50IGluc3RhbmNlb2YgVmFsdWVQbG90dGVyIHx8XG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudCBpbnN0YW5jZW9mIFN0cmluZ091dHB1dCB8fFxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQgaW5zdGFuY2VvZiBOdW1iZXJPdXRwdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50LnVwZGF0ZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cbkNvbnRyb2xLaXQucHJvdG90eXBlLmhpc3RvcnlJc0VuYWJsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2hpc3RvcnlFbmFibGVkO1xufTtcblxuQ29udHJvbEtpdC5wcm90b3R5cGUuc3RhdGVzQXJlRW5hYmxlZCA9IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIHRoaXMuX3N0YXRlc0VuYWJsZWQ7XG59O1xuXG5Db250cm9sS2l0LnByb3RvdHlwZS5wYW5lbHNBcmVDbG9zYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fcGFuZWxzQ2xvc2FibGU7XG59O1xuXG5Db250cm9sS2l0LnByb3RvdHlwZS5fZW5hYmxlID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgaSA9IC0xLCBwID0gdGhpcy5fcGFuZWxzLCBsID0gcC5sZW5ndGg7XG4gICAgd2hpbGUgKCsraSA8IGwpe1xuICAgICAgICBwW2ldLmVuYWJsZSgpO1xuICAgIH1cbiAgICB0aGlzLl9ub2RlLnNldFN0eWxlUHJvcGVydHkoJ3Zpc2liaWxpdHknLCAnJyk7XG59O1xuXG5Db250cm9sS2l0LnByb3RvdHlwZS5fZGlzYWJsZSA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGkgPSAtMSwgcCA9IHRoaXMuX3BhbmVscywgbCA9IHAubGVuZ3RoO1xuICAgIHdoaWxlICgrK2kgPCBsKXtcbiAgICAgICAgcFtpXS5kaXNhYmxlKCk7XG4gICAgfVxuICAgIHRoaXMuX25vZGUuc2V0U3R5bGVQcm9wZXJ0eSgndmlzaWJpbGl0eScsICdoaWRkZW4nKTtcbn07XG5cbi8qKlxuICogRW5hYmxlcyBhbmQgc2hvd3MgY29udHJvbEtpdC5cbiAqL1xuXG5Db250cm9sS2l0LnByb3RvdHlwZS5lbmFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fZW5hYmxlKCk7XG4gICAgdGhpcy5fZW5hYmxlZCA9IHRydWU7XG59O1xuXG4vKipcbiAqIERpc2FibGUgYW5kIGhpZGVzIGNvbnRyb2xLaXQuXG4gKi9cblxuQ29udHJvbEtpdC5wcm90b3R5cGUuZGlzYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9kaXNhYmxlKCk7XG4gICAgdGhpcy5fZW5hYmxlZCA9IGZhbHNlO1xufTtcblxuXG4vKipcbiAqIFNwZWNpZmllcyB0aGUga2V5IHRvIGJlIHVzZWQgd2l0aCBjdHJsICYgY2hhciwgdG8gdHJpZ2dlciBDb250cm9sS2l0cyB2aXNpYmlsaXR5LlxuICogQHBhcmFtIGNoYXJcbiAqL1xuXG5Db250cm9sS2l0LnByb3RvdHlwZS5zZXRTaG9ydGN1dEVuYWJsZSA9IGZ1bmN0aW9uKGNoYXIpe1xuICAgIHRoaXMuX3Nob3J0Y3V0RW5hYmxlID0gY2hhcjtcbn07XG5cbkNvbnRyb2xLaXQucHJvdG90eXBlLm9uSGlzdG9yeVN0YXRlUHVzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBNZW51RXZlbnQuVVBEQVRFX01FTlUsIG51bGwpKTtcbn07XG5cbkNvbnRyb2xLaXQucHJvdG90eXBlLm9uSGlzdG9yeVN0YXRlUG9wID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlVQREFURV9WQUxVRSwge29yaWdpbjogbnVsbH0pKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBNZW51RXZlbnQuVVBEQVRFX01FTlUsIG51bGwpKTtcbn07XG5cbkNvbnRyb2xLaXQucHJvdG90eXBlLmxvYWRTZXR0aW5ncyA9IGZ1bmN0aW9uKGRhdGEpe1xuICAgIHZhciBpID0gLTEsIGwgPSBkYXRhLmxlbmd0aDtcbiAgICB2YXIgcGFuZWxzID0gdGhpcy5fcGFuZWxzO1xuICAgIHdoaWxlKCsraSA8IGwpe1xuICAgICAgICBwYW5lbHNbaV0uc2V0RGF0YShkYXRhW2ldKTtcbiAgICB9XG59O1xuXG5Db250cm9sS2l0LnByb3RvdHlwZS5fbG9hZFN0YXRlID0gZnVuY3Rpb24oKXtcbiAgICBTdGF0ZS5sb2FkKHRoaXMubG9hZFNldHRpbmdzLmJpbmQodGhpcykpO1xufTtcblxuQ29udHJvbEtpdC5wcm90b3R5cGUuX3NhdmVTdGF0ZSA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy51cGRhdGUoKTsgLy9mb3JjZSBzeW5jXG4gICAgdmFyIHAgPSB0aGlzLl9wYW5lbHMsIGkgPSAtMSwgbCA9IHAubGVuZ3RoO1xuICAgIHZhciBkYXRhID0gbmV3IEFycmF5KGwpO1xuICAgIHdoaWxlKCsraSA8IGwpe1xuICAgICAgICBkYXRhW2ldID0gcFtpXS5nZXREYXRhKCk7XG4gICAgfVxuICAgIFN0YXRlLnNhdmUoe2RhdGE6ZGF0YX0pO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSByb290IGVsZW1lbnQuXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuXG5Db250cm9sS2l0LnByb3RvdHlwZS5nZXROb2RlID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9ub2RlO1xufTtcblxuQ29udHJvbEtpdC5kZXN0cm95ID0gZnVuY3Rpb24oKXtcbiAgICBNb3VzZS5nZXQoKS5kZXN0cm95KCk7XG4gICAgT3B0aW9ucy5nZXQoKS5kZXN0cm95KCk7XG4gICAgUGlja2VyLmdldCgpLmRlc3Ryb3koKTtcbiAgICBpbml0aWF0ZWQgPSBmYWxzZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29udHJvbEtpdDsiLCJ2YXIgRXZlbnRfICAgICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXG4gICAgTm9kZUV2ZW50ICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpLFxuICAgIENvbXBvbmVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9Db21wb25lbnRFdmVudCcpO1xuXG52YXIgTm9kZSAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyksXG4gICAgQ29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY29yZS9Db21wb25lbnQnKTtcblxudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG5cbnZhciBERUZBVUxUX0xBQkVMID0gJyc7XG5cbmZ1bmN0aW9uIEJ1dHRvbihwYXJlbnQsbGFiZWwsb25QcmVzcyxwYXJhbXMpIHtcbiAgICBvblByZXNzICAgICAgPSBvblByZXNzIHx8IGZ1bmN0aW9uKCl7fTtcbiAgICBwYXJhbXMgICAgICAgPSBwYXJhbXMgICAgICAgfHwge307XG4gICAgcGFyYW1zLmxhYmVsID0gcGFyYW1zLmxhYmVsIHx8IERFRkFVTFRfTEFCRUw7XG5cbiAgICBDb21wb25lbnQuYXBwbHkodGhpcyxbcGFyZW50LHBhcmFtcy5sYWJlbF0pO1xuXG4gICAgdmFyIG5vZGUgPSBuZXcgTm9kZShOb2RlLklOUFVUX0JVVFRPTik7XG5cbiAgICBub2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkJ1dHRvbik7XG4gICAgbm9kZS5zZXRQcm9wZXJ0eSgndmFsdWUnLGxhYmVsKTtcblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBub2RlLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk9OX0NMSUNLLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25QcmVzcygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHNlbGYsQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICB0aGlzLl93cmFwTm9kZS5hZGRDaGlsZChub2RlKTtcbn1cbkJ1dHRvbi5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKENvbXBvbmVudC5wcm90b3R5cGUpO1xuQnV0dG9uLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEJ1dHRvbjtcblxubW9kdWxlLmV4cG9ydHMgPSBCdXR0b247XG4iLCJ2YXIgRXZlbnREaXNwYXRjaGVyICAgICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50RGlzcGF0Y2hlcicpO1xudmFyIE9iamVjdENvbXBvbmVudE5vdGlmaWVyID0gcmVxdWlyZSgnLi4vY29yZS9PYmplY3RDb21wb25lbnROb3RpZmllcicpO1xuXG52YXIgRXZlbnRfICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXG4gICAgT3B0aW9uRXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL09wdGlvbkV2ZW50JyksXG4gICAgTm9kZUV2ZW50ICAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpO1xuXG52YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG5cbmZ1bmN0aW9uIEJ1dHRvblByZXNldChwYXJlbnROb2RlKSB7XG4gICAgRXZlbnREaXNwYXRjaGVyLmFwcGx5KHRoaXMpO1xuICAgIHZhciBub2RlICAgID0gdGhpcy5fYnRuTm9kZSA9IG5ldyBOb2RlKE5vZGUuSU5QVVRfQlVUVE9OKSxcbiAgICAgICAgaW1nTm9kZSA9IHRoaXMuX2luZGlOb2RlID0gbmV3IE5vZGUoKTtcblxuICAgIHRoaXMuX29uQWN0aXZlID0gZnVuY3Rpb24gKCkge307XG4gICAgdGhpcy5fb25EZWFjdGl2ZSA9IGZ1bmN0aW9uICgpIHt9O1xuICAgIHRoaXMuX2lzQWN0aXZlID0gZmFsc2U7XG5cbiAgICBub2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkJ1dHRvblByZXNldCk7XG4gICAgbm9kZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLCB0aGlzLl9vbk1vdXNlRG93bi5iaW5kKHRoaXMpKTtcblxuICAgIG5vZGUuYWRkQ2hpbGQoaW1nTm9kZSk7XG4gICAgcGFyZW50Tm9kZS5hZGRDaGlsZEF0KG5vZGUsIDApO1xuXG4gICAgT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIuZ2V0KCkuYWRkRXZlbnRMaXN0ZW5lcihPcHRpb25FdmVudC5UUklHR0VSLCB0aGlzLCAnb25PcHRpb25UcmlnZ2VyJyk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKE9wdGlvbkV2ZW50LlRSSUdHRVJFRCwgT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIuZ2V0KCksICdvbk9wdGlvblRyaWdnZXJlZCcpO1xufVxuQnV0dG9uUHJlc2V0LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZSk7XG5CdXR0b25QcmVzZXQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQnV0dG9uUHJlc2V0O1xuXG5CdXR0b25QcmVzZXQucHJvdG90eXBlLm9uT3B0aW9uVHJpZ2dlciA9IGZ1bmN0aW9uKGUpe1xuICAgIGlmKGUuZGF0YS5vcmlnaW4gPT0gdGhpcyl7XG4gICAgICAgIGlmKCF0aGlzLl9pc0FjdGl2ZSl7XG4gICAgICAgICAgICB0aGlzLl9vbkFjdGl2ZSgpO1xuICAgICAgICAgICAgdGhpcy5fYnRuTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5CdXR0b25QcmVzZXRBY3RpdmUpO1xuICAgICAgICAgICAgdGhpcy5faXNBY3RpdmUgPSB0cnVlO1xuICAgICAgICB9IGVsc2V7XG4gICAgICAgICAgICB0aGlzLl9vbkRlYWN0aXZlKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmKHRoaXMuX2lzQWN0aXZlKXtcbiAgICAgICAgdGhpcy5kZWFjdGl2YXRlKCk7XG4gICAgfVxufTtcblxuQnV0dG9uUHJlc2V0LnByb3RvdHlwZS5fb25Nb3VzZURvd24gPSBmdW5jdGlvbigpe1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIE9wdGlvbkV2ZW50LlRSSUdHRVJFRCwgbnVsbCkpO1xufTtcblxuQnV0dG9uUHJlc2V0LnByb3RvdHlwZS5zZXRPbkFjdGl2ZSA9IGZ1bmN0aW9uKGZ1bmMpe1xuICAgIHRoaXMuX29uQWN0aXZlID0gZnVuYztcbn07XG5cbkJ1dHRvblByZXNldC5wcm90b3R5cGUuc2V0T25EZWFjdGl2ZSA9IGZ1bmN0aW9uKGZ1bmMpe1xuICAgIHRoaXMuX29uRGVhY3RpdmUgPSBmdW5jO1xufTtcblxuQnV0dG9uUHJlc2V0LnByb3RvdHlwZS5kZWFjdGl2YXRlID0gZnVuY3Rpb24oKXtcbiAgICB0aGlzLl9pc0FjdGl2ZSA9IGZhbHNlO1xuICAgIHRoaXMuX2J0bk5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQnV0dG9uUHJlc2V0KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQnV0dG9uUHJlc2V0O1xuIiwidmFyIENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50Jyk7XG52YXIgQ1NTICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKSxcbiAgICBNZXRyaWMgICAgPSByZXF1aXJlKCcuL01ldHJpYycpO1xuXG52YXIgRXZlbnRfICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcbiAgICBHcm91cEV2ZW50ID0gcmVxdWlyZSgnLi4vZ3JvdXAvR3JvdXBFdmVudCcpO1xuXG5mdW5jdGlvbiBDYW52YXMocGFyZW50LHBhcmFtcykge1xuICAgIENvbXBvbmVudC5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cbiAgICB2YXIgd3JhcCA9IHRoaXMuX3dyYXBOb2RlO1xuICAgICAgICB3cmFwLnNldFN0eWxlQ2xhc3MoQ1NTLkNhbnZhc1dyYXApO1xuICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICAgICAgd3JhcC5nZXRFbGVtZW50KCkuYXBwZW5kQ2hpbGQoY2FudmFzKTtcblxuICAgIHZhciB3aWR0aCA9IHdyYXAuZ2V0V2lkdGgoKTtcbiAgICB0aGlzLl9jYW52YXNXaWR0aCA9IHRoaXMuX2NhbnZhc0hlaWdodCA9IDA7XG4gICAgdGhpcy5fc2V0Q2FudmFzU2l6ZSh3aWR0aCx3aWR0aCk7XG4gICAgdGhpcy5fdXBkYXRlSGVpZ2h0KCk7XG5cbiAgICB0aGlzLl9ub2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkNhbnZhc0xpc3RJdGVtKTtcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LkdST1VQX1NJWkVfQ0hBTkdFLHRoaXMsICAnb25Hcm91cFNpemVDaGFuZ2UnKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5HUk9VUF9TSVpFX1VQREFURSx0aGlzLl9wYXJlbnQsJ29uR3JvdXBTaXplVXBkYXRlJyk7XG59XG5DYW52YXMucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShDb21wb25lbnQucHJvdG90eXBlKTtcbkNhbnZhcy5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBDYW52YXM7XG5cbkNhbnZhcy5wcm90b3R5cGUuX3VwZGF0ZUhlaWdodCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FudmFzSGVpZ2h0ID0gdGhpcy5fY2FudmFzLmhlaWdodDtcblxuICAgIHRoaXMuX3dyYXBOb2RlLnNldEhlaWdodChjYW52YXNIZWlnaHQpO1xuICAgIHRoaXMuX25vZGUuc2V0SGVpZ2h0KGNhbnZhc0hlaWdodCArIE1ldHJpYy5QQURESU5HX1dSQVBQRVIpO1xufTtcblxuQ2FudmFzLnByb3RvdHlwZS5vbkdyb3VwU2l6ZUNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgd2lkdGggPSB0aGlzLl93cmFwTm9kZS5nZXRXaWR0aCgpO1xuXG4gICAgdGhpcy5fc2V0Q2FudmFzU2l6ZSh3aWR0aCwgd2lkdGgpO1xuICAgIHRoaXMuX3VwZGF0ZUhlaWdodCgpO1xuICAgIHRoaXMuX3JlZHJhdygpO1xuXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgR3JvdXBFdmVudC5HUk9VUF9TSVpFX1VQREFURSwgbnVsbCkpO1xufTtcblxuQ2FudmFzLnByb3RvdHlwZS5fc2V0Q2FudmFzU2l6ZSA9IGZ1bmN0aW9uICh3aWR0aCwgaGVpZ2h0KSB7XG4gICAgdmFyIGNhbnZhc1dpZHRoID0gdGhpcy5fY2FudmFzV2lkdGggPSB3aWR0aCxcbiAgICAgICAgY2FudmFzSGVpZ2h0ID0gdGhpcy5fY2FudmFzSGVpZ2h0ID0gaGVpZ2h0O1xuXG4gICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhcztcbiAgICAgICAgY2FudmFzLnN0eWxlLndpZHRoID0gY2FudmFzV2lkdGggKyAncHgnO1xuICAgICAgICBjYW52YXMuc3R5bGUuaGVpZ2h0ID0gY2FudmFzSGVpZ2h0ICsgJ3B4JztcbiAgICAgICAgY2FudmFzLndpZHRoID0gY2FudmFzV2lkdGg7XG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSBjYW52YXNIZWlnaHQ7XG59O1xuXG5DYW52YXMucHJvdG90eXBlLmdldENhbnZhcyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fY2FudmFzO1xufTtcblxuQ2FudmFzLnByb3RvdHlwZS5nZXRDb250ZXh0ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9jYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FudmFzO1xuIiwidmFyIE9iamVjdENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvT2JqZWN0Q29tcG9uZW50JyksXG4gICAgTm9kZSAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XG5cbnZhciBFdmVudF8gICAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcbiAgICBOb2RlRXZlbnQgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50JyksXG4gICAgQ29tcG9uZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL0NvbXBvbmVudEV2ZW50Jyk7XG5cbmZ1bmN0aW9uIENoZWNrYm94KHBhcmVudCwgb2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgT2JqZWN0Q29tcG9uZW50LmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuICAgIHBhcmFtcyA9IHBhcmFtcyB8fCB7fTtcbiAgICBwYXJhbXMub25DaGFuZ2UgPSBwYXJhbXMub25DaGFuZ2UgfHwgdGhpcy5fb25DaGFuZ2U7XG4gICAgdGhpcy5fb25DaGFuZ2UgPSBwYXJhbXMub25DaGFuZ2U7XG5cbiAgICB2YXIgbm9kZSA9IHRoaXMuX2lucHV0ID0gbmV3IE5vZGUoTm9kZS5JTlBVVF9DSEVDS0JPWCk7XG4gICAgbm9kZS5zZXRQcm9wZXJ0eSgnY2hlY2tlZCcsdGhpcy5fb2JqW3RoaXMuX2tleV0pO1xuICAgIG5vZGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuQ0hBTkdFLHRoaXMuX29uSW5wdXRDaGFuZ2UuYmluZCh0aGlzKSk7XG5cbiAgICB0aGlzLl93cmFwTm9kZS5hZGRDaGlsZCh0aGlzLl9pbnB1dCk7XG59XG5DaGVja2JveC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE9iamVjdENvbXBvbmVudC5wcm90b3R5cGUpO1xuQ2hlY2tib3gucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQ2hlY2tib3g7XG5cbkNoZWNrYm94LnByb3RvdHlwZS5hcHBseVZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMucHVzaEhpc3RvcnlTdGF0ZSgpO1xuXG4gICAgdmFyIG9iaiA9IHRoaXMuX29iaiwga2V5ID0gdGhpcy5fa2V5O1xuICAgIG9ialtrZXldID0gIW9ialtrZXldO1xuXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCwgbnVsbCkpO1xufTtcblxuQ2hlY2tib3gucHJvdG90eXBlLl9vbklucHV0Q2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuYXBwbHlWYWx1ZSgpO1xuICAgIHRoaXMuX29uQ2hhbmdlKCk7XG59O1xuXG5DaGVja2JveC5wcm90b3R5cGUub25WYWx1ZVVwZGF0ZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKGUuZGF0YS5vcmlnaW4gPT0gdGhpcyl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5faW5wdXQuc2V0UHJvcGVydHkoJ2NoZWNrZWQnLCB0aGlzLl9vYmpbdGhpcy5fa2V5XSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENoZWNrYm94OyIsInZhciBPYmplY3RDb21wb25lbnQgPSByZXF1aXJlKCcuLy4uL2NvcmUvT2JqZWN0Q29tcG9uZW50Jyk7XG5cbnZhciBOb2RlICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcbnZhciBDb2xvck1vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2NvbG9yL0NvbG9yTW9kZScpO1xudmFyIFBpY2tlciAgICA9IHJlcXVpcmUoJy4vUGlja2VyJyk7XG52YXIgQ29sb3JVdGlsID0gcmVxdWlyZSgnLi4vY29yZS9jb2xvci9Db2xvclV0aWwnKTtcbnZhciBPcHRpb25zICAgPSByZXF1aXJlKCcuL09wdGlvbnMnKTtcbnZhciBCdXR0b25QcmVzZXQgPSByZXF1aXJlKCcuL0J1dHRvblByZXNldCcpO1xudmFyIE1ldHJpYyAgICAgICA9IHJlcXVpcmUoJy4vTWV0cmljJyksXG5cdENTUyAgICAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG5cbnZhciBFdmVudF8gICAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcblx0Tm9kZUV2ZW50ICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpLFxuXHRDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKTtcblxudmFyIENvbG9yRm9ybWF0RXJyb3IgPSByZXF1aXJlKCcuLi9jb3JlL2NvbG9yL0NvbG9yRm9ybWF0RXJyb3InKTtcblxudmFyIERFRkFVTFRfQ09MT1JfTU9ERSA9IENvbG9yTW9kZS5IRVgsXG5cdERFRkFVTFRfUFJFU0VUUyAgICA9IG51bGw7XG5cbnZhciBNU0dfQ09MT1JfRk9STUFUX0hFWCAgICAgICAgICAgICAgICAgID0gJ0NvbG9yIGZvcm1hdCBzaG91bGQgYmUgaGV4LiBTZXQgY29sb3JNb2RlIHRvIHJnYiwgcmdiZnYgb3IgaHN2LicsXG5cdE1TR19DT0xPUl9GT1JNQVRfUkdCX1JHQkZWX0hTViAgICAgICAgPSAnQ29sb3IgZm9ybWF0IHNob3VsZCBiZSByZ2IsIHJnYmZ2IG9yIGhzdi4gU2V0IGNvbG9yTW9kZSB0byBoZXguJyxcblx0TVNHX0NPTE9SX1BSRVNFVF9GT1JNQVRfSEVYICAgICAgICAgICA9ICdQcmVzZXQgY29sb3IgZm9ybWF0IHNob3VsZCBiZSBoZXguJyxcblx0TVNHX0NPTE9SX1BSRVNFVF9GT1JNQVRfUkdCX1JHQkZWX0hTViA9ICdQcmVzZXQgY29sb3IgZm9ybWF0IHNob3VsZCBiZSByZ2IsIHJnYmZ2IG9yIGhzdi4nO1xuXG5mdW5jdGlvbiBDb2xvcihwYXJlbnQsIG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuXHRPYmplY3RDb21wb25lbnQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuXHRwYXJhbXMgPSBwYXJhbXMgfHwge307XG5cdHBhcmFtcy5wcmVzZXRzID0gcGFyYW1zLnByZXNldHMgfHwgREVGQVVMVF9QUkVTRVRTO1xuXHRwYXJhbXMuY29sb3JNb2RlID0gcGFyYW1zLmNvbG9yTW9kZSB8fCBERUZBVUxUX0NPTE9SX01PREU7XG5cblx0dGhpcy5fcHJlc2V0c0tleSA9IHBhcmFtcy5wcmVzZXRzO1xuXG5cdHZhciBjb2xvciA9IHRoaXMuX2NvbG9yID0gbmV3IE5vZGUoKTtcblx0dmFsdWUgPSB0aGlzLl92YWx1ZSA9IHRoaXMuX29ialt0aGlzLl9rZXldO1xuXG5cdHZhciBjb2xvck1vZGUgPSB0aGlzLl9jb2xvck1vZGUgPSBwYXJhbXMuY29sb3JNb2RlO1xuXG5cdHRoaXMuX3ZhbGlkYXRlQ29sb3JGb3JtYXQodmFsdWUsIE1TR19DT0xPUl9GT1JNQVRfSEVYLCBNU0dfQ09MT1JfRk9STUFUX1JHQl9SR0JGVl9IU1YpO1xuXG5cdHZhciB3cmFwID0gdGhpcy5fd3JhcE5vZGU7XG5cblx0aWYgKCF0aGlzLl9wcmVzZXRzS2V5KSB7XG5cdFx0Y29sb3Iuc2V0U3R5bGVDbGFzcyhDU1MuQ29sb3IpO1xuXHRcdHdyYXAuYWRkQ2hpbGQoY29sb3IpO1xuXHR9XG5cdGVsc2Uge1xuXHRcdGNvbG9yLnNldFN0eWxlQ2xhc3MoQ1NTLkNvbG9yKTtcblxuXHRcdHZhciB3cmFwXyA9IG5ldyBOb2RlKCk7XG5cdFx0d3JhcF8uc2V0U3R5bGVDbGFzcyhDU1MuV3JhcENvbG9yV1ByZXNldCk7XG5cblx0XHR3cmFwLmFkZENoaWxkKHdyYXBfKTtcblx0XHR3cmFwXy5hZGRDaGlsZChjb2xvcik7XG5cblx0XHR2YXIgcHJlc2V0cyA9IHRoaXMuX29ialt0aGlzLl9wcmVzZXRzS2V5XTtcblxuXHRcdHZhciBpID0gLTE7XG5cdFx0d2hpbGUgKCsraSA8IHByZXNldHMubGVuZ3RoKSB7XG5cdFx0XHR0aGlzLl92YWxpZGF0ZUNvbG9yRm9ybWF0KHByZXNldHNbaV0sIE1TR19DT0xPUl9QUkVTRVRfRk9STUFUX0hFWCxcblx0XHRcdFx0TVNHX0NPTE9SX1BSRVNFVF9GT1JNQVRfUkdCX1JHQkZWX0hTVik7XG5cdFx0fVxuXG5cdFx0dmFyIG9wdGlvbnMgPSBPcHRpb25zLmdldCgpLFxuXHRcdFx0cHJlc2V0QnRuID0gbmV3IEJ1dHRvblByZXNldCh3cmFwKTtcblxuXHRcdHZhciBvblByZXNldERlYWN0aXZhdGUgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRvcHRpb25zLmNsZWFyKCk7XG5cdFx0XHRwcmVzZXRCdG4uZGVhY3RpdmF0ZSgpO1xuXHRcdH07XG5cblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0dmFyIG9uUHJlc2V0QWN0aXZhdGUgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRvcHRpb25zLmJ1aWxkKHByZXNldHMsXG5cdFx0XHRcdHNlbGYuX3ZhbHVlLFxuXHRcdFx0XHRjb2xvcixcblx0XHRcdFx0ZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHNlbGYucHVzaEhpc3RvcnlTdGF0ZSgpO1xuXHRcdFx0XHRcdHNlbGYuX3ZhbHVlID0gcHJlc2V0c1tvcHRpb25zLmdldFNlbGVjdGVkSW5kZXgoKV07XG5cdFx0XHRcdFx0c2VsZi5hcHBseVZhbHVlKCk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uUHJlc2V0RGVhY3RpdmF0ZSxcblx0XHRcdFx0TWV0cmljLlBBRERJTkdfUFJFU0VULFxuXHRcdFx0XHR0cnVlLFxuXHRcdFx0XHRjb2xvck1vZGUpO1xuXHRcdH07XG5cdFx0cHJlc2V0QnRuLnNldE9uQWN0aXZlKG9uUHJlc2V0QWN0aXZhdGUpO1xuXHRcdHByZXNldEJ0bi5zZXRPbkRlYWN0aXZlKG9uUHJlc2V0RGVhY3RpdmF0ZSk7XG5cdH1cblxuXHRjb2xvci5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLCB0aGlzLl9vbkNvbG9yVHJpZ2dlci5iaW5kKHRoaXMpKTtcblx0dGhpcy5fdXBkYXRlQ29sb3IoKTtcbn1cbkNvbG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZSk7XG5Db2xvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBDb2xvcjtcblxuQ29sb3IucHJvdG90eXBlLl9vbkNvbG9yVHJpZ2dlciA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIGNvbG9yTW9kZSA9IHRoaXMuX2NvbG9yTW9kZSxcblx0XHRjb2xvck1vZGVIRVggPSBDb2xvck1vZGUuSEVYLFxuXHRcdGNvbG9yTW9kZVJHQiA9IENvbG9yTW9kZS5SR0IsXG5cdFx0Y29sb3JNb2RlUkdCZnYgPSBDb2xvck1vZGUuUkdCZnYsXG5cdFx0Y29sb3JNb2RlSFNWID0gQ29sb3JNb2RlLkhTVjtcblxuXHR2YXIgdmFsdWUgPSB0aGlzLl92YWx1ZSxcblx0XHR0ZW1wO1xuXG5cdHZhciBvblBpY2tlclBpY2sgPSBmdW5jdGlvbiAoKSB7XG5cdFx0dGhpcy5wdXNoSGlzdG9yeVN0YXRlKCk7XG5cblx0XHRzd2l0Y2ggKGNvbG9yTW9kZSkge1xuXHRcdFx0Y2FzZSBjb2xvck1vZGVIRVg6XG5cdFx0XHRcdHRoaXMuX3ZhbHVlID0gUGlja2VyLmdldCgpLmdldEhFWCgpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgY29sb3JNb2RlUkdCOlxuXHRcdFx0XHQvL2lmIHZhbCA9IEZsb2F0MzJhcnJheSBvciBzb1xuXHRcdFx0XHR0ZW1wID0gUGlja2VyLmdldCgpLmdldFJHQigpO1xuXHRcdFx0XHR2YWx1ZVswXSA9IHRlbXBbMF07XG5cdFx0XHRcdHZhbHVlWzFdID0gdGVtcFsxXTtcblx0XHRcdFx0dmFsdWVbMl0gPSB0ZW1wWzJdO1xuXHRcdFx0XHRicmVhaztcblxuXHRcdFx0Y2FzZSBjb2xvck1vZGVSR0Jmdjpcblx0XHRcdFx0dGVtcCA9IFBpY2tlci5nZXQoKS5nZXRSR0JmdigpO1xuXHRcdFx0XHR2YWx1ZVswXSA9IHRlbXBbMF07XG5cdFx0XHRcdHZhbHVlWzFdID0gdGVtcFsxXTtcblx0XHRcdFx0dmFsdWVbMl0gPSB0ZW1wWzJdO1xuXHRcdFx0XHRicmVhaztcblxuXHRcdFx0Y2FzZSBjb2xvck1vZGVIU1Y6XG5cdFx0XHRcdHRoaXMuX3ZhbHVlID0gUGlja2VyLmdldCgpLmdldEhTVigpO1xuXHRcdFx0XHRicmVhaztcblx0XHR9XG5cblx0XHR0aGlzLmFwcGx5VmFsdWUoKTtcblxuXHR9LmJpbmQodGhpcyk7XG5cblx0dmFyIHBpY2tlciA9IFBpY2tlci5nZXQoKTtcblxuXHRzd2l0Y2ggKGNvbG9yTW9kZSkge1xuXHRcdGNhc2UgY29sb3JNb2RlSEVYOlxuXHRcdFx0cGlja2VyLnNldENvbG9ySEVYKHZhbHVlKTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgY29sb3JNb2RlUkdCOlxuXHRcdFx0cGlja2VyLnNldENvbG9yUkdCKHZhbHVlWzBdLCB2YWx1ZVsxXSwgdmFsdWVbMl0pO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSBjb2xvck1vZGVSR0Jmdjpcblx0XHRcdHBpY2tlci5zZXRDb2xvclJHQmZ2KHZhbHVlWzBdLCB2YWx1ZVsxXSwgdmFsdWVbMl0pO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSBjb2xvck1vZGVIU1Y6XG5cdFx0XHRwaWNrZXIuc2V0Q29sb3JIU1YodmFsdWVbMF0sIHZhbHVlWzFdLCB2YWx1ZVsyXSk7XG5cdFx0XHRicmVhaztcblx0fVxuXG5cdHBpY2tlci5zZXRDYWxsYmFja1BpY2sob25QaWNrZXJQaWNrKTtcblx0cGlja2VyLm9wZW4oKTtcbn07XG5cbkNvbG9yLnByb3RvdHlwZS5hcHBseVZhbHVlID0gZnVuY3Rpb24gKCkge1xuXHR0aGlzLl9vYmpbdGhpcy5fa2V5XSA9IHRoaXMuX3ZhbHVlO1xuXHR0aGlzLl91cGRhdGVDb2xvcigpO1xuXHR0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBDb21wb25lbnRFdmVudC5WQUxVRV9VUERBVEVELCBudWxsKSk7XG59O1xuXG5Db2xvci5wcm90b3R5cGUub25WYWx1ZVVwZGF0ZSA9IGZ1bmN0aW9uIChlKSB7XG5cdGlmIChlLmRhdGEub3JpZ2luID09IHRoaXMpcmV0dXJuO1xuXHR0aGlzLl92YWx1ZSA9IHRoaXMuX29ialt0aGlzLl9rZXldO1xuXHR0aGlzLl91cGRhdGVDb2xvcigpO1xufTtcblxuQ29sb3IucHJvdG90eXBlLl91cGRhdGVDb2xvciA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIGNvbG9yID0gdGhpcy5fdmFsdWUsXG5cdFx0Y29sb3JOb2RlID0gdGhpcy5fY29sb3IsXG5cdFx0bm9kZUNvbG9yO1xuXG5cdGNvbG9yTm9kZS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywgY29sb3IpO1xuXG5cdHN3aXRjaCAodGhpcy5fY29sb3JNb2RlKSB7XG5cdFx0Y2FzZSBDb2xvck1vZGUuSEVYOlxuXHRcdFx0bm9kZUNvbG9yID0gY29sb3I7XG5cdFx0XHRicmVhaztcblxuXHRcdGNhc2UgQ29sb3JNb2RlLlJHQjpcblx0XHRcdG5vZGVDb2xvciA9IENvbG9yVXRpbC5SR0IySEVYKGNvbG9yWzBdLCBjb2xvclsxXSwgY29sb3JbMl0pO1xuXHRcdFx0YnJlYWs7XG5cblx0XHRjYXNlIENvbG9yTW9kZS5SR0Jmdjpcblx0XHRcdG5vZGVDb2xvciA9IENvbG9yVXRpbC5SR0JmdjJIRVgoY29sb3JbMF0sIGNvbG9yWzFdLCBjb2xvclsyXSk7XG5cdFx0XHRicmVhaztcblxuXHRcdGNhc2UgQ29sb3JNb2RlLkhTVjpcblx0XHRcdG5vZGVDb2xvciA9IENvbG9yVXRpbC5IU1YyUkdCKGNvbG9yWzBdLCBjb2xvclsxXSwgY29sb3JbMl0pO1xuXHRcdFx0YnJlYWs7XG5cdH1cblxuXHRjb2xvck5vZGUuZ2V0U3R5bGUoKS5iYWNrZ3JvdW5kQ29sb3IgPSBub2RlQ29sb3I7XG59O1xuXG5Db2xvci5wcm90b3R5cGUuX3ZhbGlkYXRlQ29sb3JGb3JtYXQgPSBmdW5jdGlvbiAodmFsdWUsIG1zZ0hleCwgbXNnQXJyKSB7XG5cdHZhciBjb2xvck1vZGUgPSB0aGlzLl9jb2xvck1vZGU7XG5cblx0aWYgKGNvbG9yTW9kZSA9PSBDb2xvck1vZGUuSEVYICYmIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IEFycmF5XScgfHxcblx0XHRjb2xvck1vZGUgPT0gQ29sb3JNb2RlLkhFWCAmJiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpID09PSAnW29iamVjdCBGbG9hdDMyQXJyYXldJykge1xuXHRcdHRocm93IG5ldyBDb2xvckZvcm1hdEVycm9yKG1zZ0hleCk7XG5cdH1cblx0aWYgKChjb2xvck1vZGUgPT0gQ29sb3JNb2RlLlJHQiB8fFxuXHRcdGNvbG9yTW9kZSA9PSBDb2xvck1vZGUuUkdCZnYgfHxcblx0XHRjb2xvck1vZGUgPT0gQ29sb3JNb2RlLkhTVikgJiZcblx0XHRPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpICE9PSAnW29iamVjdCBBcnJheV0nIHx8XG5cdFx0Y29sb3JNb2RlID09IENvbG9yTW9kZS5IU1YgJiZcblx0XHRPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpICE9PSAnW29iamVjdCBGbG9hdDMyQXJyYXldJykge1xuXHRcdHRocm93IG5ldyBDb2xvckZvcm1hdEVycm9yKG1zZ0Fycik7XG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29sb3I7IiwidmFyIEZ1bmN0aW9uUGxvdFR5cGUgPSB7XG4gICAgSU1QTElDSVQ6ICdpbXBsaWNpdCcsXG4gICAgTk9OX0lNUExJQ0lUOiAnbm9uSW1wbGljaXQnXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZ1bmN0aW9uUGxvdFR5cGU7IiwidmFyIFBsb3R0ZXIgPSByZXF1aXJlKCcuL1Bsb3R0ZXInKTtcblxudmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xudmFyIEZ1bmN0aW9uUGxvdFR5cGUgPSByZXF1aXJlKCcuL0Z1bmN0aW9uUGxvdFR5cGUnKTtcblxuXG52YXIgTW91c2UgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L01vdXNlJyk7XG52YXIgTWV0cmljID0gcmVxdWlyZSgnLi9NZXRyaWMnKTtcblxudmFyIERvY3VtZW50RXZlbnQgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXG4gICAgQ29tcG9uZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL0NvbXBvbmVudEV2ZW50JyksXG4gICAgTm9kZUV2ZW50ICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpO1xuXG52YXIgRnVuY3Rpb25QbG90dGVyT2JqZWN0RXJyb3IgICAgICAgPSByZXF1aXJlKCcuL0Z1bmN0aW9uUGxvdHRlck9iamVjdEVycm9yJyksXG4gICAgRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3IgPSByZXF1aXJlKCcuL0Z1bmN0aW9uUGxvdHRlckZ1bmN0aW9uQXJnc0Vycm9yJyk7XG5cbnZhciBPYmplY3RDb21wb25lbnROb3RpZmllciA9IHJlcXVpcmUoJy4uL2NvcmUvT2JqZWN0Q29tcG9uZW50Tm90aWZpZXInKTtcblxudmFyIERFRkFVTFRfU0hPV19NSU5fTUFYX0xBQkVMUyA9IHRydWU7XG5cbnZhciBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfTk9OX0lNUExJQ0lUX1VOSVRfWCAgPSAgMSxcbiAgICBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfTk9OX0lNUExJQ0lUX1VOSVRfWSAgPSAgMSxcbiAgICBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfSU1QTElDSVRfVU5JVF9YICA9IDAuMjUsXG4gICAgREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX0lNUExJQ0lUX1VOSVRfWSAgPSAwLjI1LFxuICAgIERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9VTklUX01JTiAgPSAwLjE1LFxuICAgIERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9VTklUX01BWCAgPSA0LFxuICAgIERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9OT05fSU1QTElDSVRfU0NBTEUgID0gMTAuMCxcbiAgICBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfSU1QTElDSVRfU0NBTEUgPSAxLjAsXG4gICAgREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX1NDQUxFX01JTiA9IDAuMDIsXG4gICAgREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX1NDQUxFX01BWCA9IDI1LFxuXG4gICAgREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX0lNUExJQ0lUX0FYRVNfQ09MT1IgPSAncmdiYSgyNTUsMjU1LDI1NSwwLjc1KScsXG4gICAgREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX0lNUExJQ0lUX0dSSURfQ09MT1IgPSAncmdiYSgyNSwyNSwyNSwwLjc1KScsXG5cbiAgICBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfTk9OX0lNUExJQ0lUX0FYRVNfQ09MT1IgPSAncmdiKDU0LDYwLDY0KScsXG4gICAgREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX05PTl9JTVBMSUNJVF9HUklEX0NPTE9SID0gJ3JnYigyNSwyNSwyNSknLFxuXG4gICAgREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX0NJUkNMRV9MQUJFTF9SQURJVVMgPSAzLFxuICAgIERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9DSVJDTEVfTEFCRUxfRklMTCAgID0gJ3JnYigyNTUsMjU1LDI1NSknLFxuICAgIERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9DSVJDTEVfU1RST0tFICAgICAgID0gJyNiMTIzMzQnO1xuXG5mdW5jdGlvbiBGdW5jdGlvblBsb3R0ZXIocGFyZW50LCBvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICBwYXJhbXMgPSBwYXJhbXMgfHwge307XG4gICAgcGFyYW1zLnNob3dNaW5NYXhMYWJlbHMgPSBwYXJhbXMuc2hvd01pbk1heExhYmVscyA9PT0gdW5kZWZpbmVkID8gREVGQVVMVF9TSE9XX01JTl9NQVhfTEFCRUxTIDogcGFyYW1zLnNob3dNaW5NYXhMYWJlbHM7XG5cbiAgICBQbG90dGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICBpZiAodHlwZW9mIG9iamVjdFt2YWx1ZV0gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhyb3cgbmV3IEZ1bmN0aW9uUGxvdHRlck9iamVjdEVycm9yKG9iamVjdCx2YWx1ZSk7XG4gICAgfVxuXG4gICAgdmFyIGZ1bmNBcmdMZW5ndGggPSBvYmplY3RbdmFsdWVdLmxlbmd0aDtcblxuICAgIGlmIChmdW5jQXJnTGVuZ3RoID4gMiB8fCBmdW5jQXJnTGVuZ3RoID09IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEZ1bmN0aW9uUGxvdHRlckZ1bmN0aW9uQXJnc0Vycm9yKCk7XG4gICAgfVxuXG4gICAgdmFyIHN2Z1Jvb3QgPSB0aGlzLl9zdmdSb290LFxuICAgICAgICBwYXRoID0gdGhpcy5fcGF0aDtcblxuICAgIHZhciBheGVzID0gdGhpcy5fYXhlcyA9IHN2Z1Jvb3QuaW5zZXJ0QmVmb3JlKHRoaXMuX2NyZWF0ZVNWR09iamVjdCgncGF0aCcpLCBwYXRoKTtcbiAgICAgICAgYXhlcy5zdHlsZS5zdHJva2VXaWR0aCA9IDE7XG5cbiAgICB2YXIgYXhlc0xhYmVscyA9IHRoaXMuX2F4ZXNMYWJlbHMgPSBzdmdSb290Lmluc2VydEJlZm9yZSh0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ3BhdGgnKSwgcGF0aCk7XG4gICAgICAgIGF4ZXNMYWJlbHMuc3R5bGUuc3Ryb2tlID0gJ3JnYig0Myw0OCw1MSknO1xuICAgICAgICBheGVzTGFiZWxzLnN0eWxlLnN0cm9rZVdpZHRoID0gMTtcblxuICAgIHZhciBncmlkID0gdGhpcy5fZ3JpZDtcblxuICAgIHZhciBzdmcgPSB0aGlzLl9zdmcsXG4gICAgICAgIHNpemUgPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnd2lkdGgnKSk7XG5cbiAgICB2YXIgc2xpZGVyWFdyYXAgPSBuZXcgTm9kZSgpO1xuICAgICAgICBzbGlkZXJYV3JhcC5zZXRTdHlsZUNsYXNzKENTUy5HcmFwaFNsaWRlclhXcmFwKTtcblxuICAgIHZhciBzbGlkZXJZV3JhcCA9IG5ldyBOb2RlKCk7XG4gICAgICAgIHNsaWRlcllXcmFwLnNldFN0eWxlQ2xhc3MoQ1NTLkdyYXBoU2xpZGVyWVdyYXApO1xuXG4gICAgdmFyIHNsaWRlclhUcmFjayA9IHRoaXMuX3NsaWRlclhUcmFjayA9IG5ldyBOb2RlKCk7XG4gICAgICAgIHNsaWRlclhUcmFjay5zZXRTdHlsZUNsYXNzKENTUy5HcmFwaFNsaWRlclgpO1xuXG4gICAgdmFyIHNsaWRlcllUcmFjayA9IHRoaXMuX3NsaWRlcllUcmFjayA9IG5ldyBOb2RlKCk7XG4gICAgICAgIHNsaWRlcllUcmFjay5zZXRTdHlsZUNsYXNzKENTUy5HcmFwaFNsaWRlclkpO1xuXG4gICAgdmFyIHNsaWRlclhIYW5kbGUgPSB0aGlzLl9zbGlkZXJYSGFuZGxlID0gbmV3IE5vZGUoKTtcbiAgICAgICAgc2xpZGVyWEhhbmRsZS5zZXRTdHlsZUNsYXNzKENTUy5HcmFwaFNsaWRlclhIYW5kbGUpO1xuXG4gICAgdmFyIHNsaWRlcllIYW5kbGUgPSB0aGlzLl9zbGlkZXJZSGFuZGxlID0gbmV3IE5vZGUoKTtcbiAgICAgICAgc2xpZGVyWUhhbmRsZS5zZXRTdHlsZUNsYXNzKENTUy5HcmFwaFNsaWRlcllIYW5kbGUpO1xuXG4gICAgc2xpZGVyWFRyYWNrLmFkZENoaWxkKHNsaWRlclhIYW5kbGUpO1xuICAgIHNsaWRlcllUcmFjay5hZGRDaGlsZChzbGlkZXJZSGFuZGxlKTtcbiAgICBzbGlkZXJYV3JhcC5hZGRDaGlsZChzbGlkZXJYVHJhY2spO1xuICAgIHNsaWRlcllXcmFwLmFkZENoaWxkKHNsaWRlcllUcmFjayk7XG5cbiAgICB2YXIgd3JhcE5vZGUgPSB0aGlzLl93cmFwTm9kZTtcblxuICAgIHZhciBwbG90TW9kZSA9IHRoaXMuX3Bsb3RNb2RlID0gZnVuY0FyZ0xlbmd0aCA9PSAxID9cbiAgICAgICAgRnVuY3Rpb25QbG90VHlwZS5OT05fSU1QTElDSVQgOlxuICAgICAgICBGdW5jdGlvblBsb3RUeXBlLklNUExJQ0lUO1xuXG4gICAgaWYgKHBsb3RNb2RlID09IEZ1bmN0aW9uUGxvdFR5cGUuSU1QTElDSVQpIHtcbiAgICAgICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgICAgICBjYW52YXMuc3R5bGUud2lkdGggPSBjYW52YXMuc3R5bGUuaGVpZ2h0ID0gc2l6ZSArICdweCc7XG4gICAgICAgIGNhbnZhcy53aWR0aCA9IGNhbnZhcy5oZWlnaHQgPSBzaXplO1xuXG4gICAgICAgIHdyYXBOb2RlLmdldEVsZW1lbnQoKS5pbnNlcnRCZWZvcmUoY2FudmFzLCBzdmcpO1xuXG4gICAgICAgIHRoaXMuX2NhbnZhc0NvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICAgICAgdGhpcy5fY2FudmFzSW1hZ2VEYXRhID0gdGhpcy5fY2FudmFzQ29udGV4dC5nZXRJbWFnZURhdGEoMCwgMCwgc2l6ZSwgc2l6ZSk7XG5cbiAgICAgICAgYXhlcy5zdHlsZS5zdHJva2UgPSBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfSU1QTElDSVRfQVhFU19DT0xPUjtcbiAgICAgICAgZ3JpZC5zdHlsZS5zdHJva2UgPSBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfSU1QTElDSVRfR1JJRF9DT0xPUjtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGF4ZXMuc3R5bGUuc3Ryb2tlID0gREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX05PTl9JTVBMSUNJVF9BWEVTX0NPTE9SO1xuICAgICAgICBncmlkLnN0eWxlLnN0cm9rZSA9IERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9OT05fSU1QTElDSVRfR1JJRF9DT0xPUjtcbiAgICB9XG5cbiAgICB3cmFwTm9kZS5hZGRDaGlsZChzbGlkZXJYV3JhcCk7XG4gICAgd3JhcE5vZGUuYWRkQ2hpbGQoc2xpZGVyWVdyYXApO1xuXG4gICAgc2xpZGVyWEhhbmRsZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLCB0aGlzLl9vblNsaWRlclhIYW5kbGVEb3duLmJpbmQodGhpcykpO1xuICAgIHNsaWRlcllIYW5kbGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25TbGlkZXJZSGFuZGxlRG93bi5iaW5kKHRoaXMpKTtcblxuICAgIHZhciB1bml0cyA9IHRoaXMuX3VuaXRzID0gW251bGwsIG51bGxdO1xuICAgIHRoaXMuX3NjYWxlID0gbnVsbDtcblxuICAgIGlmIChwbG90TW9kZSA9PSBGdW5jdGlvblBsb3RUeXBlLk5PTl9JTVBMSUNJVCkge1xuICAgICAgICB1bml0c1swXSA9IERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9OT05fSU1QTElDSVRfVU5JVF9YO1xuICAgICAgICB1bml0c1sxXSA9IERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9OT05fSU1QTElDSVRfVU5JVF9ZO1xuXG4gICAgICAgIHRoaXMuX3NjYWxlID0gREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX05PTl9JTVBMSUNJVF9TQ0FMRTtcbiAgICB9XG4gICAgZWxzZSBpZiAocGxvdE1vZGUgPT0gRnVuY3Rpb25QbG90VHlwZS5JTVBMSUNJVCkge1xuICAgICAgICB1bml0c1swXSA9IERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9JTVBMSUNJVF9VTklUX1g7XG4gICAgICAgIHVuaXRzWzFdID0gREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX0lNUExJQ0lUX1VOSVRfWTtcblxuICAgICAgICB0aGlzLl9zY2FsZSA9IERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9JTVBMSUNJVF9TQ0FMRTtcbiAgICB9XG5cbiAgICB0aGlzLl91bml0c01pbk1heCA9IFtERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfVU5JVF9NSU4sIERFRkFVTFRfRlVOQ1RJT05fUExPVFRFUl9VTklUX01BWF07IC8vMS84LT40XG5cbiAgICB0aGlzLl9zY2FsZU1pbk1heCA9IFtERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfU0NBTEVfTUlOLCBERUZBVUxUX0ZVTkNUSU9OX1BMT1RURVJfU0NBTEVfTUFYXTsgLy8xLzUwIC0+IDI1XG5cbiAgICB0aGlzLl9jZW50ZXIgPSBbTWF0aC5yb3VuZChzaXplICogMC41KSxNYXRoLnJvdW5kKHNpemUgKiAwLjUpXTtcbiAgICB0aGlzLl9zdmdQb3MgPSBbMCwgMF07XG5cbiAgICB0aGlzLl9mdW5jID0gbnVsbDtcbiAgICB0aGlzLnNldEZ1bmN0aW9uKHRoaXMuX29ialt0aGlzLl9rZXldKTtcblxuICAgIHRoaXMuX3NsaWRlclhIYW5kbGVVcGRhdGUoKTtcbiAgICB0aGlzLl9zbGlkZXJZSGFuZGxlVXBkYXRlKCk7XG5cbiAgICBzdmcuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uRHJhZ1N0YXJ0LmJpbmQodGhpcyksIGZhbHNlKTtcbiAgICB0aGlzLl93cmFwTm9kZS5nZXRFbGVtZW50KCkuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNld2hlZWxcIiwgdGhpcy5fb25TY2FsZS5iaW5kKHRoaXMsIGZhbHNlKSk7XG5cbiAgICBPYmplY3RDb21wb25lbnROb3RpZmllci5nZXQoKS5hZGRFdmVudExpc3RlbmVyKENvbXBvbmVudEV2ZW50LlVQREFURV9WQUxVRSwgdGhpcywgJ29uVmFsdWVVcGRhdGUnKTtcbn1cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFBsb3R0ZXIucHJvdG90eXBlKTtcbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBGdW5jdGlvblBsb3R0ZXI7XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX3VwZGF0ZUNlbnRlciA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc3ZnID0gdGhpcy5fc3ZnLFxuICAgICAgICB3aWR0aCA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKSxcbiAgICAgICAgaGVpZ2h0ID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ2hlaWdodCcpKTtcblxuICAgIHZhciBtb3VzZVBvcyA9IE1vdXNlLmdldCgpLmdldFBvc2l0aW9uKCksXG4gICAgICAgIHN2Z1BvcyA9IHRoaXMuX3N2Z1BvcyxcbiAgICAgICAgY2VudGVyID0gdGhpcy5fY2VudGVyO1xuXG4gICAgY2VudGVyWzBdID0gTWF0aC5tYXgoMCwgTWF0aC5taW4obW91c2VQb3NbMF0gLSBzdmdQb3NbMF0sIHdpZHRoKSk7XG4gICAgY2VudGVyWzFdID0gTWF0aC5tYXgoMCwgTWF0aC5taW4obW91c2VQb3NbMV0gLSBzdmdQb3NbMV0sIGhlaWdodCkpO1xuXG4gICAgdGhpcy5fcGxvdEdyYXBoKCk7XG59O1xuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9vbkRyYWdTdGFydCA9IGZ1bmN0aW9uIChlKSB7XG4gICAgdmFyIGVsZW1lbnQgPSB0aGlzLl9zdmc7XG5cbiAgICB2YXIgc3ZnUG9zID0gdGhpcy5fc3ZnUG9zO1xuICAgIHN2Z1Bvc1swXSA9IDA7XG4gICAgc3ZnUG9zWzFdID0gMDtcblxuICAgIHdoaWxlIChlbGVtZW50KSB7XG4gICAgICAgIHN2Z1Bvc1swXSArPSBlbGVtZW50Lm9mZnNldExlZnQ7XG4gICAgICAgIHN2Z1Bvc1sxXSArPSBlbGVtZW50Lm9mZnNldFRvcDtcbiAgICAgICAgZWxlbWVudCA9IGVsZW1lbnQub2Zmc2V0UGFyZW50O1xuICAgIH1cblxuICAgIHZhciBldmVudE1vdmUgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsXG4gICAgICAgIGV2ZW50VXAgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX1VQO1xuXG4gICAgdmFyIG9uRHJhZyA9IHRoaXMuX3VwZGF0ZUNlbnRlci5iaW5kKHRoaXMpLFxuICAgICAgICBvbkRyYWdFbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLl91cGRhdGVDZW50ZXIuYmluZCh0aGlzKTtcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRVcCwgb25EcmFnRW5kLCBmYWxzZSk7XG5cbiAgICAgICAgfS5iaW5kKHRoaXMpO1xuXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRVcCwgb25EcmFnRW5kLCBmYWxzZSk7XG5cbiAgICB0aGlzLl91cGRhdGVDZW50ZXIoKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX29uU2NhbGUgPSBmdW5jdGlvbiAoZSkge1xuICAgIGUgPSB3aW5kb3cuZXZlbnQgfHwgZTtcbiAgICB0aGlzLl9zY2FsZSArPSBNYXRoLm1heCgtMSwgTWF0aC5taW4oMSwgKGUud2hlZWxEZWx0YSB8fCAtZS5kZXRhaWwpKSkgKiAtMTtcblxuICAgIHZhciBzY2FsZU1pbk1heCA9IHRoaXMuX3NjYWxlTWluTWF4O1xuICAgIHRoaXMuX3NjYWxlID0gTWF0aC5tYXgoc2NhbGVNaW5NYXhbMF0sIE1hdGgubWluKHRoaXMuX3NjYWxlLCBzY2FsZU1pbk1heFsxXSkpO1xuXG4gICAgdGhpcy5fcGxvdEdyYXBoKCk7XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUub25WYWx1ZVVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNldEZ1bmN0aW9uKHRoaXMuX29ialt0aGlzLl9rZXldKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX3JlZHJhdyA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5fcGxvdE1vZGUgPT0gRnVuY3Rpb25QbG90VHlwZS5JTVBMSUNJVCkge1xuICAgICAgICB2YXIgc2l6ZSA9IHRoaXMuX3dyYXBOb2RlLmdldFdpZHRoKCksXG4gICAgICAgICAgICBjYW52YXMgPSB0aGlzLl9jYW52YXM7XG5cbiAgICAgICAgY2FudmFzLnN0eWxlLndpZHRoID0gY2FudmFzLnN0eWxlLmhlaWdodCA9IHNpemUgKyAncHgnO1xuICAgICAgICBjYW52YXMud2lkdGggPSBjYW52YXMuaGVpZ2h0ID0gc2l6ZTtcblxuICAgICAgICB0aGlzLl9jYW52YXNJbWFnZURhdGEgPSB0aGlzLl9jYW52YXNDb250ZXh0LmdldEltYWdlRGF0YSgwLCAwLCBzaXplLCBzaXplKTtcbiAgICB9XG5cbiAgICB0aGlzLl9zbGlkZXJYSGFuZGxlVXBkYXRlKCk7XG4gICAgdGhpcy5fc2xpZGVyWUhhbmRsZVVwZGF0ZSgpO1xuXG4gICAgdGhpcy5zZXRGdW5jdGlvbih0aGlzLl9vYmpbdGhpcy5fa2V5XSk7XG59O1xuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLnNldEZ1bmN0aW9uID0gZnVuY3Rpb24gKGZ1bmMpIHtcbiAgICB0aGlzLl9mdW5jID0gZnVuYy5iaW5kKHRoaXMuX29iaik7XG4gICAgdGhpcy5fcGxvdEdyYXBoKCk7XG59O1xuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9wbG90R3JhcGggPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fZHJhd0dyaWQoKTtcbiAgICB0aGlzLl9kcmF3QXhlcygpO1xuICAgIHRoaXMuX2RyYXdQbG90KCk7XG59O1xuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9kcmF3QXhlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc3ZnID0gdGhpcy5fc3ZnLFxuICAgICAgICBzdmdXaWR0aCA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKSxcbiAgICAgICAgc3ZnSGVpZ2h0ID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ2hlaWdodCcpKTtcblxuICAgIHZhciBjZW50ZXIgPSB0aGlzLl9jZW50ZXIsXG4gICAgICAgIGNlbnRlclggPSBjZW50ZXJbMF0sXG4gICAgICAgIGNlbnRlclkgPSBjZW50ZXJbMV07XG5cbiAgICB2YXIgcGF0aENtZCA9ICcnO1xuICAgIHBhdGhDbWQgKz0gdGhpcy5fcGF0aENtZExpbmUoMCwgY2VudGVyWSwgc3ZnV2lkdGgsIGNlbnRlclkpO1xuICAgIHBhdGhDbWQgKz0gdGhpcy5fcGF0aENtZExpbmUoY2VudGVyWCwgMCwgY2VudGVyWCwgc3ZnSGVpZ2h0KTtcblxuICAgIHRoaXMuX2F4ZXMuc2V0QXR0cmlidXRlKCdkJywgcGF0aENtZCk7XG59O1xuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9kcmF3UGxvdCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgd2lkdGgsIGhlaWdodDtcblxuICAgIHZhciBjZW50ZXIgPSB0aGlzLl9jZW50ZXIsXG4gICAgICAgIGNlbnRlclggPSBjZW50ZXJbMF0sXG4gICAgICAgIGNlbnRlclkgPSBjZW50ZXJbMV07XG5cbiAgICB2YXIgdW5pdHMgPSB0aGlzLl91bml0cyxcbiAgICAgICAgdW5pdFgsIHVuaXRZO1xuXG4gICAgdmFyIHNjYWxlID0gdGhpcy5fc2NhbGU7XG4gICAgdmFyIG5vcm12YWwsIHNjYWxlZFZhbCwgdmFsdWUsIGluZGV4O1xuICAgIHZhciBvZmZzZXRYLCBvZmZzZXRZO1xuXG4gICAgdmFyIGk7XG5cbiAgICBpZiAodGhpcy5fcGxvdE1vZGUgPT0gRnVuY3Rpb25QbG90VHlwZS5OT05fSU1QTElDSVQpIHtcbiAgICAgICAgdmFyIHN2ZyA9IHRoaXMuX3N2ZztcblxuICAgICAgICB3aWR0aCA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKTtcbiAgICAgICAgaGVpZ2h0ID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ2hlaWdodCcpKTtcbiAgICAgICAgdW5pdFggPSB1bml0c1swXSAqIHNjYWxlO1xuICAgICAgICB1bml0WSA9IGhlaWdodCAvICh1bml0c1sxXSAqIHNjYWxlKTtcbiAgICAgICAgb2Zmc2V0WCA9IGNlbnRlclggLyB3aWR0aDtcblxuICAgICAgICB2YXIgbGVuID0gTWF0aC5mbG9vcih3aWR0aCksXG4gICAgICAgICAgICBwb2ludHMgPSBuZXcgQXJyYXkobGVuICogMik7XG5cbiAgICAgICAgaSA9IC0xO1xuICAgICAgICB3aGlsZSAoKytpIDwgbGVuKSB7XG4gICAgICAgICAgICBub3JtdmFsID0gKC1vZmZzZXRYICsgaSAvIGxlbik7XG4gICAgICAgICAgICBzY2FsZWRWYWwgPSBub3JtdmFsICogdW5pdFg7XG4gICAgICAgICAgICB2YWx1ZSA9IGNlbnRlclkgLSB0aGlzLl9mdW5jKHNjYWxlZFZhbCkgKiB1bml0WTtcblxuICAgICAgICAgICAgaW5kZXggPSBpICogMjtcblxuICAgICAgICAgICAgcG9pbnRzW2luZGV4XSA9IGk7XG4gICAgICAgICAgICBwb2ludHNbaW5kZXggKyAxXSA9IHZhbHVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHBhdGhDbWQgPSAnJztcbiAgICAgICAgcGF0aENtZCArPSB0aGlzLl9wYXRoQ21kTW92ZVRvKHBvaW50c1swXSwgcG9pbnRzWzFdKTtcblxuICAgICAgICBpID0gMjtcbiAgICAgICAgd2hpbGUgKGkgPCBwb2ludHMubGVuZ3RoKSB7XG4gICAgICAgICAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRMaW5lVG8ocG9pbnRzW2ldLCBwb2ludHNbaSArIDFdKTtcbiAgICAgICAgICAgIGkgKz0gMjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX3BhdGguc2V0QXR0cmlidXRlKCdkJywgcGF0aENtZCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzLFxuICAgICAgICAgICAgY29udGV4dCA9IHRoaXMuX2NhbnZhc0NvbnRleHQsXG4gICAgICAgICAgICBpbWdEYXRhID0gdGhpcy5fY2FudmFzSW1hZ2VEYXRhO1xuXG4gICAgICAgIHdpZHRoID0gY2FudmFzLndpZHRoO1xuICAgICAgICBoZWlnaHQgPSBjYW52YXMuaGVpZ2h0O1xuXG4gICAgICAgIHVuaXRYID0gdW5pdHNbMF0gKiBzY2FsZTtcbiAgICAgICAgdW5pdFkgPSB1bml0c1sxXSAqIHNjYWxlO1xuXG4gICAgICAgIG9mZnNldFggPSBjZW50ZXJYIC8gd2lkdGg7XG4gICAgICAgIG9mZnNldFkgPSBjZW50ZXJZIC8gaGVpZ2h0O1xuXG4gICAgICAgIHZhciBpbnZXaWR0aCA9IDEgLyB3aWR0aCxcbiAgICAgICAgICAgIGludkhlaWdodCA9IDEgLyBoZWlnaHQ7XG4gICAgICAgIHZhciByZ2IgPSBbMCwgMCwgMF07XG5cbiAgICAgICAgdmFyIGNvbDAgPSBbMzAsIDM0LCAzNl0sXG4gICAgICAgICAgICBjb2wxID0gWzI1NSwgMjU1LCAyNTVdO1xuXG4gICAgICAgIGkgPSAtMTtcbiAgICAgICAgdmFyIGo7XG4gICAgICAgIHdoaWxlICgrK2kgPCBoZWlnaHQpIHtcbiAgICAgICAgICAgIGogPSAtMTtcblxuICAgICAgICAgICAgd2hpbGUgKCsraiA8IHdpZHRoKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSB0aGlzLl9mdW5jKCgtb2Zmc2V0WCArIGogKiBpbnZXaWR0aCkgKiB1bml0WCxcbiAgICAgICAgICAgICAgICAgICAgKC1vZmZzZXRZICsgaSAqIGludkhlaWdodCkgKiB1bml0WSk7XG5cbiAgICAgICAgICAgICAgICByZ2JbMF0gPSBNYXRoLmZsb29yKChjb2wxWzBdIC0gY29sMFswXSkgKiB2YWx1ZSArIGNvbDBbMF0pO1xuICAgICAgICAgICAgICAgIHJnYlsxXSA9IE1hdGguZmxvb3IoKGNvbDFbMV0gLSBjb2wwWzFdKSAqIHZhbHVlICsgY29sMFsxXSk7XG4gICAgICAgICAgICAgICAgcmdiWzJdID0gTWF0aC5mbG9vcigoY29sMVsyXSAtIGNvbDBbMl0pICogdmFsdWUgKyBjb2wwWzJdKTtcblxuICAgICAgICAgICAgICAgIGluZGV4ID0gKGkgKiB3aWR0aCArIGopICogNDtcblxuICAgICAgICAgICAgICAgIGltZ0RhdGEuZGF0YVtpbmRleF0gPSByZ2JbMF07XG4gICAgICAgICAgICAgICAgaW1nRGF0YS5kYXRhW2luZGV4ICsgMV0gPSByZ2JbMV07XG4gICAgICAgICAgICAgICAgaW1nRGF0YS5kYXRhW2luZGV4ICsgMl0gPSByZ2JbMl07XG4gICAgICAgICAgICAgICAgaW1nRGF0YS5kYXRhW2luZGV4ICsgM10gPSAyNTU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb250ZXh0LmNsZWFyUmVjdCgwLCAwLCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgY29udGV4dC5wdXRJbWFnZURhdGEoaW1nRGF0YSwgMCwgMCk7XG4gICAgfVxufTtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fZHJhd0dyaWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHN2ZyA9IHRoaXMuX3N2ZyxcbiAgICAgICAgd2lkdGggPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnd2lkdGgnKSksXG4gICAgICAgIGhlaWdodCA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCdoZWlnaHQnKSk7XG5cbiAgICB2YXIgc2NhbGUgPSB0aGlzLl9zY2FsZTtcblxuICAgIHZhciBncmlkUmVzID0gdGhpcy5fdW5pdHMsXG4gICAgICAgIGdyaWRTcGFjaW5nWCA9IHdpZHRoIC8gKGdyaWRSZXNbMF0gKiBzY2FsZSksXG4gICAgICAgIGdyaWRTcGFjaW5nWSA9IGhlaWdodCAvIChncmlkUmVzWzFdICogc2NhbGUpO1xuXG4gICAgdmFyIGNlbnRlciA9IHRoaXMuX2NlbnRlcixcbiAgICAgICAgY2VudGVyWCA9IGNlbnRlclswXSxcbiAgICAgICAgY2VudGVyWSA9IGNlbnRlclsxXTtcblxuICAgIHZhciBncmlkTnVtVG9wID0gTWF0aC5yb3VuZChjZW50ZXJZIC8gZ3JpZFNwYWNpbmdZKSArIDEsXG4gICAgICAgIGdyaWROdW1Cb3R0b20gPSBNYXRoLnJvdW5kKChoZWlnaHQgLSBjZW50ZXJZKSAvIGdyaWRTcGFjaW5nWSkgKyAxLFxuICAgICAgICBncmlkTnVtTGVmdCA9IE1hdGgucm91bmQoY2VudGVyWCAvIGdyaWRTcGFjaW5nWCkgKyAxLFxuICAgICAgICBncmlkTnVtUmlnaHQgPSBNYXRoLnJvdW5kKCh3aWR0aCAtIGNlbnRlclgpIC8gZ3JpZFNwYWNpbmdYKSArIDE7XG5cbiAgICB2YXIgcGF0aENtZEdyaWQgPSAnJyxcbiAgICAgICAgcGF0aENtZEF4ZXNMYWJlbHMgPSAnJztcblxuICAgIHZhciBpLCB0ZW1wO1xuXG4gICAgdmFyIHN0cm9rZVNpemUgPSBNZXRyaWMuU1RST0tFX1NJWkU7XG5cbiAgICB2YXIgbGFiZWxUaWNrU2l6ZSA9IE1ldHJpYy5GVU5DVElPTl9QTE9UVEVSX0xBQkVMX1RJQ0tfU0laRSxcbiAgICAgICAgbGFiZWxUaWNrUGFkZGluZ1JpZ2h0ID0gd2lkdGggLSBsYWJlbFRpY2tTaXplIC0gc3Ryb2tlU2l6ZSxcbiAgICAgICAgbGFiZWxUaWNrUGFkZGluZ0JvdHRvbSA9IGhlaWdodCAtIGxhYmVsVGlja1NpemUgLSBzdHJva2VTaXplLFxuICAgICAgICBsYWJlbFRpY2tQYWRkaW5nUmlnaHRPZmZzZXQgPSBsYWJlbFRpY2tQYWRkaW5nUmlnaHQgLSBsYWJlbFRpY2tTaXplLFxuICAgICAgICBsYWJlbFRpY2tQYWRkaW5nQm90dG9tT2Zmc2V0ID0gbGFiZWxUaWNrUGFkZGluZ0JvdHRvbSAtIGxhYmVsVGlja1NpemUsXG4gICAgICAgIGxhYmVsVGlja09mZnNldFJpZ2h0ID0gbGFiZWxUaWNrUGFkZGluZ1JpZ2h0IC0gKGxhYmVsVGlja1NpemUgKyBzdHJva2VTaXplKSAqIDIsXG4gICAgICAgIGxhYmVsVGlja09mZnNldEJvdHRvbSA9IGxhYmVsVGlja1BhZGRpbmdCb3R0b20gLSAobGFiZWxUaWNrU2l6ZSArIHN0cm9rZVNpemUpICogMjtcblxuICAgIGkgPSAtMTtcbiAgICB3aGlsZSAoKytpIDwgZ3JpZE51bVRvcCkge1xuICAgICAgICB0ZW1wID0gTWF0aC5yb3VuZChjZW50ZXJZIC0gZ3JpZFNwYWNpbmdZICogaSk7XG4gICAgICAgIHBhdGhDbWRHcmlkICs9IHRoaXMuX3BhdGhDbWRMaW5lKDAsIHRlbXAsIHdpZHRoLCB0ZW1wKTtcblxuICAgICAgICBpZiAodGVtcCA+IGxhYmVsVGlja1NpemUpe1xuICAgICAgICAgICAgcGF0aENtZEF4ZXNMYWJlbHMgKz0gdGhpcy5fcGF0aENtZExpbmUobGFiZWxUaWNrUGFkZGluZ1JpZ2h0LCB0ZW1wLFxuICAgICAgICAgICAgICAgIGxhYmVsVGlja1BhZGRpbmdSaWdodE9mZnNldCwgdGVtcCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpID0gLTE7XG4gICAgd2hpbGUgKCsraSA8IGdyaWROdW1Cb3R0b20pIHtcbiAgICAgICAgdGVtcCA9IE1hdGgucm91bmQoY2VudGVyWSArIGdyaWRTcGFjaW5nWSAqIGkpO1xuICAgICAgICBwYXRoQ21kR3JpZCArPSB0aGlzLl9wYXRoQ21kTGluZSgwLCB0ZW1wLCB3aWR0aCwgdGVtcCk7XG5cbiAgICAgICAgaWYgKHRlbXAgPCBsYWJlbFRpY2tPZmZzZXRCb3R0b20pe1xuICAgICAgICAgICAgcGF0aENtZEF4ZXNMYWJlbHMgKz0gdGhpcy5fcGF0aENtZExpbmUobGFiZWxUaWNrUGFkZGluZ1JpZ2h0LCB0ZW1wLFxuICAgICAgICAgICAgICAgIGxhYmVsVGlja1BhZGRpbmdSaWdodE9mZnNldCwgdGVtcCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpID0gLTE7XG4gICAgd2hpbGUgKCsraSA8IGdyaWROdW1MZWZ0KSB7XG4gICAgICAgIHRlbXAgPSBNYXRoLnJvdW5kKGNlbnRlclggLSBncmlkU3BhY2luZ1ggKiBpKTtcbiAgICAgICAgcGF0aENtZEdyaWQgKz0gdGhpcy5fcGF0aENtZExpbmUodGVtcCwgMCwgdGVtcCwgaGVpZ2h0KTtcblxuICAgICAgICBpZiAodGVtcCA+IGxhYmVsVGlja1NpemUpe1xuICAgICAgICAgICAgcGF0aENtZEF4ZXNMYWJlbHMgKz0gdGhpcy5fcGF0aENtZExpbmUodGVtcCwgbGFiZWxUaWNrUGFkZGluZ0JvdHRvbSxcbiAgICAgICAgICAgICAgICB0ZW1wLCBsYWJlbFRpY2tQYWRkaW5nQm90dG9tT2Zmc2V0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGkgPSAtMTtcbiAgICB3aGlsZSAoKytpIDwgZ3JpZE51bVJpZ2h0KSB7XG4gICAgICAgIHRlbXAgPSBNYXRoLnJvdW5kKGNlbnRlclggKyBncmlkU3BhY2luZ1ggKiBpKTtcbiAgICAgICAgcGF0aENtZEdyaWQgKz0gdGhpcy5fcGF0aENtZExpbmUodGVtcCwgMCwgdGVtcCwgaGVpZ2h0KTtcblxuICAgICAgICBpZiAodGVtcCA8IGxhYmVsVGlja09mZnNldFJpZ2h0KXtcbiAgICAgICAgICAgIHBhdGhDbWRBeGVzTGFiZWxzICs9IHRoaXMuX3BhdGhDbWRMaW5lKHRlbXAsIGxhYmVsVGlja1BhZGRpbmdCb3R0b20sXG4gICAgICAgICAgICAgICAgdGVtcCwgbGFiZWxUaWNrUGFkZGluZ0JvdHRvbU9mZnNldCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLl9ncmlkLnNldEF0dHJpYnV0ZSgnZCcsIHBhdGhDbWRHcmlkKTtcbiAgICB0aGlzLl9heGVzTGFiZWxzLnNldEF0dHJpYnV0ZSgnZCcsIHBhdGhDbWRBeGVzTGFiZWxzKTtcbn07XG5cblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fc2xpZGVyWFN0ZXAgPSBmdW5jdGlvbiAobW91c2VQb3MpIHtcbiAgICB2YXIgbW91c2VYID0gbW91c2VQb3NbMF07XG5cbiAgICB2YXIgaGFuZGxlID0gdGhpcy5fc2xpZGVyWEhhbmRsZSxcbiAgICAgICAgaGFuZGxlV2lkdGggPSBoYW5kbGUuZ2V0V2lkdGgoKSxcbiAgICAgICAgaGFuZGxlV2lkdGhIYWxmID0gaGFuZGxlV2lkdGggKiAwLjU7XG5cbiAgICB2YXIgdHJhY2sgPSB0aGlzLl9zbGlkZXJYVHJhY2ssXG4gICAgICAgIHRyYWNrV2lkdGggPSB0cmFjay5nZXRXaWR0aCgpLFxuICAgICAgICB0cmFja0xlZnQgPSB0cmFjay5nZXRQb3NpdGlvbkdsb2JhbFgoKTtcblxuICAgIHZhciBzdHJva2VTaXplID0gTWV0cmljLlNUUk9LRV9TSVpFO1xuXG4gICAgdmFyIG1heCA9IHRyYWNrV2lkdGggLSBoYW5kbGVXaWR0aEhhbGYgLSBzdHJva2VTaXplICogMjtcblxuICAgIHZhciBwb3MgPSBNYXRoLm1heChoYW5kbGVXaWR0aEhhbGYsIE1hdGgubWluKG1vdXNlWCAtIHRyYWNrTGVmdCwgbWF4KSksXG4gICAgICAgIGhhbmRsZVBvcyA9IHBvcyAtIGhhbmRsZVdpZHRoSGFsZjtcblxuICAgIGhhbmRsZS5zZXRQb3NpdGlvblgoaGFuZGxlUG9zKTtcblxuICAgIHZhciB1bml0c01pbiA9IHRoaXMuX3VuaXRzTWluTWF4WzBdLFxuICAgICAgICB1bml0c01heCA9IHRoaXMuX3VuaXRzTWluTWF4WzFdO1xuXG4gICAgdmFyIG5vcm1WYWwgPSAocG9zIC0gaGFuZGxlV2lkdGhIYWxmKSAvIChtYXggLSBoYW5kbGVXaWR0aEhhbGYpLFxuICAgICAgICBtYXBwZWRWYWwgPSB1bml0c01pbiArICh1bml0c01heCAtIHVuaXRzTWluKSAqIG5vcm1WYWw7XG5cbiAgICB0aGlzLl91bml0c1swXSA9IG1hcHBlZFZhbDtcblxuICAgIHRoaXMuX3Bsb3RHcmFwaCgpO1xufTtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fc2xpZGVyWVN0ZXAgPSBmdW5jdGlvbiAobW91c2VQb3MpIHtcbiAgICB2YXIgbW91c2VZID0gbW91c2VQb3NbMV07XG5cbiAgICB2YXIgaGFuZGxlID0gdGhpcy5fc2xpZGVyWUhhbmRsZSxcbiAgICAgICAgaGFuZGxlSGVpZ2h0ID0gaGFuZGxlLmdldEhlaWdodCgpLFxuICAgICAgICBoYW5kbGVIZWlnaHRIYWxmID0gaGFuZGxlSGVpZ2h0ICogMC41O1xuXG4gICAgdmFyIHRyYWNrID0gdGhpcy5fc2xpZGVyWVRyYWNrLFxuICAgICAgICB0cmFja0hlaWdodCA9IHRyYWNrLmdldEhlaWdodCgpLFxuICAgICAgICB0cmFja1RvcCA9IHRyYWNrLmdldFBvc2l0aW9uR2xvYmFsWSgpO1xuXG4gICAgdmFyIG1heCA9IHRyYWNrSGVpZ2h0IC0gaGFuZGxlSGVpZ2h0SGFsZiAtIDI7XG5cbiAgICB2YXIgcG9zID0gTWF0aC5tYXgoaGFuZGxlSGVpZ2h0SGFsZiwgTWF0aC5taW4obW91c2VZIC0gdHJhY2tUb3AsIG1heCkpLFxuICAgICAgICBoYW5kbGVQb3MgPSBwb3MgLSBoYW5kbGVIZWlnaHRIYWxmO1xuXG4gICAgaGFuZGxlLnNldFBvc2l0aW9uWShoYW5kbGVQb3MpO1xuXG4gICAgdmFyIHVuaXRzTWF4ID0gdGhpcy5fdW5pdHNNaW5NYXhbMF0sXG4gICAgICAgIHVuaXRzTWluID0gdGhpcy5fdW5pdHNNaW5NYXhbMV07XG5cbiAgICB2YXIgbm9ybVZhbCA9IChwb3MgLSBoYW5kbGVIZWlnaHRIYWxmKSAvIChtYXggLSBoYW5kbGVIZWlnaHRIYWxmKSxcbiAgICAgICAgbWFwcGVkVmFsID0gdW5pdHNNaW4gKyAodW5pdHNNYXggLSB1bml0c01pbikgKiBub3JtVmFsO1xuXG4gICAgdGhpcy5fdW5pdHNbMV0gPSBtYXBwZWRWYWw7XG5cbiAgICB0aGlzLl9wbG90R3JhcGgoKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX29uU2xpZGVyWEhhbmRsZURvd24gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fb25TbGlkZXJIYW5kbGVEb3duKHRoaXMuX3NsaWRlclhTdGVwLmJpbmQodGhpcykpO1xufTtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fb25TbGlkZXJZSGFuZGxlRG93biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9vblNsaWRlckhhbmRsZURvd24odGhpcy5fc2xpZGVyWVN0ZXAuYmluZCh0aGlzKSk7XG59O1xuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9vblNsaWRlckhhbmRsZURvd24gPSBmdW5jdGlvbiAoc2xpZGVyU3RlcEZ1bmMpIHtcbiAgICB2YXIgZXZlbnRNb3VzZU1vdmUgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsXG4gICAgICAgIGV2ZW50TW91c2VVcCA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XG5cbiAgICB2YXIgbW91c2UgPSBNb3VzZS5nZXQoKTtcblxuICAgIHZhciBvbkRyYWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzbGlkZXJTdGVwRnVuYyhtb3VzZS5nZXRQb3NpdGlvbigpKVxuICAgICAgICB9LFxuICAgICAgICBvbkRyYWdFbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW91c2VNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcbiAgICAgICAgfTtcblxuICAgIHNsaWRlclN0ZXBGdW5jKG1vdXNlLmdldFBvc2l0aW9uKCkpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZU1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX3NsaWRlclhIYW5kbGVVcGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHVuaXRNaW4gPSB0aGlzLl91bml0c01pbk1heFswXSxcbiAgICAgICAgdW5pdE1heCA9IHRoaXMuX3VuaXRzTWluTWF4WzFdLFxuICAgICAgICB1bml0WCA9IHRoaXMuX3VuaXRzWzBdO1xuXG4gICAgdmFyIGhhbmRsZVggPSB0aGlzLl9zbGlkZXJYSGFuZGxlLFxuICAgICAgICBoYW5kbGVYV2lkdGggPSBoYW5kbGVYLmdldFdpZHRoKCksXG4gICAgICAgIGhhbmRsZVhXaWR0aEhhbGYgPSBoYW5kbGVYV2lkdGggKiAwLjUsXG4gICAgICAgIHRyYWNrWFdpZHRoID0gdGhpcy5fc2xpZGVyWFRyYWNrLmdldFdpZHRoKCk7XG5cbiAgICB2YXIgc3Ryb2tlU2l6ZSA9IE1ldHJpYy5TVFJPS0VfU0laRTtcblxuICAgIHZhciBoYW5kbGVYTWluID0gaGFuZGxlWFdpZHRoSGFsZixcbiAgICAgICAgaGFuZGxlWE1heCA9IHRyYWNrWFdpZHRoIC0gaGFuZGxlWFdpZHRoSGFsZiAtIHN0cm9rZVNpemUgKiAyO1xuXG4gICAgaGFuZGxlWC5zZXRQb3NpdGlvblgoKGhhbmRsZVhNaW4gKyAoaGFuZGxlWE1heCAtIGhhbmRsZVhNaW4pICogKCh1bml0WCAtIHVuaXRNaW4pIC8gKHVuaXRNYXggLSB1bml0TWluKSkpIC0gaGFuZGxlWFdpZHRoSGFsZik7XG59O1xuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9zbGlkZXJZSGFuZGxlVXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB1bml0TWluID0gdGhpcy5fdW5pdHNNaW5NYXhbMF0sXG4gICAgICAgIHVuaXRNYXggPSB0aGlzLl91bml0c01pbk1heFsxXSxcbiAgICAgICAgdW5pdFkgPSB0aGlzLl91bml0c1sxXTtcblxuICAgIHZhciBoYW5kbGVZID0gdGhpcy5fc2xpZGVyWUhhbmRsZSxcbiAgICAgICAgaGFuZGxlWUhlaWdodCA9IGhhbmRsZVkuZ2V0SGVpZ2h0KCksXG4gICAgICAgIGhhbmRsZVlIZWlnaHRIYWxmID0gaGFuZGxlWUhlaWdodCAqIDAuNSxcbiAgICAgICAgdHJhY2tZSGVpZ2h0ID0gdGhpcy5fc2xpZGVyWVRyYWNrLmdldEhlaWdodCgpO1xuXG4gICAgdmFyIHN0cm9rZVNpemUgPSBNZXRyaWMuU1RST0tFX1NJWkU7XG5cbiAgICB2YXIgaGFuZGxlWU1pbiA9IHRyYWNrWUhlaWdodCAtIGhhbmRsZVlIZWlnaHRIYWxmIC0gc3Ryb2tlU2l6ZSAqIDIsXG4gICAgICAgIGhhbmRsZVlNYXggPSBoYW5kbGVZSGVpZ2h0SGFsZjtcblxuICAgIGhhbmRsZVkuc2V0UG9zaXRpb25ZKChoYW5kbGVZTWluICsgKGhhbmRsZVlNYXggLSBoYW5kbGVZTWluKSAqICgodW5pdFkgLSB1bml0TWluKSAvICh1bml0TWF4IC0gdW5pdE1pbikpKSAtIGhhbmRsZVlIZWlnaHRIYWxmKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRnVuY3Rpb25QbG90dGVyOyIsImZ1bmN0aW9uIEZ1bmN0aW9uUGxvdHRlckZ1bmN0aW9uQXJnc0Vycm9yKCl7XG5cdEVycm9yLmFwcGx5KHRoaXMpO1xuXHRFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLEZ1bmN0aW9uUGxvdHRlckZ1bmN0aW9uQXJnc0Vycm9yKTtcblx0dGhpcy5uYW1lID0gJ0Z1bmN0aW9uUGxvdHRlckZ1bmN0aW9uQXJnc0Vycm9yJztcblx0dGhpcy5tZXNzYWdlID0gJ0Z1bmN0aW9uIHNob3VsZCBiZSBvZiBmb3JtIGYoeCkgb3IgZih4LHkpLic7XG59XG5GdW5jdGlvblBsb3R0ZXJGdW5jdGlvbkFyZ3NFcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVycm9yLnByb3RvdHlwZSk7XG5GdW5jdGlvblBsb3R0ZXJGdW5jdGlvbkFyZ3NFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBGdW5jdGlvblBsb3R0ZXJGdW5jdGlvbkFyZ3NFcnJvcjtcblxubW9kdWxlLmV4cG9ydHMgPSBGdW5jdGlvblBsb3R0ZXJGdW5jdGlvbkFyZ3NFcnJvcjsiLCJmdW5jdGlvbiBGdW5jdGlvblBsb3R0ZXJPYmplY3RFcnJvcihvYmplY3Qsa2V5KXtcblx0RXJyb3IuYXBwbHkodGhpcyk7XG5cdEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsRnVuY3Rpb25QbG90dGVyT2JqZWN0RXJyb3IpO1xuXHR0aGlzLm5hbWUgPSAnQ29tcG9uZW50T2JqZWN0RXJyb3InO1xuXHR0aGlzLm1lc3NhZ2UgPSAnT2JqZWN0ICcgKyBvYmplY3QuY29uc3RydWN0b3IubmFtZSArICcgJyArIGtleSArICdzaG91bGQgYmUgb2YgdHlwZSBGdW5jdGlvbi4nO1xufVxuRnVuY3Rpb25QbG90dGVyT2JqZWN0RXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFcnJvci5wcm90b3R5cGUpO1xuRnVuY3Rpb25QbG90dGVyT2JqZWN0RXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRnVuY3Rpb25QbG90dGVyT2JqZWN0RXJyb3I7XG5cbm1vZHVsZS5leHBvcnRzID0gRnVuY3Rpb25QbG90dGVyT2JqZWN0RXJyb3I7IiwidmFyIE1ldHJpYyA9IHtcblx0Q09NUE9ORU5UX01JTl9IRUlHSFQ6IDI1LFxuXHRTVFJPS0VfU0laRTogMSxcblx0UEFERElOR19XUkFQUEVSOiAxMixcblx0UEFERElOR19PUFRJT05TOiAyLFxuXHRQQURESU5HX1BSRVNFVDogMjAsXG5cblx0U0NST0xMQkFSX1RSQUNLX1BBRERJTkc6IDIsXG5cdEZVTkNUSU9OX1BMT1RURVJfTEFCRUxfVElDS19TSVpFOiA2XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1ldHJpYzsiLCJ2YXIgT2JqZWN0Q29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY29yZS9PYmplY3RDb21wb25lbnQnKTtcbnZhciBOdW1iZXJJbnB1dF9JbnRlcm5hbCA9IHJlcXVpcmUoJy4vTnVtYmVySW5wdXRfSW50ZXJuYWwnKTtcblxudmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcblxudmFyIE9wdGlvbnMgPSByZXF1aXJlKCcuL09wdGlvbnMnKTtcbnZhciBCdXR0b25QcmVzZXQgPSByZXF1aXJlKCcuL0J1dHRvblByZXNldCcpO1xudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyksXG4gICAgTWV0cmljID0gcmVxdWlyZSgnLi9NZXRyaWMnKTtcblxudmFyIEV2ZW50XyA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcbiAgICBEb2N1bWVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXG4gICAgTm9kZUV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKSxcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKTtcblxudmFyIERFRkFVTFRfSU5QVVRfRFAgICAgID0gMixcbiAgICBERUZBVUxUX0lOUFVUX1NURVAgICA9IDEsXG4gICAgREVGQVVMVF9JTlBVVF9QUkVTRVQgPSBudWxsO1xuXG5cblxuZnVuY3Rpb24gTnVtYmVySW5wdXQocGFyZW50LG9iamVjdCx2YWx1ZSxwYXJhbXMpIHtcbiAgICBPYmplY3RDb21wb25lbnQuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG4gICAgcGFyYW1zICAgICAgICAgID0gcGFyYW1zIHx8IHt9O1xuICAgIHBhcmFtcy5vbkJlZ2luICA9IHBhcmFtcy5vbkJlZ2luIHx8IG51bGw7XG4gICAgcGFyYW1zLm9uQ2hhbmdlID0gcGFyYW1zLm9uQ2hhbmdlIHx8IHRoaXMuX29uQ2hhbmdlO1xuICAgIHBhcmFtcy5vbkZpbmlzaCA9IHBhcmFtcy5vbkZpbmlzaCB8fCBudWxsO1xuICAgIHBhcmFtcy5vbkVycm9yICA9IHBhcmFtcy5vbkVycm9yIHx8IG51bGw7XG4gICAgcGFyYW1zLmRwICAgICAgID0gKHBhcmFtcy5kcCA9PT0gdW5kZWZpbmVkIHx8IHBhcmFtcy5kcCA9PSBudWxsKSA/IERFRkFVTFRfSU5QVVRfRFAgOiBwYXJhbXMuZHA7XG4gICAgcGFyYW1zLnN0ZXAgICAgID0gcGFyYW1zLnN0ZXAgICAgIHx8IERFRkFVTFRfSU5QVVRfU1RFUDtcbiAgICBwYXJhbXMucHJlc2V0cyAgPSBwYXJhbXMucHJlc2V0cyAgfHwgREVGQVVMVF9JTlBVVF9QUkVTRVQ7XG5cbiAgICB0aGlzLl9vbkJlZ2luICAgICA9IHBhcmFtcy5vbkJlZ2luO1xuICAgIHRoaXMuX29uQ2hhbmdlICAgID0gcGFyYW1zLm9uQ2hhbmdlO1xuICAgIHRoaXMuX3ByZXNldHNLZXkgID0gcGFyYW1zLnByZXNldHM7XG5cbiAgICB2YXIgaW5wdXQgPSB0aGlzLl9pbnB1dCA9IG5ldyBOdW1iZXJJbnB1dF9JbnRlcm5hbChwYXJhbXMuc3RlcCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMuZHAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLm9uQmVnaW4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fb25JbnB1dENoYW5nZS5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5vbkZpbmlzaCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMub25FcnJvcik7XG5cbiAgICB2YXIgd3JhcCA9IHRoaXMuX3dyYXBOb2RlO1xuXG4gICAgdmFyIHByZXNldHMgPSAgcGFyYW1zLnByZXNldHM7XG4gICAgaWYgKCFwcmVzZXRzKSB7XG4gICAgICAgIHdyYXAuYWRkQ2hpbGQoaW5wdXQuZ2V0Tm9kZSgpKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHZhciB3cmFwXyA9IG5ldyBOb2RlKCk7XG4gICAgICAgICAgICB3cmFwXy5zZXRTdHlsZUNsYXNzKENTUy5XcmFwSW5wdXRXUHJlc2V0KTtcblxuICAgICAgICB3cmFwLmFkZENoaWxkKHdyYXBfKTtcbiAgICAgICAgd3JhcF8uYWRkQ2hpbGQoaW5wdXQuZ2V0Tm9kZSgpKTtcblxuICAgICAgICB2YXIgb3B0aW9ucyAgID0gT3B0aW9ucy5nZXQoKTtcbiAgICAgICAgdmFyIHByZXNldEJ0biA9IHRoaXMuX2J0blByZXNldCA9IG5ldyBCdXR0b25QcmVzZXQodGhpcy5fd3JhcE5vZGUpO1xuXG4gICAgICAgIHZhciBvblByZXNldERlYWN0aXZhdGUgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgb3B0aW9ucy5jbGVhcigpO1xuICAgICAgICAgICAgcHJlc2V0QnRuLmRlYWN0aXZhdGUoKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBvblByZXNldEFjdGl2YXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgb3B0aW9ucy5idWlsZChwcmVzZXRzLCBpbnB1dC5nZXRWYWx1ZSgpLCBpbnB1dC5nZXROb2RlKCksXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBpbnB1dC5zZXRWYWx1ZShwcmVzZXRzW29wdGlvbnMuZ2V0U2VsZWN0ZWRJbmRleCgpXSk7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuYXBwbHlWYWx1ZSgpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25QcmVzZXREZWFjdGl2YXRlLCBNZXRyaWMuUEFERElOR19QUkVTRVQsXG4gICAgICAgICAgICAgICAgZmFsc2UpO1xuICAgICAgICB9O1xuICAgICAgICBwcmVzZXRCdG4uc2V0T25BY3RpdmUob25QcmVzZXRBY3RpdmF0ZSk7XG4gICAgICAgIHByZXNldEJ0bi5zZXRPbkRlYWN0aXZlKG9uUHJlc2V0RGVhY3RpdmF0ZSlcbiAgICB9XG5cbiAgICBpbnB1dC5nZXROb2RlKCkuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgICB0aGlzLl9vbklucHV0RHJhZ1N0YXJ0LmJpbmQodGhpcykpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihDb21wb25lbnRFdmVudC5JTlBVVF9TRUxFQ1RfRFJBRyx0aGlzLl9wYXJlbnQsJ29uQ29tcG9uZW50U2VsZWN0RHJhZycpO1xuXG4gICAgaW5wdXQuc2V0VmFsdWUodGhpcy5fb2JqW3RoaXMuX2tleV0pO1xufVxuTnVtYmVySW5wdXQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShPYmplY3RDb21wb25lbnQucHJvdG90eXBlKTtcbk51bWJlcklucHV0LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IE51bWJlcklucHV0O1xuXG5OdW1iZXJJbnB1dC5wcm90b3R5cGUuX29uSW5wdXRDaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5hcHBseVZhbHVlKCk7XG4gICAgdGhpcy5fb25DaGFuZ2UodGhpcy5fb2JqW3RoaXMuX2tleV0pO1xufTtcblxuTnVtYmVySW5wdXQucHJvdG90eXBlLmFwcGx5VmFsdWUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnB1c2hIaXN0b3J5U3RhdGUoKTtcbiAgICB0aGlzLl9vYmpbdGhpcy5fa2V5XSA9IHRoaXMuX2lucHV0LmdldFZhbHVlKCk7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcyxDb21wb25lbnRFdmVudC5WQUxVRV9VUERBVEVELG51bGwpKTtcbn07XG5cbk51bWJlcklucHV0LnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAoZS5kYXRhLm9yaWdpbiA9PSB0aGlzKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl9pbnB1dC5zZXRWYWx1ZSh0aGlzLl9vYmpbdGhpcy5fa2V5XSk7XG59O1xuXG4vL1ByZXZlbnQgY2hyb21lIHNlbGVjdCBkcmFnXG5OdW1iZXJJbnB1dC5wcm90b3R5cGUuX29uSW5wdXREcmFnU3RhcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGV2ZW50TW92ZSA9IERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSxcbiAgICAgICAgZXZlbnRVcCA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XG5cbiAgICB2YXIgZXZlbnQgPSBDb21wb25lbnRFdmVudC5JTlBVVF9TRUxFQ1RfRFJBRztcblxuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHZhciBvbkRyYWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBldmVudCwgbnVsbCkpO1xuICAgICAgICB9LFxuICAgICAgICBvbkRyYWdGaW5pc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBldmVudCwgbnVsbCkpO1xuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdmUsIG9uRHJhZ0ZpbmlzaCwgZmFsc2UpO1xuICAgICAgICB9O1xuXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgZXZlbnQsIG51bGwpKTtcblxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50VXAsIG9uRHJhZ0ZpbmlzaCwgZmFsc2UpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBOdW1iZXJJbnB1dDsiLCJ2YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudERpc3BhdGNoZXInKSxcbiAgICBOb2RlRXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpO1xudmFyIE5vZGUgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xuXG52YXIgUFJFU0VUX1NISUZUX01VTFRJUExJRVIgID0gMTA7XG52YXIgTlVNX1JFR0VYID0gL14tP1xcZCpcXC4/XFxkKiQvO1xuXG52YXIgc2V0Q2FyZXRQb3MgPSBudWxsLFxuICAgIHNlbGVjdEFsbCA9IG51bGw7XG5cbmZ1bmN0aW9uIGlucHV0U2V0VmFsdWUoaW5wdXQsdmFsdWUpe1xuICAgIGlucHV0LnNldFByb3BlcnR5KCd2YWx1ZScsdmFsdWUpO1xuICAgIGlucHV0LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdpbnB1dCcpKTtcbn1cblxuTnVtYmVySW5wdXRfSW50ZXJuYWwgPSBmdW5jdGlvbiAoc3RlcFZhbHVlLCBkcCwgb25CZWdpbiwgb25DaGFuZ2UsIG9uRmluaXNoLCBvbkVycm9yKSB7XG4gICAgRXZlbnREaXNwYXRjaGVyLmFwcGx5KHRoaXMsIG51bGwpO1xuXG4gICAgdGhpcy5fdmFsdWUgPSAwO1xuICAgIHRoaXMuX3ZhbHVlU3RlcCA9IHN0ZXBWYWx1ZTtcbiAgICB0aGlzLl92YWx1ZURwICAgPSBkcDtcblxuICAgIHRoaXMuX29uQmVnaW4gPSBvbkJlZ2luIHx8IGZ1bmN0aW9uICgpe307XG4gICAgdGhpcy5fb25DaGFuZ2UgPSBvbkNoYW5nZSB8fCBmdW5jdGlvbiAoKSB7fTtcbiAgICB0aGlzLl9vbkZpbmlzaCA9IG9uRmluaXNoIHx8IGZ1bmN0aW9uKCkge307XG4gICAgdGhpcy5fb25FcnJvciA9IG9uRXJyb3IgfHwgZnVuY3Rpb24oKSB7fTtcblxuICAgIHRoaXMuX2tleUNvZGUgPSBudWxsO1xuICAgIHRoaXMuX2NhcmV0T2Zmc2V0ID0gMDtcblxuICAgIHZhciBpbnB1dCA9IHRoaXMuX2lucHV0ID0gbmV3IE5vZGUoJ3RleHQnKTtcbiAgICAgICAgaW5wdXQuc2V0UHJvcGVydHkoJ3ZhbHVlJywgdGhpcy5fdmFsdWUpO1xuXG4gICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLHRoaXMuX29uSW5wdXQuYmluZCh0aGlzKSk7XG4gICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsdGhpcy5fb25LZXlkb3duLmJpbmQodGhpcykpO1xuXG4gICAgaWYoIXNldENhcmV0UG9zKXtcbiAgICAgICAgaWYoaW5wdXQuZ2V0RWxlbWVudCgpLnNldFNlbGVjdGlvblJhbmdlKXtcbiAgICAgICAgICAgIHNldENhcmV0UG9zID0gZnVuY3Rpb24oaW5wdXQscG9zKXtcbiAgICAgICAgICAgICAgICBpbnB1dC5nZXRFbGVtZW50KCkuc2V0U2VsZWN0aW9uUmFuZ2UocG9zLHBvcyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgc2VsZWN0QWxsID0gZnVuY3Rpb24oaW5wdXQpe1xuICAgICAgICAgICAgICAgIGlucHV0LmdldEVsZW1lbnQoKS5zZXRTZWxlY3Rpb25SYW5nZSgwLGlucHV0LmdldFByb3BlcnR5KCd2YWx1ZScpLmxlbmd0aCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2V0Q2FyZXRQb3MgPSBmdW5jdGlvbihpbnB1dCxwb3Mpe1xuICAgICAgICAgICAgICAgIHZhciByYW5nZSA9IGlucHV0LmdldEVsZW1lbnQoKS5jcmVhdGVUZXh0UmFuZ2UoKTtcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2UuY29sbGFwc2UodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHJhbmdlLm1vdmVFbmQoJ2NoYXJhY3RlcicscG9zKTtcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2UubW92ZVN0YXJ0KCdjaGFyYWN0ZXInLHBvcyk7XG4gICAgICAgICAgICAgICAgICAgIHJhbmdlLnNlbGVjdCgpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHNlbGVjdEFsbCA9IGZ1bmN0aW9uKGlucHV0KXtcbiAgICAgICAgICAgICAgICB2YXIgcmFuZ2UgPSBpbnB1dC5nZXRFbGVtZW50KCkuY3JlYXRlVGV4dFJhbmdlKCk7XG4gICAgICAgICAgICAgICAgICAgIHJhbmdlLmNvbGxhcHNlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICByYW5nZS5tb3ZlU3RhcnQoJ2NoYXJhY3RlcicsMCk7XG4gICAgICAgICAgICAgICAgICAgIHJhbmdlLm1vdmVFbmQoJ2NoYXJhY3RlcicsaW5wdXQuZ2V0UHJvcGVydHkoJ3ZhbHVlJykubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2Uuc2VsZWN0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuTnVtYmVySW5wdXRfSW50ZXJuYWwucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudERpc3BhdGNoZXIucHJvdG90eXBlKTtcbk51bWJlcklucHV0X0ludGVybmFsLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IE51bWJlcklucHV0X0ludGVybmFsO1xuXG5OdW1iZXJJbnB1dF9JbnRlcm5hbC5wcm90b3R5cGUuX3NldFZhbHVlID0gZnVuY3Rpb24odmFsdWUpe1xuICAgIHZhciBwcmVmaXggPSAgKCh2YWx1ZSA9ICt2YWx1ZSkgfHwgMSAvIHZhbHVlKSA8IDAgJiYgdmFsdWUgPT0gMCA/ICctJyA6ICcnOyAvLy0wXG4gICAgICAgIHZhbHVlID0gTnVtYmVyKHZhbHVlKS50b0ZpeGVkKHRoaXMuX3ZhbHVlRHApO1xuICAgIHRoaXMuX2lucHV0LnNldFByb3BlcnR5KCd2YWx1ZScscHJlZml4ICsgdmFsdWUpO1xuICAgIHRoaXMuX3ZhbHVlID0gTnVtYmVyKHZhbHVlKTtcbn07XG5cbk51bWJlcklucHV0X0ludGVybmFsLnByb3RvdHlwZS5fb25JbnB1dCA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGlucHV0ID0gdGhpcy5faW5wdXQsXG4gICAgICAgIHZhbHVlID0gaW5wdXQuZ2V0UHJvcGVydHkoJ3ZhbHVlJyksXG4gICAgICAgIHN0YXJ0ID0gaW5wdXQuZ2V0UHJvcGVydHkoJ3NlbGVjdGlvblN0YXJ0JyksXG4gICAgICAgIGRwICAgID0gdGhpcy5fdmFsdWVEcDtcblxuICAgIHZhciBmaXJzdCA9IHZhbHVlWzBdO1xuXG4gICAgaWYodmFsdWUgPT0gJycpe1xuICAgICAgICB2YWx1ZSA9IDA7XG4gICAgfSBlbHNlIGlmKGZpcnN0ID09PSAnLicpe1xuICAgICAgICB2YWx1ZSA9ICcwJyArIHZhbHVlO1xuICAgIH1cblxuICAgIGlmKCFOVU1fUkVHRVgudGVzdCh2YWx1ZSkgfHwgdmFsdWUgPT0gJy0nKXtcbiAgICAgICAgaW5wdXQuc2V0UHJvcGVydHkoJ3ZhbHVlJyx0aGlzLl92YWx1ZS50b0ZpeGVkKGRwKSk7XG4gICAgICAgIHNldENhcmV0UG9zKGlucHV0LE1hdGgubWF4KC0tc3RhcnQsMCkpO1xuICAgICAgICB0aGlzLl9vbkVycm9yKHRoaXMuX2tleUNvZGUpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX29uQmVnaW4odGhpcy5fdmFsdWUpO1xuICAgIHRoaXMuX3NldFZhbHVlKHZhbHVlKTtcbiAgICBzZXRDYXJldFBvcyhpbnB1dCxzdGFydCAtIHRoaXMuX2NhcmV0T2Zmc2V0KTtcbiAgICB0aGlzLl9vbkNoYW5nZSgpO1xufTtcblxuTnVtYmVySW5wdXRfSW50ZXJuYWwucHJvdG90eXBlLl9vbktleWRvd24gPSBmdW5jdGlvbihlKXtcbiAgICB2YXIga2V5Q29kZSA9IHRoaXMuX2tleUNvZGUgPSBlLmtleUNvZGU7XG5cbiAgICBpZihrZXlDb2RlID09IDEzKXtcbiAgICAgICAgdGhpcy5fb25GaW5pc2goKTtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGlucHV0ICA9IHRoaXMuX2lucHV0LFxuICAgICAgICB2YWx1ZSAgPSBpbnB1dC5nZXRQcm9wZXJ0eSgndmFsdWUnKTtcbiAgICB2YXIgc3RhcnQgID0gaW5wdXQuZ2V0UHJvcGVydHkoJ3NlbGVjdGlvblN0YXJ0JyksXG4gICAgICAgIGVuZCAgICA9IGlucHV0LmdldFByb3BlcnR5KCdzZWxlY3Rpb25FbmQnKTtcbiAgICB2YXIgbGVuZ3RoID0gdmFsdWUubGVuZ3RoO1xuXG4gICAgdmFyIGlzQmFja3NwYWNlRGVsZXRlID0ga2V5Q29kZSA9PSA4IHx8IGtleUNvZGUgPT0gNDUsXG4gICAgICAgIGlzTWV0YUtleSA9IGUubWV0YUtleSxcbiAgICAgICAgaXNDdHJsS2V5ID0gZS5jdHJsS2V5LFxuICAgICAgICBpc0xlZnQgPSBrZXlDb2RlID09IDM3LFxuICAgICAgICBpc1JpZ2h0ID0ga2V5Q29kZSA9PSAzOSxcbiAgICAgICAgaXNMZWZ0UmlnaHQgPSBpc0xlZnQgfHwgaXNSaWdodCxcbiAgICAgICAgaXNTaGlmdCA9IGUuc2hpZnRLZXksXG4gICAgICAgIGlzVXBEb3duID0ga2V5Q29kZSA9PSAzOCB8fCBrZXlDb2RlID09IDQwLFxuICAgICAgICBpc1NlbGVjdEFsbCA9IChpc01ldGFLZXkgfHwgaXNDdHJsS2V5KSAmJiBrZXlDb2RlID09IDY1LFxuICAgICAgICBpc1JhbmdlU2VsZWN0ZWQgPSBzdGFydCAhPSBlbmQsXG4gICAgICAgIGlzQWxsU2VsZWN0ZWQgPSBzdGFydCA9PSAwICYmIGVuZCA9PSBsZW5ndGgsXG4gICAgICAgIGlzTWludXMgPSBrZXlDb2RlID09IDE4OTtcblxuICAgIHZhciBpbmRleERlY2ltYWxNYXJrID0gdmFsdWUuaW5kZXhPZignLicpO1xuXG4gICAgdGhpcy5fY2FyZXRPZmZzZXQgPSAwO1xuXG4gICAgLy9wcmV2ZW50IGNtZC16IHx8IGN0cmwtelxuICAgIGlmKChpc01ldGFLZXkgfHwgaXNDdHJsS2V5KSAmJiBrZXlDb2RlID09IDkwKXtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vc2VsZWN0IGFsbCBjbWQrYSB8fCBjdHJsK2FcbiAgICBpZihpc1NlbGVjdEFsbCl7XG4gICAgICAgIHNlbGVjdEFsbChpbnB1dCk7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvL2V2ZXJ5dGhpbmcgaXMgc2VsZWN0ZWRcbiAgICBpZihpc0FsbFNlbGVjdGVkKSB7XG4gICAgICAgIGlmIChpc01pbnVzKSB7XG4gICAgICAgICAgICAvL3NldCBuZWdhdGl2ZSB6ZXJvLCBhcyBzdGFydGluZyBwb2ludCBmb3IgbmVnYXRpdmUgbnVtYmVyXG4gICAgICAgICAgICBpbnB1dFNldFZhbHVlKGlucHV0LCAnLTAnKTtcbiAgICAgICAgICAgIC8vc2V0IGNhcmV0IGFmdGVyICAnLSdcbiAgICAgICAgICAgIHNldENhcmV0UG9zKGlucHV0LCAxKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vZGVsZXRlIG51bWJlciAvIHJlcGxhY2UgLyBpZ25vcmVcbiAgICAgICAgICAgIGlucHV0U2V0VmFsdWUoaW5wdXQsIGlzQmFja3NwYWNlRGVsZXRlID8gMCA6IFN0cmluZy5mcm9tQ2hhckNvZGUoa2V5Q29kZSkpO1xuICAgICAgICAgICAgLy9qdW1wIHRvIHN0YXJ0IDwtLT4gZW5kXG4gICAgICAgICAgICBzZXRDYXJldFBvcyhpbnB1dCwgaXNMZWZ0ID8gc3RhcnQgOiBlbmQpO1xuICAgICAgICB9XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvL2p1bXAgb3ZlciBkZWNpbWFsIG1hcmtcbiAgICBpZihpc0JhY2tzcGFjZURlbGV0ZSAmJiAoc3RhcnQtMSA9PSBpbmRleERlY2ltYWxNYXJrKSl7XG4gICAgICAgIHNldENhcmV0UG9zKGlucHV0LHN0YXJ0LTEpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIDB8LiBlbnRlciBmaXJzdCBkcCB3aXRob3V0IGp1bXBpbmcgb3ZlciBkZWNpbWFsIG1hcmtcbiAgICBpZighaXNMZWZ0UmlnaHQgJiYgKHZhbHVlWzBdID09ICcwJyAmJiBzdGFydCA9PSAxKSl7XG4gICAgICAgIHNldENhcmV0UG9zKGlucHV0LDEpO1xuICAgICAgICB0aGlzLl9jYXJldE9mZnNldCA9IDE7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy9pbmNyZWFzZSAvIGRlY3JlYXNlIG51bWJlciBieSAoc3RlcCB1cCAvIGRvd24pICogbXVsdGlwbGllciBvbiBzaGlmdCBkb3duXG4gICAgaWYoaXNVcERvd24pe1xuICAgICAgICB2YXIgc3RlcCA9IChpc1NoaWZ0ID8gUFJFU0VUX1NISUZUX01VTFRJUExJRVIgOiAxKSAqIHRoaXMuX3ZhbHVlU3RlcCxcbiAgICAgICAgICAgIG11bHQgPSBrZXlDb2RlID09IDM4ID8gMS4wIDogLTEuMDtcbiAgICAgICAgaW5wdXRTZXRWYWx1ZShpbnB1dCxOdW1iZXIodmFsdWUpICsgKHN0ZXAgKiBtdWx0KSk7XG4gICAgICAgIHNldENhcmV0UG9zKGlucHV0LHN0YXJ0KTtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vcmFuZ2Ugc2VsZWN0ZWQsIG5vdCBpbiBzZWxlY3Rpb24gcHJvY2Vzc1xuICAgIGlmKGlzUmFuZ2VTZWxlY3RlZCAmJiAhKGlzU2hpZnQgJiYgaXNMZWZ0UmlnaHQpKXtcbiAgICAgICAgLy9qdW1wIHRvIHN0YXJ0IDwtLT4gZW5kXG4gICAgICAgIGlmKGlzTGVmdFJpZ2h0KXtcbiAgICAgICAgICAgIHNldENhcmV0UG9zKGlucHV0LGlzTGVmdCA/IHN0YXJ0IDogZW5kKTtcbiAgICAgICAgfSBlbHNlIHsgLy9yZXBsYWNlIGNvbXBsZXRlIHJhbmdlLCBub3QganVzdCBwYXJ0c1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS5zdWJzdHIoMCxzdGFydCkgKyBTdHJpbmcuZnJvbUNoYXJDb2RlKGtleUNvZGUpICsgdmFsdWUuc3Vic3RyKGVuZCxsZW5ndGgtZW5kKTtcbiAgICAgICAgICAgIGlucHV0U2V0VmFsdWUoaW5wdXQsdmFsdWUpO1xuICAgICAgICAgICAgc2V0Q2FyZXRQb3MoaW5wdXQsZW5kKTtcbiAgICAgICAgfVxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy9jYXJldCB3aXRoaW4gZnJhY3Rpb25hbCBwYXJ0LCBub3QgbW92aW5nIGNhcmV0LCBzZWxlY3RpbmcsIGRlbGV0aW5nXG4gICAgaWYoIWlzU2hpZnQgJiYgIWlzTGVmdFJpZ2h0ICYmICFpc0JhY2tzcGFjZURlbGV0ZSAmJiAoc3RhcnQgPiBpbmRleERlY2ltYWxNYXJrICYmIHN0YXJ0IDwgbGVuZ3RoKSl7XG4gICAgICAgIHZhbHVlID0gdmFsdWUuc3Vic3RyKDAsc3RhcnQpICsgU3RyaW5nLmZyb21DaGFyQ29kZShrZXlDb2RlKSArIHZhbHVlLnN1YnN0cihzdGFydCsxLGxlbmd0aC0xKTtcbiAgICAgICAgaW5wdXRTZXRWYWx1ZShpbnB1dCx2YWx1ZSk7XG4gICAgICAgIHNldENhcmV0UG9zKGlucHV0LE1hdGgubWluKHN0YXJ0KzEsbGVuZ3RoLTEpKTtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vY2FyZXQgYXQgZW5kIG9mIG51bWJlciwgZG8gbm90aGluZ1xuICAgIGlmKCFpc0JhY2tzcGFjZURlbGV0ZSAmJiAhaXNMZWZ0UmlnaHQgJiYgIWlzVXBEb3duICYmIHN0YXJ0ID49IGxlbmd0aCl7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG59O1xuXG5OdW1iZXJJbnB1dF9JbnRlcm5hbC5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3ZhbHVlO1xufTtcblxuTnVtYmVySW5wdXRfSW50ZXJuYWwucHJvdG90eXBlLnNldFZhbHVlID0gZnVuY3Rpb24gKG4pIHtcbiAgICB0aGlzLl9zZXRWYWx1ZShuKTtcbn07XG5cbk51bWJlcklucHV0X0ludGVybmFsLnByb3RvdHlwZS5nZXROb2RlID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9pbnB1dDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTnVtYmVySW5wdXRfSW50ZXJuYWw7XG4iLCJ2YXIgT3V0cHV0ID0gcmVxdWlyZSgnLi9PdXRwdXQnKTtcblxudmFyIERFRkFVTFRfT1VUUFVUX0RQID0gMjtcblxuZnVuY3Rpb24gTnVtYmVyT3V0cHV0KHBhcmVudCwgb2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG5cdHBhcmFtcyA9IHBhcmFtcyB8fCB7fTtcblx0cGFyYW1zLmRwID0gcGFyYW1zLmRwIHx8IERFRkFVTFRfT1VUUFVUX0RQO1xuXG5cdE91dHB1dC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXHR0aGlzLl92YWx1ZURwID0gcGFyYW1zLmRwICsgMTtcbn1cbk51bWJlck91dHB1dC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE91dHB1dC5wcm90b3R5cGUpO1xuTnVtYmVyT3V0cHV0LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IE51bWJlck91dHB1dDtcblxuLy9GSVhNRVxuTnVtYmVyT3V0cHV0LnByb3RvdHlwZS5fc2V0VmFsdWUgPSBmdW5jdGlvbiAoKSB7XG5cdGlmICh0aGlzLl9wYXJlbnQuaXNEaXNhYmxlZCgpKXtcblx0XHRyZXR1cm47XG5cdH1cblxuXHR2YXIgdmFsdWUgPSB0aGlzLl9vYmpbdGhpcy5fa2V5XSxcblx0XHR0ZXh0QXJlYSA9IHRoaXMuX3RleHRBcmVhLFxuXHRcdGRwID0gdGhpcy5fdmFsdWVEcDtcblxuXHR2YXIgaW5kZXgsXG5cdFx0b3V0O1xuXG5cdGlmICh0eXBlb2YodmFsdWUpID09PSAnb2JqZWN0JyAmJlxuXHRcdHR5cGVvZih2YWx1ZS5sZW5ndGgpID09PSAnbnVtYmVyJyAmJlxuXHRcdHR5cGVvZih2YWx1ZS5zcGxpY2UpID09PSAnZnVuY3Rpb24nICYmXG5cdFx0IXZhbHVlLnByb3BlcnR5SXNFbnVtZXJhYmxlKCdsZW5ndGgnKSkge1xuXG5cdFx0b3V0ID0gdmFsdWUuc2xpY2UoKTtcblxuXHRcdHZhciBpID0gLTE7XG5cdFx0dmFyIHRlbXA7XG5cdFx0dmFyIHdyYXAgPSB0aGlzLl93cmFwO1xuXG5cdFx0d2hpbGUgKCsraSA8IG91dC5sZW5ndGgpIHtcblx0XHRcdHRlbXAgPSBvdXRbaV0gPSBvdXRbaV0udG9TdHJpbmcoKTtcblx0XHRcdGluZGV4ID0gdGVtcC5pbmRleE9mKCcuJyk7XG5cdFx0XHRpZiAoaW5kZXggPiAwKXtcblx0XHRcdFx0b3V0W2ldID0gdGVtcC5zbGljZSgwLCBpbmRleCArIGRwKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAod3JhcCkge1xuXHRcdFx0dGV4dEFyZWEuc2V0U3R5bGVQcm9wZXJ0eSgnd2hpdGUtc3BhY2UnLCAnbm93cmFwJyk7XG5cdFx0XHRvdXQgPSBvdXQuam9pbignXFxuJyk7XG5cdFx0fVxuXG5cdFx0dGV4dEFyZWEuc2V0UHJvcGVydHkoJ3ZhbHVlJywgb3V0KTtcblx0fWVsc2Uge1xuXHRcdG91dCA9IHZhbHVlLnRvU3RyaW5nKCk7XG5cdFx0aW5kZXggPSBvdXQuaW5kZXhPZignLicpO1xuXHRcdHRleHRBcmVhLnNldFByb3BlcnR5KCd2YWx1ZScsIGluZGV4ID4gMCA/IG91dC5zbGljZSgwLCBpbmRleCArIGRwKSA6IG91dCk7XG5cdH1cblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBOdW1iZXJPdXRwdXQ7IiwidmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcbnZhciBEb2N1bWVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXG4gICAgTm9kZUV2ZW50ICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50Jyk7XG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcbnZhciBDb2xvck1vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2NvbG9yL0NvbG9yTW9kZScpO1xudmFyIENvbG9yVXRpbCA9IHJlcXVpcmUoJy4uL2NvcmUvY29sb3IvQ29sb3JVdGlsJyk7XG52YXIgTWV0cmljID0gcmVxdWlyZSgnLi9NZXRyaWMnKTtcblxuZnVuY3Rpb24gT3B0aW9ucyhwYXJlbnROb2RlKSB7XG4gICAgdGhpcy5fcGFyZW5Ob2RlID0gcGFyZW50Tm9kZTtcblxuICAgIHZhciBub2RlID0gdGhpcy5fbm9kZSA9IG5ldyBOb2RlKCk7XG4gICAgdmFyIGxpc3ROb2RlID0gdGhpcy5fbGlzdE5vZGUgPSBuZXcgTm9kZShOb2RlLkxJU1QpO1xuXG4gICAgbm9kZS5zZXRTdHlsZUNsYXNzKENTUy5PcHRpb25zKTtcbiAgICBub2RlLmFkZENoaWxkKGxpc3ROb2RlKTtcblxuICAgIHRoaXMuX3NlbGVjdGVkSW5kZXggPSBudWxsO1xuICAgIHRoaXMuX2NhbGxiYWNrT3V0ID0gZnVuY3Rpb24gKCkgeyB9O1xuXG4gICAgdGhpcy5fdW5mb2N1c2FibGUgPSBmYWxzZTtcblxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9ET1dOLCB0aGlzLl9vbkRvY3VtZW50TW91c2VEb3duLmJpbmQodGhpcykpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9VUCwgdGhpcy5fb25Eb2N1bWVudE1vdXNlVXAuYmluZCh0aGlzKSk7XG5cbiAgICB0aGlzLmNsZWFyKCk7XG59XG5cbk9wdGlvbnMucHJvdG90eXBlID0ge1xuICAgIF9vbkRvY3VtZW50TW91c2VEb3duOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghdGhpcy5fdW5mb2N1c2FibGUpcmV0dXJuO1xuICAgICAgICB0aGlzLl9jYWxsYmFja091dCgpO1xuICAgIH0sXG5cbiAgICBfb25Eb2N1bWVudE1vdXNlVXA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fdW5mb2N1c2FibGUgPSB0cnVlO1xuICAgIH0sXG5cbiAgICBidWlsZDogZnVuY3Rpb24gKGVudHJpZXMsIHNlbGVjdGVkLCBlbGVtZW50LCBjYWxsYmFja1NlbGVjdCwgY2FsbGJhY2tPdXQsIHBhZGRpbmdSaWdodCwgYXJlQ29sb3JzLCBjb2xvck1vZGUpIHtcbiAgICAgICAgdGhpcy5fY2xlYXJMaXN0KCk7XG5cbiAgICAgICAgdGhpcy5fcGFyZW5Ob2RlLmFkZENoaWxkKHRoaXMuZ2V0Tm9kZSgpKTtcblxuICAgICAgICB2YXIgcm9vdE5vZGUgPSB0aGlzLl9ub2RlLFxuICAgICAgICAgICAgbGlzdE5vZGUgPSB0aGlzLl9saXN0Tm9kZTtcblxuICAgICAgICBwYWRkaW5nUmlnaHQgPSBwYWRkaW5nUmlnaHQgfHwgMDtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgLy8gYnVpbGQgbGlzdFxuICAgICAgICB2YXIgaXRlbU5vZGUsIGVudHJ5O1xuICAgICAgICB2YXIgaSA9IC0xO1xuXG4gICAgICAgIGlmIChhcmVDb2xvcnMpIHtcbiAgICAgICAgICAgIGNvbG9yTW9kZSA9IGNvbG9yTW9kZSB8fCBDb2xvck1vZGUuSEVYO1xuXG4gICAgICAgICAgICBsaXN0Tm9kZS5zZXRTdHlsZUNsYXNzKENTUy5Db2xvcik7XG5cbiAgICAgICAgICAgIHZhciBjb2xvciwgbm9kZUNvbG9yO1xuXG4gICAgICAgICAgICB3aGlsZSAoKytpIDwgZW50cmllcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBlbnRyeSA9IGVudHJpZXNbaV07XG4gICAgICAgICAgICAgICAgaXRlbU5vZGUgPSBsaXN0Tm9kZS5hZGRDaGlsZChuZXcgTm9kZShOb2RlLkxJU1RfSVRFTSkpO1xuICAgICAgICAgICAgICAgIGNvbG9yID0gaXRlbU5vZGUuYWRkQ2hpbGQobmV3IE5vZGUoKSk7XG5cbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGNvbG9yTW9kZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIENvbG9yTW9kZS5IRVg6XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlQ29sb3IgPSBlbnRyeTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIENvbG9yTW9kZS5SR0I6XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlQ29sb3IgPSBDb2xvclV0aWwuUkdCMkhFWChlbnRyeVswXSwgZW50cnlbMV0sIGVudHJ5WzJdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIENvbG9yTW9kZS5SR0JmdjpcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVDb2xvciA9IENvbG9yVXRpbC5SR0JmdjJIRVgoZW50cnlbMF0sIGVudHJ5WzFdLCBlbnRyeVsyXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBDb2xvck1vZGUuSFNWOlxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZUNvbG9yID0gQ29sb3JVdGlsLkhTVjJSR0IoZW50cnlbMF0sIGVudHJ5WzFdLCBlbnRyeVsyXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb2xvci5nZXRTdHlsZSgpLmJhY2tncm91bmRDb2xvciA9IG5vZGVDb2xvcjtcbiAgICAgICAgICAgICAgICBjb2xvci5nZXRTdHlsZSgpLmJhY2tncm91bmRJbWFnZSA9ICdsaW5lYXItZ3JhZGllbnQoIHJnYmEoMCwwLDAsMCkgMCUsIHJnYmEoMCwwLDAsMC4xKSAxMDAlKSc7XG4gICAgICAgICAgICAgICAgY29sb3Iuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsIGVudHJ5KTtcblxuICAgICAgICAgICAgICAgIGlmIChlbnRyeSA9PSBzZWxlY3RlZClpdGVtTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5PcHRpb25zU2VsZWN0ZWQpO1xuXG4gICAgICAgICAgICAgICAgaXRlbU5vZGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTixcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fc2VsZWN0ZWRJbmRleCA9IEFycmF5LnByb3RvdHlwZS5pbmRleE9mLmNhbGwodGhpcy5wYXJlbnROb2RlLmNoaWxkcmVuLCB0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrU2VsZWN0KCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBsaXN0Tm9kZS5kZWxldGVTdHlsZUNsYXNzKCk7XG5cbiAgICAgICAgICAgIHdoaWxlICgrK2kgPCBlbnRyaWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGVudHJ5ID0gZW50cmllc1tpXTtcblxuICAgICAgICAgICAgICAgIGl0ZW1Ob2RlID0gbGlzdE5vZGUuYWRkQ2hpbGQobmV3IE5vZGUoTm9kZS5MSVNUX0lURU0pKTtcbiAgICAgICAgICAgICAgICBpdGVtTm9kZS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywgZW50cnkpO1xuICAgICAgICAgICAgICAgIGlmIChlbnRyeSA9PSBzZWxlY3RlZClpdGVtTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5PcHRpb25zU2VsZWN0ZWQpO1xuXG4gICAgICAgICAgICAgICAgaXRlbU5vZGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTixcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fc2VsZWN0ZWRJbmRleCA9IEFycmF5LnByb3RvdHlwZS5pbmRleE9mLmNhbGwodGhpcy5wYXJlbnROb2RlLmNoaWxkcmVuLCB0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrU2VsZWN0KCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy9wb3NpdGlvbiwgc2V0IHdpZHRoIGFuZCBlbmFibGVcblxuICAgICAgICB2YXIgZWxlbWVudFBvcyA9IGVsZW1lbnQuZ2V0UG9zaXRpb25HbG9iYWwoKSxcbiAgICAgICAgICAgIGVsZW1lbnRXaWR0aCA9IGVsZW1lbnQuZ2V0V2lkdGgoKSAtIHBhZGRpbmdSaWdodCxcbiAgICAgICAgICAgIGVsZW1lbnRIZWlnaHQgPSBlbGVtZW50LmdldEhlaWdodCgpO1xuXG4gICAgICAgIHZhciBsaXN0V2lkdGggPSBsaXN0Tm9kZS5nZXRXaWR0aCgpLFxuICAgICAgICAgICAgbGlzdEhlaWdodCA9IGxpc3ROb2RlLmdldEhlaWdodCgpLFxuICAgICAgICAgICAgc3Ryb2tlT2Zmc2V0ID0gTWV0cmljLlNUUk9LRV9TSVpFICogMjtcblxuICAgICAgICB2YXIgcGFkZGluZ09wdGlvbnMgPSBNZXRyaWMuUEFERElOR19PUFRJT05TO1xuXG4gICAgICAgIHZhciB3aWR0aCA9IChsaXN0V2lkdGggPCBlbGVtZW50V2lkdGggPyBlbGVtZW50V2lkdGggOiBsaXN0V2lkdGgpIC0gc3Ryb2tlT2Zmc2V0LFxuICAgICAgICAgICAgcG9zWCA9IGVsZW1lbnRQb3NbMF0sXG4gICAgICAgICAgICBwb3NZID0gZWxlbWVudFBvc1sxXSArIGVsZW1lbnRIZWlnaHQgLSBwYWRkaW5nT3B0aW9ucztcblxuICAgICAgICB2YXIgd2luZG93V2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aCxcbiAgICAgICAgICAgIHdpbmRvd0hlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcblxuICAgICAgICB2YXIgcm9vdFBvc1ggPSAocG9zWCArIHdpZHRoKSA+IHdpbmRvd1dpZHRoID8gKHBvc1ggLSB3aWR0aCArIGVsZW1lbnRXaWR0aCAtIHN0cm9rZU9mZnNldCkgOiBwb3NYLFxuICAgICAgICAgICAgcm9vdFBvc1kgPSAocG9zWSArIGxpc3RIZWlnaHQpID4gd2luZG93SGVpZ2h0ID8gKHBvc1kgLSBsaXN0SGVpZ2h0ICogMC41IC0gZWxlbWVudEhlaWdodCAqIDAuNSkgOiBwb3NZO1xuXG4gICAgICAgIGxpc3ROb2RlLnNldFdpZHRoKHdpZHRoKTtcbiAgICAgICAgcm9vdE5vZGUuc2V0UG9zaXRpb25HbG9iYWwocm9vdFBvc1gsIHJvb3RQb3NZKTtcblxuICAgICAgICB0aGlzLl9jYWxsYmFja091dCA9IGNhbGxiYWNrT3V0O1xuICAgICAgICB0aGlzLl91bmZvY3VzYWJsZSA9IGZhbHNlO1xuICAgIH0sXG5cbiAgICBfY2xlYXJMaXN0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2xpc3ROb2RlLnJlbW92ZUFsbENoaWxkcmVuKCk7XG4gICAgICAgIHRoaXMuX2xpc3ROb2RlLmRlbGV0ZVN0eWxlUHJvcGVydHkoJ3dpZHRoJyk7XG4gICAgICAgIHRoaXMuX3NlbGVjdGVkSW5kZXggPSBudWxsO1xuICAgICAgICB0aGlzLl9idWlsZCA9IGZhbHNlO1xuICAgIH0sXG5cbiAgICBjbGVhcjogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9jbGVhckxpc3QoKTtcbiAgICAgICAgdGhpcy5fY2FsbGJhY2tPdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuX3BhcmVuTm9kZS5yZW1vdmVDaGlsZCh0aGlzLmdldE5vZGUoKSk7XG5cbiAgICB9LFxuXG4gICAgaXNCdWlsZDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYnVpbGQ7XG4gICAgfSxcbiAgICBnZXROb2RlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9ub2RlO1xuICAgIH0sXG4gICAgZ2V0U2VsZWN0ZWRJbmRleDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2VsZWN0ZWRJbmRleDtcbiAgICB9XG59O1xuXG5PcHRpb25zLnNldHVwID0gZnVuY3Rpb24ocGFyZW50Tm9kZSl7cmV0dXJuIE9wdGlvbnMuX2luc3RhbmNlID0gbmV3IE9wdGlvbnMocGFyZW50Tm9kZSk7fTtcbk9wdGlvbnMuZ2V0ICAgPSBmdW5jdGlvbigpe3JldHVybiBPcHRpb25zLl9pbnN0YW5jZTt9O1xuT3B0aW9ucy5kZXN0cm95ID0gZnVuY3Rpb24oKXtPcHRpb25zLl9pbnN0YW5jZSA9IG51bGw7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBPcHRpb25zOyIsInZhciBPYmplY3RDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jb3JlL09iamVjdENvbXBvbmVudCcpO1xudmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcblxudmFyIENTUyAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG52YXIgTWV0cmljICAgID0gcmVxdWlyZSgnLi9NZXRyaWMnKTtcbnZhciBTY3JvbGxCYXIgPSByZXF1aXJlKCcuLi9jb3JlL2xheW91dC9TY3JvbGxCYXInKTtcblxudmFyIEV2ZW50XyAgICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIERvY3VtZW50RXZlbnQgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXG4gICAgTm9kZUV2ZW50ICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpLFxuICAgIENvbXBvbmVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9Db21wb25lbnRFdmVudCcpO1xuXG52YXIgREVGQVVMVF9IRUlHSFQgPSBudWxsLFxuICAgIERFRkFVTFRfV1JBUCAgID0gZmFsc2UsXG4gICAgREVGQVVMVF9VUERBVEUgPSB0cnVlO1xuXG5mdW5jdGlvbiBPdXRwdXQocGFyZW50LG9iamVjdCx2YWx1ZSxwYXJhbXMpIHtcbiAgICBPYmplY3RDb21wb25lbnQuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG4gICAgcGFyYW1zICAgICAgICA9IHBhcmFtcyAgICAgICAgfHwge307XG4gICAgcGFyYW1zLmhlaWdodCA9IHBhcmFtcy5oZWlnaHQgfHwgREVGQVVMVF9IRUlHSFQ7XG4gICAgcGFyYW1zLndyYXAgICA9IHBhcmFtcy53cmFwICAgPT09IHVuZGVmaW5lZCA/IERFRkFVTFRfV1JBUCA6IHBhcmFtcy53cmFwO1xuICAgIHBhcmFtcy51cGRhdGUgPSBwYXJhbXMudXBkYXRlID09PSB1bmRlZmluZWQgPyBERUZBVUxUX1VQREFURSA6IHBhcmFtcy51cGRhdGU7XG5cbiAgICB0aGlzLl93cmFwICAgPSBwYXJhbXMud3JhcDtcbiAgICB0aGlzLl91cGRhdGUgPSBwYXJhbXMudXBkYXRlO1xuXG4gICAgdmFyIHRleHRBcmVhID0gdGhpcy5fdGV4dEFyZWEgPSBuZXcgTm9kZShOb2RlLlRFWFRBUkVBKSxcbiAgICAgICAgd3JhcCA9IHRoaXMuX3dyYXBOb2RlLFxuICAgICAgICByb290ID0gdGhpcy5fbm9kZTtcblxuICAgICAgICB0ZXh0QXJlYS5zZXRQcm9wZXJ0eSgncmVhZE9ubHknLHRydWUpO1xuICAgICAgICB3cmFwLmFkZENoaWxkKHRleHRBcmVhKTtcblxuICAgICAgICB0ZXh0QXJlYS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLHRoaXMuX29uSW5wdXREcmFnU3RhcnQuYmluZCh0aGlzKSk7XG4gICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihDb21wb25lbnRFdmVudC5JTlBVVF9TRUxFQ1RfRFJBRyx0aGlzLl9wYXJlbnQsJ29uQ29tcG9uZW50U2VsZWN0RHJhZycpO1xuXG5cbiAgICBpZihwYXJhbXMuaGVpZ2h0KXtcbiAgICAgICAgdmFyIHRleHRBcmVhV3JhcCA9IG5ldyBOb2RlKCk7XG4gICAgICAgICAgICB0ZXh0QXJlYVdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuVGV4dEFyZWFXcmFwKTtcbiAgICAgICAgICAgIHRleHRBcmVhV3JhcC5hZGRDaGlsZCh0ZXh0QXJlYSk7XG4gICAgICAgICAgICB3cmFwLmFkZENoaWxkKHRleHRBcmVhV3JhcCk7XG5cbiAgICAgICAgLy9GSVhNRVxuICAgICAgICB2YXIgaGVpZ2h0ICA9IHRoaXMuX2hlaWdodCA9IHBhcmFtcy5oZWlnaHQsXG4gICAgICAgICAgICBwYWRkaW5nID0gNDtcblxuICAgICAgICAgICAgdGV4dEFyZWEuc2V0SGVpZ2h0KE1hdGgubWF4KGhlaWdodCArIHBhZGRpbmcgICxNZXRyaWMuQ09NUE9ORU5UX01JTl9IRUlHSFQpKTtcbiAgICAgICAgICAgIHdyYXAuc2V0SGVpZ2h0KHRleHRBcmVhLmdldEhlaWdodCgpKTtcbiAgICAgICAgICAgIHJvb3Quc2V0SGVpZ2h0KHdyYXAuZ2V0SGVpZ2h0KCkgKyBwYWRkaW5nKTtcblxuICAgICAgICB0aGlzLl9zY3JvbGxCYXIgPSBuZXcgU2Nyb2xsQmFyKHRleHRBcmVhV3JhcCx0ZXh0QXJlYSxoZWlnaHQgLSBwYWRkaW5nKVxuICAgIH1cblxuICAgIGlmKHBhcmFtcy53cmFwKXtcbiAgICAgICAgdGV4dEFyZWEuc2V0U3R5bGVQcm9wZXJ0eSgnd2hpdGUtc3BhY2UnLCdwcmUtd3JhcCcpO1xuICAgIH1cblxuICAgIHRoaXMuX3ByZXZTdHJpbmcgPSAnJztcbiAgICB0aGlzLl9wcmV2U2Nyb2xsSGVpZ2h0ID0gLTE7XG4gICAgdGhpcy5fc2V0VmFsdWUoKTtcbn1cbk91dHB1dC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE9iamVjdENvbXBvbmVudC5wcm90b3R5cGUpO1xuT3V0cHV0LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IE91dHB1dDtcblxuLy9PdmVycmlkZSBpbiBzdWJjbGFzc1xuT3V0cHV0LnByb3RvdHlwZS5fc2V0VmFsdWUgPSBmdW5jdGlvbiAoKSB7fTtcblxuT3V0cHV0LnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX3NldFZhbHVlKCk7XG59O1xuXG5PdXRwdXQucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZighdGhpcy5fdXBkYXRlKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl9zZXRWYWx1ZSgpO1xufTtcblxuLy9QcmV2ZW50IGNocm9tZSBzZWxlY3QgZHJhZ1xuXG5PdXRwdXQucHJvdG90eXBlLl9vbkRyYWcgPSBmdW5jdGlvbigpe1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LklOUFVUX1NFTEVDVF9EUkFHLCBudWxsKSk7XG59O1xuXG5PdXRwdXQucHJvdG90eXBlLl9vbkRyYWdGaW5pc2ggPSBmdW5jdGlvbigpe1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LklOUFVUX1NFTEVDVF9EUkFHLCBudWxsKSk7XG5cbiAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSwgdGhpcy5fb25EcmFnLCBmYWxzZSk7XG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsIHRoaXMuX29uRHJhZ0ZpbmlzaCwgZmFsc2UpO1xufTtcblxuT3V0cHV0LnByb3RvdHlwZS5fb25JbnB1dERyYWdTdGFydCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LklOUFVUX1NFTEVDVF9EUkFHLCBudWxsKSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsIHRoaXMuX29uRHJhZy5iaW5kKHRoaXMpLCBmYWxzZSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX1VQLCAgIHRoaXMuX29uRHJhZ0ZpbmlzaC5iaW5kKHRoaXMpLCBmYWxzZSk7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gT3V0cHV0O1xuIiwidmFyIFBsb3R0ZXIgPSByZXF1aXJlKCcuL1Bsb3R0ZXInKTtcbnZhciBNb3VzZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTW91c2UnKTtcblxudmFyIEV2ZW50XyAgICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIERvY3VtZW50RXZlbnQgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXG4gICAgQ29tcG9uZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL0NvbXBvbmVudEV2ZW50Jyk7XG5cbnZhciBERUZBVUxUX0JPVU5EU19YID0gWy0xLDFdLFxuICAgIERFRkFVTFRfQk9VTkRTX1kgPSBbLTEsMV0sXG4gICAgREVGQVVMVF9MQUJFTF9YICA9ICcnLFxuICAgIERFRkFVTFRfTEFCRUxfWSAgPSAnJztcblxuZnVuY3Rpb24gUGFkKHBhcmVudCwgb2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgUGxvdHRlci5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cbiAgICBwYXJhbXMgICAgICAgICAgICA9IHBhcmFtcyAgICAgICAgICAgIHx8IHt9O1xuICAgIHBhcmFtcy5ib3VuZHNYICAgID0gcGFyYW1zLmJvdW5kc1ggICAgfHwgREVGQVVMVF9CT1VORFNfWDtcbiAgICBwYXJhbXMuYm91bmRzWSAgICA9IHBhcmFtcy5ib3VuZHNZICAgIHx8IERFRkFVTFRfQk9VTkRTX1k7XG4gICAgcGFyYW1zLmxhYmVsWCAgICAgPSBwYXJhbXMubGFiZWxYICAgICB8fCBERUZBVUxUX0xBQkVMX1g7XG4gICAgcGFyYW1zLmxhYmVsWSAgICAgPSBwYXJhbXMubGFiZWxZICAgICB8fCBERUZBVUxUX0xBQkVMX1k7XG5cbiAgICBwYXJhbXMuc2hvd0Nyb3NzICA9IHBhcmFtcy5zaG93Q3Jvc3MgIHx8IHRydWU7XG5cblxuICAgIHRoaXMuX29uQ2hhbmdlICAgICA9IHBhcmFtcy5vbkNoYW5nZSB8fCB0aGlzLl9vbkNoYW5nZTtcbiAgICB0aGlzLl9vbkZpbmlzaCAgICAgPSBwYXJhbXMub25GaW5pc2ggfHwgZnVuY3Rpb24oKXt9O1xuXG4gICAgdGhpcy5fYm91bmRzWCAgICAgID0gcGFyYW1zLmJvdW5kc1g7XG4gICAgdGhpcy5fYm91bmRzWSAgICAgID0gcGFyYW1zLmJvdW5kc1k7XG4gICAgdGhpcy5fbGFiZWxBeGlzWCAgID0gcGFyYW1zLmxhYmVsWCAhPSAnJyAmJiBwYXJhbXMubGFiZWxYICE9ICdub25lJyA/IHBhcmFtcy5sYWJlbFggOiBudWxsO1xuICAgIHRoaXMuX2xhYmVsQXhpc1kgICA9IHBhcmFtcy5sYWJlbFkgIT0gJycgJiYgcGFyYW1zLmxhYmVsWSAhPSAnbm9uZScgPyBwYXJhbXMubGFiZWxZIDogbnVsbDtcblxuICAgIHZhciBwYXRoID0gdGhpcy5fcGF0aDtcbiAgICAgICAgcGF0aC5zdHlsZS5zdHJva2VXaWR0aCA9IDE7XG4gICAgICAgIHBhdGguc3R5bGUuc3Ryb2tlICAgICAgPSAnIzM2M2M0MCc7XG5cbiAgICB0aGlzLl9ncmlkLnN0eWxlLnN0cm9rZSA9ICdyZ2IoMjUsMjUsMjUpJztcblxuICAgIHRoaXMuX3N2Z1BvcyA9IFswLDBdO1xuXG5cbiAgICB2YXIgaGFuZGxlID0gdGhpcy5faGFuZGxlID0gdGhpcy5fc3ZnUm9vdC5hcHBlbmRDaGlsZCh0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ2cnKSk7XG4gICAgdmFyIGhhbmRsZUNpcmNsZTAgPSBoYW5kbGUuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdjaXJjbGUnKSk7XG4gICAgICAgIGhhbmRsZUNpcmNsZTAuc2V0QXR0cmlidXRlKCdyJyxTdHJpbmcoMTEpKTtcbiAgICAgICAgaGFuZGxlQ2lyY2xlMC5zZXRBdHRyaWJ1dGUoJ2ZpbGwnLCdyZ2JhKDAsMCwwLDAuMDUpJyk7XG4gICAgdmFyIGhhbmRsZUNpcmNsZTEgPSBoYW5kbGUuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdjaXJjbGUnKSk7XG4gICAgICAgIGhhbmRsZUNpcmNsZTEuc2V0QXR0cmlidXRlKCdyJyxTdHJpbmcoMTApKTtcbiAgICAgICAgaGFuZGxlQ2lyY2xlMS5zZXRBdHRyaWJ1dGUoJ2ZpbGwnLCdyZ2IoODMsOTMsOTgpJyk7XG5cbiAgICB2YXIgaGFuZGxlQ2lyY2xlMiA9IGhhbmRsZS5hcHBlbmRDaGlsZCh0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ2NpcmNsZScpKTtcbiAgICAgICAgaGFuZGxlQ2lyY2xlMi5zZXRBdHRyaWJ1dGUoJ3InLFN0cmluZyg5KSk7XG4gICAgICAgIGhhbmRsZUNpcmNsZTIuc2V0QXR0cmlidXRlKCdmaWxsJywncmdiKDU3LDY5LDc2KScpO1xuICAgICAgICBoYW5kbGVDaXJjbGUyLnNldEF0dHJpYnV0ZSgnY3knLFN0cmluZygwLjc1KSk7XG5cbiAgICB2YXIgaGFuZGxlQ2lyY2xlMyA9IGhhbmRsZS5hcHBlbmRDaGlsZCh0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ2NpcmNsZScpKTtcbiAgICAgICAgaGFuZGxlQ2lyY2xlMy5zZXRBdHRyaWJ1dGUoJ3InLFN0cmluZygxMCkpO1xuICAgICAgICBoYW5kbGVDaXJjbGUzLnNldEF0dHJpYnV0ZSgnc3Ryb2tlJywncmdiKDE3LDE5LDIwKScpO1xuICAgICAgICBoYW5kbGVDaXJjbGUzLnNldEF0dHJpYnV0ZSgnc3Ryb2tlLXdpZHRoJyxTdHJpbmcoMSkpO1xuICAgICAgICBoYW5kbGVDaXJjbGUzLnNldEF0dHJpYnV0ZSgnZmlsbCcsJ25vbmUnKTtcblxuICAgIHZhciBoYW5kbGVDaXJjbGU0ID0gaGFuZGxlLmFwcGVuZENoaWxkKHRoaXMuX2NyZWF0ZVNWR09iamVjdCgnY2lyY2xlJykpO1xuICAgICAgICBoYW5kbGVDaXJjbGU0LnNldEF0dHJpYnV0ZSgncicsU3RyaW5nKDYpKTtcbiAgICAgICAgaGFuZGxlQ2lyY2xlNC5zZXRBdHRyaWJ1dGUoJ2ZpbGwnLCdyZ2IoMzAsMzQsMzYpJyk7XG4gICAgdmFyIGhhbmRsZUNpcmNsZTUgPSBoYW5kbGUuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdjaXJjbGUnKSk7XG4gICAgICAgIGhhbmRsZUNpcmNsZTUuc2V0QXR0cmlidXRlKCdyJyxTdHJpbmcoMykpO1xuICAgICAgICBoYW5kbGVDaXJjbGU1LnNldEF0dHJpYnV0ZSgnZmlsbCcsJ3JnYigyNTUsMjU1LDI1NSknKTtcblxuICAgICAgICBoYW5kbGUuc2V0QXR0cmlidXRlKCd0cmFuZm9ybScsJ3RyYW5zbGF0ZSgwIDApJyk7XG5cbiAgICB0aGlzLl9zdmcuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX0RPV04sdGhpcy5fb25EcmFnU3RhcnQuYmluZCh0aGlzKSxmYWxzZSk7XG4gICAgdGhpcy5fZHJhd1ZhbHVlKHRoaXMuX29ialt0aGlzLl9rZXldKTtcbn1cblBhZC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFBsb3R0ZXIucHJvdG90eXBlKTtcblBhZC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBQYWQ7XG5cblBhZC5wcm90b3R5cGUuX29uRHJhZ1N0YXJ0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBlbGVtZW50ID0gdGhpcy5fc3ZnO1xuXG4gICAgdmFyIHN2Z1BvcyA9IHRoaXMuX3N2Z1BvcztcbiAgICAgICAgc3ZnUG9zWzBdID0gMDtcbiAgICAgICAgc3ZnUG9zWzFdID0gMDtcblxuICAgIHdoaWxlIChlbGVtZW50KSB7XG4gICAgICAgIHN2Z1Bvc1swXSArPSBlbGVtZW50Lm9mZnNldExlZnQ7XG4gICAgICAgIHN2Z1Bvc1sxXSArPSBlbGVtZW50Lm9mZnNldFRvcDtcbiAgICAgICAgZWxlbWVudCA9IGVsZW1lbnQub2Zmc2V0UGFyZW50O1xuICAgIH1cblxuICAgIHZhciBldmVudE1vdmUgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsXG4gICAgICAgIGV2ZW50VXAgICA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XG5cbiAgICB2YXIgb25EcmFnID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9kcmF3VmFsdWVJbnB1dCgpO1xuICAgICAgICB0aGlzLmFwcGx5VmFsdWUoKTtcbiAgICAgICAgdGhpcy5fb25DaGFuZ2UoKTtcbiAgICB9LmJpbmQodGhpcyk7XG5cbiAgICB2YXIgb25EcmFnRW5kID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnB1c2hIaXN0b3J5U3RhdGUoKTtcbiAgICAgICAgdGhpcy5fZHJhd1ZhbHVlSW5wdXQoKTtcbiAgICAgICAgdGhpcy5hcHBseVZhbHVlKCk7XG4gICAgICAgIHRoaXMuX29uRmluaXNoKCk7XG5cbiAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50VXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xuICAgIH0uYmluZCh0aGlzKTtcblxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3ZlLCBvbkRyYWcsICAgIGZhbHNlKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50VXAsICAgb25EcmFnRW5kLCBmYWxzZSk7XG5cbiAgICB0aGlzLl9kcmF3VmFsdWVJbnB1dCgpO1xuICAgIHRoaXMuYXBwbHlWYWx1ZSgpO1xuICAgIHRoaXMuX29uQ2hhbmdlKCk7XG59O1xuXG5QYWQucHJvdG90eXBlLl9yZWRyYXcgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fZHJhd1ZhbHVlKHRoaXMuX29ialt0aGlzLl9rZXldKTtcbn07XG5cblBhZC5wcm90b3R5cGUuX2RyYXdWYWx1ZUlucHV0ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2RyYXdWYWx1ZSh0aGlzLl9nZXRNb3VzZU5vcm1hbGl6ZWQoKSk7XG59O1xuXG5QYWQucHJvdG90eXBlLl9kcmF3VmFsdWUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB0aGlzLl9vYmpbdGhpcy5fa2V5XSA9IHZhbHVlO1xuICAgIHRoaXMuX2RyYXdHcmlkKCk7XG4gICAgdGhpcy5fZHJhd1BvaW50KCk7XG59O1xuXG5QYWQucHJvdG90eXBlLl9kcmF3R3JpZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc3ZnU2l6ZSA9IE51bWJlcih0aGlzLl9zdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKSxcbiAgICAgICAgc3ZnTWlkWCA9IE1hdGguZmxvb3Ioc3ZnU2l6ZSAqIDAuNSksXG4gICAgICAgIHN2Z01pZFkgPSBNYXRoLmZsb29yKHN2Z1NpemUgKiAwLjUpO1xuXG4gICAgdmFyIHBhdGhDbWQgPSAnJztcbiAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRMaW5lKDAsIHN2Z01pZFksIHN2Z1NpemUsIHN2Z01pZFkpO1xuICAgIHBhdGhDbWQgKz0gdGhpcy5fcGF0aENtZExpbmUoc3ZnTWlkWCwgMCwgc3ZnTWlkWCwgc3ZnU2l6ZSk7XG5cbiAgICB0aGlzLl9ncmlkLnNldEF0dHJpYnV0ZSgnZCcsIHBhdGhDbWQpO1xufTtcblxuXG5QYWQucHJvdG90eXBlLl9kcmF3UG9pbnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHN2Z1NpemUgPSBOdW1iZXIodGhpcy5fc3ZnLmdldEF0dHJpYnV0ZSgnd2lkdGgnKSksXG4gICAgICAgIHN2Z01pZFggPSBzdmdTaXplICogMC41LFxuICAgICAgICBzdmdNaWRZID0gc3ZnU2l6ZSAqIDAuNTtcblxuICAgIHZhciB2YWx1ZSA9IHRoaXMuX29ialt0aGlzLl9rZXldO1xuXG4gICAgdmFyIGxvY2FsWCA9ICggMC41ICsgdmFsdWVbMF0gKiAwLjUgKSAqIHN2Z1NpemUsXG4gICAgICAgIGxvY2FsWSA9ICggMC41ICsgLXZhbHVlWzFdICogMC41ICkgKiBzdmdTaXplO1xuXG4gICAgdmFyIHBhdGhDbWQgPSAnJztcbiAgICAgICAgcGF0aENtZCArPSB0aGlzLl9wYXRoQ21kTGluZSgwLCBsb2NhbFksIHN2Z1NpemUsIGxvY2FsWSk7XG4gICAgICAgIHBhdGhDbWQgKz0gdGhpcy5fcGF0aENtZExpbmUobG9jYWxYLCAwLCBsb2NhbFgsIHN2Z1NpemUpO1xuXG4gICAgdGhpcy5fcGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwYXRoQ21kKTtcbiAgICB0aGlzLl9oYW5kbGUuc2V0QXR0cmlidXRlKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyBsb2NhbFggKyAnICcgKyBsb2NhbFkgKyAnKScpO1xufTtcblxuUGFkLnByb3RvdHlwZS5fZ2V0TW91c2VOb3JtYWxpemVkID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBvZmZzZXQgPSB0aGlzLl9zdmdQb3MsXG4gICAgICAgIG1vdXNlID0gTW91c2UuZ2V0KCkuZ2V0UG9zaXRpb24oKSxcbiAgICAgICAgc3ZnU2l6ZSA9IE51bWJlcih0aGlzLl9zdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKTtcblxuICAgIHJldHVybiBbLTEgKyBNYXRoLm1heCgwLCBNYXRoLm1pbihtb3VzZVswXSAtIG9mZnNldFswXSwgc3ZnU2l6ZSkpIC8gc3ZnU2l6ZSAqIDIsXG4gICAgICAgICggMSAtIE1hdGgubWF4KDAsIE1hdGgubWluKG1vdXNlWzFdIC0gb2Zmc2V0WzFdLCBzdmdTaXplKSkgLyBzdmdTaXplICogMildO1xuXG59O1xuXG5QYWQucHJvdG90eXBlLmFwcGx5VmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCwgbnVsbCkpO1xufTtcblxuUGFkLnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAoZS5kYXRhLm9yaWdpbiA9PSB0aGlzKXJldHVybjtcbiAgICB0aGlzLl9kcmF3VmFsdWUodGhpcy5fb2JqW3RoaXMuX2tleV0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQYWQ7XG4iLCJ2YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xuXG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcbnZhciBOdW1iZXJJbnB1dF9JbnRlcm5hbCA9IHJlcXVpcmUoJy4vTnVtYmVySW5wdXRfSW50ZXJuYWwnKTtcbnZhciBNb3VzZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTW91c2UnKTtcbnZhciBDb2xvclV0aWwgPSByZXF1aXJlKCcuLi9jb3JlL2NvbG9yL0NvbG9yVXRpbCcpO1xudmFyIERvY3VtZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcbiAgICBOb2RlRXZlbnQgICAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKTtcblxudmFyIERFRkFVTFRfVkFMVUVfSFVFID0gMjAwLjAsXG4gICAgREVGQVVMVF9WQUxVRV9TQVQgPSA1MC4wLFxuICAgIERFRkFVTFRfVkFMVUVfVkFMID0gNTAuMDtcblxuZnVuY3Rpb24gUGlja2VyKHBhcmVudE5vZGUpe1xuICAgIHZhciByb290ID0gdGhpcy5fbm9kZSAgICAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlciksXG4gICAgICAgIGhlYWQgPSB0aGlzLl9oZWFkTm9kZSA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuSGVhZCksXG4gICAgICAgIGxhYmVsV3JhcCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCksXG4gICAgICAgIGxhYmVsID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCksXG4gICAgICAgIG1lbnUgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLk1lbnUpLFxuICAgICAgICBtZW51V3JhcCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCk7XG5cbiAgICB2YXIgbWVudUNsb3NlID0gbmV3IE5vZGUoTm9kZS5JTlBVVF9CVVRUT04pO1xuICAgICAgICBtZW51Q2xvc2Uuc2V0U3R5bGVDbGFzcyhDU1MuQnV0dG9uTWVudUNsb3NlKTtcblxuICAgIHZhciBmaWVsZFdyYXAgID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKCBDU1MuUGlja2VyRmllbGRXcmFwKSxcbiAgICAgICAgc2xpZGVyV3JhcCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuU2xpZGVyV3JhcCksXG4gICAgICAgIGlucHV0V3JhcCAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoIENTUy5QaWNrZXJJbnB1dFdyYXApO1xuXG4gICAgdmFyIGNhbnZhc0ZpZWxkICA9IHRoaXMuX2NhbnZhc0ZpZWxkICA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpLFxuICAgICAgICBjYW52YXNTbGlkZXIgPSB0aGlzLl9jYW52YXNTbGlkZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdDYW52YXMnKTtcblxuICAgICAgICBmaWVsZFdyYXAuZ2V0RWxlbWVudCgpLmFwcGVuZENoaWxkKGNhbnZhc0ZpZWxkKTtcbiAgICAgICAgc2xpZGVyV3JhcC5nZXRFbGVtZW50KCkuYXBwZW5kQ2hpbGQoY2FudmFzU2xpZGVyKTtcblxuICAgICAgICB0aGlzLl9zZXRTaXplQ2FudmFzRmllbGQoMTU0LDE1NCk7XG4gICAgICAgIHRoaXMuX3NldFNpemVDYW52YXNTbGlkZXIoMTQsMTU0KTtcblxuICAgIHZhciBjb250ZXh0Q2FudmFzRmllbGQgID0gdGhpcy5fY29udGV4dENhbnZhc0ZpZWxkICA9IGNhbnZhc0ZpZWxkLmdldENvbnRleHQoJzJkJyksXG4gICAgICAgIGNvbnRleHRDYW52YXNTbGlkZXIgPSB0aGlzLl9jb250ZXh0Q2FudmFzU2xpZGVyID0gY2FudmFzU2xpZGVyLmdldENvbnRleHQoJzJkJyk7XG5cbiAgICB2YXIgaGFuZGxlRmllbGQgID0gdGhpcy5faGFuZGxlRmllbGQgID0gbmV3IE5vZGUoKTtcbiAgICAgICAgaGFuZGxlRmllbGQuc2V0U3R5bGVDbGFzcyhDU1MuUGlja2VySGFuZGxlRmllbGQpO1xuXG4gICAgdmFyIGhhbmRsZVNsaWRlciA9IHRoaXMuX2hhbmRsZVNsaWRlciA9IG5ldyBOb2RlKCk7XG4gICAgICAgIGhhbmRsZVNsaWRlci5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJIYW5kbGVTbGlkZXIpO1xuXG4gICAgdmFyIHN0ZXAgPSAxLjAsXG4gICAgICAgIGRwICAgPSAwO1xuXG4gICAgdmFyIGNhbGxiYWNrSHVlID0gdGhpcy5fb25JbnB1dEh1ZUNoYW5nZS5iaW5kKHRoaXMpLFxuICAgICAgICBjYWxsYmFja1NhdCA9IHRoaXMuX29uSW5wdXRTYXRDaGFuZ2UuYmluZCh0aGlzKSxcbiAgICAgICAgY2FsbGJhY2tWYWwgPSB0aGlzLl9vbklucHV0VmFsQ2hhbmdlLmJpbmQodGhpcyksXG4gICAgICAgIGNhbGxiYWNrUiAgID0gdGhpcy5fb25JbnB1dFJDaGFuZ2UuYmluZCh0aGlzKSxcbiAgICAgICAgY2FsbGJhY2tHICAgPSB0aGlzLl9vbklucHV0R0NoYW5nZS5iaW5kKHRoaXMpLFxuICAgICAgICBjYWxsYmFja0IgICA9IHRoaXMuX29uSW5wdXRCQ2hhbmdlLmJpbmQodGhpcyk7XG5cblxuICAgIHZhciBpbnB1dEh1ZSA9IHRoaXMuX2lucHV0SHVlID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHN0ZXAsZHAsbnVsbCxjYWxsYmFja0h1ZSksXG4gICAgICAgIGlucHV0U2F0ID0gdGhpcy5faW5wdXRTYXQgPSBuZXcgTnVtYmVySW5wdXRfSW50ZXJuYWwoc3RlcCxkcCxudWxsLGNhbGxiYWNrU2F0KSxcbiAgICAgICAgaW5wdXRWYWwgPSB0aGlzLl9pbnB1dFZhbCA9IG5ldyBOdW1iZXJJbnB1dF9JbnRlcm5hbChzdGVwLGRwLG51bGwsY2FsbGJhY2tWYWwpLFxuICAgICAgICBpbnB1dFIgICA9IHRoaXMuX2lucHV0UiAgID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHN0ZXAsZHAsbnVsbCxjYWxsYmFja1IpLFxuICAgICAgICBpbnB1dEcgICA9IHRoaXMuX2lucHV0RyAgID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHN0ZXAsZHAsbnVsbCxjYWxsYmFja0cpLFxuICAgICAgICBpbnB1dEIgICA9IHRoaXMuX2lucHV0QiAgID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHN0ZXAsZHAsbnVsbCxjYWxsYmFja0IpO1xuXG4gICAgdmFyIGNvbnRyb2xzV3JhcCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuUGlja2VyQ29udHJvbHNXcmFwKTtcblxuICAgIHZhciBidXR0b25QaWNrICAgPSBuZXcgTm9kZShOb2RlLklOUFVUX0JVVFRPTikuc2V0U3R5bGVDbGFzcyhDU1MuQnV0dG9uKS5zZXRQcm9wZXJ0eSgndmFsdWUnLCdwaWNrJyksXG4gICAgICAgIGJ1dHRvbkNhbmNlbCA9IG5ldyBOb2RlKE5vZGUuSU5QVVRfQlVUVE9OKS5zZXRTdHlsZUNsYXNzKENTUy5CdXR0b24pLnNldFByb3BlcnR5KCd2YWx1ZScsJ2NhbmNlbCcpO1xuXG5cbiAgICB2YXIgY29sb3JDb250cmFzdCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuUGlja2VyQ29sb3JDb250cmFzdCk7XG5cbiAgICB2YXIgY29sb3IwID0gdGhpcy5fY29sb3JDdXJyTm9kZSA9IG5ldyBOb2RlKCksXG4gICAgICAgIGNvbG9yMSA9IHRoaXMuX2NvbG9yUHJldk5vZGUgPSBuZXcgTm9kZSgpO1xuXG4gICAgY29sb3JDb250cmFzdC5hZGRDaGlsZChjb2xvcjApO1xuICAgIGNvbG9yQ29udHJhc3QuYWRkQ2hpbGQoY29sb3IxKTtcblxuICAgIGNvbnRyb2xzV3JhcC5hZGRDaGlsZChidXR0b25DYW5jZWwpO1xuICAgIGNvbnRyb2xzV3JhcC5hZGRDaGlsZChidXR0b25QaWNrKTtcbiAgICBjb250cm9sc1dyYXAuYWRkQ2hpbGQoY29sb3JDb250cmFzdCk7XG5cbiAgICB0aGlzLl9zZXRDb250cmFzUHJldkNvbG9yKDAsMCwwKTtcblxuICAgIHZhciBpbnB1dEZpZWxkV3JhcEh1ZSA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuUGlja2VySW5wdXRGaWVsZCksXG4gICAgICAgIGlucHV0RmllbGRXcmFwU2F0ID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJJbnB1dEZpZWxkKSxcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBWYWwgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlcklucHV0RmllbGQpO1xuXG4gICAgdmFyIGlucHV0RmllbGRXcmFwSHVlTGFiZWwgPSBuZXcgTm9kZShOb2RlLlNQQU4pLnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywnSCcpLFxuICAgICAgICBpbnB1dEZpZWxkV3JhcFNhdExhYmVsID0gbmV3IE5vZGUoTm9kZS5TUEFOKS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCkuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsJ1MnKSxcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBWYWxMYWJlbCA9IG5ldyBOb2RlKE5vZGUuU1BBTikuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCdWJyk7XG5cbiAgICAgICAgaW5wdXRGaWVsZFdyYXBIdWUuYWRkQ2hpbGRyZW4oaW5wdXRGaWVsZFdyYXBIdWVMYWJlbCxpbnB1dEh1ZS5nZXROb2RlKCkpO1xuICAgICAgICBpbnB1dEZpZWxkV3JhcFNhdC5hZGRDaGlsZHJlbihpbnB1dEZpZWxkV3JhcFNhdExhYmVsLGlucHV0U2F0LmdldE5vZGUoKSk7XG4gICAgICAgIGlucHV0RmllbGRXcmFwVmFsLmFkZENoaWxkcmVuKGlucHV0RmllbGRXcmFwVmFsTGFiZWwsaW5wdXRWYWwuZ2V0Tm9kZSgpKTtcblxuICAgIHZhciBpbnB1dEZpZWxkV3JhcFIgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlcklucHV0RmllbGQpLFxuICAgICAgICBpbnB1dEZpZWxkV3JhcEcgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlcklucHV0RmllbGQpLFxuICAgICAgICBpbnB1dEZpZWxkV3JhcEIgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlcklucHV0RmllbGQpO1xuXG4gICAgdmFyIGlucHV0RmllbGRXcmFwUkxhYmVsID0gbmV3IE5vZGUoTm9kZS5TUEFOKS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCkuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsJ1InKSxcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBHTGFiZWwgPSBuZXcgTm9kZShOb2RlLlNQQU4pLnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywnRycpLFxuICAgICAgICBpbnB1dEZpZWxkV3JhcEJMYWJlbCA9IG5ldyBOb2RlKE5vZGUuU1BBTikuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCdCJyk7XG5cbiAgICAgICAgaW5wdXRGaWVsZFdyYXBSLmFkZENoaWxkcmVuKGlucHV0RmllbGRXcmFwUkxhYmVsLGlucHV0Ui5nZXROb2RlKCkpO1xuICAgICAgICBpbnB1dEZpZWxkV3JhcEcuYWRkQ2hpbGRyZW4oaW5wdXRGaWVsZFdyYXBHTGFiZWwsaW5wdXRHLmdldE5vZGUoKSk7XG4gICAgICAgIGlucHV0RmllbGRXcmFwQi5hZGRDaGlsZHJlbihpbnB1dEZpZWxkV3JhcEJMYWJlbCxpbnB1dEIuZ2V0Tm9kZSgpKTtcblxuXG4gICAgICAgIGlucHV0V3JhcC5hZGRDaGlsZHJlbihpbnB1dEZpZWxkV3JhcFIsaW5wdXRGaWVsZFdyYXBIdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dEZpZWxkV3JhcEcsaW5wdXRGaWVsZFdyYXBTYXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dEZpZWxkV3JhcEIsaW5wdXRGaWVsZFdyYXBWYWwsY29sb3JDb250cmFzdCk7XG5cbiAgICB2YXIgaGV4SW5wdXRXcmFwID0gbmV3IE5vZGUoKTtcbiAgICAgICAgaGV4SW5wdXRXcmFwLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlcklucHV0V3JhcCk7XG5cbiAgICB2YXIgaW5wdXRIRVggPSB0aGlzLl9pbnB1dEhFWCA9IG5ldyBOb2RlKE5vZGUuSU5QVVRfVEVYVCksXG4gICAgICAgIGlucHV0RmllbGRXcmFwSEVYICAgICAgICAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlcklucHV0RmllbGQpLFxuICAgICAgICBpbnB1dEZpZWxkV3JhcEhFWExhYmVsICAgID0gbmV3IE5vZGUoTm9kZS5TUEFOKS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCk7XG5cbiAgICAgICAgaW5wdXRGaWVsZFdyYXBIRVhMYWJlbC5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywnIycpO1xuICAgICAgICBpbnB1dEZpZWxkV3JhcEhFWC5hZGRDaGlsZHJlbihpbnB1dEZpZWxkV3JhcEhFWExhYmVsLGlucHV0SEVYKTtcblxuICAgICAgICBoZXhJbnB1dFdyYXAuYWRkQ2hpbGQoaW5wdXRGaWVsZFdyYXBIRVgpO1xuXG4gICAgICAgIGlucHV0SEVYLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50LkNIQU5HRSx0aGlzLl9vbklucHV0SEVYRmluaXNoLmJpbmQodGhpcykpO1xuXG4gICAgICAgIGxhYmVsLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCdDb2xvciBQaWNrZXInKTtcblxuICAgICAgICBtZW51LmFkZENoaWxkKG1lbnVDbG9zZSk7XG4gICAgICAgIGhlYWQuYWRkQ2hpbGQobWVudSk7XG4gICAgICAgIGxhYmVsV3JhcC5hZGRDaGlsZChsYWJlbCk7XG4gICAgICAgIGhlYWQuYWRkQ2hpbGQobGFiZWxXcmFwKTtcbiAgICAgICAgcm9vdC5hZGRDaGlsZChoZWFkKTtcbiAgICAgICAgcm9vdC5hZGRDaGlsZChtZW51V3JhcCk7XG5cbiAgICAgICAgLy93cmFwTm9kZS5hZGRDaGlsZChwYWxldHRlV3JhcCk7XG5cbiAgICAgICAgbWVudVdyYXAuYWRkQ2hpbGQoZmllbGRXcmFwKTtcbiAgICAgICAgbWVudVdyYXAuYWRkQ2hpbGQoc2xpZGVyV3JhcCk7XG4gICAgICAgIG1lbnVXcmFwLmFkZENoaWxkKGlucHV0V3JhcCk7XG4gICAgICAgIG1lbnVXcmFwLmFkZENoaWxkKGhleElucHV0V3JhcCk7XG4gICAgICAgIG1lbnVXcmFwLmFkZENoaWxkKGNvbnRyb2xzV3JhcCk7XG5cbiAgICAgICAgZmllbGRXcmFwLmFkZENoaWxkKCBoYW5kbGVGaWVsZCk7XG4gICAgICAgIHNsaWRlcldyYXAuYWRkQ2hpbGQoaGFuZGxlU2xpZGVyKTtcblxuICAgIHZhciBldmVudE1vdXNlRG93biA9IE5vZGVFdmVudC5NT1VTRV9ET1dOLFxuICAgICAgICBjYWxsYmFjayAgICAgICA9IHRoaXMuX29uQ2FudmFzRmllbGRNb3VzZURvd24uYmluZCh0aGlzKTtcblxuICAgICAgICBmaWVsZFdyYXAuYWRkRXZlbnRMaXN0ZW5lciggIGV2ZW50TW91c2VEb3duLCBjYWxsYmFjayk7XG4gICAgICAgIGhhbmRsZUZpZWxkLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZURvd24sIGNhbGxiYWNrKTtcblxuICAgICAgICBjYWxsYmFjayA9IHRoaXMuX29uQ2FudmFzU2xpZGVyTW91c2VEb3duLmJpbmQodGhpcyk7XG5cbiAgICAgICAgc2xpZGVyV3JhcC5hZGRFdmVudExpc3RlbmVyKCAgZXZlbnRNb3VzZURvd24sIGNhbGxiYWNrKTtcbiAgICAgICAgaGFuZGxlU2xpZGVyLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZURvd24sIGNhbGxiYWNrKTtcblxuICAgICAgICBtZW51Q2xvc2UuYWRkRXZlbnRMaXN0ZW5lciggICBldmVudE1vdXNlRG93biwgdGhpcy5fb25DbG9zZS5iaW5kKHRoaXMpKTtcbiAgICAgICAgYnV0dG9uUGljay5hZGRFdmVudExpc3RlbmVyKCAgZXZlbnRNb3VzZURvd24sIHRoaXMuX29uUGljay5iaW5kKHRoaXMpKTtcbiAgICAgICAgYnV0dG9uQ2FuY2VsLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZURvd24sIHRoaXMuX29uQ2xvc2UuYmluZCh0aGlzKSk7XG5cbiAgICAgICAgaGVhZC5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLCB0aGlzLl9vbkhlYWREcmFnU3RhcnQuYmluZCh0aGlzKSk7XG5cbiAgICB0aGlzLl9wYXJlbnROb2RlID0gcGFyZW50Tm9kZTtcblxuICAgIHRoaXMuX21vdXNlT2Zmc2V0ID0gWzAsMF07XG4gICAgdGhpcy5fcG9zaXRpb24gICAgPSBbbnVsbCxudWxsXTtcblxuICAgIHRoaXMuX2NhbnZhc1NsaWRlclBvcyA9IFswLDBdO1xuICAgIHRoaXMuX2NhbnZhc0ZpZWxkUG9zICA9IFswLDBdO1xuICAgIHRoaXMuX2hhbmRsZUZpZWxkU2l6ZSAgICA9IDEyO1xuICAgIHRoaXMuX2hhbmRsZVNsaWRlckhlaWdodCA9IDc7XG5cbiAgICB0aGlzLl9pbWFnZURhdGFTbGlkZXIgPSBjb250ZXh0Q2FudmFzU2xpZGVyLmNyZWF0ZUltYWdlRGF0YShjYW52YXNTbGlkZXIud2lkdGgsY2FudmFzU2xpZGVyLmhlaWdodCk7XG4gICAgdGhpcy5faW1hZ2VEYXRhRmllbGQgID0gY29udGV4dENhbnZhc0ZpZWxkLmNyZWF0ZUltYWdlRGF0YSggY2FudmFzRmllbGQud2lkdGgsIGNhbnZhc0ZpZWxkLmhlaWdodCk7XG5cbiAgICB0aGlzLl92YWx1ZUh1ZU1pbk1heCA9IFswLDM2MF07XG4gICAgdGhpcy5fdmFsdWVTYXRNaW5NYXggPSB0aGlzLl92YWx1ZVZhbE1pbk1heCA9IFswLDEwMF07XG4gICAgdGhpcy5fdmFsdWVSR0JNaW5NYXggPSBbMCwyNTVdO1xuXG4gICAgdGhpcy5fdmFsdWVIdWUgPSBERUZBVUxUX1ZBTFVFX0hVRTtcbiAgICB0aGlzLl92YWx1ZVNhdCA9IERFRkFVTFRfVkFMVUVfU0FUO1xuICAgIHRoaXMuX3ZhbHVlVmFsID0gREVGQVVMVF9WQUxVRV9WQUw7XG4gICAgdGhpcy5fdmFsdWVSICAgPSAwO1xuICAgIHRoaXMuX3ZhbHVlRyAgID0gMDtcbiAgICB0aGlzLl92YWx1ZUIgICA9IDA7XG5cbiAgICB0aGlzLl92YWx1ZUhFWCA9ICcjMDAwMDAwJztcbiAgICB0aGlzLl92YWx1ZUhFWFZhbGlkID0gdGhpcy5fdmFsdWVIRVg7XG5cbiAgICB0aGlzLl9jYWxsYmFja1BpY2sgPSBmdW5jdGlvbigpe307XG5cbiAgICAvL3RoaXMuX2NhbnZhc0ZpZWxkSW1hZ2VEYXRhRnVuYyA9IGZ1bmN0aW9uKGksail7cmV0dXJuIHRoaXMuX0hTVjJSR0IodGhpcy5fdmFsdWVIdWUsail9XG5cbiAgICB0aGlzLl9kcmF3Q2FudmFzRmllbGQoKTtcbiAgICB0aGlzLl9kcmF3Q2FudmFzU2xpZGVyKCk7XG5cbiAgICB0aGlzLl9zZXRDb2xvckhTVih0aGlzLl92YWx1ZUh1ZSx0aGlzLl92YWx1ZVNhdCx0aGlzLl92YWx1ZVZhbCk7XG5cbiAgICB0aGlzLl91cGRhdGVDb2xvclJHQkZyb21IU1YoKTtcbiAgICB0aGlzLl91cGRhdGVDb2xvckhFWEZyb21SR0IoKTtcblxuICAgIHRoaXMuX3VwZGF0ZUhhbmRsZXMoKTtcbn1cblxuUGlja2VyLnByb3RvdHlwZSA9XG57XG4gICAgX2RyYXdIYW5kbGVGaWVsZDogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzRmllbGQsXG4gICAgICAgICAgICBub2RlUG9zID0gdGhpcy5fY2FudmFzRmllbGRQb3MsXG4gICAgICAgICAgICBtb3VzZVBvcyA9IE1vdXNlLmdldCgpLmdldFBvc2l0aW9uKCk7XG5cbiAgICAgICAgdmFyIHBvc1ggPSBNYXRoLm1heCgwLCBNYXRoLm1pbihtb3VzZVBvc1swXSAtIG5vZGVQb3NbMF0sIGNhbnZhcy53aWR0aCkpLFxuICAgICAgICAgICAgcG9zWSA9IE1hdGgubWF4KDAsIE1hdGgubWluKG1vdXNlUG9zWzFdIC0gbm9kZVBvc1sxXSwgY2FudmFzLmhlaWdodCkpLFxuICAgICAgICAgICAgcG9zWE5vcm0gPSBwb3NYIC8gY2FudmFzLndpZHRoLFxuICAgICAgICAgICAgcG9zWU5vcm0gPSBwb3NZIC8gY2FudmFzLmhlaWdodDtcblxuICAgICAgICB2YXIgc2F0ID0gTWF0aC5yb3VuZChwb3NYTm9ybSAqIHRoaXMuX3ZhbHVlU2F0TWluTWF4WzFdKSxcbiAgICAgICAgICAgIHZhbCA9IE1hdGgucm91bmQoKDEuMCAtIHBvc1lOb3JtKSAqIHRoaXMuX3ZhbHVlVmFsTWluTWF4WzFdKTtcblxuICAgICAgICB0aGlzLl9zZXRDb2xvckhTVih0aGlzLl92YWx1ZUh1ZSwgc2F0LCB2YWwpO1xuXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9yUkdCRnJvbUhTVigpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhFWEZyb21SR0IoKTtcblxuICAgICAgICB0aGlzLl91cGRhdGVIYW5kbGVGaWVsZCgpO1xuICAgIH0sXG5cbiAgICBfdXBkYXRlSGFuZGxlRmllbGQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHdpZHRoID0gdGhpcy5fY2FudmFzRmllbGQud2lkdGgsXG4gICAgICAgICAgICBoZWlnaHQgPSB0aGlzLl9jYW52YXNGaWVsZC5oZWlnaHQsXG4gICAgICAgICAgICBvZmZzZXRIYW5kbGUgPSB0aGlzLl9oYW5kbGVGaWVsZFNpemUgKiAwLjI1O1xuXG4gICAgICAgIHZhciBzYXROb3JtID0gdGhpcy5fdmFsdWVTYXQgLyB0aGlzLl92YWx1ZVNhdE1pbk1heFsxXSxcbiAgICAgICAgICAgIHZhbE5vcm0gPSB0aGlzLl92YWx1ZVZhbCAvIHRoaXMuX3ZhbHVlVmFsTWluTWF4WzFdO1xuXG4gICAgICAgIHRoaXMuX2hhbmRsZUZpZWxkLnNldFBvc2l0aW9uR2xvYmFsKHNhdE5vcm0gKiB3aWR0aCAtIG9mZnNldEhhbmRsZSxcbiAgICAgICAgICAgICgxLjAgLSB2YWxOb3JtKSAqIGhlaWdodCAtIG9mZnNldEhhbmRsZSk7XG5cbiAgICB9LFxuXG4gICAgX2RyYXdIYW5kbGVTbGlkZXI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhc1NsaWRlcixcbiAgICAgICAgICAgIGNhbnZhc1Bvc1kgPSB0aGlzLl9jYW52YXNTbGlkZXJQb3NbMV0sXG4gICAgICAgICAgICBtb3VzZVBvc1kgPSBNb3VzZS5nZXQoKS5nZXRZKCk7XG5cbiAgICAgICAgdmFyIHBvc1kgPSBNYXRoLm1heCgwLCBNYXRoLm1pbihtb3VzZVBvc1kgLSBjYW52YXNQb3NZLCBjYW52YXMuaGVpZ2h0KSksXG4gICAgICAgICAgICBwb3NZTm9ybSA9IHBvc1kgLyBjYW52YXMuaGVpZ2h0O1xuXG4gICAgICAgIHZhciBodWUgPSBNYXRoLmZsb29yKCgxLjAgLSBwb3NZTm9ybSkgKiB0aGlzLl92YWx1ZUh1ZU1pbk1heFsxXSk7XG5cbiAgICAgICAgdGhpcy5fc2V0Q29sb3JIU1YoaHVlLCB0aGlzLl92YWx1ZVNhdCwgdGhpcy5fdmFsdWVWYWwpO1xuXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9yUkdCRnJvbUhTVigpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhFWEZyb21SR0IoKTtcblxuICAgICAgICB0aGlzLl91cGRhdGVIYW5kbGVTbGlkZXIoKTtcbiAgICB9LFxuXG4gICAgX3VwZGF0ZUhhbmRsZVNsaWRlcjogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaGVpZ2h0ID0gdGhpcy5fY2FudmFzU2xpZGVyLmhlaWdodCxcbiAgICAgICAgICAgIG9mZnNldEhhbmRsZSA9IHRoaXMuX2hhbmRsZVNsaWRlckhlaWdodCAqIDAuMjU7XG5cbiAgICAgICAgdmFyIGh1ZU5vcm0gPSB0aGlzLl92YWx1ZUh1ZSAvIHRoaXMuX3ZhbHVlSHVlTWluTWF4WzFdO1xuXG4gICAgICAgIHRoaXMuX2hhbmRsZVNsaWRlci5zZXRQb3NpdGlvbkdsb2JhbFkoKGhlaWdodCAtIG9mZnNldEhhbmRsZSkgKiAoMS4wIC0gaHVlTm9ybSkpO1xuICAgIH0sXG5cbiAgICBfdXBkYXRlSGFuZGxlczogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl91cGRhdGVIYW5kbGVGaWVsZCgpO1xuICAgICAgICB0aGlzLl91cGRhdGVIYW5kbGVTbGlkZXIoKTtcbiAgICB9LFxuXG4gICAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gICAgX3NldEh1ZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHZhciBtaW5NYXggPSB0aGlzLl92YWx1ZUh1ZU1pbk1heDtcblxuICAgICAgICB0aGlzLl92YWx1ZUh1ZSA9IHZhbHVlID09IG1pbk1heFsxXSA/IG1pbk1heFswXSA6IHZhbHVlO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhTVigpO1xuICAgICAgICB0aGlzLl9kcmF3Q2FudmFzRmllbGQoKTtcbiAgICB9LFxuXG4gICAgX3NldFNhdDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX3ZhbHVlU2F0ID0gTWF0aC5yb3VuZCh2YWx1ZSk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySFNWKCk7XG4gICAgfSxcblxuICAgIF9zZXRWYWw6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB0aGlzLl92YWx1ZVZhbCA9IE1hdGgucm91bmQodmFsdWUpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhTVigpO1xuICAgIH0sXG5cbiAgICBfc2V0UjogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX3ZhbHVlUiA9IE1hdGgucm91bmQodmFsdWUpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvclJHQigpO1xuICAgIH0sXG5cbiAgICBfc2V0RzogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX3ZhbHVlRyA9IE1hdGgucm91bmQodmFsdWUpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvclJHQigpO1xuICAgIH0sXG5cbiAgICBfc2V0QjogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX3ZhbHVlQiA9IE1hdGgucm91bmQodmFsdWUpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvclJHQigpO1xuICAgIH0sXG5cbiAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbiAgICBfb25JbnB1dEh1ZUNoYW5nZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaW5wdXQgPSB0aGlzLl9pbnB1dEh1ZSxcbiAgICAgICAgICAgIGlucHV0VmFsID0gdGhpcy5fZ2V0VmFsdWVDb250cmFpbmVkKGlucHV0LCB0aGlzLl92YWx1ZUh1ZU1pbk1heCk7XG5cbiAgICAgICAgdmFyIG1pbk1heCA9IHRoaXMuX3ZhbHVlSHVlTWluTWF4O1xuXG4gICAgICAgIGlmIChpbnB1dFZhbCA9PSBtaW5NYXhbMV0pIHtcbiAgICAgICAgICAgIGlucHV0VmFsID0gbWluTWF4WzBdO1xuICAgICAgICAgICAgaW5wdXQuc2V0VmFsdWUoaW5wdXRWYWwpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fc2V0SHVlKGlucHV0VmFsKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JSR0JGcm9tSFNWKCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySEVYRnJvbVJHQigpO1xuICAgICAgICB0aGlzLl91cGRhdGVIYW5kbGVTbGlkZXIoKTtcblxuICAgICAgICB0aGlzLl9kcmF3Q2FudmFzRmllbGQoKTtcbiAgICB9LFxuXG4gICAgX29uSW5wdXRTYXRDaGFuZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fc2V0U2F0KHRoaXMuX2dldFZhbHVlQ29udHJhaW5lZCh0aGlzLl9pbnB1dFNhdCwgdGhpcy5fdmFsdWVTYXRNaW5NYXgpKTtcbiAgICAgICAgdGhpcy5fb25JbnB1dFNWQ2hhbmdlKCk7XG4gICAgfSxcblxuICAgIF9vbklucHV0VmFsQ2hhbmdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3NldFZhbCh0aGlzLl9nZXRWYWx1ZUNvbnRyYWluZWQodGhpcy5faW5wdXRWYWwsIHRoaXMuX3ZhbHVlVmFsTWluTWF4KSk7XG4gICAgICAgIHRoaXMuX29uSW5wdXRTVkNoYW5nZSgpO1xuICAgIH0sXG5cbiAgICBfb25JbnB1dFJDaGFuZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fc2V0Uih0aGlzLl9nZXRWYWx1ZUNvbnRyYWluZWQodGhpcy5faW5wdXRSLCB0aGlzLl92YWx1ZVJHQk1pbk1heCkpO1xuICAgICAgICB0aGlzLl9vbklucHV0UkdCQ2hhbmdlKCk7XG4gICAgfSxcblxuICAgIF9vbklucHV0R0NoYW5nZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9zZXRHKHRoaXMuX2dldFZhbHVlQ29udHJhaW5lZCh0aGlzLl9pbnB1dEcsIHRoaXMuX3ZhbHVlUkdCTWluTWF4KSk7XG4gICAgICAgIHRoaXMuX29uSW5wdXRSR0JDaGFuZ2UoKTtcbiAgICB9LFxuXG4gICAgX29uSW5wdXRCQ2hhbmdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3NldEIodGhpcy5fZ2V0VmFsdWVDb250cmFpbmVkKHRoaXMuX2lucHV0QiwgdGhpcy5fdmFsdWVSR0JNaW5NYXgpKTtcbiAgICAgICAgdGhpcy5fb25JbnB1dFJHQkNoYW5nZSgpO1xuICAgIH0sXG5cbiAgICBfb25JbnB1dEhFWEZpbmlzaDogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaW5wdXQgPSB0aGlzLl9pbnB1dEhFWCxcbiAgICAgICAgICAgIHZhbHVlID0gaW5wdXQuZ2V0UHJvcGVydHkoJ3ZhbHVlJyk7XG5cbiAgICAgICAgaWYgKCFDb2xvclV0aWwuaXNWYWxpZEhFWCh2YWx1ZSkpIHtcbiAgICAgICAgICAgIGlucHV0LnNldFByb3BlcnR5KCd2YWx1ZScsIHRoaXMuX3ZhbHVlSEVYVmFsaWQpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fdmFsdWVIRVggPSB0aGlzLl92YWx1ZUhFWFZhbGlkID0gdmFsdWU7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9yRnJvbUhFWCgpO1xuICAgIH0sXG5cbiAgICBfb25JbnB1dFNWQ2hhbmdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9yUkdCRnJvbUhTVigpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhFWEZyb21SR0IoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlSGFuZGxlRmllbGQoKTtcbiAgICB9LFxuXG4gICAgX29uSW5wdXRSR0JDaGFuZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIU1ZGcm9tUkdCKCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySEVYRnJvbVJHQigpO1xuICAgICAgICB0aGlzLl91cGRhdGVIYW5kbGVzKCk7XG4gICAgfSxcblxuICAgIF9nZXRWYWx1ZUNvbnRyYWluZWQ6IGZ1bmN0aW9uIChpbnB1dCwgbWluTWF4KSB7XG4gICAgICAgIHZhciBpbnB1dFZhbCA9IE1hdGgucm91bmQoaW5wdXQuZ2V0VmFsdWUoKSksXG4gICAgICAgICAgICBtaW4gPSBtaW5NYXhbMF0sXG4gICAgICAgICAgICBtYXggPSBtaW5NYXhbMV07XG5cbiAgICAgICAgaWYgKGlucHV0VmFsIDw9IG1pbikge1xuICAgICAgICAgICAgaW5wdXRWYWwgPSBtaW47XG4gICAgICAgICAgICBpbnB1dC5zZXRWYWx1ZShpbnB1dFZhbCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlucHV0VmFsID49IG1heCkge1xuICAgICAgICAgICAgaW5wdXRWYWwgPSBtYXg7XG4gICAgICAgICAgICBpbnB1dC5zZXRWYWx1ZShpbnB1dFZhbCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaW5wdXRWYWw7XG4gICAgfSxcblxuXG4gICAgX3VwZGF0ZUlucHV0SHVlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2lucHV0SHVlLnNldFZhbHVlKHRoaXMuX3ZhbHVlSHVlKTtcbiAgICB9LFxuICAgIF91cGRhdGVJbnB1dFNhdDogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9pbnB1dFNhdC5zZXRWYWx1ZSh0aGlzLl92YWx1ZVNhdCk7XG4gICAgfSxcbiAgICBfdXBkYXRlSW5wdXRWYWw6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5faW5wdXRWYWwuc2V0VmFsdWUodGhpcy5fdmFsdWVWYWwpO1xuICAgIH0sXG4gICAgX3VwZGF0ZUlucHV0UjogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9pbnB1dFIuc2V0VmFsdWUodGhpcy5fdmFsdWVSKTtcbiAgICB9LFxuICAgIF91cGRhdGVJbnB1dEc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5faW5wdXRHLnNldFZhbHVlKHRoaXMuX3ZhbHVlRyk7XG4gICAgfSxcbiAgICBfdXBkYXRlSW5wdXRCOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2lucHV0Qi5zZXRWYWx1ZSh0aGlzLl92YWx1ZUIpO1xuICAgIH0sXG4gICAgX3VwZGF0ZUlucHV0SEVYOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2lucHV0SEVYLnNldFByb3BlcnR5KCd2YWx1ZScsIHRoaXMuX3ZhbHVlSEVYKTtcbiAgICB9LFxuXG5cbiAgICBfc2V0Q29sb3JIU1Y6IGZ1bmN0aW9uIChodWUsIHNhdCwgdmFsKSB7XG4gICAgICAgIHRoaXMuX3ZhbHVlSHVlID0gaHVlO1xuICAgICAgICB0aGlzLl92YWx1ZVNhdCA9IHNhdDtcbiAgICAgICAgdGhpcy5fdmFsdWVWYWwgPSB2YWw7XG5cbiAgICAgICAgdGhpcy5fdXBkYXRlSW5wdXRIdWUoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlSW5wdXRTYXQoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlSW5wdXRWYWwoKTtcblxuICAgICAgICB0aGlzLl91cGRhdGVDb250cmFzdEN1cnJDb2xvcigpO1xuICAgIH0sXG5cbiAgICBfc2V0Q29sb3JSR0I6IGZ1bmN0aW9uIChyLCBnLCBiKSB7XG4gICAgICAgIHRoaXMuX3ZhbHVlUiA9IHI7XG4gICAgICAgIHRoaXMuX3ZhbHVlRyA9IGc7XG4gICAgICAgIHRoaXMuX3ZhbHVlQiA9IGI7XG5cbiAgICAgICAgdGhpcy5fdXBkYXRlSW5wdXRSKCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUlucHV0RygpO1xuICAgICAgICB0aGlzLl91cGRhdGVJbnB1dEIoKTtcblxuICAgICAgICB0aGlzLl91cGRhdGVDb250cmFzdEN1cnJDb2xvcigpO1xuICAgIH0sXG5cbiAgICBfc2V0Q29sb3JIRVg6IGZ1bmN0aW9uIChoZXgpIHtcbiAgICAgICAgdGhpcy5fdmFsdWVIRVggPSBoZXg7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUlucHV0SEVYKCk7XG4gICAgfSxcblxuICAgIF91cGRhdGVDb2xvckhTVjogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9zZXRDb2xvckhTVih0aGlzLl92YWx1ZUh1ZSwgdGhpcy5fdmFsdWVTYXQsIHRoaXMuX3ZhbHVlVmFsKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29udHJhc3RDdXJyQ29sb3IoKTtcbiAgICB9LFxuXG4gICAgX3VwZGF0ZUNvbG9yUkdCOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3NldENvbG9yUkdCKHRoaXMuX3ZhbHVlUiwgdGhpcy5fdmFsdWVHLCB0aGlzLl92YWx1ZUIpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb250cmFzdEN1cnJDb2xvcigpO1xuICAgIH0sXG5cbiAgICBfdXBkYXRlQ29sb3JIU1ZGcm9tUkdCOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBoc3YgPSBDb2xvclV0aWwuUkdCMkhTVih0aGlzLl92YWx1ZVIsIHRoaXMuX3ZhbHVlRywgdGhpcy5fdmFsdWVCKTtcbiAgICAgICAgdGhpcy5fc2V0Q29sb3JIU1YoaHN2WzBdLCBoc3ZbMV0sIGhzdlsyXSk7XG4gICAgfSxcblxuICAgIF91cGRhdGVDb2xvclJHQkZyb21IU1Y6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHJnYiA9IENvbG9yVXRpbC5IU1YyUkdCKHRoaXMuX3ZhbHVlSHVlLCB0aGlzLl92YWx1ZVNhdCwgdGhpcy5fdmFsdWVWYWwpO1xuICAgICAgICB0aGlzLl9zZXRDb2xvclJHQihyZ2JbMF0sIHJnYlsxXSwgcmdiWzJdKTtcbiAgICB9LFxuXG4gICAgX3VwZGF0ZUNvbG9ySEVYRnJvbVJHQjogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaGV4ID0gQ29sb3JVdGlsLlJHQjJIRVgodGhpcy5fdmFsdWVSLCB0aGlzLl92YWx1ZUcsIHRoaXMuX3ZhbHVlQik7XG4gICAgICAgIHRoaXMuX3NldENvbG9ySEVYKGhleCk7XG4gICAgfSxcblxuICAgIF91cGRhdGVDb2xvckZyb21IRVg6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHJnYiA9IENvbG9yVXRpbC5IRVgyUkdCKHRoaXMuX3ZhbHVlSEVYKTtcblxuICAgICAgICB0aGlzLl9zZXRDb2xvclJHQihyZ2JbMF0sIHJnYlsxXSwgcmdiWzJdKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIU1ZGcm9tUkdCKCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUhhbmRsZXMoKTtcbiAgICB9LFxuXG4gICAgX3VwZGF0ZUNvbnRyYXN0Q3VyckNvbG9yOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3NldENvbnRyYXN0Q3VyckNvbG9yKHRoaXMuX3ZhbHVlUiwgdGhpcy5fdmFsdWVHLCB0aGlzLl92YWx1ZUIpO1xuICAgIH0sXG4gICAgX3VwZGF0ZUNvbnRyYXN0UHJldkNvbG9yOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3NldENvbnRyYXNQcmV2Q29sb3IodGhpcy5fdmFsdWVSLCB0aGlzLl92YWx1ZUcsIHRoaXMuX3ZhbHVlQilcbiAgICB9LFxuXG4gICAgX3NldENvbnRyYXN0Q3VyckNvbG9yOiBmdW5jdGlvbiAociwgZywgYikge1xuICAgICAgICB0aGlzLl9jb2xvckN1cnJOb2RlLnNldFN0eWxlUHJvcGVydHkoJ2JhY2tncm91bmQnLCAncmdiKCcgKyByICsgJywnICsgZyArICcsJyArIGIgKyAnKScpXG4gICAgfSxcbiAgICBfc2V0Q29udHJhc1ByZXZDb2xvcjogZnVuY3Rpb24gKHIsIGcsIGIpIHtcbiAgICAgICAgdGhpcy5fY29sb3JQcmV2Tm9kZS5zZXRTdHlsZVByb3BlcnR5KCdiYWNrZ3JvdW5kJywgJ3JnYignICsgciArICcsJyArIGcgKyAnLCcgKyBiICsgJyknKVxuICAgIH0sXG5cbiAgICBfb25IZWFkRHJhZ1N0YXJ0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBub2RlID0gdGhpcy5fbm9kZSxcbiAgICAgICAgICAgIHBhcmVudE5vZGUgPSB0aGlzLl9wYXJlbnROb2RlO1xuXG4gICAgICAgIHZhciBub2RlUG9zID0gbm9kZS5nZXRQb3NpdGlvbkdsb2JhbCgpLFxuICAgICAgICAgICAgbW91c2VQb3MgPSBNb3VzZS5nZXQoKS5nZXRQb3NpdGlvbigpLFxuICAgICAgICAgICAgb2Zmc2V0UG9zID0gdGhpcy5fbW91c2VPZmZzZXQ7XG5cbiAgICAgICAgb2Zmc2V0UG9zWzBdID0gbW91c2VQb3NbMF0gLSBub2RlUG9zWzBdO1xuICAgICAgICBvZmZzZXRQb3NbMV0gPSBtb3VzZVBvc1sxXSAtIG5vZGVQb3NbMV07XG5cbiAgICAgICAgdmFyIGV2ZW50TW91c2VNb3ZlID0gRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLFxuICAgICAgICAgICAgZXZlbnRNb3VzZVVwID0gRG9jdW1lbnRFdmVudC5NT1VTRV9VUDtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgdmFyIG9uRHJhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVQb3NpdGlvbigpO1xuICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUNhbnZhc05vZGVQb3NpdGlvbnMoKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIG9uRHJhZ0VuZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVDYW52YXNOb2RlUG9zaXRpb25zKCk7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlVXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICBwYXJlbnROb2RlLnJlbW92ZUNoaWxkKG5vZGUpO1xuICAgICAgICBwYXJlbnROb2RlLmFkZENoaWxkKG5vZGUpO1xuXG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZU1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VVcCwgb25EcmFnRW5kLCBmYWxzZSk7XG5cbiAgICAgICAgdGhpcy5fdXBkYXRlQ2FudmFzTm9kZVBvc2l0aW9ucygpO1xuICAgIH0sXG5cbiAgICBfdXBkYXRlUG9zaXRpb246IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG1vdXNlUG9zID0gTW91c2UuZ2V0KCkuZ2V0UG9zaXRpb24oKSxcbiAgICAgICAgICAgIG9mZnNldFBvcyA9IHRoaXMuX21vdXNlT2Zmc2V0O1xuXG4gICAgICAgIHZhciBjdXJyUG9zaXRpb25YID0gbW91c2VQb3NbMF0gLSBvZmZzZXRQb3NbMF0sXG4gICAgICAgICAgICBjdXJyUG9zaXRpb25ZID0gbW91c2VQb3NbMV0gLSBvZmZzZXRQb3NbMV07XG5cbiAgICAgICAgdmFyIG5vZGUgPSB0aGlzLl9ub2RlLFxuICAgICAgICAgICAgaGVhZCA9IHRoaXMuX2hlYWROb2RlLFxuICAgICAgICAgICAgcG9zaXRpb24gPSB0aGlzLl9wb3NpdGlvbjtcblxuICAgICAgICB2YXIgbWF4WCA9IHdpbmRvdy5pbm5lcldpZHRoIC0gbm9kZS5nZXRXaWR0aCgpLFxuICAgICAgICAgICAgbWF4WSA9IHdpbmRvdy5pbm5lckhlaWdodCAtIGhlYWQuZ2V0SGVpZ2h0KCk7XG5cbiAgICAgICAgcG9zaXRpb25bMF0gPSBNYXRoLm1heCgwLCBNYXRoLm1pbihjdXJyUG9zaXRpb25YLCBtYXhYKSk7XG4gICAgICAgIHBvc2l0aW9uWzFdID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oY3VyclBvc2l0aW9uWSwgbWF4WSkpO1xuXG4gICAgICAgIG5vZGUuc2V0UG9zaXRpb25HbG9iYWwocG9zaXRpb25bMF0sIHBvc2l0aW9uWzFdKTtcbiAgICB9LFxuXG4gICAgX2RyYXdDYW52YXNGaWVsZDogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzRmllbGQsXG4gICAgICAgICAgICBjb250ZXh0ID0gdGhpcy5fY29udGV4dENhbnZhc0ZpZWxkO1xuXG4gICAgICAgIHZhciB3aWR0aCA9IGNhbnZhcy53aWR0aCxcbiAgICAgICAgICAgIGhlaWdodCA9IGNhbnZhcy5oZWlnaHQsXG4gICAgICAgICAgICBpbnZXaWR0aCA9IDEgLyB3aWR0aCxcbiAgICAgICAgICAgIGludkhlaWdodCA9IDEgLyBoZWlnaHQ7XG5cbiAgICAgICAgdmFyIGltYWdlRGF0YSA9IHRoaXMuX2ltYWdlRGF0YUZpZWxkLFxuICAgICAgICAgICAgcmdiID0gW10sXG4gICAgICAgICAgICBpbmRleCA9IDA7XG5cbiAgICAgICAgdmFyIHZhbHVlSHVlID0gdGhpcy5fdmFsdWVIdWU7XG5cbiAgICAgICAgdmFyIGkgPSAtMSwgajtcbiAgICAgICAgd2hpbGUgKCsraSA8IGhlaWdodCkge1xuICAgICAgICAgICAgaiA9IC0xO1xuXG4gICAgICAgICAgICB3aGlsZSAoKytqIDwgd2lkdGgpIHtcbiAgICAgICAgICAgICAgICByZ2IgPSBDb2xvclV0aWwuSFNWMlJHQih2YWx1ZUh1ZSwgaiAqIGludldpZHRoICogMTAwLjAsICggMS4wIC0gaSAqIGludkhlaWdodCApICogMTAwLjApO1xuICAgICAgICAgICAgICAgIGluZGV4ID0gKGkgKiB3aWR0aCArIGopICogNDtcblxuICAgICAgICAgICAgICAgIGltYWdlRGF0YS5kYXRhW2luZGV4XSA9IHJnYlswXTtcbiAgICAgICAgICAgICAgICBpbWFnZURhdGEuZGF0YVtpbmRleCArIDFdID0gcmdiWzFdO1xuICAgICAgICAgICAgICAgIGltYWdlRGF0YS5kYXRhW2luZGV4ICsgMl0gPSByZ2JbMl07XG4gICAgICAgICAgICAgICAgaW1hZ2VEYXRhLmRhdGFbaW5kZXggKyAzXSA9IDI1NTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnRleHQucHV0SW1hZ2VEYXRhKGltYWdlRGF0YSwgMCwgMCk7XG4gICAgfSxcblxuICAgIF9kcmF3Q2FudmFzU2xpZGVyOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXNTbGlkZXIsXG4gICAgICAgICAgICBjb250ZXh0ID0gdGhpcy5fY29udGV4dENhbnZhc1NsaWRlcjtcblxuICAgICAgICB2YXIgd2lkdGggPSBjYW52YXMud2lkdGgsXG4gICAgICAgICAgICBoZWlnaHQgPSBjYW52YXMuaGVpZ2h0LFxuICAgICAgICAgICAgaW52SGVpZ2h0ID0gMSAvIGhlaWdodDtcblxuICAgICAgICB2YXIgaW1hZ2VEYXRhID0gdGhpcy5faW1hZ2VEYXRhU2xpZGVyLFxuICAgICAgICAgICAgcmdiID0gW10sXG4gICAgICAgICAgICBpbmRleCA9IDA7XG5cbiAgICAgICAgdmFyIGkgPSAtMSwgajtcbiAgICAgICAgd2hpbGUgKCsraSA8IGhlaWdodCkge1xuICAgICAgICAgICAgaiA9IC0xO1xuXG4gICAgICAgICAgICB3aGlsZSAoKytqIDwgd2lkdGgpIHtcbiAgICAgICAgICAgICAgICByZ2IgPSBDb2xvclV0aWwuSFNWMlJHQigoMS4wIC0gaSAqIGludkhlaWdodCkgKiAzNjAuMCwgMTAwLjAsIDEwMC4wKTtcbiAgICAgICAgICAgICAgICBpbmRleCA9IChpICogd2lkdGggKyBqKSAqIDQ7XG5cbiAgICAgICAgICAgICAgICBpbWFnZURhdGEuZGF0YVtpbmRleF0gPSByZ2JbMF07XG4gICAgICAgICAgICAgICAgaW1hZ2VEYXRhLmRhdGFbaW5kZXggKyAxXSA9IHJnYlsxXTtcbiAgICAgICAgICAgICAgICBpbWFnZURhdGEuZGF0YVtpbmRleCArIDJdID0gcmdiWzJdO1xuICAgICAgICAgICAgICAgIGltYWdlRGF0YS5kYXRhW2luZGV4ICsgM10gPSAyNTU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb250ZXh0LnB1dEltYWdlRGF0YShpbWFnZURhdGEsIDAsIDApO1xuXG4gICAgfSxcblxuICAgIF9vbkNhbnZhc0ZpZWxkTW91c2VEb3duOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBldmVudE1vdXNlTW92ZSA9IERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSxcbiAgICAgICAgICAgIGV2ZW50TW91c2VVcCA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIHZhciBvbkRyYWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fZHJhd0hhbmRsZUZpZWxkKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25EcmFnRW5kID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZU1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcblxuICAgICAgICBzZWxmLl9kcmF3SGFuZGxlRmllbGQoKTtcbiAgICB9LFxuXG4gICAgX29uQ2FudmFzU2xpZGVyTW91c2VEb3duOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBldmVudE1vdXNlTW92ZSA9IERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSxcbiAgICAgICAgICAgIGV2ZW50TW91c2VVcCA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIHZhciBvbkRyYWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fZHJhd0hhbmRsZVNsaWRlcigpO1xuICAgICAgICAgICAgICAgIHNlbGYuX2RyYXdDYW52YXNGaWVsZCgpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb25EcmFnRW5kID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZU1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBzZWxmLl9kcmF3Q2FudmFzRmllbGQoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcblxuICAgICAgICBzZWxmLl9kcmF3SGFuZGxlU2xpZGVyKCk7XG4gICAgICAgIHNlbGYuX2RyYXdDYW52YXNGaWVsZCgpO1xuICAgIH0sXG5cbiAgICBfc2V0U2l6ZUNhbnZhc0ZpZWxkOiBmdW5jdGlvbiAod2lkdGgsIGhlaWdodCkge1xuICAgICAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzRmllbGQ7XG4gICAgICAgIGNhbnZhcy5zdHlsZS53aWR0aCA9IHdpZHRoICsgJ3B4JztcbiAgICAgICAgY2FudmFzLnN0eWxlLmhlaWdodCA9IGhlaWdodCArICdweCc7XG4gICAgICAgIGNhbnZhcy53aWR0aCA9IHdpZHRoO1xuICAgICAgICBjYW52YXMuaGVpZ2h0ID0gaGVpZ2h0O1xuXG4gICAgfSxcblxuICAgIF9zZXRTaXplQ2FudmFzU2xpZGVyOiBmdW5jdGlvbiAod2lkdGgsIGhlaWdodCkge1xuICAgICAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzU2xpZGVyO1xuICAgICAgICBjYW52YXMuc3R5bGUud2lkdGggPSB3aWR0aCArICdweCc7XG4gICAgICAgIGNhbnZhcy5zdHlsZS5oZWlnaHQgPSBoZWlnaHQgKyAncHgnO1xuICAgICAgICBjYW52YXMud2lkdGggPSB3aWR0aDtcbiAgICAgICAgY2FudmFzLmhlaWdodCA9IGhlaWdodDtcbiAgICB9LFxuXG4gICAgb3BlbjogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbm9kZSA9IHRoaXMuX25vZGU7XG5cbiAgICAgICAgdGhpcy5fcGFyZW50Tm9kZS5hZGRDaGlsZChub2RlKTtcblxuICAgICAgICB2YXIgcG9zaXRpb24gPSB0aGlzLl9wb3NpdGlvbjtcbiAgICAgICAgaWYocG9zaXRpb25bMF0gPT09IG51bGwgfHwgcG9zaXRpb25bMV0gPT09IG51bGwpe1xuICAgICAgICAgICAgcG9zaXRpb25bMF0gPSB3aW5kb3cuaW5uZXJXaWR0aCAqIDAuNSAtIG5vZGUuZ2V0V2lkdGgoKSAqIDAuNTtcbiAgICAgICAgICAgIHBvc2l0aW9uWzFdID0gd2luZG93LmlubmVySGVpZ2h0ICogMC41IC0gbm9kZS5nZXRIZWlnaHQoKSAqIDAuNTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBvc2l0aW9uWzBdID0gTWF0aC5tYXgoMCxNYXRoLm1pbihwb3NpdGlvblswXSx3aW5kb3cuaW5uZXJXaWR0aCAtIG5vZGUuZ2V0V2lkdGgoKSkpO1xuICAgICAgICAgICAgcG9zaXRpb25bMV0gPSBNYXRoLm1heCgwLE1hdGgubWluKHBvc2l0aW9uWzFdLHdpbmRvdy5pbm5lckhlaWdodCAtIG5vZGUuZ2V0SGVpZ2h0KCkpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG5vZGUuc2V0UG9zaXRpb25HbG9iYWwocG9zaXRpb25bMF0scG9zaXRpb25bMV0pO1xuICAgICAgICB0aGlzLl91cGRhdGVDYW52YXNOb2RlUG9zaXRpb25zKCk7XG4gICAgfSxcblxuICAgIGNsb3NlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3BhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5fbm9kZSk7XG4gICAgfSxcblxuICAgIF9vbkNsb3NlOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICBlLmNhbmNlbEJ1YmJsZSA9IHRydWU7XG4gICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICB9LFxuICAgIF9vblBpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fY2FsbGJhY2tQaWNrKCk7XG4gICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICB9LFxuXG4gICAgX3VwZGF0ZUNhbnZhc05vZGVQb3NpdGlvbnM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNhbnZhc1NsaWRlclBvcyA9IHRoaXMuX2NhbnZhc1NsaWRlclBvcyxcbiAgICAgICAgICAgIGNhbnZhc0ZpZWxkUG9zID0gdGhpcy5fY2FudmFzRmllbGRQb3M7XG5cbiAgICAgICAgY2FudmFzU2xpZGVyUG9zWzBdID0gY2FudmFzU2xpZGVyUG9zWzFdID0gMDtcbiAgICAgICAgY2FudmFzRmllbGRQb3NbMF0gPSBjYW52YXNGaWVsZFBvc1sxXSA9IDA7XG5cbiAgICAgICAgdmFyIGVsZW1lbnQgPSB0aGlzLl9jYW52YXNTbGlkZXI7XG5cbiAgICAgICAgd2hpbGUgKGVsZW1lbnQpIHtcbiAgICAgICAgICAgIGNhbnZhc1NsaWRlclBvc1swXSArPSBlbGVtZW50Lm9mZnNldExlZnQ7XG4gICAgICAgICAgICBjYW52YXNTbGlkZXJQb3NbMV0gKz0gZWxlbWVudC5vZmZzZXRUb3A7XG4gICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudC5vZmZzZXRQYXJlbnQ7XG4gICAgICAgIH1cblxuICAgICAgICBlbGVtZW50ID0gdGhpcy5fY2FudmFzRmllbGQ7XG5cbiAgICAgICAgd2hpbGUgKGVsZW1lbnQpIHtcbiAgICAgICAgICAgIGNhbnZhc0ZpZWxkUG9zWzBdICs9IGVsZW1lbnQub2Zmc2V0TGVmdDtcbiAgICAgICAgICAgIGNhbnZhc0ZpZWxkUG9zWzFdICs9IGVsZW1lbnQub2Zmc2V0VG9wO1xuICAgICAgICAgICAgZWxlbWVudCA9IGVsZW1lbnQub2Zmc2V0UGFyZW50O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHNldENhbGxiYWNrUGljazogZnVuY3Rpb24gKGZ1bmMpIHtcbiAgICAgICAgdGhpcy5fY2FsbGJhY2tQaWNrID0gZnVuYztcbiAgICB9LFxuXG4gICAgc2V0Q29sb3JIRVg6IGZ1bmN0aW9uIChoZXgpIHtcbiAgICAgICAgdGhpcy5fc2V0Q29sb3JIRVgoaGV4KTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JGcm9tSEVYKCk7XG4gICAgICAgIHRoaXMuX3NldENvbG9yKCk7XG4gICAgfSxcblxuICAgIHNldENvbG9yUkdCOiBmdW5jdGlvbiAociwgZywgYikge1xuICAgICAgICB0aGlzLl9zZXRDb2xvclJHQihyLCBnLCBiKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIRVhGcm9tUkdCKCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySFNWRnJvbVJHQigpO1xuICAgICAgICB0aGlzLl9zZXRDb2xvcigpO1xuICAgIH0sXG5cbiAgICBzZXRDb2xvclJHQmZ2OiBmdW5jdGlvbiAociwgZywgYikge1xuICAgICAgICB0aGlzLnNldENvbG9yUkdCKE1hdGguZmxvb3IociAqIDI1NS4wKSxcbiAgICAgICAgICAgIE1hdGguZmxvb3IoZyAqIDI1NS4wKSxcbiAgICAgICAgICAgIE1hdGguZmxvb3IoYiAqIDI1NS4wKSk7XG4gICAgfSxcblxuICAgIHNldENvbG9ySFNWOiBmdW5jdGlvbiAoaCwgcywgdikge1xuICAgICAgICB0aGlzLl9zZXRDb2xvckhTVihoLCBzLCB2KTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JSR0JGcm9tSFNWKCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySEVYRnJvbVJHQigpO1xuICAgICAgICB0aGlzLl9zZXRDb2xvcigpO1xuICAgIH0sXG5cbiAgICBfc2V0Q29sb3I6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fZHJhd0NhbnZhc0ZpZWxkKCk7XG4gICAgICAgIHRoaXMuX2RyYXdDYW52YXNTbGlkZXIoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlSGFuZGxlcygpO1xuICAgICAgICB0aGlzLl9zZXRDb250cmFzUHJldkNvbG9yKHRoaXMuX3ZhbHVlUiwgdGhpcy5fdmFsdWVHLCB0aGlzLl92YWx1ZUIpO1xuICAgIH0sXG5cbiAgICBnZXRSOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl92YWx1ZVI7XG4gICAgfSxcbiAgICBnZXRHOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl92YWx1ZUc7XG4gICAgfSxcbiAgICBnZXRCOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl92YWx1ZUI7XG4gICAgfSxcbiAgICBnZXRSR0I6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIFt0aGlzLl92YWx1ZVIsIHRoaXMuX3ZhbHVlRywgdGhpcy5fdmFsdWVCXTtcbiAgICB9LFxuICAgIGdldEh1ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdmFsdWVIdWU7XG4gICAgfSxcbiAgICBnZXRTYXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3ZhbHVlU2F0O1xuICAgIH0sXG4gICAgZ2V0VmFsOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl92YWx1ZVZhbDtcbiAgICB9LFxuICAgIGdldEhTVjogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gW3RoaXMuX3ZhbHVlSHVlLCB0aGlzLl92YWx1ZVNhdCwgdGhpcy5fdmFsdWVWYWxdO1xuICAgIH0sXG4gICAgZ2V0SEVYOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl92YWx1ZUhFWDtcbiAgICB9LFxuICAgIGdldFJHQmZ2OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBbdGhpcy5fdmFsdWVSIC8gMjU1LjAsIHRoaXMuX3ZhbHVlRyAvIDI1NS4wLCB0aGlzLl92YWx1ZUIgLyAyNTUuMF07XG4gICAgfSxcblxuICAgIGdldE5vZGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX25vZGU7XG4gICAgfVxufTtcblxuUGlja2VyLnNldHVwID0gZnVuY3Rpb24gKHBhcmVudE5vZGUpIHtcbiAgICByZXR1cm4gUGlja2VyLl9pbnN0YW5jZSA9IG5ldyBQaWNrZXIocGFyZW50Tm9kZSk7XG59O1xuUGlja2VyLmdldCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gUGlja2VyLl9pbnN0YW5jZTtcbn07XG5QaWNrZXIuZGVzdHJveSA9IGZ1bmN0aW9uKCl7XG4gICAgUGlja2VyLl9pbnN0YW5jZSA9IG51bGw7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBpY2tlcjsiLCJ2YXIgU1ZHQ29tcG9uZW50ID0gcmVxdWlyZSgnLi9TVkdDb21wb25lbnQnKTtcblxuZnVuY3Rpb24gUGxvdHRlcihwYXJlbnQsb2JqZWN0LHZhbHVlLHBhcmFtcykge1xuICAgIHBhcmFtcyA9IHBhcmFtcyB8fCB7fTtcbiAgICBwYXJhbXMubGluZVdpZHRoICA9IHBhcmFtcy5saW5lV2lkdGggIHx8IDI7XG4gICAgcGFyYW1zLmxpbmVDb2xvciAgPSBwYXJhbXMubGluZUNvbG9yICB8fCBbMjU1LDI1NSwyNTVdO1xuXG4gICAgU1ZHQ29tcG9uZW50LmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuICAgIHZhciBsaW5lV2lkdGggPSB0aGlzLl9saW5lV2lkdGggPSBwYXJhbXMubGluZVdpZHRoO1xuICAgIHZhciBsaW5lQ29sb3IgPSBwYXJhbXMubGluZUNvbG9yO1xuXG4gICAgdmFyIGdyaWQgPSB0aGlzLl9ncmlkID0gdGhpcy5fc3ZnUm9vdC5hcHBlbmRDaGlsZCh0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ3BhdGgnKSk7XG4gICAgICAgIGdyaWQuc3R5bGUuc3Ryb2tlID0gJ3JnYigyNiwyOSwzMSknO1xuXG4gICAgdmFyIHBhdGggPSB0aGlzLl9wYXRoID0gdGhpcy5fc3ZnUm9vdC5hcHBlbmRDaGlsZCh0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ3BhdGgnKSk7XG4gICAgICAgIHBhdGguc3R5bGUuc3Ryb2tlICAgICAgPSAncmdiKCcrbGluZUNvbG9yWzBdKycsJytsaW5lQ29sb3JbMV0rJywnK2xpbmVDb2xvclsyXSsnKSc7XG4gICAgICAgIHBhdGguc3R5bGUuc3Ryb2tlV2lkdGggPSBsaW5lV2lkdGggO1xuICAgICAgICBwYXRoLnN0eWxlLmZpbGwgICAgICAgID0gJ25vbmUnO1xufVxuUGxvdHRlci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFNWR0NvbXBvbmVudC5wcm90b3R5cGUpO1xuUGxvdHRlci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBQbG90dGVyO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBsb3R0ZXI7XG4iLCJ2YXIgT2JqZWN0Q29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY29yZS9PYmplY3RDb21wb25lbnQnKTtcbnZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XG52YXIgTnVtYmVySW5wdXRfSW50ZXJuYWwgPSByZXF1aXJlKCcuL051bWJlcklucHV0X0ludGVybmFsJyk7XG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcblxudmFyIEV2ZW50XyAgICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIENvbXBvbmVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9Db21wb25lbnRFdmVudCcpO1xuXG52YXIgREVGQVVMVF9TVEVQID0gMS4wLFxuICAgIERFRkFVTFRfRFAgICA9IDI7XG5cbmZ1bmN0aW9uIFJhbmdlKHBhcmVudCwgb2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgT2JqZWN0Q29tcG9uZW50LmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuICAgIHBhcmFtcyAgICAgICAgICA9IHBhcmFtcyAgICAgICAgICB8fCB7fTtcbiAgICBwYXJhbXMub25DaGFuZ2UgPSBwYXJhbXMub25DaGFuZ2UgfHwgdGhpcy5fb25DaGFuZ2U7XG4gICAgcGFyYW1zLnN0ZXAgICAgID0gcGFyYW1zLnN0ZXAgfHwgREVGQVVMVF9TVEVQO1xuICAgIHBhcmFtcy5kcCAgICAgICA9IHBhcmFtcy5kcCAgIHx8IERFRkFVTFRfRFA7XG5cbiAgICB0aGlzLl9vbkNoYW5nZSAgPSBwYXJhbXMub25DaGFuZ2U7XG5cbiAgICB2YXIgc3RlcCA9IHRoaXMuX3N0ZXAgPSBwYXJhbXMuc3RlcCxcbiAgICAgICAgZHAgICA9IHRoaXMuX2RwICAgPSBwYXJhbXMuZHA7XG5cbiAgICAvL0ZJWE1FOiBoaXN0b3J5IHB1c2ggcG9wXG5cbiAgICB2YXIgbGFiZWxNaW4gPSBuZXcgTm9kZSgpO1xuICAgIHZhciBpbnB1dE1pbiA9IHRoaXMuX2lucHV0TWluID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHN0ZXAsZHAsIHRoaXMucHVzaEhpc3RvcnlTdGF0ZS5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX29uSW5wdXRNaW5DaGFuZ2UuYmluZCh0aGlzKSk7XG5cbiAgICB2YXIgbGFiZWxNYXggPSBuZXcgTm9kZSgpO1xuICAgIHZhciBpbnB1dE1heCA9IHRoaXMuX2lucHV0TWF4ID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHN0ZXAsZHAsIHRoaXMucHVzaEhpc3RvcnlTdGF0ZS5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX29uSW5wdXRNYXhDaGFuZ2UuYmluZCh0aGlzKSk7XG5cbiAgICB2YXIgbGFiZWxNaW5XcmFwID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5XcmFwKSxcbiAgICAgICAgaW5wdXRNaW5XcmFwID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5XcmFwKSxcbiAgICAgICAgbGFiZWxNYXhXcmFwID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5XcmFwKSxcbiAgICAgICAgaW5wdXRNYXhXcmFwID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5XcmFwKTtcblxuICAgIGxhYmVsTWluLnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywgJ01JTicpO1xuICAgIGxhYmVsTWF4LnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywgJ01BWCcpO1xuXG4gICAgdmFyIHZhbHVlcyA9IHRoaXMuX29ialt0aGlzLl9rZXldO1xuXG4gICAgaW5wdXRNaW4uc2V0VmFsdWUodmFsdWVzWzBdKTtcbiAgICBpbnB1dE1heC5zZXRWYWx1ZSh2YWx1ZXNbMV0pO1xuXG4gICAgdmFyIHdyYXAgPSB0aGlzLl93cmFwTm9kZTtcblxuICAgIGxhYmVsTWluV3JhcC5hZGRDaGlsZChsYWJlbE1pbik7XG4gICAgaW5wdXRNaW5XcmFwLmFkZENoaWxkKGlucHV0TWluLmdldE5vZGUoKSk7XG4gICAgbGFiZWxNYXhXcmFwLmFkZENoaWxkKGxhYmVsTWF4KTtcbiAgICBpbnB1dE1heFdyYXAuYWRkQ2hpbGQoaW5wdXRNYXguZ2V0Tm9kZSgpKTtcblxuICAgIHdyYXAuYWRkQ2hpbGQobGFiZWxNaW5XcmFwKTtcbiAgICB3cmFwLmFkZENoaWxkKGlucHV0TWluV3JhcCk7XG4gICAgd3JhcC5hZGRDaGlsZChsYWJlbE1heFdyYXApO1xuICAgIHdyYXAuYWRkQ2hpbGQoaW5wdXRNYXhXcmFwKTtcbn1cblJhbmdlLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZSk7XG5SYW5nZS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBSYW5nZTtcblxuUmFuZ2UucHJvdG90eXBlLl9vbklucHV0Q2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIG51bGwpKTtcbiAgICB0aGlzLl9vbkNoYW5nZSgpO1xufTtcblxuUmFuZ2UucHJvdG90eXBlLl91cGRhdGVWYWx1ZU1pbiA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdmFsdWVzID0gdGhpcy5fb2JqW3RoaXMuX2tleV07XG5cbiAgICB2YXIgaW5wdXRNaW4gPSB0aGlzLl9pbnB1dE1pbixcbiAgICAgICAgaW5wdXRWYWx1ZSA9IGlucHV0TWluLmdldFZhbHVlKCk7XG5cbiAgICBpZiAoaW5wdXRWYWx1ZSA+PSB0aGlzLl9pbnB1dE1heC5nZXRWYWx1ZSgpKSB7XG4gICAgICAgIGlucHV0TWluLnNldFZhbHVlKHZhbHVlc1swXSk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFsdWVzWzBdID0gaW5wdXRWYWx1ZTtcblxufTtcblxuUmFuZ2UucHJvdG90eXBlLl91cGRhdGVWYWx1ZU1heCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdmFsdWVzID0gdGhpcy5fb2JqW3RoaXMuX2tleV07XG5cbiAgICB2YXIgaW5wdXRNYXggPSB0aGlzLl9pbnB1dE1heCxcbiAgICAgICAgaW5wdXRWYWx1ZSA9IGlucHV0TWF4LmdldFZhbHVlKCk7XG5cbiAgICBpZiAoaW5wdXRWYWx1ZSA8PSB0aGlzLl9pbnB1dE1pbi5nZXRWYWx1ZSgpKSB7XG4gICAgICAgIGlucHV0TWF4LnNldFZhbHVlKHZhbHVlc1sxXSk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFsdWVzWzFdID0gaW5wdXRWYWx1ZTtcbn07XG5cblxuUmFuZ2UucHJvdG90eXBlLm9uVmFsdWVVcGRhdGUgPSBmdW5jdGlvbiAoZSkge1xuICAgIGlmIChlLmRhdGEub3JpZ2luID09IHRoaXMpe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChlLmRhdGEub3JpZ2luID09IG51bGwpIHtcbiAgICB9XG4gICAgdmFyIG8gPSB0aGlzLl9vYmosayA9IHRoaXMuX2tleTtcbiAgICB0aGlzLl9pbnB1dE1pbi5zZXRWYWx1ZShvW2tdWzBdKTtcbiAgICB0aGlzLl9pbnB1dE1heC5zZXRWYWx1ZShvW2tdWzFdKTtcbn07XG5cblJhbmdlLnByb3RvdHlwZS5zZXRWYWx1ZSA9IGZ1bmN0aW9uKHZhbHVlKXtcbiAgICB2YXIgbyA9IHRoaXMuX29iaixrID0gdGhpcy5fa2V5O1xuICAgIG9ba11bMF0gPSB2YWx1ZVswXTtcbiAgICBvW2tdWzFdID0gdmFsdWVbMV07XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcyxDb21wb25lbnRFdmVudC5WQUxVRV9VUERBVEVELG51bGwpKTtcbn07XG5cblJhbmdlLnByb3RvdHlwZS5fb25JbnB1dE1pbkNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl91cGRhdGVWYWx1ZU1pbigpO1xuICAgIHRoaXMuX29uSW5wdXRDaGFuZ2UoKTtcbn07XG5cblJhbmdlLnByb3RvdHlwZS5fb25JbnB1dE1heENoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl91cGRhdGVWYWx1ZU1heCgpO1xuICAgIHRoaXMuX29uSW5wdXRDaGFuZ2UoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUmFuZ2U7IiwidmFyIENvbXBvbmVudCA9IHJlcXVpcmUoJy4vLi4vY29yZS9Db21wb25lbnQnKTtcbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xudmFyIE1ldHJpYyA9IHJlcXVpcmUoJy4vTWV0cmljJyk7XG52YXIgR3JvdXBFdmVudCA9IHJlcXVpcmUoJy4uL2dyb3VwL0dyb3VwRXZlbnQnKTtcblxuZnVuY3Rpb24gU1ZHKHBhcmVudCwgcGFyYW1zKSB7XG4gICAgQ29tcG9uZW50LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICB2YXIgd3JhcCA9IHRoaXMuX3dyYXBOb2RlO1xuICAgICAgICB3cmFwLnNldFN0eWxlQ2xhc3MoQ1NTLkNhbnZhc1dyYXApO1xuICAgIHZhciB3cmFwU2l6ZSA9IHdyYXAuZ2V0V2lkdGgoKTtcblxuICAgIHZhciBzdmcgPSB0aGlzLl9zdmcgPSB0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ3N2ZycpO1xuICAgICAgICBzdmcuc2V0QXR0cmlidXRlKCd2ZXJzaW9uJywgJzEuMicpO1xuICAgICAgICBzdmcuc2V0QXR0cmlidXRlKCdiYXNlUHJvZmlsZScsICd0aW55Jyk7XG4gICAgICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ3ByZXNlcnZlQXNwZWN0UmF0aW8nLCAndHJ1ZScpO1xuXG4gICAgd3JhcC5nZXRFbGVtZW50KCkuYXBwZW5kQ2hpbGQoc3ZnKTtcblxuICAgIHRoaXMuX3N2Z1NldFNpemUod3JhcFNpemUsIHdyYXBTaXplKTtcbiAgICB0aGlzLl91cGRhdGVIZWlnaHQoKTtcblxuICAgIHRoaXMuX25vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQ2FudmFzTGlzdEl0ZW0pO1xuXG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSwgdGhpcywgJ29uR3JvdXBTaXplQ2hhbmdlJyk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuR1JPVVBfU0laRV9VUERBVEUsIHRoaXMuX3BhcmVudCwgJ29uR3JvdXBTaXplVXBkYXRlJyk7XG59XG5TVkcucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShDb21wb25lbnQucHJvdG90eXBlKTtcblNWRy5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTVkc7XG5cblNWRy5wcm90b3R5cGUuX3VwZGF0ZUhlaWdodCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc3ZnSGVpZ2h0ID0gTnVtYmVyKHRoaXMuX3N2Zy5nZXRBdHRyaWJ1dGUoJ2hlaWdodCcpKTtcbiAgICB0aGlzLl93cmFwTm9kZS5zZXRIZWlnaHQoc3ZnSGVpZ2h0KTtcbiAgICB0aGlzLl9ub2RlLnNldEhlaWdodChzdmdIZWlnaHQgKyBNZXRyaWMuUEFERElOR19XUkFQUEVSKTtcbn07XG5cblNWRy5wcm90b3R5cGUub25Hcm91cFNpemVDaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHdpZHRoID0gdGhpcy5fd3JhcE5vZGUuZ2V0V2lkdGgoKTtcbiAgICB0aGlzLl9zdmdTZXRTaXplKHdpZHRoLCB3aWR0aCk7XG4gICAgdGhpcy5fdXBkYXRlSGVpZ2h0KCk7XG59O1xuXG5TVkcucHJvdG90eXBlLl9zdmdTZXRTaXplID0gZnVuY3Rpb24gKHdpZHRoLCBoZWlnaHQpIHtcbiAgICB2YXIgc3ZnID0gdGhpcy5fc3ZnO1xuICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgd2lkdGgpO1xuICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIGhlaWdodCk7XG4gICAgc3ZnLnNldEF0dHJpYnV0ZSgndmlld2JveCcsICcwIDAgJyArIHdpZHRoICsgJyAnICsgaGVpZ2h0KTtcbn07XG5cblNWRy5wcm90b3R5cGUuZ2V0U1ZHID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9zdmc7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNWRzsiLCJ2YXIgT2JqZWN0Q29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY29yZS9PYmplY3RDb21wb25lbnQnKTtcbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xudmFyIEdyb3VwRXZlbnQgPSByZXF1aXJlKCcuLi9ncm91cC9Hcm91cEV2ZW50Jyk7XG52YXIgTWV0cmljID0gcmVxdWlyZSgnLi9NZXRyaWMnKTtcblxuZnVuY3Rpb24gU1ZHQ29tcG9uZW50KHBhcmVudCxvYmplY3QsdmFsdWUscGFyYW1zKXtcbiAgICBPYmplY3RDb21wb25lbnQuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG4gICAgdmFyIHdyYXAgPSB0aGlzLl93cmFwTm9kZTtcbiAgICAgICAgd3JhcC5zZXRTdHlsZUNsYXNzKENTUy5TVkdXcmFwKTtcbiAgICB2YXIgd3JhcFNpemUgPSB3cmFwLmdldFdpZHRoKCk7XG5cbiAgICB2YXIgc3ZnID0gdGhpcy5fc3ZnID0gdGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdzdmcnKTtcbiAgICAgICAgc3ZnLnNldEF0dHJpYnV0ZSgndmVyc2lvbicsICcxLjInKTtcbiAgICAgICAgc3ZnLnNldEF0dHJpYnV0ZSgnYmFzZVByb2ZpbGUnLCAndGlueScpO1xuXG4gICAgICAgIHdyYXAuZ2V0RWxlbWVudCgpLmFwcGVuZENoaWxkKHN2Zyk7XG5cbiAgICB2YXIgc3ZnUm9vdCA9IHRoaXMuX3N2Z1Jvb3QgPSBzdmcuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdnJykpO1xuICAgICAgICBzdmdSb290LnNldEF0dHJpYnV0ZSgndHJhbnNmb3JtJywndHJhbnNsYXRlKDAuNSAwLjUpJyk7XG5cbiAgICB0aGlzLl9zdmdTZXRTaXplKHdyYXBTaXplLHdyYXBTaXplKTtcbiAgICB0aGlzLl91cGRhdGVIZWlnaHQoKTtcblxuICAgIHRoaXMuX25vZGUuc2V0U3R5bGVDbGFzcyhDU1MuU1ZHTGlzdEl0ZW0pO1xuXG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSwgdGhpcywgJ29uR3JvdXBTaXplQ2hhbmdlJyk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuR1JPVVBfU0laRV9VUERBVEUsIHRoaXMuX3BhcmVudCwgJ29uR3JvdXBTaXplVXBkYXRlJyk7XG59XG5TVkdDb21wb25lbnQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShPYmplY3RDb21wb25lbnQucHJvdG90eXBlKTtcblNWR0NvbXBvbmVudC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTVkdDb21wb25lbnQ7XG5cblNWR0NvbXBvbmVudC5wcm90b3R5cGUuX3VwZGF0ZUhlaWdodCA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHN2Z0hlaWdodCA9IE51bWJlcih0aGlzLl9zdmcuZ2V0QXR0cmlidXRlKCdoZWlnaHQnKSk7XG5cbiAgICB0aGlzLl93cmFwTm9kZS5zZXRIZWlnaHQoc3ZnSGVpZ2h0KTtcbiAgICB0aGlzLl9ub2RlLnNldEhlaWdodChzdmdIZWlnaHQgKyBNZXRyaWMuUEFERElOR19XUkFQUEVSKTtcbn07XG5cblNWR0NvbXBvbmVudC5wcm90b3R5cGUuX3JlZHJhdyA9IGZ1bmN0aW9uKCl7fTtcblxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5vbkdyb3VwU2l6ZUNoYW5nZSA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHdpZHRoID0gdGhpcy5fd3JhcE5vZGUuZ2V0V2lkdGgoKTtcblxuICAgIHRoaXMuX3N2Z1NldFNpemUod2lkdGgsd2lkdGgpO1xuICAgIHRoaXMuX3VwZGF0ZUhlaWdodCgpO1xuICAgIHRoaXMuX3JlZHJhdygpO1xufTtcblxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5fY3JlYXRlU1ZHT2JqZWN0ID0gZnVuY3Rpb24odHlwZSkge1xuICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiLHR5cGUpO1xufTtcblxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5fc3ZnU2V0U2l6ZSA9IGZ1bmN0aW9uKHdpZHRoLGhlaWdodCkge1xuICAgIHZhciBzdmcgPSB0aGlzLl9zdmc7XG4gICAgICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgIHdpZHRoKTtcbiAgICAgICAgc3ZnLnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgaGVpZ2h0KTtcbiAgICAgICAgc3ZnLnNldEF0dHJpYnV0ZSgndmlld2JveCcsICcwIDAgJyArIHdpZHRoICsgJyAnICsgaGVpZ2h0KTtcbn07XG5cblxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5fcGF0aENtZE1vdmVUbyA9IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgcmV0dXJuICdNICcgKyB4ICsgJyAnICsgeSArICcgJztcbn07XG5cblNWR0NvbXBvbmVudC5wcm90b3R5cGUuX3BhdGhDbWRMaW5lVG8gPSBmdW5jdGlvbiAoeCwgeSkge1xuICAgIHJldHVybiAnTCAnICsgeCArICcgJyArIHkgKyAnICc7XG59O1xuXG5TVkdDb21wb25lbnQucHJvdG90eXBlLl9wYXRoQ21kQ2xvc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICdaJztcbn07XG5cblNWR0NvbXBvbmVudC5wcm90b3R5cGUuX3BhdGhDbWRMaW5lID0gZnVuY3Rpb24gKHgwLCB5MCwgeDEsIHkxKSB7XG4gICAgcmV0dXJuICdNICcgKyB4MCArICcgJyArIHkwICsgJyBMICcgKyB4MSArICcgJyArIHkxO1xufTtcblxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5fcGF0aENtZEJlemllckN1YmljID0gZnVuY3Rpb24gKGNtZCwgeDAsIHkwLCBjeDAsIGN5MCwgY3gxLCBjeTEsIHgxLCB5MSkge1xuICAgIHJldHVybiAnTSAnICsgeDAgKyAnICcgKyB5MCArICcgQyAnICsgY3gwICsgJyAnICsgY3kwICsgJywgJyArIGN4MSArICcgJyArIGN5MSArICcsICcgKyB4MSArICcgJyArIHkxO1xufTtcblxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5fcGF0aENtZEJlemllclF1YWRyYXRpYyA9IGZ1bmN0aW9uIChjbWQsIHgwLCB5MCwgY3gsIGN5LCB4MSwgeTEpIHtcbiAgICByZXR1cm4gJ00gJyArIHgwICsgJyAnICsgeTAgKyAnIFEgJyArIGN4ICsgJyAnICsgY3kgKyAnLCAnICsgeDEgKyAnICcgKyB5MTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU1ZHQ29tcG9uZW50OyIsInZhciBPYmplY3RDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jb3JlL09iamVjdENvbXBvbmVudCcpO1xudmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcbnZhciBDU1MgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcblxudmFyIE9wdGlvbnMgPSByZXF1aXJlKCcuL09wdGlvbnMnKTtcblxudmFyIEhpc3RvcnkgPSByZXF1aXJlKCcuLi9jb3JlL0hpc3RvcnknKTtcblxudmFyIEV2ZW50XyAgICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIE5vZGVFdmVudCAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKSxcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKSxcbiAgICBPcHRpb25FdmVudCAgICA9IHJlcXVpcmUoJy4uL2NvcmUvT3B0aW9uRXZlbnQnKTtcblxudmFyIE9iamVjdENvbXBvbmVudE5vdGlmaWVyID0gcmVxdWlyZSgnLi4vY29yZS9PYmplY3RDb21wb25lbnROb3RpZmllcicpO1xuXG52YXIgU1RSX0NIT09TRSA9ICdDaG9vc2UgLi4uJztcblxuZnVuY3Rpb24gU2VsZWN0KHBhcmVudCwgb2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgT2JqZWN0Q29tcG9uZW50LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICBwYXJhbXMgPSBwYXJhbXMgfHwge307XG4gICAgcGFyYW1zLm9uQ2hhbmdlID0gcGFyYW1zLm9uQ2hhbmdlIHx8IHRoaXMuX29uQ2hhbmdlO1xuICAgIHRoaXMuX29uQ2hhbmdlID0gcGFyYW1zLm9uQ2hhbmdlO1xuXG4gICAgdmFyIG9iaiA9IHRoaXMuX29iaixcbiAgICAgICAga2V5ID0gdGhpcy5fa2V5O1xuXG4gICAgdmFyIHRhcmdldEtleSA9IHRoaXMuX3RhcmdldEtleSA9IHBhcmFtcy50YXJnZXQsXG4gICAgICAgIHZhbHVlcyA9IHRoaXMuX3ZhbHVlcyA9IG9ialtrZXldO1xuXG5cbiAgICB0aGlzLl9zZWxlY3RlZEluZGV4ID0gLTE7XG4gICAgdGhpcy5fc2VsZWN0ZWQgPSBudWxsO1xuXG4gICAgdmFyIHNlbGVjdCA9IHRoaXMuX3NlbGVjdCA9IG5ldyBOb2RlKE5vZGUuSU5QVVRfQlVUVE9OKTtcbiAgICAgICAgc2VsZWN0LnNldFN0eWxlQ2xhc3MoQ1NTLlNlbGVjdCk7XG4gICAgICAgIHNlbGVjdC5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLCB0aGlzLl9vbk9wdGlvblRyaWdnZXIuYmluZCh0aGlzKSk7XG5cbiAgICBpZih0aGlzLl9oYXNUYXJnZXQoKSkge1xuICAgICAgICB2YXIgdGFyZ2V0T2JqID0gb2JqW3RhcmdldEtleV0gfHwgJyc7XG4gICAgICAgIHZhciBpID0gLTE7XG4gICAgICAgIHdoaWxlICgrK2kgPCB2YWx1ZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAodGFyZ2V0T2JqID09IHZhbHVlc1tpXSl7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2VsZWN0ZWQgPSB2YWx1ZXNbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc2VsZWN0LnNldFByb3BlcnR5KCd2YWx1ZScsIHRhcmdldE9iai50b1N0cmluZygpLmxlbmd0aCA+IDAgPyB0YXJnZXRPYmogOiB2YWx1ZXNbMF0pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgc2VsZWN0LnNldFByb3BlcnR5KCd2YWx1ZScsIHBhcmFtcy5zZWxlY3RlZCA/IHZhbHVlc1twYXJhbXMuc2VsZWN0ZWRdIDogU1RSX0NIT09TRSk7XG4gICAgfVxuXG4gICAgdGhpcy5fd3JhcE5vZGUuYWRkQ2hpbGQoc2VsZWN0KTtcblxuICAgIE9iamVjdENvbXBvbmVudE5vdGlmaWVyLmdldCgpLmFkZEV2ZW50TGlzdGVuZXIoT3B0aW9uRXZlbnQuVFJJR0dFUiwgdGhpcywgJ29uT3B0aW9uVHJpZ2dlcicpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihPcHRpb25FdmVudC5UUklHR0VSRUQsIE9iamVjdENvbXBvbmVudE5vdGlmaWVyLmdldCgpLCAnb25PcHRpb25UcmlnZ2VyZWQnKTtcbn1cblNlbGVjdC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE9iamVjdENvbXBvbmVudC5wcm90b3R5cGUpO1xuU2VsZWN0LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNlbGVjdDtcblxuU2VsZWN0LnByb3RvdHlwZS5vbk9wdGlvblRyaWdnZXIgPSBmdW5jdGlvbiAoZSkge1xuICAgIGlmIChlLmRhdGEub3JpZ2luID09IHRoaXMpIHtcbiAgICAgICAgdGhpcy5fYWN0aXZlID0gIXRoaXMuX2FjdGl2ZTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xuXG4gICAgICAgIGlmICh0aGlzLl9hY3RpdmUpIHtcbiAgICAgICAgICAgIHRoaXMuX2J1aWxkT3B0aW9ucygpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgT3B0aW9ucy5nZXQoKS5jbGVhcigpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5fYWN0aXZlID0gZmFsc2U7XG4gICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xufTtcblxuU2VsZWN0LnByb3RvdHlwZS5fYnVpbGRPcHRpb25zID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBvcHRpb25zID0gT3B0aW9ucy5nZXQoKTtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBvcHRpb25zLmJ1aWxkKHRoaXMuX3ZhbHVlcywgdGhpcy5fc2VsZWN0ZWQsIHRoaXMuX3NlbGVjdCxcbiAgICAgICAgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHNlbGYuYXBwbHlWYWx1ZSgpO1xuICAgICAgICAgICAgc2VsZi5fYWN0aXZlID0gZmFsc2U7XG4gICAgICAgICAgICBzZWxmLl91cGRhdGVBcHBlYXJhbmNlKCk7XG4gICAgICAgICAgICBzZWxmLl9zZWxlY3RlZEluZGV4ID0gb3B0aW9ucy5nZXRTZWxlY3RlZEluZGV4KCk7XG4gICAgICAgICAgICBzZWxmLl9vbkNoYW5nZShzZWxmLl9zZWxlY3RlZEluZGV4KTtcbiAgICAgICAgICAgIG9wdGlvbnMuY2xlYXIoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHNlbGYuX2FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgc2VsZi5fdXBkYXRlQXBwZWFyYW5jZSgpO1xuICAgICAgICAgICAgb3B0aW9ucy5jbGVhcigpXG4gICAgICAgIH0sIGZhbHNlKTtcbn07XG5cblNlbGVjdC5wcm90b3R5cGUuX2FwcGx5U2VsZWN0ZWQgPSBmdW5jdGlvbihzZWxlY3RlZCl7XG4gICAgdGhpcy5fc2VsZWN0LnNldFByb3BlcnR5KCd2YWx1ZScsc2VsZWN0ZWQpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCksbnVsbCk7XG59XG5cblNlbGVjdC5wcm90b3R5cGUuYXBwbHlWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaW5kZXggPSBPcHRpb25zLmdldCgpLmdldFNlbGVjdGVkSW5kZXgoKSxcbiAgICAgICAgc2VsZWN0ZWQgPSB0aGlzLl9zZWxlY3RlZCA9IHRoaXMuX3ZhbHVlc1tpbmRleF07XG5cbiAgICBpZiAodGhpcy5faGFzVGFyZ2V0KCkpIHtcbiAgICAgICAgdGhpcy5wdXNoSGlzdG9yeVN0YXRlKCk7XG4gICAgICAgIHRoaXMuX29ialt0aGlzLl90YXJnZXRLZXldID0gc2VsZWN0ZWQ7XG4gICAgfVxuXG4gICAgdGhpcy5fYXBwbHlTZWxlY3RlZChzZWxlY3RlZCk7XG59O1xuXG5TZWxlY3QucHJvdG90eXBlLnB1c2hIaXN0b3J5U3RhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG9iaiA9IHRoaXMuX29iaixcbiAgICAgICAga2V5ID0gdGhpcy5fdGFyZ2V0S2V5O1xuICAgIEhpc3RvcnkuZ2V0KCkucHVzaFN0YXRlKG9iaiwga2V5LCBvYmpba2V5XSk7XG59O1xuXG5TZWxlY3QucHJvdG90eXBlLl9vbk9wdGlvblRyaWdnZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgT3B0aW9uRXZlbnQuVFJJR0dFUkVELCBudWxsKSk7XG59O1xuXG5TZWxlY3QucHJvdG90eXBlLl91cGRhdGVBcHBlYXJhbmNlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX3NlbGVjdC5zZXRTdHlsZUNsYXNzKHRoaXMuX2FjdGl2ZSA/IENTUy5TZWxlY3RBY3RpdmUgOiBDU1MuU2VsZWN0KTtcbn07XG5cblNlbGVjdC5wcm90b3R5cGUub25WYWx1ZVVwZGF0ZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKCF0aGlzLl9oYXNUYXJnZXQoKSl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5fc2VsZWN0ZWQgPSB0aGlzLl9vYmpbdGhpcy5fdGFyZ2V0S2V5XTtcbiAgICB0aGlzLl9zZWxlY3Quc2V0UHJvcGVydHkoJ3ZhbHVlJywgdGhpcy5fc2VsZWN0ZWQudG9TdHJpbmcoKSk7XG59O1xuXG5TZWxlY3QucHJvdG90eXBlLl9oYXNUYXJnZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3RhcmdldEtleSAhPSBudWxsO1xufTtcblxuU2VsZWN0LnByb3RvdHlwZS5zZXRWYWx1ZSA9IGZ1bmN0aW9uKHZhbHVlKXtcbiAgICB0aGlzLl9zZWxlY3RlZEluZGV4ID0gdmFsdWU7XG4gICAgaWYodmFsdWUgPT0gLTEpe1xuICAgICAgICB0aGlzLl9zZWxlY3RlZCA9IG51bGw7XG4gICAgICAgIHRoaXMuX3NlbGVjdC5zZXRQcm9wZXJ0eSgndmFsdWUnLCBTVFJfQ0hPT1NFKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl9zZWxlY3RlZCA9IHRoaXMuX3ZhbHVlc1t0aGlzLl9zZWxlY3RlZEluZGV4XTtcbiAgICB0aGlzLl9hcHBseVNlbGVjdGVkKHRoaXMuX3NlbGVjdGVkKTtcbn07XG5cblNlbGVjdC5wcm90b3R5cGUuZ2V0RGF0YSA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIG9iaiA9IHt9O1xuICAgICAgICBvYmpbJ3NlbGVjdGVkSW5kZXgnXSA9IHRoaXMuX3NlbGVjdGVkSW5kZXg7XG4gICAgcmV0dXJuIG9iajtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0O1xuIiwidmFyIE9iamVjdENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvT2JqZWN0Q29tcG9uZW50Jyk7XG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcbnZhciBTbGlkZXJfSW50ZXJuYWwgPSByZXF1aXJlKCcuL1NsaWRlcl9JbnRlcm5hbCcpO1xuXG52YXIgSGlzdG9yeSA9IHJlcXVpcmUoJy4uL2NvcmUvSGlzdG9yeScpO1xudmFyIFJhbmdlID0gcmVxdWlyZSgnLi9SYW5nZScpO1xudmFyIE51bWJlcklucHV0X0ludGVybmFsID0gcmVxdWlyZSgnLi9OdW1iZXJJbnB1dF9JbnRlcm5hbCcpO1xuXG52YXIgRXZlbnRfICAgICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXG4gICAgRG9jdW1lbnRFdmVudCAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcbiAgICBQYW5lbEV2ZW50ICAgICA9IHJlcXVpcmUoJy4uL2dyb3VwL1BhbmVsRXZlbnQnKSxcbiAgICBHcm91cEV2ZW50ICAgICA9IHJlcXVpcmUoJy4uL2dyb3VwL0dyb3VwRXZlbnQnKSxcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKTtcblxudmFyIERFRkFVTFRfU1RFUCA9IDEuMCxcbiAgICBERUZBVUxUX0RQICAgPSAyO1xuXG5cbmZ1bmN0aW9uIFNsaWRlcihwYXJlbnQsb2JqZWN0LHZhbHVlLHJhbmdlLHBhcmFtcykge1xuICAgIHBhcmFtcyAgICAgICAgICA9IHBhcmFtcyAgICAgICAgICB8fCB7fTtcbiAgICBwYXJhbXMubGFiZWwgICAgPSBwYXJhbXMubGFiZWwgICAgfHwgdmFsdWU7XG5cbiAgICBPYmplY3RDb21wb25lbnQuYXBwbHkodGhpcyxbcGFyZW50LG9iamVjdCxyYW5nZSxwYXJhbXNdKTtcblxuICAgIHRoaXMuX3ZhbHVlcyAgPSB0aGlzLl9vYmpbdGhpcy5fa2V5XTtcbiAgICB0aGlzLl90YXJnZXRLZXkgPSB2YWx1ZTtcblxuICAgIHBhcmFtcy5zdGVwICAgICA9IHBhcmFtcy5zdGVwICAgICB8fCBERUZBVUxUX1NURVA7XG4gICAgcGFyYW1zLmRwICAgICAgID0gKHBhcmFtcy5kcCA9PT0gdW5kZWZpbmVkIHx8IHBhcmFtcy5kcCA9PSBudWxsKSA/ICBERUZBVUxUX0RQIDogcGFyYW1zLmRwO1xuICAgIHBhcmFtcy5vbkNoYW5nZSA9IHBhcmFtcy5vbkNoYW5nZSB8fCB0aGlzLl9vbkNoYW5nZTtcbiAgICBwYXJhbXMub25GaW5pc2ggPSBwYXJhbXMub25GaW5pc2ggfHwgZnVuY3Rpb24oKXt9O1xuXG4gICAgdGhpcy5fZHAgICAgICAgPSBwYXJhbXMuZHA7XG4gICAgdGhpcy5fb25DaGFuZ2UgPSBwYXJhbXMub25DaGFuZ2U7XG4gICAgdGhpcy5fb25GaW5pc2ggPSBwYXJhbXMub25GaW5pc2g7XG5cbiAgICB2YXIgdmFsdWVzICAgID0gdGhpcy5fdmFsdWVzLFxuICAgICAgICBvYmogICAgICAgPSB0aGlzLl9vYmosXG4gICAgICAgIHRhcmdldEtleSA9IHRoaXMuX3RhcmdldEtleTtcblxuICAgIHZhciB3cmFwICA9IHRoaXMuX3dyYXBOb2RlO1xuICAgICAgICB3cmFwLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXBTbGlkZXIpO1xuXG4gICAgdmFyIHNsaWRlciA9IHRoaXMuX3NsaWRlciA9IG5ldyBTbGlkZXJfSW50ZXJuYWwod3JhcCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9vblNsaWRlckJlZ2luLmJpbmQodGhpcyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fb25TbGlkZXJNb3ZlLmJpbmQodGhpcyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fb25TbGlkZXJFbmQuYmluZCh0aGlzKSk7XG5cbiAgICBzbGlkZXIuc2V0Qm91bmRNaW4odmFsdWVzWzBdKTtcbiAgICBzbGlkZXIuc2V0Qm91bmRNYXgodmFsdWVzWzFdKTtcbiAgICBzbGlkZXIuc2V0VmFsdWUob2JqW3RhcmdldEtleV0pO1xuXG4gICAgdmFyIGlucHV0ICA9IHRoaXMuX2lucHV0ID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHBhcmFtcy5zdGVwLCBwYXJhbXMuZHAsIG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX29uSW5wdXRDaGFuZ2UuYmluZCh0aGlzKSk7XG5cbiAgICBpbnB1dC5zZXRWYWx1ZShvYmpbdGFyZ2V0S2V5XSk7XG5cbiAgICB3cmFwLmFkZENoaWxkKGlucHV0LmdldE5vZGUoKSk7XG5cbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihQYW5lbEV2ZW50LlBBTkVMX01PVkVfRU5ELCAgICB0aGlzLCAnb25QYW5lbE1vdmVFbmQnKTtcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LkdST1VQX1NJWkVfQ0hBTkdFLCB0aGlzLCAnb25Hcm91cFdpZHRoQ2hhbmdlJyk7XG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5XSU5ET1dfUkVTSVpFLCAgdGhpcywgJ29uV2luZG93UmVzaXplJyk7XG59XG5TbGlkZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShPYmplY3RDb21wb25lbnQucHJvdG90eXBlKTtcblNsaWRlci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTbGlkZXI7XG5cblNsaWRlci5wcm90b3R5cGUucHVzaEhpc3RvcnlTdGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgb2JqID0gdGhpcy5fb2JqLFxuICAgICAgICBrZXkgPSB0aGlzLl90YXJnZXRLZXk7XG4gICAgSGlzdG9yeS5nZXQoKS5wdXNoU3RhdGUob2JqLCBrZXksIG9ialtrZXldKTtcbn07XG5cblNsaWRlci5wcm90b3R5cGUuX29uU2xpZGVyQmVnaW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5wdXNoSGlzdG9yeVN0YXRlKCk7XG59O1xuXG5TbGlkZXIucHJvdG90eXBlLl9vblNsaWRlck1vdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5hcHBseVZhbHVlKCk7XG4gICAgdGhpcy5fdXBkYXRlVmFsdWVGaWVsZCgpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIG51bGwpKTtcbiAgICB0aGlzLl9vbkNoYW5nZSgpO1xufTtcblxuU2xpZGVyLnByb3RvdHlwZS5fb25TbGlkZXJFbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5hcHBseVZhbHVlKCk7XG4gICAgdGhpcy5fdXBkYXRlVmFsdWVGaWVsZCgpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIG51bGwpKTtcbiAgICB0aGlzLl9vbkZpbmlzaCgpO1xufTtcblxuU2xpZGVyLnByb3RvdHlwZS5fb25JbnB1dENoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaW5wdXQgPSB0aGlzLl9pbnB1dCxcbiAgICAgICAgdmFsdWVNaW4gPSB0aGlzLl92YWx1ZXNbMF0sXG4gICAgICAgIHZhbHVlTWF4ID0gdGhpcy5fdmFsdWVzWzFdO1xuXG4gICAgaWYgKGlucHV0LmdldFZhbHVlKCkgPj0gdmFsdWVNYXgpe1xuICAgICAgICBpbnB1dC5zZXRWYWx1ZSh2YWx1ZU1heCk7XG4gICAgfVxuICAgIGlmIChpbnB1dC5nZXRWYWx1ZSgpIDw9IHZhbHVlTWluKXtcbiAgICAgICAgaW5wdXQuc2V0VmFsdWUodmFsdWVNaW4pO1xuICAgIH1cblxuICAgIHZhciB2YWx1ZSA9IGlucHV0LmdldFZhbHVlKCk7XG5cbiAgICB0aGlzLl9zbGlkZXIuc2V0VmFsdWUodmFsdWUpO1xuICAgIHRoaXMuX29ialt0aGlzLl90YXJnZXRLZXldID0gdmFsdWU7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCwgbnVsbCkpO1xuICAgIHRoaXMuX29uRmluaXNoKCk7XG59O1xuXG5TbGlkZXIucHJvdG90eXBlLmFwcGx5VmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHZhbHVlICA9IHRoaXMuX3NsaWRlci5nZXRWYWx1ZSgpO1xuICAgIHRoaXMuX29ialt0aGlzLl90YXJnZXRLZXldID0gcGFyc2VGbG9hdCh2YWx1ZS50b0ZpeGVkKHRoaXMuX2RwKSk7XG4gICAgdGhpcy5faW5wdXQuc2V0VmFsdWUodmFsdWUpO1xufTtcblxuXG5TbGlkZXIucHJvdG90eXBlLm9uVmFsdWVVcGRhdGUgPSBmdW5jdGlvbiAoZSkge1xuICAgIHZhciBvcmlnaW4gPSBlLmRhdGEub3JpZ2luO1xuICAgIGlmIChvcmlnaW4gPT0gdGhpcyl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHNsaWRlciA9IHRoaXMuX3NsaWRlcjtcbiAgICBpZiAoIShvcmlnaW4gaW5zdGFuY2VvZiBTbGlkZXIpKSB7XG4gICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLl92YWx1ZXM7XG4gICAgICAgIHNsaWRlci5zZXRCb3VuZE1pbih2YWx1ZXNbMF0pO1xuICAgICAgICBzbGlkZXIuc2V0Qm91bmRNYXgodmFsdWVzWzFdKTtcbiAgICAgICAgaWYgKCEob3JpZ2luIGluc3RhbmNlb2YgUmFuZ2UpKSB7XG4gICAgICAgICAgICBzbGlkZXIuc2V0VmFsdWUodGhpcy5fb2JqW3RoaXMuX3RhcmdldEtleV0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBzbGlkZXIuc2V0VmFsdWUodGhpcy5fb2JqW3RoaXMuX3RhcmdldEtleV0pO1xuICAgIH1cbiAgICB0aGlzLmFwcGx5VmFsdWUoKTtcbn07XG5cblxuU2xpZGVyLnByb3RvdHlwZS5fdXBkYXRlVmFsdWVGaWVsZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9pbnB1dC5zZXRWYWx1ZSh0aGlzLl9zbGlkZXIuZ2V0VmFsdWUoKSk7XG59O1xuXG5TbGlkZXIucHJvdG90eXBlLm9uUGFuZWxNb3ZlRW5kID1cbiAgICBTbGlkZXIucHJvdG90eXBlLm9uR3JvdXBXaWR0aENoYW5nZSA9XG4gICAgICAgIFNsaWRlci5wcm90b3R5cGUub25XaW5kb3dSZXNpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLl9zbGlkZXIucmVzZXRPZmZzZXQoKTtcbiAgICAgICAgfTtcblxuU2xpZGVyLnByb3RvdHlwZS5zZXRWYWx1ZSA9IGZ1bmN0aW9uKHZhbHVlKXtcbiAgICBpZih2YWx1ZSA9PSAtMSl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5fb2JqW3RoaXMuX3RhcmdldEtleV0gPSB2YWx1ZTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsbnVsbCkpO1xufTtcblxuU2xpZGVyLnByb3RvdHlwZS5nZXREYXRhID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgb2JqID0ge307XG4gICAgICAgIG9ialt0aGlzLl90YXJnZXRLZXldID0gdGhpcy5fb2JqW3RoaXMuX3RhcmdldEtleV07XG4gICAgcmV0dXJuIG9iajtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU2xpZGVyOyIsInZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XG5cbnZhciBEb2N1bWVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXG4gICAgTm9kZUV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKTtcblxudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG52YXIgTW91c2UgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L01vdXNlJyk7XG5cbmZ1bmN0aW9uIFNsaWRlcl9JbnRlcm5hbChwYXJlbnROb2RlLG9uQmVnaW4sb25DaGFuZ2Usb25GaW5pc2gpIHtcbiAgICB0aGlzLl9ib3VuZHMgPSBbMCwxXTtcbiAgICB0aGlzLl92YWx1ZSAgPSAwO1xuICAgIHRoaXMuX2ludHJwbCA9IDA7XG4gICAgdGhpcy5fZm9jdXMgID0gZmFsc2U7XG5cblxuICAgIHRoaXMuX29uQmVnaW4gID0gb25CZWdpbiAgfHwgZnVuY3Rpb24oKXt9O1xuICAgIHRoaXMuX29uQ2hhbmdlID0gb25DaGFuZ2UgfHwgZnVuY3Rpb24oKXt9O1xuICAgIHRoaXMuX29uRmluaXNoID0gb25GaW5pc2ggfHwgZnVuY3Rpb24oKXt9O1xuXG5cbiAgICB2YXIgd3JhcCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuU2xpZGVyV3JhcCk7XG4gICAgcGFyZW50Tm9kZS5hZGRDaGlsZCh3cmFwKTtcblxuICAgIHZhciBzbG90ICAgPSB0aGlzLl9zbG90ICAgPSB7bm9kZTogICAgbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5TbGlkZXJTbG90KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9mZnNldFg6IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogICAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFkZGluZzogM307XG5cbiAgICB2YXIgaGFuZGxlID0gdGhpcy5faGFuZGxlID0ge25vZGUgICAgOiBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlNsaWRlckhhbmRsZSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aCAgIDogMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRyYWdnaW5nOiBmYWxzZX07XG5cbiAgICB3cmFwLmFkZENoaWxkKHNsb3Qubm9kZSk7XG4gICAgc2xvdC5ub2RlLmFkZENoaWxkKGhhbmRsZS5ub2RlKTtcblxuICAgIHNsb3Qub2Zmc2V0WCA9IHNsb3Qubm9kZS5nZXRQb3NpdGlvbkdsb2JhbFgoKTtcbiAgICBzbG90LndpZHRoICAgPSBNYXRoLmZsb29yKHNsb3Qubm9kZS5nZXRXaWR0aCgpIC0gc2xvdC5wYWRkaW5nICogMikgO1xuXG4gICAgaGFuZGxlLm5vZGUuc2V0V2lkdGgoaGFuZGxlLndpZHRoKTtcblxuICAgIHNsb3Qubm9kZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLHRoaXMuX29uU2xvdE1vdXNlRG93bi5iaW5kKHRoaXMpKTtcbiAgICBzbG90Lm5vZGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfVVAsICB0aGlzLl9vblNsb3RNb3VzZVVwLmJpbmQodGhpcykpO1xuXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsdGhpcy5fb25Eb2N1bWVudE1vdXNlTW92ZS5iaW5kKHRoaXMpKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfVVAsICB0aGlzLl9vbkRvY3VtZW50TW91c2VVcC5iaW5kKHRoaXMpKTtcbn1cblxuU2xpZGVyX0ludGVybmFsLnByb3RvdHlwZS5fb25Eb2N1bWVudE1vdXNlTW92ZSA9IGZ1bmN0aW9uKCl7XG4gICAgaWYoIXRoaXMuX2hhbmRsZS5kcmFnZ2luZyl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5fdXBkYXRlKCk7XG4gICAgdGhpcy5fb25DaGFuZ2UoKTtcbn07XG5cblNsaWRlcl9JbnRlcm5hbC5wcm90b3R5cGUuX29uRG9jdW1lbnRNb3VzZVVwID0gZnVuY3Rpb24oKXtcbiAgICBpZih0aGlzLl9oYW5kbGUuZHJhZ2dpbmcpe1xuICAgICAgICB0aGlzLl9vbkZpbmlzaCgpO1xuICAgIH1cbiAgICB0aGlzLl9oYW5kbGUuZHJhZ2dpbmcgPSBmYWxzZTtcbn07XG5cblNsaWRlcl9JbnRlcm5hbC5wcm90b3R5cGUuX29uU2xvdE1vdXNlRG93biA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5fb25CZWdpbigpO1xuICAgIHRoaXMuX2ZvY3VzID0gdHJ1ZTtcbiAgICB0aGlzLl9oYW5kbGUuZHJhZ2dpbmcgPSB0cnVlO1xuICAgIHRoaXMuX2hhbmRsZS5ub2RlLmdldEVsZW1lbnQoKS5mb2N1cygpO1xuICAgIHRoaXMuX3VwZGF0ZSgpO1xufTtcblxuU2xpZGVyX0ludGVybmFsLnByb3RvdHlwZS5fb25TbG90TW91c2VVcCA9IGZ1bmN0aW9uKCl7XG4gICAgaWYgKHRoaXMuX2ZvY3VzKSB7XG4gICAgICAgIHZhciBoYW5kbGUgPSB0aGlzLl9oYW5kbGU7XG4gICAgICAgIGlmIChoYW5kbGUuZHJhZ2dpbmcpe1xuICAgICAgICAgICAgdGhpcy5fb25GaW5pc2goKTtcbiAgICAgICAgfVxuICAgICAgICBoYW5kbGUuZHJhZ2dpbmcgPSBmYWxzZTtcbiAgICB9XG4gICAgdGhpcy5fZm9jdXMgPSBmYWxzZTtcbn07XG5cblNsaWRlcl9JbnRlcm5hbC5wcm90b3R5cGUuX3VwZGF0ZSA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIG14ID0gTW91c2UuZ2V0KCkuZ2V0WCgpLFxuICAgICAgICBzeCA9IHRoaXMuX3Nsb3Qub2Zmc2V0WCxcbiAgICAgICAgc3cgPSB0aGlzLl9zbG90LndpZHRoLFxuICAgICAgICBweCA9IChteCA8IHN4KSA/IDAgOiAobXggPiAoc3ggKyBzdykpID8gc3cgOiAobXggLSBzeCk7XG5cbiAgICB0aGlzLl9oYW5kbGUubm9kZS5zZXRXaWR0aChNYXRoLnJvdW5kKHB4KSk7XG4gICAgdGhpcy5faW50cnBsID0gcHggLyBzdztcbiAgICB0aGlzLl9pbnRlcnBvbGF0ZVZhbHVlKCk7XG59O1xuXG5TbGlkZXJfSW50ZXJuYWwucHJvdG90eXBlLl91cGRhdGVIYW5kbGUgPSBmdW5jdGlvbigpe1xuICAgIHZhciBzbG90V2lkdGggICA9IHRoaXMuX3Nsb3Qud2lkdGgsXG4gICAgICAgIGhhbmRsZVdpZHRoID0gTWF0aC5yb3VuZCh0aGlzLl9pbnRycGwgKiBzbG90V2lkdGgpO1xuICAgIHRoaXMuX2hhbmRsZS5ub2RlLnNldFdpZHRoKE1hdGgubWluKGhhbmRsZVdpZHRoLHNsb3RXaWR0aCkpO1xufTtcblxuU2xpZGVyX0ludGVybmFsLnByb3RvdHlwZS5faW50ZXJwb2xhdGVWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaW50cnBsID0gdGhpcy5faW50cnBsLFxuICAgICAgICBib3VuZHMgPSB0aGlzLl9ib3VuZHM7XG4gICAgdGhpcy5fdmFsdWUgPSBib3VuZHNbMF0gKiAoMS4wIC0gaW50cnBsKSArIGJvdW5kc1sxXSAqIGludHJwbDtcbn07XG5cblNsaWRlcl9JbnRlcm5hbC5wcm90b3R5cGUucmVzZXRPZmZzZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNsb3QgPSB0aGlzLl9zbG90O1xuICAgIHNsb3Qub2Zmc2V0WCA9IHNsb3Qubm9kZS5nZXRQb3NpdGlvbkdsb2JhbFgoKTtcbiAgICBzbG90LndpZHRoID0gTWF0aC5mbG9vcihzbG90Lm5vZGUuZ2V0V2lkdGgoKSAtIHNsb3QucGFkZGluZyAqIDIpXG59O1xuXG5TbGlkZXJfSW50ZXJuYWwucHJvdG90eXBlLnNldEJvdW5kTWluID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdmFyIGJvdW5kcyA9IHRoaXMuX2JvdW5kcztcbiAgICBpZiAodmFsdWUgPj0gYm91bmRzWzFdKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBib3VuZHNbMF0gPSB2YWx1ZTtcbiAgICB0aGlzLl91cGRhdGVGcm9tQm91bmRzKCk7XG59O1xuXG5TbGlkZXJfSW50ZXJuYWwucHJvdG90eXBlLnNldEJvdW5kTWF4ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdmFyIGJvdW5kcyA9IHRoaXMuX2JvdW5kcztcbiAgICBpZiAodmFsdWUgPD0gYm91bmRzWzBdKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBib3VuZHNbMV0gPSB2YWx1ZTtcbiAgICB0aGlzLl91cGRhdGVGcm9tQm91bmRzKCk7XG59O1xuXG5TbGlkZXJfSW50ZXJuYWwucHJvdG90eXBlLl91cGRhdGVGcm9tQm91bmRzID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBib3VuZHNNaW4gPSB0aGlzLl9ib3VuZHNbMF0sXG4gICAgICAgIGJvdW5kc01heCA9IHRoaXMuX2JvdW5kc1sxXTtcbiAgICB0aGlzLl92YWx1ZSA9IE1hdGgubWF4KGJvdW5kc01pbixNYXRoLm1pbih0aGlzLl92YWx1ZSxib3VuZHNNYXgpKTtcbiAgICB0aGlzLl9pbnRycGwgPSBNYXRoLmFicygodGhpcy5fdmFsdWUgLSBib3VuZHNNaW4pIC8gKGJvdW5kc01pbiAtIGJvdW5kc01heCkpO1xuICAgIHRoaXMuX3VwZGF0ZUhhbmRsZSgpO1xufTtcblxuU2xpZGVyX0ludGVybmFsLnByb3RvdHlwZS5zZXRWYWx1ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHZhciBib3VuZHNNaW4gPSB0aGlzLl9ib3VuZHNbMF0sXG4gICAgICAgIGJvdW5kc01heCA9IHRoaXMuX2JvdW5kc1sxXTtcblxuICAgIGlmICh2YWx1ZSA8IGJvdW5kc01pbiB8fCB2YWx1ZSA+IGJvdW5kc01heCl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5faW50cnBsID0gTWF0aC5hYnMoKHZhbHVlIC0gYm91bmRzTWluKSAvIChib3VuZHNNaW4gLSBib3VuZHNNYXgpKTtcbiAgICB0aGlzLl91cGRhdGVIYW5kbGUoKTtcbiAgICB0aGlzLl92YWx1ZSA9IHZhbHVlO1xufTtcblxuU2xpZGVyX0ludGVybmFsLnByb3RvdHlwZS5nZXRWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fdmFsdWU7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gU2xpZGVyX0ludGVybmFsOyIsInZhciBPYmplY3RDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jb3JlL09iamVjdENvbXBvbmVudCcpO1xudmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xudmFyIE9wdGlvbnMgPSByZXF1aXJlKCcuL09wdGlvbnMnKTtcbnZhciBCdXR0b25QcmVzZXQgPSByZXF1aXJlKCcuL0J1dHRvblByZXNldCcpO1xudmFyIE1ldHJpYyA9IHJlcXVpcmUoJy4vTWV0cmljJyk7XG5cbnZhciBFdmVudF8gPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXG4gICAgRG9jdW1lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxuICAgIE5vZGVFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50JyksXG4gICAgQ29tcG9uZW50RXZlbnQgPSAgcmVxdWlyZSgnLi4vY29yZS9Db21wb25lbnRFdmVudCcpO1xuXG52YXIgREVGQVVMVF9QUkVTRVQgPSBudWxsO1xuXG5mdW5jdGlvbiBTdHJpbmdJbnB1dChwYXJlbnQsb2JqZWN0LHZhbHVlLHBhcmFtcykge1xuICAgIE9iamVjdENvbXBvbmVudC5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cbiAgICBwYXJhbXMgICAgICAgICAgPSBwYXJhbXMgfHwge307XG4gICAgcGFyYW1zLm9uQ2hhbmdlID0gcGFyYW1zLm9uQ2hhbmdlIHx8IHRoaXMuX29uQ2hhbmdlO1xuICAgIHBhcmFtcy5wcmVzZXRzICA9IHBhcmFtcy5wcmVzZXRzICB8fCBERUZBVUxUX1BSRVNFVDtcblxuICAgIHRoaXMuX29uQ2hhbmdlICAgPSBwYXJhbXMub25DaGFuZ2U7XG5cbiAgICB2YXIgaW5wdXQgPSB0aGlzLl9pbnB1dCA9IG5ldyBOb2RlKE5vZGUuSU5QVVRfVEVYVCk7XG5cbiAgICB2YXIgd3JhcCA9IHRoaXMuX3dyYXBOb2RlO1xuXG4gICAgdmFyIHByZXNldHMgPSBwYXJhbXMucHJlc2V0cztcbiAgICBpZiAoIXByZXNldHMpIHtcbiAgICAgICAgd3JhcC5hZGRDaGlsZChpbnB1dCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB2YXIgd3JhcF8gPSBuZXcgTm9kZSgpO1xuICAgICAgICB3cmFwXy5zZXRTdHlsZUNsYXNzKENTUy5XcmFwSW5wdXRXUHJlc2V0KTtcblxuICAgICAgICB3cmFwLmFkZENoaWxkKHdyYXBfKTtcbiAgICAgICAgd3JhcF8uYWRkQ2hpbGQoaW5wdXQpO1xuXG4gICAgICAgIHZhciBvcHRpb25zID0gT3B0aW9ucy5nZXQoKSxcbiAgICAgICAgICAgIGJ0blByZXNldCA9IG5ldyBCdXR0b25QcmVzZXQodGhpcy5fd3JhcE5vZGUpO1xuXG4gICAgICAgIHZhciBvblByZXNldERlYWN0aXZhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBvcHRpb25zLmNsZWFyKCk7XG4gICAgICAgICAgICBidG5QcmVzZXQuZGVhY3RpdmF0ZSgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIG9uUHJlc2V0QWN0aXZhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBvcHRpb25zLmJ1aWxkKHByZXNldHMsXG4gICAgICAgICAgICAgICAgaW5wdXQuZ2V0UHJvcGVydHkoJ3ZhbHVlJyksXG4gICAgICAgICAgICAgICAgaW5wdXQsXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBpbnB1dC5zZXRQcm9wZXJ0eSgndmFsdWUnLCBwcmVzZXRzW29wdGlvbnMuZ2V0U2VsZWN0ZWRJbmRleCgpXSk7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYucHVzaEhpc3RvcnlTdGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICBzZWxmLmFwcGx5VmFsdWUoKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uUHJlc2V0RGVhY3RpdmF0ZSxcbiAgICAgICAgICAgICAgICBNZXRyaWMuUEFERElOR19QUkVTRVQsXG4gICAgICAgICAgICAgICAgZmFsc2UpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGJ0blByZXNldC5zZXRPbkFjdGl2ZShvblByZXNldEFjdGl2YXRlKTtcbiAgICAgICAgYnRuUHJlc2V0LnNldE9uRGVhY3RpdmUob25QcmVzZXREZWFjdGl2YXRlKVxuICAgIH1cblxuICAgIGlucHV0LnNldFByb3BlcnR5KCd2YWx1ZScsdGhpcy5fb2JqW3RoaXMuX2tleV0pO1xuXG4gICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuS0VZX1VQLCB0aGlzLl9vbklucHV0S2V5VXAuYmluZCh0aGlzKSk7XG4gICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuQ0hBTkdFLCB0aGlzLl9vbklucHV0Q2hhbmdlLmJpbmQodGhpcykpO1xuXG4gICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25JbnB1dERyYWdTdGFydC5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoQ29tcG9uZW50RXZlbnQuSU5QVVRfU0VMRUNUX0RSQUcsdGhpcy5fcGFyZW50LCdvbkNvbXBvbmVudFNlbGVjdERyYWcnKTtcbn1cblN0cmluZ0lucHV0LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZSk7XG5TdHJpbmdJbnB1dC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTdHJpbmdJbnB1dDtcblxuU3RyaW5nSW5wdXQucHJvdG90eXBlLl9vbklucHV0S2V5VXAgPSBmdW5jdGlvbiAoZSkge1xuICAgIGlmICh0aGlzLl9rZXlJc0NoYXIoZS5rZXlDb2RlKSl7XG4gICAgICAgIHRoaXMucHVzaEhpc3RvcnlTdGF0ZSgpO1xuICAgIH1cbiAgICB0aGlzLmFwcGx5VmFsdWUoKTtcbiAgICB0aGlzLl9vbkNoYW5nZSgpO1xufTtcblxuU3RyaW5nSW5wdXQucHJvdG90eXBlLl9vbklucHV0Q2hhbmdlID0gZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAodGhpcy5fa2V5SXNDaGFyKGUua2V5Q29kZSkpe1xuICAgICAgICB0aGlzLnB1c2hIaXN0b3J5U3RhdGUoKTtcbiAgICB9XG4gICAgdGhpcy5hcHBseVZhbHVlKCk7XG59O1xuXG4vL1RPRE86IEZpbmlzaCBjaGVja1xuU3RyaW5nSW5wdXQucHJvdG90eXBlLl9rZXlJc0NoYXIgPSBmdW5jdGlvbiAoa2V5Q29kZSkge1xuICAgIHJldHVybiBrZXlDb2RlICE9IDE3ICYmXG4gICAgICAgIGtleUNvZGUgIT0gMTggJiZcbiAgICAgICAga2V5Q29kZSAhPSAyMCAmJlxuICAgICAgICBrZXlDb2RlICE9IDM3ICYmXG4gICAgICAgIGtleUNvZGUgIT0gMzggJiZcbiAgICAgICAga2V5Q29kZSAhPSAzOSAmJlxuICAgICAgICBrZXlDb2RlICE9IDQwICYmXG4gICAgICAgIGtleUNvZGUgIT0gMTY7XG59O1xuXG5cblN0cmluZ0lucHV0LnByb3RvdHlwZS5hcHBseVZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX29ialt0aGlzLl9rZXldID0gdGhpcy5faW5wdXQuZ2V0UHJvcGVydHkoJ3ZhbHVlJyk7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCwgbnVsbCkpO1xufTtcblxuU3RyaW5nSW5wdXQucHJvdG90eXBlLm9uVmFsdWVVcGRhdGUgPSBmdW5jdGlvbiAoZSkge1xuICAgIGlmIChlLmRhdGEub3JpZ2luID09IHRoaXMpcmV0dXJuO1xuICAgIHRoaXMuX2lucHV0LnNldFByb3BlcnR5KCd2YWx1ZScsIHRoaXMuX29ialt0aGlzLl9rZXldKTtcbn07XG5cbi8vUHJldmVudCBjaHJvbWUgc2VsZWN0IGRyYWdcblN0cmluZ0lucHV0LnByb3RvdHlwZS5fb25JbnB1dERyYWdTdGFydCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZXZlbnRNb3ZlID0gRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLFxuICAgICAgICBldmVudFVwID0gRG9jdW1lbnRFdmVudC5NT1VTRV9VUDtcblxuICAgIHZhciBldmVudCA9IENvbXBvbmVudEV2ZW50LklOUFVUX1NFTEVDVF9EUkFHO1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgb25EcmFnID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgZXZlbnQsIG51bGwpKTtcbiAgICAgICAgfSxcblxuICAgICAgICBvbkRyYWdGaW5pc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBldmVudCwgbnVsbCkpO1xuXG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnRmluaXNoLCBmYWxzZSk7XG4gICAgICAgIH07XG5cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBldmVudCwgbnVsbCkpO1xuXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRVcCwgb25EcmFnRmluaXNoLCBmYWxzZSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN0cmluZ0lucHV0OyIsInZhciBPdXRwdXQgPSByZXF1aXJlKCcuL091dHB1dCcpO1xuXG5TdHJpbmdPdXRwdXQgPSBmdW5jdGlvbiAocGFyZW50LCBvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICBPdXRwdXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5TdHJpbmdPdXRwdXQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShPdXRwdXQucHJvdG90eXBlKTtcblN0cmluZ091dHB1dC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTdHJpbmdPdXRwdXQ7XG5cblN0cmluZ091dHB1dC5wcm90b3R5cGUuX3NldFZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLl9wYXJlbnQuaXNEaXNhYmxlZCgpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRleHRBcmVhU3RyaW5nID0gdGhpcy5fb2JqW3RoaXMuX2tleV07XG5cbiAgICBpZiAodGV4dEFyZWFTdHJpbmcgPT0gdGhpcy5fcHJldlN0cmluZyl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRleHRBcmVhID0gdGhpcy5fdGV4dEFyZWEsXG4gICAgICAgIHRleHRBcmVhRWxlbWVudCA9IHRleHRBcmVhLmdldEVsZW1lbnQoKSxcbiAgICAgICAgdGV4dEFyZWFTY3JvbGxIZWlnaHQ7XG5cbiAgICB0ZXh0QXJlYS5zZXRQcm9wZXJ0eSgndmFsdWUnLCB0ZXh0QXJlYVN0cmluZyk7XG4gICAgdGV4dEFyZWFTY3JvbGxIZWlnaHQgPSB0ZXh0QXJlYUVsZW1lbnQuc2Nyb2xsSGVpZ2h0O1xuICAgIHRleHRBcmVhLnNldEhlaWdodCh0ZXh0QXJlYVNjcm9sbEhlaWdodCk7XG5cbiAgICB2YXIgc2Nyb2xsQmFyID0gdGhpcy5fc2Nyb2xsQmFyO1xuXG4gICAgaWYgKHNjcm9sbEJhcikge1xuICAgICAgICBpZiAodGV4dEFyZWFTY3JvbGxIZWlnaHQgPD0gdGhpcy5fd3JhcE5vZGUuZ2V0SGVpZ2h0KCkpIHtcbiAgICAgICAgICAgIHNjcm9sbEJhci5kaXNhYmxlKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzY3JvbGxCYXIuZW5hYmxlKCk7XG4gICAgICAgICAgICBzY3JvbGxCYXIudXBkYXRlKCk7XG4gICAgICAgICAgICBzY3JvbGxCYXIucmVzZXQoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB0aGlzLl9wcmV2U3RyaW5nID0gdGV4dEFyZWFTdHJpbmc7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN0cmluZ091dHB1dDtcbiIsInZhciBQbG90dGVyID0gcmVxdWlyZSgnLi9QbG90dGVyJyk7XG52YXIgTWV0cmljICA9IHJlcXVpcmUoJy4vTWV0cmljJyk7XG5cbnZhciBERUZBVUxUX1JFU09MVVRJT04gPSAxO1xuXG5mdW5jdGlvbiBWYWx1ZVBsb3R0ZXIocGFyZW50LG9iamVjdCx2YWx1ZSxwYXJhbXMpIHtcbiAgICBQbG90dGVyLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuICAgIHZhciBzdmcgICAgICAgPSB0aGlzLl9zdmcsXG4gICAgICAgIHN2Z1dpZHRoICA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKSxcbiAgICAgICAgc3ZnSGVpZ2h0ID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ2hlaWdodCcpKTtcblxuICAgIHBhcmFtcyAgICAgICAgICAgID0gcGFyYW1zICAgICAgICAgICAgfHwge307XG4gICAgcGFyYW1zLmhlaWdodCAgICAgPSBwYXJhbXMuaGVpZ2h0ICAgICB8fCBzdmdIZWlnaHQ7XG4gICAgcGFyYW1zLnJlc29sdXRpb24gPSBwYXJhbXMucmVzb2x1dGlvbiB8fCBERUZBVUxUX1JFU09MVVRJT047XG5cbiAgICB2YXIgcmVzb2x1dGlvbiA9IHBhcmFtcy5yZXNvbHV0aW9uLFxuICAgICAgICBsZW5ndGggICAgID0gTWF0aC5mbG9vcihzdmdXaWR0aCAvIHJlc29sdXRpb24pO1xuXG4gICAgdmFyIHBvaW50cyAgICAgPSB0aGlzLl9wb2ludHMgID0gbmV3IEFycmF5KGxlbmd0aCAqIDIpLFxuICAgICAgICBidWZmZXIwICAgID0gdGhpcy5fYnVmZmVyMCA9IG5ldyBBcnJheShsZW5ndGgpLFxuICAgICAgICBidWZmZXIxICAgID0gdGhpcy5fYnVmZmVyMSA9IG5ldyBBcnJheShsZW5ndGgpO1xuXG4gICAgdmFyIG1pbiA9IHRoaXMuX2xpbmVXaWR0aCAqIDAuNTtcblxuICAgIHZhciBpID0gLTE7XG4gICAgd2hpbGUgKCsraSA8IGxlbmd0aCkge1xuICAgICAgICBidWZmZXIwW2ldID0gYnVmZmVyMVtpXSA9IHBvaW50c1tpICogMl0gPSBwb2ludHNbaSAqIDIgKyAxXSA9IG1pbjtcbiAgICB9XG5cbiAgICB0aGlzLl9oZWlnaHQgPSBwYXJhbXMuaGVpZ2h0ID0gcGFyYW1zLmhlaWdodCAgPCBNZXRyaWMuQ09NUE9ORU5UX01JTl9IRUlHSFQgP1xuICAgICAgICAgICAgICAgICAgIE1ldHJpYy5DT01QT05FTlRfTUlOX0hFSUdIVCA6IHBhcmFtcy5oZWlnaHQ7XG5cbiAgICB0aGlzLl9zdmdTZXRTaXplKHN2Z0hlaWdodCxNYXRoLmZsb29yKHBhcmFtcy5oZWlnaHQpKTtcbiAgICB0aGlzLl9ncmlkLnN0eWxlLnN0cm9rZSA9ICdyZ2IoMzksNDQsNDYpJztcblxuICAgIHRoaXMuX3VwZGF0ZUhlaWdodCgpO1xuICAgIHRoaXMuX2RyYXdWYWx1ZSgpO1xufVxuVmFsdWVQbG90dGVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUGxvdHRlci5wcm90b3R5cGUpO1xuVmFsdWVQbG90dGVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFZhbHVlUGxvdHRlcjtcblxuVmFsdWVQbG90dGVyLnByb3RvdHlwZS5fcmVkcmF3ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBwb2ludHMgPSB0aGlzLl9wb2ludHMsXG4gICAgICAgIGJ1ZmZlckxlbiA9IHRoaXMuX2J1ZmZlcjAubGVuZ3RoO1xuXG4gICAgdmFyIHdpZHRoID0gTnVtYmVyKHRoaXMuX3N2Zy5nZXRBdHRyaWJ1dGUoJ3dpZHRoJykpLFxuICAgICAgICByYXRpbyA9IHdpZHRoIC8gKGJ1ZmZlckxlbiAtIDEpO1xuXG4gICAgdmFyIGkgPSAtMTtcbiAgICB3aGlsZSAoKytpIDwgYnVmZmVyTGVuKSB7XG4gICAgICAgIHBvaW50c1tpICogMl0gPSB3aWR0aCAtIGkgKiByYXRpbztcbiAgICB9XG5cbiAgICB0aGlzLl9kcmF3VmFsdWUoKTtcbn07XG5cblZhbHVlUGxvdHRlci5wcm90b3R5cGUub25Hcm91cFNpemVDaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHdpZHRoID0gdGhpcy5fd3JhcE5vZGUuZ2V0V2lkdGgoKSxcbiAgICAgICAgaGVpZ2h0ID0gdGhpcy5faGVpZ2h0O1xuXG4gICAgdGhpcy5fc3ZnU2V0U2l6ZSh3aWR0aCwgaGVpZ2h0KTtcbiAgICB0aGlzLl91cGRhdGVIZWlnaHQoKTtcbiAgICB0aGlzLl9kcmF3R3JpZCgpO1xuICAgIHRoaXMuX3JlZHJhdygpO1xufTtcblxuVmFsdWVQbG90dGVyLnByb3RvdHlwZS5fZHJhd1ZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2RyYXdDdXJ2ZSgpO1xufTtcblxuVmFsdWVQbG90dGVyLnByb3RvdHlwZS5fZHJhd0dyaWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHN2ZyA9IHRoaXMuX3N2ZztcblxuICAgIHZhciBzdmdXaWR0aCA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKSxcbiAgICAgICAgc3ZnSGVpZ2h0SGFsZiA9IE1hdGguZmxvb3IoTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ2hlaWdodCcpKSAqIDAuNSk7XG5cbiAgICB2YXIgcGF0aENtZCA9ICcnO1xuICAgICAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRNb3ZlVG8oMCwgc3ZnSGVpZ2h0SGFsZik7XG4gICAgICAgIHBhdGhDbWQgKz0gdGhpcy5fcGF0aENtZExpbmVUbyhzdmdXaWR0aCwgc3ZnSGVpZ2h0SGFsZik7XG5cbiAgICB0aGlzLl9ncmlkLnNldEF0dHJpYnV0ZSgnZCcsIHBhdGhDbWQpO1xufTtcblxuLy9UT0RPOiBtZXJnZSB1cGRhdGUgKyBwYXRoY21kXG5WYWx1ZVBsb3R0ZXIucHJvdG90eXBlLl9kcmF3Q3VydmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHN2ZyA9IHRoaXMuX3N2ZztcblxuICAgIHZhciB2YWx1ZSA9IHRoaXMuX29ialt0aGlzLl9rZXldO1xuXG4gICAgdmFyIGJ1ZmZlcjAgPSB0aGlzLl9idWZmZXIwLFxuICAgICAgICBidWZmZXIxID0gdGhpcy5fYnVmZmVyMSxcbiAgICAgICAgcG9pbnRzID0gdGhpcy5fcG9pbnRzO1xuXG4gICAgdmFyIGJ1ZmZlckxlbmd0aCA9IGJ1ZmZlcjAubGVuZ3RoO1xuXG4gICAgdmFyIHBhdGhDbWQgPSAnJztcblxuICAgIHZhciBoZWlnaHRIYWxmID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ2hlaWdodCcpKSAqIDAuNSxcbiAgICAgICAgdW5pdCA9IGhlaWdodEhhbGYgLSB0aGlzLl9saW5lV2lkdGggKiAwLjU7XG5cbiAgICBwb2ludHNbMV0gPSBidWZmZXIwWzBdO1xuICAgIGJ1ZmZlcjBbYnVmZmVyTGVuZ3RoIC0gMV0gPSAodmFsdWUgKiB1bml0KSAqIC0xICsgTWF0aC5mbG9vcihoZWlnaHRIYWxmKTtcblxuICAgIHBhdGhDbWQgKz0gdGhpcy5fcGF0aENtZE1vdmVUbyhwb2ludHNbMF0sIHBvaW50c1sxXSk7XG5cbiAgICB2YXIgaSA9IDAsIGluZGV4O1xuXG4gICAgd2hpbGUgKCsraSA8IGJ1ZmZlckxlbmd0aCkge1xuICAgICAgICBpbmRleCA9IGkgKiAyO1xuXG4gICAgICAgIGJ1ZmZlcjFbaSAtIDFdID0gYnVmZmVyMFtpXTtcbiAgICAgICAgcG9pbnRzW2luZGV4ICsgMV0gPSBidWZmZXIwW2kgLSAxXSA9IGJ1ZmZlcjFbaSAtIDFdO1xuXG4gICAgICAgIHBhdGhDbWQgKz0gdGhpcy5fcGF0aENtZExpbmVUbyhwb2ludHNbaW5kZXhdLCBwb2ludHNbaW5kZXggKyAxXSk7XG4gICAgfVxuXG4gICAgdGhpcy5fcGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwYXRoQ21kKTtcbn07XG5cblZhbHVlUGxvdHRlci5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLl9wYXJlbnQuaXNEaXNhYmxlZCgpKXJldHVybjtcbiAgICB0aGlzLl9kcmF3VmFsdWUoKTtcbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IFZhbHVlUGxvdHRlcjtcblxuIiwidmFyIE5vZGUgPSByZXF1aXJlKCcuL2RvY3VtZW50L05vZGUnKSxcbiAgICBDU1MgPSByZXF1aXJlKCcuL2RvY3VtZW50L0NTUycpO1xudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4vZXZlbnQvRXZlbnREaXNwYXRjaGVyJyksXG4gICAgQ29tcG9uZW50RXZlbnQgID0gcmVxdWlyZSgnLi9Db21wb25lbnRFdmVudCcpO1xuXG5mdW5jdGlvbiBDb21wb25lbnQocGFyZW50LGxhYmVsKSB7XG4gICAgRXZlbnREaXNwYXRjaGVyLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuICAgIGxhYmVsID0gcGFyZW50LnVzZXNMYWJlbHMoKSA/IGxhYmVsIDogJ25vbmUnO1xuXG4gICAgdGhpcy5fcGFyZW50ICA9IHBhcmVudDtcbiAgICB0aGlzLl9lbmFibGVkID0gdHJ1ZTtcblxuICAgIHZhciByb290ID0gdGhpcy5fbm9kZSA9IG5ldyBOb2RlKE5vZGUuTElTVF9JVEVNKSxcbiAgICAgICAgd3JhcCA9IHRoaXMuX3dyYXBOb2RlID0gbmV3IE5vZGUoKTtcbiAgICAgICAgd3JhcC5zZXRTdHlsZUNsYXNzKENTUy5XcmFwKTtcbiAgICAgICAgcm9vdC5hZGRDaGlsZCh3cmFwKTtcblxuICAgIGlmIChsYWJlbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmIChsYWJlbC5sZW5ndGggIT0gMCAmJiBsYWJlbCAhPSAnbm9uZScpIHtcbiAgICAgICAgICAgIHZhciBsYWJlbF8gPSB0aGlzLl9sYWJsTm9kZSA9IG5ldyBOb2RlKE5vZGUuU1BBTik7XG4gICAgICAgICAgICAgICAgbGFiZWxfLnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKTtcbiAgICAgICAgICAgICAgICBsYWJlbF8uc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsIGxhYmVsKTtcbiAgICAgICAgICAgICAgICByb290LmFkZENoaWxkKGxhYmVsXyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobGFiZWwgPT0gJ25vbmUnKSB7XG4gICAgICAgICAgICB3cmFwLnNldFN0eWxlUHJvcGVydHkoJ21hcmdpbkxlZnQnLCAnMCcpO1xuICAgICAgICAgICAgd3JhcC5zZXRTdHlsZVByb3BlcnR5KCd3aWR0aCcsICcxMDAlJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihDb21wb25lbnRFdmVudC5FTkFCTEUsIHRoaXMsJ29uRW5hYmxlJyk7XG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoQ29tcG9uZW50RXZlbnQuRElTQUJMRSx0aGlzLCdvbkRpc2FibGUnKTtcbiAgICB0aGlzLl9wYXJlbnQuYWRkQ29tcG9uZW50Tm9kZShyb290KTtcbn1cbkNvbXBvbmVudC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUpO1xuQ29tcG9uZW50LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IENvbXBvbmVudDtcblxuQ29tcG9uZW50LnByb3RvdHlwZS5lbmFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fZW5hYmxlZCA9IHRydWU7XG59O1xuXG5Db21wb25lbnQucHJvdG90eXBlLmRpc2FibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fZW5hYmxlZCA9IGZhbHNlO1xufTtcblxuQ29tcG9uZW50LnByb3RvdHlwZS5pc0VuYWJsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2VuYWJsZWQ7XG59O1xuQ29tcG9uZW50LnByb3RvdHlwZS5pc0Rpc2FibGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAhdGhpcy5fZW5hYmxlZDtcbn07XG5cbkNvbXBvbmVudC5wcm90b3R5cGUub25FbmFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5lbmFibGUoKTtcbn07XG5cbkNvbXBvbmVudC5wcm90b3R5cGUub25EaXNhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzYWJsZSgpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7IiwidmFyIENvbXBvbmVudEV2ZW50ID0ge1xuXHRWQUxVRV9VUERBVEVEOiAndmFsdWVVcGRhdGVkJyxcblx0VVBEQVRFX1ZBTFVFOiAndXBkYXRlVmFsdWUnLFxuXG5cdElOUFVUX1NFTEVDVF9EUkFHOiAnaW5wdXRTZWxlY3REcmFnJyxcblxuXHRFTkFCTEUgIDogJ2VuYWJsZScsXG5cdERJU0FCTEUgOiAnZGlzYWJsZSdcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50RXZlbnQ7IiwiZnVuY3Rpb24gQ29tcG9uZW50T2JqZWN0RXJyb3Iob2JqZWN0LGtleSkge1xuXHRFcnJvci5hcHBseSh0aGlzKTtcblx0RXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcyxDb21wb25lbnRPYmplY3RFcnJvcik7XG5cdHRoaXMubmFtZSA9ICdDb21wb25lbnRPYmplY3RFcnJvcic7XG5cdHRoaXMubWVzc2FnZSA9ICdPYmplY3Qgb2YgdHlwZSAnICsgb2JqZWN0LmNvbnN0cnVjdG9yLm5hbWUgKyAnIGhhcyBubyBtZW1iZXIgJyArIGtleSArICcuJztcbn1cbkNvbXBvbmVudE9iamVjdEVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcbkNvbXBvbmVudE9iamVjdEVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IENvbXBvbmVudE9iamVjdEVycm9yO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvbmVudE9iamVjdEVycm9yOyIsInZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKCcuL2V2ZW50L0V2ZW50RGlzcGF0Y2hlcicpLFxuICAgIEV2ZW50XyA9IHJlcXVpcmUoJy4vZXZlbnQvRXZlbnQnKSxcbiAgICBIaXN0b3J5RXZlbnQgPSByZXF1aXJlKCcuL0hpc3RvcnlFdmVudCcpO1xuXG52YXIgTUFYX1NUQVRFUyA9IDMwO1xuXG5mdW5jdGlvbiBIaXN0b3J5KCkge1xuICAgIEV2ZW50RGlzcGF0Y2hlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIHRoaXMuX3N0YXRlcyA9IFtdO1xuICAgIHRoaXMuX2VuYWJsZWQgPSBmYWxzZTtcbn1cbkhpc3RvcnkucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudERpc3BhdGNoZXIucHJvdG90eXBlKTtcbkhpc3RvcnkucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gSGlzdG9yeTtcblxuSGlzdG9yeS5wcm90b3R5cGUucHVzaFN0YXRlID0gZnVuY3Rpb24gKG9iamVjdCwga2V5LCB2YWx1ZSkge1xuICAgIGlmICh0aGlzLl9lbmFibGVkKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG4gICAgaWYgKHN0YXRlcy5sZW5ndGggPj0gTUFYX1NUQVRFUyl7XG4gICAgICAgIHN0YXRlcy5zaGlmdCgpO1xuICAgIH1cbiAgICBzdGF0ZXMucHVzaCh7b2JqZWN0OiBvYmplY3QsIGtleToga2V5LCB2YWx1ZTogdmFsdWV9KTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBIaXN0b3J5RXZlbnQuU1RBVEVfUFVTSCwgbnVsbCkpO1xufTtcblxuSGlzdG9yeS5wcm90b3R5cGUuZ2V0U3RhdGUgPSBmdW5jdGlvbiAob2JqZWN0LCBrZXkpIHtcbiAgICB2YXIgc3RhdGVzID0gdGhpcy5fc3RhdGVzLFxuICAgICAgICBzdGF0ZXNMZW4gPSBzdGF0ZXMubGVuZ3RoO1xuXG4gICAgaWYgKHN0YXRlc0xlbiA9PSAwKXtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgdmFyIHN0YXRlLCB2YWx1ZTtcbiAgICB2YXIgaSA9IC0xO1xuICAgIHdoaWxlICgrK2kgPCBzdGF0ZXNMZW4pIHtcbiAgICAgICAgc3RhdGUgPSBzdGF0ZXNbaV07XG4gICAgICAgIGlmIChzdGF0ZS5vYmplY3QgPT09IG9iamVjdCkge1xuICAgICAgICAgICAgaWYgKHN0YXRlLmtleSA9PT0ga2V5KSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBzdGF0ZS52YWx1ZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdmFsdWU7XG59O1xuXG5IaXN0b3J5LnByb3RvdHlwZS5wb3BTdGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5fZW5hYmxlZCl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuICAgIGlmIChzdGF0ZXMubGVuZ3RoIDwgMSl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgbGFzdFN0YXRlID0gc3RhdGVzLnBvcCgpO1xuICAgIGxhc3RTdGF0ZS5vYmplY3RbbGFzdFN0YXRlLmtleV0gPSBsYXN0U3RhdGUudmFsdWU7XG5cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBIaXN0b3J5RXZlbnQuU1RBVEVfUE9QLCBudWxsKSk7XG59O1xuXG5IaXN0b3J5LnByb3RvdHlwZS5nZXROdW1TdGF0ZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3N0YXRlcy5sZW5ndGg7XG59O1xuXG5IaXN0b3J5Ll9pbnN0YW5jZSA9IG51bGw7XG5cbkhpc3Rvcnkuc2V0dXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIEhpc3RvcnkuX2luc3RhbmNlID0gbmV3IEhpc3RvcnkoKTtcbn07XG5cbkhpc3RvcnkuZ2V0ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBIaXN0b3J5Ll9pbnN0YW5jZTtcbn07XG5cbkhpc3RvcnkucHJvdG90eXBlLmVuYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9lbmFibGVkID0gZmFsc2U7XG59O1xuSGlzdG9yeS5wcm90b3R5cGUuZGlzYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9lbmFibGVkID0gdHJ1ZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSGlzdG9yeTsiLCJ2YXIgSGlzdG9yeUV2ZW50ID0ge1xuXHRTVEFURV9QVVNIOiAnaGlzdG9yeVN0YXRlUHVzaCcsXG5cdFNUQVRFX1BPUDogJ2hpc3RvcnlTdGF0ZVBvcCdcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSGlzdG9yeUV2ZW50OyIsInZhciBIaXN0b3J5ID0gcmVxdWlyZSgnLi9IaXN0b3J5Jyk7XG52YXIgQ29tcG9uZW50ID0gcmVxdWlyZSgnLi9Db21wb25lbnQnKSxcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4vQ29tcG9uZW50RXZlbnQnKSxcbiAgICBPYmplY3RDb21wb25lbnROb3RpZmllciA9IHJlcXVpcmUoJy4vT2JqZWN0Q29tcG9uZW50Tm90aWZpZXInKSxcbiAgICBDb21wb25lbnRPYmplY3RFcnJvciA9IHJlcXVpcmUoJy4vQ29tcG9uZW50T2JqZWN0RXJyb3InKTtcbnZhciBFdmVudF8gPSByZXF1aXJlKCcuL2V2ZW50L0V2ZW50Jyk7XG5cbmZ1bmN0aW9uIE9iamVjdENvbXBvbmVudChwYXJlbnQsIG9iaiwga2V5LCBwYXJhbXMpIHtcbiAgICBpZiAob2JqW2tleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aHJvdyBuZXcgQ29tcG9uZW50T2JqZWN0RXJyb3Iob2JqLCBrZXkpO1xuICAgIH1cbiAgICBwYXJhbXMgPSBwYXJhbXMgfHwge307XG4gICAgcGFyYW1zLmxhYmVsID0gcGFyYW1zLmxhYmVsIHx8IGtleTtcblxuICAgIENvbXBvbmVudC5hcHBseSh0aGlzLCBbcGFyZW50LCBwYXJhbXMubGFiZWxdKTtcblxuICAgIHRoaXMuX29iaiA9IG9iajtcbiAgICB0aGlzLl9rZXkgPSBrZXk7XG4gICAgdGhpcy5fb25DaGFuZ2UgPSBmdW5jdGlvbigpe307XG5cbiAgICBPYmplY3RDb21wb25lbnROb3RpZmllci5nZXQoKS5hZGRFdmVudExpc3RlbmVyKENvbXBvbmVudEV2ZW50LlVQREFURV9WQUxVRSwgdGhpcywgJ29uVmFsdWVVcGRhdGUnKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCwgT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIuZ2V0KCksICdvblZhbHVlVXBkYXRlZCcpO1xufVxuT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoQ29tcG9uZW50LnByb3RvdHlwZSk7XG5PYmplY3RDb21wb25lbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gT2JqZWN0Q29tcG9uZW50O1xuXG4vL092ZXJyaWRlIGluIFN1YmNsYXNzXG5PYmplY3RDb21wb25lbnQucHJvdG90eXBlLmFwcGx5VmFsdWUgPSBmdW5jdGlvbigpIHt9O1xuT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24gKGUpIHt9O1xuXG5PYmplY3RDb21wb25lbnQucHJvdG90eXBlLnB1c2hIaXN0b3J5U3RhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG9iaiA9IHRoaXMuX29iaiwga2V5ID0gdGhpcy5fa2V5O1xuICAgIEhpc3RvcnkuZ2V0KCkucHVzaFN0YXRlKG9iaiwga2V5LCBvYmpba2V5XSk7XG59O1xuXG5PYmplY3RDb21wb25lbnQucHJvdG90eXBlLnNldFZhbHVlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdGhpcy5fb2JqW3RoaXMuX2tleV0gPSB2YWx1ZTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsbnVsbCkpO1xufTtcblxuT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZS5nZXREYXRhID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgb2JqID0ge307XG4gICAgICAgIG9ialt0aGlzLl9rZXldID0gdGhpcy5fb2JqW3RoaXMuX2tleV07XG4gICAgcmV0dXJuIG9iajtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gT2JqZWN0Q29tcG9uZW50O1xuIiwidmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4vZXZlbnQvRXZlbnREaXNwYXRjaGVyJyksXG5cdEV2ZW50XyBcdFx0XHQ9IHJlcXVpcmUoJy4vZXZlbnQvRXZlbnQnKTtcbnZhciBDb21wb25lbnRFdmVudCAgPSByZXF1aXJlKCcuL0NvbXBvbmVudEV2ZW50JyksXG5cdE9wdGlvbkV2ZW50XHRcdD0gcmVxdWlyZSgnLi9PcHRpb25FdmVudCcpO1xuXG5mdW5jdGlvbiBPYmplY3RDb21wb25lbnROb3RpZmllcigpe1xuXHRFdmVudERpc3BhdGNoZXIuYXBwbHkodGhpcyk7XG59XG5PYmplY3RDb21wb25lbnROb3RpZmllci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUpO1xuT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gT2JqZWN0Q29tcG9uZW50Tm90aWZpZXI7XG5cbk9iamVjdENvbXBvbmVudE5vdGlmaWVyLnByb3RvdHlwZS5vblZhbHVlVXBkYXRlZCA9IGZ1bmN0aW9uIChlKSB7XG5cdHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlVQREFURV9WQUxVRSwge29yaWdpbjogZS5zZW5kZXJ9KSk7XG59O1xuXG5PYmplY3RDb21wb25lbnROb3RpZmllci5wcm90b3R5cGUub25PcHRpb25UcmlnZ2VyZWQgPSBmdW5jdGlvbihlKSB7XG5cdHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIE9wdGlvbkV2ZW50LlRSSUdHRVIsIHtvcmlnaW46IGUuc2VuZGVyfSkpO1xufTtcblxudmFyIGluc3RhbmNlID0gbnVsbDtcblxuT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIuZ2V0ID0gZnVuY3Rpb24oKXtcblx0aWYoIWluc3RhbmNlKXtcblx0XHRpbnN0YW5jZSA9IG5ldyBPYmplY3RDb21wb25lbnROb3RpZmllcigpO1xuXHR9XG5cdHJldHVybiBpbnN0YW5jZTtcbn07XG5cbk9iamVjdENvbXBvbmVudE5vdGlmaWVyLmRlc3Ryb3kgPSBmdW5jdGlvbigpe1xuXHRpbnN0YW5jZSA9IG51bGw7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE9iamVjdENvbXBvbmVudE5vdGlmaWVyOyIsInZhciBPcHRpb25FdmVudCA9IHtcblx0VFJJR0dFUkVEOiAnc2VsZWN0VHJpZ2dlcicsXG5cdFRSSUdHRVI6ICd0cmlnZ2VyU2VsZWN0J1xufTtcbm1vZHVsZS5leHBvcnRzID0gT3B0aW9uRXZlbnQ7IiwidmFyIERpYWxvZ1RlbXBsYXRlID1cbiAgICAnPGhlYWQ+XFxuJyArXG4gICAgJyAgIDx0aXRsZT5Db250cm9sS2l0IFN0YXRlPC90aXRsZT5cXG4nICtcbiAgICAnICAgPHN0eWxlIHR5cGU9XCJ0ZXh0L2Nzc1wiPlxcbicgK1xuICAgICcgICAgICBib2R5e1xcbicgK1xuICAgICcgICAgICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDtcXG4nICtcbiAgICAnICAgICAgICAgIHBhZGRpbmc6IDIwcHg7XFxuJyArXG4gICAgJyAgICAgICAgICBtYXJnaW46IDA7XFxuJyArXG4gICAgJyAgICAgICAgICBmb250LWZhbWlseTogQXJpYWwsIHNhbnMtc2VyaWY7XFxuJyArXG4gICAgJyAgICAgICAgICB3aWR0aDogMTAwJTtcXG4nICtcbiAgICAnICAgICAgfVxcbicgK1xuICAgICcgICAgICB0ZXh0YXJlYXtcXG4nICtcbiAgICAnICAgICAgICAgIG1hcmdpbi1ib3R0b206MTBweDtcXG4nICtcbiAgICAnICAgICAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XFxuJyArXG4gICAgJyAgICAgICAgICBwYWRkaW5nOiAwO1xcbicgK1xuICAgICcgICAgICAgICAgYm9yZGVyOiAwO1xcbicgK1xuICAgICcgICAgICAgICAgYm9yZGVyOiAxcHggc29saWQgI2RlZGVkZTtcXG4nICtcbiAgICAnICAgICAgICAgIG91dGxpbmU6IG5vbmU7XFxuJyArXG4gICAgJyAgICAgICAgICBmb250LWZhbWlseTogTW9uYWNvLCBtb25vc3BhY2U7XFxuJyArXG4gICAgJyAgICAgICAgICBmb250LXNpemU6IDExcHg7XFxuJyArXG4gICAgJyAgICAgICAgICByZXNpemU6IG5vbmU7XFxuJyArXG4gICAgJyAgICAgICAgICB3b3JkLXdyYXA6IGJyZWFrLXdvcmQ7XFxuJyArXG4gICAgJyAgICAgICAgICBkaXNwbGF5OiBibG9jaztcXG4nICtcbiAgICAnICAgICAgICAgIHdpZHRoOiAxMDAlO1xcbicgK1xuICAgICcgICAgICAgICAgb3ZlcmZsb3cteTogc2Nyb2xsO1xcbicgK1xuICAgICcgICAgICAgICAgaGVpZ2h0OiAxMjVweDtcXG4nICtcbiAgICAnICAgICAgfVxcbicgK1xuICAgICcgICAgICBidXR0b257XFxuJyArXG4gICAgJyAgICAgICAgICBtYXJnaW46IDA7XFxuJyArXG4gICAgJyAgICAgICAgICBwYWRkaW5nOiAwIDVweCAzcHggNXB4O1xcbicgK1xuICAgICcgICAgICAgICAgaGVpZ2h0OiAyMHB4O1xcbicgK1xuICAgICcgICAgICB9XFxuJytcbiAgICAnICAgICAgI3NhdmUsI2ZpbGVuYW1lLCNsb2Fke1xcbicgK1xuICAgICcgICAgICAgICAgZmxvYXQ6IHJpZ2h0O1xcbicgK1xuICAgICcgICAgICB9XFxuJyArXG4gICAgJyAgICAgIGlucHV0W3R5cGU9XCJ0ZXh0XCJde1xcbicgK1xuICAgICcgICAgICAgICAgbWFyZ2luOiAwO1xcbicgK1xuICAgICcgICAgICAgICAgcGFkZGluZzogMDtcXG4nICtcbiAgICAnICAgICAgICAgIHdpZHRoOiA0NSU7XFxuJyArXG4gICAgJyAgICAgICAgICBoZWlnaHQ6MjBweDtcXG4nICtcbiAgICAnICAgICAgfVxcbicrXG4gICAgJyAgIDwvc3R5bGU+XFxuJyArXG4gICAgJzwvaGVhZD5cXG4nICtcbiAgICAnPGJvZHk+XFxuJyArXG4gICAgJyAgIDx0ZXh0YXJlYSBuYW1lPVwic3RhdGVcIiBpZD1cInN0YXRlXCI+PC90ZXh0YXJlYT5cXG4nICtcbiAgICAnPC9ib2R5Pic7XG5cbnZhciBTYXZlRGlhbG9nVGVtcGxhdGUgPVxuICAgICc8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBpZD1cInNhdmVcIj5TYXZlPC9idXR0b24+XFxuJyArXG4gICAgJzxpbnB1dCB0eXBlPVwidGV4dFwiIGlkPVwiZmlsZW5hbWVcIiB2YWx1ZT1cImNrLXN0YXRlLmpzb25cIj48L2lucHV0Pic7XG5cbnZhciBMb2FkRGlhbG9nVGVtcGxhdGUgPVxuICAgICc8aW5wdXQgdHlwZT1cImZpbGVcIiBpZD1cImxvYWQtZGlza1wiPjwvYnV0dG9uPicgK1xuICAgICc8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBpZD1cImxvYWRcIj5Mb2FkPC9idXR0b24+JztcblxuZnVuY3Rpb24gY3JlYXRlV2luZG93KCl7XG4gICAgdmFyIHdpZHRoID0gMzIwLCBoZWlnaHQgPSAyMDA7XG4gICAgdmFyIHdpbmRvd18gPSB3aW5kb3cub3BlbignJywnJywnXFxcbiAgICAgICAgd2lkdGg9JyArIHdpZHRoICsgJyxcXFxuICAgICAgICBoZWlnaHQ9JyArIGhlaWdodCArICcsXFxcbiAgICAgICAgbGVmdD0nICsgKHdpbmRvdy5zY3JlZW5YICsgd2luZG93LmlubmVyV2lkdGggKiAwLjUgLSB3aWR0aCAqIDAuNSkgKyAnLFxcXG4gICAgICAgIHRvcD0nICsgKHdpbmRvdy5zY3JlZW5ZICsgd2luZG93LmlubmVySGVpZ2h0ICogMC41IC0gaGVpZ2h0ICogMC41KSArICcsXFxcbiAgICAgICAgbG9jYXRpb249MCxcXFxuICAgICAgICB0aXRsZWJhcj0wLFxcXG4gICAgICAgIHJlc2l6YWJsZT0wJyk7XG4gICAgd2luZG93Xy5kb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuaW5uZXJIVE1MID0gRGlhbG9nVGVtcGxhdGU7XG4gICAgcmV0dXJuIHdpbmRvd187XG59XG5cbmZ1bmN0aW9uIHNhdmUoZGF0YSl7XG4gICAgdmFyIHdpbmRvd18gPSBjcmVhdGVXaW5kb3coKTtcbiAgICB2YXIgZG9jdW1lbnRfID0gd2luZG93Xy5kb2N1bWVudDtcbiAgICAgICAgZG9jdW1lbnRfLmJvZHkuaW5uZXJIVE1MICs9IFNhdmVEaWFsb2dUZW1wbGF0ZTtcbiAgICAgICAgZG9jdW1lbnRfLmdldEVsZW1lbnRCeUlkKCdzYXZlJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAvL2xvZyAmIHNhdmUgaW4gbWFpbiB3aW5kb3dcbiAgICAgICAgICAgIHZhciBzdHIgID0gZG9jdW1lbnRfLmdldEVsZW1lbnRCeUlkKCdzdGF0ZScpLnZhbHVlLFxuICAgICAgICAgICAgICAgIGJsb2IgPSBuZXcgQmxvYihbc3RyXSx7dHlwZTonYXBwbGljYXRpb246anNvbid9KSxcbiAgICAgICAgICAgICAgICBuYW1lID0gZG9jdW1lbnRfLmdldEVsZW1lbnRCeUlkKCdmaWxlbmFtZScpLnZhbHVlO1xuICAgICAgICAgICAgdmFyIGEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gICAgICAgICAgICBhLmRvd25sb2FkID0gbmFtZTtcbiAgICAgICAgICAgIGlmKHdpbmRvdy53ZWJraXRVUkwpe1xuICAgICAgICAgICAgICAgIGEuaHJlZiA9IHdpbmRvdy53ZWJraXRVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhLmhyZWYgPSB3aW5kb3cuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICAgICAgICAgICAgICAgIGEuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgICAgICAgICAgICBhLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudF8uYm9keS5yZW1vdmVDaGlsZChhKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBkb2N1bWVudF8uYm9keS5hcHBlbmRDaGlsZChhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGEuY2xpY2soKTtcbiAgICAgICAgfSk7XG4gICAgZG9jdW1lbnRfLmdldEVsZW1lbnRCeUlkKCdzdGF0ZScpLmlubmVyVGV4dCA9IEpTT04uc3RyaW5naWZ5KGRhdGEpO1xufVxuXG5mdW5jdGlvbiBsb2FkKGNhbGxiYWNrKXtcbiAgICB2YXIgd2luZG93XyA9IGNyZWF0ZVdpbmRvdygpO1xuICAgIHZhciBkb2N1bWVudF8gPSB3aW5kb3dfLmRvY3VtZW50O1xuICAgICAgICBkb2N1bWVudF8uYm9keS5pbm5lckhUTUwgKz0gTG9hZERpYWxvZ1RlbXBsYXRlO1xuICAgIHZhciBpbnB1dCAgID0gZG9jdW1lbnRfLmdldEVsZW1lbnRCeUlkKCdzdGF0ZScpO1xuICAgIHZhciBidG5Mb2FkID0gZG9jdW1lbnRfLmdldEVsZW1lbnRCeUlkKCdsb2FkJyk7XG4gICAgICAgIGJ0bkxvYWQuZGlzYWJsZWQgPSB0cnVlO1xuXG4gICAgZnVuY3Rpb24gdmFsaWRhdGVJbnB1dCgpe1xuICAgICAgICB0cnl7XG4gICAgICAgICAgICB2YXIgb2JqID0gSlNPTi5wYXJzZShpbnB1dC52YWx1ZSk7XG4gICAgICAgICAgICBpZihvYmogJiYgdHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgb2JqICE9PSBudWxsKXtcbiAgICAgICAgICAgICAgICBidG5Mb2FkLmRpc2FibGVkID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgYnRuTG9hZC5kaXNhYmxlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpbnB1dC5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsZnVuY3Rpb24oKXtcbiAgICAgICAgdmFsaWRhdGVJbnB1dCgpO1xuICAgIH0pO1xuICAgIGRvY3VtZW50Xy5nZXRFbGVtZW50QnlJZCgnbG9hZCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxmdW5jdGlvbigpe1xuICAgICAgICB2YXIgc3RyID0gaW5wdXQudmFsdWU7XG4gICAgICAgIGNhbGxiYWNrKEpTT04ucGFyc2Uoc3RyKS5kYXRhKTtcbiAgICAgICAgd2luZG93Xy5jbG9zZSgpO1xuICAgIH0pO1xuICAgIHZhciBsb2FkRnJvbURpc2sgPSBkb2N1bWVudF8uZ2V0RWxlbWVudEJ5SWQoJ2xvYWQtZGlzaycpO1xuICAgICAgICBsb2FkRnJvbURpc2suYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJyxmdW5jdGlvbigpe1xuICAgICAgICAgICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgICAgICAgICByZWFkZXIuYWRkRXZlbnRMaXN0ZW5lcignbG9hZGVuZCcsZnVuY3Rpb24oZSl7XG4gICAgICAgICAgICAgICAgaW5wdXQudmFsdWUgPSBlLnRhcmdldC5yZXN1bHQ7XG4gICAgICAgICAgICAgICAgdmFsaWRhdGVJbnB1dCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZWFkZXIucmVhZEFzVGV4dChsb2FkRnJvbURpc2suZmlsZXNbMF0sJ3V0Zi04Jyk7XG4gICAgICAgIH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBsb2FkIDogbG9hZCxcbiAgICBzYXZlIDogc2F2ZVxufTsiLCJmdW5jdGlvbiBDb2xvckZvcm1hdEVycm9yKG1zZykge1xuXHRFcnJvci5hcHBseSh0aGlzKTtcblx0RXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcyxDb2xvckZvcm1hdEVycm9yKTtcblx0dGhpcy5uYW1lID0gJ0NvbG9yRm9ybWF0RXJyb3InO1xuXHR0aGlzLm1lc3NhZ2UgPSBtc2c7XG59XG5Db2xvckZvcm1hdEVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcbkNvbG9yRm9ybWF0RXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQ29sb3JGb3JtYXRFcnJvcjtcblxubW9kdWxlLmV4cG9ydHMgPSBDb2xvckZvcm1hdEVycm9yOyIsInZhciBDb2xvck1vZGUgPSB7XG5cdFJHQiAgOiAncmdiJyxcblx0SFNWICA6ICdoc3YnLFxuXHRIRVggIDogJ2hleCcsXG5cdFJHQmZ2OiAncmdiZnYnXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbG9yTW9kZTsiLCJ2YXIgQ29sb3JVdGlsID0ge1xuXHRIU1YyUkdCOiBmdW5jdGlvbiAoaHVlLCBzYXQsIHZhbCkge1xuXHRcdHZhciBtYXhfaHVlID0gMzYwLjAsXG5cdFx0XHRtYXhfc2F0ID0gMTAwLjAsXG5cdFx0XHRtYXhfdmFsID0gMTAwLjA7XG5cblx0XHR2YXIgbWluX2h1ZSA9IDAuMCxcblx0XHRcdG1pbl9zYXQgPSAwLFxuXHRcdFx0bWluX3ZhbCA9IDA7XG5cblx0XHRodWUgPSBodWUgJSBtYXhfaHVlO1xuXHRcdHZhbCA9IE1hdGgubWF4KG1pbl92YWwsIE1hdGgubWluKHZhbCwgbWF4X3ZhbCkpIC8gbWF4X3ZhbCAqIDI1NS4wO1xuXG5cdFx0aWYgKHNhdCA8PSBtaW5fc2F0KSB7XG5cdFx0XHR2YWwgPSBNYXRoLnJvdW5kKHZhbCk7XG5cdFx0XHRyZXR1cm4gW3ZhbCwgdmFsLCB2YWxdO1xuXHRcdH1cblx0XHRlbHNlIGlmIChzYXQgPiBtYXhfc2F0KXNhdCA9IG1heF9zYXQ7XG5cblx0XHRzYXQgPSBzYXQgLyBtYXhfc2F0O1xuXG5cdFx0Ly9odHRwOi8vZC5oYXRlbmEubmUuanAvamE5LzIwMTAwOTAzLzEyODM1MDQzNFxuXG5cdFx0dmFyIGhpID0gTWF0aC5mbG9vcihodWUgLyA2MC4wKSAlIDYsXG5cdFx0XHRmID0gKGh1ZSAvIDYwLjApIC0gaGksXG5cdFx0XHRwID0gdmFsICogKDEgLSBzYXQpLFxuXHRcdFx0cSA9IHZhbCAqICgxIC0gZiAqIHNhdCksXG5cdFx0XHR0ID0gdmFsICogKDEgLSAoMSAtIGYpICogc2F0KTtcblxuXHRcdHZhciByID0gMCxcblx0XHRcdGcgPSAwLFxuXHRcdFx0YiA9IDA7XG5cblx0XHRzd2l0Y2ggKGhpKSB7XG5cdFx0XHRjYXNlIDA6XG5cdFx0XHRcdHIgPSB2YWw7XG5cdFx0XHRcdGcgPSB0O1xuXHRcdFx0XHRiID0gcDtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIDE6XG5cdFx0XHRcdHIgPSBxO1xuXHRcdFx0XHRnID0gdmFsO1xuXHRcdFx0XHRiID0gcDtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIDI6XG5cdFx0XHRcdHIgPSBwO1xuXHRcdFx0XHRnID0gdmFsO1xuXHRcdFx0XHRiID0gdDtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIDM6XG5cdFx0XHRcdHIgPSBwO1xuXHRcdFx0XHRnID0gcTtcblx0XHRcdFx0YiA9IHZhbDtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIDQ6XG5cdFx0XHRcdHIgPSB0O1xuXHRcdFx0XHRnID0gcDtcblx0XHRcdFx0YiA9IHZhbDtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIDU6XG5cdFx0XHRcdHIgPSB2YWw7XG5cdFx0XHRcdGcgPSBwO1xuXHRcdFx0XHRiID0gcTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRicmVhaztcblx0XHR9XG5cblx0XHRyID0gTWF0aC5yb3VuZChyKTtcblx0XHRnID0gTWF0aC5yb3VuZChnKTtcblx0XHRiID0gTWF0aC5yb3VuZChiKTtcblxuXHRcdHJldHVybiBbciwgZywgYl07XG5cblx0fSxcblxuXHRSR0IySFNWOiBmdW5jdGlvbiAociwgZywgYikge1xuXHRcdHZhciBoID0gMCxcblx0XHRcdHMgPSAwLFxuXHRcdFx0diA9IDA7XG5cblx0XHRyID0gciAvIDI1NS4wO1xuXHRcdGcgPSBnIC8gMjU1LjA7XG5cdFx0YiA9IGIgLyAyNTUuMDtcblxuXHRcdHZhciBtaW5SR0IgPSBNYXRoLm1pbihyLCBNYXRoLm1pbihnLCBiKSksXG5cdFx0XHRtYXhSR0IgPSBNYXRoLm1heChyLCBNYXRoLm1heChnLCBiKSk7XG5cblx0XHRpZiAobWluUkdCID09IG1heFJHQikge1xuXHRcdFx0diA9IG1pblJHQjtcblx0XHRcdHJldHVybiBbMCwgMCwgTWF0aC5yb3VuZCh2KV07XG5cdFx0fVxuXG5cdFx0dmFyIGRkID0gKHIgPT0gbWluUkdCKSA/IGcgLSBiIDogKChiID09IG1pblJHQikgPyByIC0gZyA6IGIgLSByKSxcblx0XHRcdGhoID0gKHIgPT0gbWluUkdCKSA/IDMgOiAoKGIgPT0gbWluUkdCKSA/IDEgOiA1KTtcblxuXHRcdGggPSBNYXRoLnJvdW5kKDYwICogKGhoIC0gZGQgLyAobWF4UkdCIC0gbWluUkdCKSkpO1xuXHRcdHMgPSBNYXRoLnJvdW5kKChtYXhSR0IgLSBtaW5SR0IpIC8gbWF4UkdCICogMTAwLjApO1xuXHRcdHYgPSBNYXRoLnJvdW5kKG1heFJHQiAqIDEwMC4wKTtcblxuXHRcdHJldHVybiBbaCwgcywgdl07XG5cdH0sXG5cblx0UkdCMkhFWDogZnVuY3Rpb24gKHIsIGcsIGIpIHtcblx0XHRyZXR1cm4gXCIjXCIgKyAoKDEgPDwgMjQpICsgKHIgPDwgMTYpICsgKGcgPDwgOCkgKyBiKS50b1N0cmluZygxNikuc2xpY2UoMSk7XG5cdH0sXG5cblx0UkdCZnYySEVYOiBmdW5jdGlvbiAociwgZywgYikge1xuXHRcdHJldHVybiBDb2xvclV0aWwuUkdCMkhFWChNYXRoLmZsb29yKHIgKiAyNTUuMCksXG5cdFx0XHRNYXRoLmZsb29yKGcgKiAyNTUuMCksXG5cdFx0XHRNYXRoLmZsb29yKGIgKiAyNTUuMCkpO1xuXHR9LFxuXG5cdEhTVjJIRVg6IGZ1bmN0aW9uIChoLCBzLCB2KSB7XG5cdFx0dmFyIHJnYiA9IENvbnRyb2xLaXQuQ29sb3JVdGlsLkhTVjJSR0IoaCwgcywgdik7XG5cdFx0cmV0dXJuIENvbnRyb2xLaXQuQ29sb3JVdGlsLlJHQjJIRVgocmdiWzBdLCByZ2JbMV0sIHJnYlsyXSk7XG5cdH0sXG5cblx0SEVYMlJHQjogZnVuY3Rpb24gKGhleCkge1xuXHRcdHZhciBzaG9ydGhhbmRSZWdleCA9IC9eIz8oW2EtZlxcZF0pKFthLWZcXGRdKShbYS1mXFxkXSkkL2k7XG5cdFx0aGV4ID0gaGV4LnJlcGxhY2Uoc2hvcnRoYW5kUmVnZXgsIGZ1bmN0aW9uIChtLCByLCBnLCBiKSB7XG5cdFx0XHRyZXR1cm4gciArIHIgKyBnICsgZyArIGIgKyBiO1xuXHRcdH0pO1xuXG5cdFx0dmFyIHJlc3VsdCA9IC9eIz8oW2EtZlxcZF17Mn0pKFthLWZcXGRdezJ9KShbYS1mXFxkXXsyfSkkL2kuZXhlYyhoZXgpO1xuXHRcdHJldHVybiByZXN1bHQgPyBbcGFyc2VJbnQocmVzdWx0WzFdLCAxNiksIHBhcnNlSW50KHJlc3VsdFsyXSwgMTYpLCBwYXJzZUludChyZXN1bHRbM10sIDE2KV0gOiBudWxsO1xuXG5cdH0sXG5cblx0aXNWYWxpZEhFWDogZnVuY3Rpb24gKGhleCkge1xuXHRcdHJldHVybiAvXiNbMC05QS1GXXs2fSQvaS50ZXN0KGhleCk7XG5cdH0sXG5cblx0aXNWYWxpZFJHQjogZnVuY3Rpb24gKHIsIGcsIGIpIHtcblx0XHRyZXR1cm4gciA+PSAwICYmIHIgPD0gMjU1ICYmXG5cdFx0XHRnID49IDAgJiYgZyA8PSAyNTUgJiZcblx0XHRcdGIgPj0gMCAmJiBiIDw9IDI1NTtcblx0fSxcblxuXHRpc1ZhbGlkUkdCZnY6IGZ1bmN0aW9uIChyLCBnLCBiKSB7XG5cdFx0cmV0dXJuIHIgPj0gMCAmJiByIDw9IDEuMCAmJlxuXHRcdFx0ZyA+PSAwICYmIGcgPD0gMS4wICYmXG5cdFx0XHRiID49IDAgJiYgYiA8PSAxLjA7XG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29sb3JVdGlsOyIsInZhciBDU1MgPSB7XG4gICAgQ29udHJvbEtpdDogJ2NvbnRyb2xLaXQnLFxuXG4gICAgUGFuZWw6ICdwYW5lbCcsXG4gICAgSGVhZDogJ2hlYWQnLFxuICAgIExhYmVsOiAnbGFiZWwnLFxuICAgIE1lbnU6ICdtZW51JyxcbiAgICBXcmFwOiAnd3JhcCcsXG5cbiAgICBCdXR0b25NZW51Q2xvc2U6ICdidXR0b24tbWVudS1jbG9zZScsXG4gICAgQnV0dG9uTWVudUhpZGU6ICdidXR0b24tbWVudS1oaWRlJyxcbiAgICBCdXR0b25NZW51U2hvdzogJ2J1dHRvbi1tZW51LXNob3cnLFxuICAgIEJ1dHRvbk1lbnVVbmRvOiAnYnV0dG9uLW1lbnUtdW5kbycsXG4gICAgQnV0dG9uTWVudUxvYWQ6ICdidXR0b24tbWVudS1sb2FkJyxcbiAgICBCdXR0b25NZW51U2F2ZTogJ2J1dHRvbi1tZW51LXNhdmUnLFxuICAgIE1lbnVBY3RpdmU6ICdtZW51LWFjdGl2ZScsXG5cbiAgICBCdXR0b246ICdidXR0b24nLFxuICAgIEJ1dHRvblByZXNldDogJ2J1dHRvbi1wcmVzZXQnLFxuICAgIEJ1dHRvblByZXNldEFjdGl2ZTogJ2J1dHRvbi1wcmVzZXQtYWN0aXZlJyxcblxuICAgIFdyYXBJbnB1dFdQcmVzZXQ6ICdpbnB1dC13aXRoLXByZXNldC13cmFwJyxcbiAgICBXcmFwQ29sb3JXUHJlc2V0OiAnY29sb3Itd2l0aC1wcmVzZXQtd3JhcCcsXG5cbiAgICBIZWFkSW5hY3RpdmU6ICdoZWFkLWluYWN0aXZlJyxcbiAgICBQYW5lbEhlYWRJbmFjdGl2ZTogJ3BhbmVsLWhlYWQtaW5hY3RpdmUnLFxuXG4gICAgR3JvdXBMaXN0OiAnZ3JvdXAtbGlzdCcsXG4gICAgR3JvdXA6ICdncm91cCcsXG4gICAgU3ViR3JvdXBMaXN0OiAnc3ViLWdyb3VwLWxpc3QnLFxuICAgIFN1Ykdyb3VwOiAnc3ViLWdyb3VwJyxcblxuXG4gICAgVGV4dEFyZWFXcmFwOiAndGV4dGFyZWEtd3JhcCcsXG5cbiAgICBXcmFwU2xpZGVyOiAnd3JhcC1zbGlkZXInLFxuICAgIFNsaWRlcldyYXA6ICdzbGlkZXItd3JhcCcsXG4gICAgU2xpZGVyU2xvdDogJ3NsaWRlci1zbG90JyxcbiAgICBTbGlkZXJIYW5kbGU6ICdzbGlkZXItaGFuZGxlJyxcblxuICAgIEFycm93Qk1pbjogJ2Fycm93LWItbWluJyxcbiAgICBBcnJvd0JNYXg6ICdhcnJvdy1iLW1heCcsXG4gICAgQXJyb3dCU3ViTWluOiAnYXJyb3ctYi1zdWItbWluJyxcbiAgICBBcnJvd0JTdWJNYXg6ICdhcnJvdy1iLXN1Yi1tYXgnLFxuICAgIEFycm93U01pbjogJ2Fycm93LXMtbWluJyxcbiAgICBBcnJvd1NNYXg6ICdhcnJvdy1zLW1heCcsXG5cbiAgICBTZWxlY3Q6ICdzZWxlY3QnLFxuICAgIFNlbGVjdEFjdGl2ZTogJ3NlbGVjdC1hY3RpdmUnLFxuXG4gICAgT3B0aW9uczogJ29wdGlvbnMnLFxuICAgIE9wdGlvbnNTZWxlY3RlZDogJ2xpLXNlbGVjdGVkJyxcblxuICAgIENhbnZhc0xpc3RJdGVtOiAnY2FudmFzLWxpc3QtaXRlbScsXG4gICAgQ2FudmFzV3JhcDogJ2NhbnZhcy13cmFwJyxcblxuICAgIFNWR0xpc3RJdGVtOiAnc3ZnLWxpc3QtaXRlbScsXG4gICAgU1ZHV3JhcDogJ3N2Zy13cmFwJyxcblxuICAgIEdyYXBoU2xpZGVyWFdyYXA6ICdncmFwaC1zbGlkZXIteC13cmFwJyxcbiAgICBHcmFwaFNsaWRlcllXcmFwOiAnZ3JhcGgtc2xpZGVyLXktd3JhcCcsXG4gICAgR3JhcGhTbGlkZXJYOiAnZ3JhcGgtc2xpZGVyLXgnLFxuICAgIEdyYXBoU2xpZGVyWTogJ2dyYXBoLXNsaWRlci15JyxcbiAgICBHcmFwaFNsaWRlclhIYW5kbGU6ICdncmFwaC1zbGlkZXIteC1oYW5kbGUnLFxuICAgIEdyYXBoU2xpZGVyWUhhbmRsZTogJ2dyYXBoLXNsaWRlci15LWhhbmRsZScsXG5cbiAgICBQaWNrZXI6ICdwaWNrZXInLFxuICAgIFBpY2tlckZpZWxkV3JhcDogJ2ZpZWxkLXdyYXAnLFxuICAgIFBpY2tlcklucHV0V3JhcDogJ2lucHV0LXdyYXAnLFxuICAgIFBpY2tlcklucHV0RmllbGQ6ICdpbnB1dC1maWVsZCcsXG4gICAgUGlja2VyQ29udHJvbHNXcmFwOiAnY29udHJvbHMtd3JhcCcsXG4gICAgUGlja2VyQ29sb3JDb250cmFzdDogJ2NvbG9yLWNvbnRyYXN0JyxcbiAgICBQaWNrZXJIYW5kbGVGaWVsZDogJ2luZGljYXRvcicsXG4gICAgUGlja2VySGFuZGxlU2xpZGVyOiAnaW5kaWNhdG9yJyxcblxuICAgIENvbG9yOiAnY29sb3InLFxuXG4gICAgU2Nyb2xsQmFyOiAnc2Nyb2xsQmFyJyxcbiAgICBTY3JvbGxXcmFwOiAnc2Nyb2xsLXdyYXAnLFxuICAgIFNjcm9sbEJhckJ0blVwOiAnYnRuVXAnLFxuICAgIFNjcm9sbEJhckJ0bkRvd246ICdidG5Eb3duJyxcbiAgICBTY3JvbGxCYXJUcmFjazogJ3RyYWNrJyxcbiAgICBTY3JvbGxCYXJUaHVtYjogJ3RodW1iJyxcbiAgICBTY3JvbGxCdWZmZXI6ICdzY3JvbGwtYnVmZmVyJyxcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ1NTO1xuIiwidmFyIERvY3VtZW50RXZlbnQgPSB7XG4gICAgTU9VU0VfTU9WRTogJ21vdXNlbW92ZScsXG4gICAgTU9VU0VfVVA6ICdtb3VzZXVwJyxcbiAgICBNT1VTRV9ET1dOOiAnbW91c2Vkb3duJyxcbiAgICBNT1VTRV9XSEVFTDogJ21vdXNld2hlZWwnLFxuICAgIFdJTkRPV19SRVNJWkU6ICdyZXNpemUnXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IERvY3VtZW50RXZlbnQ7IiwidmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4uL2V2ZW50L0V2ZW50RGlzcGF0Y2hlcicpLFxuICAgIEV2ZW50XyA9IHJlcXVpcmUoJy4uL2V2ZW50L0V2ZW50JyksXG4gICAgRG9jdW1lbnRFdmVudCA9IHJlcXVpcmUoJy4vRG9jdW1lbnRFdmVudCcpO1xudmFyIGluc3RhbmNlID0gbnVsbDtcblxuZnVuY3Rpb24gTW91c2UoKSB7XG4gICAgRXZlbnREaXNwYXRjaGVyLmFwcGx5KHRoaXMpO1xuICAgIHRoaXMuX3BvcyA9IFswLDBdO1xuICAgIHRoaXMuX3doZWVsRGlyZWN0aW9uID0gMDtcbiAgICB0aGlzLl9ob3ZlckVsZW1lbnQgPSBudWxsO1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuX29uRG9jdW1lbnRNb3VzZU1vdmUgPSBmdW5jdGlvbihlKXtcbiAgICAgICAgdmFyIGR4ID0gMCxcbiAgICAgICAgICAgIGR5ID0gMDtcblxuICAgICAgICBpZiAoIWUpZSA9IHdpbmRvdy5ldmVudDtcbiAgICAgICAgaWYgKGUucGFnZVgpIHtcbiAgICAgICAgICAgIGR4ID0gZS5wYWdlWDtcbiAgICAgICAgICAgIGR5ID0gZS5wYWdlWTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChlLmNsaWVudFgpIHtcbiAgICAgICAgICAgIGR4ID0gZS5jbGllbnRYICsgZG9jdW1lbnQuYm9keS5zY3JvbGxMZWZ0ICsgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbExlZnQ7XG4gICAgICAgICAgICBkeSA9IGUuY2xpZW50WSArIGRvY3VtZW50LmJvZHkuc2Nyb2xsVG9wICsgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcDtcbiAgICAgICAgfVxuICAgICAgICBzZWxmLl9wb3NbMF0gPSBkeDtcbiAgICAgICAgc2VsZi5fcG9zWzFdID0gZHk7XG5cbiAgICAgICAgc2VsZi5faG92ZXJFbGVtZW50ID0gZG9jdW1lbnQuZWxlbWVudEZyb21Qb2ludChkeCxkeSk7XG4gICAgfTtcblxuICAgIHRoaXMuX29uRG9jdW1lbnRNb3VzZVdoZWVsID0gZnVuY3Rpb24oZXZlbnQpe1xuICAgICAgICBzZWxmLl93aGVlbERpcmVjdGlvbiA9IChldmVudC5kZXRhaWwgPCAwKSA/IDEgOiAoZXZlbnQud2hlZWxEZWx0YSA+IDApID8gMSA6IC0xO1xuICAgICAgICBzZWxmLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50XyhzZWxmLERvY3VtZW50RXZlbnQuTU9VU0VfV0hFRUwsZXZlbnQpKTtcbiAgICB9O1xuXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsIHRoaXMuX29uRG9jdW1lbnRNb3VzZU1vdmUpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9XSEVFTCx0aGlzLl9vbkRvY3VtZW50TW91c2VXaGVlbCk7XG59XG5Nb3VzZS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUpO1xuTW91c2UucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gTW91c2U7XG5cbk1vdXNlLnByb3RvdHlwZS5fcmVtb3ZlRG9jdW1lbnRMaXN0ZW5lciA9IGZ1bmN0aW9uKCl7XG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsIHRoaXMuX29uRG9jdW1lbnRNb3VzZU1vdmUpO1xuICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9XSEVFTCx0aGlzLl9vbkRvY3VtZW50TW91c2VXaGVlbCk7XG59O1xuXG5Nb3VzZS5wcm90b3R5cGUuZ2V0UG9zaXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3Bvcztcbn07XG5cbk1vdXNlLnByb3RvdHlwZS5nZXRYID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9wb3NbMF07XG59O1xuXG5Nb3VzZS5wcm90b3R5cGUuZ2V0WSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fcG9zWzFdO1xufTtcblxuTW91c2UucHJvdG90eXBlLmdldFdoZWVsRGlyZWN0aW9uID0gZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gdGhpcy5fd2hlZWxEaXJlY3Rpb247XG59O1xuXG5Nb3VzZS5wcm90b3R5cGUuZ2V0SG92ZXJFbGVtZW50ID0gZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gdGhpcy5faG92ZXJFbGVtZW50O1xufTtcblxuTW91c2Uuc2V0dXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgaW5zdGFuY2UgPSBpbnN0YW5jZSB8fCBuZXcgTW91c2UoKTtcbiAgICByZXR1cm4gaW5zdGFuY2U7XG59O1xuXG5Nb3VzZS5nZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGluc3RhbmNlO1xufTtcblxuTW91c2UuZGVzdHJveSA9IGZ1bmN0aW9uKCl7XG4gICAgaW5zdGFuY2UuX3JlbW92ZURvY3VtZW50TGlzdGVuZXIoKTtcbiAgICBpbnN0YW5jZSA9IG51bGw7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1vdXNlOyIsImZ1bmN0aW9uIE5vZGUoKSB7XG4gICAgdGhpcy5fZWxlbWVudCA9IG51bGw7XG5cbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpe1xuICAgICAgICBjYXNlIDEgOlxuICAgICAgICAgICAgdmFyIGFyZyA9IGFyZ3VtZW50c1swXTtcbiAgICAgICAgICAgIGlmIChhcmcgIT0gTm9kZS5JTlBVVF9URVhUICYmXG4gICAgICAgICAgICAgICAgYXJnICE9IE5vZGUuSU5QVVRfQlVUVE9OICYmXG4gICAgICAgICAgICAgICAgYXJnICE9IE5vZGUuSU5QVVRfU0VMRUNUICYmXG4gICAgICAgICAgICAgICAgYXJnICE9IE5vZGUuSU5QVVRfQ0hFQ0tCT1gpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChhcmcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gICAgICAgICAgICAgICAgdGhpcy5fZWxlbWVudC50eXBlID0gYXJnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgIHRoaXMuX2VsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH1cbn1cblxuTm9kZS5ESVYgICAgICAgICAgICA9ICdkaXYnO1xuTm9kZS5JTlBVVF9URVhUICAgICA9ICd0ZXh0Jztcbk5vZGUuSU5QVVRfQlVUVE9OICAgPSAnYnV0dG9uJztcbk5vZGUuSU5QVVRfU0VMRUNUICAgPSAnc2VsZWN0Jztcbk5vZGUuSU5QVVRfQ0hFQ0tCT1ggPSAnY2hlY2tib3gnO1xuTm9kZS5PUFRJT04gICAgICAgICA9ICdvcHRpb24nO1xuTm9kZS5MSVNUICAgICAgICAgICA9ICd1bCc7XG5Ob2RlLkxJU1RfSVRFTSAgICAgID0gJ2xpJztcbk5vZGUuU1BBTiAgICAgICAgICAgPSAnc3Bhbic7XG5Ob2RlLlRFWFRBUkVBICAgICAgID0gJ3RleHRhcmVhJztcblxuTm9kZS5wcm90b3R5cGUgPSB7XG4gICAgYWRkQ2hpbGQ6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQuYXBwZW5kQ2hpbGQobm9kZS5nZXRFbGVtZW50KCkpO1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9LFxuICAgIGFkZENoaWxkcmVuOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBpID0gLTEsIGwgPSBhcmd1bWVudHMubGVuZ3RoLCBlID0gdGhpcy5fZWxlbWVudDtcbiAgICAgICAgd2hpbGUgKCsraSA8IGwpIHtcbiAgICAgICAgICAgIGUuYXBwZW5kQ2hpbGQoYXJndW1lbnRzW2ldLmdldEVsZW1lbnQoKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBhZGRDaGlsZEF0OiBmdW5jdGlvbiAobm9kZSwgaW5kZXgpIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5pbnNlcnRCZWZvcmUobm9kZS5nZXRFbGVtZW50KCksIHRoaXMuX2VsZW1lbnQuY2hpbGRyZW5baW5kZXhdKTtcbiAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfSxcbiAgICByZW1vdmVDaGlsZDogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgaWYgKCF0aGlzLmNvbnRhaW5zKG5vZGUpKXJldHVybiBudWxsO1xuICAgICAgICB0aGlzLl9lbGVtZW50LnJlbW92ZUNoaWxkKG5vZGUuZ2V0RWxlbWVudCgpKTtcbiAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfSxcbiAgICByZW1vdmVDaGlsZHJlbjogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaSA9IC0xLCBsID0gYXJndW1lbnRzLmxlbmd0aCwgZSA9IHRoaXMuX2VsZW1lbnQ7XG4gICAgICAgIHdoaWxlICgrK2kgPCBsKSB7XG4gICAgICAgICAgICBlLnJlbW92ZUNoaWxkKGFyZ3VtZW50c1tpXS5nZXRFbGVtZW50KCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgcmVtb3ZlQ2hpbGRBdDogZnVuY3Rpb24gKG5vZGUsIGluZGV4KSB7XG4gICAgICAgIGlmICghdGhpcy5jb250YWlucyhub2RlKSlyZXR1cm4gbnVsbDtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5yZW1vdmVDaGlsZChub2RlLmdldEVsZW1lbnQoKSk7XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgIH0sXG4gICAgcmVtb3ZlQWxsQ2hpbGRyZW46IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGVsZW1lbnQgPSB0aGlzLl9lbGVtZW50O1xuICAgICAgICB3aGlsZSAoZWxlbWVudC5oYXNDaGlsZE5vZGVzKCkpZWxlbWVudC5yZW1vdmVDaGlsZChlbGVtZW50Lmxhc3RDaGlsZCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgc2V0V2lkdGg6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB0aGlzLl9lbGVtZW50LnN0eWxlLndpZHRoID0gdmFsdWUgKyAncHgnO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGdldFdpZHRoOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbGVtZW50Lm9mZnNldFdpZHRoO1xuICAgIH0sXG4gICAgc2V0SGVpZ2h0OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZS5oZWlnaHQgPSB2YWx1ZSArICdweCc7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgZ2V0SGVpZ2h0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbGVtZW50Lm9mZnNldEhlaWdodDtcbiAgICB9LFxuICAgIHNldFBvc2l0aW9uOiBmdW5jdGlvbiAoeCwgeSkge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXRQb3NpdGlvbih4KS5zZXRQb3NpdGlvbih5KTtcbiAgICB9LFxuICAgIHNldFBvc2l0aW9uWDogZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZS5tYXJnaW5MZWZ0ID0geCArICdweCc7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgc2V0UG9zaXRpb25ZOiBmdW5jdGlvbiAoeSkge1xuICAgICAgICB0aGlzLl9lbGVtZW50LnN0eWxlLm1hcmdpblRvcCA9IHkgKyAncHgnO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHNldFBvc2l0aW9uR2xvYmFsOiBmdW5jdGlvbiAoeCwgeSkge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXRQb3NpdGlvbkdsb2JhbFgoeCkuc2V0UG9zaXRpb25HbG9iYWxZKHkpO1xuICAgIH0sXG4gICAgc2V0UG9zaXRpb25HbG9iYWxYOiBmdW5jdGlvbiAoeCkge1xuICAgICAgICB0aGlzLl9lbGVtZW50LnN0eWxlLmxlZnQgPSB4ICsgJ3B4JztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBzZXRQb3NpdGlvbkdsb2JhbFk6IGZ1bmN0aW9uICh5KSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGUudG9wID0geSArICdweCc7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgZ2V0UG9zaXRpb246IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIFt0aGlzLmdldFBvc2l0aW9uWCgpLCB0aGlzLmdldFBvc2l0aW9uWSgpXTtcbiAgICB9LFxuICAgIGdldFBvc2l0aW9uWDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZWxlbWVudC5vZmZzZXRMZWZ0O1xuICAgIH0sXG4gICAgZ2V0UG9zaXRpb25ZOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbGVtZW50Lm9mZnNldFRvcDtcbiAgICB9LFxuICAgIGdldFBvc2l0aW9uR2xvYmFsOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBvZmZzZXQgPSBbMCwgMF0sXG4gICAgICAgICAgICBlbGVtZW50ID0gdGhpcy5fZWxlbWVudDtcblxuICAgICAgICB3aGlsZSAoZWxlbWVudCkge1xuICAgICAgICAgICAgb2Zmc2V0WzBdICs9IGVsZW1lbnQub2Zmc2V0TGVmdDtcbiAgICAgICAgICAgIG9mZnNldFsxXSArPSBlbGVtZW50Lm9mZnNldFRvcDtcbiAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50Lm9mZnNldFBhcmVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBvZmZzZXQ7XG4gICAgfSxcbiAgICBnZXRQb3NpdGlvbkdsb2JhbFg6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG9mZnNldCA9IDAsXG4gICAgICAgICAgICBlbGVtZW50ID0gdGhpcy5fZWxlbWVudDtcblxuICAgICAgICB3aGlsZSAoZWxlbWVudCkge1xuICAgICAgICAgICAgb2Zmc2V0ICs9IGVsZW1lbnQub2Zmc2V0TGVmdDtcbiAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50Lm9mZnNldFBhcmVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBvZmZzZXQ7XG4gICAgfSxcbiAgICBnZXRQb3NpdGlvbkdsb2JhbFk6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG9mZnNldCA9IDAsXG4gICAgICAgICAgICBlbGVtZW50ID0gdGhpcy5fZWxlbWVudDtcblxuICAgICAgICB3aGlsZSAoZWxlbWVudCkge1xuICAgICAgICAgICAgb2Zmc2V0ICs9IGVsZW1lbnQub2Zmc2V0VG9wO1xuICAgICAgICAgICAgZWxlbWVudCA9IGVsZW1lbnQub2Zmc2V0UGFyZW50O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG9mZnNldDtcbiAgICB9LFxuICAgIGFkZEV2ZW50TGlzdGVuZXI6IGZ1bmN0aW9uICh0eXBlLCBsaXN0ZW5lciwgdXNlQ2FwdHVyZSkge1xuICAgICAgICB0aGlzLl9lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgbGlzdGVuZXIsIHVzZUNhcHR1cmUpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHJlbW92ZUV2ZW50TGlzdGVuZXI6IGZ1bmN0aW9uICh0eXBlLCBsaXN0ZW5lciwgdXNlQ2FwdHVyZSkge1xuICAgICAgICB0aGlzLl9lbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgbGlzdGVuZXIsIHVzZUNhcHR1cmUpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGRpc3BhdGNoRXZlbnQgOiBmdW5jdGlvbihldmVudCkge1xuICAgICAgICB0aGlzLl9lbGVtZW50LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHNldFN0eWxlQ2xhc3M6IGZ1bmN0aW9uIChzdHlsZSkge1xuICAgICAgICB0aGlzLl9lbGVtZW50LmNsYXNzTmFtZSA9IHN0eWxlO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHNldFN0eWxlUHJvcGVydHk6IGZ1bmN0aW9uIChwcm9wZXJ0eSwgdmFsdWUpIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZVtwcm9wZXJ0eV0gPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBnZXRTdHlsZVByb3BlcnR5OiBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VsZW1lbnQuc3R5bGVbcHJvcGVydHldO1xuICAgIH0sXG4gICAgc2V0U3R5bGVQcm9wZXJ0aWVzOiBmdW5jdGlvbiAocHJvcGVydGllcykge1xuICAgICAgICBmb3IgKHZhciBwIGluIHByb3BlcnRpZXMpe1xuICAgICAgICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZVtwXSA9IHByb3BlcnRpZXNbcF07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBkZWxldGVTdHlsZUNsYXNzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQuY2xhc3NOYW1lID0gJyc7XG4gICAgICAgIHJldHVybiB0aGlzXG4gICAgfSxcbiAgICBkZWxldGVTdHlsZVByb3BlcnR5OiBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZVtwcm9wZXJ0eV0gPSAnJztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBkZWxldGVTdHlsZVByb3BlcnRpZXM6IGZ1bmN0aW9uIChwcm9wZXJ0aWVzKSB7XG4gICAgICAgIGZvciAodmFyIHAgaW4gcHJvcGVydGllcyl7XG4gICAgICAgICAgICB0aGlzLl9lbGVtZW50LnN0eWxlW3BdID0gJyc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBnZXRDaGlsZEF0OiBmdW5jdGlvbiAoaW5kZXgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBOb2RlKCkuc2V0RWxlbWVudCh0aGlzLl9lbGVtZW50LmNoaWxkcmVuW2luZGV4XSk7XG4gICAgfSxcbiAgICBnZXRDaGlsZEluZGV4OiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXhPZih0aGlzLl9lbGVtZW50LCBub2RlLmdldEVsZW1lbnQoKSk7XG4gICAgfSxcbiAgICBnZXROdW1DaGlsZHJlbjogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZWxlbWVudC5jaGlsZHJlbi5sZW5ndGg7XG4gICAgfSxcbiAgICBnZXRGaXJzdENoaWxkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgTm9kZSgpLnNldEVsZW1lbnQodGhpcy5fZWxlbWVudC5maXJzdENoaWxkKTtcbiAgICB9LFxuICAgIGdldExhc3RDaGlsZDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IE5vZGUoKS5zZXRFbGVtZW50KHRoaXMuX2VsZW1lbnQubGFzdENoaWxkKTtcbiAgICB9LFxuICAgIGhhc0NoaWxkcmVuOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbGVtZW50LmNoaWxkcmVuLmxlbmd0aCAhPSAwO1xuICAgIH0sXG4gICAgY29udGFpbnM6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbmRleE9mKHRoaXMuX2VsZW1lbnQsIG5vZGUuZ2V0RWxlbWVudCgpKSAhPSAtMTtcbiAgICB9LFxuICAgIF9pbmRleE9mOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCwgZWxlbWVudCkge1xuICAgICAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLmluZGV4T2YuY2FsbChwYXJlbnRFbGVtZW50LmNoaWxkcmVuLCBlbGVtZW50KTtcbiAgICB9LFxuICAgIHNldFByb3BlcnR5OiBmdW5jdGlvbiAocHJvcGVydHksIHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnRbcHJvcGVydHldID0gdmFsdWU7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgc2V0UHJvcGVydGllczogZnVuY3Rpb24gKHByb3BlcnRpZXMpIHtcbiAgICAgICAgZm9yICh2YXIgcCBpbiBwcm9wZXJ0aWVzKXtcbiAgICAgICAgICAgIHRoaXMuX2VsZW1lbnRbcF0gPSBwcm9wZXJ0aWVzW3BdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgZ2V0UHJvcGVydHk6IGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZWxlbWVudFtwcm9wZXJ0eV07XG4gICAgfSxcbiAgICBzZXRFbGVtZW50OiBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICB0aGlzLl9lbGVtZW50ID0gZWxlbWVudDtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBnZXRFbGVtZW50OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbGVtZW50O1xuICAgIH0sXG4gICAgZ2V0U3R5bGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VsZW1lbnQuc3R5bGU7XG4gICAgfSxcbiAgICBnZXRQYXJlbnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBOb2RlKCkuc2V0RWxlbWVudCh0aGlzLl9lbGVtZW50LnBhcmVudE5vZGUpO1xuICAgIH1cbn07XG5cbk5vZGUuZ2V0Tm9kZUJ5RWxlbWVudCA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgcmV0dXJuIG5ldyBOb2RlKCkuc2V0RWxlbWVudChlbGVtZW50KTtcbn07XG5Ob2RlLmdldE5vZGVCeUlkID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgcmV0dXJuIG5ldyBOb2RlKCkuc2V0RWxlbWVudChkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCkpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBOb2RlOyIsInZhciBOb2RlRXZlbnQgPSB7XG4gICAgTU9VU0VfRE9XTiAgIDogJ21vdXNlZG93bicsXG4gICAgTU9VU0VfVVAgICAgIDogJ21vdXNldXAnLFxuICAgIE1PVVNFX09WRVIgICA6ICdtb3VzZW92ZXInLFxuICAgIE1PVVNFX01PVkUgICA6ICdtb3VzZW1vdmUnLFxuICAgIE1PVVNFX09VVCAgICA6ICdtb3VzZW91dCcsXG4gICAgS0VZX0RPV04gICAgIDogJ2tleWRvd24nLFxuICAgIEtFWV9VUCAgICAgICA6ICdrZXl1cCcsXG4gICAgQ0hBTkdFICAgICAgIDogJ2NoYW5nZScsXG4gICAgRklOSVNIICAgICAgIDogJ2ZpbmlzaCcsXG4gICAgREJMX0NMSUNLICAgIDogJ2RibGNsaWNrJyxcbiAgICBPTl9DTElDSyAgICAgOiAnY2xpY2snLFxuICAgIFNFTEVDVF9TVEFSVCA6ICdzZWxlY3RzdGFydCcsXG4gICAgRFJBR19TVEFSVCAgIDogJ2RyYWdzdGFydCcsXG4gICAgRFJBRyAgICAgICAgIDogJ2RyYWcnLFxuICAgIERSQUdfRU5EICAgICA6ICdkcmFnZW5kJyxcblxuICAgIERSQUdfRU5URVIgICA6ICdkcmFnZW50ZXInLFxuICAgIERSQUdfT1ZFUiAgICA6ICdkcmFnb3ZlcicsXG4gICAgRFJBR19MRUFWRSAgIDogJ2RyYWdsZWF2ZScsXG5cbiAgICBSRVNJWkUgICAgICAgOiAncmVzaXplJ1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBOb2RlRXZlbnQ7IiwidmFyIFN0eWxlID0geyBzdHJpbmcgOiBcIiNjb250cm9sS2l0e3Bvc2l0aW9uOmFic29sdXRlO3RvcDowO2xlZnQ6MDt3aWR0aDoxMDAlO2hlaWdodDoxMDAlOy13ZWJraXQtdG91Y2gtY2FsbG91dDpub25lOy13ZWJraXQtdXNlci1zZWxlY3Q6bm9uZTsta2h0bWwtdXNlci1zZWxlY3Q6bm9uZTstbW96LXVzZXItc2VsZWN0Om5vbmU7LW1zLXVzZXItc2VsZWN0Om5vbmU7dXNlci1zZWxlY3Q6bm9uZTtwb2ludGVyLWV2ZW50czpub25lfSNjb250cm9sS2l0IC5wYW5lbHstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7cG9pbnRlci1ldmVudHM6YXV0bztwb3NpdGlvbjpyZWxhdGl2ZTt6LWluZGV4OjE7LXdlYmtpdC10b3VjaC1jYWxsb3V0Om5vbmU7LXdlYmtpdC11c2VyLXNlbGVjdDpub25lOy1raHRtbC11c2VyLXNlbGVjdDpub25lOy1tb3otdXNlci1zZWxlY3Q6bm9uZTstbXMtdXNlci1zZWxlY3Q6bm9uZTt1c2VyLXNlbGVjdDpub25lO292ZXJmbG93OmhpZGRlbjtvcGFjaXR5OjE7ZmxvYXQ6bGVmdDt3aWR0aDoyMDBweDtib3JkZXItcmFkaXVzOjNweDstbW96LWJvcmRlci1yYWRpdXM6M3B4O2JveC1zaGFkb3c6MCAycHggMnB4IHJnYmEoMCwwLDAsLjI1KTttYXJnaW46MDtwYWRkaW5nOjA7YmFja2dyb3VuZC1jb2xvcjojMWExYTFhO2ZvbnQtZmFtaWx5OkFyaWFsLHNhbnMtc2VyaWZ9I2NvbnRyb2xLaXQgLnBhbmVsIC53cmFwe3dpZHRoOmF1dG87aGVpZ2h0OmF1dG87bWFyZ2luOjA7cGFkZGluZzowO3Bvc2l0aW9uOnJlbGF0aXZlO292ZXJmbG93OmhpZGRlbn0jY29udHJvbEtpdCAucGFuZWwgdWx7bWFyZ2luOjA7cGFkZGluZzowO2xpc3Qtc3R5bGU6bm9uZX0jY29udHJvbEtpdCAucGFuZWwgLmNvbG9yLCNjb250cm9sS2l0IC5wYW5lbCBpbnB1dFt0eXBlPXRleHRdLCNjb250cm9sS2l0IC5wYW5lbCB0ZXh0YXJlYSwjY29udHJvbEtpdCAucGlja2VyIGlucHV0W3R5cGU9dGV4dF17LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O3dpZHRoOjEwMCU7aGVpZ2h0OjI1cHg7cGFkZGluZzowIDAgMCA4cHg7Zm9udC1mYW1pbHk6QXJpYWwsc2Fucy1zZXJpZjtmb250LXNpemU6MTFweDtjb2xvcjojZmZmO3RleHQtc2hhZG93OjFweCAxcHggIzAwMDtvdXRsaW5lOjA7YmFja2dyb3VuZDojMjIyNzI5O2JhY2tncm91bmQtaW1hZ2U6LW8tbGluZWFyLWdyYWRpZW50KHJnYmEoMCwwLDAsLjA3NSkgMCxyZ2JhKDAsMCwwLC4xMjUpIDEwMCUpO2JhY2tncm91bmQtaW1hZ2U6bGluZWFyLWdyYWRpZW50KHJnYmEoMCwwLDAsLjA3NSkgMCxyZ2JhKDAsMCwwLC4xMjUpIDEwMCUpO2JvcmRlcjpub25lO2JveC1zaGFkb3c6MCAwIDAgMXB4ICMxZjFmMWYgaW5zZXQ7Ym9yZGVyLXJhZGl1czoycHg7LW1vei1ib3JkZXItcmFkaXVzOjJweH0jY29udHJvbEtpdCAucGFuZWwgLmJ1dHRvbiwjY29udHJvbEtpdCAucGFuZWwgLnNlbGVjdCwjY29udHJvbEtpdCAucGFuZWwgLnNlbGVjdC1hY3RpdmUsI2NvbnRyb2xLaXQgLnBpY2tlciAuYnV0dG9uey13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveDtjdXJzb3I6cG9pbnRlcjt3aWR0aDoxMDAlO2hlaWdodDoyNnB4O21hcmdpbjowO2JhY2tncm91bmQtaW1hZ2U6LW8tbGluZWFyLWdyYWRpZW50KCM0MDQwNDAgMCwjM2IzYjNiIDEwMCUpO2JhY2tncm91bmQtaW1hZ2U6bGluZWFyLWdyYWRpZW50KCM0MDQwNDAgMCwjM2IzYjNiIDEwMCUpO2JvcmRlcjpub25lO291dGxpbmU6MDtib3JkZXItcmFkaXVzOjJweDtib3gtc2hhZG93OjAgMCAwIDFweCAjMWYxZjFmIGluc2V0LC0xcHggMnB4IDAgMCAjNGE0YTRhIGluc2V0O2ZvbnQtZmFtaWx5OkFyaWFsLHNhbnMtc2VyaWY7Y29sb3I6I2ZmZn0jY29udHJvbEtpdCAucGFuZWwgdGV4dGFyZWF7cGFkZGluZzo1cHggOHB4IDJweDtvdmVyZmxvdzpoaWRkZW47cmVzaXplOm5vbmU7dmVydGljYWwtYWxpZ246dG9wO3doaXRlLXNwYWNlOm5vd3JhcH0jY29udHJvbEtpdCAucGFuZWwgLnRleHRhcmVhLXdyYXB7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O3dpZHRoOjEwMCU7cGFkZGluZzowO2Zsb2F0OmxlZnQ7aGVpZ2h0OjEwMCU7b3ZlcmZsb3c6aGlkZGVuO2JvcmRlcjpub25lO2JvcmRlci1yYWRpdXM6MnB4Oy1tb3otYm9yZGVyLXJhZGl1czoycHg7YmFja2dyb3VuZC1jb2xvcjojMjIyNzI5O2JveC1zaGFkb3c6MCAwIDFweCAycHggcmdiYSgwLDAsMCwuMDEyNSkgaW5zZXQsMCAwIDFweCAxcHggIzExMTMxNCBpbnNldDtiYWNrZ3JvdW5kLWltYWdlOi1vLWxpbmVhci1ncmFkaWVudChyZ2JhKDAsMCwwLC4wNzUpIDAscmdiYSgwLDAsMCwuMTI1KSAxMDAlKTtiYWNrZ3JvdW5kLWltYWdlOmxpbmVhci1ncmFkaWVudChyZ2JhKDAsMCwwLC4wNzUpIDAscmdiYSgwLDAsMCwuMTI1KSAxMDAlKX0jY29udHJvbEtpdCAucGFuZWwgLnRleHRhcmVhLXdyYXAgdGV4dGFyZWF7Ym9yZGVyOm5vbmU7Ym9yZGVyLXJhZGl1czoycHg7LW1vei1ib3JkZXItcmFkaXVzOjJweDtib3gtc2hhZG93Om5vbmU7YmFja2dyb3VuZDowIDB9I2NvbnRyb2xLaXQgLnBhbmVsIC50ZXh0YXJlYS13cmFwIC5zY3JvbGxCYXJ7Ym9yZGVyOjFweCBzb2xpZCAjMTAxMjEzO2JvcmRlci1ib3R0b20tcmlnaHQtcmFkaXVzOjJweDtib3JkZXItdG9wLXJpZ2h0LXJhZGl1czoycHg7Ym9yZGVyLWxlZnQ6bm9uZTtib3gtc2hhZG93OjAgMCAxcHggMnB4IHJnYmEoMCwwLDAsLjAxMjUpIGluc2V0LDAgMCAxcHggMXB4ICMxMTEzMTQgaW5zZXR9I2NvbnRyb2xLaXQgLnBhbmVsIGNhbnZhc3tjdXJzb3I6cG9pbnRlcjt2ZXJ0aWNhbC1hbGlnbjpib3R0b207Ym9yZGVyOm5vbmU7Ym94LXNoYWRvdzowIDAgMCAxcHggIzFmMWYxZiBpbnNldDtib3JkZXItcmFkaXVzOjJweDstbW96LWJvcmRlci1yYWRpdXM6MnB4fSNjb250cm9sS2l0IC5wYW5lbCAuY2FudmFzLXdyYXAsI2NvbnRyb2xLaXQgLnBhbmVsIC5zdmctd3JhcHttYXJnaW46NnB4IDAgMDtwb3NpdGlvbjpyZWxhdGl2ZTt3aWR0aDo3MCU7ZmxvYXQ6cmlnaHQ7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O2JvcmRlcjpub25lO2JvcmRlci1yYWRpdXM6MnB4Oy1tb3otYm9yZGVyLXJhZGl1czoycHg7YmFja2dyb3VuZDojMWUyMjI0O2JhY2tncm91bmQtaW1hZ2U6LW8tbGluZWFyLWdyYWRpZW50KHRyYW5zcGFyZW50IDAscmdiYSgwLDAsMCwuMDUpIDEwMCUpO2JhY2tncm91bmQtaW1hZ2U6bGluZWFyLWdyYWRpZW50KHRyYW5zcGFyZW50IDAscmdiYSgwLDAsMCwuMDUpIDEwMCUpfSNjb250cm9sS2l0IC5wYW5lbCAuY2FudmFzLXdyYXAgc3ZnLCNjb250cm9sS2l0IC5wYW5lbCAuc3ZnLXdyYXAgc3Zne3Bvc2l0aW9uOmFic29sdXRlO2xlZnQ6MDt0b3A6MDtjdXJzb3I6cG9pbnRlcjt2ZXJ0aWNhbC1hbGlnbjpib3R0b207Ym9yZGVyOm5vbmU7Ym94LXNoYWRvdzowIDAgMCAxcHggIzFmMWYxZiBpbnNldDtib3JkZXItcmFkaXVzOjJweDstbW96LWJvcmRlci1yYWRpdXM6MnB4fSNjb250cm9sS2l0IC5wYW5lbCAuYnV0dG9uLCNjb250cm9sS2l0IC5waWNrZXIgLmJ1dHRvbntmb250LXNpemU6MTBweDtmb250LXdlaWdodDo3MDA7dGV4dC1zaGFkb3c6MCAxcHggIzAwMDt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2V9I2NvbnRyb2xLaXQgLnBhbmVsIC5idXR0b246aG92ZXIsI2NvbnRyb2xLaXQgLnBpY2tlciAuYnV0dG9uOmhvdmVye2JhY2tncm91bmQtaW1hZ2U6LW8tbGluZWFyLWdyYWRpZW50KCM0NTQ1NDUgMCwjM2IzYjNiIDEwMCUpO2JhY2tncm91bmQtaW1hZ2U6bGluZWFyLWdyYWRpZW50KCM0NTQ1NDUgMCwjM2IzYjNiIDEwMCUpfSNjb250cm9sS2l0IC5wYW5lbCAuYnV0dG9uOmFjdGl2ZSwjY29udHJvbEtpdCAucGlja2VyIC5idXR0b246YWN0aXZle2JhY2tncm91bmQtaW1hZ2U6LW8tbGluZWFyLWdyYWRpZW50KCM0MDQwNDAgMCwjM2IzYjNiIDEwMCUpO2JhY2tncm91bmQtaW1hZ2U6bGluZWFyLWdyYWRpZW50KCM0MDQwNDAgMCwjM2IzYjNiIDEwMCUpfSNjb250cm9sS2l0IC5wYW5lbCAuY29sb3Itd2l0aC1wcmVzZXQtd3JhcCwjY29udHJvbEtpdCAucGFuZWwgLmlucHV0LXdpdGgtcHJlc2V0LXdyYXB7d2lkdGg6MTAwJTtmbG9hdDpsZWZ0fSNjb250cm9sS2l0IC5wYW5lbCAuY29sb3Itd2l0aC1wcmVzZXQtd3JhcCAuY29sb3IsI2NvbnRyb2xLaXQgLnBhbmVsIC5pbnB1dC13aXRoLXByZXNldC13cmFwIGlucHV0W3R5cGU9dGV4dF17cGFkZGluZy1yaWdodDoyNXB4O2JvcmRlci10b3AtcmlnaHQtcmFkaXVzOjJweDtib3JkZXItYm90dG9tLXJpZ2h0LXJhZGl1czoycHg7ZmxvYXQ6bGVmdH0jY29udHJvbEtpdCAucGFuZWwgLmJ1dHRvbi1wcmVzZXQsI2NvbnRyb2xLaXQgLnBhbmVsIC5idXR0b24tcHJlc2V0LWFjdGl2ZXstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7cG9zaXRpb246YWJzb2x1dGU7cmlnaHQ6MDt3aWR0aDoyMHB4O2hlaWdodDoyNXB4O21hcmdpbjowO2N1cnNvcjpwb2ludGVyO2Zsb2F0OnJpZ2h0O2JvcmRlcjpub25lO2JvcmRlci10b3AtcmlnaHQtcmFkaXVzOjJweDtib3JkZXItYm90dG9tLXJpZ2h0LXJhZGl1czoycHg7Ym94LXNoYWRvdzowIDAgMCAxcHggIzFmMWYxZiBpbnNldCwtMXB4IDJweCAwIDAgIzRhNGE0YSBpbnNldDtvdXRsaW5lOjB9I2NvbnRyb2xLaXQgLnBhbmVsIC5idXR0b24tcHJlc2V0LWFjdGl2ZSwjY29udHJvbEtpdCAucGFuZWwgLmJ1dHRvbi1wcmVzZXQ6aG92ZXJ7YmFja2dyb3VuZDp1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFGQ0FZQUFBQjRrYTFWQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQUc1SlJFRlVlTnBpNU9EaWFtUmdZS2hqd0E0YW1WeDhneGptTDFyQzhQM3JWeFE4YitFU0JoZmZJQVptTlIyOUE1ZXZYV2RpWkdDMDE5WFNaR0JnWUdCWXZtWTl3N0kxNnhvWkdCZ2FXS0JHMVM5YnMrNC9Bd05EUFFNREExeVNnWUdCZ2RFblBBYlp6Z1kwbWdFd0FFOWxKVDFscnNmZkFBQUFBRWxGVGtTdVFtQ0MpIDUwJSA1MCUgbm8tcmVwZWF0LGxpbmVhci1ncmFkaWVudCgjNDU0NTQ1IDAsIzNiM2IzYiAxMDAlKX0jY29udHJvbEtpdCAucGFuZWwgLmJ1dHRvbi1wcmVzZXR7YmFja2dyb3VuZDp1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFGQ0FZQUFBQjRrYTFWQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQUc1SlJFRlVlTnBpNU9EaWFtUmdZS2hqd0E0YW1WeDhneGptTDFyQzhQM3JWeFE4YitFU0JoZmZJQVptTlIyOUE1ZXZYV2RpWkdDMDE5WFNaR0JnWUdCWXZtWTl3N0kxNnhvWkdCZ2FXS0JHMVM5YnMrNC9Bd05EUFFNREExeVNnWUdCZ2RFblBBYlp6Z1kwbWdFd0FFOWxKVDFscnNmZkFBQUFBRWxGVGtTdVFtQ0MpIDUwJSA1MCUgbm8tcmVwZWF0LGxpbmVhci1ncmFkaWVudCgjNDA0MDQwIDAsIzNiM2IzYiAxMDAlKX0jY29udHJvbEtpdCAucGFuZWwgaW5wdXRbdHlwZT1jaGVja2JveF17bWFyZ2luOjZweCAwIDB9I2NvbnRyb2xLaXQgLnBhbmVsIC5zZWxlY3QsI2NvbnRyb2xLaXQgLnBhbmVsIC5zZWxlY3QtYWN0aXZle3BhZGRpbmctbGVmdDoxMHB4O3BhZGRpbmctcmlnaHQ6MjBweDtmb250LXNpemU6MTFweDt0ZXh0LWFsaWduOmxlZnQ7dGV4dC1zaGFkb3c6MXB4IDFweCAjMDAwO2N1cnNvcjpwb2ludGVyO292ZXJmbG93OmhpZGRlbjt3aGl0ZS1zcGFjZTpub3dyYXA7dGV4dC1vdmVyZmxvdzplbGxpcHNpc30jY29udHJvbEtpdCAucGFuZWwgLnNlbGVjdHtiYWNrZ3JvdW5kOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUJBQUFBQUxDQVlBQUFCMjRnMDVBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBTU5KUkVGVWVOcWNrakVLd2pBVWhqOGw1M0FRNTI2QkhLS0xJaFNsSGtIeEJra3VJRldQSUxRT1FRZDNWNFZ1WGlndUZsckZSUHpoTFhsODMzdUIxMHV6bkNhUCtxNEJFcWxzODNZNUhnaEZ0T0gxYW1rQWl0MitJd2ttelhJR3c1SGVGRnZmWkZOcy9XQTQwbW1XNDcwUDFnZjhMb2tKUkNJVjExdk45YmI0MkM2Ukt2b0RBZGhYL1JYeHFPOEcwRi82RmpCQlFTSVY4K21FMlhUY2FWVHVUT2xPMFEzNmdDbmR5VmJ1L0E1SHA3ZnZ3THltYWVCbnVITklMUW0vd2dEUEFRQVBOSXNIbk83OTRRQUFBQUJKUlU1RXJrSmdnZz09KSAxMDAlIDUwJSBuby1yZXBlYXQsbGluZWFyLWdyYWRpZW50KCM0MDQwNDAgMCwjM2IzYjNiIDEwMCUpfSNjb250cm9sS2l0IC5wYW5lbCAuc2VsZWN0LWFjdGl2ZSwjY29udHJvbEtpdCAucGFuZWwgLnNlbGVjdDpob3ZlcntiYWNrZ3JvdW5kOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUJBQUFBQUxDQVlBQUFCMjRnMDVBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBTU5KUkVGVWVOcWNrakVLd2pBVWhqOGw1M0FRNTI2QkhLS0xJaFNsSGtIeEJra3VJRldQSUxRT1FRZDNWNFZ1WGlndUZsckZSUHpoTFhsODMzdUIxMHV6bkNhUCtxNEJFcWxzODNZNUhnaEZ0T0gxYW1rQWl0MitJd2ttelhJR3c1SGVGRnZmWkZOcy9XQTQwbW1XNDcwUDFnZjhMb2tKUkNJVjExdk45YmI0MkM2Ukt2b0RBZGhYL1JYeHFPOEcwRi82RmpCQlFTSVY4K21FMlhUY2FWVHVUT2xPMFEzNmdDbmR5VmJ1L0E1SHA3ZnZ3THltYWVCbnVITklMUW0vd2dEUEFRQVBOSXNIbk83OTRRQUFBQUJKUlU1RXJrSmdnZz09KSAxMDAlIDUwJSBuby1yZXBlYXQsbGluZWFyLWdyYWRpZW50KCM0NTQ1NDUgMCwjM2IzYjNiIDEwMCUpfSNjb250cm9sS2l0IC5wYW5lbCAuc2xpZGVyLWhhbmRsZSwjY29udHJvbEtpdCAucGFuZWwgLnNsaWRlci1zbG90LCNjb250cm9sS2l0IC5wYW5lbCAuc2xpZGVyLXdyYXAsI2NvbnRyb2xLaXQgLnBhbmVsIC53cmFwLXNsaWRlcnstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3h9I2NvbnRyb2xLaXQgLnBhbmVsIC53cmFwLXNsaWRlcnt3aWR0aDo3MCU7cGFkZGluZzo2cHggMCAwO2Zsb2F0OnJpZ2h0O2hlaWdodDoxMDAlfSNjb250cm9sS2l0IC5wYW5lbCAud3JhcC1zbGlkZXIgaW5wdXRbdHlwZT10ZXh0XXt3aWR0aDoyNSU7dGV4dC1hbGlnbjpjZW50ZXI7cGFkZGluZzowO2Zsb2F0OnJpZ2h0fSNjb250cm9sS2l0IC5wYW5lbCAuc2xpZGVyLXdyYXB7ZmxvYXQ6bGVmdDtjdXJzb3I6ZXctcmVzaXplO3dpZHRoOjcwJX0jY29udHJvbEtpdCAucGFuZWwgLnNsaWRlci1zbG90e3dpZHRoOjEwMCU7aGVpZ2h0OjI1cHg7cGFkZGluZzozcHg7YmFja2dyb3VuZC1jb2xvcjojMWUyMjI0O2JvcmRlcjpub25lO2JveC1zaGFkb3c6MCAwIDAgMXB4ICMxZjFmMWYgaW5zZXQ7Ym9yZGVyLXJhZGl1czoycHg7LW1vei1ib3JkZXItcmFkaXVzOjJweH0jY29udHJvbEtpdCAucGFuZWwgLnNsaWRlci1oYW5kbGV7cG9zaXRpb246cmVsYXRpdmU7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJTtiYWNrZ3JvdW5kOiNiMzI0MzU7YmFja2dyb3VuZC1pbWFnZTotby1saW5lYXItZ3JhZGllbnQodHJhbnNwYXJlbnQgMCxyZ2JhKDAsMCwwLC4xKSAxMDAlKTtiYWNrZ3JvdW5kLWltYWdlOmxpbmVhci1ncmFkaWVudCh0cmFuc3BhcmVudCAwLHJnYmEoMCwwLDAsLjEpIDEwMCUpO2JveC1zaGFkb3c6MCAxcHggMCAwICMwZjBmMGZ9I2NvbnRyb2xLaXQgLnBhbmVsIC5jb2xvcnstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7LXdlYmtpdC10b3VjaC1jYWxsb3V0Om5vbmU7LXdlYmtpdC11c2VyLXNlbGVjdDpub25lOy1raHRtbC11c2VyLXNlbGVjdDpub25lOy1tb3otdXNlci1zZWxlY3Q6bm9uZTstbXMtdXNlci1zZWxlY3Q6bm9uZTt1c2VyLXNlbGVjdDpub25lO2N1cnNvcjpwb2ludGVyO3dpZHRoOjEwMCU7aGVpZ2h0OjI1cHg7cGFkZGluZzowO2JvcmRlcjpub25lO2JhY2tncm91bmQ6I2ZmZjtib3gtc2hhZG93OjAgMCAwIDFweCAjMTExMzE0IGluc2V0O3RleHQtYWxpZ246Y2VudGVyO2xpbmUtaGVpZ2h0OjI1cHg7Ym9yZGVyLXJhZGl1czoycHg7LW1vei1ib3JkZXItcmFkaXVzOjJweH0jY29udHJvbEtpdCAucGFuZWwgLmdyYXBoLXNsaWRlci14LXdyYXAsI2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaC1zbGlkZXIteS13cmFwe3Bvc2l0aW9uOmFic29sdXRlOy13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveH0jY29udHJvbEtpdCAucGFuZWwgLmdyYXBoLXNsaWRlci14LXdyYXB7Ym90dG9tOjA7bGVmdDowO3dpZHRoOjEwMCU7cGFkZGluZzo2cHggMjBweCA2cHggNnB4fSNjb250cm9sS2l0IC5wYW5lbCAuZ3JhcGgtc2xpZGVyLXktd3JhcHt0b3A6MDtyaWdodDowO2hlaWdodDoxMDAlO3BhZGRpbmc6NnB4IDZweCAyMHB4fSNjb250cm9sS2l0IC5wYW5lbCAuZ3JhcGgtc2xpZGVyLXgsI2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaC1zbGlkZXIteXstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym9yZGVyLXJhZGl1czoycHg7LW1vei1ib3JkZXItcmFkaXVzOjJweDtiYWNrZ3JvdW5kOnJnYmEoMjQsMjcsMjksLjUpO2JvcmRlcjoxcHggc29saWQgIzE4MWIxZH0jY29udHJvbEtpdCAucGFuZWwgLmdyYXBoLXNsaWRlci14e2hlaWdodDo4cHh9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaC1zbGlkZXIteXt3aWR0aDo4cHg7aGVpZ2h0OjEwMCV9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaC1zbGlkZXIteC1oYW5kbGUsI2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaC1zbGlkZXIteS1oYW5kbGV7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O2N1cnNvcjpwb2ludGVyO2JvcmRlcjoxcHggc29saWQgIzE4MWIxZDtiYWNrZ3JvdW5kOiMzMDM2Mzl9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaC1zbGlkZXIteC1oYW5kbGV7d2lkdGg6MjBweDtoZWlnaHQ6MTAwJTtib3JkZXItdG9wOm5vbmU7Ym9yZGVyLWJvdHRvbTpub25lfSNjb250cm9sS2l0IC5wYW5lbCAuZ3JhcGgtc2xpZGVyLXktaGFuZGxle3dpZHRoOjEwMCU7aGVpZ2h0OjIwcHg7Ym9yZGVyLWxlZnQ6bm9uZTtib3JkZXItcmlnaHQ6bm9uZX0jY29udHJvbEtpdCAuc3ViLWdyb3VwIC53cmFwIC53cmFwIC53cmFwe3dpZHRoOjI1JSFpbXBvcnRhbnQ7cGFkZGluZzowIWltcG9ydGFudDtmbG9hdDpsZWZ0IWltcG9ydGFudH0jY29udHJvbEtpdCAuc3ViLWdyb3VwIC53cmFwIC53cmFwIC53cmFwIC5sYWJlbHt3aWR0aDoxMDAlIWltcG9ydGFudDtwYWRkaW5nOjhweCAwIDAhaW1wb3J0YW50O2NvbG9yOiM4Nzg3ODchaW1wb3J0YW50O3RleHQtYWxpZ246Y2VudGVyIWltcG9ydGFudDt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2UhaW1wb3J0YW50O2ZvbnQtd2VpZ2h0OjcwMCFpbXBvcnRhbnQ7dGV4dC1zaGFkb3c6MXB4IDFweCAjMWExYTFhIWltcG9ydGFudH0jY29udHJvbEtpdCAuc3ViLWdyb3VwIC53cmFwIC53cmFwIC53cmFwIGlucHV0W3R5cGU9dGV4dF17cGFkZGluZzowO3RleHQtYWxpZ246Y2VudGVyfSNjb250cm9sS2l0IC5vcHRpb25ze3BvaW50ZXItZXZlbnRzOmF1dG87LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O2JvcmRlcjoxcHggc29saWQgIzFmMWYxZjtib3JkZXItcmFkaXVzOjJweDstbW96LWJvcmRlci1yYWRpdXM6MnB4O3Bvc2l0aW9uOmFic29sdXRlO3otaW5kZXg6MjE0NzQ4MzYzODtsZWZ0OjA7dG9wOjA7d2lkdGg6YXV0bztoZWlnaHQ6YXV0bztib3gtc2hhZG93OjAgMXB4IDAgMCAjNGE0YTRhIGluc2V0O2JhY2tncm91bmQtY29sb3I6IzQ1NDU0NTtmb250LWZhbWlseTpBcmlhbCxzYW5zLXNlcmlmO2ZvbnQtc2l6ZToxMXB4O2NvbG9yOiNmZmY7dGV4dC1zaGFkb3c6MXB4IDFweCAjMDAwO292ZXJmbG93OmhpZGRlbn0jY29udHJvbEtpdCAub3B0aW9ucyB1bHt3aWR0aDoxMDAlO2xpc3Qtc3R5bGU6bm9uZTttYXJnaW46MDtwYWRkaW5nOjB9I2NvbnRyb2xLaXQgLm9wdGlvbnMgdWwgbGl7bWFyZ2luOjA7d2lkdGg6MTAwJTtoZWlnaHQ6MjVweDtsaW5lLWhlaWdodDoyNXB4O3BhZGRpbmc6MCAyMHB4IDAgMTBweDtvdmVyZmxvdzpoaWRkZW47d2hpdGUtc3BhY2U6bm9ybWFsO3RleHQtb3ZlcmZsb3c6ZWxsaXBzaXM7Y3Vyc29yOnBvaW50ZXJ9I2NvbnRyb2xLaXQgLm9wdGlvbnMgdWwgbGk6aG92ZXJ7YmFja2dyb3VuZC1jb2xvcjojMWYyMzI1fSNjb250cm9sS2l0IC5vcHRpb25zIHVsIC5saS1zZWxlY3RlZHtiYWNrZ3JvdW5kLWNvbG9yOiMyOTJkMzB9I2NvbnRyb2xLaXQgLm9wdGlvbnMgLmNvbG9yey13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveH0jY29udHJvbEtpdCAub3B0aW9ucyAuY29sb3IgLmxpLXNlbGVjdGVkLCNjb250cm9sS2l0IC5vcHRpb25zIC5jb2xvciBsaXstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7cGFkZGluZzowO2hlaWdodDoyNXB4O2xpbmUtaGVpZ2h0OjI1cHg7dGV4dC1hbGlnbjpjZW50ZXJ9I2NvbnRyb2xLaXQgLm9wdGlvbnMgLmNvbG9yIC5saS1zZWxlY3RlZDpob3ZlciwjY29udHJvbEtpdCAub3B0aW9ucyAuY29sb3IgbGk6aG92ZXJ7YmFja2dyb3VuZDowIDA7Zm9udC13ZWlnaHQ6NzAwfSNjb250cm9sS2l0IC5vcHRpb25zIC5jb2xvciAubGktc2VsZWN0ZWR7Zm9udC13ZWlnaHQ6NzAwfSNjb250cm9sS2l0IC5wYW5lbCAubGFiZWwsI2NvbnRyb2xLaXQgLnBpY2tlciAubGFiZWx7d2lkdGg6MTAwJTtmbG9hdDpsZWZ0O2ZvbnQtc2l6ZToxMXB4O2ZvbnQtd2VpZ2h0OjcwMDt0ZXh0LXNoYWRvdzowIDFweCAjMDAwO292ZXJmbG93OmhpZGRlbjt3aGl0ZS1zcGFjZTpub3dyYXA7dGV4dC1vdmVyZmxvdzplbGxpcHNpcztjdXJzb3I6ZGVmYXVsdH0jY29udHJvbEtpdCAucGFuZWwgLmhlYWQsI2NvbnRyb2xLaXQgLnBhbmVsIC5wYW5lbC1oZWFkLWluYWN0aXZlLCNjb250cm9sS2l0IC5waWNrZXIgLmhlYWR7aGVpZ2h0OjMwcHg7cGFkZGluZzowIDEwcHg7YmFja2dyb3VuZDojMWExYTFhO292ZXJmbG93OmhpZGRlbn0jY29udHJvbEtpdCAucGFuZWwgLmhlYWQgLndyYXAsI2NvbnRyb2xLaXQgLnBhbmVsIC5wYW5lbC1oZWFkLWluYWN0aXZlIC53cmFwLCNjb250cm9sS2l0IC5waWNrZXIgLmhlYWQgLndyYXB7d2lkdGg6YXV0bztoZWlnaHQ6YXV0bzttYXJnaW46MDtwYWRkaW5nOjA7cG9zaXRpb246cmVsYXRpdmU7b3ZlcmZsb3c6aGlkZGVufSNjb250cm9sS2l0IC5wYW5lbCAuaGVhZCAubGFiZWwsI2NvbnRyb2xLaXQgLnBpY2tlciAuaGVhZCAubGFiZWx7Y3Vyc29yOnBvaW50ZXI7bGluZS1oZWlnaHQ6MzBweDtjb2xvcjojNjU2OTZifSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLmhlYWR7aGVpZ2h0OjM4cHg7cGFkZGluZzowIDEwcHg7Ym9yZGVyLXRvcDoxcHggc29saWQgIzRmNGY0Zjtib3JkZXItYm90dG9tOjFweCBzb2xpZCAjMjYyNjI2O2JhY2tncm91bmQtaW1hZ2U6LW8tbGluZWFyLWdyYWRpZW50KCM0NTQ1NDUgMCwjM2IzYjNiIDEwMCUpO2JhY2tncm91bmQtaW1hZ2U6bGluZWFyLWdyYWRpZW50KCM0NTQ1NDUgMCwjM2IzYjNiIDEwMCUpO2N1cnNvcjpwb2ludGVyfSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLmhlYWQgLmxhYmVse2ZvbnQtc2l6ZToxMnB4O2xpbmUtaGVpZ2h0OjM4cHg7Y29sb3I6I2ZmZn0jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5oZWFkOmhvdmVye2JvcmRlci10b3A6MXB4IHNvbGlkICM1MjUyNTI7YmFja2dyb3VuZC1pbWFnZTotby1saW5lYXItZ3JhZGllbnQoIzQ1NDU0NSAwLCM0MDQwNDAgMTAwJSk7YmFja2dyb3VuZC1pbWFnZTpsaW5lYXItZ3JhZGllbnQoIzQ1NDU0NSAwLCM0MDQwNDAgMTAwJSl9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCBsaXtoZWlnaHQ6MzVweDtwYWRkaW5nOjAgMTBweH0jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3VwOmxhc3Qtb2YtdHlwZXtib3JkZXItYm90dG9tOm5vbmV9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cHtwYWRkaW5nOjA7aGVpZ2h0OmF1dG87Ym9yZGVyLWJvdHRvbToxcHggc29saWQgIzI0MjQyNH0jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3VwIHVse292ZXJmbG93OmhpZGRlbn0jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3VwIHVsIGxpe2JhY2tncm91bmQ6IzJlMmUyZTtib3JkZXItYm90dG9tOjFweCBzb2xpZCAjMjIyNzI5fSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLnN1Yi1ncm91cC1saXN0IC5zdWItZ3JvdXAgdWwgbGk6bGFzdC1vZi10eXBle2JvcmRlci1ib3R0b206bm9uZX0jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3VwOmZpcnN0LWNoaWxke21hcmdpbi10b3A6MH0jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3VwIC5oZWFkLCNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLnN1Yi1ncm91cC1saXN0IC5zdWItZ3JvdXAgLmhlYWQtaW5hY3RpdmV7Y3Vyc29yOnBvaW50ZXJ9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cCAuaGVhZHtoZWlnaHQ6MjdweDtwYWRkaW5nOjAgMTBweDtib3JkZXItdG9wOm5vbmU7Ym9yZGVyLWJvdHRvbToxcHggc29saWQgIzI0MjQyNDtiYWNrZ3JvdW5kLWltYWdlOm5vbmU7YmFja2dyb3VuZC1jb2xvcjojMjcyNzI3fSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLnN1Yi1ncm91cC1saXN0IC5zdWItZ3JvdXAgLmhlYWQ6aG92ZXJ7YmFja2dyb3VuZC1pbWFnZTpub25lO2JhY2tncm91bmQtY29sb3I6IzI3MjcyN30jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3VwIC5oZWFkLWluYWN0aXZley13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveDtoZWlnaHQ6MjdweDtwYWRkaW5nOjAgMTBweDtib3gtc2hhZG93OjAgMXB4IDAgMCAjNDA0MDQwIGluc2V0O2JhY2tncm91bmQtaW1hZ2U6LW8tbGluZWFyLWdyYWRpZW50KCMzYjNiM2IgMCwjMzgzODM4IDEwMCUpO2JhY2tncm91bmQtaW1hZ2U6bGluZWFyLWdyYWRpZW50KCMzYjNiM2IgMCwjMzgzODM4IDEwMCUpfSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLnN1Yi1ncm91cC1saXN0IC5zdWItZ3JvdXAgLmhlYWQtaW5hY3RpdmU6aG92ZXJ7Ym94LXNoYWRvdzowIDFweCAwIDAgIzQ3NDc0NyBpbnNldDtiYWNrZ3JvdW5kLWltYWdlOm5vbmU7YmFja2dyb3VuZC1pbWFnZTotby1saW5lYXItZ3JhZGllbnQoIzQwNDA0MCAwLCMzYjNiM2IgMTAwJSk7YmFja2dyb3VuZC1pbWFnZTpsaW5lYXItZ3JhZGllbnQoIzQwNDA0MCAwLCMzYjNiM2IgMTAwJSl9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cCAuaGVhZCAubGFiZWwsI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cCAuaGVhZC1pbmFjdGl2ZSAubGFiZWx7bWFyZ2luOjA7cGFkZGluZzowO2xpbmUtaGVpZ2h0OjI3cHg7Y29sb3I6I2ZmZjtmb250LXdlaWdodDo3MDA7Zm9udC1zaXplOjExcHg7dGV4dC1zaGFkb3c6MXB4IDFweCAjMDAwO3RleHQtdHJhbnNmb3JtOmNhcGl0YWxpemV9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cCAuaGVhZCAud3JhcCAubGFiZWwsI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cCAuaGVhZC1pbmFjdGl2ZSAud3JhcCAubGFiZWx7d2lkdGg6MTAwJTtmb250LXdlaWdodDo3MDA7Y29sb3I6I2ZmZjtwYWRkaW5nOjB9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cCAud3JhcCAubGFiZWx7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O2hlaWdodDoxMDAlO3dpZHRoOjMwJTtwYWRkaW5nOjEycHggNXB4IDAgMDtmbG9hdDpsZWZ0O2ZvbnQtc2l6ZToxMXB4O2ZvbnQtd2VpZ2h0OjQwMDtjb2xvcjojYWViNWI4O3RleHQtc2hhZG93OjFweCAxcHggIzAwMH0jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3VwIC53cmFwIC53cmFwey13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveDt3aWR0aDo3MCU7cGFkZGluZzo1cHggMCAwO2Zsb2F0OnJpZ2h0O2hlaWdodDoxMDAlfSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXA6bGFzdC1jaGlsZCAuc2Nyb2xsLWJ1ZmZlcjpudGgtb2YtdHlwZSgzKSwjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwOmxhc3QtY2hpbGQgLnN1Yi1ncm91cC1saXN0e2JvcmRlci1ib3R0b206bm9uZX0jY29udHJvbEtpdCAucGFuZWwgLnNjcm9sbC13cmFwe3Bvc2l0aW9uOnJlbGF0aXZlO292ZXJmbG93OmhpZGRlbn0jY29udHJvbEtpdCAucGFuZWwgLnNjcm9sbC1idWZmZXJ7d2lkdGg6MTAwJTtoZWlnaHQ6OHB4O2JvcmRlci10b3A6MXB4IHNvbGlkICMzYjQ0NDc7Ym9yZGVyLWJvdHRvbToxcHggc29saWQgIzFlMjIyNH0jY29udHJvbEtpdCAucGFuZWwgLnNjcm9sbEJhcnstd2Via2l0LWJveC1zaXppbmc6Y29udGVudC1ib3g7LW1vei1ib3gtc2l6aW5nOmNvbnRlbnQtYm94O2JveC1zaXppbmc6Y29udGVudC1ib3g7d2lkdGg6MTVweDtoZWlnaHQ6MTAwJTtmbG9hdDpyaWdodDt0b3A6MDtwYWRkaW5nOjA7bWFyZ2luOjA7cG9zaXRpb246cmVsYXRpdmU7YmFja2dyb3VuZDojMjEyNjI4O2JhY2tncm91bmQtaW1hZ2U6bGluZWFyLWdyYWRpZW50KHRvIHJpZ2h0LCMyNDI0MjQgMCwjMmUyZTJlIDEwMCUpfSNjb250cm9sS2l0IC5wYW5lbCAuc2Nyb2xsQmFyIC50cmFja3twYWRkaW5nOjAgM3B4IDAgMnB4fSNjb250cm9sS2l0IC5wYW5lbCAuc2Nyb2xsQmFyIC50cmFjayAudGh1bWJ7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O3dpZHRoOjExcHg7cG9zaXRpb246YWJzb2x1dGU7Y3Vyc29yOnBvaW50ZXI7YmFja2dyb3VuZC1jb2xvcjojMzQzNDM0O2JvcmRlcjoxcHggc29saWQgIzFiMWYyMTtib3JkZXItcmFkaXVzOjEwcHg7LW1vei1ib3JkZXItcmFkaXVzOjEwcHg7Ym94LXNoYWRvdzppbnNldCAwIDFweCAwIDAgIzQzNGI1MH0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSwjY29udHJvbEtpdCAucGlja2VyIC5tZW51e2Zsb2F0OnJpZ2h0O3BhZGRpbmc6NXB4IDAgMH0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUgaW5wdXRbdHlwZT1idXR0b25dLCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgaW5wdXRbdHlwZT1idXR0b25dLCNjb250cm9sS2l0IC5waWNrZXIgLm1lbnUgaW5wdXRbdHlwZT1idXR0b25dey13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveDtjdXJzb3I6cG9pbnRlcjtoZWlnaHQ6MjBweDtib3JkZXI6bm9uZTt2ZXJ0aWNhbC1hbGlnbjp0b3A7Ym9yZGVyLXJhZGl1czoycHg7LW1vei1ib3JkZXItcmFkaXVzOjJweDtmb250LWZhbWlseTpBcmlhbCxzYW5zLXNlcmlmO2ZvbnQtc2l6ZToxMHB4O2ZvbnQtd2VpZ2h0OjcwMDtjb2xvcjojYWFhO3RleHQtc2hhZG93OjAgLTFweCAjMDAwO3RleHQtdHJhbnNmb3JtOnVwcGVyY2FzZTtib3gtc2hhZG93OjAgMCAwIDFweCAjMTMxMzEzIGluc2V0LC0xcHggMnB4IDAgMCAjMjEyNTI3IGluc2V0fSNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnV0dG9uLW1lbnUtY2xvc2UsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idXR0b24tbWVudS1oaWRlLCNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnV0dG9uLW1lbnUtc2hvdywjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS1jbG9zZSwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS1oaWRlLCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LXNob3csI2NvbnRyb2xLaXQgLnBpY2tlciAubWVudSAuYnV0dG9uLW1lbnUtY2xvc2UsI2NvbnRyb2xLaXQgLnBpY2tlciAubWVudSAuYnV0dG9uLW1lbnUtaGlkZSwjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idXR0b24tbWVudS1zaG93e3dpZHRoOjIwcHg7bWFyZ2luLWxlZnQ6NHB4fSNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnV0dG9uLW1lbnUtaGlkZSwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS1oaWRlLCNjb250cm9sS2l0IC5waWNrZXIgLm1lbnUgLmJ1dHRvbi1tZW51LWhpZGV7YmFja2dyb3VuZDp1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFGQ0FZQUFBQjRrYTFWQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQUdSSlJFRlVlTnBpZFBVTllvQ0JVMGNPMURNd01EQ1kyVGcwd3NSWWtDVmxGWlVib0d5NEltWmxkVTI0cEp5U0NnTy9vQkFEQXdPRHcvVkw1eG1rNVJRT01yOTkvUkl1Q1FQSWlsak1iQndZR0JnWUdINy8vTW1BRENTbFpSa2twV1VaQUFNQXZUc2dYQnZPc3EwQUFBQUFTVVZPUks1Q1lJST0pIDUwJSA1MCUgbm8tcmVwZWF0LCMxYTFkMWZ9I2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idXR0b24tbWVudS1oaWRlOmhvdmVyLCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LWhpZGU6aG92ZXIsI2NvbnRyb2xLaXQgLnBpY2tlciAubWVudSAuYnV0dG9uLW1lbnUtaGlkZTpob3ZlcntiYWNrZ3JvdW5kOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBR1JKUkVGVWVOcGlkUFVOWW9DQlUwY08xRE13TURDWTJUZzB3c1JZa0NWbEZaVWJvR3k0SW1abGRVMjRwSnlTQ2dPL29CQURBd09Edy9WTDV4bWs1UlFPTXI5OS9SSXVDUVBJaWxqTWJCd1lHQmdZR0g3Ly9NbUFEQ1NsWlJra3BXVVpBQU1BdlRzZ1hCdk9zcTBBQUFBQVNVVk9SSzVDWUlJPSkgNTAlIDUwJSBuby1yZXBlYXQsIzAwMDtib3gtc2hhZG93OiNmZmYgMCwjMDAwIDEwMCV9I2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idXR0b24tbWVudS1zaG93LCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LXNob3csI2NvbnRyb2xLaXQgLnBpY2tlciAubWVudSAuYnV0dG9uLW1lbnUtc2hvd3tiYWNrZ3JvdW5kOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBRnBKUkVGVWVOcHNqREVPZ0NBUUJPYzRlcU5mb0NCOHdNckNud2svODJFSFdFa3djYXRKWnJLeXJGc0dMdjVYL0g2Y3FQYzQxWTlwdFZMTjBCRFQzVnNURVRuRnVWa1dJR3VJQ1dCRXZmY2hBZnowbXF2WjRCZWVBUUR6VmlNekp5MFJYZ0FBQUFCSlJVNUVya0pnZ2c9PSkgNTAlIDUwJSBuby1yZXBlYXQsIzFhMWQxZn0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ1dHRvbi1tZW51LXNob3c6aG92ZXIsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtc2hvdzpob3ZlciwjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idXR0b24tbWVudS1zaG93OmhvdmVye2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBRkNBWUFBQUI0a2ExVkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFGcEpSRUZVZU5wc2pERU9nQ0FRQk9jNGVxTmZvQ0I4d01yQ253ay84MkVIV0Vrd2NhdEpackt5ckZzR0x2NVgvSDZjcVBjNDFZOXB0VkxOMEJEVDNWc1RFVG5GdVZrV0lHdUlDV0JFdmZjaEFmejBtcXZaNEJlZUFRRHpWaU16SnkwUlhnQUFBQUJKUlU1RXJrSmdnZz09KSA1MCUgNTAlIG5vLXJlcGVhdCwjMDAwO2JveC1zaGFkb3c6I2ZmZiAwLCMwMDAgMTAwJX0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ1dHRvbi1tZW51LWNsb3NlLCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LWNsb3NlLCNjb250cm9sS2l0IC5waWNrZXIgLm1lbnUgLmJ1dHRvbi1tZW51LWNsb3Nle2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBSkNBWUFBQUFQVTIwdUFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFRMUpSRUZVZU5wTTBEOUxBbUVBeC9IdlBYZURUcWVYcFZlWVlqcFlHUTFoQlE3U254ZlEwcEExRkVWYnI2RmVSZ1p1Q2IyRW9PQ2dtMjZzcG9JZ2lLQlFRYUlVbnVjZVcyN3d0MzZIRC93TU8rbmNBbmExVmw5amJJSHZ0WUFOYTJsbHRZSmh1SUh2WFZWcjlaTW9IcFhtRncvdHBDT3RXQ3grTDB4enYxaGVPQTU4THc2OHBxZG56bE5wbDFES053czQwR0g0a0pyS1hBcGhOZ1ovdjJUekJaU1ViYUFoSXJMWi9mNjZtOHk0ekJhSy9QVDdYYUFCSUNMemJEZ2NiT2t3SkZRS1BkSVRnZSsxQVF3NzZkeTQyZHh1ZnE1RXFGUUxlQmRDWFBSNkhWNmVIeitNOWZyMlo4SnhYQ1ZsRXppTnlEM1RzcTZWa3Nvc1Y1WTN0ZFlkWUdmc2hxZVIxamtESS9FL0FPOHJZUmx3WEJxdUFBQUFBRWxGVGtTdVFtQ0MpIDUwJSA1MCUgbm8tcmVwZWF0LCMxYTFkMWZ9I2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idXR0b24tbWVudS1jbG9zZTpob3ZlciwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS1jbG9zZTpob3ZlciwjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idXR0b24tbWVudS1jbG9zZTpob3ZlcntiYWNrZ3JvdW5kOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUpDQVlBQUFBUFUyMHVBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBUTFKUkVGVWVOcE0wRDlMQW1FQXgvSHZQWGVEVHFlWHBWZVlZanBZR1ExaEJRN1NueGZRMHBBMUZFVmJyNkZlUmdadUNiMkVvT0NnbTI2c3BvSWdpS0JRUWFJVW51Y2VXMjd3dDM2SEQvd01PK25jQW5hMVZsOWpiSUh2dFlBTmEybGx0WUpodUlIdlhWVnI5Wk1vSHBYbUZ3L3RwQ090V0N4K0wweHp2MWhlT0E1OEx3NjhwcWRuemxOcGwxREtOd3M0MEdINGtKcktYQXBoTmdaL3YyVHpCWlNVYmFBaElyTFovZjY2bTh5NHpCYUsvUFQ3WGFBQklDTHpiRGdjYk9rd0pGUUtQZElUZ2UrMUFRdzc2ZHk0MmR4dWZxNUVxRlFMZUJkQ1hQUjZIVjZlSHorTTlmcjJaOEp4WENWbEV6aU55RDNUc3E2Vmtzb3NWNVkzdGRZZFlHZnNocWVSMWprREkvRS9BTzhyWVJsd1hCcXVBQUFBQUVsRlRrU3VRbUNDKSA1MCUgNTAlIG5vLXJlcGVhdCwjMDAwO2JveC1zaGFkb3c6I2ZmZiAwLCMwMDAgMTAwJX0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ1dHRvbi1tZW51LXVuZG8sI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtdW5kb3tiYWNrZ3JvdW5kOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUF3QUFBQUxDQVlBQUFCTGNHeGZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBWVZKUkVGVWVOcGNrRDFJVzFFWWhwOXo3cm0zb3FraHpaL3hENnRSMUVwRktlbGdobEJvblZ3S0RwYVdEbmJxMmxWRjBNSEJVYmRDcDVhQ1VpZ2RuSVNnb1VQQXFXTWxZc0dsTnRZSzFaaHp6cjFkVkc3emJ0L0w5N3g4N3ljZVR6MGxySEtwK0JKWUJIcXVyRy9BZkM1ZitBd2d3a0M1Vkh5YnlyVFBkdmRtQTlmMUJFSlFPLy9MWVdXZmsrT2ZTN2w4WWVFR0tKZUtyN05EOTlhVDZReldtSFBnRStBQU00N3JjblI0d0kvSy9xUzhUczkwZHErbE1oMVlZMWFCRnVBRjhBeVFWdXZOcnJ0OXhPS0pqeUlhdS9NT0dKcDQ5T1JoclhaaDlyN3ViZ1BQYy9uQ3IzQTM2VGpHOTMxSERZK09UeWpQNnc4QUtSMDFNdmFnY0ZxdHhvSC9nTFBUM3dleFJES3JJcmRiZDZUajlBc2hjRDBQUWFUYTNCSTVvVUZhMTNzSUFpVHd5cmQyd1dxTnFWL3VBUjNBY2NPclB5UlNiVXJYNjMvVWxiZmsrMzRGeEpkeXFkZ0VMQU8zZ0Rnd1BUQnkvM3B2Um9XQzNnTWtVbTNwU0RUNlJrcUpjbDNpeVhRUVdJczFaZ1hZVW8yMzlnNE0xc0t6MWZvN01BZHNBUHdiQUw5aGZ0dlRsTmtkQUFBQUFFbEZUa1N1UW1DQykgMjAlIDUwJSBuby1yZXBlYXQsIzFhMWQxZjtwYWRkaW5nOjAgNnB4IDFweCAwO3dpZHRoOjM4cHg7dmVydGljYWwtYWxpZ246dG9wO3RleHQtYWxpZ246ZW5kfSNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnV0dG9uLW1lbnUtdW5kbzpob3ZlciwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS11bmRvOmhvdmVye2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQXdBQUFBTENBWUFBQUJMY0d4ZkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFZVkpSRUZVZU5wY2tEMUlXMUVZaHA5ejdybTNvcWtoeloveEQ2dFIxRXBGS2VsZ2hsQm9uVndLRHBhV0RuYnEybFZGME1IQlViZENwNWFDVWlnZG5JU2dvVVBBcVdNbFlzR2xOdFlLMVpoenpyMWRWRzd6YnQvTDk3eDg3eWNlVHowbHJIS3ArQkpZQkhxdXJHL0FmQzVmK0F3Z3drQzVWSHlieXJUUGR2ZG1BOWYxQkVKUU8vL0xZV1dmaytPZlM3bDhZZUVHS0plS3I3TkQ5OWFUNlF6V21IUGdFK0FBTTQ3cmNuUjR3SS9LL3FTOFRzOTBkcStsTWgxWVkxYUJGdUFGOEF5UVZ1dk5ycnQ5eE9LSmp5SWF1L01PR0pwNDlPUmhyWFpoOXI3dWJnUFBjL25DcjNBMzZUakc5MzFIRFkrT1R5alA2dzhBS1IwMU12YWdjRnF0eG9IL2dMUFQzd2V4UkRLcklyZGJkNlRqOUFzaGNEMFBRYVRhM0JJNW9VRmExM3NJQWlUd3lyZDJ3V3FOcVYvdUFSM0FjY09yUHlSU2JVclg2My9VbGJmayszNEZ4SmR5cWRnRUxBTzNnRGd3UFRCeS8zcHZSb1dDM2dNa1VtM3BTRFQ2UmtxSmNsM2l5WFFRV0lzMVpnWFlVbzIzOWc0TTFzS3oxZm83TUFkc0FQd2JBTDloZnR2VGxOa2RBQUFBQUVsRlRrU3VRbUNDKSAyMCUgNTAlIG5vLXJlcGVhdCwjMDAwO2JveC1zaGFkb3c6I2ZmZiAwLCMwMDAgMTAwJX0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ1dHRvbi1tZW51LWxvYWQsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtbG9hZHttYXJnaW4tcmlnaHQ6MnB4fSNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnV0dG9uLW1lbnUtbG9hZCwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ1dHRvbi1tZW51LXNhdmUsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtbG9hZCwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS1zYXZle2JhY2tncm91bmQ6IzFhMWQxZjtmb250LXNpemU6OXB4IWltcG9ydGFudH0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ1dHRvbi1tZW51LWxvYWQ6aG92ZXIsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idXR0b24tbWVudS1zYXZlOmhvdmVyLCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LWxvYWQ6aG92ZXIsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtc2F2ZTpob3ZlcntiYWNrZ3JvdW5kOiMwMDB9I2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC53cmFwe2Rpc3BsYXk6bm9uZX0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZle3dpZHRoOjEwMCU7ZmxvYXQ6bGVmdH0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC53cmFwe2Rpc3BsYXk6aW5saW5lfSNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LWNsb3NlLCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LWhpZGUsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtc2hvd3tmbG9hdDpyaWdodH0jY29udHJvbEtpdCAucGFuZWwgLmFycm93LXMtbWF4e2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBRkNBWUFBQUI0a2ExVkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFHNUpSRUZVZU5waTVPRGlhbVJnWUtoandBNGFtVng4Z3hqbUwxckM4UDNyVnhROGIrRVNCaGZmSUFabU5SMjlBNWV2WFdkaVpHQzAxOVhTWkdCZ1lHQll2bVk5dzdJMTZ4b1pHQmdhV0tCRzFTOWJzKzQvQXdORFBRTURBMXlTZ1lHQmdkRW5QQWJaemdZMG1nRXdBRTlsSlQxbHJzZmZBQUFBQUVsRlRrU3VRbUNDKSBjZW50ZXIgbm8tcmVwZWF0fSNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3ctcy1taW57YmFja2dyb3VuZDp1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFGQ0FZQUFBQjRrYTFWQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQUZwSlJFRlVlTnBzaWlFT2dEQU1SZjhTeE5KeklZZkIxUFFrUTdSa1pjZkJZTG5iVUFzTDRjbjNYa2dzNk56WHFRQXdMK3ZlM1RUR0xXY0RnS1BXZDBvc2lFUmEzRnVudUxkSXBJa0ZpRVEyeHU4VUVvc0JVUHhqendBVFNqVi84cWxNR0FBQUFBQkpSVTVFcmtKZ2dnPT0pIGNlbnRlciBuby1yZXBlYXR9I2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvdy1zLW1heCwjY29udHJvbEtpdCAucGFuZWwgLmFycm93LXMtbWlue3dpZHRoOjEwMCU7aGVpZ2h0OjIwcHh9I2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvdy1iLW1heHtiYWNrZ3JvdW5kOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBREpKUkVGVWVOcHN5c0VOQUNBTUF6RTI5K2poQXhLbFBTbXZlSzJhc3pFSU1pSEk3VWZsYkNoSmZ4KzNBUUFBLy84REFQTGtTYW1IYXN0eEFBQUFBRWxGVGtTdVFtQ0MpIGNlbnRlciBuby1yZXBlYXR9I2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvdy1iLW1pbntiYWNrZ3JvdW5kOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBQzlKUkVGVWVOcUVqREVPQUNBUWd4aDhPRC9IMlJoUGtrNDBBQWowbUt2aVMyVTNUaWVuMGlFM0FBQUEvLzhEQUVkMU50SUNWNEV1QUFBQUFFbEZUa1N1UW1DQykgY2VudGVyIG5vLXJlcGVhdH0jY29udHJvbEtpdCAucGFuZWwgLmFycm93LWItc3ViLW1heHtiYWNrZ3JvdW5kOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFvQUFBQUdDQVlBQUFENjhBL0dBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBR0pKUkVGVWVOcGk5QW1QWVVBR2V6YXZxMmRnWUdCdzhRMXFSQlpuUVZka2FlL2NBR1dqS0daVzA5RkRVV1RwNE1JZ3E2REV3TURBNEhCbzF6WUdKWFhOZzNDRnlJcGdBRjB4ODZQN2R4clFGV0ZUek9nVEh0UEF3TUJRejRBZk5BQUdBTjFDS1BzNE5ETHZBQUFBQUVsRlRrU3VRbUNDKSBjZW50ZXIgbm8tcmVwZWF0fSNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3ctYi1zdWItbWlue2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQW9BQUFBR0NBWUFBQUQ2OEEvR0FBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFHOUpSRUZVZU5wOHpyRU9RREFBaE9HL0dFU1lCYnRKdkFLRDFlS0JSTitzTDFOTjU3YTdpU0RpcGt2dUcwNmtXU2FCbGYvSVpKb1h5cXFock9wUFljMk9OWnE0N1hvVnZJdEFESGxSZkNFSmJISGI5UUFxZUNkQWpDZStJNEFUUG5EdzdvRUFrdGVselJwOTlmdHdEQUNmc1MwWEFiejRQd0FBQUFCSlJVNUVya0pnZ2c9PSkgY2VudGVyIG5vLXJlcGVhdH0jY29udHJvbEtpdCAucGFuZWwgLmFycm93LWItbWF4LCNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3ctYi1taW4sI2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvdy1iLXN1Yi1tYXgsI2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvdy1iLXN1Yi1taW57d2lkdGg6MTBweDtoZWlnaHQ6MTAwJTtmbG9hdDpyaWdodH0jY29udHJvbEtpdCAucGlja2Vye3BvaW50ZXItZXZlbnRzOmF1dG87LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O2JvcmRlci1yYWRpdXM6M3B4Oy1tb3otYm9yZGVyLXJhZGl1czozcHg7YmFja2dyb3VuZC1jb2xvcjojM2IzYjNiO2ZvbnQtZmFtaWx5OkFyaWFsLHNhbnMtc2VyaWY7Zm9udC1zaXplOjExcHg7Y29sb3I6I2ZmZjt0ZXh0LXNoYWRvdzoxcHggMXB4ICMwMDA7b3ZlcmZsb3c6aGlkZGVuO3Bvc2l0aW9uOmFic29sdXRlO3otaW5kZXg6MjE0NzQ4MzYzMTt3aWR0aDozNjBweDstd2Via2l0LXRvdWNoLWNhbGxvdXQ6bm9uZTstd2Via2l0LXVzZXItc2VsZWN0Om5vbmU7LWtodG1sLXVzZXItc2VsZWN0Om5vbmU7LW1vei11c2VyLXNlbGVjdDpub25lOy1tcy11c2VyLXNlbGVjdDpub25lO3VzZXItc2VsZWN0Om5vbmU7Ym94LXNoYWRvdzowIDJweCAycHggcmdiYSgwLDAsMCwuMjUpfSNjb250cm9sS2l0IC5waWNrZXIgY2FudmFze3ZlcnRpY2FsLWFsaWduOmJvdHRvbTtjdXJzb3I6cG9pbnRlcn0jY29udHJvbEtpdCAucGlja2VyIC53cmFwey13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveDtwYWRkaW5nOjEwcHg7ZmxvYXQ6bGVmdH0jY29udHJvbEtpdCAucGlja2VyIC5maWVsZC13cmFwe3BhZGRpbmc6M3B4fSNjb250cm9sS2l0IC5waWNrZXIgLnNsaWRlci13cmFwe3BhZGRpbmc6M3B4IDEzcHggM3B4IDNweH0jY29udHJvbEtpdCAucGlja2VyIC5maWVsZC13cmFwLCNjb250cm9sS2l0IC5waWNrZXIgLmlucHV0LXdyYXAsI2NvbnRyb2xLaXQgLnBpY2tlciAuc2xpZGVyLXdyYXB7aGVpZ2h0OmF1dG87b3ZlcmZsb3c6aGlkZGVuO2Zsb2F0OmxlZnR9I2NvbnRyb2xLaXQgLnBpY2tlciAuaW5wdXQtd3JhcHstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym9yZGVyOjFweCBzb2xpZCAjMjQyNDI0O2JvcmRlci1yYWRpdXM6MnB4Oy1tb3otYm9yZGVyLXJhZGl1czoycHg7d2lkdGg6MTQwcHg7ZmxvYXQ6cmlnaHQ7cGFkZGluZzo1cHggMTBweCAxcHggMH0jY29udHJvbEtpdCAucGlja2VyIC5pbnB1dC1maWVsZHt3aWR0aDo1MCU7ZmxvYXQ6cmlnaHQ7bWFyZ2luLWJvdHRvbTo0cHh9I2NvbnRyb2xLaXQgLnBpY2tlciAuaW5wdXQtZmllbGQgLmxhYmVse3BhZGRpbmc6OHB4IDAgMDtjb2xvcjojODc4Nzg3O3RleHQtYWxpZ246Y2VudGVyO3RleHQtdHJhbnNmb3JtOnVwcGVyY2FzZTtmb250LXdlaWdodDo3MDA7dGV4dC1zaGFkb3c6MXB4IDFweCAjMWExYTFhO3dpZHRoOjQwJX0jY29udHJvbEtpdCAucGlja2VyIC5pbnB1dC1maWVsZCAud3JhcHtwYWRkaW5nOjA7d2lkdGg6NjAlO2hlaWdodDphdXRvO2Zsb2F0OnJpZ2h0fSNjb250cm9sS2l0IC5waWNrZXIgLmNvbnRyb2xzLXdyYXB7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O3dpZHRoOjEwMCU7aGVpZ2h0OmF1dG87ZmxvYXQ6cmlnaHQ7cGFkZGluZzo5cHggMCAwfSNjb250cm9sS2l0IC5waWNrZXIgLmNvbnRyb2xzLXdyYXAgaW5wdXRbdHlwZT1idXR0b25de2Zsb2F0OnJpZ2h0O3dpZHRoOjY1cHg7bWFyZ2luOjAgMCAwIDEwcHh9I2NvbnRyb2xLaXQgLnBpY2tlciAuY29sb3ItY29udHJhc3R7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O2JvcmRlcjpub25lO2JveC1zaGFkb3c6MCAwIDAgMXB4ICMxZjFmMWYgaW5zZXQ7Ym9yZGVyLXJhZGl1czoycHg7LW1vei1ib3JkZXItcmFkaXVzOjJweDtoZWlnaHQ6MjVweDtwYWRkaW5nOjNweDt3aWR0aDo4MCU7bWFyZ2luLWJvdHRvbTo0cHg7ZmxvYXQ6cmlnaHR9I2NvbnRyb2xLaXQgLnBpY2tlciAuY29sb3ItY29udHJhc3QgZGl2e3dpZHRoOjUwJTtoZWlnaHQ6MTAwJTtmbG9hdDpsZWZ0fSNjb250cm9sS2l0IC5waWNrZXIgaW5wdXRbdHlwZT10ZXh0XXtwYWRkaW5nOjA7dGV4dC1hbGlnbjpjZW50ZXI7d2lkdGg6NjAlO2Zsb2F0OnJpZ2h0fSNjb250cm9sS2l0IC5waWNrZXIgLndyYXAgLmlucHV0LXdyYXA6bnRoLW9mLXR5cGUoMyl7Ym9yZGVyLWJvdHRvbS1sZWZ0LXJhZGl1czowO2JvcmRlci1ib3R0b20tcmlnaHQtcmFkaXVzOjB9I2NvbnRyb2xLaXQgLnBpY2tlciAud3JhcCAuaW5wdXQtd3JhcDpudGgtb2YtdHlwZSg0KXtib3JkZXItdG9wOm5vbmU7Ym9yZGVyLXRvcC1sZWZ0LXJhZGl1czowO2JvcmRlci10b3AtcmlnaHQtcmFkaXVzOjB9I2NvbnRyb2xLaXQgLnBpY2tlciAud3JhcCAuaW5wdXQtd3JhcDpudGgtb2YtdHlwZSg0KSAuaW5wdXQtZmllbGR7d2lkdGg6MTAwJX0jY29udHJvbEtpdCAucGlja2VyIC53cmFwIC5pbnB1dC13cmFwOm50aC1vZi10eXBlKDQpIC5pbnB1dC1maWVsZCAubGFiZWx7d2lkdGg6MjAlfSNjb250cm9sS2l0IC5waWNrZXIgLndyYXAgLmlucHV0LXdyYXA6bnRoLW9mLXR5cGUoNCkgaW5wdXRbdHlwZT10ZXh0XXt3aWR0aDo4MCV9I2NvbnRyb2xLaXQgLnBpY2tlciAuZmllbGQtd3JhcCwjY29udHJvbEtpdCAucGlja2VyIC5zbGlkZXItd3JhcHtiYWNrZ3JvdW5kOiMxZTIyMjQ7Ym9yZGVyOm5vbmU7Ym94LXNoYWRvdzowIDAgMCAxcHggIzFmMWYxZiBpbnNldDtib3JkZXItcmFkaXVzOjJweDstbW96LWJvcmRlci1yYWRpdXM6MnB4O3Bvc2l0aW9uOnJlbGF0aXZlO21hcmdpbi1yaWdodDo1cHh9I2NvbnRyb2xLaXQgLnBpY2tlciAuZmllbGQtd3JhcCAuaW5kaWNhdG9yLCNjb250cm9sS2l0IC5waWNrZXIgLnNsaWRlci13cmFwIC5pbmRpY2F0b3J7cG9zaXRpb246YWJzb2x1dGU7Ym9yZGVyOjJweCBzb2xpZCAjZmZmO2JveC1zaGFkb3c6MCAxcHggYmxhY2ssMCAxcHggIzAwMCBpbnNldDtjdXJzb3I6cG9pbnRlcn0jY29udHJvbEtpdCAucGlja2VyIC5maWVsZC13cmFwIC5pbmRpY2F0b3J7d2lkdGg6OHB4O2hlaWdodDo4cHg7bGVmdDo1MCU7dG9wOjUwJTtib3JkZXItcmFkaXVzOjUwJTstbW96LWJvcmRlci1yYWRpdXM6NTAlfSNjb250cm9sS2l0IC5waWNrZXIgLnNsaWRlci13cmFwIC5pbmRpY2F0b3J7d2lkdGg6MTRweDtoZWlnaHQ6M3B4O2JvcmRlci1yYWRpdXM6OHB4Oy1tb3otYm9yZGVyLXJhZGl1czo4cHg7bGVmdDoxcHg7dG9wOjFweH0jY29udHJvbEtpdCAucGlja2VyIC5zbGlkZXItd3JhcCAuaW5kaWNhdG9yOmFmdGVye2NvbnRlbnQ6Jyc7d2lkdGg6MDtoZWlnaHQ6MDtib3JkZXItdG9wOjQuNXB4IHNvbGlkIHRyYW5zcGFyZW50O2JvcmRlci1ib3R0b206NC41cHggc29saWQgdHJhbnNwYXJlbnQ7Ym9yZGVyLXJpZ2h0OjRweCBzb2xpZCAjZmZmO2Zsb2F0OnJpZ2h0O3Bvc2l0aW9uOmFic29sdXRlO3RvcDotMnB4O2xlZnQ6MTlweH0jY29udHJvbEtpdCAucGlja2VyIC5zbGlkZXItd3JhcCAuaW5kaWNhdG9yOmJlZm9yZXtjb250ZW50OicnO3dpZHRoOjA7aGVpZ2h0OjA7Ym9yZGVyLXRvcDo0LjVweCBzb2xpZCB0cmFuc3BhcmVudDtib3JkZXItYm90dG9tOjQuNXB4IHNvbGlkIHRyYW5zcGFyZW50O2JvcmRlci1yaWdodDo0cHggc29saWQgIzAwMDtmbG9hdDpyaWdodDtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6LTNweDtsZWZ0OjE5cHh9XCIgfTsgbW9kdWxlLmV4cG9ydHMgPSBTdHlsZTt2YXIgU3R5bGUgPSB7IHN0cmluZyA6IFwiI2NvbnRyb2xLaXR7cG9zaXRpb246YWJzb2x1dGU7dG9wOjA7bGVmdDowO3dpZHRoOjEwMCU7aGVpZ2h0OjEwMCU7LXdlYmtpdC10b3VjaC1jYWxsb3V0Om5vbmU7LXdlYmtpdC11c2VyLXNlbGVjdDpub25lOy1raHRtbC11c2VyLXNlbGVjdDpub25lOy1tb3otdXNlci1zZWxlY3Q6bm9uZTstbXMtdXNlci1zZWxlY3Q6bm9uZTt1c2VyLXNlbGVjdDpub25lO3BvaW50ZXItZXZlbnRzOm5vbmV9I2NvbnRyb2xLaXQgLnBhbmVsey13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveDtwb2ludGVyLWV2ZW50czphdXRvO3Bvc2l0aW9uOnJlbGF0aXZlO3otaW5kZXg6MTstd2Via2l0LXRvdWNoLWNhbGxvdXQ6bm9uZTstd2Via2l0LXVzZXItc2VsZWN0Om5vbmU7LWtodG1sLXVzZXItc2VsZWN0Om5vbmU7LW1vei11c2VyLXNlbGVjdDpub25lOy1tcy11c2VyLXNlbGVjdDpub25lO3VzZXItc2VsZWN0Om5vbmU7b3ZlcmZsb3c6aGlkZGVuO29wYWNpdHk6MTtmbG9hdDpsZWZ0O3dpZHRoOjIwMHB4O2JvcmRlci1yYWRpdXM6M3B4Oy1tb3otYm9yZGVyLXJhZGl1czozcHg7Ym94LXNoYWRvdzowIDJweCAycHggcmdiYSgwLDAsMCwuMjUpO21hcmdpbjowO3BhZGRpbmc6MDtiYWNrZ3JvdW5kLWNvbG9yOiMxYTFhMWE7Zm9udC1mYW1pbHk6QXJpYWwsc2Fucy1zZXJpZn0jY29udHJvbEtpdCAucGFuZWwgLndyYXB7d2lkdGg6YXV0bztoZWlnaHQ6YXV0bzttYXJnaW46MDtwYWRkaW5nOjA7cG9zaXRpb246cmVsYXRpdmU7b3ZlcmZsb3c6aGlkZGVufSNjb250cm9sS2l0IC5wYW5lbCB1bHttYXJnaW46MDtwYWRkaW5nOjA7bGlzdC1zdHlsZTpub25lfSNjb250cm9sS2l0IC5wYW5lbCAuY29sb3IsI2NvbnRyb2xLaXQgLnBhbmVsIGlucHV0W3R5cGU9dGV4dF0sI2NvbnRyb2xLaXQgLnBhbmVsIHRleHRhcmVhLCNjb250cm9sS2l0IC5waWNrZXIgaW5wdXRbdHlwZT10ZXh0XXstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7d2lkdGg6MTAwJTtoZWlnaHQ6MjVweDtwYWRkaW5nOjAgMCAwIDhweDtmb250LWZhbWlseTpBcmlhbCxzYW5zLXNlcmlmO2ZvbnQtc2l6ZToxMXB4O2NvbG9yOiNmZmY7dGV4dC1zaGFkb3c6MXB4IDFweCAjMDAwO291dGxpbmU6MDtiYWNrZ3JvdW5kOiMyMjI3Mjk7YmFja2dyb3VuZC1pbWFnZTotby1saW5lYXItZ3JhZGllbnQocmdiYSgwLDAsMCwuMDc1KSAwLHJnYmEoMCwwLDAsLjEyNSkgMTAwJSk7YmFja2dyb3VuZC1pbWFnZTpsaW5lYXItZ3JhZGllbnQocmdiYSgwLDAsMCwuMDc1KSAwLHJnYmEoMCwwLDAsLjEyNSkgMTAwJSk7Ym9yZGVyOm5vbmU7Ym94LXNoYWRvdzowIDAgMCAxcHggIzFmMWYxZiBpbnNldDtib3JkZXItcmFkaXVzOjJweDstbW96LWJvcmRlci1yYWRpdXM6MnB4fSNjb250cm9sS2l0IC5wYW5lbCAuYnV0dG9uLCNjb250cm9sS2l0IC5wYW5lbCAuc2VsZWN0LCNjb250cm9sS2l0IC5wYW5lbCAuc2VsZWN0LWFjdGl2ZSwjY29udHJvbEtpdCAucGlja2VyIC5idXR0b257LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O2N1cnNvcjpwb2ludGVyO3dpZHRoOjEwMCU7aGVpZ2h0OjI2cHg7bWFyZ2luOjA7YmFja2dyb3VuZC1pbWFnZTotby1saW5lYXItZ3JhZGllbnQoIzQwNDA0MCAwLCMzYjNiM2IgMTAwJSk7YmFja2dyb3VuZC1pbWFnZTpsaW5lYXItZ3JhZGllbnQoIzQwNDA0MCAwLCMzYjNiM2IgMTAwJSk7Ym9yZGVyOm5vbmU7b3V0bGluZTowO2JvcmRlci1yYWRpdXM6MnB4O2JveC1zaGFkb3c6MCAwIDAgMXB4ICMxZjFmMWYgaW5zZXQsLTFweCAycHggMCAwICM0YTRhNGEgaW5zZXQ7Zm9udC1mYW1pbHk6QXJpYWwsc2Fucy1zZXJpZjtjb2xvcjojZmZmfSNjb250cm9sS2l0IC5wYW5lbCB0ZXh0YXJlYXtwYWRkaW5nOjVweCA4cHggMnB4O292ZXJmbG93OmhpZGRlbjtyZXNpemU6bm9uZTt2ZXJ0aWNhbC1hbGlnbjp0b3A7d2hpdGUtc3BhY2U6bm93cmFwfSNjb250cm9sS2l0IC5wYW5lbCAudGV4dGFyZWEtd3JhcHstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7d2lkdGg6MTAwJTtwYWRkaW5nOjA7ZmxvYXQ6bGVmdDtoZWlnaHQ6MTAwJTtvdmVyZmxvdzpoaWRkZW47Ym9yZGVyOm5vbmU7Ym9yZGVyLXJhZGl1czoycHg7LW1vei1ib3JkZXItcmFkaXVzOjJweDtiYWNrZ3JvdW5kLWNvbG9yOiMyMjI3Mjk7Ym94LXNoYWRvdzowIDAgMXB4IDJweCByZ2JhKDAsMCwwLC4wMTI1KSBpbnNldCwwIDAgMXB4IDFweCAjMTExMzE0IGluc2V0O2JhY2tncm91bmQtaW1hZ2U6LW8tbGluZWFyLWdyYWRpZW50KHJnYmEoMCwwLDAsLjA3NSkgMCxyZ2JhKDAsMCwwLC4xMjUpIDEwMCUpO2JhY2tncm91bmQtaW1hZ2U6bGluZWFyLWdyYWRpZW50KHJnYmEoMCwwLDAsLjA3NSkgMCxyZ2JhKDAsMCwwLC4xMjUpIDEwMCUpfSNjb250cm9sS2l0IC5wYW5lbCAudGV4dGFyZWEtd3JhcCB0ZXh0YXJlYXtib3JkZXI6bm9uZTtib3JkZXItcmFkaXVzOjJweDstbW96LWJvcmRlci1yYWRpdXM6MnB4O2JveC1zaGFkb3c6bm9uZTtiYWNrZ3JvdW5kOjAgMH0jY29udHJvbEtpdCAucGFuZWwgLnRleHRhcmVhLXdyYXAgLnNjcm9sbEJhcntib3JkZXI6MXB4IHNvbGlkICMxMDEyMTM7Ym9yZGVyLWJvdHRvbS1yaWdodC1yYWRpdXM6MnB4O2JvcmRlci10b3AtcmlnaHQtcmFkaXVzOjJweDtib3JkZXItbGVmdDpub25lO2JveC1zaGFkb3c6MCAwIDFweCAycHggcmdiYSgwLDAsMCwuMDEyNSkgaW5zZXQsMCAwIDFweCAxcHggIzExMTMxNCBpbnNldH0jY29udHJvbEtpdCAucGFuZWwgY2FudmFze2N1cnNvcjpwb2ludGVyO3ZlcnRpY2FsLWFsaWduOmJvdHRvbTtib3JkZXI6bm9uZTtib3gtc2hhZG93OjAgMCAwIDFweCAjMWYxZjFmIGluc2V0O2JvcmRlci1yYWRpdXM6MnB4Oy1tb3otYm9yZGVyLXJhZGl1czoycHh9I2NvbnRyb2xLaXQgLnBhbmVsIC5jYW52YXMtd3JhcCwjY29udHJvbEtpdCAucGFuZWwgLnN2Zy13cmFwe21hcmdpbjo2cHggMCAwO3Bvc2l0aW9uOnJlbGF0aXZlO3dpZHRoOjcwJTtmbG9hdDpyaWdodDstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym9yZGVyOm5vbmU7Ym9yZGVyLXJhZGl1czoycHg7LW1vei1ib3JkZXItcmFkaXVzOjJweDtiYWNrZ3JvdW5kOiMxZTIyMjQ7YmFja2dyb3VuZC1pbWFnZTotby1saW5lYXItZ3JhZGllbnQodHJhbnNwYXJlbnQgMCxyZ2JhKDAsMCwwLC4wNSkgMTAwJSk7YmFja2dyb3VuZC1pbWFnZTpsaW5lYXItZ3JhZGllbnQodHJhbnNwYXJlbnQgMCxyZ2JhKDAsMCwwLC4wNSkgMTAwJSl9I2NvbnRyb2xLaXQgLnBhbmVsIC5jYW52YXMtd3JhcCBzdmcsI2NvbnRyb2xLaXQgLnBhbmVsIC5zdmctd3JhcCBzdmd7cG9zaXRpb246YWJzb2x1dGU7bGVmdDowO3RvcDowO2N1cnNvcjpwb2ludGVyO3ZlcnRpY2FsLWFsaWduOmJvdHRvbTtib3JkZXI6bm9uZTtib3gtc2hhZG93OjAgMCAwIDFweCAjMWYxZjFmIGluc2V0O2JvcmRlci1yYWRpdXM6MnB4Oy1tb3otYm9yZGVyLXJhZGl1czoycHh9I2NvbnRyb2xLaXQgLnBhbmVsIC5idXR0b24sI2NvbnRyb2xLaXQgLnBpY2tlciAuYnV0dG9ue2ZvbnQtc2l6ZToxMHB4O2ZvbnQtd2VpZ2h0OjcwMDt0ZXh0LXNoYWRvdzowIDFweCAjMDAwO3RleHQtdHJhbnNmb3JtOnVwcGVyY2FzZX0jY29udHJvbEtpdCAucGFuZWwgLmJ1dHRvbjpob3ZlciwjY29udHJvbEtpdCAucGlja2VyIC5idXR0b246aG92ZXJ7YmFja2dyb3VuZC1pbWFnZTotby1saW5lYXItZ3JhZGllbnQoIzQ1NDU0NSAwLCMzYjNiM2IgMTAwJSk7YmFja2dyb3VuZC1pbWFnZTpsaW5lYXItZ3JhZGllbnQoIzQ1NDU0NSAwLCMzYjNiM2IgMTAwJSl9I2NvbnRyb2xLaXQgLnBhbmVsIC5idXR0b246YWN0aXZlLCNjb250cm9sS2l0IC5waWNrZXIgLmJ1dHRvbjphY3RpdmV7YmFja2dyb3VuZC1pbWFnZTotby1saW5lYXItZ3JhZGllbnQoIzQwNDA0MCAwLCMzYjNiM2IgMTAwJSk7YmFja2dyb3VuZC1pbWFnZTpsaW5lYXItZ3JhZGllbnQoIzQwNDA0MCAwLCMzYjNiM2IgMTAwJSl9I2NvbnRyb2xLaXQgLnBhbmVsIC5jb2xvci13aXRoLXByZXNldC13cmFwLCNjb250cm9sS2l0IC5wYW5lbCAuaW5wdXQtd2l0aC1wcmVzZXQtd3JhcHt3aWR0aDoxMDAlO2Zsb2F0OmxlZnR9I2NvbnRyb2xLaXQgLnBhbmVsIC5jb2xvci13aXRoLXByZXNldC13cmFwIC5jb2xvciwjY29udHJvbEtpdCAucGFuZWwgLmlucHV0LXdpdGgtcHJlc2V0LXdyYXAgaW5wdXRbdHlwZT10ZXh0XXtwYWRkaW5nLXJpZ2h0OjI1cHg7Ym9yZGVyLXRvcC1yaWdodC1yYWRpdXM6MnB4O2JvcmRlci1ib3R0b20tcmlnaHQtcmFkaXVzOjJweDtmbG9hdDpsZWZ0fSNjb250cm9sS2l0IC5wYW5lbCAuYnV0dG9uLXByZXNldCwjY29udHJvbEtpdCAucGFuZWwgLmJ1dHRvbi1wcmVzZXQtYWN0aXZley13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveDtwb3NpdGlvbjphYnNvbHV0ZTtyaWdodDowO3dpZHRoOjIwcHg7aGVpZ2h0OjI1cHg7bWFyZ2luOjA7Y3Vyc29yOnBvaW50ZXI7ZmxvYXQ6cmlnaHQ7Ym9yZGVyOm5vbmU7Ym9yZGVyLXRvcC1yaWdodC1yYWRpdXM6MnB4O2JvcmRlci1ib3R0b20tcmlnaHQtcmFkaXVzOjJweDtib3gtc2hhZG93OjAgMCAwIDFweCAjMWYxZjFmIGluc2V0LC0xcHggMnB4IDAgMCAjNGE0YTRhIGluc2V0O291dGxpbmU6MH0jY29udHJvbEtpdCAucGFuZWwgLmJ1dHRvbi1wcmVzZXQtYWN0aXZlLCNjb250cm9sS2l0IC5wYW5lbCAuYnV0dG9uLXByZXNldDpob3ZlcntiYWNrZ3JvdW5kOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBRzVKUkVGVWVOcGk1T0RpYW1SZ1lLaGp3QTRhbVZ4OGd4am1MMXJDOFAzclZ4UThiK0VTQmhmZklBWm1OUjI5QTVldlhXZGlaR0MwMTlYU1pHQmdZR0JZdm1ZOXc3STE2eG9aR0JnYVdLQkcxUzlicys0L0F3TkRQUU1EQTF5U2dZR0JnZEVuUEFiWnpnWTBtZ0V3QUU5bEpUMWxyc2ZmQUFBQUFFbEZUa1N1UW1DQykgNTAlIDUwJSBuby1yZXBlYXQsbGluZWFyLWdyYWRpZW50KCM0NTQ1NDUgMCwjM2IzYjNiIDEwMCUpfSNjb250cm9sS2l0IC5wYW5lbCAuYnV0dG9uLXByZXNldHtiYWNrZ3JvdW5kOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBRzVKUkVGVWVOcGk1T0RpYW1SZ1lLaGp3QTRhbVZ4OGd4am1MMXJDOFAzclZ4UThiK0VTQmhmZklBWm1OUjI5QTVldlhXZGlaR0MwMTlYU1pHQmdZR0JZdm1ZOXc3STE2eG9aR0JnYVdLQkcxUzlicys0L0F3TkRQUU1EQTF5U2dZR0JnZEVuUEFiWnpnWTBtZ0V3QUU5bEpUMWxyc2ZmQUFBQUFFbEZUa1N1UW1DQykgNTAlIDUwJSBuby1yZXBlYXQsbGluZWFyLWdyYWRpZW50KCM0MDQwNDAgMCwjM2IzYjNiIDEwMCUpfSNjb250cm9sS2l0IC5wYW5lbCBpbnB1dFt0eXBlPWNoZWNrYm94XXttYXJnaW46NnB4IDAgMH0jY29udHJvbEtpdCAucGFuZWwgLnNlbGVjdCwjY29udHJvbEtpdCAucGFuZWwgLnNlbGVjdC1hY3RpdmV7cGFkZGluZy1sZWZ0OjEwcHg7cGFkZGluZy1yaWdodDoyMHB4O2ZvbnQtc2l6ZToxMXB4O3RleHQtYWxpZ246bGVmdDt0ZXh0LXNoYWRvdzoxcHggMXB4ICMwMDA7Y3Vyc29yOnBvaW50ZXI7b3ZlcmZsb3c6aGlkZGVuO3doaXRlLXNwYWNlOm5vd3JhcDt0ZXh0LW92ZXJmbG93OmVsbGlwc2lzfSNjb250cm9sS2l0IC5wYW5lbCAuc2VsZWN0e2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQkFBQUFBTENBWUFBQUIyNGcwNUFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFNTkpSRUZVZU5xY2tqRUt3akFVaGo4bDUzQVE1MjZCSEtLTEloU2xIa0h4QmtrdUlGV1BJTFFPUVFkM1Y0VnVYaWd1RmxyRlJQemhMWGw4MzN1QjEwdXpuQ2FQK3E0QkVxbHM4M1k1SGdoRnRPSDFhbWtBaXQyK0l3a216WElHdzVIZUZGdmZaRk5zL1dBNDBtbVc0NzBQMWdmOExva0pSQ0lWMTF2TjliYjQyQzZSS3ZvREFkaFgvUlh4cU84RzBGLzZGakJCUVNJVjgrbUUyWFRjYVZUdVRPbE8wUTM2Z0NuZHlWYnUvQTVIcDdmdndMeW1hZUJudUhOSUxRbS93Z0RQQVFBUE5Jc0huTzc5NFFBQUFBQkpSVTVFcmtKZ2dnPT0pIDEwMCUgNTAlIG5vLXJlcGVhdCxsaW5lYXItZ3JhZGllbnQoIzQwNDA0MCAwLCMzYjNiM2IgMTAwJSl9I2NvbnRyb2xLaXQgLnBhbmVsIC5zZWxlY3QtYWN0aXZlLCNjb250cm9sS2l0IC5wYW5lbCAuc2VsZWN0OmhvdmVye2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQkFBQUFBTENBWUFBQUIyNGcwNUFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFNTkpSRUZVZU5xY2tqRUt3akFVaGo4bDUzQVE1MjZCSEtLTEloU2xIa0h4QmtrdUlGV1BJTFFPUVFkM1Y0VnVYaWd1RmxyRlJQemhMWGw4MzN1QjEwdXpuQ2FQK3E0QkVxbHM4M1k1SGdoRnRPSDFhbWtBaXQyK0l3a216WElHdzVIZUZGdmZaRk5zL1dBNDBtbVc0NzBQMWdmOExva0pSQ0lWMTF2TjliYjQyQzZSS3ZvREFkaFgvUlh4cU84RzBGLzZGakJCUVNJVjgrbUUyWFRjYVZUdVRPbE8wUTM2Z0NuZHlWYnUvQTVIcDdmdndMeW1hZUJudUhOSUxRbS93Z0RQQVFBUE5Jc0huTzc5NFFBQUFBQkpSVTVFcmtKZ2dnPT0pIDEwMCUgNTAlIG5vLXJlcGVhdCxsaW5lYXItZ3JhZGllbnQoIzQ1NDU0NSAwLCMzYjNiM2IgMTAwJSl9I2NvbnRyb2xLaXQgLnBhbmVsIC5zbGlkZXItaGFuZGxlLCNjb250cm9sS2l0IC5wYW5lbCAuc2xpZGVyLXNsb3QsI2NvbnRyb2xLaXQgLnBhbmVsIC5zbGlkZXItd3JhcCwjY29udHJvbEtpdCAucGFuZWwgLndyYXAtc2xpZGVyey13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveH0jY29udHJvbEtpdCAucGFuZWwgLndyYXAtc2xpZGVye3dpZHRoOjcwJTtwYWRkaW5nOjZweCAwIDA7ZmxvYXQ6cmlnaHQ7aGVpZ2h0OjEwMCV9I2NvbnRyb2xLaXQgLnBhbmVsIC53cmFwLXNsaWRlciBpbnB1dFt0eXBlPXRleHRde3dpZHRoOjI1JTt0ZXh0LWFsaWduOmNlbnRlcjtwYWRkaW5nOjA7ZmxvYXQ6cmlnaHR9I2NvbnRyb2xLaXQgLnBhbmVsIC5zbGlkZXItd3JhcHtmbG9hdDpsZWZ0O2N1cnNvcjpldy1yZXNpemU7d2lkdGg6NzAlfSNjb250cm9sS2l0IC5wYW5lbCAuc2xpZGVyLXNsb3R7d2lkdGg6MTAwJTtoZWlnaHQ6MjVweDtwYWRkaW5nOjNweDtiYWNrZ3JvdW5kLWNvbG9yOiMxZTIyMjQ7Ym9yZGVyOm5vbmU7Ym94LXNoYWRvdzowIDAgMCAxcHggIzFmMWYxZiBpbnNldDtib3JkZXItcmFkaXVzOjJweDstbW96LWJvcmRlci1yYWRpdXM6MnB4fSNjb250cm9sS2l0IC5wYW5lbCAuc2xpZGVyLWhhbmRsZXtwb3NpdGlvbjpyZWxhdGl2ZTt3aWR0aDoxMDAlO2hlaWdodDoxMDAlO2JhY2tncm91bmQ6I2IzMjQzNTtiYWNrZ3JvdW5kLWltYWdlOi1vLWxpbmVhci1ncmFkaWVudCh0cmFuc3BhcmVudCAwLHJnYmEoMCwwLDAsLjEpIDEwMCUpO2JhY2tncm91bmQtaW1hZ2U6bGluZWFyLWdyYWRpZW50KHRyYW5zcGFyZW50IDAscmdiYSgwLDAsMCwuMSkgMTAwJSk7Ym94LXNoYWRvdzowIDFweCAwIDAgIzBmMGYwZn0jY29udHJvbEtpdCAucGFuZWwgLmNvbG9yey13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveDstd2Via2l0LXRvdWNoLWNhbGxvdXQ6bm9uZTstd2Via2l0LXVzZXItc2VsZWN0Om5vbmU7LWtodG1sLXVzZXItc2VsZWN0Om5vbmU7LW1vei11c2VyLXNlbGVjdDpub25lOy1tcy11c2VyLXNlbGVjdDpub25lO3VzZXItc2VsZWN0Om5vbmU7Y3Vyc29yOnBvaW50ZXI7d2lkdGg6MTAwJTtoZWlnaHQ6MjVweDtwYWRkaW5nOjA7Ym9yZGVyOm5vbmU7YmFja2dyb3VuZDojZmZmO2JveC1zaGFkb3c6MCAwIDAgMXB4ICMxMTEzMTQgaW5zZXQ7dGV4dC1hbGlnbjpjZW50ZXI7bGluZS1oZWlnaHQ6MjVweDtib3JkZXItcmFkaXVzOjJweDstbW96LWJvcmRlci1yYWRpdXM6MnB4fSNjb250cm9sS2l0IC5wYW5lbCAuZ3JhcGgtc2xpZGVyLXgtd3JhcCwjY29udHJvbEtpdCAucGFuZWwgLmdyYXBoLXNsaWRlci15LXdyYXB7cG9zaXRpb246YWJzb2x1dGU7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94fSNjb250cm9sS2l0IC5wYW5lbCAuZ3JhcGgtc2xpZGVyLXgtd3JhcHtib3R0b206MDtsZWZ0OjA7d2lkdGg6MTAwJTtwYWRkaW5nOjZweCAyMHB4IDZweCA2cHh9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaC1zbGlkZXIteS13cmFwe3RvcDowO3JpZ2h0OjA7aGVpZ2h0OjEwMCU7cGFkZGluZzo2cHggNnB4IDIwcHh9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaC1zbGlkZXIteCwjY29udHJvbEtpdCAucGFuZWwgLmdyYXBoLXNsaWRlci15ey13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveDtib3JkZXItcmFkaXVzOjJweDstbW96LWJvcmRlci1yYWRpdXM6MnB4O2JhY2tncm91bmQ6cmdiYSgyNCwyNywyOSwuNSk7Ym9yZGVyOjFweCBzb2xpZCAjMTgxYjFkfSNjb250cm9sS2l0IC5wYW5lbCAuZ3JhcGgtc2xpZGVyLXh7aGVpZ2h0OjhweH0jY29udHJvbEtpdCAucGFuZWwgLmdyYXBoLXNsaWRlci15e3dpZHRoOjhweDtoZWlnaHQ6MTAwJX0jY29udHJvbEtpdCAucGFuZWwgLmdyYXBoLXNsaWRlci14LWhhbmRsZSwjY29udHJvbEtpdCAucGFuZWwgLmdyYXBoLXNsaWRlci15LWhhbmRsZXstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7Y3Vyc29yOnBvaW50ZXI7Ym9yZGVyOjFweCBzb2xpZCAjMTgxYjFkO2JhY2tncm91bmQ6IzMwMzYzOX0jY29udHJvbEtpdCAucGFuZWwgLmdyYXBoLXNsaWRlci14LWhhbmRsZXt3aWR0aDoyMHB4O2hlaWdodDoxMDAlO2JvcmRlci10b3A6bm9uZTtib3JkZXItYm90dG9tOm5vbmV9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaC1zbGlkZXIteS1oYW5kbGV7d2lkdGg6MTAwJTtoZWlnaHQ6MjBweDtib3JkZXItbGVmdDpub25lO2JvcmRlci1yaWdodDpub25lfSNjb250cm9sS2l0IC5zdWItZ3JvdXAgLndyYXAgLndyYXAgLndyYXB7d2lkdGg6MjUlIWltcG9ydGFudDtwYWRkaW5nOjAhaW1wb3J0YW50O2Zsb2F0OmxlZnQhaW1wb3J0YW50fSNjb250cm9sS2l0IC5zdWItZ3JvdXAgLndyYXAgLndyYXAgLndyYXAgLmxhYmVse3dpZHRoOjEwMCUhaW1wb3J0YW50O3BhZGRpbmc6OHB4IDAgMCFpbXBvcnRhbnQ7Y29sb3I6Izg3ODc4NyFpbXBvcnRhbnQ7dGV4dC1hbGlnbjpjZW50ZXIhaW1wb3J0YW50O3RleHQtdHJhbnNmb3JtOnVwcGVyY2FzZSFpbXBvcnRhbnQ7Zm9udC13ZWlnaHQ6NzAwIWltcG9ydGFudDt0ZXh0LXNoYWRvdzoxcHggMXB4ICMxYTFhMWEhaW1wb3J0YW50fSNjb250cm9sS2l0IC5zdWItZ3JvdXAgLndyYXAgLndyYXAgLndyYXAgaW5wdXRbdHlwZT10ZXh0XXtwYWRkaW5nOjA7dGV4dC1hbGlnbjpjZW50ZXJ9I2NvbnRyb2xLaXQgLm9wdGlvbnN7cG9pbnRlci1ldmVudHM6YXV0bzstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym9yZGVyOjFweCBzb2xpZCAjMWYxZjFmO2JvcmRlci1yYWRpdXM6MnB4Oy1tb3otYm9yZGVyLXJhZGl1czoycHg7cG9zaXRpb246YWJzb2x1dGU7ei1pbmRleDoyMTQ3NDgzNjM4O2xlZnQ6MDt0b3A6MDt3aWR0aDphdXRvO2hlaWdodDphdXRvO2JveC1zaGFkb3c6MCAxcHggMCAwICM0YTRhNGEgaW5zZXQ7YmFja2dyb3VuZC1jb2xvcjojNDU0NTQ1O2ZvbnQtZmFtaWx5OkFyaWFsLHNhbnMtc2VyaWY7Zm9udC1zaXplOjExcHg7Y29sb3I6I2ZmZjt0ZXh0LXNoYWRvdzoxcHggMXB4ICMwMDA7b3ZlcmZsb3c6aGlkZGVufSNjb250cm9sS2l0IC5vcHRpb25zIHVse3dpZHRoOjEwMCU7bGlzdC1zdHlsZTpub25lO21hcmdpbjowO3BhZGRpbmc6MH0jY29udHJvbEtpdCAub3B0aW9ucyB1bCBsaXttYXJnaW46MDt3aWR0aDoxMDAlO2hlaWdodDoyNXB4O2xpbmUtaGVpZ2h0OjI1cHg7cGFkZGluZzowIDIwcHggMCAxMHB4O292ZXJmbG93OmhpZGRlbjt3aGl0ZS1zcGFjZTpub3JtYWw7dGV4dC1vdmVyZmxvdzplbGxpcHNpcztjdXJzb3I6cG9pbnRlcn0jY29udHJvbEtpdCAub3B0aW9ucyB1bCBsaTpob3ZlcntiYWNrZ3JvdW5kLWNvbG9yOiMxZjIzMjV9I2NvbnRyb2xLaXQgLm9wdGlvbnMgdWwgLmxpLXNlbGVjdGVke2JhY2tncm91bmQtY29sb3I6IzI5MmQzMH0jY29udHJvbEtpdCAub3B0aW9ucyAuY29sb3J7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94fSNjb250cm9sS2l0IC5vcHRpb25zIC5jb2xvciAubGktc2VsZWN0ZWQsI2NvbnRyb2xLaXQgLm9wdGlvbnMgLmNvbG9yIGxpey13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveDtwYWRkaW5nOjA7aGVpZ2h0OjI1cHg7bGluZS1oZWlnaHQ6MjVweDt0ZXh0LWFsaWduOmNlbnRlcn0jY29udHJvbEtpdCAub3B0aW9ucyAuY29sb3IgLmxpLXNlbGVjdGVkOmhvdmVyLCNjb250cm9sS2l0IC5vcHRpb25zIC5jb2xvciBsaTpob3ZlcntiYWNrZ3JvdW5kOjAgMDtmb250LXdlaWdodDo3MDB9I2NvbnRyb2xLaXQgLm9wdGlvbnMgLmNvbG9yIC5saS1zZWxlY3RlZHtmb250LXdlaWdodDo3MDB9I2NvbnRyb2xLaXQgLnBhbmVsIC5sYWJlbCwjY29udHJvbEtpdCAucGlja2VyIC5sYWJlbHt3aWR0aDoxMDAlO2Zsb2F0OmxlZnQ7Zm9udC1zaXplOjExcHg7Zm9udC13ZWlnaHQ6NzAwO3RleHQtc2hhZG93OjAgMXB4ICMwMDA7b3ZlcmZsb3c6aGlkZGVuO3doaXRlLXNwYWNlOm5vd3JhcDt0ZXh0LW92ZXJmbG93OmVsbGlwc2lzO2N1cnNvcjpkZWZhdWx0fSNjb250cm9sS2l0IC5wYW5lbCAuaGVhZCwjY29udHJvbEtpdCAucGFuZWwgLnBhbmVsLWhlYWQtaW5hY3RpdmUsI2NvbnRyb2xLaXQgLnBpY2tlciAuaGVhZHtoZWlnaHQ6MzBweDtwYWRkaW5nOjAgMTBweDtiYWNrZ3JvdW5kOiMxYTFhMWE7b3ZlcmZsb3c6aGlkZGVufSNjb250cm9sS2l0IC5wYW5lbCAuaGVhZCAud3JhcCwjY29udHJvbEtpdCAucGFuZWwgLnBhbmVsLWhlYWQtaW5hY3RpdmUgLndyYXAsI2NvbnRyb2xLaXQgLnBpY2tlciAuaGVhZCAud3JhcHt3aWR0aDphdXRvO2hlaWdodDphdXRvO21hcmdpbjowO3BhZGRpbmc6MDtwb3NpdGlvbjpyZWxhdGl2ZTtvdmVyZmxvdzpoaWRkZW59I2NvbnRyb2xLaXQgLnBhbmVsIC5oZWFkIC5sYWJlbCwjY29udHJvbEtpdCAucGlja2VyIC5oZWFkIC5sYWJlbHtjdXJzb3I6cG9pbnRlcjtsaW5lLWhlaWdodDozMHB4O2NvbG9yOiM2NTY5NmJ9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuaGVhZHtoZWlnaHQ6MzhweDtwYWRkaW5nOjAgMTBweDtib3JkZXItdG9wOjFweCBzb2xpZCAjNGY0ZjRmO2JvcmRlci1ib3R0b206MXB4IHNvbGlkICMyNjI2MjY7YmFja2dyb3VuZC1pbWFnZTotby1saW5lYXItZ3JhZGllbnQoIzQ1NDU0NSAwLCMzYjNiM2IgMTAwJSk7YmFja2dyb3VuZC1pbWFnZTpsaW5lYXItZ3JhZGllbnQoIzQ1NDU0NSAwLCMzYjNiM2IgMTAwJSk7Y3Vyc29yOnBvaW50ZXJ9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuaGVhZCAubGFiZWx7Zm9udC1zaXplOjEycHg7bGluZS1oZWlnaHQ6MzhweDtjb2xvcjojZmZmfSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLmhlYWQ6aG92ZXJ7Ym9yZGVyLXRvcDoxcHggc29saWQgIzUyNTI1MjtiYWNrZ3JvdW5kLWltYWdlOi1vLWxpbmVhci1ncmFkaWVudCgjNDU0NTQ1IDAsIzQwNDA0MCAxMDAlKTtiYWNrZ3JvdW5kLWltYWdlOmxpbmVhci1ncmFkaWVudCgjNDU0NTQ1IDAsIzQwNDA0MCAxMDAlKX0jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIGxpe2hlaWdodDozNXB4O3BhZGRpbmc6MCAxMHB4fSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLnN1Yi1ncm91cC1saXN0IC5zdWItZ3JvdXA6bGFzdC1vZi10eXBle2JvcmRlci1ib3R0b206bm9uZX0jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3Vwe3BhZGRpbmc6MDtoZWlnaHQ6YXV0bztib3JkZXItYm90dG9tOjFweCBzb2xpZCAjMjQyNDI0fSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLnN1Yi1ncm91cC1saXN0IC5zdWItZ3JvdXAgdWx7b3ZlcmZsb3c6aGlkZGVufSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLnN1Yi1ncm91cC1saXN0IC5zdWItZ3JvdXAgdWwgbGl7YmFja2dyb3VuZDojMmUyZTJlO2JvcmRlci1ib3R0b206MXB4IHNvbGlkICMyMjI3Mjl9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cCB1bCBsaTpsYXN0LW9mLXR5cGV7Ym9yZGVyLWJvdHRvbTpub25lfSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLnN1Yi1ncm91cC1saXN0IC5zdWItZ3JvdXA6Zmlyc3QtY2hpbGR7bWFyZ2luLXRvcDowfSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLnN1Yi1ncm91cC1saXN0IC5zdWItZ3JvdXAgLmhlYWQsI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cCAuaGVhZC1pbmFjdGl2ZXtjdXJzb3I6cG9pbnRlcn0jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3VwIC5oZWFke2hlaWdodDoyN3B4O3BhZGRpbmc6MCAxMHB4O2JvcmRlci10b3A6bm9uZTtib3JkZXItYm90dG9tOjFweCBzb2xpZCAjMjQyNDI0O2JhY2tncm91bmQtaW1hZ2U6bm9uZTtiYWNrZ3JvdW5kLWNvbG9yOiMyNzI3Mjd9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cCAuaGVhZDpob3ZlcntiYWNrZ3JvdW5kLWltYWdlOm5vbmU7YmFja2dyb3VuZC1jb2xvcjojMjcyNzI3fSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLnN1Yi1ncm91cC1saXN0IC5zdWItZ3JvdXAgLmhlYWQtaW5hY3RpdmV7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O2hlaWdodDoyN3B4O3BhZGRpbmc6MCAxMHB4O2JveC1zaGFkb3c6MCAxcHggMCAwICM0MDQwNDAgaW5zZXQ7YmFja2dyb3VuZC1pbWFnZTotby1saW5lYXItZ3JhZGllbnQoIzNiM2IzYiAwLCMzODM4MzggMTAwJSk7YmFja2dyb3VuZC1pbWFnZTpsaW5lYXItZ3JhZGllbnQoIzNiM2IzYiAwLCMzODM4MzggMTAwJSl9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cCAuc3ViLWdyb3VwLWxpc3QgLnN1Yi1ncm91cCAuaGVhZC1pbmFjdGl2ZTpob3Zlcntib3gtc2hhZG93OjAgMXB4IDAgMCAjNDc0NzQ3IGluc2V0O2JhY2tncm91bmQtaW1hZ2U6bm9uZTtiYWNrZ3JvdW5kLWltYWdlOi1vLWxpbmVhci1ncmFkaWVudCgjNDA0MDQwIDAsIzNiM2IzYiAxMDAlKTtiYWNrZ3JvdW5kLWltYWdlOmxpbmVhci1ncmFkaWVudCgjNDA0MDQwIDAsIzNiM2IzYiAxMDAlKX0jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3VwIC5oZWFkIC5sYWJlbCwjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3VwIC5oZWFkLWluYWN0aXZlIC5sYWJlbHttYXJnaW46MDtwYWRkaW5nOjA7bGluZS1oZWlnaHQ6MjdweDtjb2xvcjojZmZmO2ZvbnQtd2VpZ2h0OjcwMDtmb250LXNpemU6MTFweDt0ZXh0LXNoYWRvdzoxcHggMXB4ICMwMDA7dGV4dC10cmFuc2Zvcm06Y2FwaXRhbGl6ZX0jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3VwIC5oZWFkIC53cmFwIC5sYWJlbCwjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3VwIC5oZWFkLWluYWN0aXZlIC53cmFwIC5sYWJlbHt3aWR0aDoxMDAlO2ZvbnQtd2VpZ2h0OjcwMDtjb2xvcjojZmZmO3BhZGRpbmc6MH0jY29udHJvbEtpdCAucGFuZWwgLmdyb3VwLWxpc3QgLmdyb3VwIC5zdWItZ3JvdXAtbGlzdCAuc3ViLWdyb3VwIC53cmFwIC5sYWJlbHstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7aGVpZ2h0OjEwMCU7d2lkdGg6MzAlO3BhZGRpbmc6MTJweCA1cHggMCAwO2Zsb2F0OmxlZnQ7Zm9udC1zaXplOjExcHg7Zm9udC13ZWlnaHQ6NDAwO2NvbG9yOiNhZWI1Yjg7dGV4dC1zaGFkb3c6MXB4IDFweCAjMDAwfSNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXAgLnN1Yi1ncm91cC1saXN0IC5zdWItZ3JvdXAgLndyYXAgLndyYXB7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O3dpZHRoOjcwJTtwYWRkaW5nOjVweCAwIDA7ZmxvYXQ6cmlnaHQ7aGVpZ2h0OjEwMCV9I2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cC1saXN0IC5ncm91cDpsYXN0LWNoaWxkIC5zY3JvbGwtYnVmZmVyOm50aC1vZi10eXBlKDMpLCNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXAtbGlzdCAuZ3JvdXA6bGFzdC1jaGlsZCAuc3ViLWdyb3VwLWxpc3R7Ym9yZGVyLWJvdHRvbTpub25lfSNjb250cm9sS2l0IC5wYW5lbCAuc2Nyb2xsLXdyYXB7cG9zaXRpb246cmVsYXRpdmU7b3ZlcmZsb3c6aGlkZGVufSNjb250cm9sS2l0IC5wYW5lbCAuc2Nyb2xsLWJ1ZmZlcnt3aWR0aDoxMDAlO2hlaWdodDo4cHg7Ym9yZGVyLXRvcDoxcHggc29saWQgIzNiNDQ0Nztib3JkZXItYm90dG9tOjFweCBzb2xpZCAjMWUyMjI0fSNjb250cm9sS2l0IC5wYW5lbCAuc2Nyb2xsQmFyey13ZWJraXQtYm94LXNpemluZzpjb250ZW50LWJveDstbW96LWJveC1zaXppbmc6Y29udGVudC1ib3g7Ym94LXNpemluZzpjb250ZW50LWJveDt3aWR0aDoxNXB4O2hlaWdodDoxMDAlO2Zsb2F0OnJpZ2h0O3RvcDowO3BhZGRpbmc6MDttYXJnaW46MDtwb3NpdGlvbjpyZWxhdGl2ZTtiYWNrZ3JvdW5kOiMyMTI2Mjg7YmFja2dyb3VuZC1pbWFnZTpsaW5lYXItZ3JhZGllbnQodG8gcmlnaHQsIzI0MjQyNCAwLCMyZTJlMmUgMTAwJSl9I2NvbnRyb2xLaXQgLnBhbmVsIC5zY3JvbGxCYXIgLnRyYWNre3BhZGRpbmc6MCAzcHggMCAycHh9I2NvbnRyb2xLaXQgLnBhbmVsIC5zY3JvbGxCYXIgLnRyYWNrIC50aHVtYnstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7d2lkdGg6MTFweDtwb3NpdGlvbjphYnNvbHV0ZTtjdXJzb3I6cG9pbnRlcjtiYWNrZ3JvdW5kLWNvbG9yOiMzNDM0MzQ7Ym9yZGVyOjFweCBzb2xpZCAjMWIxZjIxO2JvcmRlci1yYWRpdXM6MTBweDstbW96LWJvcmRlci1yYWRpdXM6MTBweDtib3gtc2hhZG93Omluc2V0IDAgMXB4IDAgMCAjNDM0YjUwfSNjb250cm9sS2l0IC5wYW5lbCAubWVudSwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlLCNjb250cm9sS2l0IC5waWNrZXIgLm1lbnV7ZmxvYXQ6cmlnaHQ7cGFkZGluZzo1cHggMCAwfSNjb250cm9sS2l0IC5wYW5lbCAubWVudSBpbnB1dFt0eXBlPWJ1dHRvbl0sI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSBpbnB1dFt0eXBlPWJ1dHRvbl0sI2NvbnRyb2xLaXQgLnBpY2tlciAubWVudSBpbnB1dFt0eXBlPWJ1dHRvbl17LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O2N1cnNvcjpwb2ludGVyO2hlaWdodDoyMHB4O2JvcmRlcjpub25lO3ZlcnRpY2FsLWFsaWduOnRvcDtib3JkZXItcmFkaXVzOjJweDstbW96LWJvcmRlci1yYWRpdXM6MnB4O2ZvbnQtZmFtaWx5OkFyaWFsLHNhbnMtc2VyaWY7Zm9udC1zaXplOjEwcHg7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOiNhYWE7dGV4dC1zaGFkb3c6MCAtMXB4ICMwMDA7dGV4dC10cmFuc2Zvcm06dXBwZXJjYXNlO2JveC1zaGFkb3c6MCAwIDAgMXB4ICMxMzEzMTMgaW5zZXQsLTFweCAycHggMCAwICMyMTI1MjcgaW5zZXR9I2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idXR0b24tbWVudS1jbG9zZSwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ1dHRvbi1tZW51LWhpZGUsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idXR0b24tbWVudS1zaG93LCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LWNsb3NlLCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LWhpZGUsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtc2hvdywjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idXR0b24tbWVudS1jbG9zZSwjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idXR0b24tbWVudS1oaWRlLCNjb250cm9sS2l0IC5waWNrZXIgLm1lbnUgLmJ1dHRvbi1tZW51LXNob3d7d2lkdGg6MjBweDttYXJnaW4tbGVmdDo0cHh9I2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idXR0b24tbWVudS1oaWRlLCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LWhpZGUsI2NvbnRyb2xLaXQgLnBpY2tlciAubWVudSAuYnV0dG9uLW1lbnUtaGlkZXtiYWNrZ3JvdW5kOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBR1JKUkVGVWVOcGlkUFVOWW9DQlUwY08xRE13TURDWTJUZzB3c1JZa0NWbEZaVWJvR3k0SW1abGRVMjRwSnlTQ2dPL29CQURBd09Edy9WTDV4bWs1UlFPTXI5OS9SSXVDUVBJaWxqTWJCd1lHQmdZR0g3Ly9NbUFEQ1NsWlJra3BXVVpBQU1BdlRzZ1hCdk9zcTBBQUFBQVNVVk9SSzVDWUlJPSkgNTAlIDUwJSBuby1yZXBlYXQsIzFhMWQxZn0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ1dHRvbi1tZW51LWhpZGU6aG92ZXIsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtaGlkZTpob3ZlciwjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idXR0b24tbWVudS1oaWRlOmhvdmVye2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBRkNBWUFBQUI0a2ExVkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFHUkpSRUZVZU5waWRQVU5Zb0NCVTBjTzFETXdNRENZMlRnMHdzUllrQ1ZsRlpVYm9HeTRJbVpsZFUyNHBKeVNDZ08vb0JBREF3T0R3L1ZMNXhtazVSUU9Ncjk5L1JJdUNRUElpbGpNYkJ3WUdCZ1lHSDcvL01tQURDU2xaUmtrcFdVWkFBTUF2VHNnWEJ2T3NxMEFBQUFBU1VWT1JLNUNZSUk9KSA1MCUgNTAlIG5vLXJlcGVhdCwjMDAwO2JveC1zaGFkb3c6I2ZmZiAwLCMwMDAgMTAwJX0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ1dHRvbi1tZW51LXNob3csI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtc2hvdywjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idXR0b24tbWVudS1zaG93e2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBRkNBWUFBQUI0a2ExVkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFGcEpSRUZVZU5wc2pERU9nQ0FRQk9jNGVxTmZvQ0I4d01yQ253ay84MkVIV0Vrd2NhdEpackt5ckZzR0x2NVgvSDZjcVBjNDFZOXB0VkxOMEJEVDNWc1RFVG5GdVZrV0lHdUlDV0JFdmZjaEFmejBtcXZaNEJlZUFRRHpWaU16SnkwUlhnQUFBQUJKUlU1RXJrSmdnZz09KSA1MCUgNTAlIG5vLXJlcGVhdCwjMWExZDFmfSNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnV0dG9uLW1lbnUtc2hvdzpob3ZlciwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS1zaG93OmhvdmVyLCNjb250cm9sS2l0IC5waWNrZXIgLm1lbnUgLmJ1dHRvbi1tZW51LXNob3c6aG92ZXJ7YmFja2dyb3VuZDp1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFGQ0FZQUFBQjRrYTFWQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQUZwSlJFRlVlTnBzakRFT2dDQVFCT2M0ZXFOZm9DQjh3TXJDbndrLzgyRUhXRWt3Y2F0SlpyS3lyRnNHTHY1WC9INmNxUGM0MVk5cHRWTE4wQkRUM1ZzVEVUbkZ1VmtXSUd1SUNXQkV2ZmNoQWZ6MG1xdlo0QmVlQVFEelZpTXpKeTBSWGdBQUFBQkpSVTVFcmtKZ2dnPT0pIDUwJSA1MCUgbm8tcmVwZWF0LCMwMDA7Ym94LXNoYWRvdzojZmZmIDAsIzAwMCAxMDAlfSNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnV0dG9uLW1lbnUtY2xvc2UsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtY2xvc2UsI2NvbnRyb2xLaXQgLnBpY2tlciAubWVudSAuYnV0dG9uLW1lbnUtY2xvc2V7YmFja2dyb3VuZDp1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFKQ0FZQUFBQVBVMjB1QUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQVExSlJFRlVlTnBNMEQ5TEFtRUF4L0h2UFhlRFRxZVhwVmVZWWpwWUdRMWhCUTdTbnhmUTBwQTFGRVZicjZGZVJnWnVDYjJFb09DZ20yNnNwb0lnaUtCUVFhSVVudWNlVzI3d3QzNkhEL3dNTytuY0FuYTFWbDlqYklIdnRZQU5hMmxsdFlKaHVJSHZYVlZyOVpNb0hwWG1Gdy90cENPdFdDeCtMMHh6djFoZU9BNThMdzY4cHFkbnpsTnBsMURLTndzNDBHSDRrSnJLWEFwaE5nWi92MlR6QlpTVWJhQWhJckxaL2Y2Nm04eTR6QmFLL1BUN1hhQUJJQ0x6YkRnY2JPa3dKRlFLUGRJVGdlKzFBUXc3NmR5NDJkeHVmcTVFcUZRTGVCZENYUFI2SFY2ZUh6K005ZnIyWjhKeFhDVmxFemlOeUQzVHNxNlZrc29zVjVZM3RkWWRZR2ZzaHFlUjFqa0RJL0UvQU84cllSbHdYQnF1QUFBQUFFbEZUa1N1UW1DQykgNTAlIDUwJSBuby1yZXBlYXQsIzFhMWQxZn0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ1dHRvbi1tZW51LWNsb3NlOmhvdmVyLCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LWNsb3NlOmhvdmVyLCNjb250cm9sS2l0IC5waWNrZXIgLm1lbnUgLmJ1dHRvbi1tZW51LWNsb3NlOmhvdmVye2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBSkNBWUFBQUFQVTIwdUFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFRMUpSRUZVZU5wTTBEOUxBbUVBeC9IdlBYZURUcWVYcFZlWVlqcFlHUTFoQlE3U254ZlEwcEExRkVWYnI2RmVSZ1p1Q2IyRW9PQ2dtMjZzcG9JZ2lLQlFRYUlVbnVjZVcyN3d0MzZIRC93TU8rbmNBbmExVmw5amJJSHZ0WUFOYTJsbHRZSmh1SUh2WFZWcjlaTW9IcFhtRncvdHBDT3RXQ3grTDB4enYxaGVPQTU4THc2OHBxZG56bE5wbDFES053czQwR0g0a0pyS1hBcGhOZ1ovdjJUekJaU1ViYUFoSXJMWi9mNjZtOHk0ekJhSy9QVDdYYUFCSUNMemJEZ2NiT2t3SkZRS1BkSVRnZSsxQVF3NzZkeTQyZHh1ZnE1RXFGUUxlQmRDWFBSNkhWNmVIeitNOWZyMlo4SnhYQ1ZsRXppTnlEM1RzcTZWa3Nvc1Y1WTN0ZFlkWUdmc2hxZVIxamtESS9FL0FPOHJZUmx3WEJxdUFBQUFBRWxGVGtTdVFtQ0MpIDUwJSA1MCUgbm8tcmVwZWF0LCMwMDA7Ym94LXNoYWRvdzojZmZmIDAsIzAwMCAxMDAlfSNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnV0dG9uLW1lbnUtdW5kbywjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS11bmRve2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQXdBQUFBTENBWUFBQUJMY0d4ZkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFZVkpSRUZVZU5wY2tEMUlXMUVZaHA5ejdybTNvcWtoeloveEQ2dFIxRXBGS2VsZ2hsQm9uVndLRHBhV0RuYnEybFZGME1IQlViZENwNWFDVWlnZG5JU2dvVVBBcVdNbFlzR2xOdFlLMVpoenpyMWRWRzd6YnQvTDk3eDg3eWNlVHowbHJIS3ArQkpZQkhxdXJHL0FmQzVmK0F3Z3drQzVWSHlieXJUUGR2ZG1BOWYxQkVKUU8vL0xZV1dmaytPZlM3bDhZZUVHS0plS3I3TkQ5OWFUNlF6V21IUGdFK0FBTTQ3cmNuUjR3SS9LL3FTOFRzOTBkcStsTWgxWVkxYUJGdUFGOEF5UVZ1dk5ycnQ5eE9LSmp5SWF1L01PR0pwNDlPUmhyWFpoOXI3dWJnUFBjL25DcjNBMzZUakc5MzFIRFkrT1R5alA2dzhBS1IwMU12YWdjRnF0eG9IL2dMUFQzd2V4UkRLcklyZGJkNlRqOUFzaGNEMFBRYVRhM0JJNW9VRmExM3NJQWlUd3lyZDJ3V3FOcVYvdUFSM0FjY09yUHlSU2JVclg2My9VbGJmayszNEZ4SmR5cWRnRUxBTzNnRGd3UFRCeS8zcHZSb1dDM2dNa1VtM3BTRFQ2UmtxSmNsM2l5WFFRV0lzMVpnWFlVbzIzOWc0TTFzS3oxZm83TUFkc0FQd2JBTDloZnR2VGxOa2RBQUFBQUVsRlRrU3VRbUNDKSAyMCUgNTAlIG5vLXJlcGVhdCwjMWExZDFmO3BhZGRpbmc6MCA2cHggMXB4IDA7d2lkdGg6MzhweDt2ZXJ0aWNhbC1hbGlnbjp0b3A7dGV4dC1hbGlnbjplbmR9I2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idXR0b24tbWVudS11bmRvOmhvdmVyLCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LXVuZG86aG92ZXJ7YmFja2dyb3VuZDp1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBd0FBQUFMQ0FZQUFBQkxjR3hmQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQVlWSlJFRlVlTnBja0QxSVcxRVlocDl6N3JtM29xa2h6Wi94RDZ0UjFFcEZLZWxnaGxCb25Wd0tEcGFXRG5icTJsVkYwTUhCVWJkQ3A1YUNVaWdkbklTZ29VUEFxV01sWXNHbE50WUsxWmh6enIxZFZHN3pidC9MOTd4ODd5Y2VUejBsckhLcCtCSllCSHF1ckcvQWZDNWYrQXdnd2tDNVZIeWJ5clRQZHZkbUE5ZjFCRUpRTy8vTFlXV2ZrK09mUzdsOFllRUdLSmVLcjdORDk5YVQ2UXpXbUhQZ0UrQUFNNDdyY25SNHdJL0svcVM4VHM5MGRxK2xNaDFZWTFhQkZ1QUY4QXlRVnV2TnJydDl4T0tKanlJYXUvTU9HSnA0OU9SaHJYWmg5cjd1YmdQUGMvbkNyM0EzNlRqRzkzMUhEWStPVHlqUDZ3OEFLUjAxTXZhZ2NGcXR4b0gvZ0xQVDN3ZXhSREtySXJkYmQ2VGo5QXNoY0QwUFFhVGEzQkk1b1VGYTEzc0lBaVR3eXJkMndXcU5xVi91QVIzQWNjT3JQeVJTYlVyWDYzL1VsYmZrKzM0RnhKZHlxZGdFTEFPM2dEZ3dQVEJ5LzNwdlJvV0MzZ01rVW0zcFNEVDZSa3FKY2wzaXlYUVFXSXMxWmdYWVVvMjM5ZzRNMXNLejFmbzdNQWRzQVB3YkFMOWhmdHZUbE5rZEFBQUFBRWxGVGtTdVFtQ0MpIDIwJSA1MCUgbm8tcmVwZWF0LCMwMDA7Ym94LXNoYWRvdzojZmZmIDAsIzAwMCAxMDAlfSNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnV0dG9uLW1lbnUtbG9hZCwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS1sb2Fke21hcmdpbi1yaWdodDoycHh9I2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idXR0b24tbWVudS1sb2FkLCNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnV0dG9uLW1lbnUtc2F2ZSwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS1sb2FkLCNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLmJ1dHRvbi1tZW51LXNhdmV7YmFja2dyb3VuZDojMWExZDFmO2ZvbnQtc2l6ZTo5cHghaW1wb3J0YW50fSNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnV0dG9uLW1lbnUtbG9hZDpob3ZlciwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ1dHRvbi1tZW51LXNhdmU6aG92ZXIsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtbG9hZDpob3ZlciwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS1zYXZlOmhvdmVye2JhY2tncm91bmQ6IzAwMH0jY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLndyYXB7ZGlzcGxheTpub25lfSNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmV7d2lkdGg6MTAwJTtmbG9hdDpsZWZ0fSNjb250cm9sS2l0IC5wYW5lbCAubWVudS1hY3RpdmUgLndyYXB7ZGlzcGxheTppbmxpbmV9I2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtY2xvc2UsI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LWFjdGl2ZSAuYnV0dG9uLW1lbnUtaGlkZSwjY29udHJvbEtpdCAucGFuZWwgLm1lbnUtYWN0aXZlIC5idXR0b24tbWVudS1zaG93e2Zsb2F0OnJpZ2h0fSNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3ctcy1tYXh7YmFja2dyb3VuZDp1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFGQ0FZQUFBQjRrYTFWQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQUc1SlJFRlVlTnBpNU9EaWFtUmdZS2hqd0E0YW1WeDhneGptTDFyQzhQM3JWeFE4YitFU0JoZmZJQVptTlIyOUE1ZXZYV2RpWkdDMDE5WFNaR0JnWUdCWXZtWTl3N0kxNnhvWkdCZ2FXS0JHMVM5YnMrNC9Bd05EUFFNREExeVNnWUdCZ2RFblBBYlp6Z1kwbWdFd0FFOWxKVDFscnNmZkFBQUFBRWxGVGtTdVFtQ0MpIGNlbnRlciBuby1yZXBlYXR9I2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvdy1zLW1pbntiYWNrZ3JvdW5kOnVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBRnBKUkVGVWVOcHNpaUVPZ0RBTVJmOFN4Tkp6SVlmQjFQUWtRN1JrWmNmQllMbmJVQXNMNGNuM1hrZ3M2TnpYcVFBd0wrdmUzVFRHTFdjRGdLUFdkMG9zaUVSYTNGdW51TGRJcElrRmlFUTJ4dThVRW9zQlVQeGp6d0FUU2pWLzhxbE1HQUFBQUFCSlJVNUVya0pnZ2c9PSkgY2VudGVyIG5vLXJlcGVhdH0jY29udHJvbEtpdCAucGFuZWwgLmFycm93LXMtbWF4LCNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3ctcy1taW57d2lkdGg6MTAwJTtoZWlnaHQ6MjBweH0jY29udHJvbEtpdCAucGFuZWwgLmFycm93LWItbWF4e2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBRkNBWUFBQUI0a2ExVkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFESkpSRUZVZU5wc3lzRU5BQ0FNQXpFMjkramhBeEtsUFNtdmVLMmFzekVJTWlISTdVZmxiQ2hKZngrM0FRQUEvLzhEQVBMa1NhbUhhc3R4QUFBQUFFbEZUa1N1UW1DQykgY2VudGVyIG5vLXJlcGVhdH0jY29udHJvbEtpdCAucGFuZWwgLmFycm93LWItbWlue2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBRkNBWUFBQUI0a2ExVkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFDOUpSRUZVZU5xRWpERU9BQ0FRZ3hoOE9EL0gyUmhQa2s0MEFBajBtS3ZpUzJVM1RpZW4waUUzQUFBQS8vOERBRWQxTnRJQ1Y0RXVBQUFBQUVsRlRrU3VRbUNDKSBjZW50ZXIgbm8tcmVwZWF0fSNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3ctYi1zdWItbWF4e2JhY2tncm91bmQ6dXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQW9BQUFBR0NBWUFBQUQ2OEEvR0FBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFHSkpSRUZVZU5waTlBbVBZVUFHZXphdnEyZGdZR0J3OFExcVJCWm5RVmRrYWUvY0FHV2pLR1pXMDlGRFVXVHA0TUlncTZERXdNREE0SEJvMXpZR0pYWE5nM0NGeUlwZ0FGMHg4NlA3ZHhyUUZXRlR6T2dUSHRQQXdNQlF6NEFmTkFBR0FOMUNLUHM0TkRMdkFBQUFBRWxGVGtTdVFtQ0MpIGNlbnRlciBuby1yZXBlYXR9I2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvdy1iLXN1Yi1taW57YmFja2dyb3VuZDp1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBb0FBQUFHQ0FZQUFBRDY4QS9HQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQUc5SlJFRlVlTnA4enJFT1FEQUFoT0cvR0VTWUJidEp2QUtEMWVLQlJOK3NMMU5ONTdhN2lTRGlwa3Z1RzA2a1dTYUJsZi9JWkpvWHlxcWhyT3BQWWMyT05acTQ3WG9Wdkl0QURIbFJmQ0VKYkhIYjlRQXFlQ2RBakNlK0k0QVRQbkR3N29FQWt0ZWx6UnA5OWZ0d0RBQ2ZzUzBYQWJ6NFB3QUFBQUJKUlU1RXJrSmdnZz09KSBjZW50ZXIgbm8tcmVwZWF0fSNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3ctYi1tYXgsI2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvdy1iLW1pbiwjY29udHJvbEtpdCAucGFuZWwgLmFycm93LWItc3ViLW1heCwjY29udHJvbEtpdCAucGFuZWwgLmFycm93LWItc3ViLW1pbnt3aWR0aDoxMHB4O2hlaWdodDoxMDAlO2Zsb2F0OnJpZ2h0fSNjb250cm9sS2l0IC5waWNrZXJ7cG9pbnRlci1ldmVudHM6YXV0bzstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym9yZGVyLXJhZGl1czozcHg7LW1vei1ib3JkZXItcmFkaXVzOjNweDtiYWNrZ3JvdW5kLWNvbG9yOiMzYjNiM2I7Zm9udC1mYW1pbHk6QXJpYWwsc2Fucy1zZXJpZjtmb250LXNpemU6MTFweDtjb2xvcjojZmZmO3RleHQtc2hhZG93OjFweCAxcHggIzAwMDtvdmVyZmxvdzpoaWRkZW47cG9zaXRpb246YWJzb2x1dGU7ei1pbmRleDoyMTQ3NDgzNjMxO3dpZHRoOjM2MHB4Oy13ZWJraXQtdG91Y2gtY2FsbG91dDpub25lOy13ZWJraXQtdXNlci1zZWxlY3Q6bm9uZTsta2h0bWwtdXNlci1zZWxlY3Q6bm9uZTstbW96LXVzZXItc2VsZWN0Om5vbmU7LW1zLXVzZXItc2VsZWN0Om5vbmU7dXNlci1zZWxlY3Q6bm9uZTtib3gtc2hhZG93OjAgMnB4IDJweCByZ2JhKDAsMCwwLC4yNSl9I2NvbnRyb2xLaXQgLnBpY2tlciBjYW52YXN7dmVydGljYWwtYWxpZ246Ym90dG9tO2N1cnNvcjpwb2ludGVyfSNjb250cm9sS2l0IC5waWNrZXIgLndyYXB7LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O3BhZGRpbmc6MTBweDtmbG9hdDpsZWZ0fSNjb250cm9sS2l0IC5waWNrZXIgLmZpZWxkLXdyYXB7cGFkZGluZzozcHh9I2NvbnRyb2xLaXQgLnBpY2tlciAuc2xpZGVyLXdyYXB7cGFkZGluZzozcHggMTNweCAzcHggM3B4fSNjb250cm9sS2l0IC5waWNrZXIgLmZpZWxkLXdyYXAsI2NvbnRyb2xLaXQgLnBpY2tlciAuaW5wdXQtd3JhcCwjY29udHJvbEtpdCAucGlja2VyIC5zbGlkZXItd3JhcHtoZWlnaHQ6YXV0bztvdmVyZmxvdzpoaWRkZW47ZmxvYXQ6bGVmdH0jY29udHJvbEtpdCAucGlja2VyIC5pbnB1dC13cmFwey13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveDtib3JkZXI6MXB4IHNvbGlkICMyNDI0MjQ7Ym9yZGVyLXJhZGl1czoycHg7LW1vei1ib3JkZXItcmFkaXVzOjJweDt3aWR0aDoxNDBweDtmbG9hdDpyaWdodDtwYWRkaW5nOjVweCAxMHB4IDFweCAwfSNjb250cm9sS2l0IC5waWNrZXIgLmlucHV0LWZpZWxke3dpZHRoOjUwJTtmbG9hdDpyaWdodDttYXJnaW4tYm90dG9tOjRweH0jY29udHJvbEtpdCAucGlja2VyIC5pbnB1dC1maWVsZCAubGFiZWx7cGFkZGluZzo4cHggMCAwO2NvbG9yOiM4Nzg3ODc7dGV4dC1hbGlnbjpjZW50ZXI7dGV4dC10cmFuc2Zvcm06dXBwZXJjYXNlO2ZvbnQtd2VpZ2h0OjcwMDt0ZXh0LXNoYWRvdzoxcHggMXB4ICMxYTFhMWE7d2lkdGg6NDAlfSNjb250cm9sS2l0IC5waWNrZXIgLmlucHV0LWZpZWxkIC53cmFwe3BhZGRpbmc6MDt3aWR0aDo2MCU7aGVpZ2h0OmF1dG87ZmxvYXQ6cmlnaHR9I2NvbnRyb2xLaXQgLnBpY2tlciAuY29udHJvbHMtd3JhcHstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7d2lkdGg6MTAwJTtoZWlnaHQ6YXV0bztmbG9hdDpyaWdodDtwYWRkaW5nOjlweCAwIDB9I2NvbnRyb2xLaXQgLnBpY2tlciAuY29udHJvbHMtd3JhcCBpbnB1dFt0eXBlPWJ1dHRvbl17ZmxvYXQ6cmlnaHQ7d2lkdGg6NjVweDttYXJnaW46MCAwIDAgMTBweH0jY29udHJvbEtpdCAucGlja2VyIC5jb2xvci1jb250cmFzdHstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDtib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym9yZGVyOm5vbmU7Ym94LXNoYWRvdzowIDAgMCAxcHggIzFmMWYxZiBpbnNldDtib3JkZXItcmFkaXVzOjJweDstbW96LWJvcmRlci1yYWRpdXM6MnB4O2hlaWdodDoyNXB4O3BhZGRpbmc6M3B4O3dpZHRoOjgwJTttYXJnaW4tYm90dG9tOjRweDtmbG9hdDpyaWdodH0jY29udHJvbEtpdCAucGlja2VyIC5jb2xvci1jb250cmFzdCBkaXZ7d2lkdGg6NTAlO2hlaWdodDoxMDAlO2Zsb2F0OmxlZnR9I2NvbnRyb2xLaXQgLnBpY2tlciBpbnB1dFt0eXBlPXRleHRde3BhZGRpbmc6MDt0ZXh0LWFsaWduOmNlbnRlcjt3aWR0aDo2MCU7ZmxvYXQ6cmlnaHR9I2NvbnRyb2xLaXQgLnBpY2tlciAud3JhcCAuaW5wdXQtd3JhcDpudGgtb2YtdHlwZSgzKXtib3JkZXItYm90dG9tLWxlZnQtcmFkaXVzOjA7Ym9yZGVyLWJvdHRvbS1yaWdodC1yYWRpdXM6MH0jY29udHJvbEtpdCAucGlja2VyIC53cmFwIC5pbnB1dC13cmFwOm50aC1vZi10eXBlKDQpe2JvcmRlci10b3A6bm9uZTtib3JkZXItdG9wLWxlZnQtcmFkaXVzOjA7Ym9yZGVyLXRvcC1yaWdodC1yYWRpdXM6MH0jY29udHJvbEtpdCAucGlja2VyIC53cmFwIC5pbnB1dC13cmFwOm50aC1vZi10eXBlKDQpIC5pbnB1dC1maWVsZHt3aWR0aDoxMDAlfSNjb250cm9sS2l0IC5waWNrZXIgLndyYXAgLmlucHV0LXdyYXA6bnRoLW9mLXR5cGUoNCkgLmlucHV0LWZpZWxkIC5sYWJlbHt3aWR0aDoyMCV9I2NvbnRyb2xLaXQgLnBpY2tlciAud3JhcCAuaW5wdXQtd3JhcDpudGgtb2YtdHlwZSg0KSBpbnB1dFt0eXBlPXRleHRde3dpZHRoOjgwJX0jY29udHJvbEtpdCAucGlja2VyIC5maWVsZC13cmFwLCNjb250cm9sS2l0IC5waWNrZXIgLnNsaWRlci13cmFwe2JhY2tncm91bmQ6IzFlMjIyNDtib3JkZXI6bm9uZTtib3gtc2hhZG93OjAgMCAwIDFweCAjMWYxZjFmIGluc2V0O2JvcmRlci1yYWRpdXM6MnB4Oy1tb3otYm9yZGVyLXJhZGl1czoycHg7cG9zaXRpb246cmVsYXRpdmU7bWFyZ2luLXJpZ2h0OjVweH0jY29udHJvbEtpdCAucGlja2VyIC5maWVsZC13cmFwIC5pbmRpY2F0b3IsI2NvbnRyb2xLaXQgLnBpY2tlciAuc2xpZGVyLXdyYXAgLmluZGljYXRvcntwb3NpdGlvbjphYnNvbHV0ZTtib3JkZXI6MnB4IHNvbGlkICNmZmY7Ym94LXNoYWRvdzowIDFweCBibGFjaywwIDFweCAjMDAwIGluc2V0O2N1cnNvcjpwb2ludGVyfSNjb250cm9sS2l0IC5waWNrZXIgLmZpZWxkLXdyYXAgLmluZGljYXRvcnt3aWR0aDo4cHg7aGVpZ2h0OjhweDtsZWZ0OjUwJTt0b3A6NTAlO2JvcmRlci1yYWRpdXM6NTAlOy1tb3otYm9yZGVyLXJhZGl1czo1MCV9I2NvbnRyb2xLaXQgLnBpY2tlciAuc2xpZGVyLXdyYXAgLmluZGljYXRvcnt3aWR0aDoxNHB4O2hlaWdodDozcHg7Ym9yZGVyLXJhZGl1czo4cHg7LW1vei1ib3JkZXItcmFkaXVzOjhweDtsZWZ0OjFweDt0b3A6MXB4fSNjb250cm9sS2l0IC5waWNrZXIgLnNsaWRlci13cmFwIC5pbmRpY2F0b3I6YWZ0ZXJ7Y29udGVudDonJzt3aWR0aDowO2hlaWdodDowO2JvcmRlci10b3A6NC41cHggc29saWQgdHJhbnNwYXJlbnQ7Ym9yZGVyLWJvdHRvbTo0LjVweCBzb2xpZCB0cmFuc3BhcmVudDtib3JkZXItcmlnaHQ6NHB4IHNvbGlkICNmZmY7ZmxvYXQ6cmlnaHQ7cG9zaXRpb246YWJzb2x1dGU7dG9wOi0ycHg7bGVmdDoxOXB4fSNjb250cm9sS2l0IC5waWNrZXIgLnNsaWRlci13cmFwIC5pbmRpY2F0b3I6YmVmb3Jle2NvbnRlbnQ6Jyc7d2lkdGg6MDtoZWlnaHQ6MDtib3JkZXItdG9wOjQuNXB4IHNvbGlkIHRyYW5zcGFyZW50O2JvcmRlci1ib3R0b206NC41cHggc29saWQgdHJhbnNwYXJlbnQ7Ym9yZGVyLXJpZ2h0OjRweCBzb2xpZCAjMDAwO2Zsb2F0OnJpZ2h0O3Bvc2l0aW9uOmFic29sdXRlO3RvcDotM3B4O2xlZnQ6MTlweH1cIiB9OyBtb2R1bGUuZXhwb3J0cyA9IFN0eWxlOyIsImZ1bmN0aW9uIEV2ZW50XyhzZW5kZXIsdHlwZSxkYXRhKSB7XG4gICAgdGhpcy5zZW5kZXIgPSBzZW5kZXI7XG4gICAgdGhpcy50eXBlICAgPSB0eXBlO1xuICAgIHRoaXMuZGF0YSAgID0gZGF0YTtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRfOyIsImZ1bmN0aW9uIEV2ZW50RGlzcGF0Y2hlcigpIHtcbiAgICB0aGlzLl9saXN0ZW5lcnMgPSBbXTtcbn07XG5cbkV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUgPSB7XG4gICAgYWRkRXZlbnRMaXN0ZW5lcjogZnVuY3Rpb24gKGV2ZW50VHlwZSwgbGlzdGVuZXIsIGNhbGxiYWNrTWV0aG9kKSB7XG4gICAgICAgIHRoaXMuX2xpc3RlbmVyc1tldmVudFR5cGVdID0gdGhpcy5fbGlzdGVuZXJzW2V2ZW50VHlwZV0gfHwgW107XG4gICAgICAgIHRoaXMuX2xpc3RlbmVyc1tldmVudFR5cGVdLnB1c2goe29iajogbGlzdGVuZXIsIG1ldGhvZDogY2FsbGJhY2tNZXRob2R9KTtcbiAgICB9LFxuXG4gICAgZGlzcGF0Y2hFdmVudDogZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIHZhciB0eXBlID0gZXZlbnQudHlwZTtcblxuICAgICAgICBpZiAoIXRoaXMuaGFzRXZlbnRMaXN0ZW5lcih0eXBlKSl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy5fbGlzdGVuZXJzW3R5cGVdO1xuICAgICAgICB2YXIgaSA9IC0xLCBsID0gbGlzdGVuZXJzLmxlbmd0aDtcblxuICAgICAgICB2YXIgb2JqLCBtZXRob2Q7XG5cbiAgICAgICAgd2hpbGUgKCsraSA8IGwpIHtcbiAgICAgICAgICAgIG9iaiA9IGxpc3RlbmVyc1tpXS5vYmo7XG4gICAgICAgICAgICBtZXRob2QgPSBsaXN0ZW5lcnNbaV0ubWV0aG9kO1xuXG4gICAgICAgICAgICBpZiAoIW9ialttZXRob2RdKXtcbiAgICAgICAgICAgICAgICB0aHJvdyBvYmogKyAnIGhhcyBubyBtZXRob2QgJyArIG1ldGhvZDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgb2JqW21ldGhvZF0oZXZlbnQpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHJlbW92ZUV2ZW50TGlzdGVuZXI6IGZ1bmN0aW9uICh0eXBlLCBvYmosIG1ldGhvZCkge1xuICAgICAgICBpZiAoIXRoaXMuaGFzRXZlbnRMaXN0ZW5lcih0eXBlKSl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy5fbGlzdGVuZXJzW3R5cGVdO1xuXG4gICAgICAgIHZhciBpID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICAgICAgd2hpbGUgKC0taSA+IC0xKSB7XG4gICAgICAgICAgICBpZiAobGlzdGVuZXJzW2ldLm9iaiA9PSBvYmogJiYgbGlzdGVuZXJzW2ldLm1ldGhvZCA9PSBtZXRob2QpIHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lcnMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgIGlmIChsaXN0ZW5lcnMubGVuZ3RoID09IDApe1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5fbGlzdGVuZXJzW3R5cGVdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICByZW1vdmVBbGxFdmVudExpc3RlbmVyczogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9saXN0ZW5lcnMgPSBbXTtcbiAgICB9LFxuXG4gICAgaGFzRXZlbnRMaXN0ZW5lcjogZnVuY3Rpb24gKHR5cGUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2xpc3RlbmVyc1t0eXBlXSAhPSB1bmRlZmluZWQgJiYgdGhpcy5fbGlzdGVuZXJzW3R5cGVdICE9IG51bGw7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBFdmVudERpc3BhdGNoZXI7IiwidmFyIExheW91dE1vZGUgPSB7XG4gICAgTEVGVCAgIDogJ2xlZnQnLFxuICAgIFJJR0hUICA6ICdyaWdodCcsXG4gICAgVE9QICAgIDogJ3RvcCcsXG4gICAgQk9UVE9NIDogJ2JvdHRvbScsXG4gICAgTk9ORSAgIDogJ25vbmUnXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IExheW91dE1vZGU7IiwidmFyIE5vZGUgICA9IHJlcXVpcmUoJy4uL2RvY3VtZW50L05vZGUnKTtcbnZhciBNZXRyaWMgPSByZXF1aXJlKCcuLi8uLi9jb21wb25lbnQvTWV0cmljJyk7XG52YXIgQ1NTICAgID0gcmVxdWlyZSgnLi4vZG9jdW1lbnQvQ1NTJyk7XG52YXIgRG9jdW1lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcbiAgICBOb2RlRXZlbnQgICAgID0gcmVxdWlyZSgnLi4vZG9jdW1lbnQvTm9kZUV2ZW50Jyk7XG52YXIgTW91c2UgID0gcmVxdWlyZSgnLi4vZG9jdW1lbnQvTW91c2UnKTtcblxuZnVuY3Rpb24gU2Nyb2xsQmFyKHBhcmVudE5vZGUsdGFyZ2V0Tm9kZSx3cmFwSGVpZ2h0KSB7XG4gICAgdGhpcy5fcGFyZW50Tm9kZSA9IHBhcmVudE5vZGU7XG4gICAgdGhpcy5fdGFyZ2V0Tm9kZSA9IHRhcmdldE5vZGU7XG4gICAgdGhpcy5fd3JhcEhlaWdodCA9IHdyYXBIZWlnaHQ7XG5cbiAgICB2YXIgd3JhcCAgID0gdGhpcy5fd3JhcE5vZGUgICA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuU2Nyb2xsV3JhcCksXG4gICAgICAgIG5vZGUgICA9IHRoaXMuX25vZGUgICAgICAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlNjcm9sbEJhciksXG4gICAgICAgIHRyYWNrICA9IHRoaXMuX3RyYWNrTm9kZSAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlNjcm9sbEJhclRyYWNrKSxcbiAgICAgICAgdGh1bWIgID0gdGhpcy5fdGh1bWJOb2RlICA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuU2Nyb2xsQmFyVGh1bWIpO1xuXG4gICAgcGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0YXJnZXROb2RlKTtcbiAgICBwYXJlbnROb2RlLmFkZENoaWxkKHdyYXApO1xuICAgIHBhcmVudE5vZGUuYWRkQ2hpbGRBdChub2RlLDApO1xuXG4gICAgd3JhcC5hZGRDaGlsZCh0YXJnZXROb2RlKTtcbiAgICBub2RlLmFkZENoaWxkKHRyYWNrKTtcbiAgICB0cmFjay5hZGRDaGlsZCh0aHVtYik7XG5cbiAgICB0aGlzLl9tb3VzZVRodW1iT2Zmc2V0ID0gMDtcbiAgICB0aGlzLl9zY3JvbGxIZWlnaHQgPSAwO1xuICAgIHRoaXMuX3Njcm9sbFVuaXQgICA9IDA7XG4gICAgdGhpcy5fc2Nyb2xsTWluICAgID0gMDtcbiAgICB0aGlzLl9zY3JvbGxNYXggICAgPSAwO1xuXG4gICAgdGh1bWIuc2V0UG9zaXRpb25ZKE1ldHJpYy5TQ1JPTExCQVJfVFJBQ0tfUEFERElORyk7XG4gICAgdGh1bWIuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX0RPV04sdGhpcy5fb25UaHVtYkRyYWdTdGFydC5iaW5kKHRoaXMpKTtcblxuICAgIHRoaXMuX2lzVmFsaWQgID0gZmFsc2U7XG4gICAgdGhpcy5fZW5hYmxlZCA9IGZhbHNlO1xuXG4gICAgdmFyIG5vZGVFbGVtZW50ID0gbm9kZS5nZXRFbGVtZW50KCksXG4gICAgICAgIHRodW1iRWxlbWVudCA9IHRodW1iLmdldEVsZW1lbnQoKTtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5fb25Nb3VzZVdoZWVsID0gZnVuY3Rpb24oZSl7XG4gICAgICAgIHZhciBzZW5kZXIgPSBlLnNlbmRlcixcbiAgICAgICAgICAgIGhvdmVyRWxlbWVudCA9IHNlbmRlci5nZXRIb3ZlckVsZW1lbnQoKTtcbiAgICAgICAgaWYoaG92ZXJFbGVtZW50ICE9IG5vZGVFbGVtZW50ICYmIGhvdmVyRWxlbWVudCAhPSB0aHVtYkVsZW1lbnQpe1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzY3JvbGxTdGVwID0gc2VsZi5fc2Nyb2xsSGVpZ2h0ICogMC4wMTI1O1xuICAgICAgICBzZWxmLl9zY3JvbGwodGh1bWIuZ2V0UG9zaXRpb25ZKCkgKyBzZW5kZXIuZ2V0V2hlZWxEaXJlY3Rpb24oKSAqIHNjcm9sbFN0ZXAgKiAtMSk7XG4gICAgICAgIGUuZGF0YS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH07XG5cbiAgICB0aGlzLmFkZE1vdXNlTGlzdGVuZXIoKTtcbn1cblxuU2Nyb2xsQmFyLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpe1xuICAgIHZhciB0YXJnZXQgPSB0aGlzLl90YXJnZXROb2RlLFxuICAgICAgICB0aHVtYiA9IHRoaXMuX3RodW1iTm9kZTtcblxuICAgIHZhciBwYWRkaW5nID0gTWV0cmljLlNDUk9MTEJBUl9UUkFDS19QQURESU5HO1xuXG4gICAgdmFyIHRhcmdldFdyYXBIZWlnaHQgPSB0aGlzLl93cmFwSGVpZ2h0LFxuICAgICAgICB0YXJnZXRIZWlnaHQgPSB0YXJnZXQuZ2V0SGVpZ2h0KCksXG4gICAgICAgIHRyYWNrSGVpZ2h0ID0gdGFyZ2V0V3JhcEhlaWdodCAtIHBhZGRpbmcgKiAyO1xuXG4gICAgdGh1bWIuc2V0SGVpZ2h0KHRyYWNrSGVpZ2h0KTtcblxuICAgIHZhciByYXRpbyA9IHRhcmdldFdyYXBIZWlnaHQgLyB0YXJnZXRIZWlnaHQ7XG5cbiAgICB0aGlzLl9pc1ZhbGlkID0gZmFsc2U7XG5cbiAgICBpZiAocmF0aW8gPiAxLjApe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aHVtYkhlaWdodCA9IHRyYWNrSGVpZ2h0ICogcmF0aW87XG5cbiAgICB0aGlzLl9zY3JvbGxIZWlnaHQgPSB0cmFja0hlaWdodDtcbiAgICB0aGlzLl9zY3JvbGxVbml0ICAgPSB0YXJnZXRIZWlnaHQgLSB0aGlzLl9zY3JvbGxIZWlnaHQgLSBwYWRkaW5nICogMjtcbiAgICB0aGlzLl9zY3JvbGxNaW4gICAgPSBwYWRkaW5nO1xuICAgIHRoaXMuX3Njcm9sbE1heCAgICA9IHBhZGRpbmcgKyB0cmFja0hlaWdodCAtIHRodW1iSGVpZ2h0O1xuXG4gICAgdGh1bWIuc2V0SGVpZ2h0KHRodW1iSGVpZ2h0KTtcblxuICAgIHRoaXMuX2lzVmFsaWQgPSB0cnVlO1xufTtcblxuU2Nyb2xsQmFyLnByb3RvdHlwZS5fc2Nyb2xsID0gZnVuY3Rpb24oeSl7XG4gICAgdmFyIG1pbiAgPSB0aGlzLl9zY3JvbGxNaW4sXG4gICAgICAgIG1heCAgPSB0aGlzLl9zY3JvbGxNYXgsXG4gICAgICAgIHBvcyAgPSBNYXRoLm1heChtaW4sIE1hdGgubWluKHksbWF4KSksXG4gICAgICAgIHBvc18gPSAocG9zLW1pbikvKG1heC1taW4pO1xuXG4gICAgdGhpcy5fdGh1bWJOb2RlLnNldFBvc2l0aW9uWShwb3MpO1xuICAgIHRoaXMuX3RhcmdldE5vZGUuc2V0UG9zaXRpb25ZKHBvc18gKiB0aGlzLl9zY3JvbGxVbml0ICogLTEpO1xufTtcblxuXG5TY3JvbGxCYXIucHJvdG90eXBlLl9vblRodW1iRHJhZ1N0YXJ0ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5faXNWYWxpZCB8fCB0aGlzLl9lbmFibGVkKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgZXZlbnRNb3ZlID0gRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLFxuICAgICAgICBldmVudFVwID0gRG9jdW1lbnRFdmVudC5NT1VTRV9VUDtcblxuICAgIHZhciBtb3VzZSA9IE1vdXNlLmdldCgpO1xuICAgIHZhciB0cmFja09mZnNldCA9IHRoaXMuX3RyYWNrTm9kZS5nZXRQb3NpdGlvbkdsb2JhbFkoKTtcblxuICAgIHRoaXMuX21vdXNlVGh1bWJPZmZzZXQgPSBtb3VzZS5nZXRZKCkgLSB0aGlzLl90aHVtYk5vZGUuZ2V0UG9zaXRpb25HbG9iYWxZKCk7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG9uRHJhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuX3Njcm9sbChtb3VzZS5nZXRZKCkgLSB0cmFja09mZnNldCAtIHNlbGYuX21vdXNlVGh1bWJPZmZzZXQpO1xuICAgICAgICB9LFxuICAgICAgICBvbkRyYWdFbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50VXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xuICAgICAgICB9O1xuXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRVcCwgb25EcmFnRW5kLCBmYWxzZSk7XG4gICAgdGhpcy5fc2Nyb2xsKG1vdXNlLmdldFkoKSAtIHRyYWNrT2Zmc2V0IC0gc2VsZi5fbW91c2VUaHVtYk9mZnNldCk7XG59O1xuXG5cblNjcm9sbEJhci5wcm90b3R5cGUuZW5hYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2VuYWJsZWQgPSBmYWxzZTtcbiAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XG59O1xuXG5TY3JvbGxCYXIucHJvdG90eXBlLmRpc2FibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fZW5hYmxlZCA9IHRydWU7XG4gICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xufTtcblNjcm9sbEJhci5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fc2Nyb2xsKDApO1xufTtcblxuU2Nyb2xsQmFyLnByb3RvdHlwZS5fdXBkYXRlQXBwZWFyYW5jZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5fZW5hYmxlZCkge1xuICAgICAgICB0aGlzLl9ub2RlLnNldFN0eWxlUHJvcGVydHkoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgICAgICB0aGlzLl90YXJnZXROb2RlLnNldFBvc2l0aW9uWSgwKTtcbiAgICAgICAgdGhpcy5fdGh1bWJOb2RlLnNldFBvc2l0aW9uWShNZXRyaWMuU0NST0xMQkFSX1RSQUNLX1BBRERJTkcpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX25vZGUuc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdibG9jaycpO1xuICAgIH1cbn07XG5cblNjcm9sbEJhci5wcm90b3R5cGUuaXNWYWxpZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5faXNWYWxpZDtcbn07XG5cblNjcm9sbEJhci5wcm90b3R5cGUuc2V0V3JhcEhlaWdodCA9IGZ1bmN0aW9uIChoZWlnaHQpIHtcbiAgICB0aGlzLl93cmFwSGVpZ2h0ID0gaGVpZ2h0O1xuICAgIHRoaXMudXBkYXRlKCk7XG59O1xuXG5TY3JvbGxCYXIucHJvdG90eXBlLnJlbW92ZVRhcmdldE5vZGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3dyYXBOb2RlLnJlbW92ZUNoaWxkKHRoaXMuX3RhcmdldE5vZGUpO1xufTtcblxuU2Nyb2xsQmFyLnByb3RvdHlwZS5yZW1vdmVNb3VzZUxpc3RlbmVyID0gZnVuY3Rpb24oKXtcbiAgICBNb3VzZS5nZXQoKS5yZW1vdmVFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfV0hFRUwsdGhpcywnX29uTW91c2VXaGVlbCcpO1xufTtcblxuU2Nyb2xsQmFyLnByb3RvdHlwZS5hZGRNb3VzZUxpc3RlbmVyID0gZnVuY3Rpb24oKXtcbiAgICBNb3VzZS5nZXQoKS5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfV0hFRUwsdGhpcywnX29uTW91c2VXaGVlbCcpO1xufTtcblxuU2Nyb2xsQmFyLnByb3RvdHlwZS5yZW1vdmVGcm9tUGFyZW50ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBwYXJlbnROb2RlID0gdGhpcy5fcGFyZW50Tm9kZSxcbiAgICAgICAgcm9vdE5vZGUgPSB0aGlzLl9ub2RlLFxuICAgICAgICB0YXJnZXROb2RlID0gdGhpcy5fdGFyZ2V0Tm9kZTtcblxuICAgIHJvb3ROb2RlLnJlbW92ZUNoaWxkKHRhcmdldE5vZGUpO1xuICAgIHBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5fd3JhcE5vZGUpO1xuICAgIHBhcmVudE5vZGUucmVtb3ZlQ2hpbGQocm9vdE5vZGUpO1xuXG4gICAgcmV0dXJuIHRhcmdldE5vZGU7XG59O1xuXG5TY3JvbGxCYXIucHJvdG90eXBlLmdldFdyYXBOb2RlID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl93cmFwTm9kZTtcbn07XG5cblNjcm9sbEJhci5wcm90b3R5cGUuZ2V0Tm9kZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fbm9kZTtcbn07XG5cblNjcm9sbEJhci5wcm90b3R5cGUuZ2V0VGFyZ2V0Tm9kZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fdGFyZ2V0Tm9kZTtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBTY3JvbGxCYXI7IiwidmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnREaXNwYXRjaGVyJyk7XG52YXIgTm9kZSAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XG52YXIgU2Nyb2xsQmFyICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9sYXlvdXQvU2Nyb2xsQmFyJyk7XG5cbmZ1bmN0aW9uIEFic3RyYWN0R3JvdXAocGFyZW50LCBwYXJhbXMpIHtcbiAgICBFdmVudERpc3BhdGNoZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgIHBhcmFtcyA9IHBhcmFtcyB8fCB7fTtcbiAgICBwYXJhbXMuaGVpZ2h0ID0gcGFyYW1zLmhlaWdodCB8fCBudWxsO1xuICAgIHBhcmFtcy5lbmFibGUgPSBwYXJhbXMuZW5hYmxlID09PSB1bmRlZmluZWQgPyB0cnVlIDogcGFyYW1zLmVuYWJsZTtcblxuICAgIHRoaXMuX3BhcmVudCA9IHBhcmVudDtcbiAgICB0aGlzLl9oZWlnaHQgPSBwYXJhbXMuaGVpZ2h0O1xuICAgIHRoaXMuX2VuYWJsZWQgPSBwYXJhbXMuZW5hYmxlO1xuICAgIHRoaXMuX3Njcm9sbEJhciA9IG51bGw7XG5cbiAgICB0aGlzLl9ub2RlID0gbmV3IE5vZGUoTm9kZS5MSVNUX0lURU0pO1xuICAgIHRoaXMuX3dyYXBOb2RlID0gbmV3IE5vZGUoKTtcbiAgICB0aGlzLl9saXN0Tm9kZSA9IG5ldyBOb2RlKE5vZGUuTElTVCk7XG5cbiAgICB0aGlzLl9wYXJlbnQuZ2V0TGlzdCgpLmFkZENoaWxkKHRoaXMuX25vZGUpO1xufVxuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUpO1xuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBBYnN0cmFjdEdyb3VwO1xuXG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZS5hZGRTY3JvbGxXcmFwID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB3cmFwTm9kZSA9IHRoaXMuX3dyYXBOb2RlLFxuICAgICAgICBtYXhIZWlnaHQgPSB0aGlzLmdldE1heEhlaWdodCgpO1xuXG4gICAgdGhpcy5fc2Nyb2xsQmFyID0gbmV3IFNjcm9sbEJhcih3cmFwTm9kZSwgdGhpcy5fbGlzdE5vZGUsIG1heEhlaWdodCk7XG4gICAgaWYgKHRoaXMuaXNFbmFibGVkKCkpIHtcbiAgICAgICAgd3JhcE5vZGUuc2V0SGVpZ2h0KG1heEhlaWdodCk7XG4gICAgfVxufTtcblxuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUucHJldmVudFNlbGVjdERyYWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fcGFyZW50LnByZXZlbnRTZWxlY3REcmFnKCk7XG5cbiAgICBpZiAoIXRoaXMuaGFzU2Nyb2xsV3JhcCgpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5fd3JhcE5vZGUuZ2V0RWxlbWVudCgpLnNjcm9sbFRvcCA9IDA7XG59O1xuXG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZS5oYXNNYXhIZWlnaHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2hlaWdodCAhPSBudWxsO1xufTtcblxuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUuZ2V0TWF4SGVpZ2h0ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9oZWlnaHQ7XG59O1xuXG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZS5oYXNTY3JvbGxXcmFwID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9zY3JvbGxCYXIgIT0gbnVsbDtcbn07XG5cbkFic3RyYWN0R3JvdXAucHJvdG90eXBlLmhhc0xhYmVsID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9sYWJsTm9kZSAhPSBudWxsO1xufTtcblxuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUuZGlzYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9lbmFibGVkID0gZmFsc2U7XG4gICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xufTtcblxuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUuZW5hYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2VuYWJsZWQgPSB0cnVlO1xuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbn07XG5cbkFic3RyYWN0R3JvdXAucHJvdG90eXBlLmlzRGlzYWJsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICF0aGlzLl9lbmFibGVkO1xufTtcblxuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUuaXNFbmFibGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9lbmFibGVkO1xufTtcblxuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUuZ2V0TGlzdCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fbGlzdE5vZGU7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFic3RyYWN0R3JvdXA7XG5cbiIsInZhciBBYnN0cmFjdEdyb3VwID0gcmVxdWlyZSgnLi9BYnN0cmFjdEdyb3VwJyk7XG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcbnZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XG5cbnZhciBTdWJHcm91cCA9IHJlcXVpcmUoJy4vU3ViR3JvdXAnKTtcblxudmFyIEV2ZW50XyA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcbiAgICBEb2N1bWVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXG4gICAgTm9kZUV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKSxcbiAgICBQYW5lbEV2ZW50ID0gcmVxdWlyZSgnLi9QYW5lbEV2ZW50JyksXG4gICAgR3JvdXBFdmVudCA9IHJlcXVpcmUoJy4vR3JvdXBFdmVudCcpO1xuXG52YXIgT2JqZWN0Q29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY29yZS9PYmplY3RDb21wb25lbnQnKSxcbiAgICBWYWx1ZVBsb3R0ZXIgICAgPSByZXF1aXJlKCcuLi9jb21wb25lbnQvVmFsdWVQbG90dGVyJyksXG4gICAgRnVuY3Rpb25QbG90dGVyID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L0Z1bmN0aW9uUGxvdHRlcicpO1xuXG5mdW5jdGlvbiBHcm91cChwYXJlbnQscGFyYW1zKSB7XG4gICAgcGFyYW1zICAgICAgICAgICA9IHBhcmFtcyB8fCB7fTtcbiAgICBwYXJhbXMubGFiZWwgICAgID0gcGFyYW1zLmxhYmVsICAgICB8fCBudWxsO1xuICAgIHBhcmFtcy51c2VMYWJlbHMgPSBwYXJhbXMudXNlTGFiZWxzIHx8IHRydWU7XG4gICAgcGFyYW1zLmVuYWJsZSAgICA9IHBhcmFtcy5lbmFibGUgICAgID09PSB1bmRlZmluZWQgPyB0cnVlIDogcGFyYW1zLmVuYWJsZTtcblxuICAgIEFic3RyYWN0R3JvdXAuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG4gICAgdGhpcy5fY29tcG9uZW50cyA9IFtdO1xuICAgIHRoaXMuX3N1Ykdyb3VwcyAgPSBbXTtcblxuICAgIHZhciByb290ID0gdGhpcy5fbm9kZSxcbiAgICAgICAgd3JhcCA9IHRoaXMuX3dyYXBOb2RlLFxuICAgICAgICBsaXN0ID0gdGhpcy5fbGlzdE5vZGU7XG5cbiAgICAgICAgcm9vdC5zZXRTdHlsZUNsYXNzKENTUy5Hcm91cCk7XG4gICAgICAgIHdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCk7XG4gICAgICAgIGxpc3Quc2V0U3R5bGVDbGFzcyhDU1MuU3ViR3JvdXBMaXN0KTtcblxuICAgICAgICB3cmFwLmFkZENoaWxkKGxpc3QpO1xuXG4gICAgdmFyIGxhYmVsID0gcGFyYW1zLmxhYmVsO1xuXG4gICAgaWYobGFiZWwpe1xuICAgICAgICB2YXIgaGVhZCAgPSBuZXcgTm9kZSgpLFxuICAgICAgICAgICAgd3JhcF8gPSBuZXcgTm9kZSgpLFxuICAgICAgICAgICAgbGFiZWxfICA9IG5ldyBOb2RlKE5vZGUuU1BBTiksXG4gICAgICAgICAgICBpbmRpY2F0b3IgPSB0aGlzLl9pbmRpTm9kZSA9IG5ldyBOb2RlKCk7XG5cbiAgICAgICAgICAgIGhlYWQuc2V0U3R5bGVDbGFzcyhDU1MuSGVhZCk7XG4gICAgICAgICAgICB3cmFwXy5zZXRTdHlsZUNsYXNzKENTUy5XcmFwKTtcbiAgICAgICAgICAgIGxhYmVsXy5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCk7XG4gICAgICAgICAgICBpbmRpY2F0b3Iuc2V0U3R5bGVDbGFzcyhDU1MuQXJyb3dCTWF4KTtcbiAgICAgICAgICAgIGxhYmVsXy5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJyxsYWJlbCk7XG5cbiAgICAgICAgICAgIGhlYWQuYWRkQ2hpbGQoaW5kaWNhdG9yKTtcbiAgICAgICAgICAgIHdyYXBfLmFkZENoaWxkKGxhYmVsXyk7XG4gICAgICAgICAgICBoZWFkLmFkZENoaWxkKHdyYXBfKTtcbiAgICAgICAgICAgIHJvb3QuYWRkQ2hpbGQoaGVhZCk7XG5cbiAgICAgICAgaGVhZC5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLHRoaXMuX29uSGVhZFRyaWdnZXIuYmluZCh0aGlzKSk7XG4gICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LkdST1VQX0xJU1RfU0laRV9DSEFOR0UscGFyZW50LCdvbkdyb3VwTGlzdFNpemVDaGFuZ2UnKTtcblxuICAgICAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XG4gICAgfVxuXG4gICAgaWYodGhpcy5oYXNNYXhIZWlnaHQoKSl7XG4gICAgICAgIHRoaXMuYWRkU2Nyb2xsV3JhcCgpO1xuICAgIH1cblxuICAgIHJvb3QuYWRkQ2hpbGQod3JhcCk7XG5cbiAgICBpZih0aGlzLmhhc01heEhlaWdodCgpKXtcbiAgICAgICAgaWYoIWxhYmVsKXtcbiAgICAgICAgICAgIHZhciBidWZmZXJUb3AgPSB0aGlzLl9zY3JvbGxCdWZmZXJUb3AgPSBuZXcgTm9kZSgpO1xuICAgICAgICAgICAgICAgIGJ1ZmZlclRvcC5zZXRTdHlsZUNsYXNzKENTUy5TY3JvbGxCdWZmZXIpO1xuXG4gICAgICAgICAgICByb290LmFkZENoaWxkQXQoYnVmZmVyVG9wLDApO1xuICAgICAgICB9XG4gICAgICAgIHZhciBidWZmZXJCb3R0b20gPSB0aGlzLl9zY3JvbGxCdWZmZXJCb3R0b20gPSBuZXcgTm9kZSgpO1xuICAgICAgICAgICAgYnVmZmVyQm90dG9tLnNldFN0eWxlQ2xhc3MoQ1NTLlNjcm9sbEJ1ZmZlcik7XG5cbiAgICAgICAgcm9vdC5hZGRDaGlsZChidWZmZXJCb3R0b20pO1xuICAgIH1cblxuICAgIHBhcmVudCA9IHRoaXMuX3BhcmVudDtcblxuICAgIHBhcmVudC5hZGRFdmVudExpc3RlbmVyKFBhbmVsRXZlbnQuUEFORUxfTU9WRV9CRUdJTiwgdGhpcywgJ29uUGFuZWxNb3ZlQmVnaW4nKTtcbiAgICBwYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihQYW5lbEV2ZW50LlBBTkVMX01PVkUsIHRoaXMsICdvblBhbmVsTW92ZScpO1xuICAgIHBhcmVudC5hZGRFdmVudExpc3RlbmVyKFBhbmVsRXZlbnQuUEFORUxfTU9WRV9FTkQsIHRoaXMsICdvblBhbmVsTW92ZUVuZCcpO1xuICAgIHBhcmVudC5hZGRFdmVudExpc3RlbmVyKFBhbmVsRXZlbnQuUEFORUxfSElERSwgdGhpcywgJ29uUGFuZWxIaWRlJyk7XG4gICAgcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoUGFuZWxFdmVudC5QQU5FTF9TSE9XLCB0aGlzLCAnb25QYW5lbFNob3cnKTtcbiAgICBwYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihQYW5lbEV2ZW50LlBBTkVMX1NDUk9MTF9XUkFQX0FEREVELCB0aGlzLCAnb25QYW5lbFNjcm9sbFdyYXBBZGRlZCcpO1xuICAgIHBhcmVudC5hZGRFdmVudExpc3RlbmVyKFBhbmVsRXZlbnQuUEFORUxfU0NST0xMX1dSQVBfUkVNT1ZFRCwgdGhpcywgJ29uUGFuZWxTY3JvbGxXcmFwUmVtb3ZlZCcpO1xuICAgIHBhcmVudC5hZGRFdmVudExpc3RlbmVyKFBhbmVsRXZlbnQuUEFORUxfU0laRV9DSEFOR0UsIHRoaXMsICdvblBhbmVsU2l6ZUNoYW5nZScpO1xuICAgIHBhcmVudC5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuV0lORE9XX1JFU0laRSwgdGhpcywgJ29uV2luZG93UmVzaXplJyk7XG5cbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSxwYXJlbnQsJ29uR3JvdXBMaXN0U2l6ZUNoYW5nZScpO1xufVxuR3JvdXAucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShBYnN0cmFjdEdyb3VwLnByb3RvdHlwZSk7XG5Hcm91cC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBHcm91cDtcblxuR3JvdXAucHJvdG90eXBlLm9uUGFuZWxNb3ZlQmVnaW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgUGFuZWxFdmVudC5QQU5FTF9NT1ZFX0JFR0lOLCBudWxsKSk7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUub25QYW5lbE1vdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgUGFuZWxFdmVudC5QQU5FTF9NT1ZFLCBudWxsKSk7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUub25QYW5lbE1vdmVFbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgUGFuZWxFdmVudC5QQU5FTF9NT1ZFX0VORCwgbnVsbCkpO1xufTtcblxuR3JvdXAucHJvdG90eXBlLm9uUGFuZWxTY3JvbGxXcmFwQWRkZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSwgbnVsbCkpO1xufTtcblxuR3JvdXAucHJvdG90eXBlLm9uUGFuZWxTY3JvbGxXcmFwUmVtb3ZlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBHcm91cEV2ZW50LkdST1VQX1NJWkVfQ0hBTkdFLCBudWxsKSk7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUub25QYW5lbEhpZGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgR3JvdXBFdmVudC5TVUJHUk9VUF9ESVNBQkxFLCBudWxsKSk7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUub25QYW5lbFNob3cgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgR3JvdXBFdmVudC5TVUJHUk9VUF9FTkFCTEUsIG51bGwpKTtcbn07XG5cbkdyb3VwLnByb3RvdHlwZS5vblBhbmVsU2l6ZUNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBHcm91cEV2ZW50LkdST1VQX1NJWkVfQ0hBTkdFLCBudWxsKSk7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUub25XaW5kb3dSZXNpemUgPSBmdW5jdGlvbiAoZSkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChlKTtcbn07XG5cbkdyb3VwLnByb3RvdHlwZS5vblN1Ykdyb3VwVHJpZ2dlciA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl91cGRhdGVIZWlnaHQoKTtcblxuICAgIGlmKCF0aGlzLmhhc01heEhlaWdodCgpKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgc2Nyb2xsQmFyID0gdGhpcy5fc2Nyb2xsQmFyLFxuICAgICAgICB3cmFwICA9IHRoaXMuX3dyYXBOb2RlO1xuICAgIHZhciBidWZmZXJUb3AgICAgPSB0aGlzLl9zY3JvbGxCdWZmZXJUb3AsXG4gICAgICAgIGJ1ZmZlckJvdHRvbSA9IHRoaXMuX3Njcm9sbEJ1ZmZlckJvdHRvbTtcblxuICAgIHNjcm9sbEJhci51cGRhdGUoKTtcblxuICAgIGlmICghc2Nyb2xsQmFyLmlzVmFsaWQoKSkge1xuICAgICAgICBzY3JvbGxCYXIuZGlzYWJsZSgpO1xuICAgICAgICB3cmFwLnNldEhlaWdodCh3cmFwLmdldENoaWxkQXQoMSkuZ2V0SGVpZ2h0KCkpO1xuICAgICAgICBpZiAoYnVmZmVyVG9wKXtcbiAgICAgICAgICAgIGJ1ZmZlclRvcC5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYnVmZmVyQm90dG9tKXtcbiAgICAgICAgICAgIGJ1ZmZlckJvdHRvbS5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgc2Nyb2xsQmFyLmVuYWJsZSgpO1xuICAgICAgICB3cmFwLnNldEhlaWdodCh0aGlzLmdldE1heEhlaWdodCgpKTtcblxuICAgICAgICBpZiAoYnVmZmVyVG9wKXtcbiAgICAgICAgICAgIGJ1ZmZlclRvcC5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ2Jsb2NrJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGJ1ZmZlckJvdHRvbSl7XG4gICAgICAgICAgICBidWZmZXJCb3R0b20uc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdibG9jaycpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSxudWxsKSk7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUuX29uSGVhZFRyaWdnZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fZW5hYmxlZCA9ICF0aGlzLl9lbmFibGVkO1xuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBHcm91cEV2ZW50LkdST1VQX0xJU1RfU0laRV9DSEFOR0UsIG51bGwpKTtcbn07XG5cbkdyb3VwLnByb3RvdHlwZS5hZGRDb21wb25lbnQgPSBmdW5jdGlvbigpe1xuICAgIHZhciBDbGFzc18gPSBhcmd1bWVudHNbMF07XG4gICAgdmFyIGFyZ3MgICA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgIGFyZ3Muc2hpZnQoKTtcbiAgICAgICAgYXJncy51bnNoaWZ0KHRoaXMuX2dldFN1Ykdyb3VwKCkpO1xuXG4gICAgdmFyIGluc3RhbmNlID0gT2JqZWN0LmNyZWF0ZShDbGFzc18ucHJvdG90eXBlKTtcbiAgICBDbGFzc18uYXBwbHkoaW5zdGFuY2UsYXJncyk7XG5cbiAgICB0aGlzLl9jb21wb25lbnRzLnB1c2goaW5zdGFuY2UpO1xuICAgIHRoaXMuX3VwZGF0ZUhlaWdodCgpO1xufTtcblxuR3JvdXAucHJvdG90eXBlLl91cGRhdGVIZWlnaHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fZ2V0U3ViR3JvdXAoKS51cGRhdGUoKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UsbnVsbCkpO1xuICAgIGlmKHRoaXMuaGFzTWF4SGVpZ2h0KCkpe1xuICAgICAgICB0aGlzLl9zY3JvbGxCYXIudXBkYXRlKCk7XG4gICAgfVxufTtcblxuR3JvdXAucHJvdG90eXBlLl91cGRhdGVBcHBlYXJhbmNlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB3cmFwID0gdGhpcy5fd3JhcE5vZGUsXG4gICAgICAgIGluZGljYXRvciA9IHRoaXMuX2luZGlOb2RlO1xuXG4gICAgdmFyIHNjcm9sbEJhciA9IHRoaXMuX3Njcm9sbEJhcjtcblxuICAgIHZhciBidWZmZXJUb3AgICAgPSB0aGlzLl9zY3JvbGxCdWZmZXJUb3AsXG4gICAgICAgIGJ1ZmZlckJvdHRvbSA9IHRoaXMuX3Njcm9sbEJ1ZmZlckJvdHRvbTtcblxuICAgIGlmICh0aGlzLmlzRGlzYWJsZWQoKSkge1xuICAgICAgICB3cmFwLnNldEhlaWdodCgwKTtcbiAgICAgICAgaWYgKGluZGljYXRvcil7XG4gICAgICAgICAgICBpbmRpY2F0b3Iuc2V0U3R5bGVDbGFzcyhDU1MuQXJyb3dCTWluKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzY3JvbGxCYXIpIHtcbiAgICAgICAgICAgIGlmIChidWZmZXJUb3Ape1xuICAgICAgICAgICAgICAgIGJ1ZmZlclRvcC5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChidWZmZXJCb3R0b20pe1xuICAgICAgICAgICAgICAgIGJ1ZmZlckJvdHRvbS5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuaGFzTWF4SGVpZ2h0KCkpIHtcbiAgICAgICAgdmFyIG1heEhlaWdodCA9IHRoaXMuZ2V0TWF4SGVpZ2h0KCksXG4gICAgICAgICAgICBsaXN0SGVpZ2h0ID0gd3JhcC5nZXRDaGlsZEF0KDEpLmdldEhlaWdodCgpO1xuXG4gICAgICAgIHdyYXAuc2V0SGVpZ2h0KGxpc3RIZWlnaHQgPCBtYXhIZWlnaHQgPyBsaXN0SGVpZ2h0IDogbWF4SGVpZ2h0KTtcblxuICAgICAgICBpZiAoc2Nyb2xsQmFyLmlzVmFsaWQoKSkge1xuICAgICAgICAgICAgaWYgKGJ1ZmZlclRvcCl7XG4gICAgICAgICAgICAgICAgYnVmZmVyVG9wLnNldFN0eWxlUHJvcGVydHkoJ2Rpc3BsYXknLCAnYmxvY2snKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChidWZmZXJCb3R0b20pe1xuICAgICAgICAgICAgICAgIGJ1ZmZlckJvdHRvbS5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ2Jsb2NrJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHdyYXAuZGVsZXRlU3R5bGVQcm9wZXJ0eSgnaGVpZ2h0Jyk7XG4gICAgfVxuICAgIGlmIChpbmRpY2F0b3Ipe1xuICAgICAgICBpbmRpY2F0b3Iuc2V0U3R5bGVDbGFzcyhDU1MuQXJyb3dCTWF4KTtcbiAgICB9XG59O1xuXG5Hcm91cC5wcm90b3R5cGUub25Hcm91cFNpemVVcGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xuICAgIGlmICh0aGlzLmhhc01heEhlaWdodCgpKXtcbiAgICAgICAgdGhpcy5fc2Nyb2xsQmFyLnVwZGF0ZSgpO1xuICAgIH1cbn07XG5cbkdyb3VwLnByb3RvdHlwZS5hZGRTdWJHcm91cCA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICB0aGlzLl9zdWJHcm91cHMucHVzaChuZXcgU3ViR3JvdXAodGhpcywgcGFyYW1zKSk7XG4gICAgdGhpcy5fdXBkYXRlSGVpZ2h0KCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUuX2dldFN1Ykdyb3VwID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzdWJHcm91cHMgPSB0aGlzLl9zdWJHcm91cHM7XG4gICAgaWYgKHN1Ykdyb3Vwcy5sZW5ndGggPT0gMCl7XG4gICAgICAgIHN1Ykdyb3Vwcy5wdXNoKG5ldyBTdWJHcm91cCh0aGlzKSk7XG4gICAgfVxuICAgIHJldHVybiBzdWJHcm91cHNbc3ViR3JvdXBzLmxlbmd0aCAtIDFdO1xufTtcblxuR3JvdXAucHJvdG90eXBlLmdldENvbXBvbmVudHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NvbXBvbmVudHM7XG59O1xuXG5mdW5jdGlvbiBpc0RhdGFDb21wKGNvbXApe1xuICAgIHJldHVybiAgKGNvbXAgaW5zdGFuY2VvZiBPYmplY3RDb21wb25lbnQpICYmXG4gICAgICAgICAgICEoY29tcCBpbnN0YW5jZW9mIFZhbHVlUGxvdHRlcikgJiZcbiAgICAgICAgICAgIShjb21wIGluc3RhbmNlb2YgRnVuY3Rpb25QbG90dGVyKTtcbn1cblxuXG5Hcm91cC5wcm90b3R5cGUuc2V0RGF0YSA9IGZ1bmN0aW9uKGRhdGEpe1xuICAgIHZhciBjb21wcyA9IHRoaXMuX2NvbXBvbmVudHMsIGNvbXAsIGRhdGFfO1xuICAgIHZhciBpID0gLTEsIGogPSAwLCBsID0gY29tcHMubGVuZ3RoO1xuICAgIHdoaWxlKCsraSA8IGwpe1xuICAgICAgICBjb21wID0gY29tcHNbaV07XG4gICAgICAgIGlmKCFpc0RhdGFDb21wKGNvbXApKXtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGRhdGFfID0gZGF0YVtqKytdO1xuICAgICAgICBjb21wLnNldFZhbHVlKGRhdGFfW09iamVjdC5rZXlzKGRhdGFfKVswXV0pO1xuICAgIH1cbn07XG5cbkdyb3VwLnByb3RvdHlwZS5nZXREYXRhID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgY29tcHMgPSB0aGlzLl9jb21wb25lbnRzLFxuICAgICAgICBpID0gLTEsIGwgPSBjb21wcy5sZW5ndGg7XG4gICAgdmFyIHZhbHVlcyA9IFtdO1xuICAgIHZhciBjb21wO1xuICAgIHdoaWxlKCsraSA8IGwpe1xuICAgICAgICBjb21wID0gY29tcHNbaV07XG4gICAgICAgIGlmKCFpc0RhdGFDb21wKGNvbXApKXtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHZhbHVlcy5wdXNoKGNvbXAuZ2V0RGF0YSgpKTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlcztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gR3JvdXA7XG4iLCJ2YXIgR3JvdXBFdmVudCA9IHtcblx0R1JPVVBfU0laRV9DSEFOR0UgICAgICAgIDogJ2dyb3VwU2l6ZUNoYW5nZScsXG5cdEdST1VQX0xJU1RfU0laRV9DSEFOR0UgICA6ICdncm91cExpc3RTaXplQ2hhbmdlJyxcblx0R1JPVVBfU0laRV9VUERBVEUgICAgICAgIDogJ2dyb3VwU2l6ZVVwZGF0ZScsXG5cdFNVQkdST1VQX1RSSUdHRVIgICAgICAgICA6ICdzdWJHcm91cFRyaWdnZXInLFxuXG5cdFNVQkdST1VQX0VOQUJMRSAgICAgICAgICA6ICdlbmFibGVTdWJHcm91cCcsXG5cdFNVQkdST1VQX0RJU0FCTEUgICAgICAgICA6ICdkaXNhYmxlU3ViR3JvdXAnXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEdyb3VwRXZlbnQ7IiwidmFyIE1lbnVFdmVudCA9IHtcblx0VVBEQVRFX01FTlU6ICd1cGRhdGVNZW51J1xufTtcbm1vZHVsZS5leHBvcnRzID0gTWVudUV2ZW50OyIsInZhciBOb2RlICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKSxcbiAgICBHcm91cCAgICAgPSByZXF1aXJlKCcuL0dyb3VwJyksXG4gICAgU2Nyb2xsQmFyID0gcmVxdWlyZSgnLi4vY29yZS9sYXlvdXQvU2Nyb2xsQmFyJyk7XG5cbnZhciBDU1MgICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcbnZhciBMYXlvdXRNb2RlID0gcmVxdWlyZSgnLi4vY29yZS9sYXlvdXQvTGF5b3V0TW9kZScpO1xudmFyIEhpc3RvcnkgICAgPSByZXF1aXJlKCcuLi9jb3JlL0hpc3RvcnknKTtcblxudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnREaXNwYXRjaGVyJyksXG4gICAgRXZlbnRfICAgICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIERvY3VtZW50RXZlbnQgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxuICAgIE5vZGVFdmVudCAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50JyksXG4gICAgUGFuZWxFdmVudCAgICAgID0gcmVxdWlyZSgnLi9QYW5lbEV2ZW50JyksXG4gICAgTWVudUV2ZW50ICAgICAgID0gcmVxdWlyZSgnLi9NZW51RXZlbnQnKTtcblxudmFyIE1vdXNlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Nb3VzZScpO1xuXG52YXIgU3RyaW5nSW5wdXQgICAgID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L1N0cmluZ0lucHV0JyksXG4gICAgTnVtYmVySW5wdXQgICAgID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L051bWJlcklucHV0JyksXG4gICAgUmFuZ2UgICAgICAgICAgID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L1JhbmdlJyksXG4gICAgQ2hlY2tib3ggICAgICAgID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L0NoZWNrYm94JyksXG4gICAgQ29sb3IgICAgICAgICAgID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L0NvbG9yJyksXG4gICAgQnV0dG9uICAgICAgICAgID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L0J1dHRvbicpLFxuICAgIFNlbGVjdCAgICAgICAgICA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9TZWxlY3QnKSxcbiAgICBTbGlkZXIgICAgICAgICAgPSByZXF1aXJlKCcuLi9jb21wb25lbnQvU2xpZGVyJyksXG4gICAgRnVuY3Rpb25QbG90dGVyID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L0Z1bmN0aW9uUGxvdHRlcicpLFxuICAgIFBhZCAgICAgICAgICAgICA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9QYWQnKSxcbiAgICBWYWx1ZVBsb3R0ZXIgICAgPSByZXF1aXJlKCcuLi9jb21wb25lbnQvVmFsdWVQbG90dGVyJyksXG4gICAgTnVtYmVyT3V0cHV0ICAgID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L051bWJlck91dHB1dCcpLFxuICAgIFN0cmluZ091dHB1dCAgICA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9TdHJpbmdPdXRwdXQnKSxcbiAgICBDYW52YXNfICAgICAgICAgPSByZXF1aXJlKCcuLi9jb21wb25lbnQvQ2FudmFzJyksXG4gICAgU1ZHXyAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L1NWRycpO1xuXG52YXIgREVGQVVMVF9QQU5FTF9QT1NJVElPTiA9IG51bGwsXG4gICAgREVGQVVMVF9QQU5FTF9XSURUSCAgICAgID0gMjAwLFxuICAgIERFRkFVTFRfUEFORUxfSEVJR0hUICAgICA9IG51bGwsXG4gICAgREVGQVVMVF9QQU5FTF9XSURUSF9NSU4gID0gMTAwLFxuICAgIERFRkFVTFRfUEFORUxfV0lEVEhfTUFYICA9IDYwMCxcbiAgICBERUZBVUxUX1BBTkVMX1JBVElPICAgICAgPSA0MCxcbiAgICBERUZBVUxUX1BBTkVMX0xBQkVMICAgICAgPSAnQ29udHJvbCBQYW5lbCcsXG4gICAgREVGQVVMVF9QQU5FTF9WQUxJR04gICAgID0gTGF5b3V0TW9kZS5UT1AsXG4gICAgREVGQVVMVF9QQU5FTF9BTElHTiAgICAgID0gTGF5b3V0TW9kZS5SSUdIVCxcbiAgICBERUZBVUxUX1BBTkVMX0RPQ0sgICAgICAgPSB7YWxpZ246TGF5b3V0TW9kZS5SSUdIVCxyZXNpemFibGU6dHJ1ZX0sXG4gICAgREVGQVVMVF9QQU5FTF9FTkFCTEUgICAgID0gdHJ1ZSxcbiAgICBERUZBVUxUX1BBTkVMX09QQUNJVFkgICAgPSAxLjAsXG4gICAgREVGQVVMVF9QQU5FTF9GSVhFRCAgICAgID0gdHJ1ZSxcbiAgICBERUZBVUxUX1BBTkVMX1ZDT05TVFJBSU4gPSB0cnVlO1xuXG5mdW5jdGlvbiBQYW5lbChjb250cm9sS2l0LHBhcmFtcyl7XG4gICAgRXZlbnREaXNwYXRjaGVyLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcbiAgICB0aGlzLl9wYXJlbnQgPSBjb250cm9sS2l0O1xuXG5cbiAgICBwYXJhbXMgICAgICAgICAgICA9IHBhcmFtcyAgICAgICAgICAgfHwge307XG4gICAgcGFyYW1zLnZhbGlnbiAgICAgPSBwYXJhbXMudmFsaWduICAgIHx8IERFRkFVTFRfUEFORUxfVkFMSUdOO1xuICAgIHBhcmFtcy5hbGlnbiAgICAgID0gcGFyYW1zLmFsaWduICAgICB8fCBERUZBVUxUX1BBTkVMX0FMSUdOO1xuICAgIHBhcmFtcy5wb3NpdGlvbiAgID0gcGFyYW1zLnBvc2l0aW9uICB8fCBERUZBVUxUX1BBTkVMX1BPU0lUSU9OO1xuICAgIHBhcmFtcy53aWR0aCAgICAgID0gcGFyYW1zLndpZHRoICAgICB8fCBERUZBVUxUX1BBTkVMX1dJRFRIO1xuICAgIHBhcmFtcy5oZWlnaHQgICAgID0gcGFyYW1zLmhlaWdodCAgICB8fCBERUZBVUxUX1BBTkVMX0hFSUdIVDtcbiAgICBwYXJhbXMucmF0aW8gICAgICA9IHBhcmFtcy5yYXRpbyAgICAgfHwgREVGQVVMVF9QQU5FTF9SQVRJTztcbiAgICBwYXJhbXMubGFiZWwgICAgICA9IHBhcmFtcy5sYWJlbCAgICAgfHwgREVGQVVMVF9QQU5FTF9MQUJFTDtcbiAgICBwYXJhbXMub3BhY2l0eSAgICA9IHBhcmFtcy5vcGFjaXR5ICAgfHwgREVGQVVMVF9QQU5FTF9PUEFDSVRZO1xuICAgIHBhcmFtcy5maXhlZCAgICAgID0gcGFyYW1zLmZpeGVkICAgICAgPT09IHVuZGVmaW5lZCA/IERFRkFVTFRfUEFORUxfRklYRUQgICAgICA6IHBhcmFtcy5maXhlZDtcbiAgICBwYXJhbXMuZW5hYmxlICAgICA9IHBhcmFtcy5lbmFibGUgICAgID09PSB1bmRlZmluZWQgPyBERUZBVUxUX1BBTkVMX0VOQUJMRSAgICAgOiBwYXJhbXMuZW5hYmxlO1xuICAgIHBhcmFtcy52Y29uc3RyYWluID0gcGFyYW1zLnZjb25zdHJhaW4gPT09IHVuZGVmaW5lZCA/IERFRkFVTFRfUEFORUxfVkNPTlNUUkFJTiA6IHBhcmFtcy52Y29uc3RyYWluO1xuXG4gICAgaWYgKHBhcmFtcy5kb2NrKSB7XG4gICAgICAgIHBhcmFtcy5kb2NrLmFsaWduID0gcGFyYW1zLmRvY2suYWxpZ24gfHwgREVGQVVMVF9QQU5FTF9ET0NLLmFsaWduO1xuICAgICAgICBwYXJhbXMuZG9jay5yZXNpemFibGUgPSBwYXJhbXMuZG9jay5yZXNpemFibGUgfHwgREVGQVVMVF9QQU5FTF9ET0NLLnJlc2l6YWJsZTtcbiAgICB9XG5cbiAgICB0aGlzLl93aWR0aCAgICAgID0gTWF0aC5tYXgoREVGQVVMVF9QQU5FTF9XSURUSF9NSU4sXG4gICAgICAgICAgICAgICAgICAgICAgIE1hdGgubWluKHBhcmFtcy53aWR0aCxERUZBVUxUX1BBTkVMX1dJRFRIX01BWCkpO1xuICAgIHRoaXMuX2hlaWdodCAgICAgPSBwYXJhbXMuaGVpZ2h0ID8gIE1hdGgubWF4KDAsTWF0aC5taW4ocGFyYW1zLmhlaWdodCx3aW5kb3cuaW5uZXJIZWlnaHQpKSA6IG51bGw7XG4gICAgdGhpcy5fZml4ZWQgICAgICA9IHBhcmFtcy5maXhlZDtcbiAgICB0aGlzLl9kb2NrICAgICAgID0gcGFyYW1zLmRvY2s7XG4gICAgdGhpcy5fcG9zaXRpb24gICA9IHBhcmFtcy5wb3NpdGlvbjtcbiAgICB0aGlzLl92Q29uc3RyYWluID0gcGFyYW1zLnZjb25zdHJhaW47XG4gICAgdGhpcy5fbGFiZWwgICAgICA9IHBhcmFtcy5sYWJlbDtcbiAgICB0aGlzLl9lbmFibGVkICAgID0gcGFyYW1zLmVuYWJsZTtcbiAgICB0aGlzLl9ncm91cHMgICAgID0gW107XG5cblxuICAgIHZhciB3aWR0aCAgICA9IHRoaXMuX3dpZHRoLFxuICAgICAgICBpc0ZpeGVkICA9IHRoaXMuX2ZpeGVkLFxuICAgICAgICBkb2NrICAgICA9IHRoaXMuX2RvY2ssXG4gICAgICAgIHBvc2l0aW9uID0gdGhpcy5fcG9zaXRpb24sXG4gICAgICAgIGxhYmVsICAgID0gdGhpcy5fbGFiZWwsXG4gICAgICAgIGFsaWduICAgID0gcGFyYW1zLmFsaWduLFxuICAgICAgICBvcGFjaXR5ICA9IHBhcmFtcy5vcGFjaXR5O1xuXG5cbiAgICB2YXIgcm9vdCA9IHRoaXMuX25vZGUgICAgID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QYW5lbCksXG4gICAgICAgIGhlYWQgPSB0aGlzLl9oZWFkTm9kZSA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuSGVhZCksXG4gICAgICAgIG1lbnUgICAgICA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuTWVudSksXG4gICAgICAgIGxhYmVsV3JhcCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCksXG4gICAgICAgIGxhYmVsXyAgICA9IG5ldyBOb2RlKE5vZGUuU1BBTikuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpLFxuICAgICAgICB3cmFwID0gdGhpcy5fd3JhcE5vZGUgPSBuZXcgTm9kZShOb2RlLkRJVikuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCksXG4gICAgICAgIGxpc3QgPSB0aGlzLl9saXN0Tm9kZSA9IG5ldyBOb2RlKE5vZGUuTElTVCkuc2V0U3R5bGVDbGFzcyhDU1MuR3JvdXBMaXN0KTtcblxuICAgIHJvb3Quc2V0V2lkdGgod2lkdGgpO1xuICAgIGxhYmVsXy5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywgbGFiZWwpO1xuXG4gICAgbGFiZWxXcmFwLmFkZENoaWxkKGxhYmVsXyk7XG4gICAgaGVhZC5hZGRDaGlsZChtZW51KTtcbiAgICBoZWFkLmFkZENoaWxkKGxhYmVsV3JhcCk7XG4gICAgd3JhcC5hZGRDaGlsZChsaXN0KTtcbiAgICByb290LmFkZENoaWxkKGhlYWQpO1xuICAgIHJvb3QuYWRkQ2hpbGQod3JhcCk7XG5cbiAgICBjb250cm9sS2l0LmdldE5vZGUoKS5hZGRDaGlsZChyb290KTtcblxuXG4gICAgaWYgKCFkb2NrKSB7XG4gICAgICAgIHZhciBtZW51SGlkZSA9IHRoaXMuX21lbnVIaWRlID0gbmV3IE5vZGUoTm9kZS5JTlBVVF9CVVRUT04pO1xuICAgICAgICAgICAgbWVudUhpZGUuc2V0U3R5bGVDbGFzcyhDU1MuQnV0dG9uTWVudUhpZGUpO1xuICAgICAgICAgICAgbWVudUhpZGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25NZW51SGlkZU1vdXNlRG93bi5iaW5kKHRoaXMpKTtcblxuICAgICAgICBtZW51LmFkZENoaWxkKG1lbnVIaWRlKTtcblxuICAgICAgICBpZiAodGhpcy5fcGFyZW50LnBhbmVsc0FyZUNsb3NhYmxlKCkpIHtcbiAgICAgICAgICAgIHZhciBtZW51Q2xvc2UgPSBuZXcgTm9kZShOb2RlLklOUFVUX0JVVFRPTik7XG4gICAgICAgICAgICBtZW51Q2xvc2Uuc2V0U3R5bGVDbGFzcyhDU1MuQnV0dG9uTWVudUNsb3NlKTtcbiAgICAgICAgICAgIG1lbnVDbG9zZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLCB0aGlzLmRpc2FibGUuYmluZCh0aGlzKSk7XG5cbiAgICAgICAgICAgIG1lbnUuYWRkQ2hpbGQobWVudUNsb3NlKTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgaWYgKHRoaXMuaGFzTWF4SGVpZ2h0KCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2FkZFNjcm9sbFdyYXAoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghaXNGaXhlZCkge1xuICAgICAgICAgICAgaWYgKHBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgaWYgKGFsaWduID09IExheW91dE1vZGUuTEVGVCB8fFxuICAgICAgICAgICAgICAgICAgICBhbGlnbiA9PSBMYXlvdXRNb2RlLlRPUCB8fFxuICAgICAgICAgICAgICAgICAgICBhbGlnbiA9PSBMYXlvdXRNb2RlLkJPVFRPTSkge1xuICAgICAgICAgICAgICAgICAgICByb290LnNldFBvc2l0aW9uR2xvYmFsKHBvc2l0aW9uWzBdLCBwb3NpdGlvblsxXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByb290LnNldFBvc2l0aW9uR2xvYmFsKHdpbmRvdy5pbm5lcldpZHRoIC0gd2lkdGggLSBwb3NpdGlvblswXSwgcG9zaXRpb25bMV0pO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9wb3NpdGlvbiA9IHJvb3QuZ2V0UG9zaXRpb24oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHRoaXMuX3Bvc2l0aW9uID0gcm9vdC5nZXRQb3NpdGlvbigpO1xuXG4gICAgICAgICAgICB0aGlzLl9tb3VzZU9mZnNldCA9IFswLCAwXTtcblxuICAgICAgICAgICAgcm9vdC5zZXRTdHlsZVByb3BlcnR5KCdwb3NpdGlvbicsICdhYnNvbHV0ZScpO1xuICAgICAgICAgICAgaGVhZC5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLCB0aGlzLl9vbkhlYWREcmFnU3RhcnQuYmluZCh0aGlzKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpZiAocG9zaXRpb24pIHtcbiAgICAgICAgICAgICAgICB2YXIgcG9zaXRpb25YID0gcG9zaXRpb25bMF0sXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uWSA9IHBvc2l0aW9uWzFdO1xuXG4gICAgICAgICAgICAgICAgaWYgKHBvc2l0aW9uWSAhPSAwKXJvb3Quc2V0UG9zaXRpb25ZKHBvc2l0aW9uWSk7XG4gICAgICAgICAgICAgICAgaWYgKHBvc2l0aW9uWCAhPSAwKWlmIChhbGlnbiA9PSBMYXlvdXRNb2RlLlJJR0hUKXJvb3QuZ2V0RWxlbWVudCgpLm1hcmdpblJpZ2h0ID0gcG9zaXRpb25YO1xuICAgICAgICAgICAgICAgIGVsc2Ugcm9vdC5zZXRQb3NpdGlvblgocG9zaXRpb25YKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcm9vdC5zZXRTdHlsZVByb3BlcnR5KCdmbG9hdCcsIGFsaWduKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdmFyIGRvY2tBbGlnbm1lbnQgPSBkb2NrLmFsaWduO1xuXG4gICAgICAgIGlmIChkb2NrQWxpZ25tZW50ID09IExheW91dE1vZGUuTEVGVCB8fFxuICAgICAgICAgICAgZG9ja0FsaWdubWVudCA9PSBMYXlvdXRNb2RlLlJJR0hUKSB7XG4gICAgICAgICAgICBhbGlnbiA9IGRvY2tBbGlnbm1lbnQ7XG4gICAgICAgICAgICB0aGlzLl9oZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZG9ja0FsaWdubWVudCA9PSBMYXlvdXRNb2RlLlRPUCB8fFxuICAgICAgICAgICAgZG9ja0FsaWdubWVudCA9PSBMYXlvdXRNb2RlLkJPVFRPTSkge1xuXG4gICAgICAgIH1cblxuICAgICAgICAvKlxuICAgICAgICAgaWYoZG9jay5yZXNpemFibGUpXG4gICAgICAgICB7XG4gICAgICAgICB2YXIgc2l6ZUhhbmRsZSA9IG5ldyBDb250cm9sS2l0Lk5vZGUoQ29udHJvbEtpdC5Ob2RlVHlwZS5ESVYpO1xuICAgICAgICAgc2l6ZUhhbmRsZS5zZXRTdHlsZUNsYXNzKENvbnRyb2xLaXQuQ1NTLlNpemVIYW5kbGUpO1xuICAgICAgICAgcm9vdE5vZGUuYWRkQ2hpbGQoc2l6ZUhhbmRsZSk7XG4gICAgICAgICB9XG4gICAgICAgICAqL1xuXG4gICAgICAgIHJvb3Quc2V0U3R5bGVQcm9wZXJ0eSgnZmxvYXQnLCBhbGlnbik7XG4gICAgfVxuXG4gICAgdmFyIHBhcmVudCA9IHRoaXMuX3BhcmVudDtcbiAgICB2YXIgaGlzdG9yeUlzRW5hYmxlZCA9IHBhcmVudC5oaXN0b3J5SXNFbmFibGVkKCksXG4gICAgICAgIHN0YXRlc0FyZUVuYWJsZWQgPSBwYXJlbnQuc3RhdGVzQXJlRW5hYmxlZCgpO1xuXG4gICAgaWYoaGlzdG9yeUlzRW5hYmxlZCB8fCBzdGF0ZXNBcmVFbmFibGVkKXtcbiAgICAgICAgbWVudS5hZGRDaGlsZEF0KG5ldyBOb2RlKCksMCkuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCk7Ly8uc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsJ25vbmUnKTtcbiAgICB9XG5cbiAgICBpZiAoaGlzdG9yeUlzRW5hYmxlZCkge1xuICAgICAgICB0aGlzLl9tZW51VW5kbyA9IG1lbnUuZ2V0Q2hpbGRBdCgwKVxuICAgICAgICAgICAgLmFkZENoaWxkKG5ldyBOb2RlKE5vZGUuSU5QVVRfQlVUVE9OKSlcbiAgICAgICAgICAgICAgICAuc2V0U3R5bGVDbGFzcyhDU1MuQnV0dG9uTWVudVVuZG8pXG4gICAgICAgICAgICAgICAgLnNldFByb3BlcnR5KCd2YWx1ZScsSGlzdG9yeS5nZXQoKS5nZXROdW1TdGF0ZXMoKSlcbiAgICAgICAgICAgICAgICAuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTixmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICBIaXN0b3J5LmdldCgpLnBvcFN0YXRlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIHBhcmVudC5hZGRFdmVudExpc3RlbmVyKE1lbnVFdmVudC5VUERBVEVfTUVOVSx0aGlzLCAnb25VcGRhdGVNZW51Jyk7XG4gICAgfVxuICAgIGlmKHN0YXRlc0FyZUVuYWJsZWQpe1xuICAgICAgICBtZW51LmdldENoaWxkQXQoMClcbiAgICAgICAgICAgIC5hZGRDaGlsZChuZXcgTm9kZShOb2RlLklOUFVUX0JVVFRPTikpXG4gICAgICAgICAgICAgICAgLnNldFN0eWxlQ2xhc3MoQ1NTLkJ1dHRvbk1lbnVMb2FkKVxuICAgICAgICAgICAgICAgIC5zZXRQcm9wZXJ0eSgndmFsdWUnLCdMb2FkJylcbiAgICAgICAgICAgICAgICAuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTixmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICBjb250cm9sS2l0Ll9sb2FkU3RhdGUoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgbWVudS5nZXRDaGlsZEF0KDApXG4gICAgICAgICAgICAuYWRkQ2hpbGQobmV3IE5vZGUoTm9kZS5JTlBVVF9CVVRUT04pKVxuICAgICAgICAgICAgICAgIC5zZXRTdHlsZUNsYXNzKENTUy5CdXR0b25NZW51U2F2ZSlcbiAgICAgICAgICAgICAgICAuc2V0UHJvcGVydHkoJ3ZhbHVlJywnU2F2ZScpXG4gICAgICAgICAgICAgICAgLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgY29udHJvbEtpdC5fc2F2ZVN0YXRlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgfVxuICAgIGlmKGhpc3RvcnlJc0VuYWJsZWQgfHwgc3RhdGVzQXJlRW5hYmxlZCl7XG4gICAgICAgIGhlYWQuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfT1ZFUixmdW5jdGlvbigpe1xuICAgICAgICAgICAgbWVudS5zZXRTdHlsZUNsYXNzKENTUy5NZW51QWN0aXZlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGhlYWQuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfT1VULGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBtZW51LnNldFN0eWxlQ2xhc3MoQ1NTLk1lbnUpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgaWYgKG9wYWNpdHkgIT0gMS4wICYmIG9wYWNpdHkgIT0gMC4wKSB7XG4gICAgICAgIHJvb3Quc2V0U3R5bGVQcm9wZXJ0eSgnb3BhY2l0eScsIG9wYWNpdHkpO1xuICAgIH1cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50LldJTkRPV19SRVNJWkUsdGhpcy5fb25XaW5kb3dSZXNpemUuYmluZCh0aGlzKSk7XG59XG5QYW5lbC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUpO1xuUGFuZWwucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gUGFuZWw7XG5cblBhbmVsLnByb3RvdHlwZS5fb25NZW51SGlkZU1vdXNlRG93biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9lbmFibGVkID0gIXRoaXMuX2VuYWJsZWQ7XG4gICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xufTtcblxuUGFuZWwucHJvdG90eXBlLm9uVXBkYXRlTWVudSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9tZW51VW5kby5zZXRQcm9wZXJ0eSgndmFsdWUnLCBIaXN0b3J5LmdldCgpLmdldE51bVN0YXRlcygpKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5fb25NZW51VW5kb1RyaWdnZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgSGlzdG9yeS5nZXQoKS5wb3BTdGF0ZSgpO1xufTtcblxuXG5QYW5lbC5wcm90b3R5cGUuX3VwZGF0ZUFwcGVhcmFuY2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHJvb3ROb2RlID0gdGhpcy5fbm9kZSxcbiAgICAgICAgaGVhZE5vZGUgPSB0aGlzLl9oZWFkTm9kZSxcbiAgICAgICAgbWVudUhpZGUgPSB0aGlzLl9tZW51SGlkZTtcblxuICAgIGlmICghdGhpcy5fZW5hYmxlZCkge1xuICAgICAgICBoZWFkTm9kZS5nZXRTdHlsZSgpLmJvcmRlckJvdHRvbSA9ICdub25lJztcbiAgICAgICAgcm9vdE5vZGUuc2V0SGVpZ2h0KGhlYWROb2RlLmdldEhlaWdodCgpKTtcbiAgICAgICAgbWVudUhpZGUuc2V0U3R5bGVDbGFzcyhDU1MuQnV0dG9uTWVudVNob3cpO1xuICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX0hJREUsIG51bGwpKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHJvb3ROb2RlLnNldEhlaWdodChoZWFkTm9kZS5nZXRIZWlnaHQoKSArIHRoaXMuX3dyYXBOb2RlLmdldEhlaWdodCgpKTtcbiAgICAgICAgcm9vdE5vZGUuZGVsZXRlU3R5bGVQcm9wZXJ0eSgnaGVpZ2h0Jyk7XG4gICAgICAgIG1lbnVIaWRlLnNldFN0eWxlQ2xhc3MoQ1NTLkJ1dHRvbk1lbnVIaWRlKTtcbiAgICAgICAgaGVhZE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuSGVhZCk7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIFBhbmVsRXZlbnQuUEFORUxfU0hPVywgbnVsbCkpO1xuICAgIH1cbn07XG5cblBhbmVsLnByb3RvdHlwZS5fb25IZWFkRHJhZ1N0YXJ0ID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgcGFyZW50Tm9kZSA9IHRoaXMuX3BhcmVudC5nZXROb2RlKCksXG4gICAgICAgIG5vZGUgICAgICAgPSB0aGlzLl9ub2RlO1xuXG4gICAgdmFyIG5vZGVQb3MgICA9IG5vZGUuZ2V0UG9zaXRpb25HbG9iYWwoKSxcbiAgICAgICAgbW91c2VQb3MgID0gTW91c2UuZ2V0KCkuZ2V0UG9zaXRpb24oKSxcbiAgICAgICAgb2Zmc2V0UG9zID0gdGhpcy5fbW91c2VPZmZzZXQ7XG5cbiAgICAgICAgb2Zmc2V0UG9zWzBdID0gbW91c2VQb3NbMF0gLSBub2RlUG9zWzBdO1xuICAgICAgICBvZmZzZXRQb3NbMV0gPSBtb3VzZVBvc1sxXSAtIG5vZGVQb3NbMV07XG5cbiAgICB2YXIgZXZlbnRNb3VzZU1vdmUgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsXG4gICAgICAgIGV2ZW50TW91c2VVcCAgID0gRG9jdW1lbnRFdmVudC5NT1VTRV9VUDtcblxuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHZhciBvbkRyYWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLl91cGRhdGVQb3NpdGlvbigpO1xuICAgICAgICB9LFxuICAgICAgICBvbkRyYWdFbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW91c2VNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcbiAgICAgICAgICAgIHNlbGYuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIFBhbmVsRXZlbnQuUEFORUxfTU9WRV9FTkQsIG51bGwpKTtcbiAgICAgICAgfTtcblxuICAgIHBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobm9kZSk7XG4gICAgcGFyZW50Tm9kZS5hZGRDaGlsZCggICBub2RlKTtcblxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZU1vdmUsIG9uRHJhZywgICAgZmFsc2UpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCAgIG9uRHJhZ0VuZCwgZmFsc2UpO1xuXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcyxQYW5lbEV2ZW50LlBBTkVMX01PVkVfQkVHSU4sbnVsbCkpO1xufTtcblxuUGFuZWwucHJvdG90eXBlLl91cGRhdGVQb3NpdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgbW91c2VQb3MgPSBNb3VzZS5nZXQoKS5nZXRQb3NpdGlvbigpLFxuICAgICAgICBvZmZzZXRQb3MgPSB0aGlzLl9tb3VzZU9mZnNldDtcblxuICAgIHZhciBwb3NpdGlvbiA9IHRoaXMuX3Bvc2l0aW9uO1xuICAgIHBvc2l0aW9uWzBdID0gbW91c2VQb3NbMF0gLSBvZmZzZXRQb3NbMF07XG4gICAgcG9zaXRpb25bMV0gPSBtb3VzZVBvc1sxXSAtIG9mZnNldFBvc1sxXTtcblxuICAgIHRoaXMuX2NvbnN0cmFpbkhlaWdodCgpO1xuICAgIHRoaXMuX2NvbnN0cmFpblBvc2l0aW9uKCk7XG5cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX01PVkUsIG51bGwpKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5fb25XaW5kb3dSZXNpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuaXNEb2NrZWQoKSkge1xuICAgICAgICB2YXIgZG9jayA9IHRoaXMuX2RvY2s7XG5cbiAgICAgICAgaWYgKGRvY2suYWxpZ24gPT0gTGF5b3V0TW9kZS5SSUdIVCB8fFxuICAgICAgICAgICAgZG9jay5hbGlnbiA9PSBMYXlvdXRNb2RlLkxFRlQpIHtcbiAgICAgICAgICAgIHZhciB3aW5kb3dIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQsXG4gICAgICAgICAgICAgICAgbGlzdEhlaWdodCA9IHRoaXMuX2xpc3ROb2RlLmdldEhlaWdodCgpLFxuICAgICAgICAgICAgICAgIGhlYWRIZWlnaHQgPSB0aGlzLl9oZWFkTm9kZS5nZXRIZWlnaHQoKTtcblxuICAgICAgICAgICAgdGhpcy5faGVpZ2h0ID0gd2luZG93SGVpZ2h0O1xuXG4gICAgICAgICAgICBpZiAoKHdpbmRvd0hlaWdodCAtIGhlYWRIZWlnaHQpID4gbGlzdEhlaWdodCl7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2Nyb2xsQmFyLmRpc2FibGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2Nyb2xsQmFyLmVuYWJsZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX1NJWkVfQ0hBTkdFKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGlmICghdGhpcy5pc0ZpeGVkKCkpe1xuICAgICAgICAgICAgdGhpcy5fY29uc3RyYWluUG9zaXRpb24oKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB0aGlzLl9jb25zdHJhaW5IZWlnaHQoKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBEb2N1bWVudEV2ZW50LldJTkRPV19SRVNJWkUpKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5fY29uc3RyYWluUG9zaXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG5vZGUgPSB0aGlzLl9ub2RlO1xuXG4gICAgdmFyIG1heFggPSB3aW5kb3cuaW5uZXJXaWR0aCAtIG5vZGUuZ2V0V2lkdGgoKSxcbiAgICAgICAgbWF4WSA9IHdpbmRvdy5pbm5lckhlaWdodCAtIG5vZGUuZ2V0SGVpZ2h0KCk7XG5cbiAgICB2YXIgcG9zaXRpb24gPSB0aGlzLl9wb3NpdGlvbjtcbiAgICBwb3NpdGlvblswXSA9IE1hdGgubWF4KDAsIE1hdGgubWluKHBvc2l0aW9uWzBdLCBtYXhYKSk7XG4gICAgcG9zaXRpb25bMV0gPSBNYXRoLm1heCgwLCBNYXRoLm1pbihwb3NpdGlvblsxXSwgbWF4WSkpO1xuXG4gICAgbm9kZS5zZXRQb3NpdGlvbkdsb2JhbChwb3NpdGlvblswXSwgcG9zaXRpb25bMV0pO1xufTtcblxuUGFuZWwucHJvdG90eXBlLl9jb25zdHJhaW5IZWlnaHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLl92Q29uc3RyYWluKXJldHVybjtcblxuICAgIHZhciBoYXNNYXhIZWlnaHQgPSB0aGlzLmhhc01heEhlaWdodCgpLFxuICAgICAgICBoYXNTY3JvbGxXcmFwID0gdGhpcy5oYXNTY3JvbGxXcmFwKCk7XG5cbiAgICB2YXIgaGVhZCA9IHRoaXMuX2hlYWROb2RlLFxuICAgICAgICB3cmFwID0gdGhpcy5fd3JhcE5vZGU7XG5cbiAgICB2YXIgc2Nyb2xsQmFyID0gdGhpcy5fc2Nyb2xsQmFyO1xuXG4gICAgdmFyIHBhbmVsVG9wID0gdGhpcy5pc0RvY2tlZCgpID8gMCA6XG4gICAgICAgIHRoaXMuaXNGaXhlZCgpID8gMCA6XG4gICAgICAgICAgICB0aGlzLl9wb3NpdGlvblsxXTtcblxuICAgIHZhciBwYW5lbEhlaWdodCA9IGhhc01heEhlaWdodCA/IHRoaXMuZ2V0TWF4SGVpZ2h0KCkgOlxuICAgICAgICBoYXNTY3JvbGxXcmFwID8gc2Nyb2xsQmFyLmdldFRhcmdldE5vZGUoKS5nZXRIZWlnaHQoKSA6XG4gICAgICAgICAgICB3cmFwLmdldEhlaWdodCgpO1xuXG4gICAgdmFyIHBhbmVsQm90dG9tID0gcGFuZWxUb3AgKyBwYW5lbEhlaWdodDtcbiAgICB2YXIgaGVhZEhlaWdodCA9IGhlYWQuZ2V0SGVpZ2h0KCk7XG5cbiAgICB2YXIgd2luZG93SGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0LFxuICAgICAgICBoZWlnaHREaWZmID0gd2luZG93SGVpZ2h0IC0gcGFuZWxCb3R0b20gLSBoZWFkSGVpZ2h0LFxuICAgICAgICBoZWlnaHRTdW07XG5cbiAgICBpZiAoaGVpZ2h0RGlmZiA8IDAuMCkge1xuICAgICAgICBoZWlnaHRTdW0gPSBwYW5lbEhlaWdodCArIGhlaWdodERpZmY7XG5cbiAgICAgICAgaWYgKCFoYXNTY3JvbGxXcmFwKSB7XG4gICAgICAgICAgICB0aGlzLl9hZGRTY3JvbGxXcmFwKGhlaWdodFN1bSk7XG4gICAgICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX1NDUk9MTF9XUkFQX0FEREVELCBudWxsKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBzY3JvbGxCYXIuc2V0V3JhcEhlaWdodChoZWlnaHRTdW0pO1xuICAgICAgICB3cmFwLnNldEhlaWdodChoZWlnaHRTdW0pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgaWYgKCFoYXNNYXhIZWlnaHQgJiYgaGFzU2Nyb2xsV3JhcCkge1xuICAgICAgICAgICAgc2Nyb2xsQmFyLnJlbW92ZUZyb21QYXJlbnQoKTtcbiAgICAgICAgICAgIHdyYXAuYWRkQ2hpbGQodGhpcy5fbGlzdE5vZGUpO1xuICAgICAgICAgICAgd3JhcC5kZWxldGVTdHlsZVByb3BlcnR5KCdoZWlnaHQnKTtcbiAgICAgICAgICAgIHRoaXMuX3Njcm9sbEJhci5yZW1vdmVNb3VzZUxpc3RlbmVyKCk7XG4gICAgICAgICAgICB0aGlzLl9zY3JvbGxCYXIgPSBudWxsO1xuXG4gICAgICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX1NDUk9MTF9XUkFQX1JFTU9WRUQsIG51bGwpKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblBhbmVsLnByb3RvdHlwZS5vbkdyb3VwTGlzdFNpemVDaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuaGFzU2Nyb2xsV3JhcCgpKXtcbiAgICAgICAgdGhpcy5fdXBkYXRlU2Nyb2xsV3JhcCgpO1xuICAgIH1cbiAgICB0aGlzLl9jb25zdHJhaW5IZWlnaHQoKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5fdXBkYXRlU2Nyb2xsV3JhcCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgd3JhcCAgID0gdGhpcy5fd3JhcE5vZGUsXG4gICAgICAgIHNjcm9sbEJhciAgPSB0aGlzLl9zY3JvbGxCYXIsXG4gICAgICAgIGhlaWdodCAgICAgPSB0aGlzLmhhc01heEhlaWdodCgpID8gdGhpcy5nZXRNYXhIZWlnaHQoKSA6IDEwMCxcbiAgICAgICAgbGlzdEhlaWdodCA9IHRoaXMuX2xpc3ROb2RlLmdldEhlaWdodCgpO1xuXG4gICAgd3JhcC5zZXRIZWlnaHQobGlzdEhlaWdodCA8IGhlaWdodCA/IGxpc3RIZWlnaHQgOiBoZWlnaHQpO1xuXG4gICAgc2Nyb2xsQmFyLnVwZGF0ZSgpO1xuXG4gICAgaWYgKCFzY3JvbGxCYXIuaXNWYWxpZCgpKSB7XG4gICAgICAgIHNjcm9sbEJhci5kaXNhYmxlKCk7XG4gICAgICAgIHdyYXAuc2V0SGVpZ2h0KHdyYXAuZ2V0Q2hpbGRBdCgxKS5nZXRIZWlnaHQoKSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBzY3JvbGxCYXIuZW5hYmxlKCk7XG4gICAgICAgIHdyYXAuc2V0SGVpZ2h0KGhlaWdodCk7XG4gICAgfVxufTtcblxuUGFuZWwucHJvdG90eXBlLl9hZGRTY3JvbGxXcmFwID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB3cmFwTm9kZSA9IHRoaXMuX3dyYXBOb2RlLFxuICAgICAgICBsaXN0Tm9kZSA9IHRoaXMuX2xpc3ROb2RlLFxuICAgICAgICBoZWlnaHQgPSBhcmd1bWVudHMubGVuZ3RoID09IDAgP1xuICAgICAgICAgICAgdGhpcy5nZXRNYXhIZWlnaHQoKSA6XG4gICAgICAgICAgICBhcmd1bWVudHNbMF07XG5cbiAgICB0aGlzLl9zY3JvbGxCYXIgPSBuZXcgU2Nyb2xsQmFyKHdyYXBOb2RlLCBsaXN0Tm9kZSwgaGVpZ2h0KTtcbiAgICBpZiAodGhpcy5pc0VuYWJsZWQoKSl7XG4gICAgICAgIHdyYXBOb2RlLnNldEhlaWdodChoZWlnaHQpO1xuICAgIH1cbn07XG5cblBhbmVsLnByb3RvdHlwZS5oYXNTY3JvbGxXcmFwID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9zY3JvbGxCYXIgIT0gbnVsbDtcbn07XG5cblxuUGFuZWwucHJvdG90eXBlLnByZXZlbnRTZWxlY3REcmFnID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5oYXNTY3JvbGxXcmFwKCkpe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX3dyYXBOb2RlLmdldEVsZW1lbnQoKS5zY3JvbGxUb3AgPSAwO1xufTtcblxuUGFuZWwucHJvdG90eXBlLmVuYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9ub2RlLnNldFN0eWxlUHJvcGVydHkoJ2Rpc3BsYXknLCAnYmxvY2snKTtcbiAgICB0aGlzLl9lbmFibGVkID0gdHJ1ZTtcbiAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XG59O1xuXG5cblBhbmVsLnByb3RvdHlwZS5kaXNhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX25vZGUuc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdub25lJyk7XG4gICAgdGhpcy5fZW5hYmxlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5pc0VuYWJsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2VuYWJsZWQ7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuaXNEaXNhYmxlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gIXRoaXMuX2VuYWJsZWQ7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuaGFzTWF4SGVpZ2h0ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9oZWlnaHQgIT0gbnVsbDtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5nZXRNYXhIZWlnaHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2hlaWdodDtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5pc0RvY2tlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fZG9jaztcbn07XG5cblBhbmVsLnByb3RvdHlwZS5pc0ZpeGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9maXhlZDtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5nZXRHcm91cHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2dyb3Vwcztcbn07XG5cblBhbmVsLnByb3RvdHlwZS5nZXROb2RlID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9ub2RlO1xufTtcblxuUGFuZWwucHJvdG90eXBlLmdldExpc3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2xpc3ROb2RlO1xufTtcblxuUGFuZWwucHJvdG90eXBlLmdldFdpZHRoID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl93aWR0aDtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5nZXRQb3NpdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fcG9zaXRpb247XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuZ2V0UGFyZW50ID0gZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gdGhpcy5fcGFyZW50O1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbmV3IEdyb3VwIHRvIHRoZSBQYW5lbC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbcGFyYW1zXSAtIEdyb3VwIG9wdGlvbnNcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmxhYmVsPScnXSAtIFRoZSBHcm91cCBsYWJlbCBzdHJpbmdcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW3BhcmFtcy51c2VMYWJlbD10cnVlXSAtIFRyaWdnZXIgd2hldGhlciBhbGwgY29udGFpbmVkIFN1Ykdyb3VwcyBhbmQgQ29tcG9uZW50cyBzaG91bGQgdXNlIGxhYmVsc1xuICogQHBhcmFtIHtCb29sZWFufSBbcGFyYW1zLmVuYWJsZT10cnVlXSAtIERlZmluZXMgaW5pdGlhbCBzdGF0ZSBvcGVuIC8gY2xvc2VkXG4gKiBAcGFyYW0ge051bWJlcn0gW3BhcmFtcy5oZWlnaHQ9bnVsbF0gLSBEZWZpbmVzIGlmIHRoZSBoZWlnaHQgb2YgdGhlIEdyb3VwIHNob3VsZCBiZSBjb25zdHJhaW5lZCB0byBjZXJ0YWluIGhlaWdodFxuICogQHJldHVybnMge1BhbmVsfVxuICovXG5cblBhbmVsLnByb3RvdHlwZS5hZGRHcm91cCA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICB2YXIgZ3JvdXAgPSBuZXcgR3JvdXAodGhpcywgcGFyYW1zKTtcbiAgICB0aGlzLl9ncm91cHMucHVzaChncm91cCk7XG4gICAgaWYgKHRoaXMuaXNEb2NrZWQoKSl7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIFBhbmVsRXZlbnQuUEFORUxfU0laRV9DSEFOR0UpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBuZXcgU3ViR3JvdXAgdG8gdGhlIGxhc3QgYWRkZWQgR3JvdXAuXG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBTdWJHcm91cCBvcHRpb25zXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy5sYWJlbD0nJ10gLSBUaGUgU3ViR3JvdXAgbGFiZWwgc3RyaW5nXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtwYXJhbXMudXNlTGFiZWw9dHJ1ZV0gLSBUcmlnZ2VyIHdoZXRoZXIgYWxsIENvbXBvbmVudHMgc2hvdWxkIHVzZSBsYWJlbHNcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW3BhcmFtcy5lbmFibGU9dHJ1ZV0gLSBEZWZpbmVzIGluaXRpYWwgc3RhdGUgb3BlbiAvIGNsb3NlZFxuICogQHBhcmFtIHtOdW1iZXJ9IFtwYXJhbXMuaGVpZ2h0PW51bGxdIC0gRGVmaW5lcyBpZiB0aGUgaGVpZ2h0IG9mIHRoZSBTdWJHcm91cCBzaG91bGQgYmUgY29uc3RyYWluZWQgdG8gY2VydGFpbiBoZWlnaHRcbiAqIEByZXR1cm5zIHtQYW5lbH1cbiAqL1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkU3ViR3JvdXAgPSBmdW5jdGlvbihwYXJhbXMpe1xuICAgIHZhciBncm91cHMgPSB0aGlzLl9ncm91cHM7XG4gICAgaWYoZ3JvdXBzLmxlbmd0aCA9PSAwKXtcbiAgICAgICAgdGhpcy5hZGRHcm91cCgpO1xuICAgIH1cbiAgICBncm91cHNbZ3JvdXBzLmxlbmd0aCAtIDFdLmFkZFN1Ykdyb3VwKHBhcmFtcyk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuX2FkZENvbXBvbmVudCA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcyxcbiAgICAgICAgZ3JvdXA7XG4gICAgaWYoZ3JvdXBzLmxlbmd0aCA9PSAwKXtcbiAgICAgICAgZ3JvdXBzLnB1c2gobmV3IEdyb3VwKHRoaXMpKTtcbiAgICB9XG4gICAgZ3JvdXAgPSBncm91cHNbZ3JvdXBzLmxlbmd0aC0xXTtcblxuICAgIGdyb3VwLmFkZENvbXBvbmVudC5hcHBseShncm91cCxhcmd1bWVudHMpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbmV3IFN0cmluZ0lucHV0IHRvIGxhc3QgYWRkZWQgU3ViR3JvdXAuXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IC0gVGhlIG9iamVjdFxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIC0gVGhlIHByb3BlcnR5IGtleVxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gU3RyaW5nSW5wdXQgb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9dmFsdWVdIC0gU3RyaW5nSW5wdXQgbGFiZWxcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtwYXJhbXMub25DaGFuZ2VdIC0gQ2FsbGJhY2sgb24gY2hhbmdlXG4gKiBAcGFyYW0ge0FycmF5fSBbcGFyYW1zLnByZXNldHNdIC0gQSBzZXQgb2YgcHJlc2V0c1xuICogQHJldHVybnMge1BhbmVsfVxuICovXG5cblBhbmVsLnByb3RvdHlwZS5hZGRTdHJpbmdJbnB1dCA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KFN0cmluZ0lucHV0LG9iamVjdCx2YWx1ZSxwYXJhbXMpO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbmV3IE51bWJlcklucHV0IHRvIGxhc3QgYWRkZWQgU3ViR3JvdXAuXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IC0gVGhlIG9iamVjdC5cbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSAtIFRoZSBwcm9wZXJ0eSBrZXkuXG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9ucy5cbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmxhYmVsPXZhbHVlXSAtIE51bWJlcklucHV0IGxhYmVsXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbcGFyYW1zLm9uQ2hhbmdlXSAtIENhbGxiYWNrIG9uIGNoYW5nZVxuICogQHBhcmFtIHtOdW1iZXJ9IFtwYXJhbXMuc3RlcF0gLSBBbW91bnQgc3ViYmVkL2FkZGVkIG9uIGFycm93RG93bi9hcnJvd1VwIHByZXNzXG4gKiBAcGFyYW0ge051bWJlcn0gW3BhcmFtcy5kcF0gLSBEZWNpbWFsIHBsYWNlcyBkaXNwbGF5ZWRcbiAqIEBwYXJhbSB7QXJyYXl9IFtwYXJhbXMucHJlc2V0c10gLSBBIHNldCBvZiBwcmVzZXRzXG4gKiBAcmV0dXJucyB7UGFuZWx9XG4gKi9cblxuUGFuZWwucHJvdG90eXBlLmFkZE51bWJlcklucHV0ID0gZnVuY3Rpb24gKG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoTnVtYmVySW5wdXQsb2JqZWN0LHZhbHVlLHBhcmFtcyk7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBuZXcgUmFuZ2UgaW5wdXQgdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBUaGUgb2JqZWN0XG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgLSBUaGUgcHJvcGVydHkga2V5XG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9dmFsdWVdIC0gUmFuZ2UgbGFiZWxcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtwYXJhbXMub25DaGFuZ2VdIC0gQ2FsbGJhY2sgb24gY2hhbmdlXG4gKiBAcGFyYW0ge051bWJlcn0gW3BhcmFtcy5zdGVwXSAtIEFtb3VudCBzdWJiZWQvYWRkZWQgb24gYXJyb3dEb3duL2Fycm93VXAgcHJlc3NcbiAqIEBwYXJhbSB7TnVtYmVyfSBbcGFyYW1zLmRwXSAtIERlY2ltYWwgcGxhY2VzIGRpc3BsYXllZFxuICogQHJldHVybnMge1BhbmVsfVxuICovXG5cblBhbmVsLnByb3RvdHlwZS5hZGRSYW5nZSA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KFJhbmdlLG9iamVjdCx2YWx1ZSxwYXJhbXMpO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbmV3IENoZWNrYm94IHRvIGxhc3QgYWRkZWQgU3ViR3JvdXAuXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IC0gVGhlIG9iamVjdFxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIC0gVGhlIHByb3BlcnR5IGtleVxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnNcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmxhYmVsPXZhbHVlXSAtIENoZWNrYm94IGxhYmVsXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbcGFyYW1zLm9uQ2hhbmdlXSAtIENhbGxiYWNrIG9uIGNoYW5nZVxuICogQHJldHVybnMge1BhbmVsfVxuICovXG5cblBhbmVsLnByb3RvdHlwZS5hZGRDaGVja2JveCA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KENoZWNrYm94LG9iamVjdCx2YWx1ZSxwYXJhbXMpO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbmV3IENvbG9yIG1vZGlmaWVyIHRvIGxhc3QgYWRkZWQgU3ViR3JvdXAuXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IC0gVGhlIG9iamVjdFxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIC0gVGhlIHByb3BlcnR5IGtleVxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnNcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmxhYmVsPXZhbHVlXSAtIENvbG9yIGxhYmVsXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbcGFyYW1zLm9uQ2hhbmdlXSAtIENhbGxiYWNrIG9uIGNoYW5nZVxuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMuY29sb3JNb2RlPSdyZ2InXSAtIFRoZSBjb2xvck1vZGUgdG8gYmUgdXNlZDogJ2hleCcgI2ZmMDBmZiwgJ3JnYicgWzI1NSwwLDI1NV0sICdyZ2JmdicgWzEsMCwxXVxuICogQHBhcmFtIHtBcnJheX0gW3BhcmFtcy5wcmVzZXRzXSAtIEEgc2V0IG9mIHByZXNldCBjb2xvcnMgbWF0Y2hpbmcgcGFyYW1zLmNvbG9yTW9kZVxuICogQHJldHVybnMge1BhbmVsfVxuICovXG5cblBhbmVsLnByb3RvdHlwZS5hZGRDb2xvciA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KENvbG9yLG9iamVjdCx2YWx1ZSwgcGFyYW1zKTtcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBCdXR0b24gdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cbiAqIEBwYXJhbSB7U3RyaW5nfSBsYWJlbCAtIFRoZSBvYmplY3RcbiAqIEBwYXJhbSB7RnVuY3Rpb259IG9uUHJlc3MgLSBDYWxsYmFja1xuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnNcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmxhYmVsPXZhbHVlXSAtIEJ1dHRvbiBsYWJlbFxuICogQHJldHVybnMge1BhbmVsfVxuICovXG5cblBhbmVsLnByb3RvdHlwZS5hZGRCdXR0b24gPSBmdW5jdGlvbiAobGFiZWwsIG9uUHJlc3MsIHBhcmFtcykge1xuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoQnV0dG9uLGxhYmVsLG9uUHJlc3MscGFyYW1zKTtcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBTZWxlY3QgdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBUaGUgb2JqZWN0XG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgLSBUaGUgcHJvcGVydHkga2V5XG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9dmFsdWVdIC0gQnV0dG9uIGxhYmVsXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbcGFyYW1zLm9uQ2hhbmdlXSAtIENhbGxiYWNrIG9uIGNoYW5nZSAtIGZ1bmN0aW9uKGluZGV4KXt9XG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy50YXJnZXRdIC0gVGhlIHByb3BlcnR5IHRvIGJlIHNldCBvbiBzZWxlY3RcbiAqIEByZXR1cm5zIHtQYW5lbH1cbiAqL1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkU2VsZWN0ID0gZnVuY3Rpb24gKG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoU2VsZWN0LG9iamVjdCx2YWx1ZSxwYXJhbXMpO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbmV3IFNsaWRlciB0byBsYXN0IGFkZGVkIFN1Ykdyb3VwLlxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCAtIFRoZSBvYmplY3RcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSAtIFRoZSBwcm9wZXJ0eSBrZXlcbiAqIEBwYXJhbSB7U3RyaW5nfSByYW5nZSAtIFRoZSBtaW4vbWF4IGFycmF5IGtleSB0byBiZSB1c2VkXG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9dmFsdWVdIC0gU2xpZGVyIGxhYmVsXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbcGFyYW1zLm9uQ2hhbmdlXSAtIENhbGxiYWNrIG9uIGNoYW5nZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gW3BhcmFtcy5vbkZpbmlzaF0gLSBDYWxsYmFjayBvbiBmaW5pc2hcbiAqIEBwYXJhbSB7TnVtYmVyfSBbcGFyYW1zLnN0ZXBdIC0gQW1vdW50IHN1YmJlZC9hZGRlZCBvbiBhcnJvd0Rvd24vYXJyb3dVcCBwcmVzcyBpbnNpZGUgdGhlIGlucHV0XG4gKiBAcGFyYW0ge051bWJlcn0gW3BhcmFtcy5kcF0gLSBEZWNpbWFsIHBsYWNlcyBkaXNwbGF5ZWRcbiAqIEByZXR1cm5zIHtQYW5lbH1cbiAqL1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkU2xpZGVyID0gZnVuY3Rpb24gKG9iamVjdCwgdmFsdWUsIHJhbmdlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KFNsaWRlcixvYmplY3QsdmFsdWUscmFuZ2UscGFyYW1zKTtcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBGdW5jdGlvblBsb3R0ZXIgdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBUaGUgb2JqZWN0XG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgLSBUaGUgcHJvcGVydHkga2V5IC0gZih4KSwgZih4LHkpXG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9dmFsdWVdIC0gRnVuY3Rpb25QbG90dGVyIGxhYmVsXG4gKiBAcmV0dXJucyB7UGFuZWx9XG4gKi9cblxuUGFuZWwucHJvdG90eXBlLmFkZEZ1bmN0aW9uUGxvdHRlciA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KEZ1bmN0aW9uUGxvdHRlcixvYmplY3QsdmFsdWUscGFyYW1zKTtcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBYWS1QYWQgdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBUaGUgb2JqZWN0XG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgLSBUaGUgcHJvcGVydHkga2V5XG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9dmFsdWVdIC0gUGFkIGxhYmVsXG4gKiBAcmV0dXJucyB7UGFuZWx9XG4gKi9cblxuUGFuZWwucHJvdG90eXBlLmFkZFBhZCA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KFBhZCxvYmplY3QsdmFsdWUscGFyYW1zKTtcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBWYWx1ZVBsb3R0ZXIgdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBUaGUgb2JqZWN0XG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgLSBUaGUgcHJvcGVydHkga2V5XG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9dmFsdWVdIC0gUGxvdHRlciBsYWJlbFxuICogQHBhcmFtIHtOdW1iZXJ9IFtwYXJhbXMuaGVpZ2h0XSAtIFBsb3R0ZXIgaGVpZ2h0XG4gKiBAcGFyYW0ge051bWJlcn0gW3BhcmFtcy5yZXNvbHV0aW9uXSAtIEdyYXBoIHJlc29sdXRpb25cbiAqIEByZXR1cm5zIHtQYW5lbH1cbiAqL1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkVmFsdWVQbG90dGVyID0gZnVuY3Rpb24gKG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoVmFsdWVQbG90dGVyLG9iamVjdCx2YWx1ZSxwYXJhbXMpO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbmV3IE51bWJlck91dHB1dCB0byBsYXN0IGFkZGVkIFN1Ykdyb3VwLlxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCAtIFRoZSBvYmplY3RcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSAtIFRoZSBwcm9wZXJ0eSBrZXlcbiAqIEBwYXJhbSB7T2JqZWN0fSBbcGFyYW1zXSAtIENvbXBvbmVudCBvcHRpb25zXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy5sYWJlbD12YWx1ZV0gLSBPdXRwdXQgbGFiZWxcbiAqIEBwYXJhbSB7TnVtYmVyfSBbcGFyYW1zLmRwXSAtIERlY2ltYWwgcGxhY2VzIGRpc3BsYXllZFxuICogQHJldHVybnMge1BhbmVsfVxuICovXG5cblBhbmVsLnByb3RvdHlwZS5hZGROdW1iZXJPdXRwdXQgPSBmdW5jdGlvbiAob2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChOdW1iZXJPdXRwdXQsb2JqZWN0LHZhbHVlLHBhcmFtcyk7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBuZXcgU3RyaW5nT3V0cHV0IHRvIGxhc3QgYWRkZWQgU3ViR3JvdXAuXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IC0gVGhlIG9iamVjdFxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIC0gVGhlIHByb3BlcnR5IGtleVxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnNcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmxhYmVsPXZhbHVlXSAtIE91dHB1dCBsYWJlbFxuICogQHJldHVybnMge1BhbmVsfVxuICovXG5cblBhbmVsLnByb3RvdHlwZS5hZGRTdHJpbmdPdXRwdXQgPSBmdW5jdGlvbiAob2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChTdHJpbmdPdXRwdXQsb2JqZWN0LHZhbHVlLHBhcmFtcyk7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkQ2FudmFzID0gZnVuY3Rpb24gKHBhcmFtcykge1xuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoQ2FudmFzXyxwYXJhbXMpO1xufTtcblxuUGFuZWwucHJvdG90eXBlLmFkZFNWRyA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KFNWR18scGFyYW1zKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5zZXREYXRhID0gZnVuY3Rpb24oZGF0YSl7XG4gICAgdmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcyxcbiAgICAgICAgaSA9IC0xLCBsID0gZ3JvdXBzLmxlbmd0aDtcbiAgICB3aGlsZSgrK2kgPCBsKXtcbiAgICAgICAgZ3JvdXBzW2ldLnNldERhdGEoZGF0YVtpXSk7XG4gICAgfVxufTtcblxuUGFuZWwucHJvdG90eXBlLmdldERhdGEgPSBmdW5jdGlvbigpe1xuICAgIHZhciBncm91cHMgPSB0aGlzLl9ncm91cHMsXG4gICAgICAgIGkgPSAtMSwgbCA9IGdyb3Vwcy5sZW5ndGg7XG4gICAgdmFyIGRhdGEgPSBbXTtcbiAgICB3aGlsZSgrK2kgIDwgbCl7XG4gICAgICAgIGRhdGEucHVzaChncm91cHNbaV0uZ2V0RGF0YSgpKTtcbiAgICB9XG4gICAgcmV0dXJuIGRhdGE7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBhbmVsOyIsInZhciBQYW5lbEV2ZW50ID0ge1xuXHRQQU5FTF9NT1ZFX0JFR0lOICAgICAgICAgIDogJ3BhbmVsTW92ZUJlZ2luJyxcblx0UEFORUxfTU9WRSAgICAgICAgICAgICAgICA6ICdwYW5lbE1vdmUnLFxuXHRQQU5FTF9NT1ZFX0VORCAgICAgICAgICAgIDogJ3BhbmVsTW92ZUVuZCcsXG5cblx0UEFORUxfU0hPVyAgICAgICAgICAgICAgICA6ICdwYW5lbFNob3cnLFxuXHRQQU5FTF9ISURFICAgICAgICAgICAgICAgIDogJ3BhbmVsSGlkZScsXG5cblx0UEFORUxfU0NST0xMX1dSQVBfQURERUQgICA6ICdwYW5lbFNjcm9sbFdyYXBBZGRlZCcsXG5cdFBBTkVMX1NDUk9MTF9XUkFQX1JFTU9WRUQgOiAncGFuZWxTY3JvbGxXcmFwUmVtb3ZlZCcsXG5cblx0UEFORUxfU0laRV9DSEFOR0UgICAgICAgIDogJ3BhbmVsU2l6ZUNoYW5nZSdcbn07XG5tb2R1bGUuZXhwb3J0cyA9IFBhbmVsRXZlbnQ7IiwidmFyIEFic3RyYWN0R3JvdXAgPSByZXF1aXJlKCcuL0Fic3RyYWN0R3JvdXAnKTtcbnZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XG52YXIgQ1NTICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG5cbnZhciBFdmVudF8gICAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcbiAgICBEb2N1bWVudEV2ZW50ICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxuICAgIFBhbmVsRXZlbnQgICAgID0gcmVxdWlyZSgnLi9QYW5lbEV2ZW50JyksXG4gICAgR3JvdXBFdmVudCAgICAgPSByZXF1aXJlKCcuL0dyb3VwRXZlbnQnKSxcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKTtcblxuZnVuY3Rpb24gU3ViR3JvdXAocGFyZW50LHBhcmFtcyl7XG4gICAgcGFyYW1zICAgICAgICAgICAgPSBwYXJhbXMgICAgICAgICAgfHwge307XG4gICAgcGFyYW1zLmxhYmVsICAgICAgPSBwYXJhbXMubGFiZWwgICAgfHwgbnVsbDtcbiAgICBwYXJhbXMudXNlTGFiZWxzICA9IHBhcmFtcy51c2VMYWJlbHMgID09PSB1bmRlZmluZWQgPyB0cnVlIDogcGFyYW1zLnVzZUxhYmVscztcblxuICAgIEFic3RyYWN0R3JvdXAuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG4gICAgdmFyIHJvb3ROb2RlID0gdGhpcy5fbm9kZSxcbiAgICAgICAgd3JhcE5vZGUgPSB0aGlzLl93cmFwTm9kZSxcbiAgICAgICAgbGlzdE5vZGUgPSB0aGlzLl9saXN0Tm9kZTtcblxuICAgICAgICByb290Tm9kZS5zZXRTdHlsZUNsYXNzKENTUy5TdWJHcm91cCk7XG4gICAgICAgIHdyYXBOb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApO1xuXG4gICAgICAgIHdyYXBOb2RlLmFkZENoaWxkKGxpc3ROb2RlKTtcbiAgICAgICAgcm9vdE5vZGUuYWRkQ2hpbGQod3JhcE5vZGUpO1xuXG4gICAgdGhpcy5fdXNlTGFiZWxzICA9IHBhcmFtcy51c2VMYWJlbHM7XG5cbiAgICB2YXIgbGFiZWwgPSBwYXJhbXMubGFiZWw7XG5cbiAgICBpZiAobGFiZWwgJiYgbGFiZWwubGVuZ3RoICE9IDAgJiYgbGFiZWwgIT0gJ25vbmUnKSB7XG4gICAgICAgIHZhciBoZWFkTm9kZSA9IHRoaXMuX2hlYWROb2RlID0gbmV3IE5vZGUoKSxcbiAgICAgICAgICAgIGxhYmxXcmFwID0gbmV3IE5vZGUoKSxcbiAgICAgICAgICAgIGxhYmxOb2RlID0gbmV3IE5vZGUoTm9kZS5TUEFOKTtcblxuICAgICAgICBoZWFkTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5IZWFkKTtcbiAgICAgICAgbGFibFdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCk7XG4gICAgICAgIGxhYmxOb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKTtcblxuICAgICAgICBsYWJsTm9kZS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywgbGFiZWwpO1xuXG4gICAgICAgIGxhYmxXcmFwLmFkZENoaWxkKGxhYmxOb2RlKTtcbiAgICAgICAgaGVhZE5vZGUuYWRkQ2hpbGQobGFibFdyYXApO1xuXG5cbiAgICAgICAgdmFyIGluZGlOb2RlID0gdGhpcy5faW5kaU5vZGUgPSBuZXcgTm9kZSgpO1xuICAgICAgICBpbmRpTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5BcnJvd0JTdWJNYXgpO1xuICAgICAgICBoZWFkTm9kZS5hZGRDaGlsZEF0KGluZGlOb2RlLCAwKTtcblxuICAgICAgICByb290Tm9kZS5hZGRDaGlsZEF0KGhlYWROb2RlLCAwKTtcblxuICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5TVUJHUk9VUF9UUklHR0VSLCB0aGlzLl9wYXJlbnQsICdvblN1Ykdyb3VwVHJpZ2dlcicpO1xuICAgICAgICBoZWFkTm9kZS5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25IZWFkTW91c2VEb3duLmJpbmQodGhpcykpO1xuXG4gICAgICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcblxuICAgIH1cblxuICAgIGlmKHRoaXMuaGFzTWF4SGVpZ2h0KCkpe1xuICAgICAgICB0aGlzLmFkZFNjcm9sbFdyYXAoKTtcbiAgICB9XG5cbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LlNVQkdST1VQX0VOQUJMRSwgIHRoaXMsICdvbkVuYWJsZScpO1xuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuU1VCR1JPVVBfRElTQUJMRSwgdGhpcywgJ29uRGlzYWJsZScpO1xuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKFBhbmVsRXZlbnQuUEFORUxfTU9WRV9FTkQsICAgdGhpcywgJ29uUGFuZWxNb3ZlRW5kJyk7XG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSx0aGlzLCAnb25Hcm91cFNpemVDaGFuZ2UnKTtcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihQYW5lbEV2ZW50LlBBTkVMX1NJWkVfQ0hBTkdFLHRoaXMsICdvblBhbmVsU2l6ZUNoYW5nZScpO1xuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuV0lORE9XX1JFU0laRSwgICAgdGhpcywgJ29uV2luZG93UmVzaXplJyk7XG5cbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5HUk9VUF9TSVpFX1VQREFURSx0aGlzLl9wYXJlbnQsJ29uR3JvdXBTaXplVXBkYXRlJyk7XG59XG5TdWJHcm91cC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEFic3RyYWN0R3JvdXAucHJvdG90eXBlKTtcblN1Ykdyb3VwLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFN1Ykdyb3VwO1xuXG4vL0ZJWE1FXG5TdWJHcm91cC5wcm90b3R5cGUuX29uSGVhZE1vdXNlRG93biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9lbmFibGVkID0gIXRoaXMuX2VuYWJsZWQ7XG4gICAgdGhpcy5fb25UcmlnZ2VyKCk7XG5cbiAgICB2YXIgZXZlbnQgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX1VQLFxuICAgICAgICBzZWxmICA9IHRoaXM7XG4gICAgdmFyIG9uRG9jdW1lbnRNb3VzZVVwID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBzZWxmLl9vblRyaWdnZXIoKTtcbiAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudCwgb25Eb2N1bWVudE1vdXNlVXApO1xuICAgIH07XG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50LG9uRG9jdW1lbnRNb3VzZVVwKTtcbn07XG5cblN1Ykdyb3VwLnByb3RvdHlwZS5fb25UcmlnZ2VyID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsR3JvdXBFdmVudC5TVUJHUk9VUF9UUklHR0VSLG51bGwpKTtcbn07XG5cblxuU3ViR3JvdXAucHJvdG90eXBlLl91cGRhdGVBcHBlYXJhbmNlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmlzRGlzYWJsZWQoKSkge1xuICAgICAgICB0aGlzLl93cmFwTm9kZS5zZXRIZWlnaHQoMCk7XG4gICAgICAgIGlmICh0aGlzLmhhc0xhYmVsKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2hlYWROb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkhlYWRJbmFjdGl2ZSk7XG4gICAgICAgICAgICB0aGlzLl9pbmRpTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5BcnJvd0JTdWJNaW4pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBpZiAodGhpcy5oYXNNYXhIZWlnaHQoKSkge1xuICAgICAgICAgICAgdGhpcy5fd3JhcE5vZGUuc2V0SGVpZ2h0KHRoaXMuZ2V0TWF4SGVpZ2h0KCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fd3JhcE5vZGUuZGVsZXRlU3R5bGVQcm9wZXJ0eSgnaGVpZ2h0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuaGFzTGFiZWwoKSkge1xuICAgICAgICAgICAgdGhpcy5faGVhZE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuSGVhZCk7XG4gICAgICAgICAgICB0aGlzLl9pbmRpTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5BcnJvd0JTdWJNYXgpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuU3ViR3JvdXAucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5oYXNNYXhIZWlnaHQoKSl7XG4gICAgICAgIHRoaXMuX3Njcm9sbEJhci51cGRhdGUoKTtcbiAgICB9XG59O1xuXG5TdWJHcm91cC5wcm90b3R5cGUub25Db21wb25lbnRTZWxlY3REcmFnID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMucHJldmVudFNlbGVjdERyYWcoKTtcbn07XG5cblN1Ykdyb3VwLnByb3RvdHlwZS5vbkVuYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5pc0Rpc2FibGVkKCkpe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LkVOQUJMRSwgbnVsbCkpO1xufTtcblN1Ykdyb3VwLnByb3RvdHlwZS5vbkRpc2FibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuaXNEaXNhYmxlZCgpKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBDb21wb25lbnRFdmVudC5ESVNBQkxFLCBudWxsKSk7XG59O1xuXG4vL2J1YmJsZVxuU3ViR3JvdXAucHJvdG90eXBlLm9uR3JvdXBTaXplQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UsIG51bGwpKTtcbn07XG5TdWJHcm91cC5wcm90b3R5cGUub25Hcm91cFNpemVVcGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgR3JvdXBFdmVudC5HUk9VUF9TSVpFX1VQREFURSwgbnVsbCkpO1xufTtcblN1Ykdyb3VwLnByb3RvdHlwZS5vblBhbmVsTW92ZUVuZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX01PVkVfRU5ELCBudWxsKSk7XG59O1xuU3ViR3JvdXAucHJvdG90eXBlLm9uUGFuZWxTaXplQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbn07XG5TdWJHcm91cC5wcm90b3R5cGUub25XaW5kb3dSZXNpemUgPSBmdW5jdGlvbiAoZSkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChlKTtcbn07XG5cblN1Ykdyb3VwLnByb3RvdHlwZS5oYXNMYWJlbCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5faGVhZE5vZGUgIT0gbnVsbDtcbn07XG5TdWJHcm91cC5wcm90b3R5cGUuYWRkQ29tcG9uZW50Tm9kZSA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgdGhpcy5fbGlzdE5vZGUuYWRkQ2hpbGQobm9kZSk7XG59O1xuU3ViR3JvdXAucHJvdG90eXBlLnVzZXNMYWJlbHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3VzZUxhYmVscztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU3ViR3JvdXA7Il19
(1)
});
