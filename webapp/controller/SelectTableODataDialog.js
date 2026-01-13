sap.ui.define([
	"zwf1/prozal02/controller/SelectSimpleDialog",
    "sap/ui/model/json/JSONModel",
    'sap/ui/model/Filter',
    'sap/ui/model/FilterOperator',
    'sap/ui/model/Sorter',
    "sap/m/ColumnListItem"
], function (SelectSimpleDialog, JSONModel, Filter, FilterOperator, Sorter, ColumnListItem) {
	"use strict";

	return SelectSimpleDialog.extend("zwf1.prozal02.controller.SelectTableODataDialog", {

		constructor : function (oView, sTitle, sHelpId, aColumns) {
            SelectSimpleDialog.prototype.constructor.call(this, oView, sTitle);
            this._sFragment = "zwf1.prozal02.view.SelectTableODataDialog";
            this._sHelpId = sHelpId;
            this._aColumns = aColumns ? aColumns : [];
            this._aFilters = [];
            this._oItemTemplate = new ColumnListItem({
                selected: "{selected}",
                cells: [
                    new sap.m.ObjectIdentifier({
                        title: "{Title}"
                    }),
                    new sap.m.Text({
                        text: "{Description}"
                    }),
                    new sap.m.Text({
                        text: "{Param1}"
                    }),                    
                    new sap.m.Text({
                        text: "{Param2}"
                    })
                ],
                type: "Active"                 
            });
		},


        onSearch: function(oEvent) {
            //var oSource =  //oEvent.getSource();
            var oList = this.getView().byId('idSelectTableODataTable');
            oList.unbindAggregation("items");
            oList.bindAggregation("items", {
                    path: '/ValueHelpSet',
                    filters: [new Filter( 'HelpId', FilterOperator.EQ, this._sHelpId), ...this._aFilters],
                    parameters: {                
                        custom: {
                            //search: oEvent.getParameter("value")
                            search: oEvent.getParameter("query")
                        }
                    
                    },
                    template: this._oItemTemplate,
                    templateShareable: true                    
            });
        },

        /*
        _initModel: function(aData) {
            var oDialogModel = new JSONModel({
                title: this._sTitle,
                multiselect: this._bMultiSelect
            });              
            this._oDialog.setModel(oDialogModel);
            this._oDialog.setModel(this.getView().getModel(), "ODataModel");
        },
        */

        getDefaultResultSet: function(aFilters, aFilterFunctions) {
            var aFiltersOdata = Object.assign([], aFilters);
            return this.getView().getModel().read("/ValueHelpSet", {
                filters: aFilters
            });
        },

		select : function () {
			var oView = this._oView;
            var promise = new $.Deferred();

            this._oPromise = promise;

            if (!this._oDialog) {
                this._oDialog = sap.ui.xmlfragment(oView.getId(), this._sFragment, this);
                oView.addDependent(this._oDialog);
                if (this._fnOnInit) {
                    this._fnOnInit();
                }
            }
        
            var oDialogModel = new JSONModel({
                title: this._sTitle,
                multiselect: this._bMultiSelect,
                columns: this._aColumns
            });              
            this._oDialog.setModel(oDialogModel, "dialogModel");

            /*
            if (this._bMultiSelect) {
                this._oDialog.setMultiSelect(true);
            } else {
                this._oDialog.setMultiSelect(false);
            }
            */

            var oList = this.getView().byId('idSelectTableODataTable');
            oList.bindAggregation("items", {
                    path: '/ValueHelpSet',
                    filters: [new Filter( 'HelpId', FilterOperator.EQ, this._sHelpId), ...this._aFilters],
                    template: this._oItemTemplate,
                    templateShareable: true                    
            });

            
            for (var i = 0; i<this._aColumns.length; i++) {
                oList.addColumn(new sap.m.Column({
                    width: this._aColumns[i].width,
                    header: new sap.m.Text({
                        text: this._aColumns[i].header
                    }),
                    minScreenWidth: (i > 0) ? "Tablet" : null,
                    demandPopin: (i > 0)
                }));
            }
            
            /*
            this._oDialog.addEventDelegate({
                onAfterRendering: function(oEvent) {
                    var sel_h = this.getView().byId('idSelectTableODataSel').$().height();
                    var dlg_h = this._oDialog.$().height();
                    var h = ""+ (dlg_h - sel_h - 64) + "px";
                    this._oDialog.getModel("dialogModel").setProperty("/containerHeight", h);
                }.bind(this)
            }, this);
            */

            /*
            this._oDialog.addEventDelegate({
                "onAfterRendering": function () {
                     sap.ui.core.ResizeHandler.register(this._oDialog, function(oEvent){
                       console.log("ResizeEvent "+oEvent.size.height);
                     });
                }.bind(this)
           }, this);   
           */         

            this._oDialog.open();                        
                        
            return promise;
		},        

	});

});