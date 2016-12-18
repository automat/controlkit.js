import ControlKit from '../../index';

window.addEventListener('load',()=>{
    const controlKit = new ControlKit();
    const panelA = controlKit.addPanel({label: 'panel a'});
    panelA.destroy();
    const panelB = controlKit.addPanel({label: 'panel b'});
    panelB.destroy();
    const panelC = controlKit.addPanel({label: 'panel c'});
    panelC.destroy();
});