import StringInputInternal from '../../src/component/StringInputInternal';

function main(){
    const a = new StringInputInternal({placeholder:'Single'});
    const b = new StringInputInternal({placeholder:'Multi',multiline:true,readonly:false});
    const c = new StringInputInternal({multiline:true,lines:4});
    const d = new StringInputInternal({multiline:true,lines:4,readonly:true});

    b.value = 'some\nlines\nof\ntext';

    const section = document.body.appendChild(document.createElement('section'));
    section.setAttribute('id','control-kit');
    section.style.pointerEvents = 'auto';
    section.appendChild(b.element);
    section.appendChild(d.element);
    section.appendChild(a.element);
    section.appendChild(c.element);
}

window.addEventListener('load',main);
