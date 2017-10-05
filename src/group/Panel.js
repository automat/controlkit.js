import validateOption from 'validate-option';
import validateType from '../util/validate-type';
import validateValue from '../util/validate-value';
import validateDescription from '../util/validate-description';
import createHtml from '../util/create-html';
import createObjectPartial from '../util/create-object-partial';
import Group, {DefaultConfig as GroupDefaultConfig} from './group';
import ScrollContainer from './scroll-container';
import EventEmitter from 'events';

/*--------------------------------------------------------------------------------------------------------------------*/
// Template / Defaults
/*--------------------------------------------------------------------------------------------------------------------*/

const template =
    `<div class="panel">
        <div class="panel-head">
            <label></label>
            <div class="head-menu">
                <button class="btn-close"></button>
                <div class="head-state">
                    <button class="btn-save">save</button>
                    <button class="btn-load">load</button>
                </div>
            </div>
        </div>
        <ul class="group-list"></ul>
    </div>`;

/**
 * Panel horizontal alignment type
 * @type {Object}
 * @property {string} LEFT - align left
 * @property {string} RIGHT - align right
 */
export const AlignmentH = Object.freeze({
    NONE : null,
    LEFT : 'left',
    RIGHT : 'right'
});

/**
 * Panel vertical alignment type
 * @type {Object}
 * @property {string} TOP - align top
 * @property {string} BOTTOM - align bottom
 */
export const AlignmentV = Object.freeze({
    NONE : null,
    TOP : 'top',
    BOTTOM : 'bottom',
    TOP_STACK : 'top-stack',
    BOTTOM_STACK : 'bottom-stack'
});

/**
 * Panel default config
 * @type {Object}
 * @property {boolean} enabled - If true the panel will be displayed.
 * @property {boolean} fixed - If true the panel can be dragged and moved.
 * @property {number|null} x - The position x value for fixed panels.
 * @property {number|null} y - The position y value for fixed panels.
 * @property {number} width - The width of the panel.
 * @property {number|null} height - The panels maximum height.
 * @property {string|null} label - The panels head label.
 * @property {number|null} labelRatio
 * @property {number} ratio - The global component label / component width ratio.
 * @property {boolean} collapse - If true the panel get collapsed with only the panel head being visible.
 * @property {number} opacity - The global panel opacity.
 */
export const DefaultConfig = Object.freeze({
    id : null,
    enabled : true,
    fixed: false,
    alignh : AlignmentH.RIGHT,
    alignv : AlignmentV.TOP,
    x: null,
    y: null,
    width: 300,
    height: null,
    label: 'panel',
    labelRatio : null,
    ratio: 30,
    collapse: false,
    opacity: 1.0
});

/*--------------------------------------------------------------------------------------------------------------------*/
// Panel
/*--------------------------------------------------------------------------------------------------------------------*/

