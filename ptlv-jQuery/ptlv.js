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
    if (plugin != null) {
        filters.push('(typename eq \'' + plugin + '\')');
    }
    if (message != null) {
        filters.push('(messagename eq \'' + message + '\')');
    }
    if (entity != null) {
        filters.push('(primaryentity eq \'' + entity + '\')');
    }
    query.set('$filter', filters.join(' and '));

    const headers = {
        Prefer: 'odata.include-annotations=OData.Community.Display.V1.FormattedValue',
    };

    window.PowerTools.get('/api/data/v9.0/plugintracelogs', query, headers)
        .then((res) => jsData = res.asJson())
        .then((jsonData) => {
            console.log(jsonData);
            BuildTableFromJson(jsonData);
        })
}
function BuildTableFromJson(jsonData){
    var cols = Headers(jsonData, $("#resTable")); 

    for (var i = 0; i < jsonData.length; i++) {
        var row = $('<tr/>');  
        for (var colIndex = 0; colIndex < cols.length; colIndex++)
        {
            var val = jsonData[i][cols[colIndex]];
            if (val == null) val = ""; 
                row.append($('<td/>').html(val));
         }
         $("#resTable").append(row);
     }
}

function Headers(list, selector) {
    var columns = [];
    var header = $('<tr/>');
     
    for (var i = 0; i < list.length; i++) {
        var row = list[i];
         
        for (var c in row) {
            if ($.inArray(c, columns) == -1) {
                columns.push(c);
                 
                // Creating the header
                header.append($('<th/>').html(c));
            }
        }
    }
     
    // Appending the header to the table
    $(selector).append(header);
        return columns;
}      

function onPageLoad() {
    console.log(window.PowerTools.version);

    window.PowerTools.addConnectionChangeListener(onConnectionChange);
}

$(onPageLoad);