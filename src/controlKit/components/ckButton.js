function CKButton(parent,label,onPress)
{
    CKComponent.apply(this,arguments);

    var input = this._textArea = new CKNode(CKNodeType.INPUT_BUTTON);

    input.setStyleClass(CKCSS.Button);
    input.setProperty('value',label);
    input.setEventListener(CKNodeEventType.ON_CLICK,function(){onPress();this.dispatchEvent(new CKEvent(this,CKEventType.VALUE_UPDATED));}.bind(this));

    this._wrapNode.addChild(input);
}

CKButton.prototype = Object.create(CKComponent.prototype);
