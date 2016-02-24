var AbstractComponent = require('AbstractComponent');

function AbstractButton(parent, onPress, options){
    if(onPress === null || onPress === undefined){
        throw new Error('Missing onPress callback.');
    }

    options       = options || {};
    options.label = options.label || '';

    AbstractComponent.apply(this,[parent,options.label]);

    this._callback = onPress;
}

AbstractButton.prototype = Object.create(AbstractComponent.prototype);
AbstractButton.prototype.constructor = AbstractButton;

module.exports = AbstractButton;