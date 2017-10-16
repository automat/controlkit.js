import ControlKit from '../../../index';

window.addEventListener('load',()=>{
    const settings = {a:[0,0],b:0};
    const range = [[-2,1],[0,1]];

    const controlKit = new ControlKit();
    controlKit.add({
        comps : [
            {type:'pad',object:settings,key:'a',rangeX:range[0],rangeY:range[1]},
            {type:'pad',object:settings,key:'a',label:'none'},
            {type:'range',object:settings,key:'a',label:'output',readonly:true,hideSubLabel:true}
        ]
    })
});