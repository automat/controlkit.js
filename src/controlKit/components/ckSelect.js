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
    select.setStyleClass(CKCSS.Select);

    this._wrapNode.addChild(select);

    /*---------------------------------------------------------------------------------*/

    this._targetKey = target;
    this._values  = this._object[this._key];
    this._selected  = null;

    var targetObj = this._object[this._targetKey];
        targetObj = targetObj || '';

    var values = this._values;

    var i = -1;
    while(++i < values.length){if(targetObj == values[i])this._selected = values[i];}
    select.setProperty('value',targetObj.toString().length > 0 ? targetObj : values[0]);

    /*---------------------------------------------------------------------------------*/

    this._active = false;

    /*---------------------------------------------------------------------------------*/

    select.setEventListener(CKNodeEventType.MOUSE_DOWN,this._onSelectMouseDown.bind(this));

    /*---------------------------------------------------------------------------------*/

    var cntrlKit = ControlKit.getInstance();
    cntrlKit.addEventListener(CKEventType.TRIGGER_SELECT,this,'onSelectTrigger');

    this.addEventListener(CKEventType.SELECT_TRIGGERED,cntrlKit,'onSelectTriggered');

}

CKSelect.prototype = Object.create(CKObjectComponent.prototype);

CKSelect.prototype.onSelectTrigger = function(e)
{

    if(e.data.origin == this)
    {
        this._active = !this._active;
        this._updateVisibility();

        var options = CKOptions.getInstance();

        if(this._active)
        {
            options.build(this._values,
                          this._selected,
                          this._select,
                          function()
                          {
                              this._selected = this._object[this._targetKey]  = this._values[options.getSelectedIndex()];
                              this._select.setProperty('value',this._selected);

                              this.dispatchEvent(new CKEvent(this,CKEventType.VALUE_UPDATED));

                              this._active = false;
                              this._updateVisibility();

                              options.clear();

                          }.bind(this),
                          function()
                          {
                              this._active = false;
                              this._updateVisibility();

                              options.clear();

                          }.bind(this));

        }
        else
        {
            options.clear();
        }

        return;
    }


    this._active = false;
    this._updateVisibility();

};





CKSelect.prototype._onSelectMouseDown = function()
{
    this.dispatchEvent(new CKEvent(this,CKEventType.SELECT_TRIGGERED));
};


CKSelect.prototype._updateVisibility = function()
{
    this._select.setStyleClass(this._active ? CKCSS.SelectActive : CKCSS.Select);
};


CKSelect.prototype.onValueUpdate = function(e)
{
    this._selected = this._object[this._targetKey];
    this._select.setProperty('value',this._selected.toString());
};