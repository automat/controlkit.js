D R A F T
![Peng!](images/image-0.png)

ControlKit is a lightweight controller and gui library for browser environments.
Object properties can be modified with basic control components such as buttons, sliders, string and number inputs, checkboxes, selects, color pickers and range inputs. Some more exotic components like xy-pads, value and function plotters do provide additional control. [more here] ... 

<br>
[Usage](#usage) — [Setup](#setup) — [Groups](#groups) — [Components](#components)

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


####ControlKit.setup(options)

##Panel

####ControlKit.addPanel(options)

##Group

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
	


Excpect for Sliders and .... all components are initialized the same way:

	ControlKit.setup().addPanel()
		.addComponentXYZ(object,propertyKey,optionalOptions)
		.addComponentXYZ(object,propertyKey,optionalOptions);

####Button

####Slider



If a value gets changed externally, eg in an update loop, you can sync ControlKit by using:
*(be aware that this might have a quite huge performance impact when using complex control setups)*

	update(){	//your update loop
		ControlKit.update();
	}
  
  
  
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

dat.gui

##Depencies
(dev only)
browserify

##ChangeLog

##Liscence

