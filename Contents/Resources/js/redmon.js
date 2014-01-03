// JavaScript Document

/**
 * @method	toString
 * 
 * @return	<String>
 */
window.toString = function toString()/*:String*/ {
	
	return "[object Window]";
	
};

var redmon = {
	
	version: 0.5, 
	debug: true, 
	
	Array: {}, 
	Object: {}, 
	String: {}, 
	
	controls: {}, 
	dom: {}, 
	events: {}, 
	motion: {}, 
	net: {}, 
	system: {}, 
	utils: {}, 
	variables: {}
	
};

/**
 * @method	Class
 * 
 * @param	definition	<Object>
 * @usage	redmon.Class({
 * 				$package: "ClassName | path.ClassName", 
 * 				$extends: Object | path.Object, 
 * 				$override: true | false, 
 * 				$protected: true | false, 
 * 				$constructor: function ClassName() {
 * 					
 * 				}, 
 * 				$prototype: {
 * 					
 * 				$override: {}, 
 * 				$protected: {}
 * 				
 * 				}
 * 			});
 */
redmon.Class = function Class(definition/*:Object*/)/*:void*/ {
	
	if (!definition["$package"] || !definition["$constructor"]) {
		
		throw new Error("Method Class parameter 'definition' requires a '$package' and '$constructor' property.");
		
	}
	
	var path/*:Array*/ = definition["$package"].split("."), 
		name/*:String*/ = path.pop(), 
		$override = null, 
		$protected = null, 
		isOverride/*:Boolean*/ = true, 
		isProtected/*:Boolean*/ = false, 
		proto/*:Object*/ = null, 
		root/*:Object*/ = redmon.getFeature(path.join("."));
	
	if (root === undefined) {
		
		throw new Error("Incorrect $package address: '" + path.join(".") + "' for feature name: '" + name + "'");
		
	}
	
	if (root[name] !== undefined && (root[name]["$protected"] !== undefined && root[name]["$protected"]) && (definition["$override"] === undefined || !definition["$override"])) {
		
		throw new Error("'" + name + "' is a protected feature and may not be overridden without setting $override to true. WARNING: By overriding this feature you may adversely affect other features of this library, so use $override with caution.");
		
	}
	
	/**
	 * Create constructor
	 */
	root[name] = definition["$constructor"];
	
	/**
	 * Set protected status if $protected is defined.
	 */
	if (definition["$protected"] !== undefined) {
		
		root[name]["$protected"] = definition["$protected"];
		
	}
	
	/**
	 * Extend feature using the $extends object.
	 */
	if (definition["$extends"] !== undefined) {
		
		root[name].prototype = new definition["$extends"]();
		
		proto = root[name].prototype;
		proto["constructor"] = root[name];
		proto["__super__"] = definition["$extends"];
		
		$protected = proto["$protected"];
		$override = definition["$prototype"]["$override"];
		
		/**
		 * Get static properties of the extended class.
		 */
		for (var property in definition["$extends"]) {
			
			if (!(/\$protected|\$override|\$prototype|prototype/).test(property)) {
				
				root[name][property] = definition["$extends"][property];
				
			}
			
		}
		
		/**
		 * Add properties from the $prototype object.
		 */
		for (var property in definition["$prototype"]) {
			
			/*
			 * $protected
			 * Check '$protected' status. If property is protected then it's not subject to 
			 * override unless '$override' status is set to true for the current class property.
			 */
			isProtected = $protected !== undefined && $protected[property] !== undefined ? ($protected[property] === true) : false;
			
			/*
			 * $override
			 * Check '$override' status. If property is set to override the super's property 
			 * then it will replace it in the current class's prototype.
			 */
			isOverride = $override !== undefined && $override[property] !== undefined ? ($override[property] === true) : (isProtected ? false : true);
			
			if (isOverride) {
				
				proto[property] = definition["$prototype"][property];
				
			}
			
		}
		
		/**
		 * Special case for IE. IE seems to remove the toString method from the definition object when doing a for..in.
		 * Not sure why but perhaps it's because toString is a standard method. 
		 * This needs further research but this fixes the issue for now.
		 */
		isProtected = $protected !== undefined && $protected["toString"] !== undefined ? ($protected["toString"] === true) : false;
		
		isOverride = $override !== undefined && $override["toString"] !== undefined ? ($override["toString"] === true) : (isProtected === true ? false : true);
		
		if (definition["$prototype"]["toString"] !== Object.prototype.toString && isOverride) {
			
			proto["toString"] = definition["$prototype"]["toString"];
			
		}
		
	} else {
		
		root[name].prototype = definition["$prototype"] || {};
		proto = root[name].prototype;
		proto["constructor"] = root[name];
		proto["__super__"] = Function;
		
	}
	
	root[name].name = name;
	
	if (proto["toString"] === ({}).toString) {
		
		proto["toString"] = function() {
			
			return "[object " + this.constructor.name + "]";
			
		};
		
	}
	
	proto["toString"].toString = function() {
		
		return "function toString() {\n    [redmon native code]\n}";
		
	};
	
	proto["constructor"].toString = function() {
		
		return "function " + this.name + "() {\n    [redmon native code]\n}";
		
	};
	
	// Set internal vars to null to release them from memory.
	definition = path = name = isOverride = isProtected = proto = root = null;
	
};

redmon.Class.$protected = true;

/**
 * @method	getFeature
 * 
 * Used to retrieve a feature object, class or property of the 
 * redmon object by way of dot syntax (eg. "net.URIQuery").
 */
redmon.getFeature = function getFeature(name/*:String*/)/*:Object*/ {
	
	var path = name.split("."), 
		root = this;
	
	if (path.toString() !== "") {
		
		for (var i = 0, len = path.length; i < len; i++) {
			
			if (root[path[i]] === undefined) {
				
				return undefined;
				
			} else {
				
				root = root[path[i]];
				
			}
			
		}
		
	}
	
	return root;
	
};

redmon.getFeature.$protected = true;

/**
 * @method	hasFeature
 * 
 * Used by redmon.Class to keep track of 
 * featues added to the redmon object.
 */
redmon.hasFeature = function hasFeature(name/*:String*/)/*:Boolean*/ {
	
	return (redmon.getFeature(name) !== undefined);
	
};

redmon.hasFeature.$protected = true;

redmon.isNaA = function isNaA(target/*:Object*/)/*:Boolean*/ {
	
	return redmon.typeOf(target) !== "array";
	
};

