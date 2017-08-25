#!/usr/bin/env node

const vorpal = require('vorpal')();
const querystring = require('querystring');
const request = require('request');
var interactive = vorpal.parse(process.argv, {use: 'minimist'})._ === undefined;
const StromDAONode = require('stromdao-businessobject');
const rpcurl="https://fury.network/rpc";
const apiurl="https://fury.network/api";
const fs = require('fs');
const persist = require("node-persist");
const extid="fury-cli";

var https = require('https');


persist.initSync();

function auth(callback) {
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
						fs.writeFile(path+"/base.html", base_html, function(err) {   
							fs.writeFile(path+"/base.js", base_js, function(err) { 
								vorpal.log(path+" created");
								callback();
							});
						}); 		
					});
			 });			 			
		});			
	});	
}

function publish(path,callback) {

    var token=persist.getItemSync("sectoken");
    if(!token) {
		auth(publush(path,callback));
	}
	obj=[];
	
	obj.push({name:'base.html',type:"html",content:fs.readFileSync(path+"/base.html").toString('utf-8')});
	obj.push({name:'base.js',type:"js",content:fs.readFileSync(path+"/base.js").toString('utf-8')});
	

	request.post({url:apiurl+'/cold/set/?token='+token, formData:{bucket:'playground',obj: JSON.stringify(obj),token:token}},function(err,httpResponse,body){
		var json=JSON.parse(httpResponse.body);
		vorpal.log("Inject URL","https://fury.network/?extid="+path+"&inject="+json.address);
		callback();			
	});
	
}

vorpal
  .command('publish <path>')  
  .action(function (args, callback) {	 
   publish(args.path,callback);
});	

vorpal
  .command('init <path>')  
  .action(function (args, callback) {	 
   init(args.path,callback);
});	

vorpal
  .command('auth')  
  .action(function (args, callback) {	 
   auth(callback);
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
