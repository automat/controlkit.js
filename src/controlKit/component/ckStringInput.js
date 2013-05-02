function CKStringInput(parent,object,value,label,params)
{
    CKObjectComponent.apply(this,arguments);

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

    var input = this._input = new CKNode(CKNodeType.INPUT_TEXT);

    var wrapNode = this._wrapNode;

    if(!this._presetsKey)
    {
        wrapNode.addChild(input);
    }
    else
    {
        var inputWrap = new CKNode(CKNodeType.DIV);
        inputWrap.setStyleClass(CKCSS.InputWPresetWrap);

        wrapNode.addChild(inputWrap);
        inputWrap.addChild(input);

        var presets = this._presets   = this._object[this._presetsKey],
            obj     = this._object,
            key     = this._key;

        var options   = CKOptions.getInstance();
        var presetBtn = this._presetBtn = new CKPresetBtn(this._wrapNode);

        var onPresetDeactivate = function(){options.clear();presetBtn.deactivate();};

        var self = this;
        var onPresetActivate = function()
        {
            options.build(presets,input.getProperty('value'),input,
                function(){input.setProperty('value',presets[options.getSelectedIndex()]);
                           self._updateValue();},
                onPresetDeactivate);
        };

        presetBtn.setCallbackActive(onPresetActivate);
        presetBtn.setCallbackInactive(onPresetDeactivate)
    }

    input.setProperty('value',this._object[this._key]);

    input.setEventListener(CKNodeEventType.KEY_UP, this._onInputKeyUp.bind(this));
    input.setEventListener(CKNodeEventType.CHANGE, this._onInputChange.bind(this));

}

CKStringInput.prototype = Object.create(CKObjectComponent.prototype);

CKStringInput.prototype._onInputKeyUp  = function(){this._updateValue();this._onChange();};
CKStringInput.prototype._onInputChange = function(){this._updateValue();this._onFinish();};


CKStringInput.prototype._updateValue = function()
{
    this._object[this._key] = this._input.getProperty('value');
    this.dispatchEvent(new CKEvent(this,CKEventType.VALUE_UPDATED));
};

CKStringInput.prototype.onValueUpdate = function(e)
{
    if(e.data.origin == this)return;
    this._input.setProperty('value',this._object[this._key]);
};

