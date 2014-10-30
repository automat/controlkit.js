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

    var input = new Node(Node.INPUT_BUTTON);

    input.setStyleClass(CSS.Button);
    input.setProperty('value',label);

    var self = this;
    input.addEventListener(NodeEvent.ON_CLICK,
                           function() {
                               onPress();
                               self.dispatchEvent(new Event_(self,ComponentEvent.VALUE_UPDATED));
                           });

    this._wrapNode.addChild(input);
}
Button.prototype = Object.create(Component.prototype);

module.exports = Button;
