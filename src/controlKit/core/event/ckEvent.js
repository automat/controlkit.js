function CKEvent(sender,type,data)
{
    this.sender = sender;
    this.type   = type;
    this.data   = data;
}

CKEvent.prototype.clone = function()
{
    return new CKEvent(this.sender,this.type,this.data);
};