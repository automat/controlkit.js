function CKSelect(parent,object,value,target,label,params)
{
    CKComponent_Internal.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params = params || {};
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || this._onFinish;

    /*---------------------------------------------------------------------------------*/

    this._onChange    = params.onChange;
    this._onFinish    = params.onFinish;

    this._lablNode.setProperty('innerHTML',label);

    var select = this._select = new CKNode(CKNodeType.INPUT_BUTTON);
    this._selectActive = false;

    select.setStyleClass(CKCSS.Select);



    /*---------------------------------------------------------------------------------*/

    if(value)
    {
        this._targetKey = target;

        var values   = this._values    = this._object[this._key];

        this._selected  = null;

        var targetObj = this._object[this._targetKey];
            targetObj =  targetObj ? targetObj : '';



        var i = -1;
        while(++i < values.length){if(targetObj == values[i]){this._selected = values[i];}}

        select.setProperty('value',targetObj.length > 0 ? targetObj : this._object[this._key][0]);
        /*

        select.setEventListener(CKNodeEvent.MOUSE_DOWN,this._onSelectMouseDown.bind(this));
        */
        /*
        var selectedValue = null;
        var obj       = this._object,
            vals      = this._values,
            key       = this._key,
            targetKey = this._targetKey;

        var i = -1;
        while(++i<vals.length){if(obj[targetKey] == vals[i]){selectedValue = vals[i];break;}}
        */
    }
    else
    {
        //no value state eg pad
    }

    /*---------------------------------------------------------------------------------*/

    this._wrapNode.addChild(select);

}

CKSelect.prototype = Object.create(CKComponent_Internal.prototype);

CKSelect.prototype._onSelectMouseDown = function()
{
    var select = this._select,
        active = this._selectActive;

    select.setStyleClass(active ? CKCSS.SelectActive : CKCSS.Select);

    var options = ControlKit.getOptions();

    var obj    = this._object,
        vals   = this._values,
        key    = this._key,
        target = this._targetKey;


    if(active)
    {
        if(!options.isBuild())options.build(vals,select.getProperty('value'),select,function(){},function(){});
    }
    else
    {
        options.hide();
    }

    this._selectActive = !this._selectActive;

};