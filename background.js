var _production = true;
var _account = undefined;
var _indexWindow = undefined;
var _term = 300000;

var _auth = {
	url: undefined,
	id: undefined,
	password: undefined,
	basicId: undefined,
	basicPassword: undefined,
	authToken: undefined
};

var _tickets = {};
var _notify = {};


chrome.app.runtime.onLaunched.addListener(function(){

	chrome.app.window.create('index.html', {
		bounds: {
			width:300,
			height:130
		},
		frame: 'none'
	}, function(appWindow){
		_indexWindow = appWindow;
	});

	chrome.storage.sync.get('account', function(obj) {

		log(obj);

		if(Object.keys(obj).length){

			_account = obj.account;

			ticketCheckStart();
			return;
		}

		viewConfig();
	});
});

function init(){

	_tickets = {};
	_notify = {};
	chrome.storage.sync.set({'myTicket': {}});
}

function viewConfig(){

	chrome.app.window.create('config.html', {
		bounds: {
			width:400,
			height:220
		}
	});
}

function ticketCheckStart(){

	// load config + check start
	chrome.storage.sync.get('account', function(obj) {

		if(! Object.keys(obj).length){

			viewConfig();

			return;
		}

		_auth = obj.account;

		// check start
		getAuthToken();
	});

	// event setting
	chrome.notifications.onClosed.addListener(function(notifyId, byUser){

		log('onclosed notifyId ' + notifyId);
		log('onclosed byUser ' + byUser);
	});

	chrome.notifications.onClicked.addListener(function(notifyId){

		viewTicket(notifyId);
	});

	chrome.notifications.onPermissionLevelChanged.addListener(function(permLevel){

		log('onPermissionLevelChanged ' + permLevel);
	});

	chrome.notifications.onButtonClicked.addListener(function(notifyId, btnId){

		// 通知OFF
		if(btnId == 1){

			chrome.storage.sync.get('myTicket', function(obj) {

				obj.myTicket[notifyId].nonNotify = true;
				chrome.storage.sync.set({'myTicket': obj.myTicket});
			});

			return;
		}

		log(btnId);
		log(_notify[notifyId]);
		viewTicket(notifyId);
	});

}

function viewTicket(notifyId){

	// storageのidを最新に
	chrome.storage.sync.get('myTicket', function(obj) {

		obj.myTicket[notifyId].id = _notify[notifyId].id;
		chrome.storage.sync.set({'myTicket': obj.myTicket});
	});

	chrome.app.window.create('view.html', {
		'bounds': {
			'width': 800,
			'height': 500
		}
	}, function(createWindow){

		createWindow.contentWindow._url = _notify[notifyId].url;
		createWindow.contentWindow._account = _account;

	});
}


function getAuthToken(){


	var url = _auth.url + '/login';

	var param = {
		type: 'GET',
		dataType: 'html',
		url: url,
		success: function(html){

			// すでにログイン済み(302 で redirectされた)
			if($(html).find("a[href='/logout']").length){
				getMyPage();
				return;
			}

			_auth.authToken = $(html).find("form[action='/login'] [name='authenticity_token']").val();
			getLoginPage();
		},
		error: function(e, status){
		}
	};

	if(_auth.basicId){
		param.username = _auth.basicId;
		param.password = _auth.basicPassword;
	}

	$.ajax(param);



}

function getLoginPage(){

	var param = {
		type: 'POST',
		dataType: 'html',
		url: _auth.url + '/login',
		data: {
			username: _auth.id,
			password: _auth.password,
			authenticity_token: _auth.authToken
		},
		success: function(html){

			log(html);
			if(! $(html).find("a[href='/logout']").length){
				message('ログインに失敗しました(´・ω・`)');
				return;
			}

			getMyPage();
		},
		error: function(e, status){
		}
	};

	if(_auth.basicId){
		param.username = _auth.basicId;
		param.password = _auth.basicPassword;
	}

	$.ajax(param);
}


