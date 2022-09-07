function onConnectionChange(connection) {
    $('#connection-name').text(connection || 'World');
}

function onPageLoad() {
    console.log(window.PowerTools.version);

    window.PowerTools.addConnectionChangeListener(onConnectionChange);
}

$(onPageLoad);
