function CKButton(parent,object,value,label,onclick)
{
    CKComponent.apply(this,arguments);

    this._onChange = onclick;

    var d = CKDOM,
        c = d.CSS;

    d.set(this._divLabel,{className:c.CompLabel,innerHTML:''});
    d.set(this._divComp, {className:c.CompSlot});

    this._button = d.addInput(this._divComp,{type:'button',value:label});
    this._button.onclick = this._onChange;

}

CKButton.prototype = Object.create(CKComponent.prototype);