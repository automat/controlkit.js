import Component from './component';

export default class Text extends Component{
    constructor(parent,title,text){
        super(parent,{label:title});

        this._state.text = text;

        this._element.classList.add('type-text');

        this.title = this._state.label;
        this.text = this._state.text;
    }

    /**
     * Returns the type name.
     * @return {string}
     */
    static get typeName(){
        return 'text';
    }

    /**
     * Sets the title.
     * @param {String} value
     */
    set title(value){
        this.label = value;
    }

    /**
     * Returns the title.
     * @return {String}
     */
    get title(){
        return this.label;
    }

    /**
     * Sets the text content.
     * @param {String} value
     */
    set text(value){
        this._state.text = value;
        const paragraphs = this._element.querySelectorAll('p');
        for(let i = 0; i < paragraphs.length; ++i){
            this._element.removeChild(paragraphs[i]);
        }
        const sentences = value.split('\n');
        for(let sentence of sentences){
            const paragraph = this._element.appendChild(document.createElement('p'));
            paragraph.innerText = sentence;
        }
    }

    /***
     * Returns the text content.
     * @return {String}
     */
    get text(){
        return this._state.text;
    }
}