ControlKit.StringInput = function(parent,object,value,label,params)
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

        var presets = this._presets   = this._object[this._presetsKey],
            obj     = this._object,
            key     = this._key;

        var options   = ControlKit.Options.getInstance();
        var presetBtn = this._presetBtn = new ControlKit.PresetBtn(this._wrapNode);

        var onPresetDeactivate = function(){options.clear();presetBtn.deactivate();};

        var self = this;
        var onPresetActivate = function()
        {
            options.build(presets,input.getProperty('value'),input,
                          function(){input.setProperty('value',presets[options.getSelectedIndex()]);
                                     self._updateValue();},
                          onPresetDeactivate,ControlKit.Constant.PADDING_PRESET);
        };

        presetBtn.setCallbackActive(onPresetActivate);
        presetBtn.setCallbackInactive(onPresetDeactivate)
    }

    input.setProperty('value',this._object[this._key]);

    input.setEventListener(ControlKit.NodeEventType.KEY_UP, this._onInputKeyUp.bind(this));
    input.setEventListener(ControlKit.NodeEventType.CHANGE, this._onInputChange.bind(this));





    //input.setEventListener(ControlKit.NodeEventType.MOUSE_DOWN, this._onInputMouseDown.bind(this));

};

ControlKit.StringInput.prototype = Object.create(ControlKit.ObjectComponent.prototype);

ControlKit.StringInput.prototype._onInputKeyUp  = function(){this._updateValue();this._onChange();};
ControlKit.StringInput.prototype._onInputChange = function(){this._updateValue();this._onFinish();};


ControlKit.StringInput.prototype._updateValue = function()
{
    this._object[this._key] = this._input.getProperty('value');
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.VALUE_UPDATED));
};

ControlKit.StringInput.prototype.onValueUpdate = function(e)
{
    if(e.data.origin == this)return;
    this._input.setProperty('value',this._object[this._key]);
};

ControlKit.StringInput.prototype._onInputMouseDown = function(e)
{
    var input = this._input,
        body  = document.body;

    var eventMouseMove = ControlKit.DocumentEventType.MOUSE_MOVE,
        eventMouseUp   = ControlKit.DocumentEventType.MOUSE_UP,
        eventMouseOut  = ControlKit.DocumentEventType.MOUSE_OUT;



    /*
    var disablePointer = function()
    {
        input.setStyleProperty('pointerEvents','none');
        input.setStyleProperty('display',      'none');

        setTimeout(function(){input.setStyleProperty('display','');},0);

        body.removeEventListener(eventMouseMove,disablePointer);
    };

    var enablePointer = function()
    {
        if(input.getStyleProperty('pointerEvents') === 'none')
        {
            input.setStyleProperty('pointerEvents','');
        }
        else
        {
            body.removeEventListener(eventMouseMove,disablePointer);
        }

        body.removeEventListener(eventMouseUp, enablePointer);
        body.removeEventListener(eventMouseOut,enablePointer);

    };


    body.addEventListener(eventMouseMove,disablePointer);
    body.addEventListener(eventMouseUp,  enablePointer);
    body.addEventListener(eventMouseOut, enablePointer);
     */
};