export default class Panel extends EventEmitter{
    constructor(controlKit,config){
        config = validateOption(config,DefaultConfig);
        validateValue(config.alignh,AlignmentH);
        validateValue(config.alignv,AlignmentV);

        if(config.fixed && (config.alignh || config.alignv)){
            throw new Error('Panel position "fixed" not compatible with alignment options.');
        }

        super();
        this.setMaxListeners(0);

        // state
        this._id = config.id;
        this._enabled = config.enabled;
        this._height = null;
        this._maxHeight = config.height;
        this._label = config.label;
        this._labelRatio = config.labelRatio;
        this._position = config.position;
        this._collapse = config.collapse;
        this._opacity = config.opacity;
        this._fixed = config.fixed;
        this._alignh = config.alignh;
        this._alignv = config.alignv;
        this._dragging = false;

        // node
        this._root = controlKit;
        this._element = createHtml(template);
        this._root._element.appendChild(this._element);
        this._elementHead = this._element.querySelector('.panel-head');
        this._elementLabel = this._element.querySelector('.panel-head label');
        this._elementClose = this._element.querySelector('.btn-close');
        this._elementSave = this._element.querySelector('.btn-save');
        this._elementLoad = this._element.querySelector('.btn-load');
        this._elementList = this._element.querySelector('.group-list');

        // auto position
        this._element.style.position = 'absolute';
        if(this._alignv === AlignmentV.BOTTOM || this._alignv === AlignmentV.BOTTOM_STACK){
            this._elementHead.classList.add('flipped');
        }

        this._scrollContainer = new ScrollContainer(this._elementList);
        this._scrollContainer.on('size-change',()=>{this.emit('scroll-size-change');});
        this._groups = [];

        //action collapse
        const onCollapse = (e)=>{
            this.collapse = !this.collapse;
            if(!this.collapse){
                this.updateHeight();
            }
            e.stopPropagation();
        };

        //panel drag
        let offsetX = 0;
        let offsetY = 0;
        const setPositionOffsetted = (x,y)=>{
            this.x = x - offsetX;
            this.y = y - offsetY;
        };
        const onHeadDragBegin = (e)=>{
            if(!this._fixed){
                return;
            }
            this._dragging = true;
            const rect = this._element.getBoundingClientRect();
            offsetX = e.pageX - rect.left;
            offsetY = e.pageY - rect.top;
            this._element.classList.add('dragging');
        };
        const onHeadDrag = (e)=>{
            if(!this._dragging){
                return;
            }
            setPositionOffsetted(e.pageX,e.pageY);
        };
        const onHeadDragEnd = (e)=>{
            if(!this._dragging){
                return;
            }
            setPositionOffsetted(e.pageX,e.pageY);
            offsetX = 0;
            offsetY = 0;
            this._dragging = false;
            this._element.classList.remove('dragging');
        };

        //menu save / load
        const onSave = ()=>{
            this._root.saveConfig();
        };
        const onLoad = ()=>{
            this._root.loadConfig();
        };

        //window resize
        const onWindowResize = ()=>{
            //constrain to viewport
            if(this._fixed){
                this.x = this.x;
                this.y = this.y;
            }
            this.updateHeight();
        };

        //attach listeners head
        this._elementHead.addEventListener('mousedown',onHeadDragBegin);
        document.addEventListener('mousemove',onHeadDrag);
        document.addEventListener('mouseup',onHeadDragEnd);
        this._elementHead.addEventListener('dblclick',onCollapse);
        this._elementClose.addEventListener('click',onCollapse);
        this._elementClose.addEventListener('dblclick',(e)=>{e.stopPropagation();});
        this._elementLoad.addEventListener('click',onSave);
        this._elementSave.addEventListener('click',onLoad);

        //attach lisneters window
        window.addEventListener('resize',onWindowResize);

        this._removeEventListeners = ()=>{
            document.removeEventListener('mousemove',onHeadDrag);
            document.removeEventListener('mouseup',onHeadDragEnd);
            window.removeEventListener('resize',onWindowResize);
        };

        //init
        this.fixed = this._fixed;
        this.label = this._label;
        this.enable = this._enabled;
        this.collapse = this._collapse;
        this.opacity = this._opacity;
        this.componentLabelRatio = this._labelRatio;
    }

    destroy(){
        for(const group of this._groups){
            group.destroy();
        }
        this._groups = [];
        this._element.parentNode.removeChild(this._element);
        this._removeEventListeners();
        this._root.updatePanelAutoPosition();
    }

