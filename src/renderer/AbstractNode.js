import EventDispatcher from "../core/event/EventDispatcher";
import AbstractNodeBase from "./AbstractNodeBase";
import NodeType from "./NodeType";

const STR_ERROR_INVALID_TYPE = 'Invalid type.';
const STR_ERROR_NOT_IMPLEMENTED = 'Function not implemented.';

export default class AbstractNode extends EventDispatcher{
    constructor(){
        super();
    }

    static create(type,args){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    cloneNode(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    get type(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    set value(value){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    get value(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    set textContent(text){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    get textContent(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // EVENT
    /*----------------------------------------------------------------------------------------------------------------*/

    /*----------------------------------------------------------------------------------------------------------------*/
    // HIERARCHY
    /*----------------------------------------------------------------------------------------------------------------*/

    get nestingLevel(){
        var level = 0;
        var parentNode = this.parentNode;
        while(!(parentNode instanceof AbstractNodeBase) || !parentNode){
            level++;
            parentNode = parentNode.parentNode;
        }
        return level;
    }

    set parentNode(node){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    get parentNode(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    get previousSibling(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    insertBefore(newNode, referenceNode){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    appendChild(node){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    appendChildren(nodes){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    appendChildAt(node,index){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    appendChildrenAt(nodes,index){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    removeChild(node){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    removeChildren(nodes){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    replaceChild(newChild, oldChild){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    hasChildNodes(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    get children(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    get firstChild(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    get lastChild(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    indexOf(node){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    contains(node){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // STYLE
    /*----------------------------------------------------------------------------------------------------------------*/

    set id(name){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    get id(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    set class(name){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    get class(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    set style(style){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    get style(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // POSITION
    /*----------------------------------------------------------------------------------------------------------------*/

    set position(pos){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    get position(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    set positionX(x){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    get positionX(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    set positionY(y){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    get positionY(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    set positionGlobal(pos){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    get positionGlobal(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    set positionGlobalX(x){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    get positionGlobalX(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    set positionGlobalY(y){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    get positionGlobalY(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // SIZE
    /*----------------------------------------------------------------------------------------------------------------*/

    get offsetSize(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    get offsetWidth(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    get offsetHeight(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    get offsetLeft(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    get offsetTop(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // DESCRIPTION
    /*----------------------------------------------------------------------------------------------------------------*/

    toDescription(infoAdditional = ''){
        let level = this.nestingLevel;

        const indentation = '    ';

        function getIndentation(level){
            let indentation_ = '';
            for(let i = 0; i < level; ++i){
                indentation_ += indentation;
            }
            return indentation_;
        }

        let nodeIndentation     = getIndentation(level);
        let childrenIndentation = getIndentation(level + 1);

        let childrenDescription = '[';
        for(var child of this.children){
            childrenDescription += '\n' + childrenIndentation + child.toDescription();
        }

        childrenDescription += (this.children.length > 0 ? ('\n' + nodeIndentation) : '') + ']';
        return '{' +
                    `type: "${ this.type }", `+
                    `level: ${level}, ` +
                    `${this.parentNode !== null ? ('parent: "' + this.parentNode.type + '", ') : ''}` +
                    `${this.id !== null ? ('id: "' + this.id + '", ') : ''}` +
                    `${this.class !== null ? ('class: "' + this.class + '", ') : ''}` +
                    infoAdditional +
                    `children: ${ childrenDescription }` +
                '}';
    }
}


//var STR_ERROR_NOT_IMPLEMENTED = 'Function not implemented.';
//
//function AbstractNode(){
//    this._parent   = null;
//    this._overflow = false;
//    this._visible  = true;
//}
//
//AbstractNode.prototype.create
//
///*--------------------------------------------------------------------------------------------------------------------*/
//// Parent
///*--------------------------------------------------------------------------------------------------------------------*/
//
//AbstractNode.prototype.getParent = function(){
//    return this._parent;
//};
//
///*--------------------------------------------------------------------------------------------------------------------*/
//// Style
///*--------------------------------------------------------------------------------------------------------------------*/
//
//AbstractNode.prototype.setStyle = function(config){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
//AbstractNode.prototype.getStyle = function(){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
//AbstractNode.prototype.setClass = function(name){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
//AbstractNode.prototype.getClass = function(){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
///*--------------------------------------------------------------------------------------------------------------------*/
//// Children
///*--------------------------------------------------------------------------------------------------------------------*/
//
//AbstractNode.prototype.addChild = function(child){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
//AbstractNode.prototype.addChildAt = function(child, index){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
//AbstractNode.prototype.addChildren = function(args){
//    var children = args instanceof Array ? args : arguments;
//
//    for(var i = 0, l = children.length; i < l; ++i){
//        this.addChild(children[i]);
//    }
//
//    return this;
//};
//
//AbstractNode.prototype.getChildIndex = function(child){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
//AbstractNode.prototype.getChildAt = function(index){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
//AbstractNode.prototype.getNumChildren = function(){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
//AbstractNode.prototype.getFirstChild = function(){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
//AbstractNode.prototype.getLastChild = function(){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
//AbstractNode.prototype.hasChildren = function(){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
//AbstractNode.prototype.removeChildAt = function(index){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
//AbstractNode.prototype.removeChild = function(child){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
//AbstractNode.prototype.removeChildren = function(args){
//    var children = args instanceof Array ? args : arguments;
//
//    for(var i = 0, l = children.length; i < l; ++i){
//        var index = this.getChildIndex(children[i]);
//        if(index === -1){
//            continue;
//        }
//        this.removeChildAt(index);
//    }
//
//    return this;
//};
//
///*--------------------------------------------------------------------------------------------------------------------*/
//// Position
///*--------------------------------------------------------------------------------------------------------------------*/
//
//AbstractNode.prototype.setPosition = function(pos){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
//AbstractNode.prototype.setPositionX = function(x){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
//AbstractNode.prototype.setPositionY = function(y){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
//AbstractNode.prototype.getPosition = function(){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
//AbstractNode.prototype.getPositionX = function(x){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
//AbstractNode.prototype.getPositionY = function(y){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
//
//AbstractNode.prototype.setPositionAbsolute = function(pos){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
//AbstractNode.prototype.setPositionXAbsolute = function(x){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
//AbstractNode.prototype.setPositionYAbsolute = function(y){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
//AbstractNode.prototype.getPositionAbsolute = function(){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
//AbstractNode.prototype.getPositionXAbsolute = function(){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
//AbstractNode.prototype.getPositionYAbsolute = function(){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
///*--------------------------------------------------------------------------------------------------------------------*/
//// Size
///*--------------------------------------------------------------------------------------------------------------------*/
//
//AbstractNode.prototype.setSize = function(size){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
//AbstractNode.prototype.setWidth = function(width){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
//AbstractNode.prototype.setHeight = function(height){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
//AbstractNode.prototype.getSize = function(){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
//AbstractNode.prototype.getWidth  = function(){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
//AbstractNode.prototype.getHeight = function(){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
///*--------------------------------------------------------------------------------------------------------------------*/
//// Stats
///*--------------------------------------------------------------------------------------------------------------------*/
//
//AbstractNode.prototype.setOverflow = function(overflow){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
//AbstractNode.prototype.canOverflow = function(){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
//AbstractNode.prototype.setVisible = function(visible){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
///*--------------------------------------------------------------------------------------------------------------------*/
//// Event
///*--------------------------------------------------------------------------------------------------------------------*/
//
//AbstractNode.prototype.addEventListener = function(type, listener, methodName){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
//AbstractNode.prototype.removeEventListener = function(type, listener, methodName){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
//AbstractNode.prototype.dispatchEvent = function(event){
//    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
//};
//
///*--------------------------------------------------------------------------------------------------------------------*/
//// Export
///*--------------------------------------------------------------------------------------------------------------------*/
//
//module.exports = AbstractNode;