redmon.isNaB = function isNaB(target/*:Object*/)/*:Boolean*/ {
	
	return redmon.typeOf(target) !== "boolean";
	
};

redmon.isNaC = function isNaC(target/*:Object*/)/*:Boolean*/ {
	
	return redmon.typeOf(target) !== "class";
	
};

redmon.isNaF = function isNaF(target/*:Object*/)/*:Boolean*/ {
	
	return redmon.typeOf(target) !== "function";
	
};

redmon.isNaN = window.isNaN;

redmon.isNaO = function isNaO(target/*:Object*/)/*:Boolean*/ {
	
	return redmon.typeOf(target) !== "object";
	
};

/**
 * @method	toString
 * 
 * @return	<String>
 */
redmon.toString = function toString()/*:String*/ {
	
	return "[redmon ".concat("version=", this.version, "]");
	
};

/**
 * @method	typeOf
 * 
 * @return	<String>
 */
redmon.typeOf = function typeOf(target/*:Object*/)/*:String*/ {
	
	if (arguments.length !== 1) {
		throw new Error("Method typeOf requires 1 parameter.");
	}
	
	var type/*:String*/ = typeof(target), 
		func = target == null ? null : target["constructor"];
	
	if (type === "object") {
		
		if (func) {
			
			if (func === Array) {
				
				return "array";
				
			} else if (func !== Object) {
				
				if (target.toString() === "[object Window]") {
					
					return "window";
					
				} else if (window.HTMLElement !== undefined && target instanceof window.HTMLElement) {
					
					return "htmlelement";
					
				} else if (window.HTMLDocument !== undefined && target instanceof window.HTMLDocument) {
					
					return "htmldocument";
					
				}
				
				return "class";
				
			}
			
		} else {
			
			/**
			 * Catch IE's window, htmldocument, and its htmlelements
			 */
			if (target.nodeType !== undefined) {
				
				if (target.nodeName === "#document") {
					
					return "htmldocument";
					
				}
				
				return "htmlelement";
				
			} else if (target.toString() === "[object Window]") {
				
				return "window";
				
			}
			
		}
		
	}
	
	return type;
	
};

/**
 * Array
 */
redmon.Array.forEach = function(target/*:Array*/, method/*Function*//*, scope:Object*/) {
	
	if (redmon.isNaF(method)) {
		
		throw new Error("Method forEach 'method' parameter is not a Function");
		
	}
	
	for (var index = 0, len = target.length; index < len; index++) {
		
		if (method.call(arguments[2] || null, target[index], index, target)) break;
		
	}
	
};
	
redmon.Array.randomize = function(target/*:Array*/)/*:Array*/ {
	
	return target.slice().sort(function(){
		
		return (Math.round(Math.random()) - 0.5);
		
	});
	
};

/**
 * Object
 */
redmon.Object = {
	/*
	sortOn(target, "name")
	*/
	
	toStringClassTemplate: "[{className} {content}]", 
	
	/**
	 * @method	forEach
	 */
	forEach: function(target/*:Object*/, method/*:Function*//*, scope:Object*/)/*:void*/ {
		
		if (redmon.isNaF(method)) {
			
			throw new Error("Method forEach 'method' parameter is not a Function");
			
		}
		
		for (var property/*:String*/ in target) {
			
			if (target.hasOwnProperty === undefined || target.hasOwnProperty !== undefined && target.hasOwnProperty(property)) {
				
				if (method.call(arguments[2] || null, property, target[property], target)) break;
				
			}
			
		}
		
	}, 
	
	/**
	 * @method	get
	 * 
	 */
	get: function(target/*:Object*/, name/*:String*/)/*:Object*/ {
		
		return target[name] || null;
		
	}, 
	
	/**
	 * @method	join
	 * 
	 * @return	<Object>
	 */
	join: function(target/*:Object*/, delimiter/*:String*/)/*:String*/ {
		
		var result/*:String*/ = "", 
			seperator/*:String*/ = delimiter || ",";
		
		redmon.Object.forEach(target, function(name/*:String*/, value/*:Object*/, list/*:Object*/) {
			
			result = result.concat(name, "=", value, seperator);
			
		});
		
		//return result.substring(0, result.length - seperator.length);
		return result.replace(new RegExp(seperator + "$"), "");
	}, 
	
	/**
	 * @method	length
	 * 
	 * @return	<Number>
	 */
	length: function(target/*:Object*/)/*:Number*/ {
		
		var result/*:Number*/ = 0;
		
		redmon.Object.forEach(target, function() {
			
			result++;
			
		});
		
		return result;
		
	}, 
	
	/**
	 * @method	merge
	 * 
	 * @return	<Object>
	 */
	merge: function(target/*:Object*/, newData/*:Object*/, exclude/*:RegExp|String*/, include/*:RegExp|String*/)/*:Object*/ {
		
		var excludeList/*:RegExp*/ = typeof exclude === "string" ? new RegExp(exclude) : exclude, 
			includeList/*:RegExp*/ = typeof include === "string" ? new RegExp(include) : include, 
			exResult/*:Boolean*/ = false, 
			inResult/*:Boolean*/ = false;
		
		redmon.Object.forEach(newData, function(name/*:String*/, value/*:Object*/, list/*:Object*/) {
			
			exResult = excludeList === null ? false : exclude === undefined ? false : excludeList.test(name);
			inResult = includeList === null ? false : include === undefined ? true : includeList.test(name);
			
			if (!exResult && inResult) {
				
				redmon.Object.set(target, name, value);
				
			}
			
		});
		
		return target;
		
	},
	
	/**
	 * @method	remove
	 * 
	 */
	remove: function(target/*:Object*/, name/*:String*/)/*:Object*/ {
		
		
		delete target[name];
		
		return target;
		
	}, 
	
	/**
	 * @method	set
	 * 
	 */
	set: function(target/*:Object*/, name/*:String*/, value/*:Object*/)/*:Object*/ {
		
		target[name] = value;
		
		return target;
		
	}
	
};

/**
 * String
 */
redmon.String.replaceVars = function(target/*:String*/, vars/*:Object*/, delimiter/*:String*/) {
	
	var result/*:String*/ = target;
	
	redmon.Object.forEach(vars, function(property/*:String*/, value/*:Object*/, list/*:Object*/) {
		
		result = result.replace(new RegExp("\{" + property + "\}", "g"), redmon.typeOf(value) === "object" ? redmon.Object.join(value, delimiter) : String(value));
		
	});
	
	//return result.replace(/\{.*\}/g, "");
	return result.replace(/\{[\w\d\$\@]*\}/g, "");
	
};

