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
                                     self.applyValue();},
                          onPresetDeactivate,ControlKit.Constant.PADDING_PRESET);
        };

        presetBtn.setCallbackActive(onPresetActivate);
        presetBtn.setCallbackInactive(onPresetDeactivate)
    }

    input.setProperty('value',this._object[this._key]);

    input.setEventListener(ControlKit.NodeEventType.KEY_UP, this._onInputKeyUp.bind(this));
    input.setEventListener(ControlKit.NodeEventType.CHANGE, this._onInputChange.bind(this));

    /*---------------------------------------------------------------------------------*/

    //prevent chrome drag scroll TODO:Move to Input
    //input.setEventListener(ControlKit.NodeEventType.MOUSE_DOWN, this._onInputDragStart.bind(this));

    /*
    this.addEventListener( ControlKit.EventType.INPUT_SELECTDRAG_START,this._parent,'onSelectDragStart');
    this.addEventListener( ControlKit.EventType.INPUT_SELECTDRAG,      this._parent,'onSelectDrag');
    this.addEventListener( ControlKit.EventType.INPUT_SELECTDRAG_END,  this._parent,'onSelectDragEnd');
    */
};

ControlKit.StringInput.prototype = Object.create(ControlKit.ObjectComponent.prototype);

ControlKit.StringInput.prototype._onInputKeyUp  = function(){this.applyValue();this._onChange();};
ControlKit.StringInput.prototype._onInputChange = function(){this.applyValue();this._onFinish();};


ControlKit.StringInput.prototype.applyValue = function()
{
    this.pushHistoryState();
    this._object[this._key] = this._input.getProperty('value');
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.VALUE_UPDATED,null));
};

ControlKit.StringInput.prototype.onValueUpdate = function(e)
{
    if(e.data.origin == this)return;
    this._input.setProperty('value',this._object[this._key]);
};

ControlKit.StringInput.prototype._onInputDragStart = function()
{
    var eventMouseMove = ControlKit.DocumentEventType.MOUSE_MOVE,
        eventMouseUp   = ControlKit.DocumentEventType.MOUSE_UP;

    var eventDragStart = ControlKit.EventType.INPUT_SELECTDRAG_START,
        eventDrag      = ControlKit.EventType.INPUT_SELECTDRAG,
        eventDragEnd   = ControlKit.EventType.INPUT_SELECTDRAG_END;

    var self = this;

    var onDrag = function()
    {
        self.dispatchEvent(new ControlKit.Event(self,eventDrag,null));
    };

    var onDragEnd = function()
    {
        document.removeEventListener(eventMouseMove, onDrag,    false);
        document.removeEventListener(eventMouseUp,   onDragEnd, false);

        self.dispatchEvent(new ControlKit.Event(self,eventDragEnd,null));
    };


    document.addEventListener(eventMouseMove,onDrag,   false);
    document.addEventListener(eventMouseUp,  onDragEnd,false);

    this.dispatchEvent(new ControlKit.Event(this,eventDragStart,null));
};

