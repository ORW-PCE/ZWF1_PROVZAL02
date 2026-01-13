/*global QUnit*/

jQuery.sap.require("sap.ui.qunit.qunit-css");
jQuery.sap.require("sap.ui.thirdparty.qunit");
jQuery.sap.require("sap.ui.qunit.qunit-junit");
QUnit.config.autostart = false;

// We cannot provide stable mock data out of the template.
// If you introduce mock data, by adding .json files in your webapp/localService/mockdata folder you have to provide the following minimum data:
// * At least 3 ZSCHVAL_S_F_LISTSet in the list

sap.ui.require([
	"sap/ui/test/Opa5",
	"zwf1/prozal02/test/integration/pages/Common",
	"sap/ui/test/opaQunit",
	"zwf1/prozal02/test/integration/pages/App",
	"zwf1/prozal02/test/integration/pages/Browser",
	"zwf1/prozal02/test/integration/pages/Master",
	"zwf1/prozal02/test/integration/pages/Detail",
	"zwf1/prozal02/test/integration/pages/NotFound"
], function (Opa5, Common) {
	"use strict";
	Opa5.extendConfig({
		arrangements: new Common(),
		viewNamespace: "zwf1.prozal02.view."
	});

	sap.ui.require([
		"zwf1/prozal02/test/integration/MasterJourney",
		"zwf1/prozal02/test/integration/NavigationJourney",
		"zwf1/prozal02/test/integration/NotFoundJourney",
		"zwf1/prozal02/test/integration/BusyJourney",
		"zwf1/prozal02/test/integration/FLPIntegrationJourney"
	], function () {
		QUnit.start();
	});
});