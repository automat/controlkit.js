import AbstractNode from "./AbstractNode";
import * as Matrix33 from "../core/math/Matrix33";
import NodeBase from "./DisplayNodeBase";
import NodeType from './NodeType';
import Style from './Style';

const STR_ERROR_NOT_IMPLEMENTED = 'Function not implemented.';
const STR_ERROR_INVALID_TYPE    = 'Invalid node type.';

function containsPoint(point,bounds){
    return point[0] >= bounds[0] &&
           point[0] <= bounds[2] &&
           point[1] >= bounds[1] &&
           point[1] <= bounds[3];
}

export default class DisplayNode extends AbstractNode{
    constructor(type = NodeType.CONTAINER, ...args){
        super();

        this._parentNode = null;
        this._class = null;
        this._value = null;
        this._type = type;
        this._id = null;

        this._style       = new Style();
        this._styleInline = new Style();

        this._zIndex = 0;

        this._transform = Matrix33.create();

        this._size = [0,0];
        this._boundsGlobal = [0,0,0,0];
        this._boundsAllGlobal  = [0,0,0,0];

        this._children      = [];
        this._childrenOrder = [];

        this._shouldComputeLayout = true;

        this._overflow = true;
        this._visible = true;
    }

    static create(type = NodeType.CONTAINER,args){
        switch(type){
            case NodeType.CONTAINER:
                return new DisplayNode();
                break;
        }
    }

    cloneNode(){}

    get type(){
        return this._type;
    }

    set value(value){
        if(NodeType[value] === undefined){
            throw new Error(STR_ERROR_INVALID_TYPE);
        }

        this._value = value;

        switch(this._value){
            case NodeType.TEXT:
                break;

            case NodeType.INPUT_TEXT:
                break;
        }
    }

