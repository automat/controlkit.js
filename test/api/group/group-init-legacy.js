import ControlKit from '../../../index';

window.addEventListener('load',() =>{
    const settings = {number : 0};

    new ControlKit().addPanel({label:'panel'})
        .addGroup({label:'group a'})
        .addNumber(settings,'number')
});