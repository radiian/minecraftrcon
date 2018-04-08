const net = require('net');
const http = require('http');



	console.log("started server");
	var host = '127.0.0.1';
	var port = 25575;
	
	var client = new net.Socket();
	client.setKeepAlive(true);	
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
		
	var test = pack(10, 3, "mcarc1234$");
	console.log(test);
	client.write(test);
	var pack2 = pack(11, 2, "list");
	client.write(pack2);
	//client.write(finalmessage.toString("utf8"), "UTF8", function(){
		//	console.log("Writing has completed");

		//});

client.on('data', function(data){
	console.log("got data: " + data);
	var dbuff = Buffer.from(data);
	console.log(dbuff);
});

client.on("close", function(){
	console.log("The connection has been closed");

});
