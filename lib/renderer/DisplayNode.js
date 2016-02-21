var AbstractNode = require('./AbstractNode');
var EventDispatcher       = require('../core/event/EventDispatcher');
var Stage                 = require('./Stage');

var Style   = require('./layout/Style');
var Align   = require('./layout/Align');
var Size    = require('./layout/Size');
var Metrics = require('./layout/Metrics');

var Matrix33 = require('../core/math/Matrix33');

function DisplayNode(){
    AbstractNode.apply(this);

    this._parentNode = null;

    this._transform = Matrix33.create();

    this._size            = [0,0];
    this._boundsGlobal    = [0,0,0,0];
    this._boundsAllGlobal = [0,0,0,0];

    this._children = [];

    this._eventDispatcher = new EventDispatcher();

    this._class = null;

    /**
     * @type {boolean}
     * @protected
     */
    this._needsRepaint   = true;

    this._overflow = true;
    this._visible = true;

    this._style = null;
}

DisplayNode.prototype = Object.create(AbstractNode.prototype);
DisplayNode.prototype.constructor = DisplayNode;

DisplayNode.prototype.setClass = function(name){
    this._class = name;
};

DisplayNode.prototype.getClass = function(){
    return this._class;
};

/*--------------------------------------------------------------------------------------------------------------------*/
// Style
/*--------------------------------------------------------------------------------------------------------------------*/
//
//var EMPTY_PADDING = [0,0,0,0];
//
//VirtualDisplayObject.prototype.updateLayoutWithStyle = function(){
//    var parent = this._parent;
//    var style  = this._style;
//
//    if(parent === null || style === null){
//        return this;
//    }
//
//    var styleWidth  = style.width;
//    var styleHeight = style.height;
//    var styleAlign  = style.align;
//
//    var offsetx = 0;
//    var offsety = 0;
//    var width   = 0;
//    var height  = 0;
//
//    /*----------------------------------------------------------------------------------------------------------------*/
//    // Added To Parent
//    /*----------------------------------------------------------------------------------------------------------------*/
//
//    if(parent){
//
//        /*------------------------------------------------------------------------------------------------------------*/
//        // Stage
//        /*------------------------------------------------------------------------------------------------------------*/
//        if(parent instanceof Stage){
//
//            if(styleWidth){
//                if(Metrics.isPercentage(styleWidth)){
//                    width = 0;
//
//                } else if(styleWidth === 'auto') {
//                    width = parent.getWidth();
//
//                } else {
//                    width = styleWidth;
//                }
//            }
//
//            if(styleHeight){
//                if(Metrics.isPercentage(styleHeight) || styleHeight === 'auto'){
//                    height = 0;
//
//                } else {
//                    height = styleHeight;
//                }
//
//            }
//
//        /*------------------------------------------------------------------------------------------------------------*/
//        // DisplayObject
//        /*------------------------------------------------------------------------------------------------------------*/
//        } else {
//            var parentStyle  = parent.getStyle();
//            var parentWidth  = parent.getWidth();
//            var parentHeight = parent.getHeight();
//
//            var parentPadding  = parentStyle.padding || EMPTY_PADDING;
//            var parentPaddingT = Math.max(0,parentPadding[0] || 0);
//            var parentPaddingR = Math.max(0,parentPadding[1] || 0);
//            var parentPaddingB = Math.max(0,parentPadding[2] || 0);
//            var parentPaddingL = Math.max(0,parentPadding[3] || 0);
//
//            if(Metrics.isPercentage(parentPaddingR)){
//                parentPaddingR = parentWidth * Metrics.percentageToNumber(parentPadding[0]);
//            }
//
//            if(Metrics.isPercentage(parentPaddingL)){
//                parentPaddingL = parentWidth * Metrics.percentageToNumber(parentPadding[1]);
//            }
//
//            if(styleWidth){
//                if(Metrics.isPercentage(styleWidth)){
//                    width = Math.max(0,parentWidth + parentPaddingR + parentPaddingL) *
//                            Metrics.percentageToNumber(styleWidth);
//
//                } else if(styleWidth === 'auto') {
//                    width = Math.max(0,parentWidth - parentPaddingR - parentPaddingL);
//
//                } else {
//                    width = styleWidth;
//                }
//            }
//
//            if(styleHeight){
//                if(Metrics.isPercentage(styleHeight) || styleHeight === 'auto'){
//                    height = 0;
//
//                } else {
//                    height = styleHeight;
//                }
//            }
//
//            if(styleAlign === 'right'){
//                offsetx = parentWidth - width - parentPaddingR;
//
//            } else {
//                offsetx = parentPaddingL;
//            }
//
//            offsety = parentPadding[0];
//        }
//    }
//
//    this.setPositionX(offsetx);
//    this.setPositionY(offsety);
//    this.setWidth(width);
//    this.setHeight(height);
//
//    for(var i = 0, l = this._children.length; i < l; ++i){
//        this._children[i].updateLayoutWithStyle();
//    }
//
//    return this;
//};
//
//VirtualDisplayObject.prototype.setStyle = function(config){
//    Style.validate(config);
//    this._style = Style.copy(config);
//    this.updateLayoutWithStyle();
//    return this;
//};
//
//VirtualDisplayObject.prototype.getStyle = function(){
//    if(this._style === null){
//        return null;
//    }
//    return Style.copy(this._style);
//};

