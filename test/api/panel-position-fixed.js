import ControlKit from '../../index';

window.addEventListener('load',()=>{
    const settings = {number:0, string:'abc'};

    new ControlKit().addPanel({fixed : true})
        .addGroup()
        .addSubGroup()
        .addNumber(settings,'number')
        .addSubGroup()
        .addString(settings,'string')
});