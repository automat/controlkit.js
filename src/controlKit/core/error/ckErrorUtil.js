ControlKit.ErrorUtil =
{
    ReferenceError : function(object,key)       {return (object[key] === undefined);},
    TypeError      : function(object,value,type){return Object.prototype.toString.call(object[value]) === Object.prototype.toString.call(Function);}
};