/*--------------------------------------------------------------------------------------------------------------------*/
// State
/*--------------------------------------------------------------------------------------------------------------------*/

DisplayNode.prototype.setVisible = function(visible){
    this._visible = visible;
};

DisplayNode.prototype.isVisible = function(){
    return this._visible;
};

DisplayNode.prototype.setOverflow = function(overflow){
    this._overflow = overflow;
};

DisplayNode.prototype.canOverflow = function(){
    return this._overflow;
};

/*--------------------------------------------------------------------------------------------------------------------*/
// Bounds
/*--------------------------------------------------------------------------------------------------------------------*/

DisplayNode.prototype.updateBoundsAllGlobal = function(){
    var boundsGlobalAll = this._boundsAllGlobal = this.getBoundsGlobal();

    for(var i = 1, l = this._children.length; i < l; ++i){
        var bounds = this._children[i].getBoundsGlobal();

        if(bounds[0] < boundsGlobalAll[0]){
            boundsGlobalAll[0] = bounds[0];
        }

        if(bounds[1] < boundsGlobalAll[1]){
            boundsGlobalAll[1] = bounds[1]
        }

        if(bounds[2] > boundsGlobalAll[2]){
            boundsGlobalAll[2] = bounds[2];
        }

        if(bounds[3] > boundsGlobalAll[3]){
            boundsGlobalAll[3] = bounds[3];
        }
    }
};

DisplayNode.prototype.udateBoundsGlobal = function(){
    var posAbs = this.getPositionAbsolute();

    this._boundsGlobal[0] = posAbs[0];
    this._boundsGlobal[1] = posAbs[1];
    this._boundsGlobal[2] = posAbs[1] + this._size[0];
    this._boundsGlobal[3] = posAbs[2] + this._size[1];
};

DisplayNode.prototype.getBoundsGlobal = function(){
    return this._boundsGlobal.slice(0);
};

DisplayNode.prototype.getBoundsAllGlobal = function(){
    return this._overflow ? this._boundsGlobal.slice(0) : this._boundsAllGlobal.slice(0);
};

function containsPoint(point,bounds){
    return point[0] >= bounds[0] &&
           point[0] <= bounds[2] &&
           point[1] >= bounds[1] &&
           point[1] <= bounds[3];
}

DisplayNode.prototype.hitTestBoundsGlobal = function(point){
    return containsPoint(point,this._boundsGlobal);
};

DisplayNode.prototype.hitTestBoundsAllGlobal = function(point){
    return containsPoint(point,this._boundsAllGlobal);
};

/*--------------------------------------------------------------------------------------------------------------------*/
// Children
/*--------------------------------------------------------------------------------------------------------------------*/

DisplayNode.prototype.addChild = function(child){
    if(this._children.indexOf(child) !== -1){
        return this;
    }
    if(child._parent){
        child._parent.removeChild(child);
    }

    child._parent = this;
    this.updateLayoutWithStyle();

    this.updateBoundsAllGlobal();
    this._needsRepaint = true;

    this._children.push(child);
    return this;
};

DisplayNode.prototype.addChildAt = function(child, index){
    if(this._children.indexOf(child) !== -1){
        return this;
    }
    if(child._parent !== null){
        child._parent.removeChild(child);
    }

    child._parent = this;
    this.updateBoundsAllGlobal();

    this._children.splice(index, 0, child);

    this._needsRepaint = true;
    return this;
};

DisplayNode.prototype.getChildIndex = function(child){
    return this._children.indexOf(child);
};

DisplayNode.prototype.getChildAt = function(index){
    if(index < 0 || index > (this._children.length - 1)){
        throw new RangeError('Child index out of range.');
    }

    return this._children[index];
};

DisplayNode.prototype.getNumChildren = function(){
    return this._children.length;
};

DisplayNode.prototype.getFirstChild = function(){
    return this._children[0];
};

DisplayNode.prototype.getLastChild = function(){
    return this._children[this._children.length - 1];
};

DisplayNode.prototype.hasChildren = function(){
    return this._children.length !== 0;
};

DisplayNode.prototype.removeChildAt = function(index){
    if(index < 0 || index > (this._children.length - 1)){
        throw new RangeError('Child index out of range.');
    }
    var child = this.getChildAt(index);

    this._children.splice(index,1);

    this.updateBoundsAllGlobal();

    this._needsRepaint = true;
    return this;
};

