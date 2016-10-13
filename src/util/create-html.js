export default function createHtml(html){
    const template = document.createElement('template');
    template.innerHTML = html;
    return template.content.firstChild;
}