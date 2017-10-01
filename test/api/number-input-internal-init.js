import NumberInput from '../../src/component/internal/number-input-internal';

function main(){
    const input = new NumberInput();

    document.body.appendChild(input.element);
}

window.addEventListener('load',main);
