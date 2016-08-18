import StyleSheet from "../StyleSheet";
import Style from "./Style";

const StyleCompositor = {
    getStyleFromClass : function(class_){
        let style = new Style();
        for(let property in class_){
            style[property] = class_;
        }
    },
    getStyleForClassList(classList){
        let classes = classList.toString().split(' ');
        let style   = new Style();
        for(let class_ of classes){
            style.merge(this.getStyleFromClass(class_));
        }
        return style;
    }
};

export default StyleCompositor;