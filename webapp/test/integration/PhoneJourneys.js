/*global QUnit*/

jQuery.sap.require("sap.ui.qunit.qunit-css");
jQuery.sap.require("sap.ui.thirdparty.qunit");
jQuery.sap.require("sap.ui.qunit.qunit-junit");
QUnit.config.autostart = false;

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
		"zwf1/prozal02/test/integration/NavigationJourneyPhone",
		"zwf1/prozal02/test/integration/NotFoundJourneyPhone",
		"zwf1/prozal02/test/integration/BusyJourneyPhone"
	], function () {
		QUnit.start();
	});
});