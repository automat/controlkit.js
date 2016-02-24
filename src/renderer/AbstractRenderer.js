import EventDispatcher from "../core/event/EventDispatcher"

const STR_ERROR_INVALID_TYPE = 'Invalid type.';
const STR_ERROR_NOT_IMPLEMENTED = 'Function not implemented.';

export default class AbstractRenderer extends EventDispatcher{
    constructor(){
        super();
        this._drawDebug = false;
    }

    set drawDebug(debug){
        if(typeof debug !== 'boolean'){
            throw new TypeError(STR_ERROR_INVALID_TYPE);
        }
        this._drawDebug = debug;
    }

    get drawDebug(){
        return this._drawDebug;
    }

    draw(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }
}