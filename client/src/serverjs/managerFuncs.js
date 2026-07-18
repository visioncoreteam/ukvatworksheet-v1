export async function postMessageWithResponse(message) {
    return new Promise((resolve) => {
        const requestId = crypto.randomUUID();

        function onMessage(event) {
            if (event.data?.type?.endsWith('-response') && event.data?.requestId === requestId) {
                window.removeEventListener('message', onMessage);
                resolve(event.data.body);
            }
        }

        window.addEventListener('message', onMessage);
        window.parent.postMessage({ ...message, requestId }, '*');
    });
}

export async function managerApi(method, path, body) {
    const requestId = crypto.randomUUID();

    const response = await new Promise((resolve) => {
        const handler = (event) => {
            if (event.source !== window.parent) return;
            if (event.data?.requestId !== requestId) return;

            window.removeEventListener("message", handler);
            resolve(event.data);
        };

        window.addEventListener("message", handler);
        window.parent.postMessage({ 
            type: "api-request", 
            requestId, 
            path, 
            method, 
            body 
        }, "*");
    });

    return response;
}

