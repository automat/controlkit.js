ControlKit.CKEvent = function(sender,type,data)
{
    this.sender = sender;
    this.type   = type;
    this.data   = data;
}

ControlKit.CKEvent.prototype.clone = function()
{
    return new ControlKit.CKEvent(this.sender,this.type,this.data);
};