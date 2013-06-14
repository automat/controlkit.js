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

    this._selected  = null;

    var select  = this._select = new ControlKit.Node(ControlKit.NodeType.INPUT_BUTTON);
    select.setStyleClass(ControlKit.CSS.Select);
    select.setEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onSelectTrigger.bind(this));

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

    var onSelect    = function()
                      {
                          this.applyValue();
                          this._active = false;
                          this._updateAppearance();
                          options.clear();

                      }.bind(this);

    var onSelectOut = function()
                      {
                          this._active = false;
                          this._updateAppearance();
                          options.clear();

                      }.bind(this);


    options.build(this._values,this._selected,this._select,onSelect,onSelectOut,false);

};


ControlKit.Select.prototype.applyValue = function()
{
    this.pushHistoryState();

    var selectedIndex = ControlKit.Options.getInstance().getSelectedIndex(),
        selected = this._selected = this._object[this._targetKey] = this._values[selectedIndex];

    this._select.setProperty('value',selected);

    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.VALUE_UPDATED,null));
};

ControlKit.Select.prototype.pushHistoryState = function(){var obj = this._object,key = this._targetKey;ControlKit.History.getInstance().pushState(obj,key,obj[key]);};

ControlKit.Select.prototype._onSelectTrigger = function()
{
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.SELECT_TRIGGERED,null));
};

ControlKit.Select.prototype._updateAppearance = function()
{
    this._select.setStyleClass(this._active ? ControlKit.CSS.SelectActive : ControlKit.CSS.Select);
};

ControlKit.Select.prototype.onValueUpdate = function(e)
{
    this._selected = this._object[this._targetKey];
    this._select.setProperty('value',this._selected.toString());
};