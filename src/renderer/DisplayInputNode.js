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
    placeHolder : '',
    readonly : false
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

        this.readonly = options.readonly;

        this._textContentPrev = null;
        this._textContentChanged = false;

        this._numeric = options.numeric;
        this._digits = options.digits;
        this._placeHolder = options.placeHolder;

        this._showCaret = false;
        this._caretPos = -1;
        this._selectionRange = [0,0];
        this._caretRangeDir = 0;
        this._caretInputPos = {x:0,y:0};

        this._onInput = EMPTY_FUNC;
        this._onChange = EMPTY_FUNC;

        let self = this;
        this.addEventListener(NodeEvent.INPUT,  function onInputFirst(e){self._onInput(e);});
        this.addEventListener(NodeEvent.CHANGE, function onChangeFirst(e){self._onChange(e);})
    }

    set textContent(text){
        super.textContent = text;
        this._reflect();
    }
    //necessary when overriding super.setter
    get textContent(){
        return super.textContent;
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

    set onChange(func){
        super._setEventHandlerFirst('onChange',func);
    }

    get onChange(){
        return this._onChange;
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

    setSelectionRange(min,max){
        let min_ = Math.max(0,Math.min(Math.min(min,max),this._textContent.length));
        let max_ = Math.min(this._textContent.length,Math.max(min,max));
        this._selectionRange[0] = min_;
        this._selectionRange[1] = max_;
    }

    get selectionRange(){
        return this._selectionRange.slice(0);
    }

    isRangeSelected(){
        return this._selectionRange[0] !== this._selectionRange[1];
    }

    clearSelectionRange(){
        this._selectionRange[0] = 0;
        this._selectionRange[1] = 0;
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
            this._textContentChanged = true;
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

    _validateSelectionDir(){
        //swap min/max if necessary
        let rangeMin = this._selectionRange[0];
        let rangeMax = this._selectionRange[1];
        this._selectionRange[0] = Math.min(rangeMin,rangeMax);
        this._selectionRange[1] = Math.max(rangeMin,rangeMax);
        //reset range direction if swapped
        if(this._selectionRange[0] !== rangeMin){
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

    _insertBetweenSelectionRange(str){
        this._textContent = this._textContent.slice(0,this._selectionRange[0]) + str +
                            this._textContent.slice(this._selectionRange[1]);
        this._caretPos = this._selectionRange[0];
        this.clearSelectionRange();
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // FIRST RECEIVER
    /*----------------------------------------------------------------------------------------------------------------*/

    __onFocus(e){
        this._textContentChanged = false;
        this._getCaretInputPos(e);
        this._showCaret = true;
    }

    __onBlur(){
        this._caretPos = -1;
        this.clearSelectionRange();
        this._showCaret = false;

        if(this._textContentChanged){
            this.dispatchEvent(new NodeEvent(NodeEvent.CHANGE,{textContent:this._textContent}));
        }
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
            begin = end;
            end  += tokens[index++].length;
        }
        this._selectionRange[0] = begin;
        this._selectionRange[1] = end;
        this._caretRangeDir = 0;
    }

    __onMouseDown(e){
        this._getCaretInputPos(e);
        this._getCaretPos();
        this.clearSelectionRange();
        this._showCaret = true;
    }

    __onKeyDown(e){
        let keyCode = e.data.keyCode;

        //TODO: Fix keypress listener, see CanvasRenderer, otherwise this needs to be localized
        keyCode = ASCII_MAP[keyCode] !== undefined ? ASCII_MAP[keyCode] : keyCode;

        if(this._numeric && !this._isNumeric(keyCode)){
            return;
        }
        if(keyCode === KeyboardEvent.KEY_UP || keyCode === KeyboardEvent.KEY_DOWN){
            this.clearSelectionRange();
            return;
        }
        let shiftKey = e.data.shiftKey;

        //caret move / selection range increase l
        if(keyCode === KeyboardEvent.KEY_LEFT){
            //advance range begin
            if(shiftKey){
                //nothing selected set range to caret pos
                if(!this.isRangeSelected()){
                    this._selectionRange[0] = this._selectionRange[1] = this._caretPos;
                }
                //advance range begin left
                if(this._caretRangeDir !== 1){
                    this._selectionRange[0] = Math.max(0,this._selectionRange[0]-1);
                    this._caretRangeDir = -1;
                //advance range end left
                } else{
                    this._selectionRange[1] = Math.max(0,this._selectionRange[1]-1);
                }
            //reset range or advance caret
            } else {
                if(this.isRangeSelected()){
                    this._caretPos = this._selectionRange[0];
                    this.clearSelectionRange();
                } else {
                    this._advanceCaretPos(-1);
                }
            }
            this._validateSelectionDir();
            return;

        //caret move / selection range increase r
        } else if(keyCode === KeyboardEvent.KEY_RIGHT){
            if(shiftKey){
                if(!this.isRangeSelected()){
                    this._selectionRange[0] = this._selectionRange[1] = this._caretPos;
                }
                //advance end right
                if(this._caretRangeDir !== -1){
                    this._selectionRange[1] = Math.min(this._selectionRange[1]+1,this._textContent.length);
                    this._caretRangeDir = 1;
                //advance begin right
                } else {
                    this._selectionRange[0] = Math.min(this._selectionRange[0]+1,this._textContent.length);
                }

            //reset range or advance caret
            } else {
                if(this.isRangeSelected()){
                    this._caretPos = this._selectionRange[1];
                    this.clearSelectionRange();
                } else {
                    this._advanceCaretPos(1);
                }
            }
            this._validateSelectionDir();
            return;
        }

        let caretPos = Math.max(0,this._caretPos);
        let front    = this._textContent.slice(0,caretPos);
        let back     = this._textContent.slice(caretPos);

        //delete char at caret pos
        if(!this.readonly &&
           (keyCode === KeyboardEvent.KEY_BACKSPACE ||
            keyCode === KeyboardEvent.KEY_DELETE)){
            //range selected, remove chars in range
            if(this.isRangeSelected()){
                this._insertBetweenSelectionRange('');
            //remove from caret pos
            } else {
                front = front.slice(0,front.length-1);
                this._textContent = [front,back].join('');
                this._advanceCaretPos(-1);
            }
        //add char at caret pos
        } else {
            //ctrl or cmd pressed
            if(e.data.metaKey){
                // select all
                if(String.fromCharCode(keyCode) === 'A'){
                    this.setSelectionRange(0,this._textContent.length);
                }
                return;
            }

            if(this.readonly){
                return;
            }

            //just alt or shift pressed
            if((shiftKey      && keyCode === KeyboardEvent.KEY_SHIFT) ||
               (e.data.altKey && keyCode === KeyboardEvent.KEY_ALT  )){
                return;
            }

            //let char = shiftKey && SHIFT_UP_MAP[keyCode] ? SHIFT_UP_MAP[keyCode]
            let char;
            if(shiftKey){
                char = SHIFT_UP_MAP[keyCode];
                char = char === undefined ? String.fromCharCode(keyCode) : char;
            } else {
                char = String.fromCharCode(keyCode).toLowerCase();
            }
            if(char === ''){
                return;
            }
            //replace text in range with char
            if(this.isRangeSelected()){
                this._insertBetweenSelectionRange(char);
            //add char add caret pos
            } else {
                this._textContent = [front,char,back].join('');
            }
            this._advanceCaretPos(1);
        }

        this._format();
        this._reflect();
    }
}

DisplayInputNode.DefaultOptions = DefaultOptions;

export default DisplayInputNode;