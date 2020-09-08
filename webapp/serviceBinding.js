function initModel() {
	var sUrl = "/usermanager/user.xsodata/usermanager/user.xsodata/";
	var oModel = new sap.ui.model.odata.ODataModel(sUrl, true);
	sap.ui.getCore().setModel(oModel);
}