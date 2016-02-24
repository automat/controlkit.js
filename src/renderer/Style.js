const STR_INVALID_ARRAY_LENGTH = 'Invalid array length';

function validateNumber(number){
    if(typeof number === 'number'){
        return;
    }
    const STR_INVALID_FORMAT = 'Invalid number format';
    if(typeof number !== 'string'){
        throw new Error(STR_INVALID_FORMAT);
    }
    number = number.split(new RegExp('px|%', 'g'));
    if(number.length > 2){
        throw new Error(STR_INVALID_FORMAT);
    }
    if(isNaN(+number[0])){
        throw new Error('Invalid number');
    }
}

const Default = {
    WIDTH : 0,
    HEIGHT : 0,
    MINWIDTH : 0,
    MINHEIGHT : 0,
    MAXWIDTH : 0,
    MAXHEIGHT : 0,
    BORDERWIDTH: [0,0,0,0],
    FLEXDIRECTION : 'column',
    JUSTIFYCONTENT : 'flex-start',
    FLEX : 1,
    FLEXWRAP : 'wrap',
    POSITION : 'relative',
    //
    TOP : null,
    RIGHT : null,
    BOTTOM : null,
    LEFT : null,
    MARGIN : [0,0,0,0],
    PADDING : [0,0,0,0],
    OVERFLOW : 'visible',
    VISIBILITY : '',
    ZINDEX : 0
};

export default class Style{
    constructor(){
        this._width = Default.WIDTH;
        this._height = Default.HEIGHT;
        this._minWidth = Default.MINWIDTH;
        this._minHeight = Default.MINHEIGHT;
        this._maxWidth = Default.MAXWIDTH;
        this._maxHeight = Default.MAXHEIGHT;
        this._borderWidth = Default.BORDERWIDTH;
        this._flexDirection = Default.FLEXDIRECTION;
        this._justifyContent = Default.JUSTIFYCONTENT;
        this._flex = Default.FLEX;
        this._flexWrap = Default.FLEXWRAP;
        this._position = Default.POSITION;

        /* box properties */
        this._top = Default.TOP;
        this._right = Default.RIGHT;
        this._bottom = Default.BOTTOM;
        this._left = Default.LEFT;
        this._margin = Default.MARGIN;
        this._padding = Default.PADDING;
        this._overflow = Default.OVERFLOW;
        this._visibility = Default.VISIBILITY;
        this._zIndex = Default.ZINDEX;

        this._propertiesSet = {};
        this.isProcessed = false;
    }

    copy(){
        var style = new Style();
        style.merge(this);
        return style;
    }

    merge(style){
        for(var key in style){
            if(key === '_propertiesSet' || key === 'isProcessed'){
                continue;
            }
            var value = style[key];
            if(Array.isArray(value)){
                value = value.slice(0);
            }
            this['_' + key] = value;
        }
        this.isProcessed = false;
    }

    removePropertySet(key){
        if(this._propertiesSet[key] === undefined){
            throw new Error(`Property "${key}" not set.`);
        }
        this['_' + key] = Default[key.toUpperCase()];
        delete this._propertiesSet[key];
    }

    get propertiesSet(){
        var out = {};
        for(let key in this._propertiesSet){
            let property = this['_' + key];
            if(Array.isArray(property)){
                property = property.slice(0);
            }
            out[key] = property;
        }
        return out;
    }

    _setPropertyNumber(key,value){
        if(value === null){
            this.removePropertySet(key);
        } else {
            validateNumber(value);
            this['_'+key] = value;
            this._propertiesSet[key] = true;
        }
        this.isProcessed = false;
    }

    _setPropertyNumber4(key,value){
        if(value === null){
            this.removePropertySet(key);
        } else {
            for(var number of value){
                validateNumber(number);
            }
            let property = this['_' + key];
            switch (value.length){
                case 1:
                    property[0] = property[1] = property[2] = property[3] = value[0];
                    break;
                case 2:
                    property[0] = property[2] = value[0];
                    property[1] = property[3] = value[1];
                    break;
                case 3:
                    property[0] = value[0];
                    property[1] = property[3] = value[1];
                    property[2] = value[2];
                    break;
                case 4:
                    property[0] = value[0];
                    property[1] = value[1];
                    property[2] = value[2];
                    property[3] = value[3];
                    break;
                default:
                    throw new Error(STR_INVALID_ARRAY_LENGTH);
            }
            this._propertiesSet[key] = true;
        }
        this.isProcessed = false;
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // BOX PROPERTIES
    /*----------------------------------------------------------------------------------------------------------------*/

    set top(top){
        this._setPropertyNumber('top',top);
    }

    get top(){
        return this._top;
    }

    set right(right){
        this._setPropertyNumber('right',right);
    }

    get right(){
        return this._right;
    }

    set bottom(bottom){
        this._setPropertyNumber('bottom',bottom);
    }

    get bottom(){
        return this._bottom;
    }

    set left(left){
        this._setPropertyNumber('left',left);
    }

    get left(){
        return this._left;
    }

    set margin(margin){
        this._setPropertyNumber4('margin',margin);
    }

    get margin(){
        return this._margin.slice(0);
    }

    set marginTop(top){
        this._setPropertyNumber('marginTop',top);
    }

    get marginTop(){
        return this._margin[0];
    }

    set marginRight(right){
        this._setPropertyNumber('right',right);
    }

    get marginRight(){
        return this._margin[1];
    }

    set marginBottom(bottom){
        this._setPropertyNumber('marginBottom',bottom);
    }

    get marginBottom(){
        return this._margin[2];
    }

    set marginLeft(left){
        this._setPropertyNumber('marginLeft',left);
    }

    get marginLeft(){
        return this._margin[3];
    }

    set padding(padding){
        this._setPropertyNumber4('padding',padding);
    }

    get padding(){
        return this._padding.slice(0);
    }

    set paddingTop(top){
        this._setPropertyNumber('paddingRight',top);
    }

    get paddingTop(){
        return this._padding[0];
    }

    set paddingRight(right){
        this._setPropertyNumber('paddingRight',right);
    }

    get paddingRight(){
        return this._padding[1];
    }

    set paddingBottom(bottom){
        this._setPropertyNumber('paddingBottom',bottom);
    }

    get paddingBottom(){
        return this._padding[2];
    }

    set paddingLeft(left){
        this._setPropertyNumber('paddingLeft',left);
    }

    get paddingLeft(){
        return this._padding[3];
    }

    set overflow(overflow){
        switch (overflow){
            case 'initial':
            case 'visible':
                this._overflow = 'visible';
                break;
            case 'scroll' :
            case 'hidden' :
            case 'inherit':
                this._overflow = overflow;
                break;
            default:
                throw new Error('Overflow type "' + overflow + '" not supported.');
        }
        this.isProcessed = false;
        this._propertiesSet['overflow'] = true;
    }

    get overflow(){
        return this._overflow;
    }

    set visibility(visibility){
        switch (visibility){
            case 'initial':
            case 'visible':
                this._overflow = 'visible';
                break;
            case 'hidden' :
            case 'inherit':
                this._overflow = visibility;
                break;
            default:
                throw new Error('Visibility type "' + visibility + '" not supported.');
        }
        this.isProcessed = false;
        this._propertiesSet['top'] = true;
    }

    get visibility(){
        return this._visibility;
    }

    set zIndex(index){
        this._zIndex = index;
        this.isProcessed = false;
        this._propertiesSet['zIndex'] = true;
    }

    get zIndex(){
        return this._zIndex;
    }

}