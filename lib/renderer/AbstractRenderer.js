var EventDispatcher = require('../core/event/EventDispatcher');

var STR_ERROR_NOT_IMPLEMENTED = 'Function not implemented.';

function AbstractRenderer(){
    EventDispatcher.apply(this);

    this._stage = null;
}

AbstractRenderer.prototype = Object.create(EventDispatcher.prototype);
AbstractRenderer.prototype.constructor = AbstractRenderer;

AbstractRenderer.prototype.createPanel = function(){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractRenderer.prototype.createGroup = function(){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractRenderer.prototype.createSubGroup = function(){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractRenderer.prototype.createButton = function(){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractRenderer.prototype.handleResize = function(e){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

/*--------------------------------------------------------------------------------------------------------------------*/
// Export
/*--------------------------------------------------------------------------------------------------------------------*/

module.exports = AbstractRenderer;