DisplayNode.prototype.removeChild = function(child){
    return this.removeChildAt(this.getChildIndex(child)) ;
};

DisplayNode.prototype.swapChildrenAt = function(childAIndex, childBIndex){
    var childA = this.getChildAt(childAIndex);

    this._children[childAIndex] = this.getChildAt(childBIndex);
    this._children[childBIndex] = childA;

    this.updateBoundsAllGlobal();

    this._needsRepaint = true;
    return this;
};

DisplayNode.prototype.setChildIndex = function(childIndexOld, childIndexNew){
    var child = this.getChildIndex(childIndexOld);
    this.removeChild(child);
    this.addChildAt(child,childIndexNew);

    this._needsRepaint = true;
    return this;
};

DisplayNode.prototype.getParentIndex = function(){
    return this._parent.getChildIndex(this);
};

/*--------------------------------------------------------------------------------------------------------------------*/
// Position
/*--------------------------------------------------------------------------------------------------------------------*/

DisplayNode.prototype.setPosition = function(pos){
    this._transform[6] = pos[0];
    this._transform[7] = pos[1];
    this._needsRepaint = true;
    return this;
};

DisplayNode.prototype.setPositionX = function(x){
    this._transform[6] = x;
    this._needsRepaint = true;
    return this;
};

DisplayNode.prototype.setPositionY = function(y){
    this._transform[7] = y;
    this._needsRepaint = true;
    return this;
};

DisplayNode.prototype.getPosition = function(){
    return [this._transform[6],this._transform[7]];
};

DisplayNode.prototype.getPositionX = function(){
    return this._transform[6];
};

DisplayNode.prototype.getPositionY = function(){
    return this._transform[7]
};


DisplayNode.prototype.setPositionAbsolute = function(pos){
    var posAbs = this.getPositionAbsolute();
    var diffx  = pos[0] - posAbs[0];
    var diffy  = pos[1] - posAbs[1];

    this._transform[6] = diffx;
    this._transform[7] = diffy;

    this._needsRepaint = true;
    return this;
};

DisplayNode.prototype.setPositionXAbsolute = function(x){
    var posAbsx = this.getPositionXAbsolute();
    this._transform[6] = x - posAbsx;

    this._needsRepaint = true;
    return this;
};

DisplayNode.prototype.setPositionYAbsolute = function(y){
    var posAbsy = this.getPositionYAbsolute();
    this._transform[7] = y - posAbsy;

    this._needsRepaint = true;
    return this;
};

DisplayNode.prototype.getGlobalTransform = function(){
    var transform = Matrix33.copy(this._transform);
    var parent    = this._parent;

    if(parent === null || parent instanceof Stage){
        return transform;
    }

    return  Matrix33.mult(transform,parent.getGlobalTransform());
};

DisplayNode.prototype.getPositionAbsolute = function(){
    var transform = this.getGlobalTransform();
    return [transform[6],transform[7]];
};

DisplayNode.prototype.getPositionXAbsolute = function(){
    var transform = this.getGlobalTransform();
    return transform[6];
};

DisplayNode.prototype.getPositionYAbsolute = function(){
    var transform = this.getGlobalTransform();
    return transform[7];
};

/*--------------------------------------------------------------------------------------------------------------------*/
// Size
/*--------------------------------------------------------------------------------------------------------------------*/

DisplayNode.prototype.setSize = function(size){
    this._size[0] = size[0];
    this._size[1] = size[1];

    this._needsRepaint = true;
    return this;
};

DisplayNode.prototype.setWidth = function(width){
    this._size[0] = width;

    this._needsRepaint = true;
    return this;
};

DisplayNode.prototype.setHeight = function(height){
    this._size[1] = height;

    this._needsRepaint = true;
    return this;
};

DisplayNode.prototype.getSize = function(){
    return this._size.slice(0);
};

DisplayNode.prototype.getWidth  = function(){
    return this._size[0];
};

DisplayNode.prototype.getHeight = function(){
    return this._size[1];
};

/*--------------------------------------------------------------------------------------------------------------------*/
// Event
/*--------------------------------------------------------------------------------------------------------------------*/

DisplayNode.prototype.addEventListener = function(type, listener, methodName){
    this._eventDispatcher.addEventListener(type,listener,methodName);
    return this;
};

DisplayNode.prototype.removeEventListener = function(type, listener, methodName){
    this._eventDispatcher.removeEventListener(type,listener,methodName);
    return this;
};

DisplayNode.prototype.dispatchEvent = function(event){
    this._eventDispatcher.dispatchEvent(event);
    return this;
};

/*--------------------------------------------------------------------------------------------------------------------*/
// Export
/*--------------------------------------------------------------------------------------------------------------------*/

module.exports = DisplayNode;