//	/my/page
function getMyPage(){

	setTimeout(function(){
		_indexWindow.close();
	}, 5000);

	var param = {
		type: 'GET',
		dataType: 'html',
		url: _auth.url + '/my/page',
		success: function(html){

			log(html);

			// 各チケットを開く
			var tickets = $(html).find("a[href^='/issues/']");

			var t = [];
			tickets.each(function(){

				var ticket = $(this).attr("href");
				if(t.indexOf(ticket) > -1){
					return true;
				}

				t.push(ticket);
			});

			log(t);

			getTicketRecursive(t);
		},
		error: function(e, status){
		}
	};

	if(_auth.basicId){
		param.username = _auth.basicId;
		param.password = _auth.basicPassword;
	}

	$.ajax(param);

	setTimeout(function(){
		getMyPage();
	}, _term);
}

function getTicketRecursive(tickets){

	if(! tickets.length){
		return;
	}

	log(tickets);

	var url = tickets[0];

	var param = {
		type: 'GET',
		dataType: 'html',
		url: _auth.url + url,
		success: function(url, html){

			var title = $(html).find('#header h1').html() + ' - ' +
				$(html).find('#content .subject h3').html();

			var lastUpdate = {
				user: undefined,
				content: undefined 
			};

			var lastId = $(html).find('.journal-link').last().html();
			if(lastId){
				lastId = parseInt(lastId.replace('#',''));
				lastUpdate.user = $(html).find('.journal').last().find('.user').html();
				lastUpdate.content = $(html).find('.journal').last().find('.wiki').text();
			}
			else {
				lastId = 0;
			}

			_tickets[url] = {
				id: lastId,
				title: title,
				lastUpdate: lastUpdate
			};

			if(tickets.length > 1){

				tickets.splice(0, 1);
				getTicketRecursive(tickets);
				return;
			}

			checkUpdate();

			log('tikcet走査おしまい');
		}.bind(undefined, url),
		error: function(e, status){
		}
	};

	if(_auth.basicId){
		param.username = _auth.basicId;
		param.password = _auth.basicPassword;
	}

	$.ajax(param);
}

function checkUpdate(){

	chrome.storage.sync.get('myTicket', function(obj) {

		if(! obj.hasOwnProperty('myTicket')){
			obj = {myTicket: {}};
		}

		log(obj.myTicket);

		for(var i in _tickets){


			if(! obj.myTicket.hasOwnProperty(i)){

				/*
				if(_tickets[i].id){
					notify(i, _tickets[i]);
				}
				// 初チェック＋0なときだけ設定
				else {
					obj.myTicket[i] = 0;
				}
				*/

				// todo
				obj.myTicket[i] = {
					id: _tickets[i].id,
					nonNotify: false
				};

				// 新規チケットのみ通知
				if(! _tickets[i].id){
					notify(i, _tickets[i]);
				}
			}
			else {

				// 更新されたら通知OFF解除
				if(_tickets[i].id > obj.myTicket[i].id){
					obj.myTicket[i].nonNotify = false;
				}

				if(! obj.myTicket[i].nonNotify && ! _tickets[i].id ||
						! obj.myTicket[i].nonNotify &&
						obj.myTicket[i].id < _tickets[i].id){

					notify(i, _tickets[i]);
				}
			}
		}

		chrome.storage.sync.set({'myTicket': obj.myTicket});
	});
}

function notify(url, ticket){

	log('notify!!!');
	log(ticket);

	// id設定とリンク先セット
	_notify[url] = {
		id: ticket.id,
		url: _auth.url + url
	};

	log(_notify[url]);

	chrome.notifications.clear(url, function(){

		log('hoge');

		var buttons = [{title: _notify[url].url}];
		if(! ticket.id){
			buttons.push({title: '通知OFF'});
		}

		chrome.notifications.create(url, {
			type : "basic",
			title: ticket.title,
			message: ticket.lastUpdate.content?
				ticket.lastUpdate.content : '新規チケット',
			//expandedMessage: "Longer part of the message",
			iconUrl: 'notify.png',
			priority: 2,
			buttons: buttons
		}, function(result){

			log(result);

		});
	});

}

function message(message){

	chrome.notifications.create('error', {
		type : "basic",
		title: "Error",
		message: message,
		iconUrl: 'notify.png',
		priority: 2
	}, function(result){
	});
}


function log(obj){

	if(_production){
		return;
	}

	console.log(obj);
}
