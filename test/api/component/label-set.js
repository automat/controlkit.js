import ControlKit from '../../../index';

window.addEventListener('load',()=>{
    const controlKit = new ControlKit();
    controlKit.addPanel()
        .addLabel('A label component',{id: 'label'});

    const labels = [
        'Praesent fringilla erat sem',
        'A ultricies neque laoreet vestibulum',
        'Nullam venenatis convallis egestas',
        'Fusce id lorem aliquam'
    ];

    let index = 0;
    setInterval(()=>{
        controlKit.get('label').label = labels[index];
        index = (index + 1) % labels.length;
    },250);
});