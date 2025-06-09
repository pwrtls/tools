export const isInIframe = () => window !== window.top;

export const getParentOrigin = () => {
    if (isInIframe()) {
        return window.parent.location.origin;
    }
    return window.location.origin;
};

export const safeHistoryReplace = (url: string) => {
    try {
        if (isInIframe()) {
            // If in iframe, use postMessage to communicate with parent
            window.parent.postMessage({ type: 'HISTORY_REPLACE', url }, getParentOrigin());
        } else {
            // If not in iframe, use history API directly
            window.history.replaceState(null, '', url);
        }
    } catch (error) {
        console.warn('Failed to update history:', error);
    }
};

export const setupIframeCommunication = () => {
    if (isInIframe()) {
        window.addEventListener('message', (event) => {
            // Verify origin
            if (event.origin !== getParentOrigin()) return;
            
            // Handle messages from parent
            if (event.data.type === 'INIT') {
                // Handle initialization
                console.log('Received initialization from parent');
            }
        });
    }
};

// Empty export to make this a module
export {}; 