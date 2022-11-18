var selectedEntity,
    selectedAttributeEntities=[],
    selectedFilterAttributeEntities=[],
    fetchBuilder,
    filterBuilder;

addFilter = function(){
    console.log("Hi");
    var QuickActionCtrl = $(".QuickActionCtrl"),
    QuickFilterCtrl = $(".QuickFilter");

    console.log("Hi"+ QuickActionCtrl.is(":visible"));
    console.log("Hi"+ QuickFilterCtrl.is(":visible"));
    if(QuickActionCtrl && QuickFilterCtrl){
        if(QuickActionCtrl.is(":visible"))
        {
            QuickActionCtrl.hide();
        }
        else{
            QuickActionCtrl.show();
        }

        if(QuickFilterCtrl.is(":visible"))
        {
            QuickFilterCtrl.hide();
        }
        else{
            QuickFilterCtrl.show();
        }
        
    }

};

selectedFilterColumns = function(){
    debugger;

    var selAttributeCtrl = $('#selectAttributeEntityLstFilter option:selected'),
        selectOperatorCtrl = $("#selectOperator option:selected"),
        inputTextValueCtrl = $("#filterValue"),
        inputTextValueCtrlValue = inputTextValueCtrl ? inputTextValueCtrl.val() :"",
        selectOperatorValue = selectOperatorCtrl ? selectOperatorCtrl.val() : "",
        selectedValues = selAttributeCtrl ? selAttributeCtrl.val() : "*",
        columnfilterValue = selectOperatorCtrl ? selectOperatorCtrl.attr("columnFilter") == 'false' ? false : true : true,
        columntypeValue = selectOperatorCtrl ? selectOperatorCtrl.attr("type") : "string",
        attributeType = selAttributeCtrl && selAttributeCtrl.attr("attributeType") ? selAttributeCtrl.attr("attributeType") : "",
        properitesArray = new Object(),
        pckLstCtrl = $("#pckLst"),
        pckLstValue = pckLstCtrl ? pckLstCtrl.val() : "";

        properitesArray.value = selectedValues;
        properitesArray.operator = selectOperatorValue;
        properitesArray.columnfilter = columnfilterValue;
        properitesArray.columntype = columntypeValue;
        properitesArray.operatorValue = inputTextValueCtrlValue ? inputTextValueCtrlValue : pckLstValue;
        properitesArray.attributeType = attributeType;
        
        selectedFilterAttributeEntities.push(properitesArray);

        console.log("selectedFilterAttributeEntities - " + selectedFilterAttributeEntities);
        queryBuilderTree();
};

copyToClip = function () {
        debugger
        // Get the text field
        var text = document.getElementById('txtFetchXML');
        text.select();
        document.execCommand('copy');
};
      
clearFetch = function()
{
    var txtFetchXMLCtrl = $("#txtFetchXML");
    if(txtFetchXMLCtrl)
    {
        txtFetchXMLCtrl.html("");
    }
};

changeAttributeFilter = function()
{
    debugger;
    var selAttributeCtrl = $('#selectAttributeEntityLstFilter option:selected'),
    attributeType = selAttributeCtrl && selAttributeCtrl.attr("attributeType") ? selAttributeCtrl.attr("attributeType") : "",
    lkupGuidMsgCtrl = $("#lkupGuidMsg"),
    filterValueCtrl = $("#filterValue"),
    pckLstCtrl= $("#pckLst");

    if(!lkupGuidMsgCtrl)
    {
        return;
    }
    
    lkupGuidMsgCtrl.hide();
    filterValueCtrl.hide();
    pckLstCtrl.hide();

    if(attributeType == "Lookup")
    {
        //Remove options from operator dropdown
        lkupGuidMsgCtrl.show();
        filterValueCtrl.show();
    }
    else if(attributeType == "Picklist")
    {
        
        pckLstCtrl.show();
        //Remove options from operator dropdown
        window.PowerTools.get("/api/data/v9.0/EntityDefinitions(LogicalName='" + selectedEntity + "')/Attributes(LogicalName='" + selAttributeCtrl.val() +"')/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$select=LogicalName&$expand=OptionSet($select=Options),GlobalOptionSet($select=Options)")
        .then((res) => res.asJson())
        .then((result) => {
            debugger;
            
            pckLstCtrl.empty();

            result.GlobalOptionSet.Options.forEach((solution) => {
                pckLstCtrl.append('<option value='+ solution.Value +'>' + solution.Label.LocalizedLabels[0].Label + '</option>');
            });
        });
    }
    else{
        // Add options back to dropdown
        filterValueCtrl.show();
    }

};

