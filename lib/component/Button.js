var Event_         = require('../core/event/Event'),
    NodeEvent      = require('../core/document/NodeEvent'),
    ComponentEvent = require('../core/ComponentEvent');

var Node      = require('../core/document/Node'),
    Component = require('../core/Component');

var CSS = require('../core/document/CSS');

var DEFAULT_LABEL = '';

function Button(parent,label,onPress,params) {
    onPress      = onPress || function(){};
    params       = params       || {};
    params.label = params.label || DEFAULT_LABEL;

    Component.apply(this,[parent,params.label]);

    var node = this._inputNode = new Node(Node.INPUT_BUTTON);

    node.setStyleClass(CSS.Button);
    node.setProperty('value',label);

    var self = this;
    node.addEventListener(NodeEvent.ON_CLICK,
                           function() {
                               onPress.bind(self)();
                               self.dispatchEvent(new Event_(self,ComponentEvent.VALUE_UPDATED));
                           });

    this._wrapNode.addChild(node);
}
Button.prototype = Object.create(Component.prototype);
Button.prototype.constructor = Button;

Button.prototype.getButtonLabel = function(){
    return this._inputNode.getProperty('value');
};

Button.prototype.setButtonLabel = function(label){
    this._inputNode.setProperty('value',label);
};

module.exports = Button;
