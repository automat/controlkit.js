import validateOption from 'validate-option';
import Component from './Component';

/*--------------------------------------------------------------------------------------------------------------------*/
// Template / Defaults
/*--------------------------------------------------------------------------------------------------------------------*/

const template =
    `<div class="input-background">
        <img>
    </div>`;

/**
 * Image component default config.
 * @type {Object}
 * @property {string} label - The component label
 */
export const DefaultConfig = Object.freeze({
    id: null,
    label : 'image'
});

/*--------------------------------------------------------------------------------------------------------------------*/
// Canvas
/*--------------------------------------------------------------------------------------------------------------------*/

export default class Image_ extends Component{
    /**
     * @constructor
     * @param parent
     * @param image
     * @param config
     */
    constructor(parent,image,config){
        config = validateOption(config,DefaultConfig);

        super(parent,{
            id: config.id,
            label:config.label,
            template
        });

        this._state.size = [0,0];

        // elements
        this._elementImage = this._element.querySelector('img');

        // image resjze on container resize
        const onScrollSizeChange = ()=>{
            const width = this._elementImage.offsetWidth;
            const height = this._elementImage.offsetHeight;
            const size = this._state.size;

            if((width == 0 && width == height && size[0] == width && size[0] == size[1]) ||
               (width == size[0] && height == size[1])){
                return;
            }

            size[0] = width;
            size[1] = height;
            this.emit('size-change');
        };

        this._removeEventListeners = ()=>{
            parent.removeListener('scroll-size-change',onScrollSizeChange);
        };

        parent.on('scroll-size-change',onScrollSizeChange);

        //init
        this.image = image;
    }

    _removeEventListeners(){};

    /**
     * Returns the type name.
     * @return {string}
     */
    static get typeName(){
        return 'image';
    }

    /**
     * Sets the image to be displayed. Image must be loaded.
     * @param {HTMLImageElement} image
     */
    set image(image){
        this._elementImage.src = image.src;
        this._state.size[0] = this._elementImage.offsetWidth;
        this._state.size[1] = this._elementImage.offsetHeight;
        this.emit('size-change');
    }

    /**
     * Returns the image displayed.
     * @return {HTMLImageElement}
     */
    get image(){
        return this._elementImage;
    }

    destroy(){
        this._removeEventListeners();
        super.destroy();
    }
}