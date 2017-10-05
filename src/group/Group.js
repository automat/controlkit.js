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

    sync(){
        for(const child of this._children){
            child.sync();
        }
    }

    /**
     * Returns the underlying control-kit instance.
     */
    get root(){
        return this._parent.root;
    }

    /**
     * Sets the groups global label / component width ratio.
     * @param value
     */
    set componentLabelRatio(value){
        super.componentLabelRatio = value;
        for(const child of this._children){
            child.componentLabelRatio = value;
        }
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
            if(this._children.length === 0){
                this.add({});
            }
            this._children[this._children.length - 1].add(config);
            return this;
        }

        // extract groups & components
        const subGroups = config.groups;
        const comps = config.comps;
        config = createObjectPartial(config,['groups','comps']);

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
        this._children.push(subGroup);

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
}