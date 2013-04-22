function CKSelect(parent,object,value,target,label,params)
{
    CKObjectComponent.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params = params || {};
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || this._onFinish;

    /*---------------------------------------------------------------------------------*/

    this._onChange    = params.onChange;
    this._onFinish    = params.onFinish;

    var select = this._select = new CKNode(CKNodeType.INPUT_BUTTON);
    this._selectActive = false;
    this._hover        = false;

    select.setStyleClass(CKCSS.Select);

    this._wrapNode.addChild(select);



    /*---------------------------------------------------------------------------------*/

    if(value)
    {
        this._targetKey = target;

        var values = this._values  = this._object[this._key];

        this._selected  = null;

        var targetObj = this._object[this._targetKey];
            targetObj = targetObj || '';

        var i = -1;
        while(++i < values.length){if(targetObj == values[i])this._selected = values[i];}

        select.setProperty('value',targetObj.toString().length > 0 ? targetObj : values[0]);

        select.setEventListener(CKNodeEvent.MOUSE_DOWN,this._onSelectMouseDown.bind(this));
        select.setEventListener(CKNodeEvent.MOUSE_OVER,this._onSelectMouseOver.bind(this));
        select.setEventListener(CKNodeEvent.MOUSE_OUT, this._onSelectMouseOut.bind(this));




    }
    else
    {
        //no value state eg pad
    }

    /*---------------------------------------------------------------------------------*/



}

CKSelect.prototype = Object.create(CKObjectComponent.prototype);

CKSelect.prototype._onSelectMouseOver = function(){this._hover = true;};
CKSelect.prototype._onSelectMouseOut  = function(){this._hover = false;};

CKSelect.prototype._onSelectMouseDown = function()
{
    var select       = this._select,
        selectActive = this._selectActive = !this._selectActive;

    var options = CKOptions.getInstance();

    this._updateVisibility();

    var obj    = this._object,
        vals   = this._values,
        key    = this._key,
        target = this._targetKey;


    if(selectActive)
    {
        options.build(vals,
            select.getProperty('value'),
            select,
            function()
            {
                this._deactivate();
                options.clear();

            }.bind(this),
            function()
            {
                this._deactivate();
                options.clear();

            }.bind(this));

    }
    else
    {
        options.clear();
    }
};

CKSelect.prototype._updateVisibility = function()
{
    this._select.setStyleClass(this._selectActive ? CKCSS.SelectActive : CKCSS.Select);
};

CKSelect.prototype._deactivate = function()
{
    this._selectActive = false;
    this._updateVisibility();
};