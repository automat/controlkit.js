ControlKit.NumberInput = function(parent,object,value,label,params)
{
    ControlKit.ObjectComponent.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params          = params || {};
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || this._onFinish;
    params.dp       = params.dp       || 2;
    params.step     = params.step     || 1;
    params.presets  = params.presets  || null;

    /*---------------------------------------------------------------------------------*/

    this._onChange    = params.onChange;
    this._onFinish    = params.onFinish;

    this._presetsKey  = params.presets;

    /*---------------------------------------------------------------------------------*/

    var input = this._input = new ControlKit.NumberInput_Internal(params.step,
                                                                    params.dp,
                                                                    this._onInputChange.bind(this),
                                                                    this._onInputFinish.bind(this));

    var wrapNode = this._wrapNode;

    if(!this._presetsKey)
    {
        wrapNode.addChild(input.getNode());
    }
    else
    {
        var inputWrap = new ControlKit.Node(ControlKit.NodeType.DIV);
            inputWrap.setStyleClass(ControlKit.CSS.InputWPresetWrap);

        wrapNode.addChild(inputWrap);
        inputWrap.addChild(input.getNode());

        var presets = this._presets   = this._object[this._presetsKey],
            obj     = this._object,
            key     = this._key;

        var options   = ControlKit.Options.getInstance();
        var presetBtn = this._presetBtn = new ControlKit.PresetBtn(this._wrapNode);

        var onPresetDeactivate = function(){options.clear();presetBtn.deactivate();};

        var self = this;
        var onPresetActivate = function()
        {
            options.build(presets,input.getValue(),input.getNode(),
                          function(){input.setValue(presets[options.getSelectedIndex()]);
                                     self._updateValue();},
                          onPresetDeactivate,20);
        };

        presetBtn.setCallbackActive(onPresetActivate);
        presetBtn.setCallbackInactive(onPresetDeactivate)
    }

    input.setValue(this._object[this._key]);
}

ControlKit.NumberInput.prototype = Object.create(ControlKit.ObjectComponent.prototype);

ControlKit.NumberInput.prototype._onInputChange = function(){this._updateValue();this._onChange();};
ControlKit.NumberInput.prototype._onInputFinish = function(){this._updateValue();this._onFinish();};

ControlKit.NumberInput.prototype._updateValue = function()
{
    this._object[this._key] = this._input.getValue();
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.VALUE_UPDATED));
};

ControlKit.NumberInput.prototype.onValueUpdate = function(e)
{
    if(e.data.origin == this)return;
    this._input.setValue(this._object[this._key]);
};
