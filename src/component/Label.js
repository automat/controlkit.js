import Component from './Component';

export const DefaultConfig = {};

export default class Label extends Component{
    constructor(parent,label){
        super(parent,{label});
    }

    /**
     * Returns the type name.
     * @return {string}
     */
    static get typeName(){
        return 'label';
    }
}