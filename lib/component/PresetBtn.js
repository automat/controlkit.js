var NodeEvent = require('../core/document/NodeEvent');
var Node = require('../core/document/Node');
var CSS = require('../core/document/CSS');

function PresetBtn(parentNode) {
    var btnNode = this._btnNode = new Node(Node.INPUT_BUTTON);
    var indiNode = this._indiNode = new Node();

    this._onActive = function () {};
    this._onDeactive = function () {};
    this._isActive = false;

    btnNode.setStyleClass(CSS.PresetBtn);
    btnNode.addEventListener(NodeEvent.MOUSE_DOWN, this._onMouseDown.bind(this));

    btnNode.addChild(indiNode);
    parentNode.addChildAt(btnNode, 0);
}

PresetBtn.prototype._onMouseDown = function(){
    var isActive = this._isActive = !this._isActive;

    if (isActive) {
        this._btnNode.setStyleClass(CSS.PresetBtnActive);
        this._onActive();
    }
    else {
        this._btnNode.setStyleClass(CSS.PresetBtn);
        this._onDeactive();
    }
};

PresetBtn.prototype.setOnActive = function(func){
    this._onActive = func;
};

PresetBtn.prototype.setOnDeactive = function(func){
    this._onDeactive = func;
};

PresetBtn.prototype.deactivate = function(){
    this._isActive = false;
    this._btnNode.setStyleClass(CSS.PresetBtn);
};

module.exports = PresetBtn;
