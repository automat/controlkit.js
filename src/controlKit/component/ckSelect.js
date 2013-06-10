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

    /*---------------------------------------------------------------------------------*/

    this._isColor = false;
    var regex = /^#[0-9A-F]{6}$/i;
    var i = -1;
    //FIXME
    if(regex.test(obj[targetKey]))
    {
        while(++i<values.length){if(!regex.test(values[i]))break;}
        this._isColor = true;
    }

    this._selected  = null;
    var select;

    /*---------------------------------------------------------------------------------*/

    //FIXME
    if(this._isColor)
    {
        select = this._select = new ControlKit.Node(ControlKit.NodeType.DIV);
        select.setStyleClass(ControlKit.CSS.SelectColor);

        var color = select.addChild(new ControlKit.Node(ControlKit.NodeType.DIV));
            color.setStyleProperty('background',obj[targetKey]);
            color.setProperty('innerHTML', obj[targetKey]);

        var btn = new ControlKit.PresetBtn(this._wrapNode);
            btn.setCallbackActive(this._onSelectTrigger.bind(this));

        var onPresetDeactivate = function(){ControlKit.Options.getInstance().clear();btn.deactivate();};

            btn.setCallbackInactive(onPresetDeactivate);

    }
    else
    {
        select = this._select = new ControlKit.Node(ControlKit.NodeType.INPUT_BUTTON);
        select.setStyleClass(ControlKit.CSS.Select);

        i = -1;
        while(++i < values.length){if(targetObj == values[i])this._selected = values[i];}
        select.setProperty('value',targetObj.toString().length > 0 ? targetObj : values[0]);

        select.setEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onSelectTrigger.bind(this));
    }

    this._wrapNode.addChild(select);

    /*---------------------------------------------------------------------------------*/





    var kit = ControlKit.getKitInstance();
    kit.addEventListener(ControlKit.EventType.TRIGGER_SELECT,   this,'onSelectTrigger');
    this.addEventListener(ControlKit.EventType.SELECT_TRIGGERED,kit, 'onSelectTriggered');

};

ControlKit.Select.prototype = Object.create(ControlKit.ObjectComponent.prototype);

ControlKit.Select.prototype._isColor = function()
{
    var regex = /^#[0-9A-F]{6}$/i;

    if(!regex.test(this._object[this._targetKey]))return false;

    var values = this._values;
    var i = -1;
    while(++i < values.length){if(!regex.test(values[i]))return false;}

    return true;
};

ControlKit.Select.prototype.onSelectTrigger = function (e)
{
    if (e.data.origin == this) {

        this._active = !this._active;
        this._updateAppearance();

        var options = ControlKit.Options.getInstance();


        if (this._active) {
            if (this._isColor) {

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

                    }.bind(this));

            }
            else {

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

                    }.bind(this));

            }


        }
        else {
            options.clear();
        }

        return;
    }


    this._active = false;
    this._updateAppearance();

};


ControlKit.Select.prototype.applyValue = function()
{
    this.pushHistoryState();

    this._selected = this._object[this._targetKey]  = this._values[ControlKit.Options.getInstance().getSelectedIndex()];
    this._select.setProperty('value',this._selected);

    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.VALUE_UPDATED,null));
};

ControlKit.Select.prototype.pushHistoryState = function(){var obj = this._object,key = this._targetKey;ControlKit.History.getInstance().pushState(obj,key,obj[key]);};

ControlKit.Select.prototype._onSelectTrigger = function()
{
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.SELECT_TRIGGERED,null));
};

ControlKit.Select.prototype._updateAppearance = function()
{
    if(!this._isColor)

    //var cssClass = this._active ? (this._isColor ? )

    this._select.setStyleClass(this._active ? ControlKit.CSS.SelectActive : ControlKit.CSS.Select);
};


ControlKit.Select.prototype.onValueUpdate = function(e)
{
    this._selected = this._object[this._targetKey];
    this._select.setProperty('value',this._selected.toString());
};