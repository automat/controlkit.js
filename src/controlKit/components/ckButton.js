function CKButton(parent,object,value,label,onPress)
{
    CKComponent_Internal.apply(this,arguments);

    this._lablNode.setProperty('innerHTML','');

    var inputBtn = this._inputBtn = new CKNode(CKNode.Type.INPUT_BUTTON);

    inputBtn.setProperty('value',label);
    inputBtn.setEventListener(CKNode.Event.ON_CLICK,onPress);

    this._wrapNode.addChild(inputBtn);
}

CKButton.prototype = Object.create(CKComponent_Internal.prototype);