    get value(){
        return this._value;
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // HIERARCHY
    /*----------------------------------------------------------------------------------------------------------------*/

    getHierarchyBranch(){
        function getNodeProperties(node){
            return {type: node._type, class: node._class, id: node._id};
        }
        let branch = [getNodeProperties(this)];
        let parentNode = this._parentNode;
        while(parentNode !== null && !(parentNode instanceof NodeBase)){
            branch.push(getNodeProperties(parentNode));
            parentNode = parentNode.parentNode;
        }
        return branch;
    }

    set parentNode(node){
        if(node === this._parentNode){
            return;
        }
        if(this._parentNode !== null){
            this._parentNode.removeChild(this);
        }
        this._parentNode.addChild(this);
        this.forceComputeLayout();
    }

    get parentNode(){
        return this._parentNode;
    }

    get previousSibling(){
        if(this._parentNode === null){
            return null;
        }
        let index = this._parentNode.indexOf(this);
        if(index === 0){
            return null;
        }
        return this._parentNode.children[index - 1];
    }

    insertBefore(newNode, referenceNode){
        if(!this.contains(referenceNode)){
            throw new Error('Reference-node is not a child.');
        }
        if(newNode === referenceNode){
            return;
        }
        if(this.contains(newNode)){
            this.removeChild(newNode);
        }
        this.appendChildAt(newNode,this.indexOf(referenceNode));
    }

    appendChild(child){
        if(this.contains(child)){
            return this;
        }
        if(child._parentNode){
            child._parentNode.removeChild(child);
        }

        child._parentNode = this;
        this._children.push(child);
        this.forceComputeLayout();
    }

    appendChildren(nodes){
        for(var node of nodes){
            if(this.contains(node)){
                this.removeChild(node);
            }
            this.appendChild(node);
        }
    }

    appendChildAt(node,index){
        if(this.contains(node)){
            this.removeChild(node);
        }
        node._parentNode = this;
        this._children.splice(index, 0, node);
        this.forceComputeLayout();
    }

    appendChildrenAt(nodes,index){
        for(var node of nodes){
            this.appendChildAt(node,index++);
        }
    }

    removeChild(node){
        if(!this.contains(node)){
            throw new Error('Node is not child of node.');
        }
        node._parentNode = null;
        this._children.splice(this.indexOf(node), 1);
        this.forceComputeLayout();
    }

    removeChildren(nodes){
        for(var node of nodes){
            this.removeChild(node);
        }
    }

    replaceChild(newChild, oldChild){
        if(!this.contains(oldChild)){
            throw new Error('Old node is not a child.');
        }
        if(newChild === oldChild){
            return;
        }
        if(this.contains(newChild)){
            this.removeChild(newChild);
        }

        let index = this.indexOf(oldChild);
        this.appendChildAt(newChild,index);
        this.removeChild(oldChild);
    }

    hasChildNodes(){
        return this._children.length !== 0;
    }

    get children(){
        return this._children;
    }

    get firstChild(){
        return this._children[0];
    }

    get lastChild(){
        return this._children[this._children.length - 1];
    }

    indexOf(node){
        return this._children.indexOf(node);
    }

    contains(node){
         return this.indexOf(node) !== -1;
    }

    get childOrders(){
        return this._childrenOrder.slice(0);
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // STYLE
    /*----------------------------------------------------------------------------------------------------------------*/

    forceComputeLayout() {
        this._shouldComputeLayout = true;
        if(this._parentNode === null || this._parentNode instanceof NodeBase){
            return;
        }
        this._parentNode.forceComputeLayout();
    }

    set id(name){
        this._id = name;
        this.forceComputeLayout();
    }

    get id(){
        return this._id;
    }

    set class(name){
        this._class = name;
        this.forceComputeLayout();
    }

    get class(){
        return this._class;
    }

    set style(style){
        this._styleInline = style.copy();
        this.forceComputeLayout();
    }

    get style(){
        return this._styleInline;
    }

    computeLayout(){
        if(this._style.isProcessed && !this._styleInline.isProcessed && !this._shouldComputeLayout){
            return;
        }

        // Style
        let style = this._style.copy();
        style.merge(this._styleInline);


        //zindex
        switch(style.zIndex){
            case 'auto':
            case 'inherit':
            case 'initial':
                if(this._parentNode !== null){
                    this._zIndex = this._parentNode._zIndex;
                } else {
                    this._zIndex = 0;
                }
                break;
            default:
                this._zIndex = this._style.zIndex;
                break;
        }

        // get children draw order
        this._childrenOrder = new Array(this._children.length);
        for(let i = 0, l = this._children.length; i < l; ++i){
            let child  = this._children[i];
            let inline = child.style.propertiesSet.zIndex;
            let zIndex = inline !== undefined ? inline : child.style.zIndex;
            this._childrenOrder[i] = [i,zIndex];
        }
        this._childrenOrder.sort((a, b)=>{
            return a[1] > b[1] ? 1 : a[1] < b[1] ? -1 : 0
        });


        for(let child of this._children){
            child.computeLayout();
        }

        this._style.isProcessed = true;
        this._shouldComputeLayout = true;
    }


    /*----------------------------------------------------------------------------------------------------------------*/
    // POSITION
    /*----------------------------------------------------------------------------------------------------------------*/

    set position(pos){
        this._transform[6] = pos[0];
        this._transform[7] = pos[1];
        this.forceComputeLayout();
    }

    set positionX(x){
        this._transform[6] = x;
        this.forceComputeLayout();
    }

    set positionY(y){
        this._transform[7] = y;
        this.forceComputeLayout();
    }

    get position(){
        return [this._transform[6],this._transform[7]];
    }

    get positionX(){
        return this._transform[6];
    }

    get positionY(){
        return this._transform[7];
    }

    set positionGlobal(pos){
        let global = this.positionGlobal;
        let diffx = pos[0] - global[0];
        let diffy = pos[1] - global[1];
        this._transform[6] = diffx;
        this._transform[7] = diffy;
        this.forceComputeLayout();
    }

    set positionGlobalX(x){
        let global = this.positionGlobalX;
        this._transform[6] = x - global;
        this.forceComputeLayout();
    }

    set positionGlobalY(y){
        var posAbsy = this.positionGlobalY;
        this._transform[7] = y - posAbsy;
        this.forceComputeLayout();
    }

    get positionGlobal(){
        let transform = this.transformGlobal;
        return [transform[6], transform[7]];
    }

    get positionGlobalX(){
        let transform = this.transformGlobal;
        return transform[6];
    }

    get positionGlobalY(){
        let transform = this.transformGlobal;
        return transform[7];
    }

    get transformGlobal(){
        let transform = Matrix33.copy(this._transform);
        if(this._parentNode === null || this._parentNode instanceof NodeBase){
            return transform;
        }
        return Matrix33.mult(transform,this._parentNode.transformGlobal);
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // SIZE
    /*----------------------------------------------------------------------------------------------------------------*/

    get offsetSize(){
        return this._size.slice(0);
    }

    get offsetWidth(){
        return this._size[0];
    }

    get offsetHeight(){
        return this._size[1];
    }

    //set size(size){
    //    this._size[0] = size[0];
    //    this._size[1] = size[1];
    //    this.forceUpdate();
    //}
    //
    //set width(width){
    //    this._size[0] = width;
    //    this.forceUpdate();
    //}
    //
    //set height(height){
    //    this._size[1] = height;
    //    this.forceUpdate();
    //}

    /*----------------------------------------------------------------------------------------------------------------*/
    // BOUNDS
    /*----------------------------------------------------------------------------------------------------------------*/

    get boundsGlobal(){
        return this._boundsGlobal.slice(0);
    }

    get boundsGlobalAll(){
        let overflow = this._style.overflow = 'hidden';
        return overflow ? this._boundsGlobal.slice(0) : this._boundsAllGlobal.slice(0);
    }

    _updateBoundsAllGlobal(){
        this._boundsAllGlobal = this.boundsGlobal;

        for(var i = 1, l = this._children.length; i < l; ++i){
            var bounds = this._children[i].boundsGlobal;

            if(bounds[0] < this._boundsAllGlobal[0]){
                this._boundsAllGlobal[0] = bounds[0];
            }
            if(bounds[1] < this._boundsAllGlobal[1]){
                this._boundsAllGlobal[1] = bounds[1]
            }
            if(bounds[2] > this._boundsAllGlobal[2]){
                this._boundsAllGlobal[2] = bounds[2];
            }
            if(bounds[3] > this._boundsAllGlobal[3]){
                this._boundsAllGlobal[3] = bounds[3];
            }
        }
    }

    hitTestBoundsGlobal(point){
        return containsPoint(point,this._boundsGlobal);
    }

    hitTestBoundsAllGlobal(point){
        return containsPoint(point,this._boundsAllGlobal);
    }

    _updateBoundsGlobal(){
        var position = this.positionGlobal;

        this._boundsGlobal[0] = position[0];
        this._boundsGlobal[1] = position[1];
        this._boundsGlobal[2] = position[0] + this._size[0];
        this._boundsGlobal[3] = position[1] + this._size[1];
    }

    toDescription(){
        let inlineStyle = '';
        let inlineProperties = this._styleInline.propertiesSet;
        for(let property in inlineProperties){
            let value = inlineProperties[property];
            value = Array.isArray(value) ? ('[' + value + ']') : value;
            inlineStyle += property + ': ' + value +', ';
        }
        inlineStyle = inlineStyle.substr(0,inlineStyle.length-2);
        return super.toDescription(
            `${ inlineStyle.length > 0 ? ('style: "' + inlineStyle + '", ') : '' }`
        );
    }

}

//var AbstractNode = require('./AbstractNode');
//var EventDispatcher       = require('../core/event/EventDispatcher');
//var Stage                 = require('./Stage');
//
//var Style   = require('./layout/Style');
//var Align   = require('./layout/Align');
//var Size    = require('./layout/Size');
//var Metrics = require('./layout/Metrics');
//
//var Matrix33 = require('../core/math/Matrix33');
//
//function DisplayNode(){
//    AbstractNode.apply(this);
//
//    this._parentNode = null;
//
//    this._transform = Matrix33.create();
//
//    this._size            = [0,0];
//    this._boundsGlobal    = [0,0,0,0];
//    this._boundsAllGlobal = [0,0,0,0];
//
//    this._children = [];
//
//    this._eventDispatcher = new EventDispatcher();
//
//    this._class = null;
//
//    /**
//     * @type {boolean}
//     * @protected
//     */
//    this._needsRepaint   = true;
//
//    this._overflow = true;
//    this._visible = true;
//
//    this._style = null;
//}
//
//DisplayNode.prototype = Object.create(AbstractNode.prototype);
//DisplayNode.prototype.constructor = DisplayNode;
//
//DisplayNode.prototype.setClass = function(name){
//    this._class = name;
//};
//
//DisplayNode.prototype.getClass = function(){
//    return this._class;
//};

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

///*--------------------------------------------------------------------------------------------------------------------*/
//// State
///*--------------------------------------------------------------------------------------------------------------------*/
//
//DisplayNode.prototype.setVisible = function(visible){
//    this._visible = visible;
//};
//
//DisplayNode.prototype.isVisible = function(){
//    return this._visible;
//};
//
//DisplayNode.prototype.setOverflow = function(overflow){
//    this._overflow = overflow;
//};
//
//DisplayNode.prototype.canOverflow = function(){
//    return this._overflow;
//};
//
///*--------------------------------------------------------------------------------------------------------------------*/
//// Bounds
///*--------------------------------------------------------------------------------------------------------------------*/
//
//DisplayNode.prototype.updateBoundsAllGlobal = function(){
//    var boundsGlobalAll = this._boundsAllGlobal = this.getBoundsGlobal();
//
//    for(var i = 1, l = this._children.length; i < l; ++i){
//        var bounds = this._children[i].getBoundsGlobal();
//
//        if(bounds[0] < boundsGlobalAll[0]){
//            boundsGlobalAll[0] = bounds[0];
//        }
//
//        if(bounds[1] < boundsGlobalAll[1]){
//            boundsGlobalAll[1] = bounds[1]
//        }
//
//        if(bounds[2] > boundsGlobalAll[2]){
//            boundsGlobalAll[2] = bounds[2];
//        }
//
//        if(bounds[3] > boundsGlobalAll[3]){
//            boundsGlobalAll[3] = bounds[3];
//        }
//    }
//};
//
//DisplayNode.prototype.udateBoundsGlobal = function(){
//    var posAbs = this.getPositionAbsolute();
//
//    this._boundsGlobal[0] = posAbs[0];
//    this._boundsGlobal[1] = posAbs[1];
//    this._boundsGlobal[2] = posAbs[1] + this._size[0];
//    this._boundsGlobal[3] = posAbs[2] + this._size[1];
//};
//
//DisplayNode.prototype.getBoundsGlobal = function(){
//    return this._boundsGlobal.slice(0);
//};
//
//DisplayNode.prototype.getBoundsAllGlobal = function(){
//    return this._overflow ? this._boundsGlobal.slice(0) : this._boundsAllGlobal.slice(0);
//};
//
//function containsPoint(point,bounds){
//    return point[0] >= bounds[0] &&
//           point[0] <= bounds[2] &&
//           point[1] >= bounds[1] &&
//           point[1] <= bounds[3];
//}
//
//DisplayNode.prototype.hitTestBoundsGlobal = function(point){
//    return containsPoint(point,this._boundsGlobal);
//};
//
//DisplayNode.prototype.hitTestBoundsAllGlobal = function(point){
//    return containsPoint(point,this._boundsAllGlobal);
//};
//
///*--------------------------------------------------------------------------------------------------------------------*/
//// Children
///*--------------------------------------------------------------------------------------------------------------------*/
//
//DisplayNode.prototype.addChild = function(child){
//    if(this._children.indexOf(child) !== -1){
//        return this;
//    }
//    if(child._parent){
//        child._parent.removeChild(child);
//    }
//
//    child._parent = this;
//    this.updateLayoutWithStyle();
//
//    this.updateBoundsAllGlobal();
//    this._needsRepaint = true;
//
//    this._children.push(child);
//    return this;
//};
//
//DisplayNode.prototype.addChildAt = function(child, index){
//    if(this._children.indexOf(child) !== -1){
//        return this;
//    }
//    if(child._parent !== null){
//        child._parent.removeChild(child);
//    }
//
//    child._parent = this;
//    this.updateBoundsAllGlobal();
//
//    this._children.splice(index, 0, child);
//
//    this._needsRepaint = true;
//    return this;
//};
//
//DisplayNode.prototype.getChildIndex = function(child){
//    return this._children.indexOf(child);
//};
//
//DisplayNode.prototype.getChildAt = function(index){
//    if(index < 0 || index > (this._children.length - 1)){
//        throw new RangeError('Child index out of range.');
//    }
//
//    return this._children[index];
//};
//
//DisplayNode.prototype.getNumChildren = function(){
//    return this._children.length;
//};
//
//DisplayNode.prototype.getFirstChild = function(){
//    return this._children[0];
//};
//
//DisplayNode.prototype.getLastChild = function(){
//    return this._children[this._children.length - 1];
//};
//
//DisplayNode.prototype.hasChildren = function(){
//    return this._children.length !== 0;
//};
//
//DisplayNode.prototype.removeChildAt = function(index){
//    if(index < 0 || index > (this._children.length - 1)){
//        throw new RangeError('Child index out of range.');
//    }
//    var child = this.getChildAt(index);
//
//    this._children.splice(index,1);
//
//    this.updateBoundsAllGlobal();
//
//    this._needsRepaint = true;
//    return this;
//};
//
//DisplayNode.prototype.removeChild = function(child){
//    return this.removeChildAt(this.getChildIndex(child)) ;
//};
//
//DisplayNode.prototype.swapChildrenAt = function(childAIndex, childBIndex){
//    var childA = this.getChildAt(childAIndex);
//
//    this._children[childAIndex] = this.getChildAt(childBIndex);
//    this._children[childBIndex] = childA;
//
//    this.updateBoundsAllGlobal();
//
//    this._needsRepaint = true;
//    return this;
//};
//
//DisplayNode.prototype.setChildIndex = function(childIndexOld, childIndexNew){
//    var child = this.getChildIndex(childIndexOld);
//    this.removeChild(child);
//    this.addChildAt(child,childIndexNew);
//
//    this._needsRepaint = true;
//    return this;
//};
//
//DisplayNode.prototype.getParentIndex = function(){
//    return this._parent.getChildIndex(this);
//};
//
///*--------------------------------------------------------------------------------------------------------------------*/
//// Position
///*--------------------------------------------------------------------------------------------------------------------*/
//
//DisplayNode.prototype.setPosition = function(pos){
//    this._transform[6] = pos[0];
//    this._transform[7] = pos[1];
//    this._needsRepaint = true;
//    return this;
//};
//
//DisplayNode.prototype.setPositionX = function(x){
//    this._transform[6] = x;
//    this._needsRepaint = true;
//    return this;
//};
//
//DisplayNode.prototype.setPositionY = function(y){
//    this._transform[7] = y;
//    this._needsRepaint = true;
//    return this;
//};
//
//DisplayNode.prototype.getPosition = function(){
//    return [this._transform[6],this._transform[7]];
//};
//
//DisplayNode.prototype.getPositionX = function(){
//    return this._transform[6];
//};
//
//DisplayNode.prototype.getPositionY = function(){
//    return this._transform[7]
//};
//
//
//DisplayNode.prototype.setPositionAbsolute = function(pos){
//    var posAbs = this.getPositionAbsolute();
//    var diffx  = pos[0] - posAbs[0];
//    var diffy  = pos[1] - posAbs[1];
//
//    this._transform[6] = diffx;
//    this._transform[7] = diffy;
//
//    this._needsRepaint = true;
//    return this;
//};
//
//DisplayNode.prototype.setPositionXAbsolute = function(x){
//    var posAbsx = this.getPositionXAbsolute();
//    this._transform[6] = x - posAbsx;
//
//    this._needsRepaint = true;
//    return this;
//};
//
//DisplayNode.prototype.setPositionYAbsolute = function(y){
//    var posAbsy = this.getPositionYAbsolute();
//    this._transform[7] = y - posAbsy;
//
//    this._needsRepaint = true;
//    return this;
//};
//
//DisplayNode.prototype.getGlobalTransform = function(){
//    var transform = Matrix33.copy(this._transform);
//    var parent    = this._parent;
//
//    if(parent === null || parent instanceof Stage){
//        return transform;
//    }
//
//    return  Matrix33.mult(transform,parent.getGlobalTransform());
//};
//
//DisplayNode.prototype.getPositionAbsolute = function(){
//    var transform = this.getGlobalTransform();
//    return [transform[6],transform[7]];
//};
//
//DisplayNode.prototype.getPositionXAbsolute = function(){
//    var transform = this.getGlobalTransform();
//    return transform[6];
//};
//
//DisplayNode.prototype.getPositionYAbsolute = function(){
//    var transform = this.getGlobalTransform();
//    return transform[7];
//};
//
///*--------------------------------------------------------------------------------------------------------------------*/
//// Size
///*--------------------------------------------------------------------------------------------------------------------*/
//
//DisplayNode.prototype.setSize = function(size){
//    this._size[0] = size[0];
//    this._size[1] = size[1];
//
//    this._needsRepaint = true;
//    return this;
//};
//
//DisplayNode.prototype.setWidth = function(width){
//    this._size[0] = width;
//
//    this._needsRepaint = true;
//    return this;
//};
//
//DisplayNode.prototype.setHeight = function(height){
//    this._size[1] = height;
//
//    this._needsRepaint = true;
//    return this;
//};
//
//DisplayNode.prototype.getSize = function(){
//    return this._size.slice(0);
//};
//
//DisplayNode.prototype.getWidth  = function(){
//    return this._size[0];
//};
//
//DisplayNode.prototype.getHeight = function(){
//    return this._size[1];
//};
//
///*--------------------------------------------------------------------------------------------------------------------*/
//// Event
///*--------------------------------------------------------------------------------------------------------------------*/
//
//DisplayNode.prototype.addEventListener = function(type, listener, methodName){
//    this._eventDispatcher.addEventListener(type,listener,methodName);
//    return this;
//};
//
//DisplayNode.prototype.removeEventListener = function(type, listener, methodName){
//    this._eventDispatcher.removeEventListener(type,listener,methodName);
//    return this;
//};
//
//DisplayNode.prototype.dispatchEvent = function(event){
//    this._eventDispatcher.dispatchEvent(event);
//    return this;
//};
//
///*--------------------------------------------------------------------------------------------------------------------*/
//// Export
///*--------------------------------------------------------------------------------------------------------------------*/
//
//module.exports = DisplayNode;