/**
 * @method	Capabilities
 */
redmon.Class({
	
	$package: "system.Capabilities", 
	
	$protected: true, 
	
	$constructor: function Capabilities() {
		
		
		
	}, 
	
	$prototype: {
		
	}
	
});

/**
 * Add static properties to the Capabilities class if it exists.
 */
if (redmon.hasFeature("system.Capabilities")) {
	
	redmon.system.Capabilities.MODE_LOCAL = 0;
	redmon.system.Capabilities.MODE_LOCALHOST = 1;
	redmon.system.Capabilities.MODE_WEBSERVER = 2;
	redmon.system.Capabilities.MODE_LOCAL_TEXT = "local";
	redmon.system.Capabilities.MODE_LOCALHOST_TEXT = "localhost";
	redmon.system.Capabilities.MODE_WEBSERVER_TEXT = "webserver";
	
	/**
	 * @method	mode
	 *
	 * @description	Verifies that the browser is making its requests 
	 * 				from a local or web server file system.
	 * 
	 * @return	<Object>
	 */
	redmon.system.Capabilities.mode = function() {
		
		var location/*:String*/ = window.location;
		
		if ((/^http:\/\/localhost|^http:\/\/127.0.0.1/i).test(location)) {
			
			return {status: this.MODE_LOCALHOST, text: this.MODE_LOCALHOST_TEXT};
			
		} else if ((/^http/i).test(location)) {
			
			return {status: this.MODE_WEBSERVER, text: this.MODE_WEBSERVER_TEXT};
			
		} else {
			
			return {status: this.MODE_LOCAL, text: this.MODE_LOCAL_TEXT};
			
		}
		
	};
	
	redmon.system.Capabilities.online = navigator.onLine;
	
}

/**
 * @method	EventManager
 */
redmon.Class({
	
	$package: "events.EventManager", 
	
	$protected: true, 
	
	$constructor: function EventManager()/*:void*/ {
		
		
		
	}, 
	
	$prototype: {
		
	}
	
});

/**
 * @method	Event
 */
redmon.Class({
	
	$package: "events.Event", 
	
	$protected: true, 
	
	$constructor: function Event(source/*:Object*/)/*:void*/ {
		
		this.currentTarget = null;
		this.target = null;
		this.type = "event";
		
		!source || redmon.Object.merge(this, source);
		/*
		if (source) {
			
			for (var i in source) {
				this[i] = source[i];
			}
			
		}
		*/
	}, 
	
	$prototype: {
		
		$protected: {
			
			template: true, 
			toString: true
			
		}, 
		
		template: "{className} [{content}]", 
		
		/**
		 * @method	toString
		 * 
		 * @return	<String>
		 */
		toString: function()/*:String*/ {
			
			return this.template.replace(/\{className\}/g, this.constructor.name).replace(/\{content\}/g, redmon.Object.join(this, " ")).replace(/\{.*\}/g, "");
			
		}
		
	}
	
});

/**
 * Add static properties to the Event class if it exists.
 */
if (redmon.hasFeature("events.Event")) {
	
	redmon.events.Event.ABORT = "abort";
	redmon.events.Event.BLUR = "blur";
	redmon.events.Event.CANCEL = "cancel";
	redmon.events.Event.CHANGE = "change";
	redmon.events.Event.CLOSE = "close";
	redmon.events.Event.COMPLETE = "complete";
	redmon.events.Event.ERROR = "error";
	redmon.events.Event.FOCUS = "focus";
	redmon.events.Event.LOAD = "load";
	redmon.events.Event.OPEN = "open";
	redmon.events.Event.PROGRESS = "progress";
	redmon.events.Event.RESET = "reset";
	redmon.events.Event.RESIZE = "resize";
	redmon.events.Event.SCROll = "scroll";
	redmon.events.Event.START = "start";
	redmon.events.Event.STOP = "stop";
	redmon.events.Event.UNLOAD = "unload";
	
}

/**
 * @method	ErrorEvent
 */
redmon.Class({
	
	$package: "events.ErrorEvent", 
	
	$protected: true, 
	
	$constructor: function ErrorEvent(source/*:Object*/)/*:void*/ {
		
		this.type = redmon.events.Event.ERROR;
		
		//!source || redmon.Object.merge(this, source, "QueryInterface|initialize|filename|lineNumber|columnNumber|location|inner|data");
		!source || redmon.Object.merge(this, source, null, "description|message|name");
		
	}, 
	
	$prototype: {
		
		$override: {
			
			template: true
			
		}, 
		
		template: "{name} Error: {message}"
		//"Error: Incorrect number of parameters for method addEventListener. Requires 2 and received " + arguments.length + "."
	}
	
});

/**
 * Add static properties to the ErrorEvent class if it exists.
 */
if (redmon.hasFeature("events.ErrorEvent")) {
	
	redmon.events.ErrorEvent[1000] = "Range";
	
}

/**
 * @method	FormEvent
 */
redmon.Class({
	
	$package: "events.FormEvent", 
	
	$extends: redmon.events.Event, 
	
	$protected: true, 
	
	$constructor: function FormEvent(source/*:Object*/)/*:void*/ {
		
		this.__super__();
		
		!source || redmon.Object.merge(this, source);
		
	}, 
	
	$prototype: {
		
		className: "FormEvent"
		
	}
	
});

/**
 * Add static properties to the FormEvent class if it exists.
 */
if (redmon.hasFeature("events.FormEvent")) {
	
	redmon.events.FormEvent.RESET = "reset";
	redmon.events.FormEvent.SUBMIT = "submit";
	
}

/**
 * @method	MouseEvent
 */
redmon.Class({
	
	$package: "events.MouseEvent", 
	
	$extends: redmon.events.Event, 
	
	$protected: true, 
	
	$constructor: function MouseEvent(source/*:Object*/)/*:void*/ {
		
		this.__super__(source);
		
		//!source || redmon.Object.merge(this, source);
		
	}, 
	
	$prototype: {
		
	}
	
});

/**
 * Add static properties to the MouseEvent class if it exists.
 */
