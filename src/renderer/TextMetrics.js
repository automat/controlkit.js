export default TextMetrics = {
    _measureText : null,
    _nearestCaretPos : null,
    _measureTextAtCaretPos : null,
    measureText(str,options){
        return this._measureText(str,options);
    },
    nearestCaretPos(x,str,options){
        return this._nearestCaretPos(x,str,options);
    },
    measureTextAtCaretPos(pos,str){
        return this._measureTextAtCaretPos(pos,str);
    }
};