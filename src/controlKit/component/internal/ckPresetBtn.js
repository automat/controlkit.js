ControlKit.PresetBtn = function(parentNode)
{
    var btnNode  = this._btnNode  = new ControlKit.Node(ControlKit.NodeType.INPUT_BUTTON);
    var indiNode = this._indiNode = new ControlKit.Node(ControlKit.NodeType.DIV);

    this._callbackA = function(){};
    this._callbackI = function(){};
    this._active   = false;

    btnNode.setStyleClass(ControlKit.CSS.PresetBtn);
    btnNode.addEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onMouseDown.bind(this));

    btnNode.addChild(indiNode);
    parentNode.addChildAt(btnNode,0);

};

ControlKit.PresetBtn.prototype =
{
    _onMouseDown : function()
    {
        var active = this._active = !this._active;

        if(active)
        {
            this._btnNode.setStyleClass(ControlKit.CSS.PresetBtnActive);
            this._callbackA();
        }
        else
        {
            this._btnNode.setStyleClass(ControlKit.CSS.PresetBtn);
            this._callbackI();
        }
    },

    setCallbackActive   : function(func){this._callbackA = func;},
    setCallbackInactive : function(func){this._callbackI = func;},

    deactivate : function(){this._active = false;this._btnNode.setStyleClass(ControlKit.CSS.PresetBtn);}
};


