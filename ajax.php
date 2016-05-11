<?php
define(API_URL, 'http://lnf.umich.edu/helpdesk/api/data-exec.php');

$errno = null;
$error = null;
$command = null;

$keys = array(
	'141.213.8.37'		=> 'BFCCB07172D97BB934253D0709FEC278',
	'141.213.7.201'		=> '4399AAE0740BD6A8E0E5CBE66FF056C5',
	'192.168.168.200'	=> '4399AAE0740BD6A8E0E5CBE66FF056C5'
);

function getApiKey(){
	global $keys;
	$ip = $_SERVER['LOCAL_ADDR'];
	if (array_key_exists($ip, $keys))
		return $keys[$ip];
	else
		throw new Exception("Missing API Key for IP Address: ".$ip, 500);
}

function apiPost($data, $timeout = 5000){
	global $errno;
	global $error;
	
	$errno = null;
	$content = '';
	$ch = curl_init();
	curl_setopt($ch, CURLOPT_URL, API_URL);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
	curl_setopt($ch, CURLOPT_TIMEOUT_MS, $timeout);
	curl_setopt($ch, CURLOPT_POST, count($data));
	curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
	curl_setopt($ch, CURLOPT_USERAGENT, getApiKey());
	$content = curl_exec($ch);
	$errno = curl_errno($ch);
	$error = curl_error($ch);

	if ($errno)
		throw new Exception($error, $errno);
		
	return $content;
}

function selectTicketsByEmail($email){
	global $command;
	global $error;
	global $errno;
	
	$result = apiPost(array(
		"action"	=> $command,
		"email"		=> $email,
		"format"	=> "json"
	));
	
	return $result;
}

function dumpServerVars(){
	$result = json_encode($_SERVER);
	return $result;
}

function ticketDetail($ticketID){
	$result = apiPost(array(
		"action"	=> command,
		"ticketID"	=> ticketID,
		"format"	=> "json"
	));
	return result;
}

function postMessage($ticketID, $message){
	$result = apiPost(array(
		"action" 	=> command,
		"ticketID"	=> ticketID,
		"message"	=> message,
		"format" 	=> "json"
	), 10000);
	return result;
}

function request($key){
	return (isset($_REQUEST[$key])) ? $_REQUEST[$key] : "";
}

header('Content-Type: application/json');
$command = request("command");
try{
	switch($command){
		case "select-tickets-by-email":
			$email = request("email");
			echo selectTicketsByEmail($email);
			break;
		case "dump-server-vars":
			echo dumpServerVars();
			break;
		case "ticket-detail":
			$ticketID = request("ticketID");
			echo ticketDetail($ticketID);
			break;
		case "post-message":
			$ticketID = request("ticketID");
			$name = request("name");
			$email = request("email");
			$email = ($email) ? sprintf(" (%s)", email) : "";
			$message = request("message");
			$message = sprintf("Posted by: %1$s%2$s%4$s----------%4$s%3$s", name, email, message, PHP_EOL);
			echo postMessage($ticketID, $message);
			break;
		default:
			if ($command == "")
				echo '{"error":"Missing command"}';
			else
				echo '{"error":"Invalid command: '.$command.'"}';
			break;
	}
}
catch(Exception $e){
	echo '{"error":"'.$e->getMessage().'", "errno":'.$e->getCode().'}';
}
?>
