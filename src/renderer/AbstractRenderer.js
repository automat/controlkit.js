import EventDispatcher from "../core/event/EventDispatcher"

const STR_ERROR_INVALID_TYPE = 'Invalid type.';
const STR_ERROR_NOT_IMPLEMENTED = 'Function not implemented.';

export default class AbstractRenderer extends EventDispatcher{
    constructor(){
        super();
        this._drawDebug = false;
        this._base = null;
    }

    get base(){
        return this._base;
    }

    draw(){
        throw new Error(STR_ERROR_NOT_IMPLEMENTED);
    }
}