var Node = require('../../core/document/Node');
var NodeType = require('../../core/document/NodeType');
var NodeEventType = require('../../core/document/NodeEventType');
var CSS = require('../../core/document/CSS');

function PresetBtn(parentNode) {
    var btnNode = this._btnNode = new Node(NodeType.INPUT_BUTTON);
    var indiNode = this._indiNode = new Node(NodeType.DIV);

    this._onActive = function () {};
    this._onDeactive = function () {};
    this._isActive = false;

    btnNode.setStyleClass(CSS.PresetBtn);
    btnNode.addEventListener(NodeEventType.MOUSE_DOWN, this._onMouseDown.bind(this));

    btnNode.addChild(indiNode);
    parentNode.addChildAt(btnNode, 0);
}

PresetBtn.prototype = {
    _onMouseDown: function () {
        var isActive = this._isActive = !this._isActive;

        if (isActive) {
            this._btnNode.setStyleClass(CSS.PresetBtnActive);
            this._onActive();
        }
        else {
            this._btnNode.setStyleClass(CSS.PresetBtn);
            this._onDeactive();
        }
    },

    setOnActive: function (func) {
        this._onActive = func;
    },
    setOnDeactive: function (func) {
        this._onDeactive = func;
    },

    deactivate: function () {
        this._active = false;
        this._btnNode.setStyleClass(CSS.PresetBtn);
    }
};

module.exports = PresetBtn;


//
//
//ControlKit.PresetBtn = function(parentNode)
//{
//    var btnNode  = this._btnNode  = new ControlKit.Node(ControlKit.NodeType.INPUT_BUTTON);
//    var indiNode = this._indiNode = new ControlKit.Node(ControlKit.NodeType.DIV);
//
//    this._onActive = function(){};
//    this._onDeactive = function(){};
//    this._isActive   = false;
//
//    btnNode.setStyleClass(ControlKit.CSS.PresetBtn);
//    btnNode.addEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onMouseDown.bind(this));
//
//    btnNode.addChild(indiNode);
//    parentNode.addChildAt(btnNode,0);
//
//};
//
//ControlKit.PresetBtn.prototype =
//{
//    _onMouseDown : function()
//    {
//        var isActive = this._isActive = !this._isActive;
//
//        if(isActive)
//        {
//            this._btnNode.setStyleClass(ControlKit.CSS.PresetBtnActive);
//            this._onActive();
//        }
//        else
//        {
//            this._btnNode.setStyleClass(ControlKit.CSS.PresetBtn);
//            this._onDeactive();
//        }
//    },
//
//    setOnActive   : function(func){this._onActive = func;},
//    setOnDeactive : function(func){this._onDeactive = func;},
//
//    deactivate : function(){this._active = false;this._btnNode.setStyleClass(ControlKit.CSS.PresetBtn);}
//};
//
//
