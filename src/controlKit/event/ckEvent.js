function CKEvent(target,type,data)
{
    this.target = target;
    this.type   = type;
    this.data   = data;
}

CKEvent.prototype.clone = function()
{
    return new CKEvent(this.target,this.type,this.data);
};