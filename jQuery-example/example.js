function onConnectionChange(connection) {
    $('#connection-name').text(connection || 'World');

    if (!connection) {
        return;
    }

    const query = new URLSearchParams();
    query.set(`$select`, `friendlyname`);
    query.set(`$filter`, `(isvisible eq true)`);
    query.set(`$orderby`, `modifiedon desc`);

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
}

function onPageLoad() {
    console.log(window.PowerTools.version);

    window.PowerTools.addConnectionChangeListener(onConnectionChange);
}

$(onPageLoad);
