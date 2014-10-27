var Component = require('../core/component/Component');
var Node = require('../core/document/Node');
var Event_ = require('../core/event/Event');
var EventType = require('../core/event/EventType');
var Default = require('../core/Default');
var NodeType = require('../core/document/NodeType');
var CSS = require('../core/document/CSS');
var NodeEventType = require('../core/document/NodeEventType');

function Button(parent,label,onPress,params) {
    onPress      = onPress || function(){};
    params       = params       || {};
    params.label = params.label || Default.BUTTON_LABEL;

    Component.apply(this,[parent,params.label]);

    var input = new Node(NodeType.INPUT_BUTTON);

    input.setStyleClass(CSS.Button);
    input.setProperty('value',label);
    input.addEventListener(NodeEventType.ON_CLICK,
                           function() {
                               onPress();
                               this.dispatchEvent(new Event_(this,EventType.VALUE_UPDATED));
                           }.bind(this));

    this._wrapNode.addChild(input);
}
Button.prototype = Object.create(Component.prototype);

module.exports = Button;
