var AbstractStage = require('./AbstractStage');
var StageEvent    = require('./StageEvent');

var Matrix33 = require('../core/math/Matrix33');

function VirtualStage(size){
    AbstractStage.call(this);

    this._size[0] = size[0];
    this._size[1] = size[1];

    this._transform = Matrix33.create();

    this._children = [];
}

VirtualStage.prototype = Object.create(AbstractStage.prototype);
VirtualStage.prototype.constructor = VirtualStage;

VirtualStage.prototype.handleResize = function(e){
    this._size[0] = e.width;
    this._size[1] = e.height;

    this.dispatchEvent(new StageEvent(StageEvent.RESIZE,{
        width:  this._size[0],
        height: this._size[1]
    }));
};

/*--------------------------------------------------------------------------------------------------------------------*/
// Children
/*--------------------------------------------------------------------------------------------------------------------*/

//NOTE: Some duplicated functionality here.

VirtualStage.prototype.addChild = function(child){
    if(this._children.indexOf(child) !== -1){
        return this;
    }
    if(child._parent){
        child._parent.removeChild(child);
    }

    child._parent = this;
    child.setPositionAbsolute([0,0]);
    child.updateLayoutWithStyle();

    this._children.push(child);
    return this;
};

VirtualStage.prototype.addChildAt = function(child,index){
    if(this._children.indexOf(child) !== -1){
        return this;
    }
    if(child._parent){
        child._parent.removeChild(child);
    }

    child._parent = this;
    child.setPositionAbsolute([0,0]);
    child.updateLayoutWithStyle();

    this._children.splice(index, 0, child);
    return this;
};

VirtualStage.prototype.getChildIndex = function(child){
    return this._children.indexOf(child);
};

VirtualStage.prototype.getChildAt = function(index){
    if(index < 0 || index > (this._children.length - 1)){
        throw new RangeError('Child index out of range.');
    }

    return this._children[index];
};

VirtualStage.prototype.getNumChildren = function(){
    return this._children.length;
};

VirtualStage.prototype.getFirstChild = function(){
    return this._children[0];
};

VirtualStage.prototype.getLastChild = function(){
    return this._children[this._children.length - 1];
};

VirtualStage.prototype.hasChildren = function(){
    return this._children.length !== 0;
};

VirtualStage.prototype.removeChildAt = function(index){
    if(index < 0 || index > (this._children.length - 1)){
        throw new RangeError('Child index out of range.');
    }
    this._children.splice(index,1);
    return this;
};

VirtualStage.prototype.removeChild = function(child){
    return this.removeChildAt(this.getChildIndex(child)) ;
};

/*--------------------------------------------------------------------------------------------------------------------*/
// Export
/*--------------------------------------------------------------------------------------------------------------------*/

module.exports = VirtualStage;