hideShowfields = function(){
    debugger;
    var selectOperatorCtrl = $("#selectOperator option:selected"),
    selectOperatorValue = selectOperatorCtrl ? $("#selectOperator").val() : "",
    selectOperatorColumnfilter = selectOperatorCtrl ? $(selectOperatorCtrl).attr("columnfilter") : true,
    inputTextValueCtrl = $("#filterValue"),
    filterValueLabelCtrl =$("#filterValueLabel");

    if(!filterValueLabelCtrl || !filterValueLabelCtrl)
    {
        return;
    }

    if(selectOperatorColumnfilter == "false")
    {
        inputTextValueCtrl.val("");
        inputTextValueCtrl.hide();
        filterValueLabelCtrl.hide();
    }
    else{
        inputTextValueCtrl.show();
        filterValueLabelCtrl.show();
    }

};

executeFetchXMLConvertor = function(){

     fetchBuilder= "<fetch version=\"1.0\" output-format=\"xml-platform\" mapping=\"logical\" distinct=\"false\">";

    var entityFetchXML=""
    ,attributeFetchXML="",
    filterFetchXML="",
    txtFetchXMLCtrl = $("#txtFetchXML");
    
    if(selectedAttributeEntities && selectedAttributeEntities.length > 0){

        (selectedAttributeEntities || []).map(function(item){
            attributeFetchXML+="\n    <attribute name='"+ item +"' />";
        });
    }

    if(selectedFilterAttributeEntities && selectedFilterAttributeEntities.length >0)
    {
        filterFetchXML ="\n<filter>";
        (selectedFilterAttributeEntities || []).map(function(item){
            debugger;
            if(item.columnfilter == true)
            {
                filterFetchXML+="\n    <condition attribute='"+item.value+"' operator='"+item.operator+"'>\n     <value>"+item.operatorValue+"</value>\n    </condition>";
            }
            else{
                filterFetchXML+="\n    <condition attribute='"+item.value+"' operator='"+item.operator+"' />";
            }
        });
        filterFetchXML +="\n</filter>";
    }

    if(selectedEntity)
    {
        if(attributeFetchXML)
        {
             entityFetchXML= "\n  <entity name='"+selectedEntity+"'>"+attributeFetchXML+"\n  </entity>";
        }

        fetchBuilder+=entityFetchXML + filterFetchXML + "\n</fetch>";

        if(txtFetchXMLCtrl)
        {
            txtFetchXMLCtrl.html(fetchBuilder.replace(/'/g,'"'));
        }
    }

};

 onConnectionChange=function(connection) {
    
    $('#connection-name').text(connection || 'World');

    if (!connection) {
        return;
    }

    const query = new URLSearchParams();
    query.set(`$select`, `friendlyname`);
    query.set(`$filter`, `(isvisible eq true)`);
    query.set(`$orderby`, `friendlyname asc`);

    window.PowerTools.get('/api/data/v9.0/solutions', query)
        .then((res) => res.asJson())
        .then((result) => {
            
            $('#results').empty();

            if (!result || !Array.isArray(result.value)) {
                $('#results').append('<li>Failed to load the data!</li>');
                return;
            }

            if (result.value.length === 0) {
                $('#results').append('<li>No resolutions?!</li>');
                return;
            }

            result.value.forEach((solution) => {
                $('#results').append('<li>' + solution.friendlyname + '</li>');
            });
        });
};

getEntitiesList=function(connection){
    
    
    $('#connection-name').text(connection || 'World');

    if (!connection) {
        return;
    }
    const query = new URLSearchParams();
    query.set(`$select`, `entityid,logicalname,name`);
    query.set(`$orderby`, `logicalname asc`);

    window.PowerTools.get('/api/data/v9.0/entities', query)
        .then((res) => res.asJson())
        .then((result) => {
            
            $('#results').empty();

            if (!result || !Array.isArray(result.value)) {
                $('#results').append('<li>Failed to load the data!</li>');
                return;
            }

            if (result.value.length === 0) {
                $('#results').append('<li>No resolutions?!</li>');
                return;
            }

            result.value.forEach((solution) => {
                $('#selectEntityLst').append('<option value=' + solution.logicalname + '>' + solution.name + '</option>');
            });
        });
   
};

selectEntity =function(){
    
    var isError = false;
    if(selectedEntity)
    {
        $.confirm({
            title: 'Reset!',
            content: 'Are you sure, you want to refresh the query?',
            boxWidth: '300px',
            type: 'red',
            buttons: {
                confirm: function () {
                    isError = true;
                    selectedEntity = null;
                    selectedAttributeEntities=[];
                    selectedFilterAttributeEntities=[];
                    fetchBuilder = null;
                    filterBuilder = null;

                    createTreeOnEntitySelection();
                },
                cancel: function () {
                    isError = false;
                }
            }
        });
    }

    if(isError == false && !selectedEntity)
    {
        createTreeOnEntitySelection();
    }
};

createTreeOnEntitySelection =function(){
    var selEntityCtrl = $('#selectEntityLst option:selected'),
    selEntityValue= selEntityCtrl ? selEntityCtrl.val() : "",
    entitySchmaNameCtrl = $("#queryBuilderEntityName"),
    entityDisplayNameCtrl= $("#entityDiplayName");

    if(!selEntityCtrl
        || !entitySchmaNameCtrl || !entityDisplayNameCtrl)
    {
        return;
    }
    selectedEntity = selEntityValue;
    if(selEntityValue)
    {
        queryBuilderTree();
        selectAttributeEntity();
    }
};

queryBuilderTree = function(){

    debugger;
    
    if(!selectedEntity)
    {
        return;
    }

    var dataAttrbutes=[],
        datafilterAttrbutes=[];
    if(selectedAttributeEntities && selectedAttributeEntities.length>0)
    {
        
            (selectedAttributeEntities || []).map(function(element){
                dataAttrbutes.push({ 'text' : element ,'icon':'fa fa-columns'});
            });
            
            (selectedFilterAttributeEntities || []).map(function(element){
                datafilterAttrbutes.push({  'text' : element.value + ' '+ element.operator + ' '+ element.operatorValue , 'icon':'fa fa-columns'});
            });

            if(selectedFilterAttributeEntities && selectedFilterAttributeEntities.length>0)
            {
                dataAttrbutes.push({"children" :datafilterAttrbutes,'text':'filter','icon':'fa fa-filter' });
            }

            console.log(dataAttrbutes);

    }
    
    console.log("column :" + dataAttrbutes);
    console.log("column filter:" + datafilterAttrbutes);

    var dataTree= [
        {
          'text' : selectedEntity,
          'icon':'fa fa-table',
          'state' : {
            'opened' : true,
            'selected' : true
          },
          'children' : dataAttrbutes
          //'children' : datafilterAttrbutes
       }];
       $('#queryBuilderTree').jstree(true).settings.core.data = dataTree;
       $('#queryBuilderTree').jstree(true).refresh();
   
};

selectedColumns = function(){
    
    var selAttributeCtrl = $('#selectAttributeEntityLst'),
        selectedValues=selAttributeCtrl ? selAttributeCtrl.val() : "*";
        selectedAttributeEntities = selectedValues;

        queryBuilderTree();
};

selectAttributeEntity = function(){
    

    var selEntityCtrl = $('#selectEntityLst option:selected'),
        selEntityValue= selEntityCtrl ? selEntityCtrl.val() : "",
        selAttributeCtrl = $('#selectAttributeEntityLst'),
        selAttributeFilterCtrl = $('#selectAttributeEntityLstFilter');

        selAttributeCtrl.empty();
        selAttributeCtrl.append('<option value="*">Select All</option>');
    window.PowerTools.get("/api/data/v9.0/EntityDefinitions(LogicalName='" + selEntityValue + "')/Attributes")
        .then((res) => res.asJson())
        .then((result) => {
            debugger;
            $('#results').empty();

            if (!result || !Array.isArray(result.value)) {
                $('#results').append('<li>Failed to load the data!</li>');
                return;
            }

            if (result.value.length === 0) {
                $('#results').append('<li>No resolutions?!</li>');
                return;
            }

            result.value.forEach((solution) => {
                selAttributeCtrl.append('<option value=' + solution.LogicalName + ' attributeType=' + solution.AttributeType +' >' + solution.LogicalName + '</option>');
                selAttributeFilterCtrl.append('<option value=' + solution.LogicalName + ' attributeType=' + solution.AttributeType +'>' + solution.LogicalName + '</option>');
            });
        });
};

function onPageLoad() {
    
    console.log(window.PowerTools.version);
    
    $('#queryBuilderTree').jstree({ 'core' : {
        'data' : [
           {
             'text' : '(entity)',
             'icon':'fa fa-exclamation-triangle'
          }
        ]
    } });
    
    window.PowerTools.addConnectionChangeListener(getEntitiesList);
}

$(onPageLoad);
