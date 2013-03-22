


function CKCheckbox(parent,object,value,label,params)
{
    CKComponent.apply(this,arguments);

    params = params || {};
    this._onChange  = params.onChange = params.onChange || this._onChange;
    this._onFinish  = params.onFinish = params.onFinish || this._onFinish;

    var d = CKDOM,
        c = d.CSS;

    d.set(this._divLabel,{className:c.CompLabel,innerHTML:label});
    d.set(this._divComp, {className:c.CompSlot});

    this._checkbox = d.addInput(this._divComp,{type:'checkbox'});

    this._checkbox.checked  = this._object[this._key];
    this._checkbox.onchange = function()
    {
        this._doFocus();
        this._object[this._key] = !this._object[this._key];
        this._onChange();

        //this._parent._forceUpdate();

    }.bind(this);


}

CKCheckbox.prototype = Object.create(CKComponent.prototype);

CKCheckbox.prototype._forceUpdate = function()
{
    //if(this._focus)return;
    this._checkbox.checked  = this._object[this._key];
};
