
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
	myself.incUpdateEvent = function( eventName ){
	    var updateCnt = parseInt(Dashboards.getParameterValue(eventName));
	    Dashboards.fireChange(eventName,(updateCnt += 1).toString());		
	}

	myself.toggleDeleteStatus = function( status ){
		return (status == "N" ? "Y" : "N");
	}

	myself.getColIndexFromColName = function( metadata, name ) {
		var colIndex;
		$.each(metadata, function(idx,ele){
			if(ele.colName === name){
				colIndex = ele.colIndex;
			}
		});
		return colIndex;
	}
	myself.tablePostChangeProcedure = function( data, fileCounterParam , files2deleteParam , destinationRepoLocation) {

		/* actionName should be one of the following: jcr2fs , synch , fs2jcr */

	    if(_.isEmpty(data)){
	        data = synchronizer.createTableEmptyRawData();
	    } else {
		    var files2deleteList = [],
		        fileCounter = 0,
		        statusIdx = synchronizer.getColIndexFromColName(data.metadata,"modification_status"),
		        fileIdx = synchronizer.getColIndexFromColName(data.metadata,"file"),
		        typeIdx = synchronizer.getColIndexFromColName(data.metadata,"type");
		    /* Update respective ToBeDeletedList and FileCounterParam */
		    $.each(data.resultset,function(idx,ele){
		        if(ele[typeIdx] === "file"){
		            fileCounter += 1;
		            if(ele[statusIdx] === "to_be_deleted"){
		                files2deleteList.push(ele[fileIdx]);
		            }
		        }
		    });
		    Dashboards.setParameter(files2deleteParam,files2deleteList);
		    Dashboards.fireChange(fileCounterParam,fileCounter);

		    /* Update file and modification_status headers*/
		    data.metadata[fileIdx].colName = Dashboards.getParameterValue(destinationRepoLocation);
	    	data.metadata[statusIdx].colName = "Modification status";
	    }
	    return data;
	};
/*	myself.getEndpointCaller = function( pluginId, endpoint, opts ){
	    var myself = this;
	    
	    return function (callback, errorCallback, params){
	      	var _opts = $.extend({}, opts);
	      	_opts.params = params || _opts.params;
	      	_opts.success = callback || _opts.success;
	      	_opts.error = errorCallback || _opts.error;
	      	myself.runEndpoint(pluginId, endpoint, _opts);
	    }
	};
*/
})(synchronizer);
