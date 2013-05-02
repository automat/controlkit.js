function CKPresetBtn(parentNode)
{
    var btnNode  = this._btnNode  = new CKNode(CKNodeType.INPUT_BUTTON);
    var indiNode = this._indiNode = new CKNode(CKNodeType.DIV);

    this._callbackA = function(){};
    this._callbackI = function(){};
    this._active   = false;

    btnNode.setStyleClass(CKCSS.PresetBtn);
    btnNode.setEventListener(CKNodeEventType.MOUSE_DOWN,this._onMouseDown.bind(this));

    btnNode.addChild(indiNode);
    parentNode.addChild(btnNode);

}

CKPresetBtn.prototype =
{
    _onMouseDown : function()
    {
        var active = this._active = !this._active;

        if(active)
        {
            this._btnNode.setStyleClass(CKCSS.PresetBtnActive);
            this._callbackA();
        }
        else
        {
            this._btnNode.setStyleClass(CKCSS.PresetBtn);
            this._callbackI();
        }
    },

    setCallbackActive   : function(func){this._callbackA = func;},
    setCallbackInactive : function(func){this._callbackI = func;},

    deactivate : function(){this._active = false;this._btnNode.setStyleClass(CKCSS.PresetBtn);}
};


