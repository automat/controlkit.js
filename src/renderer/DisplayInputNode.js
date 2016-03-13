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

const TOKEN_SEPERATOR_REGEX = /([\s= ,.:/])+/;

const ASCII_MAP = {
    '188': '44',
    '109': '45',
    '190': '46',
    '191': '47',
    '192': '96',
    '220': '92',
    '222': '39',
    '221': '93',
    '219': '91',
    '173': '45',
    '187': '61',
    '186': '59',
    '189': '45'
};

const SHIFT_UP_MAP = {
    "96": "~",
    "49": "!",
    "50": "@",
    "51": "#",
    "52": "$",
    "53": "%",
    "54": "^",
    "55": "&",
    "56": "*",
    "57": "(",
    "48": ")",
    "45": "_",
    "61": "+",
    "91": "{",
    "93": "}",
    "92": "|",
    "59": ":",
    "39": "\"",
    "44": "<",
    "46": ">",
    "47": "?"
};

const EMPTY_FUNC = ()=>{};

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
        this._caretRange = [0,0];
        this._caretRangeDir = 0;
        this._caretInputPos = {x:0,y:0};

        this._onInput = EMPTY_FUNC;

        let self = this;
        this.addEventListener(NodeEvent.INPUT,function onInputFirst(e){self._onInput(e);});
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // USER FIRST RECEIVER
    /*----------------------------------------------------------------------------------------------------------------*/

    set onInput(func){
        super._setEventHandlerFirst('onInput',func);
    }

    get onInput(){
        return this._onInput;
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // GETTER
    /*----------------------------------------------------------------------------------------------------------------*/

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

    get caretRange(){
        return this._caretRange.slice(0);
    }

    hasCaretRange(){
        return this._caretRange[0] !== 0 || this._caretRange[1] !== 0;
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // FORMAT
    /*----------------------------------------------------------------------------------------------------------------*/

    _isNumeric(value){

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

    /*----------------------------------------------------------------------------------------------------------------*/
    // CARET + CARET RANGE
    /*----------------------------------------------------------------------------------------------------------------*/

    _advanceCaretPos(dir){
        this._caretPos = Math.max(
            -1,Math.min(this._caretPos + 1 * dir, this._textContent.length)
        );
    }

    _resetCaretRange(){
        this._caretRange[0] = 0;
        this._caretRange[1] = 0;
    }

    _validateCaretRangeDir(){
        //swap min/max if necessary
        let rangeMin = this._caretRange[0];
        let rangeMax = this._caretRange[1];
        this._caretRange[0] = Math.min(rangeMin,rangeMax);
        this._caretRange[1] = Math.max(rangeMin,rangeMax);

        //reset range direction if swapped
        if(this._caretRange[0] !== rangeMin){
            this._caretRangeDir = 0;
        }
    }

    _getCaretInputPos(e){
        this._caretInputPos.x = e.data.point.x;
        this._caretInputPos.y = e.data.point.y;
    }

    _getCaretPos(){
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
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // FIRST RECEIVER
    /*----------------------------------------------------------------------------------------------------------------*/

    __onFocus(e){
        this._getCaretInputPos(e);
        this._showCaret = true;
    }

    __onBlur(){
        this._caretPos = -1;
        this._resetCaretRange();
        this._showCaret = false;
    }

    __onDblClick(e){
        this._getCaretInputPos(e);
        this._getCaretPos();

        let tokens = this._textContent.split(TOKEN_SEPERATOR_REGEX);
        let index  = 0;

        let max   = this._caretPos + 1;
        let begin = 0;
        let end   = 0;

        while(end < max){
            let token = tokens[index++];
            begin = end;
            end  += token.length;
        }
        this._caretRange[0] = begin;
        this._caretRange[1] = end;
        this._caretRangeDir = 0;
    }

    __onMouseDown(e){
        this._getCaretInputPos(e);
        this._getCaretPos();
        this._resetCaretRange();
        this._showCaret = true;
    }

    __onMouseUp(e){}

    __onKeyDown(e){
        let keyCode = e.data.keyCode;

        //TODO: Fix keypress listener, see CanvasRenderer, otherwise this needs to be localized
        keyCode = ASCII_MAP[keyCode] !== undefined ? ASCII_MAP[keyCode] : keyCode;

        if(this._numeric && !this._isNumeric(keyCode)){
            return;
        }
        if(keyCode === KeyboardEvent.KEY_UP || keyCode === KeyboardEvent.KEY_DOWN){
            this._resetCaretRange();
            return;
        }
        let shiftKey = e.data.shiftKey;

        //caret move / caret range increase l
        if(keyCode === KeyboardEvent.KEY_LEFT){
            //advance range begin
            if(shiftKey){
                if(!this.hasCaretRange()){
                    this._caretRange[0] = this._caretRange[1] = this._caretPos;
                }
                //advance begin left
                if(this._caretRangeDir !== 1){
                    this._caretRange[0] = Math.max(0,this._caretRange[0]-1);
                    this._caretRangeDir = -1;
                //advance end left
                } else{
                    this._caretRange[1] = Math.max(0,this._caretRange[1]-1);
                }
            //reset range or advance caret
            } else {
                if(this.hasCaretRange()){
                    this._caretPos = this._caretRange[0];
                    this._resetCaretRange();
                } else {
                    this._advanceCaretPos(-1);
                }
            }
            this._validateCaretRangeDir();
            return;

        //caret move / caret range increase r
        } else if(keyCode === KeyboardEvent.KEY_RIGHT){
            if(shiftKey){
                if(!this.hasCaretRange()){
                    this._caretRange[0] = this._caretRange[1] = this._caretPos;
                }
                //advance end right
                if(this._caretRangeDir !== -1){
                    this._caretRange[1] = Math.min(this._caretRange[1]+1,this._textContent.length);
                    this._caretRangeDir = 1;
                //advance begin right
                } else {
                    this._caretRange[0] = Math.min(this._caretRange[0]+1,this._textContent.length);
                }
            //reset range or advance caret
            } else {
                if(this.hasCaretRange()){
                    this._caretPos = this._caretRange[1];
                    this._resetCaretRange();
                } else {
                    this._advanceCaretPos(1);
                }
            }
            this._validateCaretRangeDir();
            return;
        }

        let caretPos = Math.max(0,this._caretPos);
        let front    = this._textContent.slice(0,caretPos);
        let back     = this._textContent.slice(caretPos);

        //delete char at caret pos
        if(keyCode === KeyboardEvent.KEY_BACKSPACE ||
           keyCode === KeyboardEvent.KEY_DELETE){
            //range selected, remove chars in range
            if(this.hasCaretRange()){
                this._textContent = this._textContent.slice(0,this._caretRange[0]) +
                                    this._textContent.slice(this._caretRange[1]);
                this._caretPos = this._caretRange[0];
                this._resetCaretRange();
            //remove from caret pos
            } else {
                front = front.slice(0,front.length-1);
                this._textContent = [front,back].join('');
                this._advanceCaretPos(-1);
            }

        //add char at caret pos
        } else {
            this._resetCaretRange();

            let char;
            if(shiftKey){
                char = SHIFT_UP_MAP[keyCode];
                char = char === undefined ? String.fromCharCode(keyCode) : char;
            } else {
                char = String.fromCharCode(keyCode).toLowerCase();
            }

            //only modifier pressed
            if(char === ''){
                return;
            }

            this._textContent = [front,char,back].join('');
            this._advanceCaretPos(1);
        }

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