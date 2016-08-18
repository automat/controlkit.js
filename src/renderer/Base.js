var Base = {
    _base : null,
    set : function(base) {
        this._base = base;
    },
    createNode : function(type){
        return this._base.createNode(type);
    },
    createNodes : function(types){
        return this._base.createNodes(types);
    },
    createNodeFromDetail : function(detail){
        return this._base.createNodeFromDetail(detail);
    },
    createNodesFromDetail : function(details){
        return this._base.createNodesFromDetail(details);
    },
    get style(){
        return this._base.style;
    },
    set style(value){
        this._base.style = value;
    }
};

export default Base;