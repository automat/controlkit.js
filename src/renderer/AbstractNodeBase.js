import EventDispatcher from "../core/event/EventDispatcher";
import NodeType from "./NodeType";

const STR_ERROR_NOT_IMPLEMENTED = 'Function not implemented.';

export default class AbstractNodeBase extends EventDispatcher{
    constructor(){
        super();
        this._type = NodeType.BASE;
        this._style = null;
    }

    get type(){
        return this._type;
    }

    appendChild(node){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    appendChildren(nodes){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    removeChild(nodes){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    removeChildren(nodes){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }

    contains(node){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }
}