if (redmon.hasFeature("events.MouseEvent")) {
	
	redmon.events.MouseEvent.CLICK = "click";
	redmon.events.MouseEvent.MOUSE_DOWN = "mousedown";
	redmon.events.MouseEvent.MOUSE_DRAG = "mousedrag";
	redmon.events.MouseEvent.MOUSE_MOVE = "mousemove";
	redmon.events.MouseEvent.MOUSE_OVER = "mouseover";
	redmon.events.MouseEvent.MOUSE_OUT = "mouseout";
	redmon.events.MouseEvent.MOUSE_UP = "mouseup";
	
}

/**
 * @method	RequestEvent
 */
redmon.Class({
	
	$package: "events.RequestEvent", 
	
	$constructor: function RequestEvent() {
		
		
		
	}, 
	
	$prototype: {
		
	}
	
});

if (redmon.hasFeature("events.RequestEvent")) {
	
	/**
	 * The object has been constructed. 
	 */
	redmon.events.RequestEvent.UNSENT = 0;
	
	/**
	 * The open() method has been successfully invoked. 
	 * During this state request headers can be set using setRequestHeader() and 
	 * the request can be made using the send() method.
	 */
	redmon.events.RequestEvent.OPENED = 1;
	
	/**
	 * All HTTP headers have been received. 
	 * Several response members of the object are now available.
	 */
	redmon.events.RequestEvent.HEADERS_RECEIVED = 2;
	
	/**
	 * The response entity body is being received. 
	 */
	redmon.events.RequestEvent.LOADING = 3;
	
	/**
	 * The data transfer has been completed or 
	 * something went wrong during the transfer.
	 */
	redmon.events.RequestEvent.DONE = 4;
	
	/**
	 * Used with XMLHttpRequest/Microsoft.XMLHTTP 
	 * to get the ready state integer(0 - 4).
	 */
	redmon.events.RequestEvent.READY_STATE = "readyState";
	
	/**
	 * Used with XMLHttpRequest/Microsoft.XMLHTTP 
	 * to get standard http status codes(1XX - 5XX).
	 */
	redmon.events.RequestEvent.HTTP_STATUS = "status";
	
	/**
	 * Used with XMLHttpRequest/Microsoft.XMLHTTP 
	 * to get the text representation of the http status codes.
	 */
	redmon.events.RequestEvent.HTTP_STATUS_TEXT = "statusText";
	
}

/**
 * @method	LoaderEvent
 */
redmon.Class({
	
	$package: "events.LoaderEvent", 
	
	$constructor: function LoaderEvent() {
		
		//this.__super__();
		
		//!source || redmon.Object.merge(this, source);
		
	}, 
	
	$prototype: {
		
	}
	
});

/**
 * Add static properties to the LoaderEvent class if it exists.
 */
if (redmon.hasFeature("events.LoaderEvent")) {
	
	redmon.events.LoaderEvent.HTTP_STATUS = "httpStatus";
	redmon.events.LoaderEvent.HTTP_STATUS_ERROR = "httpStatusError";
	redmon.events.LoaderEvent.HTTP_STATUS_REDIRECT = "httpStatusRedirect";
	
}

/**
 * @method	TimelineEvent
 */
redmon.Class({
	
	$package: "events.TimelineEvent", 
	
	$extends: redmon.events.Event, 
	
	$protected: true, 
	
	$constructor: function TimelineEvent(source/*:Object*/)/*:void*/ {
		
		this.time = 0;
		this.position = 0;
		
		this.__super__(source);
		
		//!source || redmon.Object.merge(this, source);
		
	}, 
	
	$prototype: {
		
	}
	
});

/**
 * Add static properties to the TimelineEvent class if it exists.
 */
if (redmon.hasFeature("events.TimelineEvent")) {
	
	//redmon.events.TimelineEvent.CHANGE = "change";
	//redmon.events.TimelineEvent.COMPLETE = "complete";
	redmon.events.TimelineEvent.LOOP = "loop";
	redmon.events.TimelineEvent.PLAY = "play";
	redmon.events.TimelineEvent.PAUSE = "pause";
	//redmon.events.TimelineEvent.RESET = "reset";
	redmon.events.TimelineEvent.RESUME = "resume";
	redmon.events.TimelineEvent.REWIND = "rewind";
	//redmon.events.TimelineEvent.START = "start";
	//redmon.events.TimelineEvent.STOP = "stop";
	
}

/**
 * @method	EventDispatcher
 * 
 * @description	Used to add/remove event listeners from objects. 
 * 				This object attempts to add similar listener functionality as DOM elements. 
 * 				Since it's applied to individual objects that don't have parent, child relationships, 
 * 				there is no bubble/capture feature at this time.
 * 				This is not to be used for DOM elements such as <code>window</code>, 
 * 				<code>body</code>, <code>div</code>, etc.
 */
