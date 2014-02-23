$(function(){

	var url = _account.url + "/login?back_url=" + encodeURIComponent(_url);

	$("#webview").attr("src", url);

	var wv = document.getElementById('webview');
	wv.addEventListener('loadstop', autoLogin);
});


// ログインしてなければログイン、してたらチケットURLへ遷移
function autoLogin(){

	var code = "if(document.querySelector('a.login')){ " +
		"document.getElementById('username').value = '" +
		_account.id + "';" +
		"document.getElementById('password').value = '" +
		_account.password + "';" +
		"document.forms[1].submit(); } else {" +
		"location.href = '" + _url + "'; }";

	var wv = document.getElementById('webview');

	wv.removeEventListener('loadstop', autoLogin);
	wv.executeScript({code: code});
}
