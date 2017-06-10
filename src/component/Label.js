import validateOption from 'validate-option';
import Component from './Component';

export const DefaultConfig = {
    id : null,
    label : null
};

export default class Label extends Component{
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