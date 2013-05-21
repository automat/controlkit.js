ControlKit.History = function()
{
    ControlKit.EventDispatcher.apply(this,arguments);
    this._states = [];
};

ControlKit.History.prototype = Object.create(ControlKit.EventDispatcher.prototype);

/*---------------------------------------------------------------------------------*/

ControlKit.History.prototype.pushState = function(object,key,value)
{
    var states    = this._states,
        statesMax = ControlKit.Constant.HISTORY_MAX_STATES;

    if(states.length >= statesMax)states.shift();
    states.push({object:object,key:key,value:value});

    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.HISTORY_STATE_PUSH,null));
};

ControlKit.History.prototype.popState  = function()
{
    var states = this._states;
    if(states.length < 1)return;

    var lastState = states.pop();
    lastState.object[lastState.key] = lastState.value;

    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.HISTORY_STATE_POP,null));
};


ControlKit.History.prototype.getNumStates = function(){return this._states.length;};

/*---------------------------------------------------------------------------------*/

ControlKit.History._instance   = null;
ControlKit.History.init        = function(){return ControlKit.History._instance = new ControlKit.History();};
ControlKit.History.getInstance = function(){return ControlKit.History._instance;};