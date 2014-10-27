var ObjectComponent = require('../../core/component/ObjectComponent');
var Default = require('../../core/Default');
var Node = require('../../core/document/Node');
var NodeType = require('../../core/document/NodeType');
var NodeEventType = require('../../core/document/NodeEventType');
var EventType = require('../../core/event/EventType');
var CSS = require('../../core/document/CSS');
var Metric = require('../../core/Metric');
var ScrollBar = require('../../core/layout/ScrollBar');
var DocumentEventType = require('../../core/document/DocumentEventType');
var Event_ = require('../../core/event/Event');

function Output(parent,object,value,params) {
    ObjectComponent.apply(this,arguments);

    params            = params        || {};
    params.height     = params.height || Default.OUTPUT_HEIGHT;
    params.wrap       = params.wrap   === undefined ?
                        Default.OUTPUT_WRAP :
                        params.wrap;
    params.update     = params.update === undefined ?
                        Default.OUTPUT_UPDATE :
                        params.update;

    this._wrap = params.wrap;
    this._update = params.update;

    var textArea = this._textArea = new Node(NodeType.TEXTAREA),
        wrapNode = this._wrapNode,
        rootNode = this._node;

        textArea.setProperty('readOnly',true);
        wrapNode.addChild(textArea);

        textArea.addEventListener(NodeEventType.MOUSE_DOWN,this._onInputDragStart.bind(this));
        this.addEventListener(EventType.INPUT_SELECT_DRAG,this._parent,'onComponentSelectDrag');


    if(params.height){
        var textAreaWrap = new Node(NodeType.DIV);
            textAreaWrap.setStyleClass(CSS.TextAreaWrap);
            textAreaWrap.addChild(textArea);
            wrapNode.addChild(textAreaWrap);

        //FIXME
        var height  = this._height = params.height,
            padding = 4;

            textArea.setHeight(Math.max(height + padding  ,Metric.COMPONENT_MIN_HEIGHT));
            wrapNode.setHeight(textArea.getHeight());
            rootNode.setHeight(wrapNode.getHeight() + padding);

        this._scrollBar = new ScrollBar(textAreaWrap,textArea,height - padding)
    }

    if(params.wrap)textArea.setStyleProperty('white-space','pre-wrap');

    this._prevString = '';
    this._prevScrollHeight = -1;
    this._setValue();
}

Output.prototype = Object.create(ObjectComponent.prototype);


//Override in subclass
Output.prototype._setValue = function () {};


Output.prototype.onValueUpdate = function () {
    this._setValue();
};

Output.prototype.update = function () {
    if(!this._update){
        return;
    }
    this._setValue();
};


//Prevent chrome select drag

Output.prototype._onDrag = function(){
    this.dispatchEvent(new Event_(this, EventType.INPUT_SELECT_DRAG, null));
};

Output.prototype._onDragFinish = function(){
    this.dispatchEvent(new Event_(this, EventType.INPUT_SELECT_DRAG, null));

    document.removeEventListener(DocumentEventType.MOUSE_MOVE, this._onDrag, false);
    document.removeEventListener(DocumentEventType.MOUSE_MOVE, this._onDragFinish, false);
};

Output.prototype._onInputDragStart = function() {
    this.dispatchEvent(new Event_(this, EventType.INPUT_SELECT_DRAG, null));
    document.addEventListener(DocumentEventType.MOUSE_MOVE, this._onDrag.bind(this), false);
    document.addEventListener(DocumentEventType.MOUSE_UP,   this._onDragFinish.bind(this), false);
};


module.exports = Output;


//ControlKit.Output = function(parent,object,value,params)
//{
//    ControlKit.ObjectComponent.apply(this,arguments);
//
//    /*---------------------------------------------------------------------------------*/
//
//    params            = params        || {};
//    params.height     = params.height || ControlKit.Default.OUTPUT_HEIGHT;
//    params.wrap       = params.wrap   === undefined ?
//                        ControlKit.Default.OUTPUT_WRAP :
//                        params.wrap;
//    params.update     = params.update === undefined ?
//                        ControlKit.Default.OUTPUT_UPDATE :
//                        params.update;
//
//    /*---------------------------------------------------------------------------------*/
//
//    this._wrap = params.wrap;
//
//    this._update = params.update;
//
//    var textArea = this._textArea = new ControlKit.Node(ControlKit.NodeType.TEXTAREA),
//        wrapNode = this._wrapNode,
//        rootNode = this._node;
//
//        textArea.setProperty('readOnly',true);
//        wrapNode.addChild(textArea);
//
//        textArea.addEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onInputDragStart.bind(this));
//        this.addEventListener(ControlKit.EventType.INPUT_SELECT_DRAG,this._parent,'onComponentSelectDrag');
//
//    /*---------------------------------------------------------------------------------*/
//
//    if(params.height)
//    {
//        var textAreaWrap = new ControlKit.Node(ControlKit.NodeType.DIV);
//            textAreaWrap.setStyleClass(ControlKit.CSS.TextAreaWrap);
//            textAreaWrap.addChild(textArea);
//            wrapNode.addChild(textAreaWrap);
//
//
//        //FIXME
//        var height  = this._height = params.height,
//            padding = 4;
//
//            textArea.setHeight(Math.max(height + padding  ,ControlKit.Metric.COMPONENT_MIN_HEIGHT));
//            wrapNode.setHeight(textArea.getHeight());
//            rootNode.setHeight(wrapNode.getHeight() + padding);
//
//        this._scrollBar = new ControlKit.ScrollBar(textAreaWrap,textArea,height - padding)
//    }
//
//    if(params.wrap)textArea.setStyleProperty('white-space','pre-wrap');
//
//    /*---------------------------------------------------------------------------------*/
//
//    this._prevString = '';
//    this._prevScrollHeight = -1;
//    this._setValue();
//};
//
//ControlKit.Output.prototype = Object.create(ControlKit.ObjectComponent.prototype);
//
///*---------------------------------------------------------------------------------*/
//
////Override in subclass
//ControlKit.Output.prototype._setValue     = function(){};
//ControlKit.Output.prototype.onValueUpdate = function(){this._setValue();};
//ControlKit.Output.prototype.update        = function(){if(!this._update)this._setValue();};
//
///*---------------------------------------------------------------------------------*/
//
////Prevent chrome select drag
//ControlKit.Output.prototype._onInputDragStart = function()
//{
//    var eventMove = ControlKit.DocumentEventType.MOUSE_MOVE,
//        eventUp   = ControlKit.DocumentEventType.MOUSE_UP;
//
//    var event = ControlKit.EventType.INPUT_SELECT_DRAG;
//
//    var self  = this;
//
//    var onDrag = function()
//        {
//            self.dispatchEvent(new ControlKit.Event(this,event,null));
//        },
//
//        onDragFinish = function()
//        {
//            self.dispatchEvent(new ControlKit.Event(this,event,null));
//
//            document.removeEventListener(eventMove, onDrag,       false);
//            document.removeEventListener(eventMove, onDragFinish, false);
//        };
//
//    this.dispatchEvent(new ControlKit.Event(this,event,null));
//
//    document.addEventListener(eventMove, onDrag,       false);
//    document.addEventListener(eventUp,   onDragFinish, false);
//};
