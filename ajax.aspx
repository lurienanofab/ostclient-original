<%@ Page Language="C#" %>

<%@ Import Namespace="System.Collections.Generic" %>
<%@ Import Namespace="System.Web.Security" %>
<%@ Import Namespace="System.Net" %>
<%@ Import Namespace="System.Net.Mail" %>
<%@ Import Namespace="System.IO" %>
<%@ Import Namespace="System.Text" %>
<%@ Import Namespace="System.Web.Script.Serialization" %>
<%@ Import Namespace="Newtonsoft.Json" %>

<script runat="server">
    const string API_URL = "https://lnf.umich.edu/helpdesk/api/data-exec.php";

    int? errno = null;
    string error = null;
    string command = null;

    dynamic GetConfig()
    {
        string configFilePath = Path.Combine(Server.MapPath("."), "config.json");
        
        if (File.Exists(configFilePath))
        {
            string content = File.ReadAllText(configFilePath);
            var config = JsonConvert.DeserializeAnonymousType(content, new {ApiKey = "", SmtpHost = ""});
            return config;
        }
        else 
        {
            throw new Exception("Missing config file: "+configFilePath);
        }
    }
    
    string GetApiKey()
    {
        var config = GetConfig();
        return config.ApiKey;
    }
    
    string GetSmtpHost()
    {
        var config = GetConfig();
        return config.SmtpHost;
    }
    
    string UserCheck()
    {
        string result = "";
        HttpWebRequest req = (HttpWebRequest)WebRequest.Create("https://ssel-apps.eecs.umich.edu/webapi/data/client/current");
        var authCookie = Request.Cookies[FormsAuthentication.FormsCookieName];
        string token = authCookie.Value;
        req.Headers[HttpRequestHeader.Authorization] = string.Format("Forms {0}", token);
        HttpWebResponse resp = (HttpWebResponse)req.GetResponse();
        Stream dataStream = resp.GetResponseStream();
        StreamReader reader = new StreamReader(dataStream);
        result = reader.ReadToEnd();
        reader.Close();
        resp.Close();
        return result;
    }

    string ApiPost(Dictionary<string, string> data, int timeout = 5000)
    {
        errno = null;
        string content = string.Empty;
        
        try
        {
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
            req.UserAgent = GetApiKey();
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
        catch(WebException ex)
        {
            errno = (int)ex.Status;
            error = ex.Message;
        }
        catch(Exception ex)
        {
            errno = 500;
            error = ex.Message;
        }

        if (errno != null)
            throw new Exception(error);
        
        return content;
    }

    string SelectTicketsByEmail(string email)
    {
        string result = ApiPost(new Dictionary<string, string>
        {
            {"action", command},
            {"email", email},
            {"status", "open"},
            {"format", "json"}
        });
        
        return result;
    }

    string SelectTicketsByResource(string resource_id)
    {
        string result = ApiPost(new Dictionary<string, string>
        {
            {"action", command},
            {"resource_id", resource_id},
            {"status", "open"},
            {"format", "json"}
        });
        
        return result;
    }
    
    string SelectTicketsByDate(string sdate, string edate, string resource_id, string email, string name, string assigned_to, string status, string format)
    {
        DateTime sd;
        DateTime ed;
        
        if (string.IsNullOrEmpty(sdate))
            sd = DateTime.Now.Date.AddDays(-7);
        else
            sd = DateTime.Parse(sdate);
            
        if (string.IsNullOrEmpty(edate))
            ed = sd.AddDays(7);
        else
            ed = DateTime.Parse(edate);
            
        if (string.IsNullOrEmpty(status))
            status = "open";
        
        if (string.IsNullOrEmpty(format))
            format = "xml"; //default
        
        if (format == "xml")
            Response.ContentType = "text/xml";
        else if (format == "json")
            Response.ContentType = "application/json";
        else
            Response.ContentType = "text/plain";
            
        var args = new Dictionary<string, string>
        {
            {"sdate", sd.ToString("yyyy-MM-dd")},
            {"edate", ed.ToString("yyyy-MM-dd")},
            {"status", status},
            {"format", format}
        };
        
        if (!string.IsNullOrEmpty(resource_id))
            args.Add("resource_id", resource_id);
        
        if (!string.IsNullOrEmpty(email))
            args.Add("email", email);
        
        if (!string.IsNullOrEmpty(name))
            args.Add("name", name);
        
        if (!string.IsNullOrEmpty(assigned_to))
            args.Add("assigned_to", assigned_to);
        
        string result = ApiPost(args);
        
        return result;
    }

    string DumpServerVars()
    {
        Dictionary<string, string> serverVars = new Dictionary<string, string>();
        foreach (string key in Request.ServerVariables.AllKeys)
            serverVars.Add(key, Request.ServerVariables[key].ToString());
        JavaScriptSerializer jss = new JavaScriptSerializer();
        string result = jss.Serialize(serverVars);
        return result;
    }

    string TicketDetail(string ticketID)
    {
        string result = ApiPost(new Dictionary<string, string>
        {
            {"action", command},
            {"ticketID", ticketID},
            {"format", "json"}
        });
        
        return result;
    }

    string PostMessage(string ticketID, string message)
    {
        string result = ApiPost(new Dictionary<string, string>
        {
            {"action", command},
            {"ticketID", ticketID},
            {"message", message},
            {"format", "json"}
        }, 10000);
        
        return result;
    }

    string AddTicket(string resource_id, string email, string name, string queue, string subject, string message, string pri, string search, string cc)
    {
        if (!string.IsNullOrEmpty(cc))
        {
            using (SmtpClient client = new SmtpClient(GetSmtpHost()))
            using (MailMessage mm = new MailMessage("system@lnf.umich.edu", cc, subject, message))
                client.Send(mm);
        }
        
        string result = ApiPost(new Dictionary<string, string>
        {
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

    string GetSummary(string resources)
    {
        string result = ApiPost(new Dictionary<string, string>
        {
            {"action", command},
            {"resources", resources},
            {"format", "json"}
        }, 5000);
        
        return result;
    }

    string GetRequestVar(string key)
    {
        return (!string.IsNullOrEmpty(Request[key])) ? Request[key] : "";
    }

    string GetCc()
    {
        string raw = GetRequestVar("cc");
        string[] splitter = raw.Split(',');
        string result = string.Join(",", splitter.Where(x => !string.IsNullOrEmpty(x)));
        return result;
    }

    void Page_Load(object sender, EventArgs e)
    {
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
        string sdate = string.Empty;
        string edate = string.Empty;
        string status = string.Empty;
        string format = string.Empty;
        string assigned_to = string.Empty;
        
        try
        {
            switch (command)
            {
                case "user-check":
                    Response.Write(UserCheck());
                    break;
                case "select-tickets-by-email":
                    email = GetRequestVar("email");
                    Response.Write(SelectTicketsByEmail(email));
                    break;
                case "select-tickets-by-resource":
                    resource_id = GetRequestVar("resource_id");
                    Response.Write(SelectTicketsByResource(resource_id));
                    break;
                case "select-tickets-by-date":
                    sdate = GetRequestVar("sdate");
                    edate = GetRequestVar("edate");
                    resource_id = GetRequestVar("resource_id");
                    email = GetRequestVar("email");
                    name = GetRequestVar("name");
                    assigned_to = GetRequestVar("assigned_to");
                    status = GetRequestVar("status");
                    format = GetRequestVar("format");
                    Response.Write(SelectTicketsByDate(sdate, edate, resource_id, email, name, assigned_to, status, format));
                    break;
                case "dump-server-vars":
                    Response.Write(DumpServerVars());
                    break;
                case "ticket-detail":
                    ticketID = GetRequestVar("ticketID");
                    Response.Write(TicketDetail(ticketID));
                    break;
                case "post-message":
                    ticketID = GetRequestVar("ticketID");
                    message = GetRequestVar("message");
                    Response.Write(PostMessage(ticketID, message));
                    break;
                case "add-ticket":
                    resource_id = GetRequestVar("resource_id");
                    email = GetRequestVar("email");
                    name = GetRequestVar("name");
                    queue = GetRequestVar("queue");
                    subject = GetRequestVar("subject");
                    message = GetRequestVar("message");
                    pri = GetRequestVar("pri");
                    search = GetRequestVar("search"); //"by-resource", "by-email" or ""
                    cc = GetCc();
                    Response.Write(AddTicket(resource_id, email, name, queue, subject, message, pri, search, cc));
                    break;
                case "summary":
                    resources = GetRequestVar("resources");
                    Response.Write(GetSummary(resources));
                    break;
                default:
                    if (string.IsNullOrEmpty(command))
                        Response.Write("{\"error\":true, \"errno\":500, \"message\":\"Missing command\"}");
                    else
                        Response.Write("{\"error\":true, \"errno\":500, \"message\":\"Invalid command: "+command+"\"}");
                    break;
            }
        }
        catch(Exception ex)
        {
            Response.Write("{\"error\": true, \"errno\":"+errno.ToString()+",\"message\":\""+ex.Message+"\"}");
        }
    }
</script>
