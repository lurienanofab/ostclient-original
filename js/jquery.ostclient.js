(function($){
    $.fn.ostclient = function(options, args){
        return this.each(function(){
            var $this = $(this);
            
            var opt = '';
            if (typeof options == 'undefined' || typeof options == 'object')
                opt = $.extend({}, {'url': 'ajax.php'}, options);
            else
                opt = options;
                
            $this.data('url', opt.url);
        
            var getTicketFrom = function(ticket){
                var result = '';
                var name = ticket.name;
                var email = ticket.email;
                if (ticket.name != '')
                    result += ticket.name;
                if (ticket.email != ''){
                    if (result == '')
                        result += ticket.email + '<br />';
                    else
                        result += '<br />&lt;' + ticket.email + '&gt;';
                }
                return result;
            }
            
            var outputTickets = function(tickets){
                var table = $('<table><thead></thead><tbody></tbody></table>');
                var thead = table.find('thead');
                var tbody = table.find('tbody');
                thead.append(
                    $('<tr/>')
                        .append($('<th/>').html('Ticket#'))
                        .append($('<th/>').html('From'))
                        .append($('<th/>').html('Created'))
                        .append($('<th/>').html('Subject'))
                        .append($('<th/>').html('Assigned'))
                        .append($('<th/>').html('Priority'))
                        .append($('<th/>').html('Status'))
                );
                $.each(tickets, function(index, ticket){
                    tbody.append(
                        $('<tr/>')
                            .append($('<td/>').html(ticket.ticketID))
                            .append($('<td/>').html(getTicketFrom(ticket)))
                            .append($('<td/>').html(ticket.created))
                            .append($('<td/>').html(ticket.subject))
                            .append($('<td/>').html(ticket.assigned_to))
                            .append($('<td/>').html(ticket.priority_desc))
                            .append($('<td/>').html(ticket.status))
                    );
                })
                $('.tickets', $this).html(table);
                $('.tickets table', $this).dataTable({'oLanguage': { 'sZeroRecords': 'No tickets were found.' }});
            }
            
            var outputError = function(data){
                var err = $('<div/>').css({'color': '#ff0000'}).html(data.message + ' ['+data.errno+']');
                $('.tickets', $this).html(err);
            }
            
            var selectTicketsByEmail = function(email){
                $.ajax({
                    url: $this.data('url'),
                    type: 'post',
                    data: {command: 'select-tickets-by-email', 'email': email},
                    dataType: 'json',
                    success: function(data){
                        if (!data.error)
                            outputTickets(data.tickets);
                        else
                            outputError(data);
                    },
                    error: function(err){
                        console.log(err);
                    }
                });
            }
            
            var dumpServerVars = function(){
                $.ajax({
                    url: $this.data('url'),
                    type: 'post',
                    data: {command: 'dump-server-vars'},
                    dataType: 'json',
                    success: function(data){
                        var table = $('<table/>');
                        $.each(data, function(k, v){
                            table.append(
                                $('<tr/>').append($('<th/>').html(k).css({'text-align': 'left'})
                            ).append(
                                $('<td/>').html(v))
                            );
                        });
                        $('.tickets', $this).html(table);
                    },
                    error: function(err){
                        console.log(err);
                    }
                });
            }
            
            if (opt == 'selectTicketsByEmail'){
                $('.email', $this).val(args);
                selectTicketsByEmail(args);
            }
            else if (opt == 'dumpServerVars'){
                dumpServerVars();
            }
            else{
                $this.on('click', '.search-by-email', function(event){
                    var email = $('.email', $this).val();
                    selectTicketsByEmail(email);
                }).on('click', '.post-message', function(event){				
                    $.ajax({
                        url: 'ajax.aspx',
                        type: 'POST',
                        data: {'command': 'post-message', 'ticketID': $('.ticket-number').val(), 'message': $('.message').val(), 'name': 'demo', 'email': 'demo@demo.com'},
                        dataType: 'json',
                        success: function(data){
                            console.log(data);
                        },
                        error: function(err){
                            alert(err.statusText);
                        }
                    });
                });
            }
        });
    }
}(jQuery));