    _removeGroup(group){
        const index = this._groups.indexOf(group);
        if(index === -1){
            throw new Error('Group not part of panel.');
        }
        this._groups.slice(index,1);
        this._elementList.removeChild(group.element);
        this.updateHeight();
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
     * Returns the root control kit instance.
     * @return {*}
     */
    get root(){
        return this._root;
    }

    /**
     * Returns the underlying HTMLElement.
     * @return {HTMLElement}
     */
    get element(){
        return this._element;
    }

    /**
     * Returns the list underlying HTMLElement.
     * @return {HTMLElement}
     */
    get elementList(){
        return this._elementList;
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // Alignment Setter / Getter
    /*----------------------------------------------------------------------------------------------------------------*/

    /**
     * If true, the panels position can be set.
     * @param value
     */
    set fixed(value){
        this._fixed = value;
        this._element.classList[value ? 'add' : 'remove']('fixed');
        this._element.style.right = null;
        this._element.style.bottom = null;
        this._root.updatePanelAutoPosition();
    }

    /**
     * Returns true if fixed.
     * @return {*}
     */
    get fixed(){
        return this._fixed;
    }

    /**
     * Sets the horizontal auto alignment.
     * @param {String|null} alignment
     */
    set alignh(alignment){
        validateValue(alignment,AlignmentH);
        this._alignh = alignment;
        this._root.updatePanelAutoPosition();
    }

    /**
     * Returns the horizontal auto alignment.
     * @return {String|null}
     */
    get alignh(){
        return this._alignh;
    }

    /**
     * Sets the vertical auto alignment.
     * @param {String|null} alignment
     */
    set alignv(alignment){
        validateValue(alignment,AlignmentV);
        this._alignv = alignment;
        this._root.updatePanelAutoPosition();
    }

    /**
     * Returns the vertical auto alignment.
     * @return {String|null}
     */
    get alignv(){
        return this._alignv;
    }

    /**
     * Sets the panels x position (if fixed).
     * @param {number} value
     */
    set x(value){
        if(!this._fixed){
            return;
        }
        this._position[0] = Math.max(0,Math.min(value,window.innerWidth - this.width));
        this._element.style.left = this._position[0] + 'px';
    }

    /**
     * Returns the panels current x position.
     * @return {number}
     */
    get x(){
        if(!this._fixed){
            return this._element.getBoundingClientRect().left;
        }
        return this._position[0];
    }

    /**
     * Sets the panels y position (if fixed).
     * @param {number} value
     */
    set y(value){
        if(!this._fixed){
            return;
        }
        this._position[1] = Math.max(0,Math.min(value,window.innerHeight - this._elementHead.getBoundingClientRect().height));
        this._element.style.top = this._position[1] + 'px';
        this.updateHeight();
    }

    /**
     * Returns the color-pickers current y position.
     * @return {number}
     */
    get y(){
        if(!this._fixed){
            return this._element.getBoundingClientRect().top;
        }
        return this._position[1];
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // Dimension Getter
    /*----------------------------------------------------------------------------------------------------------------*/

    /**
     * Returns the with of the color-picker.
     * @return {number}
     */
    get width(){
        return this._element.offsetWidth;
    }

    /**
     * Returns the height of the color-picker.
     * @return {number}
     */
    get height(){
        return this._element.offsetHeight;
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // Appearance Modifier
    /*----------------------------------------------------------------------------------------------------------------*/

    /**
     * Updates panel height to its content or restricted height.
     */
    updateHeight(){
        const top = this._elementHead.getBoundingClientRect().bottom;
        const max = window.innerHeight;
        const height = this._maxHeight ? Math.min(this._maxHeight,max - top) :
                       max > top ? (max - top) : null;
        this._scrollContainer.setHeight(height);
        this._root.updatePanelAutoPosition();
    }

    /**
     * Sets the panel head label text.
     * @param {string} value
     */
    set label(value){
        this._label = value;
        this._elementLabel.innerHTML = value;
    }

    /**
     * Returns the panel head label text.
     * @return {string}
     */
    get label(){
        return this._label;
    }

    /**
     * Set a global group value for label and component width ratio.
     * @param {number} value
     */
    set componentLabelRatio(value){
        this._labelRatio = value;
        for(const group of this._groups){
            group.componentLabelRatio = value;
        }
    }

    /**
     * Returns the global group value for label and component width ratio.
     * Returns null if no global value set.
     * @return {number}
     */
    get componentLabelRatio(){
        return this._labelRatio;
    }

    /**
     * Sets a global panel opacity.
     * @param {number} value
     */
    set opacity(value){
        this._opacity = value;
        this._element.style.opacity = value === 1.0 ? null : value;
    }

    /**
     * Returns the global panel opacity set.
     * Returns null if no global value set.
     * @return {number}
     */
    get opacity(){
        return this._opacity;
    }

    /**
     * Collapsed / expands the panel.
     * @param {boolean} value
     */
    set collapse(value){
        this._collapse = value;
        this._element.classList[value ? 'add' : 'remove']('collapse');
        this.updateHeight();
    }

    /**
     * Returns true if the panel is collapsed.
     * @return {boolean}
     */
    get collapse(){
        return this._collapse;
    }

    /**
     * Enables / disables the panel.
     * @param {boolean} value
     */
    set enable(value){
        this._enabled = value;
        this._element.classList[value ? 'remove' : 'add']('hide');
    }

    /**
     * Returns true if the panel is enabled.
     * @return {boolean}
     */
    get enable(){
        return this._enabled;
    }

    /*----------------------------------------------------------------------------------------------------------------*/
    // Elements Modifier
    /*----------------------------------------------------------------------------------------------------------------*/

    /**
     * Returns ths last active group.
     * @return {Group}
     * @private
     */
    _backGroupValid(){
        if(this._groups.length === 0){
            this.add({});
        }
        return this._groups[this._groups.length - 1];
    }

    /**
     * Adds group, sub-group or component
     * @param config
     *
     * @example
     * // creates an empty group
     * panel.add({})
     *
     * @example
     * // creates a group with components
     * panel.add({
     *     label: 'group a',
     *     comps: [
     *         {type: 'number', object, key}
     *     ]
     * });
     *
     * @example
     * // creates a group with multiple one level sub-groups
     * panel.add({
     *     groups : [{
     *         label : 'group a',
     *         comps : [
     *             {type: 'number', object, key}
     *         ]
     *     },{
     *         label : 'group b',
     *         comps : [
     *             {type: 'number', object, key}
     *         ]
     *     }]
     * });
     *
     * @example
     * // creates a group with multiple multi-level sub-groups
     * panel.add({
     *     groups : [{
     *         label : 'group a',
     *         groups : [{
     *             label : 'group a-a',
     *             comps : [
     *                 {type:'number', object, key}
     *             ]
     *         }]
     *     },{
     *         label : 'group b',
     *         groups : [{
     *             label : 'group b-a',
     *             comps : [
     *                 {type:'number', object, key}
     *             ]
     *         },{
     *             label : 'group b-b',
     *             comps : [
     *                 {type:'number', object, key}
     *             ]
     *         }]
     *     },{
     *         label : 'group c',
     *         comps : [
     *             {type: 'number', object, key}
     *         ]
     *     }]
     * });
     */
    add(config){
        // add single component to last sub-group
        if(config.type){
            this._backGroupValid().add(config);
            return this;
        }

        // extract groups & components
        const groups = config.groups;
        const comps = config.comps;
        config = createObjectPartial(config,['groups','comps']);

        // create multiple groups
        if(groups){
            for(const group of groups){
                this.add(group);
            }
            return this;
        }

        // create single group
        const group = new Group(this,config);
        this._groups.push(group);
        this._elementList.appendChild(group.element);
        group.componentLabelRatio = this._labelRatio;

        // listener on group height change
        group.on('size-change',()=>{
            this.updateHeight();
        });

        // update height to initial new group height
        this.updateHeight();

        // create sub-group components
        if(comps){
            for(const comp of comps){
                this.add(comp);
            }
        }

        // return panel root
        return this;
    }

    /* LEGACY MODIFIER */
    
    addGroup(config){
        return this.add(config || {});
    }

    addSubGroup(config){
        return this._backGroupValid().add(config || {});
    }

    addButton(name,config){
        return this.add(Object.assign({type:'button', name},config));
    }

    addNumber(object,key,config){
        return this.add(Object.assign({type:'number',object,key},config));
    }
    
    addString(object,key,config){
        return this.add(Object.assign({type:'string',object,key},config));
    }

    addCheckbox(object,key,config){
        return this.add(Object.assign({type:'checkbox',object,key},config));
    }
    
    addSelect(object,key,config){
        return this.add(Object.assign({type:'select',object,key},config));
    }

    addText(title,text){
        return this.add({type:'text',title,text});
    }

    addLabel(label,config){
        return this.add(Object.assign({type:'label',label},config));
    }

    addSlider(object,key,config){
        return this.add(Object.assign({type:'slider',object,key},config));
    }

    addRange(object,key,config){
        return this.add(Object.assign({type:'range',object,key},config));
    }

    addColor(object,key,config){
        return this.add(Object.assign({type:'color',object,key},config));
    }

    addPad(object,key,config){
        return this.add(Object.assign({type:'pad',object,key},config));
    }

    addCanvas(config){
        return this.add(Object.assign({type:'canvas'},config));
    }

    addSvg(config){
        return this.add(Object.assign({type:'svg'},config));
    }

    addImage(config){
        return this.add(Object.assign({type:'image'},config));
    }

    addFunctionPlotter(object,key,config){
        return this.add(Object.assign({type : 'function-plotter',object,key},config));
    }
}

