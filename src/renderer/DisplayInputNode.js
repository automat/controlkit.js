import validateOption from "validate-option";
import DisplayNode from "./DisplayNode";
import NodeType from "./NodeType";
import KeyboardEvent from "../input/KeyboardEvent";
import MouseEvent from "../input/MouseEvent";
import NodeEvent from "./NodeEvent";
import TextMetrics from './TextMetrics';

const DefaultOptions = {
    numeric : false,
    digits : null,
    placeHolder : ''
};

class DisplayInputNode extends DisplayNode{
    constructor(options){
        options = validateOption(options,DefaultOptions);
        super(NodeType.INPUT_TEXT);

        this._textContentPrev = null;

        this._numeric = options.numeric;
        this._digits = options.digits;
        this._placeHolder = options.placeHolder;

        this._showCaret = false;
        this._caretPos = -1;
        this._caretInputPos = {x:0,y:0};
  }

    _format(){
        if(!this._numeric || this._digits === null){
            return;
        }
        this._textContent = this._textContent.toFixed(this._digits);
    }

    _reflect(){
        if(this._textContentPrev === this._textContent){
            this.dispatchEvent(new NodeEvent(NodeEvent.INPUT), {textContent : this._textContent});
        }
        this._textContentPrev = this._textContent;
    }

    _isNumeric(value){

    }

    get placeHolder(){
        return this._placeHolder;
    }

    get showCaret(){
        return this._showCaret;
    }

    set caretPos(index){
        this._caretPos = index;
    }

    get caretPos(){
        return this._caretPos;
    }

    get caretInputPos(){
        return {x:this._caretInputPos.x,y:this._caretInputPos.y};
    }

    _getCaretInputPos(e){
        this._caretInputPos.x = e.data.point.x;
        this._caretInputPos.y = e.data.point.y;
    }

    __onFocus(e){
        this._getCaretInputPos(e);
        this._showCaret = true;
    }

    __onBlur(){
        this._caretPos = -1;
        this._showCaret = false;
    }

    __onMouseDown(e){
        this._getCaretInputPos(e);
        let layoutNode = this.layoutNode;
        let layout = layoutNode.layout;
        let style  = layoutNode.style;

        this._caretPos = TextMetrics.nearestCaretPos(
            this._caretInputPos.x + (layout.paddingLeft || 0),
            this._textContent, {
                fontFamily : style.fontFamily,
                fontSize   : style.fontSize,
                lineHeight : style.lineHeight
            }
        );
        this._showCaret = true;
    }

    __onMouseUp(e){}

    __onKeyDown(e){
        if(this._numeric && !this._isNumeric(e.keyCode)){
            return;
        }
        console.log(TextMetrics.measureText('abc'));

        this._format();
        this._reflect();
    }

    __onKeyPress(e){
        //if(this._numeric && !this._isNumeric(e.keyCode)){
        //    return;
        //}
        //
        //this._format();
        //this._reflect();
    }

    __onKeyUp(e){
        if(this._numeric && !this._isNumeric(e.keyCode)){
            return;
        }

        this._format();
        this._reflect();
    }
}

DisplayInputNode.DefaultOptions = DefaultOptions;

export default DisplayInputNode;