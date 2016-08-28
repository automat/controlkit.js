##Control-Kit Creation

###Classic

```
const controlKit = new ControlKit();
const panel = controlKit.addPanel()
    .addGroup({label:'Group-A'})
        .addSubGroup({label:'Sub-Group-A'})
            .addSlider(object,'numberValue',range)
            .addNumber(object,'stringProp',{readonly:true})
            .addString(object,'stringProp',{readonly:true})
        .addSubGroup({label:'Sub-Group-B'})
    .addGroup{{label:'Group-B})    
        .addSubGroup({label:'Sub-Group-B'})
            .addBoolean(object,'booleanProp',{readonly:false})
            .
```
###Description

```
const controlKit = new ControlKit();
const panel = controlKit.addPanel()
     .addFromDescription({
         group : {
             subGroup : [{
                 label : 'Sub-Group-A',
                 comps : [{
                     object: object,
                     value: 'numberValue'
                  },{
                      object: object,
                      value: 'stringProp',
                      readonly: true
                  },{
                      object: object,
                      value: 'stringProp',
                      readonly: true,
                      label: 'Some Label'
                  },{
                      object: object,
                      value: 'sliderNumber',
                      range: [0,10]
                  }]
                }
            ]
        }
    }
);
```
###Object

```
const controlKit = new ControlKit();
controlKit.addPanelFromObject({
    flatPropA : 1,
    flatPropB : 'string'
    groupedProp : {
        flatPropA : 1,
        flatPropARange : [0,10],
        flatPropB : 'string',
        flatPropC : 'string',
        flatPropCOption : [
            'string','anotherString'
        ]
    }
});
```