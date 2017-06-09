import ControlKit from '../../../index';

window.addEventListener('load',()=>{
    const settings = {number:0};

    const controlKit = new ControlKit();
    const height = 150;
    const panels = new Array(4);
    for(let i = 0; i < panels.length; ++i){
        panels[i] = controlKit.addPanel({height : 150 + Math.floor(150 * Math.random())});
    }

    for(const panel of panels){
        if(Math.random() < 0.5){
            panel.addGroup({label:'group'})
        }
        if(Math.random() < 0.5){
            panel.addSubGroup({label:'sub group'})
        }
        for(let i = 0; i < Math.floor(Math.random() * 30) + 1; ++i){
            panel.addNumber(settings,'number',{label:'' + i});
        }
    }

    const alignment = [
        ['left','top'],
        ['right','top'],
        ['right','top-stack'],
        ['right','bottom-stack'],
        ['right','bottom'],
        ['left','bottom'],
        ['left','bottom-stack'],
        ['left','top-stack']
    ];

    let index = 0;
    setInterval(()=>{
        for(const panel of panels){
            panel.alignh = alignment[index][0];
            panel.alignv = alignment[index][1];
        }
        index = (index + 1) % alignment.length;
    },500);
});