redmon.Class({
	
	$package: "events.EventDispatcher", 
	
	$protected: true, 
	
	$constructor: function EventDispatcher() {
		
		this._queue = {};
		
	}, 
	
	$prototype: {
		
		$protected: {
			
			_queue: true, 
			dispatchEventQueue: true, 
			dispatchEvent: true, 
			addEventListener: true, 
			hasEventListener: true, 
			removeEventListener: true, 
			removeEventListeners: true
			
		}, 
		
		/**
		 * _queue	<Object>
		 * 
		 * @usage	_queue.__event__load = [handler1, handler2];
		 */
		_queue: {}, 
		
		/**
		 * @method	addEventListener
		 * 
		 * @param	type		<String>
		 * @param	listener	<Function>
		 */
		addEventListener: function(type/*:String*/, listener/*:Function*/)/*:void*/ {
			
			if (arguments.length < 2) {
				
				throw new Error("Incorrect number of parameters for method addEventListener. Requires 2 and received " + arguments.length + ".");
				
			}
			
			if (redmon.isNaF(listener) && listener.call === undefined) {
				
				throw new Error("Method addEventListener requires that the parameter 'listener' be a function.");
				
			}
			
			var queueEventName/*:String*/ = "__event__" + type;
			
			if (this._queue[queueEventName] === undefined) {
				
				this._queue[queueEventName] = [];
				
			}
			
			this._queue[queueEventName].push(listener);
			
		}, 
		
		/**
		 * @method	dispatchEvent
		 * 
		 * @param	evt		<Object>
		 * 
		 * @return			<Boolean>
		 */
		dispatchEvent: function(evt/*:Object*/)/*:Boolean*/ {
			
			if (evt.type === undefined) {
				
				throw new Error("Method dispatchEvent requires that the Event object contain a type(complete, open, error, etc.).");
				
			}
			
			if (evt.target === undefined) {
				
				evt.target = this;
				
			}
			
			this.dispatchEventQueue(this, evt);
			
		}, 
		
		/**
		 * @method	dispatchEventQueue
		 * 
		 * @param	target	<Object>
		 * @param	evt		<Object>
		 */
		dispatchEventQueue: function(target/*:Object*/, evt/*:Object*/)/*:void*/ {
			
			var queueEventName/*:String*/ = "__event__" + evt.type;
			
			if (this._queue[queueEventName] !== undefined) {
				
				for (var index/*:Number*/ = 0, len/*:Number*/ = this._queue[queueEventName].length; index < len; index++) {
					
					var listener/*:Function*/ = this._queue[queueEventName][index];
					
					listener.call(target, evt);
					//listener.call(null, evt);
					
				}
				
			}
			
		}, 
		
		/**
		 * @method	hasEventListener
		 * 
		 * @param	type		<String>
		 * @param	listener	<Function>
		 * 
		 * @return				<Number>
		 */
		hasEventListener: function(type/*:String*/, listener/*:Function*/)/*:Number*/ {
			
			if (arguments.length < 2) {
				
				throw new Error("Incorrect number of parameters for method hasEventListener. Requires 2 and received " + arguments.length + ".");
				
			}
			
			if (redmon.isNaF(listener)) {
				
				throw new Error("Method hasEventListener requires that the parameter 'listener' be a function.");
				
			}
			
			var queueEventName/*:String*/ = "__event__" + type;
			var result/*:Number*/ = -1;
			
			if (this._queue[queueEventName] !== undefined) {
				
				for (var index/*:Number*/ = 0, len/*:Number*/ = this._queue[queueEventName].length; index < len; index++) {
					
					if (this._queue[queueEventName][index] === listener) {
						
						result = index;
						break;
						
					}
					
				}
				
			}
			
			return result;
			
		}, 
		
		/**
		 * @method	removeEventListener
		 * 
		 * @param	type		<String>
		 * @param	listener	<Function>
		 */
		removeEventListener: function(type/*:String*/, listener/*:Function*/)/*:void*/ {
			
			if (arguments.length < 2) {
				
				throw new Error("Incorrect number of parameters for method removeEventListener. Requires 2 and received " + arguments.length + ".");
				
			}
			
			if (redmon.isNaF(listener)) {
				
				throw new Error("Method removeEventListener requires that the parameter 'listener' be a function.");
				
			}
			
			var queueEventName/*:String*/ = "__event__" + type;
			var listenerIndex/*:Number*/ = this.hasEventListener(type, listener);
			
			if (listenerIndex !== -1) {
				
				this._queue[queueEventName].splice(listenerIndex, 1);
				
			}
			
		}, 
		
		removeAllEventListeners: function() {
			
			this._queue = {};
			
		}
		
	}
	
});

redmon.Class({
	
	$package: "utils.Timer", 
	
	$extends: redmon.events.EventDispatcher, 
	
	$protected: true, 
	
	$constructor: function Timer(delay/*:Number*/, repeatCount/*:Number*/) {
		
		this.__super__();
		
		this._timeout = 0;
		this.currentCount = 0;
		this.delay = delay;
		this.repeatCount = repeatCount;
		this.running = false;
		
	}, 
	
	$prototype: {
		
		$override: {
			
			toString: true
			
		}, 
		
		/**
		 * @private
		 * _timeout	<Number>
		 * 
		 */
		_timeout: 0, 
		
		/**
		 * currentCount	<Number>
		 * 
		 * @description	Number of times the timer has been fired.
		 */
		currentCount: 0, 
		
		/**
		 * delay	<Number>
		 * 
		 * @description	Number of milliseconds between timer fires.
		 */
		delay: 0, 
		
		/**
		 * repeatCount	<Number>
		 * 
		 * @description	Number of times the timer should fire.
		 */
		repeatCount: 0, 
		
		/**
		 * running	<Boolean>
		 * 
		 * @description	Current state of the timer, true if running, otherwise false.
		 */
		running: false, 
		
		/**
		 * @method	reset
		 * 
		 */
		reset: function() {
			
			if (this.running) {
				
				this.stop();
				
			}
			
			this.currentCount = 0;
			
			this.dispatchEvent(new redmon.events.TimelineEvent({
				currentTarget: this, 
				target: this, 
				time: this.delay * this.currentCount, 
				position: this.currentCount, 
				type: redmon.events.TimelineEvent.RESET
			}));
			
		}, 
		
		/**
		 * @method	start
		 * 
		 */
		start: function() {
			
			this.running = true;
			
			this.dispatchEvent(new redmon.events.TimelineEvent({
				currentTarget: this, 
				target: this, 
				time: this.delay * this.currentCount, 
				position: this.currentCount, 
				type: redmon.events.TimelineEvent.START
			}));
			
			var TimerInstance/*:Timer*/ = this;
			this._timeout = window.setTimeout(function() {
				
				TimerInstance._trigger.apply(TimerInstance);
				
			}, this.delay);
			
		}, 
		
		/**
		 * @method	stop
		 * 
		 */
		stop: function() {
			
			window.clearTimeout(this._timeout);
			
			this.running = false;
			
			this.dispatchEvent(new redmon.events.TimelineEvent({
				currentTarget: this, 
				target: this, 
				time: this.delay * this.currentCount, 
				position: this.currentCount, 
				type: redmon.events.TimelineEvent.STOP
			}));
			
		}, 
		
		/**
		 * @private
		 * @method	_trigger
		 */
		_trigger: function() {
			
			var TimerInstance/*:Timer*/ = this;
			
			if (TimerInstance.running) {
				
				if (TimerInstance.currentCount === 0) {
					
					TimerInstance.currentCount++;
					
				}
				
				TimerInstance.dispatchEvent(new redmon.events.TimelineEvent({
					currentTarget: TimerInstance, 
					target: TimerInstance, 
					time: TimerInstance.delay * TimerInstance.currentCount, 
					position: TimerInstance.currentCount, 
					type: redmon.events.TimelineEvent.CHANGE
				}));
				
				if (TimerInstance.currentCount === TimerInstance.repeatCount) {
					
					TimerInstance.dispatchEvent(new redmon.events.TimelineEvent({
						currentTarget: TimerInstance, 
						target: TimerInstance, 
						time: TimerInstance.delay * TimerInstance.currentCount, 
						position: TimerInstance.currentCount, 
						type: redmon.events.TimelineEvent.COMPLETE
					}));
					
				} else {
					
					TimerInstance.currentCount++;
					
					TimerInstance._timeout = window.setTimeout(function() {
						
						TimerInstance._trigger.apply(TimerInstance);
						
					}, TimerInstance.delay);
					
				}
				
			}
			
		}
		
	}
	
});

