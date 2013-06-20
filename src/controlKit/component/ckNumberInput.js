ControlKit.NumberInput = function(parent,object,value,params)
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
                                                                  null,
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
            inputWrap.setStyleClass(ControlKit.CSS.WrapInputWPreset);

        wrapNode.addChild(inputWrap);
        inputWrap.addChild(input.getNode());

        var presets = this._object[this._presetsKey];

        var options   = ControlKit.Options.getInstance();
        var presetBtn = this._presetBtn = new ControlKit.PresetBtn(this._wrapNode);

        var onPresetDeactivate = function(){options.clear();presetBtn.deactivate();};

        var self = this;
        var onPresetActivate = function()
        {
            options.build(presets,input.getValue(),input.getNode(),
                          function(){input.setValue(presets[options.getSelectedIndex()]);
                                     self.applyValue();},
                          onPresetDeactivate,ControlKit.Metric.PADDING_PRESET,
                          false);
        };

        presetBtn.setOnActive(onPresetActivate);
        presetBtn.setOnDeactive(onPresetDeactivate)
    }

    input.getNode().addEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onInputDragStart.bind(this));
    this.addEventListener(ControlKit.EventType.INPUT_SELECT_DRAG,ControlKit.getKitInstance(),'onInputSelectDrag');

    input.setValue(this._object[this._key]);
};

ControlKit.NumberInput.prototype = Object.create(ControlKit.ObjectComponent.prototype);

ControlKit.NumberInput.prototype._onInputChange = function(){this.applyValue();this._onChange();};
ControlKit.NumberInput.prototype._onInputFinish = function(){this.applyValue();this._onFinish();};

ControlKit.NumberInput.prototype.applyValue = function()
{
    this.pushHistoryState();
    this._object[this._key] = this._input.getValue();
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.VALUE_UPDATED,null));
};


ControlKit.NumberInput.prototype.onValueUpdate = function(e)
{
    if(e.data.origin == this)return;
    this._input.setValue(this._object[this._key]);
};

//Prevent chrome select drag
ControlKit.NumberInput.prototype._onInputDragStart = function()
{
    var eventMove = ControlKit.DocumentEventType.MOUSE_MOVE,
        eventUp   = ControlKit.DocumentEventType.MOUSE_UP;

    var event = ControlKit.EventType.INPUT_SELECT_DRAG;

    var self  = this;

    var onDrag       = function()
        {
            self.dispatchEvent(new ControlKit.Event(this,event,null));
        },

        onDragFinish = function()
        {
            self.dispatchEvent(new ControlKit.Event(this,event,null));

            document.removeEventListener(eventMove, onDrag,       false);
            document.removeEventListener(eventMove, onDragFinish, false);
        };

    this.dispatchEvent(new ControlKit.Event(this,event,null));

    document.addEventListener(eventMove, onDrag,       false);
    document.addEventListener(eventUp,   onDragFinish, false);
};