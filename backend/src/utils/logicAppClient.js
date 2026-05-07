/**
 * Utility to trigger Azure Logic App workflows via HTTP POST requests.
 */
async function triggerLogicApp(url, payload) {
    if (!url) {
        console.warn("[LogicAppClient] Skipping trigger: No URL provided.");
        return;
    }

    try {
        console.log(`[LogicAppClient] Triggering Logic App: ${url.substring(0, 50)}...`);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[LogicAppClient] Failed to trigger Logic App. Status: ${response.status}, Error: ${errorText}`);
        } else {
            console.log(`[LogicAppClient] Logic App triggered successfully.`);
        }
    } catch (error) {
        console.error(`[LogicAppClient] Error triggering Logic App: ${error.message}`);
    }
}

module.exports = { triggerLogicApp };
