var Base = {
    _base : null,
    set : function(base) {
        this._base = base;
    },
    createNode : function(type){
        return this._base.createNode(type);
    }
};

export default Base;