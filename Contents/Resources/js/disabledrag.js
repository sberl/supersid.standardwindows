function disableImages(){
			
	imgs = document.getElementsByTagName('img');
	links = document.getElementsByTagName('a');
	
	for (i = 0; i < imgs.length; i++) {
		imgs[i].onmousedown = disableDragging;
		//alert("image " + imgs[i]);
	}
	
	for(j = 0; j < links.length; j++){
		links[j].onmousedown = disableDragging;
		//alert("link " + links[j]);
	}
	
}

function disableDragging(e) {
	e.draggable = false;
	return false;
}