/**
 * @method	URIQuery
 */
redmon.Class({
	
	$package: "net.URIQuery", 
	
	$protected: true, 
	
	$constructor: function URIQuery(source/*:String*/) {
		
		!source || this.decode(source);
		
	}, 
	
	$prototype: {
		
		/**
		 * @method	decode
		 * 
		 * @param	source	<String>
		 * 
		 * @see 'URI scheme' for more information.
		 */
		decode: function(source/*:String*/)/*:void*/ {
			
			if (typeof source !== "string") {
				
				throw new Error("Method decode requires that the parameter 'source' be a string.");
				
			}
			
			var param = null, 
				params = [], 
				query = "";
				
			//scheme = source.match(/\w+:/);
			
			// Find query identifier, then replace all '+' with a space.
			query = window.decodeURI(source.substring(source.indexOf("?") + 1, source.length).replace(/\+/g, " "));
			
			if ((/[\w=]+\&/).test(query)) {
				
				params = query.split("&");
				
			} else if ((/[\w=]+\;/).test(query)) {
				
				params = query.split(";");
				
			}  else {
				
				params.push(query);
				
			}
			
			for (var index = 0, len = params.length; index < len; index++) {
				
				param = params[index].replace(/^\s|\s$/g, "").split("=");
				
				if (param.length === 2) {
					this[param[0]] = (/~/g).test(param[1]) ? param[1].split("~") : param[1];
				}
				
			}
			
		}, 
		
		/**
		 * @method	encode
		 * 
		 * @param	source	<String [optional]>
		 */
		encode: function(source/*:String*/)/*:void*/ {
			
			var result = source === undefined ? this.toString() : window.encodeURI(source.replace(/\s/g, "+").replace(/\,/g, "~"));
			
			if (source !== undefined && typeof source !== "string") {
				
				throw new Error("Method encode requires that the parameter 'source' be a string.");
				
			}
			
			return result;
			
		}, 
		
		/**
		 * @method	length
		 * 
		 * @return	<Number>
		 */
		length: function()/*:Number*/ {
			
			return redmon.Object.length(this);
			
		}, 
		
		/**
		 * @method	toString
		 * 
		 * @return	<String>
		 */
		toString: function()/*:String*/ {
			
			return this.encode(redmon.Object.join(this, "&"));
			
		}
		
	}
	
});

/**
 * @method	Cookie
 */
redmon.Class({
	
	$package: "net.Cookie", 
	
	$extends: redmon.net.URIQuery, 
	
	$protected: true, 
	
	$constructor: function Cookie() {
		
		this.__super__(document.cookie);
		
	}, 
	
	$prototype: {
		
		setExpDate: function (source/*Object*/) {
			
			var date = new Date();
			
			if (source && 
				(typeof source.days === "number" && 
				 typeof source.hours === "number" && 
				 typeof source.hours === "number")) {
				
				date.setDate(date.getDate() + parseInt(source.days));
				date.setHours(date.getHours() + parseInt(source.hours));
				date.setMinutes(date.getMinutes() + parseInt(source.minutes));
				/*
				var delay = (source.days * 24 * 60 * 60 * 1000) + (source.hours * 60 * 60 * 1000) + (source.minutes * 60 * 1000), 
					timer = new redmon.utils.Timer(delay, 1), 
					thisInstance = this;
					
				timer.addEventListener(redmon.events.TimelineEvent.COMPLETE, function(evt) {
					
					thisInstance.remove("*");
					thisInstance.decode(document.cookie);
					
				});
				
				timer.start();
				*/
			} else {
				
				date.setDate(date.getDate() + 1);
				
			}
			
			return date.toGMTString();
			
		}, 
		
		remove: function(name/*String*/, path/*String*/, domain/*String*/) {
			
			if (this[name]) {
				
				delete this[name];
				
				var _expires = "; expires=Thu, 01-Jan-70 00:00:01 GMT", 
					_path = path ? "; path=" + path : "", 
					_domain = domain ? "; domain=" + domain : "";
				
				document.cookie = "".concat(name, "=", _expires, _path, _domain);
				
			} else if (name === "*") {
				
				this.decode(document.cookie);
				
				redmon.Object.forEach(this, function(property, value, list) {
					
					list.remove(property, path, domain);
					
				});
				
			}
			
		},
		
		set: function(name/*String*/, value/*String*/, expires/*Object*/, path/*String*/, domain/*String*/, secure/*String*/) {
			
			if (!name) {
				
				throw new Error("Method set requires name parameter.");
				
			}
			
			var _value = this[name] && !value ? this[name] : value, 
				_expires = expires ? "; expires=" + this.setExpDate(expires) : "", 
				_path = path ? "; path=" + path : "", 
				_domain = domain ? "; domain=" + domain : "", 
				_secure = secure ? "; secure" : "";
			
			if (!_value) {
				
				throw new Error("Method set requires value parameter.");
				
			}
			
			document.cookie = "".concat(name, "=", this.encode(_value.toString()), _expires, _path, _domain, _secure);
			
			this.decode("".concat(name, "=", _value));
			
		}, 
		
		/**
		 * @method	toString
		 * 
		 * @return	<String>
		 */
		toString: function()/*:String*/ {
			
			return this.encode(redmon.Object.join(this, "; ")).replace(/\;\+/g, "; ");
			
		}
		
	}
	
});

/**
 * @method	Request
 */
redmon.Class({
	
	$package: "net.Request", 
	
	$protected: true, 
	
	$constructor: function Request(uri/*:String*/)/*:void*/ {
		
		if (arguments.length < 1) {
			
			throw new Error("Incorrect number of parameters for constructor Request. Requires 1 and received " + arguments.length + ".");
			
		}
		
		if (typeof uri !== "string") {
			
			throw new Error("Constructor Request requires that the parameter 'uri' be a string.");
			
		}
		
		this.uri = uri;
		
	}, 
	
	$prototype: {
		
		contentType: "text/plain", 
		data: {length: 0}, 
		method: "GET", 
		requestHeaders: [], 
		uri: "", 
		async: true
		
	}
	
});

/**
 * @method	RequestHeaders
 */
