var VirtualDisplayObject = require('./VirtualDisplayObject');

function VirtualTextField(){
    VirtualDisplayObject.apply(this);

    this._string = '';
    this._caretIndex = 0;
    this._multiline = false;
    this._static = true;
}

VirtualTextField.prototype = Object.create(VirtualDisplayObject.prototype);
VirtualTextField.prototype.constructor = VirtualTextField;

VirtualTextField.prototype.setString = function(str){
    this._string = str;
};

VirtualTextField.prototype.getString = function(){
    return this._string;
};

VirtualTextField.prototype.setStatic = function(static_){
    this._static = static_;
};

VirtualTextField.prototype.isStatic = function(){
    return this._static;
};

VirtualTextField.prototype.setMultiline = function(multiline){
    this._multiline = multiline;
};

VirtualTextField.prototype.isMultiline = function(){
    return this._multiline;
};

module.exports = VirtualTextField;