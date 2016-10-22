import validateOption from 'validate-option';
import Component from './Component';
import createHtml from '../util/create-html';

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
            label:config.label
        });

        //elements
        this._elementWrap.appendChild(createHtml(template));
        this._elementImage = this._elementWrap.querySelector('img');

        //init
        this.image = image;
    }

    /**
     * Sets the image to be displayed. Image must be loaded.
     * @param {HTMLImageElement} image
     */
    set image(image){
        this._elementImage.src = image.src;
        this.emit('size-change');
    }

    /**
     * Returns the image displayed.
     * @return {HTMLImageElement}
     */
    get image(){
        return this._elementImage;
    }
}