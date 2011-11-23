/**
 * @fileoverview ユーティリティクラス群
 */

(function (win) {
	
	/**
	 * onload イベント用クラス
	 */
	function RunOnLoad () {
		
		this._funcs = [];
		this._loaded = false;
		this._init();
	}

	RunOnLoad.prototype = {
		
		_init:function () {
			
			var scope = this;
			
			if (document.addEventListener) { 
				
				document.addEventListener("DOMContentLoaded", function () {
					document.removeEventListener('DOMContentLoaded', arguments.callee, false);	
					scope._run(scope)();
				}, false);
				
			}else if (document.attachEvent) {
				
				document.attachEvent("onreadystatechange", function () {
					if(document.readyState === 'complete'){
						document.detachEvent('onreadystatechange', arguments.callee);
						scope._run(scope)();
					}
				});
				
				if (document.documentElement.doScroll && win == win.top) {
					
					(function(){
						
						if(scope._loaded) { return; }
						
						try {
							
							document.documentElement.doScroll('left');
							
						} catch(e) {
							
							win.setTimeout(arguments.callee, 0);
							return;
						}
						
						scope._run(scope)();
					})();
				}
				
			}else {
				
				win.onload = scope._run(scope);
			}
		},
		/**
		 * オンロードイベントハンドラの追加
		 * @param {Function} f イベントハンドラ関数
		 */
		addListener:function (f) {
			
			if (this._loaded) { f(); }
			else {	this._funcs.push(f); }
		},
		_run:function (runOnLoad) {
			
			return function () {
				
				if(runOnLoad._loaded) { return; }
			
				var num = runOnLoad._funcs.length;
				for (var i=0; i<num; i++) {
					
					try { runOnLoad._funcs[i](); }
					catch (e) {}
				}
				
				runOnLoad._loaded = true;
				delete runOnLoad._funcs;
				delete runOnLoad._run;
			};
		}
	};
	
	
	/**
	 * イベントハンドラ登録クラス
	 */
	function Handler () {
		
		this._counter = 0;
	}
	
	Handler.prototype = {
		
		/**
		 * イベントハンドラの追加
		 * @param {HTMLElement} element 対象となるHTML要素
		 * @param {String} eventType イベントタイプ
		 * @param {Function} handler イベントハンドラ関数
		 */
		add:function (element, eventType, handler) {
			
			if (document.addEventListener) { 
				
				element.addEventListener(eventType, handler, false);
				
			}else if (document.attachEvent) {
				
				if (this._find(element, eventType, handler) != -1) { return; }
				
				/**
				 * イベントのラッパー関数
				 * @param {Event} e
				 */
				var wrappedHandler = function (e) {
					
					if (!e) { e = win.event; }
					
					var event = {
						_event:e,
						type:e.type,
						target:e.srcElement,
						currentTarget:element,
						relatedTarget:e.fromElement ? e.fromElement : e.toElement,
						eventPhase: (e.srcElement == element) ? 2 : 3,
						clientX:e.clientX,
						clientY:e.clientY,
						screenX:e.screenX,
						screenY:e.screenY,
						altKey:e.altKey,
						ctrlKey:e.ctrlKey,
						shiftKey:e.shiftKey,
						charCode:e.keyCode,
						stopPropagation:function () { this._event.cancelBubble = true; },
						preventDefault:function () { this._event.returnValue = false; }
					};
					
					if (Function.prototype.call) {
						
						handler.call(element, event);
						
					}else{
						
						element._currentHander = handler;
						element._currentHander(event);
						element._currentHander = null;
					}
				};
				
				element.attachEvent("on" + eventType, wrappedHandler);
			
				var h = {
					element:element,
					eventType: eventType,
					handler: handler,
					wrappedHandler: wrappedHandler
				};
				
				var d = element.document || element;
				var w = d.parentWindow;
				
				var id = this._uid();
				if (!w._allHandlers) { w._allHandlers = {}; }
				w._allHandlers[id] = h;
				
				if (!element._handlers) { element._handlers = []; }
				element._handlers.push(id);
				
				if (!w._onunloadHandlerRegistered) {
					
					w._onunloadHandlerRegistered = true;
					w.attachEvent("onunload", this._removeAllHandlers);
				}
			}
		},
		/**
		 * イベントハンドラの削除
		 * @param {HTMLElement} element 対象となるHTML要素
		 * @param {String} eventType イベントタイプ
		 * @param {Function} handler イベントハンドラ関数
		 */
		remove:function (element, eventType, handler) {
			
			if (document.addEventListener) { 
				
				element.removeEventListener(eventType, handler, false);
				
			}else if (document.attachEvent) {
				
				var i = this._find(element, eventType, handler);
				if (i == -1) { return; }
				
				var d = element.document || element;
				var w = d.parentWindow;
				
				var handlerId = element._handlers[i];
				var h = w._allHandlers[handlerId];
				
				element.detachEvent("on" + eventType, h.wrappedHandler);
				element._handlers.splice(i, 1);
				
				delete w._allHandlers[handlerId];
			}
		},
		/**
		 * body サイズの取得イベント
		 * @param {Function} handler イベントハンドラ関数
		 */
		bodySize:function(handler){
			
			var _body = win.document.body;
			_body.style.visibility = "hidden";
			
			var id = win.setInterval(function(){
				
				if (_body.offsetWidth != 0 && _body.offsetHeight != 0) {
					
					handler();
					win.clearInterval(id);
					_body.style.visibility = "visible";
				}
				
			}, 20);
		},
		/**
		 * hashchange イベントハンドラの追加
		 * @param {Function} handler イベントハンドラ関数
		 */
		hashchange:function(handler){
			
			if ("onhashchange" in win) {
				
				var loc = win.location;
				
				handler.call(null, loc.hash.replace(/^#/, ''));
				
				this.add(win, "hashchange", function(){
					
					handler.call(null, loc.hash.replace(/^#/, ''));
				});
			}
			else {
				
				var doc = win.document;
				var loc = win.location;
				
				// window
				var lastHash = loc.hash.replace(/^#/, '');
				var nowHash;
				
				// iframe
				var ifr = doc.createElement("iframe");
				ifr.style.display = "none";
				doc.body.appendChild(ifr);
				var ifrwin = ifr.contentWindow;
				var ifrdoc = ifrwin.document;
				var ifrloc = ifrdoc.location;
				var ifrHash;
				
				addIfrHash(lastHash);
				
				handler.call(null, lastHash);
				
				// setInterval で監視。
				win.setInterval(function(){
					
					nowHash = loc.hash.replace(/^#/, '');
					
					// つど document を確認する必要がある。
					ifrdoc = ifrwin.document;
					ifrHash = ifrloc.hash.replace(/^#/, '');
					
					if(nowHash != lastHash){
						
						addIfrHash(nowHash);
						
						handler.call(null, nowHash);
						lastHash = nowHash;
					}
					else if(ifrHash != lastHash){
						
						location.hash = ifrHash;
						
						handler.call(null, ifrHash);
						lastHash = ifrHash;
					}
					
				}, 100);
				
				// iframe に登録
				function addIfrHash(hash){
					
					ifrdoc.open();
					ifrdoc.close();
					ifrloc.hash = hash;
				}
			}
		},
		_find:function (element, eventType, handler) {
			
			var handlers = element._handlers;
			if (!handlers) { return -1; }
			
			var d = element.document || element;
			var w = d.parentWindow;
			
			var num = handlers.length;
			for (var i = num - 1; i >= 0; i--){
				
				var handlerId = handlers[i];
				var h = w._allHandlers[handlerId];
				
				if (h.eventType == eventType && h.handler == handler) { return i; }
			}
			return -1;
		},
		_removeAllHandlers:function () {
			
			var w = this;
			
			for (var id in w._allHandlers) {
				
				if(w._allHandlers.hasOwnProperty(id)){
					
					var h = w._allHandlers[id];
					h.element.detachEvent("on" + h.eventType, h.wrappedHandler);
					
					delete w._allHandlers[id];
				}
			}
		},
		_uid:function () {
			
			return "h" + this._counter++;
		}
	};
	
	
	/**
	 * 要素のクラス名を管理するクラス
	 */
	function ClassUtil () {
		
	}
	
	ClassUtil.prototype = {
		
		/**
		 * 該当のクラス名を持った要素の配列を返す
		 * @param {String} classname クラス名
		 * @param {String} tagname タグ名 指定しなくても可
		 * @param {HTMLElement} root ルートとなるHTML要素 指定しなくても可
		 * @return {Array} 
		 */
		getElementsByClassName:function (classname, tagname, root) {
			
			if (!root) { root = document; }
			else if (typeof root == "String") { root = document.getElementById(root); }
			
			if (!tagname) { tagname = "*"; }
			var all = root.getElementsByTagName(tagname);
			
			if(!classname) { return all; }
			
			var elements = [];
			var num = all.length;
			for (var i=0; i<num; i++) {
				
				var element = all[i];
				if(this.isClass(element, classname)){ elements.push(element); }
			}
			
			return elements;
		},
		/**
		 * 要素 e がクラス c のメンバの場合は true を返す。
		 * @param {HTMLElement} e 対象となるHTML要素
		 * @param {String} c クラス名
		 * @return {Boolean}  
		 */
		isClass:function (e, c) {
		
			if (typeof e == "String") { e = document.getElementById(e); }
			
			var classes = e.className;
			if (!classes) { return false; }
			if (classes == c) { return true; }
			
			return (classes.search("\\b"+c+"\\b") != -1);
		},
		/**
		 * 要素 e にクラス c を追加する
		 * @param {HTMLElement} e 対象となるHTML要素
		 * @param {String} c クラス名
		 */
		addClass:function (e, c) {
			
			if (typeof e == "String") { e = document.getElementById(e); }
			
			if (this.isClass(e,c)) { return; }
			if (e.className) { c = " " + c; }
			e.className += c;
		},
		/**
		 * 要素 e からクラス c を削除する
		 * @param {HTMLElement} e 対象となるHTML要素
		 * @param {String} c クラス名
		 */
		removeClass:function (e, c) {
			
			if (typeof e == "String") { e = document.getElementById(e); }
			
			e.className = e.className.replace(new RegExp("\\b"+c+"\\b\\s*","g"),"");
			e.className = e.className.replace(new RegExp(" $","g"),"");
		}
	};
	
	
	/**
	 *  要素の CSS を管理するクラス
	 */
	function CSSUtil(){
		
		this.support = {
			
			opacity:(function(){
				
				var node = document.createElement("div");
				node.style.cssText = "opacity:.25";
				if (node.style.opacity == "0.25") {
					return true;
				}else{
					return false;
				}
			})()
		};
	}
	
	CSSUtil.prototype = {
		/**
		 * 要素 e からスタイル s を取得する
		 * @param {HTMLElement} e 対象となるHTML要素
		 * @param {String} s スタイル名
		 */
		getCurrentStyle:function(e, s){
			
			if (e.currentStyle) { return e.currentStyle[s]; }
			else if (win.getComputedStyle) { return win.getComputedStyle(e,null)[s]; }
			else { return null; }
		}
	};
	
	/**
	 * CSS のアニメーションを管理するクラス
	 */
	function CSSAnimator () {
		this._easingFunc = {
			// Easing関数を追加することが出来る。
			linear:function(t, b, c, d){ return c*(t/d)+b },
			easeOutCubic:function (t, b, c, d) { return c*((t=t/d-1)*t*t + 1) + b; }
		};
		this._intervalId = null;
	}
	
	CSSAnimator.prototype = {
		/**
		 * CSS のアニメーション
		 * @param {HTMLElement} element 対象となるHTML要素
		 * @param {Object} params パラメータ(単位必須)
		 * @param {Number} time 時間(ミリ秒)
		 * @param {Number} delay 時間(ミリ秒)
		 * @param {String} easing Easing関数
		 * @param {Function} complete 完了した時に呼び出される関数(this は window)
		 */
		addAnimation:function (element, params, time, delay, easing, complete) {
			
			if (this._intervalId) { 
				
				clearInterval(this._intervalId);
				this._intervalId = null;
			}
			
			var begin = +new Date;
			var now = 0;
			var startParams = {};
			var deltas = {};
			var units = {};
			var scope = this;
			var easingF = this._easingFunc[easing];
			var cssUtil = kutil.createCSSUtil();
			var isNotOpacity = !cssUtil.support.opacity;
			
			var eStyle = element.style;
			var cssprops = [];
			var param;
			var paramNum;
			for(var cssprop in params){
				
				if (params.hasOwnProperty(cssprop)) {
					
					cssprops[cssprops.length] = cssprop;
					
					param = params[cssprop] + "";
					paramNum = parseFloat(param);
					
					// style属性を現在値から取得して設定する。
					eStyle[cssprop] = cssUtil.getCurrentStyle(element, cssprop);
					
					startParams[cssprop] = parseFloat(eStyle[cssprop]);
					deltas[cssprop] =  paramNum - startParams[cssprop];
					units[cssprop] = param.replace(paramNum, "");
				}
			}
			var propsNum = cssprops.length;
			
			function displayNextFrame () {
				
				now = +new Date - begin;
				
				var paramName;
				var value;
				for (var i=0; i<propsNum; i++) {
					
					paramName = cssprops[i];
					
					if (deltas[paramName] === 0) {
						
						clearInterval(scope._intervalId);
						scope._intervalId = null;
						return;
					}
					
					value = easingF(now, startParams[paramName], deltas[paramName], time);
					
					if (paramName === "opacity" && isNotOpacity) {
						
						eStyle.filter = "alpha(opacity=" + value * 100 + ")";
					}
					// opacity をサポートしていなくても保持する必要がある。
					eStyle[paramName] = value + units[paramName];
				}
				
				if (now >= time) {
					
					clearInterval(scope._intervalId);
					scope._intervalId = null;
					
					for (var j=0; j<propsNum; j++) {
						
						paramName = cssprops[j];
						
						value = startParams[paramName] + deltas[paramName];
						
						if (paramName === "opacity" && isNotOpacity) {
							
							eStyle.filter = "alpha(opacity=" + value * 100 + ")";
						}
						// opacity をサポートしていなくても保持する必要がある。
						eStyle[paramName] = value + units[paramName];
					}
					
					if (complete) { complete(element); }
					
					return;
				}
			}
			
			win.setTimeout(function(){
				
				scope._intervalId = win.setInterval(displayNextFrame, 13);
				
			}, delay);
		}
	};
	
	
	/**
	 * Global に KUtil クラスのインスタンスを持たせる。
	 */
	function KUtil () {
		
		this.isDebug = true;
		this._isConsole = "console" in win;
		//this.methods = {};
	}
	
	KUtil.prototype = {
		/**
		 * console.log のエラー避け。ない場合はアラート
		 * @param {Object} arg 対象となるオブジェクト
		 */
		log:function(arg){ if(this.isDebug){ this._isConsole ? win.console.log(arg) : win.alert(arg) }; },
		/**
		 * console.dir のエラー避け。ない場合はアラート
		 * @param {Object} arg 対象となるオブジェクト
		 */
		dir:function(arg){ if(this.isDebug){ this._isConsole ? win.console.dir(arg) : win.alert(arg) }; },
		/**
		 * RunOnLoad インスタンスを返す
		 */
		createRunOnLoad:function(){ return new RunOnLoad(); },
		/**
		 * Handler インスタンスを返す
		 */
		createHandler:function(){ return new Handler() },
		/**
		 * ClassUtil インスタンスを返す
		 */
		createClassUtil:function(){ return new ClassUtil() },
		/**
		 * CSSUtil インスタンスを返す
		 */
		createCSSUtil:function(){ return new CSSUtil() },
		/**
		 * CSSAnimator インスタンスを返す
		 */
		createCSSAnimator:function(){ return new CSSAnimator() }
	};
	
	win.kutil = new KUtil();
	
})(window);