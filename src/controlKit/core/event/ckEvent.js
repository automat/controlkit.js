ControlKit.Event = function(sender,type,data)
{
    this.sender = sender;
    this.type   = type;
    this.data   = data;
};

ControlKit.Event.prototype.clone = function()
{
    return new ControlKit.Event(this.sender,this.type,this.data);
};