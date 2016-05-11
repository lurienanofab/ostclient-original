<%@ Page Language="C#" %>

<%@ Import Namespace="System.Collections.Generic" %>
<%@ Import Namespace="System.Net" %>
<%@ Import Namespace="System.Net.Mail" %>
<%@ Import Namespace="System.IO" %>
<%@ Import Namespace="System.Text" %>
<%@ Import Namespace="System.Web.Script.Serialization" %>

<script runat="server">
	const string API_URL = "https://lnf.umich.edu/helpdesk/api/data-exec.php";

	int? errno = null;
	string error = null;
	string command = null;
    string smtpHost = "mail-relay.itd.umich.edu";

	Dictionary<string, string> keys = new Dictionary<string, string>(){
		{"141.213.8.37", 	"BFCCB07172D97BB934253D0709FEC278"},
		{"141.213.7.201", 	"4399AAE0740BD6A8E0E5CBE66FF056C5"},
		{"192.168.168.200",	"4399AAE0740BD6A8E0E5CBE66FF056C5"},
        {"10.0.0.200",	    "4399AAE0740BD6A8E0E5CBE66FF056C5"},
		{"192.168.1.241",	"4399AAE0740BD6A8E0E5CBE66FF056C5"}
	};

	string getApiKey(){
		string ip = Request.ServerVariables["LOCAL_ADDR"];
		if (keys.ContainsKey(ip))
			return keys[ip];
		else
			throw new Exception("Missing API Key for IP Address: "+ip);
	}

	string apiPost(Dictionary<string, string> data, int timeout = 5000){
		errno = null;
		string content = string.Empty;
		try{
			string postData = string.Empty;
			string amp = string.Empty;
			foreach (KeyValuePair<string, string> kvp in data){
				postData += amp + kvp.Key + "=" + Server.UrlEncode(kvp.Value);
				amp = "&";
			}
			byte[] postBytes = Encoding.UTF8.GetBytes(postData);
			HttpWebRequest req = (HttpWebRequest)WebRequest.Create(API_URL);
			Stream dataStream = null;
			req.Timeout = timeout;
			req.Method = "POST";
			req.ContentType = "application/x-www-form-urlencoded";
			req.ContentLength = postBytes.Length;
			req.UserAgent = getApiKey();
			dataStream = req.GetRequestStream();
			dataStream.Write(postBytes, 0, postBytes.Length);
			dataStream.Close();
			HttpWebResponse resp = (HttpWebResponse)req.GetResponse();
			dataStream = resp.GetResponseStream();
			StreamReader reader = new StreamReader(dataStream);
			content = reader.ReadToEnd();
			reader.Close();
			dataStream.Close();
			resp.Close();
		}
		catch(WebException ex){
			errno = (int)ex.Status;
			error = ex.Message;
		}
		catch(Exception ex){
			errno = 500;
			error = ex.Message;
		}

		if (errno != null)
			throw new Exception(error);
		
		return content;
	}

	string selectTicketsByEmail(string email){	
		string result = apiPost(new Dictionary<string, string>(){
			{"action", command},
			{"email", email},
			{"status", "open"},
			{"format", "json"}
		});	
		return result;
	}

	string selectTicketsByResource(string resource_id){	
		string result = apiPost(new Dictionary<string, string>(){
			{"action", command},
			{"resource_id", resource_id},
			{"status", "open"},
			{"format", "json"}
		});
		return result;
	}

	string dumpServerVars(){
		Dictionary<string, string> serverVars = new Dictionary<string, string>();
		foreach (string key in Request.ServerVariables.AllKeys)
			serverVars.Add(key, Request.ServerVariables[key].ToString());
		JavaScriptSerializer jss = new JavaScriptSerializer();
		string result = jss.Serialize(serverVars);
		return result;
	}

	string ticketDetail(string ticketID){
		string result = apiPost(new Dictionary<string, string>(){
			{"action", command},
			{"ticketID", ticketID},
			{"format", "json"}
		});
		return result;
	}

	string postMessage(string ticketID, string message){
		string result = apiPost(new Dictionary<string, string>(){
			{"action", command},
			{"ticketID", ticketID},
			{"message", message},
			{"format", "json"}
		}, 10000);
		return result;
	}

	string addTicket(string resource_id, string email, string name, string queue, string subject, string message, string pri, string search, string cc){
		if (!string.IsNullOrEmpty(cc))
		{
			using (SmtpClient client = new SmtpClient(smtpHost))
			using (MailMessage mm = new MailMessage("system@lnf.umich.edu", cc, subject, message))
				client.Send(mm);
		}
		
		string result = apiPost(new Dictionary<string, string>(){
			{"action", command},
			{"resource_id", resource_id},
			{"email", email},
			{"name", name},
			{"queue", queue},
			{"subject", subject},
			{"message", message},
			{"pri", pri},
			{"search", search},
			{"format", "json"}
		}, 120000);
		return result;
	}

	string getSummary(string resources){
		string result = apiPost(new Dictionary<string, string>(){
			{"action", command},
			{"resources", resources},
			{"format", "json"}
		}, 5000);
		return result;
	}

	string request(string key){
		return (!string.IsNullOrEmpty(Request[key])) ? Request[key] : "";
	}

	string getCc(){
		string raw = request("cc");
		string[] splitter = raw.Split(',');
		string result = string.Join(",", splitter.Where(x => !string.IsNullOrEmpty(x)));
		return result;
	}

	void Page_Load(object sender, EventArgs e){
		Response.ContentType = "application/json";
		command = (!string.IsNullOrEmpty(Request["command"])) ? Request["command"] : string.Empty;  
		string ticketID = string.Empty;
		string source = string.Empty;
		string queue = string.Empty;
		string name = string.Empty;
		string email = string.Empty;
		string message = string.Empty;
		string topic = string.Empty;
		string location = string.Empty;
		string subject = string.Empty;
		string pri = string.Empty;
		string search = string.Empty;
		string resources = string.Empty;
		string resource_id = string.Empty;
		string cc = string.Empty;
		try{
			switch(command){
				case "select-tickets-by-email":
					email = request("email");
					Response.Write(selectTicketsByEmail(email));
					break;
				case "select-tickets-by-resource":
					resource_id = request("resource_id");
					Response.Write(selectTicketsByResource(resource_id));
					break;
				case "dump-server-vars":
					Response.Write(dumpServerVars());
					break;
				case "ticket-detail":
					ticketID = request("ticketID");
					Response.Write(ticketDetail(ticketID));
					break;
				case "post-message":
					ticketID = request("ticketID");
					message = request("message");
					Response.Write(postMessage(ticketID, message));
					break;
				case "add-ticket":
					resource_id = request("resource_id");
					email = request("email");
					name = request("name");
					queue = request("queue");
					subject = request("subject");
					message = request("message");
					pri = request("pri");
					search = request("search"); //"by-resource", "by-email" or ""
					cc = getCc();
					Response.Write(addTicket(resource_id, email, name, queue, subject, message, pri, search, cc));
					break;
				case "summary":
					resources = request("resources");
					Response.Write(getSummary(resources));
					break;
                case "debug":
                    string ip = Request.ServerVariables["LOCAL_ADDR"];
                    string key = string.Empty;
                    if (keys.ContainsKey(ip))
                        key = keys[ip];
                    else
                        key = "Missing API Key for IP Address: "+ip;
                        
                    Response.Write("{\"ip\":\""+ip+"\", \"key\":\""+key+"\"}");
                    
                    break;
				default:
					if (string.IsNullOrEmpty(command))
						Response.Write("{\"error\":true, \"errno\":500, \"message\":\"Missing command\"}");
					else
						Response.Write("{\"error\":true, \"errno\":500, \"message\":\"Invalid command: "+command+"\"}");
					break;
			}
		}
		catch(Exception ex){
			Response.Write("{\"error\": true, \"errno\":"+errno.ToString()+",\"message\":\""+ex.Message+"\"}");
		}
	}
</script>
