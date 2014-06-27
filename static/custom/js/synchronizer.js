/********************************** Project namespace *******************************************/
var synchronizer = {};

(function (myself) {

  myself.settings = {};

  myself.settings.repoSettingsExtFileName = "prs.xml";

  myself.settings.statusDictionary = {
    "to_be_copied": "to be created",
    "to_be_deleted": "to be deleted",
    "to_be_modified": "to be updated",
    "nothing_to_be_updated": "won't be updated"
  };

  myself.getParentFolderPath = function (fullPath, sep) {
    fullPath = fullPath || '';
    var levelsArray = fullPath.split(sep);
    levelsArray.splice(-1);
    return levelsArray.join(sep);
  };
  myself.getParentFolderLevel = function (fullPath, sep) {
    //var levels = _.reduce( fullPath.split(sep), function(memo, p){return memo + (p.length > 0 ? 1 : 0);}, 0);
    //return levels;
    return myself.getParentFolders(fullPath, sep).length;
  };
  myself.getParentFolders = function (fullPath, sep) {
    fullPath = fullPath || '';
    return _.filter(fullPath.split(sep), function (s) {
      return s.length > 0;
    });
  };
  myself.getParentFolderInfo = function (fullPath, sep) {
    var infoObj = {};
    infoObj.path = synchronizer.getParentFolderPath(fullPath, sep);
    infoObj.level = synchronizer.getParentFolderLevel(fullPath, sep);
    return infoObj;
  };

  myself.updateCellBodyHeight = function ($cellBody) {
    $cellBody.height($cellBody.find(".container4transition").height());
  };
  myself.openCell = function ($cell2open) {
    $cell2open.addClass("active");
    var $cellBody = $cell2open.find(".WDdataCellBody");
    synchronizer.updateCellBodyHeight($cellBody);
    $cellBody.addClass("active");
  };
  myself.closeCell = function ($cell2close) {
    var $cellBody = $cell2close.find(".WDdataCellBody");
    /* remove delay, just in case */
    $cellBody.removeClass("delay");
    $cellBody.height(0);
    $cellBody.removeClass("active");
    $cell2close.addClass("delay").removeClass("active");
  };

  myself.checkIfInside = function (contentPath, containerPath, sep) {
    return contentPath.indexOf(containerPath) === 0;
  };
  myself.checkIfChild = function (contentPath, containerPath, sep) {
    return (synchronizer.getParentFolderPath(contentPath, sep) === containerPath ? true : false);
  };
  myself.checkIfGandchild = function (contentPath, containerPath, sep) {
    return ((synchronizer.checkIfInside(contentPath, containerPath, sep) && !synchronizer.checkIfChild(contentPath, containerPath, sep)) ? true : false);
  };

  myself.createTableEmptyRawData = function () {
    var emptyData = {
      metadata: [
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
      queryInfo: {
        totalRows: 0
      },
      resultset: []
    };
    return emptyData;
  };

  myself.runEndpoint = function (pluginId, endpoint, options) {

    if (!pluginId && !endpoint) {
      Dashboards.log('PluginId or endpointName not defined.');
      return false;
    }

    var _opts = {
      success: function () {
        Dashboards.log(pluginId + ': ' + endpoint + ' ran successfully.');
      },
      error: function () {
        Dashboards.log(pluginId + ': error running ' + endpoint + '.');
      },
      params: {},
      systemParams: {},
      type: 'POST',
      dataType: 'json'
    };
    var opts = $.extend({}, _opts, options);
    var url = Dashboards.getWebAppPath() + '/plugin/' + pluginId + '/api/' + endpoint;

    function successHandler(json) {
      if (json && json.result == false) {
        opts.error.apply(this, arguments);
      } else {
        opts.success.apply(this, arguments);
      }
    }

    function errorHandler() {
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
    };

    _.each(opts.params, function (value, key) {
      ajaxOpts.data['param' + key] = value;
    });
    _.each(opts.systemParams, function (value, key) {
      ajaxOpts.data[key] = value;
    });

    $.ajax(ajaxOpts);
  };

  myself.incUpdateEvent = function (eventName) {
    var updateCnt = parseInt(Dashboards.getParameterValue(eventName));
    Dashboards.fireChange(eventName, (updateCnt += 1).toString());
  };

  myself.toggleStringifiedBoolean = function (status) {
    return (status == "N" ? "Y" : "N");
  };

  myself.getColIndexFromColName = function (metadata, name) {
    var colIndex;
    $.each(metadata, function (idx, ele) {
      if (ele.colName === name) {
        colIndex = ele.colIndex;
      }
    });
    return colIndex;
  };

  myself.getCamelCase = function (string, sep) {
    var capitalizeString = function (string) {
        return (string.substring(0, 1).toUpperCase()).concat(string.substring(1));
      },
      workedPartsArr = $.map(string.split(sep), function (ele, idx) {
        return (idx === 0 ? ele : capitalizeString(ele));
      });
    var result = workedPartsArr.join("");

    /* get rid of ' , just in case */
    return result.replace("'", "");

  };

  myself.addAuxIsOpenColumn = function (data) {
    var newColIndex = data.metadata.length;
    /* metadata update */
    data.metadata.push({
      colIndex: newColIndex,
      colName: "isOpen",
      colType: "String"
    });

    /* resultset update */
    var typeColIdx = synchronizer.getColIndexFromColName(data.metadata, "type");
    $.each(data.resultset, function (idx, ele) {
      var val = (ele[typeColIdx] === "folder" ? "Y" : "");
      data.resultset[idx].push(val);
    });

    return data;
  };

  myself.isActionEnabled = function (listParamObj) {
    var deleteQty = Dashboards.getParameterValue(listParamObj.files2deleteParam).length,
      updateQty = Dashboards.getParameterValue(listParamObj.files2updateParam).length,
      createQty = Dashboards.getParameterValue(listParamObj.files2createParam).length;
    if (deleteQty == 0 && createQty == 0 && updateQty == 0) {
      return false;
    } else {
      return true;
    }
  };

  myself.tablePostChangeProcedure = function (data, listParamObj) {
    var files2deleteList = [],
      files2updateList = [],
      files2createList = [],
      filesWillNotBeUpdatedList = [],
      fileCounter = 0;

    if (_.isEmpty(data) || data.resultset.length === 0) {
      data = synchronizer.createTableEmptyRawData();
    } else {
      var statusIdx = synchronizer.getColIndexFromColName(data.metadata, "modification_status"),
        fileIdx = synchronizer.getColIndexFromColName(data.metadata, "file"),
        typeIdx = synchronizer.getColIndexFromColName(data.metadata, "type");
      /* Add auxiliar column to test if folder is open */
      data = synchronizer.addAuxIsOpenColumn(data);

      /* Update respective ToBe-<something>-List and FileCounterParam */
      $.each(data.resultset, function (idx, ele) {
        if (ele[typeIdx] === "file") {
          fileCounter += 1;
          if (ele[statusIdx] === "to_be_deleted") {
            files2deleteList.push(ele[fileIdx]);
          } else if (ele[statusIdx] === "to_be_modified") {
            files2updateList.push(ele[fileIdx]);

          } else if (ele[statusIdx] === "to_be_copied") {
            files2createList.push(ele[fileIdx]);

          } else if (ele[statusIdx] === "nothing_to_be_updated") {
            filesWillNotBeUpdatedList.push(ele[fileIdx]);
          }
        }
      });
    }

    Dashboards.setParameter(listParamObj.files2deleteParam, files2deleteList);
    Dashboards.setParameter(listParamObj.files2updateParam, files2updateList);
    Dashboards.setParameter(listParamObj.files2createParam, files2createList);
    Dashboards.setParameter(listParamObj.filesWillNotBeUpdatedParam, filesWillNotBeUpdatedList);
    Dashboards.fireChange(listParamObj.fileCounterParam, fileCounter);

    return data;
  };

})(synchronizer);


/************************************  AddIns ************************************/

;
(function () {

  var synchModification = {
    name: "synchModification",
    label: "Synchronizer Row Modification Status",
    defaults: {
      textFormat: function (v, st) {
        return st.colFormat ? sprintf(st.colFormat, v) : v;
      },
      dirColIdx: 0, // directions = destination
      operationType: "S",
      sep: " "
    },

    init: function () {
      $.fn.dataTableExt.oSort[this.name + '-asc'] = $.fn.dataTableExt.oSort['string-asc'];
      $.fn.dataTableExt.oSort[this.name + '-desc'] = $.fn.dataTableExt.oSort['string-desc'];
    },

    implementation: function (tgt, st, opt) {
      var options = $.extend(true, {}, this.defaults, opt);
      var text = synchronizer.settings.statusDictionary[st.value] || '',
          cssClass = synchronizer.getCamelCase(text, options.sep),
          dirValue = st.tableData[st.rowIdx][options.dirColIdx];

      var dirClass;
      if (_.contains(["S", "E"], options.operationType.toUpperCase())){
        dirClass = (dirValue === "File System" ? "jcr2fs" : "fs2jcr");
      } else {
        dirClass = (dirValue === "File System" ? "fs2jcr" : "jcr2fs");
      }


      $(tgt).parent().addClass(cssClass + " " + dirClass);
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

    init: function () {
      $.fn.dataTableExt.oSort[this.name + '-asc'] = $.fn.dataTableExt.oSort['string-asc'];
      $.fn.dataTableExt.oSort[this.name + '-desc'] = $.fn.dataTableExt.oSort['string-desc'];
    },

    implementation: function (tgt, st, options) {
      var opt = $.extend(true, {}, this.defaults, options);
      var type = st.tableData[st.rowIdx][opt.typeColIdx],
        mainFullPath = st.rawData.resultset[st.rowIdx][st.colIdx],
        $tgt = $(tgt);

      var elementsArr = synchronizer.getParentFolders(mainFullPath, opt.sep),
        label = elementsArr[(elementsArr.length - 1)],
        $cont = $("<div />").addClass('cellCont').text( /*opt.sep+*/ label);
      $tgt.empty().append($cont);
      var level = synchronizer.getParentFolderLevel(mainFullPath, opt.sep);
      $tgt.css("padding-left", level * 20);
      $tgt.parent().addClass(type);
      if (st.tableData[st.rowIdx][opt.typeColIdx] === "folder") {
        $tgt.addClass("semiBold");
        $tgt.click(function () {
          /* toggle row isOpen value */
          var isOpen = st.tableData[st.rowIdx][opt.isOpenColIdx];
          st.tableData[st.rowIdx][opt.isOpenColIdx] = synchronizer.toggleStringifiedBoolean(isOpen);
          /* toggle row close css-class*/
          $tgt.parent().toggleClass("closed");
          var thisRowIdx = st.rowIdx + 1,
            $thisTgtRow = $tgt.parent().next(),
            rowsQty = st.rawData.resultset.length,
            thisValue = (thisRowIdx < rowsQty ? st.rawData.resultset[thisRowIdx][st.colIdx] : "dummy");
          while (synchronizer.checkIfInside(thisValue, mainFullPath, opt.sep) && thisRowIdx < rowsQty) {
            /* toggle Next Row visibility */
            if (isOpen === "Y") {
              $thisTgtRow.addClass("WDhidden");
              if (st.tableData[thisRowIdx][opt.typeColIdx] === "folder") {
                $thisTgtRow.addClass("closed");
                st.tableData[thisRowIdx][opt.isOpenColIdx] = "N";
              }
            } else {
              $thisTgtRow.removeClass("WDhidden");
              /* if folder, update its open/close status */
              if (st.tableData[thisRowIdx][opt.typeColIdx] === "folder") {
                $thisTgtRow.removeClass("closed");
                st.tableData[thisRowIdx][opt.isOpenColIdx] = "Y";
              }
            }
            /* increment iterator variables */
            thisRowIdx += 1;
            if (thisRowIdx < rowsQty) {
              thisValue = st.rawData.resultset[thisRowIdx][st.colIdx];
            }
            $thisTgtRow = $thisTgtRow.next();
          }
          $thisCellBody = $tgt.parents(".WDdataCellBody").removeClass("delay");
          synchronizer.updateCellBodyHeight($thisCellBody);
        });
      }

    }
  };
  Dashboards.registerAddIn("Table", "colType", new AddIn(synchMainColumn));

})();
