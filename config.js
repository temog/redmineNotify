$(function(){

	setSavedValue();

	$("#save").click(function(){
		saveConfig();
	});

	$(".err .close").click(function(){

		$(".err").slideUp("slow");
	});

	$(".success .close").click(function(){

		$(".success").slideUp("slow");
	});

});

function setSavedValue(){

	chrome.storage.sync.get('account', function(obj) {

		if(! Object.keys(obj).length){
			return;
		}

		$("[name='url']").val(obj.account.url);
		$("[name='id']").val(obj.account.id);
		$("[name='password']").val(obj.account.password);
		$("[name='basicId']").val(obj.account.basicId);
		$("[name='basicPassword']").val(obj.account.basicPassword);
	});
}

function saveConfig(){

	var url = $("[name='url']").val();
	var id = $("[name='id']").val();
	var password = $("[name='password']").val();
	var basicId = $("[name='basicId']").val();
	var basicPassword = $("[name='basicPassword']").val();

	var err = '';
	if(! url || ! id || ! password){

		err += '<li>url, id, password is empty</li>';
	}

	if(url.indexOf('http') != 0){
		err += '<li>Please enter from http or https url</li>';
	}

	if(err){
		error(err);
		return;
	}

	if((url.lastIndexOf('/') + 1) == url.length){
		url = url.substr(0, url.lastIndexOf('/'));
	}

	var account = {
		url: url,
		id: id,
		password: password,
		basicId: basicId,
		basicPassword: basicPassword
	}

	chrome.storage.sync.set({'account': account}, function(){

		if(chrome.runtime.lastError != undefined){
			error('config save failed');
			return;
		}

		success('config saved');

		setTimeout(function(){

			chrome.app.window.current().close();

			chrome.runtime.getBackgroundPage(function(bg){

				bg.init();
				bg.ticketCheckStart();
			});
		}, 3000);
	});
}

function error(message){

	$(".err .message").html(message);
	$(".err").slideDown("slow");
}

function success(message){

	$(".success .message").html(message);
	$(".success").slideDown("slow");
}
