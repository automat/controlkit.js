import validateOption from 'validate-option';
import Component from './Component';

/*--------------------------------------------------------------------------------------------------------------------*/
// Defaults
/*--------------------------------------------------------------------------------------------------------------------*/

/**
 * Label default config
 * @type {object}
 * @property {string|null} id
 * @property {string|null} label
 */
export const DefaultConfig = {
    id : null,
    label : null
};

/*--------------------------------------------------------------------------------------------------------------------*/
// Label
/*--------------------------------------------------------------------------------------------------------------------*/

export default class Label extends Component{
    /**
     * @constructor
     * @param parent
     * @param {string} label
     * @param {object} [config]
     * @param {string|null} [config.label]
     * @param {string|null} [config.id]
     */
    constructor(parent,label,config){
        config = validateOption(config, DefaultConfig);

        super(parent,{
            id : config.id,
            label : label || config.label
        });
    }

    /**
     * Returns the type name.
     * @return {string}
     */
    static get typeName(){
        return 'label';
    }
}