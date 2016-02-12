function Event(type, data){
    this._sender = null;
    this._type   = type;
    this._data   = data;

    for(var prop in data) {
        this[prop] = data[prop];
    }

    this._stopPropagation = false;
}

Event.prototype.copy = function(){
    var evt = new Event(this._type, this._data);
    evt.setSender(this._sender);
    return evt;
};

Event.prototype.stopPropagation = function(){
    this._stopPropagation = true;
};

Event.prototype.getSender = function(){
    return this._sender;
};

Event.prototype.setSender = function(sender) {
    this._sender = sender;
};

Event.prototype.getType = function(){
    return this._type;
};

module.exports = Event;
