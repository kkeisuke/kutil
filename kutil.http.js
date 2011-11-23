/**
 * @fileoverview HTTP の制御に関する kutil プラグイン
 */

(function(win){
	
	/**
	 * クロスブラウザ XMLHttpRequest クラス
	 */
	function XHReq(){
		
		this._reqs = [
			
			function(){ return new XMLHttpRequest(); },
			function(){ return new ActiveXObject("Msxml2.XMLHTTP.6.0"); },
			function(){ return new ActiveXObject("Msxml2.XMLHTTP.3.0"); },
			function(){ return new ActiveXObject("Msxml2.XMLHTTP"); },
			function(){ return new ActiveXObject("Microsoft.XMLHTTP"); }
		]; 
		
		this._emptyFunc = function(){}
	}
	
	XHReq.prototype = {
		
		_createRequest:function(){
			
			var reqs = this._reqs;
			var num = reqs.length;
			var req;
			for (var i=0; i<num; i++) {
				
				try{
					
					req = reqs[i]();
					
					if(req != null){ return req; }
				}
				catch(e){
					
					continue;
				}
			}
			
			throw new Error("XMLHttpRequest not supported");
		},
		_parseHeader:function(req){
			
			var headerText = req.getAllResponseHeaders();
			var headers = {};
			var ls = /^\s*/;
			var ts = /\s*$/;
			
			var lines = headerText.split("\n");
			var num = lines.length;
			
			var line;
			var pos;
			var name;
			var value;
			for (var i=0; i<num; i++) {
				
				line = lines[i];
				if(line.length === 0){ continue; }
				
				pos = line.indexOf(":");
				name = line.substring(0, pos).replace(ls, "").replace(ts, "");
				value = line.substring(pos+1).replace(ls, "").replace(ts, "");
				
				headers[name] = value;
			}
			
			return headers;
		},
		_getResponse:function(req){
			
			switch(req.getResponseHeader("Content-Type")) {
				
				case "text/xml":
					
					return req.responseXML;
					
				/* case "text/json":
				case "text/javascript":
				case "application/javascript":
				case "application/x-javascript": */
				default:
					
					return req.responseText;
			}
		},
		_encodeFormData:function(data){
			
			var pairs = [];
			var regex = /%20/g;
			
			var value;
			var pair;
			for(var name in data){
				
				value = data[name]+"";
				pair = encodeURIComponent(name).replace(regex, "+") + "=" + encodeURIComponent(value).replace(regex, "+");
				
				pairs[pairs.length] = pair;
			}
			
			// TODO 配列に格納されている文字列を、ループで一個ずつ取り出し、文字列に追加するやり方をするんだったら、Array.join("") 使うべき?
			return pairs.join("&");
		},
		/**
		 * 指定された URL のヘッダを取得する
		 * @param {String} url
		 * @param {Function} success イベントハンドラ関数
		 * @param {Function} error イベントハンドラ関数
		 */
		getHeaders:function(url, success, error){
			
			var req = this._createRequest();
			var scope = this;
			
			if(req != null && success != null){
				
				req.onreadystatechange = function(){
					
					if (req.readyState === 4) {
						
						if (req.status === 200) {
							
							success(scope._parseHeader(req));
						}
						else{
							
							if (error != null) {
								
								error(req.status, req.statusText);
							}
							else{
								
								success(null);
							}
						}
						
						req.onreadystatechange = scope._emptyFunc;
					}
				}
				
				req.open("HEAD", url);
				req.send(null);
			}
		},
		/**
		 * HTTP POST リスクエストを、指定された URL に送信する
		 * @param {String} url
		 * @param {Object} values リクエストボディ
		 * @param {Object} options オプション(success, error)
		 */
		post:function(url, values, options){
			
			var req = this._createRequest();
			var scope = this;
			
			if (req != null && values != null) {
				
				req.onreadystatechange = function(){
					
					if (req.readyState === 4) {
						
						if (req.status === 200) {
							
							// options.success
							if (options != null && options.success != null) { options.success(scope._getResponse(req)); }
						}
						else{
							
							// options.error, options.success
							if (options != null && options.error != null) { options.error(req.status, req.readyState); }
							else if (options != null && options.success != null) { options.success(null); }
						}
						
						req.onreadystatechange = scope._emptyFunc;
					}
				}
				
				req.open("POST", url);
				req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
				req.send(this._encodeFormData(values));
			}
		},
		/**
		 * HTTP GET リスクエストを、指定された URL に送信する
		 * @param {String} url
		 * @param {Object} options オプション(time, timeout, success, error, progress, params)
		 */
		get:function(url, options){
			
			var req = this._createRequest();
			var scope = this;
			
			if (req != null && options != null) {
				
				var n = 0;
				var timer = null;
				var complete = false;
				
				// options.time
				if(options.time != null){
					
					timer = win.setTimeout(function(){
						
						req.abort();
						
						// options.timeout
						if(!complete && options.timeout != null){
							 
							 options.timeout(url);
							 win.clearTimeout(timer);
						}
						
					}, options.time);
				}
				
				req.onreadystatechange = function(){
					
					if (req.readyState === 4) {
						
						if (timer != null) { win.clearTimeout(timer); }
						
						if (req.status === 200) {
							
							// options.success
							if (options.success != null) { options.success(scope._getResponse(req)); }
						}
						else{
							
							// options.error, options.success
							if (options.error != null) { options.error(req.status, req.readyState); }
							else if (options.success != null) { options.success(null); }
						}
						
						complete = true;
						req.onreadystatechange = scope._emptyFunc;
					}
					// options.progress
					else if(options.progress != null){
						
						options.progress(++n);
					}
				}
				
				var target = url;
				// options.params
				if(options.params != null){ target += "?" + scope._encodeFormData(options.params); }
				
				req.open("GET", target);
				req.send(null);
			}
		}
	};
	
	
	/**
	 * Global に KUtil クラスのインスタンスがあるか。無い場合は追加する。
	 */
	if(win.kutil != null){
		
		win.kutil.prototype.createXHReq = function(){ return new XHReq(); }
	}
	else{
		
		function KUtil () {
			
			this.methods = {};
		}
		
		KUtil.prototype = {
			
			createXHReq:function(){ return new XHReq(); }
		}
		
		win.kutil = new KUtil();
	}
	
})(window)