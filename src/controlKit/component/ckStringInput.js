ControlKit.CKStringInput = function(parent,object,value,label,params)
{
    ControlKit.CKObjectComponent.apply(this,arguments);

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

    var input = this._input = new ControlKit.CKNode(ControlKit.CKNodeType.INPUT_TEXT);

    var wrapNode = this._wrapNode;

    if(!this._presetsKey)
    {
        wrapNode.addChild(input);
    }
    else
    {
        var inputWrap = new ControlKit.CKNode(ControlKit.CKNodeType.DIV);
        inputWrap.setStyleClass(ControlKit.CKCSS.InputWPresetWrap);

        wrapNode.addChild(inputWrap);
        inputWrap.addChild(input);

        var presets = this._presets   = this._object[this._presetsKey],
            obj     = this._object,
            key     = this._key;

        var options   = ControlKit.CKOptions.getInstance();
        var presetBtn = this._presetBtn = new ControlKit.CKPresetBtn(this._wrapNode);

        var onPresetDeactivate = function(){options.clear();presetBtn.deactivate();};

        var self = this;
        var onPresetActivate = function()
        {
            options.build(presets,input.getProperty('value'),input,
                function(){input.setProperty('value',presets[options.getSelectedIndex()]);
                           self._updateValue();},
                onPresetDeactivate,20);
        };

        presetBtn.setCallbackActive(onPresetActivate);
        presetBtn.setCallbackInactive(onPresetDeactivate)
    }

    input.setProperty('value',this._object[this._key]);

    input.setEventListener(ControlKit.CKNodeEventType.KEY_UP, this._onInputKeyUp.bind(this));
    input.setEventListener(ControlKit.CKNodeEventType.CHANGE, this._onInputChange.bind(this));

}

ControlKit.CKStringInput.prototype = Object.create(ControlKit.CKObjectComponent.prototype);

ControlKit.CKStringInput.prototype._onInputKeyUp  = function(){this._updateValue();this._onChange();};
ControlKit.CKStringInput.prototype._onInputChange = function(){this._updateValue();this._onFinish();};


ControlKit.CKStringInput.prototype._updateValue = function()
{
    this._object[this._key] = this._input.getProperty('value');
    this.dispatchEvent(new ControlKit.CKEvent(this,ControlKit.CKEventType.VALUE_UPDATED));
};

ControlKit.CKStringInput.prototype.onValueUpdate = function(e)
{
    if(e.data.origin == this)return;
    this._input.setProperty('value',this._object[this._key]);
};

