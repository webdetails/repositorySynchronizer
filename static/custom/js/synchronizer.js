
/********************************** Project namespace *******************************************/
var synchronizer = {};

(function(myself){

	myself.settings = {};
	
	myself.settings.statusDictionary = {
		"to_be_copied":"to be created",
		"to_be_deleted":"to be deleted",
		"to_be_modified":"to be updated",
		"nothing_to_be_updated":"will not be updated"
	};

/*	myself.getParentFolderPath = function(fullPath,sep,type) {
		var levelsArray = fullPath.split(sep);
		if(type !== "folder"){
			levelsArray.splice(-1);
		}
		return levelsArray.join(sep);
	}

	myself.getParentFolderLevel = function(fullPath,sep,type) {
		var levels = (fullPath.split(sep)).length;
		if(type !== "folder"){
			levels -= 1;
		}		
		return levels - 1;
	}
*/	
	myself.getParentFolderPath = function(fullPath,sep) {
		var levelsArray = fullPath.split(sep);
		levelsArray.splice(-1);
		return levelsArray.join(sep);
	}

	myself.getParentFolderLevel = function(fullPath,sep) {
		var levels = (fullPath.split(sep)).length;	
		return levels - 2;
	}
	myself.getParentFolderInfo = function(fullPath,sep) {
		var infoObj = {};
		infoObj.path = synchronizer.getParentFolderPath(fullPath,sep);
		infoObj.level = synchronizer.getParentFolderLevel(fullPath,sep);
		return infoObj;
	}

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
	        	},
	        	/* Dashboard-made auxiliar column*/
	        	{
	          		colIndex: 4,
	          		colType: 'String',
	          		colName: 'isOpen'
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

	myself.getCamelCase = function( string , sep ) {
		var capitalizeString = function( string ) {
				return (string.substring(0,1).toUpperCase()).concat(string.substring(1)); 
			},
			workedPartsArr = $.map( string.split(sep) , function(ele,idx){
				return (idx === 0 ? ele : capitalizeString(ele));
			});
		return workedPartsArr.join("");
	}

	myself.addAuxIsOpenColumn = function(data) {
		var newColIndex = data.metadata.length;
		/* metadata update */
		data.metadata.push({
			colIndex: newColIndex,
			colName: "isOpen",
			colType: "String"
		});

		/* resultset update */
		var typeColIdx = synchronizer.getColIndexFromColName(data.metadata,"type");
		$.each(data.resultset,function(idx,ele){
			var val = (ele[typeColIdx] === "folder" ? "Y" : "");
			data.resultset[idx].push(val);
		});
	
		return data;
	}

	myself.tablePostChangeProcedure = function( data, fileCounterParam , files2deleteParam , destinationRepoLocation) {
	    if(_.isEmpty(data)){
	        data = synchronizer.createTableEmptyRawData();
	    } else {
		    var files2deleteList = [],
		        fileCounter = 0,
		        statusIdx = synchronizer.getColIndexFromColName(data.metadata,"modification_status"),
		        fileIdx = synchronizer.getColIndexFromColName(data.metadata,"file"),
		        typeIdx = synchronizer.getColIndexFromColName(data.metadata,"type");
		    /* Add auxiliar column to test if folder is open */
		    data = synchronizer.addAuxIsOpenColumn(data);

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

})(synchronizer);


/************************************  AddIns ************************************/

;(function (){

   	var synchModification = {
      	name: "synchModification",
      	label: "Synchronizer Row Modification Status",
      	defaults: {
        	textFormat: function(v, st) {
	        	return st.colFormat ? sprintf(st.colFormat,v) : v;
         	},
         	fsAddress: "",
         	dirColIdx: 0,
         	sep: " "
      	},

      	init: function(){
        	$.fn.dataTableExt.oSort[this.name+'-asc'] = $.fn.dataTableExt.oSort['string-asc'];
        	$.fn.dataTableExt.oSort[this.name+'-desc'] = $.fn.dataTableExt.oSort['string-desc'];
      	},

      	implementation: function(tgt, st, opt){
      		var text = synchronizer.settings.statusDictionary[st.value],
        		cssClass = synchronizer.getCamelCase(text,opt.sep),
        		dirValue = st.tableData[st.rowIdx][opt.dirColIdx],
        		dirClass = ( dirValue === opt.fsAddress ? "fs2jcr" : "jcr2fs" );
        
            $(tgt).parent().addClass(cssClass+" "+dirClass);
         	$(tgt).empty().append(text);      
    	}
	};
	Dashboards.registerAddIn("Table", "colType", new AddIn(synchModification));

  	var synchMainColumn = {
	    name: "synchMainColumn",
	    label: "Open-close Cell",
	    defaults: {
	    	typeColIdx: 0,
	    	isOpenColIdx: 0,
	    	sep: "/"
	    },

	    init: function(){
	        $.fn.dataTableExt.oSort[this.name+'-asc'] = $.fn.dataTableExt.oSort['string-asc'];
	        $.fn.dataTableExt.oSort[this.name+'-desc'] = $.fn.dataTableExt.oSort['string-desc'];
	    },
    
	    implementation: function(tgt, st, opt){
	    	var type = st.tableData[st.rowIdx][opt.typeColIdx],
	    		parentFolderFullPath = st.rawData.resultset[st.rowIdx][st.colIdx];

	    	var elementsArr = parentFolderFullPath.split("/"),
		      	label = elementsArr[(elementsArr.length-1)];
	    	//st.value = "/"+label;
	    	$(tgt).empty().text("/"+label);
	    	$(tgt).parent().addClass(type);

	    	if(st.tableData[st.rowIdx][opt.typeColIdx] === "folder"){
	    		$(tgt).click(function(){
	    			/* toggle row isOpen status */
	    			st.tableData[st.rowIdx][opt.isOpenColIdx] = synchronizer.toggleDeleteStatus(st.tableData[st.rowIdx][opt.isOpenColIdx]);

	    			var thisRowIdx = st.rowIdx+1,
	    				thisValue = st.rawData.resultset[thisRowIdx][st.colIdx],
	    				$thisTgtRow = $(tgt).parent().next();
	    			while( synchronizer.getParentFolderPath(thisValue,opt.sep) === parentFolderFullPath  ){
	    				/* toggle Next Row visibility */
	    				$thisTgtRow.toggleClass("WDhidden");
	    				/* increment iterator variables */
	    				thisRowIdx += 1,
	    				thisValue = st.rawData.resultset[thisRowIdx][st.colIdx],
	    				$thisTgtRow = $thisTgtRow.next();
	    			}
	    		});
	    	}      	
	    }
    };
    Dashboards.registerAddIn("Table", "colType", new AddIn(synchMainColumn));
  
})();
