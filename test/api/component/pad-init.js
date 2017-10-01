import ControlKit from '../../../index';

window.addEventListener('load',()=>{
    const settings = {a:[0,0],b:0};
    const range = [[-2,1],[0,1]];

    new ControlKit().addPanel()
        .addPad(settings,'a',{rangeX: range[0],rangeY:range[1]})
        .addPad(settings,'a',{label:'none'})
});