var STR_ERROR_NOT_IMPLEMENTED = 'Function not implemented.';

function AbstractDisplayObject(){
    this._parent   = null;
    this._overflow = false;
    this._visible  = true;
}

/*--------------------------------------------------------------------------------------------------------------------*/
// Parent
/*--------------------------------------------------------------------------------------------------------------------*/

AbstractDisplayObject.prototype.getParent = function(){
    return this._parent;
};

/*--------------------------------------------------------------------------------------------------------------------*/
// Style
/*--------------------------------------------------------------------------------------------------------------------*/

AbstractDisplayObject.prototype.setStyle = function(config){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractDisplayObject.prototype.getStyle = function(){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

/*--------------------------------------------------------------------------------------------------------------------*/
// Children
/*--------------------------------------------------------------------------------------------------------------------*/

AbstractDisplayObject.prototype.addChild = function(child){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractDisplayObject.prototype.addChildAt = function(child,index){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractDisplayObject.prototype.addChildren = function(args){
    var children = args instanceof Array ? args : arguments;

    for(var i = 0, l = children.length; i < l; ++i){
        this.addChild(children[i]);
    }

    return this;
};

AbstractDisplayObject.prototype.getChildIndex = function(child){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractDisplayObject.prototype.getChildAt = function(index){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractDisplayObject.prototype.getNumChildren = function(){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractDisplayObject.prototype.getFirstChild = function(){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractDisplayObject.prototype.getLastChild = function(){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractDisplayObject.prototype.hasChildren = function(){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractDisplayObject.prototype.removeChildAt = function(index){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractDisplayObject.prototype.removeChild = function(child){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractDisplayObject.prototype.removeChildren = function(args){
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

AbstractDisplayObject.prototype.setPosition = function(pos){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractDisplayObject.prototype.setPositionX = function(x){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractDisplayObject.prototype.setPositionY = function(y){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractDisplayObject.prototype.getPosition = function(){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractDisplayObject.prototype.getPositionX = function(x){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractDisplayObject.prototype.getPositionY = function(y){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};


AbstractDisplayObject.prototype.setPositionAbsolute = function(pos){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractDisplayObject.prototype.setPositionXAbsolute = function(x){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractDisplayObject.prototype.setPositionYAbsolute = function(y){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractDisplayObject.prototype.getPositionAbsolute = function(){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractDisplayObject.prototype.getPositionXAbsolute = function(){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractDisplayObject.prototype.getPositionYAbsolute = function(){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

/*--------------------------------------------------------------------------------------------------------------------*/
// Size
/*--------------------------------------------------------------------------------------------------------------------*/

AbstractDisplayObject.prototype.setSize = function(size){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractDisplayObject.prototype.setWidth = function(width){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractDisplayObject.prototype.setHeight = function(height){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractDisplayObject.prototype.getSize = function(){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractDisplayObject.prototype.getWidth  = function(){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractDisplayObject.prototype.getHeight = function(){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

/*--------------------------------------------------------------------------------------------------------------------*/
// Stats
/*--------------------------------------------------------------------------------------------------------------------*/

AbstractDisplayObject.prototype.setOverflow = function(overflow){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractDisplayObject.prototype.canOverflow = function(){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractDisplayObject.prototype.setVisible = function(visible){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

/*--------------------------------------------------------------------------------------------------------------------*/
// Event
/*--------------------------------------------------------------------------------------------------------------------*/

AbstractDisplayObject.prototype.addEventListener = function(type,listener,methodName){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractDisplayObject.prototype.removeEventListener = function(type,listener,methodName){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractDisplayObject.prototype.dispatchEvent = function(event){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

/*--------------------------------------------------------------------------------------------------------------------*/
// Export
/*--------------------------------------------------------------------------------------------------------------------*/

module.exports = AbstractDisplayObject;