
/********************************** Project namespace *******************************************/
var synchronizer = {};

(function(myself){

	/*myself.pluginId = "repositorysynchronizer";*/

/*	myself.prepareAndLaunchSyncEndpoint = function (){
	    var pluginId = "repositorysynchronizer",
	    var endpoint = "syncRepositories",
	        endpointOpts = {
	            params:{}    
	        };

	    if(Dashboards.getParameterValue("${p:deleteActivationParam}")){
	        endpointOpts.params["delete"]="Y";
	    } else {
	        endpointOpts.params["delete"]="N";        
	    }
	    
	    if(Dashboards.getParameterValue("${p:selectedActionParam}") === "I"){
	        endpointOpts.params["originRepoLocation"]=Dashboards.getParameterValue("${p:destinationRepoLocationParam}");    
	        endpointOpts.params["destinationRepoLocation"]=Dashboards.getParameterValue("${p:originRepoLocationParam}");            
	    } else {
	        endpointOpts.params["originRepoLocation"]=Dashboards.getParameterValue("${p:originRepoLocationParam}");    
	        endpointOpts.params["destinationRepoLocation"]=Dashboards.getParameterValue("${p:destinationRepoLocationParam}");
	    }
	    
	    synchronizer.runEndpoint(pluginId,endpoint,endpointOpts);
	    var count = parseInt(Dashboards.getParameterValue("${p:updateTableParam}"));
	    count ++;
	    Dashboards.setParameter("${p:updateTableParam}",count.toString());

	    $("#dataCell1").toggleClass("collapsed");    
	    $("#dataCell2").toggleClass("collapsed");
	}
*/
  	myself.createTableEmptyRawData = function() {
    	var emptyData = {
      		metadata:[
	        	{
	          		colIndex: 0,
	          		colType: 'String',
	          		colName: 'file'
	        	},
	        	{
	          		colIndex: 1,
	          		colType: 'String',
	          		colName: 'modification_status'
	        	},
	        	{
	          		colIndex: 2,
	          		colType: 'String',
	          		colName: 'direction'
	        	},
	        	{
	          		colIndex: 3,
	          		colType: 'String',
	          		colName: 'type'
	        	}
      		],
	      	queryInfo:{
	        	totalRows: 0
	      	},
	      	resultset: []
    	}
    	return emptyData;
  	}  
	 
	myself.runEndpoint = function ( pluginId, endpoint, opts){

	    if ( !pluginId && !endpoint){
	      	Dashboards.log('PluginId or endpointName not defined.');
	      	return false
	    }

	    var _opts = {
	      	success: function (){
	        	Dashboards.log( pluginId + ': ' + endpoint + ' ran successfully.')
	      	},
	      	error: function (){
	        	Dashboards.log( pluginId + ': error running ' + endpoint + '.')
	      	},
	      	params: {},
	      	systemParams: {},
	      	type: 'POST',
	      	dataType: 'json'
	    }
	    var opts = $.extend( {}, _opts, opts);
	    var url = Dashboards.getWebAppPath() + '/content/' + pluginId + '/' + endpoint;

	    function successHandler  (json){
	      	if ( json && json.result == false){
	        	opts.error.apply(this, arguments);
	      	} else {
	        	opts.success.apply( this, arguments );
	      	}
	    }

	    function errorHandler  (){
	      	opts.error.apply(this, arguments);
	    }

	    var ajaxOpts = {
	      	url: url,
	      	async: true,
	      	type: opts.type,
	      	dataType: opts.dataType,
	      	success: successHandler,
	      	error: errorHandler,
	      	data: {}
	    }

	    _.each( opts.params , function ( value , key){
	      	ajaxOpts.data['param' + key] = value;
	    });
	    _.each( opts.systemParams , function ( value , key){
	      	ajaxOpts.data[key] = value;
	    });

	    $.ajax(ajaxOpts)
	}

	myself.getEndpointCaller = function( pluginId, endpoint, opts ){
	    var myself = this;
	    
	    return function (callback, errorCallback, params){
	      	var _opts = $.extend({}, opts);
	      	_opts.params = params || _opts.params;
	      	_opts.success = callback || _opts.success;
	      	_opts.error = errorCallback || _opts.error;
	      	myself.runEndpoint(pluginId, endpoint, _opts);
	    }
	};

})(synchronizer);
