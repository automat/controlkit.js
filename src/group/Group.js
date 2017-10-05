import AbstractGroup from './abstract-group';
import validateOption from 'validate-option';
import validateType from '../util/validate-type';
import createHtml from '../util/create-html';
import createObjectPartial from '../util/create-object-partial';

import SubGroup, {DefaultConfig as SubGroupDefaultConfig} from './sub-group';

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
    id : null,
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
            id : config.id,
            label  : config.label,
            labelRatio : config.labelRatio,
            enable : config.enable,
            height : config.height
        });

        // state
        this._groups = [];

        // node
        this._element = createHtml(template);
        this._elementHead  = this._element.querySelector('.group-head');
        this._elementLabel = this._element.querySelector('label');
        this._elementList  = this._element.querySelector('.sub-group-list');
        this._scrollContainer.target = this._elementList;

        // listener
        this._elementHead.addEventListener('mousedown',()=>{
            this.enable = !this.enable;
        });

        // state initial
        this.label = this._label;
        this.enable = this._enable;
        this.componentLabelRatio = this._labelRatio;
    }

    /**
     * Completely clears the component and removes it from its parent element.
     */
    destroy(){
        for(const group in this._groups){
            group.destroy();
        }
        this._groups = [];
        this._scrollContainer.destroy();
        super.destroy();
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // Sync
    /*----------------------------------------------------------------------------------------------------------------*/

    sync(){
        for(const group of this._groups){
            group.sync();
        }
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // Query Elements
    /*----------------------------------------------------------------------------------------------------------------*/

    /**
     * Returns the underlying controlkit instance.
     */
    get root(){
        return this._parent.root;
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // Appearance Modifier
    /*----------------------------------------------------------------------------------------------------------------*/

    /**
     * Forces height update from content.
     */
    updateHeight(){
        if(this._maxHeight === null){
            return;
        }
        const height = Math.min(this._elementList.offsetHeight,this._maxHeight);
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

    /*----------------------------------------------------------------------------------------------------------------*/
    // Sub-Groups & Components Modifier
    /*----------------------------------------------------------------------------------------------------------------*/

    /**
     * Returns ths last active sub-group.
     * @return {SubGroup}
     * @private
     */
    _backSubGroupValid(){
        if(this._groups.length === 0){
            this.add({});
        }
        return this._groups[this._groups.length - 1];
    }

    /**
     * Adds a sub-group or sub-group components.
     * @param config
     * @return {Group}
     *
     * @example
     * // creates empty sub-group
     * group.add({label:'sub-group'});
     *
     * @example
     * // creates sub-group with single number component
     * group.add({
     *  comps : [
     *      {type: 'number', object, key}
     * });
     *
     * @example
     * // adds component to last sub-group, creates new if non added already
     * group.add({type:'number',object,key});
     */
    add(config){
        // create single component
        if(config.type){
            this._backSubGroupValid().add(config);
            return this;
        }

        // extract groups & components
        const subGroups = config.groups;
        const comps = config.comps;
        config = createObjectPartial(config,['groups','compss']);

        // create multiple sub-groups
        if(subGroups){
            for(const group of config.groups){
                this.add(group);
            }
            return this;
        }

        // create single sub-group
        const subGroup = new SubGroup(this,config);
        subGroup.componentLabelRatio = this._labelRatio;
        this._groups.push(subGroup);

        // listener on sub-group height change
        subGroup.on('size-change',()=>{
            this.updateHeight();
            this.emit('size-change');
        });

        // update height to initial new sub-group height
        this.updateHeight();

        // create sub-group components
        if(comps){
            for(const comp of comps){
                this.add(comp);
            }
        }

        // return group root
        return this;
    }

    /**
     * Removes specific sub-group or component from group.
     * @param object
     * @return {Group}
     */
    remove(object){
        // remove sub-group
        if(object instanceof SubGroup){
            const index = this._groups.indexOf(object);
            if(index === -1){
                throw new Error('SubGroup not part of group.');
            }
            this._groups.splice(index,1);
            this.updateHeight();
            return this;
        }

        // remove component
        // TODO: Add

        throw new Error(`Object of type "${typeof object}" not removable.`);
    }
}