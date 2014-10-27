var ObjectComponent = require('../core/component/ObjectComponent');
var Node = require('../core/document/Node');
var NodeType = require('../core/document/NodeType');
var NodeEventType = require('../core/document/NodeEventType');
var Event_ = require('../core/event/Event');
var EventType = require('../core/event/EventType');

function Checkbox(parent,object,value,params)
{
    ObjectComponent.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params = params || {};
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || this._onFinish;

    /*---------------------------------------------------------------------------------*/

    this._onChange = params.onChange;
    this._onFinish = params.onFinish;

    var input = this._input = new Node(NodeType.INPUT_CHECKBOX);

    input.setProperty('checked',this._object[this._key]);
    input.addEventListener(NodeEventType.CHANGE,this._onInputChange.bind(this));

    this._wrapNode.addChild(this._input);
};

Checkbox.prototype = Object.create(ObjectComponent.prototype);

Checkbox.prototype.applyValue = function()
{
    this.pushHistoryState();

    var obj = this._object,key = this._key;
    obj[key] = !obj[key];

    this.dispatchEvent(new Event_(this,EventType.VALUE_UPDATED,null));
};

Checkbox.prototype._onInputChange = function()
{
    this.applyValue();
    this._onChange();
};

Checkbox.prototype.onValueUpdate = function(e)
{
    if(e.data.origin == this)return;
    this._input.setProperty('checked',this._object[this._key]);
};

module.exports = Checkbox;

//ControlKit.Checkbox = function(parent,object,value,params)
//{
//    ControlKit.ObjectComponent.apply(this,arguments);
//
//    /*---------------------------------------------------------------------------------*/
//
//    params = params || {};
//    params.onChange = params.onChange || this._onChange;
//    params.onFinish = params.onFinish || this._onFinish;
//
//    /*---------------------------------------------------------------------------------*/
//
//    this._onChange = params.onChange;
//    this._onFinish = params.onFinish;
//
//    var input = this._input = new ControlKit.Node(ControlKit.NodeType.INPUT_CHECKBOX);
//
//    input.setProperty('checked',this._object[this._key]);
//    input.addEventListener(ControlKit.NodeEventType.CHANGE,this._onInputChange.bind(this));
//
//    this._wrapNode.addChild(this._input);
//};
//
//ControlKit.Checkbox.prototype = Object.create(ControlKit.ObjectComponent.prototype);
//
//ControlKit.Checkbox.prototype.applyValue = function()
//{
//    this.pushHistoryState();
//
//    var obj = this._object,key = this._key;
//    obj[key] = !obj[key];
//
//    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.VALUE_UPDATED,null));
//};
//
//ControlKit.Checkbox.prototype._onInputChange = function()
//{
//    this.applyValue();
//    this._onChange();
//};
//
//ControlKit.Checkbox.prototype.onValueUpdate = function(e)
//{
//    if(e.data.origin == this)return;
//    this._input.setProperty('checked',this._object[this._key]);
//};