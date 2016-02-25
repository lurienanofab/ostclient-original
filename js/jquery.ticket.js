(function ($) {
    function Ticket(apiurl) {
        var self = this;

        this.user = null;
        this.apiurl = apiurl;

        this.getUserInfo = function (callback) {
            if (typeof callback != 'function')
                callback = function (success) { console.log(success); };
            $.ajax({
                'url': '/login/authcheck',
                'type': 'GET',
                'dataType': 'json',
                'success': function (data) {
                    self.user = data;
                    if (typeof callback == 'function')
                        callback(true);
                },
                'error': function (err) {
                    self.user = null;
                    if (typeof callback == 'function')
                        callback(false);
                }
            });
        }

        this.getTicketDetail = function (ticketID, callback) {
            if (typeof callback != 'function')
                callback = function (result) { console.log(result); };

            if (self.apiurl) {
                self.getUserInfo(function (success) {
                    if (success) {
                        if (self.user.authenticated) {
                            var name = self.user.firstName + ' ' + self.user.lastName;
                            var email = self.user.email;
                            $.ajax({
                                url: self.apiurl,
                                type: 'POST',
                                dataType: 'json',
                                data: { 'command': 'ticket-detail', 'ticketID': ticketID },
                                success: function (data) {
                                    if (!data.error) {
                                        data.display_name = name;
                                        data.email = email;
                                        callback(data);
                                    }
                                    else
                                        callback({ 'error': data.message });
                                },
                                error: function (err) {
                                    callback({ 'error': err.statusText });
                                }
                            });
                        }
                        else
                            callback({ 'error': 'You must be logged into LNF Online Services to view this ticket.' });
                    }
                    else
                        callback({ 'error': 'An error occurred while retrieving user information.' });
                });
            }
            else
                callback({ 'error': 'apiurl is undefined' });
        }

        this.postMessage = function (ticketID, message, source, callback) {
            if (typeof callback != 'function')
                callback = function (result) { console.log(result); };

            if (self.apiurl) {
                self.getUserInfo(function (success) {
                    if (success) {
                        if (self.user.authenticated) {
                            var name = self.user.firstName + ' ' + self.user.lastName;
                            var email = self.user.email;
                            var s = (source) ? " from " + source : "";
                            var n = " by " + name;
                            n += (email) ? " (" + email + ")" : "";
                            message = "Posted" + s + n + "\r\n--------------------------------------------------\r\n" + message;
                            $.ajax({
                                url: self.apiurl,
                                type: 'POST',
                                dataType: 'json',
                                data: { 'command': 'post-message', 'ticketID': ticketID, 'message': message },
                                success: function (data) {
                                    if (!data.error) {
                                        data.display_name = name;
                                        data.email = email;
                                        callback(data);
                                    }
                                    else
                                        callback({ 'error': data.message });
                                },
                                error: function (err) {
                                    callback({ 'error': err.statusText });
                                }
                            });
                        }
                        else
                            callback({ 'error': 'You must be logged into LNF Online Services to post a message.' });
                    }
                    else
                        callback({ 'error': 'An error occurred while retrieving user information.' });
                });
            }
            else
                callback({ 'error': 'apiurl is undefined' });
        }

        this.formatDate = function (date, format) {
            var result = '';

            var getNumeric = function (val) {
                if (val) {
                    if (isNaN(val)) return 0;
                    return parseInt(val);
                }
                return 0;
            }

            var getAmpm = function (val) {
                switch (val) {
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
            if (dateSplitter.length == 3) {
                yy = getNumeric(dateSplitter[0]);
                mm = getNumeric(dateSplitter[1]);
                dd = getNumeric(dateSplitter[2]);
            }
            else {
                dateSplitter = datePart.split("/");
                if (dateSplitter.length == 3) {
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
            if (timePart) {
                var timeSplitter = timePart.split(':');
                if (timeSplitter.length > 0) {
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

            if (hasTime) {
                var ampm = d.getHours() >= 12 ? "pm" : (ampmPart) ? ampmPart : "am";
                var hour = d.getHours() > 12 ? d.getHours() - 12 : d.getHours();
                if (hour == 0) hour = 12;
                result += ' ' + hour + ':'
					+ (d.getMinutes() + 100).toString().substr(1) + " "
					+ ampm;
            }
            return result;
        }

        this.createLinks = function (text) {
            var exp = /\(?\b(https?|ftp|file):\/\/[-A-Za-z0-9+&@#\/%?=~_()|!:,.;]*[-A-Za-z0-9+&@#\/%=~_()|]/ig;
            var matches = text.match(exp);
            if ($.isArray(matches)) {
                $.each(matches, function (i, m) {
                    if (m.substr(0, 1) == "(" && m.substr(m.length - 1) == ")")
                        m = m.substr(1, m.length - 2);
                    text = text.replace(m, '<a href="' + m + '" target="_blank">' + m + '</a>');
                });
            }
            return text;
        }

        var parseQuery = function () {
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



    $.fn.ticket = function (options) {
        return this.each(function () {
            var $this = $(this);

            var opt = $.extend({}, { "apiurl": "api", "source": $this.data("source"), "ticketID": $this.data("ticketID"), "onload": function (ticket) { } }, $this.data(), options);

            var ticket = new Ticket(opt.apiurl);

            $this.data("source", opt.source);
            $this.data("ticketID", opt.ticketID);

            var loadError = function (err) {
                $(".detail-message", $this).html($("<div/>", { "class": "alert alert-danger", "role": "alert" }).html(err));
            }

            var fill = function (data) {
                if (data.detail.info.ticketID) {
                    //**** info
                    $.each(data.detail.info, function (k, v) {
                        $("[data-property='info." + k + "']", $this).each(function () {
                            var target = $(this);
                            var val = v;
                            if (target.data("dateformat") && v)
                                val = moment(v).format(target.data("dateformat"));

                            if (val) target.html(val);
                        });
                    });

                    //**** thread
                    $(".ticket-thread", $this).each(function () {
                        var thread = $(this);
                        $(".ticket-section", thread).html("");
                        $.each(data.detail.messages, function (m, msg) {
                            $(".ticket-section", thread).append(
                                $("<div/>", { "class": "thread-message" }).append(
                                    $("<div/>", { "class": "thread-message-subject" }).html(moment(msg.created).format("ddd, MMM D YYYY h:mm a"))
                                ).append(
                                    $("<div/>", { "class": "thread-message-body" }).html(ticket.createLinks(msg.message.replace(/\n/g, "<br />")))
                                )
                            );
                            $.each(data.detail.responses, function (r, resp) {
                                if (resp.msg_id == msg.msg_id) {
                                    $(".ticket-section", thread).append(
                                        $("<div/>", { "class": "thread-response" }).append(
                                            $("<div/>", { "class": "thread-response-subject" }).html(moment(resp.created).format("ddd, MMM D YYYY h:mm a") + " - " + resp.staff_name)
                                        ).append(
                                            $("<div/>", { "class": "thread-response-body" }).html(ticket.createLinks(resp.response.replace(/\n/g, "<br />")))
                                        )
                                    );
                                }
                            });
                        });
                    });

                    $(".container-fluid", $this).show();
                    $(".detail-message", $this).html("");
                } else {
                    $(".container-fluid", $this).hide();
                    loadError("Ticket #" + opt.ticketID + " not found");
                }

                return;

                $this.html(
					$("<div/>", { "class": "container-fluid" })
						.append(getHeader())
						.append(getInfo(data))
						.append(getThread(data))
						.append(getForm(data))
				);
                opt.onload(data);
            }

            var loadTicketDetail = function (ticketID) {
                $(".detail-message", $this).html($("<em/>").css("color", "#808080").html("Loading..."));

                ticket.getTicketDetail(ticketID, function (result) {
                    if (result.error)
                        loadError(result.error);
                    else
                        fill(result);
                });
            }

            if (opt.apiurl) {
                if (opt.ticketID)
                    loadTicketDetail(opt.ticketID);
                else
                    loadError('Missing parameter: ticketID');
            }
            else
                loadError('apiurl is undefined');

            $this.on("click", ".post-message", function (e) {
                var button = $(this);
                $(".new-message-error").html("");
                var message = $(".new-message-text", $this).val();
                if (message == "")
                    $(".new-message-error", $this).html($("<div/>", { "class": "alert alert-danger", "role": "alert" }).html("Please enter a message."));
                else {
                    button.prop("disabled", true);
                    $('.new-message-working', $this).show();
                    ticket.postMessage(opt.ticketID, message, opt.source, function (result) {
                        $('.new-message-working', $this).hide();
                        button.prop("disabled", false);
                        if (result.error) {
                            loadError(result.error);
                        } else {
                            $(".new-message-text", $this).val("");
                            fill(result);
                        }
                    });
                }
            });
        });
    }
}(jQuery));