redmon.Class({
	
	$package: "net.RequestHeaders", 
	
	$protected: true, 
	
	$constructor: function RequestHeaders(name/*:String*/, value/*:String*/)/*:void*/ {
		
		if (arguments.length < 2) {
			
			throw new Error("Incorrect number of parameters for constructor RequestHeaders. Requires 2 and received " + arguments.length + ".");
			
		}
		
		if (typeof name !== "string" || typeof value !== "string") {
			
			throw new Error("Constructor RequestHeaders requires that the parameters 'name' and 'value' be a string.");
			
		}
		
		this.name = name;
		this.value = value;
		
	}, 
	
	$prototype: {
		
		name: "", 
		value: "", 
		
		/**
		 * @method	toString
		 * 
		 * @return	<String>
		 */
		toString: function()/*:String*/ {
			
			return "[RequestHeaders ".concat(this.name, "=", this.value, "]");
			
		}
		
	}
	
});

/**
 * @method	LoaderDataFormat
 */
redmon.Class({
	
	$package: "net.LoaderDataFormat", 
	
	$protected: true, 
	
	$constructor: function LoaderDataFormat()/*:void*/ {
		
	}, 
	
	$prototype: {
		
		
		
	}
	
});

/**
 * Add static properties to the LoaderDataFormat class if it exists.
 */
if (redmon.hasFeature("net.LoaderDataFormat")) {
	
	redmon.net.LoaderDataFormat.BINARY = "binary";
	redmon.net.LoaderDataFormat.JSON = "json";
	redmon.net.LoaderDataFormat.TEXT = "text";
	redmon.net.LoaderDataFormat.VARIABLES = "variables";
	redmon.net.LoaderDataFormat.XML = "xml";
	
}

/**
 * @method	Loader
 */
