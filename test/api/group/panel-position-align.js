import ControlKit from '../../../index';

window.addEventListener('load',()=>{
    const settings = {number:0};

    const controlKit = new ControlKit();
    const height = 150;
    const panels = [
        controlKit.addPanel({label:'bls',alignh: 'left', alignv : 'bottom-stack', height}),
        controlKit.addPanel({label:'bls',alignh: 'left', alignv : 'bottom-stack', height}),
        controlKit.addPanel({label:'bl',alignh: 'left', alignv : 'bottom', height}),
        controlKit.addPanel({label:'brs',alignh: 'right', alignv: 'bottom-stack', height}),
        controlKit.addPanel({label:'brs',alignh: 'right', alignv: 'bottom-stack', height}),
        controlKit.addPanel({label:'br',alignh: 'right', alignv: 'bottom', height}),
        controlKit.addPanel({label:'tl',alignh: 'left', alignv : 'top', height}),
        controlKit.addPanel({label:'tls',alignh: 'left', alignv : 'top-stack', height}),
        controlKit.addPanel({label:'tls',alignh: 'left', alignv : 'top-stack', height}),
        controlKit.addPanel({label:'tr',alignh: 'right', alignv : 'top', height}),
        controlKit.addPanel({label:'trs',alignh: 'right', alignv : 'top-stack', height}),
        controlKit.addPanel({label:'trs',alignh: 'right', alignv : 'top-stack', height})
    ];

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

});