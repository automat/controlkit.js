var STR_ERROR_NOT_IMPLEMENTED = 'Function not implemented.';

function AbstractNode(){
    this._parent   = null;
    this._overflow = false;
    this._visible  = true;
}

AbstractNode.prototype.create

/*--------------------------------------------------------------------------------------------------------------------*/
// Parent
/*--------------------------------------------------------------------------------------------------------------------*/

AbstractNode.prototype.getParent = function(){
    return this._parent;
};

/*--------------------------------------------------------------------------------------------------------------------*/
// Style
/*--------------------------------------------------------------------------------------------------------------------*/

AbstractNode.prototype.setStyle = function(config){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNode.prototype.getStyle = function(){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNode.prototype.setClass = function(name){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNode.prototype.getClass = function(){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

/*--------------------------------------------------------------------------------------------------------------------*/
// Children
/*--------------------------------------------------------------------------------------------------------------------*/

AbstractNode.prototype.addChild = function(child){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNode.prototype.addChildAt = function(child, index){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNode.prototype.addChildren = function(args){
    var children = args instanceof Array ? args : arguments;

    for(var i = 0, l = children.length; i < l; ++i){
        this.addChild(children[i]);
    }

    return this;
};

AbstractNode.prototype.getChildIndex = function(child){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNode.prototype.getChildAt = function(index){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNode.prototype.getNumChildren = function(){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNode.prototype.getFirstChild = function(){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNode.prototype.getLastChild = function(){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNode.prototype.hasChildren = function(){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNode.prototype.removeChildAt = function(index){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNode.prototype.removeChild = function(child){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNode.prototype.removeChildren = function(args){
    var children = args instanceof Array ? args : arguments;

    for(var i = 0, l = children.length; i < l; ++i){
        var index = this.getChildIndex(children[i]);
        if(index === -1){
            continue;
        }
        this.removeChildAt(index);
    }

    return this;
};

/*--------------------------------------------------------------------------------------------------------------------*/
// Position
/*--------------------------------------------------------------------------------------------------------------------*/

AbstractNode.prototype.setPosition = function(pos){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNode.prototype.setPositionX = function(x){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNode.prototype.setPositionY = function(y){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNode.prototype.getPosition = function(){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNode.prototype.getPositionX = function(x){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNode.prototype.getPositionY = function(y){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};


AbstractNode.prototype.setPositionAbsolute = function(pos){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNode.prototype.setPositionXAbsolute = function(x){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNode.prototype.setPositionYAbsolute = function(y){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNode.prototype.getPositionAbsolute = function(){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNode.prototype.getPositionXAbsolute = function(){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNode.prototype.getPositionYAbsolute = function(){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

/*--------------------------------------------------------------------------------------------------------------------*/
// Size
/*--------------------------------------------------------------------------------------------------------------------*/

AbstractNode.prototype.setSize = function(size){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNode.prototype.setWidth = function(width){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNode.prototype.setHeight = function(height){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNode.prototype.getSize = function(){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNode.prototype.getWidth  = function(){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNode.prototype.getHeight = function(){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

/*--------------------------------------------------------------------------------------------------------------------*/
// Stats
/*--------------------------------------------------------------------------------------------------------------------*/

AbstractNode.prototype.setOverflow = function(overflow){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNode.prototype.canOverflow = function(){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNode.prototype.setVisible = function(visible){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

/*--------------------------------------------------------------------------------------------------------------------*/
// Event
/*--------------------------------------------------------------------------------------------------------------------*/

AbstractNode.prototype.addEventListener = function(type, listener, methodName){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNode.prototype.removeEventListener = function(type, listener, methodName){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNode.prototype.dispatchEvent = function(event){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

/*--------------------------------------------------------------------------------------------------------------------*/
// Export
/*--------------------------------------------------------------------------------------------------------------------*/

module.exports = AbstractNode;