redmon.Class({
	
	$package: "net.Loader", 
	
	$extends: redmon.events.EventDispatcher, 
	
	$protected: true, 
	
	$constructor: function Loader(request/*Request*/)/*:void*/ {
		
		this.__super__();
		
		if (request instanceof redmon.net.Request) {
			
			this.load(request);
			
		}
		
	}, 
	
	$prototype: {
		
		$override: {
			
			toString: true
			
		}, 
		
		data: null, 
		dataFormat: "text", 
		mode: null, 
		refreshInterval: 0, 
		request: null,
		httpRequest: null, 
		
		/**
		 * @method	close
		 */
		close: function()/*:void*/ {
			
			if (this.httpRequest !== null) {
				
				delete this.httpRequest.onreadystatechange;
				this.httpRequest.abort();
				this.httpRequest = null;
				
			}
			
			this.dispatchEvent(new redmon.events.Event({
				currentTarget: this, 
				target: this.data, 
				type: redmon.events.Event.CLOSE
			}));
			
		}, 
		
		
		/**
		 * @method	getXMLHttpRequest
		 * 
		 * @return	<XMLHttpRequest>
		 */
		getXMLHttpRequest: function()/*:XMLHttpRequest*/ {
			
			var result/*:XMLHttpRequest*/;
			
			if (window.ActiveXObject) {
				
				try {
					
					result = new ActiveXObject("Msxml2.XMLHTTP.6.0");
					//result = new ActiveXObject("Msxml2.DOMDocument.6.0");
					
				} catch (error) {
					
					try {
						
						//result = new ActiveXObject("Microsoft.XMLHTTP");
						//result = new ActiveXObject("Msxml2.DOMDocument.3.0");
						result = new ActiveXObject("Msxml2.XMLHTTP.3.0");
						
					} catch (error) {
						
						this.dispatchEvent(new redmon.events.Event({
							currentTarget: this, 
							error: new redmon.events.ErrorEvent(error), 
							type: redmon.events.Event.ERROR
						}));
						
					}
					
				}
				
			} else {
				
				try {
					
					result = new XMLHttpRequest();
					
				} catch (error) {
					
					this.dispatchEvent(new redmon.events.Event({
						currentTarget: this, 
						error: new redmon.events.ErrorEvent(error), 
						type: redmon.events.Event.ERROR
					}));
					
				}
				
			}
			
			return result;
			
		}, 
		
		/**
		 * @method	load
		 * 
		 * @param	request	<Request>
		 */
		load: function(request/*:Request*/)/*:void*/ {
			
			if (this.httpRequest !== null) {
				
				this.close();
				
			}
			
			if (request instanceof redmon.net.Request) {
				
				this.request = request;
				
			} else if (this.request === null && (request === undefined || !(request instanceof redmon.net.Request))) {
				
				//TODO: Add error.
				
			}
			
			if (this.mode === null) {
				
				this.mode/*:Object*/ = redmon.system.Capabilities.mode();
				
			}
			
			var LoaderInstance/*:Loader*/ = this, 
				message/*:String*/ = this.request.method === "POST" ? this.request.data.toString() : null, 
				uri/*:String*/ = this.request.method === "POST" ? this.request.uri.concat("?", this.request.data.toString()) : this.request.uri;
			
			//	Try to create XMLHttpRequest object
			this.httpRequest = this.getXMLHttpRequest();
			
			// Listen for state change
			this.httpRequest.onreadystatechange = function() {
				
				LoaderInstance.readystatechange(LoaderInstance.httpRequest);
				
			};
			
			/**
			 * @param	<String>	method (GET, POST, HEAD, PUT, DELETE, OPTIONS, etc.)
			 * @param	<String>	url (http://www.site.com | file:// | drive(C)://)
			 * @param	<Boolean>	async (defaulted to true)
			 * @param	<String>	username (optional)
			 * @param	<String>	password (optional)
			 */
			try {
				
				//, this.request.user, this.request.password
				this.httpRequest.open(this.request.method, uri, this.request.async);
				
			} catch (error/*:Error*/) {
				
				
				
			}
			
			// Set headers using the Request instance <code>requestHeaders</code> array.
			for (var index/*:Number*/ = 0, len/*:Number*/ = this.request.requestHeaders.length; index < len; index++) {
				
				this.httpRequest.setRequestHeader(this.request.requestHeaders[index].name, this.request.requestHeaders[index].value);
				
			}
			/*
			this.httpRequest.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
			this.httpRequest.setRequestHeader("Content-length", this.request.data.length);
			this.httpRequest.setRequestHeader("Connection", "close");
			*/
			if (this.request["contentType"]) {
				
				this.httpRequest.overrideMimeType(this.request["contentType"]);
				
			}
			
			try {
				
				this.httpRequest.send(message);
				
			} catch (error/*:Error*/) {
				
				this.dispatchEvent(new redmon.events.Event({
					currentTarget: this, 
					error: new redmon.events.ErrorEvent(error), 
					type: redmon.events.Event.ERROR
				}));
				
			}
			
			message = uri = null;
			
		}, 
		
		/**
		 * @method	readystatechange
		 * 
		 * @param	target	<XMLHTTPRequest>
		 */
		readystatechange: function(target/*XMLHTTPRequest*/)/*:void*/ {
			
			var httpStatus/*:Number*/ = 0;
			var httpStatusText/*:String*/ = "";
			
			/**
			 * Dispatches HTTP_STATUS event to listener function once loading begins.
			 */
			if (target[redmon.events.RequestEvent.READY_STATE] >= redmon.events.RequestEvent.LOADING) {
				
				if (this.mode.status > 1) {
					
					httpStatus = target[redmon.events.RequestEvent.HTTP_STATUS];
					httpStatusText = target[redmon.events.RequestEvent.HTTP_STATUS_TEXT];
					
				} else {
					
					httpStatus = this.mode.status;
					httpStatusText = this.mode.text;
					
				}
				
				// Dispatch HTTP_STATUS
				this.dispatchEvent(new redmon.events.Event({
					currentTarget: this, 
					target: this.data, 
					status: httpStatus, 
					statusText: httpStatusText, 
					type: redmon.events.LoaderEvent.HTTP_STATUS
				}));
				
			}
			
			/**
			 * Request has not been sent yet.
			 * @see redmon.events.RequestEvent.UNSENT
			 */
			if (target[redmon.events.RequestEvent.READY_STATE] === redmon.events.RequestEvent.UNSENT) {
				
				
				
			} 
			/**
			 * Request has been opened.
			 * @see redmon.events.RequestEvent.OPENED
			 */
			else if (target[redmon.events.RequestEvent.READY_STATE] === redmon.events.RequestEvent.OPENED) {
				
				// Dispatch OPEN
				this.dispatchEvent(new redmon.events.Event({
					currentTarget: this, 
					target: this.data, 
					type: redmon.events.Event.OPEN
				}));
				
			} 
			/**
			 * Request HEADERS_RECEIVED.
			 * @see redmon.events.RequestEvent.HEADERS_RECEIVED
			 */
			else if (target[redmon.events.RequestEvent.READY_STATE] === redmon.events.RequestEvent.HEADERS_RECEIVED) {
				
				
				
			} 
			/**
			 * Request is currently loading.
			 * @see redmon.events.RequestEvent.LOADING
			 */
			else if (target[redmon.events.RequestEvent.READY_STATE] === redmon.events.RequestEvent.LOADING) {
				
				
				
			} 
			/**
			 * Request is done.
			 * @see redmon.events.RequestEvent.DONE
			 */
			else if (target[redmon.events.RequestEvent.READY_STATE] === redmon.events.RequestEvent.DONE) {
				
				
				httpStatus = target[redmon.events.RequestEvent.HTTP_STATUS];
				httpStatusText = target[redmon.events.RequestEvent.HTTP_STATUS_TEXT];
				
				// http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html
				if (httpStatus < 200 && httpStatus > 0) {
					
					// informational
					
				} else if (httpStatus < 300 || this.mode.status < 2) {
					
					// successful
					
					if (this.dataFormat === redmon.net.LoaderDataFormat.BINARY) {
						
						this.data = target.responseBody;
						
					} else if (this.dataFormat === redmon.net.LoaderDataFormat.JSON) {
						//TODO: Add conversion to json
						this.data = target.responseText;
						
					} else if (this.dataFormat === redmon.net.LoaderDataFormat.TEXT) {
						
						this.data = target.responseText;
						
					} else if (this.dataFormat === redmon.net.LoaderDataFormat.VARIABLES) {
						
						this.data = new redmon.net.URIQuery(target.responseText);
						
					} else if (this.dataFormat === redmon.net.LoaderDataFormat.XML) {
						
						var dom/*DOMElement*/ = target.responseXML === null || !target.responseXML.hasChildNodes() ? target.responseText : target.responseXML;
						
						this.data = new redmon.Node(dom.documentElement);
						this.data.processNode();
						
					}
					
					// Dispatch COMPLETE
					this.dispatchEvent(new redmon.events.Event({
						currentTarget: this, 
						target: this.data, 
						type: redmon.events.Event.COMPLETE
					}));
					
				} else if (httpStatus > 400 && httpStatus < 500) {
					
					// redirection
					this.data = target.responseText;
					
					// Dispatch HTTP_STATUS_REDIRECT
					this.dispatchEvent(new redmon.events.Event({
						currentTarget: this, 
						target: this.data, 
						status: httpStatus, 
						statusText: httpStatusText, 
						type: redmon.events.LoaderEvent.HTTP_STATUS_REDIRECT
					}));
					
				} else if (httpStatus > 500 && httpStatus < 600) {
					
					// clientError || serverError
					this.data = target.responseText;
					
					// Dispatch HTTP_STATUS_ERROR
					this.dispatchEvent(new redmon.events.Event({
						currentTarget: this, 
						target: this.data, 
						status: target[redmon.events.RequestEvent.HTTP_STATUS], 
						statusText: target[redmon.events.RequestEvent.HTTP_STATUS_TEXT], 
						type: redmon.events.LoaderEvent.HTTP_STATUS_ERROR
					}));
					
				}
				
			}
			
		}, 
		
		/**
		 * @method	refresh
		 * 
		 * @param	interval	<Number>	[optional] The time in milliseconds between calls to the load method.
		 */
		refresh: function(interval/*:Number*/)/*:void*/ {
			
			clearInterval(this.refreshInterval);
			
			var LoaderInstance = this;
			
			if (!isNaN(interval)) {
				// TODO: Replace with Timer class.
				this.refreshInterval = setInterval(function() {
					LoaderInstance.load(LoaderInstance.request);
				}, interval);
				
			} else {
				
				this.load(this.request);
				
			}
				
		}, 
		
		/**
		 * @method	removeRefresh
		 * 
		 * @description	Stops the refresh interval that calls the load method.
		 */
		removeRefresh: function()/*:void*/ {
			
			window.clearInterval(this.refreshInterval);
			
		}
		
	}
	
});

redmon.URI = new redmon.net.URIQuery(window.location.toString());
