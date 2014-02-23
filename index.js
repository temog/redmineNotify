$(function(){

	$("#moveConfig").click(function(){

		chrome.runtime.getBackgroundPage(function(bg){

			bg.viewConfig();
		});

	});

});

