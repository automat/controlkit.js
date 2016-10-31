import ControlKit from '../../index';

window.addEventListener('load',()=>{
    new ControlKit().add({
        type: 'text',
        title: 'Title',
        text : 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam eleifend egestas dui, id facilisis urna lobortis eget. Curabitur commodo neque vitae libero condimentum, sed egestas urna euismod. Proin justo lorem, tristique nec ligula in, pharetra venenatis mauris. \nSuspendisse potenti. Duis iaculis enim quam, quis congue elit imperdiet iaculis'
    })
});