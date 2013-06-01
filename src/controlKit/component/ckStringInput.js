ControlKit.StringInput = function(parent,object,value,params)
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


