var ComponentObjectError    = require('./ComponentObjectError');
var AbstractComponent       = require('./AbstractComponent');
var ObjectComponentEvent    = require('./ObjectComponentEvent');
var ObjectComponentNotifier = require('./ObjectComponentNotifier');

/**
 * Component hooked to actual objects.
 * @param parent
 * @param obj
 * @param key
 * @param options
 * @constructor
 */
function AbstractObjectComponent(parent, obj, key, options){
    if(obj[key] === undefined){
        throw new ComponentObjectError(obj,key);
    }

    options       = options || {};
    options.label = options.label || key;

    AbstractComponent.apply(this,[parent,options.label]);

    this._obj    = obj;
    this._objKey = key;

    var notifier = ObjectComponentNotifier.get();
    notifier.addEventListener(ObjectComponentEvent.UPDATE_VALUE,this,'onValueUpdate');
    //this.addEventListener(ObjectComponentEvent.VALUE_UPDATED,this,'onValueUpdated');
}

AbstractObjectComponent.prototype = Object.create(AbstractObjectComponent.prototype);
AbstractObjectComponent.prototype.constructor = AbstractObjectComponent;

module.exports = AbstractObjectComponent;



