ControlKit.CKPresetBtn = function(parentNode)
{
    var btnNode  = this._btnNode  = new ControlKit.CKNode(ControlKit.CKNodeType.INPUT_BUTTON);
    var indiNode = this._indiNode = new ControlKit.CKNode(ControlKit.CKNodeType.DIV);

    this._callbackA = function(){};
    this._callbackI = function(){};
    this._active   = false;

    btnNode.setStyleClass(ControlKit.CKCSS.PresetBtn);
    btnNode.setEventListener(ControlKit.CKNodeEventType.MOUSE_DOWN,this._onMouseDown.bind(this));

    btnNode.addChild(indiNode);
    parentNode.addChild(btnNode);

}

ControlKit.CKPresetBtn.prototype =
{
    _onMouseDown : function()
    {
        var active = this._active = !this._active;

        if(active)
        {
            this._btnNode.setStyleClass(ControlKit.CKCSS.PresetBtnActive);
            this._callbackA();
        }
        else
        {
            this._btnNode.setStyleClass(ControlKit.CKCSS.PresetBtn);
            this._callbackI();
        }
    },

    setCallbackActive   : function(func){this._callbackA = func;},
    setCallbackInactive : function(func){this._callbackI = func;},

    deactivate : function(){this._active = false;this._btnNode.setStyleClass(ControlKit.CKCSS.PresetBtn);}
};


