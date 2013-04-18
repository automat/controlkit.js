function CKButton(parent,label,onPress)
{
    this._enabled = true;

    var rootNode = new CKNode(CKNodeType.LIST_ITEM),
        wrapNode = new CKNode(CKNodeType.DIV),
        input    = new CKNode(CKNodeType.INPUT_BUTTON);

    parent.getList().addChild(rootNode);
    rootNode.addChild(wrapNode);
    wrapNode.addChild(input);

    wrapNode.setStyleClass(CKCSS.Wrap);
    input.setStyleClass(CKCSS.Button);

    input.setProperty('value',label);
    input.setEventListener(CKNodeEvent.ON_CLICK,onPress);
}


CKButton.prototype.enable      = function(){this._enabled = true;  };
CKButton.prototype.disable     = function(){this._enabled = false; };
CKButton.prototype.isEnabled   = function(){return this._enabled;};

//TODO:FIXME!
CKButton.prototype.forceUpdate = function(){};