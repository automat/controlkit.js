function CKButton(parent,label,onPress)
{
    CKComponent.apply(this,arguments);

    var input = this._textArea = new CKNode(CKNodeType.INPUT_BUTTON);

    input.setStyleClass(CKCSS.Button);
    input.setProperty('value',label);
    input.setEventListener(CKNodeEvent.ON_CLICK,function(){onPress();}.bind(this));

    this._wrapNode.addChild(input);
}

CKButton.prototype = Object.create(CKComponent.prototype);
