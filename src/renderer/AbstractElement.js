import EventDispatcher from "../core/event/EventDispatcher";
import NodeType from "./NodeType";

const STR_ERROR_NOT_IMPLEMENTED = 'Function not implemented.';

export default class AbstractElement extends EventDispatcher{
    constructor(type){
        super();
        this._type = type;
        this._style = null;
    }

    get type(){
        return this._type;
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
}