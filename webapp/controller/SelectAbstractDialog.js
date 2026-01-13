sap.ui.define([
	"sap/ui/base/ManagedObject",
    "sap/ui/model/json/JSONModel",
    'sap/ui/model/Filter',
    'sap/ui/model/FilterOperator',
    'sap/ui/model/Sorter'
], function (ManagedObject, JSONModel, Filter, FilterOperator, Sorter) {
	"use strict";

	return ManagedObject.extend("zwf1.prozal02.controller.SelectAbstractDialog", {

		constructor : function (oView, sTitle) {
			this._oView = oView;
            this._sTitle = sTitle;
		},

		exit : function () {
            if (this._oDialog) {
                this._oView.removeDependent(this._oDialog);
                this._oDialog.setModel(null);
                this._oDialog.destroy(true);
            }
            delete this._oDialog;            
			delete this._oView;
		},

		select : function () {
			var oView = this._oView;
            var promise = new $.Deferred();

            this._oPromise = promise;

            var pData;

            if (this._listItems) {
                if (this._aFilterFunctions && this._aFilterFunctions.length > 0) {
                    pData = this.filterResultSet( this._listItems, this._aFilterFunctions);
                } else {
                    pData = this._listItems;
                }
            } else {
                pData = this.getDefaultResultSet( this._aFilters, this._aFilterFunctions );
            }

            $.when(pData)
                .done( function(oResult) {
                    var aData = [];
                    if (Array.isArray(oResult)) {
                        aData = oResult;
                    } else if (oResult.results) {
                        aData = oResult.results;
                    }

                    if (!this._oDialog) {
                        this._oDialog = sap.ui.xmlfragment(oView.getId(), this._sFragment, this);
                        oView.addDependent(this._oDialog);
                        if (this._fnOnInit) {
                            this._fnOnInit();
                        }
                    }
        
                    if (this._bMultiSelect) {
                        this._oDialog.setMultiSelect(true);
                    } else {
                        this._oDialog.setMultiSelect(false);
                    }

                    this._initModel(aData);
                    this._oDialog.open();                        
                        
                }.bind(this))
                .fail( promise.reject );
 
            return promise;
		},

        /**
         * Uzavretie dialogu
         */
        close: function() {
            if (this._oDialog) {
                this._oDialog.close();
            }
        },

        _initModel: function(aData) {
        },

        attachInit: function(fnOnInit) {
            this._fnOnInit = fnOnInit;
            return this;
        },           

        getDialog: function() {
            return this._oDialog;
        },

        getView: function() {
            return this._oView;
        },
        
        setTitle: function(sTitle) {
            this._sTitle = sTitle;
            return this;
        },

        setFilters: function(aFilters) {
            this._aFilters = aFilters;
            return this;
        },

        setFilterFunctions: function(aFilters) {
            this._aFilterFunctions = aFilters;
            return this;
        },        

        setListItems: function(pItemData) {
            this._listItems = pItemData;
            return this;
        },  
        
        setMultiSelect: function(bMultiSelect) {
            this._bMultiSelect = bMultiSelect;
            return this;
        },

        onClose: function(oEvent) {
            if (oEvent.getId() === "confirm") {
                if (this._bMultiSelect) {
                    var aSelItems = oEvent.getParameter("selectedItems");
                    if (!aSelItems) {
                        this._oPromise.reject(oEvent.getId());                    
                        return;
                    }
                    var aSelections = [];
                    for (var i = 0; i<aSelItems.length; i++) {
                        var oCtx = aSelItems[i].getBindingContext();
                        if (!oCtx) {
                            this._oPromise.reject(oEvent.getId());       
                            return;             
                        }                
                        aSelections.push(oCtx.getProperty());
                    }
                    this._oPromise.resolve(aSelections);
                } else {
                    var oSelItem = oEvent.getParameter("selectedItem");
                    if (!oSelItem) {
                        this._oPromise.reject(oEvent.getId());                    
                        return;
                    }
                    var oCtx = oSelItem.getBindingContext();
                    if (!oCtx) {
                        this._oPromise.reject(oEvent.getId());       
                        return;             
                    }                
                    this._oPromise.resolve(oCtx.getProperty());
                }
            } else if (oEvent.getId() === "itemPress") {
                var oSelItem = oEvent.getParameter("listItem");
                if (!oSelItem) {
                    this._oPromise.reject(oEvent.getId());                    
                    return;
                }
                var oCtx = oSelItem.getBindingContext();
                if (!oCtx) {
                    this._oPromise.reject(oEvent.getId());       
                    return;             
                }                
                this._oPromise.resolve(oCtx.getProperty());
            } else {
                this._oPromise.reject(oEvent.getId());
            }
        },  

        getDefaultResultSet: function(aFilters, aFilterFunctions) {
            return null;
        },

        filterResultSet: function( oResultSet, aResultFilters) {
            var rs2 = new $.Deferred();

            $.when(oResultSet).done( function(oResult) {
                var aData = [];
                if (Array.isArray(oResult)) {
                    aData = oResult;
                } else if (oResult.results) {
                    aData = oResult.results;
                }

                for (var i = 0; i < aResultFilters.length; i++) {
                    aData = aResultFilters[i].filterFunction(aData, aResultFilters[i].filterParameters);
                }
                rs2.resolve(aData);
            }).fail( rs2.reject );

            return rs2;
        }

	});

});