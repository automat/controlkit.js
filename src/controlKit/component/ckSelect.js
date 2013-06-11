ControlKit.Select = function(parent,object,value,target,params)
{
    ControlKit.ObjectComponent.apply(this,[parent,object,value,params]);

    /*---------------------------------------------------------------------------------*/

    params = params || {};
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || this._onFinish;

    /*---------------------------------------------------------------------------------*/

    this._onChange    = params.onChange;
    this._onFinish    = params.onFinish;

    var obj    = this._object,
        key    = this._key;

    var targetKey = this._targetKey = target,
        values    = this._values = obj[key],
        targetObj = obj[targetKey] || '';

    var wrapNode = this._wrapNode;

    /*---------------------------------------------------------------------------------*/

    this._isColorSelect = false;
    var regex = /^#[0-9A-F]{6}$/i,i = -1;

    if(regex.test(obj[targetKey]))
    {
        while(++i<values.length){if(!regex.test(values[i]))break;}
        this._isColorSelect = true;
    }

    this._selected  = null;
    var select;

    /*---------------------------------------------------------------------------------*/

    var onTrigger = this._onSelectTrigger.bind(this);

    //FIXME + Add [r,g,b] + [h,s,v], - anonymous funcs

    if(this.isColorSelect())
    {


        select = this._select = new ControlKit.Node(ControlKit.NodeType.DIV);
        select.setStyleClass(ControlKit.CSS.SelectColor);

        var colorSelected = obj[targetKey];

        var color = select.addChild(new ControlKit.Node(ControlKit.NodeType.DIV));
            color.setProperty('innerHTML', colorSelected);
            color.getStyle().backgroundColor = colorSelected;
            color.getStyle().backgroundImage = 'linear-gradient( rgba(0,0,0,0) 0%, rgba(0,0,0,0.1) 100%)';



        var self = this;

        var onPickerPick   = function()
                             {
                                 var options = ControlKit.Options.getInstance(),
                                     picker  = ControlKit.Picker.getInstance();

                                 colorSelected = obj[targetKey] = values[options.getSelectedIndex()] = picker.getHEX();

                                 color.setProperty('innerHTML', colorSelected);
                                 color.getStyle().backgroundColor = colorSelected;
                                 color.getStyle().backgroundImage = 'linear-gradient( rgba(0,0,0,0) 0%, rgba(0,0,0,0.1) 100%)';



                             },
            onColorTrigger = function()
                             {
                                 var picker = ControlKit.Picker.getInstance();
                                     picker.setColorHEX(obj[targetKey]);
                                     picker.setCallbackPick(onPickerPick);
                                     picker.open();
                             };

            color.setEventListener(ControlKit.NodeEventType.MOUSE_DOWN,onColorTrigger);

        var btn = this._selectBtn = new ControlKit.PresetBtn(wrapNode);
            btn.setCallbackActive(onTrigger);

    }
    else
    {
        select = this._select = new ControlKit.Node(ControlKit.NodeType.INPUT_BUTTON);
        select.setStyleClass(ControlKit.CSS.Select);

        select.setEventListener(ControlKit.NodeEventType.MOUSE_DOWN,onTrigger);
    }

    i = -1;
    while(++i < values.length){if(targetObj == values[i])this._selected = values[i];}
    select.setProperty('value',targetObj.toString().length > 0 ? targetObj : values[0]);

    wrapNode.addChild(select);

    /*---------------------------------------------------------------------------------*/

    var kit = ControlKit.getKitInstance();
    kit.addEventListener(ControlKit.EventType.TRIGGER_SELECT,   this,'onSelectTrigger');
    this.addEventListener(ControlKit.EventType.SELECT_TRIGGERED,kit, 'onSelectTriggered');

};

ControlKit.Select.prototype = Object.create(ControlKit.ObjectComponent.prototype);

ControlKit.Select.prototype._getOptionsIndex = function(option)
{

};

ControlKit.Select.prototype.onSelectTrigger = function (e)
{
    if (e.data.origin == this) {

        this._active = !this._active;
        this._updateAppearance();

        if (this._active){this._buildOptions();}
        else{ControlKit.Options.getInstance().clear();}

        return;
    }

    this._active = false;
    this._updateAppearance();

};

ControlKit.Select.prototype._buildOptions = function()
{
    var options = ControlKit.Options.getInstance();



    options.build(this._values,
                  this._selected,
                  this._select,
                  function ()
                  {
                      this.applyValue();

                      this._active = false;
                      this._updateAppearance();
                      options.clear();

                  }.bind(this),
                  function()
                  {
                      this._active = false;
                      this._updateAppearance();
                      options.clear();

                  }.bind(this),
                  this.isColorSelect());

};


ControlKit.Select.prototype.applyValue = function()
{
    this.pushHistoryState();

    var selectedIndex = ControlKit.Options.getInstance().getSelectedIndex(),
        selected = this._selected = this._object[this._targetKey] = this._values[selectedIndex];

    if(this._isColorSelect)
    {
        var color = this._select.getFirstChild();

        color.setProperty('innerHTML',selected);
        color.getStyle().backgroundColor = selected;
        color.getStyle().backgroundImage = 'linear-gradient( rgba(0,0,0,0) 0%, rgba(0,0,0,0.1) 100%)';
    }
    else
    {
        this._select.setProperty('value',selected);
    }

    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.VALUE_UPDATED,null));
};

ControlKit.Select.prototype.pushHistoryState = function(){var obj = this._object,key = this._targetKey;ControlKit.History.getInstance().pushState(obj,key,obj[key]);};

ControlKit.Select.prototype._onSelectTrigger = function()
{
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.SELECT_TRIGGERED,null));
};

ControlKit.Select.prototype.isColorSelect = function(){return this._isColorSelect;};

ControlKit.Select.prototype._updateAppearance = function()
{
    if(this.isColorSelect()){if(!this._active)this._selectBtn.deactivate();}
    else { this._select.setStyleClass(this._active ? ControlKit.CSS.SelectActive : ControlKit.CSS.Select);}
};


ControlKit.Select.prototype.onValueUpdate = function(e)
{
    this._selected = this._object[this._targetKey];
    this._select.setProperty('value',this._selected.toString());
};