var myStr = navigator.appVersion;
var myBrow = new String();
var Platform = new String();
myBrow = navigator.appName;
ie = (document.all) ? true : false;
var Release = parseFloat(myStr);
with (document) {
 if (ie) {
  // Get current release number from version string
  // extracting the first 3 chars. from string (e.g. "3.0")
  idx = myStr.indexOf("(")+1;
  idx1 = myStr.indexOf(";");
  idx2 = myStr.indexOf(";",idx1+1);  
  // Get platform type
  idx3 = myStr.indexOf(";",idx2+1);
  var Platform = myStr.substring(idx2+1,idx3);

 }
 else {
  idx = myStr.indexOf("(")+1;
  idx1 = myStr.indexOf(";");
  // Get platform type
  var Platform = myStr.substring(idx,idx1);    
 }
 //writeln('Name is '+myBrow.bold()+'<br>');
 //writeln('Release is <b>'+Release+'</b><br>');
 //writeln('Platform is '+Platform.bold());
}
