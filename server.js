const net = require('net');
const http = require('http');
const path = require('path');
const express = require('express');
const exphbs = require('express-handlebars');
const fs = require('fs');
var app = express();
app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');
//app.use(express.static('public'));


var status = "";


app.get('*', function(req, res){
	res.status(200);
	res.render('Splash', { stat: status});

});



app.listen(8080, function(){
	console.log("Started web server");
});

console.log("started server");

var host = '127.0.0.1';
var port = 25575;
var gid = 1;
var connected = false;



var cmdqueue = [];
cmdqueue[0] = "0";//beginning of queue

var client = new net.Socket();
client.setKeepAlive(true);
client.setEncoding("ASCII");	
client.connect(port, host, function() {
	console.log("Connected to server");
});

function pack(id, type, message){
	var buff = new Buffer(14 + message.length);
	buff.writeInt32LE(id, 4);
	buff.writeInt32LE(type, 8);
	buff.write(message, 12);
	buff.writeInt32LE(10+message.length, 0);
	buff.writeInt16LE(0, (12+message.length));
	return buff;
}

function sendcmd(command){
	if(!connected)return;
	if(gid > 2000) gid = 0;//make sure the id doesnt get too big
	++gid;
	cmdqueue[gid] = command;
	var cmdpack = pack(gid, 2, command);
	client.write(cmdpack);
}

function login(password){
	if(connected) return;
	++gid;
	cmdqueue[gid] = "login";
	var logpack = pack(gid, 3, password);
	client.write(logpack);	
}

function getcount(){
	sendcmd("list");
}

function announce(){
	sendcmd("say Hello peoples!");
}

function influxIt(measurement, value){
	console.log("writing measurement: " + measurement + " with value: " + value);
	var data = measurement + " value=" + value;
	var opt = {
		host: "10.0.0.21",
		port: 8086,
		path: '/write?db=telegraf',// + db,
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': Buffer.byteLength(data)
		}
	};
	const req = http.request(opt, (res) => {});
	req.write(data);
	req.end();
}

	
	login("mcarc1234$");
	setInterval(getcount, 5000);
	//setInterval(announce, 5000);
	//while(!connected){}
	//sendcmd("list");	
	//var test = pack(10, 3, "mcarc1234$");
	//console.log(test);
	//client.write(test);

	//var pack2 = pack(11, 2, "list");
	//client.write(pack2);
	//var help = pack(12, 2, "help");
	//client.write(help);
	//client.write(finalmessage.toString("utf8"), "UTF8", function(){
		//	console.log("Writing has completed");

		//});

client.on('data', function(data){
	console.log("got data");
	var dbuff = Buffer.from(data);
	//console.log(dbuff);
	var length = dbuff.readInt32LE(0);
	var id = dbuff.readInt32LE(4);
	var type = dbuff.readInt32LE(8);
	var messagebuff = dbuff.slice(12, length+4);
	console.log("Length: " + length);
	console.log("Buff size: " + dbuff.length);
	console.log("id: " + id);
	console.log("type: " + type);
	console.log(messagebuff.toString('ascii'));
	var response = messagebuff.toString('ascii');
	var sentcmd = "";
	sentcmd = cmdqueue[id];
	if(sentcmd == "list"){
		//log it to the thing
		console.log("Going to write data to influx");		
		console.log(response);
		status = response;
		var rgx = response.match("[0-9]+\/[0-9]+");
		if(rgx != null){
			//console.log(rgx[0]);
			var substr = rgx[0].split("/");
			influxIt("players", substr[0]);
			influxIt("maxplayers", substr[1]);
		}
	}
	console.log("response to cmd: " + sentcmd);
	if(id == -1)console.log("Failed to log in");
	if(id == gid && type == 2){
		console.log("Logged in ok");
		connected = true;
	}
});

client.on("close", function(){
	console.log("The connection has been closed");

});
