ControlKit.Button = function(parent,label,onPress,params)
{
    params       = params       || {};
    params.label = params.label || '';

    ControlKit.Component.apply(this,[parent,params.label]);

    var input = this._textArea = new ControlKit.Node(ControlKit.NodeType.INPUT_BUTTON);

    onPress = onPress || function(){};

    input.setStyleClass(ControlKit.CSS.Button);
    input.setProperty('value',label);
    input.addEventListener(ControlKit.NodeEventType.ON_CLICK,
                           function()
                           {
                               onPress();
                               this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.VALUE_UPDATED));
                           }.bind(this));

    this._wrapNode.addChild(input);
};

ControlKit.Button.prototype = Object.create(ControlKit.Component.prototype);
