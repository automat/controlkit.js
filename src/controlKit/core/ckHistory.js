ControlKit.History = function()
{
    ControlKit.EventDispatcher.apply(this,arguments);

    this._states = [];
};

ControlKit.History.prototype = Object.create(ControlKit.EventDispatcher.prototype);

/*---------------------------------------------------------------------------------*/

ControlKit.History.prototype.pushState = function(object,key,value){};
ControlKit.History.prototype.popState  = function(){};


ControlKit.History.prototype.getNumStates = function(){return this._states.length;};

/*---------------------------------------------------------------------------------*/

ControlKit.History._instance   = null;
ControlKit.History.init        = function(){ControlKit.History._instance = new ControlKit.History();};
ControlKit.History.getInstance = function(){return ControlKit.History._instance;};