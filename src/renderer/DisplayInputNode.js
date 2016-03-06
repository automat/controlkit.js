import validateOptions from "../validate-options";
import DisplayNode from "./DisplayNode";
import NodeType from "./NodeType";
import KeyboardEvent from "../input/KeyboardEvent";
import MouseEvent from "../input/MouseEvent";
import NodeEvent from "./NodeEvent";

const DefaultOptions = {
    numeric : false,
    digits : null,
    placeHolder : ''
};

class DisplayInputNode extends DisplayNode{
    constructor(options){
        options = validateOptions(options,DefaultOptions);
        super(NodeType.INPUT_TEXT);

        this._textContentPrev = null;

        this._numeric = options.numeric;
        this._digits = options.digits;
        this._placeHolder = options.placeHolder;

        this._showCaret = false;

        this.addEventListener(NodeEvent.FOCUS, this._onFocus.bind(this));
        this.addEventListener(NodeEvent.BLUR, this._onBlur.bind(this));
        this.addEventListener(KeyboardEvent.KEY_DOWN, this._onKeyDown.bind(this));
        this.addEventListener(KeyboardEvent.KEY_PRESS, this._onKeyPress.bind(this));
        this.addEventListener(KeyboardEvent.KEY_UP, this._onKeyUp.bind(this));
    }

    _format(){
        if(!this._numeric || this._digits === null){
            return;
        }
        this._textContent = this._textContent.toFixed(this._digits);
    }

    _reflect(){
        if(this._textContentPrev === this._textContent){
            this.dispatchEvent(new NodeEvent(NodeEvent.INPUT), {string : this._textContent});
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

    _onFocus(){
        this._showCaret = true;
    }

    _onBlur(){
        this._showCaret = false;
    }

    _onKeyDown(e){
        if(this._numeric && !this._isNumeric(e.keyCode)){
            return;
        }
        console.log(e.keyCode);

        this._format();
        this._reflect();
    }

    _onKeyPress(e){
        if(this._numeric && !this._isNumeric(e.keyCode)){
            return;
        }

        this._format();
        this._reflect();
    }

    _onKeyUp(e){
        if(this._numeric && !this._isNumeric(e.keyCode)){
            return;
        }

        this._format();
        this._reflect();
    }
}

DisplayInputNode.DefaultOptions = DefaultOptions;

export default DisplayInputNode;