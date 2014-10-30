D R A F T
![Peng!](images/image-0.png)

ControlKit is a lightweight controller and gui library for browser environments.
Object properties can be modified with basic control components such as buttons, sliders, string and number inputs, checkboxes, selects, color pickers and range inputs. Some more exotic components like xy-pads, value and function plotters do provide additional control. [more here] ... 

Why.

<br>
[Usage](#usage) — [Setup](#setup) — [Panel](#panel) — [Container](#container) - [Component](#component) - [Styling](#styling) - [Alternatives](#alternatives) -
[Dependencies](#dependencies) - [ChangeLog](#changeLog) - [License](#license)


___

##Usage

When using node or browserify

    npm install controlkit

Alternatively use the standalone version found in ./bin.

    <script type='text/javascript' src='controlKit.min.js'></script>
   
The two main elements of ControlKit are containers and components. The latter are constructed per panel and grouped in Groups and SubGroups. To keep the amount of code necessary to setup complex controls to a minimum, container and component initialization are chained to their parent panel. ........

	var obj = {
		number : 0,
		string ; 'abc'
	};
	
	ControlKit.setup();
	ControlKit.addPanel()
		.addGroup()
			.addSubGroup()
				.addNumberInput(obj,'number')
				.addStringInput(obj,'string');
				


##Setup


####ControlKit.setup(options) [+](#usage)
ContolKit is an

##Container

Components and Groups are 

    ControlKit.addPanel();
    //
    var panel = ControllKit.addPanel(); //keep ref

####ControlKit.addPanel(options) [+](#usage)

<br/>
####panel.addGroup(options)

Adds a new Group to the Panel.

<br/>
####panel.addSubGroup(options)

Adds a new SubGroup to the last added Group.

    //classic init
    ControlKit.addPanel()
        .addGroup()
            .addSubGroup()
                .addComponentXY(object,propertyKey);
                
    //If components are immediately added after panel creation,
    //the initial Group and SubGroup are added automatically
    ControlKit.addPanel()
        .addComponentXY(object,propertyKey);
        
    //multiple levels  
    ControlKit.addPanel()
        .addGroup()
            .addSubGroup()
                .addComponentXYZ(object,propertyKey)
                .addComponentXYZ(object,propertyKey)
                ...
        .addGroup() // add second Group
            .addSubGroup()
                .addComponentXYZ(object,propertyKey)
                ...
            .addSubGroup() // add second SubGroup
                .addComponentXYZ(object,propertyKey)
                ...
        ...
    
<br/>
##Component

Available component

Component interlink

	var obj = {
		valueA : 0.25,
		valueB : 1.25,	
		func : function(x,y){
			return Math.sin(x * this.valueA) * Math.cos(y * this.valueB);
		}
	}
	
	ControlKit.setup().addPanel()
		.addNumberInput(obj,'valueA')
		.addNumberInput(obj,'valueB')
		.addFunctionPlotter(obj,'func');




NumberInput, StringInput, Range and Color modifier support optional presets to choose from.

    panel.addComponentSupportingPresets(obj,propertyKey,{preset:arrayOfPresetsWithSameTypeAsProperty});
    
For an extended documentation of every component initialization just 
press **+**

---

![NumberInput](images/NumberInput.png)<br/>
![NumberInputOption](images/NumberInputOption.png)

####panel.addNumberInput(object,propertyKey,options)

Adds a new NumberInput to the last added SubGroup.


![NumberOutput](images/NumberOutput.png)

####panel.addNumberOutput(object,propertyKey,options)

Adds a new NumberOutput to the last added SubGroup. In contrast to NumberInput this component doesn't allow modifying the property.

![StringInput](images/StringInput.png)<br/>
![StringInputOption](images/StringInputOption.png)

####panel.addStringInput(object,propertyKey,options)

Adds a new StringInput to the last added SubGroup.

![StringOutput](images/StringOutput.png)

####panel.addStringOutput(object,propertyKey,options)

Adds a new StringOutput to the last added SubGroup. In contrast to StringInput this component doesn't allow modifying the property.

![Slider](images/Slider.png)

####panel.addSlider(object,propertyKey,rangeKey,options)

Adds a new Slider to the last added SubGroup.

    var obj = {value:0,range:[-1,1]};
    
    panel.addSlider(obj,'value','range');
   
![Range](images/Range.png)

####panel.addRange(object,propertyKey,options)

Adds a new Checkbox to the last added SubGroup.

![Button](images/Button.png)

####panel.addButton(label,onPress,options)

Adds a new Button to the last added SubGroup.

    panel.addButton('fire',function(){console.log('Peng!);});
    
![Checkbox](images/Checkbox.png)

####panel.addCheckbox(object,propertyKey,options)

Adds a new Checkbox to the last added SubGroup.

![Select](images/Select.png)<br/>
![SelectOption](images/SelectOption.png)

####panel.addSelect(object,propertyKey,options)

Adds a new Select to the last added SubGroup.

    var obj = {
        options:['Some','options','to','choose'], 
        selection : this.options[3]};
    
    panel.addSelect(obj,'options',{
        onChange:function(index){
            obj.selection = obj.options[index];});
            
    //or
    panel.addSelect(obj,'options',{target:'selection'});

![Color](images/Color.png)<br/>
![ColorOption](images/ColorOption.png)<br/>
![Picker](images/Picker.png)

####panel.addColor(object,propertyKey,options)

Adds a new Color modifier to the last added SubGroup.

    var obj = {color:'#ff00ff'};
    
    panel.addColor(obj,'color',{colorMode:'hex'});

![Pad](images/Pad.png)

####panel.addPad(object,propertyKey,options)

Adds a new XY-Pad to the last added SubGroup.

![FunctionPlotter](images/FunctionPlotter.png)

####panel.addFunctionPlotter(object,propertyKey,options)

Adds a new FunctionPlotter to the last added SubGroup.

![ValuePlotter](images/ValuePlotter.png)

####panel.addValuePlotter(object,propertyKey,options)

Adds a new ValuePlotter to the last added SubGroup.

---

If a value gets changed externally, eg in an update loop, you can sync ControlKit by using:
*(be aware that this might have a quite huge performance impact when using complex control setups)*

	update(){	//your update loop
		ControlKit.update();
	}
  
####~~Custom Canvas Component~~ [+](#usage)
####~~Custom SVG Component~~ [+](#usage)
  
##Styling

If the default styling is too photoshoppy for your taste, you can completly replace it by modifying the default one located in [./style](../master/style/).  

Its written in scss and split into [_images.scss](../master/style/_images.scss) (up/down arrows, close btn images, undo ...), [_presets.scss](../master/style/_presets.scss) (all variables, sizes, colors, ratios, font related...) and [style.scss](../master/style/style.scss) (defining the actual structure). Although a great amount of time has been spend translating the designs to css, the files need a little cleanup and restructure. 
  
**Apply your custom style** by either using an *external stylesheet* (eg. when developing a custom style) via:

    ControlKit.setup({useExternalStyle:true});

Or create a *standalone version* of controlKit with a custom built-in style using:

    utils/node build -o outfilePath -s yourCustomStyleStringOrCssFile
    
If for some reason, you want to *completly replace* the default styling. Alter it within the original folder and just run.

	utils/node updateStyle

This will inject the new default style into to the packaged version controlKit.js and controlKit.min.js within ./bin, but will also completly replace the default module version.

##Alternatives

[dat.gui](https://github.com/dataarts/dat.gui) - The de facto standard
[Guido](https://github.com/fjenett/Guido) - Proccesing.js compatible, Florian Jenett

##Depencies 
**DEV ONLY**
browserify

##ChangeLog

0.2.1

##License

