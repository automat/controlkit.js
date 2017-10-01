export default function createStyle(str){
    const style = document.createElement('style');
    style.type = 'text/css';
    if(style.stylesheet){
        style.stylesheet.cssText = str;
    } else {
        style.appendChild(document.createTextNode(str));
    }
    return style;
}