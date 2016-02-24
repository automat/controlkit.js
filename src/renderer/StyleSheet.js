import Style from "./Style";

export default class StyleSheet{
    constructor(){
        this._styles = [];
    }

    get styles(){
        return this._styles;
    }

    getStyleForType(type){

    }

    getStyleForClass(name){

    }

    getStyleForHierachyBranch(branch){
        var style = new Style();



        return style;
    }
}