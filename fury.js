#!/usr/bin/env node

const vorpal = require('vorpal')();
const querystring = require('querystring');
const request = require('request');
const httpServer = require('http-server');
var interactive = vorpal.parse(process.argv, {use: 'minimist'})._ === undefined;
const StromDAONode = require('stromdao-businessobject');
const rpcurl="https://fury.network/rpc";
const apiurl="https://fury.network/api";
const fs = require('fs');
const persist = require("node-persist");
const extid="fury-cli";
var opener     = require('opener');

var https = require('https');


persist.initSync();

function auth(path,callback) {
	var node = new StromDAONode.Node({external_id:extid,testMode:true,rpc:rpcurl,abilocation:"https://cdn.rawgit.com/energychain/StromDAO-BusinessObject/master/smart_contracts/"});
	 var options = {
        host :  'fury.network',
        port : 443,
        path : '/api/auth',
        method : 'POST',
         headers: {
          'Content-Type': 'application/x-www-form-urlencoded'}
    }
    var token="";
    
	var req=https.request(options,function(res) {
				res.on('data', function(d) {token+=d;});
				res.on('end', function() {
						token=JSON.parse(token);
						token=token.token;
						persist.setItemSync("sectoken",token);
						console.log(token);
						callback();
					});
		});
	
	var pdata = querystring.stringify({extid:node.wallet.address,secret:+node.wallet.privateKey.substr(0,10)});
	req.write(pdata);
	req.end();		
}

function init(path,callback) {
	
	if (!fs.existsSync(path)){
		fs.mkdirSync(path);
	}
    
    var options = {
        host :  'fury.network',
        port : 443,
        path : '/playground_base.html'
    }
    var base_html="";
    var base_js="";   ;
	var req = https.get(options,function(res) {
		res.on('data', function(d) {base_html+=d;});
		res.on('end', function() {	
			options.path="/playground_base.js";		
			req=https.get(options,function(res) {
				 	res.on('data', function(d) {base_js+=d;});
				 	res.on('end', function() {	
						fs.writeFile(path+"/index.html", base_html, function(err) {   
							fs.writeFile(path+"/base.js", base_js, function(err) { 
								vorpal.log(path+" created");	
								auth(path,callback);															
							});
						}); 		
					});
			 });			 			
		});			
	});	
}
function run(path,port,callback) {
	
	logger = {
    info: console.log,
    request: function (req, res, error) {
			console.log(req.url);
    }
  };
  
	options = {};
	options.root="./"+path+"/";
	options.port=port;
	options.autoIndex=true;
	options.logFn=logger.request;	
	
	var server = httpServer.createServer(options);
	server.listen(options.port, options.host, function () {
		var canonicalHost = options.host === '0.0.0.0' ? '127.0.0.1' : options.host;    
		console.log('Starting up http-server, serving ',server.root);
		console.log("Stop with CTRL+C");
		opener("http://127.0.0.1:"+port+"/index.html");
	
	});	
	//callback();
}

function publish(path,callback) {
	var data=[];

	data.push({path:"/fury.network"});
	fs.readdirSync(path).forEach(fname => {	
			data.push({content:fs.createReadStream(path+"/"+fname),path:"/fury.network/"+fname});
	})
	
	ipfs.files.add(data, function (err, files) {			
			for(var i=0;i<files.length;i++) {
				request.get("https://fury.network/ipfs/"+files[i].hash,function(e,h,b) {});				
			}							
			vorpal.log("Inject URL (fury)","https://fury.network/ipfs/"+files[0].hash+"?extid=fury.network.cli");
			vorpal.log("Inject URL (ipfs)","https://ipfs.io/ipfs/"+files[0].hash+"?extid=fury.network.cli");
			callback()		
	});			
}
vorpal
  .command('init <path>')  
  .description("Create a subfolder path and inits its content") 
  .action(function (args, callback) {	 
   init(args.path,callback);
});	

vorpal
  .command('run <path>')  
  .option('-p <port>','Port Number of HTTP Server (Default:8080)')
  .description("Starts local http server for given subfolder (Stop with CTRL+C)") 
  .action(function (args, callback) {	 
	var port=8080;
	console.log(args.options);
	if(args.options.p) port=args.options.p;
	run(args.path,port,callback);
});	


vorpal
  .command('publish <path>') 
  .description("Publish given subfolder to fury.network") 
  .action(function (args, callback) {	 
   publish(args.path,callback);
});	

vorpal
  .command('auth <path>')  
  .action(function (args, callback) {	 
   auth(args.path,callback);
});	
const IPFS = require('ipfs')
const ipfs = new IPFS()
ipfs.on('ready', () => {

});

	if (interactive) {
		vorpal
			.delimiter('fury.network $')
			.show()
	} else {
		// argv is mutated by the first call to parse.
		process.argv.unshift('')
		process.argv.unshift('')
		vorpal
			.delimiter('')
			.parse(process.argv)
	}
