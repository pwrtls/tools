function onConnectionChange(connection) {
    let loaded = false;
    if (!connection) {
        loaded = false;
        return;
    }
    loaded = true;
    LoadData();
}

function LoadData(){
    const query = new URLSearchParams();
    query.set('$select', 'typename,messagename,primaryentity');

    window.PowerTools.get('/api/data/v9.0/plugintracelogs', query)
        .then((res) => jsData = res.asJson())
        .then((jsData) => {
            console.log(jsData);

            ParseJson(jsData.value);
            });
}

function ParseJson(items){
    var lookup = {
        message: [],
        plugin: [],
        entity: []
    };

    items.forEach((item) => {
        if (!lookup.message.includes(item.messagename)) {
            lookup.message.push(item.messagename);
        }
        if (!lookup.plugin.includes(item.typename)) {
            lookup.plugin.push(item.typename);
        }
        if (!lookup.entity.includes(item.primaryentity)) {
            lookup.entity.push(item.primaryentity);
        }
    });

    lookup.entity.forEach((v) => {
        $('#entity').append($('<option>', {
            value: v,
            text: v,
        }));
    })
    lookup.message.forEach((v) => {
        $('#message').append($('<option>', {
            value: v,
            text: v,
        }));
    })
    lookup.plugin.forEach((v) => {
        $('#plugin').append($('<option>', {
            value: v,
            text: v,
        }));
    })
    console.log(lookup);
}

function RetrieveLogs() {
    var plugin = $('#plugin').val();
    var message = $('#message').val();
    var entity = $('#entity').val();
    var numRows = $('#NumberOfRows').val();

    const query = new URLSearchParams();
    query.set('$orderby', 'createdon desc');
    query.set('$top', numRows);

    const filters = [];
    if (plugin != "") {
        filters.push('(typename eq \'' + plugin + '\')');
    }
    if (message != "") {
        filters.push('(messagename eq \'' + message + '\')');
    }
    if (entity != "") {
        filters.push('(primaryentity eq \'' + entity + '\')');
    }
    if (filters.length != 0){
        query.set('$filter', filters.join(' and '));
    }

    const headers = {
        Prefer: 'odata.include-annotations=OData.Community.Display.V1.FormattedValue',
    };

    window.PowerTools.get('/api/data/v9.0/plugintracelogs', query, headers)
        .then((res) => jsData = res.asJson())
        .then((jsonData) => {
            BuildTableFromJson(jsonData.value);
        });
}
function BuildTableFromJson(traceArray) {
    traceArray.forEach((trace) => {
        console.log('trace is:', trace);

        const pluginNameArray = trace.typename.split(',');
        let pluginName = pluginNameArray[0];
        
        var row = $('<tr>');
        row.append('<td>'+trace.correlationid+'</td>'+
        '<td>'+trace.performanceexecutionstarttime+'</td>'+
        '<td>'+trace.performanceexecutionduration+'</td>'+
        '<td>'+GetLabel(trace.operationtype, "operation")+'</td>'+
        '<td>'+pluginName+'</td>'+
        '<td>'+trace.depth+'</td>'+
        '<td>'+GetLabel(trace.mode, "mode")+'</td>'+
        '<td>'+trace.messageblock+'</td>'+
        '<td>'+''+'</td>'+
        '<td>'+trace.messagename+'</td>'+
        '<td>'+trace.primaryentity+'</td>');

        $("#resTable").append(row);
        
    });
}

function GetLabel(obj, prop){
    if(prop == "mode"){
        switch(obj){
            case 0: 
                return "Synchronous";
            case 1:
                return"Asynchronous";
        }
    }
    if(prop == "operation"){
        switch(obj){
            case 0:
                return "Unknown";
            case 1:
                return "Plug-In";
            case 2:
                return "Workflow Activity";
        }
    }
}

function onPageLoad() {
    console.log(window.PowerTools.version);

    window.PowerTools.addConnectionChangeListener(onConnectionChange);
}

$(onPageLoad);