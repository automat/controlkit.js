function CKTextField(parent,object,value,label,params)
{
    CKComponent.apply(this,arguments);

    params = params || {};
    this._onChange  = params.onChange || this._onChange;
    this._onFinish  = params.onFinish || this._onFinish;

    var d = CKDOM,
        c = d.CSS;

    d.set(this._divLabel,{className:c.CompLabel,innerHTML:label});
    d.set(this._divComp, {className:c.CompSlot});


    this._stringInput = d.addInput(this._divComp,{type:'text',value:this._object[this._key]});

    this._stringInput.onkeyup = function()
    {
        this._applyValue();
        this._onChange();
        this._parent._forceUpdate();


    }.bind(this);


    this._stringInput.onchange = function()
    {
        this._applyValue();
        this._onFinish();
        this._parent._forceUpdate();

    }.bind(this);
}

CKTextField.prototype = Object.create(CKComponent.prototype);

CKTextField.prototype._applyValue = function()
{
    this._object[this._key] = this._stringInput.value;
};

CKTextField.prototype._forceUpdate = function()
{
    if(this._syncVal && this._focus)return;
    this._stringInput.value = this._object[this._key];
};