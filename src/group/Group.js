import AbstractGroup from './AbstractGroup';
import validateOption from 'validate-option';
import createHtml from '../util/create-html';

import SubGroup from './SubGroup';
import ScrollContainer from './ScrollContainer';

/*--------------------------------------------------------------------------------------------------------------------*/
// Template / Defaults
/*--------------------------------------------------------------------------------------------------------------------*/

const template =
    `<li class="group">
        <div class="group-head">
            <label></label>
        </div>
        <ul class="sub-group-list"></ul>
    </li>`;

export const DefaultConfig = Object.freeze({
    label  : null,
    labelRatio : null,
    enable : true,
    height : null
});

/*--------------------------------------------------------------------------------------------------------------------*/
// Group
/*--------------------------------------------------------------------------------------------------------------------*/

export default class Group extends AbstractGroup{
    constructor(parent,config){
        config = validateOption(config,DefaultConfig);
        super(parent,{
            label  : config.label,
            labelRatio : config.labelRatio,
            enable : config.enable,
            height : config.height
        });

        this._state.labelRatio = config.labelRatio;

        this._element = createHtml(template);
        this._elementHead  = this._element.querySelector('.group-head');
        this._elementLabel = this._element.querySelector('label');
        this._elementList  = this._element.querySelector('.sub-group-list');

        this._scrollContainer = new ScrollContainer(this._elementList);
        this._groups = [];

        this._elementHead.addEventListener('mousedown',()=>{
            this.enable = !this.enable;
        });

        this.label = this._state.label;
        this.enable = this._state.enable;
        this.componentLabelRatio = this._state.labelRatio;
    }

    _updateHeight(){
        if(this._state.maxHeight == null){
            return;
        }
        const height = Math.min(this._elementList.offsetHeight,this._state.maxHeight);
        this._scrollContainer.setHeight(height);
    }

    /**
     * Sets the groups global label / component width ratio.
     * @param value
     */
    set componentLabelRatio(value){
        super.componentLabelRatio = value;
        for(const group of this._groups){
            group.componentLabelRatio = value;
        }
    }

    /**
     * Returns ths last active sub-group.
     * @return {SubGroup}
     * @private
     */
    _backSubGroupValid(){
        if(this._groups.length == 0){
            this.addSubGroup();
        }
        return this._groups[this._groups.length - 1];
    }

    /**
     * Adds a subgroup.
     * @param config
     * @returns {Group}
     */
    addSubGroup(config){
        const group = new SubGroup(this,config);
        group.componentLabelRatio = this._state.labelRatio;
        this._groups.push(group);
        //update height if group changed
        group.on('size-change',()=>{
            this._updateHeight();
            this.emit('size-change');
        });
        //update height to new group element
        this._updateHeight();
        return this;
    }

    /**
     * Adds a button component to the last subgroup.
     * @param name
     * @param config
     * @returns {Group}
     */
    addButton(name,config){
        this._backSubGroupValid().addButton(name,config);
        return this;
    }

    /**
     * Adds a number component to the last subgroup.
     * @param object
     * @param key
     * @param config
     * @returns {Group}
     */
    addNumber(object,key,config){
        this._backSubGroupValid().addNumber(object,key,config);
        return this;
    }

    /**
     * Adds a string component to the last subgroup.
     * @param object
     * @param key
     * @param config
     * @returns {Group}
     */
    addString(object,key,config){
        this._backSubGroupValid().addString(object,key,config);
        return this;
    }

    /**
     * Adds a checkbox component to the last subgroup.
     * @param object
     * @param key
     * @param config
     * @returns {Group}
     */
    addCheckbox(object,key,config){
        this._backSubGroupValid().addCheckbox(object,key,config);
        return this;
    }

    /**
     * Adds a select component to the last subgroup.
     * @param object
     * @param key
     * @param config
     * @returns {Group}
     */
    addSelect(object,key,config){
        this._backSubGroupValid().addSelect(object,key,config);
        return this;
    }

    /**
     * Adds a text component to the last subgroup.
     * @param title
     * @param text
     * @returns {Group}
     */
    addText(title,text){
        this._backSubGroupValid().addText(title,text);
        return this;
    }

    /**
     * Adds a label component to the last subgroup.
     * @param label
     * @returns {Group}
     */
    addLabel(label){
        this._backSubGroupValid().addLabel(label);
        return this;
    }

    /**
     * Adds a slider component to the last subgroup.
     * @param object
     * @param key
     * @param config
     * @returns {Group}
     */
    addSlider(object,key,config){
        this._backSubGroupValid().addSlider(object,key,config);
        return this;
    }

    _addSubGroupFromDescription(description){
        //add components to active subgroup
        if(description.items){
            this._backSubGroupValid().add(description.items);
        }
        //add subgroup with optional components
        if(description.groups){
            for(const group of description){


                if(group.items){
                    this._addSubGroupFromDescription(group.items);
                }
            }
        }
    }

    /**
     * Adds subgroups and components from description.
     * @param description_or_descriptions
     * @returns {Group}
     * @example
     * //creates a subgroup
     * group.add({label:'SubGroup'});
     *
     * //creates a subgroup with multiple components
     * group.add({
     *     label: 'Subgroup'
     *     items: [
     *         {type:'number',object:obj,key:'propertyNumber'},
     *         {type:'string',object:obj,key:'propertyString'}
     *     ]
     * });
     *
     * //creates multiple subgroups
     * group.add([
     *     {label:'SubGroup A',items:[
     *         {type:'number',object:obj,key:'propertyNumber'}
     *     ]},
     *     {label:'SubGroup B',items:[
     *         {type:'string',object:obj,key:'propertyString'},
     *         {type:'slider',object:obj,key:'propertyNumberSlider'},
     *         {type:'boolean',object:obj,key:'propertyBoolean'}
     *     ]}
     * ]);
     *
     */
    add(description_or_descriptions){
        this._addSubGroupFromDescription(description_or_descriptions);
        return this;
    }

    sync(){
        for(const group of this._groups){
            group.sync();
        }
    }

    clear(){
        for(const group in this._groups){
            group.clear();
        }
        this._groups = [];
        super.clear();
    }

}