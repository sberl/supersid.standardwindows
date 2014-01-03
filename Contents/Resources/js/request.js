
if(redmon.URI != "" && redmon.URI.assets){
	
	var imgExp = /\.(gif|jpeg|jpg|png)/, 
		contentType = "text/plain; charset=x-user-defined", 
		requestList = new Array(), 
		request_index = 0;
	
	/**
	 * Format
	 * requestList[0] = {url:"test1.html|txt|gif|jpg|jpeg|png", target: "content_0"};
	 */
	if(typeof redmon.URI.assets === "string"){
		
		requestList.push({ url: redmon.URI.assets, target: "content_0" });
		
	} else {

		for(var asset_index = 0, len = redmon.URI.assets.length; asset_index < len; asset_index++){
			
			requestList.push({ url: redmon.URI.assets[asset_index], target: "content_" + asset_index });
		}
		
	}
	
	/**
	 * Converts string to base64 encoding.
	 */
	var encode64 = function (inputStr) {
		
	   var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
	   var outputStr = "";
	   var i = 0;
	   
	   while (i<inputStr.length)
	   {
		  //all three "& 0xff" added below are there to fix a known bug 
		  //with bytes returned by xhr.responseText
		  var byte1 = inputStr.charCodeAt(i++) & 0xff;
		  var byte2 = inputStr.charCodeAt(i++) & 0xff;
		  var byte3 = inputStr.charCodeAt(i++) & 0xff;

		  var enc1 = byte1 >> 2;
		  var enc2 = ((byte1 & 3) << 4) | (byte2 >> 4);
		  
		  var enc3, enc4;
		  if (isNaN(byte2))
		   {
			enc3 = enc4 = 64;
		   }
		  else
		  {
			enc3 = ((byte2 & 15) << 2) | (byte3 >> 6);
			if (isNaN(byte3))
			  {
			   enc4 = 64;
			  }
			else
			  {
				enc4 = byte3 & 63;
			  }
		  }

		  outputStr +=  b64.charAt(enc1) + b64.charAt(enc2) + b64.charAt(enc3) + b64.charAt(enc4);
	   } 
	   
	   return outputStr;
	   
	}
	
	/**
	 * Adds loaded content into "target".
	 */
	var addContent = function(evt) {
		
		var container = document.getElementById(requestList[request_index].target);
		
		if (container) {
			
			if (evt.type === "error") {
				
				container.innerHTML = "Error loading asset: " + requestList[request_index].url;
				
			} else {
				
				if (imgExp.test(requestList[request_index].url)){
					
					var img = document.createElement("img");
					
					img.src = "data:image/" + (RegExp.$1 == "jpg" ? "jpeg" : RegExp.$1) + ";base64," + encode64(evt.target);
					container.appendChild(img);
					
				} else {
					
					container.innerHTML = evt.target;
					
				}
				
			}
			
		}
		
		if(request_index < requestList.length - 1){
			
			request_index++;
			
			request = new redmon.net.Request(requestList[request_index].url);
			if(imgExp.test(requestList[request_index].url)){
				request.contentType = contentType;
			}
			
			loader.load(request);
			
		}
		
	};
	
	/**
	 * Event handler for "complete". Meaning the file has completely loaded without errors.
	 */
	var loaderComplete = function(evt) {
		addContent(evt);
		
		/*
		 * if the page has completely loaded all draggable content, 
		 * now proceed to remove draggable tag from media.
		 */
		if(disableImages){
			disableImages();
		}
		
	};
	
	/**
	 * Event handler for "error". Meaning that if the XMLHttpRequest object can not 
	 * be instanciated, the file does not exist or some other internal error, then 
	 * this function is called. This does not handle http status errors. 
	 * If you wish to setup an event listener for http status then choose one 
	 * or more of the following:
	 * @see	"httpStatus", "httpStatusError", "httpStatusRedirect"
	 */
	var loaderError = function(evt) {
		addContent(evt);
	};
	
	var request = new redmon.net.Request(requestList[request_index].url);
	if(imgExp.test(requestList[request_index].url)){
		request.contentType = contentType;
	}
	
	var loader = new redmon.net.Loader();
	
	loader.addEventListener(redmon.events.Event.COMPLETE, loaderComplete);
	loader.addEventListener(redmon.events.Event.ERROR, loaderError);
	
	loader.load(request);
	
}