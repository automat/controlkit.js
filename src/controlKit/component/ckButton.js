ControlKit.CKButton = function(parent,label,onPress)
{
    ControlKit.CKComponent.apply(this,arguments);

    var input = this._textArea = new ControlKit.CKNode(ControlKit.CKNodeType.INPUT_BUTTON);

    input.setStyleClass(ControlKit.CKCSS.Button);
    input.setProperty('value',label);
    input.setEventListener(ControlKit.CKNodeEventType.ON_CLICK,function(){onPress();this.dispatchEvent(new ControlKit.CKEvent(this,ControlKit.CKEventType.VALUE_UPDATED));}.bind(this));

    this._wrapNode.addChild(input);
};

ControlKit.CKButton.prototype = Object.create(ControlKit.CKComponent.prototype);
