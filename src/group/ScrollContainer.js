import createHtml from '../util/createHtml';

/*--------------------------------------------------------------------------------------------------------------------*/
// Template
/*--------------------------------------------------------------------------------------------------------------------*/

const template =
    `<div class="scroll-wrap">
        <div class="scroll-container"></div>
        <div class="scroll-bar">
            <div class="scroll-track">
                <div class="scroll-handle"></div>
            </div>
        </div>
    </div>`;

/*--------------------------------------------------------------------------------------------------------------------*/
// Scroll Container
/*--------------------------------------------------------------------------------------------------------------------*/

export default class ScrollContainer{
    /**
     * @constructor
     * @param {HTMLElement} target
     */
    constructor(target){
        this._height = null;
        this._scrollY = 0;
        this._trackDragging = false;
        this._handleDragging = false;

        this._target = target;
        this._parent = this._target.parentNode;
        this._element = createHtml(template);
        this._elementContainer = this._element.querySelector('.scroll-container');
        this._elementTrack = this._element.querySelector('.scroll-track');
        this._elementHandle = this._element.querySelector('.scroll-handle');

        //scroll within container
        const onContainerScroll = (e)=>{
            if(this._height === null){
                return;
            }
            this._scrollY += -((e.wheelDelta * 0.35) || (e.detail * -6.0));
            this._scrollY = Math.max(0,Math.min(this._scrollY,this.scrollMax));
            this._target.style.marginTop = -this._scrollY + 'px';
            this._updateHandlePosition();
            e.preventDefault();
            e.stopPropagation();
        };

        //scroll position relative to handle
        const setScrollFromHandle = (pageY,offset,rectTrack,rectHandle)=>{
            const min = 0;
            const max = rectTrack.height - rectHandle.height;
            const handle = Math.max(min,Math.min(pageY - rectTrack.top - offset,max));

            //update scroll container position
            this._scrollY = (handle / max) * (this._target.offsetHeight - this._element.offsetHeight);
            this._target.style.marginTop = -this._scrollY + 'px';

            //update scroll handle position
            this._elementHandle.style.marginTop = handle + 'px';
        };

        let rectTrack = null;
        let rectHandle = null;
        let offsetHandle = -1;

        //handle track click
        const onTrackMouseDown = (e)=>{
            rectTrack = this._elementTrack.getBoundingClientRect();
            rectHandle = this._elementHandle.getBoundingClientRect();
            const min = e.pageY - rectTrack.top;
            const max = rectTrack.bottom - e.pageY;
            offsetHandle = rectHandle.height * 0.5;
            //offset calc track top / bottom range
            offsetHandle = offsetHandle > min ? min : //0 -> height / 2
                           offsetHandle > max ? rectHandle.height - max : //height / 2 -> height
                           offsetHandle;
            setScrollFromHandle(e.pageY,offsetHandle,rectTrack,rectHandle);
            this._trackDragging = true;
        };

        //handle drag
        const onHandleMouseDown = (e)=>{
            rectTrack = this._elementTrack.getBoundingClientRect();
            rectHandle = this._elementHandle.getBoundingClientRect();
            offsetHandle = e.pageY - rectHandle.top;
            this._trackDragging = false;
            this._handleDragging = true;
            e.stopPropagation();
        };
        const onHandleMouseMove = (e)=>{
            if(!(this._handleDragging || this._trackDragging)){
                return;
            }
            setScrollFromHandle(e.pageY,offsetHandle,rectTrack,rectHandle);
        };
        const onHandleMouseUp = ()=>{
            this._handleDragging = false;
            this._trackDragging = false;
        };

        this._elementContainer.addEventListener('mousewheel',onContainerScroll);
        this._elementContainer.addEventListener('DOMMouseScroll',onContainerScroll);
        this._elementTrack.addEventListener('mousewheel',onContainerScroll);
        this._elementTrack.addEventListener('DOMMouseScroll',onContainerScroll);

        this._elementTrack.addEventListener('mousedown',onTrackMouseDown);

        this._elementHandle.addEventListener('mousedown',onHandleMouseDown);
        document.addEventListener('mousemove',onHandleMouseMove);
        document.addEventListener('mouseup',onHandleMouseUp);

        //remove listeners on control-kit cleanup
        this._removeEventListeners = ()=>{
            document.removeEventListener('mousemove',onHandleMouseMove);
            document.removeEventListener('mouseup',onHandleMouseUp);
        }
    }

    /**
     * Updates the handle height relative to the content height.
     * @private
     */
    _updateHandleHeight(){
        const heightTrack = this._elementTrack.offsetHeight;
        const ratio = heightTrack / this._target.offsetHeight;
        this._elementHandle.style.height = (ratio * heightTrack) + 'px';
    }

    /**
     * Updates the handle position relative to the scroll offset.
     * @private
     */
    _updateHandlePosition(){
        const heightTrack = this._elementTrack.offsetHeight;
        const max = this._target.offsetHeight - this._element.offsetHeight;
        const ratio = this._elementHandle.offsetHeight / heightTrack;
        this._elementHandle.style.marginTop = this._scrollY / max * (1.0 - ratio) * heightTrack + 'px';
    }

    /**
     * Scrolls the target element to top.
     */
    scrollToTop(){
        this.scrollTo(0);
    }

    /**
     * Scrolls the target element to bottom.
     */
    scrollToBottom(){
        this.scrollTo(this.scrollMax);
    }

    /**
     * Scrolls the target element to a specified position.
     * @param position
     */
    scrollTo(position){
        this._scrollY = Math.max(0,Math.min(position,this.scrollMax));
        this._target.style.marginTop = this._scrollY == 0 ? null : -this._scrollY + 'px';

        this._updateHandleHeight();
        this._updateHandlePosition();
    }

    /**
     * Returns the maximum scroll position.
     * @return {number}
     */
    get scrollMax(){
        return this._target.offsetHeight - this._element.offsetHeight;
    }

    /**
     * Sets the scroll-container height. If null the scroll-container gets removed.
     * @param height
     */
    setHeight(height){
        //scroll-container remove
        if(height === null){
            if(this._height !== null){
                this._parent.removeChild(this._element);
                this._parent.appendChild(this._target);
            }
            this.scrollToTop();
        //scroll-container active
        } else {
            const heightTarget = this._target.offsetHeight;
            height = Math.min(height,heightTarget);

            if(height === heightTarget){
                this.setHeight(null);
                return;
            }
            //update
            if(this._height !== null){
                this._element.style.height = height + 'px';
                //target offsetted
                const diff = heightTarget - this._scrollY;
                if(diff < height){
                    this.scrollToBottom();
                } else {
                    this._updateHandleHeight();
                    this._updateHandlePosition();
                }
            //scroll-container add
            } else {
                this._elementContainer.appendChild(this._target);
                this._parent.appendChild(this._element);
                this._element.style.height = height + 'px';
                this.scrollToTop();
            }
        }
        this._height = height;
    }

    /**
     * Returns the container´s current height.
     * @return {null|*|number}
     */
    get height(){
        return this._height;
    }

    /**
     * Detaches the scroll-container from the target element and
     * removes all event listeners.
     */
    clear(){
        this.setHeight(null);
        this._removeEventListeners();
    }
}