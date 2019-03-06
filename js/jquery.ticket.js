(function($){
	
	function user(data){
		this.IsAuthenticated = false;
		this.FName = "";
		this.LName = "";
		this.Email = "";
		this.ClientID = 0;
		
		if (data){
			this.IsAuthenticated = true;
			this.FName = data.FName;
			this.LName = data.LName;
			this.Email = data.PrimaryEmail || data.Email;
			this.ClientID = data.ClientID;
		}
	}
	
	function ticket(){
		var self = this;
		
		this.user = null;
		this.ajaxUrl = null;
		
		this.getUserInfo = function(callback){
			if (typeof callback != 'function')
				callback = function(success){console.log(success);};
			
			var cb = function(flag){
				if (typeof callback == 'function')
					callback(flag);
			}
			
			$.ajax({
				'url': 'ajax.aspx?command=user-check',
				'type': 'GET',
				'dataType': 'json'
			}).done(function(data, textStatus, jqXHR){
				self.user = new user(data);
				cb(true);
			}).fail(function(jqXHR, textStatus, errorThrown){
				if (jqXHR.status == 401){
					self.user = new user();
					cb(true);
				}else{
					self.user = null;
					cb(false);
				}
			});
		}
		
		this.getTicketDetail = function(ticketID, callback){
			if (typeof callback != 'function')
				callback = function(result){console.log(result);};
			if (self.ajaxUrl){
				self.getUserInfo(function(success){
					if (success){
						if (self.user.IsAuthenticated){
							var name = self.user.FName + ' ' + self.user.LName;
							var email = self.user.Email;
							$.ajax({
								url: self.ajaxUrl,
								type: 'POST',
								dataType: 'json',
								data: { 'command': 'ticket-detail', 'ticketID': ticketID },
								success: function (data) {
									if (!data.error){
										data.display_name = name;
										data.email = email;
										callback(data);
									}
									else
										callback({'error':data.message});
								},
								error: function (err) {
									callback({'error':err.statusText});
								}
							});
						}
						else
							callback({'error': 'You must be logged into LNF Online Services to view this ticket.'});
					}
					else
						callback({'error': 'An error occurred while retrieving user information.'});
				});
			}
			else
				callback({'error': '$.ticket.ajaxUrl is undefined'});
		}
		
		this.postMessage = function(ticketID, message, source, callback){
			if (typeof callback != 'function')
				callback = function(result){console.log(result);};
			if (self.ajaxUrl){
				self.getUserInfo(function(success){
					if (success){
						if (self.user.IsAuthenticated){
							var name = self.user.FName+' '+self.user.LName;
							var email = self.user.Email;
							var s = (source) ? " from "+source : "";
							var n = " by "+name;
							n += (email) ? " ("+email+")" : "";
							message = "Posted"+s+n+"\r\n--------------------------------------------------\r\n"+message;
							$.ajax({
								url: self.ajaxUrl,
								type: 'POST',
								dataType: 'json',
								data: { 'command': 'post-message', 'ticketID': ticketID, 'message': message },
								success: function (data) {
									if (!data.error){
										data.display_name = name;
										data.email = email;
										callback(data);
									}
									else
										callback({'error':data.message});
								},
								error: function (err) {
									callback({'error':err.statusText});
								}
							});
						}
						else
							callback({'error': 'You must be logged into LNF Online Services to post a message.'});
					}
					else
						callback({'error': 'An error occurred while retrieving user information.'});
				});
			}
			else
				callback({'error': '$.ticket.ajaxUrl is undefined'});
		}
		
		this.formatDate = function (date, format) {
			var result = '';
			
			var getNumeric = function(val){
				if (val){
					if (isNaN(val)) return 0;
					return parseInt(val);
				}
				return 0;
			}
			
			var getAmpm = function(val){
				switch(val){
					case "am":
					case "pm":
						return val;
					default:
						return "";
				}
			}
			
			if (!date) return result;
			
			var parts = date.split(' ');
			var datePart = (parts.length > 0) ? parts[0] : "";
			var timePart = (parts.length > 1) ? parts[1] : "";
			var ampmPart = (parts.length > 2) ? getAmpm(parts[2]) : "";

			var dateSplitter = datePart.split("-");
			var yy = 0;
			var mm = 0;
			var dd = 0;
			if (dateSplitter.length == 3){
				yy = getNumeric(dateSplitter[0]);
				mm = getNumeric(dateSplitter[1]);
				dd = getNumeric(dateSplitter[2]);
			}
			else{
				dateSplitter = datePart.split("/");
				if (dateSplitter.length == 3){
					yy = getNumeric(dateSplitter[2]);
					mm = getNumeric(dateSplitter[0]);
					dd = getNumeric(dateSplitter[1]);
				}
				else
					return "Invalid date";
			}
			
			var hh = 0;
			var mi = 0;
			var ss = 0;
			var hasTime = false;
			if (timePart){
				var timeSplitter = timePart.split(':');
				if (timeSplitter.length > 0){
					hh = getNumeric(timeSplitter[0]);
					if (timeSplitter.length > 1)
						mi = getNumeric(timeSplitter[1]);
					if (timeSplitter.length > 2)
						ss = getNumeric(timeSplitter[2]);
					hasTime = true;
				}
			}
			
			var d = new Date(yy, mm - 1, dd, hh, mi, ss);

			switch (format) {
				case "long":
					var dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
					var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
					result = dayNames[d.getDay()] + ', '
						+ monthNames[d.getMonth()] + ' '
						+ d.getDate() + ' '
						+ d.getFullYear();
					break;
				default:
					result = (d.getMonth() + 101).toString().substr(1) + '/'
						+ (d.getDate() + 100).toString().substr(1) + '/'
						+ d.getFullYear();
					break;
			}

			if (hasTime){
				var ampm = d.getHours() >= 12 ? "pm" : (ampmPart) ? ampmPart : "am";
				var hour = d.getHours() > 12 ? d.getHours() - 12 : d.getHours();
				if (hour == 0) hour = 12;
				result += ' ' + hour + ':'
					+ (d.getMinutes() + 100).toString().substr(1) + " "
					+ ampm;
			}
			return result;
		}
		
		this.createLinks = function(text){
			var exp= /\(?\b(https?|ftp|file):\/\/[-A-Za-z0-9+&@#\/%?=~_()|!:,.;]*[-A-Za-z0-9+&@#\/%=~_()|]/ig;
			var matches = text.match(exp);
			if ($.isArray(matches)){
				$.each(matches, function(i, m){
					if (m.substr(0, 1) == "(" && m.substr(m.length - 1) == ")")
						m = m.substr(1, m.length - 2);
					text = text.replace(m, '<a href="'+m+'" target="_blank">'+m+'</a>');
				});
			}
			return text;
		}
			
		var parseQuery = function(){
			var result = {};
			var search = window.location.search;
			if (search == null || search.length == 0)
				return result;
			if (search.indexOf('?') != -1)
				search = search.substr(1);
			var splitter = search.split('&');
			$.each(splitter, function (index, value) {
				var pair = value.split('=');
				result[pair[0]] = pair[1];
			});
			return result;
		}
		
		this.query = parseQuery();
	}

	$.ticket = new ticket();

	$.fn.ticket = function(options){			
		return this.each(function(){
			var $this = $(this);
			
			var opt = $.extend({}, {"source": $this.data("source"), "ticketID": $this.data("ticketID"), "onload": function(ticket){}}, options);
			$this.data("source", opt.source);
			$this.data("ticketID", opt.ticketID);
			
			var loadError = function (err) {
				$this.html('<div style="color: #ff0000">'+err+"</div>");
			}

			var getHeader = function () {
				return $('<div class="header"/>')
					.append($("<img/>").attr("src", "/ostclient/images/lnf-logo.png").attr("alt", "LNF Logo"))
					.append($("<img/>").attr("src", "/ostclient/images/helpdesk-logo.jpg").attr("alt", "Helpdesk Logo"))
			}

			var getInfoTablePart1 = function (info) {
				return $('<div class="section"/>').append(
					$('<table class="info-table"/>').append(
						$('<tr/>').append(
							$('<td style="width: 100px;"><strong>Status:</strong></td>')
						).append(
							$('<td/>').html(info.status)
						).append(
							$('<td style="width: 100px;"><strong>Name:</strong></td>')
						).append(
							$('<td/>').html(info.name)
						)
					).append(
						$('<tr/>').append(
							$('<td><strong>Priority:</strong></td>')
						).append(
							$('<td/>').html(info.priority)
						).append(
							$('<td><strong>Email:</strong></td>')
						).append(
							$('<td/>').html(info.email)
						)
					).append(
						$('<tr/>').append(
							$('<td><strong>Department:</strong></td>')
						).append(
							$('<td/>').html(info.dept_name)
						).append(
							$('<td><strong>Phone:</strong></td>')
						).append(
							$('<td/>').html(info.phone)
						)
					).append(
						$('<tr/>').append(
							$('<td><strong>Created Date:</strong></td>')
						).append(
							$('<td/>').html($.ticket.formatDate(info.created))
						).append(
							$('<td><strong>Source:</strong></td>')
						).append(
							$('<td/>').html(info.source)
						)
					)
				);
			}

			var getInfoTablePart2 = function (info) {
				return $('<div class="section"/>').append(
					$('<table class="info-table"/>').append(
						$('<tr/>').append(
							$('<td style="width: 100px;"><strong>Assigned Staff:</strong></td>')
						).append(
							$('<td/>').html(info.assigned_name)
						).append(
							$('<td style="width: 100px;"><strong>Help Topic:</strong></td>')
						).append(
							$('<td/>').html(info.help_topic)
						)
					).append(
						$('<tr/>').append(
							$('<td><strong>Last Response:</strong></td>')
						).append(
							$('<td/>').html($.ticket.formatDate(info.last_response))
						).append(
							$('<td><strong>IP Address:</strong></td>')
						).append(
							$('<td/>').html(info.ip_address)
						)
					).append(
						$('<tr/>').append(
							$('<td><strong>Due Date:</strong></td>')
						).append(
							$('<td/>').html(info.due_date)
						).append(
							$('<td><strong>Last Message:</strong></td>')
						).append(
							$('<td/>').html($.ticket.formatDate(info.last_message))
						)
					)
				);
			}

			var getInfo = function (data) {
				if (data.detail.info.ticketID){
					return $('<div class="info"/>')
						.append($('<h1/>').html('Ticket #' + data.detail.info.ticketID))
						.append(getInfoTablePart1(data.detail.info))
						.append($('<h1/>').html('Subject: ' + data.detail.info.subject))
						.append(getInfoTablePart2(data.detail.info));
				}
				else{
					return $('<div class="info"/>')
						.append($('<h1/>').css({"color": "#ff0000"}).html("Ticket #"+opt.ticketID+" not found"))
				}
			}

			var getThread = function (data) {
				if (!data.detail.info.ticketID) return;
				var result = $('<div class="thread"/>')
					.append($('<h1/>').html('Ticket Thread'))
				$.each(data.detail.messages, function (x, msg) {
					result.append(
						$('<table class="message-table"/>').append(
							$('<tr/>').append(
								$('<td class="message-header"/>').html($.ticket.formatDate(msg.created, 'long'))
							)
						).append(
							$('<tr/>').append(
								$('<td class="message-content"/>').html($.ticket.createLinks(msg.message.replace(/\n/g, '<br />')))
							)
						)
					);
					$.each(data.detail.responses, function (y, resp) {
						if (resp.msg_id == msg.msg_id) {
							result.append(
								$('<table class="response-table"/>').append(
									$('<tr/>').append(
										$('<td class="response-header"/>').html($.ticket.formatDate(resp.created, 'long'))
									)
								).append(
									$('<tr/>').append(
										$('<td class="response-content"/>').html(resp.response.replace(/\n/g, '<br />'))
									)
								)
							);
						}
					});
				});
				return result;
			}

			var getForm = function (data) {
				if (!data.detail.info.ticketID) return;
				return $('<div class="form"/>').append(
					$('<div/>').html('Name')
				).append(
					$('<div/>').append($('<input type="text" class="new-message-name" style="width: 200px;" readonly />').attr('value', data.display_name))
				).append(
					$('<div/>').html('Email<span style="color: #ff0000;">*</span>')
				).append(
					$('<div/>').append($('<input type="text" class="new-message-email" style="width: 200px;" readonly />').attr('value', data.email))
				).append(
					$('<div/>').html('Message<span style="color: #ff0000;">*</span>')
				).append(
					$('<div/>').html('<textarea rows="5" cols="5" class="new-message-text" style="width: 600px;" />')
				).append(
					$('<div style="padding-top: 10px;"/>').append(
						$('<input type="button" value="Post Reply" class="post-button" />').click(function (event) {
							var button = $(this);
							$('.new-message-error').html('');
							var message = $('.new-message-text', $this).val();
							if (message == '')
								$('.new-message-error', $this).html('<div style="color: #ff0000">Please enter a message.</div>');
							else {
								button.hide();
								$('.new-message-working', $this).show();
								$.ticket.postMessage(data.detail.info.ticketID, message, opt.source, function (result) {
									$('.new-message-working', $this).hide();
									button.show();
									if (result.error)
										loadError(result.error);
									else
										fill(result);
								});
							}
						})
					).append(
						$('<div class="new-message-working" style="color: #808080; font-style: italic; display: none;" />').append(
							$('<img src="/common/images/ajax-loader-2.gif" alt="" />')
						).append(
							'Posting message...'
						)
					).append(
						$('<div class="new-message-error"/>')
					)
				);
			}

			var fill = function (data) {
				$this.html(
					$('<div class="container"/>')
						.append(getHeader())
						.append(getInfo(data))
						.append(getThread(data))
						.append(getForm(data))
				);
				opt.onload(data);
			}

			var loadTicketDetail = function (ticketID) {
				$.ticket.getTicketDetail(ticketID, function(result){
					if (result.error)
						loadError(result.error);
					else
						fill(result);
				});
			}
			
			if ($.ticket.ajaxUrl){
				if (opt.ticketID)
					loadTicketDetail(opt.ticketID);
				else
					loadError('Missing parameter: ticketID');
			}
			else
				loadError('$.ticket.ajaxUrl is undefined');
		});
	}
}(jQuery));